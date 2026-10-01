// ===== baukunst.js – die Basen in 3D (Entwurf "Open Water Baukunst") =====
// Geladen nach three.js und vor botlogik.js. Hier stehen nur die Bausätze und Modelle (Basis in 10 Stufen, Tempel,
// Wächter-Tempel, Thron, Tor, fünf Baustile, Umland, Wappen, Skins); nichts läuft beim Laden schon los.
// Das Spiel ruft OW.game.get(...) auf: jedes Modell wird EINMAL (beim ersten Bedarf, in Leerlauf-Häppchen) mit einer
// Orthokamera im Blickwinkel der Karte zu einem Bild gerendert und im Speicher gehalten (begrenzt). Ohne three.js (offline)
// oder ohne WebGL bleibt OW.game aus und die Karte malt ihre alten Sprites.
if (typeof THREE !== 'undefined') try {
// ===== Open Water Baukunst · kit: materials, procedural textures, building parts, animation =====
// Units: 1 = about one metre. y is up, a base stands on its plot around the origin.
(function () {
  const T = THREE;
  const OW = window.OW = window.OW || {};
  OW.models = OW.models || {};

  // One colour table for the whole set. Owner lives on cloth and roofs only; tier lives in stone, wood and the silhouette.
  const C = OW.COL = {
    player: 0x3f86d8, bot: 0xc9423a, neutral: 0x77736b, capital: 0xd9a93f,
    coin: 0xe3b65a, gem: 0x6ccbee, troop: 0xe2d6bd,
    ink: 0x1b1712, water: 0x2e6a6a, waterDeep: 0x1a4447, foam: 0xdfeee8
  };

  // ---------- seeded randomness (same model every time) ----------
  function rng(seed) {
    let s = seed | 0 || 1;
    return function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- procedural textures (grey, multiplied with the material colour) ----------
  const texCache = {};
  function canvasTex(key, draw, size = 256) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const r = rng(key.length * 7919 + key.charCodeAt(0));
    draw(g, size, r);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return texCache[key] = t;
  }
  const shade = (v) => { v = Math.max(0, Math.min(255, v | 0)); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  const TEX = {
    ashlar: () => canvasTex('ashlar', (g, S, r) => {            // dressed blocks in running bond
      g.fillStyle = shade(150); g.fillRect(0, 0, S, S);
      const rows = 8, h = S / rows;
      for (let y = 0; y < rows; y++) { const off = (y % 2) * .5, n = 4; for (let i = -1; i < n + 1; i++) {
        const w = S / n, x = (i + off) * w; g.fillStyle = shade(212 + r() * 36); g.fillRect(x + 2, y * h + 2, w - 4, h - 4);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 2, y * h + 2, w - 4, 2); } }
    }),
    field: () => canvasTex('field', (g, S, r) => {              // irregular fieldstone
      g.fillStyle = shade(140); g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 22 + (r() * 10 | 0)) { let x = -r() * 30; const h = 22 + r() * 12;
        while (x < S) { const w = 22 + r() * 36; g.fillStyle = shade(190 + r() * 60);
          g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); g.fill(); x += w; } }
    }),
    planks: () => canvasTex('planks', (g, S, r) => {
      const n = 6, w = S / n; for (let i = 0; i < n; i++) { g.fillStyle = shade(196 + r() * 44); g.fillRect(i * w, 0, w, S);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(i * w, 0, 2, S);
        for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(i * w + 4 + r() * (w - 8), r() * S, 1, 20 + r() * 50); } }
    }),
    shingle: () => canvasTex('shingle', (g, S, r) => {          // rounded roof shingles
      g.fillStyle = shade(120); g.fillRect(0, 0, S, S);
      const rows = 8, h = S / rows, n = 8, w = S / n;
      for (let y = rows - 1; y >= 0; y--) for (let i = -1; i <= n; i++) { const x = (i + (y % 2) * .5) * w;
        g.fillStyle = shade(200 + r() * 55); g.beginPath(); g.moveTo(x + 1, y * h); g.lineTo(x + w - 1, y * h); g.lineTo(x + w - 1, y * h + h * .6);
        g.quadraticCurveTo(x + w / 2, y * h + h * 1.25, x + 1, y * h + h * .6); g.closePath(); g.fill(); }
    }),
    cobble: () => canvasTex('cobble', (g, S, r) => {
      g.fillStyle = shade(120); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 180; i++) { const x = r() * S, y = r() * S, s = 8 + r() * 12; g.fillStyle = shade(170 + r() * 70);
        g.beginPath(); g.ellipse(x, y, s, s * .8, r() * 3, 0, 7); g.fill(); }
    }),
    dirt: () => canvasTex('dirt', (g, S, r) => {
      g.fillStyle = shade(215); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(' + (r() < .5 ? '0,0,0,' : '255,255,255,') + (r() * .12) + ')'; const s = 1 + r() * 5; g.fillRect(r() * S, r() * S, s, s); }
    }),
    marble: () => canvasTex('marble', (g, S, r) => {
      g.fillStyle = shade(245); g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(120,110,100,.18)'; for (let i = 0; i < 9; i++) { g.lineWidth = .6 + r() * 1.4; g.beginPath(); let x = r() * S, y = 0; g.moveTo(x, y);
        while (y < S) { x += (r() - .5) * 30; y += 12 + r() * 20; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * S / 2); g.lineTo(S, i * S / 2); g.moveTo(i * S / 2, 0); g.lineTo(i * S / 2, S); g.stroke(); }
    }),
    thatch: () => canvasTex('thatch', (g, S, r) => {
      g.fillStyle = shade(170); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 1400; i++) { g.strokeStyle = shade(150 + r() * 100); g.lineWidth = 1 + r() * 1.5; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 4, y + 10 + r() * 16); g.stroke(); }
    }),
    grass: () => canvasTex('grass', (g, S, r) => {
      g.fillStyle = shade(205); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 1600; i++) { g.fillStyle = 'rgba(' + (r() < .5 ? '0,0,0,' : '255,255,255,') + (r() * .14) + ')'; g.fillRect(r() * S, r() * S, 1.5, 3 + r() * 4); }
    }),
    cloth: () => canvasTex('cloth', (g, S, r) => {
      g.fillStyle = shade(236); g.fillRect(0, 0, S, S);
      for (let i = 0; i < S; i += 3) { g.fillStyle = 'rgba(0,0,0,' + (.02 + r() * .03) + ')'; g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S); }
    }),
    soft: () => canvasTex('soft', (g, S) => {                  // round soft blob for smoke, glow and contact shadows
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }, 128)
  };
  OW.TEX = TEX;

  // ---------- materials (shared, cached) ----------
  const matCache = {};
  function std(key, o) {
    if (matCache[key]) return matCache[key];
    const m = new T.MeshStandardMaterial(Object.assign({ roughness: .88, metalness: 0, flatShading: true }, o));
    if (o && o.map) { m.bumpMap = o.map; m.bumpScale = o.bumpScale != null ? o.bumpScale : 1.2; }
    m.userData.key = key; return matCache[key] = m;
  }
  const M = OW.M = {
    // stone ladder = tier ladder: fieldstone → sandstone → slate → marble
    field:  () => std('field',  { color: 0xb5b0a6, map: TEX.field() }),
    sand:   () => std('sand',   { color: 0xe6cf9f, map: TEX.ashlar() }),
    slate:  () => std('slate',  { color: 0x8d97a0, map: TEX.ashlar() }),
    cap:    () => std('cap',    { color: 0xe9e2d2, map: TEX.ashlar(), bumpScale: .6 }),
    marble: () => std('marble', { color: 0xf3efe6, map: TEX.marble(), roughness: .55, bumpScale: .4 }),
    darkStone: () => std('darkStone', { color: 0x6c675f, map: TEX.field() }),
    rawWood:  () => std('rawWood',  { color: 0xc2b394, map: TEX.planks() }),          // silvered, lighter than any cloth
    wood:     () => std('wood',     { color: 0x9b7650, map: TEX.planks() }),
    darkWood: () => std('darkWood', { color: 0x5e452e, map: TEX.planks() }),
    thatch:   () => std('thatch',   { color: 0xd4b56d, map: TEX.thatch() }),
    dirt:   () => std('dirt',   { color: 0x9a7f5c, map: TEX.dirt(), bumpScale: .5 }),
    gravel: () => std('gravel', { color: 0xa9a293, map: TEX.cobble(), bumpScale: .5 }),
    cobble: () => std('cobble', { color: 0x9c9284, map: TEX.cobble() }),
    plaza:  () => std('plaza',  { color: 0xefe9dc, map: TEX.marble(), roughness: .5, bumpScale: .3 }),
    grass:  () => std('grass',  { color: 0x7da456, map: TEX.grass(), bumpScale: .4 }),
    earth:  () => std('earth',  { color: 0x7a5c40, map: TEX.field(), bumpScale: 1.5 }),
    iron:   () => std('iron',   { color: 0x4d5157, metalness: .6, roughness: .5 }),
    bronze: () => std('bronze', { color: 0xb57b3c, metalness: .75, roughness: .4 }),
    gold:   () => std('gold',   { color: 0xf0c35a, metalness: .75, roughness: .32, emissive: 0x3a2400, emissiveIntensity: .35 }),
    silver: () => std('silver', { color: 0xd5d8dc, metalness: .8, roughness: .35 }),
    dark:   () => std('dark',   { color: 0x221c17, roughness: 1 }),
    rope:   () => std('rope',   { color: 0x8b7757 }),
    // lights that wake up at night: the stage raises their glow with the night factor
    window: () => std('window', { color: 0x2a1c10, emissive: 0xffb45a, emissiveIntensity: .15, roughness: 1 }),
    flame:  () => std('flame',  { color: 0xffc46b, emissive: 0xff9a2e, emissiveIntensity: 2.2, roughness: 1, flatShading: false }),
    ember:  () => std('ember',  { color: 0x3a2412, emissive: 0xff7a22, emissiveIntensity: 1.2 })
  };
  // owner materials: roofs and cloth. 'capital' = the player's own capital (gold roof, blue cloth).
  M.roof = (owner) => std('roof.' + owner, { color: owner === 'capital' ? C.capital : C[owner], map: TEX.shingle(), metalness: owner === 'capital' ? .35 : 0, roughness: owner === 'capital' ? .45 : .8 });
  M.cloth = (owner) => std('cloth.' + owner, { color: C[owner === 'capital' ? 'player' : owner], map: TEX.cloth(), side: T.DoubleSide, flatShading: false, bumpScale: .2 });
  M.tint = (hex, o = {}) => std('tint.' + hex + JSON.stringify(o), Object.assign({ color: hex }, o));
  M.glow = (hex, i = 1.6) => std('glow.' + hex + '.' + i, { color: hex, emissive: hex, emissiveIntensity: i, roughness: .6, flatShading: false });

  // ---------- UVs: world-sized so bricks keep their size on every part ----------
  function worldUV(geo, scale = .25, cyl = false) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv; if (!uv) return geo;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
      let u, v;
      if (cyl && ny < .7) { const r = Math.hypot(x, z); u = Math.atan2(z, x) * Math.max(r, .5); v = y; }
      else if (ny >= nx && ny >= nz) { u = x; v = z; } else if (nx >= nz) { u = z; v = y; } else { u = x; v = y; }
      uv.setXY(i, u * scale, v * scale);
    }
    uv.needsUpdate = true; return geo;
  }

  // ---------- building parts. Every helper adds to parent p and returns the mesh; y = the part's foot ----------
  function put(p, geo, mat, x = 0, y = 0, z = 0, o = {}) {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; p.add(m); return m;
  }
  const K = OW.K = { rng, worldUV, put };
  K.box = (p, w, h, d, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); worldUV(g, o.uv || .25); return put(p, g, mat, x, y, z, o); };
  K.cyl = (p, rt, rb, h, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.CylinderGeometry(rt, rb, h, o.seg || 14, 1, !!o.open); g.translate(0, h / 2, 0); worldUV(g, o.uv || .25, true); return put(p, g, mat, x, y, z, o); };
  K.cone = (p, r, h, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.ConeGeometry(r, h, o.seg || 14); g.translate(0, h / 2, 0); worldUV(g, o.uv || .35, true); return put(p, g, mat, x, y, z, o); };
  K.sphere = (p, r, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.SphereGeometry(r, o.seg || 16, o.seg2 || 10, 0, Math.PI * 2, 0, o.theta || Math.PI); worldUV(g, o.uv || .3); return put(p, g, mat, x, y, z, o); };
  K.dome = (p, r, mat, x = 0, y = 0, z = 0, o = {}) => K.sphere(p, r, mat, x, y, z, Object.assign({ theta: Math.PI / 2 }, o));
  K.torus = (p, r, t, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.TorusGeometry(r, t, o.seg2 || 6, o.seg || 28); g.rotateX(Math.PI / 2); return put(p, g, mat, x, y, z, o); };
  // a square pyramid roof (w × d base)
  K.pyramid = (p, w, d, h, mat, x = 0, y = 0, z = 0, o = {}) => { const g = new T.ConeGeometry(Math.SQRT1_2, 1, 4); g.rotateY(Math.PI / 4); g.translate(0, .5, 0); g.scale(w, h, d); g.computeVertexNormals(); worldUV(g, o.uv || .35); return put(p, g, mat, x, y, z, o); };
  // a flat frame along the edge of a shape: outer path fn(scale) → Shape; used for gold trims on terraces
  K.frame = (p, shapeFn, outer, inner, h, mat, y = 0) => {
    const s = shapeFn(outer), hole = shapeFn(inner); s.holes.push(new T.Path(hole.getPoints()));
    const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); worldUV(g, .3); return put(p, g, mat, 0, y, 0);
  };
  K.chamfer = (w, k = .18) => { const s = new T.Shape(), c = w * k, a = w / 2; s.moveTo(-a + c, -a); s.lineTo(a - c, -a); s.lineTo(a, -a + c); s.lineTo(a, a - c); s.lineTo(a - c, a); s.lineTo(-a + c, a); s.lineTo(-a, a - c); s.lineTo(-a, -a + c); s.closePath(); return s; };
  // gable (ridge) roof / ridge tent: length along x, span along z
  K.gable = (p, len, span, h, mat, x = 0, y = 0, z = 0, o = {}) => {
    const s = new T.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2); worldUV(g, o.uv || .35);
    return put(p, g, mat, x, y, z, o);
  };
  // battlements: merlons along a rectangle (w × d) or a ring (r)
  K.merlons = (p, shape, y, mat, o = {}) => {
    const size = o.size || .55, hgt = o.h || .6, g = new T.Group(); p.add(g);
    if (shape.r) { const n = o.n || Math.max(6, Math.round(shape.r * Math.PI * 2 / (size * 2)));
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; K.box(g, size, hgt, size * .8, mat, Math.cos(a) * shape.r, y, Math.sin(a) * shape.r, { ry: -a }); } }
    else { const { w, d } = shape, step = size * 2;
      for (const [len, ax, fixed] of [[w, 'x', d / 2], [w, 'x', -d / 2], [d, 'z', w / 2], [d, 'z', -w / 2]]) {
        const n = Math.max(1, Math.floor(len / step)); for (let i = 0; i <= n; i++) { const t = -len / 2 + i * (len / n);
          if (ax === 'x') K.box(g, size, hgt, size * .8, mat, t + (shape.x || 0), y, fixed + (shape.z || 0)); else K.box(g, size * .8, hgt, size, mat, fixed + (shape.x || 0), y, t + (shape.z || 0)); } } }
    return g;
  };
  // a wall from (x1,z1) to (x2,z2): thickness t, height h, optional merlons and walkway cap
  K.wall = (p, x1, z1, x2, z2, h, t, mat, o = {}) => {
    const len = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(z2 - z1, x2 - x1), g = new T.Group(); g.position.set((x1 + x2) / 2, o.y || 0, (z1 + z2) / 2); g.rotation.y = -a; p.add(g);
    K.box(g, len, h, t, mat);
    if (o.cap) K.box(g, len + .1, .18, t + .18, o.cap, 0, h, 0);
    if (o.merlons) { const size = o.size || .5, n = Math.max(1, Math.floor(len / (size * 2))); for (let i = 0; i <= n; i++) { const tx = -len / 2 + i * len / n;
      K.box(g, size, o.mh || .55, t * .45, o.cap || mat, tx, h + (o.cap ? .18 : 0), t * .28); K.box(g, size, o.mh || .55, t * .45, o.cap || mat, tx, h + (o.cap ? .18 : 0), -t * .28); } }
    return g;
  };
  // a round tower with cone roof or battlement top
  K.roundTower = (p, o) => {
    const g = new T.Group(); g.position.set(o.x || 0, o.y || 0, o.z || 0); p.add(g);
    const r = o.r, h = o.h; K.cyl(g, r * .96, r, h, o.mat, 0, 0, 0, { seg: o.seg || 16 });
    if (o.band) K.cyl(g, r * 1.04, r * 1.04, .22, o.band, 0, h - .5, 0, { seg: o.seg || 16 });
    if (o.roof) { const oh = o.overhang || 1.18; K.cone(g, r * oh, o.roofH || r * 2.4, o.roof, 0, h, 0, { seg: o.seg || 16 }); }
    else { K.cyl(g, r * 1.08, r * 1.08, .2, o.cap || o.mat, 0, h, 0, { seg: o.seg || 16 }); K.merlons(g, { r: r * .98 }, h + .2, o.cap || o.mat, { size: o.merlon || .45, h: .5 }); }
    g.userData.top = o.roof ? h + (o.roofH || r * 2.4) : h + .7;
    return g;
  };
  // an arched dark doorway on a wall face (facing +z by default)
  K.door = (p, w, h, x = 0, y = 0, z = 0, o = {}) => {
    const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: .08, bevelEnabled: false }); return put(p, g, o.mat || M.dark(), x, y, z, o);
  };
  // a glowing window slit (emissive, brighter at night)
  K.win = (p, w, h, x, y, z, o = {}) => { const g = new T.BoxGeometry(w, h, .06); return put(p, g, M.window(), x, y + h / 2, z, Object.assign({ cast: false }, o)); };
  // stairs going up along -z from (x,y,z): n steps
  K.stairs = (p, w, n, stepH, stepD, mat, x = 0, y = 0, z = 0, o = {}) => {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; p.add(g);
    for (let i = 0; i < n; i++) K.box(g, w, stepH * (i + 1), stepD, mat, 0, 0, -i * stepD - stepD / 2);
    return g;
  };
  // a ring of sharpened stakes
  K.stakes = (p, r, n, h, mat, o = {}) => {
    const g = new T.Group(); p.add(g); const R = rng(o.seed || 7), gap = o.gap || 0;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (o.a0 || 0); if (gap && Math.abs(((a - (o.gapAt || 0) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < gap) continue;
      const hh = h * (.85 + R() * .3), rr = .17 + R() * .05, x = Math.cos(a) * r, z = Math.sin(a) * r;
      K.cyl(g, rr, rr, hh, mat, x, 0, z, { seg: 6 }); K.cone(g, rr, .45, mat, x, hh, z, { seg: 6 }); }
    return g;
  };

  // ---------- animation registry ----------
  // builders call ctx.tick(fn); fn(t, env) runs every frame (env.night 0…1, env.dt)
  OW.anim = OW.anim || [];
  K.tick = (fn) => OW.anim.push(fn);
  OW.nightLights = OW.nightLights || [];

  // a waving flag on a pole. o: x,y,z (pole foot), poleH, w, h, owner, dir (radians, where the cloth blows)
  K.flag = (p, o) => {
    const g = new T.Group(); g.position.set(o.x || 0, o.y || 0, o.z || 0); g.rotation.y = o.dir || 0; p.add(g);
    const ph = o.poleH || 2.2, w = o.w || 1.3, h = o.h || .8;
    K.cyl(g, .045, .06, ph, o.poleMat || M.darkWood(), 0, 0, 0, { seg: 6 });
    K.sphere(g, .09, o.knob || M.gold(), 0, ph + .04, 0, { seg: 8, seg2: 6 });
    const geo = new T.PlaneGeometry(w, h, 10, 4); geo.translate(w / 2, 0, 0);
    if (o.swallow) { const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (x > w * .7) pos.setX(i, x - Math.max(0, (1 - Math.abs(y) / (h / 2))) * w * .25); } }
    if (o.pennant) { const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setY(i, y * (1 - x / w * .92)); } }
    const cloth = new T.Mesh(geo, o.mat || M.cloth(o.owner || 'neutral')); cloth.position.y = ph - h / 2 - .05; cloth.castShadow = true; g.add(cloth);
    const base = geo.attributes.position.array.slice(), ph0 = (o.phase || 0) + Math.random() * 6;
    K.tick((t) => { const a = geo.attributes.position; for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], k = x / w;
        a.setZ(i, Math.sin(x * 3.2 - t * 5.5 + ph0 + y * .6) * .14 * k + Math.sin(x * 7 - t * 9 + ph0) * .03 * k); }
      a.needsUpdate = true; geo.computeVertexNormals(); });
    g.userData.cloth = cloth; return g;
  };
  // a long hanging banner (on a wall face), swaying gently. Hangs down from (x,y,z), faces +z unless ry.
  K.banner = (p, o) => {
    const g = new T.Group(); g.position.set(o.x || 0, o.y || 0, o.z || 0); g.rotation.y = o.ry || 0; p.add(g);
    const w = o.w || .9, h = o.h || 2.4; K.cyl(g, .04, .04, w + .3, o.rod || M.gold(), (w + .3) / 2, 0, .06, { rz: Math.PI / 2, seg: 6 });
    const geo = new T.PlaneGeometry(w, h, 3, 8); geo.translate(0, -h / 2, .08);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < -h + .01) pos.setY(i, y + (Math.abs(x) < .01 ? -w * .35 : 0)); }
    const m = new T.Mesh(geo, o.mat || M.cloth(o.owner || 'neutral')); m.castShadow = true; g.add(m);
    if (o.emblem) { const e = new T.Mesh(new T.CircleGeometry(w * .26, 16), o.emblem); e.position.set(0, -h * .38, .1); g.add(e); }
    const base = pos.array.slice(), ph0 = Math.random() * 6;
    K.tick((t) => { for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1], k = -y / h; pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 1.6 + ph0 + y * 1.5) * .07 * k); } pos.needsUpdate = true; });
    return g;
  };
  // a torch / brazier flame: flickering emissive teardrop + optional point light (only at night)
  K.flameAt = (p, x, y, z, o = {}) => {
    const s = o.size || .22, g = new T.Group(); g.position.set(x, y, z); p.add(g);
    const fl = new T.Mesh(new T.ConeGeometry(s, s * 2.6, 7), M.flame()); fl.position.y = s * 1.3; g.add(fl);
    const core = new T.Mesh(new T.SphereGeometry(s * .9, 8, 6), M.flame()); core.position.y = s * .5; g.add(core);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: TEX.soft(), color: o.color || 0xffa040, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .0 }));
    glow.scale.setScalar(s * 9); glow.position.y = s * 1.2; glow.userData.noOutline = true; g.add(glow);
    let light = null;
    if (o.light !== false) { light = new T.PointLight(o.color || 0xff9c45, 0, o.range || 9, 1.6); light.position.y = s * 2; g.add(light); OW.nightLights.push(light); light.userData.base = o.power || 14; }
    const ph = Math.random() * 10;
    K.tick((t, env) => { const f = .85 + Math.sin(t * 13 + ph) * .08 + Math.sin(t * 23.7 + ph) * .06; fl.scale.set(1, f * 1.1, 1); fl.rotation.y = t * 2;
      glow.material.opacity = (.07 + env.night * .75) * f; if (light) light.intensity = env.night * light.userData.base * f; });
    return g;
  };
  // smoke / steam / mist rising from a point. o: rate (puffs per s), color, size, rise, spread, life
  K.smoke = (p, x, y, z, o = {}) => {
    const g = new T.Group(); g.position.set(x, y, z); p.add(g); const n = o.n || 14, life = o.life || 4, parts = [];
    for (let i = 0; i < n; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: TEX.soft(), color: o.color || 0xd9d4cc, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.noOutline = true; s.userData.age = i / n * life; s.userData.dx = (Math.random() - .5); s.userData.dz = (Math.random() - .5); g.add(s); parts.push(s); }
    K.tick((t, env) => { for (const s of parts) { s.userData.age += env.dt; if (s.userData.age > life) { s.userData.age -= life; s.userData.dx = Math.random() - .5; s.userData.dz = Math.random() - .5; }
      const k = s.userData.age / life; s.position.set(s.userData.dx * (o.spread || .6) * k + k * (o.drift || .8), k * (o.rise || 3), s.userData.dz * (o.spread || .6) * k);
      s.scale.setScalar((o.size || .6) * (.5 + k * 1.8)); s.material.opacity = (o.alpha || .55) * Math.sin(Math.PI * k) * (g.visible ? 1 : 0); } });
    return g;
  };
  // tiny rising sparkles (magic, gold). o: color, n, r, h
  K.sparkles = (p, x, y, z, o = {}) => {
    const g = new T.Group(); g.position.set(x, y, z); p.add(g); const n = o.n || 16, parts = [];
    for (let i = 0; i < n; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: TEX.soft(), color: o.color || 0xffe6a0, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
      s.userData.noOutline = true; s.userData.a = Math.random() * 6.28; s.userData.k = Math.random(); s.userData.sp = .6 + Math.random() * .8; g.add(s); parts.push(s); }
    K.tick((t) => { for (const s of parts) { const k = (s.userData.k + t * .12 * s.userData.sp) % 1, a = s.userData.a + t * .4;
      s.position.set(Math.cos(a) * (o.r || 1.2) * (1 - k * .3), k * (o.h || 3), Math.sin(a) * (o.r || 1.2) * (1 - k * .3)); s.scale.setScalar((o.size || .22) * (1 - k * .5)); s.material.opacity = Math.sin(Math.PI * k) * (o.alpha || .9); } });
    return g;
  };

  // ---------- water: animated, stylised (teal-green, never player blue) ----------
  let waterMat = null;
  OW.waterUniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  K.waterMat = () => {
    if (waterMat) return waterMat;
    waterMat = new T.ShaderMaterial({
      uniforms: OW.waterUniforms, transparent: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; uniform float uNight; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 p = vW.xz * .35; float t = uTime * .35;
          float a = n(p + vec2(t, t*.6)) * .6 + n(p*2.3 - vec2(t*.8, -t)) * .4;
          float streak = smoothstep(.62, .78, a) * .55 + smoothstep(.8, .9, n(p*4.1 + vec2(-t*1.3, t*.7))) * .5;
          vec3 deep = vec3(.10,.27,.28), shallow = vec3(.20,.45,.44), foam = vec3(.86,.93,.90);
          vec3 c = mix(deep, shallow, a);
          c = mix(c, foam, streak * .45);
          vec3 night = vec3(.05,.10,.16);
          c = mix(c, c * .35 + night, uNight * .8);
          gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`
    });
    return waterMat;
  };
  // a flat water shape: a ring (moat) or a disc or a rectangle, at height y
  K.water = (p, o) => {
    let g; if (o.ring) g = new T.RingGeometry(o.ring[0], o.ring[1], 48, 1); else if (o.rect) g = new T.PlaneGeometry(o.rect[0], o.rect[1]); else g = new T.CircleGeometry(o.r || 2, 40);
    g.rotateX(-Math.PI / 2); const m = new T.Mesh(g, K.waterMat()); m.position.set(o.x || 0, o.y || 0, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.receiveShadow = true; p.add(m); return m;
  };
  // falling water sheet (waterfall) from (x,y,z) down by h, width w, facing ry
  K.waterfall = (p, x, y, z, w, h, o = {}) => {
    const geo = new T.PlaneGeometry(w, h, 1, 6); geo.translate(0, -h / 2, 0);
    const mat = new T.ShaderMaterial({ uniforms: OW.waterUniforms, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vU;
        float h(float x){ return fract(sin(x*91.7)*437.5); }
        void main(){ float col = floor(vU.x*9.); float s = fract(vU.y*2.5 + uTime*1.6 + h(col)*3.);
          float streak = smoothstep(.0,.25,s)*smoothstep(1.,.5,s);
          vec3 c = mix(vec3(.55,.78,.76), vec3(.95,1.,.98), streak*.8); c *= 1. - uNight*.55;
          float a = (.55 + streak*.4) * smoothstep(0.,.08,vU.x) * smoothstep(1.,.92,vU.x);
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }` });
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = o.ry || 0; m.userData.noOutline = true; p.add(m);
    K.smoke(p, x + Math.sin(o.ry || 0) * .3, y - h, z + Math.cos(o.ry || 0) * .3, { color: 0xffffff, rate: 4, size: w * .5, rise: .8, life: 1.6, alpha: .35, n: 8, drift: 0 });
    return m;
  };

  // ---------- small props ----------
  K.barrel = (p, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); K.cyl(g, .28, .25, .7, M.wood(), 0, 0, 0, { seg: 10 }); K.torus(g, .29, .03, M.iron(), 0, .15, 0); K.torus(g, .29, .03, M.iron(), 0, .55, 0); return g; };
  K.crate = (p, x, y, z, s = .55, ry = 0) => K.box(p, s, s, s, M.wood(), x, y, z, { ry });
  K.rock = (p, x, y, z, s = .5, mat) => { const g = new T.DodecahedronGeometry(s, 0); g.scale(1, .6, .9); const m = put(p, g, mat || M.darkStone(), x, y + s * .3, z, { ry: x * 3 }); return m; };
  K.bush = (p, x, y, z, s = .5) => { const g = new T.IcosahedronGeometry(s, 0); return put(p, g, M.tint(0x5d8a3c), x, y + s * .6, z, { ry: z * 2 }); };
  K.tree = (p, x, y, z, s = 1) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); K.cyl(g, .12 * s, .16 * s, 1.1 * s, M.darkWood(), 0, 0, 0, { seg: 6 });
    K.cone(g, .9 * s, 1.6 * s, M.tint(0x4f7d3a), 0, .8 * s, 0, { seg: 7 }); K.cone(g, .7 * s, 1.3 * s, M.tint(0x5b8b42), 0, 1.6 * s, 0, { seg: 7 }); return g; };
  K.lantern = (p, x, y, z, o = {}) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); K.cyl(g, .05, .07, o.h || 1.6, M.iron(), 0, 0, 0, { seg: 6 });
    K.box(g, .26, .3, .26, M.window(), 0, (o.h || 1.6), 0); K.pyramid(g, .34, .34, .18, M.iron(), 0, (o.h || 1.6) + .3, 0); return g; };
})();


