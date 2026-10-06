// Teil 02-kampf-karte.js: Mitspieler: wie sie die Karte lesen (Rache, Ziele, Späherbericht)
// --- Bot AI ---------------------------------------------------
// A bot attack that wins takes the target for that bot (clearing
// whoever owned it before, including the player); a bot attack
// that loses damages the defender the same way a player's failed
// attack does - same rules as yours: shield (+ the hero) on a win,
// 20 % flee on a loss (+ the hero), Krankenhaus, kill gold. Only logged/announced to the player when
// the player's own territory is the one being fought over - bot-
// vs-bot and bot-vs-neutral fights resolve silently so the log
// doesn't fill up with battles that have nothing to do with you.
// ==============================================================================================================
//    Kampf: wenn ein Angriff der anderen ankommt
// ==============================================================================================================
// Die Truppen eines Kampfs gehen heim: hat derselbe Angreifer Wellen aus mehreren Basen zusammengelegt (attack.quellen, siehe
// Ankunft), bekommt jede Basis ihren Anteil → [[Basis, Truppen], …] (Summe genau n)
function kampfHeimTeile(attack, n) {
    const q = attack.quellen && attack.quellen.length ? attack.quellen : [[attack.sourceId, n]], sum = q.reduce((s, x) => s + x[1], 0) || 1;
    let rest = n;
    return q.map((x, i) => { const k = i === q.length - 1 ? rest : Math.min(rest, Math.floor(n * x[1] / sum)); rest -= k; return [x[0], k]; }).filter(x => x[1] > 0);
}
function resolveBotAttack(attack) {
    const bot = botById[attack.attackerBotId];
    const source = islandById[attack.sourceId];
    const target = islandById[attack.targetId];
    if (!bot || !source || !target) { if (attack.rally && typeof bundRallyHeim === 'function') bundRallyHeim(attack, attack.rawTroops, attack.targetId); return; }   // (Rally ohne Anführer: alle gehen mit ihrem Anteil heim)

    if (attack.rally && typeof rallyAussortieren === 'function') rallyAussortieren(attack, target.id);   // (wer das Bündnis verlassen hat, kämpft nicht mit)
    const myTroops = Math.round((attack.rawTroops + (attack.attackBonus || 0)) * (attack.atkTitle !== undefined ? attack.atkTitle : titleMult(bot.id, 'attack')) * (attack.atkKraft || 1));   // (Truppen-Stufe + Forschung vom Losschicken)
    const targetOwner = islandOwnerOf(target.id);
    if (targetOwner === bot.id) { islandTroops[target.id] = (islandTroops[target.id] || 0) + (attack.rally ? bundRallyHeim(attack, attack.rawTroops, target.id, true) : attack.rawTroops); saveGame(); return; }   // (gemeinsam: nur sein Anteil zieht ein, die anderen gehen heim)   // inzwischen die eigene (ein anderer Angriff hat sie genommen): die Truppen bleiben dort
    if (targetOwner && targetOwner !== bot.id && typeof bundFreund === 'function' && bundFreund(bot.id, targetOwner)) {   // inzwischen ein Bündnis-Mitglied: kein Kampf, heim
        if (attack.rally) { bundRallyHeim(attack, attack.rawTroops, target.id); saveGame(); return; }   // (gemeinsam: jeder zu sich)
        for (const [von, n] of kampfHeimTeile(attack, attack.rawTroops)) bundHeimschicken(bot.id, target.id, von, n, attack.hx ? attack.hx.ret || 0 : 0);   // (den Weg zurück, jeder Teil zu seiner Basis)
        saveGame(); return; }
    attack._kampf = 1;                                                // (ab hier wird gekämpft – Wut und Truppen zählen)
    const vk = targetOwner && typeof verstVorKampf === 'function' ? verstVorKampf(target.id) : null;   // Verstärkung (Botschaft) verteidigt mit
    attack._vk = vk;                                                  // (bricht der Kampf mit einem Fehler ab: kampfAufraeumen trennt sie wieder)
    attack._vkOwner = targetOwner;                                    // (Besitzer vor dem Kampf: so erkennt das Aufräumen eine schon eroberte Insel)
    const originalEnemyTroops = effectiveTroops(target);
    const dHx = targetOwner ? vhFx(targetOwner) : null;               // Verteidigungs-Helden aus seiner Mauer (Angriff + Gefolge stecken schon in effectiveDefense)
    const fullDefense = effectiveDefense(target), originalEnemyDefense = Math.round(fullDefense * (1 - heroDefCut(attack)));   // (a hero's Rammbock, Sturmflut, Mauerbrecher)
    const mensch = w => w === 'player' || !!(w && botById[w] && botById[w].mensch);   // (Berichte gehen nur an Menschen – nur dann die Rechnung aufschreiben)
    const partsFor = () => mensch(targetOwner) || mensch(bot.id) || (attack.rally && attack.rally.an.some(x => mensch(x[0]))) || (vk && vk.L.some(x => mensch(x.v.w)))
        ? { atkParts: attackParts(bot.id, attack.rawTroops, attack.attackBonus || 0, myTroops, attack.hero, attack), defParts: heroDefPart(defenseParts(target), attack, fullDefense) } : null;
    const red = attack.botShield ? attack.shieldLossReductionPct : botMults(bot.id).shield;   // shield (+ the hero), snapshotted at launch
    const hosp = attack.hx ? Math.min(100, botHospitalPct(bot.id) + attack.hx.hosp) : undefined;
    const botKillRate = attack.botShield ? attack.rewardGoldRate || 0 : botGoldRate(bot.id, 'attackGold');
    const parts = partsFor();
    const totalStrength = originalEnemyTroops + originalEnemyDefense;
    const won = myTroops > totalStrength;
    const defFall = won ? originalEnemyTroops : Math.round(Math.min(originalEnemyTroops, myTroops) * (1 - (dHx ? dHx.loss : 0) / 100));   // gefallene Verteidiger (abgewehrt: weniger mit seinem Verteidigungs-Helden)
    if (targetOwner && targetOwner !== 'player') botGrudge(targetOwner, bot.id, won ? 2 : 1);   // bots hold grudges against each other too
    heroFought(bot.id, attack.hx);                                   // the hero's rage fills, like yours
    if (attack.rally) for (const x of attack.rally.an) if (x[4] && x[0] !== bot.id) heroFought(x[0], x[4]);   // (gemeinsam: auch die Helden der anderen)
    const playerInvolved = targetOwner === 'player';
    const bossHere = bossAt(target.id);

    // The capital can never be taken: a winning raid only wipes out its garrison.
    const capitalHolds = won && isCapital(target.id);
    const rv = won && attack.rally ? rallyVerluste(attack, originalEnemyDefense, myTroops, red) : null;   // (gemeinsam: jeder verliert nach SEINEM Schild)
    const rf = !won && attack.rally ? rallyFlucht(attack) : null;                                       // (gemeinsam, verloren: jeder flieht mit SEINEM Helden)
    const botSentLoss = won ? (rv ? Math.min(attack.rawTroops, rv.summe) : sentLossFor(attack.rawTroops, myTroops, originalEnemyDefense, red)) : 0, survivors = won ? attack.rawTroops - botSentLoss : 0;   // same rule as yours   // the sword bonus fights along but doesn't stay
    const fled = won ? 0 : rf ? rf.flucht : retreatSurvivorsPreview(attack);
    const atkFallen = attack.rawTroops - survivors - fled;
    const angreifer = attack.rally ? kampfAnteile(attack, atkFallen, hosp, rv || rf, won) : null, atkWounded = angreifer ? angreifer.reduce((s, x) => s + x.wounded, 0) : botHospitalTake(bot.id, atkFallen, hosp);   // (gemeinsam: jeder trägt seinen Anteil, Verwundete in sein Krankenhaus)
    const atkInfo = angreifer ? { angreifer } : {};
    const aTeile = angreifer ? kampfTeile(angreifer) : null;           // (gemeinsam: jeder nach seinem Stärke-Anteil)
    const epRoh = won ? totalStrength : defFall;   // Erfahrung (gedeckelt in addBotXp: ¼ Stufe, weniger gegen Schwächere) – gemeinsam: jeder nach Anteil
    for (const [w, f] of aTeile || [[bot.id, 1]]) { if (!(f > 0)) continue;
        if (w === 'player') addXp(kampfEp(epRoh * f, playerLvl, totalStrength * f, myTroops * f)); else addBotXp(w, epRoh * f, totalStrength * f, myTroops * f); }
    const killPay = n => {                                            // "Angriff: Gold" je getötetem Gegner – gemeinsam: jeder für den Teil, den SEINE Truppen töten, mit SEINEM Satz (Alexander 5.10.)
        if (!angreifer) { botCoins[bot.id] += Math.round(n * botKillRate); return; }
        const sk = angreifer.reduce((s, q) => s + (q.k !== undefined ? q.k : q.n), 0) || 1;
        for (const q of angreifer) { q.gold = payGold(q.w, n * (q.k !== undefined ? q.k : q.n) / sk * (q.w === bot.id ? botKillRate : q.rate || 0)); delete q.rate; } };
    const homeAgain = n => { if (attack.rally) attack._heim = 1; if (n <= 0) return; if (attack.rally) { bundRallyHeim(attack, n, target.id); return; } const t0 = Date.now();                 // they walk home like yours (a fallen home: resolveSend sends them to another base) – eine Rally: jeder zu sich
        for (const [von, k] of kampfHeimTeile(attack, n)) { const zu = islandById[von] || source;   // (mehrere Wellen: jeder Teil zu seiner Basis)
            pendingSends.push({ fromId: target.id, toId: zu.id, troops: k, startedAt: t0, resolveAt: t0 + retreatSecs(attack, target, zu, bot.id) * 1000, senderBotId: bot.id, back: true }); } };
    const plunder = won && targetOwner ? plunderOf(targetOwner, capitalHolds) : null;   // Beute: ein kleiner Teil über dem Burg-Schutz des Verlierers (nur an der Hauptstadt – Turm: nichts) - auch deins
    if (plunder) plunderMove(targetOwner, bot.id, plunder.loot, plunder.roh);
    if (capitalHolds) brandSetzen(target.id);                                 // die Hauptstadt brennt (nur zu sehen)
    if (capitalHolds) {
        islandTroops[target.id] = 0;
        killPay(originalEnemyTroops);                               // "Angriff: Gold" for the garrison, like any other win
        homeAgain(survivors);                                       // the raiders who are left march home with the loot
    } else if (won) {
        // Same rule as the player's own captures: the new owner
        // gets the base one level lower than it was, not reset to 1.
        const levelAfterCapture = Math.max(1, (islandLevels[target.id] || 1) - 1);
        if (targetOwner) { botNoteLoss(targetOwner, target.id); clearIslandOwner(target.id); }
        islandTroops[target.id] = attack.rally ? bundRallyHeim(attack, survivors, target.id, true) : survivors;   // (Rally: die Truppen der anderen gehen heim)
        if (attack.rally) attack._heim = 1;                          // (verteilt – bricht der Kampf danach ab, gehen sie nicht nochmal heim)
        botOwnedIslands[bot.id].add(target.id); botStat(bot.id, 'caps'); if (targetOwner) botStat(bot.id, 'pvp'); if (target.type === 'temple' || target.type === 'megaTemple' || target.guardian) botStat(bot.id, 'temples');
        if (target.type === 'gate' && bot.mensch) setGateSettings(target.id, { toll: target.toll, closed: false });   // ein echter Spieler: wie bei dir (offen, normale Maut – er stellt es selbst ein)
        else if (target.type === 'gate') { const sty = bot.style, r = Math.random();                  // how this player runs a gate
            setGateSettings(target.id, { toll: sty === 'templer' ? 1 : sty === 'builder' ? 0.5 : sty === 'raider' ? 0.25 : GATE_TOLLS[1 + Math.floor(r * 4)],
                                         closed: sty === 'raider' ? r < .5 : sty === 'templer' ? r < .3 : r < .1 }); }
        islandLevels[target.id] = levelAfterCapture;
        killPay(originalEnemyTroops);                               // "Angriff: Gold" (+ the hero's Gold): per enemy troop killed
        if (target.type === 'temple' || target.type === 'megaTemple') {
            templeHoldSince[target.id] = Date.now();
        }
    } else {
        homeAgain(fled);
        const defenderCasualties = defFall;
        killPay(defenderCasualties);
        if (targetOwner) {
            islandTroops[target.id] = Math.max(0, (islandTroops[target.id] || 0) - defenderCasualties);
        } else if (bossHere) {
            bossHere.troops = Math.max(0, bossHere.troops - defenderCasualties);
            saveWander();
        } else {
            target.neutralTroops = originalEnemyTroops - defenderCasualties;
            neutralTroopOverrides[target.id] = target.neutralTroops;
        }
    }
    const vs = vk ? verstNachKampf(target.id, vk, won) : null;            // wieder trennen: jeder trägt seinen Anteil an den Verlusten
    delete attack._vk; delete attack._vkOwner;
    const dTeile = typeof verstAnteile === 'function' ? verstAnteile(vk, targetOwner, originalEnemyTroops + fullDefense) : null;   // Verteidiger: Besitzer + Helfer nach Anteil
    const dTeil = w => { const t = dTeile && dTeile.find(x => x[0] === w); return t ? t[1] : 1; };
    const atkWeg = won ? botSentLoss : attack.rawTroops - fled;          // so viele Angreifer haben die Verteidiger getötet
    if (vs) for (const h of vs.helfer) h.gold = payGold(h.w, atkWeg * dTeil(h.w) * defGoldRate(h.w));   // "Verteidigung: Gold" der Helfer: ihr Anteil mit IHREM Satz
    const defWegAlle = defFall, defWeg = vs ? vs.eigenWeg : defWegAlle;   // (Besitzer: nur seine)
    const verstInfo = vs ? { verst: vs.helfer, eigen: vs.eigen } : {};
    noteBattle(target.id, won ? originalEnemyTroops : attack.rawTroops - fled, won ? targetOwner : bot.id);   // the neighbours saw it
    midFight(target.id, bot.id, defFall, targetOwner, atkWeg, aTeile, dTeile);   // Krieger-Woche points - like yours (gemeinsam: nach Anteil)
    const counts = won || !attack.planId || attack.lastWave;                    // an early wave of a planned strike failing isn't a lesson yet
    if (counts) botMoodAdd(bot.id, won ? .15 : -.2); if (targetOwner && targetOwner !== 'player') botMoodAdd(targetOwner, won ? -.25 : .1);
    if (!won && counts) botNoteFail(bot.id, target.id);
    if (!won) botLearn(bot.id, target.id);                          // a lost fight tells them what's really there
    if (!won && targetOwner && targetOwner !== 'player') botStat(targetOwner, 'defs');
    if (won && bossHere && typeof bundGeschenk === 'function') bundGeschenk(bot.id, 'boss');         // Boss besiegt: kleine Geschenke fürs ganze Bündnis
    if (won && bossHere) for (const w of attack.rally ? [...new Set(attack.rally.an.map(x => x[0]))] : [bot.id]) { if (!botById[w]) continue;   // (gemeinsam: JEDER bekommt den vollen Preis – Alexander 5.10.)
        botStat(w, 'bosses');                                        // der Preis wie bei dir: Gems, epische Kiste, Splitter
        evPreis(w, 'wboss', bossHere.name + ' besiegt', { gems: WANDER_REWARD_GEMS, crate: WANDER_CRATE, sh: HERO_SHARDS_WANDER }, bossHere.endsAt || bossHere.name);   // (ein echter Spieler: als Nachricht ins Abholfach)
        if (botById[w].mensch) evBericht(w, { type: 'ev', ic: 'star', gut: true, badge: 'Kriegsherr', title: bossHere.name + ' besiegt', txt: 'Die Beute liegt unter Events → Belohnung.', at: Date.now() }, bossHere.name + ' ist gefallen – die Beute liegt unter Events → Belohnung.'); }
    updateHud();
    if (bossHere && won) { spawnBattleFx(target.id, false, bossHere.name + ' gefallen', bot.name); endWander(bot.name + ' hat ' + bossHere.name + ' besiegt!'); }

    let defWounded = 0, defGold = 0, dwBesitzer = 0;                  // (die Verwundeten des Besitzers – für alle Berichte)
    if (playerInvolved) {                                          // "Verteidigung: Gold": every attacker your garrison kills pays out (also when the base falls)
        defGold = Math.round(atkWeg * dTeil('player') * defGoldRateHx('player', dHx));   // (nur dein Anteil – die Helfer haben ihren)
        if (defGold > 0) inboxAdd({ src: 'fight', coins: defGold });   // (your defense's gold waits in the Abholfach)
    }
    if (playerInvolved && !won) statBump('defends');
    if (playerInvolved) { defWounded = hospitalTake(defWeg, dHx ? Math.min(100, hospitalPct() + dHx.hosp) : undefined); dwBesitzer = defWounded; }   // your fallen defenders (die der Verstärkung trägt ihr Besitzer)
    if (playerInvolved) { warStat(capitalHolds ? 'plundered' : won ? 'lost' : 'defends', 1, bot.name); warStat('fallen', defWeg - defWounded); warStat('kills', won ? botSentLoss : attack.rawTroops - fled); }
    else if (targetOwner) {                                       // a bot defender: its Krankenhaus and its "Verteidigung: Gold", like yours
        const dw = botHospitalTake(targetOwner, defWeg, dHx ? Math.min(100, botHospitalPct(targetOwner) + dHx.hosp) : undefined); dwBesitzer = dw || 0;
        const dg = Math.round(atkWeg * dTeil(targetOwner) * defGoldRateHx(targetOwner, dHx));   // (nur sein Anteil)
        botCoins[targetOwner] = (botCoins[targetOwner] || 0) + dg;
        if (window.WELT && botById[targetOwner] && botById[targetOwner].mensch) WELT.bericht(targetOwner, {    // ein echter Spieler wurde angegriffen: sein Bericht
            type: 'botAttack', botName: bot.name, botId: bot.id, targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus: attack.attackBonus || 0, atkFallen, atkWounded, atkFled: fled,
            atkGear: fighterSnapshot(bot.id, attack.hx), defGear: fighterSnapshot(targetOwner, dHx), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, wounded: dw || 0,
            fallen: defWeg, won, capitalHolds, defGold: dg, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, defName: (botById[targetOwner] || {}).name, ...(parts || {}), ...verstInfo, ...atkInfo },
            capitalHolds ? bot.name + ' hat deine Hauptstadt geplündert (' + (beuteText(plunder) || 'nichts über dem Schutz') + ') – die Garnison ist gefallen, die Stadt brennt, aber sie hält.' : won ? bot.name + ' hat deine Basis ' + islandTitle(target) + ' erobert!' : 'Verteidigung erfolgreich – ' + bot.name + ' bei ' + islandTitle(target) + ' zurückgeschlagen.');
    }
    if (vs) verstBerichte(vs, { type: 'botAttack', botName: bot.name, botId: bot.id, targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus: attack.attackBonus || 0, atkFallen, atkWounded, atkFled: fled,   // die Helfer: derselbe Bericht
        atkGear: fighterSnapshot(bot.id, attack.hx), defGear: targetOwner ? fighterSnapshot(targetOwner, dHx) : null, enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, fallen: defWeg, wounded: dwBesitzer,
        won, capitalHolds, defName: targetOwner === 'player' ? ((window.profileName && profileName.value) || 'Spieler') : (botById[targetOwner] || {}).name, ...(parts || {}), ...verstInfo, ...atkInfo });
    const atkBericht = {                                              // ein echter Spieler hat angegriffen: sein Bericht (gemeinsam: jeder Mensch, der dabei war)
        type: 'attack', sourceId: source.id, targetId: target.id, myTroops: attack.rawTroops, myTroopsBuffed: myTroops, attackBuff: myTroops - attack.rawTroops, skillBuff: attack.attackBonus || 0, titleBuff: 0,
        lossReductionPct: red, heroLossPct: attack.hx ? attack.hx.loss : 0, lossSaved: 0, attackGoldRate: botKillRate, killGold: angreifer ? (angreifer.find(q => q.w === bot.id) || {}).gold || 0 : Math.round(defFall * botKillRate),
        attackerCasualties: Math.max(0, atkFallen - (atkWounded || 0)), wounded: atkWounded || 0, enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, defenseBuff: 0,
        defenderCasualties: defFall, retreatSurvivors: fled,
        defenderName: targetOwner ? (targetOwner === 'player' ? (window.profileName && profileName.value) || 'Spieler' : botById[targetOwner].name) : null, defenderId: targetOwner || null,
        enemyWounded: dwBesitzer, ...(parts || {}), plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, atkGear: fighterSnapshot(bot.id, attack.hx), defGear: targetOwner ? fighterSnapshot(targetOwner, dHx) : null,
        won, remaining: won ? survivors : 0, ...verstInfo, ...atkInfo, ...(angreifer ? { meine: angreifer.find(x => x.w === bot.id) } : {}) };   // (meine: seine eigenen Zahlen)
    const atkText = capitalHolds ? 'Hauptstadt von ' + (targetOwner === 'player' ? 'deinem Gegner' : (botById[targetOwner] || {}).name) + ' geplündert!' : won ? islandTitle(target) + ' erobert!' : 'Angriff auf ' + islandTitle(target) + ' gescheitert.';
    if (window.WELT) for (const w of angreifer ? angreifer.map(x => x.w) : [bot.id]) if (botById[w] && botById[w].mensch)
        WELT.bericht(w, w === bot.id ? atkBericht : Object.assign({}, atkBericht, { rolle: 'mit', fuehrer: bot.name, meine: angreifer.find(x => x.w === w), killGold: (angreifer.find(x => x.w === w) || {}).gold || 0, sourceId: (attack.rally.an.find(x => x[0] === w) || [])[1] ?? source.id }),
            w === bot.id ? atkText : 'Gemeinsamer Angriff mit ' + bot.name + ': ' + atkText);
    if (playerInvolved) {
        const ribbon = () => spawnBattleFx(target.id, !won || capitalHolds, capitalHolds ? 'Hauptstadt hält' : won ? 'Basis verloren' : 'Verteidigt', capitalHolds ? 'Garnison gefallen' : won ? 'von ' + bot.name : bot.name + ' abgewehrt');
        finishMapBattle(attack, { sourceId: source.id, targetId: target.id, atk: 'bot', def: 'mine', hero: attack.hero || null, my: myTroops, myLoss: myTroops - (won ? survivors : fled),
                en: originalEnemyTroops, enLoss: defFall, won, onEnd: ribbon });
        // Only reveals the target to the player when the player was
        // actually part of this fight - a bot conquering a neutral
        // or another bot's base off-screen must NOT leak that
        // island's troop count to the player as a side effect.
        scoutedIslands.add(target.id);
        addCombatLogEntry({
            type: 'botAttack',
            botName: bot.name, botId: bot.id,
            targetId: target.id,
            myTroops,
            atkRaw: attack.rawTroops, atkBonus: attack.attackBonus || 0, atkFallen, atkWounded, atkFled: fled, ...(parts || {}),
            atkGear: fighterSnapshot(bot.id, attack.hx), defGear: fighterSnapshot('player', dHx),
            enemyTroops: originalEnemyTroops,
            enemyDefense: originalEnemyDefense,
            wounded: defWounded,
            armor: armorDefenseFor(target.id),
            fallen: defWeg,
            won,
            capitalHolds,
            defGold, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, plunderRoh: plunder && plunder.roh || null, ...verstInfo, ...atkInfo
        });
        flashHint((capitalHolds
            ? bot.name + ' hat deine Hauptstadt geplündert (' + (beuteText(plunder) || 'nichts über dem Schutz') + ') – die Garnison ist gefallen, die Stadt brennt, aber sie hält.'
            : won
            ? bot.name + ' hat deine Basis ' + islandTitle(target) + ' erobert!'
            : 'Verteidigung erfolgreich – ' + bot.name + ' bei ' + islandTitle(target) + ' zurückgeschlagen.') + (defWounded ? ' ' + fmtCompact(defWounded) + ' Verwundete ins Krankenhaus.' : ''), 5000);
        renderActiveMarches();
        if (isPanelOpen(popup) && popupIslandId === target.id) renderPopup();
    }
    if (attack.rally) bundRallyBeute(attack, plunder ? plunder.loot || 0 : 0, won, target.id, plunder && plunder.roh);   // (nur die Beute wird geteilt – das Kill-Gold hat jeder schon selbst)
    saveGame();
}

