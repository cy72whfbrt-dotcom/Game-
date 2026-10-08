// Zahlen an RoK (Alexander 7.10., rokzahlen.md): Burg-Tempo (Saison 1 ≈ Burg 16–18, Burg 25 erst nach mehreren Saisons),
// Burg-/Gebäude-Kosten aus Spieler-Sicht, Krankenhaus bis 40, Rohstoff-Gebäude 1,33, Lager, Schild (700 mit „Wirklich?“),
// Thron-Shop-Mindestmengen, Ausrüstung grau 1 = 1 %, Zerlegen 6 Punkte, Tagesboss-Klassen relativ, Spähbericht-Schutz, Truppen/Std.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined', null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const o = {}, T = 86400, sum = (a, z) => { let s = 0; for (let L = a; L < z; L++) s += cityTimeRoh('keep', L); return s; };
    o.zeit = { z2: cityTimeRoh('keep', 1), bis10: sum(1, 10) / 3600, bis18: sum(1, 18) / T, bis25: sum(1, 25) / T, z25: cityTimeRoh('keep', 24) / T, gleich: AUF.burgZeitRoh(15) === cityTimeRoh('keep', 15) };
    const k = L => AUF.stadtKosten('keep', L);
    o.burg = { b2: k(1), b5: k(4), b25: k(24) };
    let steigt = true; for (let L = 2; L < 25; L++) for (const x of ['c', 'h', 's', 'e']) if (!(k(L)[x] > k(L - 1)[x])) steigt = false;
    o.steigt = steigt;
    const g = AUF.stadtKosten('academy', 9), bk = k(9);
    o.geb = { h: g.h / bk.h, c: g.c / bk.c, t: cityTimeRoh('academy', 15) / cityTimeRoh('keep', 15), erst: cityTimeRoh('academy', 0), t25: cityTimeRoh('academy', 24) / T };
    o.kh = { c40: AUF.stadtKosten('hospital', 39).c, c25: AUF.stadtKosten('hospital', 24).c, t40: cityTimeRoh('hospital', 39) / T };
    o.roh = [AUF.rohJeStunde ? 1 : 0, Math.round(rohGebStunde(25) / rohGebStunde(24) * 100) / 100];
    o.lager = [1, 4, 10, 25].map(L => [barbTroopsOf(L), lagerMuenzen(L)]);
    o.schild = [SHIELD_PRICES[2], SHIELD_PRICES[8], SHIELD_PRICES[24]];
    o.thron = [throneAmount('player', 'coins') >= 20000, throneAmount('player', 'troops') >= 2000];
    o.gear = [itemPct({ rarity: 0, level: 1 }), salvagePoints({ rarity: 0, level: 1 })];
    o.truppen = [troopsPerTick(1) * 3600, troopsPerTick(10) * 3600];
    o.texte = [SKILL_DEFS.attackGold.name, SKILL_DEFS.defenseGold.name, HERO_FX_TXT.gold(5)];
    o.muenzTxt = /Münzen/.test(beuteText({ loot: 1000 }));
    return o;
  });
  ok(r.zeit.z2 === 10, 'Burg 1 → 2 dauert 10 s', r.zeit);
  ok(r.zeit.bis10 <= 24, 'Burg 10 am ersten Tag (Grundzeit ≤ 24 Std.)', r.zeit.bis10);
  ok(r.zeit.bis18 <= 56, 'Burg-Tempo: Summe Bauzeit bis Burg 18 ≤ 56 Tage (eine Saison)', r.zeit.bis18);
  ok(r.zeit.bis25 > 56 * 3, 'Burg-Tempo: Burg 25 erst nach mehreren Saisons (> 56 Tage, Ziel ~4 Saisons)', r.zeit.bis25);
  ok(r.zeit.z25 === 45 && r.zeit.gleich, 'Burg 24 → 25: 45 Tage, aufbau.js nimmt dieselbe Tabelle', r.zeit);
  ok(r.burg.b2.h === 1000 && r.burg.b2.c >= 1000 && r.burg.b2.c <= 1200, 'Burg 2 kostet 1.000 Holz, ~1.100 Münzen', r.burg.b2);
  ok(r.burg.b5.h >= 5000 && r.burg.b5.h <= 6000, 'Burg 5: ~5.400 Holz', r.burg.b5);
  ok(r.burg.b25.h >= 100e6 && r.burg.b25.h <= 120e6, 'Burg 25: ~110 Mio. Holz (vorher 5,6 Mrd.)', r.burg.b25);
  ok(r.steigt, 'Burg-Kosten steigen jede Stufe (Münzen, Holz, Stein, Eisen)');
  ok(Math.abs(r.geb.h - .3) < .03 && Math.abs(r.geb.c - .3) < .03 && Math.abs(r.geb.t - .15) < .001, 'Gebäude: 30 % Kosten, 15 % Zeit der Burg gleicher Stufe', r.geb);
  ok(r.geb.erst === 10 && r.geb.t25 > 6 && r.geb.t25 <= 7, 'Gebäude: Stufe 1 in 10 s, 24 → 25 ≈ 6,8 Tage', r.geb);
  ok(r.kh.c40 < 1e9 && r.kh.c40 > r.kh.c25 && r.kh.t40 <= 7, 'Krankenhaus 40: unter 1 Mrd. Münzen (× 1,15 je Stufe), höchstens 7 Tage', r.kh);
  ok(r.roh[1] === 1.33, 'Rohstoff-Gebäude: + 33 % je Stufe', r.roh);
  ok(JSON.stringify(r.lager.map(x => x[0])) === JSON.stringify([500, 1400, 12000, 2300000]) && r.lager[0][1] === 30000 && r.lager[2][1] === 106000 && r.lager[3][1] === 859000, 'Lager: 500 / 1.400 / 12.000 / 2,3 Mio. Krieger, feste Münzen 30K / 106K / 859K', r.lager);
  ok(JSON.stringify(r.schild) === '[80,300,700]', 'Schild: 80 / 300 / 700 Edelsteine', r.schild);
  ok(r.thron[0] && r.thron[1], 'Thron-Shop: mind. 20.000 Münzen bzw. 2.000 Truppen', r.thron);
  ok(Math.abs(r.gear[0] - 1.05) < 1e-9 && r.gear[1] === 6, 'Ausrüstung grau 1 ≈ 1 %, Zerlegen 6 Punkte', r.gear);
  ok(r.truppen[0] === 15 && r.truppen[1] > 45, 'Truppen aus Basen: 15 / Std. auf Stufe 1, wächst mit der Stufe', r.truppen);
  ok(r.texte.every(t => !/Gold/.test(t) && /Münzen/.test(t)) && r.muenzTxt, '„Münzen“ statt „Gold“ in Fähigkeiten/Beute', r.texte);
  // Schild 700: erst „Wirklich?“, erst der zweite Tipp zahlt
  const s = await p.evaluate(async () => {
    gems = 5000; updateHud();
    const bt = document.querySelector('[data-shield="24"]'), vor = gems, st0 = shieldStock()[24] || 0;
    bt.click(); const nachEins = gems, armed = bt.classList.contains('is-armed') || /Wirklich/.test(bt.textContent);
    await new Promise(r => setTimeout(r, 600)); bt.click();
    return { preis: bt.textContent.trim(), vor, nachEins, armed, nach: gems, stock: (shieldStock()[24] || 0) - st0 };
  }).catch(e => ({ err: String(e) }));
  ok(s.nachEins === s.vor && s.armed && s.vor - s.nach === 700 && s.stock === 1, 'Schild 24 Std.: „Wirklich?“, dann 700 Edelsteine, einmal im Vorrat', s);
  // Spähbericht: Holz/Stein/Eisen gegen den Rohstoff-Schutz (10.000 auf Burg 1), nicht gegen den Münzen-Schutz
  const sp = await p.evaluate(() => {
    const now = Date.now(), d = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size), T = [...botOwnedIslands[d.id]][0];
    resolveScout({ sourceId: playerIslandId, targetId: T, startedAt: now - 2000, resolveAt: now - 1 });
    const e = combatLog.find(x => x.type === 'scout' && x.targetId === T && x.spy); if (!e) return { fehlt: 1 };
    e.spy.auf = Object.assign(e.spy.auf || {}, { roh: { schutz: 5556, schutzR: 10000, c: 3000, h: 8000, s: 20000, e: 0 } });
    closeAllPopups(); battleLogBtn.click(); const row = [...combatLogListEl.children][combatLog.indexOf(e)];
    return { text: row ? row.textContent.replace(/\s+/g, ' ') : '', R: AUF.burgSchutzRoh('player', 1), B: AUF.burgSchutz('player', 1) };
  });
  const st = (sp.text || '').match(/Stein[^A-Z]*/) || [''];
  ok(/Burg schützt 5\.600 Münzen · 10\.000 je Rohstoff/.test(sp.text) && /1\.000 zu holen/.test(st[0]) && !/\bGold\b/.test(sp.text) && sp.R > sp.B,
    'Spähbericht: Holz/Stein/Eisen gegen den Rohstoff-Schutz (10.000), Münzen gegen 5.600', { st: st[0], t: (sp.text || '').slice(-300) });
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
