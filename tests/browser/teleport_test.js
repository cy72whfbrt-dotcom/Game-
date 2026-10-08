// Teleport (Alexander 7.10., Merkliste 33), Vorschau ohne Server (Handy):
// A) Platz: freie Stellen im eigenen Gebiet gibt es; nicht an Basen, nicht im Gebirge, nicht in der Thron-Mitte; nur in Gebiete
//    hinter Pässen, deren Öffnungszeit vorbei ist (Besitzer des Tors egal); nicht, solange ein Marsch an der Hauptstadt hängt
// B) Tipp auf freies Feld → Menü (Teleportieren · Markierung · Truppen hierher); Teleportieren erst nach „Hierher teleportieren?“,
//    kostet 500 Edelsteine, die Basis steht danach dort (Truppen bleiben), zu wenig Edelsteine: nichts passiert
// C) Markierung → Wegmarken-Fenster, Truppen hierher → Armee-Fenster (bestehende Funktionen)
// D) Weltrechner: Befehl „teleport“ nur für echte Spieler, Gratis nur einmal im Anfängerschutz; neue Saison: alle Basen zurück
// E) Hauptstadt-Fenster: „Teleportieren“ führt zur Auswahl auf der Karte – Verlegen in einen eigenen Turm (50 Edelsteine) gibt es nicht mehr
// Bilder (Menü, nach dem Teleport) nur, wenn ein Ordner als 2. Argument kommt.
//   node tests/browser/teleport_test.js <vorschau> [bilder]
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 500) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', bilder = process.argv[3] || null, fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.addInitScript(() => {
    window.__befehle = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht() {}, befehl(art, d) { window.__befehle.push([art, d]); }, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof tpPruefen === 'function', null, { timeout: 60000, polling: 500 }).catch(() => {});
  const zu = () => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    document.querySelectorAll('body > div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }); closeAllPopups(); flashHint('', 1); };
  await p.evaluate(zu);
  const a = await p.evaluate(() => {
    const TAG = 864e5, o = {}, lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 10 * TAG));                 // alle Pässe offen (Tore unbesetzt)
    for (const br of bridges) clearIslandOwner(br.gateId);
    pendingAttacks.length = 0; pendingSends.length = 0; pendingRetreats.length = 0; fieldMarches.length = 0; barbMarches.length = 0; barbState.camps = [];
    const cap = islandById[playerIslandId], lm = landmasses[cap.landmassId], frei = [];
    for (let x = lm.x - lm.shapeMaxR; x < lm.x + lm.shapeMaxR; x += 2500) for (let y = lm.y - lm.shapeMaxR; y < lm.y + lm.shapeMaxR; y += 2500)
      if (gebietAn(x, y) === lm.id && !tpPruefen('player', x, y)) frei.push([x, y]);
    frei.sort((u, v) => Math.hypot(u[0] - cap.x, u[1] - cap.y) - Math.hypot(v[0] - cap.x, v[1] - cap.y));
    o.frei = frei.length; window.__ziel = frei.find(q => Math.hypot(q[0] - cap.x, q[1] - cap.y) > 15000) || frei[0];   // (ein Stück weg von der Hauptstadt)
    const nachbar = islandsByLandmass[lm.id].find(i => i.id !== cap.id && i.type === 'tower');
    o.basis = tpPruefen('player', nachbar.x + 500, nachbar.y);
    const br = bridges.find(q => q.a === lm.id || q.b === lm.id);
    o.gebirge = tpPruefen('player', br.pass.x, br.pass.y);
    const thron = landmasses.find(l => l.tier === 'throne'); o.thron = tpPruefen('player', thron.x + 30000, thron.y);
    // Gebiet hinter einem Pass mit Countdown: zu – Zeit vorbei: geht (auch mit unbesetztem Tor)
    const z2 = landmasses.find(l => l.zone === 2), stelle = (() => { for (let x = z2.x - z2.shapeMaxR; x < z2.x + z2.shapeMaxR; x += 3000) for (let y = z2.y - z2.shapeMaxR; y < z2.y + z2.shapeMaxR; y += 3000) if (gebietAn(x, y) === z2.id && !tpPruefen('player', x, y)) return [x, y]; })();
    o.z2offen = !!stelle;
    localStorage.setItem('openWaterWorldStart', String(Date.now()));
    o.z2zu = stelle ? tpPruefen('player', stelle[0], stelle[1]) : 'keine Stelle';
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 10 * TAG));
    pendingAttacks.push({ sourceId: nachbar.id, targetId: cap.id, rawTroops: 10, startedAt: Date.now(), resolveAt: Date.now() + 6e5, attackerBotId: BOT_DEFS[0].id });
    o.marsch = tpPruefen('player', __ziel[0], __ziel[1]); pendingAttacks.length = 0;
    o.selbst = tpPruefen('player', cap.x, cap.y); o.daneben = tpPruefen('player', cap.x + 1500, cap.y);   // (dieselbe Stelle: kein Umzug für Teleporter/Edelsteine)
    return o;
  });
  ok(a.frei >= 5, 'im eigenen Gebiet gibt es freie Stellen für die Hauptstadt', a.frei);
  ok(/Basis/.test(a.basis || ''), 'nicht direkt neben einer Basis', a.basis);
  ok(/Gebirge/.test(a.gebirge || ''), 'nicht im Gebirge/auf dem Pass', a.gebirge);
  ok(/Thron/.test(a.thron || '') || /Pass|Gebirge|Basis/.test(a.thron || ''), 'nicht in die Thron-Mitte', a.thron);
  ok(a.z2offen && /Pass/.test(a.z2zu || ''), 'Zone 2: Pass-Zeit vorbei → geht (Tor unbesetzt), Countdown läuft → „kein offener Pass“', a);
  ok(/Märsche/.test(a.marsch || ''), 'Angriff auf die Hauptstadt läuft → kein Teleport', a.marsch);
  ok(/schon hier/.test(a.selbst || '') && /schon hier/.test(a.daneben || ''), 'auf die eigene Stelle (oder 1500 daneben) → „Deine Hauptstadt steht schon hier.“', a);
  // B) Menü auf dem Handy
  const tippe = async () => p.evaluate(() => { const z = __ziel; mapState.zoom = Math.max(mapState.zoom, .02); mapState.offsetX = viewW / 2 - z[0] * mapState.zoom; mapState.offsetY = viewH / 2 - z[1] * mapState.zoom; requestRender();
    handleTap(viewW / 2, viewH / 2); return { auf: !document.getElementById('feldRing').hidden, knoepfe: [...document.querySelectorAll('#feldRing [data-fring]')].map(k => k.textContent.trim()) }; });
  await p.evaluate(() => { gems = 1000; updateHud(); });
  const m = await tippe(); await p.waitForTimeout(600);
  ok(m.auf && m.knoepfe.length === 3 && /Teleportieren/.test(m.knoepfe[0]) && /500/.test(m.knoepfe[0]) && /Markierung/.test(m.knoepfe[1]) && /Truppen/.test(m.knoepfe[2]), 'Tipp auf freies Feld: Menü mit Teleportieren (500), Markierung, Truppen hierher', m);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'teleport_menue.png') });
  const an = await p.evaluate(() => { const el = document.getElementById('anleitung'), h = el.hidden; el.hidden = false; const r = getComputedStyle(el).display; el.hidden = h; return r; });
  ok(an === 'none', 'Feld-Menü offen: Anfänger-Anleitung ausgeblendet', an);
  const t1 = await p.evaluate(() => { const vor = [islandById[playerIslandId].x, islandById[playerIslandId].y], g0 = gems; document.querySelector('#feldRing [data-fring="tp"]').click();
    return { gleich: islandById[playerIslandId].x === vor[0], text: document.querySelector('#feldRing [data-fring="tp"]').textContent, gems: g0 - gems }; });
  ok(t1.gleich && /Hierher teleportieren\?/.test(t1.text) && t1.gems === 0, 'erster Tipp: nur „Hierher teleportieren?“ – noch nichts passiert', t1);
  const t1b = await p.evaluate(() => { gemsArm.at = Date.now() - 6000; return { an: gemsArmed('teleport'), ohneUhr: !gemsArm.timer }; });   // (6 s später)
  ok(t1b.an && t1b.ohneUhr, 'Bestätigung bleibt offen, bis daneben getippt wird (nicht nach 4 s weg)', t1b);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'teleport_bestaetigen.png') });
  await p.waitForTimeout(600);
  const t2 = await p.evaluate(() => { const id = playerIslandId, tr = islandTroops[id], g0 = gems; const tp = document.querySelector('#feldRing [data-fring="tp"]'); if (!gemsArmed('teleport')) tp.click(); gemsArm.at = Date.now() - 1000; document.querySelector('#feldRing [data-fring="tp"]').click(); const c = islandById[playerIslandId];   // (unter Last ist die Bestätigung nach 4 s wieder aus: neu bestätigen, zweiter Tipp 1 s danach)
    return { id: playerIslandId === id, da: Math.hypot(c.x - __ziel[0], c.y - __ziel[1]) < 2, tr: islandTroops[playerIslandId] === tr, gems: g0 - gems, ort: !!inselOrt[id], lm: islandsByLandmass[c.landmassId].includes(c), zu: document.getElementById('feldRing').hidden }; });
  ok(t2.id && t2.da && t2.tr && t2.gems === 500 && t2.ort && t2.lm && t2.zu, 'zweiter Tipp: Hauptstadt steht dort, Truppen dabei, 500 Edelsteine weg', t2);
  const fx = await p.evaluate(() => { const f = battleFx.find(q => q.tp), c = islandById[playerIslandId];
    return f ? { da: f.x === c.x && f.y === c.y, alt: f.ax !== c.x || f.ay !== c.y, band: f.label + ' – ' + f.sub, ms: FX_MS, bild: TP_SAEULE.laedt === true, funken: f.funken.length } : null; });
  ok(fx && fx.da && fx.alt && fx.band === 'Hauptstadt – hierher teleportiert' && fx.ms === 2600 && fx.bild && fx.funken > 0, 'Teleport-Effekt: Lichtsäule am neuen Platz (Bild karte_lichtsaeule/ui_strahlen), alte Stelle gemerkt, Band, 2,6 s', fx);
  if (bilder) { await p.evaluate(() => { flashHint('', 1); }); await p.waitForTimeout(400);
    for (const t of [150, 500, 1000, 1800, 2400]) {               // Ablauf in 5 Bildern (Zeit fest eingestellt)
      await p.evaluate(t => { const f = battleFx.find(q => q.tp); if (f) { f.born = performance.now() - t; if (!battleFx.includes(f)) battleFx.push(f); } else window.__fxWeg = 1; requestRender(); }, t);
      await p.waitForTimeout(250); await p.screenshot({ path: path.join(bilder, 'teleport_fx_' + t + '.png') }); } }
  const t3 = await p.evaluate(() => { gems = 100; const c = islandById[playerIslandId], x = c.x, z = landmasses[c.landmassId]; let ziel = null;
    for (let dx = -40000; dx <= 40000 && !ziel; dx += 2500) for (let dy = -40000; dy <= 40000 && !ziel; dy += 2500) if (gebietAn(c.x + dx, c.y + dy) === z.id && !tpPruefen('player', c.x + dx, c.y + dy)) ziel = [c.x + dx, c.y + dy];
    const r = teleportOrt(ziel[0], ziel[1]); return { r, gleich: islandById[playerIslandId].x === x, gems }; });
  ok(!t3.r && t3.gleich && t3.gems === 100, 'zu wenig Edelsteine: kein Teleport, nichts abgezogen', t3);
  // C) Markierung, Truppen hierher
  await p.evaluate(() => { const c = islandById[playerIslandId]; __ziel = [c.x + 5000, c.y + 5000]; });
  await tippe(); const c1 = await p.evaluate(() => { document.querySelector('#feldRing [data-fring="mark"]').click(); const r = !document.getElementById('markerSheet').hidden; closeMarkerSheet(); return r; });
  await tippe(); const c2 = await p.evaluate(() => { document.querySelector('#feldRing [data-fring="arm"]').click(); return { blatt: !!armySheet && armySheet.mode === 'new', ring: document.getElementById('feldRing').hidden }; });
  ok(c1 && c2.ring, 'Markierung öffnet das Wegmarken-Fenster', c1);
  ok(c2.blatt, 'Truppen hierher öffnet das Armee-Fenster (neue Armee an dieser Stelle)', c2);
  await p.evaluate(() => closeArmySheet());
  const c3 = await p.evaluate(() => { feldRingZu(); handleTap(5, viewH / 2); const auf = !document.getElementById('feldRing').hidden; handleTap(5, viewH / 2); return { auf, zu: document.getElementById('feldRing').hidden }; });
  ok(c3.zu, 'daneben tippen schließt das Menü', c3);
  // D) Weltrechner
  const d = await p.evaluate(() => {
    const o = {}; if (!WELT.BEFEHLE || !WELT.BEFEHLE.teleport) { o.fehlt = 1; return o; }
    const M = BOT_DEFS.find(x => !x.mensch && botCapitalOf(x.id) !== null && islandById[botCapitalOf(x.id)].type === 'tower'), s = loadBotState()[M.id], cap = botCapitalOf(M.id), c = islandById[cap];
    const ziel = (() => { const z = landmasses[c.landmassId]; for (let dx = -40000; dx <= 40000; dx += 2500) for (let dy = -40000; dy <= 40000; dy += 2500) if (gebietAn(c.x + dx, c.y + dy) === z.id && !tpPruefen(M.id, c.x + dx, c.y + dy)) return [c.x + dx, c.y + dy]; })();
    const x0 = c.x; WELT.BEFEHLE.teleport(M.id, { x: ziel[0], y: ziel[1], gratis: true }); o.mitspieler = c.x === x0;   // Mitspieler (kein Mensch): nichts
    M.mensch = true; s.mensch = true; WELT.menschen[M.id] = {}; s.neuBis = Date.now() + 36e5; s.tpGratis = 0; const nt = neulingTruppen; neulingTruppen = () => 0;   // (Anfängerschutz: wenige Truppen)
    WELT.BEFEHLE.teleport(M.id, { x: ziel[0], y: ziel[1], gratis: true }); o.gratis = Math.hypot(c.x - ziel[0], c.y - ziel[1]) < 2 && s.tpGratis === 1;
    const x1 = c.x; WELT.BEFEHLE.teleport(M.id, { x: ziel[0] + 2500, y: ziel[1], gratis: true }); o.zweimal = c.x === x1;
    WELT.BEFEHLE.teleport(M.id, { x: 1e12, y: 0 }); o.kaputt = c.x === x1;
    s.tpGratis = 0; WELT.BEFEHLE.teleport(M.id, { x: c.x + 1000, y: c.y, gratis: true }); o.selbst = c.x === x1 && s.tpGratis === 0; neulingTruppen = nt;   // (eigene Stelle: abgelehnt, Gratis bleibt)
    o.welt = JSON.parse(localStorage.getItem('openWaterInselOrt') || '{}')[cap] !== undefined;
    inselOrt = {}; inselOrtAnwenden(); o.zurueck = c.x === c.ort0[0] && islandById[playerIslandId].x === islandById[playerIslandId].ort0[0];
    return o;
  });
  ok(!d.fehlt && d.mitspieler && d.gratis && d.zweimal && d.kaputt && d.selbst && d.welt, 'Weltrechner: nur echte Spieler, Gratis einmal, kaputte und eigene Stelle abgelehnt, steht im Welt-Teil', d);
  ok(d.zurueck, 'ohne Eintrag (neue Saison): jede Basis wieder an ihrem Platz', d);
  // E) Alexander 8.10.: kein Verlegen in einen eigenen Turm mehr – der Knopf im Hauptstadt-Fenster führt zum Teleport auf der Karte
  const e = await p.evaluate(() => { const g0 = gems, cap = playerIslandId, tr = islandTroops[cap]; let hinweis = ''; const fh = flashHint; flashHint = t => { hinweis = String(t); };
    openIslandPopup(islandById[cap]); const k = document.getElementById('teleportBtn'), o = { sicht: k.style.display !== 'none', text: k.textContent.trim() };
    k.click(); flashHint = fh;
    return Object.assign(o, { hinweis, zu: !isPanelOpen(popup), gems: g0 - gems, cap: playerIslandId === cap && islandTroops[cap] === tr,
      alt: ['teleportCapital', 'teleportMode', 'teleportBis'].filter(n => typeof window[n] !== 'undefined'), befehl: !!(WELT.BEFEHLE && WELT.BEFEHLE.hauptstadt) }); });
  ok(e.sicht && /^Teleport/.test(e.text) && !/Verlegen/.test(e.text), 'Hauptstadt-Fenster: runder Knopf „Teleport“ (kein „Verlegen“ mehr)', e);
  ok(e.zu && /freie Stelle/.test(e.hinweis) && /Teleportieren/.test(e.hinweis) && e.gems === 0 && e.cap, 'Tipp: Fenster zu, Hinweis auf die Teleport-Auswahl der Karte – nichts bezahlt, Hauptstadt bleibt', e);
  ok(!e.alt.length && !e.befehl, 'Verlegen für 50 Edelsteine ist weg (kein teleportCapital/teleportMode, kein Weltrechner-Befehl „hauptstadt“)', e);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
