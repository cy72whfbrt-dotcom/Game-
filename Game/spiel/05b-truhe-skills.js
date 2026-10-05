// Teil 05b-truhe-skills.js: Truhe und Ausrüstung im Profil, Skills
// The old coin-upgraded weapon/armor/shield/boots cards were
// removed - the gem-crate rarity system below (renderChestEquipment)
// replaced them as the way to grow this equipment. This just keeps
// the summary stat chips (total bonus from equipment+skills+rarity
// items combined) up to date.
function renderEquipGrid() {
    // A zero bonus is shown neutral ("0 %"), the sign and the success colour only once it is > 0.
    const chip = (ic, v, sign, unit, label) => {
        const r = Math.round(v);
        return '<div class="statChip">' + icon(ic) + '<b' + (r > 0 ? ' class="good">' + sign : '>') + fmtNum(r) + unit + '</b><span>' + label + '</span></div>';
    };
    liveHtml(equipStats,
        chip('troops', bonusPct('weapon', 'troops'), '+', ' %', 'Truppen') +
        chip('coin', bonusPct('boots', null), '+', ' %', 'Münzen') +
        chip('defense', armorDefensePct(), '+', ' %', 'Verteidigung') +
        chip('losses', shieldLossReductionPct(), '−', ' %', 'Verluste'));
}

