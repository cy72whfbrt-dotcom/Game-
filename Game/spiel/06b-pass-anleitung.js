// Teil 06b-pass-anleitung.js: Saison-Pass und tägliche Belohnung (die Anleitung für neue Spieler ist jetzt das Tutorial, 10c2)
// ===== SAISON-PASS: 28 days on one calendar for everyone, 100 levels of 150 points (7.10., vorher 40 × 300), a free row and a premium row (Gems, never money) – jede Stufe gibt in beiden Reihen etwas. Points come from what you do anyway =====
var PASS_EPOCH = Date.UTC(2026, 0, 5), PASS_LEN = 28 * 86400000, PASS_GRACE = 3 * 86400000, PASS_LVLS = 100, PASS_STEP = 150, PASS_PREMIUM = 1000;   // (keine Rahmen mehr im Pass – Alexander 7.10.: Stufe 100 gibt Edelsteine)
var PASS_XP = { quest: 40, questBonus: 80, captures: 20, pvpWins: 10, defends: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, upgrade: 4, pickup: 8, crate: 3, scouts: 3, heroFires: 2, bau: 15, forschung: 15,
    lager: 5, qb: 10 };   // what each deed is worth (bau/forschung: in der Stadt gestartet · lager: Lager besiegt · qb: Angriff auf den Tagesboss)
var PASS_BOT_XP = { caps: 20, pvp: 10, defs: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, scouts: 3, heroFires: 2, bau: 15, fo: 15, lager: 5, qb: 10 };   // the same by the names in the others' stats (+ 200 a day with all tasks done)
var PASS_HOW = [['goal', 'Tagesaufgabe abgeholt', 40], ['star', 'Alle sechs Aufgaben (Bonus)', 80], ['flag', 'Basis erobert', 20], ['attack', 'Basis eines Spielers (zusätzlich)', '+10'], ['shield', 'Angriff abgewehrt', 15], ['troops', 'Armee siegt im Feld', 15],
    ['losses', 'Kriegsherr besiegt', 60], ['temple', 'Tempel erobert', 25], ['crown', 'Minute auf dem Thron', 2], ['upgrade', 'Basis ausgebaut', 4], ['coin', 'Karten-Belohnung', 8], ['scout', 'Späher ausgeschickt', 3], ['shop', 'Kiste geöffnet', 3], ['castle', 'Bau in der Stadt gestartet', 15], ['flask', 'Forschung gestartet', 15],
    ['attack', 'Barbaren-Lager besiegt', 5], ['star', 'Angriff auf den Tagesboss (donnerstags)', 10]];
