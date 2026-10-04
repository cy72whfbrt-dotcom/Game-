// ===== Teil 02-maersche.js: Shop, Ausrüstung, Angriffe losschicken, Märsche (Zurückrufen, Beschleunigen), Ankunft beim Senden =====
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

// Attacks and troop transfers now take real time to arrive, scaled
// by the distance between the two towers - the "Geschwindigkeit"
// skill (which also speeds up production) shortens the march.
const BASE_ATTACK_SPEED = 300; // world units per second - slow enough that speed upgrades are felt
const MIN_ATTACK_SECONDS = 6;
const MAX_ATTACK_SECONDS = 60;
// A lost attack isn't one-sided: the defender takes real casualties
// too (capped at the attacker's strength, so it can never go
// negative), and a small slice of the attacker's "dead" troops
// actually survives and marches back to the base it attacked from.
const RETREAT_RECOVERY_PCT = 20;

function attackSpeedMultiplier() {
    return 1 + Math.min(skills.speed || 0, SKILL_DEFS.speed.max) * 0.05;
}
function scoutSecs(from, to, botId) { return travelDurationSeconds(from, to, botId) / (AUF ? AUF.spaeherTempo(botId || 'player') : 1); }   // (+ Forschung Späher)   // a scout's walk, Späherturm included - the same for everyone
function travelDurationSeconds(source, target, botId) {   // everyone gets their own speed skill + Akademie, never under 3 s
    const pts = source.landmassId === target.landmassId ? [source, target] : marchPath(source, target);
    let distance = 0; for (let i = 1; i < pts.length; i++) distance += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const bt = typeof bundTempo === 'function' ? bundTempo(botId || 'player', target) : 1;      // Bündnis-Gebiet: 10 % schneller
    if (botId) return Math.max(3, Math.min(MAX_ATTACK_SECONDS, Math.max(MIN_ATTACK_SECONDS, distance / BASE_ATTACK_SPEED)) / botMarchMult(botId) / bt);   // their speed skill + Akademie, like yours
    const base = Math.min(MAX_ATTACK_SECONDS, Math.max(MIN_ATTACK_SECONDS, distance / BASE_ATTACK_SPEED));   // clamp first, so the speed skill and the Akademie also shorten long marches
    return Math.max(3, base / (attackSpeedMultiplier() * (1 + academyLevel() * 0.02) * (AUF ? AUF.marschTempo('player') : 1)) / bt);   // (+ Forschung Marschtempo)
}

let pendingAttacks;
try {
    pendingAttacks = JSON.parse(store.get('openWaterPendingAttacks')) || [];
} catch (e) {
    pendingAttacks = [];
}
let pendingSends;
try {
    pendingSends = JSON.parse(store.get('openWaterPendingSends')) || [];
} catch (e) {
    pendingSends = [];
}
let pendingScouts;
try {
    pendingScouts = JSON.parse(store.get('openWaterPendingScouts')) || [];
} catch (e) {
    pendingScouts = [];
}
let pendingRetreats;
try {
    pendingRetreats = JSON.parse(store.get('openWaterPendingRetreats')) || [];
} catch (e) {
    pendingRetreats = [];
}

// History of resolved attacks/transfers, newest first, capped
const COMBAT_LOG_LIMIT = 50;
let combatLog;
try {
    combatLog = JSON.parse(store.get('openWaterCombatLog')) || [];
} catch (e) {
    combatLog = [];
}
function addCombatLogEntry(entry) {
    // Zeit des Kampfes: ein Bericht vom Weltrechner bringt sie mit (kam er erst später an, z. B. nach der Nacht) – sonst jetzt
    const jetzt = Date.now();
    entry.at = Number.isFinite(entry.at) && entry.at > jetzt - 30 * 86400000 ? Math.min(entry.at, jetzt) : jetzt;
    entry.names = {};                                // names as they were then (a boss may camp there later)
    for (const k of ['targetId', 'sourceId', 'toId', 'fromId']) if (entry[k] !== undefined && islandById[entry[k]]) entry.names[entry[k]] = islandTitle(islandById[entry[k]]);
    let pos = 0; while (pos < combatLog.length && (combatLog[pos].at || 0) > entry.at) pos++;   // neueste zuerst, auch wenn Berichte spät ankommen
    combatLog.splice(pos, 0, entry);
    if (combatLog.length > COMBAT_LOG_LIMIT) combatLog.length = COMBAT_LOG_LIMIT;
    store.set('openWaterCombatLog', JSON.stringify(combatLog));
    // an open battle log shows the new entry right away
    const logPanel = document.getElementById('battleLogPopup');
    if (logPanel && logPanel.classList.contains('is-open')) refreshOpenCombatLog();
}

