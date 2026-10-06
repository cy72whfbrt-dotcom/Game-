// Teil 09a-funde-felder.js: Funde auf der Karte und Ressourcenfelder
// ===== MAP PICKUPS (mini events, player only) =====
// Every 20-45 s a coin pouch, gem or troop banner appears on land inside the current view; tapping collects it.
const PICKUP_MAX = 3, PICKUP_LIFE_MS = 40000, PICKUP_HIT_PX = 30;
let pickups = [], pickupFx = [], nextPickupAt = Date.now() + 8000;
function pickupAmount(kind) {
    const L = Math.max(playerLvl, 1);
    if (kind === 'gem') return 1 + Math.floor(Math.random() * 3);
    if (kind === 'troops') return Math.max(wirtK(100), niceRound(levelRewardTroops(Math.max(L, 2)) * 0.05));   // (Stufen-Belohnung und Mindestwert × WIRTSCHAFT_KOSTEN)
    return Math.max(wirtK(200), niceRound(levelRewardCoins(L) * 0.1));
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
        if (p.kind === 'gem') { gems += p.amount; label = '+' + fmtNum(p.amount) + (p.amount === 1 ? ' Edelstein' : ' Edelsteine'); }
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
    hintEl.textContent = defaultHint; hintEl.classList.remove('toast--lang');
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
    gem:  { name: 'Edelsteinader', what: 'Edelsteine', icon: 'gem', load: .02, base: 20, col: '#7fd0ff' },
    // Paket D: Rohstoffe – gleiche RoK-Regel (feste Dauer, Truppen = Traglast). g = Geschlecht für „der/dem/zur/zum“
    holz:  { name: 'Holzfällerei', what: 'Holz', icon: 'wood', load: 2, base: 8000, col: '#c08a4c', roh: 'h' },
    stein: { name: 'Steinbruch', what: 'Stein', icon: 'stone', load: 2, base: 8000, col: '#aab3bd', roh: 's', g: 'm' },
    eisen: { name: 'Eisenmine', what: 'Eisen', icon: 'iron', load: 1.5, base: 6000, col: '#8fb6e0', roh: 'e' }
};
const fArt = (K, fall) => ({ dat: K.g === 'm' ? 'dem' : 'der', akk: K.g === 'm' ? 'den' : 'die', zu: K.g === 'm' ? 'zum' : 'zur' })[fall] + ' ' + K.name;   // „an der Goldmine“, „zum Steinbruch“
// Sammeln wie bei RoK (2.10.): ein Feld leert sich in fester Zeit – außen 1 Std., ganz innen 4 Std. –, egal wie viele Truppen.
// Die Truppen bestimmen nur, wie viel sie tragen können. Gems: außen 20, innen ~150 (vorher bis 18.000 in unter einer Minute).
// Gold, Holz, Stein, Eisen: × WIRTSCHAFT_ERTRAG wie jede Produktion (5.10.: was vorher in einer Sekunde kam, kommt in einer Stunde) – Gems bleiben
const fieldCapFor = (kind, rm) => kind === 'gem' ? Math.round(FIELD_KINDS.gem.base * Math.pow(rm, .35)) : Math.max(1, Math.round(FIELD_KINDS[kind].base * rm * WIRTSCHAFT_ERTRAG));
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
function fieldInfo(f) { const st = fieldState[f.id] || (fieldState[f.id] = { left: f.cap, occ: null }); if (st.regenAt && Date.now() >= st.regenAt) { st.left = f.cap; st.regenAt = 0; } if (st.left > f.cap) st.left = f.cap; return st; }   // (ein Vorrat von vor der Umstellung 5.10.: höchstens der neue)
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
    st.occ = null; if (st.left <= 0 && !(st.regenAt > now)) st.regenAt = now + FIELD_REGEN_MS;   // (die Nachwachs-Uhr läuft weiter, nicht bei jedem Heimgehen von vorn)
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
    if (m.who === 'player') dropShield('Dein Friedensschild ist gefallen, weil du angreifst.'); else { botDropShield(m.who); botNeulingWeg(m.who, o.who); }   // a fight for the field is an attack
    const aHx = heroFieldFx(m.who, m.hero, { res: 1 }, m.hero2), dHx = heroFieldFx(o.who, o.hero, { res: 1, defending: 1, gather: 1 }, o.hero2);   // both leaders: Goldrausch, Lagerwache …
    const fb = fieldBattle(m.who, m.troops, o.who, o.troops, aHx, dHx), won = fb.won, involved = m.who === 'player' || o.who === 'player';   // a fight for the field: army against army
    const loserName = fieldWhoName(won ? o.who : m.who), winnerName = fieldWhoName(won ? m.who : o.who), oWho = o.who;
    if (won) st.occ = { who: m.who, troops: m.troops - fb.aLoss, homeId: m.homeId, hero: m.hero || null, hero2: m.hero2 || null, since: now, got: 0 }; else o.troops -= fb.dLoss;
    const [wA, wD] = [[m.who, fb.aLoss, aHx], [oWho, fb.dLoss, dHx]].map(([w, n, hx]) => fieldHurt(w, n, hx) || 0);   // both sides' Krankenhaus (+ their hero)
    evPunkte('krieg', m.who, fb.dLoss / WO_KILL_PER); evPunkte('krieg', oWho, fb.aLoss / WO_KILL_PER);   // Krieger-Woche
    const fg = fieldGold(m.who, oWho, fb, aHx, dHx);
    if (involved) {
        const youWon = (m.who === 'player') === won;
        addCombatLogEntry(feldBericht(m.who === 'player'));
        flashHint(youWon ? 'Du hast ' + fArt(FIELD_KINDS[f.kind], 'akk') + ' gegen ' + loserName + ' gehalten/erobert.' : winnerName + ' hat dich von ' + fArt(FIELD_KINDS[f.kind], 'dat') + ' vertrieben.', 4000);
        sfx(youWon ? 'victory' : 'defeat');
    }
    for (const [w, istA] of [[m.who, true], [oWho, false]]) if (w !== 'player' && window.WELT && botById[w] && botById[w].mensch)   // echte Spieler (Weltrechner): ihr Bericht als Nachricht
        evBericht(w, feldBericht(istA), (istA === won ? 'Feld gehalten/erobert: ' : 'Vom Feld vertrieben: ') + FIELD_KINDS[f.kind].name + '.');
    function feldBericht(istA) {                     // aus Sicht des Angreifers (istA) oder des Sammlers: Du, Gegner, Verluste, Verwundete, Gold
        return { type: 'field', fieldKind: f.kind, won: istA === won, attacker: istA ? 'Du' : fieldWhoName(m.who), defender: istA ? fieldWhoName(oWho) : 'Du', atk: fb.SA, def: fb.SD,
            aTroops: m.troops, dTroops: o.troops + (won ? 0 : fb.dLoss), aLoss: fb.aLoss, dLoss: fb.dLoss, aWounded: wA, dWounded: wD,
            gold: istA ? fg.a : fg.d, hA: heroTag(aHx), hD: heroTag(dHx), hx: heroReportOf(istA ? aHx : dHx), hxA: heroReportOf(aHx), hxD: heroReportOf(dHx) };
    }
}
function fieldTick() {
    if (!rechnet()) return;
    const now = Date.now(), dt = 1, sr = evThemaAktiv('sam') ? 1.5 : 1;   // Sammel-Rausch: 50 % schneller
    const due = fieldMarches.filter(m => m.resolveAt <= now);
    if (due.length) { fieldMarches = fieldMarches.filter(m => m.resolveAt > now); for (const m of due) fieldArrive(m, now); saveFields(); requestRender(); }
    for (const f of resFields) {
        const st = fieldState[f.id]; if (!st || !st.occ) continue; if (st.left > f.cap) st.left = f.cap;
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
        m.back ? drawMarchLine('send', m.vx !== undefined ? { x: m.vx, y: m.vy, landmassId: m.vlm ?? f.landmassId } : f, home, m.startedAt, m.resolveAt, wallNow, null, marchKeyOf(m)) : drawMarchLine('attack', home, f, m.startedAt, m.resolveAt, wallNow, null, marchKeyOf(m)); }   // (antippen: Knöpfe wie jeder Marsch)
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
        '<span>Tragen</span><b>' + (K.load >= 1 ? (K.load * (AUF ? AUF.traglast('player') : 1)).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' ' + K.what + ' pro Truppe' : '1 Edelstein pro ' + Math.round(1 / K.load) + ' Truppen') + '</b></div>' +
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
