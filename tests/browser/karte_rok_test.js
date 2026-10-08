// Karte wie RoK mit Zonen (LIESMICH 11c Punkt 25/30): Gebiete, Grenzen, Pässe, Tempel und Startplätze aus KARTE_ZONEN (Teil 01a2),
// kein Wasser, Gebirgsketten auf allen Grenzen, Pass-Tore in der Kette.
// A) alle Karten-Bilder geladen (Game/bilder/karte_*.webp, mit Thron und Tempeln), zusammen < 2 MB; Laden erst beim Zeichnen (G)
// B) Gebiete aus den Daten (Zone 1–4 + Mitte, Ring/Stufe wie vorher), Boden je Zone (Masken), kein Meer
// C) Ketten auf jeder Grenze zwischen zwei Gebieten, Knoten an jeder Kreuzung; an jedem Pass eine Lücke, kein Stück im Tor
// D) Tore genau im Pass (Tor = Passpunkt), Pässe öffnen nach Stufe (Tag 1 sofort … zur Mitte Tag 5)
// E) Märsche nur durch die Tore: ein Weg zwischen zwei Gebieten kommt dem Gebirge nur am Tor nah
// F) weit draußen nur Farbfläche + Bänder (keine Bilder in der Kachel), Bilder fest in der Welt (keine Vergrößerung je Zoom)
// H) Barbaren-Lager und Basen nie im Grenzgebirge; Startplätze gleich viele je Zone-1-Gebiet, Tempel je Zone-4-Gebiet + Thron
//   node tests/browser/karte_rok_test.js <vorschau>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const VS = path.resolve(process.argv[2]);
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + VS + '/index.html', { timeout: 120000 }); await p.waitForTimeout(6000);
  const g0 = await p.evaluate(() => ({ quelle: karteBilder.toString().includes('new Image'), start: /karteBilder\(\)/.test(paintBackground.toString()) }));
  await p.waitForFunction(() => typeof karteBilder === 'function' && karteBilder(), null, { timeout: 60000, polling: 500 }).catch(() => {});
  // ===== A + G =====
  const a = await p.evaluate(() => ({ fertig: KB.fertig, n: KB_DATEIEN.filter(n => KB.img[n]).length, soll: KB_DATEIEN.length, breit: KB_DATEIEN.map(n => KB.img[n] && KB.img[n].naturalWidth) }));
  const groesse = fs.readdirSync(path.join(VS, 'bilder')).filter(f => f.startsWith('karte_')).reduce((s, f) => s + fs.statSync(path.join(VS, 'bilder', f)).size, 0);
  ok(a.fertig && a.n === a.soll && a.breit.every(w => w > 100), 'alle Karten-Bilder geladen', a);
  ok(groesse < 2 * 1048576, 'Karten-Bilder zusammen < 2 MB', Math.round(groesse / 1024) + ' KB');
  ok(g0.quelle && g0.start, 'Bilder laden erst beim Zeichnen (paintBackground → karteBilder)');
  // ===== B =====
  const bb = await p.evaluate(() => {
    const M = bodenMasken(), an = (k, x, y) => M.w[k][Math.floor((y + M.R) * M.k) * M.n + Math.floor((x + M.R) * M.k)], kern = z => landmasses.find(l => l.zone === z);
    return { anzahl: [1, 2, 3, 4, 5].map(z => landmasses.filter(l => l.zone === z).length), mitte: landmasses[0].zone === 5 && landmasses[0].tier === 'throne' && landmasses[0].ring === 0,
      tiers: [1, 2, 3, 4].map(z => kern(z).tier + kern(z).ring), boden: [1, 2, 3, 5].map(z => { const l = kern(z); return ['mitte', 'sand', 'innen'].map(k => an(k, l.x, l.y)).join('/'); }),
      keinMeer: typeof SEA_PATTERN === 'undefined' && typeof paintSea === 'undefined', daten: landmasses.length === KARTE_ZONEN.gebiete.length && bridges.length === KARTE_ZONEN.paesse.length };
  });
  ok(bb.anzahl.join() === '10,8,6,4,1' && bb.mitte && bb.daten, 'Gebiete aus KARTE_ZONEN: Zone 1–4 mit 10/8/6/4 Gebieten, Mitte = Landmasse 0 (Thron)', bb);
  ok(bb.tiers.join() === 'outer7,outer5,outer2,guardian1', 'Ring/Stufe wie vorher: Zone 1 außen (leicht) … Zone 4 Wächter', bb.tiers);
  ok(bb.boden.join() === '0/0/0,255/0/0,0/255/0,0/0/255', 'Boden je Zone: 1 Gras, 2 Gras gelbgrün, 3 Wüste, Mitte braune Erde', bb.boden);
  ok(bb.keinMeer, 'kein Meer (SEA_PATTERN / paintSea weg)');
  // ===== C + D =====
  const c = await p.evaluate(() => {
    const K = karteObjekte(), ketten = K.liste.filter(o => /^kette_(quer|hoch)/.test(o.n)), knoten = K.liste.filter(o => o.n === 'kette_knoten');
    const tore = bridges.map(br => torMitte(islandById[br.gateId])), ohne = [];
    for (const g of KARTE_ZONEN.grenzen) if (g.b !== -1) for (let i = 0; i < g.punkte.length; i += 3) { const [x, y] = g.punkte[i];
      if (tore.some(t => Math.hypot(t.x - x, t.y - y) < KARTE_MASS.tor)) continue;                      // (die Lücke am Tor)
      if (Math.hypot(g.punkte[0][0] - x, g.punkte[0][1] - y) < 9000 || Math.hypot(g.punkte[g.punkte.length - 1][0] - x, g.punkte[g.punkte.length - 1][1] - y) < 9000) continue;   // (am Knoten)
      if (!ketten.some(o => x > o.bb.l && x < o.bb.r && y > o.bb.t && y < o.bb.b)) ohne.push([g.id, x, y]); }
    const enden = []; for (const g of KARTE_ZONEN.grenzen) if (g.b !== -1) for (const q of [g.punkte[0], g.punkte[g.punkte.length - 1]]) if (!enden.some(e => Math.hypot(e[0] - q[0], e[1] - q[1]) < 5000)) enden.push(q);
    const imTor = tore.filter(t => ketten.some(o => Math.hypot(o.x - t.x, o.y - t.y) < KARTE_MASS.tor * .3)).length;
    const genau = bridges.every(br => { const t = torMitte(islandById[br.gateId]); return t.x === br.pass.x && t.y === br.pass.y && t.senk === br.pass.senk; });
    const ws = worldStartAt(), tage = bridges.map(br => { const o = passOpensAt(br); return o ? Math.round((o - ws) / 864e5) + 1 : 1; });
    const tagOk = bridges.every((br, i) => tage[i] === KARTE_ZONEN.oeffnen[br.pass.stufe]);
    return { ketten: ketten.length, knoten: knoten.length, enden: enden.length, ohne: ohne.length, ohneB: ohne.slice(0, 3), tore: tore.length, imTor, genau, tagOk, tage: [...new Set(tage)].sort() };
  });
  ok(c.ketten > 1500 && c.knoten === c.enden, 'Ketten an allen Grenzen, Knoten an jeder Kreuzung', c);
  ok(c.ohne === 0, 'jede Grenze zwischen zwei Gebieten ist eine geschlossene Kette (bis auf die Pässe)', c.ohneB);
  ok(c.tore === 56 && c.imTor === 0 && c.genau, 'Tor genau im Pass, kein Kettenstück im Tor (' + c.tore + ' Tore)', c);
  ok(c.tagOk && c.tage.join() === '1,2,3,4,5', 'Pässe öffnen von außen nach innen: Tag 1 (sofort) … zur Mitte Tag 5', c.tage);
  // ===== E: Märsche nur durch die Tore =====
  const e = await p.evaluate(() => {
    const fehler = []; let n = 0;
    for (const br of bridges.filter((x, i) => i % 4 === 0)) {
      const A = (islandsByLandmass[br.a] || []).find(i => i.type === 'tower'), B = (islandsByLandmass[br.b] || []).find(i => i.type === 'tower'); if (!A || !B) continue;
      const weg = marchPath(A, B), g = torMitte(islandById[br.gateId]); n++;
      for (let k = 1; k < weg.length; k++) { const p0 = weg[k - 1], p1 = weg[k];
        for (let s = 0; s <= 40; s++) { const x = p0.x + (p1.x - p0.x) * s / 40, y = p0.y + (p1.y - p0.y) * s / 40;
          if (grenzAbstand(x, y) < 3000 && Math.hypot(x - g.x, y - g.y) > PASS_TIEFE) { fehler.push([A.id, B.id, Math.round(x), Math.round(y)]); break; } } } }
    return { n, fehler: fehler.slice(0, 4), nF: fehler.length };
  });
  ok(e.n >= 10 && e.nF === 0, 'Märsche kreuzen das Gebirge nur am Tor (' + e.n + ' Wege geprüft)', e.fehler);
  // ===== F =====
  const f = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), od = g.drawImage; let bilder = 0;
    g.drawImage = function (im) { if (im && im.width > 300) bilder++; return od.apply(this, arguments); };
    paintBackground({ c, g, z: .0015, l: -50000, t: -50000 }, null, true);
    return { weitBilder: bilder, fest: typeof karteSkala === 'undefined' && !/karteSkala/.test(paintGelaende.toString() + drawTorBild.toString()) };
  });
  ok(f.weitBilder <= 1, 'weit draußen: nur Farbfläche + Bänder, keine Gelände-Bilder in der Kachel', f.weitBilder);
  ok(f.fest, 'Ketten und Tore fest in der Welt (keine Vergrößerung je Zoom)');
  // ===== H =====
  const h = await p.evaluate(() => { const r = mulberry32(4711); let n = 0, nah = 0;
    for (let i = 0; i < 300; i++) { const s = barbSpot(BARB_LMS[i % BARB_LMS.length], r); if (!s) continue; n++; if (grenzAbstand(s.x, s.y) < KETTE_FREI) nah++; }
    const tuerme = islands.filter(i => i.type === 'tower'), imGebirge = tuerme.filter(i => grenzAbstand(i.x, i.y) < KETTE_FREI).length;
    const falschesGebiet = tuerme.filter((i, k) => k % 7 === 0 && !pointInPolygon(i.x, i.y, landmasses[i.landmassId].shape)).length;
    const start = islands.filter(i => i.startSlot), jeLm = {}; for (const i of start) jeLm[i.landmassId] = (jeLm[i.landmassId] || 0) + 1;
    const tempel = islands.filter(i => i.type === 'temple' || i.type === 'megaTemple');
    return { n, nah, tuerme: tuerme.length, imGebirge, falschesGebiet, start: start.length, startZone1: start.every(i => landmasses[i.landmassId].zone === 1), jeLm: Object.values(jeLm),
      tempel: tempel.map(i => (i.type === 'megaTemple' ? 'T' : i.tempelArt[0]) + landmasses[i.landmassId].zone).sort().join() }; });
  ok(h.n > 150 && h.nah === 0, 'Barbaren-Lager: neue Plätze nie im Grenzgebirge', h);
  ok(h.tuerme > 15000 && h.tuerme < 40000 && h.imGebirge === 0 && h.falschesGebiet === 0, 'Basen: etwa so viele wie vorher, nie im Gebirge, jede in ihrem Gebiet', h);
  ok(h.start === 100 && h.startZone1 && h.jeLm.every(v => v === h.jeLm[0]), 'Startplätze: alle in Zone 1, gleich viele je Gebiet', h.jeLm);
  ok(h.tempel === 'T5,t4,t4,w4,w4', 'Thron in der Mitte, je Zone-4-Gebiet ein Tempel (Felskessel/Wächter abwechselnd)', h.tempel);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
