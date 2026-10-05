// Teil 06-turmhof-festung.js: Stufe 3 Turmhof (30–39) und Stufe 5 Festung (50–59)


// ===== Tier 3 · Turmhof (lv 30-39): walled limestone manor, ONE steep owner pyramid on the keep + two small owner cones in front =====
// Material: light limestone keep, sandstone walls with limestone coping, a timber-framed hall (pale plaster + dark beams).
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const mats = {}; const mat = (k, o) => mats[k] || (mats[k] = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)));
  const PI = Math.PI, R2 = Math.SQRT2;
  const plaster = () => mat('plaster', { color: 0xf3ead8, roughness: .95 });
  const shingleDark = () => mat('shingleDark', { color: 0x7a6552, map: OW.TEX.shingle(), bumpMap: OW.TEX.shingle(), bumpScale: 1, roughness: .9 });

  // ---------- small geometry helpers ----------
  const ext = (shape, d) => new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  const slab = (p, shape, h, m, y) => { const geo = ext(shape, h); geo.rotateX(-PI / 2); K.worldUV(geo, .22); return K.put(p, geo, m, 0, y, 0, { cast: false }); };
  // square frustum (half-widths at bottom and top)
  const frustum = (p, hb, ht, h, m, x = 0, y = 0, z = 0) => K.cyl(p, ht * R2, hb * R2, h, m, x, y, z, { seg: 4, ry: PI / 4 });
  // a straight beam from (x1,y1) to (x2,y2) in the local x/y plane of p, at depth z
  const beam = (p, x1, y1, x2, y2, z, m, t = .12, d = .1) => K.box(p, t, Math.hypot(x2 - x1, y2 - y1), d, m, x1, y1, z, { rz: Math.atan2(-(x2 - x1), y2 - y1) });
  // a face group: its +z is the outward normal, x runs to the viewer's right
  const face = (p, ry) => { const f = new T.Group(); f.rotation.y = ry; p.add(f); return f; };
  const arch = (w, h) => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, PI, 0, true); s.lineTo(w / 2, 0); s.closePath(); return s; };
  // arched glowing window with a stone frame and sill on a face plane at z
  const archWin = (p, w, h, x, y, z, frame) => {
    const f = ext(arch(w + .2, h + .14), .05); K.worldUV(f, .3); K.put(p, f, frame || M.sand(), x, y - .08, z - .02, { cast: false });
    K.put(p, ext(arch(w, h), .06), M.window(), x, y, z - .01, { cast: false });
    K.box(p, w + .34, .08, .16, M.cap(), x, y - .16, z + .02, { cast: false });
  };
  // shingle UVs on a roof slab: rows run along the eave (z), v grows up-slope
  const roofUV = (geo, sgn, s = .35) => { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) * s, sgn * p.getX(i) * s); uv.needsUpdate = true; return geo; };
  // gable roof made of two thick slabs (the gable ends stay open for timber-framed triangles); ridge along z at y + h
  function gableRoof(p, len, span, h, m, y, o = {}) {
    const half = span / 2, a = Math.atan2(h, half), sl = Math.hypot(half, h), ov = o.over != null ? o.over : .35, th = o.th || .16, end = o.end != null ? o.end : .3, zc = o.z || 0;
    for (const s of [-1, 1]) {
      const geo = new T.BoxGeometry(sl + ov, th, len + 2 * end); roofUV(geo, -s);
      const cx = s * (half / 2 + Math.cos(a) * ov / 2 + Math.sin(a) * th / 2), cy = y + h / 2 - Math.sin(a) * ov / 2 + Math.cos(a) * th / 2;
      K.put(p, geo, m, cx, cy, zc, { rz: -s * a });
    }
    K.box(p, 2 * Math.sin(a) * th + .12, Math.cos(a) * th + .1, len + 2 * end + .04, o.ridge || m, 0, y + h - .04, zc);
  }
  // a mono-pitch roof slab from (x1,y1) (low) to (x2,y2) (high) in the x/y plane, length len along z
  function pentRoof(p, x1, y1, x2, y2, len, m, zc = 0, th = .1) {
    const l = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), geo = new T.BoxGeometry(l + .12, th, len); roofUV(geo, 1);
    return K.put(p, geo, m, (x1 + x2) / 2, (y1 + y2) / 2 + th / 2, zc, { rz: a });
  }
  // timber frame on a plastered storey: face group p, face plane at z, storey from y0 to y1, length L.
  // pattern per bay: w = window, a / b = diagonal brace, x = St Andrew's cross, r = mid rail
  function fachwerk(p, L, y0, y1, z, pat) {
    const dw = M.darkWood(), n = pat.length, bw = L / n, H = y1 - y0, zz = z + .03;
    for (let i = 0; i <= n; i++) K.box(p, .13, H, .1, dw, -L / 2 + i * bw, y0, zz);
    for (let i = 0; i < n; i++) { const x0 = -L / 2 + i * bw, x1 = x0 + bw, xc = (x0 + x1) / 2, c = pat[i];
      if (c === 'w') { K.box(p, bw, .1, .1, dw, xc, y0 + H * .28, zz); K.win(p, bw * .5, H * .44, xc, y0 + H * .28 + .14, z + .005); }
      if (c === 'a' || c === 'x') beam(p, x0 + .06, y0, x1 - .06, y1, zz, dw, .11, .1);
      if (c === 'b' || c === 'x') beam(p, x1 - .06, y0, x0 + .06, y1, zz, dw, .11, .1);
      if (c === 'r') K.box(p, bw, .1, .1, dw, xc, y0 + H * .5, zz);
    }
  }
  // timber in a plastered gable triangle (base W at y, height H)
  function gableTimber(p, W, H, y, z) {
    const dw = M.darkWood(), zz = z + .03, yc = y + H * .45, wc = W * .55 - .2;
    K.box(p, .13, H - .22, .1, dw, 0, y, zz); K.box(p, wc, .11, .1, dw, 0, yc, zz);
    for (const s of [-1, 1]) { beam(p, s * (wc / 2 - .1), yc + .05, s * .06, yc + H * .3, zz, dw, .1, .1); K.win(p, .28, .34, s * .45, y + .2, z + .005); }
  }
  // square pyramid with flat-shaded faces and clean world UVs (shingle rows stay horizontal on every face)
  const pyr = (p, w, d, h, m, x = 0, y = 0, z = 0) => { let geo = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1); geo.rotateY(PI / 4); geo.translate(0, .5, 0); geo.scale(w, h, d); geo = geo.toNonIndexed(); geo.computeVertexNormals(); K.worldUV(geo, .35); return K.put(p, geo, m, x, y, z); };

  // ---------- the keep: limestone shaft, bell-cast steep pyramid in the owner colour, dormers, bronze finial ----------
  const KW = 3.9, KH = 7.9, HW = KW / 2, RP = HW + .35, RH = 5.2, RY = KH + .44;   // roof: base half-width, height, base y
  function keep(b, ctx, st, x, z) {
    const k = new T.Group(); k.position.set(x, 0, z); b.add(k);
    frustum(k, HW + .32, HW + .02, .95, M.sand());                                  // battered sandstone plinth
    K.box(k, KW, KH, KW, M.cap());
    K.box(k, KW + .12, .16, KW + .12, M.cap(), 0, 5.55, 0);                         // string course
    // corbel table and cornice under the eaves
    for (let i = 0; i < 6; i++) { const t = -HW + .35 + i * (KW - .7) / 5;
      for (const [cx, cz, ry] of [[t, HW + .1, 0], [t, -HW - .1, 0], [HW + .1, t, PI / 2], [-HW - .1, t, PI / 2]]) K.box(k, .24, .4, .26, M.cap(), cx, KH - .4, cz, { ry }); }
    K.box(k, KW + .46, .24, KW + .46, M.cap(), 0, KH, 0);
    // bell-cast skirt + the steep pyramid
    const ys = KH + .24, yTop = ys + .5, hTop = RP * (1 - (yTop - RY) / RH) - .01;
    frustum(k, HW + .7, hTop, yTop - ys, ctx.roof, 0, ys, 0);
    pyr(k, RP * 2, RP * 2, RH, ctx.roof, 0, RY, 0);
    // dormers on all four roof faces
    for (const i of [0, 1, 2, 3, 4, 6]) { const f = face(k, i * PI / 2), up = i >= 4, t0 = up ? 2.75 : 1.05, zf = RP * (1 - t0 / RH) + .06, dw = up ? .5 : .78, dh = up ? .4 : .6, dg = up ? .3 : .42, dd = up ? .95 : 1.3;
      const dm = new T.Group(); dm.position.y = RY + t0; f.add(dm);
      const s = new T.Shape(); s.moveTo(-dw / 2, 0); s.lineTo(dw / 2, 0); s.lineTo(dw / 2, dh); s.lineTo(0, dh + dg); s.lineTo(-dw / 2, dh); s.closePath();
      const geo = ext(s, dd); geo.translate(0, 0, -dd); K.worldUV(geo, .3); K.put(dm, geo, M.cap(), 0, 0, zf);
      gableRoof(dm, dd, dw, dg, ctx.roof, dh, { over: .1, th: .08, end: .06, z: zf - dd / 2 + .06 });
      K.win(dm, dw * .41, dh * .57, 0, dh * .2, zf); }
    // bronze finial
    const tip = RY + RH;
    K.cyl(k, .1, .2, .3, M.bronze(), 0, tip - .42, 0, { seg: 8 }); K.sphere(k, .17, M.bronze(), 0, tip - .02, 0, { seg: 10, seg2: 8 }); K.cone(k, .05, .62, M.bronze(), 0, tip + .1, 0, { seg: 6 });
    // faces: door with outside stair, arched windows, an oriel on the side
    const fr = face(k, 0), rt = face(k, PI / 2), lf = face(k, -PI / 2), bk = face(k, PI);
    K.door(fr, 1.14, 1.72, -.62, 2.2, HW - .04, { mat: M.sand() }); K.door(fr, .9, 1.52, -.62, 2.24, HW - .01, { mat: M.darkWood() });
    K.box(fr, .08, 1.0, .06, M.iron(), -.62, 2.5, HW + .07);
    archWin(fr, .42, 1.0, -.62, 4.3, HW); archWin(fr, .26, .8, -.95, 6.35, HW); archWin(fr, .26, .8, -.33, 6.35, HW); archWin(fr, .26, .7, .85, 5.9, HW);
    K.stairs(fr, .95, 7, .32, .3, M.sand(), 2.05, 0, HW + .5, { ry: PI / 2 });
    K.box(fr, 1.15, 2.24, .95, M.sand(), -.62, 0, HW + .5); K.box(fr, 1.2, .08, 1.0, M.cap(), -.62, 2.24, HW + .5);
    for (const [px, py] of [[1.9, .32], [.9, 1.28], [-.05, 2.24]]) K.cyl(fr, .04, .04, .85, M.darkWood(), px, py, HW + .92, { seg: 5 });
    beam(fr, 1.95, 1.1, -.1, 3.04, HW + .92, M.darkWood(), .07, .07);
    archWin(rt, .4, .9, .75, 2.9, HW); archWin(rt, .3, .8, .8, 6.5, HW);
    archWin(lf, .4, .9, 0, 4.0, HW); archWin(lf, .3, .8, 0, 6.3, HW); archWin(bk, .36, .85, 0, 6.2, HW); K.win(bk, .18, .6, .6, 2.6, HW);
    // oriel (timber-framed bay window on stone corbels)
    const ox = -.4, oy = 4.8;
    K.box(rt, 1.3, .18, .34, M.cap(), ox, oy - .36, HW + .17); K.box(rt, 1.1, .18, .2, M.cap(), ox, oy - .54, HW + .1); K.box(rt, 1.46, .18, .7, M.cap(), ox, oy - .18, HW + .35);
    K.box(rt, 1.3, 1.25, .6, plaster(), ox, oy, HW + .3);
    { const of = new T.Group(); of.position.set(ox, 0, 0); rt.add(of); fachwerk(of, 1.3, oy, oy + 1.25, HW + .6, 'wbw'); }
    pyr(rt, 1.55, 1.0, .55, shingleDark(), ox, oy + 1.25, HW + .22);
    // long owner banner (lv 35+)
    if (st >= 1 && ctx.owned) K.banner(fr, { x: .85, y: KH - .75, z: HW + .02, w: .95, h: 3.4, mat: ctx.cloth, rod: M.bronze() });
    return k;
  }

  // ---------- the timber-framed hall: stone ground floor, jettied Fachwerk upper floor, owner gable roof ----------
  function hall(b, ctx, st, x, z, w, len) {
    const h = new T.Group(); h.position.set(x, 0, z); b.add(h);
    const dw = M.darkWood(), g1 = 1.75, up = 1.55, W = w + .3, L = len + .3, y0 = g1 + .12, y1 = g1 + up - .02;
    K.box(h, w, g1, len, M.sand());
    K.box(h, W, up, L, plaster(), 0, g1, 0);
    K.box(h, W + .08, .14, L + .08, dw, 0, g1 - .02, 0); K.box(h, W + .06, .14, L + .06, dw, 0, g1 + up - .14, 0);
    const yr = g1 + up;                                                              // roof foot
    K.gable(h, L - .02, W - .04, 1.9, plaster(), 0, yr, 0, { ry: PI / 2 });
    gableRoof(h, L, W, 1.9, ctx.roof, yr, { over: .4, end: .3, th: .16 });
    // timber frames on all four faces and in both gables
    const fx = face(h, PI / 2), bx = face(h, -PI / 2), fz = face(h, 0), bz = face(h, PI);
    fachwerk(fx, L, y0, y1, W / 2, 'awwxwwb'); fachwerk(bx, L, y0, y1, W / 2, 'awrxrwb');
    fachwerk(fz, W, y0, y1, L / 2, 'awb'); fachwerk(bz, W, y0, y1, L / 2, 'axb');
    gableTimber(fz, W, 1.9, yr, L / 2 - .01); gableTimber(bz, W, 1.9, yr, L / 2 - .01);
    // jetty brackets, door, ground-floor windows on the yard side
    for (let i = 0; i <= 7; i++) K.box(fx, .12, .36, .2, dw, -L / 2 + .1 + i * (L - .2) / 7, g1 - .38, w / 2 + .08);
    K.door(fx, 1.06, 1.5, -1.25, 0, w / 2 - .04, { mat: M.cap() }); K.door(fx, .84, 1.38, -1.25, 0, w / 2 - .01, { mat: dw });
    K.box(fx, 1.3, .1, .45, M.cap(), -1.25, 0, w / 2 + .2);
    for (const px of [.6, 1.9, -2.5]) K.win(fx, .42, .5, px, .7, w / 2);
    K.win(bx, .2, .5, 1.2, .8, w / 2); K.win(bx, .2, .5, -1.2, .8, w / 2);
    // chimney through the outer slope
    K.box(h, .6, 3.3, .6, M.sand(), -.75, yr - .5, -1.5); K.box(h, .76, .14, .76, M.cap(), -.75, yr + 2.8, -1.5);
    return h;
  }

  function build(ctx) {
    const g = new T.Group(), st = OW.stepOf(ctx.level), Y0 = .22;
    // ground: chamfered limestone kerb with a cobbled top
    slab(g, K.chamfer(12.2, .17), .16, M.cap(), 0);
    slab(g, K.chamfer(11.7, .17), .06, M.cobble(), .16);
    const b = new T.Group(); b.position.y = Y0; g.add(b);
    const X = 4.5, ZF = 4.1, ZB = -4.3, WH = 2.9, WT = .7, KX = .55, KZ = -3.2, HX = -3.425, HZ = -1.725, HWd = 2.85, HL = 5.85;
    // curtain walls (sandstone, limestone coping; merlons from lv 35)
    const wl = (x1, z1, x2, z2, mer = true) => K.wall(b, x1, z1, x2, z2, WH, WT, M.sand(), { cap: M.cap(), merlons: st >= 1 && mer, size: .42, mh: .5 });
    wl(-X, ZF, -1.45, ZF); wl(1.45, ZF, X, ZF); wl(-X, 1.2, -X, ZF); wl(X, ZB, X, ZF); wl(2.35, ZB, X, ZB); wl(-2.0, ZB, -1.4, ZB, false);
    // buttresses on the long outer side wall
    for (const bz of [-1.7, 1.2]) { K.box(b, .5, 2.2, .62, M.sand(), X + .58, 0, bz); K.box(b, .58, .12, .7, M.cap(), X + .6, 2.2, bz); }
    // back corner pier
    K.box(b, 1.15, WH + .45, 1.15, M.sand(), X, 0, ZB); K.box(b, 1.3, .18, 1.3, M.cap(), X, WH + .45, ZB);
    if (st >= 1) K.merlons(b, { w: 1.1, d: 1.1, x: X, z: ZB }, WH + .63, M.cap(), { size: .34, h: .42 });
    // gatehouse with an arched gate and the owner's shield
    K.box(b, 2.9, 3.7, 1.3, M.sand(), 0, 0, ZF); K.box(b, 3.06, .18, 1.46, M.cap(), 0, 3.7, ZF);
    if (st >= 1) K.merlons(b, { w: 2.8, d: 1.2, z: ZF }, 3.88, M.cap(), { size: .4, h: .45 });
    K.door(b, 2.0, 2.75, 0, 0, ZF + .6, { mat: M.cap() }); K.door(b, 1.6, 2.5, 0, 0, ZF + .63);
    K.door(b, 1.6, 2.5, 0, 0, ZF - .63, { ry: PI });
    // half-raised portcullis in the arch
    for (let i = 0; i < 5; i++) { const bx = -.6 + i * .3, top = 1.7 + Math.sqrt(.64 - bx * bx) - .04; K.box(b, .05, top - 1.78, .05, M.iron(), bx, 1.78, ZF + .74, { cast: false }); K.cone(b, .04, .12, M.iron(), bx, 1.79, ZF + .74, { rx: PI, seg: 4 }); }
    for (const by of [1.86, 2.16]) K.box(b, 1.36, .05, .05, M.iron(), 0, by, ZF + .75, { cast: false });
    { const s = new T.Shape(); s.moveTo(-.3, .34); s.lineTo(.3, .34); s.lineTo(.3, 0); s.quadraticCurveTo(.3, -.3, 0, -.44); s.quadraticCurveTo(-.3, -.3, -.3, 0); s.closePath();
      const rim = ext(s, .05); rim.scale(1.2, 1.18, 1); K.put(b, rim, M.bronze(), 0, 3.2, ZF + .63, { cast: false });
      K.put(b, ext(s, .07), ctx.owned ? ctx.cloth : M.cap(), 0, 3.2, ZF + .64, { cast: false }); }
    // two small round towers with owner cones at the front corners
    for (const s of [-1, 1]) {
      const tw = K.roundTower(b, { x: s * X, z: ZF, r: 1.05, h: 4.9, mat: M.sand(), roof: ctx.roof, roofH: 2.6, overhang: 1.24, seg: 16 });
      K.cyl(tw, 1.13, 1.17, .34, M.cap(), 0, 0, 0, { seg: 16 }); K.cyl(tw, 1.1, 1.1, .2, M.cap(), 0, 4.45, 0, { seg: 16 });
      K.win(tw, .16, .6, 0, 2.3, 1.03); K.win(tw, .16, .6, s * 1.02, 3.3, 0, { ry: s * PI / 2 }); K.win(tw, .16, .5, s * .73, 3.6, .73, { ry: s * PI / 4 });
      if (ctx.owned) K.flag(tw, { x: 0, y: 4.9 + 2.5, z: 0, poleH: .95, w: .95, h: .32, mat: ctx.cloth, pennant: true, dir: .35, knob: M.bronze() });
      else K.sphere(tw, .12, M.bronze(), 0, 4.9 + 2.62, 0, { seg: 8 });
    }
    keep(b, ctx, st, KX, KZ);
    hall(b, ctx, st, HX, HZ, HWd, HL);
    // yard life: hay cart, barrels, crates, woodpile, a linden tree
    { const c = new T.Group(); c.position.set(-2.75, 0, 2.55); c.rotation.y = .5; b.add(c);
      K.box(c, 1.7, .12, 1.0, M.wood(), 0, .42, 0); for (const s of [-1, 1]) K.box(c, 1.7, .24, .06, M.wood(), 0, .54, s * .5);
      for (const s of [-1, 1]) { const wg = new T.CylinderGeometry(.4, .4, .08, 12); const wm = new T.Mesh(wg, M.darkWood()); wm.rotation.x = PI / 2; wm.position.set(.1, .4, s * .56); wm.castShadow = true; c.add(wm); }
      for (const s of [-1, 1]) beam(c, .8, .5, 1.75, .12, s * .32, M.wood(), .07, .07);
      K.box(c, 1.5, .38, .88, M.thatch(), -.05, .54, 0); K.gable(c, 1.4, .86, .3, M.thatch(), -.05, .92, 0); }
    K.barrel(b, -1.6, 0, .72); K.barrel(b, -1.62, 0, 1.32); K.barrel(b, -1.6, .7, 1.02);
    K.crate(b, 3.5, 0, -.2, .6, .3); K.crate(b, 3.55, .6, -.2, .42, .8);
    { const wp = new T.Group(); wp.position.set(3.25, 0, -3.62); b.add(wp);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) K.cyl(wp, .14, .14, 1.3, M.wood(), .65, .14 + r * .25, (i - (3 - r) / 2) * .29, { rz: PI / 2, seg: 7 }); }
    { const cb = new T.Group(); cb.position.set(3.3, 0, -2.35); b.add(cb); K.cyl(cb, .28, .3, .5, M.wood(), 0, 0, 0, { seg: 9 });
      K.box(cb, .05, .5, .05, M.darkWood(), .05, .5, 0, { rz: -.45 }); K.box(cb, .22, .14, .04, M.iron(), .2, .82, 0, { rz: -.45 });
      for (let i = 0; i < 3; i++) K.cyl(cb, .1, .1, .45, M.wood(), -.5 + i * .05, .1, .45 + i * .22, { rz: PI / 2 - .2 + i * .3, seg: 6 }); }
    // ---- lv 35+: smithy with smoke, stone trough, well, torches at the gate ----
    if (st >= 1) {
      const sm = new T.Group(); sm.position.set(3.35, 0, 1.3); b.add(sm);
      for (const s of [-1, 1]) K.cyl(sm, .08, .09, 2.2, M.darkWood(), -.75, 0, s * 1.2, { seg: 6 });
      K.box(sm, .12, .14, 2.6, M.darkWood(), -.75, 2.08, 0);
      pentRoof(sm, -1.0, 2.14, .8, 2.7, 2.9, shingleDark());
      K.box(sm, 1.0, .8, 1.2, M.sand(), .25, 0, -.4); K.box(sm, .6, .05, .7, M.ember(), .15, .8, -.4);
      K.box(sm, .55, 4.1, .55, M.sand(), .5, 0, -.4); K.box(sm, .72, .12, .72, M.cap(), .5, 4.1, -.4);
      pyr(sm, .9, 1.0, .55, M.sand(), .3, 1.55, -.4); K.flameAt(sm, .12, .84, -.4, { size: .11, power: 9, range: 8 });
      K.smoke(sm, .5, 4.3, -.4, { n: 12, size: .5, rise: 3.8, life: 4.2, alpha: .5, spread: .5, drift: .9, color: 0xcfcac2 });
      K.cyl(sm, .2, .23, .45, M.darkWood(), -.3, 0, .55, { seg: 8 }); K.box(sm, .48, .16, .2, M.iron(), -.3, .45, .55); K.cone(sm, .08, .22, M.iron(), -.54, .53, .55, { rz: PI / 2, seg: 6 });
      K.barrel(sm, .35, 0, .75);
      // stone trough by the front wall
      const tr = new T.Group(); tr.position.set(2.85, 0, 3.1); b.add(tr);
      for (const s of [-1, 1]) { K.box(tr, 1.3, .5, .1, M.cap(), 0, 0, s * .25); K.box(tr, .1, .5, .42, M.cap(), s * .6, 0, 0); }
      K.water(tr, { rect: [1.12, .42], y: .41 });
      // well with a small shingle roof
      const w = new T.Group(); w.position.set(-.7, 0, 1.85); b.add(w);
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; K.box(w, .4, .66, .2, M.field(), Math.cos(a) * .58, 0, Math.sin(a) * .58, { ry: PI / 2 - a }); }
      K.water(w, { r: .52, y: .56 });
      for (const s of [-1, 1]) K.cyl(w, .05, .06, 1.7, M.darkWood(), s * .66, 0, 0, { seg: 6 });
      K.cyl(w, .07, .07, 1.3, M.wood(), .65, 1.25, 0, { rz: PI / 2, seg: 6 });
      K.gable(w, 1.7, 1.2, .5, shingleDark(), 0, 1.68, 0);
      // torches beside the gate (only one casts real light)
      for (const s of [-1, 1]) { const tx = s * 1.2, tz = ZF + .65;
        K.box(b, .08, .34, .22, M.iron(), tx, 1.7, tz + .08); K.cyl(b, .12, .06, .16, M.iron(), tx, 2.02, tz + .2, { seg: 8 });
        K.flameAt(b, tx, 2.14, tz + .2, { size: .13, power: 12, range: 10, light: s > 0 }); }
    }
    g.userData = { top: Y0 + RY + RH + .72, radius: 6.5, smoke: [[KX, Y0 + 12.5, KZ + 1.4], [HX + 1, Y0 + 4.2, HZ], [X, Y0 + 3.4, 0]] };
    return g;
  }
  OW.addTier(3, { build, plotR: 6.6, islandR: 12.1 });
})();


