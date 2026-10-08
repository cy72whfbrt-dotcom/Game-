// Tagesaufgaben (7.10., Event-Zahlen): 6 am Tag (2 leicht, 2 mittel, 2 schwer), je 3/5/8 Edelsteine + 1/2/3 Std. Münzen, Bonus bei 3
// (2 Std. Truppen) und bei allen 6 (Kiste, 10 Edelsteine, Splitter) – 42 Edelsteine am Tag; 14 neue Arten, nur was heute geht;
// sie zählen über die Zähler (statBump, auch vom Weltrechner) und die Knöpfe im Spiel. Argument 3: Ordner für ein Handy-Foto.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } anleitung.schritt = ANLEITUNG.length; });
  // 1) neue Listen: 6, Stufen 0 0 1 1 2 2, keine doppelt, Tempel/Thron nie leicht, Bündnis nur mit Bündnis, Invasion/Drache nur an ihrem Tag
  const w = await ev(() => {
    const o = { n: new Set(), stufen: new Set(), doppelt: 0, leichtTT: 0, bund: 0, inv: 0, dr: 0, arten: new Set(), gemsTag: questGemsTag(), neu: Object.keys(QUEST_DEFS).length, moeglich: Object.keys(QUEST_DEFS).filter(questGeht).length };
    const invHeute = questEvHeute('inv'), drHeute = questEvHeute('dr'), bundDa = questBundGeht();
    for (let i = 0; i < 80; i++) { questState = null; store.set('openWaterQuests', ''); const q = loadQuests();
      o.n.add(q.list.length); o.stufen.add(q.list.map(t => t.st).join('')); if (new Set(q.list.map(t => t.type)).size !== q.list.length) o.doppelt++;
      for (const t of q.list) { o.arten.add(t.type); if (t.st === 0 && (t.type === 'tempel' || t.type === 'thron')) o.leichtTT++;
        if (['bundHilfe', 'verstaerkung', 'rally'].includes(t.type)) o.bund++; if (t.type === 'invArmee') o.inv++; if (t.type === 'drache') o.dr++; } }
    return { ...o, n: [...o.n], stufen: [...o.stufen], arten: o.arten.size, invHeute, drHeute, bundDa }; });
  ok(w.n.join() === '6' && w.stufen.join() === '001122' && !w.doppelt, '6 Aufgaben: 2 leicht, 2 mittel, 2 schwer, keine doppelt', w);
  ok(w.neu === 23 && w.arten === w.moeglich && !w.leichtTT, '23 Arten (9 + 14 neue): alle, die heute gehen, werden gewürfelt, Tempel/Thron nie leicht', w);
  ok((w.bundDa || !w.bund) && (w.invHeute || !w.inv) && (w.drHeute || !w.dr), 'nur was heute geht: Bündnis, Invasion, Drache', w);
  ok(w.gemsTag === 42, 'Edelsteine am Tag: 2 × (3 + 5 + 8) + 10 = 42', w.gemsTag);
  // 1b) Tempel (Zone 4, Pässe ab Tag 4) und Thron (ab Tag 7) nur, wenn sie heute angreifbar werden
  const tt = await ev(() => {
    const s0 = store.get('openWaterWorldStart'), tag = d => { store.set('openWaterWorldStart', String(Date.now() - (d - 1) * 86400000)); WEG_MERK.clear(); };
    const wuerfeln = () => { let n = 0; for (let i = 0; i < 60; i++) { questState = null; store.set('openWaterQuests', ''); if (loadQuests().list.some(t => t.type === 'tempel' || t.type === 'thron')) n++; } return n; };
    tag(1); const t1 = { tempel: questGeht('tempel'), thron: questGeht('thron'), gewuerfelt: wuerfeln() };
    tag(4); const t4 = { tempel: questGeht('tempel'), thron: questGeht('thron') };
    const tfE = thronFenster; thronFenster = n => ({ start: n - 1000, end: n + 864e5 });    tag(7); const t7 = { tempel: questGeht('tempel'), thron: questGeht('thron'), gewuerfelt: wuerfeln() };
    store.set('openWaterWorldStart', s0); WEG_MERK.clear(); questState = null; store.set('openWaterQuests', ''); thronFenster = tfE; return { t1, t4, t7 }; });
  ok(!tt.t1.tempel && !tt.t1.thron && !tt.t1.gewuerfelt, 'Tag 1: kein Tempel (Zone 4 zu), kein Thron (erst Tag 7)', tt);
  ok(tt.t4.tempel && !tt.t4.thron && tt.t7.tempel && tt.t7.thron && tt.t7.gewuerfelt > 0, 'Tag 4: Tempel, Tag 7: Tempel + Thron', tt);
  // 2) Zähler → Aufgaben (auch was der Weltrechner meldet)
  const z = await ev(() => {
    const q = loadQuests(), arten = ['barbLager', 'tagesboss', 'drache', 'invArmee', 'bundHilfe', 'verstaerkung', 'rally', 'tempel', 'thron', 'heilen', 'schmiede', 'zusammen', 'sammeln', 'markt'];
    q.list = arten.slice(0, 6).map(t => ({ type: t, st: 2, target: 99, progress: 0, gems: 8, h: 3, claimed: false })); saveQuests();
    const stand = () => Object.fromEntries(loadQuests().list.map(t => [t.type, t.progress]));
    statBump('lager'); goalBump('player', 'qb'); goalBump('player', 'qd'); goalBump('player', 'qi'); statBump('qHilfe', 3); statBump('qVerst'); const a = stand();
    q.list = arten.slice(6, 12).map(t => ({ type: t, st: 2, target: 99, progress: 0, gems: 8, h: 3, claimed: false })); saveQuests();
    statBump('qRally'); statBump('temples'); statBump('throneMin', 4); statBump('healed', 5000);
    const it = addInventoryItem('weapon', 0, 1); upgradePoints = 1e6; levelUpItem(it.id);
    for (let i = 0; i < 3; i++) addInventoryItem('boots', 0, 1); autoCombineAll(); const c = stand();
    return { a, c, pass: PASS_XP.lager + PASS_XP.qb }; });
  ok(z.a.barbLager === 1 && z.a.tagesboss === 1 && z.a.drache === 1 && z.a.invArmee === 1 && z.a.bundHilfe === 3 && z.a.verstaerkung === 1, 'Lager, Tagesboss, Drache, Invasion, Bau-Hilfe (3), Verstärkung zählen', z.a);
  ok(z.c.rally === 1 && z.c.tempel === 1 && z.c.thron === 4 && z.c.heilen === 1 && z.c.schmiede === 1 && z.c.zusammen >= 1, 'Rally, Tempel, Thron-Minuten, Heilen (einmal), Schmiede, Zusammenlegen zählen', z.c);
  // 3) Tagesboss-Angriff (Knopf → barbSend) und Sammler zählen
  const k = await ev(() => { const q = loadQuests(); q.list = [{ type: 'tagesboss', st: 0, target: 1, progress: 0, gems: 3, h: 1, claimed: false }, { type: 'sammeln', st: 0, target: 1, progress: 0, gems: 3, h: 1, claimed: false }]; saveQuests();
    islandTroops[playerIslandId] = 1e6; barbSend('player', playerIslandId, 'b', null, 1000, null, null);
    islandTroops[playerIslandId] = 1e6; const f = resFields.find(x => fieldInfo(x).left > 0 && !fieldInfo(x).occ && fieldSource(x) !== null); let feld = false; if (f) { openFieldSheet(f); const bt = document.querySelector('#fieldSheet [data-fsend]'); if (bt) { bt.click(); feld = true; } }
    const l = loadQuests().list; return { boss: l[0].progress, feld, sammeln: l[1].progress }; });
  ok(k.boss === 1 && k.feld && k.sammeln === 1, 'Angriff auf den Tagesboss und Sammler aufs Feld zählen', k);
  // 4) Abholen: Edelsteine + Münzen, Bonus 3 (Truppen), Bonus 6 (Kiste, Edelsteine, Splitter); alte Liste mit 3 wird auf 6 aufgefüllt
  const r = await ev(() => {
    questState = null; store.set('openWaterQuests', ''); const q = loadQuests(); q.list.forEach(t => { t.progress = t.target; }); saveQuests();
    const hp = hourProduction('player'), g0 = gems, c0 = coins; claimQuest(0); const e1 = { g: gems - g0, c: coins - c0, cSoll: passMuenzen(hp, 1) };
    claimQuest(4); const e5 = { g: gems - g0 - e1.g, c: coins - c0 - e1.c, cSoll: passMuenzen(hp, 3) };
    const vor3 = questBonus3Bereit(loadQuests()); claimQuest(2); const nach3 = questBonus3Bereit(loadQuests()), zaehler = dailyGoalCount();
    const base = rewardBaseId(), t0 = islandTroops[base] || 0; claimQuestBonus3(); const tr = (islandTroops[base] || 0) - t0; claimQuestBonus3();
    for (let i = 0; i < 6; i++) claimQuest(i); const g6 = gems, inv0 = Object.keys(inventory).length; claimQuestBonus();
    const alt = { date: todayKey(), bonusClaimed: false, geprueft: 1, list: [{ type: 'scout', target: 2, progress: 0, gems: 5, claimed: false }, { type: 'send', target: 4, progress: 1, gems: 10, claimed: false }, { type: 'crate', target: 3, progress: 0, gems: 15, claimed: false }] };
    store.set('openWaterQuests', JSON.stringify(alt)); questState = null; const aufg = loadQuests().list;
    return { e1, e5, vor3, nach3, zaehler, tr, trSoll: passTruppen(hp, 2), zweimal: (islandTroops[base] || 0) - t0 - tr, bonus6: gems - g6, kiste: Object.keys(inventory).length - inv0, bonusDa: loadQuests().bonusClaimed !== undefined,
      alt: [aufg.length, aufg[1].type, aufg[1].progress, new Set(aufg.map(t => t.type)).size] }; });
  ok(r.e1.g === 3 && r.e1.c === r.e1.cSoll && r.e5.g === 8 && r.e5.c === r.e5.cSoll, 'Abholen: leicht 3 Edelsteine + 1 Std. Münzen, schwer 8 + 3 Std.', r);
  ok(!r.vor3 && r.nach3 && r.zaehler >= 1 && r.tr === r.trSoll && r.tr >= 1 && r.zweimal === 0, 'Bonus bei 3 erledigt: 2 Std. Truppen in die Hauptstadt, nur einmal', r);
  ok(r.bonus6 >= 10 && r.kiste >= 1, 'Bonus bei allen 6: Kiste + 10 Edelsteine (+ Splitter)', r);
  ok(r.alt[0] === 6 && r.alt[1] === 'send' && r.alt[2] === 1 && r.alt[3] === 6, 'Liste von vorher (3 Aufgaben): bleibt und wird auf 6 aufgefüllt', r.alt);
  // 5) Fenster: 6 Aufgaben + 2 Bonus-Zeilen, „0 / 6 heute“, Kacheln mit Münzen
  await ev(() => { beuteFensterZu(); questState = null; store.set('openWaterQuests', ''); loadQuests(); closeAllPopups(); openGoals('daily'); });
  await p.waitForTimeout(600);
  const f = await ev(() => ({ zeilen: document.querySelectorAll('#questList .quest').length, muenzen: document.querySelectorAll('#questList .quest .bk[data-beute="coins"]').length,
    truppen: document.querySelectorAll('#questList .quest .bk[data-beute="tr"]').length, kopf: document.getElementById('goalsSub').textContent.replace(/\s+/g, ' '), seite: document.documentElement.scrollWidth <= window.innerWidth + 1 }));
  ok(f.zeilen === 8 && f.muenzen === 6 && f.truppen === 1 && /0 \/ 6/.test(f.kopf) && f.seite, 'Fenster: 6 Aufgaben (Edelsteine + Münzen), Bonus 3 (Truppen) und Bonus 6, „0 / 6 heute“', f);
  if (process.argv[3]) { await ev(() => { goalsPopup.querySelector('.pbody').scrollTop = document.getElementById('questList').offsetTop - 40; }); await p.waitForTimeout(300);
    await p.screenshot({ path: require('path').join(process.argv[3], 'aufgaben_sechs.png') }); }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
