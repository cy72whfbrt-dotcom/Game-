// ===== bots.js – alles, was die anderen Spieler (Mitspieler) denken und tun =====
// Geladen vor spiel.js. Hier stehen nur Tabellen und Funktionen: nichts davon läuft beim Laden
// schon los (bis auf das Sortieren der Gruppen), alles andere ruft das Spiel später auf.
// Kapitel: 1) Gruppen  2) Spieler  3) wie sie die Karte lesen  4) Angreifen, Spähen, Sammeln  5) Stand, Stadt, Helden,
// Ausrüstung  6) Verteidigen, Schild, Hauptstadt  7) Titel, Takt  8) Aussehen, Thron-Shop, Vorspulen  9) Felder und Armeen
// Der Spielstand der Mitspieler (wem welche Basis gehört, Münzen) wird mit deinem zusammen in index.html geladen.

// ==============================================================================================================
// 1) GRUPPEN – wie jemand spielt (nie sichtbar)
// ==============================================================================================================
// Gruppen (only inside the bot logic - never shown, never named in a task, a title or a text): every player looks
// like a normal person, some just play much better. n = how many of the 150 play that way.
const BOT_GROUPS = {
    veteran:  { n: 12, margin: 1.05, commit: .85, tapMs: 3000, marches: 8, hunt: 1.6, risk: .25, spend: .9,  send: 1,   skills: ['attack', 'troops', 'speed', 'attackGold', 'defense'], temple: .3, enemy: .5, act: .86,
                moveMs: 2000, sources: [30, 20], gather: 15, armies: 2, shield: .45 },     // the very good ones: quick, patient with big strikes, gather from the whole empire
    raider:   { n: 30, margin: 1.1,  commit: .85, tapMs: 4000, marches: 6, hunt: 1,   risk: .25, spend: .45, send: 1,   skills: ['attack', 'troops', 'attack', 'speed', 'attackGold', 'defense'], temple: .7, enemy: .55, act: .72, gather: 10, armies: 1, shield: .3 },
    builder:  { n: 35, margin: 1.5,  commit: .55, tapMs: 7000, marches: 3, hunt: .2,  risk: .05, spend: .9,  send: .8,  skills: ['troops', 'defense', 'troops', 'speed', 'defenseGold', 'attack'], temple: .6, enemy: 1.2, act: .6, gather: 6, armies: 1, shield: .85 },
    templer:  { n: 25, margin: 1.2,  commit: .75, tapMs: 5000, marches: 5, hunt: .3,  risk: .12, spend: .65, send: .9,  skills: ['attack', 'troops', 'defense', 'speed', 'attackGold', 'defenseGold'], temple: .2, enemy: 1, act: .66, gather: 10, armies: 1, shield: .7 },
    balanced: { n: 48, margin: 1.2,  commit: .7,  tapMs: 5000, marches: 5, hunt: .5,  risk: .12, spend: .65, send: .9,  skills: ['troops', 'attack', 'defense', 'speed', 'attackGold', 'defenseGold'], temple: .5, enemy: .9, act: .64, gather: 8, armies: 1, shield: .6 }
};

const BOT_STYLES = BOT_GROUPS;

// ==============================================================================================================
// 2) DIE SPIELER – Namen, Farben, Gruppe
// ==============================================================================================================
// Bots: other "players" on the same map, each with their own
// territory/troops/coins, that think and act on their own timer
// (see runBotTick below) - attack, upgrade, and expand exactly like
// the human player does, just automated.
// The other "players": gamer names, each with a play style (see BOT_STYLES) - they act like people:
// online in sessions, with pauses, not always the perfect move, and never at the same moment.
const BOT_DEFS = [
    { id: 'bot1',  name: 'Kevin_93',     color: '#9b59b6', style: 'raider' },
    { id: 'bot2',  name: 'LenaB',        color: '#e67e22', style: 'builder' },
    { id: 'bot3',  name: 'NordWolf',     color: '#16a085', style: 'templer' },
    { id: 'bot4',  name: 'xXDarkMageXx', color: '#d6336c', style: 'raider' },
    { id: 'bot5',  name: 'Tobi_GER',     color: '#34495e', style: 'balanced' },
    { id: 'bot6',  name: 'Mia',          color: '#f39c12', style: 'builder' },
    { id: 'bot7',  name: 'Sensei88',     color: '#e74c3c', style: 'templer' },
    { id: 'bot8',  name: 'Grimmbart',    color: '#2c3e50', style: 'balanced' },
    { id: 'bot9',  name: 'Pixelheld',    color: '#8e44ad', style: 'raider' },
    { id: 'bot10', name: 'Luna',         color: '#c0392b', style: 'builder' },
    { id: 'bot11', name: 'ChrisK',       color: '#27ae60', style: 'balanced' },
    { id: 'bot12', name: 'Schattenfuchs', color: '#d35400', style: 'templer' },
    { id: 'bot13', name: 'Jonas',        color: '#7f8c8d', style: 'balanced' },
    { id: 'bot14', name: 'IronMike',     color: '#b03a2e', style: 'raider' },
    { id: 'bot15', name: 'Sophie_K',     color: '#6c3483', style: 'builder' },
    { id: 'bot16', name: 'Drachenherz',  color: '#a04000', style: 'templer' },
    { id: 'bot17', name: 'Nina_R',       color: '#884ea0', style: 'builder' },
    { id: 'bot18', name: 'Blitzkrieger', color: '#cb4335', style: 'raider' },
    { id: 'bot19', name: 'MaxPower',     color: '#1f618d', style: 'balanced' },
    { id: 'bot20', name: 'Eisbär',       color: '#117864', style: 'templer' },
    { id: 'bot21', name: 'Lukas_07',     color: '#b9770e', style: 'raider' },
    { id: 'bot22', name: 'Hanna',        color: '#6e2c00', style: 'builder' },
    { id: 'bot23', name: 'Sturmfalke',   color: '#5b2c6f', style: 'balanced' },
    { id: 'bot24', name: 'Ragnar',       color: '#943126', style: 'raider' },
    { id: 'bot25', name: 'Emma',         color: '#e84393', style: 'veteran' },  // a very strong player - same economy as everyone
    { id: 'bot26', name: 'Felix_R', color: '#1abc9c', style: 'raider' },
    { id: 'bot27', name: 'Waldläufer', color: '#e67e22', style: 'builder' },
    { id: 'bot28', name: 'Anna.K', color: '#2980b9', style: 'templer' },
    { id: 'bot29', name: 'Stahlfaust', color: '#8e44ad', style: 'balanced' },
    { id: 'bot30', name: 'Tom88', color: '#c0392b', style: 'raider' },
    { id: 'bot31', name: 'Morgenrot', color: '#16a085', style: 'builder' },
    { id: 'bot32', name: 'Jana', color: '#d35400', style: 'templer' },
    { id: 'bot33', name: 'Klingenherz', color: '#7d3c98', style: 'balanced' },
    { id: 'bot34', name: 'Leon_B', color: '#2e86c1', style: 'raider' },
    { id: 'bot35', name: 'Sturmwind', color: '#a93226', style: 'builder' },
    { id: 'bot36', name: 'Clara', color: '#117a65', style: 'templer' },
    { id: 'bot37', name: 'Donnerkeil', color: '#b7950b', style: 'balanced' },
    { id: 'bot38', name: 'Paul_H', color: '#6c3483', style: 'raider' },
    { id: 'bot39', name: 'Eisenherz', color: '#1f618d', style: 'builder' },
    { id: 'bot40', name: 'Marie_S', color: '#943126', style: 'templer' },
    { id: 'bot41', name: 'Rabenschwarz', color: '#0e6655', style: 'balanced' },
    { id: 'bot42', name: 'Ben1990', color: '#9a7d0a', style: 'raider' },
    { id: 'bot43', name: 'Feuerfalke', color: '#5b2c6f', style: 'builder' },
    { id: 'bot44', name: 'Laura', color: '#154360', style: 'templer' },
    { id: 'bot45', name: 'Nachtwache', color: '#78281f', style: 'balanced' },
    { id: 'bot46', name: 'Finn', color: '#0b5345', style: 'raider' },
    { id: 'bot47', name: 'Steinbrecher', color: '#7e5109', style: 'builder' },
    { id: 'bot48', name: 'Emily_W', color: '#4a235a', style: 'templer' },
    { id: 'bot49', name: 'Wolfsblut', color: '#1b4f72', style: 'balanced' },
    { id: 'bot50', name: 'Noah', color: '#641e16', style: 'raider' },
    { id: 'bot51', name: 'Silberpfeil', color: '#145a32', style: 'builder' },
    { id: 'bot52', name: 'Lea_M', color: '#784212', style: 'templer' },
    { id: 'bot53', name: 'Bergkönig', color: '#512e5f', style: 'balanced' },
    { id: 'bot54', name: 'Elias', color: '#1a5276', style: 'raider' },
    { id: 'bot55', name: 'Frostbart', color: '#7b241c', style: 'builder' },
    { id: 'bot56', name: 'Hannah_L', color: '#196f3d', style: 'templer' },
    { id: 'bot57', name: 'Schwertträger', color: '#6e2c00', style: 'balanced' },
    { id: 'bot58', name: 'David_K', color: '#4a235a', style: 'raider' },
    { id: 'bot59', name: 'Goldklinge', color: '#2471a3', style: 'builder' },
    { id: 'bot60', name: 'Sarah', color: '#922b21', style: 'templer' }
];

// More players on the map: 90 more, each with its own colour and way of playing
['Eisenfaust', 'Luca_R', 'Nachtfalke', 'Jana97', 'Sturmbrecher', 'Marco_IT', 'Frostherz', 'Elif', 'Rabenschatten', 'Jonas_K', 'Silberwind', 'Nina_S', 'Donnerhall', 'Ben_2004', 'Aschekrone', 'Lea_W', 'Wolfsrudel', 'Timo_B', 'Seewind', 'Aylin', 'Blutmond', 'Felix_W', 'Steinwall', 'Sophie_R', 'Morgentau', 'Leon_91', 'Dunkelwald', 'Clara_V', 'Kupferkrone', 'Nils_H', 'Feuersturm', 'Emilia', 'Graufalke', 'Paul_DE', 'Nebelreiter', 'Lina_K', 'Hammerfall', 'Yusuf_T', 'Schattenklinge', 'Marie_P', 'Eiswind', 'Finn_O', 'Drachenblut', 'Laura_S', 'Knochenbrecher', 'Max_1999', 'Sonnenlanze', 'Julia_W', 'Rostzahn', 'Elias_G', 'Mondschein', 'Hanna_B', 'Grenzwacht', 'Noah_R', 'Kriegsruf', 'Zoe_L', 'Bernstein', 'Luis_M', 'Sturmkrähe', 'Amelie', 'Wildherz', 'Jan_P', 'Goldfalke', 'Mila_T', 'Eisenwacht', 'Oskar_F', 'Flammenherz', 'Ida_S', 'Wolkenbruch', 'Moritz_D', 'Nordlicht', 'Ella_H', 'Klingensturm', 'Henry_K', 'Morgenstern', 'Lara_J', 'Felsenfaust', 'Anton_R', 'Tiefsee', 'Maja_B', 'Sternenwacht', 'Emil_N', 'Dornenkrone', 'Frieda', 'Brandung', 'Karl_S', 'Waldgeist', 'Lotta_M', 'Himmelsspeer', 'Theo_V'].forEach((name, i) => {
    const n = 61 + i, h = Math.round((i * 137.508) % 360), l = 34 + (i % 3) * 8;
    BOT_DEFS.push({ id: 'bot' + n, name, color: 'hsl(' + h + ',62%,' + l + '%)', style: ['raider', 'builder', 'templer', 'balanced', 'balanced', 'builder'][i % 6] });
});

