// ===== Teil 07-schlachten.js: Schlachten auf der Karte (auch Zuschauer-Anzeige), Kampf-Effekte, Kriegsherr (Wanderboss) =====
// ===== BATTLES ON THE MAP =====
// When a fight the player is part of resolves, it plays out at the base itself: the arriving column
// forms up, the garrison steps out, they clash, soldiers fall in proportion to the real losses,
// troop counts tick down with floating losses, then the result ribbon (spawnBattleFx) appears.
var mapBattles = [];
const MB_MS = 4200, MB_SLOW = 0.6, MB_HOLD = 2700; // ≈ 7 s on screen · a live fight keeps fighting at MB_HOLD until it is decided
function mbT(b, now) { return b.t0 + (now - b.anchor) * b.slow; }                  // choreography clock (slowed ms)
function mbArmyPlan(b, side, atk, t) {               // how many soldiers a side shows and when the fallen go down
    const share = b.my / Math.max(1, b.my + b.en), n = Math.max(4, Math.min(24, Math.round(30 * (atk ? share : 1 - share))));
    const loss = Math.min(1, atk ? b.myLoss / Math.max(1, b.my) : b.enLoss / Math.max(1, b.en)), seed = b.seed;
    while (side.units.length < n) { const i = side.units.length;                            // reinforcements file in at the back
        side.units.push({ f: i % side.files, r: Math.floor(i / side.files), ph: seed() * 6.28, jx: seed() - .5, jy: seed() - .5, die: Infinity, from: side.units.length && t > 50 ? t : 0 }); }
    const units = side.units, dead = units.filter(u => u.die <= t).length, want = Math.round(units.length * loss);
    const alive = units.map((u, i) => ({ u, k: u.r + seed() * 1.6 })).filter(x => x.u.die > t).sort((p, q) => p.k - q.k);
    for (const x of alive) x.u.die = Infinity;
    const from = Math.max(t + 60, 1000), to = Math.max(from + 300, 3000);
    for (let j = 0; j < Math.min(alive.length, want - dead); j++) alive[j].u.die = from + (j / Math.max(1, want - dead)) * (to - from) + seed() * 120;
}
function mbReplan(b, o, now) {                       // new numbers (reinforcements, or the real result): re-plan who falls from here on
    Object.assign(b, { my: o.my, myLoss: o.myLoss, en: o.en, enLoss: o.enLoss, won: o.won });
    const t = mbT(b, now); mbArmyPlan(b, b.A, true, t); mbArmyPlan(b, b.D, false, t);
}
function spawnMapBattle(o) {
    sfx('clash');
    const src = islandById[o.sourceId], tgt = islandById[o.targetId]; if (!src || !tgt) { o.onEnd && o.onEnd(); return; }
    o.atkWho = o.atk === 'mine' ? 'player' : o.atk === 'bot' ? islandOwnerOf(src.id) : null;   // whose arms fly on each side (before the base changes hands)
    o.defWho = o.def === 'mine' ? 'player' : o.def === 'bot' ? islandOwnerOf(tgt.id) : null;
    const path = marchPath(src, tgt), from = path[path.length - 2];
    const dx = tgt.x - from.x, dy = tgt.y - from.y, l = Math.hypot(dx, dy) || 1, now = performance.now();
    const share = o.my / Math.max(1, o.my + o.en), seed = mulberry32(Math.round(o.my % 9973) + Math.round(o.en % 9967) + o.targetId);
    const nA = Math.max(4, Math.min(24, Math.round(30 * share))), nD = Math.max(4, Math.min(24, Math.round(30 * (1 - share))));
    const b = Object.assign({}, o, { x: tgt.x, y: tgt.y, ux: dx / l, uy: dy / l, born: now, t0: 0, anchor: now, seed, final: !o.live,
        slow: o.live ? MB_HOLD / Math.max(2500, o.fightMs) : MB_SLOW,                     // a live fight fills its whole duration, then waits for the result
        A: { units: [], files: Math.min(6, nA) }, D: { units: [], files: Math.min(6, Math.ceil(nD / 2)) }, done: false });
    mbArmyPlan(b, b.A, true, 0); mbArmyPlan(b, b.D, false, 0);
    mapBattles.push(b);
    if (mapBattles.length > 10) { const i = Math.max(0, mapBattles.findIndex(x => x.final)), old = mapBattles.splice(i, 1)[0]; if (!old.done && old.onEnd) old.onEnd(); }
    requestRender();
    return b;
}
function finishMapBattle(attack, o) {               // the fight is decided: the live battle (if any) plays out the real result, else a fresh one
    const b = attack.id && mapBattles.find(x => x.attackId === attack.id && !x.final);
    if (b) { const now = performance.now(), t = Math.min(MB_HOLD, mbT(b, now));
        b.t0 = t; b.anchor = now; b.slow = MB_SLOW; b.final = true; b.onEnd = o.onEnd; mbReplan(b, o, now); return; }
    if (Date.now() - attack.resolveAt < 8000) spawnMapBattle(o); else o.onEnd();
}
// Läuft auf dem Ziel schon ein Kampf, in den die ankommende Welle a mit hineingeht? Dieselbe Seite: derselbe Angreifer oder
// ein Bündnis-Mitglied (dann EIN gemeinsamer Kampf, wie eine Rally). (Vorschau: deine eigenen Wellen wie bisher.)
function kampfDazu(a, now) {
    return pendingAttacks.find(p => p !== a && p.fightEndsAt && p.targetId === a.targetId && (p.attackerBotId && a.attackerBotId
        ? p.attackerBotId === a.attackerBotId || bundFreund(p.attackerBotId, a.attackerBotId)
        : !p.attackerBotId && !a.attackerBotId && !p.rally && !a.rally));
}
function kampfKey(a) { return a.id || (a.startedAt + '-' + a.sourceId + '-' + a.targetId); }   // dieselbe Kennung, die der Weltrechner dem Kampf gibt
// (Zuschauer) Der Weltrechner entscheidet die Kämpfe – das Handy zeigt sie trotzdem als Schlacht auf der Karte (wie beim
// Weltrechner selbst): sobald der Marsch ankommt, mit den Zahlen, die es sieht; ist der Kampf entschieden, spielt sie zu Ende.
const zuschauerKampf = new Map();                    // Kampf-Kennung → { ende }
setInterval(() => {
    if (!window.WELT || SYSTEM || rechnet() || document.hidden) return;
    const now = Date.now();
    for (const a of pendingAttacks) {
        if (a.resolveAt > now) continue;
        if (a.wartet) continue;                       // (der Weltrechner lässt sie warten: dort läuft noch ein anderer Kampf)
        { const wer = a.attackerBotId || 'player', ow = islandOwnerOf(a.targetId);   // die Basis gehört schon ihm (eine frühere Welle hat sie genommen) oder seinem Bündnis:
          if (ow && (ow === wer || bundFreund(wer, ow))) continue; }                    // kein Kampf – die Truppen ziehen ein bzw. gehen heim (wie beim Weltrechner)
        const k = kampfKey(a), z = zuschauerKampf.get(k);
        if (z) { if (!a.fightEndsAt) a.fightEndsAt = z.ende;                      // (neue Welt-Daten: Kampf läuft noch – nicht als „0:00“ zeigen)
            if (!z.mit && a.rawTroops > 0 && a.rawTroops !== z.n) { z.n = a.rawTroops;   // die Zahlen haben sich geändert (eine Welle kam dazu): die Schlacht zieht nach
                const bt = mapBattles.find(x => x.attackId === k && !x.final), est = bt && fightEstimate(a); if (est) mbReplan(bt, est, performance.now()); }
            continue; }
        const mine = !a.attackerBotId, vsMe = a.attackerBotId && islandOwnerOf(a.targetId) === 'player', tgt = islandById[a.targetId];
        // Angriff auf dich: seine Stärke kommt mit dem Kampfbeginn vom Weltrechner (vorher nur mit Wachturm) – kurz darauf warten,
        // dann die Schlacht mit den echten Zahlen (nie mit erfundenen oder „?“ – Alexander 4.10.)
        if (vsMe && !(a.rawTroops > 0) && now - a.resolveAt < 15000) continue;
        if (mine && now - a.resolveAt < 1200) continue;   // (eigene Welle: erst den nächsten Welt-Stand abwarten – gehört die Basis inzwischen dir, zieht sie nur ein)
        // Eine weitere Welle derselben Seite (derselbe Angreifer oder ein Bündnis-Mitglied) auf dasselbe Ziel: der Weltrechner
        // wirft sie in den laufenden Kampf – also keine zweite Schlacht, sondern EINE mit den zusammengelegten Truppen.
        const seite = x => x.attackerBotId || 'player', zk = p => zuschauerKampf.get(kampfKey(p));
        // (Ein Kampf läuft, solange sein Angriff noch in der Welt steht – der Weltrechner verlängert ihn, wenn Wellen dazukommen;
        //  die eigene Schätzung „ende“ des Handys zählt dafür nicht, sonst malte es eine zweite Schlacht – Alexander 4.10.)
        const mit = pendingAttacks.find(p => p !== a && p.targetId === a.targetId && (seite(p) === seite(a) || bundFreund(seite(p), seite(a))) && zk(p) && !zk(p).mit);
        if (!mit && pendingAttacks.some(p => p !== a && p.targetId === a.targetId && zk(p))) continue;   // ein fremder Kampf läuft dort: diese Welle wartet (der Weltrechner auch)
        if (mit) {
            const km = kampfKey(mit), zm = zuschauerKampf.get(km);
            zuschauerKampf.set(k, { ende: zm.ende, mit: km }); if (!a.fightEndsAt) a.fightEndsAt = zm.ende;
            zm.dazu = (zm.dazu || 0) + a.rawTroops;
            const bt = mapBattles.find(x => x.attackId === km && !x.final), sicht = mine || (vsMe && a.rawTroops > 0);
            const est = tgt && (bt || sicht) ? fightEstimate({ ...mit, rawTroops: mit.rawTroops + zm.dazu, attackBonus: undefined }) : null;
            if (bt) { if (est) mbReplan(bt, est, performance.now()); }
            else if (est && now - a.resolveAt < 15000) spawnMapBattle({ sourceId: a.sourceId, targetId: a.targetId, attackId: km, live: true, fightMs: Math.max(1500, zm.ende - now), hero: a.hero || null,   // (du bist zu einem Kampf deines Bündnisses dazugekommen)
                atk: mine ? 'mine' : 'bot', def: mine ? (bossAt(tgt.id) ? 'boss' : islandOwnerOf(tgt.id) ? 'bot' : 'neutral') : 'mine', ...est });
            continue;
        }
        const est = (mine || (vsMe && a.rawTroops > 0)) && tgt ? fightEstimate(a) : null;
        const ende = a.fightEndsAt && a.fightEndsAt > now ? a.fightEndsAt : now + (est ? fightDurationMs(est) : 4000);
        zuschauerKampf.set(k, { ende, n: a.rawTroops }); if (!a.fightEndsAt) a.fightEndsAt = ende;
        if (est && now - a.resolveAt < 20000) spawnMapBattle({ sourceId: a.sourceId, targetId: a.targetId, attackId: k, live: true, fightMs: Math.max(1500, ende - now), hero: a.hero || null,
            atk: mine ? 'mine' : 'bot', def: mine ? (bossAt(tgt.id) ? 'boss' : islandOwnerOf(tgt.id) ? 'bot' : 'neutral') : 'mine', ...est });
    }
    for (const k of zuschauerKampf.keys()) if (!pendingAttacks.some(a => kampfKey(a) === k)) zuschauerKampf.delete(k);
}, 250);
function drawMapBattles(now) {                      // screen space
    if (!mapBattles.length) return;
    liveAnimation = true;
    const z = mapState.zoom, k = Math.max(1.1, Math.min(2.6, z / 0.015)), near = z >= 0.006;
    for (const b of mapBattles.slice()) {
        const rt = now - b.born, t = b.final ? mbT(b, now) : Math.min(MB_HOLD, mbT(b, now));   // choreography runs slowed down, motion cycles in real time
        if (t > MB_MS) { b.done = true; mapBattles.splice(mapBattles.indexOf(b), 1); if (b.onEnd) b.onEnd(); continue; }
        if (!b.final && b.attackId && !pendingAttacks.some(a => kampfKey(a) === b.attackId)) {
            if (window.WELT && !rechnet()) { const n = performance.now(); b.t0 = Math.min(MB_HOLD, mbT(b, n)); b.anchor = n; b.slow = MB_SLOW; b.final = true; }   // Zuschauer: der Weltrechner hat entschieden → zu Ende spielen
            else { mapBattles.splice(mapBattles.indexOf(b), 1); continue; }   // its attack was resolved without a finish (base changed hands mid-fight)
        }
        const tx = b.x * z + mapState.offsetX, ty = b.y * z + mapState.offsetY;
        if (tx < -120 || ty < -120 || tx > viewW + 120 || ty > viewH + 120) continue;
        if (!near) {                                 // far out: a pulsing crossed-swords marker at the base
            const pulse = 1 + Math.sin(rt / 140) * .12;
            ctx.beginPath(); ctx.arc(tx, ty - 14, 11 * pulse, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,10,8,.85)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ff8d7e'; ctx.stroke();
            drawGlyph(ctx, 'attack', tx, ty - 14, 13, '#ffd2c8'); continue;
        }
        const ux = b.ux, uy = b.uy, vx = -uy, vy = ux, face = ux >= 0 ? 1 : -1;
        const adv = Math.min(1, t / 800), advE = adv * adv, fight = t > 800 && t < 3200, after = t > 3200;
        const gap = 8.5 * k, fileGap = 8 * k, s = 14 * k;
        const dFront = 22 * k, aFront = dFront + 13 * k + (1 - advE) * 46 * k;
        const ak = b.atk === 'mine' ? 'mine' : b.atk === 'boss' ? 'boss' : 'bot', cA = BS_COL[ak], cD = BS_COL[b.def] || BS_COL.bot, tA = BS_TROOP[ak], tD = BS_TROOP[b.def] || BS_TROOP.bot;
        const aWon = b.won, drawn = [];
        const place = (side, u) => {
            const atk = side === b.A, files = side.files, off = (u.f - (files - 1) / 2) * fileGap + u.jx * 2 * k;
            let d = atk ? aFront + u.r * gap : dFront - u.r * gap * .8;
            const fall = Math.max(0, Math.min(1, (t - u.die) / 240));
            let alpha = 1;
            if (!atk && t < 700) { d *= t / 700; alpha = t / 700; }                            // garrison steps out of the base
            if (u.from && t < u.from + 600) { const q = Math.max(0, (t - u.from) / 600); d += (1 - q) * (atk ? 50 : -20) * k; alpha = Math.min(alpha, q); }   // reinforcements arrive
            if (t > 800 && t < 1100) { const kq = Math.sin((t - 800) / 300 * Math.PI) * k / (1 + u.r * .6); d += atk ? kq * 3 : -kq * 7; }   // the impact shoves both lines
            if (after && fall === 0) {
                const q = Math.min(1, (t - 3200) / 900);
                if (atk) { if (aWon) { d -= q * aFront; alpha = 1 - q; } else { d += q * 60 * k; alpha = 1 - q; } }   // storm the base / fall back
                else { d -= q * dFront; alpha = 1 - q; }                                            // survivors return inside
            }
            if (fall > 0) alpha = Math.max(0, 1 - Math.max(0, t - u.die - 900) / 600);          // the fallen fade after a moment
            const x = tx - ux * d + vx * off, y = ty - uy * d + vy * off + u.jy * 2 * k;
            const walk = atk && adv < 1 ? rt / 45 + u.ph : after && fall === 0 ? rt / 70 + u.ph : u.ph;   // sprint in the charge
            const thrust = fight && fall === 0 && u.r <= 1 ? Math.max(0, Math.sin(rt / 75 + u.ph)) : 0;
            const [col, rim] = atk ? tA : tD;
            if (fall > 0 && t - u.die < 700) falls.push([x, y, t - u.die]);
            drawn.push({ y, f: () => { if (alpha <= 0.01) return; ctx.save(); ctx.globalAlpha = alpha; bsSoldier(ctx, x, y, s, atk ? face : -face, col, rim, walk, thrust, fall); ctx.restore(); } });
        };
        const falls = [];
        for (const u of b.A.units) place(b.A, u);
        for (const u of b.D.units) place(b.D, u);
        // standard bearers behind each army, flags in the side's colour
        const bearer = (atk) => {
            const side = atk ? b.A : b.D, rows = Math.ceil(side.units.length / side.files);
            let d = atk ? aFront + (rows + .6) * gap : Math.max(4 * k, dFront - (rows + .4) * gap * .8);
            let alpha = 1; if (after) { const q = Math.min(1, (t - 3200) / 900); alpha = 1 - q; if (atk) d += (aWon ? -aFront * q : 60 * k * q); }
            if (!atk && t < 700) alpha = t / 700;
            const x = tx - ux * d, y = ty - uy * d, [col] = atk ? tA : tD, wave = Math.sin(rt / 160) * 2 * k;
            drawn.push({ y: y + .01, f: () => { ctx.save(); ctx.globalAlpha = alpha;
                bsSoldier(ctx, x, y, s, atk ? face : -face, col, (atk ? tA : tD)[1], atk && adv < 1 ? rt / 45 : after ? rt / 70 : 0, 0, 0);
                ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 1.4 * k; ctx.beginPath(); ctx.moveTo(x, y - s * .2); ctx.lineTo(x, y - s * 1.9); ctx.stroke();
                const fd = atk ? face : -face, top = y - s * 1.9, bw = 13 * k, bh = s * .62, rimC = (atk ? tA : tD)[1];
                ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.moveTo(x, top + 1 * k); ctx.lineTo(x + fd * bw, top + 1 * k); ctx.stroke();   // crossbar
                ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, top + 1 * k); ctx.lineTo(x + fd * bw, top + 1 * k + wave * .3);
                ctx.quadraticCurveTo(x + fd * (bw + wave * .4), top + bh * .5, x + fd * bw, top + bh + wave * .5); ctx.lineTo(x + fd * bw * .5, top + bh * .78 + wave * .4); ctx.lineTo(x, top + bh); ctx.closePath(); ctx.fill();
                ctx.lineWidth = .9 * k; ctx.strokeStyle = 'rgba(12,12,16,.8)'; ctx.stroke();
                ctx.strokeStyle = rimC; ctx.lineWidth = 1.1 * k; ctx.beginPath(); ctx.moveTo(x + fd * bw * .5, top + 3 * k); ctx.lineTo(x + fd * bw * .5, top + bh * .62); ctx.stroke();   // stripe
                ctx.fillStyle = '#e4c886'; ctx.beginPath(); ctx.arc(x, top - 1.5 * k, 1.8 * k, 0, Math.PI * 2); ctx.fill();   // gold finial
                const cw = atk ? b.atkWho : b.defWho; if (cw) drawCrest(ctx, x + fd * bw * .5, top + bh * .42, bh * .72, crestFor(cw));   // each side's coat of arms on its banner
                ctx.restore(); } });
        };
        bearer(true); bearer(false);
        const hdef = b.hero && heroById(b.hero); let heroPlate = null;
        if (hdef) {                                    // the hero leads from the front: a bigger figure in the hero's colour, a gold plume and a name plate
            let d = aFront - 4 * k; let alpha = 1;
            if (after) { const q = Math.min(1, (t - 3200) / 900); alpha = 1 - q; d += aWon ? -aFront * q : 60 * k * q; }
            const hx = tx - ux * d + vx * 0, hy = ty - uy * d;
            drawn.push({ y: hy + .02, f: () => { ctx.save(); ctx.globalAlpha = alpha;
                bsSoldier(ctx, hx, hy, s * 1.35, face, hdef.color, '#f0d69a', adv < 1 || after ? rt / 60 : 0, fight ? Math.max(0, Math.sin(rt / 90)) : 0, 0);
                ctx.fillStyle = '#e8c547'; ctx.beginPath(); ctx.ellipse(hx - face * 1 * k, hy - s * 1.52, 1.3 * k, 3 * k, -face * .4, 0, Math.PI * 2); ctx.fill();   // plume
                ctx.restore(); } });
            heroPlate = () => { ctx.save(); ctx.globalAlpha = alpha; ctx.font = '700 11px Inter, system-ui, sans-serif'; const tw = ctx.measureText(hdef.name).width + 12, py = hy + 12;   // on top of every figure
                rr(ctx, hx - tw / 2, py - 9, tw, 16, 8); ctx.fillStyle = 'rgba(14,12,10,.88)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = RARITY_DEFS[hdef.r].color; ctx.stroke();
                ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hdef.name, hx, py - .5); ctx.restore(); };
        }
        {                                             // the battlefield: the ground is trampled, the front glows
            const env = Math.min(1, t / 900) * (after ? Math.max(0, 1 - (t - 3200) / 900) : 1), ang = Math.atan2(vy, vx);
            const fxp = tx - ux * (dFront + 6.5 * k), fyp = ty - uy * (dFront + 6.5 * k);
            const gg = ctx.createRadialGradient(fxp, fyp + 3 * k, 0, fxp, fyp + 3 * k, 60 * k);
            gg.addColorStop(0, 'rgba(74,58,38,' + (.5 * env) + ')'); gg.addColorStop(.7, 'rgba(74,58,38,' + (.25 * env) + ')'); gg.addColorStop(1, 'rgba(74,58,38,0)');
            ctx.save(); ctx.translate(fxp, fyp + 3 * k); ctx.rotate(ang); ctx.scale(1, .42); ctx.translate(-fxp, -(fyp + 3 * k));
            ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(fxp, fyp + 3 * k, 60 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            if (fight) {                              // a hot line where the two fronts grind against each other
                const pl = .6 + .4 * Math.sin(rt / 90), gl = ctx.createRadialGradient(fxp, fyp - s * .4, 0, fxp, fyp - s * .4, 42 * k);
                gl.addColorStop(0, 'rgba(255,170,80,' + (.32 * pl) + ')'); gl.addColorStop(1, 'rgba(255,120,40,0)');
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(fxp, fyp - s * .4); ctx.rotate(ang); ctx.scale(1, .35); ctx.translate(-fxp, -(fyp - s * .4));
                ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(fxp, fyp - s * .4, 42 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
        }
        // dust kicked up behind the charging column
        if (adv < 1) { for (let i = 0; i < 4; i++) { const d = aFront + (b.A.files ? i * gap : 0), o = (i - 1.5) * fileGap;
            const x = tx - ux * (d + 6 * k) + vx * o, y = ty - uy * (d + 6 * k) + vy * o;
            ctx.fillStyle = 'rgba(190,175,140,' + (.18 * (1 - adv)) + ')'; ctx.beginPath(); ctx.ellipse(x, y + 2 * k, (8 + adv * 10) * k, (3 + adv * 3) * k, 0, 0, Math.PI * 2); ctx.fill(); } }
        drawn.sort((p, q) => p.y - q.y).forEach(d => d.f());
        if (heroPlate) heroPlate();
        for (const [fx, fy, dt] of falls) {           // hit flash, then a puff of dust where he went down
            if (dt < 140) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const q = dt / 140, R = (4 + 8 * q) * k, gh = ctx.createRadialGradient(fx, fy - s * .6, 0, fx, fy - s * .6, R);
                gh.addColorStop(0, 'rgba(255,240,210,' + (1 - q) + ')'); gh.addColorStop(1, 'rgba(255,160,90,0)'); ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(fx, fy - s * .6, R, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
            const q = dt / 700, R = (4 + 10 * q) * k; ctx.fillStyle = 'rgba(150,136,112,' + (.4 * (1 - q)) + ')'; ctx.beginPath(); ctx.ellipse(fx, fy - 1 * k, R * 1.4, R * .5, 0, 0, Math.PI * 2); ctx.fill();
        }
        const mx = tx - ux * (dFront + 6.5 * k), my2 = ty - uy * (dFront + 6.5 * k);
        if (t > 780 && t < 1400) {                   // the impact: a hard white-hot flash and a wall of dust thrown sideways
            const q = (t - 780) / 620;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            if (q < .45) { const qq = q / .45, R = (16 + 46 * qq) * k, gb = ctx.createRadialGradient(mx, my2 - s * .5, 0, mx, my2 - s * .5, R);
                gb.addColorStop(0, 'rgba(255,250,235,' + (1 - qq) + ')'); gb.addColorStop(.35, 'rgba(255,205,130,' + (.55 * (1 - qq)) + ')'); gb.addColorStop(1, 'rgba(255,150,60,0)');
                ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(mx, my2 - s * .5, R, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
            for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1, o = side * (10 + Math.floor(i / 2) * 12) * k * (.4 + q), R = (9 + 14 * q) * k;   // dust along the front line
                const px = mx + vx * o, py = my2 + vy * o - q * 8 * k, gd = ctx.createRadialGradient(px, py, 0, px, py, R);
                gd.addColorStop(0, 'rgba(160,145,118,' + (.5 * (1 - q)) + ')'); gd.addColorStop(1, 'rgba(160,145,118,0)'); ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill(); }
        }
        if (t > 780 && t < 1150) {                   // the lines crash together: a flash and a ring of dust
            const q = (t - 780) / 370;
            ctx.strokeStyle = 'rgba(255,236,190,' + (.7 * (1 - q)) + ')'; ctx.lineWidth = 3 * k * (1 - q);
            ctx.beginPath(); ctx.ellipse(mx, my2 - s * .4, (12 + 40 * q) * k, (5 + 16 * q) * k, Math.atan2(vy, vx), 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,245,215,' + (.35 * (1 - q)) + ')'; ctx.beginPath(); ctx.arc(mx, my2 - s * .5, (8 + 10 * q) * k, 0, Math.PI * 2); ctx.fill();
        }
        if (t > 350 && t < 2800) {                   // arrow volleys from the back ranks, both ways
            const r = mulberry32(b.targetId * 7 + 1);
            for (let i = 0; i < 10; i++) {
                const atk = i % 2 === 0, start = 350 + r() * 1600, dur = 520 + r() * 200, q = (t - start) / dur;
                if (q < 0 || q > 1) continue;
                const o1 = (r() - .5) * 40 * k, o2 = (r() - .5) * 40 * k;
                const d1 = atk ? aFront + 2.5 * gap : dFront * .2, d2 = atk ? dFront * .6 : aFront + gap;
                const x1 = tx - ux * d1 + vx * o1, y1 = ty - uy * d1 + vy * o1 - s, x2 = tx - ux * d2 + vx * o2, y2 = ty - uy * d2 + vy * o2 - s * .5;
                const h = 26 * k, px = x1 + (x2 - x1) * q, py = y1 + (y2 - y1) * q - Math.sin(q * Math.PI) * h;
                const qn = Math.min(1, q + .06), nx = x1 + (x2 - x1) * qn, ny = y1 + (y2 - y1) * qn - Math.sin(qn * Math.PI) * h;
                const ang = Math.atan2(ny - py, nx - px);
                ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 1.1 * k; ctx.beginPath(); ctx.moveTo(px - Math.cos(ang) * 5 * k, py - Math.sin(ang) * 5 * k); ctx.lineTo(px + Math.cos(ang) * 4 * k, py + Math.sin(ang) * 4 * k); ctx.stroke();
                ctx.fillStyle = '#d8dde2'; ctx.beginPath(); ctx.arc(px + Math.cos(ang) * 4 * k, py + Math.sin(ang) * 4 * k, .9 * k, 0, Math.PI * 2); ctx.fill();
            }
        }
        if (after && aWon && b.atk === 'mine') {       // your banner goes up on the captured base
            const q = Math.min(1, (t - 3300) / 700), fx = tx + 6 * k, fy = ty - s * .6, pole = s * 2.2 * q;
            ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - pole); ctx.stroke();
            if (q > .3) { const wave = Math.sin(rt / 150) * 2.5 * k; ctx.fillStyle = cA[0]; ctx.beginPath(); ctx.moveTo(fx, fy - pole);
                ctx.quadraticCurveTo(fx + 10 * k, fy - pole + wave, fx + 20 * k, fy - pole + 3 * k + wave); ctx.lineTo(fx, fy - pole + 11 * k); ctx.closePath(); ctx.fill();
                ctx.lineWidth = .8 * k; ctx.stroke(); }
        }
        if (fight) {                                  // sparks + dust on the front line
            for (let i = 0; i < 8; i++) {             // dust haze drifting up off the melee
                const ph = ((Math.max(0, rt) / 1800) + i / 8) % 1, o = ((i * 37) % 11 / 11 - .5) * 60 * k, R = (8 + ph * 16) * k;
                const px = mx + vx * o + ph * 10 * k, py = my2 + vy * o - s * .3 - ph * 22 * k, gd = ctx.createRadialGradient(px, py, 0, px, py, R);
                gd.addColorStop(0, 'rgba(150,136,112,' + (.28 * Math.sin(ph * Math.PI)) + ')'); gd.addColorStop(1, 'rgba(150,136,112,0)');
                ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill(); }
            const r = mulberry32(Math.floor(rt / 55) + b.targetId);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            for (let i = 0; i < 10; i++) { const o = (r() - .5) * 50 * k, x = mx + vx * o, y = my2 + vy * o - s * .55;   // steel on steel
                const a = r() * 6.28, l = (2 + r() * 4.5) * k, al = .5 + r() * .5;
                ctx.strokeStyle = 'rgba(255,' + (190 + Math.floor(r() * 60)) + ',120,' + al + ')'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
                if (i < 2) { ctx.fillStyle = 'rgba(255,245,220,' + al * .6 + ')'; ctx.beginPath(); ctx.arc(x, y, .9 * k, 0, Math.PI * 2); ctx.fill(); } }
            ctx.restore();
        }
        // troop counts over each side, ticking down, with floating losses
        const tick = Math.max(0, Math.min(1, (t - 1000) / 2200)), e = 1 - Math.pow(1 - tick, 2);
        const ad = aFront + gap * 1.5, alphaP = after ? Math.max(0, 1 - (t - 3200) / 600) : Math.min(1, t / 300);
        const va = Math.max(0, b.my - b.myLoss * e), vd = Math.max(0, b.en - b.enLoss * e);
        {                                             // one strength bar above the fight: attacker | defender
            const cx = tx - ux * (aFront * .55), top = Math.min(ty - uy * ad, ty - uy * dFront * .4, ty) - s * 1.5 - 22;
            ctx.save(); ctx.globalAlpha = alphaP; ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
            const la = fmtCompact(Math.round(va)), ld = fmtCompact(Math.round(vd)), W = Math.max(116, ctx.measureText(la + ld).width + 64), x0 = cx - W / 2;
            rr(ctx, x0, top, W, 27, 6); ctx.fillStyle = 'rgba(10,12,16,.92)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(228,200,134,.7)'; ctx.stroke();
            ctx.fillStyle = cA[1]; ctx.textAlign = 'left'; ctx.fillText(la, x0 + 8, top + 10);
            ctx.fillStyle = cD[1]; ctx.textAlign = 'right'; ctx.fillText(ld, x0 + W - 8, top + 10);
            drawGlyph(ctx, 'attack', cx, top + 10, 11, '#e4c886');
            const bw = W - 16, sh = va + vd > 0 ? va / (va + vd) : .5, by = top + 17.5, bx = x0 + 8, sx = bx + bw * sh;
            ctx.save(); rr(ctx, bx, by, bw, 5, 2.5); ctx.clip();                          // tug-of-war bar: two bevelled halves, a gold notch at the front line
            const gD = ctx.createLinearGradient(0, by, 0, by + 5); gD.addColorStop(0, cD[1]); gD.addColorStop(.45, cD[0]); gD.addColorStop(1, cD[0]);
            const gA = ctx.createLinearGradient(0, by, 0, by + 5); gA.addColorStop(0, cA[1]); gA.addColorStop(.45, cA[0]); gA.addColorStop(1, cA[0]);
            ctx.fillStyle = gD; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = gA; ctx.fillRect(bx, by, bw * sh, 5); ctx.restore();
            rr(ctx, bx, by, bw, 5, 2.5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
            ctx.fillStyle = '#f0d69a'; ctx.beginPath(); ctx.moveTo(sx, by - 2); ctx.lineTo(sx + 2.5, by + 2.5); ctx.lineTo(sx, by + 7); ctx.lineTo(sx - 2.5, by + 2.5); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        if (t > 900 && t < 3400) {
            ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const i0 = Math.floor((t - 900) / 450);
            for (let i = Math.max(0, i0 - 2); i <= i0; i++) {
                const age = t - 900 - i * 450; if (age < 0 || age > 900) continue;
                const r = mulberry32(i * 31 + b.targetId), a = 1 - age / 900, rise = age / 900 * 22;
                for (const [atk, loss, col] of [[true, b.myLoss, cA[1]], [false, b.enLoss, cD[1]]]) {
                    if (loss <= 0) continue;
                    const chunk = loss / 5, d = atk ? aFront + gap : dFront * .6, o = (r() - .5) * 30 * k;
                    ctx.globalAlpha = a; ctx.fillStyle = '#0b0d12'; const txt = '−' + fmtCompact(Math.max(1, Math.round(chunk)));
                    const px = tx - ux * d + vx * o, py = ty - uy * d + vy * o - s - rise;
                    ctx.fillText(txt, px + 1, py + 1); ctx.fillStyle = col; ctx.fillText(txt, px, py);
                }
            }
            ctx.globalAlpha = 1;
        }
    }
}
function mapBattleShake(now) {                        // a short jolt of the camera on the impact and when the base falls
    if (!mapBattles.length || mapState.zoom < 0.006) return null;
    let amp = 0;
    for (const b of mapBattles) { const t = mbT(b, now);
        if (t > 790 && t < 1000) amp += 6 * (1 - (t - 790) / 210);
        if (b.won && t > 3200 && t < 3380) amp += 4 * (1 - (t - 3200) / 180); }
    if (amp < .3) return null;
    amp = Math.min(8, amp); return { x: Math.sin(now / 16) * amp, y: Math.cos(now / 21) * amp * .6 };
}
function bsSoldier(g, x, y, s, dir, col, rim, walk, thrust, fall) {
    // a spearman in 3/4 view: boots, mail, a tabard in the side's colour with a pale stripe, nasal helm, heater shield
    g.save(); g.translate(x, y);
    if (fall > 0) { g.rotate(-dir * fall * Math.PI / 2 * 0.95); g.globalAlpha *= 1 - fall * 0.45; }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0, s * .3, s * .075, 0, 0, Math.PI * 2); g.fill();
    const st = Math.sin(walk) * s * .14, ink = 'rgba(12,12,16,.55)';
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#2b2620'; g.lineWidth = s * .1;                                            // legs
    g.beginPath(); g.moveTo(-s * .06, -s * .4); g.lineTo(-s * .06 + st, -s * .03); g.moveTo(s * .06, -s * .4); g.lineTo(s * .06 - st, -s * .03); g.stroke();
    g.strokeStyle = '#17130f'; g.lineWidth = s * .12;                                           // boots
    g.beginPath(); g.moveTo(-s * .06 + st, -s * .06); g.lineTo(-s * .06 + st + dir * s * .05, -s * .01); g.moveTo(s * .06 - st, -s * .06); g.lineTo(s * .06 - st + dir * s * .05, -s * .01); g.stroke();
    const mail = g.createLinearGradient(-s * .16, 0, s * .16, 0); mail.addColorStop(0, '#6f757d'); mail.addColorStop(1, '#383c43');
    g.fillStyle = mail; g.strokeStyle = ink; g.lineWidth = s * .03;                              // mail shirt
    g.beginPath(); g.moveTo(-s * .16, -s * .38); g.lineTo(s * .16, -s * .38); g.lineTo(s * .13, -s * .82); g.lineTo(-s * .13, -s * .82); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(-s * .11, -s * .8); g.lineTo(s * .11, -s * .8); g.lineTo(s * .12, -s * .4); g.lineTo(0, -s * .34); g.lineTo(-s * .12, -s * .4); g.closePath(); g.fill(); g.stroke();   // tabard
    g.fillStyle = rim; g.globalAlpha *= .45; g.fillRect(-s * .02, -s * .79, s * .04, s * .42); g.globalAlpha /= .45;
    g.fillStyle = '#3a2a1a'; g.fillRect(-s * .12, -s * .56, s * .24, s * .035);                 // belt
    g.fillStyle = '#d9b48c'; g.beginPath(); g.arc(dir * s * .02, -s * .9, s * .1, 0, Math.PI * 2); g.fill();   // face
    const helm = g.createLinearGradient(-s * .13, -s * 1.06, s * .13, -s * .9); helm.addColorStop(0, '#b4bcc4'); helm.addColorStop(1, '#4b525b');
    g.fillStyle = helm; g.beginPath(); g.moveTo(-s * .13, -s * .9); g.quadraticCurveTo(-s * .13, -s * 1.08, 0, -s * 1.1); g.quadraticCurveTo(s * .13, -s * 1.08, s * .13, -s * .9); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5b626b'; g.fillRect(dir * s * .045 - s * .015, -s * .92, s * .03, s * .09);   // nasal
    const sa = thrust ? -0.12 : -1.05 + Math.sin(walk * .5) * .05, px = dir * s * .08, py = -s * .6;   // spear: upright on the march, levelled in the clash
    const tipX = px + dir * Math.cos(sa) * s * .78 + dir * thrust * s * .18, tipY = py + Math.sin(sa) * s * .78;
    g.strokeStyle = '#8a6b43'; g.lineWidth = s * .045;
    g.beginPath(); g.moveTo(px - dir * Math.cos(sa) * s * .45, py - Math.sin(sa) * s * .45); g.lineTo(tipX, tipY); g.stroke();
    g.save(); g.translate(tipX, tipY); g.rotate(dir > 0 ? sa : Math.PI - sa); g.fillStyle = '#dfe5ea'; g.strokeStyle = ink; g.lineWidth = s * .02;   // leaf blade
    g.beginPath(); g.moveTo(-s * .02, -s * .035); g.quadraticCurveTo(s * .08, -s * .03, s * .13, 0); g.quadraticCurveTo(s * .08, s * .03, -s * .02, s * .035); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.fillStyle = '#d9b48c'; g.beginPath(); g.arc(px, py, s * .045, 0, Math.PI * 2); g.fill();   // hand on the shaft
    g.save(); g.translate(dir * s * .17, -s * .6);                                              // heater shield towards the enemy
    g.beginPath(); g.moveTo(-s * .1, -s * .19); g.lineTo(s * .1, -s * .19); g.lineTo(s * .1, -s * .02); g.quadraticCurveTo(s * .08, s * .14, 0, s * .2); g.quadraticCurveTo(-s * .08, s * .14, -s * .1, -s * .02); g.closePath();
    g.fillStyle = col; g.fill(); g.lineWidth = s * .03; g.strokeStyle = '#6b6258'; g.stroke(); g.lineWidth = s * .012; g.strokeStyle = ink; g.stroke();   // iron-rimmed
    g.fillStyle = '#8c8578'; g.beginPath(); g.arc(0, -s * .02, s * .03, 0, Math.PI * 2); g.fill();   // boss
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(-s * .085, -s * .17); g.lineTo(-s * .02, -s * .17); g.lineTo(-s * .085, -s * .02); g.closePath(); g.fill();
    g.restore();
    g.restore();
}
const BS_TROOP = { mine: ['#2c4a70', '#8ea6c4'], bot: ['#6b2620', '#c08a80'], neutral: ['#51493b', '#a39780'], boss: ['#3f1630', '#b07c98'] };   // cloth dyes: darker, less toy-like
const BS_COL = { mine: ['#3d6fb3', '#b7d3f5'], bot: ['#a3352b', '#f2aa9f'], neutral: ['#7a6a4f', '#d9c7a1'], boss: ['#5b1d3d', '#e39ac0'] };
// ===== BATTLE EFFECTS =====
// A flash, a shockwave and sparks at the base when a fight the player is part of resolves,
// plus "Sieg!" / "Verloren" floating up (screen space, drawn in drawMap).
var battleFx = [];
function sfx(name) { if (window.__sfx && !SYSTEM) window.__sfx(name); }       // sound effect (no-op until the sound engine is up; der Weltrechner hat keinen Ton)
function spawnBattleFx(islandId, good, label, sub) {
    sfx(/Herrscher/.test(label) ? 'crown' : /^Weltereignis/.test(sub || '') ? 'event' : / gefallen$/.test(label) ? '' : /verlegt/.test(sub || '') ? 'move' : good ? 'victory' : 'defeat');
    const isl = typeof islandId === 'object' ? islandId : islandById[islandId]; if (!isl) return;   // a base, or a point on the map ({ x, y })
    const rnd = (a, b) => a + Math.random() * (b - a);
    const shards = [], smoke = [], sparks = [];
    for (let i = 0; i < 14; i++) shards.push({ a: rnd(0, Math.PI * 2), v: rnd(70, 170), rot: rnd(0, 6.3), vr: rnd(-12, 12), s: rnd(2.5, 5.5) });
    for (let i = 0; i < 9; i++) smoke.push({ a: rnd(0, Math.PI * 2), d: rnd(8, 34), r: rnd(12, 24), up: rnd(14, 34) });
    for (let i = 0; i < 22; i++) sparks.push({ a: rnd(0, Math.PI * 2), v: rnd(90, 230), len: rnd(6, 14) });
    const stack = battleFx.filter(f => f.x === isl.x && f.y === isl.y && performance.now() - f.born < 2600).length;   // several fights at one base: banners stack
    battleFx.push({ x: isl.x, y: isl.y, good, label, sub: sub || '', born: performance.now(), shards, smoke, sparks, stack });
    if (battleFx.length > 12) battleFx.shift();
    requestRender();
}
const FX_MS = 2600;
function fxRibbon(label, sub, good, alpha, scale) {   // result banner at (0,0): ribbon with swallow tails + icon medallion
    ctx.save(); ctx.globalAlpha = alpha; ctx.scale(scale, scale);
    ctx.font = '700 17px Cinzel, Georgia, serif';
    const text = label.toUpperCase(), tw = ctx.measureText(text).width, w = Math.max(96, tw + 58), h = 30, x = -w / 2, y = -h / 2;
    const c1 = good ? '#f6dc8e' : '#e76a5c', c2 = good ? '#b98733' : '#8e1f17', edge = good ? '#5a3c0e' : '#3e0906';
    for (const sgn of [-1, 1]) {                      // swallow tails
        const tx = sgn * (w / 2 - 4);
        ctx.beginPath(); ctx.moveTo(tx, y + 5); ctx.lineTo(tx + sgn * 20, y + 5); ctx.lineTo(tx + sgn * 12, 0 + 5); ctx.lineTo(tx + sgn * 20, h / 2 + 5); ctx.lineTo(tx, h / 2 + 5); ctx.closePath();
        ctx.fillStyle = good ? '#8d6320' : '#6d140f'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = edge; ctx.stroke();
    }
    const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 4) : ctx.rect(x, y, w, h);
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = edge; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y + 2.5); ctx.lineTo(x + w - 4, y + 2.5); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = good ? '#2a1a04' : '#fff1ec'; ctx.fillText(text, 12, 1);
    const mx = x + 17;                                 // medallion with glyph
    ctx.beginPath(); ctx.arc(mx, 0, 13, 0, Math.PI * 2); ctx.fillStyle = good ? '#1d1509' : '#1c0806'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = good ? '#f0d38a' : '#ff8d7e'; ctx.stroke();
    drawGlyph(ctx, good ? 'flag' : 'defense', mx, 0, 15, good ? '#f5dd9c' : '#ffb2a7');
    if (sub) {
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        const sw = ctx.measureText(sub).width + 16;
        ctx.fillStyle = 'rgba(8,8,12,.82)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-sw / 2, h / 2 + 5, sw, 18, 9) : ctx.rect(-sw / 2, h / 2 + 5, sw, 18); ctx.fill();
        ctx.fillStyle = good ? '#f2e2b8' : '#ffc1b8'; ctx.fillText(sub, 0, h / 2 + 14.5);
    }
    ctx.restore();
}
function drawBattleFx(now) {       // screen space (setScreen active)
    battleFx = battleFx.filter(f => now - f.born < FX_MS);
    for (const f of battleFx) {
        const ms = now - f.born;
        const sx = f.x * mapState.zoom + mapState.offsetX, sy = f.y * mapState.zoom + mapState.offsetY;
        if (sx < -200 || sy < -200 || sx > viewW + 200 || sy > viewH + 200 || !isCellOpen(f.x, f.y)) continue;
        const hot = f.good ? '255,214,120' : '255,110,80';
        ctx.save();
        // 1) two blades sweep in and clash (0-380 ms)
        if (ms < 520) {
            const k = Math.min(1, ms / 300), ease = 1 - Math.pow(1 - k, 3), fade = ms < 380 ? 1 : 1 - (ms - 380) / 140;
            ctx.globalAlpha = Math.max(0, fade);
            for (const sgn of [-1, 1]) {
                ctx.save(); ctx.translate(sx + sgn * (70 * (1 - ease) + 4), sy - 18 - 30 * (1 - ease));
                ctx.rotate(sgn * (0.9 - 0.5 * ease)); ctx.scale(-sgn, 1);
                drawGlyph(ctx, 'weapon', 0, 0, 30, '#eef2f6');
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'lighter';
        // 2) star flare at the clash (250-700 ms)
        if (ms > 250 && ms < 700) {
            const k = (ms - 250) / 450, a = Math.sin(k * Math.PI), R = 26 + 70 * k;
            const gr = ctx.createRadialGradient(sx, sy - 18, 0, sx, sy - 18, R);
            gr.addColorStop(0, 'rgba(255,252,240,' + a + ')'); gr.addColorStop(0.35, 'rgba(' + hot + ',' + 0.55 * a + ')'); gr.addColorStop(1, 'rgba(' + hot + ',0)');
            ctx.fillStyle = gr; ctx.fillRect(sx - R, sy - 18 - R, R * 2, R * 2);
            ctx.translate(sx, sy - 18); ctx.rotate(k * 0.6);
            ctx.fillStyle = 'rgba(255,250,230,' + a + ')';
            for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-R * 0.9, 0); ctx.lineTo(0, -2.2); ctx.lineTo(R * 0.9, 0); ctx.lineTo(0, 2.2); ctx.closePath(); ctx.fill(); }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        // 3) sparks with trails + double shockwave (300-1200 ms)
        if (ms > 300 && ms < 1200) {
            const k = (ms - 300) / 900, e = 1 - Math.pow(1 - k, 2);
            ctx.lineCap = 'round';
            for (const sp of f.sparks) {
                const d = sp.v * e, px = sx + Math.cos(sp.a) * d, py = sy - 18 + Math.sin(sp.a) * d + k * k * 40;
                ctx.strokeStyle = 'rgba(' + hot + ',' + (1 - k) + ')'; ctx.lineWidth = 2 * (1 - k) + 0.6;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(sp.a) * sp.len * (1 - k), py - Math.sin(sp.a) * sp.len * (1 - k)); ctx.stroke();
            }
            for (const [delay, w] of [[0, 3], [0.18, 1.6]]) {
                const kk = Math.max(0, Math.min(1, (k - delay) / 0.6)); if (kk <= 0 || kk >= 1) continue;
                ctx.strokeStyle = 'rgba(' + hot + ',' + (1 - kk) * 0.85 + ')'; ctx.lineWidth = w * (1 - kk) + 0.5;
                ctx.beginPath(); ctx.ellipse(sx, sy, 18 + kk * 95, (18 + kk * 95) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
        // 4) smoke + debris (300-1800 ms)
        if (ms > 300 && ms < 1800) {
            const k = (ms - 300) / 1500;
            for (const sm of f.smoke) {
                const r = sm.r * (0.6 + k * 1.3), px = sx + Math.cos(sm.a) * sm.d * (0.5 + k), py = sy - 8 + Math.sin(sm.a) * sm.d * 0.4 - sm.up * k;
                const g2 = ctx.createRadialGradient(px, py, 0, px, py, r);
                g2.addColorStop(0, 'rgba(70,64,58,' + 0.45 * (1 - k) + ')'); g2.addColorStop(1, 'rgba(70,64,58,0)');
                ctx.fillStyle = g2; ctx.fillRect(px - r, py - r, r * 2, r * 2);
            }
            if (k < 0.6) for (const sh of f.shards) {
                const kk = k / 0.6, d = sh.v * (1 - Math.pow(1 - kk, 2)) * 0.6, px = sx + Math.cos(sh.a) * d, py = sy - 10 + Math.sin(sh.a) * d * 0.6 + kk * kk * 60;
                ctx.save(); ctx.translate(px, py); ctx.rotate(sh.rot + sh.vr * kk); ctx.globalAlpha = 1 - kk;
                ctx.fillStyle = f.good ? '#6e6356' : '#5a4a44'; ctx.beginPath(); ctx.moveTo(-sh.s, sh.s * 0.6); ctx.lineTo(sh.s, sh.s * 0.3); ctx.lineTo(0, -sh.s); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }
        // 5) result banner (450 ms - end): pops in, holds, rises out
        if (ms > 450) {
            const k = (ms - 450) / (FX_MS - 450);
            const pop = Math.min(1, (ms - 450) / 260), scale = pop < 1 ? 0.5 + 0.62 * Math.sin(pop * Math.PI * 0.62) : 1;
            const alpha = k > 0.78 ? 1 - (k - 0.78) / 0.22 : Math.min(1, pop * 1.6);
            ctx.translate(sx, sy - 52 - k * 26 - f.stack * 58);
            fxRibbon(f.label, f.sub, f.good, Math.max(0, alpha), scale);
        }
        ctx.restore();
    }
    if (battleFx.length) liveAnimation = true;
}

// ===== BOSS AUF DER KARTE: nur noch der Kriegsherr (Wanderboss) in seinem Lager. (Der Weltboss Drachenturm/Piratenfestung ist seit 2.10. raus.)
var WANDER_CRATE = 3, bossRewardPending = false;      // Kiste „mind. Episch“
function bossAt(id) {
    const w = loadWander();
    return w && w.at === id && w.to === null && w.troops > 0 && !islandOwnerOf(id) ? w : null;   // the Kriegsherr in his camp
}
// A world event is as strong as the world, not as the player: the middle of the five biggest armies on the map
// (the player's and every bot's), so one giant army - yours or a bot's - doesn't set the bar for everyone.
function worldArmy() {
    const armies = [totalTroops()];
    for (const bot of BOT_DEFS) { let sum = 0; for (const id of botOwnedIslands[bot.id] || []) sum += islandTroops[id] || 0; armies.push(sum); }
    armies.sort((a, b) => b - a);
    return armies[2] || 0;
}
function defeatBoss(boss) {
    statBump('bosses');
    const rewardGems = WANDER_REWARD_GEMS, shN = HERO_SHARDS_WANDER;
    inboxAdd({ src: 'wboss', title: boss.name + ' besiegt', gems: rewardGems, crate: WANDER_CRATE, sh: shN });   // eine epische (lila) Kiste, Gems und Splitter – ins Abholfach
    saveProgression(); saveGame(); updateHud();
    endWander(null);
    document.getElementById('rewardModalSub').textContent = boss.name + ' ist gefallen – die Beute liegt unter Events → Belohnung.';
    const list = document.getElementById('rewardModalRewards'), rd = RARITY_DEFS[WANDER_CRATE];
    list.innerHTML = '<li style="border-color:' + rd.color + '66">' + icon('shop') + '<span>Kiste</span><b style="color:' + rd.color + '">mind. ' + rd.label + '</b></li>' +
        '<li>' + icon('gem', 'ico-gem') + '<span>Gems</span><b>+' + rewardGems + '</b></li><li>' + icon('star') + '<span>Helden-Splitter</span><b>+' + shN + '</b></li>';
    [...list.children].forEach((li, i) => { li.style.animationDelay = (200 + i * 120) + 'ms'; });
    bossRewardPending = true;
    setTimeout(() => { bossRewardPending = false; document.getElementById('rewardModal').hidden = false; }, 9800);   // after the fight on the map
}
document.getElementById('rewardModalBtn').addEventListener('click', () => { document.getElementById('rewardModal').hidden = true; });
document.getElementById('rewardModal').addEventListener('click', e => { if (e.target.id === 'rewardModal') document.getElementById('rewardModal').hidden = true; });
function bossTick() {
    checkRuler();
    const now = Date.now();
    const el = document.querySelector('[data-boss-clock]'), pb = popupIslandId !== null && bossAt(popupIslandId);
    if (el && pb) el.textContent = fmtClock((pb.campUntil - now) / 1000);
}
setInterval(bossTick, 1000);

// ===== WANDERBOSS: a warlord marches across the map, storms bases (yours, the bots', neutral ones) and camps
// for a while where he won. In his camp he can be attacked like a boss; every fight wears his army down.
// Whoever breaks him gets an epic crate (WANDER_CRATE) and WANDER_REWARD_GEMS gems. Every 6-8 h, lives 25 min.
var WANDER_REWARD_GEMS = 50, WANDER_NAMES = ['Kriegsherr Morgath', 'Die Schwarze Horde', 'Graf Vargoth', 'Der Eisenkönig'];
var wander, nextWanderAt = 0;
function loadWander() {
    if (wander !== undefined) return wander;
    try { wander = JSON.parse(store.get('openWaterWander')) || null; } catch (e) { wander = null; }
    nextWanderAt = parseInt(store.get('openWaterWanderNext'), 10) || (Date.now() + 8 * 60 * 1000);
    return wander;
}
function saveWander() { store.set('openWaterWander', JSON.stringify(wander || null)); store.set('openWaterWanderNext', String(nextWanderAt)); }
function endWander(msg) {
    wander = null; nextWanderAt = Date.now() + (360 + Math.random() * 120) * 60 * 1000 * evBossTakt(); saveWander(); requestRender();
    if (msg) flashHint(msg, 4500);
    if (isPanelOpen(popup)) renderPopup();
}
function spawnWander() {
    const cand = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring >= 3);
    if (!cand.length) return false;
    const isl = cand[Math.floor(Math.random() * cand.length)], now = Date.now();
    const troops = niceRound(Math.max(1e6, worldArmy() * (1.5 + Math.random())));
    wander = { wander: true, name: WANDER_NAMES[Math.floor(Math.random() * WANDER_NAMES.length)], troops, defense: niceRound(troops * .15), max: troops,
        at: isl.id, from: null, to: null, departAt: 0, arriveAt: 0, campUntil: now + 60000, endsAt: now + 25 * 60 * 1000 };
    scoutedIslands.add(isl.id);
    saveWander(); saveGame();
    flashHint('Weltereignis: ' + wander.name + ' zieht über die Karte und greift Basen an! Besiege ihn in seinem Lager.', 7000);
    requestRender(); return true;
}
function wanderDepart(now) {                          // off to the next base: owned ones first, the player a bit more tempting
    const here = islandById[wander.at]; if (!here) return endWander(null);
    const lms = new Set((reachableLandmassIds[here.landmassId] || [here.landmassId]).filter(l => l === here.landmassId || landmassesConnected(here.landmassId, l)));
    let best = null;
    for (const lm of lms) for (const isl of islandsByLandmass[lm] || []) {
        if (isl.type !== 'tower' || isl.id === here.id || isCapital(isl.id) || bossAt(isl.id)) continue;
        const ow = islandOwnerOf(isl.id); if (shieldCovers(isl) && ownerShielded(ow)) continue;
        const d = Math.hypot(isl.x - here.x, isl.y - here.y) * (ow ? (ow === 'player' ? .45 : .6) : 1.6) * (.8 + Math.random() * .4);
        if (!best || d < best.d) best = { d, isl };
    }
    if (!best) { wander.campUntil = now + 30000; return; }
    const dist = Math.hypot(best.isl.x - here.x, best.isl.y - here.y);
    Object.assign(wander, { from: here.id, to: best.isl.id, at: null, departAt: now, arriveAt: now + Math.max(20000, Math.min(150000, dist / (BASE_ATTACK_SPEED * .6) * 1000)) });
    if (islandOwnerOf(best.isl.id) === 'player') flashHint(wander.name + ' marschiert auf deine Basis ' + islandTitle(best.isl) + ' zu!', 5000);
    saveWander(); requestRender();
}
function wanderArrive(now) {                          // the storm: same maths as any attack; a win razes the base and he camps there
    const tgt = islandById[wander.to], from = wander.from; if (!tgt) return endWander(null);
    const owner = islandOwnerOf(tgt.id), en = effectiveTroops(tgt), def = effectiveDefense(tgt), my = wander.troops, won = my > en + def;
    if (shieldCovers(islandById[wander.to]) && ownerShielded(owner, Math.min(now, wander.arriveAt || now))) { Object.assign(wander, { at: from, to: null, campUntil: now + 20000 }); saveWander(); return; }
    const capitalHolds = won && isCapital(tgt.id);          // capitals are never razed: only the garrison falls and he pulls back
    if (capitalHolds) {
        islandTroops[tgt.id] = 0;
        wander.troops = Math.max(1, Math.round(my - def * .6 - en * .3));
        Object.assign(wander, { at: from, to: null, campUntil: now + 45000 });
    } else if (won) {
        if (owner) { botNoteLoss(owner, tgt.id); clearIslandOwner(tgt.id); }
        islandTroops[tgt.id] = 0; tgt.neutralTroops = 0; neutralTroopOverrides[tgt.id] = 0;
        wander.troops = Math.max(1, Math.round(my - def * .6 - en * .3));
        Object.assign(wander, { at: tgt.id, to: null, campUntil: now + 90000 });
    } else {
        const cas = Math.min(en, my);
        if (owner) islandTroops[tgt.id] = Math.max(0, (islandTroops[tgt.id] || 0) - cas); else { tgt.neutralTroops = en - cas; neutralTroopOverrides[tgt.id] = tgt.neutralTroops; }
        wander.troops = Math.max(0, Math.round(my * .35));
        Object.assign(wander, { at: from, to: null, campUntil: now + 45000 });
    }
    wander.defense = niceRound(wander.troops * .15);
    const wKilled = Math.max(0, my - wander.troops);
    if (owner && owner !== 'player') { botHospitalTake(owner, won ? en : Math.min(en, my)); botCoins[owner] = (botCoins[owner] || 0) + Math.round(wKilled * botGoldRate(owner, 'defenseGold')); }
    const wGold = owner === 'player' ? Math.round(wKilled * (skills.defenseGold || 0) * SKILL_DEFS.defenseGold.rate) : 0; if (wGold) inboxAdd({ src: 'fight', coins: wGold });
    if (owner === 'player') {
        scoutedIslands.add(tgt.id);
        const name = wander.name;
        const fallen = won ? en : Math.min(en, my), wounded = hospitalTake(fallen);
        spawnMapBattle({ sourceId: from, targetId: tgt.id, atk: 'boss', def: 'mine', my, myLoss: my - wander.troops, en, enLoss: fallen, won,
            onEnd: () => spawnBattleFx(tgt.id, !won || capitalHolds, capitalHolds ? 'Hauptstadt hält' : won ? 'Basis verloren' : 'Verteidigt', capitalHolds ? 'Garnison gefallen' : won ? 'von ' + name : name + ' abgewehrt') });
        addCombatLogEntry({ type: 'botAttack', botName: name, targetId: tgt.id, myTroops: my, enemyTroops: en, enemyDefense: def, wounded, armor: armorDefenseFor(tgt.id), fallen, won, capitalHolds, defGold: wGold });
        flashHint((capitalHolds ? name + ' hat die Garnison deiner Hauptstadt geschlagen – die Stadt hält.' : won ? name + ' hat deine Basis ' + islandTitle(tgt) + ' zerstört!' : 'Verteidigt! ' + name + ' wurde bei ' + islandTitle(tgt) + ' zurückgeschlagen.') + (wounded ? ' ' + fmtCompact(wounded) + ' Verwundete ins Lazarett.' : ''), 5000);
    }
    if (owner && owner !== 'player' && botById[owner] && botById[owner].mensch) {   // ein echter Spieler: der Bericht kommt bei ihm an (wie bei jedem Angriff)
        const t = islandTitle(tgt);
        evBericht(owner, { type: 'ev', ic: 'defense', gut: !won || capitalHolds, badge: capitalHolds ? 'Hält' : won ? 'Zerstört' : 'Verteidigt', title: wander.name + ' · ' + t,
            txt: fmtCompact(my) + ' gegen ' + fmtCompact(en + def) + (won && !capitalHolds ? ' · die Basis ist zerstört' : capitalHolds ? ' · die Garnison ist gefallen, die Hauptstadt hält' : ' · abgewehrt'), at: now },
            capitalHolds ? wander.name + ' hat die Garnison deiner Hauptstadt geschlagen – die Stadt hält.' : won ? wander.name + ' hat deine Basis ' + t + ' zerstört!' : 'Verteidigt! ' + wander.name + ' wurde bei ' + t + ' zurückgeschlagen.');
    }
    if (wander.troops <= 0) return endWander(wander.name + ' ist zerschlagen.');
    updateHud(); saveGame(); saveWander(); requestRender();
}
function wanderTick() {
    loadWander(); const now = Date.now();
    if (!rechnet()) return;
    if (!wander) { if (now >= nextWanderAt && !spawnWander()) nextWanderAt = now + 60000; return; }
    if (now >= wander.endsAt) return endWander(wander.name + ' ist weitergezogen.');
    if (wander.to !== null) { if (now >= wander.arriveAt) wanderArrive(now); else requestRender(); }
    else if (islandOwnerOf(wander.at)) endWander(null);           // someone took his camp (reward handled by the fight)
    else if (now >= wander.campUntil) wanderDepart(now);
}
setInterval(wanderTick, 1000);
function drawWander(now, chipOnly) {                // screen space: the marching host, or the camp with its aura (chipOnly: just the name plate, drawn over the base plates)
    const w = loadWander(); if (!w) return;
    const z = mapState.zoom; let wx, wy, marching = w.to !== null;
    if (marching) { const a = islandById[w.from], b2 = islandById[w.to], q = Math.max(0, Math.min(1, (Date.now() - w.departAt) / Math.max(1, w.arriveAt - w.departAt)));
        wx = a.x + (b2.x - a.x) * q; wy = a.y + (b2.y - a.y) * q;
        if (!isCellOpen(wx, wy) && !isCellOpen(b2.x, b2.y)) return;                // ganz im Nebel
        const ex = b2.x * z + mapState.offsetX, ey = b2.y * z + mapState.offsetY;
        ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -now / 40; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(150,30,70,.85)';
        ctx.beginPath(); ctx.moveTo(wx * z + mapState.offsetX, wy * z + mapState.offsetY); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    } else { const c = islandById[w.at]; if (!c || !islandSeen(c)) return; wx = c.x; wy = c.y; }
    const sx = wx * z + mapState.offsetX, sy = wy * z + mapState.offsetY;
    if (sx < -200 || sy < -200 || sx > viewW + 200 || sy > viewH + 200) return;
    const k = Math.max(.8, Math.min(2.2, z / 0.015)), pulse = .5 + .5 * Math.sin(now / 350);
    if (chipOnly) return wanderChip(w, sx, sy, z, k, marching);
    const gr = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60 * k);
    gr.addColorStop(0, 'rgba(120,20,60,' + (.35 + .15 * pulse) + ')'); gr.addColorStop(1, 'rgba(120,20,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, 60 * k, 0, Math.PI * 2); ctx.fill();
    if (z >= 0.006) {                                  // the host: a dense block of dark soldiers around a great banner
        const s = 14 * k, dir = marching && islandById[w.to].x < wx ? -1 : 1, walk = marching ? now / 70 : 0;
        const pos = []; for (let r = 0; r < 3; r++) for (let f = 0; f < 4; f++) pos.push([(f - 1.5) * 9 * k + (r % 2) * 4 * k, (r - 1) * 7 * k]);
        pos.sort((a, b) => a[1] - b[1]).forEach(([ox, oy], i) => bsSoldier(ctx, sx + ox, sy + oy + 8 * k, s, dir, '#3f1630', '#b07c98', walk + i, 0, 0));
        ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(sx, sy - 4 * k); ctx.lineTo(sx, sy - 44 * k); ctx.stroke();
        const wave = Math.sin(now / 200) * 3 * k; ctx.fillStyle = '#5b1d3d';
        ctx.beginPath(); ctx.moveTo(sx, sy - 44 * k); ctx.lineTo(sx + 22 * k, sy - 42 * k + wave); ctx.lineTo(sx + 16 * k, sy - 34 * k + wave); ctx.lineTo(sx + 22 * k, sy - 26 * k + wave); ctx.lineTo(sx, sy - 28 * k); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#e39ac0'; ctx.stroke();
    }
    liveAnimation = true;
}
function wanderChip(w, sx, sy, z, k, marching) {
    const left = marching ? w.arriveAt - Date.now() : w.campUntil - Date.now();
    const label = w.name + ' · ' + fmtCompact(w.troops) + ' · ' + (marching ? 'Ankunft ' : 'Lager ') + fmtClock(left / 1000);
    ctx.font = '700 11px Inter, system-ui, sans-serif'; const tw = ctx.measureText(label).width + 30, cy = sy - (z >= 0.006 ? 60 * k : 26);
    rr(ctx, sx - tw / 2, cy - 10, tw, 20, 10); ctx.fillStyle = 'rgba(24,6,14,.92)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#e39ac0'; ctx.stroke();
    drawGlyph(ctx, 'attack', sx - tw / 2 + 12, cy, 12, '#f2b6d2');
    ctx.fillStyle = '#fbe3ee'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, sx - tw / 2 + 22, cy + .5);
    liveAnimation = true;
}
function drawCrown(x, y, w) {       // small gold crown, (x, y) = bottom centre
    const h = w * 0.62;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.55); ctx.lineTo(x - w / 4, y - h * 0.25); ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 4, y - h * 0.25); ctx.lineTo(x + w / 2, y - h * 0.55); ctx.lineTo(x + w / 2, y); ctx.closePath();
    const gr = ctx.createLinearGradient(0, y - h, 0, y);
    gr.addColorStop(0, '#fff3cf'); gr.addColorStop(0.5, '#e7bd6a'); gr.addColorStop(1, '#9a6a24');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3b2608'; ctx.stroke();
    ctx.fillStyle = '#d8342a'; ctx.beginPath(); ctx.arc(x, y - h * 0.35, w * 0.08, 0, Math.PI * 2); ctx.fill();
}
function drawRulerCrowns(plates) {
    const ruler = rulerOwner(); if (!ruler || !plates) return;
    setScreen(ctx);
    for (const it of plates) {
        if (islandOwnerOf(it.isl.id) !== ruler) continue;
        const w = Math.max(12, Math.min(24, it.rect.h * 0.85));
        drawCrown(it.rect.x + it.rect.h * 0.5, it.rect.y + 2, w);
    }
}
var lastRuler, lastGoodTitle = null;       // the player's title under the current ruler (a new ruler wipes all titles)
function checkRuler() {             // announces a change of ruler once
    const r = rulerOwner();
    if (lastRuler === undefined || r === lastRuler) { lastRuler = r; lastGoodTitle = titleOf('player'); return; }
    const was = lastRuler; lastRuler = r;
    const lost = lastGoodTitle && r !== 'player' ? ' Dein Titel „' + lastGoodTitle.name + '“ ist verfallen, der ' + (lastGoodTitle.good ? 'Goldring' : 'rote Ring') + ' ist weg.' : ''; lastGoodTitle = null;
    if (r === 'player') statBump('throne');
    if (r && r !== 'player' && botById[r]) { const bs = loadBotState()[r]; bs.stats = bs.stats || {}; bs.stats.ruled = 1; saveBotState(); }
    if (r === 'player') { flashHint('Du bist Herrscher der Meere! +25 % Münzen und Truppen, blutrot-goldener Ring um deine Basen.', 6000); spawnBattleFx(megaTempleId, true, 'Herrscher!', 'Herrscher der Meere'); }
    else if (was === 'player') flashHint('Du hast den Mega-Tempel verloren – die Krone und der blutrot-goldene Ring sind weg!', 5000);
    else if (r && botById[r]) flashHint(botById[r].name + ' ist jetzt Herrscher der Meere!' + lost, lost ? 6000 : 4000);
    else if (lost) flashHint(lost.trim(), 5000);
    updateHudPlayer(); requestRender();
}
