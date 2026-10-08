// Teil 05c-profil-erfolge-rangliste.js: Erfolge, Profil antippen, Rangliste
// ===== ERFOLGE: badges for what you've done, each with gems to collect (only gems - the look is bought, not earned) =====
let playerStats = (() => { try { return JSON.parse(store.get('openWaterStats')) || {}; } catch (e) { return {}; } })();
if (!playerStats.seeded) { playerStats.captures = Math.max(playerStats.captures || 0, Math.max(0, ownedIslands.size - 1)); playerStats.seeded = 1; store.set('openWaterStats', JSON.stringify(playerStats)); }   // an existing empire: its bases count as conquered
let achClaimed = (() => { try { return JSON.parse(store.get('openWaterAch')) || {}; } catch (e) { return {}; } })();
// Kriegsbericht: what happened each day, kept for a week (the Willkommen-zurück summary covers the time away)
let warDays = (() => { try { return JSON.parse(store.get('openWaterWarDays')) || {}; } catch (e) { return {}; } })();
function warStat(k, n, foe) {
    const d = todayKey(), w = warDays[d] || (warDays[d] = { by: {} });
    w[k] = (w[k] || 0) + (n === undefined ? 1 : n);
    if (foe) w.by[foe] = (w.by[foe] || 0) + 1;
    const keys = Object.keys(warDays).sort(); while (keys.length > 8) delete warDays[keys.shift()];
    store.set('openWaterWarDays', JSON.stringify(warDays));
}
function statBump(k, n) { playerStats[k] = (playerStats[k] || 0) + (n || 1); store.set('openWaterStats', JSON.stringify(playerStats)); achCheckSoon(); passBump(k, n); questStat(k, n); }
function goalBump(who, k, n) { if (!who) return; if (who === 'player') { try { statBump(k, n); } catch (e) {} } else if (botById[who]) botStat(who, k, n); }   // a counter for the Erfolge - yours or anyone else's
const achStat = k => playerStats[k] || 0;
const cityMinLevel = () => { const c = loadCity(); return Math.min(...CITY_BUILDINGS.filter(b => !['embassy', 'market'].includes(b.id)).map(b => c.levels[b.id] || 0)); };   // (the newer Lager doesn't count: nothing earned is lost)
const pvpWins = () => achStat('pvpWins') + achStat('emmaWins');   // (old saves counted only one player in emmaWins, frozen now - the two never overlap; ids stay so claims are kept)
// the same numbers for everyone (the other players' side: botGoalVal in botlogik.js)
const whoIslands = who => who === 'player' ? ownedIslands : botOwnedIslands[who] || new Set();
function goalBaseTop(who) { let L = 0; for (const id of whoIslands(who)) L = Math.max(L, islandLevels[id] || 1); return L; }
function goalGates(who) { let n = 0; for (const id of whoIslands(who)) if (islandById[id] && islandById[id].type === 'gate') n++; return n; }
const goalHeroes = who => HEROES.filter(h => heroOwned(who, h.id)).length;
const goalHeroStars = who => Math.floor(Math.max(0, ...HEROES.map(h => { const s = heroSt(who, h.id); return s && s.own ? s.q : 0; })) / 4);   // the best hero's whole stars
const GOAL_VAL = {
    captures: () => achStat('captures'), empire: () => ownedIslands.size, defends: () => achStat('defends'), pvp: pvpWins, bosses: () => achStat('bosses'),
    temples: () => achStat('temples'), throne: () => achStat('throne'), throneMin: () => achStat('throneMin'), throneEarned: () => throneState.earned || 0, scouts: () => achStat('scouts'),
    cityMin: cityMinLevel, baseTop: () => goalBaseTop('player'), gates: () => goalGates('player'), tolls: () => achStat('tolls'), tollCoins: () => achStat('tollCoins'),
    armyWins: () => achStat('armyWins'), heroes: () => goalHeroes('player'), heroStars: () => goalHeroStars('player'), heroFires: () => achStat('heroFires'),
    healed: () => achStat('healed'), shields: () => achStat('shields'), teleports: () => achStat('teleports'), barb: () => achStat('barb'), dboss: () => achStat('dboss'),
    burg: () => AUF ? AUF.burgStufe('player') : 1, foStufen: () => AUF ? AUF.foSumme('player') : 0,
    saisonTop: () => (look.titles || []).filter(saisonTitel).length   // Hauptstadt (Burg, Labor), Saison-Platz (die besten 10)
};
const foGesamtZiel = () => AUF ? AUF.foGesamt() : 95;   // „alles erforscht“ – wächst mit, wenn neue Forschungen dazukommen
const ACHIEVEMENTS = [   // the old ids stay (claims are kept); the tiers of one kind share k
    { id: 'cap1',    name: 'Erste Eroberung',  icon: 'flag',    desc: 'Erobere deine erste Basis.',             goal: 1,    k: 'captures', gems: 20 },
    { id: 'cap10',   name: 'Landnahme',        icon: 'flag',    desc: 'Erobere 10 Basen.',                      goal: 10,   k: 'captures', gems: 50 },
    { id: 'cap100',  name: 'Eroberer',         icon: 'flag',    desc: 'Erobere 100 Basen.',                     goal: 100,  k: 'captures', gems: 300 },
    { id: 'cap500',  name: 'Feldherr',         icon: 'flag',    desc: 'Erobere 500 Basen.',                     goal: 500,  k: 'captures', gems: 600 },
    { id: 'cap1000', name: 'Kriegsherr',       icon: 'flag',    desc: 'Erobere 1.000 Basen.',                   goal: 1000, k: 'captures', gems: 1500 },
    { id: 'emp50',   name: 'Weites Reich',     icon: 'home',    desc: 'Halte 50 Basen gleichzeitig.',           goal: 50,   k: 'empire', gems: 300 },
    { id: 'emp150',  name: 'Großreich',        icon: 'home',    desc: 'Halte 100 Basen gleichzeitig.',          goal: 100,  k: 'empire', gems: 800 },   // (6.10.: vorher 150 – in einer Saison von 8 Wochen kaum zu schaffen)
    { id: 'def25',   name: 'Standhaft',        icon: 'shield',  desc: 'Wehre 25 Angriffe ab.',                  goal: 25,   k: 'defends', gems: 250 },
    { id: 'def100',  name: 'Unbezwingbar',     icon: 'shield',  desc: 'Wehre 100 Angriffe ab.',                 goal: 100,  k: 'defends', gems: 500 },
    { id: 'emma1',   name: 'Kräftemessen',     icon: 'attack',  desc: 'Erobere eine Basis eines anderen Spielers.', goal: 1,  k: 'pvp', gems: 100 },
    { id: 'emma10',  name: 'Gefürchtet',       icon: 'attack',  desc: 'Erobere 10 Basen von anderen Spielern.', goal: 10,   k: 'pvp', gems: 500 },
    { id: 'pvp50',   name: 'Schrecken der Meere', icon: 'attack', desc: 'Erobere 50 Basen von anderen Spielern.', goal: 50, k: 'pvp', gems: 1000 },
    { id: 'boss1',   name: 'Bezwinger',        icon: 'attack',  desc: 'Besiege den Kriegsherrn (Wanderboss).', goal: 1,   k: 'bosses', gems: 250 },
    { id: 'boss10',  name: 'Bossjäger',        icon: 'attack',  desc: 'Besiege 10-mal den Kriegsherrn.',        goal: 10,   k: 'bosses', gems: 500 },
    { id: 'temple1', name: 'Tempelherr',       icon: 'temple',  desc: 'Erobere einen Tempel.',                  goal: 1,    k: 'temples', gems: 100 },
    { id: 'temple10', name: 'Tempelwächter',   icon: 'temple',  desc: 'Erobere 10 Tempel.',                     goal: 10,   k: 'temples', gems: 300 },
    { id: 'throne',  name: 'Herrscher der Meere', icon: 'crown', desc: 'Halte den Thron in der Mitte.',        goal: 1,    k: 'throne', gems: 1500 },
    { id: 'thr60',   name: 'Thronwache',       icon: 'crown',   desc: 'Halte den Thron 60 Minuten lang.',       goal: 60,   k: 'throneMin', gems: 200 },
    { id: 'thr600',  name: 'Langer Atem',      icon: 'crown',   desc: 'Halte den Thron 10 Stunden lang.',       goal: 600,  k: 'throneMin', gems: 700 },
    { id: 'tp1k',    name: 'Thron-Sammler',    icon: 'points',  desc: 'Verdiene 1.000 Thron-Punkte.',           goal: 1000, k: 'throneEarned', gems: 100 },
    { id: 'tp10k',   name: 'Thron-Schatz',     icon: 'points',  desc: 'Verdiene 10.000 Thron-Punkte.',          goal: 10000, k: 'throneEarned', gems: 500 },
    { id: 'scout50', name: 'Späher',           icon: 'scout',   desc: 'Späh 50 Mal.',                           goal: 50,   k: 'scouts', gems: 50 },
    { id: 'scout250', name: 'Kundschafter',    icon: 'scout',   desc: 'Späh 250 Mal.',                          goal: 250,  k: 'scouts', gems: 200 },
    { id: 'city5',   name: 'Baumeister',       icon: 'upgrade', desc: 'Bring alle Gebäude der Stadt auf Stufe 5.', goal: 5, k: 'cityMin', gems: 400 },
    { id: 'base25',  name: 'Festung',          icon: 'castle',  desc: 'Bau eine Basis auf Stufe 25 aus.',       goal: 25,   k: 'baseTop', gems: 100 },
    { id: 'base50',  name: 'Bollwerk',         icon: 'castle',  desc: 'Bau eine Basis auf Stufe 50 aus.',       goal: 50,   k: 'baseTop', gems: 300 },
    { id: 'base100', name: 'Himmelsfeste',     icon: 'castle',  desc: 'Bau eine Basis auf Stufe 100 aus.',      goal: 100,  k: 'baseTop', gems: 1000 },
    { id: 'gate1',   name: 'Torhüter',         icon: 'lock',    desc: 'Halte ein Tor.',                         goal: 1,    k: 'gates', gems: 50 },
    { id: 'gate3',   name: 'Herr der Brücken', icon: 'lock',    desc: 'Halte 3 Tore gleichzeitig.',             goal: 3,    k: 'gates', gems: 250 },
    { id: 'toll10',  name: 'Brückengänger',    icon: 'coin',    desc: 'Zahl 10 Mal Maut an einem Tor.',         goal: 10,   k: 'tolls', gems: 40 },
    { id: 'tollin',  name: 'Zöllner',          icon: 'coin',    desc: 'Nimm ' + fmtNum(niceRound(wirtM(1e5))) + ' Münzen Maut ein.', goal: niceRound(wirtM(1e5)), k: 'tollCoins', gems: 300 },   // (Maut und Krankenhaus-Platz × WIRTSCHAFT_KOSTEN – die Ziele mit)
    { id: 'army5',   name: 'Feldschlacht',     icon: 'troops',  desc: 'Gewinn 5 Kämpfe mit Armeen im Feld.',    goal: 5,    k: 'armyWins', gems: 80 },
    { id: 'army50',  name: 'Heerführer',       icon: 'troops',  desc: 'Gewinn 50 Kämpfe mit Armeen im Feld.',   goal: 50,   k: 'armyWins', gems: 400 },
    { id: 'hero1',   name: 'Erster Held',      icon: 'profile', desc: 'Schalte einen Helden frei.',             goal: 1,    k: 'heroes', gems: 30 },
    { id: 'hero4',   name: 'Heldenrunde',      icon: 'profile', desc: 'Schalte 4 Helden frei.',                 goal: 4,    k: 'heroes', gems: 150 },
    { id: 'heroall', name: 'Heldensaal',       icon: 'profile', desc: 'Schalte alle ' + HEROES.length + ' Helden frei.', goal: HEROES.length, k: 'heroes', gems: 800 },
    { id: 'star3',   name: 'Aufsteiger',       icon: 'star',    desc: 'Bring einen Helden auf 3 Sterne.',       goal: 3,    k: 'heroStars', gems: 150 },
    { id: 'star5',   name: 'Sternenheld',      icon: 'star',    desc: 'Bring einen Helden auf 5 Sterne.',       goal: 5,    k: 'heroStars', gems: 600 },
    { id: 'fire10',  name: 'Kampfrausch',      icon: 'level',   desc: 'Lass Helden 10 Mal ihre Fähigkeit zünden.', goal: 10, k: 'heroFires', gems: 80 },
    { id: 'fire100', name: 'Heldensturm',      icon: 'level',   desc: 'Lass Helden 100 Mal ihre Fähigkeit zünden.', goal: 100, k: 'heroFires', gems: 400 },
    { id: 'heal10k', name: 'Feldscher',        icon: 'plus',    desc: 'Heil ' + fmtNum(wirtK(1e4)) + ' Verwundete im Krankenhaus.', goal: wirtK(1e4), k: 'healed', gems: 60 },
    { id: 'heal1m',  name: 'Heiler der Meere', icon: 'plus',    desc: 'Heil ' + fmtNum(wirtK(1e6)) + ' Verwundete im Krankenhaus.', goal: wirtK(1e6), k: 'healed', gems: 500 },
    { id: 'shield1', name: 'Schutzschild',     icon: 'shield',  desc: 'Setz einen Friedensschild ein.',         goal: 1,    k: 'shields', gems: 20 },
    { id: 'shield10', name: 'Vorsichtig',      icon: 'shield',  desc: 'Setz 10 Friedensschilde ein.',           goal: 10,   k: 'shields', gems: 150 },
    { id: 'tele1',   name: 'Umzug',            icon: 'home',    desc: 'Verlege deine Hauptstadt.',              goal: 1,    k: 'teleports', gems: 30 },
    { id: 'tele10',  name: 'Nomade',           icon: 'home',    desc: 'Verlege deine Hauptstadt 10 Mal.',       goal: 10,   k: 'teleports', gems: 200 },
    { id: 'barb25',  name: 'Barbarenschreck',  icon: 'attack',  desc: 'Besiege 25 Barbaren-Lager.',             goal: 25,   k: 'barb', gems: 100 },
    { id: 'barb250', name: 'Lagerstürmer',     icon: 'attack',  desc: 'Besiege 250 Barbaren-Lager.',            goal: 250,  k: 'barb', gems: 500 },
    { id: 'dboss5',  name: 'Bossbrecher',      icon: 'crown',   desc: 'Kämpf bei 5 gefallenen Tagesbossen mit.', goal: 5,   k: 'dboss', gems: 300 },
    // Hauptstadt (6.10.): die Burg wächst über viele Saisons (Burg 25 ≈ ein Jahr), das Labor genauso – die hohen sind Langzeit-Ziele
    { id: 'burg5',   name: 'Burgvogt',         icon: 'castle',  desc: 'Bring deine Burg auf Stufe 5.',          goal: 5,    k: 'burg', gems: 150 },
    { id: 'burg10',  name: 'Burgherr',         icon: 'castle',  desc: 'Bring deine Burg auf Stufe 10.',         goal: 10,   k: 'burg', gems: 400 },
    { id: 'burg15',  name: 'Schlossherr',      icon: 'castle',  desc: 'Bring deine Burg auf Stufe 15.',         goal: 15,   k: 'burg', gems: 800 },
    { id: 'burg20',  name: 'Landesfürst',      icon: 'castle',  desc: 'Bring deine Burg auf Stufe 20.',         goal: 20,   k: 'burg', gems: 1500 },
    { id: 'burg25',  name: 'König der Meere',  icon: 'castle',  desc: 'Bring deine Burg auf Stufe 25 – die höchste.', goal: 25, k: 'burg', gems: 3000 },
    { id: 'fo10',    name: 'Forscher',         icon: 'flask',   desc: 'Erforsche 10 Stufen im Labor.',          goal: 10,   k: 'foStufen', gems: 100 },
    { id: 'fo50',    name: 'Gelehrter',        icon: 'flask',   desc: 'Erforsche 50 Stufen im Labor.',          goal: 50,   k: 'foStufen', gems: 400 },
    { id: 'foall',   name: 'Meister des Wissens', icon: 'flask', desc: 'Erforsche alles im Labor.',             get goal() { return foGesamtZiel(); }, k: 'foStufen', gems: 2000 },
    { id: 'saison1', name: 'Saison-Held',      icon: 'crown',   desc: 'Komm am Ende einer Welt-Saison unter die besten 10.', goal: 1, k: 'saisonTop', gems: 1000 },
    { id: 'saison3', name: 'Legende',          icon: 'crown',   desc: 'Komm in 3 Welt-Saisons unter die besten 10.', goal: 3, k: 'saisonTop', gems: 2500 },
];
for (const a of ACHIEVEMENTS) a.gems = Math.max(5, Math.round(a.gems / 25) * 5);   // (2.10.) 5× weniger Gems – zusammen vorher ~18.000, das gab Gold-Ausrüstung in Stunden
const achVal = a => GOAL_VAL[a.k]();
const achDone = a => achVal(a) >= a.goal;
function achClaimable() { return ACHIEVEMENTS.filter(a => !achClaimed[a.id] && achDone(a)); }
// Erfolge gave titles before: what you had reached then stays yours (noted once), nothing new comes from them
var achLookSet = null;
function achLookKept(id) { if (!achLookSet) { try { achLookSet = JSON.parse(store.get('openWaterAchLook')); } catch (e) {} } return !!(achLookSet ? achLookSet.includes(id) : achClaimed[id]); }
if (store.get('openWaterAchLook') === null) {                            // (the city is loaded later - Baumeister is checked on the first round below)
    achLookSet = [...new Set([...Object.keys(achClaimed), ...['cap100', 'cap1000', 'def25', 'emma10', 'boss1', 'throne'].filter(id => achDone(ACHIEVEMENTS.find(a => a.id === id)))])]; achLookSet.late = 1; }