// "Thinks carefully": only ever attacks with a comfortable troop
// advantage (never a coin-flip), and among every target that clears
// that bar, always picks the CLOSEST one - expanding its border
// outward step by step instead of reaching for some weaker base
// way across the map just because the margin happens to be bigger.
// Upgrading (see botConsiderUpgrade) happens independently every
// tick, not just as a fallback when there's nothing to attack -
// otherwise a bot with endless nearby neutral fodder would attack
// forever and never spend a single coin on leveling up.
// ==============================================================================================================
// 3) WIE SIE DIE KARTE LESEN – Rache, Brennpunkte, Schwäche, Ziele im Weg, das ganze Reich, Späherberichte
// ==============================================================================================================
const BOT_MIN_GARRISON_TO_ATTACK = 10;

// Rache: a bot remembers who hit it. After a human-like pause (30 s – 2 min) it goes for that enemy's
// bases first and dares a little more, for about 20 minutes; every new hit makes the grudge deeper.
function botGrudge(botId, who, weight) {
    const b = loadBotState()[botId]; if (!b || !who || who === botId) return;
    const g = b.grudge || (b.grudge = {}), now = Date.now(), cur = g[who] && g[who].until > now ? g[who] : null;
    const an = b.annoy || (b.annoy = {}); an[who] = { v: Math.min(20, botAnnoyOf(b, who, now) + weight), at: now };   // the long memory (fades over hours): who keeps bothering me
    g[who] = { n: Math.min(5, (cur ? cur.n : 0) + weight), from: cur ? cur.from : now + 30000 + Math.random() * 90000, until: now + 20 * 60000, told: cur ? cur.told : false };
    if (g[who].n >= 4 && !(b.vendetta && b.vendetta.who === who && now < b.vendetta.until)) {        // hit again and again: now it's personal - a real plan
        b.vendetta = { who, until: now + 45 * 60000 };
        if (who === 'player') setTimeout(() => flashHint(botById[botId].name + ' schwört Rache, sammelt Truppen und späht deine Basen aus.', 5500), 2000);
    }
    saveBotState();
}

