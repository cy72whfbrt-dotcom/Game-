// Teil 01b-weltkarte.js: Weltkarte: Inseln, Gebiete, Brücken, Pässe, Wege und Tore, Grundwerte für Verteidigung und Produktion
// Weltkarte wie das RoK-Königreich (LIESMICH 11c Punkt 30): Zone 1 außen (Start) … Zone 4 (Wächter-Tempel), in der Mitte der
// Thron – große Gebiete, zwischen ihnen Gebirge, durch das man nur an den Pässen kommt. Gebiete, Grenzen, Pässe, Tempel und
// Startplätze kommen aus KARTE_ZONEN (01a2, erzeugt von werkzeuge/kartentest/karte_erzeugen.js). Kein Wasser.
const GRID_N = 29;         // Kennung der Karte für den Weltrechner (start.js vergleicht sie mit der Welt): 29 Gebiete
const HEX_SPACING = 56120; // Längenmaß (früher die Breite einer Region): Basen-Abstände, Freiräume
const FRAME_HALF = KARTE_ZONEN.welt.halb;                   // der quadratische Kartenrand (Welt-Einheiten von der Mitte)
const KARTE_MASSSTAB = 1.8;  // die Karte ist größer als die 17 × 17-Karte: Basen-Abstand, Sicht, Gebiets-Verbund und Marschtempo wachsen mit (gleiches Spielgefühl)
const ZONE_MITTE = 5;
const ZONE_RING = { 1: 7, 2: 5, 3: 2, 4: 1, 5: 0 };       // Stärke wie die Ringe vorher: Zone 1 = außen (leicht) … Zone 4 = Wächter, Mitte = Thron
// Bases are scattered freely across a landmass (rejection-sampled,
// not a rigid grid) - only constraint is a minimum distance from
// every other base and the temple, so nothing ends up crowded.
// Neutral strength of the inner islands (the outer ring keeps the small starter values):
// the Thron-Insel is late-game, the Wächter-Inseln mid-game. Truppen in festen Zahlen (Alexander 6.10., Z4: Start 5.000 –
// reicht außen, aber nicht für den Wächter, „muss ja schwer sein“)
const TIER_STATS = {
    throne:   { troops: [5e4, 1.5e5], def: [1e4, 4e4],   level: 40, temple: [5e5, 1.5e5], templeLevel: 60 },
    guardian: { troops: [5e3, 2e4],   def: [1e3, 4e3],   level: 20, temple: [6e4, 1.5e4], templeLevel: 30 }
};
// Neutrale Basen außen: höchste Besatzung je Ring (außen 100, nach innen steigend bis 1.000 im Ring 2) – Basis 70–100 %, Tempel 150–260 %
const RING_TRUPPEN = { 2: 1000, 3: 700, 4: 450, 5: 300, 6: 200, 7: 100, 8: 100 };
const ringTruppen = lm => RING_TRUPPEN[lm.ring] || 100;
const RING_MULT = { 2: 300, 3: 60, 4: 20, 5: 8, 6: 2, 7: 1 };   // neutral strength of outer regions: the edge is easy, near the middle hard
function ringMult(lm) { return lm.tier === 'outer' ? (RING_MULT[lm.ring] || 1) : 1; }
function niceRoundW(n) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / p) * p; }
// Wirtschaft 5.10. (LIESMICH 11b A): Kosten und Gegner × WIRTSCHAFT_KOSTEN – als ganze Zahl, nie unter mn (sonst 1)
function wirtK(n, mn = 1) { return Math.max(mn, Math.round(n * WIRTSCHAFT_KOSTEN)); }
// Holz/Stein/Eisen (Z1, 6.10.): Kosten in RoK-Größe – × WIRTSCHAFT_KOSTEN × ROH_FAKTOR, ganze Zahl, nie unter 1
function wirtR(n) { return Math.max(1, Math.round(n * WIRTSCHAFT_KOSTEN * ROH_FAKTOR)); }
// Münzen (6.10., „B“): Kosten und Belohnungen × WIRTSCHAFT_KOSTEN × MUENZ_FAKTOR, ganze Zahl, nie unter 1
function wirtM(n) { return Math.max(1, Math.round(n * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR)); }
const ISLAND_RADIUS = 650; // tower footprint - bigger again, still well under the guaranteed minimum spacing between towers
const NEUTRAL_DEFENSE_MAX = 30;    // (alle neutralen Werte außen: % von ringTruppen)
const NEUTRAL_DEFENSE_MIN = 10;
const NEUTRAL_TROOPS_MAX = 100;
const NEUTRAL_TROOPS_MIN = 70;
// Temples: one per landmass except the center, which gets the
// stronger Mega-Tempel instead. Harder to hold than a regular tower,
// and reward Gold/Truppen/Gems on top of the normal per-level
// production for as long as the player keeps holding them.
const TEMPLE_DEFENSE_MIN = 40;
const TEMPLE_DEFENSE_MAX = 80;
const TEMPLE_TROOPS_MIN = 150;
const TEMPLE_TROOPS_MAX = 260;
const MEGA_TEMPLE_MULT = 8;        // Mega-Tempel (centre): 8x a normal temple's bonus
const GUARDIAN_TEMPLE_MULT = 3;    // Wächter-Tempel (the 4 guardian islands): 3x
function templeBaseMult(isl) { return isl.type === 'megaTemple' ? MEGA_TEMPLE_MULT : isl.guardian ? GUARDIAN_TEMPLE_MULT : 1; }
const TEMPLE_GEMS_PER_TICK = 0.0015;   // ~5 Gems an hour (up to ~24 held with a full Tempelschrein): a few hundred a day, not tens of thousands
const TEMPLE_COIN_BONUS_PER_TICK = 15 * WIRTSCHAFT_ERTRAG * MUENZ_FAKTOR;    // 15.000 Münzen und 6 Truppen pro Stunde (Gems bleiben wie sie sind)
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

