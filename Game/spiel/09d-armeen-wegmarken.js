// Teil 09d-armeen-wegmarken.js: Armeen auf der Karte und Wegmarken
// ===== ARMEEN AUF DER KARTE: troops that stand out in the open instead of in a base. Gather them from several
// bases at one spot, walk them anywhere and give orders: move, attack a base, take a field, join another army,
// go home. Out there they have no walls and produce nothing - and bots that notice them may come for them.
const ARMY_MAX = 5, ARMY_COL = '#3f86d8';
let armies = [], armyJoins = [], armyRaids = [];
try { const s = JSON.parse(store.get('openWaterArmies')) || {}; armies = s.armies || []; armyJoins = s.joins || []; armyRaids = s.raids || []; } catch (e) {}
let armySaveAt = 0, armyPick = null, armyPlace = false, armySheet = null, armyShare = .5, armySel = new Set(), armyBotCheckAt = 0;
function saveArmies(now) { if (now && now - armySaveAt < 4000) return; armySaveAt = now || Date.now(); store.set('openWaterArmies', JSON.stringify({ armies, joins: armyJoins, raids: armyRaids })); }
window.addEventListener('pagehide', () => saveArmies()); document.addEventListener('visibilitychange', () => { if (document.hidden) saveArmies(); });
const armyById = id => armies.find(a => a.id === id);
function landmassAtWorld(x, y) { return landmasses.find(l => Math.hypot(x - l.x, y - l.y) <= l.shapeMaxR && pointInPolygon(x, y, l.shape)) || null; }
function armyPos(a, now) {                                                    // where the army is right now (walking: along its path)
    if (!a.mv) return { x: a.x, y: a.y, landmassId: a.lm };
    const p = a.mv.path, q = Math.min(1, Math.max(0, ((now || Date.now()) - a.mv.startedAt) / Math.max(1, a.mv.resolveAt - a.mv.startedAt)));
    let tot = 0; const seg = []; for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); seg.push(l); tot += l; }
    let d = tot * q; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const t = seg[i] ? Math.min(1, d / seg[i]) : 1;
        const x = p[i].x + (p[i + 1].x - p[i].x) * t, y = p[i].y + (p[i + 1].y - p[i].y) * t, lm = landmassAtWorld(x, y);
        return { x, y, landmassId: lm ? lm.id : q < .5 ? a.lm : a.mv.to.lm }; } d -= seg[i]; }
    return { x: p[0].x, y: p[0].y, landmassId: a.lm };
}
function armyHalt(a, now) { if (!a.mv) return; const p = armyPos(a, now); a.x = p.x; a.y = p.y; a.lm = p.landmassId; a.mv = null; }
const armyWho = a => a.who || 'player';
const armyOwnSet = who => who === 'player' ? ownedIslands : botOwnedIslands[who] || new Set();
const armyCol = a => armyWho(a) === 'player' ? ARMY_COL : (botById[a.who] || {}).color || '#c9423a';
const armyName = a => armyWho(a) === 'player' ? 'Du' : (botById[a.who] || {}).name || '?';
const myArmies = () => armies.filter(a => armyWho(a) === 'player');
function armyHome(a) { const who = armyWho(a); if (armyOwnSet(who).has(a.homeId)) return a.homeId; return who === 'player' ? rewardBaseId() : botCapitalOf(who); }
function armySources(pt) {                                                    // your nearest bases with troops that can reach this spot
    const out = []; for (const id of ownedIslands) { const isl = islandById[id]; if ((islandTroops[id] || 0) < 1 || !canReach(isl.landmassId, pt.lm)) continue; out.push({ id, d: Math.hypot(isl.x - pt.x, isl.y - pt.y) }); }
    return out.sort((a, b) => a.d - b.d).slice(0, 5).map(o => o.id);
}
function armySendFrom(a, baseId, n) {                                        // troops leave a base to join the army out there
    const isl = islandById[baseId], p = armyPos(a), who = armyWho(a); if (!isl || n < 1 || !armyOwnSet(who).has(baseId)) return false;
    if (isl.landmassId !== p.landmassId) { const hop = lastHop(isl.landmassId, p.landmassId, who); if (!payToll(hop[0], hop[1], n, who)) return false; }
    islandTroops[baseId] = Math.max(0, (islandTroops[baseId] || 0) - n);
    const now = Date.now(); armyJoins.push({ armyId: a.id, who, homeId: baseId, troops: n, startedAt: now, resolveAt: now + travelDurationSeconds(isl, p, who === 'player' ? undefined : who) * 1000 });
    return true;
}
function armyCreate(pt, sources, share, fuer) {
    if (!fuer && myArmies().length >= ARMY_MAX) { flashHint('Höchstens ' + ARMY_MAX + ' Armeen gleichzeitig im Feld.', 3000); return null; }
    if (!marschPlatz(fuer || 'player')) return null;                                          // eine Armee = ein Marsch-Platz (Paket D)
    if (!fuer && alsBefehl('armee', { op: 'neu', pt: { x: pt.x, y: pt.y, lm: pt.lm }, quellen: sources, anteil: share })) { flashHint('Armee wird aufgestellt …', 3000); return null; }
    if (fuer && armies.filter(a => armyWho(a) === fuer).length >= ARMY_MAX) return null;
    const a = { id: 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), x: pt.x, y: pt.y, lm: pt.lm, troops: 0, homeId: sources[0], mv: null };
    if (fuer) a.who = fuer;
    armies.push(a); let sent = 0;
    for (const id of sources) { const n = Math.floor((islandTroops[id] || 0) * share); if (armySendFrom(a, id, n)) sent += n; }
    if (!sent) { armies = armies.filter(x => x !== a); return null; }
    if (!fuer) sfx('send'); updateHud(); saveGame(); saveArmies(); requestRender();   // (kein Ton beim Weltrechner: dort gibt es kein AudioContext – der Befehl brach sonst vor dem Speichern ab)
    flashHint('Armee wird aufgestellt: ' + fmtCompact(sent) + ' Truppen aus ' + sources.length + (sources.length === 1 ? ' Basis' : ' Basen') + ' sind unterwegs.', 3500);
    return a;
}
function armyTargetAt(sx, sy, self) {                                         // what a tap on the map means as an order
    const other = armyAt(sx, sy, self); if (other) return { kind: 'army', id: other.id, ...armyPosXY(other) };
    const isl = pickIslandAtScreen(sx, sy); if (isl) return { kind: 'base', id: isl.id, x: isl.x, y: isl.y, lm: isl.landmassId };
    const f = fieldAt(sx, sy); if (f) return { kind: 'field', id: f.id, x: f.x, y: f.y, lm: f.landmassId };
    const w = screenToWorld(sx, sy), lm = landmassAtWorld(w.x, w.y);
    return lm ? { kind: 'point', x: w.x, y: w.y, lm: lm.id } : null;
}
const armyPosXY = a => { const p = armyPos(a); return { x: p.x, y: p.y, lm: p.landmassId }; };
function armyMove(a, t) {                                                    // sets the army walking → '' or why it can't
    const who = armyWho(a), now = Date.now(); armyHalt(a, now);
    if (t.kind === 'base' && islandOwnerOf(t.id) === who) t.kind = 'home';
    if (t.kind === 'base' && isCapital(t.id)) return 'capital';
    if (t.kind === 'base' && t.id === megaTempleId && now < thronOffenAb()) return 'thron';   // der Thron erst ab Tag 7 – auch für Armeen
    if (t.kind === 'base' && baseShieldedFor(t.id, who)) return 'shield';
    if (t.kind === 'army') { const b = armyById(t.id); if (b && armyWho(b) !== who && ownerShielded(armyWho(b))) return 'shield'; }
    if (bundFreund(who, t.kind === 'base' ? islandOwnerOf(t.id) : t.kind === 'army' && armyById(t.id) ? armyWho(armyById(t.id)) : null)) return 'bund';   // Bündnis-Mitglieder greifen sich nicht an
    if (!routeFor(a.lm, t.lm, who)) return 'route';
    const mx = heroMarchFx(who, a.hero, true, a.hero2);                         // its heroes: Tempo, Pirsch, Maut
    if (a.lm !== t.lm) { const hop = lastHop(a.lm, t.lm, who); if (!payToll(hop[0], hop[1], a.troops, who, t.kind === 'base' ? t.id : undefined, mx ? mx.toll : 0)) return 'toll'; }
    const from = { x: a.x, y: a.y, landmassId: a.lm }, to = { x: t.x, y: t.y, landmassId: t.lm };
    a.mv = { path: marchPath(from, to), startedAt: now, resolveAt: now + Math.max(3, travelDurationSeconds(from, to, who === 'player' ? undefined : who) / (1 + (mx ? mx.spd : 0) / 100)) * 1000, to: t };
    saveArmies(); requestRender(); return '';
}
function armyOrder(a, t) {
    if (!t) { flashHint('Dort ist Wasser – tippe auf Land, eine Basis, ein Feld oder eine Armee.', 3000); return false; }
    if (a.troops < 1) { flashHint('Die Armee hat noch keine Truppen – warte, bis die ersten angekommen sind.', 3000); return false; }
    const why = !rechnet() ? (WELT.befehl('armee', { op: 'ziehen', id: a.id, ziel: t }), '') : armyMove(a, t);
    if (why === 'shield') flashHint(shieldBlockText(t.kind === 'army' ? armyWho(armyById(t.id)) : islandOwnerOf(t.id)), 4000);
    if (why === 'capital') flashHint('Das ist die Hauptstadt von ' + (botById[islandOwnerOf(t.id)] || {}).name + ' – eine Hauptstadt greifst du von einer Basis aus an (Angreifen), nicht mit einer Armee.', 4000);
    if (why === 'thron') flashHint('Der Thron zählt erst ab Tag ' + KARTE_ZONEN.thron.tag + ' – noch ' + fmtPassWait(thronOffenAb() - Date.now()) + '.', 3500);
    if (why === 'route') flashHint(noRouteHint(a.lm, t.lm), 3500);
    if (why === 'bund') flashHint('Das gehört einem Bündnis-Mitglied – Mitglieder greifen sich nicht an.', 3500);
    if (why) return false;
    const foe = t.kind === 'army' && armyById(t.id) && armyWho(armyById(t.id)) !== 'player';
    const what = t.kind === 'base' ? 'greift ' + islandTitle(islandById[t.id]) + ' an' : t.kind === 'home' ? 'zieht nach ' + islandTitle(islandById[t.id]) : t.kind === 'field' ? 'zieht ' + fArt(FIELD_KINDS[fieldById[t.id].kind], 'zu')
        : foe ? 'greift die Armee von ' + armyName(armyById(t.id)) + ' an' : t.kind === 'army' ? 'vereint sich mit der anderen Armee' : 'marschiert los';
    flashHint('Armee ' + what + ' · ca. ' + fmtClock((a.mv.resolveAt - Date.now()) / 1000), 3000);
    sfx(t.kind === 'base' || foe ? 'attack' : 'send'); return true;
}
function fieldAtkPct(who) { return who === 'player' ? attackBonusPct() : botMults(who).attackPct; }
function fieldShield(who) { return who === 'player' ? shieldLossReductionPct() : botMults(who).shield; }
function fieldBattle(aWho, aTroops, dWho, dTroops, aHx, dHx) {   // every fight out in the open (armies, raids, fields): no walls - (troops + Gefolge) × Angriff (+ hero) × title, the winner's shield (+ hero) saves some
    const ah = aHx || HX0, dh = dHx || HX0;
    const fa = (1 + (fieldAtkPct(aWho) + ah.atk) / 100) * titleMult(aWho, 'attack') * (AUF ? AUF.kampf(aWho, 'a') : 1), fd = (1 + (fieldAtkPct(dWho) + dh.atk + dh.fdef) / 100) * titleMult(dWho, 'attack') * (AUF ? AUF.kampf(dWho, 'd') : 1);   // (+ Truppen-Stufe, Forschung)
    const SA = (aTroops + heroGefOf(ah, aTroops)) * fa, SD = (dTroops + heroGefOf(dh, dTroops)) * fd, won = SA > SD;
    const sh = Math.min(90, won ? fieldShield(aWho) + ah.loss : fieldShield(dWho) + dh.loss);
    const winLoss = Math.min(won ? aTroops : dTroops, Math.round((won ? SD / fa : SA / fd) * (1 - sh / 100)));
    return { won, SA: Math.round(SA), SD: Math.round(SD), aLoss: won ? winLoss : aTroops, dLoss: won ? dTroops : winLoss };
}
function armyClash(att, def) {                                              // army against army out in the open
    const aHx = heroFieldFx(armyWho(att), att.hero, {}, att.hero2), dHx = heroFieldFx(armyWho(def), def.hero, { defending: 1 }, def.hero2);   // both leaders (a full rage fires now)
    const A = att.troops, D = def.troops, fb = fieldBattle(armyWho(att), A, armyWho(def), D, aHx, dHx), won = fb.won, winner = won ? att : def;
    att.troops -= fb.aLoss; def.troops -= fb.dLoss; armies = armies.filter(x => !((x === att || x === def) && x.troops < 1));
    const wA = fieldHurt(armyWho(att), fb.aLoss, aHx), wD = fieldHurt(armyWho(def), fb.dLoss, dHx), wLoser = won ? wD : wA, wWinner = won ? wA : wD;
    const fg = fieldGold(armyWho(att), armyWho(def), fb, aHx, dHx);
    const mine = armyWho(att) === 'player' ? att : armyWho(def) === 'player' ? def : null;
    goalBump(armyWho(winner), 'armyWins');
    for (const x of [att, def]) { const w = armyWho(x); if (w === 'player' || !window.WELT || !botById[w] || !botById[w].mensch) continue;   // echte Spieler (Weltrechner): ihr Bericht als Nachricht
        const istA = x === att, sieg = x === winner;
        evBericht(w, { type: 'army', won: sieg, attacker: istA ? 'Du' : armyName(att), defender: istA ? armyName(def) : 'Du', atk: fb.SA, def: fb.SD, aLoss: fb.aLoss, dLoss: fb.dLoss, aWounded: wA, dWounded: wD,
            wounded: istA ? wA : wD, gold: istA ? fg.a : fg.d, hA: heroTag(aHx), hD: heroTag(dHx), hx: heroReportOf(istA ? aHx : dHx), hxA: heroReportOf(aHx), hxD: heroReportOf(dHx) },
            sieg ? 'Deine Armee hat die Armee von ' + armyName(istA ? def : att) + ' geschlagen.' : 'Die Armee von ' + armyName(istA ? def : att) + ' hat deine Armee geschlagen.'); }
    if (!mine) return;
    const youWon = mine === winner, foe = mine === att ? def : att, w = youWon ? wWinner : wLoser;
    addCombatLogEntry({ type: 'army', won: youWon, attacker: armyName(att), defender: armyName(def), atk: fb.SA, def: fb.SD, aLoss: fb.aLoss, dLoss: fb.dLoss, aWounded: wA, dWounded: wD, wounded: w, gold: mine === att ? fg.a : fg.d, hA: heroTag(aHx), hD: heroTag(dHx), hx: heroReportOf(mine === att ? aHx : dHx), hxA: heroReportOf(aHx), hxD: heroReportOf(dHx) });
    warStat(youWon ? 'armyWins' : 'armyLosses', 1, mine === def ? armyName(att) : null);
    flashHint(youWon ? 'Deine Armee hat die Armee von ' + armyName(foe) + ' geschlagen – ' + fmtCompact(winner.troops) + ' stehen noch.'
                     : 'Die Armee von ' + armyName(foe) + ' hat deine Armee geschlagen' + (w ? ', ' + fmtCompact(w) + ' ins Krankenhaus.' : '.'), 5000);
    if (youWon && mine === def) statBump('defends');
    sfx(youWon ? 'victory' : 'defeat'); updateHud(); saveGame();
}
function armyArrive(a, now) {
    const t = a.mv.to, who = armyWho(a), me = who === 'player'; a.x = t.x; a.y = t.y; a.lm = t.lm; a.mv = null;
    const gone = () => { armies = armies.filter(x => x !== a); armyJoins.forEach(j => { if (j.armyId === a.id) j.armyId = null; }); };
    if ((t.kind === 'home' || t.kind === 'base') && islandOwnerOf(t.id) === who) { islandTroops[t.id] = (islandTroops[t.id] || 0) + a.troops; gone();
        if (me) { flashHint('Armee ist in ' + islandTitle(islandById[t.id]) + ' eingezogen: +' + fmtCompact(a.troops) + ' Truppen.', 3000); updateHud(); saveGame(); } return; }
    if (t.kind === 'army') { const b = armyById(t.id); if (!b) return;
        if (armyWho(b) === who) { b.troops += a.troops; gone(); if (me) flashHint('Armeen vereint: jetzt ' + fmtCompact(b.troops) + ' Truppen.', 3000); }
        else if (ownerShielded(armyWho(b), now) || bundFreund(who, armyWho(b))) { if (me) flashHint('Die Armee von ' + armyName(b) + (bundFreund(who, armyWho(b)) ? ' gehört zu deinem Bündnis' : ' steht unter einem Friedensschild') + ' – kein Kampf.', 3500); }
        else { const p = armyPos(b, now); if (Math.hypot(p.x - a.x, p.y - a.y) < ISLAND_RADIUS * 2) { if (me) dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else { botDropShield(who); botNeulingWeg(who, armyWho(b)); } armyClash(a, b); } else if (me) flashHint('Die Armee von ' + armyName(b) + ' ist weitergezogen.', 3000); }
        return; }
    if (t.kind === 'field') { gone(); fieldArrive({ who, homeId: armyHome(a), fieldId: t.id, troops: a.troops, hero: a.hero || null, hero2: a.hero2 || null, back: false }, now); saveFields(); return; }
    if (t.kind === 'base') {                                                  // storming a base: the fight runs exactly like a normal attack
        const src = armyHome(a); if (src === null || src === undefined) return;
        gone();
        if (me) { dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); questProgress('attack', 1); } else { botDropShield(who); botNeulingWeg(who, islandOwnerOf(t.id)); }
        const tg = islandById[t.id], hx = a.hero && heroOwned(who, a.hero) ? heroLaunch(who, a.hero, islandById[src], tg, a.troops, a.hero2) : null;   // the army's heroes lead the storm
        pendingAttacks.push({ sourceId: src, targetId: t.id, rawTroops: a.troops, startedAt: now - 1000, resolveAt: now, attackerBotId: me ? null : who, fromArmy: true, ...attackFields(who, islandById[src], tg, a.troops, hx) });
        if (me) { saveGame(); saveProgression(); }
        renderActiveMarches();
    }
}
function armyTick() {
    if (!rechnet()) return;
    const now = Date.now(); let dirty = false;
    for (const j of armyJoins.filter(j => j.resolveAt <= now)) { dirty = true;
        const a = j.armyId && armyById(j.armyId);
        const who = j.who || 'player';
        if (a) a.troops += j.troops; else { const h = armyOwnSet(who).has(j.homeId) ? j.homeId : who === 'player' ? rewardBaseId() : botCapitalOf(who); if (h !== null && h !== undefined) islandTroops[h] = (islandTroops[h] || 0) + j.troops; } }
    if (dirty) armyJoins = armyJoins.filter(j => j.resolveAt > now);
    for (const a of armies.slice()) if (a.mv && a.mv.resolveAt <= now) { dirty = true; armyArrive(a, now); }
    for (const r of armyRaids.filter(r => r.resolveAt <= now)) { dirty = true; armyRaids = armyRaids.filter(x => x !== r); armyRaidArrive(r, now); }
    if (now >= armyBotCheckAt) { armyBotCheckAt = now + 5000; armyBotWatch(now); }
    if (dirty) { saveArmies(); requestRender(); if (armySheet) renderArmySheet(); } else saveArmies(now);
}
setInterval(armyTick, 1000);
// drawing: a camp is a little block of soldiers under your banner; a marching army is a column along its path
function armyAt(sx, sy, except) { const z = mapState.zoom; if (z < .004) return null;
    return armies.find(a => a !== except && (() => { const p = armyPos(a); if (armyWho(a) !== 'player' && !isCellOpen(p.x, p.y)) return false; return Math.hypot(p.x * z + mapState.offsetX - sx, p.y * z + mapState.offsetY - 8 - sy) < 22; })()) || null; }
