// Teil 06g-shop-gegenstaende.js: Shop-Reiter Kisten (Schlüssel oder Edelsteine), Event (Event-Münzen), Tempo (Beschleuniger) und Beschleuniger benutzen (Bauen, Forschen)
// ===== KISTEN (Alexander 8.10.): Ausrüstung und Helden je normal + episch, „1ד/„10ד – mit Schlüssel, solange genug da sind, sonst Edelsteine.
// Normal: 1 Schlüssel oder 100 Edelsteine, episch: 1 Epischer Schlüssel oder 500 (ab 500 „Wirklich?“). Episch: spätestens beim 20. Mal sicher Lila.
const KISTEN = {
    aus: { name: 'Ausrüstungs-Kiste', k: 'aus', r: 'blau', s: 1, txt: '1 Teil · bis Episch' },
    ausE: { name: 'Epische Ausrüstung', k: 'episch', r: 'lila', s: 2, txt: '1 Teil · bis Episch', pity: 1 },
    held: { name: 'Helden-Kiste', k: 'held', r: 'blau', s: 1, hc: 'hc1', txt: '6 Splitter' },
    heldE: { name: 'Epische Helden-Kiste', k: 'heldE', r: 'lila', s: 2, hc: 'hcE', txt: '10 Splitter', pity: 1 }
};
const KISTE_PITY = 20, KISTE_ANZ = [1, 10];
const RARITY_EPISCH = [0, 40, 45, 15, 0, 0];         // Epische Ausrüstung: Ungewöhnlich 40 · Selten 45 · Episch 15 %
const HELD_EPISCH_PCT = 15;                          // Epische Helden-Kiste: 15 % ein epischer Held, sonst ein seltener
const kisteGems = id => SCHLUESSEL_PREIS[KISTEN[id].s][0];
const schluesselVon = s => s === 2 ? schluessel2 : schluessel1;
function kistenZ() { let z = null; try { z = JSON.parse(store.get('openWaterKistenZ')); } catch (e) {} return Object.assign({ ausE: 0, heldE: 0 }, z && typeof z === 'object' ? z : {}); }   // Versuche seit dem letzten Lila
function kistenZSetzen(z) { store.set('openWaterKistenZ', JSON.stringify(z)); }
function seltenheitAus(w) { const tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return 0; }
function kisteInhalt(id, z) {                        // eine Kiste öffnen → Kacheln; z: Zähler der epischen Kisten (wird hochgezählt/zurückgesetzt)
    const K = KISTEN[id];
    if (id === 'aus' || id === 'ausE') {
        const sicher = id === 'ausE' && z.ausE + 1 >= KISTE_PITY, r = id === 'aus' ? pickRandomRarity() : sicher ? 3 : seltenheitAus(RARITY_EPISCH);
        if (id === 'ausE') z.ausE = r >= 3 ? 0 : z.ausE + 1;
        return [itemBeute(addInventoryItem(pickRandomSlot(), r, 1))];
    }
    const c = HERO_CHESTS.find(x => x.id === K.hc); if (!c) return [];
    if (id === 'held') return heroChestOpen('player', c).map(g => ({ a: 'sh', n: g.n, held: g.id }));
    alsBefehl('bund', { op: 'kiste', c: c.id });   // (große Kiste: Geschenk fürs Bündnis wie heroChestOpen)
    const frei = h => { const s = heroSt('player', h.id); return s && !(s.own && s.q >= HERO_MAXQ); }, epi = HEROES.filter(h => h.r === 3 && frei(h)), sel = HEROES.filter(h => h.r === 2 && frei(h));
    const lila = epi.length && (z.heldE + 1 >= KISTE_PITY || Math.random() * 100 < HELD_EPISCH_PCT || !sel.length), wahl = lila ? epi : sel.length ? sel : epi;
    if (!wahl.length) return [];
    const held = wahl[Math.floor(Math.random() * wahl.length)]; heroGrantShards('player', c.sh, held.id);
    z.heldE = held.r >= 3 ? 0 : z.heldE + 1;
    return [{ a: 'sh', n: c.sh, held: held.id }];
}
function kisteOeffnen(id, anz, bt) {
    const K = KISTEN[id]; if (!K) return;
    if (K.hc && !heroChestPool(id === 'heldE' ? 2 : 1).length) { flashHint('Alle passenden Helden haben schon 5 Sterne.', 3000); return; }
    const mitS = schluesselVon(K.s) >= anz, g = kisteGems(id) * anz;
    if (!mitS && gems < g) { flashHint('Zu wenig ' + (K.s === 2 ? 'Epische Schlüssel' : 'Schlüssel') + ' und Edelsteine – ' + anz + '× kostet ' + fmtNum(g) + ' Edelsteine.', 3000); return; }
    if (!mitS && !gemsWirklich('kiste:' + id + ':' + anz, g, bt)) return;
    if (mitS) { if (K.s === 2) schluessel2 -= anz; else schluessel1 -= anz; gegenstSpeichern(); } else gems -= g;
    const z = kistenZ(), beute = [];
    for (let i = 0; i < anz; i++) { beute.push(...kisteInhalt(id, z)); questProgress('crate', 1); }
    kistenZSetzen(z); sfx('crate'); saveGame(); saveProgression(); updateHud(); renderShop();
    beuteFenster(K.name, beute, { kiste: K.k, n: anz, unter: anz > 1 ? anz + ' Kisten geöffnet' : '' });
}
// ===== Bausteine der Reiter (wie die Test-Datei werkzeuge/thronevent ?a=shopkisten|shop|shoptempo): Gruppen mit Zwischenüberschrift, 3 Spalten
const shopWare = (bild, r, name, unter, knoepfe, zeit, leer) => '<div class="ware ware--klein' + (leer ? ' leer' : '') + '" data-r="' + r + '"><span class="ware-bild"><img class="kiste-bild" src="bilder/' + bild + '.webp" alt="" draggable="false">' + (zeit ? '<b class="zeit">' + zeit + '</b>' : '') + '</span>' +
    '<span class="ware-txt"><b class="ware-name">' + name + '</b><small class="lim">' + unter + '</small></span><span class="ware-knoepfe">' + knoepfe + '</span></div>';