// Liegt (x, y) im Gebiet lm? Reine Rechnung über seinen Umriss (die Grenzen aus KARTE_ZONEN) – in jedem Browser und beim
// Weltrechner genau gleich.
function aufLand(lm, x, y) { return pointInPolygon(x, y, lm.shape); }
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
// Grundverteidigung (6.10.): mindestens GRUND_VERT_STUFE je Stufe (Stufe 1: 50, Stufe 10: 500 – wie neutrale Basen außen 10–300),
// ab etwa Stufe 47 wächst sie wie bisher (× WIRTSCHAFT_KOSTEN: Stufe 60 ~46.000) – vorher stand sie bis Stufe 10 bei 1
const GRUND_VERT_STUFE = 50;
function baseDefenseForLevel(level) {
    const L = Math.max(1, Math.min(level, MAX_BASE_LEVEL));
    return Math.max(GRUND_VERT_STUFE * L, wirtK(BASE_DEFENSE * Math.pow(DEFENSE_GROWTH, L - 1)));
}
function defenseForLevel(level) {
    return Math.round(baseDefenseForLevel(level) * (1 + armorDefensePct() / 100));
}
// Ertrag je Produktions-Tick (1 s, mit „Geschwindigkeit“ kürzer): der runde Wert der Stufe kommt pro STUNDE (Alexander 5.10.) –
// je Tick also ein Bruchteil, die Reste sammeln prodCarry/botProdCarry (06d), damit nichts verloren geht
function coinsPerTick(level) {
    return Math.round(BASE_COINS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1)) * WIRTSCHAFT_ERTRAG * MUENZ_FAKTOR;   // (Stufe 1: 10.000 / Std.)
}
function troopsPerTick(level) {
    return Math.round(BASE_TROOPS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1)) * WIRTSCHAFT_ERTRAG;
}
// Basis aufwerten (ohne Rabatt): Münzen wirtM, gerundet, nie unter AUFWERTEN_MIN (6.10.: sonst „67 Münzen“ bei einem Ertrag von 10.000 / Std.)
const AUFWERTEN_MIN = 1000;
function upgradeCostRoh(level) { return Math.max(AUFWERTEN_MIN, niceRoundW(wirtM(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, level - 1)))); }
function upgradeCost(level) {                    // Wochen-Event „Bauherr“: 20 % günstiger
    let r = 1; try { if (evThemaAktiv('bau')) r = .8; } catch (e) {}
    return Math.round(upgradeCostRoh(level) * r);
}

