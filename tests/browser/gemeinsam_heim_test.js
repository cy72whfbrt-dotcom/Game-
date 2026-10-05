// Heimweg nach der Ankunft: Abprallen (Bündnis-Mitglied, Friedensschild) läuft den Weg zurück statt sofort daheim zu sein,
// zwei Wellen desselben Angreifers aus zwei Basen kehren jede zu IHRER Basis heim, ein Verbündeter bringt seinen Skill-Anteil (x[6]) mit
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2]; const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(d); }); }).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message)); await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const info = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, B, C] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Heimweg', tag: 'HEI', offen: true }); bundOp(B.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const frei = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && !isCapital(i.id)).map(i => i.id);
    const [a2, tB, tC, z1, z2] = frei, ca = botCapitalOf(A.id), cb = botCapitalOf(B.id);
    const gib = (w, id) => { clearIslandOwner(id); botOwnedIslands[w].add(id); };
    gib(A.id, a2); gib(B.id, tB); gib(C.id, tC); loadBotState()[C.id].shieldUntil = Date.now() + 864e5;
    for (const z of [z1, z2]) { islandTroops[z] = 0; neutralTroopOverrides[z] = 1000000; islandById[z].neutralTroops = 1000000; }
    for (const c of [ca, a2, cb]) islandTroops[c] = 1e8;
    const t0 = Date.now();
    // Abprallen: ein Marsch kommt an einer Basis des Bündnis-Partners bzw. am Friedensschild an
    const welle = (w, src, ziel, n) => ({ attackerBotId: w, sourceId: src, targetId: ziel, rawTroops: n, startedAt: t0 - 60000, resolveAt: t0 - 10, attackBonus: 0, skillBonus: 0 });
    pendingAttacks.push(welle(A.id, ca, tB, 12345), welle(A.id, a2, tC, 23456));
    // zwei Wellen von A (zwei Basen) auf z1; auf z2 dazu B (Bündnis, ohne Rally)
    const sendNow = (src, who, z, n) => { const k = pendingAttacks.length; AUF && AUF.frei && AUF.frei.an(); try { launchAttack(src, z, who, n); } finally { AUF && AUF.frei && AUF.frei.aus(); } const at = pendingAttacks[pendingAttacks.length - 1]; if (pendingAttacks.length > k) { at.resolveAt = Date.now() - 10; return at; } return null; };
    const w = [sendNow(ca, A.id, z1, 100000), sendNow(a2, A.id, z1, 50000), sendNow(ca, A.id, z2, 100000), sendNow(a2, A.id, z2, 50000), sendNow(cb, B.id, z2, 70000)];
    window.__ids = { A: A.id, B: B.id, C: C.id, ca, a2, cb, tB, tC, z1, z2 }; window.__f1 = w[0]; window.__skB = w[4] && w[4].skillBonus;
    return { ok: w.map(x => !!x), ids: window.__ids, skB: window.__skB };
  });
  await p.waitForFunction(() => !pendingAttacks.some(a => a.targetId === __ids.tB || a.targetId === __ids.tC) && __f1 && __f1.fightEndsAt && pendingAttacks.some(a => a.targetId === __ids.z2 && a.rally), null, { timeout: 8000, polling: 100 }).catch(() => {});
  const mitte = await p.evaluate(() => { const { A, ca, a2, tB, tC, z1, z2 } = __ids;
    const heim = z => pendingSends.filter(s => s.back && s.fromId === z && s.senderBotId === A).map(s => s.toId + ':' + s.troops);
    const f2 = pendingAttacks.find(a => a.targetId === z2 && a.fightEndsAt);
    return { bund: heim(tB), schild: heim(tC), quellen: __f1.quellen, offenZ1: pendingAttacks.filter(a => a.targetId === z1).length,
      an: f2 && f2.rally && f2.rally.an.map(x => x[0] + ':' + x[1] + ':' + x[2] + ':' + x[6]) }; });
  await p.waitForFunction(() => !pendingAttacks.some(a => a.targetId === __ids.z1) && pendingSends.some(s => s.fromId === __ids.z1), null, { timeout: 105000, polling: 500 }).catch(() => {});
  const end = await p.evaluate(() => { const { A, ca, a2, z1 } = __ids;
    const s = pendingSends.filter(x => x.back && x.fromId === z1 && x.senderBotId === A);
    return { heim: s.map(x => x.toId + ':' + x.troops), summe: s.reduce((t, x) => t + x.troops, 0), flucht: Math.floor(150000 * retreatPct(__f1) / 100), besitzer: islandOwnerOf(z1) }; });
  console.log(JSON.stringify({ info, mitte, end }, null, 1));
  const ok = (n, x) => console.log((x ? 'OK   ' : 'FEHLER ') + n);
  const { ca, a2, cb, B } = info.ids;
  ok('Wellen losgeschickt', info.ok.every(Boolean));
  ok('Bündnis-Basis: kein Kampf, die Truppen laufen heim (nicht sofort daheim)', mitte.bund.length === 1 && mitte.bund[0] === ca + ':12345');
  ok('Friedensschild: abgeprallt, die Truppen laufen zu IHRER Basis heim', mitte.schild.length === 1 && mitte.schild[0] === a2 + ':23456');
  ok('Zwei Wellen aus zwei Basen: EIN Kampf, beide Quellen gemerkt', mitte.offenZ1 === 1 && JSON.stringify(mitte.quellen) === JSON.stringify([[ca, 100000], [a2, 50000]]));
  ok('Verbündeter kommt dazu: jede Quelle ein Eintrag, sein Skill-Anteil (x[6]) dabei', !!mitte.an && mitte.an.length === 3 && mitte.an[0].startsWith(info.ids.A + ':' + ca + ':100000') && mitte.an[1].startsWith(info.ids.A + ':' + a2 + ':50000')
    && mitte.an[2] === B + ':' + cb + ':70000:' + info.skB);
  ok('Verloren: die Geflohenen gehen anteilig zu beiden Basen (keiner verschwindet, keiner doppelt)', end.besitzer !== info.ids.A && end.heim.length === 2 && end.heim.some(h => h.startsWith(ca + ':')) && end.heim.some(h => h.startsWith(a2 + ':')) && end.summe === end.flucht);
  console.log('Fehler:', fe.length ? fe : 'keine'); await b.close(); srv.close();
})();
