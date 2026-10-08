// Teil 07b-kriegsherr.js: Kriegsherr (Wanderboss) auf der Karte
// ===== BOSS AUF DER KARTE: nur noch der Kriegsherr (Wanderboss) in seinem Lager. (Der Weltboss Drachenturm/Piratenfestung ist seit 2.10. raus.)
var WANDER_CRATE = 3, bossRewardPending = false;      // Kiste „mind. Episch“
function bossAt(id) {
    const w = loadWander();
    return w && w.at === id && w.to === null && w.troops > 0 && !islandOwnerOf(id) ? w : null;   // the Kriegsherr in his camp
}
// A world event is as strong as the world, not as the player: the middle of the five biggest armies on the map
// (the player's and every bot's), so one giant army - yours or a bot's - doesn't set the bar for everyone.
function worldArmy() {
    const armies = [totalTroops()];
    for (const bot of BOT_DEFS) { let sum = 0; for (const id of botOwnedIslands[bot.id] || []) sum += islandTroops[id] || 0; armies.push(sum); }
    armies.sort((a, b) => b - a);
    return armies[2] || 0;
}
function defeatBoss(boss) {
    statBump('bosses');
    const rewardGems = WANDER_REWARD_GEMS, shN = HERO_SHARDS_WANDER;
    inboxAdd({ src: 'wboss', title: boss.name + ' besiegt', gems: rewardGems, crate: WANDER_CRATE, sh: shN });   // eine epische (lila) Kiste, Gems und Splitter – ins Abholfach
    saveProgression(); saveGame(); updateHud();
    endWander(null);
    document.getElementById('rewardModalSub').textContent = boss.name + ' ist gefallen – die Beute liegt unter Events → Belohnung.';
    beuteLis([{ a: 'kiste', k: kisteVonR(WANDER_CRATE), r: WANDER_CRATE, min: true }, { a: 'gems', n: rewardGems }, { a: 'sh', n: shN }], document.getElementById('rewardModalRewards'));   // Kacheln wie RoK (05e)
    bossRewardPending = true;
    setTimeout(() => { bossRewardPending = false; document.getElementById('rewardModal').hidden = false; }, 9800);   // after the fight on the map
}
document.getElementById('rewardModalBtn').addEventListener('click', () => { document.getElementById('rewardModal').hidden = true; });
document.getElementById('rewardModal').addEventListener('click', e => { if (e.target.id === 'rewardModal') document.getElementById('rewardModal').hidden = true; });
function bossTick() {
    checkRuler();
    const now = Date.now();
    const el = document.querySelector('[data-boss-clock]'), pb = popupIslandId !== null && bossAt(popupIslandId);
    if (el && pb) el.textContent = fmtClock((pb.campUntil - now) / 1000);
}
setInterval(bossTick, 1000);

