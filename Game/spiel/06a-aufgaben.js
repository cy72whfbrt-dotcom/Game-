// Teil 06a-aufgaben.js: Aufgaben und tägliche Belohnung
// ===== AUFGABEN (daily quests) + TÄGLICHE BELOHNUNG =====

// (VIP ist seit 2.10. ganz raus – Alexander)
function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); }
function msToMidnight() { const d = new Date(); const m = new Date(d); m.setHours(24, 0, 0, 0); return m - d; }

// Grants one crate item (like the shop) - minRarity for the big day-7 chest. Jede geöffnete Kiste zählt für die Tagesaufgabe.
function grantFreeCrate(minRarity) {
    const it = addInventoryItem(pickRandomSlot(), Math.max(minRarity || 0, pickRandomRarity()), 1); questProgress('crate', 1); return it;
}

// ---- daily reward: 7-day cycle, missing a day starts again at day 1 ----
var DAILY_REWARDS = [
    { crates: 1, gems: 0 }, { crates: 1, gems: 5 }, { crates: 2, gems: 0 }, { crates: 2, gems: 10 },
    { crates: 3, gems: 0 }, { crates: 3, gems: 15 }, { crates: 1, gems: 25, epic: true }
];
var dailyState = null;
function loadDaily() {
    if (dailyState) return dailyState;
    try { dailyState = JSON.parse(store.get('openWaterDaily')) || null; } catch (e) { dailyState = null; }
    if (!dailyState || typeof dailyState.day !== 'number') dailyState = { last: null, day: 0 };
    return dailyState;
}
function dailyClaimable() { return loadDaily().last !== todayKey(); }
function dailyNextDay() {           // the day (1-7) that the next claim gives
    const d = loadDaily();
    if (d.last === todayKey()) return d.day;
    return d.last === yesterdayKey() ? d.day % 7 + 1 : 1;
}
function dailyRewardLabel(r) {
    return (r.epic ? 'Epische Kiste' : r.crates + (r.crates === 1 ? ' Kiste' : ' Kisten')) + (r.gems ? ' + ' + r.gems + ' Edelsteine' : '');
}
function dailyDaysHtml() {
    const today = dailyNextDay(), claimed = !dailyClaimable();
    let html = '';
    for (let i = 1; i <= 7; i++) {
        const r = DAILY_REWARDS[i - 1];
        const done = i < today || (i === today && claimed);
        const cls = 'daily-day' + (done ? ' is-done' : '') + (i === today && !claimed ? ' is-today' : '') + (r.epic ? ' is-big' : '');
        html += '<div class="' + cls + '">' + icon(r.gems && !r.crates ? 'gem' : 'shop') + '<span><i>Tag </i>' + i + '</span></div>';
    }
    return html;
}
function claimDaily() {
    if (!dailyClaimable()) return null;
    const day = dailyNextDay(), r = DAILY_REWARDS[day - 1];
    const items = [];
    for (let i = 0; i < r.crates; i++) items.push(grantFreeCrate(r.epic ? 3 : 0));
    gems += r.gems;
    dailyState = { last: todayKey(), day };
    store.set('openWaterDaily', JSON.stringify(dailyState));
    saveGame(); saveProgression(); updateHud(); updateGoalsBadge(); anleitungAbgeholt();
    return { day, gems: r.gems, items };
}
function dailyBeute(r) { return [{ a: 'kiste', k: r.epic ? 'royal' : 'aus', n: r.crates, r: r.epic ? 3 : 0, min: !!r.epic }, { a: 'gems', n: r.gems }]; }
const dailyModal = document.getElementById('dailyModal');
function showDailyModal() {
    if (!dailyClaimable()) return;
    const day = dailyNextDay(), r = DAILY_REWARDS[day - 1];
    document.getElementById('dailyModalTitle').textContent = 'Tag ' + day;
    document.getElementById('dailyModalSub').textContent = day > 1 ? day + ' Tage in Folge – weiter so!' : 'Jeden Tag vorbeischauen lohnt sich.';
    document.getElementById('dailyModalDays').innerHTML = dailyDaysHtml();
    document.getElementById('dailyModalLabel').textContent = 'Heute';
    beuteLis(dailyBeute(r), document.getElementById('dailyModalRewards'));
    const btn = document.getElementById('dailyModalBtn');
    btn.dataset.state = 'claim'; btn.querySelector('span').textContent = 'Abholen';
    dailyModal.hidden = false;
}
function closeDailyModal() {
    if (dailyModal.hidden) return false;
    dailyModal.hidden = true;
    if (isPanelOpen(goalsPopup)) { renderQuestPanel(); updateGoalsBadge(); if (goalsTab === 'reward') renderInbox(); }   // (der Satz oben nennt die tägliche Belohnung nur, solange sie wartet)
    return true;
}
document.getElementById('dailyModalBtn').addEventListener('click', () => {
    const btn = document.getElementById('dailyModalBtn');
    if (btn.dataset.state !== 'claim') { closeDailyModal(); return; }
    const res = claimDaily();
    if (!res) { closeDailyModal(); return; }
    document.getElementById('dailyModalDays').innerHTML = dailyDaysHtml();
    document.getElementById('dailyModalLabel').textContent = 'Erhalten';
    beuteLis([...res.items.map(itemBeute), { a: 'gems', n: res.gems }], document.getElementById('dailyModalRewards'));
    btn.dataset.state = 'done'; btn.querySelector('span').textContent = 'Weiter';
});
dailyModal.addEventListener('click', e => { if (e.target === dailyModal) closeDailyModal(); });

