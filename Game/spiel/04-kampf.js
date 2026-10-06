// Teil 04-kampf.js: Titel (Mega-Tempel), Takt der Mitspieler, Ankunft und Kämpfe (kampfDazu, Warten), Kampf-Schätzung, Boni
// ===== TITLES (Mega-Tempel) =====
// Whoever holds the Mega-Tempel hands out titles: 4 buffs for friends, 4 penalties for rivals (±25 %).
// A new holder starts with a clean slate. Bots that hold it hand them out too - you may get the Narr.
var TITLES = [
    { key: 'herzog',    name: 'Herzog',        good: true,  kind: 'troops',  v: .25, desc: '+25 % Truppenproduktion' },
    { key: 'schatz',    name: 'Schatzmeister', good: true,  kind: 'coins',   v: .25, desc: '+25 % Münzen' },
    { key: 'feldherr',  name: 'Feldherr',      good: true,  kind: 'attack',  v: .25, desc: '+25 % Angriffsstärke' },
    { key: 'burgherr',  name: 'Burgherr',      good: true,  kind: 'defense', v: .25, desc: '+25 % Verteidigung' },
    { key: 'narr',      name: 'Narr',          good: false, kind: 'troops',  v: -.25, desc: '−25 % Truppenproduktion' },
    { key: 'bettler',   name: 'Bettler',       good: false, kind: 'coins',   v: -.25, desc: '−25 % Münzen' },
    { key: 'feigling',  name: 'Feigling',      good: false, kind: 'attack',  v: -.25, desc: '−25 % Angriffsstärke' },
    { key: 'verraeter', name: 'Verräter',      good: false, kind: 'defense', v: -.25, desc: '−25 % Verteidigung' }
];
var titleState = null, titleVer = 0, ringMemo = null;
function loadTitles() {
    if (!titleState) { try { titleState = JSON.parse(store.get('openWaterTitles')) || null; } catch (e) { titleState = null; } }
    if (!titleState) titleState = { ruler: null, by: {} };
    const r = rulerOwner() || null;
    if (titleState.ruler !== r) { titleState = { ruler: r, by: {} }; saveTitles(); }     // new holder, clean slate
    return titleState;
}
function saveTitles() { titleVer++; store.set('openWaterTitles', JSON.stringify(titleState)); requestRender(); }
// The ring round someone's bases - nothing by level any more: a title from the middle while it holds (good = gold, penalty = red,
// the ruler himself blood-red and gold), otherwise a bought Ring-Skin. The title ring wins. owner → ring style { k, name, c0, c1, n, spin, pulse, dash }
const RING_TITLE = { ruler: { k: 'ruler', c0: 'rgba(235,60,50,.95)', c1: 'rgba(255,208,90,.7)', n: 24, spin: 1, pulse: 1, dash: 'rgba(255,214,110,.9)' },
                     good:  { k: 'good',  c0: 'rgba(255,208,90,.95)', c1: 'rgba(255,208,90,.5)', n: 24, pulse: 1 },
                     bad:   { k: 'bad',   c0: 'rgba(225,48,48,.95)', c1: 'rgba(150,20,30,.6)', n: 16, pulse: 1 } };