// The gem-crate rarity item layer: one equipped card per slot
// (shows what's equipped + a level-up button spending upgrade
// points), and an inventory grid below grouped by slot+rarity
// (equip the best one, combine 3-of-a-kind, or salvage one for
// points).
// Tile-grid inventory: equipped items on top (one tile per slot),
// every other owned item below as its own tile (no more grouping -
// each item is tappable on its own). Tapping a tile opens its
// detail popup (level up / equip / unequip / sell); tapping the
// small dot in its corner toggles it into the selection used for
// bulk-selling or (with exactly 3 matching tiles) combining -
// selecting is always available, not a separate mode to switch in
// and out of first.
// Tiles are divs (they hold a nested checkbox): make them operable like a button.
function makeTileKeyboard(tile, label) {
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', label);
    tile.addEventListener('keydown', (e) => {
        if (e.target !== tile || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        tile.click();
    });
}
function renderChestEquipment() {
    chestPointsValue.textContent = fmtNum(upgradePoints);

    chestEquippedGrid.innerHTML = '';
    for (const slotKey of Object.keys(EQUIPMENT_DEFS)) {
        const def = EQUIPMENT_DEFS[slotKey];
        const itemId = equippedItems[slotKey];
        const item = itemId ? inventory[itemId] : null;
        const slot = document.createElement('div');
        slot.className = 'slot';
        const tile = document.createElement('div');
        if (item) {
            const rd = RARITY_DEFS[item.rarity];
            tile.className = 'tile';
            tile.dataset.r = rd.key;
            tile.innerHTML = icon(def.icon) + '<span class="lvl">' + item.level + '</span><span class="check">' + icon('check') + '</span>' + (item.stars ? '<span class="stars">' + icon('star').repeat(item.stars) + '</span>' : '');
            tile.title = def.name + ' – ' + rd.label + ', Stufe ' + item.level;
            tile.addEventListener('click', () => openChestItemPopup(item.id));
            makeTileKeyboard(tile, def.name + ', ' + rd.label + ', Stufe ' + item.level + ', ausgerüstet');
        } else {
            tile.className = 'tile empty';
            tile.innerHTML = icon(def.icon);
            tile.title = def.name + ' – leer';
        }
        slot.appendChild(tile);
        slot.insertAdjacentHTML('beforeend', '<span class="slot-l">' + def.name + '</span>' + (item
            ? '<span class="slot-r" data-r="' + RARITY_DEFS[item.rarity].key + '">' + RARITY_DEFS[item.rarity].label + ' · ' + item.level + '</span>'
            : '<span class="slot-r">leer</span>'));
        chestEquippedGrid.appendChild(slot);
    }

    chestInventoryGrid.innerHTML = '';
    const items = Object.values(inventory)
        .filter(it => equippedItems[it.slot] !== it.id)
        .sort((a, b) => b.rarity - a.rarity || b.level - a.level);
    chestInventoryLabel.textContent = 'Inventar · ' + items.length;
    if (items.length === 0) {
        chestInventoryGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + icon('shop') +
            '<b>Noch keine Ausrüstung</b><span>Kaufe eine Ausrüstungskiste im Shop.</span></div>';
    }
    for (const item of items) {
        const def = EQUIPMENT_DEFS[item.slot];
        const rd = RARITY_DEFS[item.rarity];
        const selected = chestSelectedIds.has(item.id);
        const tile = document.createElement('div');
        tile.className = 'tile' + (selected ? ' is-selected' : '');
        tile.dataset.r = rd.key;
        tile.innerHTML = icon(def.icon) + '<span class="lvl">' + item.level + '</span>' + (item.stars ? '<span class="stars">' + icon('star').repeat(item.stars) + '</span>' : '') +
            '<span class="selectDot' + (selected ? ' checked' : '') + '" role="checkbox" aria-checked="' + selected + '" aria-label="Zum Verkaufen auswählen"></span>';
        tile.title = def.name + ' – ' + rd.label + ', Stufe ' + item.level;
        tile.dataset.id = item.id;
        const dot = tile.querySelector('.selectDot');
        tile.addEventListener('click', (e) => {
            // a pointer click inside the top-right checkbox corner selects, anywhere else opens the item card
            const d = dot.getBoundingClientRect();
            if (e.detail !== 0 && e.clientX >= d.left && e.clientY <= d.bottom) { toggleSel(false); return; }
            openChestItemPopup(item.id);
        });
        makeTileKeyboard(tile, def.name + ', ' + rd.label + ', Stufe ' + item.level);
        dot.tabIndex = 0;
        const toggleSel = (fromKey) => {
            if (chestSelectedIds.has(item.id)) chestSelectedIds.delete(item.id);
            else chestSelectedIds.add(item.id);
            renderChestEquipment();
            if (fromKey) {                      // keep keyboard focus on the same checkbox after the re-render
                const again = [...chestInventoryGrid.querySelectorAll('.tile')].find(t => t.dataset.id === String(item.id));
                if (again) again.querySelector('.selectDot').focus();
            }
        };
        dot.addEventListener('click', (e) => { e.stopPropagation(); toggleSel(false); });
        dot.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault(); e.stopPropagation(); toggleSel(true);
        });
        chestInventoryGrid.appendChild(tile);
    }
    chestInventoryGrid.classList.toggle('has-selection', chestSelectedIds.size > 0);

    chestSelectionBar.style.display = items.length === 0 ? 'none' : 'block';
    const selected = [...chestSelectedIds].map(id => inventory[id]).filter(it => it && equippedItems[it.slot] !== it.id);
    // The label is only ever about the Verkaufen selection now -
    // Kombinieren doesn't need anything picked, so there's nothing
    // to prompt for when the selection is empty.
    if (chestFlashMessage) {
        chestSelectionLabel.style.display = 'block';
        chestSelectionLabel.textContent = chestFlashMessage;
    } else if (selected.length > 0) {
        chestSelectionLabel.style.display = 'block';
        const selPoints = selected.reduce((sum, it) => sum + itemScore(it), 0);
        chestSelectionLabel.innerHTML = '<b>' + selected.length + '</b> gewählt · +' +
            fmtNum(selPoints) + (selPoints === 1 ? ' Punkt' : ' Punkte');
    } else {
        // presentation only: a quiet prompt instead of an empty footer half
        chestSelectionLabel.style.display = 'block';
        chestSelectionLabel.textContent = 'Zum Verkaufen markieren';
    }
    chestSelectionLabel.classList.toggle('is-prompt', !chestFlashMessage && selected.length === 0);
    chestSelectSellBtn.disabled = selected.length === 0;
    // Always active, never tied to a selection - enabled whenever
    // ANY 3-of-a-kind exists anywhere in the inventory.
    chestSelectCombineBtn.disabled = !findAnyCombinableGroup();
}

