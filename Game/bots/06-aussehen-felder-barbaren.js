// Teil 06-aussehen-felder-barbaren.js: Mitspieler: Aussehen, Statistik, Thron-Shop, Felder und Armeen
// ==============================================================================================================
// 8) AUSSEHEN, STATISTIK, THRON-SHOP
// ==============================================================================================================
function botLook(botId) {                            // → { frame, title }: Rahmen = Titel (05a RAHMEN, Alexander 6.10.) – die Mitte geht vor
    const b = loadBotState()[botId]; if (!b) return { frame: 'bronze', title: 'Neuling' };
    if (b.mensch) return rahmenVon(botId, b.lookFrame);   // echter Spieler: was er angelegt hat (nur Rahmen, die er hat – der Weltrechner hält sie gegen sein Hauptbuch)
    if (!b.lookMig) { const own = botOwnedIslands[botId], r = Math.max(b.bestRank || 0, rankIndexFor(own ? own.size : 0)), st = b.stats || {}, cityMin = Math.min(...BOT_BUILDINGS.filter(k => !BOT_MIN_AUSNAHME.includes(k)).map(k => b.city.levels[k] || 0));   // once: what they had by rank and deeds stays theirs
        const ach = { cap100: (st.caps || 0) >= 100, cap1000: (st.caps || 0) >= 1000, def25: (st.defs || 0) >= 25, boss1: (st.bosses || 0) >= 1, emma10: (st.pvp || 0) >= 10, city5: cityMin >= 5, throne: !!st.ruled };
        b.frames = [...new Set([...(b.frames || []), ...RAHMEN.filter(x => !x.frei && !x.platz && (x.ach ? ach[x.ach] || (b.achLook || []).includes(x.ach) : (x.rank || 0) <= r)).map(x => x.id)])]; b.lookMig = 1; saveBotState(); }
    // sie tragen, was sie haben: einen Saison-Rahmen zuerst, sonst einen ihrer drei besten (jeder hat seinen Liebling)
    const own = RAHMEN.filter(x => rahmenHat(botId, x)), sz = own.find(x => x.platz), idn = parseInt(botId.slice(3), 10) || 0, alt = own.filter(x => !x.platz);
    const pick = sz || alt[alt.length - 1 - Math.floor(mulberry32(idn * 31 + alt.length)() * Math.min(3, alt.length))];
    return rahmenVon(botId, pick ? pick.id : 'bronze');
}
// Erfolge: the same list as yours (ACHIEVEMENTS), counted from their own numbers - each one collected once for its gems, one at a time like a person tapping
const BOT_GOAL_VAL = {
    captures: (b, st) => st.caps, empire: (b, st, id) => (botOwnedIslands[id] || new Set()).size, defends: (b, st) => st.defs, pvp: (b, st) => st.pvp, bosses: (b, st) => st.bosses,
    temples: (b, st) => st.temples, throne: (b, st) => st.ruled ? 1 : 0, throneMin: (b, st) => st.throneMin, throneEarned: (b, st) => st.tpEarned, scouts: (b, st) => st.scouts,
    cityMin: b => Math.min(...BOT_BUILDINGS.filter(k => !BOT_MIN_AUSNAHME.includes(k)).map(k => b.city.levels[k] || 0)),   // (the newer Lager doesn't count, like yours)
    baseTop: (b, st, id) => goalBaseTop(id), gates: (b, st, id) => goalGates(id), tolls: (b, st) => st.tolls, tollCoins: (b, st) => st.tollCoins,
    armyWins: (b, st) => st.armyWins, heroes: (b, st, id) => goalHeroes(id), heroStars: (b, st, id) => goalHeroStars(id), heroFires: (b, st) => st.heroFires,
    healed: (b, st) => st.healed, shields: (b, st) => st.shields, teleports: (b, st) => st.teleports, barb: (b, st) => st.barb, dboss: (b, st) => st.dboss,
    burg: (b, st, id) => AUF ? AUF.burgStufe(id) : b.city.levels.keep || 1, foStufen: (b, st, id) => AUF ? AUF.foSumme(id) : 0, drache: (b, st) => st.drache, inv: (b, st) => st.inv,
    saisonTop: b => new Set([...(b.sTitel || []), ...(b.titles || [])].filter(saisonTitel)).size
};
function botGoalVal(botId, k) { const b = loadBotState()[botId], f = BOT_GOAL_VAL[k]; return b && f ? f(b, b.stats || {}, botId) || 0 : 0; }
function botClaimGoals(bot) {
    const b = loadBotState()[bot.id]; if (!b) return; b.goals = b.goals || {};
    const a = ACHIEVEMENTS.find(x => !b.goals[x.id] && botGoalVal(bot.id, x.k) >= x.goal); if (!a) return;
    b.goals[a.id] = Date.now(); b.gems += a.gems; saveBotState();
}

