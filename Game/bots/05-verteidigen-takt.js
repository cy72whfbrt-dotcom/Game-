// Teil 05-verteidigen-takt.js: Mitspieler: Verteidigen, Friedensschild, Hauptstadt verlegen, Titel, Takt
// Under attack (online - offline nobody reacts): a person notices the column after a few seconds (a Späherturm
// helps), works out whether the base holds, and then either sends help from bases that get there in time - or, if
// it can't be held, pulls the garrison out to the nearest base before the enemy arrives. The capital can't fall.
// ==============================================================================================================
// 6) VERTEIDIGEN, FRIEDENSSCHILD, HAUPTSTADT VERLEGEN
// ==============================================================================================================
const botEvacuated = {}, botLossMem = {};

function botNoteLoss(botId, islandId) { if (!botById[botId]) return; const l = botLossMem[botId] || (botLossMem[botId] = []), now = Date.now();
    l.push({ id: islandId, at: now }); while (l.length && (l.length > 40 || now - l[0].at > 6 * 3600000)) l.shift(); }

function botLosses(botId, ms, now) { return (botLossMem[botId] || []).filter(x => now - x.at < ms); }

// Ärger (Alexander 6.10.): jeder Angriff auf eine ihrer Basen, den sie gesehen haben (botDefend), und jede verlorene Basis –
// danach richten sie Hauptstadt (botCapitalPlan) und Truppen (botFrei) wie ein Mensch, der überall Truppen hat.
const botAergerMem = {};
function botAergerNote(botId, id, now) { const l = botAergerMem[botId] || (botAergerMem[botId] = []);
    if (l.some(x => x.id === id && now - x.at < 10 * 60000)) return;                                 // derselbe Angriff: einmal
    l.push({ id, at: now }); while (l.length && (l.length > 40 || now - l[0].at > 2 * 3600000)) l.shift(); }
function botAerger(botId, ms, now) {                    // → Inseln mit Ärger in den letzten ms (ohne die einer alten Karte)
    return (botAergerMem[botId] || []).filter(x => now - x.at < ms).concat(botLosses(botId, ms, now)).map(x => islandById[x.id]).filter(Boolean); }

// Wie stark ein fremder Angriff aussieht (Alexander 5.10., 11b C): ein Mitspieler weiß so wenig wie du – vor dem Kampf nur
// die Truppenzahl, ungefähr (±30 %, je Angriff fest: kein Flackern) und ohne Boni (Held, Fähigkeit, Titel, Forschung);
// kämpft er schon, die echte Stärke (wie im Kampfbericht). Feld-Armeen: ihre Truppenzahl (steht auf der Karte), ohne Boni.
function botSchaetzAngriff(a) {
    if (a.fightEndsAt) return (a.rawTroops + (a.attackBonus || 0)) * (a.atkTitle || 1) * (a.atkKraft || 1);
    const f = .7 + .6 * mulberry32(((a.startedAt || 0) % 2147483647) ^ ((a.targetId || 0) * 7919 + (a.sourceId || 0) * 104729))();
    return Math.round((a.rawTroops || 0) * f);
}
function botSchaetzArmee(x) { return x.troops || 0; }