// ===== Open Water Baukunst · stage: ink outlines, capital plinth, map thumbnails (the game renders every model once into a sprite) =====
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const S = OW.stage = {};

  // ---------- ink outline pipeline (the game's black outlines, done in 3D) ----------
  const ND_VS = `varying vec3 vN; varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const ND_FS = `uniform float uFar; varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * .5 + .5, clamp(vD / uFar, 0., 1.)); }`;
  const Q_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  const Q_FS = `uniform sampler2D tC; uniform sampler2D tN; uniform vec2 px; uniform float uInk; uniform vec3 inkCol; uniform float uTransparent; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tC, vUv); vec4 n0 = texture2D(tN, vUv); float e = 0.;
      vec2 o[4]; o[0] = vec2(px.x, 0.); o[1] = vec2(-px.x, 0.); o[2] = vec2(0., px.y); o[3] = vec2(0., -px.y);
      for (int i = 0; i < 4; i++) { vec4 n1 = texture2D(tN, vUv + o[i]);
        float dd = abs(n1.a - n0.a) / max(min(n0.a, n1.a), .002);
        e = max(e, smoothstep(.035, .09, dd));
        float nd = 1. - dot(n0.xyz * 2. - 1., n1.xyz * 2. - 1.);
        e = max(e, smoothstep(.35, .75, nd) * .8); }
      vec3 col = mix(c.rgb, inkCol, e * uInk);
      float a = uTransparent > .5 ? max(c.a, e * uInk * step(n0.a, .999)) : 1.;
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function Pipeline(renderer, o = {}) {
    this.r = renderer; this.transparent = !!o.transparent;
    this.rtC = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: o.samples != null ? o.samples : 4 });
    this.rtN = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType });
    this.nd = new T.ShaderMaterial({ uniforms: { uFar: { value: 400 } }, vertexShader: ND_VS, fragmentShader: ND_FS, side: T.DoubleSide });
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms: { tC: { value: null }, tN: { value: null }, px: { value: new T.Vector2() }, uInk: { value: 1 }, inkCol: { value: new T.Color(0x1b1712).convertSRGBToLinear() }, uTransparent: { value: this.transparent ? 1 : 0 } },
      vertexShader: Q_VS, fragmentShader: Q_FS, depthTest: false, depthWrite: false, transparent: this.transparent, toneMapped: true }));
    this.qScene = new T.Scene(); this.qScene.add(this.quad); this.qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.hidden = [];
  }
  Pipeline.prototype.setSize = function (w, h, dpr) {
    const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    this.rtC.setSize(W, H); this.rtN.setSize(W, H); this.quad.material.uniforms.px.value.set(Math.max(1, dpr * .8) / W, Math.max(1, dpr * .8) / H);
  };
  Pipeline.prototype.render = function (scene, cam, ink = 1) {
    const R = this.r, bg = scene.background, fog = scene.fog;
    R.setRenderTarget(this.rtC); R.clear(); R.render(scene, cam);
    if (ink > 0) {
      const hid = this.hidden; hid.length = 0;
      scene.traverseVisible(ob => { if (ob.userData.noOutline || ob.isSprite || ob.isPoints || (ob.material && ob.material.transparent && !ob.isMesh)) hid.push(ob); else if (ob.isMesh && ob.material && ob.material.transparent) hid.push(ob); });
      for (const ob of hid) ob.visible = false;
      scene.background = null; scene.fog = null; scene.overrideMaterial = this.nd; this.nd.uniforms.uFar.value = cam.far;
      const cc = R.getClearColor(new T.Color()), ca = R.getClearAlpha(); R.setClearColor(0x808080, 1);
      R.setRenderTarget(this.rtN); R.clear(); R.render(scene, cam);
      R.setClearColor(cc, ca); scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; for (const ob of hid) ob.visible = true;
    }
    const u = this.quad.material.uniforms; u.tC.value = this.rtC.texture; u.tN.value = this.rtN.texture; u.uInk.value = ink;
    R.setRenderTarget(null); R.render(this.qScene, this.qCam);
  };

  // ---------- daylight ----------
  const SKY = {
    tag:   { top: '#8fb9d6', mid: '#cfe0e6', bot: '#e9e4d6', sun: 0xfff0d8, sunI: 2.9, sunPos: [9, 15, 7],  hemiS: 0xd6e6ff, hemiG: 0x75654f, hemiI: .75, fog: 0xd9e2e2, night: 0, exp: 1.0 },
  };
  // environment for reflections (metal, gold): an equirect gradient, prefiltered
  function envTex(p, renderer) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, p.top); gr.addColorStop(.42, p.mid); gr.addColorStop(.5, p.bot); gr.addColorStop(.53, '#6f6250'); gr.addColorStop(1, '#2c2620'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    const sx = 40, sy = p.night > .9 ? 26 : p.night > .3 ? 58 : 22, sg = g.createRadialGradient(sx, sy, 0, sx, sy, 26); sg.addColorStop(0, 'rgba(255,248,230,1)'); sg.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = sg; g.fillRect(0, 0, 256, 128);
    const t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
    const pm = new T.PMREMGenerator(renderer); const rt = pm.fromEquirectangular(t); pm.dispose(); t.dispose(); return rt.texture;
  }

  // ---------- capital plinth and water castle ----------
  function buildPlinth(p, rad, style, owner) {
    const g = new T.Group(); p.add(g); const h = 1.2;
    K.cyl(g, rad + .3, rad + .9, h, M.cap(), 0, 0, 0, { seg: 40, uv: .3 });
    const top = K.cyl(g, rad + .15, rad + .15, .06, M.grass(), 0, h, 0, { seg: 40 }); top.receiveShadow = true;
    K.torus(g, rad + .3, .09, M.gold(), 0, h, 0, { seg: 48 });
    K.stairs(g, 3.2, 5, h / 5, .45, M.cap(), 0, 0, rad + .9 + 5 * .45, { ry: 0 });
    for (const s of [-1, 1]) { K.box(g, .5, h + .4, .5, M.cap(), s * 1.85, 0, rad + 1.2); K.flameAt(g, s * 1.85, h + .4, rad + 1.2, { size: .16, power: 8 }); }
    if (style === 'wasser') {
      K.water(g, { ring: [rad + 1.0, rad + 3.6], y: .02 });
      const rim = new T.Mesh(new T.RingGeometry(rad + 3.6, rad + 4.1, 48), M.cap()); rim.rotation.x = -Math.PI / 2; rim.position.y = .08; rim.receiveShadow = true; g.add(rim);
      for (const a of [Math.PI / 2, -Math.PI / 2 + .0001]) { // two little arched bridges
        const bx = Math.cos(a) * (rad + 2.3), bz = Math.sin(a) * (rad + 2.3), b = new T.Group(); b.position.set(bx, 0, bz); b.rotation.y = -a + Math.PI / 2; g.add(b);
        const s = new T.Shape(); s.moveTo(-1.6, 0); s.lineTo(-1.6, .9); s.quadraticCurveTo(0, 1.6, 1.6, .9); s.lineTo(1.6, 0); s.lineTo(1.0, 0); s.quadraticCurveTo(0, 1.0, -1.0, 0); s.closePath();
        const bg = new T.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false }); bg.translate(0, 0, -.9); K.worldUV(bg, .3); const bm = new T.Mesh(bg, M.cap()); bm.rotation.y = Math.PI / 2; bm.castShadow = bm.receiveShadow = true; b.add(bm); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; K.waterfall(g, Math.cos(a) * (rad + .95), h - .05, Math.sin(a) * (rad + .95), 1.1, h - .02, { ry: -a + Math.PI / 2 }); }
    }
    g.userData.h = h; return g;
  }

  // ---------- building a model into the stage ----------
  function ownerKeys(c) { return { roofKey: c.owner === 'player' && c.capital ? 'capital' : c.owner, cloth: c.owner }; }
  function buildModel(c, into) {
    const def = OW.models[c.model]; const ok = ownerKeys(c);
    const ctx = Object.assign({}, c, { roof: M.roof(ok.roofKey), cloth: M.cloth(ok.cloth), owned: c.owner !== 'neutral', roofKey: ok.roofKey, v: c.variant || {} });
    if (OW.variety) OW.variety.ctx(c, ctx);
    const g = def.build(ctx); into.add(g);
    if (OW.variety) OW.variety.after(c, g);
    return { group: g, def };
  }
  S.scoped = function (fn) {                                  // run a build with its own animation and light lists
    const a = OW.anim, l = OW.nightLights; OW.anim = []; OW.nightLights = [];
    try { return fn(); } finally { const res = { anim: OW.anim, lights: OW.nightLights }; OW.anim = a; OW.nightLights = l; S._lastScope = res; }
  };
  // ---------- map thumbnails: the same model, tiny, from the game's angle, on transparent ground ----------
  let TR = null, tScene, tCam, tPipe, tSun, tHemi;
  S.thumb = function (c, px, out) {
    if (!TR) {
      const cv = document.createElement('canvas'); TR = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, preserveDrawingBuffer: true });
      TR.toneMapping = T.ACESFilmicToneMapping; TR.outputColorSpace = T.SRGBColorSpace; TR.shadowMap.enabled = true; TR.shadowMap.type = T.PCFSoftShadowMap; TR.setClearColor(0x000000, 0);
      tScene = new T.Scene(); tHemi = new T.HemisphereLight(SKY.tag.hemiS, SKY.tag.hemiG, 1.15); tScene.add(tHemi);
      tSun = new T.DirectionalLight(0xfff0d8, 3); tSun.position.set(18, 30, 14); tSun.castShadow = true; tSun.shadow.mapSize.set(1024, 1024); const s = tSun.shadow.camera; s.left = s.bottom = -16; s.right = s.top = 16; s.far = 80; tSun.shadow.bias = -.0005; tScene.add(tSun);
      tCam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 300); tPipe = new Pipeline(TR, { transparent: true, samples: 4 }); tScene.environment = envTex(SKY.tag, TR); tHemi.intensity = .85;
    }
    const size = Math.round(px * 2); TR.setPixelRatio(1); TR.setSize(size, size, false); tPipe.setSize(size, size, 1);
    tPipe.quad.material.uniforms.px.value.set(1 / size, 1 / size);
    while (tScene.children.length > 2) tScene.remove(tScene.children[2]); tScene.add(tSun);
    const g = new T.Group(); tScene.add(g); let info;
    S.scoped(() => { const def = OW.models[c.model]; const meta = (def.meta && def.meta(c)) || {}; const holder = new T.Group(); g.add(holder); let lift = 0;
      if (c.capital) { const pl = buildPlinth(holder, (meta.plotR || 7) * 1.12, c.capStyle, c.owner); lift = pl.userData.h; }
      const inner = new T.Group(); inner.position.y = lift; holder.add(inner); const { group } = buildModel(c, inner); if (c.capital) inner.scale.setScalar(1.12);
      info = { top: (group.userData.top || 10) + lift, rad: (group.userData.radius || 6) * (c.capital ? 1.12 : 1) + (c.capital ? 1 : 0), lift };
      if ((c.state === 'brand' || c.state === 'qualm' || c.state === 'russ') && OW.fire) OW.fire.build(g, group, info, c.state); });
    for (const f of S._lastScope.anim) f(1.3, { night: 0, dt: 0, t: 1.3 });
    const v = c.frame || 13; tCam.left = -v; tCam.right = v; tCam.top = v * 1.08; tCam.bottom = -v * .92; tCam.updateProjectionMatrix();
    const az = Math.PI / 4, el = Math.atan(.62), D = 120; tCam.position.set(Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D + (c.lookY || 4), Math.cos(az) * Math.cos(el) * D); tCam.lookAt(0, c.lookY || 4, 0);
    tPipe.render(tScene, tCam, 1);
    const ctx = out.getContext('2d'); out.width = size; out.height = size; ctx.clearRect(0, 0, size, size); ctx.drawImage(TR.domElement, 0, 0);
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tScene.remove(g);
    return info;
  };
})();


