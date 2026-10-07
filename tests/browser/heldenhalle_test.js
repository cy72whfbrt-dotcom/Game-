// Merkliste 21: Helden erst mit gebauter Heldenhalle, Vorschau ohne Server:
// ohne Halle Hinweis im Helden-Fenster, kein Freischalten/Aufwerten, kein Held im Marsch (auch nicht für Mitspieler);
// Splitter sammeln (Heldenkiste) geht; mit Halle Stufe 1 geht alles wieder.
const { chromium } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', fe = [];
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof HEROES !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof bots !== 'undefined' && bots.length, null, { timeout: 60000, polling: 500 }).catch(() => {});
  const R = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const out = {}, c = loadCity(); c.levels.heroes = 0; saveCity();
    const H = loadHeroes(); Object.assign(H.sigrun, { own: true, q: 4, sk: [0, 0, 0, 0], sh: 500 }); Object.assign(H.ida, { own: false, q: 0, sk: [0, 0, 0, 0], sh: 500 }); saveHeroes();
    const ziel = islands.find(i => i.id !== playerIslandId), src = islandById[playerIslandId];
    openHeroHall(); const el = document.getElementById('heroHall');
    out.hinweis = /Baue die Heldenhalle/.test(el.textContent); out.karten = el.querySelectorAll('.hh-card').length;
    out.owned = heroOwned('player', 'sigrun'); out.pick = heroPickBest('player', src, ziel, 1000); out.launch = heroLaunch('player', 'sigrun', src, ziel, 1000);
    out.unlock = heroDoUnlock('player', 'ida'); out.step = heroDoStep('player', 'sigrun'); out.skill = heroDoSkill('player', 'sigrun', 0); out.cando = HEROES.some(h => heroCanDo('player', h.id));
    const sh = loadHeroes().ida.sh; heroGrantShards('player', 10, 'ida'); out.splitter = loadHeroes().ida.sh - sh;   // Heldenkiste: Splitter sammeln geht
    closeHeroHall();
    const bot = bots[0], bs = loadBotState()[bot.id]; bs.city.levels.heroes = 0; heroSt(bot.id, 'sigrun').own = true;
    out.botOhne = heroPickBest(bot.id, src, ziel, 1000);
    bs.city.levels.heroes = 1; out.botMit = heroPickBest(bot.id, src, ziel, 1000);
    c.levels.heroes = 1; saveCity(); openHeroHall(); out.mitKarten = el.querySelectorAll('.hh-card').length; out.mitHinweis = /Baue die Heldenhalle/.test(el.textContent); closeHeroHall();
    out.mitOwned = heroOwned('player', 'sigrun'); out.mitPick = heroPickBest('player', src, ziel, 1000); out.mitUnlock = heroDoUnlock('player', 'ida');
    return out;
  });
  ok(R.hinweis && R.karten === 0, 'ohne Halle: Helden-Fenster zeigt „Baue die Heldenhalle“', R);
  ok(!R.owned && R.pick === null && R.launch === null, 'ohne Halle: kein Held im Marsch', R);
  ok(!R.unlock && !R.step && !R.skill && !R.cando, 'ohne Halle: kein Freischalten, Aufwerten, keine Fähigkeit', R);
  ok(R.splitter === 10, 'ohne Halle: Splitter sammeln (Heldenkiste) geht', R.splitter);
  ok(R.botOhne === null && R.botMit === 'sigrun', 'Mitspieler: gleiche Regel', [R.botOhne, R.botMit]);
  ok(!R.mitHinweis && R.mitKarten === 20 && R.mitOwned && R.mitPick && R.mitUnlock, 'mit Halle Stufe 1: alles geht', R);
  ok(!fe.length, 'keine Skriptfehler', fe);
  await b.close();
})();