// Saison-Pass: their points are what their stats grew by since the season began (+ 200 for each day with all tasks done) - no work per tick.
// About a third of them (BOT_SPAR, je Gruppe) save up for premium (botSparZiel) and buy it once there; rewards go out as they climb, the same ones you get.
function botPassScore(b) { const st = b.stats || {}; let s = (b.hsDays || 0) * 200; for (const k in PASS_BOT_XP) s += (st[k] || 0) * PASS_BOT_XP[k]; return s; }
function botPassInfo(botId) { const b = loadBotState()[botId]; if (!b || !b.ps || b.ps.s !== passNo(Date.now())) return { lvl: 0, prem: false };
    return { lvl: Math.min(PASS_LVLS, Math.floor(Math.max(0, botPassScore(b) - b.ps.base) / PASS_STEP)), prem: !!b.ps.prem }; }
function botPassCare(bot, b) {
    const now = Date.now(), n = passNo(now); if (b.ps && (b.ps.s > n || (b.ps.s === n && now < (b.ps.at || 0)))) return;   // once a minute is plenty (and never backwards)
    if (!b.ps || b.ps.s !== n) { if (b.ps) { b.ps.at = 0; botPassPay(bot.id, b); }             // the old season: what they reached is still paid out, then a fresh pass
        b.ps = { s: n, base: botPassScore(b), f: 0, p: 0, prem: false, want: mulberry32((parseInt(bot.id.slice(3), 10) || 0) * 53 + n * 7)() < (BOT_SPAR[bot.style] || BOT_SPAR.balanced).pass }; }
    b.ps.at = now + 60000;
    if (!b.ps.prem && b.ps.want && b.gems - PASS_PREMIUM >= BOT_GEMS_REST) { b.gems -= PASS_PREMIUM; b.ps.prem = true; }
    botPassPay(bot.id, b);
}
function botPassPay(botId, b) { const ps = b.ps, L = Math.min(PASS_LVLS, Math.floor(Math.max(0, botPassScore(b) - ps.base) / PASS_STEP));
    while (ps.f < L) for (const r of passRewardAt(++ps.f, 0)) passGive(botId, r);
    if (ps.prem) while (ps.p < L) for (const r of passRewardAt(++ps.p, 1)) passGive(botId, r);
}

function botStat(botId, k, n) { const b = loadBotState()[botId]; if (!b) return; b.stats = b.stats || {}; b.stats[k] = (b.stats[k] || 0) + (n || 1); saveBotState(); }

// Kopfgeld: the prize lands where yours does - gems and coins
function botBountyReward(botId, gems, coins) { const b = loadBotState()[botId]; if (!b) return; b.gems = (b.gems || 0) + gems; botCoins[botId] = (botCoins[botId] || 0) + coins; botStat(botId, 'bounty', gems); }

function botNeulingWeg(botId, gegner) {         // greift einen echten Spieler an (Basis, Armee, Feld, Rally): sein Anfängerschutz ist vorbei
    if (!window.WELT || !botId || botId === 'player' || !(gegner === 'player' || (gegner && botById[gegner] && botById[gegner].mensch))) return;
    const b = loadBotState()[botId]; if (b && b.neuBis) { b.neuBis = 0; saveBotState(); } }
function botDropShield(botId) { const b = loadBotState()[botId]; if (!b || !(b.shieldUntil > Date.now())) return;
    if (b.mensch) { b.schildAlt = b.shieldUntil; if (b.hb) b.hb.schild = Math.min(+b.hb.schild || 0, Date.now()); }   // ein echter Spieler: der Schild kommt nicht mit seinem nächsten Profil zurück
    b.shieldUntil = 0; b.shieldWhy = null; saveBotState(); requestRender(); }

const botProdCarry = {};                         // per bot: time not yet made into a tick of its own, and fractions