// Die Gebiete (landmasses): Umriss = Ring aus ihren Grenzen, Mittelpunkt = Kern (Tempel, Thron, sonst am weitesten von den Grenzen).
// Landmasse 0 ist die Mitte (Thron), dann Zone 4 … Zone 1. ring/tier wie vorher (Stärke der Neutralen, Tore, Mitspieler).
function gebietUmriss(g) {
    const out = []; for (const r of g.rand) { const p = KARTE_ZONEN.grenzen[r < 0 ? -r - 1 : r].punkte; out.push(...(r < 0 ? [...p].reverse() : p).slice(out.length ? 1 : 0)); }
    return out.slice(0, -1).map(([x, y]) => ({ x, y }));
}
const landmasses = KARTE_ZONEN.gebiete.map(g => {
    const z = g.zone, shape = gebietUmriss(g), [x, y] = g.kern;
    let shapeMaxR = 0; for (const p of shape) shapeMaxR = Math.max(shapeMaxR, Math.hypot(p.x - x, p.y - y));
    return { id: g.id, zone: z, name: g.name, ring: ZONE_RING[z], x, y, shape, shapeMaxR, isCenter: z === ZONE_MITTE, tier: z === ZONE_MITTE ? 'throne' : z === 4 ? 'guardian' : 'outer',
             corner: false, bio: z === 3 ? 'sand' : 'green', boden: g.boden };
});
// Gebirge: Abstand eines Weltpunkts zur nächsten Grenze zwischen zwei Gebieten (Raster zum Finden; die Punkte liegen 3.000 auseinander)
const GRENZ_RASTER = 20000, grenzRaster = new Map();
for (const g of KARTE_ZONEN.grenzen) if (g.b !== -1) for (const [x, y] of g.punkte) { const k = Math.floor(x / GRENZ_RASTER) + ',' + Math.floor(y / GRENZ_RASTER); (grenzRaster.get(k) || grenzRaster.set(k, []).get(k)).push(x, y); }
function grenzAbstand(x, y) {                   // (höchstens 2 Rasterfelder weit gesucht: 40.000 reicht für jede Frage „steht es im Gebirge?“)
    const gx = Math.floor(x / GRENZ_RASTER), gy = Math.floor(y / GRENZ_RASTER); let m = 2 * GRENZ_RASTER;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const p = grenzRaster.get((gx + i) + ',' + (gy + j)); if (p) for (let k = 0; k < p.length; k += 2) m = Math.min(m, Math.hypot(p[k] - x, p[k + 1] - y)); }
    return m;
}
function grenzAbstandWeit(x, y) {               // wie grenzAbstand, aber ohne Grenze für die Weite (alle Grenzpunkte – nur selten gebraucht)
    let m = Infinity; for (const p of grenzRaster.values()) for (let k = 0; k < p.length; k += 2) m = Math.min(m, Math.hypot(p[k] - x, p[k + 1] - y));
    return m;
}
function gebietAn(x, y) {                       // das Gebiet unter einem Weltpunkt (undefined: außerhalb der Karte)
    for (const lm of landmasses) if (Math.abs(lm.x - x) <= lm.shapeMaxR && Math.abs(lm.y - y) <= lm.shapeMaxR && pointInPolygon(x, y, lm.shape)) return lm.id;
}