// Briefly shows exactly what a combine/sell click just did.
let chestFlashMessage = null;
let chestFlashTimer = null;
function showChestFlash(msg) {
    chestFlashMessage = msg;
    clearTimeout(chestFlashTimer);
    chestFlashTimer = setTimeout(() => {
        chestFlashMessage = null;
        renderChestEquipment();
    }, 2200);
}

chestSelectSellBtn.addEventListener('click', () => {
    const ids = [...chestSelectedIds].filter(id => inventory[id] && equippedItems[inventory[id].slot] !== id);
    const points = salvageItems(ids);
    chestSelectedIds.clear();
    if (points > 0) showChestFlash(ids.length + ' verkauft für ' + fmtNum(points) + (points === 1 ? ' Punkt' : ' Punkte'));
    renderChestEquipment();
});
// No selection needed - merges every eligible group in one go.
chestSelectCombineBtn.addEventListener('click', () => {
    const n = autoCombineAll();
    if (n > 0) showChestFlash(n === 1 ? '1 Kombination durchgeführt' : (n + ' Kombinationen durchgeführt'));
    renderChestEquipment();
});

// Item detail popup: tapping any tile (outside select mode) opens
// this with the item's stat bonus and Verbessern/Ausrüsten-
// Ablegen/Verkaufen actions.
function openChestItemPopup(itemId) {
    if (!inventory[itemId]) return;
    chestDetailItemId = itemId;
    renderChestItemPopup();
    openPanel(chestItemPopup);
}

function renderChestItemPopup() {
    const item = inventory[chestDetailItemId];
    if (!item) { closePanel(chestItemPopup); return; }
    const def = EQUIPMENT_DEFS[item.slot];
    const rd = RARITY_DEFS[item.rarity];
    const isEquipped = equippedItems[item.slot] === item.id;
    const score = itemScore(item);
    const fmt1 = v => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const starF = 1 + (item.stars || 0) * STAR_PCT / 100;                   // forge stars multiply the item's effect
    const bonusText = sc => def.pct !== undefined
        ? '+' + fmt1(Math.min(item.slot === 'shield' ? 90 : Infinity, sc * RARITY_PCT_PER_SCORE * starF)) + ' % ' + def.desc
        : '+' + fmt1(sc * RARITY_FLAT_PER_SCORE * starF) + ' ' + def.desc;

    chestItemIconBig.dataset.r = rd.key;
    chestItemIconBig.innerHTML = icon(def.icon);
    chestItemOverline.innerHTML = '<span class="rar-text" data-r="' + rd.key + '">' + rd.label + '</span> · ' + def.name;
    chestItemTitle.textContent = def.name;
    chestItemSub.textContent = 'Stufe ' + item.level + ' / ' + ITEM_MAX_LEVEL + (item.stars ? ' · ' + item.stars + (item.stars === 1 ? ' Stern' : ' Sterne') : '') + (isEquipped ? ' · ausgerüstet' : '');
    const cost = itemLevelUpCost(item);
    const maxed = item.level >= ITEM_MAX_LEVEL;
    chestItemStats.innerHTML =
        '<div><span>' + icon(def.icon) + 'Bonus</span><b class="up">' + bonusText(score) + '</b></div>' +
        (item.stars ? '<div><span>' + icon(def.icon) + 'Grundwert</span><b>+' + fmt1(score * RARITY_PCT_PER_SCORE) + ' %</b></div>' +
                      '<div><span>' + icon('star') + item.stars + (item.stars === 1 ? ' Stern' : ' Sterne') + ' (Grundwert ×' + fmt1(starF).replace(',0', '') + ')</span><b class="up">+' + fmt1(score * RARITY_PCT_PER_SCORE * (starF - 1)) + ' %</b></div>' : '') +
        (isEquipped ? '' : '<div><span>' + icon('info') + 'Status</span><b>wirkt, sobald ausgerüstet</b></div>') +
        (maxed ? '' : '<div><span>' + icon('upgrade') + 'Nächste Stufe</span><b>' + bonusText(itemScore({ ...item, level: item.level + 1 })) + '</b></div>') +
        '<div><span>' + icon('points') + 'Verkaufswert</span><b>' + fmtNum(score) + (score === 1 ? ' Punkt' : ' Punkte') + '</b></div>';

    setBtnLabel(chestItemUpgradeBtn, maxed ? 'Max. Stufe' : 'Verbessern');
    const upgradeCostEl = chestItemUpgradeBtn.querySelector('.cost');
    upgradeCostEl.hidden = maxed;
    upgradeCostEl.querySelector('b').textContent = fmtNum(cost);
    chestItemUpgradeBtn.disabled = maxed || upgradePoints < cost;
    chestItemEquipBtn.style.display = isEquipped ? 'none' : 'inline-block';
    chestItemUnequipBtn.style.display = isEquipped ? 'inline-block' : 'none';
    chestItemSellBtn.disabled = isEquipped;
}

