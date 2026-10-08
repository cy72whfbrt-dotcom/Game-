// Teil 07-hafen-palast.js: Stufe 6 Hafenfestung (60–69) und Stufe 7 Palastburg (70–79)


// ===== Open Water Baukunst · Tier 6 · Hafenfestung (lv 60-69) =====
// Weathered blue-grey harbour stone with white limestone trims. Silhouette: a TALL slim white lighthouse (blue-grey bands,
// owner-coloured cap roof, glowing lantern room) on a round bastion at the harbour mouth (right), a compact castle on the left
// (hall with white stepped gables under an owner roof, three round towers with owner cones), and a harbour basin cut into the
// front-right quarter behind a curved sea wall, with a moored ship under an owner-coloured sail.
// Step 1 (65-69): a big cog at the back quay, a chain tower on the mole head with the harbour chain across the mouth,
// a bartizan on the bastion, more lanterns and (owned) banners on the hall.
(function () {
  const T = THREE, K = OW.K, M = OW.M, PI = Math.PI;
  const mats = {};
  const mat = (k, o) => { if (mats[k]) return mats[k]; const m = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)); if (o.map) { m.bumpMap = o.map; if (o.bumpScale == null) m.bumpScale = 1.1; } return mats[k] = m; };
  const HS = () => mat('hs', { color: 0x7f8e9b, map: OW.TEX.ashlar(), bumpScale: 1.0 });          // harbour stone (the tier stone)
  const HSD = () => mat('hsd', { color: 0x7a8894, map: OW.TEX.ashlar(), bumpScale: 1.2 });        // footings, quay walls
  const PAVE = () => mat('pave', { color: 0xbfc6ca, map: OW.TEX.ashlar(), bumpScale: .45 });      // quay flagstones
  const APRON = () => mat('apron', { color: 0xa9aeb0, map: OW.TEX.cobble(), bumpScale: .5 });
  const LW = () => mat('lw', { color: 0xf6f3ec, map: OW.TEX.ashlar(), bumpScale: .4 });            // lighthouse white
  const BAND = () => mat('band', { color: 0x536574, map: OW.TEX.ashlar(), bumpScale: .6 });        // lighthouse bands
  const ALGAE = () => mat('algae', { color: 0x43574a, roughness: 1 });
  const HULL = () => mat('hull', { color: 0x8b6541, map: OW.TEX.planks(), bumpScale: .7, side: T.DoubleSide });
  const DECK = () => mat('deck', { color: 0xb38f63, map: OW.TEX.planks(), bumpScale: .5 });
  const LAMP = () => mat('lamp', { color: 0xfff3d6, emissive: 0xffd488, emissiveIntensity: .5, roughness: .35, flatShading: false });

  // ---- batching: many small repeated parts become one mesh per material ----
  function Batch(root) { this.root = root; this.m = new Map(); }
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(1, 1, 1), _p = new T.Vector3();
  Batch.prototype.add = function (mt, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    const gg = geo.index ? geo.toNonIndexed() : geo; if (gg !== geo) geo.dispose();
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _m.compose(_p, _q, _s); gg.applyMatrix4(_m);
    let l = this.m.get(mt); if (!l) this.m.set(mt, l = []); l.push(gg);
  };
  Batch.prototype.box = function (mt, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); K.worldUV(g, .25); this.add(mt, g, x, y, z, rx, ry, rz); };
  Batch.prototype.cyl = function (mt, rt, rb, h, x, y, z, seg = 8, rx = 0, rz = 0) { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); K.worldUV(g, .25, true); this.add(mt, g, x, y, z, rx, 0, rz); };
  Batch.prototype.flush = function () {
    for (const [mt, list] of this.m) { let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
      const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
      const mesh = new T.Mesh(bg, mt); mesh.castShadow = mesh.receiveShadow = true; this.root.add(mesh); }
    this.m.clear();
  };

  // ---- small geometry helpers ----
  const UP = new T.Vector3(0, 1, 0);
  function rod(p, a, b, r, m, seg = 5) { const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); const geo = new T.CylinderGeometry(r, r, len, seg); geo.translate(0, len / 2, 0);
    const mesh = K.put(p, geo, m, a[0], a[1], a[2]); mesh.quaternion.setFromUnitVectors(UP, d.normalize()); return mesh; }
  function lathe(p, pts, m, seg = 56, y = 0) { const g = new T.LatheGeometry(pts.map(([r, h]) => new T.Vector2(r, h)), seg); K.worldUV(g, .25, true); return K.put(p, g, m, 0, y, 0, { cast: false }); }
  const shapeXZ = (pts) => new T.Shape(pts.map(([x, z]) => new T.Vector2(x, -z)));        // world (x, z) → shape; extrude + rotateX(-PI/2) maps it back
  const P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  const D = PI / 180;
  // segments along an arc of radius r from a0 to a1: fn(angle, segment length, ry that turns a box's x-axis along the arc)
  function arc(r, a0, a1, step, fn) { const n = Math.max(1, Math.round(Math.abs(a1 - a0) / step)), da = (a1 - a0) / n;
    for (let i = 0; i < n; i++) { const a = a0 + (i + .5) * da; fn(a, 2 * r * Math.sin(Math.abs(da) / 2) + .03, -a - PI / 2, Math.abs(da)); } }
  // two-slab gable roof, ridge along local x at y + rise, eaves at z = ±hs (and y)
  function roof2(p, len, hs, rise, m, y, th = .14) {
    const a = Math.atan2(rise, hs), sl = Math.hypot(hs, rise), ex = .12;
    for (const s of [-1, 1]) { const geo = new T.BoxGeometry(len, th, sl + ex); K.worldUV(geo, .35);
      const cz = s * hs / 2 + s * Math.sin(a) * th / 2 - s * Math.cos(a) * ex / 2, cy = rise / 2 + Math.cos(a) * th / 2 + Math.sin(a) * ex / 2;
      K.put(p, geo, m, 0, y + cy, cz, { rx: s * a }); }
    K.cyl(p, .1, .1, len + .04, m, -(len + .04) / 2, y + rise + th * .8, 0, { rz: -PI / 2, seg: 4 });
  }
  // white stepped gable, a wall in the local x/y plane (thickness along z), foot at y; roof top surface height yr(x)
  function stepGable(p, s, n, yr, th, m, x, y, z, ry) {
    const d = s / (n + .5), xs = [], ys = [], pts = [[-s, 0]];
    for (let k = 0; k <= n; k++) xs.push(-s + k * d);
    for (let k = 0; k < n; k++) ys.push(yr(xs[k + 1]) + .42);
    const top = yr(0) + .75;
    for (let k = 0; k < n; k++) pts.push([xs[k], ys[k]], [xs[k + 1], ys[k]]);
    pts.push([xs[n], top], [-xs[n], top]);
    for (let k = n - 1; k >= 0; k--) pts.push([-xs[k + 1], ys[k]], [-xs[k], ys[k]]);
    pts.push([s, 0]);
    const geo = new T.ExtrudeGeometry(new T.Shape(pts.map(([a, b]) => new T.Vector2(a, b))), { depth: th, bevelEnabled: false }); geo.translate(0, 0, -th / 2); K.worldUV(geo, .3);
    K.put(p, geo, m, x, y, z, { ry });
    return { top, ys, xs };
  }
  // a boat hull lofted from cross sections: length along x (bow +x), waterline at y = 0
  function hullGeo(L, Bm, fb, sh, dr, sw) {
    const n = 12, pos = [], idx = [], sec = [], deck = [];
    for (let i = 0; i <= n; i++) {
      const t = -1 + 2 * i / n, x = t * L / 2;
      const w = Bm / 2 * (t >= 0 ? Math.pow(Math.max(0, 1 - t * t), .5) : Math.sqrt(1 - (1 - sw * sw) * t * t));
      const yg = fb + sh * t * t, yk = -dr * (1 - .7 * Math.pow(Math.abs(t), 4));
      const pr = [[w, yg], [w * .98, fb * .3], [w * .72, yk * .7], [0, yk], [-w * .72, yk * .7], [-w * .98, fb * .3], [-w, yg]];
      sec.push(pr.map(([zz, yy]) => { pos.push(x, yy, zz); return pos.length / 3 - 1; }));
      deck.push([x, w]);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { const a = sec[i][j], b = sec[i + 1][j], c = sec[i + 1][j + 1], d = sec[i][j + 1]; idx.push(a, b, c, a, c, d); }
    const s0 = sec[0]; for (let j = 1; j < 6; j++) idx.push(s0[0], s0[j + 1], s0[j]);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
    geo.setIndex(idx); geo.computeVertexNormals(); K.worldUV(geo, .5);
    return { geo, deck };
  }

  // ---------------- layout constants ----------------
  const Y0 = .9, WL = .32;                          // quay level, water level
  const RP = 8.5, XQ = .1, ZQ = 0, RC = .7;        // platform radius; the basin is cut out where x > XQ and z > ZQ
  const RS = 8.05, SWT = .9;                        // sea wall centre radius (7.6 … 8.5) and thickness
  const AM = 26 * D;                                // the mole head angle (harbour mouth between it and the bastion)
  const BX = Math.cos(-12 * D) * 7.25, BZ = Math.sin(-12 * D) * 7.25, BR = 1.8, BH = 2.5;    // lighthouse bastion
  const HX = -3.35, HZ = -1.6, HL = 5.4, HW = 3.6, HH = 4.6, RH = 2.6;                           // castle hall (ridge along x)

  // a round castle tower with a battered foot, corbelled parapet drum and an owner cone
  function tower(g, Bt, o) {
    const { x, z, r, h } = o, seg = o.seg || 16, t = new T.Group(); t.position.set(x, 0, z); g.add(t);
    K.cyl(t, r * 1.1, r * 1.2, Y0 + .5, HSD(), 0, 0, 0, { seg });
    K.cyl(t, r * 1.13, r * 1.13, .1, M.cap(), 0, Y0 + .5, 0, { seg });
    K.cyl(t, r, r * 1.02, h - .5, HS(), 0, Y0 + .5, 0, { seg });
    const top = Y0 + h, n = Math.round(r * 8);
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * PI * 2; Bt.box(M.cap(), .2, .34, .22, x + Math.cos(a) * r * 1.04, top - .34, z + Math.sin(a) * r * 1.04, -a); }
    K.cyl(t, r * 1.16, r * 1.1, .62, M.cap(), 0, top, 0, { seg });
    K.cyl(t, r * 1.21, r * 1.21, .1, M.cap(), 0, top + .62, 0, { seg });
    K.cone(t, o.rr, o.rh, o.roof, 0, top + .72, 0, { seg });
    const tip = top + .72 + o.rh;
    for (const [a, y, w, hh] of o.wins || []) K.win(t, w || .18, hh || .6, Math.cos(a) * (r - .01), y, Math.sin(a) * (r - .01), { ry: PI / 2 - a });
    return { t, tip };
  }

  // a ship moored in the basin. o: x, z, ry, L, B, fb (freeboard), sh (sheer rise), dr (draft), mastX, mastH, sailW, sailH, cog
  function ship(g, Bt, o, ctx) {
    const s = new T.Group(); s.position.set(o.x, WL, o.z); s.rotation.y = o.ry || 0; g.add(s);
    const { L, fb, sh, dr } = o, Bm = o.B;
    const { geo, deck } = hullGeo(L, Bm, fb, sh, dr, o.sw || .6);
    K.put(s, geo, HULL(), 0, 0, 0);
    const dy = fb - .14, shp = new T.Shape();
    deck.forEach(([x, w], i) => i ? shp.lineTo(x, w * .93) : shp.moveTo(x, w * .93)); for (let i = deck.length - 1; i >= 0; i--) shp.lineTo(deck[i][0], -deck[i][1] * .93);
    const dg = new T.ShapeGeometry(shp); dg.rotateX(-PI / 2); K.worldUV(dg, .5); K.put(s, dg, DECK(), 0, dy, 0, { cast: false });
    // dark wale along the gunwale and a stem post
    rod(s, [L / 2 - .02, -dr * .3, 0], [L / 2 + .12, fb + sh + .22, 0], .06, M.darkWood());
    // mast, yard, sail (owner cloth), stays
    const mx = o.mastX || 0, mh = o.mastH, yardY = dy + mh - .3;
    K.cyl(s, .05, .08, mh, M.darkWood(), mx, dy, 0, { seg: 6 });
    K.cyl(s, .045, .045, o.sailW + .3, M.darkWood(), mx + .09, yardY, -(o.sailW + .3) / 2, { rx: PI / 2, seg: 5 });
    const sg = new T.PlaneGeometry(o.sailW, o.sailH, 6, 5), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / (o.sailW / 2), v = sp.getY(i) / (o.sailH / 2); sp.setZ(i, (1 - u * u) * (1 - .3 * (v - .2) * (v - .2)) * o.sailW * .13); }
    sg.computeVertexNormals();
    const sm = new T.Mesh(sg, ctx.cloth); sm.rotation.y = PI / 2; sm.position.set(mx + .12, yardY - o.sailH / 2 - .03, 0); sm.castShadow = true; s.add(sm);
    if (o.lowerYard) K.cyl(s, .04, .04, o.sailW * .9, M.darkWood(), mx + .3, yardY - o.sailH - .02, -o.sailW * .45, { rx: PI / 2, seg: 5 });
    const head = [mx, dy + mh, 0];
    rod(s, head, [L / 2 + .1, fb + sh + .15, 0], .018, M.rope(), 3);
    rod(s, head, [-L / 2 + .15, fb + sh * (o.cog ? 1.6 : 1) + .05, 0], .018, M.rope(), 3);
    for (const zz of [-1, 1]) rod(s, head, [mx - .35, fb + .02, zz * Bm * .47], .015, M.rope(), 3);
    if (ctx.owned) K.flag(s, { x: mx, y: dy + mh, z: 0, poleH: .5, w: o.cog ? 1.3 : .95, h: o.cog ? .36 : .28, mat: ctx.cloth, pennant: true, knob: M.bronze(), dir: .3 - (o.ry || 0) });
    if (o.cog) {
      // raised castles fore and aft, a stern rudder
      const aft = -L / 2 + .8, cw = Bm * .72;
      K.box(s, 1.35, sh * 1.6 + .5, cw, M.darkWood(), aft, dy, 0);
      K.box(s, 1.45, .1, cw + .12, M.wood(), aft, dy + sh * 1.6 + .5, 0);
      for (const zz of [-1, 1]) K.box(s, 1.4, .2, .07, M.wood(), aft, dy + sh * 1.6 + .6, zz * (cw / 2 + .02));
      K.box(s, .07, .2, cw, M.wood(), aft - .68, dy + sh * 1.6 + .6, 0);
      K.win(s, .2, .26, aft - .69, dy + .5, 0, { ry: -PI / 2 });
      const fore = L / 2 - .95;
      K.box(s, .9, sh * 1.1 + .45, Bm * .5, M.darkWood(), fore, dy, 0);
      K.box(s, 1.0, .1, Bm * .5 + .1, M.wood(), fore, dy + sh * 1.1 + .45, 0);
      K.box(s, .1, fb + dr * .6, .5, M.darkWood(), -L / 2 - .06, -dr * .6, 0);
    } else {
      K.box(s, .9, .5, Bm * .55, M.darkWood(), -L / 2 + .75, dy, 0);                       // small deck cabin
      K.box(s, 1.0, .08, Bm * .6, M.wood(), -L / 2 + .75, dy + .5, 0);
      rod(s, [-L / 2 + .3, fb + sh + .1, Bm * .3], [-L / 2 - .35, -.1, Bm * .42], .04, M.darkWood());   // steering oar
    }
    const ph = o.x * 1.3;
    K.tick((t) => { s.position.y = WL + Math.sin(t * 1.1 + ph) * .035; s.rotation.z = Math.sin(t * .8 + ph) * .018; s.rotation.x = Math.sin(t * .95 + ph * 2) * .012; });
    return s;
  }

  function build(ctx) {
    const g = new T.Group(), st = OW.stepOf(ctx.level), Bt = new Batch(g);
    const barrel = (x, y, z) => { Bt.cyl(M.wood(), .25, .23, .64, x, y, z, 10); for (const yy of [.12, .48]) Bt.cyl(M.iron(), .265, .265, .05, x, y + yy, z, 10); };
    const crate = (x, y, z, s = .55, ry = 0) => Bt.box(M.wood(), s, s, s, x, y, z, ry);
    const bollard = (x, y, z) => { Bt.cyl(M.iron(), .1, .12, .3, x, y, z, 7); Bt.cyl(M.iron(), .15, .15, .06, x, y + .3, z, 7); };
    const lantern = (x, y, z, h = 1.5) => { Bt.cyl(M.iron(), .05, .07, h, x, y, z, 6); Bt.box(M.window(), .26, .3, .26, x, y + h, z); Bt.cyl(M.iron(), 0, .23, .2, x, y + h + .3, z, 4); Bt.box(M.iron(), .32, .04, .32, x, y + h - .04, z); };

    // ---------------- ground: apron, white kerb, quay platform with the basin notch ----------------
    K.cyl(g, 9.3, 9.35, .16, APRON(), 0, 0, 0, { seg: 64, uv: .3, cast: false });
    lathe(g, [[9.2, 0], [9.45, 0], [9.45, 0], [9.45, .42], [9.45, .42], [9.2, .42], [9.2, .42], [9.2, 0]], M.cap(), 72);
    const pp = [], aF = Math.acos(XQ / RP), aR = Math.asin(ZQ / RP);
    for (let i = 0; i <= 72; i++) { const a = aF + (2 * PI + aR - aF) * i / 72; pp.push(P(a, RP)); }
    for (let i = 0; i <= 6; i++) { const a = -PI / 2 - i / 6 * PI / 2; pp.push([XQ + RC + Math.cos(a) * RC, ZQ + RC + Math.sin(a) * RC]); }
    const ps = shapeXZ(pp);
    const pg = new T.ExtrudeGeometry(ps, { depth: Y0 - .04, bevelEnabled: false }); pg.rotateX(-PI / 2); K.worldUV(pg, .25); K.put(g, pg, HSD(), 0, 0, 0, { cast: false });
    const tg = new T.ExtrudeGeometry(ps, { depth: .05, bevelEnabled: false }); tg.rotateX(-PI / 2); K.worldUV(tg, .3); K.put(g, tg, PAVE(), 0, Y0 - .04, 0, { cast: false });

    // ---------------- the harbour basin: water above the apron, its edges hidden in quays, walls and the kerb ----------------
    const wp = [[XQ - .12, ZQ - .12], [7.0, ZQ - .12], [7.8, -.3], [9.2, -1.15]];
    for (let i = 0; i <= 12; i++) { const a = Math.atan2(-1.15, 9.2) + (AM - Math.atan2(-1.15, 9.2)) * i / 12; wp.push(P(a, 9.28)); }
    const aW = Math.acos((XQ - .12) / RS);
    for (let i = 0; i <= 16; i++) wp.push(P(AM + (aW - AM) * i / 16, RS));
    const wg = new T.ShapeGeometry(shapeXZ(wp)); wg.rotateX(-PI / 2);
    const water = new T.Mesh(wg, K.waterMat()); water.position.y = WL; water.receiveShadow = true; g.add(water);
    // quay copings, tide line (algae) and bollards along the two basin quays
    const bq0 = XQ + RC, bq1 = 8.45, lq0 = ZQ + RC, lq1 = Math.sqrt(7.62 * 7.62 - XQ * XQ);
    Bt.box(M.cap(), bq1 - bq0, .12, .36, (bq0 + bq1) / 2, Y0 - .07, ZQ - .1); Bt.box(ALGAE(), bq1 - bq0, .24, .04, (bq0 + bq1) / 2, WL - .03, ZQ + .02);
    Bt.box(M.cap(), .36, .12, lq1 - lq0, XQ - .1, Y0 - .07, (lq0 + lq1) / 2); Bt.box(ALGAE(), .04, .24, lq1 - lq0, XQ + .02, WL - .03, (lq0 + lq1) / 2);
    for (let i = 0; i < 4; i++) { const a = -PI / 2 - (i + .5) / 4 * PI / 2, cx = XQ + RC + Math.cos(a) * (RC + .1), cz = ZQ + RC + Math.sin(a) * (RC + .1);
      Bt.box(M.cap(), .36, .12, RC * .45, cx, Y0 - .07, cz, -a); Bt.box(ALGAE(), .04, .24, RC * .45, XQ + RC + Math.cos(a) * (RC - .03), WL - .03, ZQ + RC + Math.sin(a) * (RC - .03), -a); }
    for (const x of [1.9, 3.5, 5.55]) bollard(x, Y0, ZQ - .2);
    K.stairs(g, .6, 4, (Y0 - WL + .1) / 4, .3, HS(), XQ + .3, WL - .1, 2.8);   // landing steps down to the water
    for (const z of [2.2, 3.4, 7.0]) bollard(XQ - .2, Y0, z);

    // ---------------- sea wall (mole) around the basin: walkway at quay level, crenellated parapet towards the sea ----------------
    const parapet = (r0, a0, a1, low) => arc(r0, a0, a1, 7 * D, (a, len, ry, da) => {
      const [x1, z1] = P(a, r0 - .16), [x2, z2] = P(a, r0 - .2), ph = low ? .34 : .72;
      Bt.box(HS(), len, ph, .32, x1, Y0 - .02, z1, ry); Bt.box(M.cap(), len + .02, .1, .44, x2, Y0 + ph - .02, z2, ry);
      if (!low) for (const f of [-.25, .25]) { const [x3, z3] = P(a + f * da, r0 - .18); Bt.box(M.cap(), .4, .36, .3, x3, Y0 + .8, z3, ry); } });
    arc(RS, AM, 93 * D, 6 * D, (a, len, ry) => {
      const [x, z] = P(a, RS), [xi, zi] = P(a, 7.72), [xa, za] = P(a, 7.575), [xw, zw] = P(a, 7.92);
      Bt.box(HSD(), len, Y0 - .03, SWT, x, 0, z, ry);
      Bt.box(PAVE(), len, .04, .62, xw, Y0 - .04, zw, ry);
      Bt.box(M.cap(), len + .02, .12, .3, xi, Y0 - .07, zi, ry);
      Bt.box(ALGAE(), len, .24, .04, xa, WL - .03, za, ry); });
    parapet(8.5, AM + 5 * D, 92 * D, true); parapet(8.5, 92 * D, 128 * D);
    { const [x, z] = P(92 * D, 8.3); Bt.box(HS(), .62, 1.2, .62, x, Y0 - .02, z, -92 * D); Bt.box(M.cap(), .74, .1, .74, x, Y0 + 1.18, z, -92 * D); lantern(x, Y0 + 1.28, z, .08); }
    // mole head: round, with a beacon basket (step 0) or the chain tower (step 1)
    const [MX, MZ] = P(AM, RS);
    K.cyl(g, 1.0, 1.06, Y0 - .03, HSD(), MX, 0, MZ, { seg: 16 });
    K.cyl(g, 1.08, 1.08, .12, M.cap(), MX, Y0 - .07, MZ, { seg: 16 });
    K.cyl(g, 1.075, 1.08, .24, ALGAE(), MX, WL - .03, MZ, { seg: 16 });

    // ---------------- land side: low crenellated parapet with a land gate, tall curtain wall at the back ----------------
    parapet(8.5, 141 * D, 213 * D, false);
    for (const a of [128.5 * D, 140.5 * D]) { const [x, z] = P(a, 8.3); Bt.box(HS(), .72, 1.9, .72, x, Y0 - .02, z, -a); Bt.box(M.cap(), .86, .12, .86, x, Y0 + 1.88, z, -a); lantern(x, Y0 + 2.0, z, .08); }
    { const [x, z] = P(134.5 * D, 9.2); K.stairs(g, 1.5, 3, (Y0 - .16) / 3, .24, PAVE(), x, .16, z, { ry: PI / 2 - 134.5 * D }); }
    arc(8.12, -150 * D, -20 * D, 6.5 * D, (a, len, ry, da) => {
      const [x, z] = P(a, 8.12);
      Bt.box(HS(), len, 2.3, .76, x, Y0 - .02, z, ry); Bt.box(M.cap(), len + .02, .12, .94, x, Y0 + 2.28, z, ry);
      for (const f of [-.25, .25]) { const [x3, z3] = P(a + f * da, 8.32); Bt.box(M.cap(), .44, .46, .3, x3, Y0 + 2.4, z3, ry); } });
    // a flat-topped wall tower on the curtain
    { const [x, z] = P(-82 * D, 7.85), r = 1.0;
      K.cyl(g, r * 1.1, r * 1.2, Y0 + .5, HSD(), x, 0, z, { seg: 14 }); K.cyl(g, r, r * 1.02, 3.1, HS(), x, Y0 + .5, z, { seg: 14 });
      K.cyl(g, r * 1.12, r * 1.12, .12, M.cap(), x, Y0 + 3.6, z, { seg: 14 });
      for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; Bt.box(M.cap(), .3, .42, .26, x + Math.cos(a) * r * .98, Y0 + 3.72, z + Math.sin(a) * r * .98, -a); }
      K.win(g, .16, .5, x + Math.cos(100 * D) * .99, Y0 + 2.2, z + Math.sin(100 * D) * .99, { ry: PI / 2 - 100 * D }); }

    // ---------------- the castle: hall with white stepped gables and three round towers with owner cones ----------------
    const hall = new T.Group(); hall.position.set(HX, Y0, HZ); g.add(hall);
    K.box(hall, HL + .1, .4, HW + .1, HSD(), 0, -.02, 0);
    K.box(hall, HL, HH, HW, HS());
    K.box(hall, HL + .14, .14, HW + .14, M.cap(), 0, HH - .16, 0);
    K.box(hall, HL + .1, .1, HW + .1, M.cap(), 0, 2.4, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0, y = .4; y < HH - .6; i++, y += .56) {
      const lx = i % 2 ? .55 : .36, lz = i % 2 ? .36 : .55; Bt.box(M.cap(), lx, .3, lz, HX + sx * (HL / 2 - lx / 2 + .04), Y0 + y, HZ + sz * (HW / 2 - lz / 2 + .04)); }
    K.gable(hall, HL - .1, HW, RH - .1, HS(), 0, HH, 0);
    roof2(hall, HL, HW / 2 + .32, RH, ctx.roof, HH - .14);
    const yr = (zz) => RH * (1 - Math.abs(zz) / (HW / 2 + .32)) - .14 + .16;
    for (const sx of [-1, 1]) { const sgb = stepGable(hall, HW / 2 + .06, 4, yr, .32, M.cap(), sx * HL / 2, HH, 0, PI / 2);
      K.cone(hall, .16, .5, M.cap(), sx * HL / 2, HH + sgb.top, 0, { seg: 6 }); K.sphere(hall, .09, M.bronze(), sx * HL / 2, HH + sgb.top + .5, 0, { seg: 8, seg2: 6 }); }
    // front (+z): door with a white frame, two tall and three small windows, a dormer on the roof
    K.door(hall, 1.35, 2.15, .55, 0, HW / 2 + .02, { mat: M.cap() });
    K.door(hall, 1.05, 1.9, .55, 0, HW / 2 + .06, { mat: M.dark() });
    Bt.box(M.cap(), 1.6, .12, .5, HX + .55, Y0 - .02, HZ + HW / 2 + .3);
    for (const x of [-.75, 1.9]) { K.win(hall, .44, 1.1, x, 1.0, HW / 2 + .01); Bt.box(M.cap(), .64, .08, .16, HX + x, Y0 + .96, HZ + HW / 2 + .06); }
    for (const x of [-.75, .55, 1.9]) K.win(hall, .34, .7, x, 2.9, HW / 2 + .01);
    { const d = new T.Group(); d.position.set(1.0, HH - .14 + RH * .42, HW / 2 + .32 - (HW / 2 + .32) * .42); hall.add(d);
      K.box(d, .9, 1.0, 1.0, HS(), 0, -.25, -.45); K.gable(d, 1.1, 1.15, .55, ctx.roof, 0, .75, -.35, { ry: PI / 2 }); K.win(d, .34, .46, 0, .1, .06); }
    // right gable end (+x, towards the basin): windows and a round window in the gable
    for (const z of [-.6, .9]) { K.win(hall, .44, 1.1, HL / 2 + .01, 1.0, z, { ry: PI / 2 }); K.win(hall, .34, .7, HL / 2 + .01, 2.9, z, { ry: PI / 2 }); }
    { const rw = new T.Mesh(new T.CircleGeometry(.34, 16), M.window()); rw.position.set(HL / 2 + .18, HH + .95, 0); rw.rotation.y = PI / 2; hall.add(rw);
      const rf = new T.Mesh(new T.TorusGeometry(.38, .07, 5, 18), M.cap()); rf.position.set(HL / 2 + .18, HH + .95, 0); rf.rotation.y = PI / 2; rf.castShadow = true; hall.add(rf); }
    for (const x of [-1.2, .4]) K.win(hall, .34, .8, x, 2.6, -HW / 2 - .01, { ry: PI });
    // chimney on the back slope with a thin smoke thread
    K.box(hall, .5, 2.0, .5, HS(), -.9, HH + .3, -.95); K.box(hall, .64, .12, .64, M.cap(), -.9, HH + 2.3, -.95);
    K.smoke(hall, -.9, HH + 2.5, -.95, { n: 9, size: .45, rise: 3.2, life: 4, alpha: .38, drift: .8 });

    const T1 = tower(g, Bt, { x: -6.0, z: .25, r: 1.55, h: 7.1, rr: 2.0, rh: 3.5, roof: ctx.roof, seg: 18, wins: [[30 * D, 2.6], [80 * D, 4.2, .2, .7], [-10 * D, 5.6], [120 * D, 6.2]] });
    const T3 = tower(g, Bt, { x: -6.32, z: -3.65, r: 1.2, h: 5.9, rr: 1.55, rh: 2.6, roof: ctx.roof, wins: [[150 * D, 3.2], [200 * D, 4.6], [100 * D, 5.0]] });
    const T2 = tower(g, Bt, { x: -.7, z: -3.45, r: 1.0, h: 5.3, rr: 1.3, rh: 2.3, roof: ctx.roof, wins: [[20 * D, 2.8], [70 * D, 4.4], [-60 * D, 3.6]] });
    for (const T_ of [T2, T3]) { K.cyl(T_.t, .03, .05, .5, M.iron(), 0, T_.tip - .05, 0, { seg: 5 }); K.sphere(T_.t, .08, M.bronze(), 0, T_.tip + .45, 0, { seg: 8, seg2: 6 }); }
    if (ctx.owned) K.flag(T1.t, { x: 0, y: T1.tip - .05, z: 0, poleH: 1.35, w: 1.55, h: .82, mat: ctx.cloth, knob: M.bronze(), dir: .3 });
    else { K.cyl(T1.t, .04, .06, .9, M.bronze(), 0, T1.tip - .05, 0, { seg: 6 }); K.sphere(T1.t, .11, M.bronze(), 0, T1.tip + .85, 0, { seg: 8, seg2: 6 }); }

    // ---------------- lighthouse on its round bastion at the harbour mouth ----------------
    const lh = new T.Group(); lh.position.set(BX, 0, BZ); g.add(lh);
    K.cyl(lh, BR + .05, BR + .15, 1.1, HSD(), 0, 0, 0, { seg: 22 });
    K.cyl(lh, BR + .145, BR + .15, .24, ALGAE(), 0, WL - .03, 0, { seg: 22 });
    K.cyl(lh, BR + .1, BR + .1, .1, M.cap(), 0, 1.1, 0, { seg: 22 });
    K.cyl(lh, BR, BR + .02, BH - 1.2, HS(), 0, 1.2, 0, { seg: 22 });
    K.cyl(lh, BR + .12, BR + .12, .14, M.cap(), 0, BH, 0, { seg: 22 });
    for (let i = 0; i < 16; i++) { const a = (i + .5) / 16 * PI * 2; if (st >= 1 && Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < .3) continue; Bt.box(M.cap(), .34, .42, .28, BX + Math.cos(a) * (BR - .02), BH + .14, BZ + Math.sin(a) * (BR - .02), -a); }
    K.door(lh, .9, 1.45, 0, Y0, 0, { mat: M.dark(), ry: -PI / 2 }).position.set(-BR - .01, Y0 - .02, 0);
    for (const [x, z, s] of [[8.95, .6, .42], [9.02, -.35, .36], [8.55, 1.15, .26]]) K.rock(g, x, .05, z, s, HSD());
    // the tower: white, tapered, two blue-grey bands, window slits, corbelled gallery, glowing lantern room, owner cap roof
    const L0 = BH + .14, LH = 11.8, rb = 1.1, rt = .8, rAt = (y) => rb + (rt - rb) * (y - L0 - .5) / LH;
    K.cyl(lh, 1.28, 1.34, .5, HS(), 0, L0, 0, { seg: 18 });
    K.cyl(lh, 1.36, 1.36, .08, M.cap(), 0, L0 + .5, 0, { seg: 18 });
    K.cyl(lh, rt, rb, LH, LW(), 0, L0 + .5, 0, { seg: 18 });
    for (const [y0, y1] of [[L0 + 3.9, L0 + 4.9], [L0 + 7.7, L0 + 8.7]]) K.cyl(lh, rAt(y1) + .025, rAt(y0) + .025, y1 - y0, BAND(), 0, y0, 0, { seg: 18 });
    K.door(lh, .55, 1.05, 0, 0, 0, { mat: M.dark(), ry: -PI / 2 }).position.set(-rAt(L0 + .6) - .03, L0 + .5, 0);
    for (const [a, y] of [[60 * D, 3.0], [120 * D, 5.3], [30 * D, 6.4], [170 * D, 7.2], [80 * D, 9.3], [-20 * D, 10.2], [140 * D, 11.0]]) { const r = rAt(L0 + .5 + y) - .01; K.win(lh, .16, .5, Math.cos(a) * r, L0 + .5 + y, Math.sin(a) * r, { ry: PI / 2 - a }); }
    const GY = L0 + .5 + LH;
    K.cyl(lh, 1.26, .82, .6, LW(), 0, GY - .6, 0, { seg: 18 });
    for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * PI * 2; Bt.box(M.cap(), .14, .5, .18, BX + Math.cos(a) * .9, GY - .72, BZ + Math.sin(a) * .9, -a, 0, 0); }
    K.cyl(lh, 1.32, 1.32, .16, M.cap(), 0, GY, 0, { seg: 18 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; Bt.box(M.iron(), .05, .56, .05, BX + Math.cos(a) * 1.24, GY + .16, BZ + Math.sin(a) * 1.24); }
    K.torus(lh, 1.24, .035, M.iron(), 0, GY + .72, 0, { seg: 32, seg2: 4 });
    K.cyl(lh, .78, .8, .36, HS(), 0, GY + .16, 0, { seg: 12 });
    const lamp = K.cyl(lh, .66, .66, 1.15, LAMP(), 0, GY + .52, 0, { seg: 8, cast: false });
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * PI * 2; Bt.box(M.iron(), .07, 1.15, .07, BX + Math.cos(a) * .67, GY + .52, BZ + Math.sin(a) * .67, -a); }
    K.cyl(lh, .84, .84, .1, M.iron(), 0, GY + 1.67, 0, { seg: 12 });
    K.cone(lh, 1.12, 1.5, ctx.roof, 0, GY + 1.77, 0, { seg: 12 });
    const LT = GY + 1.77 + 1.5;
    K.sphere(lh, .12, M.bronze(), 0, LT - .02, 0, { seg: 8, seg2: 6 });
    K.cyl(lh, .025, .04, .7, M.iron(), 0, LT + .06, 0, { seg: 5 }); K.sphere(lh, .06, M.bronze(), 0, LT + .76, 0, { seg: 6, seg2: 4 });
    // the lamp: one real light, a small halo and a slow sweeping beam (night only)
    const LY = GY + 1.1, light = new T.PointLight(0xffdca0, 0, 32, 1.3); light.position.set(0, LY, 0); lh.add(light); light.userData.base = 55; OW.nightLights.push(light);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: OW.TEX.soft(), color: 0xffd999, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    halo.scale.setScalar(3.2); halo.position.y = LY; halo.userData.noOutline = true; lh.add(halo);
    K.tick((t, env) => { const f = .94 + Math.sin(t * 3.1) * .04; lamp.material.emissiveIntensity = .5 + env.night * 3.4 * f; light.intensity = env.night * light.userData.base * f;
      halo.material.opacity = env.night * .55 * f; });

    // ---------------- back quay: warehouse, treadwheel crane, goods ----------------
    const wh = new T.Group(); wh.position.set(2.9, Y0, -4.6); g.add(wh);
    K.box(wh, 4.0, .3, 2.5, HSD(), 0, -.02, 0);
    K.box(wh, 3.9, 2.7, 2.4, HS());
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0, y = .3; y < 2.4; i++, y += .5) { const lx = i % 2 ? .46 : .3, lz = i % 2 ? .3 : .46; Bt.box(M.cap(), lx, .26, lz, 2.9 + sx * (1.95 - lx / 2 + .03), Y0 + y, -4.6 + sz * (1.2 - lz / 2 + .03)); }
    K.gable(wh, 3.9, 2.4, 1.35, HS(), 0, 2.7, 0);
    roof2(wh, 4.3, 1.45, 1.45, ctx.roof, 2.62);
    for (const x of [-1.0, 1.0]) { K.door(wh, 1.0, 1.55, x, 0, 1.21, { mat: M.cap() }); K.door(wh, .8, 1.42, x, 0, 1.24, { mat: M.darkWood() }); }
    K.box(wh, .7, .7, .06, M.darkWood(), 0, 1.85, 1.22);
    K.box(wh, .14, .14, .8, M.darkWood(), 0, 2.36, 1.6); rod(wh, [0, 2.36, 1.92], [0, 1.5, 1.92], .02, M.rope(), 3);
    for (const x of [-1.2, 0, 1.2]) K.win(wh, .3, .45, x, 1.5, -1.21, { ry: PI });
    // treadwheel crane on the back quay, its jib over the water
    const cr = new T.Group(); cr.position.set(4.55, Y0, -.72); g.add(cr);
    K.box(cr, 1.5, .24, 1.2, HSD(), 0, -.02, 0);
    K.box(cr, 1.3, 2.1, 1.05, M.wood(), 0, .22, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Bt.box(M.darkWood(), .14, 2.1, .14, 4.55 + sx * .62, Y0 + .22, -.72 + sz * .49);
    K.pyramid(cr, 1.55, 1.3, .85, M.darkWood(), 0, 2.32, 0);
    rod(cr, [0, 2.0, .45], [0, 3.05, 2.25], .085, M.darkWood());
    rod(cr, [0, 1.0, .55], [0, 2.75, 1.95], .06, M.darkWood());
    rod(cr, [0, 3.0, 2.22], [0, 1.52, 2.22], .018, M.rope(), 3);
    K.box(cr, .5, .44, .5, M.wood(), 0, 1.08, 2.22, { ry: .4 });
    { const wg2 = new T.TorusGeometry(.82, .07, 5, 20); const wm = K.put(cr, wg2, M.darkWood(), -.78, 1.12, 0, { ry: PI / 2 });
      for (let i = 0; i < 3; i++) K.put(cr, new T.BoxGeometry(.06, 1.6, .06), M.darkWood(), -.78, 1.12, 0, { rx: i * PI / 3 + .01 });
      wm.castShadow = true; }
    // goods
    for (const [x, y, z, s, r] of [[3.1, 0, -1.3, .55, .2], [3.1, .55, -1.3, .45, .6], [2.45, 0, -1.5, .55, -.3], [1.4, 0, -2.6, .55, .1], [1.95, 0, -2.75, .5, .5], [1.6, .55, -2.65, .45, .3]]) crate(x, Y0 + y, z, s, r);
    for (const [x, z] of [[5.75, -.45], [4.3, -2.6], [4.75, -2.8], [5.15, -2.55]]) barrel(x, Y0, z);

    // ---------------- front quay: pier into the basin, goods, lanterns ----------------
    const pz = 6.0, px1 = 3.4;
    Bt.box(M.wood(), px1 - XQ + .4, .1, 1.1, (XQ - .4 + px1) / 2, .72, pz);
    for (const x of [1.4, 2.4, px1 - .1]) for (const s of [-1, 1]) Bt.cyl(M.darkWood(), .08, .08, .64, x, .12, pz + s * .5, 6);
    for (let i = 0; i < 6; i++) Bt.box(M.darkWood(), .06, .04, 1.14, XQ + .4 + i * .5, .82, pz);
    bollard(px1 - .2, .82, pz + .4); bollard(px1 - .2, .82, pz - .4);
    lantern(px1 - .15, .82, pz, 1.3);
    for (const [x, z] of [[-.8, 5.1], [-.45, 5.5], [-2.4, 6.4]]) barrel(x, Y0, z);
    for (const [x, y, z, s, r] of [[-1.1, 0, 6.7, .55, .3], [-.6, 0, 7.05, .5, -.2], [-.95, .55, 6.8, .42, .7], [-3.0, 0, 5.9, .55, 0]]) crate(x, Y0 + y, z, s, r);
    lantern(-1.0, Y0, 3.1, 1.6);
    for (const x of [1.0, 1.9, 2.8]) Bt.cyl(M.darkWood(), .085, .085, .5, x, .34, pz - .6, 6);
    rod(g, [XQ - .2, Y0 + .28, 3.4], [.62, WL + .5, 4.6], .016, M.rope(), 3); rod(g, [px1 - .2, .82 + .28, pz - .4], [3.8, WL + .55, 4.85], .016, M.rope(), 3);
    { const ct = new T.Group(); ct.position.set(-3.9, Y0, 4.4); ct.rotation.y = .6; g.add(ct);
      K.box(ct, 1.3, .4, .8, M.wood(), 0, .42, 0); K.box(ct, 1.34, .08, .84, M.darkWood(), 0, .82, 0);
      for (const zz of [-1, 1]) { K.put(ct, new T.CylinderGeometry(.34, .34, .08, 10), M.darkWood(), -.1, .34, zz * .46, { rx: PI / 2 }); rod(ct, [.6, .6, zz * .3], [1.4, .1, zz * .3], .035, M.darkWood(), 4); }
      crate(-3.9 + Math.cos(.6) * -.2, Y0 + .86, 4.4 + Math.sin(.6) * .2, .45, .6); barrel(-3.9 + Math.cos(.6) * .35, Y0 + .86, 4.4 - Math.sin(.6) * .35); }

    // ---------------- ships ----------------
    ship(g, Bt, { x: 2.2, z: 4.68, ry: 0, L: 3.4, B: 1.25, fb: .5, sh: .22, dr: .35, sw: .6, mastX: .15, mastH: 3.5, sailW: 1.8, sailH: 1.75 }, ctx);
    { // a rowing boat tied to the left quay
      const rb2 = new T.Group(); rb2.position.set(1.45, WL, 3.15); rb2.rotation.y = .12; g.add(rb2);
      K.put(rb2, hullGeo(1.7, .72, .22, .1, .16, .55).geo, HULL(), 0, 0, 0);
      K.box(rb2, .12, .05, .62, M.wood(), .05, .12, 0);
      for (const s of [-1, 1]) rod(rb2, [-.1, .2, s * .3], [.75, .02, s * .55], .025, M.wood(), 4);
      K.tick((t) => { rb2.position.y = WL + Math.sin(t * 1.4) * .03; rb2.rotation.z = Math.sin(t * 1.1) * .03; }); }

    // ---------------- step 1 (lv 65-69): cog, chain tower + harbour chain, bartizan, more lanterns, banners ----------------
    if (st >= 1) {
      ship(g, Bt, { x: 3.95, z: 1.2, ry: 0, L: 5.3, B: 1.85, fb: .82, sh: .38, dr: .45, sw: .72, mastX: -.2, mastH: 5.2, sailW: 2.45, sailH: 2.4, cog: true, lowerYard: true }, ctx);
      const CT = tower(g, Bt, { x: MX, z: MZ, r: .78, h: 3.0, rr: 1.05, rh: 1.7, roof: ctx.roof, seg: 14, wins: [[200 * D, 2.2], [120 * D, 2.9]] });
      K.sphere(CT.t, .08, M.bronze(), 0, CT.tip, 0, { seg: 8, seg2: 6 });
      // the chain across the mouth, sagging to the water
      const A = [MX - .05, Y0 + .45, MZ - .95], Bp = [BX + .05, 1.35, BZ + BR + .02], nL = 13;
      for (let i = 0; i <= nL; i++) { const k = i / nL, x = A[0] + (Bp[0] - A[0]) * k, z = A[2] + (Bp[2] - A[2]) * k, y = A[1] + (Bp[1] - A[1]) * k - 4 * (Math.min(A[1], Bp[1]) - WL - .1) * k * (1 - k);
        const tg2 = new T.TorusGeometry(.12, .035, 4, 8); if (i % 2) Bt.add(M.iron(), tg2, x, y, z, PI / 2, 0, 0); else Bt.add(M.iron(), tg2, x, y, z, 0, PI / 2, 0); }
      Bt.box(M.iron(), .3, .3, .12, Bp[0], Bp[1] - .15, Bp[2] - .02); Bt.box(M.iron(), .3, .3, .12, A[0], A[1] - .15, A[2] + .02);
      // bartizan on the bastion rim at the mouth
      const bt = new T.Group(); bt.position.set(BX, BH, BZ + BR - .12); g.add(bt);
      K.cyl(bt, .5, .12, .8, HS(), 0, -.8, 0, { seg: 10 }); K.cyl(bt, .5, .5, 1.25, HS(), 0, 0, 0, { seg: 10 });
      K.cyl(bt, .56, .56, .08, M.cap(), 0, 1.25, 0, { seg: 10 }); K.cone(bt, .66, 1.0, ctx.roof, 0, 1.33, 0, { seg: 10 });
      K.win(bt, .12, .36, 0, .45, .5);
      // more lanterns along the quays and the sea wall
      lantern(1.35, Y0, ZQ - .35, 1.5); lantern(XQ - .3, Y0, 1.3, 1.5); lantern(6.3, Y0, ZQ - .3, 1.5); { const [x, z] = P(52 * D, 7.9); lantern(x, Y0, z, 1.3); } { const [x, z] = P(78 * D, 7.9); lantern(x, Y0, z, 1.3); }
      lantern(-2.6, Y0, 1.1, 1.6);
      // banners on the hall front (owned only)
      if (ctx.owned) for (const x of [-.1, 1.2]) K.banner(hall, { x, y: HH - .4, z: HW / 2 + .02, w: .55, h: 1.5, mat: ctx.cloth, rod: M.bronze() });
    } else {
      // step 0: a beacon basket on the mole head
      K.cyl(g, .26, .3, 1.0, HS(), MX, Y0 - .02, MZ, { seg: 8 }); K.cyl(g, .3, .14, .3, M.iron(), MX, Y0 + .98, MZ, { seg: 8 });
      K.cyl(g, .26, .26, .04, M.ember(), MX, Y0 + 1.24, MZ, { seg: 8 }); K.flameAt(g, MX, Y0 + 1.25, MZ, { size: .15, light: false });
    }

    Bt.flush();
    g.userData = { top: LT + .82, radius: 9.45, smoke: [[HX, HH + 3.5, HZ], [BX, GY + 1, BZ], [2.9, 4.8, -4.6]] };
    return g;
  }
  OW.addTier(6, { build, plotR: 9.8, islandR: 15.3 });
})();


