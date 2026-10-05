// Teil 01c-basen-spielstand.js: Türme auf den Inseln, Startplätze, Tempel, Spielstand laden
// Every landmass is covered in a grid of towers - the tower, not the
// island, is the capturable unit with its own troops/level/defense.
// The exact center slot of the grid is reserved for that landmass's
// temple instead of a regular tower (a Mega-Tempel on the hub, a
// plain Tempel on every outer landmass).
const islands = [];
let playerIslandId = null;

let id = 0;
// Tore first (the bases keep clear of them): a capturable gate on the outer bank of every bridge.
// Whoever owns a gate crosses its bridge for free and collects the toll everyone else pays. Unowned gates are shut.
const GATE_STATS = { guardian: { troops: 2e6, def: 5e5, level: 25, toll: 0.25 }, throne: { troops: 5e7, def: 1e7, level: 45, toll: 0.5 } };
const BORDER_GATE = { 4: { troops: 1500, def: 400, level: 3 }, 3: { troops: 12000, def: 3000, level: 8 }, 2: { troops: 1e5, def: 25000, level: 14 }, 1: { troops: 4e5, def: 1e5, level: 18 } };
// Wirtschaft 5.10.: alle neutralen Werte (Basen, Tempel, Tore) × WIRTSCHAFT_KOSTEN (wirtK). Die Thron-Tore aber nie unter der Start-Armee:
// sonst nähme ein neuer Spieler mit seinen 100.000 Start-Truppen (bleiben – Alexander) den Thron am ersten Tag (÷1800: 28.000 + 5.600)
const THRON_TOR_MIN = { troops: 150000, def: 50000 };
const gateSpots = bridges.map(br => {
    const A = landmasses[br.a], B = landmasses[br.b], ta = A.tier, tb = B.tier;
    const kind = ta === 'throne' || tb === 'throne' ? 'throne' : ta === 'guardian' || tb === 'guardian' ? 'guardian' : 'border';
    const outerA = A.ring > B.ring || (A.ring === B.ring && A.id > B.id);                   // the gate stands on the side farther from the middle
    const ex = outerA ? br.x1 : br.x2, ey = outerA ? br.y1 : br.y2, ox = outerA ? br.x2 : br.x1, oy = outerA ? br.y2 : br.y1;
    const bl = Math.hypot(ox - ex, oy - ey) || 1, key = Math.max(1, Math.min(4, Math.ceil((Math.min(A.ring, B.ring) - 1) / 1.5)));
    const st0 = kind === 'border' ? Object.assign({ toll: 0.1 }, BORDER_GATE[key]) : GATE_STATS[kind], mn = kind === 'throne' ? THRON_TOR_MIN : { troops: 1, def: 1 };
    const st = Object.assign({}, st0, { troops: wirtK(st0.troops, mn.troops), def: wirtK(st0.def, mn.def) });
    return { br, kind, st, lm: outerA ? br.a : br.b, x: ex - (ox - ex) / bl * 900, y: ey - (oy - ey) / bl * 900, ex, ey };
});
// Start places: 4 per region on the outermost two rings (player and bot capitals go there, the rest stays empty land).
const START_SLOT_OFFS = [[-.24, -.2], [.24, -.2], [-.24, .26], [.24, .26]];
const startSlots = [];
for (const lm of landmasses) if (lm.tier === 'outer' && lm.ring >= GRID_HALF - 1) for (const [sx, sy] of START_SLOT_OFFS) startSlots.push({ lm: lm.id, x: lm.x + sx * HEX_SPACING, y: lm.y + sy * HEX_SPACING });
const BASE_SPACING = HEX_SPACING * .083;                   // one distance between neighbouring bases everywhere (about 95 per region)
const segDistW = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
for (const lm of landmasses) {
    const isMega = lm.isCenter, hasTemple = regionHasTemple(lm), tierStats = TIER_STATS[lm.tier];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of lm.shape) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    // Keep clear: the temple, every gate on this region's banks with its road to the bridge, and the start places.
    const templeClear = !hasTemple ? 0 : HEX_SPACING * (isMega ? .19 : lm.corner ? .15 : .12);
    const myGates = gateSpots.filter(gsp => gsp.lm === lm.id || (gsp.br.a === lm.id || gsp.br.b === lm.id));
    const mySlots = startSlots.filter(sl => sl.lm === lm.id);
    const d = BASE_SPACING, inset = d * .45, grid = new Map(), mine = [];
    const safe = 7700 + inset;                                 // the banks meander at most ±3.8k: deeper inside than this is land for sure
    const inside = (x, y) => (x > minX + safe && x < maxX - safe && y > minY + safe && y < maxY - safe) ||
        (pointInPolygon(x, y, lm.shape) && pointInPolygon(x + inset, y, lm.shape) && pointInPolygon(x - inset, y, lm.shape) && pointInPolygon(x, y + inset, lm.shape) && pointInPolygon(x, y - inset, lm.shape));
    const free = (x, y) => {                                   // cheapest checks first
        const gx = Math.floor(x / d), gy = Math.floor(y / d);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const m of grid.get((gx + i) + ',' + (gy + j)) || []) if (Math.hypot(m.x - x, m.y - y) < d) return false;
        if (templeClear && Math.hypot(x - lm.x, y - lm.y) < templeClear) return false;
        for (const gsp of myGates) if (Math.hypot(x - gsp.x, y - gsp.y) < d * 1.1 || segDistW(x, y, gsp.x, gsp.y, gsp.ex, gsp.ey) < d * .7) return false;
        for (const sl of mySlots) if (Math.hypot(x - sl.x, y - sl.y) < d * 1.1) return false;
        return inside(x, y);
    };
    const add = p => { mine.push(p); const k = Math.floor(p.x / d) + ',' + Math.floor(p.y / d); (grid.get(k) || grid.set(k, []).get(k)).push(p); };
    // Even spread without gaps (Poisson-disc): start near the middle, grow outwards until the region is full.
    const active = [];
    const seed = () => { let best = null, bd = Infinity;
        for (let t = 0; t < 400; t++) { const x = minX + rand() * (maxX - minX), y = minY + rand() * (maxY - minY), dd = Math.hypot(x - lm.x, y - lm.y); if (dd < bd && free(x, y)) { bd = dd; best = { x, y }; } }
        if (best) { add(best); active.push(best); } return best; };
    if (seed()) while (true) {
        if (!active.length && !seed()) break;
        const i = Math.floor(rand() * active.length), a = active[i]; let found = false;
        for (let k = 0; k < 30; k++) { const an = rand() * Math.PI * 2, rad = d * (1 + rand() * .25), x = a.x + Math.cos(an) * rad, y = a.y + Math.sin(an) * rad;
            if (free(x, y)) { const p = { x, y }; add(p); active.push(p); found = true; break; } }
        if (!found) active.splice(i, 1);
    }
    for (const p of mine) islands.push({
        id: id++, landmassId: lm.id, x: p.x, y: p.y, radius: ISLAND_RADIUS, type: 'tower',
        neutralTroops: wirtK(tierStats ? niceRoundW(tierStats.troops[0] + rand() * (tierStats.troops[1] - tierStats.troops[0])) : (NEUTRAL_TROOPS_MIN + Math.floor(rand() * (NEUTRAL_TROOPS_MAX - NEUTRAL_TROOPS_MIN + 1))) * ringMult(lm), 0),
        neutralDefense: wirtK(tierStats ? niceRoundW(tierStats.def[0] + rand() * (tierStats.def[1] - tierStats.def[0])) : (NEUTRAL_DEFENSE_MIN + Math.floor(rand() * (NEUTRAL_DEFENSE_MAX - NEUTRAL_DEFENSE_MIN + 1))) * ringMult(lm)),
        neutralLevel: tierStats ? tierStats.level : 1 + Math.round(Math.log2(ringMult(lm)))
    });
    if (hasTemple) islands.push({
        id: id++, landmassId: lm.id, x: lm.x, y: lm.y,
        radius: ISLAND_RADIUS * (isMega ? 1.6 : lm.tier === 'guardian' ? 1.45 : 1.3),
        type: isMega ? 'megaTemple' : 'temple',
        guardian: lm.tier === 'guardian',
        neutralTroops: wirtK(tierStats ? tierStats.temple[0] : Math.floor(TEMPLE_TROOPS_MIN + rand() * (TEMPLE_TROOPS_MAX - TEMPLE_TROOPS_MIN)) * ringMult(lm)),
        neutralDefense: wirtK(tierStats ? tierStats.temple[1] : Math.floor(TEMPLE_DEFENSE_MIN + rand() * (TEMPLE_DEFENSE_MAX - TEMPLE_DEFENSE_MIN)) * ringMult(lm)),
        neutralLevel: tierStats ? tierStats.templeLevel : 1
    });
}
// Start places as bases: 64 of them, spread evenly round the edge (player + bots take them, the rest stay empty land).
{
    const order = startSlots.slice().sort((u, v) => Math.atan2(u.y, u.x) - Math.atan2(v.y, v.x));
    const want = 64, step = order.length / want;
    for (let k = 0; k < want && k * step < order.length; k++) {
        const sl = order[Math.floor(k * step)], lm = landmasses[sl.lm];
        islands.push({ id: id++, landmassId: sl.lm, x: sl.x, y: sl.y, radius: ISLAND_RADIUS, type: 'tower', startSlot: true,
            neutralTroops: wirtK(NEUTRAL_TROOPS_MIN * ringMult(lm), 0), neutralDefense: wirtK(NEUTRAL_DEFENSE_MIN * ringMult(lm)), neutralLevel: 1 });
    }
}
for (const gsp of gateSpots) {
    gsp.br.gateId = id;
    islands.push({ id: id++, ends: [[gsp.br.x1, gsp.br.y1], [gsp.br.x2, gsp.br.y2]], landmassId: gsp.lm, x: gsp.x, y: gsp.y, radius: ISLAND_RADIUS * 1.25,
                   type: 'gate', gateKind: gsp.kind, toll: gsp.st.toll, neutralTroops: gsp.st.troops, neutralDefense: gsp.st.def, neutralLevel: gsp.st.level });
}
const islandById = {};
for (const island of islands) islandById[island.id] = island;
// Kennung der Karte in der Welt (Paket C): der Weltrechner startet nur, wenn sie zur Karte des Spiels passt (start.js)
const KARTE_KENNUNG = JSON.stringify({ n: GRID_N, inseln: islands.length });
if (SYSTEM && store.get('openWaterKarte') !== KARTE_KENNUNG) store.set('openWaterKarte', KARTE_KENNUNG);

