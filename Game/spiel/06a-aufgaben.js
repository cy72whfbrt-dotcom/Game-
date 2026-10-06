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
function itemRewardRow(item) {
    const rd = RARITY_DEFS[item.rarity], def = EQUIPMENT_DEFS[item.slot];
    return '<li style="border-color:' + rd.color + '66">' + '<svg class="icon" style="color:' + rd.color + '"><use href="#i-' + def.icon + '"/></svg>' +
        '<span>' + def.name + '</span><b style="color:' + rd.color + '">' + rd.label + '</b></li>';
}
const dailyModal = document.getElementById('dailyModal');
function showDailyModal() {
    if (!dailyClaimable()) return;
    const day = dailyNextDay(), r = DAILY_REWARDS[day - 1];
    document.getElementById('dailyModalTitle').textContent = 'Tag ' + day;
    document.getElementById('dailyModalSub').textContent = day > 1 ? day + ' Tage in Folge – weiter so!' : 'Jeden Tag vorbeischauen lohnt sich.';
    document.getElementById('dailyModalDays').innerHTML = dailyDaysHtml();
    document.getElementById('dailyModalLabel').textContent = 'Heute';
    document.getElementById('dailyModalRewards').innerHTML =
        '<li>' + icon('shop', 'ico-coin') + '<span>' + (r.epic ? 'Epische Kiste (mind. Episch)' : r.crates === 1 ? 'Ausrüstungskiste' : 'Ausrüstungskisten') + '</span><b>×' + r.crates + '</b></li>' +
        (r.gems ? '<li>' + icon('gem', 'ico-gem') + '<span>Edelsteine</span><b>+' + r.gems + '</b></li>' : '');
    [...document.getElementById('dailyModalRewards').children].forEach((li, i) => { li.style.animationDelay = (150 + i * 110) + 'ms'; });
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
    const list = document.getElementById('dailyModalRewards');
    list.innerHTML = res.items.map(itemRewardRow).join('') + (res.gems ? '<li>' + icon('gem', 'ico-gem') + '<span>Edelsteine</span><b>+' + res.gems + '</b></li>' : '');
    [...list.children].forEach((li, i) => { li.style.animationDelay = (80 + i * 120) + 'ms'; });
    btn.dataset.state = 'done'; btn.querySelector('span').textContent = 'Weiter';
});
dailyModal.addEventListener('click', e => { if (e.target === dailyModal) closeDailyModal(); });

