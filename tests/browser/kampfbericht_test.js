// Kampfbericht neue Seite (Alexander 9.10., Entwurf werkzeuge/kampfbericht): echte Kämpfe – Sieg (dein Angriff), Niederlage (deine Hauptstadt
// geplündert, Verwundete → „Verwundete heilen“), Rally (2 Angreifer: Mitglied zugeklappt). Alle Felder aus FELDER.md vorhanden, Zahlen = Bericht.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const dir = process.argv[3] || require('os').tmpdir();
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const zu = () => p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bf = document.getElementById('beuteFenster'); if (bf) bf.remove(); });
  await p.evaluate(() => store.set('openWaterNeulingBis', '0'));
  await zu();
  // 1) Sieg: dein Angriff auf eine schwache Basis eines Mitspielers
  const s1 = await p.evaluate(() => {
    const lm = islandById[playerIslandId].landmassId, h0 = flashHint; let hint = '';   // eine Hauptstadt in Reichweite: dort gibt es Beute (Münzen, Holz, Stein, Eisen)
    const bot = BOT_DEFS.find(x => !x.mensch && islandById[botCapitalOf(x.id)] && islandById[botCapitalOf(x.id)].landmassId === lm && islandSeen(islandById[botCapitalOf(x.id)]))
      || BOT_DEFS.find(x => !x.mensch && islandById[botCapitalOf(x.id)]);
    if (!bot) return { fehler: 'kein Ziel' };
    const z = botCapitalOf(bot.id); islandTroops[z] = 50; scoutedIslands.add(z); botCoins[bot.id] = 5e7; const rb = AUF.rohVon(bot.id); rb.h = 3e7; rb.s = 2e7; rb.e = 1e7; AUF.rohSpeichern();
    for (const br of bridges) clearIslandOwner(br.gateId);   // (Weg frei)
    revealAround(islandById[z].x, islandById[z].y, 300); flashHint = t => { hint = t; };
    AUF.frei.an(); try { launchAttack(playerIslandId, z, null, 100000); } finally { AUF.frei.aus(); }
    flashHint = h0; const a = pendingAttacks[pendingAttacks.length - 1]; if (!a || a.attackerBotId) return { fehler: 'kein Angriff', hint }; a.resolveAt = Date.now() - 10; return { z };
  });
  await p.waitForFunction(() => combatLog.some(e => e.type === 'attack'), null, { timeout: 60000, polling: 500 }).catch(() => {});
  // 2) Rally: zwei Mitspieler greifen gemeinsam deine Hauptstadt an (Niederlage, geplündert, Verwundete ins Krankenhaus)
  const s2 = await p.evaluate(() => {
    const c = loadCity(); c.levels.hospital = 10; saveCity();
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 2);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, B] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Zusammen', tag: 'ZUS', offen: true }); bundOp(B.id, { op: 'beitreten', aid: bundVon(A.id).id });
    islandTroops[playerIslandId] = 20000; coins = 5e7; const r0 = AUF.rohVon('player'); r0.h = 3e7; r0.s = 2e7; r0.e = 1e7; AUF.rohSpeichern();
    const r = { id: 'kb1', by: A.id, at: botCapitalOf(A.id), t: playerIslandId, n0: 3e6, j: [{ w: B.id, f: botCapitalOf(B.id), n: 1e6, da: true }], aid: bundVon(A.id).id };
    for (const br of bridges) { clearIslandOwner(br.gateId); botOwnedIslands[A.id].add(br.gateId); }
    bund.r.push(r); bundRallyLos(r);
    const a = pendingAttacks.find(x => x.rally && x.rally.id === 'kb1'); if (!a) return { fehler: 'keine Rally' }; a.resolveAt = Date.now() + 300; return { A: A.name, B: B.name };
  });
  ok(!s1.fehler && !s2.fehler, 'Kämpfe ausgelöst', [s1, s2]);
  await p.waitForFunction(() => combatLog.some(e => e.type === 'botAttack' && e.angreifer), null, { timeout: 60000, polling: 500 }).catch(() => {});
  await zu();
  await p.evaluate(() => document.getElementById('battleLogBtn').click()); await p.waitForTimeout(1000);
  // Seite eines Berichts öffnen und alle Felder lesen
  const lies = typ => p.evaluate(typ => {
    const i = combatLog.findIndex(e => typ === 'sieg' ? e.type === 'attack' && e.won : e.type === 'botAttack' && e.angreifer); if (i < 0) return null;
    const e = combatLog[i], row = combatLogListEl.children[i]; row.querySelector('summary').click();
    const x = document.querySelector('.kl-seite'); if (!x || x.hidden) return { zu: 1 };
    const q = s => x.querySelector(s), qa = s => [...x.querySelectorAll(s)], t = s => (q(s) || {}).textContent || '';
    const box = h => qa('.kb-box').find(b => b.querySelector('.kb-h').firstChild.textContent === h);
    const gesamt = qa('.kb-tab .sum td:last-child').map(td => td.textContent);
    const soll = e.type === 'attack' ? [e.myTroops + e.attackBuff, e.enemyTroops + e.enemyDefense + e.defenseBuff] : [e.myTroops, e.enemyTroops + e.enemyDefense];
    const mehr = qa('details.kb-mehr');
    return { kopf: t('#klTitel'), art: t('#klArt'), band: t('.kb-band b'), bandBild: (q('.kb-band img') || {}).src || '', ort: t('.kb-ort'), zeigen: !!q('.kb-ort [data-logzeigen]'),
      kraefte: !!box('Kräfte') && !!q('.kb-kraft .bar i'), vs: qa('.kb-seite').length, vsText: t('.kb-vs'), wappen: qa('.kb-seite img.w').length,
      truppen: ['uebrig', 'verwundet', 'gefallen', 'geflohen'].map(k => qa('[data-kb="' + k + '"]').length), kampfkraft: gesamt, soll: soll.map(v => fmtNum(Math.round(v))),
      quelle: qa('.kb-tab small').length, helden: qa('.kb-box:not(.kb-jeder) .kb-held').length, ausr: qa('.kb-box:not(.kb-jeder) .kb-gear .bk').length,
      meta: qa('.kb-box:not(.kb-jeder) .kb-meta span').map(s => s.firstChild.textContent).slice(0, 6), beute: qa('.kb-beutebox .bk').map(k => (k.querySelector('b') || {}).textContent || ''),
      beuteBild: qa('.kb-beutebox .bk img').length, hinweise: qa('.kb-hin > div').map(d => d.textContent), knopf: qa('.kb-knoepfe .btn').map(k => k.textContent.trim()),
      brennt: t('.kb-brennt'), mehr: mehr.map(d => ({ offen: d.open, text: d.querySelector('summary').textContent, namen: [...d.querySelectorAll('.kb-sp b')].map(b => b.textContent) })),
      jeder: qa('.kb-jeder > .kb-sp b').map(b => b.textContent), an: (e.angreifer || []).map(a => a.name), w: document.documentElement.scrollWidth, sw: x.scrollWidth, cw: x.clientWidth };
  }, typ);
  const foto = async name => { const h = await p.evaluate(() => document.querySelector('.kl-seite').scrollHeight); await p.setViewportSize({ width: 390, height: Math.min(h + 40, 9000) });
    await p.waitForTimeout(500); await p.screenshot({ path: dir + '/echt_' + name + '.png' }); await p.setViewportSize({ width: 390, height: 844 }); };
  const S = await lies('sieg');
  console.log(JSON.stringify(S));
  ok(S && S.kopf === 'Kampfbericht' && /Angriff/.test(S.art), 'Sieg: Seite offen, Kopf „Kampfbericht“ + Zeit · Angriff', S && [S.kopf, S.art]);
  ok(S && /^(Sieg|Geplündert)$/.test(S.band) && /marsch_band_sieg/.test(S.bandBild), 'Sieg: Band mit Bild', S && S.band);
  ok(S && /X \d+ · Y \d+/.test(S.ort) && /von /.test(S.ort) && S.zeigen, 'Sieg: Ort mit Koordinaten, „von …“ und „Zeigen“', S && S.ort);
  ok(S && S.kraefte && S.vs === 2 && S.vsText === 'VS' && S.wappen === 2, 'Sieg: Kräfte-Balken + zwei Seiten mit VS und Wappen (Platzhalter)', S && [S.vs, S.wappen]);
  ok(S && S.truppen.every(n => n === 2), 'Sieg: Truppen beider Seiten (übrig, verwundet, gefallen, geflohen)', S && S.truppen);
  ok(S && JSON.stringify(S.kampfkraft) === JSON.stringify(S.soll) && S.quelle > 0, 'Sieg: Kampfkraft je Seite, Gesamt = Bericht, Boni mit Quelle', S && [S.kampfkraft, S.soll]);
  ok(S && S.helden >= 4 && S.ausr === 8 && S.meta.join() === 'Fähigkeit Angriff,Fähigkeit Verteidigung,Mauer,Krankenhaus,Heldenhalle,Titel', 'Sieg: Helden (2 Plätze je Seite), 4 Ausrüstungs-Kacheln je Seite, Stadt', S && [S.helden, S.ausr, S.meta]);
  ok(S && S.beute.length >= 4 && S.beuteBild === S.beute.length && S.beute.some(z => /^\d/.test(z)) && S.beute.some(z => /^−/.test(z)), 'Sieg: Beute als Bild + Zahl (+ Verlust des Gegners)', S && S.beute);
  ok(S && S.knopf.some(k => /Nochmal angreifen/.test(k)), 'Sieg: Knopf „Nochmal angreifen“', S && S.knopf);
  ok(S && S.w <= 390 && S.sw <= S.cw, 'Sieg: nichts ragt seitlich heraus', S && [S.w, S.sw, S.cw]);
  await foto('sieg');
  await p.evaluate(() => { document.querySelector('.kl-seite [data-klzu]').click(); });
  const R = await lies('rally');
  console.log(JSON.stringify(R));
  ok(R && /^(Geplündert|Verloren)$/.test(R.band) && /marsch_band_niederlage/.test(R.bandBild) && /Verteidigung/.test(R.art), 'Niederlage: Band + Zeit · Verteidigung', R && [R.band, R.art]);
  ok(R && R.an.length === 2 && R.mehr.length === 1 && !R.mehr[0].offen && R.mehr[0].namen.includes(R.an[1]) && R.jeder.includes(R.an[0]), 'Rally: Anführer offen, Mitglied zugeklappt', R && [R.an, R.mehr, R.jeder]);
  ok(R && JSON.stringify(R.kampfkraft) === JSON.stringify(R.soll), 'Rally: Gesamt = Bericht', R && [R.kampfkraft, R.soll]);
  ok(R && R.truppen.every(n => n === 2) && R.helden >= 4 && R.ausr === 8, 'Rally: Truppen, Helden, Ausrüstung', R && [R.truppen, R.helden, R.ausr]);
  ok(R && (R.band !== 'Geplündert' || (/geplündert/.test(R.ort) && /brennt/.test(R.ort) && !/hält/.test(R.ort))), 'Niederlage geplündert: Text passt zu Band + Brand (nicht „die Stadt hält“)', R && R.ort);
  ok(R && (R.band !== 'Geplündert' || (/brennt/.test(R.brennt) && R.beute.some(z => /^−/.test(z)))), 'Niederlage: „Hauptstadt brennt“ + Geraubt als Bild + Zahl', R && [R.brennt, R.beute]);
  ok(R && R.hinweise.some(h => /Krankenhaus/.test(h)) && R.knopf.some(k => /Verwundete heilen/.test(k)), 'Niederlage: Hinweise + Knopf „Verwundete heilen“', R && [R.hinweise, R.knopf]);
  ok(R && R.w <= 390 && R.sw <= R.cw, 'Rally: nichts ragt seitlich heraus', R && [R.w, R.sw, R.cw]);
  await foto('niederlage_rally');
  await p.evaluate(() => { const d = document.querySelector('.kl-seite details.kb-mehr'); if (d) { d.open = true; d.scrollIntoView(); } });
  const auf = await p.evaluate(() => { const d = document.querySelector('.kl-seite details.kb-mehr'); return d ? { held: d.querySelectorAll('.kb-held').length, gear: d.querySelectorAll('.kb-gear .bk').length } : null; });
  ok(auf && auf.held >= 2 && auf.gear === 4, 'Rally aufgeklappt: Helden + Ausrüstung des Mitglieds', auf);
  await foto('rally_offen');
  const heil = await p.evaluate(() => { [...document.querySelectorAll('.kl-seite .kb-knoepfe .btn')].find(k => /heilen/.test(k.textContent)).click(); return document.querySelector('.kl-seite').hidden; });
  await p.waitForTimeout(2500);
  const stadt = await p.evaluate(() => ({ city: !cityView.hidden, id: cityOpenId, page: cityPage }));
  ok(heil && stadt.city && stadt.id === 'hospital' && stadt.page === 'nutz', '„Verwundete heilen“ öffnet das Krankenhaus', stadt);
  ok(!fe.length, 'keine Seitenfehler', [...new Set(fe)].slice(0, 5));
  await b.close();
})();