// troopsOverride lets the player send only part of a base's garrison
// (chosen via the attack preview's slider) instead of always
// marching out with everything - bots never pass this, so their
// attacks are unaffected and still commit their full garrison.
// Marsch-Plätze der Burg (Paket D): ist noch ein Platz frei? (für dich mit Hinweis) – grp: gehört zu einem Mehrfachangriff
function marschPlatz(who, grp, src) { if (!AUF || AUF.marschOk(who, grp, src)) return true; if (who === 'player' && !SYSTEM) flashHint(AUF.marschVoll('player'), 4000); return false; }
var naechsteGruppe = null;                                           // (Mehrfachangriff, „Truppen sammeln“: alle zusammen = EINE Aktion)
function launchAttack(sourceId, targetId, attackerBotId, troopsOverride, heldWunsch, held2Wunsch) {
    const source = islandById[sourceId];
    const target = islandById[targetId];
    const available = islandTroops[sourceId] || 0;
    const rawTroops = (troopsOverride !== undefined && troopsOverride !== null)
        ? Math.max(0, Math.min(troopsOverride, available))
        : available;
    if (!source || !target || rawTroops <= 0) return false;
    if (!attackerBotId && target.id === playerIslandId) return false;
    { const ow = islandOwnerOf(target.id); if (bundFreund(attackerBotId || 'player', ow)) { if (!attackerBotId) flashHint((botById[ow] || {}).name + ' ist in deinem Bündnis – Mitglieder greifen sich nicht an.', 3500); return false; } }   // Bündnis: gesperrt
    if (!attackerBotId && !islandSeen(target)) { flashHint('Dieses Ziel liegt im Nebel – schick zuerst einen Späher.', 3000); return false; }   // nichts im Nebel angreifen
    if (!attackerBotId) { const tw = islandOwnerOf(target.id); if (tw && botById[tw] && botById[tw].mensch) neulingEnde('Dein Anfängerschutz ist vorbei – du hast einen echten Spieler angegriffen.'); }
    const tOwner = islandOwnerOf(target.id);
    if (tOwner && tOwner !== (attackerBotId || 'player') && target.type === 'tower' && ownerShielded(tOwner)) { if (!attackerBotId) flashHint(shieldBlockText(tOwner), 4000); return false; }   // the Friedensschild
    // (Hauptstädte kann man angreifen – Alexander 4.10. –, aber nie erobern: siehe resolveAttack / capitalHolds)
    const grp = naechsteGruppe;
    if (!attackerBotId && !canReach(source.landmassId, target.landmassId, 'player')) {   // (wie beim Weltrechner)
        flashHint('Kein Weg nach ' + islandTitle(target) + ' – ein fremdes Tor liegt dazwischen. Erobere zuerst das Tor.', 5000); return false; }
    if (!marschPlatz(attackerBotId || 'player', grp, sourceId)) return false;   // alle Marsch-Plätze belegt (Burg-Stufe)
    if (!attackerBotId && !rechnet()) {                           // Zuschauer: der Weltrechner schickt die Truppen los
        const vh = lastHop(source.landmassId, target.landmassId, 'player'); if (!mautVorab(vh[0], vh[1], rawTroops, target.id)) return false;
        const vHeld = nextAttackHero && heroOwned('player', nextAttackHero) && !heroBusy('player', nextAttackHero) ? nextAttackHero : null, vHeld2 = heroZweitOk('player', vHeld, nextAttackHero2);
        WELT.befehl('angriff', { src: sourceId, ziel: targetId, n: rawTroops, held: vHeld, held2: vHeld2, grp: grp || undefined });
        islandTroops[sourceId] = available - rawTroops;
        { const t0 = Date.now(); vorlaeufigDazu('a', { sourceId, targetId, rawTroops, startedAt: t0, resolveAt: t0 + Math.max(3, travelDurationSeconds(source, target)) * 1000, attackerBotId: null, hero: vHeld, hero2: vHeld2, grp: grp || undefined }); }
        updateHud(); flashHint('Angriff unterwegs zu ' + islandTitle(target) + '.');
        dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); questProgress('attack', 1); sfx('attack');
        return true;
    }
    const mensch = attackerBotId && botById[attackerBotId] && botById[attackerBotId].mensch;   // ein echter Spieler (Befehl): sein gewählter Held, sonst keiner
    if (attackerBotId && window.WELT) { const tw = islandOwnerOf(target.id); if (tw === 'player' || (botById[tw] && botById[tw].mensch)) { const ab = loadBotState()[attackerBotId]; if (ab && ab.neuBis) { ab.neuBis = 0; saveBotState(); } } }   // greift einen echten Spieler an: Anfängerschutz weg
    if (attackerBotId && window.WELT && botById[attackerBotId] && botById[attackerBotId].mensch) { const ab = loadBotState()[attackerBotId]; if (ab && ab.shieldUntil > Date.now()) { ab.schildAlt = ab.shieldUntil; ab.shieldUntil = 0; if (ab.hb) ab.hb.schild = Math.min(+ab.hb.schild || 0, Date.now()); saveBotState(); } }   // ein echter Spieler greift an: sein Schild fällt (auch wenn sein Handy es nicht meldet) – auch im Hauptbuch, sonst käme er mit dem nächsten Profil gratis zurück
    const who = attackerBotId || 'player', botPair = attackerBotId && !mensch ? botPickHero(attackerBotId, source, target, rawTroops, true) : null;   // ein Mitspieler wählt Haupt- und Zweitheld
    const hero = mensch ? (heldWunsch && heroOwned(attackerBotId, heldWunsch) && !heroBusy(attackerBotId, heldWunsch) ? heldWunsch : null)
        : attackerBotId ? botPair[0] : nextAttackHero && heroOwned('player', nextAttackHero) && !heroBusy('player', nextAttackHero) ? nextAttackHero : null;
    const hero2 = heroZweitOk(who, hero, mensch ? held2Wunsch : attackerBotId ? botPair[1] : nextAttackHero2);   // Besitz und belegt geprüft (auch beim Weltrechner)
    const hop = lastHop(source.landmassId, target.landmassId, who), hp = hero && heroPeek(who, hero, source, target, rawTroops, hero2);
    if (!payToll(hop[0], hop[1], rawTroops, who, target.id, hp ? hp.toll : 0)) return false;

    islandTroops[sourceId] = available - rawTroops; // only the sent troops march out, the rest stay to defend
    const hx = hero ? heroLaunch(who, hero, source, target, rawTroops, hero2) : null;   // a full rage fires the hero's active skill in this fight
    const durationSec = Math.max(3, travelDurationSeconds(source, target, attackerBotId) / (1 + (hx ? hx.spd : 0) / 100));
    const startedAt = Date.now();
    // Snapshot every skill/equipment-derived combat bonus NOW, at
    // launch, not when the attack resolves on arrival (which can be
    // many seconds later) - otherwise leveling a skill while troops
    // are already marching would silently change the outcome of an
    // attack whose preview the player already confirmed. Bots get
    // exactly the same snapshot from their own skills, gear and hero.
    pendingAttacks.push({
        sourceId,
        targetId,
        rawTroops,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        attackerBotId: attackerBotId || null,
        ...attackFields(who, source, target, rawTroops, hx),
        ...(grp ? { grp } : {})
    });
    updateHud();
    saveGame();
    saveProgression();
    if (!attackerBotId) flashHint('Angriff unterwegs zu ' + islandTitle(target) + ' · ca. ' + fmtClock(durationSec));
    if (!attackerBotId) dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else botDropShield(attackerBotId);
    if (!attackerBotId) { questProgress('attack', 1); sfx('attack'); }
    else if (islandOwnerOf(target.id) === 'player') sfx('warn');      // someone marches on one of your bases
    renderActiveMarches();
    return true;
}

