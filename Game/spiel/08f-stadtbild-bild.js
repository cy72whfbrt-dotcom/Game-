// Teil 08f-stadtbild-bild.js: Stadtansicht: Leute, Kamera, Bild; Stufenaufstieg-Fenster
// ---- people: villagers on the streets ----
const CITY_PATHS = [
    [[CC, 520], [CC, 494], [CC, 380]], [[244, 244], [396, 244], [396, 396], [244, 396], [244, 244]],
    [[244, 178], [244, 462]], [[396, 462], [396, 178]], [[178, 244], [462, 244]], [[462, 396], [178, 396]], [[CC, 172], [CC, 260]], [[172, CC], [260, CC]]
];
let cityFolk = null;
function cityMakeFolk() {
    const rnd = mulberry32(7), cols = ['#8e3a2c', '#2f5e9a', '#6d8a4a', '#8a6440', '#c9a54e', '#5d4a7a', '#e9dfc8'];
    cityFolk = [];
    for (let i = 0; i < 40; i++) { const p = CITY_PATHS[i % CITY_PATHS.length];
        cityFolk.push({ p, t: rnd(), v: (.012 + rnd() * .018) * (rnd() < .5 ? -1 : 1), col: cols[Math.floor(rnd() * cols.length)], hat: rnd() < .4, cart: i % 11 === 5 }); }
}
function cityPathPoint(p, t) {                                              // a point along a polyline, t in 0..1
    let total = 0; const seg = []; for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); seg.push(l); total += l; }
    let d = ((t % 1) + 1) % 1 * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const q = d / seg[i]; return [p[i][0] + (p[i + 1][0] - p[i][0]) * q, p[i][1] + (p[i + 1][1] - p[i][1]) * q]; } d -= seg[i]; }
    return p[p.length - 1];
}

// ---- camera ----
const CITY_VIEW = { x0: -420, x1: 420, y0: 0, y1: 650 };                    // what the camera may show (the town, the land around it)
function cityFitZoom(W, H) { return Math.min(W / (CITY_VIEW.x1 - CITY_VIEW.x0), H / (CITY_VIEW.y1 - CITY_VIEW.y0)); }
function cityClampCam(W, H) {
    const c = cityCam, zMin = Math.max(cityFitZoom(W, H) * .95, W / (CITY_BOUNDS.x1 - CITY_BOUNDS.x0 - 60), H / (CITY_BOUNDS.y1 - CITY_BOUNDS.y0 + 60)), zMax = 3;   // (nie weiter als das gemalte Land; oben/unten läuft es weich in die Grundfarbe aus)
    c.z = Math.max(zMin, Math.min(zMax, c.z));
    const hw = W / 2 / c.z, hh = H / 2 / c.z, V = CITY_VIEW;                  // keep the town in view (centred when it is smaller than the screen)
    c.x = V.x1 - V.x0 <= 2 * hw ? (V.x0 + V.x1) / 2 : Math.max(V.x0 + hw, Math.min(V.x1 - hw, c.x));
    c.y = V.y1 - V.y0 <= 2 * hh ? (V.y0 + V.y1) / 2 : Math.max(V.y0 + hh, Math.min(V.y1 - hh, c.y));
}

cityCanvas.addEventListener('pointerdown', e => {
    if (e.isPrimary) { cityPointers.clear(); cityGesture = null; }             // a new first finger: whatever was left over from before is gone
    try { cityCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (cityCam) cityCam.tx = cityCam.ty = undefined;
    if (cityPointers.size === 1) cityDrag = { x: e.clientX, y: e.clientY, cx: cityCam && cityCam.x, cy: cityCam && cityCam.y, moved: false };
    else if (cityPointers.size === 2) { const [a, b] = [...cityPointers.values()]; cityGesture = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cityCam.z }; if (cityDrag) cityDrag.moved = true; }
});
cityCanvas.addEventListener('pointermove', e => {
    if (!cityPointers.has(e.pointerId) || !cityCam) return;
    cityPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cityPointers.size >= 2 && cityGesture) { const [a, b] = [...cityPointers.values()]; cityCam.z = cityGesture.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, cityGesture.d); return; }
    if (!cityDrag) return;
    const dx = e.clientX - cityDrag.x, dy = e.clientY - cityDrag.y;
    if (Math.hypot(dx, dy) > 8) cityDrag.moved = true;
    if (cityDrag.moved) { cityCam.x = cityDrag.cx - dx / cityCam.z; cityCam.y = cityDrag.cy - dy / cityCam.z; }
});
const cityPointerEnd = e => { cityPointers.delete(e.pointerId); if (cityPointers.size < 2) cityGesture = null;
    if (!cityPointers.size) setTimeout(() => { cityDrag = null; }, 0);
    else if (cityPointers.size === 1 && cityCam) { const [p] = [...cityPointers.values()]; cityDrag = { x: p.x, y: p.y, cx: cityCam.x, cy: cityCam.y, moved: true }; } };
