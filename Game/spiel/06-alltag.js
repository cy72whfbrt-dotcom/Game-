// ===== Teil 06-alltag.js: Aufgaben, Saison-Pass, Anleitung, Thron-Punkte, die Mitte, Kopfgeld, Friedensschild, Willkommen zurück, Nebel =====
// ===== AUFGABEN (daily quests) + TÄGLICHE BELOHNUNG =====

// (VIP ist seit 2.10. ganz raus – Alexander)
function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); }
function msToMidnight() { const d = new Date(); const m = new Date(d); m.setHours(24, 0, 0, 0); return m - d; }

// Grants one crate item (like the shop) - minRarity for the big day-7 chest.
function grantFreeCrate(minRarity) {
    return addInventoryItem(pickRandomSlot(), Math.max(minRarity || 0, pickRandomRarity()), 1);
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
    return (r.epic ? 'Epische Kiste' : r.crates + (r.crates === 1 ? ' Kiste' : ' Kisten')) + (r.gems ? ' + ' + r.gems + ' Gems' : '');
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
    saveGame(); saveProgression(); updateHud(); updateGoalsBadge();
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
        (r.gems ? '<li>' + icon('gem', 'ico-gem') + '<span>Gems</span><b>+' + r.gems + '</b></li>' : '');
    [...document.getElementById('dailyModalRewards').children].forEach((li, i) => { li.style.animationDelay = (150 + i * 110) + 'ms'; });
    const btn = document.getElementById('dailyModalBtn');
    btn.dataset.state = 'claim'; btn.querySelector('span').textContent = 'Abholen';
    dailyModal.hidden = false;
}
function closeDailyModal() {
    if (dailyModal.hidden) return false;
    dailyModal.hidden = true;
    if (isPanelOpen(goalsPopup)) { renderQuestPanel(); updateGoalsBadge(); }
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
    list.innerHTML = res.items.map(itemRewardRow).join('') + (res.gems ? '<li>' + icon('gem', 'ico-gem') + '<span>Gems</span><b>+' + res.gems + '</b></li>' : '');
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
    crate:   { icon: 'shop',        text: n => 'Öffne ' + n + (n === 1 ? ' Kiste' : ' Kisten') + ' im Shop', steps: [1, 2, 3] }
};
var QUEST_GEMS = [5, 10, 15];
var QUEST_BONUS = { crates: 1, gems: 10 };
var questState = null;
function loadQuests() {
    const today = todayKey();
    if (!questState) { try { questState = JSON.parse(store.get('openWaterQuests')) || null; } catch (e) { questState = null; } }
    if (!questState || questState.date !== today || !Array.isArray(questState.list)) {
        const types = Object.keys(QUEST_DEFS).sort(() => Math.random() - 0.5).slice(0, 3);
        questState = { date: today, bonusClaimed: false, list: types.map((type, i) => {
            const tier = i;                                  // one easy, one medium, one hard
            return { type, target: QUEST_DEFS[type].steps[tier], progress: 0, gems: QUEST_GEMS[tier], claimed: false };
        }) };
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
    t.claimed = true; passBump('quest');
    gems += t.gems;
    saveQuests(); saveGame(); updateHud();
    flashHint('+' + t.gems + ' Gems', 1800);
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
    saveGame(); saveProgression(); updateHud(); sfx('crate');
    flashHint('Große Kiste: ' + items.map(it => RARITY_DEFS[it.rarity].label + ' ' + EQUIPMENT_DEFS[it.slot].name).join(', ') + ' + ' + CHAIN_REWARD.gems + ' Gems' + (shH ? ' + ' + HERO_SHARDS_CHAIN + ' Splitter ' + shH.name : ''), 5000);
    renderQuestPanel(); updateGoalsBadge();
}
function claimQuestBonus() {
    const q = loadQuests();
    if (q.bonusClaimed || !q.list.every(t => t.claimed)) return;
    q.bonusClaimed = true; chainLink(); passBump('questBonus');
    const items = [];
    for (let i = 0; i < QUEST_BONUS.crates; i++) items.push(grantFreeCrate(0));
    gems += QUEST_BONUS.gems; const shH = heroGrantShards('player', HERO_SHARDS_DAY); if (!shH) gems += HERO_SHARDS_DAY * 20;   // (alle Helden voll)
    saveQuests(); saveGame(); saveProgression(); updateHud();
    const it = items[0];
    flashHint('Bonus: ' + RARITY_DEFS[it.rarity].label + ' ' + EQUIPMENT_DEFS[it.slot].name + ' + ' + QUEST_BONUS.gems + ' Gems' + (shH ? ' + ' + HERO_SHARDS_DAY + ' Splitter ' + shH.name : ''), 3000);
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
function inboxWhat(x) { return [x.gems ? '+' + fmtNum(x.gems) + ' Gems' : '', x.coins ? '+' + fmtCompact(x.coins) + ' Münzen' : '', x.crate >= 0 ? 'Kiste (mind. ' + RARITY_DEFS[x.crate].label + ')' : '', x.sh ? x.sh + ' Helden-Splitter' : '', x.tr ? '+' + fmtCompact(x.tr) + ' Truppen' : '', x.kiste >= 0 ? 'Kiste (' + RARITY_DEFS[x.kiste].label + ')' : '', x.schild ? 'Friedensschild ' + x.schild + ' h' : ''].filter(Boolean).join(' · '); }
function inboxClaim(id) {                           // into your coffers - returns what you got
    const L = inboxList(), i = L.findIndex(x => x.id === id); if (i < 0) return ''; const x = L.splice(i, 1)[0], got = [];
    if (x.gems) { gems += x.gems; got.push('+' + fmtNum(x.gems) + ' Gems'); } if (x.coins) { coins += x.coins; got.push('+' + fmtCompact(x.coins) + ' Münzen'); }
    if (x.crate >= 0) { const it = grantFreeCrate(x.crate); if (it && it.rarity !== undefined) got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); }
    if (x.kiste >= 0 && x.kiste <= 2) { const it = addInventoryItem(pickRandomSlot(), x.kiste, 1); if (it && it.rarity !== undefined) got.push(EQUIPMENT_DEFS[it.slot].name + ' (' + RARITY_DEFS[it.rarity].label + ')'); }
    if (x.schild === 2) { const st = shieldStock(); st[2] = (st[2] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); got.push('Friedensschild 2 h'); }
    if (x.sh) { const h = heroGrantShards('player', x.sh); if (h) got.push(x.sh + ' Splitter ' + h.name); else { gems += x.sh * 20; got.push('+' + x.sh * 20 + ' Gems (alle Helden voll)'); } }
    if (x.tr) { const b = rewardBaseId(); if (b !== null) { eigeneTruppenDazu(b, x.tr, 'geschenk'); got.push('+' + fmtCompact(x.tr) + ' Truppen'); } else L.splice(i, 0, Object.assign({}, x, { gems: 0, coins: 0, sh: 0, crate: -1, kiste: -1, schild: 0 })); }   // no base right now: only the troops stay in the inbox
    inboxSave(); saveGame(); saveProgression(); updateHud(); return got.join(', ');
}
function renderInbox() {
    const L = inboxList(), now = Date.now(), el = document.getElementById('inboxList'); if (!el) return;
    setText(document.getElementById('inboxAside'), L.length ? L.length + ' bereit' : '');
    liveHtml(el, L.length ? L.map(x => { const d = INBOX_SRC[x.src] || INBOX_SRC.fight;
        return '<div class="inbox-row' + (x.src === 'fight' ? '' : ' is-gold') + '">' + icon(d.ic) + '<div><b>' + escapeHtml(x.title || d.t) + '</b><small>' + inboxWhat(x) + '</small><small>' + (x.n > 1 ? x.n + (x.src === 'fight' ? ' Kämpfe' : '×') + ' · zuletzt ' : '') + 'vor ' + uhrHtml(x.at, 'vor') + '</small></div>' +
            '<button class="btn btn--primary btn--sm" type="button" data-inbox="' + x.id + '"><span>Abholen</span></button></div>'; }).join('') + (L.length > 1 ? '<button class="btn btn--secondary btn--sm inbox-all" type="button" data-inbox-all><span>Alle abholen · ' + L.length + '</span></button>' : '')
        : '<div class="inbox-empty">Gerade nichts zum Abholen. Preise aus Wochen-Event, Invasion, Drache und Tagesboss, das Kopfgeld und das Gold aus deinen Kämpfen landen hier.</div>');
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
        '<div class="daily-row"><div class="daily-txt"><b>' + (full ? 'Große Kiste bereit!' : k + ' von 7 Tagen') + '</b><small>' + (full ? CHAIN_REWARD.crates + ' Kisten (mind. episch) + ' + CHAIN_REWARD.gems + ' Gems' : 'Schaffe jeden Tag alle Aufgaben – ein verpasster Tag bricht die Kette.') + '</small></div>' +
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
// ---- Events: one sheet - oben die Aufgaben: Täglich (tasks + week chain), Belohnung (Abholfach + 7-day login chest), Erfolge, Pass;
// unten die Ereignisse: Wochen-Event, Invasion, Drache, Tagesboss + Barbaren-Lager (renderEvents) ----
const EV_TABS = ['tour', 'inv', 'drache', 'boss'];
function showGoalsTab(t) {
    if (t === 'alle') t = 'boss';
    goalsTab = t; const ev = EV_TABS.includes(t);
    for (const b of goalsPopup.querySelectorAll('[data-gtab]')) { const on = b.dataset.gtab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const pn of goalsPopup.querySelectorAll('[data-gpane]')) pn.hidden = pn.dataset.gpane !== (ev ? 'ev' : t);
    if (ev) { evTab = t; renderEvents(); } else if (t === 'ach') renderAchievements(); else if (t === 'pass') renderPass(); else renderQuestPanel(); if (t === 'reward') renderInbox();
    goalsPopup.querySelector('.pbody').scrollTop = 0; if (t === 'pass') requestAnimationFrame(passScroll); updateGoalsBadge();
}
function renderGoalsSub() { const q = loadQuests(), nd = q.list.filter(t => t.claimed).length, na = ACHIEVEMENTS.filter(a => achClaimed[a.id]).length;
    liveHtml(document.getElementById('goalsSub'), '<span class="pill">' + icon('flag') + '<b>' + nd + ' / 3</b><small>heute</small></span><span class="pill">' + icon('star') + '<b>' + na + ' / ' + ACHIEVEMENTS.length + '</b><small>Erfolge</small></span>'); }
function openGoals(tab) {
    closeAllPopups(); if (barbView) closeBarbSheet(); renderGoalsSub();
    const nd = dailyGoalCount(), na = achClaimable().length;
    showGoalsTab(tab || (nd ? 'daily' : dailyClaimable() || inboxList().length ? 'reward' : na ? 'ach' : passReadyAll().length ? 'pass' : evJetzt() || goalsTab)); openPanel(goalsPopup);
}
document.getElementById('goalsBtn').addEventListener('click', () => { if (isPanelOpen(goalsPopup)) closePanel(goalsPopup); else openGoals(); });
document.getElementById('goalsCloseBtn').addEventListener('click', () => closePanel(goalsPopup));
document.getElementById('goalsTabs').addEventListener('click', e => { const b = e.target.closest('[data-gtab]'); if (b) showGoalsTab(b.dataset.gtab); });
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
// ===== SAISON-PASS: 28 days on one calendar for everyone, 40 levels of 300 points, a free row and a premium row (Gems, never money). Points come from what you do anyway =====
var PASS_EPOCH = Date.UTC(2026, 0, 5), PASS_LEN = 28 * 86400000, PASS_GRACE = 3 * 86400000, PASS_LVLS = 40, PASS_STEP = 300, PASS_PREMIUM = 1000, PASS_OWNED_GEMS = 150;   // (Skin schon da: 150 Gems – vorher 1000, dann brachte der Premium-Pass mehr Gems zurück, als er kostet)
var PASS_XP = { quest: 40, questBonus: 80, captures: 20, pvpWins: 10, defends: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, upgrade: 4, pickup: 8, crate: 3, scouts: 3, heroFires: 2 };   // what each deed is worth
var PASS_BOT_XP = { caps: 20, pvp: 10, defs: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, scouts: 3, heroFires: 2 };   // the same by the names in the others' stats (+ 200 a day with all tasks done)
var PASS_HOW = [['goal', 'Tagesaufgabe abgeholt', 40], ['star', 'Alle drei Aufgaben (Bonus)', 80], ['flag', 'Basis erobert', 20], ['attack', 'Basis eines Spielers (zusätzlich)', '+10'], ['shield', 'Angriff abgewehrt', 15], ['troops', 'Armee siegt im Feld', 15],
    ['losses', 'Kriegsherr besiegt', 60], ['temple', 'Tempel erobert', 25], ['crown', 'Minute auf dem Thron', 2], ['upgrade', 'Basis ausgebaut', 4], ['coin', 'Karten-Belohnung', 8], ['scout', 'Späher ausgeschickt', 3], ['shop', 'Kiste geöffnet', 3]];
function passRewardAt(L, prem) {                          // what level L gives in each row
    if (!prem) return L % 10 === 0 ? { k: 'royal', n: 1 } : L % 5 === 0 ? { k: 'gems', n: 50 } : L % 4 === 0 ? { k: 'shards', n: 5 } : L % 3 === 0 ? { k: 'crate', n: 2 } : L % 2 === 0 ? { k: 'coins', n: 1 } : { k: 'gems', n: 15 };
    return L === 20 ? { k: 'march', id: 'saison' } : L === 40 ? { k: 'frame', id: 'saison' } : L % 10 === 0 ? { k: 'gems', n: 200 } : L % 5 === 0 ? { k: 'royal', n: 1 } : L % 4 === 0 ? { k: 'shards', n: 15 } :
        L % 6 === 0 ? { k: 'tp', n: 150 } : L % 3 === 0 ? { k: 'shield', n: 8 } : L % 2 === 0 ? { k: 'coins', n: 3 } : { k: 'gems', n: 40 };
}
var passState = null, passArm = 0, passTimer = null;
function passLoad() { if (!passState) { try { passState = JSON.parse(store.get('openWaterPass')); } catch (e) {} if (!passState || typeof passState !== 'object' || !passState.s) passState = { s: {} }; } return passState; }
function passSave() { store.set('openWaterPass', JSON.stringify(passLoad())); }
function passNo(t) { return Math.floor((t - PASS_EPOCH) / PASS_LEN) + 1; }             // Saison N, the same for everyone
function passEndOf(n) { return PASS_EPOCH + n * PASS_LEN; }
function passOf(n) { const ps = passLoad(); return ps.s[n] || (ps.s[n] = { xp: 0, prem: false, f: [], p: [] }); }
function passLvl(x) { return x ? Math.min(PASS_LVLS, Math.floor((x.xp || 0) / PASS_STEP)) : 0; }
function passOpen(n) { const now = Date.now(), c = passNo(now); return n === c || (n === c - 1 && now < passEndOf(n) + PASS_GRACE); }   // the old season: 3 more days to collect
function passReady(n) { const x = passLoad().s[n]; if (!x || !passOpen(n)) return []; const L = passLvl(x), out = [];
    for (let l = 1; l <= L; l++) { if (!x.f.includes(l)) out.push([n, l, 0]); if (x.prem && !x.p.includes(l)) out.push([n, l, 1]); } return out; }
function passReadyAll() { const n = passNo(Date.now()); return passReady(n - 1).concat(passReady(n)); }
function passPrune() { const ps = passLoad(), c = passNo(Date.now()); let ch = 0; for (const k of Object.keys(ps.s)) if (+k < c && !passOpen(+k)) { delete ps.s[k]; ch = 1; } if (ch) passSave(); }   // then the pass starts over
function passBump(k, n) { try { const v = PASS_XP && PASS_XP[k]; if (v) passXp(v * (n || 1)); } catch (e) {} }
function passXp(v) {
    const x = passOf(passNo(Date.now())), L0 = passLvl(x); x.xp = (x.xp || 0) + v; passSave(); const L1 = passLvl(x);
    if (L1 > L0) { flashHint('Saison-Pass: Stufe ' + L1 + ' erreicht – hol dir die Belohnung unter „Events“.', 3500); updateGoalsBadge(); }
    if (isPanelOpen(goalsPopup) && goalsTab === 'pass') passRenderSoon();
}
function passGive(who, r) {                               // one reward to anyone (you or the others) - returns the text for the hint
    const b = who === 'player' ? null : loadBotState()[who]; if (who !== 'player' && !b) return ''; const n = r.n || 1;
    if (r.k === 'coins') { const c = Math.max(5000, Math.round(hourProduction(who).coins)) * n; if (b) botCoins[who] = (botCoins[who] || 0) + c; else coins += c; return '+' + fmtCompact(c) + ' Münzen'; }
    if (r.k === 'gems') { if (b) b.gems += n; else gems += n; return '+' + n + ' Gems'; }
    if (r.k === 'tp') { if (b) b.tp = (b.tp || 0) + n; else { throneState.pts = (throneState.pts || 0) + n; saveThrone(); } return '+' + n + ' Thron-Punkte'; }
    if (r.k === 'shards') { const h = heroGrantShards(who, n); if (h) return '+' + n + ' Splitter ' + h.name; if (b) b.gems += n * 20; else gems += n * 20; return '+' + n * 20 + ' Gems (alle Helden voll)'; }
    if (r.k === 'shield') { if (b) { b.shields = b.shields || {}; b.shields[n] = (b.shields[n] || 0) + 1; } else { const st = shieldStock(); st[n] = (st[n] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); } return 'Friedensschild ' + n + ' h'; }
    if (r.k === 'crate' || r.k === 'royal') { const t = [];
        for (let i = 0; i < n; i++) { const rr = r.k === 'royal' ? Math.max(3, pickRandomRarity()) : pickRandomRarity(), slot = pickRandomSlot();
            if (b) b.spare[slot][rr]++; else { addInventoryItem(slot, rr, 1); t.push(RARITY_DEFS[rr].label + ' ' + EQUIPMENT_DEFS[slot].name); } } return t.join(', '); }
    if (r.k === 'frame' || r.k === 'march') { const d = lkDef(r.k, r.id), key = r.k + 's', has = ((b ? b[key] : look[key]) || []).includes(r.id);
        if (has) { if (b) b.gems += PASS_OWNED_GEMS; else gems += PASS_OWNED_GEMS; return '+' + PASS_OWNED_GEMS + ' Gems („' + d.name + '“ hast du schon)'; }   // a later season: gems instead
        if (b) { b[key] = [...(b[key] || []), r.id]; if (r.k === 'march') b.march = r.id; }
        else { look[key] = [...new Set([...(look[key] || []), r.id])]; look[r.k] = r.id; saveLook(); renderLook(); }
        return (r.k === 'frame' ? 'Rahmen' : 'Marsch-Skin') + ' „' + d.name + '“ – schon angelegt'; }
    return '';
}
function passClaim(list) {                                // [[season, level, premium], …] → hand out, one hint
    const got = [];
    for (const [n, l, pr] of list) { const x = passLoad().s[n]; if (!x || !passOpen(n) || l > passLvl(x) || (pr && !x.prem)) continue; const arr = pr ? x.p : x.f; if (arr.includes(l)) continue;
        arr.push(l); got.push(passGive('player', passRewardAt(l, pr)) || 'Belohnung'); }
    if (!got.length) return; passSave(); saveGame(); saveProgression(); updateHud(); sfx('crate');
    flashHint(got.length > 3 ? got.length + ' Belohnungen abgeholt: ' + got.slice(0, 2).join(' · ') + ' …' : got.join(' · '), 4000);
    renderPass(); updateGoalsBadge();
}
function passBuy() {
    const x = passOf(passNo(Date.now())); if (x.prem) return;
    if (gems < PASS_PREMIUM) { flashHint('Zu wenig Gems – Premium kostet ' + fmtNum(PASS_PREMIUM) + '.', 2500); return; }
    if (Date.now() - passArm > 4000) { passArm = Date.now(); renderPass(); return; }            // tap twice: 1000 Gems are a lot
    gems -= PASS_PREMIUM; x.prem = true; passArm = 0; passSave(); saveGame(); updateHud(); sfx('coin');
    flashHint('Premium freigeschaltet – die zweite Reihe gehört dir, auch für erreichte Stufen.', 3500); renderPass(); updateGoalsBadge();
}
function passCellHtml(r, hp, got) {                            // icon + amount of one reward
    const k = r.k, n = r.n || 1, row = (ic, b, s, cls) => '<span class="pc-ic' + (cls ? ' ' + cls : '') + '">' + ic + '</span><span class="pc-t"><b>' + b + '</b><small>' + s + '</small></span>';
    if (k === 'coins') return row(icon('coin', 'ico-coin'), fmtCompact(Math.max(5000, Math.round(hp.coins)) * n), 'Münzen');
    if (k === 'gems') return row(icon('gem', 'ico-gem'), '+' + n, 'Gems');
    if (k === 'tp') return row(icon('crown', 'ico-tp'), '+' + n, 'Thron-Punkte');
    if (k === 'shards') return row(icon('star', 'ico-shard'), '+' + n, 'Helden-Splitter');
    if (k === 'shield') return row(icon('shield'), n + ' h', 'Friedensschild');
    if (k === 'crate') return row(icon('shop'), n + '×', n === 1 ? 'Kiste' : 'Kisten');
    if (k === 'royal') return row(icon('shop', 'ico-royal'), '1×', 'Königliche Kiste');
    const d = lkDef(k, r.id), own = !got && lkHas(k, r.id);
    if (k === 'frame') return row('<span class="frame-ring pc-frame" data-frame="' + r.id + '"><img alt="" src="' + crestDataUrl(28) + '"></span>', d.name, own ? 'Schon da: ' + fmtNum(PASS_OWNED_GEMS) + ' Gems' : 'Rahmen', 'is-look');
    return row('<i class="pc-flag" style="--c:' + d.flag + ';--t:' + d.trail + '"></i>', d.name, own ? 'Schon da: ' + fmtNum(PASS_OWNED_GEMS) + ' Gems' : 'Marsch-Skin', 'is-look');
}
function passChip(who) { try { const x = who === 'player' ? passOf(passNo(Date.now())) : null, i = x ? { lvl: passLvl(x), prem: x.prem } : botPassInfo(who);   // the pass level in the profile
    return '<div class="rp-pass' + (i.prem ? ' is-prem' : '') + '">' + icon('crown') + '<span>Saison-Pass</span><b>Stufe ' + i.lvl + '</b>' + (i.prem ? '<em>Premium</em>' : '') + '</div>'; } catch (e) { return ''; } }
function passRenderSoon() { if (!passTimer) passTimer = setTimeout(() => { passTimer = null; renderPass(); }, 250); }
function passLeftTick() {                                 // the countdowns, once a second while the tab is open
    const now = Date.now(), n = passNo(now), a = goalsPopup.querySelector('#passLeft'), o = goalsPopup.querySelector('#passOldLeft');
    if (a) a.textContent = fmtDHMS((passEndOf(n) - now) / 1000); if (o) o.textContent = fmtDHMS((passEndOf(n - 1) + PASS_GRACE - now) / 1000);
}
function renderPass() {
    const el = document.getElementById('passPane'); if (!el || goalsTab !== 'pass') return;
    passPrune(); const n = passNo(Date.now()), x = passOf(n), L = passLvl(x), xp = x.xp || 0, max = L >= PASS_LVLS, into = max ? PASS_STEP : xp - L * PASS_STEP, hp = hourProduction('player');
    const ready = passReady(n), old = passReady(n - 1), arm = Date.now() - passArm < 4000;
    let h = '<div class="pass-hero' + (x.prem ? ' is-prem' : '') + '"><div class="pass-top"><span class="pass-lvl"><small>Stufe</small><b>' + L + '</b></span>' +
        '<span class="pass-ht"><b>Saison ' + n + '</b><small>Endet in <span id="passLeft"></span></small></span>' + (x.prem ? '<span class="pass-tag">' + icon('crown') + 'Premium</span>' : '') + '</div>' +
        '<div class="pass-bar"><i style="width:' + Math.round(into / PASS_STEP * 100) + '%"></i></div>' +
        '<div class="pass-bar-t"><span>' + (max ? 'Höchste Stufe erreicht' : fmtNum(into) + ' / ' + PASS_STEP + ' Punkte') + '</span><span>' + (max ? fmtNum(xp) + ' Punkte' : 'bis Stufe ' + (L + 1)) + '</span></div></div>';
    if (!x.prem) h += '<div class="pass-prem">' + icon('crown') + '<span><b>Premium-Reihe</b><small>Mehr Gems, Königliche Kisten, Marsch-Skin „Saisonzug“ (Stufe 20) und Rahmen „Saisonkrone“ (Stufe 40) – auch für erreichte Stufen.</small></span>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pass-buy>' + (arm ? '<span>Sicher?</span>' : '') + icon('gem') + '<span>' + fmtNum(PASS_PREMIUM) + '</span></button></div>';
    if (old.length) h += '<div class="pass-old">' + icon('hourglass') + '<span><b>Saison ' + (n - 1) + ': ' + old.length + (old.length === 1 ? ' Belohnung' : ' Belohnungen') + ' offen</b><small>Noch <span id="passOldLeft"></span> abholbar</small></span>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pass-old><span>Abholen</span></button></div>';
    if (ready.length > 1) h += '<button class="btn btn--primary pass-all" type="button" data-pass-all>' + icon('check') + '<span>Alle abholen · ' + ready.length + '</span></button>';
    h += '<div class="pass-track"><div class="pass-head"><span>Frei</span><span></span><span>' + (x.prem ? '' : icon('lock')) + 'Premium</span></div>';
    for (let l = 1; l <= PASS_LVLS; l++) { const cell = pr => { const got = (pr ? x.p : x.f).includes(l), ok = l <= L && (!pr || x.prem), r = passRewardAt(l, pr);
            return '<button type="button" class="pass-cell' + (pr ? ' is-p' : '') + (r.id ? ' is-special' : '') + (got ? ' is-got' : ok ? ' is-ready' : ' is-lock') + (pr && !x.prem ? ' is-closed' : '') + '"' + (ok && !got ? ' data-pass-l="' + l + '" data-pass-p="' + pr + '"' : '') + '>' +
                passCellHtml(r, hp, got) + (got ? '<span class="pc-ok">' + icon('check') + '</span>' : pr && !x.prem ? '<span class="pc-ok is-lock">' + icon('lock') + '</span>' : '') + '</button>'; };
        h += '<div class="pass-row' + (l <= L ? ' is-on' : '') + (l === L + 1 ? ' is-next' : '') + '" data-pass-row="' + l + '">' + cell(0) + '<span class="pass-node">' + l + '</span>' + cell(1) + '</div>'; }
    h += '</div><details class="ach-done pass-how"><summary><span>So sammelst du Punkte</span><em>' + PASS_STEP + ' je Stufe</em>' + icon('upgrade') + '</summary><div class="pass-how-l">' +
        PASS_HOW.map(([ic, t, v]) => '<div>' + icon(ic) + '<span>' + t + '</span><b>' + (typeof v === 'string' ? v : '+' + v) + '</b></div>').join('') + '</div></details>';
    const pb = goalsPopup.querySelector('.pbody'), top = pb.scrollTop, how = el.querySelector('.pass-how'), wasOpen = !!(how && how.open); el.innerHTML = h; pb.scrollTop = top;
    if (wasOpen) el.querySelector('.pass-how').open = true; passLeftTick();
}
function passScroll() { const L = passLvl(passOf(passNo(Date.now()))), pb = goalsPopup.querySelector('.pbody'), r = goalsPopup.querySelector('[data-pass-row="' + Math.max(1, L) + '"]');   // the level you're on in view
    if (r && L > 3) pb.scrollTop = Math.max(0, pb.scrollTop + r.getBoundingClientRect().top - pb.getBoundingClientRect().top - pb.clientHeight / 2); }
document.getElementById('passPane').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-pass-buy')) passBuy();
    else if (b.hasAttribute('data-pass-all')) passClaim(passReady(passNo(Date.now())));
    else if (b.hasAttribute('data-pass-old')) passClaim(passReady(passNo(Date.now()) - 1));
    else if (b.dataset.passL) passClaim([[passNo(Date.now()), +b.dataset.passL, +b.dataset.passP]]);
    renderGoalsSub();
});
setInterval(() => { if (isPanelOpen(goalsPopup) && goalsTab === 'pass') passLeftTick(); }, 1000);
setInterval(() => { const n = passNo(Date.now()), ps = passLoad(); if (ps.n !== n) { ps.n = n; passPrune(); passSave(); if (isPanelOpen(goalsPopup) && goalsTab === 'pass') renderPass(); } updateGoalsBadge(); }, 60000);   // a new season while the game stays open
passPrune();
function maybeShowDaily() {
    if (!dailyClaimable() || !document.getElementById('dailyModal').hidden || (isPanelOpen(goalsPopup) && goalsTab === 'reward')) return;   // an open Belohnung tab shows it already
    const busy = !document.getElementById('levelUpModal').hidden || !document.getElementById('rewardModal').hidden || (typeof welcomeFrom !== 'undefined' && welcomeFrom) || (document.getElementById('welcomeModal') && !document.getElementById('welcomeModal').hidden);
    if (busy) { setTimeout(maybeShowDaily, 1500); return; }
    showDailyModal();
}
afterSplash(() => setTimeout(maybeShowDaily, 500));

