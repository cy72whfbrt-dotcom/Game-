// Teil 05d-maersche-kampfbericht.js: Liste der Märsche und Kampfbericht
// Battle log popup: which of your troops are marching right now,
// plus a history of resolved attacks/transfers
const battleLogBtn = document.getElementById('battleLogBtn');
const battleLogBadge = document.getElementById('battleLogBadge');
const battleLogPopup = document.getElementById('battleLogPopup');
const battleLogCloseBtn = document.getElementById('battleLogCloseBtn');
const activeMarchesEl = document.getElementById('activeMarches');
activeMarchesEl.addEventListener('click', e => { const bt = e.target.closest('[data-mact]'); if (!bt) return;
    e.stopPropagation(); if (bt.dataset.mact === 'recall') recallMarch(bt.dataset.k); else if (bt.dataset.mact === 'speedAll') speedUpAll(bt); else speedUpMarch(bt.dataset.k, bt); });
const combatLogListEl = document.getElementById('combatLogList');
let battleLogRefreshTimer = null, battleTab = 'unterwegs', battleGesehenBis = 0;   // Reiter Unterwegs | Berichte; Berichte bis hier schon gesehen
function showBattleTab(t) {
    battleTab = t;
    for (const b of battleLogPopup.querySelectorAll('[data-ktab]')) { const on = b.dataset.ktab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const pn of battleLogPopup.querySelectorAll('[data-kpane]')) pn.hidden = pn.dataset.kpane !== t;
    battleLogPopup.querySelector('.pbody').scrollTop = 0;
}
document.getElementById('battleTabs').addEventListener('click', e => { const b = e.target.closest('[data-ktab]'); if (b) showBattleTab(b.dataset.ktab); });

function timeAgoLabel(timestamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return 'vor ' + seconds + ' s';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return 'vor ' + minutes + ' Min.';
    return 'vor ' + Math.floor(minutes / 60) + ' Std.';
}

// Pending attacks worth showing to the player: their own, plus any
// bot attack aimed at their own territory - not bot-vs-bot or bot-
// vs-neutral fighting elsewhere on the map.
function playerRelevantAttackCount() {
    let count = 0;
    for (const attack of pendingAttacks) {
        if (!attack.attackerBotId || islandOwnerOf(attack.targetId) === 'player') count++;
    }
    if (typeof bund !== 'undefined' && bund && Array.isArray(bund.r)) for (const r of bund.r) if (islandOwnerOf(r.t) === 'player' && !bundFreund('player', r.by)) count++;   // (eine Rally sammelt gegen dich)
    return count;
}
// A bot reinforcing its own territory is never the player's send.
function playerRelevantSendCount() {
    let count = 0;
    for (const send of pendingSends) if (!send.senderBotId) count++;
    return count;
}

function renderActiveMarches() {
    const rows = [];
    const T = id => islandTitle(islandById[id]);
    const clock = sec => '<span class="num">' + marschUhr(sec) + '</span>';
    let relevantAttackCount = 0;
    for (const attack of pendingAttacks) {
        const secondsLeft = Math.max(0, Math.ceil(((attack.fightEndsAt || attack.resolveAt) - Date.now()) / 1000));
        if (!attack.attackerBotId) {
            relevantAttackCount++;
            rows.push(logRowHtml('attack', 'attack', (attack.fightEndsAt ? 'Kampf um ' : 'Angriff auf ') + T(attack.targetId),
                'von ' + T(attack.sourceId) + (attack.rawTroops ? ' · ' + fmtNum(attack.rawTroops) + ' Truppen' : '') + (attack.wartet ? ' · wartet: dort läuft noch ein anderer Kampf' : '') + (!attack.fightEndsAt && baseShieldedFor(attack.targetId, 'player', attack.resolveAt) ? ' · Friedensschild – prallt ab' : ''), clock(secondsLeft), attack.fightEndsAt ? '' : marchButtons(attack, true)));
        } else if (islandOwnerOf(attack.targetId) === 'player') {
            // A bot marching on the player's own territory is worth
            // a warning - a bot attacking a neutral or another bot
            // isn't the player's business and stays out of this list.
            // No enemy numbers here (fog of war).
            relevantAttackCount++;
            const bounces = !attack.fightEndsAt && shieldCovers(islandById[attack.targetId]) && ownerShielded('player', attack.resolveAt);   // the Friedensschild still stands when they arrive
            rows.push(logRowHtml(bounces ? 'win' : 'loss', bounces ? 'shield' : 'bot', escapeHtml(botById[attack.attackerBotId].name) + ' greift ' + T(attack.targetId) + ' an',
                (bounces ? 'Dein Friedensschild hält – prallt ab' : 'Deine Basis wird angegriffen'), clock(secondsLeft)));   // (Wachturm: wie stark)
        }
    }
    if (typeof bund !== 'undefined' && bund && Array.isArray(bund.r)) for (const r of bund.r) {   // eine Rally, die gerade gegen dich sammelt (losgelaufen steht sie oben als Angriff)
        if (islandOwnerOf(r.t) !== 'player' || bundFreund('player', r.by)) continue;
        relevantAttackCount++;
        rows.push(logRowHtml('loss', 'bot', 'Rally gegen ' + T(r.t),
            escapeHtml(bundName(r.by)) + ' sammelt einen Angriff – los in', '<span class="num">' + fmtClock(Math.max(0, Math.ceil((r.los - Date.now()) / 1000))) + '</span>'));
    }
    let relevantSendCount = 0;
    for (const send of pendingSends) {
        if (send.senderBotId) continue; // a bot reinforcing itself isn't the player's business
        relevantSendCount++;
        const secondsLeft = Math.max(0, Math.ceil((send.resolveAt - Date.now()) / 1000));
        rows.push(send.back ? logRowHtml('retreat', 'recall', fmtNum(send.troops) + ' Truppen kehren zurück', 'nach ' + T(send.toId), clock(secondsLeft), marchButtons(send, false))   // (dein Rückweg vom Weltrechner)
            : logRowHtml('send', 'send', 'Verstärkung → ' + T(send.toId), 'von ' + T(send.fromId), clock(secondsLeft), marchButtons(send, true)));
    }
    for (const scout of pendingScouts) {
        const secondsLeft = Math.max(0, Math.ceil((scout.resolveAt - Date.now()) / 1000));
        rows.push(scout.back ? logRowHtml('retreat', 'scout', 'Späher kehrt zurück', 'nach ' + T(scout.targetId), clock(secondsLeft), marchButtons(scout, false))
            : logRowHtml('scout', 'scout', 'Späher → ' + T(scout.targetId), 'Ergebnis bei Ankunft', clock(secondsLeft), marchButtons(scout, true)));
    }
    for (const retreat of pendingRetreats) {
        const secondsLeft = Math.max(0, Math.ceil((retreat.resolveAt - Date.now()) / 1000));
        rows.push(logRowHtml('retreat', 'recall', fmtNum(retreat.troops) + ' Truppen kehren zurück', 'nach ' + T(retreat.toId), clock(secondsLeft), marchButtons(retreat, false)));
    }
    const bm = barbMine();                            // Barbaren-Lager and Tagesboss: out and back like every march
    for (const m of bm) { const sec = Math.max(0, Math.ceil((m.resolveAt - Date.now()) / 1000)), c = m.k === 'c' && barbCampById(m.tid), L = m.L || (c && c.L), hd = m.hero && heroById(m.hero);
        const tgt = m.k === 'b' ? (m.name || 'Tagesboss') : m.k === 'd' ? (m.name || 'Drache') : m.k === 'i' ? 'Barbaren-Armee' : 'Barbaren-Lager' + (L ? ' · Stufe ' + L : '');
        rows.push(m.back ? logRowHtml('retreat', 'recall', fmtNum(m.troops) + ' Truppen kehren zurück', 'von ' + tgt + ' nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('attack', m.k === 'b' ? 'crown' : 'attack', 'Angriff auf ' + tgt, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen' + (hd ? ' · ' + hd.name + (m.hero2 && heroById(m.hero2) ? ' & ' + heroById(m.hero2).name : '') : ''), clock(sec), marchButtons(m, true))); }
    const fm = (typeof fieldMarches !== 'undefined' ? fieldMarches : []).filter(m => m.who === 'player');   // Sammler: hin und zurück
    for (const m of fm) { const sec = Math.max(0, Math.ceil((m.resolveAt - Date.now()) / 1000)), f = fieldById[m.fieldId], K = f && FIELD_KINDS[f.kind], was = K ? K.name : 'Feld';
        rows.push(m.back ? logRowHtml('retreat', 'recall', 'Sammler kehren zurück', fmtNum(m.troops) + ' Truppen' + (m.load >= 1 ? ' · +' + fmtNum(Math.floor(m.load)) + ' ' + K.what : '') + ' · nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('send', 'send', 'Sammeln → ' + was, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen', clock(sec), marchButtons(m, true))); }
    const fast = speedableMarches();
    if (fast.length > 1) rows.unshift('<div class="march-all"><span class="mact"><button type="button" data-mact="speedAll"' + (gemsArmed('marschAlle') ? ' class="is-armed"' : '') + ' title="Restzeit aller Märsche halbieren">' + (gemsArmed('marschAlle') ? 'Wirklich? ' + icon('gem') + fmtNum(fast.reduce((a, m) => a + speedUpCost(m), 0)) : icon('hourglass') + 'Alle schneller (' + fast.length + ') · <b>' + fmtNum(fast.reduce((a, m) => a + speedUpCost(m), 0)) + '</b>' + icon('gem')) + '</button></span></div>');
    const amHtml = rows.length ? rows.join('') : '<div class="logEmpty">' + icon('hourglass') + 'Gerade nichts unterwegs.</div>';
    if (amHtml !== activeMarchesEl._html) { activeMarchesEl._html = amHtml; activeMarchesEl.innerHTML = amHtml; }   // many fights resolve per second: rebuild only on change (keeps the buttons tappable)
    battleLogPopup.classList.toggle('has-entries', rows.length > 0 || combatLog.length > 0);

    const total = relevantAttackCount + relevantSendCount + pendingScouts.length + pendingRetreats.length + bm.length + fm.length;
    setText(battleLogBadge, total);
    setShown(battleLogBadge, total > 0);
    const tb = document.getElementById('battleTabBadge'); setText(tb, total); setShown(tb, total > 0);
}

