// Münzen in normalen Zahlen (Alexander 6.10., „B“): Ertrag, Kosten und Belohnungen in Münzen × MUENZ_FAKTOR (1.000) – das
// Verhältnis bleibt. Dazu die Grundverteidigung einer Basis in normaler Größe (vorher bis Stufe 10 nur 1).
const { chromium } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext()).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && AUF && typeof hdPreis === 'function' && typeof islands !== 'undefined' && islands.length, null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    for (const bd of BOT_DEFS) botNextAt[bd.id] = Date.now() + 1e9;
    const o = { faktor: MUENZ_FAKTOR };
    // 1) Ertrag: Basis Stufe 1 10.000 / Std., Tempel 15.000 / Std.
    o.basis = [Math.round(coinsPerTick(1) * 3600), Math.round(coinsPerTick(10) * 3600)]; o.tempel = Math.round(TEMPLE_COIN_BONUS_PER_TICK * 3600);
    // 2) Kosten und Belohnungen
    o.burg3 = AUF.stadtKosten('keep', 2).c; o.bund = BUND.KOSTEN; o.stufe = [levelRewardCoins(2), levelRewardCoins(30)];
    const hp = hourProduction('player').coins; o.hp = hp;
    o.pass = [passRewardAt(1, false)[0], passMuenzen(hourProduction('player'), 3)]; o.thron = throneAmount('player', 'coins');
    o.heal = Math.ceil(1000 * HEAL_COIN_PER_TROOP);
    o.maut = [GATE_TOLLS.map(mautJeTruppe), MAUT_MIN, MAUT_MAX];
    const tor = islands.find(i => i.type === 'gate'); const d = document.createElement('div'); d.innerHTML = gateControlsHtml(tor);
    o.mautText = [[...d.querySelectorAll('[data-toll]')].map(x => x.textContent), (d.querySelector('.gate-note') || {}).textContent || ''];
    // 3) aus Spieler-Sicht: nirgends Einer-/Zehner-Münzbeträge
    const L = n => Array.from({ length: n }, (_, i) => i + 1), min = a => Math.min(...a);
    o.klein = {
      stufe: min(L(60).map(l => levelRewardCoins(l + 1))), aufwerten: min(L(99).map(upgradeCostRoh)), lager: min(L(25).map(lagerMuenzen)),
      gebaeude: min(['lumber', 'quarry', 'mine', 'wall', 'forge', 'market', 'hospital', 'academy'].map(id => cityCost(id, 0))),
      forschung: min(AUF.FORSCHUNG.map(f => AUF.foKosten(f, 1).c)), haendler: min(Object.keys(HD_WAREN).map(k => hdPreis('player', k))),
      fund: pickupAmount('coin'), feld: min(resFields.filter(f => f.kind === 'gold').map(f => f.cap)), schutz: AUF.burgSchutzStufe(1),
      geschenk: wirtM(2000), kopfgeld: wirtM(500), markt: Math.round(100 * AUF.MARKT_WERT)
    };
    const c = loadCity(); c.levels.market = 5; saveCity(); const m = document.createElement('div'); m.innerHTML = AUF.marktHtml(); o.marktText = (m.querySelector('.keep-note') || {}).textContent || '';
    o.gold = skillBonusText(SKILL_DEFS.attackGold, 1);
    // 4) Grundverteidigung: 50 je Stufe, später wie bisher wachsend – nie kleiner mit höherer Stufe
    o.grund = [1, 10, 20, 40, 60].map(baseDefenseForLevel);
    o.steigt = L(99).every(l => baseDefenseForLevel(l + 1) >= baseDefenseForLevel(l));
    const meine = [...ownedIslands][0]; o.meineVert = meine !== undefined ? [islandLevels[meine] || 1, effectiveDefense(islandById[meine])] : null;
    // 5) Mitspieler: dieselben Regeln (Ertrag aus denselben Stufen, gleiche Preise)
    const X = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).id;
    o.bot = { hp: hourProduction(X).coins, thron: throneAmount(X, 'coins'), kiste: hdPreis(X, 'kiste') };
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.faktor === 1000, 'MUENZ_FAKTOR = 1.000', r.faktor);
  ok(r.basis[0] === 10000 && r.basis[1] === 35000 && r.tempel === 15000, 'Ertrag: Basis Stufe 1 10.000 / Std. (Stufe 10: 35.000), Tempel 15.000 / Std.', [r.basis, r.tempel]);
  ok(r.burg3 === 1900, 'Burg 2 → 3 kostet 1.900 Münzen (7.10.: Anfang billig, Burg 25 ≈ 120 Mio.)', r.burg3);
  ok(r.bund === 20000, 'Bündnis gründen 20.000 Münzen', r.bund);
  ok(r.stufe[0] === 10000 && r.stufe[1] === 250000, 'Stufen-Belohnung: mindestens 10.000 Münzen, Stufe 30: 250.000', r.stufe);
  ok(r.pass[0].k === 'coins' && r.pass[0].n === 3 && r.pass[1] >= 30000 && r.thron === Math.max(Math.round(5000 / 1.8), Math.round(2 * r.hp)) && r.thron >= 20000, 'Pass (3 Std. Ertrag ≥ 30.000) und Thron-Shop (2 Std. ≥ 20.000)', r);
  ok(r.heal === 100000, 'Heilen: 1.000 Verwundete kosten 100.000 Münzen (100 je Truppe)', r.heal);
  ok(r.maut[0].join() === '0,100,250,500,1000,2000' && r.maut[1] === 100 && r.maut[2] === 560000, 'Maut je Truppe 100 … 2.000, je Marsch 100 … 560.000', r.maut);
  ok(r.mautText[0].join() === 'frei,100,250,500,1.000,2.000' && /höchstens 560\.000 Münzen pro Marsch/.test(r.mautText[1]), 'Tor-Fenster zeigt die Maut in Münzen', r.mautText);
  const K = r.klein;
  ok(Object.keys(K).every(k => K[k] >= 100) && K.stufe >= 10000 && K.aufwerten >= 1000 && K.haendler >= 10000 && K.feld >= 10000, 'keine Einer-/Zehner-Münzbeträge (Belohnungen, Kosten, Händler, Funde, Felder, Beute, Markt)', K);
  ok(/100 Rohstoffe = 278 Münzen/.test(r.marktText), 'Markt erklärt den Kurs (100 Rohstoffe = 278 Münzen)', r.marktText);
  ok(r.gold === '+167 Münzen je 1.000 Kills', 'Fähigkeit „Angriff: Münzen“ Stufe 1: +167 Münzen je 1.000 Kills', r.gold);
  ok(r.grund.join() === '50,500,1000,2000,46408' && r.steigt, 'Grundverteidigung: Stufe 1 50, Stufe 10 500, Stufe 20 1.000, Stufe 60 ~46.000 – steigt immer', r.grund);
  ok(!r.meineVert || r.meineVert[1] >= 50 * r.meineVert[0], 'deine Basis verteidigt mindestens mit der Grundverteidigung', r.meineVert);
  ok(r.bot.hp >= 10000 && r.bot.thron >= 20000 && r.bot.kiste >= 30000, 'Mitspieler: gleiche Münz-Größen (Ertrag, Thron-Shop, Händler)', r.bot);
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 3)); await b.close();
})();