// ===== ANLEITUNG für neue Spieler (Idee 45): 6 kurze Schritte unten am Bildschirm, jeder hakt sich von selbst ab =====
const ANLEITUNG = [
    ['Tippe auf deine Hauptstadt – die blaue Basis mit der Krone.', () => (isPanelOpen(popup) && popupIslandId === playerIslandId) || !cityView.hidden],
    ['Greif eine neutrale Basis in deiner Nähe an: tippe eine Basis mit dem Schild „Neutral“ an.', () => anleitungTat.attack, () => {
        if (!anleitungInsel()) return null; const id = popupIslandId, o = islandOwnerOf(id);
        return !o && !bossAt(id) && islandById[id].type !== 'megaTemple' ? 'Gut! Jetzt unten rechts auf „Angreifen“ tippen.' : 'Das ist keine neutrale Basis. Schließe das Fenster (×) und tippe eine Basis mit „Neutral“ an.'; }],
    ['Werte eine eroberte Basis auf: tippe deine neue (blaue) Basis an.', () => anleitungTat.upgrade, () => {
        const eigene = [...ownedIslands].some(id => id !== playerIslandId);
        if (!anleitungInsel()) return eigene ? null : 'Warte, bis dein Angriff angekommen ist und die Basis dir gehört – dann tippe sie an.';
        const id = popupIslandId;
        return id === playerIslandId ? 'Die Hauptstadt wächst über die Burg in der Stadt. Schließe das Fenster (×) und tippe deine neue Basis an.'
            : islandOwnerOf(id) === 'player' ? 'Gut! Jetzt auf „Aufwerten“ tippen.' : 'Das ist nicht deine Basis. Schließe das Fenster (×) und tippe deine eigene (blaue) Basis an.'; }],
    ['Öffne die Stadt (unten links) und baue den Holzfäller – Holz brauchst du für deine Burg.', () => { const c = loadCity(); return (c.levels.lumber || 0) > 0 || (c.builds || []).some(b => b.id === 'lumber'); }],
    ['Schick Truppen zum Sammeln: tippe auf der Karte ein Feld an (Goldmine, Holz, Stein, Eisen …).', () => fieldMarches.some(m => m.who === 'player') || Object.values(fieldState || {}).some(st => st && st.occ && st.occ.who === 'player')],
    ['Hol dir deine Belohnungen unter „Events“ (unten).', () => isPanelOpen(goalsPopup)]
];
const anleitungTat = {};
const anleitungInsel = () => isPanelOpen(popup) && popupIslandId !== null && popupIslandId !== undefined && islandById[popupIslandId];
var anleitung = (() => { try { return JSON.parse(store.get('openWaterAnleitung')) || null; } catch (e) { return null; } })();
if (!anleitung) anleitung = { schritt: (window.__OW && window.__OW.neu) || playerLvl <= 2 ? 0 : ANLEITUNG.length };   // wer schon spielt, sieht sie nicht
if (typeof questProgress === 'function') questProgress = (alt => function (t) { if (t === 'upgrade' || t === 'attack') anleitungTat[t] = true; return alt.apply(this, arguments); })(questProgress);
function anleitungSpeichern() { store.set('openWaterAnleitung', JSON.stringify(anleitung)); }
let anleitungUhr = 0;
function anleitungZeigen() {
    const el = document.getElementById('anleitung'); if (!el) return;
    if (SYSTEM || anleitung.schritt >= ANLEITUNG.length) { el.hidden = true; if (anleitungUhr) { clearInterval(anleitungUhr); anleitungUhr = 0; } return; }   // fertig: nicht mehr jede Sekunde nachsehen
    if (document.getElementById('wkName') || ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal'].some(id => { const m = document.getElementById(id); return m && !m.hidden; })) { el.hidden = true; return; }   // erst Name/Begrüßung
    let weiter = false; try { weiter = ANLEITUNG[anleitung.schritt][1](); } catch (e) {}
    if (weiter) {
        anleitung.schritt++; anleitungSpeichern(); sfx('upgrade');
        if (anleitung.schritt >= ANLEITUNG.length) { el.hidden = true; inboxAdd({ src: 'gift', title: 'Anleitung geschafft', gems: 10, crate: 0 }); flashHint('Geschafft! Unter „Events“ → Abholfach wartet eine kleine Belohnung. Viel Spaß!', 6000); return; }
    }
    el.hidden = !document.getElementById('citySheet').hidden || (!cityView.hidden && anleitung.schritt !== 3);   // in der Stadt nur beim Holzfäller-Schritt, ein Gebäude-Fenster geht vor
    if (el.hidden) return;
    setText(document.getElementById('anleitungSchritt'), 'Schritt ' + (anleitung.schritt + 1) + '/' + ANLEITUNG.length);
    let txt = null; try { txt = ANLEITUNG[anleitung.schritt][2] && ANLEITUNG[anleitung.schritt][2](); } catch (e) {}
    setText(document.getElementById('anleitungText'), txt || ANLEITUNG[anleitung.schritt][0]);
    const fenster = [...document.querySelectorAll('.panel.is-open, .marker-sheet:not([hidden]), #heroHall:not([hidden])')].map(f => f.getBoundingClientRect()).filter(r => r.height > 0).sort((x, y) => x.top - y.top)[0];
    el.style.bottom = fenster ? Math.round(innerHeight - fenster.top + 10) + 'px' : '';
    el.style.visibility = fenster && fenster.top < 150 ? 'hidden' : '';                  // kein Platz über dem Fenster: lieber gar nicht als auf den Knöpfen   // ein Fenster ist offen: direkt darüber, damit seine Knöpfe frei bleiben
}
document.getElementById('anleitungWeg').addEventListener('click', () => { anleitung.schritt = ANLEITUNG.length; anleitungSpeichern(); document.getElementById('anleitung').hidden = true; flashHint('Anleitung übersprungen – Hilfe gibt es unter Profil → Einstellungen.', 3500); });
afterSplash(() => setTimeout(() => { anleitungZeigen(); if (anleitung.schritt < ANLEITUNG.length) anleitungUhr = setInterval(anleitungZeigen, 1000); }, 1500));

// Shop: buy gem crates, opens straight into a result readout.
const shopBtn = document.getElementById('shopBtn');
const shopPopup = document.getElementById('shopPopup');
const shopGemCount = document.getElementById('shopGemCount');
const shopCrateResult = document.getElementById('shopCrateResult');
const shopOpenCrateBtn = document.getElementById('shopOpenCrateBtn');
const shopToEquipBtn = document.getElementById('shopToEquipBtn');
const shopCloseBtn = document.getElementById('shopCloseBtn');

// ===== THRON-PUNKTE: the middle is always open to attack. Every few minutes whoever holds the Mega-Tempel gets
// Thron-Punkte (each Wächter-Tempel a few too), and the 4 Wächter-Tempel fire on the holder's garrison unless he
// holds them himself. The points buy things in the shop's "Thron" tab - for you and for everyone else alike.
const THRONE_TICK_MS = 3 * 60000, THRONE_PTS_MEGA = 30, THRONE_PTS_GUARD = 10, THRONE_FIRE_MS = 3 * 60000, THRONE_FIRE_PCT = 1;   // 1 % per Wächter-Tempel; the hit are wounded, not killed
const guardianTempleIds = islands.filter(i => i.guardian).map(i => i.id);
const THRONE_OFFERS = [
    { id: 'coins',  name: 'Münzen',              icon: 'coin',   cost: 150 },
    { id: 'troops', name: 'Truppen',             icon: 'troops', cost: 200 },
    { id: 'crate',  name: 'Ausrüstungskiste',    icon: 'shop',   cost: 60 },
    { id: 'royal',  name: 'Königliche Kiste',    icon: 'shop',   cost: 400 },
    { id: 'look',   name: 'Titel „Thronhüter“ + Thron-Rahmen', icon: 'crown', cost: 3000, once: true },
    ...RING_SKINS.filter(r => r.tp).map(r => ({ id: 'ring_' + r.id, name: 'Ring „' + r.name + '“', icon: 'crown', cost: r.tp, once: true, ring: r.id }))
];
const throneOwned = (who, o) => o.ring ? ringSkinsOf(who).includes(o.ring) : who === 'player' ? !!(look.bought && look.bought.throne) : !!(loadBotState()[who] || {}).throneLook;
var throneState = (() => { try { return JSON.parse(store.get('openWaterThrone')) || null; } catch (e) { return null; } })() || { pts: 0 };
(() => { const now = Date.now(), ts = throneState;               // no points or volleys pile up while the game was closed
    if (!(ts.nextPts > now)) ts.nextPts = now + THRONE_TICK_MS; if (!(ts.nextFire > now)) ts.nextFire = now + THRONE_FIRE_MS;
    ts.week = ts.week || {}; })();                                                // (ts.week: Thron-Punkte ever earned per person - no weekly reset any more, the old week stays in)
function saveThrone() { store.set('openWaterThrone', JSON.stringify(throneState)); }
function throneEarnedOf(who, bs) { const ts = throneState, w = (ts.week || {})[who] || 0;   // all Thron-Punkte ever earned (the ranking) - the larger of the tally and the old totals, so nobody loses any
    return Math.floor(Math.max(w, who === 'player' ? ts.earned || 0 : (((bs || loadBotState())[who] || {}).stats || {}).tpEarned || 0)); }
function throneIncome(who) { return (rulerOwner() === who ? THRONE_PTS_MEGA : 0) + guardianTempleIds.filter(g => islandOwnerOf(g) === who).length * THRONE_PTS_GUARD; }
function throneShooters() { const hd = rulerOwner(); return hd ? guardianTempleIds.filter(g => islandOwnerOf(g) !== hd) : []; }
function hourProduction(who) {                       // what an empire makes in an hour (the coin and troop offers pay this much)
    if (who === 'player') { const k = 3600000 / productionTickMs(); return { coins: totalCoinProductionPerTick() * k, troops: totalTroopProductionPerTick() * k }; }
    const own = botOwnedIslands[who]; if (!own) return { coins: 0, troops: 0 };
    const bm = botMults(who), rb = rulerOwner() === who ? RULER_BONUS : 1, k = 3600000 / botTickMs(who); let c = 0, t = 0;
    for (const id of own) { const L = islandLevels[id] || 1; c += coinsPerTick(L) * rb * bm.coins; t += troopsPerTick(L) * rb * bm.troops; }
    return { coins: c * k, troops: t * k };
}
function throneAmount(who, id) { const hp = hourProduction(who);
    return id === 'coins' ? Math.max(5000, Math.round(hp.coins)) : id === 'troops' ? Math.max(1000, Math.round(hp.troops)) : id === 'gems' ? 100 : 1; }
function throneGive(who, id) {                        // hands one offer over; returns what it was, for the hint
    const n = throneAmount(who, id), b = who === 'player' ? null : loadBotState()[who];
    if (id === 'coins') { if (b) botCoins[who] = (botCoins[who] || 0) + n; else coins += n; return '+' + fmtCompact(n) + ' Münzen'; }
    if (id === 'gems') { if (b) b.gems += n; else gems += n; return '+' + n + ' Gems'; }
    if (id === 'troops') { const to = b ? botCapitalOf(who) : rewardBaseId(); if (to === null || to === undefined) return '';
        if (b) islandTroops[to] = (islandTroops[to] || 0) + n; else eigeneTruppenDazu(to, n, 'thron'); return '+' + fmtCompact(n) + ' Truppen in ' + (b ? 'die Hauptstadt' : islandTitle(islandById[to])); }
    if (id === 'crate' || id === 'royal') { const r = id === 'royal' ? Math.max(3, pickRandomRarity()) : pickRandomRarity(), slot = pickRandomSlot();
        if (b) { b.spare[slot][r]++; return ''; }
        addInventoryItem(slot, r, 1); sfx('crate'); return RARITY_DEFS[r].label + ' ' + EQUIPMENT_DEFS[slot].name + ' im Inventar'; }
    if (id === 'look') { if (b) b.throneLook = true; else { look.bought = Object.assign({}, look.bought, { throne: true }); look.title = 'keeper'; look.frame = 'throne'; store.set('openWaterLook', JSON.stringify(look)); renderLook(); }
        return 'Titel „Thronhüter“ und Thron-Rahmen – schon angelegt'; }
    if (id.startsWith('ring_')) { const r = ringSkinDef(id.slice(5)); if (!r) return ''; ringGive(who, r.id); return 'Ring „' + r.name + '“ – schon angelegt'; }
    return '';
}
function throneBuy(id) {
    const o = THRONE_OFFERS.find(x => x.id === id); if (!o) return;
    if (o.once && throneOwned('player', o)) return;
    if ((throneState.pts || 0) < o.cost) { flashHint('Zu wenig Thron-Punkte – das kostet ' + fmtNum(o.cost) + '.', 3000); return; }
    throneState.pts -= o.cost; const what = throneGive('player', id); saveThrone(); updateHud(); saveGame(); saveProgression();
    flashHint('Gekauft: ' + what + '.', 3500); sfx('coin'); renderShop();
}
var throneShots = [];                                  // volleys flying across the map (screen-space drawing below)
function throneAward(silent, at) {                    // at: when this award happened (the time you were away is caught up afterwards)
    const ts = throneState; ts.week = ts.week || {};
    const got = {};
    const add = (who, n) => { if (!who) return; got[who] = (got[who] || 0) + n; };
    add(rulerOwner(), THRONE_PTS_MEGA); for (const g of guardianTempleIds) add(islandOwnerOf(g), THRONE_PTS_GUARD);
    goalBump(rulerOwner(), 'throneMin', THRONE_TICK_MS / 60000);   // minutes on the throne (Erfolge)
    bountyGrow();                                                                 // the Kopfgeld on the ruler grows
    for (const [who, n] of Object.entries(got)) {
        if (who === 'player') { ts.pts = (ts.pts || 0) + n; ts.earned = (ts.earned || 0) + n; warStat('thronePts', n); }
        else { const b = loadBotState()[who]; if (!b) continue; b.tp = (b.tp || 0) + n; b.stats = b.stats || {}; b.stats.tpEarned = (b.stats.tpEarned || 0) + n; }
        ts.week[who] = (ts.week[who] || 0) + n;
    }
    if (got.player && !silent) flashHint('+' + got.player + ' Thron-Punkte – du hältst ' + (rulerOwner() === 'player' ? 'die Mitte' : 'einen Wächter-Tempel') + '. Einlösen im Shop unter „Thron“.', 3500);
    saveBotState();
}
function throneVolley(times, silent) {                // times: several volleys at once (the time you were away)
    times = times || 1;
    const holder = rulerOwner(), shooters = throneShooters(); if (!holder || !shooters.length) return null;
    const g0 = islandTroops[megaTempleId] || 0;
    const loss = Math.floor(g0 * (1 - Math.pow(1 - THRONE_FIRE_PCT / 100, shooters.length * times)));
    const m = islandById[megaTempleId];
    if (!silent) { shooters.forEach((g, i) => throneShots.push({ from: islandById[g], to: m, delay: i * 140 })); requestRender(); }   // the clock starts at the first frame
    if (loss <= 0) return null;
    islandTroops[megaTempleId] = g0 - loss;
    let w = 0;
    if (holder === 'player') { w = hospitalTake(loss, 100); warStat('fallen', loss - w);   // everyone hit is carried to the Krankenhaus, as far as there is room
        if (!silent) setTimeout(() => spawnBattleFx(megaTempleId, false, 'Beschuss', '−' + fmtCompact(loss) + ' Truppen'), 1100);
        const prev = combatLog[0], shotBy = shooters.map(g => { const o = islandOwnerOf(g); return o && o !== 'player' ? botById[o].name : 'unbesetzt'; });
        if (prev && prev.type === 'volley' && Date.now() - prev.at < 30 * 60000) {          // one report for a run of volleys, not one every few minutes
            Object.assign(prev, { n: prev.n + times, hit: prev.hit + loss, wounded: prev.wounded + w, left: g0 - loss, shotBy, at: Date.now() });
            store.set('openWaterCombatLog', JSON.stringify(combatLog)); refreshOpenCombatLog();
        } else addCombatLogEntry({ type: 'volley', targetId: megaTempleId, n: times, before: g0, hit: loss, wounded: w, left: g0 - loss, shotBy });
        if (!silent) flashHint(shooters.length + (shooters.length === 1 ? ' Wächter-Tempel feuert' : ' Wächter-Tempel feuern') + ' auf den Thron: ' + fmtCompact(loss) + ' Truppen getroffen' + (w ? ', ' + fmtCompact(w) + ' davon ins Krankenhaus.' : ' – kein Platz im Krankenhaus.') + ' Erobere die Wächter-Tempel, dann schweigen sie.', 4500); }
    else botHospitalTake(holder, loss, 100);
    saveGame();
    return { loss, w };
}
function throneTick() {
    const now = Date.now(), ts = throneState; let dirty = false;
    if (!rechnet()) { throneUhren(now, ts); midAnzeige(now); return; }
    const r = rulerOwner(); if ((ts.ruler || null) !== (r || null)) { ts.ruler = r || null; ts.rulerSince = now; ts.coTold = false; dirty = true; }
    bountyCheck(r); midAnzeige(now);                                              // Kopfgeld to whoever took the throne; the chip under the HUD
    if (!ts.coTold && coalitionOn(now)) { ts.coTold = true; dirty = true;                  // everyone else turns on the throne
        flashHint(r === 'player' ? 'Du hältst den Thron schon lange – die anderen verbünden sich gegen dich. Rechne mit Angriffen von allen Seiten!'
            : 'Die anderen verbünden sich gegen ' + botById[r].name + ' – der Thron wird von allen Seiten angegriffen.', 6000); }
    for (let n = 0; ts.nextPts <= now; n++) { ts.nextPts += THRONE_TICK_MS; dirty = true; if (n < 3) throneAward(); }   // a throttled background tab catches up a little, not for hours
    for (let n = 0; ts.nextFire <= now; n++) { ts.nextFire += THRONE_FIRE_MS; dirty = true; if (n < 3) throneVolley(); }
    if (dirty) { saveThrone(); if (isPanelOpen(shopPopup)) renderShop(); }
    throneUhren(now, ts);
}
function throneUhren(now, ts) {
    const clock = ms => fmtClock(Math.max(0, ms) / 1000);
    for (const el of document.querySelectorAll('[data-throne-pts]')) el.textContent = clock(ts.nextPts - now);
    for (const el of document.querySelectorAll('[data-throne-fire]')) el.textContent = clock(ts.nextFire - now);
}
setInterval(throneTick, 1000);
function drawThroneShots(now) {                        // glowing shots on an arc from each Wächter-Tempel to the throne
    if (!throneShots || !throneShots.length) return;
    const z = mapState.zoom, DUR = 1100;
    for (const s of throneShots.slice()) {
        s.el = (s.el === undefined ? -s.delay : s.el + Math.min(50, now - s.last)); s.last = now;   // per frame, so a slow frame never skips the flight
        const t = s.el / DUR; if (t > 1.5) { throneShots.splice(throneShots.indexOf(s), 1); continue; }
        liveAnimation = true; if (t < 0) continue;
        if (!isCellOpen(s.to.x, s.to.y)) continue;                                // der Thron liegt im Nebel
        const ax = toSX(s.from.x), ay = toSY(s.from.y) - 14, bx = toSX(s.to.x), by = toSY(s.to.y) - 10, d = Math.hypot(bx - ax, by - ay), lift = Math.min(160, d * .35);
        const at = q => { const u = 1 - q; return [u * u * ax + 2 * u * q * (ax + bx) / 2 + q * q * bx, u * u * ay + 2 * u * q * ((ay + by) / 2 - lift) + q * q * by]; };
        if (t <= 1) {
            const sc = Math.max(1, Math.min(1.6, z / .008));
            const [x, y] = at(t), gr = ctx.createRadialGradient(x, y, 0, x, y, 22 * sc);
            gr.addColorStop(0, 'rgba(255,190,90,.8)'); gr.addColorStop(.45, 'rgba(255,110,30,.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 22 * sc, 0, Math.PI * 2); ctx.fill();
            for (let k = 9; k >= 0; k--) { const q = Math.max(0, t - k * .02), [px, py] = at(q), r = (k ? 5 - k * .42 : 6.5) * sc;   // a burning tail, then the white-hot core
                ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = k ? 'rgba(255,' + (150 - k * 8) + ',50,' + (.85 - k * .08) + ')' : '#fff4d6'; ctx.fill(); }
        } else {                                         // impact: a quick ring at the throne
            const q = (t - 1) / .5, fl = ctx.createRadialGradient(bx, by, 0, bx, by, 30 * (1 - q * .4));
            fl.addColorStop(0, 'rgba(255,220,150,' + (.7 * (1 - q)) + ')'); fl.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx, by, 8 + 34 * q, 0, Math.PI * 2); ctx.lineWidth = 3.5 * (1 - q); ctx.strokeStyle = 'rgba(255,160,70,' + (1 - q) + ')'; ctx.stroke();
        }
    }
}
function renderThroneShop() {
    const el = document.getElementById('throneShop'); if (!el) return;
    const ts = throneState, hd = rulerOwner(), sh = throneShooters(), inc = throneIncome('player'), bo = bountyOf();
    const hdName = hd === 'player' ? '<span class="me">Du</span>' : hd ? whoLink(hd, botById[hd].name) : 'niemand';
    liveHtml(el, '<div class="throne-status">' +
            '<div class="ts-row">' + icon('crown') + '<span>Die Mitte hält</span><b>' + hdName + '</b></div>' +
            '<div class="ts-row">' + icon('hourglass') + '<span>Nächste Thron-Punkte</span><b data-throne-pts>' + fmtClock((ts.nextPts - Date.now()) / 1000) + '</b></div>' +
            '<div class="ts-row">' + icon('attack') + '<span>Beschuss' + (hd ? ' · ' + sh.length + ' Wächter' : '') + '</span><b' + (hd === 'player' && sh.length ? ' class="warn"' : '') + ' data-throne-fire>' + fmtClock((ts.nextFire - Date.now()) / 1000) + '</b></div>' +
            '<div class="ts-row">' + icon('points') + '<span>Du bekommst</span><b>' + (inc ? '+' + inc + ' alle 3 Min.' : 'nichts – erobere die Mitte') + '</b></div>' +
            (bo ? '<div class="ts-row">' + icon(bo.who === 'player' ? 'losses' : 'gem') + '<span>' + (bo.who === 'player' ? 'Kopfgeld auf dich' : 'Kopfgeld') + '</span><b' + (bo.who === 'player' ? ' class="warn"' : '') + '>' + fmtNum(bo.gems) + ' Gems · ' + fmtCompact(bo.coins) + '</b></div>' : '') +
        '</div>' +
        '<p class="mail-intro">Wer den Mega-Tempel hält, bekommt alle 3 Min. ' + THRONE_PTS_MEGA + ' Thron-Punkte, jeder Wächter-Tempel bringt ' + THRONE_PTS_GUARD + '. Genauso oft feuern die Wächter-Tempel, die dem Herrscher nicht gehören, auf die Truppen im Mega-Tempel (je ' + THRONE_FIRE_PCT + ' %) – die Getroffenen kommen ins Krankenhaus, soweit Platz ist.</p>' +
        '<div class="sect"><h4>Eintauschen</h4></div><div class="throne-list">' +
        THRONE_OFFERS.filter(o => !o.once).map(o => { const done = o.once && throneOwned('player', o), n = throneAmount('player', o.id);   // looks are bought in the Aussehen sheet
            const sub = o.id === 'coins' ? fmtCompact(n) + ' – so viel, wie dein Reich in 1 Std. verdient' : o.id === 'troops' ? fmtCompact(n) + ' – eine Stunde deiner Ausbildung, in die Hauptstadt'
                : o.id === 'gems' ? 'für Kisten, Helden und Sterne' : o.id === 'crate' ? 'ein zufälliges Teil (Grau bis Episch)' : o.id === 'royal' ? 'mindestens Lila' : done ? 'gehört dir' : o.ring ? 'Ring um alle deine Basen – nur hier' : 'gibt es nur hier';
            return '<div class="throne-row' + (o.once ? ' is-special' : '') + '"><span class="tr-ic">' + icon(o.icon, 'ico-' + o.icon) + '</span><span class="tr-t"><b>' + o.name + '</b><small>' + sub + '</small></span>' +
                (done ? '<span class="chip">' + icon('check') + 'Gekauft</span>' : '<button type="button" class="btn btn--primary btn--sm" data-throne-buy="' + o.id + '"' + ((ts.pts || 0) < o.cost ? ' disabled' : '') + '>' + icon('crown') + '<b>' + fmtNum(o.cost) + '</b></button>') + '</div>'; }).join('') + '</div>' +
            '<p class="mail-intro">Thron-Rahmen, Titel und Ringe für Thron-Punkte gibt es unter Profil → Aussehen, die Thron-Punkte-Rangliste unter Profil → Rangliste.</p>');
}
let shopTab = 'gems';
function showShopTab(t) {
    shopTab = t;
    for (const b of document.querySelectorAll('#shopTabs [data-stab]')) { const on = b.dataset.stab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const pn of document.querySelectorAll('#shopPopup [data-spane]')) pn.hidden = pn.dataset.spane !== t;
    document.getElementById('shopFoot').hidden = t !== 'gems';
    renderShop();
}
document.getElementById('shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-stab]'); if (b) showShopTab(b.dataset.stab); });
document.getElementById('throneShop').addEventListener('click', e => { const b = e.target.closest('[data-throne-buy]'); if (b && !b.disabled) throneBuy(b.dataset.throneBuy); });

