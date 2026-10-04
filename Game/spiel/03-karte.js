// ===== Teil 03-karte.js: Karte zeichnen, 3D-Gebäude, Baukunst-Bilder, Wappen, Thronplatz, Tag und Nacht, Kamera und Eingabe =====
// ===== MAP RENDERER (verified in the running game; see spec §5) =====
var viewW = innerWidth, viewH = innerHeight;           // CSS px; written ONLY by sizeBackingStore() (§6) so a resize still knows the old centre.
                                                      // `var` on purpose: sizeBackingStore() already runs at boot, before this block.
const setScreen = g => g.setTransform(dpr, 0, 0, dpr, 0, 0);
const toSX = x => x * mapState.zoom + mapState.offsetX, toSY = y => y * mapState.zoom + mapState.offsetY;

function noiseTile(size, seed, blobs, cols) {       // seamless soft-blob texture
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); const r = mulberry32(seed);
  for (let i = 0; i < blobs; i++) { const px = r() * size, py = r() * size, rad = size * (.03 + r() * .12), col = cols[(r() * cols.length) | 0];
    for (const [ox, oy] of [[0,0],[size,0],[-size,0],[0,size],[0,-size]]) {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2); } }
  return c;
}
const SEA_PATTERN   = ctx.createPattern(noiseTile(512, 5, 220, ['rgba(0,10,20,.55)', 'rgba(90,150,190,.25)', 'rgba(0,20,40,.45)']), 'repeat');
const GRASS_PATTERN = ctx.createPattern(noiseTile(512, 21, 260, ['rgba(28,58,20,.55)', 'rgba(120,176,80,.45)', 'rgba(40,80,28,.5)', 'rgba(150,190,90,.3)']), 'repeat');

// World bounds (camera clamp + sea gradient)
const WORLD = (() => { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const lm of landmasses) { l = Math.min(l, lm.x - lm.shapeMaxR); r = Math.max(r, lm.x + lm.shapeMaxR); t = Math.min(t, lm.y - lm.shapeMaxR); b = Math.max(b, lm.y + lm.shapeMaxR); }
  l = Math.min(l, -FRAME_HALF); t = Math.min(t, -FRAME_HALF); r = Math.max(r, FRAME_HALF); b = Math.max(b, FRAME_HALF);   // the map border fits too
  return { l, t, r, b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2, radius: Math.hypot(r - l, b - t) / 2 }; })();

const DEKO_ART = { ice: 1, volcano: 1, swamp: 1 };   // Landschaften mit eigenem Hintergrund (Paket C, buildDeko)
// Landmass paths: smoothed coast (quadratic curves through edge midpoints), world units
for (const lm of landmasses) {
  const P = lm.shape, n = P.length, p = new Path2D();
  const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
  let m = mid(P[n - 1], P[0]); p.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const c = P[i]; m = mid(P[i], P[(i + 1) % n]); p.quadraticCurveTo(c.x, c.y, m[0], m[1]); }
  p.closePath();
  lm.path = p;
  lm.bbox = { l: lm.x - lm.shapeMaxR, t: lm.y - lm.shapeMaxR, r: lm.x + lm.shapeMaxR, b: lm.y + lm.shapeMaxR };
  const g = ctx.createLinearGradient(lm.bbox.l, lm.bbox.t, lm.bbox.r, lm.bbox.b);   // world coords; used under setWorld
  lm.stone = lm.tier === 'throne' || lm.tier === 'guardian';                    // the middle and the 4 Wächter regions: grey stone land
  if (lm.tier === 'throne') { g.addColorStop(0, '#a3a39d'); g.addColorStop(.55, '#8c8c86'); g.addColorStop(1, '#76766f'); }
  else if (lm.stone) { g.addColorStop(0, '#8e908c'); g.addColorStop(.55, '#797b77'); g.addColorStop(1, '#646662'); }
  else if (lm.bio === 'snow') { g.addColorStop(0, '#eef2f5'); g.addColorStop(.55, '#dde4ea'); g.addColorStop(1, '#c6d0d9'); }
  else if (lm.bio === 'sand') { g.addColorStop(0, '#e2c98f'); g.addColorStop(.55, '#d4b77a'); g.addColorStop(1, '#c2a266'); }
  else if (lm.bio === 'ice') { g.addColorStop(0, '#e9f4fb'); g.addColorStop(.55, '#d2e5f1'); g.addColorStop(1, '#b4d0e4'); }
  else if (lm.bio === 'volcano') { g.addColorStop(0, '#77695f'); g.addColorStop(.55, '#5f544d'); g.addColorStop(1, '#4a413c'); }
  else if (lm.bio === 'swamp') { g.addColorStop(0, '#62794a'); g.addColorStop(.55, '#526a3e'); g.addColorStop(1, '#435a34'); }
  else { g.addColorStop(0, '#62a44a'); g.addColorStop(.55, '#4d8a3b'); g.addColorStop(1, '#3d7231'); }
  lm.fill = g;
  let forest = null, deko = null;                                                // built the first time this region is drawn (faster start)
  Object.defineProperty(lm, 'forest', { get: () => forest || (forest = buildForest(lm)), configurable: true });
  if (DEKO_ART[lm.bio] && !lm.stone) Object.defineProperty(lm, 'deko', { get: () => deko || (deko = buildDeko(lm)), configurable: true });
}

// Paket C – Hintergrund der neuen Landschaften (einmal pro Region gebaut, wie die Wälder; liegt in den Karten-Kacheln):
// Eis: Eisblöcke und Spalten · Vulkan: Felsbrocken, Lava-Tümpel (+ ein Krater) · Sumpf: Tümpel, Schilf und niedrige Bäume.
// lm.lava = [[x, y, r], …] merkt sich die Lava für das Leuchten in der Nacht.
function dekoPlaetze(lm, n, seed, frei) {          // freie Plätze auf der Region (nicht an Basen, nicht an der Küste)
  const rnd = mulberry32(lm.id * 7919 + seed), bases = islandsByLandmass[lm.id] || [], out = [];
  for (let i = 0; i < n * 8 && out.length < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * lm.shapeMaxR, x = lm.x + Math.cos(a) * d, y = lm.y + Math.sin(a) * d;
    if (bases.some(b => Math.abs(b.x - x) < frei + b.radius && Math.abs(b.y - y) < frei + b.radius + 600 && Math.hypot(b.x - x, b.y - y) < b.radius + frei)) continue;
    if (!aufLand(lm, x, y) || !aufLand(lm, x + 900, y) || !aufLand(lm, x - 900, y) || !aufLand(lm, x, y + 900) || !aufLand(lm, x, y - 900)) continue;
    out.push([x, y, rnd]);
  }
  return out;
}
function buildDeko(lm) {
  const P = () => new Path2D(), d = { a: P(), b: P(), c: P(), s: P() };       // a dunkel, b mittel, c hell, s Linien
  const blob = (p, x, y, rx, ry, rnd, k) => {      // unregelmäßiger Fleck (Tümpel, Lava, Block)
    const n = k || 9; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, f = .78 + rnd() * .3, px = x + Math.cos(t) * rx * f, py = y + Math.sin(t) * ry * f; i ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath(); };
  if (lm.bio === 'ice') {
    for (const [x, y, rnd] of dekoPlaetze(lm, 140, 11, 700)) {
      const n = 2 + (rnd() * 4 | 0);
      for (let k = 0; k < n; k++) { const bx = x + (rnd() - .5) * 1000, by = y + (rnd() - .5) * 650, s = 170 + rnd() * 230;
        blob(d.a, bx, by + s * .25, s, s * .55, rnd, 5); blob(d.b, bx - s * .1, by, s * .8, s * .45, rnd, 5); blob(d.c, bx - s * .3, by - s * .12, s * .3, s * .16, rnd, 4); }
      if (rnd() < .45) { let sx = x + 500, sy = y - 300; d.s.moveTo(sx, sy);           // eine Spalte im Eis
        for (let k = 0; k < 5; k++) { sx += 250 + rnd() * 250; sy += (rnd() - .5) * 400; d.s.lineTo(sx, sy); } }
    }
  } else if (lm.bio === 'volcano') {
    lm.lava = [];
    d.lava = P(); d.lavaS = P();
    const bases = islandsByLandmass[lm.id] || [], frei = (x, y, m) => aufLand(lm, x, y) && !bases.some(b => Math.abs(b.x - x) < m && Math.abs(b.y - y) < m && Math.hypot(b.x - x, b.y - y) < m);
    const krater = dekoPlaetze(lm, 1, 3, 1500)[0];                                  // der Krater (wo zwischen den Basen Platz ist)
    if (krater) { const [x, y, rnd] = krater; blob(d.a, x, y + 150, 1500, 1000, rnd, 14); blob(d.b, x, y, 1050, 700, rnd, 12);
      blob(d.lava, x, y - 60, 640, 400, rnd, 12); lm.lava.push([x, y - 60, 900]); }
    { const rnd = mulberry32(lm.id * 31 + 5);                                       // Lava-Adern: glühende Risse zwischen den Basen
      for (let k = 0; k < 26; k++) { let x = lm.x + (rnd() - .5) * lm.shapeMaxR * 1.6, y = lm.y + (rnd() - .5) * lm.shapeMaxR * 1.6, a = rnd() * Math.PI * 2, offen = false, st = 0;
        for (let j = 0; j < 9; j++) { const nx = x + Math.cos(a) * 420, ny = y + Math.sin(a) * 420; a += (rnd() - .5) * 1.1;
          if (frei(nx, ny, 1150) && frei(x, y, 1150)) { if (!offen) { d.lavaS.moveTo(x, y); offen = true; } d.lavaS.lineTo(nx, ny); if (++st % 3 === 0) lm.lava.push([nx, ny, 420]); } else offen = false;
          x = nx; y = ny; } } }
    for (const [x, y, rnd] of dekoPlaetze(lm, 150, 13, 650)) {
      const n = 2 + (rnd() * 4 | 0);
      for (let k = 0; k < n; k++) { const bx = x + (rnd() - .5) * 900, by = y + (rnd() - .5) * 600, s = 120 + rnd() * 190;
        blob(d.a, bx, by + s * .2, s, s * .7, rnd, 6); blob(d.b, bx - s * .15, by - s * .05, s * .62, s * .42, rnd, 5); blob(d.c, bx - s * .35, by - s * .2, s * .22, s * .14, rnd, 4); }
      if (rnd() < .3) { const lx = x + (rnd() - .5) * 600, ly = y + 300, s = 180 + rnd() * 220; blob(d.lava, lx, ly, s, s * .55, rnd, 9); lm.lava.push([lx, ly, s * 1.6]); }
    }
  } else if (lm.bio === 'swamp') {
    for (const [x, y, rnd] of dekoPlaetze(lm, 150, 17, 650)) {
      if (rnd() < .6) { const s = 380 + rnd() * 520; blob(d.c, x, y, s, s * .55, rnd, 10); }     // Tümpel (dunkles Wasser, unten c)
      const n = 5 + (rnd() * 9 | 0);
      for (let k = 0; k < n; k++) { const rx = x + (rnd() - .5) * 1200, ry = y + (rnd() - .5) * 760, h = 150 + rnd() * 170;   // Schilf: Halme
        for (let j = -1; j <= 1; j++) { d.s.moveTo(rx + j * 22, ry); d.s.lineTo(rx + j * 36 + (rnd() - .5) * 30, ry - h * (j ? .8 : 1)); } }
      if (rnd() < .5) for (let k = 0; k < 3; k++) { const tx = x + (rnd() - .5) * 900, ty = y + (rnd() - .5) * 500, r = 90 + rnd() * 90;   // niedrige Sumpfbäume
        d.a.moveTo(tx + r, ty); d.a.arc(tx, ty, r, 0, Math.PI * 2); d.b.moveTo(tx - .12 * r + .7 * r, ty - .18 * r); d.b.arc(tx - .12 * r, ty - .18 * r, .7 * r, 0, Math.PI * 2); }
    }
  }
  return d;
}
const DEKO_FARBE = {                                // a, b, c, Linien (Breite in Welt-Einheiten)
  ice:     ['#87a9c3', '#c3dcee', 'rgba(255,255,255,.9)', 'rgba(90,130,165,.6)', 70],
  volcano: ['#2f2926', '#433b36', 'rgba(150,140,130,.4)', null, 0],
  swamp:   ['#2f4826', '#3f5d31', '#24423f', 'rgba(170,185,95,.9)', 40]
};
function paintDeko(g, lm, a) {                     // im Kachel-Bild (Welt-Koordinaten): a = Sichtbarkeit (wie die Wälder); die Lava immer
  if (!(a > 0) && lm.bio !== 'volcano') return;
  const d = lm.deko, f = DEKO_FARBE[lm.bio]; g.globalAlpha = a;
  if (a > 0) {
  if (lm.bio === 'swamp') { g.fillStyle = f[2]; g.fill(d.c); g.strokeStyle = 'rgba(140,190,170,.35)'; g.lineWidth = 60; g.stroke(d.c); }   // Wasser zuerst
  g.fillStyle = f[0]; g.fill(d.a); g.fillStyle = f[1]; g.fill(d.b);
  if (lm.bio !== 'swamp') { g.fillStyle = f[2]; g.fill(d.c); }
  if (f[3]) { g.strokeStyle = f[3]; g.lineWidth = f[4]; g.lineCap = 'round'; g.stroke(d.s); g.lineCap = 'butt'; }
  }
  g.globalAlpha = 1;
  if (d.lavaS) { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#8f2a0c'; g.lineWidth = 150; g.stroke(d.lavaS); g.strokeStyle = '#f07a1c'; g.lineWidth = 60; g.stroke(d.lavaS); g.lineCap = 'butt'; }
  if (d.lava) { g.fillStyle = '#d24812'; g.fill(d.lava); g.strokeStyle = 'rgba(40,16,8,.8)'; g.lineWidth = 50; g.stroke(d.lava); }
  g.globalAlpha = 1;
}


function buildForest(lm) {
  const rnd = mulberry32(lm.id * 991 + 7), bases = islandsByLandmass[lm.id] || [];
  const dark = new Path2D(), mid = new Path2D(), lit = new Path2D();
  const sb = { l: Math.min(...lm.shape.map(p => p.x)), r: Math.max(...lm.shape.map(p => p.x)), t: Math.min(...lm.shape.map(p => p.y)), b: Math.max(...lm.shape.map(p => p.y)) };
  const edgeDist = (x, y) => { let d = Infinity; const S = lm.shape;
    for (let i = 0, j = S.length - 1; i < S.length; j = i++) d = Math.min(d, pointToSegmentDistance(x, y, S[j].x, S[j].y, S[i].x, S[i].y)); return d; };
  for (let i = 0; i < 600; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * lm.shapeMaxR;
    const fx = lm.x + Math.cos(a) * d, fy = lm.y + Math.sin(a) * d, cnt = 3 + (rnd() * 5 | 0), spread = 380 + rnd() * 420;
    if (bases.some(b => Math.abs(b.x - fx) < 1600 && Math.abs(b.y - fy) < 1900 && (Math.hypot(b.x - fx, b.y - fy) < b.radius + 550 || (fy > b.y && fy < b.y + 1900)))) continue;   // cheap test first
    const deep = fx > sb.l + 9000 && fx < sb.r - 9000 && fy > sb.t + 9000 && fy < sb.b - 9000;   // far from every bank: no coast test needed
    if (!deep && (!pointInPolygon(fx, fy, lm.shape) || edgeDist(fx, fy) < 700)) continue;
    const trees = [];
    for (let k = 0; k < cnt + 3; k++) trees.push([fx + (rnd() - .5) * spread * 2, fy + (rnd() - .5) * spread * 1.4, 110 + rnd() * 110]);
    trees.sort((p, q) => p[1] - q[1]);
    for (const [x, y, r] of trees) {
      dark.moveTo(x + r, y); dark.arc(x, y, r, 0, Math.PI * 2);
      mid.moveTo(x - .12 * r + .74 * r, y - .18 * r); mid.arc(x - .12 * r, y - .18 * r, .74 * r, 0, Math.PI * 2);
      lit.moveTo(x - .3 * r + .3 * r, y - .36 * r); lit.arc(x - .3 * r, y - .36 * r, .3 * r, 0, Math.PI * 2);
    }
  }
  return [dark, mid, lit];
}

// Cache per (group, landmass). group 'player' = ownedIslands; group 'enemy' = every bot (all red).
const TERR = { player: new Map(), enemy: new Map() };        // lmId -> { sig, path, bbox }
function territorySigs() {                                    // cheap: ~2000 ids, order-independent sum hash
  const out = { player: new Map(), enemy: new Map() };
  const add = (grp, id, tag) => { const lmId = islandById[id].landmassId, m = out[grp];
    m.set(lmId, ((m.get(lmId) || 0) + Math.imul(id + 1, 2654435761) + tag * 40503) >>> 0); };
  for (const id of ownedIslands) add('player', id, 0);
  BOT_DEFS.forEach((bot, i) => { for (const id of botOwnedIslands[bot.id]) add('enemy', id, i + 1); });
  return out;
}

function buildTerritoryChunk(group, lmId) {
  const sets = group === 'player' ? [ownedIslands] : BOT_DEFS.map(b => botOwnedIslands[b.id]);
  const path = new Path2D(); let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const lmIslands = islandsByLandmass[lmId] || [];
  const cw = q => { let a = 0; for (let k = 0; k < q.length; k++) { const [x1, y1] = q[k], [x2, y2] = q[(k + 1) % q.length]; a += x1 * y2 - x2 * y1; } return a < 0 ? q.reverse() : q; };
  const pieces = [];                                                   // {bb, c:[x,y,R]} | {bb, q:[[x,y],...]}: lets a clipped repaint rebuild only nearby geometry
  const addPoly = q => { q = cw(q); path.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) path.lineTo(q[k][0], q[k][1]); path.closePath();
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]); pieces.push({ q, bb: { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) } }); };
  for (const set of sets) {
    const owned = lmIslands.filter(isl => set.has(isl.id));
    const link = new Map();                                              // id -> Set(ids) of corridor partners
    for (const isl of owned) { const R = isl.radius + TERRITORY_PADDING;
      path.moveTo(isl.x + R, isl.y); path.arc(isl.x, isl.y, R, 0, Math.PI * 2);
      pieces.push({ c: [isl.x, isl.y, R], bb: { l: isl.x - R, t: isl.y - R, r: isl.x + R, b: isl.y + R } });
      l = Math.min(l, isl.x - R); r = Math.max(r, isl.x + R); t = Math.min(t, isl.y - R); b = Math.max(b, isl.y + R); link.set(isl.id, new Set()); }
    for (let i = 0; i < owned.length; i++) for (let j = i + 1; j < owned.length; j++) {
      const A = owned[i], B = owned[j];
      if (Math.hypot(A.x - B.x, A.y - B.y) > TERRITORY_CONNECT_MAX_DIST) continue;
      const hw = Math.min(A.radius, B.radius) + TERRITORY_PADDING;
      if (!canConnectHalos(A, B, hw)) continue;
      link.get(A.id).add(B.id); link.get(B.id).add(A.id);
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * hw, ny = dx / len * hw;
      addPoly([[A.x + nx, A.y + ny], [B.x + nx, B.y + ny], [B.x - nx, B.y - ny], [A.x - nx, A.y - ny]]);
    }
    // triangle holes: a-b-c pairwise linked, and no other base of this landmass inside or within (radius + padding) of the triangle
    for (const A of owned) for (const bid of link.get(A.id)) { if (bid <= A.id) continue;
      for (const cid of link.get(bid)) { if (cid <= bid || !link.get(A.id).has(cid)) continue;
        const B = islandById[bid], C = islandById[cid];
        const blocked = lmIslands.some(o => { if (o.id === A.id || o.id === bid || o.id === cid) return false;
          const m = o.radius + TERRITORY_PADDING;
          return pointInPolygon(o.x, o.y, [A, B, C]) || pointToSegmentDistance(o.x, o.y, A.x, A.y, B.x, B.y) < m ||
                 pointToSegmentDistance(o.x, o.y, B.x, B.y, C.x, C.y) < m || pointToSegmentDistance(o.x, o.y, C.x, C.y, A.x, A.y) < m; });
        if (!blocked) addPoly([[A.x, A.y], [B.x, B.y], [C.x, C.y]]);
      } }
  }
  return { path, pieces, bbox: { l, t, r, b } };
}
function piecesPath(chunk, v) {                                        // Path2D of the pieces touching world rect v (same winding as chunk.path)
  const p = new Path2D();
  for (const pc of chunk.pieces) {
    if (pc.bb.r < v.l || pc.bb.l > v.r || pc.bb.b < v.t || pc.bb.t > v.b) continue;
    if (pc.c) { p.moveTo(pc.c[0] + pc.c[2], pc.c[1]); p.arc(pc.c[0], pc.c[1], pc.c[2], 0, Math.PI * 2); }
    else { p.moveTo(pc.q[0][0], pc.q[0][1]); for (let k = 1; k < pc.q.length; k++) p.lineTo(pc.q[k][0], pc.q[k][1]); p.closePath(); }
  }
  return p;
}

let OWNER_SNAPSHOT = new Map();                                // islandId -> 0 (player) | 1..n (bot index)
let ownDeltaVer = -1, terrVer = -1;                            // ownVer seen by ownershipDelta / refreshTerritory (nothing changed → no scan of ~2000 ids per frame)
function ownershipDelta() {                                    // world rects a capture can influence (one per changed base: base ± connect distance), or null
  if (ownDeltaVer === ownVer) return null; ownDeltaVer = ownVer;
  const cur = new Map(); let r = null;
  for (const id of ownedIslands) cur.set(id, 0);
  BOT_DEFS.forEach((bot, i) => { for (const id of botOwnedIslands[bot.id]) cur.set(id, i + 1); });
  const grow = id => { const isl = islandById[id]; if (!isl) return; const m = TERRITORY_CONNECT_MAX_DIST + isl.radius + TERRITORY_PADDING;
    (r = r || []).push({ l: isl.x - m, t: isl.y - m, r: isl.x + m, b: isl.y + m }); };   // per base: one far capture never touches the view's tiles
  for (const [id, tag] of cur) if (OWNER_SNAPSHOT.get(id) !== tag) grow(id);
  for (const id of OWNER_SNAPSHOT.keys()) if (!cur.has(id)) grow(id);
  OWNER_SNAPSHOT = cur;
  return r;
}
function refreshTerritory() {
  if (terrVer === ownVer) return null; terrVer = ownVer;
  const sigs = territorySigs(); let changed = null;
  const grow = bb => { changed = changed ? { l: Math.min(changed.l, bb.l), t: Math.min(changed.t, bb.t), r: Math.max(changed.r, bb.r), b: Math.max(changed.b, bb.b) } : { ...bb }; };
  for (const grp of ['player', 'enemy']) {
    const cache = TERR[grp], want = sigs[grp];
    for (const lmId of [...cache.keys()]) if (!want.has(lmId)) { grow(cache.get(lmId).bbox); cache.delete(lmId); }
    for (const [lmId, sig] of want) { const c = cache.get(lmId); if (!c || c.sig !== sig) { const n = { sig, ...buildTerritoryChunk(grp, lmId) }; cache.set(lmId, n); grow(n.bbox); if (c) grow(c.bbox); } }
  }
  return changed;                       // world bbox of everything that changed, or null
}

const HATCH_PX = () => Math.round(9 * dpr);
function hatchTile(color) { const s = HATCH_PX(), c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.strokeStyle = color; x.lineWidth = 1.25 * dpr; x.beginPath();
  for (const o of [-s, 0, s]) { x.moveTo(o, s); x.lineTo(o + s, 0); } x.stroke(); return c; }
let HATCH = null;                                              // rebuilt when dpr changes
function hatchPatterns() { return HATCH || (HATCH = { player: ctx.createPattern(hatchTile('rgba(150,200,255,.36)'), 'repeat'),
                                                      enemy:  ctx.createPattern(hatchTile('rgba(255,150,140,.34)'), 'repeat') }); }
const TERR_STYLE = { player: { fill: 'rgba(63,134,216,.20)', line: '#8cc0ff' }, enemy: { fill: 'rgba(201,66,58,.20)', line: '#ff8d82' } };
const layer = document.createElement('canvas'), L = layer.getContext('2d');   // sized in renderBackground()