// ===== Open Water Baukunst · Tier 5 · Festung (lv 50-59) =====
// Dark granite + bronze. Silhouette: an octagonal ring of massive round towers with FLAT crenellated tops,
// a twin-tower gatehouse at the front, and in the middle a big square keep under a large owner-coloured HIPPED roof
// with four corbelled bartizans (tiny cones). Ground: a stone scarp, a moat and an earth glacis ring.
// Step 1 (55-59): a low concentric outer wall with turrets on the glacis crest, braziers at its gate, banners on the gatehouse, a bell tower.
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const mats = {};
  const mat = (k, o) => { if (mats[k]) return mats[k]; const m = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)); if (o.map) { m.bumpMap = o.map; if (o.bumpScale == null) m.bumpScale = 1.2; } return mats[k] = m; };
  const GR = () => mat('granite', { color: 0x676e77, map: OW.TEX.ashlar(), bumpScale: 1.0 });                 // the tier stone
  const GD = () => mat('graniteDk', { color: 0x565c63, map: OW.TEX.ashlar(), bumpScale: 1.2 });
  const GK = () => mat('graniteKeep', { color: 0x70777f, map: OW.TEX.ashlar(), bumpScale: 1.0 });   // the keep, a shade lighter // footings, scarp
  const GLA = () => mat('glacis', { color: 0x8d7453, map: OW.TEX.dirt(), bumpScale: .6 });       // earth glacis
  const BELL = () => mat('bell', { color: 0xb57b3c, metalness: .75, roughness: .4, side: T.DoubleSide, flatShading: false });

  // ---- batching: many small repeated parts (merlons, corbels, quoins) become one mesh per material ----
  function Batch(root) { this.root = root; this.m = new Map(); }
  Batch.prototype.add = function (mat, geo, x, y, z, ry = 0, par = null) {
    const gg = geo.index ? geo.toNonIndexed() : geo; if (gg !== geo) geo.dispose();
    const mt = new T.Matrix4().makeRotationY(ry); mt.setPosition(x, y, z);
    if (par && par !== this.root) { par.updateMatrixWorld(true); mt.premultiply(par.matrixWorld); }
    gg.applyMatrix4(mt); let l = this.m.get(mat); if (!l) this.m.set(mat, l = []); l.push(gg);
  };
  Batch.prototype.box = function (mat, w, h, d, x, y, z, ry = 0, par = null) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); K.worldUV(g, .25); this.add(mat, g, x, y, z, ry, par); };
  Batch.prototype.cyl = function (mat, rt, rb, h, x, y, z, seg = 8, par = null) { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); K.worldUV(g, .25, true); this.add(mat, g, x, y, z, 0, par); };
  Batch.prototype.flush = function () {
    for (const [mat, list] of this.m) { let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
      const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
      const mesh = new T.Mesh(bg, mat); mesh.castShadow = mesh.receiveShadow = true; this.root.add(mesh); }
    this.m.clear();
  };

  // ---- small geometry helpers ----
  const UP = new T.Vector3(0, 1, 0);
  function rod(p, a, b, r, m, seg = 5) { const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); const geo = new T.CylinderGeometry(r, r, len, seg); geo.translate(0, len / 2, 0);
    const mesh = K.put(p, geo, m, a[0], a[1], a[2]); mesh.quaternion.setFromUnitVectors(UP, d.normalize()); return mesh; }
  // solid of revolution from a profile [[r, y], ...] (counter-clockwise = outside faces visible)
  function lathe(p, pts, m, seg = 56, y = 0) { const g = new T.LatheGeometry(pts.map(([r, h]) => new T.Vector2(r, h)), seg); K.worldUV(g, .25, true); return K.put(p, g, m, 0, y, 0, { cast: false }); }
  // hipped roof: w (x) × d (z) eaves, ridge of length `ridge` along x at height h
  function hipRoof(p, w, d, h, ridge, m, x, y, z) {
    const a = w / 2, b = d / 2, r = ridge / 2;
    const A = [-a, 0, -b], B = [a, 0, -b], C = [a, 0, b], D = [-a, 0, b], E = [-r, h, 0], F = [r, h, 0];
    const tris = [D, C, F, D, F, E, B, A, E, B, E, F, C, B, F, A, D, E, A, B, C, A, C, D];
    const pos = new Float32Array(tris.length * 3); tris.forEach((v, i) => pos.set(v, i * 3));
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(tris.length * 2), 2)); g.computeVertexNormals();
    K.worldUV(g, .35); return K.put(p, g, m, x, y, z);
  }

  // a hanging banner (like K.banner, but with the rod centred over the cloth)
  function banner(p, o) {
    const g = new T.Group(); g.position.set(o.x, o.y, o.z); g.rotation.y = o.ry || 0; p.add(g);
    const w = o.w, h = o.h; K.cyl(g, .04, .04, w + .3, o.rod, (w + .3) / 2, 0, .06, { rz: Math.PI / 2, seg: 6 });
    for (const s of [-1, 1]) K.sphere(g, .07, o.rod, s * (w + .3) / 2, -.07, .06, { seg: 6, seg2: 4 });
    const geo = new T.PlaneGeometry(w, h, 3, 8); geo.translate(0, -h / 2, .1);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < -h + .01 && Math.abs(x) < .01) pos.setY(i, y - w * .35); }
    const m = new T.Mesh(geo, o.mat); m.castShadow = true; g.add(m);
    if (o.emblem) { const e = new T.Mesh(new T.CircleGeometry(w * .26, 16), o.emblem); e.position.set(0, -h * .38, .12); g.add(e); }
    const base = pos.array.slice(), ph0 = o.x * 1.7;
    K.tick((t) => { for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1], k = -y / h; pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 1.6 + ph0 + y * 1.5) * .07 * k); } pos.needsUpdate = true; });
    return g;
  }

  const Y0 = .48, SEG = 18;                                  // courtyard level; tower smoothness
  const R = 5.6, TR = 1.35, TH = 4.5, GH = 6.1, WH = 3.5, WT = 1.0, GBH = 4.9;
  const TRG = 1.45, GTX = 2.107, GTZ = 5.35;                  // gate towers: bigger, pushed forward
  const ANG = [0, 1, 2, 3, 4, 5, 6, 7].map(k => Math.PI / 8 + k * Math.PI / 4);   // tower angles; 1 and 2 = the gate pair
  const KZ = -.5, KW = 5.4, KH = 8.6;                         // keep centre z, width, wall height

  // a massive round tower with a battered foot, corbelled parapet and a flat crenellated top
  function tower(g, B, x, z, r, h, face, foot) {
    const t = new T.Group(); t.position.set(x, Y0, z); g.add(t);
    if (foot) K.cyl(t, r * 1.2, r * 1.25, Y0 + .02, GD(), 0, -Y0 - .02, 0, { seg: SEG });   // gate towers stand out into the moat
    K.cyl(t, r, r * 1.2, 1.3, GD(), 0, 0, 0, { seg: SEG });
    K.cyl(t, r * 1.035, r * 1.035, .14, M.cap(), 0, 1.3, 0, { seg: SEG });
    K.cyl(t, r * .97, r, h - 1.44, GR(), 0, 1.44, 0, { seg: SEG });
    const n = Math.round(r * 9.5);
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2; B.box(M.cap(), .34, .42, .2, x + Math.cos(a) * r * 1.02, Y0 + h - .42, z + Math.sin(a) * r * 1.02, -a); }
    K.cyl(t, r * 1.135, r * 1.135, .1, M.bronze(), 0, h, 0, { seg: SEG });
    K.cyl(t, r * 1.12, r * 1.1, .72, GR(), 0, h + .1, 0, { seg: SEG });
    K.cyl(t, r * 1.16, r * 1.16, .14, M.cap(), 0, h + .82, 0, { seg: SEG });
    K.cyl(t, r * .98, r * .98, .02, GD(), 0, h + .96, 0, { seg: SEG });
    const mr = r * 1.16 - .17, mn = Math.round(mr * Math.PI * 2 / .8);
    for (let i = 0; i < mn; i++) { const a = i / mn * Math.PI * 2; B.box(M.cap(), .3, .5, .42, x + Math.cos(a) * mr, Y0 + h + .96, z + Math.sin(a) * mr, -a); }
    B.box(M.darkWood(), .5, .06, .5, x - Math.cos(face) * r * .45, Y0 + h + .97, z - Math.sin(face) * r * .45, -face);
    for (const [da, y] of [[-.38, 2.0], [.42, 3.2]]) { const a = face + da; K.win(t, .16, .55, Math.cos(a) * r * .99, y, Math.sin(a) * r * .99, { ry: Math.PI / 2 - a }); }
    return t;
  }

  function build(ctx) {
    const g = new T.Group(), st = OW.stepOf(ctx.level), B = new Batch(g);

    // ---------------- ground: fortress platform with a stone scarp, moat, counterscarp and earth glacis ----------------
    K.cyl(g, 7.25, 7.45, .45, GD(), 0, 0, 0, { seg: 56, uv: .25, cast: false });
    K.cyl(g, 7.1, 7.1, .03, M.cobble(), 0, .45, 0, { seg: 56, uv: .3, cast: false });
    K.water(g, { ring: [7.3, 8.25], y: .16 });
    lathe(g, [[8.2, 0], [8.52, 0], [8.52, 0], [8.52, .6], [8.52, .6], [8.2, .6], [8.2, .6], [8.2, 0]], GD());
    lathe(g, [[8.14, .6], [8.58, .6], [8.58, .6], [8.58, .7], [8.58, .7], [8.14, .7], [8.14, .7], [8.14, .6]], M.cap());
    for (const [a, rr, s] of [[.3, 8.95, .28], [1.0, 9.1, .22], [2.3, 8.9, .3], [2.9, 9.05, .24], [3.7, 8.95, .26], [4.6, 9.1, .22], [5.5, 8.9, .3]]) K.rock(g, Math.cos(a) * rr, .62 * (9.3 - rr) / .74 - .1, Math.sin(a) * rr, s, M.darkStone());
    lathe(g, [[8.5, 0], [9.3, 0], [9.3, 0], [8.56, .62], [8.56, .62], [8.5, .62], [8.5, .62], [8.5, 0]], GLA());

    // ---------------- the octagonal ring: 6 ring towers + 2 taller gate towers, short thick curtains ----------------
    ANG.forEach((a, k) => { if (k === 1 || k === 2) { const x = k === 1 ? GTX : -GTX; tower(g, B, x, GTZ, TRG, GH, Math.atan2(GTZ, x), true); } else tower(g, B, Math.cos(a) * R, Math.sin(a) * R, TR, TH, a); });
    const A = R * Math.cos(Math.PI / 8), L = 2 * R * Math.sin(Math.PI / 8);
    for (let k = 0; k < 8; k++) { if (k === 1) continue;                     // between towers 1 and 2 sits the gate block
      const th = ANG[k] + Math.PI / 8, w = new T.Group(); w.position.set(Math.cos(th) * A, Y0, Math.sin(th) * A); w.rotation.y = -th - Math.PI / 2; g.add(w);
      K.box(w, L, WH, WT, GR()); K.box(w, L, .16, WT + .16, M.cap(), 0, WH, 0);
      for (const x of [-.56, 0, .56]) B.box(M.cap(), .34, .5, .3, x, WH + .16, -WT / 2 + .15, 0, w);
      K.win(w, .14, .5, 0, 1.9, -WT / 2 - .01);
    }

    // ---------------- gatehouse: block between the gate towers, arch with portcullis, brattice, bronze boss ----------------
    const gf = 6.2, gz = (4.6 + gf) / 2;
    K.box(g, 3.0, GBH, gf - 4.6, GR(), 0, Y0, gz);
    K.box(g, 3.1, .16, gf - 4.45, M.cap(), 0, Y0 + GBH, gz);
    for (const x of [-.6, 0, .6]) B.box(M.cap(), .34, .5, .28, x, Y0 + GBH + .16, gf - .1);
    K.door(g, 1.5, 2.62, 0, Y0, gf - .02, { mat: M.cap() });
    K.door(g, 1.2, 2.36, 0, Y0, gf + .01, { mat: M.dark() });
    for (const x of [-.4, -.2, 0, .2, .4]) B.box(M.iron(), .06, 1.3, .06, x, Y0 + .75, gf + .12);
    for (const y of [1.2, 1.7]) B.box(M.iron(), 1.0, .06, .06, 0, Y0 + y, gf + .12);
    // brattice (box machicolation) over the arch
    K.box(g, 1.6, .8, .5, GR(), 0, Y0 + 3.7, gf + .22); K.box(g, 1.7, .1, .6, M.cap(), 0, Y0 + 4.5, gf + .22);
    for (const x of [-.6, 0, .6]) B.box(M.cap(), .2, .38, .5, x, Y0 + 3.32, gf + .22);
    K.box(g, 1.62, .1, .52, M.bronze(), 0, Y0 + 3.65, gf + .22);
    const boss = new T.Mesh(new T.CylinderGeometry(.2, .2, .08, 8), M.bronze()); boss.rotation.x = Math.PI / 2; boss.position.set(0, Y0 + 2.98, gf + .04); boss.castShadow = true; g.add(boss);
    // gate torches (the braziers of lv 55+ carry the real lights)
    for (const s of [-1, 1]) { B.box(M.iron(), .1, .35, .22, s * .84, Y0 + 1.9, gf + .1); K.flameAt(g, s * .84, Y0 + 2.28, gf + .18, { size: .12, power: 10, light: st === 0 && s < 0 }); }

    // ---------------- bridge: drawbridge over the moat, ramp down the glacis ----------------
    K.box(g, 1.4, .14, 7.3 - gf, M.cobble(), 0, Y0 - .12, (7.3 + gf) / 2);                           // threshold on the platform
    K.box(g, 1.5, .14, 1.0, M.darkWood(), 0, .46, 7.8);                                     // drawbridge deck
    for (const x of [-.72, .72]) B.box(M.iron(), .06, .06, 1.0, x, .6, 7.8);
    for (const s of [-1, 1]) rod(g, [s * .66, .6, 8.25], [s * .66, Y0 + 3.4, gf + .02], .025, M.iron(), 4);
    const rs = new T.Shape(); rs.moveTo(8.28, 0); rs.lineTo(9.8, 0); rs.lineTo(8.75, .74); rs.lineTo(8.28, .74); rs.closePath();
    const rg = new T.ExtrudeGeometry(rs, { depth: 1.5, bevelEnabled: false }); rg.rotateY(-Math.PI / 2); rg.translate(.75, 0, 0); K.worldUV(rg, .3); K.put(g, rg, M.cobble(), 0, 0, 0);
    if (st === 0) for (const s of [-1, 1]) { K.box(g, .3, .55, .3, M.cap(), s * 1.0, .7, 8.4); }

    // ---------------- keep: battered plinth, quoins, corbel table, big hipped owner roof, four bartizans ----------------
    const keep = new T.Group(); keep.position.set(0, Y0, KZ); g.add(keep);
    K.cyl(keep, (KW + .2) / Math.SQRT2, (KW + .7) / Math.SQRT2, 1.3, GD(), 0, 0, 0, { seg: 4, ry: Math.PI / 4 });
    K.box(keep, KW + .3, .14, KW + .3, M.cap(), 0, 1.3, 0);
    K.box(keep, KW, KH, KW, GK());
    K.box(keep, KW + .16, .16, KW + .16, M.cap(), 0, 4.7, 0);
    K.box(keep, KW + .1, .12, KW + .1, M.bronze(), 0, KH - .95, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0, y = 1.44; y < KH - 1.6; i++, y += .66) {
      const lx = i % 2 ? .62 : .42, lz = i % 2 ? .42 : .62; B.box(M.cap(), lx, .34, lz, sx * (KW / 2 - lx / 2 + .05), y, sz * (KW / 2 - lz / 2 + .05), 0, keep); }
    for (let i = 0; i < 6; i++) { const t = -1.55 + i * .62; for (const [x, z, ry] of [[t, KW / 2 + .1, 0], [t, -KW / 2 - .1, 0], [KW / 2 + .1, t, Math.PI / 2], [-KW / 2 - .1, t, Math.PI / 2]]) B.box(M.cap(), .2, .42, .26, x, KH - .42, z, ry, keep); }
    K.box(keep, KW + .5, .22, KW + .5, M.cap(), 0, KH, 0);
    const RW = 6.4, RH = 5.0, RR = 1.4, ry0 = KH + .22;
    hipRoof(keep, RW, RW, RH, RR, ctx.roof, 0, ry0, 0);
    K.box(keep, RW + .06, .1, RW + .06, M.bronze(), 0, ry0 - .06, 0);                     // bronze eave trim
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(keep, [sx * RW / 2, ry0, sz * RW / 2], [sx * RR / 2, ry0 + RH, 0], .07, M.bronze());
    K.box(keep, RR + .1, .14, .16, M.bronze(), 0, ry0 + RH - .06, 0);
    for (const s of [-1, 1]) { K.sphere(keep, .13, M.bronze(), s * RR / 2, ry0 + RH + .02, 0, { seg: 8, seg2: 6 }); K.cone(keep, .06, .55, M.bronze(), s * RR / 2, ry0 + RH + .12, 0, { seg: 5 }); }
    // chimney on the back slope with a thin smoke thread
    K.box(keep, .55, 1.9, .55, GK(), -1.1, ry0 + 2.6, -1.2); K.box(keep, .7, .12, .7, M.cap(), -1.1, ry0 + 4.5, -1.2);
    K.smoke(keep, -1.1, ry0 + 4.7, -1.2, { n: 9, size: .45, rise: 3.2, life: 4, alpha: .38, drift: .8 });
    // dormers: front slope and right slope
    { const d = new T.Group(); d.position.set(0, ry0, 2.85); keep.add(d);
      K.box(d, 1.0, 1.0, 1.1, GK(), 0, .35, -.55); K.gable(d, 1.25, 1.2, .55, ctx.roof, 0, 1.35, -.5, { ry: Math.PI / 2 }); K.win(d, .38, .5, 0, .62, .01); }
    { const d = new T.Group(); d.position.set(2.9, ry0, 0); d.rotation.y = Math.PI / 2; keep.add(d);
      K.box(d, .9, .9, 1.0, GK(), 0, .4, -.5); K.gable(d, 1.1, 1.1, .5, ctx.roof, 0, 1.3, -.45, { ry: Math.PI / 2 }); K.win(d, .34, .46, 0, .68, .01); }
    // bartizans on the four corners: corbelled out, tiny owner cones
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const b = new T.Group(); b.position.set(sx * 2.75, 0, sz * 2.75); keep.add(b);
      K.cyl(b, .64, .12, 1.0, GK(), 0, KH - 1.3, 0, { seg: 10 });
      K.cyl(b, .64, .64, 2.2, GK(), 0, KH - .3, 0, { seg: 10 });
      K.cyl(b, .7, .7, .1, M.bronze(), 0, KH + 1.9, 0, { seg: 10 });
      K.cone(b, .8, 1.45, ctx.roof, 0, KH + 2.0, 0, { seg: 10 });
      K.sphere(b, .07, M.bronze(), 0, KH + 3.45, 0, { seg: 6, seg2: 4 });
      const a = Math.atan2(sz, sx); K.win(b, .13, .42, Math.cos(a) * .64, KH + .5, Math.sin(a) * .64, { ry: Math.PI / 2 - a });
    }
    // windows, door, stair, bronze plaque
    for (const [x, y, w, h] of [[-1.2, 2.2, .2, .7], [1.2, 2.2, .2, .7], [-1.0, 5.3, .42, .95], [1.0, 5.3, .42, .95], [0, 6.9, .34, .8]]) { K.win(keep, w, h, x, y, KW / 2 + .01); K.win(keep, w, h, -x, y + (y < 3 ? .6 : 0), -KW / 2 - .01); }
    for (const [z, y, w, h] of [[-1.0, 2.2, .2, .7], [-.9, 5.3, .42, .95], [.9, 5.3, .42, .95], [0, 6.9, .34, .8]]) { K.win(keep, w, h, KW / 2 + .01, y, z, { ry: Math.PI / 2 }); K.win(keep, w, h, -KW / 2 - .01, y, z, { ry: Math.PI / 2 }); }
    for (const x of [-1.0, 1.0]) B.box(M.cap(), .62, .08, .16, x, 5.22, KW / 2 + .06, 0, keep);
    K.door(keep, 1.36, 2.1, 0, 1.44, KW / 2 - .01, { mat: M.cap() });
    K.door(keep, 1.05, 1.86, 0, 1.44, KW / 2 + .01, { mat: M.dark() });
    K.stairs(keep, 1.2, 5, .288, .32, GD(), 0, 0, KW / 2 + .05 + 5 * .32);
    const pl = new T.Mesh(new T.CylinderGeometry(.36, .36, .08, 6), M.bronze()); pl.rotation.x = Math.PI / 2; pl.position.set(0, 4.05, KW / 2 + .05); pl.castShadow = true; keep.add(pl);
    // flag on the ridge (owned) or a bronze spike (neutral)
    const rt = ry0 + RH;
    if (ctx.owned) K.flag(keep, { x: 0, y: rt, z: 0, poleH: 1.7, w: 2.0, h: 1.05, mat: ctx.cloth, knob: M.bronze(), dir: .3 });
    else { K.cyl(keep, .04, .07, 1.3, M.bronze(), 0, rt, 0, { seg: 6 }); K.sphere(keep, .12, M.bronze(), 0, rt + 1.3, 0, { seg: 8, seg2: 6 }); }

    // ---------------- courtyard clutter ----------------
    K.barrel(g, -3.35, Y0, 3.0); K.barrel(g, -3.0, Y0, 3.5); K.crate(g, 3.2, Y0, 3.1, .55, .3); K.barrel(g, 0, Y0, -4.1); K.barrel(g, -.56, Y0, -4.05);

    // ---------------- step 1 (lv 55-59): outer wall ring, gate braziers, banners, bell tower ----------------
    if (st >= 1) {
      const RO = 8.36, NS = 28, da = Math.PI * 2 / NS;
      for (let i = 0; i < NS; i++) { const am = (i + .5) * da; if (Math.abs(am - Math.PI / 2) < .2) continue;
        const cx = Math.cos(am) * RO * Math.cos(da / 2), cz = Math.sin(am) * RO * Math.cos(da / 2), L2 = 2 * RO * Math.sin(da / 2) + .03, ry = -am - Math.PI / 2;
        B.box(GR(), L2, 1.0, .32, cx, .7, cz, ry); B.box(M.cap(), L2 + .02, .1, .42, cx, 1.7, cz, ry);
        for (const o of [-.25, .25]) { const b = am + o * da; B.box(M.cap(), .34, .32, .16, Math.cos(b) * (RO + .08), 1.8, Math.sin(b) * (RO + .08), -b - Math.PI / 2); } }
      for (let k = 0; k < 8; k++) { if (k === 2) continue; const a = k * Math.PI / 4, x = Math.cos(a) * RO, z = Math.sin(a) * RO;
        K.cyl(g, .5, .56, 2.1, GR(), x, 0, z, { seg: 12 }); K.cyl(g, .6, .6, .1, M.cap(), x, 2.1, z, { seg: 12 });
        for (let i = 0; i < 6; i++) { const b = i / 6 * Math.PI * 2; B.box(M.cap(), .16, .3, .24, x + Math.cos(b) * .5, 2.2, z + Math.sin(b) * .5, -b); }
        K.win(g, .12, .4, x + Math.cos(a) * .55, 1.0, z + Math.sin(a) * .55, { ry: Math.PI / 2 - a }); }
      // gate pillars with bronze braziers (the two real lights)
      const ga = [Math.PI / 2 - .2, Math.PI / 2 + .2];
      for (const a of ga) { const x = Math.cos(a) * RO, z = Math.sin(a) * RO;
        K.box(g, .62, 2.0, .62, GD(), x, 0, z); K.box(g, .74, .12, .74, M.cap(), x, 2.0, z);
        K.cyl(g, .12, .16, .22, M.bronze(), x, 2.12, z, { seg: 8 }); K.cyl(g, .36, .16, .26, M.bronze(), x, 2.3, z, { seg: 10 });
        K.cyl(g, .3, .3, .04, M.ember(), x, 2.565, z, { seg: 10 });
        K.flameAt(g, x, 2.565, z, { size: .22, power: 14, range: 11 }); }
      // banners on the gate towers
      if (ctx.owned) for (const k of [1, 2]) { const x0 = k === 1 ? GTX : -GTX, a = Math.atan2(GTZ, x0), rr = TRG + .13; banner(g, { x: x0 + Math.cos(a) * rr, y: Y0 + 5.45, z: GTZ + Math.sin(a) * rr, ry: Math.PI / 2 - a, w: .9, h: 3.0, mat: ctx.cloth, rod: M.bronze(), emblem: M.bronze() }); }
      // bell tower between keep and the right curtain
      const bt = new T.Group(); bt.position.set(3.5, Y0, KZ); g.add(bt);
      K.box(bt, .9, 5.0, .9, GR()); K.box(bt, .98, .1, .98, M.cap(), 0, 2.6, 0); K.box(bt, 1.04, .14, 1.04, M.cap(), 0, 5.0, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(bt, .18, 1.2, .18, M.cap(), sx * .38, 5.14, sz * .38);
      K.box(bt, 1.04, .16, 1.04, M.cap(), 0, 6.34, 0); K.pyramid(bt, 1.2, 1.2, .85, M.bronze(), 0, 6.5, 0); K.sphere(bt, .08, M.bronze(), 0, 7.37, 0, { seg: 8, seg2: 6 });
      K.box(bt, .84, .08, .08, M.darkWood(), 0, 6.14, 0);
      const piv = new T.Group(); piv.position.set(0, 6.14, 0); bt.add(piv);
      const bg = new T.LatheGeometry([[.31, 0], [.28, .07], [.21, .24], [.2, .42], [.15, .52], [.001, .55]].map(([r, y]) => new T.Vector2(r, y)), 14);
      const bell = new T.Mesh(bg, BELL()); bell.position.y = -.6; bell.castShadow = true; piv.add(bell);
      K.tick((t) => { piv.rotation.x = Math.sin(t * 1.7) * .12; });
      K.win(bt, .14, .5, 0, 3.2, .46); K.win(bt, .14, .5, .46, 1.6, 0, { ry: Math.PI / 2 });
    }

    B.flush();
    g.userData = { top: Y0 + KH + .22 + RH + 1.75, radius: 9.3, smoke: [[0, 11.5, KZ], [-3.96, 6.6, -3.96], [5.17, 6.2, 2.14]] };
    return g;
  }
  OW.addTier(5, { build, plotR: 9.6, islandR: 15 });
})();
