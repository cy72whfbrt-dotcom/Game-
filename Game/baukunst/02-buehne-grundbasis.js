// Teil 02-buehne-grundbasis.js: Bühne (Umrisse, Sockel der Hauptstadt, Kartenbilder) und die normale Basis (fünf Stufen)


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
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); try { const G = window.OW && OW.game; if (G) { G.off = true; if (G.clear) G.clear(); if (typeof requestRender === "function") requestRender(); } } catch (x) {} });   // (iOS im Hintergrund: ab dann die gezeichneten Bilder statt leerer 3D-Bilder)
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