// The map was rebuilt (Thron-Insel + Wächter-Inseln): old base ids no longer match, so every
// map-bound part of an old save is cleared once. Coins, gems, gear, skills and level stay,
// and the player's whole army moves to the new home base.
const WORLD_VERSION = '7';   // 7: Karte 17 × 17 (Paket C) – welt.js setzt dieselbe Zahl (WELT_VERSION)
if (store.get('openWaterWorldVersion') !== WORLD_VERSION) {
    let carry = 0;
    try {
        const oldOwned = JSON.parse(store.get('openWaterOwnedIslands')) || [], oldTroops = JSON.parse(store.get('openWaterIslandTroops')) || {};
        for (const i of oldOwned) carry += oldTroops[i] || 0;
        for (const a of JSON.parse(store.get('openWaterPendingAttacks')) || []) if (!a.attackerBotId) carry += a.rawTroops || 0;
        for (const a of JSON.parse(store.get('openWaterPendingSends')) || []) if (!a.senderBotId) carry += a.troops || a.rawTroops || 0;
        for (const a of JSON.parse(store.get('openWaterPendingRetreats')) || []) carry += a.troops || 0;
    } catch (e) {}
    ['openWaterPlayerIslandId', 'openWaterOwnedIslands', 'openWaterIslandLevels', 'openWaterIslandTroops', 'openWaterBotOwnedIslands',
     'openWaterBotCoins', 'openWaterNeutralTroopOverrides', 'openWaterScoutedIslands', 'openWaterPendingAttacks', 'openWaterPendingSends',
     'openWaterPendingScouts', 'openWaterPendingRetreats', 'openWaterTempleHoldSince', 'openWaterExplored', 'openWaterFogCells', 'openWaterWorldStart', 'openWaterBotState', 'openWaterTitles', 'openWaterGateCfg', 'openWaterShield', 'openWaterShieldStock', 'openWaterWander', 'openWaterWanderNext'].forEach(k => store.remove(k));
    if (carry > 0) store.set('openWaterCarryTroops', String(Math.round(carry)));
    store.set('openWaterWorldVersion', WORLD_VERSION);
}

