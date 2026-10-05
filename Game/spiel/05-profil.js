// ===== Teil 05-profil.js: Titel & Rahmen, Profil, Truhe/Ausrüstung, Skills, Erfolge, Profil antippen, Rangliste, Märsche-Liste, Kampfbericht =====
// ===== TITEL & RAHMEN: only to buy (Gems or Thron-Punkte) - what you had by rank or Erfolg before stays yours (lookMigrate) =====
const FRAMES = [
    { id: 'bronze', name: 'Bronze', rank: 0, gems: 0 }, { id: 'silver', name: 'Silber', rank: 1, gems: 200 }, { id: 'gold', name: 'Gold', rank: 2, gems: 400 }, { id: 'platin', name: 'Platin', rank: 3, gems: 700 },
    { id: 'diamond', name: 'Diamant', rank: 4, gems: 1000 }, { id: 'master', name: 'Meister', rank: 5, gems: 1500 }, { id: 'legend', name: 'Legende', rank: 6, gems: 2500 },
    { id: 'throne', name: 'Thron', buy: 'throne', tp: 3000 },
    { id: 'saison', name: 'Saisonkrone', buy: 'pass' }                     // only from the Saison-Pass (premium, level 40)
];
const TITLES_P = [                                  // rank / ach: only for the old save (lookMigrate), nothing unlocks by it any more
    { id: 'novice', name: 'Neuling', gems: 0 },
    { id: 'knight', name: 'Silberritter', rank: 1, gems: 200 }, { id: 'lord', name: 'Goldfürst', rank: 2, gems: 400 }, { id: 'count', name: 'Platingraf', rank: 3, gems: 700 },
    { id: 'duke', name: 'Diamantherzog', rank: 4, gems: 1000 }, { id: 'master', name: 'Meister der Meere', rank: 5, gems: 1500 }, { id: 'legend', name: 'Legende', rank: 6, gems: 2500 },
    { id: 'conq', name: 'Eroberer', ach: 'cap100', gems: 500 }, { id: 'warlord', name: 'Kriegsherr', ach: 'cap1000', gems: 1200 }, { id: 'wall', name: 'Standhaft', ach: 'def25', gems: 400 },
    { id: 'emma', name: 'Gefürchtet', ach: 'emma10', gems: 600 }, { id: 'slayer', name: 'Bezwinger', ach: 'boss1', gems: 600 }, { id: 'builder', name: 'Baumeister', ach: 'city5', gems: 500 },
    { id: 'king', name: 'Herrscher der Meere', ach: 'throne', tp: 2500 }, { id: 'keeper', name: 'Thronhüter', buy: 'throne', tp: 3000 }
];
// Saison-Titel (Ende einer Welt-Saison, die besten 10 – für immer, nie zu kaufen): Kennung s<Saison>p<Platz>
function saisonTitel(id) { const m = /^s(\d{1,4})p(\d{1,2})$/.exec(String(id || '')); if (!m) return null; const n = +m[1], pl = +m[2];
    return { id: m[0], name: pl === 1 ? 'Champion Saison ' + n : 'Saison ' + n + ' · Platz ' + pl, saison: n, platz: pl }; }
const titelDef = id => TITLES_P.find(t => t.id === id) || saisonTitel(id);
const saisonTitelBest = l => (l || []).map(saisonTitel).filter(Boolean).sort((a, b) => a.platz - b.platz || b.saison - a.saison)[0] || null;
function saisonTitelGeben(id) { if (!saisonTitel(id)) return; look.titles = [...new Set([...(look.titles || []), id])]; look.title = id; saveLook(); try { renderLook(); } catch (e) {} }   // (gleich angelegt)
// Marsch-Skins: how your columns look on the map - flag colour (with your crest on it) and a trail behind them
const MARCH_SKINS = [
    { id: 'standard', name: 'Standard', gems: 0, flag: '#e9dfc6' },
    { id: 'purpur', name: 'Purpur', gems: 400, flag: '#9a2f55' },
    { id: 'meer', name: 'Meeresgischt', gems: 800, flag: '#2f7fb8', trail: '#c8f2ff', fx: 'foam' },
    { id: 'wald', name: 'Waldläufer', gems: 800, flag: '#3f7a3a', trail: '#a6dc6a', fx: 'leaf' },
    { id: 'glut', name: 'Glutmarsch', gems: 1500, flag: '#b8441c', trail: '#ffa23a', fx: 'ember' },
    { id: 'gold', name: 'Goldzug', tp: 2000, flag: '#d8a93a', trail: '#ffe38a', fx: 'spark' },
    { id: 'schatten', name: 'Schattenzug', tp: 3500, flag: '#3a2a55', trail: '#b98cf0', fx: 'smoke' },
    { id: 'saison', name: 'Saisonzug', buy: 'pass', flag: '#1f8a8a', trail: '#8ff5e6', fx: 'spark' }   // only from the Saison-Pass (premium, level 20)
];
// Basis-Skins: the Baustil of all your bases (baukunst.js) - Klassisch is free, the style you chose before stays yours
const BAUSTIL_PRICE = { klassisch: { gems: 0 }, nordisch: { gems: 400 }, suedlich: { gems: 400 }, morgenland: { gems: 700 }, fernost: { tp: 1500 } };
let look = (() => { try { return JSON.parse(store.get('openWaterLook')) || {}; } catch (e) { return {}; } })();
// Ring-Skins: a ring round all your bases, only to buy - with Gems (Händler) or Thron-Punkte (Thron-Shop). A title from the middle goes over it.
const RING_SKINS = [
    { id: 'bronze', name: 'Bronze', gems: 300, c0: '#d6965f', c1: 'rgba(214,150,96,.45)' },
    { id: 'silver', name: 'Silber', gems: 600, c0: '#dee6f0', c1: 'rgba(222,230,240,.45)' },
    { id: 'jade', name: 'Jade', gems: 1000, c0: '#4fd39a', c1: 'rgba(150,240,200,.5)', n: 12 },
    { id: 'midnight', name: 'Mitternacht', gems: 1500, c0: '#7d86ff', c1: 'rgba(200,180,255,.55)', n: 16 },
    { id: 'star', name: 'Sternenlicht', tp: 2500, c0: '#eaf4ff', c1: 'rgba(130,185,255,.7)', n: 20, spin: 1 },
    { id: 'ember', name: 'Glut', tp: 4000, c0: '#ff8a3a', c1: 'rgba(255,200,90,.6)', n: 20, pulse: 1 }
];
for (const r of RING_SKINS) r.k = 'skin';
const ringSkinDef = id => RING_SKINS.find(r => r.id === id) || null;
function ringSkinsOf(who) { if (who === 'player') return look.rings || []; const b = loadBotState()[who]; return (b && b.rings) || []; }
function ringSkinOf(who) { const id = who === 'player' ? look.ring : (loadBotState()[who] || {}).ring; return id && ringSkinsOf(who).includes(id) ? ringSkinDef(id) : null; }
function ringGive(who, id) {                     // someone gets a Ring-Skin and puts it on
    if (who === 'player') { look.rings = [...new Set([...(look.rings || []), id])]; look.ring = id; store.set('openWaterLook', JSON.stringify(look)); }
    else { const b = loadBotState()[who]; if (!b) return; b.rings = [...new Set([...(b.rings || []), id])]; b.ring = id; saveBotState(); }
    ringVer++; requestRender();
}
if (!look.ringMig) { let L = 0; for (const id of ownedIslands) L = Math.max(L, islandLevels[id] || 1);   // rings no longer come with the level: what you wore stays yours as a skin
    look.rings = [...new Set([...(look.rings || []), ...(L >= 10 ? ['bronze'] : []), ...(L >= 25 ? ['silver'] : [])])]; look.ringMig = 1; store.set('openWaterLook', JSON.stringify(look)); }
