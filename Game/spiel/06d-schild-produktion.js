// Teil 06d-schild-produktion.js: Friedensschild, Willkommen zurück, Produktion
// ===== FRIEDENSSCHILD: nobody may attack the player's bases while it stands; attacking yourself drops it =====
const SHIELD_PRICES = { 2: 80, 8: 300, 24: 700 };   // Edelsteine (7.10., RoK-näher: vorher 40/120/300) – 700 mit „Wirklich?“
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
// ANFÄNGERSCHUTZ (EINE Welt) – für echte Spieler UND Mitspieler gleich: 48 Std. kann sie niemand angreifen und niemand
// ausspähen (auch wenn sie selbst Mitspieler, Lager oder Felder angreifen). Endet früher, sobald sie 100.000 Truppen haben
// (Gesamttruppen wie im HUD) oder einen echten Spieler angreifen (Alexander 7.10.).
const NEULING_MS = 48 * 3600000, NEULING_TRUPPEN = 100000;
const staerkeMem = {};
function staerke(who) {                           // Macht wie in der Rangliste, höchstens einmal pro Minute neu gerechnet
    const m = staerkeMem[who], now = Date.now(); if (m && now - m.at < 60000) return m.v;
    let v = 0; try { v = powerOf(whoProfile(who)); } catch (e) { v = 0; }
    staerkeMem[who] = { v, at: now }; return v;
}
const truppenMem = {};
function neulingTruppen(who) {                    // Gesamttruppen (whoTroops), höchstens einmal pro Sekunde neu gezählt
    const m = truppenMem[who], now = Date.now(); if (m && now - m.at < 1000) return m.v;
    let v = 0; try { v = whoTroops(who); } catch (e) { v = 0; }
    truppenMem[who] = { v, at: now }; return v;
}
function neulingBis() {
    if (!window.WELT && store.get('openWaterNeulingBis') === null) store.set('openWaterNeulingBis', String(Date.now() + NEULING_MS));   // Vorschau ohne Server: derselbe Schutz ab dem ersten Start (Alexander 7.10.; Tests schalten ihn mit '0' ab)
    const t = parseFloat(store.get('openWaterNeulingBis')) || 0; if (t <= Date.now()) return 0;
    if (neulingTruppen('player') >= NEULING_TRUPPEN) { store.set('openWaterNeulingBis', '0'); afterSplash(() => flashHint('Dein Anfängerschutz ist vorbei – du hast 100.000 Truppen.', 5000)); return 0; }
    return t;
}
function botNeulingBis(who, b) {
    if (!window.WELT || !b) return 0;
    if (b.neuBis === undefined && !b.mensch) b.neuBis = worldStartAt() + NEULING_MS;   // Mitspieler der laufenden Welt: ab Weltstart
    const t = b.neuBis || 0; if (t <= Date.now()) return 0;
    if (neulingTruppen(who) >= NEULING_TRUPPEN) { b.neuBis = 0; saveBotState(); return 0; }   // (auch bei echten Spielern – nicht dem Handy überlassen)
    return t;
}
function neulingVon(who) { return !who ? 0 : who === 'player' ? neulingBis() : botNeulingBis(who, loadBotState()[who]); }
function neulingAktiv(who, now) { return neulingVon(who) > (now || Date.now()); }   // Anfängerschutz: nicht angreifen, nicht ausspähen
function neulingBlockText(who) { const n = who === 'player' ? 'Du bist' : ((botById[who] || {}).name || 'Dieser Spieler') + ' ist';
    return 'Anfängerschutz – noch ' + fmtHours(neulingVon(who) - Date.now()) + ' (oder bis 100.000 Truppen): ' + n + ' neu und kann nicht angegriffen und nicht ausgespäht werden.'; }
