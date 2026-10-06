// Teil 06b-pass-anleitung.js: Saison-Pass und Anleitung für neue Spieler
// ===== SAISON-PASS: 28 days on one calendar for everyone, 40 levels of 300 points, a free row and a premium row (Gems, never money). Points come from what you do anyway =====
var PASS_EPOCH = Date.UTC(2026, 0, 5), PASS_LEN = 28 * 86400000, PASS_GRACE = 3 * 86400000, PASS_LVLS = 40, PASS_STEP = 300, PASS_PREMIUM = 1000, PASS_OWNED_GEMS = 150;   // (Skin schon da: 150 Gems – vorher 1000, dann brachte der Premium-Pass mehr Gems zurück, als er kostet)
var PASS_XP = { quest: 40, questBonus: 80, captures: 20, pvpWins: 10, defends: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, upgrade: 4, pickup: 8, crate: 3, scouts: 3, heroFires: 2, bau: 15, forschung: 15 };   // what each deed is worth (bau/forschung: in der Stadt gestartet)
var PASS_BOT_XP = { caps: 20, pvp: 10, defs: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, scouts: 3, heroFires: 2, bau: 15, fo: 15 };   // the same by the names in the others' stats (+ 200 a day with all tasks done)
var PASS_HOW = [['goal', 'Tagesaufgabe abgeholt', 40], ['star', 'Alle drei Aufgaben (Bonus)', 80], ['flag', 'Basis erobert', 20], ['attack', 'Basis eines Spielers (zusätzlich)', '+10'], ['shield', 'Angriff abgewehrt', 15], ['troops', 'Armee siegt im Feld', 15],
    ['losses', 'Kriegsherr besiegt', 60], ['temple', 'Tempel erobert', 25], ['crown', 'Minute auf dem Thron', 2], ['upgrade', 'Basis ausgebaut', 4], ['coin', 'Karten-Belohnung', 8], ['scout', 'Späher ausgeschickt', 3], ['shop', 'Kiste geöffnet', 3], ['castle', 'Bau in der Stadt gestartet', 15], ['flask', 'Forschung gestartet', 15]];
