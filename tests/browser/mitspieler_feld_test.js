// Mitspieler und Feld-Armeen (5.10.): wer eine Armee im Feld entdeckt, greift sie an – deine wie die echter Spieler (Weltrechner),
// für alle gleich: Friedensschild und Bündnis schützen sie, der Kampfbericht geht an den Eigentümer (bei echten Spielern als
// Nachricht über WELT.bericht). Dazu die Startverteilung nach einem Neustart: ausgeschiedene Mitspieler bekommen keinen Turm
// geschenkt (sie warten auf botRespawn), neu dazugekommene schon. Hauptstadt der Mitspieler ist immer ein Turm.
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await ctx.addInitScript(() => {             // vor dem Laden (nur einmal, wenn der Test es anfordert): einen Mitspieler aus dem gespeicherten Besitz streichen = „neu dazugekommen“
    try { const neu = localStorage.getItem('testNeuerMitspieler'); if (!neu) return; localStorage.removeItem('testNeuerMitspieler');
      const r = JSON.parse(localStorage.getItem('openWaterBotOwnedIslands')); delete r[neu]; localStorage.setItem('openWaterBotOwnedIslands', JSON.stringify(r)); } catch (e) {}
  });
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof armyBotWatch === 'function' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });

  // 1) Feld-Armee eines echten Spielers (X) neben der Basis eines Mitspielers (Y)
  const r = await ev(() => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (keiner zieht nebenher)
    const mitTurm = BOT_DEFS.filter(d => !d.mensch && [...botOwnedIslands[d.id]].some(id => islandById[id].type === 'tower' && !bossAt(id)));
    const X = mitTurm[0], Y = mitTurm.find(d => d !== X && d.id !== X.id);
    for (const d of [X, Y]) { if (bundVon(d.id)) bundOp(d.id, { op: 'verlassen' }); const s = loadBotState()[d.id]; s.shieldUntil = 0; s.neuBis = 0; }
    const yb = islandById[[...botOwnedIslands[Y.id]].find(id => islandById[id].type === 'tower' && !bossAt(id))];
    islandTroops[yb.id] = 1e6;
    const echt = X.mensch; X.mensch = true;
    const onl = window.botOnline, zuf = Math.random; window.botOnline = () => true; Math.random = () => 0;
    const berichte = [], hints = []; const fh = window.flashHint; window.flashHint = t => hints.push(t);
    const out = { X: X.id };
    const neueArmee = (who, id) => { const a = { id, x: yb.x + ISLAND_RADIUS * 3, y: yb.y, lm: yb.landmassId, troops: 1000, homeId: null, mv: null }; if (who) a.who = who; armies = armies.filter(q => q.id !== id); armies.push(a); return a; };
    try {
      const now = Date.now();
      let a = neueArmee(X.id, 'atestX');
      armyBotWatch(now); out.entdeckt = !!(a.seen && a.seen.bot);
      armyBotWatch(now + 16000); const raid = armyRaids.find(q => q.armyId === a.id);
      out.raid = !!raid; out.raidWer = raid && raid.tOwner; out.hintsAnDich = hints.length;   // (tOwner: welt.js gibt den Angriff nur dem Eigentümer aufs Handy)
      // Bündnis: dieselbe Armee, X und der Entdecker im selben Bündnis → keiner greift an
      armyRaids = armyRaids.filter(q => q !== raid); if (raid) islandTroops[raid.baseId] += raid.troops;
      const Z = botById[raid ? raid.botId : Y.id]; botCoins[X.id] = 1e9;
      X.mensch = echt; bundOp(X.id, { op: 'gruenden', name: 'Feldtest', tag: 'FLD', offen: true }); bundOp(Z.id, { op: 'beitreten', aid: bundVon(X.id).id }); X.mensch = true;   // (Bündnis-Kasse: die prüft beim echten Spieler der Weltrechner)
      out.freunde = bundFreund(X.id, Z.id);
      a = neueArmee(X.id, 'atestX'); armyBotWatch(now); armyBotWatch(now + 16000);
      out.bundRaid = armyRaids.some(q => q.armyId === a.id && q.botId === Z.id);
      X.mensch = echt; bundOp(Z.id, { op: 'verlassen' }); bundOp(X.id, { op: 'verlassen' }); X.mensch = true;
      armyRaids = armyRaids.filter(q => q.armyId !== a.id);
      // Friedensschild des echten Spielers: keiner greift an
      loadBotState()[X.id].shieldUntil = now + 3600000; a = neueArmee(X.id, 'atestX'); armyBotWatch(now); armyBotWatch(now + 16000);
      out.schildRaid = armyRaids.some(q => q.armyId === a.id); loadBotState()[X.id].shieldUntil = 0;
      armyRaids = armyRaids.filter(q => q.armyId !== a.id);
      // der Angriff kommt an: Kampf mit den Werten von X, Bericht an X (nicht in deinen Kampflog)
      a = neueArmee(X.id, 'atestX'); a.troops = 20000;
      loadBotState()[X.id].city.levels.hospital = 10; loadBotState()[X.id].wounded = 0;   // (Platz im Krankenhaus)
      const log0 = combatLog.length, wund0 = loadBotState()[X.id].wounded || 0, def0 = playerStats.defends || 0;
      const r2 = { botId: Y.id, baseId: yb.id, armyId: a.id, tOwner: X.id, troops: 500000, tx: a.x, ty: a.y, lm: a.lm, startedAt: now - 1000, resolveAt: now };
      window.WELT = new Proxy({ leiter: true, menschen: {}, bericht(w, e, h) { berichte.push({ w, e, h }); } }, { get: (o, k) => k in o ? o[k] : () => {} });   // (Weltrechner: Berichte an echte Spieler)
      armyRaidArrive(r2, now); delete window.WELT;
      out.armeeWeg = !armyById(a.id); out.bericht = berichte.map(q => [q.w, q.e.type, q.e.won, q.h]);
      out.deinLog = combatLog.length - log0; out.deineDefends = (playerStats.defends || 0) - def0; out.hints2 = hints.length - out.hintsAnDich;
      out.wunden = (loadBotState()[X.id].wounded || 0) - wund0;
      // deine eigene Armee: wie bisher (Hinweis an dich)
      hints.length = 0; const d = neueArmee(null, 'atestDu'); armyBotWatch(now); armyBotWatch(now + 16000);
      out.deinRaid = armyRaids.some(q => q.armyId === d.id && !q.tOwner); out.deineHints = hints.slice();
      // Karte: nur Angriffe auf deine Armeen werden als „incoming“ gezeichnet
      const fx = neueArmee(X.id, 'atestFremd'), rd = armyRaids.find(q => q.armyId === d.id);
      armyRaids.push({ botId: Y.id, baseId: yb.id, armyId: fx.id, tOwner: X.id, troops: 1, tx: fx.x, ty: fx.y, lm: fx.lm, startedAt: now, resolveAt: now + 60000 });
      const linien = [], dml = window.drawMarchLine, z0 = mapState.zoom; window.drawMarchLine = (k, f, t) => linien.push([k, t.id]); mapState.zoom = .02;
      try { drawArmies(now, now); } finally { window.drawMarchLine = dml; mapState.zoom = z0; }
      out.linien = linien.filter(l => l[0] === 'incoming' && l[1] === 'army').length; out.deinRaidDa = !!rd;
      armyRaids = armyRaids.filter(q => q.armyId !== fx.id); armies = armies.filter(q => q.id !== fx.id);
      armyRaids = armyRaids.filter(q => q.armyId !== d.id); armies = armies.filter(q => q.id !== d.id);
    } finally { window.botOnline = onl; Math.random = zuf; window.flashHint = fh; delete window.WELT; X.mensch = echt; }
    // Hauptstadt: nie ein Tor oder Tempel
    const s = loadBotState()[Y.id], tor = islands.find(i => i.type !== 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id));
    if (tor) { botOwnedIslands[Y.id].add(tor.id); s.capital = tor.id; capitalCache = null; out.capTurm = islandById[botCapitalOf(Y.id)].type === 'tower'; out.torKeinCap = !isCapital(tor.id); botOwnedIslands[Y.id].delete(tor.id); capitalCache = null; }
    // gar kein Turm mehr (nur ein Tor): Truppen finden trotzdem heim, das Tor zählt aber nicht als Hauptstadt
    const W = BOT_DEFS.find(q => !q.mensch && q.id !== Y.id && botOwnedIslands[q.id].size > 0), alt = [...botOwnedIslands[W.id]], tor2 = islands.find(i => i.type !== 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id));
    if (tor2) { botOwnedIslands[W.id].clear(); botOwnedIslands[W.id].add(tor2.id); capitalCache = null;
      out.heim = botCapitalOf(W.id) === tor2.id; out.heimKeinCap = !isCapital(tor2.id);
      botOwnedIslands[W.id].clear(); for (const id of alt) botOwnedIslands[W.id].add(id); capitalCache = null; }
    return out;
  });
  ok(r.entdeckt, 'Mitspieler entdeckt die Feld-Armee eines echten Spielers', r);
  ok(r.raid && r.raidWer === r.X, 'und greift sie an (Eigentümer gemerkt)', r.raidWer);
  ok(r.hintsAnDich === 0, 'kein Hinweis an dich für fremde Armeen', r.hintsAnDich);
  ok(r.freunde && !r.bundRaid, 'Bündnis-Mitglieder greifen die Armee nicht an');
  ok(!r.schildRaid, 'Friedensschild des echten Spielers schützt seine Armee');
  ok(r.armeeWeg && r.bericht.length === 1 && r.bericht[0][1] === 'army' && r.bericht[0][2] === false && /geschlagen/.test(r.bericht[0][3] || ''), 'Kampf: Armee geschlagen, Bericht als Nachricht an den echten Spieler', r.bericht);
  ok(r.deinLog === 0 && r.deineDefends === 0 && r.hints2 === 0, 'nichts davon landet bei dir (Kampflog, Statistik, Hinweis)', [r.deinLog, r.deineDefends, r.hints2]);
  ok(r.wunden > 0, 'seine Verwundeten kommen in sein Krankenhaus', r.wunden);
  ok(r.deinRaid && r.deineHints.some(t => /entdeckt|greift deine Armee/.test(t)), 'deine Armee: wie bisher angegriffen, mit Hinweis', r.deineHints);
  ok(r.deinRaidDa && r.linien === 1, 'Karte: nur der Angriff auf deine Armee wird als „incoming“ gezeichnet (nicht der auf fremde)', r.linien);
  ok(r.heim === true && r.heimKeinCap === true, 'ohne Turm: Truppen kehren zur eigenen Basis heim, die zählt aber nicht als Hauptstadt', [r.heim, r.heimKeinCap]);
  ok(r.capTurm !== false && r.torKeinCap !== false, 'Hauptstadt eines Mitspielers ist immer ein Turm (nie ein Tor/Tempel)', [r.capTurm, r.torKeinCap]);

  // 2) Neustart: ausgeschieden (mit/ohne outAt) → kein geschenkter Turm; neu dazugekommen → Startplatz
  const v = await ev(() => {
    const kand = BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id].size > 0 && botOwnedIslands[d.id].size < 30);
    const [A, B, C] = kand.slice(-3), now = Date.now();
    for (const d of [A, B, C]) for (const id of [...botOwnedIslands[d.id]]) clearIslandOwner(id);
    loadBotState()[A.id].outAt = now;                       // A: ausgeschieden, wartet (outAt gesetzt)
    loadBotState()[B.id].outAt = 0;                         // B: eben ausgeschieden, outAt noch nicht gesetzt
    loadBotState()[C.id].outAt = 0;                         // C: soll wie neu dazugekommen sein (nicht im gespeicherten Besitz)
    for (const d of BOT_DEFS) botNextAt[d.id] = now + 1e9; window.botRespawn = () => {};   // (bis zum Neuladen merkt sich B nichts)
    saveGameNow(); flushBotState(); localStorage.setItem('testNeuerMitspieler', C.id);
    return { A: A.id, B: B.id, C: C.id };
  });
  await p.reload(); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botOwnedIslands !== 'undefined' && islands.length, null, { timeout: 60000, polling: 500 }).catch(() => {});
  const n = await ev(v => ({ A: botOwnedIslands[v.A].size, B: botOwnedIslands[v.B].size, C: botOwnedIslands[v.C].size, outA: loadBotState()[v.A].outAt > 0 }), v);
  ok(n.A === 0 && n.outA, 'Neustart: ausgeschiedener Mitspieler (wartet) bekommt keinen Turm geschenkt', n);
  ok(n.B === 0, 'Neustart: eben ausgeschieden (noch ohne outAt) bekommt auch keinen', n);
  ok(n.C === 1, 'Neustart: neu dazugekommener Mitspieler bekommt seinen Startplatz', n);
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})().catch(e => { console.log('Fehler: ' + e.message); process.exit(1); });