var ringVer = 0;                                  // bumped whenever anyone buys or puts on a Ring-Skin
function ringStatusByOwner() {
    const t = loadTitles(), ruler = rulerOwner() || null;          // (loadTitles first: a new ruler wipes the titles)
    if (ringMemo && ringMemo.ver === titleVer && ringMemo.rv === ringVer && ringMemo.ruler === ruler) return ringMemo.map;
    const map = new Map(), bs = loadBotState();
    const ps = ringSkinOf('player'); if (ps) map.set('player', ps);
    for (const id in bs) { const sk = ringSkinOf(id); if (sk) map.set(id, sk); }
    for (const x of TITLES) if (t.by[x.key]) map.set(t.by[x.key], x.good ? RING_TITLE.good : RING_TITLE.bad);
    if (ruler) map.set(ruler, RING_TITLE.ruler);
    ringMemo = { ver: titleVer, rv: ringVer, ruler, map }; return map;
}
function titleMult(who, kind) {
    const t = loadTitles(); let m = 1;
    for (const x of TITLES) if (x.kind === kind && t.by[x.key] === who) m *= 1 + x.v;
    return m;
}
function titleOf(who) { const t = loadTitles(); return TITLES.find(x => t.by[x.key] === who) || null; }
function titleCleanup() {                        // someone knocked out of the game can't keep a title
    if (!rechnet()) return;
    const t = loadTitles(); let ch = false;
    for (const k of Object.keys(t.by)) { const w = t.by[k]; if (w !== 'player' && (!botOwnedIslands[w] || !botOwnedIslands[w].size)) { delete t.by[k]; ch = true; } }
    if (ch) saveTitles();
}
setInterval(titleCleanup, 30000);
function giveTitle(key, who) {                   // who: 'player' | bot id | null
    const t = loadTitles();
    for (const k of Object.keys(t.by)) if (t.by[k] === who && who) delete t.by[k];      // one title per head
    if (who) t.by[key] = who; else delete t.by[key];
    saveTitles();
}
const titleModal = document.getElementById('titleModal');
function renderTitleModal() {
    const t = loadTitles(), mine = t.ruler === 'player';
    const who = w => w === 'player' ? (profileName.value || 'Du') : w ? botById[w].name : '–';
    document.getElementById('titleModalSub').textContent = mine ? 'Du hältst den Mega-Tempel. Ein guter Titel ist Respekt: wer ihn trägt, greift dich deutlich seltener an. Ein Straf-Titel schwächt – und die anderen gehen eher auf ihn los.'
        : t.ruler ? botById[t.ruler].name + ' hält den Mega-Tempel und verteilt die Titel.' : 'Niemand hält den Mega-Tempel – erobere ihn, um Titel zu vergeben.';
    const opts = cur => '<option value="">– niemand –</option>' + BOT_DEFS.filter(b => botOwnedIslands[b.id].size).map(b => '<option value="' + b.id + '"' + (cur === b.id ? ' selected' : '') + '>' + escapeHtml(b.name) + '</option>').join('');
    document.getElementById('titleList').innerHTML = TITLES.map(x => '<div class="title-row ' + (x.good ? 'is-good' : 'is-bad') + '"><div><b>' + x.name + '</b><small>' + x.desc + '</small></div>' +
        (mine ? '<select data-title="' + x.key + '">' + opts(t.by[x.key]) + '</select>' : '<span class="holder' + (t.by[x.key] === 'player' ? ' is-me' : '') + '">' + escapeHtml(who(t.by[x.key])) + '</span>') + '</div>').join('');
}
document.getElementById('titleBtn').addEventListener('click', () => { closeIslandPopup(); renderTitleModal(); titleModal.hidden = false; });
document.getElementById('popupStats').addEventListener('click', e => { if (!e.target.closest('[data-view-titles]')) return; closeIslandPopup(); renderTitleModal(); titleModal.hidden = false; });   // anyone may look who wears what
document.getElementById('titleModalBtn').addEventListener('click', () => { titleModal.hidden = true; });
document.getElementById('titleList').addEventListener('change', e => {
    const sel = e.target.closest('select[data-title]'); if (!sel || loadTitles().ruler !== 'player') return;
    giveTitle(sel.dataset.title, sel.value || null);
    alsBefehl('titel', { key: sel.dataset.title, wem: neutralId(sel.value || null) });
    const x = TITLES.find(q => q.key === sel.dataset.title);
    if (sel.value && !x.good) botGrudge(sel.value, 'player', 1);                  // nobody likes being made the Narr - they remember who did it
    if (sel.value) flashHint(botById[sel.value].name + ' ist jetzt ' + x.name + ' (' + x.desc + ').', 3000);
    renderTitleModal();
});
setTimeout(runBotTick, BOT_TICK_MS);