// bots: an idle bot sends a share of a big base to a field near it - free ones first, or one it can win
// ==============================================================================================================
// 9) FELDER UND ARMEEN IM FELD – sammeln, vereinen, umdenken, zuschlagen, deine Armeen angreifen
// ==============================================================================================================
function botGatherField(bot, freeOnly) {                 // freeOnly: under their own shield - no fights over a field
    const dort = new Set(fieldMarches.filter(m => m.who === bot.id && !m.back).map(m => m.fieldId)); for (const f of resFields) if (fieldState[f.id] && fieldState[f.id].occ && fieldState[f.id].occ.who === bot.id) dort.add(f.id);
    if (dort.size >= ((BOT_STYLES[bot.style].gather || 8) >= 10 ? 2 : 1) || (AUF && AUF.marschFrei(bot.id) <= 0)) return false;   // ein (die Fleißigen zwei) Sammler – nur mit freiem Marsch-Platz
    const own = botOwnedIslands[bot.id]; if (!own || !own.size) return false;
    const thr = botThreatened(bot.id); let base = null; for (const id of own) if (!thr.has(id) && (base === null || (islandTroops[id] || 0) > (islandTroops[base] || 0))) base = id;
    if (base === null) return false;
    const have = Math.floor((islandTroops[base] || 0) * .35); if (have < wirtK(300)) return false;   // (Truppen-Grenzen × WIRTSCHAFT_KOSTEN)
    const kennt = botKennt(bot.id), b = islandById[base], reach = new Set((reachableLandmassIds[b.landmassId] || [b.landmassId]).filter(l => landmassesConnected(b.landmassId, l) && kennt.has(l)));
    let best = null, bd = Infinity; const wunsch = AUF ? AUF.botRohWunsch(bot.id) : null;   // der Rohstoff, der für die Burg am meisten fehlt, lockt mehr
    for (const f of resFields) { if (!reach.has(f.landmassId) || dort.has(f.id)) continue; const st = fieldInfo(f); if (st.left <= 0) continue;
        if (st.occ && (freeOnly || st.occ.who !== bot.id && ownerShielded(st.occ.who) || st.occ.troops * 1.3 > have)) continue;
        const d = Math.hypot(f.x - b.x, f.y - b.y) * (st.occ ? 2 : 1) * (wunsch && FIELD_KINDS[f.kind].roh === wunsch ? .4 : 1); if (d < bd) { bd = d; best = f; } }
    if (!best) return false;
    const gh = botGatherHeroes(bot.id);                                         // gatherer heroes (Fenn, Otto, Pia) if free – Haupt- und Zweitheld
    return fieldSend(bot.id, base, best.id, have, gh[0], gh[1]);
}

// bots set up field armies too: when one base isn't enough for a target, they gather in front of it out in the open,
// scout it from there and strike when they believe they can win - or give up and go home after a while
const botArmies = botId => armies.filter(a => a.who === botId);

function botArmyRally(bot, target, need, srcList) {
    if (botArmies(bot.id).length >= (BOT_STYLES[bot.style].armies || 1)) return false;
    const own = botOwnedIslands[bot.id], thr = botThreatened(bot.id);
    const strong = (Array.isArray(srcList) ? srcList : botPoolFor(bot, target).src).map(sv => sv.id).filter(id => own.has(id) && id !== megaTempleId && !thr.has(id) && (islandTroops[id] || 0) > BOT_MIN_GARRISON_TO_ATTACK);
    if (!strong.length) return false;
    const src0 = islandById[strong[0]]; let pt = null;
    for (const f of [.35, .5, .25, .6, .45]) {
        const x = target.x + (src0.x - target.x) * f + (Math.random() - .5) * ISLAND_RADIUS * 2, y = target.y + (src0.y - target.y) * f + (Math.random() - .5) * ISLAND_RADIUS * 2, lm = landmassAtWorld(x, y);
        if (!lm || !botCanCross(bot.id, lm.id, target.landmassId, need, target.id) || (islandsByLandmass[lm.id] || []).some(i => Math.hypot(i.x - x, i.y - y) < ISLAND_RADIUS * 2.5)) continue;
        pt = { x, y, lm: lm.id }; break;
    }
    if (!pt) return false;
    const helpers = []; let pool = 0; const now = Date.now(), frei = id => Math.floor((islandTroops[id] || 0) * botFrei(bot.id, id, now));   // (nach Lage, nicht immer 90 %)
    const most = (BOT_STYLES[bot.style].gather || 8) * 4;                          // as many bases as the strike needs (the loop stops at enough) - the good ones call up more
    for (const id of strong) { if (pool >= need * 1.3 || helpers.length >= most) break; const n = frei(id);
        if (n < BOT_MIN_GARRISON_TO_ATTACK || !botCanCross(bot.id, islandById[id].landmassId, pt.lm, n)) continue; helpers.push(id); pool += n; }
    if (pool < need * 1.1) return false;
    const hp = botPickHero(bot.id, null, null, need, true);
    const a = { id: 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), who: bot.id, hero: hp[0], hero2: hp[1], x: pt.x, y: pt.y, lm: pt.lm, troops: 0, homeId: helpers[0], mv: null, t: target.id, until: Date.now() + (helpers.length > 6 ? 12 : 8) * 60000 };
    armies.push(a); let sent = 0;
    for (const id of helpers) { const n = frei(id); if (armySendFrom(a, id, n)) sent += n; }
    if (!sent) { armies = armies.filter(x => x !== a); return false; }
    if (islandOwnerOf(target.id) === 'player') flashHint(bot.name + ' sammelt eine Armee vor deiner Basis ' + islandTitle(target) + '.', 4500);
    saveArmies(); requestRender(); return true;
}