function passRewardAt(L, prem) {                          // what level L gives in each row – eine Liste (coins/tr: n Stunden Ertrag); die erste passende Regel gilt
    const g = (k, n) => ({ k, n }), viertel = L % 25 === 0;
    if (!prem) return viertel ? [g('gems', 50), g('royal', 1)] : L % 10 === 0 ? [g('royal', 1)] : L % 5 === 0 ? [g('gems', 20)] : L % 4 === 0 ? [g('shards', 3)] :
        L % 3 === 0 ? [g('crate', 1)] : L % 2 === 0 ? [g('tr', 2)] : [g('coins', 3)];
    return viertel ? [g('gems', 150), g('royal', 1)] : L % 10 === 0 ? [g('royal', 1)] : L % 5 === 0 ? [g('gems', 30)] :
        L % 4 === 0 ? [g('shards', 8)] : L % 6 === 0 ? [g('eventMuenzen', 150)] : L % 3 === 0 ? [g('shield', 8)] : L % 2 === 0 ? [g('tr', 6)] : [g('coins', 12), g('gems', 10)];
}
const passMuenzen = (hp, n) => Math.max(wirtM(5000), Math.round(hp.coins)) * n;     // n Stunden Münzen (mindestens 5.000 je Stunde – wie beim Weltrechner)
const passTruppen = (hp, n) => Math.max(wirtK(1000), Math.round(hp.troops)) * n;    // n Stunden Truppen (mindestens 1.000 je Stunde)
var passState = null, passTimer = null;
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
function passGive(who, r, aus, schl) {                    // one reward to anyone (you or the others) - returns the text for the hint (aus: Belohnungs-Kacheln dazu, schl: { s, l, p } für Truppen – der Weltrechner prüft)
    aus = aus || []; const b = who === 'player' ? null : loadBotState()[who]; if (who !== 'player' && !b) return ''; const n = r.n || 1;
    if (r.k === 'coins') { const c = passMuenzen(hourProduction(who), n); if (b) botCoins[who] = (botCoins[who] || 0) + c; else coins += c; aus.push({ a: 'coins', n: c }); return '+' + fmtCompact(c) + ' Münzen'; }
    if (r.k === 'tr') { const t = passTruppen(hourProduction(who), n), base = b ? botCapitalOf(who) : rewardBaseId(); if (base === null || base === undefined) return '';
        if (b) islandTroops[base] = (islandTroops[base] || 0) + t; else eigeneTruppenDazu(base, t, 'pass', schl || {}); aus.push({ a: 'tr', n: t }); return '+' + fmtCompact(t) + ' Truppen'; }
    if (r.k === 'gems') { if (b) b.gems += n; else gems += n; aus.push({ a: 'gems', n }); return '+' + n + ' Edelsteine'; }
    if (r.k === 'eventMuenzen') { if (b) beuteBot(who, 'eventMuenzen', n); else gibBelohnung('eventMuenzen', n); aus.push({ a: 'eventMuenzen', n }); return '+' + n + ' Event-Münzen'; }   // (statt der alten Thron-Punkte)
    if (r.k === 'shards') { const h = heroGrantShards(who, n); if (h) { aus.push({ a: 'sh', n, held: h.id }); return '+' + n + ' Splitter ' + h.name; } if (b) b.gems += n * 20; else gems += n * 20; aus.push({ a: 'gems', n: n * 20 }); return '+' + n * 20 + ' Edelsteine (alle Helden voll)'; }
    if (r.k === 'shield') { if (b) { b.shields = b.shields || {}; b.shields[n] = (b.shields[n] || 0) + 1; } else { const st = shieldStock(); st[n] = (st[n] || 0) + 1; store.set('openWaterShieldStock', JSON.stringify(st)); } aus.push({ a: 'schild', n }); return 'Friedensschild ' + n + ' h'; }
    if (r.k === 'crate' || r.k === 'royal') { const t = [];
        for (let i = 0; i < n; i++) { const rr = r.k === 'royal' ? Math.max(3, pickRandomRarity()) : pickRandomRarity(), slot = pickRandomSlot();
            if (b) b.spare[slot][rr]++; else { addInventoryItem(slot, rr, 1); aus.push({ a: 'item', slot, r: rr }); questProgress('crate', 1); t.push(RARITY_DEFS[rr].label + ' ' + EQUIPMENT_DEFS[slot].name); } } return t.join(', '); }
    return '';
}
function passClaim(list) {                                // [[season, level, premium], …] → hand out, one hint
    const got = [], aus = []; let kiste = null, ohneBasis = false;
    for (const [n, l, pr] of list) { const x = passLoad().s[n]; if (!x || !passOpen(n) || l > passLvl(x) || (pr && !x.prem)) continue; const arr = pr ? x.p : x.f; if (arr.includes(l)) continue;
        const rs = passRewardAt(l, pr); if (rs.some(r => r.k === 'tr') && rewardBaseId() === null) { ohneBasis = true; continue; }   // Truppen brauchen eine Basis – die Stufe wartet
        arr.push(l); for (const r of rs) { if (r.k === 'royal' || (r.k === 'crate' && !kiste)) kiste = r.k === 'royal' ? 'royal' : 'aus'; got.push(passGive('player', r, aus, { s: n, l, p: pr ? 1 : 0 }) || 'Belohnung'); } }
    if (!got.length) { if (ohneBasis) flashHint('Truppen brauchen eine eigene Basis – erst dann abholbar.', 3000); return; }
    passSave(); saveGame(); saveProgression(); updateHud(); sfx('crate');
    if (aus.length) beuteFenster('Saison-Pass', aus, { kiste, unter: got.length > 1 ? got.length + ' Belohnungen abgeholt' : '' });
    else flashHint(got.join(' · '), 4000);
    renderPass(); updateGoalsBadge();
}
function passBuy(btn) {
    const x = passOf(passNo(Date.now())); if (x.prem) return;
    if (gems < PASS_PREMIUM) { flashHint('Zu wenig Edelsteine – Premium kostet ' + fmtNum(PASS_PREMIUM) + '.', 2500); return; }
    if (!gemsWirklich('pass', PASS_PREMIUM, btn)) return;                                    // „Wirklich?“ – 1000 Gems sind viel
    gems -= PASS_PREMIUM; x.prem = true; passSave(); saveGame(); updateHud(); sfx('coin');
    flashHint('Premium freigeschaltet – die zweite Reihe gehört dir, auch für erreichte Stufen.', 3500); renderPass(); updateGoalsBadge();
}
function passKachel(r, hp) {                         // eine Belohnung als Kachel (05e) mit Menge – Münzen/Truppen: was dein Reich in n Stunden macht
    const k = r.k, n = r.n || 1;
    if (k === 'coins') return beuteKachel({ a: 'coins', n: passMuenzen(hp, n) });
    if (k === 'tr') return beuteKachel({ a: 'tr', n: passTruppen(hp, n) });
    if (k === 'gems' || k === 'eventMuenzen') return beuteKachel({ a: k, n });
    if (k === 'shards') return beuteKachel({ a: 'sh', n });
    if (k === 'shield') return beuteKachel({ a: 'schild', n });
    if (k === 'crate') return beuteKachel({ a: 'kiste', k: 'aus', n });
    return beuteKachel({ a: 'kiste', k: 'royal', r: 3, n, min: 1 });
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
    const ready = passReady(n), old = passReady(n - 1); if (gemsArmed('pass')) gemsArmAus();   // (neu gezeichnet: „Wirklich?“ von vorn)
    let h = '<div class="pass-hero' + (x.prem ? ' is-prem' : '') + '"><div class="pass-top"><span class="pass-lvl"><small>Stufe</small><b>' + L + '</b></span>' +
        '<span class="pass-ht"><b>Saison-Pass</b><small>Endet in <span id="passLeft"></span></small></span>' + (x.prem ? '<span class="pass-tag">' + icon('crown') + 'Premium</span>' : '') + '</div>' +
        '<div class="pass-bar"><i style="width:' + Math.round(into / PASS_STEP * 100) + '%"></i></div>' +
        '<div class="pass-bar-t"><span>' + (max ? 'Höchste Stufe erreicht' : fmtNum(into) + ' / ' + PASS_STEP + ' Punkte') + '</span><span>' + (max ? fmtNum(xp) + ' Punkte' : 'bis Stufe ' + (L + 1)) + '</span></div></div>';
    let unten = '';                                       // unter der Leiste: Premium kaufen, voriger Pass
    if (!x.prem) unten += '<div class="pass-prem">' + icon('crown') + '<span><b>Premium-Reihe</b><small>Mehr Edelsteine, Truppen und Königliche Kisten – auch für erreichte Stufen.</small></span>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pass-buy><span class="lbl">' + icon('gem') + fmtNum(PASS_PREMIUM) + '</span></button></div>';
    if (old.length) unten += '<div class="pass-old">' + icon('hourglass') + '<span><b>Voriger Saison-Pass: ' + old.length + (old.length === 1 ? ' Belohnung' : ' Belohnungen') + ' offen</b><small>Noch <span id="passOldLeft"></span> abholbar</small></span>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pass-old><span>Abholen</span></button></div>';
    if (ready.length > 1) h += '<button class="btn btn--primary pass-all" type="button" data-pass-all>' + icon('check') + '<span>Alle abholen · ' + ready.length + '</span></button>';
    // die Leiste (wie RoK): eine lange waagrechte Reihe, je Stufe eine Spalte – oben Premium, in der Mitte die Stufe, unten Frei; links bleiben die Namen stehen
    h += '<div class="pl"><div class="pl-namen"><span class="is-p">' + (x.prem ? icon('crown') : icon('lock')) + 'Premium</span><span></span><span>Frei</span></div>';
    for (let l = 1; l <= PASS_LVLS; l++) { const zelle = pr => { const got = (pr ? x.p : x.f).includes(l), ok = l <= L && (!pr || x.prem), rs = passRewardAt(l, pr);
            return '<button type="button" class="pl-zelle' + (pr ? ' is-p' : '') + (rs.length > 1 ? ' is-zwei' : '') + (got ? ' is-got' : ok ? ' is-ready' : ' is-lock') + (pr && !x.prem ? ' is-closed' : '') + '"' +
                (ok && !got ? ' data-pass-l="' + l + '" data-pass-p="' + pr + '"' : '') + '>' + rs.map(r => passKachel(r, hp)).join('') +
                (got ? '<span class="pl-ok">' + icon('check') + '</span>' : pr && !x.prem ? '<span class="pl-ok is-lock">' + icon('lock') + '</span>' : '') + '</button>'; };
        h += '<div class="pl-spalte' + (l <= L ? ' is-on' : '') + (l === L + 1 ? ' is-next' : '') + (l % 25 === 0 ? ' is-viertel' : '') + '" data-pass-row="' + l + '">' + zelle(1) + '<span class="pl-knoten">' + l + '</span>' + zelle(0) + '</div>'; }
    h += '</div>' + unten + '<details class="ach-done pass-how"><summary><span>So sammelst du Punkte</span><em>' + PASS_STEP + ' je Stufe</em>' + icon('upgrade') + '</summary><div class="pass-how-l">' +
        PASS_HOW.map(([ic, t, v]) => '<div>' + icon(ic) + '<span>' + t + '</span><b>' + (typeof v === 'string' ? v : '+' + v) + '</b></div>').join('') + '</div></details>';
    const pb = goalsPopup.querySelector('.pbody'), top = pb.scrollTop, alt = el.querySelector('.pl'), links = alt ? alt.scrollLeft : -1, how = el.querySelector('.pass-how'), wasOpen = !!(how && how.open);
    el.innerHTML = h; pb.scrollTop = top; if (links >= 0) el.querySelector('.pl').scrollLeft = links;
    if (wasOpen) el.querySelector('.pass-how').open = true; passLeftTick();
}
function passScroll() { const L = passLvl(passOf(passNo(Date.now()))), pl = goalsPopup.querySelector('.pl'), r = pl && pl.querySelector('[data-pass-row="' + Math.min(PASS_LVLS, L + 1) + '"]');   // die nächste Stufe in die Mitte der Leiste
    if (r) pl.scrollLeft = Math.max(0, r.offsetLeft - pl.clientWidth / 2 + r.offsetWidth / 2); }
