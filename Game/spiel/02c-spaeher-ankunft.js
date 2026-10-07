// Teil 02c-spaeher-ankunft.js: Späher und Späherbericht, Ankunft der Angriffe (resolveAttack), Rückzug
// "Spähen": no troops needed, but a scout still takes time to reach
// the target - measured from the player's home base.
// Always scouts from whichever owned base is actually closest to the
// target, not always the player's original home base - a scout sent
// from a far-off home while a much closer base sits right next to
// the target made no sense.
function nearestOwnedIslandTo(target) {
    let bestId = null, bestDist = Infinity;
    for (const id of ownedIslands) {
        const isl = islandById[id];
        if (!isl) continue;
        const dist = Math.hypot(isl.x - target.x, isl.y - target.y);
        if (dist < bestDist) { bestDist = dist; bestId = id; }
    }
    return bestId;
}

function launchScout(targetId, explore, at) {
    const target = islandById[targetId];
    if (!target) return;
    const sourceId = nearestOwnedIslandTo(target);
    const home = islandById[sourceId];
    if (!home) return;
    if (!explore) { const ow = islandOwnerOf(targetId); if (ow && ow !== 'player' && neulingAktiv(ow)) { flashHint(neulingBlockText(ow), 4000); return; } }   // Anfängerschutz: niemand späht Neulinge aus
    if (!spaeherWeg(home.landmassId, target.landmassId, 'player')) { const g = wegGrund(home.landmassId, target.landmassId, 'player'); flashHint(g && /öffnet/.test(g) ? g : 'Ein geschlossenes Tor versperrt den Weg – dein Späher kommt nicht durch.', 3500); return; }
    sfx('scout');

    const durationSec = scoutSecs(home, target);   // the Späherturm makes scouts faster
    const startedAt = Date.now();
    const sc = {
        sourceId,
        targetId,
        startedAt,
        resolveAt: startedAt + durationSec * 1000,
        explore: !!explore,
        ex: at ? at.x : undefined, ey: at ? at.y : undefined
    };
    pendingScouts.push(sc);
    const key = marchKeyOf(sc);                                                  // (Zurück/Schneller finden ihn beim Weltrechner über diese Kennung)
    if (explore) alsBefehl('spaehen', { ziel: targetId, ex: at ? Math.round(at.x) : undefined, ey: at ? Math.round(at.y) : undefined, key });   // 3B: der Weltrechner deckt den Nebel auf dem Server mit auf
    else if (fremdGeheim() && islandOwnerOf(targetId) && islandOwnerOf(targetId) !== 'player' && !bossAt(targetId)) alsBefehl('spaehen', { ziel: targetId, blick: 1, key });   // fremde Basis: den Bericht schreibt der Weltrechner (nur er kennt die Werte)
    questProgress('scout', 1);
    saveGame();
    saveProgression();
    flashHint((explore ? 'Späher erkundet das Gebiet · ca. ' : 'Späher unterwegs zu ' + islandTitle(target) + ' · ca. ') + fmtClock(durationSec));
    renderActiveMarches();
}