function drawTerritoriesInto(g, lay, z, originL, originT, pxW, pxH, clip) {   // g/lay: target + scratch layer (same device size)
  const setW = x => x.setTransform(dpr * z, 0, 0, dpr * z, -originL * z * dpr, -originT * z * dpr);
  const cx0 = clip ? clip.x : 0, cy0 = clip ? clip.y : 0, cx1 = clip ? clip.x + clip.w : pxW, cy1 = clip ? clip.y + clip.h : pxH;
  const view = { l: originL + cx0 / dpr / z, t: originT + cy0 / dpr / z, r: originL + cx1 / dpr / z, b: originT + cy1 / dpr / z };
  const pad = 12 / z, H = hatchPatterns(), LL = lay.getContext('2d');
  for (const grp of ['enemy', 'player']) {
    const chunks = [...TERR[grp].values()].filter(c => c.bbox.r > view.l - pad && c.bbox.l < view.r + pad && c.bbox.b > view.t - pad && c.bbox.t < view.b + pad);
    if (!chunks.length) continue;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const c of chunks) { l = Math.min(l, c.bbox.l); t = Math.min(t, c.bbox.t); r = Math.max(r, c.bbox.r); b = Math.max(b, c.bbox.b); }
    const x0 = Math.max(cx0, Math.floor(((l - originL) * z - 6) * dpr)), y0 = Math.max(cy0, Math.floor(((t - originT) * z - 6) * dpr));
    const x1 = Math.min(cx1, Math.ceil(((r - originL) * z + 6) * dpr)), y1 = Math.min(cy1, Math.ceil(((b - originT) * z + 6) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    const m = 8 / z, vv = { l: view.l - m, t: view.t - m, r: view.r + m, b: view.b + m };
    const paths = chunks.map(c => piecesPath(c, vv));                      // only the geometry near this tile / clip
    setW(g);
    g.fillStyle = TERR_STYLE[grp].fill; for (const p of paths) g.fill(p);
    const hs = HATCH_PX(), all = new Path2D(); for (const p of paths) all.addPath(p);      // hatch: world-anchored at an
    const ph = Math.round(originL * z * dpr), pv = Math.round(originT * z * dpr);        // integer device-px phase → the
    g.save(); g.clip(all); g.setTransform(1, 0, 0, 1, 0, 0);                           // lines run on across tile seams
    H[grp].setTransform(new DOMMatrix([1, 0, 0, 1, -(((ph % hs) + hs) % hs), -(((pv % hs) + hs) % hs)]));
    g.fillStyle = H[grp]; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
    LL.setTransform(1, 0, 0, 1, 0, 0); LL.clearRect(x0, y0, x1 - x0, y1 - y0); setW(LL); LL.lineJoin = 'round';
    LL.lineWidth = 5.5 / z; LL.strokeStyle = 'rgba(6,12,20,.55)'; for (const p of paths) LL.stroke(p);
    LL.lineWidth = 3.5 / z; LL.strokeStyle = TERR_STYLE[grp].line; for (const p of paths) LL.stroke(p);
    LL.globalCompositeOperation = 'destination-out'; LL.fillStyle = '#000'; for (const p of paths) LL.fill(p);
    LL.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lay, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  }
}

// ---- cached background: sea + land + grass + forests + coast + bridges + territory ----
// World-anchored tiles of TILE_PX CSS px, rendered at one exact zoom per "generation". Panning only renders the
// tiles that scroll into view (a few per frame, time-boxed); a zoom gesture draws the current generation scaled
// and starts a new one when the scale leaves 0.7-1.4. While tiles are missing, up to two older generations of a
// similar zoom (scaled) fill the gaps, else the live sea plus a whole-world land overview (built at idle right after
// boot), so nothing is ever rendered as one big blocking job and no flat sea shows through; each gap pixel is drawn
// once. When the zoom settles off-scale, the crisp generation is built behind the complete scaled one and swapped
// in only once it covers the view (no patchwork).
// Canvas rasterisation is deferred until a tile is first drawn, so the per-frame budget counts device pixels, not ms,
// and adapts: it halves after a slow frame that rendered tiles (heavy territory, slow device) and recovers slowly.
const TILE_PX = 256, TILE_BUDGET_MOVING = 540000, TILE_BUDGET_IDLE = 1600000;   // device px of new tiles per frame (max; at least 1 tile)
const BG = { rate: TILE_BUDGET_IDLE, lastAt: 0, lastTiles: 0, valid: false, gen: null, olds: [], next: null, tiles: new Map(), pool: [], pending: false, over: null, seq: 0, lastZ: 0, hopAt: -1e9, land: null, hopGen: null };
function bgDropGen(gen) { for (const [key, T] of BG.tiles) if (T.gen === gen) { BG.tiles.delete(key); BG.pool.push(T.c); } }
function bgGen(z) { const td = Math.round(TILE_PX * dpr); return { z, td, ws: td / (dpr * z), id: ++BG.seq }; }   // ws = tile edge in world units
function bgShow(gen) {                         // gen becomes the displayed generation; the replaced one fills gaps until gen covers the view
  if (BG.gen && BG.gen !== gen) BG.olds.unshift(BG.gen);
  for (const g of BG.olds.splice(0).filter(g => g !== gen)) { if (bgKept(g) || (g.td === gen.td && BG.olds.length < 2 && g.z / gen.z > 0.55 && g.z / gen.z < 1.8)) BG.olds.push(g); else bgDropGen(g); }   // near zooms only: they look alike
  BG.gen = gen; return gen;
}
const bgKept = g => g === BG.land || g === BG.hopGen;   // a hop's end generation and its current far one: kept as filler until it lands
function bgRange(gen, pad, v) {                // tile index range covering the view (v: another view { x, y, z } centre + zoom) (+pad tiles)
  const z = v ? v.z : mapState.zoom, ws = gen.ws, l = v ? v.x - viewW / 2 / z : -mapState.offsetX / z, t = v ? v.y - viewH / 2 / z : -mapState.offsetY / z;
  return { x0: Math.floor(l / ws) - pad, x1: Math.floor((l + viewW / z) / ws) + pad, y0: Math.floor(t / ws) - pad, y1: Math.floor((t + viewH / z) / ws) + pad };
}
function bgMissing(gen, pad, v) {              // missing tiles, nearest to the view centre first
  const R = bgRange(gen, pad, v), out = [], z = mapState.zoom;
  const cx = (v ? v.x : (viewW / 2 - mapState.offsetX) / z) / gen.ws - .5, cy = (v ? v.y : (viewH / 2 - mapState.offsetY) / z) / gen.ws - .5;
  for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++)
    if (!BG.tiles.has(gen.id + ':' + tx + ':' + ty)) out.push({ tx, ty, d: (tx - cx) * (tx - cx) + (ty - cy) * (ty - cy) });
  return out.sort((a, b) => a.d - b.d);
}
function renderTile(gen, tx, ty) {
  const td = gen.td, c = BG.pool.pop() || document.createElement('canvas');
  if (c.width !== td || c.height !== td) { c.width = td; c.height = td; }
  if (layer.width !== td || layer.height !== td) { layer.width = td; layer.height = td; }
  const T = { c, g: c.getContext('2d'), gen, z: gen.z, l: tx * gen.ws, t: ty * gen.ws };
  paintBackground(T, null);
  BG.tiles.set(gen.id + ':' + tx + ':' + ty, T);
  return T;
}
const WARM = document.createElement('canvas'); WARM.width = WARM.height = 1; const WARMG = WARM.getContext('2d');
function bgWarm(T) { WARMG.clearRect(0, 0, 1, 1); WARMG.drawImage(T.c, 0, 0, 1, 1); T.drawn = true; }   // rasterise a tile now, not at its first blit
function bgOverview() {                        // whole-world land for gaps (transparent sea, no territory), painted at idle in slices, once per dpr:
  let O = BG.over;                             // c = land without grass / forests (far zoom), d = with them (mid / near zoom)
  if (O && O.dpr === dpr && O.done) return O;
  if (!O || O.dpr !== dpr) {
    const pad = .22, l = WORLD.l - WORLD.w * pad, t = WORLD.t - WORLD.h * pad, ww = WORLD.w * (1 + 2 * pad), wh = WORLD.h * (1 + 2 * pad);
    const z = 2048 / (Math.max(ww, wh) * dpr), mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(ww * z * dpr); c.height = Math.ceil(wh * z * dpr); return c; };
    const c = mk(), d = mk();
    O = BG.over = { c, d, z, l, t, dpr, ref: 0.008, noSea: true, row: 0, rows: 10, queued: false, done: false };   // ref: coast / bridge widths as at zoom 0.008
  }
  if (!O.queued) { O.queued = true;
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => { O.queued = false; if (BG.over !== O) return;
      const h = Math.ceil(O.c.height / O.rows), y = O.row * h, clip = { x: 0, y, w: O.c.width, h: Math.min(h, O.c.height - y) };
      paintBackground({ ...O, g: O.c.getContext('2d'), part: 'base' }, clip, true);
      paintBackground({ ...O, c: O.d, g: O.d.getContext('2d'), part: 'full' }, clip, true);
      bgWarm(O); bgWarm({ c: O.d });                                             // rasterised slice by slice here, not at its first use
      if (++O.row >= O.rows) O.done = true; else bgOverview(); }, { timeout: 600 }); }
  return null;
}
function repaintBackgroundRect(r) {            // partial repaint of a WORLD rect (after a capture); pixels are deterministic → no seams
  for (const [key, T] of BG.tiles) {
    const e = T.gen.ws;
    if (T.l > r.r || T.l + e < r.l || T.t > r.b || T.t + e < r.t) continue;
    if (T.gen !== BG.gen && T.gen !== BG.next) { BG.tiles.delete(key); BG.pool.push(T.c); continue; }   // stale generation: just forget it
    const k = T.z * dpr, td = T.c.width;
    const x0 = Math.max(0, Math.floor((r.l - T.l) * k)), y0 = Math.max(0, Math.floor((r.t - T.t) * k));
    const x1 = Math.min(td, Math.ceil((r.r - T.l) * k)), y1 = Math.min(td, Math.ceil((r.b - T.t) * k));
    if (layer.width !== td || layer.height !== td) { layer.width = td; layer.height = td; }
    if (x1 > x0 && y1 > y0) paintBackground(T, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
}
function paintSea(g, T, x, y, w, h) {          // depth gradient (lighter at the hub) + world-anchored texture. NOTHING hugs the coast.
  const z = T.z, R = WORLD.radius * z, cx = (WORLD.cx - T.l) * z, cy = (WORLD.cy - T.t) * z;   // into the device rect x,y,w,h of g; world (T.l, T.t) at 0,0
  const cl = T.l + x / dpr / z, ct = T.t + y / dpr / z, W = w / dpr / z, H = h / dpr / z;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
  sg.addColorStop(0, '#16506f'); sg.addColorStop(.5, '#0f3a57'); sg.addColorStop(1, '#0a2438');
  g.fillStyle = sg; g.fillRect(x / dpr, y / dpr, w / dpr, h / dpr);
  let seaA = Math.min(1, Math.max(0, (z - 0.002) / 0.005));                     // texture fades in 0.002-0.007 (no pop between generations)
  if (T.fast && seaA < 0.35) seaA = 0;                                           // gap filler: skip the faint texture (a costly fill)
  if (seaA > 0) { g.setTransform(dpr * z, 0, 0, dpr * z, -T.l * z * dpr, -T.t * z * dpr); g.fillStyle = SEA_PATTERN;   // two passes at an incommensurate
    SEA_PATTERN.setTransform(new DOMMatrix().scale(26000 / 512)); g.globalAlpha = (T.fast ? .52 : .42) * seaA; g.fillRect(cl, ct, W, H);   // scale + rotation →
    if (!T.fast) { SEA_PATTERN.setTransform(new DOMMatrix().rotate(17).scale(26000 * 1.37 / 512)); g.globalAlpha = .3 * seaA; g.fillRect(cl, ct, W, H); }
    g.globalAlpha = 1; }   // no repeat grid (the gap filler draws the cheaper first pass only)
}
function paintBackground(T, clip, noTerritory) {  // T = tile {c, g, z, l, t}; clip = device-px rect inside T.c, or null for everything
  const z = T.z, w = T.c.width, h = T.c.height, zl = T.ref || z, ls = z / zl;   // zl: zoom whose line widths to use (overview)
  const g = T.g;
  g.save();
  if (clip) { g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip(); }
  const cl = clip ? T.l + clip.x / dpr / z : T.l, ct = clip ? T.t + clip.y / dpr / z : T.t;
  const W = (clip ? clip.w : w) / dpr / z, H = (clip ? clip.h : h) / dpr / z;
  const view = { l: cl - ISLAND_RADIUS * 2, t: ct - ISLAND_RADIUS * 2, r: cl + W + ISLAND_RADIUS * 2, b: ct + H + ISLAND_RADIUS * 2 };
  const world = () => g.setTransform(dpr * z, 0, 0, dpr * z, -T.l * z * dpr, -T.t * z * dpr);
  const screen = () => g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sx = x => (x - T.l) * z, sy = y => (y - T.t) * z;
  // 1 sea (the overview has none: the gap filler paints the live sea under it, see drawBackground)
  if (!T.noSea) paintSea(g, T, clip ? clip.x : 0, clip ? clip.y : 0, clip ? clip.w : w, clip ? clip.h : h);
  // 2 land: GREEN gradient, grass texture (fades in 0.006-0.018), forests (fade in 0.016-0.022), ONE thin coastline. No shadow, no beach.
  // (overview: part 'base' = land without grass / forests, part 'full' = with grass + forests at full strength)
  world();
  const zd = T.part ? (T.part === 'full' ? 1 : 0) : z;
  const grassA = Math.min(1, Math.max(0, (zd - 0.006) / 0.012)) * 0.38, forestA = Math.min(1, Math.max(0, (zd - 0.016) / 0.006));
  if (grassA > 0) GRASS_PATTERN.setTransform(new DOMMatrix().scale(9000 / 512));
  for (const lm of landmasses) {
    if (lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b) continue;
    g.fillStyle = lm.fill; g.fill(lm.path);
    if (grassA > 0) { g.globalAlpha = grassA * (lm.stone ? .35 : lm.bio === 'snow' || lm.bio === 'ice' ? .12 : lm.bio === 'sand' ? .2 : lm.bio === 'volcano' ? .3 : lm.bio === 'swamp' ? .8 : 1); g.fillStyle = GRASS_PATTERN; g.fill(lm.path); g.globalAlpha = 1; }
    if (lm.deko) paintDeko(g, lm, Math.max(forestA, Math.min(1, Math.max(0, (zd - 0.007) / 0.008))));                                        // Paket C: Eis, Vulkan, Sumpf (statt Wald)
    else if (forestA > 0) { g.globalAlpha = forestA;
      if (lm.bio === 'snow' && !lm.stone) { g.fillStyle = '#3f5a4c'; g.fill(lm.forest[0]); g.fillStyle = '#56735f'; g.fill(lm.forest[1]);   // snowy firs
        g.fillStyle = 'rgba(250,252,255,.7)'; g.fill(lm.forest[2]); }
      else if (lm.bio === 'sand' && !lm.stone) { g.fillStyle = '#9c7e4c'; g.fill(lm.forest[0]); g.fillStyle = '#b39360'; g.fill(lm.forest[1]);   // dunes and dry scrub
        g.fillStyle = 'rgba(255,240,200,.35)'; g.fill(lm.forest[2]); }
      else if (lm.stone) { g.fillStyle = '#56575a'; g.fill(lm.forest[0]); g.fillStyle = '#6a6b6e'; g.fill(lm.forest[1]);   // rocks instead of forest
        g.fillStyle = 'rgba(215,215,210,.3)'; g.fill(lm.forest[2]); }
      else { g.fillStyle = '#284d22'; g.fill(lm.forest[0]); g.fillStyle = '#35652c'; g.fill(lm.forest[1]);
        g.fillStyle = 'rgba(128,176,90,.38)'; g.fill(lm.forest[2]); }
      g.globalAlpha = 1; }
    g.lineJoin = 'round'; g.lineWidth = 1.4 / zl; g.strokeStyle = lm.stone ? 'rgba(24,24,26,.92)' : 'rgba(14,30,12,.92)'; g.stroke(lm.path);
  }
  // 3 bridges: straight timber between the polygonPointAtAngle endpoints, extended 250 units along their own axis
  const bw = Math.max(3, Math.min(28, 420 * zl)) * ls; screen();
  for (const br of bridges) {
    const dx = br.x2 - br.x1, dy = br.y2 - br.y1, len0 = Math.hypot(dx, dy) || 1, ux = dx / len0, uy = dy / len0, EXT = 250;
    const ax = sx(br.x1 - ux * EXT), ay = sy(br.y1 - uy * EXT), bx = sx(br.x2 + ux * EXT), by = sy(br.y2 + uy * EXT);
    if (Math.max(ax, bx) < -40 || Math.min(ax, bx) > w / dpr + 40 || Math.max(ay, by) < -40 || Math.min(ay, by) > h / dpr + 40) continue;
    const len = Math.hypot(bx - ax, by - ay);
    g.save(); g.translate(ax, ay); g.rotate(Math.atan2(by - ay, bx - ax));
    g.fillStyle = '#35261a'; g.fillRect(0, -bw / 2 - ls, len, bw + 2 * ls);                             // timber casing, butt ends
    const dg = g.createLinearGradient(0, -bw / 2, 0, bw / 2); dg.addColorStop(0, '#b08658'); dg.addColorStop(.5, '#94704a'); dg.addColorStop(1, '#77593a');
    g.fillStyle = dg; g.fillRect(0, -bw / 2 + ls, len, bw - 2 * ls);                                    // deck
    const step = 160 * z;
    if (step >= 4 && bw >= 6) { g.strokeStyle = 'rgba(40,26,14,.5)'; g.lineWidth = 1; g.beginPath();
      for (let s = step; s < len; s += step) { g.moveTo(s, -bw / 2 + 1); g.lineTo(s, bw / 2 - 1); } g.stroke(); }   // planks
    if (bw >= 5) {                                                                                       // stone parapets with merlons on both sides
      const pw = Math.max(1.5, bw * .16); g.fillStyle = '#8f8b84'; g.fillRect(0, -bw / 2 - pw * .4, len, pw); g.fillRect(0, bw / 2 - pw * .6, len, pw);
      if (bw >= 9) { g.fillStyle = '#b3aea5'; const m = Math.max(2, pw * 1.1); for (let px = m * .5; px < len - m; px += m * 2) { g.fillRect(px, -bw / 2 - pw * .4 - m * .6, m, m * .6); g.fillRect(px, bw / 2 + pw * .4, m, m * .6); } } }
    g.restore();
  }
  // 4 territory (cached geometry, see below)
  if (!noTerritory) drawTerritoriesInto(g, layer, z, T.l, T.t, w, h, clip);
  g.restore();
}
let cameraSettling = false;   // true while the zoom eases, a pinch runs or a camera flight plays (set by §6)
function drawBackground() {   // per frame: blit the cached tiles; render the missing ones within a pixel budget
  const z = mapState.zoom, now = performance.now(), gap = now - BG.lastAt, td0 = Math.round(TILE_PX * dpr);
  const bIdle = TILE_BUDGET_IDLE, bMove = TILE_BUDGET_MOVING;                   // ≈ 6 / 2 tiles at dpr 2 (always at least one)
  if (BG.lastTiles && gap > 30 && gap < 400) BG.rate = Math.max(td0 * td0, BG.rate * .5);   // the last frame's new tiles were too much (floor: 1 tile)
  else if (gap < 22) BG.rate = Math.min(bIdle, BG.rate * 1.15);
  BG.lastAt = now; BG.lastTiles = 0;
  if (!BG.valid) { BG.tiles.forEach(T => BG.pool.push(T.c)); BG.tiles.clear(); BG.gen = BG.next = null; BG.olds = []; BG.valid = true; }
  const O = bgOverview();                                                          // queued at idle right after boot
  const moving = gesture.active || cameraSettling || mapState.velocityX || mapState.velocityY;
  const has = (g, tx, ty) => BG.tiles.has(g.id + ':' + tx + ':' + ty);
  const anyIn = g => { if (!g) return false; const R = bgRange(g, 0);
    for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++) if (has(g, tx, ty)) return true; return false; };
  if (BG.next && (moving || BG.next.z !== z || BG.next.td !== td0)) { bgDropGen(BG.next); BG.next = null; }   // superseded
  // render for where the zoom is heading: the wheel / button ease and camera flights know their end zoom; a pinch that
  // leaves the window outward gets a generation 20 % further out (fewer, cheaper generations while zooming out).
  // A hop (a flight that dips below 0.6 · its end zoom): its end generation (BG.land) is set up at once and the end
  // view's tiles are rendered first, on the way, so it lands crisp; far out (hopOut) few, coarse generations follow
  // the zoom (z1's tiles would be specks, and a touch there must find tiles near the current zoom)
  const ratio = (a, b) => Math.abs(a / b - 1) < 1e-9 ? 1 : a / b;                // float noise is not a zoom change
  const F = cameraFlight, hop = !!F && F.zm < F.z1 * 0.6, hopOut = hop && z < F.z1 * 0.6;
  if (hop && (!F.land || F.land.td !== td0)) {
    F.land = [BG.gen, ...BG.olds].find(g => g && g.td === td0 && ratio(g.z, F.z1) === 1) || bgGen(F.z1);
    if (F.land !== BG.gen && !BG.olds.includes(F.land)) BG.olds.push(F.land);
  }
  if (!hop) BG.hopGen = null;
  BG.land = hop ? F.land : null;
  const zEnd = F ? (hopOut ? z : F.z1) : gesture.mode !== 'pinch' && mapState.targetZoom !== z ? mapState.targetZoom : z;
  let gen = BG.gen, k = gen ? ratio(z, gen.z) : 0, kEnd = gen ? ratio(zEnd, gen.z) : 0;
  const down = z < (BG.lastZ || z); BG.lastZ = z;
  if (hopOut) BG.hopAt = now;
  if (hopOut && gen && gen.td === td0) {                                             // fast, so fewer generations: each one spans a wide
    if (k < 0.6 || (!down && k > 1.5 && z < F.z1 * 0.45)) { gen = BG.hopGen = bgShow(bgGen(down ? Math.max(F.zm, z * 0.6) : z * 1.3)); k = z / gen.z; } }   // range, set ahead of the motion
  else if (hop) { if (gen !== F.land) gen = bgShow(F.land); k = ratio(z, gen.z); }  // the approach: the end generation, the far one as filler
  else if (!gen || gen.td !== td0 || kEnd < 0.7 || kEnd > 1.4) { gen = bgShow(bgGen(zEnd !== z ? zEnd : gen && gesture.mode === 'pinch' && k < 0.7 ? z * 0.8 : z)); k = z / gen.z; }
  const drawn = (g, tx, ty) => { const T = BG.tiles.get(g.id + ':' + tx + ':' + ty); return !!T && T.drawn; };   // (a filler never pays a first raster)
  const alike = o => !bgKept(o) || (o.td === gen.td && o.z / z > 0.55 && o.z / z < 1.8);          // a hop's kept generations fill in near their zoom only
  const covered = (tx, ty) => BG.olds.some(o => {                                  // an older generation already shows this tile
    if (!alike(o)) return false;
    const e = gen.ws * (1 - 1e-9), x0 = Math.floor(tx * gen.ws / o.ws), x1 = Math.floor((tx * gen.ws + e) / o.ws), y0 = Math.floor(ty * gen.ws / o.ws), y1 = Math.floor((ty * gen.ws + e) / o.ws);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!drawn(o, x, y)) return false; return true; });
  const missing = g => { const out = bgMissing(g, 0); if (g !== gen || !BG.olds.length) return out;
    const a = [], b = []; for (const m of out) (covered(m.tx, m.ty) ? b : a).push(m); return a.concat(b); };   // the uncovered ring first
  let miss = missing(gen), budget = 0;
  if (k !== 1 && !moving) {                                                        // settled off-scale
    if (miss.length) { gen = bgShow(bgGen(z)); k = 1; miss = bgMissing(gen, 0); }  // gaps anyway: render the crisp one directly
    else if (!BG.next) BG.next = bgGen(z);                                         // complete: build the crisp one behind it
  }
  if (miss.length && !cameraFlight && !anyIn(gen) && !BG.olds.some(anyIn) &&       // nothing cached here at all (boot, resize, jump): draw it now -
      !(O && now - BG.hopAt < 600)) {                                              // but not right after a hop (a touch mid-hop): the overview fills in
    for (const m of miss) renderTile(gen, m.tx, m.ty); miss = [];
  } else {
    budget = Math.min(BG.rate, moving ? bMove : bIdle);
    if (hop && gen !== F.land) {                                                   // far out on a hop: the end view first, rasterised
      const lw = bgMissing(F.land, 0, { x: F.end.x, y: F.end.y, z: F.z1 });      // now (a first blit after landing would stall)
      if (lw.length) { const m = lw[0]; bgWarm(renderTile(F.land, m.tx, m.ty)); budget -= F.land.td * F.land.td; BG.lastTiles++; }   // (one per frame: that costs real time)
    }
    const work = miss.length ? miss : BG.next ? bgMissing(BG.next, 0) : [], wg = miss.length ? gen : BG.next;
    for (let first = true; work.length && (first || budget >= wg.td * wg.td); first = false) {   // at least one tile per frame
      const m = work.shift(); renderTile(wg, m.tx, m.ty); budget -= wg.td * wg.td; BG.lastTiles++; }
    if (BG.next && !miss.length && !work.length) { gen = bgShow(BG.next); BG.next = null; k = 1; }   // the crisp one covers the view: swap
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const ox = mapState.offsetX * dpr, oy = mapState.offsetY * dpr;
  const blit = (g, only) => { const kk = ratio(z, g.z); ctx.imageSmoothingQuality = kk === 1 ? 'high' : 'low';   // scaled only mid-zoom: cheap bilinear
    const td = g.td, R = bgRange(g, 0);
    const ex = tx => Math.round(tx * td * kk + ox), ey = ty => Math.round(ty * td * kk + oy);   // shared tile edges → no seams
    for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++) {
      const key = g.id + ':' + tx + ':' + ty, T = BG.tiles.get(key); if (!T || (only && (!T.drawn || !only(g, tx, ty)))) continue;
      BG.tiles.delete(key); BG.tiles.set(key, T);                                        // LRU refresh
      const x = ex(tx), y = ey(ty); ctx.drawImage(T.c, x, y, ex(tx + 1) - x, ey(ty + 1) - y); T.drawn = true;
    }
    ctx.imageSmoothingQuality = 'high'; };
  // gaps (only where the current generation has no tile yet, so nothing is drawn twice): older generations where they
  // cover the hole, coarser first; otherwise the live sea + the overview's land (without / with grass and forests)
  if (miss.length) {
    const holes = new Set(miss.map(m => m.tx + ':' + m.ty)), kg = k, tdg = gen.td;
    const gx = tx => Math.round(tx * tdg * kg + ox), gy = ty => Math.round(ty * tdg * kg + oy);
    const overHole = (o, tx, ty) => { const e = o.ws * (1 - 1e-9);                   // does old tile (tx, ty) overlap a hole?
      for (let y = Math.floor(ty * o.ws / gen.ws); y <= Math.floor((ty * o.ws + e) / gen.ws); y++)
        for (let x = Math.floor(tx * o.ws / gen.ws); x <= Math.floor((tx * o.ws + e) / gen.ws); x++) if (holes.has(x + ':' + y)) return true;
      return false; };
    const open = miss.filter(m => !covered(m.tx, m.ty)).map(m => { const x = gx(m.tx), y = gy(m.ty); return { m, x, y, w: gx(m.tx + 1) - x, h: gy(m.ty + 1) - y }; });
    if (open.length > 48) {                                                        // many holes: sea + overview once for the whole view
      const V = { z, l: -mapState.offsetX / z, t: -mapState.offsetY / z, fast: 1 }, W = canvas.width, Hh = canvas.height;
      paintSea(ctx, V, 0, 0, W, Hh);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'low';
      if (O) { const OC = z >= 0.016 ? O.d : O.c, s = O.z * dpr, u0 = (V.l - O.l) * s, v0 = (V.t - O.t) * s, us = viewW / z * s, vs = viewH / z * s;
        const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(O.c.width, u0 + us), cv1 = Math.min(O.c.height, v0 + vs);
        if (cu1 > cu0 && cv1 > cv0) ctx.drawImage(OC, cu0, cv0, cu1 - cu0, cv1 - cv0, (cu0 - u0) / us * W, (cv0 - v0) / vs * Hh, (cu1 - cu0) / us * W, (cv1 - cv0) / vs * Hh); }
    } else if (open.length) {                                                      // the live sea (exactly as in the tiles) + the overview's land
      const V = { z, l: -mapState.offsetX / z, t: -mapState.offsetY / z, fast: 1 };
      for (const r of open) paintSea(ctx, V, r.x, r.y, r.w, r.h);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'low';
      const OC = O && (z >= 0.016 ? O.d : O.c);                                  // with grass + forests where the tiles have them (from 0.016)
      if (O) for (const { m, x, y, w, h } of open) {
        const s = O.z * dpr, u0 = (m.tx * gen.ws - O.l) * s, v0 = (m.ty * gen.ws - O.t) * s, us = gen.ws * s;   // source rect in the overview
        const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(O.c.width, u0 + us), cv1 = Math.min(O.c.height, v0 + us);
        if (cu1 <= cu0 || cv1 <= cv0) continue;
        const dx = x + (cu0 - u0) / us * w, dy = y + (cv0 - v0) / us * h, dw = (cu1 - cu0) / us * w, dh = (cv1 - cv0) / us * h;
        ctx.drawImage(OC, cu0, cv0, cu1 - cu0, cv1 - cv0, dx, dy, dw, dh);
      }
    }
    ctx.imageSmoothingQuality = 'high';
    for (const o of BG.olds.slice().sort((a, b) => a.z - b.z)) if (alike(o)) blit(o, overHole);
  }
  blit(gen);
  let pre = [];                                                                    // prefetch a one-tile ring once the view is complete
  if (!miss.length && !BG.next && !hop) { pre = bgMissing(gen, 1);
    if (!BG.lastTiles) budget = Math.min(BG.rate, bMove);
    while (pre.length && budget >= gen.td * gen.td) { const m = pre.shift(); renderTile(gen, m.tx, m.ty); budget -= gen.td * gen.td; BG.lastTiles++; } }
  if (!miss.length && BG.olds.length) BG.olds = BG.olds.filter(g => bgKept(g) || (bgDropGen(g), false));   // the current generation covers the view
  const count = (g, pad) => { const R = bgRange(g, pad); return (R.x1 - R.x0 + 1) * (R.y1 - R.y0 + 1); };
  const cap = count(gen, 1) + (BG.next ? count(BG.next, 0) : 0) + BG.olds.reduce((n, o) => n + count(o, 0), 0) + 12;
  while (BG.tiles.size > cap) { const [key, T] = BG.tiles.entries().next().value; BG.tiles.delete(key); BG.pool.push(T.c); }   // least recently used first
  while (BG.pool.length > 24) { const c = BG.pool.pop(); c.width = c.height = 0; }   // free the backing store now, not at GC
  BG.pending = miss.length > 0 || pre.length > 0 || !!BG.next || (k !== 1 && !gesture.active);   // a scaled (blurry) view → come back for the crisp one
}

