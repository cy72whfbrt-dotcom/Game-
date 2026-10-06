// Teil 08b-burg-aussehen.js: Burg (Ausbau, Skin, Friedensschild) und Fenster Aussehen
// ===== DEINE BURG (tap the castle in the city): upgrade it, pick a skin, switch on a Friedensschild =====
var SKIN_DEFS = {
    standard: { id: 'standard', name: 'Standard', cost: 0, stone: null, roof: null },
    winter:   { id: 'winter',   name: 'Winterburg',     cost: 200, stone: ['#f6f9fd', '#cfd9e5', '#8797ab'], roof: ['#ffffff', '#c8dbef', '#6f86a3'] },
    wald:     { id: 'wald',     name: 'Waldfestung',    cost: 200, stone: ['#d9dcc3', '#a4aa86', '#63694b'], roof: ['#86b86f', '#3f7a3a', '#1f3d1c'] },
    schatten: { id: 'schatten', name: 'Schattenfeste',  cost: 300, stone: ['#8a8698', '#5d5868', '#2e2b36'], roof: ['#a585cf', '#5b2c6f', '#2a1033'] },
    gold:     { id: 'gold',     name: 'Goldene Feste',  cost: 500, stone: ['#f6e7c1', '#d6ba7f', '#8e6d35'], roof: ['#fff1b8', '#e2b54a', '#7a5414'] }
};
function loadSkins() { let v; try { v = JSON.parse(store.get('openWaterSkins')); } catch (e) {} return Object.assign({ own: ['standard'], active: 'standard' }, v || {}); }
function activeSkin() { const v = loadSkins(), d = SKIN_DEFS[v.active]; return d && d.stone ? d : null; }
function shieldStock() { let v; try { v = JSON.parse(store.get('openWaterShieldStock')); } catch (e) {} return Object.assign({ 2: 0, 8: 0, 24: 0 }, v || {}); }
function renderKeepSheet() { AUF.renderKeep(); const f = cityFehlt('keep'); if (f) setBtnLabel(document.getElementById('cityUpgradeBtn'), f); }   // die Burg-Stufe (aufbau.js)
function cityFehlt(id) {                           // fehlt nur etwas zum Bezahlen: der Knopf sagt, was („Fehlt: 2.000 Holz“) statt nur grau zu sein
    if (!AUF || cityBlocker(id)) return '';
    const c = loadCity(), k = AUF.stadtKosten(id, id === 'keep' ? AUF.burgStufe('player') : c.levels[id] || 0), r = AUF.rohVon('player') || {};
    const f = k.c > coins ? [k.c - coins, 'Münzen'] : ['h', 's', 'e'].filter(x => k[x] > (r[x] || 0)).map(x => [k[x] - (r[x] || 0), AUF.ROH_DEF[x].name])[0];
    return f ? 'Fehlt: ' + fmtCompact(Math.ceil(f[0])) + ' ' + f[1] : '';
}
// ===== AUSSEHEN: every look in one place - Wappen, Rahmen, Titel, Basis-Skin (+ Ring), Marsch-Skin. Only to buy (Gems or Thron-Punkte) or a title from the middle =====
var lkTab = 'frame';
function lkPrice(d) { if (d.buy === 'pass') return '<span class="lk-cost">' + icon('crown') + 'Saison-Pass</span>'; return d.tp ? '<span class="lk-cost' + ((throneState.pts || 0) < d.tp ? ' is-bad' : '') + '">' + icon('crown') + fmtNum(d.tp) + '</span>' : '<span class="lk-cost' + (gems < d.gems ? ' is-bad' : '') + '">' + icon('gem') + fmtNum(d.gems) + '</span>'; }
function lkCard(kind, d, prev, has, on, label) {     // one look: preview, name, and Angelegt / Anlegen / price
    return '<button type="button" class="skin-card lk-card' + (on ? ' on' : '') + (has ? '' : ' is-shop') + '" data-lk="' + kind + ':' + d.id + '">' + prev + (label === false ? '' : '<b>' + (label || d.name) + '</b>') +
        '<small>' + (on ? icon('check') + 'Angelegt' : has ? 'Anlegen' : lkPrice(d)) + '</small></button>';
}
function lkDef(kind, id) {
    if (kind === 'frame') return FRAMES.find(f => f.id === id); if (kind === 'title') return titelDef(id); if (kind === 'march') return MARCH_SKINS.find(m => m.id === id);
    if (kind === 'style') return BAUSTILE[id] ? Object.assign({ id, name: BAUSTILE[id] }, BAUSTIL_PRICE[id]) : null;
    if (kind === 'color') { const d = SKIN_DEFS[id]; return d ? { id, name: d.name, gems: d.cost } : null; } return null;
}
function lkHas(kind, id) { const d = lkDef(kind, id); if (!d) return false;
    if (kind === 'frame') return lookOwns('frames', d); if (kind === 'title') return lookOwns('titles', d); if (kind === 'march') return d.gems === 0 || (look.marchs || []).includes(id);
    if (kind === 'style') return loadBaustil().own.includes(id); return loadSkins().own.includes(id); }
