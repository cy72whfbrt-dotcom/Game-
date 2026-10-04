// Neue Regel prüfen: gemeinsamer Angriff, Rally, Verstärkung – jeder mit SEINEN Werten; Kampfbericht im neuen Aufbau
const { chromium, devices } = require('playwright'); const fs = require('fs');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 3);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, B, C] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Zusammen', tag: 'ZUS', offen: true }); bundOp(B.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const sA = loadBotState()[A.id], sB = loadBotState()[B.id]; sA.skills.attack = 0; sB.skills.attack = 20; saveBotState();
    const out = { A: A.id, B: B.id, pctA: botMults(A.id).attackPct, pctB: botMults(B.id).attackPct, stA: titleMult(A.id, 'attack') * AUF.kampf(A.id, 'a'), stB: titleMult(B.id, 'attack') * AUF.kampf(B.id, 'a') };
    // 1) Rally: A führt (1 Mio.), B macht mit (1 Mio.)
    const ca = botCapitalOf(A.id), cb = botCapitalOf(B.id), mein = playerIslandId;
    const atk = { rally: { an: [[A.id, ca, 1e6], [B.id, cb, 1e6]] }, hx: null };
    rallyWerte(atk, A.id, 1e6, [{ w: B.id, n: 1e6 }]);
    const bA = Math.round(1e6 * out.pctA / 100), bB = Math.round(1e6 * out.pctB / 100);
    out.rally = { bonus: atk.attackBonus, erwartet: Math.round(bA + (1e6 + bB) * out.stB / out.stA - 1e6), alteRegel: Math.round(2e6 * out.pctA / 100), x3: atk.rally.an[1][3] };
    // 2) Verstärkung: C verstärkt deine Hauptstadt, C hat Skill Verteidigung 30
    const sC = loadBotState()[C.id]; sC.skills.defense = 30; saveBotState();
    islandTroops[mein] = 1e6; const vor = effectiveDefense(islandById[mein]);
    verst.l.push({ id: 'vtest', w: C.id, t: mein, n: 1e6, von: botCapitalOf(C.id), at: Date.now() });
    const k = verstVorKampf(mein); const mit = effectiveDefense(islandById[mein]); const teile = defenseParts(islandById[mein]).map(x => x[0] + ' ' + x[1]);
    const nach = verstNachKampf(mein, k, false);
    out.verst = { vor, mit, plus: Math.round(verstWert(C.id, 1e6) - verstWert('player', 1e6)), cPct: botMults(C.id).defensePct, teile, helfer: nach.helfer.map(h => [h.name, h.n, h.plus, h.k]) };
    verst.l = verst.l.filter(v => v.id !== 'vtest'); verstSpeichern();
    // 3) gemeinsamer Angriff: A und B greifen dich getrennt an, B kommt dazu
    verst.l.push({ id: 'vt2', w: C.id, t: mein, n: 5e5, von: botCapitalOf(C.id), at: Date.now() }); verstSpeichern();
    islandTroops[mein] = 1e5; islandTroops[ca] = 1e8; islandTroops[cb] = 1e8;
    const send = (src, who, n) => { AUF.frei.an(); try { launchAttack(src, mein, who, n); } finally { AUF.frei.aus(); } const a = pendingAttacks[pendingAttacks.length - 1]; a.resolveAt = Date.now() + 500; return a.attackerBotId === who; };
    out.gesendet = [send(ca, A.id, 3e6), send(cb, B.id, 3e6)];
    return out; });
  console.log(JSON.stringify(r));
  ok(r.rally.bonus === r.rally.erwartet && r.rally.bonus !== r.rally.alteRegel, 'Rally: Mitglied zählt mit SEINEM Skill (nicht mehr dem des Anführers)', r.rally);
  ok(Math.abs(r.verst.mit - r.verst.vor - r.verst.plus) <= 2 && r.verst.plus > 0, 'Verstärkung: Helfer verteidigt mit SEINEN Werten', r.verst);
  await p.waitForTimeout(30000);
  const e = await p.evaluate(() => { const x = combatLog.find(q => q.type === 'botAttack' && q.angreifer); return x ? { an: x.angreifer.map(q => [q.name, q.n, q.plus, q.k]), myTroops: x.myTroops, summe: x.angreifer.reduce((s, q) => s + (q.k || 0), 0) } : combatLog.slice(0, 3).map(q => q.type); });
  ok(e && e.an && e.summe === e.myTroops, 'gemeinsamer Angriff: Bericht hat jeden Angreifer mit eigener Stärke, Summe = Gesamt', e);
  await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } document.getElementById('battleLogBtn').click(); });
  await p.waitForTimeout(1200);
  const s = await p.$('#combatLogList summary'); if (s) { await s.click(); await p.waitForTimeout(400); }
  const seite = await p.evaluate(() => { const x = document.querySelector('.kl-seite'); return x && !x.hidden ? { fenster: [...x.querySelectorAll('.logSideLabel')].map(l => l.textContent), gesamt: [...x.querySelectorAll('.logSum')].map(l => l.lastElementChild.textContent), w: document.documentElement.scrollWidth } : null; });
  ok(seite && seite.fenster.length >= 4, 'Kampflog: eigene Seite, ein Fenster je Spieler', seite);
  const h = await p.evaluate(() => document.querySelector('.kl-seite').scrollHeight); await p.setViewportSize({ width: 390, height: Math.min(h, 14000) }); await p.waitForTimeout(300);
  await p.screenshot({ path: require('os').tmpdir() + '/regel_seite.png' });
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