function strokeBox(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); g.stroke(); }   // replaces strokeRect (forbidden token, §7.4)
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const BAND = { player: '#3f86d8', bot: '#c9423a', neutral: '#7c8088' };

function baseLevelOf(isl) { return islandOwnerOf(isl.id) ? (islandLevels[isl.id] || 1) : (isl.neutralLevel || 1); }
// ===== 3D (isometric) buildings: every building is drawn from the same angle, top + two sides visible =====
// Sprite box as before: x −31…31, y −48…24, the ground centre of a building sits at y = ISO_OY.
const ISO_OY = 8, ER = 1.2247, EY = .7071;
function shade(hex, f) {                                   // darken (f < 1) or lighten (f > 1) a #rrggbb colour
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
}
function isoKit(g, OY, inkCol) {
  const P = (x, y, z) => [(x - y) * .866, (x + y) * .5 - z + OY];
  const ink = inkCol || '#2a241b';
  const poly = (pts, fill, lw) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = lw || 1; g.strokeStyle = ink; g.stroke(); };
  // box from (x0,y0) to (x1,y1) on the ground, z0…z1 high; col = base colour, the three visible faces are shaded from it
  const box = (x0, x1, y0, y1, z0, z1, col, lw) => {
    poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(col, .86), lw);
    poly([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], shade(col, .68), lw);
    poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], shade(col, 1.12), lw);
  };
  const sq = (cx, cy, a, z0, z1, col, lw) => box(cx - a, cx + a, cy - a, cy + a, z0, z1, col, lw);
  const cyl = (cx, cy, r, z0, z1, col, lw, noTop) => {
    const [x0, y0] = P(cx, cy, z0), [, y1] = P(cx, cy, z1), rx = r * ER, ry = r * EY;
    const gr = g.createLinearGradient(x0 - rx, 0, x0 + rx, 0); gr.addColorStop(0, shade(col, 1.1)); gr.addColorStop(.45, shade(col, .9)); gr.addColorStop(1, shade(col, .62));
    g.beginPath(); g.moveTo(x0 - rx, y1); g.lineTo(x0 - rx, y0); g.ellipse(x0, y0, rx, ry, 0, Math.PI, 0, true); g.lineTo(x0 + rx, y1); g.ellipse(x0, y1, rx, ry, 0, 0, Math.PI, true); g.closePath();
    g.fillStyle = gr; g.fill(); g.lineWidth = lw || 1; g.strokeStyle = ink; g.stroke();
    if (!noTop) { g.beginPath(); g.ellipse(x0, y1, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = shade(col, 1.15); g.fill(); g.stroke(); }
  };
  const cone = (cx, cy, r, z, h, col) => {                  // round roof
    const [x0, y0] = P(cx, cy, z), rx = r * ER, ry = r * EY, ay = y0 - h;
    g.beginPath(); g.moveTo(x0 - rx, y0); g.lineTo(x0, ay); g.lineTo(x0 + rx, y0); g.ellipse(x0, y0, rx, ry, 0, 0, Math.PI, false); g.closePath();
    const gr = g.createLinearGradient(x0 - rx, 0, x0 + rx, 0); gr.addColorStop(0, shade(col, 1.15)); gr.addColorStop(.5, col); gr.addColorStop(1, shade(col, .6));
    g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = ink; g.stroke(); return [x0, ay];
  };
  const pyramid = (cx, cy, a, z, h, col) => {               // square roof
    const ap = P(cx, cy, z + h);
    poly([P(cx - a, cy + a, z), P(cx + a, cy + a, z), ap], shade(col, .95));
    poly([P(cx + a, cy - a, z), P(cx + a, cy + a, z), ap], shade(col, .7));
    return ap;
  };
  const dome = (cx, cy, r, z, h, col) => {
    const [x0, y0] = P(cx, cy, z), rx = r * ER, ry = r * EY, top = y0 - h;
    g.beginPath(); g.moveTo(x0 - rx, y0); g.bezierCurveTo(x0 - rx, top + h * .25, x0 - rx * .45, top, x0, top); g.bezierCurveTo(x0 + rx * .45, top, x0 + rx, top + h * .25, x0 + rx, y0);
    g.ellipse(x0, y0, rx, ry, 0, 0, Math.PI, false); g.closePath();
    const gr = g.createRadialGradient(x0 - rx * .35, top + h * .35, r * .2, x0, y0 - h * .3, rx * 1.3); gr.addColorStop(0, shade(col, 1.6)); gr.addColorStop(.45, col); gr.addColorStop(1, shade(col, .5));
    g.fillStyle = gr; g.fill(); g.lineWidth = 1.1; g.strokeStyle = ink; g.stroke(); return [x0, top];
  };
  const merlons = (x0, x1, y0, y1, z, col, n) => {           // battlements along the two front edges of a box top
    const w = (x1 - x0) / (n * 2 - 1), d = (y1 - y0) / (n * 2 - 1);
    for (let i = 0; i < n; i++) { box(x0 + i * 2 * w, x0 + i * 2 * w + w, y1 - 1, y1, z, z + 1.8, col, .6); box(x1 - 1, x1, y0 + i * 2 * d, y0 + i * 2 * d + d, z, z + 1.8, col, .6); }
  };
  const flag = (x, y, own, big) => {                        // pole + pennant in the owner's colour
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - (big ? 11 : 8)); g.lineWidth = .9; g.strokeStyle = ink; g.stroke();
    if (own) { const t = y - (big ? 11 : 8); g.fillStyle = own; g.beginPath(); g.moveTo(x, t); g.lineTo(x + (big ? 7 : 5.5), t + 1.6); g.lineTo(x, t + 3.4); g.closePath(); g.fill(); g.lineWidth = .6; g.stroke(); }
  };
  const faceWindow = (x, y, z, h) => { const [a, b] = P(x, y, z); g.fillStyle = '#2b2520'; g.fillRect(a - .6, b - h, 1.2, h); };
  const shadow = (rx, ry) => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, OY + 1, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  return { P, poly, box, sq, cyl, cone, pyramid, dome, merlons, flag, faceWindow, shadow, ink, g };
}
const STONE = '#d8d1c1', WOOD = '#8a6440';
const ROOF = { neutral: '#8a5a3c', player: '#3f86d8', bot: '#c9423a' };

function towerTier(level) { return level >= 80 ? 4 : level >= 50 ? 3 : level >= 25 ? 2 : level >= 10 ? 1 : 0; }

function paintTowerTier(g, ownerKey, detail, home, tier, skin) {
  const K = isoKit(g, ISO_OY), own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;
  const stone = skin && skin.stone ? skin.stone[1] : STONE, roof = skin && skin.roof ? skin.roof[1] : (home ? '#d9a93f' : ROOF[ownerKey] || ROOF.neutral);
  g.lineJoin = 'round';
  if (tier === 0) {                                          // Lager: palisade, a wooden hall and a tent
    K.shadow(24, 13);
    K.poly([K.P(-14, -14, 0), K.P(14, -14, 0), K.P(14, 14, 0), K.P(-14, 14, 0)], '#9c8058', .8);
    K.box(-14, 14, -14, -12.8, 0, 6, WOOD, .7); K.box(-14, -12.8, -14, 14, 0, 6, WOOD, .7);         // back palisade
    K.sq(-4, -3, 6, 0, 9, '#a57b4f'); const ap = K.pyramid(-4, -3, 6.6, 9, 8, roof);
    K.sq(6.5, 5, 4, 0, .6, '#9c8058', .5); K.pyramid(6.5, 5, 4.2, .6, 9, own ? shade(own, 1.35) : '#d9ccb0');
    K.box(-14, 14, 12.8, 14, 0, 6, WOOD, .7); K.box(12.8, 14, -14, 14, 0, 6, WOOD, .7);              // front palisade
    K.flag(ap[0], ap[1], own || (home ? '#d9a93f' : null));
    return;
  }
  if (tier === 1) {                                          // Rundturm
    K.shadow(15, 8);
    K.sq(0, 0, 7.5, 0, 2, '#b3aa96');
    K.cyl(0, 0, 5, 2, 22, stone);
    K.cyl(0, 0, 5.8, 22, 24.5, stone, .9);
    if (detail) { K.faceWindow(3.2, 3.2, 12, 3.4); K.faceWindow(4.2, 1.2, 18, 2.6); }
    const [ax, ay] = K.cone(0, 0, 6.2, 24.5, 11, roof);
    K.flag(ax, ay, own || (home ? '#d9a93f' : null));
    return;
  }
  if (tier === 2) {                                          // Bergfried: square keep with battlements and a side building
    K.shadow(19, 10);
    K.sq(0, 0, 11, 0, 2, '#b3aa96');
    K.sq(-3, -3, 5.5, 2, 28, stone);
    if (detail) K.merlons(-8.5, 2.5, -8.5, 2.5, 28, stone, 3);
    const ap = K.pyramid(-3, -3, 5, 28, 10, roof);
    K.box(1, 9, -1, 7, 2, 11, stone); K.pyramid(5, 3, 4, 11, 5, roof);
    if (detail) { K.faceWindow(-3, 2.5, 16, 3.5); K.faceWindow(2.5, -3, 20, 3.5); K.faceWindow(5, 7, 5.5, 3); }
    K.flag(ap[0], ap[1], own || (home ? '#d9a93f' : null));
    return;
  }
  // tier 3 Burg / tier 4 Zitadelle: walls with round corner towers around a keep
  const a = tier === 4 ? 13.5 : 12, wh = tier === 4 ? 10 : 8, t = 1.6, tr = tier === 4 ? 3.1 : 2.7, th = wh + (tier === 4 ? 7 : 5);
  const ka = tier === 4 ? 5 : 4.3, kh = tier === 4 ? 32 : 24;
  K.shadow(a * 1.75, a * .95);
  const tower = (x, y) => { K.cyl(x, y, tr, 0, th, stone, .9); const [cx, cy] = K.cone(x, y, tr + .5, th, 6.5, roof); if (tier === 4) K.flag(cx, cy, own); };
  tower(-a, -a); tower(a, -a); tower(-a, a);
  K.box(-a, a, -a, -a + t, 0, wh, stone, .9); K.box(-a, -a + t, -a, a, 0, wh, stone, .9);            // back walls
  if (tier === 4) { K.cyl(4.5, -5, 2.4, 0, kh - 8, stone, .8); K.cone(4.5, -5, 2.9, kh - 8, 6, roof); }
  K.sq(-1, -1, ka, 0, kh, stone);
  if (detail) K.merlons(-1 - ka, -1 + ka, -1 - ka, -1 + ka, kh, stone, 3);
  const ap = K.pyramid(-1, -1, ka - .3, kh, 9, roof);
  if (detail) { K.faceWindow(-1, -1 + ka, kh * .55, 3.5); K.faceWindow(-1 + ka, -1, kh * .7, 3.5); }
  K.flag(ap[0], ap[1], own || (home ? '#d9a93f' : null), true);
  K.box(-a, a, a - t, a, 0, wh, stone, .9); K.box(a - t, a, -a, a, 0, wh, stone, .9);              // front walls
  if (detail) { K.merlons(-a, a, a - t, a, wh, stone, 6); K.merlons(a - t, a, -a, a, wh, stone, 6); }
  const [gx, gy] = K.P(0, a, 0); g.fillStyle = '#2b2520'; g.beginPath(); g.moveTo(gx - 2.4, gy + 1.2); g.lineTo(gx - 2.4, gy - 4); g.arc(gx, gy - 4, 2.4, Math.PI, 0); g.lineTo(gx + 2.4, gy - 1.2); g.closePath(); g.fill();   // gate in the front wall
  tower(a, a);
}

function paintTemple(g, ownerKey, detail) {                   // Tempel: square stepped platform, colonnade on all sides, pyramid roof with a gold tip
  const K = isoKit(g, ISO_OY), own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;
  g.lineJoin = 'round'; K.shadow(24, 13);
  K.sq(0, 0, 14, 0, 2.5, '#e6dfcf'); K.sq(0, 0, 11.5, 2.5, 5, '#ece6d7');
  const cols = [], A = 8.5;
  for (let i = 0; i < 4; i++) { const v = -A + i * (2 * A / 3); cols.push([v, -A], [v, A], [-A, v], [A, v]); }
  const uniq = [...new Map(cols.map(c => [c.join(','), c])).values()];
  const col = c => K.cyl(c[0], c[1], .9, 5, 15, '#f4efe3', .6);
  uniq.filter(c => c[0] + c[1] < 0).forEach(col);
  K.sq(0, 0, 5.8, 5, 15, '#5d544a', .8);
  if (own) { const [dx, dy] = K.P(0, 5.8, 5); g.fillStyle = own; g.fillRect(dx - 1.4, dy - 8, 2.8, 6.5); }
  uniq.filter(c => c[0] + c[1] >= 0).forEach(col);
  K.sq(0, 0, 10, 15, 17.5, '#efe9dc');
  const ap = K.pyramid(0, 0, 10, 17.5, 9, '#c9a24f');
  g.beginPath(); g.arc(ap[0], ap[1] - 1.5, 1.6, 0, Math.PI * 2); g.fillStyle = '#f3d98a'; g.fill(); g.lineWidth = .7; g.strokeStyle = K.ink; g.stroke();
  if (own) K.flag(ap[0], ap[1] - 3, own, true);
}

function paintGuardianTemple(g, ownerKey, detail) {           // Wächter-Tempel: platform, round hall with a steel-blue dome, an obelisk on every corner
  const K = isoKit(g, ISO_OY), own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;
  g.lineJoin = 'round'; K.shadow(26, 14);
  K.sq(0, 0, 15, 0, 2.6, '#dcd6ca'); K.sq(0, 0, 12.5, 2.6, 5.2, '#e3ddd1');
  const ob = (x, y) => { K.sq(x, y, 1.4, 5.2, 18, '#e8e2d6', .7); K.pyramid(x, y, 1.4, 18, 3.5, '#9fb6d3'); };
  ob(-11, -11); ob(11, -11); ob(-11, 11);
  const R = 7.2, cols = [];
  for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2 + .3; cols.push([Math.cos(t) * R, Math.sin(t) * R]); }
  const col = c => K.cyl(c[0], c[1], .85, 5.2, 15, '#f1ede4', .6);
  cols.filter(c => c[0] + c[1] < 0).forEach(col);
  K.cyl(0, 0, 5.3, 5.2, 15, '#4f5663', .8, true);
  if (own) { const [dx, dy] = K.P(3.6, 3.6, 5.2); g.fillStyle = own; g.fillRect(dx - 1.3, dy - 7.5, 2.6, 6); }
  cols.filter(c => c[0] + c[1] >= 0).forEach(col);
  K.cyl(0, 0, 8.4, 15, 17, '#ece7dd', .9);
  const [dx, dt] = K.dome(0, 0, 6.6, 17, 11, '#7f9fc6');
  g.beginPath(); g.moveTo(dx, dt); g.lineTo(dx, dt - 6); g.lineWidth = 1.2; g.strokeStyle = K.ink; g.stroke();
  g.fillStyle = '#e6edf6'; g.beginPath(); g.moveTo(dx, dt - 9.5); g.lineTo(dx + 2, dt - 6); g.lineTo(dx - 2, dt - 6); g.closePath(); g.fill(); g.lineWidth = .7; g.stroke();
  if (own) { g.fillStyle = own; g.beginPath(); g.moveTo(dx, dt - 5.5); g.lineTo(dx + 6, dt - 4); g.lineTo(dx, dt - 2.5); g.closePath(); g.fill(); g.lineWidth = .6; g.stroke(); }
  ob(11, 11);
}

function paintGateIso(g, ownerKey, detail, open) {                  // Tor: a square gate tower with an arch through it on both sides we see, two round turrets
  const K = isoKit(g, ISO_OY), own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;
  g.lineJoin = 'round'; K.shadow(20, 11);
  const a = 8.5, h = 17;
  K.cyl(-a, -a, 3, 0, h + 5, STONE, .9); K.cone(-a, -a, 3.5, h + 5, 6, '#6f6b64');
  K.sq(0, 0, a, 0, h, '#c9c3b6');
  if (detail) K.merlons(-a, a, -a, a, h, '#c9c3b6', 4);
  for (const f of [[0, a], [a, 0]]) {                          // arches on the two faces we see, with a portcullis
    const [x, y] = K.P(f[0], f[1], 0);
    g.save(); g.transform(1, f[0] ? -.577 : .577, 0, 1, x, y);                          // lie flat on that face
    g.fillStyle = open ? '#6f5438' : '#1d1915'; g.beginPath(); g.moveTo(-3.2, 0); g.lineTo(-3.2, -7); g.arc(0, -7, 3.2, Math.PI, 0); g.lineTo(3.2, 0); g.closePath(); g.fill();
    const lift = open ? 7 : 0;                                   // an open gate has its portcullis pulled up
    if (detail) { g.save(); g.beginPath(); g.moveTo(-3.2, 0); g.lineTo(-3.2, -7); g.arc(0, -7, 3.2, Math.PI, 0); g.lineTo(3.2, 0); g.closePath(); g.clip();
      g.strokeStyle = '#6a5642'; g.lineWidth = .7; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 1.2, -10.5 - lift); g.lineTo(i * 1.2, -lift); } g.moveTo(-3.2, -4 - lift); g.lineTo(3.2, -4 - lift); g.stroke(); g.restore(); }
    g.restore();
  }
  K.cyl(a, a, 3, 0, h + 5, STONE, .9); const [fx, fy] = K.cone(a, a, 3.5, h + 5, 6, '#6f6b64');
  K.flag(fx, fy, own);
}

function paintMegaTemple(g, ownerKey, detail) {           // Haupttempel in real 3D (isometric): square terrace, round colonnade, drum and gold
  const ink = '#2a241b', own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;  // dome, a tower on every corner - the same from every side
  const OY = ISO_OY, P = (x, y, z) => [(x - y) * .866, (x + y) * .5 - z + OY];
  const ER = 1.2247, EY = .7071;                                                // a ground circle of radius r is an ellipse r*ER × r*EY
  g.lineJoin = 'round'; g.strokeStyle = ink;
  const poly = (pts, fill, lw) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = lw || 1; g.stroke(); };
  const isoBox = (a, z0, z1, top, left, right) => {
    poly([P(-a, a, z1), P(a, a, z1), P(a, a, z0), P(-a, a, z0)], left, 1);      // face towards the lower left
    poly([P(a, -a, z1), P(a, a, z1), P(a, a, z0), P(a, -a, z0)], right, 1);     // face towards the lower right
    poly([P(-a, -a, z1), P(a, -a, z1), P(a, a, z1), P(-a, a, z1)], top, 1);
  };
  const cyl = (cx, cy, r, z0, z1, c1, c2, topFill, lw) => {
    const [x0, y0] = P(cx, cy, z0), [, y1] = P(cx, cy, z1), rx = r * ER, ry = r * EY;
    const gr = g.createLinearGradient(x0 - rx, 0, x0 + rx, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.beginPath(); g.moveTo(x0 - rx, y1); g.lineTo(x0 - rx, y0); g.ellipse(x0, y0, rx, ry, 0, Math.PI, 0, true); g.lineTo(x0 + rx, y1); g.ellipse(x0, y1, rx, ry, 0, 0, Math.PI, true); g.closePath();
    g.fillStyle = gr; g.fill(); g.lineWidth = lw || 1; g.stroke();
    if (topFill) { g.beginPath(); g.ellipse(x0, y1, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = topFill; g.fill(); g.stroke(); }
  };
  const dome = (cx, cy, r, z, h) => {
    const [x0, y0] = P(cx, cy, z), rx = r * ER, ry = r * EY, top = y0 - h;
    g.beginPath(); g.moveTo(x0 - rx, y0); g.bezierCurveTo(x0 - rx, top + h * .25, x0 - rx * .45, top, x0, top); g.bezierCurveTo(x0 + rx * .45, top, x0 + rx, top + h * .25, x0 + rx, y0);
    g.ellipse(x0, y0, rx, ry, 0, 0, Math.PI, false); g.closePath();
    const gr = g.createRadialGradient(x0 - rx * .35, top + h * .35, r * .2, x0, y0 - h * .3, rx * 1.3); gr.addColorStop(0, '#fff1bf'); gr.addColorStop(.45, '#dcae4e'); gr.addColorStop(1, '#7d5618');
    g.fillStyle = gr; g.fill(); g.lineWidth = 1.2; g.stroke();
    return [x0, top];
  };
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, OY + 2, 31, 17.5, 0, 0, Math.PI * 2); g.fill();
  // three-step terrace
  isoBox(17, 0, 2.6, '#e6dfcf', '#c9c0ab', '#a79e89');
  isoBox(14.6, 2.6, 5.2, '#ece6d7', '#cfc6b1', '#aaa18c');
  isoBox(12.2, 5.2, 7.8, '#f2ecdf', '#d4cbb6', '#ada48f');
  // a stair in the middle of every side (the two facing us are visible)
  for (const side of [0, 1]) {
    for (let k = 0; k < 3; k++) {
      const d = 17 - k * 2.4, w = 3.4, z0 = k * 2.6, z1 = z0 + 2.6, q = (u, v, z) => side ? P(u, v, z) : P(v, u, z);
      poly([q(-w, d, z1), q(w, d, z1), q(w, d, z0), q(-w, d, z0)], side ? '#d9d1bd' : '#b2a994', .7);           // riser
      poly([q(-w, d - 2.4, z1), q(w, d - 2.4, z1), q(w, d, z1), q(-w, d, z1)], '#f7f2e6', .7);                  // tread
    }
  }
  // corner towers (back first) and the temple in the middle, sorted back to front
  const tower = (x, y) => {
    cyl(x, y, 2.5, 2.6, 15, '#f1ebdd', '#a39a84', '#ddd4c0', .9);
    const [tx, ty] = P(x, y, 15);
    for (let i = -1; i <= 1; i++) { g.fillStyle = '#3a342c'; g.fillRect(tx + i * 1.6 - .5, ty + 4, 1, 2.6); }
    const [px, pt] = dome(x, y, 2.7, 15, 4.5);
    g.beginPath(); g.moveTo(px, pt); g.lineTo(px, pt - 7); g.lineWidth = .9; g.stroke();
    if (own) { g.fillStyle = own; g.beginPath(); g.moveTo(px, pt - 7); g.lineTo(px + 5, pt - 5.6); g.lineTo(px, pt - 4.2); g.closePath(); g.fill(); g.lineWidth = .6; g.stroke(); }
  };
  const temple = () => {
    const R = 8.6, N = 12, cols = [];
    for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2 + Math.PI / 12; cols.push([Math.cos(t) * R, Math.sin(t) * R]); }
    cyl(0, 0, 10, 7.8, 9, '#ece6d7', '#aaa18c', '#f4efe3', .9);                                   // stylobate
    const col = c => cyl(c[0], c[1], .95, 9, 19.5, '#fbf7ee', '#b3aa94', null, .7);
    cols.filter(c => c[0] + c[1] < 0).forEach(col);                                                 // back columns
    cyl(0, 0, 6.4, 9, 19.5, '#6a6053', '#3a332b', null, .9);                                       // dark cella
    if (own) { const [dx, dy] = P(4.5, 4.5, 9); g.fillStyle = own; g.fillRect(dx - 1.6, dy - 8.5, 3.2, 7); }
    cols.filter(c => c[0] + c[1] >= 0).forEach(col);                                                // front columns
    cyl(0, 0, 10, 19.5, 22, '#f4efe3', '#a8a089', '#e9e2d2', 1);                                  // entablature ring
    if (detail) { const [ex, ey] = P(0, 0, 20.7); g.strokeStyle = 'rgba(60,50,35,.35)'; g.lineWidth = .7; g.beginPath(); g.ellipse(ex, ey, 10 * ER - .5, 10 * EY - .3, 0, .15, Math.PI - .15); g.stroke(); g.strokeStyle = ink; }
    cyl(0, 0, 6.8, 22, 27, '#f1ebdd', '#9f967f', null, 1);                                         // drum
    const [wx, wy] = P(0, 0, 22);
    g.fillStyle = '#2f2922'; for (const f of [-.62, -.2, .2, .62]) { const x = wx + f * 6.8 * ER; g.beginPath(); g.moveTo(x - .9, wy + (1 - f * f) * 4.8 - 1.6); g.lineTo(x - .9, wy - 1.8); g.arc(x, wy - 1.8, .9, Math.PI, 0); g.lineTo(x + .9, wy + (1 - f * f) * 4.8 - 1.6); g.closePath(); g.fill(); }
    const [dx, dt] = dome(0, 0, 7.3, 27, 11.5);
    if (detail) { g.strokeStyle = 'rgba(110,70,15,.5)'; g.lineWidth = .7; g.beginPath(); const [cx, cy] = P(0, 0, 27);
      for (const f of [-.6, -.25, .25, .6]) { g.moveTo(cx + f * 7.3 * ER, cy + Math.sqrt(1 - f * f) * 7.3 * EY - .3); g.quadraticCurveTo(cx + f * 7.3 * ER * .8, dt + 3, dx, dt + .3); } g.stroke(); g.strokeStyle = ink; }
    cyl(0, 0, 1.5, 27 + 11.2, 27 + 14, '#fbe7a2', '#9a6d24', '#f3d98a', .8);                        // lantern
    const [lx, ly] = P(0, 0, 27 + 14); g.beginPath(); g.moveTo(lx, ly - 5); g.lineTo(lx + 1.3, ly); g.lineTo(lx - 1.3, ly); g.closePath(); g.fillStyle = '#f3d98a'; g.fill(); g.lineWidth = .7; g.stroke();
  };
  const T = 15.2, parts = [[-T, -T, () => tower(-T, -T)], [T, -T, () => tower(T, -T)], [-T, T, () => tower(-T, T)], [0, 0, temple], [T, T, () => tower(T, T)]];
  parts.sort((u, v) => (u[0] + u[1]) - (v[0] + v[1])).forEach(p => p[2]());
}


