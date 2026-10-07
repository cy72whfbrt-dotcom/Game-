// Karten-Testdatei Zonen (werkzeuge/kartentest, LIESMICH 11c Punkt 30): Datenmodell stimmig (8 + 4 + 1 Gebiete, Ringe
// geschlossen, 20–25 Pässe genau auf ihrer Grenze, dort gerade, jedes Gebiet mit Pass), Seite lädt alle Bilder, zeichnet auf
// allen Stufen ohne Fehler, Kette an jeder Grenze, an jedem Tor eine Lücke; die Einzeldatei (data-URLs) ist < 8 MB und läuft.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const K = path.resolve(__dirname, '../../werkzeuge/kartentest'), arbeit = process.argv[3] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'kt-'));
(async () => {
  // 1) Datenmodell (ohne Browser)
  const D = new Function(fs.readFileSync(path.join(K, 'karte_daten.js'), 'utf8') + '; return KARTE_ZONEN;')();
  const zonen = [1, 2, 3].map(z => D.gebiete.filter(g => g.zone === z).length);
  ok(zonen.join() === '8,4,1', 'Gebiete: 8 in Zone 1, 4 in Zone 2, 1 Mitte', zonen);
  const geschlossen = D.gebiete.every(g => g.rand.length && g.umriss.length > 20 && g.rand.every(r => { const gr = D.grenzen[r < 0 ? -r - 1 : r]; return gr.a === g.id || gr.b === g.id; }));
  ok(geschlossen, 'jedes Gebiet ist ein Ring aus seinen Grenzen');
  const abst = (p, g) => g.punkte.reduce((m, q, i) => i ? Math.min(m, segAbst(p, g.punkte[i - 1], q)) : m, Infinity);
  function segAbst(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / ((dx * dx + dy * dy) || 1))); return Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy); }
  const auf = D.paesse.map(p => { const g = D.grenzen[p.grenze]; const gerade = g.punkte.filter(q => Math.hypot(q[0] - p.x, q[1] - p.y) < 14000).every(q => Math.abs(p.senk ? q[0] - p.x : q[1] - p.y) < 30);
    return { id: p.id, ab: Math.round(abst(p, g)), gerade, paar: g.a === p.a && g.b === p.b }; });
  ok(D.paesse.length >= 20 && D.paesse.length <= 25, 'Pässe: 20–25', D.paesse.length);
  ok(auf.every(a => a.ab < 50 && a.paar), 'jeder Pass liegt genau auf der Grenze seiner zwei Gebiete', auf.filter(a => a.ab >= 50 || !a.paar));
  ok(auf.every(a => a.gerade), 'an jedem Pass läuft die Grenze gerade (waagrecht/senkrecht wie das Tor-Bild)', auf.filter(a => !a.gerade));
  const arten = { gruen: [1, 1], blau: [1, 2], lila: [2, 3] }, zoneVon = id => D.gebiete[id].zone;
  ok(D.paesse.every(p => { const z = [zoneVon(p.a), zoneVon(p.b)].sort().join(); return arten[p.art].join() === z || (p.art === 'blau' && z === '2,2'); }), 'Pass-Farbe passt zu den Zonen (grün 1↔1, blau 1↔2 und 2↔2, lila 2↔Mitte)');
  ok(D.gebiete.every(g => D.paesse.some(p => p.a === g.id || p.b === g.id)) && D.gebiete.filter(g => g.zone === 1).every(g => D.paesse.some(p => p.art === 'blau' && (p.a === g.id || p.b === g.id))),
    'jedes Gebiet hat einen Pass, jedes Zone-1-Gebiet einen nach innen');
  // 2) Seite im Browser: Handy + Desktop, alle Stufen
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const pruefen = async (datei, name) => {
    for (const [art, opt] of [['Handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['Desktop', { viewport: { width: 1440, height: 900 } }]]) {
      const p = await (await b.newContext(opt)).newPage(), fe = []; p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (m.type() === 'error') fe.push(m.text()); });
      await p.goto('file://' + datei); await p.waitForFunction(() => window.KT && KT.bereit(), null, { timeout: 60000 });
      const r = await p.evaluate(() => { const o = {}, P = KT.daten.paesse;
        for (const s of ['ganz', 'weit', 'mittel', 'nah']) { KT.zoomStufe(s, P[0].x, P[0].y); KT.zeichnen(); o[s] = document.getElementById('stufe').textContent; }
        const L = KT.objekte.liste, ketten = L.filter(o => /^kette_(quer|hoch)/.test(o.n));
        o.tore = L.filter(o => o.tor).length; o.ohneKette = KT.daten.grenzen.filter(g => g.b !== -1 && !ketten.some(k => Math.min(...g.punkte.map(q => Math.hypot(q[0] - k.x, q[1] - k.y))) < 6000)).map(g => g.id);
        o.imTor = P.filter(p => ketten.some(k => Math.hypot(k.x - p.x, k.y - p.y) < 6000)).map(p => p.id);
        return o; });
      ok(!fe.length, name + ' ' + art + ': lädt ohne Fehler', fe);
      ok(/^ganz weit/.test(r.ganz) && /^weit/.test(r.weit) && /^mittel/.test(r.mittel) && /^nah/.test(r.nah), name + ' ' + art + ': Stufen nah/mittel/weit/ganz weit', [r.ganz, r.weit, r.mittel, r.nah].map(t => t.split(' · ')[0]));
      ok(r.tore === KT_PASSE && !r.ohneKette.length && !r.imTor.length, name + ' ' + art + ': Kette an jeder Grenze, an jedem Pass ein Tor in einer Lücke', { tore: r.tore, ohneKette: r.ohneKette, imTor: r.imTor });
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