// ===== DIE MITTE: Thron, Wächter-Tempel und Tore
// Punkte für Kämpfe gibt es nur noch im Wochen-Event (Krieger-Woche): 1 je 1.000 besiegte, höchstens 30 auf einmal, im Schnitt 10 pro Minute.
const WO_KILL_PER = 1000, WO_KILL_MAX = 30, WO_KILL_MIN = 10, WO_TOP = 10;
const midZoneIds = new Set(islands.filter(i => { const lm = landmasses[i.landmassId]; return i.type === 'megaTemple' || i.guardian || i.type === 'gate' && (i.gateKind === 'throne' || i.gateKind === 'guardian') || !!lm && (lm.tier === 'throne' || lm.tier === 'guardian'); }).map(i => i.id));
function midFight(tid, aWho, aKills, dWho, dKills, aTeile, dTeile) {     // nach jedem Kampf um eine Basis: Punkte für die Krieger-Woche (überall)
    // gemeinsam (Rally, Verstärkung): jeder nach seinem Anteil – aTeile/dTeile = [[wer, Anteil 0…1], …] (kampfTeile, verstAnteile)
    const geben = (wer, n, teile) => { if (Array.isArray(teile) && teile.length) { for (const [w, f] of teile) if (f > 0) evPunkte('krieg', w, n * f / WO_KILL_PER); } else evPunkte('krieg', wer, n / WO_KILL_PER); };
    geben(aWho, aKills, aTeile); geben(dWho, dKills, dTeile);
}
// ===== KOPFGELD AUF DEN HERRSCHER: while someone holds the throne a bounty grows (gems + coins, every 3 min with the Thron-Punkte).
// Whoever takes the Mega-Tempel from him collects all of it.
const BOUNTY_GEMS = 3, BOUNTY_GEMS_MAX = 1000, BOUNTY_COIN_H = .1, BOUNTY_COIN_MAX_H = 24;
var bountyState = (() => { try { return JSON.parse(store.get('openWaterBounty')) || null; } catch (e) { return null; } })() || { ruler: null, gems: 0, coins: 0 };
function saveBounty() { store.set('openWaterBounty', JSON.stringify(bountyState)); }
function bountyOf() { const r = rulerOwner(); return r && bountyState.ruler === r ? { who: r, gems: Math.floor(bountyState.gems || 0), coins: Math.floor(bountyState.coins || 0) } : null; }
function bountyGems() { const b = bountyState; return b.ruler && b.ruler === rulerOwner() ? b.gems || 0 : 0; }   // (the others ask this for every target - no allocation)
function bountyGrow() {
    const r = rulerOwner(); bountyCheck(r); if (!r) return;
    const b = bountyState, hc = hourProduction(r).coins;
    b.gems = Math.min(BOUNTY_GEMS_MAX, (b.gems || 0) + BOUNTY_GEMS); b.coins = Math.min(Math.max(1e4, hc * BOUNTY_COIN_MAX_H), (b.coins || 0) + Math.max(500, hc * BOUNTY_COIN_H)); saveBounty();
}
function bountyPay(who, g, c) {
    if (who !== 'player') { botBountyReward(who, g, c); return; }
    inboxAdd({ src: 'bounty', title: 'Kopfgeld', gems: g, coins: c });
}
function bountyCheck(r) {                             // a new ruler: whoever took the throne collects everything, the bounty starts again at 0
    const b = bountyState; r = r || null; if ((b.ruler || null) === r) return;
    const was = b.ruler, g = Math.floor(b.gems || 0), c = Math.floor(b.coins || 0);
    bountyState = { ruler: r, gems: 0, coins: 0, since: Date.now() }; saveBounty();
    if (!was || !r || !(g || c) || (was !== 'player' && !botById[was]) || (r !== 'player' && !botById[r])) return;
    bountyPay(r, g, c);
    const txt = r === 'player' ? 'Kopfgeld für den Sturz von ' + botById[was].name + ': ' + fmtNum(g) + ' Gems und ' + fmtCompact(c) + ' Münzen – abholen unter Events → Belohnung!'
        : was === 'player' ? botById[r].name + ' hat das Kopfgeld auf dich kassiert: ' + fmtNum(g) + ' Gems.' : g >= 100 ? botById[r].name + ' kassiert das Kopfgeld auf ' + botById[was].name + ': ' + fmtNum(g) + ' Gems.' : '';
    if (txt) afterSplash(() => setTimeout(() => flashHint(txt, 5000), 4500));
    if (r === 'player') sfx('coin');
}
// ---- what you see: ONE chip under the HUD (the most urgent: Invasion, Drache, Wochen-Event, Kopfgeld, Händler), a card in the Thron tab, the Kopfgeld on the Mega-Tempel
const midBar = document.getElementById('midBar');
let midBarHtml = '';
function renderMidBar() {
    const now = Date.now(), b = bountyOf(), chips = [];   // [Dringlichkeit, html] – gezeigt wird nur der dringendste
    if (woOn(now)) { const th = woThemaAm(now), W = evState.wo || {}, rk = W.key === woWin(now).key ? evRang(W.pts) : [], pl = rk.findIndex(e => e[0] === 'player') + 1;   // Wochen-Event (Mo–Fr)
        chips.push([9, '<button type="button" class="mb-chip is-tour" data-mb="woche">' + icon(th.ic) + '<span>Wochen-Event · ' + th.name + '</span>' + (pl ? '<b>Platz ' + pl + '</b>' : '') + '</button>']); }
    if (b && b.gems >= 5) chips.push([b.who === 'player' ? 1 : 7, '<button type="button" class="mb-chip' + (b.who === 'player' ? ' is-warn' : '') + '" data-mb="bounty">' + icon(b.who === 'player' ? 'losses' : 'coin') +
        '<span>' + (b.who === 'player' ? 'Kopfgeld auf dich' : 'Kopfgeld') + '</span><b>' + fmtNum(b.gems) + '</b>' + icon('gem', 'mb-gem') + '</button>']);
    chips.push(...evChips(now));                                                        // Invasion, Drache (Events)
    if (typeof haendlerChip === 'function') { const hc = haendlerChip(now); if (hc) chips.push([6, hc]); }   // Paket C: ein Händler ist da
    const h = chips.length ? chips.sort((x, y) => x[0] - y[0])[0][1] : '';
    if (h !== midBarHtml) { midBarHtml = h; midBar.innerHTML = h; midBar.hidden = !h; document.body.classList.toggle('has-midbar', !!h); document.body.style.setProperty('--mb-h', midBar.children.length * 31 + 'px'); }   // the toast moves below the chips
    for (const el of midBar.querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));
}
midBar.addEventListener('click', e => { const c = e.target.closest('[data-mb]'); if (!c) return;
    if (c.dataset.mb === 'woche') { openGoals('tour'); return; }
    if (c.dataset.mb.startsWith('ev-')) { openGoals(c.dataset.mb.slice(3)); return; }
    const m = islandById[megaTempleId]; if (!m) return; closeAllPopups(); flyTo(m.x, m.y, { zoom: Math.max(mapState.zoom, 0.02) }); setTimeout(() => openIslandPopup(m), 650); });