cityCanvas.addEventListener('pointerup', cityPointerEnd);
cityCanvas.addEventListener('pointercancel', cityPointerEnd);
cityCanvas.addEventListener('wheel', e => { if (!cityCam) return; e.preventDefault(); cityCam.z *= Math.exp(-e.deltaY * .0015); }, { passive: false });
cityCanvas.addEventListener('click', e => {
    if (cityDrag && cityDrag.moved) return;       // that was a swipe, not a tap
    const r = cityCanvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hits = cityHitRects.filter(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const hit = hits.sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0];   // the building closest to the finger
    if (hit && hit.id !== cityRingId) { cityFocus(hit.id); cityRingAuf(hit.id); }   // erst die runden Knöpfe am Gebäude (wie in Rise of Kingdoms)
    else { cityRingZu(); cityOpenId = null; document.getElementById('citySheet').hidden = true; }
});

function cityLotOf(id) { return id === '_keep' ? CITY_KEEP_AT : CITY_LOTS[id]; }
function cityFocus(id, now) {                                             // glide (or jump) the camera to a building
    const at = cityLotOf(id); if (!at || !cityCam) return;
    const [x, y] = cIso(at[0], at[1]); cityCam.tx = x; cityCam.ty = y - 14;
    if (now) { cityCam.x = cityCam.tx; cityCam.y = cityCam.ty; cityCam.tx = cityCam.ty = undefined; }
}
// ---- fertige Bild-Lagen für die Stadt (siehe cityFrame): unten = Boden + hintere Mauer + Schatten, oben = vordere Mauer, licht = Licht + Rand ----
const CITY_LAGEN = { letzt: '', letztZ: 0, key: '', lichtKey: '', unten: null, oben: null, licht: null };
function cityLage(name, W, H, dpr2, paint) {
    const c = CITY_LAGEN[name] || (CITY_LAGEN[name] = document.createElement('canvas')), w = Math.round(W * dpr2), h = Math.round(H * dpr2);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.imageSmoothingQuality = 'high'; paint(g);
}
function cityLagenFrei() {                                                   // the town is closed: give the memory back
    for (const n of ['unten', 'oben', 'licht']) if (CITY_LAGEN[n]) { CITY_LAGEN[n].width = CITY_LAGEN[n].height = 0; CITY_LAGEN[n] = null; }
    CITY_LAGEN.key = CITY_LAGEN.lichtKey = CITY_LAGEN.letzt = ''; CITY_LAGEN.letztZ = 0;
}
function cityUnten(g, W, H, Z, ox, oy, walls, list, toS) {                   // background, ground, back walls and the soft shadows of all houses
    const wb = CITY_BOUNDS;
    g.fillStyle = CITY_BG_COL; g.fillRect(0, 0, W, H);
    g.drawImage(CITY_GROUND || cityPaintGround(), wb.x0 * Z + ox, wb.y0 * Z + oy, (wb.x1 - wb.x0) * Z, (wb.y1 - wb.y0) * Z);
    const mb = walls.B; g.drawImage(walls.back, mb.x0 * Z + ox, mb.y0 * Z + oy, (mb.x1 - mb.x0) * Z, (mb.y1 - mb.y0) * Z);
    for (const it of list) { const [sx, sy] = toS(it.x, it.y), r = (it.keep ? 46 : it.deco ? 14 : it.ghost ? 18 : 28) * Z, shx = sx + r * .35, shy = sy + r * .12;   // soft shadow falling to the lower right (sun top left)
        const sg = g.createRadialGradient(shx, shy, r * .1, shx, shy, r * 1.1); sg.addColorStop(0, 'rgba(20,30,10,.32)'); sg.addColorStop(1, 'rgba(20,30,10,0)');
        g.fillStyle = sg; g.beginPath(); g.ellipse(shx, shy, r * 1.1, r * .55, 0, 0, Math.PI * 2); g.fill(); }
}
function cityOben(g, Z, ox, oy, walls) { const mb = walls.B; g.drawImage(walls.front, mb.x0 * Z + ox, mb.y0 * Z + oy, (mb.x1 - mb.x0) * Z, (mb.y1 - mb.y0) * Z); }
// a house picture: painted large once (CITY_SPR_SCALE), shrunk to the current zoom once more and kept - then every
// frame is a 1:1 copy instead of shrinking the big picture again (the same look, a fraction of the work)
const CITY_SPR_FERTIG = new WeakMap();
function citySprDraw(g, s, dx, dy, k, dpr2, zStill) {
    if (!zStill) { g.drawImage(s.c, dx, dy, s.c.width * k, s.c.height * k); return; }
    const f = k * dpr2; let m = CITY_SPR_FERTIG.get(s);
    if (!m || m.f !== f) { const c = m ? m.c : document.createElement('canvas'); c.width = Math.ceil(s.c.width * f); c.height = Math.ceil(s.c.height * f);
        const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.setTransform(f, 0, 0, f, 0, 0); cg.drawImage(s.c, 0, 0); m = { f, c }; CITY_SPR_FERTIG.set(s, m); }
    g.drawImage(m.c, dx, dy, m.c.width / dpr2, m.c.height / dpr2);
}
// Namensschilder: wo sie in diesem Bild liegen (Bildschirm-Punkte). Ein Schild kommt nur hin, wenn es ganz im Bild ist
// (2 Punkte Rand) und kein schon gesetztes überdeckt (2 Punkte Luft).
let cityNamen = [];
function cityNamePlatz(id, x, y, w, h, W, H) {
    if (x < 2 || x + w > W - 2 || y < 2 || y + h > H - 2) return false;
    if (cityNamen.some(n => x < n.x + n.w + 2 && n.x < x + w + 2 && y < n.y + n.h + 2 && n.y < y + h + 2)) return false;
    cityNamen.push({ id, x, y, w, h }); return true;
}
// ---- one frame ----
function cityFrame(now) {
    if (cityView.hidden) return;
    // Handy schonen: steht alles still (kein Finger, keine Kamerafahrt, keine Wolken), reichen 30 Bilder pro Sekunde – die
    // Leute gehen langsam, man sieht keinen Unterschied. Ganz in den Wolken (alles weiß) wird die Stadt gar nicht gezeichnet.
    const bewegt = !!(cityDrag || cityGesture || cloudAnim || !cityCam || cityCam.anim || cityCam.tx !== undefined);
    if ((!bewegt && now - (cityFrame.drawn || 0) < 30) || (cloudCover >= .95 && CITY_GROUND)) { cityRaf = requestAnimationFrame(cityFrame); return; }   // (beim allerersten Mal wird unter den Wolken schon gemalt)
    cityFrame.drawn = now;
    const dpr2 = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    if (cityCanvas.width !== Math.round(W * dpr2) || cityCanvas.height !== Math.round(H * dpr2)) { cityCanvas.width = Math.round(W * dpr2); cityCanvas.height = Math.round(H * dpr2); }
    if (!cityCam) { const [kx, ky] = cIso(CC, CC); cityCam = { x: kx, y: ky + 6, z: Math.max(cityFitZoom(W, H), Math.min(2.2, W / 420)) };   // (Handy: die ganze Mauer-Raute im Bild)
        if (cityPendingAnim) { cityCam.anim = { from: .62, t0: now, dur: 1100 }; cityPendingAnim = false; } }
    let animZ = 1;
    if (cityCam.anim) { const a = cityCam.anim, q = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - q, 3), to = a.to ?? 1;
        animZ = a.from + (to - a.from) * e; if (q >= 1 && to === 1) cityCam.anim = null; }
    const sheetH = cityOpenId && !document.getElementById('citySheet').hidden ? Math.min(380, H * .46) : 0;
    if (cityCam.tx !== undefined && !cityDrag) { const f = Math.min(1, .16); cityCam.x += (cityCam.tx - cityCam.x) * f; cityCam.y += (cityCam.ty - cityCam.y) * f;
        if (Math.hypot(cityCam.tx - cityCam.x, cityCam.ty - cityCam.y) < .3) cityCam.tx = cityCam.ty = undefined; }
    cityClampCam(W, H - sheetH * .6);
    const g = cityCtx, c = loadCity(), Z = cityCam.z * animZ;
    if (!CITY_GROUND || CITY_GROUND_BIO !== cityGrundKey()) cityPaintGround();   // (neu, wenn die Hauptstadt in eine andere Gegend zieht)
    const ox = W / 2 - cityCam.x * Z, oy = (H - sheetH * .6) / 2 - cityCam.y * Z;
    const toS = (x, y, z) => { const [sx, sy] = cIso(x, y); return [sx * Z + ox, (sy - (z || 0)) * Z + oy]; };
    // ground and walls (back half), then buildings and people in depth order, then the front walls
    const wlvl = c.levels.wall || 0, walls = cityPaintWalls(wlvl);
    const items = [];
    const lvlKeep = c.levels.keep || 1;                                                // Paket D: die Burg wächst mit der Burg-Stufe (alle 5 Stufen ein Stück)
    items.push({ id: '_keep', x: CITY_KEEP_AT[0], y: CITY_KEEP_AT[1], spr: citySprite('keep', Math.min(4, Math.floor(lvlKeep / 5))), name: 'Burg', lvl: lvlKeep, keep: true });
    for (const b of CITY_BUILDINGS) { const at = CITY_LOTS[b.id]; if (!at) continue;
        const lvl = c.levels[b.id] || 0, tier = cityTierOf(lvl);
        if (b.id === 'wall') { items.push({ id: 'wall', x: at[0], y: at[1], spr: citySprite('gatehouse', tier), name: b.name, lvl, b, gate: true }); continue; }
        items.push({ id: b.id, x: at[0], y: at[1], spr: tier ? citySprite(b.id, tier, b.id === 'heroes' ? Math.ceil(HEROES.filter(h => heroOwned('player', h.id)).length / HEROES.length * 3) : '') : citySprite('ghost', 0, b.id), name: b.name, lvl, b, ghost: !tier }); }
    for (const s of cityDeco()) items.push({ x: s.at[0], y: s.at[1], spr: cityStaticSprite(s.kind, s.col), deco: s.kind });
    const hour = new Date().getHours() + new Date().getMinutes() / 60;             // evening and night: torches, lit windows
    const night = hour >= 20 || hour < 5.5 ? 1 : hour >= 18 ? (hour - 18) / 2 : hour < 7 ? (7 - hour) / 1.5 : 0;
    if (c.levels.hospital) for (let i = 0; i < 2; i++) { const [hx, hy] = CITY_LOTS.hospital, a = now / 5200 + i * Math.PI;   // healers going round the tents
        items.push({ x: hx + Math.cos(a) * 22, y: hy + 10 + Math.sin(a) * 12, healer: true }); }
    { const [gx, gy] = CITY_LOTS.wall; for (const dx of [-14, 14]) items.push({ x: gx + dx * .55, y: gy + 12, soldier: true, guard: true }); }   // guards at the gate
    if (!cityFolk) cityMakeFolk();
    const dt = Math.min(.1, (now - (cityFrame.last || now)) / 1000); cityFrame.last = now;
    for (const f of cityFolk) { f.t += f.v * dt * (f.cart ? .5 : 1); const [x, y] = cityPathPoint(f.p, f.t); items.push({ x, y, folk: f }); }
    items.sort((p, q) => (p.x + p.y) - (q.x + q.y));
    // Boden, hintere Mauer und die weichen Schatten der Häuser ändern sich nur mit der Kamera. Steht sie still, liegen sie
    // fertig in einem Bild (CITY_LAGEN, wird einmal gemalt) – das spart pro Bild das teure Verkleinern der großen Boden- und
    // Mauerbilder und ~20 Farbverläufe. Bewegt sich die Kamera, wird wie bisher direkt gezeichnet (genau gleich).
    const LG = CITY_LAGEN, lkey = [W, H, dpr2, Z, ox, oy, walls.key, CITY_GROUND_BIO].join(','), still = lkey === LG.letzt, zStill = Z === LG.letztZ;
    LG.letzt = lkey; LG.letztZ = Z;
    const mitSchatten = items.filter(it => it.spr && (!it.deco || ['fountain', 'statue'].includes(it.deco)));   // (Bäume, Büsche, Laternen haben ihren eigenen Schatten)
    if (still) {
        if (LG.key !== lkey) { cityLage('unten', W, H, dpr2, gg => cityUnten(gg, W, H, Z, ox, oy, walls, mitSchatten, toS)); cityLage('oben', W, H, dpr2, gg => cityOben(gg, Z, ox, oy, walls)); LG.key = lkey; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LG.unten, 0, 0);
    }
    g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.imageSmoothingQuality = zStill ? 'high' : 'low';   // (nur während des kurzen Hinein-/Herauszoomens unter den Wolken: einfacher verkleinern)
    if (!still) cityUnten(g, W, H, Z, ox, oy, walls, mitSchatten, toS);
    g.imageSmoothingQuality = 'high';
    cityHitRects = [];
    const plates = [];
    for (const it of items) {
        const [sx, sy] = toS(it.x, it.y);
        if (it.guard) continue;                                              // (the gate guards stand in front of the wall: drawn after it)
        if (it.folk || it.soldier || it.healer) {                            // a person: body, head, a little bob
            const k = Math.max(.7, Z * .55), bob = it.guard ? 0 : Math.abs(Math.sin(now / 150 + it.x)) * k * .6;
            if (it.healer) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#f3efe6'; g.fillRect(sx - 1 * k, sy - 3.8 * k - bob, 2 * k, 3.4 * k); g.fillStyle = '#c0392b'; g.fillRect(sx - .3 * k, sy - 3.4 * k - bob, .6 * k, 1.6 * k);
                g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.6 * k - bob, .85 * k, 0, 7); g.fill(); g.fillStyle = '#f3efe6'; g.fillRect(sx - 1 * k, sy - 5.5 * k - bob, 2 * k, .6 * k); continue; }
            g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
            if (it.folk && it.folk.cart) { g.fillStyle = '#7a5a36'; g.fillRect(sx - 3 * k, sy - 3.4 * k, 6 * k, 2.6 * k); g.fillStyle = '#3a2616'; g.beginPath(); g.arc(sx - 2 * k, sy - .6 * k, .9 * k, 0, 7); g.arc(sx + 2 * k, sy - .6 * k, .9 * k, 0, 7); g.fill(); continue; }
            g.fillStyle = it.soldier ? '#8a8f99' : it.folk.col; g.fillRect(sx - .9 * k, sy - 3.6 * k - bob, 1.8 * k, 3 * k);
            g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.4 * k - bob, .85 * k, 0, 7); g.fill();
            if (it.soldier) { g.strokeStyle = '#5a4a3a'; g.lineWidth = .35 * k; g.beginPath(); g.moveTo(sx + 1.2 * k, sy - bob); g.lineTo(sx + 1.2 * k, sy - 7 * k - bob); g.stroke(); }
            else if (it.folk.hat) { g.fillStyle = '#5a3d24'; g.fillRect(sx - 1.1 * k, sy - 5.3 * k - bob, 2.2 * k, .6 * k); }
            continue;
        }
        const s = it.spr, k = Z / CITY_SPR_SCALE, dx = sx - s.w * Z, dy = sy - s.up * Z;
        if (it.id && (cityOpenId === it.id || cityRingId === it.id)) {      // selected: a golden ring on the ground
            g.save(); g.strokeStyle = 'rgba(255,220,140,.95)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.lineDashOffset = -now / 40;
            g.beginPath(); const r = (it.keep ? 40 : 26) * Z; g.ellipse(sx, sy, r * .866 * 1.4, r * .5 * 1.4, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
        citySprDraw(g, s, dx, dy, k, dpr2, zStill);                         // (the soft shadow underneath is part of cityUnten)
        if (it.id === 'forge' && it.lvl) for (let i = 0; i < 5; i++) {       // chimney smoke
            const t = ((now / 1800) + i / 5) % 1, [cx2, cy2] = toS(it.x - 9, it.y - 5, 31);
            g.fillStyle = 'rgba(120,120,120,' + (.5 * (1 - t)) + ')'; g.beginPath(); g.arc(cx2 + t * 8 * Z, cy2 - t * 26 * Z, (1.5 + t * 4) * Z, 0, 7); g.fill(); }
        if (it.id === 'forge' && it.lvl) { const [ax, ay] = toS(it.x + 16, it.y + 13, 6);            // sparks off the anvil
            for (let i = 0; i < 7; i++) { const t = ((now / 700) + i / 7) % 1, an = -Math.PI / 2 + (i - 3) * .35; if (t > .8) continue;
                g.fillStyle = 'rgba(255,' + Math.round(200 - t * 120) + ',60,' + (1 - t) + ')'; g.fillRect(ax + Math.cos(an) * t * 12 * Z, ay + Math.sin(an) * t * 10 * Z + t * t * 8 * Z, Math.max(1, Z * .6), Math.max(1, Z * .6)); } }
        if (it.deco === 'fountain') { const [fx, fy] = toS(it.x, it.y, 10); g.strokeStyle = 'rgba(190,230,250,.8)'; g.lineWidth = Math.max(1, Z * .5);
            for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + now / 2000, r = 6 * Z; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(a) * r * .6, fy - 3 * Z, fx + Math.cos(a) * r, fy + Math.sin(a) * r * .5 + 7 * Z); g.stroke(); } }
        if (!it.id) continue;
        const building = !!cityBuildOf(c, it.id === '_keep' ? 'keep' : it.id);
        if (building) {                                                      // scaffolding + a bouncing hammer
            g.save(); g.strokeStyle = '#8a6a44'; g.lineWidth = Math.max(1.2, Z * .7);
            for (const [px, py] of [[-18, 18], [18, 18], [18, -18], [-18, -18]]) { const [a, b] = toS(it.x + px, it.y + py), [, b2] = toS(it.x + px, it.y + py, 24); g.beginPath(); g.moveTo(a, b); g.lineTo(a, b2); g.stroke(); }
            for (const zz of [8, 16, 24]) { g.beginPath(); [[-18, 18], [18, 18], [18, -18]].forEach((q, i) => { const [a, b] = toS(it.x + q[0], it.y + q[1], zz); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
            g.restore();
            const [hx, hy] = toS(it.x, it.y, 34); drawGlyph(g, 'upgrade', hx, hy - Math.abs(Math.sin(now / 180)) * 8, Math.max(16, 9 * Z), '#ffd98a');
            liveAnimation = true;
        }
        const hw = (it.keep ? 40 : 30) * Z, top = sy - (it.keep ? 70 : 38) * Z;
        cityHitRects.push({ id: it.id, x: sx - hw, y: top, w: hw * 2, h: sy + 14 * Z - top, cx: sx, cy: sy - (it.keep ? 30 : 16) * Z, depth: it.x + it.y });
        if (it.id === cityRingId) { const el = document.getElementById('cityRing'), tf = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy + (it.keep ? 4 : 0) * Z) + 'px)';   // die runden Knöpfe folgen dem Gebäude
            if (el.style.transform !== tf) el.style.transform = tf; if (el.style.visibility) el.style.visibility = ''; }
        plates.push({ it, sx, sy, building, ghost: it.ghost });
    }
    if (still) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LG.oben, 0, 0); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); } else { g.imageSmoothingQuality = zStill ? 'high' : 'low'; cityOben(g, Z, ox, oy, walls); g.imageSmoothingQuality = 'high'; }
    // the gatehouse sits in the front wall: drawn over it
    const gate = items.find(i => i.gate);
    if (gate) { const [sx, sy] = toS(gate.x, gate.y), s = gate.spr, k = Z / CITY_SPR_SCALE; citySprDraw(g, s, sx - s.w * Z, sy - s.up * Z, k, dpr2, zStill); }
    for (const it of items) if (it.guard) {                                  // two guards with spears at the gate
        const [sx, sy] = toS(it.x, it.y), k = Math.max(.7, Z * .55);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, 1.6 * k, .7 * k, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6f7682'; g.fillRect(sx - 1 * k, sy - 3.8 * k, 2 * k, 3.2 * k); g.fillStyle = '#2b5d9b'; g.fillRect(sx - 1 * k, sy - 2.6 * k, 2 * k, 1 * k);
        g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(sx, sy - 4.6 * k, .85 * k, 0, 7); g.fill(); g.fillStyle = '#8a8f99'; g.beginPath(); g.arc(sx, sy - 4.9 * k, .9 * k, Math.PI, 0); g.fill();
        g.strokeStyle = '#5a4a3a'; g.lineWidth = .35 * k; g.beginPath(); g.moveTo(sx + 1.3 * k, sy); g.lineTo(sx + 1.3 * k, sy - 8 * k); g.stroke();
        g.fillStyle = '#c9c1ae'; g.beginPath(); g.moveTo(sx + 1.3 * k, sy - 9.2 * k); g.lineTo(sx + 1.8 * k, sy - 8 * k); g.lineTo(sx + .8 * k, sy - 8 * k); g.closePath(); g.fill(); }
    // birds now and then
    const bt = (now / 22000) % 1; if (bt < .45) { const x0 = W * (bt / .45) * 1.2 - W * .1, y0 = H * .22; g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1;
        for (const [dx, dy] of [[0, 0], [-10, 6], [-18, -4], [-26, 10]]) { const f = Math.sin(now / 120 + dx) * 2; g.beginPath(); g.moveTo(x0 + dx - 4, y0 + dy - f); g.lineTo(x0 + dx, y0 + dy + 1); g.lineTo(x0 + dx + 4, y0 + dy - f); g.stroke(); } }
    if (night > 0) {                                                        // dusk and night: darker, torches glow at the gate, the keep, the square and along the main street
        g.fillStyle = 'rgba(12,20,48,' + (.5 * night) + ')'; g.fillRect(0, 0, W, H);
        g.save(); g.globalCompositeOperation = 'lighter';
        const torches = [[CC - 12, CITY_WALL.b + 2, 14], [CC + 12, CITY_WALL.b + 2, 14], [CC - 30, CC + 30, 20], [CC + 30, CC + 30, 20], [CC, 371, 12]];
        for (const y of [418, 450, 482]) torches.push([310, y, 13.5], [330, y, 13.5]);                       // die Laternen an der Hauptstraße
        for (const [x, y] of [[244, 244], [396, 244], [244, 396], [396, 396]]) torches.push([x, y, 6]);
        for (const [x, y, z] of torches) { const [tx, ty] = toS(x, y, z), fl = .85 + .15 * Math.sin(now / 90 + x * 3.1) * Math.sin(now / 130 + y), r = 16 * Z * fl;
            const tg = g.createRadialGradient(tx, ty, 0, tx, ty, r); tg.addColorStop(0, 'rgba(255,190,90,' + (.55 * night) + ')'); tg.addColorStop(1, 'rgba(255,140,40,0)');
            g.fillStyle = tg; g.beginPath(); g.arc(tx, ty, r, 0, 7); g.fill();
            g.fillStyle = 'rgba(255,230,160,' + (.9 * night) + ')'; g.beginPath(); g.arc(tx, ty - Z * .6, Math.max(1, Z * .7), 0, 7); g.fill(); }
        g.restore();
    }
    // warm afternoon light from the top left, a soft vignette around the edges
    if (night < 1) { const nq = Math.round(night * 50) / 50, lk = [W, H, dpr2, nq].join(',');   // (both lie ready in one picture: two full-screen gradients cost more than one picture)
      if (CITY_LAGEN.lichtKey !== lk) { cityLage('licht', W, H, dpr2, gg => {
          const lg = gg.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,214,150,' + (.13 * (1 - nq)) + ')'); lg.addColorStop(.55, 'rgba(255,214,150,0)'); lg.addColorStop(1, 'rgba(40,60,90,.12)');
          gg.fillStyle = lg; gg.fillRect(0, 0, W, H);
          const vg = gg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.hypot(W, H) * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,16,8,.38)');
          gg.fillStyle = vg; gg.fillRect(0, 0, W, H); }); CITY_LAGEN.lichtKey = lk; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(CITY_LAGEN.licht, 0, 0); g.setTransform(dpr2, 0, 0, dpr2, 0, 0); }
    // name plates last: jedes Schild klebt unter seinem Gebäude (nie an den Bildrand geschoben); ragt es aus dem Bild oder
    // läge es auf einem anderen, bleibt es weg – die Burg zuerst, dann was gerade gebaut wird, gebaute Häuser, leere Plätze
    const rund = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    const rang = q => q.it.keep ? 0 : q.building ? 1 : q.it.gate ? 2 : q.ghost ? 4 : 3;
    plates.sort((p, q) => rang(p) - rang(q) || q.sy - p.sy);
    cityNamen = [];
    for (const { it, sx, sy, building, ghost } of plates) {
        if (ghost && !building && Z >= .8) {                                 // leerer Platz: ein schwebendes Zeichen – „+“ = hier bauen, Schloss = braucht eine höhere Burg
            const zu = !!(AUF && AUF.BAU_AB_BURG[it.id] > AUF.burgStufe('player')), r = Math.max(9, Math.min(14, 5.5 * Z));
            const [bx, by0] = toS(it.x, it.y, 34), by = by0 + Math.sin(now / 430 + it.x) * 1.8;
            g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(bx + 1.5, by + r + 2, r * .8, r * .3, 0, 0, 7); g.fill();
            const bg = g.createLinearGradient(0, by - r, 0, by + r); bg.addColorStop(0, zu ? '#5d5a55' : '#ffe08a'); bg.addColorStop(1, zu ? '#2e2c29' : '#c98f22');
            g.fillStyle = bg; g.strokeStyle = zu ? 'rgba(200,190,170,.7)' : '#fff1c4'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill(); g.stroke();
            drawGlyph(g, zu ? 'lock' : 'plus', bx, by, r * 1.25, zu ? '#e6dccb' : '#4a2c08');
        }
        if (Z < .8 && !building) {                                           // weit weg: nur die Stufe
            if (!it.lvl) continue; const r2 = 7.5, [bx, by] = [sx, sy + 4 * Z + r2];
            if (!cityNamePlatz(it.id, bx - r2, by - r2, r2 * 2, r2 * 2, W, H)) continue; g.font = '800 10px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillStyle = it.keep ? '#c98f22' : '#2f6fb8'; g.strokeStyle = 'rgba(255,236,190,.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, by, r2, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillText(String(it.lvl), bx, by + .5); continue; }
        const wnd = it.id === 'hospital' ? c.wounded : 0, name = it.name + (wnd ? ' · ' + fmtCompact(wnd) + ' verw.' : ''), lv = it.lvl ? String(it.lvl) : '';
        const fs = Math.max(9.5, Math.min(12.5, 4.6 * Z)), h2 = fs + 7; g.font = '700 ' + fs + 'px Inter, system-ui, sans-serif';
        const tw = g.measureText(name).width, lw = lv ? Math.max(h2 + 2, g.measureText(lv).width + 12) : 0, W2 = tw + 16 + (lv ? lw - 4 : 0), x0 = sx - W2 / 2, py = sy + (it.keep ? 12 : it.gate ? 2 : 7) * Z;
        if (!cityNamePlatz(it.id, x0, py, W2, building ? h2 * 2 + 3 : h2, W, H)) continue;
        g.fillStyle = ghost ? 'rgba(18,16,12,.58)' : 'rgba(18,16,12,.84)'; g.strokeStyle = building ? '#ffd98a' : ghost ? 'rgba(228,200,134,.35)' : 'rgba(228,200,134,.7)'; g.lineWidth = 1;
        rund(x0, py, W2, h2, h2 / 2); g.fill(); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (lv) { const lg2 = g.createLinearGradient(0, py, 0, py + h2); lg2.addColorStop(0, it.keep ? '#e7b84a' : '#4f8ad0'); lg2.addColorStop(1, it.keep ? '#9a6a16' : '#2a5794');   // die Stufe als Abzeichen
            g.fillStyle = lg2; g.strokeStyle = 'rgba(255,236,190,.85)'; rund(x0, py, lw, h2, h2 / 2); g.fill(); g.stroke();
            g.fillStyle = '#fff'; g.fillText(lv, x0 + lw / 2, py + h2 / 2 + .5); }
        g.fillStyle = ghost ? '#d6cab0' : '#f6ead0'; g.fillText(name, lv ? x0 + lw + (W2 - lw) / 2 - 2 : x0 + W2 / 2, py + h2 / 2 + .5);
        const fs8 = h2 - 7;
        if (building) { const b2 = cityBuildOf(c, it.id === '_keep' ? 'keep' : it.id), tl = fmtClock((b2.endsAt - Date.now()) / 1000); g.font = '700 ' + (fs8 - 1) + 'px Inter, system-ui, sans-serif';
            const w2 = g.measureText(tl).width + 26, yy = py + h2 + 3; g.fillStyle = 'rgba(20,6,5,.92)'; g.strokeStyle = 'rgba(255,110,80,.9)';
            g.beginPath(); g.roundRect ? g.roundRect(sx - w2 / 2, yy, w2, fs + 6, 4) : g.rect(sx - w2 / 2, yy, w2, fs + 6); g.fill(); g.stroke();
            drawGlyph(g, 'hourglass', sx - w2 / 2 + 10, yy + (fs + 6) / 2, fs - 1, '#ffb3a0'); g.fillStyle = '#ffe2d8'; g.fillText(tl, sx + 6, yy + (fs + 6) / 2 + .5); }
    }
    cityRaf = requestAnimationFrame(cityFrame);
}