// Neutral islands normally regenerate the exact same neutralTroops
// every load (same seed, same order) - but a lost attack now
// permanently wounds the defender (see resolveAttack), so that
// damage has to survive a reload too. This overrides the freshly
// generated neutralTroops for any island that's taken casualties.
let neutralTroopOverrides;
try {
    neutralTroopOverrides = JSON.parse(store.get('openWaterNeutralTroopOverrides')) || {};
} catch (e) {
    neutralTroopOverrides = {};
}
for (const isl of islands) isl.nt0 = isl.neutralTroops;   // (die erzeugte Besatzung – eine neue Welt-Saison stellt sie wieder her)
for (const idStr of Object.keys(neutralTroopOverrides)) {
    const isl = islandById[idStr];
    if (isl) isl.neutralTroops = neutralTroopOverrides[idStr];
}

function centerIsland() {
    // Player's home base: a regular tower near the middle of the southernmost outer landmass,
    // as far from the Thron-Insel as the bots start.
    // → the start place furthest south, closest to the middle column
    return islands.filter(i => i.startSlot).reduce((a, b) => (b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && Math.abs(b.x) < Math.abs(a.x))) ? b : a);
}

// Startplatz für einen neuen Spieler in der EINEN Welt (gibt { insel, aus } zurück; aus = Mitspieler, dem sie gehörte):
// 1. eine freie Basis am äußeren Rand, auf der Landmasse mit den wenigsten Besitzern
// 2. Rand voll: irgendeine freie Basis (nie in der Mitte oder bei den Wächter-Tempeln)
// 3. Karte voll: eine Randbasis vom größten Mitspieler-Reich (nie von einem echten Spieler, nie eine Hauptstadt) – wie bei den Mitspielern
// besitz: { besitzer: [Basen] } – beim Weltrechner die lebenden Daten, sonst aus dem Speicher
function freierStartplatz(besitz) {
    if (!besitz) { besitz = {}; try { Object.assign(besitz, JSON.parse(store.get('openWaterBotOwnedIslands')) || {}); } catch (e) {} try { besitz.player = JSON.parse(store.get('openWaterOwnedIslands')) || []; } catch (e) {} }
    const wem = new Map(), proLm = {};
    for (const k in besitz) for (const id of besitz[k] || []) wem.set(id, k);
    if (!wem.size) return { insel: centerIsland() };                          // ganz neue Welt: der klassische Platz
    for (const id of wem.keys()) { const i = islandById[id]; if (i) proLm[i.landmassId] = (proLm[i.landmassId] || 0) + 1; }
    const besterOrt = liste => { const min = Math.min(...liste.map(i => proLm[i.landmassId] || 0)), beste = liste.filter(i => (proLm[i.landmassId] || 0) === min); return beste.find(i => i.startSlot) || beste[Math.floor(Math.random() * beste.length)]; };
    const turm = i => { if (i.type !== 'tower') return false; try { return !bossAt(i.id); } catch (e) { return true; } };   // (beim Laden gibt es den Besitz noch nicht – dann prüft es der Weltrechner)
    let frei = islands.filter(i => turm(i) && !wem.has(i.id) && landmasses[i.landmassId].tier === 'outer');
    if (frei.length) return { insel: besterOrt(frei) };
    frei = islands.filter(i => turm(i) && !wem.has(i.id) && landmasses[i.landmassId].tier !== 'throne' && landmasses[i.landmassId].tier !== 'guardian');
    if (frei.length) return { insel: besterOrt(frei) };
    const reiche = Object.keys(besitz).filter(k => /^bot\d+$/.test(k)).sort((u, v) => (besitz[v] || []).length - (besitz[u] || []).length);
    try { for (const k of reiche) {
        const caps = new Set(); try { const c = loadBotState()[k].capital; if (c !== undefined) caps.add(c); } catch (e) {}
        const rand = (besitz[k] || []).map(id => islandById[id]).filter(i => i && turm(i) && landmasses[i.landmassId].tier === 'outer' && !caps.has(i.id) && !(typeof isCapital === 'function' && isCapital(i.id)) && !(typeof pendingAttacks !== 'undefined' && pendingAttacks.some(a => a.targetId === i.id)));
        if (rand.length) return { insel: rand[Math.floor(Math.random() * rand.length)], aus: k };
    } } catch (e) {}                                                         // (beim Start ist noch nicht alles geladen)
    return { insel: null };
}
var startplatzNeu = false, startplatzAus = null; // (welt.js) frisch beigetreten: den Platz beim Weltrechner anmelden (aus: gehörte einem Mitspieler)
const storedId = parseInt(store.get('openWaterPlayerIslandId'), 10);
if (SYSTEM) {
    playerIslandId = centerIsland().id;                          // nur ein Bezugspunkt – der Weltrechner besitzt nichts
} else if (!Number.isNaN(storedId) && islandById[storedId]) {
    playerIslandId = storedId;
} else {
    const sp = freierStartplatz();
    playerIslandId = (sp.insel || centerIsland()).id; startplatzAus = sp.aus || null;
    startplatzNeu = true;
    store.set('openWaterPlayerIslandId', playerIslandId);
}

