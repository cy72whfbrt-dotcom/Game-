// Teil 06b-pass-anleitung.js: Saison-Pass und Anleitung für neue Spieler
// ===== SAISON-PASS: 28 days on one calendar for everyone, 100 levels of 150 points (7.10., vorher 40 × 300), a free row and a premium row (Gems, never money) – jede Stufe gibt in beiden Reihen etwas. Points come from what you do anyway =====
var PASS_EPOCH = Date.UTC(2026, 0, 5), PASS_LEN = 28 * 86400000, PASS_GRACE = 3 * 86400000, PASS_LVLS = 100, PASS_STEP = 150, PASS_PREMIUM = 1000;   // (keine Rahmen mehr im Pass – Alexander 7.10.: Stufe 100 gibt Edelsteine)
var PASS_XP = { quest: 40, questBonus: 80, captures: 20, pvpWins: 10, defends: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, upgrade: 4, pickup: 8, crate: 3, scouts: 3, heroFires: 2, bau: 15, forschung: 15,
    lager: 5, qb: 10, qd: 10, invPkt: 1 };   // what each deed is worth (bau/forschung: in der Stadt gestartet · lager: Lager besiegt · qb/qd: Angriff auf Tagesboss/Drache · invPkt: Invasions-Punkte)
var PASS_BOT_XP = { caps: 20, pvp: 10, defs: 15, armyWins: 15, bosses: 60, temples: 25, throneMin: 2, scouts: 3, heroFires: 2, bau: 15, fo: 15, lager: 5, qb: 10, qd: 10, invPkt: 1 };   // the same by the names in the others' stats (+ 200 a day with all tasks done)
var PASS_HOW = [['goal', 'Tagesaufgabe abgeholt', 40], ['star', 'Alle sechs Aufgaben (Bonus)', 80], ['flag', 'Basis erobert', 20], ['attack', 'Basis eines Spielers (zusätzlich)', '+10'], ['shield', 'Angriff abgewehrt', 15], ['troops', 'Armee siegt im Feld', 15],
    ['losses', 'Kriegsherr besiegt', 60], ['temple', 'Tempel erobert', 25], ['crown', 'Minute auf dem Thron', 2], ['upgrade', 'Basis ausgebaut', 4], ['coin', 'Karten-Belohnung', 8], ['scout', 'Späher ausgeschickt', 3], ['shop', 'Kiste geöffnet', 3], ['castle', 'Bau in der Stadt gestartet', 15], ['flask', 'Forschung gestartet', 15],
    ['attack', 'Barbaren-Lager besiegt', 5], ['star', 'Angriff auf den Tagesboss', 10], ['star', 'Angriff auf den Drachen', 10], ['defense', 'Invasions-Punkt', 1]];
