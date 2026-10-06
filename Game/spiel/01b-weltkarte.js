// Teil 01b-weltkarte.js: Weltkarte: Inseln, Gebiete, Brücken, Pässe, Wege und Tore, Grundwerte für Verteidigung und Produktion
// Layout: a honeycomb - the important central landmass (the hub) at
// the middle of a hex grid, with rings of same-size landmasses
// radiating outward around it (like Million Lord: lots of islands
// packed tightly edge to edge). Every hex-ADJACENT pair of
// landmasses gets its own short "mini bridge", not just hub-to-
// outer - so expanding means hopping from island to island outward
// through whichever neighbors you've bridged/captured, not
// attacking anything anywhere. Spacing found via a search against
// the actual coastline generator for the tightest hex packing with
// zero overlap.
const GRID_N = 17;         // square world: 17 × 17 regions (Paket C, vorher 15 × 15 – Messwerte in LIESMICH 23), the Thron-Insel in the middle, the 8 regions around it form the ring
const HEX_SPACING = 56120; // distance between orthogonally adjacent cell centres (tightest packing with zero overlap)
const GRID_HALF = (GRID_N - 1) / 2;
const RIVER_HALF = 1500;   // one big square continent: its regions are split by narrow rivers (half width)
const FRAME_HALF = (GRID_HALF + .5) * HEX_SPACING + 9000;   // the square map border (world units from the centre)
// Bases are scattered freely across a landmass (rejection-sampled,
// not a rigid grid) - only constraint is a minimum distance from
// every other base and the temple, so nothing ends up crowded.
// Neutral strength of the inner islands (the outer ring keeps the small starter values):
// the Thron-Insel is late-game, the Wächter-Inseln mid-game.
const TIER_STATS = {
    throne:   { troops: [5e6, 2e7],   def: [1e6, 4e6],   level: 40, temple: [2.5e8, 6e7], templeLevel: 60 },
    guardian: { troops: [1e5, 1e6],   def: [2e4, 2e5],   level: 20, temple: [5e6, 1e6],   templeLevel: 30 }
};
const RING_MULT = { 2: 300, 3: 60, 4: 20, 5: 8, 6: 2, 7: 1 };   // neutral strength of outer regions: the edge is easy, near the middle hard
function ringMult(lm) { return lm.tier === 'outer' ? (RING_MULT[lm.ring] || 1) : 1; }
function niceRoundW(n) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / p) * p; }
// Wirtschaft 5.10. (LIESMICH 11b A): Kosten und Gegner × WIRTSCHAFT_KOSTEN – als ganze Zahl, nie unter mn (sonst 1)
function wirtK(n, mn = 1) { return Math.max(mn, Math.round(n * WIRTSCHAFT_KOSTEN)); }
const ISLAND_RADIUS = 650; // tower footprint - bigger again, still well under the guaranteed minimum spacing between towers
const NEUTRAL_DEFENSE_MAX = 100;
const NEUTRAL_DEFENSE_MIN = 20;
const NEUTRAL_TROOPS_MAX = 100;
const NEUTRAL_TROOPS_MIN = 0;
// Temples: one per landmass except the center, which gets the
// stronger Mega-Tempel instead. Harder to hold than a regular tower,
// and reward Gold/Truppen/Gems on top of the normal per-level
// production for as long as the player keeps holding them.
const TEMPLE_DEFENSE_MIN = 220;
const TEMPLE_DEFENSE_MAX = 380;
const TEMPLE_TROOPS_MIN = 150;
const TEMPLE_TROOPS_MAX = 260;
const MEGA_TEMPLE_MULT = 8;        // Mega-Tempel (centre): 8x a normal temple's bonus
const GUARDIAN_TEMPLE_MULT = 3;    // Wächter-Tempel (the 4 guardian islands): 3x
function templeBaseMult(isl) { return isl.type === 'megaTemple' ? MEGA_TEMPLE_MULT : isl.guardian ? GUARDIAN_TEMPLE_MULT : 1; }
const TEMPLE_GEMS_PER_TICK = 0.0015;   // ~5 Gems an hour (up to ~24 held with a full Tempelschrein): a few hundred a day, not tens of thousands
const TEMPLE_COIN_BONUS_PER_TICK = 15 * WIRTSCHAFT_ERTRAG;    // 15 Münzen und 6 Truppen pro Stunde (Gems bleiben wie sie sind)
const TEMPLE_TROOP_BONUS_PER_TICK = 6 * WIRTSCHAFT_ERTRAG;
const TEMPLE_HOLD_STREAK_MS = 30 * 60 * 1000; // 30min to reach the max hold bonus
const TEMPLE_HOLD_STREAK_MAX_MULT = 2; // holding it long enough doubles its output

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(1337);