// A camped army facing a wall it can't break: switch to a base it can beat (yours first if it's personal), call up more
// troops from its own bases, or scout around for a better target - one order at a time, like anyone would.
function botArmyRethink(bot, a, atk, needS, now) {
    if (now < (a.rethinkAt || 0)) return false;
    a.rethinkAt = now + 12000 + Math.random() * 10000;
    const t0 = islandById[a.t], gap = needS / atk - a.troops, st = botStyle(bot);
    // 1) the whole empire first: if everything in reach (and the other army out there) is enough, call it up
    if (t0 && (a.calls || 0) < 4) {
        const pool = botPoolFor(bot, t0), others = botArmies(bot.id).filter(x => x !== a && (x.mv ? x.mv.to.kind === 'army' && x.mv.to.id === a.id     // only armies that will really join this one
            : Math.hypot(x.x - a.x, x.y - a.y) <= ISLAND_RADIUS * 40 && routeFor(x.lm, a.lm, bot.id))).reduce((s2, x) => s2 + x.troops, 0);
        const own = botOwnedIslands[bot.id], thr = botThreatened(bot.id);
        const helpers = pool.src.filter(sv => own.has(sv.id) && sv.id !== megaTempleId && !thr.has(sv.id) && botCanCross(bot.id, islandById[sv.id].landmassId, a.lm, sv.have)).slice(0, (st.gather || 8) * 4);
        const can = helpers.reduce((s2, sv) => s2 + sv.have, 0);
        if (can + others >= gap * 1.05 && can > 0) {
            let sent = 0; for (const sv of helpers) { if (sent >= gap * 1.25 - others) break; const n = Math.floor((islandTroops[sv.id] || 0) * botFrei(bot.id, sv.id, now)); if (armySendFrom(a, sv.id, n)) sent += n; }
            if (sent) { a.calls = (a.calls || 0) + 1; a.until = Math.max(a.until, now + 8 * 60000);
                if (islandOwnerOf(a.t) === 'player') flashHint(bot.name + ' holt Verstärkung für die Armee vor ' + islandTitle(t0) + '.', 4000);
                saveArmies(); return true; }
        }
        if (can + others < gap * .8) botNoteTooStrong(bot, t0.id, pool.s);            // even everything isn't enough: that one is off the list for now
    }
    // 2) a base out here it can beat (yours first if it's personal and in the way)
    const pos = { x: a.x, y: a.y, landmassId: a.lm }, v = botVendetta(bot, now), g = botGrudgeOn(bot.id, 'player');
    const lms = (reachableLandmassIds[a.lm] || [a.lm]).filter(l => l === a.lm || landmassesConnected(a.lm, l));
    let best = null, bs = Infinity, unknown = null, ud = Infinity;
    for (const l of lms) for (const t of islandsByLandmass[l] || []) {
        const ow = islandOwnerOf(t.id); if (!ow || ow === bot.id || isCapital(t.id) || t.id === a.t) continue;
        if (shieldCovers(t) && ownerShielded(ow, now)) continue;
        const d = Math.hypot(t.x - a.x, t.y - a.y) * botSituation(bot, st, t, ow, now), pull = ow === 'player' ? (v && v.who === 'player' ? .2 : g ? .4 : .6) : 1;
        const it = botIntel(bot, t.id);
        if (!it) { if (!botScouting(bot, t.id) && !botHopeless(bot, t, st, atk) && d * pull < ud) { ud = d * pull; unknown = t; } continue; }
        const m = (ow === 'player' ? Math.max(1.25, st.margin) : st.margin) * botMarginFor(bot, t, ow, now);
        if (a.troops * atk >= it.s * m && d * pull < bs) { bs = d * pull; best = t; }
    }
    if (best) {                                                                   // a base it can take: turn towards that one
        const was = islandById[a.t]; a.t = best.id; a.until = Math.max(a.until, now + 5 * 60000);
        if (islandOwnerOf(best.id) === 'player') flashHint('Die Armee von ' + bot.name + ' schwenkt um – ihr neues Ziel ist deine Basis ' + islandTitle(best) + '!', 4500);
        else if (was && islandOwnerOf(was.id) === 'player') flashHint(bot.name + ' kommt an ' + islandTitle(was) + ' nicht vorbei und sucht sich ein anderes Ziel.', 3500);
        saveArmies(); return true;
    }
    if (unknown) {                                                                 // look around for something better
        const ready = now + scoutSecs(pos, unknown, bot.id) * 1000;
        if (botLearn(bot.id, unknown.id, ready, a.lm) === false) return false;
        if (islandOwnerOf(unknown.id) === 'player') { const hm = armyHome(a); if (hm !== null && hm !== undefined) botScoutVisible(bot, hm, unknown.id, now, ready); }
        return true;
    }
    return false;
}