const shopGruppe = (titel, waren) => '<div class="sort-kopf">' + titel + '</div><div class="waren waren--3" style="--n:' + Math.max(2, Math.min(3, waren.length)) + '">' + waren.join('') + '</div>';   // Spalten = Anzahl (2–3): volle Breite
function gemKnopf(daten, key, g, vor, leer) {        // Preis in Edelsteinen (ab 500 nach dem ersten Tipp „Wirklich?“ – übersteht das Neuzeichnen)
    return '<button type="button" class="ware-preis' + (gemsArmed(key) ? ' is-armed' : '') + '" ' + daten + (leer ? ' disabled' : '') + '>' + (gemsArmed(key) ? 'Wirklich? ' : vor || '') + icon('gem') + '<b>' + fmtNum(g) + '</b></button>';
}
const emKnopf = (daten, em, leer) => '<button type="button" class="ware-preis ohne-g" ' + daten + (leer || eventMuenzen < em ? ' disabled' : '') + '><img src="bilder/beute_eventmuenze.webp" alt="">' + '<b>' + fmtNum(em) + '</b></button>';
function renderKistenReiter() {
    const z = kistenZ();
    const ware = id => { const K = KISTEN[id], hab = schluesselVon(K.s), sb = K.s === 2 ? 'beute_schluessel_episch' : 'beute_schluessel';
        const kn = KISTE_ANZ.map(n => hab >= n ? '<button type="button" class="ware-preis ohne-g" data-kiste="' + id + '" data-anz="' + n + '">' + n + '× <img src="bilder/' + sb + '.webp" alt=""><b>' + n + '</b></button>'
            : gemKnopf('data-kiste="' + id + '" data-anz="' + n + '"', 'kiste:' + id + ':' + n, kisteGems(id) * n, n + '× ')).join('');
        return shopWare(KISTE_BILD[K.k] + '_zu', K.r, K.name, K.pity ? '<span class="pity">Lila sicher ' + (z[id] || 0) + '/' + KISTE_PITY + '</span>' : hab + ' Schlüssel da', kn); };
    const sw = s => shopWare(s === 2 ? 'beute_schluessel_episch' : 'beute_schluessel', s === 2 ? 'lila' : 'blau', s === 2 ? 'Epischer Schlüssel' : 'Schlüssel', schluesselVon(s) + ' da',
        gemKnopf('data-s-kauf="' + s + '"', 'schl:' + s, SCHLUESSEL_PREIS[s][0]));
    liveHtml(document.getElementById('shopKisten'), shopGruppe('Ausrüstung', [ware('aus'), ware('ausE')]) + shopGruppe('Helden', [ware('held'), ware('heldE')]) + shopGruppe('Schlüssel', [sw(1), sw(2)]));
}
// ===== EVENT-SHOP: nur mit Event-Münzen, je Woche ein Limit (füllt Montag 0 Uhr auf). Preise ≈ 2× Edelstein-Preis (05e BESCH_PREIS/SCHLUESSEL_PREIS)
const EV_WAREN = [
    { id: 'schild8', g: 'Friedensschild', bild: 'beute_schild', r: 'blau', name: 'Friedensschild', zeit: '8 Std', em: 600, lim: 2 },
    { id: 'schild24', g: 'Friedensschild', bild: 'beute_schild', r: 'lila', name: 'Friedensschild', zeit: '24 Std', em: 1400, lim: 1 },
    { id: 'tele', g: 'Teleporter', bild: 'ui_sym_verlegen', r: 'lila', name: 'Teleporter', em: 1000, lim: 1 },
    ...BESCH_DAUERN.map(d => ({ id: 'b' + d, g: 'Beschleuniger', dauer: d, bild: beschBild(d), r: RARITY_DEFS[beschR(d)].key, name: 'Beschleuniger', zeit: beschText(d), em: BESCH_PREIS[d][1], lim: BESCH_PREIS[d][2] })),
    { id: 's1', g: 'Schlüssel', bild: 'beute_schluessel', r: 'blau', name: 'Schlüssel', em: SCHLUESSEL_PREIS[1][1], lim: SCHLUESSEL_PREIS[1][2] },
    { id: 's2', g: 'Schlüssel', bild: 'beute_schluessel_episch', r: 'lila', name: 'Epischer Schlüssel', em: SCHLUESSEL_PREIS[2][1], lim: SCHLUESSEL_PREIS[2][2] }
];
function evWocheAb(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }   // Montag 0 Uhr dieser Woche
function evGekauft() {
    let v = null; try { v = JSON.parse(store.get('openWaterEvShop')); } catch (e) {}
    const w = evWocheAb(serverJetzt()); return v && v.w === w && v.n && typeof v.n === 'object' ? v : { w, n: {} };
}
function renderEventReiter() {
    const gk = evGekauft(), bis = new Date(gk.w); bis.setDate(bis.getDate() + 7);
    const ware = o => { const n = gk.n[o.id] || 0, voll = n >= o.lim;
        return shopWare(o.bild, o.r, o.name, voll ? 'ausverkauft' : 'Woche ' + n + '/' + o.lim, emKnopf('data-ev-kauf="' + o.id + '"', o.em, voll), o.zeit, voll); };
    const gr = []; for (const o of EV_WAREN) { let x = gr.find(g => g[0] === o.g); if (!x) gr.push(x = [o.g, []]); x[1].push(ware(o)); }
    liveHtml(document.getElementById('shopEvent'), '<div class="ev-guthaben"><img src="bilder/beute_eventmuenze.webp" alt=""><span><b>' + fmtNum(eventMuenzen) + '</b><br><small style="margin:0;text-align:left">Event-Münzen</small></span>' +
        '<small>' + icon('hourglass') + ' füllt auf in<br><b>' + uhrHtml(bis.getTime()) + '</b> (Mo)</small></div>' + gr.map(g => shopGruppe(g[0], g[1])).join(''));
}
function evKaufen(id) {
    const o = EV_WAREN.find(x => x.id === id); if (!o) return;
    const gk = evGekauft(); if ((gk.n[id] || 0) >= o.lim) { flashHint('Diese Woche ausverkauft – Montag gibt es neue.', 3000); return; }
    if (eventMuenzen < o.em) { flashHint('Zu wenig Event-Münzen – ' + o.name + ' kostet ' + fmtNum(o.em) + '.', 3000); return; }
    eventMuenzen -= o.em; gk.n[id] = (gk.n[id] || 0) + 1; store.set('openWaterEvShop', JSON.stringify(gk));
    let b;
    if (o.dauer) b = gibBelohnung('besch', 1, o.dauer);
    else if (id === 's1' || id === 's2') b = gibBelohnung(id === 's1' ? 'schluessel1' : 'schluessel2', 1);
    else if (id === 'tele') { store.set('openWaterTeleporter', String(teleVorrat() + 1)); b = { a: 'tele', n: 1 }; }
    else { const h = id === 'schild8' ? 8 : 24, st = shieldStock(); st[h]++; store.set('openWaterShieldStock', JSON.stringify(st)); b = { a: 'schild', n: h }; }
    gegenstSpeichern(); sfx('coin'); renderShop();
    beuteFenster('Gekauft', [b], {});
}
// ===== TEMPO: Beschleuniger für Edelsteine (gelten für Bauen und Forschen – nicht für Truppen)
function renderTempoReiter() {
    liveHtml(document.getElementById('shopTempo'), '<div class="sect"><h4>Beschleuniger</h4><span class="sect-aside">Bauen · Forschen</span></div>' +
        shopGruppe('Beschleuniger · Edelsteine', BESCH_DAUERN.map(d => shopWare(beschBild(d), RARITY_DEFS[beschR(d)].key, 'Beschleuniger', besch[d] + ' da',
            gemKnopf('data-tempo-kauf="' + d + '"', 'tempo:' + d, BESCH_PREIS[d][0]), beschText(d)))));
}
shopPopup.addEventListener('click', e => {
    const k = e.target.closest('[data-kiste]:not([disabled])'); if (k) { kisteOeffnen(k.dataset.kiste, +k.dataset.anz || 1, k); return; }
    const sk = e.target.closest('[data-s-kauf]'); if (sk) { const s = +sk.dataset.sKauf, g = SCHLUESSEL_PREIS[s][0];
        if (gems < g) { flashHint('Zu wenig Edelsteine – ' + (s === 2 ? 'ein Epischer Schlüssel' : 'ein Schlüssel') + ' kostet ' + fmtNum(g) + '.', 3000); return; }
        if (!gemsWirklich('schl:' + s, g, sk)) return;
        gems -= g; gibBelohnung(s === 2 ? 'schluessel2' : 'schluessel1', 1); saveGame(); updateHud(); renderShop(); flashHint((s === 2 ? 'Epischer Schlüssel' : 'Schlüssel') + ' gekauft.', 2500); return; }
    const ev = e.target.closest('[data-ev-kauf]:not([disabled])'); if (ev) { evKaufen(ev.dataset.evKauf); return; }
    const tk = e.target.closest('[data-tempo-kauf]'); if (tk) { const d = tk.dataset.tempoKauf, g = BESCH_PREIS[d][0];
        if (gems < g) { flashHint('Zu wenig Edelsteine – der Beschleuniger kostet ' + fmtNum(g) + '.', 3000); return; }
        if (!gemsWirklich('tempo:' + d, g, tk)) return;
        gems -= g; gibBelohnung('besch', 1, d); saveGame(); updateHud(); renderShop(); flashHint('Beschleuniger ' + beschText(d) + ' liegt im Rucksack – benutze ihn beim Bauen oder Forschen.', 3500); }
});
// ===== BESCHLEUNIGER BENUTZEN: beim Bauen (Gebäude-Fenster) und Forschen (Labor) – jeder kürzt die Restzeit um seine Dauer
// ziel: 'bau:<Gebäude>' | 'fo'. Heilen geht sofort (Münzen) – dort braucht es keinen.
const beschPopup = document.getElementById('beschPopup');
let beschZiel = null;
function beschLauf(ziel) {                          // → der laufende Bau bzw. die Forschung (mit endsAt) oder null
    const c = loadCity(); if (ziel === 'fo') return c.foRun ? [c, c.foRun] : null;
    const b = cityBuildOf(c, ziel.slice(4)); return b ? [c, b] : null;
}
function beschWahl(ziel) { beschZiel = ziel; openPanel(beschPopup); renderBesch(); }
function renderBesch() {
    if (!isPanelOpen(beschPopup)) return;
    const l = beschZiel && beschLauf(beschZiel); if (!l) { closePanel(beschPopup); return; }
    const da = BESCH_DAUERN.filter(d => besch[d] > 0), name = beschZiel === 'fo' ? ((AUF && AUF.FORSCHUNG.find(x => x.id === l[1].id)) || { name: 'Forschung' }).name : cityDef(beschZiel.slice(4)).name;
    liveHtml(document.getElementById('beschInhalt'), '<div class="notice notice--gold">' + icon('hourglass') + '<span><b>' + escapeHtml(name) + '</b> · noch ' + uhrHtml(l[1].endsAt) + '</span></div>' +
        (da.length ? '<div class="bk-raster">' + da.map(d => '<button type="button" class="bk-mit" data-besch-d="' + d + '" aria-label="Beschleuniger ' + beschText(d) + ' benutzen">' + beuteKachel({ a: 'besch', n: besch[d], dauer: d }) + '<small>Benutzen</small></button>').join('') + '</div>' +
            '<button type="button" class="btn btn--primary btn--haupt" data-besch-auto>' + icon('hourglass') + '<span>Passend benutzen</span></button>'
            : '<div class="empty-state lb-leer">' + icon('hourglass') + '<span><b>Keine Beschleuniger</b>Es gibt sie bei Events und im Shop (Tempo, Event).</span></div>'));
}
function beschBenutzen(d) {                         // einen Beschleuniger der Dauer d auf das Ziel → true, wenn benutzt
    const l = beschLauf(beschZiel); if (!l || !(besch[d] > 0)) return false;
    const min = Math.min(BESCH_MIN[d], Math.max(0, (l[1].endsAt - Date.now()) / 60000));   // (nur die wirklich gesparten Minuten zählen)
    besch[d]--; gegenstSpeichern(); l[1].endsAt -= BESCH_MIN[d] * 60000; saveCity();
    if (beschZiel !== 'fo') evPunkte('bau', 'player', WO_PKT.bauMin * min);   // Wochen-Event „Bauherr“: Punkte je gesparter Bau-Minute (09c)
    if (l[1].endsAt <= Date.now()) { if (beschZiel === 'fo') AUF.foFertig('player'); else cityFinishBuild(true, beschZiel.slice(4)); }
    return true;
}
function beschAuto() {                              // so wenig wie möglich verschwenden: erst der größte, der noch ganz hineinpasst, zuletzt der kleinste vorhandene
    let n = 0;
    for (let i = 0; i < 500; i++) { const l = beschLauf(beschZiel); if (!l) break; const rest = l[1].endsAt - Date.now(); if (rest <= 0) break;
        const da = BESCH_DAUERN.filter(d => besch[d] > 0); if (!da.length) break;
        const d = da.filter(x => BESCH_MIN[x] * 60000 <= rest).pop() || da[0]; if (!beschBenutzen(d)) break; n++; }
    return n;
}
beschPopup.addEventListener('click', e => {
    if (e.target.closest('#beschCloseBtn')) { closePanel(beschPopup); return; }
    const b = e.target.closest('[data-besch-d]'); if (b) { beschBenutzen(b.dataset.beschD); afterBesch(); return; }
    if (e.target.closest('[data-besch-auto]')) { const n = beschAuto(); flashHint(n + ' Beschleuniger benutzt.', 2500); afterBesch(); }
});
function afterBesch() { if (cityOpenId) renderCitySheet(); updateCityBuilder(); renderBesch(); if (isPanelOpen(rucksackPopup)) renderRucksack(); }
document.getElementById('cityBeschBtn').addEventListener('click', () => { if (cityOpenId) beschWahl('bau:' + cityBauId(cityOpenId)); });
