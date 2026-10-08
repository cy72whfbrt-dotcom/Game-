// Kampf-Fälle (Alexander 8.10., Pflicht): alle 11 Fälle einzeln in der echten Spiel-Logik nachgespielt – wie beim Weltrechner
// (dort sind echte Spieler Mitspieler; die sechs hier handeln nicht von selbst). Je Fall: wer tritt bei, Truppen-Summe, wer wartet,
// Ergebnis plausibel, nichts doppelt/weg (geschickt = heim + in der Basis + gefallen + verwundet).
// Bündnis X: A (Angreifer), B, B2 · Bündnis Y: E (Verteidiger), F · C ohne Bündnis.
const { chromium, devices } = require('playwright');
const ok = (t, b, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const info = (t, x) => console.log('INFO  ' + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const setup = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    if (bots.length < 7) return { fehler: 'zu wenige Mitspieler' };
    const [A, B, B2, E, F, C] = bots;
    for (const x of [A, B, B2, E, F, C]) { botNextAt[x.id] = Infinity; if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' }); botCoins[x.id] = 1e9;
      const s = loadBotState()[x.id]; s.shieldUntil = 0; s.neuBis = 0; s.city.levels.keep = Math.max(5, s.city.levels.keep || 0); s.city.levels.embassy = Math.max(3, s.city.levels.embassy || 0); }
    saveBotState();
    bundOp(A.id, { op: 'gruenden', name: 'Fallprobe', tag: 'FAP', offen: true }); for (const x of [B, B2]) bundOp(x.id, { op: 'beitreten', aid: bundVon(A.id).id });
    bundOp(E.id, { op: 'gruenden', name: 'Gegenprobe', tag: 'GGP', offen: true }); bundOp(F.id, { op: 'beitreten', aid: bundVon(E.id).id });
    // alle im Gebiet von A (Märsche nur über Pässe): jeder bekommt dort Basen, dazu neutrale Ziele
    const L = islandById[botCapitalOf(A.id)].landmassId;
    const frei = islands.filter(i => i.landmassId === L && i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && !isCapital(i.id)).map(i => i.id);
    if (frei.length < 13) return { fehler: 'zu wenige freie Türme im Gebiet', n: frei.length };
    const gib = (w, id) => { clearIslandOwner(id); botOwnedIslands[w].add(id); return id; };
    const ca = botCapitalOf(A.id);
    const K = window.K = { A: A.id, B: B.id, B2: B2.id, E: E.id, F: F.id, C: C.id, ca, a2: gib(A.id, frei[0]), b: gib(B.id, frei[1]), b2: gib(B2.id, frei[2]),
      e: gib(E.id, frei[3]), f: gib(F.id, frei[4]), c: gib(C.id, frei[5]), z: frei.slice(6), kaempfe: [], feld: [] };
    for (const id of [ca, K.a2, K.b, K.b2, K.f, K.c]) islandTroops[id] = 1e8;
    islandTroops[botCapitalOf(E.id)] = 1e9;                        // (viel Platz in seiner Botschaft)
    for (const z of K.z) { islandTroops[z] = 0; neutralTroopOverrides[z] = 20000; islandById[z].neutralTroops = 20000; }
    // jeden entschiedenen Kampf mitschreiben: wer mit wie vielen dabei war, wer heimgeht, was in der Basis bleibt, Verluste je Spieler
    const orig = resolveBotAttack, ka = kampfAnteile;
    kampfAnteile = function () { const r = ka.apply(this, arguments); K.anteile = r; return r; };
    resolveBotAttack = function (a) {
      const vor = { z: a.targetId, who: a.attackerBotId, raw: a.rawTroops, an: a.rally ? a.rally.an.map(x => [x[0], x[1], x[2]]) : null, quellen: a.quellen || null,
        owner: islandOwnerOf(a.targetId), garn: islandTroops[a.targetId] || 0, verst: verst.l.filter(v => v.t === a.targetId).map(v => ({ w: v.w, n: v.n })), ns: pendingSends.length };
      K.anteile = null; orig.apply(this, arguments);
      K.kaempfe.push(Object.assign(vor, { besitzer: islandOwnerOf(a.targetId), garnNach: islandTroops[a.targetId] || 0,
        verstNach: verst.l.filter(v => v.t === a.targetId).map(v => ({ w: v.w, n: v.n })),
        heim: pendingSends.slice(vor.ns).filter(s => s.fromId === a.targetId && s.back).map(s => [s.senderBotId, s.troops]),
        anteile: K.anteile && K.anteile.map(q => ({ w: q.w, n: q.n, fallen: q.fallen, wounded: q.wounded })) }));
    };
    const fb = fieldBattle; fieldBattle = function (aw, an, dw, dn) { const r = fb.apply(this, arguments); K.feld.push({ aw, an, dw, dn, won: r.won, aLoss: r.aLoss, dLoss: r.dLoss }); return r; };
    // ein Angriff, der sofort ankommt
    K.los = (src, z, who, n) => { const k = pendingAttacks.length; AUF.frei.an(); try { launchAttack(src, z, who, n); } finally { AUF.frei.aus(); }
      if (pendingAttacks.length === k) return null; const a = pendingAttacks[pendingAttacks.length - 1]; a.resolveAt = Date.now() - 10; return a; };
    K.kampf = z => pendingAttacks.find(a => a.targetId === z && a.fightEndsAt);
    K.lage = z => { const f = K.kampf(z); return { kampf: f ? { who: f.attackerBotId, raw: f.rawTroops, an: f.rally ? f.rally.an.map(x => [x[0], x[2]]) : null, est: fightEstimate(f) } : null,
      wartet: pendingAttacks.filter(a => a.targetId === z && a.wartet).map(a => [a.attackerBotId, a.rawTroops]) }; };
    K.rec = (z, who) => K.kaempfe.filter(r => r.z === z && (!who || r.who === who)).pop() || null;
    // Bilanz je Spieler: geschickt = heim + in der eroberten Basis + gefallen + verwundet
    K.bilanz = (r, gesandt) => Object.entries(gesandt).map(([w, n]) => {
      const heim = r.heim.filter(h => h[0] === w).reduce((s, h) => s + h[1], 0);
      const garn = r.besitzer === w && r.owner !== w ? r.garnNach : 0;
      const q = r.anteile && r.anteile.find(x => x.w === w);
      const weg = q ? q.fallen + q.wounded : r.who === w ? r.raw - heim - garn : 0;
      return { w, gesandt: n, imKampf: q ? q.n : r.who === w && !r.anteile ? r.raw : 0, heim, garn, weg, stimmt: heim + garn + weg === n && weg >= 0 && weg <= n };
    });
    return { ok: true, L, frei: frei.length };
  });
  if (!setup.ok) { console.log('FEHLER Aufbau', JSON.stringify(setup)); await b.close(); return; }
  const warte = (f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 30000, polling: 200 }).catch(() => {});
  const kampfDa = z => warte(z => !!K.kampf(z), z, 8000);
  const entschieden = (z, who) => warte(([z, who]) => !!K.rec(z, who), [z, who], 40000);
  const alleOk = L => L.every(x => x.stimmt);

  // ---------- Fall 1: mehrere eigene Märsche aufs selbe Ziel → EIN Kampf
  { const z = await p.evaluate(() => K.z1 = K.z[0]);
    await p.evaluate(() => K.los(K.ca, K.z1, K.A, 300000)); await kampfDa(z);
    await p.evaluate(() => { K.los(K.ca, K.z1, K.A, 200000); K.los(K.a2, K.z1, K.A, 100000); });
    await warte(z => K.kampf(z) && K.kampf(z).rawTroops === 600000, z, 6000);
    const l = await p.evaluate(z => K.lage(z), z);
    ok('Fall 1: drei eigene Wellen in EINEM Kampf, Truppen zusammen (600.000)', l.kampf && l.kampf.raw === 600000 && !l.wartet.length, l);
    await entschieden(z);
    const r = await p.evaluate(z => { const r = K.rec(z); return r && { r, bil: K.bilanz(r, { [K.A]: 600000 }) }; }, z);
    ok('Fall 1: Ergebnis – erobert, Verluste plausibel, nichts doppelt/weg', r && r.r.besitzer === r.r.who && r.r.raw === 600000 && alleOk(r.bil) && r.bil[0].weg > 0 && r.bil[0].weg < 60000, r && r.bil);
    ok('Fall 1: jede Welle aus ihrer Basis gezählt (Quellen)', r && r.r.quellen && r.r.quellen.length >= 2, r && r.r.quellen); }

  // ---------- Fall 2 + 3: ein / mehrere Verbündete schicken Märsche dazu
  { const z = await p.evaluate(() => K.z2 = K.z[1]);
    await p.evaluate(() => K.los(K.ca, K.z2, K.A, 300000)); await kampfDa(z);
    await p.evaluate(() => K.los(K.b, K.z2, K.B, 200000));
    await warte(z => K.kampf(z) && K.kampf(z).rawTroops === 500000, z, 6000);
    const l2 = await p.evaluate(z => K.lage(z), z);
    ok('Fall 2: Verbündeter B tritt bei, zählt mit (500.000)', l2.kampf && l2.kampf.raw === 500000 && l2.kampf.an && l2.kampf.an.some(x => x[0] === l2.kampf.who) && l2.kampf.an.some(x => x[1] === 200000), l2.kampf);
    await p.evaluate(() => { K.los(K.b, K.z2, K.B, 50000); K.los(K.b2, K.z2, K.B2, 150000); });
    await warte(z => K.kampf(z) && K.kampf(z).rawTroops === 700000, z, 6000);
    const l3 = await p.evaluate(z => K.lage(z), z);
    ok('Fall 3: mehrere Verbündete (B noch einmal, B2) treten bei – jede Armee eigener Eintrag', l3.kampf && l3.kampf.raw === 700000 && l3.kampf.an.length === 4 && !l3.wartet.length, l3.kampf);
    await entschieden(z);
    const r = await p.evaluate(z => { const r = K.rec(z); return r && { r, bil: K.bilanz(r, { [K.A]: 300000, [K.B]: 250000, [K.B2]: 150000 }) }; }, z);
    ok('Fall 2/3: Ergebnis – A erobert, B/B2 gehen mit ihrem Anteil heim, nichts doppelt/weg', r && r.r.besitzer === r.r.who && alleOk(r.bil) && r.bil.every(x => x.imKampf === x.gesandt) && r.bil.slice(1).every(x => x.heim > 0 && x.garn === 0), r && r.bil);
    ok('Fall 2/3: Verluste nach Anteil (jeder ≈ gleicher Bruchteil)', r && Math.abs(r.bil[0].weg / 300000 - r.bil[2].weg / 150000) < .01, r && r.bil.map(x => x.weg)); }

  // ---------- Fall 4: Verbündeter des Gegners verstärkt den Verteidiger mitten im Kampf
  { const z = await p.evaluate(() => { const T = K.T4 = K.z[2]; clearIslandOwner(T); botOwnedIslands[K.E].add(T); islandTroops[T] = 1000; return T; });
    const n = await p.evaluate(() => { const t = islandById[K.T4]; return Math.round(5 * (effectiveTroops(t) + effectiveDefense(t)) + 10000); });
    await p.evaluate(n => K.los(K.ca, K.T4, K.A, n), n); await kampfDa(z);
    const vorher = await p.evaluate(z => K.lage(z), z);
    const why = await p.evaluate(n => { const w = bundOp(K.F, { op: 'hilfe', von: K.f, nach: K.T4, n: 20 * n }); const s = pendingSends.find(s => s.senderBotId === K.F && s.verst); if (s) s.resolveAt = Date.now() - 10; return w; }, n);
    await warte(() => verst.l.some(v => v.w === K.F && v.t === K.T4), null, 5000);
    const mitten = await p.evaluate(z => ({ lage: K.lage(z), verst: verst.l.filter(v => v.t === z).map(v => [v.w, v.n]) }), z);
    ok('Fall 4: Verstärkung von F kommt mitten im Kampf an (stationiert beim Verteidiger)', !why && vorher.kampf && mitten.lage.kampf && mitten.verst.some(v => v[1] === 20 * n), { why, verst: mitten.verst });
    await entschieden(z);
    const r = await p.evaluate(z => { const r = K.rec(z); return r && { r, bil: K.bilanz(r, { [K.A]: r.raw }) }; }, z);
    const fid = await p.evaluate(() => K.F), v0 = r && r.r.verst.find(v => v.w === fid), vN = r && v0 && r.r.verstNach.find(v => v.w === fid);
    ok('Fall 4: ohne F hätte A gewonnen, mit F verliert A (F zählt auf Verteidiger-Seite)', vorher.kampf && vorher.kampf.est.won && r && r.r.besitzer === r.r.owner, { vorher: vorher.kampf && vorher.kampf.est, besitzer: r && r.r.besitzer });
    ok('Fall 4: Verluste der Verteidiger anteilig (E und F gleicher Bruchteil), A: Flucht heim + Verluste = geschickt', r && vN && vN.n < v0.n && r.r.garnNach < r.r.garn && Math.abs((v0.n - vN.n) / v0.n - (r.r.garn - r.r.garnNach) / r.r.garn) < .02 && alleOk(r.bil),
      r && { E: [r.r.garn, r.r.garnNach], F: [v0 && v0.n, vN && vN.n], A: r.bil }); }

  // ---------- Fall 5: ein Fremder (C) greift dasselbe Ziel an → wartet, bis der Kampf entschieden ist
  { const z = await p.evaluate(() => K.z5 = K.z[3]);
    await p.evaluate(() => K.los(K.ca, K.z5, K.A, 300000)); await kampfDa(z);
    await p.evaluate(() => K.los(K.c, K.z5, K.C, 1000));
    await warte(z => pendingAttacks.some(a => a.targetId === z && a.wartet), z, 5000);
    const l = await p.evaluate(z => K.lage(z), z);
    ok('Fall 5: C wartet (Sanduhr), tritt nicht bei', l.kampf && l.kampf.raw === 300000 && !l.kampf.an && l.wartet.length === 1 && l.wartet[0][1] === 1000, l);
    await entschieden(z, await p.evaluate(() => K.C));
    const r = await p.evaluate(z => { const a = K.kaempfe.filter(r => r.z === z); return { reihe: a.map(r => [r.who, r.raw, r.owner, r.besitzer]), bilA: K.bilanz(a[0], { [K.A]: 300000 }), bilC: a[1] && K.bilanz(a[1], { [K.C]: 1000 }) }; }, z);
    ok('Fall 5: erst A (erobert), danach C eigener Kampf gegen A – nichts doppelt/weg', r.reihe.length === 2 && r.reihe[0][1] === 300000 && r.reihe[0][3] === r.reihe[0][0] && r.reihe[1][1] === 1000 && r.reihe[1][2] === r.reihe[0][0] && alleOk(r.bilA) && alleOk(r.bilC), r); }

  // ---------- Fall 6 + 7 + 8: Rally auf ein Ziel + eigener Extra-Marsch + Extra-Marsch eines Verbündeten + ein Fremder
  { const z = await p.evaluate(() => K.z6 = K.z[4]);
    const st = await p.evaluate(() => {
      const w = bundOp(K.A, { op: 'rally', basis: K.ca, ziel: K.z6, min: 1, n: 400000 }); if (w) return { w };
      const r = bund.r.find(x => x.by === K.A); const w2 = bundOp(K.B, { op: 'rallyDazu', rid: r.id, von: K.b, n: 100000 }); if (w2) return { w2 };
      const s = pendingSends.find(s => s.senderBotId === K.B && s.rally === r.id); s.resolveAt = Date.now() - 10; K.rid = r.id; return {}; });
    await warte(() => bund.r.some(r => r.id === K.rid && r.j.every(j => j.da)), null, 5000);
    await p.evaluate(() => { const r = bund.r.find(x => x.id === K.rid); bundRallyLos(r); const a = pendingAttacks.find(a => a.rally && a.rally.id === K.rid); if (a) a.resolveAt = Date.now() - 10; });
    await kampfDa(z);
    await p.evaluate(() => { K.los(K.a2, K.z6, K.A, 50000); K.los(K.b2, K.z6, K.B2, 70000); K.los(K.c, K.z6, K.C, 2000); });
    await warte(z => K.kampf(z) && K.kampf(z).rawTroops === 620000 && pendingAttacks.some(a => a.targetId === z && a.wartet), z, 6000);
    const l = await p.evaluate(z => K.lage(z), z);
    ok('Rally gestartet (A 400.000 + B 100.000 per Rally beigetreten)', !st.w && !st.w2 && l.kampf && l.kampf.an && l.kampf.an.slice(0, 2).map(x => x[1]).join() === '400000,100000', { st, an: l.kampf && l.kampf.an });
    ok('Fall 6: eigener Extra-Marsch (50.000) tritt der Rally bei', l.kampf && l.kampf.an.some(x => x[0] === l.kampf.who && x[1] === 50000), l.kampf && l.kampf.an);
    ok('Fall 7: Extra-Marsch des Verbündeten B2 (70.000) tritt bei – Summe 620.000', l.kampf && l.kampf.raw === 620000 && l.kampf.an.some(x => x[1] === 70000), l.kampf);
    ok('Fall 8: Fremder C (2.000) wartet, tritt nicht bei', l.wartet.length === 1 && l.wartet[0][1] === 2000 && !l.kampf.an.some(x => x[1] === 2000), l.wartet);
    await entschieden(z, await p.evaluate(() => K.C));
    const r = await p.evaluate(z => { const a = K.kaempfe.filter(r => r.z === z); return { reihe: a.map(r => [r.who, r.raw, r.owner, r.besitzer]),
      bil: K.bilanz(a[0], { [K.A]: 450000, [K.B]: 100000, [K.B2]: 70000 }), bilC: a[1] && K.bilanz(a[1], { [K.C]: 2000 }) }; }, z);
    ok('Fall 6/7: Rally erobert – A bleibt mit seinem Anteil, B/B2 gehen heim, nichts doppelt/weg', r.reihe[0] && r.reihe[0][1] === 620000 && r.reihe[0][3] === r.reihe[0][0] && alleOk(r.bil) && r.bil.every(x => x.imKampf === x.gesandt) && r.bil[0].garn > 0 && r.bil.slice(1).every(x => x.heim > 0), r.bil);
    ok('Fall 8: C kämpft erst danach (eigener Kampf), nichts doppelt/weg', r.reihe.length === 2 && r.reihe[1][0] === (await p.evaluate(() => K.C)) && r.reihe[1][1] === 2000 && alleOk(r.bilC), r); }

  // ---------- Fall 6/7 umgekehrt: die Extra-Märsche (A, B2) kämpfen schon, die Rally kommt danach → sie tritt dem Kampf bei
  { const z = await p.evaluate(() => K.z7 = K.z[5]);
    await p.evaluate(() => K.los(K.a2, K.z7, K.A, 60000)); await kampfDa(z);
    await p.evaluate(() => K.los(K.b2, K.z7, K.B2, 40000));
    const w = await p.evaluate(() => { const w = bundOp(K.A, { op: 'rally', basis: K.ca, ziel: K.z7, min: 1, n: 300000 }); if (w) return w;
      const r = bund.r.find(x => x.by === K.A); bundRallyLos(r); const a = pendingAttacks.find(a => a.rally && a.rally.id === r.id); if (a) a.resolveAt = Date.now() - 10; return a ? '' : 'Rally nicht los'; });
    await warte(z => K.kampf(z) && K.kampf(z).rawTroops === 400000, z, 6000);
    const l = await p.evaluate(z => ({ lage: K.lage(z), n: pendingAttacks.filter(a => a.targetId === z).length }), z);
    ok('Fall 6/7 umgekehrt: Rally kommt nach den Extra-Märschen – EIN Kampf mit 400.000', !w && l.n === 1 && l.lage.kampf && l.lage.kampf.raw === 400000 && l.lage.kampf.an.length === 3, { w, l });
    await entschieden(z);
    const r = await p.evaluate(z => { const r = K.rec(z); return r && { besitzer: r.besitzer, who: r.who, bil: K.bilanz(r, { [K.A]: 360000, [K.B2]: 40000 }) }; }, z);
    ok('Fall 6/7 umgekehrt: Ergebnis – A erobert, B2 heim, nichts doppelt/weg', r && r.besitzer === r.who && alleOk(r.bil) && r.bil.every(x => x.imKampf === x.gesandt), r); }

  // ---------- Fall 9 + 10: Sammeln – Verbündeter darf nicht mitsammeln, eigener Extra-Marsch schon; Angriff auf die Sammler
  { const f = await p.evaluate(() => { const f = resFields.find(f => f.landmassId === islandById[K.ca].landmassId); if (!f) return null; fieldState[f.id] = { left: f.cap, occ: null };
      fieldMarches = fieldMarches.filter(m => m.fieldId !== f.id); K.fid = f.id; return f.id; });
    if (f === null) ok('Fall 9/10: Feld im Gebiet gefunden', false);
    else {
      const an = (who, home, n) => p.evaluate(([who, home, n]) => { const k = fieldMarches.length; AUF.frei.an(); try { fieldSend(K[who], K[home], K.fid, n); } finally { AUF.frei.aus(); }   // (Marsch-Plätze: eigene Regel)
        const m = fieldMarches[fieldMarches.length - 1];
        if (fieldMarches.length > k) m.resolveAt = Date.now() - 10; return fieldMarches.length > k; }, [who, home, n]);
      await an('A', 'ca', 1000); await warte(() => fieldState[K.fid].occ && fieldState[K.fid].occ.who === K.A, null, 5000);
      await an('B', 'b', 500); await an('A', 'a2', 700);
      await warte(() => fieldState[K.fid].occ && fieldState[K.fid].occ.troops === 1700, null, 5000);
      const s9 = await p.evaluate(() => ({ occ: fieldState[K.fid].occ && { who: fieldState[K.fid].occ.who, n: fieldState[K.fid].occ.troops },
        bHeim: fieldMarches.filter(m => m.who === K.B && m.fieldId === K.fid && m.back).map(m => [m.troops, m.load]), A: K.A }));
      ok('Fall 9: Verbündeter B sammelt nicht mit – kehrt mit allen 500 Truppen ohne Beute um', s9.bHeim.length === 1 && s9.bHeim[0][0] === 500 && s9.bHeim[0][1] === 0, s9);
      ok('Fall 9: eigener Extra-Marsch (700) tritt dem Sammeln bei (1.700)', s9.occ && s9.occ.who === s9.A && s9.occ.n === 1700, s9.occ);
      await an('C', 'c', 300); await warte(() => K.feld.some(k => k.aw === K.C), null, 5000);
      const s10 = await p.evaluate(() => ({ kampf: K.feld.filter(k => k.aw === K.C).pop(), occ: fieldState[K.fid].occ && { who: fieldState[K.fid].occ.who, n: fieldState[K.fid].occ.troops }, A: K.A, C: K.C }));
      const k = s10.kampf;
      ok('Fall 10: Angriff auf die Sammler – A verteidigt mit allen 1.700 (eigener Extra-Marsch kämpft mit)', k && k.aw === s10.C && k.dw === s10.A && k.dn === 1700 && k.an === 300, k);
      ok('Fall 10: nichts doppelt/weg (Sammler danach + Verluste = 1.700)', k && !k.won && s10.occ && s10.occ.who === s10.A && s10.occ.n + k.dLoss === 1700 && k.aLoss === 300, s10);
      info('Fall 10: ein Verbündeter kann Sammler nicht verstärken – sein Marsch kehrt um (Fall 9); Unterstützung am Feld gibt es im Spiel nicht (neue Regel)');
    } }

  // (Fall 11, die Anzeige: ihre Daten – jede Armee ein Eintrag in rally.an, Wartende mit „wartet“ – prüfen Fall 3, 5, 8; das Bild selbst die Darstellungs-Tests)
  console.log('Fehler:', fe.length ? fe : 'keine'); await b.close();
})();
