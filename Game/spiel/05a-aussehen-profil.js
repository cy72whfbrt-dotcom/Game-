// Teil 05a-aussehen-profil.js: Rahmen (Titel + Ring ums Wappen), Profil-Fenster
// ===== RAHMEN (Alexander 6.10.): Titel und Rahmen sind EIN Ding – ein Titel kommt immer mit seinem Ring ums Wappen. Nicht mehr zu
// kaufen: man bekommt sie am Saison-Ende (Platz 1–10, bis zum nächsten Saison-Ende) oder über die Mitte (Herrscher, Titel aus der Mitte).
// Was jemand vorher gekauft oder nach Rang/Erfolg hatte, bleibt seins (look.frames / look.titles, Mitspieler b.frames / b.titles).
// f: alte Rahmen-Kennung = id, t: alte Titel-Kennung (wer eins von beiden hatte, hat den Rahmen); rank / ach / buy: nur für alte Spielstände (lookMigrate)
const RAHMEN = [
    { id: 'bronze', name: 'Neuling', t: 'novice', frei: 1 },
    { id: 'silver', name: 'Silberritter', t: 'knight', rank: 1 }, { id: 'gold', name: 'Goldfürst', t: 'lord', rank: 2 }, { id: 'platin', name: 'Platingraf', t: 'count', rank: 3 },
    { id: 'diamond', name: 'Diamantherzog', t: 'duke', rank: 4 }, { id: 'master', name: 'Meister der Meere', t: 'master', rank: 5 }, { id: 'legend', name: 'Legende', t: 'legend', rank: 6 },
    { id: 'conq', name: 'Eroberer', t: 'conq', ach: 'cap100' }, { id: 'warlord', name: 'Kriegsherr', t: 'warlord', ach: 'cap1000' }, { id: 'wall', name: 'Standhaft', t: 'wall', ach: 'def25' },
    { id: 'emma', name: 'Gefürchtet', t: 'emma', ach: 'emma10' }, { id: 'slayer', name: 'Bezwinger', t: 'slayer', ach: 'boss1' }, { id: 'builder', name: 'Baumeister', t: 'builder', ach: 'city5' },
    { id: 'king', name: 'Herrscher der Meere', t: 'king', ach: 'throne' }, { id: 'throne', name: 'Thronhüter', t: 'keeper', buy: 'throne' },
    { id: 'saison', name: 'Saisonkrone', buy: 'pass' },                     // Saison-Pass (Premium, Stufe 40)
    // Saison-Rahmen: die besten 10 am Ende einer Welt-Saison – nur bis zum nächsten Saison-Ende (dann bekommen ihn die neuen)
    { id: 'sz1', name: 'Saison-Champion', platz: [1, 1] }, { id: 'sz2', name: 'Saison-Großadmiral', platz: [2, 3] },
    { id: 'sz4', name: 'Saison-Admiral', platz: [4, 5] }, { id: 'sz6', name: 'Saison-Kapitän', platz: [6, 10] }
];
const rahmenDef = id => RAHMEN.find(r => r.id === id) || null;
const rahmenPlatzText = r => 'Platz ' + r.platz[0] + (r.platz[1] > r.platz[0] ? '–' + r.platz[1] : '');
// Platz in der letzten Welt-Saison (Welt-Teil openWaterSaison.last.top – wer rechnet, schreibt ihn; 0 = nicht unter den besten 10)
function saisonPlatz(who) { const t = typeof saison !== 'undefined' && saison && saison.last && saison.last.top; return t ? t.findIndex(([w]) => lokalId(w) === who) + 1 : 0; }
function rahmenHat(who, r) {                         // hat who den Rahmen r? (Saison-Rahmen: nur, solange die Welt ihn so führt)
    if (!r) return false; if (r.frei) return true;
    if (r.platz) { const pl = saisonPlatz(who); return pl >= r.platz[0] && pl <= r.platz[1]; }
    if (who === 'player') return (look.frames || []).includes(r.id) || !!(r.t && (look.titles || []).includes(r.t)) || (r.buy === 'throne' && !!(look.bought && look.bought.throne)) || (!look.lookMig && lookOldUnlocked(r));
    const b = loadBotState()[who]; if (!b) return false;
    return (b.frames || []).includes(r.id) || !!(r.t && (b.titles || []).includes(r.t)) || (r.buy === 'throne' && !!b.throneLook);
}
// Mitte geht vor: der Herrscher trägt „Herrscher der Meere“, ein Titel aus der Mitte seinen eigenen Rahmen (gut: Gold, Straf-Titel: Rot) – kommen und gehen
function rahmenVon(who, gewaehlt) {                  // → { frame, title } – gewaehlt: der angelegte Rahmen (fehlt er oder ist er weg: Standard)
    if (rulerOwner() === who) return { frame: 'king', title: 'Herrscher der Meere' };
    const mt = titleOf(who); if (mt) return { frame: mt.good ? 'mgut' : 'mstraf', title: mt.name };
    const r = rahmenDef(gewaehlt); return rahmenHat(who, r) ? { frame: r.id, title: r.name } : { frame: 'bronze', title: 'Neuling' };
}
// Saison-Platz (Ende einer Welt-Saison, die besten 10): Kennung s<Saison>p<Platz> – bleibt als Eintrag für das Erfolg „Saison“, getragen wird der Saison-Rahmen
function saisonTitel(id) { const m = /^s(\d{1,4})p(\d{1,2})$/.exec(String(id || '')); if (!m) return null; const n = +m[1], pl = +m[2];
    return { id: m[0], name: pl === 1 ? 'Champion Saison ' + n : 'Saison ' + n + ' · Platz ' + pl, saison: n, platz: pl }; }
