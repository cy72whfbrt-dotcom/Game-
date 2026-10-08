// Basen als KI-Bild (Alexander 7.10.): Stufe 1–100 gleichmäßig auf 15 Bilder (Bild = ceil(Stufe·15/100)), ALLE gleich groß,
// darunter auf jeder Zoomstufe das Namensschild (kein Ring, nichts springt beim Zoomen); ganz weit weiter Punkte (kein Bild).
// Mittlerer Zoom (Grafik-Bericht 7.10.): Basen bleiben sichtbar (mit Besitzer mind. 22 px, frei in echter Größe ab 10 px);
// Schilde nie übereinander; das Wappen an der Hauptstadt hält Funde fern (nicht halb dahinter).
// Freie Basen (Alexander 8.10.): kein Namensschild, nur eine kleine Stufen-Zahl am Bildrand; Antippen öffnet sie weiter.
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
    ctx.drawImage = function (im, x, y, w) { if (/basis_/.test(im.src || '')) breiten.push([im.src.match(/basis_(\d+)/)[1], Math.round(w)]); else if (im instanceof HTMLCanvasElement && BASIS_BILD.mip.some(m => m && m.includes(im))) breiten.push(['klein', Math.round(w)]); };
    ctx.stroke = function () { ringe.push(ctx.strokeStyle); };
    setScreen(ctx);
    const zeig = (isl, L) => { const alt = isl.neutralLevel, altL = islandLevels[isl.id]; isl.neutralLevel = L; islandLevels[isl.id] = L;
      fremd.x = h.x + 3000; fremd.y = h.y; const d = drawBasisBild(isl, ownerKeyOf(isl), z); isl.neutralLevel = alt; islandLevels[isl.id] = altL; return d; };
    const fx = fremd.x, fy = fremd.y;
    o.gezeichnet = [zeig(fremd, 1), zeig(fremd, 100)]; const breiten2 = breiten.slice();
    ringe = []; o.heim = drawBasisBild(h, 'player', 0.006); o.ringHeim = ringe.slice();   // (kein Ring mehr – das Schild auf jeder Stufe)
    o.weit = drawBasisBild(h, 'player', 0.001);
    breiten.length = 0; o.mittel = [drawBasisBild(h, 'player', 0.002), drawBasisBild(fremd, 'neutral', 0.002), drawBasisBild(fremd, 'neutral', 0.0016)];
    o.mittelBreit = breiten.map(x => x[1]);
    fremd.x = fx; fremd.y = fy; ctx.drawImage = dr; ctx.stroke = st;
    o.breiten = breiten2;
    // Namensschild: eigene und Bündnis echte Truppenzahl, fremde „?“ bis gespäht, frei ohne Wappen; ab mittel, ersetzt den Ring
    const bots = BOT_DEFS.filter(d => !d.mensch), F = bots[0].id, A = bots[1].id, frei = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.id !== h.id).slice(0, 4);
    const geben = (w, i, n) => { clearIslandOwner(i.id); botOwnedIslands[w].add(i.id); islandTroops[i.id] = n; };
    geben(F, frei[0], 900); geben(F, frei[1], 800); scoutedIslands.add(frei[1].id); geben(A, frei[2], 700);
    const bv = bundVerbuendet; bundVerbuendet = (x, y) => (x === 'player' && y === A) || (y === 'player' && x === A) || bv(x, y);   // (A im eigenen Bündnis)
    islandTroops[h.id] = 1234;
    o.schild = [h, frei[0], frei[1], frei[2], frei[3]].map(i => { const d = schildDaten(i); return [d.art, d.truppen, !!d.wer]; });
    bundVerbuendet = bv;
    let schilde = 0, ringe2 = 0, sr = null; ctx.drawImage = function (im, x, y, w, hh) { if (im instanceof HTMLCanvasElement && im.width >= 90) { schilde++; sr = { x, y, w }; } };
    ctx.stroke = function () { ringe2++; };
    const zn = 0.03; mapState.zoom = zn; mapState.offsetX = viewW / 2 - h.x * zn; mapState.offsetY = viewH / 2 - h.y * zn;
    drawBasisSchilder([h], zn); drawBasisBild(h, 'player', zn); const bw = BASIS_BREITE * zn;
    o.nah = { schilde, ringe: ringe2, breit: sr && sr.w <= bw * .7 + .5, mittig: sr && Math.abs(sr.x + sr.w / 2 - viewW / 2) < 1, unter: sr && sr.y > viewH / 2 };
    schilde = 0; drawBasisSchilder([h], 0.012); o.mittelSchild = schilde;
    ctx.drawImage = dr; ctx.stroke = st;
    // dicht (wie 75 % Zoom): kein Schild über einem anderen, freie mit Wimpel; die Tipp-Flächen sind genau die gezeigten
    const zd = 0.0072; mapState.zoom = zd; mapState.offsetX = viewW / 2 - h.x * zd; mapState.offsetY = viewH / 2 - h.y * zd;
    const vis = visibleIslands({ l: -1e9, t: -1e9, r: 1e9, b: 1e9 }), ss = basisSchilde(vis, zd), alle = vis.filter(i => i.type === 'tower' && islandOwnerOf(i.id) && (() => { const q = schildRect(i, zd); return q.x + q.w >= 0 && q.x <= viewW && q.y + q.h >= 0 && q.y <= viewH; })()).length;
    o.dicht = { gezeigt: ss.length, alle, frei: ss.filter(s => !islandOwnerOf(s.isl.id)).length, ueber: ss.some(a => ss.some(b => a !== b && overlap(a.r, b.r) > 0)), heim: ss.some(s => s.isl.id === h.id) };
    layoutBanners(vis, zd, null); o.dicht.tipp = ss.every(s => bannerHitRects.some(q => q.id === s.isl.id && q.x === s.r.x && q.y === s.r.y));
    // freie Basen: kein Schild, aber je eine kleine Stufen-Zahl (Abzeichen, kleiner als das Basis-Bild) – gezeichnet, und Antippen trifft die Basis
    const zs = stufenZahlen(vis, zd), bwd = BASIS_BREITE * zd, fz = zs[0];
    let gemalt = 0; ctx.drawImage = function (im) { if (zs.some(q => q.c === im)) gemalt++; }; drawBasisSchilder(vis, zd); ctx.drawImage = dr;
    o.zahl = { n: zs.length, frei: zs.every(q => !islandOwnerOf(q.isl.id)), klein: zs.every(q => q.c.cssW < bwd * .5 && q.c.cssH <= 16), gemalt: gemalt === zs.length,
      stufe: !!fz && SCHILD_MERK.has('z|' + anzeigeStufe(fz.isl.id) + '|' + Math.max(9, Math.min(12, Math.round(bwd * .1))) + '|' + dpr),
      tipp: !!fz && (pickIslandAtScreen(toSX(fz.isl.x), toSY(fz.isl.y)) || {}).id === fz.isl.id, weit: stufenZahlen(vis, BASIS_MIN_PX / BASIS_BREITE * .9).length };
    // Wappen an der Hauptstadt (weit): Tipp-Fläche, ein Fund daneben wird nicht halb dahinter gezeigt
    const zw = 0.003; mapState.zoom = zw; mapState.offsetX = viewW / 2 - h.x * zw; mapState.offsetY = viewH / 2 - h.y * zw;
    layoutBanners(visibleIslands({ l: -1e9, t: -1e9, r: 1e9, b: 1e9 }), zw, null);
    o.wappen = { tipp: (pickIslandAtScreen(viewW / 2 + 18, viewH / 2 - 18) || {}).id === h.id, fund: pickupVerdeckt({ x: viewW / 2 - 25, y: viewH / 2 - 20 }) };
    return o;
  });
  ok(JSON.stringify(r.nr) === JSON.stringify([1, 1, 2, 2, 3, 8, 14, 15, 15]) && r.geladen === 15, 'Stufe 1–100 → Bild 1–15 (ceil(Stufe·15/100)), alle 15 Bilder geladen', r);
  ok(r.gezeichnet.every(Boolean) && r.breiten.length >= 2 && r.breiten[0][1] === r.breiten[1][1] && r.breiten[0][0] === '01' && r.breiten[1][0] === '15', 'alle Basen gleich groß (Stufe 1 und 100 gleich breit), anderes Bild', r.breiten);
  ok(r.heim && !r.ringHeim.length, 'eigene Basis weit: Bild ohne Ring (das Schild bleibt)', r.ringHeim);
  ok(r.weit === false, 'ganz weit: kein Bild (Punkte wie bisher)', r.weit);
  ok(JSON.stringify(r.mittel) === '[true,true,false]' && r.mittelBreit[0] === 22 && r.mittelBreit[1] === 11, 'mittlerer Zoom: eigene Basis 22 px, freie in echter Größe (11 px), unter 10 px keine', [r.mittel, r.mittelBreit]);
  ok(r.dicht.gezeigt >= 1 && r.dicht.gezeigt <= r.dicht.alle && !r.dicht.ueber && r.dicht.heim && r.dicht.tipp, 'dicht: Schilde (nur mit Besitzer) nie übereinander, eigenes bleibt, Tipp-Flächen = gezeigte', r.dicht);
  ok(r.dicht.frei === 0 && r.zahl.n > 3 && r.zahl.frei && r.zahl.klein && r.zahl.gemalt && r.zahl.stufe && r.zahl.tipp && r.zahl.weit === 0,
    'freie Basen: kein Namensschild, nur kleine Stufen-Zahl am Bild (ganz klein keine), Antippen trifft die Basis', [r.dicht.frei, r.zahl]);
  ok(r.wappen.tipp && r.wappen.fund, 'weit: Wappen an der Hauptstadt antippbar, Fund daneben nicht halb dahinter', r.wappen);
  ok(JSON.stringify(r.schild) === JSON.stringify([['player', '1.234', true], ['bot', '?', true], ['bot', '800', true], ['ally', '700', true], ['neutral', '?', false]]),
    'Namensschild: eigene und Bündnis echte Truppen, fremde „?“ bis gespäht, frei ohne Wappen', r.schild);
  ok(r.nah.schilde === 1 && r.nah.ringe === 0 && r.nah.breit && r.nah.mittig && r.nah.unter && r.mittelSchild === 1, 'Schild nah: höchstens 70 % der Basis-Breite, mittig darunter; mittel auch das Schild (kein Ring)', [r.nah, r.mittelSchild]);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
