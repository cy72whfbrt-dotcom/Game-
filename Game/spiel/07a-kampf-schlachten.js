// Teil 07a-kampf-schlachten.js: Schlachten auf der Karte (auch Zuschauer-Anzeige) und Kampf-Effekte
// ===== BATTLES ON THE MAP =====
// When a fight the player is part of resolves, it plays out at the base itself: the arriving column
// forms up, the garrison steps out, they clash, soldiers fall in proportion to the real losses,
// troop counts tick down with floating losses, then the result ribbon (spawnBattleFx) appears.
var mapBattles = [];
const MB_MS = 4200, MB_SLOW = 0.6, MB_HOLD = 2700; // ≈ 7 s on screen · a live fight keeps fighting at MB_HOLD until it is decided
function mbT(b, now) { return b.t0 + (now - b.anchor) * b.slow; }                  // choreography clock (slowed ms)
function mbReplan(b, o) {                       // new numbers (reinforcements, or the real result): the counters follow from here on
    Object.assign(b, { my: o.my, myLoss: o.myLoss, en: o.en, enLoss: o.enLoss, won: o.won });
}
function spawnMapBattle(o) {
    sfx('clash');
    const src = islandById[o.sourceId], tgt = islandById[o.targetId]; if (!src || !tgt) { o.onEnd && o.onEnd(); return; }
    o.atkWho = o.atk === 'mine' ? 'player' : o.atk === 'bot' ? islandOwnerOf(src.id) : null;   // whose arms fly on each side (before the base changes hands)
    o.defWho = o.def === 'mine' ? 'player' : o.def === 'bot' ? islandOwnerOf(tgt.id) : null;
    const path = marchPath(src, tgt), from = path[path.length - 2];
    const dx = tgt.x - from.x, dy = tgt.y - from.y, l = Math.hypot(dx, dy) || 1, now = performance.now();
    const b = Object.assign({}, o, { x: tgt.x, y: tgt.y, ux: dx / l, uy: dy / l, born: now, t0: 0, anchor: now, final: !o.live,
        slow: o.live ? MB_HOLD / Math.max(2500, o.fightMs) : MB_SLOW, done: false });   // a live fight fills its whole duration, then waits for the result
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
    const near = mapState.zoom >= 0.006;
    for (const b of mapBattles.slice()) {
        const rt = now - b.born, t = b.final ? mbT(b, now) : Math.min(MB_HOLD, mbT(b, now));   // choreography runs slowed down, motion cycles in real time
        if (t > MB_MS) { b.done = true; mapBattles.splice(mapBattles.indexOf(b), 1); if (b.onEnd) b.onEnd(); continue; }
        if (!b.final && b.attackId && !pendingAttacks.some(a => kampfKey(a) === b.attackId)) {
            if (window.WELT && !rechnet()) { const n = performance.now(); b.t0 = Math.min(MB_HOLD, mbT(b, n)); b.anchor = n; b.slow = MB_SLOW; b.final = true; }   // Zuschauer: der Weltrechner hat entschieden → zu Ende spielen
            else { mapBattles.splice(mapBattles.indexOf(b), 1); continue; }   // its attack was resolved without a finish (base changed hands mid-fight)
        }
        const tx = b.x * mapState.zoom + mapState.offsetX, ty = b.y * mapState.zoom + mapState.offsetY;
        if (tx < -120 || ty < -120 || tx > viewW + 120 || ty > viewH + 120) continue;
        if (!near) mzKampfFern(tx, ty, rt);          // far out: a small pulsing fight marker at the base
        else mzKampf(b, t, tx, ty);                  // 03f: Kampf-Kreis, Armeen im Halbkreis, Verteidiger, Tafel, Geschosse, Verluste
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
function drawBattleFx(now) {       // screen space (setScreen active)
    battleFx = battleFx.filter(f => now - f.born < FX_MS);
    for (const f of battleFx) {
        const ms = now - f.born;
        const sx = f.x * mapState.zoom + mapState.offsetX, sy = f.y * mapState.zoom + mapState.offsetY;
        if (sx < -200 || sy < -200 || sx > viewW + 200 || sy > viewH + 200 || !isCellOpen(f.x, f.y)) continue;
        const hot = f.good ? '255,214,120' : '255,110,80';
        ctx.save();
        if (f.tp) { tpFxZeichnen(f, ms, sx, sy); ctx.restore(); continue; }   // Teleport: Lichtsäule (08d2)
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
        if (f.good && ms > 200 && ms < 1000) { const k = (ms - 200) / 800; ctx.globalAlpha = Math.sin(k * Math.PI); mzBildAn('marsch_sieg_blitz', sx, sy - 30, 120 + 80 * k); ctx.globalAlpha = 1; }   // Sieg: Lichtstrahl-Blitz (KI-Bild)
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
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over';
            mzErgebnisBand(f, Math.max(0, alpha), scale, sx, sy);   // (03f: Band über dem Kampfort)
        }
        ctx.restore();
    }
    if (battleFx.length) liveAnimation = true;
}

