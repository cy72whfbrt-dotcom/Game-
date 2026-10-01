// ===== Ladebildschirm: Meer mit Burg, echte Tageszeit, Tipps mit Bildern (läuft vor dem Spiel) =====
// Echtzeit: keine Test-Uhr mehr (früher openWaterTimeShift). __realNow bleibt für den Ladebildschirm.
window.__realNow = function () { return Date.now(); };
// ===== LOADING SCREEN: sea, an island with a castle, sky/sun/moon/stars by the real local time, rotating tips with pictures (runs before the game script) =====
(function () {
    var cv = document.getElementById('splashCanvas');
    if (!cv) return;
    var g = cv.getContext('2d');
    var W, H, D, HZ, WL, U, stars = [], clouds = [], castle = null, castleAt = 0, stopped = false, t0 = performance.now(), lastDraw = 0, sky = null, tipTimer = 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
    function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    // sky keyframes over the day (local hour): top, middle, horizon, sea
    var KEYS = [[0, '#03060f', '#08112a', '#122039', '#050c18'], [4.5, '#060b1f', '#141a3c', '#2b2a4c', '#070f20'], [6, '#1d2b5a', '#8a5f7a', '#f0a86e', '#1c2c48'],
                [7.5, '#3a6cb0', '#8fb5d8', '#f3d6ae', '#1f4a6e'], [11, '#2f6cbf', '#74aee2', '#cfe6f3', '#1a5a86'], [16, '#346bb2', '#83b1dc', '#e2e6dc', '#1c5580'],
                [18.6, '#2d4f8e', '#b8829a', '#f5b067', '#274a6a'], [20, '#1a2250', '#5c3b62', '#d0704a', '#1a2a44'], [21.5, '#070d24', '#161c3e', '#2c2a4a', '#081226'], [24, '#03060f', '#08112a', '#122039', '#050c18']];
    function localHour() {
        if (typeof window.__splashHour === 'number') return window.__splashHour;                         // (tests can pick an hour)
        var d = new Date(window.__realNow ? window.__realNow() : Date.now());                            // the real clock, not the game's test clock
        return d.getHours() + d.getMinutes() / 60;
    }
    function skyAt(h) {
        for (var i = 0; i < KEYS.length - 1 && KEYS[i + 1][0] <= h; i++);
        var a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)], f = b[0] > a[0] ? (h - a[0]) / (b[0] - a[0]) : 0;
        var s = { h: h, top: mix(hex(a[1]), hex(b[1]), f), mid: mix(hex(a[2]), hex(b[2]), f), hor: mix(hex(a[3]), hex(b[3]), f), sea: mix(hex(a[4]), hex(b[4]), f) };
        var day = h >= 6 && h <= 20, p = day ? (h - 6) / 14 : ((h < 6 ? h + 24 : h) - 20) / 10, alt = Math.sin(p * Math.PI);
        s.day = day; s.p = p; s.alt = alt;
        s.light = day ? clamp(alt * 2.6, 0, 1) : 0;                                                     // how bright the land is
        s.warm = day ? clamp(1 - alt / 0.4, 0, 1) : 0;                                                   // low sun: golden light
        s.night = day ? clamp(1 - alt * 6, 0, 1) * 0.6 : clamp(0.55 + alt, 0, 1);                        // stars and lit windows
        return s;
    }

    function resize() {
        D = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
        cv.width = Math.round(W * D); cv.height = Math.round(H * D);
        HZ = Math.round(H * (W > H ? 0.6 : 0.58));                                                      // horizon
        WL = HZ + (H - HZ) * 0.16;                                                                      // the island's waterline
        U = Math.min(W * 0.0046, H * 0.0034, 4.2);                                                      // castle unit (castle ≈ 100 U tall)
        var r = rng(7); stars = [];
        for (var i = 0; i < Math.round(W * HZ / 2600) + 40; i++) stars.push({ x: r() * W, y: r() * HZ * 0.95, s: 0.4 + r() * 1.3, ph: r() * 6.28, sp: 0.8 + r() * 2 });
        if (!clouds.length) for (var c = 0; c < 6; c++) clouds.push({ x: r(), y: 0.12 + r() * 0.5, s: 0.6 + r() * 0.8, v: 0.004 + r() * 0.006, k: 3 + Math.floor(r() * 3) });
        castle = null; sky = skyAt(localHour()); draw(performance.now(), true);
    }

    // ---- the island with the castle, painted once into its own canvas (lighting from the time of day) ----
    function paintCastle(s) {
        var cw = Math.ceil(170 * U), ch = Math.ceil(128 * U), c = document.createElement('canvas');
        c.width = Math.ceil(cw * D); c.height = Math.ceil(ch * D);
        var x = c.getContext('2d'); x.scale(D, D); x.translate(cw / 2, ch - 8 * U);                   // origin = island centre on the waterline
        var L = s.light, warm = s.warm, nightC = hex('#1a2233');
        var stoneDay = mix(hex('#c2b397'), hex('#e8b27a'), warm * 0.55), stone = mix(nightC, stoneDay, 0.25 + L * 0.75), stoneDk = mix(stone, [0, 0, 0], 0.3);
        var roof = mix(hex('#20202c'), mix(hex('#4f6f9a'), hex('#8a5a4a'), warm * 0.5), 0.3 + L * 0.7), grass = mix(hex('#15231e'), hex('#4f7f3c'), 0.25 + L * 0.75);
        var rock = mix(hex('#161a22'), hex('#7d7466'), 0.25 + L * 0.75), sand = mix(hex('#20242c'), hex('#d8c28e'), 0.25 + L * 0.75);
        var shadeLeft = s.day && s.p > 0.5;                                                              // afternoon sun from the right-hand side
        function u(v) { return v * U; }
        function block(bx, by, bw, bh) { x.fillStyle = rgba(stone); x.fillRect(u(bx), u(by), u(bw), u(bh)); x.fillStyle = 'rgba(0,0,0,' + (0.1 + 0.18 * L) + ')'; x.fillRect(shadeLeft ? u(bx) : u(bx + bw * 0.62), u(by), u(bw * 0.38), u(bh)); }
        function crenel(bx, by, bw) { var n = Math.max(3, Math.round(bw / 4)), w = bw / (n * 2 - 1); x.fillStyle = rgba(stone); for (var i = 0; i < n; i++) x.fillRect(u(bx + i * 2 * w), u(by - 3.2), u(w), u(3.4)); }
        function cone(cx, by, bw, rh) { x.fillStyle = rgba(roof); x.beginPath(); x.moveTo(u(cx - bw / 2 - 1.5), u(by)); x.lineTo(u(cx), u(by - rh)); x.lineTo(u(cx + bw / 2 + 1.5), u(by)); x.closePath(); x.fill();
            x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.moveTo(u(cx), u(by - rh)); x.lineTo(shadeLeft ? u(cx - bw / 2 - 1.5) : u(cx + bw / 2 + 1.5), u(by)); x.lineTo(u(cx), u(by)); x.closePath(); x.fill(); }
        function win(wx, wy, ww, wh) { x.fillStyle = s.night > 0.15 ? 'rgba(255,196,110,' + (0.35 + s.night * 0.65) + ')' : rgba(mix(stoneDk, [20, 20, 30], 0.6));
            x.beginPath(); x.moveTo(u(wx), u(wy + wh)); x.lineTo(u(wx), u(wy + ww / 2)); x.arc(u(wx + ww / 2), u(wy + ww / 2), u(ww / 2), Math.PI, 0); x.lineTo(u(wx + ww), u(wy + wh)); x.closePath(); x.fill(); }
        // island: rocks, a light rim, grass on top
        x.fillStyle = rgba(sand); x.beginPath(); x.ellipse(0, u(1), u(80), u(7), 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = rgba(rock); x.beginPath(); x.moveTo(u(-76), u(1)); x.bezierCurveTo(u(-60), u(-14), u(-30), u(-20), 0, u(-20)); x.bezierCurveTo(u(34), u(-20), u(62), u(-14), u(76), u(1)); x.closePath(); x.fill();
        x.fillStyle = rgba(grass); x.beginPath(); x.moveTo(u(-66), u(-6)); x.bezierCurveTo(u(-52), u(-17), u(-28), u(-21), 0, u(-21)); x.bezierCurveTo(u(30), u(-21), u(54), u(-17), u(66), u(-6));
        x.bezierCurveTo(u(40), u(-12), u(-40), u(-12), u(-66), u(-6)); x.fill();
        [[-58, -8, 5], [-50, -11, 6], [52, -10, 6], [60, -7, 4.5]].forEach(function (t) { x.fillStyle = rgba(mix(grass, [0, 0, 0], 0.25)); x.beginPath(); x.arc(u(t[0]), u(t[1] - t[2]), u(t[2]), 0, Math.PI * 2); x.fill(); });   // trees
        // castle: curtain wall, two round-roofed towers, the keep with a turret
        var B = -18;
        block(-40, B - 20, 80, 20); crenel(-40, B - 20, 80);
        block(-50, B - 42, 16, 42); crenel(-50, B - 42, 16); cone(-42, B - 45, 16, 20);
        block(34, B - 42, 16, 42); crenel(34, B - 42, 16); cone(42, B - 45, 16, 20);
        block(-17, B - 60, 34, 60); crenel(-17, B - 60, 34);
        block(-6, B - 74, 12, 14); cone(0, B - 74, 12, 16);
        x.fillStyle = rgba(mix(stoneDk, [0, 0, 0], 0.55)); x.beginPath(); x.moveTo(u(-6), u(B)); x.lineTo(u(-6), u(B - 9)); x.arc(0, u(B - 9), u(6), Math.PI, 0); x.lineTo(u(6), u(B)); x.closePath(); x.fill();   // gate
        win(-10, B - 50, 5, 8); win(5, B - 50, 5, 8); win(-10, B - 34, 5, 8); win(5, B - 34, 5, 8); win(-44.5, B - 33, 5, 8); win(39.5, B - 33, 5, 8); win(-2.5, B - 70, 5, 7);
        x.strokeStyle = rgba(mix(stone, [0, 0, 0], 0.5)); x.lineWidth = Math.max(1, U * 0.7); x.beginPath(); x.moveTo(0, u(B - 90)); x.lineTo(0, u(B - 108)); x.stroke();   // flagpole (the flag waves live)
        return { c: c, w: cw, h: ch, ox: cw / 2, oy: ch - 8 * U, flagX: 0, flagY: B - 108 };
    }

    function starPath(cx, cy, R, r) { var p = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; p.push((cx + Math.cos(a) * q).toFixed(1) + ' ' + (cy + Math.sin(a) * q).toFixed(1)); } return 'M' + p.join('L') + 'Z'; }
    function draw(now, force) {
        if (stopped) return;
        if (!force && now - lastDraw < 33) return;                                                       // ~30 fps is plenty here
        lastDraw = now;
        var t = reduce ? 0 : (now - t0) / 1000, s = sky;
        if (!castle || now - castleAt > 30000) { sky = s = skyAt(localHour()); castle = paintCastle(s); castleAt = now; }
        g.setTransform(D, 0, 0, D, 0, 0);
        // sky
        var sg = g.createLinearGradient(0, 0, 0, HZ); sg.addColorStop(0, rgba(s.top)); sg.addColorStop(0.62, rgba(s.mid)); sg.addColorStop(1, rgba(s.hor));
        g.fillStyle = sg; g.fillRect(0, 0, W, HZ + 1);
        // stars
        if (s.night > 0.02) for (var i = 0; i < stars.length; i++) { var st = stars[i], a = s.night * (0.55 + 0.45 * Math.sin(t * st.sp + st.ph)) * (1 - st.y / HZ * 0.6); g.fillStyle = 'rgba(235,240,255,' + a.toFixed(3) + ')'; g.fillRect(st.x, st.y, st.s, st.s); }
        // sun or moon on its arc
        var bx = W * (0.12 + 0.76 * s.p), by = HZ - s.alt * HZ * 0.72, br = Math.max(14, Math.min(W, H) * 0.045);
        if (s.alt > -0.05) {
            if (s.day) {
                var sunC = mix([255, 244, 214], [255, 170, 90], s.warm), glow = g.createRadialGradient(bx, by, 0, bx, by, br * 7);
                glow.addColorStop(0, rgba(sunC, 0.55)); glow.addColorStop(0.25, rgba(sunC, 0.16)); glow.addColorStop(1, rgba(sunC, 0));
                g.fillStyle = glow; g.fillRect(bx - br * 7, by - br * 7, br * 14, br * 14);
                g.fillStyle = rgba(mix(sunC, [255, 255, 255], 0.5 - 0.35 * s.warm)); g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
            } else {
                var mg = g.createRadialGradient(bx, by, 0, bx, by, br * 5); mg.addColorStop(0, 'rgba(210,225,255,.22)'); mg.addColorStop(1, 'rgba(210,225,255,0)');
                g.fillStyle = mg; g.fillRect(bx - br * 5, by - br * 5, br * 10, br * 10);
                g.fillStyle = '#e9edf5'; g.beginPath(); g.arc(bx, by, br * 0.8, 0, Math.PI * 2); g.fill();
                g.save(); g.beginPath(); g.arc(bx, by, br * 0.8, 0, Math.PI * 2); g.clip(); g.fillStyle = rgba(mix(s.top, [40, 50, 80], 0.3), 0.94); g.beginPath(); g.arc(bx + br * 0.34, by - br * 0.16, br * 0.7, 0, Math.PI * 2); g.fill(); g.restore();   // crescent
            }
        }
        // clouds drift slowly
        var cc = mix(mix([255, 255, 255], [255, 190, 150], s.warm), [40, 48, 70], clamp(s.night * 1.4, 0, 0.85));
        for (var k = 0; k < clouds.length; k++) {
            var cl = clouds[k], cx = ((cl.x + t * cl.v) % 1.4 - 0.2) * W, cy = cl.y * HZ, cs = cl.s * Math.min(70, W * 0.12);
            g.fillStyle = rgba(cc, 0.16 + 0.1 * s.light);
            for (var j = 0; j < cl.k; j++) { g.beginPath(); g.ellipse(cx + (j - cl.k / 2) * cs * 0.7, cy - Math.sin(j * 1.7) * cs * 0.18, cs * 0.75, cs * 0.3, 0, 0, Math.PI * 2); g.fill(); }
        }
        // birds by day
        if (s.light > 0.3) { g.strokeStyle = 'rgba(30,36,48,.55)'; g.lineWidth = 1.2; for (var b = 0; b < 3; b++) { var fx = ((0.2 + b * 0.07 + t * 0.012) % 1.3 - 0.15) * W, fy = HZ * (0.4 + b * 0.05) + Math.sin(t * 0.8 + b) * 6, fw = 5 + b, fl = Math.sin(t * 6 + b * 2) * 2.5;
            g.beginPath(); g.moveTo(fx - fw, fy - fl); g.quadraticCurveTo(fx - fw / 2, fy - 2, fx, fy); g.quadraticCurveTo(fx + fw / 2, fy - 2, fx + fw, fy - fl); g.stroke(); } }
        // sea: from the horizon's haze to deep water
        var sea = g.createLinearGradient(0, HZ, 0, H); sea.addColorStop(0, rgba(mix(s.hor, s.sea, 0.55))); sea.addColorStop(0.25, rgba(s.sea)); sea.addColorStop(1, rgba(mix(s.sea, [0, 0, 0], 0.55)));
        g.fillStyle = sea; g.fillRect(0, HZ, W, H - HZ);
        // path of light on the water under the sun / moon
        if (s.alt > 0) {
            var pc = s.day ? mix([255, 240, 200], [255, 170, 90], s.warm) : [210, 225, 255], pa = s.day ? 0.35 + 0.25 * s.warm : 0.28;
            for (var y = HZ + 2; y < H; y += 3 + (y - HZ) * 0.04) { var dep = (y - HZ) / (H - HZ), hw = br * (0.6 + dep * 3.2) * (0.6 + 0.4 * Math.sin(t * 2.2 + y * 0.35));
                g.fillStyle = rgba(pc, pa * (1 - dep * 0.7) * (0.5 + 0.5 * Math.sin(t * 3 + y))); g.fillRect(bx - hw + Math.sin(t * 1.5 + y * 0.2) * 4, y, hw * 2, 1.2 + dep * 1.5); }
        }
        // the island's reflection, rippled
        var ch = castle, cw2 = ch.w, top = WL - ch.oy, dx = W / 2 - ch.ox;
        g.save(); var rl = ch.oy * 0.75;
        for (var ry = 0; ry < rl; ry += 2) { var off = Math.sin(t * 1.8 + ry * 0.3) * (0.5 + ry * 0.02);
            g.globalAlpha = (0.2 + 0.08 * s.light) * (1 - ry / rl); g.drawImage(ch.c, 0, (ch.oy - ry - 2) * D, ch.c.width, 2 * D, dx + off, WL + ry, cw2, 2); }
        g.restore();
        // waves: rows get bigger towards the viewer
        var hl = mix(mix(s.hor, [255, 255, 255], 0.45), [120, 140, 170], s.night * 0.5);
        for (var row = 0; row < 26; row++) {
            var f = row / 25, wy = HZ + 3 + Math.pow(f, 1.7) * (H - HZ), amp = 0.6 + f * 5, len = 16 + f * 90, sp = (row % 2 ? 1 : -1) * (6 + f * 18);
            g.strokeStyle = rgba(hl, 0.06 + f * 0.12); g.lineWidth = 0.6 + f * 1.6; g.beginPath();
            var o = ((t * sp + row * 37) % len + len) % len;
            for (var wx = o - len; wx < W + len; wx += len) { g.moveTo(wx, wy); g.quadraticCurveTo(wx + len * 0.25, wy - amp * (0.7 + 0.3 * Math.sin(t * 1.3 + row + wx * 0.01)), wx + len * 0.5, wy); }
            g.stroke();
        }
        // a small sailing boat crossing the bay
        var bpX = ((t * 9 + W * 0.15) % (W + 120)) - 60, bpY = HZ + (H - HZ) * 0.3 + Math.sin(t * 1.6) * 1.5, bs = Math.max(0.8, U * 0.55), bob = Math.sin(t * 1.6) * 0.05;
        g.save(); g.translate(bpX, bpY); g.rotate(bob); g.scale(bs, bs);
        g.fillStyle = rgba(mix([20, 16, 14], [92, 60, 38], 0.3 + s.light * 0.7)); g.beginPath(); g.moveTo(-14, -2); g.lineTo(14, -2); g.lineTo(10, 3); g.lineTo(-10, 3); g.closePath(); g.fill();
        g.fillStyle = rgba(mix([60, 64, 80], [240, 232, 214], 0.3 + s.light * 0.7)); g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -3); g.lineTo(11, -3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-1, -20); g.lineTo(-1, -3); g.lineTo(-9, -3); g.closePath(); g.fill();
        if (s.night > 0.3) { g.fillStyle = 'rgba(255,200,120,' + s.night + ')'; g.beginPath(); g.arc(-12, -5, 1.4, 0, Math.PI * 2); g.fill(); }
        g.restore();
        // island + castle, with a waving flag on the keep
        g.drawImage(ch.c, dx, top, cw2, ch.h);
        var px = W / 2 + ch.flagX * U, py = WL + ch.flagY * U, fw2 = 16 * U, fh = 9 * U;
        g.fillStyle = rgba(mix([60, 20, 20], [196, 58, 44], 0.3 + s.light * 0.7)); g.beginPath(); g.moveTo(px, py);
        for (var q = 0; q <= 8; q++) g.lineTo(px + fw2 * q / 8, py + Math.sin(t * 4 - q * 0.8) * U * 1.4 * q / 8);
        for (q = 8; q >= 0; q--) g.lineTo(px + fw2 * q / 8, py + fh + Math.sin(t * 4 - q * 0.8) * U * 1.4 * q / 8);
        g.closePath(); g.fill();
        if (s.night > 0.2) { var lg = g.createRadialGradient(W / 2, WL - 50 * U, 0, W / 2, WL - 50 * U, 70 * U); lg.addColorStop(0, 'rgba(255,180,90,' + 0.12 * s.night + ')'); lg.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = lg; g.fillRect(W / 2 - 70 * U, WL - 120 * U, 140 * U, 140 * U); }   // warm glow of the lit windows
    }
    function frame(now) { if (stopped) return; draw(now, false); if (!reduce) requestAnimationFrame(frame); }

    // ---- tips, each with a small drawn picture ----
    var S = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
    var TIPS = [
        ['<path d="M4 41h40"/><path d="M17 41V24h14v17z" fill="currentColor" fill-opacity=".2"/><path d="M15 24v-5h4v3h3v-3h4v3h3v-3h4v5z"/><path d="M22 41v-6a2 2 0 0 1 4 0v6"/><path d="M6 41a18 18 0 0 1 36 0" stroke="#8fc6ff" stroke-dasharray="3 3"/>', 'Der Friedensschild schützt nur deine Türme – Tore, Tempel und der Thron bleiben angreifbar.'],
        ['<path d="M4 24s7-11 20-11 20 11 20 11-7 11-20 11S4 24 4 24z"/><circle cx="24" cy="24" r="6.5" fill="currentColor" fill-opacity=".25"/><circle cx="24" cy="24" r="2.5" fill="currentColor"/>', 'Späh eine Basis aus, bevor du angreifst – dann siehst du ihre Truppen.'],
        ['<path d="M13 37l-4-11 4-9 4 9z"/><path d="M24 42l-5-16 5-14 5 14z" fill="#b48cff" fill-opacity=".35" stroke="#c9a8ff"/><path d="M35 36l-4-10 4-8 4 8z"/><path d="M24 6v2M18 9l1 2M30 9l-1 2" opacity=".7"/>', 'Helden schaltest du mit Splittern frei – die gibt es von Bossen und für tägliche Aufgaben. Seltenere sind immer stärker.'],
        ['<path d="M17 18.6V37.6L12.8 40.4 16.4 27.5 5.9 19.1z" fill="currentColor" stroke="none"/><path d="' + starPath(24, 25, 19, 8) + '"/>', 'Jedes Aufwerten füllt einen Viertel-Stern. Pro halbem Stern gibt es einen Fähigkeitspunkt.'],
        ['<path d="M33 7h8v8L22 34l-8-8z" fill="currentColor" fill-opacity=".2"/><path d="M11 23l14 14M17 31l-8 8"/><circle cx="8" cy="40" r="2"/><rect x="26" y="40" width="16" height="4" rx="2" stroke-width="1.5"/><rect x="26" y="40" width="16" height="4" rx="2" fill="#e0603a" stroke="none"/>', 'Heldenfähigkeiten wirken nur, wenn der Held mitkämpft. Ist die Wut voll, zündet die aktive.'],
        ['<path d="M8 34l-2-18 10 8 8-12 8 12 10-8-2 18z" fill="currentColor" fill-opacity=".22"/><path d="M9 40h30"/><circle cx="24" cy="28" r="2.6" fill="#d8342a" stroke="none"/><circle cx="15" cy="30" r="1.8" fill="#7fb6ff" stroke="none"/><circle cx="33" cy="30" r="1.8" fill="#7fb6ff" stroke="none"/>', 'Wer die Mitte hält, sammelt Thron-Punkte und vergibt Titel – gute für Freunde, schlechte für Rivalen.'],
        ['<circle cx="24" cy="21" r="13" stroke="#e8c35a" stroke-width="3"/><circle cx="24" cy="18" r="4.5" fill="currentColor" fill-opacity=".3"/><path d="M15.5 29a9.5 9.5 0 0 1 17 0" fill="currentColor" fill-opacity=".3"/><path d="M12 42l12-5 12 5" stroke="#d8342a" stroke-width="2.4"/>', 'Unter „Aussehen“ gibt es Rahmen, Titel, Ringe und Skins für Basis und Marsch – für Gems oder Thron-Punkte.'],
        ['<path d="M7 40V18l17-8 17 8v22"/><path d="M17 40V28a7 7 0 0 1 14 0v12" fill="currentColor" fill-opacity=".15"/><path d="M21 25v15M24 22v18M27 25v15" opacity=".6"/><circle cx="38" cy="36" r="6" fill="#e8c35a" stroke="#6b4a12" stroke-width="1.5"/><path d="M38 33v6" stroke="#6b4a12" stroke-width="1.5"/>', 'An fremden Toren kostet der Durchgang Maut – ohne genug Münzen kommst du nicht vorbei.'],
        ['<rect x="9" y="9" width="30" height="30" rx="7" fill="currentColor" fill-opacity=".12"/><path d="M24 16v16M16 24h16" stroke="#e05a4a" stroke-width="5" stroke-linecap="butt"/>', 'Das Lazarett rettet Verwundete – heile sie für ein paar Münzen.'],
        ['<path d="M24 38V12l11 4-11 4" fill="currentColor" fill-opacity=".25"/><path d="M18 38h12"/><path d="M5 10l11 14M5 42l11-8M43 40l-11-7" stroke-dasharray="3 3"/><circle cx="5" cy="10" r="2" fill="currentColor"/><circle cx="5" cy="42" r="2" fill="currentColor"/><circle cx="43" cy="40" r="2" fill="currentColor"/>', 'Stelle Armeen im Feld auf und sammle Truppen aus mehreren Basen an einem Punkt.'],
        ['<path d="M6 42h20M9 42V28h14v14M6 28h20l-10-8z" fill="currentColor" fill-opacity=".15"/><path d="M24 22L38 11" stroke="#8fc6ff" stroke-width="2.6"/><path d="M36 13l-2-7 5 3 3-5 3 5 0 7z" fill="currentColor" fill-opacity=".3" stroke-width="1.5"/>', 'Die Wächter-Tempel feuern auf den Herrscher der Mitte – erobere sie, dann schweigen sie.'],
        ['<path d="M20 9Q36 8 41 24" stroke-width="3"/><path d="M12 36L31 15"/><path d="M8 42l4-6 6 2 1 4z" fill="#e8c35a" stroke="#8a6420" stroke-width="1.4"/><path d="M28 42l3-5 5 1 2 4z" fill="#7fd0ff" stroke="#3a7aa0" stroke-width="1.4"/><path d="M4 42h40" opacity=".5"/>', 'Goldminen und Edelsteinadern bringen Beute – schick Sammler hin.'],
        ['<rect x="8" y="20" width="32" height="20" rx="3" fill="currentColor" fill-opacity=".15"/><path d="M8 28h32M12 20q12-10 24 0"/><rect x="21" y="25" width="6" height="7" rx="1.5" fill="#e8c35a" stroke="#6b4a12" stroke-width="1.4"/><circle cx="39" cy="11" r="5" fill="#e8c35a" stroke="#6b4a12" stroke-width="1.5"/>', 'Das Lager schützt deine Münzen: fällt eine Basis, nimmt der Sieger nie, was im Lager liegt.'],
        ['<path d="M5 42h38"/><path d="M9 42V30h12v12M27 42V26h12v16" fill="currentColor" fill-opacity=".15"/><path d="M11 24l7-7"/><path d="M15 11l6 6-3 3-6-6z" fill="currentColor"/><path d="M29 20l7-7" stroke="#8fc6ff"/><path d="M33 7l6 6-3 3-6-6z" fill="#7fd0ff" stroke="#3a7aa0" stroke-width="1.4"/>', 'Ein zweiter Bauarbeiter kostet einmal Gems – danach wachsen zwei Gebäude gleichzeitig.'],
        ['<rect x="6" y="8" width="22" height="32" rx="3" fill="currentColor" fill-opacity=".12"/><path d="M11 17l2 2 4-4M11 27l2 2 4-4M20 17h4M20 27h4"/><path d="M32 18h11v5a5.5 5.5 0 0 1-11 0z" fill="#e8c35a" stroke="#6b4a12" stroke-width="1.4"/><path d="M37.5 29v6M33.5 38h8"/>', 'Unter „Ziele“ warten tägliche Aufgaben und Erfolge – dort holst du dir Gems und Heldensplitter ab.'],
        ['<path d="M5 41h38"/><path d="M18 41V19h12v22z" fill="#e8c35a" fill-opacity=".35"/><path d="M6 41V27h12v14M30 41V31h12v10"/><path d="M24 5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="currentColor"/>', 'Die Rangliste zählt Macht, Eroberungen und Titel aus der Mitte – dazu die Thron-Punkte der Woche.']];
    var card = document.getElementById('splashTipCard'), pic = document.getElementById('splashTipPic'), txt = document.getElementById('splashTip'), tipI = Math.floor(Math.random() * TIPS.length);
    function showTip(i) { if (!pic || !txt) return; pic.innerHTML = S + TIPS[i][0] + '</svg>'; txt.textContent = TIPS[i][1]; }
    showTip(tipI);
    if (card) tipTimer = setInterval(function () {
        if (reduce) { tipI = (tipI + 1) % TIPS.length; showTip(tipI); return; }
        card.classList.add('is-swap'); setTimeout(function () { tipI = (tipI + 1) % TIPS.length; showTip(tipI); card.classList.remove('is-swap'); }, 350);
    }, 3800);
    window.__splashTips = TIPS;                                                                          // (for tests)

    resize();
    window.addEventListener('resize', resize);
    if (!reduce) requestAnimationFrame(frame);
    window.__stopSplashScene = function () { stopped = true; clearInterval(tipTimer); window.removeEventListener('resize', resize); };
})();
