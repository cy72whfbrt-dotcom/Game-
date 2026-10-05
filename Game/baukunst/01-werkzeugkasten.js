// Teil 01-werkzeugkasten.js: Kopf, Baukasten: Stoffe, gemalte Muster, Bauteile, Bewegung
// ===== baukunst.js – die Basen in 3D =====
// Geladen nach three.js (verzögert). Hier stehen nur die Bausätze und Modelle (Basis in 10 Stufen, Tempel,
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