function neulingEnde(grund) { if (neulingBis() <= Date.now()) return; store.set('openWaterNeulingBis', '0'); if (grund) flashHint(grund, 4500); requestRender(); }
function ownerShielded(who, now) { return !!who && (now || Date.now()) < ownerShieldUntil(who); }
function shieldCovers(isl) { return !!isl && isl.type === 'tower'; }   // the shield covers the towers - never gates, temples or the throne (the middle stays open to everyone)
function baseShieldedFor(id, by, now) { const ow = islandOwnerOf(id); return !!ow && ow !== by && shieldCovers(islandById[id]) && ownerShielded(ow, now); }   // by: 'player' | bot id
function shieldedOwners(now) { const s = new Set(); if (now < ownerShieldUntil('player')) s.add('player'); for (const bot of BOT_DEFS) if (ownerShieldUntil(bot.id) > now) s.add(bot.id); return s; }
function shieldBlockText(ow) { const n = (botById[ow] || {}).name || 'Dieser Spieler', b = ow !== 'player' && loadBotState()[ow];
    if (b && botNeulingBis(ow, b) > Date.now() && botNeulingBis(ow, b) >= (b.shieldUntil || 0)) return neulingBlockText(ow);
    return 'Friedensschild: ' + n + ' ist noch ' + fmtHours(ownerShieldUntil(ow) - Date.now()) + ' unangreifbar.'; }
function fmtHours(ms) { return fmtDHMS(ms / 1000); }
function renderShieldState() { const el = document.getElementById('shieldState'); if (!el) return; const now = Date.now(), sh = shieldUntil() > now ? shieldUntil() : 0, neu = sh ? 0 : neulingBis();   // (die Restzeit zählt live)
    liveHtml(el, icon('shield') + '<span>' + (sh ? 'Friedensschild aktiv – noch ' + uhrHtml(sh) : neu > now ? 'Anfängerschutz – noch ' + uhrHtml(neu) + ' (oder bis 100.000 Truppen)' : 'Kein Schild aktiv.') + '</span>');
    const st = shieldStock(), ns = st[2] + st[8] + st[24], nt = teleImRucksack(), kauf = shopPopup.querySelector('[data-tele-kauf] b');
    if (kauf) setText(kauf, fmtNum(TP_GEMS));
    setText(document.getElementById('shopRucksackN'), 'Im Rucksack: ' + ns + (ns === 1 ? ' Schild' : ' Schilde') + ' · ' + nt + ' Teleporter ›'); }
shopPopup.addEventListener('click', e => {                 // Shop → Schilde/Teleporter: nur kaufen (in den Rucksack) – eingesetzt wird im Rucksack
    if (e.target.closest('[data-zum-rucksack]')) { openRucksack(); return; }
    const tk = e.target.closest('[data-tele-kauf]');
    if (tk) { if (gems < TP_GEMS) { flashHint('Zu wenig Edelsteine – ein Teleporter kostet ' + fmtNum(TP_GEMS) + '.', 3000); return; }
        if (!gemsWirklich('tele', TP_GEMS, tk)) return;
        gems -= TP_GEMS; store.set('openWaterTeleporter', String(teleVorrat() + 1));   // (der Weltrechner zieht die Gems beim Benutzen aus dem Ausgegebenen – Befehl teleport)
        updateHud(); saveGame(); renderShop(); flashHint('Teleporter liegt im Rucksack – dort „Benutzen“ oder auf ein freies Feld der Karte tippen.', 3500); return; }
    const bt = e.target.closest('[data-shield]'); if (!bt) return;
    const h = +bt.dataset.shield, cost = SHIELD_PRICES[h];
    if (gems < cost) { flashHint('Zu wenig Edelsteine – der Schild kostet ' + cost + '.', 3000); return; }
    if (!gemsWirklich('schild:' + h, cost, bt)) return;
    gems -= cost; const stock = shieldStock(); stock[h]++; store.set('openWaterShieldStock', JSON.stringify(stock));
    updateHud(); saveGame(); renderShop();
    flashHint('Schild (' + h + ' Std.) liegt im Rucksack – dort einsetzen, wann du willst.', 3500); });
