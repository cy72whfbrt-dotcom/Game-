// ===== Ladebildschirm + Titelbild der Startseite: gemalte Dämmerung, Burg auf der Klippe, Nebel, Spiegelung (läuft vor dem Spiel) =====
// Die Szene wird einmal gemalt; danach bewegt sich nur Kleines (Nebel, Funken, Fahnen, Glitzern, Vögel) mit höchstens 30 Bildern/s.
(function () {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function leinwand(w, h, d) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(h * d)); var x = c.getContext('2d'); x.scale(d, d); return { c: c, x: x }; }
    // Gratlinie (Mittelpunkt-Verschiebung, fester Zufall): 129 Werte 0..1
    function grat(r, rau) {
        var n = 128, p = new Array(n + 1), s = 1; p[0] = r(); p[n] = r();
        for (var st = n; st > 1; st /= 2, s *= rau) for (var i = 0; i < n; i += st) p[i + st / 2] = (p[i] + p[i + st]) / 2 + (r() - 0.5) * s;
        var lo = Math.min.apply(null, p), hi = Math.max.apply(null, p);
        return p.map(function (v) { return (v - lo) / (hi - lo || 1); });
    }

    function titelSzene(cv, opt) {
        var g = cv.getContext('2d'), W, H, D, HZ, WY, CX, U, SX, M, bild = null, nebel = null, funken = [], voegel = [], glitzer = [], fenster = [], fahnen = [], fackeln = [];
        var stopped = false, t0 = performance.now(), last = 0;
        function lage() {
            D = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; M = Math.min(W, H);
            var quer = W > H * 1.1;
            HZ = Math.round(H * (quer ? 0.62 : opt.login ? 0.52 : 0.58));                                   // Horizont
            WY = HZ + (H - HZ) * (quer ? 0.1 : 0.18);                                                      // Wasserlinie am Fuß der Klippe
            U = Math.min(H * (quer ? 0.36 : 0.27) / 100, W * 0.85 / 150);                                   // Burg-Einheit (Klippe + Burg ≈ 130 U hoch)
            CX = W * (quer ? (opt.login ? 0.42 : 0.66) : 0.6);
            SX = Math.max(CX - 72 * U, W * 0.16);                                                          // Sonne knapp links neben der Burg: Gegenlicht
            cv.width = Math.round(W * D); cv.height = Math.round(H * D);
        }
        function tal(x) { var b = Math.max(W * 0.14, 60); return 1 - 0.8 * Math.exp(-Math.pow((x - SX) / b, 2)); }   // Berge öffnen sich um die Sonne
        function kette(x, r, rau, hoch, unten, farbe, kante) {
            var p = grat(r, rau); x.beginPath(); x.moveTo(0, unten);
            for (var i = 0; i <= 128; i++) { var px = W * i / 128; x.lineTo(px, HZ - hoch * (0.3 + 0.7 * p[i]) * tal(px)); }
            x.lineTo(W, unten); x.closePath(); x.fillStyle = farbe; x.fill();
            if (kante) { x.save(); x.beginPath(); for (i = 0; i <= 128; i++) { px = W * i / 128; x[i ? 'lineTo' : 'moveTo'](px, HZ - hoch * (0.3 + 0.7 * p[i]) * tal(px)); } x.strokeStyle = kante; x.lineWidth = 1; x.stroke(); x.restore(); }
        }
        function dunst(x, y0, y1, farbe) { var d = x.createLinearGradient(0, y0, 0, y1); d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(1, farbe); x.fillStyle = d; x.fillRect(0, y0, W, y1 - y0); }

        // ---- Klippe + Burg als eigenes Bild (Ursprung = Wasserlinie unter der Burgmitte), Maße in U ----
        function maleBurg() {
            var bw = 200 * U, bh = 150 * U, ox = bw / 2, oy = bh - 2 * U, b = leinwand(bw, bh, D), x = b.x, B = -30;
            function u(v) { return v * U; }
            function rect(x0, y0, x1, y1) { x.rect(u(x0), u(y0), u(x1 - x0), u(y1 - y0)); }
            function zinnen(x0, x1, y) { for (var zx = x0; zx < x1 - 1; zx += 4.6) x.rect(u(zx), u(y - 3), u(Math.min(2.6, x1 - zx)), u(3.2)); }
            function kegel(x0, x1, y, spitze) { x.moveTo(u(x0 - 2), u(y)); x.lineTo(u((x0 + x1) / 2), u(spitze)); x.lineTo(u(x1 + 2), u(y)); x.closePath(); }
            function klippe() {
                var pk = [[-98, 2], [-90, -3], [-82, -5], [-77, -11], [-70, -13], [-66, -20], [-61, -24], [-58, -30], [-30, -31], [30, -31], [58, -30], [61, -25], [65, -21], [69, -14], [74, -12], [80, -6], [88, -4], [96, 2]];
                x.beginPath(); pk.forEach(function (q, i) { x[i ? 'lineTo' : 'moveTo'](u(q[0]), u(q[1])); }); x.closePath(); x.fill();
            }
            function burg() {
                x.beginPath();
                rect(-56, B - 14, 56, B + 2); zinnen(-56, 56, B - 14);                                       // Mauer
                rect(-54, B - 34, -42, B); kegel(-54, -42, B - 34, B - 54);                                   // Turm links, Kegeldach
                rect(-34, B - 46, -20, B); zinnen(-35, -19, B - 46);                                          // Turm mit Zinnen
                rect(-12, B - 68, 6, B); kegel(-12, 6, B - 68, B - 98);                                       // Bergfried mit Spitzdach
                rect(-14.5, B - 74, -10.5, B - 66); kegel(-14.5, -10.5, B - 74, B - 82);                      // Ecktürmchen
                rect(4.5, B - 74, 8.5, B - 66); kegel(4.5, 8.5, B - 74, B - 82);
                rect(6, B - 36, 22, B); x.moveTo(u(5), u(B - 36)); x.lineTo(u(14), u(B - 48)); x.lineTo(u(23), u(B - 36)); x.closePath();   // Halle mit Giebel
                rect(22, B - 54, 34, B); kegel(22, 34, B - 54, B - 76);                                       // Turm rechts
                rect(42, B - 28, 52, B); zinnen(41, 53, B - 28);                                              // kleiner Turm rechts
                x.fill();
            }
            // Gegenlicht: erst in Lichtfarbe etwas nach links oben versetzt, dann dunkel darüber → goldene Kante zur Sonne
            x.save(); x.translate(ox - 1.6, oy - 0.9);
            x.fillStyle = 'rgba(200,135,63,.6)'; klippe(); x.fillStyle = 'rgba(224,160,80,.75)'; burg(); x.restore();
            x.save(); x.translate(ox, oy); x.fillStyle = '#0d1124'; klippe(); burg();
            // Rundung: zur Sonne hin ein Hauch Wärme
            x.globalCompositeOperation = 'source-atop';
            var lg = x.createLinearGradient(u(-60), 0, u(30), 0); lg.addColorStop(0, 'rgba(150,90,70,.32)'); lg.addColorStop(1, 'rgba(150,90,70,0)');
            x.fillStyle = lg; x.fillRect(u(-100), u(-140), u(200), u(150));
            x.globalCompositeOperation = 'source-over';
            // Felskanten, Treppe vom Tor hinab
            x.strokeStyle = 'rgba(200,135,63,.22)'; x.lineWidth = Math.max(1, U * 0.4); x.beginPath();
            [[-70, -12, -52, -16], [-62, -21, -40, -24], [-84, -4, -66, -6], [60, -22, 70, -15]].forEach(function (l) { x.moveTo(u(l[0]), u(l[1])); x.lineTo(u(l[2]), u(l[3])); }); x.stroke();
            x.strokeStyle = 'rgba(224,160,80,.45)'; x.beginPath(); x.moveTo(u(-38), u(B));
            for (var s = 0; s < 7; s++) { x.lineTo(u(-38 - s * 6 - 3), u(B + s * 4.2)); x.lineTo(u(-38 - s * 6 - 3), u(B + s * 4.2 + 4.2)); } x.stroke();
            // Tor mit Fackelschein
            x.fillStyle = 'rgba(255,170,80,.55)'; x.beginPath(); x.moveTo(u(-41), u(B + 1)); x.lineTo(u(-41), u(B - 6)); x.arc(u(-38), u(B - 6), u(3), Math.PI, 0); x.lineTo(u(-35), u(B + 1)); x.closePath(); x.fill();
            // Fahnenstangen
            x.strokeStyle = '#0d1124'; x.lineWidth = Math.max(1, U * 0.6); x.beginPath();
            [[-3, B - 98, 12], [28, B - 76, 9], [-48, B - 54, 8]].forEach(function (f) { x.moveTo(u(f[0]), u(f[1])); x.lineTo(u(f[0]), u(f[1] - f[2])); }); x.stroke();
            // Fenster: warmes Licht mit Schein
            var fw = [[-9.5, B - 60], [-4.2, B - 60], [1, B - 60], [-9.5, B - 50], [1, B - 50], [-4.2, B - 40], [-9.5, B - 28], [1, B - 28], [-12.6, B - 79 + 0.5], [5.5, B - 79 + 0.5],
                      [-49.2, B - 28], [-49.2, B - 16], [-28.4, B - 38], [-28.4, B - 25], [8.6, B - 30], [12.8, B - 30], [17, B - 30], [26.8, B - 46], [26.8, B - 34], [26.8, B - 21], [45.8, B - 22], [-6, B - 10], [36, B - 9]];
            x.shadowColor = 'rgba(255,170,80,.9)'; x.shadowBlur = 9 * D; x.fillStyle = '#ffc46e';
            fw.forEach(function (f, i) { var w = i === 8 || i === 9 ? 1.6 : 2.4, h = i === 8 || i === 9 ? 2.6 : 4; x.beginPath(); x.moveTo(u(f[0]), u(f[1] + h)); x.lineTo(u(f[0]), u(f[1] + w / 2)); x.arc(u(f[0] + w / 2), u(f[1] + w / 2), u(w / 2), Math.PI, 0); x.lineTo(u(f[0] + w), u(f[1] + h)); x.closePath(); x.fill(); });
            x.restore();
            fenster = [fw[1], fw[13], fw[18]].map(function (f) { return [CX + (f[0] + 1.2) * U, WY + (f[1] + 2) * U]; });
            fahnen = [[-3, B - 110, '#d4ad66', 1], [28, B - 85, '#b8352a', 0.8], [-48, B - 62, '#b8352a', 0.7]].map(function (f) { return [CX + f[0] * U, WY + f[1] * U, f[2], f[3]]; });
            fackeln = [[CX - 42.5 * U, WY + (B - 5) * U], [CX - 33.5 * U, WY + (B - 5) * U]];
            return { c: b.c, w: bw, h: bh, ox: ox, oy: oy };
        }

        function male() {
            var b = leinwand(W, H, D), x = b.x, r = rng(11), i;
            // 1 Himmel: Dämmerung
            var sg = x.createLinearGradient(0, 0, 0, HZ);
            sg.addColorStop(0, '#0b1430'); sg.addColorStop(0.35, '#1f2a55'); sg.addColorStop(0.65, '#5a3d6b'); sg.addColorStop(0.9, '#c8693f'); sg.addColorStop(1, '#f2b46a');
            x.fillStyle = sg; x.fillRect(0, 0, W, HZ + 1);
            // 2 Lichtschein um die Sonne
            var hr = Math.max(W, H) * 0.6, hof = x.createRadialGradient(SX, HZ, 0, SX, HZ, hr);
            hof.addColorStop(0, 'rgba(255,170,90,.5)'); hof.addColorStop(0.4, 'rgba(240,140,90,.16)'); hof.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = hof; x.fillRect(0, 0, W, HZ);
            var kr = M * 0.3, kern = x.createRadialGradient(SX, HZ, 0, SX, HZ, kr);
            kern.addColorStop(0, 'rgba(255,224,170,.95)'); kern.addColorStop(0.35, 'rgba(255,200,130,.4)'); kern.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = kern; x.fillRect(SX - kr, HZ - kr, kr * 2, kr);
            x.fillStyle = '#fff1cf'; x.beginPath(); x.arc(SX, HZ, M * 0.04, Math.PI, 0); x.fill();
            // 3 Sterne nur ganz oben
            for (i = 0; i < 80; i++) { var sy = r() * H * 0.25; x.fillStyle = 'rgba(232,238,255,' + (0.2 + r() * 0.4 * (1 - sy / (H * 0.25))).toFixed(2) + ')'; x.fillRect(r() * W, sy, 0.6 + r() * 1.1, 0.6 + r() * 1.1); }
            // 4 Wolkenbänder: lang, flach, weiche Ränder, nahe der Sonne von unten angeleuchtet
            function bausch(cx, cy, rx, ry, farbe, a) { x.save(); x.translate(cx, cy); x.scale(rx / ry, 1); var q = x.createRadialGradient(0, 0, 0, 0, 0, ry);
                q.addColorStop(0, farbe + a + ')'); q.addColorStop(0.55, farbe + (a * 0.6).toFixed(3) + ')'); q.addColorStop(1, farbe + '0)'); x.fillStyle = q; x.fillRect(-ry, -ry, ry * 2, ry * 2); x.restore(); }
            [[0.14, 0.3], [0.3, 0.72], [0.48, 0.3], [0.66, 0.78], [0.8, 0.2]].forEach(function (bd, k) {
                var by = HZ * bd[0], len = W * (0.55 + r() * 0.5), bx = W * bd[1], dick = M * (0.014 + k * 0.004);
                for (var j = 0; j < 14; j++) { var cx = bx + (j / 13 - 0.5) * len + (r() - 0.5) * len * 0.08, cy = by + (r() - 0.5) * dick * 0.8, rx = len * (0.07 + r() * 0.08), ry = dick * (0.5 + r() * 0.7);
                    var licht = (0.2 + k * 0.12) * Math.exp(-Math.pow((cx - SX) / (W * 0.45), 2));
                    bausch(cx, cy, rx, ry, 'rgba(48,44,88,', 0.55); bausch(cx, cy + ry * 0.45, rx * 0.85, ry * 0.5, 'rgba(240,160,100,', Math.min(0.75, licht + 0.12).toFixed(3)); }
            });
            // 5–8 Bergketten: hinten hell und blau im Dunst, vorn dunkler
            kette(x, rng(5), 0.55, H * 0.18, HZ + 1, '#6a6f9a');
            dunst(x, HZ - H * 0.16, HZ, 'rgba(242,180,120,.35)');
            kette(x, rng(9), 0.6, H * 0.11, HZ + 1, '#3d4470', 'rgba(138,122,160,.8)');
            dunst(x, HZ - H * 0.08, HZ, 'rgba(200,140,120,.25)');
            // 9 Hügel nah mit Wald
            var hp = grat(rng(21), 0.5), baum = Math.max(6, U * 4), hy = function (px) { return HZ - H * 0.035 * (0.3 + 0.7 * hp[Math.round(px / W * 128)]) * tal(px); };
            x.fillStyle = '#1c2346'; x.beginPath(); x.moveTo(0, HZ + 1); for (i = 0; i <= 128; i++) x.lineTo(W * i / 128, hy(W * i / 128)); x.lineTo(W, HZ + 1); x.closePath(); x.fill();
            x.fillStyle = '#141a36';
            for (var px = 0; px < W; px += baum * (0.35 + r() * 0.5)) { if (Math.abs(px - SX) < W * 0.05) continue; var th = baum * (0.6 + r() * 0.8), ty = hy(px) + 2; x.beginPath(); x.moveTo(px - th * 0.28, ty); x.lineTo(px, ty - th); x.lineTo(px + th * 0.28, ty); x.closePath(); x.fill(); }
            // 10 Wasser mit Himmelsschein am Horizont und Lichtbahn unter der Sonne
            var wg = x.createLinearGradient(0, HZ, 0, H); wg.addColorStop(0, '#3a3358'); wg.addColorStop(0.35, '#141a33'); wg.addColorStop(1, '#070b18');
            x.fillStyle = wg; x.fillRect(0, HZ, W, H - HZ);
            dunst(x, HZ + (H - HZ) * 0.22, HZ, 'rgba(242,170,106,.42)');
            for (var y = HZ + 1; y < H; y += 2 + (y - HZ) * 0.03) {
                var dep = (y - HZ) / (H - HZ), bw = M * 0.04 + dep * W * 0.22;
                for (var s = 0; s < 3; s++) { var sw = bw * (0.2 + r() * 0.6); x.fillStyle = 'rgba(242,180,106,' + (0.5 * (1 - dep * 0.75) * (0.4 + r() * 0.6)).toFixed(3) + ')'; x.fillRect(SX + (r() - 0.5) * bw * 1.6 - sw / 2, y, sw, 1 + dep * 1.6); }
                if (r() < 0.35) { x.fillStyle = 'rgba(120,130,190,' + (0.06 + dep * 0.08).toFixed(3) + ')'; var lw = 20 + r() * 80 * (0.3 + dep); x.fillRect(r() * W, y, lw, 1); }
            }
            // warmer Schein hinter der Burg
            var bur = maleBurg(), gx = CX, gy = WY - 60 * U, gl = x.createRadialGradient(gx, gy, 0, gx, gy, 100 * U);
            gl.addColorStop(0, 'rgba(255,170,90,.18)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = gl; x.fillRect(gx - 100 * U, gy - 100 * U, 200 * U, 200 * U);
            // 11 Spiegelung von Klippe und Burg, waagerecht zerschnitten
            var rl = Math.min(bur.oy * 0.8, H - WY);
            for (var ry = 0; ry < rl; ry += 2) { x.globalAlpha = 0.32 * (1 - ry / rl); x.drawImage(bur.c, 0, Math.max(0, (bur.oy - ry - 2) * D), bur.c.width, 2 * D, CX - bur.ox + Math.sin(ry * 0.21) * 1.2, WY + ry, bur.w, 2); }
            x.globalAlpha = 1;
            // 12 Klippe + Burg
            x.drawImage(bur.c, CX - bur.ox, WY - bur.oy, bur.w, bur.h);
            // 14 Vordergrund links unten: Felsen und Schilf
            var fy = H, fw2 = W * 0.34, fh = H * 0.14; x.fillStyle = '#05070f'; x.beginPath(); x.moveTo(0, fy);
            x.lineTo(0, fy - fh); x.quadraticCurveTo(fw2 * 0.2, fy - fh * 1.15, fw2 * 0.42, fy - fh * 0.7); x.quadraticCurveTo(fw2 * 0.7, fy - fh * 0.5, fw2 * 0.8, fy - fh * 0.2); x.quadraticCurveTo(fw2 * 0.95, fy - fh * 0.05, fw2, fy); x.closePath(); x.fill();
            x.strokeStyle = '#05070f'; x.lineWidth = 1.4; x.beginPath();
            for (i = 0; i < 26; i++) { var sx = fw2 * (0.25 + r() * 0.7), sh = fh * (0.4 + r() * 0.6), sb = fy - fh * 0.45 * (1 - sx / fw2) - 2; x.moveTo(sx, sb); x.quadraticCurveTo(sx + 3, sb - sh * 0.6, sx + (r() - 0.3) * 10, sb - sh); } x.stroke();
            x.strokeStyle = 'rgba(200,135,63,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, fy - fh); x.quadraticCurveTo(fw2 * 0.2, fy - fh * 1.15, fw2 * 0.42, fy - fh * 0.7); x.stroke();
            return b.c;
        }
        // Bodennebel: weiche Schwaden, nahtlos nebeneinander zu legen
        function maleNebel() {
            var nh = Math.max(40, H * 0.12), n = leinwand(W, nh, 1), x = n.x, r = rng(3);
            for (var i = 0; i < 16; i++) { var cx = r() * W, cy = nh * (0.35 + r() * 0.3), rx = W * (0.12 + r() * 0.16), ry = nh * (0.18 + r() * 0.2);
                for (var k = -1; k <= 1; k++) { x.save(); x.translate(cx + k * W, cy); x.scale(rx / ry, 1); var ng = x.createRadialGradient(0, 0, 0, 0, 0, ry); ng.addColorStop(0, 'rgba(236,196,200,.6)'); ng.addColorStop(1, 'rgba(236,196,200,0)'); x.fillStyle = ng; x.fillRect(-ry, -ry, ry * 2, ry * 2); x.restore(); } }
            return { c: n.c, h: nh };
        }
        function neu() {
            lage(); bild = male(); nebel = maleNebel();
            var r = rng(17), i; funken = []; voegel = []; glitzer = [];
            for (i = 0; i < 40; i++) funken.push({ x: CX + (r() - 0.5) * 130 * U, y: WY - r() * 40 * U, sp: 6 + r() * 12, ph: r() * 6.28, s: 1 + r(), hoch: 60 * U + r() * H * 0.25 });
            for (i = 0; i < 4; i++) voegel.push({ x: r(), y: HZ * (0.38 + r() * 0.25), v: 8 + r() * 6, s: 3 + r() * 3, ph: r() * 6.28 });
            for (i = 0; i < 34; i++) { var dep = Math.pow(r(), 1.4); glitzer.push({ x: SX + (r() - 0.5) * (M * 0.06 + dep * W * 0.3), y: HZ + 3 + dep * (H - HZ) * 0.9, w: 3 + dep * 14, ph: r() * 6.28, k: 1.5 + r() * 2.5 }); }
            last = 0; zeichne(performance.now(), true);
        }
        function zeichne(now, immer) {
            if (stopped || (!immer && now - last < 33)) return;
            last = now; var t = reduce ? 0 : (now - t0) / 1000, i, nb;
            g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bild, 0, 0); g.setTransform(D, 0, 0, D, 0, 0);
            // Glitzern auf der Lichtbahn
            for (i = 0; i < glitzer.length; i++) { nb = glitzer[i]; var a = 0.5 + 0.5 * Math.sin(t * nb.k + nb.ph); g.fillStyle = 'rgba(255,217,160,' + (a * 0.55).toFixed(3) + ')'; g.fillRect(nb.x - nb.w / 2 + Math.sin(t * 0.7 + nb.ph) * 3, nb.y, nb.w, 1.3); }
            // Bodennebel in zwei Lagen
            [[WY - nebel.h * 0.6, 10, 0.2], [WY - nebel.h * 0.3, -18, 0.16]].forEach(function (l) {
                var dx = ((t * l[1]) % W + W) % W; g.globalAlpha = l[2]; g.drawImage(nebel.c, dx - W, l[0], W, nebel.h); g.drawImage(nebel.c, dx, l[0], W, nebel.h); });
            g.globalAlpha = 1;
            // Fenster und Fackeln flackern sanft
            fenster.concat(fackeln).forEach(function (f, k) { var a = 0.18 + 0.17 * Math.sin(t * (3 + k) + k * 2) * Math.sin(t * 1.7 + k), rr = (k < fenster.length ? 5 : 7) * U;
                var fg = g.createRadialGradient(f[0], f[1], 0, f[0], f[1], rr); fg.addColorStop(0, 'rgba(255,190,100,' + Math.max(0, a).toFixed(3) + ')'); fg.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = fg; g.fillRect(f[0] - rr, f[1] - rr, rr * 2, rr * 2); });
            // Fahnen wehen
            fahnen.forEach(function (f) { var fw = 11 * U * f[3], fh = 6 * U * f[3], q; g.fillStyle = f[2]; g.beginPath(); g.moveTo(f[0], f[1]);
                for (q = 0; q <= 8; q++) g.lineTo(f[0] + fw * q / 8, f[1] + Math.sin(t * 4 - q * 0.8) * U * q / 8);
                for (q = 8; q >= 0; q--) g.lineTo(f[0] + fw * q / 8, f[1] + fh + Math.sin(t * 4 - q * 0.8) * U * q / 8); g.closePath(); g.fill(); });
            // Glühende Funken steigen auf
            for (i = 0; i < funken.length; i++) { nb = funken[i]; var h = (t * nb.sp + nb.ph * 40) % nb.hoch, fa = (1 - h / nb.hoch) * 0.8;
                g.fillStyle = 'rgba(255,207,122,' + fa.toFixed(3) + ')'; g.fillRect(nb.x + Math.sin(t * 0.9 + nb.ph) * 6, nb.y - h, nb.s, nb.s); }
            // Vögel ziehen vorbei
            g.strokeStyle = '#0d1124'; g.lineWidth = 1.3;
            for (i = 0; i < voegel.length; i++) { nb = voegel[i]; var vx = ((nb.x * W + t * nb.v) % (W + 60)) - 30, vy = nb.y + Math.sin(t * 0.6 + nb.ph) * 4, fl = Math.sin(t * 5 + nb.ph) * nb.s * 0.5;
                g.beginPath(); g.moveTo(vx - nb.s, vy - fl); g.quadraticCurveTo(vx - nb.s / 2, vy - 1.5, vx, vy); g.quadraticCurveTo(vx + nb.s / 2, vy - 1.5, vx + nb.s, vy - fl); g.stroke(); }
        }
        function bild30(now) { if (stopped) return; zeichne(now, false); requestAnimationFrame(bild30); }
        neu();
        window.addEventListener('resize', neu);
        if (!reduce) requestAnimationFrame(bild30);
        return { stop: function () { stopped = true; window.removeEventListener('resize', neu); } };
    }

    // ---- Ladebildschirm: Szene, wechselnde Tipps, Prozent genau nach der Füllung des Balkens ----
    var cv = document.getElementById('splashCanvas');
    if (cv) {
        var szene = titelSzene(cv, {}), aus = false;
        var TIPS = [
            'Der Friedensschild schützt nur deine Türme – Tore, Tempel und der Thron bleiben angreifbar.',
            'Späh eine Basis aus, bevor du angreifst – dann siehst du ihre Truppen.',
            'Helden schaltest du mit Splittern frei – die gibt es von Bossen und für tägliche Aufgaben. Seltenere sind immer stärker.',
            'Jedes Aufwerten füllt einen Viertel-Stern. Pro halbem Stern gibt es einen Fähigkeitspunkt.',
            'Heldenfähigkeiten wirken nur, wenn der Held mitkämpft. Ist die Wut voll, zündet die aktive.',
            'Wer die Mitte hält, sammelt Thron-Punkte und vergibt Titel – gute für Freunde, schlechte für Rivalen.',
            'Unter „Aussehen“ gibt es Rahmen, Titel, Ringe und Skins für Basis und Marsch – für Edelsteine oder Thron-Punkte.',
            'An fremden Toren kostet der Durchgang Maut – ohne genug Münzen kommst du nicht vorbei.',
            'Das Krankenhaus rettet Verwundete – heile sie für ein paar Münzen.',
            'Stelle Armeen im Feld auf und sammle Truppen aus mehreren Basen an einem Punkt.',
            'Die Wächter-Tempel feuern auf den Herrscher der Mitte – erobere sie, dann schweigen sie.',
            'Goldminen und Edelsteinadern bringen Beute – schick Sammler hin.',
            'Die Burg schützt Gold, Holz, Stein und Eisen. Beute gibt es nur an der Hauptstadt: 10 % von dem, was über dem Schutz liegt.',
            'Ein zweiter Bauarbeiter kostet einmal Edelsteine – danach wachsen zwei Gebäude gleichzeitig.',
            'Unter „Events“ warten tägliche Aufgaben und Erfolge – dort holst du dir Edelsteine und Heldensplitter ab.',
            'Die Rangliste zählt Macht, Eroberungen und Titel aus der Mitte – dazu alle je verdienten Thron-Punkte.'];
        var zeile = document.getElementById('splashTipCard'), txt = document.getElementById('splashTip'), tipI = Math.floor(Math.random() * TIPS.length), tipTimer = 0;
        if (txt) txt.textContent = TIPS[tipI];
        if (zeile && txt) tipTimer = setInterval(function () {
            if (reduce) { tipI = (tipI + 1) % TIPS.length; txt.textContent = TIPS[tipI]; return; }
            zeile.classList.add('is-swap'); setTimeout(function () { tipI = (tipI + 1) % TIPS.length; txt.textContent = TIPS[tipI]; zeile.classList.remove('is-swap'); }, 350);
        }, 4200);
        // Prozent = Füllung / Spur (gleiche Quelle wie der Balken; 100 % erst, wenn er wirklich voll ist)
        var fill = document.getElementById('splashFill'), pctEl = document.getElementById('splashPct');
        (function pct() {
            if (aus || !fill || !pctEl || !fill.isConnected) return;
            var spur = fill.parentNode.clientWidth;
            pctEl.textContent = Math.min(100, Math.floor(fill.getBoundingClientRect().width / Math.max(1, spur) * 100 + 0.01)) + ' %';
            requestAnimationFrame(pct);
        })();
        window.__stopSplashScene = function () { aus = true; szene.stop(); clearInterval(tipTimer); };
    }
    // ---- Startseite (index.php): dieselbe Szene hinter dem Anmelden ----
    var tc = document.getElementById('titelCanvas');
    if (tc) titelSzene(tc, { login: true });
})();