function botDefend(bot) {
    const owned = botOwnedIslands[bot.id];
    if (!owned || owned.size === 0) return;
    const act = botActOf(bot.id), now = Date.now(); if (now < (act.defNext || 0)) return;      // (paced by its own timer - own columns on the road never block it)
    const notice = 1, threats = new Map(), covered = loadBotState()[bot.id].shieldUntil || 0, wt = 1;
    const see = (id, startedAt, at, str, late) => {
        if (!owned.has(id) || isCapital(id) || (at < covered && shieldCovers(islandById[id]))) return;                                     // (it bounces off the shield anyway)
        if (now - startedAt < (3000 + (startedAt % 9000)) / notice + (at - startedAt) * (late || 0) * wt / 100) return;   // not seen yet (Spurlos: a hero's column is seen later)
        const t = threats.get(id) || { id, str: 0, at: Infinity }; t.str += str; t.at = Math.min(t.at, at); threats.set(id, t);
    };
    for (const a of pendingAttacks) if (a.attackerBotId !== bot.id) see(a.targetId, a.startedAt, a.resolveAt, botSchaetzAngriff(a), a.hx ? a.hx.late : 0);   // (own later waves just move in)
    for (const a of armies) if (a.mv && a.mv.to.kind === 'base') { const w = armyWho(a);                 // a field army marching on the base is on the map too
        if (w !== bot.id) see(a.mv.to.id, a.mv.startedAt, a.mv.resolveAt, botSchaetzArmee(a)); }
    if (!threats.size) return;
    for (const id of threats.keys()) botAergerNote(bot.id, id, now);
    const tapped = () => { act.defNext = now + (botStyle(bot).tapMs || 5000) * (.7 + Math.random() * .6); };   // one defence order at a time (its own pace - it doesn't stop the armies)
    // 1) look at every threat: does it hold, can it be held with help that gets there in time, or is it lost?
    const plans = [];
    for (const th of [...threats.values()].sort((u, v) => u.at - v.at)) {
        const target = islandById[th.id], left = th.at - now; if (left < 1500) continue;
        const coming = pendingSends.filter(x => x.senderBotId === bot.id && !x.back && x.toId === th.id && x.resolveAt < th.at).reduce((s2, x) => s2 + x.troops, 0)
            + pendingAttacks.filter(x => x.attackerBotId === bot.id && x.targetId === th.id && x.resolveAt < th.at).reduce((s2, x) => s2 + x.rawTroops, 0);
        const def = effectiveTroops(target) + effectiveDefense(target) + coming;
        if (def >= th.str * 1.1) continue;                                                               // it holds
        const gap = th.str * 1.2 - def, helpers = [];
        for (const id of owned) {
            if (id === th.id || id === megaTempleId || threats.has(id)) continue;
            const n = Math.floor((islandTroops[id] || 0) * .8), src = islandById[id];
            if (n < BOT_MIN_GARRISON_TO_ATTACK || !landmassesConnected(src.landmassId, target.landmassId) && src.landmassId !== target.landmassId) continue;
            if (src.landmassId !== target.landmassId) { const tl = tollFor(src.landmassId, target.landmassId, n, bot.id); if (tl.closed || tl.cost > (botCoins[bot.id] || 0)) continue; }   // shut gate / toll it can't pay
            if (travelDurationSeconds(src, target, bot.id) * 1000 > left - 500) continue;                // wouldn't make it
            helpers.push({ id, n });
        }
        helpers.sort((u, v) => v.n - u.n);
        plans.push({ th, target, def, gap, helpers, can: helpers.reduce((s2, h) => s2 + h.n, 0) });
    }
    // 2) several bases, a big share of the empire, or a string of losses at once: a careful person may switch the shield on
    const lost = plans.filter(p => p.def + p.can < p.th.str && shieldCovers(p.target)).map(p => p.th);   // (the shield only saves towers)
    if (lost.length && botShieldCrisis(bot, now, lost)) { tapped(); return; }
    // 3) otherwise help where it can be held, pull the troops out where it can't
    for (const { th, target, def, gap, helpers, can } of plans) {
        if (can >= gap || (def < th.str && def + can >= th.str)) {                                        // can be held (with what gets there in time): the biggest helper goes first
            for (const h of helpers) { const k = pendingSends.length; launchSend(h.id, th.id, bot.id, Math.min(h.n, Math.ceil(gap * 1.1))); if (pendingSends.length > k) { tapped(); return; } }   // (kein Marsch-Platz, Maut …: der nächste Helfer)
            continue;
        }
        if (def + can >= th.str) continue;                                                                 // it repels the strike on its own: never hand over a base that holds
        if (botEvacuated[th.id] && now - botEvacuated[th.id] < 60000) continue;
        if ((islandTroops[th.id] || 0) < BOT_MIN_GARRISON_TO_ATTACK * 10) continue;                      // nothing worth saving
        let best = null, bd = Infinity;                                                                  // lost anyway: the troops get out in time
        for (const id of owned) { if (id === th.id || threats.has(id)) continue; const b = islandById[id];
            if (!landmassesConnected(target.landmassId, b.landmassId) && b.landmassId !== target.landmassId) continue;
            if (b.landmassId !== target.landmassId) { const tl = tollFor(target.landmassId, b.landmassId, islandTroops[th.id] || 0, bot.id); if (tl.closed || tl.cost > (botCoins[bot.id] || 0)) continue; }
            const d = Math.hypot(b.x - target.x, b.y - target.y); if (d < bd) { bd = d; best = id; } }
        if (best === null) continue;
        const k = pendingSends.length; launchSend(th.id, best, bot.id);
        if (pendingSends.length > k) { botEvacuated[th.id] = now; tapped(); return; }                     // nur, wenn der Marsch wirklich losging
    }
}

// ===== FRIEDENSSCHILD of the other players: bought with gems like yours, switched on like a person would =====
// Going to bed with something to lose, or when a force is on its way that can't be stopped - not constantly, never
// while holding the throne. While it stands they don't attack (the next attack would drop it) and bring the armies home.
function botShieldUser(bot) { const idn = parseInt(bot.id.slice(3), 10) || 0; return mulberry32(idn * 4421 + 99)() < (BOT_STYLES[bot.style].shield ?? .5); }