// ===== RUCKSACK (Dock): Schilde einsetzen (die Zeit kommt zum laufenden Schild dazu), Teleporter benutzen (→ Karte), Splitter je Held (nur Anzeige) =====
const rucksackPopup = document.getElementById('rucksackPopup');
function teleVorrat() { return Math.max(0, parseInt(store.get('openWaterTeleporter'), 10) || 0); }   // gekaufte Teleporter
function teleImRucksack() { return teleVorrat() + (tpGratis('player') ? 1 : 0); }                 // + der Gratis-Teleporter neuer Spieler (Anfängerschutz)
function rkFach(b, name, txt, knopf) {               // eine Zeile: Kachel · Name + Text · Knopf
    return '<div class="rk-fach ki-karte">' + beuteKachel(b) + '<span class="rk-txt"><b>' + name + '</b><small>' + txt + '</small></span>' + knopf + '</div>';
}
function renderRucksack() {
    if (!isPanelOpen(rucksackPopup)) return;
    const now = Date.now(), sh = shieldUntil() > now ? shieldUntil() : 0, neu = sh ? 0 : neulingBis(), st = shieldStock(), nt = teleImRucksack(), gratis = tpGratis('player');
    liveHtml(document.getElementById('rkSchildStand'), icon('shield') + '<span>' + (sh ? 'Friedensschild aktiv – noch ' + uhrHtml(sh) : neu > now ? 'Anfängerschutz – noch ' + uhrHtml(neu) + ' (oder bis 100.000 Truppen)' : 'Kein Schild aktiv.') + '</span>');
    const kaufen = was => '<button type="button" class="btn btn--secondary rk-knopf" data-rk-kauf="' + was + '"><span>Kaufen</span></button>';
    let h = '<div class="sect"><h4>Friedensschilde</h4><span class="sect-aside">Zeit kommt dazu</span></div><div class="rk-liste">' +
        [2, 8, 24].map(n => rkFach({ a: 'schild', n }, 'Friedensschild ' + n + ' Std.', st[n] + '× im Rucksack',
            st[n] ? '<button type="button" class="btn btn--primary rk-knopf" data-rk-schild="' + n + '"><span>Einsetzen</span></button>' : kaufen('schild'))).join('') + '</div>';
    h += '<div class="sect"><h4>Teleporter</h4><span class="sect-aside">Hauptstadt umziehen</span></div><div class="rk-liste">' +
        rkFach({ a: 'tele', n: nt }, 'Teleporter', nt + '× im Rucksack' + (gratis ? ' (1 gratis für neue Spieler)' : ''),
            nt ? '<button type="button" class="btn btn--primary rk-knopf" data-rk-tele><span>Benutzen</span></button>' : kaufen('tele')) + '</div>';
    const helden = HEROES.map(x => [x, heroSt('player', x.id)]).filter(([, s]) => s && s.sh > 0);
    h += '<div class="sect"><h4>Helden-Splitter</h4><span class="sect-aside">Tipp → Held</span></div>' + (helden.length
        ? '<div class="bk-raster rk-splitter">' + helden.map(([x, s]) => '<button type="button" class="bk-mit" data-rk-held="' + x.id + '" aria-label="' + escapeHtml(x.name) + ' öffnen">' + beuteKachel({ a: 'sh', n: s.sh, held: x.id }) + '<small>' + escapeHtml(x.name) + '</small></button>').join('') + '</div>'
        : '<div class="empty-state lb-leer">' + icon('star') + '<span><b>Keine Splitter</b>Splitter gibt es aus Heldenkisten, Aufgaben und Events.</span></div>');
    liveHtml(document.getElementById('rkInhalt'), h);
}
function openRucksack() { closeAllPopups(); openPanel(rucksackPopup); renderRucksack(); }
document.getElementById('rucksackBtn').addEventListener('click', () => { if (isPanelOpen(rucksackPopup)) closePanel(rucksackPopup); else openRucksack(); });
document.getElementById('rucksackCloseBtn').addEventListener('click', () => closePanel(rucksackPopup));
rucksackPopup.addEventListener('click', e => {
    const su = e.target.closest('[data-rk-schild]');
    if (su) { const h = +su.dataset.rkSchild, stock = shieldStock(); if (!stock[h]) return;
        if (Math.max(Date.now(), shieldUntil()) + h * 3600000 > Date.now() + 8 * 86400000) { flashHint('Mehr als 8 Tage Friedensschild am Stück gehen nicht – erst, wenn er kürzer ist.', 3500); return; }   // (die Welt zählt höchstens 8 Tage)
        stock[h]--; store.set('openWaterShieldStock', JSON.stringify(stock)); statBump('shields');
        store.set('openWaterShield', String(Math.max(serverJetzt(), shieldUntil()) + h * 3600000)); shieldMemAt = 0;   // dazu zum laufenden Schild (Server-Uhr: die Welt rechnet mit ihr – eine falsch gestellte Handy-Uhr kürzt sonst den Schild)
        flashHint('Friedensschild aktiv – noch ' + fmtHours(shieldUntil() - Date.now()), 3000); renderRucksack(); requestRender(); return; }
    if (e.target.closest('[data-rk-tele]')) { if (!teleImRucksack()) return;
        closeAllPopups(); if (!cityView.hidden) closeCity(); recenterOnHome(true);
        flashHint('Tippe auf eine freie Stelle der Karte, dann „Teleportieren“ – das kostet 1 Teleporter.', 5000); return; }
    const k = e.target.closest('[data-rk-kauf]'); if (k) { openShop('shield'); return; }
    const hd = e.target.closest('[data-rk-held]'); if (hd) { closePanel(rucksackPopup); openHeroHall(hd.dataset.rkHeld); }
});
function heroChestPool(minR) { return HEROES.filter(h => { const s = heroSt('player', h.id); return s && !(s.own && s.q >= HERO_MAXQ) && h.r >= minR; }); }
function renderHeroChests() {                       // the odds per rarity follow your heroes: maxed ones drop out
    const pool = heroChestPool(1), tot = pool.reduce((a, h) => a + 5 - h.r, 0);
    liveHtml(document.getElementById('heroChestOdds'), [1, 2, 3, 4].map(r => { const w = pool.filter(h => h.r === r).reduce((a, h) => a + 5 - h.r, 0); const rd = RARITY_DEFS[r];
        return '<span class="chip" style="color:' + rd.color + ';border-color:' + rd.color + '88">' + rd.label + ' ' + (tot ? Math.round(w / tot * 100) : 0) + ' %</span>'; }).join(''));
    liveHtml(document.getElementById('heroChestOpts'), HERO_CHESTS.slice().reverse().map(c => { const k = HCHEST_ART[c.id] || 'held';   // die wertvollste groß zuerst
        return '<div class="ware' + (c.id === 'hcE' ? ' ware--gross glanz' : '') + '" data-r="' + KISTE_R[k] + '">' + (HCHEST_BAND[c.id] ? '<span class="band">' + HCHEST_BAND[c.id] + '</span>' : '') +
            '<span class="ware-bild">' + kisteBild(k) + '</span><span class="ware-txt"><b class="ware-name">' + c.name + '</b><small>' + c.txt + '</small></span>' +
            (c.gems < GEMS_WIRKLICH ? '<span class="ware-preise">' : '') + '<button type="button" class="ware-preis" data-hchest="' + c.id + '"' + (c.gems < GEMS_WIRKLICH ? ' data-x="1×"' : '') + ' aria-label="' + c.name + ' kaufen"' + (gems < c.gems || !heroChestPool(c.minR).length ? ' disabled' : '') + '>' + icon('gem') + '<b>' + fmtNum(c.gems) + '</b></button>' +
            (c.gems < GEMS_WIRKLICH ? kistenMehrKnopf(c.id, c.gems) + '</span>' : '') + '</div>'; }).join(''));
}
const KISTE_R = { aus: 'grau', held: 'blau', gross: 'gold', episch: 'lila', royal: 'lila' };
const HCHEST_ART = { hc1: 'held', hc3: 'gross', hcE: 'episch' }, HCHEST_BAND = { hcE: 'Bester Wert', hc1: 'Beliebt' };   // (Bänder nur Optik)
function kisteBild(k) { return '<img class="kiste-bild" src="bilder/' + (KISTE_BILD[k] || KISTE_BILD.aus) + '_zu.webp" alt="" draggable="false">'; }   // KI-Bild der Kiste (zu)
// Mehrere auf einmal öffnen (wie RoK „10×“): höchstens 10, sonst so viele, wie die Edelsteine reichen – nur bei Kisten unter 500 (die großen bleiben einzeln: Bündnis-Geschenk je Kiste)
const KISTE_MEHR = 10;
const kistenMehrN = preis => Math.max(0, Math.min(KISTE_MEHR, Math.floor(gems / preis)));
function kistenMehrKnopf(id, preis) {               // „10×“ (oder „N×“ mit dem Rest) neben dem Einzel-Knopf
    const n = kistenMehrN(preis), m = n >= 2 ? n : KISTE_MEHR;
    return '<button type="button" class="ware-preis" data-mehr="' + id + '" aria-label="' + m + ' Kisten öffnen"' + (n < 2 ? ' disabled' : '') + '><span class="ware-x">' + m + '×</span>' + icon('gem') + '<b>' + fmtNum(m * preis) + '</b></button>';
}
for (const el of document.querySelectorAll('[data-kiste-art]')) el.innerHTML = kisteBild(el.dataset.kisteArt);
shopPopup.addEventListener('click', e => { const b = e.target.closest('[data-sinfo]'); if (!b) return;   // „i“: Erklärung/Chancen auf und zu
    const k = b.dataset.sinfo, auf = !shopInfoAuf.has(k); if (auf) shopInfoAuf.add(k); else shopInfoAuf.delete(k);
    b.setAttribute('aria-expanded', auf ? 'true' : 'false'); b.classList.toggle('on', auf);
    for (const el of shopPopup.querySelectorAll('[data-sinfo-box="' + k + '"]')) { el.hidden = !auf; if (auf) el.scrollIntoView({ block: 'nearest' }); } });
