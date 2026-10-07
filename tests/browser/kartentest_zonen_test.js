// Karten-Testdatei Zonen (werkzeuge/kartentest, LIESMICH 11c Punkt 30): Datenmodell stimmig (Zone 1–4 mit 10/8/6/4 Gebieten +
// Mitte, Ringe geschlossen, ~2 Pässe je Gebiet genau auf ihrer Grenze, dort gerade, alles von Zone 1 aus erreichbar, Stufe =
// innere Zone), Seite lädt alle Bilder, zeichnet auf allen Stufen ohne Fehler, Bilder fest in der Welt (gleiche Stücke und
// Weltgröße bei jedem Zoom), Kette an jeder Grenze, an jedem Tor eine Lücke; die Einzeldatei (data-URLs) ist < 8 MB und läuft.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const K = path.resolve(__dirname, '../../werkzeuge/kartentest'), arbeit = process.argv[3] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'kt-'));
(async () => {
  // 1) Datenmodell (ohne Browser)
  const D = new Function(fs.readFileSync(path.join(K, 'karte_daten.js'), 'utf8') + '; return KARTE_ZONEN;')();
  const zonen = [1, 2, 3, 4, 5].map(z => D.gebiete.filter(g => g.zone === z).length);
  ok(zonen.join() === '10,8,6,4,1', 'Gebiete: Zone 1–4 mit 10/8/6/4, dazu 1 Mitte', zonen);
  const geschlossen = D.gebiete.every(g => g.rand.length && g.umriss.length > 20 && g.rand.every(r => { const gr = D.grenzen[r < 0 ? -r - 1 : r]; return gr.a === g.id || gr.b === g.id; }));
  ok(geschlossen, 'jedes Gebiet ist ein Ring aus seinen Grenzen');
  const abst = (p, g) => g.punkte.reduce((m, q, i) => i ? Math.min(m, segAbst(p, g.punkte[i - 1], q)) : m, Infinity);
  function segAbst(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / ((dx * dx + dy * dy) || 1))); return Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy); }
  const auf = D.paesse.map(p => { const g = D.grenzen[p.grenze]; const gerade = g.punkte.filter(q => Math.hypot(q[0] - p.x, q[1] - p.y) < 14000).every(q => Math.abs(p.senk ? q[0] - p.x : q[1] - p.y) < 30);
    return { id: p.id, ab: Math.round(abst(p, g)), gerade, paar: g.a === p.a && g.b === p.b }; });
  const jeGebiet = 2 * D.paesse.length / D.gebiete.length;
  ok(jeGebiet >= 2 && jeGebiet <= 3.5, 'Pässe: im Mittel 2–3,5 je Gebiet', { paesse: D.paesse.length, jeGebiet: jeGebiet.toFixed(2) });
  ok(auf.every(a => a.ab < 50 && a.paar), 'jeder Pass liegt genau auf der Grenze seiner zwei Gebiete', auf.filter(a => a.ab >= 50 || !a.paar));
  ok(auf.every(a => a.gerade), 'an jedem Pass läuft die Grenze gerade (waagrecht/senkrecht wie das Tor-Bild)', auf.filter(a => !a.gerade));
  const zoneVon = id => D.gebiete[id].zone;
  ok(D.paesse.every(p => p.stufe === Math.max(zoneVon(p.a), zoneVon(p.b)) && Math.abs(zoneVon(p.a) - zoneVon(p.b)) <= 1 && D.oeffnen[p.stufe] === p.stufe),
    'Stufe = Zone, in die der Pass führt (nur Nachbar-Ringe), öffnet von außen nach innen (Tag = Stufe)');
  const nb = {}; for (const p of D.paesse) { (nb[p.a] = nb[p.a] || []).push(p.b); (nb[p.b] = nb[p.b] || []).push(p.a); }
  const da = new Set([D.gebiete.find(g => g.zone === 1).id]), st = [...da]; while (st.length) for (const n of nb[st.pop()] || []) if (!da.has(n)) { da.add(n); st.push(n); }
  ok(da.size === D.gebiete.length && D.gebiete.every(g => nb[g.id]), 'jedes Gebiet hat einen Pass und ist von Zone 1 aus erreichbar', da.size);
  // 2) Seite im Browser: Handy + Desktop, alle Stufen
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const pruefen = async (datei, name) => {
    for (const [art, opt] of [['Handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['Desktop', { viewport: { width: 1440, height: 900 } }]]) {
      const p = await (await b.newContext(opt)).newPage(), fe = []; p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (m.type() === 'error') fe.push(m.text()); });
      await p.goto('file://' + datei); await p.waitForFunction(() => window.KT && KT.bereit(), null, { timeout: 60000 });
      const r = await p.evaluate(() => { const o = {}, P = KT.daten.paesse;
        const fest = [];                                // Bilder fest in der Welt: was gezeichnet wird, hängt nicht vom Zoom ab
        const zeichne = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (...a) {
          if (this.canvas.id === 'karte' && a.length === 5) { const m = this.getTransform(); fest.push(Math.hypot(m.a, m.b) * a[3]); }
          return zeichne.apply(this, a); };
        const blick = z => { fest.length = 0; KT.cam.x = P[0].x; KT.cam.y = P[0].y; KT.cam.z = z; KT.zeichnen(); return fest.length; };
        const n1 = blick(.02), z1 = fest.map(f => f / .02), n2 = blick(.01), z2 = fest.map(f => f / .01);
        o.festN = [n1, n2]; o.fest = n1 > 0 && n2 >= n1 && z1.every(w => z2.some(u => Math.abs(u - w) < w * .001));   // (weiter draußen kommen nur Stücke dazu, keins wird größer)
        CanvasRenderingContext2D.prototype.drawImage = zeichne;
        for (const s of ['ganz', 'weit', 'mittel', 'nah']) { KT.zoomStufe(s, P[0].x, P[0].y); KT.zeichnen(); o[s] = document.getElementById('stufe').textContent; }
        const L = KT.objekte.liste, ketten = L.filter(o => /^kette_(quer|hoch)/.test(o.n));
        o.tore = L.filter(o => o.tor).length; o.ohneKette = KT.daten.grenzen.filter(g => g.b !== -1 && !ketten.some(k => Math.min(...g.punkte.map(q => Math.hypot(q[0] - k.x, q[1] - k.y))) < 6000)).map(g => g.id);
        o.imTor = P.filter(p => ketten.some(k => Math.hypot(k.x - p.x, k.y - p.y) < 6000)).map(p => p.id);
        return o; });
      ok(!fe.length, name + ' ' + art + ': lädt ohne Fehler', fe);
      ok(/^ganz weit/.test(r.ganz) && /^weit/.test(r.weit) && /^mittel/.test(r.mittel) && /^nah/.test(r.nah), name + ' ' + art + ': Stufen nah/mittel/weit/ganz weit', [r.ganz, r.weit, r.mittel, r.nah].map(t => t.split(' · ')[0]));
      ok(r.fest, name + ' ' + art + ': Bilder fest in der Welt (gleiche Weltgröße bei Zoom 0,02 und 0,01)', r.festN);
      ok(r.tore === KT_PASSE && !r.ohneKette.length && !r.imTor.length, name + ' ' + art + ': Kette an jeder Grenze, an jedem Pass ein Tor in einer Lücke', { tore: r.tore, ohneKette: r.ohneKette, imTor: r.imTor });
      if (art === 'Handy') {                          // iPhone: mit zwei Fingern bis „Nah“ (Karte zoomt, nicht die Seite), auf jeder Stufe Karte mit Bildern
        const cdp = await p.context().newCDPSession(p), finger = (typ, d) => cdp.send('Input.dispatchTouchEvent', { type: typ,
          touchPoints: typ === 'touchEnd' ? [] : [{ x: 195 - d, y: 422, id: 1 }, { x: 195 + d, y: 422, id: 2 }] });
        await p.evaluate(() => KT.zoomStufe('ganz', 0, 0));
        for (let n = 0; n < 6; n++) { await finger('touchStart', 20); for (let d = 25; d <= 180; d += 15) await finger('touchMove', d); await finger('touchEnd', 0); }
        const z = await p.evaluate(() => ({ z: KT.cam.z, seite: visualViewport.scale }));
        ok(z.z >= 0.05 && z.seite === 1, name + ' Handy: zwei Finger zoomen die Karte bis „Nah“, die Seite bleibt (iPhone)', z);
        if (/einzeln/.test(datei)) {                    // (nur hier: Bilder als data-URL, das Bild der Zeichenfläche ist lesbar)
          const bunt = await p.evaluate(() => ['ganz', 'weit', 'mittel', 'nah'].map(s => { const P = KT.daten.paesse[3]; KT.zoomStufe(s, P.x, P.y); KT.zeichnen();
            const c = document.getElementById('karte'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, farben = new Set();
            for (let i = 0; i < d.length; i += 4 * 997) farben.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
            return farben.size; }));
          ok(bunt.every(n => n >= 25), name + ' Handy: auf jeder Stufe Karte mit Bildern (viele Farben, nichts leer)', bunt);
        }
      }
      await p.close();
    } };
  const KT_PASSE = D.paesse.length;
  await pruefen(path.join(K, 'kartentest.html'), 'Kartentest');
  const ein = path.join(arbeit, 'kartentest_einzeln.html');
  execFileSync('node', [path.join(K, 'einzeln_bauen.js'), ein]);
  const mb = fs.statSync(ein).size / 1048576;
  ok(mb < 8, 'Einzeldatei < 8 MB', mb.toFixed(2));
  await pruefen(ein, 'Einzeldatei');
  await b.close();
})();