// ---- daily quests: 6 random tasks per day (7.10.: vorher 3) – 2 leicht, 2 mittel, 2 schwer; je Edelsteine + Münzen, Bonus bei 3 (Truppen) und bei allen 6 (Kiste) ----
// steps: Ziel je Stufe (0 = auf dieser Stufe nicht), geht: nur würfeln, was heute geht
var QUEST_DEFS = {
    capture: { icon: 'flag',        text: n => 'Erobere ' + n + ' Basen',             steps: [3, 5, 8] },
    attack:  { icon: 'attack',      text: n => 'Starte ' + n + ' Angriffe',            steps: [5, 10, 15] },
    upgrade: { icon: 'upgrade',     text: n => 'Werte ' + n + '-mal Basen auf',        steps: [5, 10, 20] },
    pickup:  { icon: 'coin',        text: n => 'Sammle ' + n + ' Karten-Belohnungen',  steps: [2, 4, 6] },
    scout:   { icon: 'scout',       text: n => 'Späh ' + n + ' Basen aus',             steps: [2, 4, 6] },
    send:    { icon: 'send',        text: n => 'Schicke ' + n + '-mal Truppen',        steps: [2, 4, 6] },
    crate:   { icon: 'shop',        text: n => 'Öffne ' + n + (n === 1 ? ' Kiste' : ' Kisten'), steps: [1, 2, 3] },   // (jede Kiste: Shop, Helden-Kiste, Abholfach, Pass, Thron-Shop, Belohnungen)
    bau:     { icon: 'castle',      text: n => n === 1 ? 'Starte einen Bau in der Stadt' : 'Starte ' + n + ' Bauten in der Stadt', steps: [1, 1, 2], geht: () => questStadtGeht('bau') },
    forschung: { icon: 'flask',     text: () => 'Starte eine Forschung im Labor', steps: [1, 1, 1], geht: () => questStadtGeht('forschung') },
    barbLager: { icon: 'attack',    text: n => n === 1 ? 'Besiege ein Barbaren-Lager' : 'Besiege ' + n + ' Barbaren-Lager', steps: [2, 5, 10] },
    tagesboss: { icon: 'star',      text: n => n === 1 ? 'Greife den Tagesboss an' : 'Greife den Tagesboss ' + n + '-mal an', steps: [1, 3, 5], geht: () => new Date().getDay() === 4 },   // (Boss nur donnerstags, 09b DBOSS_TAG)
    sammeln: { icon: 'wood',        text: n => n === 1 ? 'Schicke Sammler auf ein Feld' : 'Schicke ' + n + '-mal Sammler auf Felder', steps: [1, 3, 5] },
    bundHilfe: { icon: 'bund',      text: n => n === 1 ? 'Hilf einmal im Bündnis (Bau-Hilfe)' : 'Hilf ' + n + '-mal im Bündnis (Bau-Hilfe)', steps: [1, 3, 5], geht: () => questBundGeht() },
    verstaerkung: { icon: 'send',   text: n => n === 1 ? 'Schicke Verstärkung an ein Bündnis-Mitglied' : 'Schicke ' + n + '-mal Verstärkung an Bündnis-Mitglieder', steps: [1, 1, 2], geht: () => questBundGeht() },
    rally: { icon: 'multiattack',   text: () => 'Mach bei einer Rally mit', steps: [1, 1, 1], geht: () => questBundGeht() },
    schmiede: { icon: 'weapon',     text: n => n === 1 ? 'Verbessere einen Gegenstand' : 'Verbessere ' + n + '-mal Gegenstände', steps: [1, 2, 3] },   // (Stufe oder Stern)
    zusammen: { icon: 'combine',    text: n => n === 1 ? 'Lege 3 Gegenstände zusammen' : 'Lege ' + n + '-mal 3 Gegenstände zusammen', steps: [1, 1, 2] },
    heilen: { icon: 'plus',         text: () => 'Heile Verwundete im Krankenhaus', steps: [1, 1, 1], geht: () => questStadtStufe('hospital') > 0 },
    markt: { icon: 'market',        text: n => n === 1 ? 'Tausche auf dem Markt' : 'Tausche ' + n + '-mal auf dem Markt', steps: [1, 1, 2], geht: () => questStadtStufe('market') > 0 },
    tempel: { icon: 'temple',       text: () => 'Erobere einen Tempel', steps: [0, 1, 1], geht: () => questTempelGeht() },
    thron: { icon: 'crown',         text: n => 'Halte den Thron ' + n + ' Minuten', steps: [0, 5, 15], geht: () => thronOffenAb() < new Date().setHours(24, 0, 0, 0) && thronLaeuft(new Date().setHours(21, 0, 0, 0)) },   // (erst ab Tag 7, nur Sa/So im Thron-Event)
};
// Zähler (statBump, auch vom Weltrechner) → Aufgabe; eine Zahl: so viel zählt jedes Mal (Heilen: einmal, egal wie viele)
var QUEST_STAT = { lager: 'barbLager', qb: 'tagesboss', qHilfe: 'bundHilfe', qVerst: 'verstaerkung', qRally: 'rally', temples: 'tempel', throneMin: 'thron', healed: ['heilen', 1] };
function questStat(k, n) { const q = QUEST_STAT[k]; if (q) questProgress(Array.isArray(q) ? q[0] : q, Array.isArray(q) ? q[1] : n || 1); }
const questStadtStufe = id => { try { return loadCity().levels[id] || 0; } catch (e) { return 0; } };
function questBundGeht() { try { const a = bundIch(); return !!a && a.mit.length > 1; } catch (e) { return false; } }   // (nur mit Bündnis und mindestens einem Mitglied)
// Tempel (alle in Zone 4): nur, wenn heute ein Pass in ein Tempel-Gebiet aufgeht (Zone 4 ab Tag 4, KARTE_ZONEN.oeffnen) – vorher kommt niemand hin
function questTempelGeht() { const nacht = new Date().setHours(24, 0, 0, 0); return islands.some(i => i.type === 'temple' && bridges.some(br => (br.a === i.landmassId || br.b === i.landmassId) && passOpensAt(br) < nacht)); }
const questBereit = () => !!AUF && typeof bundIch === 'function';   // (beim Skript-Start sind aufbau.js und buendnis.js noch nicht da)
// Bau/Forschung nur als Aufgabe, wenn es heute noch geht (Bauarbeiter bzw. Labor vor Mitternacht frei, etwas zu bauen/erforschen da)
function questStadtGeht(art) {
    try {
        if (!AUF) return true;                                       // (beim Laden noch nicht bereit: ja)
        const c = loadCity(), nacht = new Date().setHours(24, 0, 0, 0), B = AUF.burgStufe('player');
        if (art === 'forschung') return (c.levels.academy || 0) > 0 && (!c.foRun || c.foRun.endsAt < nacht) && AUF.foSumme('player') < AUF.foGesamt();
        const frei = c.builds.length < citySlots(c) || c.builds.some(b => b.endsAt < nacht);
        return frei && ['keep', ...CITY_BUILDINGS.map(b => b.id)].some(id => { const L = id === 'keep' ? B : c.levels[id] || 0;
            return !cityBuildOf(c, id) && (id === 'keep' ? L < AUF.BURG_MAX : L < AUF.stadtCap('player', id) && !(!L && AUF.BAU_AB_BURG[id] > B)); });
    } catch (e) { return true; }
}
var QUEST_TIER = [0, 0, 1, 1, 2, 2];                  // 6 am Tag: 2 leicht, 2 mittel, 2 schwer
var QUEST_GEMS = [3, 5, 8], QUEST_COIN_H = [1, 2, 3];  // je Stufe: Edelsteine + so viele Stunden Münzen
var QUEST_BONUS3 = { n: 3, tr: 2 };                    // Bonus bei 3 erledigt: 2 Stunden Truppen
var QUEST_BONUS = { crates: 1, gems: 10 };             // Bonus bei allen 6 (+ Helden-Splitter)
const questGemsTag = () => QUEST_TIER.reduce((a, st) => a + QUEST_GEMS[st], 0) + QUEST_BONUS.gems;   // Edelsteine am Tag (Hauptbuch: 42)
var questState = null;
const questGeht = k => { const d = QUEST_DEFS[k]; try { return !d.geht || !!d.geht(); } catch (e) { return false; } };
function questNeu(type, st) { return { type, st, target: QUEST_DEFS[type].steps[st], progress: 0, gems: QUEST_GEMS[st], h: QUEST_COIN_H[st], claimed: false }; }
function questAuffuellen(q) {                          // bis 6: je Platz eine Art, die heute geht und auf dieser Stufe vorkommt (Zufall, keine doppelt)
    const frei = Object.keys(QUEST_DEFS).filter(k => questGeht(k) && !q.list.some(x => x.type === k)).sort(() => Math.random() - 0.5);
    for (let i = q.list.length; i < QUEST_TIER.length; i++) { const st = QUEST_TIER[i], j = frei.findIndex(k => QUEST_DEFS[k].steps[st] > 0); if (j < 0) break; q.list.push(questNeu(frei.splice(j, 1)[0], st)); }
}
function loadQuests() {
    const today = todayKey();
    if (!questState) { try { questState = JSON.parse(store.get('openWaterQuests')) || null; } catch (e) { questState = null; } }
    if (!questState || questState.date !== today || !Array.isArray(questState.list)) {
        questState = { date: today, bonusClaimed: false, bonus3: false, geprueft: questBereit() ? 1 : 0, frueh: questBereit() ? 0 : 1, list: [] };
        questAuffuellen(questState); saveQuests();
    }
    // Liste beim Skript-Start gewürfelt (aufbau.js/buendnis.js noch nicht da): einmal nachprüfen – ganz neu, solange nichts getan ist
    // (sonst kämen Bündnis-Aufgaben nie), sonst nur, was heute nicht geht, tauschen (Stufe bleibt) – sonst ist der Tagesbonus unmöglich
    if (questBereit() && !questState.geprueft) {
        questState.geprueft = 1;
        if (questState.frueh && questState.list.every(t => !t.claimed && !t.progress)) { questState.list = []; questAuffuellen(questState); }
        questState.list.forEach((t, i) => {
            if (t.claimed || t.progress > 0 || (QUEST_DEFS[t.type] && questGeht(t.type))) return;   // (Fortschritt bleibt)
            const st = t.st !== undefined ? t.st : i, frei = Object.keys(QUEST_DEFS).filter(k => !questState.list.some(x => x.type === k) && questGeht(k) && QUEST_DEFS[k].steps[st] > 0);
            if (!frei.length) return;
            const neu = frei[Math.floor(Math.random() * frei.length)];
            t.type = neu; t.target = QUEST_DEFS[neu].steps[st];
        });
        saveQuests();
    }
    if (questState.list.length < QUEST_TIER.length) { questAuffuellen(questState); saveQuests(); }   // (eine Liste von vorher mit 3 Aufgaben: bis 6 auffüllen)
    return questState;
}
function saveQuests() { store.set('openWaterQuests', JSON.stringify(questState)); }
function questProgress(type, n) {
    passBump(type, n); const q = loadQuests();
    if (type === 'crate' || type === 'schmiede') evPunkte('held', 'player', (type === 'crate' ? WO_PKT.kiste : WO_PKT.schmiede) * n);   // Wochen-Event Helden-Tag (beim Weltrechner zählt es das Hauptbuch)
    let finished = null;
    for (const t of q.list) {
        if (t.type !== type || t.progress >= t.target) continue;
        t.progress = Math.min(t.target, t.progress + n);
        if (t.progress >= t.target) finished = t;
    }
    saveQuests();
    if (finished) flashHint('Aufgabe erledigt: ' + QUEST_DEFS[finished.type].text(finished.target) + ' – unter „Events“ abholen.', 3500);
    updateGoalsBadge();
    if (isPanelOpen(goalsPopup)) renderQuestPanel();
}
function claimQuest(i) {
    const q = loadQuests(), t = q.list[i];
    if (!t || t.claimed || t.progress < t.target) return;
    t.claimed = true; passBump('quest'); anleitungAbgeholt();
    const c = t.h > 0 ? passMuenzen(hourProduction('player'), t.h) : 0; gems += t.gems; coins += c;   // (Münzen: so viel, wie dein Reich in t.h Stunden macht – der Weltrechner kennt den Topf)
    saveQuests(); saveGame(); updateHud();
    beuteFenster('Aufgabe erledigt', [{ a: 'gems', n: t.gems }, { a: 'coins', n: c }], { unter: QUEST_DEFS[t.type].text(t.target) });
    renderQuestPanel(); updateGoalsBadge();
}
const questFertigN = q => q.list.filter(t => t.claimed).length;
const questBonus3Bereit = q => !q.bonus3 && questFertigN(q) >= QUEST_BONUS3.n;
function claimQuestBonus3() {                          // 3 Aufgaben abgeholt: Truppen in die Hauptstadt (der Weltrechner prüft: einmal am Tag)
    const q = loadQuests(), b = rewardBaseId(); if (!questBonus3Bereit(q)) return;
    if (b === null) { flashHint('Truppen brauchen eine eigene Basis – erst dann abholbar.', 3000); return; }
    const n = passTruppen(hourProduction('player'), QUEST_BONUS3.tr); q.bonus3 = true; eigeneTruppenDazu(b, n, 'aufgabe'); anleitungAbgeholt();
    saveQuests(); saveGame(); updateHud(); sfx('coin');
    beuteFenster('Bonus: 3 erledigt', [{ a: 'tr', n }], { unter: fmtCompact(n) + ' Truppen in ' + islandTitle(islandById[b]) });
    renderQuestPanel(); updateGoalsBadge();
}
function claimQuestBonus() {
    const q = loadQuests();
    if (q.bonusClaimed || !q.list.every(t => t.claimed)) return;
    q.bonusClaimed = true; passBump('questBonus'); anleitungAbgeholt();
    const items = [];
    for (let i = 0; i < QUEST_BONUS.crates; i++) items.push(grantFreeCrate(0));
    gems += QUEST_BONUS.gems; const shH = heroGrantShards('player', HERO_SHARDS_DAY); if (!shH) gems += HERO_SHARDS_DAY * 20;   // (alle Helden voll)
    saveQuests(); saveGame(); saveProgression(); updateHud();
    beuteFenster('Bonus: alle ' + q.list.length + ' erledigt', [...items.map(itemBeute), { a: 'gems', n: QUEST_BONUS.gems + (shH ? 0 : HERO_SHARDS_DAY * 20) }, shH && { a: 'sh', n: HERO_SHARDS_DAY, held: shH.id }], { kiste: 'aus' });
    renderQuestPanel(); updateGoalsBadge();
}
function dailyGoalCount() {                                      // Events → Täglich: tasks and the bonus
    const q = loadQuests();
    return q.list.filter(t => !t.claimed && t.progress >= t.target).length + (questBonus3Bereit(q) ? 1 : 0) + (!q.bonusClaimed && q.list.every(t => t.claimed) ? 1 : 0);
}
// ---- Abholfach: prizes and spoils are sent here and collected by hand (Wochen-Event, Barbaren-Lager, Kriegsherr, Kopfgeld, Kampfbeute) ----
var inboxState = null;
function inboxList() { if (!inboxState) { try { inboxState = JSON.parse(store.get('openWaterInbox')); } catch (e) { inboxState = null; } if (!Array.isArray(inboxState)) inboxState = [];
        const m = {}; inboxState = inboxState.filter(x => { const k = inboxPiles(x), p = k && m[x.src]; if (!p) { if (k) m[x.src] = x; return true; } p.gems = (p.gems || 0) + (x.gems || 0); p.coins = (p.coins || 0) + (x.coins || 0); p.sh = (p.sh || 0) + (x.sh || 0); p.n = (p.n || 1) + (x.n || 1); return false; }); }   // (older saves: many single entries become one)
    return inboxState; }
