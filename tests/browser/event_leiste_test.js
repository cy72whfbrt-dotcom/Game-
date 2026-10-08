// Events neu (Merkliste 33, Alexander 7.10.): Wochen-Event Preise bis Platz 1000, Invasion/Drache/Lager als Belohnungs-Leiste
// (jede erreichte Stufe sofort im Abholfach, nie doppelt), Drache: Treffer zählt nur mit mind. 10 % der Truppen, Tagesboss: je Angriff
// die Belohnung seiner Schadens-Klasse + „Boss fällt“ für alle (keine Platz-Preise), Lager: je Stufe einmal am Tag. Mitspieler gleich,
// echte Spieler bekommen Münzen/Truppen als Nachricht (Gutschrift). Abholen im Event-Fenster. Fotos in process.argv[3], wenn angegeben.
// Kurze Handys (Fotos 8.10.): Pass – Premium-Reihe ganz im Fenster; Lager – die Stufen-Leiste beim Blättern nie halb verdeckt.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), bilder = process.argv[3];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const out = {}, now = Date.now(), bot = BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id]), bs = () => loadBotState()[bot.id];
    inboxState = []; inboxSave();
    const fach = k => inboxList().filter(x => x.k === k);
    // Wochen-Event: 6 Stufen bis Platz 1000
    out.wo = [WO_PRIZES.length, WO_PRIZES.find(x => 1 <= x.to).gems, WO_PRIZES.find(x => 3 <= x.to).gems, WO_PRIZES.find(x => 50 <= x.to).gems, WO_PRIZES.find(x => 1000 <= x.to).gems, !WO_PRIZES.find(x => 1001 <= x.to)];
    // Invasion: 55 Punkte → Stufe 20 und 50; nochmal rechnen → nichts doppelt; Mitspieler direkt (Gems + Münzen)
    const g0 = bs().gems || 0, c0 = botCoins[bot.id] || 0;
    const I = evState.inv = { start: now - 1000, end: now + 3e6, welle: 1, n: 0, armies: [], pts: {}, wehr: {}, paid: false };
    invPunkteDazu(I, 'player', 55); invPunkteDazu(I, bot.id, 25); invLeiste(I, 'player');
    out.inv = [fach('inv|' + I.start + '|0').length, fach('inv|' + I.start + '|1').length, fach('inv|' + I.start + '|2').length, I.lst.player, (bs().gems || 0) - g0, (botCoins[bot.id] || 0) > c0];
    out.invMuenzen = fach('inv|' + I.start + '|0')[0] && fach('inv|' + I.start + '|0')[0].coins > 0;
    invAuszahlen(); out.invEnde = inboxList().filter(x => x.src === 'inv').length;
    // Drache: zu wenige Truppen → kein Treffer; genug → Treffer + Stufe 1; fällt er: nur wer traf
    const D = evState.dr = Object.assign(drNeu({ start: now - 1000, end: now + 3e6 }), { hp: 1e12, max: 1e12 });
    const base = [...ownedIslands][0]; islandTroops[base] = 100000;
    const send = n => { barbSend('player', base, 'd', null, n, null); const m = barbMarches[barbMarches.length - 1]; barbMarches = barbMarches.filter(x => x !== m); return m; };
    const klein = send(500), gross = send(20000);
    out.drVoll = [klein.voll, gross.voll];
    drTreffer(klein, Date.now()); out.drKlein = (D.tr || {}).player || 0;
    drTreffer(gross, Date.now()); out.drGross = [(D.tr || {}).player, fach('drache|' + D.start + '|0').length];
    D.dmg[bot.id] = 5; D.hp = 0; drAuszahlen(true); out.drFall = [fach('drache|' + D.start + '|fall').length, inboxList().filter(x => x.src === 'drache').length];
    // Tagesboss: zweimal Klasse 1 = zweimal Belohnung, Klasse nach Schaden; Boss fällt: alle, die trafen – keine Platz-Preise
    const B = dbossEnsure(); B.kl = {};
    // Klassen als Anteil vom Boss-Leben (7.10.): bis 0,05 % / 0,5 % / 1 % / 2,5 % / darüber
    out.klasse = [dbossKlasse(1, 1e6), dbossKlasse(500, 1e6), dbossKlasse(501, 1e6), dbossKlasse(2e4, 1e6), dbossKlasse(5e4, 1e6)];
    const max0 = B.max; B.max = 1e6; dbossKlasseZahlen(B, 'player', 300); dbossKlasseZahlen(B, 'player', 400); dbossKlasseZahlen(B, 'player', 5e4); B.max = max0;
    out.boss = [B.kl.player.join(), inboxList().filter(x => x.src === 'boss').length];
    B.dmg = { player: 2000, [bot.id]: 10 }; dbossPayout(B);
    out.bossFall = [fach('boss|' + B.d + '|fall').length, inboxList().filter(x => x.src === 'boss' && /Platz/.test(x.title)).length];
    // Lager: je Stufe einmal am Tag, am nächsten Tag wieder; zusammen 210 Edelsteine
    const rec = barbRec('player'); rec.s = 0;
    out.lager = [lagerStufeZahlen('player', 3), lagerStufeZahlen('player', 3), fach('lager|' + rec.d + '|3').length];
    rec.d = 'gestern'; barbRec('player'); out.lagerNeu = lagerStufeZahlen('player', 3);
    out.lagerGems = LAGER_LEISTE.reduce((a, x) => a + (x.gems || 0), 0);
    out.lagerArt = [LAGER_LEISTE[5].mh, LAGER_LEISTE[6].th, LAGER_LEISTE[20].sh, LAGER_LEISTE[24].crate];
    // echter Spieler: der Preis geht als Nachricht – mit Münzen/Truppen und Schlüssel
    const msg = [], w0 = window.WELT; botById[bot.id].mensch = true;
    window.WELT = new Proxy({}, { get: (o, k) => k === 'nachricht' ? (uid, e, schl) => msg.push({ e, schl }) : k === 'wache' ? undefined : () => [] });
    try { evPreis(bot.id, 'inv', 'Test', INV_LEISTE[3], 'x|3'); } finally { window.WELT = w0; botById[bot.id].mensch = false; }
    out.mensch = msg[0] && [msg[0].e.coins > 0, msg[0].e.tr > 0, msg[0].e.k, msg[0].schl];
    return out;
  });
  ok(r.wo.join() === '6,250,150,30,10,true', 'Wochen-Event: 6 Stufen (250 · 150 · … · 10), ab Platz 1001 nichts', r.wo);
  ok(r.inv.join() === '1,1,0,2,5,true' && r.invMuenzen, 'Invasion: 55 Punkte → Stufe 20 + 50 im Abholfach (je einmal), Mitspieler direkt (Gems + Münzen)', r.inv);
  ok(r.invEnde === 2, 'Invasion zu Ende: keine Extra-Preise, nichts doppelt', r.invEnde);
  ok(r.drVoll.join() === 'false,true' && r.drKlein === 0, 'Drache: unter 10 % der Truppen zählt kein Treffer', [r.drVoll, r.drKlein]);
  ok(r.drGross.join() === '1,1', 'Drache: Treffer mit genug Truppen → Stufe 1 der Leiste', r.drGross);
  ok(r.drFall.join() === '1,2', 'Drache gefallen: Belohnung für alle mit Treffer, keine Platz-Preise', r.drFall);
  ok(r.klasse.join() === '0,0,1,3,4', 'Tagesboss: Klasse nach Schaden', r.klasse);
  ok(r.boss[0] === '2,0,0,0,1' && r.boss[1] === 3, 'Tagesboss: je Angriff eine Belohnung, zweimal Klasse 1 = zweimal', r.boss);
  ok(r.bossFall.join() === '1,0', 'Tagesboss fällt: Belohnung für alle, keine Platz-Preise mehr', r.bossFall);
  ok(r.lager.join() === 'true,false,1' && r.lagerNeu === true, 'Lager: Stufe einmal am Tag, am nächsten Tag wieder', [r.lager, r.lagerNeu]);
  ok(r.lagerGems === 210 && r.lagerArt.join() === '2,1,2,3', 'Lager: 210 Edelsteine über 25 Stufen, Münzen/Truppen abwechselnd', [r.lagerGems, r.lagerArt]);
  ok(r.mensch && r.mensch.join() === 'true,true,inv|x|3,inv|x|3', 'Echter Spieler: Münzen + Truppen + Schlüssel in der Nachricht', r.mensch);
  // Abholen im Event-Fenster: leuchtet → Abholen → Haken; Münzen kommen an
  await p.evaluate(() => openGoals('inv')); await p.waitForTimeout(600);
  const v = await p.evaluate(() => { const L = document.querySelectorAll('#eventBody .evl-k').length, hol = document.querySelectorAll('#eventBody .evl-k.is-hol').length, c0 = coins;
    const k = document.querySelector('#eventBody .evl-z [data-ev-hol]'); k.click(); const bf = document.getElementById('beuteFenster'); if (bf) bf.remove();
    return { L, hol, mehr: coins > c0, ok: document.querySelectorAll('#eventBody .evl-k.is-ok').length, text: /undefined|NaN/.test(document.getElementById('eventBody').innerText) }; });
  ok(v.L === 6 && v.hol === 2 && v.mehr && v.ok === 1 && !v.text, 'Leiste: 6 Kisten, 2 leuchten, Abholen gibt Münzen, danach Haken', v);
  for (const t of ['boss', 'lager', 'drache']) {
    await p.evaluate(t => openGoals(t), t); await p.waitForTimeout(500);
    const w = await p.evaluate(() => { const e = document.getElementById('eventBody'); return { breit: e.scrollWidth <= e.clientWidth + 1, text: /undefined|NaN/.test(e.innerText), n: e.querySelectorAll('.evl-z').length }; });
    ok(w.breit && !w.text && w.n >= 5, 'Reiter ' + t + ': passt aufs Handy, keine kaputten Werte', w);
    if (bilder) await p.screenshot({ path: path.join(bilder, 'event_' + t + '.png') });
  }
  // Invasions-Chip (Merkliste 28): nie „P.“, bei 0 Punkten keine Zahl, sonst „… Punkte“
  const chip = await p.evaluate(() => { const now = Date.now(), I = evState.inv = { start: now - 1000, end: now + 3e6, welle: 1, n: 0, armies: [], pts: {}, wehr: {}, paid: false };
    const t = () => (evChips(Date.now()).find(c => /ev-inv/.test(c[1])) || [0, ''])[1].replace(/<[^>]+>/g, ' ');
    const null_ = t(); I.pts.player = 1234; return [null_, t()]; });
  ok(!/P\./.test(chip.join()) && !/\d/.test(chip[0].replace(/Welle \d\/\d/, '')) && /1\.234 Punkte/.test(chip[1]), 'Invasions-Leiste: keine „0 P.“, sonst „1.234 Punkte“', chip);
  for (const [w, h] of [[430, 736], [375, 667]]) {
    await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => { closeAllPopups(); openGoals('pass'); }); await p.waitForTimeout(700);
    const q = await p.evaluate(() => { const pb = goalsPopup.querySelector('.pbody').getBoundingClientRect(), pr = document.querySelector('#passPane .pass-prem').getBoundingClientRect();
      return { pb: Math.round(pb.bottom), prem: Math.round(pr.bottom), oben: Math.round(pr.top) >= Math.round(pb.top) }; });
    ok(q.prem <= q.pb + 1 && q.oben, 'Pass ' + w + '×' + h + ': Premium-Reihe ganz im Fenster (ohne Blättern)', q);
    if (bilder) await p.screenshot({ path: path.join(bilder, 'pass_' + w + 'x' + h + '.png') });
  }
  await p.evaluate(() => { closeAllPopups(); openGoals('lager'); }); await p.waitForTimeout(700);
  const lg = await p.evaluate(async () => { const pb = goalsPopup.querySelector('.pbody'), l = document.querySelector('#eventBody .evl'), y0 = l.getBoundingClientRect().top - pb.getBoundingClientRect().top;
    pb.scrollTop = y0 + 40; await new Promise(f => setTimeout(f, 200));
    const a = pb.getBoundingClientRect(), r = l.getBoundingClientRect(), z = document.querySelector('#eventBody .evl-zeilen').getBoundingClientRect();
    return { blaettern: pb.scrollTop > 0, ganz: r.top >= a.top - 1 && r.bottom <= a.bottom, zeilenDarunter: z.top < r.bottom, bg: getComputedStyle(l).backgroundColor !== 'rgba(0, 0, 0, 0)' }; });
  ok(lg.blaettern && lg.ganz && lg.bg, 'Lager 375×667 geblättert: Stufen-Leiste bleibt ganz oben stehen (deckend, nicht halb verdeckt)', lg);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'lager_geblaettert.png') });
  ok(!fe.length, 'keine Fehler auf der Seite', fe.slice(0, 3));
  await b.close();
})();
