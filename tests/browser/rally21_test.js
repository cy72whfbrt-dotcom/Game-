// 2 gegen 1 Rally (echt über bundRallyLos): Werte beider zählen, Beute (Gold + Holz/Stein/Eisen) nach Truppen geteilt, Bericht passt
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 2);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, B] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Zusammen', tag: 'ZUS', offen: true }); bundOp(B.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const st = loadBotState(); st[A.id].skills.attack = 10; st[B.id].skills.attack = 30; saveBotState();
    const ziel = playerIslandId; islandTroops[ziel] = 1000; coins = 5e7; const r0 = AUF.rohVon('player'); r0.h = 3e7; r0.s = 2e7; r0.e = 1e7; AUF.rohSpeichern();
    const ca = botCapitalOf(A.id), cb = botCapitalOf(B.id);
    const vorher = { A: { c: botCoins[A.id], ...AUF.rohVon(A.id) }, B: { c: botCoins[B.id], ...AUF.rohVon(B.id) } };
    window.__t = { A: A.id, B: B.id, vorher: JSON.parse(JSON.stringify(vorher)) };
    const r = { id: 'rt1', by: A.id, at: ca, t: ziel, n0: 3e6, j: [{ w: B.id, f: cb, n: 1e6, da: true }], aid: bundVon(A.id).id };
    bund.r.push(r); islandTroops[ca] = Math.max(0, (islandTroops[ca] || 0));
    bundRallyLos(r);
    const a = pendingAttacks.find(x => x.rally && x.rally.id === 'rt1'); if (!a) return { fehler: 'keine Rally' };
    a.resolveAt = Date.now() + 300;
    const m = x => botMults(x).attackPct, stA = titleMult(A.id, 'attack') * AUF.kampf(A.id, 'a'), stB = titleMult(B.id, 'attack') * AUF.kampf(B.id, 'a');
    return { bonus: a.attackBonus, erwartet: Math.round(3e6 * m(A.id) / 100 + (a.hx ? Math.round(3e6 * a.hx.atk / 100) + heroGefOf(a.hx, 3e6) : 0) + (1e6 + Math.round(1e6 * m(B.id) / 100)) * stB / stA - 1e6), pctA: m(A.id), pctB: m(B.id) }; });
  console.log(JSON.stringify(v));
  ok(v.bonus && Math.abs(v.bonus - v.erwartet) <= 2, 'Rally-Stärke: Anführer UND Mitglied mit eigenen Werten', v);
  await p.waitForTimeout(30000);
  const e = await p.evaluate(() => { const { A, B, vorher } = __t;
    const x = combatLog.find(q => q.type === 'botAttack' && q.angreifer); if (!x) return { log: combatLog.slice(0, 3).map(q => q.type) };
    const nach = id => ({ c: botCoins[id], ...AUF.rohVon(id) }), d = (id, k) => Math.round(nach(id)[k] - vorher[id === A ? 'A' : 'B'][k]);
    return { won: x.won, plunder: x.plunder, roh: x.plunderRoh, an: x.angreifer.map(q => [q.name, q.n, q.k]), myTroops: x.myTroops,
      A: { gold: d(A, 'c'), h: d(A, 'h'), s: d(A, 's'), e: d(A, 'e') }, B: { gold: d(B, 'c'), h: d(B, 'h'), s: d(B, 's'), e: d(B, 'e') } }; });
  console.log(JSON.stringify(e));
  ok(e.an && e.an.reduce((s, q) => s + q[2], 0) === e.myTroops, 'Bericht: Stärke je Spieler, Summe = Gesamt', e.an);
  ok(e.won && e.B.h > 0 && Math.abs(e.B.h - Math.floor(e.roh.h / 4)) <= 2000 && Math.abs(e.A.h + e.B.h - e.roh.h) <= Math.max(2000, e.roh.h * 0.005), 'Holz geteilt (A 3/4, B 1/4)', { A: e.A.h, B: e.B.h, ges: e.roh && e.roh.h });
  ok(e.won && Math.abs(e.B.gold - Math.floor(e.plunder / 4)) <= 2000, 'Gold geteilt (B 1/4)', { B: e.B.gold, ges: e.plunder });
  await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } document.getElementById('battleLogBtn').click(); });
  await p.waitForTimeout(1200);
  const s = await p.$('#combatLogList summary'); if (s) { await s.click(); await p.waitForTimeout(400); }
  const seite = await p.evaluate(() => { const x = document.querySelector('.kl-seite'); return x && !x.hidden ? [...x.querySelectorAll('.logSide')].map(l => [l.querySelector('.logSideLabel').textContent, l.querySelector('.logSum').lastElementChild.textContent, [...l.querySelectorAll('.kl-rss .logLine')].map(z => z.lastElementChild.textContent).join(' ')]) : null; });
  ok(seite && seite.length === 3, 'Kampflog-Seite: 2 Angreifer-Fenster + Verteidiger, Rohstoffe je Fenster', seite);
  const h = await p.evaluate(() => document.querySelector('.kl-seite').scrollHeight); await p.setViewportSize({ width: 390, height: Math.min(h, 14000) }); await p.waitForTimeout(300);
  await p.screenshot({ path: require('os').tmpdir() + '/rally21.png' });
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