// Ray-casting point-in-polygon test, used to keep towers from being
// placed off the edge of a landmass's organic (non-square) coastline.
// Liegt (x, y) auf dem Land? Reine Rechnung (die geglättete Küste in feine Stücke zerlegt) – gibt in jedem Browser und
// auf dem Server genau dasselbe Ergebnis (früher über die Zeichenfläche: je nach Browser minimal anders, auf dem Server gar nicht).
function aufLand(lm, x, y) {
    if (!lm.feinKueste) { const P = lm.shape, n = P.length, out = [], mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        let m0 = mid(P[n - 1], P[0]);
        for (let i = 0; i < n; i++) { const c = P[i], m1 = mid(P[i], P[(i + 1) % n]);
            for (let k = 0; k < 12; k++) { const t = k / 12, u = 1 - t; out.push({ x: u * u * m0.x + 2 * u * t * c.x + t * t * m1.x, y: u * u * m0.y + 2 * u * t * c.y + t * t * m1.y }); }
            m0 = m1; }
        lm.feinKueste = out; }
    return pointInPolygon(x, y, lm.feinKueste);
}
function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersects = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

// The point on a landmass's coastline that faces exactly toward
// some other point, i.e. where the straight line between the two
// landmass centers crosses the coastline - not just "whichever
// shape point happens to be closest", which could sit off to the
// side and make the bridge cut across at a crooked angle. Works
// directly off generateRegionShape()'s own parametrization: its
// points are sampled at uniformly increasing angles around the
// landmass's center, so the point at any bearing is a straight
// interpolation between the two samples that bracket it.
function polygonPointAtAngle(lm, angle) {
    const n = lm.shape.length;
    const step = (Math.PI * 2) / n;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = norm / step;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const t = idx - Math.floor(idx);
    const p0 = lm.shape[i0], p1 = lm.shape[i1];
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

// Game balance - exponential, so a base keeps mattering from the first
// hundred troops up to the trillions (level 100 ≈ 0,9 Bio. defence).
// Costs grow a bit faster than income, so every level takes longer.
const MAX_BASE_LEVEL = 100;
const BASE_DEFENSE = 100, DEFENSE_GROWTH = 1.26;
const BASE_COINS = 10, BASE_TROOPS = 5, PRODUCTION_GROWTH = 1.15;
const UPGRADE_BASE_COST = 120, UPGRADE_COST_GROWTH = 1.27;

// The level-based defense every base gets, with no equipment/
// skill bonus - used for bot- and (in a future PvP defense) other-
// player-owned bases, which don't have the human player's gear.
function baseDefenseForLevel(level) {
    return wirtK(BASE_DEFENSE * Math.pow(DEFENSE_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1));   // (× WIRTSCHAFT_KOSTEN)
}
function defenseForLevel(level) {
    return Math.round(baseDefenseForLevel(level) * (1 + armorDefensePct() / 100));
}
// Ertrag je Produktions-Tick (1 s, mit „Geschwindigkeit“ kürzer): der runde Wert der Stufe kommt pro STUNDE (Alexander 5.10.) –
// je Tick also ein Bruchteil, die Reste sammeln prodCarry/botProdCarry (06d), damit nichts verloren geht
function coinsPerTick(level) {
    return Math.round(BASE_COINS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1)) * WIRTSCHAFT_ERTRAG;
}
function troopsPerTick(level) {
    return Math.round(BASE_TROOPS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1)) * WIRTSCHAFT_ERTRAG;
}
function upgradeCostRoh(level) { return wirtK(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, level - 1)); }   // ohne Rabatt (× WIRTSCHAFT_KOSTEN)
function upgradeCost(level) {                    // Wochen-Event „Bauherr“: 20 % günstiger
    let r = 1; try { if (evThemaAktiv('bau')) r = .8; } catch (e) {}
    return Math.round(upgradeCostRoh(level) * r);
}