(function botSortGroups() {                             // the names above bring a first guess; this evens it out to the table (always the same result)
    let seed = 90721; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cnt = g => BOT_DEFS.filter(b => b.style === g).length;
    const order = BOT_DEFS.filter(b => b.id !== 'bot25').sort((a, b) => a.id.localeCompare(b.id)).map(b => [rnd(), b]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    for (const b of order) { if (!BOT_GROUPS[b.style] || cnt(b.style) > BOT_GROUPS[b.style].n) {
        const want = Object.keys(BOT_GROUPS).find(g => cnt(g) < BOT_GROUPS[g].n); if (want) b.style = want; } }
})();

// ==============================================================================================================
//    Wege: kommen Truppen durch (Tor, Maut)?
// ==============================================================================================================
function botCanCross(who, a, b, n, targetId) {   // can n troops of a bot really get from region a into region b? (route + the last gate open and affordable)
    const r = routeFor(a, b, who); if (!r) return false; if (r.length < 2) return true;
    const t = tollFor(r[r.length - 2], r[r.length - 1], n, who, targetId);
    return !t.closed && (botCoins[who] || 0) >= t.cost;
}

const BOT_BUILDINGS = ['academy', 'forge', 'hospital', 'wall', 'barracks', 'treasury', 'watch', 'heroes', 'shrine', 'storage'];   // the city buildings with an effect

const BOT_SKILLS = ['troops', 'attack', 'defense', 'speed', 'attackGold', 'defenseGold'];

// --- Bot AI ---------------------------------------------------
// A bot attack that wins takes the target for that bot (clearing
// whoever owned it before, including the player); a bot attack
// that loses damages the defender the same way a player's failed
// attack does - same rules as yours: shield (+ the hero) on a win,
// 20 % flee on a loss (+ the hero), Lazarett, kill gold. Only logged/announced to the player when
// the player's own territory is the one being fought over - bot-
// vs-bot and bot-vs-neutral fights resolve silently so the log
// doesn't fill up with battles that have nothing to do with you.
// ==============================================================================================================
//    Kampf: wenn ein Angriff der anderen ankommt
// ==============================================================================================================
function resolveBotAttack(attack) {
    const bot = botById[attack.attackerBotId];
    const source = islandById[attack.sourceId];
    const target = islandById[attack.targetId];
    if (!bot || !source || !target) return;

    const myTroops = Math.round((attack.rawTroops + (attack.attackBonus || 0)) * (attack.atkTitle !== undefined ? attack.atkTitle : titleMult(bot.id, 'attack')));
    const targetOwner = islandOwnerOf(target.id);
    const originalEnemyTroops = effectiveTroops(target);
    const fullDefense = effectiveDefense(target), originalEnemyDefense = Math.round(fullDefense * (1 - heroDefCut(attack)));   // (a hero's Rammbock, Sturmflut, Mauerbrecher)
    const partsFor = () => targetOwner === 'player' ? { atkParts: attackParts(bot.id, attack.rawTroops, attack.attackBonus || 0, myTroops, attack.hero, attack), defParts: heroDefPart(defenseParts(target), attack, fullDefense) } : null;
    const red = attack.botShield ? attack.shieldLossReductionPct : botMults(bot.id).shield;   // shield (+ the hero), snapshotted at launch
    const hosp = attack.hx ? Math.min(100, botHospitalPct(bot.id) + attack.hx.hosp) : undefined;
    const botKillRate = attack.botShield ? attack.rewardGoldRate || 0 : botGoldRate(bot.id, 'attackGold');
    const parts = partsFor();
    const totalStrength = originalEnemyTroops + originalEnemyDefense;
    const won = myTroops > totalStrength;
    if (targetOwner && targetOwner !== 'player') botGrudge(targetOwner, bot.id, won ? 2 : 1);   // bots hold grudges against each other too
    addBotXp(bot.id, won ? totalStrength : Math.min(originalEnemyTroops, myTroops));
    heroFought(bot.id, attack.hx);                                   // the hero's rage fills, like yours
    const playerInvolved = targetOwner === 'player';
    const bossHere = bossAt(target.id);

    // The capital can never be taken: a winning raid only wipes out its garrison.
    const capitalHolds = won && isCapital(target.id);
    const botSentLoss = won ? sentLossFor(attack.rawTroops, myTroops, originalEnemyDefense, red) : 0, survivors = won ? attack.rawTroops - botSentLoss : 0;   // same rule as yours   // the sword bonus fights along but doesn't stay
    const fled = won ? 0 : retreatSurvivorsPreview(attack);
    const atkFallen = attack.rawTroops - survivors - fled, atkWounded = botHospitalTake(bot.id, atkFallen, hosp);
    const homeAgain = n => { if (n <= 0) return; const t0 = Date.now();                 // they walk home like yours (a fallen home: resolveSend sends them to another base)
        pendingSends.push({ fromId: target.id, toId: source.id, troops: n, startedAt: t0, resolveAt: t0 + retreatSecs(attack, target, source, bot.id) * 1000, senderBotId: bot.id, back: true }); };
    const plunder = won && targetOwner ? plunderOf(targetOwner, capitalHolds) : null;   // Lager: the winner carries off part of the coins above the loser's protection - yours too
    if (plunder) plunderMove(targetOwner, bot.id, plunder.loot);
    if (capitalHolds) {
        islandTroops[target.id] = 0;
        botCoins[bot.id] += Math.round(originalEnemyTroops * botKillRate);   // "Angriff: Gold" for the garrison, like any other win
        homeAgain(survivors);                                       // the raiders who are left march home with the loot
    } else if (won) {
        // Same rule as the player's own captures: the new owner
        // gets the base one level lower than it was, not reset to 1.
        const levelAfterCapture = Math.max(1, (islandLevels[target.id] || 1) - 1);
        if (targetOwner) { botNoteLoss(targetOwner, target.id); clearIslandOwner(target.id); }
        islandTroops[target.id] = survivors;
        botOwnedIslands[bot.id].add(target.id); botStat(bot.id, 'caps'); if (targetOwner) botStat(bot.id, 'pvp'); if (target.type === 'temple' || target.type === 'megaTemple' || target.guardian) botStat(bot.id, 'temples');
        if (target.type === 'gate') { const sty = bot.style, r = Math.random();                  // how this player runs a gate
            setGateSettings(target.id, { toll: sty === 'templer' ? 1 : sty === 'builder' ? 0.5 : sty === 'raider' ? 0.25 : GATE_TOLLS[1 + Math.floor(r * 4)],
                                         closed: sty === 'raider' ? r < .5 : sty === 'templer' ? r < .3 : r < .1 }); }
        islandLevels[target.id] = levelAfterCapture;
        botCoins[bot.id] += Math.round(originalEnemyTroops * botKillRate);   // "Angriff: Gold" (+ the hero's Gold): per enemy troop killed
        if (target.type === 'temple' || target.type === 'megaTemple') {
            templeHoldSince[target.id] = Date.now();
        }
    } else {
        homeAgain(fled);
        const defenderCasualties = Math.min(originalEnemyTroops, myTroops);
        botCoins[bot.id] += Math.round(defenderCasualties * botKillRate);
        if (targetOwner) {
            islandTroops[target.id] = Math.max(0, (islandTroops[target.id] || 0) - defenderCasualties);
        } else if (bossHere) {
            bossHere.troops = Math.max(0, bossHere.troops - defenderCasualties);
            saveBoss();
        } else {
            target.neutralTroops = originalEnemyTroops - defenderCasualties;
            neutralTroopOverrides[target.id] = target.neutralTroops;
        }
    }
    noteBattle(target.id, won ? originalEnemyTroops : attack.rawTroops - fled, won ? targetOwner : bot.id);   // the neighbours saw it
    midFight(target.id, bot.id, won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops), targetOwner, won ? botSentLoss : attack.rawTroops - fled);   // Turnier-Punkte - like yours
    const counts = won || !attack.planId || attack.lastWave;                    // an early wave of a planned strike failing isn't a lesson yet
    if (counts) botMoodAdd(bot.id, won ? .15 : -.2); if (targetOwner && targetOwner !== 'player') botMoodAdd(targetOwner, won ? -.25 : .1);
    if (!won && counts) botNoteFail(bot.id, target.id);
    if (!won) botLearn(bot.id, target.id);                          // a lost fight tells them what's really there
    if (!won && targetOwner && targetOwner !== 'player') botStat(targetOwner, 'defs');
    if (won && bossHere) { botStat(bot.id, 'bosses'); if (bossHere.wander) botStat(bot.id, 'wanders'); heroGrantShards(bot.id, bossHere.wander ? HERO_SHARDS_WANDER : HERO_SHARDS_BOSS); }   // the same shards you get
    updateHud();
    if (bossHere && won) { spawnBattleFx(target.id, false, bossHere.name + ' gefallen', bot.name); (bossHere.wander ? endWander : endBoss)(bot.name + ' hat ' + bossHere.name + ' besiegt!'); }

    let defWounded = 0, defGold = 0;
    if (playerInvolved) {                                          // "Verteidigung: Gold": every attacker your garrison kills pays out (also when the base falls)
        defGold = Math.round((won ? botSentLoss : attack.rawTroops - fled) * (skills.defenseGold || 0) * SKILL_DEFS.defenseGold.rate);
        if (defGold > 0) inboxAdd({ src: 'fight', coins: defGold });   // (your defense's gold waits in the Abholfach)
    }
    if (playerInvolved && !won) statBump('defends');
    if (playerInvolved) defWounded = hospitalTake(won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops));   // your fallen defenders
    if (playerInvolved) { warStat(capitalHolds ? 'plundered' : won ? 'lost' : 'defends', 1, bot.name); warStat('fallen', (won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops)) - defWounded); warStat('kills', won ? botSentLoss : attack.rawTroops - fled); }
    else if (targetOwner) {                                       // a bot defender: its Lazarett and its "Verteidigung: Gold", like yours
        const dw = botHospitalTake(targetOwner, won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops));
        const dg = Math.round((won ? botSentLoss : attack.rawTroops - fled) * botGoldRate(targetOwner, 'defenseGold'));
        botCoins[targetOwner] = (botCoins[targetOwner] || 0) + dg;
        if (window.WELT && botById[targetOwner] && botById[targetOwner].mensch) WELT.bericht(targetOwner, {    // ein echter Spieler wurde angegriffen: sein Bericht
            type: 'botAttack', botName: bot.name, botId: bot.id, targetId: target.id, myTroops, atkRaw: attack.rawTroops, atkBonus: attack.attackBonus || 0, atkFallen, atkWounded, atkFled: fled,
            atkGear: fighterSnapshot(bot.id, attack.hx), defGear: fighterSnapshot(targetOwner), enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, wounded: dw || 0,
            fallen: won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops), won, capitalHolds, defGold: dg, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0 },
            capitalHolds ? bot.name + ' hat deine Hauptstadt geplündert – die Garnison ist gefallen, aber die Stadt hält.' : won ? bot.name + ' hat deine Basis ' + islandTitle(target) + ' erobert!' : 'Verteidigung erfolgreich – ' + bot.name + ' bei ' + islandTitle(target) + ' zurückgeschlagen.');
    }
    if (window.WELT && bot.mensch) WELT.bericht(bot.id, {                // ein echter Spieler hat angegriffen: sein Bericht
        type: 'attack', sourceId: source.id, targetId: target.id, myTroops: attack.rawTroops, myTroopsBuffed: myTroops, attackBuff: myTroops - attack.rawTroops, skillBuff: attack.attackBonus || 0, titleBuff: 0,
        lossReductionPct: red, heroLossPct: attack.hx ? attack.hx.loss : 0, lossSaved: 0, attackGoldRate: botKillRate, killGold: Math.round((won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops)) * botKillRate),
        attackerCasualties: Math.max(0, atkFallen - (atkWounded || 0)), wounded: atkWounded || 0, enemyTroops: originalEnemyTroops, enemyDefense: originalEnemyDefense, defenseBuff: 0,
        defenderCasualties: won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops), retreatSurvivors: fled,
        defenderName: targetOwner ? (targetOwner === 'player' ? (window.profileName && profileName.value) || 'Spieler' : botById[targetOwner].name) : null, defenderId: targetOwner || null,
        enemyWounded: 0, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0, atkGear: fighterSnapshot(bot.id, attack.hx), defGear: targetOwner ? fighterSnapshot(targetOwner) : null,
        won, remaining: won ? survivors : 0 },
        capitalHolds ? 'Hauptstadt von ' + (targetOwner === 'player' ? 'deinem Gegner' : (botById[targetOwner] || {}).name) + ' geplündert!' : won ? islandTitle(target) + ' erobert!' : 'Angriff auf ' + islandTitle(target) + ' gescheitert.');
    if (playerInvolved) {
        const ribbon = () => spawnBattleFx(target.id, !won || capitalHolds, capitalHolds ? 'Hauptstadt hält' : won ? 'Basis verloren' : 'Verteidigt', capitalHolds ? 'Garnison gefallen' : won ? 'von ' + bot.name : bot.name + ' abgewehrt');
        finishMapBattle(attack, { sourceId: source.id, targetId: target.id, atk: 'bot', def: 'mine', hero: attack.hero || null, my: myTroops, myLoss: myTroops - (won ? survivors : fled),
                en: originalEnemyTroops, enLoss: won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops), won, onEnd: ribbon });
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
            atkGear: fighterSnapshot(bot.id, attack.hx), defGear: fighterSnapshot('player'),
            enemyTroops: originalEnemyTroops,
            enemyDefense: originalEnemyDefense,
            wounded: defWounded,
            armor: armorDefenseFor(target.id),
            fallen: won ? originalEnemyTroops : Math.min(originalEnemyTroops, myTroops),
            won,
            capitalHolds,
            defGold, plunder: plunder ? plunder.loot : 0, plunderSafe: plunder ? plunder.safe : 0
        });
        flashHint((capitalHolds
            ? bot.name + ' hat deine Hauptstadt geplündert – die Garnison ist gefallen, aber die Stadt hält.'
            : won
            ? bot.name + ' hat deine Basis ' + islandTitle(target) + ' erobert!'
            : 'Verteidigung erfolgreich – ' + bot.name + ' bei ' + islandTitle(target) + ' zurückgeschlagen.') + (defWounded ? ' ' + fmtCompact(defWounded) + ' Verwundete ins Lazarett.' : '') + (plunder && plunder.loot ? ' −' + fmtCompact(plunder.loot) + ' Münzen geplündert.' : ''), 5000);
        renderActiveMarches();
        if (isPanelOpen(popup) && popupIslandId === target.id) renderPopup();
    }
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

function botMidPull(bot, target, ruler, now) {             // weekends (Turnier) draw everyone to the middle and its gates; a fat Kopfgeld to the ruler's bases
    let m = 1;
    if (midZoneIds.has(target.id) && tourOn(now)) m *= target.id === megaTempleId ? .5 : target.guardian ? .55 : .7;
    if (ruler && ruler !== bot.id && (target.id === megaTempleId || islandOwnerOf(target.id) === ruler)) { const g = bountyGems(); if (g > 0) m /= 1 + Math.min(2, g / 1000); }
    return m;
}

// Worth the trouble? A person doesn't attack every base on the map - only the ones in the way: a foreign base inside
// their own land, one at the border, one on the way to the middle (a gate above all), one close to the capital.
// A far base of someone else is left alone unless it is personal.   (lower = more wanted, 1 = nothing special)
const botLmShareMem = {};