// Sprite cache: key = kind|owner|home|half-octave size bucket|dpr. Sprite box covers x −31…31, y −48…24
const BUILDING_SPRITES = new Map();
function buildingSprite(kind, ownerKey, home, sizePx, tier) {
  const bucket = Math.pow(2, Math.round(Math.log2(sizePx) * 2) / 2), skin = home && ownerKey === 'player' ? activeSkin() : null;
  const key = kind + '|' + ownerKey + '|' + (home ? 1 : 0) + '|' + bucket + '|' + dpr + '|' + (tier || 0) + '|' + (skin ? skin.id : '');
  let s = BUILDING_SPRITES.get(key); if (s) return s;
  const u = bucket / 64, c = document.createElement('canvas');
  c.width = Math.ceil(62 * u * dpr) + 2; c.height = Math.ceil(72 * u * dpr) + 2;
  const g = c.getContext('2d'); g.setTransform(u * dpr, 0, 0, u * dpr, 31 * u * dpr + 1, 48 * u * dpr + 1); g.lineJoin = 'round';
  const detail = bucket >= 28;
  if (kind === 'tower') paintTowerTier(g, ownerKey, detail, home, tier ?? 1, skin); else if (kind === 'temple') paintTemple(g, ownerKey, detail); else if (kind === 'guardian') paintGuardianTemple(g, ownerKey, detail);
  else if (kind === 'gate' || kind === 'gateShut') paintGateIso(g, ownerKey, detail, kind === 'gate'); else paintMegaTemple(g, ownerKey, detail);
  BUILDING_SPRITES.set(key, s = { c, bucket }); return s;
}
function drawBuilding(island, ownerKey, z) {                                   // screen space (setScreen active)
  const kind = island.type === 'megaTemple' ? 'mega' : island.guardian ? 'guardian' : island.type === 'temple' ? 'temple' : 'tower';
  const home = island.id === playerIslandId, cap = home || isCapital(island.id);
  const tier = island.type === 'tower' ? towerTier(baseLevelOf(island)) : 1;
  const size = 2 * island.radius * z * 1.5 * (cap ? 1.3 : 1) * (island.type === 'tower' ? [1.15, 1, 1.05, 1.15, 1.25][tier] : island.type === 'megaTemple' ? 2.3 : 1.2), x = toSX(island.x), y = toSY(island.y);   // 3D sprites fill less of their box: drawn 1.5× larger
  if (island.type === 'gate') {                                                // gates: the gatehouse, an owner pennant on top
    if (size < 8) { ctx.fillStyle = '#b8b2a6'; ctx.fillRect(x - 3, y - 3, 6, 6); return; }
    // the same 3D gate tower on BOTH banks where the bridge lands (open: portcullis up; shut or unowned: down)
    const S = Math.max(16, size * 1.25), open = ownerKey !== 'neutral' && !gateSettings(island).closed;
    const sp = buildingSprite(open ? 'gate' : 'gateShut', ownerKey, false, S, 0), k = S / sp.bucket, u = S / 64;
    const [[x1, y1], [x2, y2]] = island.ends, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const spots = [[x1, y1], [x2, y2]].map(([ex, ey]) => { const l = Math.hypot(ex - mx, ey - my) || 1, off = ISLAND_RADIUS * .55; return [toSX(ex + (ex - mx) / l * off), toSY(ey + (ey - my) / l * off)]; })
      .sort((a, b) => a[1] - b[1]);                                                 // the one further back first
    const bk = bkSprite(island, ownerKey, open, z);
    for (const [gx, gy] of spots) if (!bkDraw(bk, gx, gy)) ctx.drawImage(sp.c, gx - 31 * u - 1 / dpr, gy - (48 + ISO_OY) * u - 1 / dpr, sp.c.width / dpr * k, sp.c.height / dpr * k);
    return;
  }
  if (size < 6) {                                                              // LOD: dot / diamond
    ctx.fillStyle = kind !== 'tower' ? '#d9b566' : ownerKey === 'neutral' ? 'rgba(205,212,224,.55)' : (ownerKey === 'player' ? '#8cc0ff' : '#ff8d82');
    const r = kind !== 'tower' ? 3.5 : ownerKey === 'neutral' ? 1.4 : 2.5;
    ctx.beginPath(); if (kind !== 'tower') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); } else ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); return;
  }
  if (size < 17) {                                                             // LOD: heraldic shield marker (neutral towers at 50 %), cross-fades to the sprite over 12-17 px
    ctx.globalAlpha = (kind === 'tower' && ownerKey === 'neutral' ? .5 : 1) * Math.min(1, (17 - size) / 5);
    const s = size / 2; ctx.beginPath(); ctx.moveTo(x - s, y - s * .9); ctx.lineTo(x + s, y - s * .9); ctx.lineTo(x + s, y);
    ctx.quadraticCurveTo(x + s, y + s * .8, x, y + s * 1.1); ctx.quadraticCurveTo(x - s, y + s * .8, x - s, y); ctx.closePath();
    ctx.fillStyle = kind !== 'tower' ? '#d9b566' : BAND[ownerKey]; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,10,12,.85)'; ctx.stroke();
    ctx.globalAlpha = 1; if (size < 12) return;
  }
  const sp = buildingSprite(kind, ownerKey, home, size, tier), k = size / sp.bucket, u = size / 64;   // ≥12px: silhouette (<28) or full sprite
  if (ownerKey !== 'neutral' && size < 20) {                                   // owner band under the small sprite, fading out by 20 px
    ctx.globalAlpha = Math.min(1, (20 - size) / 5); rr(ctx, x - 22 * u, y + 21 * u, 44 * u, Math.max(2, 5 * u), 1); ctx.fillStyle = BAND[ownerKey]; ctx.fill(); }
  ctx.globalAlpha = Math.min(1, (size - 12) / 5);
  if (!bkDraw(bkSprite(island, ownerKey, false, z), x, y + ISO_OY * u)) ctx.drawImage(sp.c, x - 31 * u - 1 / dpr, y - 48 * u - 1 / dpr, sp.c.width / dpr * k, sp.c.height / dpr * k);
  ctx.globalAlpha = 1;
}

// ===== BAUKUNST: the bases in 3D (baukunst.js), each model rendered once into a sprite (OW.game, lazy + cached) =====
// Until a sprite is ready, and without three.js or WebGL (offline), the drawn sprites above stay. Owner colour only on roofs
// and flags, every owner builds in their own style with their coat of arms on the flags; the level shows in the material.
const BAUSTILE = { klassisch: 'Klassisch', nordisch: 'Nordisch', suedlich: 'Südländisch', morgenland: 'Morgenland', fernost: 'Fernost' };
const BK_K = ISLAND_RADIUS * .12, BK_SCALE = { mega: 2.2, tempel: 1.6, waechter: 1.6 }, BK_ELEM = ['nebel', 'gezeiten', 'fels', 'sonne'], BK_GRADE = { throne: 'thron', guardian: 'waechter' };
function loadBaustil() { let v; try { v = JSON.parse(store.get('openWaterBaustil')); } catch (e) {} v = Object.assign({ style: 'klassisch', cap: 'huegel' }, v || {}); if (!BAUSTILE[v.style]) v.style = 'klassisch'; if (v.cap !== 'wasser') v.cap = 'huegel'; if (!Array.isArray(v.own)) v.own = [...new Set(['klassisch', v.style])]; return v; }   // own: the Basis-Skins you have (the style picked before stays yours)
let baustilMem = null;                                                          // [raw, value]: the map asks for every base in every frame - parse only when it changed
function baustilOf(owner) { if (owner !== 'player') return owner ? botBaustil(owner) : null; const raw = store.get('openWaterBaustil'); if (!baustilMem || baustilMem[0] !== raw) baustilMem = [raw, loadBaustil()]; return baustilMem[1]; }   // (read only: the sheet changes loadBaustil()'s own copy)
function bk3d() { const G = window.OW && OW.game; if (!G || G.off) return null; if (!G.onReady) G.onReady = () => { BK_PREVIEW.forEach(f => f()); requestRender(); }; return G; }
const BK_PREVIEW = new Set();                                                  // open previews that wait for a sprite
let bkGuards = null;
function bkModel(island, ownerKey, open, style) {                                // → [cache id, model config]; style: try another one (keep sheet)
  if (island.type === 'gate') { const gr = BK_GRADE[island.gateKind] || 'grenz'; return ['t|' + ownerKey + '|' + gr + '|' + (open ? 1 : 0), { model: 'tor', owner: ownerKey, variant: { grade: gr, open, houseOnly: true } }]; }
  if (island.type === 'megaTemple') return ['m|' + ownerKey, { model: 'mega', owner: ownerKey }];
  const o = islandOwnerOf(island.id);
  if (island.guardian) { bkGuards = bkGuards || islands.filter(i => i.guardian).map(i => i.id); const el = BK_ELEM[Math.max(0, bkGuards.indexOf(island.id)) % 4];
    return ['w|' + ownerKey + '|' + el, { model: 'waechter', owner: ownerKey, variant: { element: el } }]; }
  if (island.type === 'temple') { const held = templeHoldSince[island.id] ? Date.now() - templeHoldSince[island.id] : -1, sz = !o ? 'klein' : held >= TEMPLE_HOLD_STREAK_MS ? 'gross' : 'mittel';   // the longer it is held, the bigger
    return ['p|' + ownerKey + '|' + sz, { model: 'tempel', owner: ownerKey, variant: { size: sz, bonus: 'gems' } }]; }
  const lv = baseLevelOf(island), step = lv >= 100 ? 100 : Math.max(1, Math.floor(lv / 10) * 10 + (lv % 10 >= 5 ? 5 : 0));   // a new design every 10 levels, small additions at every 5
  const home = island.id === playerIslandId, cap = home || isCapital(island.id), b0 = baustilOf(o) || { style: Object.keys(BAUSTILE)[island.landmassId % 5], cap: 'huegel' }, bs = style ? { style, cap: b0.cap } : b0;   // free land: the style of its region
  const seed = o === 'player' ? 7 : o ? (parseInt(String(o).replace(/\D/g, ''), 10) || 7) * 13 + 5 : 1 + island.id % 4, cr = o ? crestFor(o) : null;
  const crest = cr ? { div: cr.div, t: [1, 0, 2][cr.ink] || 0 } : null, skin = home ? (activeSkin() || {}).id || '' : '';
  return ['b|' + step + '|' + ownerKey + '|' + (cap ? bs.cap : '') + '|' + bs.style + '|' + seed + '|' + (crest ? crest.div + '.' + crest.t : '') + '|' + skin,
          { model: 'basis', level: step, owner: ownerKey, capital: cap, capStyle: bs.cap, style: bs.style, seed, crest, skin }];
}
const BK_LAST = new Map();                                                       // island → id of the 3D sprite drawn last
function bkSprite(island, ownerKey, open, z) {                                   // → { s: sprite, W: width in px } or null
  const G = bk3d(); if (!G) return null;
  const [id, c] = bkModel(island, ownerKey, open), k = BK_K * z * (BK_SCALE[c.model] || 1), need = 2 * G.frameOf(c).v * k * dpr;
  let s = G.get(id, c, need <= 140 ? 128 : need <= 300 ? 256 : 512);
  if (s) BK_LAST.set(island.id, id); else { const o = BK_LAST.get(island.id); s = o && G.peek(o) || null; }   // new look (upgrade, +5 step) still rendering: the old 3D sprite stays, not the big drawn one
  return s ? { s, W: 2 * s.v * k } : null;                                     // W from the sprite's own frame: an old sprite keeps its size
}
function bkPreviews() {                                                          // the keep sheet's style cards: your capital in each style
  const cvs = [...document.querySelectorAll('[data-bk-prev]')]; if (!cvs.length) { BK_PREVIEW.delete(bkPreviews); return; }
  const G = bk3d(), isl = islandById[playerIslandId]; let waiting = false;
  for (const cv of cvs) { const g = cv.getContext('2d'), [id, c] = bkModel(isl, 'player', false, cv.dataset.bkPrev), s = G && G.get(id, c, 256); g.clearRect(0, 0, cv.width, cv.height);
    if (s) { const w = s.px * .6; g.drawImage(s.c, (s.px - w) / 2, Math.max(0, s.px * s.ay - w * .82), w, w, (cv.width - cv.height) / 2, 0, cv.height, cv.height); }   // cut out the building
    else { waiting = !!G; g.save(); g.setTransform(1.6, 0, 0, 1.6, cv.width / 2, cv.height * .72); paintTowerTier(g, 'player', true, true, towerTier(islandLevels[playerIslandId] || 1), activeSkin()); g.restore(); } }
  if (waiting) BK_PREVIEW.add(bkPreviews); else BK_PREVIEW.delete(bkPreviews);
}
function bkDraw(b, x, y) { if (!b) return false; ctx.drawImage(b.s.c, x - b.W / 2, y - b.W * b.s.ay, b.W, b.W); return true; }   // (x, y) = the ground centre

function bannerModel(island) {
  const owner = islandOwnerOf(island.id), isTemple = island.type === 'temple' || island.type === 'megaTemple';
  const scouted = scoutedIslands.has(island.id), level = islandLevels[island.id] || 1;
  const tName = island.type === 'megaTemple' ? 'Mega-Tempel' : island.guardian ? 'Wächter-Tempel' : 'Tempel';
  const boss = bossAt(island.id);
  if (boss) return { kind: 'bot', glyph: 'attack', name: boss.name, troops: fmtCompact(boss.troops), def: null, level, temple: false, p: 4.8 };
  const tag = owner && typeof bundTagVon === 'function' ? bundTagVon(owner) : '', vorn = tag ? '[' + tag + '] ' : '';   // Bündnis-Kürzel vor dem Namen
  if (owner === 'player') return { kind: 'player', glyph: isTemple ? 'temple' : island.type === 'gate' ? 'lock' : island.id === playerIslandId ? 'castle' : 'crest:player:' + crestKey(),
                                   name: island.id === playerIslandId ? 'Hauptstadt' : vorn + (profileName.value || 'Du'),
                                   troops: fmtCompact(islandTroops[island.id] || 0), def: null, level, temple: isTemple, p: 4 };
  if (owner) return { kind: bundFreund('player', owner) ? 'ally' : 'bot', glyph: isTemple ? 'temple' : botCapitalOf(owner) === island.id ? 'castle' : 'crest:' + owner, name: vorn + botById[owner].name,
                      troops: scouted ? fmtCompact(islandTroops[island.id] || 0) : '?', def: null, level, temple: isTemple, p: 3 };
  if (island.type === 'gate') return { kind: 'neutral', glyph: 'lock', name: island.gateKind === 'throne' ? 'Thron-Tor' : island.gateKind === 'guardian' ? 'Wächter-Tor' : 'Grenztor',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null, level, temple: false, p: 2.5 };
  return { kind: 'neutral', glyph: isTemple ? 'temple' : 'question', name: isTemple ? tName : 'Neutral',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null,
           level, temple: isTemple, mega: island.type === 'megaTemple', p: isTemple ? 2 : 0, filler: !isTemple };
}

const TIER = { A: { H: 30, av: 32, fn: 11.5, fs: 10.5, pad: 8, lv: 15, max: 15 },
               B: { H: 24, av: 26, fn: 10.5, fs: 10,   pad: 7, lv: 13, max: 11 },
               C: { H: 20, av: 20, fn: 9,    fs: 8.5,  pad: 5, lv: 11, max: 8 } };
const PLATE = { player: { top: '#2b5d9b', bot: '#183a66', line: 'rgba(140,192,255,.7)',  hi: '#8cc0ff' },
                bot:    { top: '#8e2b24', bot: '#5a1814', line: 'rgba(255,141,130,.62)', hi: '#ff8d82' },
                neutral:{ top: '#474a51', bot: '#2f3136', line: 'rgba(198,201,207,.42)', hi: '#c6c9cf' },
                ally:   { top: '#2c7a4b', bot: '#17472b', line: 'rgba(140,230,170,.62)', hi: '#8ce6aa' } };   // Bündnis-Mitglieder: grün
const trunc = (s, n) => s.length <= n ? s : s.slice(0, n - 1) + '…';
// ===== WAPPEN: the player's coat of arms (profile, HUD, own nameplates, battle banner) =====
var CREST_COLORS = ['#2c4a70', '#8e2a24', '#2f5a2f', '#1d1d24', '#d4a93c', '#ece6d6', '#5b2c6f'];
var CREST_SHAPES = ['heater', 'round', 'kite'], CREST_DIVS = ['plain', 'pale', 'fess', 'quarterly', 'bend', 'chevron'];
var CREST_SYMBOLS = ['none', 'star', 'attack', 'castle', 'temple', 'flag', 'crown'], CREST_INK = ['#e8c547', '#f5f0e5', '#16161c'];
var crestState = null;
function loadCrest() {
    if (crestState) return crestState;
    try { crestState = JSON.parse(store.get('openWaterCrest')) || null; } catch (e) { crestState = null; }
    return crestState = Object.assign({ shape: 0, div: 3, c1: 0, c2: 4, sym: 2, ink: 1 }, crestState || {});
}
function crestKey() { const c = loadCrest(); return [c.shape, c.div, c.c1, c.c2, c.sym, c.ink].join('.'); }
function crestPath(g, x, y, s, shape) {             // (x, y) = centre, s = height
    const w = s * .82, t = y - s / 2, b = y + s / 2; g.beginPath();
    if (shape === 'round') { g.moveTo(x - w / 2, t); g.lineTo(x + w / 2, t); g.lineTo(x + w / 2, y); g.arc(x, y, w / 2, 0, Math.PI); g.closePath(); }
    else if (shape === 'kite') { g.moveTo(x, t); g.quadraticCurveTo(x + w / 2, t, x + w / 2, t + s * .28); g.quadraticCurveTo(x + w * .4, y + s * .2, x, b); g.quadraticCurveTo(x - w * .4, y + s * .2, x - w / 2, t + s * .28); g.quadraticCurveTo(x - w / 2, t, x, t); g.closePath(); }
    else { g.moveTo(x - w / 2, t); g.lineTo(x + w / 2, t); g.lineTo(x + w / 2, y - s * .05); g.quadraticCurveTo(x + w / 2, y + s * .32, x, b); g.quadraticCurveTo(x - w / 2, y + s * .32, x - w / 2, y - s * .05); g.closePath(); }
}
function drawCrest(g, x, y, s, c) {
    c = c || loadCrest(); const shape = CREST_SHAPES[c.shape], div = CREST_DIVS[c.div], c1 = CREST_COLORS[c.c1], c2 = CREST_COLORS[c.c2];
    g.save(); crestPath(g, x, y, s, shape); g.fillStyle = c1; g.fill(); g.clip();
    const w = s * .82, L = x - w / 2, T0 = y - s / 2; g.fillStyle = c2; g.beginPath();
    if (div === 'pale') g.rect(x, T0, w / 2, s);
    else if (div === 'fess') g.rect(L, y - s * .04, w, s);
    else if (div === 'quarterly') { g.rect(x, T0, w / 2, s / 2 - s * .04); g.rect(L, y - s * .04, w / 2, s); }
    else if (div === 'bend') { g.moveTo(L, T0); g.lineTo(L + w, T0 + s); g.lineTo(L, T0 + s); g.closePath(); }
    else if (div === 'chevron') { g.moveTo(L, y + s * .3); g.lineTo(x, y - s * .12); g.lineTo(L + w, y + s * .3); g.lineTo(L + w, y + s * .55); g.lineTo(x, y + s * .12); g.lineTo(L, y + s * .55); g.closePath(); }
    if (div !== 'plain') g.fill();
    const hl = g.createLinearGradient(L, T0, L + w, T0 + s); hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(.5, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = hl; g.fillRect(L, T0, w, s);
    g.restore();
    const sym = CREST_SYMBOLS[c.sym], ink = CREST_INK[c.ink];
    if (sym === 'crown') { const cw = s * .42; g.save(); g.translate(x, y + cw * .3); g.fillStyle = ink; g.beginPath(); g.moveTo(-cw / 2, 0); g.lineTo(-cw / 2, -cw * .34); g.lineTo(-cw / 4, -cw * .16); g.lineTo(0, -cw * .62); g.lineTo(cw / 4, -cw * .16); g.lineTo(cw / 2, -cw * .34); g.lineTo(cw / 2, 0); g.closePath(); g.fill(); g.lineWidth = Math.max(.8, s * .025); g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke(); g.restore(); }
    else if (sym !== 'none') drawGlyph(g, sym, x, y - s * .02, s * .5, ink);
    crestPath(g, x, y, s, shape); g.lineWidth = Math.max(1, s * .05); g.strokeStyle = '#d8b56c'; g.stroke();
    crestPath(g, x, y, s * 1.04, shape); g.lineWidth = Math.max(.8, s * .025); g.strokeStyle = 'rgba(0,0,0,.7)'; g.stroke();
}
// Everyone has a coat of arms: yours from the editor, every other ruler their own (drawn once from their name,
// following the old rule: gold or silver on a colour, a colour on gold or silver).
const otherCrests = {};
function crestFor(who) {
    if (!who || who === 'player') return loadCrest();
    const pm = window.WELT && WELT.menschen && WELT.menschen[who]; if (pm && pm.profil && pm.profil.crest) return pm.profil.crest;   // echter Spieler: sein Wappen
    if (otherCrests[who]) return otherCrests[who];
    const idn = parseInt(String(who).replace(/\D/g, ''), 10) || 7, r = mulberry32(idn * 6151 + 3);
    const c1 = Math.floor(r() * CREST_COLORS.length), metal1 = c1 === 4 || c1 === 5;
    let c2 = metal1 ? [0, 1, 2, 3, 6][Math.floor(r() * 5)] : [4, 5][Math.floor(r() * 2)];
    const div = Math.floor(r() * CREST_DIVS.length), sym = 1 + Math.floor(r() * (CREST_SYMBOLS.length - 1));
    const ink = div === 0 ? (metal1 ? 2 : Math.floor(r() * 2)) : (metal1 ? 2 : (c2 === 4 ? 1 : 0));
    return otherCrests[who] = { shape: Math.floor(r() * CREST_SHAPES.length), div, c1, c2, sym, ink };
}
function crestKeyOf(c) { return [c.shape, c.div, c.c1, c.c2, c.sym, c.ink].join('.'); }
var crestUrlCache = {};
function crestDataUrl(px, who) {                      // for the HTML avatars (yours by default)
    const cr = crestFor(who), k = (who || 'player') + ':' + crestKeyOf(cr) + '@' + px; if (crestUrlCache[k]) return crestUrlCache[k];
    const c = document.createElement('canvas'), d = 2; c.width = c.height = px * d; const g = c.getContext('2d'); g.scale(d, d);
    drawCrest(g, px / 2, px / 2, px * .86, cr); return crestUrlCache[k] = c.toDataURL();
}
function paintPlate(g, T, m, withDef) {           // g translated so the plate's top-left is (0,0); returns nothing
  const o = PLATE[m.kind], name = trunc(m.name, T.max);
  g.font = '600 ' + T.fn + 'px Inter, system-ui, sans-serif'; const nw = g.measureText(name).width;
  g.font = '600 ' + T.fs + 'px Inter, system-ui, sans-serif';
  const tw = g.measureText(m.troops).width + T.fs * 1.25 + (withDef ? g.measureText(m.def).width + T.fs * 2.4 : 0);
  const W = T.av + 4 + Math.max(nw, tw) + T.pad, H = T.H, px = T.av / 2, pw = W - T.av / 2;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.top); gr.addColorStop(1, o.bot);
  rr(g, px + .5, .5, pw - 1, H - 1, 3); g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = o.line; g.stroke();          // plate
  g.strokeStyle = 'rgba(0,0,0,.55)'; rr(g, px - .5, -.5, pw + 1, H + 1, 3.5); g.stroke();                                          // 0.5px black outer line (no blur)
  g.strokeStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(px + T.av / 2, 1.5); g.lineTo(px + pw - 3, 1.5); g.stroke();    // top highlight
  const tx = T.av + 4; g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.55)'; g.font = '600 ' + T.fn + 'px Inter, system-ui, sans-serif'; g.fillText(name, tx, H * .47 + 1);   // 1px text shadow (no blur)
  g.fillStyle = '#f5f0e5'; g.fillText(name, tx, H * .47);
  g.font = '600 ' + T.fs + 'px Inter, system-ui, sans-serif'; const ly = H * .86;
  drawGlyph(g, 'troops', tx + T.fs * .5, ly - T.fs * .36, T.fs * 1.05, 'rgba(238,230,212,.78)');
  g.fillStyle = m.troops === '?' ? 'rgba(238,230,212,.62)' : '#eee6d4'; g.fillText(m.troops, tx + T.fs * 1.25, ly);
  if (withDef) { const dx = tx + T.fs * 1.25 + g.measureText(m.troops).width + T.fs * .7;
    drawGlyph(g, 'shield', dx + T.fs * .5, ly - T.fs * .36, T.fs * 1.05, 'rgba(238,230,212,.78)');
    g.fillStyle = '#eee6d4'; g.fillText(m.def, dx + T.fs * 1.25, ly); }
  const ax = T.av / 2, ay = H / 2, ar = T.av / 2;                                                                                  // avatar medallion
  const rg = g.createRadialGradient(ax, ay - ar * .35, 1, ax, ay, ar); rg.addColorStop(0, o.top); rg.addColorStop(1, o.bot);
  g.beginPath(); g.arc(ax, ay, ar - .5, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
  g.lineWidth = 1.4; g.strokeStyle = m.temple ? '#e4c886' : o.hi; g.stroke();
  g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(ax, ay, ar + .6, 0, Math.PI * 2); g.stroke();
  if (m.glyph.startsWith('crest')) drawCrest(g, ax - 1, ay - 1, T.av * .62, crestFor(m.glyph.split(':')[1])); else
  drawGlyph(g, m.glyph, ax - 1.5, ay - 1.5, T.av * .52, '#f5f0e5');                                                                // up-left, clear of the chip
  const ls = T.lv, lx = ax + ar * .78, lyy = Math.min(ay + ar * .66, H + 1.5 - ls / 2);                                          // gold level chip on the rim
  rr(g, lx - ls / 2, lyy - ls / 2, ls, ls, 2); g.fillStyle = '#14110b'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#d8b56c'; g.stroke();
  g.fillStyle = '#f0dfb0'; g.font = '700 ' + (ls * .66) + 'px Inter, system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(String(m.level), lx, lyy + ls * .24); g.textAlign = 'left';
}

