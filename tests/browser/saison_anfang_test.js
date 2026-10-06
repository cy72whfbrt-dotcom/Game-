// Welt-Saison, Feinheiten (Alexander 5.10.): Ankündigung nach echter Restzeit, „Neustart: vom Admin“ wenn angehalten, „Saison-Pass N“,
// Tagesboss und Drache in den ersten 3 Tagen einer neuen Saison mit weniger Leben, Trostpreis wenn der Tagesboss entkommt (einmal),
// nach dem Reset 48 Std. Anfängerschutz für alle echten Spieler – auch ohne Basis. Burg fair (Alexander 6.10. A, aufbau.js burgFair): Burg 3
// bleibt mit ihrem Bau auf 4, Burg 4 verliert den Bau auf 5, Forschung mit Vorgänger fällt mit ihm.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof saisonTakt === 'function' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const now = Date.now(); saisonTakt();
    // 1) Ankündigung nach echter Restzeit
    const bald = [1, 2, 3].map(t => saisonBaldText(now + t * 864e5 - 60000).slice(0, 12));
    // 2) angehalten: „Neustart: vom Admin“ statt des alten Datums
    saison.halt = { seit: now, grund: 'sicherung' }; const halt = saisonKarte(); delete saison.halt; const normal = saisonKarte();
    // 3) der Pass heißt „Saison-Pass N“
    openGoals('pass'); const pass = (document.getElementById('passPane') || {}).innerText || ''; closePanel(goalsPopup);
    // 4) Tagesboss und Drache: erste 3 Tage einer neuen Saison weniger Leben (alle Mitspieler ohne Truppen → die Untergrenze zählt)
    const tr0 = Object.assign({}, islandTroops); for (const bd of BOT_DEFS) for (const id of botOwnedIslands[bd.id] || []) islandTroops[id] = 0;
    const s0 = saison, leben = start => { saison = { nr: 2, start, ende: now + 50 * 864e5 }; dayBoss = null; return [dbossEnsure().max, drNeu({ start: now, end: now + 36e5 }).max]; };
    const anfang = leben(now - 36e5), spaeter = leben(now - 4 * 864e5); saison = { nr: 1, start: now - 36e5, ende: now + 50 * 864e5 }; dayBoss = null; const erste = [dbossEnsure().max];
    for (const k in islandTroops) delete islandTroops[k]; Object.assign(islandTroops, tr0); saison = s0; saisonSpeichern();
    // 5) Tagesboss gestern nicht gefallen: alle, die getroffen haben, bekommen etwas Kleines – einmal
    const X = BOT_DEFS.find(x => !x.mensch && loadBotState()[x.id]).id, gx = loadBotState()[X].gems || 0, ib0 = inboxList().filter(x => x.src === 'boss').length;
    dayBoss = { d: 'gestern', k: 'kraken', name: 'Testboss', x: 0, y: 0, lm: 0, hp: 100, max: 1000, dmg: { player: 50, [X]: 30 }, fell: 0 };
    dbossEnsure(); dbossEnsure();
    const ib = inboxList().filter(x => x.src === 'boss'), trost = ib.filter(x => /Testboss entkommen/.test(x.title || '')), gx1 = loadBotState()[X].gems || 0;
    dayBoss = { d: 'vorgestern', k: 'kraken', name: 'Gefallen', x: 0, y: 0, lm: 0, hp: 0, max: 1000, dmg: { player: 50 }, fell: now - 864e5 }; dbossEnsure();
    const gefallen = inboxList().filter(x => /Gefallen/.test(x.title || '')).length;
    // 6) Reset: alle echten Spieler bekommen 48 Std. Anfängerschutz – auch einer ohne Basis
    const Y = BOT_DEFS.find(x => !x.mensch && x.id !== X && loadBotState()[x.id]).id, by = loadBotState()[Y];
    botById[Y].mensch = true; botOwnedIslands[Y].clear(); by.neuBis = 0; localStorage.removeItem('openWaterSaisonSchutz');
    botAergerNote(X, 0, now); const aergerVor = (botAergerMem[X] || []).length;   // (Ärger der Mitspieler: gehört zur alten Karte)
    barbRec('player').b = 12; barbRec(X).b = 7; barbRec('player').n = 3; const lagerVor = barbState.camps.length;
    saisonWelt(now); const lager = { ich: barbRec('player').b, x: barbRec(X).b, heute: barbRec('player').n, vor: lagerVor, nach: barbState.camps.length, gespeichert: JSON.parse(localStorage.getItem('openWaterBarbWho')).player.b }; const aerger = [aergerVor, Object.keys(botAergerMem).length]; const schutzY = (loadBotState()[Y].neuBis - now) / 36e5, schutzIch = (+localStorage.getItem('openWaterSaisonSchutz') - now) / 36e5; botById[Y].mensch = false;
    // 7) Burg fair an einzelnen Städten
    const bau = (id, to) => ({ id, to, startedAt: now, endsAt: now + 864e5 });
    const c3 = { levels: { keep: 3, academy: 3, lumber: 3 }, fo: { w_prod: 2, m_atk: 1 }, builds: [bau('keep', 4)], foRun: { id: 'x_tempo', to: 2 } }, c3vor = JSON.stringify(c3), g3 = AUF.burgFair(c3, 4);
    const c4 = { levels: { keep: 4, academy: 4 }, fo: {}, builds: [bau('keep', 5), bau('academy', 5)] }, g4 = AUF.burgFair(c4, 4);
    const c25 = { levels: { keep: 25, academy: 25, hospital: 30 }, fo: { m_laz: 10, m_laz2: 3, x_tempo2: 1, w_schutz: 2 } }; AUF.burgFair(c25, 4);
    const fair = { g3, gleich3: JSON.stringify(c3) === c3vor, g4, bau4: c4.builds.length, c25: c25.levels, fo25: c25.fo };
    return { fair, bald, halt: /Neustart\s*vom Admin/.test(halt.replace(/<[^>]+>/g, ' ')), haltDatum: /\d{1,2}:\d{2} Uhr/.test(halt), normal: !/vom Admin/.test(normal) && / Uhr</.test(normal),
      lager, pass, passNr: passNo(Date.now()), anfang, spaeter, erste, trost: trost.map(x => [x.gems, x.sh, x.crate]), ib: ib.length - ib0, gx: gx1 - gx, gefallen, aerger, schutzY, schutzIch,
      nachricht: /neuBis:\s*\(loadBotState\(\)\[\w+\]\s*\|\|\s*\{\}\)\.neuBis\s*\|\|\s*\w+\s*\+\s*NEULING_MS/.test(saisonNeu.toString()) };
  });
  console.log(JSON.stringify(r));
  ok(r.bald[0] === 'In 1 Tag beg' && r.bald[1] === 'In 2 Tagen b' && r.bald[2] === 'In 3 Tagen b', 'Ankündigung nach echter Restzeit (1 Tag, 2 Tage, 3 Tage)', r.bald);
  ok(r.halt && !r.haltDatum && r.normal, 'Angehalten: „Neustart: vom Admin“ statt des alten Datums (sonst das Datum)', { halt: r.halt, datum: r.haltDatum, normal: r.normal });
  ok(new RegExp('Saison-Pass ' + r.passNr).test(r.pass) && !/(^|[^-])Saison \d/.test(r.pass.replace(/Saison-Pass \d+/g, '')), 'Pass heißt „Saison-Pass N“', r.pass.slice(0, 80));
  ok(r.anfang[0] === 2e6 && r.anfang[1] === 1e6, 'Erste 3 Tage einer neuen Saison: Tagesboss 2 Mio., Drache 1 Mio. Leben (Untergrenze nach Start-Truppen)', r.anfang);
  ok(r.spaeter[0] === 28000 && r.spaeter[1] === 5600 && r.erste[0] === 28000, 'Danach (und in der allerersten Saison) wie immer: 50 Mio. / 10 Mio. × WIRTSCHAFT_KOSTEN (28.000 / 5.600)', { spaeter: r.spaeter, erste: r.erste });
  ok(r.trost.length === 1 && r.trost[0][0] === 15 && r.trost[0][1] === 2 && r.trost[0][2] === -1 && r.ib === 1 && r.gx === 15, 'Tagesboss entkommen: alle, die getroffen haben, bekommen etwas Kleines wie beim Drachen – nur einmal', { trost: r.trost, neu: r.ib, mitspielerGems: r.gx });
  ok(r.gefallen === 0, 'Gefallener Boss: kein Trostpreis (er hat schon nach Rang bezahlt)', r.gefallen);
  ok(r.schutzY > 47.9 && r.schutzY <= 48 && r.schutzIch > 47.9 && r.schutzIch <= 48, 'Reset: 48 Std. Anfängerschutz für alle echten Spieler – auch ohne Basis', { ohneBasis: r.schutzY, du: r.schutzIch });
  ok(r.lager.ich === 0 && r.lager.x === 0 && r.lager.gespeichert === 0 && r.lager.heute === 3 && r.lager.vor > 0 && r.lager.nach === 0, 'Reset: Lager-Fortschritt für alle wieder ab Stufe 1, alte Lager weg (Zähler von heute bleiben)', r.lager);
  ok(r.aerger[0] === 1 && r.aerger[1] === 0, 'Reset: der Ärger der Mitspieler (Hauptstadt/Truppen nach Lage) ist vergessen', r.aerger);
  ok(r.nachricht, 'Nachricht „saison“ schickt den neuen Anfängerschutz mit');
  const F = r.fair;
  ok(!F.g3 && F.gleich3, 'Burg fair: Burg 3 mit Bau auf 4 und Forschung bleibt genau so', F);
  ok(F.g4 && F.bau4 === 0, 'Burg fair: Burg 4 – Bau auf 5 (Burg und Labor) abgebrochen', F);
  ok(F.c25.keep === 4 && F.c25.academy === 4 && F.c25.hospital === 4 && JSON.stringify(F.fo25) === '{"m_laz":1}', 'Burg fair: Burg 25 → 4, Krankenhaus 30 → 4, Krankenhaus-Forschung 10 → 1 (Labor 4), ab Labor 23 weg (auch die mit Vorgänger)', F);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
