// Teil 01-spieler.js: Mitspieler: Gruppen (wie jemand spielt), Namen, Farben
// ===== bots.js – alles, was die anderen Spieler (Mitspieler) denken und tun =====
// Geladen vor spiel.js. Hier stehen nur Tabellen und Funktionen: nichts davon läuft beim Laden
// schon los (bis auf das Sortieren der Gruppen), alles andere ruft das Spiel später auf.
// Kapitel: 1) Gruppen  2) Spieler  3) wie sie die Karte lesen  4) Angreifen, Spähen, Sammeln  5) Stand, Stadt, Helden,
// Ausrüstung  6) Verteidigen, Schild, Hauptstadt  7) Titel, Takt  8) Aussehen, Thron-Shop  9) Felder und Armeen
// Der Spielstand der Mitspieler (wem welche Basis gehört, Münzen) kommt als Teil der EINEN Welt vom Server (welt.js).
var AUF = null;                                         // Paket D „Aufbau“ (aufbau.js, nach spiel.js geladen): Burg, Rohstoffe, Forschung, Truppen-Stufen, Marsch-Plätze

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
if (typeof window !== 'undefined' && window.TEST_EIN_BOT) BOT_DEFS.splice(1);   // (nur die Test-Vorschau: ein einziger Mitspieler auf der ganzen Karte)

// ==============================================================================================================
//    Wege: kommen Truppen durch (Tor, Maut)?
// ==============================================================================================================
function botCanCross(who, a, b, n, targetId) {   // can n troops of a bot really get from region a into region b? (route + the last gate open and affordable)
    const r = routeFor(a, b, who); if (!r) return false; if (r.length < 2) return true;
    const t = tollFor(r[r.length - 2], r[r.length - 1], n, who, targetId);
    return !t.closed && (botCoins[who] || 0) >= t.cost;
}

const BOT_BUILDINGS = ['academy', 'forge', 'hospital', 'wall', 'heroes', 'embassy', 'market', 'lumber', 'quarry', 'mine'];   // the city buildings with an effect
const BOT_MIN_AUSNAHME = ['embassy', 'market'];   // zählen nicht für „alle Gebäude Stufe …“ (Erfolge) – wie bei dir

const BOT_SKILLS = ['troops', 'attack', 'defense', 'speed', 'attackGold', 'defenseGold'];

