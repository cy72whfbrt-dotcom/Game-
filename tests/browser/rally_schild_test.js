// Rally „jeder für sich“ (Alexander 5.10.): jeder verliert nach SEINEM Schild (Ausrüstung), seine Überlebenden gehen zu ihm heim,
// und bei einem Boss bekommt JEDER Teilnehmer den vollen Preis (Kiste, Gems, Splitter).
// Anführer „Alex“ ohne Schild, „Emma“ mit 80 % Schild, gegen eine Basis mit viel Abwehr (damit es Verluste gibt).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (/FEHLER/.test(m.text())) fe.push(m.text().slice(0, 300)); });
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 3);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, E, Z] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Test', tag: 'TST', offen: true }); bundOp(E.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const bm = botMults; botMults = w => { const m = Object.assign({}, bm(w)); if (w === A.id) m.shield = 0; if (w === E.id) m.shield = 80; return m; };   // (Alex: kein Schild, Emma: 80 %)
    const bgr = botGoldRate; botGoldRate = (w, k) => k === 'attackGold' && (w === A.id || w === E.id) ? (w === A.id ? 1 : 2) : bgr(w, k);   // (Gold je Kill: Alex 1, Emma 2)
    const ziel = botCapitalOf(Z.id); islandTroops[ziel] = 1000;
    const ed = effectiveDefense; effectiveDefense = t => t && t.id === ziel ? 2e6 : ed(t); const et = effectiveTroops; effectiveTroops = t => t && t.id === ziel ? 1000 : et(t);                    // viel Abwehr → Verluste
    const preise = [], ba = bossAt; bossAt = id => id === ziel ? { name: 'Testboss', troops: 0, endsAt: 4711 } : ba(id);   // (ein Boss am Ziel)
    const ep = evPreis; evPreis = (w, src, title, pr) => { preise.push({ w, src, crate: pr.crate, gems: pr.gems, sh: pr.sh }); };
    endWander = () => {}; spawnBattleFx = () => {};
    const heim = []; const bh = bundHeimschicken; bundHeimschicken = (w, von, nach, n) => { heim.push({ w, n }); };
    window.__t = { A: A.id, E: E.id, preise, heim, berichte: [] };
    const orig = resolveBotAttack;
    resolveBotAttack = function (a) {
      const w0 = window.WELT; botById[A.id].mensch = botById[E.id].mensch = true;
      window.WELT = new Proxy({}, { get: (o, k) => k === 'bericht' ? (w, e, txt) => __t.berichte.push({ w, e: JSON.parse(JSON.stringify(e)), txt }) : k === 'wache' ? undefined : () => [] });
      try { return orig.apply(this, arguments); } finally { window.WELT = w0; botById[A.id].mensch = botById[E.id].mensch = false; }
    };
    const r = { id: 'rs1', by: A.id, at: botCapitalOf(A.id), t: ziel, n0: 3e6, j: [{ w: E.id, f: botCapitalOf(E.id), n: 1e6, da: true }], aid: bundVon(A.id).id };
    for (const br of bridges) { clearIslandOwner(br.gateId); botOwnedIslands[A.id].add(br.gateId); }   // (Weg frei: Märsche nur über eigene Pässe – alle Tore dem Anführer)
    bund.r.push(r); bundRallyLos(r);
    const a = pendingAttacks.find(x => x.rally && x.rally.id === 'rs1'); if (!a) return { fehler: 'keine Rally' };
    a.resolveAt = Date.now() + 300;
    return { an: a.rally.an.map(x => [x[0] === A.id ? 'Alex' : 'Emma', x[2], x[5]]), redA: a.shieldLossReductionPct }; });
  ok(v.an && v.an[1][2] === 80, 'Emma bringt ihren Schild mit (80 %)', v);
  await p.waitForTimeout(30000);
  const e = await p.evaluate(() => { const { A, E, berichte, heim, preise } = __t, q = berichte.find(x => x.w === A && x.e.type === 'attack');
    const L = q && q.e.angreifer || [], f = w => { const x = L.find(y => y.w === w); return x ? x.fallen + x.wounded : null; };
    const hn = w => heim.filter(x => x.w === w).reduce((s, x) => s + x.n, 0);
    return { won: q && q.e.won, def: q && q.e.enemyDefense, my: q && q.e.myTroopsBuffed, redA: q && q.e.lossReductionPct, vA: f(A), vE: f(E), heimA: hn(A), heimE: hn(E),
      preise: preise.map(x => ({ an: x.w === A ? 'Alex' : x.w === E ? 'Emma' : x.w, src: x.src, crate: x.crate, gems: x.gems })) }; });
  console.log(JSON.stringify(e));
  const sollA = Math.round(e.def * (1 - (e.redA || 0) / 100) * 3e6 / e.my), sollE = Math.round(e.def * 0.2 * 1e6 / e.my);
  ok(e.won && Math.abs(e.vA - sollA) <= 2, 'Alex verliert nach SEINEM Schild', { verlust: e.vA, soll: sollA, schild: e.redA });
  ok(e.won && Math.abs(e.vE - sollE) <= 2 && e.vE < e.vA / 3 * 0.5, 'Emma verliert nach IHREM Schild (80 % weniger)', { verlust: e.vE, soll: sollE });
  ok(e.heimE === 1e6 - e.vE, 'Emmas Überlebende gehen genau zu ihr heim', { heim: e.heimE, soll: 1e6 - e.vE });
  ok(e.preise.filter(x => x.src === 'wboss').length === 2 && ['Alex', 'Emma'].every(w => e.preise.some(x => x.an === w && x.crate >= 0 && x.gems > 0)), 'Boss: Alex UND Emma bekommen Kiste + Gems', e.preise);
  // Kill-Gold: jeder für den Teil, den SEINE Truppen töten (mit seinem Satz) – Bericht = Auszahlung
  const g = await p.evaluate(() => { const { A, E, berichte } = __t, q = berichte.find(x => x.w === A && x.e.type === 'attack'), m = berichte.find(x => x.w === E && x.e.type === 'attack');
    const L = q.e.angreifer; return { alex: (L.find(x => x.w === A) || {}).gold, emma: (L.find(x => x.w === E) || {}).gold, berichtAlex: q.e.killGold, berichtEmma: m && m.e.killGold, kA: (L.find(x => x.w === A) || {}).k, kE: (L.find(x => x.w === E) || {}).k, tote: q.e.enemyTroops }; });
  const sollEg = Math.round(g.tote * g.kE / (g.kA + g.kE) * 2), sollAl = Math.round(g.tote * g.kA / (g.kA + g.kE) * 1);
  ok(g.emma > 0 && Math.abs(g.emma - sollEg) <= 1 && Math.abs(g.alex - sollAl) <= 1 && g.berichtEmma === g.emma && g.berichtAlex === g.alex, 'Kill-Gold je Spieler – Bericht passt zur Auszahlung', g);
  // Bündnis verlassen nach dem Losmarsch: kämpft nicht mit, Truppen gehen heim
  const r = await p.evaluate(() => { const { A, E } = __t; __t.heim.length = 0;
    const att = { rawTroops: 4e6, attackBonus: 500000, rally: { by: A, an: [[A, botCapitalOf(A), 3e6], [E, botCapitalOf(E), 1e6, 300000]] } };
    bundOp(E, { op: 'verlassen' }); rallyAussortieren(att, botCapitalOf(A));
    return { raw: att.rawTroops, bonus: att.attackBonus, an: att.rally.an.length, heim: __t.heim.map(x => x.n) }; });
  ok(r.raw === 3e6 && r.bonus === 200000 && r.an === 1 && r.heim[0] === 1e6, 'Emma verlässt das Bündnis nach dem Losmarsch: ihre Truppen gehen heim', r);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