// ===== Open Water Baukunst · the normal base: five tiers, each with its own material, top shape and ground =====
// Tier reads from stone and silhouette, the owner from roofs and cloth. Steps inside a tier add parts but never change the top outline.
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  // Ten looks, one per ten levels (1-9, 10-19 … 90-100). Inside a tier, level x5-x9 adds a small step (step 1); level 100 is step 2.
  const tierOf = (lv) => Math.min(9, Math.floor(lv / 10));
  const stepOf = (lv) => lv >= 100 ? 2 : (lv % 10 >= 5 ? 1 : 0);
  OW.tierOf = tierOf; OW.stepOf = stepOf;
  OW.TIERS = OW.TIERS || [];                 // [i] = { build(ctx) → Group, plotR, islandR }
  OW.addTier = (i, def) => { OW.TIERS[i] = def; };
  OW.basisHelpers = { plate: (...a) => plate(...a), squarePlate: (...a) => squarePlate(...a) };

  // irregular ground plate (the ground tells the tier)
  function plate(p, r, mat, o = {}) {
    const R = K.rng(o.seed || 3), pts = [], n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + (R() - .5) * (o.wobble != null ? o.wobble : .08)); pts.push(new T.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
    const geo = new T.ExtrudeGeometry(new T.Shape(pts), { depth: o.h || .12, bevelEnabled: true, bevelThickness: .04, bevelSize: .1, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2); K.worldUV(geo, o.uv || .22); const m = K.put(p, geo, mat, 0, o.y || 0, 0, { cast: false }); return m;
  }
  function squarePlate(p, w, d, h, mat, y = 0, o = {}) { const m = K.box(p, w, h, d, mat, o.x || 0, y, o.z || 0, { uv: o.uv || .22, cast: false }); return m; }

  // ---------------- Tier 0 · Lager (lv 1-9): wide and low, palisade ring dominant, owner on the tent canvas ----------------
  function lager(ctx) {
    const g = new T.Group(), st = stepOf(ctx.level), R = K.rng(101);
    plate(g, 5.1, M.dirt(), { wobble: .12 });
    // palisade with a gate gap at the front (+z)
    if (st >= 1) { const foot = new T.Group(); g.add(foot); for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .3) continue; K.rock(foot, Math.cos(a) * 4.3, 0, Math.sin(a) * 4.3, .32 + R() * .1, M.field()); } }
    K.stakes(g, 4.3, 46, 1.7, M.rawWood(), { gap: .26, gapAt: Math.PI / 2, seed: 9 });
    K.torus(g, 4.3, .06, M.rope(), 0, 1.05, 0, { seg: 64 });
    for (const s of [-1, 1]) { K.cyl(g, .24, .26, 2.5, M.wood(), s * 1.15, 0, 4.25, { seg: 7 }); K.cone(g, .26, .5, M.wood(), s * 1.15, 2.5, 4.25, { seg: 7 }); }
    K.box(g, 2.8, .22, .26, M.wood(), 0, 2.05, 4.25);
    // longhouse hall at the back, thatched
    const hall = new T.Group(); hall.position.set(-.3, 0, -1.6); g.add(hall);
    K.box(hall, 4.4, 1.35, 2.5, M.rawWood(), 0, .1, 0, { uv: .3 });
    K.gable(hall, 4.9, 3.1, 1.75, M.thatch(), 0, 1.45, 0);
    K.box(hall, 5.0, .12, .12, M.darkWood(), 0, 3.15, 0);
    for (const s of [-1, 1]) { K.cyl(hall, .06, .06, .7, M.darkWood(), s * 2.45, 2.85, 0, { rz: s * .6, seg: 5 }); K.cyl(hall, .06, .06, .7, M.darkWood(), s * 2.45, 2.85, 0, { rz: -s * .6, seg: 5, rx: .01 }); }
    K.door(hall, .8, 1.15, 0, .1, 1.26);
    K.win(hall, .35, .3, -1.3, .75, 1.27); K.win(hall, .35, .3, 1.3, .75, 1.27);
    // tents in the owner colour (ridge tents: wide and low, never a pointy cone)
    const tent = (x, z, len, span, h, ry) => { const t = new T.Group(); t.position.set(x, 0, z); t.rotation.y = ry; g.add(t);
      K.gable(t, len, span, h, ctx.cloth, 0, .02, 0); K.cyl(t, .05, .05, h + .35, M.darkWood(), len / 2 + .02, 0, 0, { seg: 5 }); K.cyl(t, .05, .05, h + .35, M.darkWood(), -len / 2 - .02, 0, 0, { seg: 5 });
      const fl = new T.Shape(); fl.moveTo(-span * .22, 0); fl.lineTo(span * .22, 0); fl.lineTo(0, h * .7); fl.closePath(); const fg = new T.ShapeGeometry(fl); const fm = new T.Mesh(fg, M.dark()); fm.position.set(len / 2 + .03, .02, 0); fm.rotation.y = Math.PI / 2; t.add(fm); return t; };
    tent(-2.0, 1.4, 2.3, 2.3, 1.55, .35);
    if (st >= 1) tent(2.1, 1.1, 1.8, 1.9, 1.25, -.5);
    // campfire with a thin smoke thread
    const fire = new T.Group(); fire.position.set(.35, 0, 2.35); g.add(fire);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.rock(fire, Math.cos(a) * .55, 0, Math.sin(a) * .55, .16, M.darkStone()); }
    for (let i = 0; i < 3; i++) K.cyl(fire, .07, .07, .9, M.darkWood(), 0, .12, 0, { rz: Math.PI / 2, ry: i * 1.05, seg: 5 });
    K.flameAt(fire, 0, .12, 0, { size: .2, power: 18, range: 11 });
    K.smoke(fire, 0, .9, 0, { n: 10, size: .35, rise: 3.2, life: 3.5, alpha: .45, spread: .3, drift: .6 });
    // watch platform with a torch (lv 7-9)
    if (st >= 1) { const w = new T.Group(); w.position.set(2.7, 0, -2.5); g.add(w);
      for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) K.cyl(w, .09, .11, 3.1, M.wood(), x, 0, z, { seg: 6 });
      K.box(w, 1.7, .14, 1.7, M.wood(), 0, 3.0, 0);
      for (const [x, z, ry] of [[0, -.8, 0], [0, .8, 0], [-.8, 0, Math.PI / 2], [.8, 0, Math.PI / 2]]) K.box(w, 1.6, .5, .06, M.rawWood(), x, 3.14, z, { ry });
      K.box(w, .9, .08, .08, M.wood(), 0, 1.5, .62, { rz: .9 }); K.flameAt(w, .7, 3.6, .7, { size: .15, power: 10 });
      K.box(w, .2, .5, .2, M.darkWood(), .7, 3.1, .7); }
    // a flag on the hall's ridge: only when someone owns the camp
    if (ctx.owned) K.flag(hall, { x: 2.2, y: 3.1, z: 0, poleH: 2.0, w: 1.1, h: .62, owner: ctx.cloth === M.cloth('bot') ? 'bot' : 'player', mat: ctx.cloth, dir: Math.PI * .1 });
    // clutter
    K.barrel(g, -3.2, 0, -.3); K.barrel(g, -3.0, 0, .3); K.crate(g, 3.0, 0, 2.2, .6, .4); K.crate(g, 2.9, .6, 2.2, .45, .9);
    const pile = new T.Group(); pile.position.set(-3.3, 0, 2.2); g.add(pile); for (let i = 0; i < 6; i++) K.cyl(pile, .12, .12, 1.2, M.wood(), (i % 3) * .26 - .26, .12 + Math.floor(i / 3) * .22, 0, { rx: Math.PI / 2, seg: 6 });
    g.userData = { top: st >= 1 ? 4.2 : 3.4, radius: 5.1, smoke: [[-.3, 3, -1.6], [2, 1.2, 1.1]] };
    return g;
  }

  // ---------------- Tier 1 · Rundturm (lv 10-24): tall and slim, ONE big owner cone ----------------
  function rundturm(ctx) {
    const g = new T.Group(), st = stepOf(ctx.level);
    plate(g, 4.6, M.gravel(), { wobble: .06 });
    if (st >= 1) { for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .22) continue; K.box(g, .7, .38, .45, M.field(), Math.cos(a) * 4.35, 0, Math.sin(a) * 4.35, { ry: -a + Math.PI / 2 }); } }
    else { K.stakes(g, 4.35, 36, .9, M.rawWood(), { gap: .24, gapAt: Math.PI / 2, seed: 3 }); }
    const rT = 1.95, hT = 7.6;
    const tw = K.roundTower(g, { r: rT, h: hT, mat: M.field(), roof: ctx.roof, roofH: 4.6, overhang: 1.28, band: M.iron(), seg: 18 });
    // corbelled wooden gallery just under the roof
    K.cyl(tw, rT * 1.14, rT * 1.02, .5, M.darkWood(), 0, hT - .55, 0, { seg: 18 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(tw, .14, .5, .3, M.darkWood(), Math.cos(a) * rT * 1.12, hT - 1.05, Math.sin(a) * rT * 1.12, { ry: -a }); }
    // slits that glow at night
    for (const [a, y] of [[.3, 2.6], [2.1, 3.8], [4.0, 5.1], [1.2, 5.6], [5.2, 2.9]]) { const x = Math.cos(a) * (rT - .02), z = Math.sin(a) * (rT - .02); K.win(tw, .18, .62, x, y, z, { ry: Math.PI / 2 - a }); }
    // door + wooden stairs
    K.door(tw, .95, 1.6, 0, .55, rT - .02); K.box(tw, 1.3, .1, .9, M.wood(), 0, .45, rT + .35); K.stairs(tw, 1.2, 3, .15, .3, M.wood(), 0, 0, rT + 1.7, { ry: Math.PI });
    // flag on the tip
    if (ctx.owned) K.flag(tw, { x: 0, y: hT + 4.55, z: 0, poleH: 1.6, w: 1.05, h: .55, mat: ctx.cloth, dir: .2 });
    else K.sphere(tw, .16, M.darkWood(), 0, hT + 4.62, 0, { seg: 8 });
    // shed at the foot (wood, not owner-coloured: the single cone stays the one coloured shape)
    const shed = new T.Group(); shed.position.set(2.55, 0, -.4); shed.rotation.y = -.5; g.add(shed);
    K.box(shed, 1.6, 1.3, 1.5, M.rawWood()); K.gable(shed, 1.9, 1.9, .8, M.darkWood(), 0, 1.3, 0); K.door(shed, .5, .8, 0, 0, .76);
    // pennants: one per third of the tier
    const pn = st >= 1 ? 3 : 1;
    if (ctx.owned) for (let i = 0; i < pn; i++) { const a = Math.PI / 2 + (i - (pn - 1) / 2) * .75 + (pn === 1 ? .55 : 0); K.flag(g, { x: Math.cos(a) * 3.6, y: 0, z: Math.sin(a) * 3.6, poleH: 2.6, w: .9, h: .3, mat: ctx.cloth, pennant: true, dir: .3 }); }
    // brazier on a stand (lv 20+)
    if (st >= 1) { const b = new T.Group(); b.position.set(-1.6, 0, 2.3); g.add(b); K.cyl(b, .06, .09, 1.1, M.iron(), 0, 0, 0, { seg: 6 }); K.cyl(b, .38, .2, .3, M.iron(), 0, 1.1, 0, { seg: 10 }); K.flameAt(b, 0, 1.35, 0, { size: .2, power: 14 }); }
    K.barrel(g, -2.2, 0, -1.9); K.crate(g, -2.6, 0, -1.2, .55, .3);
    g.userData = { top: hT + 4.6, radius: 4.6, smoke: [[0, hT + 1, 0], [2.5, 1.6, -.4]] };
    return g;
  }

  // ---------------- Tier 2 · Bergfried (lv 25-49): square sandstone keep, flat notched top + flag pole, owner-roofed hall ----------------
  function bergfried(ctx) {
    const g = new T.Group(), st = stepOf(ctx.level);
    squarePlate(g, 9.6, 9.6, .16, M.cobble());
    K.box(g, 9.9, .1, 9.9, M.cap(), 0, 0, 0, { cast: false });
    const kw = 3.7, kh = 10.2, kx = -.9, kz = -.9;
    const keep = new T.Group(); keep.position.set(kx, 0, kz); g.add(keep);
    K.box(keep, kw + .5, .9, kw + .5, M.sand(), 0, 0, 0);                         // battered plinth
    K.box(keep, kw, kh, kw, M.sand());
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = .9; y < kh - .6; y += .9) K.box(keep, .42, .45, .42, M.cap(), sx * (kw / 2 - .12), y, sz * (kw / 2 - .12));   // quoins
    K.box(keep, kw + .12, .22, kw + .12, M.cap(), 0, kh * .55, 0);                    // string course
    // machicolation corbels + parapet with merlons: the flat notched top
    for (let i = 0; i < 7; i++) { const t = -kw / 2 + .3 + i * (kw - .6) / 6; for (const [x, z, ry] of [[t, kw / 2 + .12, 0], [t, -kw / 2 - .12, 0], [kw / 2 + .12, t, Math.PI / 2], [-kw / 2 - .12, t, Math.PI / 2]]) K.box(keep, .22, .45, .28, M.cap(), x, kh - .1, z, { ry }); }
    K.box(keep, kw + .55, .6, kw + .55, M.sand(), 0, kh + .3, 0);
    K.merlons(keep, { w: kw + .35, d: kw + .35 }, kh + .9, M.cap(), { size: .5, h: .6 });
    // windows: slits low, arched glowing windows high
    for (const [x, y] of [[-.9, 3.2], [.9, 5.2], [0, 7.6]]) K.win(keep, .2, .7, x, y, kw / 2 + .01);
    for (const [z, y] of [[-.8, 4.0], [.7, 6.8]]) K.win(keep, .2, .7, kw / 2 + .01, y, z, { ry: Math.PI / 2 });
    K.door(keep, .9, 1.5, .5, 3.1, kw / 2 + .01);
    K.stairs(keep, 1.0, 10, .31, .34, M.sand(), .5, 0, kw / 2 + 3.6, { ry: Math.PI });
    K.box(keep, 1.2, .12, 1.0, M.wood(), .5, 3.05, kw / 2 + .5);
    // bronze plaque over the door (the tier accent)
    const pl = new T.Mesh(new T.CylinderGeometry(.34, .34, .08, 6), M.bronze()); pl.rotation.x = Math.PI / 2; pl.position.set(.5, 5.0, kw / 2 + .06); keep.add(pl);
    // side hall with the owner's tile roof and a smoking chimney
    const hall = new T.Group(); hall.position.set(2.3, 0, -.4); g.add(hall);
    K.box(hall, 2.6, 2.6, 4.6, M.sand()); K.gable(hall, 5.0, 3.2, 1.7, ctx.roof, 0, 2.6, 0, { ry: Math.PI / 2 });
    K.box(hall, .6, 2.2, .6, M.sand(), .7, 3.1, -1.4); K.smoke(hall, .7, 5.4, -1.4, { n: 10, size: .45, rise: 3.5, life: 4, alpha: .4, drift: .8 });
    K.door(hall, .9, 1.4, -1.31, 0, .8, { ry: -Math.PI / 2 }); K.win(hall, .4, .55, 1.31, 1.2, -.6, { ry: Math.PI / 2 }); K.win(hall, .4, .55, 1.31, 1.2, .9, { ry: Math.PI / 2 });
    // hoarding balcony + long wall banner (lv 33+)
    if (st >= 1) { for (const [x, z, w, d] of [[0, kw / 2 + .45, kw + 1.2, .6], [0, -kw / 2 - .45, kw + 1.2, .6], [kw / 2 + .45, 0, .6, kw + .1], [-kw / 2 - .45, 0, .6, kw + .1]]) { K.box(keep, w, .9, d, M.darkWood(), x, kh - .9, z); K.box(keep, w + .1, .1, d + .2, M.wood(), x, kh, z); }
      if (ctx.owned) K.banner(keep, { x: -.95, y: kh - 1.4, z: kw / 2 + .5, w: 1.05, h: 3.8, mat: ctx.cloth }); }
    // gate arch, courtyard well and a brazier on the battlement (lv 41+)
    if (st >= 1) { const gt = new T.Group(); gt.position.set(1.6, 0, 4.45); g.add(gt);
      for (const s of [-1, 1]) K.box(gt, .9, 3.0, .9, M.sand(), s * 1.25, 0, 0);
      K.box(gt, 3.4, .8, 1.0, M.sand(), 0, 2.6, 0); K.merlons(gt, { w: 3.3, d: .8 }, 3.4, M.cap(), { size: .38, h: .4 });
      K.wall(g, -4.6, 4.45, .6, 4.45, 1.3, .5, M.sand(), { cap: M.cap() }); K.wall(g, 2.9, 4.45, 4.6, 4.45, 1.3, .5, M.sand(), { cap: M.cap() });
      const wl = new T.Group(); wl.position.set(-2.8, 0, 2.6); g.add(wl); K.cyl(wl, .7, .75, .7, M.field(), 0, 0, 0, { seg: 12 }); K.water(wl, { r: .55, y: .6 });
      for (const s of [-1, 1]) K.cyl(wl, .05, .05, 1.6, M.darkWood(), s * .6, .6, 0, { seg: 5 }); K.box(wl, 1.3, .06, .06, M.darkWood(), 0, 2.15, 0); K.gable(wl, 1.1, 1.5, .5, M.darkWood(), 0, 2.2, 0);
      K.cyl(keep, .32, .22, .3, M.iron(), kw / 2 - .1, kh + .9, kw / 2 - .1, { seg: 8 }); K.flameAt(keep, kw / 2 - .1, kh + 1.15, kw / 2 - .1, { size: .2, power: 16, range: 12 }); }
    // the one tall flag pole on top of the keep
    if (ctx.owned) K.flag(keep, { x: -.6, y: kh + .6, z: -.6, poleH: 3.2, w: 1.7, h: .95, mat: ctx.cloth, knob: M.bronze(), dir: .25 });
    else K.cyl(keep, .05, .06, 3.2, M.darkWood(), -.6, kh + .6, -.6, { seg: 6 });
    K.barrel(g, 3.9, 0, 3.0); K.barrel(g, 3.4, 0, 3.4); K.crate(g, -3.9, 0, -3.8, .6, .2);
    g.userData = { top: kh + 3.9, radius: 5.2, smoke: [[kx, kh + .8, kz], [2.3, 4.2, -.4]] };
    return g;
  }

  // ---------------- Tier 3 · Burg (lv 50-79): wide slate walls, 4 small owner cones, flat keep top, moat ----------------
  function burg(ctx) {
    const g = new T.Group(), st = stepOf(ctx.level), H = 5.1, TH = 5.7, wh = 3.4, wt = .85;
    plate(g, 9.0, M.grass(), { wobble: .04, h: .08 });
    // moat with a stone edge
    K.water(g, { ring: [6.55, 8.2], y: .15 });
    const edge = new T.Mesh(new T.RingGeometry(8.2, 8.6, 56), M.cap()); edge.rotation.x = -Math.PI / 2; edge.position.y = .17; edge.receiveShadow = true; g.add(edge);
    const edge2 = new T.Mesh(new T.RingGeometry(6.2, 6.55, 56), M.cap()); edge2.rotation.x = -Math.PI / 2; edge2.position.y = .17; edge2.receiveShadow = true; g.add(edge2);
    squarePlate(g, 2 * H, 2 * H, .14, M.cobble(), 0);
    // curtain walls (slate, light capstones); merlons from lv 60
    const walls = [[-H, -H, H, -H], [H, -H, H, H], [-H, H, -1.4, H], [1.4, H, H, H], [-H, H, -H, -H]];
    for (const [a, b, c, d] of walls) K.wall(g, a, b, c, d, wh, wt, M.slate(), { cap: M.cap(), merlons: st >= 1, size: .45 });
    // gate: towers only from lv 70, otherwise a simple arch
    if (st >= 1) { for (const s of [-1, 1]) { K.box(g, 1.6, wh + 1.6, 1.8, M.slate(), s * 1.9, 0, H); K.box(g, 1.75, .2, 1.95, M.cap(), s * 1.9, wh + 1.6, H); K.merlons(g, { w: 1.6, d: 1.8, x: s * 1.9, z: H }, wh + 1.8, M.cap(), { size: .35, h: .45 }); }
      if (ctx.owned) for (const s of [-1, 1]) K.banner(g, { x: s * 1.9, y: wh + 1.2, z: H + .92, w: .95, h: 3.2, mat: ctx.cloth }); }
    K.box(g, 2.8, 1.0, wt + .1, M.slate(), 0, wh - 1.0, H); K.box(g, 2.9, .18, wt + .25, M.cap(), 0, wh, H);
    K.door(g, 2.2, 2.4, 0, 0, H + .44, { mat: M.dark() });
    // bridge over the moat: plank bridge, drawbridge with chains from lv 70
    const br = new T.Group(); br.position.set(0, 0, H + .45); g.add(br);
    K.box(br, 2.2, .18, 3.3, M.wood(), 0, .12, 1.7); for (const s of [-1, 1]) { K.cyl(br, .08, .08, 1.1, M.darkWood(), s * 1.1, .2, 3.25, { seg: 5 }); }
    if (st >= 1) for (const s of [-1, 1]) K.cyl(br, .03, .03, 3.6, M.iron(), s * .95, .5, 1.6, { rx: 1.02, seg: 4 });
    // corner towers: small owner cones with iron spike finials (the tier accent)
    for (const [x, z] of [[-H, -H], [H, -H], [H, H], [-H, H]]) {
      const t = K.roundTower(g, { x, z, r: 1.35, h: TH, mat: M.slate(), roof: ctx.roof, roofH: 2.4, overhang: 1.2, seg: 14 });
      K.cyl(t, 1.42, 1.42, .2, M.cap(), 0, TH - .35, 0, { seg: 14 });
      K.cyl(t, .05, .05, .9, M.iron(), 0, TH + 2.35, 0, { seg: 5 }); K.cone(t, .09, .3, M.iron(), 0, TH + 3.2, 0, { seg: 5 });
      K.win(t, .18, .5, 0, 2.6, 1.34);
    }
    // keep: taller than the towers, FLAT crenellated top + big flag
    const kw = 4.4, kh = 10.2; const keep = new T.Group(); keep.position.set(-.6, 0, -1.3); g.add(keep);
    K.box(keep, kw, kh, kw, M.slate()); K.box(keep, kw + .3, .22, kw + .3, M.cap(), 0, kh * .5, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(keep, .7, kh + .2, .7, M.slate(), sx * kw / 2, 0, sz * kw / 2);
    K.box(keep, kw + .5, .25, kw + .5, M.cap(), 0, kh, 0); K.merlons(keep, { w: kw + .35, d: kw + .35 }, kh + .25, M.cap(), { size: .55, h: .65 });
    for (const [x, y] of [[-1.1, 3.6], [1.1, 3.6], [0, 6.2]]) K.win(keep, .32, .9, x, y, kw / 2 + .01);
    K.win(keep, .32, .9, kw / 2 + .01, 5.4, 0, { ry: Math.PI / 2 });
    if (ctx.owned) K.flag(keep, { x: 0, y: kh + .25, z: 0, poleH: 3.4, w: 2.0, h: 1.1, mat: ctx.cloth, knob: M.iron(), dir: .3 });
    else K.cyl(keep, .06, .07, 3.4, M.darkWood(), 0, kh + .25, 0, { seg: 6 });
    // hall along the back wall with the owner roof, stable, well
    const hall = new T.Group(); hall.position.set(2.6, 0, -3.1); g.add(hall); K.box(hall, 3.6, 2.4, 2.6, M.cap()); K.gable(hall, 3.9, 3.0, 1.4, ctx.roof, 0, 2.4, 0); K.win(hall, .4, .5, -.8, 1.1, 1.31); K.win(hall, .4, .5, .8, 1.1, 1.31);
    K.box(hall, .5, 1.6, .5, M.slate(), 1.2, 2.6, -.7); K.smoke(hall, 1.2, 4.3, -.7, { n: 9, size: .45, rise: 3.2, life: 4, alpha: .4 });
    const wl = new T.Group(); wl.position.set(2.6, 0, 2.2); g.add(wl); K.cyl(wl, .65, .7, .7, M.cap(), 0, 0, 0, { seg: 12 }); K.water(wl, { r: .5, y: .6 }); K.pyramid(wl, 1.5, 1.5, .7, ctx.roof, 0, 1.9, 0); for (const s of [-1, 1]) K.cyl(wl, .05, .05, 1.3, M.darkWood(), s * .55, .6, 0, { seg: 5 });
    // torches on the wall walk (lv 60+)
    if (st >= 1) for (const [x, z, li] of [[-H + 1.8, H, true], [H - 1.8, H, false], [H, 0, false], [-H, 0, true]]) K.flameAt(g, x, wh + .25, z, { size: .16, power: 12, light: li });
    K.barrel(g, -3.4, 0, 3.5); K.barrel(g, -3.9, 0, 3.1); K.crate(g, 3.8, 0, .4, .6, .3);
    g.userData = { top: kh + 3.6, radius: 8.6, smoke: [[-.6, kh + .6, -1.3], [H, H + .5, H], [2.6, 3.5, -3.1]] };
    return g;
  }

  // ---------------- Tier 4 · Zitadelle (lv 80-100): white marble terraces, gold trim, a crown of slim spires ----------------
  function zitadelle(ctx) {
    const g = new T.Group(), st = stepOf(ctx.level), lv = st >= 1 ? 95 : 80;
    // water edge and marble plaza
    K.water(g, { ring: [7.9, 9.3], y: .05 });
    const rim = new T.Mesh(new T.RingGeometry(9.3, 9.75, 64), M.marble()); rim.rotation.x = -Math.PI / 2; rim.position.y = .14; rim.receiveShadow = true; g.add(rim);
    K.cyl(g, 7.9, 7.9, .14, M.plaza(), 0, 0, 0, { seg: 64, uv: .25 });
    // two terraces (chamfered squares)
    const terr = (w, h, y, mat) => { const geo = new T.ExtrudeGeometry(K.chamfer(w), { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); K.worldUV(geo, .25); K.put(g, geo, mat, 0, y, 0);
      K.frame(g, K.chamfer, w + .16, w - .5, .12, M.gold(), y + h - .04); };
    terr(12.6, 1.0, .1, M.marble()); terr(8.8, 1.0, 1.1, M.marble());
    K.stairs(g, 2.6, 5, .2, .38, M.marble(), 0, .1, 6.3 + 5 * .38 - .1, { ry: 0 }); K.stairs(g, 2.0, 5, .2, .34, M.marble(), 0, 1.1, 4.4 + 5 * .34 - .1);
    // outer wall ring on terrace 1 with small towers
    const o = 5.9, iw = 4.1;
    for (const [a, b, c, d] of [[-o + 1.2, -o, o - 1.2, -o], [o, -o + 1.2, o, o - 1.2], [-o, -o + 1.2, -o, o - 1.2], [-o + 1.2, o, -1.5, o], [1.5, o, o - 1.2, o]]) K.wall(g, a, b, c, d, 1.4, .5, M.marble(), { y: 1.1, cap: M.gold(), merlons: true, size: .32, mh: .38 });
    for (const [x, z] of [[-o + .6, -o + .6], [o - .6, -o + .6], [o - .6, o - .6], [-o + .6, o - .6]]) { const t = K.roundTower(g, { x, z, y: 1.1, r: .8, h: 3.0, mat: M.marble(), roof: ctx.roof, roofH: 2.2, overhang: 1.25, seg: 12 }); K.sphere(t, .12, M.gold(), 0, 5.25, 0, { seg: 8 }); if (lv >= 90) K.torus(t, .98, .06, M.gold(), 0, 3.0, 0, { seg: 24 }); }
    // inner ring on terrace 2 with slim tall spire towers
    for (const [a, b, c, d] of [[-iw, -iw, iw, -iw], [iw, -iw, iw, iw], [-iw, -iw, -iw, iw], [-iw, iw, -1.2, iw], [1.2, iw, iw, iw]]) K.wall(g, a, b, c, d, 2.8, .6, M.marble(), { y: 2.1, cap: M.cap(), merlons: true, size: .36, mh: .45 });
    for (const [x, z, i] of [[-iw, -iw, 0], [iw, -iw, 1], [iw, iw, 2], [-iw, iw, 3]]) {
      const t = K.roundTower(g, { x, z, y: 2.1, r: 1.0, h: 6.2, mat: M.marble(), roof: ctx.roof, roofH: 4.2, overhang: 1.22, seg: 14 });
      K.cyl(t, 1.1, 1.1, .16, M.gold(), 0, 6.2 - .3, 0, { seg: 14 }); K.cyl(t, .03, .05, 1.0, M.gold(), 0, 10.3, 0, { seg: 5 }); K.sphere(t, .14, M.gold(), 0, 11.3, 0, { seg: 8 });
      if (lv >= 90) K.torus(t, 1.2, .07, M.gold(), 0, 6.2, 0, { seg: 28 });
      K.win(t, .22, .7, 0, 3.4, 1.0); K.win(t, .22, .7, 0, 1.6, -1.0, { ry: Math.PI });
      if (ctx.owned) K.flag(t, { x: 0, y: 10.8, z: 0, poleH: .9, w: 2.4, h: .5, mat: ctx.cloth, swallow: true, pennant: false, dir: .3 + i * .05, knob: M.gold() });
    }
    // main keep: square base → round upper tower → tall spire; two slim side spires (the spiky crown)
    const keep = new T.Group(); keep.position.set(0, 2.1, -.6); g.add(keep);
    K.box(keep, 4.2, 7.2, 4.2, M.marble()); K.box(keep, 4.45, .25, 4.45, M.gold(), 0, 7.2, 0); K.merlons(keep, { w: 4.3, d: 4.3 }, 7.45, M.cap(), { size: .4, h: .5 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { K.cyl(keep, .42, .42, 8.4, M.marble(), sx * 2.1, 0, sz * 2.1, { seg: 10 }); K.cone(keep, .5, 1.6, ctx.roof, sx * 2.1, 8.4, sz * 2.1, { seg: 10 }); K.sphere(keep, .09, M.gold(), sx * 2.1, 10.05, sz * 2.1, { seg: 6 }); }
    K.cyl(keep, 1.45, 1.6, 5.2, M.marble(), 0, 7.2, 0, { seg: 16 }); K.cyl(keep, 1.75, 1.6, .5, M.cap(), 0, 12.2, 0, { seg: 16 });
    K.merlons(keep, { r: 1.66 }, 12.7, M.cap(), { size: .32, h: .4, n: 14 });
    K.cone(keep, 1.55, 5.6, ctx.roof, 0, 12.8, 0, { seg: 16 }); if (lv >= 90) K.torus(keep, 1.6, .09, M.gold(), 0, 12.8, 0, { seg: 32 });
    for (const [x, y] of [[-.9, 2.2], [.9, 2.2], [0, 4.6]]) K.win(keep, .34, 1.0, x, y, 2.11);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; K.win(keep, .24, .8, Math.cos(a) * 1.53, 9.2, Math.sin(a) * 1.53, { ry: Math.PI / 2 - a }); }
    K.door(keep, 1.3, 2.2, 0, 0, 2.11, { mat: M.dark() });
    // prestige steps inside the tier
    const tip = 12.8 + 5.6;
    if (lv >= 85) { K.cyl(keep, .5, .35, .3, M.gold(), 0, tip, 0, { seg: 10 }); K.flameAt(keep, 0, tip + .3, 0, { size: .28, power: 24, range: 16, color: 0xfff1c8 }); }
    if (lv >= 95 && ctx.owned) for (const s of [-1, 1]) K.banner(keep, { x: s * 1.25, y: 6.7, z: 2.2, w: .9, h: 3.4, mat: ctx.cloth, emblem: M.gold() });
    if (lv >= 100) {                                                          // the armillary sphere: only level 100 has it
      const arm = new T.Group(); arm.position.set(0, tip + 1.35, 0); keep.add(arm); K.cyl(keep, .06, .06, 1.0, M.gold(), 0, tip, 0, { seg: 6 });
      const core = new T.Mesh(new T.IcosahedronGeometry(.32, 1), M.glow(0xfff0c0, 2.4)); arm.add(core);
      const rings = [0, 1.05, 2.1].map((r, i) => { const m = new T.Mesh(new T.TorusGeometry(1.05 - i * .14, .085, 6, 40), M.gold()); m.rotation.set(r, i * .7, 0); m.castShadow = true; arm.add(m); return m; });
      K.sparkles(arm, 0, -.6, 0, { color: 0xffe6a0, n: 14, r: 1.1, h: 2.2, size: .18 });
      K.tick((t) => { rings[0].rotation.y = t * .6; rings[1].rotation.x = t * .45; rings[2].rotation.z = t * .5; arm.rotation.y = t * .2; core.scale.setScalar(1 + Math.sin(t * 2.4) * .08); });
      const disc = new T.Group(); disc.position.set(0, 5.7, 2.14); keep.add(disc);
      const d1 = new T.Mesh(new T.CircleGeometry(.75, 24), ctx.owned ? ctx.cloth : M.cap()); disc.add(d1); const d2 = new T.Mesh(new T.TorusGeometry(.75, .08, 6, 32), M.glow(0xf4d58a, 1.1)); disc.add(d2);
    }
    for (const [x, z] of [[-6.8, 5.5], [6.8, 5.5], [-6.8, -5.5], [6.8, -5.5]]) K.lantern(g, x, .14, z, { h: 1.5 });
    g.userData = { top: 2.1 + tip + (lv >= 100 ? 2.4 : 1), radius: 9.75, smoke: [[0, 10, -.6], [-iw, 8, iw], [iw, 7, -iw]] };
    return g;
  }

  OW.addTier(0, { build: lager, plotR: 5.4, islandR: 11 });
  OW.addTier(1, { build: rundturm, plotR: 4.8, islandR: 10.5 });
  OW.addTier(2, { build: bergfried, plotR: 5.3, islandR: 11 });
  OW.addTier(4, { build: burg, plotR: 8.8, islandR: 14.5 });
  OW.addTier(8, { build: zitadelle, plotR: 9.9, islandR: 15.5 });
  // until a tier file is loaded, fall back to the nearest built tier below
  const defOf = (t) => { for (let i = t; i >= 0; i--) if (OW.TIERS[i]) return OW.TIERS[i]; return OW.TIERS[0]; };
  OW.models.basis = {
    label: 'Basis',
    meta: (c) => { const t = tierOf(c.level), d = defOf(t); return { tier: t, plotR: d.plotR, islandR: d.islandR + (c.capital ? 2 : 0) + (c.capital && c.capStyle === 'wasser' ? 3 : 0) }; },
    build: (ctx) => { const t = tierOf(ctx.level); const g = defOf(t).build(ctx); g.userData.tier = t; return g; }
  };
})();


// ===== Open Water Baukunst · landmarks: Tempel, Wächter-Tempel, Mega-Tempel (Thron), Tor =====
// Landmarks get shapes no normal base has, and a light element that reads from far away.
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const mats = {};
  const mat = (key, o) => { if (mats[key]) return mats[key]; const { bump, ...rest } = o; return mats[key] = Object.assign(new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, rest)), rest.map ? { bumpMap: rest.map, bumpScale: bump || .8 } : {}); };
  const sandTile = () => mat('sandTile', { color: 0xe4d2a4, map: OW.TEX.marble(), bump: .3 });
  // a vertical beam of light that fades upward (additive, no outline)
  function beam(p, x, y, z, r, h, color, o = {}) {
    const geo = new T.CylinderGeometry(r * (o.topScale || .6), r, h, 20, 1, true); geo.translate(0, h / 2, 0);
    const m = new T.Mesh(geo, new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      uniforms: { uCol: { value: new T.Color(color) }, uTime: OW.waterUniforms.uTime, uA: { value: o.alpha || .5 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uCol; uniform float uTime; uniform float uA; varying vec2 vU;
        void main(){ float f = pow(1. - vU.y, 1.6); float s = .75 + .25 * sin(vU.y * 30. - uTime * 3.); float edge = sin(vU.x * 3.14159 * 2.) * .5 + .5;
          float a = f * s * uA * (.55 + .45 * edge); gl_FragColor = vec4(uCol * a, a);
          #include <colorspace_fragment>
        }` }));
    m.position.set(x, y, z); m.userData.noOutline = true; p.add(m); return m;
  }
  // a soft coloured disc on the ground (area of influence)
  function groundGlow(p, r, color, y = .12, a = .35) {
    const m = new T.Mesh(new T.CircleGeometry(r, 48), new T.MeshBasicMaterial({ map: OW.TEX.soft(), color, transparent: true, opacity: a, depthWrite: false, blending: T.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.noOutline = true; p.add(m); return m;
  }
  function column(p, x, y, z, h, r, m, capMat) { K.box(p, r * 2.6, .25, r * 2.6, capMat || m, x, y, z); K.cyl(p, r * .92, r, h - .5, m, x, y + .25, z, { seg: 10 }); K.box(p, r * 2.6, .25, r * 2.6, capMat || m, x, y + h - .25, z); }
  function statue(p, x, y, z, ry, s, m, o = {}) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); p.add(g);
    K.box(g, 1.2, .7, 1.2, M.cap()); K.box(g, .9, .15, .9, M.gold(), 0, .7, 0);
    K.box(g, .28, 1.2, .3, m, -.2, .85, 0); K.box(g, .28, 1.2, .3, m, .2, .85, 0);
    K.box(g, .8, 1.3, .45, m, 0, 2.05, 0); K.box(g, 1.0, .3, .5, m, 0, 3.1, 0); K.sphere(g, .28, m, 0, 3.6, 0, { seg: 10 });
    K.cone(g, .3, .45, o.helm || m, 0, 3.7, 0, { seg: 8 });
    K.cyl(g, .05, .05, 3.6, M.bronze(), .62, .8, .1, { seg: 6 }); K.cone(g, .12, .45, M.bronze(), .62, 4.4, .1, { seg: 6 });
    const sh = new T.Mesh(new T.CylinderGeometry(.42, .42, .08, 12), o.shield || M.bronze()); sh.rotation.x = Math.PI / 2; sh.position.set(-.55, 2.2, .3); sh.castShadow = true; g.add(sh);
    return g;
  }

  // ================= TEMPEL: three sizes, three bonuses =================
  const T_SIZE = { klein: { w: 5.4, cols: 1, roof: 'bronze', h: 3.4 }, mittel: { w: 6.8, cols: 2, roof: 'silver', h: 3.9 }, gross: { w: 8.2, cols: 3, roof: 'gold', h: 4.4 } };
  OW.models.tempel = {
    label: 'Tempel',
    meta: () => ({ islandR: 12.5, plotR: 7.5, canCapital: false, shore: false }),
    build(ctx) {
      const g = new T.Group(), v = ctx.v, sz = T_SIZE[v.size || 'gross'], bonus = v.bonus || 'gold', W = sz.w, st = .36;
      K.cyl(g, 7.3, 7.3, .12, sandTile(), 0, 0, 0, { seg: 48, uv: .2 });
      K.torus(g, 7.3, .12, M.cap(), 0, .1, 0, { seg: 64 });
      for (let i = 0; i < 3; i++) K.box(g, W + 2.2 - i * .7, st, W + 2.2 - i * .7, M.cap(), 0, .12 + i * st, 0, { uv: .3 });
      const base = .12 + 3 * st, ww = W - .2, hc = sz.h;
      K.stairs(g, 2.2, 3, st, .4, M.cap(), 0, .12, (W + 2.2) / 2 + 1.1);
      // cella
      K.box(g, ww - 2.2, hc, ww - 2.2, M.marble(), 0, base, 0);
      K.door(g, 1.3, 2.2, 0, base, (ww - 2.2) / 2 + .01, { mat: ctx.owned ? M.window() : M.dark() });
      // columns: 4, 8 or 12 around the edge
      const n = sz.cols, pos = [];
      for (let i = 0; i <= n; i++) { const t = -ww / 2 + .4 + i * (ww - .8) / n; pos.push([t, -ww / 2 + .4], [t, ww / 2 - .4]); if (i > 0 && i < n) pos.push([-ww / 2 + .4, t], [ww / 2 - .4, t]); }
      for (const [x, z] of pos) column(g, x, base, z, hc, .26, M.marble(), M.cap());
      // entablature + roof by rarity: bronze · silver · gold stepped pyramid
      K.box(g, ww + .2, .55, ww + .2, M.cap(), 0, base + hc, 0);
      const band = K.box(g, ww + .26, .16, ww + .26, M[sz.roof](), 0, base + hc + .2, 0);
      const rb = base + hc + .55; let apex;
      if (sz.roof === 'gold') { for (let i = 0; i < 3; i++) K.box(g, ww - i * 1.3, .45, ww - i * 1.3, i % 2 ? M.cap() : M.gold(), 0, rb + i * .45, 0); K.pyramid(g, ww - 3.6, ww - 3.6, 1.6, M.gold(), 0, rb + 1.35, 0); apex = rb + 2.95; }
      else { K.pyramid(g, ww + .5, ww + .5, sz.roof === 'silver' ? 2.4 : 2.0, M[sz.roof](), 0, rb, 0); apex = rb + (sz.roof === 'silver' ? 2.4 : 2.0); }
      // the bonus element on the tip: reads from far away
      const tip = new T.Group(); tip.position.y = apex; g.add(tip); let tipTop = 1.6;
      if (bonus === 'gold') { K.cyl(tip, .1, .14, .5, M.bronze(), 0, 0, 0, { seg: 8 }); K.cyl(tip, .7, .35, .45, M.bronze(), 0, .5, 0, { seg: 12 });
        for (let i = 0; i < 5; i++) K.cyl(tip, .34, .34, .1, M.gold(), Math.sin(i * 2.1) * .12, .95 + i * .11, Math.cos(i * 2.1) * .12, { seg: 12 });
        const c = K.cyl(tip, .36, .36, .08, M.glow(OW.COL.coin, 1.2), 0, 1.6, 0, { seg: 16 }); c.rotation.x = Math.PI / 2; K.tick((t) => { c.rotation.z = t * 1.4; c.position.y = 1.7 + Math.sin(t * 2) * .1; }); tipTop = 2.2; }
      else if (bonus === 'truppen') { for (const s of [-1, 1]) { const sp = new T.Group(); sp.position.y = .1; sp.rotation.z = s * .5; tip.add(sp); K.cyl(sp, .05, .05, 2.4, M.darkWood(), 0, 0, 0, { seg: 6 }); K.cone(sp, .14, .5, M.iron(), 0, 2.4, 0, { seg: 6 }); }
        K.banner(tip, { x: 0, y: 1.9, z: .08, w: .8, h: 1.3, mat: mat('bone', { color: OW.COL.troop, side: T.DoubleSide, flatShading: false }), rod: M.bronze() }); tipTop = 2.8; }
      else { const cr = new T.Mesh(new T.OctahedronGeometry(.6, 0), new T.MeshStandardMaterial({ color: OW.COL.gem, emissive: 0x2aa6c9, emissiveIntensity: .7, metalness: .1, roughness: .15, flatShading: true }));
        cr.scale.set(1, 1.5, 1); cr.castShadow = true; tip.add(cr); const halo = new T.Sprite(new T.SpriteMaterial({ map: OW.TEX.soft(), color: 0x9fe6ff, transparent: true, opacity: .45, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.setScalar(3); halo.userData.noOutline = true; tip.add(halo);
        K.tick((t) => { cr.rotation.y = t * .9; cr.position.y = 1.2 + Math.sin(t * 1.7) * .18; halo.position.y = cr.position.y; }); tipTop = 2.4; }
      // pool in front, reward pile beside it (grows while held)
      const pz = (W + 2.2) / 2 + 2.3;
      for (const sx of [-1, 1]) { const px = sx * 3.0; K.box(g, 2.4, .35, 1.8, M.cap(), px, 0, pz); K.water(g, { rect: [2.0, 1.4], x: px, y: .3, z: pz }); }
      if (ctx.owned) {
        const pile = new T.Group(); pile.position.set(-4.9, .12, 1.6); g.add(pile);
        for (let i = 0; i < 9; i++) { const a = i * 2.4, r = .25 + (i % 3) * .22; if (bonus === 'gold') K.cyl(pile, .2, .2, .1 + (i % 4) * .08, M.gold(), Math.cos(a) * r, 0, Math.sin(a) * r, { seg: 10 });
          else if (bonus === 'gems') { const c = new T.Mesh(new T.OctahedronGeometry(.18 + (i % 3) * .05, 0), M.tint(OW.COL.gem, { roughness: .2, emissive: 0x1a6f86, emissiveIntensity: .5 })); c.position.set(Math.cos(a) * r, .2, Math.sin(a) * r); c.castShadow = true; pile.add(c); }
          else K.cyl(pile, .03, .03, 1.4, M.darkWood(), Math.cos(a) * r * .5, 0, Math.sin(a) * r * .5, { rz: .25 * Math.cos(a), rx: .25 * Math.sin(a), seg: 4 }); }
        beam(g, 0, apex + tipTop - .3, 0, .55, 36, OW.COL[ctx.owner], { alpha: .55 });
        groundGlow(g, 7.2, OW.COL[ctx.owner], .14, .22);
        for (const sx of [-1, 1]) K.flag(g, { x: sx * 1.6, y: .12, z: (W + 2.2) / 2 + 1.5, poleH: 3.2, w: 1.3, h: .7, mat: ctx.cloth, dir: .3 });
      }
      K.sparkles(g, 0, base, 0, { color: 0xffe6b0, n: 18, r: ww * .45, h: hc, size: .12, alpha: .6 });
      for (const [x, z] of [[-5.6, -4], [5.6, -4], [-5.6, 4.2], [5.6, 4.2]]) K.lantern(g, x, .12, z, { h: 1.4 });
      g.userData = { top: apex + tipTop, radius: 7.3, smoke: [[0, apex, 0], [2, base + 1, 2]] };
      return g;
    }
  };

  // ================= WÄCHTER-TEMPEL: four identities (Nebel, Gezeiten, Fels, Sonne), a visible charge and shot =================
  const ELEM = {
    nebel:    { stone: 0xd9dcdc, dome: 0xe9eef0, glow: 0xf4f7ff, metal: .55 },
    gezeiten: { stone: 0xa6c4b6, dome: 0x3f9a86, glow: 0x86e8c9, metal: .3 },
    fels:     { stone: 0x8f9087, dome: 0x6e7c58, glow: 0xcfe38a, metal: .1 },
    sonne:    { stone: 0xe8cf9f, dome: 0xe3a93c, glow: 0xffc45e, metal: .7 }
  };
  OW.models.waechter = {
    label: 'Wächter-Tempel',
    meta: () => ({ islandR: 13.5, plotR: 8, canCapital: false, shore: false }),
    build(ctx) {
      const g = new T.Group(), el = ctx.v.element || 'gezeiten', E = ELEM[el];
      const stone = mat('ws.' + el, { color: E.stone, map: OW.TEX.ashlar(), bump: .6 }), dome = mat('wd.' + el, { color: E.dome, metalness: E.metal, roughness: .35, map: OW.TEX.shingle(), bump: .4 });
      const glowM = new T.MeshStandardMaterial({ color: 0x222222, emissive: E.glow, emissiveIntensity: .15, flatShading: true });
      K.cyl(g, 7.6, 7.9, .6, stone, 0, 0, 0, { seg: 40 }); K.torus(g, 7.62, .1, M.cap(), 0, .6, 0, { seg: 64 });
      K.cyl(g, 5.8, 6.0, .6, stone, 0, .6, 0, { seg: 40 }); K.torus(g, 5.82, .1, M.gold(), 0, 1.2, 0, { seg: 64 });
      K.stairs(g, 2.4, 3, .2, .45, M.cap(), 0, 0, 7.9 + 1.2); K.stairs(g, 2.0, 3, .2, .4, M.cap(), 0, .6, 6.0 + 1.1);
      // colonnade + drum + dome
      const y0 = 1.2, hc = 4.4, rc = 3.3;
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 10; column(g, Math.cos(a) * rc, y0, Math.sin(a) * rc, hc, .24, stone, M.cap()); }
      K.cyl(g, 2.6, 2.6, hc, stone, 0, y0, 0, { seg: 24 }); K.door(g, 1.1, 2.2, 0, y0, 2.62, { mat: M.dark() });
      K.cyl(g, rc + .45, rc + .45, .6, M.cap(), 0, y0 + hc, 0, { seg: 32 }); K.torus(g, rc + .47, .09, M.gold(), 0, y0 + hc + .3, 0, { seg: 48 });
      const dy = y0 + hc + .6; K.cyl(g, rc * .92, rc * .92, .7, stone, 0, dy, 0, { seg: 32 });
      const dm = K.dome(g, rc * .9, dome, 0, dy + .7, 0, { seg: 28, seg2: 12 }); dm.scale.y = 1.1;
      const topY = dy + .7 + rc * .9 * 1.1;
      K.cyl(g, .45, .55, .6, M.cap(), 0, topY - .1, 0, { seg: 12 });
      // the element on top / around
      const focus = new T.Group(); focus.position.y = topY + .5; g.add(focus);
      if (el === 'sonne') { K.cyl(focus, .7, .35, .4, M.gold(), 0, 0, 0, { seg: 14 }); K.flameAt(focus, 0, .35, 0, { size: .45, power: 30, range: 18, color: 0xffb040 }); }
      else if (el === 'nebel') { const orb = new T.Mesh(new T.SphereGeometry(.55, 20, 14), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8eeff, emissiveIntensity: .6, roughness: .2 })); orb.position.y = .5; focus.add(orb);
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; K.smoke(g, Math.cos(a) * 6.6, .7, Math.sin(a) * 6.6, { color: 0xf1f4f6, size: 1.6, rise: .9, life: 6, alpha: .38, spread: 2.2, drift: .3, n: 10 }); } }
      else if (el === 'fels') { const shards = []; for (let i = 0; i < 6; i++) { const r = K.rock(g, 0, 0, 0, .45 + (i % 3) * .15, stone); r.userData.a = i / 6 * Math.PI * 2; r.userData.h = topY - 1.5 + (i % 2) * 1.2; shards.push(r); }
        K.tick((t) => { for (const r of shards) { const a = r.userData.a + t * .25; r.position.set(Math.cos(a) * 4.8, r.userData.h + Math.sin(t * 1.3 + r.userData.a * 2) * .35, Math.sin(a) * 4.8); r.rotation.y = t * .5 + r.userData.a; } });
        const cr = new T.Mesh(new T.DodecahedronGeometry(.55, 0), mat('lichen', { color: E.glow, emissive: E.glow, emissiveIntensity: .5 })); cr.position.y = .5; focus.add(cr); }
      else { K.cyl(focus, .5, .5, .25, M.cap(), 0, 0, 0, { seg: 14 }); }
      // front basin (gezeiten: a water column that rises when charging)
      const basin = new T.Group(); basin.position.set(0, 1.2, 4.5); g.add(basin); K.cyl(basin, 1.0, 1.05, .45, M.cap(), 0, 0, 0, { seg: 20 }); K.water(basin, { r: .88, y: .42 });
      let column3 = null; if (el === 'gezeiten') { column3 = new T.Mesh(new T.CylinderGeometry(.3, .45, 1, 16, 1, true), new T.ShaderMaterial({ uniforms: OW.waterUniforms, transparent: true, depthWrite: false, side: T.DoubleSide,
          vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
          fragmentShader: `uniform float uTime; varying vec2 vU; void main(){ float s = fract(vU.y * 3. - uTime * 2. + sin(vU.x * 18.) * .1); vec3 c = mix(vec3(.45,.8,.74), vec3(.95,1.,.97), smoothstep(.6,1.,s)); gl_FragColor = vec4(c, .75);
            #include <colorspace_fragment>
          }` })); column3.geometry.translate(0, .5, 0); column3.position.y = .42; column3.userData.noOutline = true; basin.add(column3); }
      // four obelisks with rune strips and floating rings
      const obs = [];
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5, o = new T.Group(); o.position.set(x, .6, z); o.rotation.y = -a; g.add(o);
        K.box(o, 1.3, .5, 1.3, M.cap()); const sh = new T.CylinderGeometry(.32, .55, 5.6, 4); sh.rotateY(Math.PI / 4); sh.translate(0, 3.3, 0); K.worldUV(sh, .3); K.put(o, sh, stone);
        K.pyramid(o, .6, .6, .7, M.gold(), 0, 6.1, 0);
        const runes = []; for (let k = 0; k < 4; k++) { const r = K.box(o, .12, .7, .06, glowM.clone(), 0, 1.2 + k * 1.15, .45 - k * .035, { cast: false }); runes.push(r); }
        const rings = [3.2, 4.4].map((y, k) => { const r = K.torus(o, .95 - k * .12, .08, M.gold(), 0, y, 0, { seg: 32 }); r.userData.y0 = y; return r; });
        if (ctx.owned) K.flag(o, { x: 0, y: 6.75, z: 0, poleH: 1.3, w: 1.2, h: .45, mat: ctx.cloth, pennant: true, dir: a });
        obs.push({ runes, rings }); }
      // charge → shot at the throne (the real game fires every 3 min; here every 10 s)
      const dir = new T.Vector3(-1, .18, -1).normalize(), len = 60;
      const bgeo = new T.CylinderGeometry(.28, .28, len, 12, 1, true); bgeo.translate(0, len / 2, 0);
      const bmat = new T.MeshBasicMaterial({ color: E.glow, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
      const bm = new T.Mesh(bgeo, bmat); bm.position.set(0, topY + .6, 0); bm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); bm.userData.noOutline = true; g.add(bm);
      const core = new T.Mesh(bgeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); core.scale.set(.35, 1, .35); core.position.copy(bm.position); core.quaternion.copy(bm.quaternion); core.userData.noOutline = true; g.add(core);
      const flash = new T.PointLight(E.glow, 0, 30, 1.4); flash.position.set(0, topY + 1, 0); g.add(flash);
      const period = 10;
      K.tick((t, env) => { const k = (t + 3) % period;
        const charge = k < 5 ? 0 : k < 8 ? (k - 5) / 3 : k < 8.7 ? 1 : Math.max(0, 1 - (k - 8.7) / 1.3);
        for (const o of obs) { o.rings.forEach((r, i) => { r.position.y = r.userData.y0 + charge * (1.1 + i * .4); r.rotation.z = Math.sin(t * .8 + i) * .08; r.scale.setScalar(1 + charge * .15); });
          o.runes.forEach((r, i) => { r.material.emissiveIntensity = .15 + (charge * 4 > i ? 2.6 : 0) + env.night * .4; }); }
        glowM.emissiveIntensity = .2 + charge * 2;
        const fire = k >= 8 && k < 8.7 ? 1 - (k - 8) / .7 : 0; bmat.opacity = fire * .8; core.material.opacity = fire; flash.intensity = fire * 400 + charge * 30;
        if (column3) column3.scale.set(1, .4 + charge * 5.5, 1); });
      g.userData = { top: topY + 1.6, radius: 7.9, smoke: [[0, topY, 0], [3, 3, 3]] };
      return g;
    }
  };

  // ================= MEGA-TEMPEL (Thron): terraced water basin, drum, gold dome, core + light column in the holder's colour =================
  OW.models.mega = {
    label: 'Mega-Tempel',
    meta: () => ({ islandR: 24, plotR: 17, canCapital: false, shore: false }),
    build(ctx) {
      const g = new T.Group(), held = ctx.owned, col = held ? OW.COL[ctx.owner] : 0xfff0c0;
      const chamfer = (w) => { const s = new T.Shape(), c = w * .16, a = w / 2; s.moveTo(-a + c, -a); s.lineTo(a - c, -a); s.lineTo(a, -a + c); s.lineTo(a, a - c); s.lineTo(a - c, a); s.lineTo(-a + c, a); s.lineTo(-a, a - c); s.lineTo(-a, -a + c); s.closePath(); return s; };
      const slab = (w, h, y, m) => { const geo = new T.ExtrudeGeometry(chamfer(w), { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); K.worldUV(geo, .2); return K.put(g, geo, m, 0, y, 0); };
      // outer basin
      K.water(g, { ring: [14.2, 17.2], y: .05 }); const rim = new T.Mesh(new T.RingGeometry(17.2, 17.9, 72), M.marble()); rim.rotation.x = -Math.PI / 2; rim.position.y = .16; rim.receiveShadow = true; g.add(rim);
      K.cyl(g, 14.2, 14.2, .14, M.plaza(), 0, 0, 0, { seg: 72, uv: .15 });
      const TER = [[24, 1.4], [17.5, 1.4], [12, 1.4]]; let y = .14;
      TER.forEach(([w, h], i) => { slab(w, h, y, M.marble()); K.frame(g, (x) => chamfer(x), w + .16, w - .6, .14, M.gold(), y + h - .06);
        // a water channel on each terrace top, spilling at the corners
        if (i < 2) { const nw = TER[i + 1][0], mid = (w + nw) / 4; for (const [x, z, ry] of [[0, mid, 0], [0, -mid, 0], [mid, 0, Math.PI / 2], [-mid, 0, Math.PI / 2]]) K.water(g, { rect: [w * .42, .7], x, y: y + h + .02, z, ry });
          for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, d = w / 2 * .92 * Math.SQRT1_2 * 1.02; K.waterfall(g, Math.cos(a) * d, y + h + .02, Math.sin(a) * d, 1.3, h + .05, { ry: -a + Math.PI / 2 }); } }
        // grand stairs on all four sides
        for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; const st = K.stairs(g, 3.2 - i * .3, 5, h / 5, .4, M.cap(), Math.sin(a) * (w / 2 + 2), y, Math.cos(a) * (w / 2 + 2), { ry: a }); }
        y += h; });
      // drum colonnade, gold dome, lantern
      const rc = 4.2, hc = 4.8;
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; column(g, Math.cos(a) * rc, y, Math.sin(a) * rc, hc, .3, M.marble(), M.cap()); }
      K.cyl(g, 3.5, 3.5, hc, M.cap(), 0, y, 0, { seg: 32 }); K.door(g, 1.6, 2.8, 0, y, 3.51, { mat: held ? M.window() : M.dark() });
      K.cyl(g, rc + .55, rc + .55, .7, M.marble(), 0, y + hc, 0, { seg: 40 }); K.torus(g, rc + .57, .12, M.gold(), 0, y + hc + .35, 0, { seg: 64 });
      const dy = y + hc + .7; K.cyl(g, rc * .95, rc * .95, .9, M.marble(), 0, dy, 0, { seg: 40 });
      const dm = K.dome(g, rc * .92, M.gold(), 0, dy + .9, 0, { seg: 32, seg2: 14 }); dm.scale.y = 1.2;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const rib = new T.Mesh(new T.TorusGeometry(rc * .93, .06, 4, 24, Math.PI / 2), M.cap()); rib.rotation.set(0, a, Math.PI / 2); rib.scale.set(1.2, 1, 1); rib.position.set(0, dy + .9, 0); g.add(rib); }
      const ly = dy + .9 + rc * .92 * 1.2; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.cyl(g, .07, .07, 1.2, M.gold(), Math.cos(a) * .75, ly - .1, Math.sin(a) * .75, { seg: 6 }); }
      K.cone(g, 1.0, 1.4, M.gold(), 0, ly + 1.1, 0, { seg: 16 });
      // core orb + light column (holder's colour; white-gold when nobody holds the throne)
      const orb = new T.Mesh(new T.IcosahedronGeometry(.75, 1), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: .3, flatShading: true })); orb.position.y = ly + 3.6; g.add(orb);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: OW.TEX.soft(), color: col, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.setScalar(5); halo.position.y = orb.position.y; halo.userData.noOutline = true; g.add(halo);
      beam(g, 0, ly + 3.6, 0, .9, 70, col, { alpha: .45, topScale: .9 });
      // two thin gold rings circling the dome (seen close up)
      const rings = [[rc + 2.2, .35], [rc + 3.0, -.5]].map(([r, tilt]) => { const m = new T.Mesh(new T.TorusGeometry(r, .16, 6, 72), M.gold()); m.rotation.x = Math.PI / 2 + tilt; m.position.y = dy + 2.2; m.castShadow = true; g.add(m); return m; });
      K.tick((t) => { rings[0].rotation.z = t * .15; rings[1].rotation.z = -t * .11; orb.rotation.y = t * .6; orb.position.y = ly + 3.6 + Math.sin(t * 1.2) * .2; halo.position.y = orb.position.y; halo.material.opacity = .45 + Math.sin(t * 2) * .1; });
      // the throne itself, on a dais in front of the drum
      const th = new T.Group(); th.position.set(0, y, rc + 1.9); g.add(th);
      K.box(th, 3.2, .3, 2.2, M.cap()); K.box(th, 2.4, .3, 1.6, M.marble(), 0, .3, -.1); K.box(th, 1.2, .5, .9, M.gold(), 0, .6, -.2); K.box(th, 1.2, 1.9, .22, M.gold(), 0, .6, -.6);
      K.cone(th, .6, .5, M.gold(), 0, 2.5, -.6, { seg: 4 }); for (const s of [-1, 1]) K.box(th, .2, .5, .9, M.gold(), s * .6, 1.0, -.2);
      K.box(th, 1.0, .12, .7, held ? ctx.cloth : M.tint(0x7a2a2a), 0, 1.1, -.15);
      // held: banners down all four stairways · free: guardian statues on the stairs
      if (held) { for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; for (const side of [-1, 1]) K.banner(g, { x: Math.sin(a) * 6.1 + Math.cos(a) * side * 2.6, y: 4.15, z: Math.cos(a) * 6.1 - Math.sin(a) * side * 2.6, ry: a, w: 1.1, h: 3.8, mat: ctx.cloth, emblem: M.gold() }); } }
      else for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2 + Math.PI / 4; statue(g, Math.sin(a) * 9.3, 2.94, Math.cos(a) * 9.3, a, 1.05, M.bronze(), { shield: M.gold() }); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; K.lantern(g, Math.cos(a) * 13.4, .14, Math.sin(a) * 13.4, { h: 1.8 }); }
      K.sparkles(g, 0, y, 0, { color: 0xffe6a0, n: 24, r: 7, h: 9, size: .2, alpha: .7 });
      g.userData = { top: ly + 5, radius: 17.9, smoke: [[0, ly, 0], [5, 4, 5], [-5, 3, -4]] };
      return g;
    }
  };

  // ================= TOR: graded by the ring it guards; the portcullis is alive =================
  OW.models.tor = {
    label: 'Tor',
    meta: () => ({ islandR: 14, plotR: 6, canCapital: false, shore: false, river: 3.6, camAz: .55, clear: (x, z) => Math.abs(x) < 2.6 }),
    build(ctx) {
      const g = new T.Group(), v = ctx.v, grade = v.grade || 'grenz', owned = ctx.owned, open = owned && v.open !== false;
      const RIV = 3.6, GZ = v.houseOnly ? 0 : 6.2;                  // river half width, gate position on the outer bank (+z); houseOnly = just the gatehouse (map sprite)
      const road = grade === 'grenz' ? M.dirt() : grade === 'waechter' ? M.cobble() : M.plaza();
      if (!v.houseOnly) for (const s of [-1, 1]) K.box(g, 3.2, .1, 10.5, road, 0, 0, s * (RIV + 5.4), { cast: false, uv: .25 });
      // bridge
      const deckY = grade === 'grenz' ? .55 : .75, BL = RIV * 2 + 1.2;
      if (v.houseOnly) { /* no bridge */ } else if (grade === 'grenz') { K.box(g, 3.0, .22, BL, M.wood(), 0, deckY - .2, 0, { uv: .5 });
        for (const z of [-2.2, 0, 2.2]) for (const s of [-1, 1]) K.cyl(g, .16, .16, 2.0, M.darkWood(), s * 1.25, -1.4, z, { seg: 6 });
        for (const s of [-1, 1]) { K.box(g, .1, .1, BL, M.rawWood(), s * 1.45, deckY + .75, 0); for (let z = -RIV; z <= RIV; z += 1.2) K.cyl(g, .06, .06, .8, M.rawWood(), s * 1.45, deckY, z, { seg: 5 }); } }
      else { const bm = grade === 'thron' ? M.marble() : M.field(); const sh = new T.Shape(), hl = BL / 2;
        sh.moveTo(-hl, -1.2); sh.lineTo(-hl, deckY); sh.quadraticCurveTo(0, deckY + .7, hl, deckY); sh.lineTo(hl, -1.2); sh.lineTo(hl - 1.1, -1.2); sh.quadraticCurveTo(0, deckY - .2, -hl + 1.1, -1.2); sh.closePath();
        const geo = new T.ExtrudeGeometry(sh, { depth: 3.2, bevelEnabled: false }); geo.translate(0, 0, -1.6); geo.rotateY(Math.PI / 2); K.worldUV(geo, .3); K.put(g, geo, bm);
        for (const s of [-1, 1]) { const par = K.box(g, .3, .55, BL, grade === 'thron' ? M.marble() : M.field(), s * 1.45, deckY + .2, 0); if (grade === 'thron') K.box(g, .36, .1, BL, M.gold(), s * 1.45, deckY + .75, 0); }
        if (grade === 'thron') for (const z of [-RIV, 0, RIV]) for (const s of [-1, 1]) K.lantern(g, s * 1.45, deckY + .75, z, { h: 1.1 }); }
      // lit path when the gate is open and owned
      if (open && !v.houseOnly) { const path = new T.Mesh(new T.PlaneGeometry(1.1, BL + 6), new T.MeshBasicMaterial({ color: 0xffc977, transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false, map: OW.TEX.soft() }));
        path.rotation.x = -Math.PI / 2; path.position.set(0, deckY + .45, 1); path.userData.noOutline = true; g.add(path); }
      // gatehouse
      const gh = new T.Group(); gh.position.set(0, 0, GZ); g.add(gh); let gateW = 2.4, gateH = 3.0, top = 7;
      if (grade === 'grenz') {
        for (const s of [-1, 1]) K.box(gh, 1.4, 3.0, 2.8, M.field(), s * 1.95, 0, 0);
        K.box(gh, 5.4, 2.2, 3.2, M.rawWood(), 0, 3.0, 0, { uv: .3 }); K.box(gh, 5.7, .25, 3.5, M.darkWood(), 0, 3.0, 0);
        for (let i = 0; i < 6; i++) K.box(gh, .14, 2.2, .14, M.darkWood(), -2.6 + i * 1.04, 3.0, 1.62);
        K.gable(gh, 5.9, 3.8, 1.7, ctx.roof, 0, 5.2, 0); K.box(gh, 1.2, .1, 3.0, M.darkWood(), 0, 3.0, 0);
        K.win(gh, .5, .4, -1.3, 3.9, 1.61); K.win(gh, .5, .4, 1.3, 3.9, 1.61); gateH = 3.0; top = 6.9;
        K.flameAt(gh, 1.6, 2.2, 1.65, { size: .14, power: 9 }); K.flameAt(gh, -1.6, 2.2, 1.65, { size: .14, power: 9, light: false });
      } else if (grade === 'waechter') {
        K.box(gh, 5.2, 5.4, 3.4, M.field()); K.box(gh, 5.5, .25, 3.7, M.cap(), 0, 5.4, 0); K.merlons(gh, { w: 5.3, d: 3.5 }, 5.65, M.cap(), { size: .42, h: .55 });
        for (const s of [-1, 1]) { const t = K.roundTower(gh, { x: s * 2.9, z: .4, r: 1.35, h: 7.2, mat: M.field(), roof: ctx.roof, roofH: 3.0, overhang: 1.2, seg: 14 }); K.win(t, .2, .7, 0, 4.2, 1.34); K.cyl(t, 1.42, 1.42, .2, M.cap(), 0, 6.8, 0, { seg: 14 }); }
        gateW = 2.6; gateH = 3.4; top = 10.8;
        K.flameAt(gh, 1.8, 2.6, 1.75, { size: .15, power: 10 }); K.flameAt(gh, -1.8, 2.6, 1.75, { size: .15, power: 10, light: false });
      } else {
        for (const s of [-1, 1]) { K.box(gh, 2.0, 7.6, 3.0, M.marble(), s * 2.6, 0, 0); K.box(gh, 2.2, .25, 3.2, M.gold(), s * 2.6, 7.6, 0); }
        K.box(gh, 7.2, 2.4, 3.2, M.marble(), 0, 7.6, 0); K.box(gh, 7.4, .3, 3.4, M.gold(), 0, 8.4, 0); K.box(gh, 7.5, .4, 3.5, M.cap(), 0, 10.0, 0);
        const arch = new T.Shape(); arch.moveTo(-1.6, 0); arch.lineTo(-1.6, 5.4); arch.absarc(0, 5.4, 1.6, Math.PI, 0, true); arch.lineTo(1.6, 0); arch.closePath();
        const trim = new T.Mesh(new T.TorusGeometry(1.66, .14, 6, 24, Math.PI), M.gold()); trim.position.set(0, 3.8, 1.64); gh.add(trim);
        const sp = new T.Shape(); sp.moveTo(-1.6, 3.8); sp.lineTo(-1.6, 7.6); sp.lineTo(1.6, 7.6); sp.lineTo(1.6, 3.8); sp.lineTo(1.58, 3.8); sp.absarc(0, 3.8, 1.58, 0, Math.PI, false); sp.lineTo(-1.6, 3.8);
        const spg = new T.ExtrudeGeometry(sp, { depth: 3.0, bevelEnabled: false }); spg.translate(0, 0, -1.5); K.worldUV(spg, .25); K.put(gh, spg, M.marble());
        for (const s of [-1, 1]) statue(gh, s * 5.0, 0, .6, 0, 1.55, M.marble(), { shield: M.gold(), helm: M.gold() });
        K.box(gh, 4.6, .8, 2.4, M.marble(), 0, 10.4, 0); K.box(gh, 4.8, .14, 2.6, M.gold(), 0, 11.2, 0);
        for (const s of [-1, 1]) { K.sphere(gh, .38, M.gold(), s * 3.3, 10.8, 1.2, { seg: 12 }); K.sphere(gh, .38, M.gold(), s * 3.3, 10.8, -1.2, { seg: 12 }); }
        const sunDisc = new T.Mesh(new T.CylinderGeometry(.75, .75, .12, 20), M.gold()); sunDisc.rotation.x = Math.PI / 2; sunDisc.position.set(0, 6.4, 1.56); sunDisc.castShadow = true; gh.add(sunDisc);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(gh, .1, .38, .06, M.gold(), Math.cos(a) * 1.02, 6.4 - .19 + Math.sin(a) * 1.02, 1.56, { rz: a - Math.PI / 2 }); }
        gateW = 3.2; gateH = 5.4; top = 11.3;
      }
      // the arch opening: dark void
      const hole = new T.Shape(); hole.moveTo(-gateW / 2, 0); hole.lineTo(-gateW / 2, gateH - gateW / 2); hole.absarc(0, gateH - gateW / 2, gateW / 2, Math.PI, 0, true); hole.lineTo(gateW / 2, 0); hole.closePath();
      const FACE = grade === 'grenz' ? 1.4 : grade === 'waechter' ? 1.7 : 1.5, HZ = FACE - .5;          // dark passage inside, portcullis just behind the face
      for (const s of [-1, 1]) { const hm = new T.Mesh(new T.ShapeGeometry(hole), M.dark()); hm.position.set(0, .02, s * HZ); gh.add(hm); }
      // portcullis: raised when open, lowered when shut (unowned gates are always shut)
      const pc = new T.Group(); gh.add(pc); const bars = gateW - .2;
      const PZ = FACE - .16;
      for (let i = 0; i <= 5; i++) K.box(pc, .1, gateH - .1, .1, M.iron(), -bars / 2 + i * bars / 5, 0, PZ);
      for (let j = 1; j <= 4; j++) K.box(pc, bars + .1, .09, .1, M.iron(), 0, j * (gateH - .2) / 4.5, PZ);
      for (let i = 0; i <= 5; i++) K.cone(pc, .08, .25, M.iron(), -bars / 2 + i * bars / 5, -.2, PZ, { rx: Math.PI });
      let pcY = open ? gateH - .3 : 0; pc.position.y = pcY;
      if (grade !== 'grenz') for (const s of [-1, 1]) K.cyl(gh, .03, .03, 2.2, M.iron(), s * (bars / 2), gateH + .2, PZ + .02, { seg: 4 });
      K.tick((t, env) => { const goal = open ? gateH - .3 : 0; pcY += (goal - pcY) * Math.min(1, env.dt * 2.5); pc.position.y = pcY; });
      // one oversized owner flag on top; a toll coin turning over an open gate
      if (owned) K.flag(gh, { x: 0, y: top, z: 0, poleH: 3.4, w: 2.8, h: 1.5, mat: ctx.cloth, dir: .35 });
      if (open) { const coin = new T.Group(); coin.position.set(0, top + (owned ? 4.4 : 1.2), 0); gh.add(coin);
        const c = new T.Mesh(new T.CylinderGeometry(.6, .6, .12, 24), M.gold()); c.rotation.x = Math.PI / 2; coin.add(c); const e = new T.Mesh(new T.TorusGeometry(.6, .05, 6, 24), M.glow(OW.COL.coin, .8)); coin.add(e);
        K.tick((t) => { coin.rotation.y = t * 1.6; coin.position.y = top + 4.4 + Math.sin(t * 1.8) * .15; }); }
      else if (!owned) { const ward = new T.Mesh(new T.RingGeometry(.55, .75, 6), M.glow(0xe8e2cf, .6)); ward.position.set(0, gateH + .45, FACE + .06); gh.add(ward); }
      g.userData = { top: top + (owned ? 5 : 1.5), radius: 7, smoke: [[0, top - 1, GZ], [1.5, deckY + 1, 0]] };
      return g;
    }
  };
})();


// ===== Open Water Baukunst · a base on fire: you have to SEE it, close up and as a tiny sprite =====
// 'brand'  = burning: flames on the highest roofs, a tall dark smoke column, embers, fire light, scorched ground, sooty walls
// 'qualm'  = burnt out: sooty walls, scorched ground, thinner grey smoke and glowing embers, no flames
(function () {
  const T = THREE, K = OW.K;
  let flameTex = null, smokeTex = null;
  function flameTexture() {
    if (flameTex) return flameTex;
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S * .62, 2, S / 2, S * .6, S * .48);
    gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(.25, 'rgba(255,225,120,.95)'); gr.addColorStop(.55, 'rgba(255,140,40,.7)'); gr.addColorStop(1, 'rgba(200,50,10,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(S / 2, 4); g.bezierCurveTo(S * .78, S * .38, S * .95, S * .7, S / 2, S * .98); g.bezierCurveTo(S * .05, S * .7, S * .22, S * .38, S / 2, 4); g.fill();
    flameTex = new T.CanvasTexture(c); flameTex.colorSpace = T.SRGBColorSpace; return flameTex;
  }
  function smokeTexture() {
    if (smokeTex) return smokeTex;
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    for (let i = 0; i < 7; i++) { const x = S / 2 + (Math.random() - .5) * S * .35, y = S / 2 + (Math.random() - .5) * S * .35, r = S * (.22 + Math.random() * .16);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
    smokeTex = new T.CanvasTexture(c); smokeTex.colorSpace = T.SRGBColorSpace; return smokeTex;
  }

  // pick up to n fire spots ON the upper surfaces (roofs, wall tops), spread apart in 3D (farthest-point sampling)
  function spots(model, n, top, spread) {
    model.updateMatrixWorld(true); const pts = [], v = new T.Vector3(), box = new T.Box3(), sz = new T.Vector3();
    model.traverse(o => { if (!o.isMesh || !o.geometry || o.userData.noOutline || !o.geometry.attributes.position || (o.material && (o.material.transparent || o.material.side === T.DoubleSide))) return;
      box.setFromObject(o); box.getSize(sz); if (sz.x * sz.z < .12 && sz.y < 1.5) return;
      const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 60));
      for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y > top * .35 && v.y < top * .97) pts.push(v.clone()); } });
    if (!pts.length) return [];
    pts.sort((a, b) => b.y - a.y); const out = [pts[Math.min(pts.length - 1, Math.floor(pts.length * .04))]];
    const dmin = pts.map(p => p.distanceTo(out[0]));
    while (out.length < n) { let bi = -1, bd = spread; for (let i = 0; i < pts.length; i++) if (dmin[i] > bd) { bd = dmin[i]; bi = i; }
      if (bi < 0) break; out.push(pts[bi]); for (let i = 0; i < pts.length; i++) dmin[i] = Math.min(dmin[i], pts[i].distanceTo(pts[bi])); }
    return out;
  }
  // sooty walls: darker copies of the materials (the shared ones stay untouched)
  function soot(model, k) {
    const cache = new Map();
    model.traverse(o => { if (!o.isMesh || !o.material || o.userData.noOutline || o.material.isShaderMaterial || o.material.transparent || o.material.side === T.DoubleSide) return;
      const key = o.material.userData && o.material.userData.key || '', roof = key.startsWith('roof.'), glow = o.material.emissive && o.material.emissive.getHex() !== 0 && o.material.emissiveIntensity > .5;
      if (glow) return;
      let m = cache.get(o.material); if (!m) { m = o.material.clone(); if (m.color) m.color.multiplyScalar(roof ? .62 : k); cache.set(o.material, m); } o.material = m; });
  }

  function build(p, model, info, mode) {
    const g = new T.Group(); p.add(g); const top = info.top, rad = info.rad, burning = mode === 'brand';
    soot(model, mode === 'russ' ? .5 : burning ? .3 : .28);
    // scorched ground
    const sc = new T.Mesh(new T.CircleGeometry(rad * 1.15, 40), new T.MeshBasicMaterial({ map: OW.TEX.soft(), color: 0x000000, transparent: true, opacity: .55, depthWrite: false }));
    sc.rotation.x = -Math.PI / 2; sc.position.y = .23 + (info.lift || 0) * 0; sc.userData.noOutline = true; g.add(sc);
    const scale = Math.max(1, Math.min(2.2, rad / 4.6));
    if (mode === 'russ') return g;                         // soot + scorched ground only (the map scene animates fire in 2D)
    const pts = spots(model, burning ? Math.max(4, Math.min(7, Math.round(rad * .7))) : 3, top, Math.max(1.6, rad * .38));
    const fires = [], smokes = [];
    pts.forEach((pt, i) => {
      if (burning) {
        const f = { pos: pt, parts: [] };
        for (let k = 0; k < 20; k++) { const core = k % 5 < 2; const s = new T.Sprite(new T.SpriteMaterial({ map: flameTexture(), color: core ? 0xfff2c0 : 0xff7418, transparent: true, depthWrite: false, blending: core ? T.AdditiveBlending : T.NormalBlending, opacity: 0, toneMapped: false }));
          s.userData = { noOutline: true, age: Math.random(), life: .55 + Math.random() * .5, dx: 0, dz: 0, core }; s.renderOrder = core ? 3 : 2; g.add(s); f.parts.push(s); }
        const glow = new T.Sprite(new T.SpriteMaterial({ map: OW.TEX.soft(), color: 0xff8a2a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .55 }));
        glow.userData.noOutline = true; glow.position.copy(pt).add(new T.Vector3(0, .8 * scale, 0)); glow.scale.setScalar(4.2 * scale); g.add(glow); f.glow = glow;
        fires.push(f);
        K.sparkles(g, pt.x, pt.y, pt.z, { color: 0xffa040, n: 10, r: .9 * scale, h: 5 * scale, size: .16 * scale, alpha: 1 });
      }
      // smoke: a tall dark column from every fire, drifting with the wind
      const sm = { pos: pt, parts: [] };
      for (let k = 0; k < (burning ? 14 : 9); k++) { const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTexture(), color: burning ? 0x2c2622 : 0x4a4642, transparent: true, depthWrite: false, opacity: 0 }));
        s.userData = { noOutline: true, age: Math.random() * 5, rot: Math.random() * 6 }; g.add(s); sm.parts.push(s); }
      smokes.push(sm);
      if (!burning) K.sparkles(g, pt.x, pt.y - .2, pt.z, { color: 0xff7a2a, n: 6, r: .6, h: 1.2, size: .12, alpha: .9 });
    });
    // fire light: at most two real lights
    const lights = [];
    if (burning) for (let i = 0; i < Math.min(2, pts.length); i++) { const L = new T.PointLight(0xff8a3a, 0, 14 * scale, 1.6); L.position.copy(pts[i]).add(new T.Vector3(0, 1.5, 0)); g.add(L); lights.push(L); }
    const wind = new T.Vector3(1, 0, -.35).normalize();
    K.tick((t, env) => {
      const dt = env.dt || .016;
      for (const f of fires) { for (const s of f.parts) { const u = s.userData; u.age += dt / u.life;
          if (u.age >= 1) { u.age -= 1; u.dx = (Math.random() - .5) * .9 * scale; u.dz = (Math.random() - .5) * .9 * scale; }
          const a = u.age, h = a * 3.4 * scale, w = u.core ? .7 : 1; s.position.set(f.pos.x + u.dx * (1 - a * .5) + wind.x * a * .8, f.pos.y + h + (u.core ? -.2 : 0), f.pos.z + u.dz * (1 - a * .5) + wind.z * a * .8);
          s.scale.set((1.6 - a * 1.0) * scale * w, (2.3 - a * 1.1) * scale * w, 1); s.material.opacity = Math.sin(Math.PI * Math.min(1, a * 1.25)) * (u.core ? .9 : .92);
          if (!u.core) s.material.color.setRGB(1, .5 - a * .3, .1 * (1 - a)); }
        f.glow.material.opacity = .45 + Math.sin(t * 17 + f.pos.x) * .08 + Math.sin(t * 7.3) * .07; }
      for (const sm of smokes) for (const s of sm.parts) { const u = s.userData; u.age += dt * (burning ? .55 : .35); const life = 5; if (u.age > life) u.age -= life;
        const k = u.age / life, rise = (burning ? 16 : 9) * scale * k;
        s.position.set(sm.pos.x + wind.x * rise * .55 + Math.sin(u.rot + t * .3) * .4, sm.pos.y + (burning ? 2.2 * scale : .6) + rise, sm.pos.z + wind.z * rise * .55);
        const sz = (burning ? 2.4 : 1.8) * scale * (.6 + k * 2.2); s.scale.set(sz, sz, 1); s.material.rotation = u.rot + t * .1;
        s.material.opacity = (burning ? .82 : .65) * Math.min(1, k * 5) * (1 - k); }
      for (const [i, L] of lights.entries()) L.intensity = (45 + env.night * 25) * scale * (.8 + Math.sin(t * 21 + i) * .12 + Math.sin(t * 9.1 + i * 2) * .1);
    });
    return g;
  }
  OW.fire = { build };
})();


// ===== Open Water Baukunst · variety: no two bases look the same =====
// Each player flies their own coat of arms (owner colour stays the field), capitals can wear the game's skins,
// and a per-base seed turns and mirrors the layout. Tier and owner stay readable.
(function () {
  const T = THREE, M = OW.M;
  // the game's four skins (SKIN_DEFS in index.html): stone and roof colours for the player's capital
  const SKINS = OW.SKINS = {
    winter:   { name: 'Winterburg',    stone: 0xdfe6ee, roof: 0xe9f1fa, trim: 0x9fb4cc },
    wald:     { name: 'Waldfestung',   stone: 0xa4aa86, roof: 0x3f7a3a, trim: 0x63694b },
    schatten: { name: 'Schattenfeste', stone: 0x6a6576, roof: 0x5b2c6f, trim: 0x2e2b36 },
    gold:     { name: 'Goldene Feste', stone: 0xe8d4a4, roof: 0xe2b54a, trim: 0x8e6d35 }
  };
  const STONE_KEYS = ['field', 'sand', 'slate', 'cap', 'marble', 'darkStone'];

  // ---------- coats of arms on cloth: the owner colour is the field, a second tincture draws the division ----------
  const DIVS = ['plain', 'pale', 'fess', 'quarterly', 'bend', 'chevron', 'cross', 'bordure'];
  const TINCT = ['#f2ead8', '#e7b84f', '#1d1b22'];
  const clothCache = {};
  OW.crestCloth = function (owner, crest) {
    const key = owner + '.' + crest.div + '.' + crest.t; if (clothCache[key]) return clothCache[key];
    const base = OW.COL[owner === 'capital' ? 'player' : owner] ?? 0x888888, S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, S, S); g.fillStyle = TINCT[crest.t % 3];
    const d = DIVS[crest.div % DIVS.length];
    if (d === 'pale') g.fillRect(S * .36, 0, S * .28, S);
    else if (d === 'fess') g.fillRect(0, S * .36, S, S * .28);
    else if (d === 'quarterly') { g.fillRect(0, 0, S / 2, S / 2); g.fillRect(S / 2, S / 2, S / 2, S / 2); }
    else if (d === 'bend') { g.beginPath(); g.moveTo(0, 0); g.lineTo(S * .3, 0); g.lineTo(S, S * .7); g.lineTo(S, S); g.lineTo(S * .7, S); g.lineTo(0, S * .3); g.closePath(); g.fill(); }
    else if (d === 'chevron') { g.beginPath(); g.moveTo(0, S); g.lineTo(S / 2, S * .35); g.lineTo(S, S); g.lineTo(S, S * .72); g.lineTo(S / 2, S * .05); g.lineTo(0, S * .72); g.closePath(); g.fill(); }
    else if (d === 'cross') { g.fillRect(S * .4, 0, S * .2, S); g.fillRect(0, S * .4, S, S * .2); }
    else if (d === 'bordure') { g.lineWidth = S * .14; g.strokeStyle = g.fillStyle; g.strokeRect(0, 0, S, S); }
    for (let i = 0; i < S; i += 3) { g.fillStyle = 'rgba(0,0,0,' + (.02 + Math.random() * .03) + ')'; g.fillRect(0, i, S, 1); }
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const m = new T.MeshStandardMaterial({ color: 0xffffff, map: tex, side: T.DoubleSide, roughness: .85 }); m.userData.key = 'cloth.' + owner;
    return clothCache[key] = m;
  };

  // ---------- skins: recolour stone and roofs of a finished model ----------
  function applySkin(model, skin) {
    const cache = new Map();
    model.traverse(o => { if (!o.isMesh || !o.material || !o.material.userData) return; const key = o.material.userData.key || '';
      let col = null; if (STONE_KEYS.includes(key)) col = skin.stone; else if (key.startsWith('roof.')) col = skin.roof; else if (key === 'darkWood' || key === 'iron') col = skin.trim;
      if (col == null) return; let m = cache.get(o.material); if (!m) { m = o.material.clone(); m.color.setHex(col); if (key.startsWith('roof.')) { m.metalness = skin === SKINS.gold ? .5 : 0; m.roughness = .6; } cache.set(o.material, m); } o.material = m; });
  }

  // hooks used by the stage
  OW.variety = {
    ctx(c, ctx) { if (c.crest && c.owner !== 'neutral') ctx.cloth = OW.crestCloth(c.owner, c.crest); },
    after(c, g) {
      const tinfo = { plotR: (OW.TIERS[OW.tierOf(c.level)] || OW.TIERS[0]).plotR, tier: OW.tierOf(c.level) };
      if (c.model === 'basis' && c.seed && OW.annex) OW.annex.build(g, c, tinfo);                                   // a side building: changes the outline
      if (c.model === 'basis' && OW.styles && OW.styles.apply) OW.styles.apply(g, c.style || 'klassisch', c);       // the player's building style (klassisch too: seeded roof variants)
      if (c.capital && c.skin && SKINS[c.skin]) applySkin(g, SKINS[c.skin]);
      if (c.model === 'basis' && c.seed && c.umland !== false && OW.umland && OW.umland.build) OW.umland.build(g, c, tinfo);
      if (c.seed) { g.rotation.y = (c.seed % 4) * Math.PI / 2; if ((c.seed >> 2) % 2) g.scale.x *= -1; }
    }
  };
})();


// ===== Open Water Baukunst · annexes: every base grows its own side building, so the OUTLINE differs from base to base =====
// Built before the style pass (so the annex gets the player's building style) and before the surroundings (which avoid it).
(function () {
  const T = THREE, K = OW.K, M = OW.M;
  const STONE = ['rawWood', 'field', 'sand', 'cap', 'slate', 'darkStone', 'slate', 'cap', 'marble', 'marble'];
  const TYPES = ['turm', 'halle', 'doppel', 'bastion', 'turm', 'halle'];          // weights by repetition

  // place on a flank of the map sprite (left or right edge), converted back through the seed's turn and mirror
  function flankAngle(c, side) {
    const rot = (c.seed % 4) * Math.PI / 2, mir = (c.seed >> 2) % 2, aw = side > 0 ? -Math.PI / 4 : 3 * Math.PI / 4;
    let b = aw + rot; if (mir) b = Math.PI - b; return b;
  }
  function build(g, c, info) {
    if (!c.seed || c.capital || c.model !== 'basis') return;
    const tier = info.tier, P = info.plotR, top = g.userData.top || 10, r = K.rng(c.seed * 977 + 31);
    const pick = TYPES[Math.floor(r() * TYPES.length)], S = Math.max(.8, Math.min(1.6, P / 6));
    let side = r() < .5 ? 1 : -1, a = flankAngle(c, side);
    const front = (x) => Math.abs(Math.atan2(Math.sin(x - Math.PI / 2), Math.cos(x - Math.PI / 2))) < .75;   // keep the gate road (+z) free
    if (front(a)) { side = -side; a = flankAngle(c, side); }
    const stone = M[STONE[tier]] ? M[STONE[tier]]() : M.field(), roofKey = c.owner === 'player' && c.capital ? 'capital' : c.owner;
    const roof = M.roof(roofKey), cloth = c.crest && c.owner !== 'neutral' && OW.crestCloth ? OW.crestCloth(c.owner, c.crest) : M.cloth(c.owner);
    const owned = c.owner !== 'neutral', grp = new T.Group(); grp.userData.annex = pick; g.add(grp);
    const d = P + 1.1 * S, cx = Math.cos(a) * d, cz = Math.sin(a) * d; grp.position.set(cx, 0, cz); grp.rotation.y = -a + Math.PI / 2;   // local +z points away from the base
    const H = Math.max(3.2, Math.min(top * .6, 9 + tier * .6));
    const wallTo = (len, h) => K.wall(grp, 0, -.2, 0, -len, h, .55 * S, stone, { cap: M.cap(), merlons: tier >= 2, size: .32 * S, mh: .38 * S });
    let rad = 1.3 * S, props = [];
    if (tier === 0) {                               // the camp: a second tent and a wooden look-out
      K.gable(grp, 1.9 * S, 1.8 * S, 1.3 * S, cloth, -.9 * S, 0, 0, { ry: .4 });
      for (const [x, z] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) K.cyl(grp, .07, .09, 2.6 * S, M.wood(), .9 * S + x * S, 0, z * S, { seg: 5 });
      K.box(grp, 1.1 * S, .12, 1.1 * S, M.wood(), .9 * S, 2.5 * S, 0); K.pyramid(grp, 1.3 * S, 1.3 * S, .8 * S, M.thatch(), .9 * S, 2.95 * S, 0);
      rad = 1.6 * S;
    } else if (pick === 'turm') {                    // a side tower on a short wall
      const t = K.roundTower(grp, { x: 0, z: .3 * S, r: .95 * S, h: H, mat: stone, roof, roofH: 2.1 * S, overhang: 1.2, seg: 14 });
      K.win(t, .18, .55, 0, H * .55, .94 * S); K.cyl(t, 1.02 * S, 1.02 * S, .16, M.cap(), 0, H - .3, 0, { seg: 14 });
      wallTo(1.4 * S, Math.min(H * .45, 3));
      if (owned && r() < .6) K.flag(t, { x: 0, y: t.userData.top - .05, z: 0, poleH: 1.3, w: 1.0, h: .5, mat: cloth, dir: .3 });
    } else if (pick === 'halle') {                   // a long hall wing with the owner's roof
      const w = 3.4 * S, dd = 2.1 * S, hh = Math.max(2.2, H * .38);
      K.box(grp, w, hh, dd, stone, 0, 0, 0, { ry: Math.PI / 2 }); K.gable(grp, w + .3, dd + .5, 1.3 * S + .4, roof, 0, hh, 0, { ry: Math.PI / 2 });
      for (const s of [-1, 1]) K.win(grp, .3, .45, dd / 2 + .01, hh * .45, s * w * .25, { ry: Math.PI / 2 });
      K.box(grp, .45 * S, 1.2 * S, .45 * S, stone, 0, hh + .2, w * .3);
      K.smoke(grp, 0, hh + 1.5 * S, w * .3, { n: 7, size: .35, rise: 2.4, life: 3.2, alpha: .35 });
      rad = 1.9 * S;
    } else if (pick === 'doppel') {                  // two small towers and a gate between
      for (const s of [-1, 1]) { const t = K.roundTower(grp, { x: s * 1.2 * S, z: .1, r: .62 * S, h: H * .72, mat: stone, roof, roofH: 1.5 * S, overhang: 1.2, seg: 12 }); K.win(t, .14, .4, 0, H * .4, .61 * S); }
      K.box(grp, 1.8 * S, Math.min(H * .45, 3.2), .7 * S, stone, 0, 0, .1); K.door(grp, .9 * S, 1.5 * S, 0, 0, .1 + .36 * S);
      if (owned) K.banner(grp, { x: 0, y: Math.min(H * .45, 3.2) - .1, z: .1 + .38 * S, w: .7 * S, h: 1.4 * S, mat: cloth });
      rad = 1.9 * S;
    } else {                                         // a low round bastion with merlons and a big flag
      K.cyl(grp, 1.35 * S, 1.5 * S, 1.6 * S, stone, 0, 0, 0, { seg: 18 }); K.cyl(grp, 1.42 * S, 1.42 * S, .15, M.cap(), 0, 1.6 * S, 0, { seg: 18 });
      K.merlons(grp, { r: 1.36 * S }, 1.75 * S, M.cap(), { size: .32 * S, h: .4 * S });
      if (owned) K.flag(grp, { x: 0, y: 1.75 * S, z: 0, poleH: 2.8 * S, w: 1.5, h: .8, mat: cloth, dir: .3 }); else K.cyl(grp, .06, .07, 2.4 * S, M.darkWood(), 0, 1.75 * S, 0, { seg: 5 });
      wallTo(1.2 * S, 1.2 * S); rad = 1.6 * S;
    }
    // tell the surroundings (and style props) to keep clear
    (g.userData.styleProps = g.userData.styleProps || []).push({ x: cx, z: cz, r: rad + .3 });
    g.userData.annex = pick;
  }
  OW.annex = { build };
})();


// ===== Open Water Baukunst · styles: five building cultures for the normal base, and a different face for every base =====
// OW.styles.apply(model, key, c) turns a FINISHED base of any tier into a building culture (like the civilisations of the
// big city builders): roof SHAPES change (same footprint, same place, owner colour kept), stone and timber change TONE,
// and a few small props join. Layout, tower count and silhouette order stay, so the tier still reads; roofs and cloth
// keep the owner hue, so the owner still reads. Generic: it reads the geometry of the finished model, not tier code.
// Every base also draws its own sub-variant from c.seed (main and secondary roof types, roof heights, a stone nuance),
// so two bases of one style and level differ. 'klassisch' gets a light seeded pass of its own (roof heights, straight or
// bell-cast cones, stone nuance) and is a no-op without a seed, so the tiers' reference renders stay as built.
(function () {
  const T = THREE, K = OW.K, M = OW.M, PI = Math.PI, SRGB = T.SRGBColorSpace;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, k) => a + (b - a) * k, q = (v) => (Math.round(v * 40) / 40).toFixed(3);
  const mixHue = (a, b, k) => a + ((((b - a) % 1) + 1.5) % 1 - .5) * k;

  const LIST = {
    klassisch:  { name: 'Klassisch',  desc: 'Die Grundform der Stufe: Kegeldächer, Zinnen und Stein, wie sie gebaut wurde – je Burg mit etwas anderer Dachhöhe, Dachschwung und Steinton.' },
    nordisch:   { name: 'Nordisch',   desc: 'Achteckige Stabkirchen-Helme in zwei Stufen, dunkle Holzgalerien, Drachenköpfe, dunkler Stein und Runensteine am Tor.' },
    suedlich:   { name: 'Südlich',    desc: 'Hell gekalkte Mauern mit ockerfarbenen Kanten, flache Ziegeldächer und Ziegelkuppeln, Zypressen am Tor.' },
    morgenland: { name: 'Morgenland', desc: 'Zwiebel- und Melonenkuppeln, schlanke Minarettspitzen mit goldenen Knäufen, warmer Sandstein und Dattelpalmen am Tor.' },
    fernost:    { name: 'Fernost',    desc: 'Geschwungene Pagodendächer in einer bis drei Stufen mit hochgezogenen Ecken, dunkles Holz, heller Stein und Steinlaternen am Tor.' }
  };
  const KEYS = Object.keys(LIST);

  // ---------- caches: every material, texture and geometry made here is shared between bases ----------
  const cache = new Map();
  const memo = (k, f) => { let v = cache.get(k); if (v === undefined) { v = f(); cache.set(k, v); } return v; };
  const own = (k, o) => memo('m.' + k, () => { const m = new T.MeshStandardMaterial(Object.assign({ roughness: .85, flatShading: true }, o)); if (o.map) { m.bumpMap = o.map; m.bumpScale = o.bumpScale != null ? o.bumpScale : 1; } return m; });

  // barrel tiles ("Mönch und Nonne"): round ribs running up the slope, a shadow line at the foot of each course
  const shade = (v) => { v = clamp(v | 0, 0, 255); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  const tilesTex = () => memo('tex.tiles', () => {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), r = K.rng(4242), n = 8, w = S / n, rows = 6, h = S / rows;
    g.fillStyle = shade(95); g.fillRect(0, 0, S, S);
    for (let y = 0; y < rows; y++) for (let i = 0; i < n; i++) { const x = i * w, v = 205 + r() * 40, gr = g.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, shade(v * .5)); gr.addColorStop(.3, shade(v * .95)); gr.addColorStop(.5, shade(v * 1.05)); gr.addColorStop(1, shade(v * .48));
      g.fillStyle = gr; g.fillRect(x + 1, y * h + 1, w - 2, h - 2); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y * h + h - 6, w, 5); }
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = SRGB; t.anisotropy = 4; return t;
  });

  // ---------- the cultures ----------
  // col.stone = [hue, sat, lightness target, pull, lightness scale]: the tier's own lightness is SHIFTED (l·scale + (target − .6)·min(pull, .35)),
  //   never replaced, so the tier's stone ladder survives; hue and saturation are pulled toward the culture's tint.
  // col.trim = [hue, sat, lightness target, pull, lightness scale]: the culture's edge colour (trim is the culture's, not the tier's).
  // raw/wood/dark/thatch = fixed colours. 'nu' = keep the colour, only the per-base nuance.
  // main / sec: roof types a base can draw for its biggest roof and for all the others (index 0 = the default without a seed).
  // hsM / hsS: roof height factors a base can draw; dl: lightness nuance step (5 steps: −2 … +2).
  const STY = {
    klassisch:  { col: { stone: 'nu', trim: 'nu' }, tex: null, fin: null, always: false, props: null,
      main: ['straight', 'bell', 'straight'], sec: ['straight', 'bell', 'bell'], hsM: [1, .87, 1.15], hsS: [1, .85, 1.15], dl: .03 },
    nordisch:   { col: { stone: [.1, .06, .34, .45, .88], trim: [.1, .04, .66, .2, .92], raw: 0x7c6c58, wood: 0x5a3e27, dark: 0x2d2118, thatch: 0x7a7a46 },
      tex: () => OW.TEX.shingle(), rough: .85, uv: .42, fin: 'spike', always: false, props: 'runes',
      main: ['stave', 'spire', 'low'], sec: ['stave', 'low', 'spire'], hsM: [1, .9, 1.12], hsS: [1, .85, 1.2], dl: .04 },
    suedlich:   { col: { stone: [.11, .2, .93, .7, 1], trim: [.09, .42, .7, .6, 1], raw: 0xc1a57f, wood: 0x8b5e3a, dark: 0x5c3d25, thatch: null },
      tex: tilesTex, rough: .8, uv: .55, fin: 'ball', always: false, props: 'cypress',
      main: ['cone', 'dome', 'cone'], sec: ['cone', 'dome', 'slim'], hsM: [1, .9, 1.12], hsS: [1, .85, 1.2], dl: .04 },
    morgenland: { col: { stone: [.095, .42, .74, .45, 1], trim: [.11, .4, .88, .5, 1], raw: 0xc9ab80, wood: 0x7d5332, dark: 0x4a3120, thatch: 0xdcc48c },
      tex: () => OW.TEX.shingle(), rough: .42, metal: .08, uv: .8, fin: 'gold', always: true, props: 'palms',
      main: ['onion', 'onion', 'melon'], sec: ['onion', 'auto', 'melon'], hsM: [1, .9, 1.12], hsS: [1, .85, 1.2], dl: .04 },
    fernost:    { col: { stone: [.12, .06, .84, .5, 1], trim: [.1, .04, .92, .5, 1], raw: 0x6e5646, wood: 0x4a3526, dark: 0x3a2a1f, thatch: 0xa08f63 },
      tex: tilesTex, rough: .7, uv: .55, fin: 'sorin', always: true, props: 'lanterns',
      main: ['two', 'three', 'two'], sec: ['auto', 'one', 'two'], hsM: [1, .9, 1.12], hsS: [1, .85, 1.2], dl: .04 }
  };

  // ---------- the per-base sub-variant: drawn from the seed (independent of the turn / mirror bits variety.js uses) ----------
  function variant(st, seed) {
    const S = STY[st];
    if (!seed) return { kM: S.main[0], kS: S.sec[0], hsM: 1, hsS: 1, nl: 0, nh: 0, ns: 0, key: '000' };
    const R = K.rng((Math.imul(seed | 0, 2654435761) ^ 0x2545f491) | 0), pick = (a) => a[Math.floor(R() * a.length)];
    const v = { kM: pick(S.main), kS: pick(S.sec), hsM: pick(S.hsM), hsS: pick(S.hsS), nl: pick([-2, -1, 0, 1, 2]), nh: pick([-1, 0, 1]), ns: pick([-1, 0, 1]) };
    v.key = '' + (v.nl + 2) + (v.nh + 1) + (v.ns + 1); return v;
  }

  // ---------- materials: classify, recolour (always on clones, never the shared ones) ----------
  const KEYCLS = { field: 'stone', sand: 'stone', slate: 'stone', marble: 'stone', darkStone: 'stone', cap: 'trim', rawWood: 'raw', wood: 'wood', darkWood: 'dark', thatch: 'thatch' };
  const clsCache = new WeakMap(), _hsl = {};
  function classOf(m) {
    if (!m || !m.isMeshStandardMaterial) return null;
    let c = clsCache.get(m); if (c !== undefined) return c;
    const key = m.userData && m.userData.key, TX = OW.TEX;
    if (key) c = key.startsWith('roof.') ? 'roof' : key.startsWith('cloth.') ? 'cloth' : (KEYCLS[key] || null);
    else if (m.transparent || m.metalness > .3 || (m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex() !== 0)) c = null;
    else if (m.map) {
      if (m.map === TX.ashlar() || m.map === TX.field() || m.map === TX.marble()) c = 'stone';
      else if (m.map === TX.planks()) { m.color.getHSL(_hsl, SRGB); c = _hsl.l < .3 ? 'dark' : 'wood'; }
      else if (m.map === TX.shingle()) c = 'shingle';
      else c = null;
    } else { m.color.getHSL(_hsl, SRGB); c = _hsl.s < .3 && _hsl.l > .62 ? 'trim' : null; }
    clsCache.set(m, c); return c;
  }
  const NU0 = { nl: 0, nh: 0, ns: 0, key: '000' };
  function recol(m, cls, st, V) {
    const S = STY[st], sp = S.col[cls]; if (sp == null) return m; V = V || NU0;
    return memo('c.' + st + V.key + '.' + m.uuid, () => { const c = m.clone();
      if (typeof sp === 'number') { c.color.setHex(sp); return c; }
      m.color.getHSL(_hsl, SRGB); const h0 = _hsl.h, s0 = _hsl.s, l0 = _hsl.l, dl = V.nl * S.dl, dh = V.nh * .025, ds = V.ns * .04; let h, s, l;
      if (sp === 'nu') { h = h0 + dh; s = s0 + ds * .5; l = l0 + dl; }
      else if (cls === 'stone') { const k = sp[3]; h = (s0 < .15 ? sp[0] : mixHue(h0, sp[0], k * .6)) + dh; s = mix(s0, sp[1], k); if (s > s0) s = Math.min(s, .25); s += ds * .75;
        l = l0 * sp[4] + (sp[2] - .6) * Math.min(k, .35) + dl; }
      else { h = sp[0] + dh; s = sp[1] + ds; l = mix(l0 * sp[4], sp[2], sp[3]) + dl; }
      c.color.setHSL(((h % 1) + 1) % 1, clamp(s, 0, 1), clamp(l, .05, .96), SRGB); return c; });
  }
  // owner roof: same colour (and gold for the capital), the culture's tiles
  function roofMat(m, st) {
    const S = STY[st]; if (!S.tex) return m;
    return memo('r.' + st + '.' + m.uuid, () => { const c = m.clone(), tx = S.tex(); c.map = tx; c.bumpMap = tx; c.bumpScale = .9;
      if (!/capital/.test((m.userData && m.userData.key) || '')) { c.roughness = S.rough; c.metalness = S.metal || 0; } c.needsUpdate = true; return c; });
  }
  const lacq = () => own('lacq2', { color: 0x4a3526, roughness: .55 });          // Fernost drums: dark wood, never near-black, never red
  function addMat(k, roofM, st, V) {
    if (k === 'roof') return roofM; if (k === 'gold') return M.gold(); if (k === 'bronze') return M.bronze(); if (k === 'iron') return M.iron();
    if (k === 'lacq') return lacq(); if (k === 'dark') return recol(M.darkWood(), 'dark', st, V); return recol(M.cap(), 'trim', st, V);
  }
  const glowy = (m) => !!m && (m === M.window() || (m.emissive && m.emissive.getHex() !== 0 && m.emissiveIntensity > .5));
  const gilt = (m) => m === M.gold() || m === M.bronze();

  // ---------- geometry helpers ----------
  const _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(1, 1, 1), _up = new T.Vector3(0, 1, 0), _d = new T.Vector3();
  const place = (g, x, y, z, rx = 0, ry = 0, rz = 0, quat) => g.applyMatrix4(new T.Matrix4().compose(_p.set(x, y, z), quat || _q.setFromEuler(_e.set(rx, ry, rz)), _s));
  function merge(list) {
    let n = 0; const gs = list.map(g => { const h = g.index ? g.toNonIndexed() : g; if (!h.attributes.normal) h.computeVertexNormals(); n += h.attributes.position.count; return h; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let k = 0;
    for (const g of gs) { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; }
    const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.computeBoundingSphere(); return out;
  }
  // solid of revolution from an absolute profile [[r, y], ...], closed underneath; tiles run up the slope, a whole number of repeats around
  function lathe(pts, seg, S) {
    pts = [[.001, pts[0][1]]].concat(pts);
    const v = pts.map(p => new T.Vector2(Math.max(p[0], .001), p[1])), g = new T.LatheGeometry(v, seg), uv = g.attributes.uv, n = v.length;
    let rM = 0; for (const p of v) rM = Math.max(rM, p.x); const around = Math.max(1, Math.round(PI * 2 * rM * S));
    const L = [0]; for (let j = 1; j < n; j++) L[j] = L[j - 1] + v[j].distanceTo(v[j - 1]);
    for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) uv.setXY(i * n + j, i / seg * around, L[j] * S);
    uv.needsUpdate = true; return g;
  }
  // melon ribs: push the surface OUT between n ridges (never in, so an enclosed old dome stays hidden)
  function ribbed(g, n, amp) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), f = 1 + amp * Math.abs(Math.cos(Math.atan2(z, x) * n / 2)); p.setX(i, x * f); p.setZ(i, z * f); }
    p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
  const cylGeo = (rt, rb, h, seg) => memo('cy.' + q(rt) + q(rb) + q(h) + seg, () => { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); K.worldUV(g, .3, true); return g; });
  const boxGeo = (w, h, d) => memo('bx.' + q(w) + q(h) + q(d), () => { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); K.worldUV(g, .3); return g; });
  const torusGeo = (r, t, seg) => memo('to.' + q(r) + q(t) + seg, () => { const g = new T.TorusGeometry(r, t, 5, seg); g.rotateX(PI / 2); return g; });
  const ring = (r, t, y, mat, seg) => ({ geo: torusGeo(r, t, seg), mat, y });

  // a roof made of faces: each face runs from an eave line (e0 → e1) to a top line (t0 → t1); the profile [[rf, g]] gives,
  // for rf = share of the way from the top line to the eave (>1 = beyond the eave), the height share g. Corners can curl up
  // (lift) and gable ridges can sweep up at their ends (sweep). o.end: fill the gable triangles at x = ±end under the roof.
  function surf(faces, prof, h, o = {}) {
    prof = [[0, prof[0][1]]].concat(prof);
    const pos = [], uv = [], idx = [], nu = o.nu || 8, S = o.uv || .45, lift = (o.lift || 0) * h, sweep = (o.sweep || 0) * h, np = prof.length;
    const yAt = (rf, g, u) => { const cw = Math.pow(Math.abs(2 * u - 1), 4), w = clamp((rf - .45) / .55, 0, 1), r0 = clamp(1 - rf, 0, 1); return g * h + lift * cw * w * w + sweep * cw * r0 * r0; };
    for (const [e0, e1, t0, t1] of faces) {
      const base = pos.length / 3, el = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
      for (let i = 0; i <= nu; i++) { const u = i / nu, ex = mix(e0[0], e1[0], u), ez = mix(e0[1], e1[1], u), tx = mix(t0[0], t1[0], u), tz = mix(t0[1], t1[1], u); let acc = 0, px = 0, py = 0, pz = 0;
        for (let j = 0; j < np; j++) { const rf = prof[j][0], x = tx + (ex - tx) * rf, z = tz + (ez - tz) * rf, y = yAt(rf, prof[j][1], u);
          if (j) acc += Math.hypot(x - px, y - py, z - pz); px = x; py = y; pz = z; pos.push(x, y, z); uv.push((u - .5) * el * S, acc * S); } }
      for (let i = 0; i < nu; i++) for (let j = 0; j < np - 1; j++) { const a = base + i * np + j, b = a + np; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    if (o.end) { let jt = 0; for (let j = 1; j < np; j++) if (prof[j][0] > prof[jt][0] + 1e-6) jt = j;
      for (const sx of [-1, 1]) { const xe = sx * o.end, uF = .5 + xe / (2 * o.a), pts = [];
        for (let j = jt; j < np; j++) pts.push([o.b * prof[j][0], yAt(prof[j][0], prof[j][1], uF)]);
        for (let j = np - 2; j >= jt; j--) pts.push([-o.b * prof[j][0], yAt(prof[j][0], prof[j][1], 1 - uF)]);
        const c0 = pos.length / 3; pos.push(xe, 0, 0); uv.push(0, 0); for (const [z, y] of pts) { pos.push(xe, y, z); uv.push(z * S, y * S); }
        for (let k = 0; k < pts.length - 1; k++) if (sx < 0) idx.push(c0, c0 + 1 + k, c0 + 2 + k); else idx.push(c0, c0 + 2 + k, c0 + 1 + k); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
  // hipped roof / pyramid (r = 0): half extents a (x) and b (z), ridge half length r along x
  const hipFaces = (a, b, r) => [[[-a, b], [a, b], [-r, 0], [r, 0]], [[a, b], [a, -b], [r, 0], [r, 0]], [[a, -b], [-a, -b], [r, 0], [-r, 0]], [[-a, -b], [-a, b], [-r, 0], [-r, 0]]];
  const gableFaces = (a, b) => [[[-a, b], [a, b], [-a, 0], [a, 0]], [[a, -b], [-a, -b], [a, 0], [-a, 0]]];

  // profiles [r share, height share]
  const P = {
    nord:  [[.95, -.03], [1.04, 0], [.92, .08], [.76, .22], [.58, .4], [.38, .62], [.19, .82], [.05, .96], [0, 1]],       // steep, a little bell-cast
    nskirt: [[.95, -.06], [1.05, -.01], [.54, 1]],                                                                              // nordic lower skirt (hip), open at the top
    sued:  [[1.02, -.08], [1.14, -.04], [1.14, .02], [.74, .36], [.37, .68], [0, 1]],                                        // low tile cone, wide eave
    cup:   [[.96, -.05], [1.08, -.03], [1.08, .05], [1.0, .28], [.86, .52], [.64, .74], [.36, .91], [.12, .985], [0, 1]],   // tiled cupola
    onion: [[.9, 0], [1.0, .05], [1.1, .16], [1.14, .27], [1.08, .38], [.92, .49], [.68, .6], [.44, .7], [.26, .78], [.14, .86], [.07, .93], [.025, .98], [0, 1]],
    melon: [[.9, 0], [1.0, .04], [1.1, .14], [1.13, .28], [1.08, .44], [.94, .6], [.72, .75], [.46, .87], [.2, .96], [0, 1]],
    lance: [[.8, 0], [.86, .06], [.82, .17], [.66, .38], [.45, .6], [.24, .8], [.08, .94], [0, 1]],                          // minaret tip
    flare: [[.82, -.04], [1.0, .15], [.88, .05], [.74, .09], [.58, .19], [.44, .33], [.3, .51], [.17, .71], [.07, .88], [0, 1]],  // pagoda: upturned eave, hollow slope
    skirt: [[.8, -.1], [1.0, .42], [.88, .14], [.74, .34], [.62, .66], [.52, 1]],                                              // lower pagoda eave, open at the top
    bell:  [[.96, -.02], [1.05, -.01], [.9, .06], [.72, .19], [.52, .39], [.3, .64], [.12, .86], [0, 1]],                     // klassisch bell-cast cone
    gNord: [[.96, -.06], [1.03, 0], [0, 1]],
    gSued: [[.97, -.1], [1.1, -.03], [1.1, .03], [0, 1]],
    gOgee: [[1.0, -.02], [1.0, .2], [.96, .42], [.86, .6], [.68, .76], [.44, .88], [.2, .96], [0, 1]],                       // pointed vault
    gFlare: [[.86, -.06], [1.0, .12], [.9, .05], [.72, .14], [.52, .3], [.32, .52], [.14, .78], [0, 1]]
  };
  const prof = (pr, r, h, y = 0) => pr.map(([f, g]) => [f * r, y + g * h]);
  // nordic helm proportions (shares of R and of the roof height): skirt eave, skirt top radius and height (the kink), foot and radius of the upper helm
  const NHELM = {
    stave: { eave: 1.08, top: .55, kink: .28, up: .42, ur: .72 },                                          // stave church: kink at a quarter, a clear dark drum
    spire: { eave: 1.04, top: .5, kink: .44, up: .58, ur: .6 },                                            // tall skirt, small drum, needle helm
    low:   { eave: 1.14, top: .63, kink: .2, up: .34, ur: .8 }                                             // wide low skirt, broad helm
  };

  // small ornaments (unit size, merged, cached)
  function finGeo(kind) {
    return memo('fin.' + kind, () => { const L = [], c = (rt, rb, h, y, s = 7) => { const g = new T.CylinderGeometry(rt, rb, h, s); g.translate(0, y + h / 2, 0); L.push(g); },
      sp = (r, y) => { const g = new T.SphereGeometry(r, 8, 6); g.translate(0, y, 0); L.push(g); }, co = (r, h, y, s = 6) => { const g = new T.ConeGeometry(r, h, s); g.translate(0, y + h / 2, 0); L.push(g); };
      if (kind === 'gold') { c(.1, .16, .1, 0); c(.035, .05, .9, 0, 6); sp(.15, .3); sp(.1, .62); co(.06, .34, .74); }
      else if (kind === 'sorin') { c(.12, .2, .14, 0); c(.035, .035, 1.25, 0, 6); for (let k = 0; k < 5; k++) c(.15 - k * .015, .15 - k * .015, .035, .26 + k * .16, 10); sp(.09, 1.3); co(.05, .24, 1.36); }
      else if (kind === 'spike') { c(.035, .045, .5, 0, 6); sp(.07, .5); co(.05, .42, .54, 5); }
      else { c(.05, .08, .14, 0, 8); sp(.13, .25); }
      return merge(L); });
  }
  const FINH = { gold: 1.1, sorin: 1.6, spike: .95, ball: .38 };
  // nordic crossed gable boards with dragon heads, at both ends of a gable (ridge along x, eaves at z = ±b)
  const boardsGeo = (a, b, h) => memo('bd.' + q(a) + q(b) + q(h), () => { const L = [], len = Math.hypot(b, h), ext = .3 + h * .14, th = clamp(b * .08, .08, .16);
    for (const sx of [-1, 1]) for (const s of [-1, 1]) { const rx = Math.atan2(-s * b, h), x = sx * (a - .03), dl = len + ext;
      const bd = new T.BoxGeometry(.08, dl, th); bd.translate(0, dl / 2, 0); place(bd, x, .05, s * b, rx); L.push(bd);
      const hd = new T.ConeGeometry(th * .75, th * 3.4, 5); hd.translate(0, th * 1.7, 0); place(hd, x, .05 + dl * h / len, s * b - s * dl * b / len, Math.atan2(-s, .5)); L.push(hd); }
    return merge(L); });
  // dragon-head horns at the four eave corners of a hipped roof
  const hornsGeo = (a, b, s) => memo('hn.' + q(a) + q(b) + q(s), () => { const L = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new T.ConeGeometry(.1 * s, .8 * s, 5); g.translate(0, .4 * s, 0); _d.set(sx * a, Math.hypot(a, b) * .75, sz * b).normalize();
      place(g, sx * a, .02, sz * b, 0, 0, 0, new T.Quaternion().setFromUnitVectors(_up, _d)); L.push(g); }
    return merge(L); });
  // four slim pinnacles on the corners of a flat roof
  const pinnGeo = (a, b, s, y) => memo('pn.' + q(a) + q(b) + q(s) + q(y), () => { const L = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = new T.CylinderGeometry(.1 * s, .12 * s, .3 * s, 6); c.translate(sx * a, y + .15 * s, sz * b); L.push(c);
      const k = new T.ConeGeometry(.11 * s, .45 * s, 6); k.translate(sx * a, y + .3 * s + .225 * s, sz * b); L.push(k); }
    return merge(L); });

  // merlon shapes: the profile lies along the wall (x), the block is as deep as the old one (z)
  const merlonGeo = (kind, w, h, d, alongZ) => memo('ml.' + kind + q(w) + q(h) + q(d) + (alongZ ? 'z' : 'x'), () => {
    const L = alongZ ? d : w, D = alongZ ? w : d, s = new T.Shape(); s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0);
    if (kind === 'swallow') { s.lineTo(L / 2, h * 1.08); s.lineTo(L * .12, h * 1.08); s.lineTo(0, h * .66); s.lineTo(-L * .12, h * 1.08); s.lineTo(-L / 2, h * 1.08); }
    else { s.lineTo(L / 2, h * .62); s.lineTo(L * .22, h * .86); s.lineTo(0, h * 1.22); s.lineTo(-L * .22, h * .86); s.lineTo(-L / 2, h * .62); }
    s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: D, bevelEnabled: false }); g.translate(0, 0, -D / 2); if (alongZ) g.rotateY(PI / 2); K.worldUV(g, .25); return g; });
  const MERLON = { suedlich: 'swallow', morgenland: 'point' };
  function restyleMerlons(list, st) {
    const kind = MERLON[st]; if (!kind) return;
    const groups = new Map();
    for (const o of list) { const p = o.geometry.parameters, k = o.parent.uuid + q(p.width) + q(p.height) + q(p.depth); let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(o); }
    for (const l of groups.values()) { if (l.length < 4) continue;
      let stacked = false; for (let i = 0; i < l.length && !stacked; i++) for (let j = i + 1; j < l.length; j++) { const a = l[i].position, b = l[j].position; if (Math.abs(a.x - b.x) < .05 && Math.abs(a.z - b.z) < .05 && Math.abs(a.y - b.y) > .05) { stacked = true; break; } }
      if (stacked) continue;
      for (const o of l) { const p = o.geometry.parameters; o.geometry = merlonGeo(kind, p.width, p.height, p.depth, p.depth > p.width * 1.05); } }
  }

  // ---------- read a roof mesh: footprint, height, kind (round / square / hip / gable), in its parent's axes ----------
  const _v = new T.Vector3(), _m = new T.Matrix4(), _o = new T.Vector3();
  function analyse(o) {
    const pa = o.geometry && o.geometry.attributes.position; if (!pa || pa.count < 4 || pa.count > 9000) return null;
    _m.compose(_o.set(0, 0, 0), o.quaternion, o.scale);
    const n = pa.count, A = new Float32Array(n * 3); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) { _v.fromBufferAttribute(pa, i).applyMatrix4(_m); const x = _v.x, y = _v.y, z = _v.z; A[i * 3] = x; A[i * 3 + 1] = y; A[i * 3 + 2] = z;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    const W = x1 - x0, D = z1 - z0, H = y1 - y0; if (H < .12 || W < .25 || D < .25) return null;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
    for (let i = 0; i < n; i++) if (A[i * 3 + 1] > y1 - H * .02) { const x = A[i * 3], z = A[i * 3 + 2]; if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (z < tz0) tz0 = z; if (z > tz1) tz1 = z; }
    const tW = tx1 - tx0, tD = tz1 - tz0, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2, gp = o.geometry.parameters || {};
    const I = { cx, cz, y0, y1, H, W, D, axis: 'x', tl: 0, kit: o.geometry.type === 'ConeGeometry', seg: gp.radialSegments || gp.segments || 16 };
    // bottom corners of a rectangle lie on the bounding box corners
    const cornersOk = () => { for (let i = 0; i < n; i++) { if (A[i * 3 + 1] > y0 + H * .08) continue; const dx = Math.abs(A[i * 3] - cx), dz = Math.abs(A[i * 3 + 2] - cz);
      if (dx > W * .3 && dz > D * .3 && (Math.abs(dx - W / 2) > W * .06 || Math.abs(dz - D / 2) > D * .06)) return false; } return true; };
    if (tW < .18 * W && tD < .18 * D) {                                                           // one apex: cone, pyramid, spire, dome
      if (Math.abs(tcx - cx) > .1 * W || Math.abs(tcz - cz) > .1 * D || H < .25 * Math.min(W, D)) return null;
      let R = 0; for (let i = 0; i < n; i++) R = Math.max(R, Math.hypot(A[i * 3] - cx, A[i * 3 + 2] - cz));
      const angs = new Set(); let rMin = Infinity, rMax = 0;
      for (let i = 0; i < n; i++) { if (A[i * 3 + 1] > y0 + H * .04) continue; const dx = A[i * 3] - cx, dz = A[i * 3 + 2] - cz, r = Math.hypot(dx, dz); if (r < R * .5) continue;
        angs.add(Math.round(Math.atan2(dz, dx) * 45 / PI)); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); }
      if (angs.size >= 6 && rMin > rMax * .8) {
        const nb = 16, bins = new Float32Array(nb); let mid = 0;
        for (let i = 0; i < n; i++) { const y = A[i * 3 + 1] - y0, r = Math.hypot(A[i * 3] - cx, A[i * 3 + 2] - cz), k = Math.min(nb - 1, Math.floor(y / H * nb)); if (r > bins[k]) bins[k] = r; if (y > .4 * H && y < .6 * H && r > mid) mid = r; }
        Object.assign(I, { cls: 'round', R, convex: mid > .7 * R, bins });
      } else if (angs.size <= 5 && cornersOk()) Object.assign(I, { cls: 'square', a: W / 2, b: D / 2, r: 0 });
      else return null;
    } else if (tD < .15 * D || tW < .15 * W) {                                                    // a ridge: gable or hipped roof
      const ax = tD < .15 * D ? 'x' : 'z', along = ax === 'x' ? W : D, across = ax === 'x' ? D : W, tl = ax === 'x' ? tW : tD, off = ax === 'x' ? tcz - cz : tcx - cx;
      if (Math.abs(off) > .08 * across || H < .15 * across || H > 1.8 * across || along < .6 * across) return null;
      Object.assign(I, { axis: ax, a: along / 2, b: across / 2, tl: tl / 2 });
      if (tl > .85 * along) I.cls = 'gable'; else { if (!cornersOk()) return null; I.cls = 'hip'; I.r = tl / 2; }
    } else return null;
    return I;
  }
  // push a new profile outside the old one (a dome may carry ribs merged into another mesh: they must end up hidden)
  function enclose(pts, I) {
    const out = [];
    for (let j = 0; j < pts.length; j++) { if (j && pts[j][1] > pts[j - 1][1] && pts[j - 1][1] >= 0) for (let k = 1; k < 4; k++) out.push([mix(pts[j - 1][0], pts[j][0], k / 4), mix(pts[j - 1][1], pts[j][1], k / 4)]); out.push([pts[j][0], pts[j][1]]); }
    const b = I.bins, nb = b.length;
    for (const p of out) if (p[1] >= 0 && p[1] <= I.H + .2) { const k = clamp(Math.floor(p[1] / I.H * nb), 0, nb - 1), r = Math.max(b[k], b[Math.max(0, k - 1)], b[Math.min(nb - 1, k + 1)]) + .16; if (p[0] < r) p[0] = r; }
    return out;
  }
  // a stacked pagoda roof over radius R: n − 1 skirts with short dark-wood drums, then the flared top; the owner roof overhangs every drum
  function pagoda(R, H2, n, seg, U) {
    const adds = [], hsk = n >= 3 ? [.25, .2] : [.34]; let main = null, y = 0, Re = R * 1.25, dr = 0;
    for (let i = 0; i < n - 1; i++) { const h = H2 * hsk[i], dh = H2 * .12; dr = Re * .52 + .02;
      const g = lathe(prof(P.skirt, Re, h, y), seg, U); if (i === 0) main = g; else adds.push({ geo: g, mat: 'roof' });
      adds.push({ geo: cylGeo(dr, dr, dh, seg), mat: 'lacq', y: y + h - .04 }); y += h + dh - .06; Re = Math.max(dr * 1.3, Re * .8); }
    adds.push({ geo: lathe(prof(P.flare, Math.max(dr * 1.32, R * .7), H2 - y, y), seg, U), mat: 'roof' });
    return { main, adds };
  }

  // ---------- the new roof for one analysed mesh: main geometry (replaces the mesh's) or a stretch (sy), extra parts, apex ----------
  function plan(st, I, S, kind, hs, isMain, capA) {
    const U = S.uv, adds = []; let main = null, apex = null, peak = null, fs = 1, sy = 0, fin = I.cls === 'gable' ? (st === 'morgenland' ? 'gold' : null) : S.fin;
    if (st === 'klassisch') {                                                                              // light pass: height and eave line only
      if (I.cls === 'round' && !I.convex) { if (kind === 'bell' && I.kit) main = lathe(prof(P.bell, I.R, I.H * hs), I.seg, .35); else sy = hs; }
      else if (I.cls === 'square') sy = hs;
      else return null;
      apex = I.H * hs; return { main, adds, apex, peak: apex, fin: null, fs, sy };
    }
    if (I.cls === 'round') {
      const R = I.R, H = I.H, cv = I.convex, seg = R > 1.8 ? 28 : R > 1 ? 22 : 16; let pts; fs = clamp(R / 1.4, .45, 1.6);
      if (st === 'nordisch') {                                                                             // octagonal stave helm: shingle skirt, dark timber drum, steep helm, on a timber hoarding
        if (cv) return null;
        const H2 = clamp(Math.max(H * 1.4, R * 2.6), H, H * 1.8) * hs, gh = clamp(R * .6, .4, 1.3), N = NHELM[kind] || NHELM.stave, dr = R * (N.top + .03);
        pts = [[R * .95, -.035 * H2], [R * N.eave, -.01 * H2], [R * N.top, N.kink * H2]];
        adds.push({ geo: cylGeo(dr, dr, (N.up - N.kink + .06) * H2, 8), mat: 'dark', y: (N.kink - .04) * H2 }, { geo: lathe(prof(P.nord, R * N.ur, H2 * (1 - N.up), H2 * N.up), 8, U), mat: 'roof' });
        adds.push({ geo: cylGeo(R * .93, R * .93, gh, 8), mat: 'dark', y: -gh - .02 });
        if (R > .6) adds.push({ geo: hornsGeo(R * .74, R * .74, fs), mat: 'dark' });
        main = lathe(pts, 8, U); apex = H2;
      }
      else if (st === 'suedlich') { if (cv) return null;
        if (kind === 'dome' && H / R <= 2.4) { pts = prof(P.cup, R, R * clamp(.95 * hs, .85, 1.15)); fin = 'ball'; }
        else if (kind === 'slim' || H / R > 2.4) pts = prof(P.sued, R, Math.max(H * .62, R * .95) * hs);
        else pts = prof(P.sued, R, clamp(H * .75, R * .75, R * 1.1) * hs); }
      else if (st === 'morgenland') {
        const slim = !cv && H / R > 2.6 && !isMain;
        if (kind === 'melon' && !slim) { let H2 = R * 1.75 * hs; if (cv) H2 = Math.max(H2, H * 1.3); if (cv && capA) H2 = Math.min(H2, Math.max(capA, H * 1.25)); pts = prof(P.melon, R, H2); if (cv) pts = enclose(pts, I);
          main = ribbed(lathe(pts, 24, U), 12, .07); adds.push(ring(pts[0][0] + .01, .04 + R * .02, .02, 'gold', 24)); }
        else if (cv || !slim || kind !== 'lance') { let H2 = clamp(Math.max(H * .95, R * 1.9), R * 1.9, R * 2.7) * hs; if (cv) H2 = Math.max(H2, H * 1.45); if (cv && capA) H2 = Math.min(H2, Math.max(capA, H * 1.3)); pts = prof(P.onion, R, H2); if (cv) pts = enclose(pts, I); adds.push(ring(pts[0][0] + .01, .04 + R * .02, .02, 'gold', seg)); }
        else { pts = prof(P.lance, R, H * 1.02 * hs); adds.push({ geo: cylGeo(R * 1.0, R * .86, .16, seg), mat: 'trim', y: -.16 }); }
      } else if (cv) {                                                                                  // a dome becomes a round three-tier hall roof around it
        const H2 = Math.min(H * 1.3 * Math.max(1, hs), Math.max(capA || Infinity, H * 1.18)), ys = [0, H2 * .34, H2 * .64, H2], nb = I.bins.length;
        const need = (a, b) => { let r = 0; for (let k = 0; k < nb; k++) { const y = (k + .5) / nb * H; if (y >= a - H / nb && y <= b + H / nb) r = Math.max(r, I.bins[k]); } return r + .16; };
        for (let k = 0; k < 2; k++) { const y0 = ys[k], y1 = ys[k + 1], rd = Math.max(need(y0, y1), .3), re = k ? rd * 1.32 : Math.max(rd * 1.25, R * 1.18), hk = (y1 - y0) * .64;
          const sk = [[re * .84, -.1], [re, .42], [re * .88, .14], [mix(re * .88, rd, .35), .34], [mix(re * .88, rd, .7), .66], [rd, 1]].map(([r, g]) => [r, y0 + g * hk]);
          if (k === 0) pts = sk; else adds.push({ geo: lathe(sk, seg, U), mat: 'roof' });
          adds.push({ geo: cylGeo(rd - .02, rd - .02, y1 - y0 - hk + .06, seg), mat: 'lacq', y: y0 + hk - .04 }); }
        const rd2 = Math.max(need(ys[2], H), .25); adds.push({ geo: lathe(enclose(prof(P.flare, rd2 * 1.45, H2 - ys[2], ys[2]), I), seg, U), mat: 'roof' }); apex = H2;
      } else {                                                                                          // fernost: one to three stacked pagoda roofs
        const n = kind === 'one' ? 1 : kind === 'two' ? 2 : kind === 'three' ? (R > .9 ? 3 : 2) : (H / R > 1.1 ? 2 : 1);
        if (n > 1) { const H2 = Math.max(H * 1.05, R * (n > 2 ? 2.1 : 1.7)) * hs, pg = pagoda(R, H2, n, seg, U); main = pg.main; adds.push(...pg.adds); apex = H2; }
        else pts = prof(P.flare, R * 1.22, clamp(H * .8, R * .8, R * 1.35) * hs);
      }
      if (!main) main = lathe(pts, seg, U);
      if (apex == null) { apex = 0; for (const p of pts) apex = Math.max(apex, p[1]); }
    } else if (I.cls === 'square' || I.cls === 'hip') {
      const a = I.a, b = I.b, r = I.r || 0, H = I.H, m = Math.min(a, b); fs = clamp(m / 1.4, .45, 1.6);
      if (st === 'nordisch') { const H2 = clamp(Math.max(H * 1.3, m * 2.2), H, H * 1.6) * hs, k = 1.03;
        if (kind !== 'spire') { const h1 = H2 * .3, a1 = a * k, b1 = b * k, r1 = r * k, dx = r1 + (a1 - r1) * .54 + .02, dz = b1 * .54 + .02, dh = H2 * .2, y2 = h1 + dh - .08;
          main = surf(hipFaces(a1, b1, r1), P.nskirt, h1, { uv: U }); adds.push({ geo: boxGeo(dx * 2, dh, dz * 2), mat: 'dark', y: h1 - .04 }, { geo: surf(hipFaces(a * .72, b * .72, r * .72), P.nord, H2 - y2, { uv: U }), mat: 'roof', y: y2 }); }
        else main = surf(hipFaces(a * k, b * k, r), P.nord, H2, { uv: U });
        apex = H2; adds.push({ geo: hornsGeo(a * k * 1.04, b * k * 1.04, fs), mat: 'dark' }); }
      else if (st === 'suedlich') { const H2 = clamp(H * .72, m * .65, m * (kind === 'slim' ? 1.2 : .95)) * hs, k = 1.1; main = surf(hipFaces(a * k, b * k, r * k), P.sued, H2, { uv: U }); apex = H2; }
      else if (st === 'morgenland') {
        if (a > 1.5 * b) { const H2 = clamp(Math.max(H, b * 1.05), b * 1.05, b * 1.5) * hs; main = surf(gableFaces(a, b), P.gOgee, H2, { uv: U, end: a * .995, a, b }); apex = H2; fs *= .7; }
        else { const R2 = m * .92, sl = .12, melon = kind === 'melon', H2 = (melon ? R2 * 1.75 : clamp(Math.max(H * .9, R2 * 1.9), R2 * 1.9, R2 * 2.6)) * hs, pts = prof(melon ? P.melon : P.onion, R2, H2, sl);
          main = lathe(pts, 24, U); if (melon) ribbed(main, 12, .07); apex = sl + H2; fs = clamp(R2 / 1.4, .45, 1.6);
          adds.push({ geo: boxGeo(a * 2, sl, b * 2), mat: 'trim' }, { geo: pinnGeo(a - .16 * fs, b - .16 * fs, fs, sl), mat: 'trim' }, ring(R2 * .9 + .01, .04 + R2 * .02, sl + .02, 'gold', 24)); }
      } else {
        const two = kind === 'two' || kind === 'three' || (kind === 'auto' && H / m > 1.4);
        if (two) { const H2 = Math.max(H * .95, m * 1.6) * hs, h1 = H2 * .34, k = 1.1, a1 = a * k, b1 = b * k, r1 = r * k, dx = r1 + (a1 - r1) * .52 + .02, dz = b1 * .52 + .02, dh = H2 * .1, y2 = h1 + dh - .06;
          main = surf(hipFaces(a1, b1, r1), P.skirt, h1, { uv: U, lift: .25 }); adds.push({ geo: boxGeo(dx * 2, dh, dz * 2), mat: 'lacq', y: h1 - .04 }, { geo: surf(hipFaces(a * .9, b * .9, r * .9), P.flare, H2 - y2, { uv: U, lift: .2 }), mat: 'roof', y: y2 }); apex = H2; }
        else { const H2 = clamp(H * .8, m * .85, m * 1.4) * hs, k = 1.1; main = surf(hipFaces(a * k, b * k, r * k), P.flare, H2, { uv: U, lift: .2 }); apex = H2; }
      }
    } else if (I.cls === 'gable') {
      const a = I.a, b = I.b, H = I.H; fs = clamp(b / 1.6, .4, 1.2);
      if (st === 'nordisch') { const H2 = clamp(H * 1.45, b * 1.1, b * 2.3) * hs, a2 = a * 1.03, b2 = b * 1.03; main = surf(gableFaces(a2, b2), P.gNord, H2, { uv: U, end: a, a: a2, b: b2 }); apex = H2; peak = H2 + .3 + H2 * .14; adds.push({ geo: boardsGeo(a2, b2 * 1.03, H2), mat: 'dark' }); }
      else if (st === 'suedlich') { const H2 = clamp(H * .6, b * .42, b * .7) * hs, a2 = a * 1.05, b2 = b * 1.02; main = surf(gableFaces(a2, b2), P.gSued, H2, { uv: U, end: a, a: a2, b: b2 }); apex = H2; }
      else if (st === 'morgenland') { const H2 = clamp(Math.max(H, b * 1.05), b * 1.05, b * 1.5) * hs; main = surf(gableFaces(a, b), P.gOgee, H2, { uv: U, end: a * .995, a, b }); apex = H2; }
      else { const H2 = clamp(H * .85, b * .65, b * 1.2) * hs, a2 = a * 1.1, b2 = b * 1.1; main = surf(gableFaces(a2, b2), P.gFlare, H2, { uv: U, end: a, a: a2, b: b2, lift: .16, sweep: .28 }); apex = H2; peak = H2 * 1.28; }
    } else return null;
    return { main, adds, apex, peak: Math.max(peak || 0, apex), fin, fs, sy };
  }

  // ---------- props at the gate (per culture, placed by the base's seed) ----------
  const cypGeo = () => memo('g.cyp', () => lathe([[.02, 0], [.2, .06], [.3, .22], [.31, .42], [.25, .64], [.14, .84], [.02, 1]], 8, 1));
  const leafGeo = () => memo('g.leaf', () => { const g = new T.PlaneGeometry(1.3, .36, 5, 2); g.translate(.65, 0, 0); g.rotateX(-PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, -.36 * x * x - Math.abs(z) * .5); p.setZ(i, z * (1 - x / 1.6)); } g.computeVertexNormals(); return g; });
  const stoneLantern = () => memo('g.toro', () => { const L = [], c = (rt, rb, h, y, s = 8) => { const g = new T.CylinderGeometry(rt, rb, h, s); g.translate(0, y + h / 2, 0); L.push(g); };
    c(.26, .3, .12, 0); c(.08, .1, .62, .12, 6); const pl = new T.BoxGeometry(.44, .08, .44); pl.translate(0, .78, 0); L.push(pl);
    const rf = new T.ConeGeometry(.4, .24, 4); rf.rotateY(PI / 4); rf.translate(0, 1.11 + .12, 0); L.push(rf); const j = new T.SphereGeometry(.06, 6, 5); j.translate(0, 1.38, 0); L.push(j); return merge(L); });
  const runeGeo = () => memo('g.rune', () => { const g = new T.BoxGeometry(.52, 1.3, .24, 1, 2, 1); g.translate(0, .65, 0); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 1.2) p.setX(i, p.getX(i) * .7); g.computeVertexNormals(); K.worldUV(g, .4); return g; });
  // the stage's shore dressing (rocks, bushes, trees), same sequence as stage.js buildIsland, in world axes
  const dressCache = {};
  function dressing(R0, keep) {
    const key = R0 + '/' + keep; if (dressCache[key]) return dressCache[key];
    const r = K.rng(5), out = [];
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = keep + 1 + r() * (R0 - keep - 1.6), x = Math.cos(a) * d, z = Math.sin(a) * d, k = r(), s = r();
      out.push({ x, z, r: k < .35 ? .35 + s * .5 : k < .75 ? .35 + s * .35 : .9 * (.8 + s * .5) }); }
    return dressCache[key] = out;
  }
  // Props stand in pairs beside the road out of the gate (+z), inside the wedge that umland.js keeps free of its items, clear of the
  // road, the lanterns along a stone road and the island's trees and rocks. A few extra ones stand around the plot only when umland.js
  // reads model.userData.styleProps ([{x, z, r}] in the model's own axes) and so keeps its items away from them.
  function addProps(g, st, c, V) {
    const kind = STY[st].props; if (!kind || c.capital) return;                                        // a capital stands on its plinth: nothing at ground level around it
    const t = OW.tierOf(c.level || 1), def = OW.TIERS[t] || {}, plotR = def.plotR || (g.userData && g.userData.radius) || 6;
    const meta = OW.models.basis && OW.models.basis.meta ? OW.models.basis.meta(c) : {}, islandR = meta.islandR || plotR + 5.5, keep = meta.plotR || plotR;
    const R = K.rng(((c.seed | 0) || 1) * 7919 + st.length), kt = 1 + t * .07, seed = c.seed | 0;
    const rot = seed ? (seed % 4) * PI / 2 : 0, mir = seed && ((seed >> 2) % 2) ? -1 : 1, cr = Math.cos(rot), sr = Math.sin(rot);
    const obst = dressing(islandR, keep).map(o => ({ x: (cr * o.x - sr * o.z) * mir, z: sr * o.x + cr * o.z, r: o.r }));
    const list = g.userData.styleProps = g.userData.styleProps || [];
    const clear = (x, z, r) => obst.every(o => Math.hypot(o.x - x, o.z - z) >= o.r + r + .5) && list.every(p => Math.hypot(p.x - x, p.z - z) >= p.r + r + .2);
    const put = (geo, mat, x, y, z, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (o.s) m.scale.copy(o.s); if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz; if (o.rx) m.rotation.x = o.rx; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    // one prop: footprint radius r at (x, z); side = −1 / 1 (which side of the road), s = size
    const one = (x, z, s, side) => {
      if (kind === 'cypress') { const cm = own('cyp', { color: 0x2e5a2d, map: OW.TEX.grass(), bumpScale: .8 }), h = s, w = h * .4;
        put(cylGeo(.06, .08, .3, 5), recol(M.darkWood(), 'dark', st, V), x, 0, z); put(cypGeo(), cm, x, .15, z, { s: new T.Vector3(w, h, w) }); }
      else if (kind === 'palms') { const pm = own('palm', { color: 0x4f7f33, side: T.DoubleSide, roughness: .8 }), tm = recol(M.wood(), 'wood', st, V), h = s, tilt = side * (.12 + R() * .12);
        const grp = new T.Group(); grp.position.set(x, 0, z); g.add(grp);
        const tr = new T.Mesh(cylGeo(.09, .15, 1, 6), tm); tr.scale.set(1, h, 1); tr.rotation.z = -tilt; tr.castShadow = true; grp.add(tr);
        const top = new T.Group(); top.position.set(Math.sin(tilt) * h, Math.cos(tilt) * h, 0); grp.add(top);
        for (let k = 0; k < 8; k++) { const lf = new T.Mesh(leafGeo(), pm); lf.rotation.y = k / 8 * PI * 2 + R() * .3; lf.scale.setScalar(kt * (.8 + R() * .25)); lf.castShadow = true; top.add(lf); }
        const nut = new T.Mesh(boxGeo(.3, .22, .3), recol(M.darkWood(), 'dark', st, V)); nut.position.y = -.2; top.add(nut); }
      else if (kind === 'lanterns') { put(stoneLantern(), recol(M.cap(), 'trim', st, V), x, 0, z, { s: new T.Vector3(s, s, s) }); put(boxGeo(.26, .28, .26), M.window(), x, .84 * s, z, { s: new T.Vector3(s, s, s) }); }
      else if (kind === 'runes') put(runeGeo(), recol(M.darkStone(), 'stone', st, V), x, 0, z, { s: new T.Vector3(s, s * (.9 + R() * .4), s), ry: side * (.25 + R() * .3), rz: (R() - .5) * .12 });
    };
    const foot = { cypress: (s) => .13 * s, palms: () => .3, lanterns: (s) => .42 * s, runes: (s) => .3 * s }[kind];
    const size = { cypress: () => (2.4 + R() * 1.1) * kt, palms: () => (2.3 + R() * .9) * kt, lanterns: () => kt * (.95 + R() * .2), runes: () => kt * (.8 + R() * .45) }[kind];
    const minS = { cypress: 1.7, palms: 1.9, lanterns: .75, runes: .6 }[kind];
    // the gate lane: between the road (plus its lanterns on a stone road) and the edge of umland's free wedge
    const stone = t >= 5, road = (stone ? .45 : .375) * (1 + t * .03) + (stone ? .05 : .3) + .12, inner = Math.max(road, stone ? .96 : 0) + .12;
    const wedge = 1 / (plotR + 1.5) + .12, pairs = kind === 'palms' ? 1 : (R() < .55 ? 2 : 1), lone = R() < .2 ? (R() < .5 ? -1 : 1) : 0;
    let z = plotR + 1.05 + R() * .3;
    for (let i = 0; i < pairs; i++, z += 1.35 + R() * .3) {
      const outer = z * Math.sin(wedge) - .12, lane = outer - inner; if (lane < .5) continue;
      let s = size(); const rMax = lane / 2 - .02; if (foot(s) > rMax) s *= rMax / foot(s); if (s < minS * kt * .8) continue;
      const r = foot(s), x0 = inner + r + (lane - 2 * r) * (.3 + R() * .4);
      for (const side of [-1, 1]) { if (i === 0 && side === lone) continue; const x = side * x0, zz = z + (R() - .5) * .2;
        if (!clear(x, zz, r)) continue; one(x, zz, s, side); list.push({ x, z: zz, r }); }
    }
    // extra props around the plot: only where umland.js keeps its items away from them (or builds none)
    const aware = !c.seed || c.umland === false || !OW.umland || /styleProps/.test(String(OW.umland.build));
    if (!aware) return;
    const extra = { cypress: 2, palms: 1, lanterns: 0, runes: 1 }[kind] + (R() < .4 ? 1 : 0);
    const cand = [200, 235, 305, 340, 20, 160, 255, 285, 130, 50].map(d => d * PI / 180); for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    let n = 0;
    for (const a0 of cand) { if (n >= extra) break; const a = a0 + (R() - .5) * .2, rr = plotR + 1.0 + R() * .6, x = Math.cos(a) * rr, zz = Math.sin(a) * rr, s = size(), r = foot(s);
      if (Math.abs(Math.atan2(x, zz)) < wedge + .15 || !clear(x, zz, r)) continue; one(x, zz, s, x < 0 ? -1 : 1); list.push({ x, z: zz, r }); n++; }
  }

  // ---------- apply ----------
  const _b = new T.Box3(), _c = new T.Vector3(), _mm = new T.Matrix4(), _inv = new T.Matrix4();
  const attached = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  const triPrism = (geo) => { if (!geo || geo.type !== 'ExtrudeGeometry' || !geo.parameters) return false; let s = geo.parameters.shapes; if (Array.isArray(s)) { if (s.length !== 1) return false; s = s[0]; }
    if (!s || !s.getPoints || (s.holes && s.holes.length)) return false; const pts = s.getPoints(), u = []; for (const p of pts) if (!u.some(v => v.distanceTo(p) < 1e-4)) u.push(p); return u.length === 3; };
  // highest point of everything visible in the model, in the model's own axes
  function maxY(model, invModel) {
    let y = -Infinity;
    model.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; for (let p = o; p && p !== model; p = p.parent) if (!p.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); _mm.multiplyMatrices(invModel, o.matrixWorld); _b.copy(o.geometry.boundingBox).applyMatrix4(_mm); if (_b.max.y > y) y = _b.max.y; });
    return y;
  }
  const GROW = 1.0;                                                                                     // the model's top may rise by this much at most (map sprite frame)

  function apply(model, st, c) {
    const S = STY[st]; if (!S || !model || model.userData.style) return model;
    c = c || {}; const seed = Math.abs(c.seed | 0), lv = c.level || 1;
    if (st === 'klassisch' && !seed) return model;                                                     // no seed: the tier exactly as its author built it
    const V = variant(st, seed); model.userData.style = st; model.userData.styleVariant = V;
    model.updateMatrixWorld(true); _inv.copy(model.matrixWorld).invert(); const invModel = _inv.clone(), yMax0 = maxY(model, invModel);
    // 1. materials: stone / trim / timber tone, collect roof candidates
    const meshes = []; model.traverse(o => { if (o.isMesh && o.geometry && o.material && !Array.isArray(o.material)) meshes.push(o); });
    const cands = [], merl = [];
    for (const o of meshes) { const cls = classOf(o.material);
      if ((cls === 'stone' || cls === 'trim') && o.geometry.type === 'BoxGeometry' && o.parent) { const p = o.geometry.parameters; if (p && p.height >= .3 && p.height <= .85 && Math.max(p.width, p.depth) <= .75 && Math.max(p.width, p.depth) >= .3 && Math.min(p.width, p.depth) >= .2) merl.push(o); }
      if (cls === 'roof') cands.push({ o, roof: true });
      else if (cls && cls !== 'stone' && cls !== 'trim' && cls !== 'cloth' && triPrism(o.geometry)) cands.push({ o, roof: false });   // thatch, wooden and shingle gables (tents keep their cloth, crest and door)
      if (cls && cls !== 'roof' && cls !== 'cloth' && cls !== 'shingle') o.material = recol(o.material, cls, st, V); }
    restyleMerlons(merl, st);
    // 2. roofs, biggest first; the biggest cone / pyramid / hipped roof is the base's main roof
    const set = new Set(cands.map(k => k.o)), lv100 = lv >= 100;
    for (const k of cands) k.I = analyse(k.o);
    let big = null; for (const k of cands) if (k.roof && k.I && (k.I.cls === 'round' || k.I.cls === 'square' || k.I.cls === 'hip') && (!big || k.I.W * k.I.D > big.I.W * big.I.D)) big = k; if (big) big.main = true;
    cands.sort((A, B) => (B.I ? B.I.W * B.I.D : 0) - (A.I ? A.I.W * A.I.D : 0));
    const retex = (o, roof) => { if (roof) o.material = roofMat(o.material, st); };
    for (const { o, roof, I, main: isMain } of cands) {
      if (!attached(o, model)) continue;                                                               // went with a removed dormer
      if (!I || !(roof || I.cls === 'gable')) { retex(o, roof); continue; }
      const Pp = o.parent, fx = o.position.x + I.cx, fy = o.position.y + I.y0, fz = o.position.z + I.cz, yt = o.position.y + I.y1;
      const ex = I.cls === 'round' ? I.R : I.axis === 'x' ? I.a : I.b, ez = I.cls === 'round' ? I.R : I.axis === 'x' ? I.b : I.a;
      const tlx = I.axis === 'x' ? I.tl : 0, tlz = I.axis === 'z' ? I.tl : 0, tol = Math.max(.3, .2 * Math.min(ex, ez)), apexTol = Math.max(.3, .12 * I.H);
      Pp.updateMatrixWorld(true); const invP = new T.Matrix4().copy(Pp.matrixWorld).invert();
      // what sits on this roof: a collar or crown around it (then the roof keeps its shape), parts on the apex / ridge, parts on the slopes
      let collar = false; const sit = [], onSlope = [];
      for (const s of Pp.children) {
        if (s === o || set.has(s) || !s.visible) continue;
        const sp = s.position, gt = s.isMesh && s.geometry.type, gp = (s.isMesh && s.geometry.parameters) || {};
        if ((gt === 'TorusGeometry' || (gt === 'CylinderGeometry' && gp.radiusTop * s.scale.x > .5 * Math.min(ex, ez))) && Math.hypot(sp.x - fx, sp.z - fz) < .15 && sp.y > fy + .1 * I.H && sp.y < yt - .1 * I.H) { collar = true; break; }
        const dx = Math.max(0, Math.abs(sp.x - fx) - tlx), dz = Math.max(0, Math.abs(sp.z - fz) - tlz);
        if (Math.hypot(dx, dz) <= tol && sp.y >= yt - apexTol && sp.y <= yt + 4) { sit.push(s); continue; }       // on the apex / ridge: finial, flag, spike, lantern
        if (s.isMesh && (Math.abs(sp.x - fx) > ex + 3 || Math.abs(sp.z - fz) > ez + 3)) continue;
        const chim = gt === 'BoxGeometry' && gp.height > 1.5 * Math.max(gp.width, gp.depth), smoke = !s.isMesh && s.children.length > 0 && s.children.every(ch => ch.isSprite);
        _b.setFromObject(s).applyMatrix4(invP); _b.getCenter(_c);                                      // lies on the old roof surface: dormer, rod, board, chimney
        if (Math.abs(_c.x - fx) <= ex + .15 && Math.abs(_c.z - fz) <= ez + .15 && _c.y > fy + .15 * I.H && _b.min.y >= fy - .12 && (chim || smoke || _b.max.y <= yt + .3 + .15 * I.H) && _b.max.x - _b.min.x <= 2 * ex + .5 && _b.max.z - _b.min.z <= 2 * ez + .5)
          onSlope.push({ s, stay: chim || smoke, gold: s.isMesh && gilt(s.material) });
      }
      if (collar || (lv100 && onSlope.some(e => e.gold))) { retex(o, roof); continue; }              // the level-100 crown (and anything gilded on a slope) keeps its roof
      if (st === 'klassisch' && onSlope.length) continue;                                             // klassisch never removes anything
      // apex parts: small plain tip ornaments go (the culture brings its own finial), everything else is re-seated on the new apex
      const hideSmall = S.always || (I.cls === 'gable' && st !== 'nordisch' && st !== 'klassisch'), kill = [], movers = [];
      for (const s of sit) { let small = false;
        if (hideSmall && s.isMesh && !glowy(s.material) && !(lv100 && gilt(s.material))) { if (!s.geometry.boundingSphere) s.geometry.computeBoundingSphere(); small = s.geometry.boundingSphere.radius * Math.max(s.scale.x, s.scale.y, s.scale.z) < .35; }
        (small ? kill : movers).push(s); }
      let mFoot = 0, mTop = 0; if (movers.length) { mFoot = Infinity; mTop = -Infinity; for (const s of movers) { mFoot = Math.min(mFoot, s.position.y); _b.setFromObject(s).applyMatrix4(invP); mTop = Math.max(mTop, _b.max.y); } }
      // cap: the stack on this roof (roof + finial or re-seated parts) may not lift the model's top by more than GROW
      _c.set(fx, fy, fz).applyMatrix4(Pp.matrixWorld).applyMatrix4(invModel); const yM0 = _c.y, mx = _c.x, mz = _c.z; _c.set(fx, fy + 1, fz).applyMatrix4(Pp.matrixWorld).applyMatrix4(invModel);
      const sY = Math.max(1e-6, _c.y - yM0), lim = (yMax0 + GROW - yM0) / sY;
      // a roof that must enclose an old dome (gold ribs may be merged into other meshes) gets its height limit inside the plan, never squashed afterwards
      const capA = I.convex ? lim - (movers.length ? mTop - mFoot : S.fin ? FINH[S.fin] * clamp(I.R / 1.4, .45, 1.6) : 0) : 0;
      let kind = isMain ? V.kM : V.kS; const hs = isMain ? V.hsM : V.hsS;
      if (kind === 'auto' && st === 'morgenland') kind = (mx > .5) === (mz > .5) ? 'lance' : 'onion';       // a skyline: slim towers alternate minaret tips and onions
      const pl = memo('pl.' + [st, I.cls, q(I.R || 0), q(I.H), q(I.a || 0), q(I.b || 0), q(I.r || 0), I.convex ? Array.from(I.bins, q).join(',') + '|' + q(capA) : 0, isMain ? 1 : 0, I.kit ? I.seg : 0, kind, hs].join('|'), () => plan(st, I, S, kind, hs, isMain, capA));
      if (!pl) { retex(o, roof); continue; }
      const fin = pl.fin && !movers.length ? pl.fin : null, finH = fin ? FINH[fin] * pl.fs : 0, extra = movers.length ? mTop - mFoot : finH;
      let k = 1; if (pl.apex + extra > lim) k = Math.min(k, (lim - extra) / pl.apex); if (pl.peak > lim) k = Math.min(k, lim / pl.peak);
      if (k < 1) k = I.convex ? 1 : Math.max(k, Math.min(1, I.H / pl.apex), .55);
      // replace the geometry in place (same footprint and foot), keep the owner material (as a tiled clone)
      let apexY;
      if (pl.sy) { const f = pl.sy * k; o.scale.y *= f; o.position.y = fy - I.y0 * f; apexY = fy + I.H * f; }
      else { const rm = roof ? roofMat(o.material, st) : o.material;
        o.geometry = pl.main; o.material = rm; o.position.set(fx, fy, fz); o.rotation.set(0, I.axis === 'z' ? PI / 2 : 0, 0); o.scale.set(1, k, 1);
        for (const a of pl.adds) { const mm = new T.Mesh(a.geo, addMat(a.mat, rm, st, V)); mm.position.y = a.y || 0; mm.castShadow = true; mm.receiveShadow = true; mm.userData.styleAdd = true; o.add(mm); }
        apexY = fy + pl.apex * k; }
      const seat = apexY - .03;
      for (const s of movers) s.position.y += seat - mFoot;
      if (fin) { const fm = new T.Mesh(finGeo(fin), fin === 'gold' ? M.gold() : fin === 'sorin' ? M.bronze() : fin === 'spike' ? M.iron() : addMat('trim', o.material, st, V));
        fm.position.set(fx, seat, fz); fm.scale.setScalar(pl.fs); fm.castShadow = true; fm.userData.styleFin = fin; Pp.add(fm); }
      // parts on the old slopes go (chimneys and their smoke stay while the new roof is not lower); removed, not hidden, so fire and outlines never find them
      const lower = pl.sy ? pl.sy * k < 1 : (st !== 'nordisch' || pl.apex * k < I.H - .05);
      for (const e of onSlope) if (!e.stay || lower) kill.push(e.s);
      for (const s of kill) s.removeFromParent();
    }
    // the model's top (camera framing, fire band, battle smoke): keep the tier author's convention, move it by what really changed
    model.updateMatrixWorld(true);
    if (model.userData.top != null) model.userData.top += maxY(model, invModel) - yMax0;
    // 3. props at the gate
    addProps(model, st, c, V);
    return model;
  }

  OW.styles = { LIST, KEYS, apply, applyKlassisch: (model, c) => apply(model, 'klassisch', c), pick: (seed) => KEYS[Math.abs(seed | 0) % KEYS.length], variant, _analyse: analyse, _classOf: classOf };
})();


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
    const g = K.put(p, geo, m, x, y, z, { ry });
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
      const [x, z] = P(a, 8.12), [xo, zo] = P(a, 8.32);
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
    try { s = render(c, px); cache.set(key, s); pixels += px * px; return s; } catch (e) { console.warn('Baukunst', e); if (++G.fails >= 3) G.off = true; return null; }
  };
  G.clear = () => { cache.clear(); want.clear(); pixels = 0; };
  G.stats = () => ({ sprites: cache.size, mb: Math.round(pixels * 4 / 1e5) / 10, queued: want.size, renders: G.renders, avgMs: G.renders ? Math.round(G.ms / G.renders) : 0 });
  try { const t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) G.off = true; } catch (e) { G.off = true; }   // no WebGL: the drawn sprites stay
})();
} catch (e) { console.warn('Baukunst aus', e); if (window.OW) window.OW.game = null; }