function ringCardsHtml(list, pick) {             // pick: choose / buy (the Aussehen sheet), else buy only
    const own = ringSkinsOf('player'), cur = ringSkinOf('player');
    return '<div class="ring-grid">' + (pick ? '<button type="button" class="ring-card' + (cur ? '' : ' on') + '" data-ring=""><i class="ring-prev is-none"></i><b>Kein Ring</b><small>' + (cur ? 'Anlegen' : icon('check') + 'Angelegt') + '</small></button>' : '') +
        list.map(r => { const has = own.includes(r.id), on = cur && cur.id === r.id;
            return '<button type="button" class="ring-card' + (on ? ' on' : '') + (has ? '' : ' is-shop') + '" data-ring="' + r.id + '"><i class="ring-prev" style="--c:' + r.c0 + ';--c2:' + r.c1 + '"></i><b>' + r.name + '</b><small>' +
                (on ? icon('check') + 'Angelegt' : has ? (pick ? 'Anlegen' : 'Gehört dir') : lkPrice(r)) + '</small></button>'; }).join('') + '</div>';
}
document.addEventListener('click', e => {
    const b = e.target.closest('[data-ring]'); if (!b) return;
    const id = b.dataset.ring, r = ringSkinDef(id), inShop = !!b.closest('#shopPopup');
    if (!id) { look.ring = ''; store.set('openWaterLook', JSON.stringify(look)); ringVer++; requestRender(); }
    else if (ringSkinsOf('player').includes(id)) { if (inShop) return; look.ring = id; store.set('openWaterLook', JSON.stringify(look)); ringVer++; requestRender(); flashHint('Ring „' + r.name + '“ angelegt' + (titleOf('player') || rulerOwner() === 'player' ? ' – solange du einen Titel trägst, siehst du den Titel-Ring.' : '.'), 3000); }
    else if (r.tp) { throneBuy('ring_' + id); if (!ringSkinsOf('player').includes(id)) return; }
    else { if (gems < r.gems) { flashHint('Zu wenig Gems – Ring „' + r.name + '“ kostet ' + fmtNum(r.gems) + '.', 2500); return; }
        gems -= r.gems; ringGive('player', id); updateHud(); saveGame(); sfx('coin'); flashHint('Ring „' + r.name + '“ gekauft und angelegt.', 2500); }
    if (isPanelOpen(shopPopup)) renderShop();
    if (cityOpenId === '_keep') renderKeepSheet();
    renderLookSheet();
});
function rankIndexFor(bases) { let r = 0; RANK_TIERS.forEach((t, i) => { if (bases >= t.min) r = i; }); return r; }
function bestRank() { const r = rankIndexFor(ownedIslands.size); if (!(look.best >= r)) { look.best = r; store.set('openWaterLook', JSON.stringify(look)); } return look.best; }
function lookOldUnlocked(x) {                       // the old rule (rank / Erfolg) - only to carry an old save over
    if (x.buy) return !!(look.bought && look.bought[x.buy]);
    if (x.ach) { try { return achLookKept(x.ach) || !!(achClaimed[x.ach] || ACHIEVEMENTS.find(a => a.id === x.ach && a.val() >= a.goal)); } catch (e) { return false; } }
    return (x.rank || 0) <= bestRank();
}
function lookMigrate() {                            // once: everything unlocked so far becomes owned, from now on looks are only bought
    if (look.lookMig) return; look.frames = [...new Set([...(look.frames || []), ...FRAMES.filter(lookOldUnlocked).map(f => f.id)])];
    look.titles = [...new Set([...(look.titles || []), ...TITLES_P.filter(lookOldUnlocked).map(t => t.id)])]; look.lookMig = 1; saveLook();
}
function saveLook() { store.set('openWaterLook', JSON.stringify(look)); }
const lookOwns = (k, x) => x.gems === 0 || (look[k] || []).includes(x.id) || !!(x.buy && look.bought && look.bought[x.buy]) || (!look.lookMig && lookOldUnlocked(x));   // k: 'frames' | 'titles'
function playerFrame() { const f = FRAMES.find(q => q.id === look.frame); return f && lookOwns('frames', f) ? f.id : [...FRAMES].reverse().find(q => !q.buy && lookOwns('frames', q)).id; }
function playerTitle() { const t = titelDef(look.title); return t && lookOwns('titles', t) ? t.name : 'Neuling'; }
function marchSkinOf(who) { const id = who === 'player' ? look.march : who ? (loadBotState()[who] || {}).march : ''; return MARCH_SKINS.find(m => m.id === id) || MARCH_SKINS[0]; }
function renderLook() {                             // the profile header and its "Aussehen" line; choosing happens in the Aussehen sheet
    const fr = playerFrame();
    document.getElementById('pAvatarRing').dataset.frame = fr;
    document.getElementById('profileTitle').textContent = playerTitle();
    const cur = document.getElementById('lookNow');     // die eine Aussehen-Karte im Profil (Wappen + was du trägst)
    if (cur) cur.innerHTML = '<b>Aussehen · ' + escapeHtml(playerTitle()) + '</b><small>Wappen · Rahmen ' + (FRAMES.find(f => f.id === fr) || FRAMES[0]).name + ' · ' + BAUSTILE[loadBaustil().style] + ' · Marsch ' + marchSkinOf('player').name + '</small>';
    renderLookSheet();
}
function currentRank() {
    let rank = RANK_TIERS[0].name;
    for (const tier of RANK_TIERS) {
        if (ownedIslands.size >= tier.min) rank = tier.name;
    }
    return rank;
}
function renderCrestCard() {
    const cv = document.getElementById('crestSmall'); if (!cv) return; const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 112, 112); drawCrest(g, 56, 57, 96);
}
document.getElementById('crestCard').addEventListener('click', () => openLookSheet());   // Aussehen: nur von hier (Profil → Spieler)
function renderCrestEditor() {
    renderCrestCard();
    const c = loadCrest(), el = document.getElementById('crestOpts'); if (!el || document.getElementById('crestPage').hidden) return;
    const pv = document.getElementById('crestPreview'), pg = pv.getContext('2d'); pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, 176, 176); drawCrest(pg, 88, 90, 150);
    const mini = (patch) => { const cv = document.createElement('canvas'); cv.width = cv.height = 44; drawCrest(cv.getContext('2d'), 22, 23, 38, Object.assign({}, c, patch)); return cv; };
    const rows = [['Form', 'shape', CREST_SHAPES.length, i => ({ shape: i })], ['Teilung', 'div', CREST_DIVS.length, i => ({ div: i })],
                  ['Farbe 1', 'c1', CREST_COLORS.length, null], ['Farbe 2', 'c2', CREST_COLORS.length, null],
                  ['Zeichen', 'sym', CREST_SYMBOLS.length, i => ({ sym: i })], ['Zeichenfarbe', 'ink', CREST_INK.length, null]];
    el.innerHTML = '';
    for (const [label, key, n, fn] of rows) {
        const row = document.createElement('div'); row.className = 'crest-row'; row.innerHTML = '<span>' + label + '</span>';
        for (let i = 0; i < n; i++) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = c[key] === i ? 'on' : ''; bt.title = label + ' ' + (i + 1);
            if (fn) bt.appendChild(mini(fn(i))); else { const sw = document.createElement('i'); sw.className = 'sw'; sw.style.background = (key === 'ink' ? CREST_INK : CREST_COLORS)[i]; bt.appendChild(sw); }
            bt.addEventListener('click', () => { c[key] = i; store.set('openWaterCrest', JSON.stringify(c)); crestUrlCache = {}; marchFlagCache.clear(); flushBannerSprites(); applyCrestAvatars(); renderCrestEditor(); renderLookTop(); requestRender(); });
            row.appendChild(bt); }
        el.appendChild(row);
    }
}
function applyCrestAvatars() {                    // HUD + profile header show the crest instead of the plain helmet
    for (const av of document.querySelectorAll('#hudPlayer .avatar, #pAvatarRing .avatar')) av.innerHTML = '<img alt="" src="' + crestDataUrl(64) + '">';
}
applyCrestAvatars();
function renderProfile(live) {                  // live = the per-second refresh: numbers only, the editor and pickers stay put
    if (!live) renderCrestEditor();
    const home = islandById[playerIslandId];
    const homeLandmass = landmasses.find(lm => lm.id === home.landmassId);
    const homeLabel = homeLandmass
        ? 'Insel ' + (homeLandmass.id + 1) + ' · Turm #' + (home.id + 1)
        : 'Turm #' + (home.id + 1);

    setText(document.getElementById('profileLevelBadge'), playerLvl);      // (live: jede Sekunde aus liveTick – geschrieben wird nur, was sich ändert)
    setText(document.getElementById('profileRank'), currentRank());
    if (!live) renderLook();
    const worldPct = ownedIslands.size / islands.length * 100;
    setText(document.getElementById('profileProgress'), worldPct > 0 && worldPct < 0.1
        ? '< 0,1 %'
        : worldPct.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %');

    // XP sits in the profile header, always visible.
    const xpNeeded = xpNeededForLevel(playerLvl);
    setText(document.getElementById('xpLevelNum'), playerLvl);
    setText(document.getElementById('xpNums'), fmtNum(playerXp) + ' / ' + fmtNum(xpNeeded) + ' XP');
    document.getElementById('xpFill').style.width = Math.min(100, Math.round(playerXp / xpNeeded * 100)) + '%';
    liveHtml(document.getElementById('xpNext'), 'Stufe ' + (playerLvl + 1) + ': ' + levelRewardText(playerLvl + 1));

    const troops = totalTroops();
    const kTroopsEl = document.getElementById('kTroops');
    setText(kTroopsEl, fmtCompact(troops));
    kTroopsEl.title = fmtNum(troops) + ' Truppen';
    setText(document.getElementById('kBases'), fmtNum(ownedIslands.size) + ' / ' + fmtNum(islands.length));
    const kCoinsEl = document.getElementById('kCoins');
    setText(kCoinsEl, fmtCompact(Math.floor(coins)));
    kCoinsEl.title = fmtNum(Math.floor(coins)) + ' Münzen';
    setText(document.getElementById('kTroopsRate'),
        '+' + fmtNum(Math.round(totalTroopProductionPerTick())));
    setText(document.getElementById('kCoinsRate'),
        '+' + fmtNum(Math.round(totalCoinProductionPerTick())));

    const progressPct = Math.round(ownedIslands.size / islands.length * 100);
    const avatarRing = document.getElementById('pAvatarRing');
    if (avatarRing) avatarRing.style.setProperty('--progress', progressPct);

    const activeCount = playerRelevantAttackCount() + playerRelevantSendCount() + pendingScouts.length + pendingRetreats.length;
    liveHtml(profileStats,
        '<div class="statRow"><span>' + icon('star') + 'Skillpunkte</span><b>' + fmtNum(skillPoints) + '</b></div>' +
        '<div class="statRow"><span>' + icon('gem') + 'Gems</span><b>' + fmtTile(Math.floor(gems)) + '</b></div>' +
        (activeCount > 0 ? '<div class="statRow"><span>' + icon('hourglass') + 'Unterwegs</span><b>' + fmtNum(activeCount) + '</b></div>' : '') +
        '<div class="statRow"><span>' + icon('home') + 'Heimat</span><b>' + homeLabel + '</b></div>');
    updateHudPlayer();
}

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

// ===== ERFOLGE: badges for what you've done, each with gems to collect (only gems - the look is bought, not earned) =====
let playerStats = (() => { try { return JSON.parse(store.get('openWaterStats')) || {}; } catch (e) { return {}; } })();
if (!playerStats.seeded) { playerStats.captures = Math.max(playerStats.captures || 0, Math.max(0, ownedIslands.size - 1)); playerStats.seeded = 1; store.set('openWaterStats', JSON.stringify(playerStats)); }   // an existing empire: its bases count as conquered
let achClaimed = (() => { try { return JSON.parse(store.get('openWaterAch')) || {}; } catch (e) { return {}; } })();
// Kriegsbericht: what happened each day, kept for a week (the Willkommen-zurück summary covers the time away)
let warDays = (() => { try { return JSON.parse(store.get('openWaterWarDays')) || {}; } catch (e) { return {}; } })();
function warStat(k, n, foe) {
    const d = todayKey(), w = warDays[d] || (warDays[d] = { by: {} });
    w[k] = (w[k] || 0) + (n === undefined ? 1 : n);
    if (foe) w.by[foe] = (w.by[foe] || 0) + 1;
    const keys = Object.keys(warDays).sort(); while (keys.length > 8) delete warDays[keys.shift()];
    store.set('openWaterWarDays', JSON.stringify(warDays));
}
function statBump(k, n) { playerStats[k] = (playerStats[k] || 0) + (n || 1); store.set('openWaterStats', JSON.stringify(playerStats)); achCheckSoon(); passBump(k, n); }
function goalBump(who, k, n) { if (!who) return; if (who === 'player') { try { statBump(k, n); } catch (e) {} } else if (botById[who]) botStat(who, k, n); }   // a counter for the Erfolge - yours or anyone else's
const achStat = k => playerStats[k] || 0;
const cityMinLevel = () => { const c = loadCity(); return Math.min(...CITY_BUILDINGS.filter(b => !['embassy', 'market'].includes(b.id)).map(b => c.levels[b.id] || 0)); };   // (the newer Lager doesn't count: nothing earned is lost)
const pvpWins = () => achStat('pvpWins') + achStat('emmaWins');   // (old saves counted only one player in emmaWins, frozen now - the two never overlap; ids stay so claims are kept)
// the same numbers for everyone (the other players' side: botGoalVal in botlogik.js)
const whoIslands = who => who === 'player' ? ownedIslands : botOwnedIslands[who] || new Set();
function goalBaseTop(who) { let L = 0; for (const id of whoIslands(who)) L = Math.max(L, islandLevels[id] || 1); return L; }
function goalGates(who) { let n = 0; for (const id of whoIslands(who)) if (islandById[id] && islandById[id].type === 'gate') n++; return n; }
const goalHeroes = who => HEROES.filter(h => heroOwned(who, h.id)).length;
const goalHeroStars = who => Math.floor(Math.max(0, ...HEROES.map(h => { const s = heroSt(who, h.id); return s && s.own ? s.q : 0; })) / 4);   // the best hero's whole stars
const GOAL_VAL = {
    captures: () => achStat('captures'), empire: () => ownedIslands.size, defends: () => achStat('defends'), pvp: pvpWins, bosses: () => achStat('bosses'),
    temples: () => achStat('temples'), throne: () => achStat('throne'), throneMin: () => achStat('throneMin'), throneEarned: () => throneState.earned || 0, scouts: () => achStat('scouts'),
    cityMin: cityMinLevel, baseTop: () => goalBaseTop('player'), gates: () => goalGates('player'), tolls: () => achStat('tolls'), tollCoins: () => achStat('tollCoins'),
    armyWins: () => achStat('armyWins'), heroes: () => goalHeroes('player'), heroStars: () => goalHeroStars('player'), heroFires: () => achStat('heroFires'),
    healed: () => achStat('healed'), shields: () => achStat('shields'), teleports: () => achStat('teleports'), barb: () => achStat('barb'), dboss: () => achStat('dboss')
};
const ACHIEVEMENTS = [   // the old ids stay (claims are kept); the tiers of one kind share k
    { id: 'cap1',    name: 'Erste Eroberung',  icon: 'flag',    desc: 'Erobere deine erste Basis.',             goal: 1,    k: 'captures', gems: 20 },
    { id: 'cap10',   name: 'Landnahme',        icon: 'flag',    desc: 'Erobere 10 Basen.',                      goal: 10,   k: 'captures', gems: 50 },
    { id: 'cap100',  name: 'Eroberer',         icon: 'flag',    desc: 'Erobere 100 Basen.',                     goal: 100,  k: 'captures', gems: 300 },
    { id: 'cap500',  name: 'Feldherr',         icon: 'flag',    desc: 'Erobere 500 Basen.',                     goal: 500,  k: 'captures', gems: 600 },
    { id: 'cap1000', name: 'Kriegsherr',       icon: 'flag',    desc: 'Erobere 1.000 Basen.',                   goal: 1000, k: 'captures', gems: 1500 },
    { id: 'emp50',   name: 'Weites Reich',     icon: 'home',    desc: 'Halte 50 Basen gleichzeitig.',           goal: 50,   k: 'empire', gems: 300 },
    { id: 'emp150',  name: 'Großreich',        icon: 'home',    desc: 'Halte 150 Basen gleichzeitig.',          goal: 150,  k: 'empire', gems: 800 },
    { id: 'def25',   name: 'Standhaft',        icon: 'shield',  desc: 'Wehre 25 Angriffe ab.',                  goal: 25,   k: 'defends', gems: 250 },
    { id: 'def100',  name: 'Unbezwingbar',     icon: 'shield',  desc: 'Wehre 100 Angriffe ab.',                 goal: 100,  k: 'defends', gems: 500 },
    { id: 'emma1',   name: 'Kräftemessen',     icon: 'attack',  desc: 'Erobere eine Basis eines anderen Spielers.', goal: 1,  k: 'pvp', gems: 100 },
    { id: 'emma10',  name: 'Gefürchtet',       icon: 'attack',  desc: 'Erobere 10 Basen von anderen Spielern.', goal: 10,   k: 'pvp', gems: 500 },
    { id: 'pvp50',   name: 'Schrecken der Meere', icon: 'attack', desc: 'Erobere 50 Basen von anderen Spielern.', goal: 50, k: 'pvp', gems: 1000 },
    { id: 'boss1',   name: 'Bezwinger',        icon: 'attack',  desc: 'Besiege den Kriegsherrn (Wanderboss).', goal: 1,   k: 'bosses', gems: 250 },
    { id: 'boss10',  name: 'Bossjäger',        icon: 'attack',  desc: 'Besiege 10-mal den Kriegsherrn.',        goal: 10,   k: 'bosses', gems: 500 },
    { id: 'temple1', name: 'Tempelherr',       icon: 'temple',  desc: 'Erobere einen Tempel.',                  goal: 1,    k: 'temples', gems: 100 },
    { id: 'temple10', name: 'Tempelwächter',   icon: 'temple',  desc: 'Erobere 10 Tempel.',                     goal: 10,   k: 'temples', gems: 300 },
    { id: 'throne',  name: 'Herrscher der Meere', icon: 'crown', desc: 'Halte den Thron in der Mitte.',        goal: 1,    k: 'throne', gems: 1500 },
    { id: 'thr60',   name: 'Thronwache',       icon: 'crown',   desc: 'Halte den Thron 60 Minuten lang.',       goal: 60,   k: 'throneMin', gems: 200 },
    { id: 'thr600',  name: 'Langer Atem',      icon: 'crown',   desc: 'Halte den Thron 10 Stunden lang.',       goal: 600,  k: 'throneMin', gems: 700 },
    { id: 'tp1k',    name: 'Thron-Sammler',    icon: 'points',  desc: 'Verdiene 1.000 Thron-Punkte.',           goal: 1000, k: 'throneEarned', gems: 100 },
    { id: 'tp10k',   name: 'Thron-Schatz',     icon: 'points',  desc: 'Verdiene 10.000 Thron-Punkte.',          goal: 10000, k: 'throneEarned', gems: 500 },
    { id: 'scout50', name: 'Späher',           icon: 'scout',   desc: 'Späh 50 Mal.',                           goal: 50,   k: 'scouts', gems: 50 },
    { id: 'scout250', name: 'Kundschafter',    icon: 'scout',   desc: 'Späh 250 Mal.',                          goal: 250,  k: 'scouts', gems: 200 },
    { id: 'city5',   name: 'Baumeister',       icon: 'upgrade', desc: 'Bring alle Gebäude der Stadt auf Stufe 5.', goal: 5, k: 'cityMin', gems: 400 },
    { id: 'base25',  name: 'Festung',          icon: 'castle',  desc: 'Bau eine Basis auf Stufe 25 aus.',       goal: 25,   k: 'baseTop', gems: 100 },
    { id: 'base50',  name: 'Bollwerk',         icon: 'castle',  desc: 'Bau eine Basis auf Stufe 50 aus.',       goal: 50,   k: 'baseTop', gems: 300 },
    { id: 'base100', name: 'Himmelsfeste',     icon: 'castle',  desc: 'Bau eine Basis auf Stufe 100 aus.',      goal: 100,  k: 'baseTop', gems: 1000 },
    { id: 'gate1',   name: 'Torhüter',         icon: 'lock',    desc: 'Halte ein Tor.',                         goal: 1,    k: 'gates', gems: 50 },
    { id: 'gate3',   name: 'Herr der Brücken', icon: 'lock',    desc: 'Halte 3 Tore gleichzeitig.',             goal: 3,    k: 'gates', gems: 250 },
    { id: 'toll10',  name: 'Brückengänger',    icon: 'coin',    desc: 'Zahl 10 Mal Maut an einem Tor.',         goal: 10,   k: 'tolls', gems: 40 },
    { id: 'tollin',  name: 'Zöllner',          icon: 'coin',    desc: 'Nimm 100.000 Münzen Maut ein.',          goal: 100000, k: 'tollCoins', gems: 300 },
    { id: 'army5',   name: 'Feldschlacht',     icon: 'troops',  desc: 'Gewinn 5 Kämpfe mit Armeen im Feld.',    goal: 5,    k: 'armyWins', gems: 80 },
    { id: 'army50',  name: 'Heerführer',       icon: 'troops',  desc: 'Gewinn 50 Kämpfe mit Armeen im Feld.',   goal: 50,   k: 'armyWins', gems: 400 },
    { id: 'hero1',   name: 'Erster Held',      icon: 'profile', desc: 'Schalte einen Helden frei.',             goal: 1,    k: 'heroes', gems: 30 },
    { id: 'hero4',   name: 'Heldenrunde',      icon: 'profile', desc: 'Schalte 4 Helden frei.',                 goal: 4,    k: 'heroes', gems: 150 },
    { id: 'heroall', name: 'Heldensaal',       icon: 'profile', desc: 'Schalte alle ' + HEROES.length + ' Helden frei.', goal: HEROES.length, k: 'heroes', gems: 800 },
    { id: 'star3',   name: 'Aufsteiger',       icon: 'star',    desc: 'Bring einen Helden auf 3 Sterne.',       goal: 3,    k: 'heroStars', gems: 150 },
    { id: 'star5',   name: 'Sternenheld',      icon: 'star',    desc: 'Bring einen Helden auf 5 Sterne.',       goal: 5,    k: 'heroStars', gems: 600 },
    { id: 'fire10',  name: 'Kampfrausch',      icon: 'level',   desc: 'Lass Helden 10 Mal ihre Fähigkeit zünden.', goal: 10, k: 'heroFires', gems: 80 },
    { id: 'fire100', name: 'Heldensturm',      icon: 'level',   desc: 'Lass Helden 100 Mal ihre Fähigkeit zünden.', goal: 100, k: 'heroFires', gems: 400 },
    { id: 'heal10k', name: 'Feldscher',        icon: 'plus',    desc: 'Heil 10.000 Verwundete im Krankenhaus.',    goal: 10000, k: 'healed', gems: 60 },
    { id: 'heal1m',  name: 'Heiler der Meere', icon: 'plus',    desc: 'Heil 1.000.000 Verwundete im Krankenhaus.', goal: 1000000, k: 'healed', gems: 500 },
    { id: 'shield1', name: 'Schutzschild',     icon: 'shield',  desc: 'Setz einen Friedensschild ein.',         goal: 1,    k: 'shields', gems: 20 },
    { id: 'shield10', name: 'Vorsichtig',      icon: 'shield',  desc: 'Setz 10 Friedensschilde ein.',           goal: 10,   k: 'shields', gems: 150 },
    { id: 'tele1',   name: 'Umzug',            icon: 'home',    desc: 'Verlege deine Hauptstadt.',              goal: 1,    k: 'teleports', gems: 30 },
    { id: 'tele10',  name: 'Nomade',           icon: 'home',    desc: 'Verlege deine Hauptstadt 10 Mal.',       goal: 10,   k: 'teleports', gems: 200 },
    { id: 'barb25',  name: 'Barbarenschreck',  icon: 'attack',  desc: 'Besiege 25 Barbaren-Lager.',             goal: 25,   k: 'barb', gems: 100 },
    { id: 'barb250', name: 'Lagerstürmer',     icon: 'attack',  desc: 'Besiege 250 Barbaren-Lager.',            goal: 250,  k: 'barb', gems: 500 },
    { id: 'dboss5',  name: 'Bossbrecher',      icon: 'crown',   desc: 'Kämpf bei 5 gefallenen Tagesbossen mit.', goal: 5,   k: 'dboss', gems: 300 },
];
for (const a of ACHIEVEMENTS) a.gems = Math.max(5, Math.round(a.gems / 25) * 5);   // (2.10.) 5× weniger Gems – zusammen vorher ~18.000, das gab Gold-Ausrüstung in Stunden
const achVal = a => GOAL_VAL[a.k]();
const achDone = a => achVal(a) >= a.goal;
function achClaimable() { return ACHIEVEMENTS.filter(a => !achClaimed[a.id] && achDone(a)); }
// Erfolge gave titles before: what you had reached then stays yours (noted once), nothing new comes from them
var achLookSet = null;
function achLookKept(id) { if (!achLookSet) { try { achLookSet = JSON.parse(store.get('openWaterAchLook')); } catch (e) {} } return !!(achLookSet ? achLookSet.includes(id) : achClaimed[id]); }
if (store.get('openWaterAchLook') === null) {                            // (the city is loaded later - Baumeister is checked on the first round below)
    achLookSet = [...new Set([...Object.keys(achClaimed), ...['cap100', 'cap1000', 'def25', 'emma10', 'boss1', 'throne'].filter(id => achDone(ACHIEVEMENTS.find(a => a.id === id)))])]; achLookSet.late = 1; }
const goalsPopup = document.getElementById('goalsPopup'); var goalsTab = 'daily', achReadyN = 0;   // Ziele: the daily tasks and the Erfolge in one sheet
let achKnown = null, achTimer = null;
function achCheckSoon() { clearTimeout(achTimer); achTimer = setTimeout(achCheck, 400); }
function achCheck() {                                                        // newly reached ones are announced once
    if (achLookSet && achLookSet.late) { delete achLookSet.late; if (achDone(ACHIEVEMENTS.find(a => a.id === 'city5')) && !achLookSet.includes('city5')) achLookSet.push('city5'); store.set('openWaterAchLook', JSON.stringify(achLookSet)); }
    const ready = achClaimable();
    if (achKnown === null) achKnown = new Set(ready.map(a => a.id));
    for (const a of ready) if (!achKnown.has(a.id)) { achKnown.add(a.id); flashHint('Erfolg erreicht: ' + a.name + ' – hol dir ' + a.gems + ' Gems unter „Events“ ab.', 4500); sfx('crown'); }
    updateGoalsBadge(ready.length);
    if (isPanelOpen(goalsPopup) && goalsTab === 'ach') renderAchievements();
}
setInterval(achCheck, 3000);
let achOpenDone = false;
function renderAchievements() {
    const got = ACHIEVEMENTS.filter(a => achClaimed[a.id]), left = ACHIEVEMENTS.reduce((s, a) => s + (achClaimed[a.id] ? 0 : a.gems), 0);
    liveHtml(document.getElementById('achSummary'), '<div class="ach-sum-t"><span><b>' + got.length + ' / ' + ACHIEVEMENTS.length + '</b> abgeholt</span><span class="ach-sum-gem">' + icon('gem') + fmtNum(left) + ' noch zu holen</span></div><div class="ach-sum-bar"><i style="width:' + Math.round(got.length / ACHIEVEMENTS.length * 100) + '%"></i></div>');
    const fam = {}; for (const a of ACHIEVEMENTS) (fam[a.k] = fam[a.k] || []).push(a);
    for (const k in fam) fam[k].sort((x, y) => x.goal - y.goal);
    const ready = achClaimable(), frac = a => Math.min(1, achVal(a) / a.goal);
    const going = Object.values(fam).map(l => l.find(a => !achClaimed[a.id] && !achDone(a))).filter(a => a && !fam[a.k].some(b => b.goal < a.goal && !achClaimed[b.id])).sort((x, y) => frac(y) - frac(x));   // one per kind: the next tier, once the ones below are collected
    const card = a => { const v = Math.min(a.goal, achVal(a)), ok = v >= a.goal, has = !!achClaimed[a.id], tiers = fam[a.k], ti = tiers.indexOf(a);
        return '<div class="ach' + (has ? ' is-got' : ok ? ' is-ready' : '') + '"><span class="ach-medal">' + icon(a.icon) + '</span>' +
            '<span class="ach-t"><b>' + a.name + (tiers.length > 1 ? '<i class="ach-tier" title="Stufe ' + (ti + 1) + ' von ' + tiers.length + '">' + tiers.map((t, i) => '<em class="' + (achClaimed[t.id] ? 'on' : i === ti ? 'cur' : '') + '"></em>').join('') + '</i>' : '') + '</b><small>' + a.desc + '</small>' +
            (has ? '' : '<span class="ach-bar"><i style="width:' + Math.round(v / a.goal * 100) + '%"></i></span><small class="ach-n">' + fmtNum(Math.floor(v)) + ' / ' + fmtNum(a.goal) + '</small>') + '</span>' +
            (has ? '<span class="ach-claim done">' + icon('check') + '</span>' : '<button class="ach-claim" type="button" data-ach="' + a.id + '"' + (ok ? '' : ' disabled') + '>' + icon('gem') + fmtNum(a.gems) + '</button>') + '</div>'; };
    liveHtml(document.getElementById('achList'),                  // (alle 3 s aus achCheck: neu geschrieben nur, was sich geändert hat)
        (ready.length ? '<div class="sect"><h4>Abholbereit</h4>' + (ready.length > 1 ? '<button class="btn btn--primary btn--sm ach-all" type="button" data-ach-all>' + icon('gem') + '<span>Alle · ' + fmtNum(ready.reduce((s, a) => s + a.gems, 0)) + '</span></button>' : '') + '</div>' + ready.map(card).join('') : '') +
        (going.length ? '<div class="sect"><h4>Im Gange</h4><span class="sect-aside">' + going.length + '</span></div>' + going.map(card).join('') : '') +
        (got.length ? '<details class="ach-done"' + (achOpenDone ? ' open' : '') + '><summary><span>Erledigt</span><em>' + got.length + '</em>' + icon('upgrade') + '</summary><div class="ach-list">' + got.slice().sort((x, y) => achClaimed[y.id] - achClaimed[x.id]).map(card).join('') + '</div></details>' : ''));
    if (isPanelOpen(goalsPopup)) renderGoalsSub();
}
function claimAch(a) {
    if (!a || achClaimed[a.id] || !achDone(a)) return 0;
    achClaimed[a.id] = Date.now(); store.set('openWaterAch', JSON.stringify(achClaimed)); gems += a.gems; saveGameNow(); return a.gems;   // (die Gems gleich mit sichern – nicht erst mit der nächsten Sicherung)
}
document.getElementById('achList').addEventListener('click', e => {
    if (e.target.closest('[data-ach-all]')) { const l = achClaimable(), n = l.reduce((s, a) => s + claimAch(a), 0); if (!n) return;
        saveProgression(); updateHud(); sfx('gem'); flashHint('+' + fmtNum(n) + ' Gems für ' + l.length + ' Erfolge.', 2500); renderAchievements(); achCheck(); return; }
    const b = e.target.closest('[data-ach]'); if (!b || b.disabled) return;
    const a = ACHIEVEMENTS.find(q => q.id === b.dataset.ach), n = claimAch(a); if (!n) return;
    saveProgression(); updateHud(); sfx('gem'); flashHint('+' + fmtNum(n) + ' Gems für „' + a.name + '“.', 2500);
    renderAchievements(); achCheck();
});
document.getElementById('achList').addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('ach-done')) achOpenDone = e.target.open; }, true);

