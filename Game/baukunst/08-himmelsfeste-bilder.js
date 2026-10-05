// Teil 08-himmelsfeste-bilder.js: Stufe 9 Himmelsfeste (90–100) und Anschluss ans Spiel (Modell → Kartenbild, Zwischenspeicher)


// ===== Open Water Baukunst · Tier 9 · Himmelsfeste (lv 90-100) =====
// White marble + gold + glowing crystal. Silhouette: a FLOATING ROCK ISLAND (inverted, flat-shaded rock cone with jade and
// white crystals hanging underneath) hovering high above a round marble-rimmed lake, tethered by four gold chains to marble
// pylons, waterfalls pouring from marble spouts on its rim into the lake (they flank the rock cone in the map view). On the island: a compact marble citadel with a ring wall,
// six slim towers with owner spires and the tallest central spire of all tiers.
// Step 1 (95-99): three small satellite rocks with little towers orbit the island, three more waterfalls, gold trims on all
// eaves, banners on the keep. Step 2 (lv 100): a golden crown on the central spire and a slowly turning armillary sphere above it.
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const mats = {};
  const mat = (k, o) => { if (mats[k]) return mats[k]; const m = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)); if (o.map) { m.bumpMap = o.map; if (o.bumpScale == null) m.bumpScale = 1.0; } return mats[k] = m; };
  const MLT = () => mat('marbleLt9', { color: 0xfcfaf5, roughness: .45 });                                         // cornices, trims, balusters
  const MDK = () => mat('marbleDk9', { color: 0xe2ddd3, map: OW.TEX.marble(), roughness: .6, bumpScale: .5 });   // plinths, basin rim, pylons
  const ROCK = () => mat('rock9', { color: 0x5b5550, roughness: .95 });                                          // the floating rock
  const ROCK2 = () => mat('rock9b', { color: 0x46413d, roughness: .95 });                                        // stalactites
  const VINE = () => mat('vine9', { color: 0x4d7b36, roughness: .9 });
  const LILY = () => mat('lily9', { color: 0x5e9c46, roughness: .7 });
  const FOAM = () => mat('foam9', { color: 0xf1faf6, roughness: .5 });
  const CRYJ = () => mat('cryJ9', { color: 0x9ef3d0, emissive: 0x2fd394, emissiveIntensity: .55, roughness: .22, metalness: .1 });   // jade crystal
  const CRYW = () => mat('cryW9', { color: 0xf7fffb, emissive: 0xd4fff0, emissiveIntensity: .3, roughness: .22, metalness: .1 });    // white crystal
  const CORE = () => mat('core9', { color: 0xfff7e0, emissive: 0xffe6a6, emissiveIntensity: 2.3, roughness: .4, flatShading: false });

  // ---- batching: many small repeated parts become one mesh per material ----
  function Batch(root) { this.root = root; this.m = new Map(); }
  Batch.prototype.addM = function (m, geo, mt) { const gg = geo.index ? geo.toNonIndexed() : geo; if (gg !== geo) geo.dispose(); if (mt) gg.applyMatrix4(mt); let l = this.m.get(m); if (!l) this.m.set(m, l = []); l.push(gg); };
  Batch.prototype.add = function (m, geo, x, y, z, ry = 0) { this.addM(m, geo, new T.Matrix4().makeRotationY(ry).setPosition(x, y, z)); };
  Batch.prototype.box = function (m, w, h, d, x, y, z, ry = 0) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); K.worldUV(g, .25); this.add(m, g, x, y, z, ry); };
  Batch.prototype.cyl = function (m, rt, rb, h, x, y, z, seg = 8) { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); K.worldUV(g, .25, true); this.add(m, g, x, y, z); };
  function mergeGeos(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2)); bg.computeBoundingSphere(); return bg;
  }
  Batch.prototype.flush = function () {
    for (const [m, list] of this.m) { const mesh = new T.Mesh(mergeGeos(list), m); mesh.castShadow = !m.transparent; mesh.receiveShadow = true; this.root.add(mesh); }
    this.m.clear();
  };

  // ---- geometry helpers. Angles: phi = 0 faces +z (front), phi = PI/2 faces +x; a point is (r sin phi, r cos phi) ----
  const PI = Math.PI, D = PI / 180, V2 = (pts) => pts.map(([r, y]) => new T.Vector2(r, y));
  const px = (r, f) => r * Math.sin(f), pz = (r, f) => r * Math.cos(f);
  function lathe(p, pts, m, x, y, z, seg = 24, o = {}) { const g = new T.LatheGeometry(V2(pts), seg); K.worldUV(g, o.uv || .35, true); return K.put(p, g, m, x, y, z, o); }
  // an annular sector r0..r1 from phi p0 to p1, extruded up by h (flat when h = 0)
  function sectorGeo(r0, r1, p0, p1, h, n = 10) {
    const s = new T.Shape();
    for (let i = 0; i <= n; i++) { const f = p0 + (p1 - p0) * i / n; if (i) s.lineTo(px(r1, f), -pz(r1, f)); else s.moveTo(px(r1, f), -pz(r1, f)); }
    for (let i = n; i >= 0; i--) { const f = p0 + (p1 - p0) * i / n; s.lineTo(px(r0, f), -pz(r0, f)); }
    s.closePath();
    const g = h > 0 ? new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 }) : new T.ShapeGeometry(s);
    g.rotateX(-PI / 2); K.worldUV(g, .25); return g;
  }
  // a rough, flat-shaded lathe: radius and height jitter grow with depth (amp(y) → 0 keeps a ring clean)
  function rockGeo(prof, seg, amp, seed, fix) {
    const g = new T.LatheGeometry(V2(prof), seg), R = K.rng(seed), n = prof.length, J = [];
    for (let i = 0; i < seg * n; i++) J.push([R() - .5, R() - .5]);
    const pos = g.attributes.position;
    for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) { if (prof[j][0] < .01) continue;
      const k = i * n + j, jj = J[(i % seg) * n + j], a = amp(prof[j][1]); if (!a || (fix && fix(i % seg, j))) continue;
      const s = 1 + jj[0] * a; pos.setX(k, pos.getX(k) * s); pos.setZ(k, pos.getZ(k) * s); pos.setY(k, pos.getY(k) + jj[1] * a * 2.2); }
    g.computeVertexNormals(); K.worldUV(g, .3, true); return g;
  }
  // a crystal: hexagonal prism with a pointed end, along +y from the foot
  const gemGeo = (r, h) => new T.LatheGeometry(V2([[.001, 0], [r, h * .16], [r * .9, h * .7], [.001, h]]), 6);
  const _q = new T.Quaternion(), _v = new T.Vector3(), _s = new T.Vector3(1, 1, 1), _p = new T.Vector3(), UPV = new T.Vector3(0, 1, 0);
  // gem at (x,y,z) pointing along (tilt from +y, yaw phi)
  function gem(B, m, r, h, x, y, z, tilt, yaw) {
    _v.set(Math.sin(tilt) * Math.sin(yaw), Math.cos(tilt), Math.sin(tilt) * Math.cos(yaw)).normalize(); _q.setFromUnitVectors(UPV, _v);
    B.addM(m, gemGeo(r, h), new T.Matrix4().compose(_p.set(x, y, z), _q, _s));
  }
  // a hanging cluster: one long crystal and a few shorter ones around it, pointing down and a little outward
  function cluster(B, x, y, z, yaw, size, seed, big) {
    const R = K.rng(seed), n = 3 + (R() * 2 | 0);
    gem(B, big ? CRYJ() : (R() < .5 ? CRYJ() : CRYW()), .17 * size, 1.25 * size, x, y, z, PI - .35, yaw);
    for (let i = 0; i < n; i++) { const yw = yaw + (i / n - .5) * 2.4 + (R() - .5) * .4, l = (.45 + R() * .45) * size;
      gem(B, i % 2 ? CRYW() : CRYJ(), .1 * size + R() * .04, l, x + Math.sin(yw) * .12, y + .05, z + Math.cos(yw) * .12, PI - .5 - R() * .5, yw); }
  }
  function archShape(w, h) { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, PI, false); s.lineTo(-w / 2, 0); return s; }
  const archGeo = (w, h, d) => new T.ExtrudeGeometry(archShape(w, h), { depth: d, bevelEnabled: false, curveSegments: 3 });
  // an arched glowing window with a frame (face normal = +z turned by ry)
  function win(B, x, y, z, ry, w, h, frame) {
    const f = archGeo(w + .14, h + .08, .05); f.translate(0, -.05, 0); B.add(frame || MLT(), f, x, y, z, ry);
    B.add(M.window(), archGeo(w, h, .08), x, y, z, ry);
  }
  let _bal = null;
  const balGeo = () => (_bal || (_bal = new T.LatheGeometry(V2([[.055, 0], [.034, .11], [.06, .2], [.038, .29]]), 5))).clone();
  // a balustrade from (x1,z1) to (x2,z2) standing at y
  function balustrade(B, x1, z1, x2, z2, y) {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = -Math.atan2(z2 - z1, x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    B.box(MLT(), len, .07, .18, mx, y, mz, ry); B.box(MLT(), len + .04, .07, .2, mx, y + .36, mz, ry);
    const n = Math.max(1, Math.round(len / .24)); for (let i = 0; i < n; i++) { const t = (i + .5) / n; B.add(MLT(), balGeo(), x1 + (x2 - x1) * t, y + .07, z1 + (z2 - z1) * t); }
    for (const [x, z] of [[x1, z1], [x2, z2]]) { B.box(MLT(), .22, .5, .22, x, y, z); B.add(M.gold(), new T.SphereGeometry(.08, 6, 4), x, y + .56, z); }
  }

  // ---- layout ----
  const IY = 11.4;                                          // world height of the floating island's top rock face
  const RI = 6.62, LIP0 = 5.9, LIP1 = 6.72, MO0 = 5.3;       // island top radius, grass lip, moat inner edge
  const CY = .95, PR = 5.32;                                 // courtyard level on the island, plinth radius
  const WR = 4.35, WH = 2.0;                                 // ring wall centre radius and height
  const TR = .78, TH = 4.3;                                  // slim towers: radius, shaft height
  const LAKE = 8.62, WY = .36, PL = 11.0;                    // lake radius, water level, plaza radius
  const PYR = 9.1;                                           // pylon radius
  const A1 = CY + 3.45, P1 = A1 + .67, B1 = P1 + 2.8, G1 = B1 + .4, L1 = G1 + 1.3;   // keep: lower drum top, parapet top, upper drum top, gallery floor, lantern top
  const SPY = L1 + .2, SPH = 5.3;                            // central spire foot and height (island coordinates)
  const TOWERS = [-150, -90, -30, 30, 90, 150].map(a => a * D);
  const FALLS0 = [-25, 115, 205].map(a => a * D), FALLS1 = [68, 162, 292].map(a => a * D);   // step 0 falls flank the rock cone in the map view
  const CHAIN = { r: 4.45, y: -3.8 }, EYE = { r: PYR - .5, y: 4.05 };   // chains moor the rock cone at mid-height
  const CRUST = [[0, -1.9], [5.9, -1.9], [6.25, -1.55], [6.55, -.95], [6.75, -.4], [RI, 0], [0, 0]];
  const ROCKP = [[0, -8.6], [.36, -8.3], [.9, -7.7], [1.6, -6.9], [2.45, -5.9], [3.4, -4.85], [4.35, -3.8], [5.2, -2.75], [6.02, -1.62], [0, -1.62]];
  const NEEDLE = [[1.7, 0], [1.26, .36], [1.02, 1.12], [.74, 2.15], [.47, 3.25], [.22, 4.25], [.06, 5.05], [.001, SPH]];
  const TROOF = [[1.3, 0], [1.1, .27], [.86, .9], [.61, 1.8], [.34, 2.77], [.1, 3.56], [.001, 3.72]];
  const rockR = (y) => { for (let i = 1; i < ROCKP.length - 1; i++) { const [r1, y1] = ROCKP[i - 1], [r2, y2] = ROCKP[i]; if (y <= y2 && y >= y1) return r1 + (r2 - r1) * (y - y1) / (y2 - y1); } return 0; };

  // a slim marble tower on the ring wall with a bell-cast owner spire
  function tower(B, p, ctx, phi, st, flag) {
    const x = px(WR, phi), z = pz(WR, phi), S = { seg: 16 };
    K.cyl(p, TR + .12, TR + .18, .55, MDK(), x, CY, z, S);
    K.cyl(p, TR, TR + .03, TH, M.marble(), x, CY, z, S);
    K.cyl(p, TR + .05, TR + .05, .1, M.gold(), x, CY + 2.45, z, S);
    K.cyl(p, TR + .2, TR, .34, MLT(), x, CY + TH - .34, z, S);
    K.cyl(p, TR + .2, TR + .2, .12, MLT(), x, CY + TH, z, S);
    const ry = CY + TH + .12;
    lathe(p, TROOF, ctx.roof, x, ry, z, 16);
    if (st >= 1) K.torus(p, TR + .52, .055, M.gold(), x, ry + .03, z, { seg: 24, seg2: 5 });
    const tip = ry + 3.72;
    K.sphere(p, .1, M.gold(), x, tip - .03, z, { seg: 8, seg2: 6 });
    if (flag && ctx.owned) K.flag(p, { x, y: tip - .1, z, poleH: 1.15, w: 1.5, h: .42, mat: ctx.cloth, swallow: true, dir: .35, knob: M.gold(), poleMat: M.gold() });
    else K.cone(p, .04, .55, M.gold(), x, tip, z, { seg: 5 });
    for (const [da, y, h] of [[0, CY + 1.1, .6], [0, CY + 3.0, .72], [-.9, CY + 1.85, .5], [.9, CY + 3.45, .45]]) { const b = phi + da; win(B, px(TR + .01, b) + x, y, pz(TR + .01, b) + z, b, .22, h); }
    return tip;
  }

  // a small floating rock with a little tower (step 1: three of them orbit the island)
  function satellite(p, ctx, st, seed, sc) {
    const s = new T.Group(); p.add(s); const B = new Batch(s), R = K.rng(seed);
    const prof = [[0, -2.0], [.3, -1.82], [.75, -1.35], [1.05, -.78], [1.18, -.3], [1.12, 0], [0, 0]].map(([r, y]) => [r * sc, y * sc]);
    K.put(s, rockGeo(prof, 11, (y) => y < -.25 ? .16 : 0, seed), ROCK(), 0, 0, 0);
    K.cyl(s, 1.1 * sc, 1.14 * sc, .14, M.grass(), 0, 0, 0, { seg: 14, cast: false });
    const t = R() * PI * 2, tx = Math.sin(t) * .2, tz = Math.cos(t) * .2;
    K.cyl(s, .5, .55, .3, MDK(), tx, .1, tz, { seg: 12 });
    K.cyl(s, .4, .42, 1.45, M.marble(), tx, .4, tz, { seg: 12 });
    K.cyl(s, .43, .43, .07, M.gold(), tx, 1.2, tz, { seg: 12 });
    K.cyl(s, .52, .42, .16, MLT(), tx, 1.85, tz, { seg: 12 });
    lathe(s, [[.6, 0], [.47, .18], [.32, .52], [.14, .88], [.001, 1.05]], ctx.roof, tx, 2.01, tz, 12);
    K.torus(s, .6, .035, M.gold(), tx, 2.02, tz, { seg: 16, seg2: 4 });
    K.sphere(s, .07, M.gold(), tx, 3.06, tz, { seg: 6, seg2: 4 }); K.cone(s, .03, .35, M.gold(), tx, 3.08, tz, { seg: 5 });
    for (let k = 0; k < 3; k++) { const b = k * 2.1 + .4; win(B, tx + Math.sin(b) * .41, .75, tz + Math.cos(b) * .41, b, .16, .38); }
    K.bush(s, -tx * 3.2, .05, -tz * 3.2, .26);
    cluster(B, 0, -1.75 * sc, 0, R() * 6, .75, seed + 3, true);
    B.flush();
    return s;
  }

  // the gold armillary sphere of level 100: fixed meridian and horizon bands, a polar axis, a turning inner cage, a glowing core
  function armillary(p, y) {
    const band = (R, w, t) => { const g = new T.LatheGeometry(V2([[R - t, -w / 2], [R + t, -w / 2], [R + t, w / 2], [R - t, w / 2], [R - t, -w / 2]]), 48); return g; };
    const arm = new T.Group(); arm.position.set(0, y, 0); p.add(arm);
    const add = (par, geo, m, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, m); o.rotation.set(rx, ry, rz); o.castShadow = true; o.userData.noOutline = true; par.add(o); return o; };
    arm.scale.setScalar(1.5);
    add(arm, band(1.02, .13, .035), M.gold(), PI / 2);                     // meridian (vertical)
    add(arm, band(1.1, .1, .03), M.gold());                                // horizon (horizontal)
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; if (Math.abs(Math.sin(a)) > .97) continue; add(arm, new T.SphereGeometry(.045, 6, 4), M.gold()).position.set(Math.cos(a) * 1.07, Math.sin(a) * 1.07, 0); }
    const pol = new T.Group(); pol.rotation.z = .55; arm.add(pol);          // polar axis tilted inside the meridian plane
    add(pol, new T.CylinderGeometry(.03, .03, 2.0, 6), M.gold());
    for (const s of [-1, 1]) add(pol, new T.SphereGeometry(.08, 8, 6), M.gold()).position.y = s * 1.0;
    const spin = new T.Group(); pol.add(spin);
    add(spin, new T.TorusGeometry(.8, .04, 5, 40), M.gold(), PI / 2);                  // equator
    add(spin, band(.84, .12, .025), M.gold(), .41);                                   // ecliptic band
    add(spin, new T.TorusGeometry(.76, .03, 5, 40), M.gold());                         // colures
    add(spin, new T.TorusGeometry(.76, .03, 5, 40), M.gold(), 0, PI / 2);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, m = add(spin, new T.BoxGeometry(.05, .16, .05), M.gold()); m.position.set(Math.cos(a) * .9, 0, Math.sin(a) * .9); m.position.applyAxisAngle(new T.Vector3(1, 0, 0), .41); m.rotation.x = .41; }
    for (const [a, m] of [[.5, CRYJ()], [2.6, CRYW()], [4.4, CRYJ()]]) add(spin, new T.IcosahedronGeometry(.075, 0), m).position.set(Math.cos(a) * .8, 0, Math.sin(a) * .8);
    const core = add(arm, new T.IcosahedronGeometry(.26, 2), CORE());
    for (let i = 0; i < 8; i++) { const r = add(arm, new T.ConeGeometry(.035, .22, 4), M.gold()); const a = i / 8 * PI * 2; r.position.set(Math.cos(a) * .34, 0, Math.sin(a) * .34); r.rotation.z = -PI / 2; r.rotation.y = -a; }
    K.tick((t) => { arm.rotation.y = t * .16; spin.rotation.y = t * .5; core.scale.setScalar(1 + Math.sin(t * 2.2) * .06); });
    return arm;
  }

  function build(ctx) {
    const g = new T.Group(), st = OW.stepOf(ctx.level), BG = new Batch(g);

    // ================= ground: marble plaza, round basin with a lake, four pylons =================
    K.cyl(g, PL + .3, PL + .45, .1, MDK(), 0, 0, 0, { seg: 64, cast: false });
    K.cyl(g, PL, PL + .05, .2, M.plaza(), 0, 0, 0, { seg: 64, uv: .25, cast: false });
    K.torus(g, PL - .12, .045, M.gold(), 0, .2, 0, { seg: 72, seg2: 4 });
    K.water(g, { r: LAKE + .05, y: WY });
    lathe(g, [[LAKE - .05, .2], [9.62, .2], [9.58, .56], [9.44, .7], [8.72, .7], [LAKE - .05, .6], [LAKE - .05, .2]], MDK(), 0, 0, 0, 72);
    K.torus(g, 9.08, .04, M.gold(), 0, .7, 0, { seg: 72, seg2: 4 });
    // pylons with gold caps, jade crystal finials and a chain eye
    const eyes = [];
    for (let i = 0; i < 4; i++) {
      const f = i * PI / 2, x = px(PYR, f), z = pz(PYR, f), q = { ry: f };
      K.box(g, 1.75, .55, 1.75, MDK(), x, .2, z, q);
      K.box(g, 1.4, .24, 1.4, MLT(), x, .75, z, q);
      K.cyl(g, .54, .72, 3.6, M.marble(), x, .99, z, { seg: 4, ry: f + PI / 4 });
      K.cyl(g, .6, .62, .14, M.gold(), x, 3.55, z, { seg: 4, ry: f + PI / 4 });
      K.box(g, .98, .22, .98, MLT(), x, 4.59, z, q);
      K.pyramid(g, 1.3, 1.3, 1.1, ctx.roof, x, 4.81, z, q);
      gem(BG, CRYJ(), .15, .75, x, 5.8, z, 0, 0);
      const eye = new T.Mesh(new T.TorusGeometry(.17, .055, 5, 12), M.gold()); eye.position.set(px(EYE.r, f), EYE.y, pz(EYE.r, f)); eye.rotation.y = f + PI / 2; eye.castShadow = true; g.add(eye);
      K.box(g, .3, .3, .16, M.gold(), px(PYR - .44, f), EYE.y - .15, pz(PYR - .44, f), q);
      eyes.push(f);
    }
    // lanterns on the plaza between the pylons
    for (let i = 0; i < 4; i++) { const f = PI / 4 + i * PI / 2; K.lantern(g, px(10.3, f), .2, pz(10.3, f), { h: 1.35 }); }
    // lily pads and a few white flowers on the lake, foam where the falls land
    { const R = K.rng(91); for (let i = 0; i < 14; i++) { const f = R() * PI * 2, r = 7.3 + R() * 1.0; if ([...FALLS0, ...FALLS1].some(a => Math.abs(Math.atan2(Math.sin(f - a), Math.cos(f - a))) < .2)) continue; if (Math.abs(Math.atan2(Math.sin(f * 4), Math.cos(f * 4))) < .6) continue;
      const pad = new T.CylinderGeometry(.3 + R() * .12, .3 + R() * .12, .03, 9); pad.translate(0, .015, 0); BG.add(LILY(), pad, px(r, f), WY, pz(r, f), R() * 6);
      if (i % 3 === 0) { const fl = new T.ConeGeometry(.1, .14, 6); fl.translate(0, .07, 0); BG.add(FOAM(), fl, px(r, f) + .08, WY + .03, pz(r, f)); } } }
    const falls = st >= 1 ? [...FALLS0, ...FALLS1] : FALLS0;
    for (const f of falls) for (const [dr, dt, s] of [[.4, 0, .45], [.85, .08, .3], [.2, -.11, .32], [.1, .1, .28], [.7, -.09, .26]]) { const b = new T.IcosahedronGeometry(s, 0); b.scale(1.2, .35, 1); BG.add(FOAM(), b, px(7.0 + dr, f + dt), WY - .02, pz(7.0 + dr, f + dt), f * 3); }

    // ================= the floating island =================
    const isl = new T.Group(); isl.position.y = IY; g.add(isl); const B = new Batch(isl);
    K.put(isl, rockGeo(CRUST, 20, () => 0, 3), M.earth(), 0, 0, 0);
    K.put(isl, rockGeo(ROCKP, 20, (y) => y < -1.9 ? .13 : 0, 17, (i, j) => i % 5 === 0 && ROCKP[j][1] === CHAIN.y), ROCK(), 0, 0, 0);
    // stalactites and crystal clusters underneath
    { const R = K.rng(23);
      for (const [f, y, r, h] of [[60, -3.8, .6, 1.8], [160, -4.85, .55, 2.0], [245, -3.8, .65, 1.7], [15, -5.9, .5, 1.6], [305, -4.85, .55, 1.9], [200, -6.9, .42, 1.4], [110, -6.9, .4, 1.3], [345, -2.75, .5, 1.2], [215, -2.75, .5, 1.3], [130, -2.75, .45, 1.1]]) {
        const a = f * D, rr = rockR(y) - .35, c = new T.ConeGeometry(r, h, 5); c.rotateX(PI); c.translate(0, -h / 2 + .3, 0); B.add(ROCK2(), c, px(rr, a), y, pz(rr, a), R() * 3); }
      for (const [f, y, sz] of [[28, -3.3, .95], [140, -4.2, 1.05], [228, -3.1, .9], [300, -5.5, .85], [72, -6.3, .75], [188, -6.4, .7], [335, -7.4, .55], [110, -4.4, .8]]) {
        const a = f * D, rr = rockR(y) - .05, b = new T.DodecahedronGeometry(sz, 0); b.scale(1, .75, .9); B.add(ROCK(), b, px(rr, a), y, pz(rr, a), R() * 6); }
      gem(B, CRYJ(), .42, 1.3, 0, -8.35, 0, PI, 0);
      for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + .3; gem(B, i % 2 ? CRYJ() : CRYW(), .16 + R() * .06, .7 + R() * .5, px(.4, a), -8.1, pz(.4, a), PI - .6, a); }
      for (const [f, y, s, sd] of [[40, -4.85, 1.1, 1], [205, -4.85, 1.15, 2], [125, -5.9, .9, 3], [290, -5.9, .95, 4], [325, -3.8, .95, 5], [118, -3.8, .8, 6], [62, -6.9, .75, 7], [250, -6.9, .75, 8], [170, -7.5, .6, 9]]) {
        const a = f * D, rr = rockR(y) - .25; cluster(B, px(rr, a), y, pz(rr, a), a, s, sd); } }
    // gold mooring rings set into the rock
    for (const f of eyes) { K.box(isl, .62, .62, .7, M.gold(), px(CHAIN.r - .3, f), CHAIN.y - .3, pz(CHAIN.r - .3, f), { ry: f }); const e = new T.Mesh(new T.TorusGeometry(.2, .06, 5, 12), M.gold()); e.position.set(px(CHAIN.r + .08, f), CHAIN.y - .02, pz(CHAIN.r + .08, f)); e.rotation.y = f + PI / 2; isl.add(e); }
    // grass lip with notches for the spouts, and the moat
    { const notches = falls.map(f => [f - 7.5 * D, f + 7.5 * D]).sort((a, b) => a[0] - b[0]).map(([a, b]) => [(a + 2 * PI) % (2 * PI), (b + 2 * PI) % (2 * PI)]).sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < notches.length; i++) { const a0 = notches[i][1], a1 = notches[(i + 1) % notches.length][0] + (i === notches.length - 1 ? 2 * PI : 0);
        K.put(isl, sectorGeo(LIP0, LIP1, a0, a1, .3, Math.max(3, Math.round((a1 - a0) / .12))), M.grass(), 0, 0, 0); } }
    K.water(isl, { ring: [MO0, LIP0 + .05], y: .2 });
    // marble spout channels jutting out over the rim; the water pours off their ends as curved sheets
    const FH = IY + .21 - WY + .25;
    for (const f of falls) {
      const sp = new T.Group(); sp.position.set(px(6.72, f), 0, pz(6.72, f)); sp.rotation.y = f; isl.add(sp);
      K.box(sp, 1.34, .16, 1.9, MDK(), 0, -.04, 0);
      for (const s of [-1, 1]) K.box(sp, .16, .36, 1.9, MLT(), s * .63, -.04, 0);
      K.box(sp, 1.0, .5, .75, MDK(), 0, -.54, .35);
      K.box(sp, 1.3, .07, .08, M.gold(), 0, .12, .95);
      for (const s of [-1, 1]) K.sphere(sp, .08, M.gold(), s * .63, .36, .9, { seg: 6, seg2: 4 });
      K.water(sp, { rect: [1.1, 1.9], y: .2 });
      const w = K.waterfall(isl, px(6.98, f), .21, pz(6.98, f), 1.1, FH, { ry: f });
      const geo = new T.CylinderGeometry(.56, .78, FH, 10, 6, true, -1.75, 3.5); geo.translate(0, -FH / 2, 0); w.geometry.dispose(); w.geometry = geo;
    }
    // trees, bushes and hanging vines on the rim
    { const R = K.rng(57), free = (a) => !falls.some(f => Math.abs(Math.atan2(Math.sin(a - f), Math.cos(a - f))) < 14 * D) && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 14 * D;
      for (const f of [48, 135, 195, 262, 318, 345].map(a => a * D)) if (free(f)) K.tree(isl, px(6.28, f), .3, pz(6.28, f), .42 + R() * .1);
      for (let i = 0; i < 14; i++) { const f = R() * PI * 2; if (free(f)) K.bush(isl, px(6.35, f), .26, pz(6.35, f), .2 + R() * .1); }
      for (let i = 0; i < 34; i++) { const f = i / 34 * PI * 2 + R() * .1; if (!free(f)) continue; const L = .6 + R() * 1.5, c = new T.ConeGeometry(.055, L, 4); c.translate(0, -L / 2, 0); B.add(VINE(), c, px(6.8, f), .25, pz(6.8, f), f); } }

    // ---------------- plinth, courtyard, ring wall ----------------
    K.cyl(isl, PR, PR + .08, CY, MDK(), 0, 0, 0, { seg: 48 });
    K.torus(isl, PR + .02, .06, M.gold(), 0, CY - .02, 0, { seg: 64, seg2: 4 });
    K.cyl(isl, PR - .1, PR - .1, .03, M.plaza(), 0, CY, 0, { seg: 48, cast: false });
    lathe(isl, [[WR - .25, 0], [WR + .25, 0], [WR + .25, WH], [WR - .25, WH], [WR - .25, 0]], M.marble(), 0, CY, 0, 56);
    lathe(isl, [[WR - .33, 0], [WR + .33, 0], [WR + .33, .14], [WR - .33, .14], [WR - .33, 0]], MLT(), 0, CY + WH, 0, 56);
    K.torus(isl, WR + .26, .045, M.gold(), 0, CY + 1.55, 0, { seg: 64, seg2: 4 });
    { const n = 60; for (let i = 0; i < n; i++) { const f = (i + .5) / n * PI * 2; if (TOWERS.some(a => Math.abs(Math.atan2(Math.sin(f - a), Math.cos(f - a))) < 12 * D) || Math.abs(Math.atan2(Math.sin(f), Math.cos(f))) < 17 * D) continue;
      for (const dr of [.16, -.16]) B.box(MLT(), .36, .42, .14, px(WR + dr, f), CY + WH + .14, pz(WR + dr, f), f); } }
    for (let i = 0; i < 12; i++) { const f = (i + .5) / 12 * PI * 2; if (Math.abs(Math.atan2(Math.sin(f), Math.cos(f))) < 25 * D) continue; win(B, px(WR + .26, f), CY + .9, pz(WR + .26, f), f, .16, .5); }
    // gatehouse at the front: merloned block with a gold sun disc
    { const gz = WR;
      K.box(isl, 2.3, 3.0, 1.3, M.marble(), 0, CY, gz);
      K.box(isl, 2.44, .14, 1.44, MLT(), 0, CY + 3.0, gz);
      K.box(isl, 2.34, .08, 1.34, M.gold(), 0, CY + 2.2, gz);
      for (const x of [-1.0, -.34, .34, 1.0]) for (const s of [-1, 1]) B.box(MLT(), .36, .44, .28, x, CY + 3.14, gz + s * .55);
      K.cyl(isl, .3, .3, .05, M.gold(), 0, CY + 2.62, gz + .65, { seg: 16, rx: PI / 2 }); for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; K.box(isl, .06, .18, .03, M.gold(), Math.sin(a) * .34, CY + 2.62 + Math.cos(a) * .34, gz + .66, { rz: -a }); }
      B.add(M.gold(), archGeo(1.3, 2.05, .04), 0, CY, gz + .65);
      K.door(isl, 1.1, 1.9, 0, CY, gz + .67, { mat: M.dark() });
      win(B, -.72, CY + 2.3, gz + .66, 0, .16, .42); win(B, .72, CY + 2.3, gz + .66, 0, .16, .42);
    }
    // the sky balcony in front of the gate, jutting out over the edge
    { const z0 = WR + .6, z1 = 7.55;
      K.box(isl, 1.9, .72, 1.1, MDK(), 0, 0, 6.35);
      K.box(isl, 2.5, .22, z1 - z0, MLT(), 0, CY - .22, (z0 + z1) / 2);
      K.box(isl, 2.54, .05, z1 - z0 + .04, M.gold(), 0, CY - .27, (z0 + z1) / 2);
      for (const s of [-.75, .75]) { const sh = new T.Shape(); sh.moveTo(6.55, -1.0); sh.lineTo(z1 - .1, CY - .27); sh.lineTo(6.55, CY - .27); sh.closePath();
        const geo = new T.ExtrudeGeometry(sh, { depth: .34, bevelEnabled: false }); geo.rotateY(-PI / 2); geo.translate(s + .17, 0, 0); K.worldUV(geo, .25); K.put(isl, geo, MDK(), 0, 0, 0); }
      balustrade(B, -1.1, z1 - .12, 1.1, z1 - .12, CY); for (const s of [-1, 1]) balustrade(B, s * 1.1, 5.55, s * 1.1, z1 - .12, CY);
      for (const s of [-1, 1]) { const bx = s * .8, bz = z1 - .5; K.cyl(isl, .08, .12, .5, M.gold(), bx, CY, bz, { seg: 8 }); K.cyl(isl, .26, .1, .2, M.gold(), bx, CY + .5, bz, { seg: 10 }); K.cyl(isl, .22, .22, .03, M.ember(), bx, CY + .705, bz, { seg: 10 });
        K.flameAt(isl, bx, CY + .68, bz, { size: .17, power: 12, range: 10, light: s < 0 }); } }

    // ---------------- six slim towers ----------------
    for (const f of TOWERS) tower(B, isl, ctx, f, st, Math.abs(f) < 1 || Math.abs(f - PI / 2) < .1);

    // ---------------- the keep and the great central spire ----------------
    K.cyl(isl, 2.58, 2.68, .5, MDK(), 0, CY, 0, { seg: 28 });
    K.cyl(isl, 2.3, 2.38, A1 - CY, M.marble(), 0, CY, 0, { seg: 28 });
    K.cyl(isl, 2.36, 2.36, .1, M.gold(), 0, CY + 2.05, 0, { seg: 28 });
    for (let i = 0; i < 8; i++) { const f = (i + .5) / 8 * PI * 2; B.box(MLT(), .3, A1 - CY - .5, .24, px(2.36, f), CY + .5, pz(2.36, f), f); B.box(M.gold(), .36, .12, .3, px(2.37, f), A1, pz(2.37, f), f); }
    for (let i = 1; i < 8; i++) { const f = i / 8 * PI * 2; win(B, px(2.34, f), CY + 2.35, pz(2.34, f), f, .34, .95); win(B, px(2.35, f), CY + .85, pz(2.35, f), f, .24, .55); }
    K.box(isl, 1.7, 2.45, .5, MLT(), 0, CY, 2.1); B.add(M.gold(), archGeo(1.26, 2.1, .04), 0, CY, 2.36); K.door(isl, 1.05, 1.95, 0, CY, 2.38, { mat: M.dark() });
    K.cyl(isl, 2.64, 2.33, .35, MLT(), 0, A1 - .05, 0, { seg: 28 });
    K.cyl(isl, 2.64, 2.64, .37, M.marble(), 0, A1 + .3, 0, { seg: 28 });
    for (let i = 0; i < 18; i++) { const f = i / 18 * PI * 2; B.box(MLT(), .4, .45, .3, px(2.5, f), P1, pz(2.5, f), f); }
    K.cyl(isl, 1.6, 1.66, B1 - P1, M.marble(), 0, P1, 0, { seg: 24 });
    K.cyl(isl, 1.64, 1.64, .1, M.gold(), 0, P1 + 1.75, 0, { seg: 24 });
    for (let i = 0; i < 6; i++) { const f = i / 6 * PI * 2; win(B, px(1.63, f), P1 + .35, pz(1.63, f), f, .3, 1.0); win(B, px(1.62, f), P1 + 2.0, pz(1.62, f), f, .2, .55); }
    K.cyl(isl, 1.98, 1.63, .3, MLT(), 0, B1, 0, { seg: 24 });
    K.cyl(isl, 2.0, 2.0, .1, MLT(), 0, B1 + .3, 0, { seg: 24 });
    for (let i = 0; i < 28; i++) { const f = i / 28 * PI * 2; B.add(MLT(), balGeo(), px(1.88, f), G1, pz(1.88, f)); }
    K.torus(isl, 1.88, .05, MLT(), 0, G1 + .33, 0, { seg: 32, seg2: 4 });
    // lantern: tall glowing windows between gold colonnettes
    K.cyl(isl, 1.15, 1.2, L1 - G1, M.marble(), 0, G1, 0, { seg: 18 });
    for (let i = 0; i < 6; i++) { const f = i / 6 * PI * 2; win(B, px(1.16, f), G1 + .18, pz(1.16, f), f, .3, .92, M.gold()); const c = (i + .5) / 6 * PI * 2; B.cyl(M.gold(), .05, .06, L1 - G1, px(1.2, c), G1, pz(1.2, c), 6); }
    // six pinnacles on the gallery around the spire
    for (let i = 0; i < 6; i++) { const f = (i + .5) / 6 * PI * 2, x = px(1.72, f), z = pz(1.72, f); B.cyl(MLT(), .1, .12, .9, x, G1, z, 6); B.add(ctx.roof, (() => { const c = new T.ConeGeometry(.16, .6, 6); c.translate(0, .3, 0); K.worldUV(c, .35, true); return c; })(), x, G1 + .9, z); B.add(M.gold(), new T.SphereGeometry(.05, 5, 4), x, G1 + 1.52, z); }
    K.cyl(isl, 1.42, 1.2, .2, MLT(), 0, SPY - .2, 0, { seg: 24 });
    lathe(isl, NEEDLE, ctx.roof, 0, SPY, 0, 24);
    if (st >= 1) { K.torus(isl, 1.43, .06, M.gold(), 0, SPY + .02, 0, { seg: 32, seg2: 5 }); K.torus(isl, 1.99, .05, M.gold(), 0, B1 + .02, 0, { seg: 32, seg2: 4 }); }
    // four dormers on the spire
    for (let i = 0; i < 4; i++) { const f = PI / 4 + i * PI / 2, r = 1.08, x = px(r, f), z = pz(r, f), dg = new T.Group(); dg.position.set(x, SPY + .75, z); dg.rotation.y = f; isl.add(dg);
      K.box(dg, .42, .5, .5, MLT(), 0, 0, -.1); K.gable(dg, .6, .56, .36, ctx.roof, 0, .5, -.12, { ry: PI / 2 }); win(B, x + px(.15, f), SPY + .8, z + pz(.15, f), f, .18, .34, M.gold()); }
    const tip = SPY + SPH;
    let top = IY + tip + .9;
    if (st < 2) { K.sphere(isl, .16, M.gold(), 0, tip - .05, 0, { seg: 10, seg2: 8 }); K.cone(isl, .06, .85, M.gold(), 0, tip + .05, 0, { seg: 6 }); }
    else {
      // the golden crown around the spire
      const cy = SPY + 1.85, cr = 1.05;
      K.cyl(isl, cr, cr + .05, .32, M.gold(), 0, cy, 0, { seg: 20 });
      K.torus(isl, cr + .05, .05, M.gold(), 0, cy, 0, { seg: 24, seg2: 4 }); K.torus(isl, cr, .045, M.gold(), 0, cy + .32, 0, { seg: 24, seg2: 4 });
      for (let i = 0; i < 8; i++) { const f = i / 8 * PI * 2, x = px(cr, f), z = pz(cr, f), hh = i % 2 ? .55 : .85;
        const c = new T.ConeGeometry(.09, hh, 4); c.translate(0, hh / 2, 0); B.add(M.gold(), c, x, cy + .3, z, f); B.add(M.gold(), new T.SphereGeometry(.065, 6, 4), x, cy + .3 + hh, z);
        B.add(i % 2 ? CRYW() : CRYJ(), new T.IcosahedronGeometry(.075, 0), px(cr + .06, f), cy + .16, pz(cr + .06, f)); }
      // cup and stem on the tip, then the armillary sphere
      lathe(isl, [[.05, 0], [.2, .08], [.3, .26], [.22, .32], [.08, .32]], M.gold(), 0, tip - .25, 0, 12);
      K.cyl(isl, .05, .07, .55, M.gold(), 0, tip + .05, 0, { seg: 6 });
      armillary(isl, tip + .55 + 1.55);
      top = IY + tip + .55 + 3.2;
    }
    // banners on the keep (step 1)
    if (st >= 1 && ctx.owned) for (const s of [-1, 1]) { const f = s * 30 * D; K.banner(isl, { x: px(1.7, f), y: B1 - .15, z: pz(1.7, f), ry: f, w: .6, h: 2.2, mat: ctx.cloth, emblem: M.gold() }); }

    // ---------------- step 1: three satellite rocks orbit the island ----------------
    if (st >= 1) {
      const orb = new T.Group(); g.add(orb); const sats = [];
      for (const [f, y, sc, sd] of [[128, 12.6, 1, 61], [305, 13.7, .9, 62], [212, 12.0, .85, 63]]) { const s = satellite(orb, ctx, st, sd, sc); const a = f * D; s.position.set(px(9.2, a), y, pz(9.2, a)); s.rotation.y = a; sats.push([s, y, sd]); }
      K.tick((t) => { orb.rotation.y = t * .045; for (let i = 0; i < sats.length; i++) { const e = sats[i]; e[0].position.y = e[1] + Math.sin(t * .7 + e[2]) * .16; } });
    }

    // ---------------- chains, bobbing, crystal glow ----------------
    const L0 = Math.hypot(EYE.r - CHAIN.r, IY + CHAIN.y - EYE.y), links = [], lk = .34, nL = Math.ceil(L0 / lk);
    for (let i = 0; i <= nL; i++) { const l = new T.TorusGeometry(.14, .05, 4, 8); l.scale(1, 1.4, 1); if (i % 2) l.rotateY(PI / 2); l.translate(0, i * L0 / nL, 0); links.push(l.toNonIndexed()); l.dispose(); }
    const chainGeo = mergeGeos(links), chains = [];
    for (const f of eyes) { const m = new T.Mesh(chainGeo, M.gold()); m.castShadow = true; const a = [px(EYE.r - .05, f), EYE.y, pz(EYE.r - .05, f)], b = [px(CHAIN.r, f), CHAIN.y, pz(CHAIN.r, f)]; m.position.set(a[0], a[1], a[2]); g.add(m); chains.push({ m, a, b }); }
    const dv = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    K.tick((t, env) => {
      const yy = IY + Math.sin(t * .75) * .12; isl.position.y = yy;
      for (let i = 0; i < chains.length; i++) { const c = chains[i]; dv.set(c.b[0] - c.a[0], c.b[1] + yy - c.a[1], c.b[2] - c.a[2]); const L = dv.length(); dv.multiplyScalar(1 / L); c.m.quaternion.setFromUnitVectors(up, dv); c.m.scale.y = L / L0; }
      CRYJ().emissiveIntensity = .55 + env.night * 1.5; CRYW().emissiveIntensity = .3 + env.night * 1.2;
    });

    BG.flush(); B.flush();
    for (const o of g.children) if (o.isMesh && o.material === FOAM()) o.userData.noOutline = true;   // foam and flowers: no ink lines through the falls
    g.userData = { top, radius: PL + .45, smoke: [[0, IY + CY + 6, 0], [px(WR, TOWERS[3]), IY + CY + 4, pz(WR, TOWERS[3])], [px(WR, TOWERS[0]), IY + CY + 4, pz(WR, TOWERS[0])]] };
    return g;
  }
  OW.addTier(9, { build, plotR: 11.8, islandR: 17.3 });
})();

