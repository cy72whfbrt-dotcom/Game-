// Pass-Timer (Alexander 7.10., Zonen wie RoK): die Pässe öffnen von außen nach innen – Zone 1 untereinander ab Tag 1, in Zone 2 ab
// Tag 2 … in Zone 4 (Wächter-Tempel) ab Tag 4, zur Mitte (Thron) ab Tag 5 – für Spieler und Mitspieler gleich. Vorher: Countdown-Schild am Tor auf der Karte, Hinweis „öffnet in …“, kein Weg. Nach dem
// Saison-Reset (saisonWelt) fängt die Zeit neu an. (Karte wie RoK: das Tor selbst ist das Pass-Tor-Bild aus 03b – gezählt
// werden die Countdown-Schilder; ohne die Bilder malt drawPasses zusätzlich das gezeichnete Torhaus.)
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof karteBilder === 'function' && karteBilder(), null, { timeout: 20000 }).catch(() => {});   // (Karten-Bilder geladen)
  const v = await p.evaluate(() => {
    const TAG = 86400000, out = { tage: KARTE_ZONEN.oeffnen };
    const tier = id => landmasses[id].tier, stufe = s => bridges.find(br => br.pass.stufe === s);
    const gw = bridges.find(br => tier(br.a) === 'guardian' && tier(br.b) === 'outer' || tier(br.b) === 'guardian' && tier(br.a) === 'outer');
    const th = bridges.find(br => tier(br.a) === 'throne' || tier(br.b) === 'throne');
    const offenJe = () => [1, 2, 3, 4, 5].map(s => { const br = stufe(s); return landmassesConnected(br.a, br.b) ? 1 : 0; }).join('');
    const aussen = tier(gw.a) === 'outer' ? gw.a : gw.b, innen = gw.a === aussen ? gw.b : gw.a;
    const bot = BOT_DEFS.find(x => !x.mensch).id;
    // Countdown-Schilder an den Toren zählen (alles sichtbar, alles im Bild)
    const zeichnen = () => { const dg = drawGatehouse, ex = isExplored, ft = ctx.fillText, z0 = mapState.zoom, ox = mapState.offsetX, oy = mapState.offsetY, w0 = viewW, h0 = viewH;
      let n = 0; const texte = [];
      drawGatehouse = () => { n++; }; isExplored = () => true; ctx.fillText = (t) => texte.push(String(t));
      mapState.zoom = .01; mapState.offsetX = 5e6; mapState.offsetY = 5e6; viewW = viewH = 1e8;
      try { drawPasses(null, Date.now()); } finally { drawGatehouse = dg; isExplored = ex; ctx.fillText = ft; mapState.zoom = z0; mapState.offsetX = ox; mapState.offsetY = oy; viewW = w0; viewH = h0; }
      return { n: karteBilder() ? texte.filter(t => /\d/.test(t)).length : n, text: texte[0] || '' }; };
    const stand = () => ({ wachter: landmassesConnected(aussen, innen), thron: landmassesConnected(th.a, th.b), wegIch: !!routeFor(aussen, innen, 'player'), wegBot: !!routeFor(aussen, innen, bot),
      bleibt: Math.round((passOpensAt(gw) - Date.now()) / 36e5), hinweis: noRouteHint(aussen, innen), karte: zeichnen(), offenJe: offenJe() });
    localStorage.setItem('openWaterWorldStart', String(Date.now() - TAG)); out.zu = stand();          // Tag 2: noch zu
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 3 * TAG - 60000)); out.tag4 = stand();   // Tag 4: Wächter offen, Thron noch zu
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 4 * TAG - 60000)); out.offen = stand();   // Tag 5: alles offen
    // Thron ab Tag 7: ein Mitspieler mit einem Turm in der Mitte greift den Thron an – vorher abgewiesen, ab Tag 7 unterwegs
    const Y = BOT_DEFS.find(x => !x.mensch && x.id !== bot), turm = (islandsByLandmass[0] || []).find(i => i.type === 'tower' && !islandOwnerOf(i.id));
    clearIslandOwner(turm.id); botOwnedIslands[Y.id].add(turm.id); islandTroops[turm.id] = 1e6;
    const thronAngriff = () => { const n0 = pendingAttacks.length, ok = launchAttack(turm.id, megaTempleId, Y.id, 1000); return { ok: !!ok, neu: pendingAttacks.length - n0 }; };
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 5 * TAG - 60000)); out.thron6 = { offen: Date.now() >= thronOffenAb(), ...thronAngriff() };   // Tag 6: Mitte erreichbar, Thron noch zu
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 6 * TAG - 60000)); out.thron7 = { offen: Date.now() >= thronOffenAb(), ...thronAngriff() };   // Tag 7: Thron offen
    saisonWelt(Date.now()); out.reset = stand(); out.start = Date.now() - parseInt(localStorage.getItem('openWaterWorldStart'), 10);   // neue Saison: wieder zu
    return out; });
  ok(Object.values(v.tage).join() === '1,2,3,4,5', 'Pass-Timer: Tag 1 … 5 von außen nach innen', v.tage);
  ok(!v.zu.wachter && !v.zu.thron && !v.zu.wegIch && !v.zu.wegBot && v.zu.offenJe === '11000', 'Tag 2: Pässe in Zone 1 und 2 offen, weiter innen zu – kein Weg hinein, für Spieler und Mitspieler', v.zu);
  ok(v.zu.bleibt === 48 && /öffnet in/.test(v.zu.hinweis), 'Tag 2: Hinweis „öffnet in …“ (noch 48 Std.)', v.zu.hinweis);
  ok(v.zu.karte.n > 0 && /\d/.test(v.zu.karte.text), 'Tag 2: Tor mit Countdown auf der Karte', v.zu.karte);
  ok(v.tag4.wachter && !v.tag4.thron && v.tag4.offenJe === '11110', 'Tag 4: Pässe zu den Wächter-Tempeln offen, zur Mitte noch zu', v.tag4);
  ok(v.offen.wachter && v.offen.thron && v.offen.wegIch && v.offen.wegBot && v.offen.karte.n === 0 && v.offen.offenJe === '11111', 'Tag 5: alle Pässe offen, kein Countdown mehr', v.offen);
  ok(!v.thron6.offen && !v.thron6.ok && v.thron6.neu === 0, 'Tag 6: der Thron ist noch zu – ein Angriff darauf wird abgewiesen (auch für Mitspieler)', v.thron6);
  ok(v.thron7.offen && v.thron7.ok && v.thron7.neu === 1, 'Tag 7: der Thron ist offen – der Angriff läuft', v.thron7);
  ok(!v.reset.wachter && !v.reset.thron && !v.reset.wegBot && v.reset.bleibt === 72 && v.start < 60000 && v.reset.karte.n > 0, 'Saison-Reset: Welt-Start neu, Pässe wieder 3 Tage zu', v.reset);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
