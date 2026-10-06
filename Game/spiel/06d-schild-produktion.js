// Teil 06d-schild-produktion.js: Friedensschild, Willkommen zurück, Produktion
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
    if (gems < cost) { flashHint('Zu wenig Edelsteine – der Schild kostet ' + cost + '.', 3000); return; }
    gems -= cost; const stock = shieldStock(); stock[h]++; store.set('openWaterShieldStock', JSON.stringify(stock));
    updateHud(); saveGame(); renderShop();
    flashHint('Schild (' + h + ' Std.) liegt im Vorrat – unten einschalten, wann du willst.', 3500); });
function heroChestPool(minR) { return HEROES.filter(h => { const s = heroSt('player', h.id); return s && !(s.own && s.q >= HERO_MAXQ) && h.r >= minR; }); }
function renderHeroChests() {                       // the odds per rarity follow your heroes: maxed ones drop out
    const pool = heroChestPool(1), tot = pool.reduce((a, h) => a + 5 - h.r, 0);
    liveHtml(document.getElementById('heroChestOdds'), [1, 2, 3, 4].map(r => { const w = pool.filter(h => h.r === r).reduce((a, h) => a + 5 - h.r, 0); const rd = RARITY_DEFS[r];
        return '<span class="chip" style="color:' + rd.color + ';border-color:' + rd.color + '88">' + rd.label + ' ' + (tot ? Math.round(w / tot * 100) : 0) + ' %</span>'; }).join(''));
    liveHtml(document.getElementById('heroChestOpts'), HERO_CHESTS.slice().reverse().map(c => { const k = HCHEST_ART[c.id] || 'held';   // die wertvollste groß zuerst
        return '<div class="ware' + (c.id === 'hcE' ? ' ware--gross glanz' : '') + '" data-r="' + KISTE_R[k] + '">' + (HCHEST_BAND[c.id] ? '<span class="band">' + HCHEST_BAND[c.id] + '</span>' : '') +
            '<span class="ware-bild">' + kisteBild(k, 'k') + '</span><span class="ware-txt"><b class="ware-name">' + c.name + '</b><small>' + c.txt + '</small></span>' +
            '<button type="button" class="ware-preis" data-hchest="' + c.id + '" aria-label="' + c.name + ' kaufen"' + (gems < c.gems || !heroChestPool(c.minR).length ? ' disabled' : '') + '>' + icon('gem') + '<b>' + fmtNum(c.gems) + '</b></button></div>'; }).join(''));
}
// Gezeichnete Truhe für die Shop-Karten (SVG): Deckel, Kasten, Bänder, Schloss, Glanz, Sterne – das Leuchten macht die Karte
const KISTE_ART = {                                  // Kasten oben/unten, Bänder hell/dunkel, Zeichen auf dem Schloss
    aus: { k: ['#8a5a2e', '#3e2410'], b: ['#e3e7ec', '#6b7078'] }, held: { k: ['#8a5a2e', '#3e2410'], b: ['#a9d4ff', '#2c62b0'], z: 'krone' },
    gross: { k: ['#9a6428', '#432410'], b: ['#f6e7bf', '#a27832'], z: 'stern' }, episch: { k: ['#7c4cc4', '#1e1033'], b: ['#f6e7bf', '#a27832'], z: 'stein' },
    royal: { k: ['#2f5490', '#0d1a33'], b: ['#f6e7bf', '#a27832'], z: 'krone' } };
const KISTE_R = { aus: 'grau', held: 'blau', gross: 'gold', episch: 'lila', royal: 'lila' };
const HCHEST_ART = { hc1: 'held', hc3: 'gross', hcE: 'episch' }, HCHEST_BAND = { hcE: 'Bester Wert', hc1: 'Beliebt' };   // (Bänder nur Optik)
function kisteStern(x, y, r, o) { const q = r * .28, p = r * .72;   // 4-Zack-Stern (Glanz)
    return '<path d="M' + x + ' ' + (y - r) + 'l' + q + ' ' + p + ' ' + p + ' ' + q + ' ' + -p + ' ' + q + ' ' + -q + ' ' + p + ' ' + -q + ' ' + -p + ' ' + -p + ' ' + -q + 'z" fill="#fff" opacity="' + o + '"/>'; }