const inboxFach = () => inboxList().filter(x => !(x.bis > Date.now()));   // das Abholfach zeigt Event-Belohnungen (bis) erst nach dem Event-/Tagesende
function inboxSave() { store.set('openWaterInbox', JSON.stringify(inboxList())); }
const INBOX_PILE = { fight: 1, bounty: 1 };   // these pile up in one entry each
const inboxPiles = x => !!INBOX_PILE[x.src] && !(x.crate >= 0) && !(x.kiste >= 0) && !x.schild;   // a crate keeps its own entry (one entry holds one crate)
const INBOX_SRC = { gift: { ic: 'gem', t: 'Geschenk' }, fight: { ic: 'attack', t: 'Kampfbeute' }, woche: { ic: 'rank', t: 'Wochen-Event' }, wboss: { ic: 'star', t: 'Kriegsherr' }, bounty: { ic: 'losses', t: 'Kopfgeld' }, haendler: { ic: 'coin', t: 'Händler' }, saison: { ic: 'crown', t: 'Welt-Saison' }, thron: { ic: 'crown', t: 'Thron-Event' }, lager: { ic: 'attack', t: 'Barbaren-Lager' } };
function inboxAdd(o) {                              // o: { src, title?, gems, coins, sh (hero shards), crate (lowest rarity, -1 none), em/s1/s2 (Event-Münzen, Schlüssel), besch (Beschleuniger-Dauer) } - all fights' spoils pile up in one entry
    o = Object.assign({ gems: 0, coins: 0, sh: 0, crate: -1, tr: 0, n: 1 }, o); o.gems = Math.round(o.gems); o.coins = Math.round(o.coins); o.tr = Math.round(o.tr);
    if (!(o.gems > 0 || o.coins > 0 || o.sh > 0 || o.crate >= 0 || o.tr > 0 || o.kiste >= 0 || o.schild > 0 || o.em > 0 || o.s1 > 0 || o.s2 > 0 || o.besch || o.b && o.b.length)) return 0;   // (kiste: genau diese Seltenheit, schild: Friedensschild Std. – Händler)
    const L = inboxList(), now = Date.now(), pile = inboxPiles(o) && L.find(x => x.src === o.src && inboxPiles(x));
    if (pile) { pile.coins = (pile.coins || 0) + o.coins; pile.gems = (pile.gems || 0) + o.gems; pile.sh = (pile.sh || 0) + (o.sh || 0); pile.n = (pile.n || 1) + 1; pile.at = now; } else L.unshift(Object.assign(o, { id: now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), at: now }));   // (shards pile up too)
    inboxSave(); updateGoalsBadge(); if (isPanelOpen(goalsPopup) && goalsTab === 'reward') renderInbox(); return o.coins || o.gems;
}
function inboxBeute(x) {                            // was im Fach liegt, als Kacheln (05e)
    return [{ a: 'eventMuenzen', n: x.em }, { a: 'schluessel2', n: x.s2 }, { a: 'schluessel1', n: x.s1 }, x.besch && { a: 'besch', dauer: x.besch, n: 1 }, { a: 'gems', n: x.gems }, { a: 'coins', n: x.coins }, x.crate >= 0 && { a: 'kiste', k: kisteVonR(x.crate), r: x.crate, min: x.crate > 0 }, { a: 'sh', n: x.sh }, { a: 'tr', n: x.tr },
        x.kiste >= 0 && { a: 'kiste', k: 'aus', r: x.kiste }, x.schild > 0 && { a: 'schild', n: x.schild }, ...(x.b || []).map(([a, n, e]) => ({ a, n, ...(e || {}) }))];
}
function inboxClaim(id, aus) {                      // into your coffers - returns what you got (aus: Belohnungs-Kacheln dazu)
    aus = aus || []; const L = inboxList(), i = L.findIndex(x => x.id === id); if (i < 0) return ''; const x = L.splice(i, 1)[0], got = [];
    if (x.gems) { gems += x.gems; got.push('+' + fmtNum(x.gems) + ' Edelsteine'); aus.push({ a: 'gems', n: x.gems }); } if (x.coins) { coins += x.coins; got.push('+' + fmtCompact(x.coins) + ' Münzen'); aus.push({ a: 'coins', n: x.coins }); }
    if (x.crate >= 0) { const it = grantFreeCrate(x.crate); if (it && it.rarity !== undefined) { got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); aus.push(itemBeute(it)); } }
    if (x.kiste >= 0 && x.kiste <= 2) { const it = addInventoryItem(pickRandomSlot(), x.kiste, 1); questProgress('crate', 1); if (it && it.rarity !== undefined) { got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); aus.push(itemBeute(it)); } }
    for (const [a, n, e] of x.b || []) { if (a === 'holz' && AUF) AUF.rohDazu('player', { h: n }); else gibBelohnung(a, n, e); got.push('+' + fmtCompact(n) + ' ' + ((BEUTE_ART[a] || {}).t || a)); aus.push({ a, n, ...(e || {}) }); }   // Gegenstände (Thron-Event)
    if (x.schild === 2) { const st = shieldStock(); st[2] = (st[2] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); got.push('Friedensschild 2 h'); aus.push({ a: 'schild', n: 2 }); }
    for (const [f, art] of [['em', 'eventMuenzen'], ['s1', 'schluessel1'], ['s2', 'schluessel2']]) if (x[f] > 0) { gibBelohnung(art, x[f]); got.push('+' + fmtNum(x[f]) + ' ' + BEUTE_ART[art].t); aus.push({ a: art, n: x[f] }); }
    if (BESCH_MIN[x.besch]) { gibBelohnung('besch', 1, { dauer: x.besch }); got.push('Beschleuniger ' + beschText(x.besch)); aus.push({ a: 'besch', dauer: x.besch, n: 1 }); }
    if (x.sh) { const h = heroGrantShards('player', x.sh); if (h) { got.push(x.sh + ' Splitter ' + h.name); aus.push({ a: 'sh', n: x.sh, held: h.id }); } else { gems += x.sh * 20; got.push('+' + x.sh * 20 + ' Edelsteine (alle Helden voll)'); aus.push({ a: 'gems', n: x.sh * 20 }); } }
    if (x.tr) { const b = rewardBaseId(); if (b !== null) { eigeneTruppenDazu(b, x.tr, 'geschenk'); got.push('+' + fmtCompact(x.tr) + ' Truppen'); aus.push({ a: 'tr', n: x.tr }); } else L.splice(i, 0, Object.assign({}, x, { gems: 0, coins: 0, sh: 0, crate: -1, kiste: -1, schild: 0, em: 0, s1: 0, s2: 0, besch: undefined })); }   // no base right now: only the troops stay in the inbox
    inboxSave(); saveGame(); saveProgression(); updateHud(); if (got.length) anleitungAbgeholt(); return got.join(', ');
}
function renderInbox() {
    const L = inboxFach(), el = document.getElementById('inboxList'); if (!el) return;
    setText(document.getElementById('inboxAside'), L.length ? L.length + ' bereit' : '');
    liveHtml(el, L.length ? L.map(x => { const d = INBOX_SRC[x.src] || INBOX_SRC.fight;
        return '<div class="inbox-row' + (x.src === 'fight' ? '' : ' is-gold') + '">' + icon(d.ic) + '<div><b>' + escapeHtml(x.title || d.t) + '</b>' + beuteRaster(inboxBeute(x), 'bk-mini') + '<small>' + (x.n > 1 ? x.n + (x.src === 'fight' ? ' Kämpfe' : '×') + ' · zuletzt ' : '') + 'vor ' + uhrHtml(x.at, 'vor') + '</small></div>' +
            '<button class="btn btn--primary btn--sm" type="button" data-inbox="' + x.id + '"><span>Abholen</span></button></div>'; }).join('') + (L.length > 1 ? '<button class="btn btn--secondary btn--sm inbox-all" type="button" data-inbox-all><span>Alle abholen · ' + L.length + '</span></button>' : '')
        : '<div class="inbox-empty">' + (dailyClaimable() ? 'Deine tägliche Belohnung wartet unten.' : 'Gerade nichts zum Abholen.') + '</div>');   // (eine Zeile – Preise und Beute landen hier von selbst)
}
goalsPopup.addEventListener('click', e => {
    const one = e.target.closest('[data-inbox]'), all = e.target.closest('[data-inbox-all]'); if (!one && !all) return;
    const aus = [], kiste = (all ? inboxFach() : inboxList().filter(x => x.id === one.dataset.inbox)).find(x => x.crate >= 0 || x.kiste >= 0);
    const txt = all ? inboxFach().map(x => x.id).map(id => inboxClaim(id, aus)).filter(Boolean).join(', ') : inboxClaim(one.dataset.inbox, aus);
    if (txt) { sfx('coin'); if (aus.length) beuteFenster('Abgeholt', aus, { kiste: kiste ? (kiste.crate >= 0 ? kisteVonR(kiste.crate) : 'aus') : null }); else flashHint('Abgeholt: ' + txt + '.', 4500); } renderInbox(); updateGoalsBadge();
});
function updateGoalsBadge(nAch) {
    if (nAch === undefined) nAch = achReadyN; else achReadyN = nAch;   // (the Erfolge are counted by achCheck - not before everything has loaded)
    const nd = dailyGoalCount(), nr = (dailyClaimable() ? 1 : 0) + inboxFach().length, np = passReadyAll().length, n = nd + nr + nAch + np, set = (el, v) => { setText(el, v); setShown(el, v > 0); };   // (only on a change: this runs every few seconds)
    set(document.getElementById('goalsBadge'), n); set(goalsPopup.querySelector('[data-gbadge="daily"]'), nd); set(goalsPopup.querySelector('[data-gbadge="reward"]'), nr); set(goalsPopup.querySelector('[data-gbadge="ach"]'), nAch); set(goalsPopup.querySelector('[data-gbadge="pass"]'), np);
    const hol = EV_TABS.filter(evHolBereit);
    for (const k of EV_TABS) setShown(goalsPopup.querySelector('[data-gbadge="' + k + '"]'), hol.includes(k));   // „!“ am Ereignis mit einer Belohnung zum Abholen
    evChipStatus();
    const g = k => goalsPopup.querySelector('[data-ggbadge="' + k + '"]');   // die 4 Reiter: Summe ihrer Unterreiter
    set(g('aufgaben'), nd + nAch); set(g('abholen'), nr); set(g('pass'), np); setShown(g('ereignisse'), hol.length > 0);
}
function renderQuestPanel() {
    const q = loadQuests();
    const day = dailyNextDay(), claimable = dailyClaimable(), r = DAILY_REWARDS[day - 1];
    document.getElementById('dailyCard').innerHTML =
        '<div class="daily-days">' + dailyDaysHtml() + '</div>' +
        '<div class="daily-row"><div class="daily-txt"><b>' + (claimable ? 'Tag ' + day + ': ' + dailyRewardLabel(r) : 'Heute abgeholt') + '</b>' +
        '<small>' + (claimable ? 'Bereit zum Abholen' : 'Nächste Belohnung in ' + uhrHtml(new Date().setHours(24, 0, 0, 0)) + ' · ' + dailyRewardLabel(DAILY_REWARDS[day % 7])) + '</small></div>' +
        (claimable ? '<button class="btn btn--primary btn--sm" type="button" data-daily>' + icon('shop') + '<span>Abholen</span></button>' : '<span class="quest-ok">Erledigt</span>') + '</div>';
    document.getElementById('dailyWeek').innerHTML = DAILY_REWARDS.map((w, i) => { const d = i + 1, done = d < day || (d === day && !claimable);   // the whole week at a glance
        return '<div class="' + (d === day && claimable ? 'is-today' : done ? 'is-done' : '') + '"><b>Tag ' + d + '</b><span>' + dailyRewardLabel(w) + '</span>' + (done ? icon('check') : '') + '</div>'; }).join('');
    liveHtml(document.getElementById('questReset'), 'Neu in ' + uhrHtml(new Date().setHours(24, 0, 0, 0)));   // (zählt live herunter)
    const hp = hourProduction('player');
    let html = q.list.map((t, i) => {
        const def = QUEST_DEFS[t.type], done = t.progress >= t.target;
        return '<div class="quest' + (t.claimed ? ' is-claimed' : done ? ' is-done' : '') + '">' + icon(def.icon) +
            '<div class="quest-main"><b>' + def.text(t.target) + '</b><div class="quest-bar"><i style="--p:' + Math.round(t.progress / t.target * 100) + '%"></i><span>' + t.progress + ' / ' + t.target + '</span></div></div>' +
            '<div class="quest-side"><span class="quest-rew">' + beuteKachel({ a: 'gems', n: t.gems }) + (t.h > 0 ? beuteKachel({ a: 'coins', n: passMuenzen(hp, t.h) }) : '') + '</span>' +
            (t.claimed ? '<span class="quest-ok">Abgeholt</span>' : done ? '<button class="btn btn--primary btn--sm" type="button" data-quest="' + i + '"><span>Abholen</span></button>' : '') +
            '</div></div>';
    }).join('');
    const allClaimed = q.list.every(t => t.claimed), doneCount = questFertigN(q), alle = q.list.length, n3 = QUEST_BONUS3.n, b3 = questBonus3Bereit(q);
    html += '<div class="quest' + (q.bonus3 ? ' is-claimed' : b3 ? ' is-done' : '') + '">' + icon('troops') +
        '<div class="quest-main"><b>Bonus: ' + n3 + ' erledigt</b><div class="quest-bar"><i style="--p:' + Math.round(Math.min(n3, doneCount) / n3 * 100) + '%"></i><span>' + Math.min(n3, doneCount) + ' / ' + n3 + '</span></div></div>' +
        '<div class="quest-side"><span class="quest-rew is-gold">' + beuteKachel({ a: 'tr', n: passTruppen(hp, QUEST_BONUS3.tr) }) + '</span>' +
        (q.bonus3 ? '<span class="quest-ok">Abgeholt</span>' : b3 ? '<button class="btn btn--primary btn--sm" type="button" data-bonus3><span>Abholen</span></button>' : '') + '</div></div>';
    html += '<div class="quest' + (q.bonusClaimed ? ' is-claimed' : allClaimed ? ' is-done' : '') + '">' + icon('star') +
        '<div class="quest-main"><b>Bonus: alle ' + alle + ' erledigt</b><div class="quest-bar"><i style="--p:' + Math.round(doneCount / alle * 100) + '%"></i><span>' + doneCount + ' / ' + alle + '</span></div></div>' +
        '<div class="quest-side"><span class="quest-rew is-gold">' + beuteKachel({ a: 'kiste', k: 'aus', n: QUEST_BONUS.crates }) + beuteKachel({ a: 'gems', n: QUEST_BONUS.gems }) + beuteKachel({ a: 'sh', n: HERO_SHARDS_DAY }) + '</span>' +
        (q.bonusClaimed ? '<span class="quest-ok">Abgeholt</span>' : allClaimed ? '<button class="btn btn--primary btn--sm" type="button" data-bonus><span>Abholen</span></button>' : '') + '</div></div>';
    document.getElementById('questList').innerHTML = html;
}
// ---- Events: one sheet, 4 Reiter - Aufgaben: Täglich (tasks + bonus), Erfolge · Abholen: Belohnung (Abholfach + 7-day login chest) ·
// Pass · Ereignisse: Wochen-Event, Barbaren-Lager (renderEvents); Unterreiter als Chips ----
const EV_TABS = ['tour', 'thron', 'lager'];
const GOALS_GRP = { aufgaben: ['daily', 'ach'], abholen: ['reward'], pass: ['pass'], ereignisse: EV_TABS }, goalsGrpLetzt = {};
const goalsGrpVon = t => Object.keys(GOALS_GRP).find(k => GOALS_GRP[k].includes(t));
function showGoalsTab(t) {
    goalsTab = t; const ev = EV_TABS.includes(t);
    const grp = goalsGrpVon(t), chips = document.getElementById('goalsTabs'); goalsGrpLetzt[grp] = t;
    for (const b of goalsPopup.querySelectorAll('[data-gtab]')) { const on = b.dataset.gtab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.hidden = b.dataset.ggrpVon !== grp; }
    for (const b of goalsPopup.querySelectorAll('[data-ggrp]')) { const on = b.dataset.ggrp === grp; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    chips.hidden = GOALS_GRP[grp].length < 2;   // Abholen und Pass: keine Chips
    for (const pn of goalsPopup.querySelectorAll('[data-gpane]')) pn.hidden = pn.dataset.gpane !== (ev ? 'ev' : t);
    if (ev) { evTab = t; woSicht = null; renderEvents(); } else if (t === 'ach') renderAchievements(); else if (t === 'pass') renderPass(); else renderQuestPanel(); if (t === 'reward') renderInbox();
    goalsPopup.querySelector('.pbody').scrollTop = 0; if (t === 'pass') requestAnimationFrame(passScroll); updateGoalsBadge();
}
function renderGoalsSub() { const q = loadQuests(), nd = q.list.filter(t => t.claimed).length, na = ACHIEVEMENTS.filter(a => achClaimed[a.id]).length;
    liveHtml(document.getElementById('goalsSub'), '<span class="pill">' + icon('flag') + '<b>' + nd + ' / ' + q.list.length + '</b><small>heute</small></span><span class="pill">' + icon('star') + '<b>' + na + ' / ' + ACHIEVEMENTS.length + '</b><small>Erfolge</small></span>'); }
function openGoals(tab) {
    closeAllPopups(); if (barbView) closeBarbSheet(); renderGoalsSub();
    const nd = dailyGoalCount(), na = achClaimable().length;
    showGoalsTab(tab || (dailyClaimable() || inboxFach().length ? 'reward' : nd ? 'daily' : na ? 'ach' : passReadyAll().length ? 'pass' : goalsTab)); openPanel(goalsPopup);   // roter Punkt: zuerst Abholen
}
document.getElementById('goalsBtn').addEventListener('click', () => { if (isPanelOpen(goalsPopup)) closePanel(goalsPopup); else openGoals(); });
document.getElementById('goalsCloseBtn').addEventListener('click', () => closePanel(goalsPopup));
document.getElementById('goalsTabs').addEventListener('click', e => { const b = e.target.closest('[data-gtab]'); if (b) showGoalsTab(b.dataset.gtab); });
document.getElementById('goalsGruppen').addEventListener('click', e => { const b = e.target.closest('[data-ggrp]'); if (!b) return; const g = b.dataset.ggrp;   // Reiter: der zuletzt offene Unterreiter
    showGoalsTab(goalsGrpLetzt[g] || GOALS_GRP[g][0]); });
goalsPopup.addEventListener('click', e => {
    const b = e.target.closest('button'); if (b && b.hasAttribute('data-daily')) return showDailyModal();   // Belohnung: the quick-claim window does the rest
    if (!b || !e.target.closest('[data-gpane="daily"]')) return;
    if (b.dataset.quest !== undefined) claimQuest(+b.dataset.quest);
    else if (b.hasAttribute('data-bonus3')) claimQuestBonus3();
    else if (b.hasAttribute('data-bonus')) claimQuestBonus();
    renderGoalsSub();
});
setInterval(() => {                 // day rollover while the game stays open
    if (questState && questState.date !== todayKey()) { loadQuests(); if (isPanelOpen(goalsPopup)) renderQuestPanel(); }
    updateGoalsBadge();
}, 60000);
updateGoalsBadge();
