// Teil 05d-marsch-liste-kampfbericht.js: Liste der Märsche und Kampfbericht
// Battle log popup: which of your troops are marching right now,
// plus a history of resolved attacks/transfers
const battleLogBtn = document.getElementById('battleLogBtn');
const battleLogBadge = document.getElementById('battleLogBadge');
const battleLogPopup = document.getElementById('battleLogPopup');
const battleLogCloseBtn = document.getElementById('battleLogCloseBtn');
const activeMarchesEl = document.getElementById('activeMarches');
activeMarchesEl.addEventListener('click', e => { const bt = e.target.closest('[data-mact]'); if (!bt) return;
    e.stopPropagation(); if (bt.dataset.mact === 'karte') { closeAllPopups(); flashHint('Tippe eine fremde Basis an → „Angreifen“.', 3500); } else if (bt.dataset.mact === 'recall') recallMarch(bt.dataset.k); else if (bt.dataset.mact === 'speedAll') speedUpAll(bt); else speedUpMarch(bt.dataset.k, bt); });
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
        const tgt = m.k === 'b' ? (m.name || 'Tagesboss') : 'Barbaren-Lager' + (L ? ' · Stufe ' + L : '');
        rows.push(m.back ? logRowHtml('retreat', 'recall', fmtNum(m.troops) + ' Truppen kehren zurück', 'von ' + tgt + ' nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('attack', m.k === 'b' ? 'crown' : 'attack', 'Angriff auf ' + tgt, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen' + (hd ? ' · ' + hd.name + (m.hero2 && heroById(m.hero2) ? ' & ' + heroById(m.hero2).name : '') : ''), clock(sec), marchButtons(m, true))); }
    const fm = (typeof fieldMarches !== 'undefined' ? fieldMarches : []).filter(m => m.who === 'player');   // Sammler: hin und zurück
    for (const m of fm) { const sec = Math.max(0, Math.ceil((m.resolveAt - Date.now()) / 1000)), f = fieldById[m.fieldId], K = f && FIELD_KINDS[f.kind], was = K ? K.name : 'Feld';
        rows.push(m.back ? logRowHtml('retreat', 'recall', 'Sammler kehren zurück', fmtNum(m.troops) + ' Truppen' + (m.load >= 1 ? ' · +' + fmtNum(Math.floor(m.load)) + ' ' + K.what : '') + ' · nach ' + T(m.homeId), clock(sec), marchButtons(m, false))
            : logRowHtml('send', 'send', 'Sammeln → ' + was, 'von ' + T(m.homeId) + ' · ' + fmtNum(m.troops) + ' Truppen', clock(sec), marchButtons(m, true))); }
    const fast = speedableMarches();
    if (fast.length > 1) rows.unshift('<div class="march-all"><span class="mact"><button type="button" data-mact="speedAll"' + (gemsArmed('marschAlle') ? ' class="is-armed"' : '') + ' title="Restzeit aller Märsche halbieren">' + (gemsArmed('marschAlle') ? 'Wirklich? ' + icon('gem') + fmtNum(fast.reduce((a, m) => a + speedUpCost(m), 0)) : icon('hourglass') + 'Alle schneller (' + fast.length + ') · <b>' + fmtNum(fast.reduce((a, m) => a + speedUpCost(m), 0)) + '</b>' + icon('gem')) + '</button></span></div>');
    const amHtml = rows.length ? rows.join('') : leerHtml('hourglass', 'Gerade nichts unterwegs', 'Tippe eine fremde Basis an → „Angreifen“.',
        '<button type="button" class="btn btn--primary btn--haupt" data-mact="karte">' + icon('send') + '<span>Ziel auf der Karte wählen</span></button>');
    if (amHtml !== activeMarchesEl._html) { activeMarchesEl._html = amHtml; activeMarchesEl.innerHTML = amHtml; }   // many fights resolve per second: rebuild only on change (keeps the buttons tappable)
    battleLogPopup.classList.toggle('has-entries', rows.length > 0 || combatLog.length > 0);

    const total = relevantAttackCount + relevantSendCount + pendingScouts.length + pendingRetreats.length + bm.length + fm.length;
    setText(battleLogBadge, total);
    setShown(battleLogBadge, total > 0);
    const tb = document.getElementById('battleTabBadge'); setText(tb, total); setShown(tb, total > 0);
}

