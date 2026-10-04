// ===== Teil 09-events.js: Funde, Ressourcenfelder, Barbaren-Lager + Tagesboss, Events, Invasion, Drache, Armeen, Wegmarken =====
// ===== MAP PICKUPS (mini events, player only) =====
// Every 20-45 s a coin pouch, gem or troop banner appears on land inside the current view; tapping collects it.
const PICKUP_MAX = 3, PICKUP_LIFE_MS = 40000, PICKUP_HIT_PX = 30;
let pickups = [], pickupFx = [], nextPickupAt = Date.now() + 8000;
function pickupAmount(kind) {
    const L = Math.max(playerLvl, 1);
    if (kind === 'gem') return 1 + Math.floor(Math.random() * 3);
    if (kind === 'troops') return Math.max(100, niceRound(levelRewardTroops(Math.max(L, 2)) * 0.05));
    return Math.max(200, niceRound(levelRewardCoins(L) * 0.1));
}
function pickupScreenPos(p) { return { x: p.x * mapState.zoom + mapState.offsetX, y: p.y * mapState.zoom + mapState.offsetY }; }
function trySpawnPickup() {
    if (pickups.length >= PICKUP_MAX || document.hidden || mapState.zoom < 0.012) return;
    const top = 110, bottom = viewH - 150;
    if (bottom - top < 80) return;
    for (let attempt = 0; attempt < 120; attempt++) {
        const sx = 40 + Math.random() * (viewW - 80), sy = top + Math.random() * (bottom - top);
        const w = screenToWorld(sx, sy);
        const lm = landmasses.find(l => Math.hypot(w.x - l.x, w.y - l.y) <= l.shapeMaxR && pointInPolygon(w.x, w.y, l.shape));
        if (!lm || !isCellOpen(w.x, w.y)) continue;
        const clear = 30 / mapState.zoom;
        if ((islandsByLandmass[lm.id] || []).some(i => Math.hypot(i.x - w.x, i.y - w.y) < i.radius + clear)) continue;
        if (bannerHitRects.some(b => sx > b.x - 26 && sx < b.x + b.w + 26 && sy > b.y - 26 && sy < b.y + b.h + 26)) continue;   // keep nameplates tappable
        if (pickups.some(p => Math.hypot(p.x - w.x, p.y - w.y) < clear * 1.5)) continue;
        const r = Math.random(), kind = r < 0.15 ? 'gem' : r < 0.55 ? 'troops' : 'coin';
        pickups.push({ x: w.x, y: w.y, kind, amount: pickupAmount(kind), born: performance.now(), expires: Date.now() + PICKUP_LIFE_MS });
        requestRender();
        return;
    }
}
function tickPickups() {
    const now = Date.now();
    const before = pickups.length;
    pickups = pickups.filter(p => p.expires > now);
    if (pickups.length !== before) requestRender();
    if (now >= nextPickupAt) { trySpawnPickup(); nextPickupAt = now + 20000 + Math.random() * 25000; }
}
function collectPickupAt(sx, sy) {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i], s = pickupScreenPos(p);
        if (Math.hypot(s.x - sx, s.y - sy) > PICKUP_HIT_PX) continue;
        pickups.splice(i, 1);
        let label;
        if (p.kind === 'gem') { gems += p.amount; label = '+' + fmtNum(p.amount) + (p.amount === 1 ? ' Gem' : ' Gems'); }
        else if (p.kind === 'troops') {
            const baseId = rewardBaseId();
            if (baseId !== null) eigeneTruppenDazu(baseId, p.amount, 'fund');
            label = '+' + fmtNum(p.amount) + ' Truppen';
        } else { coins += p.amount; label = '+' + fmtNum(p.amount) + ' Münzen'; }
        pickupFx.push({ x: p.x, y: p.y, kind: p.kind, label, born: performance.now() });
        sfx(p.kind === 'gem' ? 'gem' : 'coin');
        questProgress('pickup', 1);
        updateHud();
        saveGame();
        requestRender();
        return true;
    }
    return false;
}
function drawPickups(now) {          // screen space (setScreen active)
    for (const p of pickups) {
        const s = pickupScreenPos(p);
        if (s.x < -40 || s.y < -40 || s.x > viewW + 40 || s.y > viewH + 40) continue;
        const age = now - p.born, left = p.expires - Date.now();
        let a = Math.min(1, age / 400);
        if (left < 5000) a *= 0.55 + 0.45 * Math.abs(Math.sin(left / 160));   // blinks before it disappears
        const bob = Math.sin(now / 420 + p.x) * 3, pop = age < 400 ? 0.6 + 0.4 * Math.sin(age / 400 * Math.PI / 2) : 1;
        const r = 17 * pop, cx = s.x, cy = s.y + bob;
        ctx.save();
        ctx.globalAlpha = a;
        const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
        glow.addColorStop(0, p.kind === 'gem' ? 'rgba(127,211,255,.45)' : 'rgba(236,208,138,.45)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#15120c'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = p.kind === 'gem' ? '#8fd8ff' : '#e4c886'; ctx.stroke();
        drawGlyph(ctx, p.kind === 'gem' ? 'gem' : p.kind === 'troops' ? 'troops' : 'coin', cx, cy, r * 1.3,
            p.kind === 'gem' ? '#8fd8ff' : p.kind === 'troops' ? '#efe8d6' : '#e8c46e');
        ctx.restore();
    }
    pickupFx = pickupFx.filter(f => now - f.born < 1200);
    for (const f of pickupFx) {
        const t = (now - f.born) / 1200, s = pickupScreenPos(f);
        ctx.save();
        ctx.globalAlpha = 1 - t * t;
        ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,9,12,.85)'; ctx.lineJoin = 'round';
        const y = s.y - 26 - t * 42;
        ctx.strokeText(f.label, s.x, y);
        ctx.fillStyle = f.kind === 'gem' ? '#9fe0ff' : f.kind === 'troops' ? '#f1ece0' : '#f0d58f';
        ctx.fillText(f.label, s.x, y);
        ctx.restore();
    }
    if (pickups.length || pickupFx.length) liveAnimation = true;
}

// The first-launch map tutorial only explains the map; once a panel opens it would just
// sit on top of the panel header, so it is dismissed (other hints are left alone).
const TUTORIAL_HINT = 'Ziehen zum Bewegen · Pinch oder Mausrad zum Zoomen · Basis antippen für Aktionen';
function dismissTutorialHint() {
    if (hintEl.textContent !== TUTORIAL_HINT) return;
    clearTimeout(hintResetTimer);
    hintEl.textContent = defaultHint;
}

// A convex/concave hull spanning every owned island used to draw
// ONE connected border around the whole territory - but with bases
// scattered sparsely across a landmass, any two owned islands with
// empty or neutral ground between them get that ground swept into
// the hull's interior too, making unowned bases look like they're
// "inside your border". So each owned island gets its own halo
// circle instead - but two halos only ever get visually bridged
// into one blob when the straight line between them is checked and
// confirmed completely clear of every other base (owned by anyone
// or neutral) - never assumed just because the bases are close.
const TERRITORY_PADDING = 250;
const TERRITORY_CONNECT_MAX_DIST = 6000;

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const len2 = abx * abx + aby * aby;
    let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx, cy = ay + t * aby;
    return Math.hypot(px - cx, py - cy);
}

// Only bridges a and b if NO other base on the same landmass - not
// owned by either side, including neutral ones - sits anywhere in
// the strip directly between their two halos.
function canConnectHalos(a, b, corridorHalfWidth) {
    for (const isl of islandsByLandmass[a.landmassId] || []) {
        if (isl.id === a.id || isl.id === b.id) continue;
        if (pointToSegmentDistance(isl.x, isl.y, a.x, a.y, b.x, b.y) < corridorHalfWidth + isl.radius) return false;
    }
    return true;
}

// Island tap/click handling: gestures and taps come from the Pointer Events state machine (camera block)

