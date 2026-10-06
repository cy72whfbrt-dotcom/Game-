// Teil 08e-stadtbild-haeuser.js: Stadtansicht (isometrisch): Häuser und Gebäude zeichnen
// ===== THE CITY, ISOMETRIC =====
// Your capital like in the big mobile strategy games: a walled town seen from above at an angle, every building on
// its own lot and growing with its level, the keep in the middle; outside the land of the world map around your capital
// (woods where the map has forest, the coast where it has sea), people walking the streets. Drag to move, pinch or wheel to zoom, tap a building to open it.
// World: 640 × 640 units (a tile is 10), the same isometric projection as the buildings on the map.
const CW = 640, CC = 320;                                                   // world size and centre
const CITY_WALL = { a: 150, b: 490 };                                       // the curtain wall (square, world units)
// Die Stadt im Raster (Alexander 2.10.: „innen Base neu“): 12 Bauplätze rund um den Burgplatz (4 × 4, die Mitte ist die Burg),
// Straßen dazwischen wie ein „#“, vorn das Tor mit der Hauptstraße. Draußen nur Landschaft (Alexander 6.10.: wie bei RoK
// liegt die Stadt in der Weltkarte – keine Felder, Mühle oder Höfe): Wald, Küste und Meer wie auf der Karte, Berge, ein Fluss.
const CITY_LOTS = {                                                          // building lots (ground centre, world units)
    lumber: [206, 206], academy: [282, 206], heroes: [358, 206], quarry: [434, 206],
    forge: [206, 282],
    embassy: [206, 358],
    hospital: [282, 434], market: [358, 434], mine: [434, 434],
    wall: [320, 490]                                                         // Rohstoffe: in der Base (Alexander 4.10.)
};
const CITY_DRAUSSEN = new Set();
const CITY_KEEP_AT = [320, 320];
const cIso = (x, y) => [(x - y) * .866, (x + y) * .5];                    // world → screen units (before zoom)
let cityCam = null, cityPointers = new Map(), cityGesture = null, CITY_GROUND = null, CITY_WALLS = null, CITY_SPRITES = new Map();
let CITY_BG_COL = '#4f8237';
const CITY_BAKE = 2.5;                                                         // ground canvas pixels per screen unit
const CITY_BOUNDS = { x0: -CW * .866 - 40, x1: CW * .866 + 40, y0: -130, y1: CW + 80 };   // screen units covered by the ground

function cityTexture(seed, base, spots, n, size) {   // small tileable noise texture for grass / cobbles / fields
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = mulberry32(seed);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(r() * spots.length)]; const x = r() * size, y = r() * size, w = 1 + r() * 3;
        for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) g.fillRect(x + dx, y + dy, w, w * (.6 + r())); }
    return c;
}
// a world-space polygon on the ground, drawn in screen units
function cityGroundPoly(g, pts, fill, stroke, lw) {
    g.beginPath(); pts.forEach((q, i) => { const [sx, sy] = cIso(q[0], q[1]); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
}
const cityRect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function cityStrip(g, pts, w, fill) {                                        // a street along world points: flat quads on the ground (iso-correct)
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * w / 2, ny = (x1 - x0) / L * w / 2;
        const ex = (x1 - x0) / L * w * .25, ey = (y1 - y0) / L * w * .25;    // a little overlap: no seams at the bends
        cityGroundPoly(g, [[x0 + nx - ex, y0 + ny - ey], [x1 + nx + ex, y1 + ny + ey], [x1 - nx + ex, y1 - ny + ey], [x0 - nx - ex, y0 - ny - ey]], fill); }
}
// a small painter: iso kit on a scaled context, anchored at the ground point (ax, ay) of the canvas
const CITY_INK = 'rgba(52,38,24,.42)';                                      // softer outlines than on the map: the town is seen up close
function cityPainter(g, scale, ax, ay) { g.setTransform(scale, 0, 0, scale, ax, ay); g.lineJoin = 'round'; return isoKit(g, 0, CITY_INK); }
function cityZiegel(K, a0, a1, b0, b1, n, col) {                            // Ziegel-Reihen: n Linien zwischen Traufe (a0→a1) und First (b0→b1)
    const g = K.g; if (!g) return; g.save(); g.strokeStyle = col; g.lineWidth = .45;
    for (let i = 1; i < n; i++) { const t = i / n; g.beginPath(); g.moveTo(a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t); g.lineTo(a1[0] + (b1[0] - a1[0]) * t, a1[1] + (b1[1] - a1[1]) * t); g.stroke(); }
    g.restore();
}
function cityKante(K, p, q, col, w) { const g = K.g; if (!g) return; g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); g.restore(); }
function cityGable(K, x0, x1, y0, y1, z, h, col) {                           // pitched roof, ridge along x
    const yc = (y0 + y1) / 2, n = Math.max(3, Math.round(h / 1.8));
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, .95));
    K.poly([K.P(x1, y0, z), K.P(x1, y1, z), K.P(x1, yc, z + h)], shade(col, .7));
    K.poly([K.P(x0, y0, z), K.P(x1, y0, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, 1.15), .6);   // back slope peeks over the ridge line
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(x1, yc, z + h), K.P(x0, yc, z + h)], shade(col, .95));
    cityZiegel(K, K.P(x0, y1, z), K.P(x1, y1, z), K.P(x0, yc, z + h), K.P(x1, yc, z + h), n, shade(col, .74));
    cityKante(K, K.P(x0, yc, z + h), K.P(x1, yc, z + h), shade(col, 1.35), .9); cityKante(K, K.P(x0, y1, z), K.P(x1, y1, z), shade(col, .5), 1);
}
function cityGableY(K, x0, x1, y0, y1, z, h, col) {                          // pitched roof, ridge along y
    const xc = (x0 + x1) / 2, n = Math.max(3, Math.round(h / 1.8));
    K.poly([K.P(x0, y0, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), K.P(x0, y1, z)], shade(col, 1.12), .6);
    K.poly([K.P(x1, y0, z), K.P(x1, y1, z), K.P(xc, y1, z + h), K.P(xc, y0, z + h)], shade(col, .72));
    K.poly([K.P(x0, y1, z), K.P(x1, y1, z), K.P(xc, y1, z + h)], shade(col, .92));
    cityZiegel(K, K.P(x0, y0, z), K.P(x0, y1, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), n, shade(col, .85));
    cityZiegel(K, K.P(x1, y0, z), K.P(x1, y1, z), K.P(xc, y0, z + h), K.P(xc, y1, z + h), n, shade(col, .55));
    cityKante(K, K.P(xc, y0, z + h), K.P(xc, y1, z + h), shade(col, 1.35), .9);
}
function cityWindows(K, x0, x1, y, z, n, lit) {                              // a row of windows on the front (y) face
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n, [a, b] = K.P(x, y, z);
        K.poly([[a - 1, b], [a + 1, b - .6], [a + 1, b - 3.6], [a - 1, b - 3]], lit ? '#f2c46a' : '#2b2520', .4); }
}
function cityWindowsR(K, x, y0, y1, z, n) {                                   // on the right (x) face
    for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + .5) / n, [a, b] = K.P(x, y, z);
        K.poly([[a - 1, b - .6], [a + 1, b], [a + 1, b - 3], [a - 1, b - 3.6]], '#2b2520', .4); }
}
function cityDoor(K, x, y, h) { const [a, b] = K.P(x, y, 0); K.poly([[a - 2, b + 1], [a + 2, b + 1 - 1.2], [a + 2, b - h], [a, b - h - 1.4], [a - 2, b - h + 1.2]], '#3a2616', .6); }
function cityBanner(K, x, y, z, col) { const [a, b] = K.P(x, y, z); K.poly([[a - 1.6, b], [a + 1.6, b - .9], [a + 1.6, b + 7], [a, b + 9], [a - 1.6, b + 8]], col, .5); }
function cityPlinth(K, r, h, col) { K.box(-r, r, -r, r, 0, h, col || '#a89f8c', .8); }