const goalsPopup = document.getElementById('goalsPopup'); var goalsTab = 'daily', achReadyN = 0;   // Ziele: the daily tasks and the Erfolge in one sheet
let achKnown = null, achTimer = null;
function achCheckSoon() { clearTimeout(achTimer); achTimer = setTimeout(achCheck, 400); }
function achFensterOffen() {                                                 // Handy: ein offenes Fenster füllt den Schirm – der Erfolgs-Hinweis kommt erst danach (nicht über Heldenkarten/Gebäudekopf)
    if (uiLayout() === 'desktop') return false;
    return !document.getElementById('heroHall').hidden || !document.getElementById('citySheet').hidden || document.body.classList.contains('has-panel');
}
function achCheck() {                                                        // newly reached ones are announced once
    if (achLookSet && achLookSet.late) { delete achLookSet.late; if (achDone(ACHIEVEMENTS.find(a => a.id === 'city5')) && !achLookSet.includes('city5')) achLookSet.push('city5'); store.set('openWaterAchLook', JSON.stringify(achLookSet)); }
    const ready = achClaimable();
    if (achKnown === null) achKnown = new Set(ready.map(a => a.id));
    if (!achFensterOffen() && !hintFrisch()) for (const a of ready) if (!achKnown.has(a.id)) { achKnown.add(a.id); flashHint('Erfolg: ' + a.name + ' – ' + a.gems + ' Edelsteine unter „Events“', 4500); sfx('crown'); }   // (frischer Hinweis wie „Truppen geheilt“: der Erfolg kommt eine Runde später)
    updateGoalsBadge(ready.length);
    if (isPanelOpen(goalsPopup) && goalsTab === 'ach') renderAchievements();
}
setInterval(achCheck, 3000);
let achOpenDone = false;
function renderAchievements() {
    const got = ACHIEVEMENTS.filter(a => achClaimed[a.id]), left = ACHIEVEMENTS.reduce((s, a) => s + (achClaimed[a.id] ? 0 : a.gems), 0);
    liveHtml(document.getElementById('achSummary'), '<div class="ach-sum-t"><span><b>' + got.length + ' / ' + ACHIEVEMENTS.length + '</b> abgeholt</span><span class="ach-sum-gem">' + icon('gem') + fmtNum(left) + ' noch zu holen</span></div><div class="ach-sum-bar"><i style="width:' + Math.round(got.length / ACHIEVEMENTS.length * 100) + '%"></i></div>');
    const fam = {}; for (const a of ACHIEVEMENTS) (fam[a.k] = fam[a.k] || []).push(a);
    for (const k in fam) fam[k].sort((x, y) => x.goal - y.goal);
    const ready = achClaimable(), frac = a => Math.min(1, achVal(a) / a.goal);
    const going = Object.values(fam).map(l => l.find(a => !achClaimed[a.id] && !achDone(a))).filter(a => a && !fam[a.k].some(b => b.goal < a.goal && !achClaimed[b.id])).sort((x, y) => frac(y) - frac(x));   // one per kind: the next tier, once the ones below are collected
    const card = a => { const v = Math.min(a.goal, achVal(a)), ok = v >= a.goal, has = !!achClaimed[a.id], tiers = fam[a.k], ti = tiers.indexOf(a);
        return '<div class="ach' + (has ? ' is-got' : ok ? ' is-ready' : '') + '"><span class="ach-medal">' + icon(a.icon) + '</span>' +
            '<span class="ach-t"><b>' + a.name + (tiers.length > 1 ? '<i class="ach-tier" title="Stufe ' + (ti + 1) + ' von ' + tiers.length + '">' + tiers.map((t, i) => '<em class="' + (achClaimed[t.id] ? 'on' : i === ti ? 'cur' : '') + '"></em>').join('') + '</i>' : '') + '</b><small>' + a.desc + '</small>' +
            (has ? '' : '<span class="ach-bar"><i style="width:' + Math.round(v / a.goal * 100) + '%"></i></span><small class="ach-n">' + fmtNum(Math.floor(v)) + ' / ' + fmtNum(a.goal) + '</small>') + '</span>' +
            (has ? '<span class="ach-claim done">' + icon('check') + '</span>' : '<button class="ach-claim" type="button" data-ach="' + a.id + '"' + (ok ? '' : ' disabled') + '>' + icon('gem') + fmtNum(a.gems) + '</button>') + '</div>'; };
    liveHtml(document.getElementById('achList'),                  // (alle 3 s aus achCheck: neu geschrieben nur, was sich geändert hat)
        (ready.length ? '<div class="sect"><h4>Abholbereit</h4>' + (ready.length > 1 ? '<button class="btn btn--primary btn--sm ach-all" type="button" data-ach-all>' + icon('gem') + '<span>Alle · ' + fmtNum(ready.reduce((s, a) => s + a.gems, 0)) + '</span></button>' : '') + '</div>' + ready.map(card).join('') : '') +
        (going.length ? '<div class="sect"><h4>Im Gange</h4><span class="sect-aside">' + going.length + '</span></div>' + going.map(card).join('') : '') +
        (got.length ? '<details class="ach-done"' + (achOpenDone ? ' open' : '') + '><summary><span>Erledigt</span><em>' + got.length + '</em>' + icon('upgrade') + '</summary><div class="ach-list">' + got.slice().sort((x, y) => achClaimed[y.id] - achClaimed[x.id]).map(card).join('') + '</div></details>' : ''));
    if (isPanelOpen(goalsPopup)) renderGoalsSub();
}
function claimAch(a) {
    if (!a || achClaimed[a.id] || !achDone(a)) return 0;
    achClaimed[a.id] = Date.now(); store.set('openWaterAch', JSON.stringify(achClaimed)); gems += a.gems; saveGameNow(); return a.gems;   // (die Gems gleich mit sichern – nicht erst mit der nächsten Sicherung)
}
document.getElementById('achList').addEventListener('click', e => {
    if (e.target.closest('[data-ach-all]')) { const l = achClaimable(), n = l.reduce((s, a) => s + claimAch(a), 0); if (!n) return;
        saveProgression(); updateHud(); sfx('gem'); beuteFenster('Erfolge', [{ a: 'gems', n }], { unter: l.length + ' Erfolge abgeholt' }); renderAchievements(); achCheck(); return; }
    const b = e.target.closest('[data-ach]'); if (!b || b.disabled) return;
    const a = ACHIEVEMENTS.find(q => q.id === b.dataset.ach), n = claimAch(a); if (!n) return;
    saveProgression(); updateHud(); sfx('gem'); beuteFenster('Erfolg', [{ a: 'gems', n }], { unter: a.name });
    renderAchievements(); achCheck();
});
document.getElementById('achList').addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('ach-done')) achOpenDone = e.target.open; }, true);