// "Truppen verschicken": same travel time as an attack, but a blue
// march to one of the player's OWN towers that just merges in.
function launchSend(fromId, toId, senderBotId, amount) {       // amount: how many go (default: all of them)
    const source = islandById[fromId];
    const target = islandById[toId];
    const available = islandTroops[fromId] || 0;
    const rawTroops = amount > 0 ? Math.min(Math.round(amount), available) : available;
    if (!source || !target || rawTroops <= 0) return;
    const grp = naechsteGruppe;
    if (!senderBotId && !canReach(source.landmassId, target.landmassId, 'player')) {   // (wie beim Weltrechner: ein fremdes Tor dazwischen – vorher schickte das Handy los, der Weltrechner lehnte still ab)
        flashHint('Kein Weg nach ' + islandTitle(target) + ' – ein fremdes Tor liegt dazwischen. Erobere das Tor (oder eins deines Bündnisses), dann geht es.', 5000); return; }
    if (!marschPlatz(senderBotId || 'player', grp)) return;          // Marsch-Plätze (Paket D)
    if (!senderBotId && !rechnet()) {                             // Zuschauer: der Weltrechner schickt sie los
        const vh = lastHop(source.landmassId, target.landmassId, 'player'); if (!mautVorab(vh[0], vh[1], rawTroops)) return;
        WELT.befehl('senden', { von: fromId, nach: toId, n: rawTroops, grp: grp || undefined });
        islandTroops[fromId] = available - rawTroops;
        { const t0 = Date.now(); vorlaeufigDazu('s', { fromId, toId, troops: rawTroops, startedAt: t0, resolveAt: t0 + travelDurationSeconds(source, target) * 1000, senderBotId: null, grp: grp || undefined }); } questProgress('send', 1); sfx('send'); updateHud();
        flashHint('Truppen unterwegs zu ' + islandTitle(target) + '.'); return;
    }
    const hop = lastHop(source.landmassId, target.landmassId, senderBotId || 'player');
    if (!payToll(hop[0], hop[1], rawTroops, senderBotId || 'player')) return;

    islandTroops[fromId] = available - rawTroops; // troops march out, the rest stays
    const durationSec = travelDurationSeconds(source, target, senderBotId);
    const startedAt = Date.now();
    pendingSends.push({
        fromId,
        toId,
        troops: rawTroops,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        senderBotId: senderBotId || null,
        ...(grp ? { grp } : {})
    });
    if (!senderBotId) { questProgress('send', 1); sfx('send'); }
    updateHud();
    saveGame();
    saveProgression();
    if (!senderBotId) {
        flashHint('Truppen unterwegs zu ' + islandTitle(target) + ' · ca. ' + fmtClock(durationSec));
        renderActiveMarches();
    }
}