chestItemUpgradeBtn.addEventListener('click', () => {
    if (chestDetailItemId === null) return;
    levelUpItem(chestDetailItemId);
    renderChestItemPopup();
    renderChestEquipment();
});
chestItemEquipBtn.addEventListener('click', () => {
    if (chestDetailItemId === null) return;
    equipInventoryItem(chestDetailItemId);
    renderChestItemPopup();
    renderChestEquipment();
});
chestItemUnequipBtn.addEventListener('click', () => {
    const item = inventory[chestDetailItemId];
    if (!item || equippedItems[item.slot] !== chestDetailItemId) return;
    equippedItems[item.slot] = null;
    saveGame();
    saveProgression();
    updateHud();
    renderChestItemPopup();
    renderChestEquipment();
});
chestItemSellBtn.addEventListener('click', () => {
    if (chestDetailItemId === null) return;
    salvageItem(chestDetailItemId);
    closePanel(chestItemPopup);
    chestDetailItemId = null;
    renderChestEquipment();
});
chestItemCloseBtn.addEventListener('click', () => {
    closePanel(chestItemPopup);
    chestDetailItemId = null;
});

// Cross/plus arrangement (3 columns) matching the reference layout:
// speed on top, attack/troops/defense in the middle row, the two
// gold-on-kill skills bottom-left/right.
const SKILL_POSITIONS = {
    speed: { row: 1, col: 2 },
    attack: { row: 2, col: 1 },
    troops: { row: 2, col: 2 },
    defense: { row: 2, col: 3 },
    attackGold: { row: 3, col: 1 },
    defenseGold: { row: 3, col: 3 }
};
let selectedSkillKey = 'troops';
const skillDetail = document.getElementById('skillDetail');