// ===== PROFIL ANTIPPEN: every ruler's card - yours and everyone else's, the same way =====
const botIdByName = {}; for (const bd of BOT_DEFS) botIdByName[bd.name] = bd.id;
function whoTroops(who) {
    if (who !== 'player' && typeof nebelVomServer === 'function' && nebelVomServer()) { const b = loadBotState()[who]; if (b && b.tt >= 0) return b.tt; }   // 3B: fremde Truppen kennst du nicht alle – die Summe zählt der Weltrechner
    let n = 0; for (const id of (who === 'player' ? ownedIslands : botOwnedIslands[who] || [])) n += islandTroops[id] || 0; return n; }
function whoBases(who) { return who === 'player' ? ownedIslands.size : (botOwnedIslands[who] || new Set()).size; }
function whoProfile(who) {                       // the same facts for you and for anyone else
    const slots = Object.keys(EQUIPMENT_DEFS);
    if (who === 'player') {
        const c = loadCity();
        return { who, name: profileName.value || 'Du', lvl: playerLvl, frame: playerFrame(), title: playerTitle(), temple: titleOf('player'), bases: ownedIslands.size, troops: whoTroops('player'),
            items: slots.map(k => { const it = equippedItems[k] && inventory[equippedItems[k]]; return [k, it ? it.rarity : -1, it ? it.level : 0, it ? it.stars || 0 : 0]; }),
            heroes: HEROES.filter(x => heroOwned('player', x.id)).map(x => [x.id, heroSt('player', x.id).q, x.r]),
            skills: Object.fromEntries(Object.keys(SKILL_DEFS).map(k => [k, skills[k] || 0])), city: Object.assign({}, c.levels), capital: playerIslandId, online: true };
    }
    const b = loadBotState()[who], bd = botById[who]; if (!b || !bd) return null; const lk = botLook(who);
    return { who, name: bd.name, lvl: b.lvl, frame: lk.frame, title: lk.title, temple: titleOf(who), bases: whoBases(who), troops: whoTroops(who),
        items: slots.map(k => { const it = botItem(b, k); return [k, it ? it.rarity : -1, it ? it.level : 0, it ? it.stars : 0]; }),
        heroes: HEROES.filter(x => heroOwned(who, x.id)).map(x => [x.id, heroSt(who, x.id).q, x.r]),
        skills: Object.assign({}, b.skills), city: Object.assign({}, b.city.levels), capital: botCapitalOf(who), online: botOnline(bd, Date.now()) };
}
function powerOf(pr) {                           // Macht: troops, bases, gear, heroes, skills and city - one number to compare rulers by
    if (pr.who !== 'player' && fremdGeheim()) { const b = loadBotState()[pr.who]; return b && Number.isFinite(b.macht) ? b.macht : 0; }   // Zuschauer: die Macht anderer rechnet der Weltrechner (die Werte dafür hat das Handy nicht)
    let bases = 0; for (const id of (pr.who === 'player' ? ownedIslands : botOwnedIslands[pr.who] || [])) bases += baseDefenseForLevel(islandLevels[id] || 1);
    const gear = pr.items.reduce((a, it) => a + (it[1] >= 0 ? itemScore({ rarity: it[1], level: it[2] }) * (1 + it[3] * .2) : 0), 0);
    const heroes = pr.heroes.reduce((a, x) => a + (4 + x[1]) * x[2] / 2, 0), sk = Object.values(pr.skills).reduce((a, v) => a + v, 0), city = Object.values(pr.city).reduce((a, v) => a + v, 0);
    return Math.round(pr.troops + bases + gear * 400 + heroes * 800 + sk * 600 + city * 1500);
}
function lastFightWith(pr) {                     // what's between the two of you, from the battle log
    if (pr.who === 'player') return null;
    const hit = combatLog.find(e => e.type === 'botAttack' && e.rolle !== 'helfer' && (e.botId === pr.who || e.botName === pr.name));
    const mine = combatLog.find(e => e.type === 'attack' && (e.defenderId === pr.who || e.defenderName === pr.name));
    const ago = e => fmtAway(Date.now() - e.at);
    const parts = [];
    if (hit) parts.push(escapeHtml(pr.name) + ' hat dich zuletzt vor ' + ago(hit) + ' angegriffen' + (hit.won ? ' und gewonnen.' : ' – du hast gehalten.'));
    if (mine) parts.push('Du hast ' + escapeHtml(pr.name) + ' zuletzt vor ' + ago(mine) + ' angegriffen' + (mine.won ? ' und gewonnen.' : ' – ohne Erfolg.'));
    return parts.length ? parts.join('<br>') : escapeHtml(pr.name) + ' und du hattet noch keinen Kampf miteinander.';
}
const rulerPopup = document.getElementById('rulerPopup');
let rulerWho = null, rulerBack = null;                 // rulerBack: opened from the ranking → closing goes back there (same tab and scroll)
function openRulerProfile(who) {
    const pr = whoProfile(who); if (!pr) return;
    rulerBack = isPanelOpen(rankPopup) ? document.getElementById('rankBody').scrollTop : null;
    closeAllPopups(); rulerWho = who;
    const ring = document.getElementById('rulerCrest'); ring.dataset.frame = pr.frame; ring.querySelector('img').src = crestDataUrl(40, who);
    document.getElementById('rulerLvl').textContent = pr.lvl;
    document.getElementById('rulerName').textContent = pr.name;
    document.getElementById('rulerOver').textContent = (who === 'player' ? 'Dein Profil' : 'Profil') + ' · Rang ' + RANK_TIERS[rankIndexFor(pr.bases)].name;
    document.getElementById('rulerSub').innerHTML = '<span class="ptitle-tag" style="margin:0">' + escapeHtml(pr.title) + '</span>' + (who === 'player' ? '' : ' <span class="rp-online' + (pr.online ? ' on' : '') + '"><i></i>' + (pr.online ? 'online' : 'offline') + '</span>') +
        '<div class="rp-bundzeile">' + profilBundHtml(who) + '</div>';   // sein Bündnis in eigener Zeile (antippen: Bündnis-Fenster)
    const rd = r => RARITY_DEFS[r];
    const gear = pr.items.map(it => { const d = EQUIPMENT_DEFS[it[0]], r = rd(it[1]);
        return '<span class="gslot"><span class="tile' + (r ? '' : ' empty') + '"' + (r ? ' data-r="' + r.key + '"' : '') + ' title="' + d.name + (r ? ' – ' + r.label + ', Stufe ' + it[2] : ' – leer') + '">' + icon(d.icon) +
            (r ? '<span class="lvl">' + it[2] + '</span>' + (it[3] ? '<span class="stars">' + icon('star').repeat(it[3]) + '</span>' : '') : '') + '</span><small>' + d.name + '</small></span>'; }).join('');
    const heroes = pr.heroes.length ? pr.heroes.slice().sort((a, b) => b[2] - a[2] || b[1] - a[1]).map(x => heroChipHtml(x[0], x[1])).join('') : '<div class="war-empty">Noch keine Helden freigeschaltet.</div>';
    const skillsHtml = Object.keys(SKILL_DEFS).map(k => '<div><span>' + SKILL_DEFS[k].name + '</span><b>' + (pr.skills[k] || 0) + '</b></div>').join('');
    const cityHtml = BOT_BUILDINGS.map(k => '<div class="rp-bld' + ((pr.city[k] || 0) ? '' : ' is-zero') + '"><span class="rp-bld-ic">' + icon(cityDef(k).icon) + '<b>' + (pr.city[k] || 0) + '</b></span><small>' + cityDef(k).name + '</small></div>').join('');
    const last = lastFightWith(pr), verdeckt = who !== 'player' && fremdGeheim();   // Zuschauer: Ausrüstung, Helden, Skills, Stadt anderer nur im Spähbericht
    const burg = AUF ? AUF.burgStufe(who) : (pr.city.keep || 1);
    const verdecktHtml = '<div class="sect"><h4>Stadt</h4></div><div class="rp-blds"><div class="rp-bld"><span class="rp-bld-ic">' + icon(cityDef('keep').icon) + '<b>' + burg + '</b></span><small>' + cityDef('keep').name + '</small></div></div>' +
        '<div class="notice">' + icon('scout') + '<span>Ausrüstung, Helden, Fähigkeiten und Forschung siehst du erst, wenn du eine Basis von ' + escapeHtml(pr.name) + ' ausspähst – im Spähbericht im Kampflog.</span></div>';
    document.getElementById('rulerBody').innerHTML =
        '<div class="rp-stats"><div class="rp-stat"><small>Macht</small><b>' + fmtCompact(powerOf(pr)) + '</b></div><div class="rp-stat"><small>Basen</small><b>' + fmtNum(pr.bases) + '</b></div>' +
        '<div class="rp-stat"><small>Stufe</small><b>' + pr.lvl + '</b></div><div class="rp-stat"><small>Tempel</small><b>' + (rulerOwner() === who ? 'Herrscher' : pr.temple ? escapeHtml(pr.temple.name) : '–') + '</b></div></div>' +
        (ownerShielded(who) ? '<div class="notice notice--gold">' + icon('shield') + '<span>' + (neulingVon(who) >= ownerShieldUntil(who) ? 'Anfängerschutz – noch ' + fmtHours(neulingVon(who) - Date.now()) + ' (oder bis 100.000 Truppen)' : (who === 'player' ? 'Dein Friedensschild' : 'Friedensschild') + ' aktiv – noch ' + fmtHours(ownerShieldUntil(who) - Date.now())) + '</span></div>' : '') +
        (verdeckt ? '' : passChip(who)) + (last ? '<div class="rp-last">' + last + '</div>' : '') +
        (verdeckt ? verdecktHtml :
        '<div class="sect"><h4>Ausrüstung</h4></div><div class="rp-gear">' + gear + '</div>' +
        '<div class="sect"><h4>Helden</h4></div><div class="rp-heroes">' + heroes + '</div>' +
        '<div class="sect"><h4>Fähigkeiten</h4></div><div class="rp-grid">' + skillsHtml + '</div>' +
        '<div class="sect"><h4>Stadt</h4></div><div class="rp-blds">' + cityHtml + '</div>') +
        '<div class="rp-actions">' + (typeof bundProfilKnopf === 'function' ? bundProfilKnopf(who) : '') + '<button class="btn btn--secondary btn--sm" type="button" data-rp="map">' + icon('flag') + '<span>Zur Karte</span></button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-rp="capital">' + icon('castle') + '<span>Hauptstadt</span></button></div>';
    openPanel(rulerPopup);
}
document.getElementById('rulerCloseBtn').addEventListener('click', () => { closePanel(rulerPopup); rulerWho = null;
    if (rulerBack !== null) { const y = rulerBack; rulerBack = null; openRankings(); document.getElementById('rankBody').scrollTop = y; } });