// two armies of the same player out in the open, close to each other: the smaller one joins the bigger one
function botArmyMerge(bot) {
    const idle = botArmies(bot.id).filter(a => !a.mv && a.troops >= BOT_MIN_GARRISON_TO_ATTACK && !armyJoins.some(j => j.armyId === a.id)).sort((u, v) => v.troops - u.troops);
    if (idle.length < 2 || botKeepsShield(bot, Date.now())) return false;   // under their own shield the armies just go home
    const big = idle[0];
    for (const small of idle.slice(1)) {
        if (Math.hypot(small.x - big.x, small.y - big.y) > ISLAND_RADIUS * 40 || !routeFor(small.lm, big.lm, bot.id)) continue;
        if (armyMove(small, { kind: 'army', id: big.id, x: big.x, y: big.y, lm: big.lm })) continue;
        big.until = Math.max(big.until || 0, Date.now() + 8 * 60000); big.calls = Math.max(0, (big.calls || 0) - 1);
        const t = islandById[big.t]; if (t && islandOwnerOf(t.id) === 'player') flashHint(bot.name + ' vereint zwei Armeen vor deiner Basis ' + islandTitle(t) + '.', 4500);
        saveArmies(); return true;
    }
    return false;
}

function botArmyStep(bot) {                                                   // one order for a camped field army → true when a tap was used
    const now = Date.now();
    if (botArmyMerge(bot)) return true;
    for (const a of botArmies(bot.id)) {
        if (a.mv || armyJoins.some(j => j.armyId === a.id) || armies.some(x => x.who === bot.id && x.mv && x.mv.to.kind === 'army' && x.mv.to.id === a.id)) continue;   // another of its armies is on the way to join: wait for it
        const t = islandById[a.t];
        const goHome = () => { const h = armyHome(a); if (h === null || h === undefined) { armies = armies.filter(x => x !== a); return false; } const b = islandById[h];
            if (!armyMove(a, { kind: 'home', id: h, x: b.x, y: b.y, lm: b.landmassId })) return true;
            if (now > (a.until || 0) + 10 * 60000) { islandTroops[h] = (islandTroops[h] || 0) + Math.max(0, a.troops || 0); armies = armies.filter(x => x !== a); return true; }   // Heimweg dauerhaft zu (Tor fremd, Maut zu teuer): die Truppen kommen trotzdem heim, statt ewig einen Marsch-Platz zu belegen
            return false; };
        if (!t || botOwnedIslands[bot.id].has(t.id) || isCapital(t.id) || now > a.until || a.troops < BOT_MIN_GARRISON_TO_ATTACK || baseShieldedFor(t.id, bot.id) || botKeepsShield(bot, now)) { if (goHome()) return true; continue; }
        const boss = bossAt(t.id), it = boss ? { s: boss.troops + boss.defense } : botIntel(bot, t.id);
        if (!it) {                                                                   // no report yet: scout it from here first
            if (botScouting(bot, t.id)) continue;
            const ready = now + scoutSecs({ x: a.x, y: a.y, landmassId: a.lm }, t, bot.id) * 1000;
            if (botLearn(bot.id, t.id, ready, a.lm) === false) { if (goHome()) return true; continue; }   // Tor zu: die Armee kommt da nicht hin
            if (islandOwnerOf(t.id) === 'player') { const h = armyHome(a); if (h !== null && h !== undefined) botScoutVisible(bot, h, t.id, now, ready); }
            return true;
        }
        const st = botStyle(bot), margin = islandOwnerOf(t.id) === 'player' ? Math.max(1.25, st.margin) : st.margin, atk = (1 + (botMults(bot.id).attackPct + (a.hero && heroOwned(bot.id, a.hero) ? heroStats(bot.id, a.hero).atk : 0)) / 100) * titleMult(bot.id, 'attack') * (AUF ? AUF.kampf(bot.id, 'a') : 1);   // with the army's own hero (+ Truppen-Stufe, Forschung)
        if (a.troops * atk < it.s * margin * (boss ? .35 : 1)) {                     // too strong: a person doesn't just stand there
            if (botArmyRethink(bot, a, atk, it.s * margin, now)) return true;
            if (now > a.until - 3 * 60000 && goHome()) return true; continue;                 // nothing to do about it: give up and go home
        }
        const canMarch = () => a.lm === t.landmassId || botCanCross(bot.id, a.lm, t.landmassId, a.troops, t.id);
        if (islandOwnerOf(t.id) === 'player' && it.ready && now - it.ready > 2 * 60000 && !botScouting(bot, t.id) && canMarch()) {   // one more look right before the strike
            const ready = now + scoutSecs({ x: a.x, y: a.y, landmassId: a.lm }, t, bot.id) * 1000;
            if (botLearn(bot.id, t.id, ready, a.lm) === false) { if (goHome()) return true; continue; }
            const h = armyHome(a); if (h !== null && h !== undefined) botScoutVisible(bot, h, t.id, now, ready);
            return true;
        }
        if (armyMove(a, { kind: 'base', id: t.id, x: t.x, y: t.y, lm: t.landmassId })) { if (now > a.until - 3 * 60000 && goHome()) return true; continue; }   // blocked (gate): give up in time
        if (islandOwnerOf(t.id) === 'player') { flashHint('Die Armee von ' + bot.name + ' marschiert auf ' + islandTitle(t) + '!', 4500); sfx('warn'); botRevengeLaunched(bot, t.id); }
        return true;
    }
    return false;
}

