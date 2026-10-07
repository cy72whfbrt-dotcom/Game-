// Teil 03b-gebaeude-3d.js: 3D-Gebäude und Baukunst-Bilder der Basen
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

function paintTowerTier(g, ownerKey, detail, home, tier) {
  const K = isoKit(g, ISO_OY), own = ownerKey !== 'neutral' ? BAND[ownerKey] : null;
  const stone = STONE, roof = home ? '#d9a93f' : ROOF[ownerKey] || ROOF.neutral;
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
  const bucket = Math.pow(2, Math.round(Math.log2(sizePx) * 2) / 2);
  const key = kind + '|' + ownerKey + '|' + (home ? 1 : 0) + '|' + bucket + '|' + dpr + '|' + (tier || 0);
  let s = BUILDING_SPRITES.get(key); if (s) return s;
  const u = bucket / 64, c = document.createElement('canvas');
  c.width = Math.ceil(62 * u * dpr) + 2; c.height = Math.ceil(72 * u * dpr) + 2;
  const g = c.getContext('2d'); g.setTransform(u * dpr, 0, 0, u * dpr, 31 * u * dpr + 1, 48 * u * dpr + 1); g.lineJoin = 'round';
  const detail = bucket >= 28;
  if (kind === 'tower') paintTowerTier(g, ownerKey, detail, home, tier ?? 1); else if (kind === 'temple') paintTemple(g, ownerKey, detail); else if (kind === 'guardian') paintGuardianTemple(g, ownerKey, detail);
  else if (kind === 'gate' || kind === 'gateShut') paintGateIso(g, ownerKey, detail, kind === 'gate'); else paintMegaTemple(g, ownerKey, detail);
  BUILDING_SPRITES.set(key, s = { c, bucket }); return s;
}
// Pass-Tor auf der Karte: steht genau auf der Grenze im Pass (KARTE_ZONEN.paesse – die Grenze läuft dort gerade, 03a karteObjekte)
// → { x, y, r: Abstand Mitte–Schild, senk: Grenze läuft senkrecht } oder null
const TOR_PUNKT_ZOOM = 0.0015;                                                  // noch weiter draußen keine Tor-Punkte (Handy: über 500 Punkte wären nur Rauschen)
function torMitte(island) {
  if (island.type !== 'gate' || !karteBilder()) return null;
  if (island.torMitte) return island.torMitte;
  const p = island.pass, im = KB.img.tor_zu, x = p.x, y = p.y, senk = p.senk;
  return (island.torMitte = { x, y, senk, r: senk ? TOR_SENK.hoch * .07 : KARTE_MASS.tor * im.height / im.width * (1 - KETTE_ACHSE.tor_zu) * .9 });   // (senkrecht: Schild knapp unter dem Weg)
}
// (Bildschirm) Pass-Tor offen/zu; dunkel: noch im Nebel. Waagrechte Grenze: das Pass-Tor-Bild (Mauer in Kettenrichtung).
// Senkrechte Grenze: das Tor-Bild für Nord-Süd-Ketten, Weg genau auf dem Torpunkt, Kettenachse auf der Grenzlinie.
function drawTorBild(island, open, z, dunkel) {
  const tm = torMitte(island), n = open ? 'tor_offen' : 'tor_zu', w = KARTE_MASS.tor * z, mx = toSX(tm.x), my = toSY(tm.y);   // (fest in der Welt wie die Kette)
  if (w < 16) { if (dunkel || z < KARTE_BILD_ZOOM) return;                       // (ganz weit: die Pass-Punkte in Zonenfarbe, drawUebersichtZeichen) ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fillStyle = open ? '#d4ad66' : '#d24c40'; ctx.fill();   // weit draußen: Punkt (offen gold, zu rot)
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0f1217'; ctx.stroke(); return; }
  if (mx + w < 0 || mx - w > viewW || my + w < 0 || my - w > viewH) return;
  if (tm.senk) { const ns = open ? 'tor_senk_offen' : 'tor_senk_zu', hs = TOR_SENK.hoch * z, ws = hs * KB.img[ns].width / KB.img[ns].height;
    ctx.drawImage(kbBild(ns, ws * dpr), mx - ws * TOR_SENK.achse, my - hs * TOR_SENK.weg, ws, hs); return; }
  const h = w * KB.img[n].height / KB.img[n].width; ctx.drawImage(kbBild(n, w * dpr), mx - w / 2, my - h * KETTE_ACHSE[n], w, h);
}
// Ganz weit (wie die Karten-Testdatei): Pass-Punkte in der Farbe ihrer Stufe (noch zu: blass), die Zonen-Nummern und Thron und
// Tempel – auch unter dem Nebel (das Ziel aller ist immer zu sehen, wie RoK)
function drawUebersichtZeichen(z) {
  if (z >= KARTE_BILD_ZOOM || !karteBilder()) return;
  setScreen(ctx); const jetzt = Date.now(), r = viewW < 600 ? 6 : 5;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + (viewW < 600 ? 11 : 14) + 'px Georgia, serif'; ctx.lineJoin = 'round';
  for (const lm of landmasses) { if (lm.zone === ZONE_MITTE) continue; const t = lm.tier === 'guardian', x = toSX(lm.x), y = toSY(lm.y) + (t ? Math.max(HEILIGTUM_BREITE.guardian * z, 30) * .55 : 0);
    if (x < -20 || y < -20 || x > viewW + 20 || y > viewH + 20) continue;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,16,.8)'; ctx.strokeText(lm.name, x, y); ctx.fillStyle = '#e4c886'; ctx.fillText(lm.name, x, y); }
  for (const isl of islands) if (isl.bildR && !islandSeen(isl)) heiligtumBild(isl, z);
  for (const br of bridges) { const x = toSX(br.pass.x), y = toSY(br.pass.y); if (x < -10 || y < -10 || x > viewW + 10 || y > viewH + 10) continue;
    ctx.globalAlpha = passOpensAt(br) > jetzt ? .45 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = PASS_FARBE[br.pass.stufe]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0c0f14'; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawToreImNebel(view, z) {                                            // die Kette hat an jedem Tor eine Lücke: auch unerforschte Tore zeigen (der Nebel liegt darüber)
  if (!karteBilder() || KARTE_MASS.tor * z < 16) return;
  setScreen(ctx);
  const m = KARTE_MASS.tor;
  for (const br of bridges) { const isl = islandById[br.gateId]; if (!isl || islandSeen(isl)) continue;
    const tm = torMitte(isl); if (tm.x < view.l - m || tm.x > view.r + m || tm.y < view.t - m || tm.y > view.b + m) continue;
    drawTorBild(isl, false, z, true); }
}
const HEILIGTUM_BILD = { megaTemple: ['thron', .56, 64], tempel: ['tempel', .6, 30], waechtertempel: ['waechtertempel', .6, 30] };   // Bild, Fuß im Bild (y), kleinste Breite (px)
function heiligtumBild(island, z) {                                            // (Bildschirm) Thron bzw. Wächter-Tempel an seinem Weltpunkt
  const art = island.type === 'megaTemple' ? 'megaTemple' : island.tempelArt, [n, ay, minPx] = HEILIGTUM_BILD[art], im = KB.img[n];
  const w = Math.max(HEILIGTUM_BREITE[island.type === 'megaTemple' ? 'megaTemple' : 'guardian'] * z, minPx), h = w * im.height / im.width, x = toSX(island.x), y = toSY(island.y);
  if (x + w < 0 || x - w > viewW || y + h < 0 || y - h > viewH) return;
  ctx.drawImage(kbBild(n, w * dpr), x - w / 2, y - h * ay, w, h);
}
// Basen als KI-Bild (Alexander 7.10.): Stufe 1–100 gleichmäßig auf 15 Bilder, ALLE gleich groß (keine Größe nach Stufe); die Hauptstadt
// über ihre Kartenstufe (burgKarte). Darunter ein Ring in der Besitzer-Farbe (eigene blau, Bündnis grün, fremde rot); ganz weit Punkte wie bisher.
const BASIS_BREITE = 5500, BASIS_MIN_PX = 22, BASIS_RING = { player: '#3f86d8', bund: '#3fae6a', bot: '#c9423a' };
const BASIS_BILD = { img: [], offen: -1 };
const basisBildNr = L => Math.max(1, Math.min(15, Math.ceil(Math.max(1, L) * 15 / 100)));
function basisBild(nr) {                                                       // das Bild nr (1–15), lädt beim ersten Mal alle 15
  if (BASIS_BILD.offen < 0) { BASIS_BILD.offen = 15;
    for (let i = 1; i <= 15; i++) { const im = new Image(); im.onload = () => { if (im.naturalWidth) { BASIS_BILD.img[i] = im; requestRender(); } };
      im.src = 'bilder/basis_' + String(i).padStart(2, '0') + '.webp'; } }
  return BASIS_BILD.img[nr] || null;
}
function drawBasisBild(island, ownerKey, z) {                                  // (Bildschirm) → true, wenn das Bild gezeichnet ist
  const w = BASIS_BREITE * z; if (w < BASIS_MIN_PX) return false;
  const im = basisBild(basisBildNr(baseLevelOf(island))); if (!im) return false;
  const h = w * im.height / im.width, x = toSX(island.x), y = toSY(island.y);
  if (x + w < 0 || x - w > viewW || y + h < 0 || y - h > viewH) return true;
  const ow = islandOwnerOf(island.id), farbe = ownerKey === 'player' ? BASIS_RING.player : ow && bundFreund(ow, 'player') ? BASIS_RING.bund : ow ? BASIS_RING.bot : null;
  if (farbe) { ctx.beginPath(); ctx.ellipse(x, y + h * .12, w * .5, w * .2, 0, 0, Math.PI * 2); ctx.fillStyle = farbe + '55'; ctx.fill();
    ctx.lineWidth = Math.max(2, w * .03); ctx.strokeStyle = farbe; ctx.stroke(); }
  ctx.drawImage(im, x - w / 2, y - h * .72, w, h);
  if ((island.id === playerIslandId || isCapital(island.id)) && brennt(island.id)) drawBrand(x, y - h * .3, w / 64);   // eine geplünderte Hauptstadt brennt
  return true;
}
const basisGroesse = z => 1 + Math.max(0, Math.min(1, (0.04 - z) / 0.03));   // Basen bei mittlerem Zoom bis doppelt so groß (wie RoK: die Burg bleibt gut erkennbar), nah wie gehabt
function drawBuilding(island, ownerKey, z) {                                   // screen space (setScreen active)
  const kind = island.type === 'megaTemple' ? 'mega' : island.guardian ? 'guardian' : island.type === 'temple' ? 'temple' : 'tower';
  const home = island.id === playerIslandId, cap = home || isCapital(island.id);
  const tier = island.type === 'tower' ? towerTier(baseLevelOf(island)) : 1;
  const size = 2 * island.radius * z * 1.5 * (cap ? 1.3 : 1) * (island.type === 'tower' ? [1.15, 1, 1.05, 1.15, 1.25][tier] * basisGroesse(z) : island.type === 'megaTemple' ? 2.3 : 1.2), x = toSX(island.x), y = toSY(island.y);   // 3D sprites fill less of their box: drawn 1.5× larger
  if (island.bildR && KB.fertig) { heiligtumBild(island, z); return; }        // Thron und Wächter-Tempel: das KI-Bild (fest in der Welt, ganz weit nie winzig)
  if (island.type === 'gate') {                                                // gates: the gatehouse, an owner pennant on top
    if (torMitte(island)) { drawTorBild(island, ownerKey !== 'neutral' && !gateSettings(island).closed, z); return; }   // Karte wie RoK: das Pass-Tor (Bild) in der Kette, offen/zu wie heute
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
  if (kind === 'tower' && drawBasisBild(island, ownerKey, z)) return;          // Basen als KI-Bild (Stufe → Bild, alle gleich groß)
  if (kind === 'tower' && ownerKey !== 'player' && z < TOR_PUNKT_ZOOM && karteBilder()) return;   // ganz draußen: keine Punkt-Tapete fremder und freier Basen (wie RoK nur Zonen, Tempel, eigenes Gebiet)
  if (kind === 'tower' && ownerKey === 'neutral' && size < 30 && karteBilder()) {   // Karte wie RoK: freie Basen von weitem nur ein leiser Fleck, keine Symbol-Tapete (Alexander)
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, size * .07), 0, Math.PI * 2); ctx.fillStyle = 'rgba(40,30,18,.3)'; ctx.fill(); return; }
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
  if (cap && brennt(island.id)) drawBrand(x, y - 14 * u, u);                  // eine geplünderte Hauptstadt brennt (nur zu sehen)
}
function drawBrand(x, y, u) {                                                  // Flammen auf den Dächern und Rauch, der aufsteigt
  const t = performance.now();
  ctx.save();
  for (let i = 0; i < 5; i++) {                                                 // Rauch
    const p = ((t / 2600) + i / 5) % 1, sx = x + Math.sin(i * 2.1 + p * 3) * 8 * u + p * 10 * u, sy = y - 16 * u - p * 46 * u, r = (5 + p * 14) * u;
    ctx.fillStyle = 'rgba(40,36,34,' + (.42 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [dx, dy, s] of [[-12, 2, 1], [9, -4, 1.15], [0, -12, .9], [15, 6, .8], [-5, 8, .75]]) {   // Flammen
    const f = .75 + .25 * Math.sin(t / 90 + dx * 1.7) * Math.sin(t / 133 + dy), fx = x + dx * u, fy = y + dy * u, h = 13 * s * f * u;
    const gr = ctx.createRadialGradient(fx, fy - h * .3, 0, fx, fy - h * .3, h);
    gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(.35, 'rgba(255,150,40,.75)'); gr.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(fx, fy - h * .35, h * .5, h, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore(); liveAnimation = true;
}

// ===== BAUKUNST: the bases in 3D (baukunst.js), each model rendered once into a sprite (OW.game, lazy + cached) =====
// Until a sprite is ready, and without three.js or WebGL (offline), the drawn sprites above stay. Owner colour only on roofs
// and flags, the style comes from the region (Baustil-Wahl gibt es nicht mehr, Alexander 7.10.), the coat of arms on the flags; the level shows in the material.
const BAUSTILE = ['klassisch', 'nordisch', 'suedlich', 'morgenland', 'fernost'];
const BK_K = ISLAND_RADIUS * .12, BK_SCALE = { mega: 2.2, tempel: 1.6, waechter: 1.6 }, BK_ELEM = ['nebel', 'gezeiten', 'fels', 'sonne'], BK_GRADE = { throne: 'thron', guardian: 'waechter' };
function bk3d() { const G = window.OW && OW.game; if (!G || G.off) return null; if (!G.onReady) G.onReady = () => requestRender(); return G; }
let bkGuards = null;
function bkModel(island, ownerKey, open) {                                       // → [cache id, model config]
  if (island.type === 'gate') { const gr = BK_GRADE[island.gateKind] || 'grenz'; return ['t|' + ownerKey + '|' + gr + '|' + (open ? 1 : 0), { model: 'tor', owner: ownerKey, variant: { grade: gr, open, houseOnly: true } }]; }
  if (island.type === 'megaTemple') return ['m|' + ownerKey, { model: 'mega', owner: ownerKey }];
  const o = islandOwnerOf(island.id);
  if (island.guardian) { bkGuards = bkGuards || islands.filter(i => i.guardian).map(i => i.id); const el = BK_ELEM[Math.max(0, bkGuards.indexOf(island.id)) % 4];
    return ['w|' + ownerKey + '|' + el, { model: 'waechter', owner: ownerKey, variant: { element: el } }]; }
  if (island.type === 'temple') { const held = templeHoldSince[island.id] ? Date.now() - templeHoldSince[island.id] : -1, sz = !o ? 'klein' : held >= TEMPLE_HOLD_STREAK_MS ? 'gross' : 'mittel';   // the longer it is held, the bigger
    return ['p|' + ownerKey + '|' + sz, { model: 'tempel', owner: ownerKey, variant: { size: sz, bonus: 'gems' } }]; }
  const lv = baseLevelOf(island), step = lv >= 100 ? 100 : Math.max(1, Math.floor(lv / 10) * 10 + (lv % 10 >= 5 ? 5 : 0));   // a new design every 10 levels, small additions at every 5
  const home = island.id === playerIslandId, cap = home || isCapital(island.id), bs = { style: BAUSTILE[island.landmassId % 5], cap: 'huegel' };   // the style of its region
  const seed = o === 'player' ? 7 : o ? (parseInt(String(o).replace(/\D/g, ''), 10) || 7) * 13 + 5 : 1 + island.id % 4, cr = o ? crestFor(o) : null;
  const crest = cr ? { div: cr.div, t: [1, 0, 2][cr.ink] || 0 } : null;
  return ['b|' + step + '|' + ownerKey + '|' + (cap ? bs.cap : '') + '|' + bs.style + '|' + seed + '|' + (crest ? crest.div + '.' + crest.t : ''),
          { model: 'basis', level: step, owner: ownerKey, capital: cap, capStyle: bs.cap, style: bs.style, seed, crest }];
}
const BK_LAST = new Map();                                                       // island → id of the 3D sprite drawn last
function bkSprite(island, ownerKey, open, z) {                                   // → { s: sprite, W: width in px } or null
  const G = bk3d(); if (!G) return null;
  const [id, c] = bkModel(island, ownerKey, open), k = BK_K * z * (BK_SCALE[c.model] || 1), need = 2 * G.frameOf(c).v * k * dpr;
  let s = G.get(id, c, need <= 140 ? 128 : need <= 300 ? 256 : 512);
  if (s) BK_LAST.set(island.id, id); else { const o = BK_LAST.get(island.id); s = o && G.peek(o) || null; }   // new look (upgrade, +5 step) still rendering: the old 3D sprite stays, not the big drawn one
  return s ? { s, W: 2 * s.v * k } : null;                                     // W from the sprite's own frame: an old sprite keeps its size
}
function bkDraw(b, x, y) { if (!b) return false; ctx.drawImage(b.s.c, x - b.W / 2, y - b.W * b.s.ay, b.W, b.W); return true; }   // (x, y) = the ground centre

function bannerModel(island) {
  const owner = islandOwnerOf(island.id), isTemple = island.type === 'temple' || island.type === 'megaTemple';
  const scouted = scoutedIslands.has(island.id), level = anzeigeStufe(island.id);
  const tName = island.type === 'megaTemple' ? 'Mega-Tempel' : island.guardian ? 'Wächter-Tempel' : 'Tempel';
  const boss = bossAt(island.id);
  if (boss) return { kind: 'bot', glyph: 'attack', name: boss.name, troops: fmtCompact(boss.troops), def: null, level, temple: false, p: 4.8 };
  const tag = owner && typeof bundTagVon === 'function' ? bundTagVon(owner) : '';   // Bündnis-Kürzel: eigenes Chip vor dem Namen
  if (owner === 'player') {                                                       // eigene Basen: Name nur an der Hauptstadt (Farbe + Wappen reichen), dafür ohne Vorrang
    const cap = island.id === playerIslandId;
    return { kind: 'player', glyph: isTemple ? 'temple' : island.type === 'gate' ? 'lock' : cap ? 'castle' : 'crest:player:' + crestKey(),
             name: cap ? 'Hauptstadt' : '', tag: '', cap, troops: fmtCompact(islandTroops[island.id] || 0), def: null, level, temple: isTemple, p: cap || isTemple ? 4 : 3.5 };
  }
  if (owner) { const cap = botCapitalOf(owner) === island.id;
    return { kind: bundFreund('player', owner) ? 'ally' : 'bot', glyph: isTemple ? 'temple' : cap ? 'castle' : 'crest:' + owner, name: botById[owner].name, tag, cap,
             troops: scouted ? fmtCompact(islandTroops[island.id] || 0) : '?', def: null, level, temple: isTemple, p: cap || isTemple ? 3.2 : 3 }; }
  if (island.type === 'gate') return { kind: 'neutral', glyph: 'lock', name: island.gateKind === 'throne' ? 'Thron-Tor' : island.gateKind === 'guardian' ? 'Wächter-Tor' : 'Grenztor',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null, level, temple: false, p: 2.5 };
  return { kind: 'neutral', glyph: isTemple ? 'temple' : 'question', name: isTemple ? tName : 'Neutral',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null,
           level, temple: isTemple, mega: island.type === 'megaTemple', p: isTemple ? 2 : 0, filler: !isTemple };
}

// Fahnen-Stufen: Breite passt sich dem Text an (tw = höchstens so breites Textfeld), Schrift mind. 11 px, Name bis 14 Zeichen;
// K (kompakt) und C nur Wappen + Stufe + Truppenzahl, N (neutral, nicht gespäht) nur Wappen + Stufe
const TIER = { A: { H: 34, av: 34, fn: 12.5, fs: 11.5, pad: 8, lv: 17, tw: 140, max: 14 },
               B: { H: 30, av: 28, fn: 11,   fs: 11,   pad: 7, lv: 16, tw: 120, max: 14 },
               K: { H: 26, av: 26, fn: 11,   fs: 12,   pad: 6, lv: 16, tw: 84,  max: 0 },
               C: { H: 22, av: 22, fn: 11,   fs: 11,   pad: 4, lv: 15, tw: 62,  max: 0 },
               N: { H: 22, av: 22, fn: 11,   fs: 11,   pad: 0, lv: 15, tw: 0,   max: 0 } };
const PLATE = { player: { top: '#2b5d9b', bot: '#183a66', line: 'rgba(140,192,255,.7)',  hi: '#8cc0ff' },
                bot:    { top: '#8e2b24', bot: '#5a1814', line: 'rgba(255,141,130,.62)', hi: '#ff8d82' },
                neutral:{ top: '#474a51', bot: '#2f3136', line: 'rgba(198,201,207,.42)', hi: '#c6c9cf' },
                ally:   { top: '#2c7a4b', bot: '#17472b', line: 'rgba(140,230,170,.62)', hi: '#8ce6aa' } };   // Bündnis-Mitglieder: grün
const trunc = (s, n) => s.length <= n ? s : s.slice(0, n - 1) + '…';