function midAnzeige(now) {                            // jede Sekunde (auch bei Zuschauern): die Leiste unter dem HUD, das Wochen-Event im Events-Fenster
    renderMidBar();
    if (evOffen() && goalsTab === 'tour' && now % 5000 < 1000) renderEvents();
}
function midNotice(island) {                          // das Kopfgeld auf dem Mega-Tempel
    const b = bountyOf(); let h = '';
    if (b && island.type === 'megaTemple') h += b.who === 'player' ? '<div class="notice notice--warn">' + icon('losses') + '<span><b>Kopfgeld auf dich: ' + fmtNum(b.gems) + ' Gems + ' + fmtCompact(b.coins) + ' Münzen.</b> Wer dir den Thron abnimmt, kassiert alles – je länger du herrschst, desto mehr kommen.</span></div>'
        : '<div class="notice notice--gold">' + icon('coin') + '<span><b>Kopfgeld auf ' + escapeHtml(botById[b.who].name) + ': ' + fmtNum(b.gems) + ' Gems + ' + fmtCompact(b.coins) + ' Münzen.</b> Nimm den Thron und kassiere alles.</span></div>';
    return h;
}

// ===== FRIEDENSSCHILD: nobody may attack the player's bases while it stands; attacking yourself drops it =====
const SHIELD_PRICES = { 2: 40, 8: 120, 24: 300 };
var shieldMemAt = 0, shieldMemV = 0;                                   // hot loops ask thousands of times - no storage read each time
function shieldUntil() { const t = Date.now(); if (t - shieldMemAt > 500) { shieldMemV = parseInt(store.get('openWaterShield'), 10) || 0; shieldMemAt = t; } return shieldMemV; }
function playerShielded() { return Date.now() < ownerShieldUntil('player'); }
function dropShield(reason) { if (!(shieldUntil() > Date.now())) return;   // (nur der Friedensschild – der Anfängerschutz fällt hier nicht)
    store.set('openWaterShield', '0'); shieldMemAt = 0; if (reason) flashHint(reason, 4000); requestRender(); }