function botClock(bot, now) { const idn = parseInt(bot.id.slice(3), 10) || 0, h = now / 3600000 + (idn * 7.37) % 24; return { hour: h % 24, day: Math.floor(h / 24) }; }   // the same day as botOnline

function botUseShield(bot, why, needMs, now) {
    const b = loadBotState()[bot.id], has = h => b.shields[h] > 0 || b.gems >= SHIELD_PRICES[h];
    const h = [2, 8, 24].find(x => x * 3600000 >= needMs * .9 && has(x)) || [24, 8, 2].find(has); if (!h) return false;
    if (b.shields[h] > 0) b.shields[h]--; else b.gems -= SHIELD_PRICES[h];                           // in a hurry a person buys one right there
    b.shieldUntil = Math.max(now, b.shieldUntil || 0) + h * 3600000; b.shieldWhy = why; b.shieldAt = now; botStat(bot.id, 'shields');
    b.shieldKeep = why !== 'night' || Math.random() > (botStyle(bot).hunt || .5) * .5;
    const act = botActOf(bot.id); if (act.plan && act.plan.kind === 'attack') act.plan = null; b.rally = null;
    for (const a of armies) if (a.who === bot.id) { a.until = Math.min(a.until || now, now - 1);      // the armies out there come home - also one already marching (arriving would drop the shield)
        if (a.mv && a.mv.to.kind !== 'home') { const h = armyHome(a), hb = h !== null && h !== undefined && islandById[h]; if (!hb || armyMove(a, { kind: 'home', id: h, x: hb.x, y: hb.y, lm: hb.landmassId })) armyHalt(a, now); } }
    for (let i = pendingAttacks.length - 1; i >= 0; i--) { const a = pendingAttacks[i]; if (a.attackerBotId !== bot.id || a.fightEndsAt || a.rally) continue;   // its own columns on the road turn round and walk home, like yours (a Rally belongs to everyone in it)
        const back = botOwnedIslands[bot.id].has(a.sourceId) ? a.sourceId : botCapitalOf(bot.id); if (back === null || back === undefined) continue;
        heroWutZurueck(bot.id, a.hx); pendingAttacks.splice(i, 1);                                     // (nicht gekämpft: die Wut bleibt)
        pendingSends.push({ fromId: a.targetId, toId: back, troops: a.rawTroops, startedAt: now, resolveAt: now + Math.max(1000, Math.min(now, a.resolveAt) - a.startedAt), senderBotId: bot.id, back: true }); }
    const own = botOwnedIslands[bot.id];
    const mine = pendingAttacks.filter(a => !a.attackerBotId && !a.fightEndsAt && own.has(a.targetId) && shieldCovers(islandById[a.targetId])).length
               + armies.filter(a => armyWho(a) === 'player' && a.mv && a.mv.to.kind === 'base' && own.has(a.mv.to.id) && shieldCovers(islandById[a.mv.to.id])).length;
    if (mine) flashHint('Friedensschild bei ' + bot.name + ' (noch ' + fmtHours(b.shieldUntil - now) + ') – ' +
        (mine === 1 ? 'dein Angriff prallt' : 'deine ' + mine + ' Angriffe prallen') + ' ab.', 5500);
    saveBotState(); saveArmies(); saveGame(); renderActiveMarches(); requestRender(); return true;
}

function botShieldNight(bot, now) {                     // bedtime: a careful person with something to lose switches one on
    const b = loadBotState()[bot.id], c = botClock(bot, now);
    if (c.hour < 22.5 || b.shieldNight === c.day) return false; b.shieldNight = c.day;                // one thought per evening
    if (!botShieldUser(bot) || rulerOwner() === bot.id || botOwnedIslands[bot.id].size < 8) return false;
    const sleepMs = (24 - c.hour + 7) * 3600000; if ((b.shieldUntil || 0) - now >= sleepMs * .8) return false;
    const own = botOwnedIslands[bot.id];
    const worried = botLosses(bot.id, 6 * 3600000, now).length > 0 || botMood(bot.id) < -.3 || pendingAttacks.some(a => a.attackerBotId !== bot.id && own.has(a.targetId));
    return Math.random() < (worried ? .9 : .4) && botUseShield(bot, 'night', sleepMs, now);
}

const botCrisisCalm = {};                              // decided to ride it out: no second thought for half an hour