// tiers: 0 = empty lot, 1 = lvl 1-4, 2 = 5-14, 3 = 15+
const cityTierOf = lvl => !lvl ? 0 : lvl >= 15 ? 3 : lvl >= 5 ? 2 : 1;
const CITY_PAINT = {
    plot(K) {                                                                // fenced building site
        K.poly([K.P(-20, -20, 0), K.P(20, -20, 0), K.P(20, 20, 0), K.P(-20, 20, 0)], '#9c8058', .6);
        for (let i = -20; i <= 20; i += 5) { K.box(i - .6, i + .6, 19.4, 20.6, 0, 3.5, '#6b4a2c', .4); K.box(19.4, 20.6, i - .6, i + .6, 0, 3.5, '#6b4a2c', .4); }
        K.box(-20, 20, 19.7, 20.3, 2.4, 3, '#7d5834', .3); K.box(19.7, 20.3, -20, 20, 2.4, 3, '#7d5834', .3);
        for (let i = 0; i < 3; i++) K.box(-12, 2, -8 + i * 3.2, -5.6 + i * 3.2, 0, 2.4, i % 2 ? '#a0783f' : '#8a6634', .4);   // timber
        for (const [x, y] of [[8, -8], [11, -3], [6, -2]]) K.box(x, x + 4, y, y + 4, 0, 3, '#9d9585', .4);                   // stones
        K.box(12, 13, 10, 11, 0, 12, '#6b4a2c', .4); K.box(8, 17, 10.4, 10.9, 9, 14, '#e6d8b4', .4);                         // sign
    },
    keep(K, t) {                                                             // deine Burg: Ringmauer mit Ecktürmen, Halle, Bergfried, Torhaus – wächst mit der Burg-Stufe (0–4)
        const st = STONE, roof = '#3a78c8', gold = '#e2b043', w = 28, z0 = 4, wh = z0 + 12 + t * 2, h = z0 + 28 + t * 5;
        K.box(-36, 36, -36, 36, 0, 2.2, '#9d9585', .7); K.box(-33, 33, -33, 33, 2.2, z0, '#b8b0a0', .6);          // Sockel in zwei Stufen
        const turm = (x, y, big) => { const r = big ? 7 : 6, th = wh + 8 + (big ? 3 : 0); K.cyl(x, y, r, z0, th, st, .8); K.cyl(x, y, r + .9, th, th + 2, shade(st, 1.06), .6);
            K.cone(x, y, r + 1.6, th + 2, 11 + t * 1.5, t >= 3 && big ? gold : roof); const [a, b] = K.P(x, y, th + 15 + t * 1.5); K.flag(a, b, BAND.player, true); };
        K.box(-w, w, -w, -w + 3, z0, wh, shade(st, .92), .7); K.box(-w, -w + 3, -w, w, z0, wh, shade(st, .92), .7);   // hinten: Mauern + Turm
        turm(-w, -w, false);
        K.box(-24, -13, -10, 16, z0, z0 + 14, '#ebe4d4', .8); cityGableY(K, -25, -12, -11, 17, z0 + 14, 9, roof); cityWindows(K, -22, -15, 16, z0 + 10, 2, true);   // die Halle links
        if (t >= 1) { K.box(6, 21, -24, -13, z0, z0 + 12, '#ebe4d4', .7); cityGable(K, 5, 22, -25, -12, z0 + 12, 7, roof); cityWindows(K, 8, 19, -13, z0 + 9, 3, true); }   // die Kapelle rechts
        const dw = 9 + Math.min(t, 2);                                                                                  // der Bergfried
        K.box(-dw, dw, -dw + 2, dw + 2, z0, h, st, .9); K.merlons(-dw, dw, -dw + 2, dw + 2, h, st, 4);
        cityWindows(K, -dw + 3, dw - 3, dw + 2, h - 7, 3, true); cityWindows(K, -dw + 3, dw - 3, dw + 2, h - 17, 3, false); cityWindowsR(K, dw, -dw + 5, dw - 1, h - 7, 3);
        cityBanner(K, -dw + 3.5, dw + 2.2, h - 21, '#2b5d9b'); cityBanner(K, dw - 3.5, dw + 2.2, h - 21, '#2b5d9b');
        if (t >= 2) { const h2 = h + 9 + t * 2; K.box(-6, 6, -4, 8, h, h2, st, .8); K.merlons(-6, 6, -4, 8, h2, st, 3); K.pyramid(0, 2, 7.6, h2 + 1.8, 13, t >= 4 ? gold : roof); }
        else K.pyramid(0, 2, dw + 1.4, h + 1.8, 13, roof);
        if (t >= 3) { K.cyl(dw, -dw + 2, 3.4, h - 6, h + 8, st, .6); K.cone(dw, -dw + 2, 4.4, h + 8, 8, gold); }
        turm(w, -w, false); turm(-w, w, false);
        K.box(w - 3, w, -w, w, z0, wh, st, .7); K.box(-w, w, w - 3, w, z0, wh, st, .7); K.merlons(-w, w, -w, w, wh, st, 8);   // vorn: Mauern, Torhaus, großer Eckturm
        K.box(-8, 8, w - 6, w + 3, z0, wh + 7, shade(st, 1.03), .8); K.merlons(-8, 8, w - 6, w + 3, wh + 7, st, 3);
        const [gx, gy] = K.P(0, w + 3, z0); K.poly([[gx - 5, gy + 2.9], [gx + 5, gy - 2.9], [gx + 5, gy - 12], [gx, gy - 16], [gx - 5, gy - 9]], '#241810', .7);
        for (const dx of [-2.5, 0, 2.5]) { const [p1, p2] = K.P(dx, w + 3.05, z0 + .5), [q1, q2] = K.P(dx, w + 3.05, z0 + 10.5 - Math.abs(dx)); cityKante(K, [p1, p2], [q1, q2], 'rgba(120,110,95,.75)', .6); }   // Fallgatter
        cityBanner(K, -5.5, w + 3.2, wh + 4, '#2b5d9b'); cityBanner(K, 5.5, w + 3.2, wh + 4, '#2b5d9b');
        turm(w, w, true);
    },
    academy(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-16, 14, -11, 11, 2, 15, '#efe7d4', .8); cityGable(K, -17, 15, -12, 12, 15, 9, '#2f4f86'); cityWindows(K, -14, 12, 11, 12, 5, false);
        for (const x of [-12, -6, 0, 6, 12]) K.cyl(x, 14, 1.3, 2, 14, '#f3ecdc', .5, true);
        K.box(-16, 14, 13, 15, 14, 15.5, '#f3ecdc', .5);
        if (t >= 2) { K.cyl(10, -4, 6.5, 15, 25, '#e6dcc6', .7); K.dome(10, -4, 7, 25, 9, '#6f9bd8'); }
        if (t >= 3) { K.box(-20, -12, -18, -8, 2, 22, '#e6dcc6', .7); K.pyramid(-16, -13, 5, 22, 8, '#2f4f86'); cityBanner(K, -14, 11.2, 14, '#2f4f86'); cityBanner(K, 12, 11.2, 14, '#2f4f86'); }
    },
    forge(K, t) {
        cityPlinth(K, 21, 2, '#8e8676');
        K.box(-15, 13, -10, 10, 2, 13, '#d9ccb2', .8); cityGable(K, -16, 14, -11, 11, 13, 8, '#3c3c44'); cityWindows(K, -12, 10, 10, 10, 3, true);
        K.box(-12, -6, -8, -2, 2, 30, '#6b6456', .7);                                                                   // chimney
        const [fx, fy] = K.P(4, 10, 2); K.poly([[fx - 3, fy + 1.7], [fx + 3, fy - 1.7], [fx + 3, fy - 7], [fx - 3, fy - 3.6]], '#ff8c2a', .6);   // furnace glow
        K.box(14, 18, 12, 15, 2, 5, '#3a3a40', .5); K.box(15, 17, 12.8, 14.2, 5, 6, '#2c2c30', .4);                      // anvil
        if (t >= 2) { K.box(2, 18, -18, -8, 2, 10, '#cfc2a8', .7); cityGable(K, 1, 19, -19, -7, 10, 6, '#4a4a52'); }
        if (t >= 3) { K.box(10, 15, -2, 3, 2, 26, '#6b6456', .7); cityBanner(K, -10, 10.2, 12, '#4a4a52'); }
    },
    hospital(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-15, 13, -10, 10, 2, 13, '#fbf7ee', .8); cityGable(K, -16, 14, -11, 11, 13, 8, '#b33a2e'); cityWindows(K, -12, 10, 10, 9, 4, false);
        const [cx, cy] = K.P(-1, 10, 11); g2Cross(K.poly, cx, cy);
        K.pyramid(14, 14, 5, 2, 8, '#e8e2d2');
        if (t >= 2) { K.pyramid(-15, 15, 5, 2, 8, '#e8e2d2'); K.box(-18, -8, -19, -12, 2, 9, '#f3eee2', .7); cityGable(K, -19, -7, -20, -11, 9, 5, '#b33a2e'); }
        if (t >= 3) { for (const [x, y] of [[4, 17], [9, 17]]) { const [a, b] = K.P(x, y, 2); K.poly([[a - 2, b], [a, b - 1], [a + 2, b], [a, b + 1]], '#6aa84f', .3); } cityBanner(K, 12, 10.2, 12, '#c0392b'); }
    },
    heroes(K, t) {
        cityPlinth(K, 21, 2);
        K.box(-17, 15, -12, 8, 2, 16, '#efe6d2', .8); cityGable(K, -18, 16, -13, 9, 16, 12, '#7a2e2a'); cityWindows(K, -14, 12, 8, 13, 5, true);
        if (t >= 2) { K.box(-6, 4, -6, 2, 16, 30, '#e6dcc6', .7); K.pyramid(-1, -2, 6, 30, 10, '#7a2e2a'); }
        const on = Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3);   // a lit statue for every third of the heroes
        [0, 1, 2].forEach(i => { const x = -10 + i * 10; K.box(x - 2, x + 2, 13, 17, 2, 5, '#8a7f68', .5); K.cyl(x, 15, 1.4, 5, 10, i < on ? '#d9b454' : '#9a927f', .4); });
        cityBanner(K, -15, 8.2, 14, '#7a2e2a'); cityBanner(K, 13, 8.2, 14, '#7a2e2a'); if (t >= 3) cityBanner(K, -1, 2.2, 26, '#e4c886');
    },
    gatehouse(K, t) {                                                       // the gate in the front wall = the Mauer building
        if (!t) { K.box(-14, -8, -4, 4, 0, 14, '#8a6440', .6); K.box(8, 14, -4, 4, 0, 14, '#8a6440', .6); K.box(-14, 14, -4, 4, 14, 17, '#6b4a2c', .6);
            const [a, b] = K.P(0, 4, 0); K.poly([[a - 7, b + 4], [a + 7, b - 4], [a + 7, b - 16], [a - 7, b - 8]], '#5a3d24', .6); return; }
        const s = STONE, h = [0, 20, 25, 28][t], roof = t >= 3 ? '#d9a93f' : t >= 2 ? '#2f5e9a' : '#8a3a2a';
        K.box(-12, 12, -6, 6, 0, h, s, .8); K.merlons(-12, 12, -6, 6, h, s, 4);
        const [a, b] = K.P(0, 6, 0); K.poly([[a - 6, b + 3.5], [a + 6, b - 3.5], [a + 6, b - 13], [a, b - 17], [a - 6, b - 9.5]], '#1b140e', .7);      // archway
        K.poly([[a - 5, b - 9], [a + 5, b - 14.5], [a + 5, b - 12], [a - 5, b - 6.5]], 'rgba(60,54,44,.8)', .4);                                   // portcullis bar
        for (const x of [-15, 15]) { K.cyl(x, 0, 7, 0, h + 6, s, .8); K.cone(x, 0, 8.5, h + 6, 10 + t * 2, roof); const [fa, fb] = K.P(x, 0, h + 16 + t * 2); K.flag(fa, fb, BAND.player, true); }
        if (t >= 2) { cityBanner(K, -6, 6.2, h - 3, '#2b5d9b'); cityBanner(K, 6, 6.2, h - 3, '#2b5d9b'); }
    },
    lumber(K, t) {                                                          // Holzfäller: Hütte, Stämme, Sägebock, Bäume drumherum
        K.box(-16, 0, -14, -2, 0, 9, '#9a7448', .7); cityGable(K, -17, 1, -15, -1, 9, 6, '#3f6b33'); cityDoor(K, -8, -2, 6); cityWindows(K, -14, -10, -2, 7, 1, false);
        for (let i = 0; i < 2 + t; i++) for (let j = 0; j < 3 - (i % 2); j++) K.box(2 + j * 4.2 + (i % 2) * 2.1, 5.6 + j * 4.2 + (i % 2) * 2.1, 2, 16, i * 3, i * 3 + 3, j % 2 ? '#a0783f' : '#8a6634', .4);   // Stammstapel
        K.box(-12, -2, 6, 8, 0, 4, '#6b4a2c', .4); K.box(-11, -10, 6, 8, 4, 6, '#6b4a2c', .3); K.box(-4, -3, 6, 8, 4, 6, '#6b4a2c', .3);   // Sägebock
        for (const [x, y, h] of [[17, -14, 18], [12, -18, 14], [-19, 12, 16], [19, 15, 13]].slice(0, 2 + t)) { K.cyl(x, y, 1.1, 0, h * .45, '#5a3d24', .4); K.cone(x, y, 5, h * .35, h * .8, '#2f6a2a'); }
    },
    quarry(K, t) {                                                          // Steinbruch: grauer Fels, Quader, ein Holzkran
        K.pyramid(-6, -6, 13, 0, 14 + t * 4, '#8f8a80'); K.pyramid(4, -12, 8, 0, 9 + t * 2, '#a39e93');
        for (const [x, y] of [[8, 6], [13, 9], [10, 13], [3, 12]].slice(0, 2 + t)) K.box(x - 2.4, x + 2.4, y - 2.4, y + 2.4, 0, 4.2, '#bdb6a8', .5);
        K.box(13, 14.2, -4, -2.8, 0, 22, '#6b4a2c', .4); K.box(5, 14.2, -3.9, -2.9, 20, 21.2, '#6b4a2c', .4);   // Kran
        const [a, b] = K.P(6, -3.4, 20); K.poly([[a - .3, b], [a + .3, b], [a + .3, b + 10], [a - .3, b + 10]], '#3a2616', .2);
        if (t >= 2) { K.box(-18, -10, 8, 16, 0, 6, '#9a7448', .5); cityGable(K, -19, -9, 7, 17, 6, 4, '#7a6a52'); }
    },
    mine(K, t) {                                                            // Eisenmine: dunkler Berg mit Stollen, Schienen und Lore
        K.pyramid(-4, -6, 16, 0, 20 + t * 4, '#6e6a63'); K.pyramid(8, -14, 9, 0, 12 + t * 2, '#7d786f');
        const [a, b] = K.P(-4, 8, 0); K.poly([[a - 5, b], [a + 5, b - 2.8], [a + 5, b - 11], [a, b - 14], [a - 5, b - 9]], '#1d1a17', .5);   // Stollen
        K.box(-10, 2, 8.5, 9.5, 0, 12, '#6b4a2c', .4);
        K.box(-6, -2, 9, 22, 0, .6, '#5a5550', .2); K.box(-5.6, -2.4, 15, 19, .6, 4.4, '#7a4a2a', .5); K.box(-5.4, -2.6, 15.2, 18.8, 4.4, 5.6, '#3b3b40', .3);   // Schienen, Lore mit Erz
        if (t >= 2) { K.box(10, 18, 6, 14, 0, 7, '#9a7448', .5); cityGable(K, 9, 19, 5, 15, 7, 4, '#4a4a52'); cityWindows(K, 11, 17, 14, 5, 2, true); }
    },
    embassy(K, t) {                                                         // Botschaft: helles Haus mit Säulen und vielen Fahnen (das Bündnis)
        cityPlinth(K, 21, 2, '#b8b0a0');
        K.box(-15, 13, -10, 10, 2, 14, '#f1ead8', .8); cityGable(K, -16, 14, -11, 11, 14, 8, '#2e6b5a'); cityWindows(K, -12, 10, 10, 11, 4, false);
        for (const x of [-10, -4, 2, 8]) K.cyl(x, 13, 1.2, 2, 13, '#f6f0e2', .5, true);
        K.box(-15, 13, 12, 14, 13, 14.5, '#f6f0e2', .5);
        const cols = ['#2e6b5a', '#c0392b', '#d9a93f', '#2f5e9a', '#7a2e8a'];
        for (let i = 0; i < Math.min(5, 2 + t); i++) { const [a, b] = K.P(-16 + i * 7, 17, 2); K.poly([[a - .4, b], [a + .4, b - .3], [a + .4, b - 16], [a - .4, b - 15.7]], '#6b4a2c', .3); K.poly([[a + .4, b - 16], [a + 6, b - 17], [a + 6, b - 12], [a + .4, b - 11]], cols[i], .3); }
        if (t >= 2) { K.cyl(10, -4, 5.5, 14, 22, '#e9e1cc', .7); K.dome(10, -4, 6, 22, 7, '#3f8a73'); }
    },
    market(K, t) {                                                          // Markt: Stände unter bunten Dächern, Säcke, Fässer, ein Kontor
        K.poly([K.P(-21, -21, 0), K.P(21, -21, 0), K.P(21, 21, 0), K.P(-21, 21, 0)], '#c2b08c', .5);
        K.box(-18, -2, -18, -4, 0, 11, '#e2d3b0', .7); cityGable(K, -19, -1, -19, -3, 11, 6, '#b5651d'); cityWindows(K, -15, -5, -4, 8, 2, false);
        const st = [[8, -10, '#c0392b'], [12, 6, '#2f6fa8'], [-6, 10, '#d9a93f'], [-14, 4, '#6aa84f']].slice(0, 2 + Math.min(2, t));
        for (const [x, y, col] of st) { for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) K.box(x + dx - .4, x + dx + .4, y + dy - .4, y + dy + .4, 0, 7, '#6b4a2c', .3);
            K.box(x - 4, x + 4, y - 3, y + 3, 0, 3, '#8a6440', .4); K.box(x - 2, x, y - 1, y + 1, 3, 4.5, '#e8c547', .3); cityGable(K, x - 5, x + 5, y - 4, y + 4, 7, 3, col); }
        for (const [x, y] of [[16, 16], [18, 12], [-16, 16]]) K.cyl(x, y, 1.8, 0, 4, '#8a6440', .4);
        if (t >= 3) { K.box(-2, 4, 14, 19, 0, 4, '#9c7e4c', .4); cityBanner(K, -10, -3.8, 9, '#b5651d'); }
    },
};
function g2Cross(poly, x, y) { poly([[x - 1.2, y - 4], [x + 1.2, y - 4], [x + 1.2, y - 1.2], [x + 4, y - 1.2], [x + 4, y + 1.2], [x + 1.2, y + 1.2], [x + 1.2, y + 4], [x - 1.2, y + 4], [x - 1.2, y + 1.2], [x - 4, y + 1.2], [x - 4, y - 1.2], [x - 1.2, y - 1.2]], '#c0392b', .4); }