const MEASURE = document.createElement('canvas').getContext('2d');
const BANNER_SPRITES = new Map();
function flushBannerSprites() { BANNER_SPRITES.clear(); }
function bannerSprite(tierKey, m) {
  const T = TIER[tierKey], withDef = m.def != null && tierKey !== 'C';
  const key = tierKey + '|' + m.kind + '|' + m.glyph + '|' + m.name + '|' + m.troops + '|' + (withDef ? m.def : '') + '|' + m.level + '|' + (m.temple ? 1 : 0) + '|' + dpr;
  let s = BANNER_SPRITES.get(key);
  if (s) { BANNER_SPRITES.delete(key); BANNER_SPRITES.set(key, s); return s; }           // LRU refresh
  const name = trunc(m.name, T.max);
  MEASURE.font = '600 ' + T.fn + 'px Inter, system-ui, sans-serif'; const nw = MEASURE.measureText(name).width;
  MEASURE.font = '600 ' + T.fs + 'px Inter, system-ui, sans-serif';
  const tw = MEASURE.measureText(m.troops).width + T.fs * 1.25 + (withDef ? MEASURE.measureText(m.def).width + T.fs * 2.4 : 0);
  const W = Math.ceil(T.av + 4 + Math.max(nw, tw) + T.pad), H = T.H;
  const c = document.createElement('canvas'); c.width = Math.ceil((W + 4) * dpr); c.height = Math.ceil((H + 4) * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 2 * dpr, 2 * dpr);
  paintPlate(g, T, m, withDef);
  s = { c, w: W, h: H };
  BANNER_SPRITES.set(key, s);
  while (BANNER_SPRITES.size > 400) BANNER_SPRITES.delete(BANNER_SPRITES.keys().next().value);   // (die Truppenzahl steckt im Schlüssel – 1500 hielten bis ~100 MB im Handy)
  return s;
}
const DOWN = { A: 'B', B: 'C', C: 'C' };
function tierFor(z) { return z >= 0.06 ? 'A' : z >= 0.026 ? 'B' : 'C'; }
let bannerHitRects = [];
function overlap(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }

// candidate slots [x shift (in half widths + 0.6 r), y mode (0 below, ±1 below nudged by 0.3 h, 2 above, 3 centred), penalty]
const BANNER_SLOTS = [[0, 0, 0], [0, 1, 12], [0, -1, 12], [0, 2, 40], [1, 3, 60], [-1, 3, 60]];
let towerRects = [];                             // screen boxes of the visible buildings (the countdown chips keep off them)
function layoutBanners(visible, z, selectedId) {  // places every nameplate (sets bannerHitRects) → items for paintBanners()
  bannerHitRects = [];
  const towers = towerRects = visible.map(isl => { const s = 2 * isl.radius * z; return { id: isl.id, x: toSX(isl.x) - s / 2, y: toSY(isl.y) - s * 0.65, w: s, h: s }; });
  if (z < TERRITORY_VIEW_ZOOM) return [];
  const base = tierFor(z);
  const items = visible.map(isl => {
    const m = bannerModel(isl);
    let p = m.p; if (isl.id === selectedId) p = 5;
    let tier = m.filler ? DOWN[base] : base;
    if (m.mega) { if (tier === 'C') tier = 'B'; if (p < 5) p = 4.5; }                  // placed first: temple > player > bot > neutral
    return { isl, m, p, tier };
  }).sort((a, b) => b.p - a.p || a.isl.y - b.isl.y);
  const placed = [];
  for (const it of items) {
    const r = it.isl.radius * z, sx = toSX(it.isl.x), sy = toSY(it.isl.y);
    let best = null;
    for (let t = it.tier; ; t = DOWN[t]) {
      const sp = bannerSprite(t, it.m), w = sp.w, h = sp.h;
      for (const [dx, dy, cost] of BANNER_SLOTS) {                                 // below, nudged, above, beside
        const rect = { x: sx - w / 2 + dx * (w / 2 + 0.6 * r), y: dy === 2 ? sy - 1.32 * r - h : dy === 3 ? sy - h / 2 : sy + 0.95 * r + dy * 0.3 * h, w, h };
        let sc = cost;
        for (const q of placed) sc += overlap(rect, q);
        for (const tw of towers) if (tw.id !== it.isl.id) sc += 0.35 * overlap(rect, tw);
        if (!best || sc < best.sc) best = { sc, rect, sp, t };
      }
      if (best.sc <= 0.25 * best.rect.w * best.rect.h || it.p > 3 || t === 'C') break;
    }
    it.rect = best.rect; it.sp = best.sp; placed.push(best.rect);
  }
  items.reverse();                                                               // painted lowest priority first
  for (const it of items) bannerHitRects.push({ id: it.isl.id, x: it.rect.x, y: it.rect.y, w: it.rect.w, h: it.rect.h });
  return items;
}
function paintBanners(items) {
  setScreen(ctx);
  for (const it of items) {
    ctx.globalAlpha = it.m.filler ? 0.8 : 1;
    const x = Math.round(it.rect.x * dpr) / dpr, y = Math.round(it.rect.y * dpr) / dpr;
    ctx.drawImage(it.sp.c, x - 2, y - 2, it.sp.c.width / dpr, it.sp.c.height / dpr);
  }
  ctx.globalAlpha = 1;
}