function passRewardAt(L, prem) {                          // what level L gives in each row – eine Liste (coins/tr: n Stunden Ertrag); die erste passende Regel gilt
    const g = (k, n) => ({ k, n }), viertel = L % 25 === 0;
    if (!prem) return viertel ? [g('gems', 50), g('royal', 1)] : L % 10 === 0 ? [g('royal', 1)] : L % 5 === 0 ? [g('gems', 20)] : L % 4 === 0 ? [g('shards', 3)] :
        L % 3 === 0 ? [g('crate', 1)] : L % 2 === 0 ? [g('tr', 2)] : [g('coins', 3)];
    return viertel ? [g('gems', 150), g('royal', 1)] : L % 10 === 0 ? [g('royal', 1)] : L % 5 === 0 ? [g('gems', 30)] :
        L % 4 === 0 ? [g('shards', 8)] : L % 6 === 0 ? [g('tp', 150)] : L % 3 === 0 ? [g('shield', 8)] : L % 2 === 0 ? [g('tr', 6)] : [g('coins', 12), g('gems', 10)];
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
    if (r.k === 'tp') { if (b) b.tp = (b.tp || 0) + n; else { throneState.pts = (throneState.pts || 0) + n; saveThrone(); } aus.push({ a: 'tp', n }); return '+' + n + ' Thron-Punkte'; }
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
    passSave(); saveGame(); saveProgression(); updateHud(); sfx('crate'); anleitungAbgeholt();
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
    if (k === 'gems' || k === 'tp') return beuteKachel({ a: k, n });
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
    if (anleitung.schritt < ANLEITUNG.length) return;     // nie mitten in der Anleitung (Spieltest 6.10.): erst danach – abholen geht in Schritt 6 unter „Events“
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
    { t: 'Tippe auf deine Hauptstadt – die blaue Basis mit der Krone (der Kompass rechts bringt dich hin).', fertig: () => (isPanelOpen(popup) && popupIslandId === playerIslandId) || !cityView.hidden
        || anleitungTat.attack || (anleitungInsel() && anleitungNeutral(popupIslandId)),   // schon bei einer neutralen Basis (oder angegriffen): gleich weiter zu Schritt 2
      tipp: () => anleitungInsel() && popupIslandId !== playerIslandId ? 'Das ist nicht deine Hauptstadt. Schließe das Fenster (×) und tippe die blaue Basis mit der Krone an.' : null, puls: () => 'heim' },
    { t: 'Greif eine neutrale Basis in deiner Nähe an: tippe eine Basis mit dem Schild „Neutral“ an.', fertig: () => anleitungTat.attack,
      tipp: () => !anleitungInsel() ? null : popupIslandId === playerIslandId ? 'Gut! Schließe das Fenster (×) und tippe eine Basis mit „Neutral“ an.'
        : anleitungNeutral(popupIslandId) ? (anleitungAlleAusHaupt() ? 'Gut! Tippe „Angreifen“ – mit „Alle“ bleibt deine Hauptstadt ohne Truppen.' : 'Gut! Jetzt unten rechts auf „Angreifen“ tippen.') : 'Das ist keine neutrale Basis. Schließe das Fenster (×) und tippe eine Basis mit „Neutral“ an.',
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
    { t: 'Knöpfe rechts: Kompass = zur Hauptstadt · Fahne = Wegmarke · Schild = Armee aufstellen · Lupen = näher, weiter. Oben Holz, Stein, Eisen antippen = Ertrag pro Stunde.', fertig: () => anleitungTat.knoepfe, puls: () => 'knoepfe', ok: true }
];
const anleitungTat = {};
const anleitungAlleAusHaupt = () => popupView === 'preview' && previewSourceId === playerIslandId && (islandTroops[playerIslandId] || 0) > 0 && (previewAttackTroops || 0) >= (islandTroops[playerIslandId] || 0);   // nur ein Hinweis, keine Regel
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
        anleitung.schritt++; delete anleitungTat.abgeholt; sfx('upgrade');   // (Abholen zählt nur im Schritt, in dem es passiert)
        if (anleitung.schritt >= ANLEITUNG.length) {
            const erstesMal = !anleitung.belohnt; anleitung.belohnt = true; anleitungSpeichern(); el.hidden = true; anleitungPuls(''); anleitungFenster();
            if (erstesMal) { inboxAdd({ src: 'gift', title: 'Anleitung geschafft', gems: 10, crate: 0 }); flashHint('Geschafft! Unter „Events“ → Abholfach wartet eine kleine Belohnung. Viel Spaß!', 6000); }
            else flashHint('Anleitung geschafft. Viel Spaß!', 4000);   // (die Belohnung gibt es nur beim ersten Mal)
            setTimeout(maybeShowDaily, 1500);                 // jetzt erst die tägliche Belohnung (falls noch nicht abgeholt)
            return;
        }
        anleitungSpeichern();
    }
    const s = ANLEITUNG[anleitung.schritt], inStadt = !cityView.hidden && !s.stadt;
    let puls = ''; try { puls = (s.puls && s.puls()) || ''; } catch (e) {}
    anleitungPuls(anleitungFrage || inStadt ? '' : puls);
    el.hidden = !document.getElementById('citySheet').hidden || inStadt;   // in der Stadt nur beim Holzfäller-Schritt, ein Gebäude-Fenster geht vor
    if (el.hidden) return;
    let txt = null; try { txt = s.tipp && s.tipp(); } catch (e) {}
    setText(document.getElementById('anleitungSchritt'), 'Schritt ' + (anleitung.schritt + 1) + '/' + ANLEITUNG.length);
    setText(document.getElementById('anleitungText'), anleitungFrage ? 'Anleitung wirklich überspringen? Unter Profil → Einstellungen kannst du sie jederzeit noch mal starten.' : txt || s.t);
    el.classList.toggle('is-frage', anleitungFrage); el.classList.toggle('is-ok', !anleitungFrage && !!s.ok);
    document.getElementById('anleitungFrage').hidden = !anleitungFrage; document.getElementById('anleitungOk').hidden = anleitungFrage || !s.ok; document.getElementById('anleitungWeg').hidden = anleitungFrage;
    const fenster = [...document.querySelectorAll('.panel.is-open, .marker-sheet:not([hidden]), #heroHall:not([hidden])')].map(f => f.getBoundingClientRect()).filter(r => r.height > 0).sort((x, y) => x.top - y.top)[0];
    el.style.bottom = fenster ? Math.round(innerHeight - fenster.top + 10) + 'px' : '';   // ein Fenster ist offen: direkt darüber, damit seine Knöpfe frei bleiben
    el.style.visibility = fenster && fenster.top < 150 ? 'hidden' : '';                  // kein Platz über dem Fenster: lieber gar nicht als auf den Knöpfen
}
function anleitungStarten() { anleitungZeigen(); if (!anleitungUhr && anleitung.schritt < ANLEITUNG.length) anleitungUhr = setInterval(anleitungZeigen, 1000); }
document.getElementById('anleitungWeg').addEventListener('click', () => { anleitungFrage = true; anleitungZeigen(); });   // erst fragen (im Spiel, kein Browser-Fenster)
document.getElementById('anleitungNein').addEventListener('click', () => { anleitungFrage = false; anleitungZeigen(); });
document.getElementById('anleitungJa').addEventListener('click', () => {
    anleitungFrage = false; anleitung.schritt = ANLEITUNG.length; anleitungSpeichern(); anleitungZeigen(); setTimeout(maybeShowDaily, 1500);   // (übersprungen: die tägliche Belohnung kommt jetzt)
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

