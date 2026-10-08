// Keine Bergstöcke in den Gebieten (Alexander 7.10.: „keine Deko-Felsen“ – das Gebirge steht an den Grenzen; der alte Teil 01f ist raus):
// Märsche innerhalb eines Gebiets auf der Luftlinie, in ein Nachbargebiet über den Pass (Basis – Pass-Ende – Pass – Pass-Ende – Ziel).
//   node tests/browser/welt_felsen_test.js <vorschau>
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const VS = path.resolve(process.argv[2]);
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + VS + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof resFields !== 'undefined', null, { timeout: 90000, polling: 500 });
  const f = await p.evaluate(() => {
    const A = islandById[playerIslandId], C = (islandsByLandmass[A.landmassId] || []).find(i => i.type === 'tower' && i.id !== A.id && Math.hypot(i.x - A.x, i.y - A.y) > 20000);
    const br = bridges.find(q => q.a === A.landmassId || q.b === A.landmassId), anderes = br.a === A.landmassId ? br.b : br.a;
    const fern = (islandsByLandmass[anderes] || []).find(i => i.type === 'tower'), mp = marchPath(A, fern);
    const luft = Math.hypot(A.x - C.x, A.y - C.y);
    return { alt: [typeof WELT_FELSEN, typeof felsenListe, typeof felsAuf].filter(t => t !== 'undefined'), gerade: Math.abs(marschStrecke(A, C) - luft) < 1e-6, pfad: marchPath(A, C).length,
      passPfad: mp.length, ueberPass: [{ x: br.x1, y: br.y1 }, br.pass, { x: br.x2, y: br.y2 }].every(q => mp.some(m => Math.hypot(m.x - q.x, m.y - q.y) < 1)) };
  });
  ok(!f.alt.length, 'keine Bergstöcke in den Gebieten (alter Felsen-Code ganz raus, Gebirge nur an den Grenzen)', f);
  ok(f.gerade && f.pfad === 2, 'Marsch im eigenen Gebiet: Luftlinie', f);
  ok(f.passPfad >= 5 && f.ueberPass, 'Marsch ins Nachbargebiet: durch den Pass (Basis – Passanfang – Pass – Passende – Ziel)', f);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