// Checks every second whether any in-flight attack or troop transfer
// has arrived
setInterval(() => {
    const now = Date.now();
    if (pendingAttacks.length > 0 && rechnet()) {
        // A wave that arrives starts fighting at once and the fight plays out on the map; it lasts longer the more
        // troops clash. Another wave of the same side that reaches the target while the fight is on joins it, and
        // so do the defender's reinforcements (they land in the garrison) - one battle, everything counted.
        // A wave that comes after the fight is decided starts a fight of its own.
        for (const a of pendingAttacks.filter(x => x.resolveAt <= now && !x.fightEndsAt)) {
            // Läuft dort schon ein Kampf, mit dem diese Welle nichts zu tun hat (anderer Angreifer, nicht im Bündnis): sie wartet,
            // bis er entschieden ist – dann kämpft sie gegen den, dem die Basis DANN gehört (Alexander 4.10.).
            // (Ein Kampf, der genau jetzt endet, wird erst unten entschieden – er zählt noch als laufend.)
            const tow = islandOwnerOf(a.targetId), atkr = a.attackerBotId || 'player', gewartet = !!a.wartet;
            if (tow !== atkr && !(tow && bundFreund(atkr, tow)) && !kampfDazu(a, now) && pendingAttacks.some(p => p !== a && p.fightEndsAt && p.targetId === a.targetId)) { a.wartet = 1; continue; }
            delete a.wartet;
            if (tow && tow !== atkr && bundFreund(atkr, tow)) {                     // inzwischen gehört das Ziel einem Bündnis-Mitglied: kein Kampf, die Truppen gehen heim
                welleHeim(a, atkr, a.targetId);
                heroWutZurueck(atkr, a.hx); pendingAttacks.splice(pendingAttacks.indexOf(a), 1); renderActiveMarches(); continue;
            }
            if (tow && tow !== atkr && shieldCovers(islandById[a.targetId]) && ownerShielded(tow, gewartet ? now : Math.min(now, a.resolveAt))) {   // bounces off the Friedensschild (as it stood when the wave arrived – nach dem Warten: wie er JETZT steht) - the troops come back
                const back = welleHeim(a, atkr, a.targetId);                        // (eine Rally: jeder bekommt seinen Anteil zurück)
                heroWutZurueck(atkr, a.hx); pendingAttacks.splice(pendingAttacks.indexOf(a), 1);
                if (tow === 'player') { flashHint('Dein Friedensschild hat den Angriff von ' + botById[a.attackerBotId].name + ' auf ' + islandTitle(islandById[a.targetId]) + ' abgewehrt.', 4000);
                    spawnBattleFx(a.targetId, true, 'Schild hält', botById[a.attackerBotId].name + ' prallt ab'); }
                else if (atkr === 'player') { flashHint('Abgeprallt am Schild von ' + botById[tow].name + ' – ' +
                    fmtNum(a.rawTroops) + ' Truppen zurück' + (back !== null && back !== undefined ? ' in ' + islandTitle(islandById[back]) : '') + '.', 4500);
                    spawnBattleFx(a.targetId, false, 'Schild hält', 'Dein Angriff prallt ab'); updateHud(); saveGame(); saveProgression(); }
                renderActiveMarches(); continue;
            }
            if (islandOwnerOf(a.targetId) === (a.attackerBotId || 'player')) {   // the base is already ours (an earlier wave took it): they simply move in
                heroWutZurueck(atkr, a.hx); islandTroops[a.targetId] = (islandTroops[a.targetId] || 0) + (a.rally ? bundRallyHeim(a, a.rawTroops, a.targetId, true) : a.rawTroops);   // (Rally: nur der Anteil des Starters zieht ein)
                pendingAttacks.splice(pendingAttacks.indexOf(a), 1);
                if (!a.attackerBotId) { flashHint(islandTitle(islandById[a.targetId]) + ' gehört schon dir – ' + fmtNum(a.rawTroops) + ' Truppen verstärken die Besatzung.', 4000); updateHud(); saveGame(); saveProgression(); }
                else if (botById[a.attackerBotId] && botById[a.attackerBotId].mensch && typeof bundMelden === 'function') bundMelden(a.attackerBotId, islandTitle(islandById[a.targetId]) + ' gehört schon dir – ' + fmtNum(a.rawTroops) + ' Truppen verstärken die Besatzung.');   // (echter Spieler: Bescheid statt Kampf)
                continue;
            }
            if (atkr === 'player') dropShield('Dein Friedensschild ist gefallen – dein Angriff auf ' + islandTitle(islandById[a.targetId]) + ' ist angekommen.'); else botDropShield(atkr);   // a wave that fights is an attack
            if (a.rally) for (const w of new Set(a.rally.an.map(x => x[0]))) if (w && w !== 'player' && w !== atkr) { botDropShield(w); botNeulingWeg(w, islandOwnerOf(a.targetId)); }   // (wer in der Rally mitkämpft, greift auch an)
            const fight = kampfDazu(a, now);
            if (fight) {
                const anderer = fight.attackerBotId !== a.attackerBotId;
                if (anderer || fight.rally || a.rally) {          // ein gemeinsamer Kampf: wer mit wie vielen Truppen dabei ist (Verluste, Heimweg, Beute, Bericht)
                    if (!fight.rally) { fight.rally = { id: 'z' + fight.id, by: fight.attackerBotId, an: (fight.quellen || [[fight.sourceId, fight.rawTroops]]).map(q => [fight.attackerBotId, q[0], q[1]]), zus: 1 }; delete fight.quellen; }
                    else fight.rally.zus = 1;
                } else if (a.sourceId !== fight.sourceId || fight.quellen)   // eine weitere eigene Welle aus einer anderen Basis: jeder Teil kehrt zu SEINER Basis heim
                    (fight.quellen = fight.quellen || [[fight.sourceId, fight.rawTroops]]).push([a.sourceId, a.rawTroops]);
                const wer = a.attackerBotId || 'player';               // höchstens 2 Helden je Angreifer (Alexander 4.10.): hat er schon Helden im Kampf, zählen die dieser Welle nicht
                if (!fight.heldVon) { fight.heldVon = fight.hx ? { [fight.attackerBotId || 'player']: 1 } : {};
                    if (fight.rally) for (const x of fight.rally.an) if (x && x[4]) fight.heldVon[x[0]] = 1; }   // (auch die Helden der Rally-Mitglieder)
                if (a.rally && anderer) for (const x of a.rally.an) if (x[0] !== a.rally.by && x[4]) {   // ein Mitglied der neuen Rally hat schon Helden im Kampf: seine zählen nicht
                    if (fight.heldVon[x[0]]) { heroWutZurueck(x[0], x[4]); const h = x[7] || 0; x[3] = (x[3] || 0) - h; a.attackBonus = (a.attackBonus || 0) - h;
                        x[5] = Math.max(0, (x[5] || 0) - (x[4].loss || 0)); x[4] = null; x[7] = 0; }
                    else fight.heldVon[x[0]] = 1; }
                let ohneHeld = false;
                if (a.hx && fight.heldVon[wer]) { ohneHeld = true; heroWutZurueck(wer, a.hx);   // (seine Helden kämpfen nicht mit – die Wut bleibt)
                    a.attackBonus = Math.max(0, (a.attackBonus || 0) - (a.heldBonus !== undefined ? a.heldBonus : (a.attackBonus || 0) - (a.skillBonus || 0)));
                    a.shieldLossReductionPct = Math.max(0, (a.shieldLossReductionPct || 0) - (a.hx.loss || 0)); a.rewardGoldRate = killGoldRate(wer); }
                else if (a.hx) fight.heldVon[wer] = 1;
                let umf = 1;                                       // (Stärke in die Einheiten des Kampf-Besitzers umrechnen)
                if (anderer) {                                     // seine Stärke zählt, wie er sie mitbringt (seine Stufe, Forschung, Titel)
                    const st = x => (x.atkTitle !== undefined ? x.atkTitle : titleMult(x.attackerBotId, 'attack')) * (x.atkKraft || 1);
                    umf = st(a) / st(fight); a.attackBonus = (a.rawTroops + (a.attackBonus || 0)) * umf - a.rawTroops;
                }
                if (a.rally && anderer) {                          // eine ganze Rally kommt dazu: für den Bericht jeder mit SEINER Stärke, seinem Helden, seinem Schild
                    let mit = 0, erster = true;
                    for (const x of a.rally.an) if (x[0] !== a.rally.by && x[3] != null) { x[3] = Math.round((x[2] + x[3]) * umf - x[2]); mit += x[3]; }
                    for (const x of a.rally.an) if (x[0] === a.rally.by) {
                        x[3] = erster ? Math.round((a.attackBonus || 0) - mit) : 0; if (erster && a.hx && !ohneHeld) x[4] = a.hx;
                        if (x[6] == null) x[6] = erster && a.skillBonus !== undefined ? Math.max(0, a.skillBonus - a.rally.an.reduce((s, q) => s + (q[0] !== a.rally.by && q[6] || 0), 0)) : 0;   // (sein Skill-Anteil – für rallyAussortieren)
                        erster = false;
                        if (x[5] == null) x[5] = a.shieldLossReductionPct; }   // (sein Schild + Held gilt nur für seine Truppen)
                }
                if (anderer || fight.rally || a.rally)
                    fight.rally.an.push(...(a.rally ? a.rally.an : [[a.attackerBotId, a.sourceId, a.rawTroops, anderer ? Math.round(a.attackBonus || 0) : undefined, anderer && a.hx && !ohneHeld ? a.hx : undefined, anderer ? a.shieldLossReductionPct : undefined, anderer ? a.skillBonus : undefined]]));
                fight.rawTroops += a.rawTroops; fight.attackBonus = (fight.attackBonus || 0) + (a.attackBonus || 0);
                if (fight.skillBonus !== undefined || a.skillBonus !== undefined) fight.skillBonus = (fight.skillBonus || 0) + (a.skillBonus !== undefined ? a.skillBonus : a.attackBonus || 0); fight.waves = (fight.waves || 1) + (a.waves || 1);
                // (ein Held eines Mitspielers führt nur seinen eigenen Teil – seine Wut füllt sich am Kampfende, siehe resolveBotAttack: rally.an[4])
                if (a.hx && !anderer && !ohneHeld) { if (!fight.hx) { fight.hx = a.hx; fight.hero = a.hero; fight.hero2 = a.hero2 || null; } }   // höchstens Haupt- + Zweitheld: die Helden der ersten Welle führen den Kampf
                if (!anderer) { fight.shieldLossReductionPct = Math.max(fight.shieldLossReductionPct || 0, a.shieldLossReductionPct || 0);   // (sein eigener Schild/Gold-Bonus gilt nicht für die anderen)
                    fight.rewardGoldRate = Math.max(fight.rewardGoldRate || 0, a.rewardGoldRate || 0); }
                fight.fightEndsAt = Math.max(fight.fightEndsAt, now + 2500);          // the fresh troops get to fight too
                pendingAttacks.splice(pendingAttacks.indexOf(a), 1);
                if (!a.attackerBotId) flashHint('Verstärkung ist im Kampf um ' + islandTitle(islandById[a.targetId]) + ' eingetroffen: +' + fmtNum(a.rawTroops) + ' Truppen, jetzt ' + fmtNum(fight.rawTroops) + '.', 4000);
            } else {
                const est = fightEstimate(a);
                if (!est) {                                         // (kaputtes/altes Ziel: nie ein Kampf – die Truppen gehen heim statt ewig zu warten)
                    welleHeim(a, atkr, a.targetId);
                    heroWutZurueck(atkr, a.hx); pendingAttacks.splice(pendingAttacks.indexOf(a), 1); continue; }
                a.id = a.id || (a.startedAt + '-' + a.sourceId + '-' + a.targetId);
                a.fightEndsAt = now + fightDurationMs(est);
                const tgt = islandById[a.targetId], mine = !a.attackerBotId, vsMe = a.attackerBotId && islandOwnerOf(a.targetId) === 'player';
                if (mine || vsMe) spawnMapBattle({ sourceId: a.sourceId, targetId: a.targetId, attackId: a.id, live: true, fightMs: a.fightEndsAt - now, hero: a.hero || null,
                    atk: mine ? 'mine' : 'bot', def: mine ? (bossAt(tgt.id) ? 'boss' : islandOwnerOf(tgt.id) ? 'bot' : 'neutral') : 'mine', ...est });
            }
            if (!a.attackerBotId) saveProgression();
        }
        for (const a of pendingAttacks) {                   // live battles follow the numbers as troops join on either side
            if (!a.fightEndsAt || a.fightEndsAt <= now) continue;
            const bt = mapBattles.find(x => x.attackId === a.id && !x.final); if (!bt) continue;
            const est = fightEstimate(a); if (!est) continue;
            if (est.my !== bt.my || est.en !== bt.en || est.won !== bt.won) mbReplan(bt, est, performance.now());
            bt.slow = Math.max(0, MB_HOLD - mbT(bt, performance.now())) / Math.max(400, a.fightEndsAt - now); bt.t0 = mbT(bt, performance.now()); bt.anchor = performance.now();
        }
        const dueAttacks = pendingAttacks.filter(a => a.fightEndsAt && a.fightEndsAt <= now);
        if (dueAttacks.length > 0) {
            pendingAttacks = pendingAttacks.filter(a => !dueAttacks.includes(a));
            for (const a of dueAttacks) a.resolveAt = now;      // the result plays out on the map right away
            for (const attack of dueAttacks) try {              // (ein Fehler in einem Kampf darf die anderen nicht verschlucken)
                if (attack.attackerBotId) resolveBotAttack(attack);
                else resolveAttack(attack);
            } catch (e) { console.warn('FEHLER Kampf', attack.id, e); kampfAufraeumen(attack); }
        }
    }
    if (pendingSends.length > 0 && rechnet()) {
        const dueSends = pendingSends.filter(s => s.resolveAt <= now);
        if (dueSends.length > 0) {
            pendingSends = pendingSends.filter(s => s.resolveAt > now);
            for (const send of dueSends) try { resolveSend(send); } catch (e) { console.warn('FEHLER Senden', e); }
        }
    }
    for (const sc of pendingScouts) {                                        // explorers clear a lane as they walk
        if (!sc.explore || sc.ex === undefined) continue;
        const home = islandById[sc.sourceId]; if (!home) continue;
        const L = Math.hypot(sc.ex - home.x, sc.ey - home.y) || 1, prog = Math.max(0, Math.min(1, (now - sc.startedAt) / Math.max(1, sc.resolveAt - sc.startedAt)));
        for (let d = sc.revD || 0; d <= L * prog; d += 2500) revealAround(home.x + (sc.ex - home.x) * d / L, home.y + (sc.ey - home.y) * d / L, 3400, true);
        sc.revD = Math.max(sc.revD || 0, Math.floor(L * prog / 2500) * 2500 + 2500);
    }
    botScoutsArrive(now);
    if (pendingScouts.length > 0) {
        const dueScouts = pendingScouts.filter(s => s.resolveAt <= now);
        if (dueScouts.length > 0) {
            pendingScouts = pendingScouts.filter(s => s.resolveAt > now);
            for (const scout of dueScouts) try { resolveScout(scout); } catch (e) { console.warn('FEHLER Späher', e); }
        }
    }
    if (pendingRetreats.length > 0 && rechnet()) {
        const dueRetreats = pendingRetreats.filter(r => r.resolveAt <= now);
        if (dueRetreats.length > 0) {
            pendingRetreats = pendingRetreats.filter(r => r.resolveAt > now);
            for (const retreat of dueRetreats) try { resolveRetreat(retreat); } catch (e) { console.warn('FEHLER Rückzug', e); }
        }
    }
    if (!isPanelOpen(battleLogPopup)) renderActiveMarches();
    updateHudPlayer();
}, 1000);