// Stufe, Titel, die 4 Ausrüstungsteile, Helden, Fähigkeiten und Stadt einer Seite (Kampfbericht und Spähbericht)
function kampfGearHtml(g) { if (!g) return '';
    const tiles = g.items.map((it, i) => { const d = EQUIPMENT_DEFS[it[0]], rd = RARITY_DEFS[it[1]];
        return '<span class="gslot"><span class="tile' + (rd ? '' : ' empty') + '"' + (rd ? ' data-r="' + rd.key + '"' : '') + ' title="' + d.name + (rd ? ' – ' + rd.label + ', Stufe ' + it[2] : ' – leer') + '">' + icon(d.icon) +
            (rd ? '<span class="lvl">' + it[2] + '</span>' + (it[3] ? '<span class="stars">' + icon('star').repeat(it[3]) + '</span>' : '') : '') + '</span></span>'; }).join('');
    const heroes = (g.hx ? [g.hx, ...(g.hx.h2 ? [g.hx.h2] : [])] : []).map(x => { const hd = heroById(x.id); if (!hd) return ''; const rd = RARITY_DEFS[hd.r];   // who led (Haupt- und Zweitheld), his stars, whether the rage fired, every bonus
            return '<div class="logHero" style="--hc:' + rd.color + '"><span class="ghero">' + heroImg(hd.id) + '<span><b>' + hd.name + ' <small>' + heroStarTxt(x.q) + ' · ' + rd.label + '</small></b>' +
                '<small>' + (x.zweit ? 'Zweitheld · Werte und passive Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) + ' %' : x.fired ? '<em class="logHeroFire">' + escapeHtml(x.skill || '') + ' gezündet</em>' : 'Aktive Fähigkeit nicht gezündet') + '</small></span></span>' +
                (x.lines || []).map(l => '<div class="logLine buff"><span>' + escapeHtml(l[0]) + '</span><span>' + escapeHtml(l[1]) + '</span></div>').join('') + '</div>'; }).join('') +
        (g.heroes || []).map(x => { const hd = heroById(x[0]); return hd ? '<span class="ghero" style="--hc:' + RARITY_DEFS[hd.r].color + '">' + heroImg(hd.id) + '<span><b>' + hd.name + '</b><small>Stufe ' + x[1] + '</small></span></span>' : ''; }).join('');   // (older reports)
    if (g.heroOnly) return '<div class="logGear"><div class="logGearHeroes">' + heroes + '</div></div>';
    return '<div class="logGear"><div class="logGearHead">Spieler-Stufe ' + g.lvl + (g.title ? ' · Titel ' + escapeHtml(g.title) : '') + '</div>' +
        '<div class="logGearItems">' + tiles + '</div>' + (heroes ? '<div class="logGearHeroes">' + heroes + '</div>' : '') +
        '<div class="logGearMeta">Fähigkeit Angriff ' + g.skills[0] + ' · Verteidigung ' + g.skills[1] + '<br>Mauer ' + g.city[0] + ' · Krankenhaus ' + g.city[1] + ' · Heldenhalle ' + g.city[2] + '</div></div>'; }
const combatLogKey = e => e.at + '|' + e.type + '|' + (e.targetId ?? e.toId);
// Re-renders the list while the panel is open: opened "Kampfdetails" stay open and the
// rows the player is reading stay where they are when a new row is added on top.
function refreshOpenCombatLog() {
    const body = combatLogListEl.closest('.pbody');
    const rows = [...combatLogListEl.children];
    const openKeys = new Set(rows.filter(r => r.querySelector('details[open]')).map(r => r.dataset.key));
    const anchor = rows.find(r => r.dataset.key && r.offsetTop + r.offsetHeight > body.scrollTop);
    const anchorKey = anchor && anchor.dataset.key, anchorTop = anchor ? anchor.offsetTop : 0;
    const scrollTop = body.scrollTop;
    renderCombatLog();
    for (const r of combatLogListEl.children)
        if (openKeys.has(r.dataset.key)) { const d = r.querySelector('details'); if (d) d.open = true; }
    if (scrollTop > 0 && anchorKey) {
        const again = [...combatLogListEl.children].find(r => r.dataset.key === anchorKey);
        body.scrollTop = scrollTop + (again ? again.offsetTop - anchorTop : 0);
    }
}
function renderCombatLog() {
    battleLogPopup.classList.toggle('has-entries', combatLog.length > 0 || activeMarchesEl.querySelector('.logRow') !== null);
    if (combatLog.length === 0) {
        combatLogListEl.innerHTML = '<div class="logEmpty">' + icon('battlelog') + 'Noch keine Einträge.</div>';
        return;
    }
    let T;
    const ago = e => timeAgoLabel(e.at);
    const fmt1 = v => (v || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fmtM = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // meta lines: "987,7 Mio."
    const fmtD = v => fmtNum(v || 0);   // detail cards
    const gearHtml = kampfGearHtml;
    const fieldHeroLine = e => [[e.attacker, e.hA], [e.defender, e.hD]].map(([n, t]) => t ? ' · ' + (n === 'Du' ? 'dein Held ' : escapeHtml(n) + ' mit ') + escapeHtml(t) : '').join('');   // who led out in the open
    const fieldHeroDet = e => e.hx ? '<details><summary>Dein Held</summary>' + gearHtml({ items: [], lvl: playerLvl, hx: e.hx, skills: [], city: [], heroOnly: 1 }) + '</details>' : undefined;
    const karte = (e, kind, ic, badge, title, sub, bar, chips, det) => logRowHtml(kind, ic, logBadge(badge[0], badge[1]) + title, sub, ago(e), (bar || '') + logChips(chips) + (det || ''));   // jede Karte gleich aufgebaut
    const partLines = (parts, first) => (parts || []).map((q, i) => '<div class="logLine' + (first && !i ? '' : q[1] < 0 ? ' buff malus' : ' buff') + '"><span>' + escapeHtml(q[0]) + (q[2] ? '<small class="logSrc">' + escapeHtml(q[2]) + '</small>' : '') + '</span><span>' + (first && !i ? '' : q[1] < 0 ? '−' : '+') + fmtD(Math.abs(q[1])) + '</span></div>').join('');   // each bonus with where it comes from
    combatLogListEl.innerHTML = combatLog.map(entry => { try { return (entry => {   // (jeder Bericht für sich: ein kaputter blockiert nie die ganze Liste)
        T = id => (entry.names && entry.names[id]) || islandTitle(islandById[id]);
        if (entry.type === 'send') {
            return karte(entry, 'send', 'send', ['send', 'Verstärkung'], T(entry.toId), '', '', [['troops', chipN(entry.troops) + ' Truppen angekommen']]);
        }
        if (entry.type === 'sammeln') {                          // Sammler sind vom Feld zurück
            const K = FIELD_KINDS[entry.fieldKind] || FIELD_KINDS.gold;
            return karte(entry, 'win', K.icon, ['win', 'Sammler zurück'], K.name, entry.toId !== undefined && entry.toId !== null ? 'zurück in ' + T(entry.toId) : '', '',
                [[K.icon, '+' + chipN(entry.load) + ' ' + escapeHtml(K.what), entry.load > 0 ? 'gut' : ''], ['troops', chipN(entry.troops) + ' Truppen zurück']]);
        }
        if (entry.type === 'field') {
            const K = FIELD_KINDS[entry.fieldKind] || FIELD_KINDS.gold;
            return karte(entry, entry.won ? 'win' : 'loss', K.icon, [entry.won ? 'win' : 'loss', entry.won ? 'Feld gehalten' : 'Feld verloren'], K.name, fieldHeroLine(entry).replace(/^ · /, ''),
                logBalance(entry.atk, entry.def, icon('attack') + escapeHtml(entry.attacker) + ' ' + fmtM(entry.atk), fmtM(entry.def) + ' ' + escapeHtml(entry.defender) + icon('defense'), entry.attacker !== 'Du'),
                [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut']], fieldHeroDet(entry));
        }
        if (entry.type === 'barb' || entry.type === 'dboss') {    // out in the open against a camp or the boss: your side vs. theirs, losses, rewards
            const boss = entry.type === 'dboss', tr = entry.troops, gef = entry.gef || 0, bon = tr !== undefined ? entry.atk - tr - gef : 0;
            const mySide = tr === undefined ? '' : '<div class="logSide"><div class="logSideLabel">Angreifer · Du' + (entry.sourceId !== undefined ? ' · ' + T(entry.sourceId) : '') + '</div>' +
                '<div class="logLine"><span>Truppen</span><span>' + fmtD(tr) + '</span></div>' + (gef ? '<div class="logLine buff"><span>Gefolge (Held)</span><span>+' + fmtD(gef) + '</span></div>' : '') +
                (bon ? '<div class="logLine' + (bon < 0 ? ' buff malus' : ' buff') + '"><span>Angriff-Bonus</span><span>' + (bon < 0 ? '−' : '+') + fmtD(Math.abs(bon)) + '</span></div>' : '') +
                '<div class="logSum' + (boss || entry.won ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(entry.atk) + '</span></div>' +
                '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, (entry.loss || 0) - (entry.wounded || 0))) + '</span></div>' +
                (entry.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.wounded) + '</span></div>' : '') +
                '<div class="logLine"><span>Zurück nach Hause</span><span>' + fmtD(Math.max(0, tr - (entry.loss || 0))) + '</span></div></div>';
            const foeSide = tr === undefined ? '' : boss
                ? '<div class="logSide"><div class="logSideLabel">Tagesboss · ' + escapeHtml(entry.name) + '</div><div class="logLine"><span>Leben vorher</span><span>' + fmtD(entry.hp0) + '</span></div>' +
                    '<div class="logCasualty"><span>Dein Schaden</span><span>−' + fmtD(entry.dmg) + '</span></div><div class="logSum"><span>Noch Leben</span><span>' + fmtD(entry.left) + '</span></div>' +
                    '<div class="logLine"><span>Dein Schaden heute</span><span>' + fmtD(entry.total) + '</span></div>' + (entry.rank ? '<div class="logLine"><span>Platz</span><span>' + entry.rank + ' von ' + entry.of + '</span></div>' : '') + '</div>'
                : '<div class="logSide"><div class="logSideLabel">Barbaren-Lager · Stufe ' + entry.L + '</div><div class="logLine"><span>Krieger</span><span>' + fmtD(entry.def) + '</span></div>' +
                    '<div class="logSum' + (entry.won ? '' : ' advantage') + '"><span>Gesamt</span><span>' + fmtD(entry.def) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(entry.kill) + '</span></div>' + (!entry.won ? '<div class="logLine"><span>Noch im Lager</span><span>' + fmtD(entry.left) + '</span></div>' : '') + '</div>';
            const rew = boss ? (entry.gold ? '<div class="logGold">Beute: +' + fmtBig(entry.gold) + ' Münzen nach Schaden</div>' : '') + (entry.capped ? '<div class="logRetreat">Höchstens 5 % Leben pro Angriff.</div>' : '')
                : (entry.gold ? '<div class="logGold">Beute: +' + fmtBig(entry.gold) + ' Münzen' + (entry.kGold ? ' (davon ' + fmtBig(entry.kGold) + ' Angriff: Gold)' : '') + '</div>' : '') +
                  (entry.crate ? '<div class="logGold">Kiste: ' + escapeHtml(entry.crate) + '</div>' : '') + (entry.sh ? '<div class="logGold">' + escapeHtml(entry.sh) + '</div>' : '') +
                  (entry.n !== undefined ? '<div class="logRetreat">' + (entry.up ? 'Stufe ' + entry.open + ' freigeschaltet · ' : entry.open ? 'Freigeschaltet bis Stufe ' + entry.open + ' · ' : '') + entry.n + ' / ' + barbTagMax() + ' heute</div>' : '');
            const det = tr === undefined ? fieldHeroDet(entry) : '<details><summary>Kampfdetails</summary>' +
                '<div class="logCompare">' + mySide + '<div class="logVsDivider">VS</div>' + foeSide + '</div>' + rew +
                (entry.wounded ? '<div class="logRetreat logWounded">' + fmtNum(entry.wounded) + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
                (entry.hx ? gearHtml({ items: [], lvl: playerLvl, hx: entry.hx, skills: [], city: [], heroOnly: 1 }) : '') + '</details>';
            const von = (entry.sourceId !== undefined ? 'von ' + T(entry.sourceId) : '') + fieldHeroLine(entry), verl = verlustChips((entry.loss || 0) - (entry.wounded || 0), entry.wounded);
            const extra = [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']];
            if (boss) return karte(entry, 'win', 'crown', ['win', 'Tagesboss'], escapeHtml(entry.name), von.replace(/^ · /, ''), '',
                [['attack', chipN(entry.dmg) + ' Schaden', 'gut'], ['crown', 'noch ' + chipN(entry.left) + ' Leben'], entry.rank && ['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ...verl, ...extra], det);
            return karte(entry, entry.won ? 'win' : 'loss', 'attack', [entry.won ? 'win' : 'loss', entry.won ? 'Besiegt' : 'Abgewehrt'], 'Barbaren-Lager · Stufe ' + entry.L, von.replace(/^ · /, ''),
                tr === undefined ? '' : logBalance(entry.atk, entry.def, icon('attack') + 'Du ' + fmtM(entry.atk), fmtM(entry.def) + ' Lager' + icon('defense')),
                [...verl, ...extra, entry.up && ['check', 'Stufe ' + entry.open + ' frei', 'gut'], !entry.won && entry.left && ['troops', 'noch ' + chipN(entry.left) + ' im Lager']], det);
        }
        if (entry.type === 'ev') return karte(entry, entry.gut ? 'win' : 'loss', entry.ic || 'attack', [entry.gut ? 'win' : 'loss', escapeHtml(String(entry.badge || ''))], escapeHtml(entry.title || ''), escapeHtml(entry.txt || ''));   // Events (Invasion, Drache)
        if (entry.type === 'dbossWin') return karte(entry, 'win', 'crown', ['win', 'Boss gefallen'], escapeHtml(entry.name), 'Preis liegt im Abholfach', '',
            [['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ['attack', chipN(entry.dmg) + ' Schaden'], entry.gems > 0 && ['gem', '+' + chipN(entry.gems) + ' Edelsteine', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']]);
        if (entry.type === 'army') {
            const side = (n, own) => n === 'Du' ? (own ? 'Deine Armee' : 'deine Armee') : (own ? 'Die Armee von ' : 'die Armee von ') + escapeHtml(n);
            return karte(entry, entry.won ? 'win' : 'loss', 'troops', [entry.won ? 'win' : 'loss', entry.won ? 'Armee siegt' : 'Armee geschlagen'], 'Kampf im Feld', side(entry.attacker, true) + ' gegen ' + side(entry.defender, false) + fieldHeroLine(entry),
                logBalance(entry.atk, entry.def, icon('attack') + fmtM(entry.atk), fmtM(entry.def) + icon('defense'), entry.attacker !== 'Du'),
                [...verlustChips(0, entry.wounded), entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Gold', 'gut']], fieldHeroDet(entry));
        }
        if (entry.type === 'volley') {
            const dead = entry.hit - entry.wounded;
            const vdet = '<details><summary>Kampfdetails</summary><div class="logCompare"><div class="logSide">' +
                '<div class="logSideLabel">Beschuss</div>' +
                (entry.shotBy || []).map((s, i) => '<div class="logLine"><span>Wächter ' + (i + 1) + '</span><span>' + escapeHtml(s) + '</span></div>').join('') +
                '<div class="logLine"><span>Je Wächter</span><span>' + THRONE_FIRE_PCT + ' %</span></div>' +
                (entry.n > 1 ? '<div class="logLine"><span>Salven</span><span>' + entry.n + '</span></div>' : '') +
                '</div><div class="logVsDivider">VS</div><div class="logSide"><div class="logSideLabel">Du · Thron</div>' +
                (entry.n === 1 ? '<div class="logLine"><span>Truppen vorher</span><span>' + fmtD(entry.before) + '</span></div>' : '') +
                '<div class="logLine"><span>Getroffen</span><span>' + fmtD(entry.hit) + '</span></div>' +
                '<div class="logCasualty wounded"><span>Ins Krankenhaus</span><span>' + fmtD(entry.wounded) + '</span></div>' +
                (dead > 0 ? '<div class="logCasualty"><span>Gefallen (kein Platz)</span><span>−' + fmtD(dead) + '</span></div>' : '') +
                '<div class="logSum"><span>Noch im Thron</span><span>' + fmtD(entry.left) + '</span></div>' +
                '</div></div><div class="logRetreat">Erobere die Wächter-Tempel, dann schweigen sie. Verwundete heilst du im Krankenhaus in deiner Stadt.</div></details>';
            return karte(entry, 'loss', 'attack', ['loss', 'Beschuss'], T(entry.targetId), (entry.shotBy || []).length + ' Wächter-Tempel' + (entry.n > 1 ? ' · ' + entry.n + ' Salven' : ''), '',
                [['attack', chipN(entry.hit) + ' getroffen', 'schlecht'], ...verlustChips(dead, entry.wounded)], vdet);
        }
        if (entry.type === 'scout') {
            if (entry.fehl) return karte(entry, 'scout', 'scout', ['scout', 'Kein Bericht'], T(entry.targetId), '', '', [['info', 'Der Späher hat keinen Bericht gebracht']]);   // (der Weltrechner hat ihn abgelehnt oder nach 10 Min. nichts geschickt)
            const alt = Date.now() - (entry.at || 0) >= SPAEH_ALT_MS;   // Alter des Berichts: ab 30 Min. gelb „neu spähen?“
            return karte(entry, 'scout', 'scout', ['scout', 'Gespäht'], T(entry.targetId), entry.spy ? escapeHtml(entry.spy.name) + ' · Spieler-Stufe ' + fmtNum(entry.spy.lvl) + (entry.spy.bl ? ' · Basis Stufe ' + fmtNum(entry.spy.bl) : '') : '', '',
                [['troops', chipN(entry.troops) + ' Truppen'], ...(entry.verst > 0 ? [['troops', chipN(entry.verst) + ' Verstärkung']] : []), ['defense', chipN(entry.defense) + ' Verteidigung'],
                    alt && !entry.wartet && ['hourglass', 'gespäht ' + ago(entry) + ' · neu spähen?', 'warn']], spaeherBlickHtml(entry.spy));   // (die Zeit steht schon in der Karte)
        }
        if (entry.type === 'ausgespaeht') return karte(entry, 'loss', 'scout', ['loss', 'Ausgespäht'], T(entry.targetId),   // jemand hat deine Basis ausgespäht
            whoLink(entry.botId || botIdByName[entry.botName], entry.botName || 'Jemand') + ' hat deine Basis ausgespäht – rechne mit einem Angriff.', '', []);
        if (entry.type === 'retreat') {
            return karte(entry, 'retreat', 'recall', ['retreat', 'Zurück'], T(entry.toId), '', '', [['troops', chipN(entry.troops) + ' Truppen wieder daheim']]);
        }
        if (entry.type === 'botAttack') {
            const fallen = entry.fallen;
            const defSum = entry.enemyTroops + entry.enemyDefense;
            const bdet = '<details><summary>Kampfdetails</summary>' +
                '<div class="logCompare">' +
                    '<div class="logSide">' +
                        '<div class="logSideLabel">Angreifer · ' + whoLink(entry.botId || botIdByName[entry.botName], entry.botName) + (angreiferZeilen(entry, gearHtml) ? ' + ' + (entry.angreifer.length - 1) : '') + '</div>' +
                        angreiferZeilen(entry, gearHtml) +
                        (entry.atkParts ? '<div class="logLine"><span>Truppen</span><span>' + fmtD(entry.atkRaw) + '</span></div>' + partLines(entry.atkParts) :
                         entry.atkRaw !== undefined ? '<div class="logLine"><span>Truppen</span><span>' + fmtD(entry.atkRaw) + '</span></div>' +
                            (entry.atkBonus ? '<div class="logLine buff"><span>Angriff-Bonus</span><span>+' + fmtD(entry.atkBonus) + '</span></div>' : '') +
                            (entry.myTroops - entry.atkRaw - entry.atkBonus ? '<div class="logLine buff"><span>Titel</span><span>' + (entry.myTroops - entry.atkRaw - entry.atkBonus > 0 ? '+' : '−') + fmtD(Math.abs(entry.myTroops - entry.atkRaw - entry.atkBonus)) + '</span></div>' : '') : '') +
                        '<div class="logSum' + (entry.won ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(entry.myTroops) + '</span></div>' +
                        (entry.atkRaw !== undefined ? '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, entry.atkFallen - entry.atkWounded)) + '</span></div>' +
                            (entry.atkWounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.atkWounded) + '</span></div>' : '') +
                            (entry.atkFled ? '<div class="logLine"><span>Geflohen</span><span>' + fmtD(entry.atkFled) + '</span></div>' : '') : '') +
                        gearHtml(entry.atkGear) +
                    '</div>' +
                    '<div class="logVsDivider">VS</div>' +
                    '<div class="logSide">' +
                        '<div class="logSideLabel">Verteidiger · ' + (entry.rolle === 'helfer' ? escapeHtml(entry.defName || '?') + ' + Verstärkung' : entry.verst ? 'Du + Verstärkung' : 'Du') + '</div>' +
                        '<div class="logLine"><span>Truppen' + (entry.verst ? ' (alle)' : '') + '</span><span>' + fmtD(entry.enemyTroops) + '</span></div>' +
                        verstZeilen(entry, entry.rolle === 'helfer' ? (entry.defName || '?') : 'Deine', gearHtml) +
                        (entry.defParts ? partLines(entry.defParts, true)
                          : '<div class="logLine"><span>Verteidigung</span><span>' + fmtD(entry.enemyDefense) + '</span></div>' +
                            (entry.armor ? '<div class="logLine buff"><span>davon Rüstung</span><span>+' + fmtD(entry.armor) + '</span></div>' : '')) +
                        '<div class="logSum' + (entry.won ? '' : ' advantage') + '"><span>Gesamt</span><span>' + fmtD(defSum) + '</span></div>' +
                        (entry.rolle === 'helfer' ? '' : '<div class="logCasualty"><span>' + (entry.verst ? 'Deine gefallen' : 'Gefallen') + '</span><span>−' + fmtD(Math.max(0, fallen - (entry.wounded || 0))) + '</span></div>' +
                        (entry.wounded ? '<div class="logCasualty wounded"><span>' + (entry.verst ? 'Deine verwundet' : 'Verwundet') + '</span><span>' + fmtD(entry.wounded) + '</span></div>' : '')) +
                        gearHtml(entry.defGear) +
                    '</div>' +
                '</div>' +
                (entry.wounded ? '<div class="logRetreat logWounded">' + fmtNum(entry.wounded) + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
                (entry.atkWounded ? '<div class="logRetreat logWounded">' + escapeHtml(entry.botName) + ' bringt ' + fmtNum(entry.atkWounded) + ' Verwundete ins Krankenhaus</div>' : '') +
                (entry.atkFled ? '<div class="logRetreat">' + fmtNum(entry.atkFled) + ' Truppen von ' + escapeHtml(entry.botName) + ' fliehen zurück</div>' : '') +
                (entry.defGold ? '<div class="logGold">Verteidigung: Gold +' + fmtBig(entry.defGold) + ' Münzen</div>' : '') +
                '</details>';
            const bbar = logBalance(entry.myTroops, defSum, icon('attack') + escapeHtml(entry.botName) + ' ' + fmtM(entry.myTroops), fmtM(defSum) + ' ' + (entry.rolle === 'helfer' ? escapeHtml(entry.defName || '?') : 'Du') + icon('defense'), true);
            if (entry.rolle === 'helfer') { const mh = entry.meine || {};   // deine Verstärkung bei einem Bündnis-Mitglied hat mitverteidigt
                return karte(entry, entry.won ? 'loss' : 'win', 'defense', [entry.won ? 'loss' : 'win', 'Verstärkung'], T(entry.targetId), escapeHtml(entry.defName || '?') + ' gegen ' + escapeHtml(entry.botName) + ' · ' + (entry.won ? 'gefallen' : 'gehalten'), bbar,
                    [['troops', 'deine ' + chipN(mh.n) + ' Truppen'], ...verlustChips(mh.fallen, mh.wounded)], bdet); }
            const wer = escapeHtml(entry.botName) + (angreiferZeilen(entry, gearHtml) ? ' (gemeinsam, ' + entry.angreifer.length + ' Angreifer)' : '');
            const bchips = [...verlustChips(Math.max(0, fallen - (entry.wounded || 0)), entry.wounded), ...beuteChips(entry, false), entry.defGold > 0 && ['coin', '+' + chipN(entry.defGold) + ' Gold', 'gut']];
            return entry.capitalHolds
                ? karte(entry, 'loss', 'bot', ['loss', 'Geplündert'], T(entry.targetId), wer + ' hat die Garnison geschlagen – die Stadt hält', bbar, bchips, bdet)
                : entry.won
                ? karte(entry, 'loss', 'bot', ['loss', 'Verloren'], T(entry.targetId), wer + ' hat die Basis erobert', bbar, bchips, bdet)
                : karte(entry, 'win', 'shield', ['win', 'Verteidigt'], T(entry.targetId), wer + ' zurückgeschlagen', bbar, bchips, bdet);
        }
        // Everything each side brings to the fight, added up line by
        // line into a "Gesamt" sum, side by side - so the two final
        // numbers sit right next to each other and it's obvious at a
        // glance who had the advantage (that side's sum is green).
        const atkTotal = entry.myTroops + entry.attackBuff;
        const ich = entry.meine && entry.meine.fallen !== undefined && (entry.rolle === 'mit' || Array.isArray(entry.angreifer)) ? entry.meine : null;   // gemeinsam: deine eigenen Zahlen (geflohen, übrig, verwundet, gefallen)
        const defTotal = entry.enemyTroops + entry.enemyDefense + entry.defenseBuff;
        const details = '<details><summary>Kampfdetails</summary>' +
            '<div class="logCompare">' +
                '<div class="logSide">' +
                    '<div class="logSideLabel">Angreifer' + (angreiferZeilen(entry, gearHtml) ? ' · gemeinsam' : '') + '</div>' +
                    angreiferZeilen(entry, gearHtml) +
                    '<div class="logLine"><span>Truppen' + (angreiferZeilen(entry, gearHtml) ? ' (alle)' : '') + '</span><span>' + fmtD(entry.myTroops) + '</span></div>' +
                    (entry.atkParts ? partLines(entry.atkParts)
                        : '<div class="logLine buff"><span>Fähigkeit Angriff</span><span>+' + fmtD(entry.skillBuff) + '</span></div>' +
                          (entry.titleBuff ? '<div class="logLine buff"><span>Titel</span><span>' + (entry.titleBuff > 0 ? '+' : '−') + fmtD(Math.abs(entry.titleBuff)) + '</span></div>' : '')) +
                    '<div class="logSum' + (atkTotal >= defTotal ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(atkTotal) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(entry.attackerCasualties || 0) + '</span></div>' +
                    (entry.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.wounded) + '</span></div>' : '') +
                    (entry.lossSaved ? (() => { const bern = Math.min(entry.heroLossPct || 0, entry.lossReductionPct), sh = entry.lossReductionPct - bern, sBern = Math.round(entry.lossSaved * bern / Math.max(1, entry.lossReductionPct));
                        return (sh > 0 ? '<div class="logLine buff"><span>Schild −' + Math.round(sh) + ' %</span><span>+' + fmtD(entry.lossSaved - sBern) + '</span></div>' : '') +
                            (bern > 0 ? '<div class="logLine buff"><span>Held −' + Math.round(bern) + ' % Verluste</span><span>+' + fmtD(sBern) + '</span></div>' : ''); })() : '') +
                    gearHtml(entry.atkGear) +
                '</div>' +
                '<div class="logVsDivider">VS</div>' +
                '<div class="logSide">' +
                    '<div class="logSideLabel">Verteidiger' + (entry.defenderName ? ' · ' + whoLink(entry.defenderId || botIdByName[entry.defenderName], entry.defenderName) : '') + '</div>' +
                    '<div class="logLine"><span>Truppen' + (entry.verst ? ' (alle)' : '') + '</span><span>' + fmtD(entry.enemyTroops) + '</span></div>' +
                    verstZeilen(entry, entry.defenderName || 'Besitzer', gearHtml) +
                    (entry.defParts ? partLines(entry.defParts, true)
                      : '<div class="logLine"><span>Verteidigung</span><span>' + fmtD(entry.enemyDefense) + '</span></div>' +
                        '<div class="logLine buff"><span>Verteidigung-Buff</span><span>+' + fmtD(entry.defenseBuff) + '</span></div>') +
                    '<div class="logSum' + (defTotal > atkTotal ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmtD(defTotal) + '</span></div>' +
                    '<div class="logCasualty"><span>Gefallen</span><span>−' + fmtD(Math.max(0, (entry.defenderCasualties || 0) - (entry.enemyWounded || 0))) + '</span></div>' +
                    (entry.enemyWounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmtD(entry.enemyWounded) + '</span></div>' : '') +
                    gearHtml(entry.defGear) +
                '</div>' +
            '</div>' +
            (entry.killGold ? '<div class="logGold">Angriff: Gold +' + fmtBig(entry.killGold) + ' Münzen für getötete Truppen</div>' : entry.killGold === undefined && entry.attackGoldRate ? '<div class="logGold">Angriff: Gold +' + fmt1(entry.attackGoldRate) + ' pro getöteter Truppe</div>' : '') +
            (!entry.won && (ich ? ich.fled : entry.retreatSurvivors) ? '<div class="logRetreat">' + fmtNum(ich ? ich.fled : entry.retreatSurvivors) + (ich ? ' deiner' : '') + ' Truppen konnten fliehen und kehren zurück</div>' : '') +
            ((ich ? ich.wounded : entry.wounded) ? '<div class="logRetreat logWounded">' + fmtNum(ich ? ich.wounded : entry.wounded) + (ich ? ' deiner' : '') + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
            (entry.enemyWounded ? '<div class="logRetreat logWounded">' + escapeHtml(entry.defenderName || 'Der Gegner') + ' bringt ' + fmtNum(entry.enemyWounded) + ' Verwundete ins Krankenhaus</div>' : '') +
            '</details>';
        const meine = entry.meine || {}, ichUeb = ich && ich.rest !== undefined;   // (ältere Berichte: ohne rest/fled → die Zahlen des ganzen Kampfs)
        return karte(entry, entry.won ? 'win' : 'loss', entry.won ? 'level' : 'losses', [entry.won ? 'win' : 'loss', entry.capitalHolds ? 'Geplündert' : entry.won ? 'Sieg' : 'Niederlage'], T(entry.targetId),
            (entry.rolle === 'mit' ? 'Rally mit ' + escapeHtml(entry.fuehrer || '?') + ' · ' : angreiferZeilen(entry, gearHtml) ? entry.angreifer.length + ' Angreifer · ' : '') + 'von ' + T(entry.sourceId),
            logBalance(atkTotal, defTotal, icon('attack') + 'Du ' + fmtM(atkTotal), fmtM(defTotal) + ' ' + escapeHtml(entry.defenderName || 'Abwehr') + icon('defense')),
            [...(entry.rolle === 'mit' || ich ? verlustChips(meine.fallen, meine.wounded) : verlustChips(entry.attackerCasualties, entry.wounded)),
                entry.won ? ['troops', chipN(ichUeb ? ich.rest : entry.remaining) + ' übrig'] : (ichUeb ? ich.fled : entry.retreatSurvivors) > 0 && ['recall', chipN(ichUeb ? ich.fled : entry.retreatSurvivors) + ' fliehen heim'],
                ...beuteChips(entry, true), entry.killGold > 0 && ['coin', '+' + chipN(entry.killGold) + ' Gold für Kills', 'gut']], details);
    })(entry); } catch (err) { console.warn('Kampfbericht', err); return logRowHtml('loss', 'info', 'Kampfbericht', 'Dieser Bericht kann nicht angezeigt werden.', ''); }
    }).join('');
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i]; if (!e) return; row.dataset.key = combatLogKey(e);
        const isl = islandById[e.targetId ?? e.toId], lt = row.querySelector(':scope > .lt'); if (!isl || !lt) return;   // wo war das? Koordinaten + „Zeigen“ auf der Karte
        lt.insertAdjacentHTML('beforeend', '<small class="logOrt">' + coordText(isl.x, isl.y) + ' <button type="button" class="btn btn--ghost btn--sm" data-logzeigen="' + isl.id + '">Zeigen</button>' + (typeof bundTeilenKnopf === 'function' ? bundTeilenKnopf(e) : '') + '</small>'); });   // (+ im Bündnis teilen)
    try { kampflogUmbauen(); } catch (err) { console.warn('Kampfbericht', err); }   // neuer Aufbau: ein Fenster je Spieler
}

// ===== Kampfbericht im neuen Aufbau (Alexanders Design): jeder Spieler ein eigenes Fenster, alle Fenster gleich aufgebaut
// (Truppen, Held, Grundverteidigung, Gesamt, Gefallen, Geflohen, Stufe, 2 Heldenplätze, Skills, Rohstoffe) – „Kampfdetails“ öffnet eine eigene Seite.
const kampflogUmbauen = (function () {
    const fmt = v => Math.round(v || 0).toLocaleString('de-DE'), kurz = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // (Balken: wie renderCombatLog)
    const ic = n => '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"></use></svg>';
    const zl = (a, b, kl, src) => '<div class="logLine' + (kl || '') + '"><span>' + a + (src ? '<small class="logSrc">' + src + '</small>' : '') + '</span><span>' + b + '</span></div>';
    const el = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
    const leerHeld = (n, t) => '<div class="logHero kl-keinheld"><span class="ghero"><span class="kl-leer">?</span><span><b>' + n + '</b><small>' + t + '</small></span></span></div>';
    const leerGear = (stufe, angr) => '<div class="logGear"><div class="logGearHead">' + (stufe || 'Spieler-Stufe –') + '</div><div class="logGearItems">' +
        [['weapon', 'Waffe'], ['armor', 'Rüstung'], ['shield', 'Schild'], ['boots', 'Stiefel']].map(([i, n]) => '<span class="gslot"><span class="tile empty" title="' + n + ' – leer">' + ic(i) + '</span></span>').join('') +
        '</div><div class="logGearMeta">Fähigkeit Angriff – · Verteidigung –</div></div>';
    const textOf = n => (n && n.firstElementChild ? n.firstElementChild.textContent : '').trim();

    // ein Fenster auf den immer gleichen Aufbau bringen
    function normal(box, angr, roh, schutz, flucht) {                    // flucht: die Geflohenen DIESES Spielers (sonst 0)
        const lines = () => [...box.querySelectorAll(':scope > .logLine, :scope > .logSum, :scope > .logCasualty')];
        const truppen = lines().find(l => textOf(l).startsWith('Truppen'));
        if (truppen) truppen.firstElementChild.firstChild.textContent = 'Truppen';
        const mitHeld = !!box.querySelector('.logGear .logHero:not(.kl-keinheld)');
        if (!lines().some(l => textOf(l).startsWith('Held'))) (truppen || box.firstElementChild).insertAdjacentHTML('afterend', mitHeld ? zl('Held', 'dabei', '', 'steckt in „Eigene Werte“') : zl('Held', '+0', '', angr ? 'ohne Held' : 'zählt beim Verteidigen nicht'));
        const sum = box.querySelector(':scope > .logSum');
        if (!lines().some(l => textOf(l).startsWith('Grundverteidigung')) && sum) sum.insertAdjacentHTML('beforebegin', zl('Grundverteidigung', '0', ' kl-null', 'zählt nur beim Besitzer der Basis'));
        const cas = lines().filter(l => l.classList.contains('logCasualty'));
        if (!cas.length && sum) sum.insertAdjacentHTML('afterend', '<div class="logCasualty kl-null"><span>Gefallen</span><span>–</span></div>');   // (steht nicht im Bericht)
        const gefl = lines().find(l => textOf(l).startsWith('Geflohen'));
        if (!gefl) { const c = lines().filter(l => l.classList.contains('logCasualty')).pop(); (c || sum).insertAdjacentHTML('afterend', zl('Geflohen', fmt(flucht || 0))); }
        else if (flucht !== undefined) gefl.lastElementChild.textContent = fmt(flucht);   // (nur seine – nicht die der ganzen Rally)
        let gear = box.querySelector(':scope > .logGear');
        if (!gear) { box.insertAdjacentHTML('beforeend', leerGear('', angr)); gear = box.querySelector(':scope > .logGear'); }
        let hs = gear.querySelector('.logGearHeroes');
        if (!hs) { hs = el('<div class="logGearHeroes"></div>'); const meta = gear.querySelector('.logGearMeta'); meta ? gear.insertBefore(hs, meta) : gear.appendChild(hs); }
        const helden = hs.querySelectorAll('.logHero');
        if (helden.length === 0) hs.insertAdjacentHTML('beforeend', leerHeld('Kein Hauptheld', angr ? 'Ohne Held losgeschickt' : 'Beim Verteidigen einer Basis zählt kein Held'));
        if (hs.querySelectorAll('.logHero').length === 1) hs.insertAdjacentHTML('beforeend', leerHeld('Kein Zweitheld', 'Zweitheld · Werte und passive Fähigkeiten zu 50 %'));
        hs.querySelectorAll('.logHero').forEach(h => {                       // jeder Heldenplatz: dieselben 7 Zeilen
            const L = [...h.querySelectorAll(':scope > .logLine')].map(l => { const r = [textOf(l), l.lastElementChild.textContent.trim()]; l.remove(); return r; });
            const fest = ['Angriff', 'Verteidigung', 'Gefolge', 'Tempo'], rest = L.filter(l => !fest.includes(l[0]));
            while (rest.length < 3) rest.push(['Fähigkeit', '–']);
            h.insertAdjacentHTML('beforeend', [...fest.map(n => L.find(l => l[0] === n) || [n, '–']), ...rest.slice(0, 3)].map(([a, b]) => zl(a, b, b === '–' ? ' kl-null' : ' buff')).join(''));
        });
        box.querySelectorAll(':scope > .kl-rss').forEach(x => x.remove());
        box.insertAdjacentHTML('beforeend', '<div class="kl-rss"><div class="logGearHead">Rohstoffe</div>' +
            [['g', 'Gold'], ['h', 'Holz'], ['s', 'Stein'], ['e', 'Eisen']].map(([k, n]) => { const v = roh[k] || 0;
                return zl(n, (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)), v > 0 ? ' buff' : v < 0 ? ' buff malus' : ''); }).join('') +
            (schutz ? zl('<small class="logSrc">Burg schützt ' + fmt(schutz) + ' Gold · ' + fmt(schutz * ROH_FAKTOR) + ' je Rohstoff</small>', '') : '') + '</div>');
        return box;
    }
    const rohTeil = (beute, anteil, vz) => ({ g: vz * Math.round(beute.g * anteil), h: vz * Math.round(beute.h * anteil), s: vz * Math.round(beute.s * anteil), e: vz * Math.round(beute.e * anteil) });

    // eine Seite (Angreifer oder Verteidiger) in Fenster je Spieler zerlegen
    function seiteUmbauen(side, angr, liste, e, beute, schutz, sieg, gesamt) {   // gesamt: die echte Summe dieser Seite (aus dem Bericht – nie aus dem Text, der ab 10 Mio. abgekürzt ist)
        const label = side.querySelector('.logSideLabel');
        const gruppe = el('<div class="kl-gruppe ' + (angr ? 'kl-a' : 'kl-v') + '"></div>');
        side.replaceWith(gruppe);
        const spieler = Array.isArray(liste) && liste.length ? liste : null;
        const sumEl = side.querySelector(':scope > .logSum');
        const fluchtAlle = !angr || sieg ? 0 : e.type === 'attack' ? e.retreatSurvivors || 0 : e.atkFled || 0;   // (Geflohene des Angreifers – verloren)
        if (!spieler) {                                                     // nur ein Spieler auf dieser Seite
            const roh = angr ? (sieg ? beute : {}) : rohTeil(beute, 1, -1);
            gruppe.appendChild(normal(side, angr, roh, angr ? 0 : schutz, fluchtAlle));
            return;
        }
        // Zeilen der einzelnen Spieler (angreiferZeilen / verstZeilen) einsammeln und aus dem Fenster nehmen
        const gearVon = {}; side.querySelectorAll(':scope > details.verst-det').forEach(d => { const n = d.querySelector('summary').textContent.split(':')[0].trim(); gearVon[n] = d.querySelector('.logGear'); d.remove(); });
        const namen = new Set(spieler.map(p => p.name));
        [...side.querySelectorAll(':scope > .logLine, :scope > .logCasualty')].forEach(l => { const t = textOf(l);
            if (t.startsWith('· davon') || t.startsWith('Verstärkung ·') || namen.has(t) || (!angr && (t === 'Deine' || t === (e.defName || '') || t === (e.defenderName || '') || t === 'Besitzer'))) l.remove(); });
        const andere = spieler.slice(angr ? 1 : 0), erster = angr ? spieler[0] : { name: label.textContent.replace(/^Verteidiger · /, '').replace(/ \+ .*$/, ''), n: e.eigen };
        const summeAndere = andere.reduce((s, p) => s + (p.n || 0), 0), alleT = summeAndere + (erster.n || 0), staerkeAndere = andere.reduce((s, p) => s + (p.k !== undefined ? p.k : p.n || 0), 0);
        // Fenster 1: Anführer / Besitzer (behält Held, Boni, Ausrüstung)
        label.innerHTML = (angr ? 'Angreifer · ' : 'Verteidiger · ') + escapeHtml(erster.name || '?') + ' <small style="text-transform:none;letter-spacing:0">(' + (angr ? 'Anführer' : 'Besitzer') + ')</small>';
        const tr = [...side.querySelectorAll(':scope > .logLine')].find(l => textOf(l).startsWith('Truppen')); if (tr) tr.lastElementChild.textContent = fmt(erster.n);
        if (sumEl) sumEl.lastElementChild.textContent = fmt(gesamt - staerkeAndere);
        // die Boni-Zeilen galten dem ganzen Kampf: im Fenster des Anführers steht nur, was ER mitbringt
        side.querySelectorAll(':scope > .logLine.buff').forEach(l => l.remove());
        const schon = angr ? 0 : Array.isArray(e.defParts) && e.defParts.length ? e.defParts[0][1] || 0 : (e.enemyDefense || 0) - andere.reduce((x, p) => x + (p.plus || 0), 0);   // (Grundverteidigung bzw. Verteidigung steht schon als eigene Zeile da – ohne Bericht-Teile steckt darin auch das Plus der Helfer)
        const eig = gesamt - staerkeAndere - (erster.n || 0) - schon;
        if (eig && tr) tr.insertAdjacentHTML('afterend', zl('Eigene Werte', (eig > 0 ? '+' : '−') + fmt(Math.abs(eig)), ' buff', angr ? 'Held, Fähigkeit Angriff, Titel, Forschung' : 'Rüstung, Fähigkeit Verteidigung, Mauer, Titel, Forschung'));
        if (angr && erster.fallen !== undefined) { const c = side.querySelector(':scope > .logCasualty:not(.wounded)'); if (c) c.lastElementChild.textContent = '−' + fmt(erster.fallen);
            const w = side.querySelector(':scope > .logCasualty.wounded'); if (w) { if (erster.wounded) w.lastElementChild.textContent = fmt(erster.wounded); else w.remove(); } }   // (nur seine – nicht die der ganzen Rally)
        if (!angr && e.type === 'attack') { const weg = andere.reduce((x, p) => x + (p.fallen || 0) + (p.wounded || 0), 0), c = side.querySelector(':scope > .logCasualty:not(.wounded)');   // Besitzer: ohne die Verluste der Helfer (die stehen in ihren Fenstern)
            if (c) c.lastElementChild.textContent = '−' + fmt(Math.max(0, (e.defenderCasualties || 0) - (e.enemyWounded || 0) - weg)); }
        gruppe.appendChild(normal(side, angr, angr ? (sieg ? rohTeil(beute, (erster.n || 0) / Math.max(1, alleT), 1) : {}) : rohTeil(beute, 1, -1), angr ? 0 : schutz, angr ? (erster.fled !== undefined ? erster.fled : fluchtAlle) : 0));
        // weitere Fenster: Rally-Mitglieder / Verstärkung
        for (const p of andere) {
            const b = el('<div class="logSide"><div class="logSideLabel">' + (angr ? 'Angreifer · ' : 'Verteidiger · ') + escapeHtml(p.name || '?') + ' <small style="text-transform:none;letter-spacing:0">(' + (angr ? 'Verbündeter' : 'Verstärkung') + ')</small></div>' +
                zl('Truppen', fmt(p.n)) + (p.k !== undefined && p.k !== p.n ? zl('Eigene Werte', (p.k > p.n ? '+' : '−') + fmt(Math.abs(p.k - p.n)), ' buff', angr ? 'Held, Fähigkeit Angriff, Titel, Forschung' : 'Fähigkeit Verteidigung, Titel, Forschung') : '') +
                '<div class="logSum' + (sumEl && sumEl.classList.contains('advantage') ? ' advantage' : '') + '"><span>Gesamt</span><span>' + fmt(p.k !== undefined ? p.k : p.n) + '</span></div>' +
                '<div class="logCasualty"><span>Gefallen</span><span>−' + fmt(p.fallen || 0) + '</span></div>' +   // (fallen enthält die Verwundeten schon nicht)
                (p.wounded ? '<div class="logCasualty wounded"><span>Verwundet</span><span>' + fmt(p.wounded) + '</span></div>' : '') + '</div>');
            const g = gearVon[p.name]; if (g) b.appendChild(g);
            gruppe.appendChild(normal(b, angr, angr && sieg ? rohTeil(beute, (p.n || 0) / Math.max(1, alleT), 1) : {}, 0, angr ? p.fled || 0 : 0));
        }
    }

    // Spähbericht im selben Aufbau wie ein Verteidiger im Kampfbericht: Verteidigung Teil für Teil, Ausrüstung, Helden, Basis, Rohstoffe
    function spaeh(row, e) {
        const d = row.querySelector('details'); if (!d) return;
        const L = {}; d.querySelectorAll('.logLine').forEach(l => { L[textOf(l)] = l.lastElementChild; });
        const v = k => L[k] ? L[k].textContent.trim() : '–';
        const roh = [['Gold'], ['Holz'], ['Stein'], ['Eisen']].map(([n]) => { const c = L[n]; if (!c) return zl(n, '–', ' kl-null');
            const sm = c.querySelector('small'), haupt = c.cloneNode(true); if (haupt.querySelector('small')) haupt.querySelector('small').remove();
            return zl(n, haupt.textContent.trim(), ' buff', sm ? sm.textContent.replace(/[()]/g, '') : ''); }).join('');
        const s = e.spy, name = (s && s.name) || v('Herr').split(' · ')[0], alt = Date.now() - (e.at || 0) >= SPAEH_ALT_MS;
        const teile = s && Array.isArray(s.teile) && s.teile.length ? s.teile : null;   // (ältere Berichte: nur die Summe)
        const vert = teile ? teile.map((q, i) => zl(escapeHtml(q[0]), (i ? (q[1] < 0 ? '−' : '+') : '') + fmt(Math.abs(q[1])), i ? (q[1] < 0 ? ' buff malus' : ' buff') : '', escapeHtml(q[2] || ''))).join('')
            : zl('Grundverteidigung', fmt(e.defense), '', s ? 'gesamt – älterer Bericht ohne Aufteilung, neu spähen' : e.wartet ? 'Bericht kommt gleich …' : 'gesamt');
        const items = s && s.gear ? Object.keys(EQUIPMENT_DEFS).map(k => { const g = s.gear[k]; return g ? [k, g[0], g[1], g[2] || 0] : [k, -1, 0, 0]; }) : null;   // leerer Platz = nichts angelegt
        const gear = items ? kampfGearHtml({ lvl: fmt(s.lvl), title: s.titel, items, skills: [], city: [] }) : leerGear(s ? 'Spieler-Stufe ' + fmt(s.lvl) : e.wartet ? 'Bericht kommt gleich …' : 'Ohne Herrn', false);
        const box = el('<div class="logSide"><div class="logSideLabel">Gespäht · ' + escapeHtml(name) + '</div>' +
            zl('Gespäht', timeAgoLabel(e.at || 0) + (alt ? ' – neu spähen?' : ''), alt ? ' kl-alt' : '') +
            zl('Truppen', fmt(e.troops)) + (Number.isFinite(e.verst) ? zl('Verstärkung', fmt(e.verst), '', 'Bündnis-Truppen in der Basis – verteidigen mit') : '') + zl('Held', '+0', '', 'zählt beim Verteidigen nicht') + vert +
            '<div class="logSum"><span>Gesamt</span><span>' + fmt((e.troops || 0) + (e.verst || 0) + (e.defense || 0)) + '</span></div>' + '<div class="logCasualty kl-null"><span>Gefallen</span><span>–</span></div>' + zl('Geflohen', '–', ' kl-null') +
            gear + '</div>');
        normal(box, false, {}, 0);
        box.querySelector('.kl-rss').remove();
        const kh = box.querySelector('.kl-keinheld small'); if (kh && L['Helden']) kh.textContent = 'Zuhause: ' + v('Helden') + ' – zählen beim Verteidigen nicht';
        const meta = box.querySelector('.logGearMeta');
        if (meta) meta.textContent = s && s.sk ? 'Fähigkeiten Angriff ' + s.sk.attack + ' · Vert. ' + s.sk.defense + ' · Truppen ' + s.sk.troops
            : s ? 'Ausrüstung und Fähigkeiten unbekannt (älterer Bericht) – neu spähen' : e.wartet ? 'Ausrüstung und Fähigkeiten: der Bericht kommt gleich' : 'Ohne Herrn: keine Ausrüstung, keine Helden';
        if (!items && (s || e.wartet)) box.querySelectorAll('.logGear .tile.empty').forEach(t => { t.title = t.title.replace('leer', 'unbekannt'); });
        box.insertAdjacentHTML('beforeend', '<div class="kl-rss"><div class="logGearHead">Basis</div>' + zl('Basis-Stufe', s && s.bl ? 'Stufe ' + fmt(s.bl) : '–') + zl('Friedensschild', v('Friedensschild')) + zl('Mauer', v('Mauer')) + zl('Burg', v('Burg')) + zl('Forschung', v('Forschung')) + zl('Helden zu Hause', v('Helden')) + '</div>' +
            '<div class="kl-rss"><div class="logGearHead">Rohstoffe</div>' + roh + '</div>');
        const sum = d.querySelector('summary').outerHTML;
        d.innerHTML = sum; const cmp = el('<div class="logCompare"><div class="kl-gruppe kl-v"></div></div>'); cmp.firstChild.appendChild(box); d.appendChild(cmp);
    }

    function umbauen() {
        const rows = [...combatLogListEl.children];
        rows.forEach((row, i) => { const e = combatLog[i]; if (!e) return;
            try {
                if (e.type === 'scout') return spaeh(row, e);
                if (e.type !== 'attack' && e.type !== 'botAttack') return;
                const cmp = row.querySelector('.logCompare'); if (!cmp) return;
                const r = e.plunderRoh || {}, beute = { g: e.plunder || 0, h: r.h || 0, s: r.s || 0, e: r.e || 0 };
                const sides = [...cmp.querySelectorAll(':scope > .logSide')]; if (sides.length < 2) return;
                const angrList = Array.isArray(e.angreifer) && e.angreifer.length > 1 ? e.angreifer : null;
                const bal = row.querySelector('.logBalTxt'), namen = L => L.map(p => escapeHtml(p.name || '?')).join(' + ');   // Balken: alle Namen, nicht nur „Du“
                const atkG = e.type === 'attack' ? (e.myTroops || 0) + (e.attackBuff || 0) : e.myTroops || 0;
                const defG = e.type === 'attack' ? (e.enemyTroops || 0) + (e.enemyDefense || 0) + (e.defenseBuff || 0) : (e.enemyTroops || 0) + (e.enemyDefense || 0);
                if (bal && angrList) { const s0 = bal.firstElementChild, sv = s0.querySelector('svg'); s0.innerHTML = (sv ? sv.outerHTML : '') + namen(angrList) + ' ' + kurz(atkG); }
                if (bal && Array.isArray(e.verst) && e.verst.length) { const s1 = bal.lastElementChild, sv = s1.querySelector('svg'); s1.innerHTML = kurz(defG) + ' ' + escapeHtml(e.defenderName || e.defName || 'Du') + ' + ' + namen(e.verst) + (sv ? sv.outerHTML : ''); }
                const vertList = Array.isArray(e.verst) && e.verst.length ? e.verst : null;
                const sieg = !!e.won;
                seiteUmbauen(sides[0], true, angrList, e, beute, 0, sieg, atkG);
                seiteUmbauen(sides[1], false, vertList, e, sieg ? beute : { g: 0, h: 0, s: 0, e: 0 }, e.plunderSafe || 0, sieg, defG);
            } catch (err) { console.warn('Kampflog-Design', err); }
        });
    }

    // „Kampfdetails“ öffnet eine eigene Seite
    const seite = el('<div class="kl-seite" hidden><div class="kl-kopf"><div class="emblem emblem--gold">' + ic('battlelog') + '</div><div class="kl-txt"><div class="overline" id="klArt">Kampfdetails</div><h3 id="klTitel">Bericht</h3></div>' +
        '<button class="btn-x" type="button" aria-label="Zurück" data-klzu>' + ic('close') + '</button></div>' +
        '<div style="max-width:560px;margin:0 auto"><button type="button" class="btn btn--ghost btn--sm kl-zurueck" data-klzu>' + ic('back') + 'Zurück zum Kampflog</button></div><div class="logList" id="klInhalt"></div></div>');
    document.body.appendChild(seite);
    function oeffnen(row, art) {
        const k = row.cloneNode(true), d = k.querySelector('details'); if (d) d.open = true;
        const inh = seite.querySelector('#klInhalt'); inh.innerHTML = ''; inh.appendChild(k);
        const b = row.querySelector('.lt b'), t = b ? b.cloneNode(true) : null; if (t && t.querySelector('.lbadge')) t.querySelector('.lbadge').remove();
        seite.querySelector('#klTitel').textContent = t ? t.textContent.trim() : 'Bericht';
        seite.querySelector('#klArt').textContent = art || 'Kampfdetails';
        seite.hidden = false; seite.scrollTop = 0;
    }
    seite.addEventListener('click', ev => { if (ev.target.closest('[data-klzu]')) { ev.preventDefault(); seite.hidden = true; } else if (ev.target.closest('.who-link, [data-profile]')) seite.hidden = true; });   // (Name antippen: das Profil soll nicht unsichtbar dahinter aufgehen)
    combatLogListEl.addEventListener('click', ev => { const s = ev.target.closest('summary'); if (!s || !combatLogListEl.contains(s)) return;
        ev.preventDefault(); ev.stopPropagation(); oeffnen(s.closest('.logRow'), s.textContent.trim()); }, true);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !seite.hidden) seite.hidden = true; });
    if (typeof battleLogCloseBtn !== 'undefined') battleLogCloseBtn.addEventListener('click', () => { seite.hidden = true; });

    return umbauen;
})();
combatLogListEl.addEventListener('click', e => {   // ganze Karte antippbar: Details öffnen, sonst auf der Karte zeigen
    const row = e.target.closest('.logRow');
    if (row && row.parentElement === combatLogListEl && !e.target.closest('button, a, summary, details, input, .who-link, [data-profile]')) {
        const s = row.querySelector('summary'), z = row.querySelector('[data-logzeigen]');
        if (s) { s.click(); return; } if (z) { z.click(); return; }
    }
    const b = e.target.closest('[data-logzeigen]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const isl = islandById[+b.dataset.logzeigen]; if (!isl) return;
    battleLogCloseBtn.click(); flyTo(isl.x, isl.y); setTimeout(() => openIslandPopup(isl), 380);
});

battleLogBtn.addEventListener('click', () => {
    if (isPanelOpen(battleLogPopup)) { battleLogCloseBtn.click(); return; }
    closeAllPopups();
    renderActiveMarches();
    renderCombatLog();
    const neu = combatLog.some(x => x.at > battleGesehenBis), unterwegs = !!activeMarchesEl.querySelector('.logRow');   // neue Berichte zuerst, sonst die Märsche
    showBattleTab(neu || !unterwegs ? 'berichte' : 'unterwegs'); battleGesehenBis = Date.now();
    openPanel(battleLogPopup);
    battleLogRefreshTimer = setInterval(refreshBattleLog, 1000);
});
function refreshBattleLog() {             // live countdowns + the rows' relative times ("vor 12 s") while the panel is open
    renderActiveMarches();
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i];
        if (!e || row.dataset.key !== combatLogKey(e)) return;
        const lv = row.querySelector(':scope > .lv'), t = timeAgoLabel(e.at);
        if (lv && lv.textContent !== t) lv.textContent = t; });
}
battleLogCloseBtn.addEventListener('click', () => {
    closePanel(battleLogPopup);
    clearInterval(battleLogRefreshTimer);
});
