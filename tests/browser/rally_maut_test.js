// Rally-Maut (Alexander #11): jeder Teilnehmer zahlt die Maut für SEINE Truppen (nach Anteil); kann einer nicht zahlen,
// bleibt nur er draußen (seine Truppen gehen heim), die anderen zahlen neu und marschieren (Alexander B1); kann der Anführer
// nicht zahlen, geht die Rally nicht los und alle Truppen gehen heim. Dazu Fehlerschutz beim Losmarsch:
// wirft etwas, bleibt die Rally nicht stehen (sonst Truppen und Angriff doppelt in der nächsten Sekunde).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (/FEHLER/.test(m.text())) fe.push(m.text().slice(0, 300)); });
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 4);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, E, Z, F] = bots, aCap = botCapitalOf(A.id), eCap = botCapitalOf(E.id), ziel = botCapitalOf(Z.id);
    botCoins[A.id] = 1e9; bundOp(A.id, { op: 'gruenden', name: 'Test', tag: 'TST', offen: true }); bundOp(E.id, { op: 'beitreten', aid: bundVon(A.id).id }); bundOp(F.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const tore = []; tollFor = (f, t, n, payer) => { tore.push({ n, payer }); return { gate: islandById[ziel], cost: 4000 }; };   // ein Tor von Z: 4000 Münzen für alle
    const heim = []; bundHeimschicken = (w, von, nach, n) => heim.push({ w, n });
    const rally = (id, n0, nE, nF) => { const r = { id, by: A.id, at: aCap, t: ziel, n0, j: [{ w: E.id, f: eCap, n: nE, da: true }].concat(nF ? [{ w: F.id, f: botCapitalOf(F.id), n: nF, da: true }] : []), aid: bundVon(A.id).id, los: Date.now() - 1 }; bund.r.push(r); return r; };
    const atk = id => pendingAttacks.filter(x => x.rally && x.rally.id === id).length;
    const geld = () => ({ A: botCoins[A.id], E: botCoins[E.id], F: botCoins[F.id], Z: botCoins[Z.id] });
    const out = {};
    const takt = () => { bundMem.sigSeh = bundMem.rallySeh = bundMem.runde = Date.now(); bundTakt(); };   // (nur die Rallys – sonst treten Mitspieler zufällig dem Bündnis bei, z. B. Z)
    // 1) Maut nach Anteil: Alex 3000 Truppen, Emma 1000 → 3000 + 1000 Münzen, Z bekommt 4000
    botCoins[A.id] = 1e6; botCoins[E.id] = 1e6; botCoins[Z.id] = 0;
    bundRallyLos(rally('rm1', 3000, 1000));
    out.m1 = { g: geld(), atk: atk('rm1'), tor: tore[tore.length - 1], drin: bund.r.some(x => x.id === 'rm1') };
    // 2) Emma kann ihren Teil nicht zahlen → nur sie bleibt draußen (ihre Truppen heim), Alex + Finn zahlen neu und marschieren
    const mp0 = marschPlatz; marschPlatz = () => true;                        // (Marsch-Plätze: rm1 läuft noch)
    botCoins[E.id] = 500; botCoins[F.id] = 1e6; botCoins[Z.id] = 0; heim.length = 0; const t0 = islandTroops[aCap] || 0, g0 = geld();
    bundRallyLos(rally('rm2', 3000, 1000, 1000));
    const a2 = pendingAttacks.find(x => x.rally && x.rally.id === 'rm2'), g2 = geld();
    out.m2 = { atk: atk('rm2'), drin: bund.r.some(x => x.id === 'rm2'), alexDa: (islandTroops[aCap] || 0) - t0, heim: heim.slice(), n: a2 && a2.rawTroops,
      an: a2 ? a2.rally.an.map(x => x[0] === A.id ? 'A' : x[0] === E.id ? 'E' : 'F') : null, tor: tore[tore.length - 1].n,
      zahlt: { A: g0.A - g2.A, E: g0.E - g2.E, F: g0.F - g2.F, Z: g2.Z - g0.Z } };
    // 2b) Der Anführer kann nicht zahlen → die ganze Rally fällt aus, keiner zahlt, alle Truppen heim
    botCoins[A.id] = 100; botCoins[E.id] = 1e6; heim.length = 0; const t2 = islandTroops[aCap] || 0, g2b = geld();
    bundRallyLos(rally('rm2b', 3000, 1000, 1000)); marschPlatz = mp0; const g2n = geld();
    out.m2b = { atk: atk('rm2b'), drin: bund.r.some(x => x.id === 'rm2b'), alexDa: (islandTroops[aCap] || 0) - t2, heim: heim.map(x => x.n), zahlt: g2b.A - g2n.A + g2b.E - g2n.E + g2b.F - g2n.F + g2n.Z - g2b.Z };
    botCoins[A.id] = 1e6;
    // 3) Fehler nach dem Losmarsch (rallyWerte wirft): Rally ist raus, im nächsten Takt kein zweiter Angriff
    botCoins[E.id] = 1e6; const rw = rallyWerte; rallyWerte = () => { throw new Error('Test'); };
    const w0 = window.WELT, cw = console.warn, warn = []; console.warn = (...x) => warn.push(String(x[0])); window.WELT = { leiter: true };
    const t3 = islandTroops[aCap] || 0;
    const zo = bundZielOk, os = ownerShielded; bundZielOk = () => ''; ownerShielded = () => false;   // (mit WELT gelten die Schilde der Mitspieler – hier egal)
    try { rally('rm3', 3000, 1000); takt(); takt(); } finally { window.WELT = w0; rallyWerte = rw; }
    out.m3 = { atk: atk('rm3'), drin: bund.r.some(x => x.id === 'rm3'), alexDa: (islandTroops[aCap] || 0) - t3, warn: warn.slice() }; warn.length = 0;
    // 4) Fehler vor dem Start (launchAttack wirft): Rally raus, Truppen wieder heim, nichts doppelt
    const la = launchAttack; launchAttack = () => { throw new Error('Test'); }; heim.length = 0; window.WELT = { leiter: true };
    const t4 = islandTroops[aCap] || 0;
    try { rally('rm4', 3000, 1000); takt(); takt(); } finally { window.WELT = w0; launchAttack = la; console.warn = cw; bundZielOk = zo; ownerShielded = os; }
    out.m4 = { atk: atk('rm4'), drin: bund.r.some(x => x.id === 'rm4'), alexDa: (islandTroops[aCap] || 0) - t4, heim: heim.slice(), warn: warn.slice() };
    // 5) Fehler NACH dem Eintragen in launchAttack (z. B. beim Zeichnen): der Angriff marschiert – nichts heim, Maut einmal
    console.warn = (...x) => warn.push(String(x[0])); warn.length = 0; heim.length = 0; window.WELT = { leiter: true }; bundZielOk = () => ''; ownerShielded = () => false;
    launchAttack = (...x) => { la(...x); throw new Error('Test'); }; const mp = marschPlatz; marschPlatz = () => true;   // (Marsch-Plätze: rm1/rm3 laufen noch)
    const t5 = islandTroops[aCap] || 0, g5 = geld();
    try { rally('rm5', 3000, 1000); takt(); takt(); } finally { window.WELT = w0; launchAttack = la; marschPlatz = mp; console.warn = cw; bundZielOk = zo; ownerShielded = os; }
    const a5 = pendingAttacks.find(x => x.rally && x.rally.id === 'rm5'), g5n = geld();
    out.m5 = { atk: atk('rm5'), drin: bund.r.some(x => x.id === 'rm5'), alexDa: (islandTroops[aCap] || 0) - t5, heim: heim.slice(), warn: warn.slice(),
      n: a5 && a5.troops, rally: !!(a5 && a5.rally.an), zahltA: g5.A - g5n.A, zahltE: g5.E - g5n.E };
    // 6) Emma kann nicht zahlen, und beim Aussortieren wirft etwas (Meldung): Rally weg, alle Truppen genau einmal zurück, keiner zahlt
    marschPlatz = () => true; botCoins[E.id] = 500; heim.length = 0; warn.length = 0; console.warn = (...x) => warn.push(String(x[0]));
    const bm = bundMelden; bundMelden = () => { throw new Error('Test'); }; const t6 = islandTroops[aCap] || 0, g6 = geld(); let wirft = false;
    try { bundRallyLos(rally('rm6', 3000, 1000, 1000)); } catch (e) { wirft = true; } finally { bundMelden = bm; marschPlatz = mp; console.warn = cw; }
    const g6n = geld();
    out.m6 = { atk: atk('rm6'), drin: bund.r.some(x => x.id === 'rm6'), alexDa: (islandTroops[aCap] || 0) - t6, heim: heim.map(x => x.n), warn: warn.slice(), wirft,
      zahlt: g6.A - g6n.A + g6.E - g6n.E + g6.F - g6n.F + g6n.Z - g6.Z };
    return out; });
  ok(v.m1.atk === 1 && !v.m1.drin && v.m1.tor.n === 4000, 'Rally geht los, Maut für alle 4000 Truppen', v.m1);
  ok(v.m1.g.A === 1e6 - 3000 && v.m1.g.E === 1e6 - 1000 && v.m1.g.Z === 4000, 'Jeder zahlt seinen Anteil der Maut (3000 / 1000), der Tor-Besitzer bekommt alles', v.m1.g);
  ok(v.m2.atk === 1 && !v.m2.drin && v.m2.n === 4000 && v.m2.tor === 4000 && JSON.stringify(v.m2.an) === '["A","F"]', 'Emma kann nicht zahlen: Rally läuft mit Alex und Finn (4000 Truppen)', v.m2);
  ok(v.m2.zahlt.A === 3000 && v.m2.zahlt.F === 1000 && v.m2.zahlt.E === 0 && v.m2.zahlt.Z === 4000, 'Maut genau einmal, nur von den Zahlern', v.m2.zahlt);
  ok(v.m2.alexDa === 0 && v.m2.heim.length === 1 && v.m2.heim[0].n === 1000, 'Nur Emmas 1000 Truppen gehen heim, Summe stimmt', v.m2);
  ok(v.m2b.atk === 0 && !v.m2b.drin && v.m2b.alexDa === 3000 && v.m2b.heim.join() === '1000,1000' && v.m2b.zahlt === 0, 'Anführer kann nicht zahlen: ganze Rally fällt aus, keiner zahlt, alle heim', v.m2b);
  ok(v.m3.atk === 1 && !v.m3.drin && v.m3.alexDa === 0 && v.m3.warn.length === 1, 'Fehler nach dem Losmarsch: EIN Angriff, Rally nicht mehr da, keine doppelten Truppen', v.m3);
  ok(v.m4.atk === 0 && !v.m4.drin && v.m4.alexDa === 3000 && v.m4.heim.length === 1 && v.m4.heim[0].n === 1000 && v.m4.warn.length === 1, 'Fehler vor dem Start: Rally weg, Truppen genau einmal zurück', v.m4);
  ok(v.m5.atk === 1 && !v.m5.drin && v.m5.alexDa === 0 && v.m5.heim.length === 0 && v.m5.rally && v.m5.warn.length === 1, 'Fehler nach dem Eintragen: Angriff marschiert, Rally weg, keine Truppen doppelt heim', v.m5);
  ok(v.m5.zahltA === 3000 && v.m5.zahltE === 1000, 'Dabei Maut genau einmal bezahlt', v.m5);
  ok(v.m6.atk === 0 && !v.m6.drin && v.m6.alexDa === 3000 && v.m6.heim.join() === '1000,1000' && v.m6.zahlt === 0 && v.m6.warn[0] === 'Rally:', 'Fehler beim Aussortieren: Rally weg, Truppen genau einmal zurück, keiner zahlt', v.m6);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