function botShieldCrisis(bot, now, lost) {             // lost: [{id, str, at}] - neither holdable nor reinforceable in time
    const b = loadBotState()[bot.id], own = botOwnedIslands[bot.id], last = Math.max(...lost.map(t => t.at));
    if (b.shieldUntil > last || rulerOwner() === bot.id || now < (botCrisisCalm[bot.id] || 0)) return false;
    if (b.shieldWhy !== 'night' && now - (b.shieldAt || 0) < 8 * 3600000) return false;                // a crisis shield is rare, not every few hours
    const val = id => (islandLevels[id] || 1) * (islandById[id].type === 'tower' ? 1 : 4);
    let total = 0; for (const id of own) total += val(id);
    const stake = lost.reduce((s2, t) => s2 + val(t.id), 0), recent = botLosses(bot.id, 15 * 60000, now).length;
    const bad = lost.length >= 3 || stake >= total * .12 || (lost.length >= 2 && lost.some(t => islandById[t.id].type !== 'tower'))
             || recent + lost.length >= Math.max(6, own.size * .08) || ownerWeak(bot.id, now);   // a lost gate alone, or a normal bad quarter-hour, is no crisis
    if (!bad || (!botShieldUser(bot) && !(lost.length >= 5 || stake >= total * .3))) return false;
    if (Math.random() >= .4) { botCrisisCalm[bot.id] = now + 30 * 60000; return false; }             // not everyone reaches for the shield
    return botUseShield(bot, 'crisis', last - now + 30 * 60000, now);
}

// ===== HAUPTSTADT VERLEGEN (the others): 50 gems like yours, a tower of their own, the garrison moves along.
// Why a person does it: the land around the capital is being lost (retreat), trouble further back - several attacks or
// lost bases in a short time - so it moves close to help (hilfe, Alexander 6.10.), the front has moved towards the middle
// and it is calm (forward, 1-3 rings), or most of the empire now lies elsewhere (mass). Nach vorne oder zurück, je nach
// Lage – ab 6 eigenen Türmen in der Nähe. The wish has to hold for a few minutes, then one tap - never into a fight that
// is already on its way; at most once in 45 minutes (to help: after 15), so nobody jumps back and forth.
const BOT_CAP_EVAL_MS = 75000, BOT_CAP_COOLDOWN = 45 * 60000, BOT_CAP_HILFE = 15 * 60000, BOT_CAP_GAP = 20000;

let botCapLastAny = 0; const botCapNext = {};

function botCapLocal(botId, t) { const R = ISLAND_RADIUS * 25; let o = 0, f = 0;
    for (const l of reachableLandmassIds[t.landmassId] || [t.landmassId]) for (const i of islandsByLandmass[l] || []) {
        if (i.type !== 'tower' || i.id === t.id || Math.abs(i.x - t.x) > R || Math.abs(i.y - t.y) > R || Math.hypot(i.x - t.x, i.y - t.y) > R) continue;
        const w = islandOwnerOf(i.id); if (w === botId) o++; else if (w) f++; }
    return { o, f, s: o / Math.max(1, o + f) }; }

function botCapitalMoveOk(botId, toId, busy) {          // your rules + not into a fight that is already on its way
    const to = islandById[toId];
    if (!to || !botOwnedIslands[botId].has(toId) || toId === botCapitalOf(botId) || to.type !== 'tower' || landmasses[to.landmassId].ring === 0) return false;
    if (busy ? busy.has(toId) : pendingAttacks.some(a => a.targetId === toId)) return false;
    if (armies.some(a => armyWho(a) !== botId && (a.t === toId || (a.mv && a.mv.to.kind === 'base' && a.mv.to.id === toId)))) return false;
    return !(wander && wander.to === toId); }