function drawArmies(now, wallNow) {
    const z = mapState.zoom; if (z < .004 || !(armies.length || armyRaids.length)) return;
    for (const j of armyJoins) { const a = j.armyId && armyById(j.armyId), home = islandById[j.homeId]; if (!a || !home || armyWho(a) !== 'player') continue; const p = armyPos(a, wallNow);
        drawMarchLine('send', home, { x: p.x, y: p.y, landmassId: p.landmassId, radius: 0, id: 'army' }, j.startedAt, j.resolveAt, wallNow); }
    for (const r of armyRaids) { const b = islandById[r.baseId], ra = armyById(r.armyId); if (!ra || armyWho(ra) !== 'player') continue;   // nur Angriffe auf deine Armeen (die anderer Spieler gehen dich nichts an)
        if (b) drawMarchLine('incoming', b, { x: r.tx, y: r.ty, landmassId: r.lm, radius: 0, id: 'army' }, r.startedAt, r.resolveAt, wallNow); }
    for (const a of armies) if (a.mv && armyWho(a) !== 'player') { liveAnimation = true; const t = a.mv.to, tb = armyById(t.id);   // a bot army: you see where it goes only when it comes for you
        if ((t.kind === 'base' && islandOwnerOf(t.id) === 'player') || (t.kind === 'army' && tb && armyWho(tb) === 'player')) drawMarchLine('incoming', { x: a.mv.path[0].x, y: a.mv.path[0].y, radius: 0, id: 'army' + a.id }, { x: t.x, y: t.y, id: t.id }, a.mv.startedAt, a.mv.resolveAt, wallNow, a.mv.path, null, armyWho(a)); }
    for (const a of armies) if (a.mv && armyWho(a) === 'player') { const p = a.mv.path, t = a.mv.to;
        drawMarchLine(t.kind === 'base' || (t.kind === 'army' && armyById(t.id) && armyWho(armyById(t.id)) !== 'player') ? 'attack' : 'send', { x: p[0].x, y: p[0].y, radius: 0, id: 'army' + a.id }, { x: t.x, y: t.y, id: t.id }, a.mv.startedAt, a.mv.resolveAt, wallNow, p); }
}
function drawArmyCamps(now) {                                                 // after the nameplates: an army out there must never hide under one
    const z = mapState.zoom; if (z < .004 || !armies.length) return;
    setScreen(ctx); const k = Math.max(.7, Math.min(2, z / .012)), sel = armySheet && armySheet.id;
    for (const a of armies) {
        const mine = armyWho(a) === 'player', col = armyCol(a); if (a.mv && mine) continue;       // yours march as a column; a bot's army walks as its camp
        const ap = armyPos(a), x = ap.x * z + mapState.offsetX, y = ap.y * z + mapState.offsetY; if (x < -60 || x > viewW + 60 || y < -60 || y > viewH + 60) continue;
        if (!mine && !isCellOpen(ap.x, ap.y)) continue;                                           // fremde Armeen im Nebel: unsichtbar
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 3, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
        if (sel === a.id) { ctx.strokeStyle = 'rgba(228,200,134,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 3, 21, 8.5, 0, 0, Math.PI * 2); ctx.stroke(); }
        const n = a.troops >= 1 ? 9 : 0;
        for (let i = 0; i < n; i++) { const cx = (i % 3 - 1) * 7 + (Math.floor(i / 3) % 2) * 2 - 1, cy = (Math.floor(i / 3) - 1) * 4.2 + 2, bob = Math.abs(Math.sin(now / 420 + i * 1.3)) * .5;
            ctx.fillStyle = '#1a1d24'; ctx.fillRect(cx - 1.7, cy - 5 - bob, 3.4, 6);
            ctx.fillStyle = col; ctx.fillRect(cx + .6, cy - 4.4 - bob, 1.8, 3.6);
            ctx.fillStyle = '#aab2bc'; ctx.beginPath(); ctx.arc(cx, cy - 6.3 - bob, 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(cx - 1.2, cy - bob); ctx.lineTo(cx - 1.2, cy - 11 - bob); ctx.stroke(); }
        const wave = Math.sin(now / 300) * 1.5;                                     // the banner
        ctx.strokeStyle = '#2a241b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, 4); ctx.lineTo(13, -20); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(13, -20); ctx.quadraticCurveTo(19, -19 + wave, 25, -18); ctx.lineTo(25, -11); ctx.quadraticCurveTo(19, -12 - wave, 13, -12); ctx.closePath(); ctx.fill();
        ctx.lineWidth = .8; ctx.stroke();
        ctx.restore();
        const incoming = mine && armyJoins.some(j => j.armyId === a.id), raid = armyRaids.some(r => r.armyId === a.id);
        const t = (mine ? '' : armyName(a) + ' · ') + (a.troops >= 1 ? fmtCompact(a.troops) : 'sammelt …');
        ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(t).width + 14 + (incoming ? 10 : 0), ly = y - 15 * k, lx0 = x + 26 * k + w / 2, lx = lx0 + w / 2 > viewW - 4 ? x - 20 * k - w / 2 : lx0;   // flips left at the screen edge   // beside the banner, clear of any nameplate below a tower
        ctx.fillStyle = 'rgba(14,14,20,.86)'; ctx.strokeStyle = raid ? '#ff8d82' : col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - w / 2, ly - 9, w, 18, 9) : ctx.rect(lx - w / 2, ly - 9, w, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3e6c4'; ctx.fillText(t, lx - (incoming ? 5 : 0), ly + .5);
        if (incoming) { ctx.fillStyle = '#8cc0ff'; ctx.fillText('+', lx + w / 2 - 9, ly + .5); }
    }
}
// the army sheet: set one up (pick the bases), or give an existing one its orders
function openArmySheet(s) { armySheet = s; if (s.mode === 'new' || s.mode === 'more') { const src = armySources(s.mode === 'new' ? s : armyPosXY(armyById(s.id))); armySel = new Set(src.slice(0, 1)); } renderArmySheet(); requestRender(); }
function closeArmySheet() { document.getElementById('armySheet').hidden = true; armySheet = null; requestRender(); }
const armyHeldMerk = {};                         // Zuschauer: die gewählten Helden einer Armee, bis der Weltrechner sie bestätigt (sonst springt die Anzeige kurz zurück)
function armyHeroes(a) { const m = armyHeldMerk[a.id]; return m && m.bis > Date.now() && ((a.hero || null) !== m.h1 || (a.hero2 || null) !== m.h2) ? m : { h1: a.hero || null, h2: a.hero2 || null }; }
function armyHeroSeg(a) {                        // which heroes march with this army (one army or attack per hero) – Haupt- und Zweitheld
    const ah = armyHeroes(a), seg = heroSegHtml('data-ahero', ah.h1), seg2 = heroSeg2Html('data-ahero2', ah.h1, ah.h2);
    return seg ? '<div class="seg hero-seg army-hero chips-quer">' + seg + '</div>' + (seg2 ? '<div class="seg hero-seg hero-seg2 army-hero">' + seg2 + '</div>' : '') : '';
}
function armySetHeroes(a, h1, h2) {             // → true, wenn gesetzt: nur eigene Helden, die frei sind oder schon in dieser Armee stehen (Spieler und Weltrechner)
    const who = armyWho(a), frei = id => !id || (heroOwned(who, id) && (heroIn(a.hero, a.hero2, id) || !heroBusy(who, id)));
    if (a.mv || !frei(h1) || !frei(h2)) return false;
    a.hero = h1 || null; a.hero2 = h1 && h2 && h2 !== h1 ? h2 : null; return true;
}
function renderArmySheet() {
    const s = armySheet, el = document.getElementById('armySheet'); if (!s) return;
    const a = s.id && armyById(s.id); if (s.mode !== 'new' && !a) return closeArmySheet();
    const head = t => '<div class="marker-head"><b>' + icon('troops') + ' ' + t + '</b><button class="btn-x" type="button" data-aclose aria-label="Schließen">' + icon('close') + '</button></div>';
    if (a && armyWho(a) !== 'player') {                                          // someone else's army: what you can see of it
        liveHtml(el, head('Armee von ' + escapeHtml(armyName(a))) +
            '<div class="field-lines"><span>Truppen</span><b>' + fmtTile(Math.floor(a.troops)) + '</b><span>Status</span><b>' + (a.mv ? 'marschiert' : a.troops < 1 ? 'sammelt sich' : 'lagert') + '</b></div>' +
            '<div class="army-hint">Im Feld hat sie keine Mauer – eine stärkere Armee schlägt sie.</div>' +
            (myArmies().some(x => x.troops >= 1) ? '<button class="btn btn--primary btn--sm" type="button" data-afoe>' + icon('attack') + '<span>Mit deiner stärksten Armee angreifen</span></button>'
                : '<div class="notice">' + icon('info') + '<span>Stelle eine Armee auf (Knopf rechts), um sie im Feld anzugreifen.</span></div>'));
        el.hidden = false; return;
    }
    if (s.mode === 'new' || s.mode === 'more') {
        const pt = s.mode === 'new' ? s : armyPosXY(a), src = armySources(pt);
        const sum = [...armySel].reduce((n, id) => n + Math.floor((islandTroops[id] || 0) * armyShare), 0);
        liveHtml(el, head(s.mode === 'new' ? 'Armee aufstellen' : 'Armee verstärken') +
            (src.length ? '<div class="army-hint">Aus welchen Basen sollen Truppen kommen?</div><div class="marker-presets">' + src.map(id => '<button type="button" data-asrc="' + id + '"' + (armySel.has(id) ? ' class="on"' : '') + '>' + islandTitle(islandById[id]) + ' · ' + fmtCompact(islandTroops[id] || 0) + '</button>').join('') + '</div>' +
                '<div class="seg" data-ashare>' + ['.25', '.5', '.75', '1'].map(v => '<button type="button" data-f="' + v + '"' + (+v === armyShare ? ' class="on"' : '') + '>' + (v === '1' ? 'Alle' : Math.round(v * 100) + ' %') + '</button>').join('') + '</div>' +
                '<button class="btn btn--primary btn--sm" type="button" data-ago' + (sum < 1 ? ' disabled' : '') + '>' + icon('send') + '<span>' + (s.mode === 'new' ? 'Aufstellen' : 'Schicken') + ' · ' + fmtCompact(sum) + ' Truppen</span></button>'
              : '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher.</span></div>'));
    } else {
        const now = Date.now(), inc = armyJoins.filter(j => j.armyId === a.id).reduce((n, j) => n + j.troops, 0), raid = armyRaids.find(r => r.armyId === a.id);
        const t = a.mv && a.mv.to, st = a.mv ? (t.kind === 'base' ? 'Angriff auf ' + islandTitle(islandById[t.id]) : t.kind === 'home' ? 'Heimweg' : t.kind === 'field' ? 'zur ' + FIELD_KINDS[fieldById[t.id].kind].name : 'marschiert') + ' · ' + uhrHtml(a.mv.resolveAt, 'marsch') : 'lagert';
        liveHtml(el, head('Armee im Feld') +
            '<div class="field-lines"><span>Truppen</span><b>' + fmtTile(Math.floor(a.troops)) + (inc ? ' <em class="army-inc">+' + fmtCompact(inc) + ' unterwegs</em>' : '') + '</b><span>Status</span><b>' + st + '</b>' +
            '<span>Heimat</span><b>' + (armyHome(a) !== null && armyHome(a) !== undefined ? islandTitle(islandById[armyHome(a)]) : '–') + '</b></div>' +
            (raid ? '<div class="notice notice--warn">' + icon('attack') + '<span>' + botById[raid.botId].name + ' greift an (' + fmtCompact(raid.troops) + ') · ' + uhrHtml(raid.resolveAt, 'marsch') + '</span></div>' : '') +
            '<div class="army-hint">Im Feld gibt es keine Mauer und keine Produktion.</div>' + armyHeroSeg(a) +
            '<div class="army-btns"><button class="btn btn--primary btn--sm" type="button" data-aorder>' + icon('attack') + '<span>Befehl geben</span></button>' +
            '<button class="btn btn--secondary btn--sm" type="button" data-amore>' + icon('plus') + '<span>Verstärken</span></button>' +
            (a.mv ? '<button class="btn btn--secondary btn--sm" type="button" data-ahalt>' + icon('hourglass') + '<span>Anhalten</span></button>' : '') +
            '<button class="btn btn--secondary btn--sm" type="button" data-ahome>' + icon('recall') + '<span>Heimkehren</span></button></div>');
    }
    el.hidden = false;
}
document.getElementById('armySheet').addEventListener('click', e => {
    const s = armySheet; if (!s) return; const a = s.id && armyById(s.id);
    if (e.target.closest('[data-aclose]')) return closeArmySheet();
    const src = e.target.closest('[data-asrc]'); if (src) { const id = +src.dataset.asrc; armySel.has(id) ? armySel.delete(id) : armySel.add(id); return renderArmySheet(); }
    const sh = e.target.closest('[data-f]'); if (sh && e.target.closest('[data-ashare]')) { armyShare = +sh.dataset.f; return renderArmySheet(); }
    if (e.target.closest('[data-ago]')) {
        const ids = armySources(s.mode === 'new' ? s : armyPosXY(a)).filter(id => armySel.has(id)); if (!ids.length) return;
        if (s.mode === 'new') { const n = armyCreate(s, ids, armyShare); if (n) openArmySheet({ mode: 'army', id: n.id }); return; }
        let sent = 0; for (const id of ids) { const n = Math.floor((islandTroops[id] || 0) * armyShare); if (!rechnet()) { if (n >= 1) { WELT.befehl('armee', { op: 'dazu', id: a.id, quelle: id, n }); islandTroops[id] -= n; sent += n; } continue; } if (armySendFrom(a, id, n)) sent += n; }
        if (sent) { sfx('send'); updateHud(); saveGame(); saveArmies(); flashHint(fmtCompact(sent) + ' Truppen sind unterwegs zur Armee.', 3000); }
        return openArmySheet({ mode: 'army', id: a.id });
    }
    if (!a) return;
    if (e.target.closest('[data-afoe]')) { const best = myArmies().filter(x => x.troops >= 1).sort((u, v) => v.troops - u.troops)[0]; if (best && armyOrder(best, { kind: 'army', id: a.id, ...armyPosXY(a) })) closeArmySheet(); return; }
    if (armyWho(a) !== 'player') return;
    const hb = e.target.closest('[data-ahero]:not([disabled])'), hb2 = !hb && e.target.closest('[data-ahero2]:not([disabled])');
    if (hb || hb2) { if (a.mv) { flashHint('Die Armee ist unterwegs – den Helden wechselst du, wenn sie lagert.', 2500); return; }
        const ah = armyHeroes(a), h1 = hb ? hb.dataset.ahero || null : ah.h1, h2 = hb ? (hb.dataset.ahero && hb.dataset.ahero !== ah.h2 ? ah.h2 : null) : hb2.dataset.ahero2 || null;
        if (!armySetHeroes(a, h1, h2)) return;
        if (!rechnet()) { WELT.befehl('armee', { op: 'held', id: a.id, held: a.hero, held2: a.hero2 }); armyHeldMerk[a.id] = { h1: a.hero, h2: a.hero2, bis: Date.now() + 15000 }; } saveArmies();   // Zuschauer: der Weltrechner setzt sie auch (und prüft)
        flashHint(hb2 ? (a.hero2 ? heroById(a.hero2).name + ' zieht als Zweitheld mit' + (heroPairOf(a.hero, a.hero2) ? ' – Paar „' + heroPairOf(a.hero, a.hero2).name + '“, +' + HERO_PAIR_BONUS + ' %.' : '.') : 'Kein Zweitheld.') : a.hero ? heroById(a.hero).name + ' führt jetzt diese Armee.' : 'Die Armee zieht ohne Helden.', 2200); return renderArmySheet(); }
    if (e.target.closest('[data-amore]')) return openArmySheet({ mode: 'more', id: a.id });
    if (e.target.closest('[data-ahalt]')) { armyHalt(a, Date.now()); saveArmies(); flashHint('Die Armee hält an und lagert hier.', 2500); return renderArmySheet(); }
    if (e.target.closest('[data-ahome]')) { const h = armyHome(a); if (h === null || h === undefined) return; const b = islandById[h];
        if (armyOrder(a, { kind: 'home', id: h, x: b.x, y: b.y, lm: b.landmassId })) closeArmySheet(); return; }
    if (e.target.closest('[data-aorder]')) { closeArmySheet(); armyPick = a.id; armySheet = { mode: 'army', id: a.id }; document.getElementById('armySheet').hidden = true; requestRender();
        flashHint('Tippe das Ziel: Land = hinlaufen, fremde Basis = angreifen, Feld = sammeln, eigene Armee = vereinen, eigene Basis = einziehen.', 6000); }
});
function setArmyPlace(on) { armyPlace = on; document.getElementById('armyBtn').classList.toggle('on', on); if (on) flashHint('Armee: tippe auf freies Land, wo sich die Truppen sammeln sollen.', 3500); }
document.getElementById('armyBtn').addEventListener('click', e => { e.stopPropagation(); closeArmySheet(); armyPick = null;
    if (!armyPlace && myArmies().length >= ARMY_MAX) { flashHint('Höchstens ' + ARMY_MAX + ' Armeen gleichzeitig im Feld.', 3000); return; } setArmyPlace(!armyPlace); });
function armyHandleTap(sx, sy) {                                              // → true when the tap belonged to the armies
    if (armyPick) { const a = armyById(armyPick); armyPick = null; armySheet = null; if (a) armyOrder(a, armyTargetAt(sx, sy, a)); requestRender(); return true; }
    if (armyPlace) { setArmyPlace(false); const w = screenToWorld(sx, sy), lm = landmassAtWorld(w.x, w.y);
        if (!lm || pickIslandAtScreen(sx, sy) || (islandsByLandmass[lm.id] || []).some(i => Math.hypot(i.x - w.x, i.y - w.y) < ISLAND_RADIUS * 2.5)) { flashHint('Dort geht es nicht – tippe auf freies Land mit etwas Abstand zu den Basen.', 3000); return true; }
        closeIslandPopup(); openArmySheet({ mode: 'new', x: w.x, y: w.y, lm: lm.id }); return true; }
    const a = armyAt(sx, sy); if (a) { closeIslandPopup(); if (fieldSheetId) closeFieldSheet(); openArmySheet({ mode: 'army', id: a.id }); return true; }
    if (armySheet) closeArmySheet();
    return false;
}
// ===== WEGMARKEN: your own pins on the map ("Angriff hier", "Feindgebiet" …) =====
const MARKER_PRESETS = ['Angriff hier', 'Sammelpunkt', 'Achtung', 'Feindgebiet', 'Ziel', 'Verteidigen'];
const MARKER_COLORS = ['#d9453a', '#e4a53a', '#3f86d8', '#4caf50', '#9b59b6', '#e8e2d2'];
const MARKER_MAX = 30;
let markers = (() => { try { return JSON.parse(store.get('openWaterMarkers')) || []; } catch (e) { return []; } })();
let markerMode = false, markerEdit = null;                                  // markerEdit: { id|null, x, y, text, col }
function saveMarkers() { store.set('openWaterMarkers', JSON.stringify(markers)); }
function markerAt(sx, sy) { const z = mapState.zoom; return markers.slice().reverse().find(m => Math.hypot(m.x * z + mapState.offsetX - sx, m.y * z + mapState.offsetY - 14 - sy) < 20); }
function openMarkerSheet(edit) {
    markerEdit = edit; const sh = document.getElementById('markerSheet');
    document.getElementById('markerTitle').textContent = edit.id ? 'Wegmarke bearbeiten' : 'Neue Wegmarke';
    document.getElementById('markerText').value = edit.text || '';
    document.getElementById('markerDelete').style.visibility = edit.id ? 'visible' : 'hidden';
    document.getElementById('markerPresets').innerHTML = MARKER_PRESETS.map(t => '<button type="button" data-t="' + t + '"' + (t === edit.text ? ' class="on"' : '') + '>' + t + '</button>').join('');
    document.getElementById('markerColors').innerHTML = MARKER_COLORS.map(c => '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c === edit.col ? ' class="on"' : '') + ' aria-label="Farbe"></button>').join('');
    sh.hidden = false;
}
function closeMarkerSheet() { document.getElementById('markerSheet').hidden = true; markerEdit = null; requestRender(); }
function setMarkerMode(on) { markerMode = on; document.getElementById('markerBtn').classList.toggle('on', on); if (on) flashHint('Wegmarke: tippe auf die Karte, wo die Markierung hin soll.', 3000); }
document.getElementById('markerBtn').addEventListener('click', e => { e.stopPropagation(); closeMarkerSheet(); setMarkerMode(!markerMode); });
document.getElementById('markerPresets').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b || !markerEdit) return;
    markerEdit.text = b.dataset.t; document.getElementById('markerText').value = b.dataset.t;
    for (const x of document.querySelectorAll('#markerPresets button')) x.classList.toggle('on', x === b); });