function titledCapitals() {                        // capital id → title (only people who hold one)
  const out = new Map(), t = loadTitles();
  for (const x of TITLES) { const who = t.by[x.key]; if (!who) continue; const cap = who === 'player' ? playerIslandId : botCapitalOf(who); if (cap !== null && cap !== undefined) out.set(cap, x); }
  return out;
}
// ---- base effects: nothing by level any more - only titles from the middle: halo, god rays (buff) or cursed purple fire (penalty) ----
function fxCurseFlames(x, y, R, now) {
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + now / 3000, fx = x + Math.cos(a) * R, fy = y + Math.sin(a) * R * .38, fl = .7 + .3 * Math.sin(now / 90 + i * 1.9), h = R * .75 * fl;
    const gr = ctx.createLinearGradient(0, fy - h, 0, fy); gr.addColorStop(0, 'rgba(190,90,255,0)'); gr.addColorStop(.5, 'rgba(150,50,220,.75)'); gr.addColorStop(1, 'rgba(60,10,90,.9)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(fx - R * .13, fy); ctx.quadraticCurveTo(fx - R * .16, fy - h * .5, fx + Math.sin(now / 120 + i) * R * .06, fy - h); ctx.quadraticCurveTo(fx + R * .16, fy - h * .5, fx + R * .13, fy); ctx.closePath(); ctx.fill();
  }
}
// ===== THRONPLATZ: the centre of the world looks the part =====
// a paved round plaza with obelisks, paths and a slowly turning rune circle, fire bowls at the edge;
// a beacon that shows from afar; the ruler's pillar of light and god rays over the Mega-Tempel.
function drawThronePlaza(z, now) {
    if (megaTempleId === undefined || !islandSeen(islandById[megaTempleId])) return;   // (unter dem Nebel nicht)
    const m = islandById[megaTempleId], x = toSX(m.x), y = toSY(m.y), R = Math.max(10, m.radius * z * 3.4);
    if (x < -R * 2 || y < -R * 2 || x > viewW + R * 2 || y > viewH + R * 2) return;
    setScreen(ctx); ctx.save();
    const ruler = rulerOwner(), rc = ruler === 'player' ? '120,180,255' : ruler ? '255,120,100' : '255,214,120';
    if (z < 0.006) {                                      // far out: a golden beacon marks the centre
        const pulse = .6 + .4 * Math.sin(now / 600), gr = ctx.createRadialGradient(x, y, 2, x, y, 40 + 10 * pulse);
        gr.addColorStop(0, 'rgba(' + rc + ',.9)'); gr.addColorStop(.3, 'rgba(' + rc + ',.35)'); gr.addColorStop(1, 'rgba(' + rc + ',0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill(); ctx.restore(); liveAnimation = true; return;
    }
    ctx.translate(x, y); ctx.scale(1, .55);                 // plaza lies flat on the ground
    for (let i = 0; i < 4; i++) {                          // paved roads leading in from the four gates
        ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = '#8f8673'; ctx.fillRect(-R * .09, R * .9, R * .18, R * 1.6);
        ctx.fillStyle = '#b3aa94'; ctx.fillRect(-R * .07, R * .9, R * .14, R * 1.6); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(0, R * .05, R * 1.04, 0, Math.PI * 2); ctx.fill();
    const pv = ctx.createRadialGradient(0, -R * .3, R * .1, 0, 0, R);
    pv.addColorStop(0, '#d8cfb8'); pv.addColorStop(1, '#9d9480');
    ctx.fillStyle = pv; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, R * .03); ctx.strokeStyle = '#5a5244'; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,82,68,.35)'; ctx.lineWidth = 1;
    for (const f of [.35, .55, .75]) { ctx.beginPath(); ctx.arc(0, 0, R * f, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .35, Math.sin(a) * R * .35); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
    ctx.save(); ctx.rotate(now / 9000); ctx.globalCompositeOperation = 'lighter';     // rune circle turning in the paving
    ctx.strokeStyle = 'rgba(' + rc + ',.55)'; ctx.lineWidth = Math.max(1.2, R * .018); ctx.beginPath(); ctx.arc(0, 0, R * .66, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([R * .05, R * .04]); ctx.beginPath(); ctx.arc(0, 0, R * .6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.save(); ctx.translate(Math.cos(a) * R * .63, Math.sin(a) * R * .63); ctx.rotate(a);
        ctx.fillStyle = 'rgba(' + rc + ',.8)'; ctx.beginPath(); ctx.moveTo(0, -R * .025); ctx.lineTo(R * .02, 0); ctx.lineTo(0, R * .025); ctx.lineTo(-R * .02, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.restore();
    if (ruler) {                                            // god rays behind the temple while someone rules
        const r = Math.max(12, m.radius * z * 2.3); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y - r * .5); ctx.rotate(now / 5000);
        for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); const L = r * (3.2 + .6 * Math.sin(now / 500 + i)), gr = ctx.createLinearGradient(0, 0, L, 0);
            gr.addColorStop(0, 'rgba(' + rc + ',.4)'); gr.addColorStop(1, 'rgba(' + rc + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -r * .16); ctx.lineTo(L, r * .16); ctx.closePath(); ctx.fill(); }
        ctx.restore();
    }
    const ob = [];                                          // obelisks and fire bowls around the rim (upright, so not squashed)
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; ob.push({ a, ox: x + Math.cos(a) * R * .92, oy: y + Math.sin(a) * R * .92 * .55, fire: i % 2 === 0 }); }
    ob.sort((p, q) => p.oy - q.oy);
    const H = R * .32;
    for (const o of ob) {
        if (o.fire) {                                       // bronze bowl on a stand, flames
            ctx.fillStyle = '#4a3a26'; ctx.fillRect(o.ox - H * .04, o.oy - H * .5, H * .08, H * .5);
            ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.ellipse(o.ox, o.oy - H * .5, H * .16, H * .06, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const fl = .75 + .25 * Math.sin(now / 90 + o.a * 5), fh = H * .45 * fl, gl = ctx.createRadialGradient(o.ox, o.oy - H * .6, 1, o.ox, o.oy - H * .6, H * .5);
            gl.addColorStop(0, 'rgba(255,180,80,.55)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(o.ox, o.oy - H * .6, H * .5, 0, Math.PI * 2); ctx.fill();
            const fg = ctx.createLinearGradient(0, o.oy - H * .5 - fh, 0, o.oy - H * .5); fg.addColorStop(0, 'rgba(255,230,150,0)'); fg.addColorStop(.5, 'rgba(255,170,60,.9)'); fg.addColorStop(1, 'rgba(230,80,20,.95)');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(o.ox - H * .12, o.oy - H * .5); ctx.quadraticCurveTo(o.ox - H * .14, o.oy - H * .5 - fh * .5, o.ox + Math.sin(now / 110 + o.a) * H * .05, o.oy - H * .5 - fh);
            ctx.quadraticCurveTo(o.ox + H * .14, o.oy - H * .5 - fh * .5, o.ox + H * .12, o.oy - H * .5); ctx.closePath(); ctx.fill(); ctx.restore();
        } else {                                            // obelisk with a gold cap
            const og = ctx.createLinearGradient(o.ox - H * .08, 0, o.ox + H * .08, 0); og.addColorStop(0, '#e2dac6'); og.addColorStop(1, '#8a8270');
            ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(o.ox - H * .08, o.oy); ctx.lineTo(o.ox - H * .055, o.oy - H); ctx.lineTo(o.ox + H * .055, o.oy - H); ctx.lineTo(o.ox + H * .08, o.oy); ctx.closePath(); ctx.fill();
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,34,26,.8)'; ctx.stroke();
            ctx.fillStyle = '#e4c35a'; ctx.beginPath(); ctx.moveTo(o.ox - H * .055, o.oy - H); ctx.lineTo(o.ox, o.oy - H * 1.15); ctx.lineTo(o.ox + H * .055, o.oy - H); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    }
    liveAnimation = true;
}
function drawThroneFx(z, now) {                      // over the Mega-Tempel: a warm glow, and when someone rules: their pillar of light and god rays
    if (megaTempleId === undefined || z < 0.006 || !islandSeen(islandById[megaTempleId])) return;
    const m = islandById[megaTempleId], x = toSX(m.x), y = toSY(m.y), r = Math.max(12, m.radius * z * 2.3);
    if (x < -r * 6 || y < -r * 8 || x > viewW + r * 6 || y > viewH + r * 6) return;
    const ruler = rulerOwner(), rc = ruler === 'player' ? '140,195,255' : ruler ? '255,130,110' : '255,220,140';
    setScreen(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (ruler) {
        const pulse = .8 + .2 * Math.sin(now / 400), ph = r * 9, pw = r * .9;
        const pg = ctx.createLinearGradient(0, y - ph, 0, y); pg.addColorStop(0, 'rgba(' + rc + ',0)'); pg.addColorStop(.6, 'rgba(' + rc + ',' + (.3 * pulse).toFixed(2) + ')'); pg.addColorStop(1, 'rgba(' + rc + ',' + (.12 * pulse).toFixed(2) + ')');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(x - pw / 2, y - r * .9); ctx.lineTo(x - pw * .2, y - ph); ctx.lineTo(x + pw * .2, y - ph); ctx.lineTo(x + pw / 2, y - r * .9); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 12; i++) { const q = ((now / 2200) + i / 12) % 1;       // motes rising in the pillar
            ctx.fillStyle = 'rgba(255,245,210,' + (.9 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.3 + now / 600) * pw * .25, y - r * .4 - q * ph * .8, 1.2 + (1 - q) * 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else {
        const gr = ctx.createRadialGradient(x, y - r * .3, 2, x, y - r * .3, r * 1.6);
        gr.addColorStop(0, 'rgba(' + rc + ',' + (.3 + .1 * Math.sin(now / 700)).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + rc + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - r * .3, r * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); liveAnimation = true;
}
function drawBaseAuras(vis, z, now) {             // under the towers
  if (z < 0.006) return;
  setScreen(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const titled = titledCapitals(); if (!titled.size) { ctx.restore(); return; }
  for (const isl of vis) {
    const t = titled.get(isl.id); if (!t || isl.type !== 'tower') continue;
    const x = toSX(isl.x), y = toSY(isl.y), r = Math.max(20, isl.radius * z * 1.25);
    if (x < -r * 5 || x > viewW + r * 5 || y < -r * 5 || y > viewH + r * 5) continue;
    if (t && t.good) {                             // god rays behind the base
      ctx.save(); ctx.translate(x, y - r * .6); ctx.rotate(now / 3500);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); const L = r * (3.6 + .5 * Math.sin(now / 400 + i)), gr = ctx.createLinearGradient(0, 0, L, 0);
        gr.addColorStop(0, 'rgba(255,236,160,.7)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -r * .28); ctx.lineTo(L, r * .28); ctx.closePath(); ctx.fill(); }
      ctx.restore(); liveAnimation = true;
    } else if (t) {                                 // cursed: a dark vortex on the ground
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y + r * .3); ctx.scale(1, .38); ctx.rotate(-now / 900);
      const gr = ctx.createRadialGradient(0, 0, r * .2, 0, 0, r * 2.2); gr.addColorStop(0, 'rgba(40,0,60,.75)'); gr.addColorStop(1, 'rgba(40,0,60,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(170,80,255,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (1 + i * .45), i, i + 4); ctx.stroke(); }
      ctx.restore(); liveAnimation = true;
    }
  }
  ctx.restore();
}
function drawBaseSparks(vis, z, now) {            // over the towers
  if (z < 0.006) return;
  setScreen(ctx); const shOwn = shieldedOwners(Date.now());
  const titled = titledCapitals();
  for (const isl of vis) {
    if (!islandOwnerOf(isl.id)) continue;
    const t = titled.get(isl.id), x = toSX(isl.x), y = toSY(isl.y), r = Math.max(20, isl.radius * z * 1.25);
    if (x < -r * 5 || x > viewW + r * 5 || y < -r * 6 || y > viewH + r * 5) continue;
    const shOw = islandOwnerOf(isl.id);
    if (shOwn.has(shOw) && shieldCovers(isl)) { const r = isl.radius * z;                                               // Friedensschild: a pale dome over every base of its owner
      const R = Math.max(r * 1.45, 16), ph = .6 + .4 * Math.sin(now / 700 + isl.id);
      const gd = ctx.createRadialGradient(x, y - R * .2, R * .3, x, y - R * .2, R);
      gd.addColorStop(0, 'rgba(210,235,255,.12)'); gd.addColorStop(.7, 'rgba(190,225,255,' + (.28 * ph).toFixed(2) + ')'); gd.addColorStop(1, 'rgba(230,245,255,' + (.6 * ph).toFixed(2) + ')');
      ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(x, y - R * .2, R, 0, Math.PI * 2); ctx.fill();
      ring(x, y - R * .2, R + 1, 5, 'rgba(10,30,60,.35)');
      ring(x, y - R * .2, R, 2.6, 'rgba(225,242,255,' + (.75 + .25 * ph).toFixed(2) + ')');
      ctx.strokeStyle = 'rgba(255,255,255,' + (.5 * ph).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - R * .2, R * .82, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();   // glint
      if (shOw !== 'player' && botById[shOw]) ring(x, y - R * .2, R + 3, 1.5, botById[shOw].color);   // whose shield it is
      liveAnimation = true;
    }
    if (isl.type !== 'tower' || !t) continue;                                                       // title effects: towers only (nothing by level)
    if (t.good) for (let i = 0; i < 8; i++) { const ph = ((now / 1700) + i / 14) % 1, a = i * 2.4;   // golden sparks rising
        ctx.fillStyle = 'rgba(255,226,140,' + (0.95 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.1 + Math.sin(now / 300 + i) * 2, y - r * .2 - ph * r * 3.2, 1.2 + (1 - ph) * 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (t.good) {                                  // a golden halo floating over the base
      const hy = y - r * 2.9 + Math.sin(now / 500) * 2;
      ctx.save(); ctx.translate(x, hy); ctx.scale(1, .32);
      ctx.strokeStyle = 'rgba(255,230,150,.95)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,230,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } else {                                        // cursed purple fire and smoke
      fxCurseFlames(x, y + r * .3, r * 1.35, now);
      for (let i = 0; i < 6; i++) { const ph = ((now / 2400) + i / 6) % 1;
        ctx.fillStyle = 'rgba(60,20,70,' + (0.5 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 1.7 + now / 800) * r * .5, y - r * 1.2 - ph * r * 3, r * (.3 + ph * .5), 0, Math.PI * 2); ctx.fill(); }
    }
    liveAnimation = true;
  }
}
function drawTitleBadges(z, now) {                // the title's name over the titled capital
  if (z < 0.004) return;
  setScreen(ctx);
  for (const [id, t] of titledCapitals()) {
    const isl = islandById[id]; if (!isl || !islandSeen(isl)) continue;
    const x = toSX(isl.x), y = toSY(isl.y) - Math.max(26, isl.radius * z * 2.6);
    if (x < -60 || x > viewW + 60 || y < -30 || y > viewH + 30) continue;
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    const w = ctx.measureText(t.name).width + 28;
    rr(ctx, x - w / 2, y - 10, w, 20, 10); ctx.fillStyle = t.good ? 'rgba(40,32,8,.92)' : 'rgba(40,8,14,.92)'; ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = t.good ? '#e8c877' : '#e0605a'; ctx.stroke();
    drawGlyph(ctx, t.good ? 'star' : 'losses', x - w / 2 + 11, y, 11, t.good ? '#f3d98a' : '#ff9d90');
    ctx.fillStyle = t.good ? '#f6e7bd' : '#ffd0c9'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t.name, x - w / 2 + 20, y + .5);
  }
}
function ring(x, y, R, w, color, dash, offset) {
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.lineWidth = w; ctx.strokeStyle = color;
  ctx.setLineDash(dash || []); ctx.lineDashOffset = offset || 0; ctx.stroke(); ctx.setLineDash([]);
}
function ringBadge(x, y, b, st) {                  // the title's sign on top of the ring: a crown (good title, ruler) or a skull (penalty)
  ctx.beginPath(); ctx.arc(x, y, b + 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(10,8,4,.85)'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = st.c0; ctx.stroke();
  ctx.fillStyle = st.k === 'bad' ? '#f1e6dc' : '#ffd25a';
  if (st.k === 'bad') { ctx.beginPath(); ctx.arc(x, y - b * .12, b * .55, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - b * .32, y + b * .2, b * .64, b * .38);
    ctx.fillStyle = 'rgba(10,8,4,.95)'; ctx.beginPath(); ctx.arc(x - b * .22, y - b * .1, b * .14, 0, Math.PI * 2); ctx.arc(x + b * .22, y - b * .1, b * .14, 0, Math.PI * 2); ctx.fill(); }
  else { const w = b * .7, h = b * .55; ctx.beginPath(); ctx.moveTo(x - w, y + h * .6); ctx.lineTo(x - w, y - h * .5); ctx.lineTo(x - w * .45, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w * .45, y); ctx.lineTo(x + w, y - h * .5); ctx.lineTo(x + w, y + h * .6); ctx.closePath(); ctx.fill(); }
}
function drawRings(visible, z, now) {
  setScreen(ctx); const rankOf = ringStatusByOwner();
  const pulse = .5 + .5 * Math.sin(now / 280);
  const attackTarget = pendingAttackTargetId !== null ? islandById[pendingAttackTargetId] : null;
  for (const isl of visible) {
    const x = toSX(isl.x), y = toSY(isl.y), r = isl.radius * z, S = Math.max(r * 1.28 + 3, 12);
    const isOwned = ownedIslands.has(isl.id);
    const isTemple = isl.type === 'temple' || isl.type === 'megaTemple';
    if (isTemple && z >= 0.006) {
      ring(x, y, Math.max(r * 1.25, 8), 1.5, 'rgba(228,200,134,.85)'); ring(x, y, Math.max(r * 1.5, 11), 1, 'rgba(228,200,134,.35)');
      if (isl.type === 'megaTemple' && r >= 20) { ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2;
        ctx.moveTo(x + Math.cos(a) * r * 1.44, y + Math.sin(a) * r * 1.44); ctx.lineTo(x + Math.cos(a) * r * 1.52, y + Math.sin(a) * r * 1.52); }
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(228,200,134,.7)'; ctx.stroke(); }
    }
    if (isl.type === 'tower' && z >= 0.006) {                                  // ring round every base: a title from the middle or a bought Ring-Skin (see ringStatusByOwner)
      const o = islandOwnerOf(isl.id), st = o ? rankOf.get(o) : null;
      if (st && st.k === 'skin') {                                                  // a bought Ring-Skin: one plain thin ring - quiet, so the title rings stand out
        const R1 = Math.max(r * 1.35, 21); ring(x, y, R1, 3.6, 'rgba(10,8,4,.45)'); ring(x, y, R1, 1.8, st.c0);
      } else if (st) {                                                                // a title from the middle: bold double ring with notches + a badge (crown, or skull for a penalty)
        const R1 = Math.max(r * 1.35, 21), R2 = R1 + Math.max(r * .28, 5), W = 3.4;
        ring(x, y, R1, W + 2.5, 'rgba(10,8,4,.55)'); ring(x, y, R1, W, st.c0);          // dark underlay so the ring reads on grass and territory
        ring(x, y, R2, 3, 'rgba(10,8,4,.35)'); ring(x, y, R2, 1.4, st.c1);
        if (st.n) { const spin = st.spin ? now / 4000 : 0;                             // notches like the mega temple
          ctx.beginPath(); for (let i = 0; i < st.n; i++) { const a = i / st.n * Math.PI * 2 + spin;
            ctx.moveTo(x + Math.cos(a) * R1 * 1.07, y + Math.sin(a) * R1 * 1.07); ctx.lineTo(x + Math.cos(a) * R2 * .97, y + Math.sin(a) * R2 * .97); }
          ctx.lineWidth = 2; ctx.strokeStyle = st.c0; ctx.stroke(); if (st.spin) liveAnimation = true; }
        if (st.pulse) { const p2 = (now / 1800) % 1; ctx.globalAlpha = .8 * (1 - p2); ring(x, y, R2 + p2 * Math.max(r * .6, 12), 2, st.c0); ctx.globalAlpha = 1; liveAnimation = true; }
        if (st.dash) { ring(x, y, R2 + 5, 2, st.dash, [8, 5], -now / 40); liveAnimation = true; }
        if (R1 >= 18) ringBadge(x, y - R2 - 1, Math.min(13, Math.max(9, r * .22)), st);
      }
    }
    if (isl.id === playerIslandId && z >= 0.006) {                            // the capital: blue-gold double ring
      ring(x, y, Math.max(r * 1.55, 12), 2, 'rgba(228,200,134,.95)'); ring(x, y, Math.max(r * 1.8, 15), 1.2, 'rgba(140,192,255,.6)', [3, 4]);
    }
    if (teleportMode && isOwned && isl.id !== playerIslandId && isl.type === 'tower') ring(x, y, S, 2, 'rgba(228,200,134,' + (.45 + .55 * pulse).toFixed(2) + ')', [4, 4]);
    const isSelectable = (attackTarget && isOwned && canReach(isl.landmassId, attackTarget.landmassId)) ||
                         (pendingSendFromId !== null && isOwned && isl.id !== pendingSendFromId);
    if (isSelectable) ring(x, y, S, 2, 'rgba(255,255,255,' + (.45 + .55 * pulse).toFixed(2) + ')', [4, 4]);
    else if (isl.id === pendingSendFromId || (multiAttackMode && isl.id === multiAttackSourceId)) ring(x, y, S, 2.5, '#e4c886');
    else if (multiAttackMode && multiAttackTargets.includes(isl.id)) {
      ring(x, y, S, 2, '#b98cf0');
      const bx = x + Math.cos(-Math.PI / 4) * S, by = y + Math.sin(-Math.PI / 4) * S;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fillStyle = '#5b3a8c'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#b98cf0'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 9px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(multiAttackTargets.indexOf(isl.id) + 1), bx, by + .5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else if (multiAttackMode && multiAttackSourceId !== null && !isOwned &&
               canReach(isl.landmassId, islandById[multiAttackSourceId].landmassId))
      ring(x, y, S, 1.5, 'rgba(185,140,240,' + (.8 * (.45 + .55 * pulse)).toFixed(2) + ')', [4, 5]);
    if (isl.id === popupIslandId && isPanelOpen(popup)) {
      if (popupView === 'preview') ring(x, y, S, 2, '#ff8d82', [6, 4], -now / 60);
      else { ring(x, y, S, 2, '#e4c886'); ring(x, y, S + 5, 1, 'rgba(228,200,134,.35)'); }
    }
    if (isl.id === previewSourceId && popupView === 'preview' && isPanelOpen(popup)) ring(x, y, S, 2.5, '#e4c886');
  }
}

const MARCH_STYLE = { attack: ['#ff8d82', [7, 6], 'attack'], incoming: ['#ff8d82', [7, 6], 'bot'], send: ['#8cc0ff', [7, 6], 'send'],
                      scout: ['#e4c886', [3, 6], 'scout'], retreat: ['#f2a066', [5, 5], 'recall'], enemyScout: ['#ff9f7a', [3, 6], 'scout'] };
let marchTokens = [], liveAnimation = false;
function marchPath(source, target) {             // source → over every bridge on the route → target
  const path = [{ x: source.x, y: source.y }];
  if (source.landmassId !== target.landmassId) {
    const route = routeFor(source.landmassId, target.landmassId, islandOwnerOf(source.id) || 'player') || [source.landmassId, target.landmassId];
    for (let i = 0; i < route.length - 1; i++) {
      const br = bridgeBetween(route[i], route[i + 1]); if (!br) continue;
      const sA = br.a === route[i];
      path.push(sA ? { x: br.x1, y: br.y1 } : { x: br.x2, y: br.y2 }, sA ? { x: br.x2, y: br.y2 } : { x: br.x1, y: br.y1 });
    }
  }
  path.push({ x: target.x, y: target.y });
  return path;
}
function drawMarchLine(type, source, target, startedAt, resolveAt, now, pathOverride, mk, who) {   // who: whose column (their Marsch-Skin); yours by default
  if (!source || !target) return;
  if (!startedAt) startedAt = resolveAt - MIN_ATTACK_SECONDS * 1000;
  const total = resolveAt - startedAt, progress = total > 0 ? Math.min(1, Math.max(0, (now - startedAt) / total)) : 1;
  const pts = (pathOverride || marchPath(source, target)).map(p => ({ x: toSX(p.x), y: toSY(p.y) }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  if (Math.max(...xs) < -20 || Math.min(...xs) > viewW + 20 || Math.max(...ys) < -20 || Math.min(...ys) > viewH + 20) return;
  liveAnimation = true;
  const [col, dash, glyphName] = MARCH_STYLE[type];
  setScreen(ctx); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); };
  trace(); ctx.setLineDash([]); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(6,8,12,.55)'; ctx.stroke();
  trace(); ctx.setLineDash(dash); ctx.lineDashOffset = -(now / 40) % 26; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]);
  const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); seg.push(l); tot += l; }
  // placed in drawMarchTokens(), after the nameplates, so the token can start past the source's own plate
  const own = type !== 'incoming' && type !== 'enemyScout'; if (who === undefined) who = own ? 'player' : null;
  marchTokens.push({ pts, seg, tot, progress, r: source.radius * mapState.zoom, srcId: source.id, key: type + source.id + '>' + target.id + '@' + resolveAt, col, glyph: glyphName, own, mk: mk || null, recall: type !== 'retreat', secs: Math.max(0, Math.ceil((resolveAt - now) / 1000)),
                    who, sk: who && glyphName !== 'scout' ? marchSkinOf(who) : null });
}
function marchPointAt(m, d) {                   // screen point at path distance d
  for (let i = 0; i < m.seg.length; i++) { if (d <= m.seg[i] || i === m.seg.length - 1) { const t = m.seg[i] > 0 ? Math.min(1, Math.max(0, d / m.seg[i])) : 1;
    return { x: m.pts[i].x + (m.pts[i + 1].x - m.pts[i].x) * t, y: m.pts[i].y + (m.pts[i + 1].y - m.pts[i].y) * t }; } d -= m.seg[i]; }
  return m.pts[0];
}
// Marsch-Skins on the map: a trail behind the column and a small flag with the owner's crest (one cached bitmap per owner + skin)
var marchFlagCache = new Map();
function marchFlag(g, x, y, sk, who) {                   // (x, y) = the token's centre; the pole stands on its upper right
  const cr = crestFor(who), key = (who || '') + '|' + sk.id + '|' + crestKeyOf(cr); let c = marchFlagCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = 72; c.height = 84; const q = c.getContext('2d'); q.scale(3, 3);
    q.strokeStyle = '#2a241b'; q.lineWidth = 1.4; q.beginPath(); q.moveTo(2, 27); q.lineTo(2, 1.5); q.stroke();
    q.fillStyle = sk.flag; q.beginPath(); q.moveTo(2.5, 2); q.lineTo(20, 2); q.lineTo(17, 8.5); q.lineTo(20, 15); q.lineTo(2.5, 15); q.closePath(); q.fill();
    q.lineWidth = .8; q.strokeStyle = 'rgba(10,8,4,.7)'; q.stroke(); drawCrest(q, 10, 8.6, 10, cr);
    if (marchFlagCache.size > 200) marchFlagCache.clear(); marchFlagCache.set(key, c); }
  g.drawImage(c, x + 3, y - 26, 24, 28);
}
function marchTrail(g, at, d0, sk, t, k) {               // at(d) → point on the path; d0 = where the trail starts (behind the token)
  if (!sk || !sk.trail) return; g.save(); g.fillStyle = sk.trail; g.strokeStyle = sk.trail; g.lineWidth = 1.1 * k;
  for (let i = 0; i < 10; i++) { const ph = (t / 45) % 7, d = d0 - (i * 7 + ph) * k; if (d < 0) break;
    const p = at(d), q = at(d + 2), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, w = Math.sin(i * 2.3 + t / 260) * 2.2 * k;
    const x = p.x - dy / l * w, y = p.y + dx / l * w, f = 1 - (i + ph / 7) / 10; g.globalAlpha = Math.max(0, f) * (sk.fx === 'smoke' ? .45 : .85);
    if (sk.fx === 'spark') { const r = (1 + f * 1.6) * k; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); }
    else if (sk.fx === 'leaf') { g.beginPath(); g.ellipse(x, y, 1.9 * k, 1 * k, i + t / 400, 0, Math.PI * 2); g.fill(); }
    else if (sk.fx === 'ember') { const r = (.7 + f) * k; g.fillRect(x - r, y - r - (1 - f) * 3 * k, r * 2, r * 2); }
    else { g.beginPath(); g.arc(x, y, (sk.fx === 'smoke' ? 1.6 + (1 - f) * 2.6 : .9 + f * 1.1) * k, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}
function drawMarchColumn(m, t) {                  // a short column of soldiers (pairs) trailing the token along its path
  const k = Math.max(1, Math.min(2, mapState.zoom / 0.02)), n = 8, gap = 8.5 * k;
  for (let i = n - 1; i >= 0; i--) {
    const d = m.d - 11 * k - Math.floor(i / 2) * gap; if (d < 0) continue;
    const p = marchPointAt(m, d), q = marchPointAt(m, d + 2), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    const side = i % 2 ? 1 : -1, ox = -dy / l * 3.4 * k * side, oy = dx / l * 3.4 * k * side;
    const x = p.x + ox, y = p.y + oy, bob = Math.abs(Math.sin(t / 110 + i * 1.7)) * 1.1 * k, fx = dx / l >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 3.4 + bob / k, 2.8, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(-1.7, -3.4, 3.4, 6);                   // body
    ctx.fillStyle = m.col; ctx.fillRect(fx > 0 ? 0.8 : -2.6, -2.8, 1.8, 3.6);        // shield in the troop colour
    ctx.beginPath(); ctx.arc(0, -4.7, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#aab2bc'; ctx.fill();   // helmet
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-fx * 1.3, 0.8); ctx.lineTo(fx * 2.4, -8.5); ctx.stroke();   // spear
    ctx.restore();
  }
}
const hitsAny = (r, list, e) => list.some(q => r.x < q.x + q.w + e && q.x < r.x + r.w + e && r.y < q.y + q.h + e && q.y < r.y + r.h + e);
function drawMarchTokens() {                      // drawn BEFORE the nameplates: a token slides along its path (up to 60 px)
  setScreen(ctx);                                 // to a spot clear of every plate; when there is none, the plate covers it
  const box = p => ({ x: p.x - 9, y: p.y - 9, w: 18, h: 18 });
  for (const m of marchTokens) {
    const plate = bannerHitRects.find(q => q.id === m.srcId);                   // leave the source base (tower + plate) visible
    let off = Math.min(m.tot * .5, m.r + 10);
    if (plate) while (off < m.tot * .5 && hitsAny(box(marchPointAt(m, off)), [plate], 1)) off += 2;
    const d0 = off + (m.tot - off) * m.progress; let d = d0;
    if (hitsAny(box(marchPointAt(m, d0)), bannerHitRects, 1))
      for (let k = 3; k <= 60; k += 3) {
        if (d0 + k <= m.tot && !hitsAny(box(marchPointAt(m, d0 + k)), bannerHitRects, 1)) { d = d0 + k; break; }
        if (d0 - k >= off && !hitsAny(box(marchPointAt(m, d0 - k)), bannerHitRects, 1)) { d = d0 - k; break; } }
    const p = marchPointAt(m, d); m.x = p.x; m.y = p.y; m.d = d;
  }
  const cols = mapState.zoom >= 0.006, t = performance.now();
  for (const m of marchTokens) if (m.sk && m.sk.trail) { const k = Math.max(1, Math.min(2, mapState.zoom / 0.02)); marchTrail(ctx, d => marchPointAt(m, d), m.d - (cols && m.glyph !== 'scout' ? 38 * k : 9), m.sk, t, k); }   // the skin's trail behind the column
  for (const m of marchTokens) if (cols && m.glyph !== 'scout') drawMarchColumn(m, t);
  for (const m of marchTokens) {
    ctx.beginPath(); ctx.arc(m.x, m.y, 7.5, 0, Math.PI * 2); ctx.fillStyle = '#141820'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = m.col; ctx.stroke();
    drawGlyph(ctx, m.glyph, m.x, m.y, 10, m.col);
    if (m.sk && cols) marchFlag(ctx, m.x, m.y, m.sk, m.who);                  // the flag with the owner's crest
  }
}
const CHIP_SLOTS = [0, -20, 20, -40, 40, -60, 60].flatMap(dy => [[1, dy], [-1, dy]])          // beside the cluster, then above / below;
  .concat([-10, 10, -30, 30, -50, 50, -80, 80].flatMap(dy => [[1, dy], [-1, dy]]),                                    // in between; further out
          [0, -20, 20, -40, 40].flatMap(dy => [[2, dy], [-2, dy]]), [0, -20, 20, -40, 40].flatMap(dy => [[3, dy], [-3, dy]]));
let chipDigit = null;                             // the widest digit: chips reserve the width of their widest label
let chipSlotOf = new Map();                       // cluster key → slot used last frame (a chip only moves when that slot gets blocked)
// Tap your own marching column: two small buttons pop up beside it - Zurück and Schneller (gems).
var selMarch = null, marchBtnRects = [];
function drawMarchButtons() {
  marchBtnRects = [];
  if (!selMarch) return;
  const m = marchTokens.find(t => t.mk === selMarch);
  if (!m || m.x === undefined) { selMarch = null; return; }
  setScreen(ctx);
  const list = [pendingAttacks, pendingSends, pendingRetreats].find(l => l.some(x => marchKeyOf(x) === selMarch)), mm = list && list.find(x => marchKeyOf(x) === selMarch);
  if (!mm) { selMarch = null; return; }
  const btns = (m.recall ? [{ act: 'recall', glyph: 'recall', label: 'Zurück' }] : []).concat([{ act: 'speed', glyph: 'hourglass', label: 'Schneller · ' + speedUpCost(mm) }]);
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  const ws = btns.map(b => ctx.measureText(b.label).width + 34 + (b.act === 'speed' ? 14 : 0)), total = ws.reduce((a, b) => a + b, 0) + 8 * (btns.length - 1);
  let x = Math.max(8, Math.min(viewW - total - 8, m.x - total / 2)); const y = Math.max(8, m.y - 74);
  btns.forEach((b, i) => { const w = ws[i];
    rr(ctx, x, y, w, 32, 16); ctx.fillStyle = 'rgba(14,12,10,.94)'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = b.act === 'speed' ? '#e4c886' : '#f2a066'; ctx.stroke();
    drawGlyph(ctx, b.glyph, x + 16, y + 16, 15, '#f3e6c4');
    ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(b.label, x + 28, y + 16.5);
    if (b.act === 'speed') drawGlyph(ctx, 'gem', x + w - 14, y + 16, 12, '#7fd0ff');
    marchBtnRects.push({ act: b.act, x, y, w, h: 32 }); x += w + 8; });
  ctx.strokeStyle = 'rgba(228,200,134,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2); ctx.stroke();   // ring round the chosen column
}
function marchTapAt(sx, sy) {                     // → true when the tap was meant for a column or its buttons
  const b = marchBtnRects.find(r => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h);
  if (b && selMarch) { const k = selMarch; if (b.act === 'recall') { recallMarch(k); selMarch = null; } else speedUpMarch(k); requestRender(); return true; }
  const t = marchTokens.filter(m => m.mk && m.x !== undefined).map(m => ({ m, d: Math.hypot(m.x - sx, m.y - sy) })).filter(o => o.d < 22).sort((a, c) => a.d - c.d)[0];
  if (t) { selMarch = selMarch === t.m.mk ? null : t.m.mk; requestRender(); return true; }
  if (selMarch) { selMarch = null; requestRender(); }
  return false;
}
function drawMarchChips() {                       // after the nameplates: one chip per cluster of tokens, "×n" when merged
  setScreen(ctx);
  const far = mapState.zoom < 0.006;             // zoomed far out only the player's own
  const on = marchTokens.filter(m => (m.own || !far) && m.x > 0 && m.x < viewW && m.y > 0 && m.y < viewH);
  const root = on.map((_, i) => i), find = i => root[i] === i ? i : (root[i] = find(root[i]));
  for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++)   // chains of tokens < 34 px apart merge (own and incoming apart)
    if (on[i].own === on[j].own && Math.hypot(on[i].x - on[j].x, on[i].y - on[j].y) < 34) root[find(j)] = find(i);
  const byRoot = new Map();
  on.forEach((m, i) => { const r = find(i), g = byRoot.get(r);
    if (!g) { byRoot.set(r, { key: m.key, sx: m.x, sy: m.y, l: m.x, r: m.x, n: 1, secs: m.secs }); return; }
    g.n++; g.secs = Math.min(g.secs, m.secs); g.sx += m.x; g.sy += m.y; g.l = Math.min(g.l, m.x); g.r = Math.max(g.r, m.x); if (m.key < g.key) g.key = m.key; });
  const clusters = [...byRoot.values()].sort((a, b) => a.key < b.key ? -1 : 1);   // a steady order → steady slots
  for (const c of clusters) c.y = c.sy / c.n;
  const lastSlot = chipSlotOf; chipSlotOf = new Map();
  if (!clusters.length) return;
  ctx.font = '600 10.5px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  if (!chipDigit) chipDigit = [...'0123456789'].reduce((w, d) => ctx.measureText(d).width > ctx.measureText(w).width ? d : w, '0');
  const label = c => fmtClock(c.secs) + (c.n > 1 ? '  ×' + c.n : '');
  const tokens = marchTokens.map(m => ({ x: m.x - 8.5, y: m.y - 8.5, w: 17, h: 17 }));
  const towers = towerRects.map(t => ({ x: t.x + t.w * .2, y: t.y + t.h * .1, w: t.w * .6, h: t.h * .8 }));
  const screen = { x: 0, y: 0, w: viewW, h: viewH }, placed = [];
  const width = c => Math.ceil(ctx.measureText(label(c).replace(/\d/g, chipDigit)).width) + 22;   // steady from second to second
  const slot = (c, i) => { const [side, dy] = CHIP_SLOTS[i], tw = width(c);
    const gap = [0, 11, 34, 60][Math.abs(side)], r = { x: side > 0 ? c.r + gap : c.l - gap - tw, y: c.y - 9 + dy, w: tw, h: 18 }, e = { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 };
    let over = r.w * r.h - overlap(r, screen), hard = over, soft = 0;                // hard: within 2 px of a plate or a chip, or off screen
    for (const q of bannerHitRects) { hard += overlap(e, q); over += overlap(r, q); }    // over: really on top of one
    for (const q of placed) { hard += overlap(e, q.rect); over += overlap(r, q.rect); }
    for (const q of tokens) soft += 3 * overlap(e, q);
    for (const q of towers) soft += overlap(e, q);
    if (over < 0.5) over = 0; if (hard < 0.5) hard = 0;                                  // (float residue of the area sums)
    return { i, r, over, hard, soft, sc: (over > 0 ? 1e6 : 0) + (hard > 0 ? 1e5 : 0) + 50 * hard + soft }; };   // on a plate / off screen only when no slot avoids it
  const place = (c, s) => { c.rect = s.r; chipSlotOf.set(c.key, s.i); placed.push(c); };
  const rest = [];
  const bestSlot = c => { let best = null;
    for (let i = 0; i < CHIP_SLOTS.length; i++) { const s = slot(c, i); if (!best || s.sc < best.sc) best = s; if (s.sc === 0) break; }
    return best; };
  for (const c of clusters) {                     // a chip keeps last frame's slot (hysteresis) while it is not on a plate, a chip or
    const s = lastSlot.has(c.key) ? slot(c, lastSlot.get(c.key)) : null;   // the screen edge and does not hide most of a token
    if (s && s.over === 0 && s.soft < 1200) place(c, s); else rest.push(c);
  }
  for (const c of rest) {                         // others: the first free slot; none free → the least bad one (over a tower rather than
    if (!lastSlot.has(c.key)) { place(c, bestSlot(c)); continue; }   // a plate); a chip that had to leave its slot takes the nearest good one
    const p = slot(c, lastSlot.get(c.key)).r; let best = null, bs = Infinity;
    for (let i = 0; i < CHIP_SLOTS.length; i++) { const s = slot(c, i), v = s.sc + 20 * Math.hypot(s.r.x - p.x, s.r.y - p.y); if (v < bs) { bs = v; best = s; } }
    place(c, best);
  }
  for (const c of placed) {
    c.rect.x = Math.max(2, Math.min(viewW - c.rect.w - 2, c.rect.x)); c.rect.y = Math.max(2, Math.min(viewH - 20, c.rect.y));   // never cut by the edge
    const { x, y, w } = c.rect;
    rr(ctx, x, y, w, 18, 3); ctx.fillStyle = 'rgba(10,12,16,.86)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(212,176,102,.4)'; ctx.stroke();
    drawGlyph(ctx, 'hourglass', x + 8, y + 9, 10, '#e4c886'); ctx.fillStyle = '#eee6d4'; ctx.fillText(label(c), x + 16, y + 12.8);
  }
}

function ownerKeyOf(isl) { const o = islandOwnerOf(isl.id); return o === 'player' ? 'player' : o ? 'bot' : 'neutral'; }
function visibleIslands(view) {
  const out = [];
  for (const lm of landmasses) {
    if (lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b) continue;
    if (!isExplored(lm.id)) continue;                                              // under the fog
    for (const isl of islandsByLandmass[lm.id] || []) {
      if (!islandSeen(isl)) continue;
      const pad = isl.radius * 2.2;
      if (isl.x + pad < view.l || isl.x - pad > view.r || isl.y + pad < view.t || isl.y - pad > view.b) continue;
      out.push(isl);
    }
  }
  return out;
}


// ===== TAG UND NACHT (Paket C) – nur Optik, keine Spielwirkung =====
// Die Karte folgt der Uhrzeit in Berlin – nach der Uhr des Servers (welt.js merkt sich den Unterschied zur Handy-Uhr:
// WELT.uhrVersatz; geht das Handy falsch, zählt die Server-Uhr). Sonnenauf-/-untergang nach der Jahreszeit (grob für
// Berlin). Am Tag nichts, abends Abendrot, nachts dunkler (eine Fläche, „multiplizieren“) mit Lichtern an Basen und
// Burgen und leuchtender Lava; morgens Morgenrot. Billig: Werte nur alle 20 s neu, Leucht-Bilder fertig gemalt, kein
// eigenes Neuzeichnen (die Karte malt in Ruhe ohnehin jede Sekunde), mit „Akku sparen“ weniger Lichter.
const TN = { at: 0, v: null, fmt: null, glow: {} };
function serverJetzt() { const v = window.WELT && WELT.uhrVersatz; return Date.now() + (Math.abs(v) > 90000 ? v : 0); }
function berlinZeit(t) {                            // → { h: Stunde mit Bruchteil, doy: Tag im Jahr, utc: Stunden vor UTC }
  const d = new Date(t);
  try { const f = TN.fmt || (TN.fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', month: 'numeric', day: 'numeric' }));
    const p = {}; for (const x of f.formatToParts(d)) p[x.type] = parseInt(x.value, 10);
    const h = p.hour + p.minute / 60; return { h, doy: (p.month - 1) * 30.44 + p.day, utc: ((Math.round(h - d.getUTCHours() - d.getUTCMinutes() / 60) % 24) + 24) % 24 }; }
  catch (e) { return { h: d.getHours() + d.getMinutes() / 60, doy: d.getMonth() * 30.44 + d.getDate(), utc: 1 }; }
}
function tagLicht() {                               // → { n: Nacht 0…1, r: Morgen-/Abendrot 0…1, farbe (zum Multiplizieren), licht: Lampen 0…1 }
  const now = performance.now(), test = window.__testStunde;
  if (TN.v && now - TN.at < 20000 && test === undefined) return TN.v;
  const b = berlinZeit(serverJetzt()), h = typeof test === 'number' ? test : b.h;
  const mittag = 12.2 + (b.utc === 2 ? 1 : 0), halb = (12.2 + 4.6 * Math.cos(2 * Math.PI * (b.doy - 172) / 365)) / 2;   // Sommer ~16,8 Std. Tag, Winter ~7,6
  const nach = h < mittag ? mittag - halb - h : h - mittag - halb;                // Stunden nach Sonnenuntergang / vor Sonnenaufgang (< 0: Tag)
  const s = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const n = s((nach + .25) / 1.5), r = Math.max(0, 1 - Math.abs(nach + .15) / 1.1) * (1 - n * .7);
  const mix = (a, c, t) => a.map((v, i) => v + (c[i] - v) * t);
  const col = mix(mix([255, 255, 255], [255, 192, 148], r), [72, 88, 148], n);
  TN.v = { n, r, licht: s((nach + .1) / .8), farbe: 'rgb(' + col.map(Math.round).join(',') + ')' }; TN.at = now;
  return TN.v;
}
function tnGlow(art) {                              // fertiges Leucht-Bild (warm: Fenster/Fackeln, lava: rot-orange)
  if (TN.glow[art]) return TN.glow[art];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (art === 'lava') { gr.addColorStop(0, 'rgba(255,170,60,.95)'); gr.addColorStop(.35, 'rgba(240,80,20,.55)'); gr.addColorStop(1, 'rgba(200,30,0,0)'); }
  else if (art === 'fackel') { gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(.25, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); }
  else { gr.addColorStop(0, 'rgba(255,214,140,.75)'); gr.addColorStop(.5, 'rgba(255,170,80,.28)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (TN.glow[art] = c);
}
function drawNacht(vis, z, view) {                  // nach den Gebäuden, vor den Namensschildern (die bleiben gut lesbar)
  const L = tagLicht(); if (L.n < .02 && L.r < .02) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.farbe; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (L.licht > .03) {
    setScreen(ctx); ctx.globalCompositeOperation = 'lighter';
    let rest = akkuSparen ? 160 : 1400;                                           // höchstens so viele Lichter pro Bild
    const lava = tnGlow('lava'), warm = tnGlow('warm'), fackel = tnGlow('fackel');
    for (const lm of landmasses) {                                                // leuchtende Lava im Vulkan
      if (lm.bio !== 'volcano' || lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b || !isExplored(lm.id)) continue;
      if (!lm.lava) lm.deko;                                                      // (baut die Lava-Liste, falls die Region noch nie gemalt wurde)
      for (const [x, y, r] of lm.lava || []) { if (rest-- <= 0) break; if (akkuSparen && r < 800 && z < .01) continue;
        const R = Math.max(3, r * z * 2.2), sx = toSX(x), sy = toSY(y); if (sx < -R || sx > viewW + R || sy < -R || sy > viewH + R) continue;
        ctx.globalAlpha = L.licht * .9; ctx.drawImage(lava, sx - R, sy - R, R * 2, R * 2); } }
    for (const isl of vis) {                                                      // Fenster und Fackeln an Basen, Burgen und Tempeln
      if (rest <= 0) break;
      const ow = islandOwnerOf(isl.id); if (!ow && isl.type === 'tower') continue;                     // leere Basen bleiben dunkel
      const size = 2 * isl.radius * z * 1.5 * (isl.type === 'tower' ? 1 : 1.3), x = toSX(isl.x), y = toSY(isl.y);
      if (x < -size * 2 || x > viewW + size * 2 || y < -size * 2 || y > viewH + size * 2) continue;
      rest--; ctx.globalAlpha = L.licht * (ow ? 1 : .6);
      const R = Math.max(4, size * .75); ctx.drawImage(warm, x - R, y - size * .2 - R, R * 2, R * 2);
      if (size >= 18 && !akkuSparen) { const f = Math.max(3, size * .16);                             // zwei Fackeln am Tor
        for (const dx of [-.4, .4]) ctx.drawImage(fackel, x + dx * size - f, y + size * .08 - f, f * 2, f * 2); }
    }
  }
  ctx.restore();
}
function drawMap() {
  const now = performance.now(), wallNow = Date.now();
  const z = mapState.zoom;                                                       // viewW/viewH are owned by sizeBackingStore() (§6)
  const view = { l: -mapState.offsetX / z, t: -mapState.offsetY / z, r: (viewW - mapState.offsetX) / z, b: (viewH - mapState.offsetY) / z };
  const viewPad = { l: view.l - ISLAND_RADIUS * 2, t: view.t - ISLAND_RADIUS * 2, r: view.r + ISLAND_RADIUS * 2, b: view.b + ISLAND_RADIUS * 2 };
  liveAnimation = false; marchTokens = [];
  const shake = mapBattleShake(now); if (shake) { mapState.offsetX += shake.x; mapState.offsetY += shake.y; }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const dirty = ownershipDelta();                                                 // what a capture can have changed
  refreshTerritory();                                                            // rebuild only chunks whose ownership changed
  if (dirty && BG.valid) for (const d of dirty) repaintBackgroundRect(d);        // partial repaints, clipped (no full re-render)
  drawBackground();                                                              // 1-4: sea, land, bridges, territory
  drawFog(view, now);
  drawWorldFrame();                                                            // Nebel des Krieges over unexplored islands
  const vis = visibleIslands(viewPad);
  drawRings(vis, z, now);                                                        // 5
  for (const a of pendingAttacks) { if (a.attackerBotId && islandOwnerOf(a.targetId) !== 'player') continue;         // fog of war (unchanged)
    if (a.fightEndsAt) continue;                                                                                     // the fight is on - the battle shows it
    drawMarchLine(a.attackerBotId ? 'incoming' : 'attack', islandById[a.sourceId], islandById[a.targetId], a.startedAt, a.resolveAt, wallNow, null, a.attackerBotId ? null : marchKeyOf(a), a.attackerBotId || 'player'); }
  for (const s of pendingSends) {
    if (s.senderBotId) {                                                     // fremde Märsche: nur Bündnis-Mitglieder, die zu DIR kommen (Rally, Hilfe, Verstärkung) – sonst Nebel wie bisher
      if (s.back || !bundFreund(s.senderBotId, 'player') || islandOwnerOf(s.toId) !== 'player') continue;
      drawMarchLine('send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, null, s.senderBotId); continue; }
    drawMarchLine('send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, marchKeyOf(s)); }
  for (const s of pendingScouts) drawMarchLine('scout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow);
  for (const s of botScoutsOnMap) drawMarchLine('enemyScout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow);   // a bot's scout coming to look at you
  for (const r of pendingRetreats) drawMarchLine('retreat', islandById[r.fromId], islandById[r.toId], r.startedAt, r.resolveAt, wallNow, r.path, marchKeyOf(r));   // 6
  setScreen(ctx);
  if (typeof bundKarteUnten === 'function') bundKarteUnten(vis, z);                                                    // Bündnis-Gebiet: zart in der Bündnisfarbe
  drawBaseAuras(vis, z, now);                                                                                          // level + title auras under the towers
  drawThronePlaza(z, now);                                                                                             // the Thronplatz around the Mega-Tempel
  drawResFields(now, wallNow);                                                                                          // gold mines and gem veins
  drawBarb(now, wallNow); drawEvents(now, wallNow);                                                                                               // Barbaren-Lager, the Tagesboss and the columns on their way
  drawArmies(now, wallNow);                                                                                             // your armies out in the open
  for (const isl of vis.slice().sort((a, b) => a.y - b.y)) drawBuilding(isl, ownerKeyOf(isl), z);                    // 7
  drawThroneFx(z, now);
  drawBaseSparks(vis, z, now);
  drawWander(now);                                                                                                     // the Kriegsherr and his host
  drawNacht(vis, z, viewPad);                                                                                          // Paket C: Abendrot, Nacht, Lichter
  if (typeof drawHaendler === 'function') drawHaendler();                                                              // Paket C: der Karren des wandernden Händlers (haendler.js)
  const plates = layoutBanners(vis, z, isPanelOpen(popup) ? popupIslandId : null);
  drawMarchTokens();                                                                                                   // 8 tokens (clear of the plates)
  paintBanners(plates);                                                                                                // 9 nameplates on top
  drawArmyCamps(now);                                                                                                  // armies camping in the field
  drawRulerCrowns(plates);
  drawTitleBadges(z, now);                                                                                             // crown on the ruler's plates
  drawWander(now, true);
  drawMarchChips();                                                                                                    // 10 countdown chips
  drawMarchButtons();
  drawPasses(view, now);                                                                                               // chained, time-locked bridges
  drawPickups(now);                                                                                                    // 11 mini-event pickups
  drawMapBattles(now);                                                                                                 // fights playing out at the bases
  drawThroneShots(now);                                                                                                // the Wächter-Tempel firing on the throne
  drawMarkers();                                                                                                       // your own Wegmarken
  if (typeof bundKarteOben === 'function') bundKarteOben(z, now);                                                      // Bündnis: Signale und Rally-Fahnen
  drawBattleFx(now);                                                                                                   // 13 battle flashes + "Sieg!"
  if (shake) { mapState.offsetX -= shake.x; mapState.offsetY -= shake.y; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ===== CAMERA & INPUT (spec §6) =====
// Keeps mapState.{offsetX, offsetY, zoom, targetZoom, velocityX, velocityY, isDragging} and zoomAnchor as the
// source of truth (screenToWorld, the harness and the probes read them).
const CAM = {
  MAX_ZOOM: 0.16,          // tower ≈ 208 px wide; beyond that nothing new is shown
  FIT_MARGIN: 1.08,        // min zoom = whole world + 8 %
  WHEEL_K: 0.0015,         // mouse notch (100 px) ≈ ×1.16
  CTRL_WHEEL_K: 0.01,      // trackpad pinch (ctrlKey wheel)
  ZOOM_TAU: 80,            // ms, exponential zoom easing in log space
  GLIDE_TAU: 300,          // ms, momentum decay
  MAX_V: 4.5, MIN_V: 0.02, // px/ms
  SLOP_TOUCH: 10, SLOP_MOUSE: 5,  // px, Euclidean
  VEL_WINDOW: 100, VEL_STALE: 60, // ms
  BUTTON_STEP: 1.6, KEY_STEP: 1.25, FLY_MS: 320
};
let minZoom = 0.0008, maxZoom = CAM.MAX_ZOOM;
let cameraFlight = null;         // { path(e) → {x, y, z} centre, end, z1, ins, t0, dur }
const clampZoom = z => Math.min(maxZoom, Math.max(minZoom, z));

function updateZoomBounds() {    // call at boot (after WORLD exists) and on every resize
  minZoom = Math.max(0.0004, Math.min(TERRITORY_VIEW_ZOOM * 0.5, viewW / (WORLD.w * CAM.FIT_MARGIN), viewH / (WORLD.h * CAM.FIT_MARGIN)));
  maxZoom = CAM.MAX_ZOOM;
  mapState.zoom = clampZoom(mapState.zoom); mapState.targetZoom = clampZoom(mapState.targetZoom);
}
// Camera clamp (v2): the view centre is kept in a region R(z), and the clamp is the nearest point of R - history-free,
// never stuck inside, it only slides along the rim. R(z) is a union of CONVEX pieces, each grown by a square of half
// side m = CLAMP_K · min(viewW, viewH) / z (the view always reaches further than m) and cut to a box:
// - every landmass (star-shaped around its centre → split into convex fans), so every point of land can be centred;
// - every triangle of three bridged landmass centres, so the sea inside the ring is free to cross. The triangles'
//   edges are the bridge lines (centre - coast - bridge - coast - centre), so beyond the outer coasts and bridges at
//   most m is sea: a view on the rim always shows land or a bridge, and the bays between outer landmasses are out.
// - box: per axis, a view smaller than the land box may overhang it by 15 % of the view, a larger one keeps it
//   centred (± 15 % of the land box); the slack eases to ~0 at min zoom, so the whole world is centred there.
// Each piece is convex and changes continuously with zoom, view size and sheet, so the clamp moves continuously:
// a step of the requested centre moves the result at most twice as far (no jumps). While a sheet covers part of
// the view, R also admits the centres whose FREE part obeys the same rule (each piece swept by the sheet shift,
// the box widened), so a base at the world edge can be framed above / beside the sheet; that slack eases back when
// the sheet closes. Pan, pinch, wheel, keys, buttons, glide and flights all go through clampCamera().
const CLAMP_K = 0.32, CLAMP_SLACK = 0.15;
function convexHull(pts) {               // Andrew's monotone chain; positive orientation (cross > 0 = interior on the left)
  const p = pts.map(q => ({ x: q.x, y: q.y })).sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
const CAM_PIECES = (() => {
  const out = [];
  for (const lm of landmasses) {         // greedy fans around the centre: extend while every point stays a hull vertex
    const s = lm.shape, n = s.length, c = { x: lm.x, y: lm.y };
    for (let i = 0; i < n;) { let j = i + 1, P = convexHull([c, s[i], s[j % n]]);
      while (j < n) { const Q = convexHull([c, ...Array.from({ length: j + 2 - i }, (_, k) => s[(i + k) % n])]);
        if (Q.length !== j + 3 - i) break; P = Q; j++; }
      if (P.length >= 3) out.push(P); i = j; }
  }
  const F = FRAME_HALF * 0.92;                     // square map: the sea inside the border is free to cross
  out.push(convexHull([{ x: -F, y: -F }, { x: F, y: -F }, { x: F, y: F }, { x: -F, y: F }]));
  return out.map(P => ({ P, l: Math.min(...P.map(p => p.x)), t: Math.min(...P.map(p => p.y)), r: Math.max(...P.map(p => p.x)), b: Math.max(...P.map(p => p.y)) }));
})();
const LAND_BOX = (() => { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const p of [...landmasses.flatMap(lm => lm.shape), ...bridges.flatMap(br => [{ x: br.x1, y: br.y1 }, { x: br.x2, y: br.y2 }])]) {
    l = Math.min(l, p.x); r = Math.max(r, p.x); t = Math.min(t, p.y); b = Math.max(b, p.y); }
  return { w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 }; })();
function sumBox(P, x0, y0, x1, y1) {     // convex P ⊕ the box [x0, x1] × [y0, y1]: each vertex takes the box corners of its normal cone
  const C = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], n = P.length, out = [];
  const q = (a, b) => { const nx = b.y - a.y, ny = a.x - b.x; return ny >= 0 ? (nx > 0 ? 2 : 3) : (nx < 0 ? 0 : 1); };   // corner of an edge's outer normal
  for (let i = 0; i < n; i++) { const v = P[i], b = q(v, P[(i + 1) % n]);
    for (let k = q(P[(i + n - 1) % n], v); ; k = (k + 1) % 4) { out.push({ x: v.x + C[k][0], y: v.y + C[k][1] }); if (k === b) break; } }
  return out;
}
function clipHalf(P, f) {                // Sutherland-Hodgman against one half-plane f(p) ≥ 0 (convex stays convex)
  const out = [];
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } }
  return out;
}
function clipToBox(P, x0, y0, x1, y1) { return clipHalf(clipHalf(clipHalf(clipHalf(P, p => p.x - x0), p => x1 - p.x), p => p.y - y0), p => y1 - p.y); }
function projectConvex(Q, x, y) {        // nearest point of the convex polygon Q (positive orientation) to (x, y)
  let inside = true, bx = x, by = y, bd = Infinity;
  for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    if (dx * (y - a.y) - dy * (x - a.x) < 0) inside = false;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0, px = a.x + dx * t, py = a.y + dy * t;
    const d = (px - x) * (px - x) + (py - y) * (py - y); if (d < bd) { bd = d; bx = px; by = py; } }
  return inside ? { x, y } : { x: bx, y: by };
}
const insideConvex = (Q, x, y) => { for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length];
  if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false; } return true; };
const camInset = { t: 0, b: 0, l: 0, r: 0 };   // CSS px of the view covered by a sheet (eased; see updateCamera)
let insetCache = { at: -1e9, v: { t: 0, b: 0, l: 0, r: 0 } };
function camInsetTarget(now, fresh) {    // the island sheet (phone: bottom, landscape: right side) covers part of the map
  if (!fresh && now - insetCache.at < 150) return insetCache.v;
  const v = { t: 0, b: 0, l: 0, r: 0 }, layout = uiLayout(), sheet = document.getElementById('islandPopup');
  if (sheet && sheet.classList.contains('is-open') && layout !== 'desktop') { const pr = sheet.getBoundingClientRect();
    if (layout === 'phone') v.b = Math.max(0, Math.min(viewH * 0.8, viewH - pr.top));
    else v.r = Math.max(0, Math.min(viewW * 0.8, viewW - pr.left)); }
  insetCache = { at: now, v }; return v;
}
function camRange(h, W, mid, a, b, sl) { // allowed centre interval on one axis; a / b: world units covered at the low / high side; sl: slack
  const r = hh => Math.max(0, W / 2 - hh) + sl * Math.min(2 * hh, W);
  let lo = mid - r(h), hi = mid + r(h);
  const fh = h - (a + b) / 2, sh = (a - b) / 2;                                   // the free part: half size, centre shift
  if ((a || b) && fh > 0) { lo = Math.min(lo, mid - r(fh) - sh); hi = Math.max(hi, mid + r(fh) - sh); }
  return [lo, hi];
}
const camRegionCache = [];               // R(z) for the last few (zoom, view size, sheet) keys: a zoom ease asks for its end view too
function camRegion(z, ins) {             // → { R: [{ l, t, r, b }] the pieces' boxes (camPiece(G, p): the polygon, built on demand), box }
  const key = z + ',' + viewW + ',' + viewH + ',' + ins.t + ',' + ins.b + ',' + ins.l + ',' + ins.r;
  const hit = camRegionCache.find(e => e.key === key); if (hit) return hit;
  const hw = viewW / 2 / z, hh = viewH / 2 / z, sl = CLAMP_SLACK * Math.min(1, Math.max(0.01, (z / minZoom - 1) / 0.3));
  const [x0, x1] = camRange(hw, LAND_BOX.w, LAND_BOX.cx, ins.l / z, ins.r / z, sl), [y0, y1] = camRange(hh, LAND_BOX.h, LAND_BOX.cy, ins.t / z, ins.b / z, sl);
  const m = CLAMP_K * Math.min(viewW, viewH) / z, sx = (ins.r - ins.l) / 2 / z, sy = (ins.b - ins.t) / 2 / z;   // free part's centre = centre - (sx, sy)
  const G = { key, R: [], box: [x0, y0, x1, y1], grow: [-m + Math.min(0, sx), -m + Math.min(0, sy), m + Math.max(0, sx), m + Math.max(0, sy)] }, [gl, gt, gr, gb] = G.grow;
  for (const c of CAM_PIECES) { const l = c.l + gl, t = c.t + gt, r = c.r + gr, b = c.b + gb;
    if (r >= x0 && l <= x1 && b >= y0 && t <= y1) G.R.push({ c, l: Math.max(l, x0), t: Math.max(t, y0), r: Math.min(r, x1), b: Math.min(b, y1), cut: l < x0 || r > x1 || t < y0 || b > y1, Q: null }); }
  camRegionCache.unshift(G); if (camRegionCache.length > 3) camRegionCache.pop();
  return G;
}
function camPiece(G, p) {                // a piece of R: grown, cut to the box ([] when the cut leaves nothing)
  if (!p.Q) { p.Q = sumBox(p.c.P, ...G.grow);
    if (p.cut) { const Q = clipToBox(p.Q, ...G.box); let a = 0; for (let i = 0; i < Q.length; i++) { const u = Q[i], v = Q[(i + 1) % Q.length]; a += u.x * v.y - v.x * u.y; }
      p.Q = a > 1 ? Q : []; } }                                                     // (a sliver of the box is left to the box itself)
  return p.Q;
}
function clampCentre(cx, cy, z, ins) {   // nearest point of R(z) (ins: the sheet slack, default the current one)
  const G = camRegion(z, ins || camInset);
  for (const p of G.R) if (cx >= p.l && cx <= p.r && cy >= p.t && cy <= p.b) { const Q = camPiece(G, p); if (Q.length && insideConvex(Q, cx, cy)) return { x: cx, y: cy }; }
  let bx = cx, by = cy, bd = Infinity;
  for (const p of G.R) { const dx = Math.max(p.l - cx, 0, cx - p.r), dy = Math.max(p.t - cy, 0, cy - p.b); if (dx * dx + dy * dy >= bd) continue;
    const Q = camPiece(G, p); if (!Q.length) continue;
    const q = projectConvex(Q, cx, cy), d = (q.x - cx) * (q.x - cx) + (q.y - cy) * (q.y - cy); if (d < bd) { bd = d; bx = q.x; by = q.y; } }
  if (bd === Infinity) { const [x0, y0, x1, y1] = G.box; bx = Math.min(x1, Math.max(x0, cx)); by = Math.min(y1, Math.max(y0, cy)); }   // (a degenerate box at min zoom)
  return { x: bx, y: by };
}
function stopFlight() {                  // cancel / end a flight where it is: its view is valid for its inset, so that
  const f = cameraFlight; if (!f) return; // inset stays as slack and eases off (no snap)
  cameraFlight = null;
  for (const side of ['t', 'b', 'l', 'r']) camInset[side] = Math.max(camInset[side], f.ins[side]);
}
function clampCamera(ins) {              // ins: the sheet slack (optional) → true when it moved the centre: the caller re-anchors its gesture
  const z = mapState.zoom, cx = (viewW / 2 - mapState.offsetX) / z, cy = (viewH / 2 - mapState.offsetY) / z;
  const c = clampCentre(cx, cy, z, ins), dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy);
  if (d * z < 0.01) return false;
  mapState.offsetX = viewW / 2 - c.x * z; mapState.offsetY = viewH / 2 - c.y * z;
  const vn = (mapState.velocityX * dx + mapState.velocityY * dy) / d;                // glide: drop the part into the edge,
  if (vn > 0) { mapState.velocityX -= vn * dx / d; mapState.velocityY -= vn * dy / d; }   // keep sliding along it
  return true;
}
function zoomAt(sx, sy, z, animate) {   // the ONE zoom primitive: keeps the world point under (sx, sy) fixed
  z = clampZoom(z); stopFlight();
  if (animate) {                         // eased: if the end view would need the clamp (zooming into open sea, out past an
    const z0 = mapState.zoom, ox = mapState.offsetX, oy = mapState.offsetY;   // edge), zoom about the point that
    if (Math.abs(z - z0) > z0 * 1e-4) {                                        // stays fixed between now and the valid
      const ex = sx - (sx - ox) / z0 * z, ey = sy - (sy - oy) / z0 * z;        // end view instead → one smooth motion
      const c = clampCentre((viewW / 2 - ex) / z, (viewH / 2 - ey) / z, z);
      const fx = viewW / 2 - c.x * z, fy = viewH / 2 - c.y * z;
      if (Math.abs(fx - ex) > .01 || Math.abs(fy - ey) > .01) { sx = (ox * z - fx * z0) / (z - z0); sy = (oy * z - fy * z0) / (z - z0); }
    }
    const w = screenToWorld(sx, sy);
    mapState.targetZoom = z; zoomAnchor = { screenX: sx, screenY: sy, worldX: w.x, worldY: w.y }; requestRender(); return;
  }
  const w = screenToWorld(sx, sy);                                             // direct (ctrl+wheel = trackpad pinch)
  mapState.zoom = mapState.targetZoom = z; zoomAnchor = null; mapState.offsetX = sx - w.x * z; mapState.offsetY = sy - w.y * z; clampCamera();
  requestRender();
}
function flyTo(wx, wy, opts = {}) {     // animated camera move; the world point ends at screen (sx, sy)
  // a flight started during another one (Home pressed again, a key, a framing) keeps that one's end zoom, not the dip
  const z0 = mapState.zoom, z1 = clampZoom(opts.zoom || (cameraFlight ? cameraFlight.z1 : zoomAnchor ? mapState.targetZoom : mapState.zoom));
  const sx = opts.screenX != null ? opts.screenX : viewW / 2, sy = opts.screenY != null ? opts.screenY : viewH / 2;
  mapState.velocityX = mapState.velocityY = 0; zoomAnchor = null; mapState.targetZoom = mapState.zoom; stopFlight();
  if (opts.instant) { mapState.zoom = mapState.targetZoom = z1; mapState.offsetX = sx - wx * z1; mapState.offsetY = sy - wy * z1; clampCamera(); requestRender(); return; }
  const it = camInsetTarget(performance.now(), true), ins = { t: Math.max(it.t, camInset.t), b: Math.max(it.b, camInset.b), l: Math.max(it.l, camInset.l), r: Math.max(it.r, camInset.r) };
  const c0 = { x: (viewW / 2 - mapState.offsetX) / z0, y: (viewH / 2 - mapState.offsetY) / z0 };
  const end = clampCentre(wx + (viewW / 2 - sx) / z1, wy + (viewH / 2 - sy) / z1, z1, ins);   // both ends lie in R
  const w0 = viewW / z0, w1 = viewW / z1, dx = end.x - c0.x, dy = end.y - c0.y, D = Math.hypot(dx, dy);
  let path, dur = opts.ms || CAM.FLY_MS, zm = Math.min(z0, z1);
  if (D > 1.2 * Math.max(w0, w1)) {      // a hop (van Wijk & Nuij smooth zoom + pan): zooms out on the way, so land stays in view
    const b0 = (w1 * w1 - w0 * w0 + 4 * D * D) / (4 * w0 * D), b1 = (w1 * w1 - w0 * w0 - 4 * D * D) / (4 * w1 * D);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), S = (r1 - r0) / Math.SQRT2;
    path = e => { const s = Math.SQRT2 * e * S + r0, u = w0 / (2 * D) * (Math.cosh(r0) * Math.tanh(s) - Math.sinh(r0));
      return { x: c0.x + u * dx, y: c0.y + u * dy, z: z0 * Math.cosh(s) / Math.cosh(r0) }; };   // (no live viewW: a rotation mid-flight must not jump)
    dur = Math.min(800, Math.max(400, 300 + 110 * S));
    for (let k = 1; k < 16; k++) zm = Math.min(zm, path(k / 16).z);   // the dip (the renderer draws the far part coarse)
  } else {                               // short: the world point under (sx, sy) glides there, zoom eases in log space
    const f = screenToWorld(sx, sy), ox = viewW / 2 - sx, oy = viewH / 2 - sy, tx = end.x - ox / z1, ty = end.y - oy / z1;
    path = e => { const z = Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * e);
      return { x: f.x + (tx - f.x) * e + ox / z, y: f.y + (ty - f.y) * e + oy / z, z }; };
  }
  cameraFlight = { path, end, z1, zm, ins, t0: performance.now(), dur };
  requestRender();
}
function recenterOnHome(animate) {      // harness calls it without an argument → instant
  const h = islandById[playerIslandId]; if (!h) return;
  flyTo(h.x, h.y, { instant: !animate });
}
window.recenterOnHome = recenterOnHome;

// Called once per frame BEFORE drawMap(). Returns true while something is moving.
function updateCamera(dt, now) {
  let animating = false;
  if (cameraFlight) {
    const f = cameraFlight, k = Math.min(1, (now - f.t0) / f.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const p = k >= 1 ? { x: f.end.x, y: f.end.y, z: f.z1 } : f.path(e), z = k >= 1 ? f.z1 : clampZoom(p.z);   // the last frame lands exactly
    mapState.zoom = mapState.targetZoom = z; mapState.offsetX = viewW / 2 - p.x * z; mapState.offsetY = viewH / 2 - p.y * z;
    clampCamera(f.ins);                                                              // every frame in R(z): land stays in view
    if (k >= 1) stopFlight();
    animating = true;
  } else {
    if (!gesture.active && (Math.abs(mapState.velocityX) > CAM.MIN_V || Math.abs(mapState.velocityY) > CAM.MIN_V)) {
      mapState.offsetX += mapState.velocityX * dt; mapState.offsetY += mapState.velocityY * dt;
      const f = Math.exp(-dt / CAM.GLIDE_TAU); mapState.velocityX *= f; mapState.velocityY *= f; animating = true;
    } else if (!gesture.active) { mapState.velocityX = mapState.velocityY = 0; }
    if (mapState.zoom !== mapState.targetZoom) {
      const a = zoomAnchor || (() => { const w = screenToWorld(viewW / 2, viewH / 2); return { screenX: viewW / 2, screenY: viewH / 2, worldX: w.x, worldY: w.y }; })();
      const lt = Math.log(mapState.targetZoom);
      let nl = lt + (Math.log(mapState.zoom) - lt) * Math.exp(-dt / CAM.ZOOM_TAU);   // time-based, log space
      if (Math.abs(nl - lt) < 0.002) nl = lt;                                         // relative snap
      mapState.zoom = nl === lt ? mapState.targetZoom : Math.exp(nl);
      mapState.offsetX = a.screenX - a.worldX * mapState.zoom; mapState.offsetY = a.screenY - a.worldY * mapState.zoom;
      if (mapState.zoom === mapState.targetZoom) zoomAnchor = null;
      animating = true;
    }
  }
  const it = camInsetTarget(now), a = 1 - Math.exp(-dt / 140);                    // sheet slack: on at once, eases off -
  for (const side of ['t', 'b', 'l', 'r']) { const v = camInset[side], w = it[side];  // but not under a finger (it eases after release)
    if (v !== w && (w > v || !gesture.active)) { camInset[side] = w > v || Math.abs(w - v) < 0.5 ? w : v + (w - v) * a; animating = true; } }
  if (!cameraFlight && clampCamera()) {                                      // moved: re-anchor whatever holds the camera
    if (zoomAnchor) { zoomAnchor.worldX = (zoomAnchor.screenX - mapState.offsetX) / mapState.zoom; zoomAnchor.worldY = (zoomAnchor.screenY - mapState.offsetY) / mapState.zoom; }
    const pts = [...gesture.pointers.values()];
    if (gesture.mode === 'pan' && pts.length === 1) gesture.grab = screenToWorld(pts[0].x, pts[0].y);
    else if (gesture.mode === 'pinch' && gesture.pinch && pts.length >= 2) gesture.pinch.w = screenToWorld((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
  }
  cameraSettling = animating || gesture.mode === 'pinch';
  return animating;
}

// ---------------- pointer gestures (canvas only; UI never joins a gesture) ----------------
const gesture = { pointers: new Map(), mode: 'idle', active: false, startX: 0, startY: 0, grab: null, pinch: null,
                  pinched: false, caughtGlide: false, samples: [], type: 'mouse' };
let suppressGhostClick = false;
function resetGesture() {
  gesture.pointers.clear(); gesture.mode = 'idle'; gesture.active = false; gesture.pinch = null; gesture.samples = [];
  mapState.isDragging = false; canvas.classList.remove('is-dragging');
}
function freezeCamera() {                 // nothing may move under a resting finger
  const speed = Math.hypot(mapState.velocityX, mapState.velocityY);
  mapState.velocityX = mapState.velocityY = 0;
  if (mapState.zoom !== mapState.targetZoom) { mapState.targetZoom = mapState.zoom; zoomAnchor = null; }
  stopFlight();
  return speed;
}
function startPinch() {
  const [a, b] = [...gesture.pointers.values()];
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  gesture.mode = 'pinch'; gesture.pinched = true; gesture.samples = [];
  gesture.pinch = d < 10 ? null : { d0: d, z0: mapState.zoom, w: screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
}
function pushSample(x, y, t) {
  gesture.samples.push({ x, y, t });
  while (gesture.samples.length > 2 && gesture.samples[0].t < t - CAM.VEL_WINDOW) gesture.samples.shift();
}
function releaseVelocity(t) {
  const s = gesture.samples; if (s.length < 2) return { x: 0, y: 0 };
  const last = s[s.length - 1]; if (t - last.t > CAM.VEL_STALE) return { x: 0, y: 0 };   // held still before release → no fling
  const first = s.find(q => q.t >= last.t - CAM.VEL_WINDOW) || s[0], dt = last.t - first.t;
  if (dt < 8) return { x: 0, y: 0 };
  let vx = (last.x - first.x) / dt, vy = (last.y - first.y) / dt; const sp = Math.hypot(vx, vy);
  if (sp > CAM.MAX_V) { vx *= CAM.MAX_V / sp; vy *= CAM.MAX_V / sp; }
  return { x: vx, y: vy };
}
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const speed = freezeCamera();
  gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesture.active = true; mapState.isDragging = true; gesture.type = e.pointerType;
  if (gesture.pointers.size === 1) {
    gesture.mode = 'press'; gesture.startX = e.clientX; gesture.startY = e.clientY; gesture.pinched = false;
    gesture.caughtGlide = speed > 0.1; gesture.grab = screenToWorld(e.clientX, e.clientY);
    gesture.samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
  } else if (gesture.pointers.size === 2) startPinch();          // 1 → 2: re-baseline as a pinch
  requestRender();
});
canvas.addEventListener('pointermove', e => {
  const p = gesture.pointers.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') queueHover(e.clientX, e.clientY); return; }
  if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) { cancelGesture(); return; }   // lost mouseup
  p.x = e.clientX; p.y = e.clientY;
  if (gesture.mode === 'pinch') {
    if (!gesture.pinch || gesture.pointers.size < 2) return;
    const [a, b] = [...gesture.pointers.values()];
    const z = clampZoom(gesture.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gesture.pinch.d0);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    mapState.zoom = mapState.targetZoom = z; zoomAnchor = null;                       // 1:1, no easing
    mapState.offsetX = mx - gesture.pinch.w.x * z; mapState.offsetY = my - gesture.pinch.w.y * z;   // pan + zoom together
    if (clampCamera()) gesture.pinch.w = screenToWorld(mx, my);                        // held at the edge: re-anchor (all land lies in R,
                                                                                       // so a pinch on land runs 1:1 and the land stays under the fingers)
    requestRender(); return;
  }
  if (gesture.mode === 'press') {
    const slop = e.pointerType === 'mouse' ? CAM.SLOP_MOUSE : CAM.SLOP_TOUCH;
    if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) <= slop) return;
    gesture.mode = 'pan'; canvas.classList.add('is-dragging');
    gesture.grab = screenToWorld(e.clientX, e.clientY);                                // re-baseline → no jump
  }
  if (gesture.mode === 'pan') {
    mapState.offsetX = e.clientX - gesture.grab.x * mapState.zoom;                     // invariant: grabbed point stays under the pointer
    mapState.offsetY = e.clientY - gesture.grab.y * mapState.zoom;
    if (clampCamera()) gesture.grab = screenToWorld(e.clientX, e.clientY);            // held at the edge: re-anchor, so reversing moves at once
    if (zoomAnchor) zoomAnchor = { screenX: e.clientX, screenY: e.clientY, worldX: gesture.grab.x, worldY: gesture.grab.y };   // a wheel ease
    pushSample(e.clientX, e.clientY, e.timeStamp); requestRender();
  }
});
function onPointerEnd(e) {
  if (!gesture.pointers.has(e.pointerId)) return;
  gesture.pointers.delete(e.pointerId);
  if (gesture.pointers.size === 1) {                                                  // 2 → 1: the remaining finger keeps panning
    const [r] = [...gesture.pointers.values()];
    gesture.mode = 'pan'; gesture.grab = screenToWorld(r.x, r.y); gesture.samples = []; gesture.pinch = null; return;
  }
  if (gesture.pointers.size >= 2) { startPinch(); return; }                            // 3 → 2
  const wasTap = gesture.mode === 'press' && !gesture.pinched && !gesture.caughtGlide;
  if (gesture.mode === 'pan') { const v = releaseVelocity(e.timeStamp); mapState.velocityX = v.x; mapState.velocityY = v.y; }
  resetGesture();
  if (wasTap) { if (e.pointerType !== 'mouse') suppressGhostClick = true; handleTap(e.clientX, e.clientY);
    tapGuard = isPanelOpen(popup) ? { t: performance.now(), x: e.clientX, y: e.clientY } : null; }
  requestRender();
}
function cancelGesture() { mapState.velocityX = mapState.velocityY = 0; resetGesture(); requestRender(); }
canvas.addEventListener('pointerup', onPointerEnd);
canvas.addEventListener('pointercancel', cancelGesture);
canvas.addEventListener('lostpointercapture', e => { if (gesture.pointers.has(e.pointerId)) onPointerEnd(e); });
window.addEventListener('blur', cancelGesture);
canvas.addEventListener('contextmenu', e => e.preventDefault());
// pointerup fires before touchend: cancelling touchend stops the synthetic click from hitting the popup that just opened
canvas.addEventListener('touchend', e => { if (suppressGhostClick) { e.preventDefault(); suppressGhostClick = false; } }, { passive: false });
// a quick second tap (double-tap) at the same spot must not press whatever the just-opened sheet put under the finger
let tapGuard = null;
document.getElementById('islandPopup').addEventListener('click', e => {
  if (tapGuard && performance.now() - tapGuard.t < 350 && Math.hypot(e.clientX - tapGuard.x, e.clientY - tapGuard.y) < 40) { e.stopPropagation(); e.preventDefault(); }
}, true);

// ---------------- wheel (canvas only → popups scroll natively) ----------------
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  let dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewH : 1);        // normalise line/page modes
  dy = Math.max(-150, Math.min(150, dy));                                             // clamp per event
  mapState.velocityX = mapState.velocityY = 0; stopFlight();
  if (e.ctrlKey) { zoomAt(e.clientX, e.clientY, mapState.zoom * Math.exp(-dy * CAM.CTRL_WHEEL_K), false); return; }  // trackpad pinch: direct
  const base = zoomAnchor ? mapState.targetZoom : mapState.zoom;                      // successive notches accumulate
  zoomAt(e.clientX, e.clientY, base * Math.exp(-dy * CAM.WHEEL_K), true);             // eased, anchored at the cursor
  // during a drag the pan moves the zoom anchor along with the cursor (see pointermove), so the grabbed point stays under it
}, { passive: false });

// ---------------- hover cursor + hit testing ----------------
let hoverXY = null;
function queueHover(x, y) { if (!hoverXY) requestAnimationFrame(() => { const h = hoverXY; hoverXY = null;
  canvas.classList.toggle('is-hover', !!(h && pickIslandAtScreen(h.x, h.y))); }); hoverXY = { x, y }; }
function pickIslandAtScreen(sx, sy) {
  for (let i = bannerHitRects.length - 1; i >= 0; i--) {                              // banners first (topmost last drawn)
    const r = bannerHitRects[i]; if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return islandById[r.id];
  }
  const w = screenToWorld(sx, sy), z = mapState.zoom; let best = null, bd = Infinity;
  for (const isl of islands) {                                                        // nearest base, min 22 CSS px hit radius
    if (!islandSeen(isl)) continue;
    const d = Math.hypot(isl.x - w.x, isl.y - w.y); if (d <= Math.max(isl.radius, 22 / z) && d < bd) { bd = d; best = isl; }
  }
  return best;
}

// ---------------- render loop (render on demand) ----------------
var mapDirty = true;   // `var` on purpose: updateHud() → requestRender() already runs at boot, before this block
var akkuSparen = store.get('openWaterAkku') === '1';   // (Einstellungen) weniger Bilder pro Sekunde, schärfe 1,5 statt 2
let lastFrameAt = performance.now(), lastDrawAt = 0, lastCamKey = '', lastMarchKey = '';
function requestRender() { mapDirty = true; }   // hoisted function declaration: safe to call from anywhere
function frame(now) {
  requestAnimationFrame(frame);                  // first, so one bad frame can never stop the map for good
  const dt = Math.min(32, now - lastFrameAt); lastFrameAt = now;
  tickPickups();
  const animating = updateCamera(dt, now);
  const camKey = mapState.offsetX + ',' + mapState.offsetY + ',' + mapState.zoom;           // catches external writes (harness, other code)
  const marchKey = pendingAttacks.length + ',' + pendingSends.length + ',' + pendingScouts.length + ',' + pendingRetreats.length;   // a march starts/ends → draw now (it then keeps liveAnimation)
  if (marchKey !== lastMarchKey) { lastMarchKey = marchKey; mapDirty = true; }
  const live = liveAnimation || multiAttackMode || pendingAttackTargetId !== null || pendingSendFromId !== null ||
               (isPanelOpen(popup) && popupView === 'preview');                           // dashes / pulses → 30 fps
  const verdeckt = !cityView.hidden || cloudCover >= .95, liveMs = akkuSparen ? 66 : 33, ruheMs = akkuSparen ? 2000 : 1000;   // Akku sparen: halb so viele Bilder                  // die Stadt (oder dichte Wolken) deckt die Karte ganz zu: nicht unsichtbar weiterzeichnen
  if (!verdeckt && (mapDirty || animating || BG.pending || camKey !== lastCamKey || (live && now - lastDrawAt >= liveMs) || now - lastDrawAt >= ruheMs)) {
    drawMap(); lastDrawAt = now; lastCamKey = camKey; mapDirty = false;
    if (isPanelOpen(popup)) positionIslandPopover();
    updateMapControls();
  }
}

// ---------------- resize / rotation / dpr ----------------
function sizeBackingStore() {             // safe at boot
  viewW = window.innerWidth; viewH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, (typeof akkuSparen === 'boolean' ? akkuSparen : store.get('openWaterAkku') === '1') ? 1.5 : 2);   // cap: 2 is plenty and halves fill cost on 3x phones (Akku sparen: 1,5)
  const bw = Math.round(viewW * dpr), bh = Math.round(viewH * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  canvas.style.width = viewW + 'px'; canvas.style.height = viewH + 'px';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';   // assigning width resets context state (B15)
}
function onViewportResize() {             // registered after boot; keeps the world point at the view centre
  const oldDpr = dpr, c = screenToWorld(viewW / 2, viewH / 2);
  sizeBackingStore();
  mapState.offsetX = viewW / 2 - c.x * mapState.zoom; mapState.offsetY = viewH / 2 - c.y * mapState.zoom;
  updateZoomBounds(); clampCamera(); BG.valid = false;
  if (dpr !== oldDpr) { BUILDING_SPRITES.clear(); flushBannerSprites(); HATCH = null; }
  requestRender();
}
let resizeQueued = false;
window.addEventListener('resize', () => { if (resizeQueued) return; resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; onViewportResize(); }); });

