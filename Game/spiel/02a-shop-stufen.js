// Teil 02a-shop-stufen.js: Shop: Kisten, Gegenstände (vereinen, zerlegen, verbessern), Erfahrung und Stufen-Belohnungen
// ===== Shop: gem-bought crates, rarity items, combine, salvage =====
// A second, separate equipment layer on top of the existing coin-
// upgraded weapon/armor/shield/boots levels above - gem crates drop
// a random item (one of the same 4 slots) at one of 6 rarities.
// 3 items of the same slot+rarity combine into 1 of the next
// rarity. Salvaging an unequipped item turns it into upgrade
// points, which level up an EQUIPPED item (max level 20 per item).
// "A level-20 grey item is about as strong as a level-1 green one"
// (the player's own framing) falls out naturally from scoring an
// item as rarityIndex * 20 + level: grey L20 scores 20, green L1
// scores 21 - just barely ahead, exactly that equivalence.
// RARITY_DEFS: add a display label. Keep key/name/color; nothing may read color for tile paint any more.
const RARITY_DEFS = [
  { key: 'grau',  name: 'Grau',  label: 'Gewöhnlich',   color: '#a2a6ad' },
  { key: 'gruen', name: 'Grün',  label: 'Ungewöhnlich', color: '#5cbf62' },
  { key: 'blau',  name: 'Blau',  label: 'Selten',       color: '#4f9ef2' },
  { key: 'lila',  name: 'Lila',  label: 'Episch',       color: '#a970f2' },
  { key: 'gold',  name: 'Gold',  label: 'Legendär',     color: '#eab24a' },
  { key: 'rot',   name: 'Rot',   label: 'Mythisch',     color: '#ee5046' }
];
const ITEM_MAX_LEVEL = 20;
const RARITY_DROP_WEIGHTS = [60, 25, 11, 4, 0, 0]; // grau..rot – Gold und Rot gibt es NICHT aus Kisten (2.10.), nur durch Zusammenlegen (seit 2.10. auch kein Preis mehr mit „mind. Legendär“)
const CRATE_GEM_COST = 30;   // (2.10.: vorher 5 – Gold-Ausrüstung kam zu schnell)
const COMBINE_COUNT = 3;
const RARITY_PCT_PER_SCORE = 0.15;
const RARITY_FLAT_PER_SCORE = 0.3;

function itemScore(item) {
    return item.rarity * ITEM_MAX_LEVEL + item.level;
}
function itemLevelUpCost(item) {
    return item.level * 5;
}

let inventory; // id -> { id, slot, rarity, level }
try {
    inventory = JSON.parse(store.get('openWaterInventory')) || {};
} catch (e) {
    inventory = {};
}
const STAR_MAX = 5, STAR_PCT = 20;               // forge stars: at most 5, each +20 % of the item's effect
let nextItemId = parseInt(store.get('openWaterNextItemId'), 10) || 1;
let equippedItems; // slot -> item id or null
try {
    equippedItems = JSON.parse(store.get('openWaterEquippedItems')) || {};
} catch (e) {
    equippedItems = {};
}
for (const key of Object.keys(EQUIPMENT_DEFS)) if (!(key in equippedItems)) equippedItems[key] = null;
let upgradePoints = parseInt(store.get('openWaterUpgradePoints'), 10) || 0;

function equippedItemBonusPct(slot) {
    const id = equippedItems[slot];
    const item = id ? inventory[id] : null;
    return item ? itemScore(item) * RARITY_PCT_PER_SCORE * (1 + (item.stars || 0) * STAR_PCT / 100) : 0;
}

