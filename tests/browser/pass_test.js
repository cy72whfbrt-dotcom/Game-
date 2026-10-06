// Pass-Timer (Alexander 6.10.): die Brücken zu den Wächter-Inseln und zur Thron-Insel öffnen 3 Tage nach dem Welt-Start – für
// Spieler und Mitspieler gleich. Vorher: Countdown-Schild am Tor auf der Karte, Hinweis „öffnet in …“, kein Weg. Nach dem
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
    const TAG = 86400000, out = { tage: PASS_OPEN_DAYS };
    const tier = id => landmasses[id].tier;
    const gw = bridges.find(br => tier(br.a) === 'guardian' && tier(br.b) === 'outer' || tier(br.b) === 'guardian' && tier(br.a) === 'outer');
    const th = bridges.find(br => tier(br.a) === 'throne' || tier(br.b) === 'throne');
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
      bleibt: Math.round((passOpensAt(gw) - Date.now()) / 36e5), hinweis: noRouteHint(aussen, innen), karte: zeichnen() });
    localStorage.setItem('openWaterWorldStart', String(Date.now() - TAG)); out.zu = stand();          // Tag 2: noch zu
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 3 * TAG - 60000)); out.offen = stand();   // nach 3 Tagen: offen
    saisonWelt(Date.now()); out.reset = stand(); out.start = Date.now() - parseInt(localStorage.getItem('openWaterWorldStart'), 10);   // neue Saison: wieder zu
    return out; });
  ok(v.tage.guardian === 3 && v.tage.throne === 3, 'Pass-Timer an: Wächter-Inseln und Thron-Insel nach 3 Tagen', v.tage);
  ok(!v.zu.wachter && !v.zu.thron && !v.zu.wegIch && !v.zu.wegBot, 'Tag 2: Pässe zu – kein Weg hinein, für Spieler und Mitspieler', v.zu);
  ok(v.zu.bleibt === 48 && /öffnet in/.test(v.zu.hinweis), 'Tag 2: Hinweis „öffnet in …“ (noch 48 Std.)', v.zu.hinweis);
  ok(v.zu.karte.n > 0 && /\d/.test(v.zu.karte.text), 'Tag 2: Tor mit Countdown auf der Karte', v.zu.karte);
  ok(v.offen.wachter && v.offen.thron && v.offen.wegIch && v.offen.wegBot && v.offen.karte.n === 0, 'Nach 3 Tagen: Pässe offen, kein Countdown mehr', v.offen);
  ok(!v.reset.wachter && !v.reset.thron && !v.reset.wegBot && v.reset.bleibt === 72 && v.start < 60000 && v.reset.karte.n > 0, 'Saison-Reset: Welt-Start neu, Pässe wieder 3 Tage zu', v.reset);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
