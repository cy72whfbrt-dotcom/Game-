// Langzeit (6.10.): neue Erfolge für die Hauptstadt (Burg 5–25, Forschung, Saison-Top-10), gesenkte Erfolge
// (Großreich 100 statt 150), dieselben Zahlen für Mitspieler (BOT_GOAL_VAL) – Drache/Invasion zählen beim Auszahlen.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => {
    const A = id => ACHIEVEMENTS.find(a => a.id === id), out = {};
    out.neu = ['burg5', 'burg10', 'burg15', 'burg20', 'burg25', 'fo10', 'fo50', 'foall', 'saison1', 'saison3'].filter(id => !A(id));
    out.gems = [A('burg5').gems, A('burg25').gems, A('foall').gems];
    out.ziele = { emp: A('emp150').goal, base: A('base100').goal, cap: A('cap1000').goal, foall: A('foall').goal, foGesamt: AUF.foGesamt() };
    // Burg und Labor (deine Stadt)
    const c = loadCity(); c.levels.keep = 10; c.levels.academy = 6; c.fo = { w_prod: 5, m_atk: 4, x_tempo: 2 }; saveCity();
    out.burg = [achDone(A('burg5')), achDone(A('burg10')), achDone(A('burg15'))];
    out.fo = [achVal(A('fo10')), achDone(A('fo10')), achDone(A('fo50'))];
    const g0 = gems; out.abgeholt = claimAch(A('burg5')); out.gemsDazu = gems - g0; out.zweimal = claimAch(A('burg5'));
    const bot = BOT_DEFS.find(d => !d.mensch);
    out.altWeg = ACHIEVEMENTS.filter(x => /^(drache|inv)/.test(x.id)).length;   // Drache/Invasion gibt es nicht mehr
    // Saison-Titel (die besten 10)
    saisonTitelGeben('s2p4'); out.saison = [achVal(A('saison1')), achDone(A('saison1'))];
    const bs = loadBotState()[bot.id]; bs.sTitel = ['s1p2', 's2p1']; bs.titles = ['s2p1', 'king']; out.saisonBot = botGoalVal(bot.id, 'saisonTop');
    // Mitspieler: dieselbe Burg-/Forschungs-Rechnung
    bs.city.levels.keep = 15; bs.city.fo = { w_prod: 10, m_def: 3 };
    out.bot = [botGoalVal(bot.id, 'burg'), botGoalVal(bot.id, 'foStufen')];
    bs.goals = {}; for (let i = 0; i < 80; i++) botClaimGoals(bot); out.botHat = ['burg5', 'burg10', 'burg15', 'fo10'].filter(id => bs.goals[id]).length;
    // Fenster: Erfolge zeigen die neuen Karten ohne kaputte Werte
    openGoals('ach'); renderAchievements(); const t = document.getElementById('goalsPopup').innerText;
    closeAllPopups(); const neu = achClaimable().map(x => x.id); achKnown = new Set(); hintEl.textContent = ''; achCheck();   // mehrere neu: nacheinander, nie übereinander
    out.einzeln = { neu: neu.length, gezeigt: achKnown.size, text: /^Erfolg: /.test(hintEl.textContent) }; hintEl.textContent = ''; achCheck(); out.einzeln.danach = achKnown.size;
    openGoals('ach');
    out.text = { burg: /Burgherr|Schlossherr/.test(t), schlecht: /undefined|NaN|\[object/.test(t) };
    return out;
  });
  ok(r.neu.length === 0, 'neue Erfolge für die Hauptstadt da', r.neu);
  ok(r.gems[0] === 30 && r.gems[1] === 600 && r.gems[2] === 400, 'Edelsteine wie üblich (÷5)', r.gems);
  ok(r.ziele.emp === 100 && r.ziele.base === 100 && r.ziele.cap === 1000, 'Großreich gesenkt (100), Langzeit-Ziele (Basis 100, 1.000 Eroberungen) bleiben', r.ziele);
  ok(r.ziele.foall === r.ziele.foGesamt && r.ziele.foall >= 95, '„alles erforscht“ = alle Forschungs-Stufen', r.ziele);
  ok(r.burg.join() === 'true,true,false', 'Burg 10: Burg 5 und 10 erreicht, 15 nicht', r.burg);
  ok(r.fo[0] === 11 && r.fo[1] && !r.fo[2], 'Forschung: 11 Stufen → „Forscher“ erreicht', r.fo);
  ok(r.abgeholt === 30 && r.gemsDazu === 30 && r.zweimal === 0, 'Burgvogt abgeholt: +30 Edelsteine, nur einmal', r);
  ok(r.altWeg === 0, 'Erfolge für Drache/Invasion sind raus (Events 8.10.)', r.altWeg);
  ok(r.saison[0] === 1 && r.saison[1] && r.saisonBot === 2, 'Saison-Titel zählen (du und Mitspieler, jeder einmal)', { du: r.saison, bot: r.saisonBot });
  ok(r.bot[0] === 15 && r.bot[1] === 13 && r.botHat === 4, 'Mitspieler: gleiche Burg-/Forschungs-Erfolge', { werte: r.bot, abgeholt: r.botHat });
  ok(r.einzeln.neu >= 2 && r.einzeln.gezeigt === 1 && r.einzeln.text && r.einzeln.danach === 2, 'Mehrere neue Erfolge: je Runde eine Meldung, die nächste danach', r.einzeln);
  ok(r.text.burg && !r.text.schlecht, 'Erfolge-Fenster zeigt die Hauptstadt-Erfolge sauber', r.text);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
