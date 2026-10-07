// Basen als KI-Bild (Alexander 7.10.): Stufe 1–100 gleichmäßig auf 15 Bilder (Bild = ceil(Stufe·15/100)), ALLE gleich groß,
// darunter der Ring in der Besitzer-Farbe; ganz weit weiter Punkte (kein Bild).
//   node tests/browser/basen_bild_test.js <vorschau>
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof drawBasisBild === 'function' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 });
  await p.evaluate(() => { for (let i = 1; i <= 15; i++) basisBild(i); });
  await p.waitForFunction(() => BASIS_BILD.img.filter(Boolean).length === 15, null, { timeout: 30000, polling: 300 }).catch(() => {});
  const r = await p.evaluate(() => {
    const o = { nr: [1, 6, 7, 13, 14, 50, 93, 94, 100].map(basisBildNr), geladen: BASIS_BILD.img.filter(Boolean).length };
    const h = islandById[playerIslandId], fremd = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.id !== h.id);
    const z = 0.012; mapState.zoom = z; mapState.offsetX = viewW / 2 - h.x * z; mapState.offsetY = viewH / 2 - h.y * z;
    const breiten = [], dr = ctx.drawImage, st = ctx.stroke; let ringe = [];
    ctx.drawImage = function (im, x, y, w) { if (/basis_/.test(im.src || '')) breiten.push([im.src.match(/basis_(\d+)/)[1], Math.round(w)]); };
    ctx.stroke = function () { ringe.push(ctx.strokeStyle); };
    setScreen(ctx);
    const zeig = (isl, L) => { const alt = isl.neutralLevel, altL = islandLevels[isl.id]; isl.neutralLevel = L; islandLevels[isl.id] = L;
      fremd.x = h.x + 3000; fremd.y = h.y; const d = drawBasisBild(isl, ownerKeyOf(isl), z); isl.neutralLevel = alt; islandLevels[isl.id] = altL; return d; };
    const fx = fremd.x, fy = fremd.y;
    o.gezeichnet = [zeig(fremd, 1), zeig(fremd, 100)];
    ringe = []; o.heim = drawBasisBild(h, 'player', z); o.ringHeim = ringe.slice();
    o.weit = drawBasisBild(h, 'player', 0.002);
    fremd.x = fx; fremd.y = fy; ctx.drawImage = dr; ctx.stroke = st;
    o.breiten = breiten; return o;
  });
  ok(JSON.stringify(r.nr) === JSON.stringify([1, 1, 2, 2, 3, 8, 14, 15, 15]) && r.geladen === 15, 'Stufe 1–100 → Bild 1–15 (ceil(Stufe·15/100)), alle 15 Bilder geladen', r);
  ok(r.gezeichnet.every(Boolean) && r.breiten.length >= 3 && new Set(r.breiten.map(x => x[1])).size === 1 && r.breiten[0][0] === '01' && r.breiten[1][0] === '15', 'alle Basen gleich groß (Stufe 1 und 100 gleich breit), anderes Bild', r.breiten);
  ok(r.heim && r.ringHeim.includes('#3f86d8'), 'eigene Basis: blauer Ring darunter', r.ringHeim);
  ok(r.weit === false, 'ganz weit: kein Bild (Punkte wie bisher)', r.weit);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
