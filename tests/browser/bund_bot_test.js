// Mitspieler im Bündnis: entfernen (ohne Basis seit 1 Tag), Amt übergeben, öffnen/schließen, wechseln (Hauptstadt weit weg)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2];
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fehler = [];
  p.on('pageerror', e => fehler.push(e.message));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const out = {}, now = Date.now(); const altR = Math.random, altOn = window.botOnline;
    window.botOnline = () => true; Math.random = () => 0;   // (Zufall und „online“ für den Test festlegen)
    try {
      const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size && islandById[botCapitalOf(b.id)]);
      const cap = id => islandById[botCapitalOf(id)];
      // zwei weit auseinander: L (Anführer) und M (Mitglied); N nahe bei M führt ein zweites Bündnis
      let L = null, M = null, dMax = 0;
      for (const x of bots.slice(0, 60)) for (const y of bots.slice(0, 60)) { const d = Math.hypot(cap(x.id).x - cap(y.id).x, cap(x.id).y - cap(y.id).y); if (d > dMax) { dMax = d; L = x; M = y; } }
      const N = bots.filter(b => b !== L && b !== M).sort((x, y) => Math.hypot(cap(x.id).x - cap(M.id).x, cap(x.id).y - cap(M.id).y) - Math.hypot(cap(y.id).x - cap(M.id).x, cap(y.id).y - cap(M.id).y))[0];
      const K = bots.find(b => b !== L && b !== M && b !== N);   // Mitglied ohne Basis
      for (const w of [L, M, N, K]) { const a = bundVon(w.id); if (a) bundOp(w.id, { op: 'verlassen' }); botCoins[w.id] = 1e6; }
      out.gruendenA = bundOp(L.id, { op: 'gruenden', name: 'Testnord', tag: 'TNX', offen: true }) || 'ok';
      out.gruendenZ = bundOp(N.id, { op: 'gruenden', name: 'Testsued', tag: 'TSX', offen: true }) || 'ok';
      const A = bundVon(L.id), Z = bundVon(N.id);
      bundOp(M.id, { op: 'beitreten', aid: A.id }); bundOp(K.id, { op: 'beitreten', aid: A.id });
      A.dabei[M.id] = now - 13 * 3600000;                       // seit 13 Std. dabei
      A.leer = { [K.id]: now - 25 * 3600000 };                  // K hat seit 25 Std. keine Basis
      const kInseln = [...botOwnedIslands[K.id]]; botOwnedIslands[K.id].clear();
      // f) Amt übergeben: L viel schwächer als M? (nur für den Test: Stärke von L klein)
      const altSt = window.staerke; window.staerke = w => w === L.id ? 1 : 1000;
      out.vorher = { A: A.mit.slice(), Z: Z.mit.slice(), anf: A.anf };
      for (let i = 0; i < 3; i++) bundMitspielerRunde(now + i);
      window.staerke = altSt; for (const id of kInseln) botOwnedIslands[K.id].add(id);
      const A2 = bund.b[A.id], Z2 = bund.b[Z.id];
      out.nachher = { A: A2 ? A2.mit.slice() : null, Z: Z2 ? Z2.mit.slice() : null, anf: A2 && A2.anf, offenA: A2 && A2.offen };
      out.kRaus = !A2 || !A2.mit.includes(K.id);
      out.mGewechselt = !!Z2 && Z2.mit.includes(M.id) && (!A2 || !A2.mit.includes(M.id));
      out.log = A2 ? A2.log.slice(0, 5).map(x => x.t) : [];
      out.ids = { L: L.id, M: M.id, N: N.id, K: K.id };
      // öffnen/schließen: Bündnis künstlich fast voll
      const X = bund.b[Z.id]; const vorOffen = X.offen; const extra = bots.filter(b => !bundVon(b.id)).slice(0, Math.max(0, BUND.MAX - 1 - X.mit.length));
      for (const e of extra) bundOp(e.id, { op: 'beitreten', aid: X.id });
      bundMitspielerRunde(now + 10); out.zu = { mitglieder: X.mit.length, offenVorher: vorOffen, offenNachher: X.offen };
    } finally { Math.random = altR; window.botOnline = altOn; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log((r.kRaus ? 'OK   ' : 'FEHLER ') + 'Mitglied ohne Basis (1 Tag) entfernt');
  console.log((r.mGewechselt ? 'OK   ' : 'FEHLER ') + 'weit entfernter Mitspieler hat gewechselt');
  console.log((r.zu && r.zu.offenNachher === false ? 'OK   ' : 'FEHLER ') + 'fast voll → nur noch auf Anfrage');
  console.log('Fehler:', fehler.length ? fehler : 'keine'); await b.close(); srv.close();
})();