// The big islands themselves - just background land, drawn as one
// organic coastline each, no ownership state of their own. Landmass
// 0 is always the centre (Thron-Insel); the others sit on a square
// 9 × 9 grid around it.
// A region of the continent: a square cell whose edges follow the river centre lines between the cells
// (shared by both neighbours, so the banks match) - sampled at uniform angles,
// so polygonPointAtAngle works on it. The continent's outer edge is a gently wavy coast.
function riverOffset(vertical, line, t) {       // meander of the river line `line` (between cells) at position t along it
    const k = line * 2.37 + (vertical ? 0 : 11.3);
    return 1400 * Math.sin(t / 6100 + k) + 700 * Math.sin(t / 2300 + k * 1.9) + 300 * Math.sin(t / 900 + k * 3.7);
}
function generateRegionShape(q, r) {
    const S = HEX_SPACING, cx = q * S, cy = r * S, N = 120, out = [];
    const edge = (side, t) => {                  // world coordinate of one bank at position t along it
        const vertical = side === 0 || side === 2, line = side === 0 ? q + .5 : side === 2 ? q - .5 : side === 1 ? r + .5 : r - .5;
        const outer = Math.abs(line) > GRID_HALF, base = line * S + riverOffset(vertical, line, t) * (outer ? 1.6 : 1);
        const sign = side === 0 || side === 1 ? -1 : 1;             // right / bottom bank sits left / above the river line
        return base + sign * (outer ? 0 : RIVER_HALF);
    };
    for (let i = 0; i < N; i++) {
        const th = i / N * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
        let best = Infinity;
        for (let side = 0; side < 4; side++) {
            const vertical = side === 0 || side === 2, d = vertical ? dx : dy;
            if ((side === 0 || side === 1) ? d <= 1e-6 : d >= -1e-6) continue;
            let tt = S * .5;
            for (let it = 0; it < 4; it++) {                         // the bank moves with t: a few fixed-point steps
                const along = vertical ? cy + dy * tt : cx + dx * tt;
                tt = ((edge(side, along)) - (vertical ? cx : cy)) / d;
            }
            if (tt > 0) best = Math.min(best, tt);
        }
        out.push({ x: cx + dx * best, y: cy + dy * best });
    }
    return out;
}