// Spähbericht: was der Späher über den Herrn der Basis herausfindet – alles, sofort (Alexander 4.10.): Herr, Stufe, Titel,
// Schild, Mauer, Helden, Burg, Rohstoffe (und wie viel davon zu holen ist), Fähigkeiten, Forschung, Ausrüstung – dazu die Basis
// (island): ihre Stufe und die Verteidigung Teil für Teil wie im Kampfbericht (defenseParts, Summe = effectiveDefense)
function spaeherBlick(owner, island) {
    if (!owner || owner === 'player' || !botById[owner]) return null;
    const b = loadBotState()[owner]; if (!b) return null;
    const t = titleOf(owner), o = { name: botById[owner].name, lvl: b.lvl || 1, titel: t ? t.name : '', schild: !!ownerShielded(owner), wall: botBld(owner, 'wall') || 0 };
    o.held = Object.entries(b.hs || {}).filter(([id, h]) => h && h.own && heroById(id)).sort((x, y) => (y[1].q || 0) - (x[1].q || 0)).slice(0, 3).map(([id, h]) => [heroById(id).name, (h.q || 0) / 2]);
    o.sk = { attack: (b.skills || {}).attack || 0, defense: (b.skills || {}).defense || 0, troops: (b.skills || {}).troops || 0 };
    o.gear = {}; for (const k of Object.keys(EQUIPMENT_DEFS)) { const it = botItem(b, k); o.gear[k] = it ? [it.rarity, it.level, it.stars] : null; }
    o.auf = AUF ? AUF.spaeherMehr(owner) : null;                             // Burg, Rohstoffe, Forschung
    const m = botMults(owner);                                               // Abwehr-Werte (Zuschauer: effectiveDefense rechnet damit, bis wieder gespäht wird)
    const vx = vhFx(owner);                                                  // Verteidigungs-Helden aus der Mauer (wer gerade zu Hause ist)
    o.k = { ar: Math.round((m.armorPct || 0) * 100) / 100, dp: Math.round((m.defensePct || 0) * 100) / 100, wall: o.wall, kk: Math.round((AUF ? AUF.kampf(owner, 'd') : 1) * 1e4) / 1e4,
            va: vx ? vx.atk : 0, vg: vx ? vx.gef : 0 };
    o.vh = heroReportOf(vx);
    o.who = neutralId(owner);
    if (island) { o.bl = islandLevels[island.id] || 1; o.teile = defenseParts(island).map(q => [q[0], Math.round(q[1]), q[2] || '']); }
    return o;
}
// Spähbericht: EINE Zahl für die Verteidigung (Chip und Summe im Bericht) = Truppen + Verstärkung + Verteidigung – die Zeilen addieren sich zu ihr
function spaehGesamt(e) { return (e.troops || 0) + (e.verst || 0) + (e.defense || 0); }
// Zuschauer: Abwehr-Werte eines Herrn aus dem neuesten Spähbericht (null: nie gespäht)
let spaehWerteMem = null;
function spaehWerte(owner) {
    if (!combatLog) return null;
    if (!spaehWerteMem || spaehWerteMem.l !== combatLog.length || spaehWerteMem.e !== combatLog[0]) {   // (neu sortiert erst, wenn ein Bericht dazukam)
        const by = {}; for (const e of combatLog) if (e && e.type === 'scout' && e.spy && e.spy.k && e.spy.who && !by[e.spy.who]) by[e.spy.who] = e.spy.k;
        spaehWerteMem = { l: combatLog.length, e: combatLog[0], by };
    }
    const k = spaehWerteMem.by[neutralId(owner)]; if (!k) return null;
    const n = v => Number.isFinite(v) ? v : 0;
    return { ar: n(k.ar), dp: n(k.dp), wall: n(k.wall), kk: Number.isFinite(k.kk) && k.kk > 0 ? k.kk : 1, va: n(k.va), vg: n(k.vg) };
}
// Spähbericht vom Weltrechner (Zuschauer): kam er vor dem eigenen Späher an, wartet er hier (nur im Speicher), sonst füllt er
// den wartenden Eintrag im Kampflog
const spaehPost = new Map();
function spaehBericht(r) {
    if (!r || !Number.isInteger(r.ziel) || !islandById[r.ziel]) return;
    const x = combatLog.find(e => e.type === 'scout' && e.targetId === r.ziel && e.wartet);
    if (!x) { spaehPost.set(r.ziel, { r, bis: Date.now() + 600000 }); return; }
    spaehEinsetzen(x, r); spaehGeaendert();
}
function spaehGeaendert() {
    store.set('openWaterCombatLog', JSON.stringify(combatLog)); spaehWerteMem = null;
    const logPanel = document.getElementById('battleLogPopup');
    if (logPanel && logPanel.classList.contains('is-open')) refreshOpenCombatLog();
}
function spaehEinsetzen(x, r) {
    delete x.wartet;
    if (r.fehl) { x.fehl = 1; return; }                   // der Weltrechner hat den Späher abgelehnt: kein Bericht
    const z = v => Number.isFinite(v) && v >= 0 ? v : 0;
    x.troops = z(r.troops); x.defense = z(r.defense); x.verst = z(r.verst); x.spy = r.spy && typeof r.spy === 'object' ? r.spy : null;
}
// (Zuschauer) Ein Spähbericht, der nach 10 Min. immer noch fehlt, kommt nicht mehr: „kein Bericht“ statt für immer „wartet“
const SPAEH_WARTEN_MS = 600000;
function spaehAbgelaufen(now) {
    let neu = false;
    for (const e of combatLog || []) if (e && e.type === 'scout' && e.wartet && now - (e.wartet > 1 ? e.wartet : e.at || 0) > SPAEH_WARTEN_MS) { delete e.wartet; e.fehl = 1; neu = true; }
    if (neu) spaehGeaendert();
}
setInterval(() => spaehAbgelaufen(Date.now()), 30000);
// Wann wurde diese Basis zuletzt gespäht (neuester Bericht im Kampflog; null: keiner)? Ab 30 Min. gilt er als alt („neu spähen?“)
const SPAEH_ALT_MS = 30 * 60000;
function spaehVom(id) {
    const e = (combatLog || []).find(x => x && x.type === 'scout' && x.targetId === id && !x.wartet && !x.fehl);
    return e && Number.isFinite(e.at) ? e.at : null;
}
function spaehWann(at) { const m = Math.floor((Date.now() - at) / 60000); return m < 1 ? 'gerade eben' : m < 60 ? 'vor ' + m + ' Min.' : 'vor ' + Math.floor(m / 60) + ' Std.'; }   // (ändert sich höchstens jede Minute)
function spaehAlterText(id) { const at = spaehVom(id); return at === null ? '' : 'Gespäht ' + spaehWann(at) + (Date.now() - at >= SPAEH_ALT_MS ? ' – die Werte können sich geändert haben, neu spähen?' : ''); }
// Verstärkung in einer fremden Basis laut dem neuesten Spähbericht (Zuschauer kennen sie sonst nicht)
function spaehVerst(id) {
    const e = (combatLog || []).find(x => x && x.type === 'scout' && x.targetId === id && !x.wartet && !x.fehl);
    return e && Number.isFinite(e.verst) ? e.verst : 0;
}
function spaeherBlickHtml(s) {
    if (!s) return '';
    const stern = n => n ? ' ' + heroStarTxt(Math.round(n * 2)) : '', zeile = (a, b) => '<div class="logLine"><span>' + a + '</span><span>' + b + '</span></div>';   // (held: Sterne/2 – wie die Heldenkarte)
    const A = s.auf || {}, R = A.roh;
    const gear = s.gear ? Object.keys(EQUIPMENT_DEFS).filter(k => s.gear[k]).map(k => { const g = s.gear[k]; return '<div class="logLine"><span>' + EQUIPMENT_DEFS[k].name + '</span><span style="color:' + RARITY_DEFS[g[0]].color + '">' +
        RARITY_DEFS[g[0]].label + ' · St. ' + g[1] + (g[2] ? ' · ' + g[2] + '★' : '') + '</span></div>'; }).join('') : '';   // (nur angelegte Teile)
    const beute = (v, sch) => fmtCompact(v) + (R && v > sch ? ' <small>(' + fmtCompact(Math.floor((v - sch) * HAUPT_BEUTE)) + ' zu holen an der Hauptstadt)</small>' : ''), schR = R ? R.schutzR || R.schutz * ROH_JE_MUENZE : 0;   // (Holz/Stein/Eisen: Schutz × ROH_JE_MUENZE)
    return '<details><summary>Spähbericht</summary><div class="logSide" style="margin-top:6px">' +
        zeile('Herr', escapeHtml(s.name) + ' · Spieler-Stufe ' + fmtNum(s.lvl) + (s.titel ? ' · ' + escapeHtml(s.titel) : '')) +
        (s.bl ? zeile('Basis', 'Stufe ' + fmtNum(s.bl)) : '') +
        zeile('Friedensschild', s.schild ? 'aktiv' : 'keiner') +
        (s.wall !== undefined ? zeile('Mauer', 'Stufe ' + s.wall) : '') +
        (s.held ? zeile('Helden', s.held.length ? s.held.map(h => escapeHtml(h[0]) + stern(h[1])).join(', ') : 'keine') : '') +
        (s.vh !== undefined ? zeile('Verteidigungs-Held', s.vh && heroById(s.vh.id) ? escapeHtml(heroTag(Object.assign({}, s.vh, { id2: s.vh.h2 && s.vh.h2.id }))) : 'keiner') : '') +
        (A.burg ? zeile('Burg', 'Stufe ' + A.burg + (R ? ' · schützt ' + fmtCompact(R.schutz) + ' Münzen, ' + fmtCompact(schR) + ' je Rohstoff' : '')) : '') +
        (R ? zeile('Münzen', beute(R.c, R.schutz)) + (R.h !== undefined ? zeile('Holz', beute(R.h, schR)) + zeile('Stein', beute(R.s, schR)) + zeile('Eisen', beute(R.e, schR)) : '') : '') +
        (s.sk ? zeile('Fähigkeiten', 'Angriff ' + s.sk.attack + ' · Vert. ' + s.sk.defense + ' · Truppen ' + s.sk.troops) : '') +
        (A.fo ? zeile('Forschung', 'Angriff ' + (A.fo.atk | 0) + ' · Vert. ' + (A.fo.def | 0) + ' · Krankenhaus ' + (A.fo.laz | 0)) : '') + gear + '</div></details>';
}
// Der Späher läuft hin UND zurück (Alexander 4.10.): am Ziel gibt es den Bericht, dann geht er denselben Weg heim
function spaeherHeim(scout, ms) {
    const now = Date.now(), dauer = Math.max(1000, ms);
    pendingScouts.push({ sourceId: scout.targetId, targetId: scout.sourceId, startedAt: now, resolveAt: now + dauer, back: true });
}
function resolveScout(scout) {
    if (scout.back) { saveProgression(); return; }                            // wieder zu Hause
    const target = islandById[scout.targetId];
    if (!target) return;
    spaeherHeim(scout, scout.resolveAt - scout.startedAt);
    if (scout.explore) {
        revealAround(scout.ex ?? target.x, scout.ey ?? target.y, REVEAL_SCOUT, true);
        saveProgression();
        flashHint('Gebiet erkundet – der Nebel lichtet sich.', 3500);
        return;
    }
    scoutedIslands.add(scout.targetId); statBump('scouts');
    saveGame();
    // Same reasoning as resolveSend(): persist the now-shorter
    // pendingScouts array, or a reload replays this scout again.
    saveProgression();
    const ow = islandOwnerOf(target.id), vomWr = fremdGeheim() && ow && ow !== 'player' && !bossAt(target.id);   // Zuschauer: fremde Werte kennt nur der Weltrechner
    const post = vomWr ? spaehPost.get(scout.targetId) : null; if (post) spaehPost.delete(scout.targetId);
    const eintrag = {
        type: 'scout',
        sourceId: scout.sourceId,
        targetId: scout.targetId,
        troops: effectiveTroops(target),
        defense: effectiveDefense(target),
        spy: vomWr ? null : spaeherBlick(ow, target)
    };
    if (ow && !vomWr && typeof verst !== 'undefined') eintrag.verst = verst.l.reduce((s, v) => s + (v.t === target.id ? v.n : 0), 0);   // Verstärkung (Botschaft): eigene Zeile im Bericht
    if (post && post.bis > Date.now()) spaehEinsetzen(eintrag, post.r); else if (vomWr) eintrag.wartet = Date.now();   // (wartet: der Bericht vom Weltrechner kommt gleich – sonst nach 10 Min. „kein Bericht“)
    addCombatLogEntry(eintrag); spaehWerteMem = null;
    flashHint(islandTitle(target) + ' gespäht – Bericht im Kampflog.', 3000);   // (die Zahlen stehen im Kampflog, nicht im Hinweis)
}