function botCapitalPlan(bot, now) {                      // → { to, why } | null
    const own = botOwnedIslands[bot.id], capId = botCapitalOf(bot.id), cap = islandById[capId]; if (!cap || own.size < 10) return null;
    const busy = new Set(pendingAttacks.map(a => a.targetId)), mine = {};
    for (const id of own) { const l = islandById[id].landmassId; mine[l] = (mine[l] || 0) + 1; }
    const reach = t => { let s2 = 0; for (const l in mine) { const d = Math.hypot(landmasses[l].x - t.x, landmasses[l].y - t.y) / HEX_SPACING; s2 += mine[l] * (d < .8 ? 1 : d < 1.6 ? .5 : 0); } return s2; };
    const capRing = landmasses[cap.landmassId].ring, here = botCapLocal(bot.id, cap), capReach = reach(cap), dCap = i => Math.hypot(i.x - cap.x, i.y - cap.y);
    const lost = botLosses(bot.id, 15 * 60000, now).filter(x => dCap(islandById[x.id]) < ISLAND_RADIUS * 37).length;
    const cand = [];
    for (const id of own) { const t = islandById[id]; if (t.type !== 'tower' || id === capId || !botCapitalMoveOk(bot.id, id, busy)) continue;
        const loc = botCapLocal(bot.id, t); if (loc.o < 3 || loc.s < .5) continue;
        cand.push({ id, t, ring: landmasses[t.landmassId].ring, loc, reach: reach(t), lv: islandLevels[id] || 1 }); }
    const best = (l, f) => l.reduce((a, c) => !a || f(c) > f(a) ? c : a, null), fest = cand.filter(c => c.loc.o >= 6 && c.loc.s >= .6);
    if (here.s < .4 || (lost >= 3 && here.s < .6)) { const c = best(fest.filter(c => c.loc.s >= .75), c => c.reach * c.loc.s + c.lv * .1); if (c) return { to: c.id, why: 'retreat' }; }
    const hinten = botAerger(bot.id, 20 * 60000, now).filter(i => dCap(i) >= ISLAND_RADIUS * 37);   // Ärger weiter weg: dorthin, helfen
    if (hinten.length >= 3) { const mx = hinten.reduce((s2, i) => s2 + i.x, 0) / hinten.length, my = hinten.reduce((s2, i) => s2 + i.y, 0) / hinten.length;
        const dM = c => Math.hypot(c.t.x - mx, c.t.y - my), c = best(cand.filter(c => dM(c) < Math.hypot(cap.x - mx, cap.y - my) * .5), c => -dM(c) + c.loc.o * ISLAND_RADIUS);
        if (c) return { to: c.id, why: 'hilfe' }; }
    const ruhig = botAerger(bot.id, 30 * 60000, now).length < 2;                                       // nach vorne nur, wenn hinten Ruhe ist
    const fwd = ruhig ? fest.filter(c => c.ring <= capRing - 1 && c.ring >= capRing - 3) : [];
    if (fwd.length) return { to: best(fwd, c => c.loc.o * c.loc.s + c.reach * .3 + (capRing - c.ring) * 4 + c.lv * .1).id, why: 'forward' };
    const m = best(fest, c => c.reach + c.lv * .1);
    return m && m.reach >= capReach * 1.6 && m.loc.o > here.o ? { to: m.id, why: 'mass' } : null; }

function botTeleportCapital(bot, toId) {
    const b = loadBotState()[bot.id], from = botCapitalOf(bot.id);
    if (!botCapitalMoveOk(bot.id, toId) || b.gems < TELEPORT_GEMS) return false;
    b.gems -= TELEPORT_GEMS;
    islandTroops[toId] = (islandTroops[toId] || 0) + (islandTroops[from] || 0); islandTroops[from] = 0;     // the garrison moves along, like yours
    b.capital = toId; b.capMovedAt = Date.now(); b.capWish = null; botStat(bot.id, 'teleports'); if (b.rally && b.rally.at === from) b.rally = null;
    { const act = botActOf(bot.id); if (act.plan && act.plan.kind === 'send' && act.plan.t === from) act.plan = null; }
    capitalCache = null;                                                                                    // isCapital() caches for 250 ms
    saveBotState(); saveGame(); requestRender(); botCapitalNotice(bot, from, toId); return true; }

function botCapitalNotice(bot, fromId, toId) {          // only news if it happens next to you
    const near = isl => { for (const l of reachableLandmassIds[isl.landmassId] || [isl.landmassId]) for (const i of islandsByLandmass[l] || [])
        if (ownedIslands.has(i.id) && Math.hypot(i.x - isl.x, i.y - isl.y) < ISLAND_RADIUS * 40) return true; return false; };
    const to = islandById[toId], nt = near(to), nf = near(islandById[fromId]);
    if (nt) flashHint(bot.name + ' hat die Hauptstadt nach Turm #' + (toId + 1) + ' verlegt – nah bei dir.', 5500);
    else if (nf) flashHint(bot.name + ' hat die Hauptstadt verlegt – Turm #' + (fromId + 1) + ' ist keine Hauptstadt mehr.', 5000);
    if ((nt || nf) && islandSeen(to)) spawnBattleFx(toId, false, 'Hauptstadt', 'hierher verlegt');
    if (isPanelOpen(popup) && (popupIslandId === fromId || popupIslandId === toId)) renderPopup(); }

