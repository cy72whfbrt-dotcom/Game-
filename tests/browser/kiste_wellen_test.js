// Heldenkiste (hc1): 6 Splitter auf 2–3 verschiedene Helden (Summe gleich, 5 Sterne fallen raus), im Fenster je Held eine Kachel ·
// zusammengelegte Wellen des Spielers aus zwei Basen: nach dem verlorenen Kampf geht jede zu IHRER Basis heim (Summe genau)
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2]; const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(d); }); }).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message)); await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  await p.waitForFunction(() => typeof HERO_CHESTS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const c = HERO_CHESTS.find(x => x.id === 'hc1'), voll = HEROES[0].id, hs = loadHeroes(); hs[voll].own = true; hs[voll].q = HERO_MAXQ; heroSave('player');
    const shSum = () => HEROES.reduce((a, h) => a + heroSt('player', h.id).sh, 0), sum0 = shSum(), anz = new Set(), zaehl = {};
    let summeOk = true, verschieden = true, vollDabei = false;
    for (let i = 0; i < 300; i++) { const g = heroChestOpen('player', c); anz.add(g.length); if (g.reduce((a, x) => a + x.n, 0) !== c.sh) summeOk = false;
      if (new Set(g.map(x => x.id)).size !== g.length) verschieden = false;
      for (const x of g) { if (x.id === voll) vollDabei = true; const rr = heroById(x.id).r; zaehl[rr] = (zaehl[rr] || 0) + 1; } }
    const sumOk = shSum() - sum0 === 300 * c.sh;
    gems = 1000; heroChestKauf(c, 1, null); const kach = document.querySelectorAll('#beuteFenster .bf-inhalt [data-held], #beuteFenster .bf-inhalt img.held, #beuteFenster .bf-inhalt .bk-held').length;
    const kachHtml = document.querySelector('#beuteFenster .bf-inhalt').innerHTML.slice(0, 400); beuteFensterZu();
    // Wellen: zwei eigene Basen → ein Ziel mit riesiger Besatzung, zusammengelegt (quellen), verloren
    const L = islandById[playerIslandId].landmassId, frei = islands.filter(i => i.id !== playerIslandId && i.landmassId === L && !islandOwnerOf(i.id) && !isCapital(i.id) && !bossAt(i.id));
    const [a2, z] = frei;
    ownedIslands.add(a2.id); z.neutralTroops = 1e9; neutralTroopOverrides[z.id] = 1e9; pendingRetreats.length = 0;
    const t0 = Date.now(), at = { sourceId: playerIslandId, targetId: z.id, rawTroops: 150000, startedAt: t0, resolveAt: t0, attackBonus: 0, quellen: [[playerIslandId, 100000], [a2.id, 50000]] };
    resolveAttack(at); const heim = pendingRetreats.map(x => [x.toId, x.troops]), flucht = retreatSurvivorsPreview(at);
    return { anz: [...anz], summeOk, verschieden, vollDabei, zaehl, sumOk, kach, kachHtml, heim, flucht, ids: [playerIslandId, a2.id] };
  });
  console.log(JSON.stringify(r));
  const ok = (n, x) => console.log((x ? 'OK   ' : 'FEHLER ') + n);
  ok('Heldenkiste: je Kiste 2 oder 3 Helden', r.anz.length === 2 && r.anz.every(n => n === 2 || n === 3));
  ok('Heldenkiste: Summe immer 6 Splitter, verschiedene Helden', r.summeOk && r.verschieden && r.sumOk);
  ok('Heldenkiste: Held mit 5 Sternen fällt raus', !r.vollDabei);
  ok('Heldenkiste: gewöhnlichere öfter', (r.zaehl[1] || 0) > (r.zaehl[4] || 0));
  ok('Belohnungs-Fenster: je Held eine Kachel', r.kach === 2 || r.kach === 3);
  const s = r.heim.reduce((a, x) => a + x[1], 0);
  ok('Wellen: jede zu ihrer Basis heim', r.heim.length === 2 && r.heim.some(x => x[0] === r.ids[0]) && r.heim.some(x => x[0] === r.ids[1]));
  ok('Wellen: keiner doppelt oder weg', s === r.flucht && r.flucht > 0);
  ok('keine Fehler auf der Seite', !fe.length); if (fe.length) console.log(fe);
  await b.close(); srv.close();
})();