// ---- daily quests: 3 random tasks per day, gems each, bonus crate for all 3 ----
var QUEST_DEFS = {
    capture: { icon: 'flag',        text: n => 'Erobere ' + n + ' Basen',             steps: [3, 5, 8] },
    attack:  { icon: 'attack',      text: n => 'Starte ' + n + ' Angriffe',            steps: [5, 10, 15] },
    upgrade: { icon: 'upgrade',     text: n => 'Werte ' + n + '-mal Basen auf',        steps: [5, 10, 20] },
    pickup:  { icon: 'coin',        text: n => 'Sammle ' + n + ' Karten-Belohnungen',  steps: [2, 4, 6] },
    scout:   { icon: 'scout',       text: n => 'Späh ' + n + ' Basen aus',             steps: [2, 4, 6] },
    send:    { icon: 'send',        text: n => 'Schicke ' + n + '-mal Truppen',        steps: [2, 4, 6] },
    crate:   { icon: 'shop',        text: n => 'Öffne ' + n + (n === 1 ? ' Kiste' : ' Kisten'), steps: [1, 2, 3] },   // (jede Kiste: Shop, Helden-Kiste, Abholfach, Pass, Thron-Shop, Belohnungen)
    bau:     { icon: 'castle',      text: n => n === 1 ? 'Starte einen Bau in der Stadt' : 'Starte ' + n + ' Bauten in der Stadt', steps: [1, 1, 2], geht: () => questStadtGeht('bau') },
    forschung: { icon: 'flask',     text: () => 'Starte eine Forschung im Labor', steps: [1, 1, 1], geht: () => questStadtGeht('forschung') }
};
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
var QUEST_GEMS = [5, 10, 15];
var QUEST_BONUS = { crates: 1, gems: 10 };
var questState = null;
function loadQuests() {
    const today = todayKey();
    if (!questState) { try { questState = JSON.parse(store.get('openWaterQuests')) || null; } catch (e) { questState = null; } }
    if (!questState || questState.date !== today || !Array.isArray(questState.list)) {
        const types = Object.keys(QUEST_DEFS).filter(t => !QUEST_DEFS[t].geht || QUEST_DEFS[t].geht()).sort(() => Math.random() - 0.5).slice(0, 3);
        questState = { date: today, bonusClaimed: false, geprueft: AUF ? 1 : 0, list: types.map((type, i) => {
            const tier = i;                                  // one easy, one medium, one hard
            return { type, target: QUEST_DEFS[type].steps[tier], progress: 0, gems: QUEST_GEMS[tier], claimed: false };
        }) };
        saveQuests();
    }
    // Liste beim Skript-Start gewürfelt (aufbau.js noch nicht da, geht() sagte ja): einmal nachprüfen, sonst Tagesbonus unmöglich
    if (AUF && !questState.geprueft) {
        questState.geprueft = 1;
        questState.list.forEach((t, i) => {
            const def = QUEST_DEFS[t.type];
            if (!def || t.claimed || t.progress > 0 || !def.geht || def.geht()) return;   // (Fortschritt bleibt)
            const frei = Object.keys(QUEST_DEFS).filter(k => !questState.list.some(x => x.type === k) && (!QUEST_DEFS[k].geht || QUEST_DEFS[k].geht()));
            if (!frei.length) return;
            const neu = frei[Math.floor(Math.random() * frei.length)];
            t.type = neu; t.target = QUEST_DEFS[neu].steps[i];             // (Index = Stufe: leicht, mittel, schwer)
        });
        saveQuests();
    }
    return questState;
}
function saveQuests() { store.set('openWaterQuests', JSON.stringify(questState)); }
function questProgress(type, n) {
    passBump(type, n); const q = loadQuests();
    let finished = null;
    for (const t of q.list) {
        if (t.type !== type || t.progress >= t.target) continue;
        t.progress = Math.min(t.target, t.progress + n);
        if (t.progress >= t.target) finished = t;
    }
    saveQuests();
    if (finished) flashHint('Aufgabe erledigt: ' + QUEST_DEFS[finished.type].text(finished.target) + ' – unter „Events“ abholen.', 3500);
    if (finished && q.list.every(t => t.progress >= t.target)) chainLink();
    updateGoalsBadge();
    if (isPanelOpen(goalsPopup)) renderQuestPanel();
}
function claimQuest(i) {
    const q = loadQuests(), t = q.list[i];
    if (!t || t.claimed || t.progress < t.target) return;
    t.claimed = true; passBump('quest'); anleitungAbgeholt();
    gems += t.gems;
    saveQuests(); saveGame(); updateHud();
    flashHint('+' + t.gems + ' Edelsteine', 1800);
    renderQuestPanel(); updateGoalsBadge();
}
// ---- the week chain: every day with ALL tasks done is a link; 7 in a row = the big chest ----
const CHAIN_REWARD = { crates: 3, minRarity: 3, gems: 150 };
let questChain = (() => { try { return JSON.parse(store.get('openWaterQuestChain')) || { streak: 0, last: null }; } catch (e) { return { streak: 0, last: null }; } })();
function chainStreak() { return questChain.last === todayKey() || questChain.last === yesterdayKey() ? questChain.streak : 0; }   // a missed day breaks the chain
function chainLink() {
    if (questChain.last === todayKey()) return;
    questChain.streak = (questChain.last === yesterdayKey() ? questChain.streak : 0) + 1; questChain.last = todayKey();
    store.set('openWaterQuestChain', JSON.stringify(questChain));
    flashHint(questChain.streak >= 7 ? 'Wochenkette voll – hol dir die große Kiste!' : 'Wochenkette: Tag ' + questChain.streak + ' von 7 geschafft.', 3500);
}
function claimChain() {
    if (chainStreak() < 7) return;
    const items = []; for (let i = 0; i < CHAIN_REWARD.crates; i++) items.push(grantFreeCrate(CHAIN_REWARD.minRarity));
    gems += CHAIN_REWARD.gems; questChain.streak = Math.max(0, questChain.streak - 7); store.set('openWaterQuestChain', JSON.stringify(questChain));   // (ein 8. Tag zählt schon für die nächste Kette)
    const shH = heroGrantShards('player', HERO_SHARDS_CHAIN); if (!shH) gems += HERO_SHARDS_CHAIN * 20;   // (alle Helden voll: Gems statt Splitter, wie im Abholfach)
    saveGame(); saveProgression(); updateHud(); sfx('crate'); anleitungAbgeholt();
    flashHint('Große Kiste: ' + items.map(it => RARITY_DEFS[it.rarity].label + ' ' + EQUIPMENT_DEFS[it.slot].name).join(', ') + ' + ' + CHAIN_REWARD.gems + ' Edelsteine' + (shH ? ' + ' + HERO_SHARDS_CHAIN + ' Splitter ' + shH.name : ''), 5000);
    renderQuestPanel(); updateGoalsBadge();
}
function claimQuestBonus() {
    const q = loadQuests();
    if (q.bonusClaimed || !q.list.every(t => t.claimed)) return;
    q.bonusClaimed = true; chainLink(); passBump('questBonus'); anleitungAbgeholt();
    const items = [];
    for (let i = 0; i < QUEST_BONUS.crates; i++) items.push(grantFreeCrate(0));
    gems += QUEST_BONUS.gems; const shH = heroGrantShards('player', HERO_SHARDS_DAY); if (!shH) gems += HERO_SHARDS_DAY * 20;   // (alle Helden voll)
    saveQuests(); saveGame(); saveProgression(); updateHud();
    const it = items[0];
    flashHint('Bonus: ' + RARITY_DEFS[it.rarity].label + ' ' + EQUIPMENT_DEFS[it.slot].name + ' + ' + QUEST_BONUS.gems + ' Edelsteine' + (shH ? ' + ' + HERO_SHARDS_DAY + ' Splitter ' + shH.name : ''), 3000);
    renderQuestPanel(); updateGoalsBadge();
}
function dailyGoalCount() {                                      // Events → Täglich: tasks, the bonus and the week chain
    const q = loadQuests();
    return q.list.filter(t => !t.claimed && t.progress >= t.target).length + (!q.bonusClaimed && q.list.every(t => t.claimed) ? 1 : 0) + (chainStreak() >= 7 ? 1 : 0);
}
// ---- Abholfach: prizes and spoils are sent here and collected by hand (Wochen-Event, Invasion, Drache, Tagesboss, Kriegsherr, Kopfgeld, Kampfbeute) ----
var inboxState = null;
function inboxList() { if (!inboxState) { try { inboxState = JSON.parse(store.get('openWaterInbox')); } catch (e) { inboxState = null; } if (!Array.isArray(inboxState)) inboxState = [];
        const m = {}; inboxState = inboxState.filter(x => { const k = inboxPiles(x), p = k && m[x.src]; if (!p) { if (k) m[x.src] = x; return true; } p.gems = (p.gems || 0) + (x.gems || 0); p.coins = (p.coins || 0) + (x.coins || 0); p.sh = (p.sh || 0) + (x.sh || 0); p.n = (p.n || 1) + (x.n || 1); return false; }); }   // (older saves: many single entries become one)
    return inboxState; }