function heroChestOpen(who, c) {                    // the same chest for you and the others: n draws of c.sh shards
    if (c.gems >= 500) { if (who === 'player') alsBefehl('bund', { op: 'kiste', c: c.id }); else if (typeof bundGeschenk === 'function') bundGeschenk(who, 'kiste'); }   // große Kiste: Geschenk fürs Bündnis
    const got = []; for (let i = 0; i < c.n; i++) { const h = heroGrantShards(who, c.sh, null, c.minR); if (h) got.push(h); } return got;
}
function heroChestKauf(c, n, bt) {                   // n Heldenkisten auf einmal (Edelsteine genau n-mal) – dieselbe Kiste wie bisher, nur öfter
    if (gems < c.gems * n) { flashHint('Zu wenig Edelsteine – ' + (n > 1 ? n + '× ' : 'die ') + c.name + ' kostet ' + fmtNum(c.gems * n) + '.', 3000); return; }
    if (!heroChestPool(c.minR).length) { flashHint('Alle passenden Helden haben schon 5 Sterne.', 3000); return; }
    if (!gemsWirklich((n > 1 ? 'mehr:' : 'kiste:') + c.id, c.gems * n, bt)) return;
    const got = []; let anz = 0;
    for (; anz < n && gems >= c.gems && heroChestPool(c.minR).length; anz++) { gems -= c.gems; got.push(...heroChestOpen('player', c)); questProgress('crate', 1); }   // (zählt für „Öffne … Kisten“)
    updateHud(); saveGame(); renderShop();
    const k = HCHEST_ART[c.id] || 'held', beute = got.map(h => ({ a: 'sh', n: c.sh, held: h.id }));
    // (keine Liste mehr unten im Shop – das Belohnungs-Fenster mit Animation zeigt alles, Alexander 7.10.)
    beuteFenster(c.name, beute, { kiste: k, n: anz, unter: anz > 1 ? anz + ' Kisten geöffnet' : '' });
}
shopPopup.addEventListener('click', e => { if (e.target.closest('[data-mehr]')) return;   // (10×: eigener Knopf unten)
    const karte = e.target.closest('#heroChestOpts .ware'), bt = e.target.closest('[data-hchest]') || (karte && karte.querySelector('[data-hchest]')); if (!bt || bt.disabled) return;   // die ganze Karte ist der Knopf (Spieltest: Tipp aufs Bild lief ins Leere)
    const c = HERO_CHESTS.find(x => x.id === bt.dataset.hchest); if (c) heroChestKauf(c, 1, bt); });