function botAnnoyOf(b, who, now) { const x = b && b.annoy && b.annoy[who]; return x ? x.v * Math.pow(.5, ((now || Date.now()) - x.at) / (3 * 3600000)) : 0; }   // halves every 3 h

function botGrudgeOn(botId, who) {
    const b = loadBotState()[botId], g = b && b.grudge && who ? b.grudge[who] : null, now = Date.now();
    return g && now >= g.from && now < g.until ? g : null;
}

function botRevengeLaunched(bot, targetId) {        // tell the player once when a bot starts paying them back
    if (islandOwnerOf(targetId) !== 'player') return;
    const v = botVendetta(bot, Date.now()), g = botGrudgeOn(bot.id, 'player') || (v && v.who === 'player' ? (v.g || (v.g = { n: 4 })) : null); if (!g || g.told) return;
    g.told = true; saveBotState();
    flashHint(bot.name + ' schlägt zurück – achte auf ' + islandTitle(islandById[targetId]) + '!', 5000);
}

// ===== How people read the map (all of it still goes through scouting before an attack) =====
// Brennpunkte: where it kept crashing lately. Raiders are drawn there and pick off a base the winner just took with
// few survivors (Aasgeier); careful players stay away. Schwäche: an owner who just lost a lot, or is offline, is a
// "now or never" target. Lernen: a base that beat them twice is left alone for a while, the next try brings much
// more. Rache mit Plan: whoever hit them again and again gets a proper answer - gather, scout, one big strike.
// Gemeinsam gegen den Herrscher: whoever sits on the throne too long gets everyone at the gates (not his friends).
const battleHeat = {}, baseFought = {}, ownerLoss = {};         // landmass → { v, at } · island → when · owner → { v, at }