function pickRandomSlot() {
    const keys = Object.keys(EQUIPMENT_DEFS);
    return keys[Math.floor(Math.random() * keys.length)];
}
function pickRandomRarity() {
    const total = RARITY_DROP_WEIGHTS.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < RARITY_DROP_WEIGHTS.length; i++) {
        if (roll < RARITY_DROP_WEIGHTS[i]) return i;
        roll -= RARITY_DROP_WEIGHTS[i];
    }
    return 0;
}
function addInventoryItem(slot, rarity, level) {
    const id = 'item' + (nextItemId++);
    const item = { id, slot, rarity, level: level || 1 };
    inventory[id] = item;
    return item;
}
// Buys and opens one crate for CRATE_GEM_COST gems - returns the new
// item, or null if the player can't afford it.
function openCrate() {
    if (gems < CRATE_GEM_COST) return null;
    gems -= CRATE_GEM_COST;
    const item = addInventoryItem(pickRandomSlot(), pickRandomRarity(), 1);
    sfx('crate');
    questProgress('crate', 1);
    saveGame();
    saveProgression();
    updateHud();
    return item;
}
// Combining doesn't need the player to pick anything - the button
// is just always active whenever 3+ unequipped items of the same
// slot+rarity exist anywhere in the inventory.
function findAnyCombinableGroup() {
    const counts = {};
    for (const item of Object.values(inventory)) {
        if (equippedItems[item.slot] === item.id) continue;
        if (item.rarity >= RARITY_DEFS.length - 1 || (item.stars || 0) > 0) continue;
        const key = item.slot + '|' + item.rarity;
        counts[key] = (counts[key] || 0) + 1;
    }
    return Object.values(counts).some(c => c >= COMBINE_COUNT);
}
// Merges every eligible group in the inventory, repeatedly - so 9
// matching grey items become 3 green become 1 blue in a single
// click, not just one merge at a time.
function autoCombineAll() {
    let totalCombines = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const groups = {};
        for (const item of Object.values(inventory)) {
            if (equippedItems[item.slot] === item.id) continue;
            if (item.rarity >= RARITY_DEFS.length - 1 || (item.stars || 0) > 0) continue;   // starred items are never melted down
            const key = item.slot + '|' + item.rarity;
            (groups[key] = groups[key] || []).push(item);
        }
        for (const key of Object.keys(groups)) {
            const list = groups[key].sort((a, b) => (a.level || 1) - (b.level || 1));   // the weakest go first
            if (list.length < COMBINE_COUNT) continue;
            const sepIdx = key.indexOf('|');
            const slot = key.slice(0, sepIdx);
            const rarity = parseInt(key.slice(sepIdx + 1), 10);
            const keep = Math.max(1, Math.round(list.slice(0, COMBINE_COUNT).reduce((s, it) => s + (it.level || 1), 0) / COMBINE_COUNT / 2));   // half the average level carries over
            for (let i = 0; i < COMBINE_COUNT; i++) { delete inventory[list[i].id]; if (typeof chestSelectedIds !== 'undefined') chestSelectedIds.delete(list[i].id); }
            addInventoryItem(slot, rarity + 1, keep);
            totalCombines++;
            changed = true;
        }
    }
    if (totalCombines > 0) {
        saveGame();
        saveProgression();
        updateHud();
    }
    return totalCombines;
}
// Melts an unequipped item into upgrade points (can't salvage
// whatever's currently equipped - unequip/replace it first).
function starRefund(item) { let g = 0; for (let s = 0; s < (item.stars || 0); s++) g += starGemCost(s); return g; }
function salvageItem(itemId) {
    const item = inventory[itemId];
    if (!item || equippedItems[item.slot] === itemId) return 0;
    const points = itemScore(item);
    upgradePoints += points; gems += starRefund(item);   // the gems paid for its stars come back
    delete inventory[itemId];
    saveGame();
    saveProgression();
    updateHud();
    return points;
}
// Bulk version for the multi-select "Verkaufen" action - one
// save/update pass for the whole batch instead of one per item.
function salvageItems(itemIds) {
    let total = 0;
    for (const id of itemIds) {
        const item = inventory[id];
        if (!item || equippedItems[item.slot] === id) continue;
        total += itemScore(item); gems += starRefund(item);
        delete inventory[id];
    }
    if (total > 0) {
        upgradePoints += total;
        saveGame();
        saveProgression();
        updateHud();
    }
    return total;
}
function levelUpItem(itemId) {
    const item = inventory[itemId];
    if (!item || item.level >= ITEM_MAX_LEVEL) return false;
    const cost = itemLevelUpCost(item);
    if (upgradePoints < cost) return false;
    upgradePoints -= cost;
    item.level += 1;
    saveProgression();
    return true;
}
function equipInventoryItem(itemId) {
    const item = inventory[itemId];
    if (!item) return;
    equippedItems[item.slot] = itemId;
    if (typeof chestSelectedIds !== 'undefined') chestSelectedIds.delete(itemId);
    saveGame();
    saveProgression();
    updateHud();
}

let skills;
try {
    skills = JSON.parse(store.get('openWaterSkills')) || {};
} catch (e) {
    skills = {};
}
for (const key of Object.keys(SKILL_DEFS)) if (!(skills[key] > 0)) skills[key] = 0;   // also repairs negative/broken values

let skillPoints = parseInt(store.get('openWaterSkillPoints'), 10) || 0;
for (const key of Object.keys(SKILL_DEFS)) {                  // points spent above a skill's cap come back
    const mx = SKILL_DEFS[key].max; if (mx && skills[key] > mx) { skillPoints += skills[key] - mx; skills[key] = mx; }
}

// XP/level: killing enemy troops in a won attack grants XP; filling
// the XP bar levels the player up and grants a skill point.
let playerXp = parseFloat(store.get('openWaterXp')) || 0;
let playerLvl = parseInt(store.get('openWaterLevel'), 10) || 1;