function botConsiderCapital(bot, now) {
    const b = loadBotState()[bot.id], act = botActOf(bot.id);
    if (now >= (botCapNext[bot.id] ?? (botCapNext[bot.id] = now + Math.random() * 10 * 60000))) {
        botCapNext[bot.id] = now + BOT_CAP_EVAL_MS * (.8 + Math.random() * .4);
        const seit = now - (b.capMovedAt || 0), pl0 = (b.rally && b.rally.at === botCapitalOf(bot.id)) || seit < BOT_CAP_HILFE ? null : botCapitalPlan(bot, now);
        const pl = pl0 && (pl0.why === 'hilfe' || seit >= BOT_CAP_COOLDOWN) ? pl0 : null, w = b.capWish;   // helfen geht schon nach 15 Min., alles andere nach 45
        if (!pl) b.capWish = null;
        else if (!w || w.why !== pl.why || islandById[w.to].landmassId !== islandById[pl.to].landmassId)
            b.capWish = { to: pl.to, why: pl.why, since: now, wait: (pl.why === 'retreat' || pl.why === 'hilfe' ? 60 : 180 + Math.random() * 300) * 1000 };
        else w.to = pl.to;
        saveBotState(); }
    const w = b.capWish, capNow = botCapitalOf(bot.id);
    if (!w || now - w.since < w.wait || now < act.next || now - botCapLastAny < BOT_CAP_GAP || b.gems < TELEPORT_GEMS) return;
    if ((b.rally && b.rally.at === capNow) || (act.plan && act.plan.kind === 'send' && act.plan.t === capNow)) return;   // troops are being gathered at the capital: not now
    if (!botCapitalMoveOk(bot.id, w.to)) { b.capWish = null; return; }
    if (botTeleportCapital(bot, w.to)) { botCapLastAny = now; botTapped(bot); } }

function botKeepsShield(bot, now) {                    // under their own shield a person doesn't attack - until it's nearly over
    const b = loadBotState()[bot.id], left = (b.shieldUntil || 0) - now;
    if (left <= 10 * 60000) return false;
    if (b.shieldWhy === 'night' && !b.shieldKeep && botClock(bot, now).hour >= 7.5 && botClock(bot, now).hour < 22) return false;   // up again and wants to play (the next attack drops it)
    return true;
}

// ===== HANDY-MELDUNG: angegriffen, während sie offline sind =====
// Wie ein Mensch mit Benachrichtigung auf dem Handy: ein Angriff auf eine ihrer Basen meldet sich, sie schauen aber
// erst nach einer Weile in die App – tagsüber meist nach 2–30 Minuten, manchmal erst nach 1–2 Stunden (Arbeit, Schule),
// nachts fast immer erst am Morgen. Dann sind sie ein paar Minuten da und machen, was sie auch sonst online bei Gefahr
// tun (botDefend: Hilfe schicken, Truppen rausziehen, Schild; Rache …) – danach wieder weg. Ist der Angriff schneller,
// ist die Basis weg. Gemerkt im Spielstand der Mitspieler (übersteht einen Neustart): b.handy = { k: der neueste
// gemeldete Angriff (Startzeit), n: gemeldet um, r: schaut nach um, bis: da bis (0 = noch nicht entschieden, -1 = nichts zu tun) }.
function botHandyLage(now) {                          // Mitspieler → Startzeit des neuesten Angriffs auf eine ihrer Basen (einmal pro Takt)
    const m = new Map(), note = (id, who, at, an) => {
        const ow = islandOwnerOf(id), bot = ow && botById[ow]; if (!bot || bot.mensch || ow === who) return;
        if (ownerShieldUntil(ow) > an && shieldCovers(islandById[id])) return;     // prallt am Schild ab: keine Sorge
        if (at > (m.get(ow) || 0)) m.set(ow, at);
    };
    for (const a of pendingAttacks) note(a.targetId, a.attackerBotId || 'player', a.startedAt || now, a.resolveAt || now);
    for (const x of armies) if (x.mv && x.mv.to && x.mv.to.kind === 'base') note(x.mv.to.id, armyWho(x), x.mv.startedAt || now, x.mv.resolveAt || now);
    return m;
}