function retreatPct(attack) { return Math.min(60, RETREAT_RECOVERY_PCT + (attack.hx ? attack.hx.flee || 0 : 0)); }   // a hero (Standhaft, Leichtfuß …): more of a beaten army gets away (gemeinsam: rallyFlucht, jeder mit seinem)
function retreatSecs(attack, from, to, botId) { return travelDurationSeconds(from, to, botId) / (1 + (attack.hx ? attack.hx.ret : 0) / 100); }   // Rückweg, Feldküche: faster home
function retreatSurvivorsPreview(attack) { return Math.floor(attack.rawTroops * retreatPct(attack) / 100); }
function resolveAttack(attack) {
    const source = islandById[attack.sourceId];
    const target = islandById[attack.targetId];
    if (!source || !target) return;

    // Uses the bonuses snapshotted at launch (see launchAttack), not
    // whatever the player's skills/equipment are right now - troops
    // already marching shouldn't have their outcome change because
    // a skill got leveled up while they were still en route.
    const atkBonus = attack.attackBonus !== undefined ? attack.attackBonus : attackFlatBonus(attack.rawTroops);
    const lossReductionPct = attack.shieldLossReductionPct !== undefined ? attack.shieldLossReductionPct : shieldLossReductionPct();
    const rewardRate = attack.rewardGoldRate !== undefined ? attack.rewardGoldRate : goldPerKillRate();

    const myTroops = Math.round((attack.rawTroops + atkBonus) * (attack.atkTitle !== undefined ? attack.atkTitle : titleMult('player', 'attack')) * (attack.atkKraft || 1));   // (Truppen-Stufe + Forschung vom Losschicken)
    const targetOwner = islandOwnerOf(target.id); // null | 'player' | a bot id
    if (targetOwner === 'player') { islandTroops[target.id] = (islandTroops[target.id] || 0) + attack.rawTroops; saveGame(); requestRender(); return; }   // inzwischen deine (ein anderer Angriff hat sie genommen): die Truppen bleiben dort
    const vk = targetOwner && typeof verstVorKampf === 'function' ? verstVorKampf(target.id) : null;   // Verstärkung (Botschaft) verteidigt mit
    attack._vk = vk;                                                  // (bricht der Kampf mit einem Fehler ab: kampfAufraeumen trennt sie wieder)
    attack._vkOwner = targetOwner;                                    // (Besitzer vor dem Kampf: so erkennt das Aufräumen eine schon eroberte Insel)
    const originalEnemyTroops = effectiveTroops(target);
    const dHx = targetOwner ? vhFx(targetOwner) : null;               // Verteidigungs-Helden aus seiner Mauer (stecken schon in effectiveDefense)
    const fullDefense = effectiveDefense(target), originalEnemyDefense = Math.round(fullDefense * (1 - heroDefCut(attack))), defParts = heroDefPart(defenseParts(target), attack, fullDefense);
    const atkParts = attackParts('player', attack.rawTroops, atkBonus, myTroops, attack.hero, attack), hosp = attack.hx ? Math.min(100, hospitalPct() + attack.hx.hosp) : undefined;
    const totalStrength = originalEnemyTroops + originalEnemyDefense;
    const won = myTroops > totalStrength;
    const bossHere = bossAt(target.id);
    const capitalHolds = won && targetOwner && targetOwner !== 'player' && isCapital(target.id);   // a capital never falls: only its garrison - and it burns
    if (targetOwner && targetOwner !== 'player') botGrudge(targetOwner, 'player', won ? 2 : 1);   // the bot remembers this
    const losses = Math.round(originalEnemyDefense * (1 - lossReductionPct / 100));
    const sentLoss = won ? Math.min(attack.rawTroops, Math.round(losses * attack.rawTroops / Math.max(1, myTroops))) : 0;   // the losses are shared between sent and bonus troops
    const remaining = won ? Math.max(0, attack.rawTroops - sentLoss) : 0;

    let defenderCasualties, enemyWounded = 0, killGold = 0;
    const dTeile = typeof verstAnteile === 'function' ? verstAnteile(vk, targetOwner, originalEnemyTroops + fullDefense) : null;   // Verteidiger: Besitzer + Helfer nach Anteil
    const dTeil = w => { const t = dTeile && dTeile.find(x => x[0] === w); return t ? t[1] : 1; }, atkWeg = won ? sentLoss : attack.rawTroops - retreatSurvivorsPreview(attack);
    if (targetOwner && targetOwner !== 'player')                    // the defending bot's "Verteidigung: Gold": every attacker its garrison really kills pays out (nur sein Anteil – die Helfer: unten)
        botCoins[targetOwner] = (botCoins[targetOwner] || 0) + Math.round(atkWeg * dTeil(targetOwner) * defGoldRateHx(targetOwner, dHx));
    let retreatSurvivors = 0, woundedAdded = 0;
    const plunder = won && targetOwner && targetOwner !== 'player' ? plunderOf(targetOwner, capitalHolds) : null;   // Beute: ein kleiner Teil über seinem Burg-Schutz (nur an der Hauptstadt – Turm: nichts; Hauptstadt: alles)
    if (plunder) { plunderMove(targetOwner, null, plunder.loot, plunder.roh); inboxAdd({ src: 'fight', coins: plunder.loot }); if (plunder.roh && AUF) AUF.rohDazu('player', plunder.roh); }   // (das Gold wartet im Abholfach)
    if (capitalHolds) brandSetzen(target.id);                               // die Hauptstadt brennt (nur zu sehen)

    if (capitalHolds) {                                                     // the garrison falls, the base stays theirs - your survivors walk home
        islandTroops[target.id] = 0; defenderCasualties = originalEnemyTroops;
        woundedAdded = hospitalTake(sentLoss, hosp); warStat('fallen', sentLoss - woundedAdded); warStat('kills', originalEnemyTroops);
        killGold = Math.round(originalEnemyTroops * rewardRate); inboxAdd({ src: 'fight', coins: killGold }); retreatSurvivors = remaining;
        if (remaining > 0) { const t0 = Date.now(); pendingRetreats.push({ fromId: target.id, toId: source.id, troops: remaining, startedAt: t0, resolveAt: t0 + retreatSecs(attack, target, source) * 1000 }); }
    } else if (won) {
        // Capturing a base doesn't reset it to level 1 - it costs
        // the previous owner one level of upgrades, same as losing
        // any other base. A level 10 base taken by force becomes a
        // level 9 base for its new owner, not back to scratch.
        const levelAfterCapture = Math.max(1, (islandLevels[target.id] || 1) - 1);
        if (targetOwner) { botNoteLoss(targetOwner, target.id); clearIslandOwner(target.id); } // taken from a bot (or, later, another player)
        islandTroops[target.id] = remaining;
        woundedAdded = hospitalTake(attack.rawTroops - remaining, hosp);    // your fallen in a won fight: part of them only wounded
        ownedIslands.add(target.id);
        islandLevels[target.id] = levelAfterCapture;
        questProgress('capture', 1);
        warStat('fallen', attack.rawTroops - remaining - woundedAdded); warStat('captures'); warStat('kills', originalEnemyTroops);
        statBump('captures'); if (targetOwner && targetOwner !== 'player') statBump('pvpWins');
        if (target.type === 'temple' || target.type === 'megaTemple' || target.guardian) statBump('temples');
        if (target.type === 'gate') setGateSettings(target.id, { toll: target.toll, closed: false });
        revealAround(target.x, target.y, REVEAL_BASE * (AUF ? AUF.nebelWeite('player') : 1), true);   // (Forschung Kundschaft: weiter)
        killGold = Math.round(originalEnemyTroops * rewardRate); inboxAdd({ src: 'fight', coins: killGold });   // "Angriff: Gold": per enemy troop killed
        defenderCasualties = originalEnemyTroops;
        // (das Krankenhaus des Verteidigers: unten, nach dem Trennen von seiner Verstärkung)
        if (target.type === 'temple' || target.type === 'megaTemple') {
            // Starts (or restarts) this temple's hold streak - see
            // templeHoldMultiplier(). Ready for a future PvP
            // recapture to reset this the same way.
            templeHoldSince[target.id] = Date.now();
        }
    } else {
        // A losing attack isn't one-sided: the defender also takes
        // real casualties (capped at their own garrison, and at the
        // attacker's strength - they only lose as many troops as
        // actually clashed with them), permanently weakening that
        // base for next time. And a fraction of the attacker's
        // "dead" troops actually survive and retreat back to the
        // base the attack was launched from.
        defenderCasualties = Math.round(Math.min(originalEnemyTroops, myTroops) * (1 - (dHx ? dHx.loss : 0) / 100));   // (sein Verteidigungs-Held: weniger Verluste)
        if (targetOwner) {
            islandTroops[target.id] = Math.max(0, (islandTroops[target.id] || 0) - defenderCasualties);
        } else if (bossHere) {
            bossHere.troops = Math.max(0, bossHere.troops - defenderCasualties);
            saveWander();
        } else {
            target.neutralTroops = originalEnemyTroops - defenderCasualties;
            neutralTroopOverrides[target.id] = target.neutralTroops;
        }

        warStat('attacksLost'); warStat('kills', defenderCasualties);
        killGold = Math.round(defenderCasualties * rewardRate); inboxAdd({ src: 'fight', coins: killGold });
        retreatSurvivors = retreatSurvivorsPreview(attack);
        woundedAdded = hospitalTake(attack.rawTroops - retreatSurvivors, hosp);   // Krankenhaus (+ a hero's Feldlazarett): part of the fallen are only wounded
        warStat('fallen', attack.rawTroops - retreatSurvivors - woundedAdded);
        if (retreatSurvivors > 0) {
            const durationSec = retreatSecs(attack, target, source);
            const startedAt = Date.now();
            pendingRetreats.push({
                fromId: target.id,
                toId: source.id,
                troops: retreatSurvivors,
                startedAt,
                resolveAt: startedAt + durationSec * 1000
            });
        }
    }
    const vs = vk ? verstNachKampf(target.id, vk, won) : null; delete attack._vk; delete attack._vkOwner;   // jeder trägt seinen Anteil
    if (vs) for (const h of vs.helfer) h.gold = payGold(h.w, atkWeg * dTeil(h.w) * defGoldRate(h.w));   // "Verteidigung: Gold" der Helfer: ihr Anteil mit IHREM Satz
    const verstInfo = vs ? { verst: vs.helfer, eigen: vs.eigen } : {};
    const defWeg = vs ? vs.eigenWeg : defenderCasualties;
    if (targetOwner && targetOwner !== 'player') enemyWounded = botHospitalTake(targetOwner, defWeg, dHx ? Math.min(100, botHospitalPct(targetOwner) + dHx.hosp) : undefined);   // the bot's Krankenhaus takes part of ITS fallen
    // XP for troops that died in the clash either way: a win kills
    // the whole enemy force, a loss costs your whole attack force
    noteBattle(target.id, won ? originalEnemyTroops : attack.rawTroops - retreatSurvivors, won ? targetOwner : 'player');
    midFight(target.id, 'player', won ? originalEnemyTroops : defenderCasualties, targetOwner, won ? sentLoss : attack.rawTroops - retreatSurvivors, null, dTeile);   // Punkte für die Krieger-Woche (Verteidiger: nach Anteil)
    if (targetOwner && targetOwner !== 'player') botMoodAdd(targetOwner, won ? -.25 : .1);
    addXp(kampfEp(won ? totalStrength : defenderCasualties, playerLvl, totalStrength, myTroops));
    heroFought('player', attack.hx);                                     // every fight the hero leads fills his rage
    scoutedIslands.add(target.id);
    const ribbon = () => spawnBattleFx(target.id, won, capitalHolds ? 'Geplündert' : won ? (bossHere ? 'Boss besiegt' : 'Sieg') : 'Niederlage', capitalHolds ? 'die Hauptstadt hält' : won ? islandTitle(target) + ' erobert' : '−' + fmtCompact(attack.rawTroops - retreatSurvivors) + ' Truppen');
    finishMapBattle(attack, { hero: attack.hero || null, sourceId: source.id, targetId: target.id, atk: 'mine', def: bossHere ? 'boss' : targetOwner ? 'bot' : 'neutral',   // fights the player watches play out on the map
            my: myTroops, myLoss: myTroops - (won ? remaining : retreatSurvivors), en: originalEnemyTroops,
            enLoss: won ? originalEnemyTroops : defenderCasualties, won, onEnd: ribbon });
    if (won && bossHere) defeatBoss(bossHere);
    updateHud();
    saveGame();
    saveProgression();
    if (!won) renderActiveMarches();

    // Everything the battle log shows: each side's bonuses with their source (atkParts/defParts),
    // both sides' gear, heroes and city (atkGear/defGear), losses, wounded and gold.
    addCombatLogEntry({
        type: 'attack',
        sourceId: attack.sourceId,
        targetId: attack.targetId,
        myTroops: attack.rawTroops,
        myTroopsBuffed: myTroops,
        attackBuff: myTroops - attack.rawTroops,
        skillBuff: atkBonus,
        titleBuff: myTroops - attack.rawTroops - atkBonus,
        lossReductionPct, heroLossPct: attack.hx ? attack.hx.loss : 0,
        lossSaved: won ? Math.max(0, Math.round((originalEnemyDefense - losses) * attack.rawTroops / Math.max(1, myTroops))) : 0,
        attackGoldRate: attack.attackGoldRate !== undefined ? attack.attackGoldRate : (skills.attackGold || 0) * SKILL_DEFS.attackGold.rate, killGold,
        attackerCasualties: won ? Math.max(0, sentLoss - woundedAdded) : Math.max(0, attack.rawTroops - retreatSurvivors - woundedAdded),   // really dead: not the ones who fled or lie in the Krankenhaus
        wounded: woundedAdded,
        enemyTroops: originalEnemyTroops,
        enemyDefense: originalEnemyDefense,
        defenseBuff: 0,
        defenderCasualties,
        retreatSurvivors,
        defenderName: targetOwner ? botById[targetOwner].name : null, defenderId: targetOwner && targetOwner !== 'player' ? targetOwner : null,
        atkParts, defParts, enemyWounded, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, capitalHolds,
        atkGear: fighterSnapshot('player', attack.hx), defGear: targetOwner && targetOwner !== 'player' ? fighterSnapshot(targetOwner, dHx) : null,
        won,
        remaining, ...verstInfo
    });
    if (vs) verstBerichte(vs, { type: 'botAttack', botName: profileName.value || 'Spieler', botId: 'player', targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus,
        atkGear: fighterSnapshot('player', attack.hx), defGear: fighterSnapshot(targetOwner, dHx), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, fallen: defWeg, wounded: 0,
        won, capitalHolds, defName: (botById[targetOwner] || {}).name, ...verstInfo });
    if (window.WELT && targetOwner && botById[targetOwner] && botById[targetOwner].mensch) {   // du hast einen echten Spieler angegriffen: sein Bericht
        const meinName = profileName.value || 'Spieler';
        WELT.bericht(targetOwner, { type: 'botAttack', botName: meinName, botId: 'player', targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus: atkBonus,
            atkGear: fighterSnapshot('player', attack.hx), defGear: fighterSnapshot(targetOwner, dHx), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense,
            wounded: enemyWounded || 0, fallen: defWeg, won, capitalHolds, defGold: 0, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, ...verstInfo },
            capitalHolds ? meinName + ' hat deine Hauptstadt geplündert (' + (beuteText(plunder) || 'nichts über dem Schutz') + ') – die Garnison ist gefallen, die Stadt brennt, aber sie hält.' : won ? meinName + ' hat deine Basis ' + islandTitle(target) + ' erobert!' : 'Verteidigung erfolgreich – ' + meinName + ' bei ' + islandTitle(target) + ' zurückgeschlagen.');
    }

    flashHint(capitalHolds ? 'Die Hauptstadt von ' + botById[targetOwner].name + ' brennt – ihre Garnison ist gefallen, ' + fmtCompact(remaining) + ' Truppen kehren mit der Beute zurück' + (beuteText(plunder) ? ': ' + beuteText(plunder) + '.' : '.') : (won
        ? 'Sieg bei ' + islandTitle(target) + (targetOwner ? ' gegen ' + botById[targetOwner].name : '') + '! ' + fmtCompact(remaining) + ' übrig' + (woundedAdded ? ', ' + fmtCompact(woundedAdded) + ' ins Krankenhaus.' : '.')
        : 'Niederlage bei ' + islandTitle(target) + ' – ' + fmtCompact(retreatSurvivors) + ' fliehen' + (woundedAdded ? ', ' + fmtCompact(woundedAdded) + ' ins Krankenhaus.' : '.')), 6000);
}

function resolveRetreat(retreat) {
    if (!ownedIslands.has(retreat.toId)) {          // home fell while they walked back: they go to a base that's still ours
        const home = rewardBaseId(); if (home === null || home === undefined || !islandById[home]) return;
        retreat.toId = home;
    }
    const target = islandById[retreat.toId];
    if (!target) return;
    islandTroops[retreat.toId] = (islandTroops[retreat.toId] || 0) + retreat.troops;
    updateHud();
    saveGame();
    saveProgression();
    addCombatLogEntry({
        type: 'retreat',
        fromId: retreat.fromId,
        toId: retreat.toId,
        troops: retreat.troops
    });
    flashHint(fmtNum(retreat.troops) + ' geflohene Truppen bei ' + islandTitle(target) + ' angekommen.', 3000);
}


// Precomputed once (landmasses never change): which islands sit on
// a given landmass, and which landmasses are directly reachable
// from it (itself plus every bridge-connected neighbor) - lets bot
// AI scan only the handful of landmasses actually in reach instead
// of every island on the whole map, every tick, per bot.
const islandsByLandmass = {};
for (const isl of islands) {
    (islandsByLandmass[isl.landmassId] = islandsByLandmass[isl.landmassId] || []).push(isl);
}
