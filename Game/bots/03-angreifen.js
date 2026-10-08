// Teil 03-angreifen.js: Mitspieler: Angreifen, Spähen, Sammeln, der Kopf (botThink)
// A person plays to the title they wear: a Feldherr attacks more and bolder, a Feigling only goes for sure things,
// a Burgherr can send more of each garrison out, a Verräter keeps more at home, a Schatzmeister builds more, a Bettler saves.
// ==============================================================================================================
// 4) ANGREIFEN, SPÄHEN, SAMMELN – Stimmung und Titel, ein Befehl pro Zug, Wellen, der Kopf (botThink)
// ==============================================================================================================
const TITLE_PLAY = {
    feldherr:  { margin: .85, tapMs: .7, commit: 1.15, hunt: 1.4 },
    burgherr:  { commit: 1.15 },
    verraeter: { commit: .75, risk: 0 },
    herzog:    { tapMs: .8, commit: 1.1 },
    narr:      { tapMs: 1.2, commit: .9 },
    schatz:    { spend: 1.3, build: .7 },
    bettler:   { spend: .7, build: .35 }
};

function botMood(botId) { const b = loadBotState()[botId], md = b && b.mood; return md ? md.v * Math.pow(.5, (Date.now() - md.at) / (20 * 60000)) : 0; }   // fades in ~20 min

function botMoodAdd(botId, dv) { const b = loadBotState()[botId]; if (!b) return; b.mood = { v: Math.max(-1, Math.min(1, botMood(botId) + dv)), at: Date.now() }; }

function botStyle(bot) {
    const st0 = BOT_STYLES[bot.style], t = titleOf(bot.id), tp = t && TITLE_PLAY[t.key], mood = botMood(bot.id);
    const st = Math.abs(mood) < .3 ? st0 : Object.assign({}, st0, mood > 0                  // after a few wins: bolder and quicker; after losses: careful and slower
        ? { margin: st0.margin * .9, tapMs: st0.tapMs * .85, risk: Math.max(.2, st0.risk || 0), mood: 'mutig' }
        : { margin: st0.margin * 1.2, tapMs: st0.tapMs * 1.3, risk: 0, mood: 'vorsichtig' });
    if (!tp) return st;
    const m = Object.assign({}, st, { title: t.key });
    for (const k of ['margin', 'tapMs', 'hunt', 'spend']) if (tp[k] !== undefined) m[k] = (st[k] ?? (k === 'hunt' ? .5 : 1)) * tp[k];   // (on top of the mood)
    if (tp.commit) m.commit = Math.min(.95, (st.commit || .7) * tp.commit);
    if (tp.spend) m.spend = Math.min(.95, m.spend);
    if (tp.risk !== undefined) m.risk = tp.risk;
    if (tp.build) m.build = tp.build;
    return m;
}

function botTapped(bot) { botActOf(bot.id).next = Date.now() + (botStyle(bot).tapMs || 5000) * (.7 + Math.random() * .6); }

function botFreeSlots(bot) { if (AUF && AUF.marschFrei(bot.id) <= 0) return 0; return (BOT_STYLES[bot.style].marches || 5) - pendingAttacks.filter(a => a.attackerBotId === bot.id).length - pendingSends.filter(x => x.senderBotId === bot.id && !x.back).length - armyJoins.filter(j => j.who === bot.id).length - armies.filter(a => a.who === bot.id && a.mv).length; }