// ---------------- keyboard ----------------
let keyScopeUi = false;                   // last press landed in the UI → arrows/letters belong to it (e.g. scrolling a panel)
document.addEventListener('pointerdown', e => { keyScopeUi = isUiElement(e.target); }, true);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (e.target && e.target !== document.body && e.target.blur) e.target.blur(); closeTopmostPanel(); return; }
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;          // browser zoom, shortcuts
  if (e.target && e.target.closest && (e.target.closest('input, textarea, select') || isUiElement(e.target))) return;   // native keys inside the UI
  if (keyScopeUi && document.body.classList.contains('has-panel')) return;
  if (document.body.classList.contains('has-sheet') && uiLayout() !== 'desktop') return;
  if (gesture.active) return;                                                    // the map is in the pointer's hand
  const c = { x: viewW / 2, y: viewH / 2 }, step = 0.15;
  const panBy = (dx, dy) => { const w = screenToWorld(c.x + dx * viewW * step, c.y + dy * viewH * step); flyTo(w.x, w.y, { ms: 180 }); };
  switch (e.key) {
    case '+': case '=': zoomAt(c.x, c.y, (zoomAnchor ? mapState.targetZoom : mapState.zoom) * CAM.KEY_STEP, true); break;
    case '-': case '_': zoomAt(c.x, c.y, (zoomAnchor ? mapState.targetZoom : mapState.zoom) / CAM.KEY_STEP, true); break;
    case '0': case 'Home': recenterOnHome(true); break;
    case 'ArrowLeft': case 'a': panBy(-1, 0); break;  case 'ArrowRight': case 'd': panBy(1, 0); break;
    case 'ArrowUp': case 'w': panBy(0, -1); break;    case 'ArrowDown': case 's': panBy(0, 1); break;
    default: return;
  }
  e.preventDefault();
});