// ===== RESSOURCENFELDER: gold mines and gem veins out on the map. Send troops to gather, they come home with the
// loot. Bots gather too - and whoever is sitting on a field can be driven off it by a stronger army.
const FIELD_KINDS = {
    gold: { name: 'Goldmine', what: 'Münzen', icon: 'coin', load: 10, base: 40000, col: '#e8c547' },
    gem:  { name: 'Edelsteinader', what: 'Gems', icon: 'gem', load: .02, base: 20, col: '#7fd0ff' },
    // Paket D: Rohstoffe – gleiche RoK-Regel (feste Dauer, Truppen = Traglast). g = Geschlecht für „der/dem/zur/zum“
    holz:  { name: 'Holzfällerei', what: 'Holz', icon: 'wood', load: 2, base: 8000, col: '#c08a4c', roh: 'h' },
    stein: { name: 'Steinbruch', what: 'Stein', icon: 'stone', load: 2, base: 8000, col: '#aab3bd', roh: 's', g: 'm' },
    eisen: { name: 'Eisenmine', what: 'Eisen', icon: 'iron', load: 1.5, base: 6000, col: '#8fb6e0', roh: 'e' }
};
const fArt = (K, fall) => ({ dat: K.g === 'm' ? 'dem' : 'der', akk: K.g === 'm' ? 'den' : 'die', zu: K.g === 'm' ? 'zum' : 'zur' })[fall] + ' ' + K.name;   // „an der Goldmine“, „zum Steinbruch“
// Sammeln wie bei RoK (2.10.): ein Feld leert sich in fester Zeit – außen 1 Std., ganz innen 4 Std. –, egal wie viele Truppen.
// Die Truppen bestimmen nur, wie viel sie tragen können. Gems: außen 20, innen ~150 (vorher bis 18.000 in unter einer Minute).
const fieldCapFor = (kind, rm) => Math.round(kind === 'gem' ? FIELD_KINDS.gem.base * Math.pow(rm, .35) : FIELD_KINDS[kind].base * rm);
const fieldDauerSec = rm => 3600 * (1 + 3 * Math.log(Math.max(1, rm)) / Math.log(300));
const FIELD_REGEN_MS = 60 * 60000;
const resFields = (() => {
    const out = [], r = mulberry32(7771);
    for (const lm of landmasses) {
        if (lm.tier !== 'outer' || lm.ring < 2) continue;
        const want = lm.ring >= 5 ? 3 : 2, near = islandsByLandmass[lm.id] || [];
        for (let k = 0, tries = 0; k < want && tries < 60; tries++) {
            const x = lm.x + (r() * 2 - 1) * lm.shapeMaxR * .8, y = lm.y + (r() * 2 - 1) * lm.shapeMaxR * .8;
            if (!aufLand(lm, x, y)) continue;
            if (near.some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 2.4) || out.some(f => Math.hypot(f.x - x, f.y - y) < ISLAND_RADIUS * 4)) continue;
            const kind = r() < .78 ? 'gold' : 'gem';
            out.push({ id: 'f' + out.length, x, y, landmassId: lm.id, radius: ISLAND_RADIUS * .6, kind, cap: fieldCapFor(kind, ringMult(lm)), dauer: fieldDauerSec(ringMult(lm)) }); k++;
        }
    }
    // Paket D: Rohstoff-Felder dazu (eigener Zufall – die Gold- und Gem-Felder bleiben genau, wo sie waren). Je Region 2 (außen 3),
    // was dort häufig ist, je nach Landschaft: Wiese Holz, Wüste Stein, Schnee Eisen
    const r2 = mulberry32(9917), arten = { green: ['holz', 'holz', 'stein', 'eisen'], sand: ['stein', 'stein', 'holz', 'eisen'], snow: ['eisen', 'eisen', 'stein', 'holz'] };
    for (const lm of landmasses) {
        if (lm.tier !== 'outer') continue;
        const want = lm.ring >= 6 ? 3 : 2, near = islandsByLandmass[lm.id] || [], ar = arten[lm.bio] || arten.green;
        for (let k = 0, tries = 0; k < want && tries < 60; tries++) {
            const x = lm.x + (r2() * 2 - 1) * lm.shapeMaxR * .8, y = lm.y + (r2() * 2 - 1) * lm.shapeMaxR * .8;
            if (!aufLand(lm, x, y)) continue;
            if (near.some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 2.4) || out.some(f => Math.hypot(f.x - x, f.y - y) < ISLAND_RADIUS * 4)) continue;
            const kind = ar[Math.floor(r2() * ar.length)];
            out.push({ id: 'f' + out.length, x, y, landmassId: lm.id, radius: ISLAND_RADIUS * .6, kind, cap: fieldCapFor(kind, ringMult(lm)), dauer: fieldDauerSec(ringMult(lm)) }); k++;
        }
    }
    return out;
})();
const fieldById = {}; for (const f of resFields) fieldById[f.id] = f;
let fieldState = (() => { try { return JSON.parse(store.get('openWaterFields')) || {}; } catch (e) { return {}; } })();
let fieldMarches = (() => { try { return JSON.parse(store.get('openWaterFieldMarches')) || []; } catch (e) { return []; } })();
let fieldSaveAt = 0;
function saveFields(now) { if (now && now - fieldSaveAt < 5000) return; fieldSaveAt = now || Date.now(); store.set('openWaterFields', JSON.stringify(fieldState)); store.set('openWaterFieldMarches', JSON.stringify(fieldMarches)); }
window.addEventListener('pagehide', () => saveFields()); document.addEventListener('visibilitychange', () => { if (document.hidden) saveFields(); });
function fieldInfo(f) { const st = fieldState[f.id] || (fieldState[f.id] = { left: f.cap, occ: null }); if (st.regenAt && Date.now() >= st.regenAt) { st.left = f.cap; st.regenAt = 0; } return st; }
const fieldWhoName = who => who === 'player' ? 'Du' : (botById[who] || {}).name || '?';
const fieldLoadCap = (f, troops) => troops * FIELD_KINDS[f.kind].load;
const fieldCapOf = (f, o, gx) => fieldLoadCap(f, o.troops) * (1 + ((gx === undefined ? heroGatherFx(o) : gx) || HX0).carry / 100) * (AUF ? AUF.traglast(o.who) : 1);   // Packesel, Lastträger: they carry more (+ Forschung Traglast)
function fieldHurt(who, n, hx) { return who === 'player' ? hospitalTake(n, hx ? Math.min(100, hospitalPct() + hx.hosp) : undefined) : botHospitalTake(who, n, hx ? Math.min(100, botHospitalPct(who) + hx.hosp) : undefined); }
function fieldTravelSec(from, f, who) { return travelDurationSeconds(from, f, who === 'player' ? undefined : who); }
function fieldSend(who, homeId, fieldId, troops, hero, hero2) {          // troops leave a base for a field (gathering, or attacking whoever sits there) - a hero (and a Zweitheld) may lead them
    const home = islandById[homeId], f = fieldById[fieldId]; if (!home || !f || troops <= 0) return false;
    if (!marschPlatz(who)) return false;                                                      // Marsch-Plätze (Paket D)
    if (hero && (!heroOwned(who, hero) || heroBusy(who, hero))) hero = null; hero2 = heroZweitOk(who, hero, hero2); const mx = heroMarchFx(who, hero, false, hero2);
    islandTroops[homeId] = Math.max(0, (islandTroops[homeId] || 0) - troops);
    const now = Date.now(); fieldMarches.push({ who, homeId, fieldId, troops, hero: hero || null, hero2, startedAt: now, resolveAt: now + fieldTravelSec(home, f, who) / (1 + (mx ? mx.spd : 0) / 100) * 1000, back: false, load: 0 });
    saveFields(); if (who === 'player') { sfx('send'); updateHud(); saveGame(); } requestRender(); return true;
}
function fieldGoHome(f, st, now) {                                          // the gatherers pack up and walk home with what they have
    const o = st.occ; if (!o) return;
    const home = islandById[o.homeId] || islandById[playerIslandId];
    fieldMarches.push({ who: o.who, homeId: o.homeId, fieldId: f.id, troops: o.troops, hero: o.hero || null, hero2: o.hero2 || null, startedAt: now, resolveAt: now + fieldTravelSec(home, f, o.who) * 1000, back: true, load: o.got });
    st.occ = null; if (st.left <= 0) st.regenAt = now + FIELD_REGEN_MS;
}
function fieldArrive(m, now) {
    const f = fieldById[m.fieldId];
    if (!f) {                                                             // das Feld gibt es nicht (mehr): die Truppen gehen einfach nach Hause
        const own = m.who === 'player' ? ownedIslands : botOwnedIslands[m.who];
        const baseId = own && own.has(m.homeId) ? m.homeId : own && own.size ? [...own][0] : null;
        if (baseId !== null && m.troops > 0) islandTroops[baseId] = (islandTroops[baseId] || 0) + m.troops;
        return;
    }
    const st = fieldInfo(f);
    if (m.back) {                                                         // home again: troops back into a base, the loot into the coffers
        const own = m.who === 'player' ? ownedIslands : botOwnedIslands[m.who];
        const baseId = own && own.has(m.homeId) ? m.homeId : m.who === 'player' ? rewardBaseId() : own && [...own][0];
        if (baseId !== undefined && baseId !== null) islandTroops[baseId] = (islandTroops[baseId] || 0) + m.troops;
        const load = Math.floor(m.load);
        if (load > 0) evPunkte('sam', m.who, Math.max(1, 30 * load / f.cap));                              // Sammel-Rausch: ein volles Feld = 30 Punkte
        const RK = FIELD_KINDS[f.kind].roh;                                   // Paket D: Holz, Stein, Eisen
        if (m.who === 'player') { if (RK) { if (load && AUF) AUF.rohDazu('player', { [RK]: load }); } else if (f.kind === 'gold') coins += load; else gems += load; if (load && !RK) warStat(f.kind === 'gold' ? 'fieldCoins' : 'fieldGems', load); if (load) { flashHint('Sammler zurück: +' + fmtNum(load) + ' ' + FIELD_KINDS[f.kind].what + ' aus ' + fArt(FIELD_KINDS[f.kind], 'dat') + '.', 3500); sfx(f.kind === 'gem' ? 'gem' : 'coin'); } updateHud(); saveGame(); saveProgression(); }
        else if (botCoins[m.who] !== undefined) { if (RK) { if (load && AUF) AUF.rohDazu(m.who, { [RK]: load }); } else if (f.kind === 'gold') botCoins[m.who] += load; else loadBotState()[m.who].gems += load; }
        const bericht = { type: 'sammeln', fieldKind: f.kind, load, troops: m.troops, toId: baseId };   // Sammel-Bericht (auch ohne Beute: die Truppen sind zurück)
        if (m.who === 'player') addCombatLogEntry(bericht);
        else if (window.WELT && botById[m.who] && botById[m.who].mensch) WELT.bericht(m.who, bericht, 'Sammler zurück: +' + fmtNum(load) + ' ' + FIELD_KINDS[f.kind].what + '.');
        return;
    }
    const o = st.occ;
    if (o && o.who !== m.who && (ownerShielded(o.who, Math.min(now, m.resolveAt || now)) || bundFreund(o.who, m.who))) {   // (auch: dort sammelt ein Bündnis-Mitglied)                             // the gatherers there stand under a Friedensschild: back home
        const home = islandById[m.homeId] || islandById[playerIslandId];
        fieldMarches.push({ who: m.who, homeId: m.homeId, fieldId: f.id, troops: m.troops, hero: m.hero || null, hero2: m.hero2 || null, startedAt: now, resolveAt: now + fieldTravelSec(home, f, m.who) * 1000, back: true, load: 0 });
        if (m.who === 'player') flashHint('Friedensschild bei ' + fieldWhoName(o.who) + ' – deine Truppen kehren von ' + fArt(FIELD_KINDS[f.kind], 'dat') + ' zurück.', 4000);
        return;
    }
    if (!o) { st.occ = { who: m.who, troops: m.troops, homeId: m.homeId, hero: m.hero || null, hero2: m.hero2 || null, since: now, got: 0 }; if (m.who === 'player') flashHint('Deine Truppen sammeln jetzt an ' + fArt(FIELD_KINDS[f.kind], 'dat') + '.', 3000); return; }
    if (o.who === m.who) { o.troops += m.troops; if (!o.hero) { o.hero = m.hero || null; o.hero2 = m.hero2 || null; } return; }   // more of your own join the gatherers (other heroes just go along)
    if (m.who !== 'player' && botById[m.who] && botKeepsShield(botById[m.who], now)) { const home = islandById[m.homeId] || islandById[playerIslandId];   // under their own shield: no fight, back home
        fieldMarches.push({ who: m.who, homeId: m.homeId, fieldId: f.id, troops: m.troops, hero: m.hero || null, hero2: m.hero2 || null, startedAt: now, resolveAt: now + fieldTravelSec(home, f, m.who) * 1000, back: true, load: 0 }); return; }
    if (m.who === 'player') dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else botDropShield(m.who);   // a fight for the field is an attack
    const aHx = heroFieldFx(m.who, m.hero, { res: 1 }, m.hero2), dHx = heroFieldFx(o.who, o.hero, { res: 1, defending: 1, gather: 1 }, o.hero2);   // both leaders: Goldrausch, Lagerwache …
    const fb = fieldBattle(m.who, m.troops, o.who, o.troops, aHx, dHx), won = fb.won, involved = m.who === 'player' || o.who === 'player';   // a fight for the field: army against army
    const loserName = fieldWhoName(won ? o.who : m.who), winnerName = fieldWhoName(won ? m.who : o.who), oWho = o.who;
    if (won) st.occ = { who: m.who, troops: m.troops - fb.aLoss, homeId: m.homeId, hero: m.hero || null, hero2: m.hero2 || null, since: now, got: 0 }; else o.troops -= fb.dLoss;
    for (const [w, n, hx] of [[m.who, fb.aLoss, aHx], [oWho, fb.dLoss, dHx]]) fieldHurt(w, n, hx);   // both sides' Krankenhaus (+ their hero)
    evPunkte('krieg', m.who, fb.dLoss / WO_KILL_PER); evPunkte('krieg', oWho, fb.aLoss / WO_KILL_PER);   // Krieger-Woche
    const fg = fieldGold(m.who, oWho, fb, aHx, dHx);
    if (involved) {
        const youWon = (m.who === 'player') === won;
        addCombatLogEntry({ type: 'field', fieldKind: f.kind, won: youWon, attacker: fieldWhoName(m.who), defender: fieldWhoName(oWho), atk: fb.SA, def: fb.SD, gold: m.who === 'player' ? fg.a : fg.d, hA: heroTag(aHx), hD: heroTag(dHx), hx: heroReportOf(m.who === 'player' ? aHx : dHx) });
        flashHint(youWon ? 'Du hast ' + fArt(FIELD_KINDS[f.kind], 'akk') + ' gegen ' + loserName + ' gehalten/erobert.' : winnerName + ' hat dich von ' + fArt(FIELD_KINDS[f.kind], 'dat') + ' vertrieben.', 4000);
        sfx(youWon ? 'victory' : 'defeat');
    }
}
function fieldTick() {
    if (!rechnet()) return;
    const now = Date.now(), dt = 1, sr = evThemaAktiv('sam') ? 1.5 : 1;   // Sammel-Rausch: 50 % schneller
    const due = fieldMarches.filter(m => m.resolveAt <= now);
    if (due.length) { fieldMarches = fieldMarches.filter(m => m.resolveAt > now); for (const m of due) fieldArrive(m, now); saveFields(); requestRender(); }
    for (const f of resFields) {
        const st = fieldState[f.id]; if (!st || !st.occ) continue;
        const o = st.occ, gx = heroGatherFx(o), cap = fieldCapOf(f, o, gx), amt = Math.min(f.cap / f.dauer * dt * (1 + (gx ? gx.gSpd : 0) / 100) * sr * (AUF ? AUF.sammelTempo(o.who) : 1) * (typeof hdSammeln === 'function' ? hdSammeln(o.who) : 1), st.left, cap - o.got);   // (+ Forschung Sammeln)   // festes Tempo (nicht mehr Truppen × Tempo) · Spürnase: schneller
        o.got += Math.max(0, amt); st.left -= Math.max(0, amt);
        if (o.got >= cap - 1e-9 || st.left <= 0) { fieldGoHome(f, st, now); requestRender(); }
    }
    saveFields(now);
}
setInterval(fieldTick, 1000);
// drawing: the mine or the vein, the gatherers' tent in their colour with a progress ring, and your columns on the way
function fieldAt(sx, sy) { const z = mapState.zoom; if (z < .004) return null; return resFields.find(f => isCellOpen(f.x, f.y) && Math.hypot(f.x * z + mapState.offsetX - sx, f.y * z + mapState.offsetY - sy) < Math.max(16, f.radius * z)); }
function drawResFields(now, wallNow) {
    const z = mapState.zoom; if (z < .004) return;
    for (const m of fieldMarches) if (m.who === 'player') { const f = fieldById[m.fieldId], home = islandById[m.homeId]; if (!f || !home) continue;
        m.back ? drawMarchLine('send', f, home, m.startedAt, m.resolveAt, wallNow) : drawMarchLine('attack', home, f, m.startedAt, m.resolveAt, wallNow); }
    setScreen(ctx);
    const k = Math.max(.6, Math.min(2.2, z / .012));
    for (const f of resFields) {
        const x = f.x * z + mapState.offsetX, y = f.y * z + mapState.offsetY; if (x < -40 || x > viewW + 40 || y < -40 || y > viewH + 40 || !isCellOpen(f.x, f.y)) continue;
        const st = fieldState[f.id], left = st ? st.left : f.cap, empty = left <= 0;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
        if (f.kind === 'gold') {                                             // a rocky mine mouth with a heap of gold
            ctx.fillStyle = '#7d6b55'; ctx.beginPath(); ctx.moveTo(-13, 4); ctx.quadraticCurveTo(-10, -12, 0, -13); ctx.quadraticCurveTo(10, -12, 13, 4); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#1e1610'; ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-4, -3); ctx.quadraticCurveTo(0, -7, 4, -3); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
            if (!empty) { ctx.fillStyle = '#e8c547'; for (const [dx, dy, r2] of [[8, 2, 3], [11, 0, 2.2], [6, -1, 2]]) { ctx.beginPath(); ctx.arc(dx, dy, r2, 0, 7); ctx.fill(); } }
        } else if (FIELD_KINDS[f.kind].roh) {                                // Paket D: Holzfällerei (Stämme), Steinbruch (Blöcke), Eisenmine (Stollen + Erz)
            const R2 = FIELD_KINDS[f.kind].roh;
            ctx.fillStyle = R2 === 'h' ? '#5f7d3a' : '#7d756a'; ctx.beginPath(); ctx.ellipse(0, 2, 13, 5.5, 0, 0, Math.PI * 2); ctx.fill();
            if (R2 === 'h') { for (const [dx, h] of [[-8, 13], [-3, 16], [3, 12]]) { ctx.fillStyle = '#4b3420'; ctx.fillRect(dx - .8, 2 - h * .4, 1.6, h * .4); ctx.fillStyle = '#2f6a2a'; ctx.beginPath(); ctx.moveTo(dx - 4, 2 - h * .35); ctx.lineTo(dx, 2 - h); ctx.lineTo(dx + 4, 2 - h * .35); ctx.closePath(); ctx.fill(); }
                if (!empty) for (const [dx, dy] of [[6, 2], [9, 0], [7.5, -2]]) { ctx.fillStyle = '#b07a43'; ctx.beginPath(); ctx.ellipse(dx, dy, 4, 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e0b880'; ctx.beginPath(); ctx.arc(dx + 4, dy, 1.3, 0, 7); ctx.fill(); } }
            else if (R2 === 's') { ctx.fillStyle = '#9c958a'; ctx.beginPath(); ctx.moveTo(-12, 3); ctx.lineTo(-9, -9); ctx.lineTo(1, -12); ctx.lineTo(8, -6); ctx.lineTo(12, 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#4e4840'; ctx.lineWidth = 1; ctx.stroke();
                if (!empty) for (const [dx, dy, w] of [[5, 0, 4], [9, 1, 3], [7, -3, 3]]) { ctx.fillStyle = '#cfd4d9'; ctx.fillRect(dx - w / 2, dy - w / 2, w, w); ctx.strokeStyle = '#6d7680'; ctx.strokeRect(dx - w / 2, dy - w / 2, w, w); } }
            else { ctx.fillStyle = '#5d5650'; ctx.beginPath(); ctx.moveTo(-13, 4); ctx.quadraticCurveTo(-10, -12, 0, -13); ctx.quadraticCurveTo(10, -12, 13, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a241b'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#1e1610'; ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-4, -3); ctx.quadraticCurveTo(0, -7, 4, -3); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
                if (!empty) { ctx.fillStyle = '#8fb6e0'; for (const [dx, dy, r3] of [[8, 2, 2.6], [11, 0, 2], [6, -1, 1.8]]) { ctx.beginPath(); ctx.arc(dx, dy, r3, 0, 7); ctx.fill(); } } }
        } else {                                                             // blue crystals out of the rock
            ctx.fillStyle = '#6f675a'; ctx.beginPath(); ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
            if (!empty) for (const [dx, h, w] of [[-5, 12, 3], [0, 17, 4], [5, 11, 3], [9, 7, 2.4]]) { ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(dx - w, 2); ctx.lineTo(dx, 2 - h); ctx.lineTo(dx + w, 2); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(dx - w * .3, 1); ctx.lineTo(dx, 2 - h); ctx.lineTo(dx + w * .15, 1); ctx.closePath(); ctx.fill(); }
        }
        if (st && st.occ) {                                                   // the gatherers' tent and how full their packs are
            const o = st.occ, col = o.who === 'player' ? '#3f86d8' : (botById[o.who] || {}).color || '#c9423a', q = Math.min(1, o.got / Math.max(1e-9, fieldCapOf(f, o)));
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-12, -5); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a241b'; ctx.stroke();
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(0, -4, 17, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -4, 17, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        if (z >= .008) { ctx.font = '700 10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            const t = empty ? 'erschöpft' : fmtCompact(Math.floor(left)); const w = ctx.measureText(t).width + 12;
            ctx.fillStyle = 'rgba(14,14,20,.8)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y + 8 * k, w, 15, 7) : ctx.rect(x - w / 2, y + 8 * k, w, 15); ctx.fill();
            ctx.fillStyle = empty ? '#9a927f' : FIELD_KINDS[f.kind].col; ctx.fillText(t, x, y + 8 * k + 3); }
    }
}
// the field sheet: what it is, who's there, and send / call back
let fieldSheetId = null, fieldShare = .5, fieldHero = null, fieldHero2 = null;
function fieldSource(f) { let best = null, bd = Infinity; for (const id of ownedIslands) { const isl = islandById[id]; if ((islandTroops[id] || 0) < 1 || !canReach(isl.landmassId, f.landmassId)) continue;
    const d = Math.hypot(isl.x - f.x, isl.y - f.y); if (d < bd) { bd = d; best = id; } } return best; }
function openFieldSheet(f) {
    fieldSheetId = f.id; const st = fieldInfo(f), K = FIELD_KINDS[f.kind], o = st.occ, src = fieldSource(f), mine = o && o.who === 'player';
    const avail = src !== null ? islandTroops[src] || 0 : 0, send = Math.floor(avail * fieldShare);
    if (fieldHero && (!heroOwned('player', fieldHero) || heroBusy('player', fieldHero))) fieldHero = null; fieldHero2 = heroZweitOk('player', fieldHero, fieldHero2);
    liveHtml(document.getElementById('fieldSheet'),                   // (live: liveTick – neu geschrieben nur bei einer Änderung, die Uhren zählen von selbst)
        '<div class="marker-head"><b>' + icon(K.icon) + ' ' + K.name + '</b><button class="btn-x" type="button" data-fclose aria-label="Schließen">' + icon('close') + '</button></div>' +
        '<div class="field-lines"><span>Vorrat</span><b>' + (st.left <= 0 ? 'erschöpft – wächst in ' + uhrHtml(st.regenAt, 'clock') + ' nach' : fmtNum(Math.floor(st.left)) + ' ' + K.what) + '</b>' +
        '<span>Besetzt</span><b>' + (o ? fieldWhoName(o.who) + (o.hero && heroById(o.hero) ? ' mit ' + heroById(o.hero).name + (o.hero2 && heroById(o.hero2) ? ' & ' + heroById(o.hero2).name : '') : '') + ' · ' + fmtCompact(o.troops) + ' Truppen · ' + fmtNum(Math.floor(o.got)) + ' gesammelt' : 'frei') + '</b>' +
        '<span>Tragen</span><b>' + (K.load >= 1 ? (K.load * (AUF ? AUF.traglast('player') : 1)).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' ' + K.what + ' pro Truppe' : '1 Gem pro ' + Math.round(1 / K.load) + ' Truppen') + '</b></div>' +
        (mine ? '<button class="btn btn--secondary btn--sm" type="button" data-frecall>' + icon('recall') + '<span>Mit Beute heimkehren</span></button>' :
         src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher.</span></div>' :
         o && ownerShielded(o.who) ? '<div class="notice notice--gold">' + icon('shield') + '<span>' + fieldWhoName(o.who) + ' steht unter einem Friedensschild (noch ' + uhrHtml(ownerShieldUntil(o.who)) + ') – die Sammler dort kann niemand angreifen.</span></div>' :
         '<div class="seg" data-fshare>' + ['.25', '.5', '.75', '1'].map(v => '<button type="button" data-f="' + v + '"' + (+v === fieldShare ? ' class="on"' : '') + '>' + (v === '1' ? 'Alle' : Math.round(v * 100) + ' %') + '</button>').join('') + '</div>' +
         (heroSegHtml('data-fhero', fieldHero) ? '<div class="seg hero-seg">' + heroSegHtml('data-fhero', fieldHero) + '</div>' : '') +
         (heroSeg2Html('data-fhero2', fieldHero, fieldHero2) ? '<div class="seg hero-seg hero-seg2">' + heroSeg2Html('data-fhero2', fieldHero, fieldHero2) + '</div>' : '') +
         '<button class="btn btn--primary btn--sm" type="button" data-fsend>' + icon(o ? 'attack' : 'send') + '<span>' + (o ? 'Angreifen und übernehmen' : 'Sammeln') + ' · ' + fmtCompact(send) + ' von ' + islandTitle(islandById[src]) + '</span></button>'));
    document.getElementById('fieldSheet').hidden = false;
}
function closeFieldSheet() { document.getElementById('fieldSheet').hidden = true; fieldSheetId = null; }
document.getElementById('fieldSheet').addEventListener('click', e => {
    const f = fieldById[fieldSheetId]; if (!f) return;
    if (e.target.closest('[data-fclose]')) return closeFieldSheet();
    const sh = e.target.closest('[data-f]'); if (sh && e.target.closest('[data-fshare]')) { fieldShare = +sh.dataset.f; return openFieldSheet(f); }
    const fh = e.target.closest('[data-fhero]:not([disabled])'); if (fh) { fieldHero = fh.dataset.fhero || null; return openFieldSheet(f); }
    const fh2 = e.target.closest('[data-fhero2]:not([disabled])'); if (fh2) { fieldHero2 = fh2.dataset.fhero2 || null; return openFieldSheet(f); }
    if (e.target.closest('[data-frecall]')) { const st = fieldInfo(f); if (st.occ && st.occ.who === 'player') { if (alsBefehl('feldHeim', { feld: f.id })) { flashHint('Deine Sammler kehren um.', 2500); return; } fieldGoHome(f, st, Date.now()); saveFields(); flashHint('Deine Sammler kehren mit der Beute heim.', 2500); } return closeFieldSheet(); }
    if (e.target.closest('[data-fsend]')) { const src = fieldSource(f); if (src === null) return; const n = Math.floor((islandTroops[src] || 0) * fieldShare);
        if (n < 1 || !marschPlatz('player')) return; if (alsBefehl('feld', { home: src, feld: f.id, n, held: fieldHero, held2: fieldHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else if (!fieldSend('player', src, f.id, n, fieldHero, fieldHero2)) return; fieldHero = null; fieldHero2 = null; flashHint('Truppen unterwegs ' + fArt(FIELD_KINDS[f.kind], 'zu') + '.', 2500); closeFieldSheet(); }
});
// ===== BARBAREN-LAGER + TAGESBOSS: camps (Stufe 1-25) out on the land and one boss a day with a big pool of life for everyone.
// A camp of level N only after N-1 (level 1 always), 20 camp wins a day (reset at midnight) - the same for you and every other player.
const BARB_MAX_L = 25, BARB_DAY = 20, BARB_WANT = 110, DBOSS_HITS = 10, DBOSS_CAP = .05;   // camps on the map · a boss hit takes at most 5 % of its life
const barbTroopsOf = L => niceRound(2000 * Math.pow(2, L - 1));                         // 2 Tsd. at 1, ~1 Mio. at 10, ~34 Mrd. at 25
const barbLootOf = L => niceRound(barbTroopsOf(L) * .6 + 500 * L * L);                    // coins for a win (+ Angriff: Gold per warrior)
const barbTier = L => L >= 21 ? 4 : L >= 15 ? 3 : L >= 8 ? 2 : 1;                         // badge colour like the gear rarities
const DBOSS_KINDS = [{ k: 'kraken', name: 'Kraken Thalor', col: '#3fb0c4' }, { k: 'giant', name: 'Steinriese Gorm', col: '#b39b72' }, { k: 'dragon', name: 'Feuerdrache Ignar', col: '#ee6a34' }, { k: 'wraith', name: 'Nebelkönig Morvan', col: '#9d86ea' }];
const DBOSS_PRIZE = [{ gems: 300, crate: 3, sh: 30 }, { gems: 200, crate: 3, sh: 20 }, { gems: 150, crate: 3, sh: 15 }, { gems: 80, crate: 2, sh: 10 }, { gems: 30, crate: -1, sh: 5 }];   // 1 · 2 · 3 · 4-10 · everyone else who hit it
const dbossPrizeOf = i => DBOSS_PRIZE[i < 3 ? i : i < 10 ? 3 : 4];
const barbLoad = (k, d) => { try { return JSON.parse(store.get(k)) || d; } catch (e) { return d; } };
let barbState = barbLoad('openWaterBarb', { camps: [], n: 0, next: 0 }), barbMarches = barbLoad('openWaterBarbMarches', []), barbWho = barbLoad('openWaterBarbWho', {}), dayBoss = barbLoad('openWaterDayBoss', null), barbSaveAt = 0;
function saveBarb(now) { if (now && now - barbSaveAt < 5000) return; barbSaveAt = now || Date.now();
    store.set('openWaterBarb', JSON.stringify(barbState)); store.set('openWaterBarbMarches', JSON.stringify(barbMarches)); store.set('openWaterBarbWho', JSON.stringify(barbWho)); store.set('openWaterDayBoss', JSON.stringify(dayBoss)); }
window.addEventListener('pagehide', () => saveBarb()); document.addEventListener('visibilitychange', () => { if (document.hidden) saveBarb(); });
const barbCampById = id => barbState.camps.find(c => c.id === id);
function barbRec(who) { const r = barbWho[who] || (barbWho[who] = { b: 0, d: '', n: 0, h: 0 }), d = todayKey(); if (r.d !== d) { r.d = d; r.n = 0; r.h = 0; } return r; }   // b: best level beaten · n: camp wins today · h: boss hits today
const barbOut = (who, k) => barbMarches.filter(m => m.who === who && !m.back && m.k === (k || 'c')).length;
const barbLeft = who => Math.max(0, barbTagMax() - barbRec(who).n - barbOut(who));
const barbOpenFor = (who, L) => L <= barbRec(who).b + 1;
const barbPt = o => ({ id: 'barb' + (o.id || o.tid || 'b'), x: o.x, y: o.y, landmassId: o.lm, radius: ISLAND_RADIUS * .6 });
const barbFa = who => (1 + fieldAtkPct(who) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
const BARB_LMS = landmasses.filter(l => l.tier === 'outer');
function barbSpot(lm, r, edge) {                    // a free place on the land: clear of bases, fields, other camps and the boss (edge: room to the shore)
    const e = ISLAND_RADIUS * (edge || 1);
    for (let t = 0; t < 30; t++) {
        const x = lm.x + (r() * 2 - 1) * lm.shapeMaxR * .85, y = lm.y + (r() * 2 - 1) * lm.shapeMaxR * .85;
        if (!aufLand(lm, x, y) || [[e, 0], [-e, 0], [0, e], [0, -e]].some(([dx, dy]) => !aufLand(lm, x + dx, y + dy)) || (islandsByLandmass[lm.id] || []).some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 3)) continue;
        if (resFields.some(f => f.landmassId === lm.id && Math.hypot(f.x - x, f.y - y) < ISLAND_RADIUS * 2.2) || barbState.camps.some(c => Math.hypot(c.x - x, c.y - y) < ISLAND_RADIUS * 3)) continue;
        if (dayBoss && Math.hypot(dayBoss.x - x, dayBoss.y - y) < ISLAND_RADIUS * 5) continue;
        return { x, y };
    }
    return null;
}
function barbSpawn() {                              // a third near you, 40 % near someone else (at a level that fits them), the rest anywhere
    const r = Math.random(), who = r < .3 ? 'player' : r < .7 ? BOT_DEFS[Math.floor(Math.random() * BOT_DEFS.length)].id : null, own = who && (who === 'player' ? ownedIslands : botOwnedIslands[who]);
    let lm = null, L = Math.min(BARB_MAX_L, 1 + Math.floor(BARB_MAX_L * Math.pow(Math.random(), 1.7)));   // anywhere: many small camps, few big ones
    if (own && own.size) { const ids = [...own], b = islandById[ids[Math.floor(Math.random() * ids.length)]];
        if (b) { const rs = (reachableLandmassIds[b.landmassId] || [b.landmassId]).filter(l => l === b.landmassId || landmassesConnected(b.landmassId, l)); lm = landmasses[rs[Math.floor(Math.random() * rs.length)]]; }
        L = Math.max(1, Math.min(BARB_MAX_L, barbRec(who).b + 1 - Math.floor(Math.pow(Math.random(), 2) * 5))); }
    if (!lm || lm.tier !== 'outer') lm = BARB_LMS[Math.floor(Math.random() * BARB_LMS.length)];
    const p = barbSpot(lm, Math.random); if (!p) return false;
    const t = barbTroopsOf(L); barbState.camps.push({ id: 'c' + (barbState.n++), x: Math.round(p.x), y: Math.round(p.y), lm: lm.id, L, t, max: t, until: Date.now() + (3 + Math.random() * 3) * 36e5 }); return true;   // moves on after 3-6 h
}
function dbossEnsure() {                            // today's boss: the kind turns every day, the place is the same for everyone today
    const d = todayKey(); if (dayBoss && dayBoss.d === d) return dayBoss;
    const now = new Date(), n = Math.round(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime() / 864e5), K = DBOSS_KINDS[n % DBOSS_KINDS.length], r = mulberry32(n * 7919 + 13);
    const lms = BARB_LMS.filter(l => l.ring <= 3); let p = null, lm = null;
    for (let t = 0; t < 20 && !p; t++) { lm = lms[Math.floor(r() * lms.length)]; p = barbSpot(lm, r, 3.5); }
    if (!p) p = { x: lm.x, y: lm.y };
    let pool = 0; for (const bot of BOT_DEFS) { let big = 0; for (const id of botOwnedIslands[bot.id] || []) big = Math.max(big, islandTroops[id] || 0); pool += big * .25 * DBOSS_HITS * barbFa(bot.id); }
    const hp = niceRound(Math.max(5e7, pool * .8)), had = !!dayBoss;                        // life: about 80 % of what everyone's strikes (× their Angriff) can take in a day - it falls in the evening
    dayBoss = { d, k: K.k, name: K.name, x: Math.round(p.x), y: Math.round(p.y), lm: lm.id, hp, max: hp, dmg: {}, fell: 0 };
    saveBarb(); if (had) flashHint('Neuer Tagesboss: ' + K.name + ' ist erschienen!', 5000);
    return dayBoss;
}
const DBOSS_GONE = 5 * 60000;                          // a fallen boss leaves the map 5 min after it fell
let dbossOffen = '';                                // (Tagesboss: einmal am Tag seinen Platz aufdecken – er ist für alle angekündigt, wie Drache und Kriegsherr)
function dbossOnMap(now) { const b = dayBoss, da = b && b.d === todayKey() && (b.hp > 0 || (now || Date.now()) - (b.fell || 0) < DBOSS_GONE) ? b : null;
    if (da && !SYSTEM && dbossOffen !== da.d + ':' + da.x) { dbossOffen = da.d + ':' + da.x; try { revealAround(da.x, da.y, 3400, true); } catch (e) {} }
    return da; }   // today's boss while it stands (and a little after)   // today's boss while it stands (and a little after)
function barbMine() { try { return barbMarches.filter(m => m.who === 'player'); } catch (e) { return []; } }   // your columns (for the Kampf list - may run before this part loads)
const dbossKind = b => DBOSS_KINDS.find(K => K.k === b.k) || DBOSS_KINDS[0];
const dbossRanks = b => Object.entries(b.dmg || {}).sort((x, y) => y[1] - x[1]);
function barbSend(who, homeId, k, tid, troops, hero, hero2) {  // troops leave a base for a camp (k 'c'), the boss (k 'b'), the Drache (k 'd') or a Barbaren-Armee of the Invasion (k 'i') - a hero may lead them
    const home = islandById[homeId], dr = k === 'd' ? drAktiv() : null, ia = k === 'i' ? invArmee(tid) : null;
    const t = k === 'b' ? dbossEnsure() : k === 'd' ? dr : k === 'i' ? (ia && invTreffpunkt(ia, homeId, who)) : barbCampById(tid); troops = Math.floor(troops); if (!home || !t || troops < 1) return false;
    if (!marschPlatz(who)) return false;                                                      // Marsch-Plätze (Paket D)
    if (k === 'd' && (dr.hits[who] || 0) >= DR_HITS) return false;
    if (k === 'i') { t.name = 'Barbaren-Armee'; t.lm = t.lm !== undefined ? t.lm : ia.lm; }
    if (hero && (!heroOwned(who, hero) || heroBusy(who, hero))) hero = null; hero2 = heroZweitOk(who, hero, hero2); const mx = heroMarchFx(who, hero, false, hero2), now = Date.now();
    islandTroops[homeId] = Math.max(0, (islandTroops[homeId] || 0) - troops);
    barbMarches.push({ who, homeId, k, tid: k === 'b' || k === 'd' ? null : tid, d: k === 'b' ? t.d : k === 'd' ? t.start : null, L: t.L, name: t.name, x: Math.round(t.x), y: Math.round(t.y), lm: t.lm, troops, hero: hero || null, hero2, startedAt: now,
        resolveAt: now + travelDurationSeconds(home, barbPt(t), who === 'player' ? undefined : who) / (1 + (mx ? mx.spd : 0) / 100) * 1000, back: false });
    if (k === 'b') barbRec(who).h++;
    if (k === 'd') { dr.hits[who] = (dr.hits[who] || 0) + 1; evDirty = true; }
    saveBarb(); if (who === 'player') { sfx('send'); updateHud(); saveGame(); } requestRender(); return true;
}
function barbHome(m, n, now) { if (n < 1) return; const home = islandById[m.homeId] || islandById[playerIslandId]; if (!home) return;   // the survivors walk home
    barbMarches.push({ who: m.who, homeId: m.homeId, k: m.k, tid: m.tid, d: m.d, L: m.L, name: m.name, x: m.x, y: m.y, lm: m.lm, troops: Math.floor(n), hero: m.hero, hero2: m.hero2 || null, startedAt: now, resolveAt: now + travelDurationSeconds(home, barbPt(m), m.who === 'player' ? undefined : m.who) * 1000, back: true }); }
function barbCrate(who, minR) {                     // a gear crate: yours into the inventory, theirs into their spares
    const r = Math.max(minR, pickRandomRarity());
    if (who === 'player') return grantFreeCrate(r);
    if (botById[who] && botById[who].mensch && window.WELT) { WELT.nachricht(parseInt(who.slice(1), 10), { art: 'evPreis', src: 'fight', title: 'Kiste aus dem Kampf', gems: 0, sh: 0, crate: minR }); return null; }   // ein echter Spieler: ins Abholfach (vorher ging sie verloren)
    const bs = loadBotState()[who], sp = bs && bs.spare && bs.spare[pickRandomSlot()]; if (sp) sp[r] = (sp[r] || 0) + 1; return null;
}
function barbFight(who, troops, hx, foes) {         // out in the open: (troops + Gefolge) × Angriff (+ hero) × title against the camp, your shield (+ hero) saves some
    const h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1), SA = (troops + heroGefOf(h, troops)) * fa, won = SA > foes;
    const sh = Math.min(90, fieldShield(who) + h.loss), loss = won ? Math.min(troops, Math.round(foes / fa * (1 - sh / 100))) : troops;
    return { won, SA: Math.round(SA), loss, kill: won ? foes : Math.min(foes, Math.round(SA)), gef: heroGefOf(h, troops), fa, sh };
}
function barbArrive(m, now) {
    const who = m.who, isP = who === 'player';
    if (m.back) {                                    // home again
        const own = isP ? ownedIslands : botOwnedIslands[who], baseId = own && own.has(m.homeId) ? m.homeId : isP ? rewardBaseId() : own && [...own][0];
        if (baseId !== undefined && baseId !== null) islandTroops[baseId] = (islandTroops[baseId] || 0) + m.troops;
        if (isP) { updateHud(); saveGame(); } return;
    }
    if (m.k === 'b') return dbossHit(m, now);
    if (m.k === 'i') return invTreffer(m, now);                                     // Events: Barbaren-Invasion, Drache
    if (m.k === 'd') return drTreffer(m, now);
    const c = barbCampById(m.tid), rec = barbRec(who);
    if (!c || rec.n >= barbTagMax()) { barbHome(m, m.troops, now); if (isP) flashHint(c ? 'Für heute genug Lager: ' + barbTagMax() + ' / ' + barbTagMax() + ' heute.' : 'Das Lager ist schon geräumt – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), before = c.t, fb = barbFight(who, m.troops, hx, c.t), wounded = fieldHurt(who, fb.loss, hx), best0 = rec.b;   // the leader: a full rage fires now, every fight fills it
    let gold = 0, item = null, sh = null, shN = 1 + Math.floor(c.L / 5), kGold = 0;
    if (fb.won) {
        barbState.camps = barbState.camps.filter(x => x !== c); rec.n++; rec.b = Math.max(rec.b, c.L); goalBump(who, 'barb');
        kGold = Math.round(fb.kill * killGoldRate(who, hx)); gold = payGold(who, barbLootOf(c.L) + kGold);
        if (Math.random() < .1 + c.L * .015) item = isP ? (inboxAdd({ src: 'fight', crate: Math.floor(c.L / 8) }), { box: Math.floor(c.L / 8) }) : barbCrate(who, Math.floor(c.L / 8));   // yours wait in the Abholfach
        if (Math.random() < .15 + c.L * .01) sh = isP ? (inboxAdd({ src: 'fight', sh: shN }), { name: '' }) : heroGrantShards(who, shN);
        barbHome(m, m.troops - fb.loss, now);
    } else c.t = Math.max(1, Math.round(c.t - fb.kill));
    evPunkte('krieg', who, fb.kill / WO_KILL_PER);                                // Krieger-Woche
    if (!isP) return;
    const it = item && item.box !== undefined ? 'Kiste (mind. ' + RARITY_DEFS[item.box].label + ')' : '';
    addCombatLogEntry({ type: 'barb', L: c.L, won: fb.won, atk: fb.SA, def: before, left: fb.won ? 0 : c.t, kill: fb.kill, troops: m.troops, gef: fb.gef, shPct: fb.sh, loss: fb.loss, wounded, gold, kGold, crate: it, sh: sh ? shN + ' Helden-Splitter' : '',
        n: rec.n, open: Math.min(BARB_MAX_L, rec.b + 1), up: rec.b > best0 && rec.b < BARB_MAX_L, sourceId: m.homeId, attacker: 'Du', hA: heroTag(hx), hx: heroReportOf(hx) });
    spawnBattleFx({ x: c.x, y: c.y }, fb.won, fb.won ? 'Lager besiegt' : 'Abgewehrt', fb.won ? 'Stufe ' + c.L + ' · ' + rec.n + ' / ' + barbTagMax() + ' heute' : '−' + fmtCompact(fb.loss) + ' Truppen');
    flashHint(fb.won ? 'Barbaren-Lager Stufe ' + c.L + ' besiegt: +' + fmtCompact(gold) + ' Münzen' + (it ? ', Kiste: ' + it : '') + (sh ? ', ' + shN + ' Splitter' : '') + ' – abholen unter Events.' : 'Das Lager hat standgehalten – es hat jetzt noch ' + fmtCompact(c.t) + ' Krieger.', 4500);
    updateHud(); saveGame(); saveProgression(); barbSheetRefresh();
}
function dbossHit(m, now) {                         // every attack takes life off the boss (at most 5 %); a quarter of those who struck fall (Krankenhaus as usual), the rest come home
    const b = dayBoss, who = m.who, isP = who === 'player';
    if (!b || b.d !== m.d || b.d !== todayKey() || b.hp <= 0) { barbHome(m, m.troops, now); if (isP) flashHint('Der Tagesboss ist schon gefallen – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
    const dmg = Math.max(1, Math.min(b.hp, Math.round((m.troops + heroGefOf(h, m.troops)) * fa), Math.round(b.max * DBOSS_CAP)));
    const used = Math.min(m.troops, dmg / fa), loss = Math.min(m.troops, Math.round(used * .25 * (1 - Math.min(90, fieldShield(who) + h.loss) / 100))), wounded = fieldHurt(who, loss, hx);   // a quarter of those who struck
    const hp0 = b.hp; b.hp -= dmg; b.dmg[who] = (b.dmg[who] || 0) + dmg; evPunkte('boss', who, 30 * dmg / (b.max * DBOSS_CAP));   // Boss-Jagd
    const gold = payGold(who, dmg * .3 * (1 + h.gold / 100));
    barbHome(m, m.troops - loss, now);
    if (isP) {
        const rk = dbossRanks(b), gef = heroGefOf(h, m.troops);
        addCombatLogEntry({ type: 'dboss', name: b.name, dmg, loss, wounded, gold, left: Math.max(0, b.hp), max: b.max, hp0, troops: m.troops, gef, atk: Math.round((m.troops + gef) * fa), capped: dmg >= Math.round(b.max * DBOSS_CAP),
            total: b.dmg.player, rank: rk.findIndex(e => e[0] === 'player') + 1, of: rk.length, hits: barbRec('player').h, sourceId: m.homeId, attacker: 'Du', hA: heroTag(hx), hx: heroReportOf(hx) });
        spawnBattleFx({ x: b.x, y: b.y }, true, 'Treffer', '−' + fmtCompact(dmg) + ' Leben');
        flashHint('Treffer bei ' + b.name + ': ' + fmtCompact(dmg) + ' Schaden, +' + fmtCompact(gold) + ' Münzen.', 3500); updateHud(); saveGame();
    }
    if (b.hp <= 0) { b.hp = 0; b.fell = now; dbossPayout(b); }
    if (isP || barbView && barbView.kind !== 'camp') barbSheetRefresh();
}
function dbossPayout(b) {                           // the boss falls: everyone who hit it gets a prize by damage (top 3 extra)
    const rk = dbossRanks(b); let bs = null;
    rk.forEach(([who], i) => { const p = dbossPrizeOf(i); goalBump(who, 'dboss');
        if (who === 'player') { inboxAdd({ src: 'boss', title: b.name + ' · Platz ' + (i + 1), gems: p.gems, crate: p.crate >= 0 ? p.crate : -1, sh: p.sh });   // the prize is sent to the Abholfach
            addCombatLogEntry({ type: 'dbossWin', name: b.name, rank: i + 1, of: rk.length, dmg: b.dmg.player || 0, gems: p.gems, crate: p.crate >= 0 ? 'Kiste (mind. ' + RARITY_DEFS[p.crate].label + ')' : '', sh: p.sh ? p.sh + ' Helden-Splitter' : '' });
            flashHint(b.name + ' ist gefallen! Platz ' + (i + 1) + ': dein Preis liegt unter Events → Belohnung.', 5000); }
        else if (botById[who] && botById[who].mensch) {   // ein echter Spieler: der ganze Preis als Nachricht (auch die Kiste), dazu ein Bericht
            evPreis(who, 'boss', b.name + ' · Platz ' + (i + 1), p, b.d);
            evBericht(who, { type: 'dbossWin', name: b.name, rank: i + 1, of: rk.length, dmg: b.dmg[who] || 0, gems: p.gems, crate: p.crate >= 0 ? 'Kiste (mind. ' + RARITY_DEFS[p.crate].label + ')' : '', sh: p.sh ? p.sh + ' Helden-Splitter' : '' }, b.name + ' ist gefallen! Platz ' + (i + 1) + ': dein Preis liegt unter Events → Belohnung.'); }
        else if (botById[who]) { bs = bs || loadBotState(); if (bs[who]) bs[who].gems += p.gems; if (p.crate >= 0) barbCrate(who, p.crate); heroGrantShards(who, p.sh); } });
    if (bs) saveBotState();
    spawnBattleFx({ x: b.x, y: b.y }, true, b.name + ' gefallen', rk.length + ' Kämpfer belohnt');
    if (!b.dmg.player) flashHint(b.name + ' ist gefallen! ' + rk.length + ' Kämpfer werden nach Schaden belohnt.', 5000);
    saveBarb();
}
function barbTick() {
    const now = Date.now(), due = rechnet() ? barbMarches.filter(m => m.resolveAt <= now) : []; if (rechnet()) dbossEnsure();   // after midnight: the new boss first
    if (due.length) { barbMarches = barbMarches.filter(m => m.resolveAt > now); for (const m of due) barbArrive(m, now); saveBarb(); requestRender(); }
    if (now >= (barbState.next || 0) && rechnet()) {                 // new camps every 10 s (an empty map fills at once)
        barbState.next = now + 10000; let k = barbState.camps.length < BARB_WANT * .5 ? BARB_WANT : 2;
        if (barbState.camps.some(c => c.until < now)) { const aim = new Set(barbMarches.map(m => m.tid)); barbState.camps = barbState.camps.filter(c => !(c.until < now) || aim.has(c.id)); }   // old camps move on (unless someone is on the way)
        while (k-- > 0 && barbState.camps.length < BARB_WANT) barbSpawn();
        dbossEnsure(); saveBarb(now); requestRender();
    }
    for (const el of document.querySelectorAll('[data-bclock]')) el.textContent = fmtDHMS(msToMidnight() / 1000);
}
setInterval(barbTick, 1000);
// drawing: small tents with a level badge, the boss with its life bar, your columns like any march, the others' as thin lines
const barbPathMem = new WeakMap(), barbSprites = {};
function barbScreen(o) { const z = mapState.zoom; return { x: o.x * z + mapState.offsetX, y: o.y * z + mapState.offsetY }; }
const barbK = () => Math.max(.6, Math.min(2.2, mapState.zoom / .012));
function barbAt(sx, sy) {                           // → { kind: 'boss' } or { kind: 'camp', id } under a tap (or the Drache / a Barbaren-Armee)
    const ev = evAt(sx, sy); if (ev) return ev;
    const z = mapState.zoom, k = barbK(), b = dbossOnMap();
    if (b && z >= .0025 && isCellOpen(b.x, b.y)) { const s = barbScreen(b); if (Math.hypot(s.x - sx, s.y - sy - 10 * k) < Math.max(22, 26 * k)) return { kind: 'boss' }; }
    if (z < .004) return null;
    let best = null, bd = Math.max(16, 15 * k);
    for (const c of barbState.camps) { if (!isCellOpen(c.x, c.y)) continue; const s = barbScreen(c), d = Math.hypot(s.x - sx, s.y - sy + 4 * k); if (d < bd) { bd = d; best = c; } }
    return best ? { kind: 'camp', id: best.id } : null;
}
function barbAlong(pts, q) {                        // the point q (0-1) along a screen polyline
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); tot += l; }
    let d = tot * q; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, d / seg[i]) : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f }; } d -= seg[i]; }
    return pts[0];
}
function dbossSprite(kind, col) {                   // each boss drawn once into a small image
    if (barbSprites[kind]) return barbSprites[kind];
    const cv = document.createElement('canvas'); cv.width = cv.height = 120; const g = cv.getContext('2d'); g.translate(60, 70);
    const dark = '#1b1418', eye = kind === 'wraith' ? '#bff3ff' : '#ffd24a';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 36, 40, 10, 0, 0, 7); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = dark; g.fillStyle = col;
    if (kind === 'kraken') {                          // a dome head with tentacles curling out of the ground
        g.beginPath(); g.ellipse(0, -6, 24, 30, 0, Math.PI, 0); g.lineTo(24, 16); g.quadraticCurveTo(0, 26, -24, 16); g.closePath(); g.fill(); g.stroke();
        for (let i = -3; i <= 3; i++) { if (!i) continue; const s = Math.sign(i), a = Math.abs(i); g.beginPath(); g.moveTo(i * 6, 18); g.bezierCurveTo(i * 10, 34, s * (22 + a * 10), 38, s * (26 + a * 8), 20 - a * 6);   // tentacles curling out in front
            g.lineWidth = 7; g.strokeStyle = dark; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = col; g.stroke(); }
        g.lineWidth = 2.5; g.strokeStyle = dark;
    } else if (kind === 'giant') {                    // a hulk of stone with fists
        g.beginPath(); g.moveTo(-30, 34); g.lineTo(-34, -6); g.lineTo(-18, -26); g.lineTo(18, -26); g.lineTo(34, -6); g.lineTo(30, 34); g.closePath(); g.fill(); g.stroke();
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 38, 18, 11, 0, 7); g.fill(); g.stroke(); }
        g.beginPath(); g.arc(0, -30, 14, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-4, 8); g.lineTo(-12, 22); g.moveTo(12, 0); g.lineTo(20, 16); g.stroke();
    } else if (kind === 'dragon') {                   // wings up, a long neck and a horned head
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 50, -34); g.lineTo(s * 40, -8); g.lineTo(s * 52, -2); g.lineTo(s * 30, 14); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); }
        g.fillStyle = col; g.beginPath(); g.ellipse(0, 16, 20, 18, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(-4, -22, 4, -34); g.lineTo(18, -30); g.lineTo(10, -22); g.quadraticCurveTo(6, -8, 8, 4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#f2e6c8'; g.beginPath(); g.moveTo(2, -34); g.lineTo(-4, -44); g.lineTo(8, -35); g.fill();
    } else {                                          // a hooded shade in torn robes
        g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(28, -34, 30, 34); g.lineTo(18, 26); g.lineTo(8, 36); g.lineTo(-4, 26); g.lineTo(-16, 36); g.lineTo(-30, 34); g.quadraticCurveTo(-28, -34, 0, -40); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = dark; g.beginPath(); g.ellipse(0, -18, 13, 15, 0, 0, 7); g.fill();
    }
    const ey = kind === 'dragon' ? -30 : kind === 'giant' ? -32 : kind === 'wraith' ? -18 : -4;   // glowing eyes: a soft halo, then the eye
    for (const s of kind === 'dragon' ? [1] : [-1, 1]) for (const [r, a] of [[6, .25], [2.8, 1]]) { g.globalAlpha = a; g.fillStyle = eye; g.beginPath(); g.arc((kind === 'dragon' ? 10 : 0) + s * 6, ey, r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    return barbSprites[kind] = cv;
}
function drawBarb(now, wallNow) {
    const z = mapState.zoom; if (z < .0025) return;
    for (const m of barbMarches) {                   // the columns: yours like every march, the others' as thin lines in their colour
        const home = islandById[m.homeId]; if (!home) continue;
        const pt = barbPt(m);
        if (m.who === 'player') { m.back ? drawMarchLine('send', pt, home, m.startedAt, m.resolveAt, wallNow) : drawMarchLine('attack', home, pt, m.startedAt, m.resolveAt, wallNow); continue; }
        if (z < .006 || (!isCellOpen(pt.x, pt.y) && !isCellOpen(home.x, home.y))) continue;
        let p = barbPathMem.get(m); if (!p) { p = m.back ? marchPath(pt, home) : marchPath(home, pt); barbPathMem.set(m, p); }
        const sp = p.map(q => ({ x: toSX(q.x), y: toSY(q.y) })); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const q of sp) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        if (x1 < -20 || x0 > viewW + 20 || y1 < -20 || y0 > viewH + 20) continue;
        const col = (botById[m.who] || {}).color || '#c9423a', q = Math.max(0, Math.min(1, (wallNow - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))), at = barbAlong(sp, q);
        setScreen(ctx); ctx.save(); ctx.globalAlpha = .55; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -(now / 50) % 22; ctx.lineWidth = 1.6; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i].x, sp[i].y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.strokeStyle = 'rgba(8,9,12,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(at.x, at.y, 4, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
        liveAnimation = true;
    }
    setScreen(ctx);
    const k = barbK(), best = barbRec('player').b;
    if (z >= .004) for (const c of barbState.camps) {
        const x = c.x * z + mapState.offsetX, y = c.y * z + mapState.offsetY; if (x < -40 || x > viewW + 40 || y < -40 || y > viewH + 40 || !isCellOpen(c.x, c.y)) continue;
        const open = c.L <= best + 1, rd = RARITY_DEFS[barbTier(c.L)];
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (!open) ctx.globalAlpha = .6;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 5, 15, 5, 0, 0, 7); ctx.fill();
        for (const [dx, s, col] of [[-6, 1, '#8a5a33'], [6, .8, '#a0412e']]) {        // two hide tents
            ctx.fillStyle = col; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx - 8 * s, 5); ctx.lineTo(dx, 5 - 13 * s); ctx.lineTo(dx + 8 * s, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1e140c'; ctx.beginPath(); ctx.moveTo(dx - 2 * s, 5); ctx.lineTo(dx, 5 - 6 * s); ctx.lineTo(dx + 2 * s, 5); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, -16); ctx.stroke();   // a skull pole with a rag
        ctx.fillStyle = '#b8342a'; ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(1, -14); ctx.lineTo(-6, -11); ctx.fill();
        ctx.fillStyle = '#ffae3a'; ctx.beginPath(); ctx.arc(0, 6, 1.8 + Math.sin(now / 160 + c.x) * .4, 0, 7); ctx.fill();   // the fire
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(11, -9, 6.5, 0, 7); ctx.fillStyle = 'rgba(14,12,16,.92)'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = open ? rd.color : '#6b6660'; ctx.stroke();
        ctx.fillStyle = open ? '#f4ecdc' : '#9a938a'; ctx.font = '800 7.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.L), 11, -8.6);
        ctx.restore();
    }
    const b = dbossOnMap(); if (!b || !isCellOpen(b.x, b.y)) return;
    const s = barbScreen(b), kb = Math.max(.55, Math.min(1.6, z / .02)); if (s.x < -120 || s.x > viewW + 120 || s.y < -120 || s.y > viewH + 120) return;
    const K = dbossKind(b), dead = b.hp <= 0, pulse = .5 + .5 * Math.sin(now / 420);
    if (!dead) { const R = 64 * kb, gr = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, R); gr.addColorStop(0, K.col + '66'); gr.addColorStop(1, K.col + '00'); ctx.globalAlpha = .6 + .4 * pulse; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    const im = dbossSprite(b.k, K.col), W = 84 * kb; ctx.save(); if (dead) { ctx.globalAlpha = .45; ctx.filter = 'grayscale(1)'; }
    ctx.drawImage(im, s.x - W / 2, s.y - W * 70 / 120 - (dead ? 0 : Math.sin(now / 600) * 2 * kb), W, W); ctx.restore();
    const bw = Math.max(70, 96 * kb), by = s.y + 26 * kb;                                    // name and life
    ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = dead ? b.name + ' · besiegt' : b.name, tw = ctx.measureText(label).width + 16;
    rr(ctx, s.x - tw / 2, by, tw, 18, 9); ctx.fillStyle = 'rgba(18,10,14,.9)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.col; ctx.stroke();
    ctx.fillStyle = '#fbeee4'; ctx.fillText(label, s.x, by + 9.5);
    if (!dead) { rr(ctx, s.x - bw / 2, by + 22, bw, 6, 3); ctx.fillStyle = 'rgba(10,8,10,.85)'; ctx.fill(); rr(ctx, s.x - bw / 2 + 1, by + 23, Math.max(2, (bw - 2) * b.hp / b.max), 4, 2); ctx.fillStyle = '#e0483a'; ctx.fill(); }
    liveAnimation = true;
}
// the sheet: a camp, the boss, or both at a glance (map button)
let barbView = null, barbShare = 'fit', barbHero = null, barbHero2 = null;
const barbSheetEl = document.getElementById('barbSheet');
function barbSource(pt, need, any) {                // your base for this march: the nearest one that has enough, else the one with the most
    let best = null, bs = -Infinity;
    for (const id of ownedIslands) { const isl = islandById[id], n = islandTroops[id] || 0; if (n < 1 || (!any && !canReach(isl.landmassId, pt.lm))) continue;
        const s = (n >= need ? 1e12 : n) - Math.hypot(isl.x - pt.x, isl.y - pt.y) / 1e3; if (s > bs) { bs = s; best = id; } }
    return best;
}
const barbShares = () => barbView && (barbView.kind === 'boss' || barbView.kind === 'drache') ? [['.1', '10 %'], ['.25', '25 %'], ['.5', '50 %'], ['1', 'Alle']] : [['fit', 'Passend'], ['.25', '25 %'], ['.5', '50 %'], ['1', 'Alle']];
const barbShareNow = () => barbShares().some(x => x[0] === barbShare) ? barbShare : barbShares()[1][0];
function barbShareOf(avail, need) { const sh = barbShareNow(); return Math.max(0, Math.min(avail, sh === 'fit' ? Math.ceil(need) : Math.floor(avail * +sh))); }
function barbAttackHtml(avail, need, src, lbl) {    // share, hero and the button
    const n = barbShareOf(avail, need);
    if (barbHero && (!heroOwned('player', barbHero) || heroBusy('player', barbHero))) barbHero = null; barbHero2 = heroZweitOk('player', barbHero, barbHero2);
    return '<div class="seg">' + barbShares().map(([v, t]) => '<button type="button" data-bs="' + v + '"' + (v === barbShareNow() ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>' +
        (heroSegHtml('data-bhero', barbHero) ? '<div class="seg hero-seg">' + heroSegHtml('data-bhero', barbHero) + '</div>' : '') +
        (heroSeg2Html('data-bhero2', barbHero, barbHero2) ? '<div class="seg hero-seg hero-seg2">' + heroSeg2Html('data-bhero2', barbHero, barbHero2) + '</div>' : '') +
        '<button class="btn btn--primary btn--sm" type="button" data-bgo' + (n < 1 ? ' disabled' : '') + '>' + icon('attack') + '<span>' + lbl + ' · ' + fmtCompact(n) + ' von ' + islandTitle(islandById[src]) + '</span></button>';
}
function barbSheetHtml() {
    const v = barbView, rec = barbRec('player'), head = (ic, t) => '<div class="marker-head"><b>' + icon(ic) + ' ' + t + '</b><button class="btn-x" type="button" data-bclose aria-label="Schließen">' + icon('close') + '</button></div>';
    if (v.kind === 'inv') return invSheetHtml(head);                                 // Events
    if (v.kind === 'drache') return drSheetHtml(head);
    const b = dbossEnsure(), mid = '<b data-bclock>' + fmtDHMS(msToMidnight() / 1000) + '</b>';
    if (v.kind === 'camp') {
        const c = barbCampById(v.id); if (!c) return head('attack', 'Barbaren-Lager') + '<div class="notice">' + icon('check') + '<span>Dieses Lager ist schon geräumt.</span></div>';
        const open = barbOpenFor('player', c.L), left = barbLeft('player'), need = c.t * 1.15 / barbFa('player'), src = barbSource(c, need), rd = RARITY_DEFS[barbTier(c.L)];
        return head('attack', 'Barbaren-Lager <span class="barb-lv" style="--bc:' + rd.color + '">Stufe ' + c.L + '</span>') +
            '<div class="field-lines"><span>Krieger</span><b>' + fmtNum(c.t) + (c.t < c.max ? ' <small>von ' + fmtCompact(c.max) + '</small>' : '') + '</b>' +
            '<span>Beute</span><b>' + fmtCompact(barbLootOf(c.L)) + ' Münzen</b><span>Mit Glück</span><b>Kiste · ' + (1 + Math.floor(c.L / 5)) + ' Splitter</b>' +
            '<span>Heute</span><b>' + rec.n + ' / ' + barbTagMax() + ' heute</b>' +
            '<span>Freigeschaltet</span><b>bis Stufe ' + Math.min(BARB_MAX_L, rec.b + 1) + '</b></div>' +
            (!open ? '<div class="notice">' + icon('lock') + '<span>Erst ein Lager der Stufe ' + (c.L - 1) + ' besiegen – dann ist Stufe ' + c.L + ' dran.</span></div>' :
             left <= 0 ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Für heute genug: ' + barbTagMax() + ' / ' + barbTagMax() + ' heute. Neue Lager in ' + mid + '.</span></div>' :
             src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher.</span></div>' :
             barbAttackHtml(islandTroops[src] || 0, need, src, 'Angreifen'));
    }
    const K = dbossKind(b), rk = dbossRanks(b), mine = rk.findIndex(e => e[0] === 'player'), dead = b.hp <= 0;
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + escapeHtml(fieldWhoName(e[0])) + '</span><b>' + fmtCompact(e[1]) + '</b></li>';
    const bossHtml = head('crown', 'Tagesboss · ' + K.name) +
        '<div class="barb-hp"><i style="width:' + (b.hp / b.max * 100).toFixed(1) + '%"></i><span>' + (dead ? 'Besiegt' : fmtCompact(b.hp) + ' / ' + fmtCompact(b.max) + ' Leben') + '</span></div>' +
        '<div class="field-lines"><span>' + (dead ? 'Neuer Boss in' : 'Verschwindet in') + '</span>' + mid + '<span>Deine Angriffe</span><b>' + rec.h + ' / ' + dbossHitsMax() + ' heute</b>' +
        '<span>Dein Schaden</span><b>' + (mine >= 0 ? fmtCompact(rk[mine][1]) + ' · Platz ' + (mine + 1) : '–') + (barbOut('player', 'b') ? ' <small>· Angriff unterwegs</small>' : '') + '</b></div>' +
        (rk.length ? '<ol class="barb-rank">' + rk.slice(0, 5).map(row).join('') + (mine >= 5 ? row(rk[mine], mine) : '') + '</ol>' : '<div class="notice">' + icon('info') + '<span>Noch hat niemand angegriffen.</span></div>');
    const rules = '<div class="barb-note">Pro Angriff Münzen nach Schaden, ein Viertel der Kämpfer fällt, höchstens 5 % Leben pro Angriff. Fällt der Boss, gibt es für alle nach Rang Gems, Kisten und Splitter – Platz 1 bis 3 extra.</div>';
    if (v.kind === 'boss') {
        const src = barbSource(b, 1, true);
        return bossHtml + (dead ? '' : rec.h >= dbossHitsMax() ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Heute keine Angriffe mehr – morgen wieder.</span></div>' :
            src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen hat Truppen.</span></div>' : barbAttackHtml(islandTroops[src] || 0, (islandTroops[src] || 0) * .5, src, 'Angreifen')) + rules;
    }
    return bossHtml + rules;                          // (Tagesboss und Lager im Überblick: Events → Boss & Lager)
}
function barbNearest() {                            // the closest camp you may attack, the highest level first
    const home = islandById[rewardBaseId() ?? playerIslandId]; if (!home) return null; const best = barbRec('player').b;
    let pick = null, ps = -Infinity; for (const c of barbState.camps) { if (c.L > best + 1 || !isCellOpen(c.x, c.y)) continue; const s = c.L * 3 - Math.hypot(c.x - home.x, c.y - home.y) / 4000; if (s > ps) { ps = s; pick = c; } }
    return pick;
}
function openBarbSheet(v) { barbView = v; liveHtml(barbSheetEl, barbSheetHtml()); barbSheetEl.hidden = false; }
function closeBarbSheet() { barbSheetEl.hidden = true; barbView = null; }
function barbSheetRefresh() { if (barbView && !barbSheetEl.hidden) liveHtml(barbSheetEl, barbSheetHtml()); }   // (auch jede Sekunde aus liveTick)
barbSheetEl.addEventListener('click', e => {
    if (!barbView) return;
    if (e.target.closest('[data-bclose]')) return closeBarbSheet();
    const sh = e.target.closest('[data-bs]'); if (sh) { barbShare = sh.dataset.bs; return barbSheetRefresh(); }
    const hh = e.target.closest('[data-bhero]:not([disabled])'); if (hh) { barbHero = hh.dataset.bhero || null; return barbSheetRefresh(); }
    const hh2 = e.target.closest('[data-bhero2]:not([disabled])'); if (hh2) { barbHero2 = hh2.dataset.bhero2 || null; return barbSheetRefresh(); }
    const go = e.target.closest('[data-bgoto]'); if (go) { const t = go.dataset.bgoto === 'boss' ? dbossOnMap() : barbNearest(); if (!t) { if (go.dataset.bgoto !== 'boss') flashHint('Kein Lager in erforschtem Gebiet – schick zuerst Späher in den Nebel.', 3500); return barbSheetRefresh(); }
        if (!isCellOpen(t.x, t.y)) { flashHint('Der Tagesboss steht im Nebel – erforsche zuerst das Gebiet.', 3500); return; }
        flyTo(t.x, t.y, { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .2 }); return openBarbSheet(go.dataset.bgoto === 'boss' ? { kind: 'boss' } : { kind: 'camp', id: t.id }); }
    if (!e.target.closest('[data-bgo]')) return;
    if (!marschPlatz('player')) return;                                                        // Marsch-Plätze (Paket D)
    if (barbView.kind === 'drache') { const D = drAktiv(); if (!D || (D.hits.player || 0) >= DR_HITS) return barbSheetRefresh(); const src = barbSource(D, 1, true); if (src === null) return;
        const n = barbShareOf(islandTroops[src] || 0, (islandTroops[src] || 0) * .5); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'd', tid: null, n, held: barbHero, held2: barbHero2 })) { islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); D.hits.player = (D.hits.player || 0) + 1; } else barbSend('player', src, 'd', null, n, barbHero, barbHero2);
        flashHint('Truppen unterwegs zum Drachen.', 2500); }
    else if (barbView.kind === 'inv') { const a = invArmee(barbView.id); if (!a) return barbSheetRefresh(); const need = a.t * 1.15 / barbFa('player'), src = barbSource(invPos(a), need); if (src === null || !invTreffpunkt(a, src, 'player')) return barbSheetRefresh();
        const n = barbShareOf(islandTroops[src] || 0, need); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'i', tid: a.id, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'i', a.id, n, barbHero, barbHero2);
        flashHint('Truppen unterwegs, um die Barbaren abzufangen.', 2500); }
    else if (barbView.kind === 'camp') { const c = barbCampById(barbView.id); if (!c || !barbOpenFor('player', c.L) || barbLeft('player') <= 0) return barbSheetRefresh();
        const need = c.t * 1.15 / barbFa('player'), src = barbSource(c, need); if (src === null) return; const n = barbShareOf(islandTroops[src] || 0, need); if (n < 1) return;
        if (alsBefehl('lager', { home: src, k: 'c', tid: c.id, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'c', c.id, n, barbHero, barbHero2); flashHint('Truppen unterwegs zum Barbaren-Lager (Stufe ' + c.L + ').', 2500); }
    else { const b = dbossEnsure(); if (b.hp <= 0 || barbRec('player').h >= dbossHitsMax()) return barbSheetRefresh(); const src = barbSource(b, 1, true); if (src === null) return;
        const n = barbShareOf(islandTroops[src] || 0, (islandTroops[src] || 0) * .5); if (n < 1) return; if (alsBefehl('lager', { home: src, k: 'b', tid: null, n, held: barbHero, held2: barbHero2 })) islandTroops[src] = Math.max(0, (islandTroops[src] || 0) - n); else barbSend('player', src, 'b', null, n, barbHero, barbHero2); flashHint('Truppen unterwegs zu ' + b.name + '.', 2500); }
    barbHero = null; barbHero2 = null; closeBarbSheet();
});
// ===== EVENTS (Paket B): Wochen-Event, Barbaren-Invasion, Drache – alles rechnet der Weltrechner, Zuschauer sehen es =====
// Zeitpläne (Ortszeit des Weltrechners): Wochen-Event Mo–Fr mit wechselndem Thema (Wochenende frei),
// Invasion alle 3 Tage 20:00–21:00, Drache sonntags 19:00–22:00. Welt-Schlüssel: openWaterEvents (evState, Wochen-Event in evState.wo).
var EV_TEST = null;   // NUR für Tests in einer lokalen Kopie: { inv: Startzeit, dr: Startzeit } – im echten Spiel immer null
// ---- die 4 Themen wechseln wöchentlich im Wochen-Event (Mo–Fr): wofür es Punkte gibt + ein Bonus ----
const EV_WOCHE = [
    { k: 'sam', name: 'Sammel-Rausch', ic: 'coin', pkt: 'Gesammeltes – ein volles Feld bringt 30', bonus: 'Sammeln 50 % schneller' },
    { k: 'krieg', name: 'Krieger-Woche', ic: 'attack', pkt: 'besiegte Truppen – überall: Basen, Felder, Lager, Barbaren', bonus: '10 Barbaren-Lager mehr pro Tag' },
    { k: 'boss', name: 'Boss-Jagd', ic: 'star', pkt: 'Schaden an Tagesboss und Drache (30 je voller Treffer)', bonus: 'Kriegsherr doppelt so oft, 5 Tagesboss-Angriffe mehr' },
    { k: 'bau', name: 'Bauherr', ic: 'upgrade', pkt: 'Aufwerten von Basen (2 + neue Stufe)', bonus: 'Ausbau 20 % günstiger' }
];
// ---- WOCHEN-EVENT Mo 0:00 – Fr 23:59, Wochenende frei jede Woche eins der 4 Themen, eigene Punkte (gedeckelt), Rangliste und kleine Preise ----
const WO_PRIZES = [{ to: 1, gems: 200, sh: 10, crate: 3, t: '1.' }, { to: 3, gems: 100, sh: 5, crate: 2, t: '2.–3.' }, { to: 10, gems: 40, sh: 2, crate: 1, t: '4.–10.' }, { to: Infinity, gems: 10, sh: 1, crate: -1, t: 'Alle anderen' }];
let woWinMemo = null;
function woWin(now) {                                 // diese oder (am Wochenende) nächste Woche, Mo 0:00 – Fr 23:59: { on, start, end, key }
    now = now || Date.now(); const m = woWinMemo; if (m && now >= m.from && now < m.to) return m.w;
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Montag dieser Woche
    let start = d.getTime(), key = todayKey(d); d.setDate(d.getDate() + 5); let end = d.getTime();
    if (now >= end) { const n = new Date(start); n.setDate(n.getDate() + 7); start = n.getTime(); key = todayKey(n); n.setDate(n.getDate() + 5); end = n.getTime(); }   // Wochenende: frei
    const on = now >= start && now < end;
    woWinMemo = { w: { on, start, end, key }, from: on ? start : now, to: on ? end : start }; return woWinMemo.w;
}
function woOn(now) { return woWin(now).on; }
function woThemaAm(t) { const w = woWin(t), d = new Date(w.start); d.setHours(12, 0, 0, 0); const n = Math.floor(d.getTime() / (7 * 864e5)); return EV_WOCHE[((n % EV_WOCHE.length) + EV_WOCHE.length) % EV_WOCHE.length]; }
function evThemaAktivAm(t, k) { try { return woOn(t) && woThemaAm(t).k === k; } catch (e) { return false; } }   // (beim Laden evtl. noch nicht bereit)
function evThemaAktiv(k) { return evThemaAktivAm(Date.now(), k); }
function evPunkte(kind, who, n) { if (evThemaAktiv(kind)) woDeckel(who, n, kind); }
function woSt() { return evState.wo || (evState.wo = { pts: {}, kb: {} }); }
function woRoll(now) {                                // (nur wer rechnet) eine fertige Woche zahlt einmal aus, eine neue beginnt leer
    const W = woSt(), w = woWin(now);
    if (W.key && !W.paid && now >= W.end) woPay();
    if (w.on && W.key !== w.key) { Object.assign(W, { key: w.key, end: w.end, k: woThemaAm(now).k, pts: {}, kb: {}, paid: false }); evDirty = true; }
}
function woDeckel(who, n, kind) {                     // höchstens 30 Punkte auf einmal, im Schnitt 10 pro Minute – für alle gleich
    if (!rechnet() || !who || !(n > 0) || (who !== 'player' && !botById[who])) return; const now = Date.now(); if (!woOn(now)) return; woRoll(now);
    const W = woSt(), k = W.kb[who] || [WO_KILL_MAX, now], left = Math.min(WO_KILL_MAX, k[0] + Math.max(0, now - k[1]) / 60000 * WO_KILL_MIN), m = Math.min(WO_KILL_MAX, n, left);
    if (!(m > 0)) return; W.kb[who] = [left - m, now]; W.pts[who] = (W.pts[who] || 0) + m; evDirty = true;
}
function woPay() {                                    // Platz 1, 2–3, 4–10 und alle anderen mit Punkten – du, echte Spieler und Mitspieler gleich
    const W = woSt(), th = EV_WOCHE.find(x => x.k === W.k) || EV_WOCHE[0], list = evRang(W.pts).filter(e => e[1] >= 1);
    W.paid = true; let me = 0;
    list.forEach(([who], i) => { evPreis(who, 'woche', 'Wochen-Event ' + th.name + ' · Platz ' + (i + 1), WO_PRIZES.find(p => i + 1 <= p.to), W.key); if (who === 'player') me = i + 1; });
    W.last = { key: W.key, k: W.k, top: list.slice(0, WO_TOP).map(e => [e[0], Math.floor(e[1])]), n: list.length };
    evDirty = true; saveBotState(); saveEv();
    if (me) afterSplash(() => setTimeout(() => flashHint('Wochen-Event vorbei: Platz ' + me + ' – dein Preis liegt unter Events → Belohnung.', 6000), 2500));
}
function barbTagMax() { return BARB_DAY + (evThemaAktiv('krieg') ? 10 : 0); }
function dbossHitsMax() { return DBOSS_HITS + (evThemaAktiv('boss') ? 5 : 0); }
function evBossTakt() { return evThemaAktiv('boss') ? .5 : 1; }   // Boss-Jagd: der Kriegsherr kommt doppelt so oft

// ---- gemeinsamer Zustand ----
var evState = (() => { try { return JSON.parse(store.get('openWaterEvents')) || null; } catch (e) { return null; } })() || {};
let evDirty = false, evSaveAt = 0;
function saveEv() { evDirty = false; evSaveAt = Date.now(); store.set('openWaterEvents', JSON.stringify(evState)); }
window.addEventListener('pagehide', () => { if (evDirty && rechnet()) saveEv(); });
const evRang = o => Object.entries(o || {}).filter(e => e[1] > 0 && (e[0] === 'player' || botById[e[0]])).sort((a, b) => b[1] - a[1]);
function evPreis(who, src, title, p, schl) {          // schl: fester Schlüssel der Auszahlung (Woche, Tag …) – kommt nie doppelt an; ein Preis: deiner ins Abholfach, ein echter Mitspieler bekommt ihn als Nachricht (auch Kisten), Mitspieler direkt
    const gems = Math.round(p.gems || 0), sh = Math.round(p.sh || 0), crate = p.crate >= 0 ? p.crate : -1;
    if (who === 'player') { inboxAdd({ src, title, gems, sh, crate }); return; }
    const bd = botById[who]; if (!bd) return;
    if (bd.mensch && window.WELT) { WELT.nachricht(parseInt(who.slice(1), 10), { art: 'evPreis', src, title, gems, sh, crate }, schl != null ? src + '|' + schl : undefined); return; }
    const bs = loadBotState()[who]; if (bs) bs.gems = (bs.gems || 0) + gems; if (sh) heroGrantShards(who, sh); if (crate >= 0) barbCrate(who, crate);
}
function evBericht(who, e, hint) {                    // ein kurzer Eintrag im Kampflog (dir direkt, echten Mitspielern über den Weltrechner)
    if (who === 'player') { addCombatLogEntry(e); if (hint) flashHint(hint, 4500); return; }
    if (window.WELT && botById[who] && botById[who].mensch) WELT.bericht(who, e, hint);
}
function evPlanTag(now, ok, stunde, dauer) {          // der nächste Tag (ab heute), an dem ok(Datum) gilt, zur Stunde – solange er noch nicht vorbei ist
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 10; i++) { const t = new Date(d); t.setDate(d.getDate() + i); if (!ok(t)) continue; t.setHours(stunde, 0, 0, 0); const s = t.getTime(); if (s + dauer > now) return { start: s, end: s + dauer }; }
    return { start: now + 864e5, end: now + 864e5 + dauer };
}