// Everyone's Friedensschild works the same: it covers ALL bases (and field armies, gatherers) of its owner, nobody can
// attack them while it stands (scouting still works), and it falls the moment its owner attacks.
function ownerShieldUntil(who) {
    if (!who) return 0;
    if (who === 'player') return Math.max(shieldUntil(), neulingBis());
    const b = loadBotState()[who] || {}; return Math.max(b.shieldUntil || 0, botNeulingBis(who, b));   // auch ihr Anfängerschutz
}
// ANFÄNGERSCHUTZ (EINE Welt) – für echte Spieler UND Mitspieler gleich: 48 Std. unangreifbar (auch wenn sie selbst
// Mitspieler, Lager oder Felder angreifen). Endet früher, sobald die Macht (Gesamtstärke) 50 Mio. erreicht oder sie
// einen echten Spieler angreifen.
const NEULING_MS = 48 * 3600000, NEULING_MACHT = 50e6;
const staerkeMem = {};
function staerke(who) {                           // Macht wie in der Rangliste, höchstens einmal pro Minute neu gerechnet
    const m = staerkeMem[who], now = Date.now(); if (m && now - m.at < 60000) return m.v;
    let v = 0; try { v = powerOf(whoProfile(who)); } catch (e) { v = 0; }
    staerkeMem[who] = { v, at: now }; return v;
}
function neulingBis() {
    if (!window.WELT) return 0; const t = parseFloat(store.get('openWaterNeulingBis')) || 0; if (t <= Date.now()) return 0;
    if (staerke('player') >= NEULING_MACHT) { store.set('openWaterNeulingBis', '0'); afterSplash(() => flashHint('Dein Anfängerschutz ist vorbei – dein Reich hat 50 Mio. Macht erreicht.', 5000)); return 0; }
    return t;
}
function botNeulingBis(who, b) {
    if (!window.WELT || !b) return 0;
    if (b.neuBis === undefined && !b.mensch) b.neuBis = worldStartAt() + NEULING_MS;   // Mitspieler der laufenden Welt: ab Weltstart
    const t = b.neuBis || 0; if (t <= Date.now()) return 0;
    if (staerke(who) >= NEULING_MACHT) { b.neuBis = 0; saveBotState(); return 0; }   // (auch bei echten Spielern – nicht dem Handy überlassen)
    return t;
}
function neulingEnde(grund) { if (neulingBis() <= Date.now()) return; store.set('openWaterNeulingBis', '0'); if (grund) flashHint(grund, 4500); requestRender(); }
function ownerShielded(who, now) { return !!who && (now || Date.now()) < ownerShieldUntil(who); }
function shieldCovers(isl) { return !!isl && isl.type === 'tower'; }   // the shield covers the towers - never gates, temples or the throne (the middle stays open to everyone)
function baseShieldedFor(id, by, now) { const ow = islandOwnerOf(id); return !!ow && ow !== by && shieldCovers(islandById[id]) && ownerShielded(ow, now); }   // by: 'player' | bot id
function shieldedOwners(now) { const s = new Set(); if (now < ownerShieldUntil('player')) s.add('player'); for (const bot of BOT_DEFS) if (ownerShieldUntil(bot.id) > now) s.add(bot.id); return s; }
function shieldBlockText(ow) { const n = (botById[ow] || {}).name || 'Dieser Spieler', b = ow !== 'player' && loadBotState()[ow];
    if (b && botNeulingBis(ow, b) > Date.now() && botNeulingBis(ow, b) >= (b.shieldUntil || 0)) return 'Anfängerschutz: ' + n + ' ist neu und noch ' + fmtHours(b.neuBis - Date.now()) + ' unangreifbar.';
    return 'Friedensschild: ' + n + ' ist noch ' + fmtHours(ownerShieldUntil(ow) - Date.now()) + ' unangreifbar.'; }
function fmtHours(ms) { return fmtDHMS(ms / 1000); }
function renderShieldState() { const el = document.getElementById('shieldState'); if (!el) return; const st = shieldStock(), now = Date.now(), sh = shieldUntil() > now ? shieldUntil() : 0, neu = sh ? 0 : neulingBis();   // (die Restzeit zählt live)
    liveHtml(el, icon('shield') + '<span>' + (sh ? 'Friedensschild aktiv – noch ' + uhrHtml(sh) : neu > now ? 'Anfängerschutz – noch ' + uhrHtml(neu) : 'Kein Schild aktiv.') + '</span>');
    liveHtml(document.getElementById('shieldUse'), [2, 8, 24].map(h => '<button type="button" class="btn btn--' + (st[h] ? 'primary' : 'secondary') + '" data-shield-use="' + h + '"' + (st[h] ? '' : ' disabled') + '><span>' + h + ' Std.</span><span class="cost">' + st[h] + '× im Vorrat</span></button>').join('')); }