function kisteBild(k, ort) {                         // ort: eigene Verlaufs-Namen je Reiter (gleich bei jedem Neuzeichnen – liveHtml tauscht nichts)
    const a = KISTE_ART[k] || KISTE_ART.aus, n = 'kb' + (ort || 'k') + k;
    const z = a.z === 'stein' ? '<path d="M60 42l6.5 7.5-6.5 8.5-6.5-8.5z" fill="#c99bff" stroke="#fff" stroke-width=".8"/><circle cx="58" cy="47" r="1.3" fill="#fff"/>'
        : a.z === 'krone' ? '<path d="M53 55v-8l3.5 3 3.5-5 3.5 5 3.5-3v8z" fill="#2a1a05"/>' : a.z === 'stern' ? '<path d="M60 42l2.3 4.7 5.2.7-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.7z" fill="#2a1a05"/>'
        : '<path d="M60 45a3 3 0 0 1 1.6 5.5l1.1 4.5h-5.4l1.1-4.5A3 3 0 0 1 60 45z" fill="#1c1205"/>';
    return '<svg viewBox="0 0 120 100" aria-hidden="true"><defs>' +
        '<linearGradient id="' + n + 'k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a.k[0] + '"/><stop offset="1" stop-color="' + a.k[1] + '"/></linearGradient>' +
        '<linearGradient id="' + n + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a.b[0] + '"/><stop offset="1" stop-color="' + a.b[1] + '"/></linearGradient></defs>' +
        '<ellipse cx="60" cy="91" rx="44" ry="6" fill="#000" opacity=".5"/>' +
        '<rect x="14" y="46" width="92" height="42" rx="4" fill="url(#' + n + 'k)" stroke="#0b0805" stroke-width="2"/>' +
        '<path d="M14 48V34Q14 14 60 14Q106 14 106 34V48Z" fill="url(#' + n + 'k)" stroke="#0b0805" stroke-width="2"/>' +
        '<path d="M14 62h92M14 75h92" stroke="#000" stroke-opacity=".22" stroke-width="1.2"/><path d="M20 34Q22 21 56 19" stroke="#fff" stroke-opacity=".3" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<g fill="url(#' + n + 'b)" stroke="#2a1a05" stroke-width="1"><path d="M30 17.5h8v70.5h-8zM82 17.5h8v70.5h-8z"/><rect x="12.5" y="43" width="95" height="7" rx="2"/><rect x="51" y="39" width="18" height="20" rx="3"/></g>' +
        z + kisteStern(101, 14, 6, .95) + kisteStern(16, 24, 3.5, .7) + kisteStern(110, 40, 2.5, .6) + '</svg>';
}
for (const el of document.querySelectorAll('[data-kiste-art]')) el.innerHTML = kisteBild(el.dataset.kisteArt, 'k');
shopPopup.addEventListener('click', e => { const b = e.target.closest('[data-sinfo]'); if (!b) return;   // „i“: Erklärung/Chancen auf und zu
    const k = b.dataset.sinfo, auf = !shopInfoAuf.has(k); if (auf) shopInfoAuf.add(k); else shopInfoAuf.delete(k);
    b.setAttribute('aria-expanded', auf ? 'true' : 'false'); b.classList.toggle('on', auf);
    for (const el of shopPopup.querySelectorAll('[data-sinfo-box="' + k + '"]')) { el.hidden = !auf; if (auf) el.scrollIntoView({ block: 'nearest' }); } });