// Stufe, Titel, die 4 Ausrüstungsteile, Helden, Fähigkeiten und Stadt einer Seite (Kampfbericht und Spähbericht)
const LEER_STIL = 'filter:grayscale(1) brightness(.55)';                      // leerer Platz: Rahmen grau abgedunkelt (nicht wie angelegt)
const LEER_IC = h => '<span class="kl-leer-ic" style="display:inline-flex;opacity:.35;filter:grayscale(1)">' + h + '</span>';   // leerer Ausrüstungs-Platz: Symbol grau
function kampfGearHtml(g) { if (!g) return '';
    const tiles = g.items.map((it, i) => { const d = EQUIPMENT_DEFS[it[0]], rd = RARITY_DEFS[it[1]];
        return '<span class="gslot"><span class="tile' + (rd ? '' : ' empty') + '"' + (rd ? ' data-r="' + rd.key + '"' : ' style="' + LEER_STIL + '"') + ' title="' + d.name + (rd ? ' – ' + rd.label + ', Stufe ' + it[2] : ' – leer') + '">' + (rd ? icon(d.icon) : LEER_IC(icon(d.icon))) +
            (rd ? '<span class="lvl">' + it[2] + '</span>' + (it[3] ? '<span class="stars">' + icon('star').repeat(it[3]) + '</span>' : '') : '') + '</span></span>'; }).join('');
    const heroes = (g.hx ? [g.hx, ...(g.hx.h2 ? [g.hx.h2] : [])] : []).map(x => { const hd = heroById(x.id); if (!hd) return ''; const rd = RARITY_DEFS[hd.r];   // who led (Haupt- und Zweitheld), his stars, whether the rage fired, every bonus
            return '<div class="logHero" style="--hc:' + rd.color + '"><span class="ghero">' + heroImg(hd.id) + '<span><b>' + hd.name + ' <small>' + heroStarTxt(x.q) + ' · ' + rd.label + '</small></b>' +
                '<small>' + (x.zweit ? 'Zweitheld · Werte und passive Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) + ' %' : x.vh ? 'Verteidigungs-Held · aus der Mauer' : x.fired ? '<em class="logHeroFire">' + escapeHtml(x.skill || '') + ' gezündet</em>' : 'Aktive Fähigkeit nicht gezündet') + '</small></span></span>' +
                (x.lines || []).map(l => '<div class="logLine buff"><span>' + escapeHtml(l[0]) + '</span><span>' + escapeHtml(l[1]) + '</span></div>').join('') + '</div>'; }).join('') +
        (g.heroes || []).map(x => { const hd = heroById(x[0]); return hd ? '<span class="ghero" style="--hc:' + RARITY_DEFS[hd.r].color + '">' + heroImg(hd.id) + '<span><b>' + hd.name + '</b><small>Stufe ' + x[1] + '</small></span></span>' : ''; }).join('');   // (older reports)
    if (g.heroOnly) return '<div class="logGear"><div class="logGearHeroes">' + heroes + '</div></div>';
    return '<div class="logGear"><div class="logGearHead">Spieler-Stufe ' + g.lvl + (g.title ? ' · Titel ' + escapeHtml(g.title) : '') + '</div>' +
        '<div class="logGearItems">' + tiles + '</div>' + (heroes ? '<div class="logGearHeroes">' + heroes + '</div>' : '') +
        '<div class="logGearMeta">' + (g.items.some(it => RARITY_DEFS[it[1]]) ? '' : 'keine Ausrüstung angelegt<br>') + 'Fähigkeit Angriff ' + g.skills[0] + ' · Verteidigung ' + g.skills[1] + '<br>Mauer ' + g.city[0] + ' · Krankenhaus ' + g.city[1] + ' · Heldenhalle ' + g.city[2] + '</div></div>'; }
// Kampfbericht (Angriff/Verteidigung) im neuen Aufbau (Alexander 9.10., Vorbild RoK): Band, Ort, Kräfte, VS, Truppen, Kampfkraft mit Quelle,
// Helden, Ausrüstung & Stadt, jeder Spieler, Beute als Bild + Zahl, Hinweise, Knöpfe. Nur echte Zahlen aus dem Bericht.
// Eigener Spieler und Gegner offen – weitere Rally-Mitglieder / Verstärkung zugeklappt.
function kbSeiten(e) {
    const bot = e.type === 'botAttack', z = v => Math.max(0, Math.round(v || 0)), summe = (L, k) => L.reduce((s, p) => s + z(p[k]), 0);
    const ichW = e.meine && e.meine.w;
    const truppenQuelle = L => L.length > 1 ? L.map(p => escapeHtml(p.name || '?') + ' ' + fmtNum(z(p.n))).join(' · ') : '';
    // Angreifer: Anführer + Rally-Mitglieder (oder einer allein)
    const aL = Array.isArray(e.angreifer) && e.angreifer.length > 1
        ? e.angreifer.map((p, i) => ({ name: p.name || '?', rolle: i ? 'Rally-Mitglied' : 'Anführer', n: z(p.n), k: p.k, fallen: z(p.fallen), wounded: z(p.wounded), fled: z(p.fled), gear: p.gear, ich: !!ichW && p.w === ichW }))
        : [{ name: bot ? e.botName || '?' : 'Du', rolle: 'Angreifer', n: z(bot ? (e.atkRaw !== undefined ? e.atkRaw : e.myTroops) : e.myTroops), gear: e.atkGear, ich: !bot,
            fallen: z(bot ? (e.atkFallen || 0) - (e.atkWounded || 0) : e.attackerCasualties), wounded: z(bot ? e.atkWounded : e.wounded), fled: z(bot ? e.atkFled : e.won ? 0 : e.retreatSurvivors) }];
    // Verteidiger: Besitzer + Verstärkung
    const hL = Array.isArray(e.verst) ? e.verst : [], hWeg = hL.reduce((s, h) => s + z(h.fallen) + z(h.wounded), 0);
    const besitzer = bot ? (e.rolle === 'helfer' ? e.defName || '?' : 'Du') : e.defenderName || 'Besatzung';
    const vL = [{ name: besitzer, rolle: 'Besitzer', n: z(hL.length ? e.eigen : e.enemyTroops), gear: e.defGear, ich: bot && e.rolle !== 'helfer',
        fallen: z(bot ? (e.fallen || 0) - (e.wounded || 0) : (e.defenderCasualties || 0) - (e.enemyWounded || 0) - hWeg), wounded: z(bot ? e.wounded : e.enemyWounded), fled: 0 },
        ...hL.map(h => ({ name: h.name || '?', rolle: 'Verstärkung', n: z(h.n), k: h.k, fallen: z(h.fallen), wounded: z(h.wounded), fled: 0, gear: h.gear, ich: !!ichW && h.w === ichW }))];
    const mitTitel = L => L.length > 1 ? ' (alle)' : '';
    let aParts, vParts, aSum, vSum, gerettet = [];
    if (bot) {
        const raw = e.atkRaw, rest = raw !== undefined ? (e.myTroops || 0) - raw - (e.atkBonus || 0) : 0;
        aSum = e.myTroops || 0;
        aParts = [['Truppen' + mitTitel(aL), raw !== undefined ? raw : aSum, truppenQuelle(aL), 0], ...(e.atkParts || (raw !== undefined ? [e.atkBonus && ['Angriff-Bonus', e.atkBonus], rest && ['Titel', rest]] : []))];
        vSum = (e.enemyTroops || 0) + (e.enemyDefense || 0);
        vParts = [['Truppen' + mitTitel(vL), e.enemyTroops || 0, truppenQuelle(vL), 0], ...(e.defParts && e.defParts.length ? [[e.defParts[0][0], e.defParts[0][1], e.defParts[0][2], 0], ...e.defParts.slice(1)]
            : [['Verteidigung', e.enemyDefense || 0, '', 0], e.armor && ['davon Rüstung', e.armor, '', 'd']])];
    } else {
        aSum = (e.myTroops || 0) + (e.attackBuff || 0);
        aParts = [['Truppen' + mitTitel(aL), e.myTroops || 0, truppenQuelle(aL), 0], ...(e.atkParts || [['Fähigkeit Angriff', e.skillBuff || 0], e.titleBuff && ['Titel', e.titleBuff]])];
        vSum = (e.enemyTroops || 0) + (e.enemyDefense || 0) + (e.defenseBuff || 0);
        vParts = [['Truppen' + mitTitel(vL), e.enemyTroops || 0, truppenQuelle(vL), 0], ...(e.defParts && e.defParts.length ? [[e.defParts[0][0], e.defParts[0][1], e.defParts[0][2], 0], ...e.defParts.slice(1)]
            : [['Verteidigung', e.enemyDefense || 0, '', 0], ['Verteidigung-Buff', e.defenseBuff || 0]])];
        if (e.lossSaved) { const bern = Math.min(e.heroLossPct || 0, e.lossReductionPct), sh = e.lossReductionPct - bern, sBern = Math.round(e.lossSaved * bern / Math.max(1, e.lossReductionPct));   // Verluste gespart: Schild / Held
            if (sh > 0) gerettet.push(['Schild −' + Math.round(sh) + ' %', e.lossSaved - sBern]); if (bern > 0) gerettet.push(['Held −' + Math.round(bern) + ' % Verluste', sBern]); }
    }
    const seite = (L, start, sum, parts, ger) => ({ spieler: L, start: z(start), gef: summe(L, 'fallen'), vw: summe(L, 'wounded'), fl: summe(L, 'fled'), sum, parts: parts.filter(Boolean), gerettet: ger });
    const A = seite(aL, bot ? (e.atkRaw !== undefined ? e.atkRaw : e.myTroops) : e.myTroops, aSum, aParts, gerettet), V = seite(vL, e.enemyTroops, vSum, vParts, []);
    if (bot && e.atkRaw === undefined) A.unbekannt = 1;                   // (Kriegsherr: nur die Stärke ist bekannt)
    return { A, V, bot };
}
const kbArt = e => timeAgoLabel(e.at) + ' · ' + (e.type === 'attack' ? 'Angriff' : e.rolle === 'helfer' ? 'Verstärkung' : 'Verteidigung');   // Kopfzeile der Seite
function kampfBerichtHtml(e, T, kopf) {                 // kopf: { band, gut, ziel, sub }
    const S = kbSeiten(e), { A, V } = S, f = v => fmtNum(Math.round(v || 0)), B = 'bilder/', gut = kopf.gut;
    const box = (h, sub, inh, kl) => '<div class="kb-box' + (kl ? ' ' + kl : '') + '"><div class="kb-h">' + h + '<small>' + (sub || '') + '</small></div>' + inh + '</div>';
    const feindA = S.bot ? 1 : 0;                                          // ist der Angreifer der Gegner? (Verteidigung/Verstärkung: ja)
    const istFeind = angr => angr ? feindA : !feindA;
    const offen = L => L.filter((p, i) => !i || p.ich), weitere = L => L.filter((p, i) => i && !p.ich);
    const kopfBild = p => { const h = p.gear && p.gear.hx && heroById(p.gear.hx.id); return h ? heroImg(h.id, 'h') : '<span class="h kb-leerkopf">?</span>'; };
    const karte = (p, feind) => '<div class="kb-seite' + (feind ? ' feind' : '') + '"><div class="kb-kopf">' + kopfBild(p) + '<img class="w" src="' + B + 'ui_wappen.webp" alt="" draggable="false"></div>' +
        '<div class="kb-name">' + escapeHtml(p.name) + '</div><div class="kb-sub">' + (p.gear ? 'Spieler-Stufe ' + f(p.gear.lvl) + (p.gear.title ? ' · Titel ' + escapeHtml(p.gear.title) : '') : escapeHtml(p.rolle)) + '</div></div>';
    const pc = (x, s) => (s > 0 ? Math.min(100, 100 * x / s) : 0).toFixed(1) + '%';
    const truppen = (s, t) => { const ue = Math.max(0, s.start - s.gef - s.vw - s.fl);
        if (s.unbekannt) return '<div class="kb-tr"><div class="kb-h kb-h2">' + t + '</div><div class="kb-zahl"><div class="start"><span>Stärke</span><b>' + f(s.sum) + '</b></div><span style="grid-column:1/-1">Verluste nicht im Bericht</span></div></div>';
        return '<div class="kb-tr"><div class="kb-h kb-h2">' + t + '</div><div class="kb-bar"><i class="ue" style="width:' + pc(ue, s.start) + '"></i><i class="vw" style="width:' + pc(s.vw, s.start) + '"></i><i class="tot" style="width:' + pc(s.gef, s.start) + '"></i><i class="fl" style="width:' + pc(s.fl, s.start) + '"></i></div>' +
            '<div class="kb-zahl"><div class="start"><span>Start</span><b>' + f(s.start) + '</b></div>' +
            '<span style="--c:#5fbf5a">Übrig</span><b data-kb="uebrig">' + f(ue) + '</b><span style="--c:#e0a83a">Verwundet</span><b data-kb="verwundet">' + f(s.vw) + '</b>' +
            '<span style="--c:#d0504a">Gefallen</span><b data-kb="gefallen">' + f(s.gef) + '</b><span style="--c:#4f8fe0">Geflohen</span><b data-kb="geflohen">' + f(s.fl) + '</b>' +
            (s.gerettet.length ? '<span class="kb-ger">Verluste gerettet:</span>' + s.gerettet.map(g => '<span style="--c:#9fd38a">' + g[0] + '</span><b>+' + f(g[1]) + '</b>').join('') : '') + '</div></div>'; };
    const kraft = (s, vorn) => '<table class="kb-tab">' + s.parts.map(p => { const roh = p[3] === 0 || p[3] === 'd';
        return '<tr class="' + (roh ? (p[3] === 'd' ? 'davon' : '') : p[1] < 0 ? 'minus' : 'plus') + '"><td>' + escapeHtml(p[0]) + (p[2] ? '<small>' + p[2] + '</small>' : '') + '</td><td>' + (roh ? '' : p[1] < 0 ? '−' : '+') + f(Math.abs(p[1])) + '</td></tr>'; }).join('') +
        '<tr class="sum' + (vorn ? ' vorn' : '') + '"><td>Gesamt</td><td>' + f(s.sum) + '</td></tr></table>';
    const leerHeld = (n, t) => '<div class="kb-held leer"><div class="q">?</div><div><div class="n"><b>' + n + '</b></div><div class="s">' + t + '</div></div></div>';
    const heldKarte = x => { const hd = heroById(x.id); if (!hd) return ''; const rd = RARITY_DEFS[hd.r] || RARITY_DEFS[0];
        return '<div class="kb-held" style="--rc:' + rd.color + '">' + heroImg(hd.id) + '<div><div class="n"><b>' + hd.name + '</b><small>' + rd.label + '</small></div>' +
            '<div class="stern">' + heroStarTxt(x.q) + '</div><div class="s">' + (x.zweit ? 'Zweitheld · Werte und passive Fähigkeiten zu ' + Math.round(HERO_ZWEIT * 100) + ' %' : x.vh ? 'Verteidigungs-Held · aus der Mauer' : x.fired ? '<em>' + escapeHtml(x.skill || '') + ' gezündet</em>' : 'Aktive Fähigkeit nicht gezündet') + '</div></div>' +
            ((x.lines || []).length ? '<div class="w">' + x.lines.map(l => '<span>' + escapeHtml(l[0]) + '<b>' + escapeHtml(l[1]) + '</b></span>').join('') + '</div>' : '') + '</div>'; };
    const helden = (p, angr) => { const g = p.gear, hx = g && g.hx, L = hx ? [hx, ...(hx.h2 ? [hx.h2] : [])] : [];
        const alt = g && !hx && (g.heroes || []).length ? g.heroes.map(x => { const hd = heroById(x[0]); return hd ? '<div class="kb-held" style="--rc:' + RARITY_DEFS[hd.r].color + '">' + heroImg(hd.id) + '<div><div class="n"><b>' + hd.name + '</b></div><div class="s">Stufe ' + x[1] + '</div></div></div>' : ''; }).join('') : '';   // (ältere Berichte)
        if (alt) return alt;
        return (L.length ? L.map(heldKarte).join('') : leerHeld('Kein Hauptheld', angr ? 'Ohne Held losgeschickt' : 'Kein Verteidigungs-Held in der Mauer (oder er war unterwegs)')) + (L.length < 2 ? leerHeld('Kein Zweitheld', 'Platz frei') : ''); };
    const gear = p => { const g = p.gear; if (!g) return '<div class="kb-meta"><span>Ausrüstung und Stadt nicht im Bericht</span></div>';
        return '<div class="kb-gear">' + (g.items || []).map(it => { const d = EQUIPMENT_DEFS[it[0]], rd = RARITY_DEFS[it[1]], bild = BEUTE_SLOT[it[0]] || 'beute_waffe';
            return rd ? '<span class="bk" data-r="' + rd.key + '" title="' + d.name + ' – ' + rd.label + ', Stufe ' + it[2] + '"><img src="' + B + bild + '.webp" alt="' + d.name + '" draggable="false">' + (it[3] ? '<i class="kb-st">' + '★'.repeat(it[3]) + '</i>' : '') + '<b>Stufe ' + it[2] + '</b></span>'
                : '<span class="bk kb-gleer" data-r="grau" title="' + d.name + ' – leer"><img src="' + B + bild + '.webp" alt="' + d.name + '" draggable="false"><b>leer</b></span>'; }).join('') + '</div>' +
            '<div class="kb-meta"><span>Fähigkeit Angriff<b>' + f((g.skills || [])[0]) + '</b></span><span>Fähigkeit Verteidigung<b>' + f((g.skills || [])[1]) + '</b></span>' +
            '<span>Mauer<b>' + f((g.city || [])[0]) + '</b></span><span>Krankenhaus<b>' + f((g.city || [])[1]) + '</b></span><span>Heldenhalle<b>' + f((g.city || [])[2]) + '</b></span><span>Titel<b>' + (g.title ? escapeHtml(g.title) : '–') + '</b></span></div>'; };
    const sh = (p, angr, mehr) => '<div class="kb-sh' + (istFeind(angr) ? ' feind' : '') + '">' + escapeHtml(p.name) + ' · ' + (mehr || p.rolle) + '</div>';
    const alleN = A.spieler.reduce((s, p) => s + p.n, 0) || 1, beuteAnteil = !S.bot && e.won && A.spieler.length > 1;
    const zeile = (p, angr) => '<div class="kb-sp' + (p.ich ? ' ich' : '') + '">' + kopfBild(p) + '<div><b>' + escapeHtml(p.name) + '</b><small>' + p.rolle + ' · ' + f(p.n) + ' Truppen' +
        (p.k !== undefined && p.k !== p.n ? ' · eigene Werte ' + (p.k > p.n ? '+' : '−') + f(Math.abs(p.k - p.n)) : '') + (angr && beuteAnteil ? ' · Beute-Anteil ' + Math.round(100 * p.n / alleN) + ' %' : '') + '</small></div>' +
        '<div class="z">' + f(Math.max(0, p.n - p.fallen - p.wounded - p.fled)) + '<small>−' + f(p.fallen) + ' / ' + f(p.wounded) + ' verw.' + (p.fled ? ' / ' + f(p.fled) + ' gefl.' : '') + '</small></div></div>';
    const mehrBlock = (L, angr) => { const W = weitere(L); if (!W.length) return '';
        return '<details class="kb-mehr"><summary>' + (angr ? 'Weitere Rally-Mitglieder' : 'Verstärkung') + ' · ' + W.length + '</summary>' +
            W.map(p => zeile(p, angr) + sh(p, angr, 'Helden') + helden(p, angr) + sh(p, angr, 'Ausrüstung & Stadt') + gear(p)).join('') + '</details>'; };
    const titelSeite = (s, angr) => (angr ? 'Angreifer' : 'Verteidiger') + ' · ' + s.spieler.map(p => escapeHtml(p.name)).join(' + ');
    // Beute: Bild + Zahl (Kacheln aus 05e)
    const r = e.plunderRoh || {}, roh = { coins: e.plunder || 0, holz: r.h || 0, stein: r.s || 0, eisen: r.e || 0 }, hatRoh = Object.values(roh).some(v => v > 0);
    const kacheln = minus => beuteRaster(Object.keys(roh).map(a => ({ a, n: Math.round(roh[a]), minus })), 'kb-beute');
    const extraK = (n, t) => n > 0 ? '<span class="kb-extra">' + beuteKachel({ a: 'coins', n: Math.round(n) }) + '<small>' + t + '</small></span>' : '';
    let beute = '', beuteKopf = 'Beute', beuteSub = '';
    if (!S.bot) {
        const kill = extraK(e.killGold, 'für Kills');
        if (e.won && hatRoh) { beute = kacheln(false) + (kill ? '<div class="bk-raster kb-beute">' + kill + '</div>' : '') + '<div class="kb-sh feind">Verlust ' + escapeHtml(V.spieler[0].name) + '</div>' + kacheln(true); beuteSub = 'kommt mit dem Marsch heim' + (A.spieler.length > 1 ? ' · nach Truppen geteilt' : ''); }
        else if (kill) { beute = '<div class="bk-raster kb-beute">' + kill + '</div>'; beuteKopf = 'Belohnung'; }
    } else {
        const dg = extraK(e.defGold, 'Verteidigung');
        if (e.won && hatRoh) { beute = kacheln(true); beuteKopf = 'Geraubt'; beuteSub = 'vom Gegner mitgenommen'; }
        if (dg) { beute += '<div class="bk-raster kb-beute">' + dg + '</div>'; if (!beute.includes('data-minus')) beuteKopf = 'Belohnung'; }
    }
    if (e.plunderSafe && (beute || e.won)) beute += '<div class="kb-schutz"><img src="' + B + 'ui_fo_burgschutz.webp" alt="" draggable="false">Burg schützt ' + f(e.plunderSafe) + ' Münzen · ' + f(e.plunderSafe * ROH_JE_MUENZE) + ' je Rohstoff</div>';
    if (e.killGold === undefined && e.attackGoldRate && !S.bot) beute += '<div class="kb-schutz">Angriff: Münzen +' + e.attackGoldRate.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' pro getöteter Truppe</div>';   // (ältere Berichte)
    // Hinweise: Krankenhaus, Flucht
    const hin = [], ich = e.meine && e.meine.fallen !== undefined && (e.rolle === 'mit' || Array.isArray(e.angreifer) || e.rolle === 'helfer') ? e.meine : null;
    const hz = (bild, t) => hin.push('<div><img src="' + B + bild + '.webp" alt="" draggable="false"><span>' + t + '</span></div>');
    if (!S.bot) {
        const fl = ich ? ich.fled : e.retreatSurvivors, wd = ich ? ich.wounded : e.wounded;
        if (!e.won && fl) hz('ui_sym_ziel', fmtNum(fl) + (ich ? ' deiner' : '') + ' Truppen konnten fliehen und kehren zurück');
        if (wd) hz('ui_sym_verwundete', fmtNum(wd) + (ich ? ' deiner' : '') + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt');
        if (e.enemyWounded) hz('ui_sym_verwundete', escapeHtml(e.defenderName || 'Der Gegner') + ' bringt ' + fmtNum(e.enemyWounded) + ' Verwundete ins Krankenhaus');
    } else {
        const wd = e.rolle === 'helfer' ? ich && ich.wounded : e.wounded;
        if (wd) hz('ui_sym_verwundete', fmtNum(wd) + (e.rolle === 'helfer' ? ' deiner' : '') + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt');
        if (e.atkWounded) hz('ui_sym_verwundete', escapeHtml(e.botName) + ' bringt ' + fmtNum(e.atkWounded) + ' Verwundete ins Krankenhaus');
        if (e.atkFled) hz('ui_sym_ziel', fmtNum(e.atkFled) + ' Truppen von ' + escapeHtml(e.botName) + ' fliehen zurück');
    }
    // Knöpfe: Sieg/Angriff → nochmal angreifen · Niederlage mit Verwundeten → heilen
    const meineVerw = S.bot ? (e.rolle === 'helfer' ? ich && ich.wounded : e.wounded) : ich ? ich.wounded : e.wounded;
    const isl = islandById[e.targetId], teilen = typeof bundTeilenKnopf === 'function' ? bundTeilenKnopf(e) : '';
    const knopf = !S.bot && (e.won || !meineVerw) && isl ? '<button class="btn btn--danger btn--gefahr" type="button" data-kbangriff="' + isl.id + '">' + icon('attack') + '<span>Nochmal angreifen</span></button>'
        : meineVerw ? '<button class="btn btn--primary btn--haupt" type="button" data-kbheilen="1">' + icon('plus') + '<span>Verwundete heilen</span></button>' : '';
    const vorn = A.sum >= V.sum;
    return '<div class="kb ' + (gut ? 'sieg' : 'niederlage') + '">' +
        '<div class="kb-band"><img src="' + B + 'marsch_band_' + (gut ? 'sieg' : 'niederlage') + '.webp" alt="" draggable="false"><b>' + kopf.band + '</b></div>' +
        '<div class="kb-ort"><b>' + kopf.ziel + '</b>' + (isl ? ' · ' + coordText(isl.x, isl.y) : '') + (kopf.sub ? '<br>' + kopf.sub : '') +
            (isl ? '<div class="mini"><button type="button" class="btn btn--secondary btn--sm" data-logzeigen="' + isl.id + '">Zeigen</button>' + teilen + '</div>' : '') + '</div>' +
        (e.capitalHolds ? '<div class="kb-brennt">' + (S.bot ? 'Deine Hauptstadt brennt' : 'Hauptstadt brennt') + '</div>' : '') +
        box('Kräfte', 'wer war stärker', '<div class="kb-kraft"><div class="bar"><i style="width:' + pc(A.sum, A.sum + V.sum) + '"></i></div><div class="txt"><span>' + A.spieler.map(p => escapeHtml(p.name)).join(' + ') + '<small>Angriff</small>' + f(A.sum) + '</span>' +
            '<span>' + V.spieler.map(p => escapeHtml(p.name)).join(' + ') + '<small>Verteidigung</small>' + f(V.sum) + '</span></div></div>') +
        '<div class="kb-seiten">' + karte(offen(A.spieler).pop(), istFeind(true)) + '<div class="kb-vs">VS</div>' + karte(offen(V.spieler).pop(), istFeind(false)) + '</div>' +
        box('Truppen', 'Verwundete gehen ins Krankenhaus', '<div class="kb-reihe">' + truppen(A, 'Angreifer') + truppen(V, 'Verteidiger') + '</div>') +
        box('Kampfkraft', 'jeder Bonus mit Quelle', '<div class="kb-sh' + (feindA ? ' feind' : '') + '">' + titelSeite(A, true) + '</div>' + kraft(A, vorn) + '<div class="kb-sh' + (feindA ? '' : ' feind') + '">' + titelSeite(V, false) + '</div>' + kraft(V, !vorn)) +
        box('Helden', 'Hauptheld · Zweitheld', [...offen(A.spieler).map(p => sh(p, true) + helden(p, true)), ...offen(V.spieler).map(p => sh(p, false) + helden(p, false))].join('')) +
        box('Ausrüstung & Stadt', 'Stufe · Sterne · Seltenheit', [...offen(A.spieler).map(p => sh(p, true, p.gear ? 'Spieler-Stufe ' + f(p.gear.lvl) : '') + gear(p)), ...offen(V.spieler).map(p => sh(p, false, p.gear ? 'Spieler-Stufe ' + f(p.gear.lvl) : '') + gear(p))].join('')) +
        (A.spieler.length > 1 || V.spieler.length > 1 ? box('Jeder Spieler', 'übrig · gefallen / verwundet', '<div class="kb-sh' + (feindA ? ' feind' : '') + '">' + titelSeite(A, true) + '</div>' + offen(A.spieler).map(p => zeile(p, true)).join('') + mehrBlock(A.spieler, true) +
            '<div class="kb-sh' + (feindA ? '' : ' feind') + '">' + titelSeite(V, false) + '</div>' + offen(V.spieler).map(p => zeile(p, false)).join('') + mehrBlock(V.spieler, false), 'kb-jeder') : '') +
        (beute ? box(beuteKopf, beuteSub, beute, 'kb-beutebox') : '') +
        (hin.length ? box('Hinweise', '', '<div class="kb-hin">' + hin.join('') + '</div>') : '') +
        (knopf || teilen ? '<div class="kb-knoepfe">' + (teilen ? teilen.replace('btn--ghost btn--sm', 'btn--secondary btn--haupt').replace('Im Bündnis teilen', 'Teilen') : '') + knopf + '</div>' : '') + '</div>';
}
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
    const fmtM = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // meta lines: "987,7 Mio."
    const fmtD = v => fmtNum(v || 0);   // detail cards
    const gearHtml = kampfGearHtml;
    const fieldHeroLine = e => [[e.attacker, e.hA], [e.defender, e.hD]].map(([n, t]) => t ? ' · ' + (n === 'Du' ? 'dein Held ' : escapeHtml(n) + ' mit ') + escapeHtml(t) : '').join('');   // who led out in the open
    const fieldHeroDet = e => e.hx ? '<details><summary>Dein Held</summary>' + gearHtml({ items: [], lvl: playerLvl, hx: e.hx, skills: [], city: [], heroOnly: 1 }) + '</details>' : undefined;
    const karte = (e, kind, ic, badge, title, sub, bar, chips, det) => logRowHtml(kind, ic, logBadge(badge[0], badge[1]) + title, sub, ago(e), (bar || '') + logChips(chips) + (det || ''));   // jede Karte gleich aufgebaut
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
                [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Münzen', 'gut']], fieldHeroDet(entry));
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
                : (entry.gold ? '<div class="logGold">Beute: +' + fmtBig(entry.gold) + ' Münzen' + (entry.kGold ? ' (davon ' + fmtBig(entry.kGold) + ' Angriff: Münzen)' : '') + '</div>' : '') +
                  (entry.crate ? '<div class="logGold">Kiste: ' + escapeHtml(entry.crate) + '</div>' : '') + (entry.sh ? '<div class="logGold">' + escapeHtml(entry.sh) + '</div>' : '') +
                  (entry.n !== undefined ? '<div class="logRetreat">' + (entry.up ? 'Stufe ' + entry.open + ' freigeschaltet · ' : entry.open ? 'Freigeschaltet bis Stufe ' + entry.open + ' · ' : '') + entry.n + ' / ' + barbTagMax() + ' heute</div>' : '');
            const det = tr === undefined ? fieldHeroDet(entry) : '<details><summary>Kampfdetails</summary>' +
                '<div class="logCompare">' + mySide + '<div class="logVsDivider">VS</div>' + foeSide + '</div>' + rew +
                (entry.wounded ? '<div class="logRetreat logWounded">' + fmtNum(entry.wounded) + ' Verwundete gehen ins Krankenhaus – heile sie in der Stadt</div>' : '') +
                (entry.hx ? gearHtml({ items: [], lvl: playerLvl, hx: entry.hx, skills: [], city: [], heroOnly: 1 }) : '') + '</details>';
            const von = (entry.sourceId !== undefined ? 'von ' + T(entry.sourceId) : '') + fieldHeroLine(entry), verl = verlustChips((entry.loss || 0) - (entry.wounded || 0), entry.wounded);
            const extra = [entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Münzen', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']];
            if (boss) return karte(entry, 'win', 'crown', ['win', 'Tagesboss'], escapeHtml(entry.name), von.replace(/^ · /, ''), '',
                [['attack', chipN(entry.dmg) + ' Schaden', 'gut'], ['crown', 'noch ' + chipN(entry.left) + ' Leben'], entry.rank && ['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ...verl, ...extra], det);
            return karte(entry, entry.won ? 'win' : 'loss', 'attack', [entry.won ? 'win' : 'loss', entry.won ? 'Besiegt' : 'Abgewehrt'], 'Barbaren-Lager · Stufe ' + entry.L, von.replace(/^ · /, ''),
                tr === undefined ? '' : logBalance(entry.atk, entry.def, icon('attack') + 'Du ' + fmtM(entry.atk), fmtM(entry.def) + ' Lager' + icon('defense')),
                [...verl, ...extra, entry.up && ['check', 'Stufe ' + entry.open + ' frei', 'gut'], !entry.won && entry.left && ['troops', 'noch ' + chipN(entry.left) + ' im Lager']], det);
        }
        if (entry.type === 'ev') return karte(entry, entry.gut ? 'win' : 'loss', entry.ic || 'attack', [entry.gut ? 'win' : 'loss', escapeHtml(String(entry.badge || ''))], escapeHtml(entry.title || ''), escapeHtml(entry.txt || ''));   // Events (Kriegsherr)
        if (entry.type === 'dbossWin') return karte(entry, 'win', 'crown', ['win', 'Boss gefallen'], escapeHtml(entry.name), 'Preis liegt im Abholfach', '',
            [['rank', 'Platz ' + entry.rank + ' von ' + entry.of], ['attack', chipN(entry.dmg) + ' Schaden'], entry.gems > 0 && ['gem', '+' + chipN(entry.gems) + ' Edelsteine', 'gut'], entry.crate && ['crate', escapeHtml(entry.crate), 'gut'], entry.sh && ['star', escapeHtml(entry.sh), 'gut']]);
        if (entry.type === 'army') {
            const side = (n, own) => n === 'Du' ? (own ? 'Deine Armee' : 'deine Armee') : (own ? 'Die Armee von ' : 'die Armee von ') + escapeHtml(n);
            return karte(entry, entry.won ? 'win' : 'loss', 'troops', [entry.won ? 'win' : 'loss', entry.won ? 'Armee siegt' : 'Armee geschlagen'], 'Kampf im Feld', side(entry.attacker, true) + ' gegen ' + side(entry.defender, false) + fieldHeroLine(entry),
                logBalance(entry.atk, entry.def, icon('attack') + fmtM(entry.atk), fmtM(entry.def) + icon('defense'), entry.attacker !== 'Du'),
                [...verlustChips(0, entry.wounded), entry.gold > 0 && ['coin', '+' + chipN(entry.gold) + ' Münzen', 'gut']], fieldHeroDet(entry));
        }
        if (entry.type === 'volley') {
            const dead = entry.hit - entry.wounded;
            const vdet = '<details><summary>Kampfdetails</summary><div class="logCompare"><div class="logSide">' +
                '<div class="logSideLabel">Beschuss</div>' +
                (entry.shotBy || []).map((s, i) => '<div class="logLine"><span>Wachturm ' + (i + 1) + '</span><span>' + escapeHtml(s) + '</span></div>').join('') +
                '<div class="logLine"><span>Je Wachturm</span><span>' + THRONE_FIRE_PCT + ' %</span></div>' +
                (entry.n > 1 ? '<div class="logLine"><span>Salven</span><span>' + entry.n + '</span></div>' : '') +
                '</div><div class="logVsDivider">VS</div><div class="logSide"><div class="logSideLabel">Du · Thron</div>' +
                (entry.n === 1 ? '<div class="logLine"><span>Truppen vorher</span><span>' + fmtD(entry.before) + '</span></div>' : '') +
                '<div class="logLine"><span>Getroffen</span><span>' + fmtD(entry.hit) + '</span></div>' +
                '<div class="logCasualty wounded"><span>Ins Krankenhaus</span><span>' + fmtD(entry.wounded) + '</span></div>' +
                (dead > 0 ? '<div class="logCasualty"><span>Gefallen (kein Platz)</span><span>−' + fmtD(dead) + '</span></div>' : '') +
                '<div class="logSum"><span>Noch im Thron</span><span>' + fmtD(entry.left) + '</span></div>' +
                '</div></div><div class="logRetreat">Erobere die Wachtürme, dann schweigen sie. Verwundete heilst du im Krankenhaus in deiner Stadt.</div></details>';
            return karte(entry, 'loss', 'attack', ['loss', 'Beschuss'], T(entry.targetId), (entry.shotBy || []).length + ' Wachtürme' + (entry.n > 1 ? ' · ' + entry.n + ' Salven' : ''), '',
                [['attack', chipN(entry.hit) + ' getroffen', 'schlecht'], ...verlustChips(dead, entry.wounded)], vdet);
        }
        if (entry.type === 'scout') {
            if (entry.fehl) return karte(entry, 'scout', 'scout', ['scout', 'Kein Bericht'], T(entry.targetId), '', '', [['info', 'Der Späher hat keinen Bericht gebracht']]);   // (der Weltrechner hat ihn abgelehnt oder nach 10 Min. nichts geschickt)
            const alt = Date.now() - (entry.at || 0) >= SPAEH_ALT_MS;   // Alter des Berichts: ab 30 Min. gelb „neu spähen?“
            return karte(entry, 'scout', 'scout', ['scout', 'Gespäht'], T(entry.targetId), entry.spy ? escapeHtml(entry.spy.name) + ' · Spieler-Stufe ' + fmtNum(entry.spy.lvl) + (entry.spy.bl ? ' · Basis Stufe ' + fmtNum(entry.spy.bl) : '') : '', '',
                [['troops', chipN(entry.troops) + ' Truppen'], ...(entry.verst > 0 ? [['troops', chipN(entry.verst) + ' Verstärkung']] : []), ['defense', chipN(spaehGesamt(entry)) + ' Verteidigung gesamt'],
                    alt && !entry.wartet && ['hourglass', 'gespäht ' + ago(entry) + ' · neu spähen?', 'warn']], spaeherBlickHtml(entry.spy));   // (die Zeit steht schon in der Karte)
        }
        if (entry.type === 'ausgespaeht') return karte(entry, 'loss', 'scout', ['loss', 'Ausgespäht'], T(entry.targetId),   // jemand hat deine Basis ausgespäht
            whoLink(entry.botId || botIdByName[entry.botName], entry.botName || 'Jemand') + ' hat deine Basis ausgespäht – rechne mit einem Angriff.', '', []);
        if (entry.type === 'retreat') {
            return karte(entry, 'retreat', 'recall', ['retreat', 'Zurück'], T(entry.toId), '', '', [['troops', chipN(entry.troops) + ' Truppen wieder daheim']]);
        }
        const kbDet = (gut, band, sub) => '<details><summary>Kampfdetails</summary>' + kampfBerichtHtml(entry, T, { gut, band, ziel: T(entry.targetId), sub }) + '</details>';   // die ganze Seite (öffnet als eigene Seite)
        if (entry.type === 'botAttack') {
            const fallen = entry.fallen, defSum = entry.enemyTroops + entry.enemyDefense;
            const bbar = logBalance(entry.myTroops, defSum, icon('attack') + escapeHtml(entry.botName) + ' ' + fmtM(entry.myTroops), fmtM(defSum) + ' ' + (entry.rolle === 'helfer' ? escapeHtml(entry.defName || '?') : 'Du') + icon('defense'), true);
            if (entry.rolle === 'helfer') { const mh = entry.meine || {}, sub = escapeHtml(entry.defName || '?') + ' gegen ' + escapeHtml(entry.botName) + ' · ' + (entry.won ? 'gefallen' : 'gehalten');   // deine Verstärkung bei einem Bündnis-Mitglied hat mitverteidigt
                return karte(entry, entry.won ? 'loss' : 'win', 'defense', [entry.won ? 'loss' : 'win', 'Verstärkung'], T(entry.targetId), sub, bbar,
                    [['troops', 'deine ' + chipN(mh.n) + ' Truppen'], ...verlustChips(mh.fallen, mh.wounded)], kbDet(!entry.won, entry.won ? 'Gefallen' : 'Gehalten', sub)); }
            const wer = escapeHtml(entry.botName) + (Array.isArray(entry.angreifer) && entry.angreifer.length > 1 ? ' (gemeinsam, ' + entry.angreifer.length + ' Angreifer)' : '');
            const bchips = [...verlustChips(Math.max(0, fallen - (entry.wounded || 0)), entry.wounded), ...beuteChips(entry, false), entry.defGold > 0 && ['coin', '+' + chipN(entry.defGold) + ' Münzen', 'gut']];
            const [kind, ic, badge, sub] = entry.capitalHolds ? ['loss', 'bot', 'Geplündert', wer + ' hat die Garnison geschlagen – die Stadt hält'] : entry.won ? ['loss', 'bot', 'Verloren', wer + ' hat die Basis erobert'] : ['win', 'shield', 'Verteidigt', wer + ' zurückgeschlagen'];
            return karte(entry, kind, ic, [kind, badge], T(entry.targetId), sub, bbar, bchips, kbDet(kind === 'win', badge, sub));
        }
        const atkTotal = entry.myTroops + entry.attackBuff, defTotal = entry.enemyTroops + entry.enemyDefense + entry.defenseBuff;
        const ich = entry.meine && entry.meine.fallen !== undefined && (entry.rolle === 'mit' || Array.isArray(entry.angreifer)) ? entry.meine : null;   // gemeinsam: deine eigenen Zahlen (geflohen, übrig, verwundet, gefallen)
        const meine = entry.meine || {}, ichUeb = ich && ich.rest !== undefined;   // (ältere Berichte: ohne rest/fled → die Zahlen des ganzen Kampfs)
        const badge = entry.capitalHolds ? 'Geplündert' : entry.won ? 'Sieg' : 'Niederlage';
        const sub = (entry.rolle === 'mit' ? 'Rally mit ' + escapeHtml(entry.fuehrer || '?') + ' · ' : Array.isArray(entry.angreifer) && entry.angreifer.length > 1 ? entry.angreifer.length + ' Angreifer · ' : '') + 'von ' + T(entry.sourceId);
        return karte(entry, entry.won ? 'win' : 'loss', entry.won ? 'level' : 'losses', [entry.won ? 'win' : 'loss', badge], T(entry.targetId), sub,
            logBalance(atkTotal, defTotal, icon('attack') + 'Du ' + fmtM(atkTotal), fmtM(defTotal) + ' ' + escapeHtml(entry.defenderName || 'Abwehr') + icon('defense')),
            [...(entry.rolle === 'mit' || ich ? verlustChips(meine.fallen, meine.wounded) : verlustChips(entry.attackerCasualties, entry.wounded)),
                entry.won ? ['troops', chipN(ichUeb ? ich.rest : entry.remaining) + ' übrig'] : (ichUeb ? ich.fled : entry.retreatSurvivors) > 0 && ['recall', chipN(ichUeb ? ich.fled : entry.retreatSurvivors) + ' fliehen heim'],
                ...beuteChips(entry, true), entry.killGold > 0 && ['coin', '+' + chipN(entry.killGold) + ' Münzen für Kills', 'gut']], kbDet(!!entry.won, badge, sub));
    })(entry); } catch (err) { console.warn('Kampfbericht', err); return logRowHtml('loss', 'info', 'Kampfbericht', 'Dieser Bericht kann nicht angezeigt werden.', ''); }
    }).join('');
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i]; if (!e) return; row.dataset.key = combatLogKey(e);
        const isl = islandById[e.targetId ?? e.toId], lt = row.querySelector(':scope > .lt'); if (!isl || !lt) return;   // wo war das? Koordinaten + „Zeigen“ auf der Karte
        lt.insertAdjacentHTML('beforeend', '<small class="logOrt">' + coordText(isl.x, isl.y) + ' <button type="button" class="btn btn--secondary btn--sm" data-logzeigen="' + isl.id + '">Zeigen</button>' + (typeof bundTeilenKnopf === 'function' ? bundTeilenKnopf(e) : '') + '</small>'); });   // (+ im Bündnis teilen)
    try { kampflogUmbauen(); } catch (err) { console.warn('Kampfbericht', err); }   // neuer Aufbau: ein Fenster je Spieler
}