// ===== LEVEL-UP MODAL =====
var levelUpShown = null;            // { from, to, coins, troops, gems, points } currently on screen / queued
var levelUpTimer = null;
function levelRewardText(level) {
    const g = levelRewardGems(level);
    return '<b>' + fmtCompact(levelRewardCoins(level)) + '</b> Münzen · <b>' + fmtCompact(levelRewardTroops(level)) + '</b> Truppen' +
        (g ? ' · <b>' + g + '</b> Edelsteine' : '');
}
function queueLevelUpModal(from, to, r) {
    if (levelUpShown) {                 // several level-ups before the player taps: merge into one window
        levelUpShown.to = to;
        for (const k of ['coins', 'troops', 'gems', 'points']) levelUpShown[k] += r[k];
    } else {
        levelUpShown = { from, to, ...r };
    }
    clearTimeout(levelUpTimer);
    levelUpTimer = setTimeout(renderLevelUpModal, 1600);  // after the battle flash / "Sieg!" has played
}
function renderLevelUpModal() {
    const s = levelUpShown; if (!s) return;
    if (!document.getElementById('dailyModal').hidden || !document.getElementById('rewardModal').hidden || bossRewardPending || (typeof mapBattles !== 'undefined' && mapBattles.length)) { levelUpTimer = setTimeout(renderLevelUpModal, 500); return; }   // one window at a time
    const m = document.getElementById('levelUpModal');
    document.getElementById('levelUpLevel').textContent = s.to;
    document.getElementById('levelUpTitle').textContent = 'Stufe ' + s.to;
    const n = s.to - s.from;
    document.getElementById('levelUpSub').textContent = n > 1 ? 'Stufe ' + s.from + ' → ' + s.to + ' · ' + n + ' Aufstiege' : 'Du bist aufgestiegen!';
    const row = (ic, label, val) => '<li>' + icon(ic, 'ico-' + ic) + '<span>' + label + '</span><b>+' + val + '</b></li>';
    let html = '';
    if (s.coins) html += row('coin', 'Münzen', fmtNum(s.coins));
    if (s.troops) html += row('troops', 'Truppen (Heimat)', fmtNum(s.troops));
    if (s.gems) html += row('gem', 'Edelsteine', fmtNum(s.gems));
    html += row('points', s.points === 1 ? 'Fähigkeitspunkt' : 'Fähigkeitspunkte', fmtNum(s.points));
    const list = document.getElementById('levelUpRewards');
    list.innerHTML = html;
    [...list.children].forEach((li, i) => { li.style.animationDelay = (180 + i * 110) + 'ms'; });
    document.getElementById('levelUpNext').innerHTML = 'Nächste Stufe ' + (s.to + 1) + ': ' + levelRewardText(s.to + 1);
    if (m.hidden) { m.hidden = false; dismissTutorialHint && dismissTutorialHint(); }
    updateHud();
}
function closeLevelUpModal() {
    const m = document.getElementById('levelUpModal');
    if (m.hidden) return false;
    m.hidden = true;
    levelUpShown = null;
    updateHud();
    if (isPanelOpen(profilePopup)) renderProfile();
    return true;
}
document.getElementById('levelUpBtn').addEventListener('click', closeLevelUpModal);
document.getElementById('levelUpModal').addEventListener('click', e => { if (e.target.id === 'levelUpModal') closeLevelUpModal(); });
