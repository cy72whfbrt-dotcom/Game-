const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2];
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(d); }); }).listen(8795);
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fehler = []; p.on('pageerror', e => fehler.push(e.message));
  await p.goto('http://127.0.0.1:8795/'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const altR = Math.random, altOn = window.botOnline, altSt = window.staerke; window.botOnline = () => true; Math.random = () => 0;
    try {
      const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size && islandById[botCapitalOf(b.id)] && !bundVon(b.id));
      const [L, M] = [bots[0], bots[1]]; botCoins[L.id] = 1e6;
      bundOp(L.id, { op: 'gruenden', name: 'Testamt', tag: 'TAX', offen: true }); const A = bundVon(L.id); bundOp(M.id, { op: 'beitreten', aid: A.id });
      window.staerke = w => w === L.id ? 1 : 1000;
      bundMitspielerRunde(Date.now());
      return { vorher: L.id, nachher: A.anf, neu: M.id, log: A.log[0].t };
    } finally { Math.random = altR; window.botOnline = altOn; window.staerke = altSt; }
  });
  console.log(JSON.stringify(r)); console.log((r.nachher === r.neu ? 'OK   ' : 'FEHLER ') + 'Amt an den viel stärkeren Mitspieler übergeben');
  console.log('Fehler:', fehler.length ? fehler : 'keine'); await b.close(); srv.close();
})();