function passRewardAt(L, prem) {                          // what level L gives in each row (Münzen: n Stunden Ertrag – 6.10. 4/12 statt 1/3, „10 Münzen“ sah kaputt aus)
    if (!prem) return L % 10 === 0 ? { k: 'royal', n: 1 } : L % 5 === 0 ? { k: 'gems', n: 50 } : L % 4 === 0 ? { k: 'shards', n: 5 } : L % 3 === 0 ? { k: 'crate', n: 2 } : L % 2 === 0 ? { k: 'coins', n: 4 } : { k: 'gems', n: 15 };
    return L === 20 ? { k: 'march', id: 'saison' } : L === 40 ? { k: 'frame', id: 'saison' } : L % 10 === 0 ? { k: 'gems', n: 200 } : L % 5 === 0 ? { k: 'royal', n: 1 } : L % 4 === 0 ? { k: 'shards', n: 15 } :
        L % 6 === 0 ? { k: 'tp', n: 150 } : L % 3 === 0 ? { k: 'shield', n: 8 } : L % 2 === 0 ? { k: 'coins', n: 12 } : { k: 'gems', n: 40 };
}
var passState = null, passArm = 0, passTimer = null;
function passLoad() { if (!passState) { try { passState = JSON.parse(store.get('openWaterPass')); } catch (e) {} if (!passState || typeof passState !== 'object' || !passState.s) passState = { s: {} }; } return passState; }
function passSave() { store.set('openWaterPass', JSON.stringify(passLoad())); }
function passNo(t) { return Math.floor((t - PASS_EPOCH) / PASS_LEN) + 1; }             // Saison-Pass N, the same for everyone (die Nummer zeigt das Spiel nicht: neben „Welt-Saison 1“ verwirrte „Saison-Pass 10“)
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
    if (r.k === 'coins') { const c = Math.max(wirtM(5000), Math.round(hourProduction(who).coins)) * n; if (b) botCoins[who] = (botCoins[who] || 0) + c; else coins += c; return '+' + fmtCompact(c) + ' Münzen'; }
    if (r.k === 'gems') { if (b) b.gems += n; else gems += n; return '+' + n + ' Edelsteine'; }
    if (r.k === 'tp') { if (b) b.tp = (b.tp || 0) + n; else { throneState.pts = (throneState.pts || 0) + n; saveThrone(); } return '+' + n + ' Thron-Punkte'; }
    if (r.k === 'shards') { const h = heroGrantShards(who, n); if (h) return '+' + n + ' Splitter ' + h.name; if (b) b.gems += n * 20; else gems += n * 20; return '+' + n * 20 + ' Edelsteine (alle Helden voll)'; }
    if (r.k === 'shield') { if (b) { b.shields = b.shields || {}; b.shields[n] = (b.shields[n] || 0) + 1; } else { const st = shieldStock(); st[n] = (st[n] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); } return 'Friedensschild ' + n + ' h'; }
    if (r.k === 'crate' || r.k === 'royal') { const t = [];
        for (let i = 0; i < n; i++) { const rr = r.k === 'royal' ? Math.max(3, pickRandomRarity()) : pickRandomRarity(), slot = pickRandomSlot();
            if (b) b.spare[slot][rr]++; else { addInventoryItem(slot, rr, 1); questProgress('crate', 1); t.push(RARITY_DEFS[rr].label + ' ' + EQUIPMENT_DEFS[slot].name); } } return t.join(', '); }
    if (r.k === 'frame' || r.k === 'march') { const d = lkDef(r.k, r.id), key = r.k + 's', has = ((b ? b[key] : look[key]) || []).includes(r.id);
        if (has) { if (b) b.gems += PASS_OWNED_GEMS; else gems += PASS_OWNED_GEMS; return '+' + PASS_OWNED_GEMS + ' Edelsteine („' + d.name + '“ hast du schon)'; }   // a later season: gems instead
        if (b) { b[key] = [...(b[key] || []), r.id]; if (r.k === 'march') b.march = r.id; }
        else { look[key] = [...new Set([...(look[key] || []), r.id])]; look[r.k] = r.id; saveLook(); renderLook(); }
        return (r.k === 'frame' ? 'Rahmen' : 'Marsch-Skin') + ' „' + d.name + '“ – schon angelegt'; }
    return '';
}
function passClaim(list) {                                // [[season, level, premium], …] → hand out, one hint
    const got = [];
    for (const [n, l, pr] of list) { const x = passLoad().s[n]; if (!x || !passOpen(n) || l > passLvl(x) || (pr && !x.prem)) continue; const arr = pr ? x.p : x.f; if (arr.includes(l)) continue;
        arr.push(l); got.push(passGive('player', passRewardAt(l, pr)) || 'Belohnung'); }
    if (!got.length) return; passSave(); saveGame(); saveProgression(); updateHud(); sfx('crate'); anleitungAbgeholt();
    flashHint(got.length > 3 ? got.length + ' Belohnungen abgeholt: ' + got.slice(0, 2).join(' · ') + ' …' : got.join(' · '), 4000);
    renderPass(); updateGoalsBadge();
}
function passBuy() {
    const x = passOf(passNo(Date.now())); if (x.prem) return;
    if (gems < PASS_PREMIUM) { flashHint('Zu wenig Edelsteine – Premium kostet ' + fmtNum(PASS_PREMIUM) + '.', 2500); return; }
    if (Date.now() - passArm > 4000) { passArm = Date.now(); renderPass(); return; }            // tap twice: 1000 Gems are a lot
    gems -= PASS_PREMIUM; x.prem = true; passArm = 0; passSave(); saveGame(); updateHud(); sfx('coin');
    flashHint('Premium freigeschaltet – die zweite Reihe gehört dir, auch für erreichte Stufen.', 3500); renderPass(); updateGoalsBadge();
}
function passCellHtml(r, hp, got) {                            // icon + amount of one reward
    const k = r.k, n = r.n || 1, row = (ic, b, s, cls) => '<span class="pc-ic' + (cls ? ' ' + cls : '') + '">' + ic + '</span><span class="pc-t"><b>' + b + '</b><small>' + s + '</small></span>';
    if (k === 'coins') return row(icon('coin', 'ico-coin'), fmtCompact(Math.max(wirtM(5000), Math.round(hp.coins)) * n), 'Münzen');
    if (k === 'gems') return row(icon('gem', 'ico-gem'), '+' + n, 'Edelsteine');
    if (k === 'tp') return row(icon('crown', 'ico-tp'), '+' + n, 'Thron-Punkte');
    if (k === 'shards') return row(icon('star', 'ico-shard'), '+' + n, 'Helden-Splitter');
    if (k === 'shield') return row(icon('shield'), n + ' h', 'Friedensschild');
    if (k === 'crate') return row(icon('shop'), n + '×', n === 1 ? 'Kiste' : 'Kisten');
    if (k === 'royal') return row(icon('shop', 'ico-royal'), '1×', 'Königliche Kiste');
    const d = lkDef(k, r.id), own = !got && lkHas(k, r.id);
    if (k === 'frame') return row('<span class="frame-ring pc-frame" data-frame="' + r.id + '"><img alt="" src="' + crestDataUrl(28) + '"></span>', d.name, own ? 'Schon da: ' + fmtNum(PASS_OWNED_GEMS) + ' Edelsteine' : 'Rahmen', 'is-look');
    return row('<i class="pc-flag" style="--c:' + d.flag + ';--t:' + d.trail + '"></i>', d.name, own ? 'Schon da: ' + fmtNum(PASS_OWNED_GEMS) + ' Edelsteine' : 'Marsch-Skin', 'is-look');
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
        '<span class="pass-ht"><b>Saison-Pass</b><small>Endet in <span id="passLeft"></span></small></span>' + (x.prem ? '<span class="pass-tag">' + icon('crown') + 'Premium</span>' : '') + '</div>' +
        '<div class="pass-bar"><i style="width:' + Math.round(into / PASS_STEP * 100) + '%"></i></div>' +
        '<div class="pass-bar-t"><span>' + (max ? 'Höchste Stufe erreicht' : fmtNum(into) + ' / ' + PASS_STEP + ' Punkte') + '</span><span>' + (max ? fmtNum(xp) + ' Punkte' : 'bis Stufe ' + (L + 1)) + '</span></div></div>';
    if (!x.prem) h += '<div class="pass-prem">' + icon('crown') + '<span><b>Premium-Reihe</b><small>Mehr Edelsteine, Königliche Kisten, Marsch-Skin „Saisonzug“ (Stufe 20) und Rahmen „Saisonkrone“ (Stufe 40) – auch für erreichte Stufen.</small></span>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pass-buy>' + (arm ? '<span>Sicher?</span>' : '') + icon('gem') + '<span>' + fmtNum(PASS_PREMIUM) + '</span></button></div>';
    if (old.length) h += '<div class="pass-old">' + icon('hourglass') + '<span><b>Voriger Saison-Pass: ' + old.length + (old.length === 1 ? ' Belohnung' : ' Belohnungen') + ' offen</b><small>Noch <span id="passOldLeft"></span> abholbar</small></span>' +
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
    if (anleitung.schritt < ANLEITUNG_TAEGLICH && !anleitung.nochmal) return;   // allererster Start: erst nach Schritt 2 der Anleitung (dann ruft anleitungZeigen wieder)
    if (!dailyClaimable() || !document.getElementById('dailyModal').hidden || (isPanelOpen(goalsPopup) && goalsTab === 'reward')) return;   // an open Belohnung tab shows it already
    const busy = !document.getElementById('levelUpModal').hidden || !document.getElementById('rewardModal').hidden || (typeof welcomeFrom !== 'undefined' && welcomeFrom) || (document.getElementById('welcomeModal') && !document.getElementById('welcomeModal').hidden);
    if (busy) { setTimeout(maybeShowDaily, 1500); return; }
    showDailyModal();
}
afterSplash(() => setTimeout(maybeShowDaily, 500));