// ===== MARCH ORDERS: recall a column on the way, or speed it up with gems =====
const marchKeyOf = m => m.mid || (m.mid = (m.startedAt || 0) + '-' + (m.sourceId ?? m.fromId ?? m.homeId) + '-' + (m.targetId ?? m.toId ?? m.fieldId ?? m.tid ?? m.k));   // (auch Lager/Boss/Drache und Sammler)   // fixed once, so speeding up keeps it
function pathSoFar(src, tgt, frac) {                // the stretch of the route already walked, from the start to where the column is now
    const pts = marchPath(src, tgt); let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    let left = total * frac; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (left >= d) { out.push(pts[i]); left -= d; continue; }
        const q = d ? left / d : 0; out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * q, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * q }); break; }
    return out;
}
function recallMarch(key) {                          // an attack or a send turns round where it is and walks home
    const now = Date.now();
    const sc = pendingScouts.find(x => marchKeyOf(x) === key);                // ein Späher kehrt um (ohne Bericht)
    if (sc) { if (sc.back) return; pendingScouts = pendingScouts.filter(x => x !== sc); spaeherHeim(sc, now - sc.startedAt);   // kehrt um: zurück so lange, wie er schon unterwegs war
        saveProgression(); renderActiveMarches(); requestRender(); flashHint('Dein Späher kehrt um.', 2500); return; }
    const fm = feldBarbMarsch('player', key);                                  // Lager, Boss, Drache, Invasion, Sammler
    if (fm) { if (fm.back) return;
        if (!alsBefehl('zurueck', { key })) { marschUmkehren(fm, now); updateHud(); saveGame(); }
        renderActiveMarches(); requestRender(); flashHint('Deine Truppen kehren um.', 3000); return; }
    if (!rechnet()) {                                 // Zuschauer: der Weltrechner lässt sie umkehren
        const m = pendingAttacks.find(x => marchKeyOf(x) === key) || pendingSends.find(x => marchKeyOf(x) === key);
        if (m && m.fightEndsAt) { flashHint('Die Truppen kämpfen schon – zu spät zum Zurückrufen.', 3000); return; }
        if (m && m.rally) { flashHint('Eine Rally gehört allen, die mitmachen – sie kann nicht zurückgerufen werden.', 3500); return; }
        if (m && m.vorlaeufig) { flashHint('Einen Moment – der Marsch läuft gerade los.', 1500); return; }
        if (m) { WELT.befehl('zurueck', { key }); flashHint('Deine Truppen kehren um.', 3000); }
        return;
    }
    for (const [list, kind] of [[pendingAttacks, 'attack'], [pendingSends, 'send']]) {
        const m = list.find(x => marchKeyOf(x) === key); if (!m) continue;
        if (m.fightEndsAt) { flashHint('Die Truppen kämpfen schon – zu spät zum Zurückrufen.', 3000); return; }
        const fromId = m.sourceId ?? m.fromId, toId = m.targetId ?? m.toId, troops = m.rawTroops ?? m.troops;
        const src = islandById[fromId], tgt = islandById[toId];
        const frac = Math.max(0, Math.min(1, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        if (kind === 'attack') heroWutZurueck('player', m.hx);   // (nicht gekämpft: die Wut bleibt)
        list.splice(list.indexOf(m), 1);
        const walked = Math.max(1000, (Math.min(now, m.resolveAt) - m.startedAt));   // (wer vor dem Ziel gewartet hat, läuft nur den Weg zurück)
        const home = ownedIslands.has(fromId) ? fromId : rewardBaseId();
        pendingRetreats.push({ fromId: toId, toId: home, troops, startedAt: now, resolveAt: now + walked, path: home === fromId ? pathSoFar(src, tgt, frac).reverse() : null });
        flashHint(fmtNum(troops) + ' Truppen kehren um – zurück in ' + fmtClock(Math.ceil(walked / 1000)) + '.', 3500);
        saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return;
    }
}
// (Zuschauer) eben beschleunigte Märsche merken: bis der Weltrechner es übernommen hat, setzt die nächste Welt-Lieferung
// sie nicht wieder auf die alte Zeit zurück (sonst springt der Marsch zurück und wieder vor)
const wartendSchneller = new Map();                 // Marsch-Kennung → { resolveAt, startedAt, bis }
function schnellerMerken(m) { if (window.WELT && !rechnet()) wartendSchneller.set(marchKeyOf(m), { resolveAt: m.resolveAt, startedAt: m.startedAt, bis: Date.now() + 10000 }); }
function schnellerDrueber() {
    if (!wartendSchneller.size) return;
    const now = Date.now();
    for (const [k, w] of wartendSchneller) {
        const m = pendingAttacks.find(x => marchKeyOf(x) === k) || pendingSends.find(x => marchKeyOf(x) === k) || pendingRetreats.find(x => marchKeyOf(x) === k) || feldBarbMarsch('player', k);
        if (!m || now > w.bis || m.resolveAt <= w.resolveAt + 1500) { wartendSchneller.delete(k); continue; }   // der Weltrechner hat es (oder es ist vorbei)
        m.resolveAt = w.resolveAt; m.startedAt = w.startedAt;
    }
}
// (Zuschauer) Losgeschickt → der Marsch steht SOFORT auf der Karte (vorläufig), bis der echte vom Weltrechner kommt
// (sonst sähe man ihn erst ~1 s später loslaufen). Spätestens nach 10 s verschwindet ein vorläufiger ohne echten.
const vorlaeufigeMaersche = [];                      // { art: 'a' | 's', m, bis }
function vorlaeufigDazu(art, m) {
    m.vorlaeufig = true; vorlaeufigeMaersche.push({ art, m, bis: Date.now() + 10000 });
    (art === 'a' ? pendingAttacks : pendingSends).push(m); renderActiveMarches(); requestRender();
}
function vorlaeufigDrueber() {
    if (!vorlaeufigeMaersche.length) return;
    const now = Date.now(), vergeben = new Set();
    for (let i = vorlaeufigeMaersche.length - 1; i >= 0; i--) {
        const v = vorlaeufigeMaersche[i], liste = v.art === 'a' ? pendingAttacks : pendingSends, m = v.m;
        const von = v.art === 'a' ? 'sourceId' : 'fromId', nach = v.art === 'a' ? 'targetId' : 'toId', wer = v.art === 'a' ? 'attackerBotId' : 'senderBotId';
        const echt = liste.find(x => !x.vorlaeufig && !vergeben.has(x) && !x[wer] && x[von] === m[von] && x[nach] === m[nach] && x.startedAt >= m.startedAt - 3000);
        if (echt || now > v.bis) { if (echt) vergeben.add(echt); vorlaeufigeMaersche.splice(i, 1); const j = liste.indexOf(m); if (j >= 0) liste.splice(j, 1); continue; }
        if (!liste.includes(m)) liste.push(m);
    }
}
function speedUpCost(m) { return Math.max(1, Math.ceil((m.resolveAt - Date.now()) / 60000)); }   // 1 gem per minute still to go
let speedUpZuletzt = 0;                               // (ein Doppel-Tipp beschleunigt nicht zweimal)
function speedUpMarch(key) {                         // halves the time still to go; the column keeps its place on the road
    const now = Date.now(); if (now - speedUpZuletzt < 600) return; speedUpZuletzt = now;
    const sc = pendingScouts.find(x => marchKeyOf(x) === key);                // ein Späher (nur deiner – kein Befehl an den Weltrechner nötig)
    if (sc) { const rem = sc.resolveAt - now; if (rem < 1500) return; const cost = speedUpCost(sc); if (gems < cost) { flashHint('Zu wenig Gems – Beschleunigen kostet ' + cost + '.', 3000); return; }
        gems -= cost; const p = Math.max(0, Math.min(.99, (now - sc.startedAt) / Math.max(1, sc.resolveAt - sc.startedAt)));
        sc.resolveAt = now + rem / 2; sc.startedAt = sc.resolveAt - (rem / 2) / (1 - p);
        flashHint('Späher beschleunigt – noch ' + fmtClock(Math.ceil(rem / 2000)) + '.', 2500); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return; }
    for (const list of [pendingAttacks, pendingSends, pendingRetreats, eigeneFeldBarb()]) {
        const m = list.find(x => marchKeyOf(x) === key); if (!m) continue;
        if (m.fightEndsAt) return;
        if (m.vorlaeufig) { flashHint('Einen Moment – der Marsch läuft gerade los.', 1500); return; }
        const rem = m.resolveAt - now; if (rem < 1500) return;
        const cost = speedUpCost(m); if (gems < cost) { flashHint('Zu wenig Gems – Beschleunigen kostet ' + cost + '.', 3000); return; }
        gems -= cost;
        alsBefehl('schneller', { keys: [key] });
        const p = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - p); schnellerMerken(m);
        flashHint('Beschleunigt – noch ' + fmtClock(Math.ceil(rem / 2000)) + '.', 2500);
        feldBarbSpeichern(); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender(); return;
    }
}
// "Alle schneller": halves the time left of every own column on the road at once (same price as one by one)
function speedableMarches() {
    const now = Date.now();
    return [...pendingAttacks.filter(a => !a.attackerBotId), ...pendingSends.filter(x => !x.senderBotId), ...pendingRetreats, ...eigeneFeldBarb()].filter(m => !m.fightEndsAt && !m.vorlaeufig && m.resolveAt - now >= 1500);
}
function speedUpAll() {
    if (Date.now() - speedUpZuletzt < 600) return; speedUpZuletzt = Date.now();
    const list = speedableMarches(); if (!list.length) return;
    const cost = list.reduce((a, m) => a + speedUpCost(m), 0);
    if (gems < cost) { flashHint('Zu wenig Gems – alle beschleunigen kostet ' + fmtNum(cost) + '.', 3000); return; }
    gems -= cost; const now = Date.now();
    alsBefehl('schneller', { keys: list.map(marchKeyOf) });
    for (const m of list) { const rem = m.resolveAt - now, pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt)));
        m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); schnellerMerken(m); }
    flashHint(list.length + (list.length === 1 ? ' Marsch' : ' Märsche') + ' beschleunigt – Restzeit halbiert.', 2500);
    feldBarbSpeichern(); updateHud(); saveGame(); saveProgression(); renderActiveMarches(); requestRender();
}
function marchButtons(m, canRecall) {
    const k = marchKeyOf(m);
    return '<span class="mact">' + (canRecall ? '<button type="button" data-mact="recall" data-k="' + k + '" title="Zurückrufen">' + icon('recall') + 'Zurück</button>' : '') +
        '<button type="button" data-mact="speed" data-k="' + k + '" title="Restzeit halbieren">' + icon('hourglass') + 'Schneller · <b>' + speedUpCost(m) + '</b>' + icon('gem') + '</button></span>';
}