// Eine Welle kämpft nicht (Ziel gehört einem Bündnis-Mitglied, Friedensschild, kaputtes Ziel): die Truppen laufen den Weg
// heim statt sofort daheim zu sein (Rally: jeder zu sich). von: wo sie umkehren (fehlt die Insel: die eigene Basis). → Basis oder null
function welleHeim(a, atkr, von) {
    if (!islandById[von]) von = a.sourceId;
    if (a.rally) { bundRallyHeim(a, a.rawTroops, von); return null; }
    const own = atkr === 'player' ? ownedIslands : botOwnedIslands[atkr], back = own && own.has(a.sourceId) ? a.sourceId : atkr === 'player' ? rewardBaseId() : botCapitalOf(atkr);
    if (back === null || back === undefined || !islandById[back]) return null;
    if (atkr !== 'player') { bundHeimschicken(atkr, von, back, a.rawTroops, a.hx ? a.hx.ret || 0 : 0); return back; }
    const t0 = Date.now(), weg = islandById[von] ? retreatSecs(a, islandById[von], islandById[back]) : 0;   // (Vorschau: dein Rückweg)
    pendingRetreats.push({ fromId: von, toId: back, troops: a.rawTroops, startedAt: t0, resolveAt: t0 + Math.max(1, weg) * 1000 });
    return back;
}