function botStrategic(bot, target) {
    const own = botOwnedIslands[bot.id]; if (!own || !own.size) return 1;
    const key = bot.id + ':' + target.landmassId, now = Date.now(); let sh = botLmShareMem[key];
    if (!sh || now - sh.at > 15000) { const on = islandsByLandmass[target.landmassId] || []; let mine = 0; for (const i of on) if (own.has(i.id)) mine++;
        sh = botLmShareMem[key] = { v: on.length ? mine / on.length : 0, at: now }; }
    let m = sh.v >= .5 ? .35 : sh.v > 0 ? .6 : 1;                                           // inside our land / at our border
    const cap = islandById[botCapitalOf(bot.id)];
    if (cap) {
        if (landmasses[target.landmassId].ring < landmasses[cap.landmassId].ring && (sh.v > 0 || (reachableLandmassIds[cap.landmassId] || []).includes(target.landmassId)))
            m *= target.type === 'gate' ? .35 : .6;                                           // blocks the way to the middle
        if (Math.hypot(target.x - cap.x, target.y - cap.y) < ISLAND_RADIUS * 25) m *= .6;     // right next to home
    }
    return m;
}

// Everything that could get there: every base with a route (the capital too - nobody can attack it anyway) and the
// field armies standing around. A person counts the whole empire before calling a target hopeless.
const botPoolMem = {};