document.getElementById('passPane').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-pass-buy')) passBuy(b);
    else if (b.hasAttribute('data-pass-all')) passClaim(passReady(passNo(Date.now())));
    else if (b.hasAttribute('data-pass-old')) passClaim(passReady(passNo(Date.now()) - 1));
    else if (b.dataset.passL) passClaim([[passNo(Date.now()), +b.dataset.passL, +b.dataset.passP]]);
    renderGoalsSub();
});
setInterval(() => { if (isPanelOpen(goalsPopup) && goalsTab === 'pass') passLeftTick(); }, 1000);
setInterval(() => { const n = passNo(Date.now()), ps = passLoad(); if (ps.n !== n) { ps.n = n; passPrune(); passSave(); if (isPanelOpen(goalsPopup) && goalsTab === 'pass') renderPass(); } updateGoalsBadge(); }, 60000);   // a new season while the game stays open
passPrune();
function maybeShowDaily() {
    if (tutLaeuft()) return;                              // nie mitten im Tutorial (10c2): erst danach
    if (!dailyClaimable() || !document.getElementById('dailyModal').hidden || (isPanelOpen(goalsPopup) && goalsTab === 'reward')) return;   // an open Belohnung tab shows it already
    const busy = !document.getElementById('levelUpModal').hidden || !document.getElementById('rewardModal').hidden || (typeof welcomeFrom !== 'undefined' && welcomeFrom) || (document.getElementById('welcomeModal') && !document.getElementById('welcomeModal').hidden);
    if (busy) { setTimeout(maybeShowDaily, 1500); return; }
    showDailyModal();
}
afterSplash(() => setTimeout(maybeShowDaily, 500));

// Shop: buy gem crates, opens straight into a result readout.
const shopBtn = document.getElementById('shopBtn');
const shopPopup = document.getElementById('shopPopup');
const shopGemCount = document.getElementById('shopGemCount');
const shopToEquipBtn = document.getElementById('shopToEquipBtn');
const shopCloseBtn = document.getElementById('shopCloseBtn');