shopPopup.addEventListener('click', e => {                 // Shop → Schilde: kaufen (in den Vorrat) und einschalten – beides nur hier
    const su = e.target.closest('[data-shield-use]');
    if (su) { const h = +su.dataset.shieldUse, stock = shieldStock(); if (!stock[h]) return;
        if (Math.max(Date.now(), shieldUntil()) + h * 3600000 > Date.now() + 8 * 86400000) { flashHint('Mehr als 8 Tage Friedensschild am Stück gehen nicht – erst, wenn er kürzer ist.', 3500); return; }   // (die Welt zählt höchstens 8 Tage)
        stock[h]--; store.set('openWaterShieldStock', JSON.stringify(stock)); statBump('shields');
        store.set('openWaterShield', String(Math.max(serverJetzt(), shieldUntil()) + h * 3600000)); shieldMemAt = 0;   // (Server-Uhr: die Welt rechnet mit ihr – eine falsch gestellte Handy-Uhr kürzt sonst den Schild)
        flashHint('Friedensschild aktiv – noch ' + fmtHours(shieldUntil() - Date.now()), 3000); renderShop(); requestRender(); return; }
    const bt = e.target.closest('[data-shield]'); if (!bt) return;
    const h = +bt.dataset.shield, cost = SHIELD_PRICES[h];
    if (gems < cost) { flashHint('Zu wenig Gems – der Schild kostet ' + cost + '.', 3000); return; }
    gems -= cost; const stock = shieldStock(); stock[h]++; store.set('openWaterShieldStock', JSON.stringify(stock));
    updateHud(); saveGame(); renderShop();
    flashHint('Schild (' + h + ' Std.) liegt im Vorrat – unten einschalten, wann du willst.', 3500); });
function heroChestPool(minR) { return HEROES.filter(h => { const s = heroSt('player', h.id); return s && !(s.own && s.q >= HERO_MAXQ) && h.r >= minR; }); }
function renderHeroChests() {                       // the odds per rarity follow your heroes: maxed ones drop out
    const pool = heroChestPool(1), tot = pool.reduce((a, h) => a + 5 - h.r, 0);
    liveHtml(document.getElementById('heroChestOdds'), [1, 2, 3, 4].map(r => { const w = pool.filter(h => h.r === r).reduce((a, h) => a + 5 - h.r, 0); const rd = RARITY_DEFS[r];
        return '<span class="chip" style="color:' + rd.color + ';border-color:' + rd.color + '88">' + rd.label + ' ' + (tot ? Math.round(w / tot * 100) : 0) + ' %</span>'; }).join(''));
    liveHtml(document.getElementById('heroChestOpts'), HERO_CHESTS.map(c => '<button type="button" class="btn btn--secondary" data-hchest="' + c.id + '"' + (gems < c.gems || !heroChestPool(c.minR).length ? ' disabled' : '') + '><span class="hc-t"><span>' + c.name + '</span><small>' + c.txt + '</small></span>' +
        '<span class="cost cost--gem"><svg class="icon"><use href="#i-gem"/></svg><b>' + fmtNum(c.gems) + '</b></span></button>').join(''));
}
function heroChestOpen(who, c) {                    // the same chest for you and the others: n draws of c.sh shards
    if (c.gems >= 500) { if (who === 'player') alsBefehl('bund', { op: 'kiste', c: c.id }); else if (typeof bundGeschenk === 'function') bundGeschenk(who, 'kiste'); }   // große Kiste: Geschenk fürs Bündnis
    const got = []; for (let i = 0; i < c.n; i++) { const h = heroGrantShards(who, c.sh, null, c.minR); if (h) got.push(h); } return got;
}
shopPopup.addEventListener('click', e => { const bt = e.target.closest('[data-hchest]'); if (!bt) return;
    const c = HERO_CHESTS.find(x => x.id === bt.dataset.hchest); if (!c) return;
    if (gems < c.gems) { flashHint('Zu wenig Gems – die ' + c.name + ' kostet ' + fmtNum(c.gems) + '.', 3000); return; }
    if (!heroChestPool(c.minR).length) { flashHint('Alle passenden Helden haben schon 5 Sterne.', 3000); return; }
    gems -= c.gems; const got = heroChestOpen('player', c); updateHud(); saveGame(); renderShop();
    const res = document.getElementById('shopHeroResult');
    res.innerHTML = '<b class="hchest-h">' + c.name + '</b>' + got.map(h => { const s = heroSt('player', h.id), need = s.own ? (s.q >= HERO_MAXQ ? 0 : heroStepCost(h, s.q)) : HERO_UNLOCK[h.r], rd = RARITY_DEFS[h.r];
        return '<div class="hchest-row" style="--rc:' + rd.color + '">' + heroImg(h.id, 'hchest-pic') + '<span><b>' + h.name + '</b><small style="color:' + rd.color + '">' + rd.label + '</small></span><i>+' + c.sh + ' Splitter' + (need ? ' · ' + (s.sh >= need ? (s.own ? 'Aufwerten bereit' : 'Freischalten bereit') : s.sh + ' / ' + need) : '') + '</i></div>'; }).join('') +
        '<button type="button" class="btn btn--primary btn--sm" data-hchest-hall>Zu den Helden</button>';
    res.hidden = false; res.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
shopPopup.addEventListener('click', e => { if (e.target.closest('[data-hchest-hall]')) { closeAllPopups(); openHeroHall(); } });
function renderShop() {
    const hdTab = document.querySelector('#shopTabs [data-stab="hd"]'), hdHier = typeof hdDa === 'function' && !!hdDa();   // der Reiter „Händler“ nur, wenn einer da ist
    if (hdTab.hidden === hdHier) hdTab.hidden = !hdHier;
    if (shopTab === 'hd' && !hdHier) { showShopTab('gems'); return; }
    if (shopTab === 'shield') renderShieldState(); else if (shopTab === 'gems') renderHeroChests();
    const tc = document.getElementById('shopThroneCount'); setText(tc, fmtCompact(throneState.pts || 0)); tc.title = fmtNum(throneState.pts || 0) + ' Thron-Punkte';
    if (shopTab === 'throne') renderThroneShop();
    if (shopTab === 'hd' && typeof hdRender === 'function') hdRender();
    if (shopTab === 'markt' && AUF) liveHtml(document.getElementById('shopMarkt'), AUF.marktHtml());
    setText(shopGemCount, fmtCompact(Math.floor(gems)));
    shopGemCount.title = fmtNum(Math.floor(gems)) + ' Gems';
    shopOpenCrateBtn.disabled = gems < CRATE_GEM_COST;
}
function openShop(tab) {                              // der EINE Shop (Dock); tab: gems | shield | throne | hd | markt
    closeAllPopups();
    shopCrateResult.style.display = 'none'; document.getElementById('shopHeroResult').hidden = true;   // no old chest results on a fresh visit
    openPanel(shopPopup); showShopTab(tab || shopTab);
}
shopBtn.addEventListener('click', () => { if (isPanelOpen(shopPopup)) shopCloseBtn.click(); else openShop(); });
shopCloseBtn.addEventListener('click', () => {
    closePanel(shopPopup);
});
shopOpenCrateBtn.addEventListener('click', () => {
    const item = openCrate();
    renderShop();
    if (!item) {
        shopCrateResult.style.display = 'block';
        delete shopCrateResult.dataset.r;
        shopCrateResult.innerHTML = '<div class="tile empty">' + icon('gem') + '</div>' +
            '<div><b>Nicht genug Gems</b><small>Eine Kiste kostet ' + fmtNum(CRATE_GEM_COST) + ' Gems.</small></div>';
        shopCrateResult.scrollIntoView({ block: 'nearest' });
        return;
    }
    const rd = RARITY_DEFS[item.rarity];
    const slotDef = EQUIPMENT_DEFS[item.slot];
    shopCrateResult.style.display = 'block';
    shopCrateResult.dataset.r = rd.key;
    shopCrateResult.innerHTML =
        '<div class="tile" data-r="' + rd.key + '">' + icon(slotDef.icon) + '<span class="lvl">' + item.level + '</span></div>' +
        '<div><span class="overline rar-text" data-r="' + rd.key + '">' + rd.label + '</span><b>' + slotDef.name + '</b>' +
        '<small>Stufe ' + item.level + ' · im Inventar</small></div>';
    shopCrateResult.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
shopToEquipBtn.addEventListener('click', () => {
    closePanel(shopPopup);
    renderProfile();
    showProfileTab('equip');
    openPanel(profilePopup);
});

// Every owned island produces coins (shared treasury) and troops
// (kept locally on that island) once per tick; owned temples also
// add Gems + a coin/troop bonus on top, scaled by how long they've
// been held without interruption. The "Geschwindigkeit" skill
// shortens the tick interval, so this reschedules itself each time
// instead of using a fixed setInterval.
//
// Ticks are due against an absolute nextProductionTickAt timestamp
// (like the attack/send/scout timers already do) and CAUGHT UP in a
// batch if the browser throttled setTimeout while the tab was
// backgrounded - a plain "always apply exactly one tick" would
// otherwise silently pause production during that time while
// marches (which resolve off absolute timestamps) keep catching up
// correctly.
let nextProductionTickAt = Date.now() + productionTickMs();
const prodCarry = { coins: 0, troops: {} };      // fractions left over each tick, so small % bonuses aren't rounded away
function runProductionTick() {
    const now = Date.now();
    let ticks = 0;
    while (nextProductionTickAt <= now && ticks < 500) {
        nextProductionTickAt += productionTickMs();
        ticks++;
    }
    try {
        if (ticks > 0 && rechnet()) {
            produceTicks(ticks);
            // Keep any currently-open popup/tab in sync with production -
            // without this, an "afford it" button can stay stuck
            // disabled after coins cross its threshold while the popup
            // is already open.
            if (isPanelOpen(popup)) renderPopup();
            if (isPanelOpen(profilePopup)) {
                renderProfile(true);
                renderEquipGrid();
            }
        }
    } catch (e) { console.warn('Produktion:', e); }
    finally { setTimeout(runProductionTick, Math.max(50, nextProductionTickAt - Date.now())); }   // (ein Fehler darf die Produktion nie für immer anhalten)
}
function produceTicks(ticks) {                  // everyone's bases produce for `ticks` of your production ticks
    {
        const ruler = rulerOwner(), coinMult = playerCoinMult(), troopMult = playerTroopMult();
        for (const ownedId of ownedIslands) {
            const level = islandLevels[ownedId] || 1;
            prodCarry.coins += coinsPerTick(level) * coinMult * ticks;
            const tc = (prodCarry.troops[ownedId] || 0) + troopsPerTick(level) * troopMult * ticks, tw = Math.floor(tc);
            prodCarry.troops[ownedId] = tc - tw;
            islandTroops[ownedId] = (islandTroops[ownedId] || 0) + tw;
            if (AUF) AUF.basisRoh('player', ownedId, level, ticks);           // Holz, Stein, Eisen je nach Landschaft (Paket D)

            const isl = islandById[ownedId];
            if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) {
                const mult = templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player');
                gems += TEMPLE_GEMS_PER_TICK * mult * ticks;
                coins += Math.round(TEMPLE_COIN_BONUS_PER_TICK * mult) * ticks;
                islandTroops[rewardBaseId() ?? ownedId] += Math.round(TEMPLE_TROOP_BONUS_PER_TICK * mult) * ticks;   // bonus troops go to the capital
            }
        }
        const cw = Math.floor(prodCarry.coins); coins += cw; prodCarry.coins -= cw;
        if (AUF && !SYSTEM) AUF.rohBuchen('player');
        // Bots produce by the same rules: base rates × their own gear, skills, city, title and throne - on their own
        // clock (their "Geschwindigkeit" skill, not yours), with fractions carried over so small bonuses count.
        const elapsedMs = ticks * productionTickMs();
        for (const bot of BOT_DEFS) {
            const own = botOwnedIslands[bot.id]; if (!own.size) continue;
            const bc = botProdCarry[bot.id] || (botProdCarry[bot.id] = { ms: 0, coins: 0, troops: {} });
            bc.ms += elapsedMs; const bt = Math.floor(bc.ms / botTickMs(bot.id)); if (!bt) continue; bc.ms -= bt * botTickMs(bot.id);
            const rb = ruler === bot.id ? RULER_BONUS : 1, bm = botMults(bot.id), cap = botCapitalOf(bot.id), b = loadBotState()[bot.id];
            for (const ownedId of own) {
                const level = islandLevels[ownedId] || 1;
                bc.coins += coinsPerTick(level) * rb * bm.coins * bt;
                const tc = (bc.troops[ownedId] || 0) + troopsPerTick(level) * rb * bm.troops * bt, tw = Math.floor(tc);
                bc.troops[ownedId] = tc - tw; islandTroops[ownedId] = (islandTroops[ownedId] || 0) + tw;
                if (AUF) AUF.basisRoh(bot.id, ownedId, level, bt);
                const isl = islandById[ownedId];
                if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) {
                    const mult = templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult(bot.id);
                    bc.coins += Math.round(TEMPLE_COIN_BONUS_PER_TICK * mult) * bt;
                    const to = cap !== null && cap !== undefined && own.has(cap) ? cap : ownedId;   // bonus troops go to the capital, like yours
                    islandTroops[to] = (islandTroops[to] || 0) + Math.round(TEMPLE_TROOP_BONUS_PER_TICK * mult) * bt;
                    b.gems += TEMPLE_GEMS_PER_TICK * mult * bt;
                }
            }
            const cw = Math.floor(bc.coins); botCoins[bot.id] = (botCoins[bot.id] || 0) + cw; bc.coins -= cw;
            if (AUF) AUF.rohBuchen(bot.id);
        }
        saveBotState();
        updateHud();
        saveGame();
    }
}
setTimeout(runProductionTick, productionTickMs());

// ===== WILLKOMMEN ZURÜCK: the empire keeps producing while you're away (up to 8 hours), and when you come back
// after a while a card shows what happened: production, attacks on you, your own fights, buildings, wounded.
const AWAY_MIN_MS = 10 * 60000, AWAY_PRODUCE_MAX_MS = 8 * 3600000;
function empireSnapshot() {
    let troops = 0; for (const id of ownedIslands) troops += islandTroops[id] || 0;
    const c = loadCity();
    return { at: Date.now(), coins, gems, troops, bases: ownedIslands.size, city: Object.assign({}, c.levels), wounded: c.wounded || 0 };
}
function saveLeave() { try { store.set('openWaterLeave', JSON.stringify(empireSnapshot())); } catch (e) {} }
const leaveAtBoot = (() => { try { return JSON.parse(store.get('openWaterLeave')) || null; } catch (e) { return null; } })();
let welcomeFrom = null;                          // the snapshot to compare with when the welcome card is shown
function weltNachholen(seit) {                    // (Weltrechner) die Zeit, in der niemand die Welt gerechnet hat
    const away = Math.min(AWAY_PRODUCE_MAX_MS, Date.now() - seit), ticks = Math.floor(away / productionTickMs());
    if (ticks > 0) produceTicks(ticks);
    const nPts = Math.floor(away / THRONE_TICK_MS);
    for (let i = 0; i < nPts; i++) throneAward(true, Date.now() - away + (i + 1) * THRONE_TICK_MS);
    throneVolley(Math.floor(away / THRONE_FIRE_MS), true); saveThrone();
    const ts = throneState, now = Date.now(); if (ts.nextPts < now) ts.nextPts = now + THRONE_TICK_MS; if (ts.nextFire < now) ts.nextFire = now + THRONE_FIRE_MS;
}
setTimeout(() => {                               // right after boot (everything exists): production for the time away
    if (window.WELT && !WELT.leiter && !SYSTEM && leaveAtBoot && Date.now() - leaveAtBoot.at >= AWAY_MIN_MS) {
        // Zuschauer (die Welt rechnet der Server): die Begrüßung kommt SOFORT nach dem Ladebild. Was in der Abwesenheit
        // passiert ist (Münzen, Truppen, Berichte), kommt mit den ersten Pulsen – die Liste füllt sich dann live nach.
        welcomeFrom = Object.assign({ live: { c0: leaveAtBoot.coins || 0, t0: leaveAtBoot.troops || 0, tp0: throneState.pts || 0 } }, leaveAtBoot);
    }
    else if (window.WELT) { if (WELT.leiter && WELT.weltZeit && Date.now() - WELT.weltZeit > 60000) weltNachholen(WELT.weltZeit); }
    else if (leaveAtBoot && Date.now() - leaveAtBoot.at > 60000) {
        const away = Math.min(AWAY_PRODUCE_MAX_MS, Date.now() - leaveAtBoot.at), ticks = Math.floor(away / productionTickMs());
        const c0 = coins, t0 = empireSnapshot().troops;
        if (ticks > 0) produceTicks(ticks);
        const dc = coins - c0, dt = empireSnapshot().troops - t0;
        const tp0 = throneState.pts || 0, nPts = Math.floor(away / THRONE_TICK_MS);        // the throne went on too: points and volleys for the time away
        for (let i = 0; i < nPts; i++) throneAward(true, Date.now() - away + (i + 1) * THRONE_TICK_MS);
        const vol = throneVolley(Math.floor(away / THRONE_FIRE_MS), true), dtp = (throneState.pts || 0) - tp0; saveThrone();
        if (dc > 0) warStat('offCoins', dc); if (dt > 0) warStat('offTroops', dt);
        if (Date.now() - leaveAtBoot.at >= AWAY_MIN_MS) welcomeFrom = Object.assign({ produced: { coins: dc, troops: dt, capped: Date.now() - leaveAtBoot.at > AWAY_PRODUCE_MAX_MS, thronePts: dtp, throneHit: vol && rulerOwner() === 'player' ? vol : null } }, leaveAtBoot);
    }
    saveLeave(); setInterval(saveLeave, 30000);
}, 0);
window.addEventListener('pagehide', saveLeave);
let hiddenAt = 0, hiddenSnap = null, hiddenTp = 0;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); hiddenSnap = empireSnapshot(); hiddenTp = throneState.pts || 0; saveLeave(); return; }
    if (hiddenAt && hiddenSnap && Date.now() - hiddenAt >= AWAY_MIN_MS) {              // the tab kept running: just show what happened since it was hidden
        const snap = hiddenSnap;
        if (window.WELT && !WELT.leiter && !SYSTEM) snap.live = { c0: snap.coins || 0, t0: snap.troops || 0, tp0: hiddenTp };   // Zuschauer: Liste füllt sich mit den Pulsen nach
        welcomeFrom = snap; setTimeout(showWelcome, 600);
    }
    hiddenAt = 0; hiddenSnap = null;
});
function fmtAway(ms) { const m = Math.round(ms / 60000), d = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = m % 60;
    return d ? d + (d === 1 ? ' Tag' : ' Tage') + (hh ? ' ' + hh + ' Std.' : '') : hh ? hh + ' Std.' + (mm ? ' ' + mm + ' Min.' : '') : mm + ' Min.'; }