// Ein Kampf ist mit einem Fehler abgebrochen: die Verstärkung wieder trennen (sonst doppelt in der Besatzung und verstDefPlus
// hängt), die Truppen einer Rally gehen heim (sonst wären sie weg). attack._vk / _heim setzt der Kampf selbst
// (_heim: in jedem Zweig gleich nach dem Stationieren/Heimschicken, auch wenn keiner übrig ist – sonst entstünden Truppen doppelt).
function kampfAufraeumen(a) {
    try { if (a._vk && typeof verstNachKampf === 'function') verstNachKampf(a.targetId, a._vk, a._vkOwner !== undefined && islandOwnerOf(a.targetId) !== a._vkOwner); } catch (e) { console.warn('FEHLER Aufräumen', e); }   // (schon erobert: dort stehen die Angreifer, kein Verteidiger-Rest)
    delete a._vk; delete a._vkOwner;
    try { if (a.rally && !a._heim && typeof bundRallyHeim === 'function') bundRallyHeim(a, a.rawTroops, a.targetId); } catch (e) { console.warn('FEHLER Aufräumen', e); }
    try { saveGame(); saveProgression(); } catch (e) {}
}

// Combined bonus percentage from the item worn in a slot + a matching
// skill (skillKey may be null when no skill covers that stat)
function bonusPct(equipKey, skillKey) {
    const sk = skillKey ? (skills[skillKey] || 0) * (SKILL_DEFS[skillKey].pct || 0) : 0;
    return sk + equippedItemBonusPct(equipKey);
}
function troopProductionMultiplier() {
    return 1 + bonusPct('weapon', 'troops') / 100;
}
function coinProductionMultiplier() {
    return 1 + bonusPct('boots', null) / 100;
}
function armorDefenseFor(islandId) { const l = islandLevels[islandId] || 1; return defenseForLevel(l) - baseDefenseForLevel(l); }   // the Rüstung's share of a base's defense
function armorDefensePct() {                    // Rüstung: +% on every base's own defense (grows with the base, stays useful late)
    return bonusPct('armor', null);
}
function shieldLossReductionPct() {
    return Math.min(90, equippedItemBonusPct('shield'));
}
// "Angriff" skill (Schwert): every attack gets extra troops on top of the ones sent,
// +3 % of the sent troops per skill level, so it matters at every army size.
function attackBonusPct() { return (skills.attack || 0) * SKILL_DEFS.attack.atkPct; }
function attackFlatBonus(troops) {
    return Math.round(Math.max(0, troops || 0) * attackBonusPct() / 100);
}
// "Verteidigung: Gold" + "Angriff: Gold": coins earned per enemy
// troop killed in a won attack (all of the target's troops+defense).
function goldPerKillRate() {
    return (skills.attackGold || 0) * SKILL_DEFS.attackGold.rate;
}
function killGoldRate(who, hx) {               // "Angriff: Gold" per enemy killed; a hero's +X % Gold: X % on it, and X % of a coin per kill of his own (× WIRTSCHAFT_KOSTEN × MUENZ_FAKTOR wie der Satz)
    const g = hx ? (hx.gold || 0) / 100 : 0;
    return (who === 'player' ? goldPerKillRate() : botGoldRate(who, 'attackGold')) * (1 + g) + g * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR;
}
function defGoldRate(who) { return who === 'player' ? (skills.defenseGold || 0) * SKILL_DEFS.defenseGold.rate : botGoldRate(who, 'defenseGold'); }
function payGold(who, n) { n = Math.round(n); if (n <= 0 || !who) return 0; if (who === 'player') inboxAdd({ src: 'fight', coins: n }); else botCoins[who] = (botCoins[who] || 0) + n; return n; }
function fieldGold(aWho, dWho, fb, aHx, dHx) {  // fights in the open pay like fights for bases: the attacker per enemy killed, the defender per attacker killed (+ each side's hero)
    const g = dHx ? (dHx.gold || 0) / 100 : 0;
    return { a: payGold(aWho, fb.dLoss * killGoldRate(aWho, aHx)), d: payGold(dWho, fb.aLoss * (defGoldRate(dWho) * (1 + g) + g * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR)) };
}
// "Geschwindigkeit" skill: shortens the production tick interval.
function productionTickMs() {
    return Math.max(400, 1000 - (skills.speed || 0) * SKILL_DEFS.speed.msPerLevel);
}
function skillBonusText(def, level) {
    if (def.pct) return '+' + fmtNum(level * def.pct) + ' %';
    if (def.atkPct) return '+' + fmtNum(level * def.atkPct) + ' % Truppen';
    if (def.defPct) return '+' + fmtNum(level * def.defPct) + ' % Truppen';
    if (def.flat) return '+' + fmtNum(level * def.flat) + (def.unit || '');
    if (def.rate) return '+' + fmtNum(Math.round(level * def.rate * 1000)) + ' Gold je 1.000 Kills';   // (Münzen × MUENZ_FAKTOR: Stufe 1 = 167)
    if (def.msPerLevel) { const l = Math.min(level, def.max || level); return '+' + fmtNum(Math.round(1000 / (1000 - l * def.msPerLevel) * 100 - 100)) + ' % Produktion, +' + fmtNum(l * 5) + ' % Marschtempo' + (def.max && level >= def.max ? ' (max.)' : ''); }
    return '';
}

