// Spähbericht zeigt alles richtig + Nachricht „X hat deine Basis ausgespäht“ (Vorschau, ohne Server):
// A) Mitspieler mit 4 Teilen Stufe 10: der Spähbericht zeigt die Ausrüstung (keine leeren Plätze), die Verteidigung
//    aufgeschlüsselt wie im Kampfbericht (Grund „Basis Stufe X“ + Rüstung + Fähigkeit + Mauer …), Summe = Kampf-Verteidigung,
//    Spieler-Stufe und Basis-Stufe eindeutig beschriftet; EINE Verteidigung: Chip = „Verteidigung gesamt“ = Truppen + alle Zeilen,
//    Grundverteidigung = Wert der Basis-Stufe
// B) Alter des Berichts: „gespäht vor 2 Std.“, ab 30 Min. gelb „neu spähen?“ – im Kampflog und im Angriffsfenster
// C) Ein Mitspieler späht deine Basis aus → Kampflog-Eintrag „… hat deine Basis … ausgespäht“
// D) Weltrechner (WELT nachgebaut): echter Spieler bzw. Mitspieler späht einen echten Spieler aus → Bericht an ihn + Push;
//    das Handy zeigt den Eintrag im Kampflog; Push-Text und Einstellung
// E) Viele Späher: je Späher und Basis höchstens 1 Meldung in 30 Min., höchstens 10 „ausgespäht“ im Kampflog (Kampfberichte bleiben)
const { chromium, devices } = require('playwright');
const path = require('path');
const fmtZ = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // wie fmtNum (Tausender-Punkte)
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', fe = [];
  const seite = async init => { const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
    if (init) await p.addInitScript(init);
    await p.goto(url); await p.waitForTimeout(9000);
    await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof verst !== 'undefined', null, { timeout: 60000, polling: 500 }).catch(() => {});
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
    return p; };
  // Ziel: eine Basis (Turm, keine Hauptstadt) eines Mitspielers mit 4 Teilen Stufe 10, Mauer, Fähigkeit Verteidigung
  const wahl = () => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;
    const bots = BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size >= 1);
    const frei = id => !isCapital(id) && !bossAt(id) && islandById[id].type === 'tower';
    let B = bots.find(d => [...botOwnedIslands[d.id]].some(frei));
    if (!B) { B = bots[0]; const n = islands.find(i => !islandOwnerOf(i.id) && frei(i.id)); botOwnedIslands[B.id].add(n.id); islandLevels[n.id] = islandLevels[n.id] || 1; }
    const H = bots.find(d => d !== B), T = [...botOwnedIslands[B.id]].find(frei);
    const bs = loadBotState(); bs[B.id].shieldUntil = 0; bs[B.id].neuBis = 0; bs[B.id].city.levels.wall = 3; bs[B.id].skills.defense = 5;
    bs[B.id].gear = { weapon: { r: 4, lvl: 10, st: 0 }, armor: { r: 4, lvl: 10, st: 1 }, shield: { r: 4, lvl: 10, st: 0 }, boots: { r: 4, lvl: 10, st: 0 } }; saveBotState();
    islandLevels[T] = 20; islandTroops[T] = 50000; verst.l = [];
    for (let i = pendingAttacks.length - 1; i >= 0; i--) if (pendingAttacks[i].targetId === T) pendingAttacks.splice(i, 1);
    return { B: B.id, H: H.id, T, lvl: bs[B.id].lvl };
  };
  const wahlCode = wahl.toString().replace(/^\(\) => /, '(() => ') + ')()';
  const p = await seite();
  const a = await p.evaluate(wahlCode).then(w => p.evaluate(w => {
    const out = { w }, now = Date.now(), T = islandById[w.T];
    const zeile = row => row ? row.textContent.replace(/\s+/g, ' ') : '';
    const reihe = e => { closeAllPopups(); battleLogBtn.click(); return [...combatLogListEl.children][combatLog.indexOf(e)]; };
    // A) Spähbericht
    resolveScout({ sourceId: playerIslandId, targetId: w.T, startedAt: now - 2000, resolveAt: now - 1 });
    const e = combatLog.find(x => x.type === 'scout' && x.targetId === w.T); if (!e) return out;
    const s = e.spy || {};
    out.A = { gear: s.gear, bl: s.bl, teile: s.teile, def: e.defense, eff: effectiveDefense(T), summe: (s.teile || []).reduce((x, q) => x + q[1], 0) };
    let row = reihe(e);
    out.A.voll = row ? row.querySelectorAll('.logGear .tile[data-r]').length : -1;
    out.A.leer = row ? row.querySelectorAll('.logGear .tile.empty').length : -1;
    out.A.text = zeile(row);
    // A2) kompakt: keine Zeilen voller „–“, kein Gefallen/Geflohen, kein leerer Zweitheld, nur EIN Alter (oben in der Karte)
    out.A.striche = row ? [...row.querySelectorAll('.logLine, .logCasualty')].filter(l => l.lastElementChild && /^[–—-]$/.test(l.lastElementChild.textContent.trim())).length : -1;
    out.A.leerZ = /Gefallen|Geflohen|Kein Zweitheld|Kein Hauptheld|Fähigkeit –/.test(out.A.text);
    out.A.alter = (out.A.text.match(/vor \d+ (s|Min\.|Std\.)/g) || []).length;
    const sm = row && row.querySelector('summary'); if (sm) sm.click();
    const ks = document.querySelector('.kl-seite');
    out.A.seite = ks && !ks.hidden;
    // A3) EINE Zahl für die Verteidigung: Chip = „Verteidigung gesamt“ = Truppen + jede Zeile darüber; Grundverteidigung = Basis-Stufe
    if (ks) { const box = ks.querySelector('.kl-v > .logSide'), wert = el => { const t = el.lastElementChild.textContent; return (/^−/.test(t.trim()) ? -1 : 1) * parseInt(t.replace(/[^\d]/g, ''), 10); };
      const sumEl = box && box.querySelector(':scope > .logSum'), zeilen = box ? [...box.querySelectorAll(':scope > .logLine')] : [];
      const chip = [...ks.querySelectorAll('.lchip')].map(c => c.textContent.trim()).find(t => /Verteidigung/.test(t)) || '';
      out.A.gesamt = { soll: spaehGesamt(e), chip, chipSoll: chipN(spaehGesamt(e)) + ' Verteidigung gesamt', name: sumEl ? sumEl.firstElementChild.textContent : '', summe: sumEl ? wert(sumEl) : null,
        zeilen: zeilen.reduce((x, l) => x + wert(l), 0), grund: (zeilen.find(l => /^Grundverteidigung/.test(l.textContent)) || { textContent: '' }).textContent, grundSoll: baseDefenseForLevel(islandLevels[w.T] || 1) }; }
    const dn = Date.now; Date.now = () => dn() + 3 * 60000; refreshBattleLog(); Date.now = dn;   // 3 Min. später: läuft das Alter in der offenen Seite mit?
    const st = ks ? zeile(ks.querySelector('#klInhalt')) : '';
    out.A.seiteAlter = st.match(/vor \d+ (s|Min\.|Std\.)/g) || [];
    out.A.seiteStriche = ks ? [...ks.querySelectorAll('.logLine')].filter(l => l.lastElementChild && /^[–—-]$/.test(l.lastElementChild.textContent.trim())).length : -1;
    if (ks) ks.querySelector('[data-klzu]').click();
    // Kampf gleich danach (1 Truppe – verliert): dieselbe Verteidigung wie im Spähbericht
    try { resolveAttack({ sourceId: playerIslandId, targetId: w.T, rawTroops: 1, attackBonus: 0, atkTitle: 1, atkKraft: 1, startedAt: now - 1000, resolveAt: now, shieldLossReductionPct: 0, rewardGoldRate: 0 }); } catch (x) { out.A.kampfFehler = x.message; }
    const k = combatLog.find(x => x.type === 'attack' && x.targetId === w.T);
    out.A.kampf = k ? k.enemyDefense : null; out.A.kampfTeile = k ? k.defParts : null;
    // B) Alter: 2 Std. alt → gelb „neu spähen?“, frisch → ohne
    e.at = Date.now() - 2 * 3600000; row = reihe(e);
    const chip = row && [...row.querySelectorAll('.lchip')].find(c => /gespäht vor/.test(c.textContent));
    out.B = { chip: chip ? chip.textContent : null, gelb: !!(chip && chip.classList.contains('lchip--warn')) };
    closeAllPopups(); revealAround(T.x, T.y, 4000, false); scoutedIslands.add(w.T);
    openIslandPopup(T); out.B.menu = document.getElementById('popupStats') ? document.getElementById('popupStats').textContent.replace(/\s+/g, ' ') : '';
    previewSourceId = playerIslandId; popupView = 'preview'; previewFraction = 1; renderPopup();
    const al = popupStats.querySelector('[data-preview="alter"]');
    out.B.angriff = al ? al.textContent : null; out.B.angriffGelb = !!(al && al.classList.contains('notice--warn'));
    e.at = Date.now() - 5 * 60000; closeAllPopups(); openIslandPopup(T); previewSourceId = playerIslandId; popupView = 'preview'; renderPopup();
    const al2 = popupStats.querySelector('[data-preview="alter"]');
    out.B.frisch = al2 ? al2.textContent : null; out.B.frischGelb = !!(al2 && al2.classList.contains('notice--warn'));
    closeAllPopups();
    // C) Ein Mitspieler späht deine Basis aus
    const P = islandById[playerIslandId], vor = combatLog.length;
    const gelernt = botLearn(w.H, P.id, Date.now() + 1000, P.landmassId);
    botScoutsArrive(Date.now() + 5000);
    const m = combatLog.find(x => x.type === 'ausgespaeht' && x.targetId === P.id);
    row = m ? reihe(m) : null;
    out.C = { gelernt, neu: combatLog.length - vor, eintrag: m ? { botId: m.botId, botName: m.botName } : null, text: zeile(row), name: botById[w.H].name };
    closeAllPopups();
    // E) Flut: 30 Späher (6 Mitspieler, 2 Basen, mehrfach dieselbe), dazwischen ein Angriffsbericht → Späher-Meldungen begrenzt
    ausgespaehtZuletzt.clear();
    const K = BOT_DEFS.filter(d => !d.mensch).slice(0, 6).map(d => d.id), Z = [playerIslandId, w.T], echt = addCombatLogEntry, je = {};
    window.addCombatLogEntry = x => { if (x.type === 'ausgespaeht') { const k = x.botId + '|' + x.targetId; je[k] = (je[k] || 0) + 1; } return echt(x); };
    for (let i = 0; i < 30; i++) {
      if (i === 10) echt({ type: 'attack', targetId: w.T, sourceId: playerIslandId, outcome: 'fail', flut: 1 });
      ausgespaeht('player', K[i % 6], Z[Math.floor(i / 6) % 2]);
    }
    const zaehl = () => combatLog.filter(x => x.type === 'ausgespaeht').length;
    out.E = { gemeldet: Object.values(je).reduce((x, y) => x + y, 0), schluessel: Object.keys(je).length, max: Math.max(...Object.values(je)), imLog: zaehl(), angriff: combatLog.some(x => x.flut) };
    const k0 = 'player|' + K[0] + '|' + playerIslandId; ausgespaehtZuletzt.set(k0, Date.now() - 31 * 60000);   // 31 Min. später: wieder eine Meldung
    ausgespaeht('player', K[0], playerIslandId); ausgespaeht('player', K[0], playerIslandId);
    out.E.nach31 = je[K[0] + '|' + playerIslandId];
    out.E.einEintrag = combatLog.filter(x => x.type === 'ausgespaeht' && x.botId === K[0] && x.targetId === playerIslandId).length;
    window.addCombatLogEntry = echt;
    const alt = { type: 'ausgespaeht', botId: K[5], botName: 'x', targetId: w.T, at: Date.now() - 3600000 };   // älterer Bericht kommt spät an: kein zweiter Eintrag
    echt(alt); out.E.spaet = combatLog.filter(x => x.type === 'ausgespaeht' && x.botId === K[5] && x.targetId === w.T).length;
    out.E.imLogEnde = zaehl(); out.E.angriffEnde = combatLog.some(x => x.flut);
    out.bad = (document.getElementById('battleLogPopup').textContent.match(/undefined|NaN|\[object|Infinity/g) || []).slice(0, 5);
    return out;
  }, w));
  // F) Desktop: die Bericht-Seite ist ein Fenster über der Karte (keine schwarze Vollseite), Klick daneben schließt
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
  a.F = await p.evaluate(T => { closeAllPopups(); battleLogBtn.click(); const e = combatLog.find(x => x.type === 'scout' && x.targetId === T && x.spy);
    const row = e && [...combatLogListEl.children][combatLog.indexOf(e)], sm = row && row.querySelector('summary'); if (!sm) return null; sm.click();
    const ks = document.querySelector('.kl-seite'), f = ks.firstElementChild, r = f.getBoundingClientRect(), bg = getComputedStyle(ks).backgroundColor;
    const out = { offen: !ks.hidden, breite: Math.round(r.width), links: Math.round(r.left), bg, fensterBg: getComputedStyle(f).backgroundColor };
    ks.dispatchEvent(new MouseEvent('click', { bubbles: true })); out.zu = ks.hidden; return out; }, a.w.T);
  await p.setViewportSize({ width: 390, height: 844 });
  console.log(JSON.stringify(a).slice(0, 1500));
  ok(a.F && a.F.offen && a.F.breite <= 600 && a.F.links > 300 && /rgba\(.*0\.6/.test(a.F.bg) && a.F.zu, 'Desktop: Bericht als Fenster (max. 600 px, Karte dahinter abgedunkelt), Klick daneben schließt', a.F);
  const A = a.A || {};
  ok(A.gear && Object.values(A.gear).filter(g => g && g[0] === 4 && g[1] === 10).length === 4, 'Spähbericht: alle 4 Teile Stufe 10 im Bericht', A.gear);
  ok(A.voll === 4 && A.leer === 0, 'Spähbericht zeigt 4 Ausrüstungsteile (keine leeren Plätze)', { voll: A.voll, leer: A.leer });
  ok(Array.isArray(A.teile) && A.teile[0] && /Basis Stufe 20/.test(A.teile[0][2]) && A.teile.some(q => q[0] === 'Rüstung' && q[1] > 0) && A.teile.some(q => /Fähigkeit Verteidigung/.test(q[0])) && A.teile.some(q => q[0] === 'Mauer'), 'Spähbericht: Verteidigung aufgeschlüsselt (Basis Stufe 20, Rüstung, Fähigkeit, Mauer)', A.teile);
  ok(A.summe === A.def && A.def === A.eff, 'Spähbericht: Summe der Teile = Verteidigung = effectiveDefense', { summe: A.summe, def: A.def, eff: A.eff });
  { const G = A.gesamt || {};
    ok(G.summe === G.soll && G.zeilen === G.soll && G.chip === G.chipSoll && G.name === 'Verteidigung gesamt', 'Spähbericht: EINE Verteidigung – Chip = „Verteidigung gesamt“ = Truppen + alle Zeilen (vorher Chip ohne Truppen, Summe mit)', G);
    ok(new RegExp('^Grundverteidigung.*Basis Stufe 20' + fmtZ(G.grundSoll) + '$').test(G.grund || ''), 'Spähbericht: Grundverteidigung = Wert der Basis-Stufe 20 (baseDefenseForLevel)', { grund: G.grund, soll: G.grundSoll }); }
  ok(A.kampf === A.def && JSON.stringify((A.kampfTeile || []).map(q => [q[0], q[1]])) === JSON.stringify((A.teile || []).map(q => [q[0], q[1]])), 'Kampf gleich danach: dieselbe Verteidigung, dieselben Teile wie im Spähbericht', { kampf: A.kampf, kampfFehler: A.kampfFehler });
  ok(/Rüstung/.test(A.text || '') && /Basis Stufe 20/.test(A.text || '') && /Spieler-Stufe/.test(A.text || ''), 'Spähbericht-Anzeige: Rüstung-Zeile, „Basis Stufe 20“ und „Spieler-Stufe“ beschriftet', (A.text || '').slice(0, 300));
  ok(A.striche === 0 && !A.leerZ, 'Spähbericht kompakt: keine „–“-Zeilen, kein Gefallen/Geflohen, keine leeren Heldenplätze', { striche: A.striche, text: (A.text || '').slice(0, 300) });
  ok(A.alter === 1 && A.seite && A.seiteAlter.length === 1 && A.seiteAlter[0] === 'vor 3 Min.' && A.seiteStriche === 0, 'Spähbericht: nur EIN Alter (läuft auch in der offenen Seite mit)', { alter: A.alter, seite: A.seite, seiteAlter: A.seiteAlter, striche: A.seiteStriche });
  ok(a.B && /gespäht vor 2 Std\./.test(a.B.chip || '') && /neu spähen/.test(a.B.chip || '') && a.B.gelb, 'Kampflog: „gespäht vor 2 Std. · neu spähen?“ gelb', a.B);
  ok(a.B && /vor 2 Std\./.test(a.B.angriff || '') && a.B.angriffGelb && /neu spähen/.test(a.B.menu || ''), 'Angriffsfenster + Basis-Fenster: Alter des Berichts, ab 30 Min. gelb', a.B);
  ok(a.B && /vor 5 Min\./.test(a.B.frisch || '') && !a.B.frischGelb, 'frischer Bericht (5 Min.): nicht gelb', a.B);
  ok(a.C && a.C.gelernt !== false && a.C.eintrag && a.C.eintrag.botId === a.w.H && new RegExp(a.C.name + '.*hat deine Basis.*ausgespäht').test(a.C.text), 'Mitspieler späht deine Basis aus → Kampflog „… hat deine Basis ausgespäht“', a.C);
  const E = a.E || {};
  ok(E.schluessel === 12 && E.max === 1 && E.gemeldet === 12, '30 Späher (6 Mitspieler × 2 Basen): je Späher und Basis nur 1 Meldung in 30 Min.', E);
  ok(E.imLog === 10 && E.imLogEnde === 10 && E.angriff && E.angriffEnde, 'Kampflog: höchstens 10 „ausgespäht“, der Angriffsbericht bleibt', E);
  ok(E.nach31 === 2 && E.einEintrag === 1 && E.spaet === 1, 'nach 30 Min. wieder 1 Meldung – derselbe Späher bleibt EIN Eintrag (auch wenn ein alter spät ankommt)', E);
  ok(!(a.bad || []).length, 'Kampflog ohne kaputte Texte', a.bad);
  // D) Weltrechner nachgebaut
  const p2 = await seite(() => {
    window.__nachr = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht(an, e) { window.__nachr.push(Object.assign({ an }, e)); }, befehl() {}, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  const d = await p2.evaluate(wahlCode).then(w => p2.evaluate(w => {
    const out = { w }; if (!WELT.BEFEHLE || !WELT.bericht) { out.fehlt = 1; return out; }
    botById[w.B].mensch = true; WELT.menschen[w.B] = {}; WELT.menschen[w.H] = {};
    const bs = loadBotState(); bs[w.H].hb = { v: 1, nbAlle: 1 }; saveBotState();
    window.bundPush = (an, e) => window.__bundPush.push(Object.assign({ an }, e));   // (echte Spieler heißen u<id> – hier ein Mitspieler als Mensch: die Push-Warteschlange direkt mitlesen)
    // (1) echter Spieler späht (Weltrechner-Späher hb.sb)
    window.__bundPush = []; __nachr.length = 0; bs[w.H].hb.sb = [[w.T, Date.now() - 1]];
    try { __weltVorPuls(); } catch (e) { out.puls = e.message; }
    const r1 = __nachr.find(e => e.art === 'bericht' && e.eintrag && e.eintrag.type === 'ausgespaeht');
    out.eins = r1 ? { an: r1.an, von: r1.eintrag.botId, ziel: r1.eintrag.targetId, hint: r1.hint } : null;
    out.push1 = (window.__bundPush || []).filter(e => e.art === 'spaeher' && e.fertig);
    const sp = __nachr.find(e => e.art === 'spaeh' && e.ziel === w.T);   // der Späher bekommt seinen Bericht weiter – mit Ausrüstung und Teilen
    out.spaeh = !!sp; out.wrSpy = sp && sp.spy ? { gear: sp.spy.gear, bl: sp.spy.bl, summe: (sp.spy.teile || []).reduce((x, q) => x + q[1], 0), def: sp.defense } : null;
    // (2) ein Mitspieler (kein Mensch) späht den echten Spieler aus
    const M = BOT_DEFS.find(x => x.id !== w.B && x.id !== w.H && !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size);
    window.__bundPush = []; __nachr.length = 0;
    out.gelernt = botLearn(M.id, w.T, Date.now() + 1000, islandById[w.T].landmassId);
    botScoutsArrive(Date.now() + 5000);
    const r2 = __nachr.find(e => e.art === 'bericht' && e.eintrag && e.eintrag.type === 'ausgespaeht');
    out.zwei = r2 ? { an: r2.an, von: r2.eintrag.botId, name: r2.eintrag.botName, M: M.id, Mname: M.name } : null;
    out.push2 = (window.__bundPush || []).filter(e => e.art === 'spaeher' && e.fertig).length;
    // (2b) derselbe echte Spieler späht dieselbe Basis gleich noch einmal: kein zweiter Bericht, kein zweiter Push
    window.__bundPush = []; __nachr.length = 0; bs[w.H].hb.sb = [[w.T, Date.now() - 1]];
    try { __weltVorPuls(); } catch (e) { out.puls2 = e.message; }
    out.nochmal = { bericht: __nachr.filter(e => e.art === 'bericht' && e.eintrag && e.eintrag.type === 'ausgespaeht').length, spaeh: __nachr.filter(e => e.art === 'spaeh').length, push: window.__bundPush.length };
    // (3) das Handy des Ausgespähten: Eintrag im Kampflog
    const vor = combatLog.length;
    for (const f of WELT.beiNachricht) try { f({ art: 'bericht', eintrag: { type: 'ausgespaeht', botId: neutralId(w.H), botName: 'Clara_V', targetId: playerIslandId, at: Date.now() }, hint: 'Clara_V hat deine Basis ausgespäht.' }); } catch (e) { out.handyFehler = e.message; }
    const m = combatLog.find(x => x.type === 'ausgespaeht'); closeAllPopups(); battleLogBtn.click();
    out.handy = { neu: combatLog.length - vor, botId: m && m.botId, text: m ? [...combatLogListEl.children][combatLog.indexOf(m)].textContent.replace(/\s+/g, ' ') : '' };
    const lab = document.querySelector('[data-push-art="spaeher"]'); out.einst = lab ? lab.closest('label').textContent.replace(/\s+/g, ' ') : null;
    return out;
  }, w));
  console.log(JSON.stringify(d).slice(0, 1200));
  ok(!d.fehlt, 'Weltrechner-Teile da (WELT nachgebaut)');
  ok(d.eins && d.eins.ziel === d.w.T && /ausgespäht/.test(d.eins.hint || '') && d.spaeh, 'Echter Spieler späht einen echten Spieler aus → Bericht „ausgespäht“ an ihn (der Späher bekommt seinen Spähbericht)', d.eins);
  ok(d.wrSpy && d.wrSpy.bl === 20 && d.wrSpy.summe === d.wrSpy.def && Object.values(d.wrSpy.gear || {}).filter(g => g && g[1] === 10).length === 4, 'Weltrechner-Spähbericht: Ausrüstung, Basis-Stufe, Teile (Summe = Verteidigung)', d.wrSpy);
  ok(d.push1 && d.push1.length === 1 && d.push1[0].an === d.w.B, 'Echter Spieler späht aus → Push „ausgespäht“ (Art spaeher, abschaltbar)', d.push1);
  ok(d.gelernt !== false && d.zwei && d.zwei.name === d.zwei.Mname && d.push2 === 1, 'Mitspieler späht einen echten Spieler aus → Bericht + Push', d.zwei);
  ok(d.nochmal && d.nochmal.bericht === 0 && d.nochmal.push === 0 && d.nochmal.spaeh === 1, 'Derselbe Späher gleich noch einmal: Späher bekommt seinen Bericht, der Ausgespähte keine zweite Meldung/Push', d.nochmal);
  ok(d.handy && d.handy.neu === 1 && d.handy.botId === d.w.H && /Clara_V.*hat deine Basis.*ausgespäht/.test(d.handy.text), 'Handy: Kampflog-Eintrag „Clara_V hat deine Basis … ausgespäht“', d.handy);
  ok(/ausgespäht/.test(d.einst || ''), 'Einstellungen: Push-Art „Späher“ nennt auch „ausgespäht“', d.einst);
  // Push-Text (weltrechner/push.js)
  const P = require(path.resolve(__dirname, '../../Game/weltrechner/push.js')), jetzt = Date.now();
  const n1 = P.nachrichtBauen([{ art: 'spaeher', fertig: 1, von: 'Clara_V', basis: 'Turm #23633', zeit: jetzt }], jetzt);
  const n2 = P.nachrichtBauen([{ art: 'spaeher', fertig: 1, von: 'Clara_V', basis: 'A', zeit: jetzt }, { art: 'spaeher', fertig: 1, von: 'Emma', basis: 'B', zeit: jetzt }, { art: 'spaeher', von: 'Finn', basis: 'C', ankunft: jetzt + 60000, zeit: jetzt }], jetzt);
  ok(n1.titel === 'Basis ausgespäht' && /Clara_V hat deine Basis Turm #23633 ausgespäht/.test(n1.text), 'Push-Text: „Clara_V hat deine Basis Turm #23633 ausgespäht“', n1);
  ok(/2 deiner Basen wurden ausgespäht/.test(n2.text) && /Ein Späher von Finn ist unterwegs/.test(n2.text), 'Push-Text: mehrere zusammengefasst, „unterwegs“ bleibt getrennt', n2);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
