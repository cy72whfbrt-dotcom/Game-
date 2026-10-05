// Teil 06e-nebel-zeichnen.js: Nebel und Pässe zeichnen
// ===== FOG + PASSES (drawing) =====
function drawWorldFrame() {                        // the square map border: darker sea outside, a framed edge with corner marks
    const z = mapState.zoom, ox = mapState.offsetX, oy = mapState.offsetY;
    const l = -FRAME_HALF * z + ox, t = -FRAME_HALF * z + oy, r = FRAME_HALF * z + ox, b = FRAME_HALF * z + oy;
    setScreen(ctx);
    ctx.fillStyle = 'rgba(3,7,12,.72)';
    ctx.beginPath(); ctx.rect(-10, -10, viewW + 20, viewH + 20); ctx.rect(l, t, r - l, b - t); ctx.fill('evenodd');
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(8,10,14,.95)'; ctx.lineWidth = 7; strokeBox(ctx, l, t, r - l, b - t);
    ctx.strokeStyle = 'rgba(212,176,102,.85)'; ctx.lineWidth = 1.5; strokeBox(ctx, l, t, r - l, b - t);
    ctx.strokeStyle = 'rgba(212,176,102,.35)'; ctx.lineWidth = 1; strokeBox(ctx, l + 6, t + 6, r - l - 12, b - t - 12);
    for (const [cx, cy] of [[l, t], [r, t], [r, b], [l, b]]) {                     // corner diamonds
        if (cx < -20 || cy < -20 || cx > viewW + 20 || cy > viewH + 20) continue;
        ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 9, cy); ctx.closePath();
        ctx.fillStyle = '#16120b'; ctx.fill(); ctx.strokeStyle = 'rgba(228,200,134,.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (z < 0.0035) {                                                                 // compass letters on the edges when zoomed far out
        ctx.font = '700 12px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(228,200,134,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const mx = (l + r) / 2, my = (t + b) / 2;
        ctx.fillText('N', mx, t - 14); ctx.fillText('S', mx, b + 14); ctx.fillText('O', r + 14, my); ctx.fillText('W', l - 14, my);
    }
}
// Fog of war look: a bright, layered cloud cover (tileable value-noise texture, world-anchored) shown through
// one soft mask for the whole map (fog everywhere, soft holes where explored). Freshly revealed cells fade out.
var FOG_TEX = null, FOG_TEX2 = null, fogMaskCv = null, fogBaseCv = null, fogComp = null;
const FOG_MASK_PX = 6;                                  // mask pixels per fog cell
function fogTexture(seed, size, cells, light) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), rnd = mulberry32(seed);
    const oct = [], N = 4;
    for (let o = 0; o < N; o++) { const n = cells << o, v = new Float32Array(n * n); for (let i = 0; i < v.length; i++) v[i] = rnd(); oct.push({ n, v }); }
    const sm = t => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let val = 0, amp = 1, tot = 0;
        for (const { n, v } of oct) {
            const fx = x / size * n, fy = y / size * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
            const a = v[(y0 % n) * n + x0 % n], b = v[(y0 % n) * n + (x0 + 1) % n], c2 = v[((y0 + 1) % n) * n + x0 % n], d = v[((y0 + 1) % n) * n + (x0 + 1) % n];
            val += amp * (a + (b - a) * tx + (c2 - a) * ty + (a - b - c2 + d) * tx * ty); tot += amp; amp *= .5;
        }
        val /= tot;                                                    // 0..1, cloudy
        const t = Math.max(0, Math.min(1, (val - .28) / .5)), i = (y * size + x) * 4;
        img.data[i] = 96 + t * (light ? 140 : 120); img.data[i + 1] = 106 + t * (light ? 134 : 116); img.data[i + 2] = 122 + t * (light ? 124 : 108); img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
}
function fogBlob() {                                    // soft round eraser, 1 fog cell ≈ half its width
    if (fogBlob.c) return fogBlob.c;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.5, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return fogBlob.c = c;
}
function fogMask(now) {                                 // canvas over the whole frame: alpha = fog
    const n = Math.ceil(2 * FRAME_HALF / FOG_CELL) + 2, W = n * FOG_MASK_PX, o = Math.floor(-FRAME_HALF / FOG_CELL) - 1;
    const fading = new Set(fogFx.map(f => f.k));
    if (!fogBaseCv || fogMaskDirty || fogBaseCv.fading !== fading.size) {
        fogBaseCv = fogBaseCv || document.createElement('canvas'); fogBaseCv.width = fogBaseCv.height = W;
        const g = fogBaseCv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
        g.globalCompositeOperation = 'destination-out';
        const bl = fogBlob(), bs = FOG_MASK_PX * 2.3;
        for (const k of fogSet()) {
            if (fading.has(k)) continue;
            const i = k.indexOf(','), cx = +k.slice(0, i), cy = +k.slice(i + 1);
            g.drawImage(bl, (cx - o + .5) * FOG_MASK_PX - bs / 2, (cy - o + .5) * FOG_MASK_PX - bs / 2, bs, bs);
        }
        fogBaseCv.fading = fading.size; fogBaseCv.o = o; fogBaseCv.n = n; fogBaseCv.stamp = (fogBaseCv.stamp || 0) + 1; fogMaskDirty = false;
    }
    if (!fogFx.length) return fogBaseCv;
    fogMaskCv = fogMaskCv || document.createElement('canvas');
    if (fogMaskCv.width !== W) { fogMaskCv.width = fogMaskCv.height = W; }
    const g = fogMaskCv.getContext('2d'); g.globalCompositeOperation = 'copy'; g.drawImage(fogBaseCv, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const bl = fogBlob();
    for (const f of fogFx) {
        const p = Math.max(0, Math.min(1, (now - f.t - f.d / 5) / 1500)); if (p <= 0) continue;
        const bs = FOG_MASK_PX * (2.3 + (1 - p) * 1.2);
        g.globalAlpha = p * p * (3 - 2 * p);
        g.drawImage(bl, (f.x / FOG_CELL - o) * FOG_MASK_PX - bs / 2, (f.y / FOG_CELL - o) * FOG_MASK_PX - bs / 2, bs, bs);
    }
    g.globalAlpha = 1; fogMaskCv.o = o; fogMaskCv.n = n;
    return fogMaskCv;
}
function drawFog(view, now) {
    const z = mapState.zoom;
    fogFx = fogFx.filter(f => now - f.t < 1500 + f.d / 5);
    if (!fogFx.length && fogBaseCv && fogBaseCv.fading) fogMaskDirty = true;
    const mask = fogMask(now), o = mask.o, n = mask.n;
    if (!FOG_TEX) { FOG_TEX = fogTexture(4242, 256, 4, true); FOG_TEX2 = fogTexture(977, 256, 3, false); }
    const FS = 0.6, Wd = Math.round(viewW * FS), Hd = Math.round(viewH * FS);             // soft clouds: a low-res layer is enough
    fogComp = fogComp || document.createElement('canvas');
    const key = [Wd, Hd, z, mapState.offsetX, mapState.offsetY, mask === fogBaseCv ? fogBaseCv.stamp : Math.random()].join('|');
    if (fogComp.key === key) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fogComp, 0, 0, Math.round(viewW * dpr), Math.round(viewH * dpr)); ctx.restore(); }
    else {
    fogComp.key = key;
    if (fogComp.width !== Wd || fogComp.height !== Hd) { fogComp.width = Wd; fogComp.height = Hd; }
    const g = fogComp.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, Wd, Hd);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.setTransform(FS * z, 0, 0, FS * z, FS * mapState.offsetX, FS * mapState.offsetY);          // world units
    g.save(); g.beginPath(); g.rect(-FRAME_HALF, -FRAME_HALF, 2 * FRAME_HALF, 2 * FRAME_HALF); g.clip();   // only inside the map border
    g.drawImage(mask, o * FOG_CELL, o * FOG_CELL, n * FOG_CELL, n * FOG_CELL); g.restore();
    g.globalCompositeOperation = 'source-in';                                                        // clouds only where the mask is
    const p1 = g.createPattern(FOG_TEX2, 'repeat'); p1.setTransform(new DOMMatrix().rotate(-13).scale(170000 / 256));
    g.fillStyle = p1; g.fillRect(view.l - 1e5, view.t - 1e5, view.r - view.l + 2e5, view.b - view.t + 2e5);
    g.globalCompositeOperation = 'source-atop';                                                      // a finer, brighter layer on top
    const p2 = g.createPattern(FOG_TEX, 'repeat'); p2.setTransform(new DOMMatrix().rotate(23).scale(Math.max(26000, 0.9 / z) / 256));   // never finer than ~1 px of noise
    g.globalAlpha = .55 * Math.max(0, Math.min(1, (z - 0.004) / 0.006)); g.fillStyle = p2; g.fillRect(view.l - 1e5, view.t - 1e5, view.r - view.l + 2e5, view.b - view.t + 2e5); g.globalAlpha = 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(fogComp, 0, 0, Math.round(viewW * dpr), Math.round(viewH * dpr)); ctx.restore();
    }
    if (fogFx.length) liveAnimation = true;
    if (fogPrompt) {                                   // confirm chip: "Späher senden · 0:25" above a marker at the spot
        setScreen(ctx);
        const px = fogPrompt.x * z + mapState.offsetX, py = fogPrompt.y * z + mapState.offsetY, k = Math.min(1, (now - fogPrompt.at) / 180);
        ctx.save(); ctx.globalAlpha = k;
        ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(228,200,134,.18)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#e4c886'; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fillStyle = '#f3e6c4'; ctx.fill();
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        const l1 = 'Späher senden', l2 = fmtClock(fogPrompt.secs), w = Math.max(ctx.measureText(l1).width, 40) + ctx.measureText(l2).width + 58, h = 36;
        const x = Math.max(8, Math.min(viewW - w - 8, px - w / 2)), y = Math.max(70, py - 26 - h);
        rr(ctx, x + 1, y + 3, w, h, 8); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
        rr(ctx, x, y, w, h, 8); const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f1d48c'); gr.addColorStop(1, '#b98a3a');
        ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#5a3c0e'; ctx.stroke();
        drawGlyph(ctx, 'scout', x + 18, y + h / 2, 16, '#2a1a04');
        ctx.fillStyle = '#2a1a04'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(l1, x + 32, y + h / 2 + .5);
        ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(42,26,4,.75)'; ctx.textAlign = 'right'; ctx.fillText(l2, x + w - 12, y + h / 2 + .5);
        ctx.restore();
        fogPrompt.rect = { x, y, w, h };
        if (k < 1) liveAnimation = true;
    }
}
function drawGatehouse(g, cx, cy, H, open) {      // front view like the towers: two turrets, a wall, an arch with a portcullis
    const W = H * 1.3, base = cy + H * .42, top = base - H, wallTop = base - H * .7, tw = W * .27;
    const stone = '#8f8b84', dark = '#5d5a54', edge = '#23211e';
    g.save(); g.lineJoin = 'round';
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx, base + H * .03, W * .56, H * .07, 0, 0, Math.PI * 2); g.fill();
    const merlons = (x0, x1, y, n) => { const mw = (x1 - x0) / (n * 2 - 1); for (let i = 0; i < n; i++) g.rect(x0 + i * 2 * mw, y - mw * .9, mw, mw * .9); };
    g.beginPath(); g.rect(cx - W * .36, wallTop, W * .72, base - wallTop); merlons(cx - W * .36, cx + W * .36, wallTop, 5);   // wall
    g.fillStyle = stone; g.fill(); g.lineWidth = 1.2; g.strokeStyle = edge; g.stroke();
    for (const sx of [-1, 1]) {                                                                                              // turrets
        const x0 = sx < 0 ? cx - W / 2 : cx + W / 2 - tw;
        g.beginPath(); g.rect(x0, top, tw, base - top); merlons(x0 - tw * .08, x0 + tw * 1.08, top, 3);
        const tg = g.createLinearGradient(x0, 0, x0 + tw, 0); tg.addColorStop(0, '#a29e96'); tg.addColorStop(1, '#77736c');
        g.fillStyle = tg; g.fill(); g.stroke();
        g.fillStyle = '#1d1a16'; g.fillRect(x0 + tw * .38, top + H * .2, tw * .24, H * .14);                                // arrow slit
    }
    g.strokeStyle = 'rgba(40,36,32,.35)'; g.lineWidth = 1;                                                                    // courses
    for (let y = wallTop + H * .12; y < base - 2; y += H * .12) { g.beginPath(); g.moveTo(cx - W * .23, y); g.lineTo(cx + W * .23, y); g.stroke(); }
    const aw = W * .3, ah = H * .5, ax = cx - aw / 2, ay = base - ah;                                                          // arch
    const arch = () => { g.beginPath(); g.moveTo(ax, base); g.lineTo(ax, ay + aw / 2); g.arc(cx, ay + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, base); g.closePath(); };
    arch(); g.fillStyle = open >= 1 ? '#6f5438' : '#15120e'; g.fill();
    if (open > 0) { arch(); const lg = g.createLinearGradient(0, ay, 0, base); lg.addColorStop(0, 'rgba(255,226,160,' + (.25 * open) + ')'); lg.addColorStop(1, 'rgba(176,134,88,' + open + ')'); g.fillStyle = lg; g.fill(); }
    g.save(); arch(); g.clip();                                                                                                 // portcullis, raised by `open`
    const lift = open * ah * .92, bars = 5;
    g.strokeStyle = '#2e2b27'; g.lineWidth = Math.max(1, aw * .07);
    g.beginPath();
    for (let i = 1; i < bars; i++) { const x = ax + aw * i / bars; g.moveTo(x, ay - lift); g.lineTo(x, base - lift); }
    for (let j = 1; j < 4; j++) { const y = ay + ah * j / 4 - lift; g.moveTo(ax, y); g.lineTo(ax + aw, y); }
    g.stroke(); g.restore();
    arch(); g.lineWidth = 1.4; g.strokeStyle = edge; g.stroke();
    g.fillStyle = dark; g.fillRect(cx - aw * .62, ay - H * .06, aw * 1.24, H * .06);                                            // lintel
    g.restore();
}
function drawPasses(view, now) {                   // a gatehouse on every gated bridge; closed ones carry a countdown
    const z = mapState.zoom; if (z < 0.0035) return;
    setScreen(ctx);
    for (const br of bridges) {
        const opens = passOpensAt(br); if (!opens) continue;
        if (!isExplored(br.a) && !isExplored(br.b)) continue;
        const rank = { outer: 0, guardian: 1, throne: 2 }, outerA = (rank[landmasses[br.a].tier] || 0) <= (rank[landmasses[br.b].tier] || 0);
        const ex = outerA ? br.x1 : br.x2, ey = outerA ? br.y1 : br.y2, ox = outerA ? br.x2 : br.x1, oy = outerA ? br.y2 : br.y1;   // gate stands in front of the bridge,
        const bl = Math.hypot(ox - ex, oy - ey) || 1, gx = ex - (ox - ex) / bl * 180, gy = ey - (oy - ey) / bl * 180;                // on the outer island's bank
        const mx = gx * z + mapState.offsetX, my = gy * z + mapState.offsetY;
        if (mx < -80 || my < -80 || mx > viewW + 80 || my > viewH + 80) continue;
        const H = Math.max(24, Math.min(110, 2000 * z)), left = opens - Date.now();
        if (left <= 0) continue;
        drawGatehouse(ctx, mx, my - H * .15, H, 0);
        const label = fmtPassWait(left);
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        const w = ctx.measureText(label).width + 30, cy = my - H * .15 + H * .42 + 13;
        ctx.fillStyle = 'rgba(14,12,10,.9)'; ctx.strokeStyle = 'rgba(228,200,134,.75)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx - w / 2, cy - 10, w, 20, 10) : ctx.rect(mx - w / 2, cy - 10, w, 20); ctx.fill(); ctx.stroke();
        drawGlyph(ctx, 'lock', mx - w / 2 + 12, cy, 12, '#f0d69a');
        ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, mx - w / 2 + 22, cy + .5);
    }
}