// ===== PROFIL ANTIPPEN: every ruler's card - yours and everyone else's, the same way =====
const botIdByName = {}; for (const bd of BOT_DEFS) botIdByName[bd.name] = bd.id;
function whoTroops(who) {
    if (who !== 'player' && typeof nebelVomServer === 'function' && nebelVomServer()) { const b = loadBotState()[who]; if (b && b.tt >= 0) return b.tt; }   // 3B: fremde Truppen kennst du nicht alle – die Summe zählt der Weltrechner
    let n = 0; for (const id of (who === 'player' ? ownedIslands : botOwnedIslands[who] || [])) n += islandTroops[id] || 0; return n; }
function whoBases(who) { return who === 'player' ? ownedIslands.size : (botOwnedIslands[who] || new Set()).size; }
function whoProfile(who) {                       // the same facts for you and for anyone else
    const slots = Object.keys(EQUIPMENT_DEFS);
    if (who === 'player') {
        const c = loadCity();
        return { who, name: profileName.value || 'Du', lvl: playerLvl, frame: playerFrame(), title: playerTitle(), temple: titleOf('player'), bases: ownedIslands.size, troops: whoTroops('player'),
            items: slots.map(k => { const it = equippedItems[k] && inventory[equippedItems[k]]; return [k, it ? it.rarity : -1, it ? it.level : 0, it ? it.stars || 0 : 0]; }),
            heroes: HEROES.filter(x => heroOwned('player', x.id)).map(x => [x.id, heroSt('player', x.id).q, x.r]),
            skills: Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, skills[k] || 0])), city: Object.assign({}, c.levels), capital: playerIslandId, online: true };
    }
    const b = loadBotState()[who], bd = botById[who]; if (!b || !bd) return null; const lk = botLook(who);
    return { who, name: bd.name, lvl: b.lvl, frame: lk.frame, title: lk.title, temple: titleOf(who), bases: whoBases(who), troops: whoTroops(who),
        items: slots.map(k => { const it = botItem(b, k); return [k, it ? it.rarity : -1, it ? it.level : 0, it ? it.stars : 0]; }),
        heroes: HEROES.filter(x => heroOwned(who, x.id)).map(x => [x.id, heroSt(who, x.id).q, x.r]),
        skills: Object.assign({}, b.skills), city: Object.assign({}, b.city.levels), capital: botCapitalOf(who), online: botOnline(bd, Date.now()) };
}
function powerOf(pr) {                           // Macht: troops, bases, gear, heroes, skills and city - one number to compare rulers by
    let bases = 0; for (const id of (pr.who === 'player' ? ownedIslands : botOwnedIslands[pr.who] || [])) bases += baseDefenseForLevel(islandLevels[id] || 1);
    const gear = pr.items.reduce((a, it) => a + (it[1] >= 0 ? itemScore({ rarity: it[1], level: it[2] }) * (1 + it[3] * .2) : 0), 0);
    const heroes = pr.heroes.reduce((a, x) => a + (4 + x[1]) * x[2] / 2, 0), sk = Object.values(pr.skills).reduce((a, v) => a + v, 0), city = Object.values(pr.city).reduce((a, v) => a + v, 0);
    return Math.round(pr.troops + bases + gear * 400 + heroes * 800 + sk * 600 + city * 1500);
}
function lastFightWith(pr) {                     // what's between the two of you, from the battle log
    if (pr.who === 'player') return null;
    const hit = combatLog.find(e => e.type === 'botAttack' && e.rolle !== 'helfer' && (e.botId === pr.who || e.botName === pr.name));
    const mine = combatLog.find(e => e.type === 'attack' && (e.defenderId === pr.who || e.defenderName === pr.name));
    const ago = e => fmtAway(Date.now() - e.at);
    const parts = [];
    if (hit) parts.push(escapeHtml(pr.name) + ' hat dich zuletzt vor ' + ago(hit) + ' angegriffen' + (hit.won ? ' und gewonnen.' : ' – du hast gehalten.'));
    if (mine) parts.push('Du hast ' + escapeHtml(pr.name) + ' zuletzt vor ' + ago(mine) + ' angegriffen' + (mine.won ? ' und gewonnen.' : ' – ohne Erfolg.'));
    return parts.length ? parts.join('<br>') : escapeHtml(pr.name) + ' und du hattet noch keinen Kampf miteinander.';
}
const rulerPopup = document.getElementById('rulerPopup');
let rulerWho = null, rulerBack = null;                 // rulerBack: opened from the ranking → closing goes back there (same tab and scroll)
function openRulerProfile(who) {
    const pr = whoProfile(who); if (!pr) return;
    rulerBack = isPanelOpen(rankPopup) ? document.getElementById('rankBody').scrollTop : null;
    closeAllPopups(); rulerWho = who;
    const ring = document.getElementById('rulerCrest'); ring.dataset.frame = pr.frame; ring.querySelector('img').src = crestDataUrl(40, who);
    document.getElementById('rulerLvl').textContent = pr.lvl;
    document.getElementById('rulerName').textContent = pr.name;
    document.getElementById('rulerOver').textContent = (who === 'player' ? 'Dein Profil' : 'Profil') + ' · Rang ' + RANK_TIERS[rankIndexFor(pr.bases)].name;
    document.getElementById('rulerSub').innerHTML = '<span class="ptitle-tag" style="margin:0">' + escapeHtml(pr.title) + '</span>' + (who === 'player' ? '' : ' <span class="rp-online' + (pr.online ? ' on' : '') + '"><i></i>' + (pr.online ? 'online' : 'offline') + '</span>') +
        (() => { const a = typeof bundVon === 'function' && bundVon(who); return '<span class="rp-bund">' + (a ? '[' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) : 'kein Bündnis') + '</span>'; })();   // sein Bündnis
    const rd = r => RARITY_DEFS[r];
    const gear = pr.items.map(it => { const d = EQUIPMENT_DEFS[it[0]], r = rd(it[1]);
        return '<span class="gslot"><span class="tile' + (r ? '' : ' empty') + '"' + (r ? ' data-r="' + r.key + '"' : '') + ' title="' + d.name + (r ? ' – ' + r.label + ', Stufe ' + it[2] : ' – leer') + '">' + icon(d.icon) +
            (r ? '<span class="lvl">' + it[2] + '</span>' + (it[3] ? '<span class="stars">' + icon('star').repeat(it[3]) + '</span>' : '') : '') + '</span><small>' + d.name + '</small></span>'; }).join('');
    const heroes = pr.heroes.length ? pr.heroes.slice().sort((a, b) => b[2] - a[2] || b[1] - a[1]).map(x => heroChipHtml(x[0], x[1])).join('') : '<div class="war-empty">Noch keine Helden freigeschaltet.</div>';
    const skillsHtml = Object.keys(SKILL_DEFS).map(k => '<div><span>' + SKILL_DEFS[k].name + '</span><b>' + (pr.skills[k] || 0) + '</b></div>').join('');
    const cityHtml = BOT_BUILDINGS.map(k => '<div class="rp-bld' + ((pr.city[k] || 0) ? '' : ' is-zero') + '"><span class="rp-bld-ic">' + icon(cityDef(k).icon) + '<b>' + (pr.city[k] || 0) + '</b></span><small>' + cityDef(k).name + '</small></div>').join('');
    const last = lastFightWith(pr);
    document.getElementById('rulerBody').innerHTML =
        '<div class="rp-stats"><div class="rp-stat"><small>Macht</small><b>' + fmtCompact(powerOf(pr)) + '</b></div><div class="rp-stat"><small>Basen</small><b>' + fmtNum(pr.bases) + '</b></div>' +
        '<div class="rp-stat"><small>Stufe</small><b>' + pr.lvl + '</b></div><div class="rp-stat"><small>Tempel</small><b>' + (rulerOwner() === who ? 'Herrscher' : pr.temple ? escapeHtml(pr.temple.name) : '–') + '</b></div></div>' +
        (ownerShielded(who) ? '<div class="notice notice--gold">' + icon('shield') + '<span>' + (who === 'player' ? 'Dein Friedensschild' : 'Friedensschild') + ' aktiv – noch ' + fmtHours(ownerShieldUntil(who) - Date.now()) + '</span></div>' : '') +
        passChip(who) + (last ? '<div class="rp-last">' + last + '</div>' : '') +
        '<div class="sect"><h4>Ausrüstung</h4></div><div class="rp-gear">' + gear + '</div>' +
        '<div class="sect"><h4>Helden</h4></div><div class="rp-heroes">' + heroes + '</div>' +
        '<div class="sect"><h4>Skills</h4></div><div class="rp-grid">' + skillsHtml + '</div>' +
        '<div class="sect"><h4>Stadt</h4></div><div class="rp-blds">' + cityHtml + '</div>' +
        '<div class="rp-actions">' + (typeof bundProfilKnopf === 'function' ? bundProfilKnopf(who) : '') + '<button class="btn btn--secondary btn--sm" type="button" data-rp="map">' + icon('flag') + '<span>Zur Karte</span></button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-rp="capital">' + icon('castle') + '<span>Hauptstadt</span></button></div>';
    openPanel(rulerPopup);
}
document.getElementById('rulerCloseBtn').addEventListener('click', () => { closePanel(rulerPopup); rulerWho = null;
    if (rulerBack !== null) { const y = rulerBack; rulerBack = null; openRankings(); document.getElementById('rankBody').scrollTop = y; } });