const decayed = (o, now, halfMs) => o ? o.v * Math.pow(.5, (now - o.at) / halfMs) : 0;

function noteBattle(islandId, fallen, loser) {
    const isl = islandById[islandId]; if (!isl) return; const now = Date.now();
    const h0 = battleHeat[isl.landmassId]; battleHeat[isl.landmassId] = { v: decayed(h0, now, 10 * 60000) + 1, at: now };
    baseFought[islandId] = now;
    if (loser && fallen > 0) { const o = ownerLoss[loser]; ownerLoss[loser] = { v: decayed(o, now, 10 * 60000) + fallen, at: now }; }
}

function heatAt(lmId, now) { return decayed(battleHeat[lmId], now, 10 * 60000); }

const ownerWeakMem = {};                                     // (asked for every base of theirs a bot looks at: worked out once a second)
function ownerWeak(who, now) {                              // just lost a big share of the army, or not at the screen
    if (!who) return false;
    const c = ownerWeakMem[who]; if (c && Math.abs(now - c.at) < 1000) return c.v;
    let v = who !== 'player' && botById[who] && !botOnline(botById[who], now);
    if (!v) { let have = 0; for (const id of who === 'player' ? ownedIslands : botOwnedIslands[who] || []) have += islandTroops[id] || 0;
        v = decayed(ownerLoss[who], now, 10 * 60000) > Math.max(1, have) * .3; }
    ownerWeakMem[who] = { v, at: now }; return v;
}