function botHandy(bot, now, lage) {
    const b = loadBotState()[bot.id], neu = lage.get(bot.id) || 0; let h = b.handy;
    if (h && h.bis === 0 && now >= h.r) {                                          // jetzt schauen sie aufs Handy
        const r = mulberry32((parseInt(bot.id.slice(3), 10) || 0) * 6007 + Math.floor(h.k / 1000))(), los = botLosses(bot.id, now - h.n + 60000, now).length;
        h.bis = Math.round(neu ? now + (4 + r * 6) * 60000 : los ? now + (2 + r * 3) * 60000 : -1);   // noch Gefahr: ein paar Minuten da; schon verloren: kurz den Schaden ansehen; alles gut: gleich wieder weg
        saveBotState();
    }
    if (h && h.bis > 0 && now >= h.r && now < h.bis) { if (neu > h.k) { h.k = neu; saveBotState(); } return; }   // gerade da: sie sehen alles selbst
    if (!neu) { if (h && h.bis !== 0) { delete b.handy; saveBotState(); } return; }   // nichts mehr unterwegs: vergessen (sparsam)
    if (h && (neu <= h.k || h.bis === 0)) return;                                 // schon gemeldet, oder sie haben noch nicht nachgeschaut
    if (botOnlinePlan(bot, now)) return;                                           // ohnehin online: sie sehen es selbst
    const idn = parseInt(bot.id.slice(3), 10) || 0, rnd = mulberry32(idn * 7919 + Math.floor(neu / 1000)), c = botClock(bot, now);   // fest pro Mitspieler und Angriff
    const u1 = rnd(), u2 = rnd(), u3 = rnd(), act = BOT_STYLES[bot.style].act || .6;
    let r;
    if (c.hour < 7 || (c.hour >= 23 && u1 < .5)) {                                 // schläft (Handy leise): selten wach, sonst erst am Morgen
        r = u2 < .12 ? now + (3 + u3 * 37) * 60000 : now + ((c.hour < 7 ? 7 - c.hour : 31 - c.hour) * 60 + u3 * 75) * 60000;
    } else if (u2 < (.32 - act * .2)) r = now + (45 + u3 * 105) * 60000;   // auf der Arbeit / unterwegs: sieht es erst viel später
    else r = now + (2 + 28 * Math.pow(u3, 1.6)) * 60000;                          // meist ein paar Minuten
    if (h && h.bis > 0) r = Math.max(r, h.bis + 10 * 60000);                      // gerade erst weggelegt: nicht gleich wieder
    b.handy = { k: neu, n: now, r: Math.round(r), bis: 0 }; saveBotState();
}

// Faster than before so a bot notices and reacts to an incoming
// attack (botDefend) before it can resolve, instead of only
// reconsidering once every 9 seconds.
// ==============================================================================================================
// 7) TITEL VERTEILEN, NEUSTART, DER TAKT (runBotTick)
// ==============================================================================================================
const BOT_TICK_MS = 1000;

function botRulerTitles(bot, now) {               // a bot on the throne hands out titles like a person: whoever keeps attacking it gets a penalty, the peaceful ones the buffs - looked at every 3 min
    const t = loadTitles(); if (t.ruler !== bot.id) return; now = now || Date.now();
    if (Object.keys(t.by).length && now - (t.at || 0) < 3 * 60000) return;
    const b = loadBotState()[bot.id], mine0 = titleOf('player');
    const hitting = {}; for (const a of pendingAttacks) { const w = a.attackerBotId || 'player'; if (w !== bot.id && islandOwnerOf(a.targetId) === bot.id) hitting[w] = (hitting[w] || 0) + 1; }   // attacking me right now
    const others = BOT_DEFS.filter(x => x.id !== bot.id && botOwnedIslands[x.id].size).map(x => x.id).concat(ownedIslands.size ? ['player'] : []);
    const size = w => w === 'player' ? ownedIslands.size : botOwnedIslands[w].size;
    const sc = others.map(w => ({ w, a: botAnnoyOf(b, w, now) + (hitting[w] ? 3 + hitting[w] : 0), n: size(w) }));
    const foes = sc.filter(x => x.a >= .5).sort((x, y) => y.a - x.a || y.n - x.n);                                  // the most annoying first
    const calm = sc.filter(x => x.a < .5).sort((x, y) => x.a - y.a || y.n - x.n);                                    // the peaceful ones, the strong first (good to have as friends)
    const bad = TITLES.filter(x => !x.good), good = TITLES.filter(x => x.good), pick = [];
    t.by = {}; t.at = now;
    const filler = calm.filter(x => x.w !== 'player' && !(botById[x.w] && botById[x.w].mensch)).reverse();          // not enough foes: the weakest of the rest - never a real player for nothing
    bad.forEach((x, i) => { const f = foes[i] || filler[i - foes.length]; if (f && !pick.includes(f.w)) { giveTitle(x.key, f.w); pick.push(f.w); } });
    const friends = calm.filter(x => !pick.includes(x.w));
    good.forEach((x, i) => { if (friends[i]) giveTitle(x.key, friends[i].w); });
    const mine = titleOf('player'), why = hitting.player ? ' – du greifst gerade an' : botAnnoyOf(b, 'player', now) >= .5 ? ' – deine Angriffe sind nicht vergessen' : mine && mine.good ? ' – du hast Ruhe gegeben' : '';   // (no he/she: names don't say which)
    if (mine && (!mine0 || mine0.key !== mine.key)) flashHint('Titel „' + mine.name + '“ von ' + bot.name + why + ': ' + mine.desc + '.', 6500);
    else if (mine0 && !mine) flashHint(bot.name + ' hat dir den Titel „' + mine0.name + '“ wieder genommen.', 5000);
    saveTitles();
}