// sprite cache: every building at its tier, painted once at a fixed resolution
const CITY_SPR_SCALE = 5;
function citySprite(kind, tier, extraKey) {
    const key = kind + ':' + tier + ':' + (extraKey || '');
    let s = CITY_SPRITES.get(key); if (s) return s;
    const art = kind === 'ghost' ? extraKey : kind, w = 64, up = art === 'keep' ? 90 : 52, down = art === 'keep' ? 42 : 26;   // screen-unit box around the ground anchor
    const c = document.createElement('canvas'); c.width = w * 2 * CITY_SPR_SCALE; c.height = (up + down) * CITY_SPR_SCALE;
    const g = c.getContext('2d'), K = cityPainter(g, CITY_SPR_SCALE, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE);
    if (kind === 'ghost') cityGhost(g, K, extraKey, c, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE); else (CITY_PAINT[kind] || CITY_PAINT.plot)(K, tier);
    s = { c, w, up, down }; CITY_SPRITES.set(key, s); return s;
}

// ein leerer Bauplatz: Grundmauern, ein paar Balken und Steine, darüber das Gebäude ganz blass – wie ein Plan, was hier entsteht
function cityGhost(g, K, id, c, ax, ay) {
    if (!CITY_DRAUSSEN.has(id)) for (const [x0, x1, y0, y1] of [[-19, 19, -19, -16.5], [-19, -16.5, -16.5, 19], [16.5, 19, -16.5, 19], [-16.5, 16.5, 16.5, 19]]) K.box(x0, x1, y0, y1, 0, 2.2, '#bdb29c', .4);
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const og = o.getContext('2d'); (CITY_PAINT[id] || CITY_PAINT.plot)(cityPainter(og, CITY_SPR_SCALE, ax, ay), 1);
    og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-atop'; og.fillStyle = 'rgba(236,228,210,.6)'; og.fillRect(0, 0, o.width, o.height);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = .5; g.drawImage(o, 0, 0); g.restore();
    g.setTransform(CITY_SPR_SCALE, 0, 0, CITY_SPR_SCALE, ax, ay);
    K.box(9, 18, 13, 15.5, 0, 1.6, '#a0783f', .35); K.box(10, 17, 13.2, 15.3, 1.6, 3.1, '#8a6634', .35);   // Balken
    K.box(-18, -13, 12, 17, 0, 3, '#a59d8c', .35); K.box(-17, -14, 12.6, 15.6, 3, 5, '#b8b0a0', .35);   // Steine
}
// ---- Landschaft je nach Gegend der Hauptstadt (Grün, Sand, Schnee, Sumpf, Vulkan) – die Stadt selbst ist immer gepflegt ----
const CITY_PAL = {
    green:   { land: '#5e9142', spots: ['#6a9d4b', '#54853a', '#74a853', '#4c7a34'], grass: '#6ba64b', gspots: ['#78b156', '#5f9842', '#83ba60', '#679f47'],
               leaf: ['#2c6328', '#3b7a33', '#5a9a42'], pine: ['#1f4a26', '#2b5e31', '#3d7742'], rock: '#8e8a82', peak: '#f2f5f7', bank: '#b9a77a', pines: .4, wald: 1,
               field: ['#e0bf52', '#c9a23c', '#a9bb4c', '#d6c96a'], water: ['#2a6694', '#3f8cc0', '#9fd2ee'], bg: '#5e9142' },
    sand:    { palm: true, mesa: true, land: '#d2b97e', spots: ['#dcc58f', '#c7ad70', '#bfa864', '#b3a85e'], grass: '#86a84f', gspots: ['#92b35a', '#7a9c46', '#9cbb62', '#80a24b'],
               leaf: ['#3f6a26', '#548a32', '#74a344'], pine: ['#3f5a26', '#52702f', '#6b8a3c'], rock: '#c2905e', peak: null, bank: '#e6d39c', pines: .55, wald: .6,
               field: ['#d9b04a', '#c99c3a', '#b9ad5a', '#e0c56a'], water: ['#24708f', '#3a95b4', '#a6dcea'], bg: '#cdb378' },
    snow:    { land: '#e4eaef', spots: ['#eef2f5', '#d6dee5', '#f7f9fb', '#cfd9e1'], grass: '#dfe7ec', gspots: ['#e9eef2', '#d3dce3', '#f3f6f8', '#cbd5dd'],
               leaf: ['#3a5a4a', '#4c6e5d', '#6a8a7a'], pine: ['#284638', '#365a4a', '#4c7262'], rock: '#7e8792', peak: '#ffffff', bank: '#cdd7df', pines: .9, wald: 1, schnee: true,
               field: ['#e9eef1', '#dbe3e8', '#f2f5f7', '#d3dce2'], water: ['#4f7fa3', '#6f9ebf', '#d2e8f4'], bg: '#e4eaef' },
    swamp:   { land: '#577146', spots: ['#62804f', '#4c6640', '#6b8a55', '#465d3a'], grass: '#6c9150', gspots: ['#78a05a', '#628848', '#82aa62', '#6a8f4d'],
               leaf: ['#2c4a28', '#3c6034', '#55803f'], pine: ['#223d26', '#2f5132', '#406a42'], rock: '#727065', peak: null, bank: '#7c7a52', pines: .25, wald: 1.1,
               field: ['#9cab52', '#8a9a46', '#b0b862', '#7f9244'], water: ['#3a5a4c', '#4f7462', '#9fc0ae'], bg: '#577146' },
    volcano: { land: '#625953', spots: ['#6d635c', '#574f4a', '#776b62', '#4e4743'], grass: '#6e8e4a', gspots: ['#799a54', '#638443', '#84a35e', '#6a8a48'],
               leaf: ['#33462a', '#445c34', '#5e7a46'], pine: ['#2a3a26', '#384e32', '#4c6644'], rock: '#4f4743', peak: '#e0662e', bank: '#7a6a5e', pines: .5, wald: .5,
               field: ['#a58f5c', '#93804e', '#b29d66', '#8a7848'], water: ['#2c5a78', '#3f7898', '#8fbcd4'], bg: '#625953' }
};
function cityBioVon(lm) { return lm.bio === 'ice' ? 'snow' : CITY_PAL[lm.bio] ? lm.bio : 'green'; }
function cityBio() { const lm = landmasses[(islandById[playerIslandId] || {}).landmassId]; return lm ? cityBioVon(lm) : 'green'; }
// Bäume, Büsche, Felsen: in Bildschirm-Einheiten um den Fußpunkt (a, b) gemalt – im Boden-Bild und als Deko-Bild gleich
function cityTreeAt(g, a, b, r, pal, v) {             // ein Laubbaum: Krone aus Kugeln, oben links im Licht
    g.fillStyle = 'rgba(20,30,10,.26)'; g.beginPath(); g.ellipse(a + r * .55, b + r * .08, r * 1.2, r * .46, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a3d24'; g.fillRect(a - r * .13, b - r * 1.05, r * .26, r * 1.05);
    const L = pal.leaf, f = v ? .9 : 1;
    for (const [dx, dy, rr, ci] of [[0, -1.5, 1, 0], [-.48, -1.72, .74, 1], [.45, -1.78, .7, 0], [.02, -2.22, .66, 1], [-.32, -2.2, .4, 2], [.1, -2.5, .3, 2], [-.6, -1.75, .3, 2]]) {
        g.fillStyle = L[ci]; g.beginPath(); g.arc(a + dx * r, b + dy * r * f, rr * r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(15,35,12,.3)'; g.lineWidth = Math.max(.35, r * .07); g.beginPath(); g.arc(a, b - 1.5 * r * f, r, Math.PI * .08, Math.PI * .92); g.stroke();
    if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.85)'; for (const [dx, dy, rr] of [[-.3, -2.55, .42], [.25, -2.45, .3]]) { g.beginPath(); g.ellipse(a + dx * r, b + dy * r, rr * r, rr * r * .45, 0, 0, Math.PI * 2); g.fill(); } }
}
function cityPineAt(g, a, b, h, pal) {                // eine Tanne: drei Kegel übereinander, links hell, rechts dunkel
    g.fillStyle = 'rgba(20,30,10,.24)'; g.beginPath(); g.ellipse(a + h * .2, b + h * .03, h * .3, h * .11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(a - h * .035, b - h * .2, h * .07, h * .2);
    const P = pal.pine;
    for (let i = 0; i < 3; i++) { const y0 = b - h * (.14 + i * .23), w = h * (.3 - i * .075), top = y0 - h * (.44 - i * .06);
        g.fillStyle = P[1]; g.beginPath(); g.moveTo(a - w, y0); g.lineTo(a, top); g.lineTo(a + w, y0); g.quadraticCurveTo(a, y0 + h * .06, a - w, y0); g.fill();
        g.fillStyle = P[0]; g.beginPath(); g.moveTo(a, top); g.lineTo(a + w, y0); g.quadraticCurveTo(a + w * .5, y0 + h * .04, a + w * .05, y0 + h * .05); g.closePath(); g.fill();
        g.fillStyle = P[2]; g.beginPath(); g.moveTo(a, top); g.lineTo(a - w * .6, y0 - h * .015); g.lineTo(a - w * .2, y0 - h * .03); g.closePath(); g.fill();
        if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(a, top); g.lineTo(a - w * .45, top + h * .2); g.lineTo(a + w * .3, top + h * .17); g.closePath(); g.fill(); } }
}
function cityPalmAt(g, a, b, h, pal) {                 // eine Palme: gebogener Stamm, sechs Wedel
    g.fillStyle = 'rgba(20,30,10,.22)'; g.beginPath(); g.ellipse(a + h * .3, b + h * .02, h * .3, h * .1, 0, 0, Math.PI * 2); g.fill();
    const tx = a + h * .16, ty = b - h; g.strokeStyle = '#8a6a44'; g.lineWidth = h * .07; g.lineCap = 'round'; g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo(a + h * .02, b - h * .6, tx, ty); g.stroke();
    g.strokeStyle = '#6b5032'; g.lineWidth = h * .015; for (let i = 1; i < 6; i++) { const t = i / 6, x = a + (tx - a) * t * t, y = b + (ty - b) * t; g.beginPath(); g.moveTo(x - h * .035, y); g.lineTo(x + h * .035, y - h * .01); g.stroke(); }
    for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + (i - 2.5) * .62, L = h * (.42 + (i % 2) * .08), ex = tx + Math.cos(an) * L, ey = ty + Math.sin(an) * L * .55 + L * .32;
        g.fillStyle = pal.leaf[i % 2 ? 1 : 2]; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(an) * L * .5 - Math.sin(an) * h * .08, ty + Math.sin(an) * L * .5 - h * .12, ex, ey);
        g.quadraticCurveTo(tx + Math.cos(an) * L * .5 + Math.sin(an) * h * .05, ty + Math.sin(an) * L * .5 - h * .02, tx, ty); g.fill(); }
    g.fillStyle = '#6b4a2c'; g.beginPath(); g.arc(tx, ty + h * .02, h * .045, 0, 7); g.fill();
}
function cityBushAt(g, a, b, r, pal) {
    g.fillStyle = 'rgba(20,30,10,.22)'; g.beginPath(); g.ellipse(a + r * .4, b + r * .05, r * 1.2, r * .45, 0, 0, Math.PI * 2); g.fill();
    for (const [dx, dy, rr, ci] of [[0, -.55, .8, 0], [-.55, -.45, .55, 1], [.5, -.5, .55, 0], [-.15, -.95, .5, 1], [-.35, -.95, .25, 2]]) { g.fillStyle = pal.leaf[ci]; g.beginPath(); g.arc(a + dx * r, b + dy * r, rr * r, 0, Math.PI * 2); g.fill(); }
    if (pal.schnee) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(a - r * .1, b - r * 1.2, r * .5, r * .2, 0, 0, Math.PI * 2); g.fill(); }
}
function cityRockAt(g, a, b, r, col) {                 // ein Felsbrocken: links hell, rechts dunkel
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(a + r * .3, b + r * .1, r * 1.1, r * .4, 0, 0, Math.PI * 2); g.fill();
    const pts = [[-1, 0], [-.85, -.6], [-.3, -1], [.35, -.85], [.95, -.35], [1, 0]];
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(a + x * r, b + y * r) : g.moveTo(a + x * r, b + y * r)); g.closePath(); g.fillStyle = shade(col, .8); g.fill();
    g.beginPath(); g.moveTo(a - r, b); g.lineTo(a - .85 * r, b - .6 * r); g.lineTo(a - .3 * r, b - r); g.lineTo(a + .05 * r, b - .5 * r); g.lineTo(a - .1 * r, b); g.closePath(); g.fillStyle = shade(col, 1.12); g.fill();
    g.strokeStyle = 'rgba(40,34,28,.4)'; g.lineWidth = Math.max(.3, r * .06); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(a + x * r, b + y * r) : g.moveTo(a + x * r, b + y * r)); g.stroke();
}
// ein Berg: Grundriss aus 7 Ecken, Spitze etwas versetzt, jede Seite nach dem Licht (oben links) schattiert, oben Schnee
function cityMountain(g, K, cx, cy, r, h, pal, R) {
    const n = 7, base = [], ax = cx + (R() - .5) * r * .35, ay = cy + (R() - .5) * r * .35;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R() * .45, rr = r * (.78 + R() * .35); base.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const top = pal.mesa ? base.map(p => [ax + (p[0] - ax) * .45, ay + (p[1] - ay) * .45]) : null;
    const A = K.P(ax, ay, h), faces = base.map((p, i) => [p, base[(i + 1) % n], i]).sort((f, q) => (f[0][0] + f[0][1] + f[1][0] + f[1][1]) - (q[0][0] + q[0][1] + q[1][0] + q[1][1]));
    for (const [p, q, i] of faces) {
        if (top) { const t1 = K.P(top[i][0], top[i][1], h), t2 = K.P(top[(i + 1) % n][0], top[(i + 1) % n][1], h), P1 = K.P(p[0], p[1], 0), P2 = K.P(q[0], q[1], 0);
            const mx = (p[0] + q[0]) / 2 - ax, my = (p[1] + q[1]) / 2 - ay, L = Math.hypot(mx, my) || 1, lit = -(mx + my) / L / Math.SQRT2;
            K.poly([P1, P2, t2, t1], shade(pal.rock, .74 + lit * .3), .35);
            for (const f of [.33, .66]) cityKante(K, [P1[0] + (t1[0] - P1[0]) * f, P1[1] + (t1[1] - P1[1]) * f], [P2[0] + (t2[0] - P2[0]) * f, P2[1] + (t2[1] - P2[1]) * f], 'rgba(90,50,20,.25)', .8);
            continue; }
        const mx = (p[0] + q[0]) / 2 - ax, my = (p[1] + q[1]) / 2 - ay, L = Math.hypot(mx, my) || 1, lit = -(mx + my) / L / Math.SQRT2;   // +1 = zur Sonne
        const P1 = K.P(p[0], p[1], 0), P2 = K.P(q[0], q[1], 0), col = shade(pal.rock, .74 + lit * .3);
        K.poly([P1, P2, A], col, .35);
        const M = [(P1[0] + P2[0]) / 2 + (R() - .5) * r * .3, (P1[1] + P2[1]) / 2];                                   // ein Grat in der Mitte der Seite
        g.strokeStyle = 'rgba(255,255,255,' + (lit > 0 ? .1 : .04) + ')'; g.lineWidth = .7; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(M[0], M[1]); g.stroke();
        const low = (u, t) => [u[0] + (A[0] - u[0]) * t, u[1] + (A[1] - u[1]) * t];
        if (!pal.schnee) K.poly([P1, P2, low(P2, .3), low(P1, .3)], shade(pal.land, .78 + lit * .22), .2);   // grüner Fuß
        if (pal.peak) K.poly([low(P1, .68), low(P2, .68), A], shade(pal.peak, .86 + lit * .14), .25);   // Schnee (Vulkan: Glut)
    }
    if (top) K.poly(top.map(p => K.P(p[0], p[1], h)), shade(pal.rock, 1.1), .35);
}
function cityPaintGround() {
    const B = CITY_BAKE, c = document.createElement('canvas'), bio = cityBio(), pal = CITY_PAL[bio], R = mulberry32(4242);
    c.width = Math.ceil((CITY_BOUNDS.x1 - CITY_BOUNDS.x0) * B); c.height = Math.ceil((CITY_BOUNDS.y1 - CITY_BOUNDS.y0) * B);
    const g = c.getContext('2d'); g.setTransform(B, 0, 0, B, -CITY_BOUNDS.x0 * B, -CITY_BOUNDS.y0 * B); g.lineJoin = 'round';
    const pat = (seed, base, spots, n) => g.createPattern(cityTexture(seed, base, spots, n, 128), 'repeat');
    CITY_BG_COL = pal.bg;
    const land = pat(25, pal.land, pal.spots, 900), grass = pat(21, pal.grass, pal.gspots, 800);
    const cob = pat(23, pal.schnee ? '#c4c0b8' : '#b8a88a', ['#c7b798', '#a39374', '#d1c3a4', '#948466'], 900);
    const pave = pat(27, '#cfc4ab', ['#dad0b9', '#c1b59b', '#c8bca2', '#e0d7c2'], 600), dirt = pat(24, pal.schnee ? '#b8ad9a' : '#a68a5f', ['#b0946a', '#957a52', '#b89c72'], 600);
    const K = isoKit(g, 0, 'rgba(40,32,24,.35)');
    // 1) das Land überall, dazu große weiche Flecken (sonst sieht es aus wie ein Teppich)
    g.fillStyle = land; g.fillRect(CITY_BOUNDS.x0, CITY_BOUNDS.y0, CITY_BOUNDS.x1 - CITY_BOUNDS.x0, CITY_BOUNDS.y1 - CITY_BOUNDS.y0);
    for (let i = 0; i < 60; i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), r = 25 + R() * 70, hell = R() < .5;
        const gr = g.createRadialGradient(a, b, 0, a, b, r * 1.6); gr.addColorStop(0, hell ? 'rgba(255,248,200,.12)' : 'rgba(10,30,0,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(a, b, r * 1.6, r, 0, 0, Math.PI * 2); g.fill(); }
    // Dünen (Sand) bzw. sanfte Wellen im Gras, Büschel und Blüten
    for (let i = 0; i < (bio === 'sand' ? 90 : 40); i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), w = 30 + R() * 60;
        g.strokeStyle = R() < .5 ? 'rgba(255,245,210,' + (bio === 'sand' ? .28 : .1) + ')' : 'rgba(60,40,10,' + (bio === 'sand' ? .16 : .07) + ')'; g.lineWidth = 2 + R() * 3;
        g.beginPath(); g.moveTo(a - w, b); g.quadraticCurveTo(a, b - w * (.15 + R() * .2), a + w, b + (R() - .5) * 8); g.stroke(); }
    for (let i = 0; i < 1400; i++) { const [a, b] = cIso(-160 + R() * 960, -160 + R() * 960), r2 = R();
        g.fillStyle = r2 < .45 ? shade(pal.spots[0], 1.12) : r2 < .9 ? shade(pal.spots[1], .82) : ['#f2e6a0', '#e8a0c0', '#ffffff', '#d0a0ff'][Math.floor(R() * 4)]; g.fillRect(a, b, r2 < .9 ? 1.6 + R() * 2 : 1, r2 < .9 ? .7 : 1); }
    // 2) der Fluss rechts an der Stadt vorbei (Ufer, tiefes Wasser, helle Mitte, Glitzern)
    const fluss = [[604, -190], [574, 30], [566, 170], [590, 320], [642, 452], [706, 566], [800, 700]].map(p => cIso(p[0], p[1]));
    const zug = (w, col) => { g.beginPath(); fluss.forEach((p, i) => { if (!i) g.moveTo(p[0], p[1]); else if (i < fluss.length - 1) g.quadraticCurveTo(p[0], p[1], (p[0] + fluss[i + 1][0]) / 2, (p[1] + fluss[i + 1][1]) / 2); else g.lineTo(p[0], p[1]); });
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); };
    zug(54, shade(pal.land, .82)); zug(46, pal.bank); zug(38, pal.water[0]); zug(28, pal.water[1]); zug(10, 'rgba(255,255,255,.12)');
    for (let i = 0; i < 70; i++) { const k = Math.floor(R() * (fluss.length - 1)), t = R(), a = fluss[k][0] + (fluss[k + 1][0] - fluss[k][0]) * t + (R() - .5) * 22, b = fluss[k][1] + (fluss[k + 1][1] - fluss[k][1]) * t + (R() - .5) * 10;
        g.fillStyle = 'rgba(255,255,255,' + (.25 + R() * .35) + ')'; g.fillRect(a, b, 2 + R() * 5, .7); }
    // 3) die Weltkarte rund um die Hauptstadt: andere Regionen in ihrer Farbe, Meer mit Strand, wo die Karte Wasser hat
    const aus = cityAussen();
    for (const lm of aus.fremd) { g.save(); g.clip(aus.pfad(lm)); const fp = CITY_PAL[cityBioVon(lm)];
        g.fillStyle = pat(25, fp.land, fp.spots, 900); g.fillRect(CITY_BOUNDS.x0, CITY_BOUNDS.y0, CITY_BOUNDS.x1 - CITY_BOUNDS.x0, CITY_BOUNDS.y1 - CITY_BOUNDS.y0); g.restore(); }
    if (aus.nass) {
        const meer = new Path2D(); meer.rect(CITY_BOUNDS.x0, CITY_BOUNDS.y0, CITY_BOUNDS.x1 - CITY_BOUNDS.x0, CITY_BOUNDS.y1 - CITY_BOUNDS.y0);
        for (const lm of aus.lms) meer.addPath(aus.pfad(lm));
        g.save(); g.clip(meer, 'evenodd');
        g.fillStyle = pat(26, pal.water[0], [shade(pal.water[0], .9), shade(pal.water[0], 1.1), pal.water[1]], 700); g.fillRect(CITY_BOUNDS.x0, CITY_BOUNDS.y0, CITY_BOUNDS.x1 - CITY_BOUNDS.x0, CITY_BOUNDS.y1 - CITY_BOUNDS.y0);
        g.lineJoin = 'round';
        for (const [w, col] of [[26, pal.water[1]], [12, shade(pal.water[1], 1.2)], [6, pal.bank]]) for (const lm of aus.lms) { g.strokeStyle = col; g.lineWidth = w; g.stroke(aus.pfad(lm)); }
        for (let i = 0; i < 160; i++) { const x = -170 + R() * 980, y = -170 + R() * 980; if (aus.land(x, y)) continue; const [a, b] = cIso(x, y);   // Wellen
            g.fillStyle = 'rgba(255,255,255,' + (.18 + R() * .25) + ')'; g.fillRect(a, b, 3 + R() * 6, .8); }
        g.restore();
        cityGroundPoly(g, cityRect(105, 105, 545, 545), land);                // die Stadt steht immer auf festem Land
    }
    // 4) vor dem Tor ein kurzes Pflaster
    cityStrip(g, [[320, 492], [320, 516]], 17, 'rgba(92,78,56,.85)'); cityStrip(g, [[320, 492], [320, 514]], 13.5, cob);
    // 5) Berge hinten, Bäume (dicht, wo die Karte Wald hat), Felsen – nur auf Land, in Tiefen-Reihenfolge gemalt
    const dinge = [];
    for (const [x, y, r, h] of [[110, 6, 62, 92], [232, -34, 58, 80], [36, 92, 54, 72], [-36, 178, 50, 62], [334, -62, 52, 70], [-96, 292, 46, 54], [432, -104, 50, 62], [-130, 410, 40, 44]])
        for (const [dx, dy, k] of [[0, 0, 1], [-r * .55, r * .25, .62], [r * .4, -r * .45, .7]]) { const mh = h * k * (.85 + R() * .3); if (aus.land(x + dx, y + dy)) dinge.push({ d: x + dx + y + dy, f: () => cityMountain(g, K, x + dx, y + dy, r * k, mh, pal, R) }); }
    for (const [x, y, r, h] of [[166, 24, 30, 34], [60, 160, 26, 26], [-60, 262, 24, 24], [300, 10, 26, 28]]) if (aus.land(x, y)) dinge.push({ d: x + y, f: () => cityMountain(g, K, x, y, r, h, pal, R) });   // Hügel davor
    const frei = (x, y) => !(x > 105 && x < 545 && y > 105 && y < 545) && !(x > 270 && x < 370 && y > 540 && y < 620) && !(x > 548 && x < 668 && y < 470) && !(x > 610 && x < 740 && y > 420 && y < 640) && aus.land(x, y);
    for (let i = 0, n = Math.round(900 * pal.wald); i < n; i++) {
        const x = -170 + R() * 980, y = -170 + R() * 980, zufall = R(), dicht = aus.wald(x, y) || x < 60 || y < 60;
        if (!frei(x, y) || zufall > (dicht ? .85 : .1)) continue;
        const [a, b] = cIso(x, y), pine = R() < pal.pines, r = 4.2 + R() * 2.4, hell = R() < .5;
        dinge.push({ d: x + y, f: pine ? (pal.palm ? () => cityPalmAt(g, a, b, r * 4.4, pal) : () => cityPineAt(g, a, b, r * 4.2, pal)) : () => cityTreeAt(g, a, b, r, pal, hell) });
    }
    for (let i = 0; i < 50; i++) { const x = -60 + R() * 420, y = -100 + R() * 300, rr = 2 + R() * 3.5; if (x + y > 300 || !frei(x, y)) continue; const [a, b] = cIso(x, y); dinge.push({ d: x + y, f: () => cityRockAt(g, a, b, rr, pal.rock) }); }
    dinge.sort((p, q) => p.d - q.d).forEach(t => t.f());
    // 6) in der Mauer: gepflegter Rasen, Straßen wie ein „#“ mit Randsteinen, der Burgplatz, gepflasterte Bauplätze
    cityGroundPoly(g, cityRect(CITY_WALL.a, CITY_WALL.a, CITY_WALL.b, CITY_WALL.b), grass);
    for (let i = 0; i < 260; i++) { const [a, b] = cIso(158 + R() * 324, 158 + R() * 324); g.fillStyle = R() < .5 ? 'rgba(255,255,220,.16)' : 'rgba(20,50,10,.14)'; g.fillRect(a, b, 1.6 + R() * 2.4, .7); }   // Grasbüschel
    const strassen = [[[244, 178], [244, 462]], [[396, 178], [396, 462]], [[178, 244], [462, 244]], [[178, 396], [462, 396]], [[320, 172], [320, 262]], [[172, 320], [262, 320]], [[378, 320], [468, 320]], [[320, 378], [320, 494]]];
    for (const p of strassen) cityStrip(g, p, 17, 'rgba(92,78,56,.85)');
    const kreis = (r, n) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([CC + Math.cos(a) * r, CC + Math.sin(a) * r]); } return pts; };
    cityGroundPoly(g, kreis(66, 44), 'rgba(92,78,56,.85)');
    for (const p of strassen) cityStrip(g, p, 13.5, cob);
    cityGroundPoly(g, kreis(64, 44), cob); cityGroundPoly(g, kreis(59, 44), pave); cityGroundPoly(g, kreis(53, 44), cob);   // der runde Burgplatz mit einem Ring heller Platten
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, [p1, p2] = cIso(CC + Math.cos(a) * 59, CC + Math.sin(a) * 59), [q1, q2] = cIso(CC + Math.cos(a) * 53, CC + Math.sin(a) * 53);
        g.strokeStyle = 'rgba(92,78,56,.45)'; g.lineWidth = .5; g.beginPath(); g.moveTo(p1, p2); g.lineTo(q1, q2); g.stroke(); }
    const rasen = pat(28, shade(pal.grass, 1.06), pal.gspots.map(x => shade(x, 1.05)), 700);
    for (const k of Object.keys(CITY_LOTS)) { if (k === 'wall' || CITY_DRAUSSEN.has(k)) continue; const [x, y] = CITY_LOTS[k];   // jeder Bauplatz: gepflegter Rasen mit Randsteinen
        cityGroundPoly(g, cityRect(x - 25.5, y - 25.5, x + 25.5, y + 25.5), 'rgba(120,108,86,.9)'); cityGroundPoly(g, cityRect(x - 24, y - 24, x + 24, y + 24), rasen);
        for (let i = 0; i < 30; i++) { const [a2, b2] = cIso(x - 22 + R() * 44, y - 22 + R() * 44); g.fillStyle = R() < .5 ? 'rgba(255,255,220,.18)' : 'rgba(20,50,10,.12)'; g.fillRect(a2, b2, 1.4 + R() * 2, .6); } }
    // Blumenbeete im Rasenstreifen an der Mauer
    const farben = pal.schnee ? ['#c0392b', '#ffffff'] : ['#e74c3c', '#f1c40f', '#ecf0f1', '#9b59b6', '#e67e22'];
    for (const [x, y, w, d] of [[186, 158, 40, 8], [262, 158, 40, 8], [338, 158, 40, 8], [414, 158, 40, 8], [158, 186, 8, 40], [158, 262, 8, 40], [158, 338, 8, 40], [158, 414, 8, 40]]) {
        cityGroundPoly(g, cityRect(x, y, x + w, y + d), '#6b4a2c'); for (let i = 0; i < w * d / 9; i++) { const [a, b] = cIso(x + 1 + R() * (w - 2), y + 1 + R() * (d - 2)); g.fillStyle = farben[Math.floor(R() * farben.length)]; g.beginPath(); g.arc(a, b, .9, 0, 7); g.fill(); } }
    CITY_GROUND_BIO = cityGrundKey();
    return CITY_GROUND = c;
}
let CITY_GROUND_BIO = '';
const cityGrundKey = () => cityBio() + ':' + playerIslandId;                 // neu malen, wenn die Hauptstadt umzieht
// Die Weltkarte um die Hauptstadt, ins Stadtbild gelegt: die Basis (Halbmesser ISLAND_RADIUS·1,3) füllt die Mauer (170 Einheiten
// von der Mitte). Ein Stadt-Punkt (x, y) liegt auf der Karte bei Basis + ((x−y)·S, (x+y)·S) – „oben“ ist auf beiden oben.
// So ist das Bild einer Karten-Form im Stadtbild einfach gestaucht: sx = (wx − hx)·0,866/S, sy = 320 + (wy − hy)·0,5/S.
function cityAussen() {
    const h = islandById[playerIslandId], S = ISLAND_RADIUS * 1.3 / 170;
    if (!h) return { lms: [], fremd: [], nass: false, land: () => true, wald: () => false, pfad: null };
    const welt = (x, y) => [h.x + (x - y) * S, h.y + (x + y - 2 * CC) * S], weit = 1000 * S;
    const lms = landmasses.filter(lm => Math.abs(lm.x - h.x) < lm.shapeMaxR + weit && Math.abs(lm.y - h.y) < lm.shapeMaxR + weit);
    const stadt = (x, y) => x > 105 && x < 545 && y > 105 && y < 545;
    const lmAt = (x, y) => { const [wx, wy] = welt(x, y); return lms.find(lm => aufLand(lm, wx, wy)) || null; };
    const M = new DOMMatrix([.866 / S, 0, 0, .5 / S, -h.x * .866 / S, cIso(CC, CC)[1] - h.y * .5 / S]), pfade = new Map();
    const pfad = lm => { let p = pfade.get(lm); if (!p) { p = new Path2D(); p.addPath(lm.path, M); pfade.set(lm, p); } return p; };
    const probe = document.createElement('canvas').getContext('2d'), heim = landmasses[h.landmassId];
    let nass = false; for (let x = -170; x <= 810 && !nass; x += 70) for (let y = -170; y <= 810; y += 70) if (!stadt(x, y) && !lmAt(x, y)) { nass = true; break; }
    return { lms, nass, pfad, fremd: lms.filter(lm => lm !== heim && cityBioVon(lm) !== cityBio()),
        land: (x, y) => stadt(x, y) || !!lmAt(x, y),
        wald: (x, y) => { const lm = lmAt(x, y); if (!lm || lm.stone) return false; const [wx, wy] = welt(x, y); return probe.isPointInPath(lm.forest[0], wx, wy); } };
}
// ---- Deko (eigene kleine Bilder, in Tiefen-Reihenfolge mit den Häusern): Brunnen, Bäume an der Mauer, Laternen, Statuen ----
let CITY_DECO = null;
function cityDeco() {
    const bio = cityBio(); if (CITY_DECO && CITY_DECO.bio === bio) return CITY_DECO.list;
    const pal = CITY_PAL[bio], R = mulberry32(99), out = [];
    out.push({ at: [CC, 372], kind: 'fountain' }, { at: [266, 266], kind: 'tree', col: 'a' }, { at: [374, 266], kind: 'tree', col: 'b' }, { at: [266, 374], kind: 'statue' }, { at: [374, 374], kind: 'statue' });
    for (const y of [418, 450, 482]) out.push({ at: [310, y], kind: 'lamp' }, { at: [330, y], kind: 'lamp' });
    const strip = (fest, quer) => { for (let v = 182; v <= 460; v += 20) { if (Math.abs(v - 244) < 13 || Math.abs(v - 396) < 13 || Math.abs(v - 320) < (fest > 400 && !quer ? 24 : 13)) continue;
        const kind = R() < pal.pines ? 'pine' : R() < .3 ? 'bush' : 'tree', o = (R() - .5) * 4; out.push({ at: quer ? [fest + o, v] : [v, fest + o], kind, col: R() < .5 ? 'a' : 'b' }); } };
    strip(165, true); strip(165, false); strip(475, true); strip(475, false);
    CITY_DECO = { bio, list: out }; return out;
}
function cityStaticSprite(kind, col) {
    const bio = cityBio(), key = 's:' + kind + (col || '') + ':' + bio; let s = CITY_SPRITES.get(key); if (s) return s;
    const pal = CITY_PAL[bio], w = 30, up = 50, down = 12, c = document.createElement('canvas'); c.width = w * 2 * CITY_SPR_SCALE; c.height = (up + down) * CITY_SPR_SCALE;
    const g = c.getContext('2d'), K = cityPainter(g, CITY_SPR_SCALE, w * CITY_SPR_SCALE, up * CITY_SPR_SCALE);
    if (kind === 'fountain') { K.cyl(0, 0, 10, 0, 3, '#c9c1ae', .6); K.cyl(0, 0, 8.6, 3, 3.3, pal.schnee ? '#cfe6f2' : '#4d9ad0', .3); K.cyl(0, 0, 1.8, 3, 10, '#d8d1c1', .5); K.cyl(0, 0, 4, 10, 11.2, '#c9c1ae', .5); K.cyl(0, 0, 1, 11.2, 14, '#d8d1c1', .4); }
    else if (kind === 'tree') cityTreeAt(g, 0, 0, 5.4, pal, col === 'b');
    else if (kind === 'pine') (pal.palm ? cityPalmAt : cityPineAt)(g, 0, 0, 22, pal);
    else if (kind === 'bush') cityBushAt(g, 0, 0, 4.2, pal);
    else if (kind === 'lamp') { K.box(-.5, .5, -.5, .5, 0, 12, '#3a3530', .3); K.box(-1.4, 1.4, -1.4, 1.4, 12, 14.6, '#f2d27a', .4); K.pyramid(0, 0, 1.8, 14.6, 2.2, '#3a3530'); }
    else if (kind === 'statue') { K.box(-4, 4, -4, 4, 0, 5, '#bdb3a0', .6); K.box(-3, 3, -3, 3, 5, 6, '#a89f8c', .5); K.cyl(0, 0, 1.6, 6, 13, '#9a8a5a', .5); K.dome(0, 0, 1.3, 13, 2.4, '#b39a5a');
        const [a, b] = K.P(0, 0, 11); K.poly([[a + 1, b], [a + 5, b - 6], [a + 5.6, b - 5.5], [a + 1.8, b + .5]], '#8a7a4a', .3); }
    s = { c, w, up, down }; CITY_SPRITES.set(key, s); return s;
}