document.getElementById('rulerBody').addEventListener('click', e => {
    const b = e.target.closest('[data-rp]'); if (!b || !rulerWho) return;
    if (b.dataset.rp === 'einladen') { const w = rulerWho; b.disabled = true; bundBefehl('einladen', { w: neutralId(w) }, 'Einladung an ' + whoProfile(w).name + ' geschickt.'); return; }
    const who = rulerWho, own = who === 'player' ? ownedIslands : botOwnedIslands[who]; if (!own || !own.size) return;
    closePanel(rulerPopup); rulerWho = null; rulerBack = null;
    if (b.dataset.rp === 'capital') { const cap = who === 'player' ? playerIslandId : botCapitalOf(who), isl = islandById[cap]; if (!isl) return;
        flyTo(isl.x, isl.y, { zoom: Math.max(mapState.zoom, 0.02) }); setTimeout(() => openIslandPopup(isl), 650); return; }
    const c = screenToWorld(viewW / 2, viewH / 2); let best = null, bd = Infinity;   // their base nearest to what you're looking at
    for (const id of own) { const isl = islandById[id], d = Math.hypot(isl.x - c.x, isl.y - c.y); if (d < bd) { bd = d; best = isl; } }
    if (best) { flyTo(best.x, best.y, { zoom: Math.max(mapState.zoom, 0.015) }); flashHint(whoProfile(who).name + ': ' + own.size + (own.size === 1 ? ' Basis' : ' Basen') + ' auf der Karte.', 2500); }
});
// every name you see can be tapped: the ranking, the owner line of a base, the battle reports
document.addEventListener('click', e => { const l = e.target.closest('[data-profile]'); if (!l) return; e.preventDefault(); e.stopPropagation(); openRulerProfile(l.dataset.profile); }, true);
function whoLink(who, name) { return who ? '<button type="button" class="who-link" data-profile="' + who + '">' + escapeHtml(name) + '</button>' : escapeHtml(name); }
function escapeHtml(str) {                         // auch Anführungszeichen: sicher in Text UND in Attributen
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// ===== RANGLISTE: Macht, Eroberungen, Titel (aus der Mitte), Thron-Punkte (all ever earned). Worked out once when opened or a tab
// is picked - never per frame. Everyone is listed the same way; your row is blue and waits in the foot when you're outside the top.
const rankPopup = document.getElementById('rankPopup'), RANK_TOP = 50;
let rankTab = 'power';
const RANK_TABS = { power: { t: 'Macht', sub: 'Die Stärke des ganzen Reichs', unit: 'Macht' },
    caps: { t: 'Eroberungen', sub: 'Eroberte Basen insgesamt', unit: 'erobert' },
    titles: { t: 'Titel', sub: 'Wer die Mitte hält und wer einen Titel trägt', unit: 'Thron-P.' },
    week: { t: 'Thron-Punkte', sub: 'Fürs Halten der Mitte · alle je verdienten', unit: 'Thron-P.' } };
function conquestsOf(who) { return who === 'player' ? playerStats.captures || 0 : botConquests(who); }
function rankPeople() {                                  // everyone once: name, frame, look title, level, bases
    const bs = loadBotState(), out = [{ who: 'player', name: profileName.value || 'Du', frame: playerFrame(), title: playerTitle(), lvl: playerLvl, bases: ownedIslands.size }];
    for (const bd of BOT_DEFS) { const lk = botLook(bd.id); out.push({ who: bd.id, name: bd.name, frame: lk.frame, title: lk.title, lvl: (bs[bd.id] || {}).lvl || 1, bases: whoBases(bd.id) }); }
    return out;
}
function rankRowHtml(e, pos, medals, unit) {
    const me = e.who === 'player', v = e.val;
    return '<div class="lb-row' + (medals && pos <= 3 ? ' is-' + pos : '') + (me ? ' isMe' : '') + '" data-profile="' + e.who + '" role="button" tabindex="0">' +
        '<span class="lb-pos">' + pos + '</span>' +
        '<span class="lb-crest" data-frame="' + e.frame + '"><span class="lb-crest-in"><img alt="" src="' + crestDataUrl(28, e.who) + '"></span><span class="lvl">' + e.lvl + '</span></span>' +
        '<span class="lb-name"><b><span>' + escapeHtml(e.name) + '</span>' + (me && profileName.value ? '<span class="tag tag--player">Du</span>' : '') + '</b><small>' + e.sub + '</small></span>' +
        '<span class="lb-val"><b>' + (v >= 1e5 ? fmtCompact(v) : fmtNum(v)) + '</b><small>' + (unit || RANK_TABS[rankTab].unit) + '</small></span></div>';
}
function renderRankings() {
    const tab = RANK_TABS[rankTab], people = rankPeople(), bs = loadBotState(), t = loadTitles(), ruler = rulerOwner() || null;
    const basesTxt = n => fmtNum(n) + (n === 1 ? ' Basis' : ' Basen');
    if (!RANK_TABS[rankTab]) rankTab = 'power';
    let list, medals = true, empty = '';
    if (rankTab === 'power') { for (const e of people) { const pr = whoProfile(e.who); e.val = pr ? powerOf(pr) : 0; e.sub = escapeHtml(e.title) + ' <i>· ' + basesTxt(e.bases) + '</i>'; } list = people.slice(); }
    else if (rankTab === 'caps') { for (const e of people) { e.val = conquestsOf(e.who); e.sub = escapeHtml(e.title) + ' <i>· hält ' + basesTxt(e.bases) + '</i>'; } list = people.slice(); saveBotState(); }
    else if (rankTab === 'titles') {                      // the ruler first, then everyone wearing a title from the middle
        medals = false; const by = {}; for (const x of TITLES) if (t.by[x.key]) by[t.by[x.key]] = x;
        for (const e of people) { const x = by[e.who]; e.val = throneEarnedOf(e.who, bs);
            e.sub = e.who === ruler ? '<span class="lb-t is-ruler">Herrscher</span>' : x ? '<span class="lb-t' + (x.good ? '' : ' is-bad') + '" title="' + x.desc + '">' + x.name + '</span> <i>' + (x.v > 0 ? '+' : '−') + Math.round(Math.abs(x.v) * 100) + ' % ' + ({ troops: 'Truppen', coins: 'Münzen', attack: 'Angriff', defense: 'Abwehr' })[x.kind] + '</i>' : '<i>kein Titel</i>'; }
        const tr = e => e.who === ruler ? 0 : by[e.who] ? (by[e.who].good ? 1 : 2) : 3;
        list = people.filter(e => tr(e) < 3).sort((a, b) => tr(a) - tr(b) || b.val - a.val);
        empty = ruler ? '' : 'Niemand hält gerade die Mitte – erobere den Mega-Tempel, dann verteilst du die Titel.';
    } else { for (const e of people) { e.val = throneEarnedOf(e.who, bs); e.sub = escapeHtml(e.title) + ' <i>· ' + basesTxt(e.bases) + '</i>'; } list = people.filter(e => e.val > 0);
        empty = 'Noch hat niemand Thron-Punkte geholt. Halte die Mitte oder einen Wächter-Tempel.'; }
    if (rankTab !== 'titles') list.sort((a, b) => b.val - a.val || b.lvl - a.lvl);
    const lim = RANK_TOP, top = list.slice(0, lim), mi = list.findIndex(e => e.who === 'player');
    document.getElementById('rankTitle').textContent = tab.t;
    document.getElementById('rankSub').textContent = tab.sub;                     // one line what this list counts
    for (const b of document.querySelectorAll('#rankTabs [data-rtab]')) { const on = b.dataset.rtab === rankTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    liveHtml(document.getElementById('rankBody'),
        (rankTab === 'week' ? '<p class="mail-intro lb-intro">Thron-Punkte gibt es fürs Halten der Mitte: +' + THRONE_PTS_MEGA + ' alle 3 Min. für den Thron, +' + THRONE_PTS_GUARD + ' je Wächter-Tempel. Du gibst sie im Shop unter „Thron“ aus – hier zählt alles je Verdiente, ohne Neustart.</p>' : '') +
        (top.length ? top.map((e, i) => rankRowHtml(e, i + 1, medals)).join('') + (list.length > lim ? '<div class="lb-gap">Top ' + lim + ' von ' + fmtNum(list.length) + '</div>' : '')
        : '<div class="empty-state">' + icon(rankTab === 'titles' ? 'crown' : 'points') + '<b>Noch leer</b>' + empty + '</div>'));
    const foot = document.getElementById('rankFoot');
    const myPos = mi + 1;
    liveHtml(foot, myPos > 0 && myPos <= lim ? '' : rankRowHtml(people[0], myPos > 0 ? myPos : '–', false));   // outside the top: your row waits down here
    foot.hidden = !foot.innerHTML;
}
function openRankings(tab) {
    closeAllPopups(); if (tab && RANK_TABS[tab]) rankTab = tab;
    renderRankings(); openPanel(rankPopup); document.getElementById('rankBody').scrollTop = 0;
}
document.getElementById('rankTabs').addEventListener('click', e => { const b = e.target.closest('[data-rtab]'); if (!b || b.dataset.rtab === rankTab) return; rankTab = b.dataset.rtab; renderRankings(); document.getElementById('rankBody').scrollTop = 0; });
document.getElementById('rankCloseBtn').addEventListener('click', () => closePanel(rankPopup));
rankPopup.addEventListener('keydown', e => { const r = e.target.closest('[data-profile]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRulerProfile(r.dataset.profile); } });

profileBtn.addEventListener('click', () => {
    if (isPanelOpen(profilePopup)) { profileCloseBtn.click(); return; }
    closeAllPopups();
    renderProfile();
    showProfileTab('info');
    openPanel(profilePopup);
});
profileCloseBtn.addEventListener('click', () => {
    closePanel(profilePopup);
    chestSelectedIds.clear();
});

// Battle log popup: which of your troops are marching right now,
// plus a history of resolved attacks/transfers
const battleLogBtn = document.getElementById('battleLogBtn');
const battleLogBadge = document.getElementById('battleLogBadge');
const battleLogPopup = document.getElementById('battleLogPopup');
const battleLogCloseBtn = document.getElementById('battleLogCloseBtn');
const activeMarchesEl = document.getElementById('activeMarches');
activeMarchesEl.addEventListener('click', e => { const bt = e.target.closest('[data-mact]'); if (!bt) return;
    e.stopPropagation(); if (bt.dataset.mact === 'recall') recallMarch(bt.dataset.k); else if (bt.dataset.mact === 'speedAll') speedUpAll(); else speedUpMarch(bt.dataset.k); });
const combatLogListEl = document.getElementById('combatLogList');
let battleLogRefreshTimer = null;

function timeAgoLabel(timestamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return 'vor ' + seconds + ' s';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return 'vor ' + minutes + ' Min.';
    return 'vor ' + Math.floor(minutes / 60) + ' Std.';
}

// Pending attacks worth showing to the player: their own, plus any
// bot attack aimed at their own territory - not bot-vs-bot or bot-
// vs-neutral fighting elsewhere on the map.
function playerRelevantAttackCount() {
    let count = 0;
    for (const attack of pendingAttacks) {
        if (!attack.attackerBotId || islandOwnerOf(attack.targetId) === 'player') count++;
    }
    if (typeof bund !== 'undefined' && bund && Array.isArray(bund.r)) for (const r of bund.r) if (islandOwnerOf(r.t) === 'player' && !bundFreund('player', r.by)) count++;   // (eine Rally sammelt gegen dich)
    return count;
}
// A bot reinforcing its own territory is never the player's send.
function playerRelevantSendCount() {
    let count = 0;
    for (const send of pendingSends) if (!send.senderBotId) count++;
    return count;
}

function renderActiveMarches() {
    const rows = [];
    const T = id => islandTitle(islandById[id]);
    const clock = sec => '<span class="num">' + fmtClock(sec) + '</span>';
    let relevantAttackCount = 0;
    for (const attack of pendingAttacks) {
        const secondsLeft = Math.max(0, Math.ceil(((attack.fightEndsAt || attack.resolveAt) - Date.now()) / 1000));
        if (!attack.attackerBotId) {
            relevantAttackCount++;
            rows.push(logRowHtml('attack', 'attack', (attack.fightEndsAt ? 'Kampf um ' : 'Angriff auf ') + T(attack.targetId),
                'von ' + T(attack.sourceId) + (attack.rawTroops ? ' · ' + fmtNum(attack.rawTroops) + ' Truppen' : '') + (attack.wartet ? ' · wartet: dort läuft noch ein anderer Kampf' : '') + (!attack.fightEndsAt && baseShieldedFor(attack.targetId, 'player', attack.resolveAt) ? ' · Friedensschild – prallt ab' : ''), clock(secondsLeft), attack.fightEndsAt ? '' : marchButtons(attack, true)));
        } else if (islandOwnerOf(attack.targetId) === 'player') {
            // A bot marching on the player's own territory is worth
            // a warning - a bot attacking a neutral or another bot
            // isn't the player's business and stays out of this list.
            // No enemy numbers here (fog of war).
            relevantAttackCount++;
            const bounces = !attack.fightEndsAt && shieldCovers(islandById[attack.targetId]) && ownerShielded('player', attack.resolveAt);   // the Friedensschild still stands when they arrive
            rows.push(logRowHtml(bounces ? 'win' : 'loss', bounces ? 'shield' : 'bot', escapeHtml(botById[attack.attackerBotId].name) + ' greift ' + T(attack.targetId) + ' an',
                (bounces ? 'Dein Friedensschild hält – prallt ab' : 'Deine Basis wird angegriffen'), clock(secondsLeft)));   // (Wachturm: wie stark)
        }
    }
    if (typeof bund !== 'undefined' && bund && Array.isArray(bund.r)) for (const r of bund.r) {   // eine Rally, die gerade gegen dich sammelt (losgelaufen steht sie oben als Angriff)
        if (islandOwnerOf(r.t) !== 'player' || bundFreund('player', r.by)) continue;
        relevantAttackCount++;
        rows.push(logRowHtml('loss', 'bot', 'Rally gegen ' + T(r.t),
            escapeHtml(bundName(r.by)) + ' sammelt einen Angriff – los in', clock(Math.max(0, Math.ceil((r.los - Date.now()) / 1000)))));
    }
    let relevantSendCount = 0;
    for (const send of pendingSends) {
        if (send.senderBotId) continue; // a bot reinforcing itself isn't the player's business
        relevantSendCount++;
        const secondsLeft = Math.max(0, Math.ceil((send.resolveAt - Date.now()) / 1000));
        rows.push(send.back ? logRowHtml('retreat', 'recall', fmtNum(send.troops) + ' Truppen kehren zurück', 'nach ' + T(send.toId), clock(secondsLeft), marchButtons(send, false))   // (dein Rückweg vom Weltrechner)
            : logRowHtml('send', 'send', 'Verstärkung → ' + T(send.toId), 'von ' + T(send.fromId), clock(secondsLeft), marchButtons(send, true)));
    }
    for (const scout of pendingScouts) {
        const secondsLeft = Math.max(0, Math.ceil((scout.resolveAt - Date.now()) / 1000));
        rows.push(scout.back ? logRowHtml('retreat', 'scout', 'Späher kehrt zurück', 'nach ' + T(scout.targetId), clock(secondsLeft), marchButtons(scout, false))
            : logRowHtml('scout', 'scout', 'Späher → ' + T(scout.targetId), 'Ergebnis bei Ankunft', clock(secondsLeft), marchButtons(scout, true)));
    }
    for (const retreat of pendingRetreats) {
        const secondsLeft = Math.max(0, Math.ceil((retreat.resolveAt - Date.now()) / 1000));
        rows.push(logRowHtml('retreat', 'recall', fmtNum(retreat.troops) + ' Truppen kehren zurück', 'nach ' + T(retreat.toId), clock(secondsLeft), marchButtons(retreat, false)));
    }
    const bm = barbMine();                            // Barbaren-Lager and Tagesboss: out and back like every march
    for (const m of bm) { const sec = Math.max(0, Math.ceil((m.resolveAt - Date.now()) / 1000)), c = m.k === 'c' && barbCampById(m.tid), L = m.L || (c && c.L), hd = m.hero && heroById(m.hero);
        const tgt = m.k === 'b' ? (m.name || 'Tagesboss') : m.k === 'd' ? (m.name || 'Drache') : m.k === 'i' ? 'Barbaren-Armee' : 'Barbaren-Lager' + (L ? ' · Stufe ' + L : '');
        rows.push(m.back ? logRowHtml('retreat', 'recall', fmtNum(m.troops) + ' Truppen kehren zurück', 'von ' + tgt + ' nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('attack', m.k === 'b' ? 'crown' : 'attack', 'Angriff auf ' + tgt, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen' + (hd ? ' · ' + hd.name + (m.hero2 && heroById(m.hero2) ? ' & ' + heroById(m.hero2).name : '') : ''), clock(sec), marchButtons(m, true))); }
    const fm = (typeof fieldMarches !== 'undefined' ? fieldMarches : []).filter(m => m.who === 'player');   // Sammler: hin und zurück
    for (const m of fm) { const sec = Math.max(0, Math.ceil((m.resolveAt - Date.now()) / 1000)), f = fieldById[m.fieldId], K = f && FIELD_KINDS[f.kind], was = K ? K.name : 'Feld';
        rows.push(m.back ? logRowHtml('retreat', 'recall', 'Sammler kehren zurück', fmtNum(m.troops) + ' Truppen' + (m.load >= 1 ? ' · +' + fmtNum(Math.floor(m.load)) + ' ' + K.what : '') + ' · nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('send', 'send', 'Sammeln → ' + was, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen', clock(sec), marchButtons(m, true))); }
    const fast = speedableMarches();
    if (fast.length > 1) rows.unshift('<div class="march-all"><span class="mact"><button type="button" data-mact="speedAll" title="Restzeit aller Märsche halbieren">' + icon('hourglass') + 'Alle schneller (' + fast.length + ') · <b>' + fmtNum(fast.reduce((a, m) => a + speedUpCost(m), 0)) + '</b>' + icon('gem') + '</button></span></div>');
    const amHtml = rows.length ? rows.join('') : '<div class="logEmpty">' + icon('hourglass') + 'Gerade nichts unterwegs.</div>';
    if (amHtml !== activeMarchesEl._html) { activeMarchesEl._html = amHtml; activeMarchesEl.innerHTML = amHtml; }   // many fights resolve per second: rebuild only on change (keeps the buttons tappable)
    battleLogPopup.classList.toggle('has-entries', rows.length > 0 || combatLog.length > 0);

    const total = relevantAttackCount + relevantSendCount + pendingScouts.length + pendingRetreats.length + bm.length + fm.length;
    setText(battleLogBadge, total);
    setShown(battleLogBadge, total > 0);
}

const combatLogKey = e => e.at + '|' + e.type + '|' + (e.targetId ?? e.toId);
// Re-renders the list while the panel is open: opened "Kampfdetails" stay open and the
// rows the player is reading stay where they are when a new row is added on top.
function refreshOpenCombatLog() {
    const body = combatLogListEl.closest('.pbody');
    const rows = [...combatLogListEl.children];
    const openKeys = new Set(rows.filter(r => r.querySelector('details[open]')).map(r => r.dataset.key));
    const anchor = rows.find(r => r.dataset.key && r.offsetTop + r.offsetHeight > body.scrollTop);
    const anchorKey = anchor && anchor.dataset.key, anchorTop = anchor ? anchor.offsetTop : 0;
    const scrollTop = body.scrollTop;
    renderCombatLog();
    for (const r of combatLogListEl.children)
        if (openKeys.has(r.dataset.key)) { const d = r.querySelector('details'); if (d) d.open = true; }
    if (scrollTop > 0 && anchorKey) {
        const again = [...combatLogListEl.children].find(r => r.dataset.key === anchorKey);
        body.scrollTop = scrollTop + (again ? again.offsetTop - anchorTop : 0);
    }
}
function renderCombatLog() {
    battleLogPopup.classList.toggle('has-entries', combatLog.length > 0 || activeMarchesEl.querySelector('.logRow') !== null);
    if (combatLog.length === 0) {
        combatLogListEl.innerHTML = '<div class="logEmpty">' + icon('battlelog') + 'Noch keine Einträge.</div>';
        return;
    }
    let T;
    const ago = e => timeAgoLabel(e.at);
    const fmt1 = v => (v || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fmtM = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // meta lines: "987,7 Mio."
    const fmtD = v => fmtNum(v || 0);   // detail cards
    const gearHtml = g => { if (!g) return '';
        const tiles = g.items.map((it, i) => { const d = EQUIPMENT_DEFS[it[0]], rd = RARITY_DEFS[it[1]];
            return '<span class="gslot"><span class="tile' + (rd ? '' : ' empty') + '"' + (rd ? ' data-r="' + rd.key + '"' : '') + ' title="' + d.name + (rd ? ' – ' + rd.label + ', Stufe ' + it[2] : ' – leer') + '">' + icon(d.icon) +
                (rd ? '<span class="lvl">' + it[2] + '</span>' + (it[3] ? '<span class="stars">' + icon('star').repeat(it[3]) + '</span>' : '') : '') + '</span></span>'; }).join('');
        const heroes = (g.hx ? [g.hx, ...(g.hx.h2 ? [g.hx.h2] : [])] : []).map(x => { const hd = heroById(x.id); if (!hd) return ''; const rd = RARITY_DEFS[hd.r];   // who led (Haupt- und Zweitheld), his stars, whether the rage fired, every bonus
                return '<div class="logHero" style="--hc:' + rd.color + '"><span class="ghero">' + heroImg(hd.id) + '<span><b>' + hd.name + ' <small>' + heroStarTxt(x.q) + ' · ' + rd.label + '</small></b>' +
                    '<small>' + (x.zweit ? 'Zweitheld · Werte und passive Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) + ' %' : x.fired ? '<em class="logHeroFire">' + escapeHtml(x.skill || '') + ' gezündet</em>' : 'Aktive Fähigkeit nicht gezündet') + '</small></span></span>' +
                    (x.lines || []).map(l => '<div class="logLine buff"><span>' + escapeHtml(l[0]) + '</span><span>' + escapeHtml(l[1]) + '</span></div>').join('') + '</div>'; }).join('') +
            (g.heroes || []).map(x => { const hd = heroById(x[0]); return hd ? '<span class="ghero" style="--hc:' + RARITY_DEFS[hd.r].color + '">' + heroImg(hd.id) + '<span><b>' + hd.name + '</b><small>Stufe ' + x[1] + '</small></span></span>' : ''; }).join('');   // (older reports)
        if (g.heroOnly) return '<div class="logGear"><div class="logGearHeroes">' + heroes + '</div></div>';
        return '<div class="logGear"><div class="logGearHead">Stufe ' + g.lvl + (g.title ? ' · Titel ' + escapeHtml(g.title) : '') + '</div>' +
            '<div class="logGearItems">' + tiles + '</div>' + (heroes ? '<div class="logGearHeroes">' + heroes + '</div>' : '') +
            '<div class="logGearMeta">Skill Angriff ' + g.skills[0] + ' · Verteidigung ' + g.skills[1] + '<br>Mauer ' + g.city[0] + ' · Krankenhaus ' + g.city[1] + ' · Heldenhalle ' + g.city[2] + '</div></div>'; };
    const fieldHeroLine = e => [[e.attacker, e.hA], [e.defender, e.hD]].map(([n, t]) => t ? ' · ' + (n === 'Du' ? 'dein Held ' : escapeHtml(n) + ' mit ') + escapeHtml(t) : '').join('');   // who led out in the open
    const fieldHeroDet = e => e.hx ? '<details><summary>Dein Held</summary>' + gearHtml({ items: [], lvl: playerLvl, hx: e.hx, skills: [], city: [], heroOnly: 1 }) + '</details>' : undefined;
    const karte = (e, kind, ic, badge, title, sub, bar, chips, det) => logRowHtml(kind, ic, logBadge(badge[0], badge[1]) + title, sub, ago(e), (bar || '') + logChips(chips) + (det || ''));   // jede Karte gleich aufgebaut
    const partLines = (parts, first) => (parts || []).map((q, i) => '<div class="logLine' + (first && !i ? '' : q[1] < 0 ? ' buff malus' : ' buff') + '"><span>' + escapeHtml(q[0]) + (q[2] ? '<small class="logSrc">' + escapeHtml(q[2]) + '</small>' : '') + '</span><span>' + (first && !i ? '' : q[1] < 0 ? '−' : '+') + fmtD(Math.abs(q[1])) + '</span></div>').join('');   // each bonus with where it comes from
    combatLogListEl.innerHTML = combatLog.map(entry => { try { return (entry => {   // (jeder Bericht für sich: ein kaputter blockiert nie die ganze Liste)
        T = id => (entry.names && entry.names[id]) || islandTitle(islandById[id]);
        if (entry.type === 'send') {
            return karte(entry, 'send', 'send', ['send', 'Verstärkung'], T(entry.toId), '', '', [['troops', chipN(entry.troops) + ' Truppen angekommen']]);
        }
        if (entry.type === 'sammeln') {                          // Sammler sind vom Feld zurück
            const K = FIELD_KINDS[entry.fieldKind] || FIELD_KINDS.gold;
            return karte(entry, 'win', K.icon, ['win', 'Sammler zurück'], K.name, entry.toId !== undefined && entry.toId !== null ? 'zurück in ' + T(entry.toId) : '', '',
                [[K.icon, '+' + chipN(entry.load) + ' ' + escapeHtml(K.what), entry.load > 0 ? 'gut' : ''], ['troops', chipN(entry.troops) + ' Truppen zurück']]);
        }
        if (entry.type === 'field') {
            const K = FIELD_KINDS[entry.fieldKind] || FIELD_KINDS.gold;
            return karte(entry, entry.won ? 'win' : 'loss', K.icon, [entry.won ? 'win' : 'loss', entry.won ? 'Feld gehalten' : 'Feld verloren'], K.name, fieldHeroLine(entry).replace(/^ · /, ''),
                logBalance(entry.atk, entry.def, icon('attack') + escapeHtml(entry.attacker) + ' ' + fmtM(entry.atk), fmtM(entry.def) + ' ' + escapeHtml(entry.defender) + icon('defense'), entry.attacker !== 'Du'),
                [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut']], fieldHeroDet(entry));
        }
        if (entry.type === 'barb' || entry.type === 'dboss') {    // out in the open against a camp or the boss: your side vs. theirs, losses, rewards
            const boss = entry.type === 'dboss', tr = entry.troops, gef = entry.gef || 0, bon = tr !== undefined ? entry.atk - tr - gef : 0;
            const mySide = tr === undefined ? '' : '<div class="logSide"><div class="logSideLabel">Angreifer · Du' + (entry.sourceId !== undefined ? ' · ' + T(entry.sourceId) : '') + '</div>' +
                '<div class="logLine"><span>Truppen</span><span>' + fmtD(tr) + '</span></div>' + (gef ? '<div class="logLine buff"><span>Gefolge (Held)</span><span>+' + fmtD(gef) + '</span></div>' : '') +
                (bon ? '<div class="logLine' + (bon < 0 ? ' buff malus' : ' buff') + '"><span>Angriff-Bonus</span><span>' + (bon < 0 ? '−' : '+') + fmtD(Math.abs(bon)) + '</span></div>' : '') +
                '<div class="logSum' + (boss || entry.won ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(entry.atk) + '</span></div>' +
                '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, (entry.loss || 0) - (entry.wounded || 0))) + '</span></div>' +
                (entry.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.wounded) + '</span></div>' : '') +
                '<div class="logLine"><span>Zurück nach Hause</span><span>' + fmtD(Math.max(0, tr - (entry.loss || 0))) + '</span></div></div>';
            const foeSide = tr === undefined ? '' : boss
                ? '<div class="logSide"><div class="logSideLabel">Tagesboss · ' + escapeHtml(entry.name) + '</div><div class="logLine"><span>Leben vorher</span><span>' + fmtD(entry.hp0) + '</span></div>' +
                    '<div class="logCasualty"><span>Dein Schaden</span><span>−' + fmtD(entry.dmg) + '</span></div><div class="logSum"><span>Noch Leben</span><span>' + fmtD(entry.left) + '</span></div>' +
                    '<div class="logLine"><span>Dein Schaden heute</span><span>' + fmtD(entry.total) + '</span></div>' + (entry.rank ? '<div class="logLine"><span>Platz</span><span>' + entry.rank + ' von ' + entry.of + '</span></div>' : '') + '</div>'
                : '<div class="logSide"><div class="logSideLabel">Barbaren-Lager · Stufe ' + entry.L + '</div><div class="logLine"><span>Krieger</span><span>' + fmtD(entry.def) + '</span></div>' +
                    '<div class="logSum' + (entry.won ? '' : ' advantage') + '"><span>Gesamt</span><span>' + fmtD(entry.def) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(entry.kill) + '</span></div>' + (!entry.won ? '<div class="logLine"><span>Noch im Lager</span><span>' + fmtD(entry.left) + '</span></div>' : '') + '</div>';
            const rew = boss ? (entry.gold ? '<div class="logGold">Beute: +' + fmtBig(entry.gold) + ' Münzen nach Schaden</div>' : '') + (entry.capped ? '<div class="logRetreat">Höchstens 5 % Leben pro Angriff.</div>' : '')
                : (entry.gold ? '<div class="logGold">Beute: +' + fmtBig(entry.gold) + ' Münzen' + (entry.kGold ? ' (davon ' + fmtBig(entry.kGold) + ' Angriff: Gold)' : '') + '</div>' : '') +
                  (entry.crate ? '<div class="logGold">Kiste: ' + escapeHtml(entry.crate) + '</div>' : '') + (entry.sh ? '<div class="logGold">' + escapeHtml(entry.sh) + '</div>' : '') +
                  (entry.n !== undefined ? '<div class="logRetreat">' + (entry.up ? 'Stufe ' + entry.open + ' freigeschaltet · ' : entry.open ? 'Freigeschaltet bis Stufe ' + entry.open + ' · ' : '') + entry.n + ' / ' + barbTagMax() + ' heute</div>' : '');
            const det = tr === undefined ? fieldHeroDet(entry) : '<details><summary>Kampfdetails</summary>' +
                '<div class="logCompare">' + mySide + '<div class="logVsDivider">VS</div>' + foeSide + '</div>' + rew +
                (entry.wounded ? '<div class="logRetreat logWounded">' + fmtNum(entry.wounded) + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
                (entry.hx ? gearHtml({ items: [], lvl: playerLvl, hx: entry.hx, skills: [], city: [], heroOnly: 1 }) : '') + '</details>';
            const von = (entry.sourceId !== undefined ? 'von ' + T(entry.sourceId) : '') + fieldHeroLine(entry), verl = verlustChips((entry.loss || 0) - (entry.wounded || 0), entry.wounded);
            const extra = [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']];
            if (boss) return karte(entry, 'win', 'crown', ['win', 'Tagesboss'], escapeHtml(entry.name), von.replace(/^ · /, ''), '',
                [['attack', chipN(entry.dmg) + ' Schaden', 'gut'], ['crown', 'noch ' + chipN(entry.left) + ' Leben'], entry.rank && ['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ...verl, ...extra], det);
            return karte(entry, entry.won ? 'win' : 'loss', 'attack', [entry.won ? 'win' : 'loss', entry.won ? 'Besiegt' : 'Abgewehrt'], 'Barbaren-Lager · Stufe ' + entry.L, von.replace(/^ · /, ''),
                tr === undefined ? '' : logBalance(entry.atk, entry.def, icon('attack') + 'Du ' + fmtM(entry.atk), fmtM(entry.def) + ' Lager' + icon('defense')),
                [...verl, ...extra, entry.up && ['check', 'Stufe ' + entry.open + ' frei', 'gut'], !entry.won && entry.left && ['troops', 'noch ' + chipN(entry.left) + ' im Lager']], det);
        }
        if (entry.type === 'ev') return karte(entry, entry.gut ? 'win' : 'loss', entry.ic || 'attack', [entry.gut ? 'win' : 'loss', escapeHtml(String(entry.badge || ''))], escapeHtml(entry.title || ''), escapeHtml(entry.txt || ''));   // Events (Invasion, Drache)
        if (entry.type === 'dbossWin') return karte(entry, 'win', 'crown', ['win', 'Boss gefallen'], escapeHtml(entry.name), 'Preis liegt im Abholfach', '',
            [['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ['attack', chipN(entry.dmg) + ' Schaden'], entry.gems > 0 && ['gem', '+' + chipN(entry.gems) + ' Gems', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']]);
        if (entry.type === 'army') {
            const side = (n, own) => n === 'Du' ? (own ? 'Deine Armee' : 'deine Armee') : (own ? 'Die Armee von ' : 'die Armee von ') + escapeHtml(n);
            return karte(entry, entry.won ? 'win' : 'loss', 'troops', [entry.won ? 'win' : 'loss', entry.won ? 'Armee siegt' : 'Armee geschlagen'], 'Kampf im Feld', side(entry.attacker, true) + ' gegen ' + side(entry.defender, false) + fieldHeroLine(entry),
                logBalance(entry.atk, entry.def, icon('attack') + fmtM(entry.atk), fmtM(entry.def) + icon('defense'), entry.attacker !== 'Du'),
                [...verlustChips(0, entry.wounded), entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut']], fieldHeroDet(entry));
        }
        if (entry.type === 'volley') {
            const dead = entry.hit - entry.wounded;
            const vdet = '<details><summary>Kampfdetails</summary><div class="logCompare"><div class="logSide">' +
                '<div class="logSideLabel">Beschuss</div>' +
                (entry.shotBy || []).map((s, i) => '<div class="logLine"><span>Wächter ' + (i + 1) + '</span><span>' + escapeHtml(s) + '</span></div>').join('') +
                '<div class="logLine"><span>Je Wächter</span><span>' + THRONE_FIRE_PCT + ' %</span></div>' +
                (entry.n > 1 ? '<div class="logLine"><span>Salven</span><span>' + entry.n + '</span></div>' : '') +
                '</div><div class="logVsDivider">VS</div><div class="logSide"><div class="logSideLabel">Du · Thron</div>' +
                (entry.n === 1 ? '<div class="logLine"><span>Truppen vorher</span><span>' + fmtD(entry.before) + '</span></div>' : '') +
                '<div class="logLine"><span>Getroffen</span><span>' + fmtD(entry.hit) + '</span></div>' +
                '<div class="logCasualty wounded"><span>Ins Krankenhaus</span><span>' + fmtD(entry.wounded) + '</span></div>' +
                (dead > 0 ? '<div class="logCasualty"><span>Gefallen (kein Platz)</span><span>−' + fmtD(dead) + '</span></div>' : '') +
                '<div class="logSum"><span>Noch im Thron</span><span>' + fmtD(entry.left) + '</span></div>' +
                '</div></div><div class="logRetreat">Erobere die Wächter-Tempel, dann schweigen sie. Verwundete heilst du im Krankenhaus in deiner Stadt.</div></details>';
            return karte(entry, 'loss', 'attack', ['loss', 'Beschuss'], T(entry.targetId), (entry.shotBy || []).length + ' Wächter-Tempel' + (entry.n > 1 ? ' · ' + entry.n + ' Salven' : ''), '',
                [['attack', chipN(entry.hit) + ' getroffen', 'schlecht'], ...verlustChips(dead, entry.wounded)], vdet);
        }
        if (entry.type === 'scout') {
            return karte(entry, 'scout', 'scout', ['scout', 'Gespäht'], T(entry.targetId), entry.spy ? escapeHtml(entry.spy.name) + ' · Stufe ' + fmtNum(entry.spy.lvl) : '', '',
                [['troops', chipN(entry.troops) + ' Truppen'], ['defense', chipN(entry.defense) + ' Verteidigung']], spaeherBlickHtml(entry.spy));
        }
        if (entry.type === 'retreat') {
            return karte(entry, 'retreat', 'recall', ['retreat', 'Zurück'], T(entry.toId), '', '', [['troops', chipN(entry.troops) + ' Truppen wieder daheim']]);
        }
        if (entry.type === 'botAttack') {
            const fallen = entry.fallen;
            const defSum = entry.enemyTroops + entry.enemyDefense;
            const bdet = '<details><summary>Kampfdetails</summary>' +
                '<div class="logCompare">' +
                    '<div class="logSide">' +
                        '<div class="logSideLabel">Angreifer · ' + whoLink(entry.botId || botIdByName[entry.botName], entry.botName) + (angreiferZeilen(entry, gearHtml) ? ' + ' + (entry.angreifer.length - 1) : '') + '</div>' +
                        angreiferZeilen(entry, gearHtml) +
                        (entry.atkParts ? '<div class="logLine"><span>Truppen</span><span>' + fmtD(entry.atkRaw) + '</span></div>' + partLines(entry.atkParts) :
                         entry.atkRaw !== undefined ? '<div class="logLine"><span>Truppen</span><span>' + fmtD(entry.atkRaw) + '</span></div>' +
                            (entry.atkBonus ? '<div class="logLine buff"><span>Angriff-Bonus</span><span>+' + fmtD(entry.atkBonus) + '</span></div>' : '') +
                            (entry.myTroops - entry.atkRaw - entry.atkBonus ? '<div class="logLine buff"><span>Titel</span><span>' + (entry.myTroops - entry.atkRaw - entry.atkBonus > 0 ? '+' : '−') + fmtD(Math.abs(entry.myTroops - entry.atkRaw - entry.atkBonus)) + '</span></div>' : '') : '') +
                        '<div class="logSum' + (entry.won ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(entry.myTroops) + '</span></div>' +
                        (entry.atkRaw !== undefined ? '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, entry.atkFallen - entry.atkWounded)) + '</span></div>' +
                            (entry.atkWounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.atkWounded) + '</span></div>' : '') +
                            (entry.atkFled ? '<div class="logLine"><span>Geflohen</span><span>' + fmtD(entry.atkFled) + '</span></div>' : '') : '') +
                        gearHtml(entry.atkGear) +
                    '</div>' +
                    '<div class="logVsDivider">VS</div>' +
                    '<div class="logSide">' +
                        '<div class="logSideLabel">Verteidiger · ' + (entry.rolle === 'helfer' ? escapeHtml(entry.defName || '?') + ' + Verstärkung' : entry.verst ? 'Du + Verstärkung' : 'Du') + '</div>' +
                        '<div class="logLine"><span>Truppen' + (entry.verst ? ' (alle)' : '') + '</span><span>' + fmtD(entry.enemyTroops) + '</span></div>' +
                        verstZeilen(entry, entry.rolle === 'helfer' ? (entry.defName || '?') : 'Deine', gearHtml) +
                        (entry.defParts ? partLines(entry.defParts, true)
                          : '<div class="logLine"><span>Verteidigung</span><span>' + fmtD(entry.enemyDefense) + '</span></div>' +
                            (entry.armor ? '<div class="logLine buff"><span>davon Rüstung</span><span>+' + fmtD(entry.armor) + '</span></div>' : '')) +
                        '<div class="logSum' + (entry.won ? '' : ' advantage') + '"><span>Gesamt</span><span>' + fmtD(defSum) + '</span></div>' +
                        (entry.rolle === 'helfer' ? '' : '<div class="logCasualty"><span>' + (entry.verst ? 'Deine gefallen' : 'Gefallen') + '</span><span>−' + fmtD(Math.max(0, fallen - (entry.wounded || 0))) + '</span></div>' +
                        (entry.wounded ? '<div class="logCasualty wounded"><span>' + (entry.verst ? 'Deine verwundet' : 'Verwundet') + '</span><span>' + fmtD(entry.wounded) + '</span></div>' : '')) +
                        gearHtml(entry.defGear) +
                    '</div>' +
                '</div>' +
                (entry.wounded ? '<div class="logRetreat logWounded">' + fmtNum(entry.wounded) + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
                (entry.atkWounded ? '<div class="logRetreat logWounded">' + escapeHtml(entry.botName) + ' bringt ' + fmtNum(entry.atkWounded) + ' Verwundete ins Krankenhaus</div>' : '') +
                (entry.atkFled ? '<div class="logRetreat">' + fmtNum(entry.atkFled) + ' Truppen von ' + escapeHtml(entry.botName) + ' fliehen zurück</div>' : '') +
                (entry.defGold ? '<div class="logGold">Verteidigung: Gold +' + fmtBig(entry.defGold) + ' Münzen</div>' : '') +
                '</details>';
            const bbar = logBalance(entry.myTroops, defSum, icon('attack') + escapeHtml(entry.botName) + ' ' + fmtM(entry.myTroops), fmtM(defSum) + ' ' + (entry.rolle === 'helfer' ? escapeHtml(entry.defName || '?') : 'Du') + icon('defense'), true);
            if (entry.rolle === 'helfer') { const mh = entry.meine || {};   // deine Verstärkung bei einem Bündnis-Mitglied hat mitverteidigt
                return karte(entry, entry.won ? 'loss' : 'win', 'defense', [entry.won ? 'loss' : 'win', 'Verstärkung'], T(entry.targetId), escapeHtml(entry.defName || '?') + ' gegen ' + escapeHtml(entry.botName) + ' · ' + (entry.won ? 'gefallen' : 'gehalten'), bbar,
                    [['troops', 'deine ' + chipN(mh.n) + ' Truppen'], ...verlustChips(mh.fallen, mh.wounded)], bdet); }
            const wer = escapeHtml(entry.botName) + (angreiferZeilen(entry, gearHtml) ? ' (gemeinsam, ' + entry.angreifer.length + ' Angreifer)' : '');
            const bchips = [...verlustChips(Math.max(0, fallen - (entry.wounded || 0)), entry.wounded), ...beuteChips(entry, false), entry.defGold > 0 && ['coin', '+' + chipN(entry.defGold) + ' Gold', 'gut']];
            return entry.capitalHolds
                ? karte(entry, 'loss', 'bot', ['loss', 'Geplündert'], T(entry.targetId), wer + ' hat die Garnison geschlagen – die Stadt hält', bbar, bchips, bdet)
                : entry.won
                ? karte(entry, 'loss', 'bot', ['loss', 'Verloren'], T(entry.targetId), wer + ' hat die Basis erobert', bbar, bchips, bdet)
                : karte(entry, 'win', 'shield', ['win', 'Verteidigt'], T(entry.targetId), wer + ' zurückgeschlagen', bbar, bchips, bdet);
        }
        // Everything each side brings to the fight, added up line by
        // line into a "Gesamt" sum, side by side - so the two final
        // numbers sit right next to each other and it's obvious at a
        // glance who had the advantage (that side's sum is green).
        const atkTotal = entry.myTroops + entry.attackBuff;
        const ich = entry.meine && entry.meine.fallen !== undefined && (entry.rolle === 'mit' || Array.isArray(entry.angreifer)) ? entry.meine : null;   // gemeinsam: deine eigenen Zahlen (geflohen, übrig, verwundet, gefallen)
        const defTotal = entry.enemyTroops + entry.enemyDefense + entry.defenseBuff;
        const details = '<details><summary>Kampfdetails</summary>' +
            '<div class="logCompare">' +
                '<div class="logSide">' +
                    '<div class="logSideLabel">Angreifer' + (angreiferZeilen(entry, gearHtml) ? ' · gemeinsam' : '') + '</div>' +
                    angreiferZeilen(entry, gearHtml) +
                    '<div class="logLine"><span>Truppen' + (angreiferZeilen(entry, gearHtml) ? ' (alle)' : '') + '</span><span>' + fmtD(entry.myTroops) + '</span></div>' +
                    (entry.atkParts ? partLines(entry.atkParts)
                        : '<div class="logLine buff"><span>Angriff-Skill</span><span>+' + fmtD(entry.skillBuff) + '</span></div>' +
                          (entry.titleBuff ? '<div class="logLine buff"><span>Titel</span><span>' + (entry.titleBuff > 0 ? '+' : '−') + fmtD(Math.abs(entry.titleBuff)) + '</span></div>' : '')) +
                    '<div class="logSum' + (atkTotal >= defTotal ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(atkTotal) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(entry.attackerCasualties || 0) + '</span></div>' +
                    (entry.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.wounded) + '</span></div>' : '') +
                    (entry.lossSaved ? (() => { const bern = Math.min(entry.heroLossPct || 0, entry.lossReductionPct), sh = entry.lossReductionPct - bern, sBern = Math.round(entry.lossSaved * bern / Math.max(1, entry.lossReductionPct));
                        return (sh > 0 ? '<div class="logLine buff"><span>Schild −' + Math.round(sh) + ' %</span><span>+' + fmtD(entry.lossSaved - sBern) + '</span></div>' : '') +
                            (bern > 0 ? '<div class="logLine buff"><span>Held −' + Math.round(bern) + ' % Verluste</span><span>+' + fmtD(sBern) + '</span></div>' : ''); })() : '') +
                    gearHtml(entry.atkGear) +
                '</div>' +
                '<div class="logVsDivider">VS</div>' +
                '<div class="logSide">' +
                    '<div class="logSideLabel">Verteidiger' + (entry.defenderName ? ' · ' + whoLink(entry.defenderId || botIdByName[entry.defenderName], entry.defenderName) : '') + '</div>' +
                    '<div class="logLine"><span>Truppen' + (entry.verst ? ' (alle)' : '') + '</span><span>' + fmtD(entry.enemyTroops) + '</span></div>' +
                    verstZeilen(entry, entry.defenderName || 'Besitzer', gearHtml) +
                    (entry.defParts ? partLines(entry.defParts, true)
                      : '<div class="logLine"><span>Verteidigung</span><span>' + fmtD(entry.enemyDefense) + '</span></div>' +
                        '<div class="logLine buff"><span>Verteidigung-Buff</span><span>+' + fmtD(entry.defenseBuff) + '</span></div>') +
                    '<div class="logSum' + (defTotal > atkTotal ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(defTotal) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, (entry.defenderCasualties || 0) - (entry.enemyWounded || 0))) + '</span></div>' +
                    (entry.enemyWounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.enemyWounded) + '</span></div>' : '') +
                    gearHtml(entry.defGear) +
                '</div>' +
            '</div>' +
            (entry.killGold ? '<div class="logGold">Angriff: Gold +' + fmtBig(entry.killGold) + ' Münzen für getötete Truppen</div>' : entry.killGold === undefined && entry.attackGoldRate ? '<div class="logGold">Angriff: Gold +' + fmt1(entry.attackGoldRate) + ' pro getöteter Truppe</div>' : '') +
            (!entry.won && (ich ? ich.fled : entry.retreatSurvivors) ? '<div class="logRetreat">' + fmtNum(ich ? ich.fled : entry.retreatSurvivors) + (ich ? ' deiner' : '') + ' Truppen konnten fliehen und kehren zurück</div>' : '') +
            ((ich ? ich.wounded : entry.wounded) ? '<div class="logRetreat logWounded">' + fmtNum(ich ? ich.wounded : entry.wounded) + (ich ? ' deiner' : '') + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
            (entry.enemyWounded ? '<div class="logRetreat logWounded">' + escapeHtml(entry.defenderName || 'Der Gegner') + ' bringt ' + fmtNum(entry.enemyWounded) + ' Verwundete ins Krankenhaus</div>' : '') +
            '</details>';
        const meine = entry.meine || {}, ichUeb = ich && ich.rest !== undefined;   // (ältere Berichte: ohne rest/fled → die Zahlen des ganzen Kampfs)
        return karte(entry, entry.won ? 'win' : 'loss', entry.won ? 'level' : 'losses', [entry.won ? 'win' : 'loss', entry.capitalHolds ? 'Geplündert' : entry.won ? 'Sieg' : 'Niederlage'], T(entry.targetId),
            (entry.rolle === 'mit' ? 'Rally mit ' + escapeHtml(entry.fuehrer || '?') + ' · ' : angreiferZeilen(entry, gearHtml) ? entry.angreifer.length + ' Angreifer · ' : '') + 'von ' + T(entry.sourceId),
            logBalance(atkTotal, defTotal, icon('attack') + 'Du ' + fmtM(atkTotal), fmtM(defTotal) + ' ' + escapeHtml(entry.defenderName || 'Abwehr') + icon('defense')),
            [...(entry.rolle === 'mit' || ich ? verlustChips(meine.fallen, meine.wounded) : verlustChips(entry.attackerCasualties, entry.wounded)),
                entry.won ? ['troops', chipN(ichUeb ? ich.rest : entry.remaining) + ' übrig'] : (ichUeb ? ich.fled : entry.retreatSurvivors) > 0 && ['recall', chipN(ichUeb ? ich.fled : entry.retreatSurvivors) + ' fliehen heim'],
                ...beuteChips(entry, true), entry.killGold > 0 && ['coin', '+' + chipN(entry.killGold) + ' Gold für Kills', 'gut']], details);
    })(entry); } catch (err) { console.warn('Kampfbericht', err); return logRowHtml('loss', 'info', 'Kampfbericht', 'Dieser Bericht kann nicht angezeigt werden.', ''); }
    }).join('');
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i]; if (!e) return; row.dataset.key = combatLogKey(e);
        const isl = islandById[e.targetId ?? e.toId], lt = row.querySelector(':scope > .lt'); if (!isl || !lt) return;   // wo war das? Koordinaten + „Zeigen“ auf der Karte
        lt.insertAdjacentHTML('beforeend', '<small class="logOrt">' + coordText(isl.x, isl.y) + ' <button type="button" class="btn btn--ghost btn--sm" data-logzeigen="' + isl.id + '">Zeigen</button></small>'); });
    try { kampflogUmbauen(); } catch (err) { console.warn('Kampfbericht', err); }   // neuer Aufbau: ein Fenster je Spieler
}

// ===== Kampfbericht im neuen Aufbau (Alexanders Design): jeder Spieler ein eigenes Fenster, alle Fenster gleich aufgebaut
// (Truppen, Held, Grundverteidigung, Gesamt, Gefallen, Geflohen, Stufe, 2 Heldenplätze, Skills, Rohstoffe) – „Kampfdetails“ öffnet eine eigene Seite.
const kampflogUmbauen = (function () {
    const fmt = v => Math.round(v || 0).toLocaleString('de-DE'), kurz = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // (Balken: wie renderCombatLog)
    const ic = n => '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"></use></svg>';
    const zl = (a, b, kl, src) => '<div class="logLine' + (kl || '') + '"><span>' + a + (src ? '<small class="logSrc">' + src + '</small>' : '') + '</span><span>' + b + '</span></div>';
    const el = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
    const leerHeld = (n, t) => '<div class="logHero kl-keinheld"><span class="ghero"><span class="kl-leer">?</span><span><b>' + n + '</b><small>' + t + '</small></span></span></div>';
    const leerGear = (stufe, angr) => '<div class="logGear"><div class="logGearHead">' + (stufe || 'Stufe –') + '</div><div class="logGearItems">' +
        [['weapon', 'Waffe'], ['armor', 'Rüstung'], ['shield', 'Schild'], ['boots', 'Stiefel']].map(([i, n]) => '<span class="gslot"><span class="tile empty" title="' + n + ' – leer">' + ic(i) + '</span></span>').join('') +
        '</div><div class="logGearMeta">Skill Angriff – · Verteidigung –</div></div>';
    const textOf = n => (n && n.firstElementChild ? n.firstElementChild.textContent : '').trim();

    // ein Fenster auf den immer gleichen Aufbau bringen
    function normal(box, angr, roh, schutz, flucht) {                    // flucht: die Geflohenen DIESES Spielers (sonst 0)
        const lines = () => [...box.querySelectorAll(':scope > .logLine, :scope > .logSum, :scope > .logCasualty')];
        const truppen = lines().find(l => textOf(l).startsWith('Truppen'));
        if (truppen) truppen.firstElementChild.firstChild.textContent = 'Truppen';
        const mitHeld = !!box.querySelector('.logGear .logHero:not(.kl-keinheld)');
        if (!lines().some(l => textOf(l).startsWith('Held'))) (truppen || box.firstElementChild).insertAdjacentHTML('afterend', mitHeld ? zl('Held', 'dabei', '', 'steckt in „Eigene Werte“') : zl('Held', '+0', '', angr ? 'ohne Held' : 'zählt beim Verteidigen nicht'));
        const sum = box.querySelector(':scope > .logSum');
        if (!lines().some(l => textOf(l).startsWith('Grundverteidigung')) && sum) sum.insertAdjacentHTML('beforebegin', zl('Grundverteidigung', '0', ' kl-null', 'zählt nur beim Besitzer der Basis'));
        const cas = lines().filter(l => l.classList.contains('logCasualty'));
        if (!cas.length && sum) sum.insertAdjacentHTML('afterend', '<div class="logCasualty kl-null"><span>Gefallen</span><span>–</span></div>');   // (steht nicht im Bericht)
        const gefl = lines().find(l => textOf(l).startsWith('Geflohen'));
        if (!gefl) { const c = lines().filter(l => l.classList.contains('logCasualty')).pop(); (c || sum).insertAdjacentHTML('afterend', zl('Geflohen', fmt(flucht || 0))); }
        else if (flucht !== undefined) gefl.lastElementChild.textContent = fmt(flucht);   // (nur seine – nicht die der ganzen Rally)
        let gear = box.querySelector(':scope > .logGear');
        if (!gear) { box.insertAdjacentHTML('beforeend', leerGear('', angr)); gear = box.querySelector(':scope > .logGear'); }
        let hs = gear.querySelector('.logGearHeroes');
        if (!hs) { hs = el('<div class="logGearHeroes"></div>'); const meta = gear.querySelector('.logGearMeta'); meta ? gear.insertBefore(hs, meta) : gear.appendChild(hs); }
        const helden = hs.querySelectorAll('.logHero');
        if (helden.length === 0) hs.insertAdjacentHTML('beforeend', leerHeld('Kein Hauptheld', angr ? 'Ohne Held losgeschickt' : 'Beim Verteidigen einer Basis zählt kein Held'));
        if (hs.querySelectorAll('.logHero').length === 1) hs.insertAdjacentHTML('beforeend', leerHeld('Kein Zweitheld', 'Zweitheld · Werte und passive Fähigkeiten zu 50 %'));
        hs.querySelectorAll('.logHero').forEach(h => {                       // jeder Heldenplatz: dieselben 7 Zeilen
            const L = [...h.querySelectorAll(':scope > .logLine')].map(l => { const r = [textOf(l), l.lastElementChild.textContent.trim()]; l.remove(); return r; });
            const fest = ['Angriff', 'Verteidigung', 'Gefolge', 'Tempo'], rest = L.filter(l => !fest.includes(l[0]));
            while (rest.length < 3) rest.push(['Fähigkeit', '–']);
            h.insertAdjacentHTML('beforeend', [...fest.map(n => L.find(l => l[0] === n) || [n, '–']), ...rest.slice(0, 3)].map(([a, b]) => zl(a, b, b === '–' ? ' kl-null' : ' buff')).join(''));
        });
        box.querySelectorAll(':scope > .kl-rss').forEach(x => x.remove());
        box.insertAdjacentHTML('beforeend', '<div class="kl-rss"><div class="logGearHead">Rohstoffe</div>' +
            [['g', 'Gold'], ['h', 'Holz'], ['s', 'Stein'], ['e', 'Eisen']].map(([k, n]) => { const v = roh[k] || 0;
                return zl(n, (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)), v > 0 ? ' buff' : v < 0 ? ' buff malus' : ''); }).join('') +
            (schutz ? zl('<small class="logSrc">Burg schützt ' + fmt(schutz) + ' je Rohstoff</small>', '') : '') + '</div>');
        return box;
    }
    const rohTeil = (beute, anteil, vz) => ({ g: vz * Math.round(beute.g * anteil), h: vz * Math.round(beute.h * anteil), s: vz * Math.round(beute.s * anteil), e: vz * Math.round(beute.e * anteil) });

    // eine Seite (Angreifer oder Verteidiger) in Fenster je Spieler zerlegen
    function seiteUmbauen(side, angr, liste, e, beute, schutz, sieg, gesamt) {   // gesamt: die echte Summe dieser Seite (aus dem Bericht – nie aus dem Text, der ab 10 Mio. abgekürzt ist)
        const label = side.querySelector('.logSideLabel');
        const gruppe = el('<div class="kl-gruppe ' + (angr ? 'kl-a' : 'kl-v') + '"></div>');
        side.replaceWith(gruppe);
        const spieler = Array.isArray(liste) && liste.length ? liste : null;
        const sumEl = side.querySelector(':scope > .logSum');
        const fluchtAlle = !angr || sieg ? 0 : e.type === 'attack' ? e.retreatSurvivors || 0 : e.atkFled || 0;   // (Geflohene des Angreifers – verloren)
        if (!spieler) {                                                     // nur ein Spieler auf dieser Seite
            const roh = angr ? (sieg ? beute : {}) : rohTeil(beute, 1, -1);
            gruppe.appendChild(normal(side, angr, roh, angr ? 0 : schutz, fluchtAlle));
            return;
        }
        // Zeilen der einzelnen Spieler (angreiferZeilen / verstZeilen) einsammeln und aus dem Fenster nehmen
        const gearVon = {}; side.querySelectorAll(':scope > details.verst-det').forEach(d => { const n = d.querySelector('summary').textContent.split(':')[0].trim(); gearVon[n] = d.querySelector('.logGear'); d.remove(); });
        const namen = new Set(spieler.map(p => p.name));
        [...side.querySelectorAll(':scope > .logLine, :scope > .logCasualty')].forEach(l => { const t = textOf(l);
            if (t.startsWith('· davon') || t.startsWith('Verstärkung ·') || namen.has(t) || (!angr && (t === 'Deine' || t === (e.defName || '') || t === (e.defenderName || '') || t === 'Besitzer'))) l.remove(); });
        const andere = spieler.slice(angr ? 1 : 0), erster = angr ? spieler[0] : { name: label.textContent.replace(/^Verteidiger · /, '').replace(/ \+ .*$/, ''), n: e.eigen };
        const summeAndere = andere.reduce((s, p) => s + (p.n || 0), 0), alleT = summeAndere + (erster.n || 0), staerkeAndere = andere.reduce((s, p) => s + (p.k !== undefined ? p.k : p.n || 0), 0);
        // Fenster 1: Anführer / Besitzer (behält Held, Boni, Ausrüstung)
        label.innerHTML = (angr ? 'Angreifer · ' : 'Verteidiger · ') + escapeHtml(erster.name || '?') + ' <small style="text-transform:none;letter-spacing:0">(' + (angr ? 'Anführer' : 'Besitzer') + ')</small>';
        const tr = [...side.querySelectorAll(':scope > .logLine')].find(l => textOf(l).startsWith('Truppen')); if (tr) tr.lastElementChild.textContent = fmt(erster.n);
        if (sumEl) sumEl.lastElementChild.textContent = fmt(gesamt - staerkeAndere);
        // die Boni-Zeilen galten dem ganzen Kampf: im Fenster des Anführers steht nur, was ER mitbringt
        side.querySelectorAll(':scope > .logLine.buff').forEach(l => l.remove());
        const schon = angr ? 0 : Array.isArray(e.defParts) && e.defParts.length ? e.defParts[0][1] || 0 : (e.enemyDefense || 0) - andere.reduce((x, p) => x + (p.plus || 0), 0);   // (Grundverteidigung bzw. Verteidigung steht schon als eigene Zeile da – ohne Bericht-Teile steckt darin auch das Plus der Helfer)
        const eig = gesamt - staerkeAndere - (erster.n || 0) - schon;
        if (eig && tr) tr.insertAdjacentHTML('afterend', zl('Eigene Werte', (eig > 0 ? '+' : '−') + fmt(Math.abs(eig)), ' buff', angr ? 'Held, Skill Angriff, Titel, Forschung' : 'Rüstung, Skill Verteidigung, Mauer, Titel, Forschung'));
        if (angr && erster.fallen !== undefined) { const c = side.querySelector(':scope > .logCasualty:not(.wounded)'); if (c) c.lastElementChild.textContent = '−' + fmt(erster.fallen);
            const w = side.querySelector(':scope > .logCasualty.wounded'); if (w) { if (erster.wounded) w.lastElementChild.textContent = fmt(erster.wounded); else w.remove(); } }   // (nur seine – nicht die der ganzen Rally)
        if (!angr && e.type === 'attack') { const weg = andere.reduce((x, p) => x + (p.fallen || 0) + (p.wounded || 0), 0), c = side.querySelector(':scope > .logCasualty:not(.wounded)');   // Besitzer: ohne die Verluste der Helfer (die stehen in ihren Fenstern)
            if (c) c.lastElementChild.textContent = '−' + fmt(Math.max(0, (e.defenderCasualties || 0) - (e.enemyWounded || 0) - weg)); }
        gruppe.appendChild(normal(side, angr, angr ? (sieg ? rohTeil(beute, (erster.n || 0) / Math.max(1, alleT), 1) : {}) : rohTeil(beute, 1, -1), angr ? 0 : schutz, angr ? (erster.fled !== undefined ? erster.fled : fluchtAlle) : 0));
        // weitere Fenster: Rally-Mitglieder / Verstärkung
        for (const p of andere) {
            const b = el('<div class="logSide"><div class="logSideLabel">' + (angr ? 'Angreifer · ' : 'Verteidiger · ') + escapeHtml(p.name || '?') + ' <small style="text-transform:none;letter-spacing:0">(' + (angr ? 'Verbündeter' : 'Verstärkung') + ')</small></div>' +
                zl('Truppen', fmt(p.n)) + (p.k !== undefined && p.k !== p.n ? zl('Eigene Werte', (p.k > p.n ? '+' : '−') + fmt(Math.abs(p.k - p.n)), ' buff', angr ? 'Held, Skill Angriff, Titel, Forschung' : 'Skill Verteidigung, Titel, Forschung') : '') +
                '<div class="logSum' + (sumEl && sumEl.classList.contains('advantage') ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmt(p.k !== undefined ? p.k : p.n) + '</span></div>' +
                '<div class="logCasualty"><span>Gefallen</span><span>−' + fmt(p.fallen || 0) + '</span></div>' +   // (fallen enthält die Verwundeten schon nicht)
                (p.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmt(p.wounded) + '</span></div>' : '') + '</div>');
            const g = gearVon[p.name]; if (g) b.appendChild(g);
            gruppe.appendChild(normal(b, angr, angr && sieg ? rohTeil(beute, (p.n || 0) / Math.max(1, alleT), 1) : {}, 0, angr ? p.fled || 0 : 0));
        }
    }

    function spaeh(row, e) {
        const d = row.querySelector('details'); if (!d) return;
        const L = {}; d.querySelectorAll('.logLine').forEach(l => { L[textOf(l)] = l.lastElementChild; });
        const v = k => L[k] ? L[k].textContent.trim() : '–';
        const roh = [['Gold'], ['Holz'], ['Stein'], ['Eisen']].map(([n]) => { const c = L[n]; if (!c) return zl(n, '–', ' kl-null');
            const sm = c.querySelector('small'), haupt = c.cloneNode(true); if (haupt.querySelector('small')) haupt.querySelector('small').remove();
            return zl(n, haupt.textContent.trim(), ' buff', sm ? sm.textContent.replace(/[()]/g, '') : ''); }).join('');
        const name = (e.spy && e.spy.name) || v('Herr').split(' · ')[0];
        const box = el('<div class="logSide"><div class="logSideLabel">Gespäht · ' + escapeHtml(name) + '</div>' +
            zl('Truppen', fmt(e.troops)) + zl('Held', '+0', '', 'zählt beim Verteidigen nicht') + zl('Grundverteidigung', fmt(e.defense)) +
            '<div class="logSum"><span>Gesamt</span><span>' + fmt((e.troops || 0) + (e.defense || 0)) + '</span></div>' + '<div class="logCasualty kl-null"><span>Gefallen</span><span>–</span></div>' + zl('Geflohen', '–', ' kl-null') +
            leerGear('Stufe ' + fmt(e.spy && e.spy.lvl), false) + '</div>');
        normal(box, false, {}, 0);
        box.querySelector('.kl-rss').remove();
        const kh = box.querySelector('.kl-keinheld small'); if (kh && L['Helden']) kh.textContent = 'Zuhause: ' + v('Helden') + ' – zählen beim Verteidigen nicht';
        const meta = box.querySelector('.logGearMeta'); if (meta) meta.textContent = 'Fähigkeiten ' + v('Fähigkeiten');
        box.insertAdjacentHTML('beforeend', '<div class="kl-rss"><div class="logGearHead">Basis</div>' + zl('Friedensschild', v('Friedensschild')) + zl('Mauer', v('Mauer')) + zl('Burg', v('Burg')) + zl('Forschung', v('Forschung')) + '</div>' +
            '<div class="kl-rss"><div class="logGearHead">Rohstoffe</div>' + roh + '</div>');
        const sum = d.querySelector('summary').outerHTML;
        d.innerHTML = sum; const cmp = el('<div class="logCompare"><div class="kl-gruppe kl-v"></div></div>'); cmp.firstChild.appendChild(box); d.appendChild(cmp);
    }

    function umbauen() {
        const rows = [...combatLogListEl.children];
        rows.forEach((row, i) => { const e = combatLog[i]; if (!e) return;
            try {
                if (e.type === 'scout') return spaeh(row, e);
                if (e.type !== 'attack' && e.type !== 'botAttack') return;
                const cmp = row.querySelector('.logCompare'); if (!cmp) return;
                const r = e.plunderRoh || {}, beute = { g: e.plunder || 0, h: r.h || 0, s: r.s || 0, e: r.e || 0 };
                const sides = [...cmp.querySelectorAll(':scope > .logSide')]; if (sides.length < 2) return;
                const angrList = Array.isArray(e.angreifer) && e.angreifer.length > 1 ? e.angreifer : null;
                const bal = row.querySelector('.logBalTxt'), namen = L => L.map(p => escapeHtml(p.name || '?')).join(' + ');   // Balken: alle Namen, nicht nur „Du“
                const atkG = e.type === 'attack' ? (e.myTroops || 0) + (e.attackBuff || 0) : e.myTroops || 0;
                const defG = e.type === 'attack' ? (e.enemyTroops || 0) + (e.enemyDefense || 0) + (e.defenseBuff || 0) : (e.enemyTroops || 0) + (e.enemyDefense || 0);
                if (bal && angrList) { const s0 = bal.firstElementChild, sv = s0.querySelector('svg'); s0.innerHTML = (sv ? sv.outerHTML : '') + namen(angrList) + ' ' + kurz(atkG); }
                if (bal && Array.isArray(e.verst) && e.verst.length) { const s1 = bal.lastElementChild, sv = s1.querySelector('svg'); s1.innerHTML = kurz(defG) + ' ' + escapeHtml(e.defenderName || e.defName || 'Du') + ' + ' + namen(e.verst) + (sv ? sv.outerHTML : ''); }
                const vertList = Array.isArray(e.verst) && e.verst.length ? e.verst : null;
                const sieg = !!e.won;
                seiteUmbauen(sides[0], true, angrList, e, beute, 0, sieg, atkG);
                seiteUmbauen(sides[1], false, vertList, e, sieg ? beute : { g: 0, h: 0, s: 0, e: 0 }, e.plunderSafe || 0, sieg, defG);
            } catch (err) { console.warn('Kampflog-Design', err); }
        });
    }

    // „Kampfdetails“ öffnet eine eigene Seite
    const seite = el('<div class="kl-seite" hidden><div class="kl-kopf"><div class="emblem emblem--gold">' + ic('battlelog') + '</div><div class="kl-txt"><div class="overline" id="klArt">Kampfdetails</div><h3 id="klTitel">Bericht</h3></div>' +
        '<button class="btn-x" type="button" aria-label="Zurück" data-klzu>' + ic('close') + '</button></div>' +
        '<div style="max-width:560px;margin:0 auto"><button type="button" class="btn btn--ghost btn--sm kl-zurueck" data-klzu>' + ic('back') + 'Zurück zum Kampflog</button></div><div class="logList" id="klInhalt"></div></div>');
    document.body.appendChild(seite);
    function oeffnen(row, art) {
        const k = row.cloneNode(true), d = k.querySelector('details'); if (d) d.open = true;
        const inh = seite.querySelector('#klInhalt'); inh.innerHTML = ''; inh.appendChild(k);
        const b = row.querySelector('.lt b'), t = b ? b.cloneNode(true) : null; if (t && t.querySelector('.lbadge')) t.querySelector('.lbadge').remove();
        seite.querySelector('#klTitel').textContent = t ? t.textContent.trim() : 'Bericht';
        seite.querySelector('#klArt').textContent = art || 'Kampfdetails';
        seite.hidden = false; seite.scrollTop = 0;
    }
    seite.addEventListener('click', ev => { if (ev.target.closest('[data-klzu]')) { ev.preventDefault(); seite.hidden = true; } else if (ev.target.closest('.who-link, [data-profile]')) seite.hidden = true; });   // (Name antippen: das Profil soll nicht unsichtbar dahinter aufgehen)
    combatLogListEl.addEventListener('click', ev => { const s = ev.target.closest('summary'); if (!s || !combatLogListEl.contains(s)) return;
        ev.preventDefault(); ev.stopPropagation(); oeffnen(s.closest('.logRow'), s.textContent.trim()); }, true);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !seite.hidden) seite.hidden = true; });
    if (typeof battleLogCloseBtn !== 'undefined') battleLogCloseBtn.addEventListener('click', () => { seite.hidden = true; });

    return umbauen;
})();
combatLogListEl.addEventListener('click', e => {
    const b = e.target.closest('[data-logzeigen]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const isl = islandById[+b.dataset.logzeigen]; if (!isl) return;
    battleLogCloseBtn.click(); flyTo(isl.x, isl.y); setTimeout(() => openIslandPopup(isl), 380);
});

battleLogBtn.addEventListener('click', () => {
    if (isPanelOpen(battleLogPopup)) { battleLogCloseBtn.click(); return; }
    closeAllPopups();
    renderActiveMarches();
    renderCombatLog();
    openPanel(battleLogPopup);
    battleLogRefreshTimer = setInterval(refreshBattleLog, 1000);
});
function refreshBattleLog() {             // live countdowns + the rows' relative times ("vor 12 s") while the panel is open
    renderActiveMarches();
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i];
        if (!e || row.dataset.key !== combatLogKey(e)) return;
        const lv = row.querySelector(':scope > .lv'), t = timeAgoLabel(e.at);
        if (lv && lv.textContent !== t) lv.textContent = t; });
}
battleLogCloseBtn.addEventListener('click', () => {
    closePanel(battleLogPopup);
    clearInterval(battleLogRefreshTimer);
});