// bots: a bot whose base lies near a camped army notices it, waits a moment, and attacks if it clearly has more
// (deine Armee und die echter Spieler auf dem Weltrechner – für alle gleich: Friedensschild und Bündnis schützen sie)
const armyFeldZiel = w => w === 'player' || !!(botById[w] && botById[w].mensch);
function armyBotWatch(now) {
    for (const a of armies) {
        const w = armyWho(a);
        if (!armyFeldZiel(w) || a.mv || a.troops < 1 || armyRaids.some(r => r.armyId === a.id) || ownerShielded(w, now)) continue;
        if (a.seen) { const bot = botById[a.seen.bot], base = islandById[a.seen.base];
            if (now < a.seen.at + 15000) continue;
            a.seen = null;
            if (!bot || !base || islandOwnerOf(base.id) !== bot.id || !botOnline(bot, now) || ownerShielded(bot.id, now) || bundFreund(bot.id, w)) continue;
            const n = Math.floor((islandTroops[base.id] || 0) * .6); if (n < a.troops * 1.3) continue;
            const to = { x: a.x, y: a.y, landmassId: a.lm };
            islandTroops[base.id] -= n; armyRaids.push({ botId: bot.id, baseId: base.id, armyId: a.id, ...(w !== 'player' ? { tOwner: w } : {}), troops: n, tx: a.x, ty: a.y, lm: a.lm, startedAt: now, resolveAt: now + travelDurationSeconds(base, to, bot.id) * 1000 });
            if (w === 'player') { flashHint(bot.name + ' greift deine Armee im Feld an!', 4000); sfx('warn'); requestRender(); } continue; }
        if (Math.random() > .25) continue;
        let best = null, bd = Infinity;
        for (const bid in botOwnedIslands) { const own = botOwnedIslands[bid], bot = botById[bid]; if (!own || !bot || bot.mensch || bid === w || !botOnline(bot, now) || ownerShielded(bid, now) || bundFreund(bid, w)) continue;
            for (const id of own) { const b = islandById[id], d = Math.hypot(b.x - a.x, b.y - a.y); if (d > ISLAND_RADIUS * 14 || d >= bd) continue;
                if ((islandTroops[id] || 0) * .6 < a.troops * 1.3 || !routeFor(b.landmassId, a.lm, bot.id)) continue; bd = d; best = { bot: bot.id, base: id }; } }
        if (best) { a.seen = { ...best, at: now }; if (w === 'player') flashHint(botById[best.bot].name + ' hat deine Armee entdeckt.', 3500); }
    }
}