// Profile popup: player name (persisted), progress summary, and the
// equipment/skills tabs
const profileBtn = document.getElementById('profileBtn');
const profilePopup = document.getElementById('profilePopup');
const profileName = document.getElementById('profileName');
const profileStats = document.getElementById('profileStats');
const profileCloseBtn = document.getElementById('profileCloseBtn');
const equipStats = document.getElementById('equipStats');
const chestPointsValue = document.getElementById('chestPointsValue');
const chestEquippedGrid = document.getElementById('chestEquippedGrid');
const chestInventoryGrid = document.getElementById('chestInventoryGrid');
const chestInventoryLabel = document.getElementById('chestInventoryLabel');
const chestSelectionBar = document.getElementById('chestSelectionBar');
const chestSelectionLabel = document.getElementById('chestSelectionLabel');
const chestSelectCombineBtn = document.getElementById('chestSelectCombineBtn');
const chestSelectSellBtn = document.getElementById('chestSelectSellBtn');
const chestItemPopup = document.getElementById('chestItemPopup');
const chestItemIconBig = document.getElementById('chestItemIconBig');
const chestItemTitle = document.getElementById('chestItemTitle');
const chestItemStats = document.getElementById('chestItemStats');
const chestItemUpgradeBtn = document.getElementById('chestItemUpgradeBtn');
const chestItemEquipBtn = document.getElementById('chestItemEquipBtn');
const chestItemUnequipBtn = document.getElementById('chestItemUnequipBtn');
const chestItemSellBtn = document.getElementById('chestItemSellBtn');
const chestItemCloseBtn = document.getElementById('chestItemCloseBtn');
const chestItemOverline = document.getElementById('chestItemOverline');
const chestItemSub = document.getElementById('chestItemSub');
// Selecting a tile (via its little dot) is always available, not a
// separate mode you switch in and out of - that mode toggle was
// confusing (looked like it got stuck "on").
let chestSelectedIds = new Set();
let chestDetailItemId = null;
const skillPointsLine = document.getElementById('skillPointsLine');
const skillGrid = document.getElementById('skillGrid');