// Landscape: snow in the north, grassland in the middle band, desert in the south (the border steps a little per column);
// the ring around the middle is stone, the regions right next to it stay green.
// Paket C: dazu Eis ganz im Norden (oberste Reihe), zwei Vulkan-Gebiete nahe der Mitte (west und ost, je 5 Regionen)
// und Sumpf in den Flussniederungen des grünen Mittelstreifens (außen, verstreut). Reine Optik – keine Spielwirkung.
const VULKANE = [[-4, 0], [4, 1]];
function regionBiome(q, r) {
    const ring = Math.max(Math.abs(q), Math.abs(r)); if (ring <= 2) return 'green';
    if (ring <= 5 && VULKANE.some(([vq, vr]) => Math.abs(q - vq) + Math.abs(r - vr) <= 1)) return 'volcano';
    const h = Math.sin(q * 12.9898 + 78.233) * 43758.5453, wob = Math.round((h - Math.floor(h)) * 2 - 1), y = r + wob * .6;
    if (y <= -GRID_HALF + .6) return 'ice';
    if (y <= -2.6) return 'snow';
    if (y >= 2.6) return 'sand';
    const n = Math.sin(q * 39.346 + r * 11.135 + 4.17) * 24634.6345, nass = n - Math.floor(n);   // feuchte Niederung?
    return ring >= 4 && Math.abs(y) < 2 && nass > .6 ? 'swamp' : 'green';
}
// Temples: the Mega-Tempel in the middle, a Wächter-Tempel in each of the 4 corners of the ring, and 24 normal temples on two
// clean squares around the middle (ring 3: corners + side middles, ring 5: corners, side middles and two more per side).
function regionHasTemple(lm) {
    if (lm.isCenter || lm.corner) return true;
    const aq = Math.abs(lm.q), ar = Math.abs(lm.r);
    return (lm.ring === 3 && ((aq === 3 && ar === 3) || lm.q === 0 || lm.r === 0)) || (lm.ring === 5 && ((aq === 5 && ar === 5) || lm.q === 0 || lm.r === 0 || aq === 3 || ar === 3));
}
const landmasses = [];
{
    let lmId = 0;
    // World layout (square map): the Thron-Insel (Mega-Tempel) in the middle cell, the 4 Wächter-Inseln
    // north / east / south / west of it, every other cell an outer island where the player and bots start.
    const cells = [];
    for (let r = -GRID_HALF; r <= GRID_HALF; r++) for (let q = -GRID_HALF; q <= GRID_HALF; q++) cells.push({ q, r, d: Math.max(Math.abs(q), Math.abs(r)) });
    cells.sort((u, v) => u.d - v.d || u.r - v.r || u.q - v.q);                      // landmass 0 = the centre, then the guardians
    for (const cell of cells) {
        const isC = cell.d === 0, tier = isC ? 'throne' : cell.d === 1 ? 'guardian' : 'outer';
        const radius = HEX_SPACING * .4;                                             // (tower spacing scales with it)
        const x = cell.q * HEX_SPACING, y = cell.r * HEX_SPACING;
        const shape = generateRegionShape(cell.q, cell.r);
        let shapeMaxR = 0;
        for (const p of shape) shapeMaxR = Math.max(shapeMaxR, Math.hypot(p.x - x, p.y - y));
        const corner = cell.d === 1 && Math.abs(cell.q) === 1 && Math.abs(cell.r) === 1;
        landmasses.push({ id: lmId, q: cell.q, r: cell.r, ring: cell.d, x, y, radius, shape, shapeMaxR, isCenter: isC, tier, corner, bio: regionBiome(cell.q, cell.r) });
        lmId++;
    }
}