function welcomeRows(from) {
    const rows = [], now = empireSnapshot(), log = combatLog.filter(e => e.at >= from.at);
    const lv = from.live, pr = lv ? { coins: Math.max(0, coins - lv.c0), troops: Math.max(0, now.troops - lv.t0), capped: false, thronePts: Math.max(0, (throneState.pts || 0) - lv.tp0), throneHit: null } : from.produced;
    if (pr && (pr.coins > 0 || pr.troops > 0)) rows.push(['coin', 'Produktion' + (pr.capped ? ' (8 Std.)' : ''), '+' + fmtCompact(pr.coins) + ' · ' + fmtCompact(pr.troops) + ' Truppen']);
    if (pr && pr.thronePts > 0) rows.push(['crown', 'Am Thron', '+' + fmtNum(pr.thronePts) + ' Thron-Punkte']);
    if (pr && pr.throneHit) rows.push(['attack', 'Beschuss auf den Thron', fmtCompact(pr.throneHit.loss) + ' getroffen · ' + fmtCompact(pr.throneHit.w) + ' im Krankenhaus']);
    const onYou = log.filter(e => e.type === 'botAttack' && e.rolle !== 'helfer'), lost = onYou.filter(e => e.won && !e.capitalHolds).length, held = onYou.filter(e => !e.won).length;
    if (onYou.length) rows.push(['shield', (onYou.length === 1 ? 'Ein Angriff' : onYou.length + ' Angriffe') + ' auf dich', held + ' abgewehrt' + (lost ? ' · ' + lost + ' verloren' : '')]);
    const foes = {}; for (const e of onYou) foes[e.botName] = (foes[e.botName] || 0) + 1;
    const top = Object.entries(foes).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 1) rows.push(['attack', 'Am häufigsten', escapeHtml(top[0]) + ' · ' + top[1] + '×']);
    const mine = log.filter(e => e.type === 'attack');
    if (mine.length) rows.push(['flag', 'Deine Angriffe', mine.filter(e => e.won).length + ' Siege' + (mine.some(e => !e.won) ? ' · ' + mine.filter(e => !e.won).length + ' gescheitert' : '')]);
    const armies = log.filter(e => e.type === 'army' || e.type === 'field');
    if (armies.length) rows.push(['troops', 'Kämpfe im Feld', armies.filter(e => e.won).length + ' gewonnen · ' + armies.filter(e => !e.won).length + ' verloren']);
    const built = Object.keys(now.city).filter(k => (now.city[k] || 0) > ((from.city || {})[k] || 0));
    if (built.length) rows.push(['upgrade', 'Fertig gebaut', built.map(k => cityDef(k).name + ' ' + now.city[k]).join(', ')]);
    if (now.bases !== from.bases) rows.push(['castle', 'Basen', from.bases + ' → ' + now.bases]);
    if (now.wounded > (from.wounded || 0)) rows.push(['losses', 'Im Krankenhaus', fmtCompact(now.wounded) + ' Verwundete']);
    if (!rows.length) rows.push(['check', 'Alles ruhig', 'Niemand hat dich angegriffen']);
    return rows;
}
function showWelcome() {
    const from = welcomeFrom; if (!from) return;
    if (!document.getElementById('levelUpModal').hidden || !document.getElementById('dailyModal').hidden || !document.getElementById('rewardModal').hidden) { setTimeout(showWelcome, 800); return; }
    welcomeFrom = null;
    document.getElementById('welcomeCrest').src = crestDataUrl(44);
    document.getElementById('welcomeTitle').textContent = (profileName.value ? profileName.value + ', du' : 'Du') + ' warst ' + fmtAway(Date.now() - from.at) + ' weg';
    document.getElementById('welcomeSub').textContent = rulerOwner() === 'player' ? 'Herrscher der Meere · ' + ownedIslands.size + ' Basen' : 'Rang ' + currentRank() + ' · ' + ownedIslands.size + (ownedIslands.size === 1 ? ' Basis' : ' Basen');
    const ul = document.getElementById('welcomeList');
    ul.innerHTML = welcomeListHtml(from);
    [...ul.children].forEach((li, i) => { li.style.animationDelay = (150 + i * 110) + 'ms'; });
    document.getElementById('welcomeModal').hidden = false;
    welcomeLive = from.live ? { from, bis: Date.now() + 60000 } : null;
}
function welcomeListHtml(from) { return welcomeRows(from).map(r => '<li>' + icon(r[0], r[0] === 'coin' ? 'ico-coin' : r[0] === 'troops' ? 'ico-troops' : '') + '<span>' + r[1] + '</span><b>' + r[2] + '</b></li>').join(''); }
// (Zuschauer) offene Begrüßung: neue Berichte/Münzen der Abwesenheit kommen mit den Pulsen → Liste nachziehen (1 Minute lang)
let welcomeLive = null;
function welcomeNachziehen() {
    if (!welcomeLive || document.getElementById('welcomeModal').hidden || Date.now() > welcomeLive.bis) { welcomeLive = null; return; }
    const ul = document.getElementById('welcomeList'), h = welcomeListHtml(welcomeLive.from);
    if (ul.dataset.h !== h) { ul.dataset.h = h; ul.innerHTML = h; for (const li of ul.children) li.style.animation = 'none'; }
}
function closeWelcome() { const m = document.getElementById('welcomeModal'); if (m.hidden) return false; m.hidden = true; return true; }
document.getElementById('welcomeOkBtn').addEventListener('click', () => { closeWelcome(); maybeShowDaily(); });
document.getElementById('welcomeModal').addEventListener('click', e => { if (e.target.id === 'welcomeModal') { closeWelcome(); maybeShowDaily(); } });
afterSplash(() => setTimeout(() => { if (welcomeFrom) showWelcome(); }, 700));

// Center the view on the player's island at start
const startIsland = islandById[playerIslandId];
mapState.offsetX = window.innerWidth / 2 - startIsland.x * mapState.zoom;
mapState.offsetY = window.innerHeight / 2 - startIsland.y * mapState.zoom;

// While pendingAttackTargetId is set, every owned island blinks and the
// next one tapped becomes the attack base. While pendingSendFromId is
// set, every OTHER owned island blinks and the next one tapped
// receives all of that island's troops. Only one of the two is ever
// active at a time.
let pendingAttackTargetId = null;
let pendingSendFromId = null;

const hintEl = document.getElementById('hint');
const defaultHint = hintEl.textContent;
let hintResetTimer = null;
var splashQueue, splashFinished;   // no initialisers: afterSplash() already runs earlier in the script (hoisting)
function afterSplash(fn) { if (splashFinished || SYSTEM) { if (!SYSTEM) fn(); return; }   // (Weltrechner: kein Ladebildschirm – Hinweise braucht er nicht)
     else (splashQueue || (splashQueue = [])).push(fn); }
