// Stadtansicht (Alexander 6.10.) – Handy + Desktop: Namensschilder kleben an ihrem Gebäude (nach Verschieben/Zoomen, nie an den
// Bildrand geschoben, keine Überlappung, die Burg hat Vorrang); draußen nur Landschaft der Weltkarte (keine Mühle/Höfe/Felder,
// Meer + Strand, wo die Karte Wasser hat, die Stadt immer auf Land); Übergang Karte → Stadt taucht mit der Karte ein und zurück.
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
      openCity(); let n = 0; while ((cityBusy || cityView.hidden) && n++ < 60) await warte(100);
      const tauchAuf = zooms.join() === 'scale(1) → scale(' + CITY_TAUCH + ')'; zooms = [];
      o.auf = { tauchAuf, stadt: !cityView.hidden, frei: !cityBusy, kartenZoomWeg: !canvas.getAnimations().length };
      await warte(400);
      // 2) Schilder an mehreren Kamera-Stellen: Mitte unter dem Gebäude, im Bild, keine Überlappung
      const pruef = async (name, f) => { f(); cityCam.tx = cityCam.ty = undefined; await warte(350);
        const W = innerWidth, H = innerHeight, mitte = Object.fromEntries(cityHitRects.map(h => [h.id, h.cx]));
        const kleben = cityNamen.every(s => mitte[s.id] !== undefined && Math.abs(s.x + s.w / 2 - mitte[s.id]) < 1.5);
        const imBild = cityNamen.every(s => s.x + s.w / 2 >= 0 && s.x + s.w / 2 <= W && s.y + s.h / 2 >= 0 && s.y + s.h / 2 <= H);
        const deckt = cityNamen.some((s, i) => cityNamen.some((t, j) => j > i && s.x < t.x + t.w && t.x < s.x + s.w && s.y < t.y + t.h && t.y < s.y + s.h));
        const burg = cityHitRects.find(h => h.id === '_keep'), burgDa = !burg || burg.cx < 0 || burg.cx > W || cityNamen.some(s => s.id === '_keep');
        return { name, n: cityNamen.length, kleben, imBild, deckt, burgDa }; };
      o.schilder = [];
      o.schilder.push(await pruef('start', () => {}));
      o.schilder.push(await pruef('links', () => { cityCam.x -= 260; cityCam.y += 60; }));
      o.schilder.push(await pruef('rechts', () => { cityCam.x += 520; }));
      o.schilder.push(await pruef('weit', () => { cityCam.z = .3; }));
      o.schilder.push(await pruef('nah', () => { cityCam.z = 2.4; cityCam.x = 150; cityCam.y = 300; }));
      cityCam.z = 1; cityFocus('_keep', true);
      // 3) draußen: keine gebauten Dinge, die Stadt auf Land, Meer wo die Karte Wasser hat
      const deko = cityDeco().map(d => d.kind);
      o.draussen = { gebaut: deko.filter(k => ['mill', 'house', 'well', 'hay', 'cart'].includes(k)), landMitte: cityAussen().land(CC, CC) };
      const heim = playerIslandId, kueste = islands.find(i => { const lm = landmasses[i.landmassId]; return [0, 1, 2, 3, 4, 5, 6, 7].some(a => !aufLand(lm, i.x + Math.cos(a * Math.PI / 4) * 1500, i.y + Math.sin(a * Math.PI / 4) * 1500)); });
      if (kueste) { playerIslandId = kueste.id; const A = cityAussen(); let wasser = 0;
        for (let x = -170; x <= 810; x += 40) for (let y = -170; y <= 810; y += 40) if (!A.land(x, y)) wasser++;
        let fehler = ''; try { cityPaintGround(); } catch (e) { fehler = e.message; }
        o.meer = { id: kueste.id, nass: A.nass, wasser, stadtLand: [[150, 150], [490, 490], [150, 490], [490, 150], [CC, CC]].every(([x, y]) => A.land(x, y)), fehler };
        playerIslandId = heim; cityPaintGround(); }
      // 4) zurück zur Karte
      closeCity(); n = 0; while (cityBusy && n++ < 60) await warte(100);
      const tauchZu = zooms.join() === 'scale(' + CITY_TAUCH + ') → scale(1)'; delete canvas.animate;
      o.zu = { tauchZu, karte: cityView.hidden, frei: !cityBusy, kartenZoomWeg: !canvas.getAnimations().length };
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.auf.tauchAuf && r.auf.stadt && r.auf.frei && r.auf.kartenZoomWeg, art + ': Karte → Stadt: die Karte taucht ein, dann die Stadt', r.auf);
    for (const s of r.schilder) ok(s.n > 0 && s.kleben && s.imBild && !s.deckt && s.burgDa, art + ': Schilder kleben am Gebäude, im Bild, ohne Überlappung (' + s.name + ')', s);
    ok(!r.draussen.gebaut.length && r.draussen.landMitte, art + ': draußen keine Mühle/Höfe/Karren, die Stadt steht auf Land', r.draussen);
    ok(!r.meer || (r.meer.nass && r.meer.wasser > 0 && r.meer.stadtLand && !r.meer.fehler), art + ': Hauptstadt an der Küste: Meer der Karte um die Stadt, Stadt auf Land', r.meer);
    ok(r.zu.tauchZu && r.zu.karte && r.zu.frei && r.zu.kartenZoomWeg, art + ': Stadt → Karte: die Karte kommt aus der Nähe zurück', r.zu);
    if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm' : 'd') + '_karte.png') });
    await ctx.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
