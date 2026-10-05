// Teil 05-umland.js: Umland: die Landschaft um eine Basis, für jeden Spieler anders


// ===== Open Water Baukunst · Umland: the countryside around a base, different for every player =====
// Tier and owner stay on the base itself; around it (outside the plot) every base gets its own seeded mix of
// fields, pastures, markets, quarries, gardens or a small outer village, low, muted and quiet, so the base stays the main shape.
// Plus exactly ONE tall landmark picked by the seed (windmill, chapel, watch tower, from tier 5 also the outer village with a
// tower house), set on the left or right edge of the map sprite with its ink outline, so neighbours of one level differ in outline.
// Items follow the base's culture (c.style): Fernost pagoda / bell pavilion / rice terraces, Morgenland palm grove / wind tower /
// domed bazaar, Nordisch stave church / longhouse / standing stones, Südlich campanile / white jib-sail mill / olive grove / vineyard.
// Called from OW.variety.after → OW.umland.build(g, c, { plotR, tier }) before the per-base rotation / mirror.
(function () {
  const T = THREE, K = OW.K, M = OW.M, TEX = OW.TEX, PI = Math.PI, NO = {};
  const FRAME = [7, 8.2, 9.4, 10.2, 11.2, 12, 12.8, 13.5, 13.5, 15];   // map-sprite half widths (mapscene.js draws them × 1.18)
  const STONE = ['field', 'field', 'sand', 'cap', 'slate', 'darkStone', 'slate', 'cap', 'marble', 'marble'];   // the tier's stone

  // ---------- materials: muted and cached (the base is the loud one) ----------
  const mats = {};
  function mat(k, color, o = NO) {
    if (mats[k]) return mats[k];
    const p = { color, roughness: .9, flatShading: !o.smooth };
    if (o.map) { p.map = o.map; p.bumpMap = o.map; p.bumpScale = o.bump != null ? o.bump : .5; }
    if (o.side) p.side = o.side;
    const m = new T.MeshStandardMaterial(p); m.userData.key = 'umland.' + k; return mats[k] = m;
  }
  const MT = {
    soil: () => mat('soil', 0x8a6c4b, { map: TEX.dirt() }),
    yard: () => mat('yard', 0xa88f6c, { map: TEX.dirt(), bump: .3 }), ash: () => mat('ash', 0x7a6d5d, { map: TEX.dirt(), bump: .3 }),
    meadow: () => mat('meadow', 0x93b760, { map: TEX.grass(), bump: .3 }),
    furrow: () => mat('furrow', 0x5e4934, { map: TEX.dirt() }),
    sand: () => mat('sand', 0xb5a07b, { map: TEX.dirt(), bump: .3 }),
    wheat: () => mat('wheat', 0xd8c178, { map: TEX.thatch(), bump: .6 }),
    crop: () => mat('crop', 0x7fa04f), cabbage: () => mat('cabbage', 0x93b06a), pumpkin: () => mat('pumpkin', 0xcf8b3f),
    hedge: () => mat('hedge', 0x4b7335), vine: () => mat('vine', 0x62883f), grape: () => mat('grape', 0x6a4c58),
    leaf: () => mat('leaf', 0x648c42), leaf2: () => mat('leaf2', 0x7b9b4b),
    fruit: () => mat('fruit', 0xe2bd52), fruit2: () => mat('fruit2', 0xd88d3d),
    flowerW: () => mat('flowerW', 0xf1ece0), flowerY: () => mat('flowerY', 0xe8ce62),
    wool: () => mat('wool', 0xebe5d6), hide: () => mat('hide', 0x2f2823), cow: () => mat('cow', 0xe2dbcd),
    brown: () => mat('brown', 0x8a6242), bay: () => mat('bay', 0x5c3d27), dapple: () => mat('dapple', 0xcdc7bc),
    plaster: () => mat('plaster', 0xe3d8c0, { map: TEX.cloth(), bump: .1 }),
    slateRoof: () => mat('slateRoof', 0x6b7279, { map: TEX.shingle(), bump: .8 }),
    canvas: () => mat('canvas', 0xe5dac0, { map: TEX.cloth(), bump: .1, side: T.DoubleSide, smooth: true }),
    ochre: () => mat('ochre', 0xcbb285, { map: TEX.cloth(), bump: .1, side: T.DoubleSide, smooth: true }),
    sage: () => mat('sage', 0xa0a982, { map: TEX.cloth(), bump: .1, side: T.DoubleSide, smooth: true }),
    reed: () => mat('reed', 0x8b8a4f), lily: () => mat('lily', 0x5a8944), beak: () => mat('beak', 0xd9a03d),
    mound: () => mat('mound', 0x4f433a, { map: TEX.dirt() }), terra: () => mat('terra', 0xb57a55), bread: () => mat('bread', 0xc39457),
    foam: () => mat('foam', 0xdcefea, { smooth: true }),
    // the five building cultures (c.style): walls and roofs of the surroundings follow the base's culture
    white: () => mat('white', 0xf1ece1, { map: TEX.cloth(), bump: .1 }),                  // Südlich: whitewash
    clay: () => mat('clay', 0xb38e6f, { map: TEX.shingle(), bump: .7 }),                  // Südlich: pale clay tiles (brown, never owner red)
    adobe: () => mat('adobe', 0xcfac80, { map: TEX.dirt(), bump: .25 }),                  // Morgenland: mud brick
    shingleDk: () => mat('shingleDk', 0x57504a, { map: TEX.shingle(), bump: .8 }),        // Nordisch: dark shingles
    tileDk: () => mat('tileDk', 0x55534f, { map: TEX.shingle(), bump: .8 }),              // Fernost: dark grey tiles
    palm: () => mat('palm', 0x5e8a37, { side: T.DoubleSide }), bark: () => mat('bark', 0x8a6a4a, { map: TEX.thatch(), bump: .5 }),
    olive: () => mat('olive', 0x8f9c72), shoot: () => mat('shoot', 0x9fcf5e), dike: () => mat('dike', 0x7d6447, { map: TEX.dirt() })
  };

  // ---------- geometry templates: built once, copied into per-base batches ----------
  const TPL = {}, q = (v, s = .01) => Math.max(s, Math.round(v / s) * s);
  function tpl(key, make, uv, cyl) {
    let g = TPL[key]; if (g) return g;
    g = make(); if (uv !== false) K.worldUV(g, uv || .25, !!cyl);
    if (g.index) g = g.toNonIndexed();
    return TPL[key] = g;
  }
  const G = {
    box: (w, h, d) => { w = q(w); h = q(h); d = q(d); return tpl('box' + w + ',' + h + ',' + d, () => new T.BoxGeometry(w, h, d).translate(0, h / 2, 0)); },
    cbox: (w, h, d) => { w = q(w); h = q(h); d = q(d); return tpl('cbox' + w + ',' + h + ',' + d, () => new T.BoxGeometry(w, h, d)); },
    cyl: (rt, rb, h, seg) => { rt = q(rt); rb = q(rb); h = q(h); return tpl('cyl' + rt + ',' + rb + ',' + h + ',' + seg, () => new T.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), .25, true); },
    rod: (r, seg) => { r = q(r, .005); return tpl('rod' + r + ',' + seg, () => new T.CylinderGeometry(r, r, 1, seg), .25, true); },   // centred, length 1 (scaled)
    cone: (r, h, seg) => { r = q(r); h = q(h); return tpl('cone' + r + ',' + h + ',' + seg, () => new T.ConeGeometry(r, h, seg).translate(0, h / 2, 0), .35, true); },
    sph: (r, seg, seg2, half) => { r = q(r); return tpl('sph' + r + ',' + seg + ',' + seg2 + (half ? 'h' : ''), () => new T.SphereGeometry(r, seg, seg2, 0, PI * 2, 0, half ? PI / 2 : PI), .3); },
    ico: (r, det) => { r = q(r, .02); return tpl('ico' + r + ',' + det, () => new T.IcosahedronGeometry(r, det), .3); },
    rock: (r) => { r = q(r, .02); return tpl('rock' + r, () => new T.DodecahedronGeometry(r, 0).scale(1, .6, .9), .3); },
    gable: (len, span, h) => { len = q(len); span = q(span); h = q(h); return tpl('gab' + len + ',' + span + ',' + h, () => { const s = new T.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, h); s.closePath();
      const g = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); g.rotateY(PI / 2); return g; }, .35); },
    pyr: (w, d, h) => { w = q(w); d = q(d); h = q(h); return tpl('pyr' + w + ',' + d + ',' + h, () => { const g = new T.ConeGeometry(Math.SQRT1_2, 1, 4); g.rotateY(PI / 4); g.translate(0, .5, 0); g.scale(w, h, d); g.computeVertexNormals(); return g; }, .35); },
    torus: (r, t) => { r = q(r); t = q(t, .005); return tpl('tor' + r + ',' + t, () => new T.TorusGeometry(r, t, 5, 20).rotateX(PI / 2)); },
    disc: () => tpl('disc', () => new T.CircleGeometry(1, 28).rotateX(-PI / 2)),
    wrect: () => tpl('wrect', () => new T.PlaneGeometry(1, 1).rotateX(-PI / 2)),
    sheet: () => tpl('sheet', () => new T.PlaneGeometry(1, 1), false),          // keeps 0..1 uvs: a whole coat of arms on an awning
    jib: () => tpl('jib', () => { const s = new T.Shape(); s.moveTo(.2, 0); s.lineTo(1.05, 0); s.lineTo(.86, .34); s.closePath(); return new T.ShapeGeometry(s); }),   // triangular mill sail along +x
    leaf: () => tpl('leaf', () => { const g = new T.PlaneGeometry(1, .3, 4, 1); g.translate(.5, 0, 0); g.rotateX(-PI / 2); const p = g.attributes.position;   // a palm frond along +x, bent down
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, -.5 * x * x + Math.abs(p.getZ(i)) * .4); p.setZ(i, p.getZ(i) * (1.15 - x * .9)); } g.computeVertexNormals(); return g; }, false),
    hull: () => tpl('hull', () => { const L = .95, H = .22, s = new T.Shape(); s.moveTo(-L / 2, H); s.quadraticCurveTo(-L / 2 + .08, 0, -L / 2 + L * .28, 0); s.lineTo(L / 2 - L * .22, 0);
      s.quadraticCurveTo(L / 2 - .02, 0, L / 2 + .06, H); s.closePath();
      const g = new T.ExtrudeGeometry(s, { depth: .32, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 1, curveSegments: 4 }); g.translate(0, 0, -.16); return g; }, .4)
  };

  // ---------- batch: every part of the surroundings is copied into one mesh per material ----------
  const _e = new T.Euler(), _q = new T.Quaternion(), _bq = new T.Quaternion(), _p = new T.Vector3(), _s = new T.Vector3(), _v = new T.Vector3(),
    _lm = new T.Matrix4(), _m = new T.Matrix4(), _n = new T.Matrix3(), _up = new T.Vector3(0, 1, 0), _d = new T.Vector3();
  function Batch(parent) { this.p = parent; this.frame = new T.Matrix4(); this.stack = []; this.parts = new Map(); this.ry = 0; this.sc = 1; this.ink = false; }
  const BP = Batch.prototype;
  BP.set = function (x, z, ry, sc = 1) { this.frame.makeRotationY(ry); if (sc !== 1) this.frame.scale(_s.set(sc, sc, sc)); this.frame.setPosition(x, 0, z); this.ry = ry; this.sc = sc; this.stack.length = 0; return this; };
  BP.push = function (x, y, z, ry = 0) { this.stack.push([this.frame.clone(), this.ry]); _lm.makeRotationY(ry); _lm.setPosition(x, y, z); this.frame.multiply(_lm); this.ry += ry; };
  BP.pop = function () { const s = this.stack.pop(); this.frame.copy(s[0]); this.ry = s[1]; };
  BP.pt = function (x, y, z) { return new T.Vector3(x, y, z).applyMatrix4(this.frame); };
  BP.add = function (geo, m, x, y, z, o = NO) {
    if (o.q) _q.copy(o.q); else { _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); }
    _p.set(x, y, z); _s.set(o.sx || 1, o.sy || 1, o.sz || 1);
    _lm.compose(_p, _q, _s); _m.multiplyMatrices(this.frame, _lm); _n.getNormalMatrix(_m);
    const ink = !o.flat && (o.ink || this.ink), key = m.uuid + (o.flat ? 'f' : ink ? 'i' : 'q'); let e = this.parts.get(key);
    if (!e) this.parts.set(key, e = { m, flat: !!o.flat, ink, pos: [], nor: [], uv: [] });
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, U = geo.attributes.uv ? geo.attributes.uv.array : null;
    for (let i = 0, n = P.length / 3; i < n; i++) {
      _v.fromArray(P, i * 3).applyMatrix4(_m); e.pos.push(_v.x, _v.y, _v.z);
      _v.fromArray(N, i * 3).applyMatrix3(_n).normalize(); e.nor.push(_v.x, _v.y, _v.z);
      e.uv.push(U ? U[i * 2] : 0, U ? U[i * 2 + 1] : 0);
    }
  };
  BP.flush = function () {
    let n = 0;
    for (const e of this.parts.values()) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(e.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(e.nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(e.uv, 2));
      const mesh = new T.Mesh(g, e.m); mesh.castShadow = !e.flat; mesh.receiveShadow = true; if (!e.ink) mesh.userData.noOutline = true;   // small props stay quiet: ink only on buildings
      this.p.add(mesh); n++;
    }
    this.parts.clear(); return n;
  };
  BP.box = function (m, w, h, d, x, y, z, o) { this.add(G.box(w, h, d), m, x, y, z, o); };
  BP.cyl = function (m, rt, rb, h, x, y, z, o = NO) { this.add(G.cyl(rt, rb, h, o.seg || 10), m, x, y, z, o); };
  BP.cone = function (m, r, h, x, y, z, o = NO) { this.add(G.cone(r, h, o.seg || 8), m, x, y, z, o); };
  BP.sph = function (m, r, x, y, z, o = NO) { this.add(G.sph(r, o.seg || 8, o.seg2 || 6, o.half), m, x, y, z, o); };
  BP.ico = function (m, r, x, y, z, o = NO) { this.add(G.ico(r, o.det || 0), m, x, y, z, o); };
  BP.rock = function (m, r, x, z) { this.add(G.rock(r), m, x, q(r, .02) * .3, z, { ry: x * 3 + z * 5 }); };
  BP.gable = function (m, len, span, h, x, y, z, o) { this.add(G.gable(len, span, h), m, x, y, z, o); };
  BP.pyr = function (m, w, d, h, x, y, z, o) { this.add(G.pyr(w, d, h), m, x, y, z, o); };
  BP.log = function (m, r, len, x, y, z, ry = 0) { this.add(G.rod(r, 7), m, x, y, z, { rz: PI / 2, ry, sy: len }); };           // lying along x (ry turns it)
  BP.wheel = function (m, r, t, x, y, z) { this.add(G.rod(r, 10), m, x, y, z, { rx: PI / 2, sy: t }); };                          // axle along z
  BP.disc = function (m, r, t, x, y, z) { this.add(G.rod(r, 12), m, x, y, z, { rx: PI / 2, sy: t }); };                            // upright disc facing +z
  BP.beam = function (m, r, x1, y1, z1, x2, y2, z2, seg = 5) {
    _d.set(x2 - x1, y2 - y1, z2 - z1); const L = _d.length(); _d.multiplyScalar(1 / L); _bq.setFromUnitVectors(_up, _d);
    this.add(G.rod(r, seg), m, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, { q: _bq, sy: L });
  };
  // flat ground patch (no outline, no shadow): a slab w × d, round or square
  BP.flat = function (m, w, d, x, z, h = .04, round = false) {
    if (round) this.add(G.cyl(1, 1, h, 22), m, x, 0, z, { sx: w / 2, sz: d / 2, flat: true }); else this.add(G.box(w, h, d), m, x, 0, z, { flat: true });
  };
  BP.water = function (rx, rz, x, y, z, rect) { this.add(rect ? G.wrect() : G.disc(), K.waterMat(), x, y, z, { sx: rx, sz: rz, flat: true }); };
  BP.lantern = function (x, z, h = 1.0, y = 0) { this.cyl(M.iron(), .03, .045, h, x, y, z, { seg: 6 }); this.box(M.window(), .15, .18, .15, x, y + h, z); this.pyr(M.iron(), .23, .23, .12, x, y + h + .18, z); };
  BP.fence = function (x1, z1, x2, z2, h = .42) {
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / .45)), a = Math.atan2(z2 - z1, x2 - x1);
    for (let i = 0; i <= n; i++) { const t = i / n; this.box(M.darkWood(), .05, h, .05, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t); }
    for (const y of [h * .42, h * .8]) this.box(M.rawWood(), L, .035, .03, (x1 + x2) / 2, y, (z1 + z2) / 2, { ry: -a });
  };
  BP.fenceRect = function (w, d, gap, h) { const a = w / 2, b = d / 2; this.fence(-a, -b, a, -b, h); this.fence(-a, -b, -a, b, h); this.fence(a, -b, a, b, h); this.fence(-a, b, -gap / 2, b, h); this.fence(gap / 2, b, a, b, h); };

  // flat path ribbons (one mesh): a strip along a polyline
  function Strip() { this.pos = []; }
  Strip.prototype.tri = function (a, b, c, y) { if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < 0) { const t = b; b = c; c = t; } this.pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]); };
  Strip.prototype.line = function (pts, w, wob, R, y = .02) {
    const L = [], Q = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const hw = w / 2 * (1 + (R() - .5) * wob); L.push([pts[i][0] - tz * hw, pts[i][1] + tx * hw]); Q.push([pts[i][0] + tz * hw, pts[i][1] - tx * hw]);
    }
    for (let i = 0; i < pts.length - 1; i++) { this.tri(L[i], Q[i], Q[i + 1], y); this.tri(L[i], Q[i + 1], L[i + 1], y); }
  };
  Strip.prototype.mesh = function (p, m) {
    if (!this.pos.length) return 0; const n = this.pos.length / 3, nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { nor[i * 3 + 1] = 1; uv[i * 2] = this.pos[i * 3] * .3; uv[i * 2 + 1] = this.pos[i * 3 + 2] * .3; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    const mesh = new T.Mesh(g, m); mesh.receiveShadow = true; mesh.castShadow = false; mesh.userData.noOutline = true; p.add(mesh); return 1;
  };

  // ---------- shared small builders ----------
  function barrel(B, x, y, z) { B.cyl(M.wood(), .18, .17, .48, x, y, z, { seg: 10 }); B.add(G.torus(.186, .018), M.iron(), x, y + .1, z); B.add(G.torus(.186, .018), M.iron(), x, y + .38, z); }
  function cart(B, load) {
    B.box(M.wood(), .75, .07, .42, 0, .26, 0);
    for (const sz of [-1, 1]) { B.box(M.wood(), .75, .12, .03, 0, .33, sz * .2); B.wheel(M.darkWood(), .2, .05, -.05, .2, sz * .25); }
    for (const sz of [-1, 1]) B.beam(M.darkWood(), .02, .37, .3, sz * .12, .82, .05, sz * .15);
    if (load === 'heu') B.box(M.thatch(), .68, .2, .36, 0, .33, 0);
    else if (load) { B.cyl(M.wood(), .12, .11, .3, -.17, .33, 0, { seg: 8 }); B.box(M.wood(), .22, .2, .22, .15, .33, .02, { ry: .3 }); }
  }
  function sheep(B) {
    B.ico(MT.wool(), .17, 0, .26, 0, { sx: 1.4, sy: .85 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(MT.hide(), .04, .14, .04, sx * .12, 0, sz * .07);
    B.box(MT.hide(), .11, .12, .12, .27, .24, 0);
  }
  function cow(B, R) {
    const m = R() < .55 ? MT.cow() : MT.brown();
    B.box(m, .56, .28, .26, 0, .2, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(m, .06, .2, .06, sx * .2, 0, sz * .08);
    B.box(MT.hide(), .17, .15, .15, .36, .3, 0); if (m === MT.cow()) B.box(MT.hide(), .2, .17, .28, -.06, .25, 0);
    B.beam(MT.hide(), .015, -.28, .44, 0, -.32, .22, 0, 4);
  }
  function horse(B, R) {
    const m = [MT.brown(), MT.bay(), MT.dapple()][Math.floor(R() * 3)], dk = MT.hide();
    B.box(m, .5, .22, .19, 0, .34, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(m, .05, .36, .05, sx * .19, 0, sz * .065);
    B.box(m, .11, .3, .12, .22, .45, 0, { rz: -.55 }); B.box(m, .22, .09, .1, .38, .65, 0, { rz: -.3 });
    B.beam(dk, .025, -.25, .52, 0, -.31, .26, 0, 4);
  }
  function duck(B) { B.sph(MT.wool(), .07, 0, .06, 0, { sx: 1.4, sy: .8, seg: 7, seg2: 5 }); B.sph(MT.wool(), .045, .08, .13, 0, { seg: 6, seg2: 4 }); B.box(MT.beak(), .05, .02, .03, .13, .115, 0); }
  function stand(B, R, cloth) {                                                             // one market stall, front towards +z
    B.ink = true; B.box(M.wood(), .85, .42, .4, 0, 0, 0);
    for (const sx of [-1, 1]) { B.beam(M.darkWood(), .025, sx * .42, 0, .2, sx * .42, .98, .2); B.beam(M.darkWood(), .025, sx * .42, 0, -.2, sx * .42, 1.14, -.2); }
    B.add(G.sheet(), cloth, 0, 1.06, 0, { rx: -PI / 2 + .38, sx: 1.0, sy: .6 });
    B.box(cloth, 1.0, .1, .012, 0, .85, .29); B.ink = false;
    for (let k = 0; k < 4; k++) { const gx = -.3 + k * .2, t = R();
      if (t < .4) B.sph(R() < .5 ? MT.fruit() : MT.cabbage(), .06, gx, .48, 0, { seg: 6, seg2: 4 });
      else if (t < .7) B.box(MT.bread(), .13, .07, .1, gx, .42, 0); else B.cyl(MT.terra(), .05, .06, .13, gx, .42, 0, { seg: 7 }); }
  }
  // crossed gable boards (Nordisch) at the gable end x of a roof with foot y, span d and height rh
  function xBoards(B, x, y, d, rh) { for (const s of [-1, 1]) B.beam(M.darkWood(), .025, x, y + rh * .45, s * d * .3, x, y + rh + .2, -s * .1, 4); }
  function house(B, R, E, wall, timber, smoke) {                                           // a small cottage, door towards +z, roof in the base's culture
    const st = E.sty, w = .7 + R() * .16, d = .64, h = .52 + R() * .16, cx = w * .28 * (R() < .5 ? 1 : -1);
    B.ink = true; B.box(wall, w, h, d, 0, 0, 0);
    if (timber) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(M.darkWood(), .05, h, .05, sx * (w / 2 - .01), 0, sz * (d / 2 - .01)); B.box(M.darkWood(), w + .02, .05, d + .02, 0, h * .55, 0); }
    let top;
    if (st === 'morgenland') { B.box(wall, w + .05, .08, d + .05, 0, h, 0); B.sph(E.roof, .2, -cx * .7, h + .08, 0, { half: true, seg: 10, seg2: 4 }); top = h + .1; }   // flat roof, small owner dome
    else if (st === 'fernost') { B.pyr(E.roof, w + .36, d + .36, .15, 0, h, 0); B.gable(E.roof, w * .82, d * .62, .26, 0, h + .09, 0); top = h + .3; }  // hip-and-gable
    else { const rh = st === 'nordisch' ? .64 + R() * .1 : st === 'suedlich' ? .22 + R() * .05 : .4 + R() * .12;
      B.gable(E.roof, w + .16, d + .2, rh, 0, h, 0); top = h + rh;
      if (st === 'nordisch') for (const s of [-1, 1]) xBoards(B, s * (w / 2 + .08), h, d + .2, rh);
      else B.box(st === 'suedlich' ? wall : M.field(), .13, rh * .75, .13, cx, h + rh * .3, -d * .2); }
    B.box(M.dark(), .17, .3, .03, 0, 0, d / 2 + .005); for (const sx of [-1, 1]) B.box(M.window(), .12, .12, .03, sx * w * .3, h * .42, d / 2 + .005);
    B.ink = false; if (smoke) E.smoke(B, cx, top + .12, st === 'morgenland' ? 0 : -d * .2, { size: .22, rise: 2, alpha: .28 });
  }
  // a stacked tower of n storeys with wide dark eaves (Fernost pagoda), foot at y0, lowest storey s0 wide
  function pagoda(B, E, n, s0, y0, rm) {
    let y = y0, s = s0;
    for (let i = 0; i < n; i++) { const h = i ? .34 - i * .015 : .44;
      B.box(MT.plaster(), s, h, s, 0, y, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(M.darkWood(), .05, h, .05, sx * (s / 2 - .01), y, sz * (s / 2 - .01));
      B.box(i ? M.window() : M.dark(), i ? .12 : .16, i ? .13 : .26, .03, 0, y + (i ? h * .35 : 0), s / 2 + .005);
      y += h; B.pyr(rm, s + .5, s + .5, .16, 0, y, 0); y += .08; s *= .8; }
    B.pyr(rm, s + .34, s + .34, .38, 0, y, 0); y += .3;
    B.cyl(M.bronze(), .025, .03, .62, 0, y, 0, { seg: 6 }); for (let k = 0; k < 3; k++) B.add(G.torus(.07 - k * .012, .012), M.bronze(), 0, y + .2 + k * .12, 0);
    return y + .62;
  }
  // the tall house of a landmark village (tower house / campanile / wind tower / small pagoda), in the base's culture
  function villageTower(B, R, E) {
    const st = E.sty; B.ink = true;
    if (st === 'fernost') { B.box(E.stone, .9, .12, .9, 0, 0, 0); pagoda(B, E, 3, .7, .12, E.roof); return; }
    if (st === 'morgenland') { B.box(MT.adobe(), .6, 2.5, .6, 0, 0, 0); for (const [x, z, ry] of [[0, .305, 0], [.305, 0, PI / 2]]) for (const k of [-1, 1]) B.box(M.dark(), .08, .42, .02, x + (ry ? 0 : k * .13), 1.95, z + (ry ? k * .13 : 0), { ry });
      B.box(MT.adobe(), .66, .08, .66, 0, 2.5, 0); B.sph(E.roof, .22, 0, 2.58, 0, { half: true, seg: 10, seg2: 4 }); return; }
    const wall = st === 'nordisch' ? M.darkWood() : st === 'suedlich' ? MT.white() : E.tier >= 7 ? E.stone : MT.plaster(), H = st === 'nordisch' ? 1.9 : 2.2;
    B.box(wall, .62, H, .62, 0, 0, 0);
    if (st === 'klassisch' && wall === MT.plaster()) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(M.darkWood(), .05, H, .05, sx * .3, 0, sz * .3); B.box(M.darkWood(), .64, .05, .64, 0, H * .5, 0); }
    B.box(M.dark(), .18, .3, .03, 0, 0, .315); for (const y of [H * .45, H * .75]) B.box(M.window(), .12, .16, .03, 0, y, .315);
    if (st === 'nordisch') { B.pyr(E.roof, .86, .86, 1.05, 0, H, 0); B.cone(M.iron(), .04, .3, 0, H + 1.0, 0, { seg: 5 }); }
    else if (st === 'suedlich') { B.box(M.sand(), .66, .06, .66, 0, H, 0); B.pyr(E.roof, .74, .74, .3, 0, H + .06, 0); }
    else B.pyr(E.roof, .84, .84, .75, 0, H, 0);
  }

  // ---------- the items. Local frame: x along the ring, +z faces the base (the entrance side), y up; footprint w × d ----------
  const CROPS = ['weizen', 'weizen', 'gruen', 'kohl', 'kuerbis', 'furchen'];
  const D = {};
  D.holz = { de: 'Holzstapel', t: [0, 3], wt: 3, kind: 'klein', size: () => ({ w: 2.0, d: 1.3 }),
    build(B, R, s, E) {
      B.flat(MT.yard(), s.w, s.d, 0, 0, .03, true);
      const n0 = E.tier >= 2 ? 4 : 3, L = 1.0 + R() * .2, z0 = -.05, half = (n0 - 1) * .105;
      for (let row = 0; row < n0; row++) for (let i = 0; i < n0 - row; i++) B.log(R() < .5 ? M.wood() : M.rawWood(), .1, L + (R() - .5) * .15, -.2 + (R() - .5) * .08, .1 + row * .172, z0 + (i - (n0 - row - 1) / 2) * .21);
      for (const sz of [-1, 1]) for (const sx of [-.3, .3]) B.cyl(M.darkWood(), .03, .04, .2 + n0 * .17, -.2 + sx * L, 0, z0 + sz * (half + .15), { seg: 5 });
      B.cyl(M.wood(), .18, .2, .3, .72, 0, .3, { seg: 8 });
      B.beam(M.darkWood(), .022, .72, .3, .3, .86, .74, .4, 4); B.box(M.iron(), .04, .1, .15, .72, .27, .3, { ry: .6 });
      for (let i = 0; i < 3; i++) B.box(M.rawWood(), .09, .09, .3, .75 + (R() - .5) * .3, 0, -.25 - R() * .25, { ry: R() * 3 });
    } };
  D.acker = { de: 'Acker', t: [0, 9], wt: 6, kind: 'feld',
    size(t, R, k) {
      const plots = t >= 5 ? 3 + (R() < .35 ? 1 : 0) : t >= 3 ? 2 + (R() < .5 ? 1 : 0) : (t >= 1 && R() < .5 ? 2 : 1), hedge = t >= 4;
      const w = Math.min(3.3, (t === 0 ? 1.4 : 1.7 + t * .16) + R() * .5) * k, d = Math.min(1.75, 1.15 + t * .05 + R() * .3) * k;
      const crops = []; for (let i = 0; i < plots; i++) { let c = CROPS[Math.floor(R() * CROPS.length)]; if (i && c === crops[i - 1]) c = CROPS[(CROPS.indexOf(c) + 2) % CROPS.length]; crops.push(c); }
      return { w, d: d + (hedge ? .35 : 0), plots, crops, along: crops.map(() => R() < .5), scare: t >= 1 && R() < .55, hedge };
    },
    build(B, R, s, E) {
      const n = s.plots, gap = .14, dd = s.d - (s.hedge ? .35 : 0), z0 = s.hedge ? .175 : 0, pw = (s.w - gap * (n - 1)) / n;
      for (let j = 0; j < n; j++) {
        const x0 = -s.w / 2 + pw / 2 + j * (pw + gap), crop = s.crops[j], al = s.along[j];
        B.flat(MT.soil(), pw, dd, x0, z0, .04);
        const span = al ? pw : dd, len = (al ? dd : pw) - .16, rows = Math.max(2, Math.round(span / .27)), step = (span - .22) / (rows - 1);
        for (let r = 0; r < rows; r++) {
          const off = -(span - .22) / 2 + r * step, rx = al ? x0 + off : x0, rz = al ? z0 : z0 + off, bw = al ? .13 : len, bd = al ? len : .13;
          if (crop === 'weizen') B.box(MT.wheat(), al ? .17 : len, .26, al ? len : .17, rx, .04, rz);
          else if (crop === 'gruen') B.box(MT.crop(), bw, .13, bd, rx, .04, rz);
          else if (crop === 'furchen') B.box(MT.furrow(), bw, .05, bd, rx, .04, rz);
          else { const m = Math.max(2, Math.round(len / .24)); for (let i = 0; i < m; i++) { const t = -len / 2 + (i + .5) * len / m, px = al ? rx : x0 + t, pz = al ? z0 + t : rz;
            if (crop === 'kohl') B.ico(MT.cabbage(), .09, px, .1, pz, { ry: i });
            else { B.box(MT.crop(), .1, .05, .1, px, .04, pz); if ((i + r) % 2 === 0) B.sph(MT.pumpkin(), .085, px, .11, pz, { sy: .75 }); } } }
        }
      }
      if (s.hedge) B.box(MT.hedge(), s.w + .1, .3, .22, 0, 0, -s.d / 2 + .11);
      if (s.scare) { const x = (R() < .5 ? -1 : 1) * (s.w / 2 - .3), z = z0 + (R() - .5) * dd * .4;
        B.beam(M.darkWood(), .025, x, 0, z, x, 1.0, z); B.beam(M.darkWood(), .02, x - .28, .72, z, x + .28, .72, z);
        B.box(MT.ochre(), .22, .3, .1, x, .45, z); B.sph(M.thatch(), .085, x, .97, z); B.cone(M.wood(), .13, .12, x, 1.02, z); }
    } };
  D.acker2 = Object.assign({}, D.acker, { t: [3, 9], wt: 1.5 });                          // a second field further out
  D.heu = { de: 'Heuschober', t: [0, 5], wt: 2, kind: 'klein', size: (t, R) => { const n = 2 + (R() < .5 ? 1 : 0); return { w: n === 3 ? 2.1 : 1.6, d: 1.3, n, cart: t >= 1 && R() < .55 }; },
    build(B, R, s, E) {
      const xs = s.n === 3 ? [-.7, 0, .7] : [-.4, .4];
      for (const x of xs) { const r = .3 + R() * .07, zz = -.25 + (R() - .5) * .15; B.cyl(M.thatch(), r, r * .95, .38, x, 0, zz, { seg: 9 }); B.cone(M.thatch(), r * 1.1, .5, x, .38, zz, { seg: 9 }); B.beam(M.darkWood(), .018, x, .8, zz, x, 1.0, zz, 4); }
      if (s.cart) { B.push(.1, 0, .38, (R() - .5) * .6); cart(B, 'heu'); B.pop(); }
    } };
  D.brunnen = { de: 'Ziehbrunnen', t: [0, 4], wt: 2, kind: 'klein', size: () => ({ w: 1.2, d: 1.1 }),
    build(B, R, s, E) {
      B.flat(M.cobble(), 1.15, 1.05, 0, 0, .03, true); B.ink = true;
      B.cyl(E.stone, .36, .4, .45, 0, 0, 0, { seg: 12 }); B.water(.3, .3, 0, .465, 0);
      for (const sx of [-1, 1]) B.box(M.darkWood(), .07, 1.15, .07, sx * .4, 0, 0);
      B.beam(M.darkWood(), .03, -.42, .95, 0, .42, .95, 0, 6); B.gable(M.darkWood(), 1.0, .72, .32, 0, 1.15, 0);
      B.beam(M.rope(), .01, 0, .95, 0, 0, .72, 0, 4); B.cyl(M.wood(), .07, .06, .12, 0, .6, 0, { seg: 8 });
      B.cyl(M.wood(), .08, .07, .14, .45, 0, .35, { seg: 8 });
    } };
  D.meiler = { de: 'Kohlenmeiler', t: [0, 3], wt: 2, kind: 'klein', size: () => ({ w: 1.8, d: 1.3 }),
    build(B, R, s, E) {
      B.flat(MT.ash(), s.w, s.d, 0, 0, .03, true);
      B.sph(MT.mound(), .55, -.3, 0, 0, { half: true, sy: .62, seg: 10, seg2: 5 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2 + .3; B.beam(M.darkWood(), .035, -.3 + Math.cos(a) * .6, 0, Math.sin(a) * .6, -.3 + Math.cos(a) * .3, .3, Math.sin(a) * .3, 5); }
      for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - row; i++) B.log(M.wood(), .08, .7, .55 + (i - (2 - row) / 2) * .17, .08 + row * .14, .05, PI / 2);
      E.smoke(B, -.3, .36, 0, { color: 0x8a847b, size: .28, rise: 2.2 });
    } };
  D.vorrat = { de: 'Vorratsplatz', t: [0, 4], wt: 2, kind: 'klein', size: (t, R) => ({ w: 1.7, d: 1.3, cart: R() < .5 }),
    build(B, R, s, E) {
      B.flat(MT.yard(), s.w, s.d, 0, 0, .03, true);
      B.box(M.wood(), .45, .45, .45, -.5, 0, -.25, { ry: R() * .5 }); B.box(M.wood(), .34, .34, .34, -.5, .45, -.25, { ry: R() }); B.box(M.wood(), .4, .4, .4, -.02, 0, -.35, { ry: R() * .5 });
      barrel(B, .5, 0, -.3); barrel(B, .62, 0, .15);
      if (s.cart) { B.push(-.15, 0, .3, PI + (R() - .5) * .5); cart(B, 'fass'); B.pop(); }
      else for (let i = 0; i < 3; i++) B.sph(MT.ochre(), .14, -.45 + i * .24, .11, .3, { sy: .8, sx: 1.1 });
    } };
  D.bienen = { de: 'Bienenstöcke', t: [1, 7], wt: 1.5, kind: 'klein', size: () => ({ w: 1.4, d: 1.0 }),
    build(B, R, s, E) {
      B.flat(MT.meadow(), s.w, s.d, 0, 0, .03, true);
      B.box(M.wood(), 1.1, .05, .3, 0, .3, -.2); for (const sx of [-1, 1]) B.box(M.darkWood(), .06, .3, .26, sx * .45, 0, -.2);
      const n = 3 + (R() < .5 ? 1 : 0);
      for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .27; B.cyl(M.thatch(), .12, .12, .03, x, .35, -.2, { seg: 10 }); B.sph(M.thatch(), .12, x, .37, -.2, { half: true, sy: 1.5, seg: 10, seg2: 4 }); B.box(MT.hide(), .04, .04, .02, x, .39, -.09); }
      for (let i = 0; i < 9; i++) { const x = (R() - .5) * 1.1, z = .15 + R() * .28; B.ico(MT.leaf2(), .08, x, .06, z); B.sph(i % 2 ? MT.flowerW() : MT.flowerY(), .035, x, .14, z, { seg: 5, seg2: 4 }); }
    } };
  D.weide = { de: 'Weide mit Schafen oder Kühen', t: [1, 9], wt: 3, kind: 'mittel', size: (t, R, k) => ({ w: (1.9 + R() * .5 + t * .04) * k, d: (1.45 + R() * .3) * k, cows: R() < .4 }),
    build(B, R, s, E) {
      B.flat(MT.meadow(), s.w, s.d, 0, 0, .03); B.fenceRect(s.w, s.d, .5); B.box(M.wood(), .5, .14, .18, s.w / 2 - .45, 0, -s.d / 2 + .25);
      const n = s.cows ? 2 + (R() < .5 ? 1 : 0) : 4 + Math.floor(R() * 3), pts = [];
      for (let i = 0; i < n * 8 && pts.length < n; i++) { const x = (R() - .5) * (s.w - .75), z = (R() - .5) * (s.d - .65) + .05; if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < (s.cows ? .62 : .42))) continue; pts.push([x, z]); }
      for (const [x, z] of pts) { B.push(x, 0, z, R() * PI * 2); if (s.cows) cow(B, R); else sheep(B); B.pop(); }
    } };
  D.teich = { de: 'Ententeich', t: [1, 9], wt: 2.5, kind: 'mittel', size: (t, R, k) => ({ w: (1.8 + R() * .5) * k, d: (1.4 + R() * .3) * k }),
    build(B, R, s, E) {
      const a = s.w / 2 - .18, b = s.d / 2 - .18;
      B.water(a, b, 0, .04, 0);
      for (let i = 0; i < 16; i++) { if (R() < .3) continue; const t = i / 16 * PI * 2 + R() * .2; B.rock(i % 3 ? M.field() : M.darkStone(), .09 + R() * .08, Math.cos(t) * (a + .05), Math.sin(t) * (b + .05)); }
      for (let c = 0; c < 2; c++) { const t = R() * PI * 2, cx = Math.cos(t) * a * .82, cz = Math.sin(t) * b * .82; for (let i = 0; i < 6; i++) B.cone(MT.reed(), .022, .3 + R() * .25, cx + (R() - .5) * .22, 0, cz + (R() - .5) * .22, { seg: 4 }); }
      for (let i = 0; i < 3; i++) B.cyl(MT.lily(), .09, .09, .01, (R() - .5) * a, .045, (R() - .5) * b, { seg: 8 });
      const sub = E.sub(B, 0, 0, 0), DB = new Batch(sub), rr = Math.min(a, b) * .5;
      for (let i = 0; i < 2; i++) { const t = i * 2.5; DB.push(Math.cos(t) * rr, .02, Math.sin(t) * rr, -t - PI / 2); duck(DB); DB.pop(); }
      DB.flush(); const ry0 = sub.rotation.y, ph = R() * 6; K.tick((tt) => { sub.rotation.y = ry0 + tt * .22 + ph; });
    } };
  D.holzplatz = { de: 'Holzplatz', t: [1, 6], wt: 2, kind: 'mittel', size: (t, R) => ({ w: 2.2, d: 1.55, shed: t >= 3 || R() < .4 }),
    build(B, R, s, E) {
      B.flat(MT.sand(), s.w - .1, s.d - .1, 0, 0, .04);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) B.log(R() < .6 ? M.wood() : M.rawWood(), .12, 1.5 + (R() - .5) * .2, -.1, .16 + row * .2, -.4 + (i - (2 - row) / 2) * .25);
      B.box(M.rawWood(), .95, .22, .45, .45, .04, .3); B.box(M.rawWood(), .9, .04, .42, .47, .26, .31, { ry: .05 });
      const x = -.6, z = .32; for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.beam(M.darkWood(), .02, x + sx * .25, .04, z + sz * .13, x + sx * .25, .38, z, 4);
      B.box(M.darkWood(), .6, .05, .05, x, .36, z); B.log(M.wood(), .09, .8, x, .5, z);
      if (s.shed) { for (const [px, pz, h] of [[-.05, .06, .95], [.95, .06, .95], [-.05, .56, .8], [.95, .56, .8]]) B.cyl(M.darkWood(), .03, .03, h, px, 0, pz, { seg: 5 }); B.box(M.darkWood(), 1.25, .05, .72, .45, .84, .31, { rx: .2 }); }
    } };
  // a watch tower: wooden on stilts (low tiers, Nordisch, Fernost), a stone lookout from tier 5, a mud-brick tower in the Morgenland
  const stoneWarte = (t, st) => st === 'morgenland' || (t >= 5 && st !== 'nordisch' && st !== 'fernost');
  D.wachturm = { de: 'Wachturm', t: [0, 9], wt: 1.5, kind: 'mittel', lm: true, size: (t, R, k, st) => stoneWarte(t, st) ? { w: 1.3, d: 1.3 } : { w: 1.25, d: 1.4 },
    build(B, R, s, E) {
      const st = E.sty;
      if (stoneWarte(E.tier, st)) {
        const mo = st === 'morgenland', stn = mo ? MT.adobe() : st === 'suedlich' ? MT.white() : E.stone, H = 2.9;
        B.flat(mo ? MT.sand() : M.gravel(), 1.25, 1.25, 0, 0, .03, true); B.ink = true;
        if (mo) { B.box(stn, .72, H, .72, 0, 0, 0); B.box(stn, .84, .14, .84, 0, H, 0);
          for (let i = 0; i < 12; i++) { const k = i % 3, sd = Math.floor(i / 3), u = (k - 1) * .3, x = [u, .38, -u, -.38][sd], z = [.38, u, -.38, -u][sd]; B.cone(stn, .075, .22, x, H + .14, z, { seg: 4 }); }
          B.sph(M.cap(), .26, 0, H + .14, 0, { half: true, seg: 10, seg2: 4 }); B.cone(M.gold(), .04, .22, 0, H + .38, 0, { seg: 5 });
          for (const y of [1.0, 2.0]) B.box(M.dark(), .12, .26, .03, 0, y, .365); }
        else { B.cyl(stn, .42, .52, H, 0, 0, 0, { seg: 10 }); B.cyl(stn, .56, .44, .2, 0, H, 0, { seg: 10 });
          for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; B.box(stn, .15, .2, .1, Math.cos(a) * .5, H + .2, Math.sin(a) * .5, { ry: -a + PI / 2 }); }
          if (st === 'suedlich') B.cone(MT.clay(), .44, .34, 0, H + .2, 0, { seg: 10 }); else B.cone(MT.slateRoof(), .44, .95, 0, H + .2, 0, { seg: 10 });
          for (const y of [1.0, 2.05]) B.box(M.dark(), .1, .26, .1, 0, y, .52 - .1 * y / H); }   // slits across the front edge of the 10-sided tower
        B.box(M.dark(), .24, .42, .05, 0, 0, mo ? .37 : .52);
        return;
      }
      B.flat(MT.yard(), 1.2, 1.3, 0, -.05, .03, true);
      const h = 2.65, a = .32, zc = -.15;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.beam(M.wood(), .05, sx * (a + .06), 0, zc + sz * (a + .06), sx * a, h + .75, zc + sz * a, 6);
      for (const sx of [-1, 1]) { B.beam(M.darkWood(), .022, sx * .36, .15, zc - .36, sx * .35, h - .05, zc + .35, 4); B.beam(M.darkWood(), .022, sx * .36, .15, zc + .36, sx * .35, h - .05, zc - .35, 4); }
      B.ink = true; B.box(M.wood(), .86, .08, .86, 0, h, zc);
      for (const sz of [-1, 1]) B.box(M.rawWood(), .8, .3, .04, 0, h + .08, zc + sz * .4); for (const sx of [-1, 1]) B.box(M.rawWood(), .04, .3, .8, sx * .4, h + .08, zc);
      if (st === 'nordisch') { B.pyr(MT.shingleDk(), 1.0, 1.0, .95, 0, h + .75, zc); B.cone(M.iron(), .035, .28, 0, h + 1.65, zc, { seg: 5 }); }
      else if (st === 'fernost') { B.pyr(MT.tileDk(), 1.34, 1.34, .16, 0, h + .75, zc); B.pyr(MT.tileDk(), .8, .8, .36, 0, h + .83, zc); B.cyl(M.bronze(), .02, .025, .3, 0, h + 1.15, zc, { seg: 5 }); }
      else if (st === 'suedlich') B.pyr(MT.clay(), 1.06, 1.06, .32, 0, h + .75, zc);
      else B.pyr(E.tier >= 4 ? M.darkWood() : M.thatch(), 1.0, 1.0, .5, 0, h + .75, zc);
      for (const sx of [-1, 1]) B.beam(M.darkWood(), .02, sx * .14, 0, .62, sx * .14, h + .1, zc + .42, 4);
      for (let i = 1; i < 7; i++) { const t = i / 7; B.box(M.wood(), .28, .025, .03, 0, t * (h + .1), .62 - t * (.62 - zc - .42)); }
    } };
  D.obst = { de: 'Obstgarten', t: [2, 9], wt: 2.5, kind: 'mittel', size: (t, R, k) => { const cols = t >= 6 && k === 1 ? 4 : 3; return { w: cols * .72 + .1, d: 1.6, cols }; },
    build(B, R, s, E) {
      B.flat(MT.meadow(), s.w, s.d, 0, 0, .03);
      for (let i = 0; i < s.cols; i++) for (let j = 0; j < 2; j++) {
        if (R() < .08) continue; const x = (i - (s.cols - 1) / 2) * .72 + (R() - .5) * .08, z = (j - .5) * .75 + (R() - .5) * .08, r = .3 + R() * .07, cy = .5 + r * .75;
        B.cyl(M.darkWood(), .045, .06, .5, x, 0, z, { seg: 5 }); B.ico(R() < .5 ? MT.leaf() : MT.leaf2(), r, x, cy, z, { det: 1, sy: .85, ry: R() * 3 });
        for (let f = 0; f < 3; f++) { const ta = R() * PI * 2, tb = .15 + R() * .8; B.sph(E.fruit, .045, x + Math.cos(ta) * Math.cos(tb) * r * .96, cy + Math.sin(tb) * r * .8, z + Math.sin(ta) * Math.cos(tb) * r * .96, { seg: 5, seg2: 4 }); }
      }
      if (R() < .6) { const x = s.w / 2 - .15, z = .62; B.cyl(M.wood(), .12, .1, .14, x, 0, z, { seg: 8 }); B.sph(E.fruit, .1, x, .12, z, { sy: .5, seg: 7, seg2: 4 }); }
    } };
  D.muehle = { de: 'Windmühle', t: [0, 9], wt: 3, kind: 'gross', lm: true, size: () => ({ w: 2.6, d: 1.6 }),
    build(B, R, s, E) {                                                                   // Klassisch: plaster or stone tower mill, Nordisch: dark timber, Südlich: white with jib sails
      const st = E.sty, nord = st === 'nordisch', sued = st === 'suedlich', H = 2.35, face = R() < .5 ? 1 : -1;
      const body = nord ? M.darkWood() : sued ? MT.white() : E.tier >= 5 ? E.stone : MT.plaster(), roof = nord ? MT.shingleDk() : sued ? MT.clay() : E.tier >= 5 ? MT.slateRoof() : M.thatch();
      B.flat(MT.yard(), 1.7, 1.5, 0, .05, .03, true); B.ink = true;
      if (sued) { B.cyl(body, .5, .54, H, 0, 0, 0, { seg: 12 }); B.cone(roof, .58, .42, 0, H, 0, { seg: 12 }); }
      else { B.cyl(body, .42, .58, H, 0, 0, 0, { seg: 8 }); B.cyl(M.darkWood(), .5, .5, .1, 0, H - .06, 0, { seg: 8 }); B.cone(roof, .56, nord ? 1.0 : .75, 0, H + .04, 0, { seg: 8 }); }
      B.box(M.dark(), .26, .48, .12, 0, 0, .53); for (const y of [1.05, 1.7]) B.box(M.window(), .14, .18, .1, 0, y, sued ? .47 : .56 - y * .07);
      B.ink = false; for (const sx of [-1, 1]) B.sph(MT.ochre(), .12, sx * .5, .09, .45, { sy: .8 });
      const hub = E.sub(B, 0, H - .12, face * (sued ? .54 : .5), face > 0 ? 0 : PI), rot = new T.Group(); hub.add(rot); const SB = new Batch(rot); SB.ink = true;
      SB.add(G.rod(.07, 8), M.darkWood(), 0, 0, .06, { rx: PI / 2, sy: .26 });
      if (sued) for (let k = 0; k < 8; k++) { const a = k * PI / 4 + .2; SB.beam(M.darkWood(), .02, 0, 0, .16, Math.cos(a) * 1.22, Math.sin(a) * 1.22, .16, 4); SB.add(G.jib(), MT.canvas(), 0, 0, .16, { rz: a, sx: 1.15, sy: 1.15 }); }
      else for (let k = 0; k < 4; k++) { const a = k * PI / 2 + .4, ca = Math.cos(a), sa = Math.sin(a);
        SB.beam(M.darkWood(), .025, 0, 0, .16, ca * 1.25, sa * 1.25, .16, 4);
        SB.add(G.cbox(.3, .92, .02), MT.canvas(), ca * .75 - sa * .17, sa * .75 + ca * .17, .16, { rz: a - PI / 2 }); }
      SB.flush(); const ph = R() * 6, sp = .6 + R() * .5; K.tick((t) => { rot.rotation.z = -t * sp - ph; });
    } };
  D.markt = { de: 'Marktstände', t: [2, 9], wt: 3, kind: 'gross', size: (t, R) => ({ w: 3.1, d: 2.0, n: t >= 4 ? 3 : 2 + (R() < .5 ? 1 : 0) }),
    build(B, R, s, E) {
      B.flat(E.tier >= 5 ? M.cobble() : M.gravel(), s.w, s.d, 0, 0, .04, true);
      const spots = s.n === 3 ? [[-1.02, -.05, .65], [0, -.5, 0], [1.02, -.05, -.65]] : [[-.62, -.35, .3], [.66, -.3, -.3]];
      const plain = [MT.canvas(), MT.ochre(), MT.sage()], first = Math.floor(R() * s.n);
      for (let i = 0; i < s.n; i++) { const [x, z, ry] = spots[i]; B.push(x, .04, z, ry);
        if (s.dome && i === (s.n === 3 ? 1 : 0)) kiosk(B, E); else stand(B, R, E.crest && (i === first || R() < .3) ? E.crest : plain[Math.floor(R() * 3)]); B.pop(); }
      barrel(B, .45, .04, .55); B.box(M.wood(), .32, .32, .32, -.5, .04, .6, { ry: .4 });
    } };
  function kiosk(B, E) {                                                                 // a domed stall: four posts, low counter, a dome in the owner colour
    B.ink = true; B.box(MT.adobe(), .8, .4, .5, 0, 0, -.05); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(MT.adobe(), .08, 1.0, .08, sx * .38, 0, sz * .3 - .05);
    B.box(MT.adobe(), .88, .1, .7, 0, 1.0, -.05); B.sph(E.roof, .36, 0, 1.1, -.05, { half: true, seg: 10, seg2: 5 }); B.cone(M.gold(), .035, .2, 0, 1.44, -.05, { seg: 5 });
    B.ink = false; for (let k = 0; k < 3; k++) B.sph(k % 2 ? MT.fruit2() : MT.fruit(), .07, -.2 + k * .2, .45, 0, { seg: 6, seg2: 4 });
  }
  D.basar = Object.assign({}, D.markt, { de: 'Basar mit Kuppelstand', size: (t, R) => ({ w: 3.1, d: 2.0, n: t >= 4 ? 3 : 2 + (R() < .5 ? 1 : 0), dome: true }) });
  D.steinbruch = { de: 'Steinbruch', t: [2, 8], wt: 2, kind: 'gross', size: () => ({ w: 2.45, d: 1.95 }),
    build(B, R, s, E) {
      B.flat(M.gravel(), s.w, s.d, 0, 0, .04, true);
      for (let i = 0; i < 4; i++) B.rock(i % 2 ? M.field() : M.darkStone(), .34 + R() * .18, -.7 + i * .46 + (R() - .5) * .08, -.45 + (R() - .5) * .08);
      B.box(E.stone, .5, .5, .4, .15, 0, -.3, { ry: .1 });
      for (let i = 0; i < 3; i++) B.box(E.stone, .32, .24, .28, .15 + i * .34, .04, .38, { ry: (R() - .5) * .2 });
      for (let i = 0; i < 2; i++) B.box(E.stone, .32, .24, .28, .32 + i * .34, .28, .38, { ry: (R() - .5) * .2 });
      const cx = -.55, cz = .28, ay = 1.45;
      for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + .5; B.beam(M.wood(), .03, cx + Math.cos(a) * .42, 0, cz + Math.sin(a) * .42, cx, ay, cz, 5); }
      B.beam(M.rope(), .012, cx, ay, cz, cx, .62, cz, 4); B.box(E.stone, .26, .2, .22, cx, .42, cz);
      for (let i = 0; i < 5; i++) B.rock(M.field(), .06 + R() * .05, (R() - .5) * 1.7, .1 + (R() - .5) * .9);
    } };
  D.uebung = { de: 'Übungsplatz mit Strohscheiben', t: [2, 9], wt: 2, kind: 'gross', size: () => ({ w: 2.3, d: 1.7 }),
    build(B, R, s, E) {
      B.flat(MT.sand(), s.w, s.d, 0, 0, .04);
      for (let i = 0; i < 3; i++) { const x = (i - 1) * .7, z = -s.d / 2 + .4;
        B.beam(M.darkWood(), .025, x - .18, .04, z + .12, x, .75, z, 4); B.beam(M.darkWood(), .025, x + .18, .04, z + .12, x, .75, z, 4); B.beam(M.darkWood(), .025, x, .04, z - .22, x, .75, z, 4);
        B.disc(M.thatch(), .27, .08, x, .62, z + .1); B.disc(MT.flowerW(), .18, .1, x, .62, z + .1); B.disc(MT.hide(), .08, .12, x, .62, z + .1); }
      const dx = s.w / 2 - .45, dz = .35;
      B.beam(M.darkWood(), .03, dx, .04, dz, dx, 1.05, dz); B.beam(M.darkWood(), .025, dx - .3, .8, dz, dx + .3, .8, dz); B.cyl(MT.ochre(), .13, .15, .42, dx, .4, dz, { seg: 8 }); B.sph(M.thatch(), .1, dx, 1.0, dz);
      const rx = -s.w / 2 + .5, rz = .35;
      for (const sx of [-1, 1]) B.box(M.darkWood(), .05, .7, .05, rx + sx * .3, .04, rz); B.box(M.darkWood(), .66, .05, .05, rx, .66, rz);
      for (let i = 0; i < 4; i++) { const x = rx - .22 + i * .15; B.beam(M.wood(), .015, x, .04, rz + .12, x, 1.05, rz - .02, 4); B.cone(M.iron(), .03, .12, x, 1.05, rz - .02, { seg: 4 }); }
    } };
  D.schmiede = { de: 'Schmiede', t: [2, 7], wt: 2, kind: 'mittel', size: () => ({ w: 1.6, d: 1.4 }),
    build(B, R, s, E) {
      B.flat(M.cobble(), 1.45, 1.25, 0, 0, .04);
      B.ink = true; B.box(M.field(), .6, .45, .45, -.3, .04, -.25); B.box(M.ember(), .44, .03, .3, -.3, .49, -.25); B.box(M.field(), .32, 1.8, .3, -.3, .04, -.55);
      for (const [x, z] of [[-.62, -.5], [.62, -.5], [-.62, .5], [.62, .5]]) B.cyl(M.darkWood(), .035, .04, 1.1, x, .04, z, { seg: 5 });
      B.gable(M.darkWood(), 1.5, 1.3, .4, 0, 1.14, 0); B.ink = false;
      B.box(M.iron(), .12, .22, .12, .3, .04, .15); B.box(M.iron(), .3, .09, .13, .32, .26, .15);
      barrel(B, .42, .04, -.3);
      E.smoke(B, -.3, 1.9, -.55, { color: 0x8f8a82, size: .26 });
    } };
  D.kapelle = { de: 'Kapelle', t: [1, 9], wt: 2.5, kind: 'gross', lm: true, size: () => ({ w: 1.4, d: 2.2 }),
    build(B, R, s, E) {
      const wall = E.tier >= 5 ? E.stone : MT.plaster(), roof = MT.slateRoof();
      B.flat(M.gravel(), s.w, s.d, 0, 0, .03); B.ink = true;
      B.box(wall, .9, .85, 1.25, 0, 0, -.2); B.gable(roof, 1.4, 1.15, .6, 0, .85, -.2, { ry: PI / 2 });
      const th = 2.45; B.box(wall, .5, th, .5, 0, 0, .55); B.pyr(roof, .64, .64, .9, 0, th, .55); B.sph(M.gold(), .05, 0, th + .93, .55, { seg: 6, seg2: 4 });
      B.box(M.dark(), .52, .22, .16, 0, th - .42, .55); B.box(M.dark(), .16, .22, .52, 0, th - .42, .55);
      B.box(M.dark(), .22, .4, .04, 0, 0, .8);
      for (const sx of [-1, 1]) for (const z of [0, -.5]) B.box(M.window(), .04, .3, .12, sx * .45, .35, z);
      B.cyl(wall, .34, .34, .7, 0, 0, -.8, { seg: 10 }); B.cone(roof, .4, .4, 0, .7, -.8, { seg: 10 });
    } };
  D.stall = { de: 'Pferdestall', t: [3, 9], wt: 2.5, kind: 'gross', size: (t, R) => ({ w: 2.3, d: 1.9, n: 1 + (R() < .6 ? 1 : 0) }),
    build(B, R, s, E) {
      const roof = E.tier >= 5 ? MT.slateRoof() : M.thatch(), z0 = -.55;
      B.flat(MT.yard(), 2.0, 1.45, 0, .15, .03);
      B.ink = true; B.box(M.wood(), 1.9, .75, .7, 0, 0, z0); B.gable(roof, 2.05, .98, .45, 0, .75, z0); B.ink = false;
      for (let i = 0; i < 3; i++) B.box(M.darkWood(), .34, .5, .03, (i - 1) * .58, 0, z0 + .36);
      B.fence(-1.0, z0 + .38, -1.0, .85); B.fence(1.0, z0 + .38, 1.0, .85); B.fence(-1.0, .85, -.25, .85); B.fence(.25, .85, 1.0, .85);
      for (let i = 0; i < s.n; i++) { B.push(-.4 + i * .75 + (R() - .5) * .15, 0, .28 + (R() - .5) * .15, (R() - .5) * .8 + (R() < .5 ? PI : 0)); horse(B, R); B.pop(); }
      B.cyl(M.thatch(), .2, .24, .22, .75, 0, .1, { seg: 8 }); B.box(M.wood(), .45, .14, .17, -.62, 0, .55);
    } };
  D.wein = { de: 'Weinberg', t: [4, 9], wt: 2, kind: 'mittel', size: (t, R, k) => ({ w: (2.0 + R() * .4) * k, d: 1.5 * k }),
    build(B, R, s, E) {
      B.flat(MT.soil(), s.w, s.d, 0, 0, .04);
      const rows = Math.max(3, Math.round((s.d - .3) / .34)), L = s.w - .3;
      for (let r = 0; r < rows; r++) { const z = -(s.d - .4) / 2 + r * (s.d - .4) / (rows - 1);
        B.box(MT.vine(), L, .3, .14, 0, .14, z); const np = Math.round(L / .45); for (let i = 0; i <= np; i++) B.box(M.darkWood(), .04, .52, .04, -L / 2 + i * L / np, .04, z);
        for (let i = 0; i < 3; i++) B.sph(MT.grape(), .045, (R() - .5) * L * .9, .2, z + (R() < .5 ? .08 : -.08), { seg: 5, seg2: 4, sy: 1.3 }); }
    } };
  D.garten = { de: 'Ziergarten mit Statue', t: [5, 9], wt: 2, kind: 'pracht', size: (t, R, k) => ({ w: 2.5 * k, d: 2.1 * k }),
    build(B, R, s, E) {
      const hw = s.w / 2, hd = s.d / 2, t = .2, h = .3, gap = .3;
      B.flat(M.gravel(), s.w, s.d, 0, 0, .04);
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) { B.box(MT.hedge(), hw - gap, h, t, sx * (gap + (hw - gap) / 2), .04, sz * (hd - t / 2)); B.box(MT.hedge(), t, h, hd - gap, sx * (hw - t / 2), .04, sz * (gap + (hd - gap) / 2)); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * hw * .56, z = sz * hd * .52; B.box(MT.hedge(), hw * .45, .1, hd * .45, x, .04, z);
        for (let i = 0; i < 4; i++) B.sph(i % 2 ? MT.flowerW() : MT.flowerY(), .05, x + (R() - .5) * hw * .35, .16, z + (R() - .5) * hd * .32, { seg: 5, seg2: 4 }); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * .24, z = sz * (hd - .42); B.cyl(MT.terra(), .1, .08, .12, x, .04, z, { seg: 8 }); B.cone(MT.hedge(), .12, .42, x, .16, z, { seg: 7 }); }
      const sm = E.tier >= 7 ? M.marble() : M.bronze();
      B.box(M.cap(), .42, .12, .42, 0, .04, 0); B.box(E.tier >= 7 ? M.marble() : M.cap(), .3, .42, .3, 0, .16, 0); B.box(M.cap(), .38, .06, .38, 0, .58, 0);
      B.cyl(sm, .08, .11, .5, 0, .64, 0, { seg: 8 }); B.sph(sm, .07, 0, 1.2, 0); B.beam(sm, .025, .07, 1.0, 0, .2, 1.22, .04, 4); B.box(E.tier >= 8 ? M.gold() : M.silver(), .025, .4, .025, .2, 1.2, .04);
      for (const sx of [-1, 1]) { B.box(M.wood(), .12, .05, .42, sx * (hw - .45), .22, 0); for (const sz of [-1, 1]) B.box(M.darkWood(), .1, .2, .04, sx * (hw - .45), .04, sz * .15); }
    } };
  D.fontaene = { de: 'Springbrunnen', t: [5, 9], wt: 2.5, kind: 'pracht', size: () => ({ w: 2.2, d: 2.2 }),
    build(B, R, s, E) {
      const st = E.tier >= 7 ? M.marble() : M.cap();
      B.flat(E.tier >= 7 ? M.plaza() : M.cobble(), 2.1, 2.1, 0, 0, .04, true);
      B.ink = true; B.cyl(st, .72, .78, .32, 0, .04, 0, { seg: 16 }); B.water(.64, .64, 0, .375, 0);
      B.cyl(st, .07, .1, .62, 0, .36, 0, { seg: 8 }); B.cyl(st, .3, .1, .12, 0, .86, 0, { seg: 12 }); B.water(.26, .26, 0, .99, 0);
      B.sph(E.tier >= 7 ? M.gold() : st, .07, 0, 1.06, 0); B.cone(MT.foam(), .045, .22, 0, 1.0, 0, { seg: 6 });
      if (E.tier >= 7) B.add(G.torus(.75, .03), M.gold(), 0, .36, 0);
      B.ink = false;
      B.lantern(-.62, .62, .95, .04); B.lantern(.62, -.62, .95, .04);
      for (const [x, z] of [[.66, .66], [-.66, -.66]]) { const a = Math.atan2(x, z); B.push(x, .04, z, a); B.box(M.wood(), .44, .05, .13, 0, .2, 0); for (const sx of [-1, 1]) B.box(M.darkWood(), .04, .2, .1, sx * .16, 0, 0); B.pop(); }
    } };
  D.hafen = { de: 'Bootshafen mit Steg', t: [6, 9], wt: 2.5, kind: 'pracht', size: () => ({ w: 2.4, d: 1.9 }),
    build(B, R, s, E) {
      const w = s.w, d = s.d, qw = .2, st = E.stone;
      B.flat(M.cobble(), w + .3, d + .3, 0, 0, .03); B.water(w - .3, d - .3, 0, .05, 0, true);
      B.box(st, w, .16, qw, 0, 0, -d / 2 + qw / 2); B.box(st, w, .16, qw, 0, 0, d / 2 - qw / 2); for (const sx of [-1, 1]) B.box(st, qw, .16, d - 2 * qw, sx * (w / 2 - qw / 2), 0, 0);
      B.ink = false; const px = -.45, pl = d * .55, pz = d / 2 - qw - pl / 2;
      B.box(M.wood(), .4, .05, pl, px, .12, pz); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.cyl(M.darkWood(), .035, .035, .2, px + sx * .18, 0, pz + sz * (pl / 2 - .05), { seg: 5 });
      for (const x of [.3, .8]) B.cyl(M.iron(), .045, .05, .12, x, .16, d / 2 - qw / 2, { seg: 6 });
      B.lantern(px + .14, pz - pl / 2 + .08, .8, .17);
      B.box(M.wood(), .28, .28, .28, w / 2 - .2, .16, d / 2 - .2, { ry: .3 }); barrel(B, -w / 2 + .2, .16, d / 2 - .2);
      const bs = E.sub(B, .35, 0, -.12, (R() - .5) * .5), BB = new Batch(bs); BB.ink = true;
      BB.add(G.hull(), M.wood(), 0, 0, 0); BB.box(M.darkWood(), .55, .03, .26, 0, .17, 0); BB.beam(M.darkWood(), .02, 0, .15, 0, 0, 1.0, 0, 5); BB.add(G.rod(.035, 6), MT.canvas(), 0, .45, 0, { rz: PI / 2, sy: .6 });
      BB.flush(); const y0 = bs.position.y, ph = R() * 6; K.tick((t) => { bs.position.y = y0 + Math.sin(t * 1.3 + ph) * .012; bs.rotation.z = Math.sin(t * 1.1 + ph) * .04; });
    } };
  D.dorf = { de: 'Außendorf', t: [5, 9], wt: 3, kind: 'pracht', lm: 'auch', lmk: .8, size: (t, R, k, st, lm) => ({ w: 3.3, d: 2.1, n: 2 + (R() < .55 ? 1 : 0) + (t >= 7 && R() < .5 ? 1 : 0), lm }),
    build(B, R, s, E) {                                                                    // as the landmark it gets a tall house in the middle (tower house, campanile, wind tower, small pagoda)
      const st = E.sty, wall = st === 'nordisch' ? M.darkWood() : st === 'suedlich' ? MT.white() : st === 'morgenland' ? MT.adobe() : E.tier >= 8 && st === 'klassisch' ? E.stone : MT.plaster();
      const timber = st === 'fernost' || (st === 'klassisch' && E.tier < 8);
      const back = (s.lm ? [[-1.15, -.45], [1.15, -.5]] : [[-1.15, -.45], [0, -.28], [1.15, -.5]]).sort(() => R() - .5), slots = [];
      for (let i = 0; i < Math.min(back.length, s.n); i++) slots.push([back[i][0], back[i][1], (R() - .5) * .16]);
      if (s.n >= 4) slots.push([-1.2, .6, PI / 2 + (R() - .5) * .16]);
      B.flat(E.path, 1.6, .6, 0, .35, .03, true);
      if (s.lm) { B.push(0, 0, -.4, (R() - .5) * .2); villageTower(B, R, E); B.pop(); B.ink = false; }
      slots.forEach(([x, z, ry], i) => { B.push(x, 0, z, ry); house(B, R, E, wall, timber, i === 0); B.pop(); });
      const wx = s.n >= 4 ? .8 : (R() < .5 ? .8 : -.8), gx = -wx * .95;
      if (s.n < 4) { B.flat(MT.soil(), .8, .5, gx, .72, .04); for (let i = 0; i < 3; i++) B.box(i % 2 ? MT.cabbage() : MT.crop(), .7, .1, .1, gx, .04, .57 + i * .15); }
      if (R() < .5) { B.cyl(E.stone, .2, .22, .3, wx, 0, .6, { seg: 10 }); B.water(.16, .16, wx, .315, .6); B.pyr(E.roof, .5, .5, .25, wx, .75, .6); for (const sx of [-1, 1]) B.box(M.darkWood(), .04, .5, .04, wx + sx * .2, .25, .6); }
      else { B.cyl(M.darkWood(), .05, .07, .45, wx, 0, .6, { seg: 5 }); B.ico(MT.leaf(), .34, wx, .72, .6, { det: 1, sy: .85 }); }
    } };


  // ---------- items of the other cultures (c.style) ----------
  // Nordisch: a stave church with stacked steep roofs (landmark), a longhouse, a ring of standing stones
  D.stabkirche = { de: 'Stabkirche', t: [1, 9], wt: 2.5, kind: 'gross', lm: true, size: () => ({ w: 1.5, d: 1.9 }),
    build(B, R, s, E) {
      const wd = M.darkWood(), rf = MT.shingleDk();
      B.flat(M.gravel(), 1.45, 1.85, 0, 0, .03); B.ink = true;
      B.box(wd, .84, .62, 1.2, 0, 0, -.12); B.gable(rf, 1.34, 1.08, .78, 0, .62, -.12, { ry: PI / 2 });
      for (const z of [-.12 - .67, -.12 + .67]) for (const k of [-1, 1]) B.beam(wd, .025, k * .3, .62 + .35, z, -k * .1, .62 + .98, z, 4);    // crossed boards at both gables
      B.box(wd, .44, .5, .3, 0, 0, .62); B.gable(rf, .5, .6, .36, 0, .5, .62, { ry: PI / 2 });                                                // porch
      B.box(wd, .46, .8, .46, 0, 1.0, -.12); B.pyr(rf, 1.0, 1.0, .3, 0, 1.3, -.12); B.pyr(rf, .72, .72, .26, 0, 1.8, -.12);                    // tower through the ridge, two skirts, spire
      B.box(wd, .34, .45, .34, 0, 1.9, -.12); B.pyr(rf, .48, .48, 1.25, 0, 2.33, -.12); B.cone(M.iron(), .03, .25, 0, 3.55, -.12, { seg: 5 });
      B.box(M.dark(), .18, .32, .03, 0, 0, .78); for (const sx of [-1, 1]) B.box(M.window(), .03, .16, .1, sx * .425, .3, -.2);
    } };
  D.langhaus = { de: 'Langhaus', t: [0, 9], wt: 2.5, kind: 'mittel', size: () => ({ w: 2.4, d: 1.3 }),
    build(B, R, s, E) {
      B.flat(MT.yard(), 2.3, 1.2, 0, 0, .03, true); B.ink = true;
      B.box(M.darkWood(), 1.9, .46, .78, 0, 0, -.1); B.gable(E.tier >= 3 ? MT.shingleDk() : M.thatch(), 2.08, 1.0, .78, 0, .46, -.1);
      for (const x of [-1.04, 1.04]) xBoards(B, x, .46, 1.0, .78);
      B.box(M.dark(), .2, .34, .03, .3, 0, .3); B.ink = false;
      for (let i = 0; i < 3; i++) B.log(M.wood(), .08, .55, -.55, .08 + (i === 2 ? .14 : 0), .45 + (i === 2 ? 0 : (i - .5) * .17));
      barrel(B, .8, 0, .42); E.smoke(B, .2, 1.26, -.1, { size: .2, rise: 2, alpha: .26 });
    } };
  D.runen = { de: 'Steinkreis mit Runensteinen', t: [0, 9], wt: 2, kind: 'klein', size: () => ({ w: 1.6, d: 1.6 }),
    build(B, R, s, E) {
      B.flat(MT.meadow(), 1.55, 1.55, 0, 0, .03, true);
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + R() * .2, h = .34 + R() * .22; B.box(i % 2 ? M.darkStone() : M.field(), .17, h, .1, Math.cos(a) * .6, 0, Math.sin(a) * .6, { ry: -a + PI / 2, rz: (R() - .5) * .12 }); }
      B.ink = true; B.box(M.darkStone(), .26, .82, .14, 0, 0, 0, { ry: R() }); B.ink = false;
    } };
  // Südlich: a whitewashed chapel with a campanile (landmark), an olive grove
  D.glockenturm = { de: 'Kapelle mit Glockenturm', t: [1, 9], wt: 2.5, kind: 'gross', lm: true, size: () => ({ w: 1.8, d: 1.5 }),
    build(B, R, s, E) {
      const wh = MT.white(), tr = M.sand(), H = 2.6;
      B.flat(E.tier >= 5 ? M.cobble() : M.gravel(), 1.75, 1.45, 0, 0, .03, true); B.ink = true;
      B.box(wh, 1.0, .62, .7, -.32, 0, -.12); B.gable(MT.clay(), 1.1, .84, .3, -.32, .62, -.12); B.box(M.dark(), .2, .34, .03, -.32, 0, .235);
      B.box(wh, .5, H, .5, .5, 0, -.1); B.box(tr, .54, .06, .54, .5, H * .55, -.1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(wh, .09, .42, .09, .5 + sx * .205, H, -.1 + sz * .205);
      B.cyl(M.bronze(), .07, .1, .16, .5, H + .1, -.1, { seg: 8 }); B.box(tr, .56, .07, .56, .5, H + .42, -.1); B.pyr(MT.clay(), .6, .6, .26, .5, H + .49, -.1);
      B.box(M.iron(), .025, .22, .025, .5, H + .72, -.1); B.box(M.iron(), .12, .025, .025, .5, H + .86, -.1);
      for (const y of [.8, 1.6]) B.box(M.dark(), .1, .22, .03, .5, y, .155);
      B.ink = false; B.cyl(M.darkWood(), .04, .05, .2, -.78, 0, .45, { seg: 5 }); B.cone(MT.hedge(), .17, 1.25, -.78, .15, .45, { seg: 7 });
    } };
  D.oliven = { de: 'Olivenhain', t: [0, 9], wt: 3, kind: 'mittel', size: (t, R, k) => { const cols = t >= 5 && k === 1 ? 4 : 3; return { w: cols * .74 + .1, d: 1.55, cols }; },
    build(B, R, s, E) {
      B.flat(MT.sand(), s.w, s.d, 0, 0, .03);
      B.box(E.stone, s.w, .2, .16, 0, 0, -s.d / 2 + .08);
      for (let i = 0; i < s.cols; i++) for (let j = 0; j < 2; j++) { const x = (i - (s.cols - 1) / 2) * .74 + (R() - .5) * .1, z = (j - .5) * .7 + .08 + (R() - .5) * .1, lean = (R() - .5) * .3;
        B.beam(M.darkWood(), .05, x, 0, z, x + lean, .42, z + (R() - .5) * .1, 5);
        B.ico(MT.olive(), .27, x + lean, .56, z, { det: 1, sy: .62, sx: 1.2, ry: R() * 3 }); B.ico(MT.olive(), .18, x + lean + (R() - .5) * .3, .7, z + (R() - .5) * .2, { det: 0, sy: .7 }); }
    } };
  // Morgenland: a palm grove round a small spring (landmark), a wind-catcher tower on a flat-roofed house (landmark)
  function palm(B, R, x, z, h) {
    const lx = (R() - .5) * .2, lz = (R() - .5) * .2, tx = x + lx, tz = z + lz;
    B.beam(MT.bark(), .07, x, 0, z, x + lx * .4, h * .5, z + lz * .4, 6); B.beam(MT.bark(), .055, x + lx * .4, h * .5, z + lz * .4, tx, h, tz, 6);
    const a0 = R() * 6; for (let k = 0; k < 8; k++) B.add(G.leaf(), MT.palm(), tx, h, tz, { ry: a0 + k * PI / 4 + (R() - .5) * .3, sx: .62, sz: .85 });
    B.sph(MT.bay(), .09, tx, h - .12, tz, { seg: 6, seg2: 4 });
  }
  D.palmen = { de: 'Palmenhain mit Quelle', t: [0, 9], wt: 3, kind: 'gross', lm: true, lmk: .85, size: () => ({ w: 2.3, d: 1.9 }),
    build(B, R, s, E) {
      B.flat(MT.sand(), 2.1, 1.75, 0, 0, .03, true); B.water(.36, .3, .4, .05, .45);
      for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; B.rock(M.field(), .07 + R() * .04, .4 + Math.cos(a) * .4, .45 + Math.sin(a) * .34); }
      B.ink = true; const pts = [[-.4, -.18, 3.4], [.25, -.25, 2.9], [-.05, .25, 2.45]]; if (R() < .6) pts.push([.58, -.02, 2.0]);
      for (const [x, z, h] of pts) palm(B, R, x, z, h * (.92 + R() * .12));
      B.ink = false; B.ico(MT.leaf2(), .16, -.62, .1, .5); B.ico(MT.leaf(), .13, .75, .1, -.55);
    } };
  D.windturm = { de: 'Windturm-Haus', t: [1, 9], wt: 2.5, kind: 'gross', lm: true, size: () => ({ w: 1.75, d: 1.5 }),
    build(B, R, s, E) {
      const ad = MT.adobe(), H = 2.95;
      B.flat(MT.sand(), 1.7, 1.45, 0, 0, .03, true); B.ink = true;
      B.box(ad, 1.0, .72, .8, -.3, 0, .05); B.box(ad, 1.05, .08, .85, -.3, .72, .05); B.sph(M.cap(), .26, -.45, .8, .05, { half: true, seg: 10, seg2: 4 });
      B.box(M.dark(), .2, .36, .03, -.3, 0, .455);
      B.box(ad, .52, H, .52, .5, 0, -.2); B.box(ad, .6, .1, .6, .5, H, -.2);
      for (const [dx, dz, ry] of [[0, .265, 0], [.265, 0, PI / 2], [0, -.265, 0], [-.265, 0, PI / 2]]) for (const k of [-1, 1]) B.box(M.dark(), .07, .5, .02, .5 + dx + (ry ? 0 : k * .12), H - .62, -.2 + dz + (ry ? k * .12 : 0), { ry });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.cone(ad, .06, .2, .5 + sx * .24, H + .1, -.2 + sz * .24, { seg: 4 });
      B.ink = false; B.box(MT.ochre(), .5, .03, .32, -.3, .5, .6, { rx: .3 });
    } };
  // Fernost: a pagoda (landmark), a bell pavilion (landmark), rice terraces
  D.pagode = { de: 'Pagode', t: [1, 9], wt: 3, kind: 'gross', lm: true, size: () => ({ w: 1.6, d: 1.6 }),
    build(B, R, s, E) {
      B.flat(M.gravel(), 1.55, 1.55, 0, 0, .03); B.ink = true;
      B.box(E.stone, 1.1, .12, 1.1, 0, 0, 0); pagoda(B, E, E.tier >= 5 ? 5 : 4, E.tier >= 5 ? .88 : .84, .12, MT.tileDk());
    } };
  D.glocke = { de: 'Glockenpavillon', t: [1, 9], wt: 2, kind: 'gross', lm: true, size: () => ({ w: 1.75, d: 1.75 }),
    build(B, R, s, E) {
      const rm = MT.tileDk(), y0 = .95;
      B.flat(M.gravel(), 1.55, 1.55, 0, 0, .03); B.ink = true;
      B.box(E.stone, 1.05, y0, 1.05, 0, 0, 0); B.box(E.stone, .4, y0 * .5, .3, 0, 0, .66); B.box(E.stone, .4, y0 * .25, .3, 0, 0, .8);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(M.darkWood(), .08, 1.1, .08, sx * .38, y0, sz * .38);
      B.box(M.darkWood(), .9, .08, .9, 0, y0 + 1.02, 0);
      B.cyl(M.bronze(), .17, .22, .44, 0, y0 + .45, 0, { seg: 10 }); B.beam(M.darkWood(), .02, 0, y0 + .89, 0, 0, y0 + 1.02, 0, 4);
      B.pyr(rm, 1.62, 1.62, .2, 0, y0 + 1.1, 0); B.gable(rm, 1.05, .82, .5, 0, y0 + 1.2, 0); B.cyl(M.bronze(), .03, .03, .1, 0, y0 + 1.68, 0, { seg: 5 });
    } };
  D.reis = { de: 'Reisterrassen', t: [0, 9], wt: 6, kind: 'feld', size: (t, R, k) => ({ w: Math.min(3.2, 1.8 + t * .14 + R() * .4) * k, d: Math.min(1.8, 1.3 + t * .04 + R() * .2) * k, steps: t >= 3 ? 3 : 2 }),
    build(B, R, s, E) {
      const n = s.steps, dd = s.d / n;
      for (let i = 0; i < n; i++) { const z = -s.d / 2 + dd * (i + .5), h = .05 + (n - 1 - i) * .11, w = s.w - i * .12;
        B.box(MT.dike(), w, h, dd, 0, 0, z, { flat: true }); B.water(w - .14, dd - .12, 0, h + .012, z, true);
        const rows = Math.max(2, Math.round((dd - .16) / .16)); for (let r = 0; r < rows; r++) B.box(MT.shoot(), w - .3, .07, .045, 0, h, z - (dd - .2) / 2 + r * (dd - .2) / Math.max(1, rows - 1), { flat: true }); }
      if (R() < .6) { const x = s.w / 2 - .35, z = s.d / 2 - .25; B.cone(M.thatch(), .16, .1, x, .38, z, { seg: 8 }); B.box(MT.ochre(), .12, .3, .08, x, .06, z); }
    } };

  // ---------- which items belong to which culture: only = just these, not = never these; land = what the base farms ----------
  const CULT = {
    acker: { land: true, not: ['fernost'] }, acker2: { not: ['fernost'] }, reis: { land: true, only: ['fernost'] },
    wein: { land: true, not: ['nordisch', 'fernost'], st: { suedlich: [1, 9] } }, oliven: { land: true, only: ['suedlich'] },
    weide: { land: true }, obst: { land: true },
    markt: { not: ['morgenland'] }, basar: { only: ['morgenland'] }, heu: { not: ['morgenland'] }, meiler: { not: ['morgenland'] },
    langhaus: { only: ['nordisch'] }, runen: { only: ['nordisch'] }, uebung: { not: ['fernost'] },
    // landmarks (exactly one per base, the tallest thing outside the walls)
    muehle: { only: ['klassisch', 'nordisch', 'suedlich'] }, kapelle: { only: ['klassisch'] }, stabkirche: { only: ['nordisch'] }, glockenturm: { only: ['suedlich'] },
    palmen: { only: ['morgenland'] }, windturm: { only: ['morgenland'] }, pagode: { only: ['fernost'] }, glocke: { only: ['fernost'] }
  };
  const BOOST = { suedlich: { wein: 2, oliven: 1.2 }, nordisch: { langhaus: 1.6, runen: 1.5 }, fernost: { reis: 1.2, teich: 1.6 }, morgenland: { basar: 1.4, obst: .7 } };
  const allowed = (k, tier, sty) => { const C = CULT[k] || NO, r = (C.st && C.st[sty]) || D[k].t;
    return tier >= r[0] && tier <= r[1] && (!C.only || C.only.includes(sty)) && !(C.not && C.not.includes(sty)); };

  // ---------- where the island is: shore line and the stage's own shore dressing (so nothing grows into a tree) ----------
  const WOB = (() => { const r = K.rng(11), w = []; for (let i = 0; i < 6; i++) w.push([r() * 6.28, .35 + r() * .5, 2 + (i % 3)]); return w; })();
  const shoreAt = (R0, th) => { let r = R0; for (const [ph, amp, f] of WOB) r += Math.sin(-th * f + ph) * amp; return r; };
  const dressCache = {};
  // a copy of stage.js buildIsland's shore dressing: the same seed-5 sequence, and the same river / clear skips BEFORE the kind and size draws,
  // so the list stays in step with the stage. r = the visible radius (rock, bush, tree crown), tree = true for the tall ones
  function dressing(R0, keep, meta = NO) {
    const key = R0 + '/' + keep + '/' + (meta.river || 0), cache = !meta.clear; if (cache && dressCache[key]) return dressCache[key];
    const r = K.rng(5), out = [];
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = keep + 1 + r() * (R0 - keep - 1.6), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (meta.river && Math.abs(z) < meta.river + 1.2) continue; if (meta.clear && meta.clear(x, z)) continue;
      const k = r(), s = r(); out.push(k < .35 ? { x, z, r: .35 + s * .5 } : k < .75 ? { x, z, r: .35 + s * .35 } : { x, z, r: (.8 + s * .5) * .9, tree: true }); }
    if (cache) dressCache[key] = out; return out;
  }
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- choosing: one tall landmark (by the seed, from the culture's list) and 2–5 other items, grander with the tier ----------
  const LANDMARKS = { klassisch: ['muehle', 'kapelle', 'wachturm'], nordisch: ['stabkirche', 'wachturm', 'muehle'], suedlich: ['glockenturm', 'muehle', 'wachturm'],
    morgenland: ['palmen', 'windturm', 'wachturm'], fernost: ['pagode', 'glocke', 'wachturm'] };
  function choose(tier, R, sty) {
    const want = Math.min(5, [2, 2, 3, 3, 3, 4, 4, 4, 5, 5][tier] + (tier > 0 && tier < 8 && R() < .35 ? 1 : 0)) - (tier >= 3 ? 1 : 0);
    const ok = (k) => allowed(k, tier, sty), lmList = LANDMARKS[sty].filter(ok); if (tier >= 5 && ok('dorf')) lmList.push('dorf');
    const lms = []; while (lmList.length) lms.push(lmList.splice(Math.floor(R() * lmList.length), 1)[0]);   // seeded order: the first one that fits wins
    const pool = Object.keys(D).filter(k => ok(k) && D[k].lm !== true && k !== lms[0]), out = [], B0 = BOOST[sty] || NO;
    const wt = (k) => D[k].wt * (B0[k] || 1) * (D[k].kind === 'klein' && tier >= 5 ? .35 : 1) * (D[k].kind === 'pracht' && tier >= 8 ? 1.2 : 1) * (k === 'acker' ? .5 : 1);
    const pick = (keys) => { keys = keys.filter(k => !out.includes(k)); if (!keys.length) return null; let sum = 0; for (const k of keys) sum += wt(k);
      let x = R() * sum; for (const k of keys) { x -= wt(k); if (x <= 0) return k; } return keys[keys.length - 1]; };
    const kind = (...ks) => pool.filter(k => ks.includes(D[k].kind)), add = (k) => { if (k) out.push(k); };
    const land = pool.filter(k => (CULT[k] || NO).land);
    add(tier === 0 && R() >= .75 ? null : pick(land));                  // every base farms something in its culture: quiet flat colour
    if (tier === 0) add(pick(kind('klein')));
    else if (tier === 1) add(pick(kind('mittel')));
    else if (tier <= 4) add(pick(kind('gross')));
    else { add(pick(kind('pracht'))); if (tier >= 8) add(pick(kind('pracht'))); add(pick(kind('gross'))); }
    for (let i = 0; i < 12 && out.length < want + 4; i++) add(pick(pool));
    return { list: out, want, lms };
  }

  // ---------- build ----------
  function build(g, c, info = {}) {
    if (!g || !c || !c.seed || c.capital) return null;
    const tier = Math.max(0, Math.min(9, info.tier != null ? info.tier : OW.tierOf(c.level || 1)));
    const ud = g.userData || {}, sty = LANDMARKS[ud.style] ? ud.style : LANDMARKS[c.style] ? c.style : 'klassisch';
    const meta = OW.models.basis && OW.models.basis.meta ? OW.models.basis.meta(c) : {};
    const plotR = Math.max(meta.plotR || 0, info.plotR || 0, (ud.radius || 0) + .15);
    const islandR = meta.islandR || 13, keep = meta.plotR || 8.2;                                      // exactly as stage.js buildIsland
    const R = K.rng(c.seed * 131 + 7), SC = 1.2 + tier * .07, LS = Math.min(2.3, SC * (tier ? 1.35 : 1));   // items grow with the tier, the landmark more
    // the per-base turn and mirror (variety.js applies them after us): local ↔ world, for the island and the map frame
    const rot = (c.seed % 4) * PI / 2, mir = ((c.seed >> 2) % 2) ? -1 : 1, cr = Math.cos(rot), sr = Math.sin(rot);
    const toW = (x, z) => [cr * mir * x + sr * z, -sr * mir * x + cr * z], toL = (wx, wz) => [(cr * wx - sr * wz) * mir, sr * wx + cr * wz];
    const fh = FRAME[tier] * 1.18 - .3;
    const okPt = (x, z) => { const [wx, wz] = toW(x, z);
      if (meta.river && Math.abs(wz) < meta.river + .6) return false; if (meta.clear && meta.clear(wx, wz)) return false;
      return Math.hypot(wx, wz) <= shoreAt(islandR, Math.atan2(wz, wx)) - 1.15 && Math.abs(.7071 * (wx - wz)) <= fh; };
    const obst = dressing(islandR, keep, meta).map(o => { const [x, z] = toL(o.x, o.z); return { x, z, r: o.r, tree: o.tree }; }).filter(o => Math.hypot(o.x, o.z) < plotR + 6);
    if (c.shore) { const [x, z] = toL(islandR + 1.3, 2.5); obst.push({ x, z, r: 2.6, hard: true }); }
    // the culture's own props (styles.js runs before us and lists them in model space): hard obstacles
    const crown = sty === 'morgenland' ? 1.1 * (1 + tier * .07) : 0;                                    // styles.js lists a palm by its trunk; its crown reaches ~1.3 m further
    if (Array.isArray(ud.styleProps)) for (const q of ud.styleProps) if (q && isFinite(q.x) && isFinite(q.z)) obst.push({ x: q.x, z: q.z, r: q.r || .6, hard: true, prop: true });
    // and anything else of the model that stands outside the plot (a culture prop, a cart at the gate): its real bounds, crowns included
    g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), bx = new T.Box3();
    for (const o of g.children) { if (!(o.isMesh || o.isGroup) || o.name === 'umland' || Math.hypot(o.position.x, o.position.z) < plotR - .3) continue;
      bx.setFromObject(o).applyMatrix4(inv); if (bx.isEmpty()) continue;
      obst.push({ x: (bx.min.x + bx.max.x) / 2, z: (bx.min.z + bx.max.z) / 2, r: Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) / 2, hard: true }); }
    const front = PI / 2, free = 1.0 / (plotR + 1.5) + .12;
    const placed = [];
    const fits = (it) => {
      const { th, r, phi, w, d } = it, cp = Math.cos(phi), sp = Math.sin(phi), low = D[it.key].kind === 'feld' && !it.s.scare;   // (a scarecrow is tall)
      if (Math.abs(wrap(th - front)) - it.hs < free) return false;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const lx = sx * w / 2, lz = sz * d / 2; if (!okPt(it.x + cp * lx + sp * lz, it.z - sp * lx + cp * lz)) return false; }
      for (const o of obst) { const dx = o.x - it.x, dz = o.z - it.z, lx = cp * dx - sp * dz, lz = sp * dx + cp * dz;     // flat fields may reach under a crown; tall ones keep off the palm crowns too
        const m = o.hard ? o.r + .3 + (it.lm && o.prop ? crown : 0) : o.tree ? (low ? o.r * .6 : o.r + (it.lm ? .15 : .05)) : o.r + .05;
        if (Math.abs(lx) < w / 2 + m && Math.abs(lz) < d / 2 + m) return false; }
      for (const p of placed) if (Math.abs(wrap(th - p.th)) < it.hs + p.hs + .05 && Math.abs(r - p.r) < (it.dr + p.dr) / 2 + .2) return false;
      return true;
    };
    const side = R() < .5 ? -1 : 1;                                                                    // which flank of the map sprite the landmark prefers
    const tryPlace = (key, k, lm) => {
      const Dk = D[key], s = Dk.size(tier, R, k, sty, lm), f = (lm ? LS * (Dk.lmk || 1) : SC) * (k < 1 && Dk.kind !== 'feld' ? k : 1), w = s.w * f, d = s.d * f, round = s.w === s.d;
      let best = null, bs = -1;
      for (let n = 0, N = lm ? 160 : 56; n < N; n++) {
        const turn = !round && (d > 3.1 || R() < .25), dr = turn ? w : d, wt = turn ? d : w;             // long items may lie along the ring
        const rlo = plotR + .8 + dr / 2, rhi = Math.max(rlo, plotR + 4.4 - dr / 2);
        const th = front + free + R() * (PI * 2 - 2 * free), r = rlo + R() * (rhi - rlo);
        const phi = Math.atan2(-Math.cos(th), -Math.sin(th)) + (round ? R() * 6.28 : turn ? (R() < .5 ? 1 : -1) * PI / 2 + (R() - .5) * .1 : (R() - .5) * .16);
        const it = { key, s, w, d, dr, wt, th, r, phi, lm: !!lm, sc: f, x: Math.cos(th) * r, z: Math.sin(th) * r, hs: Math.atan2(wt / 2 + .1, r - dr / 2) };
        if (!fits(it)) continue;
        const [wx, wz] = toW(it.x, it.z), sx = .7071 * (wx - wz);
        let sc;
        if (lm) sc = 3 * Math.min(1, Math.abs(sx) / (.72 * fh)) + (sx * side > 0 ? .9 : 0) + R() * .25 - (r - rlo) * .05;   // strong wish: the sprite's left or right edge, so the outline changes
        else { sc = R() * .5 - (turn ? .25 : 0) - (r - rlo) * .08 + .35 * Math.abs(sx) / r;                             // mild wish: the sprite's sides, not below the base
          let m = 9; for (const p of placed) m = Math.min(m, Math.abs(wrap(th - p.th))); if (placed.length) sc += m; }
        if (sc > bs) { bs = sc; best = it; it.flank = Math.abs(sx) / fh; }
      }
      if (best) best.score = bs; return best;
    };
    const { list, want, lms } = choose(tier, R, sty);
    // the landmark: the seed's first choice if it reaches a flank of the sprite (full size or a bit smaller), else the next one; failing that, the best spot found
    let lmIt = null, fb = null;
    for (const key of lms) { let b = null; for (const k of [1, .85, .72]) { const it = tryPlace(key, k, true); if (it && (!b || it.score - (1 - k) * 2 > b.score - (1 - b.k) * 2)) { b = it; b.k = k; } }
      if (b && b.flank >= .6) { lmIt = b; break; } if (b && (!fb || b.flank > fb.flank)) fb = b; }
    lmIt = lmIt || fb; if (lmIt) placed.push(lmIt);
    const prim = list.slice(0, want), rest = list.slice(want), area = (k) => { const s = D[k].size(tier, K.rng(1), 1, sty); return s.w * s.d; };
    prim.sort((a, b) => area(b) - area(a));
    for (const key of prim.concat(rest)) {
      if (placed.length - (lmIt ? 1 : 0) >= want) break; if (lmIt && key === lmIt.key) continue;
      const it = tryPlace(key, 1) || tryPlace(key, .8);
      if (it) placed.push(it);
    }

    // ---- build the items ----
    const U = new T.Group(); U.name = 'umland'; U.userData.umland = true; g.add(U); OW.umland.last = U;   // for tools (review / inspect)
    const B = new Batch(U), roofKey = c.owner || 'neutral';
    const E = {
      tier, c, U, sty, stone: M[STONE[tier]](), roof: M.roof(roofKey), lm: false,
      crest: c.owner && c.owner !== 'neutral' ? (c.crest && OW.crestCloth ? OW.crestCloth(c.owner, c.crest) : M.cloth(c.owner)) : null,
      fruit: R() < .5 ? MT.fruit() : MT.fruit2(), path: tier >= 5 ? M.cobble() : tier >= 3 ? M.gravel() : M.dirt(), nSmoke: 0,
      sub(Bt, x, y, z, ry = 0) { const s = new T.Group(); s.position.copy(Bt.pt(x, y, z)); s.rotation.y = Bt.ry + ry; s.scale.setScalar(Bt.sc); U.add(s); return s; },
      smoke(Bt, x, y, z, o) { if (E.nSmoke >= 2) return; E.nSmoke++; const p = Bt.pt(x, y, z);
        K.smoke(U, p.x, p.y, p.z, Object.assign({ n: 6, size: .3, rise: 2.4, life: 3.4, alpha: .32, spread: .3, drift: .5, color: 0xcfc9bf }, o)); }
    };
    for (const it of placed) { B.set(it.x, it.z, it.phi, it.sc); B.ink = E.lm = it.lm; D[it.key].build(B, R, it.s, E); }   // the landmark keeps its ink outline all over
    B.ink = false;

    // ---- paths: a road out of the gate, a ring track along the plot, a spur to every item ----
    B.set(0, 0, 0); B.ink = false;
    const S = new Strip(), ph = R() * 6, pr = plotR + .45, stone = tier >= 5, pw = (stone ? .55 : .45) * (1 + tier * .03);
    const clearAt = (x, z, rr) => obst.every(o => Math.hypot(o.x - x, o.z - z) >= o.r + rr + (o.hard ? .15 : 0)) && okPt(x, z);   // lanterns and the signpost keep off trees, rocks and props
    let zEnd = plotR + 3.6; while (zEnd > plotR + .9 && !okPt(0, zEnd + .3)) zEnd -= .25;
    const road = []; for (let z = plotR - .7; z < zEnd; z += .35) road.push([Math.sin(z * .8 + ph) * .12, z]); road.push([Math.sin(zEnd * .8 + ph) * .12, zEnd]);
    S.line(road, (stone ? .9 : .75) * (1 + tier * .03), stone ? .05 : .3, R);
    if (placed.length) {
      let lo = 0, hi = 0; for (const p of placed) { const dl = wrap(p.th - front); lo = Math.min(lo, dl); hi = Math.max(hi, dl); }
      const arc = []; for (let a = lo; a < hi; a += .09) arc.push(a); arc.push(hi);
      S.line(arc.map(a => { const rr = pr + Math.sin(a * 5 + ph) * .05; return [Math.cos(front + a) * rr, Math.sin(front + a) * rr]; }), pw, stone ? .05 : .3, R);
      for (const p of placed) {
        const fx = Math.cos(p.th) * (p.r - p.dr / 2 + .05), fz = Math.sin(p.th) * (p.r - p.dr / 2 + .05), sx = Math.cos(p.th) * (pr + .1), sz = Math.sin(p.th) * (pr + .1);
        if (Math.hypot(fx - sx, fz - sz) > .15) S.line([[sx, sz], [(sx + fx) / 2, (sz + fz) / 2], [fx, fz]], pw * .85, stone ? .05 : .3, R);
      }
      // lanterns along the stone roads (high tiers): beside the gate road and in the gaps of the ring track
      if (tier >= 5) {
        let n = 0; for (let z = plotR + .55; z < zEnd - .2 && n < 6; z += 1.5) for (const sx of [-1, 1]) { const x = sx * .72 + Math.sin(z * .8 + ph) * .12; if (clearAt(x, z, .25)) { B.lantern(x, z, 1.0); n++; } }
        const hsL = .35 / (pr + .5);
        for (let a = lo + .5; a < hi - .2 && n < 10; a += 2.2 / pr) { const th = front + a, lr = pr + .55;
          if (Math.abs(a) < free + .1) continue;
          if (placed.some(p => Math.abs(wrap(th - p.th)) < p.hs + hsL && lr > p.r - p.dr / 2 - .3)) continue;
          if (!clearAt(Math.cos(th) * lr, Math.sin(th) * lr, .25)) continue;
          B.lantern(Math.cos(th) * lr, Math.sin(th) * lr, 1.0); n++; }
      }
    }
    if (tier < 5 && zEnd > plotR + 1.4 && clearAt(.62, zEnd - .25, .3)) {   // a signpost where the road leaves
      const x = .62, z = zEnd - .25; B.cyl(M.darkWood(), .035, .04, .95, x, 0, z, { seg: 5 });
      B.box(M.rawWood(), .42, .1, .03, x + .12, .75, z, { ry: .3 }); B.box(M.rawWood(), .38, .1, .03, x - .1, .6, z, { ry: -.5 });
    }
    let meshes = B.flush(); meshes += S.mesh(U, E.path);
    const res = placed.map(p => ({ key: p.key, de: D[p.key].de }));
    g.userData.umland = res.map(r => r.key); g.userData.landmark = lmIt ? lmIt.key : null; U.userData.meshes = meshes; U.userData.style = sty;
    U.userData.items = placed.map(p => ({ key: p.key, x: p.x, z: p.z, r: Math.max(p.w, p.d) / 2, w: p.w, d: p.d, phi: p.phi, lm: p.lm }));
    U.userData.obstacles = obst;
    return res;
  }

  OW.umland = {
    build,
    ITEMS: Object.fromEntries(Object.keys(D).map(k => [k, { de: D[k].de, stufen: [D[k].t[0] * 10 || 1, Math.min(100, D[k].t[1] * 10 + 9)], art: D[k].kind, wahrzeichen: !!D[k].lm,
      stile: Object.keys(LANDMARKS).filter(st => { const C = CULT[k] || NO; return (!C.only || C.only.includes(st)) && !(C.not && C.not.includes(st)); }) }])),
    LANDMARKS, dressing,
    EXTRA: { wege: 'Feldweg / Kiesweg / Steinstraße (je nach Stufe)', laternen: 'Steinstraße mit Laternen (ab Stufe 50)', wegweiser: 'Wegweiser am Ende der Straße (bis Stufe 49)' }
  };
})();