// Bridges: the ONLY way to cross from one landmass to a different
// one - every hex-ADJACENT pair of landmasses gets its own short
// bridge (not just hub-to-outer), so the honeycomb is a proper mesh
// you expand outward through island by island. Anchored exactly on
// the straight line between the two landmass centers (see
// polygonPointAtAngle), so the bridge always crosses the water
// directly instead of angling off toward whatever shape point
// happened to be closest. Some coastline pairs land almost flush
// against each other (a near-zero gap) - stretched out to a
// minimum visible length here so the bridge always reads as a
// short straight line instead of collapsing into a round blob
// where its two line-cap ends overlap.
const MIN_BRIDGE_VISUAL_LENGTH = 700;
const bridges = [];
for (let i = 0; i < landmasses.length; i++) {
    for (let j = i + 1; j < landmasses.length; j++) {
        const a = landmasses[i], b = landmasses[j];
        const dq = a.q - b.q, dr = a.r - b.r;
        const isAdjacent = Math.abs(dq) + Math.abs(dr) === 1;                          // north / south / east / west neighbours
        if (!isAdjacent) continue;
        const angleAtoB = Math.atan2(b.y - a.y, b.x - a.x);
        let p1 = polygonPointAtAngle(a, angleAtoB);
        let p2 = polygonPointAtAngle(b, angleAtoB + Math.PI);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < MIN_BRIDGE_VISUAL_LENGTH) {
            const ux = dx / dist, uy = dy / dist;
            const extra = (MIN_BRIDGE_VISUAL_LENGTH - dist) / 2;
            p1 = { x: p1.x - ux * extra, y: p1.y - uy * extra };
            p2 = { x: p2.x + ux * extra, y: p2.y + uy * extra };
        }
        bridges.push({ a: a.id, b: b.id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
}
function bridgeBetween(a, b) {
    return bridges.find(br => (br.a === a && br.b === b) || (br.a === b && br.b === a)) || null;
}
// Pässe: die Brücken zu den Wächter-Inseln und zur Thron-Insel öffnen erst 3 Tage nach dem Welt-Start (Alexander 6.10.: „dann haben
// alle genug Zeit“) – bis dahin für alle zu, Spieler wie Mitspieler. Der Welt-Start kommt bei jedem Saison-Reset neu (saisonWelt).
const PASS_OPEN_DAYS = { guardian: 3, throne: 3 };        // Tage ab Welt-Start (0 = Timer aus)
function worldStartAt() {
    let t = parseInt(store.get('openWaterWorldStart'), 10);
    if (!t) { t = Date.now(); store.set('openWaterWorldStart', String(t)); }
    return t;
}
function passOpensAt(br) {
    const ta = landmasses[br.a].tier, tb = landmasses[br.b].tier;
    const inner = ta === 'throne' || tb === 'throne' ? 'throne' : ta === 'guardian' || tb === 'guardian' ? 'guardian' : null;
    return inner ? worldStartAt() + PASS_OPEN_DAYS[inner] * 86400000 : 0;
}
function landmassesConnected(a, b) {
    if (a === b) return true;
    const br = bridgeBetween(a, b);
    return !!br && Date.now() >= passOpensAt(br);
}
// Long marches: troops may cross any number of regions as long as every gate on the way belongs to them;
// only the last crossing (into the target's region) may be someone else's gate (toll / shut as usual).
// → the chain of landmass ids from a to b, or null. BFS over the regions, cheap enough per call.
function routeFor(a, b, payer) {
    if (a === b) return [a];
    if (landmassesConnected(a, b)) return [a, b];
    const prev = { [a]: -1 }, queue = [a];
    while (queue.length) {
        const cur = queue.shift();
        for (const nb of reachableLandmassIds[cur] || []) {
            if (nb === cur || prev[nb] !== undefined || !landmassesConnected(cur, nb)) continue;
            const gate = gateOnRoute(cur, nb), free = !gate || islandOwnerOf(gate.id) === payer || bundFreund(islandOwnerOf(gate.id), payer);   // (Tore des eigenen Bündnisses sind frei)
            if (nb === b) { const out = [b]; for (let x = cur; x !== -1; x = prev[x]) out.unshift(x); return out; }
            if (!free) continue;                    // a foreign gate ends the march there
            prev[nb] = cur; queue.push(nb);
        }
    }
    return null;
}
function canReach(a, b, payer) { return !!routeFor(a, b, payer || 'player'); }
// Kommt ein Späher von a nach b? Ein geschlossenes fremdes Tor lässt ihn nicht durch (offene Tore schon).
// false nur, wenn genau ein geschlossenes Tor den Weg versperrt – sonst wie bisher.
function spaeherWeg(a, b, who) {
    if (a === b) return true;
    const suche = streng => { const seen = new Set([a]), q = [a];
        while (q.length) { const cur = q.shift();
            for (const nb of reachableLandmassIds[cur] || []) { if (seen.has(nb) || !landmassesConnected(cur, nb)) continue;
                if (streng) { const g = gateOnRoute(cur, nb); if (g && islandOwnerOf(g.id) !== who && !bundFreund(islandOwnerOf(g.id), who) && gateSettings(g).closed) continue; }
                if (nb === b) return true; seen.add(nb); q.push(nb); } }
        return false; };
    return suche(true) || !suche(false);
}
function lastHop(a, b, payer) { const r = routeFor(a, b, payer); return r && r.length > 1 ? [r[r.length - 2], r[r.length - 1]] : [a, b]; }
function gateOnRoute(fromLm, toLm) {            // the gate base guarding the bridge between two regions (or null)
    if (fromLm === toLm) return null;
    const br = bridgeBetween(fromLm, toLm);
    return br && br.gateId !== undefined ? islandById[br.gateId] : null;
}
// Gate owners set the toll per troop (0 = free passage) and can shut the gate: then nobody else gets across.
var gateCfg = null;
function loadGateCfg() { if (!gateCfg) { try { gateCfg = JSON.parse(store.get('openWaterGateCfg')) || {}; } catch (e) { gateCfg = {}; } } return gateCfg; }
function gateSettings(gate) { return Object.assign({ toll: gate.toll, closed: false }, loadGateCfg()[gate.id] || {}); }
function setGateSettings(gateId, patch) { const c = loadGateCfg(); c[gateId] = Object.assign(gateSettings(islandById[gateId]), patch); store.set('openWaterGateCfg', JSON.stringify(c)); }
const GATE_TOLLS = [0, 0.1, 0.25, 0.5, 1, 2], TOLL_MIN = 100, TOLL_MAX = 1e6;   // per troop, at least 100 and never more than 1 Mio. per march (beides × WIRTSCHAFT_KOSTEN)
function tollFor(fromLm, toLm, troops, payer, targetId, cut) {  // → { gate, cost, closed } (free for the gate's owner - and for an attack ON the gate itself); cut = a hero's −% Maut
    const gate = gateOnRoute(fromLm, toLm);
    if (!gate || islandOwnerOf(gate.id) === payer || gate.id === targetId || bundFreund(islandOwnerOf(gate.id), payer)) return { gate, cost: 0 };   // Bündnis: Tore der Mitglieder sind für alle Mitglieder frei und offen
    const cfg = gateSettings(gate);
    if (!islandOwnerOf(gate.id) || cfg.closed) return { gate, cost: Infinity, closed: true };   // unowned gates are shut
    return { gate, cost: cfg.toll > 0 ? Math.round(Math.max(wirtK(TOLL_MIN), Math.min(wirtK(TOLL_MAX), Math.round(Math.max(0, troops) * cfg.toll))) * (1 - Math.min(90, cut || 0) / 100)) : 0 };   // (ganze Münzen – auch mit Helden-Rabatt)
}
function payToll(fromLm, toLm, troops, payer, targetId, cut) { // payer: 'player' | bot id → false when it can't pay
    const { gate, cost, closed } = tollFor(fromLm, toLm, troops, payer, targetId, cut);
    if (!cost) return true;
    if (closed) { if (payer === 'player') { const ow = islandOwnerOf(gate.id);
        flashHint(ow ? 'Das Tor ist geschlossen – ' + botById[ow].name + ' lässt niemanden durch. Erobere das Tor.' : 'Das Tor ist unbesetzt und verschlossen – erobere es zuerst, dann kommst du durch.', 4000); } return false; }
    const have = payer === 'player' ? coins : (botCoins[payer] || 0);
    if (have < cost) { if (payer === 'player') flashHint('Maut am Tor: ' + fmtNum(cost) + ' Münzen – du hast zu wenig. Erobere das Tor, dann ist es kostenlos.', 4000); return false; }
    if (payer === 'player') coins -= cost; else botCoins[payer] -= cost;
    const owner = islandOwnerOf(gate.id);
    if (owner === 'player') { coins += cost; flashHint(botById[payer].name + ' zahlt ' + fmtNum(cost) + ' Münzen Maut an deinem Tor.', 3500); }
    else if (owner) botCoins[owner] = (botCoins[owner] || 0) + cost;
    if (payer === 'player') flashHint('Maut bezahlt: ' + fmtNum(cost) + ' Münzen' + (owner ? ' an ' + botById[owner].name : '') + '.', 3500);
    goalBump(payer, 'tolls'); goalBump(owner, 'tollCoins', cost);
    return true;
}
// (Zuschauer) vor dem Befehl prüfen, ob das Tor offen ist und die Maut reicht – bezahlt wird beim Weltrechner
function mautVorab(fromLm, toLm, troops, targetId, cut) {
    const { gate, cost, closed } = tollFor(fromLm, toLm, troops, 'player', targetId, cut);
    if (!cost) return true;
    if (closed) { const ow = islandOwnerOf(gate.id); flashHint(ow ? 'Das Tor ist geschlossen – ' + botById[ow].name + ' lässt niemanden durch. Erobere das Tor.' : 'Das Tor ist unbesetzt und verschlossen – erobere es zuerst, dann kommst du durch.', 4000); return false; }
    if (coins < cost) { flashHint('Maut am Tor: ' + fmtNum(cost) + ' Münzen – du hast zu wenig. Erobere das Tor, dann ist es kostenlos.', 4000); return false; }
    return true;
}
function fmtPassWait(ms) {
    return fmtDHMS(ms / 1000);
}
function noRouteHint(a, b) {
    const br = bridgeBetween(a, b);
    return br ? 'Der Pass ist noch verschlossen – er öffnet in ' + fmtPassWait(passOpensAt(br) - Date.now())
              : 'Keine Brücke zwischen diesen Inseln – erobere eine verbundene Basis, um näher heranzukommen.';
}

