// Teil 03e-kamera-eingabe.js: Kamera und Eingabe: Ziehen, Zoomen, Tippen, Bildgröße
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
// Verstärkung in Basis id vor dem Kampf: ihre Truppen (n) und was jeder Helfer mit seinen Werten an Verteidigung mitbringt (d).
// Im Kampf steckt sie schon in der Besatzung (verstVorKampf). Zuschauer kennen fremde Verstärkung nur aus dem Spähbericht.
function verstSchaetzung(id) {
    const ow = islandOwnerOf(id), nix = { n: 0, d: 0 };
    if (!ow || typeof verst === 'undefined' || (typeof verstDefPlus !== 'undefined' && id in verstDefPlus)) return nix;
    const L = verst.l.filter(v => v.t === id);
    if (!L.length) return ow !== 'player' && fremdGeheim() ? { n: spaehVerst(id), d: 0 } : nix;
    const mauer = ow === 'player' ? wallDefensePct() : botBld(ow, 'wall') * 2;
    return { n: L.reduce((s, v) => s + v.n, 0), d: Math.round(L.reduce((s, v) => s + verstWert(v.w, v.n, mauer), 0)) };
}
function fightEstimate(a) {                       // the fight as it stands right now (no side effects) - same maths as resolveAttack/resolveBotAttack
    const target = islandById[a.targetId]; if (!target) return null;
    const who = a.attackerBotId || 'player', bonus = a.attackBonus !== undefined ? a.attackBonus : attackFlatBonus(a.rawTroops);
    const vz = verstSchaetzung(target.id);       // Verstärkung (Botschaft) verteidigt mit – wie im echten Kampf
    const my = Math.round((a.rawTroops + (bonus || 0)) * (a.atkTitle !== undefined ? a.atkTitle : titleMult(who, 'attack')) * (a.atkKraft || 1)), en = effectiveTroops(target) + vz.n, def = Math.round((effectiveDefense(target) + vz.d) * (1 - heroDefCut(a))), won = my > en + def;
    const red0 = a.attackerBotId ? (a.botShield ? a.shieldLossReductionPct : botMults(a.attackerBotId).shield) : (a.shieldLossReductionPct !== undefined ? a.shieldLossReductionPct : shieldLossReductionPct());
    const red = Number.isFinite(red0) ? red0 : 0;   // (fremder Angriff: der Server streicht den Schild-Wert – dann ohne Schild schätzen, nie NaN)
    const e = { my, en, won, myLoss: my - (won ? a.rawTroops - sentLossFor(a.rawTroops, my, def, red) : retreatSurvivorsPreview(a)), enLoss: won ? en : Math.min(en, my) };   // the counter ends at the troops really left
    for (const k of ['my', 'en', 'myLoss', 'enLoss']) if (!Number.isFinite(e[k])) e[k] = k === 'myLoss' ? (e.won ? 0 : e.my || 0) : k === 'enLoss' ? (e.won ? e.en || 0 : 0) : 0;   // (fehlt ein Wert: sichere Zahl statt NaN)
    return e;
}
function fightDurationMs(est) {                   // a skirmish is over in ~4 s, a clash of millions takes ~12 s
    return Math.round(Math.max(4000, Math.min(12000, 4000 + 1500 * Math.log10(Math.max(1, est.my + est.en) / 1000))));
}
