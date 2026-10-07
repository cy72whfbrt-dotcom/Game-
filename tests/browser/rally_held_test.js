// Rally-Held: der Anführer nimmt seinen Helden (+ Zweitheld) mit – belegt während des Sammelns, führt den Angriff, zählt für SEINE Truppen
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.evaluate(() => { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); for (const s of Object.values(loadBotState())) if (s && s.city) s.city.levels.heroes = Math.max(1, s.city.levels.heroes || 0); });   // Helden erst mit Heldenhalle (Merkliste 21)
  const v = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    const A = bots.find(x => { const hs = loadBotState()[x.id].hs || {}; return Object.keys(hs).filter(id => heroOwned(x.id, id) && !heroBusy(x.id, id)).length >= 2; });
    if (!A) return { fehler: 'kein Mitspieler mit 2 Helden' };
    if (bundVon(A.id)) bundOp(A.id, { op: 'verlassen' }); botCoins[A.id] = 1e9; bundOp(A.id, { op: 'gruenden', name: 'Held', tag: 'HLD', offen: true });
    const frei = Object.keys(loadBotState()[A.id].hs).filter(id => heroOwned(A.id, id) && !heroBusy(A.id, id)), [h1, h2] = frei;
    const at = botCapitalOf(A.id); islandTroops[at] = 5e6;
    const ziel = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && i.landmassId === islandById[at].landmassId && routeFor(islandById[at].landmassId, i.landmassId, A.id));
    const why = bundRallyStart(bundVon(A.id), A.id, { basis: at, ziel: ziel.id, min: 3, n: 2e6, held: h1, held2: h2 });
    const r = bund.r.find(x => x.by === A.id);
    const out = { why, held: r && r.held, held2: r && r.held2, h1, h2, belegt: heroBusy(A.id, h1), belegt2: heroBusy(A.id, h2) };
    bundRallyLos(r);
    const a = pendingAttacks.find(x => x.rally && x.rally.id === r.id);
    out.angriffHeld = a && a.hero; out.hxAtk = a && a.hx && a.hx.atk;
    out.bonus = a && a.attackBonus; out.erwartet = a && Math.round(2e6 * botMults(A.id).attackPct / 100 + Math.round(2e6 * a.hx.atk / 100) + heroGefOf(a.hx, 2e6));
    out.nachStart = heroBusy(A.id, h1);
    return out; });
  console.log(JSON.stringify(v));
  ok(!v.why && v.held === v.h1 && v.held2 === v.h2, 'Rally merkt sich Haupt- und Zweitheld', v);
  ok(v.belegt && v.belegt2, 'Helden sind während des Sammelns belegt');
  ok(v.angriffHeld === v.h1 && v.hxAtk > 0, 'der Angriff der Rally läuft mit dem Helden');
  ok(v.bonus === v.erwartet, 'Held zählt für die Truppen des Anführers', { bonus: v.bonus, erwartet: v.erwartet });
  ok(v.nachStart, 'Held danach durch den Angriff belegt');
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