const saisonRahmenFuer = pl => RAHMEN.find(r => r.platz && pl >= r.platz[0] && pl <= r.platz[1]) || null;
function saisonTitelGeben(id) { if (!saisonTitel(id)) return; look.titles = [...new Set([...(look.titles || []), id])]; const r = saisonRahmenFuer(saisonTitel(id).platz); if (r) look.frame = r.id; saveLook(); try { renderLook(); } catch (e) {} }   // (der Saison-Rahmen gleich angelegt)
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
    if (x.platz) return false;
    if (x.buy) return !!(look.bought && look.bought[x.buy]);
    if (x.ach) { try { return achLookKept(x.ach) || !!(achClaimed[x.ach] || ACHIEVEMENTS.find(a => a.id === x.ach && a.val() >= a.goal)); } catch (e) { return false; } }
    return (x.rank || 0) <= bestRank();
}
function lookMigrate() {                            // once: everything unlocked by the old rule becomes owned
    if (look.lookMig) return; const alt = RAHMEN.filter(r => !r.frei && lookOldUnlocked(r)); look.frames = [...new Set([...(look.frames || []), ...alt.map(r => r.id)])];
    look.lookMig = 1; saveLook();
}
function saveLook() { store.set('openWaterLook', JSON.stringify(look)); }
function playerFrame() { return rahmenVon('player', look.frame).frame; }
function playerTitle() { return rahmenVon('player', look.frame).title; }
function marchSkinOf(who) { const id = who === 'player' ? look.march : who ? (loadBotState()[who] || {}).march : ''; return MARCH_SKINS.find(m => m.id === id) || MARCH_SKINS[0]; }
function renderLook() {                             // the profile header and its "Aussehen" line; choosing happens in the Aussehen sheet
    const fr = playerFrame();
    document.getElementById('pAvatarRing').dataset.frame = fr;
    document.getElementById('profileTitle').textContent = playerTitle();
    const cur = document.getElementById('lookNow');     // die eine Aussehen-Karte im Profil (Wappen + was du trägst)
    if (cur) cur.innerHTML = '<b>Aussehen · ' + escapeHtml(playerTitle()) + '</b><small>Wappen · Rahmen · ' + BAUSTILE[loadBaustil().style] + ' · Marsch ' + marchSkinOf('player').name + '</small>';
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
// Spielername überall derselbe (HUD, Profil, Rangliste, Einstellungen): fehlt er im Spielstand, der Name vom Konto –
// ohne Konto (Vorschau) „Statthalter“; gespeichert wird erst, was der Spieler selbst einträgt
if (!profileName.value.trim()) profileName.value = (window.__OW && !__OW.system && __OW.name) || 'Statthalter';
function naechsterRang() { return RANK_TIERS.find(t => t.min > ownedIslands.size) || null; }   // → { min, name } oder null (höchster Rang)
function renderProfile(live) {                  // live = the per-second refresh: numbers only, the editor and pickers stay put
    if (!live) renderCrestEditor();
    const home = islandById[playerIslandId];

    setText(document.getElementById('profileLevelBadge'), playerLvl);      // (live: jede Sekunde aus liveTick – geschrieben wird nur, was sich ändert)
    setText(document.getElementById('profileRank'), currentRank());
    const nr = window.__OW && !__OW.system && __OW.uid;                    // Kopf wie bei einem Herrscher: Macht und Spieler-Nummer
    liveHtml(document.getElementById('profileKennung'), icon('attack') + 'Macht <b>' + fmtCompact(powerOf(whoProfile('player'))) + '</b>' + (nr ? '<span>Nr. <b>' + nr + '</b></span>' : ''));
    liveHtml(document.getElementById('profileBund'), profilBundHtml('player'));   // dein Bündnis (antippen: Bündnis-Fenster)
    if (!live) renderLook();
    const nRang = naechsterRang();                        // statt Weltanteil (bei tausenden Basen immer „< 0,1 %“): wie weit bis zum nächsten Rang
    setText(document.getElementById('profileNextRank'), nRang ? nRang.name + ' ab ' + fmtNum(nRang.min) + ' Basen' : 'Höchster Rang');

    // XP sits in the profile header, always visible.
    const xpNeeded = xpNeededForLevel(playerLvl);
    setText(document.getElementById('xpLevelNum'), playerLvl);
    setText(document.getElementById('xpNums'), fmtNum(playerXp) + ' / ' + fmtNum(xpNeeded) + ' XP');
    document.getElementById('xpFill').style.width = Math.min(100, Math.round(playerXp / xpNeeded * 100)) + '%';
    const nx = playerLvl + 1, nM = levelRewardCoins(nx), nT = levelRewardTroops(nx), nG = levelRewardGems(nx);   // Belohnung beim nächsten Aufstieg (1 Münze, 2 Münzen …)
    liveHtml(document.getElementById('xpNext'), 'Belohnung für Stufe ' + nx + ': <b>+' + fmtCompact(nM) + '</b> ' + (nM === 1 ? 'Münze' : 'Münzen') + ', <b>+' + fmtCompact(nT) + '</b> ' + (nT === 1 ? 'Truppe' : 'Truppen') +
        (nG ? ', <b>+' + nG + '</b> ' + (nG === 1 ? 'Edelstein' : 'Edelsteine') : ''));

    setText(document.getElementById('kBases'), fmtNum(ownedIslands.size));   // (Truppen, Münzen, Edelsteine stehen oben im HUD)
    const hp = hourProduction('player');                 // alle Basen zusammen (mit Tempeln und Boni), pro Stunde – genau das kommt an
    setText(document.getElementById('kTroopsRate'), '+' + fmtStunde(hp.troops));
    setText(document.getElementById('kCoinsRate'), '+' + fmtStunde(hp.coins));

    const vorher = RANK_TIERS.filter(t => t.min <= ownedIslands.size).pop().min;   // Ring ums Wappen: Weg zum nächsten Rang
    const avatarRing = document.getElementById('pAvatarRing');
    if (avatarRing) avatarRing.style.setProperty('--progress', nRang ? Math.round((ownedIslands.size - vorher) / (nRang.min - vorher) * 100) : 100);

    const activeCount = playerRelevantAttackCount() + playerRelevantSendCount() + pendingScouts.length + pendingRetreats.length;
    liveHtml(profileStats,
        '<div class="statRow"><span>' + icon('star') + 'Fähigkeitspunkte</span><b>' + fmtNum(skillPoints) + '</b></div>' +
        (activeCount > 0 ? '<div class="statRow"><span>' + icon('hourglass') + 'Unterwegs</span><b>' + fmtNum(activeCount) + '</b></div>' : '') +
        (home ? '<div class="statRow"><span>' + icon('home') + 'Hauptstadt</span><b class="p5-heimat">' + coordText(home.x, home.y) +
            ' <button type="button" class="btn btn--ghost btn--sm" data-heimzeigen>Zeigen</button></b></div>' : ''));   // Koordinaten wie auf der Karte statt interner Nummern
    updateHudPlayer();
}
profileStats.addEventListener('click', e => {        // Hauptstadt „Zeigen“: Profil zu, Karte fährt hin
    if (!e.target.closest('[data-heimzeigen]')) return;
    profileCloseBtn.click(); recenterOnHome(true);
});