function resolveSend(send) {
    const target = islandById[send.toId];
    if (!target) return;
    if ((send.rally || send.hilfe || send.verst) && typeof bundSendAnkunft === 'function' && bundSendAnkunft(send)) return;   // Bündnis: zur Rally oder als Hilfe zu einem Mitglied
    const sender = send.senderBotId || 'player';
    if (islandOwnerOf(send.toId) !== sender) {       // the base fell while they marched: they turn round instead of joining the enemy
        const home = islandOwnerOf(send.fromId) === sender ? send.fromId : sender === 'player' ? rewardBaseId() : [...(botOwnedIslands[sender] || [])][0];
        if (home !== null && home !== undefined && islandById[home]) {
            const startedAt = Date.now(), dur = travelDurationSeconds(target, islandById[home], send.senderBotId);
            if (sender === 'player') {
                pendingRetreats.push({ fromId: send.toId, toId: home, troops: send.troops, startedAt, resolveAt: startedAt + dur * 1000 });
                flashHint(islandTitle(target) + ' ist schon gefallen – deine ' + fmtNum(send.troops) + ' Truppen kehren nach ' + islandTitle(islandById[home]) + ' zurück.', 5000);
                renderActiveMarches();
            } else if (botById[sender] && botById[sender].mensch && !send.back) {   // ein echter Spieler (Weltrechner): sichtbar zurück + Bescheid (vorher still heimgebucht – sah aus wie „abgebrochen“)
                pendingSends.push({ fromId: send.toId, toId: home, troops: send.troops, startedAt, resolveAt: startedAt + dur * 1000, senderBotId: sender, back: true });
                if (typeof bundMelden === 'function') bundMelden(sender, islandTitle(target) + ' ist gefallen, bevor deine Truppen ankamen – ' + fmtNum(send.troops) + ' Truppen kehren nach ' + islandTitle(islandById[home]) + ' zurück.');
            } else islandTroops[home] = (islandTroops[home] || 0) + send.troops;
        }
        saveGame(); saveProgression(); return;
    }
    islandTroops[send.toId] = (islandTroops[send.toId] || 0) + send.troops;
    updateHud();
    saveGame();
    // Persists the now-shorter pendingSends array too - without this
    // the just-resolved send reloads from localStorage on next page
    // load (resolveAt already in the past) and gets applied a
    // second time, duping the arrived troops.
    saveProgression();
    // A bot reinforcing its own base internally is never shown to
    // the player - same reasoning as bot-vs-neutral attacks.
    if (send.senderBotId) return;
    addCombatLogEntry({
        type: 'send',
        fromId: send.fromId,
        toId: send.toId,
        troops: send.troops
    });
    flashHint(fmtNum(send.troops) + ' Truppen bei ' + islandTitle(target) + ' angekommen.', 3000);
}

// "Spähen": no troops needed, but a scout still takes time to reach
// the target - measured from the player's home base.
// Always scouts from whichever owned base is actually closest to the
// target, not always the player's original home base - a scout sent
// from a far-off home while a much closer base sits right next to
// the target made no sense.
function nearestOwnedIslandTo(target) {
    let bestId = null, bestDist = Infinity;
    for (const id of ownedIslands) {
        const isl = islandById[id];
        if (!isl) continue;
        const dist = Math.hypot(isl.x - target.x, isl.y - target.y);
        if (dist < bestDist) { bestDist = dist; bestId = id; }
    }
    return bestId;
}

function launchScout(targetId, explore, at) {
    const target = islandById[targetId];
    if (!target) return;
    const sourceId = nearestOwnedIslandTo(target);
    const home = islandById[sourceId];
    if (!home) return;
    if (!spaeherWeg(home.landmassId, target.landmassId, 'player')) { flashHint('Ein geschlossenes Tor versperrt den Weg – dein Späher kommt nicht durch.', 3500); return; }
    sfx('scout');

    const durationSec = scoutSecs(home, target);   // the Späherturm makes scouts faster
    const startedAt = Date.now();
    pendingScouts.push({
        sourceId,
        targetId,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        explore: !!explore,
        ex: at ? at.x : undefined, ey: at ? at.y : undefined
    });
    if (explore) alsBefehl('spaehen', { ziel: targetId, ex: at ? Math.round(at.x) : undefined, ey: at ? Math.round(at.y) : undefined });   // 3B: der Weltrechner deckt den Nebel auf dem Server mit auf
    questProgress('scout', 1);
    saveGame();
    saveProgression();
    flashHint((explore ? 'Späher erkundet das Gebiet · ca. ' : 'Späher unterwegs zu ' + islandTitle(target) + ' · ca. ') + fmtClock(durationSec));
    renderActiveMarches();
}