// Islands the player owns, each with its own level and troop garrison
var ownVer = 0;                                                  // bumped whenever anyone's bases change: the map skips its ownership scans while it stays
class OwnSet extends Set {
    add(id) { if (!this.has(id)) ownVer++; return super.add(id); }
    delete(id) { const r = super.delete(id); if (r) ownVer++; return r; }
    clear() { if (this.size) ownVer++; super.clear(); }
}
let ownedIslands;
try {
    ownedIslands = new OwnSet(JSON.parse(store.get('openWaterOwnedIslands')));
} catch (e) {
    ownedIslands = new OwnSet();
}
if (!SYSTEM) ownedIslands.add(playerIslandId);

let islandLevels;
try {
    islandLevels = JSON.parse(store.get('openWaterIslandLevels')) || {};
} catch (e) {
    islandLevels = {};
}
// strong inner islands show (and keep, minus one, on capture) their level
for (const isl of islands) if (isl.neutralLevel > 1 && islandLevels[isl.id] === undefined) islandLevels[isl.id] = isl.neutralLevel;
let islandTroops;
try {
    islandTroops = JSON.parse(store.get('openWaterIslandTroops')) || {};
} catch (e) {
    islandTroops = {};
}
// Only the very first time this player's save is created (no
// troop record for their home base yet) do they start with a
// 100,000-troop head start - not on every reload where troops
// happen to be at 0 from actual gameplay, and not for bots.
const PLAYER_START_TROOPS = 100000;
const isFreshPlayerSave = !(playerIslandId in islandTroops);
for (const ownedId of ownedIslands) {
    if (!islandLevels[ownedId]) islandLevels[ownedId] = 1;
    if (!islandTroops[ownedId]) {
        islandTroops[ownedId] = (ownedId === playerIslandId && isFreshPlayerSave) ? PLAYER_START_TROOPS : 0;
    }
}
// An old save may have moved the capital onto a temple or the throne (back then only gates were refused):
// it goes back to the strongest own tower - the garrison stays where it is, only the protection moves.
if (islandById[playerIslandId] && islandById[playerIslandId].type !== 'tower') {
    let best = null;
    for (const id of ownedIslands) if (islandById[id] && islandById[id].type === 'tower' && (best === null || (islandLevels[id] || 1) > (islandLevels[best] || 1))) best = id;
    if (best !== null) { playerIslandId = best; store.set('openWaterPlayerIslandId', playerIslandId); }
}