// Each player level needs 30 % more XP than the one before (XP = enemy troops killed),
// so huge battles still give a handful of levels instead of hundreds.
function xpNeededForLevel(level) {
    return Math.round(50 * Math.pow(1.3, Math.min(level, 400) - 1));
}
// Level rewards: small at the start, 2 Mio. troops at level 30, then linear growth.
function niceRound(n) {
    if (n < 100) return Math.round(n);
    const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / p) * p;
}
function levelRewardTroops(level) {
    return niceRound(level <= 30 ? 2000000 * Math.pow(level / 30, 3) : 2000000 + (level - 30) * 100000);
}
function levelRewardCoins(level) {
    return niceRound(level <= 30 ? 500 * level * level : 450000 + (level - 30) * 20000);
}
function levelRewardGems(level) {
    return level % 10 === 0 ? 10 : level % 5 === 0 ? 5 : 0;
}
function rewardBaseId() {
    if (ownedIslands.has(playerIslandId)) return playerIslandId;
    for (const id of ownedIslands) return id;
    return null;
}
// Rewards are granted the moment the level is reached (so a reload can't lose them);
// the modal only shows what was added.
function grantLevelRewards(from, to) {
    let c = 0, t = 0, g = 0;
    for (let l = from + 1; l <= to; l++) { c += levelRewardCoins(l); t += levelRewardTroops(l); g += levelRewardGems(l); }
    const baseId = rewardBaseId();
    coins += c;
    gems += g;
    if (baseId !== null) eigeneTruppenDazu(baseId, t, 'stufe', { von: from, bis: to });
    else t = 0;
    queueLevelUpModal(from, to, { coins: c, troops: t, gems: g, points: to - from });
}
// EP aus einem Kampf: höchstens ein Viertel der Stufe, auf der man gerade ist (Wirtschaft 2.10.). Vorher gab es so viele EP,
// wie der Gegner Truppen hatte – ein Sieg über eine große Basis brachte Stufe 1 → 65 auf einmal.
const KAMPF_EP_ANTEIL = 0.25;
// … und nur, wenn der Gegner ebenbürtig war: wer mit der zehnfachen Übermacht eine schwache Basis überrennt, bekommt nur ein
// Zehntel davon (vorher holten sich die Mitspieler so in 4 Std. Stufe 60 – mit hunderten leichten Siegen)
function kampfEp(roh, lvl, gegner, eigene) {
    const anteil = eigene > 0 && gegner >= 0 ? Math.min(1, gegner / eigene) : 1;
    return Math.max(0, Math.min(roh || 0, Math.ceil(xpNeededForLevel(Math.max(1, lvl || 1)) * KAMPF_EP_ANTEIL * anteil)));
}
function addXp(amount) {
    const before = playerLvl;
    playerXp += amount;
    while (playerXp >= xpNeededForLevel(playerLvl)) {
        playerXp -= xpNeededForLevel(playerLvl);
        playerLvl += 1;
        skillPoints += 1;
    }
    if (playerLvl > before) grantLevelRewards(before, playerLvl);
}

var saveProgressionTimer = null;
function saveProgression() { if (!saveProgressionTimer) saveProgressionTimer = setTimeout(saveProgressionNow, 1000); }
window.addEventListener('pagehide', () => { if (saveProgressionTimer) saveProgressionNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveProgressionTimer) saveProgressionNow(); });
// Alles, was mit 1 s Verzögerung gespeichert würde, jetzt gleich in den Spielstand (vor dem Abschied beim Neuladen und
// wenn Nachrichten verbucht werden – Münzen/Gems und „verbucht“ müssen zusammen beim Server ankommen)
window.__weltSpeicherJetzt = function () { try { if (saveGameTimer) saveGameNow(); } catch (e) {} try { if (saveProgressionTimer) saveProgressionNow(); } catch (e) {} };
function saveProgressionNow() {
    clearTimeout(saveProgressionTimer); saveProgressionTimer = null;
    store.set('openWaterInventory', JSON.stringify(inventory));
    store.set('openWaterNextItemId', String(nextItemId));
    store.set('openWaterEquippedItems', JSON.stringify(equippedItems));
    store.set('openWaterUpgradePoints', String(upgradePoints));
    store.set('openWaterSkills', JSON.stringify(skills));
    store.set('openWaterSkillPoints', String(skillPoints));
    store.set('openWaterXp', String(playerXp));
    store.set('openWaterLevel', String(playerLvl));
    store.set('openWaterPendingAttacks', JSON.stringify(pendingAttacks));
    store.set('openWaterPendingSends', JSON.stringify(pendingSends));
    store.set('openWaterPendingScouts', JSON.stringify(pendingScouts));
    store.set('openWaterPendingRetreats', JSON.stringify(pendingRetreats));
}

function equipmentUpgradeCost(level) {
    return (level + 1) * EQUIPMENT_BASE_COST;
}

