// Kampfbericht im Bündnis teilen (Alexander 5.10., LIESMICH 11b I): Knopf im Kampfbericht → Zeile im Bündnis-Chat (Ort, Sieg,
// Stärke des Gegners, „Zeigen“). Die Mitspieler verstehen ihn: Gegner schwach → „Schwach – ich greife mit an!“ (und sie greifen an,
// der Bericht zählt wie ein Späher); für jeden allein zu stark → vorsichtig („Zu stark – lieber eine Rally!“, keiner allein), und
// reicht das Bündnis zusammen, startet einer eine Rally; viel zu stark → nur vorsichtig. Alter Bericht → keine Reaktion.
// Ort gehört dem Bündnis (gewonnen/gehalten) → „Gut gemacht!“. Ohne Bündnis kein Knopf.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    // H und G (Mitspieler, online) mit Basen auf derselben Insel wie die Gegner-Basis E von X; M (echter Spieler) teilt den Bericht
    let H, E, F; for (const h of bots) { const L = islandById[botCapitalOf(h.id)].landmassId, frei = islands.filter(i => i.landmassId === L && i.id !== megaTempleId && !islandOwnerOf(i.id));
      if (frei.length >= 2) { H = h; E = frei[0].id; F = frei[1].id; break; } }
    if (!H) return { fehler: 'keine zwei freien Inseln neben einem Mitspieler' };
    const [M, G, X] = bots.filter(x => x !== H), HQ = botCapitalOf(H.id);
    for (const x of [M, H, G, X]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    botOwnedIslands[X.id].add(E); botOwnedIslands[G.id].add(F); botDropShield(X.id); botCoins[M.id] = botCoins[H.id] = botCoins[G.id] = 1e9;
    bundOp(M.id, { op: 'gruenden', name: 'Berichtprobe', tag: 'BRP', offen: true }); const a = bundVon(M.id);
    bundOp(H.id, { op: 'beitreten', aid: a.id }); bundOp(G.id, { op: 'beitreten', aid: a.id });
    const st = loadBotState(); for (const w of [H.id, G.id]) st[w].handy = { r: 0, bis: Date.now() + 1e9 }; saveBotState();
    a.mit = a.mit.filter(w => w === M.id || w === H.id || w === G.id); bundIndex();
    const zeilen = k => ((bundChat[a.id] || {}).l || []).filter(x => x.k === k);
    const frisch = () => { bundMem.chatQ = []; bundMem.chatAt = {}; bundMem.ziel = {}; bundMeldeZeit.clear(); bundWegMem.clear(); baseFought[E] = Date.now(); };
    const teilen = () => bundOp(M.id, { op: 'chat', k: 'bericht', z: E, s: false, n: 5300, v: 'a' });
    const Q = () => bundMem.chatQ.map(q => ({ w: q.w, k: q.k, ziel: q.tat && q.tat.ziel, rally: !!(q.tat && q.tat.rally) }));
    const S = () => effectiveTroops(islandById[E]) + effectiveDefense(islandById[E]);
    const out = {}, zufall = Math.random;
    botById[M.id].mensch = true;
    try {
      // 1) schwacher Gegner
      islandTroops[E] = 1000; islandTroops[HQ] = 500000; islandTroops[F] = 500000; frisch();
      const why = teilen(), zl = zeilen('bericht').pop(), q1 = Q();
      out.zeile = { why, d: zl && zl.d, z: zl && zl.z === E, text: zl ? bundChatText(zl, false) : '' };
      out.schwach = { q: q1, intel: (botIntelMem[H.id] || {})[E] && botIntelMem[H.id][E].s === S() };
      bundChatTakt(Date.now() + 60000);
      out.schwach.zeilen = zeilen('schwach').length; out.schwach.ziel = [H.id, G.id].filter(w => bundMem.ziel[w] && bundMem.ziel[w].t === E).length;
      // 2) für jeden allein zu stark, zusammen reicht es → vorsichtig, einer startet eine Rally
      islandTroops[HQ] = 300000; islandTroops[F] = 300000; frisch();
      const kH = bundAngriffKraft(H, E), kG = bundAngriffKraft(G, E); islandTroops[E] = 0; const d0 = S(); islandTroops[E] = 100000; const proT = (S() - d0) / 100000;
      islandTroops[E] = Math.max(0, Math.round(((kH + kG) / 1.4 - d0) / proT));
      out.kraft = { kH, kG, S: S() };
      teilen(); const q2 = Q();
      out.stark = { q: q2, ziel: [H.id, G.id].filter(w => bundMem.ziel[w]).length };
      bundChatTakt(Date.now() + 60000);
      const rl = bund.r.find(x => x.t === E && x.aid === a.id);
      out.stark.zeilen = zeilen('stark').length; out.stark.rally = !!rl; out.stark.starter = rl ? rl.by : null;
      if (rl) bundRallyEnde(rl, 'Test vorbei');
      // 3) viel zu stark → nur vorsichtig, keine Rally
      islandTroops[E] = 1e12; frisch(); teilen();
      out.vielZuStark = Q();
      // 4) alter Bericht (Kampf vor 20 Min.) → keine Reaktion
      islandTroops[E] = 1000; frisch(); baseFought[E] = Date.now() - 20 * 60000; const n4 = zeilen('bericht').length; teilen();
      out.alt = { q: Q().length, zeile: zeilen('bericht').length - n4 };
      // 5) der Ort gehört jetzt dem Bündnis (gehalten) → „Gut gemacht!“
      botOwnedIslands[X.id].delete(E); botOwnedIslands[H.id].add(E); frisch(); Math.random = () => .1;
      try { bundOp(M.id, { op: 'chat', k: 'bericht', z: E, s: true, n: 8000, v: 'v' }); } finally { Math.random = zufall; }
      out.gut = Q().filter(q => q.k === 'gut').length;
      botOwnedIslands[H.id].delete(E); botOwnedIslands[X.id].add(E);
    } finally { botById[M.id].mensch = false; for (const x of bund.r.filter(x => x.aid === a.id)) bundRallyEnde(x, 'Test vorbei'); }
    // 6) Kampfbericht am Handy (Zuschauer im Bündnis): Knopf „Im Bündnis teilen“ → Befehl mit Ort, Sieg, Gegner-Stärke
    window.__befehle = [];
    const W = { leiter: false, ich: 'u999', menschen: {}, beiNachricht: [], befehl(art, d) { window.__befehle.push(Object.assign({ art }, d)); }, nachricht() {}, bericht() {} };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
    a.mit.push('player'); bundIndex();
    combatLog.unshift({ type: 'attack', at: Date.now(), names: {}, sourceId: playerIslandId, targetId: E, won: false, myTroops: 4000, attackBuff: 200, skillBuff: 200, titleBuff: 0, enemyTroops: 5000, enemyDefense: 300, defenseBuff: 0, attackerCasualties: 3000, retreatSurvivors: 1000 });
    renderCombatLog();
    const knopf = combatLogListEl.querySelector('.logRow [data-logteilen]'); if (knopf) knopf.click();
    const bf = window.__befehle.find(x => x.op === 'chat' && x.k === 'bericht');
    a.mit = a.mit.filter(w => w !== 'player'); bundIndex(); renderCombatLog();
    out.knopf = { da: !!knopf, befehl: bf ? { z: bf.z === E, s: bf.s, n: bf.n, v: bf.v } : null, ohneBund: !!combatLogListEl.querySelector('[data-logteilen]') };
    return out;
  });
  console.log(JSON.stringify(r));
  if (r.fehler) { ok(false, r.fehler); await b.close(); return; }
  ok(r.zeile.why === '' && r.zeile.z && r.zeile.d && r.zeile.d.s === 0 && r.zeile.d.n === 5300 && r.zeile.d.v === 'a' && /Kampfbericht geteilt: Angriff auf .* – Niederlage · Gegner 5\.300/.test(r.zeile.text), 'Zeile im Bündnis-Chat: Ort, Ergebnis, Stärke des Gegners', r.zeile);
  ok(r.schwach.q.length === 2 && r.schwach.q.every(q => q.k === 'schwach' && q.ziel !== undefined) && r.schwach.intel, 'schwacher Gegner: beide Mitspieler „Schwach – ich greife mit an!“ (Bericht zählt wie ein Späher)', r.schwach);
  ok(r.schwach.zeilen === 2 && r.schwach.ziel === 2, '… und sie greifen ihn an (Ziel gesetzt)', r.schwach);
  ok(r.stark.q.filter(q => q.k === 'stark').length === 1 && !r.stark.q.some(q => q.k === 'schwach') && r.stark.ziel === 0, 'für jeden allein zu stark: einer sagt „Zu stark – lieber eine Rally!“, keiner greift allein an', { kraft: r.kraft, q: r.stark.q });
  ok(r.stark.rally && r.stark.q.some(q => q.k === 'starte' && q.rally), 'zusammen reicht es: einer startet eine Rally auf das Ziel', r.stark);
  ok(r.vielZuStark.length === 1 && r.vielZuStark[0].k === 'stark', 'viel zu stark: nur vorsichtig, keine Rally', r.vielZuStark);
  ok(r.alt.q === 0 && r.alt.zeile === 1, 'alter Bericht: Zeile ja, aber keine Reaktion der Mitspieler', r.alt);
  ok(r.gut === 1, 'Ort gehört dem Bündnis: „Gut gemacht!“', r.gut);
  ok(r.knopf.da && r.knopf.befehl && r.knopf.befehl.z && r.knopf.befehl.s === false && r.knopf.befehl.n === 5300 && r.knopf.befehl.v === 'a' && !r.knopf.ohneBund, 'Kampfbericht: Knopf „Im Bündnis teilen“ schickt Ort, Ergebnis und Gegner-Stärke (ohne Bündnis kein Knopf)', r.knopf);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