function armyRaidArrive(r, now) {
    const a = armyById(r.armyId), bot = botById[r.botId], back = () => { if (botOwnedIslands[r.botId] && botOwnedIslands[r.botId].has(r.baseId)) islandTroops[r.baseId] = (islandTroops[r.baseId] || 0) + r.troops; };
    const w = a ? armyWho(a) : r.tOwner || 'player', me = w === 'player', hint = (t, ms) => { if (me) flashHint(t, ms); };   // der Eigentümer der Armee: du oder ein echter Spieler
    if (a && ownerShielded(w, Math.min(now, r.resolveAt || now))) { back(); hint('Dein Friedensschild hat den Angriff von ' + bot.name + ' auf deine Armee abgewehrt.', 4000); return; }   // the shield covers field armies too
    const p = a && armyPos(a, now);
    if (!a || Math.hypot(p.x - r.tx, p.y - r.ty) > ISLAND_RADIUS * 2) { back(); if (a) hint('Deine Armee ist ' + bot.name + ' ausgewichen.', 3000); return; }
    const dHx = heroFieldFx(w, a.hero, { defending: 1 }, a.hero2);                           // the army's hero (Bollwerk, Zäh …) - a full rage fires now
    const def = a.troops, atk = r.troops, fb = fieldBattle(r.botId, atk, w, def, null, dHx), won = fb.won;
    const fg = fieldGold(r.botId, w, fb, null, dHx);
    goalBump(won ? r.botId : w, 'armyWins');
    let text;
    if (won) { armies = armies.filter(x => x !== a); r.troops -= fb.aLoss; botHospitalTake(r.botId, fb.aLoss); back(); const k = fieldHurt(w, def, dHx);
        text = bot.name + ' hat deine Armee im Feld geschlagen (' + fmtCompact(def) + ' Truppen)' + (k ? ', ' + fmtCompact(k) + ' ins Krankenhaus.' : '.'); }
    else { botHospitalTake(r.botId, atk); fieldHurt(w, fb.dLoss, dHx); a.troops -= fb.dLoss; if (a.troops < 1) armies = armies.filter(x => x !== a); r.troops = 0; goalBump(w, 'defends');
        text = 'Deine Armee hat den Angriff von ' + bot.name + ' abgewehrt – ' + fmtCompact(Math.max(0, a.troops)) + ' stehen noch.'; }
    evBericht(w, { type: 'army', won: !won, attacker: bot.name, defender: 'Du', atk: fb.SA, def: fb.SD, gold: fg.d, hD: heroTag(dHx), hx: heroReportOf(dHx) }, text);   // dir direkt, echten Spielern als Nachricht
    if (!me) return;
    warStat(won ? 'armyLosses' : 'armyWins', 1, bot.name);
    sfx(won ? 'defeat' : 'victory'); updateHud(); saveGame();
}

function botConquests(botId) {                         // Eroberungen for the Rangliste; older saves start from the bases they hold (like yours)
    const b = loadBotState()[botId]; if (!b) return 0; const st = b.stats = b.stats || {};
    if (!st.capSeed) { st.caps = Math.max(st.caps || 0, Math.max(0, (botOwnedIslands[botId] ? botOwnedIslands[botId].size : 0) - 1)); st.capSeed = 1; }
    return st.caps || 0;
}