function botPlanStep(bot) {                                 // gives the next order of the current plan → true when a tap was used
    const act = botActOf(bot.id), p = act.plan, own = botOwnedIslands[bot.id];
    if (!p || Date.now() > p.until || !p.steps.length) { act.plan = null; return false; }
    if (p.kind === 'send' ? !own.has(p.t) : own.has(p.t) || (isCapital(p.t) && brennt(p.t)) || baseShieldedFor(p.t, bot.id)) { act.plan = null; return false; }   // the goal changed meanwhile (taken, just plundered, or under a shield)
    if (botFreeSlots(bot) <= 0) return false;                  // every march slot busy: keep the step for a later move
    const st = p.steps.shift(); if (!p.steps.length) act.plan = null;
    if (!own.has(st.from) || (p.kind === 'attack' && botThreatened(bot.id).has(st.from))) return false;
    if (p.kind === 'send') { if ((islandTroops[st.from] || 0) < BOT_MIN_GARRISON_TO_ATTACK || botThreatened(bot.id).has(st.from)) return false; launchSend(st.from, p.t, bot.id, st.n); return true; }   // (st.n: was die Basis entbehren kann – ohne: alle)
    // before every further order: is it still a good idea? A fresh report showing a stronger base, or a base that no
    // longer has the troops it was meant to send, calls the whole strike off - nobody sends 100 men against 240.000.
    const fresh = botIntel(bot, p.t);
    if (fresh && p.believed && fresh.s > p.believed * 1.15) { act.plan = null; return false; }
    const give = Math.min(st.n, Math.floor((islandTroops[st.from] || 0) * .95));
    if (give < BOT_MIN_GARRISON_TO_ATTACK || give < st.n * .6) { act.plan = null; return false; }
    const ok = !!launchAttack(st.from, p.t, bot.id, give);
    if (ok) { const a = pendingAttacks[pendingAttacks.length - 1]; if (a && a.attackerBotId === bot.id) { a.planId = p.id || (p.id = Date.now() + '-' + p.t); a.lastWave = !p.steps.length; } }
    return ok;
}

// Scouts sent at YOUR bases walk the map like yours do - you see them and get told, as in any strategy game.
let botScoutsOnMap = [];

function botScoutVisible(bot, sourceId, targetId, startedAt, resolveAt) {
    botScoutsOnMap.push({ bot: bot.id, sourceId, targetId, startedAt, resolveAt });
    scoutNote('go', bot.id, targetId);
    requestRender();
}

// Jeder Späher eines Mitspielers (botLearn) zu einer Basis von dir oder eines echten Spielers: bei Ankunft erfährt es der Herr
let botScoutsMelden = [];
function botScoutLos(botId, targetId, ready) {
    const an = islandOwnerOf(targetId);
    if (an === botId || (an !== 'player' && !(botById[an] && botById[an].mensch))) return;
    botScoutsMelden = botScoutsMelden.filter(s => !(s.bot === botId && s.targetId === targetId));
    botScoutsMelden.push({ bot: botId, targetId, an, resolveAt: ready });
}

function botScoutsArrive(now) {
    const due = botScoutsOnMap.filter(s => s.resolveAt <= now);
    if (due.length) { botScoutsOnMap = botScoutsOnMap.filter(s => s.resolveAt > now); requestRender(); }
    const da = botScoutsMelden.filter(s => s.resolveAt <= now); if (!da.length) return;
    botScoutsMelden = botScoutsMelden.filter(s => s.resolveAt > now);
    for (const s of da) if (islandOwnerOf(s.targetId) === s.an) ausgespaeht(s.an, s.bot, s.targetId);   // (inzwischen erobert: niemand mehr zu warnen)
}

// von (Mitspieler oder echter Spieler) hat eine Basis von an ausgespäht: Eintrag im Kampflog des Herrn – bei dir direkt, ein echter
// Spieler bekommt ihn vom Weltrechner (+ Push, wenn er nicht im Spiel ist; Einstellungen: Art „Späher“).
// Derselbe Späher an derselben Basis meldet höchstens alle 30 Min. (Mitspieler spähen alle 10 Min. neu – sonst
// verdrängen Späher-Meldungen die Kampfberichte, füllen die Ereignisse und schicken Push um Push)
const AUSGESPAEHT_PAUSE_MS = 30 * 60000, ausgespaehtZuletzt = new Map();
function ausgespaeht(an, von, zielId) {
    const t = islandById[zielId], wer = botById[von]; if (!t || !wer || an === von) return;
    const jetzt = Date.now(), k = an + '|' + von + '|' + zielId;
    if (jetzt - (ausgespaehtZuletzt.get(k) || 0) < AUSGESPAEHT_PAUSE_MS) return;
    if (ausgespaehtZuletzt.size > 500) for (const [x, z] of ausgespaehtZuletzt) if (jetzt - z >= AUSGESPAEHT_PAUSE_MS) ausgespaehtZuletzt.delete(x);
    ausgespaehtZuletzt.set(k, jetzt);
    const e = { type: 'ausgespaeht', botId: von, botName: wer.name, targetId: zielId };
    if (an === 'player') { addCombatLogEntry(e); scoutNote('back', von, zielId); return; }
    if (!(botById[an] && botById[an].mensch) || !window.WELT || typeof WELT.bericht !== 'function') return;
    WELT.bericht(an, e, wer.name + ' hat deine Basis ' + islandTitle(t) + ' ausgespäht – rechne mit einem Angriff.');
    if (typeof bundPush === 'function') bundPush(an, { art: 'spaeher', fertig: 1, von: wer.name, basis: islandTitle(t) });   // (Warteschlange für weltrechner/push.js)
}