function heroChestOpen(who, c) {                    // the same chest for you and the others: n draws of c.sh shards
    if (c.gems >= 500) { if (who === 'player') alsBefehl('bund', { op: 'kiste', c: c.id }); else if (typeof bundGeschenk === 'function') bundGeschenk(who, 'kiste'); }   // große Kiste: Geschenk fürs Bündnis
    const got = []; for (let i = 0; i < c.n; i++) { const h = heroGrantShards(who, c.sh, null, c.minR); if (h) got.push(h); } return got;
}
shopPopup.addEventListener('click', e => { const bt = e.target.closest('[data-hchest]'); if (!bt) return;
    const c = HERO_CHESTS.find(x => x.id === bt.dataset.hchest); if (!c) return;
    if (gems < c.gems) { flashHint('Zu wenig Edelsteine – die ' + c.name + ' kostet ' + fmtNum(c.gems) + '.', 3000); return; }
    if (!heroChestPool(c.minR).length) { flashHint('Alle passenden Helden haben schon 5 Sterne.', 3000); return; }
    if (!gemsWirklich('kiste:' + c.id, c.gems, bt)) return;
    gems -= c.gems; const got = heroChestOpen('player', c); questProgress('crate', 1); updateHud(); saveGame(); renderShop();   // (zählt für „Öffne … Kisten“)
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
    shopGemCount.title = fmtNum(Math.floor(gems)) + ' Edelsteine';
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
            '<div><b>Nicht genug Edelsteine</b><small>Eine Kiste kostet ' + fmtNum(CRATE_GEM_COST) + ' Edelsteine.</small></div>';
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
const prodGanz = x => Math.floor(x + 1e-6);          // (94 × 1/3600 × 3600 ist 93,999… – Rechenfehler der Kommazahlen kosten nie eine ganze Truppe/Münze)
function truppenMitRest(carry, id, n) {          // n Truppen (auch ein Bruchteil) zur Basis id – der Rest wartet im carry auf den nächsten Tick
    const tc = (carry[id] || 0) + n, tw = prodGanz(tc); carry[id] = tc - tw; if (tw) islandTroops[id] = (islandTroops[id] || 0) + tw;
}
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
            truppenMitRest(prodCarry.troops, ownedId, troopsPerTick(level) * troopMult * ticks);
            if (AUF) AUF.basisRoh('player', ownedId, level, ticks);           // Holz, Stein, Eisen je nach Landschaft (Paket D)

            const isl = islandById[ownedId];
            if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) {
                const mult = templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player');
                gems += TEMPLE_GEMS_PER_TICK * mult * ticks;
                prodCarry.coins += TEMPLE_COIN_BONUS_PER_TICK * mult * ticks;
                truppenMitRest(prodCarry.troops, rewardBaseId() ?? ownedId, TEMPLE_TROOP_BONUS_PER_TICK * mult * ticks);   // bonus troops go to the capital
            }
        }
        const cw = prodGanz(prodCarry.coins); coins += cw; prodCarry.coins -= cw;
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
                truppenMitRest(bc.troops, ownedId, troopsPerTick(level) * rb * bm.troops * bt);
                if (AUF) AUF.basisRoh(bot.id, ownedId, level, bt);
                const isl = islandById[ownedId];
                if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) {
                    const mult = templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult(bot.id);
                    bc.coins += TEMPLE_COIN_BONUS_PER_TICK * mult * bt;
                    const to = cap !== null && cap !== undefined && own.has(cap) ? cap : ownedId;   // bonus troops go to the capital, like yours
                    truppenMitRest(bc.troops, to, TEMPLE_TROOP_BONUS_PER_TICK * mult * bt);
                    b.gems += TEMPLE_GEMS_PER_TICK * mult * bt;
                }
            }
            const cw = prodGanz(bc.coins); botCoins[bot.id] = (botCoins[bot.id] || 0) + cw; bc.coins -= cw;
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
    if (pr && (pr.coins > 0 || pr.troops > 0)) rows.push(['coin', 'Produktion' + (pr.capped ? ' (8 Std.)' : ''), '+' + fmtCompact(pr.coins) + ' Münzen · +' + fmtCompact(pr.troops) + ' Truppen']);
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
    const hp = hourProduction('player');               // (5.10.: die Wirtschaft rechnet pro Stunde)
    if (hp.coins > 0 || hp.troops > 0) rows.push(['hourglass', 'Ertrag pro Stunde', '+' + fmtStunde(hp.coins) + ' Münzen · +' + fmtStunde(hp.troops) + ' Truppen']);
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
function flashHint(text, ms, lang) {                // lang: langer Hinweis – ganz lesbar (kein „…“), am Handy nicht über einem offenen Fenster
    clearTimeout(hintResetTimer);
    hintEl.classList.toggle('toast--lang', !!lang);
    hintEl.textContent = text;
    if (ms) hintResetTimer = setTimeout(() => { hintEl.textContent = defaultHint; hintEl.classList.remove('toast--lang'); }, ms);
}