// ===== Kampfbericht-Liste: Balken mit allen Namen, Spähbericht im eigenen Aufbau; „Kampfdetails“ öffnet eine eigene Seite
// (Angriff/Verteidigung: der neue Kampfbericht aus kampfBerichtHtml).
const kampflogUmbauen = (function () {
    const fmt = v => Math.round(v || 0).toLocaleString('de-DE'), kurz = v => Math.abs(v || 0) >= 1e6 ? fmtCompact(v || 0) : fmtNum(v || 0);   // (Balken: wie renderCombatLog)
    const ic = n => '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"></use></svg>';
    const zl = (a, b, kl, src) => '<div class="logLine' + (kl || '') + '"><span>' + a + (src ? '<small class="logSrc">' + src + '</small>' : '') + '</span><span>' + b + '</span></div>';
    const el = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
    const leerHeld = (n, t) => '<div class="logHero kl-keinheld"><span class="ghero"><span class="kl-leer">?</span><span><b>' + n + '</b>' + (t ? '<small>' + t + '</small>' : '') + '</span></span></div>';
    const textOf = n => (n && n.firstElementChild ? n.firstElementChild.textContent : '').trim();

    const heldZeile = (mit, angr) => mit ? zl('Held', 'dabei', '', 'steckt in „Eigene Werte“') : zl('Held', '+0', '', angr ? 'ohne Held' : 'kein Verteidigungs-Held in der Mauer');   // gleich in Kampf- und Spähbericht
    // Spähbericht (Vorbild RoK): oben die Verteidigung Teil für Teil wie im Kampfbericht, darunter kompakt Herr, Verteidigungs-Held,
    // Basis und Rohstoffe – nur was der Späher gefunden hat (keine Zeilen voller „–“); das Alter steht EINMAL oben in der Karte
    const block = (kopf, inhalt) => inhalt ? '<div class="kl-rss"><div class="logGearHead">' + kopf + '</div>' + inhalt + '</div>' : '';
    const gitter = h => '<div class="kl-gitter" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));column-gap:16px">' + h + '</div>';
    function spaehHerr(s) {                                                   // Stufe, Titel, angelegte Ausrüstung, Fähigkeiten
        const items = s.gear ? Object.keys(EQUIPMENT_DEFS).filter(k => s.gear[k]).map(k => [k, s.gear[k][0], s.gear[k][1], s.gear[k][2] || 0]) : [];
        const g = el(kampfGearHtml({ lvl: fmt(s.lvl), title: s.titel, items, skills: [], city: [] }));
        g.querySelector('.logGearHead').textContent = 'Herr · Spieler-Stufe ' + fmt(s.lvl) + (s.titel ? ' · Titel ' + s.titel : '');
        if (!items.length) g.querySelector('.logGearItems').remove();
        g.querySelector('.logGearMeta').textContent = (s.sk ? 'Fähigkeiten Angriff ' + s.sk.attack + ' · Vert. ' + s.sk.defense + ' · Truppen ' + s.sk.troops : 'Fähigkeiten unbekannt (älterer Bericht)') +
            (!s.gear ? ' · Ausrüstung unbekannt (älterer Bericht) – neu spähen' : items.length ? '' : ' · keine Ausrüstung angelegt');
        return g.outerHTML;
    }
    function spaehHeld(s) {                                                   // Verteidigungs-Held aus der Mauer: eine Karte, nur seine echten Werte
        const vhd = s.vh && heroById(s.vh.id) ? s.vh : null, kopf = '<div class="logGearHead">Verteidigungs-Held</div>';
        if (!vhd) return '<div class="logGear">' + kopf + '<div class="logGearHeroes">' + leerHeld('Kein Hauptheld', s.vh !== undefined ? 'Kein Verteidigungs-Held in der Mauer (oder er war unterwegs)' : 'älterer Bericht – neu spähen') +
            leerHeld('Kein Zweitheld', '') + '</div></div>';                // dieselben leeren „?“-Plätze wie im Kampfbericht
        const g = el(kampfGearHtml({ items: [], hx: vhd, heroOnly: 1 }));
        g.insertAdjacentHTML('afterbegin', kopf);
        g.querySelectorAll('.logHero').forEach((h, i) => { if (!i) h.style.borderTop = '0';   // (die Linie zieht schon der Kasten)
            const L = [...h.querySelectorAll(':scope > .logLine')]; if (!L.length) return;
            h.insertAdjacentHTML('beforeend', gitter(L.map(l => l.outerHTML).join(''))); L.forEach(l => l.remove()); });
        return g.outerHTML;
    }
    function spaehBasis(s) {
        const A = s.auf || {}, fo = A.fo, stern = q => heroStarTxt(Math.round(q * 2));   // (held: Sterne/2 wie im Bericht)
        return (s.bl ? zl('Basis-Stufe', 'Stufe ' + fmt(s.bl)) : '') + zl('Friedensschild', s.schild ? 'aktiv' : 'keiner') + (s.wall !== undefined ? zl('Mauer', 'Stufe ' + fmt(s.wall)) : '') +
            (A.burg ? zl('Burg', 'Stufe ' + fmt(A.burg)) : '') +
            (fo ? zl('Forschung', fo.atk || fo.def || fo.laz ? 'Angriff ' + (fo.atk | 0) + ' · Vert. ' + (fo.def | 0) + ' · Krankenhaus ' + (fo.laz | 0) : 'keine') : '') +
            (s.held ? zl('Helden zu Hause', s.held.length ? s.held.map(h => escapeHtml(h[0]) + ' ' + stern(h[1])).join(', ') : 'keine') : '');
    }
    function spaehRoh(s) {                                                    // was er hat – und was davon an der Hauptstadt zu holen ist
        const R = (s.auf || {}).roh; if (!R) return '';
        const sR = R.schutzR || R.schutz * ROH_JE_MUENZE;               // Holz/Stein/Eisen: eigener (größerer) Schutz – nicht der Münzen-Schutz
        const z = (n, v, sch) => v === undefined ? '' : zl(n, fmtCompact(v), v > sch ? ' buff' : ' kl-null', v > sch ? fmtCompact(Math.floor((v - sch) * HAUPT_BEUTE)) + ' zu holen an der Hauptstadt' : 'alles von der Burg geschützt');
        return z('Münzen', R.c, R.schutz) + z('Holz', R.h, sR) + z('Stein', R.s, sR) + z('Eisen', R.e, sR) +
            (R.schutz ? zl('<small class="logSrc">Burg schützt ' + fmt(niceRound(R.schutz)) + ' Münzen · ' + fmt(niceRound(sR)) + ' je Rohstoff</small>', '') : '');
    }
    function spaeh(row, e) {
        const d = row.querySelector('details'); if (!d) return;
        const s = e.spy, name = (s && s.name) || '?';
        const teile = s && Array.isArray(s.teile) && s.teile.length ? s.teile : null;   // (ältere Berichte: nur die Summe)
        const vert = teile ? teile.filter((q, i) => !i || q[1]).map((q, i) => zl(escapeHtml(q[0]), (i ? (q[1] < 0 ? '−' : '+') : '') + fmt(Math.abs(q[1])), i ? (q[1] < 0 ? ' buff malus' : ' buff') : '', escapeHtml(q[2] || ''))).join('')   // (Teile mit 0 fallen weg)
            : zl('Grundverteidigung', fmt(e.defense), '', s ? 'gesamt – älterer Bericht ohne Aufteilung, neu spähen' : 'gesamt');
        const box = el('<div class="logSide"><div class="logSideLabel">Gespäht · ' + escapeHtml(name) + '</div>' +
            zl('Truppen', fmt(e.troops)) + (s ? heldZeile(s.vh && heroById(s.vh.id)) : '') + (e.verst > 0 ? zl('Verstärkung', fmt(e.verst), '', 'Bündnis-Truppen in der Basis – verteidigen mit') : '') + vert +
            '<div class="logSum"><span>Verteidigung gesamt</span><span>' + fmt(spaehGesamt(e)) + '</span></div>' +
            (s ? spaehHerr(s) + spaehHeld(s) + block('Basis', spaehBasis(s)) + block('Rohstoffe', spaehRoh(s)) : '') + '</div>');
        const sum = d.querySelector('summary').outerHTML;
        d.innerHTML = sum; const cmp = el('<div class="logCompare"><div class="kl-gruppe kl-v"></div></div>'); cmp.firstChild.appendChild(box); d.appendChild(cmp);
    }

    function umbauen() {
        const rows = [...combatLogListEl.children];
        rows.forEach((row, i) => { const e = combatLog[i]; if (!e) return;
            try {
                if (e.type === 'scout') return spaeh(row, e);
                if (e.type !== 'attack' && e.type !== 'botAttack') return;
                const angrList = Array.isArray(e.angreifer) && e.angreifer.length > 1 ? e.angreifer : null;
                const bal = row.querySelector('.logBalTxt'), namen = L => L.map(p => escapeHtml(p.name || '?')).join(' + ');   // Balken: alle Namen, nicht nur „Du“
                const atkG = e.type === 'attack' ? (e.myTroops || 0) + (e.attackBuff || 0) : e.myTroops || 0;
                const defG = e.type === 'attack' ? (e.enemyTroops || 0) + (e.enemyDefense || 0) + (e.defenseBuff || 0) : (e.enemyTroops || 0) + (e.enemyDefense || 0);
                if (bal && angrList) { const s0 = bal.firstElementChild, sv = s0.querySelector('svg'); s0.innerHTML = (sv ? sv.outerHTML : '') + namen(angrList) + ' ' + kurz(atkG); }
                if (bal && Array.isArray(e.verst) && e.verst.length) { const s1 = bal.lastElementChild, sv = s1.querySelector('svg'); s1.innerHTML = kurz(defG) + ' ' + escapeHtml(e.defenderName || e.defName || 'Du') + ' + ' + namen(e.verst) + (sv ? sv.outerHTML : ''); }
            } catch (err) { console.warn('Kampflog-Design', err); }
        });
    }

    // „Kampfdetails“ öffnet eine eigene Seite (Handy) bzw. ein Fenster über der Karte (Desktop, statt schwarzer Vollseite)
    const seite = el('<div class="kl-seite" hidden><div class="kl-fenster"><div class="kl-kopf"><div class="emblem emblem--gold">' + ic('battlelog') + '</div><div class="kl-txt"><div class="overline" id="klArt">Kampfdetails</div><h3 id="klTitel">Bericht</h3></div>' +
        '<button class="btn-x" type="button" aria-label="Zurück" data-klzu>' + ic('close') + '</button></div>' +
        '<div style="max-width:560px;margin:0 auto"><button type="button" class="btn btn--ghost btn--sm kl-zurueck" data-klzu>' + ic('back') + 'Zurück zum Kampflog</button></div><div class="logList" id="klInhalt"></div></div></div>');
    document.body.appendChild(seite);   // (Desktop: Fenster unter dem HUD, Inhalt rollt darin – 03 .kl-fenster)
    function oeffnen(row, art) {
        const inh = seite.querySelector('#klInhalt'), kb = row.querySelector('details > .kb'), e = combatLog.find(x => combatLogKey(x) === row.dataset.key);
        let k;
        if (kb) { k = el('<div class="logRow kb-row"></div>'); k.dataset.key = row.dataset.key; k.appendChild(kb.cloneNode(true)); }   // neuer Kampfbericht: nur die Seite, ohne die Karte der Liste
        else { k = row.cloneNode(true); const d = k.querySelector('details'); if (d) d.open = true; }
        inh.innerHTML = ''; inh.appendChild(k);
        const b = row.querySelector('.lt b'), t = b ? b.cloneNode(true) : null; if (t && t.querySelector('.lbadge')) t.querySelector('.lbadge').remove();
        seite.querySelector('#klTitel').textContent = kb ? 'Kampfbericht' : t ? t.textContent.trim() : 'Bericht';
        seite.querySelector('#klArt').textContent = kb && e ? kbArt(e) : art || 'Kampfdetails';
        seite.hidden = false; seite.scrollTop = 0; inh.scrollTop = 0;
    }
    const zeigen = id => { const isl = islandById[+id]; seite.hidden = true; if (!isl) return; battleLogCloseBtn.click(); flyTo(isl.x, isl.y); setTimeout(() => openIslandPopup(isl), 380); };   // (Nochmal angreifen: dort steht „Angreifen“)
    seite.addEventListener('click', ev => { if (ev.target === seite || ev.target.closest('[data-klzu]')) { ev.preventDefault(); seite.hidden = true; return; }
        if (ev.target.closest('.who-link, [data-profile]')) { seite.hidden = true; return; }   // (Name antippen: das Profil soll nicht unsichtbar dahinter aufgehen)
        const z = ev.target.closest('[data-logzeigen], [data-kbangriff]'); if (z) { ev.preventDefault(); return zeigen(z.dataset.logzeigen || z.dataset.kbangriff); }
        if (ev.target.closest('[data-kbheilen]')) { ev.preventDefault(); seite.hidden = true; battleLogCloseBtn.click(); openCity(() => { cityOpenId = 'hospital'; cityPage = 'nutz'; cityFocus('hospital'); renderCitySheet(); }); return; }   // ins Krankenhaus
        const tl = ev.target.closest('[data-logteilen]'), row = tl && tl.closest('.logRow');   // teilen: wie der Knopf in der Liste
        const orig = row && [...combatLogListEl.children].find(r => r.dataset.key === row.dataset.key), kn = orig && orig.querySelector('.lt [data-logteilen]');
        if (kn) { ev.preventDefault(); kn.click(); } });
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
    const alter = (row, e) => { const lv = row.querySelector(':scope > .lv'), t = timeAgoLabel(e.at);
        if (lv && lv.textContent !== t) lv.textContent = t;
        const c = e.type === 'scout' && [...row.querySelectorAll('.lchip--warn > span')].find(x => x.textContent.startsWith('gespäht vor'));   // Spähbericht: „gespäht vor …“ läuft mit (ein Alter, nie zwei)
        if (c) c.textContent = c.textContent.replace(/^gespäht vor [^·]*·/, 'gespäht ' + t + ' ·'); };
    [...combatLogListEl.children].forEach((row, i) => { const e = combatLog[i];
        if (e && row.dataset.key === combatLogKey(e)) alter(row, e); });
    const offen = document.querySelector('.kl-seite:not([hidden]) #klInhalt > .logRow');   // die offene Bericht-Seite ebenso
    if (offen) { const e = combatLog.find(x => combatLogKey(x) === offen.dataset.key); if (e && offen.classList.contains('kb-row')) setText(document.getElementById('klArt'), kbArt(e)); else if (e) alter(offen, e); }
}
battleLogCloseBtn.addEventListener('click', () => {
    closePanel(battleLogPopup);
    clearInterval(battleLogRefreshTimer);
});
