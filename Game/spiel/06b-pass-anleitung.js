// Teil 06b-pass-anleitung.js: Saison-Pass und Anleitung für neue Spieler
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

