// Wirtschaft „pro Stunde“ (Alexander 5.10., LIESMICH 11b A): was früher pro Sekunde kam, kommt jetzt pro Stunde. Geprüft wird, dass
// genau das ankommt, was das Profil anzeigt (Beispiel Alexander: 2 Türme Stufe 22 → Profil = doppelter Turm-Wert; Münzen seit 6.10. × 1.000,
// Truppen seit 7.10. BASE_TROOPS 15 statt 5 → je Turm 282 statt 94 – Soll-Werte darum aus troopsPerTick/coinsPerTick), auch mit der Fähigkeit
// „Geschwindigkeit“ und allen Boni; Basis-Fenster und Tempel zeigen „/ Std.“; die Hauptstadt macht Holz/Stein/Eisen pro Stunde wie
// angezeigt; Mitspieler genau gleich; die Saison endet sonntags 18 Uhr deutscher Zeit – auch wenn die Uhr des Geräts woanders steht.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Los_Angeles' })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && typeof produceTicks === 'function' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    for (const bd of BOT_DEFS) botNextAt[bd.id] = Date.now() + 1e9;                 // (die Mitspieler handeln während des Messens nicht)
    const cap = playerIslandId, home = islandById[cap];
    const zweite = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.landmassId === home.landmassId && i.id !== cap);
    for (const id of [...ownedIslands]) if (id !== cap) ownedIslands.delete(id);
    ownedIslands.add(zweite.id); islandLevels[cap] = 22; islandLevels[zweite.id] = 22; islandTroops[zweite.id] = 1000; ownVer++;
    const meine = () => [...ownedIslands].reduce((a, id) => a + (islandTroops[id] || 0), 0);
    const stunde = n => { prodCarry.coins = 0; prodCarry.troops = {}; const t0 = meine(), c0 = coins; produceTicks(n); return { troops: meine() - t0, coins: coins - c0 }; };
    const out = {};
    // 1) Alexanders Beispiel: 2 Türme Stufe 22 ohne Boni → je troopsPerTick(22) Truppen und coinsPerTick(22) Münzen pro Stunde
    out.je = { t: Math.round(troopsPerTick(22) * 3600), c: Math.round(coinsPerTick(22) * 3600) };   // (je Tick 1 s ein 3.600stel)
    const pt = playerTroopMult, pc = playerCoinMult; playerTroopMult = () => 1; playerCoinMult = () => 1; skills.speed = 0;
    const hp = hourProduction('player'); renderProfile(true);
    out.grund = { hp, profil: [document.getElementById('kTroopsRate').textContent, document.getElementById('kCoinsRate').textContent],
      label: document.getElementById('kTroopsRate').parentNode.innerText, kommt: stunde(3600000 / productionTickMs()) };
    // eine Stunde in Sekunden-Takten (wie im Spiel: jeder Tick ein Bruchteil – der Rest wartet bis zur nächsten ganzen Truppe)
    prodCarry.coins = 0; prodCarry.troops = {}; const t0 = meine(), c0 = coins; for (let i = 0; i < 3600; i++) produceTicks(1);
    out.takte = { troops: meine() - t0, coins: coins - c0 };
    // Basis-Fenster: „/ Std.“ mit dem Wert dieser einen Basis
    openIslandPopup(zweite); out.fenster = [...document.querySelectorAll('#popupStats .bw-wert')].map(e => e.querySelector('img').getAttribute('src').replace(/^.*\/|\.webp$/g, '') + ' ' + e.textContent.trim()).join(' | '); closePanel(popup);   // (Werte als Bild + Zahl)
    // 2) Fähigkeit „Geschwindigkeit“ (kürzere Ticks): mehr pro Stunde – Profil und Ankunft gleich
    skills.speed = 10; const ms = productionTickMs(), n = Math.round(3600000 / ms), hs = hourProduction('player'); renderProfile(true);
    out.tempo = { ms, hp: hs, profil: document.getElementById('kTroopsRate').textContent, kommt: stunde(n), anteil: n * ms / 3600000 };
    skills.speed = 0; playerTroopMult = pt; playerCoinMult = pc;
    // 3) mit echten Boni (Fähigkeit Truppen, Forschung Ertrag, Ausrüstung, Titel …)
    const st0 = skills.troops, fo0 = Object.assign({}, loadCity().fo); skills.troops = 5; loadCity().fo = Object.assign({}, fo0, { w_prod: 3 });
    const hb = hourProduction('player'); renderProfile(true);
    out.boni = { hp: hb, profil: [document.getElementById('kTroopsRate').textContent, document.getElementById('kCoinsRate').textContent], kommt: stunde(3600000 / productionTickMs()), fmt: [fmtStunde(hb.troops), fmtStunde(hb.coins)] };
    skills.troops = st0; loadCity().fo = fo0;
    // 4) Tempel: Münzen und Truppen pro Stunde
    const tp = islands.find(i => i.type === 'temple'); out.tempel = templeBonusLine(tp).replace(/<[^>]+>/g, ''); out.tempelMult = templeBaseMult(tp) * templeHoldMultiplier(tp.id) * shrineMult('player');
    // 5) Hauptstadt: Holz/Stein/Eisen pro Stunde (Holzfäller Stufe 20) – kommt genau so an
    const c = loadCity(), alt = c.levels.lumber; c.levels.lumber = 0; const burg = AUF.rohStunde('player').h;
    out.klein = { burg, burgText: fmtStunde(burg), f: [fmtStunde(.04), fmtStunde(.004), fmtStunde(1.25), fmtStunde(150.4)] };   // (kleine Werte nicht als 0)
    c.levels.lumber = 20; const rs = AUF.rohStunde('player'), r0 = Object.assign({}, AUF.rohVon('player'));
    produceTicks(3600000 / productionTickMs()); const r1 = AUF.rohVon('player'); out.roh = { rs, kam: { h: r1.h - r0.h, s: r1.s - r0.s, e: r1.e - r0.e } }; c.levels.lumber = alt;
    // 6) Mitspieler: genau die gleiche Rechnung (eigener Takt, eigene Boni) – eine Stunde
    const X = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).id, own = botOwnedIslands[X];
    const frei = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id)); own.add(frei.id); islandLevels[frei.id] = 30; islandTroops[frei.id] = 1000; ownVer++;   // (zwei Basen)
    const bt0 = [...own].reduce((a, id) => a + (islandTroops[id] || 0), 0), bc0 = botCoins[X] || 0, bhp = hourProduction(X), bms = botTickMs(X);
    delete botProdCarry[X]; produceTicks(Math.round(3600000 / productionTickMs()));
    out.bot = { hp: bhp, troops: [...own].reduce((a, id) => a + (islandTroops[id] || 0), 0) - bt0, coins: (botCoins[X] || 0) - bc0, anteil: Math.floor(3600000 / bms) * bms / 3600000 };
    // 7) Saison-Ende: Sonntag 18 Uhr in Berlin (das Gerät steht auf Los Angeles), Sommer- und Winterzeit
    const B = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    out.saison = [Date.UTC(2026, 9, 5, 20), Date.UTC(2026, 7, 31, 10), Date.UTC(2027, 1, 1, 16, 59), Date.UTC(2026, 11, 20, 23, 30), Date.UTC(2027, 4, 2, 17, 30)].map(ab => {
      const e = saisonEnde(ab); return { ab: new Date(ab).toISOString(), ende: B.format(new Date(e)), tage: (e - ab) / 864e5 }; });
    out.ortszeit = new Date().getTimezoneOffset();
    return out;
  });
  console.log(JSON.stringify(r));
  const G = r.grund, fmtN = n => n.toLocaleString('de-DE'), JT = r.je.t, JC = r.je.c, ST = 2 * JT, SC = 2 * JC;
  ok(JT === 282 && JC === 188000, 'ein Turm Stufe 22: 282 Truppen (15 × 1,15^21) und 188.000 Münzen pro Stunde', r.je);
  ok(Math.round(G.hp.troops) === ST && Math.round(G.hp.coins) === SC && G.profil[0] === '+' + fmtN(ST) && G.profil[1] === '+' + fmtN(SC), 'Profil: 2 Türme je ' + JT + ' Truppen/' + fmtN(JC) + ' Münzen pro Stunde → +' + fmtN(ST) + ' / +' + fmtN(SC), G);
  ok(/Std\./.test(G.label) && !/Tick/.test(G.label), 'Profil sagt „Truppen / Std.“ (nicht mehr „/ Tick“)', G.label);
  ok(G.kommt.troops === ST && G.kommt.coins === SC, 'eine Stunde: genau ' + ST + ' Truppen und ' + fmtN(SC) + ' Münzen kommen an', G.kommt);
  ok(r.takte.troops === ST && r.takte.coins === SC, 'eine Stunde in 3.600 Sekunden-Takten: genau so viel (nichts geht verloren)', r.takte);
  ok(new RegExp('ui_res_truppen \\+' + JT + '\\/Std\\.').test(r.fenster) && new RegExp('ui_res_muenzen \\+' + fmtN(JC).replace('.', '\\.') + '\\/Std\\.').test(r.fenster) && !/\/ s\b/i.test(r.fenster), 'Basis-Fenster: Münz-/Truppen-Symbol mit „+Wert/Std.“ der Basis', r.fenster);
  const T = r.tempo, sollT = T.hp.troops * T.anteil;
  ok(T.ms === 600 && Math.round(T.hp.troops) === Math.round(ST * 1000 / 600) && T.profil === '+' + Math.round(T.hp.troops) && T.kommt.troops <= sollT && sollT - T.kommt.troops < 2, 'Geschwindigkeit (Tick 0,6 s): Profil zeigt mehr pro Stunde – genau das kommt an (je Basis wartet höchstens der Bruchteil einer Truppe)', T);
  const O = r.boni;
  ok(O.profil[0] === '+' + O.fmt[0] && O.profil[1] === '+' + O.fmt[1] && O.hp.troops > ST && O.hp.coins > SC && Math.abs(O.kommt.troops - O.hp.troops) < 2 && Math.abs(O.kommt.coins - O.hp.coins) < 1, 'mit Boni: was im Profil steht, kommt in einer Stunde an (±1)', O);
  ok(/pro Stunde/.test(r.tempel) && !/Tick/.test(r.tempel) && r.tempel.includes('+' + fmtN(Math.round(15000 * r.tempelMult)) + ' Münzen') && r.tempel.includes('+' + Math.round(6 * r.tempelMult) + ' Truppen pro Stunde'), 'Tempel: Münzen und Truppen pro Stunde', r.tempel);
  const R = r.roh;
  ok(['h', 's', 'e'].every(k => Math.abs(R.kam[k] - R.rs[k]) <= 1) && R.rs.h > 5e4 && R.rs.h < 1e6, 'Hauptstadt: Holz/Stein/Eisen pro Stunde wie angezeigt (RoK-Größe, × ROH_FAKTOR) (Holzfäller 20: ' + Math.round(R.rs.h) + ' Holz/Std.)', R);
  const K = r.klein;
  ok(K.f.join('|') === '0,04|0|1,3|150' && K.burg > 30 && K.burg < 150 && K.burgText === String(Math.round(K.burg * 10) / 10).replace('.', ','), 'kleine Erträge: unter 1 mit zwei Nachkommastellen, nur die Burg ' + K.burgText + ' Holz/Std. (75 × Landschaft)', K);
  const M = r.bot;
  ok(Math.abs(M.troops - M.hp.troops * M.anteil) <= 2 && Math.abs(M.coins - M.hp.coins * M.anteil) <= 2 && M.hp.troops > 0, 'Mitspieler: eine Stunde bringt genau seine Produktion pro Stunde', M);
  ok(r.ortszeit !== -60 && r.ortszeit !== -120 && r.saison.every(s => s.ende === 'So., 18:00' && s.tage >= 56 - 1 / 12 && s.tage < 63), 'Saison-Ende: immer Sonntag 18:00 deutscher Zeit (Gerät in Los Angeles, Sommer-/Winterzeit)', r.saison);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
