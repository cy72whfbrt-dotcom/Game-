// Teil 01d-helden-mitspieler.js: Helden-Daten (Seltenheit, Werte) und Herrscher der Meere
// ===== HELDEN: 20 heroes with a fixed rarity like the gear (1 grün · 2 blau · 3 lila · 4 gold). Shards unlock them, then
// quarter stars up to 5; 1 skill point per half star for 4 skills (1 active at full rage, 3 passive). Only in fights they lead.
const HEROES = [
    { id: 'brunhild', name: 'Brunhild', title: 'Schildmaid des Nordens', role: 'Verteidigung', r: 4, icon: 'shield', color: '#8a4f2c', c2: '#3b2a4a', hair: '#c9a15a', g: 'shield', base: [4, 8, 0],
      sk: [['Schildwall', 'In diesem Kampf {v} % weniger Verluste.', 'loss'], ['Eisenhaut', '{v} % weniger Verluste in jedem Kampf.', 'loss'], ['Bollwerk', '+{v} % Verteidigung ihrer Armee im Feld.', 'fieldDef'], ['Standhaft', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee']] },
    { id: 'ragna', name: 'Ragna', title: 'Seekönigin', role: 'Brücken & Tore', r: 4, icon: 'send', color: '#1f5f8a', c2: '#0f2f4a', hair: '#e0e0e0', g: 'weapon', base: [8, 3, 6],
      sk: [['Sturmflut', 'Greift sie über eine Brücke an: Verteidigung des Ziels −{v} %.', 'bridgeDef'], ['Seefahrerin', '+{v} % Marschtempo.', 'spd'], ['Gezeiten', '−{v} % Maut an fremden Toren.', 'toll'], ['Torbrecherin', '+{v} % Angriff gegen Tore.', 'gateAtk']] },
    { id: 'sigrun', name: 'Sigrun', title: 'Klinge des Südens', role: 'Angriff', r: 3, icon: 'attack', color: '#9b2f2f', c2: '#1f1f2f', hair: '#d8d0c0', g: 'weapon', base: [8, 0, 2],
      sk: [['Sturmangriff', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Klingenmeisterin', '+{v} % Angriff.', 'atk'], ['Blutrausch', 'Wut füllt sich um {v} % schneller.', 'rage'], ['Todesmut', '+{v} % Angriff gegen stärkere Gegner.', 'strongAtk']] },
    { id: 'aldric', name: 'Aldric', title: 'Meister der Belagerung', role: 'Tore & Tempel', r: 3, icon: 'castle', color: '#5b4a8a', c2: '#2b2b2b', hair: '#3a2a1a', g: 'weapon', base: [7, 2, 0],
      sk: [['Rammbock', 'Verteidigung von Tor oder Tempel −{v} % für diesen Angriff.', 'siegeDef'], ['Belagerer', '+{v} % Angriff gegen Tore und Tempel.', 'siegeAtk'], ['Pioniere', '−{v} % Maut an fremden Toren.', 'toll'], ['Mauerbrecher', 'Die Verteidigung einer Basis zählt {v} % weniger.', 'defCut']] },
    { id: 'kasimir', name: 'Kasimir', title: 'Gestürzter König', role: 'Thron', r: 3, icon: 'crown', color: '#6a2f5b', c2: '#2a1a2a', hair: '#2a1a1a', g: 'weapon', base: [6, 3, 0],
      sk: [['Königsruf', 'Im Kampf um die Mitte: +{v} % Angriff.', 'midAtk'], ['Thronsturm', '+{v} % Angriff gegen die Wächter-Tempel.', 'guardAtk'], ['Rache am Thron', '+{v} % Angriff gegen den Herrscher.', 'rulerAtk'], ['Altes Wissen', '{v} % weniger Verluste im Kampf um die Mitte.', 'midLoss']] },
    { id: 'yrsa', name: 'Yrsa', title: 'Tempelwächterin', role: 'Tempel', r: 3, icon: 'temple', color: '#4a6a4a', c2: '#2a3a2a', hair: '#b0602a', g: 'shield', base: [3, 7, 0],
      sk: [['Heilige Mauer', 'Greift sie einen Tempel an: {v} % weniger Verluste.', 'templeLoss'], ['Tempelgold', '+{v} % Münzen aus Kämpfen um Tempel.', 'templeGold'], ['Pilgerin', '+{v} % Angriff gegen Tempel.', 'templeAtk'], ['Segen', '+{v} % Verwundete statt Gefallene bei Tempelkämpfen.', 'templeHosp']] },
    { id: 'ida', name: 'Ida', title: 'Pfadfinderin', role: 'Tempo', r: 2, icon: 'boots', color: '#2f7a6a', c2: '#1f3a2f', hair: '#7a3a1a', g: 'weapon', base: [2, 2, 8],
      sk: [['Eilmarsch', 'Ihre Armee marschiert {v} % schneller.', 'spd'], ['Kartenkunde', '+{v} % Marschtempo.', 'spd'], ['Leichtfuß', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Rückweg', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'bernhard', name: 'Bernhard', title: 'Feldscher', role: 'Krankenhaus', r: 2, icon: 'plus', color: '#3d6b9b', c2: '#2a2a3a', hair: '#555', g: 'shield', base: [0, 6, 0],
      sk: [['Feldlazarett', '+{v} % der Gefallenen kommen ins Krankenhaus.', 'hosp'], ['Wundarzt', '{v} % weniger Verluste.', 'loss'], ['Sanitäter', 'Verliert er, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Feldküche', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'mira', name: 'Mira', title: 'Späherin', role: 'Späher', r: 2, icon: 'scout', color: '#6b7a2f', c2: '#2f3a1f', hair: '#1a1a1a', g: 'weapon', base: [2, 3, 4],
      sk: [['Adlerauge', '+{v} % Angriff gegen eine Basis, die du vorher ausgespäht hast.', 'scoutAtk'], ['Leise Sohlen', '+{v} % Marschtempo.', 'spd'], ['Spurlos', 'Die anderen bemerken ihren Angriff {v} % später.', 'late'], ['Fährtenleserin', '+{v} % Angriff gegen Armeen im Feld.', 'fieldAtk']] },
    { id: 'nora', name: 'Nora', title: 'Jägerin', role: 'Feldkampf', r: 2, icon: 'troops', color: '#4a5a8a', c2: '#20283a', hair: '#6a2a2a', g: 'weapon', base: [6, 2, 4],
      sk: [['Hinterhalt', 'Gegen Armeen im Feld: +{v} % Angriff.', 'fieldAtk'], ['Pirsch', '+{v} % Marschtempo im Feld.', 'fieldSpd'], ['Beute', '+{v} % Münzen aus Kämpfen im Feld.', 'fieldGold'], ['Zäh', '{v} % weniger Verluste im Feld.', 'fieldLoss']] },
    { id: 'fenn', name: 'Fenn', title: 'Goldsucher', role: 'Felder', r: 2, icon: 'coin', color: '#7a6a4a', c2: '#3a3020', hair: '#a07a3a', g: 'none', base: [2, 3, 3],
      sk: [['Goldrausch', 'Im Kampf um ein Feld: +{v} % Angriff.', 'resAtk'], ['Spürnase', 'Seine Sammler sind {v} % schneller.', 'gatherSpd'], ['Packesel', '+{v} % Traglast seiner Sammler.', 'carry'], ['Lagerwache', 'Seine Sammler verteidigen mit +{v} %.', 'gatherDef']] },
    { id: 'otto', name: 'Otto', title: 'Händler', role: 'Münzen', r: 1, icon: 'sell', color: '#8a7a2e', c2: '#3a2f1f', hair: '#8a6a3a', g: 'none', base: [3, 2, 0],
      sk: [['Beutezug', 'Dieser Kampf bringt +{v} % Münzen.', 'gold'], ['Feilschen', '+{v} % Münzen aus Kämpfen.', 'gold'], ['Lastträger', '+{v} % Traglast seiner Sammler.', 'carry'], ['Sparsam', '−{v} % Maut an fremden Toren.', 'toll']] },
    { id: 'greta', name: 'Greta', title: 'Kräuterfrau', role: 'Krankenhaus', r: 1, icon: 'plus', color: '#8a4a5b', c2: '#3a2030', hair: '#c0c0a0', g: 'none', base: [0, 6, 0],
      sk: [['Kräutersud', '+{v} % der Gefallenen kommen ins Krankenhaus.', 'hosp'], ['Salben', '{v} % weniger Verluste.', 'loss'], ['Hausmittel', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Wegzehrung', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'hagen', name: 'Hagen', title: 'Söldner', role: 'Angriff', r: 1, icon: 'weapon', color: '#5a5a5a', c2: '#2a2a2a', hair: '#3a3a3a', g: 'weapon', base: [8, 0, 2],
      sk: [['Wucht', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Söldner', '+{v} % Angriff.', 'atk'], ['Raufbold', '+{v} % Angriff gegen neutrale Basen.', 'neutralAtk'], ['Hartgesotten', '{v} % weniger Verluste.', 'loss']] },
    // Paket E: 6 neue Helden – jeder mit kurzer Geschichte (story) und einem Partner aus HERO_PAIRS
    { id: 'wolfram', name: 'Wolfram', title: 'Eiserner Marschall', role: 'Armeen', r: 4, icon: 'troops', color: '#4a5560', c2: '#1e2228', hair: '#9a9a9a', g: 'weapon', base: [6, 6, 3],
      story: 'Er führte einst das Heer von König Kasimir. Als der Thron fiel, blieb er als Einziger an der Seite seines Königs.',
      sk: [['Kesselschlacht', 'Gegen Armeen im Feld: in diesem Kampf +{v} % Angriff.', 'fieldAtk'], ['Heerführer', '{v} % weniger Verluste im Feld.', 'fieldLoss'], ['Feldlager', '+{v} % Verteidigung seiner Armee im Feld.', 'fieldDef'], ['Gewaltmarsch', '+{v} % Marschtempo im Feld.', 'fieldSpd']] },
    { id: 'thora', name: 'Thora', title: 'Sturmreiterin', role: 'Überfall', r: 3, icon: 'boots', color: '#3a6e8f', c2: '#1a2a3a', hair: '#e8c070', g: 'weapon', base: [6, 1, 6],
      story: 'Zehn Jahre stand sie als Steuerfrau auf Ragnas Flaggschiff. Heute jagt sie ihre Reiter so schnell über das Land wie früher das Schiff durch den Sturm.',
      sk: [['Überrumpeln', 'Die Verteidigung des Ziels zählt in diesem Angriff {v} % weniger.', 'defCut'], ['Sturmwind', '+{v} % Marschtempo.', 'spd'], ['Im Morgengrauen', 'Die anderen bemerken ihren Angriff {v} % später.', 'late'], ['Abdrehen', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'eskil', name: 'Eskil', title: 'Runenschmied', role: 'Krankenhaus & Wut', r: 3, icon: 'temple', color: '#5a4a7a', c2: '#221a30', hair: '#c8b8a0', g: 'shield', base: [2, 7, 0],
      story: 'Er hat die alten Runen in die Mauern der Tempel gemeißelt. Yrsa sagt, ohne seine Zeichen wären die Steine längst gefallen.',
      sk: [['Runenheilung', 'In diesem Kampf +{v} % der Gefallenen ins Krankenhaus.', 'hosp'], ['Schutzrune', '{v} % weniger Verluste.', 'loss'], ['Zornrune', 'Wut füllt sich um {v} % schneller.', 'rage'], ['Fluchtrune', 'Verliert er, fliehen {v} % mehr Truppen zurück.', 'flee']] },
    { id: 'lene', name: 'Lene', title: 'Fährfrau', role: 'Brücken', r: 2, icon: 'send', color: '#2f6a7a', c2: '#18303a', hair: '#5a3a2a', g: 'none', base: [3, 3, 6],
      story: 'Sie kennt jede Furt und jede Brücke zwischen den Inseln. Ida bringt die Truppen bis ans Ufer – Lene bringt sie hinüber.',
      sk: [['Fährmannslist', 'Greift sie über eine Brücke an: Verteidigung des Ziels −{v} %.', 'bridgeDef'], ['Strömung', '+{v} % Marschtempo.', 'spd'], ['Fährgeld', '−{v} % Maut an fremden Toren.', 'toll'], ['Zurück ans Ufer', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'bruno', name: 'Bruno', title: 'Bärenringer', role: 'Angriff', r: 2, icon: 'weapon', color: '#6a4a2a', c2: '#2a1e14', hair: '#4a2a1a', g: 'weapon', base: [7, 3, 1],
      story: 'Auf jedem Jahrmarkt rang er mit Bären, bis Hagen ihn zum Söldner machte. Seitdem prügeln sich die beiden durch jede Hafenkneipe – meistens Seite an Seite.',
      sk: [['Bärenkraft', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Ringer', '+{v} % Angriff gegen neutrale Basen.', 'neutralAtk'], ['Dickes Fell', '{v} % weniger Verluste.', 'loss'], ['Zechpreller', '+{v} % Münzen aus Kämpfen.', 'gold']] },
    { id: 'pia', name: 'Pia', title: 'Perlentaucherin', role: 'Sammeln', r: 1, icon: 'coin', color: '#3a7a8a', c2: '#183038', hair: '#2a2a3a', g: 'none', base: [2, 2, 3],
      story: 'Sie taucht nach Perlen, wo andere nur Wasser sehen. Mit Fenn teilt sie jeden Fund – er sucht im Fels, sie im Meer.',
      sk: [['Großer Fang', 'Dieser Kampf bringt +{v} % Münzen.', 'gold'], ['Flinke Hände', 'Ihre Sammler sind {v} % schneller.', 'gatherSpd'], ['Tiefe Taschen', '+{v} % Traglast ihrer Sammler.', 'carry'], ['Strandwache', 'Ihre Sammler verteidigen mit +{v} %.', 'gatherDef']] }
];
// Paket E: zwei Helden pro Marsch. Der Zweitheld gibt seine Werte und passiven Fähigkeiten zu 50 % (die Wut-Fähigkeit zündet nur
// beim Haupthelden), ein passendes Paar gibt +10 % auf alle Heldenwerte des Marsches. Jeder Held steht in höchstens einem Paar.
const HERO_ZWEIT = .5, HERO_PAIR_BONUS = 10;
const HERO_PAIRS = [
    { a: 'kasimir', b: 'wolfram', name: 'Die alte Garde', story: 'König und Marschall: Der Thron fiel, die Treue blieb.' },
    { a: 'ragna', b: 'thora', name: 'Wind und Welle', story: 'Die Seekönigin und ihre alte Steuerfrau lesen einander jeden Sturm vom Gesicht ab.' },
    { a: 'yrsa', b: 'eskil', name: 'Hüter der Runen', story: 'Sie bewacht die Tempel, er hat ihre Mauern mit Runen geschützt.' },
    { a: 'ida', b: 'lene', name: 'Pfad und Furt', story: 'Ida findet den Weg zum Ufer, Lene den Weg hinüber.' },
    { a: 'hagen', b: 'bruno', name: 'Raufbrüder', story: 'Zwei Söldner, eine Kneipe, noch nie verloren.' },
    { a: 'fenn', b: 'pia', name: 'Fels und Meer', story: 'Fenn sucht Gold im Fels, Pia Perlen im Meer – geteilt wird jeder Fund.' }
];
function heroPairOf(a, b) { return a && b ? HERO_PAIRS.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a)) || null : null; }
function heroPartner(id) { const p = HERO_PAIRS.find(x => x.a === id || x.b === id); return p ? { pair: p, id: p.a === id ? p.b : p.a } : null; }
// rarity rule: in the same role rarer is always stronger. a/p = active/passive value at skill level 5, st = the stat multiplier
const HERO_TIER = { 1: { a: 15, p: 5, st: 1 }, 2: { a: 20, p: 8, st: 1.6 }, 3: { a: 30, p: 12, st: 2.4 }, 4: { a: 40, p: 15, st: 3.2 } };
const HERO_UNLOCK = { 1: 10, 2: 20, 3: 40, 4: 80 }, HERO_START_SHARDS = { 1: 10, 2: 8, 3: 6, 4: 4 };   // shards to unlock · everyone's starter shards
const HERO_MAXQ = 20, HERO_RAGE = 25, HERO_RESET_GEMS = 200, HERO_HALL_GEF = 3;
const HERO_SHARDS_WANDER = 25, HERO_SHARDS_DAY = 5, HERO_SHARDS_CHAIN = 30;   // where shards come from (and the hero chests in the shop)
const HERO_CHESTS = [{ id: 'hc1', name: 'Heldenkiste', gems: 150, sh: 6, n: 1, minR: 1, txt: '6 Splitter' }, { id: 'hc3', name: 'Große Kiste', gems: 500, sh: 8, n: 3, minR: 1, txt: '3 × 8 Splitter' },
    { id: 'hcE', name: 'Epische Kiste', gems: 1200, sh: 30, n: 1, minR: 3, txt: '30 Splitter · Episch+' }];   // gems per shard: 25 / 21 / 40 (only Episch or Legendär)                // 5 stars in quarters · rage per fight · reset price · +3 % Gefolge per hall level
const botById = {};
for (const bot of BOT_DEFS) botById[bot.id] = bot;

// Every bot's bases, plus an index base → bot kept in step with them, so "who owns this?" is one lookup, not 60.
const botOwnerIndex = new Map();
class BotBaseSet extends Set {
    constructor(owner, items) { super(); this.owner = owner; for (const id of items || []) this.add(id); }
    add(id) { if (!this.has(id)) ownVer++; botOwnerIndex.set(id, this.owner); return super.add(id); }
    delete(id) { if (botOwnerIndex.get(id) === this.owner) botOwnerIndex.delete(id); const r = super.delete(id); if (r) ownVer++; return r; }
    clear() { for (const id of this) if (botOwnerIndex.get(id) === this.owner) botOwnerIndex.delete(id); if (this.size) ownVer++; super.clear(); }
}
let botOwnedIslands, botBesitzRoh = null;                              // botBesitzRoh: der gespeicherte Besitz (null = ganz frische Welt)
try {
    const raw = botBesitzRoh = JSON.parse(store.get('openWaterBotOwnedIslands'));
    botOwnedIslands = {};
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id] = new BotBaseSet(bot.id, raw && raw[bot.id] || []);
} catch (e) {
    botOwnedIslands = {};
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id] = new BotBaseSet(bot.id);
}
let botCoins;
try {
    botCoins = JSON.parse(store.get('openWaterBotCoins')) || {};
} catch (e) {
    botCoins = {};
}
for (const bot of BOT_DEFS) if (!botCoins[bot.id]) botCoins[bot.id] = 0;

// Gives every bot that doesn't already own a base one starting base,
// each on a different outer landmass so they begin spread out
// rather than clustered together or on the player's own home
// landmass. Runs per-bot (not just on a fully fresh game) so a bot
// added to BOT_DEFS later, on top of an existing save where the
// earlier bots already have territory, still gets seeded in.
// Nur der Weltrechner verteilt (Handys bekommen den Besitz von ihm), und nur an Mitspieler, die noch nie
// eine Basis hatten: wer ausgeschieden ist, kommt über botRespawn zurück (Wartezeit, Schild …), auch nach einem Neustart.
if (rechnet()) {
    // every bot starts on one of the start places in Zone 1 – reihum je Gebiet (gleich viele je Gebiet), never on the player's
    const usedTowerIds = new Set([playerIslandId]);
    for (const bot of BOT_DEFS) for (const id of botOwnedIslands[bot.id]) usedTowerIds.add(id);
    for (const id of ownedIslands) usedTowerIds.add(id);
    const home = islandById[playerIslandId], slots = startplaetzeReihum().filter(i => !usedTowerIds.has(i.id));
    let stand = {}; try { stand = JSON.parse(store.get('openWaterBotState')) || {}; } catch (e) {}
    const raus = bot => !!((botBesitzRoh && Array.isArray(botBesitzRoh[bot.id])) || (stand[bot.id] && stand[bot.id].outAt));   // hatte schon Basen (ausgeschieden)
    BOT_DEFS.forEach((bot, i) => {
        if (bot.mensch || botOwnedIslands[bot.id].size > 0 || raus(bot)) return;      // echte Spieler bekommen ihren Platz vom Weltrechner
        const tower = slots[i % slots.length];
        if (!tower || usedTowerIds.has(tower.id)) return;
        botOwnedIslands[bot.id].add(tower.id);
        islandLevels[tower.id] = 1;
        islandTroops[tower.id] = PLAYER_START_TROOPS;     // Start-Truppen wie jeder neue Spieler (Alexander 6.10.: Mitspieler gleich)
        usedTowerIds.add(tower.id);
    });
    // more players than start places: the rest start on a free outer base, as far as possible from everyone else
    const late = BOT_DEFS.filter(bot => !bot.mensch && botOwnedIslands[bot.id].size === 0 && !raus(bot));
    if (late.length) {
        const taken = [...usedTowerIds].map(id => islandById[id]).filter(Boolean);
        for (const bot of BOT_DEFS) { let k = 0; for (const id of botOwnedIslands[bot.id]) { if (k++ % 25 === 0) taken.push(islandById[id]); } }   // a sample of every empire is enough
        const pool = islands.filter(i => i.type === 'tower' && !usedTowerIds.has(i.id) && !islandOwnerOf(i.id) && landmasses[i.landmassId].zone <= 2 && i.landmassId !== home.landmassId);
        const rnd = mulberry32(4242);
        for (const bot of late) {
            let best = null, bestD = -1;
            for (let k = 0; k < 250 && pool.length; k++) {
                const c = pool[Math.floor(rnd() * pool.length)]; if (usedTowerIds.has(c.id)) continue;
                let dmin = Infinity; for (const t of taken) { const dd = (t.x - c.x) ** 2 + (t.y - c.y) ** 2; if (dd < dmin) dmin = dd; }
                if (dmin > bestD) { bestD = dmin; best = c; }
            }
            if (!best) break;
            botOwnedIslands[bot.id].add(best.id); islandLevels[best.id] = 1; islandTroops[best.id] = PLAYER_START_TROOPS; usedTowerIds.add(best.id); taken.push(best);
        }
    }
}

// Who owns a given island right now: 'player', a bot id, or null
// for neutral. Player ownership always wins the check since a
// capture always removes the island from whichever set it used to
// be in first.
function islandOwnerOf(islandId) {
    if (ownedIslands.has(islandId)) return 'player';
    return botOwnerIndex.get(islandId) || null;
}
// Actual troops/defense a target currently has, regardless of who
// (if anyone) owns it - neutral islands use their fixed generated
// stats, an owned island uses its real garrison and level.
// ===== HERRSCHER DER MEERE =====
// Whoever holds the Mega-Tempel on the Thron-Insel rules: a crown on every nameplate,
// +25 % coins and troops on all bases, and the title "Herrscher der Meere".
const RULER_BONUS = 1.25;
const megaTempleId = (islands.find(i => i.type === 'megaTemple') || {}).id;
function rulerOwner() { return megaTempleId === undefined ? null : islandOwnerOf(megaTempleId); }