// ===== BARBAREN-INVASION: alle 3 Tage um 20 Uhr eine Stunde lang kommen Wellen von Barbaren-Armeen vom Rand ihrer Insel
// und greifen die nächsten Basen an (echte Spieler und Mitspieler). Abwehren und Armeen schlagen bringt Punkte, danach
// eine kleine Belohnung nach Punkten. Barbaren erobern nichts – wer verliert, verliert Truppen.
const INV_TAGE = 3, INV_STUNDE = 20, INV_DAUER = 60 * 60000, INV_WELLEN = 6, INV_WELLE_MS = 9 * 60000, INV_PRO_WELLE = 12;
const INV_PTS_WEHR = 15, INV_PTS_SIEG = 20;
const INV_PREISE = [{ ab: 100, gems: 60, sh: 6, crate: 2, t: 'ab 100 Punkten' }, { ab: 40, gems: 30, sh: 3, crate: 1, t: 'ab 40 Punkten' }, { ab: 10, gems: 10, sh: 1, crate: -1, t: 'ab 10 Punkten' }];
const evTagNr = t => Math.round(new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12).getTime() / 864e5);
function invPlan(now) {
    now = now || Date.now();
    if (EV_TEST && EV_TEST.inv) return { start: EV_TEST.inv, end: EV_TEST.inv + INV_DAUER };
    return evPlanTag(now, t => evTagNr(t) % INV_TAGE === 0, INV_STUNDE, INV_DAUER);
}
function invAktiv(now) { const I = evState.inv; now = now || Date.now(); return I && !I.paid && now >= I.start && now < I.end + 5 * 60000 ? I : null; }
const invArmee = id => { const I = invAktiv(); return I && (I.armies || []).find(a => a.id === id) || null; };
function invPos(a, now) {                            // wo die Armee gerade ist: vom Rand gerade auf ihr Ziel zu
    const t = islandById[a.tid], q = Math.max(0, Math.min(1, ((now || Date.now()) - a.at0) / Math.max(1, a.at1 - a.at0)));
    return t ? { x: a.x0 + (t.x - a.x0) * q, y: a.y0 + (t.y - a.y0) * q, lm: a.lm, landmassId: a.lm } : { x: a.x0, y: a.y0, lm: a.lm, landmassId: a.lm };
}
function invTreffpunkt(a, homeId, who) {             // wo deine Truppen die Armee treffen (oder null: sie kämen zu spät)
    const home = islandById[homeId]; if (!home || !a) return null; const now = Date.now();
    let p = invPos(a, now);
    for (let i = 0; i < 3; i++) { const t = travelDurationSeconds(home, barbPt(p), who === 'player' ? undefined : who) * 1000; p = invPos(a, now + t); p.at = now + t; }
    return p.at < a.at1 - 3000 ? p : null;
}
function invStartPunkt(isl) {                        // am Rand ihrer Insel, auf der Seite weg von der Mitte der Karte
    const lm = landmasses[isl.landmassId], L = Math.hypot(isl.x, isl.y) || 1; let ux = isl.x / L, uy = isl.y / L;
    for (const dreh of [0, .7, -.7, 1.4, -1.4]) {
        const vx = ux * Math.cos(dreh) - uy * Math.sin(dreh), vy = ux * Math.sin(dreh) + uy * Math.cos(dreh);
        let last = 0; for (let s = ISLAND_RADIUS; s < lm.shapeMaxR * 2.2; s += ISLAND_RADIUS * .8) { if (aufLand(lm, isl.x + vx * s, isl.y + vy * s)) last = s; else if (last) break; }
        if (last >= ISLAND_RADIUS * 4) return { x: isl.x + vx * last, y: isl.y + vy * last };
    }
    return { x: isl.x + ux * ISLAND_RADIUS * 8, y: isl.y + uy * ISLAND_RADIUS * 8 };   // kleine Insel: sie kommen übers Wasser
}
// Ein Friedensschild hält die Barbaren ab. Der Anfängerschutz nicht – aber Neulinge bekommen nur halb so starke Armeen
// (meist ein Sieg mit Punkten, ein Kennenlernen statt eines Verlusts).
function invGeschuetzt(o, now) { return o === 'player' ? shieldUntil() > now : ((loadBotState()[o] || {}).shieldUntil || 0) > now; }
const invNeuling = (o, now) => (o === 'player' ? neulingBis() : botNeulingBis(o, loadBotState()[o] || {})) > now;
function invZielOk(id, used, now) {
    const isl = islandById[id], o = isl && islandOwnerOf(id);
    return !!o && isl.type === 'tower' && !used.has(id) && !midZoneIds.has(id) && !invGeschuetzt(o, now) && landmasses[isl.landmassId].tier === 'outer';
}
function invZiele(I, now) {                          // jeder echte Spieler bekommt pro Welle eine Armee (seine äußerste Basis), dazu Mitspieler-Basen
    const used = new Set(I.armies.map(a => a.tid)), out = [];
    const menschen = BOT_DEFS.filter(b => b.mensch).map(b => b.id); if (ownedIslands.size) menschen.unshift('player');
    for (const who of menschen) { let best = null, bs = -1;
        for (const id of (who === 'player' ? ownedIslands : botOwnedIslands[who]) || []) { if (!invZielOk(id, used, now)) continue; const lm = landmasses[islandById[id].landmassId], s = lm.ring * 10 + Math.random() * 5; if (s > bs) { bs = s; best = id; } }
        if (best !== null) { out.push(best); used.add(best); } }
    const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size);
    for (let n = 0, tries = 0; n < INV_PRO_WELLE && bots.length && tries < INV_PRO_WELLE * 15; tries++) {
        const own = [...botOwnedIslands[bots[Math.floor(Math.random() * bots.length)].id]], id = own[Math.floor(Math.random() * own.length)];
        if (invZielOk(id, used, now)) { out.push(id); used.add(id); n++; } }
    return out;
}
function invWelle(I, now) {                          // eine Welle: jede Armee so stark wie ihr Ziel (spätere Wellen stärker), 5–7 Min. Marsch
    const w = I.welle + 1; let mich = 0;
    for (const tid of invZiele(I, now)) {
        const isl = islandById[tid], s = invStartPunkt(isl), base = effectiveTroops(isl) + effectiveDefense(isl);
        const t = niceRound(Math.max(5000, base * (.5 + .13 * w) * (.8 + Math.random() * .4) * (invNeuling(islandOwnerOf(tid), now) ? .5 : 1)));
        I.armies.push({ id: 'i' + (I.n++), x0: Math.round(s.x), y0: Math.round(s.y), lm: isl.landmassId, tid, t, max: t, at0: now, at1: now + (5 + Math.random() * 2) * 60000, w });
        if (islandOwnerOf(tid) === 'player') mich++;
    }
    evDirty = true; requestRender();
    flashHint('Barbaren-Invasion: Welle ' + w + ' von ' + INV_WELLEN + ' rückt an!' + (mich ? ' Eine Armee marschiert auf deine Basis.' : ''), 4500);
}
function invPunkteDazu(I, who, n) { if (!who || !(n > 0) || (who !== 'player' && !botById[who])) return; I.pts[who] = (I.pts[who] || 0) + n; evDirty = true; }
function invAnkunft(I, a, now) {                     // die Armee erreicht ihr Ziel: dieselbe Rechnung wie jeder Angriff (Truppen + Verteidigung)
    const isl = islandById[a.tid], o = isl && islandOwnerOf(a.tid); if (!o || invGeschuetzt(o, now)) return;
    const vk = typeof verstVorKampf === 'function' ? verstVorKampf(a.tid) : null;   // Verstärkung (Botschaft) verteidigt mit
    const en = effectiveTroops(isl), def = effectiveDefense(isl), durch = a.t > en + def;
    const verlustAlle = Math.min(en, Math.round(durch ? en * .6 : a.t * .35));
    islandTroops[a.tid] = Math.max(0, (islandTroops[a.tid] || 0) - verlustAlle);
    const vs = vk ? verstNachKampf(a.tid, vk, false) : null, verlust = vs ? vs.eigenWeg : verlustAlle, wounded = verlust > 0 ? fieldHurt(o, verlust, null) : 0;   // (jeder seinen Anteil)
    if (vs) for (const h of vs.helfer) if (h.fallen + h.wounded > 0) bundMelden(h.w, 'Barbaren-Invasion bei ' + islandTitle(isl) + ': deine Verstärkung verlor ' + fmtCompact(h.fallen + h.wounded) + (h.wounded ? ' (' + fmtCompact(h.wounded) + ' ins Krankenhaus)' : '') + '.');
    if (!durch) { invPunkteDazu(I, o, INV_PTS_WEHR); I.wehr[o] = (I.wehr[o] || 0) + 1; evPunkte('krieg', o, a.t / WO_KILL_PER); }
    const titel = islandTitle(isl);
    evBericht(o, { type: 'ev', ic: 'defense', gut: !durch, badge: durch ? 'Überrannt' : 'Abgewehrt', title: 'Barbaren-Invasion · ' + titel,
        txt: fmtCompact(a.t) + ' Barbaren gegen ' + fmtCompact(en + def) + ' · ' + fmtCompact(verlust) + ' Truppen verloren' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (durch ? '' : ' · +' + INV_PTS_WEHR + ' Punkte'), at: now },
        durch ? 'Barbaren haben ' + titel + ' überrannt – ' + fmtCompact(verlust) + ' Truppen verloren.' : 'Barbaren-Welle bei ' + titel + ' abgewehrt: +' + INV_PTS_WEHR + ' Punkte.');
    spawnBattleFx(a.tid, !durch, durch ? 'Überrannt' : 'Abgewehrt', 'Barbaren-Invasion');
}
function invTreffer(m, now) {                        // deine (oder ihre) Truppen treffen eine Barbaren-Armee draußen
    const I = invAktiv(now), a = I && I.armies.find(x => x.id === m.tid), who = m.who, isP = who === 'player';
    if (!a) { barbHome(m, m.troops, now); if (isP) flashHint('Die Barbaren-Armee ist schon weg – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), fb = barbFight(who, m.troops, hx, a.t), wounded = fieldHurt(who, fb.loss, hx);
    const gold = payGold(who, fb.kill * .3 * (1 + (hx || HX0).gold / 100)), pts = fb.won ? INV_PTS_SIEG : Math.max(1, Math.round(INV_PTS_SIEG * fb.kill / a.max));
    if (fb.won) I.armies = I.armies.filter(x => x !== a); else a.t = Math.max(1, Math.round(a.t - fb.kill));
    invPunkteDazu(I, who, pts); evPunkte('krieg', who, fb.kill / WO_KILL_PER); goalBump(who, 'barb');
    barbHome(m, m.troops - fb.loss, now); evDirty = true;
    const ziel = islandById[a.tid], fuer = ziel && islandOwnerOf(ziel.id) !== who ? ' (auf ' + fieldWhoName(islandOwnerOf(ziel.id)) + ')' : '';
    evBericht(who, { type: 'ev', ic: 'attack', gut: fb.won, badge: fb.won ? 'Besiegt' : 'Geschwächt', title: 'Barbaren-Armee' + fuer,
        txt: fmtCompact(fb.SA) + ' gegen ' + fmtCompact(fb.won ? a.t : a.t + fb.kill) + ' Barbaren · ' + fmtCompact(fb.loss) + ' gefallen' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (gold ? ' · +' + fmtCompact(gold) + ' Gold' : '') + ' · +' + pts + ' Punkte', at: now },
        fb.won ? 'Barbaren-Armee geschlagen: +' + pts + ' Punkte.' : 'Die Barbaren-Armee ist geschwächt (noch ' + fmtCompact(a.t) + ') – +' + pts + ' Punkte.');
    if (isP) { spawnBattleFx({ x: m.x, y: m.y }, fb.won, fb.won ? 'Armee geschlagen' : 'Geschwächt', '+' + pts + ' Punkte'); updateHud(); saveGame(); }
    if (barbView && barbView.kind === 'inv') barbSheetRefresh();
}
function invAuszahlen() {                            // nach der Invasion: Belohnung nach Punkten (klein)
    const I = evState.inv; if (!I || I.paid) return; I.paid = true; I.armies = []; evDirty = true;
    let n = 0;
    for (const [who, p] of evRang(I.pts)) { const pr = INV_PREISE.find(x => p >= x.ab); if (!pr) continue; n++;
        evPreis(who, 'inv', 'Barbaren-Invasion · ' + Math.floor(p) + ' Punkte', pr, I.start); }
    if (n) flashHint('Die Barbaren-Invasion ist vorbei – ' + n + ' Verteidiger werden belohnt (Events → Belohnung).', 5000);
    saveBotState(); requestRender();
}
function invTakt(now) {                              // (nur Weltrechner) Wellen losschicken, Ankünfte, Ende
    const E = evState, p = invPlan(now); E.plan = E.plan || {};
    if (!E.plan.inv || E.plan.inv.start !== p.start) { E.plan.inv = p; evDirty = true; }
    let I = E.inv;
    if (now >= p.start && now < p.end && (!I || I.start !== p.start)) {
        if (I && !I.paid) invAuszahlen();
        I = E.inv = { start: p.start, end: p.end, welle: 0, n: 0, armies: [], pts: {}, wehr: {}, paid: false }; evDirty = true;
        flashHint('Die Barbaren-Invasion beginnt! ' + INV_WELLEN + ' Wellen in einer Stunde – verteidige deine Basen.', 6000);
    }
    if (!I || I.paid) return;
    while (I.welle < INV_WELLEN && now < I.end && now >= I.start + I.welle * INV_WELLE_MS) {     // (eine verpasste Welle fällt aus)
        if (now - (I.start + I.welle * INV_WELLE_MS) < INV_WELLE_MS) invWelle(I, now); I.welle++; evDirty = true; }
    const da = I.armies.filter(a => a.at1 <= now);
    if (da.length) { I.armies = I.armies.filter(a => a.at1 > now); for (const a of da) try { invAnkunft(I, a, now); } catch (e) { console.warn('Invasion:', e); } evDirty = true; saveGame(); requestRender(); }
    if (now >= I.end && (!I.armies.length || now >= I.end + 5 * 60000)) invAuszahlen();
}

// ===== DER DRACHE: jeden Sonntag 19–22 Uhr erscheint über dem Thron ein riesiger Drache, den nur alle zusammen besiegen.
// Jeder Angriff macht Schaden (wie beim Tagesboss, höchstens 2 % seines Lebens), 10 Angriffe pro Person.
// Fällt er: Platz 1 lila Kiste, Platz 2–10 blaue Kiste (nie Legendär – Alexander 2.10.), alle anderen etwas Kleines. Entkommt er: alle etwas Kleines.
const DR_STUNDE = 19, DR_DAUER = 3 * 3600000, DR_HITS = 10, DR_CAP = .02, DR_NAME = 'Urdrache Vharak', DR_COL = '#d8452e';
const DR_PREISE = [{ gems: 150, crate: 3, sh: 20, t: '1.' }, { gems: 60, crate: 2, sh: 8, t: '2.–10.' }, { gems: 15, crate: -1, sh: 2, t: 'Alle anderen' }];
const drPreisVon = i => DR_PREISE[i < 1 ? 0 : i < 10 ? 1 : 2];
function drPlan(now) {
    now = now || Date.now();
    if (EV_TEST && EV_TEST.dr) return { start: EV_TEST.dr, end: EV_TEST.dr + DR_DAUER };
    return evPlanTag(now, t => t.getDay() === 0, DR_STUNDE, DR_DAUER);
}
function drAktiv(now) { const D = evState.dr; now = now || Date.now(); return D && !D.paid && D.hp > 0 && now >= D.start && now < D.end ? D : null; }
function drOnMap(now) { const D = evState.dr; now = now || Date.now(); return D && now >= D.start && now < D.end && (D.hp > 0 || now - (D.fell || 0) < DBOSS_GONE) ? D : null; }
function drNeu(p) {                                  // über dem Thron; Leben: etwa 75 % von dem, was alle mit ihren Angriffen schaffen können
    const m = islandById[megaTempleId] || islands[0];
    let pool = 0; for (const bot of BOT_DEFS) { let big = 0; for (const id of botOwnedIslands[bot.id] || []) big = Math.max(big, islandTroops[id] || 0); pool += big * .25 * DR_HITS * barbFa(bot.id); }
    const hp = niceRound(Math.max(1e7, pool * .75));
    return { start: p.start, end: p.end, x: Math.round(m.x), y: Math.round(m.y - ISLAND_RADIUS * 6), lm: m.landmassId, name: DR_NAME, hp, max: hp, dmg: {}, hits: {}, fell: 0, paid: false };
}
function drTreffer(m, now) {                         // wie beim Tagesboss: Schaden (höchstens 2 %), ein Drittel der Kämpfer fällt, Münzen nach Schaden
    const D = evState.dr, who = m.who, isP = who === 'player';
    if (!D || D.paid || D.hp <= 0 || D.start !== m.d || now >= D.end) { barbHome(m, m.troops, now); if (isP) flashHint('Der Drache ist nicht mehr da – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
    const dmg = Math.max(1, Math.min(D.hp, Math.round((m.troops + heroGefOf(h, m.troops)) * fa), Math.round(D.max * DR_CAP)));
    const used = Math.min(m.troops, dmg / fa), loss = Math.min(m.troops, Math.round(used * .33 * (1 - Math.min(90, fieldShield(who) + h.loss) / 100))), wounded = fieldHurt(who, loss, hx);
    D.hp -= dmg; D.dmg[who] = (D.dmg[who] || 0) + dmg; evDirty = true;
    const gold = payGold(who, dmg * .2 * (1 + h.gold / 100));
    evPunkte('boss', who, 30 * dmg / (D.max * DR_CAP));
    barbHome(m, m.troops - loss, now);
    const rk = evRang(D.dmg), pl = rk.findIndex(e => e[0] === who) + 1;
    evBericht(who, { type: 'ev', ic: 'star', gut: true, badge: 'Drache', title: D.name, txt: fmtCompact(dmg) + ' Schaden · noch ' + fmtCompact(Math.max(0, D.hp)) + ' Leben · Platz ' + pl + ' von ' + rk.length + ' · ' + fmtCompact(loss) + ' gefallen' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (gold ? ' · +' + fmtCompact(gold) + ' Gold' : ''), at: now },
        'Treffer beim Drachen: ' + fmtCompact(dmg) + ' Schaden – Platz ' + pl + '.');
    if (isP) { spawnBattleFx({ x: D.x, y: D.y }, true, 'Treffer', '−' + fmtCompact(dmg) + ' Leben'); updateHud(); saveGame(); }
    if (D.hp <= 0) { D.hp = 0; D.fell = now; drAuszahlen(true); }
    if (barbView && barbView.kind === 'drache') barbSheetRefresh();
}
function drAuszahlen(fell) {
    const D = evState.dr; if (!D || D.paid) return; D.paid = true; evDirty = true;
    const rk = evRang(D.dmg);
    rk.forEach(([who], i) => { const p = fell ? drPreisVon(i) : DR_PREISE[2]; goalBump(who, 'dboss');
        evPreis(who, 'drache', D.name + (fell ? ' · Platz ' + (i + 1) : ' entkommen'), p, D.start); });
    flashHint(fell ? D.name + ' ist gefallen! ' + rk.length + ' Kämpfer werden nach Schaden belohnt.' : D.name + ' ist entkommen – alle Kämpfer bekommen eine kleine Belohnung.', 6000);
    if (fell) spawnBattleFx({ x: D.x, y: D.y }, true, D.name + ' gefallen', rk.length + ' Kämpfer belohnt');
    saveBotState(); requestRender();
}
function drTakt(now) {                               // (nur Weltrechner) erscheinen, entkommen
    const E = evState, p = drPlan(now); E.plan = E.plan || {};
    if (!E.plan.dr || E.plan.dr.start !== p.start) { E.plan.dr = p; evDirty = true; }
    let D = E.dr;
    if (now >= p.start && now < p.end && (!D || D.start !== p.start)) {
        if (D && !D.paid) drAuszahlen(D.hp <= 0);
        D = E.dr = drNeu(p); evDirty = true; requestRender();
        flashHint('Der Drache ist erschienen! ' + D.name + ' kreist über dem Thron – nur alle zusammen können ihn besiegen.', 7000);
    }
    if (D && !D.paid && now >= D.end) drAuszahlen(D.hp <= 0);
}

// ---- jede Sekunde ----
function evTick() {
    const now = Date.now();
    if (rechnet()) { try { invTakt(now); drTakt(now); woRoll(now); } catch (e) { console.warn('Events:', e); } if (evDirty && now - evSaveAt > 2000) saveEv(); }
    evAnzeige(now);
}
setInterval(evTick, 1000);
function evPlanVon(k) { const p = evState.plan && evState.plan[k]; return p && p.end > Date.now() ? p : k === 'inv' ? invPlan() : drPlan(); }   // was der Weltrechner sagt (sonst selbst gerechnet)
let evGesehen = null;
function evHinweise() {                              // (Zuschauer) neue Welle, Drache erschienen → kurzer Hinweis (beim Weltrechner kommt er direkt)
    const I = evState.inv, D = evState.dr, g = { w: I && !I.paid ? I.start + ':' + I.welle : '', d: D && D.hp > 0 && !D.paid ? D.start : 0 };
    if (evGesehen && !rechnet()) {
        if (g.w && g.w !== evGesehen.w && I.welle > 0) { const n = I.armies.filter(a => a.w === I.welle && islandOwnerOf(a.tid) === 'player').length;
            flashHint('Barbaren-Invasion: Welle ' + I.welle + ' von ' + INV_WELLEN + ' rückt an!' + (n ? ' Eine Armee marschiert auf deine Basis – schick Verstärkung oder fang sie ab.' : ''), 5500); if (n) sfx('warn'); }
        if (g.d && g.d !== evGesehen.d) { flashHint('Der Drache ist erschienen! ' + D.name + ' kreist über dem Thron – nur alle zusammen können ihn besiegen.', 6500); sfx('event'); }
    }
    evGesehen = g;
}
function evAnzeige(now) {                            // Uhren in Fenster und Leiste, offenes Fenster auffrischen
    evHinweise();
    for (const el of document.querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));
    if (evOffen() && now - evRenderAt > 2500) renderEvents();
}

// ---- die Karte: Barbaren-Armeen (wie Märsche: gestrichelte Linie + Marke) und der Drache ----
function evAt(sx, sy) {                              // → { kind: 'drache' } | { kind: 'inv', id } unter einem Tippen
    const z = mapState.zoom, D = drOnMap();
    if (D && z >= .0015) { const s = barbScreen(D), kb = drK(); if (Math.hypot(s.x - sx, s.y - sy + 12 * kb) < Math.max(28, 52 * kb)) return { kind: 'drache' }; }
    const I = invAktiv(); if (!I || z < .003) return null;
    let best = null, bd = 20; for (const a of I.armies) { const p = invPos(a); if (!invSichtbar(a, p)) continue; const s = barbScreen(p), d = Math.hypot(s.x - sx, s.y - sy + 6); if (d < bd) { bd = d; best = a; } }
    return best ? { kind: 'inv', id: best.id } : null;
}
const drK = () => Math.max(.45, Math.min(1.2, mapState.zoom / .025));   // so groß zeichnen (mit dem Zoom, nie riesig)
const invSichtbar = (a, p) => isCellOpen(p.x, p.y) || islandOwnerOf(a.tid) === 'player';
function drawEvents(now, wallNow) {
    const z = mapState.zoom, I = invAktiv(wallNow);
    if (I && z >= .0025) { setScreen(ctx);
        for (const a of I.armies) {
            const p = invPos(a, wallNow), t = islandById[a.tid]; if (!t || !invSichtbar(a, p)) continue;
            const s = barbScreen(p), e = barbScreen(t); if (Math.max(s.x, e.x) < -30 || Math.min(s.x, e.x) > viewW + 30 || Math.max(s.y, e.y) < -30 || Math.min(s.y, e.y) > viewH + 30) continue;
            const mine = islandOwnerOf(a.tid) === 'player', k = Math.max(.7, Math.min(1.6, z / .01));
            ctx.save(); ctx.globalAlpha = .7; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -(now / 45) % 24; ctx.lineWidth = mine ? 2.2 : 1.6; ctx.strokeStyle = mine ? '#ff5a4a' : '#c9423a';
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
            ctx.translate(s.x, s.y); ctx.scale(k, k);
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 9, 11, 3.5, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#5a1712'; ctx.strokeStyle = '#140808'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(9, 2); ctx.quadraticCurveTo(0, 12, -9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();   // Schild
            ctx.fillStyle = '#e8d9b8'; ctx.beginPath(); ctx.arc(0, -2, 3.6, 0, 7); ctx.fill();                                                   // Schädel mit Hörnern
            ctx.strokeStyle = '#e8d9b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-7, -6, -6, -11); ctx.moveTo(3, -4); ctx.quadraticCurveTo(7, -6, 6, -11); ctx.stroke();
            ctx.fillStyle = '#140808'; ctx.fillRect(-2, -3, 1.4, 1.4); ctx.fillRect(.6, -3, 1.4, 1.4);
            const lbl = fmtCompact(a.t); ctx.font = '700 8px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const tw = ctx.measureText(lbl).width + 8; rr(ctx, -tw / 2, 12, tw, 11, 5.5); ctx.fillStyle = 'rgba(20,8,8,.9)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = mine ? '#ff5a4a' : '#8a2a22'; ctx.stroke();
            ctx.fillStyle = '#ffe2d8'; ctx.fillText(lbl, 0, 17.8);
            ctx.restore(); liveAnimation = true;
        }
    }
    const D = drOnMap(wallNow); if (!D || z < .0015) return;
    const s = barbScreen(D), kb = drK(); if (s.x < -200 || s.x > viewW + 200 || s.y < -200 || s.y > viewH + 200) return;
    const dead = D.hp <= 0; setScreen(ctx);
    if (!dead) { const R = 110 * kb, gr = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, R); gr.addColorStop(0, 'rgba(255,120,60,.45)'); gr.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(s.x, s.y - (dead ? 0 : Math.sin(now / 700) * 4 * kb)); ctx.scale(kb, kb); if (dead) { ctx.globalAlpha = .45; ctx.filter = 'grayscale(1)'; }
    drDraw(ctx, dead ? 0 : Math.sin(now / 260)); ctx.restore();
    const bw = Math.max(90, 130 * kb), by = s.y + 40 * kb;                                    // Name und Leben
    ctx.font = '800 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = dead ? D.name + ' · besiegt' : D.name, tw = ctx.measureText(label).width + 18;
    rr(ctx, s.x - tw / 2, by, tw, 20, 10); ctx.fillStyle = 'rgba(24,8,6,.92)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2c75c'; ctx.stroke();
    ctx.fillStyle = '#ffe9c8'; ctx.fillText(label, s.x, by + 10.5);
    if (!dead) { rr(ctx, s.x - bw / 2, by + 24, bw, 7, 3.5); ctx.fillStyle = 'rgba(10,8,10,.85)'; ctx.fill(); rr(ctx, s.x - bw / 2 + 1, by + 25, Math.max(2, (bw - 2) * D.hp / D.max), 5, 2.5); ctx.fillStyle = '#e0483a'; ctx.fill(); }
    liveAnimation = true;
}
function drDraw(g, flap) {                           // der Drache: Flügel (schlagend), Körper, langer Hals, gehörnter Kopf, Schwanz, Feueratem
    const col = DR_COL, dark = '#2a0c08', belly = '#f0b45a';
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 46, 52, 11, 0, 0, 7); g.fill();
    g.strokeStyle = dark; g.lineWidth = 2.5;
    const wy = -40 - flap * 16;
    for (const s of [-1, 1]) {                       // Flügel: Haut zwischen den Fingern
        g.fillStyle = '#9c2a1c'; g.beginPath(); g.moveTo(s * 8, -6); g.lineTo(s * 40, wy); g.lineTo(s * 78, wy + 10 + flap * 4); g.quadraticCurveTo(s * 62, wy + 26, s * 70, wy + 40); g.quadraticCurveTo(s * 50, wy + 38, s * 52, wy + 54); g.quadraticCurveTo(s * 34, 6, s * 10, 10); g.closePath(); g.fill(); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(s * 40, wy); g.lineTo(s * 70, wy + 40); g.moveTo(s * 40, wy); g.lineTo(s * 52, wy + 54); g.stroke(); g.lineWidth = 2.5;
    }
    g.fillStyle = col; g.beginPath(); g.moveTo(-6, 30); g.quadraticCurveTo(-30, 46, -50, 38); g.quadraticCurveTo(-36, 44, -14, 22); g.closePath(); g.fill(); g.stroke();   // Schwanz
    g.beginPath(); g.ellipse(0, 16, 22, 24, 0, 0, 7); g.fill(); g.stroke();                               // Körper
    g.fillStyle = belly; g.beginPath(); g.ellipse(0, 20, 11, 17, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-10, -26, 6, -40); g.lineTo(18, -32); g.quadraticCurveTo(6, -18, 9, 0); g.closePath(); g.fill(); g.stroke();   // Hals
    g.beginPath(); g.moveTo(2, -44); g.quadraticCurveTo(16, -52, 32, -42); g.lineTo(30, -34); g.quadraticCurveTo(16, -32, 8, -30); g.closePath(); g.fill(); g.stroke();             // Kopf
    g.fillStyle = '#f2e6c8'; for (const [x, y, x2, y2] of [[6, -46, -2, -60], [12, -48, 8, -62]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.lineTo(x + 5, y + 1); g.closePath(); g.fill(); }   // Hörner
    for (const [r, a] of [[6, .3], [2.6, 1]]) { g.globalAlpha *= a; g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(18, -42, r, 0, 7); g.fill(); g.globalAlpha /= a; }   // glühendes Auge
    if (flap > -.2) { const f = (flap + .2) / 1.2, gr = g.createLinearGradient(32, -38, 62, -30); gr.addColorStop(0, 'rgba(255,230,120,.95)'); gr.addColorStop(1, 'rgba(255,90,30,0)');   // Feueratem
        g.fillStyle = gr; g.beginPath(); g.moveTo(31, -38); g.quadraticCurveTo(48, -44 - f * 6, 62 + f * 10, -34); g.quadraticCurveTo(48, -28 + f * 4, 31, -35); g.closePath(); g.fill(); }
}

// ---- das Blatt an der Karte (wie Lager/Tagesboss): eine Barbaren-Armee oder der Drache ----
function invSheetHtml(head) {
    const a = invArmee(barbView.id); if (!a) return head('attack', 'Barbaren-Armee') + '<div class="notice">' + icon('check') + '<span>Diese Armee ist nicht mehr da.</span></div>';
    const t = islandById[a.tid], o = islandOwnerOf(a.tid), need = a.t * 1.15 / barbFa('player'), p = invPos(a), src = barbSource(p, need), tp = src !== null ? invTreffpunkt(a, src, 'player') : null;
    return head('attack', 'Barbaren-Armee · Welle ' + a.w) +
        '<div class="barb-hp"><i style="width:' + (a.t / a.max * 100).toFixed(1) + '%"></i><span>' + fmtCompact(a.t) + ' / ' + fmtCompact(a.max) + ' Barbaren</span></div>' +
        '<div class="field-lines"><span>Ziel</span><b>' + escapeHtml(islandTitle(t)) + ' · ' + escapeHtml(fieldWhoName(o)) + '</b><span>Ankunft in</span><b data-ev-bis="' + a.at1 + '">' + fmtDHMS((a.at1 - Date.now()) / 1000) + '</b>' +
        '<span>Für den Sieg</span><b>+' + INV_PTS_SIEG + ' Punkte</b></div>' +
        (src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher.</span></div>'
            : !tp ? '<div class="notice">' + icon('hourglass') + '<span>Zu weit weg – deine Truppen kämen zu spät. ' + (o === 'player' ? 'Schick lieber Verstärkung in deine Basis.' : '') + '</span></div>'
            : barbAttackHtml(islandTroops[src] || 0, need, src, 'Abfangen')) +
        '<div class="barb-note">Barbaren erobern nichts, aber wer sie nicht aufhält, verliert Truppen. Abwehren: +' + INV_PTS_WEHR + ' Punkte, eine Armee schlagen: +' + INV_PTS_SIEG + ' (auch für Nachbarn). Belohnung nach der Invasion nach Punkten.</div>';
}
function drSheetHtml(head) {
    const D = drOnMap(); if (!D) return head('star', DR_NAME) + '<div class="notice">' + icon('info') + '<span>Der Drache ist nicht mehr da. Nächstes Mal: Sonntag ab ' + DR_STUNDE + ' Uhr.</span></div>';
    const dead = D.hp <= 0, rk = evRang(D.dmg), mine = rk.findIndex(e => e[0] === 'player'), hits = (D.hits || {}).player || 0, src = barbSource(D, 1, true);
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + escapeHtml(fieldWhoName(e[0])) + '</span><b>' + fmtCompact(e[1]) + '</b></li>';
    return head('star', 'Drache · ' + escapeHtml(D.name)) +
        '<div class="barb-hp"><i style="width:' + (D.hp / D.max * 100).toFixed(1) + '%"></i><span>' + (dead ? 'Besiegt' : fmtCompact(D.hp) + ' / ' + fmtCompact(D.max) + ' Leben') + '</span></div>' +
        '<div class="field-lines"><span>' + (dead ? 'Vorbei' : 'Fliegt weg in') + '</span><b' + (dead ? '>–' : ' data-ev-bis="' + D.end + '">' + fmtDHMS((D.end - Date.now()) / 1000)) + '</b><span>Deine Angriffe</span><b>' + hits + ' / ' + DR_HITS + '</b>' +
        '<span>Dein Schaden</span><b>' + (mine >= 0 ? fmtCompact(rk[mine][1]) + ' · Platz ' + (mine + 1) : '–') + (barbOut('player', 'd') ? ' <small>· Angriff unterwegs</small>' : '') + '</b></div>' +
        (rk.length ? '<ol class="barb-rank">' + rk.slice(0, 5).map(row).join('') + (mine >= 5 ? row(rk[mine], mine) : '') + '</ol>' : '') +
        (dead ? '' : hits >= DR_HITS ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Du hast alle ' + DR_HITS + ' Angriffe gemacht – jetzt sind die anderen dran.</span></div>' :
            src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen hat Truppen.</span></div>' : barbAttackHtml(islandTroops[src] || 0, (islandTroops[src] || 0) * .5, src, 'Angreifen')) +
        '<div class="barb-note">Höchstens 2 % Leben pro Angriff, ein Drittel der Kämpfer fällt. Fällt er: Platz 1 epische Kiste, Platz 2–10 seltene Kiste, alle anderen Gems und Splitter. Entkommt er: alle etwas Kleines.</div>';
}

// ---- die Ereignisse im Events-Fenster (Dock → Events, untere Reiter): Termine, Uhren, Ranglisten ----
var evTab = 'boss', evRenderAt = 0;
function evJetzt(now) {                              // was gerade läuft (für das „!“ am Reiter und den ersten Blick ins Fenster)
    try { now = now || Date.now(); return invAktiv(now) ? 'inv' : drAktiv(now) ? 'drache' : null; } catch (e) { return null; }
}
const evUhr = (bis) => '<b data-ev-bis="' + bis + '">' + fmtDHMS(Math.max(0, bis - Date.now()) / 1000) + '</b>';
const evWann = t => { const d = new Date(t); return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function evRangHtml(list, fmt, lim) {                // Top 10 (+ deine Zeile)
    const mi = list.findIndex(e => e[0] === 'player');
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + whoLink(e[0], fieldWhoName(e[0])) + '</span><b>' + fmt(e[1]) + '</b></li>';
    return list.length ? '<ol class="barb-rank">' + list.slice(0, lim || 10).map(row).join('') + (mi >= (lim || 10) ? row(list[mi], mi) : '') + '</ol>' : '';
}
function evKarte(ic, titel, sub, inhalt, cls) { return '<div class="barb-card ev-card' + (cls ? ' ' + cls : '') + '"><div class="barb-ct"><b>' + icon(ic) + ' ' + titel + '</b><small>' + sub + '</small></div>' + inhalt + '</div>'; }
function evTourHtml() { return woHtml(); }            // Events → Reiter „Wochen-Event“ (Schlüssel 'tour' von früher)
function woHtml() {                                   // das Wochen-Event: Thema, Uhr, dein Platz, Preise, Rangliste, die nächsten Wochen
    const now = Date.now(), w = woWin(now), th = woThemaAm(now), W = evState.wo || {}, live = w.on && W.key === w.key, rk = live ? evRang(W.pts) : [], mine = rk.findIndex(e => e[0] === 'player') + 1;
    const kopf = (w.on ? 'Läuft · endet in ' : 'Montag bis Freitag · beginnt in ') + evUhr(w.on ? w.end : w.start);
    const preise = WO_PRIZES.map((p, i) => '<div class="tour-prize' + (i ? '' : ' is-1') + '"><b>' + p.t + '</b><span>' + icon('gem') + fmtNum(p.gems) + '</span><span>' + icon('star') + p.sh + '</span>' + (p.crate >= 0 ? '<em>' + RARITY_DEFS[p.crate].label + '-Kiste</em>' : '') + '</div>').join('');
    const plan = [1, 2, 3, 4].map(i => { const t = w.start + 7 * 864e5 * i + 3600000, x = woThemaAm(t), a = new Date(t), e = new Date(t + 4 * 864e5); return '<span>Mo ' + a.getDate() + '.' + (a.getMonth() === e.getMonth() ? '' : (a.getMonth() + 1) + '.') + ' – Fr ' + e.getDate() + '.' + (e.getMonth() + 1) + '.</span><b>' + icon(x.ic) + ' ' + x.name + '</b>'; }).join('');
    const alt = !live && W.last && W.last.top ? W.last.top : null, liste = live ? rk : alt || [];
    return evKarte(th.ic, 'Wochen-Event · ' + th.name, kopf, '<div class="field-lines"><span>Punkte für</span><b>' + th.pkt + (th.k === 'krieg' ? ' (1 Punkt pro ' + fmtNum(WO_KILL_PER) + ')' : '') + '</b><span>Bonus</span><b>' + th.bonus + '</b>' +
            (live ? '<span>Dein Platz</span><b>' + (mine || '–') + ' · ' + fmtNum(Math.floor((W.pts || {}).player || 0)) + ' Punkte</b>' : '') + '</div>', 'is-tour') +
        '<div class="lb-gap">' + (live ? 'Live · Top 10' : alt ? 'Letzte Woche · Top 10' : 'Top 10') + '</div>' +
        (evRangHtml(liste, v => fmtNum(Math.floor(v)) + ' P.') || '<div class="war-empty">' + (w.on ? 'Noch hat niemand Punkte – sobald jemand Punkte holt, steht er hier.' : 'Am Montag geht es los.') + '</div>') +
        '<div class="lb-gap">Preise</div><div class="tour-prizes">' + preise + '</div>' +
        '<div class="tour-rules"><span>' + icon('hourglass') + '<span>Höchstens ' + WO_KILL_MAX + ' Punkte auf einmal, im Schnitt ' + WO_KILL_MIN + ' pro Minute. Jede Woche (Mo–Fr) ein anderes Thema, am Wochenende ist frei.</span></span></div>' +
        '<div class="lb-gap">Nächste Wochen</div><div class="field-lines ev-plan">' + plan + '</div>';
}
function evInvHtml() {
    const now = Date.now(), I = evState.inv, akt = invAktiv(now), p = evPlanVon('inv'), last = I && I.paid ? I : null;
    const kopf = akt ? 'Läuft · Welle ' + Math.min(INV_WELLEN, akt.welle) + ' / ' + INV_WELLEN + ' · noch ' + evUhr(akt.end) : 'Nächste in ' + evUhr(p.start);
    const pts = I ? I.pts || {} : {}, me = Math.floor(pts.player || 0), rk = evRang(pts), mine = I ? rk.findIndex(e => e[0] === 'player') + 1 : 0;
    const meine = akt ? akt.armies.filter(a => islandOwnerOf(a.tid) === 'player') : [];
    let inh = '<div class="field-lines"><span>Termin</span><b>' + evWann(akt ? akt.start : p.start) + ' – ' + evWann(akt ? akt.end : p.end).slice(-5) + '</b>' +
        (akt ? '<span>Armeen unterwegs</span><b>' + akt.armies.length + (meine.length ? ' · <span class="ev-rot">' + meine.length + ' auf dich</span>' : '') + '</b>' : '') +
        (I && (akt || last) ? '<span>' + (akt ? 'Deine Punkte' : 'Letztes Mal') + '</span><b>' + fmtNum(me) + (mine ? ' · Platz ' + mine : '') + '</b>' : '') + '</div>';
    const preise = INV_PREISE.map(x => '<div class="tour-prize"><b>' + x.t + '</b><span>' + icon('gem') + x.gems + '</span><span>' + icon('star') + x.sh + '</span>' + (x.crate >= 0 ? '<em>' + RARITY_DEFS[x.crate].label + '-Kiste</em>' : '') + '</div>').join('');
    return evKarte('defense', 'Barbaren-Invasion', kopf, inh +
        (meine.length ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="inv">' + icon('send') + '<span>Zur Armee auf deine Basis</span></button>' : ''), akt ? 'is-warn' : '') +
        '<div class="tour-rules"><span>' + icon('hourglass') + '<span><b>Alle 3 Tage um ' + INV_STUNDE + ' Uhr, eine Stunde</b> – ' + INV_WELLEN + ' Wellen, je 5–7 Minuten Marsch vom Rand der Insel</span></span>' +
        '<span>' + icon('defense') + '<span><b>+' + INV_PTS_WEHR + ' Punkte</b> für jede abgewehrte Armee an deiner Basis – schick vorher Verstärkung</span></span>' +
        '<span>' + icon('attack') + '<span><b>+' + INV_PTS_SIEG + ' Punkte</b> für jede Armee, die du unterwegs schlägst – auch die auf deine Nachbarn (Teilschaden zählt anteilig)</span></span>' +
        '<span>' + icon('losses') + '<span>Barbaren erobern nichts – aber wer sie nicht aufhält, verliert viele Truppen.</span></span></div>' +
        '<div class="tour-prizes ev-prizes3">' + preise + '</div><div class="lb-gap">' + (akt ? 'Live · Top 10' : 'Letzte Invasion') + '</div>' +
        (evRangHtml(rk, v => fmtNum(Math.floor(v)) + ' P.') || '<div class="war-empty">' + (akt ? 'Noch hat niemand Punkte.' : 'Noch keine Invasion gewesen.') + '</div>');
}
function evDrHtml() {
    const now = Date.now(), D = evState.dr, akt = drAktiv(now), p = evPlanVon('dr'), rk = D ? evRang(D.dmg) : [], mine = rk.findIndex(e => e[0] === 'player') + 1;
    const kopf = akt ? 'Da · fliegt weg in ' + evUhr(akt.end) : D && D.start === p.start && D.hp <= 0 && now < D.end ? 'Besiegt!' : 'Nächster in ' + evUhr(p.start);
    let inh = (akt ? '<div class="barb-hp"><i style="width:' + (akt.hp / akt.max * 100).toFixed(1) + '%"></i><span>' + fmtCompact(akt.hp) + ' / ' + fmtCompact(akt.max) + ' Leben</span></div>' : '') +
        '<div class="field-lines"><span>Termin</span><b>' + evWann(akt ? akt.start : p.start) + ' – ' + evWann(akt ? akt.end : p.end).slice(-5) + '</b>' +
        (D && rk.length ? '<span>' + (akt ? 'Dein Schaden' : 'Letztes Mal') + '</span><b>' + (mine ? fmtCompact(rk[mine - 1][1]) + ' · Platz ' + mine : '–') + '</b>' : '') + '</div>';
    const go = drOnMap() ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="drache">' + icon('send') + '<span>Zum Drachen</span></button>' : '';
    const preise = DR_PREISE.map((x, i) => '<div class="tour-prize' + (i ? '' : ' is-1') + '"><b>' + x.t + '</b><span>' + icon('gem') + x.gems + '</span><span>' + icon('star') + x.sh + '</span>' + (x.crate >= 0 ? '<em>' + RARITY_DEFS[x.crate].label + '-Kiste</em>' : '') + '</div>').join('');
    return evKarte('star', 'Der Drache', kopf, inh + go, akt ? 'is-drache' : '') +
        '<div class="tour-rules"><span>' + icon('hourglass') + '<span><b>Jeden Sonntag ' + DR_STUNDE + '–' + (DR_STUNDE + DR_DAUER / 3600000) + ' Uhr</b> kreist ' + DR_NAME + ' über dem Thron – sehr viel Leben, nur alle zusammen schaffen ihn</span></span>' +
        '<span>' + icon('attack') + '<span><b>' + DR_HITS + ' Angriffe</b> pro Person, höchstens 2 % seines Lebens pro Angriff, ein Drittel der Kämpfer fällt</span></span>' +
        '<span>' + icon('crown') + '<span>Fällt er, gibt es Preise nach Schaden. Entkommt er, bekommen alle Kämpfer etwas Kleines.</span></span></div>' +
        '<div class="tour-prizes ev-prizes3">' + preise + '</div><div class="lb-gap">' + (akt ? 'Live · Schaden' : 'Letzter Drache') + '</div>' +
        (evRangHtml(rk, v => fmtCompact(v)) || '<div class="war-empty">' + (akt ? 'Noch hat niemand angegriffen.' : 'Noch kein Drache gewesen.') + '</div>');
}
function evBossHtml() {                              // Reiter „Boss & Lager“: Tagesboss und Barbaren-Lager (jeden Tag neu)
    const b = dbossEnsure(), rec = barbRec('player'), near = barbNearest();
    const boss = evKarte('crown', 'Tagesboss · ' + escapeHtml(b.name), b.hp <= 0 ? 'Besiegt · neuer in ' + evUhr(Date.now() + msToMidnight()) : rec.h + ' / ' + dbossHitsMax() + ' Angriffe heute',
        '<div class="barb-hp"><i style="width:' + (b.hp / b.max * 100).toFixed(1) + '%"></i><span>' + (b.hp <= 0 ? 'Besiegt' : fmtCompact(b.hp) + ' Leben') + '</span></div>' +
        (dbossOnMap() ? '<button class="btn btn--secondary btn--sm" type="button" data-ev-go="boss">' + icon('send') + '<span>Zum Tagesboss</span></button>' : ''));
    const lager = evKarte('attack', 'Barbaren-Lager', rec.n + ' / ' + barbTagMax() + ' heute', '<div class="field-lines"><span>Freigeschaltet</span><b>bis Stufe ' + Math.min(BARB_MAX_L, rec.b + 1) + '</b><span>Neuer Tag in</span>' + evUhr(Date.now() + msToMidnight()) + '</div>' +
        (near ? '<button class="btn btn--secondary btn--sm" type="button" data-ev-go="camp">' + icon('send') + '<span>Nächstes Lager · Stufe ' + near.L + '</span></button>' : ''));
    return boss + lager;
}
function evOffen() { return isPanelOpen(goalsPopup) && EV_TABS.includes(goalsTab); }
function renderEvents() {
    evRenderAt = Date.now();
    liveHtml(document.getElementById('eventBody'), evTab === 'tour' ? evTourHtml() : evTab === 'inv' ? evInvHtml() : evTab === 'drache' ? evDrHtml() : evBossHtml());
}
document.getElementById('eventBody').addEventListener('click', e => {
    const go = e.target.closest('[data-ev-go]'); if (!go) return; const k = go.dataset.evGo;
    let t = null, v = null;
    if (k === 'drache') { t = drOnMap(); v = { kind: 'drache' }; }
    else if (k === 'boss') { t = dbossOnMap(); v = { kind: 'boss' }; if (t && !isCellOpen(t.x, t.y)) { flashHint('Der Tagesboss steht im Nebel – erforsche zuerst das Gebiet.', 3500); return; } }
    else if (k === 'camp') { t = barbNearest(); v = t && { kind: 'camp', id: t.id }; }
    else if (k === 'inv') { const I = invAktiv(), a = I && I.armies.filter(x => islandOwnerOf(x.tid) === 'player').sort((x, y) => x.at1 - y.at1)[0]; if (a) { t = invPos(a); v = { kind: 'inv', id: a.id }; } }
    if (!t) { flashHint('Gerade nichts davon auf der Karte.', 2500); return renderEvents(); }
    closePanel(goalsPopup); flyTo(t.x, t.y, k === 'drache' ? { zoom: .015, screenY: viewH * .3 } : { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .2 }); openBarbSheet(v);
});
// der Hinweis unter dem HUD: Invasion bald/läuft, Drache bald/da → [Dringlichkeit, html] (0 = am dringendsten)
function evChips(now) {
    const out = [], ip = evPlanVon('inv'), I = invAktiv(now), D = drAktiv(now), dp = evPlanVon('dr');
    if (I) { const n = I.armies.filter(a => islandOwnerOf(a.tid) === 'player').length;
        out.push([n ? 0 : 2, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv">' + icon('defense') + '<span>Invasion · Welle ' + Math.min(INV_WELLEN, I.welle) + '/' + INV_WELLEN + '</span>' + (n ? '<b>' + n + ' auf dich</b>' : '<b>' + fmtNum(Math.floor(I.pts.player || 0)) + ' P.</b>') + '</button>']); }
    else if (ip.start > now && ip.start - now <= 30 * 60000) out.push([3, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv">' + icon('defense') + '<span>Barbaren-Invasion in</span><i data-ev-bis="' + ip.start + '"></i></button>']);
    if (D) out.push([2, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache">' + icon('star') + '<span>Drache</span><b>' + Math.ceil(D.hp / D.max * 100) + ' %</b><i data-ev-bis="' + D.end + '"></i></button>']);
    else if (dp.start > now && dp.start - now <= 30 * 60000) out.push([3, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache">' + icon('star') + '<span>Der Drache kommt in</span><i data-ev-bis="' + dp.start + '"></i></button>']);
   
    return out;
}
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
    if (!mine) return;
    const youWon = mine === winner, foe = mine === att ? def : att, w = youWon ? wWinner : wLoser;
    addCombatLogEntry({ type: 'army', won: youWon, attacker: armyName(att), defender: armyName(def), atk: fb.SA, def: fb.SD, wounded: w, gold: mine === att ? fg.a : fg.d, hA: heroTag(aHx), hD: heroTag(dHx), hx: heroReportOf(mine === att ? aHx : dHx) });
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
        else { const p = armyPos(b, now); if (Math.hypot(p.x - a.x, p.y - a.y) < ISLAND_RADIUS * 2) { if (me) dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else botDropShield(who); armyClash(a, b); } else if (me) flashHint('Die Armee von ' + armyName(b) + ' ist weitergezogen.', 3000); }
        return; }
    if (t.kind === 'field') { gone(); fieldArrive({ who, homeId: armyHome(a), fieldId: t.id, troops: a.troops, hero: a.hero || null, hero2: a.hero2 || null, back: false }, now); saveFields(); return; }
    if (t.kind === 'base') {                                                  // storming a base: the fight runs exactly like a normal attack
        const src = armyHome(a); if (src === null || src === undefined) return;
        gone();
        if (me) { dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); questProgress('attack', 1); } else botDropShield(who);
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
    for (const r of armyRaids) { const b = islandById[r.baseId]; if (b) drawMarchLine('incoming', b, { x: r.tx, y: r.ty, landmassId: r.lm, radius: 0, id: 'army' }, r.startedAt, r.resolveAt, wallNow); }
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
    return seg ? '<div class="seg hero-seg army-hero">' + seg + '</div>' + (seg2 ? '<div class="seg hero-seg hero-seg2 army-hero">' + seg2 + '</div>' : '') : '';
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
        const t = a.mv && a.mv.to, st = a.mv ? (t.kind === 'base' ? 'Angriff auf ' + islandTitle(islandById[t.id]) : t.kind === 'home' ? 'Heimweg' : t.kind === 'field' ? 'zur ' + FIELD_KINDS[fieldById[t.id].kind].name : 'marschiert') + ' · ' + uhrHtml(a.mv.resolveAt, 'clock') : 'lagert';
        liveHtml(el, head('Armee im Feld') +
            '<div class="field-lines"><span>Truppen</span><b>' + fmtTile(Math.floor(a.troops)) + (inc ? ' <em class="army-inc">+' + fmtCompact(inc) + ' unterwegs</em>' : '') + '</b><span>Status</span><b>' + st + '</b>' +
            '<span>Heimat</span><b>' + (armyHome(a) !== null && armyHome(a) !== undefined ? islandTitle(islandById[armyHome(a)]) : '–') + '</b></div>' +
            (raid ? '<div class="notice notice--warn">' + icon('attack') + '<span>' + botById[raid.botId].name + ' greift an (' + fmtCompact(raid.troops) + ') · ' + uhrHtml(raid.resolveAt, 'clock') + '</span></div>' : '') +
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
function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - mapState.offsetX) / mapState.zoom,
        y: (screenY - mapState.offsetY) / mapState.zoom
    };
}

const popup = document.getElementById('islandPopup');
const popupTitle = document.getElementById('popupTitle');
const popupStats = document.getElementById('popupStats');
const upgradeBtn = document.getElementById('upgradeBtn');
const sendBtn = document.getElementById('sendBtn');
const attackBtn = document.getElementById('attackBtn');
const multiAttackBtn = document.getElementById('multiAttackBtn');
const recallBtn = document.getElementById('recallBtn');
const scoutBtn = document.getElementById('scoutBtn');
const backBtn = document.getElementById('backBtn');
const closeBtn = document.getElementById('closeBtn');
const multiAttackBar = document.getElementById('multiAttackBar');
const multiAttackLabel = document.getElementById('multiAttackLabel');
const multiAttackConfirmBtn = document.getElementById('multiAttackConfirmBtn');
const multiAttackCancelBtn = document.getElementById('multiAttackCancelBtn');
let popupIslandId = null;
// 'menu' lists the available actions for the tapped island; 'upgrade'
// and 'preview' (attack) are the preview+confirm screens.
let popupView = 'menu', popupFramedView = null;
let previewSourceId = null; // base picked for an attack awaiting confirmation
let previewAttackTroops = null; // how many of the source base's troops to send - adjustable via the slider, defaults to all of them
let previewFraction = 1;        // share of the garrison picked via "Alle"/25-75 % (follows the growing garrison); null after a manual slider drag
let previewShownAt = 0; // guards against a stray click landing on the
                         // confirm button the instant the preview opens

// the keyboard handler uses this: map shortcuts only fire while focus is on the page or the canvas
function isUiElement(target) {
  return !!(target && target.closest && target.closest(
    '#islandPopup,#bundPopup,#hud,#cornerButtons,#profilePopup,#rulerPopup,#rankPopup,#battleLogPopup,#goalsPopup,#shopPopup,#chestItemPopup,#multiAttackBar,#mapControls,#uiScrim,#uiScrimTop,#midBar'));
}
const PANEL_NAV = { bundPopup: 'bundBtn', profilePopup: 'profileBtn', battleLogPopup: 'battleLogBtn', goalsPopup: 'goalsBtn', shopPopup: 'shopBtn' };   // das Dock zeigt, welches Fenster offen ist
function isPanelOpen(el) { return el.classList.contains('is-open'); }
function openPanel(el) { el.style.removeProperty('display'); el.classList.add('is-open'); syncPanelState(); }
function closePanel(el) { el.classList.remove('is-open'); syncPanelState(); }
function syncPanelState() {
  const open = [...document.querySelectorAll('.panel.is-open')];
  const sheet = open.some(p => p.classList.contains('panel--sheet'));
  const item = isPanelOpen(chestItemPopup);
  document.body.classList.toggle('has-panel', open.length > 0);
  document.body.classList.toggle('has-sheet', sheet);
  document.body.classList.toggle('has-item', item);
  document.getElementById('uiScrim').hidden = !sheet;
  document.getElementById('uiScrimTop').hidden = !item;
  for (const [pid, bid] of Object.entries(PANEL_NAV))
    document.getElementById(bid).classList.toggle('active', isPanelOpen(document.getElementById(pid)));
  if (open.length) dismissTutorialHint();
  requestRender();                       // selection ring / popover follow
}
function closeTopmostPanel() {           // scrim click + Escape
  if (closeWelcome()) { maybeShowDaily(); return; }
  if (closeLevelUpModal()) return;
  if (closeDailyModal()) return;                                                  // the modals lie above the full-screen sheets and the town
  if (!document.getElementById('rewardModal').hidden) { document.getElementById('rewardModalBtn').click(); return; }
  if (!document.getElementById('titleModal').hidden) { document.getElementById('titleModal').hidden = true; return; }
  if (!document.getElementById('lookSheet').hidden) return closeLookSheet();      // the full-screen sheets lie above everything else
  if (!document.getElementById('heroHall').hidden) return closeHeroHall();
  if (!barbSheetEl.hidden) return closeBarbSheet();
  if (fieldSheetId) return closeFieldSheet();
  if (!document.getElementById('armySheet').hidden) return closeArmySheet();
  if (!document.getElementById('markerSheet').hidden) return closeMarkerSheet();
  if (!document.getElementById('citySheet').hidden && !cityView.hidden) { document.getElementById('citySheetClose').click(); return; }
  if (closeCity()) return;
  if (isPanelOpen(chestItemPopup)) return chestItemCloseBtn.click();
  if (isPanelOpen(popup)) return closeBtn.click();
  for (const [pid, closeId] of [['bundPopup','bundCloseBtn'],['rulerPopup','rulerCloseBtn'],['rankPopup','rankCloseBtn'],['profilePopup','profileCloseBtn'],['battleLogPopup','battleLogCloseBtn'],['goalsPopup','goalsCloseBtn'],['shopPopup','shopCloseBtn']])
    if (isPanelOpen(document.getElementById(pid))) return document.getElementById(closeId).click();
  if (multiAttackMode) return multiAttackCancelBtn.click();
}
document.getElementById('uiScrim').addEventListener('click', closeTopmostPanel);
document.getElementById('uiScrimTop').addEventListener('click', closeTopmostPanel);

// Panels are exclusive: opening one closes the others first, so no
// hidden panel keeps live state (e.g. an open attack preview) underneath.
function closeAllPopups() {
    if (teleportMode) { teleportMode = false; requestRender(); }   // ein anderes Fenster: Verlegen ist abgebrochen
    closePanel(popup);
    { const bp = document.getElementById('bundPopup'); if (bp && isPanelOpen(bp)) document.getElementById('bundCloseBtn').click(); }   // (Bündnis, buendnis.js)
    popupStats.dataset.preview = '';
    popupIslandId = null;
    popupView = 'menu';
    previewSourceId = null;
    previewAttackTroops = null;
    closePanel(profilePopup);
    closePanel(battleLogPopup);
    clearInterval(battleLogRefreshTimer);
    closePanel(document.getElementById('goalsPopup'));
    closePanel(shopPopup);
    closePanel(document.getElementById('rulerPopup'));
    closePanel(document.getElementById('rankPopup'));
    if (!document.getElementById('lookSheet').hidden) closeLookSheet();
    if (!document.getElementById('heroHall').hidden) closeHeroHall();
    if (!barbSheetEl.hidden) closeBarbSheet();
    if (fieldSheetId) closeFieldSheet();                                   // the small map sheets lie above the panels: never leave one on top of a new sheet or the town
    if (!document.getElementById('armySheet').hidden) closeArmySheet();
    if (!document.getElementById('markerSheet').hidden) closeMarkerSheet();
    closePanel(chestItemPopup);
    chestDetailItemId = null;
    chestSelectedIds.clear();
}

function openIslandPopup(island) {
    if (island && !islandSeen(island) && islandOwnerOf(island.id) !== 'player') { flashHint('Dieses Gebiet liegt im Nebel – schick zuerst einen Späher.', 3000); return; }
    closeAllPopups();
    popupIslandId = island.id;
    popupView = 'menu';
    renderPopup();
}

function closeIslandPopup() {
    closePanel(popup);
    popupStats.dataset.preview = '';
    popupIslandId = null;
    popupView = 'menu';
    previewSourceId = null;
    previewAttackTroops = null;
}

function hideAllButtons() {
    upgradeBtn.style.display = 'none';
    sendBtn.style.display = 'none';
    attackBtn.style.display = 'none';
    multiAttackBtn.style.display = 'none';
    recallBtn.style.display = 'none';
    scoutBtn.style.display = 'none';
    backBtn.style.display = 'none';
}

// Multi-Angriff: pick one of YOUR OWN bases, then tap any number of
// enemy/neutral bases on the map to select them as targets, then
// confirm once to launch all of them at the same time (troops
// split evenly across the chosen targets). Costs 1 gem per use.
const MULTI_ATTACK_GEM_COST = 1;
// "Truppen sammeln": for 1 gem, pulls every OTHER owned base within
// this radius (world units) that still has troops back home to the
// tapped base in one go - each one marches individually via the
// normal launchSend (own travel time, no instant teleport).
const RECALL_RADIUS = 8000;
const RECALL_GEM_COST = 1;
let multiAttackMode = false;
let multiAttackSourceId = null;
let multiAttackTargets = [], multiAttackShare = 1;       // share of the base's troops that goes, split over the targets
let multiAttackHero = null, multiAttackHero2 = null;                               // a hero leads the first wave

function updateMultiAttackBar() {
    const n = multiAttackTargets.length, go = Math.floor((islandTroops[multiAttackSourceId] || 0) * multiAttackShare);
    setText(multiAttackLabel, n ? n + (n === 1 ? ' Ziel' : ' Ziele') + ' · je ' + fmtCompact(Math.floor(go / n)) + ' Truppen' : '0 Ziele ausgewählt · Basen antippen');   // (live: liveTick, die Truppen wachsen)
    for (const b of document.querySelectorAll('#multiAttackShare button')) b.classList.toggle('on', parseFloat(b.dataset.f) === multiAttackShare);
    const hb = document.getElementById('multiAttackHero');
    if (multiAttackHero && (!heroOwned('player', multiAttackHero) || heroBusy('player', multiAttackHero))) multiAttackHero = null;
    const seg = heroSegHtml('data-mhero', multiAttackHero); hb.hidden = !seg; liveHtml(hb, seg);
    const hb2 = document.getElementById('multiAttackHero2'); multiAttackHero2 = heroZweitOk('player', multiAttackHero, multiAttackHero2);   // der Zweitheld
    if (hb2) { const s2 = heroSeg2Html('data-mhero2', multiAttackHero, multiAttackHero2); hb2.hidden = !s2; liveHtml(hb2, s2); }
    multiAttackConfirmBtn.disabled = multiAttackTargets.length === 0;
}

function startMultiAttack(sourceId) {
    multiAttackMode = true;
    multiAttackSourceId = sourceId;
    multiAttackTargets = []; multiAttackShare = 1; multiAttackHero = null; multiAttackHero2 = null;
    multiAttackBar.style.display = 'flex';
    document.body.classList.add('is-multi');
    updateMultiAttackBar();
    flashHint('Mehrfachangriff: Ziele antippen, dann „Angriffe starten“.');
}

function cancelMultiAttack() {
    multiAttackMode = false;
    multiAttackSourceId = null;
    multiAttackTargets = [];
    multiAttackBar.style.display = 'none';
    document.body.classList.remove('is-multi');
    hintEl.textContent = defaultHint;
}

multiAttackCancelBtn.addEventListener('click', cancelMultiAttack);
document.getElementById('multiAttackHero').addEventListener('click', e => { const bt = e.target.closest('button[data-mhero]:not([disabled])'); if (!bt) return; multiAttackHero = bt.dataset.mhero || null; updateMultiAttackBar(); });
document.getElementById('multiAttackHero2').addEventListener('click', e => { const bt = e.target.closest('button[data-mhero2]:not([disabled])'); if (!bt) return; multiAttackHero2 = bt.dataset.mhero2 || null; updateMultiAttackBar(); });
document.getElementById('multiAttackShare').addEventListener('click', e => {
    const bt = e.target.closest('button[data-f]'); if (!bt) return;
    multiAttackShare = parseFloat(bt.dataset.f); updateMultiAttackBar();
});

multiAttackConfirmBtn.addEventListener('click', () => {
    const sourceId = multiAttackSourceId;
    const targets = multiAttackTargets.slice();
    if (sourceId === null || targets.length === 0) return;
    if (gems < MULTI_ATTACK_GEM_COST) {
        flashHint('Nicht genug Gems für den Mehrfachangriff.', 3000);
        return;
    }
    const available = Math.floor((islandTroops[sourceId] || 0) * multiAttackShare);
    if (available < targets.length) {
        flashHint('Nicht genug Truppen, um so viele Ziele gleichzeitig anzugreifen.', 3000);
        return;
    }

    const perTarget = Math.floor(available / targets.length);
    let remainder = available - perTarget * targets.length, ok = 0;
    const failed = [], why = new Set();                                      // the reasons the refused launches had
    if (!marschPlatz('player')) return;                                       // ein Mehrfachangriff braucht EINEN freien Marsch-Platz
    naechsteGruppe = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    for (const targetId of targets) {
        let troopsForThis = perTarget;
        if (remainder > 0) { troopsForThis++; remainder--; }
        nextAttackHero = ok === 0 ? multiAttackHero : null; nextAttackHero2 = ok === 0 ? multiAttackHero2 : null;   // the heroes lead the first wave that goes out
        if (launchAttack(sourceId, targetId, null, troopsForThis)) ok++;
        else { failed.push(targetId); why.add(baseShieldedFor(targetId, 'player') ? 'Friedensschild' : isCapital(targetId) ? 'inzwischen eine Hauptstadt' : 'Tor oder Maut'); }
        nextAttackHero = null; nextAttackHero2 = null;
    }
    naechsteGruppe = null;
    if (!ok) {                                                               // nothing went out: no gem spent, the selection stays so the player can fix it
        const only = failed.length === 1 && why.has('Friedensschild') ? shieldBlockText(islandOwnerOf(failed[0])) : null;
        flashHint(only || 'Kein Angriff gestartet – ' + (failed.length === 1 ? 'das Ziel ist' : 'die Ziele sind') + ' gerade nicht erreichbar (' + [...why].map(w => w === 'Tor oder Maut' ? 'geschlossenes Tor oder zu wenig Münzen für die Maut' : w).join(', ') + ').', 4500);
        return;
    }
    gems -= MULTI_ATTACK_GEM_COST;
    saveGame();
    saveProgression();
    updateHud();
    cancelMultiAttack();                                                     // (first: it resets the hint line)
    flashHint(failed.length ? ok + ' von ' + targets.length + ' Angriffen gestartet – ' + failed.length + ' kam' + (failed.length === 1 ? '' : 'en') + ' nicht durch (' + [...why].join(', ') + ').' : ok + ' Angriffe gleichzeitig gestartet.', 4000);
});
