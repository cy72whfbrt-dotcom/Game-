// Märsche mit Zonen wie RoK (LIESMICH 11c Punkt 30): nie durchs Gebirge, nur über Pässe (kürzester Weg über die Gebiete); ein Pass mit
// Countdown ist nicht angreifbar und nicht zu durchqueren (Tippen: nur „öffnet in …“); ein offener, aber unbesetzter oder fremder Pass
// sperrt den Weg dahinter (bestehende Tor-Regel: erst erobern); der Thron erst ab Tag 7 und nur über einen offenen, eigenen Pass zur
// Mitte. Felder wie in der Karten-Testdatei (Arten, Stufe nach innen, nie im Gebirge), Barbaren-Lager mit der Stufe ihrer Zone.
//   node tests/browser/zonen_marsch_test.js <vorschau>
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 500) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof resFields !== 'undefined' && typeof BOT_DEFS !== 'undefined' && typeof bundFreund === 'function', null, { timeout: 90000, polling: 500 });
  const r = await p.evaluate(() => {
    const TAG = 864e5, o = {}, lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;
    const Y = BOT_DEFS.find(d => !d.mensch); if (bundVon(Y.id)) bundOp(Y.id, { op: 'verlassen' });
    const geben = (w, id, n) => { clearIslandOwner(id); botOwnedIslands[w].add(id); islandTroops[id] = n; };
    const turmIn = (lmId, k = 0) => (islandsByLandmass[lmId] || []).filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !i.startSlot)[k];
    // 1) Weg über mehrere Pässe: kommt dem Gebirge nur an den Pässen nah, Länge = Marschstrecke
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 10 * TAG));            // alle Pässe offen
    for (const br of bridges) geben(Y.id, br.gateId, 1);                                     // alle Tore dem Mitspieler: freie Fahrt
    const A = islandById[startplaetzeReihum()[0].id], weit = landmasses.find(l => l.zone === 4), B = turmIn(weit.id);
    const weg = marchPath(A, B), nahe = [];
    for (let k = 1; k < weg.length; k++) for (let s = 0; s <= 50; s++) { const x = weg[k - 1].x + (weg[k].x - weg[k - 1].x) * s / 50, y = weg[k - 1].y + (weg[k].y - weg[k - 1].y) * s / 50;
      if (grenzAbstand(x, y) < 3000 && !bridges.some(br => Math.hypot(br.pass.x - x, br.pass.y - y) < PASS_TIEFE + 2000)) nahe.push([Math.round(x), Math.round(y)]); }
    let lang = 0; for (let k = 1; k < weg.length; k++) lang += Math.hypot(weg[k].x - weg[k - 1].x, weg[k].y - weg[k - 1].y);
    const route = routeFor(A.landmassId, B.landmassId, Y.id);
    o.weg = { punkte: weg.length, paesse: route.length - 1, nahe: nahe.slice(0, 3), nN: nahe.length, gleich: Math.abs(lang - marschStrecke(A, B)) < 1 };
    // 2) im selben Gebiet, wo die Gerade das Gebirge schneidet (gebogene Ringe): außen herum
    let bogen = null;
    for (const lm of landmasses.filter(l => l.zone === 2 || l.zone === 3)) { const t = (islandsByLandmass[lm.id] || []).filter(i => i.type === 'tower');
      for (let i = 0; i < t.length && !bogen; i += 7) for (let j = t.length - 1; j > i && !bogen; j -= 7) if (!wegFrei(t[i], t[j])) bogen = [t[i], t[j]]; if (bogen) break; }
    if (bogen) { const w = marchPath(bogen[0], bogen[1]); o.bogen = { punkte: w.length, frei: w.every((q, k) => !k || wegFrei(w[k - 1], q)) }; }
    // 3) gesperrter Pass: ein unbesetztes Tor mitten auf dem Weg sperrt; erobert ist der Weg frei
    for (const br of bridges) clearIslandOwner(br.gateId);                                   // alle Tore unbesetzt, nur das erste auf dem Weg gehört dem Mitspieler
    geben(Y.id, bridgeBetween(route[0], route[1]).gateId, 1);
    o.sperre = { weg: canReach(A.landmassId, B.landmassId, Y.id), grund: wegGrund(A.landmassId, B.landmassId, Y.id), angriff: !!launchAttack(A.id, B.id, Y.id, 10) };
    for (const br of bridges) geben(Y.id, br.gateId, 1); o.sperre.erobert = canReach(A.landmassId, B.landmassId, Y.id);
    // 4) Pass mit Countdown: nicht angreifbar, nicht zu durchqueren, Tippen zeigt nur „öffnet in …“
    localStorage.setItem('openWaterWorldStart', String(Date.now()));
    const brZ = bridges.find(q => q.pass.stufe === 2), torZ = islandById[brZ.gateId], vorZ = turmIn(landmasses[brZ.a].zone === 1 ? brZ.a : brZ.b);
    clearIslandOwner(torZ.id); geben(Y.id, vorZ.id, 1e5);
    let hinweis = ''; const fh = flashHint; flashHint = t => { hinweis = String(t); }; closeAllPopups(); openIslandPopup(torZ); flashHint = fh;
    o.countdown = { angriff: !!launchAttack(vorZ.id, torZ.id, Y.id, 1000), durch: landmassesConnected(brZ.a, brZ.b), popup: popupIslandId === torZ.id && isPanelOpen(popup), hinweis };
    // 5) Thron: Tag 7 und ein eigener offener Pass zur Mitte
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 5 * TAG));            // Tag 6: alle Pässe offen, der Thron noch zu
    const los = (q, z) => { AUF.frei.an(); try { return !!launchAttack(q, z, Y.id, 1000); } finally { AUF.frei.aus(); } };   // (Marsch-Plätze aus den Schritten davor zählen nicht)
    const brM = bridges.find(q => q.pass.stufe === 5), torM = islandById[brM.gateId], w4 = turmIn(brM.a === 0 ? brM.b : brM.a, 1);
    geben(Y.id, w4.id, 1e6); const vor = los(w4.id, megaTempleId);
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 6 * TAG - 60000));
    for (const q of bridges.filter(q => q.pass.stufe === 5)) clearIslandOwner(q.gateId);
    o.thron = { vor, unbesetzt: los(w4.id, megaTempleId), grund: wegGrund(w4.landmassId, 0, Y.id) };
    clearIslandOwner(torM.id); ownedIslands.add(torM.id); o.thron.fremd = los(w4.id, megaTempleId);
    geben(Y.id, torM.id, 1); o.thron.eigen = los(w4.id, megaTempleId);
    // 6) Felder und Barbaren-Lager
    const art = {}; for (const f of resFields) art[f.kind] = (art[f.kind] || 0) + 1;
    const stufe = z => { const l = resFields.filter(f => landmasses[f.landmassId].zone === z); return l.reduce((s, f) => s + f.stufe, 0) / l.length; };
    o.felder = { n: resFields.length, art, imGebirge: resFields.filter(f => grenzAbstand(f.x, f.y) < KETTE_FREI).length, mitte: resFields.filter(f => f.landmassId === 0).length,
      stufen: [1, 2, 3, 4].map(stufe), basisDrauf: resFields.filter(f => (islandsByLandmass[f.landmassId] || []).some(i => Math.hypot(i.x - f.x, i.y - f.y) < 1500)).length };
    barbState.camps = []; for (let i = 0; i < 200; i++) barbSpawn();
    o.lager = { n: barbState.camps.length, falsch: barbState.camps.filter(c => { const z = landmasses[c.lm].zone, lo = 1 + (z - 1) * 6; return c.L < lo || c.L > (z === 4 ? 25 : lo + 5); }).length,
      gebirge: barbState.camps.filter(c => grenzAbstand(c.x, c.y) < KETTE_FREI).length, zonen: [...new Set(barbState.camps.map(c => landmasses[c.lm].zone))].sort().join() };
    return o;
  });
  ok(r.weg.paesse >= 3 && r.weg.nN === 0 && r.weg.gleich, 'Marsch über ' + r.weg.paesse + ' Pässe: dem Gebirge nur an den Pässen nah, Marschzeit nach diesem Weg', r.weg);
  ok(r.bogen && r.bogen.frei && r.bogen.punkte > 2, 'im gebogenen Gebiet: um das Gebirge herum, nicht hindurch', r.bogen);
  ok(!r.sperre.weg && /Pass gesperrt/.test(r.sperre.grund) && !r.sperre.angriff && r.sperre.erobert, 'unbesetzter Pass auf dem Weg sperrt (Grund „Pass gesperrt“), erobert ist der Weg frei', r.sperre);
  ok(!r.countdown.angriff && !r.countdown.durch && !r.countdown.popup && /öffnet in/.test(r.countdown.hinweis), 'Pass mit Countdown: nicht angreifbar, nicht zu durchqueren, Tippen zeigt nur „öffnet in …“', r.countdown);
  ok(!r.thron.vor && !r.thron.unbesetzt && /Pass gesperrt/.test(r.thron.grund) && !r.thron.fremd && r.thron.eigen, 'Thron: vor Tag 7 gesperrt; ab Tag 7 nur über einen eigenen offenen Pass zur Mitte', r.thron);
  ok(r.felder.n >= 400 && Object.keys(r.felder.art).sort().join() === 'eisen,gem,gold,holz,stein' && r.felder.art.gem < r.felder.art.holz && !r.felder.imGebirge && !r.felder.mitte && !r.felder.basisDrauf
    && r.felder.stufen.every((v, i, a) => !i || v > a[i - 1]), 'Felder wie die Karten-Testdatei: 5 Arten (Edelstein selten), Stufe steigt nach innen, nie im Gebirge, keine Basis darauf', r.felder);
  ok(r.lager.n > 100 && !r.lager.falsch && !r.lager.gebirge && r.lager.zonen === '1,2,3,4', 'Barbaren-Lager: Stufe nach der Zone (1–6 … 19–25), nie im Gebirge, in Zone 1–4', r.lager);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