// ===== ANLEITUNG für neue Spieler (Idee 45): 7 kurze Schritte unten am Bildschirm, jeder hakt sich von selbst ab =====
// Der Stand liegt im Spielstand auf dem Server (store → speichern.js), nicht im Browser. Je Schritt: t Text, fertig, tipp (Text je
// nach Lage), puls (der nächste nötige Knopf pulsiert: body[data-anl-puls], Stil in 02), stadt (gilt in der Stadt), ok (Knopf „Verstanden“).
const anleitungNeutral = id => !islandOwnerOf(id) && !bossAt(id) && islandById[id].type !== 'megaTemple';
const ANLEITUNG = [
    { t: 'Tippe auf deine Hauptstadt – die blaue Basis mit der Krone (das Fadenkreuz rechts bringt dich hin).', fertig: () => (isPanelOpen(popup) && popupIslandId === playerIslandId) || !cityView.hidden
        || anleitungTat.attack || (anleitungInsel() && anleitungNeutral(popupIslandId)),   // schon bei einer neutralen Basis (oder angegriffen): gleich weiter zu Schritt 2
      tipp: () => anleitungInsel() && popupIslandId !== playerIslandId ? 'Das ist nicht deine Hauptstadt. Schließe das Fenster (×) und tippe die blaue Basis mit der Krone an.' : null, puls: () => 'heim' },
    { t: 'Greif eine neutrale Basis in deiner Nähe an: tippe eine Basis mit dem Schild „Neutral“ an.', fertig: () => anleitungTat.attack,
      tipp: () => !anleitungInsel() ? null : popupIslandId === playerIslandId ? 'Gut! Schließe das Fenster (×) und tippe eine Basis mit „Neutral“ an.'
        : anleitungNeutral(popupIslandId) ? 'Gut! Jetzt unten rechts auf „Angreifen“ tippen.' : 'Das ist keine neutrale Basis. Schließe das Fenster (×) und tippe eine Basis mit „Neutral“ an.',
      puls: () => anleitungInsel() && anleitungNeutral(popupIslandId) ? 'angriff' : '' },
    { t: 'Werte eine eroberte Basis auf: tippe deine neue (blaue) Basis an.', fertig: () => anleitungTat.upgrade, tipp: () => {
        const eigene = [...ownedIslands].some(id => id !== playerIslandId);
        if (!anleitungInsel()) return eigene ? null : 'Warte, bis dein Angriff angekommen ist und die Basis dir gehört – dann tippe sie an.';
        const id = popupIslandId;
        return id === playerIslandId ? 'Die Hauptstadt wächst über die Burg in der Stadt. Schließe das Fenster (×) und tippe deine neue Basis an.'
            : islandOwnerOf(id) === 'player' ? 'Gut! Jetzt auf „Aufwerten“ tippen.' : 'Das ist nicht deine Basis. Schließe das Fenster (×) und tippe deine eigene (blaue) Basis an.'; },
      puls: () => anleitungInsel() && popupIslandId !== playerIslandId && islandOwnerOf(popupIslandId) === 'player' ? 'aufwerten' : '' },
    { t: 'Öffne die Stadt (unten links) und baue den Holzfäller – Holz brauchst du für deine Burg.', stadt: true, fertig: () => { const c = loadCity(); return (c.levels.lumber || 0) > 0 || (c.builds || []).some(b => b.id === 'lumber'); },
      puls: () => !cityView.hidden ? (cityOpenId === 'lumber' ? 'bauen' : '') : anleitungInsel() && popupIslandId === playerIslandId ? 'stadtfenster' : 'stadt' },
    { t: 'Schick Truppen zum Sammeln: tippe auf der Karte ein Feld an (Goldmine, Holz, Stein, Eisen …).', fertig: () => fieldMarches.some(m => m.who === 'player') || Object.values(fieldState || {}).some(st => st && st.occ && st.occ.who === 'player'),
      puls: () => document.getElementById('fieldSheet').hidden ? '' : 'sammeln' },
    { t: 'Hol dir deine Belohnungen unter „Events“ (unten).', fertig: () => anleitungTat.abgeholt || (isPanelOpen(goalsPopup) && !eventsBereit()),   // (nichts abholbereit: dann reicht das Öffnen)
      tipp: () => isPanelOpen(goalsPopup) ? 'Tippe auf „Abholen“ – die Zahl an einem Reiter zeigt, wo noch etwas wartet.' : null, puls: () => isPanelOpen(goalsPopup) ? 'abholen' : 'events' },
    { t: 'Knöpfe rechts: Fadenkreuz = zur Hauptstadt · Fahne = Wegmarke · Schwerter = Armee aufstellen · + und − = näher, weiter. Würfel oben = Rohstoffe (Holz, Stein, Eisen).', fertig: () => anleitungTat.knoepfe, puls: () => 'knoepfe', ok: true }
];
const ANLEITUNG_TAEGLICH = 2;                             // die tägliche Belohnung kommt beim allerersten Start erst nach Schritt 2
const anleitungTat = {};
const anleitungInsel = () => isPanelOpen(popup) && popupIslandId !== null && popupIslandId !== undefined && islandById[popupIslandId];
var anleitung = (() => { try { return JSON.parse(store.get('openWaterAnleitung')) || null; } catch (e) { return null; } })();
if (!anleitung) { const neu = !!((window.__OW && window.__OW.neu) || playerLvl <= 2); anleitung = { schritt: neu ? 0 : ANLEITUNG.length, belohnt: !neu }; }   // wer schon spielt, sieht sie nicht
else if (anleitung.belohnt === undefined) { anleitung.belohnt = anleitung.schritt >= 6; if (anleitung.belohnt) anleitung.schritt = ANLEITUNG.length; }   // (alter Stand mit 6 Schritten: fertig bleibt fertig)
if (typeof questProgress === 'function') questProgress = (alt => function (t) { if (t === 'upgrade' || t === 'attack') anleitungTat[t] = true; return alt.apply(this, arguments); })(questProgress);
if (typeof claimAch === 'function') claimAch = (alt => function () { const n = alt.apply(this, arguments); if (n) anleitungAbgeholt(); return n; })(claimAch);
if (typeof renderPopup === 'function') renderPopup = (alt => function () { alt.apply(this, arguments); anleitungFenster(); })(renderPopup);
function anleitungAbgeholt() { anleitungTat.abgeholt = true; }        // jede Abhol-Stelle unter „Events“ meldet sich hier (Schritt 6 zählt erst danach)
function eventsBereit() { return dailyGoalCount() + (dailyClaimable() ? 1 : 0) + inboxList().length + achReadyN + passReadyAll().length; }   // alles Abholbereite (die Zahl an „Events“)
function anleitungSpeichern() { store.set('openWaterAnleitung', JSON.stringify(anleitung)); }
function anleitungPuls(k) { if ((document.body.dataset.anlPuls || '') !== k) document.body.dataset.anlPuls = k; }
function anleitungFenster() {                             // Hauptstadt-Fenster: ein Satz, was es zeigt (solange die Anleitung läuft)
    const n = document.getElementById('popupAnleitung'); if (n) n.hidden = SYSTEM || anleitung.schritt >= ANLEITUNG.length || popupIslandId !== playerIslandId || popupView !== 'menu';
}
let anleitungUhr = 0, anleitungFrage = false;             // Frage: „Wirklich überspringen?“ steht gerade da
function anleitungZeigen() {
    const el = document.getElementById('anleitung'); if (!el) return;
    if (SYSTEM || anleitung.schritt >= ANLEITUNG.length) { el.hidden = true; anleitungPuls(''); anleitungFenster(); if (anleitungUhr) { clearInterval(anleitungUhr); anleitungUhr = 0; } return; }   // fertig: nicht mehr jede Sekunde nachsehen
    if (document.getElementById('wkName') || ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal'].some(id => { const m = document.getElementById(id); return m && !m.hidden; })) { el.hidden = true; anleitungPuls(''); return; }   // erst Name/Begrüßung
    let weiter = false; try { weiter = !!ANLEITUNG[anleitung.schritt].fertig(); } catch (e) {}
    if (weiter) {
        anleitung.schritt++; delete anleitungTat.abgeholt; sfx('upgrade'); el.classList.remove('is-auf');   // (Abholen zählt nur im Schritt, in dem es passiert)
        if (anleitung.schritt >= ANLEITUNG.length) {
            const erstesMal = !anleitung.belohnt; anleitung.belohnt = true; anleitungSpeichern(); el.hidden = true; anleitungPuls(''); anleitungFenster();
            if (erstesMal) { inboxAdd({ src: 'gift', title: 'Anleitung geschafft', gems: 10, crate: 0 }); flashHint('Geschafft! Unter „Events“ → Abholfach wartet eine kleine Belohnung. Viel Spaß!', 6000); }
            else flashHint('Anleitung geschafft. Viel Spaß!', 4000);   // (die Belohnung gibt es nur beim ersten Mal)
            return;
        }
        anleitungSpeichern();
        if (anleitung.schritt === ANLEITUNG_TAEGLICH) setTimeout(maybeShowDaily, 1500);
    }
    const s = ANLEITUNG[anleitung.schritt], inStadt = !cityView.hidden && !s.stadt;
    let puls = ''; try { puls = (s.puls && s.puls()) || ''; } catch (e) {}
    anleitungPuls(anleitungFrage || inStadt ? '' : puls);
    el.hidden = !document.getElementById('citySheet').hidden || inStadt;   // in der Stadt nur beim Holzfäller-Schritt, ein Gebäude-Fenster geht vor
    if (el.hidden) return;
    let txt = null; try { txt = s.tipp && s.tipp(); } catch (e) {}
    setText(document.getElementById('anleitungSchritt'), 'Schritt ' + (anleitung.schritt + 1) + '/' + ANLEITUNG.length);
    setText(document.getElementById('anleitungText'), anleitungFrage ? 'Anleitung wirklich überspringen? Unter Profil → Einstellungen kannst du sie jederzeit noch mal starten.' : txt || s.t);
    el.classList.toggle('is-frage', anleitungFrage); el.classList.toggle('is-ok', !anleitungFrage && !!s.ok);   // (mit Knöpfen darunter: Text ganz)
    document.getElementById('anleitungFrage').hidden = !anleitungFrage; document.getElementById('anleitungOk').hidden = anleitungFrage || !s.ok; document.getElementById('anleitungWeg').hidden = anleitungFrage;
    const fenster = [...document.querySelectorAll('.panel.is-open, .marker-sheet:not([hidden]), #heroHall:not([hidden])')].map(f => f.getBoundingClientRect()).filter(r => r.height > 0).sort((x, y) => x.top - y.top)[0];
    el.style.bottom = fenster ? Math.round(innerHeight - fenster.top + 10) + 'px' : '';   // ein Fenster ist offen: direkt darüber, damit seine Knöpfe frei bleiben
    el.style.visibility = fenster && fenster.top < 150 ? 'hidden' : '';                  // kein Platz über dem Fenster: lieber gar nicht als auf den Knöpfen
}
function anleitungStarten() { anleitungZeigen(); if (!anleitungUhr && anleitung.schritt < ANLEITUNG.length) anleitungUhr = setInterval(anleitungZeigen, 1000); }
document.getElementById('anleitungWeg').addEventListener('click', () => { anleitungFrage = true; anleitungZeigen(); });   // erst fragen (im Spiel, kein Browser-Fenster)
document.getElementById('anleitungText').addEventListener('click', () => document.getElementById('anleitung').classList.toggle('is-auf'));   // langer Text: antippen zeigt alles
document.getElementById('anleitungNein').addEventListener('click', () => { anleitungFrage = false; anleitungZeigen(); });
document.getElementById('anleitungJa').addEventListener('click', () => {
    anleitungFrage = false; anleitung.schritt = ANLEITUNG.length; anleitungSpeichern(); anleitungZeigen(); setTimeout(maybeShowDaily, 1500);   // (vor Schritt 3 übersprungen: die tägliche Belohnung kommt jetzt)
    flashHint('Anleitung übersprungen – unter Profil → Einstellungen kannst du sie noch mal starten.', 3500);
});
document.getElementById('anleitungOk').addEventListener('click', () => { anleitungTat.knoepfe = true; anleitungZeigen(); });
document.getElementById('anleitungNochmal').addEventListener('click', () => {   // Profil → Einstellungen → „Anleitung noch mal“
    for (const k of Object.keys(anleitungTat)) delete anleitungTat[k];
    anleitung = { schritt: 0, belohnt: !!anleitung.belohnt, nochmal: true }; anleitungFrage = false; anleitungSpeichern();
    closeAllPopups(); anleitungStarten();
});
afterSplash(() => setTimeout(anleitungStarten, 1500));

// Shop: buy gem crates, opens straight into a result readout.
const shopBtn = document.getElementById('shopBtn');
const shopPopup = document.getElementById('shopPopup');
const shopGemCount = document.getElementById('shopGemCount');
const shopCrateResult = document.getElementById('shopCrateResult');
const shopOpenCrateBtn = document.getElementById('shopOpenCrateBtn');
const shopToEquipBtn = document.getElementById('shopToEquipBtn');
const shopCloseBtn = document.getElementById('shopCloseBtn');