shopPopup.addEventListener('click', e => { const bt = e.target.closest('[data-mehr]'); if (!bt || bt.disabled) return;
    if (bt.dataset.mehr === 'aus') { ausKistenKauf(kistenMehrN(CRATE_GEM_COST), bt); return; }
    const c = HERO_CHESTS.find(x => x.id === bt.dataset.mehr); if (c && c.gems < GEMS_WIRKLICH) heroChestKauf(c, kistenMehrN(c.gems), bt); });
shopPopup.addEventListener('click', e => { if (e.target.closest('[data-hchest-hall]')) { closeAllPopups(); openHeroHall(); } });
function preiseFaerben(root) {                         // Edelstein-Preise: reicht es nicht, steht der Preis rot (sonst hell) – überall dieselbe Regel
    for (const b of root.querySelectorAll('.ware-preis:not(.thron)')) { const t = b.querySelector('b'), n = t ? parseInt(t.textContent.replace(/\D/g, ''), 10) : NaN;
        b.classList.toggle('zu-teuer', n > 0 && n > Math.floor(gems)); }
}
let kopfVorab = null;
function renderShop() {
    if (!kopfVorab) kopfVorab = HEROES.map(h => { const i = new Image(); i.src = heroPic(h.id); return i; });   // Heldenköpfe vorab laden: in den Splitter-Kacheln nach dem Kistenöffnen nie ein leerer Kreis
    const hdTab = document.querySelector('#shopTabs [data-stab="hd"]'), hdHier = typeof hdDa === 'function' && !!hdDa();   // der Reiter „Händler“ nur, wenn einer da ist
    if (hdTab.hidden === hdHier) hdTab.hidden = !hdHier;
    if (shopTab === 'hd' && !hdHier) { showShopTab('gems'); return; }
    if (shopTab === 'shield') renderShieldState(); else if (shopTab === 'gems') renderHeroChests();
    const tc = document.getElementById('shopThroneCount'); setText(tc, fmtHud(throneState.pts || 0)); tc.title = fmtNum(throneState.pts || 0) + ' Thron-Punkte';
    if (shopTab === 'throne') renderThroneShop();
    if (shopTab === 'hd' && typeof hdRender === 'function') hdRender();
    if (shopTab === 'markt' && AUF) liveHtml(document.getElementById('shopMarkt'), AUF.marktHtml());
    setText(shopGemCount, fmtHud(Math.floor(gems)));
    shopGemCount.title = fmtNum(Math.floor(gems)) + ' Edelsteine';
    shopOpenCrateBtn.disabled = gems < CRATE_GEM_COST;
    const mehr = document.querySelector('#shopPopup [data-mehr="aus"]'); if (mehr && !gemsArmed('mehr:aus')) mehr.outerHTML = kistenMehrKnopf('aus', CRATE_GEM_COST);
    preiseFaerben(document.getElementById('shopPopup'));
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
function ausKistenKauf(n, bt) {                     // n Ausrüstungskisten (openCrate n-mal: Edelsteine und Teile genau wie n einzelne Käufe)
    if (n > 1 && !gemsWirklich('mehr:aus', CRATE_GEM_COST * n, bt)) return;
    const items = []; for (let i = 0; i < n; i++) { const it = openCrate(); if (!it) break; items.push(it); }
    renderShop();
    if (!items.length) {
        shopCrateResult.style.display = 'block';
        delete shopCrateResult.dataset.r;
        shopCrateResult.innerHTML = '<div class="tile empty">' + icon('gem') + '</div>' +
            '<div><b>Nicht genug Edelsteine</b><small>Eine Kiste kostet ' + fmtNum(CRATE_GEM_COST) + ' Edelsteine.</small></div>';
        shopCrateResult.scrollIntoView({ block: 'nearest' });
        return;
    }
    const beute = items.map(it => ({ a: 'item', slot: it.slot, r: it.rarity }));
    beuteFenster('Ausrüstungskiste', beute, { kiste: 'aus', n: items.length, unter: items.length > 1 ? items.length + ' Kisten geöffnet' : '' });
}
shopOpenCrateBtn.addEventListener('click', () => ausKistenKauf(1, shopOpenCrateBtn));
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
function welcomeListHtml(from) { return welcomeRows(from).map(r => '<li>' + icon(r[0], r[0] === 'coin' ? 'ico-coin' : r[0] === 'troops' ? 'ico-troops' : '') + '<span>' + r[1] + '</span><b>' + r[2].replace(' · +', '<br>+') + '</b></li>').join(''); }   // (Münzen und Truppen je eine Zeile)
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

// Center the view on the player's island at start – auf „mittel“: die eigene Burg gut erkennbar, die Nachbarn im Bild
const startIsland = islandById[playerIslandId];
mapState.zoom = mapState.targetZoom = 0.012;
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