let coins = parseFloat(store.get('openWaterCoins')) || 0;   // parseFloat: huge sums are stored as "1e+22"
let gems = parseFloat(store.get('openWaterGems')) || 0;

let bonusGrantedAtBoot = false;   // persisted by saveGame() at the end of boot
// After the map rebuild: the old army arrives at the new home base.
const carriedTroops = parseFloat(store.get('openWaterCarryTroops')) || 0;   // parseFloat: huge armies are stored as "1e+22"
if (carriedTroops > 0) {
    bonusGrantedAtBoot = true;
    islandTroops[playerIslandId] = (islandTroops[playerIslandId] || 0) + carriedTroops;
    store.remove('openWaterCarryTroops');
}

// When each currently-owned temple was captured - the longer it's
// held continuously, the bigger its output bonus (see
// templeHoldMultiplier). Reset whenever a temple changes hands,
// whether that's the player or a bot taking it from a neutral
// garrison or from each other.
let templeHoldSince;
try {
    templeHoldSince = JSON.parse(store.get('openWaterTempleHoldSince')) || {};
} catch (e) {
    templeHoldSince = {};
}
function templeHoldMultiplier(templeId) {
    const since = templeHoldSince[templeId];
    if (!since) return 1;
    const heldMs = Date.now() - since;
    return 1 + Math.min(1, heldMs / TEMPLE_HOLD_STREAK_MS) * (TEMPLE_HOLD_STREAK_MAX_MULT - 1);
}

// Neutral islands hide their troop count until scouted
let scoutedIslands;
try {
    scoutedIslands = new Set(JSON.parse(store.get('openWaterScoutedIslands')));
} catch (e) {
    scoutedIslands = new Set();
}

