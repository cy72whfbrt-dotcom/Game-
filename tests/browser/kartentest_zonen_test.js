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
  const auf = D.paesse.map(p => { const g = D.grenzen[p.grenze], s = [0]; for (let i = 1; i < g.punkte.length; i++) s.push(s[i - 1] + Math.hypot(g.punkte[i][0] - g.punkte[i - 1][0], g.punkte[i][1] - g.punkte[i - 1][1]));
    const i0 = g.punkte.reduce((m, q, i) => Math.hypot(q[0] - p.x, q[1] - p.y) < Math.hypot(g.punkte[m][0] - p.x, g.punkte[m][1] - p.y) ? i : m, 0);
    const gerade = g.punkte.filter((q, i) => Math.abs(s[i] - s[i0]) < 15000).every(q => Math.abs(p.senk ? q[0] - p.x : q[1] - p.y) < 30);   // (entlang der Grenze ±15.000: so breit ist das Tor)
    return { id: p.id, ab: Math.round(abst(p, g)), gerade, paar: g.a === p.a && g.b === p.b }; });
  const jeGebiet = 2 * D.paesse.length / D.gebiete.length;
  ok(jeGebiet >= 2 && jeGebiet <= 4.5, 'Pässe: im Mittel 2–4,5 je Gebiet', { paesse: D.paesse.length, jeGebiet: jeGebiet.toFixed(2) });
  ok(auf.every(a => a.ab < 50 && a.paar), 'jeder Pass liegt genau auf der Grenze seiner zwei Gebiete', auf.filter(a => a.ab >= 50 || !a.paar));
  const lage = D.paesse.map(p => { const g = D.grenzen[p.grenze].punkte; let s = 0, bei = 0, bd = Infinity;
    for (let i = 1; i < g.length; i++) { s += Math.hypot(g[i][0] - g[i - 1][0], g[i][1] - g[i - 1][1]); const d = Math.hypot(g[i][0] - p.x, g[i][1] - p.y); if (d < bd) { bd = d; bei = s; } }
    return bei / s; });
  ok(lage.every(t => t > .35 && t < .65), 'jeder Pass sitzt mittig in seinem Grenzstück (zwischen den zwei Knoten)', lage.map(t => t.toFixed(2)).filter(t => t <= .35 || t >= .65));
  ok(auf.every(a => a.gerade), 'an jedem Pass läuft die Grenze gerade (waagrecht/senkrecht wie das Tor-Bild)', auf.filter(a => !a.gerade));
  const zoneVon = id => D.gebiete[id].zone;
  ok(D.paesse.every(p => p.stufe === Math.max(zoneVon(p.a), zoneVon(p.b)) && Math.abs(zoneVon(p.a) - zoneVon(p.b)) <= 1 && D.oeffnen[p.stufe] === p.stufe),
    'Stufe = Zone, in die der Pass führt (nur Nachbar-Ringe), öffnet von außen nach innen (Tag = Stufe)');
  const nb = {}; for (const p of D.paesse) { (nb[p.a] = nb[p.a] || []).push(p.b); (nb[p.b] = nb[p.b] || []).push(p.a); }
  const da = new Set([D.gebiete.find(g => g.zone === 1).id]), st = [...da]; while (st.length) for (const n of nb[st.pop()] || []) if (!da.has(n)) { da.add(n); st.push(n); }
  ok(da.size === D.gebiete.length && D.gebiete.every(g => nb[g.id]), 'jedes Gebiet hat einen Pass und ist von Zone 1 aus erreichbar', da.size);
  const drin = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const z4 = D.gebiete.filter(g => g.zone === 4), T = D.tempel.map(t => ({ ...t, im: drin(t.x, t.y, D.gebiete[t.gebiet].umriss),
    rand: Math.round(Math.min(...D.grenzen.filter(g => g.a === t.gebiet || g.b === t.gebiet).flatMap(g => g.punkte).map(q => Math.hypot(q[0] - t.x, q[1] - t.y)))),
    pass: Math.round(Math.min(...D.paesse.map(p => Math.hypot(p.x - t.x, p.y - t.y)))) }));
  ok(T.length === z4.length && z4.every(g => T.some(t => t.gebiet === g.id)) && T.every(t => t.im && t.rand > 40000 && t.pass > 40000) && T.some(t => t.art === 'tempel') && T.some(t => t.art === 'waechtertempel'),
    'Tempel: je Zone-4-Gebiet einer, mitten im Gebiet (weit weg von Grenzen und Pässen), beide Arten', T.map(t => [t.gebiet, t.art, t.rand, t.pass]));
  const gleich = [...new Set(D.grenzen.filter(g => g.b >= 0 && zoneVon(g.a) === zoneVon(g.b)).map(g => g.a + ',' + g.b))]
    .map(k => { const [a, b] = k.split(',').map(Number); return [k, D.paesse.filter(p => p.a === a && p.b === b).length]; });
  ok(gleich.length > 0 && gleich.every(([, n]) => n === 1), 'jede Grenze zwischen zwei Gebieten derselben Zone hat genau einen Pass', gleich.filter(([, n]) => n !== 1));
  // Gestreutes: Anzahl je Art, nichts auf Grenzen/Pässen/Tempeln, Startplätze gleich je Zone-1-Gebiet, Stufen steigen nach innen
  const gp = D.grenzen.filter(g => g.b >= 0).flatMap(g => g.punkte), weg = (o, liste, d) => liste.every(q => Math.hypot((q.x ?? q[0]) - o.x, (q.y ?? q[1]) - o.y) >= d);
  const arten = { startplaetze: D.startplaetze, felder: D.felder, barbaren: D.barbaren, ruinen: D.ruinen }, zahl = {};
  for (const [n, l] of Object.entries(arten)) zahl[n] = l.length;
  ok(zahl.startplaetze === 100 && zahl.felder >= 400 && zahl.barbaren >= 100 && zahl.ruinen >= 20, 'Gestreut: 100 Startplätze, ≥ 400 Felder, ≥ 100 Barbaren, ≥ 20 Ruinen', zahl);
  const schlecht = Object.entries(arten).flatMap(([n, l]) => l.filter(o => !weg(o, gp, 26000) || !weg(o, D.paesse, 45000) || !weg(o, D.tempel, 50000) || !drin(o.x, o.y, D.gebiete[o.gebiet].umriss)).map(o => n + '@' + o.x + ',' + o.y));
  ok(!schlecht.length, 'nichts davon auf Grenzen, Pässen oder Tempeln, jedes in seinem Gebiet', schlecht.slice(0, 5));
  const jeStart = D.gebiete.filter(g => g.zone === 1).map(g => D.startplaetze.filter(o => o.gebiet === g.id).length);
  ok(jeStart.every(n => n === jeStart[0]) && D.startplaetze.every(o => zoneVon(o.gebiet) === 1), 'Startplätze nur in Zone 1, gleich viele je Gebiet', jeStart);
  const mittelStufe = (l, z) => { const a = l.filter(o => zoneVon(o.gebiet) === z); return a.reduce((m, o) => m + o.stufe, 0) / a.length; };
  const fS = [1, 2, 3, 4].map(z => mittelStufe(D.felder, z)), bS = [1, 2, 3, 4].map(z => mittelStufe(D.barbaren, z));
  ok(fS.every((v, i) => !i || v > fS[i - 1]) && bS.every((v, i) => !i || v > bS[i - 1]) && D.barbaren.every(o => o.stufe >= 1 && o.stufe <= 25) && D.ruinen.every(o => zoneVon(o.gebiet) >= 2),
    'Stufen von Feldern und Barbaren steigen nach innen (Barbaren 1–25), Ruinen nur Zone 2–4', { felder: fS.map(v => v.toFixed(1)), barbaren: bS.map(v => v.toFixed(1)) });
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
        const welt = (x, y) => p.evaluate(([x, y]) => [(x - innerWidth / 2) / KT.cam.z + KT.cam.x, (y - innerHeight / 2) / KT.cam.z + KT.cam.y], [x, y]);
        await p.evaluate(() => KT.zoomStufe('mittel', 0, 0)); const vor = await welt(100, 300);   // Zwei Finger zoomen um den Punkt zwischen den Fingern
        const zwei = (typ, d) => cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: typ === 'touchEnd' ? [] : [{ x: 100 - d, y: 300, id: 1 }, { x: 100 + d, y: 300, id: 2 }] });
        await zwei('touchStart', 20); for (let d = 25; d <= 60; d += 5) await zwei('touchMove', d); await zwei('touchEnd', 0);
        const nach = await welt(100, 300), zm = await p.evaluate(() => KT.cam.z);
        ok(zm > 0.02 && Math.hypot(nach[0] - vor[0], nach[1] - vor[1]) * zm < 3, name + ' Handy: Zoom um den Punkt zwischen den Fingern', { zoom: zm, versatzPx: Math.round(Math.hypot(nach[0] - vor[0], nach[1] - vor[1]) * zm) });
        const ecken = [];                               // auf „Nah“ in jede Ecke schieben: die Ecke ist zu sehen
        for (const [ex, ey] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          await p.evaluate(([ex, ey]) => { const H = KT.daten.welt.halb; KT.zoomStufe('nah', ex * (H - 3000), ey * (H - 3000)); }, [ex, ey]);
          const eins = (typ, x, y) => cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: typ === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
          await eins('touchStart', 195, 422); for (let k = 1; k <= 10; k++) await eins('touchMove', 195 - ex * k * 15, 422 - ey * k * 15); await eins('touchEnd');
          ecken.push(await p.evaluate(([ex, ey]) => { const H = KT.daten.welt.halb, x = (ex * H - KT.cam.x) * KT.cam.z + innerWidth / 2, y = (ey * H - KT.cam.y) * KT.cam.z + innerHeight / 2;
            return x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight && /^nah/.test(document.getElementById('stufe').textContent); }, [ex, ey]));
        }
        ok(ecken.every(Boolean), name + ' Handy: auf „Nah“ bis in alle 4 Ecken schieben, die Ecke ist zu sehen', ecken);
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