function botFails(bot, targetId, now) { const f = (loadBotState()[bot.id].fails || {})[targetId]; return f && now - f.at < 30 * 60000 ? f.n : 0; }

function botNoteFail(botId, targetId) { const b = loadBotState()[botId]; if (!b) return; const f = b.fails || (b.fails = {}), now = Date.now();
    const old = f[targetId] && now - f[targetId].at < 30 * 60000 ? f[targetId].n : 0; f[targetId] = { n: old + 1, at: now };
    for (const k of Object.keys(f)) if (now - f[k].at > 30 * 60000) delete f[k]; }

function botVendetta(bot, now) { const v = loadBotState()[bot.id].vendetta; return v && now < v.until ? v : null; }

function coalitionOn(now) {                                  // the throne held for 20 min: the others stop quarrelling and go for it
    const r = rulerOwner(); return r && throneState.rulerSince && now - throneState.rulerSince > 20 * 60000 ? r : null;
}

function botMidPull(bot, target, ruler, now) {             // a fat Kopfgeld draws everyone to the ruler's bases
    let m = 1;
    if (ruler && ruler !== bot.id && (target.id === megaTempleId || islandOwnerOf(target.id) === ruler)) { const g = bountyGems(); if (g > 0) m /= 1 + Math.min(2, g / 1000); }
    return m;
}