function splashDone() { splashFinished = true; const q = splashQueue || []; splashQueue = []; q.forEach(f => { try { f(); } catch (e) {} }); }
function flashHint(text, ms) {
    clearTimeout(hintResetTimer);
    hintEl.textContent = text;
    if (ms) hintResetTimer = setTimeout(() => { hintEl.textContent = defaultHint; }, ms);
}
// ===== FOG + PASSES (drawing) =====
function drawWorldFrame() {                        // the square map border: darker sea outside, a framed edge with corner marks
    const z = mapState.zoom, ox = mapState.offsetX, oy = mapState.offsetY;
    const l = -FRAME_HALF * z + ox, t = -FRAME_HALF * z + oy, r = FRAME_HALF * z + ox, b = FRAME_HALF * z + oy;
    setScreen(ctx);
    ctx.fillStyle = 'rgba(3,7,12,.72)';
    ctx.beginPath(); ctx.rect(-10, -10, viewW + 20, viewH + 20); ctx.rect(l, t, r - l, b - t); ctx.fill('evenodd');
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(8,10,14,.95)'; ctx.lineWidth = 7; strokeBox(ctx, l, t, r - l, b - t);
    ctx.strokeStyle = 'rgba(212,176,102,.85)'; ctx.lineWidth = 1.5; strokeBox(ctx, l, t, r - l, b - t);
    ctx.strokeStyle = 'rgba(212,176,102,.35)'; ctx.lineWidth = 1; strokeBox(ctx, l + 6, t + 6, r - l - 12, b - t - 12);
    for (const [cx, cy] of [[l, t], [r, t], [r, b], [l, b]]) {                     // corner diamonds
        if (cx < -20 || cy < -20 || cx > viewW + 20 || cy > viewH + 20) continue;
        ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 9, cy); ctx.closePath();
        ctx.fillStyle = '#16120b'; ctx.fill(); ctx.strokeStyle = 'rgba(228,200,134,.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (z < 0.0035) {                                                                 // compass letters on the edges when zoomed far out
        ctx.font = '700 12px Cinzel, Georgia, serif'; ctx.fillStyle = 'rgba(228,200,134,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const mx = (l + r) / 2, my = (t + b) / 2;
        ctx.fillText('N', mx, t - 14); ctx.fillText('S', mx, b + 14); ctx.fillText('O', r + 14, my); ctx.fillText('W', l - 14, my);
    }
}
// Fog of war look: a bright, layered cloud cover (tileable value-noise texture, world-anchored) shown through
// one soft mask for the whole map (fog everywhere, soft holes where explored). Freshly revealed cells fade out.
var FOG_TEX = null, FOG_TEX2 = null, fogMaskCv = null, fogBaseCv = null, fogComp = null;
const FOG_MASK_PX = 6;                                  // mask pixels per fog cell
function fogTexture(seed, size, cells, light) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), rnd = mulberry32(seed);
    const oct = [], N = 4;
    for (let o = 0; o < N; o++) { const n = cells << o, v = new Float32Array(n * n); for (let i = 0; i < v.length; i++) v[i] = rnd(); oct.push({ n, v }); }
    const sm = t => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let val = 0, amp = 1, tot = 0;
        for (const { n, v } of oct) {
            const fx = x / size * n, fy = y / size * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
            const a = v[(y0 % n) * n + x0 % n], b = v[(y0 % n) * n + (x0 + 1) % n], c2 = v[((y0 + 1) % n) * n + x0 % n], d = v[((y0 + 1) % n) * n + (x0 + 1) % n];
            val += amp * (a + (b - a) * tx + (c2 - a) * ty + (a - b - c2 + d) * tx * ty); tot += amp; amp *= .5;
        }
        val /= tot;                                                    // 0..1, cloudy
        const t = Math.max(0, Math.min(1, (val - .28) / .5)), i = (y * size + x) * 4;
        img.data[i] = 96 + t * (light ? 140 : 120); img.data[i + 1] = 106 + t * (light ? 134 : 116); img.data[i + 2] = 122 + t * (light ? 124 : 108); img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
}
function fogBlob() {                                    // soft round eraser, 1 fog cell ≈ half its width
    if (fogBlob.c) return fogBlob.c;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.5, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return fogBlob.c = c;
}
function fogMask(now) {                                 // canvas over the whole frame: alpha = fog
    const n = Math.ceil(2 * FRAME_HALF / FOG_CELL) + 2, W = n * FOG_MASK_PX, o = Math.floor(-FRAME_HALF / FOG_CELL) - 1;
    const fading = new Set(fogFx.map(f => f.k));
    if (!fogBaseCv || fogMaskDirty || fogBaseCv.fading !== fading.size) {
        fogBaseCv = fogBaseCv || document.createElement('canvas'); fogBaseCv.width = fogBaseCv.height = W;
        const g = fogBaseCv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
        g.globalCompositeOperation = 'destination-out';
        const bl = fogBlob(), bs = FOG_MASK_PX * 2.3;
        for (const k of fogSet()) {
            if (fading.has(k)) continue;
            const i = k.indexOf(','), cx = +k.slice(0, i), cy = +k.slice(i + 1);
            g.drawImage(bl, (cx - o + .5) * FOG_MASK_PX - bs / 2, (cy - o + .5) * FOG_MASK_PX - bs / 2, bs, bs);
        }
        fogBaseCv.fading = fading.size; fogBaseCv.o = o; fogBaseCv.n = n; fogBaseCv.stamp = (fogBaseCv.stamp || 0) + 1; fogMaskDirty = false;
    }
    if (!fogFx.length) return fogBaseCv;
    fogMaskCv = fogMaskCv || document.createElement('canvas');
    if (fogMaskCv.width !== W) { fogMaskCv.width = fogMaskCv.height = W; }
    const g = fogMaskCv.getContext('2d'); g.globalCompositeOperation = 'copy'; g.drawImage(fogBaseCv, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const bl = fogBlob();
    for (const f of fogFx) {
        const p = Math.max(0, Math.min(1, (now - f.t - f.d / 5) / 1500)); if (p <= 0) continue;
        const bs = FOG_MASK_PX * (2.3 + (1 - p) * 1.2);
        g.globalAlpha = p * p * (3 - 2 * p);
        g.drawImage(bl, (f.x / FOG_CELL - o) * FOG_MASK_PX - bs / 2, (f.y / FOG_CELL - o) * FOG_MASK_PX - bs / 2, bs, bs);
    }
    g.globalAlpha = 1; fogMaskCv.o = o; fogMaskCv.n = n;
    return fogMaskCv;
}
function drawFog(view, now) {
    const z = mapState.zoom;
    fogFx = fogFx.filter(f => now - f.t < 1500 + f.d / 5);
    if (!fogFx.length && fogBaseCv && fogBaseCv.fading) fogMaskDirty = true;
    const mask = fogMask(now), o = mask.o, n = mask.n;
    if (!FOG_TEX) { FOG_TEX = fogTexture(4242, 256, 4, true); FOG_TEX2 = fogTexture(977, 256, 3, false); }
    const FS = 0.6, Wd = Math.round(viewW * FS), Hd = Math.round(viewH * FS);             // soft clouds: a low-res layer is enough
    fogComp = fogComp || document.createElement('canvas');
    const key = [Wd, Hd, z, mapState.offsetX, mapState.offsetY, mask === fogBaseCv ? fogBaseCv.stamp : Math.random()].join('|');
    if (fogComp.key === key) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fogComp, 0, 0, Math.round(viewW * dpr), Math.round(viewH * dpr)); ctx.restore(); }
    else {
    fogComp.key = key;
    if (fogComp.width !== Wd || fogComp.height !== Hd) { fogComp.width = Wd; fogComp.height = Hd; }
    const g = fogComp.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, Wd, Hd);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.setTransform(FS * z, 0, 0, FS * z, FS * mapState.offsetX, FS * mapState.offsetY);          // world units
    g.save(); g.beginPath(); g.rect(-FRAME_HALF, -FRAME_HALF, 2 * FRAME_HALF, 2 * FRAME_HALF); g.clip();   // only inside the map border
    g.drawImage(mask, o * FOG_CELL, o * FOG_CELL, n * FOG_CELL, n * FOG_CELL); g.restore();
    g.globalCompositeOperation = 'source-in';                                                        // clouds only where the mask is
    const p1 = g.createPattern(FOG_TEX2, 'repeat'); p1.setTransform(new DOMMatrix().rotate(-13).scale(170000 / 256));
    g.fillStyle = p1; g.fillRect(view.l - 1e5, view.t - 1e5, view.r - view.l + 2e5, view.b - view.t + 2e5);
    g.globalCompositeOperation = 'source-atop';                                                      // a finer, brighter layer on top
    const p2 = g.createPattern(FOG_TEX, 'repeat'); p2.setTransform(new DOMMatrix().rotate(23).scale(Math.max(26000, 0.9 / z) / 256));   // never finer than ~1 px of noise
    g.globalAlpha = .55 * Math.max(0, Math.min(1, (z - 0.004) / 0.006)); g.fillStyle = p2; g.fillRect(view.l - 1e5, view.t - 1e5, view.r - view.l + 2e5, view.b - view.t + 2e5); g.globalAlpha = 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(fogComp, 0, 0, Math.round(viewW * dpr), Math.round(viewH * dpr)); ctx.restore();
    }
    if (fogFx.length) liveAnimation = true;
    if (fogPrompt) {                                   // confirm chip: "Späher senden · 0:25" above a marker at the spot
        setScreen(ctx);
        const px = fogPrompt.x * z + mapState.offsetX, py = fogPrompt.y * z + mapState.offsetY, k = Math.min(1, (now - fogPrompt.at) / 180);
        ctx.save(); ctx.globalAlpha = k;
        ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(228,200,134,.18)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#e4c886'; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fillStyle = '#f3e6c4'; ctx.fill();
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        const l1 = 'Späher senden', l2 = fmtClock(fogPrompt.secs), w = Math.max(ctx.measureText(l1).width, 40) + ctx.measureText(l2).width + 58, h = 36;
        const x = Math.max(8, Math.min(viewW - w - 8, px - w / 2)), y = Math.max(70, py - 26 - h);
        rr(ctx, x + 1, y + 3, w, h, 8); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
        rr(ctx, x, y, w, h, 8); const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f1d48c'); gr.addColorStop(1, '#b98a3a');
        ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#5a3c0e'; ctx.stroke();
        drawGlyph(ctx, 'scout', x + 18, y + h / 2, 16, '#2a1a04');
        ctx.fillStyle = '#2a1a04'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(l1, x + 32, y + h / 2 + .5);
        ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(42,26,4,.75)'; ctx.textAlign = 'right'; ctx.fillText(l2, x + w - 12, y + h / 2 + .5);
        ctx.restore();
        fogPrompt.rect = { x, y, w, h };
        if (k < 1) liveAnimation = true;
    }
}
function drawGatehouse(g, cx, cy, H, open) {      // front view like the towers: two turrets, a wall, an arch with a portcullis
    const W = H * 1.3, base = cy + H * .42, top = base - H, wallTop = base - H * .7, tw = W * .27;
    const stone = '#8f8b84', dark = '#5d5a54', edge = '#23211e';
    g.save(); g.lineJoin = 'round';
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx, base + H * .03, W * .56, H * .07, 0, 0, Math.PI * 2); g.fill();
    const merlons = (x0, x1, y, n) => { const mw = (x1 - x0) / (n * 2 - 1); for (let i = 0; i < n; i++) g.rect(x0 + i * 2 * mw, y - mw * .9, mw, mw * .9); };
    g.beginPath(); g.rect(cx - W * .36, wallTop, W * .72, base - wallTop); merlons(cx - W * .36, cx + W * .36, wallTop, 5);   // wall
    g.fillStyle = stone; g.fill(); g.lineWidth = 1.2; g.strokeStyle = edge; g.stroke();
    for (const sx of [-1, 1]) {                                                                                              // turrets
        const x0 = sx < 0 ? cx - W / 2 : cx + W / 2 - tw;
        g.beginPath(); g.rect(x0, top, tw, base - top); merlons(x0 - tw * .08, x0 + tw * 1.08, top, 3);
        const tg = g.createLinearGradient(x0, 0, x0 + tw, 0); tg.addColorStop(0, '#a29e96'); tg.addColorStop(1, '#77736c');
        g.fillStyle = tg; g.fill(); g.stroke();
        g.fillStyle = '#1d1a16'; g.fillRect(x0 + tw * .38, top + H * .2, tw * .24, H * .14);                                // arrow slit
    }
    g.strokeStyle = 'rgba(40,36,32,.35)'; g.lineWidth = 1;                                                                    // courses
    for (let y = wallTop + H * .12; y < base - 2; y += H * .12) { g.beginPath(); g.moveTo(cx - W * .23, y); g.lineTo(cx + W * .23, y); g.stroke(); }
    const aw = W * .3, ah = H * .5, ax = cx - aw / 2, ay = base - ah;                                                          // arch
    const arch = () => { g.beginPath(); g.moveTo(ax, base); g.lineTo(ax, ay + aw / 2); g.arc(cx, ay + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, base); g.closePath(); };
    arch(); g.fillStyle = open >= 1 ? '#6f5438' : '#15120e'; g.fill();
    if (open > 0) { arch(); const lg = g.createLinearGradient(0, ay, 0, base); lg.addColorStop(0, 'rgba(255,226,160,' + (.25 * open) + ')'); lg.addColorStop(1, 'rgba(176,134,88,' + open + ')'); g.fillStyle = lg; g.fill(); }
    g.save(); arch(); g.clip();                                                                                                 // portcullis, raised by `open`
    const lift = open * ah * .92, bars = 5;
    g.strokeStyle = '#2e2b27'; g.lineWidth = Math.max(1, aw * .07);
    g.beginPath();
    for (let i = 1; i < bars; i++) { const x = ax + aw * i / bars; g.moveTo(x, ay - lift); g.lineTo(x, base - lift); }
    for (let j = 1; j < 4; j++) { const y = ay + ah * j / 4 - lift; g.moveTo(ax, y); g.lineTo(ax + aw, y); }
    g.stroke(); g.restore();
    arch(); g.lineWidth = 1.4; g.strokeStyle = edge; g.stroke();
    g.fillStyle = dark; g.fillRect(cx - aw * .62, ay - H * .06, aw * 1.24, H * .06);                                            // lintel
    g.restore();
}
function drawPasses(view, now) {                   // a gatehouse on every gated bridge; closed ones carry a countdown
    const z = mapState.zoom; if (z < 0.0035) return;
    setScreen(ctx);
    for (const br of bridges) {
        const opens = passOpensAt(br); if (!opens) continue;
        if (!isExplored(br.a) && !isExplored(br.b)) continue;
        const rank = { outer: 0, guardian: 1, throne: 2 }, outerA = (rank[landmasses[br.a].tier] || 0) <= (rank[landmasses[br.b].tier] || 0);
        const ex = outerA ? br.x1 : br.x2, ey = outerA ? br.y1 : br.y2, ox = outerA ? br.x2 : br.x1, oy = outerA ? br.y2 : br.y1;   // gate stands in front of the bridge,
        const bl = Math.hypot(ox - ex, oy - ey) || 1, gx = ex - (ox - ex) / bl * 180, gy = ey - (oy - ey) / bl * 180;                // on the outer island's bank
        const mx = gx * z + mapState.offsetX, my = gy * z + mapState.offsetY;
        if (mx < -80 || my < -80 || mx > viewW + 80 || my > viewH + 80) continue;
        const H = Math.max(24, Math.min(110, 2000 * z)), left = opens - Date.now();
        if (left <= 0) continue;
        drawGatehouse(ctx, mx, my - H * .15, H, 0);
        const label = fmtPassWait(left);
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        const w = ctx.measureText(label).width + 30, cy = my - H * .15 + H * .42 + 13;
        ctx.fillStyle = 'rgba(14,12,10,.9)'; ctx.strokeStyle = 'rgba(228,200,134,.75)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx - w / 2, cy - 10, w, 20, 10) : ctx.rect(mx - w / 2, cy - 10, w, 20); ctx.fill(); ctx.stroke();
        drawGlyph(ctx, 'lock', mx - w / 2 + 12, cy, 12, '#f0d69a');
        ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, mx - w / 2 + 22, cy + .5);
    }
}
