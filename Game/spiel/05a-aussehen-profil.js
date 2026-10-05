// Teil 05a-aussehen-profil.js: Titel und Rahmen kaufen, Profil-Fenster
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
    else { if (gems < r.gems) { flashHint('Zu wenig Edelsteine – Ring „' + r.name + '“ kostet ' + fmtNum(r.gems) + '.', 2500); return; }
        if (!gemsWirklich('ring:' + id, r.gems, b)) return;
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
        '<div class="statRow"><span>' + icon('star') + 'Fähigkeitspunkte</span><b>' + fmtNum(skillPoints) + '</b></div>' +
        '<div class="statRow"><span>' + icon('gem') + 'Edelsteine</span><b>' + fmtTile(Math.floor(gems)) + '</b></div>' +
        (activeCount > 0 ? '<div class="statRow"><span>' + icon('hourglass') + 'Unterwegs</span><b>' + fmtNum(activeCount) + '</b></div>' : '') +
        '<div class="statRow"><span>' + icon('home') + 'Heimat</span><b>' + homeLabel + '</b></div>');
    updateHudPlayer();
}

