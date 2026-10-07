// Karte wie RoK (LIESMICH 11c Punkt 25): kein Wasser, Boden nach Ringen, Gebirgsketten auf allen Grenzen, Pass-Tore in der Kette.
// A) alle Karten-Bilder geladen (Game/bilder/karte_*.webp), zusammen < 1,5 MB
// B) Boden nach Ringen: außen grün → Mitte Sand (lm.boden, Masken), lm.bio bleibt für Rohstoffe/Felder (keine neue Spielregel)
// C) Ketten auf jeder Grenze (auch am Kartenrand), Knoten an jeder Kreuzung, an jedem Tor eine Lücke für das Tor-Bild; wo ein Feld auf
//    der Grenze liegt (Lage = Spiellogik), spart die Kette aus
// D) Tor genau in der Kette: Lücke auf dem Torpunkt (≤ 2 % Torbreite); waagrechte Grenze: Mauer in Kettenrichtung (≤ 10°), Fuß bündig
//    (≤ 2 px bei 0,03); senkrechte Grenze (Lücke + Wachtürme, kein Quer-Tor): Kette über und unter dem Tor auf einer Linie (≤ 2 % Torbreite)
// E) Märsche nur durch die Tore: jeder Weg zwischen zwei Gebieten kreuzt die Grenze nur an einem Tor (Logik unverändert)
// F) Wald nicht auf Basen/Feldern, nicht an der Kette; weit draußen nur Farbflächen + Bänder (keine Bilder in der Kachel)
// G) Weltrechner zeichnet nie → lädt keine Karten-Bilder (Laden erst beim ersten Zeichnen)
// H) Barbaren-Lager entstehen nicht im Grenzgebirge (barbSpot)
//   node tests/browser/karte_rok_test.js <vorschau>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const VS = path.resolve(process.argv[2]);
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + VS + '/index.html', { timeout: 120000 }); await p.waitForTimeout(6000);
  // G) vor dem ersten Bild: noch nichts geladen? (das Spiel zeichnet sofort – darum hier nur: Laden hängt am Zeichnen, nicht am Start)
  const g0 = await p.evaluate(() => ({ quelle: karteBilder.toString().includes('new Image'), start: /karteBilder\(\)/.test(paintBackground.toString()) }));
  await p.waitForFunction(() => typeof karteBilder === 'function' && karteBilder(), null, { timeout: 60000, polling: 500 }).catch(() => {});
  // ===== A =====
  const a = await p.evaluate(() => ({ fertig: KB.fertig, n: KB_DATEIEN.filter(n => KB.img[n]).length, soll: KB_DATEIEN.length, breit: KB_DATEIEN.map(n => KB.img[n] && KB.img[n].naturalWidth) }));
  const groesse = fs.readdirSync(path.join(VS, 'bilder')).filter(f => f.startsWith('karte_')).reduce((s, f) => s + fs.statSync(path.join(VS, 'bilder', f)).size, 0);
  ok(a.fertig && a.n === a.soll && a.breit.every(w => w > 100), 'alle Karten-Bilder geladen', a);
  ok(groesse < 1.5 * 1048576, 'Karten-Bilder zusammen < 1,5 MB', Math.round(groesse / 1024) + ' KB');
  ok(g0.quelle && g0.start, 'Bilder laden erst beim Zeichnen (paintBackground → karteBilder)');
  // ===== B =====
  const bb = await p.evaluate(() => {
    const art = r => landmasses.find(l => l.ring === r).boden, M = bodenMasken(), an = (k, x, y) => M.w[k][Math.floor((y + M.R) * M.k) * M.n + Math.floor((x + M.R) * M.k)];
    const S = HEX_SPACING;
    return { ringe: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(art), mitteSand: an('sand', 0, 0), aussenSand: an('sand', 7 * S, 7 * S), aussenMitte: an('mitte', 7 * S, 0),
             ring4mitte: an('mitte', 4 * S, 0), ring4innen: an('innen', 4 * S, 0), ringAn: [ringAn(0, 0), ringAn(4 * S, -2 * S), ringAn(8 * S, 8 * S), ringAn(9.2 * S, 0)],
             bio: new Set(landmasses.map(l => l.bio)).size, keinMeer: typeof SEA_PATTERN === 'undefined' && typeof paintSea === 'undefined' };
  });
  ok(bb.ringe.join() === 'sand,sand,innen,innen,mitte,mitte,aussen,aussen,aussen', 'Boden nach Ringen: außen grün → Mitte Sand', bb.ringe);
  ok(bb.mitteSand === 255 && bb.aussenSand === 0 && bb.aussenMitte === 0 && bb.ring4mitte === 255 && bb.ring4innen === 0, 'Boden-Masken passen zu den Ringen', bb);
  ok(bb.ringAn.join() === '0,4,8,9', 'ringAn über die geschlängelten Grenzen (außerhalb: 9)', bb.ringAn);
  ok(bb.keinMeer, 'kein Meer mehr (SEA_PATTERN / paintSea weg)');
  ok(bb.bio > 3, 'Landschaften (lm.bio) bleiben für Rohstoffe/Felder – nur nicht mehr zu sehen', bb.bio);
  // ===== C + D =====
  const c = await p.evaluate(() => {
    const K = karteObjekte(), S = HEX_SPACING, ende = (GRID_HALF + .5) * S, zaehl = n => K.liste.filter(o => o.n.startsWith(n)).length;
    const linien = []; for (let k = -GRID_HALF - 1; k <= GRID_HALF; k++) linien.push(k + .5);
    const ohne = [];                                  // Grenzabschnitte ohne Kette (alle 8.000 Einheiten eine Probe; nicht an Toren/Knoten)
    const tore = bridges.map(br => torMitte(islandById[br.gateId]));
    for (const senk of [true, false]) for (const L of linien) for (let t = -ende + 4000; t < ende - 4000; t += 8000) {
      const aus = Math.abs(L) > GRID_HALF ? Math.sign(L) * RAND_AUSSEN : 0, x = senk ? grenzLinie(true, L, t) + aus : t, y = senk ? t : grenzLinie(false, L, t) + aus;   // (Kartenrand: nach außen versetzt)
      if (tore.some(g => Math.hypot(g.x - x, g.y - y) < KARTE_MASS.tor * .7)) continue;   // (die Lücke am Tor selbst)
      if (resFields.some(q => Math.hypot(q.x - x, q.y - y) < q.radius + 7000)) continue;   // (ein Feld liegt auf der Grenze: dort spart die Kette aus)
      const drin = (x, y) => K.liste.some(o => o.n.startsWith('kette') && x > o.bb.l && x < o.bb.r && y > o.bb.t && y < o.bb.b);
      const g = tore.find(q => Math.hypot(q.x - x, q.y - y) < KETTE_GERADE[senk ? 'hoch' : 'quer']);   // am Tor läuft die Kette gerade auf der Linie des Tors
      if (!drin(x, y) && !(g && drin(senk ? g.x : x, senk ? y : g.y))) ohne.push([senk ? 'senk' : 'waag', L, Math.round(t)]); }
    const mess = bridges.map(br => { const isl = islandById[br.gateId], tm = torMitte(isl), senk = Math.abs(br.x2 - br.x1) > Math.abs(br.y2 - br.y1);
      const L = senk ? Math.round(tm.x / S - .5) + .5 : Math.round(tm.y / S - .5) + .5, punkt = senk ? grenzLinie(true, L, tm.y) : grenzLinie(false, L, tm.x);
      const luecke = Math.abs((senk ? tm.x : tm.y) - punkt) / KARTE_MASS.tor * 100;
      if (senk) {   // Tor-Bild für Nord-Süd-Ketten; mittlere Kettenreihe über und unter der Lücke auf derselben Linie (Abstand der Stücke zur Torlinie)
        const reihe = K.liste.filter(o => o.n.startsWith('kette_hoch') && Math.abs(o.y - tm.y) < 15000 && Math.abs(o.x - tm.x) < 700);
        const oben = reihe.filter(o => o.y < tm.y), unten = reihe.filter(o => o.y > tm.y), ab = Math.max(...reihe.map(o => Math.abs(o.x - tm.x)));
        const bild = KB.img.tor_senk_zu && TOR_SENK.achse > 0;   // (Tor-Bild für Nord-Süd-Ketten: Achse und Weg werden genau auf den Torpunkt gesetzt, 03b drawTorBild)
        return { id: isl.id, senk, luecke, versatz: oben.length && unten.length && bild ? ab / KARTE_MASS.tor * 100 : 99 }; }
      const nb = K.liste.filter(o => o.n.startsWith('kette_quer') && Math.abs(o.x - tm.x) < 10000 && Math.abs(o.y - tm.y) < 600);
      const paar = [nb.filter(o => o.x < tm.x).sort((u, v) => v.x - u.x)[0], nb.filter(o => o.x > tm.x).sort((u, v) => u.x - v.x)[0]].filter(Boolean);
      const winkel = paar.length === 2 ? Math.abs(Math.atan2(paar[1].y - paar[0].y, paar[1].x - paar[0].x) * 180 / Math.PI) : 99;
      return { id: isl.id, senk, luecke, winkel, fuss: Math.max(...paar.map(o => Math.abs(o.y - tm.y))) * .03 }; });
    const feldNah = m => { const g = torMitte(islandById[m.id]); return resFields.some(q => Math.hypot(q.x - g.x, q.y - g.y) < 20000); };   // (ein Feld neben dem Tor: das Nachbarstück ist absichtlich ausgespart)
    const ausgespart = mess.filter(m => (m.senk ? m.versatz : m.winkel) === 99 && feldNah(m)).length;
    const schlecht = mess.filter(m => !(m.luecke <= 2 && (m.senk ? m.versatz <= 2 : m.winkel <= 10 && m.fuss <= 2)) && !((m.senk ? m.versatz : m.winkel) === 99 && feldNah(m)));
    const imTor = tore.filter(g => K.liste.some(o => o.n.startsWith('kette_quer') || o.n.startsWith('kette_hoch') ? Math.hypot(o.x - g.x, o.y - g.y) < 1400 : false)).length;
    return { quer: zaehl('kette_quer'), hoch: zaehl('kette_hoch'), knoten: zaehl('kette_knoten'), soll: linien.length * linien.length, ohne: ohne.length, ohneB: ohne.slice(0, 4),
             tore: mess.length, ausgespart, schlecht: schlecht.slice(0, 4), nSchlecht: schlecht.length, imTor };
  });
  ok(c.quer > 500 && c.hoch > 500 && c.knoten >= c.soll * .97, 'Ketten (quer + hoch) und Knoten an jeder Kreuzung (außer wo ein Feld an der Kreuzung liegt)', c);
  ok(c.ohne === 0, 'jede Grenze (auch der Kartenrand) ist eine geschlossene Kette', c.ohneB);
  ok(c.tore > 500 && c.nSchlecht === 0 && c.ausgespart < 100, 'Tor genau in der Kette: Lücke auf dem Torpunkt, Mauer in Kettenrichtung, Fuß bündig, kein Versatz (' + c.tore + ' Tore, ' + c.ausgespart + ' mit Feld daneben)', c.schlecht);
  ok(c.imTor === 0, 'kein Kettenstück steht mitten im Tor (Lücke frei)', c.imTor);
  // ===== E: Märsche nur durch die Tore =====
  const e = await p.evaluate(() => {
    const S = HEX_SPACING, fehler = []; let n = 0;
    for (const br of bridges.filter((x, i) => i % 9 === 0)) {
      const A = (islandsByLandmass[br.a] || []).find(i => i.type === 'tower'), B = (islandsByLandmass[br.b] || []).find(i => i.type === 'tower'); if (!A || !B) continue;
      const weg = marchPath(A, B), g = torMitte(islandById[br.gateId]); n++;
      for (let k = 1; k < weg.length; k++) { const p0 = weg[k - 1], p1 = weg[k];
        for (let s = 0; s <= 20; s++) { const x = p0.x + (p1.x - p0.x) * s / 20, y = p0.y + (p1.y - p0.y) * s / 20;
          const nahe = Math.abs(x - grenzLinie(true, Math.round(x / S - .5) + .5, y)) < 200 || Math.abs(y - grenzLinie(false, Math.round(y / S - .5) + .5, x)) < 200;
          if (nahe && Math.hypot(x - g.x, y - g.y) > 4000) { fehler.push([A.id, B.id, Math.round(x), Math.round(y)]); break; } } } }
    return { n, fehler: fehler.slice(0, 4), nF: fehler.length };
  });
  ok(e.n > 20 && e.nF === 0, 'Märsche kreuzen die Kette nur am Tor (' + e.n + ' Wege geprüft)', e.fehler);
  // ===== F =====
  const f = await p.evaluate(() => {
    const K = karteObjekte(), wald = K.liste.filter(o => o.n.startsWith('wald')), S = HEX_SPACING, zuNah = [];
    for (const o of wald) { const lm = landmasses[felsLmAn(o.x, o.y)]; if (!lm) { zuNah.push('aus'); continue; }
      for (const i of islandsByLandmass[lm.id] || []) if (Math.hypot(i.x - o.x, i.y - o.y) < i.radius + o.w * .5 - 1) zuNah.push(['Basis', i.id]);
      for (const fl of resFields) if (fl.landmassId === lm.id && Math.hypot(fl.x - o.x, fl.y - o.y) < fl.radius + o.w * .5 - 1) zuNah.push(['Feld', fl.id]); }
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), od = g.drawImage; let bilder = 0;
    g.drawImage = function (im) { if (im && im.width > 300) bilder++; return od.apply(this, arguments); };
    paintBackground({ c, g, z: .0015, l: -50000, t: -50000 }, null, true);
    return { wald: wald.length, zuNah: zuNah.slice(0, 4), nZ: zuNah.length, weitBilder: bilder };
  });
  ok(f.wald > 500 && f.nZ === 0, 'Wald-Gruppen auf freier Wiese (nicht auf Basen/Feldern)', f);
  ok(f.weitBilder <= 1, 'weit draußen: nur Farbfläche + Bänder, keine Gelände-Bilder in der Kachel', f.weitBilder);
  // ===== H: Barbaren-Lager entstehen nie im Grenzgebirge (Platzwahl barbSpot, wie schon bei den Bergstöcken) =====
  const h = await p.evaluate(() => { const r = mulberry32(4711); let n = 0, nah = 0;
    for (let i = 0; i < 600; i++) { const s = barbSpot(BARB_LMS[i % BARB_LMS.length], r); if (!s) continue; n++; if (grenzAbstand(s.x, s.y) < 4000) nah++; }
    return { n, nah }; });
  ok(h.n > 300 && h.nah === 0, 'Barbaren-Lager: neue Plätze nie näher als 4.000 an einer Grenze (Gebirge)', h);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
