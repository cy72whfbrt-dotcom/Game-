// Teil 03a-karte-hintergrund.js: Karte zeichnen: Grundlagen, Meer, Inseln, Gebiete, Wege
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

// Auf der Karte steht bei einer Hauptstadt ihre Burg-Stufe (1–25) – Alexander 4.10.: „nur das Level, das ich gerade bin“
function anzeigeStufe(id) { const ow = islandOwnerOf(id); return ow && typeof AUF !== 'undefined' && AUF && (id === playerIslandId || isCapital(id)) ? AUF.burgStufe(ow) : islandLevels[id] || 1; }
function baseLevelOf(isl) { return islandOwnerOf(isl.id) ? (islandLevels[isl.id] || 1) : (isl.neutralLevel || 1); }
