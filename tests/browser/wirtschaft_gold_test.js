// Wirtschaft „pro Stunde“ (LIESMICH 11b A): Münzen und Truppen, die nicht aus der Produktion kommen, sind × WIRTSCHAFT_KOSTEN
// kleiner wie alle Kosten (sonst wäre Gold zu leicht – die 100.000 Start-Truppen bleiben): Kampf-Gold je getöteter Truppe
// (Fähigkeit und Held), Gold je Schaden beim Tagesboss, Söldner beim Händler (mindestens 1.000 × WIRTSCHAFT_KOSTEN).
// 6.10.: Münzen dazu × MUENZ_FAKTOR (1.000) – Gold je Kill und je Schaden also × 1.000 ÷ 1.800.
const { chromium } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext()).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(8000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof killGoldRate === 'function' && typeof hdSoeldner === 'function' && typeof islands !== 'undefined' && islands.length, null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    for (const bd of BOT_DEFS) botNextAt[bd.id] = Date.now() + 1e9;
    const out = { K: WIRTSCHAFT_KOSTEN, M: WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR };
    // 1) Fähigkeit „Angriff: Gold“ voll (50) + Held mit +50 % Gold: 100.000 getötete Truppen
    const s0 = skills.attackGold, d0 = skills.defenseGold; skills.attackGold = 50; skills.defenseGold = 50;
    out.rate = killGoldRate('player', { gold: 50 }); out.defRate = defGoldRate('player');
    out.text = [skillBonusText(SKILL_DEFS.attackGold, 50), skillBonusText(SKILL_DEFS.defenseGold, 1)];
    const gez = []; const pg = payGold; payGold = (w, n) => { gez.push(Math.round(n)); return pg(w, n); };
    out.feld = fieldGold('player', 'player', { dLoss: 100000, aLoss: 100000 }, { gold: 50 }, { gold: 50 });
    // 2) Tagesboss: 100.000 Schaden
    const X = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).id, home = botCapitalOf(X);
    const db0 = dayBoss; dayBoss = { d: todayKey(), k: 'x', name: 'Test', x: 0, y: 0, lm: 0, hp: 1e9, max: 1e9, dmg: {}, fell: 0 };
    gez.length = 0; const c0 = botCoins[X] || 0;
    dbossHit({ who: X, homeId: home, d: todayKey(), troops: 100000, x: 0, y: 0 }, Date.now());
    out.boss = { schaden: dayBoss.dmg[X], gold: gez[0], kam: (botCoins[X] || 0) - c0, klasse: evStunden(X, DBOSS_KLASSEN[dbossKlasse(dayBoss.dmg[X], dayBoss.max)]).coins || 0 };   // (+ Belohnung der Schadens-Klasse)
    dayBoss = db0; payGold = pg; skills.attackGold = s0; skills.defenseGold = d0;
    // 3) Händler: Söldner = eine Stunde Ausbildung, mindestens 1.000 × WIRTSCHAFT_KOSTEN (vorher 1.000)
    out.soeldner = { n: hdSoeldner(X), hp: hourProduction(X).troops };
    return out;
  });
  console.log(JSON.stringify(r));
  const K = r.K, M = r.M, sollRate = 50 * .3 * M * 1.5 + .5 * M;
  ok(Math.abs(r.rate - sollRate) < 1e-12 && Math.abs(r.defRate - 15 * M) < 1e-12 && M === 1000 / 1800, 'Kampf-Gold je Truppe × 1.000 ÷ 1.800 (Fähigkeit 50 + Held +50 %: ' + (r.rate * 1000).toFixed(2) + ' je 1.000)', r);
  ok(r.feld.a === Math.round(1e5 * sollRate) && r.feld.a > 0 && r.feld.a < 2e6 && r.feld.d === r.feld.a, '100.000 getötete Truppen bringen ~1,3 Mio. Münzen (vor dem 5.10.: 2,3 Mio.)', r.feld);
  ok(r.text[0] === '+8.333 Münzen je 1.000 Kills' && r.text[1] === '+167 Münzen je 1.000 Kills', 'Fähigkeit zeigt „Münzen je 1.000 Kills“ als ganze Zahl', r.text);
  ok(r.boss.schaden > 0 && r.boss.gold === Math.round(r.boss.schaden * .3 * M) && r.boss.kam === r.boss.gold + r.boss.klasse, 'Tagesboss (ohne Held): Münzen je Schaden × 1.000 ÷ 1.800 (100.000 Schaden → ' + r.boss.gold + ' Münzen, vorher 30.000)', r.boss);
  ok(r.soeldner.n === Math.round(Math.max(Math.max(1, Math.round(1000 * K)), r.soeldner.hp)) && r.soeldner.n < 1000, 'Händler-Söldner: eine Stunde Ausbildung, Mindestwert × WIRTSCHAFT_KOSTEN', r.soeldner);
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 3)); await b.close();
})();
