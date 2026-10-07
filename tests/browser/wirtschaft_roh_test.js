// Wirtschaft Holz/Stein/Eisen in RoK-Größe (Alexander 6.10., Z1–Z4): Kosten ohne ÷ 1.800, Ertrag × ROH_FAKTOR, Sammel-Felder mit
// der Wurzel des Ring-Faktors, Burg-Schutz getrennt (Gold / Rohstoffe), Markt kann keine Münzen erzeugen, Start 5.000 Truppen,
// neutrale Basen außen ~100 bis Ring 2 höchstens 1.000, Wächter/Tore/Thron schwer. Für Mitspieler dieselben Funktionen.
const { chromium } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext()).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(8000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && AUF && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    for (const bd of BOT_DEFS) botNextAt[bd.id] = Date.now() + 1e9;
    const o = {};
    // 1) Kosten: Burg 3 → 4 wie früher in RoK-Größe, Münzen klein
    o.faktor = ROH_FAKTOR; o.burg3 = AUF.stadtKosten('keep', 3); o.burg9 = AUF.stadtKosten('keep', 9);
    // 2) Ertrag: die Burg allein ~75 je Rohstoff und Stunde (× Landschaft 0,6–1,4)
    const c = loadCity(), alt = c.levels.lumber; c.levels.lumber = 0; o.burgStunde = AUF.rohStunde('player').h; c.levels.lumber = alt;
    // 3) Sammel-Felder: Holz außen 8.000 × ½, Ring 2 nur √300 × so viel; Gold ebenso mit der Wurzel, Edelsteine wie vorher
    const ring = f => landmasses[f.landmassId].ring, feld = (k, rg) => resFields.find(f => f.kind === k && ring(f) === rg);
    const h8 = feld('holz', 8) || feld('holz', 7), h2 = feld('holz', 2), g8 = feld('gold', 8) || feld('gold', 7), g2 = feld('gold', 2);
    o.felder = { h8: h8 && h8.cap, h2: h2 && h2.cap, g8: g8 && g8.cap, g2: g2 && g2.cap, gem: fieldCapFor('gem', 300) };
    // 4) Burg-Schutz: Gold klein, Holz/Stein/Eisen × ROH_FAKTOR – Beute an der Hauptstadt rechnet mit dem richtigen Schutz
    const schutz = AUF.burgSchutz('player'), schutzR = AUF.burgSchutzRoh('player'), rr = AUF.rohVon('player');
    rr.h = schutzR + 10000; rr.s = schutzR; rr.e = 0; coins = schutz + 100;
    o.beute = { schutz, schutzR, p: plunderOf('player', true) };
    o.spaeh = AUF.spaeherMehr('player').roh;
    // 5) Markt: 1.000 Holz verkaufen gibt ~2.640 Münzen (100 Rohstoffe = 278 Münzen, 5 % Gebühr); kaufen und wieder verkaufen macht nie Münzen
    c.levels.market = 20; saveCity(); coins = 1000; rr.h = 1e6; delete c.markt;
    const m0 = coins; marktTausch('player', 'v', 'h', 1000); o.verkauf = coins - m0;
    let schleife = coins; for (let i = 0; i < 20; i++) { marktTausch('player', 'k', 's', 1000); marktTausch('player', 'v', 's', 1000); }
    o.schleife = [schleife, coins];
    // 6) Start-Truppen, neutrale Basen je Ring, Wächter, Tore, Thron
    o.start = PLAYER_START_TROOPS;
    const tuerme = islands.filter(i => i.type === 'tower' && !i.startSlot), je = {};
    for (const i of tuerme) { const L = landmasses[i.landmassId], k = L.tier === 'outer' ? 'r' + L.ring : L.tier; const x = je[k] || (je[k] = [Infinity, 0]); x[0] = Math.min(x[0], i.neutralTroops); x[1] = Math.max(x[1], i.neutralTroops); }
    o.ringe = je;
    const tore = k => islands.filter(i => i.type === 'gate' && i.gateKind === k).map(i => [i.neutralTroops, i.neutralDefense]);
    o.tore = { guardian: tore('guardian')[0], throne: tore('throne')[0], border: tore('border').reduce((a, t) => [Math.min(a[0], t[0]), Math.max(a[1], t[0])], [Infinity, 0]) };
    o.tempel = { mega: islands.find(i => i.type === 'megaTemple').neutralTroops, waechter: islands.find(i => i.type === 'temple' && i.guardian).neutralTroops,
      normal: islands.filter(i => i.type === 'temple' && !i.guardian).map(i => i.neutralTroops).reduce((a, t) => [Math.min(a[0], t), Math.max(a[1], t)], [Infinity, 0]) };
    // 6b) Pass-Münzen: n Stunden Ertrag – frei 3, Premium 12 (+ 10 Edelsteine; 7.10. 100 Stufen, nicht mehr „10 Münzen“)
    o.pass = [1, 7].map(L => [passRewardAt(L, false)[0], passRewardAt(L, true)[0]]);
    // 7) Mitspieler: dieselben Kosten und derselbe Rohstoff-Ertrag
    const X = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).id;
    o.bot = { k: JSON.stringify(AUF.stadtKosten('keep', 3)) === JSON.stringify(o.burg3), h: AUF.rohStunde(X).h, start: JSON.stringify(AUF.ROH_START) };
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.faktor === 1800, 'ROH_FAKTOR = 1.800', r.faktor);
  ok(r.burg3.h === 13000 && r.burg3.s === 10000 && r.burg3.e === 6400 && r.burg3.c === 14000, 'Burg 3 → 4: 13.000 Holz, 10.000 Stein, 6.400 Eisen, 14.000 Münzen (6.10.: Münzen × 1.000)', r.burg3);
  ok(r.burg9.h >= 2e5 && r.burg9.h <= 2.2e5, 'Burg 9 → 10: etwa 210.000 Holz', r.burg9);
  ok(r.burgStunde >= 75 * .6 && r.burgStunde <= 75 * 1.4 * 1.3 + 1, 'Burg allein: etwa 75 Holz pro Stunde (× Landschaft)', r.burgStunde);
  const F = r.felder;
  ok(F.h8 === 4000 && F.h2 === Math.round(8000 * Math.sqrt(300) / 2), 'Holz-Feld außen 4.000, Ring 2 nur × √300 (' + F.h2 + ')', F);
  ok(F.g8 === 11111 && F.g2 === Math.round(40000 * Math.sqrt(300) / 3600 * 1000), 'Gold-Feld außen 11.111 Münzen, Ring 2 × √300 (statt × 300)', F);
  ok(F.gem === Math.round(20 * Math.pow(300, .35)), 'Edelstein-Adern wie vorher', F.gem);
  const B = r.beute;
  ok(B.schutzR === Math.round(B.schutz * 1.8) && B.p.safe === B.schutz && B.p.loot === 10 && B.p.roh.h === 1000 && B.p.roh.s === 0 && B.p.roh.e === 0, 'Beute: Gold über dem Gold-Schutz, Holz über dem Rohstoff-Schutz (× 1,8)', B);
  ok(r.spaeh.schutz === B.schutz && r.spaeh.schutzR === B.schutzR, 'Spähbericht kennt beide Schutz-Werte', r.spaeh);
  ok(r.verkauf === Math.floor(1000 * 5000 / 1800 * .95), 'Markt: 1.000 Holz verkaufen gibt 2.638 Münzen (100 Rohstoffe = 278 Münzen, Gebühr 5 %)', r.verkauf);
  ok(r.schleife[1] <= r.schleife[0], 'Markt: kaufen und verkaufen erzeugt keine Münzen', r.schleife);
  ok(r.start === 5000, 'Start-Truppen 5.000', r.start);
  const R = r.ringe;
  ok(R.r7 && R.r7[0] >= 70 && R.r7[1] <= 100 && R.r2 && R.r2[1] <= 1000 && R.r2[0] >= 700, 'neutrale Basen: außen (Zone 1) 70–100, Zone 3 (Ring 2) höchstens 1.000', R);
  ok(['r2', 'r5', 'r7'].every((k, i, a) => R[k] && R[k][1] <= 1000 && (i === 0 || R[a[i - 1]][1] >= R[k][1])), 'nach innen steigend (Zone 1 → 2 → 3)', R);
  ok(R.guardian && R.guardian[0] > 5000 - 1 && R.guardian[1] <= 2e4, 'Wächter-Türme 5.000–20.000 (mehr als die Start-Truppen)', R.guardian);
  ok(R.throne && R.throne[0] >= 5e4 && R.throne[1] <= 1.5e5, 'Thron-Türme 50.000–150.000', R.throne);
  ok(r.pass.every(([f, p]) => f.k === 'coins' && f.n === 3 && p.k === 'coins' && p.n === 12), 'Pass-Münzen: 3 / 12 Stunden Ertrag', r.pass);
  const T = r.tore;
  ok(T.guardian && T.guardian[0] >= 3e4 && T.throne && T.throne[0] >= 150000 && T.throne[1] >= 50000 && T.border[0] >= 5000 && T.border[1] <= 20000, 'Tore: Wächter 30.000, Thron mind. 150.000 + 50.000, Grenze 5.000–20.000', T);
  ok(r.tempel.mega >= 5e5 && r.tempel.waechter >= 6e4 && r.tempel.normal[1] === 0, 'Tempel: Mega 500.000, Wächter 60.000 (Zonen wie RoK: nur Thron + die Tempel in Zone 4)', r.tempel);
  ok(r.bot.k && r.bot.h > 30 && r.bot.start === '{"h":3000,"s":2000,"e":500}', 'Mitspieler: gleiche Kosten, Ertrag, Start-Rohstoffe', r.bot);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
