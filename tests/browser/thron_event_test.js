// Thron-Event (Alexander 8.10.): Sa 10 – So 22 Uhr, sonst Kuppel über Thron + Wachtürmen. Punkte alle 3 Min. (Thron 30, Wachturm 15,
// Verstärkung beim verbündeten Halter 15), Wachtürme schießen 2 % – nie aufs eigene Bündnis. So 22 Uhr Auswertung: Preise ins Abholfach,
// Platz 1 eine Woche Herrscher (Kisten verschenken, Titel). Neues Event: Rangpunkte 0, übrige Kisten verfallen. Thron-Shop ist weg.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const o = {}, echt = thronFenster, T = (d, h) => new Date(2026, 9, d, h, 0, 0).getTime();   // 10.10.2026 = Samstag
    const f1 = echt(T(10, 9)), f2 = echt(T(10, 11)), f3 = echt(T(11, 23)), f4 = echt(T(14, 12));
    o.fenster = { vorher: f1.start === T(10, 10) && f1.end === T(11, 22), laeuft: f2.start === T(10, 10) && f2.start <= T(10, 11), danach: f3.start === T(17, 10), mitte: f4.start === T(17, 10) };
    const zu = () => { thronFenster = now => ({ start: now + 864e5, end: now + 2 * 864e5 }); }, auf = (s) => { thronFenster = now => ({ start: s, end: now + 864e5 }); };
    // Kuppel: außerhalb des Events nicht angreifbar (Thron und alle 4 Wachtürme)
    zu(); const src = playerIslandId, n0 = pendingAttacks.length;
    o.kuppel = { mega: thronKuppel(megaTempleId), tuerme: guardianTempleIds.length === 4 && guardianTempleIds.every(g => thronKuppel(g)), sonst: !thronKuppel(src),
      start: launchAttack(src, megaTempleId) === false && pendingAttacks.length === n0, text: thronKuppelText() };
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    const [K, V1, V2, X] = bots, Z = megaTempleId, setze = (id, w) => { const a = islandOwnerOf(id); if (a === 'player') ownedIslands.delete(id); else if (a) botOwnedIslands[a].delete(id); if (w === 'player') ownedIslands.add(id); else if (w) botOwnedIslands[w].add(id); };
    setze(Z, K.id); islandTroops[Z] = 100000; const [g1, g2, g3, g4] = guardianTempleIds; setze(g1, V1.id); setze(g2, X.id); setze(g3, null); setze(g4, 'player');
    for (const w of [K.id, V1.id, V2.id, X.id, 'player']) if (bundVon(w)) bundOp(w, { op: 'verlassen' });
    botCoins[K.id] = 1e9; bundOp(K.id, { op: 'gruenden', name: 'Thronprobe', tag: 'THP', offen: true });
    const a = bundVon(K.id); bundOp(V1.id, { op: 'beitreten', aid: a.id }); bundOp(V2.id, { op: 'beitreten', aid: a.id }); bundRein(a, 'player'); bundSpeichern();
    verst.l = [{ id: 'vT1', w: V2.id, t: Z, n: 3000, von: botCapitalOf(V2.id), at: Date.now() }, { id: 'vT2', w: V2.id, t: Z, n: 2000, von: botCapitalOf(V2.id), at: Date.now() },
      { id: 'vT3', w: X.id, t: Z, n: 4000, von: botCapitalOf(X.id), at: Date.now() }];
    // außerhalb: keine Punkte, kein Beschuss
    const ts = throneState; ts.week = {}; throneAward(true); o.zuPunkte = Object.keys(ts.week).length; o.zuSchuss = throneVolley(1, true);
    // im Event: Punkte und Beschuss
    const start = Date.now() - 60000; auf(start); throneTick(); o.beginn = { ev: ts.ev === start, leer: Object.keys(ts.week).length === 0, kuppelWeg: !thronKuppel(Z) };
    throneAward(true); o.punkte = { K: ts.week[K.id], V1: ts.week[V1.id], V2: ts.week[V2.id], X: ts.week[X.id], ich: ts.week.player };
    o.schuetzen = throneShooters().sort(); o.soll = [g2, g3].sort();
    const t0 = islandTroops[Z], v = throneVolley(1, true); o.schuss = { loss: v && v.loss, soll: Math.floor(t0 * (1 - Math.pow(.98, 2))) };
    o.shopWeg = typeof THRONE_OFFERS === 'undefined' && typeof renderThroneShop === 'undefined' && typeof throneGive === 'undefined';
    // Auswertung So 22 Uhr (Event vorbei): Plätze, Preise, Herrscher
    ts.week = { [K.id]: 21600, player: 10800, [V1.id]: 9000, [X.id]: 450 }; if (V2) ts.week[V2.id] = 0;
    const box0 = inboxList().length, h0 = AUF.rohVon('player').h || 0, em0 = (loadBotState()[K.id].eventMuenzen || 0);
    zu(); throneTick();
    const mein = inboxList().find(x => x.src === 'thron');
    o.auswertung = { aus: ts.aus === ts.ev, herr: rulerOwner() === K.id && thronHerrscher() === K.id, kisten: JSON.stringify(ts.kisten), letzte: (ts.letzte || []).map(e => e[1]).join(','),
      meinTitel: mein && mein.title, meinB: mein && JSON.stringify(mein.b), meinCoins: mein && mein.coins > 0, neu: inboxList().length - box0, botEM: (loadBotState()[K.id].eventMuenzen || 0) - em0,
      xPreis: (loadBotState()[X.id].eventMuenzen || 0) };
    const txt = inboxClaim(mein.id, []); o.abholen = { holz: (AUF.rohVon('player').h || 0) - h0, txt, vorl: gibBelohnung.vorl ? gibBelohnung.vorl.eventMuenzen : 'Team C' };
    // Herrscher-Kisten: nicht an sich selbst, nur so viele, wie da sind
    ts.herr = { who: 'player', seit: Date.now(), bis: Date.now() + 864e5 }; ts.kisten = { episch: 1, gross: 0, aus: 2 };
    const c0 = JSON.stringify(loadBotState()[V1.id].spare || {});
    o.kiste = { selbst: herrKiste('player', 'aus', 'player'), leer: herrKiste('player', 'gross', V1.id), gut: herrKiste('player', 'episch', V1.id), danach: ts.kisten.episch,
      fremd: herrKiste(K.id, 'aus', V1.id), botBekam: JSON.stringify(loadBotState()[V1.id].spare || {}) !== c0 };
    // Titel: 4 Titel, Narr macht 5 % langsamer
    giveTitle('narr', X.id); const s1 = islandById[botCapitalOf(X.id)], s2 = islandById[playerIslandId]; const mit = travelDurationSeconds(s1, s2, X.id); giveTitle('narr', null); const ohne = travelDurationSeconds(s1, s2, X.id);
    o.titel = { keys: TITLES.map(x => x.key).join(','), narr: Math.abs(mit / ohne - 1 / .95) < 1e-6, feld: TITLES[0].v };
    // Fenster: Chip Thron, Herrscher
    openGoals('thron'); const eb = document.getElementById('eventBody').textContent;
    o.fenster2 = { titel: /Kampf um den Königsthron/.test(eb), raenge: document.querySelectorAll('#eventBody .rband').length, preis: /3\.000/.test(eb), herr: /Herrscher:/.test(eb), chip: !!goalsPopup.querySelector('[data-gtab="thron"] .ev-st') };
    openHerr(); const hb = document.getElementById('herrBody').textContent;
    o.herrFenster = { kisten: /Kisten verschicken/.test(hb), titel: document.querySelectorAll('#herrBody [data-herr-titel]').length, angelegt: /automatisch angelegt/.test(hb) };
    closeAllPopups();
    // neues Event: Rangpunkte 0, übrige Kisten verfallen, der Herrscher bleibt bis zu seinem Ende
    auf(Date.now() - 1000); throneTick(); o.neu = { leer: Object.keys(ts.week).length === 0, kisten: ts.kisten, herr: rulerOwner() === 'player' };
    thronFenster = echt; verst.l = verst.l.filter(x => !/^vT/.test(x.id));
    return o;
  });
  ok(r.fenster.vorher && r.fenster.laeuft && r.fenster.danach && r.fenster.mitte, 'Thron-Event Sa 10 – So 22 Uhr (danach das nächste Wochenende)', r.fenster);
  ok(r.kuppel.mega && r.kuppel.tuerme && r.kuppel.sonst && r.kuppel.start && /Kuppel/.test(r.kuppel.text), 'Kuppel: Thron + 4 Wachtürme außerhalb nicht angreifbar', r.kuppel);
  ok(r.zuPunkte === 0 && !r.zuSchuss, 'außerhalb des Events: keine Punkte, kein Beschuss', [r.zuPunkte, r.zuSchuss]);
  ok(r.beginn.ev && r.beginn.leer && r.beginn.kuppelWeg, 'Event beginnt: Rangpunkte bei 0, Kuppel weg', r.beginn);
  ok(r.punkte.K === 30 && r.punkte.V1 === 15 && r.punkte.X === 15 && r.punkte.ich === 15 && r.punkte.V2 === 15, 'Punkte: Thron 30, je Wachturm 15, Verstärkung beim Verbündeten 15 (fremde Verstärkung nichts)', r.punkte);
  ok(JSON.stringify(r.schuetzen) === JSON.stringify(r.soll), 'Es schießen nur Türme außerhalb des Bündnisses (fremd + frei)', r);
  ok(r.schuss.loss === r.schuss.soll, 'Beschuss: je Turm 2 %', r.schuss);
  ok(r.shopWeg, 'Thron-Shop ist weg');
  ok(r.auswertung.aus && r.auswertung.herr && (k => k.episch + k.gross + k.aus >= 16 && k.gross === 5)(JSON.parse(r.auswertung.kisten)) && r.auswertung.letzte === '21600,10800,9000,450', 'Auswertung: Platz 1 ist Herrscher, 2/5/10 Kisten (ein Mitspieler-Herrscher verschenkt gleich), Top-Liste gemerkt', r.auswertung);
  ok(/Platz 2/.test(r.auswertung.meinTitel || '') && /"eventMuenzen",2200/.test(r.auswertung.meinB || '') && /schluessel2",2/.test(r.auswertung.meinB || '') && r.auswertung.meinCoins, 'Dein Preis (Platz 2) im Abholfach: 2.200 Event-Münzen, 8 Std. Münzen, Holz, Beschleuniger, 2 epische Schlüssel', r.auswertung);
  ok(r.auswertung.botEM === 3000 && r.auswertung.xPreis >= 1000, 'Mitspieler bekommen ihren Preis direkt (Platz 1: 3.000, Platz 4: 1.000 Event-Münzen)', r.auswertung);
  ok(r.abholen.holz === 400000 && (r.abholen.vorl === 'Team C' || r.abholen.vorl >= 2200), 'Abholen: Holz in den Topf, Event-Münzen gutgeschrieben', r.abholen);
  ok(!r.kiste.selbst && !r.kiste.leer && r.kiste.gut && r.kiste.danach === 0 && !r.kiste.fremd && r.kiste.botBekam, 'Herrscher-Kisten: nicht an sich selbst, nur vorhandene, nur der Herrscher', r.kiste);
  ok(r.titel.keys === 'feldherr,burgvogt,schatz,narr' && r.titel.narr && r.titel.feld === .05, 'Titel: Feldherr/Burgvogt/Schatzmeister/Narr, Narr −5 % Marschtempo', r.titel);
  ok(r.fenster2.titel && r.fenster2.raenge === 5 && r.fenster2.preis && r.fenster2.herr && r.fenster2.chip, 'Events-Fenster, Chip „Thron“: Event, 5 Rang-Bänder, Herrscher-Zeile', r.fenster2);
  ok(r.herrFenster.kisten && r.herrFenster.titel === 4 && r.herrFenster.angelegt, 'Herrscher-Fenster: Titel vergeben, Kisten verschicken, Skin angelegt', r.herrFenster);
  ok(r.neu.leer && r.neu.kisten === null && r.neu.herr, 'Neues Event: Rangpunkte 0, übrige Kisten verfallen, Herrscher bleibt seine Woche', r.neu);
  ok(!fe.length, 'keine Seitenfehler', [...new Set(fe)].slice(0, 5));
  await b.close();
})();