// ==============================================================================================================
// 10) BARBAREN-LAGER UND TAGESBOSS – farmen wie du: Stufe für Stufe, höchstens 20 Lager am Tag, ein paar Treffer am Boss
// ==============================================================================================================
const botBarbNext = {};                                   // a person farms camps now and then, not all in one go
function botBarbBase(bot) {                               // their biggest base that nobody is marching on
    const own = botOwnedIslands[bot.id]; if (!own || !own.size) return null;
    const thr = botThreatened(bot.id); let base = null; for (const id of own) if (!thr.has(id) && (base === null || (islandTroops[id] || 0) > (islandTroops[base] || 0))) base = id;
    return base;
}
function botBarbHunt(bot) {                               // the strongest camp they may attack (level up to their best + 1) that one base beats with room to spare
    const now = Date.now(); if (botBarbNext[bot.id] === undefined) botBarbNext[bot.id] = now + Math.random() * 90000;
    if (botBarbNext[bot.id] > now || barbLeft(bot.id) <= 0 || barbOut(bot.id)) return false;
    botBarbNext[bot.id] = now + (6 + Math.random() * 12) * 60000;
    const base = botBarbBase(bot); if (base === null) return false;
    const have = (islandTroops[base] || 0) * .5, b = islandById[base], fa = barbFa(bot.id), best = barbRec(bot.id).b;
    const kennt = botKennt(bot.id), reach = new Set((reachableLandmassIds[b.landmassId] || [b.landmassId]).filter(l => (l === b.landmassId || landmassesConnected(b.landmassId, l)) && kennt.has(l)));
    const taken = new Set(barbMarches.filter(m => !m.back && m.k === 'c').map(m => m.tid));
    const cand = []; let pick = null;
    for (const c of barbState.camps) if (c.L <= best + 1 && !taken.has(c.id) && c.t * 1.3 / fa <= have) cand.push([c.L * 3 - Math.hypot(c.x - b.x, c.y - b.y) / 4000, c]);
    cand.sort((x, y) => y[0] - x[0]);
    for (const [, c] of cand.slice(0, 6)) if (reach.has(c.lm) || canReach(b.landmassId, c.lm, bot.id)) { pick = c; break; }   // the next ones first, further ones over the bridges
    if (!pick) return false;
    const n = Math.min(have, Math.ceil(pick.t * (1.3 + Math.random() * .4) / fa));
    const hp = heroPickPair(bot.id, null, null, n); return barbSend(bot.id, base, 'c', pick.id, n, hp[0], hp[1]);
}
// Events (Paket B) – mit denselben Regeln wie du: Verstärkung schicken, Barbaren-Armeen abfangen, den Drachen angreifen
function botInvasion(bot) {
    const I = invAktiv(), own = botOwnedIslands[bot.id]; if (!I || !I.armies.length || !own || !own.size) return false;
    const now = Date.now(), fa = barbFa(bot.id), thr = botThreatened(bot.id);
    for (const a of I.armies) {                           // 1) eine eigene Basis ist das Ziel: Verstärkung von einer Basis auf derselben Insel, die rechtzeitig ankommt
        if (!own.has(a.tid) || pendingSends.some(x => x.senderBotId === bot.id && x.toId === a.tid && !x.back)) continue;
        const isl = islandById[a.tid], need = a.t * 1.15 - effectiveTroops(isl) - effectiveDefense(isl); if (need <= 0) continue;
        let best = null; for (const id of own) { if (id === a.tid || thr.has(id)) continue; const s = islandById[id]; if (s.landmassId !== isl.landmassId) continue;
            const n = Math.floor((islandTroops[id] || 0) * .6); if (n < need * .5 || now + travelDurationSeconds(s, isl, bot.id) * 1000 > a.at1 - 5000) continue; if (!best || n > best.n) best = { id, n }; }
        if (best) { const k = pendingSends.length; launchSend(best.id, a.tid, bot.id, Math.min(best.n, Math.ceil(need * 1.3))); if (pendingSends.length > k) return true; }
    }
    if (barbOut(bot.id, 'i') >= 2) return false;          // 2) Armeen in der Nähe abfangen – auch die auf die Nachbarn (höchstens 2 Züge gleichzeitig, je Armee höchstens 2 Helfer)
    for (const a of I.armies) {
        if (barbMarches.filter(m => !m.back && m.k === 'i' && m.tid === a.id).length >= 2) continue;
        const nNeed = Math.ceil(a.t * (1.25 + Math.random() * .3) / fa); let pick = null;
        for (const id of own) { if (thr.has(id)) continue; const s = islandById[id]; if (s.landmassId !== a.lm) continue; const have = Math.floor((islandTroops[id] || 0) * .6);
            if (have < nNeed || !invTreffpunkt(a, id, bot.id)) continue; if (!pick || have > pick.have) pick = { id, have }; }
        if (pick) return barbSend(bot.id, pick.id, 'i', a.id, nNeed, heroPickBest(bot.id, null, null, nNeed));
    }
    return false;
}
function botDrache(bot) {                                 // ein paar Schläge über den Abend verteilt, mit einem Teil ihrer größten freien Basis
    const D = drAktiv(); if (!D) return false;
    const due = Math.min(DR_HITS, Math.ceil(DR_HITS * (Date.now() - D.start) / (D.end - D.start)) + 1);
    if ((D.hits[bot.id] || 0) >= due || barbOut(bot.id, 'd')) return false;
    const base = botBarbBase(bot); if (base === null) return false;
    const have = islandTroops[base] || 0, n = Math.min(have, Math.max(Math.floor(have * (.15 + Math.random() * .2)), Math.ceil(evTruppenAlle(bot.id) * DR_ANTEIL * 1.05))); if (n < wirtK(1000)) return false;   // (mind. 10 % aller Truppen – sonst zählt der Treffer nicht, wie bei dir)
    return barbSend(bot.id, base, 'd', null, n, heroPickBest(bot.id, null, null, n));
}
function botDayBoss(bot) {                                // the daily boss: a few strikes a day with a share of their biggest free base
    const d = dbossEnsure(), due = Math.min(dbossHitsMax(), Math.ceil(dbossHitsMax() * (1 - msToMidnight() / 864e5)));   // spread over the day (strikes not made yet are caught up): the boss falls in the evening, not in the first hour
    if (!d || d.hp <= 0 || barbRec(bot.id).h >= due || barbOut(bot.id, 'b') || Math.random() < .5) return false;
    const base = botBarbBase(bot); if (base === null) return false;
    // (kein Nebel-Tor mehr: der Tagesboss ist für alle angekündigt, wie Drache und Kriegsherr – vorher griff nur an, wer seine Insel kannte: 1 von 150)
    const n = Math.floor((islandTroops[base] || 0) * (.15 + Math.random() * .2)); if (n < wirtK(1000)) return false;
    const hp = heroPickPair(bot.id, null, null, n); return barbSend(bot.id, base, 'b', null, n, hp[0], hp[1]);
}
