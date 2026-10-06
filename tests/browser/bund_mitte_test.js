// Bündnisse erobern die Mitte (Alexander 6.10.): Mitspieler starten Bündnis-Rallys auch auf NEUTRALE Tore, Tempel und den freien
// Thron (freie Türme nicht), rücken mit der Hauptstadt gemeinsam vor – und bei viel Ärger hinten zurück. Eine Rally-Quelle schickt
// nicht pauschal 90 %: wer bedroht ist oder Ärger im Bündnis sieht, behält mehr daheim.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => {
    const out = {}, now = Date.now(), alt = {};
    const stub = (n, f) => { alt[n] = window[n]; window[n] = f; };
    try {
      const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
      for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
      const [A, E, F, Z] = bots;
      for (const x of [A, E, F, Z]) botCoins[x.id] = 1e9;
      bundOp(A.id, { op: 'gruenden', name: 'Mittebund', tag: 'MTB', offen: true }); const a = bundVon(A.id);
      bundOp(E.id, { op: 'beitreten', aid: a.id }); bundOp(F.id, { op: 'beitreten', aid: a.id });
      const geben = (w, id, n) => { const ow = islandOwnerOf(id); if (ow && botOwnedIslands[ow]) botOwnedIslands[ow].delete(id); botOwnedIslands[w].add(id); islandTroops[id] = n; };
      // 1) Reiz: freier Turm kein Rally-Ziel; freier Thron vor Wächter-Tempel vor Tor (gleicher Abstand)
      const frei = typ => islands.find(i => !islandOwnerOf(i.id) && typ(i));
      const gate = islands.find(i => i.type === 'gate' && !islandOwnerOf(i.id) && landmasses[i.landmassId].tier === 'outer' && (islandsByLandmass[i.landmassId] || []).filter(t => t.type === 'tower' && !islandOwnerOf(t.id)).length >= 2);
      const turm = frei(i => i.type === 'tower'), wt = frei(i => i.guardian), thron = islandById[megaTempleId];
      const r = t => bundRallyReiz(t, null, { x: t.x + 1000, y: t.y });
      out.reiz = { turm: r(turm), thron: r(thron), waechter: r(wt), tor: r(gate), turmBesetzt: bundRallyReiz(turm, Z.id, { x: turm.x + 1000, y: turm.y }) };
      // 2) Rally-Plan auf das freie Tor: A und E haben je einen Turm in seiner Gegend, A allein zu schwach, zusammen stark genug
      const L = gate.landmassId, [tA, tE] = (islandsByLandmass[L] || []).filter(t => t.type === 'tower' && !islandOwnerOf(t.id));
      geben(A.id, tA.id, 100000); geben(E.id, tE.id, 200000);
      stub('botKennt', () => new Set(landmasses.map(l => l.id))); stub('botLearn', () => false); stub('travelDurationSeconds', () => 60);
      let ziel = gate.id, s = 100000 * botAtkFactor(A, true) * .96;
      stub('botIntel', (bot, id) => id === ziel ? { s } : null);
      const plan = () => bundRallyPlan(a, A, Date.now());
      out.tor = plan();
      ziel = tA.id === tE.id ? -1 : (islandsByLandmass[L] || []).find(t => t.type === 'tower' && !islandOwnerOf(t.id)).id; out.turm = plan();   // ein freier Turm: nicht
      ziel = gate.id;
      // 3) nach Lage: A selbst bedroht (Angriff von Z auf seine Hauptstadt) → weniger als 90 %; Ärger bei E (2 Basen angegriffen) → auch
      const angriff = (t, n) => ({ attackerBotId: Z.id, targetId: t, sourceId: botCapitalOf(Z.id), rawTroops: n || 1000, troops: n || 1000, startedAt: now, resolveAt: now + 3600000 });
      const capA = botCapitalOf(A.id), pa = [angriff(capA)]; pendingAttacks.push(...pa);
      out.bedroht = { plan: plan(), lage: bundRallyLage(A.id, a, Date.now()) };
      pendingAttacks.splice(pendingAttacks.indexOf(pa[0]), 1);
      while ([...botOwnedIslands[E.id]].filter(id => id !== tE.id).length < 2) geben(E.id, islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && landmasses[i.landmassId].tier === 'outer' && i.landmassId !== L).id, 3000);
      const eBasen = [...botOwnedIslands[E.id]].filter(id => id !== tE.id).slice(0, 2), pe = eBasen.map(id => angriff(id));
      pendingAttacks.push(...pe);
      out.aerger = { plan: plan(), lage: bundRallyLage(A.id, a, Date.now()), treff: bundTreffpunkt(a, A.id, Date.now()),
        mitte: (() => { const c = eBasen.map(id => islandById[id]); return { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 }; })() };
      for (const x of pe) pendingAttacks.splice(pendingAttacks.indexOf(x), 1);
      // 4) gemeinsam vorrücken: ohne Ärger liegt der Treffpunkt beim Schwerpunkt der anderen, ein Stück näher am Thron; A hat einen
      //    eigenen Turm dort → er verlegt seine Hauptstadt (Zufall 10 %: vorher griff es erst unter 5 %)
      const tp = bundTreffpunkt(a, A.id, Date.now()), cE = islandById[botCapitalOf(E.id)], cF = islandById[botCapitalOf(F.id)];
      out.treff = { tp, soll: { x: (cE.x + cF.x) / 2 * .6, y: (cE.y + cF.y) / 2 * .6 } };
      const nah = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && landmasses[i.landmassId].ring > 0 && !pendingAttacks.some(x => x.targetId === i.id))
        .sort((x, y) => Math.hypot(x.x - tp.x, x.y - tp.y) - Math.hypot(y.x - tp.x, y.y - tp.y))[0];
      geben(A.id, nah.id, 5000);
      const st = loadBotState()[A.id]; st.gems = 1000; st.capMovedAt = 0;
      out.vor = { cap: botCapitalOf(A.id), dVor: Math.hypot(islandById[botCapitalOf(A.id)].x - tp.x, islandById[botCapitalOf(A.id)].y - tp.y), nah: nah.id };
      stub('botOnline', bot => bot.id === A.id); stub('bundOp', () => 'Test'); stub('verstPruefen', () => {});
      const rnd = Math.random; Math.random = () => .1;
      try { bundMitspielerRunde(Date.now()); } finally { Math.random = rnd; }
      out.vor.nachher = botCapitalOf(A.id); out.vor.log = (a.log[0] || {}).t;
    } finally { for (const n in alt) window[n] = alt[n]; }
    return out; });
  ok(v.reiz.turm === null && v.reiz.thron < v.reiz.waechter && v.reiz.waechter < v.reiz.tor && v.reiz.turmBesetzt > v.reiz.tor, 'Rally-Ziele: freier Turm nein; freier Thron vor Wächter-Tempel vor Tor', v.reiz);
  ok(v.tor && v.tor.ziel !== undefined && v.tor.n === 90000, 'Bündnis-Rally auf das freie Tor (ohne Ärger 90 %)', v.tor);
  ok(v.turm === null, 'Freier Turm: keine Bündnis-Rally', v.turm);
  ok(v.bedroht.plan && v.bedroht.plan.n < 90000 && v.bedroht.lage < 1, 'Quelle bedroht: schickt weniger als 90 %', v.bedroht);
  ok(v.aerger.plan && v.aerger.plan.n < 90000 && v.aerger.lage < 1, 'Ärger im Bündnis: Quelle schickt weniger', v.aerger.plan);
  ok(v.aerger.treff.zurueck && Math.abs(v.aerger.treff.x - v.aerger.mitte.x) < 1 && Math.abs(v.aerger.treff.y - v.aerger.mitte.y) < 1, 'Viel Ärger hinten: Treffpunkt dort (zurück)', v.aerger);
  ok(!v.treff.tp.zurueck && Math.abs(v.treff.tp.x - v.treff.soll.x) < 1 && Math.abs(v.treff.tp.y - v.treff.soll.y) < 1, 'Ohne Ärger: Treffpunkt beim Schwerpunkt, näher am Thron', v.treff);
  ok(v.vor.nachher === v.vor.nah && /vorgerückt/.test(v.vor.log || ''), 'Mitspieler rückt mit der Hauptstadt zum Treffpunkt vor', v.vor);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