function botRespawn(bot, now) {                   // knocked out: like a player starting over, back after ~10 min on a free outer base
    const b = loadBotState()[bot.id];
    if (!b.outAt) { b.outAt = now; saveBotState(); return; }
    if (now - b.outAt < 600000 || now < (b.outNext || 0) || !botOnline(bot, now)) return;
    b.outNext = now + 60000;                                                                    // kein Platz frei: erst in einer Minute wieder suchen (nicht jede Sekunde die ganze Karte)
    const edge = i => i.type === 'tower' && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring >= 3 && !bossAt(i.id);
    let free = islands.filter(i => edge(i) && !islandOwnerOf(i.id));
    if (!free.length) { const big = BOT_DEFS.filter(x => x.id !== bot.id && !x.mensch && !(ownerShieldUntil(x.id) > now)).sort((u, v) => botOwnedIslands[v.id].size - botOwnedIslands[u.id].size)[0];   // the map is full: a fresh start on the edge of the biggest empire
        free = big && botOwnedIslands[big.id].size >= 40 ? [...botOwnedIslands[big.id]].map(id => islandById[id]).filter(i => edge(i) && !isCapital(i.id) && !pendingAttacks.some(a => a.targetId === i.id)) : []; }
    if (!free.length) return;
    const t = free[Math.floor(Math.random() * free.length)]; clearIslandOwner(t.id);
    botOwnedIslands[bot.id].add(t.id); islandLevels[t.id] = 1; islandTroops[t.id] = PLAYER_START_TROOPS; b.outAt = 0; b.outNext = 0; b.capital = t.id; b.capMovedAt = now; b.capWish = null; capitalCache = null;
    b.shieldUntil = now + 3600000; b.shieldWhy = 'start'; b.shieldAt = now;                   // an hour of peace to get going (a lone base in someone's land would fall at once)
    if (window.WELT) b.neuBis = now + NEULING_MS;                                                // Neustart: wieder Anfängerschutz (wie jeder Neue)
    saveBotState(); saveGame();
}

const botNextAt = {};

function runBotTick() {
    const now = Date.now();
    if (window.WELT && !WELT.leiter) { setTimeout(runBotTick, BOT_TICK_MS); return; }   // nur der Weltrechner lässt die Mitspieler denken
    let lage = null;                                                          // (Angriffe auf ihre Basen, für die Handy-Meldung)
    try { lage = botHandyLage(now); } catch (e) { if (!runBotTick.warnedH) { runBotTick.warnedH = true; console.warn('Handy-Lage', e); } }
    for (const bot of BOT_DEFS) {
        if (bot.mensch) continue;                                             // echte Spieler spielen selbst
        try {                                                                 // one bot's bad move must never stop all the others
            botCityFinish(bot, now);                                          // builds finish on time, online or not
            if (AUF) { const fc = loadBotState()[bot.id].city; if (fc && fc.foRun && now >= fc.foRun.endsAt) AUF.foFertig(bot.id); }   // Forschung auch
            if (botOwnedIslands[bot.id].size === 0) { botRespawn(bot, now); continue; }
            if (lage) botHandy(bot, now, lage);                               // angegriffen, während sie weg sind: die Meldung aufs Handy
            if (!botOnline(bot, now)) continue;                               // offline: the empire keeps producing, nobody acts
            if (now < (botNextAt[bot.id] || 0)) continue;
            const st = BOT_STYLES[bot.style];
            botNextAt[bot.id] = now + (st.moveMs ? st.moveMs * (.6 + Math.random() * .8) : 3000 + Math.random() * 9000);   // a few seconds between moves, never all at once
            botShieldNight(bot, now);
            botDefend(bot);
            botConsiderCapital(bot, now);
            botThink(bot);
            botHeal(bot);
            if (Math.random() < .2) botClaimGoals(bot);
            botCityBuild(bot, now);
            if (AUF) AUF.botForschung(bot, now);   // Labor (aufbau.js)
            botConsiderUpgrade(bot);
            botRulerTitles(bot, now);
            if (Math.random() < .3) botShop(bot);
        } catch (e) { if (!runBotTick.warned) { runBotTick.warned = true; console.warn('bot move failed', bot.id, e); } }
    }
    setTimeout(runBotTick, BOT_TICK_MS);
}