// several scouts at once make one message, not a wall of them: "3 Späher sind unterwegs zu deinen Basen (Emma, Finn …)"
const scoutNotes = { go: [], back: [] }; let scoutNoteTimer = null;

function scoutNote(kind, botId, targetId) {
    scoutNotes[kind].push({ botId, targetId });
    if (!scoutNoteTimer) scoutNoteTimer = setTimeout(scoutNotesFlush, 1500);
}

function scoutNotesFlush() {
    scoutNoteTimer = null;
    const names = l => { const u = [...new Set(l.map(x => botById[x.botId].name))]; return u.slice(0, 3).join(', ') + (u.length > 3 ? ' …' : ''); };
    const go = scoutNotes.go.splice(0), back = scoutNotes.back.splice(0), msgs = [];
    if (go.length === 1) msgs.push('Ein Späher von ' + botById[go[0].botId].name + ' ist unterwegs zu deiner Basis ' + islandTitle(islandById[go[0].targetId]) + '.');
    else if (go.length) msgs.push(go.length + ' Späher sind unterwegs zu deinen Basen (' + names(go) + ').');
    if (back.length === 1) msgs.push(botById[back[0].botId].name + ' hat deine Basis ' + islandTitle(islandById[back[0].targetId]) + ' ausgespäht – rechne mit einem Angriff.');
    else if (back.length) msgs.push(back.length + ' deiner Basen wurden ausgespäht (' + names(back) + ') – rechne mit Angriffen.');
    if (msgs.length) flashHint(msgs.join(' '), 4500);
}

function botHopeless(bot, target, st, atk) {        // known to be far too strong for all they have? (last report, or "zu stark" noted)
    const ow = islandOwnerOf(target.id); if (!ow) return false;
    const seen = botLastSeen(bot, target.id), rec = botTooStrongMem[bot.id] && botTooStrongMem[bot.id][target.id], lg = botTooStrongMem[bot.id] && botTooStrongMem[bot.id]['o:' + ow];
    if (seen === null && !rec && !lg) return false;
    const pool = botPoolFor(bot, target).s;
    if (lg && Date.now() < lg.until && pool < lg.pool * 1.3) return true;                // no scout after scout at an empire far beyond them
    if (botTooStrong(bot, target.id, pool)) return true;
    if (seen !== null && pool * atk < seen * Math.max(1.25, st.margin)) { if (!rec) botNoteTooStrong(bot, target.id, pool); if (seen > pool * atk * 100) botTooStrongMem[bot.id]['o:' + ow] = { until: Date.now() + 45 * 60000, pool }; return true; }   // 100x beyond all they have: that owner plays in another league
    return false;
}

function botThroneHold(bot) {                       // the ruler sends a big army from nearby into the throne while it is thin (stops once it holds ~2x their biggest base)
    if (rulerOwner() !== bot.id || pendingSends.some(x => x.senderBotId === bot.id && !x.back && x.toId === megaTempleId)) return false;
    const m = islandById[megaTempleId], g = islandTroops[megaTempleId] || 0, thr = botThreatened(bot.id); let best = null;
    for (const id of botOwnedIslands[bot.id]) { if (id === megaTempleId || thr.has(id)) continue; const isl = islandById[id], n = Math.floor((islandTroops[id] || 0) * .6);
        if (n < Math.max(BOT_MIN_GARRISON_TO_ATTACK, g * .3) || (best && n <= best.n)) continue;
        if (isl.landmassId !== m.landmassId && !(landmassesConnected(isl.landmassId, m.landmassId) && botCanCross(bot.id, isl.landmassId, m.landmassId, n))) continue;
        best = { id, n }; }
    if (!best) return false; const k = pendingSends.length; launchSend(best.id, megaTempleId, bot.id, best.n); return pendingSends.length > k;
}