document.getElementById('markerColors').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b || !markerEdit) return;
    markerEdit.col = b.dataset.c; for (const x of document.querySelectorAll('#markerColors button')) x.classList.toggle('on', x === b); });
document.getElementById('markerClose').addEventListener('click', closeMarkerSheet);
document.getElementById('markerSave').addEventListener('click', () => {
    if (!markerEdit) return;
    const text = (document.getElementById('markerText').value || '').trim().slice(0, 24) || 'Markierung';
    if (markerEdit.id) { const m = markers.find(q => q.id === markerEdit.id); if (m) { m.text = text; m.col = markerEdit.col; } }
    else { if (markers.length >= MARKER_MAX) markers.shift(); markers.push({ id: Date.now().toString(36), x: markerEdit.x, y: markerEdit.y, text, col: markerEdit.col }); }
    saveMarkers(); closeMarkerSheet(); flashHint('Wegmarke gespeichert.', 1800);
});
document.getElementById('markerDelete').addEventListener('click', () => { if (!markerEdit || !markerEdit.id) return; markers = markers.filter(m => m.id !== markerEdit.id); saveMarkers(); closeMarkerSheet(); });
function drawMarkers() {                                                     // a pin with a flag and the text beside it
    if (!markers.length) return;
    const z = mapState.zoom; setScreen(ctx);
    for (const m of markers) {
        const x = m.x * z + mapState.offsetX, y = m.y * z + mapState.offsetY;
        if (x < -120 || x > viewW + 120 || y < -60 || y > viewH + 60) continue;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a241b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 28); ctx.stroke();
        ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x + 16, y - 23); ctx.lineTo(x, y - 17); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
        ctx.font = '700 12px Inter, system-ui, sans-serif'; const tw = ctx.measureText(m.text).width + 14;
        ctx.fillStyle = 'rgba(14,14,20,.86)'; ctx.strokeStyle = m.col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 18, y - 33, tw, 20, 10) : ctx.rect(x + 18, y - 33, tw, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(m.text, x + 25, y - 22.5);
    }
}
// ===== FREIES FELD (Merkliste 33): Tipp auf freies Land → runde Knöpfe: Teleportieren · Markierung · Truppen hierher =====
let feldRing = null;                                                        // { x, y, lm } die angetippte Stelle (Welt)
function feldRingAuf(sx, sy) {                                              // → true, wenn dort freies Land ist
    const w = screenToWorld(sx, sy), lm = landmassAtWorld(w.x, w.y); if (!lm) return false;
    const el = document.getElementById('feldRing');
    const kn = [['tp', 'ui_sym_verlegen', 'Teleportieren', tpPreisHtml()], ['mark', 'ui_k_nadel', 'Markierung', ''], ['arm', 'ui_armee', 'Truppen hierher', '']];
    feldRing = { x: w.x, y: w.y, lm: lm.id };
    el.innerHTML = kn.map(([p, b, t, z], i) => '<button type="button" class="cr-btn" data-fring="' + p + '" style="--x:' + (i - 1) * 84 + 'px;--y:' + (i === 1 ? -92 : -58) + 'px;--d:' + i * 40 + 'ms"><span class="fr-ic" style="--b:url(bilder/' + b + '.webp)"></span><small>' + t + (z ? ' ' + z : '') + '</small></button>').join('');
    el.hidden = false; feldRingFrame(); requestRender(); return true;
}
function tpPreisHtml() { return teleImRucksack() ? '1 Teleporter' : icon('gem') + fmtNum(TP_GEMS); }   // ein Teleporter im Rucksack (auch der gratis) geht vor Edelsteinen
function feldRingZu() { if (!feldRing) return; feldRing = null; document.getElementById('feldRing').hidden = true; if (gemsArmed('teleport')) gemsArmAus(); requestRender(); }
function feldRingFrame() {                                                  // (jedes Bild) die Knöpfe folgen der Stelle, dort eine Nadel
    if (!feldRing) return;
    const z = mapState.zoom, x = feldRing.x * z + mapState.offsetX, y = feldRing.y * z + mapState.offsetY, el = document.getElementById('feldRing');
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    setScreen(ctx); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f3d27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 16, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
}
document.getElementById('feldRing').addEventListener('click', e => {
    const b = e.target.closest('[data-fring]'); if (!b || !feldRing) return; e.stopPropagation();
    const { x, y, lm } = feldRing, was = b.dataset.fring;
    if (was === 'tp') {
        const f = tpPruefen('player', x, y); if (f) { flashHint(f, 3500); return; }
        const k = teleImRucksack() ? 0 : TP_GEMS; if (gems < k) { flashHint('Teleportieren kostet ' + fmtNum(TP_GEMS) + ' Edelsteine – oder 1 Teleporter aus dem Rucksack.', 3000); return; }
        if (!gemsWirklich('teleport', k, b, true)) { if (gemsArm && gemsArm.t) gemsArm.t.innerHTML = 'Hierher teleportieren? ' + tpPreisHtml(); return; }   // (immer bestätigen – ab 500 „Wirklich?“)
        if (teleportOrt(x, y)) feldRingZu(); return;
    }
    feldRingZu();
    if (was === 'mark') { openMarkerSheet({ id: null, x, y, text: MARKER_PRESETS[0], col: MARKER_COLORS[0] }); return; }
    if (myArmies().length >= ARMY_MAX) { flashHint('Höchstens ' + ARMY_MAX + ' Armeen gleichzeitig im Feld.', 3000); return; }   // (wie der Armee-Knopf: dort sammeln sich die Truppen)
    if ((islandsByLandmass[lm] || []).some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 2.5)) { flashHint('Dort geht es nicht – tippe auf freies Land mit etwas Abstand zu den Basen.', 3000); return; }
    closeIslandPopup(); openArmySheet({ mode: 'new', x, y, lm });
});
function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - mapState.offsetX) / mapState.zoom,
        y: (screenY - mapState.offsetY) / mapState.zoom
    };
}