function lkUse(kind, id) {                            // put on something you own
    if (kind === 'frame' || kind === 'title' || kind === 'march') { look[kind] = id; saveLook(); }
    else if (kind === 'style') { const v = loadBaustil(); v.style = id; store.set('openWaterBaustil', JSON.stringify(v)); }
    else if (kind === 'color') { const sk = loadSkins(); sk.active = id; store.set('openWaterSkins', JSON.stringify(sk)); BUILDING_SPRITES.clear(); }
    renderLook(); if (cityOpenId === '_keep') renderKeepSheet(); requestRender();
}
function lkBuy(kind, id, btn) {                       // Gems or Thron-Punkte; bought = put on at once
    const d = lkDef(kind, id); if (!d) return;
    if (lkHas(kind, id)) { lkUse(kind, id); return; }
    if (d.buy === 'pass') { flashHint('„' + d.name + '“ gibt es nur im Saison-Pass (Premium-Reihe) – unter „Events“.', 3000); return; }
    const cost = d.tp || d.gems || 0;
    if (d.tp ? (throneState.pts || 0) < cost : gems < cost) { flashHint('Zu wenig ' + (d.tp ? 'Thron-Punkte' : 'Edelsteine') + ' – „' + d.name + '“ kostet ' + fmtNum(cost) + '.', 2500); return; }
    if (!d.tp && !gemsWirklich('lk:' + kind + ':' + id, cost, btn)) return;
    if (d.tp) { throneState.pts -= cost; saveThrone(); } else gems -= cost;
    if (d.buy === 'throne') throneGive('player', 'look');                   // Thronhüter + Thron-Rahmen come together
    else if (kind === 'frame' || kind === 'title' || kind === 'march') { const k = kind + 's'; look[k] = [...new Set([...(look[k] || []), id])]; saveLook(); }
    else if (kind === 'style') { const v = loadBaustil(); v.own = [...new Set([...v.own, id])]; store.set('openWaterBaustil', JSON.stringify(v)); }
    else { const sk = loadSkins(); sk.own = [...new Set([...sk.own, id])]; store.set('openWaterSkins', JSON.stringify(sk)); }
    if (d.buy !== 'throne') lkUse(kind, id); else renderLook();
    updateHud(); saveGame(); sfx('coin'); flashHint('„' + d.name + '“ gekauft und angelegt.', 2500);
}
function renderLookTop() {                            // what you wear now + what you can pay with
    const el = document.getElementById('lkTop'); if (!el || document.getElementById('lookSheet').hidden) return;
    const fr = playerFrame(), mt = titleOf('player'), rl = rulerOwner() === 'player';
    liveHtml(el, '<span class="frame-ring lk-me" data-frame="' + fr + '"><img alt="" src="' + crestDataUrl(48) + '"></span>' +
        '<span class="lk-me-t"><b>' + escapeHtml(profileName.value || 'Du') + '</b><small>' + escapeHtml(playerTitle()) + (rl ? ' · Herrscher der Meere' : mt ? ' · ' + mt.name : '') + '</small></span>' +
        '<span class="lk-pay"><span class="pill pill--gem">' + icon('gem') + '<b>' + fmtCompact(Math.floor(gems)) + '</b></span><span class="pill pill--throne">' + icon('crown') + '<b>' + fmtCompact(throneState.pts || 0) + '</b></span></span>');
}
function lkMarchPrev() {                              // the march cards: a little column with your flag and the trail
    for (const cv of document.querySelectorAll('[data-march-prev]')) { const g = cv.getContext('2d'), sk = MARCH_SKINS.find(m => m.id === cv.dataset.marchPrev), K = cv.width / 110, W = 110, y = 38;   // drawn on a 110 x 55 grid
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(K, 0, 0, K, 0, 0);
        const tip = W - 22, at = d => ({ x: tip - 60 + d, y });
        g.strokeStyle = 'rgba(228,200,134,.4)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(4, y); g.lineTo(W - 4, y); g.stroke(); g.setLineDash([]);
        marchTrail(g, at, 60, sk, 900, 1);
        for (let i = 0; i < 4; i++) { const x = tip - 13 - Math.floor(i / 2) * 8.5, yy = y + (i % 2 ? 3.4 : -3.4);
            g.fillStyle = '#1a1d24'; g.fillRect(x - 1.7, yy - 3.4, 3.4, 6); g.fillStyle = '#ff8d82'; g.fillRect(x + .8, yy - 2.8, 1.8, 3.6);
            g.fillStyle = '#aab2bc'; g.beginPath(); g.arc(x, yy - 4.7, 1.6, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.arc(tip, y, 7.5, 0, Math.PI * 2); g.fillStyle = '#141820'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#ff8d82'; g.stroke(); drawGlyph(g, 'attack', tip, y, 10, '#ff8d82');
        marchFlag(g, tip, y, sk, 'player'); }
}
function renderLookSheet(live) {                     // live = jede Sekunde aus liveTick: der Wappen-Editor bleibt, wie er ist
    const sh = document.getElementById('lookSheet'); if (!sh || sh.hidden) return;
    const top = sh.scrollTop; renderLookTop();
    if (live && lkTab === 'crest') return;
    for (const b of document.querySelectorAll('#lkTabs [data-lk-tab]')) { const on = b.dataset.lkTab === lkTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    document.getElementById('crestPage').hidden = lkTab !== 'crest';
    const el = document.getElementById('lkPane'); el.hidden = lkTab === 'crest'; let h = '';
    if (lkTab === 'crest') { if (!live) renderCrestEditor(); }
    else if (lkTab === 'frame') { const fr = playerFrame(), img = '<img alt="" src="' + crestDataUrl(36) + '">';
        h = '<div class="skin-grid lk-grid">' + FRAMES.map(f => lkCard('frame', f, '<span class="frame-ring lk-frame" data-frame="' + f.id + '">' + img + '</span>', lkHas('frame', f.id), f.id === fr)).join('') + '</div>' +
            '<small class="keep-note">Dein Rahmen um Wappen und Profil – so sehen dich alle in der Rangliste. Der Thron-Rahmen kommt mit dem Titel „Thronhüter“.</small>'; }
    else if (lkTab === 'title') { const cur = playerTitle(), mt = titleOf('player'), rl = rulerOwner() === 'player', own = [...TITLES_P, ...(look.titles || []).map(saisonTitel).filter(Boolean)].filter(t => lkHas('title', t.id)), buy = TITLES_P.filter(t => !lkHas('title', t.id));
        h = '<div class="keep-h">Titel aus der Mitte</div><div class="lk-mid' + (rl ? ' is-ruler' : mt ? (mt.good ? ' is-good' : ' is-bad') : '') + '">' + icon('crown') + '<span><b>' + (rl ? 'Herrscher der Meere' : mt ? mt.name : 'Gerade keiner') + '</b><small>' +
                (rl ? 'Solange du den Mega-Tempel hältst · Ring Blutrot-Gold' : mt ? mt.desc + ' · gilt bis zum nächsten Herrscher' : 'Titel aus der Mitte vergibt der Herrscher – sie kommen und gehen.') + '</small></span></div>' +
            '<div class="keep-h">Deine Titel</div><div class="look-titles">' + own.map(t => '<button type="button" class="look-title' + (t.name === cur ? ' on' : '') + '" data-lk="title:' + t.id + '">' + (t.name === cur ? icon('check') : '') + t.name + '</button>').join('') + '</div>' +
            (buy.length ? '<div class="keep-h">Zu kaufen</div><div class="skin-grid lk-grid lk-grid--t">' + buy.map(t => lkCard('title', t, '<span class="lk-plate">' + t.name + '</span>', false, false, false)).join('') + '</div>' : '') +
            '<small class="keep-note">Dein Titel steht im Profil und in der Rangliste.</small>'; }
    else if (lkTab === 'base') { const bs = loadBaustil(), sk = loadSkins();
        h = '<div class="keep-h">Baustil</div><div class="skin-grid lk-grid">' + Object.keys(BAUSTILE).map(k => lkCard('style', lkDef('style', k), '<canvas data-bk-prev="' + k + '" width="120" height="132"></canvas>', lkHas('style', k), bs.style === k)).join('') + '</div>' +
            '<small class="keep-note">Gilt für alle deine Basen. Die Stufe zeigt der Stein, dich zeigen Dach und Fahne mit deinem Wappen.</small>' +
            '<div class="keep-h">Hauptstadt</div><div class="keep-shields lk-cap">' + [['huegel', 'Auf Sockel'], ['wasser', 'Wasserschloss']].map(([k, n]) => '<button type="button" class="btn btn--' + (bs.cap === k ? 'primary' : 'secondary') + ' btn--sm" data-lk-cap="' + k + '">' + n + '</button>').join('') + '</div>' +
            '<div class="keep-h">Farbe der Hauptstadt</div><div class="skin-grid lk-grid">' + Object.keys(SKIN_DEFS).map(k => lkCard('color', lkDef('color', k), '<canvas data-skin-prev="' + k + '" width="120" height="132"></canvas>', sk.own.includes(k), sk.active === k)).join('') + '</div>' +
            '<div class="keep-h">Ring um deine Basen</div>' + ringCardsHtml(RING_SKINS, true) +
            '<div class="ring-legend"><span><i style="--c:#ffd05a"></i>Gold · guter Titel</span><span><i style="--c:#e13030"></i>Rot · Straf-Titel</span><span><i class="blood" style="--c:#eb3c32"></i>Blutrot-Gold · Herrscher</span></div>' +
            '<small class="keep-note">Ein Titel aus der Mitte geht vor, solange er gilt.' + ({ ruler: ' Du trägst gerade Blutrot-Gold.', good: ' Du trägst gerade Gold.', bad: ' Du trägst gerade Rot.' }[(ringStatusByOwner().get('player') || {}).k] || '') + '</small>'; }
    else if (lkTab === 'march') { const cur = marchSkinOf('player').id;
        h = '<div class="skin-grid lk-grid lk-grid--m">' + MARCH_SKINS.map(m => lkCard('march', m, '<canvas data-march-prev="' + m.id + '" width="308" height="154"></canvas>', lkHas('march', m.id), m.id === cur)).join('') + '</div>' +
            '<small class="keep-note">So ziehen deine Truppen über die Karte: die Fahne mit deinem Wappen vorneweg, dahinter die Spur.</small>'; }
    if (!liveHtml(el, h) && live) return;                // live und nichts geändert: die Vorschau-Bilder bleiben stehen
    if (lkTab === 'base') { bkPreviews(); const tier = towerTier(islandLevels[playerIslandId] || 1);
        for (const cv of el.querySelectorAll('[data-skin-prev]')) { const g = cv.getContext('2d'), d = SKIN_DEFS[cv.dataset.skinPrev];
            g.setTransform(1.75, 0, 0, 1.75, 60, 90); g.lineJoin = 'round'; paintTowerTier(g, 'player', true, true, tier, d.stone ? d : null); } }
    if (lkTab === 'march') lkMarchPrev();
    sh.scrollTop = top;
}
function openLookSheet(tab) { lookMigrate(); if (tab) lkTab = tab; const sh = document.getElementById('lookSheet'); sh.hidden = false; renderLookSheet(); sh.scrollTop = 0; }
function closeLookSheet() { document.getElementById('lookSheet').hidden = true; renderCrestCard(); if (cityOpenId === '_keep') renderKeepSheet(); }
document.getElementById('lookSheet').addEventListener('click', e => {
    if (e.target.closest('[data-lk-close]')) return closeLookSheet();
    const t = e.target.closest('[data-lk-tab]'); if (t) { lkTab = t.dataset.lkTab; renderLookSheet(); return; }
    const cp = e.target.closest('[data-lk-cap]'); if (cp) { const v = loadBaustil(); v.cap = cp.dataset.lkCap; store.set('openWaterBaustil', JSON.stringify(v)); renderLookSheet(); requestRender(); return; }
    const c = e.target.closest('[data-lk]'); if (!c) return; const [kind, id] = c.dataset.lk.split(':');
    lkHas(kind, id) ? lkUse(kind, id) : lkBuy(kind, id, c);
});
setTimeout(lookMigrate, 0);                             // after the whole script: the old rank / Erfolg looks become owned
// ===== Aussehen wie in den großen Aufbau-Spielen (Rise of Kingdoms, Alexander 4.10.): Gebäude antippen → runde Knöpfe
// am Gebäude; das Fenster zeigt das Gebäude als Bild, die Voraussetzungen mit Haken/Kreuz und „hast / brauchst“.
// Nur die Anzeige – Kosten, Zeiten und Regeln sind dieselben wie vorher. =====
var cityPage = 'bau', cityRingId = null;
function cityNutz(id, lvl) {                       // die eigene Seite eines Gebäudes (Forschen, Heilen …) → [Name, Zeichen] oder null
    if (id === 'academy') return lvl || loadCity().foRun ? ['Forschen', 'flask'] : null;
    if (id === 'heroes') return lvl ? ['Helden', 'profile'] : null;   // erst gebaut: vorher keine Reiter (nur „Bauen“)
    if (!lvl) return null;
    return { forge: ['Schmieden', 'weapon'], hospital: ['Heilen', 'plus'], market: ['Handeln', 'market'], embassy: ['Verstärkung', 'bund'], wall: ['Helden', 'defense'] }[id] || null;   // (Mauer: die Verteidigungs-Helden)
}
function cityBildSpr(id, lvl) {                    // dasselbe Bild wie in der Stadt
    if (id === 'keep') return citySprite('keep', Math.min(4, Math.floor((lvl || 1) / 5)));
    const t = cityTierOf(lvl);
    if (id === 'wall') return citySprite('gatehouse', t);
    return t ? citySprite(id, t, id === 'heroes' ? Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3) : '') : citySprite('ghost', 0, id);
}
function cityBildSetzen(id, lvl) {                 // das Gebäude-Bild oben links im Fenster (nur neu gemalt, wenn sich die Stufe ändert)
    const el = document.getElementById('cityBIcon'), s = cityBildSpr(id, lvl), key = id + ':' + (id === 'keep' ? Math.floor((lvl || 1) / 5) : cityTierOf(lvl)) + ':' + s.c.width;
    if (el.dataset.bild === key && el.firstChild && el.firstChild.tagName === 'CANVAS') return;
    el.dataset.bild = key; el._lh = undefined;
    const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), f = Math.min(N / s.c.width, N / s.c.height) * 1.08, w = s.c.width * f, h = s.c.height * f;
    g.imageSmoothingQuality = 'high'; g.drawImage(s.c, (N - w) / 2, Math.min(N - h, (N - h) / 2 + N * .04), w, h);
    el.replaceChildren(cv);
}
function anfZeile(ok, ic, txt, val) {              // eine Voraussetzung: Zeichen, Text, (hast / brauchst), Haken oder Kreuz
    const [n, k] = Array.isArray(ic) ? ic : [ic];
    return '<div class="anf' + (ok ? ' is-ok' : ' is-bad') + '">' + icon(n, k) + '<span>' + txt + '</span>' + (val ? '<b>' + val + '</b>' : '') + '<i>' + icon(ok ? 'check' : 'close') + '</i></div>';
}
function anfKosten(k) {                            // Münzen und Rohstoffe: hast / brauchst
    if (!k) return ''; const r = AUF ? AUF.rohVon('player') || {} : {}, out = [];
    if (k.c) out.push(anfZeile(coins >= k.c, ['coin', 'icon--coin'], 'Münzen', fmtCompact(Math.floor(coins)) + ' / ' + fmtCompact(k.c)));
    if (AUF) for (const x of ['h', 's', 'e']) if (k[x]) out.push(anfZeile((r[x] || 0) >= k[x], [AUF.ROH_DEF[x].icon, 'roh-' + x], AUF.ROH_DEF[x].name, fmtCompact(Math.floor(r[x] || 0)) + ' / ' + fmtCompact(k[x])));
    return out.join('');
}
function cityAnfHtml(id, lvl, k) {                 // Voraussetzungen für die nächste Stufe (Burg, Bauarbeiter, Münzen, Rohstoffe)
    const c = loadCity(), rows = [];
    if (AUF && id !== 'keep') { const B = AUF.burgStufe('player'), need = !lvl ? AUF.BAU_AB_BURG[id] || 0 : B >= AUF.BURG_MAX ? 0 : lvl + 1;
        if (need > 1) rows.push(anfZeile(B >= need, 'castle', 'Burg Stufe ' + need)); }
    const frei = c.builds.length < citySlots(c);
    rows.push(anfZeile(frei, 'upgrade', frei ? 'Bauarbeiter frei' : 'Bauarbeiter beschäftigt (' + cityDef(c.builds[0].id).name + ')'));
    return '<div class="anf-h">Voraussetzungen</div><div class="anf-list">' + rows.join('') + anfKosten(k) + '</div>';
}
function citySeite(id, lvl) {                      // Reiter oben (Aufwerten | Forschen …) und welche Teile das Fenster zeigt
    const sh = document.getElementById('citySheet'), tabs = document.getElementById('cityTabs'), n = id === '_keep' ? null : cityNutz(id, lvl);
    if (!n) cityPage = 'bau';
    sh.classList.toggle('cs-keep', id === '_keep');                           // (Burg: Schild-Kasten nach unten)
    sh.classList.toggle('cs-nutz', !!n && cityPage === 'nutz'); sh.classList.toggle('cs-bau', !!n && cityPage === 'bau');
    tabs.hidden = !n;
    if (n) liveHtml(tabs, '<button type="button" data-cpage="bau"' + (cityPage === 'bau' ? ' class="on"' : '') + '>' + icon('upgrade') + 'Aufwerten</button><button type="button" data-cpage="nutz"' + (cityPage === 'nutz' ? ' class="on"' : '') + '>' + icon(n[1]) + n[0] + '</button>');
}
document.getElementById('cityTabs').addEventListener('click', e => { const b = e.target.closest('[data-cpage]'); if (b) { cityPage = b.dataset.cpage; renderCitySheet(); document.getElementById('citySheet').scrollTop = 0; } });
function renderCitySheet() {                       // (läuft auch jede Sekunde aus liveTick: geschrieben wird nur, was sich ändert)
    if (cityOpenId === 'keep') cityOpenId = '_keep';
    const id = cityOpenId; if (!id) return;
    cityRingZu();
    if (id === '_keep') { citySeite(id, 0); return renderKeepSheet(); }
    const c = loadCity(), def = cityDef(id), lvl = c.levels[id], max = lvl >= cityMaxLevel(id);
    document.getElementById('citySheet').hidden = false;
    citySeite(id, lvl);
    cityBildSetzen(id, lvl);
    setText(document.getElementById('cityBOver'), 'Gebäude');
    setText(document.getElementById('cityBName'), def.name);
    setText(document.getElementById('cityBLevel'), max ? 'Stufe ' + lvl + ' · höchste Stufe' : lvl ? 'Stufe ' + lvl + ' → ' + (lvl + 1) : 'Noch nicht gebaut');
    setText(document.getElementById('cityBDesc'), def.desc);
    const note = document.getElementById('cityBNote'), up = document.getElementById('cityUpgradeBtn'), sp = document.getElementById('citySpeedBtn');
    const bld = cityBuildOf(c, id), building = !!bld, blocker = cityBlocker(id);
    let cls, nh;
    if (building) { cls = 'notice notice--gold';
        nh = icon('hourglass') + '<span style="flex:1">Ausbau auf Stufe ' + bld.to + ' · noch <b id="cityBNoteTime"></b><div class="city-progress" style="margin-top:6px"><i></i></div>' + (typeof bundHilfeKnopf === 'function' ? bundHilfeKnopf('bau', id, bld.to, bld.endsAt) : '') + '</span>'; }
    else { cls = 'notice city-wirkung'; nh = icon('info') + '<span>' + cityEffectText(id, lvl) + '</span>'; }
    if (note.className !== cls) note.className = cls;
    liveHtml(note, nh);
    const cost = !max ? cityCost(id, lvl) : 0, kost = !max ? (AUF ? AUF.stadtKosten(id, lvl) : { c: cost }) : null;
    liveHtml(document.getElementById('cityBStats'), !max && !building ? cityAnfHtml(id, lvl, kost) : '');
    setBtnLabel(up, max ? 'Höchste Stufe' : (!building && cityFehlt(id)) || (lvl ? 'Aufwerten' : 'Bauen'));
    setText(document.getElementById('cityUpTime'), max ? '' : fmtDuration(cityTimeSec(id, lvl)));
    up.disabled = !!blocker || (AUF ? !AUF.kannZahlen('player', kost) : coins < cost);
    up.title = blocker || '';
    up.style.display = building ? 'none' : '';
    sp.style.display = building ? '' : 'none';
    if (building) renderCitySheetTimer();
    liveHtml(document.getElementById('cityBExtra'), cityExtraHtml(id, lvl));
}
// ---- die runden Knöpfe am angetippten Gebäude ----
function cityRingAuf(id) {
    const c = loadCity(), bid = cityBauId(id), lvl = bid === 'keep' ? c.levels.keep || 1 : c.levels[bid] || 0, n = id === '_keep' ? null : cityNutz(id, lvl), bau = cityBuildOf(c, bid);
    const max = bid === 'keep' ? lvl >= (AUF ? AUF.BURG_MAX : 25) : lvl >= cityMaxLevel(bid);
    const k = [];
    k.push(['bau', bau ? 'gem' : 'upgrade', bau ? 'Beschleunigen' : max ? 'Info' : lvl ? 'Aufwerten' : 'Bauen']);
    if (n) k.push(['nutz', n[1], n[0]]);
    cityRingId = id; cityOpenId = null; document.getElementById('citySheet').hidden = true;
    const el = document.getElementById('cityRing');
    el.innerHTML = k.map(([p, ic, t], i) => { const o = i - (k.length - 1) / 2;                 // im Bogen unter dem Gebäude
        return '<button type="button" class="cr-btn" data-cring="' + p + '" style="--x:' + Math.round(o * 92) + 'px;--y:' + Math.round(62 - o * o * 14) + 'px;--d:' + i * 40 + 'ms">' + icon(ic) + '<small>' + t + '</small></button>'; }).join('');
    el.hidden = false; el.style.visibility = 'hidden';                         // (cityFrame setzt die Stelle)
}
function cityRingZu() { cityRingId = null; const el = document.getElementById('cityRing'); if (el && !el.hidden) el.hidden = true; }
document.getElementById('cityRing').addEventListener('click', e => {
    const b = e.target.closest('[data-cring]'); if (!b || !cityRingId) return;
    cityPage = b.dataset.cring; cityOpenId = cityRingId; cityRingZu(); renderCitySheet(); document.getElementById('citySheet').scrollTop = 0;
});