// Worth the trouble? A person doesn't attack every base on the map - only the ones in the way: a foreign base inside
// their own land, one at the border, one on the way to the middle (a gate above all), one close to the capital.
// A far base of someone else is left alone unless it is personal.   (lower = more wanted, 1 = nothing special)
const botLmShareMem = {};

function botLmShare(botId, lmId, now) {                    // → { v: Anteil eigener, f: Anteil fremder Basen auf der Insel } (15 s gemerkt)
    const key = botId + ':' + lmId; let sh = botLmShareMem[key];
    if (!sh || now - sh.at > 15000) { const on = islandsByLandmass[lmId] || [], own = botOwnedIslands[botId]; let mine = 0, fremd = 0;
        for (const i of on) if (own.has(i.id)) mine++; else if (islandOwnerOf(i.id)) fremd++;
        sh = botLmShareMem[key] = { v: on.length ? mine / on.length : 0, f: on.length ? fremd / on.length : 0, at: now }; }
    return sh;
}

function botStrategic(bot, target) {
    const own = botOwnedIslands[bot.id]; if (!own || !own.size) return 1;
    const sh = botLmShare(bot.id, target.landmassId, Date.now());
    let m = sh.v >= .5 ? .35 : sh.v > 0 ? .6 : 1;                                           // inside our land / at our border
    const cap = islandById[botCapitalOf(bot.id)];
    if (cap) {
        if (landmasses[target.landmassId].ring < landmasses[cap.landmassId].ring && (sh.v > 0 || (reachableLandmassIds[cap.landmassId] || []).includes(target.landmassId)))
            m *= target.type === 'gate' ? .35 : .6;                                           // blocks the way to the middle
        if (Math.hypot(target.x - cap.x, target.y - cap.y) < ISLAND_RADIUS * 25) m *= .6;     // right next to home
    }
    return m;
}

