// ===== Ladebildschirm + Titelbild der Startseite: gemalte Dämmerung, Burg auf der Klippe, Nebel, Spiegelung (läuft vor dem Spiel) =====
// Die Szene wird einmal gemalt; danach bewegt sich nur Kleines (Nebel, Funken, Fahnen, Glitzern, Vögel) mit höchstens 30 Bildern/s.
(function () {
    // Gemaltes Titelbild (Hochformat 9:16 / Querformat 16:9): sobald hier eingetragen, blendet es weich über die Canvas-Szene
    var TITELBILD = window.__titelBild || null;   // z. B. { hoch: 'bilder/titel_hoch.webp', quer: 'bilder/titel_quer.webp' }
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
        var g = cv.getContext('2d'), W, H, D, HZ, WY, CX, U, SX, M, bild = null, nebel = null, funken = [], voegel = [], glitzer = [], fenster = [], fahnen = [], fackeln = [], kugeln = [], feuer = null, held = null;
        var stopped = false, t0 = performance.now(), last = 0;
        function lage() {
            D = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; M = Math.min(W, H);
            var quer = W > H * 1.1;
            HZ = Math.round(H * (quer ? 0.62 : opt.login ? 0.5 : 0.58));                                   // Horizont
            WY = HZ + (H - HZ) * 0.1;                                                     // Wasserlinie am Fuß der Klippe
            U = Math.min(H * (quer ? 0.36 : opt.login ? 0.22 : 0.27) / 100, W * 0.85 / 150);                                   // Burg-Einheit (Klippe + Burg ≈ 130 U hoch)
            CX = W * (quer ? (opt.login ? 0.42 : 0.66) : 0.62);
            SX = Math.max(CX - 72 * U, W * 0.16);                                                          // Sonne knapp links neben der Burg: Gegenlicht
            // Feuerbälle (Kopf, Schweiflänge, Richtung nach rechts oben, Größe) und der Feldherr auf dem Felsen vorn links
            var sk = Math.max(1, M / 420);
            kugeln = (quer ? [[0.88, 0.22, 0.3], [0.53, 0.3, 0.22], [0.75, 0.09, 0.1]] : [[0.86, 0.33, 0.32], [0.14, 0.4, 0.2], [0.62, 0.11, 0.12]]).map(function (k, i) {
                return [k[0] * W, k[1] * H, k[2] * Math.max(W, H), 0.69, -0.725, sk * (i === 2 ? 0.55 : 1)]; });
            held = { x: W * (quer ? 0.17 : 0.2), y: H * (quer ? 0.82 : 0.83), h: H * (quer ? 0.3 : 0.24) / 140 };
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
            x.save(); x.translate(ox - 2, oy - 1.2);
            x.fillStyle = 'rgba(214,140,63,.75)'; klippe(); x.fillStyle = 'rgba(255,184,96,.9)'; burg(); x.restore();
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
            feuer = [CX + 47 * U, WY + (B - 31) * U];
            return { c: b.c, w: bw, h: bh, ox: ox, oy: oy };
        }

        function male() {
            var b = leinwand(W, H, D), x = b.x, r = rng(11), i;
            // 1 Himmel: Dämmerung
            var sg = x.createLinearGradient(0, 0, 0, HZ);
            sg.addColorStop(0, '#0a1330'); sg.addColorStop(0.3, '#1b2a60'); sg.addColorStop(0.55, '#5e3660'); sg.addColorStop(0.78, '#d0603a'); sg.addColorStop(1, '#ffbe6a');
            x.fillStyle = sg; x.fillRect(0, 0, W, HZ + 1);
            // 2 Lichtschein um die Sonne
            var hr = Math.max(W, H) * 0.6, hof = x.createRadialGradient(SX, HZ, 0, SX, HZ, hr);
            hof.addColorStop(0, 'rgba(255,170,90,.5)'); hof.addColorStop(0.4, 'rgba(240,140,90,.16)'); hof.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = hof; x.fillRect(0, 0, W, HZ);
            var kr = M * 0.3, kern = x.createRadialGradient(SX, HZ, 0, SX, HZ, kr);
            kern.addColorStop(0, 'rgba(255,224,170,.95)'); kern.addColorStop(0.35, 'rgba(255,200,130,.4)'); kern.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = kern; x.fillRect(SX - kr, HZ - kr, kr * 2, kr);
            x.fillStyle = '#fff1cf'; x.beginPath(); x.arc(SX, HZ, M * 0.04, Math.PI, 0); x.fill();
            // Lichtstrahlen aus der Sonne
            var lr = Math.max(W, H), sr = x.createRadialGradient(SX, HZ, 0, SX, HZ, lr * 0.8); sr.addColorStop(0, 'rgba(255,210,140,.1)'); sr.addColorStop(0.5, 'rgba(255,210,140,.04)'); sr.addColorStop(1, 'rgba(255,210,140,0)');
            x.fillStyle = sr; x.beginPath();
            for (i = 0; i < 7; i++) { var wa = -Math.PI * (0.12 + i * 0.12 + r() * 0.03), wb = wa - 0.05 - r() * 0.05; x.moveTo(SX, HZ); x.lineTo(SX + Math.cos(wa) * lr, HZ + Math.sin(wa) * lr); x.lineTo(SX + Math.cos(wb) * lr, HZ + Math.sin(wb) * lr); x.closePath(); }
            x.fill();
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
            // Feuerbälle: Rauchschweif (die Köpfe glühen bewegt darüber)
            kugeln.forEach(function (k) { for (var j = 48; j >= 0; j--) { var f = j / 48, rr = (4 + f * 15) * k[5];
                bausch(k[0] + k[3] * f * k[2], k[1] + k[4] * f * k[2], rr, rr, f < 0.2 ? 'rgba(255,' + Math.round(200 - f * 500) + ',70,' : 'rgba(46,40,54,', ((1 - f) * (f < 0.2 ? 0.5 : 0.4)).toFixed(3)); } });
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
            // Rauchsäule über dem brennenden Turm
            for (i = 0; i < 22; i++) { var f2 = i / 21; bausch(feuer[0] + f2 * f2 * 60 * U, feuer[1] - 4 * U - f2 * 75 * U, (3 + f2 * 14) * U, (2.5 + f2 * 9) * U, 'rgba(30,26,40,', (0.6 * (1 - f2 * 0.8)).toFixed(3)); }
            // Ufer mit dem Heer: Reihen kleiner Krieger mit Lanzen, Fahnen und Fackeln (Licht von links)
            var s = Math.max(1.2, U * 0.75), ue = CX - 50 * U, SY = WY + (H - WY) * 0.2, uz = ue + 20 * U;
            function ufer(px) { var f = Math.min(1, Math.max(0, px / uz)); return SY - 6 * s + (WY + 2 - SY + 6 * s) * Math.pow(f, 1.5); }
            x.fillStyle = '#0c1024'; x.beginPath(); x.moveTo(0, ufer(0));
            for (i = 1; i <= 20; i++) x.lineTo(uz * i / 20, ufer(uz * i / 20));
            x.lineTo(uz + 12 * U, WY + 6); x.quadraticCurveTo(uz * 0.6, SY + 10 * s, 0, SY + 18 * s); x.closePath(); x.fill();
            x.strokeStyle = 'rgba(224,150,80,.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, ufer(0)); for (i = 1; i <= 20; i++) x.lineTo(uz * i / 20, ufer(uz * i / 20)); x.stroke();
            for (var j = 0; j < 4; j++) for (var kx = s * (2 + r() * 4); kx < ue - 4 * s; kx += s * (3.3 + r() * 1.8)) {
                var ks = s * (0.85 + j * 0.1), ky = ufer(kx) + (2 + j * 3.4) * s;
                x.fillStyle = '#080b18'; x.fillRect(kx - ks, ky - 6 * ks, 2.2 * ks, 6 * ks); x.beginPath(); x.arc(kx + 0.1 * ks, ky - 7 * ks, 1.1 * ks, 0, 7); x.fill();
                x.fillStyle = 'rgba(255,180,100,.55)'; x.fillRect(kx - ks, ky - 6 * ks, 0.5 * ks, 5 * ks); x.fillRect(kx - 0.9 * ks, ky - 8 * ks, 0.6 * ks, 0.8 * ks);
                if (r() < 0.55) { x.strokeStyle = '#1a1c2c'; x.lineWidth = Math.max(0.8, 0.5 * ks); x.beginPath(); x.moveTo(kx + 1.2 * ks, ky - 3 * ks); x.lineTo(kx + 2.2 * ks, ky - 15 * ks); x.stroke();
                    x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(kx + 1.9 * ks, ky - 16.2 * ks, 0.7 * ks, 1.5 * ks); }
                if (r() < 0.07) { x.strokeStyle = '#1a1c2c'; x.lineWidth = Math.max(0.8, 0.5 * ks); x.beginPath(); x.moveTo(kx + 1.2 * ks, ky); x.lineTo(kx + 1.2 * ks, ky - 22 * ks); x.stroke();
                    x.fillStyle = r() < 0.5 ? '#b8352a' : '#d4ad66'; x.fillRect(kx + 1.2 * ks, ky - 22 * ks, 6 * ks, 4 * ks); x.fillStyle = 'rgba(255,220,160,.5)'; x.fillRect(kx + 1.2 * ks, ky - 22 * ks, 6 * ks, 0.6 * ks); }
                if (r() < 0.05) { var tg = x.createRadialGradient(kx, ky - 12 * ks, 0, kx, ky - 12 * ks, 9 * ks); tg.addColorStop(0, 'rgba(255,170,80,.5)'); tg.addColorStop(1, 'rgba(255,170,80,0)');
                    x.fillStyle = tg; x.fillRect(kx - 9 * ks, ky - 21 * ks, 18 * ks, 18 * ks); x.fillStyle = '#ffd28a'; x.fillRect(kx - 0.6 * ks, ky - 13 * ks, 1.2 * ks, 1.6 * ks); }
            }
            // 14 Vordergrund: Felsen mit dem Feldherrn zu Pferd, Schwert erhoben, Blick zur Burg
            var hx = held.x, hy = held.y, hh = held.h;
            function q(v) { return v * hh; }
            var fels = [[0, hy - q(14)], [hx - q(40), hy - q(6)], [hx - q(10), hy + q(1)], [hx + q(30), hy + q(2)], [hx + q(52), hy + q(12)], [hx + q(62), hy + q(30)], [hx + q(80), H]];
            x.fillStyle = '#04060d'; x.beginPath(); x.moveTo(0, H); fels.forEach(function (f) { x.lineTo(f[0], f[1]); }); x.closePath(); x.fill();
            x.strokeStyle = 'rgba(236,156,80,.6)'; x.lineWidth = 1.5; x.beginPath(); fels.slice(0, 5).forEach(function (f, k) { x[k ? 'lineTo' : 'moveTo'](f[0], f[1] + 0.5); }); x.stroke();
            function reiter(f) {
                x.fillStyle = f; x.strokeStyle = f; x.lineCap = 'round'; x.lineJoin = 'round';
                x.beginPath(); x.ellipse(0, q(-48), q(28), q(14), -0.06, 0, Math.PI * 2); x.fill();
                x.beginPath(); x.moveTo(q(12), q(-58)); x.lineTo(q(28), q(-82)); x.lineTo(q(38), q(-78)); x.lineTo(q(32), q(-46)); x.closePath(); x.fill();
                x.beginPath(); x.moveTo(q(30), q(-80)); x.lineTo(q(34), q(-88)); x.lineTo(q(37), q(-84)); x.lineTo(q(50), q(-74)); x.lineTo(q(51), q(-70)); x.lineTo(q(44), q(-67)); x.lineTo(q(34), q(-70)); x.closePath(); x.fill();
                x.lineWidth = q(6); x.beginPath();
                x.moveTo(q(-18), q(-44)); x.lineTo(q(-23), q(-22)); x.lineTo(q(-20), 0); x.moveTo(q(-10), q(-42)); x.lineTo(q(-7), q(-21)); x.lineTo(q(-11), 0);
                x.moveTo(q(14), q(-42)); x.lineTo(q(17), q(-21)); x.lineTo(q(15), 0); x.moveTo(q(20), q(-44)); x.lineTo(q(31), q(-32)); x.lineTo(q(27), q(-23)); x.stroke();
                x.lineWidth = q(4); x.beginPath(); x.moveTo(q(-25), q(-52)); x.quadraticCurveTo(q(-40), q(-46), q(-36), q(-22)); x.stroke();
                x.beginPath(); x.moveTo(q(-6), q(-58)); x.lineTo(q(6), q(-58)); x.lineTo(q(6), q(-84)); x.lineTo(q(-4), q(-84)); x.closePath(); x.fill();
                x.beginPath(); x.moveTo(q(2), q(-58)); x.lineTo(q(8), q(-45)); x.lineTo(q(5), q(-36)); x.stroke();
                x.beginPath(); x.arc(q(1), q(-90), q(5.2), 0, Math.PI * 2); x.fill();
                x.lineWidth = q(2); x.beginPath(); x.moveTo(q(-3), q(-94)); x.quadraticCurveTo(q(1), q(-102), q(7), q(-95)); x.stroke();
                x.lineWidth = q(3.4); x.beginPath(); x.moveTo(q(4), q(-82)); x.lineTo(q(12), q(-94)); x.lineTo(q(15), q(-106)); x.stroke();
            }
            x.save(); x.translate(hx - 1.6, hy - 1); reiter('rgba(240,160,80,.8)'); x.translate(1.6, 1); reiter('#060812');
            x.shadowColor = 'rgba(255,200,120,.9)'; x.shadowBlur = 8 * D; x.strokeStyle = '#ffe2a8'; x.lineWidth = Math.max(1.2, q(1.8)); x.beginPath(); x.moveTo(q(15), q(-106)); x.lineTo(q(25), q(-142)); x.stroke();
            x.shadowBlur = 0; x.strokeStyle = '#060812'; x.lineWidth = q(1.6); x.beginPath(); x.moveTo(q(10), q(-104)); x.lineTo(q(20), q(-108)); x.stroke();
            x.restore();
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
            for (i = 0; i < 60; i++) funken.push(i % 2 ? { x: feuer[0] + (r() - 0.5) * 16 * U, y: feuer[1], sp: 10 + r() * 16, ph: r() * 6.28, s: 1 + r(), hoch: 50 * U + r() * H * 0.2 } : { x: CX + (r() - 0.5) * 130 * U, y: WY - r() * 40 * U, sp: 6 + r() * 12, ph: r() * 6.28, s: 1 + r(), hoch: 60 * U + r() * H * 0.25 });
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
            // Feuer auf dem Turm
            var fx = feuer[0], fy = feuer[1], fg2 = g.createRadialGradient(fx, fy, 0, fx, fy, 24 * U);
            fg2.addColorStop(0, 'rgba(255,150,60,' + (0.4 + 0.08 * Math.sin(t * 6)).toFixed(3) + ')'); fg2.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = fg2; g.fillRect(fx - 24 * U, fy - 24 * U, 48 * U, 48 * U);
            for (i = 0; i < 5; i++) { var fh2 = (7 + 4 * Math.sin(t * 7 + i * 1.9)) * U, bx2 = fx + (i - 2) * 2.2 * U; g.fillStyle = i % 2 ? 'rgba(255,120,40,.85)' : 'rgba(255,200,90,.9)';
                g.beginPath(); g.moveTo(bx2 - 2.2 * U, fy); g.quadraticCurveTo(bx2 - U, fy - fh2 * 0.6, bx2 + Math.sin(t * 5 + i) * 1.5 * U, fy - fh2); g.quadraticCurveTo(bx2 + U, fy - fh2 * 0.5, bx2 + 2.2 * U, fy); g.closePath(); g.fill(); }
            // Köpfe der Feuerbälle glühen
            kugeln.forEach(function (k, n) { var rr = 16 * k[5] * (1 + 0.15 * Math.sin(t * 9 + n * 2)), kg = g.createRadialGradient(k[0], k[1], 0, k[0], k[1], rr);
                kg.addColorStop(0, '#fff6d0'); kg.addColorStop(0.25, 'rgba(255,190,90,.95)'); kg.addColorStop(0.6, 'rgba(255,110,40,.45)'); kg.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = kg; g.fillRect(k[0] - rr, k[1] - rr, rr * 2, rr * 2); });
            // Umhang des Feldherrn weht
            var c = held, w1 = Math.sin(t * 2.2) * 3, w2 = Math.sin(t * 2.2 + 1.2) * 5, kh = c.h, ug = g.createLinearGradient(c.x - 50 * kh, 0, c.x, 0);
            ug.addColorStop(0, '#5a1410'); ug.addColorStop(1, '#c8402e'); g.fillStyle = ug; g.strokeStyle = 'rgba(212,173,102,.9)'; g.lineWidth = Math.max(1, kh);
            g.beginPath(); g.moveTo(c.x - 4 * kh, c.y - 84 * kh); g.quadraticCurveTo(c.x - 26 * kh, c.y + (-86 + w1) * kh, c.x - 50 * kh, c.y + (-66 + w2) * kh);
            g.quadraticCurveTo(c.x - 30 * kh, c.y + (-58 + w1) * kh, c.x - 6 * kh, c.y - 60 * kh); g.lineTo(c.x + 4 * kh, c.y - 82 * kh); g.closePath(); g.fill(); g.stroke();
            // Vögel ziehen vorbei
            g.strokeStyle = '#0d1124'; g.lineWidth = 1.3;
            for (i = 0; i < voegel.length; i++) { nb = voegel[i]; var vx = ((nb.x * W + t * nb.v) % (W + 60)) - 30, vy = nb.y + Math.sin(t * 0.6 + nb.ph) * 4, fl = Math.sin(t * 5 + nb.ph) * nb.s * 0.5;
                g.beginPath(); g.moveTo(vx - nb.s, vy - fl); g.quadraticCurveTo(vx - nb.s / 2, vy - 1.5, vx, vy); g.quadraticCurveTo(vx + nb.s / 2, vy - 1.5, vx + nb.s, vy - fl); g.stroke(); }
        }
        function bild30(now) { if (stopped) return; zeichne(now, false); requestAnimationFrame(bild30); }
        function stop() { stopped = true; window.removeEventListener('resize', neu); }
        neu();
        window.addEventListener('resize', neu);
        if (!reduce) requestAnimationFrame(bild30);
        if (TITELBILD) { var img = new Image(); img.alt = ''; img.className = cv.className + ' titel-bild'; img.setAttribute('aria-hidden', 'true');
            img.onload = function () { if (stopped) return; cv.parentNode.insertBefore(img, cv.nextSibling); requestAnimationFrame(function () { img.classList.add('da'); }); setTimeout(stop, 900); };   // (danach ruht das Canvas)
            img.src = W > H * 1.1 ? TITELBILD.quer : TITELBILD.hoch; }
        return { stop: stop };
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