document.getElementById('rulerBody').addEventListener('click', e => {
    const b = e.target.closest('[data-rp]'); if (!b || !rulerWho) return;
    if (b.dataset.rp === 'einladen') { const w = rulerWho; b.disabled = true; bundBefehl('einladen', { w: neutralId(w) }, 'Einladung an ' + whoProfile(w).name + ' geschickt.'); return; }
    const who = rulerWho, own = who === 'player' ? ownedIslands : botOwnedIslands[who]; if (!own || !own.size) return;
    closePanel(rulerPopup); rulerWho = null; rulerBack = null;
    if (b.dataset.rp === 'capital') { const cap = who === 'player' ? playerIslandId : botCapitalOf(who), isl = islandById[cap]; if (!isl) return;
        flyTo(isl.x, isl.y, { zoom: Math.max(mapState.zoom, 0.02) }); setTimeout(() => openIslandPopup(isl), 650); return; }
    const c = screenToWorld(viewW / 2, viewH / 2); let best = null, bd = Infinity;   // their base nearest to what you're looking at
    for (const id of own) { const isl = islandById[id], d = Math.hypot(isl.x - c.x, isl.y - c.y); if (d < bd) { bd = d; best = isl; } }
    if (best) { flyTo(best.x, best.y, { zoom: Math.max(mapState.zoom, 0.015) }); flashHint(whoProfile(who).name + ': ' + own.size + (own.size === 1 ? ' Basis' : ' Basen') + ' auf der Karte.', 2500); }
});
// Bündnis im Profil (eigenes und fremdes): Wappen + Name, antippen öffnet gleich das Bündnis-Fenster – das eigene Bündnis auf
// „Info“, ein fremdes unter „Suchen“ (dort beitreten/anfragen), ohne Bündnis ebenso „Suchen“
function profilBundHtml(who) {
    const a = typeof bundVon === 'function' ? bundVon(who) : null;
    if (!a) return who === 'player' ? '<button type="button" class="rp-bund is-leer" data-bund-zeigen="">' + icon('bund') + '<span>Kein Bündnis – jetzt eins suchen</span></button>' : '<span class="rp-bund is-leer"><span>kein Bündnis</span></span>';
    return '<button type="button" class="rp-bund" data-bund-zeigen="' + escapeHtml(a.id) + '">' + bundZeichenHtml(a) + '<span>[' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) + '</span></button>';
}
function bundZeigen(id) {
    if (typeof bundOeffnen !== 'function') return;
    const mein = typeof bundIch === 'function' && bundIch(), a = id && bund && bund.b[id];
    closeAllPopups(); bundOeffnen(a && mein && mein.id === a.id ? 'info' : 'suchen');
    if (!a || (mein && mein.id === a.id)) return;
    const z = [...bundPopup.querySelectorAll('.bd-zeile')].find(r => { const n = r.querySelector('.bd-name b'); return n && n.textContent === '[' + a.tag + '] ' + a.name; });
    if (z) { z.scrollIntoView({ block: 'center' }); z.classList.add('is-ziel'); setTimeout(() => z.classList.remove('is-ziel'), 2500); }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-bund-zeigen]'); if (b) { e.preventDefault(); bundZeigen(b.dataset.bundZeigen); } });