// Skills zurücksetzen: every spent point comes back to be placed anew - for gems, and only after a second tap
const SKILL_RESET_GEMS = 500;
let skillResetArmed = false, skillResetTimer = null, skillResetAt = 0;
function resetSkills() {
    const spent = Object.keys(SKILL_DEFS).reduce((a, k) => a + (skills[k] || 0), 0); if (!spent) return;
    if (gems < SKILL_RESET_GEMS) { flashHint('Zu wenig Gems: Zurücksetzen kostet ' + SKILL_RESET_GEMS + ' Gems.', 3000); return; }
    if (skillResetArmed && Date.now() - skillResetAt < 450) return;   // ein Doppel-Tipp ist keine Bestätigung (500 Gems)
    if (!skillResetArmed) { skillResetArmed = true; skillResetAt = Date.now(); clearTimeout(skillResetTimer); skillResetTimer = setTimeout(() => { skillResetArmed = false; renderSkillGrid(); }, 4000); renderSkillGrid(); return; }
    skillResetArmed = false; clearTimeout(skillResetTimer);
    gems -= SKILL_RESET_GEMS; skillPoints += spent; for (const k of Object.keys(SKILL_DEFS)) skills[k] = 0;
    saveProgression(); saveGame(); updateHud(); renderSkillGrid();
    flashHint('Skills zurückgesetzt: ' + fmtNum(spent) + ' Skillpunkte sind wieder frei.', 3500);
}
function renderSkillGrid() {
    const spentPts = Object.keys(SKILL_DEFS).reduce((a, k) => a + (skills[k] || 0), 0);
    skillPointsLine.innerHTML = icon('star') + '<span>Verfügbare Skillpunkte</span><b>' + fmtNum(skillPoints) + '</b>' +
        (spentPts ? '<button type="button" class="skill-reset' + (skillResetArmed ? ' is-armed' : '') + '" data-skillreset>' + (skillResetArmed ? 'Wirklich? ' + icon('gem') + SKILL_RESET_GEMS : icon('recall') + 'Zurücksetzen') + '</button>' : '');
    const rb = skillPointsLine.querySelector('[data-skillreset]'); if (rb) rb.addEventListener('click', resetSkills);

    const def = SKILL_DEFS[selectedSkillKey];
    const level = skills[selectedSkillKey];
    skillDetail.dataset.skill = selectedSkillKey;
    skillDetail.innerHTML =
        '<div class="icon-box">' + icon(def.icon) + '</div>' +
        '<div class="info"><b>' + def.name + '</b>' +
        'Stufe ' + level + '<br>' + def.desc + ': ' + skillBonusText(def, level) + '</div>';
    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'btn btn--primary btn--sm';
    detailBtn.innerHTML = icon('plus') + '<span>1</span>';
    detailBtn.setAttribute('aria-label', 'Skillpunkt vergeben');
    detailBtn.title = 'Skillpunkt vergeben';
    const atMax = def.max && level >= def.max;
    if (atMax) detailBtn.innerHTML = '<span>Max.</span>';
    detailBtn.disabled = skillPoints <= 0 || atMax;
    detailBtn.addEventListener('click', () => {
        if (skillPoints <= 0 || atMax) return;
        skillPoints -= 1;
        skills[selectedSkillKey] += 1;
        saveProgression();
        renderSkillGrid();
    });
    skillDetail.appendChild(detailBtn);

    skillGrid.innerHTML = '';
    for (const key of Object.keys(SKILL_DEFS)) {
        const skillInfo = SKILL_DEFS[key];
        const skillLevel = skills[key];
        const pos = SKILL_POSITIONS[key];

        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'skillNode';
        node.dataset.skill = key;
        node.dataset.level = skillLevel;
        node.title = skillInfo.name + ' – Stufe ' + skillLevel;
        node.style.gridColumn = pos.col;
        node.style.gridRow = pos.row;
        node.classList.toggle('selected', key === selectedSkillKey);
        node.innerHTML =
            '<div class="nIcon">' + icon(skillInfo.icon) + '</div>' +
            '<div class="nLevel">' + skillLevel + '</div>';
        node.addEventListener('click', () => {
            selectedSkillKey = key;
            renderSkillGrid();
        });
        skillGrid.appendChild(node);
    }
}

const profileTabs = {
    info: { btn: document.getElementById('tabBtnInfo'), panel: document.getElementById('tabInfo') },
    equip: { btn: document.getElementById('tabBtnEquip'), panel: document.getElementById('tabEquip') },
    skills: { btn: document.getElementById('tabBtnSkills'), panel: document.getElementById('tabSkills') },
    set: { btn: document.getElementById('tabBtnSet'), panel: document.getElementById('tabSet') }   // Einstellungen
};
function showProfileTab(name) {
    profilePopup.dataset.tab = name;
    for (const key of Object.keys(profileTabs)) {
        const isActive = key === name;
        profileTabs[key].btn.classList.toggle('active', isActive);
        profileTabs[key].btn.setAttribute('aria-selected', isActive);
        profileTabs[key].panel.classList.toggle('active', isActive);
    }
    if (name === 'equip') { renderEquipGrid(); renderChestEquipment(); }
    if (name === 'skills') renderSkillGrid();
    if (name === 'set') einstellungenZeigen(); else document.getElementById('setPwForm').hidden = true;
    profilePopup.querySelector('.pbody').scrollTop = 0;
}
profileTabs.info.btn.addEventListener('click', () => showProfileTab('info'));
profileTabs.equip.btn.addEventListener('click', () => showProfileTab('equip'));
profileTabs.skills.btn.addEventListener('click', () => showProfileTab('skills'));
profileTabs.set.btn.addEventListener('click', () => showProfileTab('set'));
document.getElementById('tabBtnRank').addEventListener('click', () => openRankings());   // the Rangliste has its own sheet

