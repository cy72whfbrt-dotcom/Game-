// Gemeinsame Kämpfe „jeder für sich“ (Alexander 5.10.): jeder bringt SEINE Helden (höchstens 2) – auch Rally-Mitglieder –,
// und alles zählt nur für SEINE Truppen: Flucht, Krankenhaus, Rückweg, Erfahrung, Wochen-Punkte, Verteidigungs-Gold (Helfer).
// Alex (Anführer, ohne Held) + Emma (Mitglied mit Held) greifen die Hauptstadt von Zora an (zu stark → verloren);
// Hugo verstärkt Zora (Botschaft). Dazu: Rammbock-Abzug nach Anteil, rallyAussortieren mit Skill-Anteil, Aufräumen nach Fehler.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const nah = (x, y, d) => Math.abs(x - y) <= (d === undefined ? 1 : d);
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    for (const s of Object.values(loadBotState())) if (s && s.city) s.city.levels.heroes = Math.max(1, s.city.levels.heroes || 0);   // Helden erst mit Heldenhalle (Merkliste 21)
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    const E = bots.find(x => Object.keys(loadBotState()[x.id].hs || {}).filter(id => heroOwned(x.id, id) && !heroBusy(x.id, id)).length >= 2);
    if (!E) return { fehler: 'kein Mitspieler mit 2 freien Helden' };
    const rest = bots.filter(x => x !== E), lm = x => islandById[botCapitalOf(x.id)].landmassId;
    for (const x of rest) botCoins[x.id] = 1e9;
    let A = null, Z = null;                                                // (Alex und ein Ziel, zu dem er durchkommt)
    for (const x of rest) { Z = rest.find(y => y !== x && botCanCross(x.id, lm(x), lm(y), 4e6, botCapitalOf(y.id))); if (Z) { A = x; break; } }
    if (!Z) return { fehler: 'kein erreichbares Ziel' };
    const H = rest.find(x => x !== A && x !== Z);
    for (const x of [A, E, Z, H]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    bundOp(A.id, { op: 'gruenden', name: 'Test', tag: 'TST', offen: true }); bundOp(E.id, { op: 'beitreten', aid: bundVon(A.id).id });
    bundOp(Z.id, { op: 'gruenden', name: 'Ziel', tag: 'ZIE', offen: true }); bundOp(H.id, { op: 'beitreten', aid: bundVon(Z.id).id });
    const st = loadBotState(); st[Z.id].shieldUntil = 0; st[Z.id].neuBis = 0; st[E.id].skills.attack = 30; saveBotState();   // (Emma: Skill Angriff 30)
    const ziel = botCapitalOf(Z.id), capA = botCapitalOf(A.id), capE = botCapitalOf(E.id);
    islandTroops[ziel] = 1000; islandTroops[capA] = 5e7; islandTroops[capE] = 3e6;
    const ed = effectiveDefense; effectiveDefense = t => t && t.id === ziel ? 2e7 : ed(t);                     // viel Abwehr → die Rally verliert
    const bgr = botGoldRate; botGoldRate = (w, k) => k === 'defenseGold' && (w === Z.id || w === H.id) ? (w === Z.id ? 1 : 3) : bgr(w, k);   // Verteidigung: Gold – Zora 1, Hugo 3
    verst.l.push({ id: 'vjt', w: H.id, t: ziel, n: 500000, von: botCapitalOf(H.id), at: Date.now() });     // Hugo verstärkt Zora
    // mitschreiben: heim (mit Rückweg-Bonus), Krankenhaus, Wochen-Punkte, Erfahrung
    const T = window.__t = { A: A.id, E: E.id, Z: Z.id, H: H.id, ziel, heim: [], laz: [], pkt: [], xp: [], berichte: [] };
    bundHeimschicken = (w, von, nach, n, ret) => { if (T.on || T.fehl) T.heim.push({ w, n, ret: ret || 0 }); };   // (nur während der Test-Kämpfe – die anderen spielen nebenbei weiter)
    const bht = botHospitalTake; botHospitalTake = (w, f, pct) => { if (T.on && [A.id, E.id].includes(w)) { T.laz.push({ w, f, pct: pct ?? null }); return Math.floor(f * (pct ?? botHospitalPct(w)) / 100); } return bht(w, f, pct); };
    evPunkte = (k, w, n) => { if (T.on && k === 'krieg') T.pkt.push({ w, n }); };
    addBotXp = (w, amount, g, e) => { if (T.on && [A.id, E.id].includes(w)) T.xp.push({ w, amount, g, e }); };
    const orig = resolveBotAttack, wer = [A.id, E.id, Z.id, H.id];
    resolveBotAttack = function (a) {
      if (a.targetId !== ziel) return orig.apply(this, arguments);
      const w0 = window.WELT; for (const w of wer) botById[w].mensch = true; T.on = true;
      window.WELT = new Proxy({}, { get: (o, k) => k === 'bericht' ? (w, e, txt) => T.berichte.push({ w, e: JSON.parse(JSON.stringify(e)), txt }) : k === 'wache' ? undefined : () => [] });
      try { return orig.apply(this, arguments); } finally { window.WELT = w0; for (const w of wer) botById[w].mensch = false; T.on = false; }
    };
    // 9) Emma tritt mit Haupt- und Zweitheld bei
    const [h1, h2, h3] = Object.keys(st[E.id].hs).filter(id => heroOwned(E.id, id) && !heroBusy(E.id, id));
    const r = { id: 'rj1', by: A.id, at: capA, t: ziel, start: Date.now(), los: Date.now() + 600000, n0: 3e6, j: [], aid: bundVon(A.id).id };
    bund.r.push(r);
    if (AUF) AUF.frei.an(); let why; try { why = bundRallyDazu(bundVon(A.id), E.id, { rid: r.id, von: capE, n: 1e6, held: h1, held2: h2 }); } finally { if (AUF) AUF.frei.aus(); }
    const j = r.j[0], m = pendingSends.find(s => s.rally === r.id && s.senderBotId === E.id);
    const out = { why, jHeld: j && j.held, jHeld2: j && j.held2, sendHeld: m && m.held, h1, h2, belegt: heroBusy(E.id, h1) && heroBusy(E.id, h2) };
    if (AUF) AUF.frei.an(); try { bundRallyDazu(bundVon(A.id), E.id, { rid: r.id, von: capE, n: 1000, held: h3 || h1 }); } finally { if (AUF) AUF.frei.aus(); }
    out.zweitesMal = r.j.length === 2 && !r.j[1].held;                 // (wer schon Helden dabei hat, bringt keine weiteren)
    // angekommen (wie bundSendAnkunft) – nur der erste Marsch zählt für den Test
    pendingSends = pendingSends.filter(s => s.rally !== r.id); r.j = [j]; j.da = true;
    botById[A.id].mensch = true; try { bundRallyLos(r); } finally { botById[A.id].mensch = false; }   // (Alex ohne Held: ein Mensch ohne Wunsch-Held)
    const a = pendingAttacks.find(x => x.rally && x.rally.id === 'rj1'); if (!a) return Object.assign(out, { fehler: 'keine Rally' });
    const xE = a.rally.an.find(x => x[0] === E.id), hx = xE && xE[4];
    const s = w => titleMult(w, 'attack') * AUF.kampf(w, 'a'), skE = Math.round(1e6 * botMults(E.id).attackPct / 100), hb = hx ? Math.round(1e6 * hx.atk / 100) + heroGefOf(hx, 1e6) : 0;
    Object.assign(out, { anHeld: hx && hx.id, anHeld2: hx && hx.id2, x3: xE && xE[3], x3soll: Math.round((1e6 + skE + hb) * s(E.id) / s(A.id) - 1e6), x6: xE && xE[6], skE,
      ohneHeldA: !a.hx, nachStart: heroBusy(E.id, h1) && heroBusy(E.id, h2) });
    // Werte des Helden für die Rechnung festlegen (Flucht +20 %, Feldlazarett +25 %, Rückweg +50 %, kein Rammbock)
    Object.assign(hx, { flee: 20, hosp: 25, ret: 50, def: 0 });
    T.pctE = Math.min(100, botHospitalPct(E.id) + 25); T.pctA = botHospitalPct(A.id);
    a.resolveAt = Date.now() + 300;
    return out; });
  console.log(JSON.stringify(v));
  ok(!v.fehler && !v.why && v.jHeld === v.h1 && v.jHeld2 === v.h2 && v.sendHeld === v.h1, '9) Emma tritt mit Haupt- und Zweitheld bei', v);
  ok(v.belegt && v.zweitesMal, '9) ihre Helden sind belegt, ein zweiter Beitritt bringt keine weiteren');
  ok(v.anHeld === v.h1 && v.anHeld2 === v.h2 && v.ohneHeldA, '9) im Angriff: Emmas Held in rally.an[4], Alex ohne Held');
  ok(v.x3 === v.x3soll && v.skE > 0 && v.x6 === v.skE, '9) Emmas Held zählt für IHRE Truppen (an[3]), an[6] = ihr Skill-Anteil', { x3: v.x3, soll: v.x3soll, x6: v.x6, skill: v.skE });
  ok(v.nachStart, '9) Emmas Helden bleiben bis zum Kampfende belegt');
  await p.waitForTimeout(30000);
  const e = await p.evaluate(() => { const T = __t, q = T.berichte.find(x => x.w === T.A && x.e.type === 'attack'), m = T.berichte.find(x => x.w === T.E && x.e.type === 'attack'), z = T.berichte.find(x => x.w === T.Z);
    const L = q ? q.e.angreifer : [], g = w => L.find(x => x.w === w) || {};
    return { won: q && q.e.won, my: q && q.e.myTroopsBuffed, en: q && q.e.enemyTroops, def: q && q.e.enemyDefense, A: g(T.A), E: g(T.E), mit: m && m.e.meine, mitRolle: m && m.e.rolle,
      verst: (z && z.e.verst || []).map(h => ({ w: h.w, k: h.k, gold: h.gold })), defGoldZ: z && z.e.defGold, heim: T.heim, laz: T.laz, pkt: T.pkt, xp: T.xp, pctE: T.pctE, pctA: T.pctA,
      ids: { A: T.A, E: T.E, Z: T.Z, H: T.H } }; });
  console.log(JSON.stringify(e));
  ok(e.won === false, 'Kampf verloren (gewollt)', { my: e.my, en: e.en, def: e.def });
  // 2) Flucht je Spieler mit SEINEM Helden: Alex 20 %, Emma 20 % + 20 % (ihr Held)
  ok(e.A.fled === 600000 && e.E.fled === 400000, '2) Flucht je Spieler: Alex 600.000 (20 %), Emma 400.000 (40 %, ihr Held)', { A: e.A.fled, E: e.E.fled });
  const hA = e.heim.filter(x => x.w === e.ids.A), hE = e.heim.filter(x => x.w === e.ids.E);
  ok(hA.length === 1 && hA[0].n === 600000 && hA[0].ret === 0 && hE.length === 1 && hE[0].n === 400000 && hE[0].ret === 50, '2+8) genau ihre Geflohenen gehen heim, Emma mit Rückweg +50 %', e.heim);
  // 3) Krankenhaus je Spieler mit SEINEM Helden
  const lE = e.laz.find(x => x.w === e.E.w), lA = e.laz.find(x => x.w === e.A.w);
  ok(lE && lE.f === 600000 && lE.pct === e.pctE && e.E.wounded === Math.floor(600000 * e.pctE / 100), '3) Emmas Verwundete: ihr Krankenhaus + ihr Held (+25 %)', { laz: lE, soll: e.pctE, wounded: e.E.wounded });
  ok(lA && lA.f === 2400000 && e.A.wounded === Math.floor(2400000 * e.pctA / 100), '3) Alex: sein Krankenhaus ohne Held', { laz: lA, wounded: e.A.wounded, pct: e.pctA });
  ok(e.mitRolle === 'mit' && e.mit && e.mit.fled === 400000 && e.mit.wounded === e.E.wounded && e.mit.fallen === 600000 - e.E.wounded, '6) Emmas Bericht: ihre Zahlen (geflohen, verwundet, gefallen)', e.mit);
  // 4) Wochen-Punkte nach Anteil
  const kA = e.A.k, kE = e.E.k, sk = kA + kE, aK = Math.min(e.en, e.my), weg = 4e6 - 1e6, Tot = e.en + e.def, kH = (e.verst[0] || {}).k || 0;
  const pk = w => e.pkt.filter(x => x.w === w).reduce((s, x) => s + x.n, 0);
  const KILL = 1000 / 1800;   // WO_KILL_PER = 1000 × WIRTSCHAFT_KOSTEN (1/1800)
  ok(nah(pk(e.A.w), aK * kA / sk / KILL, 1e-6) && nah(pk(e.E.w), aK * kE / sk / KILL, 1e-6), '4) Angreifer: Punkte nach Stärke-Anteil', { A: pk(e.A.w), E: pk(e.E.w), sollA: aK * kA / sk / KILL, sollE: aK * kE / sk / KILL });
  ok(kH > 0 && (e.verst[0] || {}).w === e.ids.H && nah(pk(e.ids.H), weg * kH / Tot / KILL, 1e-6) && nah(pk(e.ids.Z), weg * (Tot - kH) / Tot / KILL, 1e-6), '4) Verteidiger: Zora + Hugo (Verstärkung) nach Anteil',
    { H: pk(e.ids.H), Z: pk(e.ids.Z), sollH: weg * kH / Tot / KILL, sollZ: weg * (Tot - kH) / Tot / KILL });
  // 5) Verteidigungs-Gold: Hugo seinen Anteil mit SEINEM Satz (3), Zora nur ihren (Satz 1)
  ok(e.verst[0] && e.verst[0].gold === Math.round(weg * kH / Tot * 3) && e.defGoldZ === Math.round(weg * (Tot - kH) / Tot * 1), '5) Verteidigungs-Gold: Hugo Anteil × 3, Zora nur ihr Anteil', { hugo: e.verst[0] && e.verst[0].gold, sollH: Math.round(weg * kH / Tot * 3), zora: e.defGoldZ, sollZ: Math.round(weg * (Tot - kH) / Tot) });
  // 11) Erfahrung nach Anteil an alle Angreifer
  const xa = e.xp.find(x => x.w === e.A.w), xe = e.xp.find(x => x.w === e.E.w), fA = kA / sk, fE = kE / sk;
  ok(xa && xe && nah(xa.amount, aK * fA, 1e-3) && nah(xe.amount, aK * fE, 1e-3) && nah(xa.g / xa.e, Tot / e.my, 1e-9), '11) Erfahrung: Alex und Emma nach Anteil', { xp: e.xp, sollA: aK * fA, sollE: aK * fE });
  // 6) Kampflog: jedes Fenster mit SEINEN Geflohenen, Summe der Fenster = Balken
  const seite = await p.evaluate(() => { const q = __t.berichte.find(x => x.w === __t.A && x.e.type === 'attack'); combatLog.unshift(Object.assign(q.e, { at: Date.now() }));
    for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    if (!isPanelOpen(battleLogPopup)) document.getElementById('battleLogBtn').click(); else renderCombatLog();
    const chips = document.querySelector('#combatLogList .logRow').innerText;
    document.querySelector('#combatLogList summary').click();
    const x = document.querySelector('.kl-seite'); const r = x && !x.hidden ? { chips, soll: chipN(600000), balken: document.querySelector('#combatLogList .logBalTxt').innerText,
      fenster: [...x.querySelectorAll('.logSide')].map(l => ({ label: l.querySelector('.logSideLabel').textContent, sum: l.querySelector('.logSum').lastElementChild.textContent,
        geflohen: ([...l.querySelectorAll(':scope > .logLine')].find(z => z.firstElementChild.textContent.trim().startsWith('Geflohen')) || { lastElementChild: { textContent: '?' } }).lastElementChild.textContent })) } : null;
    x.querySelector('[data-klzu]').click(); return r; });
  const ang = seite ? seite.fenster.filter(f => /^Angreifer/.test(f.label)) : [], zahl = t => Number(String(t).replace(/\D/g, ''));
  ok(ang.length === 2 && zahl(ang[0].geflohen) === 600000 && zahl(ang[1].geflohen) === 400000, '6) Kampflog: Geflohen je Fenster (Alex 600.000, Emma 400.000)', ang);
  ok(seite && seite.chips.includes(seite.soll + ' fliehen heim'), '6) Alex sieht oben seine eigenen Geflohenen', seite && seite.chips.split('\n').slice(0, 6));
  const summe = ang.reduce((s, f) => s + zahl(f.sum), 0), bal = seite ? Number((seite.balken.match(/([\d.,]+)\s*Mio\./) || [0, '0'])[1].replace(/\./g, '').replace(',', '.')) * 1e6 : 0;
  ok(seite && Math.abs(summe - bal) < 1e5, '6) Summe der Angreifer-Fenster = Balken oben', { summe, balken: seite && seite.balken });
  // 7) Rammbock nach Anteil · 10) rallyAussortieren mit Skill-Anteil · 1) Aufräumen nach einem Fehler
  const r = await p.evaluate(() => { const T = __t, out = {};
    const fake = { rawTroops: 4e6, attackBonus: 1e6, hx: { def: 10 }, rally: { by: 'a', an: [['a', 0, 3e6], ['e', 0, 1e6, 1e6, { def: 30 }]] } };
    out.cut = heroDefCut(fake); out.cutAllein = heroDefCut({ hx: { def: 10 } });
    out.part = heroDefPart([], Object.assign({}, fake, { hx: null }), 1e6);
    T.heim.length = 0;
    const att = { rawTroops: 4e6, attackBonus: 500000, skillBonus: 200000, rally: { by: T.A, an: [[T.A, botCapitalOf(T.A), 3e6], [T.E, botCapitalOf(T.E), 1e6, 300000, null, 80, 50000]] } };
    bundOp(T.E, { op: 'verlassen' }); T.on = true; rallyAussortieren(att, botCapitalOf(T.A)); T.on = false;
    Object.assign(out, { raw: att.rawTroops, bonus: att.attackBonus, skill: att.skillBonus, heim: T.heim.map(x => x.n) });
    // ein Kampf bricht mit einem Fehler ab: Verstärkung wieder getrennt, Rally-Truppen gehen heim
    T.heim.length = 0; bundOp(T.E, { op: 'beitreten', aid: bundVon(T.A).id });
    const ziel = T.ziel, lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (beim Messen keine Züge der Mitspieler – unter Last dauert es länger)
    for (let i = pendingAttacks.length - 1; i >= 0; i--) if (pendingAttacks[i].targetId === ziel) pendingAttacks.splice(i, 1);
    islandTroops[ziel] = 1000; verst.l = verst.l.filter(x => x.t !== ziel); verst.l.push({ id: 'vjt2', w: T.H, t: ziel, n: 400000, von: botCapitalOf(T.H), at: Date.now() });
    const et = effectiveTroops; effectiveTroops = t => { if (t && t.id === ziel) { effectiveTroops = et; throw new Error('Testfehler'); } return et(t); };
    const now = Date.now(); T.fehl = true;                                // (das Aufräumen läuft nach dem Kampf – auch mitschreiben)
    pendingAttacks.push({ id: 'fehl1', sourceId: botCapitalOf(T.A), targetId: ziel, rawTroops: 4e6, attackBonus: 0, startedAt: now - 9000, resolveAt: now - 5000, fightEndsAt: now - 10, attackerBotId: T.A,
      rally: { id: 'rf', by: T.A, an: [[T.A, botCapitalOf(T.A), 3e6], [T.E, botCapitalOf(T.E), 1e6, 0]] } });
    return out; });
  ok(nah(r.cut, 0.1 * 3 / 5 + 0.3 * 2 / 5, 1e-9) && nah(r.cutAllein, 0.1, 1e-9), '7) Rammbock: jeder Held nach Stärke-Anteil seines Spielers (18 %)', r);
  ok(r.part.length === 1 && r.part[0][1] === -Math.round(1e6 * 0.12), '7) Bericht-Zeile auch ohne Held des Anführers', r.part);
  ok(r.raw === 3e6 && r.bonus === 200000 && r.skill === 150000 && r.heim[0] === 1e6, '10) rallyAussortieren zieht ihren echten Skill-Anteil ab (an[6])', r);
  await p.waitForFunction(() => !pendingAttacks.some(a => a.id === 'fehl1'), null, { timeout: 7500, polling: 100 }).catch(() => {});   // (bis der Kampf aufgeräumt ist)
  const f =await p.evaluate(() => { const T = __t, v = verst.l.find(x => x.id === 'vjt2'); T.fehl = false;
    return { offen: pendingAttacks.some(a => a.id === 'fehl1'), verst: v && v.n, besatzung: islandTroops[T.ziel], plus: verstDefPlus[T.ziel], heim: T.heim.map(x => [x.w === T.A ? 'Alex' : x.w === T.E ? 'Emma' : x.w, x.n]) }; });
  ok(!f.offen && f.verst === 400000 && f.besatzung >= 1000 && f.besatzung < 5000 && f.plus === undefined, '1) Fehler im Kampf: Verstärkung wieder getrennt (nicht doppelt in der Besatzung), kein verstDefPlus', f);
  ok(f.heim.some(x => x[0] === 'Alex' && x[1] === 3e6) && f.heim.some(x => x[0] === 'Emma' && x[1] === 1e6), '1) Fehler im Kampf: die Rally-Truppen gehen heim', f.heim);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