// ---- the curtain wall: its look follows the Mauer level (palisade → stone → high stone with blue, gold at 20+) ----
function cityPaintWalls(lvl) {
    const t = !lvl ? 0 : lvl >= 20 ? 3 : lvl >= 10 ? 2 : 1, key = 'walls' + t;
    if (CITY_WALLS && CITY_WALLS.key === key) return CITY_WALLS;
    const S = CITY_SPR_SCALE * .6, WB = { x0: -322, x1: 322, y0: 56, y1: 522 }, mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil((WB.x1 - WB.x0) * S); c.height = Math.ceil((WB.y1 - WB.y0) * S);
        const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, -WB.x0 * S, -WB.y0 * S); g.lineJoin = 'round'; return { c, g }; };
    const back = mk(), front = mk(), A = CITY_WALL.a, Bw = CITY_WALL.b;
    const hgt = [9, 13, 17, 19][t], th = hgt + 7, col = t ? STONE : '#8a6440', roof = t >= 3 ? '#d9a93f' : t >= 2 ? '#2f5e9a' : '#8a3a2a';
    const seg = (K, x0, y0, x1, y1) => {                                    // a straight run of wall (along x or y)
        if (!t) { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 3.3); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, hh = hgt + 1 + (i % 3 === 1 ? 1.4 : 0);   // Palisade: dicke Stämme mit Spitzen
            K.cyl(x, y, 1.85, 0, hh, i % 2 ? '#a07650' : '#8f6a44', .3, true); K.cone(x, y, 1.9, hh, 3, '#6b4a2c'); } return; }
        const along = x0 === x1 ? 'y' : 'x', a0 = Math.min(along === 'x' ? x0 : y0, along === 'x' ? x1 : y1), a1 = Math.max(along === 'x' ? x0 : y0, along === 'x' ? x1 : y1);
        if (along === 'x') { K.box(a0, a1, y0 - 3, y0 + 3, 0, hgt, col, .7); K.merlons(a0, a1, y0 - 3, y0 + 3, hgt, col, Math.round((a1 - a0) / 7)); }
        else { K.box(x0 - 3, x0 + 3, a0, a1, 0, hgt, col, .7); K.merlons(x0 - 3, x0 + 3, a0, a1, hgt, col, Math.round((a1 - a0) / 7)); }
    };
    const tower = (K, x, y, big) => { if (!t) { K.box(x - 4.5, x + 4.5, y - 4.5, y + 4.5, 0, hgt + 7, '#9a7046', .5); K.box(x - 6.5, x + 6.5, y - 6.5, y + 6.5, hgt + 7, hgt + 10, '#7a5232', .5);   // Holzturm mit Plattform
            K.pyramid(x, y, 7.2, hgt + 10, 8, '#8a3a2a'); const [a, b] = K.P(x, y, hgt + 19); K.flag(a, b, BAND.player, true); return; }
        const r = big ? 8 : 6.5; K.cyl(x, y, r, 0, th + (big ? 4 : 0), col, .8); K.cone(x, y, r + 1.5, th + (big ? 4 : 0), 9 + t * 2, roof);
        if (t >= 2) { const [a, b] = K.P(x, y, th + 12 + t * 2); K.flag(a, b, BAND.player, true); } };
    { const K = isoKit(back.g, 0, CITY_INK);                                          // back: the top corner, the two far runs and the side corners
        seg(K, A, A, Bw, A); seg(K, A, A, A, Bw); tower(K, A, A, true); tower(K, CC, A); tower(K, A, CC); tower(K, Bw, A, true); tower(K, A, Bw, true); }
    { const K = isoKit(front.g, 0, CITY_INK);                                         // front: the two near runs (with the gap for the gatehouse) and the bottom corner
        seg(K, Bw, A, Bw, Bw); seg(K, A, Bw, CC - 16, Bw); seg(K, CC + 16, Bw, Bw, Bw); tower(K, Bw, CC); tower(K, Bw, Bw, true); }
    return CITY_WALLS = { key, back: back.c, front: front.c, S, B: WB };
}