function inboxSave() { store.set('openWaterInbox', JSON.stringify(inboxList())); }
const INBOX_PILE = { fight: 1, bounty: 1 };   // these pile up in one entry each
const inboxPiles = x => !!INBOX_PILE[x.src] && !(x.crate >= 0) && !(x.kiste >= 0) && !x.schild;   // a crate keeps its own entry (one entry holds one crate)
const INBOX_SRC = { gift: { ic: 'gem', t: 'Geschenk' }, fight: { ic: 'attack', t: 'Kampfbeute' }, woche: { ic: 'rank', t: 'Wochen-Event' }, boss: { ic: 'star', t: 'Tagesboss' }, wboss: { ic: 'star', t: 'Kriegsherr' }, bounty: { ic: 'losses', t: 'Kopfgeld' }, inv: { ic: 'defense', t: 'Barbaren-Invasion' }, drache: { ic: 'star', t: 'Drache' }, haendler: { ic: 'coin', t: 'Händler' }, saison: { ic: 'crown', t: 'Welt-Saison' } };
function inboxAdd(o) {                              // o: { src, title?, gems, coins, sh (hero shards), crate (lowest rarity, -1 none) } - all fights' spoils pile up in one entry
    o = Object.assign({ gems: 0, coins: 0, sh: 0, crate: -1, tr: 0, n: 1 }, o); o.gems = Math.round(o.gems); o.coins = Math.round(o.coins); o.tr = Math.round(o.tr);
    if (!(o.gems > 0 || o.coins > 0 || o.sh > 0 || o.crate >= 0 || o.tr > 0 || o.kiste >= 0 || o.schild > 0)) return 0;   // (kiste: genau diese Seltenheit, schild: Friedensschild Std. – Händler)
    const L = inboxList(), now = Date.now(), pile = inboxPiles(o) && L.find(x => x.src === o.src && inboxPiles(x));
    if (pile) { pile.coins = (pile.coins || 0) + o.coins; pile.gems = (pile.gems || 0) + o.gems; pile.sh = (pile.sh || 0) + (o.sh || 0); pile.n = (pile.n || 1) + 1; pile.at = now; } else L.unshift(Object.assign(o, { id: now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), at: now }));   // (shards pile up too)
    inboxSave(); updateGoalsBadge(); if (isPanelOpen(goalsPopup) && goalsTab === 'reward') renderInbox(); return o.coins || o.gems;
}
function inboxWhat(x) { return [x.gems ? '+' + fmtNum(x.gems) + ' Edelsteine' : '', x.coins ? '+' + fmtCompact(x.coins) + ' Münzen' : '', x.crate >= 0 ? 'Kiste (mind. ' + RARITY_DEFS[x.crate].label + ')' : '', x.sh ? x.sh + ' Helden-Splitter' : '', x.tr ? '+' + fmtCompact(x.tr) + ' Truppen' : '', x.kiste >= 0 ? 'Kiste (' + RARITY_DEFS[x.kiste].label + ')' : '', x.schild ? 'Friedensschild ' + x.schild + ' h' : ''].filter(Boolean).join(' · '); }
function inboxClaim(id) {                           // into your coffers - returns what you got
    const L = inboxList(), i = L.findIndex(x => x.id === id); if (i < 0) return ''; const x = L.splice(i, 1)[0], got = [];
    if (x.gems) { gems += x.gems; got.push('+' + fmtNum(x.gems) + ' Edelsteine'); } if (x.coins) { coins += x.coins; got.push('+' + fmtCompact(x.coins) + ' Münzen'); }
    if (x.crate >= 0) { const it = grantFreeCrate(x.crate); if (it && it.rarity !== undefined) got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); }
    if (x.kiste >= 0 && x.kiste <= 2) { const it = addInventoryItem(pickRandomSlot(), x.kiste, 1); questProgress('crate', 1); if (it && it.rarity !== undefined) got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); }
    if (x.schild === 2) { const st = shieldStock(); st[2] = (st[2] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); got.push('Friedensschild 2 h'); }
    if (x.sh) { const h = heroGrantShards('player', x.sh); if (h) got.push(x.sh + ' Splitter ' + h.name); else { gems += x.sh * 20; got.push('+' + x.sh * 20 + ' Edelsteine (alle Helden voll)'); } }
    if (x.tr) { const b = rewardBaseId(); if (b !== null) { eigeneTruppenDazu(b, x.tr, 'geschenk'); got.push('+' + fmtCompact(x.tr) + ' Truppen'); } else L.splice(i, 0, Object.assign({}, x, { gems: 0, coins: 0, sh: 0, crate: -1, kiste: -1, schild: 0 })); }   // no base right now: only the troops stay in the inbox
    inboxSave(); saveGame(); saveProgression(); updateHud(); if (got.length) anleitungAbgeholt(); return got.join(', ');
}
function renderInbox() {
    const L = inboxList(), now = Date.now(), el = document.getElementById('inboxList'); if (!el) return;
    setText(document.getElementById('inboxAside'), L.length ? L.length + ' bereit' : '');
    liveHtml(el, L.length ? L.map(x => { const d = INBOX_SRC[x.src] || INBOX_SRC.fight;
        return '<div class="inbox-row' + (x.src === 'fight' ? '' : ' is-gold') + '">' + icon(d.ic) + '<div><b>' + escapeHtml(x.title || d.t) + '</b><small>' + inboxWhat(x) + '</small><small>' + (x.n > 1 ? x.n + (x.src === 'fight' ? ' Kämpfe' : '×') + ' · zuletzt ' : '') + 'vor ' + uhrHtml(x.at, 'vor') + '</small></div>' +
            '<button class="btn btn--primary btn--sm" type="button" data-inbox="' + x.id + '"><span>Abholen</span></button></div>'; }).join('') + (L.length > 1 ? '<button class="btn btn--secondary btn--sm inbox-all" type="button" data-inbox-all><span>Alle abholen · ' + L.length + '</span></button>' : '')
        : '<div class="inbox-empty">' + (dailyClaimable() ? 'Deine tägliche Belohnung wartet gleich hier unten. Sonst gerade nichts zum Abholen – ' : 'Gerade nichts zum Abholen. ') + 'Preise aus Wochen-Event, Invasion, Drache und Tagesboss, das Kopfgeld und das Gold aus deinen Kämpfen landen hier.</div>');
}
goalsPopup.addEventListener('click', e => {
    const one = e.target.closest('[data-inbox]'), all = e.target.closest('[data-inbox-all]'); if (!one && !all) return;
    const txt = all ? inboxList().map(x => x.id).map(inboxClaim).filter(Boolean).join(', ') : inboxClaim(one.dataset.inbox);
    if (txt) { sfx('coin'); flashHint('Abgeholt: ' + txt + '.', 4500); } renderInbox(); updateGoalsBadge();
});
function updateGoalsBadge(nAch) {
    if (nAch === undefined) nAch = achReadyN; else achReadyN = nAch;   // (the Erfolge are counted by achCheck - not before everything has loaded)
    const nd = dailyGoalCount(), nr = (dailyClaimable() ? 1 : 0) + inboxList().length, np = passReadyAll().length, n = nd + nr + nAch + np, set = (el, v) => { setText(el, v); setShown(el, v > 0); };   // (only on a change: this runs every few seconds)
    set(document.getElementById('goalsBadge'), n); set(goalsPopup.querySelector('[data-gbadge="daily"]'), nd); set(goalsPopup.querySelector('[data-gbadge="reward"]'), nr); set(goalsPopup.querySelector('[data-gbadge="ach"]'), nAch); set(goalsPopup.querySelector('[data-gbadge="pass"]'), np);
    const jetzt = evJetzt(); for (const k of ['inv', 'drache']) setShown(goalsPopup.querySelector('[data-gbadge="' + k + '"]'), jetzt === k);   // „!“ am Ereignis, das gerade läuft
    const g = k => goalsPopup.querySelector('[data-ggbadge="' + k + '"]');   // die 4 Reiter: Summe ihrer Unterreiter
    set(g('aufgaben'), nd + nAch); set(g('abholen'), nr); set(g('pass'), np); setShown(g('ereignisse'), jetzt === 'inv' || jetzt === 'drache');
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
    { const k = chainStreak(), full = k >= 7;                                        // the week chain: 7 links, the chest at the end
      document.getElementById('chainCard').innerHTML = '<div class="chain-links">' + Array.from({ length: 7 }, (_, i) => '<span class="chain-link' + (i < k ? ' on' : '') + '">' + (i < k ? icon('check') : i + 1) + '</span>').join('') +
        '<span class="chain-chest' + (full ? ' on' : '') + '">' + icon('shop') + '</span></div>' +
        '<div class="daily-row"><div class="daily-txt"><b>' + (full ? 'Große Kiste bereit!' : k + ' von 7 Tagen') + '</b><small>' + (full ? CHAIN_REWARD.crates + ' Kisten (mind. episch) + ' + CHAIN_REWARD.gems + ' Edelsteine' : 'Schaffe jeden Tag alle Aufgaben – ein verpasster Tag bricht die Kette.') + '</small></div>' +
        (full ? '<button class="btn btn--primary btn--sm" type="button" data-chain>' + icon('shop') + '<span>Abholen</span></button>' : '') + '</div>'; }
    let html = q.list.map((t, i) => {
        const def = QUEST_DEFS[t.type], done = t.progress >= t.target;
        return '<div class="quest' + (t.claimed ? ' is-claimed' : done ? ' is-done' : '') + '">' + icon(def.icon) +
            '<div class="quest-main"><b>' + def.text(t.target) + '</b><div class="quest-bar"><i style="--p:' + Math.round(t.progress / t.target * 100) + '%"></i><span>' + t.progress + ' / ' + t.target + '</span></div></div>' +
            '<div class="quest-side"><span class="quest-rew">' + icon('gem') + t.gems + '</span>' +
            (t.claimed ? '<span class="quest-ok">Abgeholt</span>' : done ? '<button class="btn btn--primary btn--sm" type="button" data-quest="' + i + '"><span>Abholen</span></button>' : '') +
            '</div></div>';
    }).join('');
    const allClaimed = q.list.every(t => t.claimed), doneCount = q.list.filter(t => t.claimed).length;
    html += '<div class="quest' + (q.bonusClaimed ? ' is-claimed' : allClaimed ? ' is-done' : '') + '">' + icon('star') +
        '<div class="quest-main"><b>Bonus: alle erledigt</b><div class="quest-bar"><i style="--p:' + Math.round(doneCount / 3 * 100) + '%"></i><span>' + doneCount + ' / 3</span></div></div>' +
        '<div class="quest-side"><span class="quest-rew is-gold">' + icon('shop') + 'Kiste + ' + QUEST_BONUS.gems + icon('gem') + '</span>' +
        (q.bonusClaimed ? '<span class="quest-ok">Abgeholt</span>' : allClaimed ? '<button class="btn btn--primary btn--sm" type="button" data-bonus><span>Abholen</span></button>' : '') + '</div></div>';
    document.getElementById('questList').innerHTML = html;
}
// ---- Events: one sheet, 4 Reiter - Aufgaben: Täglich (tasks + week chain), Erfolge · Abholen: Belohnung (Abholfach + 7-day login chest) ·
// Pass · Ereignisse: Wochen-Event, Invasion, Drache, Tagesboss + Barbaren-Lager (renderEvents); Unterreiter als Chips ----
const EV_TABS = ['tour', 'inv', 'drache', 'boss'];
const GOALS_GRP = { aufgaben: ['daily', 'ach'], abholen: ['reward'], pass: ['pass'], ereignisse: EV_TABS }, goalsGrpLetzt = {};
const goalsGrpVon = t => Object.keys(GOALS_GRP).find(k => GOALS_GRP[k].includes(t));
function showGoalsTab(t) {
    if (t === 'alle') t = 'boss';
    goalsTab = t; const ev = EV_TABS.includes(t);
    const grp = goalsGrpVon(t), chips = document.getElementById('goalsTabs'); goalsGrpLetzt[grp] = t;
    for (const b of goalsPopup.querySelectorAll('[data-gtab]')) { const on = b.dataset.gtab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.hidden = b.dataset.ggrpVon !== grp; }
    for (const b of goalsPopup.querySelectorAll('[data-ggrp]')) { const on = b.dataset.ggrp === grp; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    chips.hidden = GOALS_GRP[grp].length < 2;   // Abholen und Pass: keine Chips
    for (const pn of goalsPopup.querySelectorAll('[data-gpane]')) pn.hidden = pn.dataset.gpane !== (ev ? 'ev' : t);
    if (ev) { evTab = t; renderEvents(); } else if (t === 'ach') renderAchievements(); else if (t === 'pass') renderPass(); else renderQuestPanel(); if (t === 'reward') renderInbox();
    goalsPopup.querySelector('.pbody').scrollTop = 0; if (t === 'pass') requestAnimationFrame(passScroll); updateGoalsBadge();
}
function renderGoalsSub() { const q = loadQuests(), nd = q.list.filter(t => t.claimed).length, na = ACHIEVEMENTS.filter(a => achClaimed[a.id]).length;
    liveHtml(document.getElementById('goalsSub'), '<span class="pill">' + icon('flag') + '<b>' + nd + ' / 3</b><small>heute</small></span><span class="pill">' + icon('star') + '<b>' + na + ' / ' + ACHIEVEMENTS.length + '</b><small>Erfolge</small></span>'); }
function openGoals(tab) {
    closeAllPopups(); if (barbView) closeBarbSheet(); renderGoalsSub();
    const nd = dailyGoalCount(), na = achClaimable().length;
    showGoalsTab(tab || (dailyClaimable() || inboxList().length ? 'reward' : nd ? 'daily' : na ? 'ach' : passReadyAll().length ? 'pass' : evJetzt() || goalsTab)); openPanel(goalsPopup);   // roter Punkt: zuerst Abholen
}
document.getElementById('goalsBtn').addEventListener('click', () => { if (isPanelOpen(goalsPopup)) closePanel(goalsPopup); else openGoals(); });
document.getElementById('goalsCloseBtn').addEventListener('click', () => closePanel(goalsPopup));
document.getElementById('goalsTabs').addEventListener('click', e => { const b = e.target.closest('[data-gtab]'); if (b) showGoalsTab(b.dataset.gtab); });
document.getElementById('goalsGruppen').addEventListener('click', e => { const b = e.target.closest('[data-ggrp]'); if (!b) return; const g = b.dataset.ggrp;   // Reiter: der zuletzt offene Unterreiter
    showGoalsTab(goalsGrpLetzt[g] || (g === 'ereignisse' ? evJetzt() || 'tour' : GOALS_GRP[g][0])); });
goalsPopup.addEventListener('click', e => {
    const b = e.target.closest('button'); if (b && b.hasAttribute('data-daily')) return showDailyModal();   // Belohnung: the quick-claim window does the rest
    if (!b || !e.target.closest('[data-gpane="daily"]')) return;
    if (b.dataset.quest !== undefined) claimQuest(+b.dataset.quest);
    else if (b.hasAttribute('data-bonus')) claimQuestBonus();
    else if (b.hasAttribute('data-chain')) claimChain();
    renderGoalsSub();
});
setInterval(() => {                 // day rollover while the game stays open
    if (questState && questState.date !== todayKey()) { loadQuests(); if (isPanelOpen(goalsPopup)) renderQuestPanel(); }
    updateGoalsBadge();
}, 60000);
updateGoalsBadge();