// ===== game adapter: model → sprite image, lazily, cached (LRU by pixels), one render per idle slice =====
(function () {
  const G = OW.game = { off: false, fails: 0, renders: 0, ms: 0 };
  const FRAME = [7, 8.2, 9.4, 10.2, 11.2, 12, 12.8, 13.5, 13.5, 15.6], LOOKY = [1.6, 4.2, 4.8, 5, 4.6, 5, 6, 6.5, 6.2, 8.8];   // half widths / look heights per tier (as the design's map scene)
  const OTHER = { tempel: [10.5, 3.2], waechter: [11, 3.6], mega: [22, 6], tor: [7.5, 3.4] };
  const CE = Math.cos(Math.atan(.62)), CAP_PX = 6e6;                                  // camera elevation of S.thumb; cache cap ≈ 24 MB
  const cache = new Map(), want = new Map(); let pixels = 0, timer = 0;
  G.frameOf = (c) => { if (c.model !== 'basis') { const o = OTHER[c.model] || [10, 3]; return { v: o[0], lookY: o[1] }; }
    const t = OW.tierOf(c.level); return { v: FRAME[t] * (c.capital ? 1.2 : 1) * 1.18, lookY: LOOKY[t] + (c.capital ? 1 : 0) }; };
  function render(c, px) {
    const f = G.frameOf(c), cv = document.createElement('canvas'), t0 = performance.now();
    OW.stage.thumb(Object.assign({ variant: {} }, c, { frame: f.v, lookY: f.lookY }), px / 2, cv);
    G.renders++; G.ms += performance.now() - t0;
    return { c: cv, px, v: f.v, ay: (1.08 * f.v + f.lookY * CE) / (2 * f.v) };    // ay: where the ground centre sits (fraction of the height)
  }
  function pump() {
    timer = 0; if (G.off || !want.size) return;
    const now = performance.now(); let best = null;
    for (const [k, w] of want) { if (now - w.t > 3000) want.delete(k); else if (!best || w.t > best[1].t) best = [k, w]; }   // newest request first, forget stale ones
    if (!best) return; want.delete(best[0]);
    try { const s = render(best[1].c, best[1].px); cache.set(best[0], s); pixels += s.px * s.px;
      for (const [k, v] of cache) { if (pixels <= CAP_PX) break; cache.delete(k); pixels -= v.px * v.px; }             // least recently used out
      G.onReady && G.onReady(); }
    catch (e) { console.warn('Baukunst', e); if (++G.fails >= 3) G.off = true; }
    schedule();
  }
  function schedule() { if (timer || G.off || !want.size) return; timer = 1; if (window.requestIdleCallback) requestIdleCallback(pump, { timeout: 150 }); else setTimeout(pump, 30); }
  G.get = function (id, c, px) {                                                  // the sprite; missing → queued, meanwhile the same model in another size or null (the caller draws its old one)
    if (G.off) return null; const key = id + '@' + px, s = cache.get(key);
    if (s) { cache.delete(key); cache.set(key, s); return s; }
    const w = want.get(key); if (w) w.t = performance.now(); else want.set(key, { c, px, t: performance.now() }); schedule();
    for (const p of [256, 512, 128]) { const o = cache.get(id + '@' + p); if (o) return o; }
    return null;
  };
  G.peek = function (id) { if (G.off) return null; for (const p of [512, 256, 128]) { const o = cache.get(id + '@' + p); if (o) return o; } return null; };   // a cached sprite of this model in any size, without queueing (the old look while the new one renders)
  G.now = function (id, c, px) {                                                  // render right away (previews)
    if (G.off) return null; const key = id + '@' + px; let s = cache.get(key); if (s) return s;
    try { s = render(c, px); want.delete(key); cache.set(key, s); pixels += s.px * s.px;
      for (const [k, v] of cache) { if (pixels <= CAP_PX || k === key) break; cache.delete(k); pixels -= v.px * v.px; }   // wie pump: die ältesten raus
      return s; } catch (e) { console.warn('Baukunst', e); if (++G.fails >= 3) G.off = true; return null; }
  };
  G.clear = () => { cache.clear(); want.clear(); pixels = 0; };
  G.stats = () => ({ sprites: cache.size, mb: Math.round(pixels * 4 / 1e5) / 10, queued: want.size, renders: G.renders, avgMs: G.renders ? Math.round(G.ms / G.renders) : 0 });
  try { const t = document.createElement('canvas'), gl = t.getContext('webgl2') || t.getContext('webgl'); if (!gl) G.off = true; else { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } } catch (e) { G.off = true; }   // (nur prüfen – den Test-Zugang gleich wieder freigeben)   // no WebGL: the drawn sprites stay
})();
} catch (e) { console.warn('Baukunst aus', e); if (window.OW) window.OW.game = null; }