function botPoolFor(bot, target) {
    const key = bot.id + ':' + target.landmassId, now = Date.now(), c = botPoolMem[key];
    const own = botOwnedIslands[bot.id] || new Set();
    if (c && now - c.at < 4000 && c.src.every(sv => own.has(sv.id))) return c;               // (looked at a moment ago - and still all theirs)
    let s = 0; const src = [], rt = {}, thr = botThreatened(bot.id), reach = (lm, n) => {      // a route, and the last gate open and affordable for that many
        const r = lm in rt ? rt[lm] : (rt[lm] = routeFor(lm, target.landmassId, bot.id)); if (!r) return false; if (r.length < 2) return true;
        const t = tollFor(r[r.length - 2], r[r.length - 1], n, bot.id, target.id); return !t.closed && (botCoins[bot.id] || 0) >= t.cost; };
    for (const id of own) {
        if (id === megaTempleId || thr.has(id)) continue;                                   // a base under attack keeps its troops
        const isl = islandById[id], have = Math.floor((islandTroops[id] || 0) * .9);
        if (have < BOT_MIN_GARRISON_TO_ATTACK || !reach(isl.landmassId, have)) continue;
        src.push({ id, have }); s += have;
    }
    for (const a of armies) if (a.who === bot.id && reach(a.lm, a.troops)) s += a.troops + armyJoins.reduce((n, j) => n + (j.armyId === a.id ? j.troops : 0), 0);   // (troops still on the way to it too)
    src.sort((u, v) => v.have - u.have);
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

function botNoteTooStrong(bot, targetId, pool) { (botTooStrongMem[bot.id] || (botTooStrongMem[bot.id] = {}))[targetId] = { until: Date.now() + 15 * 60000, pool }; }

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

function botLearn(botId, targetId, ready) {                   // (ready = when the report comes in)
    if (!botById[botId]) return; const t = islandById[targetId]; if (!t) return;
    if (ready) { const cap = islandById[botCapitalOf(botId)]; if (cap && !spaeherWeg(cap.landmassId, t.landmassId, botId)) return false; }   // geschlossenes Tor: der Späher kommt nicht durch
    const it = botIntelMem[botId] || (botIntelMem[botId] = {});
    it[targetId] = { s: effectiveTroops(t) + effectiveDefense(t), ready: ready || Date.now(), pending: !!ready && ready > Date.now() };
    const keys = Object.keys(it); if (keys.length > 120) for (const k of keys.sort((u, v) => it[u].ready - it[v].ready).slice(0, keys.length - 120)) delete it[k];
    if (ready) botStat(botId, 'scouts');                                  // a scout sent out (Erfolge)
}

// A person can only tap so fast: every order (attack, send, scout, reinforce) takes a few seconds, and a strike
// from several bases is sent one base after the other - they arrive when they arrive, like anyone's would.
const botAct = {};                                          // botId → { next: when the next tap can happen, plan: orders still to give }

function botActOf(botId) { return botAct[botId] || (botAct[botId] = { next: 0, plan: null }); }

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

function botFreeSlots(bot) { return (BOT_STYLES[bot.style].marches || 5) - pendingAttacks.filter(a => a.attackerBotId === bot.id).length - pendingSends.filter(x => x.senderBotId === bot.id && !x.back).length - armyJoins.filter(j => j.who === bot.id).length - armies.filter(a => a.who === bot.id && a.mv).length; }

function botPlanStep(bot) {                                 // gives the next order of the current plan → true when a tap was used
    const act = botActOf(bot.id), p = act.plan, own = botOwnedIslands[bot.id];
    if (!p || Date.now() > p.until || !p.steps.length) { act.plan = null; return false; }
    if (p.kind === 'send' ? !own.has(p.t) : own.has(p.t) || isCapital(p.t) || baseShieldedFor(p.t, bot.id)) { act.plan = null; return false; }   // the goal changed meanwhile (taken, a capital now, or under a shield)
    if (botFreeSlots(bot) <= 0) return false;                  // every march slot busy: keep the step for a later move
    const st = p.steps.shift(); if (!p.steps.length) act.plan = null;
    if (!own.has(st.from) || (p.kind === 'attack' && botThreatened(bot.id).has(st.from))) return false;
    if (p.kind === 'send') { if ((islandTroops[st.from] || 0) < BOT_MIN_GARRISON_TO_ATTACK) return false; launchSend(st.from, p.t, bot.id); return true; }
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

function botScoutsArrive(now) {
    const due = botScoutsOnMap.filter(s => s.resolveAt <= now); if (!due.length) return;
    botScoutsOnMap = botScoutsOnMap.filter(s => s.resolveAt > now);
    for (const s of due) if (islandOwnerOf(s.targetId) === 'player') scoutNote('back', s.bot, s.targetId);
    requestRender();
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
    const ow = islandOwnerOf(target.id); if (!ow || bossAt(target.id)) return false;
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
        for (const lm of lms) { k.add(lm); for (const n of lmNachbarn[lm] || []) k.add(n); }
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
    if (Math.random() < .1 && (botBarbHunt(bot) || botDayBoss(bot))) { botTapped(bot); saveBotState(); return; }   // now and then a camp or a strike at the daily boss (that is this move's order)
    const st = botStyle(bot), atk = botAtkFactor(bot, true), ruler = rulerOwner();   // several waves: a hero only leads one, so he's a bonus, not part of the plan
    const shielded = playerShielded(), now = Date.now(), shOwn = shieldedOwners(now);
    const busy = new Set(pendingAttacks.filter(a => a.attackerBotId === bot.id).map(a => a.targetId)), thr = botThreatened(bot.id);
    for (const a of armies) if (a.who === bot.id && a.t != null) busy.add(a.t);                 // their own army out there is already on it
    // a player has a few march slots, not hundreds: columns on the road (attacks + sends) count against them
    let slots = (st.marches || 5) - pendingAttacks.filter(a => a.attackerBotId === bot.id).length - pendingSends.filter(x => x.senderBotId === bot.id && !x.back).length;
    const commit = st.commit || .7;                              // how much of a base's army a person sends at once
    // 1) look around: every reachable target near the bot's bigger armies, with how much the bot could throw at it
    const T = new Map(), sitM = new Map();                      // targetId → { target, d, sources: [{ id, have }] }
    const sitOf = (t, ow) => { let v = sitM.get(t.id); if (v === undefined) { v = botSituation(bot, st, t, ow, now); sitM.set(t.id, v); } return v; };   // (the same for every base looking at it)
    const okM = new Map(), okOf = t => { let v = okM.get(t.id); if (v === undefined) okM.set(t.id, v = !(owned.has(t.id) || isCapital(t.id) || busy.has(t.id)   // capitals can't be attacked
        || (shOwn.has(islandOwnerOf(t.id)) && shieldCovers(t)))); return v; };                       // anyone's Friedensschild
    const pullM = new Map(), pullOf = t => { let v = pullM.get(t.id); if (v) return v;                // everything about a target that doesn't depend on where they look from (once per move, not per base)
        const ow = islandOwnerOf(t.id), grudge = botGrudgeOn(bot.id, ow);                          // revenge pulls them towards whoever hit them
        const k = (grudge ? 1 / (1 + grudge.n) : 1) * sitOf(t, ow) * (rally && rally.t === t.id ? .05 : 1)   // the planned big strike comes first
            * (t.id === megaTempleId && ruler !== bot.id ? (ruler ? .1 : .015) : 1)                // the throne pulls - an empty one most of all (the crown is free)
            * botMidPull(bot, t, ruler, now);                                                       // the Turnier on weekends, the Kopfgeld on the ruler
        pullM.set(t.id, v = { ow, grudge, k }); return v; };
    const mem = loadBotState()[bot.id];
    if (mem.rally && (now > mem.rally.until || !owned.has(mem.rally.at) || owned.has(mem.rally.t) || isCapital(mem.rally.t))) mem.rally = null;
    const rally = mem.rally, sampled = botSampleSources(owned, st.sources), kennt = botKennt(bot.id);
    if (rally && !sampled.includes(rally.at)) sampled.push(rally.at);
    for (const sourceId of sampled) {
        if (thr.has(sourceId) || sourceId === megaTempleId && !(rally && rally.at === sourceId)) continue;   // nobody empties the throne for an ordinary attack - or a base the enemy is marching on
        const have = Math.floor((islandTroops[sourceId] || 0) * (rally && rally.at === sourceId ? .95 : commit));   // the gathered army goes almost whole
        if (have < BOT_MIN_GARRISON_TO_ATTACK) continue;
        const source = islandById[sourceId];
        for (const lmId of reachableLandmassIds[source.landmassId]) {
            if (!landmassesConnected(source.landmassId, lmId) || !kennt.has(lmId)) continue;   // nur was sie erforscht haben (Nebel)
            const toll = tollFor(source.landmassId, lmId, have, bot.id).cost, canPass = !toll || (botCoins[bot.id] || 0) >= toll;
            for (const target of islandsByLandmass[lmId] || []) {
                if (!okOf(target)) continue;                                                   // theirs, a capital, already on it, or under a shield
                if (!canPass && !(target.type === 'gate' && gateOnRoute(source.landmassId, lmId) === target)) continue;
                const pv = pullOf(target), grudge = pv.grudge, tOwner = pv.ow;
                let d = Math.hypot(target.x - source.x, target.y - source.y) * pv.k;
                const inward = landmasses[target.landmassId].ring < landmasses[source.landmassId].ring;
                if (inward) d *= target.type === 'gate' ? .3 : .5;                              // everyone wants to get to the middle
                else if (bossAt(target.id)) d *= 0.15;                                         // events: bosses and the Wanderboss are worth a big attack
                else if (target.type === 'gate' || target.type === 'temple' || target.guardian) d *= st.temple;
                else if (tOwner) d *= st.enemy / (tOwner === 'player' ? 1 + (st.hunt || 0) : 1);   // raiders like hitting other players, the aggressive ones the player most
                const e = T.get(target.id) || { target, d: Infinity, sources: [], grudge };
                e.d = Math.min(e.d, d); e.sources.push({ id: sourceId, have }); T.set(target.id, e);
            }
        }
    }
    // now and then a look at the human's bases next door - from whichever of their own bases is nearest, not only the big armies
    if (!shielded && ownedIslands.size && Math.random() < .6) {
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
            const src = islandById[sourceId], have = Math.floor((islandTroops[sourceId] || 0) * commit);
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
    let lvSum = 0; for (const id of owned) lvSum += islandLevels[id] || 1;
    const builtUp = lvSum / owned.size >= Math.min(14, 1 + owned.size / 25);
    let grabs = builtUp && now - (mem.lastGrabAt || 0) > 1500 ? 1 : 0;                  // at most one new base every 1.5 s, even for the fastest
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
            if (li < 3 && !botScouting(bot, e.target.id)) { const ready = now + scoutSecs(islandById[e.sources[0].id], e.target, bot.id) * 1000;
                if (botLearn(bot.id, e.target.id, ready) !== false && islandOwnerOf(e.target.id) === 'player') botScoutVisible(bot, e.sources[0].id, e.target.id, now, ready);
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
        if (botPlanStep(bot)) { n++; if (grab) { grabs--; mem.lastGrabAt = now; } botRevengeLaunched(bot, e.target.id); if (rally && rally.t === e.target.id) mem.rally = null; }
        break;                                                                                    // one decision per move
    }
    // nothing to strike: scout the most interesting base they don't know yet (that is this move's order)
    if (!n && !rallied && !scouted) for (const e of list.slice(0, 8)) {
        if (botIntel(bot, e.target.id) || botScouting(bot, e.target.id) || bossAt(e.target.id)) continue;
        const ow = islandOwnerOf(e.target.id);
        if (ow && ow !== 'player' && botStrategic(bot, e.target) >= .9 && !botGrudgeOn(bot.id, ow)) continue;   // a far base of someone else: not worth a look
        if (botHopeless(bot, e.target, st, atk)) continue;
        const ready = now + scoutSecs(islandById[e.sources[0].id], e.target, bot.id) * 1000;   // their scout walks as long as yours would
        botLearn(bot.id, e.target.id, ready);
        if (islandOwnerOf(e.target.id) === 'player') botScoutVisible(bot, e.sources[0].id, e.target.id, now, ready);   // you see it coming
        scouted++; break;
    }
    if (n || rallied || scouted) botTapped(bot);
    if (!n && !scouted && !rallied && (botGather(bot) || (Math.random() < .35 && botGatherField(bot)))) botTapped(bot);
    saveBotState();
}

// Bots play by exactly the player's rules: XP and levels (1 skill point per level into the same 6 skills), a city
// with the same 9 buildings they build themselves (same coins, same build times, one builder), a Lazarett with
// room for a limited number of wounded that they heal for coins, the same 14 heroes (shards, stars, skills, one per attack),
// gear from crates (combine 3 → 1, salvage for points, level up, stars in the Schmiede) and bases upgraded
// as far as their coins allow. Nothing is derived from their level any more.
// ==============================================================================================================
// 5) STAND, STADT, LAZARETT, HELDEN, AUSRÜSTUNG, EINKAUF – dieselben Regeln wie deine
// ==============================================================================================================
var botState = null;

function loadBotState() {
    if (botState) return botState;
    try { botState = JSON.parse(store.get('openWaterBotState')) || {}; } catch (e) { botState = {}; }
    for (const bot of BOT_DEFS) {
        const b = botState[bot.id] = Object.assign({ lvl: 1, xp: 0, sp: 0, gems: 0, salvage: 0 }, botState[bot.id] || {});
        b.skills = Object.assign({ troops: 0, attack: 0, defense: 0, speed: 0, attackGold: 0, defenseGold: 0 }, b.skills || {});
        b.equip = Object.assign({ weapon: 0, armor: 0, shield: 0, boots: 0 }, b.equip || {});
        if (!b.v2 && !b.items) { b.items = {}; for (const k of Object.keys(EQUIPMENT_DEFS)) b.items[k] = RARITY_DEFS.map(() => 0); }
        if (!b.v2) botMigrateV2(bot, b);
        b.city.levels = Object.assign(Object.fromEntries(BOT_BUILDINGS.map(k => [k, 0])), b.city.levels || {}); cityBuildsFix(b.city);   // one build → a list (a second builder can be bought, like yours)
        if (!b.hs) b.hs = heroConvert(b.heroes, b.city.levels.heroes || 0); heroFix(b.hs); delete b.heroes;   // the old 3 heroes → stars, like yours (+ the same starter shards)
        if (!(b.wounded >= 0)) b.wounded = 0;
        b.shields = Object.assign({ 2: 0, 8: 0, 24: 0 }, b.shields || {}); if (!(b.shieldUntil > 0)) b.shieldUntil = 0;
        if (!b.achLook) { const st = b.stats || {}, cm = Math.min(...BOT_BUILDINGS.filter(k => k !== 'storage').map(k => b.city.levels[k] || 0));   // Erfolge give no titles any more: the ones reached so far stay
            b.achLook = Object.entries({ cap100: (st.caps || 0) >= 100, cap1000: (st.caps || 0) >= 1000, def25: (st.defs || 0) >= 25, boss1: (st.bosses || 0) >= 1, emma10: (st.pvp || 0) >= 10, city5: cm >= 5, throne: !!st.ruled }).filter(e => e[1]).map(e => e[0]); }
        if (!b.goals) b.goals = {};                                   // Erfolge already collected (gems)
    }
    return botState;
}

function botMigrateV2(bot, b) {                          // older saves: level-derived city/hero, coin gear, item counts → the real thing
    const idn = parseInt(bot.id.slice(3), 10) || 0, r = mulberry32(idn * 3301 + 17);
    const cl = Math.min(25, Math.floor(b.lvl / 2));
    b.city = { levels: {}, builds: [], builder2: false };
    for (const k of BOT_BUILDINGS) b.city.levels[k] = Math.max(0, Math.min(k === 'forge' ? STAR_MAX : 25, cl - Math.floor(r() * 3)));
    const hall = b.city.levels.heroes;
    b.heroes = {}; for (const h of ['sigrun', 'bernhard', 'ida']) b.heroes[h] = { lvl: Math.max(1, Math.min(50, hall * 2 - Math.floor(r() * 3))), xp: 0, rar: 0 };   // (turned into stars right after)
    let refund = 0; for (const k of Object.keys(b.equip)) { for (let l = 0; l < b.equip[k]; l++) refund += equipmentUpgradeCost(l); b.equip[k] = 0; }   // coin gear no longer exists for anyone
    if (refund && typeof botCoins !== 'undefined' && botCoins[bot.id] !== undefined) botCoins[bot.id] += refund;
    b.gear = {}; b.spare = {}; b.pts = 0;
    for (const k of Object.keys(EQUIPMENT_DEFS)) {
        const c = (b.items && b.items[k]) || RARITY_DEFS.map(() => 0); let best = -1;
        for (let q = c.length - 1; q >= 0; q--) if (c[q] > 0) { best = q; break; }
        b.gear[k] = best >= 0 ? { r: best, lvl: Math.min(ITEM_MAX_LEVEL, 1 + Math.floor((b.salvage || 0) / 12)), st: 0 } : null;
        b.spare[k] = c.slice(); if (best >= 0) b.spare[k][best]--;
    }
    delete b.items; b.items = null;
    const total = (b.skills.troops || 0) + (b.skills.attack || 0) + (b.skills.defense || 0);   // their points, re-spent over all 6 skills
    for (const k of BOT_SKILLS) b.skills[k] = 0;
    b.sp = (b.sp || 0) + total; botSpendSkills(bot, b);
    b.v2 = 1;
}

function botSpendSkills(bot, b) {
    const order = BOT_STYLES[bot.style].skills;
    for (let guard = 0; b.sp > 0 && guard < 10000; guard++) {
        const spent = BOT_SKILLS.reduce((a, k) => a + (b.skills[k] || 0), 0);
        let k = order[spent % order.length];
        if (SKILL_DEFS[k].max && b.skills[k] >= SKILL_DEFS[k].max) k = order.find(q => !(SKILL_DEFS[q].max && b.skills[q] >= SKILL_DEFS[q].max)) || 'troops';
        b.skills[k] = (b.skills[k] || 0) + 1; b.sp--;
    }
}

// Bots change their state many times a second: write it out at most every few seconds, and when the page goes away.
var botSaveTimer = null;

function flushBotState() { if (botSaveTimer) { clearTimeout(botSaveTimer); botSaveTimer = null; } if (botState) store.set('openWaterBotState', JSON.stringify(botState)); }

function saveBotState() { if (!botSaveTimer) botSaveTimer = setTimeout(flushBotState, 4000); }

// ---- a bot's city ----
function botBld(botId, id) { const b = loadBotState()[botId]; return b ? (b.city.levels[id] || 0) : 0; }

function botCityFinish(bot, now) {                        // a build is done when its time is up - online or not, like yours
    const c = loadBotState()[bot.id].city, done = c.builds.filter(x => now >= x.endsAt); if (!done.length) return;
    for (const x of done) c.levels[x.id] = x.to; c.builds = c.builds.filter(x => now < x.endsAt); saveBotState();
}

const BOT_BUILD_PREF = {                                  // what each kind of player builds first (lower = sooner)
    raider:   { barracks: 1, academy: 1.1, heroes: 1.2, forge: 1.4, hospital: 1.4, wall: 1.7, treasury: 1.5, watch: 1.9, shrine: 2.2, storage: 2 },
    builder:  { treasury: 1, wall: 1, barracks: 1.1, hospital: 1.2, forge: 1.5, heroes: 1.5, academy: 1.7, watch: 1.9, shrine: 1.6, storage: 1.1 },
    templer:  { heroes: 1, barracks: 1.1, wall: 1.2, treasury: 1.2, hospital: 1.3, forge: 1.3, academy: 1.5, watch: 1.7, shrine: 0.9, storage: 1.5 },
    balanced: { barracks: 1, treasury: 1, wall: 1.1, heroes: 1.2, hospital: 1.2, forge: 1.3, academy: 1.4, watch: 1.6, shrine: 1.5, storage: 1.4 },
    veteran:  { barracks: 1, academy: 1, heroes: 1.1, forge: 1.3, hospital: 1.3, treasury: 1.4, wall: 1.8, watch: 1.8, shrine: 2.2, storage: 1.6 }
};

function botCityBuild(bot, now) {                         // one builder (two once bought): start the next building if the coins are there
    const b = loadBotState()[bot.id], c = b.city;
    for (const x of c.builds.slice()) {                   // a person with gems finishes the last few minutes now and then
        const mins = Math.ceil((x.endsAt - now) / 60000);
        if (mins > 0 && mins <= 30 && b.gems >= mins * 4 && b.gems - mins >= TELEPORT_GEMS && Math.random() < .15) { b.gems -= mins; x.endsAt = now; botCityFinish(bot, now); }
    }
    if (c.builds.length >= citySlots(c)) return;
    const pref = BOT_BUILD_PREF[bot.style] || BOT_BUILD_PREF.balanced; let best = null, bs = Infinity;
    for (const k of BOT_BUILDINGS) {
        const lv = c.levels[k] || 0; if (lv >= cityMaxLevel(k) || c.builds.some(x => x.id === k)) continue;
        const s = (lv + 1) * (pref[k] || 1.5) * (.9 + Math.random() * .2); if (s < bs) { bs = s; best = k; }
    }
    if (!best) return;
    const lv = c.levels[best] || 0, cost = cityCost(best, lv);
    if ((botCoins[bot.id] || 0) * (botStyle(bot).build || .5) < cost) return;   // keeps half for troops and bases (a Schatzmeister less, a Bettler more)
    botCoins[bot.id] -= cost; c.builds.push({ id: best, to: lv + 1, startedAt: now, endsAt: now + cityTimeSec(best, lv) * 1000 }); saveBotState();
}

// ---- the bot's Lazarett ----
function botHospitalPct(botId) { return Math.min(60, 5 * botBld(botId, 'hospital')); }

function botHospitalCapacity(botId) { const l = botBld(botId, 'hospital'); return l ? Math.round(1e6 * Math.pow(1.6, l - 1)) : 0; }

function botHospitalTake(botId, fallen, pct) {
    const b = loadBotState()[botId]; if (!b || fallen <= 0 || !botBld(botId, 'hospital')) return 0;
    const w = Math.min(Math.max(0, botHospitalCapacity(botId) - b.wounded), Math.floor(fallen * (pct ?? botHospitalPct(botId)) / 100));
    if (w > 0) { b.wounded += w; saveBotState(); }
    return w;
}

function botHeal(bot) {                                   // heals everyone at once for coins, like your Lazarett - when it can afford it
    const b = loadBotState()[bot.id]; if (!(b.wounded > 0)) return;
    const cost = Math.ceil(b.wounded * HEAL_COIN_PER_TROOP), cap = botCapitalOf(bot.id);
    if (cap === null || cap === undefined || (botCoins[bot.id] || 0) < cost * 2) return;
    botCoins[bot.id] -= cost; islandTroops[cap] = (islandTroops[cap] || 0) + b.wounded; botStat(bot.id, 'healed', b.wounded); b.wounded = 0; saveBotState();
}

// ---- the bot's heroes: the same 14 as yours - the same shards, quarter stars, skill points and rage ----
function botHeroFreshSet() { return heroFix(heroConvert(null, 0)); }

function botPickHero(botId, src, target, raw) { return heroPickBest(botId, src, target, raw); }   // the free hero who does the most in this attack

function botHeroAtk(botId) { let m = 0; for (const h of HEROES) if (heroOwned(botId, h.id) && !heroBusy(botId, h.id)) m = Math.max(m, heroStats(botId, h.id).atk); return m; }   // what the best free hero adds

const BOT_HERO_LIKES = { raider: ['atk', 'strongAtk', 'neutralAtk', 'fieldAtk', 'gateAtk'], builder: ['loss', 'hosp', 'flee', 'gold', 'carry'], templer: ['templeAtk', 'templeLoss', 'midAtk', 'guardAtk', 'siegeAtk'],
    balanced: ['atk', 'loss'], veteran: ['atk', 'loss', 'rage', 'spd'] };

function botHeroCare(bot) {                               // like a player in the Heldenhalle: the day's shards, unlock, quarter stars, points into what suits their style
    const b = loadBotState()[bot.id], day = todayKey(); if (!b || !b.hs) return;
    if (b.hsDay !== day) { const first = !b.hsDay; b.hsDay = day;               // the daily tasks' shards - on the days they play enough to finish them
        if (!first && Math.random() < Math.min(.95, (BOT_STYLES[bot.style].act || .6) + .2)) { heroGrantShards(bot.id, HERO_SHARDS_DAY); b.hsDays = (b.hsDays || 0) + 1; if (b.hsDays % 7 === 0) heroGrantShards(bot.id, HERO_SHARDS_CHAIN); } }
    if (b.hcDay !== day && (b.hcDay = day) && Math.random() < .3) {               // a hero chest from the shop now and then (at most one a day), only from gems they can spare - like the player
        const c = [...HERO_CHESTS].reverse().find(x => b.gems >= x.gems * 3 + TELEPORT_GEMS); if (c && heroChestOpen(bot.id, c).length) { b.gems -= c.gems; b.hcN = (b.hcN || 0) + 1; } }
    const like = botHeroLikes(bot), rank = t => { const i = like.indexOf(t); return i < 0 ? 99 : i; }, now = Date.now();
    for (const h of HEROES) {
        const s = b.hs[h.id]; if (!s) continue;
        if (!s.own) heroDoUnlock(bot.id, h.id);
        for (let n = 0; n < HERO_MAXQ && s.own && heroDoStep(bot.id, h.id); n++);
        const pr = q => rank(h.sk[q][2]), best = [1, 2, 3].sort((x, y) => pr(x) - pr(y))[0];
        if (s.own && pr(best) < 99 && !s.sk[best] && [1, 2, 3].some(q => s.sk[q] && pr(q) > pr(best)) && now - ((b.hsReset || {})[h.id] || 0) > 7 * 86400000
            && b.gems >= HERO_RESET_GEMS * 3 && b.gems - HERO_RESET_GEMS >= TELEPORT_GEMS && Math.random() < .3) {   // the points sit in the wrong passive for what they do now (the middle, the ruler): reset for gems, like yours
            b.gems -= HERO_RESET_GEMS; s.sk = [0, 0, 0, 0]; (b.hsReset || (b.hsReset = {}))[h.id] = now; botStat(bot.id, 'heroResets'); }
        for (let n = 0; n < 10 && s.own && heroFree(s) > 0; n++) {             // the active skill first, then the passive that suits them best
            let k = s.sk[0] < 5 ? 0 : -1;
            if (k < 0) { const opts = [1, 2, 3].filter(q => s.sk[q] < 5).sort((x, y) => pr(x) - pr(y)); if (!opts.length) break; k = opts[0]; }
            if (!heroDoSkill(bot.id, h.id, k)) break;
        }
    }
}
function botHeroLikes(bot) {                              // what their heroes should be good at: the moment first (the middle when they hold part of it, the ruler with a bounty on him), then their style
    const r = rulerOwner(), mid = [...botOwnedIslands[bot.id] || []].some(id => midZoneIds.has(id));
    return [...(r && r !== bot.id && bountyGems() >= 300 ? ['rulerAtk'] : []), ...(mid ? ['midAtk', 'guardAtk', 'midLoss', 'templeAtk'] : []), ...(BOT_HERO_LIKES[bot.style] || [])];
}

// ---- the bot's gear: one worn item per slot, spares for combining, points for levels, stars ----
function botItem(b, slot) { const g = b.gear && b.gear[slot]; return g ? { rarity: g.r, level: g.lvl, stars: g.st || 0 } : null; }

function botGearPct(b, slot) { const g = b.gear && b.gear[slot]; return g ? itemScore({ rarity: g.r, level: g.lvl }) * RARITY_PCT_PER_SCORE * (1 + (g.st || 0) * STAR_PCT / 100) : 0; }

function botCityMult(botId, id) { return 1 + botBld(botId, id) * .02; }

function botMults(botId) {
    const b = loadBotState()[botId]; if (!b) return { troops: 1, coins: 1, armorPct: 0, defensePct: 0, attackPct: 0, shield: 0 };
    return { troops: (1 + (b.skills.troops * SKILL_DEFS.troops.pct + botGearPct(b, 'weapon')) / 100) * titleMult(botId, 'troops') * botCityMult(botId, 'barracks'),
             coins: (1 + botGearPct(b, 'boots') / 100) * titleMult(botId, 'coins') * botCityMult(botId, 'treasury'),
             armorPct: botGearPct(b, 'armor'),                                         // Rüstung: +% base defense, same rule as the player
             defensePct: b.skills.defense * SKILL_DEFS.defense.defPct,
             attackPct: b.skills.attack * SKILL_DEFS.attack.atkPct,
             shield: Math.min(90, botGearPct(b, 'shield')) };
}

function botGoldRate(botId, skill) { const b = loadBotState()[botId]; return b ? (b.skills[skill] || 0) * SKILL_DEFS[skill].rate : 0; }

function botAtkFactor(bot, noHero) {                      // what the bot expects its next attack to hit with (skill, its best free hero, title)
    return (1 + (botMults(bot.id).attackPct + (noHero ? 0 : botHeroAtk(bot.id))) / 100) * titleMult(bot.id, 'attack');
}

function botTickMs(botId) { const b = loadBotState()[botId]; return Math.max(400, 1000 - Math.min(b.skills.speed || 0, SKILL_DEFS.speed.max) * SKILL_DEFS.speed.msPerLevel); }

function botMarchMult(botId) { const b = loadBotState()[botId]; return (1 + Math.min(b.skills.speed || 0, SKILL_DEFS.speed.max) * 0.05) * (1 + botBld(botId, 'academy') * 0.02); }

function botBestRarity(botId) {
    const b = loadBotState()[botId]; let best = -1;
    for (const k of Object.keys(EQUIPMENT_DEFS)) { const it = botItem(b, k); if (it && it.rarity > best) best = it.rarity; }
    return best;
}

function addBotXp(botId, amount) {
    const b = loadBotState()[botId]; if (!b) return;
    if (botById[botId] && botById[botId].mensch) { b.xpNeu = (b.xpNeu || 0) + amount; return; }   // echter Spieler: die EP gehen als Nachricht zu ihm
    b.xp += amount;
    while (b.xp >= xpNeededForLevel(b.lvl)) { b.xp -= xpNeededForLevel(b.lvl); b.lvl++; b.sp++; b.gems += 3; }
    botSpendSkills(botById[botId], b);
    saveBotState();
}

// Online in sessions, like people: everyone has their own day (asleep for about 7 hours, now and then up at night)
// and within the day comes and goes in 20-minute stretches at their own times - not all on the same clock.
function botWeekend(now) { try { return tourOn(now); } catch (e) { return false; } }   // (not yet set up while the game boots)
function botOnline(bot, now) {
    if (bot.mensch) return !!(window.WELT && WELT.menschen[bot.id] && WELT.menschen[bot.id].online);   // echte Spieler: wirklich online?
    const st = BOT_STYLES[bot.style]; if (st.act >= 1) return true;
    const idn = parseInt(bot.id.slice(3), 10) || 0, hour = (now / 3600000 + (idn * 7.37) % 24) % 24, we = botWeekend(now);   // Turnier-Wochenende: they come more often (and stay up longer)
    if (hour < 7) return mulberry32(Math.floor(now / 1200000) * 31 + idn * 977)() < (we ? .12 : .06);
    const off = (idn * 104729) % 1200000, blk = Math.floor((now + off) / 1200000), r = mulberry32(blk * 131 + idn * 7919)();
    return r < Math.min(.97, st.act * (we ? 1.45 : 1.15));
}

// Ring-Skins: about a third of them like a ring round their bases - always the same favourite, bought with gems or Thron-Punkte like the player
function botRingFav(botId) { const idn = parseInt(botId.slice(3), 10) || 0, r = mulberry32(idn * 613 + 29); return r() < .3 ? RING_SKINS[Math.floor(r() * RING_SKINS.length)] : null; }
function botRings(bot, b) {
    if (!b.ringMig) { let L = 0; for (const id of botOwnedIslands[bot.id] || []) L = Math.max(L, islandLevels[id] || 1);   // what they wore by level stays theirs as a skin (as for the player)
        b.rings = [...new Set([...(b.rings || []), ...(L >= 10 ? ['bronze'] : []), ...(L >= 25 ? ['silver'] : [])])]; b.ringMig = 1; }
    const fav = botRingFav(bot.id); if (!fav) return;
    if (fav.gems && !b.rings.includes(fav.id) && b.gems >= fav.gems * 2 && b.gems - fav.gems >= TELEPORT_GEMS) { b.gems -= fav.gems; b.rings.push(fav.id); }
    const wear = b.rings.includes(fav.id) ? fav.id : b.rings[b.rings.length - 1] || '';   // the favourite, until then the best they have
    if ((b.ring || '') !== wear) { b.ring = wear; ringVer++; requestRender(); }
}

function botShop(bot) {                                  // gems and points spent the way a player would: heroes, stars, crates, gear
    botThroneShop(bot.id);
    const b = loadBotState()[bot.id], slots = Object.keys(EQUIPMENT_DEFS);
    botRings(bot, b);
    botLookShop(bot, b);                                 // frame, title, Marsch-Skin
    botPassCare(bot, b);                                 // Saison-Pass: premium (some), rewards as they climb
    botHeroCare(bot);                                    // shards → unlock, stars, skill points
    const starCap = Math.min(STAR_MAX, botBld(bot.id, 'forge'));   // one star per visit on the best-worn piece
    for (const k of slots.filter(q => b.gear[q]).sort((x, y) => botGearPct(b, y) - botGearPct(b, x))) {   // the strongest piece first
        const g = b.gear[k]; if ((g.st || 0) < starCap && b.gems >= starGemCost(g.st || 0) * 1.5 && b.gems - starGemCost(g.st || 0) >= TELEPORT_GEMS) { b.gems -= starGemCost(g.st || 0); g.st = (g.st || 0) + 1; break; } }
    const user = botShieldUser(bot), want = user ? { 8: bot.style === 'builder' ? 2 : 1, 2: 1 } : { 2: bot.style === 'raider' ? 0 : 1 };   // a small stock of shields
    for (const h of [8, 2]) while ((b.shields[h] || 0) < (want[h] || 0) && b.gems >= SHIELD_PRICES[h] * 1.25 && b.gems - SHIELD_PRICES[h] >= TELEPORT_GEMS) { b.gems -= SHIELD_PRICES[h]; b.shields[h]++; }
    if (!b.city.builder2 && b.gems >= CITY_BUILDER2_GEMS * 1.5 && b.gems - CITY_BUILDER2_GEMS >= TELEPORT_GEMS + 100) { b.gems -= CITY_BUILDER2_GEMS; b.city.builder2 = true; }   // rich enough: the second builder, for good
    const reserve = TELEPORT_GEMS + Object.entries(want).reduce((s2, [h, n]) => s2 + Math.max(0, n - (b.shields[h] || 0)) * SHIELD_PRICES[h], 0);   // (and 50 for a capital move)
    for (let n = 0; n < 10 && b.gems - reserve >= CRATE_GEM_COST; n++) {   // crates: random slot + rarity
        b.gems -= CRATE_GEM_COST; b.spare[pickRandomSlot()][pickRandomRarity()]++;
    }
    for (const k of slots) {
        const c = b.spare[k];
        for (let r = 0; r < c.length - 1; r++) while (c[r] >= COMBINE_COUNT) { c[r] -= COMBINE_COUNT; c[r + 1]++; }   // 3 of a kind → 1 of the next
        let top = -1; for (let r = c.length - 1; r >= 0; r--) if (c[r] > 0) { top = r; break; }
        const worn = b.gear[k];
        const pctOf = (r, lvl, st) => itemScore({ rarity: r, level: lvl }) * RARITY_PCT_PER_SCORE * (1 + (st || 0) * STAR_PCT / 100);
        if (top >= 0 && (!worn || (top > worn.r && pctOf(top, 1, 0) > pctOf(worn.r, worn.lvl, worn.st)))) {   // really better: wear it, the old one is salvaged for points
            if (worn) b.pts += itemScore({ rarity: worn.r, level: worn.lvl });
            b.gear[k] = { r: top, lvl: 1, st: 0 }; c[top]--;
        }
        const w = b.gear[k]; if (w) for (let r = 0; r < Math.max(0, w.r - 1); r++) if (c[r] > 0) { b.pts += c[r] * itemScore({ rarity: r, level: 1 }); c[r] = 0; }   // far below: salvage
    }
    for (let guard = 0; guard < 60; guard++) {             // level up the lowest worn piece with the points
        let lo = null; for (const k of slots) { const g = b.gear[k]; if (g && g.lvl < ITEM_MAX_LEVEL && (!lo || g.lvl < lo.lvl)) lo = g; }
        if (!lo || b.pts < lo.lvl * 5) break; b.pts -= lo.lvl * 5; lo.lvl++;
    }
    saveBotState();
}

function botConsiderUpgrade(bot) {
    const owned = [...botOwnedIslands[bot.id]];
    if (owned.length === 0) return;
    const st = botStyle(bot);
    // bases like a person builds them: the cheapest step that's worth it comes first, so the whole empire grows,
    // not just two show-off bases. Throne, gates, Wächter, temples and the capital count extra.
    const cap = botCapitalOf(bot.id);
    const weight = id => { const isl = islandById[id]; return isl.type === 'megaTemple' ? .2 : isl.type === 'gate' || isl.guardian ? .4 : isl.type === 'temple' ? .5 : id === cap ? .6 : 1; };
    const cand = [];
    for (const id of owned) { const lvl = islandLevels[id] || 1; if (lvl < MAX_BASE_LEVEL) cand.push({ id, cost: upgradeCost(lvl), sc: upgradeCost(lvl) * weight(id) }); }
    cand.sort((x, y) => x.sc - y.sc);
    let budget = botCoins[bot.id] * st.spend, did = 0;
    for (const c of cand) {
        if (did >= 25 || c.cost > budget) break;
        budget -= c.cost; botCoins[bot.id] -= c.cost; islandLevels[c.id] = (islandLevels[c.id] || 1) + 1; did++;
    }
    if (did) saveGame();
}

// Big targets (gates, temples, Wächter, the throne) need more than one garrison: pull troops together first.
// Too strong for the armies at hand: pull troops from the bot's other bases into one staging base, strike later.
// ==============================================================================================================
//    Truppen zusammenziehen, Hauptstadt
// ==============================================================================================================
function botRally(bot, target, atId, need, maxHelpers) {
    if (pendingSends.some(sd => sd.senderBotId === bot.id && !sd.back)) return false;
    const at = islandById[atId], helpers = [];
    let pool = (islandTroops[atId] || 0) * .95;
    const thr = botThreatened(bot.id), own = [...botOwnedIslands[bot.id]].filter(id => id !== atId && id !== megaTempleId && !thr.has(id) && (islandTroops[id] || 0) > BOT_MIN_GARRISON_TO_ATTACK)
        .map(id => ({ id, isl: islandById[id] })).filter(h => h.isl.landmassId === at.landmassId || landmassesConnected(h.isl.landmassId, at.landmassId))
        .sort((u, v) => (islandTroops[v.id] || 0) - (islandTroops[u.id] || 0));
    const most = Math.max(maxHelpers ?? 8, BOT_STYLES[bot.style].gather || 8);
    for (const h of own) { if (pool >= need * 1.3 || helpers.length >= most) break; helpers.push(h.id); pool += (islandTroops[h.id] || 0) * .95; }
    if (pool < need * 1.1 || !helpers.length) return false;
    botActOf(bot.id).plan = { kind: 'send', t: atId, steps: helpers.map(id => ({ from: id })), until: Date.now() + 120000 };
    botPlanStep(bot);
    loadBotState()[bot.id].rally = { t: target.id, at: atId, until: Date.now() + 6 * 60000 };
    return true;
}

function botGather(bot) {
    if (pendingSends.some(s => s.senderBotId === bot.id && !s.back)) return false;
    const st = botStyle(bot), thr = botThreatened(bot.id), owned = [...botOwnedIslands[bot.id]].filter(id => !thr.has(id)), atk = botAtkFactor(bot, true), kennt = botKennt(bot.id);
    let plan = null;
    for (const sourceId of botSampleSources(owned)) {
        const source = islandById[sourceId];
        for (const lmId of reachableLandmassIds[source.landmassId]) {
            if (!landmassesConnected(source.landmassId, lmId) || !kennt.has(lmId)) continue;   // (Nebel)
            for (const target of islandsByLandmass[lmId] || []) {
                if (botOwnedIslands[bot.id].has(target.id) || isCapital(target.id) || baseShieldedFor(target.id, bot.id)) continue;
                if (!(target.type === 'gate' || target.type === 'temple' || target.type === 'megaTemple')) continue;
                const need = (effectiveTroops(target) + effectiveDefense(target)) * st.margin / atk;
                const helpers = owned.filter(id => id !== sourceId && islandById[id].landmassId === source.landmassId && (islandTroops[id] || 0) > BOT_MIN_GARRISON_TO_ATTACK);
                const pool = (islandTroops[sourceId] || 0) + helpers.reduce((a, id) => a + (islandTroops[id] || 0) * .8, 0);
                if (pool < need) continue;
                const d = Math.hypot(target.x - source.x, target.y - source.y) * (target.type === 'megaTemple' ? .3 : target.guardian ? .5 : 1);
                if (!plan || d < plan.d) plan = { d, sourceId, helpers };
            }
        }
    }
    if (!plan) return false;
    for (const id of plan.helpers.sort((a, c) => (islandTroops[c] || 0) - (islandTroops[a] || 0)).slice(0, 1)) launchSend(id, plan.sourceId, bot.id);
    return true;
}

function botCapitalOf(botId) {                  // each bot's main base: its strongest base at first - later moved like yours (botConsiderCapital)
    const b = loadBotState()[botId], own = botOwnedIslands[botId];
    if (!own || !own.size) return null;
    if (b.capital === undefined || !own.has(b.capital)) {
        let best = null; for (const id of own) { const isl = islandById[id]; if (isl.type !== 'tower') continue;
            if (best === null || (islandLevels[id] || 1) > (islandLevels[best] || 1)) best = id; }
        b.capital = best ?? [...own][0]; saveBotState(); capitalCache = null;
    }
    return b.capital;
}

function botSampleSources(owned, n) {                    // a person looks at their big armies and a few others, not at all 500 bases
    const [top, extra] = n || [10, 8], arr = [...owned], rich = arr.sort((a, c) => (islandTroops[c] || 0) - (islandTroops[a] || 0)).slice(0, top);
    for (let i = 0; i < extra && arr.length > top; i++) rich.push(arr[top + Math.floor(Math.random() * (arr.length - top))]);
    return [...new Set(rich)];
}

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

function botDefend(bot) {
    const owned = botOwnedIslands[bot.id];
    if (!owned || owned.size === 0) return;
    const act = botActOf(bot.id), now = Date.now(); if (now < (act.defNext || 0)) return;      // (paced by its own timer - own columns on the road never block it)
    const notice = 1 + botBld(bot.id, 'watch') * .05, threats = new Map(), covered = loadBotState()[bot.id].shieldUntil || 0;
    const see = (id, startedAt, at, str, late) => {
        if (!owned.has(id) || isCapital(id) || (at < covered && shieldCovers(islandById[id]))) return;                                     // (it bounces off the shield anyway)
        if (now - startedAt < (3000 + (startedAt % 9000)) / notice + (at - startedAt) * (late || 0) / 100) return;   // not seen yet (Spurlos: a hero's column is seen later)
        const t = threats.get(id) || { id, str: 0, at: Infinity }; t.str += str; t.at = Math.min(t.at, at); threats.set(id, t);
    };
    for (const a of pendingAttacks) if (a.attackerBotId !== bot.id) see(a.targetId, a.startedAt, a.resolveAt, (a.rawTroops + (a.attackBonus || 0)) * (a.atkTitle || 1), a.hx ? a.hx.late : 0);   // (own later waves just move in)
    for (const a of armies) if (a.mv && a.mv.to.kind === 'base') { const w = armyWho(a);                 // a field army marching on the base is on the map too
        if (w !== bot.id) see(a.mv.to.id, a.mv.startedAt, a.mv.resolveAt, a.troops * (1 + fieldAtkPct(w) / 100) * titleMult(w, 'attack')); }
    if (!threats.size) return;
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
            launchSend(helpers[0].id, th.id, bot.id, Math.min(helpers[0].n, Math.ceil(gap * 1.1))); tapped(); return;
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
        botEvacuated[th.id] = now; launchSend(th.id, best, bot.id); tapped(); return;
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
    for (let i = pendingAttacks.length - 1; i >= 0; i--) { const a = pendingAttacks[i]; if (a.attackerBotId !== bot.id || a.fightEndsAt) continue;   // its own columns on the road turn round
        const back = botOwnedIslands[bot.id].has(a.sourceId) ? a.sourceId : botCapitalOf(bot.id); if (back !== null && back !== undefined) islandTroops[back] = (islandTroops[back] || 0) + a.rawTroops; pendingAttacks.splice(i, 1); }
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
// Why a person does it: the land around the capital is being lost (retreat), the front has moved towards the middle
// (forward, a step of 2-3 rings), or most of the empire now lies elsewhere (mass). The wish has to hold for a few
// minutes, then one tap - never into a fight that is already on its way, at most once in 45 minutes.
const BOT_CAP_EVAL_MS = 75000, BOT_CAP_COOLDOWN = 45 * 60000, BOT_CAP_GAP = 20000;

let botCapLastAny = 0; const botCapNext = {};

function botCapLocal(botId, t) { const R = ISLAND_RADIUS * 25; let o = 0, f = 0;
    for (const l of reachableLandmassIds[t.landmassId] || [t.landmassId]) for (const i of islandsByLandmass[l] || []) {
        if (i.type !== 'tower' || i.id === t.id || Math.abs(i.x - t.x) > R || Math.abs(i.y - t.y) > R || Math.hypot(i.x - t.x, i.y - t.y) > R) continue;
        const w = islandOwnerOf(i.id); if (w === botId) o++; else if (w) f++; }
    return { o, f, s: o / Math.max(1, o + f) }; }

function botCapitalMoveOk(botId, toId, busy) {          // your rules + not into a fight that is already on its way
    const to = islandById[toId];
    if (!to || !botOwnedIslands[botId].has(toId) || toId === botCapitalOf(botId) || to.type !== 'tower' || bossAt(toId) || landmasses[to.landmassId].ring === 0) return false;
    if (busy ? busy.has(toId) : pendingAttacks.some(a => a.targetId === toId)) return false;
    if (armies.some(a => armyWho(a) !== botId && (a.t === toId || (a.mv && a.mv.to.kind === 'base' && a.mv.to.id === toId)))) return false;
    return !(wander && wander.to === toId); }

function botCapitalPlan(bot, now) {                      // → { to, why } | null
    const own = botOwnedIslands[bot.id], capId = botCapitalOf(bot.id), cap = islandById[capId]; if (!cap || own.size < 12) return null;
    const busy = new Set(pendingAttacks.map(a => a.targetId)), mine = {};
    for (const id of own) { const l = islandById[id].landmassId; mine[l] = (mine[l] || 0) + 1; }
    const reach = t => { let s2 = 0; for (const l in mine) { const d = Math.hypot(landmasses[l].x - t.x, landmasses[l].y - t.y) / HEX_SPACING; s2 += mine[l] * (d < .8 ? 1 : d < 1.6 ? .5 : 0); } return s2; };
    const capRing = landmasses[cap.landmassId].ring, here = botCapLocal(bot.id, cap), capReach = reach(cap);
    const lost = botLosses(bot.id, 15 * 60000, now).filter(x => Math.hypot(islandById[x.id].x - cap.x, islandById[x.id].y - cap.y) < ISLAND_RADIUS * 37).length;
    const cand = [];
    for (const id of own) { const t = islandById[id]; if (t.type !== 'tower' || id === capId || !botCapitalMoveOk(bot.id, id, busy)) continue;
        const loc = botCapLocal(bot.id, t); if (loc.o < 10 || loc.s < .6) continue;
        cand.push({ id, ring: landmasses[t.landmassId].ring, loc, reach: reach(t), lv: islandLevels[id] || 1 }); }
    const best = (l, f) => l.reduce((a, c) => !a || f(c) > f(a) ? c : a, null);
    if (here.s < .4 || (lost >= 3 && here.s < .6)) { const c = best(cand.filter(c => c.loc.s >= .75), c => c.reach * c.loc.s + c.lv * .1); if (c) return { to: c.id, why: 'retreat' }; }
    const fwd = cand.filter(c => c.ring <= capRing - 2 && c.ring >= capRing - 3);
    if (fwd.length) return { to: best(fwd, c => c.loc.o * c.loc.s + c.reach * .3 + (capRing - c.ring) * 4 + c.lv * .1).id, why: 'forward' };
    const m = best(cand, c => c.reach + c.lv * .1);
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
    if (nt) flashHint(bot.name + ' hat die Hauptstadt nach Turm #' + (toId + 1) + ' verlegt – nah bei dir, unangreifbar.', 5500);
    else if (nf) flashHint(bot.name + ' hat die Hauptstadt verlegt – Turm #' + (fromId + 1) + ' ist keine Hauptstadt mehr.', 5000);
    if ((nt || nf) && islandSeen(to)) spawnBattleFx(toId, false, 'Hauptstadt', 'hierher verlegt');
    if (isPanelOpen(popup) && (popupIslandId === fromId || popupIslandId === toId)) renderPopup(); }

function botConsiderCapital(bot, now) {
    const b = loadBotState()[bot.id], act = botActOf(bot.id);
    if (now >= (botCapNext[bot.id] ?? (botCapNext[bot.id] = now + Math.random() * 10 * 60000))) {
        botCapNext[bot.id] = now + BOT_CAP_EVAL_MS * (.8 + Math.random() * .4);
        const pl = (b.rally && b.rally.at === botCapitalOf(bot.id)) || now - (b.capMovedAt || 0) < BOT_CAP_COOLDOWN ? null : botCapitalPlan(bot, now), w = b.capWish;
        if (!pl) b.capWish = null;
        else if (!w || w.why !== pl.why || islandById[w.to].landmassId !== islandById[pl.to].landmassId)
            b.capWish = { to: pl.to, why: pl.why, since: now, wait: (pl.why === 'retreat' ? 60 : 180 + Math.random() * 300) * 1000 };
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
    const filler = calm.filter(x => x.w !== 'player').reverse();                                                    // not enough foes: the weakest of the rest - never you for nothing
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
    if (now - b.outAt < 600000 || !botOnline(bot, now)) return;
    const edge = i => i.type === 'tower' && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring >= 3 && !bossAt(i.id);
    let free = islands.filter(i => edge(i) && !islandOwnerOf(i.id));
    if (!free.length) { const big = BOT_DEFS.filter(x => x.id !== bot.id).sort((u, v) => botOwnedIslands[v.id].size - botOwnedIslands[u.id].size)[0];   // the map is full: a fresh start on the edge of the biggest empire
        free = big && botOwnedIslands[big.id].size >= 40 ? [...botOwnedIslands[big.id]].map(id => islandById[id]).filter(i => edge(i) && !isCapital(i.id) && !pendingAttacks.some(a => a.targetId === i.id)) : []; }
    if (!free.length) return;
    const t = free[Math.floor(Math.random() * free.length)]; clearIslandOwner(t.id);
    botOwnedIslands[bot.id].add(t.id); islandLevels[t.id] = 1; islandTroops[t.id] = 0; b.outAt = 0; b.capital = t.id; b.capMovedAt = now; b.capWish = null; capitalCache = null;
    b.shieldUntil = now + 3600000; b.shieldWhy = 'start'; b.shieldAt = now;                   // an hour of peace to get going (a lone base in someone's land would fall at once)
    if (window.WELT) b.neuBis = now + NEULING_MS;                                                // Neustart: wieder Anfängerschutz (wie jeder Neue)
    saveBotState(); saveGame();
}

const botNextAt = {};

function runBotTick() {
    const now = Date.now();
    if (window.WELT && !WELT.leiter) { setTimeout(runBotTick, BOT_TICK_MS); return; }   // nur der Weltrechner lässt die Mitspieler denken
    for (const bot of BOT_DEFS) {
        if (bot.mensch) continue;                                             // echte Spieler spielen selbst
        try {                                                                 // one bot's bad move must never stop all the others
            botCityFinish(bot, now);                                          // builds finish on time, online or not
            if (botOwnedIslands[bot.id].size === 0) { botRespawn(bot, now); continue; }
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
            botConsiderUpgrade(bot);
            botRulerTitles(bot, now);
            if (Math.random() < .3) botShop(bot);
        } catch (e) { if (!runBotTick.warned) { runBotTick.warned = true; console.warn('bot move failed', bot.id, e); } }
    }
    setTimeout(runBotTick, BOT_TICK_MS);
}

// ==============================================================================================================
// 8) AUSSEHEN, STATISTIK, THRON-SHOP, VORSPULEN
// ==============================================================================================================
function botLook(botId) {
    const b = loadBotState()[botId]; if (!b) return { frame: FRAMES[0].id, title: 'Neuling' };
    if (b.mensch) { const t = TITLES_P.find(x => x.id === b.lookTitle); return { frame: b.throneLook ? 'throne' : b.lookFrame || FRAMES[0].id, title: t ? t.name : 'Neuling' }; }   // echter Spieler: sein Aussehen
    if (!b.lookMig) { const own = botOwnedIslands[botId], r = Math.max(b.bestRank || 0, rankIndexFor(own ? own.size : 0)), st = b.stats || {}, cityMin = Math.min(...BOT_BUILDINGS.filter(k => k !== 'storage').map(k => b.city.levels[k] || 0));   // once: what they had by rank and deeds stays theirs - from now on looks are only bought (as for the player)
        const ach = { cap100: (st.caps || 0) >= 100, cap1000: (st.caps || 0) >= 1000, def25: (st.defs || 0) >= 25, boss1: (st.bosses || 0) >= 1, emma10: (st.pvp || 0) >= 10, city5: cityMin >= 5, throne: !!st.ruled };
        b.frames = [...new Set([...(b.frames || []), ...FRAMES.filter(f => !f.buy && (f.rank || 0) <= r).map(f => f.id)])];
        b.titles = [...new Set([...(b.titles || []), ...TITLES_P.filter(t => !t.buy && (t.ach ? ach[t.ach] || (b.achLook || []).includes(t.ach) : (t.rank || 0) <= r)).map(t => t.id)])]; b.lookMig = 1; saveBotState(); }
    const earned = TITLES_P.filter(t => t.buy ? !!b.throneLook : t.gems === 0 || b.titles.includes(t.id));
    const idn = parseInt(botId.slice(3), 10) || 0, pick = earned[earned.length - 1 - Math.floor(mulberry32(idn * 31 + earned.length)() * Math.min(3, earned.length))];   // one of their three best - everyone has a favourite
    return { frame: b.throneLook ? 'throne' : (b.frames || []).includes('saison') ? 'saison' : [...FRAMES].reverse().find(f => !f.buy && (f.gems === 0 || b.frames.includes(f.id))).id, title: pick ? pick.name : 'Neuling' };
}
// Looks are only bought: everyone has a favourite frame, title and (6 in 10) a Marsch-Skin, bought once they can spare it - like the player in the Aussehen sheet
function botLookFav(botId) { const r = mulberry32((parseInt(botId.slice(3), 10) || 0) * 389 + 71), gf = FRAMES.filter(f => f.gems), gt = TITLES_P.filter(t => t.gems), ms = MARCH_SKINS.filter(m => m.gems || m.tp);
    return { frame: gf[Math.floor(r() * gf.length)], title: gt[Math.floor(r() * gt.length)], march: r() < .6 ? ms[Math.floor(r() * ms.length)] : null }; }
function botLookShop(bot, b) {
    botLook(bot.id); const fav = botLookFav(bot.id), can = p => b.gems >= p * 2 && b.gems - p >= TELEPORT_GEMS;
    if (fav.march && fav.march.gems && !(b.marchs || []).includes(fav.march.id) && can(fav.march.gems)) { b.gems -= fav.march.gems; b.marchs = [...(b.marchs || []), fav.march.id]; b.march = fav.march.id; }
    else if (!b.frames.includes(fav.frame.id) && can(fav.frame.gems)) { b.gems -= fav.frame.gems; b.frames.push(fav.frame.id); }
    else if (!b.titles.includes(fav.title.id) && can(fav.title.gems)) { b.gems -= fav.title.gems; b.titles.push(fav.title.id); }
}

// Baukunst: like you, everyone builds in one style of their own (picked once, the same on every device) and 1 in 3 set their capital in water
const botBaustilMem = {};
function botBaustil(botId) {
    const pm = window.WELT && WELT.menschen[botId]; if (pm && pm.profil && pm.profil.baustil) return pm.profil.baustil;   // echter Spieler: sein Baustil
    if (botBaustilMem[botId]) return botBaustilMem[botId];
    const r = mulberry32((parseInt(String(botId).replace(/\D/g, ''), 10) || 7) * 97 + 11), keys = Object.keys(BAUSTILE);
    return botBaustilMem[botId] = { style: keys[Math.floor(r() * keys.length)], cap: r() < .33 ? 'wasser' : 'huegel' };
}

// Erfolge: the same list as yours (ACHIEVEMENTS), counted from their own numbers - each one collected once for its gems, one at a time like a person tapping
const BOT_GOAL_VAL = {
    captures: (b, st) => st.caps, empire: (b, st, id) => (botOwnedIslands[id] || new Set()).size, defends: (b, st) => st.defs, pvp: (b, st) => st.pvp, bosses: (b, st) => st.bosses,
    wanders: (b, st) => st.wanders, temples: (b, st) => st.temples, throne: (b, st) => st.ruled ? 1 : 0, throneMin: (b, st) => st.throneMin, throneEarned: (b, st) => st.tpEarned, scouts: (b, st) => st.scouts,
    cityMin: b => Math.min(...BOT_BUILDINGS.filter(k => k !== 'storage').map(k => b.city.levels[k] || 0)),   // (the newer Lager doesn't count, like yours)
    baseTop: (b, st, id) => goalBaseTop(id), gates: (b, st, id) => goalGates(id), tolls: (b, st) => st.tolls, tollCoins: (b, st) => st.tollCoins,
    armyWins: (b, st) => st.armyWins, heroes: (b, st, id) => goalHeroes(id), heroStars: (b, st, id) => goalHeroStars(id), heroFires: (b, st) => st.heroFires,
    healed: (b, st) => st.healed, shields: (b, st) => st.shields, teleports: (b, st) => st.teleports, barb: (b, st) => st.barb, dboss: (b, st) => st.dboss
};
function botGoalVal(botId, k) { const b = loadBotState()[botId], f = BOT_GOAL_VAL[k]; return b && f ? f(b, b.stats || {}, botId) || 0 : 0; }
function botClaimGoals(bot) {
    const b = loadBotState()[bot.id]; if (!b) return; b.goals = b.goals || {};
    const a = ACHIEVEMENTS.find(x => !b.goals[x.id] && botGoalVal(bot.id, x.k) >= x.goal); if (!a) return;
    b.goals[a.id] = Date.now(); b.gems += a.gems; saveBotState();
}

// Saison-Pass: their points are what their stats grew by since the season began (+ 200 for each day with all tasks done) - no work per tick.
// A third of them buy premium once they can spare the gems; rewards go out as they climb, the same ones you get.
function botPassScore(b) { const st = b.stats || {}; let s = (b.hsDays || 0) * 200; for (const k in PASS_BOT_XP) s += (st[k] || 0) * PASS_BOT_XP[k]; return s; }
function botPassInfo(botId) { const b = loadBotState()[botId]; if (!b || !b.ps || b.ps.s !== passNo(Date.now())) return { lvl: 0, prem: false };
    return { lvl: Math.min(PASS_LVLS, Math.floor(Math.max(0, botPassScore(b) - b.ps.base) / PASS_STEP)), prem: !!b.ps.prem }; }
function botPassCare(bot, b) {
    const now = Date.now(), n = passNo(now); if (b.ps && (b.ps.s > n || (b.ps.s === n && now < (b.ps.at || 0)))) return;   // once a minute is plenty (and never backwards)
    if (!b.ps || b.ps.s !== n) { if (b.ps) { b.ps.at = 0; botPassPay(bot.id, b); }             // the old season: what they reached is still paid out, then a fresh pass
        b.ps = { s: n, base: botPassScore(b), f: 0, p: 0, prem: false, want: mulberry32((parseInt(bot.id.slice(3), 10) || 0) * 53 + n * 7)() < .35 }; }
    b.ps.at = now + 60000;
    if (!b.ps.prem && b.ps.want && b.gems >= PASS_PREMIUM * 1.5 && b.gems - PASS_PREMIUM >= TELEPORT_GEMS) { b.gems -= PASS_PREMIUM; b.ps.prem = true; }
    botPassPay(bot.id, b);
}
function botPassPay(botId, b) { const ps = b.ps, L = Math.min(PASS_LVLS, Math.floor(Math.max(0, botPassScore(b) - ps.base) / PASS_STEP));
    while (ps.f < L) passGive(botId, passRewardAt(++ps.f, 0));
    if (ps.prem) while (ps.p < L) passGive(botId, passRewardAt(++ps.p, 1));
}

function botStat(botId, k, n) { const b = loadBotState()[botId]; if (!b) return; b.stats = b.stats || {}; b.stats[k] = (b.stats[k] || 0) + (n || 1); saveBotState(); }

// Wochenend-Turnier and Kopfgeld: their prizes land where yours do - gems, hero shards (one hero, like a boss), coins
function botTourReward(botId, gems, shards) { const b = loadBotState()[botId]; if (!b) return; b.gems = (b.gems || 0) + gems; heroGrantShards(botId, shards); botStat(botId, 'tourPrizes'); }
function botBountyReward(botId, gems, coins) { const b = loadBotState()[botId]; if (!b) return; b.gems = (b.gems || 0) + gems; botCoins[botId] = (botCoins[botId] || 0) + coins; botStat(botId, 'bounty', gems); }

function botThroneShop(botId) {                       // the others spend their points the way a player would
    const b = loadBotState()[botId]; if (!b) return;
    const fav = botRingFav(botId);                        // a favourite ring from the Thron-Shop comes first, once they can spare the points
    if (fav && fav.tp && !(b.rings || []).includes(fav.id) && b.tp >= fav.tp * 1.2 && Math.random() < .5) { b.tp -= fav.tp; throneGive(botId, 'ring_' + fav.id); }
    const fm = botLookFav(botId).march;                   // a Marsch-Skin from the Thron-Shop the same way
    if (fm && fm.tp && !(b.marchs || []).includes(fm.id) && b.tp >= fm.tp * 1.2 && Math.random() < .5) { b.tp -= fm.tp; b.marchs = [...(b.marchs || []), fm.id]; b.march = fm.id; }
    for (let n = 0; n < 5; n++) { const r = Math.random();
        const id = !b.throneLook && b.tp >= 3000 && r < .4 ? 'look' : r < .45 ? 'troops' : r < .7 ? 'coins' : r < .85 ? 'crate' : r < .95 ? 'gems' : 'royal';
        const o = THRONE_OFFERS.find(x => x.id === id); if (!(b.tp >= o.cost)) break; b.tp -= o.cost; throneGive(botId, id); }
}

function botDropShield(botId) { const b = loadBotState()[botId]; if (!b || !(b.shieldUntil > Date.now())) return; b.shieldUntil = 0; b.shieldWhy = null; saveBotState(); requestRender(); }

const botProdCarry = {};                         // per bot: time not yet made into a tick of its own, and fractions

function botsFastForward(hours, toCenter) {        // toCenter: they push region by region towards the throne (gates, Wächter-Tempel)
    const now = Date.now(), days = hours / 24, sum = { caps: 0, fights: 0 }, mega = islandById[megaTempleId];
    const reach = botId => { const s = new Set(); for (const id of botOwnedIslands[botId]) { const l = islandById[id].landmassId; s.add(l);
        for (const r of reachableLandmassIds[l] || []) if (landmassesConnected(l, r)) s.add(r); } return s; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const take = (botId, id) => { const isl = islandById[id]; clearIslandOwner(id); botOwnedIslands[botId].add(id);
        islandLevels[id] = Math.max(1, (islandLevels[id] || isl.neutralLevel || 1) - 1); islandTroops[id] = Math.round((isl.neutralTroops || 1000) * .5); botStat(botId, 'caps'); sum.caps++; };
    const power = botId => { let t = 0; for (const id of botOwnedIslands[botId]) t += islandTroops[id] || 0; return t * botAtkFactor(botById[botId], true); };
    for (let day = 0; day < Math.ceil(days); day++) {      // day by day, so the empires grow region by region
    const dd = Math.min(1, days - day);
    const bots = BOT_DEFS.filter(b => botOwnedIslands[b.id] && botOwnedIslands[b.id].size).sort(() => Math.random() - .5);
    for (const bot of bots) {                              // 1) spread out: the nearest free towers (and a border gate now and then) they can reach
        const st = BOT_STYLES[bot.style], want = Math.round(dd * (3 + (st.act || .65) * 8) * (.7 + Math.random() * .6));   // about 8 a day, like an active player
        const rs = reach(bot.id), home = islandById[botCapitalOf(bot.id)] || islandById[[...botOwnedIslands[bot.id]][0]], pw = power(bot.id);
        const big = i => i.type === 'gate' && (i.gateKind === 'border' || toCenter) || toCenter && i.type === 'temple';   // gates, and on the way in the temples and Wächter-Tempel
        const score = i => toCenter ? dist(i, mega) + dist(i, home) * .3 : dist(i, home);
        const free = [...rs].flatMap(l => islandsByLandmass[l] || []).filter(i => (i.type === 'tower' || big(i)) && !islandOwnerOf(i.id) && !bossAt(i.id)
            && (i.type === 'tower' || pw > (effectiveTroops(i) + effectiveDefense(i)) * 1.3)).sort((a, b) => score(a) - score(b));
        for (const i of free.slice(0, want)) { take(bot.id, i.id); if (i.type === 'gate') setGateSettings(i.id, { toll: .25, closed: false }); }
    }
    for (const bot of bots) {                              // 2) rivals: now and then the stronger neighbour takes a base
        const st = BOT_STYLES[bot.style], tries = Math.round(dd * (1 + (st.hunt || .5)) * Math.random() * 2);
        for (let n = 0; n < tries; n++) {
            const rs = reach(bot.id), home = islandById[botCapitalOf(bot.id)]; if (!home) break;
            let best = null, bd = Infinity;
            for (const l of rs) for (const i of islandsByLandmass[l] || []) { const o = islandOwnerOf(i.id); if (!o || o === 'player' || o === bot.id || i.type !== 'tower' || isCapital(i.id) || ownerShielded(o, now)) continue;
                const d = dist(i, home); if (d < bd) { bd = d; best = i; } }
            if (!best) break;
            const foe = islandOwnerOf(best.id); sum.fights++; botGrudge(foe, bot.id, 2);
            if (power(bot.id) > power(foe) * (.8 + Math.random() * .4)) { take(bot.id, best.id); sum.caps--; botStat(foe, 'lost'); botStat(bot.id, 'pvp'); }
            else botStat(foe, 'defs');
        }
    }
    }
    for (const bot of BOT_DEFS.filter(b => botOwnedIslands[b.id] && botOwnedIslands[b.id].size)) {   // 3) produce, build, level up, gear up
        const b = loadBotState()[bot.id], own = botOwnedIslands[bot.id]; if (!own.size) continue;
        const hp = hourProduction(bot.id), troops = hp.troops * hours * .5, per = Math.round(troops / own.size);   // half of it went into fights
        for (const id of own) islandTroops[id] = (islandTroops[id] || 0) + per;
        botCoins[bot.id] = (botCoins[bot.id] || 0) + Math.round(hp.coins * hours);
        const c = b.city; let busy = 0;
        for (const x of c.builds) x.endsAt = now; botCityFinish(bot, now);
        for (let n = 0; n < 200 && busy < hours * 3600000 * citySlots(c); n++) { botCityBuild(bot, now); if (!c.builds.length) break; for (const x of c.builds) { busy += x.endsAt - x.startedAt; x.endsAt = now; } botCityFinish(bot, now); }   // (two builders get twice as much done)
        for (let n = 0; n < 8; n++) botConsiderUpgrade(bot);
        addBotXp(bot.id, Math.round(hp.troops * hours * .25));
        for (let d = 1; d <= Math.floor(hours / 24); d++) { heroGrantShards(bot.id, HERO_SHARDS_DAY); if (d % 7 === 0) heroGrantShards(bot.id, HERO_SHARDS_CHAIN); }   // the days away: their daily shards
        b.gems += Math.round(hours * 15); b.wounded = 0;
        for (let n = 0; n < 6; n++) botShop(bot);
    }
    capitalCache = null; saveBotState(); refreshTerritory(); saveGame(); requestRender();
    sum.days = Math.round(days);
    return sum;
}

// bots: an idle bot sends a share of a big base to a field near it - free ones first, or one it can win
// ==============================================================================================================
// 9) FELDER UND ARMEEN IM FELD – sammeln, vereinen, umdenken, zuschlagen, deine Armeen angreifen
// ==============================================================================================================
function botGatherField(bot, freeOnly) {                 // freeOnly: under their own shield - no fights over a field
    if (fieldMarches.some(m => m.who === bot.id && !m.back) || resFields.some(f => fieldState[f.id] && fieldState[f.id].occ && fieldState[f.id].occ.who === bot.id)) return false;
    const own = botOwnedIslands[bot.id]; if (!own || !own.size) return false;
    const thr = botThreatened(bot.id); let base = null; for (const id of own) if (!thr.has(id) && (base === null || (islandTroops[id] || 0) > (islandTroops[base] || 0))) base = id;
    if (base === null) return false;
    const have = Math.floor((islandTroops[base] || 0) * .35); if (have < 300) return false;
    const kennt = botKennt(bot.id), b = islandById[base], reach = new Set((reachableLandmassIds[b.landmassId] || [b.landmassId]).filter(l => landmassesConnected(b.landmassId, l) && kennt.has(l)));
    let best = null, bd = Infinity;
    for (const f of resFields) { if (!reach.has(f.landmassId)) continue; const st = fieldInfo(f); if (st.left <= 0) continue;
        if (st.occ && (freeOnly || st.occ.who !== bot.id && ownerShielded(st.occ.who) || st.occ.troops * 1.3 > have)) continue;
        const d = Math.hypot(f.x - b.x, f.y - b.y) * (st.occ ? 2 : 1); if (d < bd) { bd = d; best = f; } }
    if (!best) return false;
    const gh = HEROES.find(h => heroOwned(bot.id, h.id) && !heroBusy(bot.id, h.id) && h.sk.some((x, k) => k && (x[2] === 'carry' || x[2] === 'gatherSpd' || x[2] === 'gatherDef') && heroSt(bot.id, h.id).sk[k]));   // a gatherer hero (Fenn, Otto) if one is free
    return fieldSend(bot.id, base, best.id, have, gh ? gh.id : null);
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
    const helpers = []; let pool = 0;
    const most = (BOT_STYLES[bot.style].gather || 8) * 4;                          // as many bases as the strike needs (the loop stops at enough) - the good ones call up more
    for (const id of strong) { if (pool >= need * 1.3 || helpers.length >= most) break;
        if (!botCanCross(bot.id, islandById[id].landmassId, pt.lm, Math.floor((islandTroops[id] || 0) * .9))) continue; helpers.push(id); pool += Math.floor((islandTroops[id] || 0) * .9); }
    if (pool < need * 1.1) return false;
    const a = { id: 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), who: bot.id, hero: botPickHero(bot.id, null, null, need), x: pt.x, y: pt.y, lm: pt.lm, troops: 0, homeId: helpers[0], mv: null, t: target.id, until: Date.now() + (helpers.length > 6 ? 12 : 8) * 60000 };
    armies.push(a); let sent = 0;
    for (const id of helpers) { const n = Math.floor((islandTroops[id] || 0) * .9); if (armySendFrom(a, id, n)) sent += n; }
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
            let sent = 0; for (const sv of helpers) { if (sent >= gap * 1.25 - others) break; const n = Math.floor((islandTroops[sv.id] || 0) * .9); if (armySendFrom(a, sv.id, n)) sent += n; }
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
        const ready = now + scoutSecs(pos, unknown, bot.id) * 1000; botLearn(bot.id, unknown.id, ready);
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
            return !armyMove(a, { kind: 'home', id: h, x: b.x, y: b.y, lm: b.landmassId }); };
        if (!t || botOwnedIslands[bot.id].has(t.id) || isCapital(t.id) || now > a.until || a.troops < BOT_MIN_GARRISON_TO_ATTACK || baseShieldedFor(t.id, bot.id) || botKeepsShield(bot, now)) return goHome();
        const boss = bossAt(t.id), it = boss ? { s: boss.troops + boss.defense } : botIntel(bot, t.id);
        if (!it) {                                                                   // no report yet: scout it from here first
            if (botScouting(bot, t.id)) continue;
            const ready = now + scoutSecs({ x: a.x, y: a.y, landmassId: a.lm }, t, bot.id) * 1000;
            botLearn(bot.id, t.id, ready);
            if (islandOwnerOf(t.id) === 'player') { const h = armyHome(a); if (h !== null && h !== undefined) botScoutVisible(bot, h, t.id, now, ready); }
            return true;
        }
        const st = botStyle(bot), margin = islandOwnerOf(t.id) === 'player' ? Math.max(1.25, st.margin) : st.margin, atk = (1 + (botMults(bot.id).attackPct + (a.hero && heroOwned(bot.id, a.hero) ? heroStats(bot.id, a.hero).atk : 0)) / 100) * titleMult(bot.id, 'attack');   // with the army's own hero
        if (a.troops * atk < it.s * margin * (boss ? .35 : 1)) {                     // too strong: a person doesn't just stand there
            if (botArmyRethink(bot, a, atk, it.s * margin, now)) return true;
            if (now > a.until - 3 * 60000) return goHome(); continue;                 // nothing to do about it: give up and go home
        }
        const canMarch = () => a.lm === t.landmassId || botCanCross(bot.id, a.lm, t.landmassId, a.troops, t.id);
        if (islandOwnerOf(t.id) === 'player' && it.ready && now - it.ready > 2 * 60000 && !botScouting(bot, t.id) && canMarch()) {   // one more look right before the strike
            const ready = now + scoutSecs({ x: a.x, y: a.y, landmassId: a.lm }, t, bot.id) * 1000; botLearn(bot.id, t.id, ready);
            const h = armyHome(a); if (h !== null && h !== undefined) botScoutVisible(bot, h, t.id, now, ready);
            return true;
        }
        if (armyMove(a, { kind: 'base', id: t.id, x: t.x, y: t.y, lm: t.landmassId })) { if (now > a.until - 3 * 60000) return goHome(); continue; }   // blocked (gate): give up in time
        if (islandOwnerOf(t.id) === 'player') { flashHint('Die Armee von ' + bot.name + ' marschiert auf ' + islandTitle(t) + '!', 4500); sfx('warn'); botRevengeLaunched(bot, t.id); }
        return true;
    }
    return false;
}

// bots: a bot whose base lies near a camped army notices it, waits a moment, and attacks if it clearly has more
function armyBotWatch(now) {
    if (playerShielded()) return;
    for (const a of armies) {
        if (armyWho(a) !== 'player' || a.mv || a.troops < 1 || armyRaids.some(r => r.armyId === a.id)) continue;
        if (a.seen) { const bot = botById[a.seen.bot], base = islandById[a.seen.base];
            if (now < a.seen.at + 15000) continue;
            a.seen = null;
            if (!bot || !base || islandOwnerOf(base.id) !== bot.id || !botOnline(bot, now) || ownerShielded(bot.id, now)) continue;
            const n = Math.floor((islandTroops[base.id] || 0) * .6); if (n < a.troops * 1.3) continue;
            const to = { x: a.x, y: a.y, landmassId: a.lm };
            islandTroops[base.id] -= n; armyRaids.push({ botId: bot.id, baseId: base.id, armyId: a.id, troops: n, tx: a.x, ty: a.y, lm: a.lm, startedAt: now, resolveAt: now + travelDurationSeconds(base, to, bot.id) * 1000 });
            flashHint(bot.name + ' greift deine Armee im Feld an!', 4000); sfx('warn'); requestRender(); continue; }
        if (Math.random() > .25) continue;
        let best = null, bd = Infinity;
        for (const bid in botOwnedIslands) { const own = botOwnedIslands[bid], bot = botById[bid]; if (!own || !bot || bot.mensch || !botOnline(bot, now) || ownerShielded(bid, now)) continue;
            for (const id of own) { const b = islandById[id], d = Math.hypot(b.x - a.x, b.y - a.y); if (d > ISLAND_RADIUS * 14 || d >= bd) continue;
                if ((islandTroops[id] || 0) * .6 < a.troops * 1.3 || !routeFor(b.landmassId, a.lm, bot.id)) continue; bd = d; best = { bot: bot.id, base: id }; } }
        if (best) { a.seen = { ...best, at: now }; flashHint(botById[best.bot].name + ' hat deine Armee entdeckt.', 3500); }
    }
}

function armyRaidArrive(r, now) {
    const a = armyById(r.armyId), bot = botById[r.botId], back = () => { if (botOwnedIslands[r.botId] && botOwnedIslands[r.botId].has(r.baseId)) islandTroops[r.baseId] = (islandTroops[r.baseId] || 0) + r.troops; };
    if (a && ownerShielded('player', Math.min(now, r.resolveAt || now))) { back(); flashHint('Dein Friedensschild hat den Angriff von ' + bot.name + ' auf deine Armee abgewehrt.', 4000); return; }   // the shield covers field armies too
    const p = a && armyPos(a, now);
    if (!a || Math.hypot(p.x - r.tx, p.y - r.ty) > ISLAND_RADIUS * 2) { back(); if (a) flashHint('Deine Armee ist ' + bot.name + ' ausgewichen.', 3000); return; }
    const dHx = heroFieldFx('player', a.hero, { defending: 1 });                     // your army's hero (Bollwerk, Zäh …) - a full rage fires now
    const def = a.troops, atk = r.troops, fb = fieldBattle(r.botId, atk, 'player', def, null, dHx), won = fb.won;
    const fg = fieldGold(r.botId, 'player', fb, null, dHx);
    goalBump(won ? r.botId : 'player', 'armyWins');
    if (won) { armies = armies.filter(x => x !== a); r.troops -= fb.aLoss; botHospitalTake(r.botId, fb.aLoss); back(); const w = fieldHurt('player', def, dHx);
        flashHint(bot.name + ' hat deine Armee im Feld geschlagen (' + fmtCompact(def) + ' Truppen)' + (w ? ', ' + fmtCompact(w) + ' ins Lazarett.' : '.'), 5000); }
    else { botHospitalTake(r.botId, atk); fieldHurt('player', fb.dLoss, dHx); a.troops -= fb.dLoss; if (a.troops < 1) armies = armies.filter(x => x !== a); r.troops = 0; statBump('defends'); flashHint('Deine Armee hat den Angriff von ' + bot.name + ' abgewehrt – ' + fmtCompact(a.troops) + ' stehen noch.', 4500); }
    addCombatLogEntry({ type: 'army', won: !won, attacker: bot.name, defender: 'Du', atk: fb.SA, def: fb.SD, gold: fg.d, hD: heroTag(dHx), hx: heroReportOf(dHx) });
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
    return barbSend(bot.id, base, 'c', pick.id, n, heroPickBest(bot.id, null, null, n));
}
function botDayBoss(bot) {                                // the daily boss: a few strikes a day with a share of their biggest free base
    const d = dbossEnsure(), due = Math.min(DBOSS_HITS, Math.ceil(DBOSS_HITS * (1 - msToMidnight() / 864e5)));   // spread over the day (strikes not made yet are caught up): the boss falls in the evening, not in the first hour
    if (!d || d.hp <= 0 || barbRec(bot.id).h >= due || barbOut(bot.id, 'b') || Math.random() < .5) return false;
    const base = botBarbBase(bot); if (base === null) return false;
    if (d.lm !== undefined && !botKennt(bot.id).has(d.lm)) return false;      // der Boss steht im Nebel
    const n = Math.floor((islandTroops[base] || 0) * (.15 + Math.random() * .2)); if (n < 1000) return false;
    return barbSend(bot.id, base, 'b', null, n, heroPickBest(bot.id, null, null, n));
}
