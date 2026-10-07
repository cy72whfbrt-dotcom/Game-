// Stadtansicht als KI-Bild (Alexander 7.10.) – Handy + Desktop: das Stadtbild (bilder/stadt_gross.webp) deckt immer den ganzen
// Bildschirm (wischen/zoomen bleibt im Bild), jedes Gebäude hat sein Schild „Name / Stufe N“ genau über seiner Stelle (keine
// Überlappung), jedes ist per Wischen erreichbar; Bau läuft = Hammer + Uhr, ungebaut = „Bauen“ bzw. „ab Burg N“ mit Schloss,
// Tippen aufs Gebäude öffnet die runden Knöpfe. Übergang Karte → Stadt taucht mit der Karte ein und zurück, die Stadt blendet darüber.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof AUF !== 'undefined' && AUF, null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1);
      const c = loadCity(); Object.assign(c.levels, { quarry: 0, lumber: 0, forge: 0, heroes: 0, embassy: 0, academy: 1, hospital: 2, keep: 12 }); c.builds = []; saveCity();
      // 1) Übergang: die Karte taucht ein (CSS-Zoom auf dem Karten-Bild), danach die Stadt; zurück genauso
      let zooms = [];                                                     // jeder CSS-Zoom der Karte (unter Last kann er zwischen zwei Blicken schon vorbei sein)
      const echt = canvas.animate; canvas.animate = function (k, o) { zooms.push(k.map(x => x.transform).join(' → ')); return echt.call(this, k, o); };
      let ueber = false, zoomDa = 0; const zeigen = cityShow;            // die Stadt blendet schon ein, während die Karte noch eintaucht
      window.cityShow = () => { ueber = canvas.getAnimations().length > 0; zoomDa = mapState.zoom; zeigen(); };   // (beim Aufruf nachsehen – Blicke alle 50 ms verpassen es unter Last)
      openCity(); let n = 0;
      while ((cityBusy || cityView.hidden) && n++ < 120) await warte(50);
      window.cityShow = zeigen;
      const tauchAuf = zooms.join() === 'scale(1) → scale(' + CITY_TAUCH + ')'; zooms = [];
      o.auf = { tauchAuf, stadt: !cityView.hidden, frei: !cityBusy, kartenZoomWeg: !canvas.getAnimations().length, ueber, tauchKlein: CITY_TAUCH <= 2, nichtGanzNah: zoomDa > 0 && zoomDa < maxZoom * .6 };   // Kamera nur bis kurz vor die Basis (kein riesiges Symbol)
      // das Stadtbild ist geladen (1536 × 1024)
      { const t0 = Date.now(); while (!CITY_BILD.img && Date.now() - t0 < 10000) await warte(100); }
      o.bild = CITY_BILD.img ? CITY_BILD.img.naturalWidth + 'x' + CITY_BILD.img.naturalHeight : 'fehlt';
      await warte(400);
      // 2) Schilder an mehreren Kamera-Stellen: über dem Gebäude, keine Überlappung, das Bild deckt immer den ganzen Bildschirm
      const pruef = async (name, f) => { f(); cityCam.tx = cityCam.ty = undefined; cityFrame.drawn = 0; await warte(350);
        const W = innerWidth, H = innerHeight, c = cityCam, mitte = Object.fromEntries(Object.keys(CITY_ORTE).map(id => [id, W / 2 + (cityOrt(id).x - c.x) * c.z]));
        const kleben = cityNamen.every(s => mitte[s.id] !== undefined && Math.abs(s.x + s.w / 2 - mitte[s.id]) < 1.5);
        const deckt = cityNamen.some((s, i) => cityNamen.some((t, j) => j > i && s.x < t.x + t.w && t.x < s.x + s.w && s.y < t.y + t.h && t.y < s.y + s.h));
        const ox = W / 2 - c.x * c.z, oy = H / 2 - c.y * c.z, rand = W < 900 && H > 500 ? 75 : 0, voll = ox <= .5 && oy <= rand + .5 && ox + CITY_BILD_W * c.z >= W - .5 && oy + CITY_BILD_H * c.z >= H - rand - .5;   // Handy hochkant: unter HUD/Leiste darf es dunkel sein
        return { name, n: cityNamen.length, kleben, deckt, voll, burg: cityNamen.some(s => s.id === '_keep') }; };
      o.schilder = [];
      o.schilder.push(await pruef('start', () => {}));
      o.schilder.push(await pruef('links', () => { cityCam.x -= 400; cityCam.y += 60; }));
      o.schilder.push(await pruef('rechts', () => { cityCam.x += 900; }));
      o.schilder.push(await pruef('weit', () => { cityCam.z = .1; }));
      o.schilder.push(await pruef('nah', () => { cityCam.z = 3; cityCam.x = 150; cityCam.y = 300; }));
      // 3) jedes Gebäude per Wischen erreichbar: Kamera hin → sein Schild ganz im Bild; Tippen öffnet die runden Knöpfe
      o.erreichbar = []; o.tippen = [];
      for (const id of Object.keys(CITY_ORTE)) { cityCam.z = cityStartZoom(innerWidth, innerHeight); cityFocus(id, true); cityFrame.drawn = 0; await warte(120);
        const s = cityNamen.find(q => q.id === id); if (!s || s.x < 0 || s.y < 0 || s.x + s.w > innerWidth || s.y + s.h > innerHeight) o.erreichbar.push(id);
        const h = cityHitRects.find(q => q.id === id); cityRingZu(); cityCanvas.dispatchEvent(new MouseEvent('click', { clientX: h.cx, clientY: h.cy, bubbles: true }));
        if (cityRingId !== id) o.tippen.push(id + '→' + cityRingId); cityRingZu(); }
      // 4) was die Schilder sagen: Stufe, Bau (Hammer + Uhr), ungebaut „Bauen“, zu kleine Burg „ab Burg 5“
      { const C = loadCity(); C.builds = [{ id: 'hospital', to: 3, startedAt: Date.now(), endsAt: Date.now() + 90000 }];
        const st = id => cityStand(C, id); o.stand = { academy: st('academy').zeile, bau: st('hospital').bau ? st('hospital').zeile : 'kein Bau', leer: st('quarry').zeile };
        C.levels.keep = 1; o.stand.zu = st('embassy').zu + ':' + st('embassy').zeile; C.levels.keep = 12; C.builds = []; saveCity(); }
      cityCam.z = cityStartZoom(innerWidth, innerHeight); cityFocus('_keep', true);
      // 4) zurück zur Karte
      closeCity(); n = 0; while (cityBusy && n++ < 60) await warte(100);
      const tauchZu = zooms.join() === 'scale(' + CITY_TAUCH + ') → scale(1)'; delete canvas.animate;
      o.zu = { tauchZu, karte: cityView.hidden, frei: !cityBusy, kartenZoomWeg: !canvas.getAnimations().length };
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.auf.tauchAuf && r.auf.stadt && r.auf.frei && r.auf.kartenZoomWeg && r.auf.ueber && r.auf.tauchKlein && r.auf.nichtGanzNah, art + ': Karte → Stadt: die Kamera bleibt vor der Basis, die Karte taucht ein (höchstens 2×), die Stadt blendet darüber', r.auf);
    ok(r.bild === '1536x1024', art + ': Stadtbild geladen (1536 × 1024)', r.bild);
    ok(r.schilder[0].burg && r.schilder[0].n >= 3, art + ': Startbild zeigt die Burg mit Schild', r.schilder[0]);
    for (const s of r.schilder) ok(s.n > 0 && s.kleben && !s.deckt && s.voll, art + ': Schilder über ihrem Gebäude, ohne Überlappung, Bild deckt den Bildschirm (' + s.name + ')', s);
    ok(!r.erreichbar.length && !r.tippen.length, art + ': jedes Gebäude per Wischen erreichbar, Tippen öffnet seine Knöpfe', r);
    ok(r.stand.academy === 'Stufe 1' && /^\d+:\d\d$/.test(r.stand.bau) && r.stand.leer === 'Bauen' && r.stand.zu === 'true:ab Burg 5', art + ': Schilder: Stufe, Bau mit Uhr, „Bauen“, „ab Burg 5“', r.stand);
    ok(r.zu.tauchZu && r.zu.karte && r.zu.frei && r.zu.kartenZoomWeg, art + ': Stadt → Karte: die Karte kommt aus der Nähe zurück', r.zu);
    if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm' : 'd') + '_karte.png') });
    await ctx.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