// ===== WANDERBOSS: a warlord marches across the map, storms bases (yours, the bots', neutral ones) and camps
// for a while where he won. In his camp he can be attacked like a boss; every fight wears his army down.
// Whoever breaks him gets an epic crate (WANDER_CRATE) and WANDER_REWARD_GEMS gems. Every 6-8 h, lives 25 min.
var WANDER_REWARD_GEMS = 50, WANDER_NAMES = ['Kriegsherr Morgath', 'Die Schwarze Horde', 'Graf Vargoth', 'Der Eisenkönig'];
var wander, nextWanderAt = 0;
function loadWander() {
    if (wander !== undefined) return wander;
    try { wander = JSON.parse(store.get('openWaterWander')) || null; } catch (e) { wander = null; }
    nextWanderAt = parseInt(store.get('openWaterWanderNext'), 10) || (Date.now() + 8 * 60 * 1000);
    return wander;
}
function saveWander() { store.set('openWaterWander', JSON.stringify(wander || null)); store.set('openWaterWanderNext', String(nextWanderAt)); }
function endWander(msg) {
    wander = null; nextWanderAt = Date.now() + (360 + Math.random() * 120) * 60 * 1000; saveWander(); requestRender();
    if (msg) flashHint(msg, 4500);
    if (isPanelOpen(popup)) renderPopup();
}
function spawnWander() {
    const cand = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring >= 3);
    if (!cand.length) return false;
    const isl = cand[Math.floor(Math.random() * cand.length)], now = Date.now();
    const troops = niceRound(Math.max(wirtK(1e6), worldArmy() * (1.5 + Math.random())));   // (Mindeststärke × WIRTSCHAFT_KOSTEN)
    wander = { wander: true, name: WANDER_NAMES[Math.floor(Math.random() * WANDER_NAMES.length)], troops, defense: niceRound(troops * .15), max: troops,
        at: isl.id, from: null, to: null, departAt: 0, arriveAt: 0, campUntil: now + 60000, endsAt: now + 25 * 60 * 1000 };
    scoutedIslands.add(isl.id);
    saveWander(); saveGame();
    flashHint('Weltereignis: ' + wander.name + ' zieht über die Karte und greift Basen an! Besiege ihn in seinem Lager.', 7000);
    requestRender(); return true;
}
function wanderDepart(now) {                          // off to the next base: owned ones first, the player a bit more tempting
    const here = islandById[wander.at]; if (!here) return endWander(null);
    const lms = new Set((reachableLandmassIds[here.landmassId] || [here.landmassId]).filter(l => l === here.landmassId || landmassesConnected(here.landmassId, l)));
    let best = null;
    for (const lm of lms) for (const isl of islandsByLandmass[lm] || []) {
        if (isl.type !== 'tower' || isl.id === here.id || isCapital(isl.id) || bossAt(isl.id)) continue;
        const ow = islandOwnerOf(isl.id); if (shieldCovers(isl) && ownerShielded(ow)) continue;
        const d = Math.hypot(isl.x - here.x, isl.y - here.y) * (ow ? (ow === 'player' ? .45 : .6) : 1.6) * (.8 + Math.random() * .4);
        if (!best || d < best.d) best = { d, isl };
    }
    if (!best) { wander.campUntil = now + 30000; return; }
    const dist = Math.hypot(best.isl.x - here.x, best.isl.y - here.y);
    Object.assign(wander, { from: here.id, to: best.isl.id, at: null, departAt: now, arriveAt: now + Math.max(20000, Math.min(150000, dist / (BASE_ATTACK_SPEED * .6) * 1000)) });
    if (islandOwnerOf(best.isl.id) === 'player') flashHint(wander.name + ' marschiert auf deine Basis ' + islandTitle(best.isl) + ' zu!', 5000);
    saveWander(); requestRender();
}
function wanderArrive(now) {                          // the storm: same maths as any attack; a win razes the base and he camps there
    const tgt = islandById[wander.to], from = wander.from; if (!tgt) return endWander(null);
    const owner = islandOwnerOf(tgt.id), my = wander.troops;
    if (shieldCovers(islandById[wander.to]) && ownerShielded(owner, Math.min(now, wander.arriveAt || now))) { Object.assign(wander, { at: from, to: null, campUntil: now + 20000 }); saveWander(); return; }
    const vk = owner && typeof verstVorKampf === 'function' ? verstVorKampf(tgt.id) : null;   // Verstärkung (Botschaft) verteidigt mit
    const dHx = owner ? vhFx(owner) : null;               // Verteidigungs-Helden aus der Mauer: Angriff + Gefolge in effectiveDefense, dazu Verluste, Krankenhaus, Gold (wie bei jedem Angriff)
    let en = 0, def = 0, won = false, capitalHolds = false, vs = null;
    try {                                                                  // (ein Fehler dazwischen: die Verstärkung wird trotzdem wieder getrennt)
        en = effectiveTroops(tgt); def = effectiveDefense(tgt); won = my > en + def;
        capitalHolds = won && isCapital(tgt.id);          // capitals are never razed: only the garrison falls and he pulls back
        if (capitalHolds) {
            islandTroops[tgt.id] = 0; brandSetzen(tgt.id);          // (die Hauptstadt brennt – nur zu sehen)
            wander.troops = Math.max(1, Math.round(my - def * .6 - en * .3));
            Object.assign(wander, { at: from, to: null, campUntil: now + 45000 });
        } else if (won) {
            if (owner) { botNoteLoss(owner, tgt.id); clearIslandOwner(tgt.id); }
            islandTroops[tgt.id] = 0; tgt.neutralTroops = 0; neutralTroopOverrides[tgt.id] = 0;
            wander.troops = Math.max(1, Math.round(my - def * .6 - en * .3));
            Object.assign(wander, { at: tgt.id, to: null, campUntil: now + 90000 });
        } else {
            const cas = Math.round(Math.min(en, my) * (1 - (dHx ? dHx.loss : 0) / 100));   // (sein Verteidigungs-Held: weniger Verluste)
            if (owner) islandTroops[tgt.id] = Math.max(0, (islandTroops[tgt.id] || 0) - cas); else { tgt.neutralTroops = en - cas; neutralTroopOverrides[tgt.id] = tgt.neutralTroops; }
            wander.troops = Math.max(0, Math.round(my * .35));
            Object.assign(wander, { at: from, to: null, campUntil: now + 45000 });
        }
    } finally { vs = vk ? verstNachKampf(tgt.id, vk, won) : null; }   // wieder trennen: jeder trägt seinen Anteil an den Verlusten
    wander.defense = niceRound(wander.troops * .15);
    const wKilled = Math.max(0, my - wander.troops), fallenAlle = won ? en : Math.round(Math.min(en, my) * (1 - (dHx ? dHx.loss : 0) / 100)), fallen = vs ? vs.eigenWeg : fallenAlle;   // (Besitzer: nur seine)
    const dTeile = typeof verstAnteile === 'function' ? verstAnteile(vk, owner, en + def) : null, dTeil = w => { const t = dTeile && dTeile.find(x => x[0] === w); return t ? t[1] : 1; };
    if (vs) for (const h of vs.helfer) h.gold = payGold(h.w, wKilled * dTeil(h.w) * defGoldRate(h.w));   // "Verteidigung: Gold" der Helfer: ihr Anteil mit IHREM Satz
    const verstInfo = vs ? { verst: vs.helfer, eigen: vs.eigen } : {};
    let dwBesitzer = 0;
    if (owner && owner !== 'player') { dwBesitzer = fieldHurt(owner, fallen, dHx) || 0; botCoins[owner] = (botCoins[owner] || 0) + Math.round(wKilled * dTeil(owner) * defGoldRateHx(owner, dHx)); }
    const wGold = owner === 'player' ? Math.round(wKilled * dTeil('player') * defGoldRateHx('player', dHx)) : 0; if (wGold) inboxAdd({ src: 'fight', coins: wGold });
    if (owner === 'player') {
        scoutedIslands.add(tgt.id);
        const name = wander.name;
        const wounded = fieldHurt('player', fallen, dHx); dwBesitzer = wounded;
        spawnMapBattle({ sourceId: from, targetId: tgt.id, atk: 'boss', def: 'mine', my, myLoss: my - wander.troops, en, enLoss: fallenAlle, won,
            onEnd: () => spawnBattleFx(tgt.id, !won || capitalHolds, capitalHolds ? 'Hauptstadt hält' : won ? 'Basis verloren' : 'Verteidigt', capitalHolds ? 'Garnison gefallen' : won ? 'von ' + name : name + ' abgewehrt') });
        addCombatLogEntry({ type: 'botAttack', botName: name, targetId: tgt.id, myTroops: my, enemyTroops: en, enemyDefense: def, wounded, armor: armorDefenseFor(tgt.id), fallen, won, capitalHolds, defGold: wGold, defGear: fighterSnapshot('player', dHx), ...verstInfo });
        flashHint((capitalHolds ? name + ' hat die Garnison deiner Hauptstadt geschlagen – die Stadt hält.' : won ? name + ' hat deine Basis ' + islandTitle(tgt) + ' zerstört!' : 'Verteidigt! ' + name + ' wurde bei ' + islandTitle(tgt) + ' zurückgeschlagen.') + (wounded ? ' ' + fmtCompact(wounded) + ' Verwundete ins Krankenhaus.' : ''), 5000);
    }
    if (owner && owner !== 'player' && botById[owner] && botById[owner].mensch) {   // ein echter Spieler: der Bericht kommt bei ihm an (wie bei jedem Angriff)
        const t = islandTitle(tgt);
        evBericht(owner, { type: 'ev', ic: 'defense', gut: !won || capitalHolds, badge: capitalHolds ? 'Hält' : won ? 'Zerstört' : 'Verteidigt', title: wander.name + ' · ' + t,
            txt: fmtCompact(my) + ' gegen ' + fmtCompact(en + def) + (won && !capitalHolds ? ' · die Basis ist zerstört' : capitalHolds ? ' · die Garnison ist gefallen, die Hauptstadt hält' : ' · abgewehrt'), at: now },
            capitalHolds ? wander.name + ' hat die Garnison deiner Hauptstadt geschlagen – die Stadt hält.' : won ? wander.name + ' hat deine Basis ' + t + ' zerstört!' : 'Verteidigt! ' + wander.name + ' wurde bei ' + t + ' zurückgeschlagen.');
    }
    if (vs) verstBerichte(vs, { type: 'botAttack', botName: wander.name, targetId: tgt.id, myTroops: my, enemyTroops: en, enemyDefense: def, fallen, wounded: dwBesitzer,   // die Helfer: derselbe Bericht
        won, capitalHolds, defGear: owner ? fighterSnapshot(owner, dHx) : null, defName: owner === 'player' ? ((window.profileName && profileName.value) || 'Spieler') : (botById[owner] || {}).name, ...verstInfo });
    if (wander.troops <= 0) return endWander(wander.name + ' ist zerschlagen.');
    updateHud(); saveGame(); saveWander(); requestRender();
}
function wanderTick() {
    loadWander(); const now = Date.now();
    if (!rechnet()) return;
    if (!wander) { if (now >= nextWanderAt && !spawnWander()) nextWanderAt = now + 60000; return; }
    if (now >= wander.endsAt) return endWander(wander.name + ' ist weitergezogen.');
    if (wander.to !== null) { if (now >= wander.arriveAt) wanderArrive(now); else requestRender(); }
    else if (islandOwnerOf(wander.at)) endWander(null);           // someone took his camp (reward handled by the fight)
    else if (now >= wander.campUntil) wanderDepart(now);
}
setInterval(wanderTick, 1000);
function drawWander(now, chipOnly) {                // screen space: the marching host, or the camp with its aura (chipOnly: just the name plate, drawn over the base plates)
    const w = loadWander(); if (!w) return;
    const z = mapState.zoom; let wx, wy, marching = w.to !== null;
    if (marching) { const a = islandById[w.from], b2 = islandById[w.to], q = Math.max(0, Math.min(1, (Date.now() - w.departAt) / Math.max(1, w.arriveAt - w.departAt)));
        wx = a.x + (b2.x - a.x) * q; wy = a.y + (b2.y - a.y) * q;
        if (!isCellOpen(wx, wy) && !isCellOpen(b2.x, b2.y)) return;                // ganz im Nebel
        const ex = b2.x * z + mapState.offsetX, ey = b2.y * z + mapState.offsetY;
        ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -now / 40; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(150,30,70,.85)';
        ctx.beginPath(); ctx.moveTo(wx * z + mapState.offsetX, wy * z + mapState.offsetY); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    } else { const c = islandById[w.at]; if (!c || !islandSeen(c)) return; wx = c.x; wy = c.y; }
    const sx = wx * z + mapState.offsetX, sy = wy * z + mapState.offsetY;
    if (sx < -200 || sy < -200 || sx > viewW + 200 || sy > viewH + 200) return;
    const k = Math.max(.8, Math.min(2.2, z / 0.015)), pulse = .5 + .5 * Math.sin(now / 350);
    if (chipOnly) return wanderChip(w, sx, sy, z, k, marching);
    const gr = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60 * k);
    gr.addColorStop(0, 'rgba(120,20,60,' + (.35 + .15 * pulse) + ')'); gr.addColorStop(1, 'rgba(120,20,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, 60 * k, 0, Math.PI * 2); ctx.fill();
    if (z >= 0.006) {                                  // the host: a dense block of dark soldiers around a great banner
        const s = 14 * k, dir = marching && islandById[w.to].x < wx ? -1 : 1, walk = marching ? now / 70 : 0;
        const pos = []; for (let r = 0; r < 3; r++) for (let f = 0; f < 4; f++) pos.push([(f - 1.5) * 9 * k + (r % 2) * 4 * k, (r - 1) * 7 * k]);
        pos.sort((a, b) => a[1] - b[1]).forEach(([ox, oy], i) => bsSoldier(ctx, sx + ox, sy + oy + 8 * k, s, dir, '#3f1630', '#b07c98', walk + i, 0, 0));
        ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(sx, sy - 4 * k); ctx.lineTo(sx, sy - 44 * k); ctx.stroke();
        const wave = Math.sin(now / 200) * 3 * k; ctx.fillStyle = '#5b1d3d';
        ctx.beginPath(); ctx.moveTo(sx, sy - 44 * k); ctx.lineTo(sx + 22 * k, sy - 42 * k + wave); ctx.lineTo(sx + 16 * k, sy - 34 * k + wave); ctx.lineTo(sx + 22 * k, sy - 26 * k + wave); ctx.lineTo(sx, sy - 28 * k); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#e39ac0'; ctx.stroke();
    }
    liveAnimation = true;
}
function wanderChip(w, sx, sy, z, k, marching) {
    const left = marching ? w.arriveAt - Date.now() : w.campUntil - Date.now();
    const label = w.name + ' · ' + fmtCompact(w.troops) + ' · ' + (marching ? 'Ankunft ' : 'Lager ') + fmtClock(left / 1000);
    ctx.font = '700 11px Inter, system-ui, sans-serif'; const tw = ctx.measureText(label).width + 30, cy = sy - (z >= 0.006 ? 60 * k : 26);
    rr(ctx, sx - tw / 2, cy - 10, tw, 20, 10); ctx.fillStyle = 'rgba(24,6,14,.92)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#e39ac0'; ctx.stroke();
    drawGlyph(ctx, 'attack', sx - tw / 2 + 12, cy, 12, '#f2b6d2');
    ctx.fillStyle = '#fbe3ee'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, sx - tw / 2 + 22, cy + .5);
    liveAnimation = true;
}
function drawCrown(x, y, w) {       // small gold crown, (x, y) = bottom centre
    const h = w * 0.62;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.55); ctx.lineTo(x - w / 4, y - h * 0.25); ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 4, y - h * 0.25); ctx.lineTo(x + w / 2, y - h * 0.55); ctx.lineTo(x + w / 2, y); ctx.closePath();
    const gr = ctx.createLinearGradient(0, y - h, 0, y);
    gr.addColorStop(0, '#fff3cf'); gr.addColorStop(0.5, '#e7bd6a'); gr.addColorStop(1, '#9a6a24');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3b2608'; ctx.stroke();
    ctx.fillStyle = '#d8342a'; ctx.beginPath(); ctx.arc(x, y - h * 0.35, w * 0.08, 0, Math.PI * 2); ctx.fill();
}
function drawRulerCrowns(plates) {
    const ruler = rulerOwner(); if (!ruler || !plates) return;
    setScreen(ctx);
    for (const it of plates) {
        if (islandOwnerOf(it.isl.id) !== ruler) continue;
        const w = Math.max(12, Math.min(24, it.rect.h * 0.85));
        drawCrown(it.rect.x + it.rect.h * 0.5, it.rect.y + 2, w);
    }
}
var lastRuler, lastGoodTitle = null;       // the player's title under the current ruler (a new ruler wipes all titles)
function checkRuler() {             // announces a change of ruler once
    const r = rulerOwner();
    if (lastRuler === undefined || r === lastRuler) { lastRuler = r; lastGoodTitle = titleOf('player'); return; }
    const was = lastRuler; lastRuler = r;
    const lost = lastGoodTitle && r !== 'player' ? ' Dein Titel „' + lastGoodTitle.name + '“ ist verfallen, der ' + (lastGoodTitle.good ? 'Goldring' : 'rote Ring') + ' ist weg.' : ''; lastGoodTitle = null;
    if (r === 'player') statBump('throne');
    if (r && r !== 'player' && botById[r]) { const bs = loadBotState()[r]; bs.stats = bs.stats || {}; bs.stats.ruled = 1; saveBotState(); }
    if (r === 'player') { flashHint('Du bist Herrscher der Meere! +25 % Münzen und Truppen, blutrot-goldener Ring um deine Basen.', 6000); spawnBattleFx(megaTempleId, true, 'Herrscher!', 'Herrscher der Meere'); }
    else if (was === 'player') flashHint('Du hast den Mega-Tempel verloren – die Krone und der blutrot-goldene Ring sind weg!', 5000);
    else if (r && botById[r]) flashHint(botById[r].name + ' ist jetzt Herrscher der Meere!' + lost, lost ? 6000 : 4000);
    else if (lost) flashHint(lost.trim(), 5000);
    updateHudPlayer(); requestRender();
}
