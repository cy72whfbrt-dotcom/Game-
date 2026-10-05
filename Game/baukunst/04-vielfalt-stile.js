// Teil 04-vielfalt-stile.js: Vielfalt, Anbauten und fünf Baustile – keine Basis sieht gleich aus


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
