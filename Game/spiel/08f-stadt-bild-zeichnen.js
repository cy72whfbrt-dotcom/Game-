// Teil 08f-stadt-bild-zeichnen.js: Stadtansicht: Bild zeichnen, Schilder (Name/Stufe, Hammer, Pfeil); Stufenaufstieg-Fenster
// ---- ein Schild wie in den großen Aufbau-Spielen: dunkel mit Goldrand, „Name“ und darunter „Stufe N“ ----
let cityNamen = [];                                                          // die Schilder dieses Bilds (Bildschirm-Punkte)
function cityStand(c, id) {                                                  // was das Schild eines Gebäudes zeigt
    const bid = cityBauId(id), lvl = bid === 'keep' ? c.levels.keep || 1 : c.levels[bid] || 0, bau = cityBuildOf(c, bid);
    const ab = !lvl && AUF ? AUF.BAU_AB_BURG[bid] || 0 : 0, zu = !!AUF && ab > AUF.burgStufe('player');
    let zeile = bau ? fmtClock((bau.endsAt - Date.now()) / 1000) : zu ? 'ab Burg ' + ab : lvl ? 'Stufe ' + lvl : 'Bauen';
    if (bid === 'hospital' && lvl && !bau && c.wounded) zeile += ' · ' + fmtCompact(c.wounded) + ' verw.';
    const pfeil = !bau && !zu && !cityBlocker(bid) && (AUF ? AUF.kannZahlen('player', AUF.stadtKosten(bid, lvl)) : coins >= cityCost(bid, lvl));   // aufwertbar: grüner Pfeil
    return { name: bid === 'keep' ? 'Burg' : cityDef(bid).name, lvl, bau, zeile, zu, pfeil };
}
const CITY_HAMMER = new Path2D('M-7-9h11l2 2v4h-15z M-2-3h3v13h-3z');           // Hammer (Kopf + Stiel) um den Mittelpunkt
function citySchildBreite(g, s) {                                            // → [Breite, Breite der unteren Zeile]
    g.font = '700 13px Cinzel, Georgia, serif'; const wn = g.measureText(s.name).width;
    g.font = '600 11px Inter, system-ui, sans-serif'; const wz = g.measureText(s.zeile).width + (s.zu || s.bau ? 15 : 0);
    return [Math.ceil(Math.max(wn, wz) + 22 + (s.pfeil ? 18 : 0)), wz];
}
function citySchild(g, s, x, y, an, now) {                                   // → {x, y, w, h}; x/y = Mitte des Schilds
    const [w, wz] = citySchildBreite(g, s), h = 36, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    const rund = (a, b, ww, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(a, b, ww, hh, r) : g.rect(a, b, ww, hh); };
    g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    const bg = g.createLinearGradient(0, y0, 0, y0 + h); bg.addColorStop(0, 'rgba(44,34,24,.94)'); bg.addColorStop(1, 'rgba(16,12,8,.94)');
    g.fillStyle = bg; rund(x0, y0, w, h, 6); g.fill(); g.restore();
    g.strokeStyle = an ? '#ffe7a6' : '#c9a24a'; g.lineWidth = an ? 2 : 1.5; rund(x0 + .5, y0 + .5, w - 1, h - 1, 6); g.stroke();
    g.strokeStyle = 'rgba(255,220,150,.18)'; g.lineWidth = 1; rund(x0 + 3, y0 + 3, w - 6, h - 6, 4); g.stroke();
    const mx = x0 + (w - (s.pfeil ? 18 : 0)) / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 13px Cinzel, Georgia, serif'; g.fillStyle = s.zu ? '#cfc3a8' : '#f6ead0'; g.fillText(s.name, mx, y0 + 12.5);
    g.font = '600 11px Inter, system-ui, sans-serif'; g.fillStyle = s.bau ? '#ffd98a' : s.zu ? '#b4a88f' : !s.lvl ? '#9fe08a' : '#e4d6b4';
    const tx = mx + (s.zu || s.bau ? 7.5 : 0); g.fillText(s.zeile, tx, y0 + 26);
    if (s.zu || s.bau) drawGlyph(g, s.zu ? 'lock' : 'hourglass', tx - wz / 2 + 1, y0 + 26, 12, s.zu ? '#b4a88f' : '#ffd98a');
    if (s.pfeil) { const ax = x0 + w - 15, ay = y0 + h / 2;                   // grüner Pfeil nach oben: kann jetzt aufgewertet werden
        g.beginPath(); g.moveTo(ax, ay - 10); g.lineTo(ax + 8, ay - 1); g.lineTo(ax + 3.5, ay - 1); g.lineTo(ax + 3.5, ay + 9); g.lineTo(ax - 3.5, ay + 9); g.lineTo(ax - 3.5, ay - 1); g.lineTo(ax - 8, ay - 1); g.closePath();
        const gg = g.createLinearGradient(0, ay - 10, 0, ay + 9); gg.addColorStop(0, '#9bf06a'); gg.addColorStop(1, '#2f9a2a');
        g.fillStyle = gg; g.fill(); g.strokeStyle = '#163d12'; g.lineWidth = 1.2; g.stroke(); }
    if (s.bau) { const hx = x, hy = y0 - 22 - Math.abs(Math.sin(now / 260)) * 3;  // wird gebaut: Hammer im Goldkreis, Spitze zeigt aufs Schild
        g.beginPath(); g.moveTo(hx - 6, hy + 12); g.lineTo(hx, hy + 20); g.lineTo(hx + 6, hy + 12); g.closePath(); g.fillStyle = '#c9a24a'; g.fill();
        const kg = g.createLinearGradient(0, hy - 15, 0, hy + 15); kg.addColorStop(0, '#ffe08a'); kg.addColorStop(1, '#a87418');
        g.fillStyle = kg; g.beginPath(); g.arc(hx, hy, 15, 0, 7); g.fill(); g.strokeStyle = '#fff1c4'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#2a2016'; g.beginPath(); g.arc(hx, hy, 11.5, 0, 7); g.fill();
        g.save(); g.translate(hx, hy); g.rotate(-Math.PI / 5 + Math.sin(now / 260) * .25); g.scale(.85, .85); g.fillStyle = '#e9e4da'; g.fill(CITY_HAMMER); g.restore(); }
    return { x: x0, y: y0 - (s.bau ? 38 : 0), w, h: h + (s.bau ? 38 : 0) };
}
// ---- ein Bild ----
function cityFrame(now) {
    if (cityView.hidden) return;
    // Handy schonen: steht alles still, reichen 4 Bilder pro Sekunde (die Uhr auf den Schildern); läuft ein Bau, hüpft der Hammer
    const c = loadCity(), bewegt = !!(cityDrag || cityGesture || cloudAnim || !cityCam || cityCam.anim || cityCam.tx !== undefined);
    if (!bewegt && now - (cityFrame.drawn || 0) < (c.builds.length ? 30 : 250)) { cityRaf = requestAnimationFrame(cityFrame); return; }
    cityFrame.drawn = now;
    const dpr2 = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    if (cityCanvas.width !== Math.round(W * dpr2) || cityCanvas.height !== Math.round(H * dpr2)) { cityCanvas.width = Math.round(W * dpr2); cityCanvas.height = Math.round(H * dpr2); }
    if (!cityCam) { cityCam = { x: cityOrt('_keep').x, y: CITY_BILD_H / 2, z: cityStartZoom(W, H) };   // Start: die Burg in der Mitte
        if (cityPendingAnim) { cityCam.anim = { from: 1.18, t0: now, dur: 1100 }; cityPendingAnim = false; } }
    let animZ = 1;
    if (cityCam.anim) { const a = cityCam.anim, q = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - q, 3), to = a.to ?? 1;
        animZ = a.from + (to - a.from) * e; if (q >= 1 && to === 1) cityCam.anim = null; }
    if (cityCam.tx !== undefined && !cityDrag) { cityCam.x += (cityCam.tx - cityCam.x) * .16; cityCam.y += (cityCam.ty - cityCam.y) * .16; }
    const vor = [cityCam.x, cityCam.y]; cityClampCam(W, H);
    if (cityCam.tx !== undefined && (Math.hypot(cityCam.tx - cityCam.x, cityCam.ty - cityCam.y) < .3 || Math.hypot(vor[0] - cityCam.x, vor[1] - cityCam.y) > .01)) cityCam.tx = cityCam.ty = undefined;   // angekommen (oder am Bildrand: weiter geht es nicht)
    const g = cityCtx, Z = cityCam.z * animZ, ox = W / 2 - cityCam.x * Z, oy = H / 2 - cityCam.y * Z, im = cityBild();
    g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.imageSmoothingQuality = 'high';
    g.fillStyle = '#1d2716'; g.fillRect(0, 0, W, H);
    if (im) g.drawImage(im, ox, oy, CITY_BILD_W * Z, CITY_BILD_H * Z);
    cityHitRects = []; cityNamen = [];
    const schilder = [];
    for (const id of Object.keys(CITY_ORTE)) {
        const o = cityOrt(id), s = cityStand(c, id), sx = ox + o.x * Z, sy = oy + o.y * Z, rw = o.w * Z / 2, rh = o.h * Z / 2;
        if (!s.lvl && im) { const r = Math.max(rw, rh), vg = g.createRadialGradient(sx, sy, r * .2, sx, sy, r);   // noch nicht gebaut: dunkel verschleiert
            vg.addColorStop(0, 'rgba(24,26,30,.5)'); vg.addColorStop(.7, 'rgba(24,26,30,.38)'); vg.addColorStop(1, 'rgba(24,26,30,0)');
            g.save(); g.translate(sx, sy); g.scale(rw / r, rh / r); g.translate(-sx, -sy); g.fillStyle = vg; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); g.restore(); }
        cityHitRects.push({ id, x: sx - rw, y: sy - rh, w: rw * 2, h: rh * 2, cx: sx, cy: sy });
        schilder.push({ id, s, x: sx, y: oy + o.sy * Z });
    }
    const leiste = document.getElementById('cornerButtons'), lr = leiste && leiste.getBoundingClientRect();   // die untere Leiste: kein Schild darunter (Desktop: „Steinbruch Bauen“)
    if (lr && lr.height) { for (const p of schilder) p.w = citySchildBreite(cityCtx, p.s)[0];
        const trifft = (p, q) => Math.abs(p.x - q.x) < (p.w + q.w) / 2 && Math.abs(p.y - q.y) < 40;
        for (const p of schilder) if (p.y + 18 > lr.top - 6 && p.x + p.w / 2 > lr.left && p.x - p.w / 2 < lr.right) {
            p.y = lr.top - 6 - 18; while (schilder.some(q => q !== p && trifft(p, q))) p.y -= 40; } }   // (nicht auf ein anderes Schild)
    if (im) for (const p of schilder) {                                      // die Schilder zuletzt, über allem
        const an = cityOpenId === p.id || cityRingId === p.id, q = citySchild(g, p.s, p.x, p.y, an, now);
        if (q.x + q.w > 0 && q.x < W && q.y + q.h > 0 && q.y < H) cityNamen.push({ id: p.id, ...q });
        cityHitRects.push({ id: p.id, ...q, cx: p.x, cy: p.y });
        if (p.id === cityRingId) { const el = document.getElementById('cityRing'), nav = document.getElementById('cornerButtons'), unten = (nav ? nav.getBoundingClientRect().top : H) - 8,
                oben = (document.querySelector('.city-head') || { getBoundingClientRect: () => ({ bottom: 90 }) }).getBoundingClientRect().bottom + 8;
            let rx = Math.max(110, Math.min(W - 110, p.x)), ry = p.y;                            // die runden Knöpfe folgen dem Schild – ganz im Bild zwischen Kopf und Leiste:
            if (ry + 62 + 29 + 24 > unten) ry = Math.min(p.y - 50, unten - 62 - 29 - 24);       // reicht der Bogen unter die Leiste, steht er über dem Schild
            ry = Math.max(oben + 29 - 62 + 40, ry);
            const tf = 'translate(' + Math.round(rx) + 'px,' + Math.round(ry) + 'px)';
            if (el.style.transform !== tf) el.style.transform = tf; if (el.style.visibility) el.style.visibility = ''; }
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
    beuteLis([{ a: 'coins', n: s.coins }, { a: 'tr', n: s.troops }, { a: 'gems', n: s.gems }, { a: 'punkte', n: s.points }], document.getElementById('levelUpRewards'));   // Kacheln wie RoK (05e)
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