// ===== Open Water Baukunst · Tier 7 · Palastburg (lv 70-79) =====
// Cream limestone + gold + bronze. Silhouette: ONE big owner-coloured dome on a drum (gold ribs, gold lantern) over a square
// great hall, four slender towers with tall bell-cast owner spires at the hall corners, low arcaded wings left and right,
// all on a terrace with a grand front staircase. In front: a garden court with a fountain, parterres and clipped hedges.
// Step 1 (75-79): two small side domes on the wings, thicker gilded dome ribs, banners on the four towers, garden lanterns.
(function () {
  const T = THREE, K = OW.K, M = OW.M, { plate } = OW.basisHelpers;
  const mats = {};
  const mat = (k, o) => { if (mats[k]) return mats[k]; const m = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)); if (o.map) { m.bumpMap = o.map; if (o.bumpScale == null) m.bumpScale = 1.0; } return mats[k] = m; };
  const LIME = () => mat('lime', { color: 0xefe1c2, map: OW.TEX.ashlar(), bumpScale: .8 });          // the tier stone: warm cream limestone
  const LIMEDK = () => mat('limeDk', { color: 0xdcc69c, map: OW.TEX.ashlar(), bumpScale: 1.1 });     // podium, plinths
  const LIMELT = () => mat('limeLt', { color: 0xfaf2df, roughness: .7 });                            // cornices, columns, balusters
  const PAVE = () => mat('pave', { color: 0xeadfc4, map: OW.TEX.marble(), roughness: .6, bumpScale: .3 });
  const GRAV = () => mat('gravel7', { color: 0xdccba5, map: OW.TEX.cobble(), bumpScale: .3 });
  const HEDGE = () => mat('hedge7', { color: 0x3f6d33, map: OW.TEX.grass(), bumpScale: .8 });
  const TOPI = () => mat('topiary7', { color: 0x4d7e39, map: OW.TEX.grass(), bumpScale: .8 });
  const CYP = () => mat('cypress7', { color: 0x345a2f, map: OW.TEX.grass(), bumpScale: .8 });
  const FLOW = () => mat('flowers7', { color: 0xecc84e, map: OW.TEX.cobble(), bumpScale: .6 });
  const FLOW2 = () => mat('flowers7w', { color: 0xf3efe3, map: OW.TEX.cobble(), bumpScale: .6 });
  const FRUIT = () => mat('fruit7', { color: 0xf09a32, roughness: .6 });
  const SPRAY = () => mat('spray7', { color: 0xe4f3ef, transparent: true, opacity: .5, depthWrite: false, side: T.DoubleSide, roughness: .2, flatShading: false });

  // ---- batching: many small repeated parts become one mesh per material ----
  function Batch(root) { this.root = root; this.m = new Map(); }
  Batch.prototype.addM = function (m, geo, mt) { const gg = geo.index ? geo.toNonIndexed() : geo; if (gg !== geo) geo.dispose(); if (mt) gg.applyMatrix4(mt); let l = this.m.get(m); if (!l) this.m.set(m, l = []); l.push(gg); };
  Batch.prototype.add = function (m, geo, x, y, z, ry = 0) { this.addM(m, geo, new T.Matrix4().makeRotationY(ry).setPosition(x, y, z)); };
  Batch.prototype.box = function (m, w, h, d, x, y, z, ry = 0) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); K.worldUV(g, .25); this.add(m, g, x, y, z, ry); };
  Batch.prototype.cyl = function (m, rt, rb, h, x, y, z, seg = 8) { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); K.worldUV(g, .25, true); this.add(m, g, x, y, z); };
  Batch.prototype.flush = function () {
    for (const [m, list] of this.m) { let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
      const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
      const mesh = new T.Mesh(bg, m); mesh.castShadow = !m.transparent; mesh.receiveShadow = true; this.root.add(mesh); }
    this.m.clear();
  };

  // ---- geometry helpers ----
  const V2 = (pts) => pts.map(([r, y]) => new T.Vector2(r, y));
  function lathe(p, pts, m, x, y, z, seg = 24, o = {}) { const g = new T.LatheGeometry(V2(pts), seg); K.worldUV(g, o.uv || .35, true); return K.put(p, g, m, x, y, z, o); }
  function archShape(w, h, y0 = 0, cx = 0) { const s = new T.Shape(); s.moveTo(cx - w / 2, y0); s.lineTo(cx + w / 2, y0); s.lineTo(cx + w / 2, h - w / 2); s.absarc(cx, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(cx - w / 2, y0); return s; }
  const archGeo = (w, h, d) => new T.ExtrudeGeometry(archShape(w, h), { depth: d, bevelEnabled: false, curveSegments: 3 });
  // arched glowing window with a light stone frame, gold keystone and sill; face normal = +z rotated by ry
  function win(B, x, y, z, ry, w, h, o = {}) {
    const f = archGeo(w + .16, h + .1, .05); f.translate(0, -.06, 0); B.add(o.frame || LIMELT(), f, x, y, z, ry);
    B.add(M.window(), archGeo(w, h, .08), x, y, z, ry);
    if (o.key !== false) { const k = new T.BoxGeometry(.13, .2, .1); k.translate(0, h + .03, .05); B.add(M.gold(), k, x, y, z, ry); }
    if (o.sill !== false) { const s = new T.BoxGeometry(w + .28, .07, .14); s.translate(0, -.08, .05); B.add(LIMELT(), s, x, y, z, ry); }
  }
  // round glowing window with a gold rim, facing ry, tilted up by tilt
  function oculus(B, x, y, z, ry, r, tilt = 0) {
    const mt = new T.Matrix4().makeRotationY(ry).multiply(new T.Matrix4().makeRotationX(-tilt)); mt.setPosition(x, y, z);
    const d = new T.CylinderGeometry(r, r, .08, 12); d.rotateX(Math.PI / 2); B.addM(M.window(), d, mt);
    const t = new T.TorusGeometry(r + .03, .06, 5, 14); t.translate(0, 0, .03); B.addM(M.gold(), t, mt);
  }
  let _bal = null, _urn = null;
  const balGeo = () => (_bal || (_bal = new T.LatheGeometry(V2([[.066, 0], [.04, .13], [.072, .24], [.046, .34]]), 5))).clone();
  const urnGeo = () => (_urn || (_urn = new T.LatheGeometry(V2([[.001, 0], [.09, 0], [.05, .06], [.12, .17], [.05, .29], [.001, .37]]), 6))).clone();
  function post(B, x, y, z, urn) { B.box(LIMELT(), .26, .58, .26, x, y, z); B.box(LIMELT(), .32, .06, .32, x, y + .58, z); if (urn) B.add(urn, urnGeo(), x, y + .64, z); }
  // a balustrade from (x1,z1) to (x2,z2) standing at y: plinth, vase balusters, hand rail, posts with urns at both ends
  function balustrade(B, x1, z1, x2, z2, y, urn, posts = true) {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = -Math.atan2(z2 - z1, x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    B.box(LIMELT(), len, .08, .2, mx, y, mz, ry); B.box(LIMELT(), len + .02, .08, .24, mx, y + .42, mz, ry);
    const n = Math.max(1, Math.round(len / .27));
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; B.add(LIMELT(), balGeo(), x1 + (x2 - x1) * t, y + .08, z1 + (z2 - z1) * t); }
    if (posts) { post(B, x1, y, z1, urn); post(B, x2, y, z2, urn); }
  }
  // dome profile: a slightly raised hemisphere with a small kick at the foot
  function domeProfile(R, H, lip, n = 14) { const pts = [[R + lip, 0], [R, lip]]; for (let k = 1; k <= n; k++) { const ph = k / n * Math.PI / 2; pts.push([Math.max(.001, R * Math.cos(ph)), lip + H * Math.sin(ph)]); } return pts; }
  // gold ribs following the dome profile from the foot to the lantern ring
  function domeRibs(B, cx, cy, cz, R, H, lip, n, rr, rTop, a0 = 0) {
    const phMax = Math.acos(rTop / R);
    for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2, pts = [];
      for (let k = 0; k <= 12; k++) { const ph = k / 12 * phMax, nx = Math.cos(ph) / R, ny = Math.sin(ph) / H, nl = Math.hypot(nx, ny), r = R * Math.cos(ph) + nx / nl * rr * .45, y = lip + H * Math.sin(ph) + ny / nl * rr * .45;
        pts.push(new T.Vector3(cx + Math.cos(a) * r, cy + y, cz + Math.sin(a) * r)); }
      B.addM(M.gold(), new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, rr, 5, false), null); }
  }
  // a hanging banner with the rod centred over the cloth (as tier 5)
  function banner(p, o) {
    const g = new T.Group(); g.position.set(o.x, o.y, o.z); g.rotation.y = o.ry || 0; p.add(g);
    const w = o.w, h = o.h; K.cyl(g, .035, .035, w + .24, M.gold(), (w + .24) / 2, 0, .06, { rz: Math.PI / 2, seg: 6 });
    for (const s of [-1, 1]) K.sphere(g, .06, M.gold(), s * (w + .24) / 2, -.06, .06, { seg: 6, seg2: 4 });
    const geo = new T.PlaneGeometry(w, h, 3, 8); geo.translate(0, -h / 2, .1);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < -h + .01 && Math.abs(x) < .01) pos.setY(i, y - w * .35); }
    const m = new T.Mesh(geo, o.mat); m.castShadow = true; g.add(m);
    const e = new T.Mesh(new T.CircleGeometry(w * .24, 16), M.gold()); e.position.set(0, -h * .36, .12); g.add(e);
    const base = pos.array.slice(), ph0 = o.x * 1.7 + o.z;
    K.tick((t) => { for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1], k = -y / h; pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 1.6 + ph0 + y * 1.5) * .06 * k); } pos.needsUpdate = true; });
    return g;
  }

  // ---- layout ----
  const Y0 = 1.1, ZC = -2.5, HW = 4.0, HD = 3.9, HH = 5.6, HT = Y0 + HH, RY = HT + .3;   // terrace top, hall centre z, hall half sizes, wall height, wall top, roof
  const TX = 4.3, TD = 4.15, TRr = .82, TOPY = 7.9;                                       // corner towers at (±TX, ZC±TD), shaft top
  const DBR = 3.55, DR = 3.25, DB = RY + .45, DT = DB + 2.5, DOMY = DT + .25, DOMR = 3.4, DOMH = 3.9, LIP = .06;   // drum and dome
  const WX = 5.6, WW = 3.2, WZ0 = -5.2, WZ1 = -.2, WH = 3.9, WT = Y0 + WH, WZC = (WZ0 + WZ1) / 2;              // wings
  const PF = 3.0, PB = -8.0, PX = 7.7, CB = 2.9, CF = .5, CI = .15 * (Math.SQRT2 - 1);                                                     // terrace front z, back z, half width
  const FZ = 6.9;                                                                          // fountain centre
  const SPIRE = [[.82, 0], [.64, .28], [.48, .9], [.33, 1.7], [.18, 2.5], [.04, 3.15], [.001, 3.25]];

  function podShape(off) {
    const x = PX + off, zb = PB - off, zf = PF + off, cb = CB, cf = CF;
    const P = [[-x + cf, zf], [x - cf, zf], [x, zf - cf], [x, zb + cb], [x - cb, zb], [-x + cb, zb], [-x, zb + cb], [-x, zf - cf]];
    return new T.Shape(P.map(([a, b]) => new T.Vector2(a, -b)));
  }
  function podGeo(off, h) { const geo = new T.ExtrudeGeometry(podShape(off), { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); K.worldUV(geo, .25); return geo; }

  // a slender corner tower: plinth, shaft, gallery on corbels, belvedere, bell-cast owner spire, gold finial
  function tower(B, g, ctx, x, z, sx, sz, st) {
    const a = Math.atan2(sz, sx), r = TRr, S = { seg: 18 };
    K.cyl(g, r + .1, r + .15, .8, LIMEDK(), x, Y0, z, S);
    K.cyl(g, r + .13, r + .13, .07, LIMELT(), x, Y0 + .8, z, S);
    K.cyl(g, r * .96, r, TOPY - .45 - Y0, LIME(), x, Y0, z, S);
    K.cyl(g, r + .06, r + .06, .16, LIMELT(), x, Y0 + 2.85, z, S);
    K.cyl(g, r + .05, r + .05, .1, M.gold(), x, HT - .22, z, S);
    K.cyl(g, r + .14, r + .1, .3, LIMELT(), x, HT, z, S);
    K.cyl(g, r + .3, r * .96, .45, LIMELT(), x, TOPY - .45, z, S);                      // corbel under the gallery
    K.cyl(g, r + .35, r + .35, .05, M.gold(), x, TOPY - .03, z, S);
    K.cyl(g, r + .33, r + .33, .12, LIMELT(), x, TOPY, z, S);
    for (let i = 0; i < 16; i++) { const b = (i + .5) / 16 * Math.PI * 2; B.add(LIMELT(), balGeo(), x + Math.cos(b) * (r + .22), TOPY + .12, z + Math.sin(b) * (r + .22)); }
    K.torus(g, r + .22, .05, LIMELT(), x, TOPY + .5, z, { seg: 24, seg2: 5 });
    K.cyl(g, .6, .64, 1.15, LIME(), x, TOPY + .12, z, { seg: 14 });                       // belvedere
    for (let k = 0; k < 4; k++) { const b = Math.PI / 4 + k * Math.PI / 2; win(B, x + Math.cos(b) * .63, TOPY + .3, z + Math.sin(b) * .63, Math.PI / 2 - b, .24, .6, { frame: M.gold(), key: false, sill: false }); }
    const ey = TOPY + 1.27;
    K.cyl(g, .76, .7, .12, LIMELT(), x, ey, z, { seg: 14 });
    K.torus(g, .8, .05, M.gold(), x, ey + .14, z, { seg: 20, seg2: 5 });
    lathe(g, SPIRE, ctx.roof, x, ey + .12, z, 18);
    const tip = ey + .12 + 3.25;
    K.sphere(g, .1, M.gold(), x, tip - .02, z, { seg: 8, seg2: 6 });
    K.cone(g, .045, .55, M.gold(), x, tip, z, { seg: 5 });
    // windows on the outer faces
    for (const [da, y, h] of [[0, Y0 + 1.05, .75], [0, Y0 + 3.35, .85], [0, Y0 + 5.2, .75], [-1.05, Y0 + 2.2, .6], [1.05, Y0 + 4.3, .6]]) {
      const b = a + da; win(B, x + Math.cos(b) * (r + .01), y, z + Math.sin(b) * (r + .01), Math.PI / 2 - b, .26, h, { sill: false }); }
    // step 1: a banner on the outer face (front towers face +z, back towers face -z)
    if (st >= 1 && ctx.owned) { const b = sz > 0 ? Math.PI / 2 : -Math.PI / 2; banner(g, { x: x + Math.cos(b) * (r + .06), y: TOPY - .55, z: z + Math.sin(b) * (r + .06), ry: Math.PI / 2 - b, w: .68, h: 2.5, mat: ctx.cloth }); }
    return tip + .55;
  }

  // an arcaded wing (s = +1 right, -1 left): loggia on the ground floor, windowed upper floor, balustraded flat roof
  function wing(B, g, ctx, s, st) {
    const cx = s * WX;
    K.box(g, WW + .06, .7, WZ1 - 1.0 - WZ0 + .06, LIMEDK(), cx, Y0, (WZ0 + WZ1 - 1.0) / 2);
    K.box(g, WW, WH, WZ1 - 1.0 - WZ0, LIME(), cx, Y0, (WZ0 + WZ1 - 1.0) / 2);             // main block
    K.box(g, WW, WH - 2.3, 1.0, LIME(), cx, Y0 + 2.3, WZ1 - .5);                            // upper floor over the loggia
    K.box(g, .3, 2.3, .7, LIME(), cx + s * (WW / 2 - .15), Y0, WZ1 - .65);                  // loggia end wall
    // arcade front: a wall with three arched openings
    const sh = new T.Shape(); sh.moveTo(-WW / 2, 0); sh.lineTo(WW / 2, 0); sh.lineTo(WW / 2, 2.3); sh.lineTo(-WW / 2, 2.3); sh.closePath();
    const aw = .74, ah = 1.95, step = WW / 3;
    for (let i = 0; i < 3; i++) { const ax = (i - 1) * step; const hp = new T.Path(); hp.moveTo(ax - aw / 2, .12); hp.lineTo(ax - aw / 2, ah - aw / 2); hp.absarc(ax, ah - aw / 2, aw / 2, Math.PI, 0, true); hp.lineTo(ax + aw / 2, .12); hp.lineTo(ax - aw / 2, .12); sh.holes.push(hp); }
    const ag = new T.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: false, curveSegments: 6 }); K.worldUV(ag, .25); K.put(g, ag, LIME(), cx, Y0, WZ1 - .3);
    for (let i = 0; i < 3; i++) { const ax = cx + (i - 1) * step; win(B, ax, Y0 + .16, WZ1 - .97, 0, .46, 1.35, { key: false, sill: false }); }
    for (const px of [-.5, .5]) { const x = cx + px * step; B.cyl(LIMELT(), .085, .1, 1.95, x, Y0, WZ1 + .02, 8); B.box(M.gold(), .24, .1, .24, x, Y0 + 1.95, WZ1 + .02); }
    // string course, cornice, gold band
    K.box(g, WW + .04, .14, WZ1 - WZ0 + .04, LIMELT(), cx, Y0 + 2.3, WZC);
    K.box(g, WW + .02, .08, WZ1 - WZ0 + .02, M.gold(), cx, WT - .12, WZC);
    K.box(g, WW + .14, .25, WZ1 - WZ0 + .14, LIMELT(), cx, WT, WZC);
    // upper floor: pilasters and windows
    for (const px of [-WW / 2 + .1, -.5 * step, .5 * step, WW / 2 - .1]) B.box(LIMELT(), .16, 1.5, .08, cx + px, Y0 + 2.44, WZ1 + .02);
    for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * step; win(B, x, Y0 + 2.6, WZ1, 0, .42, .98); win(B, x, Y0 + .9, WZ0, Math.PI, .42, 1.2); win(B, x, Y0 + 2.6, WZ0, Math.PI, .42, .98); }
    for (const z of [WZ1 - .65, WZC - .1, WZ0 + .75]) { if (z > WZ1 - 1.1) win(B, cx + s * WW / 2, Y0 + .9, z, s * Math.PI / 2, .38, 1.1, { key: false }); else win(B, cx + s * WW / 2, Y0 + .9, z, s * Math.PI / 2, .42, 1.2); win(B, cx + s * WW / 2, Y0 + 2.6, z, s * Math.PI / 2, .42, .98); }
    // roof balustrade
    const x0 = s * (HW + .12), x1 = s * (HW + WW - .08), zf = WZ1 - .15, zb = WZ0 + .07, yb = WT + .25;
    balustrade(B, x0, zf, x1, zf, yb, M.gold()); balustrade(B, x1, zf, x1, zb, yb, M.gold(), false); balustrade(B, x1, zb, x0, zb, yb, M.gold()); post(B, x1, yb, (zf + zb) / 2, null);
    // step 1: a small side dome on a drum
    if (st >= 1) {
      const y = WT + .25, z = WZC, R = 1.0, H = 1.2;
      K.cyl(g, .92, .95, .8, LIME(), cx, y, z, { seg: 18 });
      for (let k = 0; k < 6; k++) { const b = (k + .5) / 6 * Math.PI * 2; win(B, cx + Math.cos(b) * .93, y + .14, z + Math.sin(b) * .93, Math.PI / 2 - b, .2, .44, { key: false, sill: false }); }
      K.cyl(g, 1.06, 1.0, .14, LIMELT(), cx, y + .8, z, { seg: 18 });
      K.torus(g, R + .04, .05, M.gold(), cx, y + .96, z, { seg: 24, seg2: 5 });
      lathe(g, domeProfile(R, H, .05, 10), ctx.roof, cx, y + .94, z, 22);
      domeRibs(B, cx, y + .94, z, R, H, .05, 8, .06, .22, Math.PI / 8);
      const ty = y + .94 + .05 + H;
      K.cyl(g, .2, .24, .32, M.gold(), cx, ty - .08, z, { seg: 8 });
      K.cone(g, .27, .24, M.gold(), cx, ty + .24, z, { seg: 8 });
      K.sphere(g, .07, M.gold(), cx, ty + .52, z, { seg: 6, seg2: 4 });
      K.cone(g, .035, .45, M.gold(), cx, ty + .5, z, { seg: 5 });
    }
  }

  function build(ctx) {
    const g = new T.Group(), st = OW.stepOf(ctx.level), B = new Batch(g);

    // ---------------- ground: lawn, gravel court around the fountain, paths ----------------
    plate(g, 9.4, M.grass(), { wobble: .03, h: .1, seed: 7 });
    lathe(g, [[9.4, 0], [9.95, 0], [9.95, .24], [9.4, .24], [9.4, 0]], LIMEDK(), 0, 0, 0, 64);   // a light stone rim, so the plot reads on the green map
    K.torus(g, 9.67, .04, M.gold(), 0, .24, 0, { seg: 72, seg2: 4 });
    K.cyl(g, 2.2, 2.2, .06, GRAV(), 0, .1, FZ, { seg: 40, cast: false });
    for (const s of [-1, 1]) K.box(g, 3.8, .05, 1.0, GRAV(), s * 4.1, .1, FZ, { cast: false });
    K.box(g, 1.7, .05, .8, GRAV(), 0, .1, 9.15, { cast: false });
    K.box(g, 15.2, .05, .6, GRAV(), 0, .1, PF + .35, { cast: false });

    // ---------------- terrace (podium) with a gold line and a paved top ----------------
    K.put(g, podGeo(.12, .32), LIMEDK(), 0, 0, 0);
    K.put(g, podGeo(0, Y0 - .14), LIMEDK(), 0, 0, 0);
    K.put(g, podGeo(.05, .05), M.gold(), 0, Y0 - .19, 0);
    K.put(g, podGeo(.12, .14), PAVE(), 0, Y0 - .14, 0, { cast: false });
    // terrace balustrade (bronze urns on the posts)
    for (const s of [-1, 1]) {
      const P = [[2.48, PF - .15], [PX - CF - CI, PF - .15], [PX - .15, PF - CF - CI], [PX - .15, PB + CB + CI], [PX - CB - CI, PB + .15], [0, PB + .15]];
      for (let i = 0; i < P.length - 1; i++) balustrade(B, s * P[i][0], P[i][1], s * P[i + 1][0], P[i + 1][1], Y0, M.bronze(), true);
    }

    // ---------------- grand staircase with sloped cheek walls and two braziers ----------------
    const SN = 6, SD = .34, SH = Y0 / SN, SF = PF + .12, SZ = SF + SN * SD;      // stairs start in front of the terrace cornice
    K.stairs(g, 4.6, SN, SH, SD, LIMELT(), 0, 0, SZ);
    for (const s of [-1, 1]) {
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(SN * SD + .1, 0); sh.lineTo(SN * SD + .1, .6); sh.lineTo(0, Y0 + .6); sh.closePath();
      const geo = new T.ExtrudeGeometry(sh, { depth: .36, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(.18, 0, 0); K.worldUV(geo, .25);
      K.put(g, geo, LIMEDK(), s * 2.48, 0, SF);
      const len = Math.hypot(SN * SD + .1, Y0); K.box(g, .42, .07, len, M.gold(), s * 2.48, (Y0 + .6 + .6) / 2, SF + (SN * SD + .1) / 2, { rx: Math.atan2(Y0, SN * SD + .1) });
      const bz = SZ + .3;
      K.box(g, .66, .85, .66, LIMEDK(), s * 2.48, .1, bz); K.box(g, .78, .1, .78, LIMELT(), s * 2.48, .95, bz);
      K.cyl(g, .12, .16, .12, M.bronze(), s * 2.48, 1.05, bz, { seg: 8 }); K.cyl(g, .36, .14, .26, M.bronze(), s * 2.48, 1.17, bz, { seg: 12 });
      K.torus(g, .36, .035, M.gold(), s * 2.48, 1.43, bz, { seg: 16, seg2: 4 });
      K.cyl(g, .3, .3, .03, M.ember(), s * 2.48, 1.435, bz, { seg: 10 });
      K.flameAt(g, s * 2.48, 1.455, bz, { size: .2, power: 14, range: 11 });
    }

    // ---------------- great hall ----------------
    K.box(g, 2 * HW + .12, .8, 2 * HD + .12, LIMEDK(), 0, Y0, ZC);
    K.box(g, 2 * HW, HH, 2 * HD, LIME(), 0, Y0, ZC);
    K.box(g, 2 * HW + .14, .16, 2 * HD + .14, LIMELT(), 0, Y0 + 2.85, ZC);
    K.box(g, 2 * HW + .08, .1, 2 * HD + .08, M.gold(), 0, HT - .22, ZC);
    K.box(g, 2 * HW + .36, .3, 2 * HD + .36, LIMELT(), 0, HT, ZC);
    const zF = ZC + HD, zB = ZC - HD;
    for (const s of [-1, 1]) { win(B, s * 2.97, Y0 + .95, zF, 0, .5, 1.5); win(B, s * 2.97, Y0 + 3.2, zF, 0, .5, 1.3); }
    for (const x of [-2.5, -.85, .85, 2.5]) { win(B, x, Y0 + .95, zB, Math.PI, .5, 1.5); win(B, x, Y0 + 3.2, zB, Math.PI, .5, 1.3); }
    for (const s of [-1, 1]) for (const dz of [-1.6, 0, 1.6]) oculus(B, s * HW, HT - .6, ZC + dz, s * Math.PI / 2, .2);
    // portico: four columns, entablature with a gold frieze, pediment with a gold disc
    const PZ = zF + .92;
    for (const x of [-1.95, -.65, .65, 1.95]) { B.box(LIMELT(), .5, .22, .5, x, Y0, PZ); B.cyl(LIMELT(), .16, .19, 3.1, x, Y0 + .22, PZ, 10); B.box(M.gold(), .44, .16, .44, x, Y0 + 3.32, PZ); }
    const ez = (zF + PF - .3) / 2, ed = PF - .3 - zF;
    K.box(g, 4.9, .55, ed, LIME(), 0, Y0 + 3.48, ez);
    K.box(g, 4.94, .12, ed + .04, M.gold(), 0, Y0 + 3.7, ez);
    K.box(g, 5.1, .14, ed + .12, LIMELT(), 0, Y0 + 4.03, ez + .02);
    K.gable(g, ed, 5.0, 1.15, LIME(), 0, Y0 + 4.17, ez, { ry: Math.PI / 2 });
    const ra = Math.atan2(1.15, 2.5), rl = Math.hypot(2.5, 1.15);
    for (const s of [-1, 1]) K.box(g, rl + .12, .1, ed + .14, LIMELT(), s * 1.25, Y0 + 4.17 + .575 - .05, ez + .02, { rz: -s * ra });
    K.cyl(g, .3, .3, .05, M.gold(), 0, Y0 + 4.62, PF - .3, { rx: Math.PI / 2, seg: 16 });
    B.add(M.gold(), archGeo(1.7, 2.95, .04), 0, Y0, zF + .05);
    K.door(g, 1.4, 2.75, 0, Y0, zF + .07, { mat: M.dark() });
    // roof balustrade with gold urns
    const bf = zF - .12, bb = zB + .12, bx = HW - .12;
    balustrade(B, -3.4, bf, 3.4, bf, RY, M.gold()); balustrade(B, -3.4, bb, 3.4, bb, RY, M.gold());
    for (const s of [-1, 1]) balustrade(B, s * bx, ZC + 3.3, s * bx, ZC - 3.3, RY, M.gold());

    // ---------------- four slender corner towers ----------------
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(B, g, ctx, sx * TX, ZC + sz * TD, sx, sz, st);

    // ---------------- wings ----------------
    for (const s of [-1, 1]) wing(B, g, ctx, s, st);

    // ---------------- drum, the big owner dome, gold ribs, lantern ----------------
    K.cyl(g, DBR, DBR + .05, .45, LIMEDK(), 0, RY, ZC, { seg: 40 });
    K.cyl(g, DR, DR, DT - DB, LIME(), 0, DB, ZC, { seg: 40 });
    K.cyl(g, DR + .1, DR + .1, .14, LIMELT(), 0, DB, ZC, { seg: 40 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      for (const d of [-.075, .075]) { const b = a + d, x = Math.cos(b) * (DR + .1), z = ZC + Math.sin(b) * (DR + .1); B.cyl(LIMELT(), .08, .095, 2.12, x, DB + .14, z, 8); B.box(M.gold(), .2, .14, .2, x, DB + 2.26, z, -b); }
      const w = a + Math.PI / 12; win(B, Math.cos(w) * (DR + .005), DB + .5, ZC + Math.sin(w) * (DR + .005), Math.PI / 2 - w, .44, 1.3, { sill: false });
    }
    K.cyl(g, DR + .3, DR + .16, .25, LIMELT(), 0, DT, ZC, { seg: 40 });
    lathe(g, domeProfile(DOMR, DOMH, LIP), ctx.roof, 0, DOMY, ZC, 40);
    K.torus(g, DOMR + .08, .08, M.gold(), 0, DOMY + .03, ZC, { seg: 48, seg2: 5 });
    domeRibs(B, 0, DOMY, ZC, DOMR, DOMH, LIP, 8, st >= 1 ? .14 : .08, .86);
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2, ph = .28, r = DOMR * Math.cos(ph) + .02, y = DOMY + LIP + DOMH * Math.sin(ph), tilt = Math.atan2(Math.sin(ph) / DOMH, Math.cos(ph) / DOMR);
      oculus(B, Math.cos(a) * r, y, ZC + Math.sin(a) * r, Math.PI / 2 - a, .14, tilt); }
    const LY = DOMY + LIP + DOMH * Math.sin(Math.acos(.9 / DOMR)) - .12;
    K.cyl(g, .9, .95, .3, LIMELT(), 0, LY, ZC, { seg: 16 });
    K.cyl(g, .56, .56, 1.15, LIMELT(), 0, LY + .3, ZC, { seg: 16 });
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2; win(B, Math.cos(a) * .56, LY + .45, ZC + Math.sin(a) * .56, Math.PI / 2 - a, .2, .78, { frame: M.gold(), key: false, sill: false }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.cyl(M.gold(), .055, .065, 1.15, Math.cos(a) * .72, LY + .3, ZC + Math.sin(a) * .72, 6); }
    K.cyl(g, .97, .9, .15, M.gold(), 0, LY + 1.45, ZC, { seg: 16 });
    lathe(g, [[.84, 0], [.75, .2], [.52, .46], [.28, .64], [.13, .8], [.08, 1.0]], M.gold(), 0, LY + 1.6, ZC, 16);
    K.sphere(g, .17, M.gold(), 0, LY + 2.74, ZC, { seg: 10, seg2: 8 });
    K.cone(g, .075, 1.0, M.gold(), 0, LY + 2.8, ZC, { seg: 6 });
    let top = LY + 3.8;
    if (ctx.owned) { K.flag(g, { x: 0, y: LY + 3.6, z: ZC, poleH: 1.5, w: 2.0, h: 1.0, mat: ctx.cloth, knob: M.gold(), dir: .35, poleMat: M.gold() }); top = LY + 5.2; }
    else K.sphere(g, .09, M.gold(), 0, LY + 3.8, ZC, { seg: 8, seg2: 6 });

    // ---------------- terrace: potted orange trees in bronze pots ----------------
    for (const s of [-1, 1]) for (const x of [5.9, 6.95]) { const px = s * x, pz = 1.4;
      B.cyl(M.bronze(), .26, .2, .42, px, Y0, pz, 10); B.cyl(M.darkWood(), .04, .05, .6, px, Y0 + .4, pz, 5);
      const cr = new T.IcosahedronGeometry(.42, 1); cr.translate(0, .42, 0); B.add(TOPI(), cr, px, Y0 + .85, pz, x);
      for (let k = 0; k < 5; k++) { const b = k * 1.3 + x, f = new T.SphereGeometry(.07, 6, 4); B.add(FRUIT(), f, px + Math.cos(b) * .36, Y0 + 1.1 + (k % 3) * .15, pz + Math.sin(b) * .36); }
    }

    // ---------------- garden court: fountain, parterres, hedges, cypresses ----------------
    const fo = new T.Group(); fo.position.set(0, 0, FZ); g.add(fo);
    K.cyl(fo, 1.5, 1.58, .42, LIMELT(), 0, .1, 0, { seg: 28 });
    K.water(fo, { r: 1.38, y: .56 });
    K.torus(fo, 1.45, .1, LIMELT(), 0, .53, 0, { seg: 32, seg2: 5 });
    K.cyl(fo, .22, .3, 1.0, LIMELT(), 0, .52, 0, { seg: 10 });
    K.cyl(fo, .86, .28, .36, LIMELT(), 0, 1.4, 0, { seg: 16 });
    K.water(fo, { r: .74, y: 1.79 });
    K.torus(fo, .83, .06, M.gold(), 0, 1.77, 0, { seg: 20, seg2: 4 });
    K.cyl(fo, .1, .14, .5, LIMELT(), 0, 1.76, 0, { seg: 8 });
    K.cyl(fo, .42, .14, .2, M.gold(), 0, 2.26, 0, { seg: 12 });
    K.water(fo, { r: .36, y: 2.48 });
    const jet = K.cyl(fo, .02, .06, .62, SPRAY(), 0, 2.46, 0, { seg: 6, cast: false });
    K.tick((t) => { jet.scale.set(1, 1 + Math.sin(t * 5.3) * .12 + Math.sin(t * 11.7) * .05, 1); });
    K.cyl(fo, .88, 1.12, 1.2, SPRAY(), 0, .56, 0, { seg: 20, open: true, cast: false });
    K.cyl(fo, .43, .6, .68, SPRAY(), 0, 1.79, 0, { seg: 14, open: true, cast: false });
    for (const s of [-1, 1]) {
      const cx = s * 4.6, z0 = PF + .5, z1 = PF + 3.1, zc = (z0 + z1) / 2;
      B.box(HEDGE(), 3.4, .42, .3, cx, .1, z1 - .15); B.box(HEDGE(), 3.4, .42, .3, cx, .1, z0 + .15);
      B.box(HEDGE(), .3, .42, 2.0, s * 6.15, .1, zc); B.box(HEDGE(), .3, .42, .8, s * 3.05, .1, z0 + .7); B.box(HEDGE(), .3, .42, .8, s * 3.05, .1, z1 - .7);
      K.torus(g, .78, .15, HEDGE(), cx, .22, zc, { seg: 20, seg2: 5 });
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { B.box((dx * dz > 0) ? FLOW() : FLOW2(), .72, .12, .42, cx + dx * 1.05, .1, zc + dz * .72); const ball = new T.IcosahedronGeometry(.2, 1); B.add(TOPI(), ball, cx + dx * 1.45, .3, zc + dz * .95); }
      B.box(LIMELT(), .5, .35, .5, cx, .1, zc);
      const cone = new T.ConeGeometry(.38, 1.3, 8); cone.translate(0, .65, 0); B.add(TOPI(), cone, cx, .45, zc);
      B.add(M.gold(), new T.SphereGeometry(.08, 6, 4), cx, 1.8, zc);
      // planter cones in front of the parterres
      B.box(LIMELT(), .5, .4, .5, s * 2.9, .1, 8.0); const c2 = new T.ConeGeometry(.34, 1.15, 8); c2.translate(0, .57, 0); B.add(TOPI(), c2, s * 2.9, .5, 8.0);
    }
    // front hedge arc with a gate
    for (const [a0, a1] of [[35, 83], [97, 145]]) { const n = Math.round((a1 - a0) / 5.5);
      for (let i = 0; i < n; i++) { const a = (a0 + (i + .5) * (a1 - a0) / n) * Math.PI / 180, L = 9.25 * (a1 - a0) / n * Math.PI / 180 + .06; B.box(HEDGE(), L, .5, .42, Math.cos(a) * 9.25, .1, Math.sin(a) * 9.25, Math.PI / 2 - a); } }
    for (const s of [-1, 1]) { const a = (90 + s * 7) * Math.PI / 180, x = Math.cos(a) * 9.25, z = Math.sin(a) * 9.25; B.box(LIMELT(), .42, .95, .42, x, .1, z); B.box(LIMELT(), .5, .07, .5, x, 1.05, z); B.add(M.bronze(), urnGeo(), x, 1.12, z); }
    // cypresses around the palace
    const cyp = V2([[.06, 0], [.4, .35], [.5, 1.0], [.44, 1.9], [.26, 2.7], [.04, 3.3], [.001, 3.35]]);
    for (const [x, z, s] of [[-2.6, -8.65, .8], [2.6, -8.65, .8], [0, -8.9, .8], [-8.4, -3.0, 1], [8.4, -3.0, 1], [-8.5, -.2, .9], [8.5, -.2, .9], [-8.2, 2.4, 1], [8.2, 2.4, 1], [-7.6, 4.6, .85], [7.6, 4.6, .85]]) {
      B.cyl(M.darkWood(), .07, .09, .45, x, .1, z, 5); const cg = new T.LatheGeometry(cyp, 8); cg.scale(s, s, s); B.add(CYP(), cg, x, .35, z, x); }

    // ---------------- step 1: lanterns in the garden ----------------
    if (st >= 1) for (const [x, z] of [[-5.8, 6.25], [5.8, 6.25], [-2.65, 7.55], [2.65, 7.55], [-1.3, 8.8], [1.3, 8.8], [-6.7, 3.25], [6.7, 3.25]]) K.lantern(g, x, .12, z, { h: 1.45 });

    B.flush();
    g.userData = { top, radius: 9.8, smoke: [[0, DOMY + 2, ZC], [TX, TOPY + 1, ZC + TD], [-WX, WT + .6, WZC]] };
    return g;
  }
  OW.addTier(7, { build, plotR: 10.1, islandR: 15.5 });
})();