// Spähbericht: was der Späher über den Herrn der Basis herausfindet – alles, sofort (Alexander 4.10.): Herr, Stufe, Titel,
// Schild, Mauer, Helden, Burg, Rohstoffe (und wie viel davon zu holen ist), Fähigkeiten, Forschung, Ausrüstung
function spaeherBlick(owner) {
    if (!owner || owner === 'player' || !botById[owner]) return null;
    const b = loadBotState()[owner]; if (!b) return null;
    const t = titleOf(owner), o = { name: botById[owner].name, lvl: b.lvl || 1, titel: t ? t.name : '', schild: !!ownerShielded(owner), wall: botBld(owner, 'wall') || 0 };
    o.held = Object.entries(b.hs || {}).filter(([id, h]) => h && h.own && heroById(id)).sort((x, y) => (y[1].q || 0) - (x[1].q || 0)).slice(0, 3).map(([id, h]) => [heroById(id).name, (h.q || 0) / 2]);
    o.sk = { attack: (b.skills || {}).attack || 0, defense: (b.skills || {}).defense || 0, troops: (b.skills || {}).troops || 0 };
    o.gear = {}; for (const k of Object.keys(EQUIPMENT_DEFS)) { const it = botItem(b, k); o.gear[k] = it ? [it.rarity, it.level, it.stars] : null; }
    o.auf = AUF ? AUF.spaeherMehr(owner) : null;                             // Burg, Rohstoffe, Forschung
    return o;
}
function spaeherBlickHtml(s) {
    if (!s) return '';
    const stern = n => n ? ' ' + '★'.repeat(Math.floor(n)) + (n % 1 ? '½' : '') : '', zeile = (a, b) => '<div class="logLine"><span>' + a + '</span><span>' + b + '</span></div>';
    const A = s.auf || {}, R = A.roh;
    const gear = s.gear ? Object.keys(EQUIPMENT_DEFS).map(k => { const g = s.gear[k]; return '<div class="logLine"><span>' + EQUIPMENT_DEFS[k].name + '</span><span' + (g ? ' style="color:' + RARITY_DEFS[g[0]].color + '"' : '') + '>' +
        (g ? RARITY_DEFS[g[0]].label + ' · St. ' + g[1] + (g[2] ? ' · ' + g[2] + '★' : '') : '—') + '</span></div>'; }).join('') : '';
    const beute = v => fmtCompact(v) + (R && v > R.schutz ? ' <small>(' + fmtCompact(Math.floor((v - R.schutz) * HAUPT_BEUTE)) + ' zu holen an der Hauptstadt)</small>' : '');
    return '<details><summary>Spähbericht</summary><div class="logSide" style="margin-top:6px">' +
        zeile('Herr', escapeHtml(s.name) + ' · Stufe ' + fmtNum(s.lvl) + (s.titel ? ' · ' + escapeHtml(s.titel) : '')) +
        zeile('Friedensschild', s.schild ? 'aktiv' : 'keiner') +
        (s.wall !== undefined ? zeile('Mauer', 'Stufe ' + s.wall) : '') +
        (s.held ? zeile('Helden', s.held.length ? s.held.map(h => escapeHtml(h[0]) + stern(h[1])).join(', ') : 'keine') : '') +
        (A.burg ? zeile('Burg', 'Stufe ' + A.burg + (R ? ' · schützt ' + fmtCompact(R.schutz) + ' je Rohstoff' : '')) : '') +
        (R ? zeile('Gold', beute(R.c)) + (R.h !== undefined ? zeile('Holz', beute(R.h)) + zeile('Stein', beute(R.s)) + zeile('Eisen', beute(R.e)) : '') : '') +
        (s.sk ? zeile('Fähigkeiten', 'Angriff ' + s.sk.attack + ' · Vert. ' + s.sk.defense + ' · Truppen ' + s.sk.troops) : '') +
        (A.fo ? zeile('Forschung', 'Angriff ' + (A.fo.atk | 0) + ' · Vert. ' + (A.fo.def | 0) + ' · Krankenhaus ' + (A.fo.laz | 0)) : '') + gear + '</div></details>';
}
// Der Späher läuft hin UND zurück (Alexander 4.10.): am Ziel gibt es den Bericht, dann geht er denselben Weg heim
function spaeherHeim(scout, ms) {
    const now = Date.now(), dauer = Math.max(1000, ms);
    pendingScouts.push({ sourceId: scout.targetId, targetId: scout.sourceId, startedAt: now, resolveAt: now + dauer, back: true });
}
function resolveScout(scout) {
    if (scout.back) { saveProgression(); return; }                            // wieder zu Hause
    const target = islandById[scout.targetId];
    if (!target) return;
    spaeherHeim(scout, scout.resolveAt - scout.startedAt);
    if (scout.explore) {
        revealAround(scout.ex ?? target.x, scout.ey ?? target.y, REVEAL_SCOUT, true);
        saveProgression();
        flashHint('Gebiet erkundet – der Nebel lichtet sich.', 3500);
        return;
    }
    scoutedIslands.add(scout.targetId); statBump('scouts');
    saveGame();
    // Same reasoning as resolveSend(): persist the now-shorter
    // pendingScouts array, or a reload replays this scout again.
    saveProgression();
    addCombatLogEntry({
        type: 'scout',
        sourceId: scout.sourceId,
        targetId: scout.targetId,
        troops: effectiveTroops(target),
        defense: effectiveDefense(target),
        spy: spaeherBlick(islandOwnerOf(target.id))
    });
    flashHint(islandTitle(target) + ' gespäht – Bericht im Kampflog.', 3000);   // (die Zahlen stehen im Kampflog, nicht im Hinweis)
}

