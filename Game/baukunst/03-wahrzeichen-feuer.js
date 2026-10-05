// Teil 03-wahrzeichen-feuer.js: Wahrzeichen (Tempel, Wächter-Tempel, Mega-Tempel/Thron, Tor) und brennende Basis


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