// ---------------- map controls ----------------
function mapFocusPoint() {                // centre of the free map area (phone: between HUD and dock)
  const r = document.getElementById('cornerButtons').getBoundingClientRect();
  return uiLayout() === 'phone' ? { x: viewW / 2, y: (46 + r.top) / 2 } : { x: viewW / 2, y: viewH / 2 };
}
document.getElementById('zoomInBtn').addEventListener('click', () => { const f = mapFocusPoint();
  zoomAt(f.x, f.y, (zoomAnchor ? mapState.targetZoom : mapState.zoom) * CAM.BUTTON_STEP, true); });
document.getElementById('zoomOutBtn').addEventListener('click', () => { const f = mapFocusPoint();
  zoomAt(f.x, f.y, (zoomAnchor ? mapState.targetZoom : mapState.zoom) / CAM.BUTTON_STEP, true); });
document.getElementById('homeBtn').addEventListener('click', () => recenterOnHome(true));
function updateMapControls() {
  document.getElementById('zoomInBtn').disabled = mapState.targetZoom >= maxZoom * 0.999;
  document.getElementById('zoomOutBtn').disabled = mapState.targetZoom <= minZoom * 1.001;
}

// ---------------- island popup placement ----------------
function positionIslandPopover() {        // desktop only: anchor the 360px card beside the base, flip if needed
  if (uiLayout() !== 'desktop') return;
  const isl = islandById[popupIslandId]; if (!isl) return;
  const sx = isl.x * mapState.zoom + mapState.offsetX, sy = isl.y * mapState.zoom + mapState.offsetY, r = isl.radius * mapState.zoom;
  const W = 360, h = popup.offsetHeight || 420, gap = 26;
  const b = bannerHitRects.find(q => q.id === isl.id);             // keep the nameplate beside the base uncovered
  const rightEdge = Math.max(sx + r + gap, b ? b.x + b.w + 12 : 0), leftEdge = Math.min(sx - r - gap, b ? b.x - 12 : Infinity);
  let left = rightEdge, flip = false;
  if (left + W > viewW - 14) { left = leftEdge - W; flip = true; }
  left = Math.max(14, Math.min(viewW - W - 14, left));
  const top = Math.max(72, Math.min(viewH - h - 14, sy - 60));
  popup.classList.toggle('is-left', flip);
  popup.style.setProperty('--ax', Math.round(left) + 'px');
  popup.style.setProperty('--ay', Math.round(top) + 'px');
  popup.style.setProperty('--py', Math.round(Math.max(16, Math.min(h - 28, sy - top - 6))) + 'px');
}
function frameIslandInView(island) {      // ease the base into the free map area (next to the sheet / clear of the desktop HUD + controls)
  const layout = uiLayout(), pr = popup.getBoundingClientRect();
  let free;
  if (layout === 'phone') free = { l: 0, t: 46, r: viewW, b: pr.top };
  else if (layout === 'landscape') free = { l: 64, t: 0, r: pr.left, b: viewH };
  else {                                   // desktop: keep the base (tower + nameplate) out from under the HUD, nav and map controls
    const hud = document.getElementById('hud').getBoundingClientRect(), nav = document.getElementById('cornerButtons').getBoundingClientRect();
    const mc = document.getElementById('mapControls').getBoundingClientRect();
    const safe = { l: 24, t: Math.max(hud.bottom, nav.bottom) + 16, r: (mc.width ? mc.left : viewW) - 24, b: viewH - 24 };
    const z = mapState.zoom, up = island.radius * z * 1.3 + 8, down = island.radius * z + 40, side = Math.max(island.radius * z, 60);
    const s = { x: island.x * z + mapState.offsetX, y: island.y * z + mapState.offsetY };
    const tx = Math.min(safe.r - side, Math.max(safe.l + side, s.x)), ty = Math.min(safe.b - down, Math.max(safe.t + up, s.y));
    if (Math.abs(tx - s.x) > .5 || Math.abs(ty - s.y) > .5) flyTo(island.x, island.y, { screenX: tx, screenY: ty, ms: 220 });
    return; }
  const s = { x: island.x * mapState.zoom + mapState.offsetX, y: island.y * mapState.zoom + mapState.offsetY };
  const m = island.radius * mapState.zoom + 40;
  if (s.x < free.l + m || s.x > free.r - m || s.y < free.t + m || s.y > free.b - m)
    flyTo(island.x, island.y, { screenX: (free.l + free.r) / 2, screenY: free.t + (free.b - free.t) * 0.55 });
}

updateZoomBounds();   // §6.9 step 4: WORLD and viewW/viewH exist now
const reachableLandmassIds = {};
for (const lm of landmasses) {
    const ids = [lm.id];
    for (const br of bridges) {
        if (br.a === lm.id) ids.push(br.b);
        else if (br.b === lm.id) ids.push(br.a);
    }
    reachableLandmassIds[lm.id] = ids;
}


window.addEventListener('pagehide', flushBotState);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushBotState(); });
let capitalCache = null, capitalCacheAt = 0;                // the bots' capitals, looked up a few times a second instead of per base
function isCapital(id) {
    if (id === playerIslandId && !SYSTEM && ownedIslands.has(id)) return true;   // (der Weltrechner hat keine eigene Hauptstadt – sein playerIslandId ist nur ein Platzhalter)
    const now = Date.now();
    if (!capitalCache || now - capitalCacheAt > 250) { const caps = new Set(); for (const bot of BOT_DEFS) { const c = botCapitalOf(bot.id); if (c !== null) caps.add(c); } capitalCache = caps; capitalCacheAt = now; }
    if (!capitalCache.has(id)) return false;
    const o = islandOwnerOf(id); return !!o && o !== 'player' && botCapitalOf(o) === id;     // still that bot's capital right now
}


function sentLossFor(raw, my, def, redPct) { return Math.min(raw, Math.round(Math.round(def * (1 - redPct / 100)) * raw / Math.max(1, my))); }
function fightEstimate(a) {                       // the fight as it stands right now (no side effects) - same maths as resolveAttack/resolveBotAttack
    const target = islandById[a.targetId]; if (!target) return null;
    const who = a.attackerBotId || 'player', bonus = a.attackBonus !== undefined ? a.attackBonus : attackFlatBonus(a.rawTroops);
    const my = Math.round((a.rawTroops + (bonus || 0)) * (a.atkTitle !== undefined ? a.atkTitle : titleMult(who, 'attack')) * (a.atkKraft || 1)), en = effectiveTroops(target), def = Math.round(effectiveDefense(target) * (1 - heroDefCut(a))), won = my > en + def;
    const red = a.attackerBotId ? (a.botShield ? a.shieldLossReductionPct : botMults(a.attackerBotId).shield) : (a.shieldLossReductionPct !== undefined ? a.shieldLossReductionPct : shieldLossReductionPct());
    return { my, en, won, myLoss: my - (won ? a.rawTroops - sentLossFor(a.rawTroops, my, def, red) : retreatSurvivorsPreview(a)), enLoss: won ? en : Math.min(en, my) };   // the counter ends at the troops really left
}
function fightDurationMs(est) {                   // a skirmish is over in ~4 s, a clash of millions takes ~12 s
    return Math.round(Math.max(4000, Math.min(12000, 4000 + 1500 * Math.log10(Math.max(1, est.my + est.en) / 1000))));
}