// Wie viel eine Basis für einen großen Schlag hergeben kann (Alexander 6.10.: „die können selbst entscheiden, wie viel sie
// schicken“) – kein fester Satz, sondern nach Lage, wie bei einem Menschen, der überall Truppen hat: greift sie gerade jemand
// an, nichts; gab es dort eben Ärger (Angriff, verlorene Basis nebenan), wenig; Grenzland mit mehr fremden als eigenen
// Basen, die Hälfte bleibt; die Hauptstadt hält als Helfer immer die Hälfte (ihr Rückhalt). Sonst fast alles.
let botFreiCtx = null;
function botFrei(botId, id, now) {                          // → Anteil der Truppen, der los darf (0 … .9)
    if (!botFreiCtx || botFreiCtx.bot !== botId || botFreiCtx.now !== now) botFreiCtx = { bot: botId, now, thr: botThreatened(botId), aer: botAerger(botId, 30 * 60000, now), cap: botCapitalOf(botId) };
    const c = botFreiCtx, isl = islandById[id]; if (c.thr.has(id)) return 0;
    let f = .9;
    if (c.aer.some(i => Math.hypot(i.x - isl.x, i.y - isl.y) < ISLAND_RADIUS * 25)) f = .3;
    else { const sh = botLmShare(botId, isl.landmassId, now); if (sh.f > sh.v) f = .6; }
    return id === c.cap ? Math.min(f, .5) : f;
}

// Everything that could get there: every base with a route (the capital too - nobody can attack it anyway) and the
// field armies standing around. A person counts the whole empire before calling a target hopeless.
const botPoolMem = { __n: 0 };

function botPoolFor(bot, target) {
    const key = bot.id + ':' + target.landmassId, now = Date.now(), c = botPoolMem[key];
    const own = botOwnedIslands[bot.id] || new Set();
    if (c && now - c.at < 4000 && c.src.every(sv => own.has(sv.id))) return c;               // (looked at a moment ago - and still all theirs)
    let s = 0; const src = [], rt = {}, thr = botThreatened(bot.id), reach = (lm, n) => {      // a route, and the last gate open and affordable for that many
        const r = lm in rt ? rt[lm] : (rt[lm] = routeFor(lm, target.landmassId, bot.id)); if (!r) return false; if (r.length < 2) return true;
        const t = tollFor(r[r.length - 2], r[r.length - 1], n, bot.id, target.id); return !t.closed && (botCoins[bot.id] || 0) >= t.cost; };
    for (const id of own) {
        if (id === megaTempleId || thr.has(id)) continue;                                   // a base under attack keeps its troops
        const isl = islandById[id], have = Math.floor((islandTroops[id] || 0) * botFrei(bot.id, id, now));   // (nach Lage, nicht immer 90 %)
        if (have < BOT_MIN_GARRISON_TO_ATTACK || !reach(isl.landmassId, have)) continue;
        src.push({ id, have }); s += have;
    }
    for (const a of armies) if (a.who === bot.id && reach(a.lm, a.troops)) s += a.troops + armyJoins.reduce((n, j) => n + (j.armyId === a.id ? j.troops : 0), 0);   // (troops still on the way to it too)
    src.sort((u, v) => v.have - u.have);
    if (++botPoolMem.__n % 500 === 0) for (const k in botPoolMem) if (k !== '__n' && now - botPoolMem[k].at > 60000) delete botPoolMem[k];   // (alte weg – der Weltrechner läuft tagelang, Grenze 600 MB)
    return (botPoolMem[key] = { s, src, at: now });
}

function botThreatened(botId) {                             // own bases an enemy column or army is on its way to: help goes in, nothing goes out
    const s = new Set();
    for (const a of pendingAttacks) if (a.attackerBotId !== botId && islandOwnerOf(a.targetId) === botId) s.add(a.targetId);
    for (const x of armies) if (x.mv && x.who !== botId && x.mv.to && x.mv.to.kind === 'base' && islandOwnerOf(x.mv.to.id) === botId) s.add(x.mv.to.id);
    return s;
}

// "Zu stark": a base they found far too strong for everything they have is left alone for 15 minutes - unless
// they have grown by a third since. No scout after scout at a wall they can't break.
const botTooStrongMem = {};

function botTooStrong(bot, targetId, pool) {
    const r = botTooStrongMem[bot.id] && botTooStrongMem[bot.id][targetId];
    return !!r && Date.now() < r.until && pool < r.pool * 1.3 && !(baseFought[targetId] > r.until - 15 * 60000);   // (a fight there since: look again)
}

function botNoteTooStrong(bot, targetId, pool) { const m = botTooStrongMem[bot.id] || (botTooStrongMem[bot.id] = {}), now = Date.now(); m[targetId] = { until: now + 15 * 60000, pool };
    if (Object.keys(m).length > 300) for (const k in m) if (!(m[k].until > now)) delete m[k]; }   // (abgelaufene weg – sonst wächst die Liste ewig)

function botLastSeen(bot, targetId) { const it = botIntelMem[bot.id] && botIntelMem[bot.id][targetId]; return it && !it.pending && Date.now() - it.ready < 20 * 60000 && !(baseFought[targetId] > it.ready) ? it.s : null; }   // a recent report still tells roughly how strong it was; after 20 min or a fight there, look again

function botLoyal(bot) { const t = titleOf(bot.id); return !!(t && t.good); }   // the ruler gave them a good title: they stay out of it

function botRespects(bot, owner) { if (!owner || owner === bot.id) return false; const t = titleOf(bot.id); return !!(t && t.good) && owner === rulerOwner(); }   // a good title from the ruler is respect: they attack the ruler much less while they wear it

