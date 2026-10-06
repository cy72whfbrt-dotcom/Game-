// Wirtschaft 2 (5.10.): Kosten und Gegner × WIRTSCHAFT_KOSTEN, Kiste 150 Edelsteine, neue Forschungen ab Labor 23
// (Krankenhaus II, Burg-Schutz+, Marschtempo II – wirken bei dir und bei Mitspielern)
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  const r = await p.evaluate(() => {
    const K = WIRTSCHAFT_KOSTEN, nr = n => niceRound(Math.max(1, Math.round(n * K))), o = {};
    o.faktoren = [WIRTSCHAFT_ERTRAG === 1 / 3600, K === 1 / 1800];
    // Kosten: alte Formel × 1/1800 (ganze Zahl, mindestens 1)
    o.aufwerten = [upgradeCostRoh(1), upgradeCostRoh(50), Math.max(1, Math.round(120 * Math.pow(1.27, 49) * K))];
    const bk = 5000 * Math.pow(1.6, 9) * Math.pow(1.25, 0), burg = AUF.stadtKosten('keep', 10);
    o.burg = [burg.c === nr(bk * 2), burg.h === niceRound(Math.round(bk)), burg.e === niceRound(Math.round(bk * .5)), burg];   // (Holz/Stein/Eisen in RoK-Größe, 6.10.)
    o.schutz = [AUF.burgSchutzStufe(1), AUF.burgSchutzStufe(10), AUF.burgSchutzStufe(25)];
    const atk = AUF.FORSCHUNG.find(d => d.id === 'm_atk'), fk = AUF.foKosten(atk, 1);
    o.forschKosten = [fk.c === nr(3000 * Math.pow(1.6, atk.aka - 1)) && fk.h === niceRound(Math.round(1500 * Math.pow(1.6, atk.aka - 1))), fk];
    o.gebaeude = [cityCost('wall', 5) === nr(500 * Math.pow(1.9, 5)), AUF.stadtKosten('wall', 5).h === niceRound(Math.round(300 * Math.pow(1.75, 5) * .5))];
    o.kiste = [CRATE_GEM_COST, (document.querySelector('[data-const="CRATE_GEM_COST"]') || {}).textContent];
    o.bund = BUND.KOSTEN;
    o.belohnung = [levelRewardTroops(30), levelRewardCoins(30), levelRewardTroops(2)];
    o.ep = kampfEp(2, 10, 2, 2) === Math.ceil(xpNeededForLevel(10) * KAMPF_EP_ANTEIL);   // 2 besiegte Krieger zählen wie vorher 3.600
    o.lager = [barbTroopsOf(1), barbTroopsOf(10)];
    o.krankenhaus = [hospitalPlatz(1), hospitalPlatz(10)];
    // Erfolge mit Münzen/Truppen-Zielen × 1/1800 (sonst unerreichbar), Texte ohne alte Zahlen
    const ach = id => ACHIEVEMENTS.find(x => x.id === id);
    o.erfolge = [ach('tollin').goal, ach('heal10k').goal, ach('heal1m').goal, ach('tollin').desc, ach('heal1m').desc];
    o.markt = (() => { const c = loadCity(); c.levels.market = 1; saveCity(); const d = document.createElement('div'); d.innerHTML = AUF.marktHtml();
      return [...d.querySelectorAll('[data-mk-menge]')].map(b => +b.dataset.mkMenge).concat([AUF.marktLimit('player')]); })();
    // Gegner auf der Karte: neutral × 1/1800, die Thron-Tore nie unter 150.000 + 50.000
    const tore = islands.filter(i => i.type === 'gate' && i.gateKind === 'throne'), mega = islands.find(i => i.type === 'megaTemple');
    const rand = islands.filter(i => i.type === 'tower' && !i.startSlot && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring === 8);
    o.schutzRoh = [AUF.burgSchutzRoh('player', 1), AUF.burgSchutz('player', 1)];
    o.thronTor = [tore.length > 0, tore.every(t => t.neutralTroops >= 150000 && t.neutralDefense >= 50000)];
    o.mega = [mega.neutralTroops, mega.neutralDefense];
    o.rand = [rand.length > 0, rand.every(i => i.neutralDefense >= 10 && i.neutralDefense <= 30 && i.neutralTroops >= 70 && i.neutralTroops <= 100)];
    o.haendler = [hdPreis('player', 'kiste') >= Math.round(30000 * K), hdPreis('player', 'kiste') <= 3 * Math.round(HD.PREIS_STUNDE_MAX * K)];
    // neue Forschungen: erst ab Labor 23, eine Labor-Stufe je Stufe, Vorgänger nötig
    const neu = ['w_schutz', 'm_laz2', 'x_tempo2'].map(id => AUF.FORSCHUNG.find(d => d.id === id));
    o.neuDa = neu.map(d => d && [d.aka, d.max, AUF.foAkaFuer(d, 1), AUF.foAkaFuer(d, 3)]);
    const c = loadCity(); c.levels.academy = 22; c.fo = { m_laz: 10, x_tempo: 10 }; c.foRun = null; saveCity();
    o.gesperrt = AUF.extraHtml('academy', 22).includes('Labor 23');
    const lazVor = AUF.lazarettPlus('player'), tempoVor = AUF.marschTempo('player'), schutzVor = AUF.burgSchutz('player');
    c.levels.academy = 25; c.fo = { m_laz: 10, x_tempo: 10, m_laz2: 2, x_tempo2: 3, w_schutz: 3 }; saveCity();
    o.wirkung = [lazVor, AUF.lazarettPlus('player'), hospitalPct() >= AUF.lazarettPlus('player'), Math.round(tempoVor * 100), Math.round(AUF.marschTempo('player') * 100),
      schutzVor, AUF.burgSchutz('player') === Math.round(AUF.burgSchutzStufe(AUF.burgStufe('player')) * 1.3)];
    // Mitspieler: dieselbe Wirkung
    const bot = BOT_DEFS.find(x => !x.mensch), bs = loadBotState()[bot.id];
    bs.city.fo = Object.assign({}, bs.city.fo, { m_laz: 10, m_laz2: 1, x_tempo: 0, x_tempo2: 2 }); saveBotState();
    o.mitspieler = [AUF.lazarettPlus(bot.id), botHospitalPct(bot.id) >= 25, Math.round(AUF.marschTempo(bot.id) * 100)];
    return o;
  });
  ok(r.faktoren.every(Boolean), 'Faktoren: Ertrag 1/3600, Kosten 1/1800', r.faktoren);
  ok(r.aufwerten[0] === 1 && r.aufwerten[1] === r.aufwerten[2], 'Basis aufwerten: alte Kosten ÷ 1800 (mindestens 1)', r.aufwerten);
  ok(r.burg.slice(0, 3).every(Boolean), 'Burg-Kosten: Münzen ÷ 1800, Holz/Eisen in RoK-Größe', r.burg[3]);
  ok(r.schutz[0] === 6 && r.schutz[1] === 556 && r.schutz[2] === 55556, 'Burg-Schutz Gold ÷ 1800 (Stufe 1 / 10 / 25)', r.schutz);
  ok(r.schutzRoh[0] === r.schutzRoh[1] * 1800 && r.schutzRoh[0] >= 10000, 'Burg-Schutz Holz/Stein/Eisen × ROH_FAKTOR (Stufe 1: ~10.000)', r.schutzRoh);
  ok(r.forschKosten[0], 'Forschung Angriff Stufe 1: Münzen ÷ 1800, Holz in RoK-Größe', r.forschKosten[1]);
  ok(r.gebaeude.every(Boolean), 'Gebäude (Mauer 5): Münzen ÷ 1800, Holz in RoK-Größe', r.gebaeude);
  ok(r.kiste[0] === 150 && r.kiste[1] === '150', 'Ausrüstungskiste kostet 150 Edelsteine (auch der Knopf)', r.kiste);
  ok(r.bund === 20, 'Bündnis gründen: 30.000 ÷ 1800 auf 10 gerundet = 20 Münzen', r.bund);
  ok(r.belohnung[0] === 1100 && r.belohnung[1] === 250 && r.belohnung[2] === 10, 'Stufen-Belohnung Stufe 30 ÷ 1800 (Truppen, Münzen), nie unter 10', r.belohnung);
  ok(r.ep, 'EP: ein besiegter Krieger zählt wie vorher 1.800 (Stufen gleich schnell)');
  ok(r.lager[0] === 1 && r.lager[1] === 570, 'Barbaren-Lager Stufe 1 / 10 ÷ 1800', r.lager);
  ok(r.krankenhaus[0] === 556 && r.krankenhaus[1] > 10000, 'Krankenhaus-Platz ÷ 1800', r.krankenhaus);
  ok(r.erfolge[0] === 56 && r.erfolge[1] === 6 && r.erfolge[2] === 556 && /Nimm 56 Münzen/.test(r.erfolge[3]) && /Heil 556 /.test(r.erfolge[4]), 'Erfolge Zöllner/Feldscher/Heiler: Ziele ÷ 1800 (Maut und Krankenhaus-Platz sind kleiner)', r.erfolge);
  ok(r.markt.length === 5 && r.markt.slice(0, 4).join() === '1000,10000,100000,1000000' && r.markt[4] >= 28 && r.markt[0] * 5 / 1800 <= r.markt[4], 'Markt: Mengen 1.000 … 1 Mio. – die kleinste passt ins kleinste Tageslimit (28)', r.markt);
  ok(r.thronTor.every(Boolean), 'Thron-Tore nie mit den Start-Truppen allein (mind. 150.000 + 50.000)', r.thronTor);
  ok(r.mega[0] === 500000 && r.mega[1] === 150000, 'Mega-Tempel: 500.000 Truppen + 150.000 Verteidigung (6.10.)', r.mega);
  ok(r.rand.every(Boolean), 'Basen am Rand: 70–100 Truppen, Verteidigung 10–30 (6.10.)', r.rand);
  ok(r.haendler.every(Boolean), 'Händler-Kiste: Preis ÷ 1800 (mindestens 17, kein Vermögen)', r.haendler);
  ok(r.neuDa.every(x => x && x[0] === 23 && x[1] === 3 && x[2] === 23 && x[3] === 25), 'Neue Forschungen ab Labor 23 (Stufe 1–3 bei Labor 23–25)', r.neuDa);
  ok(r.gesperrt, 'Labor 22: die neuen Forschungen stehen gesperrt in der Spalte „Labor 23“');
  ok(r.wirkung[1] === r.wirkung[0] + 10 && r.wirkung[2] && r.wirkung[4] === r.wirkung[3] + 9 && r.wirkung[6], 'Wirkung bei dir: Krankenhaus +10 %, Tempo +9 %, Burg-Schutz +30 %', r.wirkung);
  ok(r.mitspieler[0] === 25 && r.mitspieler[1] && r.mitspieler[2] === 106, 'Mitspieler: Krankenhaus II und Marschtempo II wirken genauso', r.mitspieler);
  // Im Labor (Militär → Krankenhaus II → Forschen): startet und kostet die neuen Preise
  const f = await p.evaluate(async () => { const c = loadCity(); c.levels.academy = 23; c.fo = { m_laz: 1 }; c.foRun = null; saveCity(); coins = 1e9;
    AUF.rohDazu('player', { h: 1e9, s: 1e9, e: 1e9 }); const d = AUF.FORSCHUNG.find(x => x.id === 'm_laz2'), k = AUF.foKosten(d, 1), vor = coins, rohVor = AUF.rohVon('player').h;
    foAst = 'm'; foSel = 'm_laz2'; const sheet = document.getElementById('citySheet'), box = document.createElement('div');
    box.innerHTML = AUF.extraHtml('academy', 23); sheet.appendChild(box);
    const knopf = box.querySelector('.fo-go[data-fo="m_laz2"]'), frei = !!knopf && !knopf.disabled; if (knopf) knopf.click(); box.remove();
    const c2 = loadCity(); return { frei, lauf: c2.foRun && c2.foRun.id, bezahlt: vor - coins === k.c, holz: rohVor - AUF.rohVon('player').h === k.h, k }; });
  ok(f.frei && f.lauf === 'm_laz2' && f.bezahlt && f.holz, 'Labor: Krankenhaus II starten – läuft und kostet die neuen Preise', f);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
