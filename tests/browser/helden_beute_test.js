// Regeln vom 4.10. abends: höchstens 2 Helden je Angreifer (weitere eigene Wellen bringen keine Helden dazu),
// Beute (Gold, Holz, Stein, Eisen) nur an der Hauptstadt.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => {
    const frei = x => Object.keys((loadBotState()[x.id] || {}).hs || {}).filter(id => heroOwned(x.id, id) && !heroBusy(x.id, id));
    const A = BOT_DEFS.find(x => !x.mensch && botCapitalOf(x.id) != null && frei(x).length >= 4); if (!A) return { fehler: 'kein Mitspieler mit 4 Helden' };
    const [h1, h2, h3, h4] = frei(A), src = botCapitalOf(A.id); islandTroops[src] = 1e8; botCoins[A.id] = 1e15;   // (genug für die Maut)
    const Z = BOT_DEFS.find(x => x.id !== A.id && !x.mensch && botCapitalOf(x.id) != null && !bundFreund(A.id, x.id) && routeFor(islandById[src].landmassId, islandById[botCapitalOf(x.id)].landmassId, A.id));
    const ziel = botCapitalOf(Z.id); islandTroops[ziel] = 4e7; botCoins[Z.id] = 1e12;
    const out = { turm: plunderOf(Z.id, false).loot, haupt: plunderOf(Z.id, true).loot };
    const mp = marschPlatz, pt = payToll; marschPlatz = () => true; payToll = () => true; botById[A.id].mensch = true;   // (wie ein echter Spieler: seine gewählten Helden)
    AUF.frei.an(); let ok1, ok2; try { ok1 = launchAttack(src, ziel, A.id, 1e6, h1, h2); ok2 = launchAttack(src, ziel, A.id, 1e6, h3, h4); } finally { AUF.frei.aus(); marschPlatz = mp; payToll = pt; botById[A.id].mensch = false; }
    const w = pendingAttacks.filter(a => a.attackerBotId === A.id && a.targetId === ziel);
    out.gestartet = [ok1, ok2, w.length]; out.wellen = w.map(a => [a.hero, a.hero2, Math.round(a.attackBonus), a.skillBonus]);
    if (w.length === 2) { w[0].resolveAt = Date.now() + 200; w[1].resolveAt = Date.now() + 1200; }
    window.__h = { A: A.id, ziel, skill2: w[1] && w[1].skillBonus, b1: w[0] && Math.round(w[0].attackBonus) };
    return out; });
  console.log(JSON.stringify(v));
  ok(v.turm === 0 && v.haupt > 0, 'Beute nur an der Hauptstadt (andere Basis: 0)', { turm: v.turm, haupt: v.haupt });
  ok(v.gestartet && v.gestartet[2] === 2, 'zwei Wellen mit je 2 Helden unterwegs', v.wellen);
  await p.waitForTimeout(2500);
  const k = await p.evaluate(() => { const f = pendingAttacks.find(a => a.attackerBotId === __h.A && a.targetId === __h.ziel && a.fightEndsAt);
    return f ? { helden: [f.hx && f.hx.id, f.hx && f.hx.id2, f.hx && (f.hx.extra || []).length], bonus: Math.round(f.attackBonus), erwartet: __h.b1 + __h.skill2, wellen: f.waves } : null; });
  ok(k && k.wellen === 2 && k.helden[2] === 0, 'im Kampf nur Haupt- + Zweitheld der ersten Welle', k);
  ok(k && k.bonus === k.erwartet, 'Helden der 2. Welle zählen nicht (nur ihr Skill)', k);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
