// Teil 06c-thron-mitte.js: Thron-Punkte, die Mitte (Thron, Wächter-Tempel, Tore), Kopfgeld auf den Herrscher
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
    return id === 'coins' ? Math.max(wirtK(5000), Math.round(hp.coins)) : id === 'troops' ? Math.max(wirtK(1000), Math.round(hp.troops)) : id === 'gems' ? 100 : 1; }   // (Mindestwerte × WIRTSCHAFT_KOSTEN)
function throneGive(who, id) {                        // hands one offer over; returns what it was, for the hint
    const n = throneAmount(who, id), b = who === 'player' ? null : loadBotState()[who];
    if (id === 'coins') { if (b) botCoins[who] = (botCoins[who] || 0) + n; else coins += n; return '+' + fmtCompact(n) + ' Münzen'; }
    if (id === 'gems') { if (b) b.gems += n; else gems += n; return '+' + n + ' Edelsteine'; }
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
            (bo ? '<div class="ts-row">' + icon(bo.who === 'player' ? 'losses' : 'gem') + '<span>' + (bo.who === 'player' ? 'Kopfgeld auf dich' : 'Kopfgeld') + '</span><b' + (bo.who === 'player' ? ' class="warn"' : '') + '>' + fmtNum(bo.gems) + ' Edelsteine · ' + fmtCompact(bo.coins) + '</b></div>' : '') +
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
// Punkte für Kämpfe gibt es nur noch im Wochen-Event (Krieger-Woche): 1 je 1.000 besiegte (× WIRTSCHAFT_KOSTEN: heute je 0,56 – die
// Gegner sind so viel kleiner), höchstens 30 auf einmal, im Schnitt 10 pro Minute.
const WO_KILL_PER = 1000 * WIRTSCHAFT_KOSTEN, WO_KILL_MAX = 30, WO_KILL_MIN = 10, WO_TOP = 10;
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
    b.gems = Math.min(BOUNTY_GEMS_MAX, (b.gems || 0) + BOUNTY_GEMS); b.coins = Math.min(Math.max(wirtK(1e4), hc * BOUNTY_COIN_MAX_H), (b.coins || 0) + Math.max(wirtK(500), hc * BOUNTY_COIN_H)); saveBounty();   // (Mindestwerte × WIRTSCHAFT_KOSTEN)
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
    const txt = r === 'player' ? 'Kopfgeld für den Sturz von ' + botById[was].name + ': ' + fmtNum(g) + ' Edelsteine und ' + fmtCompact(c) + ' Münzen – abholen unter Events → Belohnung!'
        : was === 'player' ? botById[r].name + ' hat das Kopfgeld auf dich kassiert: ' + fmtNum(g) + ' Edelsteine.' : g >= 100 ? botById[r].name + ' kassiert das Kopfgeld auf ' + botById[was].name + ': ' + fmtNum(g) + ' Edelsteine.' : '';
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
    if (b && island.type === 'megaTemple') h += b.who === 'player' ? '<div class="notice notice--warn">' + icon('losses') + '<span><b>Kopfgeld auf dich: ' + fmtNum(b.gems) + ' Edelsteine + ' + fmtCompact(b.coins) + ' Münzen.</b> Wer dir den Thron abnimmt, kassiert alles – je länger du herrschst, desto mehr kommen.</span></div>'
        : '<div class="notice notice--gold">' + icon('coin') + '<span><b>Kopfgeld auf ' + escapeHtml(botById[b.who].name) + ': ' + fmtNum(b.gems) + ' Edelsteine + ' + fmtCompact(b.coins) + ' Münzen.</b> Nimm den Thron und kassiere alles.</span></div>';
    return h;
}

