// Gemeinsamer Kampf: A (2 Wellen) + B (Bündnis) auf dasselbe Ziel → EIN Kampf, jeder verliert seinen Anteil, Bericht listet alle
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2]; const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(d); }); }).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message)); await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});   // (unter Last länger warten, bis das Spiel steht)
  const info = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, B, C] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Zusammen', tag: 'ZUS', offen: true }); bundOp(B.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const z = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && !isCapital(i.id)).id;
    islandTroops[z] = 0; neutralTroopOverrides[z] = 3000000; islandById[z].neutralTroops = 3000000;
    const ca = botCapitalOf(A.id), cb = botCapitalOf(B.id), cc = botCapitalOf(C.id);
    for (const c of [ca, cb, cc]) islandTroops[c] = 1e8;
    const loss = {}; for (const x of [A, B]) { const st = loadBotState()[x.id]; loss[x.id] = st ? st.wounded || 0 : 0; }
    window.__w0 = loss; window.__ids = { A: A.id, B: B.id, C: C.id, z, ca, cb };
    const sendNow = (src, who, n) => { const k = pendingAttacks.length; AUF && AUF.frei && AUF.frei.an(); try { launchAttack(src, z, who, n); } finally { AUF && AUF.frei && AUF.frei.aus(); } const at = pendingAttacks[pendingAttacks.length - 1]; if (pendingAttacks.length > k) { at.resolveAt = Date.now() - 10; } return pendingAttacks.length > k; };
    const ok = [sendNow(ca, A.id, 2000000), sendNow(ca, A.id, 2000000), sendNow(cb, B.id, 4000000), sendNow(cc, C.id, 1000000)];
    return { ok, ids: window.__ids };
  });
  // (statt fester Zeiten: auf den Zustand warten – bis zu 3× so lang wie früher, danach prüft ok() wie immer)
  await p.waitForFunction(() => pendingAttacks.some(a => a.targetId === __ids.z && a.rally && a.rally.an.length === 2), null, { timeout: 4500, polling: 100 }).catch(() => {});
  const mitte = await p.evaluate(() => { const z = __ids.z; return pendingAttacks.filter(a => a.targetId === z).map(a => ({ who: a.attackerBotId, n: a.rawTroops, an: a.rally && a.rally.an.map(x => x[0] + ':' + x[2]), kampf: !!a.fightEndsAt })); });
  await p.waitForFunction(() => !pendingAttacks.some(a => a.targetId === __ids.z) && pendingSends.some(s => s.fromId === __ids.z), null, { timeout: 105000, polling: 500 }).catch(() => {});
  const end = await p.evaluate(() => { const { A, B, z } = __ids;
    const heim = pendingSends.filter(s => s.fromId === z).map(s => s.senderBotId + ':' + s.troops);
    return { besitzer: islandOwnerOf(z), offen: pendingAttacks.filter(a => a.targetId === z).length, heim, verwA: (loadBotState()[A] || {}).wounded, verwB: (loadBotState()[B] || {}).wounded, w0: __w0 }; });
  // Bericht-Anzeige mit Angreifer-Liste
  const html = await p.evaluate(() => { const e = { type: 'attack', at: Date.now(), sourceId: __ids.ca, targetId: __ids.z, myTroops: 8e6, myTroopsBuffed: 8e6, attackBuff: 0, skillBuff: 0, titleBuff: 0, attackerCasualties: 1e6, wounded: 0, enemyTroops: 3e6, enemyDefense: 0, defenseBuff: 0, defenderCasualties: 3e6, won: true, remaining: 7e6,
      angreifer: [{ w: 'a', name: 'Anna', n: 4e6, fallen: 5e5, wounded: 0 }, { w: 'b', name: 'Bert', n: 4e6, fallen: 5e5, wounded: 0 }], rolle: 'mit', fuehrer: 'Anna', meine: { n: 4e6, fallen: 5e5, wounded: 0 } };
    combatLog.unshift(e); renderCombatLog(); return combatLogListEl.innerHTML.slice(0, 200000); });
  console.log(JSON.stringify({ mitte, end }, null, 1));
  const ok = (n, x) => console.log((x ? 'OK   ' : 'FEHLER ') + n);
  const zus = mitte.filter(m => m.who !== end.c);
  ok('A (2 Wellen) + B in EINEM Kampf, C (fremd) eigener Kampf', mitte.length === 2 && mitte.some(m => m.an && m.an.length === 2 && m.an.includes(info.ids.A + ':4000000') && m.an.includes(info.ids.B + ':4000000') && m.n === 8000000));
  ok('Kampf entschieden', end.offen === 0);
  ok('A erobert und zieht ein, B geht mit seinem Anteil heim', end.besitzer === info.ids.A && !end.heim.some(h => h.startsWith(info.ids.A + ':')) && end.heim.some(h => h.startsWith(info.ids.B + ':')));
  ok('Bericht zeigt Anna + Bert mit Truppen', html.includes('Anna') && html.includes('Bert') && html.includes('Anführer') && html.includes('Verbündeter'));
  console.log('Fehler:', fe.length ? fe : 'keine'); await b.close(); srv.close();
})();