// Brücken (heute Pässe): der EINZIGE Weg von einem Gebiet ins andere – je Pass eine, quer durch das Gebirge (Enden je PASS_TIEFE
// vor und hinter dem Tor, im Gebiet a bzw. b). Das Tor steht genau auf der Grenze (br.pass), offen ab dem Tag seiner Stufe.
const PASS_TIEFE = 16000;
const bridges = KARTE_ZONEN.paesse.map(p => {
    const e1 = p.senk ? [p.x - PASS_TIEFE, p.y] : [p.x, p.y - PASS_TIEFE], e2 = p.senk ? [p.x + PASS_TIEFE, p.y] : [p.x, p.y + PASS_TIEFE];
    const [A, B] = pointInPolygon(e1[0], e1[1], landmasses[p.a].shape) ? [e1, e2] : [e2, e1];
    return { a: p.a, b: p.b, x1: A[0], y1: A[1], x2: B[0], y2: B[1], pass: p };
});
// Wege in einem Gebiet: nie durchs Gebirge. Gerade Strecke, wenn sie überall WEG_FREI vom Gebirge bleibt; sonst über ein grobes
// Wegnetz des Gebiets (Gitterpunkte, die frei liegen; einmal je Gebiet gebaut, kürzester Weg, danach gestrafft).
const WEG_FREI = 6000, WEG_NETZ = 26000;
function wegFrei(a, b) {                         // bleibt die Strecke a → b überall WEG_FREI vom Gebirge (und auf der Karte)?
    const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L / 4000));
    for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
        if (Math.abs(x) > FRAME_HALF || Math.abs(y) > FRAME_HALF || grenzAbstand(x, y) < WEG_FREI) return false; }
    return true;
}
const wegNetze = {};
function wegNetz(lmId) {                         // → [{ x, y, nb: [Index] }] frei liegende Gitterpunkte des Gebiets, verbunden, wo der Weg frei ist
    if (wegNetze[lmId]) return wegNetze[lmId];
    const lm = landmasses[lmId], k = [];
    for (let x = Math.floor((lm.x - lm.shapeMaxR) / WEG_NETZ) * WEG_NETZ; x <= lm.x + lm.shapeMaxR; x += WEG_NETZ)
        for (let y = Math.floor((lm.y - lm.shapeMaxR) / WEG_NETZ) * WEG_NETZ; y <= lm.y + lm.shapeMaxR; y += WEG_NETZ)
            if (grenzAbstand(x, y) >= WEG_FREI * 2 && Math.abs(x) < FRAME_HALF && Math.abs(y) < FRAME_HALF && pointInPolygon(x, y, lm.shape)) k.push({ x, y, nb: [] });
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++)
        if (Math.hypot(k[i].x - k[j].x, k[i].y - k[j].y) <= WEG_NETZ * 1.5 && wegFrei(k[i], k[j])) { k[i].nb.push(j); k[j].nb.push(i); }
    return (wegNetze[lmId] = k);
}
function gebietWeg(a, b, lmId) {                 // a → b im Gebiet lmId: [a, …, b]
    if (wegFrei(a, b)) return [a, b];
    const K = wegNetz(lmId), nah = p => K.map((q, i) => [i, Math.hypot(q.x - p.x, q.y - p.y)]).filter(([i, d]) => d < WEG_NETZ * 3 && wegFrei(p, K[i])).sort((u, v) => u[1] - v[1]).slice(0, 4);
    const von = nah(a), zu = new Map(nah(b));
    if (!von.length || !zu.size) return [a, b];
    const dist = new Map(von.map(([i, d]) => [i, d])), prev = new Map(), offen = von.map(([i]) => i), fertig = new Set(); let ende = -1, best = Infinity;
    while (offen.length) {
        offen.sort((u, v) => dist.get(u) - dist.get(v)); const c = offen.shift(); if (fertig.has(c)) continue; fertig.add(c);
        if (dist.get(c) >= best) break;
        if (zu.has(c) && dist.get(c) + zu.get(c) < best) { best = dist.get(c) + zu.get(c); ende = c; }
        for (const n of K[c].nb) { const d = dist.get(c) + Math.hypot(K[n].x - K[c].x, K[n].y - K[c].y); if (!dist.has(n) || d < dist.get(n)) { dist.set(n, d); prev.set(n, c); offen.push(n); } }
    }
    if (ende < 0) return [a, b];
    const roh = [b]; for (let c = ende; c !== undefined; c = prev.get(c)) roh.unshift({ x: K[c].x, y: K[c].y }); roh.unshift(a);
    const out = [a];                                     // straffen: vom letzten Punkt so weit wie frei sichtbar
    for (let i = 0; i < roh.length - 1;) { let j = roh.length - 1; while (j > i + 1 && !wegFrei(roh[i], roh[j])) j--; out.push(roh[j]); i = j; }
    return out;
}
function bridgeOfGate(gate) { return bridges.find(br => br.gateId === gate.id) || null; }
function bridgeBetween(a, b) {
    return bridges.find(br => (br.a === a && br.b === b) || (br.a === b && br.b === a)) || null;
}
// Pässe öffnen von außen nach innen (Alexander 7.10.): Zone 1 untereinander ab Tag 1, in Zone 2 ab Tag 2 … zur Mitte ab Tag 5
// (KARTE_ZONEN.oeffnen) – bis dahin für alle zu, Spieler wie Mitspieler. Der Welt-Start kommt bei jedem Saison-Reset neu (saisonWelt).
function worldStartAt() {
    let t = parseInt(store.get('openWaterWorldStart'), 10);
    if (!t) { t = Date.now(); store.set('openWaterWorldStart', String(t)); }
    return t;
}
function passOpensAt(br) {
    const tag = KARTE_ZONEN.oeffnen[br.pass.stufe] || 1;
    return tag > 1 ? worldStartAt() + (tag - 1) * 86400000 : 0;
}
// Der Thron (Mega-Tempel in der Mitte) zählt erst ab Tag 7 (Alexander 7.10.: KARTE_ZONEN.thron.tag) – vorher kann ihn niemand angreifen
function thronOffenAb() { return worldStartAt() + (KARTE_ZONEN.thron.tag - 1) * 86400000; }
function landmassesConnected(a, b) {
    if (a === b) return true;
    const br = bridgeBetween(a, b);
    return !!br && Date.now() >= passOpensAt(br);
}
// Long marches: troops may cross any number of regions as long as every gate on the way belongs to them;
// only the last crossing (into the target's region) may be someone else's gate (toll / shut as usual).
// → the chain of landmass ids from a to b, or null. Kürzester Weg (Dijkstra über die 29 Gebiete, Länge über die Pässe),
// je Lage (Besitz, offene Pässe) kurz zwischengespeichert. alle: jeden Pass nehmen (nur die Lage der Linie, wenn kein Weg geht).
const WEG_MERK = new Map();
const offenePaesse = () => { const t = Date.now(); let n = 0; for (const br of bridges) if (t >= passOpensAt(br)) n++; return n; };
function routeFor(a, b, payer, alle) {
    if (a === b) return [a];
    const key = a + '>' + b + '|' + payer + '|' + (alle ? 1 : 0) + '|' + ownVer + '|' + offenePaesse(), m = WEG_MERK.get(key), jetzt = Date.now();
    if (m && jetzt - m.t < 2000) return m.r;
    const dist = { [a]: 0 }, prev = { [a]: -1 }, wo = { [a]: { x: landmasses[a].x, y: landmasses[a].y } }, offen = [a], fertig = new Set();
    let r = null;
    while (offen.length) {
        offen.sort((u, v) => dist[u] - dist[v]); const cur = offen.shift(); if (fertig.has(cur)) continue; fertig.add(cur);
        if (cur === b) { r = []; for (let x = b; x !== -1; x = prev[x]) r.unshift(x); break; }
        for (const br of bridges) {
            if (br.a !== cur && br.b !== cur) continue;
            const nb = br.a === cur ? br.b : br.a; if (fertig.has(nb)) continue;
            if (!alle) {
                if (!landmassesConnected(cur, nb)) continue;
                const gate = gateOnRoute(cur, nb), free = !gate || islandOwnerOf(gate.id) === payer || bundFreund(islandOwnerOf(gate.id), payer);   // (Tore des eigenen Bündnisses sind frei)
                if (!free && (nb !== b || landmasses[b].zone === 5)) continue;    // a foreign gate ends the march there (in die Mitte nur über einen eigenen Pass)
            }
            const e1 = br.a === cur ? { x: br.x1, y: br.y1 } : { x: br.x2, y: br.y2 }, e2 = br.a === cur ? { x: br.x2, y: br.y2 } : { x: br.x1, y: br.y1 };
            const d = dist[cur] + Math.hypot(e1.x - wo[cur].x, e1.y - wo[cur].y) + Math.hypot(e2.x - e1.x, e2.y - e1.y);
            if (dist[nb] === undefined || d < dist[nb]) { dist[nb] = d; prev[nb] = cur; wo[nb] = e2; offen.push(nb); }
        }
    }
    if (WEG_MERK.size > 3000) WEG_MERK.clear();
    WEG_MERK.set(key, { t: jetzt, r });
    return r;
}
// Warum kommt man von a nicht nach b? → Text für den Hinweis (Pass noch zu / Pass gesperrt) oder null
function wegGrund(a, b, payer) {
    const r = routeFor(a, b, payer, true); if (!r) return 'Kein Weg dorthin.';
    for (let i = 0; i + 1 < r.length; i++) {
        const br = bridgeBetween(r[i], r[i + 1]), auf = passOpensAt(br) - Date.now();
        if (auf > 0) return 'Der Pass ist noch verschlossen – er öffnet in ' + fmtPassWait(auf) + '.';
        const gate = gateOnRoute(r[i], r[i + 1]), ow = gate && islandOwnerOf(gate.id);
        if (gate && (i + 2 < r.length || landmasses[b].zone === 5) && ow !== payer && !bundFreund(ow, payer)) return 'Pass gesperrt – ' + (ow ? 'das Tor gehört ' + ((botById[ow] || {}).name || 'jemand anderem') : 'das Tor ist unbesetzt') + '. Erobere zuerst das Tor.';
    }
    return null;
}
function canReach(a, b, payer) { return !!routeFor(a, b, payer || 'player'); }
// Kommt ein Späher von a nach b? Ein geschlossenes fremdes Tor lässt ihn nicht durch (offene Tore schon).
// Ein noch nicht offener Pass ebenso (Zonen wie RoK).
function spaeherWeg(a, b, who) {
    if (a === b) return true;
    const suche = streng => { const seen = new Set([a]), q = [a];
        while (q.length) { const cur = q.shift();
            for (const nb of reachableLandmassIds[cur] || []) { if (seen.has(nb) || !landmassesConnected(cur, nb)) continue;
                if (streng) { const g = gateOnRoute(cur, nb); if (g && islandOwnerOf(g.id) !== who && !bundFreund(islandOwnerOf(g.id), who) && gateSettings(g).closed) continue; }
                if (nb === b) return true; seen.add(nb); q.push(nb); } }
        return false; };
    return suche(true);                         // (ein Pass mit Countdown lässt auch Späher nicht durch)
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
// Maut je Truppe: die Stufe (gespeichert wie vorher 0,1 … 2) × MUENZ_FAKTOR = 100 … 2.000 Münzen; je Marsch mindestens 100 Münzen
// (eine Truppe zur kleinsten Maut) und höchstens 1 Mio. × WIRTSCHAFT_KOSTEN (wirtM, gerundet: 560.000)
const GATE_TOLLS = [0, 0.1, 0.25, 0.5, 1, 2], MAUT_MIN = 100, MAUT_MAX = niceRoundW(wirtM(1e6));
const mautJeTruppe = t => t * MUENZ_FAKTOR;
function tollFor(fromLm, toLm, troops, payer, targetId, cut) {  // → { gate, cost, closed } (free for the gate's owner - and for an attack ON the gate itself); cut = a hero's −% Maut
    const gate = gateOnRoute(fromLm, toLm);
    if (!gate || islandOwnerOf(gate.id) === payer || gate.id === targetId || bundFreund(islandOwnerOf(gate.id), payer)) return { gate, cost: 0 };   // Bündnis: Tore der Mitglieder sind für alle Mitglieder frei und offen
    const cfg = gateSettings(gate);
    if (!islandOwnerOf(gate.id) || cfg.closed) return { gate, cost: Infinity, closed: true };   // unowned gates are shut
    return { gate, cost: cfg.toll > 0 ? Math.round(Math.max(MAUT_MIN, Math.min(MAUT_MAX, Math.round(Math.max(0, troops) * mautJeTruppe(cfg.toll)))) * (1 - Math.min(90, cut || 0) / 100)) : 0 };   // (ganze Münzen – auch mit Helden-Rabatt)
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