let sitCtx = null;                                           // what botSituation needs about the bot and each owner - worked out once per move, not for every base
function botSitCtx(bot, now) {
    if (sitCtx && sitCtx.bot === bot.id && sitCtx.now === now) return sitCtx;
    const v = botVendetta(bot, now), b = loadBotState()[bot.id];
    return (sitCtx = { bot: bot.id, now, mt: titleOf(bot.id), ruler: rulerOwner(), v, co: coalitionOn(now), loyal: botLoyal(bot), fails: b.fails || {}, own: {} });
}
function botSituation(bot, st, target, owner, now) {        // how the moment changes the pull of a target (lower = more wanted)
    const c = botSitCtx(bot, now), o = c.own[owner] || (c.own[owner] = { respect: botRespects(bot, owner), ot: owner && owner !== bot.id ? titleOf(owner) : null,
        weak: !!owner && owner !== bot.id && ownerWeak(owner, now), personal: !!owner && !!(botGrudgeOn(bot.id, owner) || (c.v || {}).who === owner) });
    let m = o.respect ? 4 : 1;                                                                         // respect: the ruler's bases are much less tempting (not off limits)
    if (o.ot && !o.ot.good) m *= .6;                                                                   // a penalty title: weaker - everyone else smells it
    if (c.mt && !c.mt.good && owner && owner === c.ruler) m *= .5;                                     // a penalty title makes them angry at whoever gave it: the ruler gets attacked more
    const bold = (st.risk || 0) >= .12 || (st.hunt || 0) >= .5;
    const heat = heatAt(target.landmassId, now);
    if (heat > .5) m *= bold ? 1 / (1 + Math.min(3, heat) * .4) : 1 + Math.min(3, heat) * .5;       // drawn to the fighting, or keeping clear
    if (owner && bold && baseFought[target.id] && now - baseFought[target.id] < 4 * 60000) m *= .5;    // Aasgeier: the winner is thin right now
    if (o.weak) m *= .75;                                                                              // jetzt oder nie
    const sv = owner && owner !== bot.id ? botStrategic(bot, target) : 1; m *= sv;                     // in the way, at the border, next to home
    if (owner === 'player') m *= sv < .9 || o.personal ? .12 : .3;                                     // the human is everyone's favourite rival - most of all when in the way
    else if (owner && sv >= .9 && !o.personal) m *= 1.8;                                               // someone else's base far away: not worth the trouble
    if (c.v && owner === c.v.who) m *= .08;                                                            // the answer they swore
    if (c.co && c.co !== bot.id && !c.loyal && (target.id === megaTempleId || owner === c.co)) m *= target.id === megaTempleId ? .1 : .5;
    const f = c.fails[target.id]; if (f && now - f.at < 30 * 60000 && f.n >= 2) m *= 4;               // that wall hurt twice: not now
    return m;
}

function botMarginFor(bot, target, owner, now) {             // how careful: a vendetta and past failures bring more, weakness less
    let k = 1 + botFails(bot, target.id, now) * .45;
    const v = botVendetta(bot, now); if (v && owner === v.who) k *= 1.3;
    if (owner && ownerWeak(owner, now)) k *= .9;
    return k;
}

// What a bot knows about a base: like a person it only knows the numbers after scouting (or fighting) there.
// Intel ages: after 10 minutes it scouts again. Scouting takes as long as a scout would walk (about half the march).
const BOT_INTEL_MS = 10 * 60000;

function botIntel(bot, targetId) {
    const it = botIntelMem[bot.id] && botIntelMem[bot.id][targetId];
    const maxAge = islandOwnerOf(targetId) === 'player' ? 5 * 60000 : targetId === megaTempleId && coalitionOn(Date.now()) ? 90000 : BOT_INTEL_MS;   // (their growth since the report is estimated anyway)   // a player's base can fill up any minute: a report older than a minute isn't worth attacking on
    if (it && it.pending && Date.now() >= it.ready) { const t = islandById[targetId]; it.s = effectiveTroops(t) + effectiveDefense(t); it.pending = false; }   // the scout arrives: what's there now
    return it && Date.now() >= it.ready && Date.now() - it.ready < maxAge ? it : null;
}

const botIntelMem = {};                                       // kept in memory only: it goes stale in 10 min anyway

function botScouting(bot, targetId) { const it = botIntelMem[bot.id] && botIntelMem[bot.id][targetId]; return !!it && Date.now() < it.ready; }

function botLearn(botId, targetId, ready, vonLm) {            // (ready = when the report comes in; vonLm = Landmasse, von der der Späher losläuft)
    if (!botById[botId]) return false; const t = islandById[targetId]; if (!t) return false;
    if (ready) {                                              // geschlossenes fremdes Tor auf dem Weg: der Späher kommt nicht durch – dann geht er gar nicht erst los
        if (vonLm === undefined) { const cap = islandById[botCapitalOf(botId)]; vonLm = cap ? cap.landmassId : undefined; }
        if (vonLm !== undefined && !spaeherWeg(vonLm, t.landmassId, botId)) return false;
    }
    const it = botIntelMem[botId] || (botIntelMem[botId] = {});
    it[targetId] = { s: effectiveTroops(t) + effectiveDefense(t), ready: ready || Date.now(), pending: !!ready && ready > Date.now() };
    const keys = Object.keys(it); if (keys.length > 120) for (const k of keys.sort((u, v) => it[u].ready - it[v].ready).slice(0, keys.length - 120)) delete it[k];
    if (ready) { botStat(botId, 'scouts'); botScoutLos(botId, targetId, ready); }   // a scout sent out (Erfolge) – der Herr erfährt es bei Ankunft
}

// A person can only tap so fast: every order (attack, send, scout, reinforce) takes a few seconds, and a strike
// from several bases is sent one base after the other - they arrive when they arrive, like anyone's would.
const botAct = {};                                          // botId → { next: when the next tap can happen, plan: orders still to give }

function botActOf(botId) { return botAct[botId] || (botAct[botId] = { next: 0, plan: null }); }

