// Wochen-Event neu (Alexander 8.10., Vorgabe werkzeuge/wochenevent): Mo Bauherr · Di Krieger · Mi Sammeln · Do Boss-Jagd · Fr Helden-Tag,
// nur das Tages-Event zählt, 5 Tages-Kisten (bis Tagesende im Event, danach im Abholfach), Wochen-Rangliste mit Auswertung Fr 20 Uhr,
// Barbaren-Lager mit festen Münzen + Schlüsseln bis zur Tagesgrenze (Tote dort zählen nicht für den Krieger-Tag), Tagesboss nur donnerstags,
// Chips mit grünem/grauem Punkt; Invasion, Drache, alte Themen-Woche und Wochenkette sind weg. Handy-Fotos in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
const TAG = d => new Date(2026, 9, 12 + d, 10, 0, 0).getTime();   // Mo 12.10.2026 + d Tage, 10 Uhr (Ortszeit)
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), bilder = process.argv[3];
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await ctx.clock.install({ time: TAG(0) });
  const p = await ctx.newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(2000);
  const zu = () => p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } const bf = document.getElementById('beuteFenster'); if (bf) bf.remove(); });
  await zu();
  // Montag: Bauherr zählt, Krieger nicht; Kisten bei 1.000 / 3.000 bis Mitternacht nur im Event
  const mo = await p.evaluate(() => {
    inboxState = []; inboxSave(); evState.wo = {}; woWinMemo = null;
    const bot = BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id]), bs = loadBotState()[bot.id], g0 = bs.gems || 0, e0 = bs.eventMuenzen || 0;
    evPunkte('bau', 'player', 3500); evPunkte('krieg', 'player', 5000); evPunkte('bau', bot.id, 1200); evPunkte('bau', 'player', 0);
    const W = evState.wo, L = inboxList().filter(x => x.src === 'woche');
    return { heute: woHeute().k, tp: W.tp.player.join(), n: L.length, k: L.map(x => x.k).sort().join(), bis: L.every(x => x.bis > Date.now()), fach: inboxFach().filter(x => x.src === 'woche').length,
      felder: L.map(x => [x.em, x.gems, x.besch]).sort().join('|'), bot: [(loadBotState()[bot.id].gems || 0) - g0, (loadBotState()[bot.id].eventMuenzen || 0) - e0], ende: woWin().end === new Date(2026, 9, 16, 20).getTime() };
  });
  ok(mo.heute === 'bau' && mo.tp === '3500,0,0,0,0', 'Montag: nur Bauherr zählt (Krieger-Punkte am Montag nicht)', mo);
  ok(mo.n === 2 && /woche\|.*\|0\|0/.test(mo.k) && /\|0\|1$/.test(mo.k) && mo.bis && mo.fach === 0, 'Montag: 3.500 P. → Kisten 1.000 + 3.000, bis Mitternacht nur im Event', mo);
  ok(mo.felder === '100,20,15m|50,10,5m', 'Tages-Kisten: Event-Münzen + Edelsteine + Beschleuniger (ZAHLEN_WOCHE)', mo.felder);
  ok(mo.bot.join() === '10,50', 'Mitspieler: Kiste 1.000 sofort (10 Edelsteine, 50 Event-Münzen)', mo.bot);
  ok(mo.ende, 'Woche endet Freitag 20 Uhr', mo.ende);
  // Fenster: Chips Woche + Lager mit grünem Punkt, Tag-Leiste 6 Felder, 5 Kisten (2 leuchten), Abholen gibt die Sachen
  await p.evaluate(() => openGoals('tour')); await p.waitForTimeout(600);
  const f = await p.evaluate(() => { const e = document.getElementById('eventBody'), chips = [...document.querySelectorAll('#goalsTabs [data-ggrp-von="ereignisse"]')].map(c => c.dataset.gtab);
    return { chips: chips.join(), an: document.querySelector('[data-gtab="tour"] .ev-st').classList.contains('an'), tage: e.querySelectorAll('.wo-tage > button').length, jetzt: e.querySelector('.wo-tage .jetzt b').textContent,
      kisten: e.querySelectorAll('.evl-k').length, hol: e.querySelectorAll('.evl-k.is-hol').length, kachel: e.querySelectorAll('.evl-z .bk').length, kaputt: /undefined|NaN/.test(e.innerText), breit: e.scrollWidth <= e.clientWidth + 1 }; });
  ok(!/inv|drache|boss/.test(f.chips) && /tour/.test(f.chips) && /lager/.test(f.chips) && f.an, 'Chips: Woche + Lager (grüner Punkt = läuft), Invasion/Drache/Boss weg', f);
  ok(f.tage === 6 && f.jetzt === 'Mo' && f.kisten === 5 && f.hol === 2 && f.kachel >= 15 && !f.kaputt && f.breit, 'Fenster: Mo–Fr + Rangliste, 5 Kisten (2 leuchten), Belohnung als Kacheln', f);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'woche_mo.png') });
  const hol = await p.evaluate(() => { const em0 = eventMuenzen, b0 = besch['5m'] || 0; document.querySelector('#eventBody .evl-k.is-hol').click();
    const bf = document.getElementById('beuteFenster'), da = !!bf && !bf.hidden; if (bf) bf.remove();
    return { da, rest: inboxList().filter(x => x.src === 'woche').length, ok: document.querySelectorAll('#eventBody .evl-k.is-ok').length, gem: [eventMuenzen - em0, (besch['5m'] || 0) - b0].join() }; });
  ok(hol.rest === 1 && hol.ok === 1 && hol.gem === '50,1', 'Abholen: Kiste geht auf (Haken), Event-Münzen/Beschleuniger gutgeschrieben', hol);
  // Dienstag: Krieger zählt; die Montags-Kiste liegt jetzt im Abholfach; Lager-Tote zählen nicht
  await p.clock.setSystemTime(TAG(1)); await p.waitForTimeout(300); await zu();
  const di = await p.evaluate(() => {
    evPunkte('krieg', 'player', 1500); evPunkte('bau', 'player', 9999);
    const fach = inboxFach().filter(x => x.src === 'woche').length, base = [...ownedIslands][0]; islandTroops[base] = 1e9;
    const rec = barbRec('player'); rec.b = 25; const c = { id: 'ct', x: islandById[base].x + 500, y: islandById[base].y, lm: islandById[base].landmassId, L: 12, t: 100, max: 100, until: Date.now() + 1e7 }; barbState.camps.push(c);
    const g0 = inboxList().filter(x => x.src === 'fight').reduce((a, x) => a + (x.coins || 0), 0);
    barbArrive({ who: 'player', homeId: base, k: 'c', tid: 'ct', L: 12, x: c.x, y: c.y, lm: c.lm, troops: 1e6, startedAt: Date.now() - 1000, resolveAt: Date.now(), back: false }, Date.now());
    const coins = inboxList().filter(x => x.src === 'fight').reduce((a, x) => a + (x.coins || 0), 0) - g0, key = inboxList().filter(x => x.src === 'lager');
    return { tp: evState.wo.tp.player.join(), fach, coins, soll: lagerMuenzen(12), k1: rec.k1, schl: key.map(x => x.s1).join() };
  });
  ok(di.tp === '3500,1500,0,0,0', 'Dienstag: Krieger zählt, Lager-Tote zählen nicht, Bauherr nicht mehr', di);
  ok(di.fach === 1, 'nicht abgeholte Montags-Kiste liegt jetzt im Abholfach', di.fach);
  ok(di.coins === di.soll && di.soll === 140000 && di.k1 === 1 && di.schl === '1', 'Lager Stufe 12: feste 140K Münzen + 1 Schlüssel', di);
  const grenze = await p.evaluate(() => { const rec = barbRec('player'); rec.m = 2.45e6; rec.k1 = 3; const r = lagerBeute('player', 20); return [r.m, r.k1, r.k2, lagerBeute('player', 25).k2, rec.m]; });
  ok(grenze.join() === '50000,0,1,0,2500000', 'Lager-Tagesgrenze: 2,5 Mio. Münzen, 3 Schlüssel, 1 epischer', grenze);
  await p.evaluate(() => openGoals('lager')); await p.waitForTimeout(500);
  const lg = await p.evaluate(() => { const e = document.getElementById('eventBody'); return { grenze: e.querySelectorAll('.lg-grenze').length, zeilen: e.querySelectorAll('.evl-z').length, kaputt: /undefined|NaN/.test(e.innerText), breit: e.scrollWidth <= e.clientWidth + 1, txt: e.querySelector('.lg-heute').innerText }; });
  ok(lg.grenze === 3 && lg.zeilen === 25 && !lg.kaputt && lg.breit && /2,5/.test(lg.txt), 'Lager-Fenster: Tagesgrenze mit 3 Balken oben, 25 Stufen', lg);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'lager.png') });
  await p.evaluate(() => openGoals('tour')); await p.waitForTimeout(400); if (bilder) await p.screenshot({ path: path.join(bilder, 'woche_di.png') });
  // Mi Sammeln, Do Boss-Jagd (Boss nur donnerstags), Fr Helden-Tag
  await p.clock.setSystemTime(TAG(2)); await p.waitForTimeout(300); await zu();
  const mi = await p.evaluate(() => { evPunkte('sam', 'player', 2000); return { tp: evState.wo.tp.player[2], boss: dbossEnsure() === null && dbossOnMap() === null }; });
  ok(mi.tp === 2000 && mi.boss, 'Mittwoch: Sammeln zählt, kein Tagesboss', mi);
  await p.evaluate(() => { closeAllPopups(); openGoals('tour'); }); await p.waitForTimeout(400); if (bilder) await p.screenshot({ path: path.join(bilder, 'woche_mi.png') });
  await p.clock.setSystemTime(TAG(3)); await p.waitForTimeout(1500); await zu();
  const don = await p.evaluate(() => { const b = dbossEnsure(); evPunkte('boss', 'player', 800); return { boss: !!b && b.d === todayKey(), tp: evState.wo.tp.player[3] }; });
  ok(don.boss && don.tp === 800, 'Donnerstag: Tagesboss da, Boss-Jagd zählt', don);
  await p.evaluate(() => { closeAllPopups(); openGoals('tour'); }); await p.waitForTimeout(400);
  const dob = await p.evaluate(() => !!document.querySelector('#eventBody [data-ev-go="boss"]'));
  ok(dob, 'Donnerstag: Knopf „Zum Tagesboss“ im Wochen-Event', dob);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'woche_do.png') });
  await p.clock.setSystemTime(TAG(4)); await p.waitForTimeout(300); await zu();
  const fr = await p.evaluate(() => { questProgress('crate', 2); evPunkte('held', 'player', 100); return evState.wo.tp.player[4]; });
  ok(fr === 340, 'Freitag: Helden-Tag (2 Kisten à 120 + Helden-Stufe 100)', fr);
  await p.evaluate(() => { closeAllPopups(); openGoals('tour'); }); await p.waitForTimeout(400); if (bilder) await p.screenshot({ path: path.join(bilder, 'woche_fr.png') });
  // Rangliste (6. Feld): Uhr, Podest, Liste, eigener Platz; Umschalter Belohnungen: 6 Bänder
  await p.evaluate(() => { const bs = loadBotState(); BOT_DEFS.filter(d => bs[d.id]).slice(0, 12).forEach((d, i) => evPunkte('held', d.id, 30000 - i * 2000)); document.querySelector('#eventBody [data-wo-sicht="rang"]').click(); });
  await p.waitForTimeout(400);
  const rl = await p.evaluate(() => { const e = document.getElementById('eventBody'); return { pod: e.querySelectorAll('.wo-pod .wp').length, uhr: !!e.querySelector('.wo-uhr [data-ev-bis]'), ich: !!e.querySelector('.wo-ich li.me'), zeilen: e.querySelectorAll('.wo-rl li').length, kaputt: /undefined|NaN/.test(e.innerText), breit: e.scrollWidth <= e.clientWidth + 1 }; });
  ok(rl.pod === 3 && rl.uhr && rl.ich && rl.zeilen >= 10 && !rl.kaputt && rl.breit, 'Rangliste: Podest Top 3, Liste, eigener Platz unten, Uhr bis Fr 20 Uhr', rl);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'rangliste.png') });
  await p.evaluate(() => document.querySelector('#eventBody [data-wo-belohn="1"]').click()); await p.waitForTimeout(300);
  const bel = await p.evaluate(() => { const e = document.getElementById('eventBody'); return { baender: e.querySelectorAll('.wo-band').length, kacheln: e.querySelectorAll('.wo-rang .bk').length }; });
  ok(bel.baender === 6 && bel.kacheln >= 25, 'Belohnungen: 6 Rang-Bänder mit Kacheln (Platz 1, 2, 3, 4–10, 11–50, ab 51)', bel);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'rangliste_belohnungen.png') });
  // Fr 20 Uhr: Auswertung – jeder mit Punkten bekommt seinen Platz-Preis ins Abholfach, die Woche ist zu
  await p.clock.setSystemTime(new Date(2026, 9, 16, 20, 0, 5).getTime()); await p.waitForTimeout(2500); await zu();
  const aus = await p.evaluate(() => { const W = evState.wo, x = inboxList().find(y => y.src === 'woche' && /Wochen-Rangliste/.test(y.title));
    return { paid: !!W.paid, last: W.last && W.last.n, preis: x && [x.em, x.gems, x.s1, x.besch, !(x.bis > Date.now())], platz: W.last && W.last.me, an: woOn(), chip: document.querySelector('[data-gtab="tour"] .ev-st').classList.contains('an') }; });
  ok(aus.paid && aus.last >= 13 && aus.preis && aus.preis[4] && aus.platz > 0 && !aus.an, 'Fr 20 Uhr: Auswertung, Platz-Preis im Abholfach, Woche vorbei', aus);
  ok(!aus.chip, 'Wochenende: Chip „Woche“ grau (läuft nicht)', aus.chip);
  // Altes ist weg
  const alt = await p.evaluate(() => ['invAktiv', 'drAktiv', 'woThemaAm', 'claimChain', 'evThemaAktiv'].filter(n => typeof window[n] === 'function').concat(document.getElementById('chainCard') ? ['chainCard'] : []));
  ok(!alt.length, 'Invasion, Drache, Themen-Woche, Wochenkette sind raus', alt);
  // Pass auf kurzen Handys: Premium-Reihe ganz im Fenster (vorher in event_leiste_test)
  for (const [w, h] of [[430, 736], [375, 667]]) {
    await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => { closeAllPopups(); openGoals('pass'); }); await p.waitForTimeout(700);
    const q = await p.evaluate(() => { const pb = goalsPopup.querySelector('.pbody').getBoundingClientRect(), pr = document.querySelector('#passPane .pass-prem').getBoundingClientRect();
      return { pb: Math.round(pb.bottom), prem: Math.round(pr.bottom), oben: Math.round(pr.top) >= Math.round(pb.top) }; });
    ok(q.prem <= q.pb + 1 && q.oben, 'Pass ' + w + '×' + h + ': Premium-Reihe ganz im Fenster (ohne Blättern)', q);
  }
  ok(!fe.length, 'keine Fehler auf der Seite', fe.slice(0, 3));
  await b.close();
})();