// every name you see can be tapped: the ranking, the owner line of a base, the battle reports
document.addEventListener('click', e => { const l = e.target.closest('[data-profile]'); if (!l) return; e.preventDefault(); e.stopPropagation(); openRulerProfile(l.dataset.profile); }, true);
function whoLink(who, name) { return who ? '<button type="button" class="who-link" data-profile="' + who + '">' + escapeHtml(name) + '</button>' : escapeHtml(name); }
function escapeHtml(str) {                         // auch Anführungszeichen: sicher in Text UND in Attributen
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// ===== RANGLISTE: Macht, Eroberungen, Titel (aus der Mitte), Thron-Punkte (all ever earned). Worked out once when opened or a tab
// is picked - never per frame. Everyone is listed the same way; your row is blue and waits in the foot when you're outside the top.
const rankPopup = document.getElementById('rankPopup'), RANK_TOP = 50;
let rankTab = 'power';
const RANK_TABS = { power: { t: 'Macht', sub: 'Die Stärke des ganzen Reichs', unit: 'Macht' },
    caps: { t: 'Eroberungen', sub: 'Eroberte Basen in dieser Saison', unit: 'erobert' },
    burg: { t: 'Hauptstadt', sub: 'Burg-Stufe, dann Forschung', unit: 'Burg-Stufe' },
    titles: { t: 'Titel', sub: 'Wer die Mitte hält und wer einen Titel trägt', unit: 'Thron-P.' },
    week: { t: 'Thron-Punkte', sub: 'Fürs Halten der Mitte · in dieser Saison verdient', unit: 'Thron-P.' } };
function conquestsOf(who) { return who === 'player' ? playerStats.captures || 0 : botConquests(who); }
function foPunkte(who, bs) {                             // alle erforschten Stufen – von anderen nur die Summe (rechnet der Weltrechner, foP)
    if (!AUF) return 0; if (who !== 'player' && fremdGeheim()) { const b = (bs || loadBotState())[who]; return b && Number.isFinite(b.foP) ? b.foP : 0; }
    return AUF.foSumme(who);
}
function rankPeople() {                                  // everyone once: name, frame, look title, level, bases
    const bs = loadBotState(), out = [{ who: 'player', name: profileName.value || 'Du', frame: playerFrame(), title: playerTitle(), lvl: playerLvl, bases: ownedIslands.size }];
    for (const bd of BOT_DEFS) { const lk = botLook(bd.id); out.push({ who: bd.id, name: bd.name, frame: lk.frame, title: lk.title, lvl: (bs[bd.id] || {}).lvl || 1, bases: whoBases(bd.id) }); }
    return out;
}
function rankRowHtml(e, pos, medals, unit) {
    const me = e.who === 'player', v = e.val;
    return '<div class="lb-row' + (medals && pos <= 3 ? ' is-' + pos : '') + (me ? ' isMe' : '') + '" data-profile="' + e.who + '" role="button" tabindex="0">' +
        '<span class="lb-pos">' + pos + '</span>' +
        '<span class="lb-crest" data-frame="' + e.frame + '"><span class="lb-crest-in"><img alt="" src="' + crestDataUrl(28, e.who) + '"></span><span class="lvl">' + e.lvl + '</span></span>' +
        '<span class="lb-name"><b><span>' + escapeHtml(e.name) + '</span>' + (me && profileName.value ? '<span class="tag tag--player">Du</span>' : '') + '</b><small>' + e.sub + '</small></span>' +
        '<span class="lb-val"><b>' + (v >= 1e5 ? fmtCompact(v) : fmtNum(v)) + '</b><small>' + (unit || RANK_TABS[rankTab].unit) + '</small></span></div>';
}
function renderRankings() {
    const tab = RANK_TABS[rankTab], people = rankPeople(), bs = loadBotState(), t = loadTitles(), ruler = rulerOwner() || null;
    const basesTxt = n => fmtNum(n) + (n === 1 ? ' Basis' : ' Basen');
    if (!RANK_TABS[rankTab]) rankTab = 'power';
    let list, medals = true, empty = '';
    const macht = e => { if (e.macht === undefined) { const pr = whoProfile(e.who); e.macht = pr ? powerOf(pr) : 0; } return e.macht; };
    const gleich = (a, b) => macht(b) - macht(a) || (a.who === 'player') - (b.who === 'player');   // Gleichstand: erst Macht, sonst du hinter den anderen (nie bevorzugt)
    if (rankTab === 'power') { for (const e of people) { const pr = whoProfile(e.who); e.val = pr ? powerOf(pr) : 0; e.sub = escapeHtml(e.title) + ' <i>· ' + basesTxt(e.bases) + '</i>'; } list = people.slice(); }
    else if (rankTab === 'caps') { for (const e of people) { e.val = rangSaison(e.who, 0); e.sub = escapeHtml(e.title) + ' <i>· hält ' + basesTxt(e.bases) + '</i>'; } list = people.slice(); saveBotState(); }
    else if (rankTab === 'burg') { for (const e of people) { e.val = AUF ? AUF.burgStufe(e.who) : 1; e.fo = foPunkte(e.who, bs); e.sub = escapeHtml(e.title) + ' <i>· Forschung ' + fmtNum(e.fo) + '</i>'; }
        list = people.slice().sort((a, b) => b.val - a.val || b.fo - a.fo || b.lvl - a.lvl || gleich(a, b)); }
    else if (rankTab === 'titles') {                      // the ruler first, then everyone wearing a title from the middle
        medals = false; const by = {}; for (const x of TITLES) if (t.by[x.key]) by[t.by[x.key]] = x;
        for (const e of people) { const x = by[e.who]; e.val = rangSaison(e.who, 1, bs);
            e.sub = e.who === ruler ? '<span class="lb-t is-ruler">Herrscher</span>' : x ? '<span class="lb-t' + (x.good ? '' : ' is-bad') + '" title="' + x.desc + '">' + x.name + '</span> <i>' + (x.v > 0 ? '+' : '−') + Math.round(Math.abs(x.v) * 100) + ' % ' + ({ troops: 'Truppen', coins: 'Münzen', attack: 'Angriff', defense: 'Abwehr' })[x.kind] + '</i>' : '<i>kein Titel</i>'; }
        const tr = e => e.who === ruler ? 0 : by[e.who] ? (by[e.who].good ? 1 : 2) : 3;
        list = people.filter(e => tr(e) < 3).sort((a, b) => tr(a) - tr(b) || b.val - a.val || gleich(a, b));
        empty = ruler ? '' : 'Niemand hält gerade die Mitte – erobere den Mega-Tempel, dann verteilst du die Titel.';
    } else { for (const e of people) { e.val = rangSaison(e.who, 1, bs); e.sub = escapeHtml(e.title) + ' <i>· ' + basesTxt(e.bases) + '</i>'; } list = people.filter(e => e.val > 0);
        empty = 'Noch hat niemand Thron-Punkte geholt. Halte die Mitte oder einen Wächter-Tempel.'; }
    if (rankTab !== 'titles' && rankTab !== 'burg') list.sort((a, b) => b.val - a.val || b.lvl - a.lvl || gleich(a, b));
    const lim = RANK_TOP, top = list.slice(0, lim), mi = list.findIndex(e => e.who === 'player');
    document.getElementById('rankTitle').textContent = tab.t;
    document.getElementById('rankSub').textContent = tab.sub;                     // one line what this list counts
    for (const b of document.querySelectorAll('#rankTabs [data-rtab]')) { const on = b.dataset.rtab === rankTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    liveHtml(document.getElementById('rankBody'),
        (rankTab === 'week' ? '<details class="lb-info"><summary>' + icon('info') + 'So gibt es Thron-Punkte</summary><p class="mail-intro">Fürs Halten der Mitte: +' + THRONE_PTS_MEGA + ' alle 3 Min. für den Thron, +' + THRONE_PTS_GUARD + ' je Wächter-Tempel. Du gibst sie im Shop unter „Thron“ aus – hier zählt alles je Verdiente, ohne Neustart.</p></details>' : '') +   // (Erklärung zum Aufklappen: die Liste geht vor)
        (top.length ? top.map((e, i) => rankRowHtml(e, i + 1, medals)).join('') + (list.length > lim ? '<div class="lb-gap">Top ' + lim + ' von ' + fmtNum(list.length) + '</div>' : '')
        : '<div class="empty-state lb-leer">' + icon(rankTab === 'titles' ? 'crown' : 'points') + '<span><b>Noch leer</b>' + empty + '</span></div>'));   // (kompakt oben statt mitten im leeren Fenster)
    const foot = document.getElementById('rankFoot');
    const myPos = mi + 1;
    liveHtml(foot, myPos > 0 && myPos <= lim ? '' : rankRowHtml(people[0], myPos > 0 ? myPos : '–', false));   // outside the top: your row waits down here
    foot.hidden = !foot.innerHTML;
}
function openRankings(tab) {
    closeAllPopups(); if (tab && RANK_TABS[tab]) rankTab = tab;
    renderRankings(); openPanel(rankPopup); document.getElementById('rankBody').scrollTop = 0;
}
document.getElementById('rankTabs').addEventListener('click', e => { const b = e.target.closest('[data-rtab]'); if (!b || b.dataset.rtab === rankTab) return; rankTab = b.dataset.rtab; renderRankings(); document.getElementById('rankBody').scrollTop = 0; });
document.getElementById('rankCloseBtn').addEventListener('click', () => closePanel(rankPopup));
rankPopup.addEventListener('keydown', e => { const r = e.target.closest('[data-profile]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRulerProfile(r.dataset.profile); } });

profileBtn.addEventListener('click', () => {
    if (isPanelOpen(profilePopup)) { profileCloseBtn.click(); return; }
    closeAllPopups();
    renderProfile();
    showProfileTab('info');
    openPanel(profilePopup);
});
profileCloseBtn.addEventListener('click', () => {
    closePanel(profilePopup);
    chestSelectedIds.clear();
});