profileName.value = store.get('openWaterPlayerName') || '';
profileName.addEventListener('input', () => {
    if (window.WELT) return;                     // in der EINEN Welt: der Name muss frei sein → wird beim Verlassen des Feldes geprüft
    store.set('openWaterPlayerName', profileName.value);
    updateHudPlayer();
});
profileName.addEventListener('change', () => {
    if (!window.WELT) return;
    const alt = store.get('openWaterPlayerName') || '';
    if (profileName.value.trim() === alt) return;
    weltNameSetzen(profileName.value).then(r => { if (!r.ok) { flashHint(r.grund, 3500); profileName.value = alt; } else flashHint('Du heißt jetzt ' + r.name + '.', 2500); });
});
// Spielername auf dem Server prüfen und setzen (frei, 3–20 Zeichen, kein Name eines anderen – auch keiner der Mitspieler)
async function weltNameSetzen(name) {
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (BOT_DEFS.some(b => !b.mensch && b.name.toLowerCase() === name.toLowerCase())) return { ok: false, grund: 'Diesen Namen hat schon jemand.' };
    try {
        const r = await fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ aktion: 'name', token: window.__owSpeicher.token, name }) });
        if (!r.ok) return { ok: false, grund: 'Gerade keine Verbindung – bitte gleich nochmal.' };
        const a = await r.json();
        if (a.ok) { store.set('openWaterPlayerName', a.name); profileName.value = a.name; try { updateHudPlayer(); } catch (e) {} requestRender(); }
        return a;
    } catch (e) { return { ok: false, grund: 'Gerade keine Verbindung – bitte gleich nochmal.' }; }
}

const RANK_TIERS = [
    { min: 0, name: 'Bronze' },
    { min: 5, name: 'Silber' },
    { min: 15, name: 'Gold' },
    { min: 35, name: 'Platin' },
    { min: 70, name: 'Diamant' },
    { min: 120, name: 'Meister' },
    { min: 225, name: 'Legende' }
];