// Nebel auch für die Mitspieler: sie kennen nur die Inseln, auf denen sie Basen haben (oder hatten), und die direkten
// Nachbarn über eine Brücke – wie dein Nebel, der um deine Basen aufgeht. Was einmal erforscht ist, bleibt bekannt.
const botKenntMem = {}, botKenntBasen = {};
let lmNachbarn = null;
function botKennt(botId) {
    if (!lmNachbarn) { lmNachbarn = {}; for (const br of bridges) { (lmNachbarn[br.a] = lmNachbarn[br.a] || []).push(br.b); (lmNachbarn[br.b] = lmNachbarn[br.b] || []).push(br.a); } }
    const b = loadBotState()[botId]; if (!b) return new Set();
    let k = botKenntMem[botId];
    if (!k) k = botKenntMem[botId] = new Set(b.kennt || []);
    const own = botOwnedIslands[botId];
    if (own && botKenntBasen[botId] !== own.size) {                 // nur neu rechnen, wenn sich ihre Basen geändert haben
        botKenntBasen[botId] = own.size; const vor = k.size, lms = new Set();
        for (const id of own) { const i = islandById[id]; if (i) lms.add(i.landmassId); }
        const weit = AUF && AUF.foStufe(botId, 'x_nebel') >= 3;          // Forschung Kundschaft (ab Stufe 3): auch die Nachbarn der Nachbarn
        for (const lm of lms) { k.add(lm); for (const n of lmNachbarn[lm] || []) { k.add(n); if (weit) for (const n2 of lmNachbarn[n] || []) k.add(n2); } }
        if (k.size !== vor) { b.kennt = [...k]; saveBotState(); }
    }
    return k;
}
function botThink(bot) {
    const owned = botOwnedIslands[bot.id];
    if (!owned || owned.size === 0) return;
    const act = botActOf(bot.id);
    if (Date.now() < act.next) return;                               // still busy with the last order
    if (!(act.plan && act.plan.kind === 'attack') && botArmyStep(bot)) { botTapped(bot); saveBotState(); return; }   // a field army waiting for orders (gathering troops can wait one tap)
    if (act.plan) { if (botPlanStep(bot)) { botTapped(bot); saveBotState(); } return; }   // finish what they started
    if (botKeepsShield(bot, Date.now())) { if (Math.random() < .3 && (botGatherField(bot, true) || botBarbHunt(bot))) botTapped(bot); return; }   // under their own shield: no attacks, only gathering and camps
    if (Math.random() < .5 && botThroneHold(bot)) { botTapped(bot); saveBotState(); return; }   // just took the throne: fill it up before the next one comes
    if (AUF && Math.random() < .25 && AUF.botRohWunsch(bot.id) && botGatherField(bot)) { botTapped(bot); saveBotState(); return; }   // Holz/Stein/Eisen fehlen für die Burg: Sammler los (Paket D)
    if (Math.random() < .1 && (botBarbHunt(bot) || botDayBoss(bot))) { botTapped(bot); saveBotState(); return; }   // now and then a camp or a strike at the daily boss (that is this move's order)
    const st = botStyle(bot), atk = botAtkFactor(bot, true), ruler = rulerOwner();   // several waves: a hero only leads one, so he's a bonus, not part of the plan
    const shielded = playerShielded(), now = Date.now(), shOwn = shieldedOwners(now);
    const busy = new Set(pendingAttacks.filter(a => a.attackerBotId === bot.id).map(a => a.targetId)), thr = botThreatened(bot.id);
    for (const a of armies) if (a.who === bot.id && a.t != null) busy.add(a.t);                 // their own army out there is already on it
    // a player has a few march slots, not hundreds: columns on the road (attacks + sends) count against them
    let slots = Math.min((st.marches || 5) - pendingAttacks.filter(a => a.attackerBotId === bot.id).length - pendingSends.filter(x => x.senderBotId === bot.id && !x.back).length,
        AUF ? AUF.marschFrei(bot.id) : Infinity);                // Marsch-Plätze der Burg (wie bei dir): nie mehr gleichzeitig
    const commit = st.commit || .7;                              // how much of a base's army a person sends at once
    // 1) look around: every reachable target near the bot's bigger armies, with how much the bot could throw at it
    const T = new Map(), sitM = new Map();                      // targetId → { target, d, sources: [{ id, have }] }
    const sitOf = (t, ow) => { let v = sitM.get(t.id); if (v === undefined) { v = botSituation(bot, st, t, ow, now); sitM.set(t.id, v); } return v; };   // (the same for every base looking at it)
    const okM = new Map(), okOf = t => { let v = okM.get(t.id); if (v === undefined) okM.set(t.id, v = !(owned.has(t.id) || (isCapital(t.id) && brennt(t.id)) || busy.has(t.id)   // eine brennende Hauptstadt gerade nicht (eben geplündert)
        || (shOwn.has(islandOwnerOf(t.id)) && shieldCovers(t)) || bundFreund(bot.id, islandOwnerOf(t.id)))); return v; };   // anyone's Friedensschild · nie ein Bündnis-Mitglied
    const pullM = new Map(), pullOf = t => { let v = pullM.get(t.id); if (v) return v;                // everything about a target that doesn't depend on where they look from (once per move, not per base)
        const ow = islandOwnerOf(t.id), grudge = botGrudgeOn(bot.id, ow);                          // revenge pulls them towards whoever hit them
        const k = (grudge ? 1 / (1 + grudge.n) : 1) * sitOf(t, ow) * (rally && rally.t === t.id ? .05 : 1)   // the planned big strike comes first
            * (bundZiel === t.id ? .1 : 1)                                                          // ein Bündnis-Signal „Angriff auf …“
            * (t.id === megaTempleId && ruler !== bot.id ? (ruler ? .1 : .015) : 1)                // the throne pulls - an empty one most of all (the crown is free)
            * botMidPull(bot, t, ruler, now)                                                        // the Kopfgeld on the ruler
            * (isCapital(t.id) ? 1.6 : 1);                                                          // eine Hauptstadt fällt nie – nur Beute: weniger reizvoll als ein Turm
        pullM.set(t.id, v = { ow, grudge, k }); return v; };
    const mem = loadBotState()[bot.id], bundZiel = typeof bundZielVon === 'function' ? bundZielVon(bot.id) : null;
    if (mem.rally && (now > mem.rally.until || !owned.has(mem.rally.at) || owned.has(mem.rally.t) || isCapital(mem.rally.t))) mem.rally = null;
    const rally = mem.rally, sampled = botSampleSources(owned, st.sources), kennt = botKennt(bot.id);
    if (rally && !sampled.includes(rally.at)) sampled.push(rally.at);
    for (const sourceId of sampled) {
        if (thr.has(sourceId) || sourceId === megaTempleId && !(rally && rally.at === sourceId)) continue;   // nobody empties the throne for an ordinary attack - or a base the enemy is marching on
        const have = Math.floor((islandTroops[sourceId] || 0) * (rally && rally.at === sourceId ? .95 : Math.min(commit, botFrei(bot.id, sourceId, now))));   // the gathered army goes almost whole (sonst nach Lage: botFrei)
        if (have < BOT_MIN_GARRISON_TO_ATTACK) continue;
        const source = islandById[sourceId];
        for (const lmId of reachableLandmassIds[source.landmassId]) {
            if (!landmassesConnected(source.landmassId, lmId) || !kennt.has(lmId)) continue;   // nur was sie erforscht haben (Nebel)
            const toll = tollFor(source.landmassId, lmId, have, bot.id).cost, canPass = !toll || (botCoins[bot.id] || 0) >= toll;
            for (const target of islandsByLandmass[lmId] || []) {
                if (!okOf(target)) continue;                                                   // theirs, a burning capital, already on it, or under a shield
                if (!canPass && !(target.type === 'gate' && gateOnRoute(source.landmassId, lmId) === target)) continue;
                const pv = pullOf(target), grudge = pv.grudge, tOwner = pv.ow;
                let d = Math.hypot(target.x - source.x, target.y - source.y) * pv.k;
                const inward = landmasses[target.landmassId].ring < landmasses[source.landmassId].ring;
                if (inward) d *= (target.type === 'gate' ? .3 : .5) * (typeof bundVon === 'function' && bundVon(bot.id) ? .7 : 1);   // everyone wants to get to the middle – im Bündnis noch mehr (sie ziehen gemeinsam nach vorne)
                else if (bossAt(target.id)) d *= 0.15;                                         // events: the Kriegsherr (Wanderboss) is worth a big attack
                else if (target.type === 'gate' || target.type === 'temple' || target.guardian) d *= st.temple;
                else if (tOwner) d *= st.enemy / (tOwner === 'player' ? 1 + (st.hunt || 0) : 1);   // raiders like hitting other players, the aggressive ones the player most
                const e = T.get(target.id) || { target, d: Infinity, sources: [], grudge };
                e.d = Math.min(e.d, d); e.sources.push({ id: sourceId, have }); T.set(target.id, e);
            }
        }
    }
    // now and then a look at the human's bases next door - from whichever of their own bases is nearest, not only the big armies
    if (!shielded && ownedIslands.size && !bundFreund(bot.id, 'player') && Math.random() < .6) {
        const cap = islandById[botCapitalOf(bot.id)] || islandById[[...owned][0]];
        const near = [...ownedIslands].filter(id => !isCapital(id) && !busy.has(id)).map(id => islandById[id]).sort((u, v) => Math.hypot(u.x - cap.x, u.y - cap.y) - Math.hypot(v.x - cap.x, v.y - cap.y)).slice(0, 12);
        for (const pt of near) {
            if (!kennt.has(pt.landmassId)) continue;                    // im Nebel: kennen sie nicht
            let best = null, bd = Infinity;
            for (const l of reachableLandmassIds[pt.landmassId] || []) { if (!landmassesConnected(l, pt.landmassId)) continue;
                for (const s of islandsByLandmass[l] || []) { if (!owned.has(s.id) || thr.has(s.id)) continue; const have = Math.floor((islandTroops[s.id] || 0) * commit); if (have < BOT_MIN_GARRISON_TO_ATTACK) continue;
                    const d = Math.hypot(pt.x - s.x, pt.y - s.y); if (d < bd) { bd = d; best = { id: s.id, have }; } } }
            if (!best) continue;
            const grudge = botGrudgeOn(bot.id, 'player'), d = bd * st.enemy / (1 + (st.hunt || 0)) * (grudge ? 1 / (1 + grudge.n) : 1) * sitOf(pt, 'player');
            const e = T.get(pt.id) || { target: pt, d: Infinity, sources: [], grudge };
            e.d = Math.min(e.d, d); if (!e.sources.some(sv => sv.id === best.id)) e.sources.push(best); T.set(pt.id, e);
        }
    }
    // events are a rally: every base in reach joins, not just the few the bot happened to look at
    for (const e of T.values()) if (bossAt(e.target.id) || e.target.id === megaTempleId) {
        const have0 = new Set(e.sources.map(sv => sv.id));
        for (const sourceId of owned) {
            if (have0.has(sourceId) || thr.has(sourceId)) continue;
            const src = islandById[sourceId], have = Math.floor((islandTroops[sourceId] || 0) * Math.min(commit, botFrei(bot.id, sourceId, now)));   // (bedrohte Basen und die Hauptstadt behalten ihren Teil)
            if (have < BOT_MIN_GARRISON_TO_ATTACK || !(reachableLandmassIds[src.landmassId] || []).includes(e.target.landmassId) || !landmassesConnected(src.landmassId, e.target.landmassId)) continue;
            e.sources.push({ id: sourceId, have });
        }
    }
    if (!T.size) { if (botGather(bot)) botTapped(bot); return; }
    const list = [...T.values()].sort((x, y) => x.d - y.d).slice(0, 40);
    let scouted = 0;
    // 3) attack what they know they can beat - with a real army, not the bare minimum. One attack per move,
    // several bases join when one isn't enough, and now and then they gamble on a base they never scouted.
    const launches = 1, used = {}; let n = 0, rallied = false, gambles = Math.random() < (st.risk || 0) * .5 ? 1 : 0;
    // grow like a person: build up what you have before grabbing more empty land. New neutral bases only while the
    // empire is built up well enough (more bases → higher average level needed), and only one or two per move.
    // Enemies, events, temples, gates and steps towards the middle are always worth it.
    // (die Hauptstadt zählt nicht mit: ihre Stufe kommt von der Burg (aufbau.js) – sonst nähme ein Mitspieler mit Burg 1 und nur
    //  der Hauptstadt nie eine erste freie Basis und schickte nur Späher, live 3.10.: 44 von 150 so festgesteckt)
    let lvSum = 0, lvN = 0; for (const id of owned) if (!isCapital(id)) { lvSum += islandLevels[id] || 1; lvN++; }
    const builtUp = !lvN || lvSum / lvN >= Math.min(14, 1 + owned.size / 25);
    const grabs = builtUp && now - (mem.lastGrabAt || 0) > 1500 ? 1 : 0;                  // at most one new base every 1.5 s, even for the fastest
    for (const [li, e] of list.entries()) {
        if (n >= launches || slots <= 0) break;
        const boss = bossAt(e.target.id);                                                          // an event's strength is public
        let it = boss ? { s: boss.troops + boss.defense } : botIntel(bot, e.target.id), gamble = false;
        const vsPlayer = islandOwnerOf(e.target.id) === 'player';
        if (!it && !vsPlayer && e.target.type === 'tower' && gambles > 0 && !botScouting(bot, e.target.id) && Math.random() < .5) { gambles--;   // risky: attack on a guess (never blind on a real player, the throne, a gate or a temple)
            it = { s: (effectiveTroops(e.target) + effectiveDefense(e.target)) * (.55 + Math.random() * .9) }; gamble = true;
        }
        if (!it) {                                                                               // their best targets they don't know yet: scout those first
            if (botHopeless(bot, e.target, st, atk)) continue;                                   // they saw it last time - far beyond them
            if (li < 3 && !botScouting(bot, e.target.id) && !neulingAktiv(islandOwnerOf(e.target.id))) { const ready = now + scoutSecs(islandById[e.sources[0].id], e.target, bot.id) * 1000;
                if (botLearn(bot.id, e.target.id, ready, islandById[e.sources[0].id].landmassId) !== false && islandOwnerOf(e.target.id) === 'player') botScoutVisible(bot, e.sources[0].id, e.target.id, now, ready);
                scouted++; break; }
            continue;
        }
        const grab = e.target.type === 'tower' && !islandOwnerOf(e.target.id) && !boss && !(rally && rally.t === e.target.id) &&
            landmasses[e.target.landmassId].ring >= landmasses[islandById[e.sources[0].id].landmassId].ring;
        if (grab && grabs <= 0) continue;
        const margin = (vsPlayer ? Math.max(1.25, st.margin)                                        // against a real player: always a safe margin
                                : st.margin * (e.grudge ? .85 : 1) * (Math.random() < (st.risk || 0) ? .8 : 1))   // sometimes they cut it close
                          * botMarginFor(bot, e.target, islandOwnerOf(e.target.id), now);                   // a vendetta or a lesson learned brings more
        if (botFails(bot, e.target.id, now) >= 2 && !(rally && rally.t === e.target.id) && !gamble) {        // not the same wall a third time with a normal army
            if (!rallied && !mem.rally) rallied = botRally(bot, e.target, e.sources[0].id, it.s * margin / atk, slots);
            if (rallied) break; continue;
        }
        // think ahead like a person: a player's base keeps producing - by the time the army arrives there is more.
        // The report's age plus the march time, at the rate a base of that level makes troops (with some slack).
        let expect = it.s;
        if (islandOwnerOf(e.target.id) && it.ready) {
            const lvl = islandLevels[e.target.id] || 1, src0 = islandById[e.sources[0].id];
            const secs = Math.max(0, now - it.ready) / 1000 + travelDurationSeconds(src0, e.target, bot.id);
            const ow = islandOwnerOf(e.target.id), perSec = ow === 'player' ? playerTroopMult() * 1000 / productionTickMs() : botMults(ow).troops * (rulerOwner() === ow ? RULER_BONUS : 1) * 1000 / botTickMs(ow);
            expect += troopsPerTick(lvl) * perSec * 1.5 * secs;
        }
        const need = expect * margin / atk;                                                        // what they believe it takes
        const srcs = e.sources.map(sv => ({ id: sv.id, have: sv.have - (used[sv.id] || 0) })).filter(sv => sv.have >= BOT_MIN_GARRISON_TO_ATTACK).sort((u, v) => v.have - u.have);
        const total = srcs.reduce((a2, sv) => a2 + sv.have, 0);
        if (total < need * (boss ? .35 : 1)) {                                                     // a boss is worn down by many attacks - worth it with a third
            if (gamble || rallied || mem.rally) continue;
            const pool = botPoolFor(bot, e.target);                                                 // not enough right here - but what about the whole empire?
            if (pool.s < need * (boss ? .35 : 1.1)) { if (!boss) botNoteTooStrong(bot, e.target.id, pool.s); continue; }   // far beyond them: leave it alone for a while
            const worth = boss || vsPlayer || islandOwnerOf(e.target.id) || e.target.type !== 'tower' || e.target.id === megaTempleId;
            if (!worth) continue;                                                                 // nobody gathers an army for an empty tower
            rallied = (vsPlayer || Math.random() < .6 ? botArmyRally(bot, e.target, need, pool.src) : false) || botRally(bot, e.target, srcs[0] ? srcs[0].id : pool.src[0].id, need, slots);   // gather in the open (you see it coming) or in a base
            if (rallied) break;                                                                   // that was this move's order
            if (!boss && botArmies(bot.id).length < (BOT_STYLES[bot.style].armies || 1)) botNoteTooStrong(bot, e.target.id, pool.s);   // couldn't get it together: not again every move
            continue;
        }
        const big = boss || e.target.type !== 'tower' || e.target.id === megaTempleId || (rally && rally.t === e.target.id);
        if ((big || islandOwnerOf(e.target.id)) && srcs.length >= 2 && !gamble && Math.random() < .3 && botArmyRally(bot, e.target, need)) { rallied = true; break; }   // a big strike: gather out in the open first
        // the plan: the strongest base with most of its troops; only if that isn't enough a second or third base joins
        // (a big target up to four). The farthest goes first - a person's way of getting them there at a similar time.
        const want = big ? Math.min(Math.max(need * 2.2, total), need * 3) : need * (gamble ? 1.3 : 1.8);   // enough with a good margin, not everything they have
        const steps = []; let sum = 0;
        for (const sv of srcs) {
            if (sum >= want || steps.length >= Math.min(big ? 4 : 3, Math.max(1, slots))) break;
            const give = Math.min(sv.have, Math.ceil(want - sum) + 1);
            if (give < BOT_MIN_GARRISON_TO_ATTACK) continue;
            steps.push({ from: sv.id, n: give, eta: travelDurationSeconds(islandById[sv.id], e.target, bot.id) }); sum += give;
            if (!big && sum >= need * 1.4) break;                                                 // enough - a person doesn't pile on
        }
        if (sum < need) continue;
        steps.sort((u, v) => v.eta - u.eta);
        act.plan = { kind: 'attack', t: e.target.id, steps, until: now + 30000, believed: it.s };
        if (botPlanStep(bot)) { n++; if (grab) mem.lastGrabAt = now; botRevengeLaunched(bot, e.target.id); if (rally && rally.t === e.target.id) mem.rally = null; }
        break;                                                                                    // one decision per move
    }
    // nothing to strike: scout the most interesting base they don't know yet (that is this move's order)
    if (!n && !rallied && !scouted) for (const e of list.slice(0, 8)) {
        if (botIntel(bot, e.target.id) || botScouting(bot, e.target.id) || bossAt(e.target.id)) continue;
        const ow = islandOwnerOf(e.target.id); if (neulingAktiv(ow)) continue;   // Anfängerschutz: nicht ausspähen
        if (ow && ow !== 'player' && botStrategic(bot, e.target) >= .9 && !botGrudgeOn(bot.id, ow)) continue;   // a far base of someone else: not worth a look
        if (botHopeless(bot, e.target, st, atk)) continue;
        const ready = now + scoutSecs(islandById[e.sources[0].id], e.target, bot.id) * 1000;   // their scout walks as long as yours would
        if (botLearn(bot.id, e.target.id, ready, islandById[e.sources[0].id].landmassId) === false) continue;   // Tor zu: anderes Ziel
        if (islandOwnerOf(e.target.id) === 'player') botScoutVisible(bot, e.sources[0].id, e.target.id, now, ready);   // you see it coming
        scouted++; break;
    }
    if (n || rallied || scouted) botTapped(bot);
    if (!n && !scouted && !rallied && (botGather(bot) || (Math.random() < .35 && botGatherField(bot)))) botTapped(bot);
    saveBotState();
}