function retreatPct(attack) { return Math.min(60, RETREAT_RECOVERY_PCT + (attack.hx ? attack.hx.flee : 0)); }   // a hero (Standhaft, Leichtfuß …): more of a beaten army gets away
function retreatSecs(attack, from, to, botId) { return travelDurationSeconds(from, to, botId) / (1 + (attack.hx ? attack.hx.ret : 0) / 100); }   // Rückweg, Feldküche: faster home
function retreatSurvivorsPreview(attack) { return Math.floor(attack.rawTroops * retreatPct(attack) / 100); }
function resolveAttack(attack) {
    const source = islandById[attack.sourceId];
    const target = islandById[attack.targetId];
    if (!source || !target) return;

    // Uses the bonuses snapshotted at launch (see launchAttack), not
    // whatever the player's skills/equipment are right now - troops
    // already marching shouldn't have their outcome change because
    // a skill got leveled up while they were still en route.
    const atkBonus = attack.attackBonus !== undefined ? attack.attackBonus : attackFlatBonus(attack.rawTroops);
    const lossReductionPct = attack.shieldLossReductionPct !== undefined ? attack.shieldLossReductionPct : shieldLossReductionPct();
    const rewardRate = attack.rewardGoldRate !== undefined ? attack.rewardGoldRate : goldPerKillRate();

    const myTroops = Math.round((attack.rawTroops + atkBonus) * (attack.atkTitle !== undefined ? attack.atkTitle : titleMult('player', 'attack')) * (attack.atkKraft || 1));   // (Truppen-Stufe + Forschung vom Losschicken)
    const targetOwner = islandOwnerOf(target.id); // null | 'player' | a bot id
    if (targetOwner === 'player') { islandTroops[target.id] = (islandTroops[target.id] || 0) + attack.rawTroops; saveGame(); requestRender(); return; }   // inzwischen deine (ein anderer Angriff hat sie genommen): die Truppen bleiben dort
    const vk = targetOwner && typeof verstVorKampf === 'function' ? verstVorKampf(target.id) : null;   // Verstärkung (Botschaft) verteidigt mit
    const originalEnemyTroops = effectiveTroops(target);
    const fullDefense = effectiveDefense(target), originalEnemyDefense = Math.round(fullDefense * (1 - heroDefCut(attack))), defParts = heroDefPart(defenseParts(target), attack, fullDefense);
    const atkParts = attackParts('player', attack.rawTroops, atkBonus, myTroops, attack.hero, attack), hosp = attack.hx ? Math.min(100, hospitalPct() + attack.hx.hosp) : undefined;
    const totalStrength = originalEnemyTroops + originalEnemyDefense;
    const won = myTroops > totalStrength;
    const bossHere = bossAt(target.id);
    const capitalHolds = won && targetOwner && targetOwner !== 'player' && isCapital(target.id);   // a capital never falls: only its garrison - and it burns
    if (targetOwner && targetOwner !== 'player') botGrudge(targetOwner, 'player', won ? 2 : 1);   // the bot remembers this
    const losses = Math.round(originalEnemyDefense * (1 - lossReductionPct / 100));
    const sentLoss = won ? Math.min(attack.rawTroops, Math.round(losses * attack.rawTroops / Math.max(1, myTroops))) : 0;   // the losses are shared between sent and bonus troops
    const remaining = won ? Math.max(0, attack.rawTroops - sentLoss) : 0;

    let defenderCasualties, enemyWounded = 0, killGold = 0;
    if (targetOwner && targetOwner !== 'player')                    // the defending bot's "Verteidigung: Gold": every attacker its garrison really kills pays out
        botCoins[targetOwner] = (botCoins[targetOwner] || 0) + Math.round((won ? sentLoss : attack.rawTroops - retreatSurvivorsPreview(attack)) * botGoldRate(targetOwner, 'defenseGold'));
    let retreatSurvivors = 0, woundedAdded = 0;
    const plunder = won && targetOwner && targetOwner !== 'player' ? plunderOf(targetOwner, capitalHolds) : null;   // Beute: ein kleiner Teil über seinem Burg-Schutz (Turm: nur Gold, Hauptstadt: alles)
    if (plunder) { plunderMove(targetOwner, null, plunder.loot, plunder.roh); inboxAdd({ src: 'fight', coins: plunder.loot }); if (plunder.roh && AUF) AUF.rohDazu('player', plunder.roh); }   // (das Gold wartet im Abholfach)
    if (capitalHolds) brandSetzen(target.id);                               // die Hauptstadt brennt (nur zu sehen)

    if (capitalHolds) {                                                     // the garrison falls, the base stays theirs - your survivors walk home
        islandTroops[target.id] = 0; defenderCasualties = originalEnemyTroops;
        woundedAdded = hospitalTake(sentLoss, hosp); warStat('fallen', sentLoss - woundedAdded); warStat('kills', originalEnemyTroops);
        killGold = Math.round(originalEnemyTroops * rewardRate); inboxAdd({ src: 'fight', coins: killGold }); retreatSurvivors = remaining;
        if (remaining > 0) { const t0 = Date.now(); pendingRetreats.push({ fromId: target.id, toId: source.id, troops: remaining, startedAt: t0, resolveAt: t0 + retreatSecs(attack, target, source) * 1000 }); }
    } else if (won) {
        // Capturing a base doesn't reset it to level 1 - it costs
        // the previous owner one level of upgrades, same as losing
        // any other base. A level 10 base taken by force becomes a
        // level 9 base for its new owner, not back to scratch.
        const levelAfterCapture = Math.max(1, (islandLevels[target.id] || 1) - 1);
        if (targetOwner) { botNoteLoss(targetOwner, target.id); clearIslandOwner(target.id); } // taken from a bot (or, later, another player)
        islandTroops[target.id] = remaining;
        woundedAdded = hospitalTake(attack.rawTroops - remaining, hosp);    // your fallen in a won fight: part of them only wounded
        ownedIslands.add(target.id);
        islandLevels[target.id] = levelAfterCapture;
        questProgress('capture', 1);
        warStat('fallen', attack.rawTroops - remaining - woundedAdded); warStat('captures'); warStat('kills', originalEnemyTroops);
        statBump('captures'); if (targetOwner && targetOwner !== 'player') statBump('pvpWins');
        if (target.type === 'temple' || target.type === 'megaTemple' || target.guardian) statBump('temples');
        if (target.type === 'gate') setGateSettings(target.id, { toll: target.toll, closed: false });
        revealAround(target.x, target.y, REVEAL_BASE * (AUF ? AUF.nebelWeite('player') : 1), true);   // (Forschung Kundschaft: weiter)
        killGold = Math.round(originalEnemyTroops * rewardRate); inboxAdd({ src: 'fight', coins: killGold });   // "Angriff: Gold": per enemy troop killed
        defenderCasualties = originalEnemyTroops;
        // (das Krankenhaus des Verteidigers: unten, nach dem Trennen von seiner Verstärkung)
        if (target.type === 'temple' || target.type === 'megaTemple') {
            // Starts (or restarts) this temple's hold streak - see
            // templeHoldMultiplier(). Ready for a future PvP
            // recapture to reset this the same way.
            templeHoldSince[target.id] = Date.now();
        }
    } else {
        // A losing attack isn't one-sided: the defender also takes
        // real casualties (capped at their own garrison, and at the
        // attacker's strength - they only lose as many troops as
        // actually clashed with them), permanently weakening that
        // base for next time. And a fraction of the attacker's
        // "dead" troops actually survive and retreat back to the
        // base the attack was launched from.
        defenderCasualties = Math.min(originalEnemyTroops, myTroops);
        if (targetOwner) {
            islandTroops[target.id] = Math.max(0, (islandTroops[target.id] || 0) - defenderCasualties);
        } else if (bossHere) {
            bossHere.troops = Math.max(0, bossHere.troops - defenderCasualties);
            saveWander();
        } else {
            target.neutralTroops = originalEnemyTroops - defenderCasualties;
            neutralTroopOverrides[target.id] = target.neutralTroops;
        }

        warStat('attacksLost'); warStat('kills', defenderCasualties);
        killGold = Math.round(defenderCasualties * rewardRate); inboxAdd({ src: 'fight', coins: killGold });
        retreatSurvivors = retreatSurvivorsPreview(attack);
        woundedAdded = hospitalTake(attack.rawTroops - retreatSurvivors, hosp);   // Krankenhaus (+ a hero's Feldlazarett): part of the fallen are only wounded
        warStat('fallen', attack.rawTroops - retreatSurvivors - woundedAdded);
        if (retreatSurvivors > 0) {
            const durationSec = retreatSecs(attack, target, source);
            const startedAt = Date.now();
            pendingRetreats.push({
                fromId: target.id,
                toId: source.id,
                troops: retreatSurvivors,
                startedAt,
                resolveAt: startedAt + durationSec * 1000
            });
        }
    }
    const vs = vk ? verstNachKampf(target.id, vk, won) : null, verstInfo = vs ? { verst: vs.helfer, eigen: vs.eigen } : {};   // jeder trägt seinen Anteil
    const defWeg = vs ? vs.eigenWeg : defenderCasualties;
    if (targetOwner && targetOwner !== 'player') enemyWounded = botHospitalTake(targetOwner, defWeg);   // the bot's Krankenhaus takes part of ITS fallen
    // XP for troops that died in the clash either way: a win kills
    // the whole enemy force, a loss costs your whole attack force
    noteBattle(target.id, won ? originalEnemyTroops : attack.rawTroops - retreatSurvivors, won ? targetOwner : 'player');
    midFight(target.id, 'player', won ? originalEnemyTroops : defenderCasualties, targetOwner, won ? sentLoss : attack.rawTroops - retreatSurvivors);   // Punkte für die Krieger-Woche
    if (targetOwner && targetOwner !== 'player') botMoodAdd(targetOwner, won ? -.25 : .1);
    addXp(kampfEp(won ? totalStrength : defenderCasualties, playerLvl, totalStrength, myTroops));
    heroFought('player', attack.hx);                                     // every fight the hero leads fills his rage
    scoutedIslands.add(target.id);
    const ribbon = () => spawnBattleFx(target.id, won, capitalHolds ? 'Geplündert' : won ? (bossHere ? 'Boss besiegt' : 'Sieg') : 'Niederlage', capitalHolds ? 'die Hauptstadt hält' : won ? islandTitle(target) + ' erobert' : '−' + fmtCompact(attack.rawTroops - retreatSurvivors) + ' Truppen');
    finishMapBattle(attack, { hero: attack.hero || null, sourceId: source.id, targetId: target.id, atk: 'mine', def: bossHere ? 'boss' : targetOwner ? 'bot' : 'neutral',   // fights the player watches play out on the map
            my: myTroops, myLoss: myTroops - (won ? remaining : retreatSurvivors), en: originalEnemyTroops,
            enLoss: won ? originalEnemyTroops : defenderCasualties, won, onEnd: ribbon });
    if (won && bossHere) defeatBoss(bossHere);
    updateHud();
    saveGame();
    saveProgression();
    if (!won) renderActiveMarches();

    // Everything the battle log shows: each side's bonuses with their source (atkParts/defParts),
    // both sides' gear, heroes and city (atkGear/defGear), losses, wounded and gold.
    addCombatLogEntry({
        type: 'attack',
        sourceId: attack.sourceId,
        targetId: attack.targetId,
        myTroops: attack.rawTroops,
        myTroopsBuffed: myTroops,
        attackBuff: myTroops - attack.rawTroops,
        skillBuff: atkBonus,
        titleBuff: myTroops - attack.rawTroops - atkBonus,
        lossReductionPct, heroLossPct: attack.hx ? attack.hx.loss : 0,
        lossSaved: won ? Math.max(0, Math.round((originalEnemyDefense - losses) * attack.rawTroops / Math.max(1, myTroops))) : 0,
        attackGoldRate: attack.attackGoldRate !== undefined ? attack.attackGoldRate : (skills.attackGold || 0) * SKILL_DEFS.attackGold.rate, killGold,
        attackerCasualties: won ? Math.max(0, sentLoss - woundedAdded) : Math.max(0, attack.rawTroops - retreatSurvivors - woundedAdded),   // really dead: not the ones who fled or lie in the Krankenhaus
        wounded: woundedAdded,
        enemyTroops: originalEnemyTroops,
        enemyDefense: originalEnemyDefense,
        defenseBuff: 0,
        defenderCasualties,
        retreatSurvivors,
        defenderName: targetOwner ? botById[targetOwner].name : null, defenderId: targetOwner && targetOwner !== 'player' ? targetOwner : null,
        atkParts, defParts, enemyWounded, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, capitalHolds,
        atkGear: fighterSnapshot('player', attack.hx), defGear: targetOwner && targetOwner !== 'player' ? fighterSnapshot(targetOwner) : null,
        won,
        remaining, ...verstInfo
    });
    if (vs) verstBerichte(vs, { type: 'botAttack', botName: profileName.value || 'Spieler', botId: 'player', targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus,
        atkGear: fighterSnapshot('player', attack.hx), defGear: fighterSnapshot(targetOwner), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, fallen: defWeg, wounded: 0,
        won, capitalHolds, defName: (botById[targetOwner] || {}).name, ...verstInfo });
    if (window.WELT && targetOwner && botById[targetOwner] && botById[targetOwner].mensch) {   // du hast einen echten Spieler angegriffen: sein Bericht
        const meinName = profileName.value || 'Spieler';
        WELT.bericht(targetOwner, { type: 'botAttack', botName: meinName, botId: 'player', targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus: atkBonus,
            atkGear: fighterSnapshot('player', attack.hx), defGear: fighterSnapshot(targetOwner), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense,
            wounded: enemyWounded || 0, fallen: defWeg, won, capitalHolds, defGold: 0, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, ...verstInfo },
            capitalHolds ? meinName + ' hat deine Hauptstadt geplündert (' + (beuteText(plunder) || 'nichts über dem Schutz') + ') – die Garnison ist gefallen, die Stadt brennt, aber sie hält.' : won ? meinName + ' hat deine Basis ' + islandTitle(target) + ' erobert!' : 'Verteidigung erfolgreich – ' + meinName + ' bei ' + islandTitle(target) + ' zurückgeschlagen.');
    }

    flashHint(capitalHolds ? 'Die Hauptstadt von ' + botById[targetOwner].name + ' brennt – ihre Garnison ist gefallen, ' + fmtCompact(remaining) + ' Truppen kehren mit der Beute zurück' + (beuteText(plunder) ? ': ' + beuteText(plunder) + '.' : '.') : (won
        ? 'Sieg bei ' + islandTitle(target) + (targetOwner ? ' gegen ' + botById[targetOwner].name : '') + '! ' + fmtCompact(remaining) + ' übrig' + (woundedAdded ? ', ' + fmtCompact(woundedAdded) + ' ins Krankenhaus.' : '.')
        : 'Niederlage bei ' + islandTitle(target) + ' – ' + fmtCompact(retreatSurvivors) + ' fliehen' + (woundedAdded ? ', ' + fmtCompact(woundedAdded) + ' ins Krankenhaus.' : '.')) + (plunder && plunder.loot && !capitalHolds ? ' Beute: ' + fmtCompact(plunder.loot) + ' Münzen.' : ''), 6000);
}

function resolveRetreat(retreat) {
    if (!ownedIslands.has(retreat.toId)) {          // home fell while they walked back: they go to a base that's still ours
        const home = rewardBaseId(); if (home === null || home === undefined || !islandById[home]) return;
        retreat.toId = home;
    }
    const target = islandById[retreat.toId];
    if (!target) return;
    islandTroops[retreat.toId] = (islandTroops[retreat.toId] || 0) + retreat.troops;
    updateHud();
    saveGame();
    saveProgression();
    addCombatLogEntry({
        type: 'retreat',
        fromId: retreat.fromId,
        toId: retreat.toId,
        troops: retreat.troops
    });
    flashHint(fmtNum(retreat.troops) + ' geflohene Truppen bei ' + islandTitle(target) + ' angekommen.', 3000);
}


// Precomputed once (landmasses never change): which islands sit on
// a given landmass, and which landmasses are directly reachable
// from it (itself plus every bridge-connected neighbor) - lets bot
// AI scan only the handful of landmasses actually in reach instead
// of every island on the whole map, every tick, per bot.
const islandsByLandmass = {};
for (const isl of islands) {
    (islandsByLandmass[isl.landmassId] = islandsByLandmass[isl.landmassId] || []).push(isl);
}
