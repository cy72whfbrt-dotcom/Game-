// Langzeit (6.10.): Tagesaufgabe „Öffne … Kisten“ zählt jede Kiste (Shop, Helden-Kiste, Abholfach, Pass, Thron-Shop, Belohnungen);
// Stadt-Bau und Forschung zählen für Aufgaben („Starte eine Forschung“) und geben Saison-Pass-Punkte (auch Mitspieler);
// das Wochen-Event „Bauherr“ zählt fertige Stadt-Gebäude (du und Mitspieler, 2 + neue Stufe).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  const auf = typ => ev(t => { const q = loadQuests(); q.list = [{ type: t, target: 99, progress: 0, gems: 5, claimed: false }, { type: 'scout', target: 2, progress: 0, gems: 10, claimed: false }, { type: 'send', target: 2, progress: 0, gems: 15, claimed: false }]; saveQuests(); }, typ);
  const stand = () => ev(() => loadQuests().list[0].progress);
  // 1) Kisten: jede zählt
  await auf('crate');
  const k = await ev(() => {
    const out = { text: QUEST_DEFS.crate.text(3) };
    gems = 5000; openCrate(); out.shop = loadQuests().list[0].progress;
    grantFreeCrate(0); out.frei = loadQuests().list[0].progress;                                   // tägliche Belohnung, Bonus, Wochenkette, Abholfach (crate)
    inboxAdd({ src: 'haendler', kiste: 1 }); inboxClaim(inboxList()[0].id); out.abholfach = loadQuests().list[0].progress;   // Abholfach: genau diese Kiste
    passGive('player', { k: 'crate', n: 2 }); out.pass = loadQuests().list[0].progress;
    throneGive('player', 'crate'); out.thron = loadQuests().list[0].progress;
    return out;
  });
  ok(k.text === 'Öffne 3 Kisten', 'Text ohne „im Shop“', k.text);
  ok(k.shop === 1 && k.frei === 2 && k.abholfach === 3 && k.pass === 5 && k.thron === 6, 'Shop, Gratis-Kiste, Abholfach, Pass (2), Thron-Shop zählen', k);
  await ev(() => { closeAllPopups(); openShop('gems'); });
  await p.waitForTimeout(400);
  await p.locator('[data-hchest="hc1"]').click(); await p.waitForTimeout(300);
  ok(await stand() === 7, 'Helden-Kiste zählt', await stand());
  // 2) Stadt-Bau: Aufgabe + Pass-Punkte, Bauherr beim Fertigwerden
  await auf('bau');
  const s = await ev(() => {
    const out = {}, px = () => passOf(passNo(Date.now())).xp || 0, punkte = [];
    const altP = window.evPunkte; window.evPunkte = (k, w, n) => punkte.push([k, w, n]);
    try {
      const c = loadCity(); c.builds = []; c.levels.keep = 6; c.levels.wall = 2; saveCity();
      coins = 1e12; AUF.rohDazu('player', { h: 1e9, s: 1e9, e: 1e9 });
      const x0 = px(); cityStartBuild('wall'); out.bau = loadQuests().list[0].progress; out.pass = px() - x0; out.text = QUEST_DEFS.bau.text(1);
      cityFinishBuild(false, 'wall'); out.stufe = loadCity().levels.wall; out.punkte = punkte.slice();
      // Mitspieler: Bauherr beim Fertigwerden, Pass-Punkte beim Start (Statistik bau)
      const bot = BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id]), bs = loadBotState()[bot.id], st0 = (bs.stats || {}).bau || 0;
      bs.city.builds = [{ id: 'wall', to: 4, startedAt: Date.now() - 2000, endsAt: Date.now() - 1000 }]; punkte.length = 0; botCityFinish(bot, Date.now());
      out.bot = { punkte: punkte.slice(), stufe: bs.city.levels.wall };
      botCoins[bot.id] = 1e13; bs.res = { h: 1e12, s: 1e12, e: 1e12 }; bs.city.builds = []; botCityBuild(bot, Date.now());
      out.bot.start = ((bs.stats || {}).bau || 0) - st0; out.bot.xp = PASS_BOT_XP.bau;
    } finally { window.evPunkte = altP; }
    return out;
  });
  ok(s.bau === 1 && s.pass === 15 && s.text === 'Starte einen Bau in der Stadt', 'Stadt-Bau zählt für die Aufgabe und gibt 15 Pass-Punkte', s);
  ok(s.stufe === 3 && JSON.stringify(s.punkte) === '[["bau","player",5]]', 'Bauherr: fertiges Gebäude gibt 2 + neue Stufe', s.punkte);
  ok(JSON.stringify(s.bot.punkte) === '[["bau","' + (await ev(() => BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id]).id)) + '",6]]' && s.bot.stufe === 4, 'Mitspieler: Bauherr für Stadt-Gebäude', s.bot);
  ok(s.bot.start === 1 && s.bot.xp === 15, 'Mitspieler: Bau-Start zählt für den Pass (wie bei dir)', s.bot);
  // 3) Forschung: Aufgabe + Pass-Punkte; nur angeboten, wenn sie heute geht
  await auf('forschung');
  const f = await ev(() => {
    const out = {}, c = loadCity();
    c.levels.academy = 0; c.foRun = null; saveCity(); out.ohneLabor = questStadtGeht('forschung');
    c.levels.academy = 3; c.foRun = { id: 'w_prod', to: 1, startedAt: Date.now(), endsAt: Date.now() + 3 * 864e5 }; saveCity(); out.labor3Tage = questStadtGeht('forschung');
    c.foRun = null; c.fo = {}; saveCity(); out.frei = questStadtGeht('forschung');
    // eine neue Tagesliste: ohne Labor nie „Starte eine Forschung“
    c.levels.academy = 0; c.foRun = null; saveCity(); let gesehen = 0;
    for (let i = 0; i < 60; i++) { questState = null; store.set('openWaterQuests', ''); if (loadQuests().list.some(t => t.type === 'forschung')) gesehen++; }
    out.ohneLaborListe = gesehen;
    c.levels.academy = 3; saveCity(); gesehen = 0;
    for (let i = 0; i < 60; i++) { questState = null; store.set('openWaterQuests', ''); if (loadQuests().list.some(t => t.type === 'forschung')) gesehen++; }
    out.mitLaborListe = gesehen;
    // Bau: alle Bauarbeiter bis nach Mitternacht beschäftigt → keine Bau-Aufgabe
    c.builder2 = false; c.builds = [{ id: 'wall', to: 9, startedAt: Date.now(), endsAt: Date.now() + 2 * 864e5 }]; saveCity(); out.bauBelegt = questStadtGeht('bau');
    c.builds = []; saveCity(); out.bauFrei = questStadtGeht('bau');
    const bot = BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id]), bs = loadBotState()[bot.id]; bs.city.levels.academy = 5; bs.city.foRun = null; botCoins[bot.id] = 1e13; bs.res = { h: 1e12, s: 1e12, e: 1e12 };
    const st0 = (bs.stats || {}).fo || 0; AUF.botForschung(bot, Date.now()); out.botFo = [((bs.stats || {}).fo || 0) - st0, !!bs.city.foRun, PASS_BOT_XP.fo];
    return out;
  });
  ok(!f.ohneLabor && !f.labor3Tage && f.frei, 'Forschungs-Aufgabe nur, wenn das Labor heute frei ist', f);
  await ev(() => { closeAllPopups(); const q = loadQuests(); q.list[0] = { type: 'forschung', target: 1, progress: 0, gems: 5, claimed: false }; saveQuests(); const c = loadCity(); c.levels.academy = 3; c.foRun = null; c.fo = {}; saveCity();
    coins = 1e12; AUF.rohDazu('player', { h: 1e9, s: 1e9, e: 1e9 }); });   // (die Forschung startet der Knopf im Labor)
  const fx = await ev(() => { const px = () => passOf(passNo(Date.now())).xp || 0, x0 = px(); openCity(); cityOpenId = 'academy'; renderCitySheet(); const knopf = document.querySelector('[data-fo="w_prod"]:not([disabled])'); if (knopf) knopf.click();
    const r = { knopf: !!knopf, lauf: !!loadCity().foRun, auf: loadQuests().list[0].progress, pass: px() - x0 }; return r; });
  ok(fx.knopf && fx.lauf && fx.auf === 1 && fx.pass === 15, 'Forschung starten: Aufgabe erledigt, +15 Pass-Punkte', fx);
  ok(f.ohneLaborListe === 0 && f.mitLaborListe > 0, 'neue Tagesliste: ohne Labor keine Forschungs-Aufgabe', { ohne: f.ohneLaborListe, mit: f.mitLaborListe });
  ok(!f.bauBelegt && f.bauFrei, 'Bau-Aufgabe nur, wenn heute ein Bauarbeiter frei wird', f);
  ok(f.botFo[0] === 1 && f.botFo[1] && f.botFo[2] === 15, 'Mitspieler: Forschung zählt für den Pass', f.botFo);
  ok(await ev(() => PASS_HOW.some(h => /Bau in der Stadt/.test(h[1])) && PASS_HOW.some(h => /Forschung/.test(h[1]))), 'Pass erklärt die neuen Punkte');
  const bh = await ev(() => EV_WOCHE.find(x => x.k === 'bau').pkt);
  ok(/Stadt/.test(bh), 'Wochen-Event Bauherr nennt die Stadt', bh);
  // 4) Liste beim Skript-Start gewürfelt (AUF noch nicht da): nach dem Laden wird „Forschung“ ohne Labor getauscht
  const p2 = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p2.on('pageerror', e => fe.push(e.message));
  await p2.addInitScript(() => { const d = new Date(), tag = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    try { localStorage.setItem('openWaterReset', '1'); localStorage.setItem('openWaterQuests', JSON.stringify({ date: tag, bonusClaimed: false, list: [{ type: 'forschung', target: 1, progress: 0, gems: 5, claimed: false },
      { type: 'scout', target: 4, progress: 0, gems: 10, claimed: false }, { type: 'send', target: 6, progress: 0, gems: 15, claimed: false }] })); } catch (e) {} });
  await p2.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html');
  await p2.waitForFunction(() => typeof AUF !== 'undefined' && AUF && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  await p2.waitForTimeout(3000);
  const neu = await p2.evaluate(() => ({ labor: loadCity().levels.academy || 0, gespeichert: JSON.parse(localStorage.getItem('openWaterQuests')), liste: loadQuests().list.map(t => [t.type, t.target]) }));
  const l0 = neu.liste[0];
  ok(neu.labor === 0 && l0[0] !== 'forschung' && !neu.liste.slice(1).some(t => t[0] === l0[0]) && l0[1] === await p2.evaluate(t => QUEST_DEFS[t].steps[0], l0[0]) && neu.liste[1][0] === 'scout' && neu.liste[2][0] === 'send',
    'beim Laden gewürfelte Forschungs-Aufgabe ohne Labor wird getauscht (Stufe bleibt, andere bleiben)', neu.liste);
  ok(neu.gespeichert.geprueft === 1 && neu.gespeichert.list[0].type === l0[0], 'Tausch geschieht von selbst nach dem Laden und ist gespeichert', neu.gespeichert);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
