// Teil 05e-belohnung.js: Belohnungen überall gleich wie RoK (Kachel je Seltenheit, großes KI-Symbol, Menge unten rechts) und das Belohnungs-Fenster (Kiste wackelt, geht auf, Strahlen, Kacheln nacheinander)
// ===== BELOHNUNGEN: eine Kachel je Sache – Kachel-Bild nach Seltenheit (ui_kachel_*), Symbol aus bilder/beute_*.webp, Menge unten rechts =====
// Eine Belohnung b: { a: Art (BEUTE_ART), n: Menge, r: Seltenheit 0–5 (sonst nach Art/Menge), slot: Ausrüstungs-Platz (a 'item'), held: Helden-ID (a 'sh'),
// k: Kisten-Art (a 'kiste': aus|held|gross|episch|royal), min: „mind.“ Seltenheit, ohneZahl: Menge steht schon daneben, minus: verloren (Kampfbericht) }. Nur Anzeige – wer etwas gibt, gibt es wie bisher und meldet hier nur, WAS es war.
var BEUTE_ART = {
    gems: { b: 'beute_edelsteine', t: 'Edelsteine' }, coins: { b: 'beute_muenzen', t: 'Münzen', r: 1 }, holz: { b: 'beute_holz', t: 'Holz', r: 1 },
    stein: { b: 'beute_stein', t: 'Stein', r: 1 }, eisen: { b: 'beute_eisen', t: 'Eisen', r: 1 }, tr: { b: 'beute_truppen', t: 'Truppen', r: 2 },
    sh: { b: 'beute_splitter', t: 'Helden-Splitter', r: 3 }, schild: { b: 'beute_schild', t: 'Friedensschild', r: 2 },
    punkte: { b: 'beute_punkte', t: 'Fähigkeitspunkte', r: 2 }, tele: { b: 'ui_sym_verlegen', t: 'Teleporter', r: 3 }, rahmen: { b: 'ui_sym_krone', t: 'Rahmen', r: 4 }, item: { t: 'Ausrüstung', r: 0 }, kiste: { t: 'Kiste', r: 0 },
    eventMuenzen: { b: 'beute_eventmuenze', t: 'Event-Münzen', r: 3 }, schluessel1: { b: 'beute_schluessel', t: 'Schlüssel', r: 2 },
    schluessel2: { b: 'beute_schluessel_episch', t: 'Epischer Schlüssel', r: 3 }, besch: { b: 'beute_beschleuniger_klein', t: 'Beschleuniger', r: 1 }
};
// ===== GEGENSTÄNDE (Events/Shop, 8.10.): Event-Münzen, Schlüssel 1 (normal) / 2 (episch), Beschleuniger je Dauer =====
// Beschleuniger gelten für Bauen, Forschen und Heilen – nicht für Truppen. Alles in EINEM Spielstand-Eintrag (openWaterGegenst).
var BESCH_MIN = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '3h': 180, '8h': 480, '24h': 1440 };
var BESCH_DAUERN = Object.keys(BESCH_MIN);
const beschText = d => BESCH_MIN[d] < 60 ? BESCH_MIN[d] + ' Min' : BESCH_MIN[d] / 60 + ' Std';
const beschR = d => BESCH_MIN[d] <= 15 ? 1 : BESCH_MIN[d] <= 180 ? 2 : 3;          // Bronze (grün) · Silber (blau) · Gold (lila)
const beschBild = d => 'beute_beschleuniger_' + (BESCH_MIN[d] <= 15 ? 'klein' : BESCH_MIN[d] <= 180 ? 'mittel' : 'gross');
// Preise im Shop (Kisten-/Tempo-/Event-Reiter, 06g) – das Hauptbuch (10d3 hbGegenst) rechnet mit denselben: [Edelsteine, Event-Münzen, Woche-Limit Event-Shop]
var BESCH_PREIS = { '1m': [5, 10, 20], '5m': [20, 40, 20], '15m': [50, 100, 10], '1h': [150, 300, 10], '3h': [400, 800, 5], '8h': [1000, 2000, 3], '24h': [2800, 5500, 1] };
var SCHLUESSEL_PREIS = { 1: [100, 200, 10], 2: [500, 1000, 3] };
var eventMuenzen = 0, schluessel1 = 0, schluessel2 = 0, besch = {};
function gegenstLaden() {
    let g = null; try { g = JSON.parse(store.get('openWaterGegenst')); } catch (e) { g = null; }
    g = g && typeof g === 'object' ? g : {}; const z = v => Math.max(0, Math.floor(+v || 0));
    eventMuenzen = z(g.em); schluessel1 = z(g.s1); schluessel2 = z(g.s2); besch = {};
    for (const d of BESCH_DAUERN) besch[d] = z(g.besch && g.besch[d]);
}
function gegenstSpeichern() { store.set('openWaterGegenst', JSON.stringify({ em: eventMuenzen, s1: schluessel1, s2: schluessel2, besch })); }
gegenstLaden();
const beschMinuten = () => BESCH_DAUERN.reduce((a, d) => a + besch[d] * BESCH_MIN[d], 0);   // alle Beschleuniger zusammen in Minuten
// Gutschreiben (alle Teams rufen nur das auf): art 'eventMuenzen' | 'schluessel1' | 'schluessel2' | 'besch' (extra.dauer '1m'…'24h') | 'gems' | 'coins'.
// → die Belohnung als Kachel-Angabe für beuteKachel/beuteFenster (null: unbekannt oder nichts)
function gibBelohnung(art, menge, extra) {
    const n = Math.floor(+menge || 0); if (!(n > 0)) return null;
    if (art === 'eventMuenzen') eventMuenzen += n;
    else if (art === 'schluessel1') schluessel1 += n;
    else if (art === 'schluessel2') schluessel2 += n;
    else if (art === 'besch') { const d = extra && (typeof extra === 'string' ? extra : extra.dauer); if (!BESCH_MIN[d]) return null; besch[d] += n; gegenstSpeichern(); return { a: 'besch', n, dauer: d }; }
    else if (art === 'gems') { gems += n; saveGame(); updateHud(); return { a: 'gems', n }; }
    else if (art === 'coins') { coins += n; saveGame(); updateHud(); return { a: 'coins', n }; }
    else return null;
    gegenstSpeichern(); return { a: art, n };
}
var BEUTE_SLOT = { weapon: 'beute_waffe', armor: 'beute_ruestung', shield: 'beute_rundschild', boots: 'beute_stiefel' };
var KISTE_BILD = { aus: 'kiste_ausruestung', held: 'kiste_held', gross: 'kiste_gross', episch: 'kiste_episch', royal: 'kiste_royal', heldE: 'kiste_held_episch' };
var KISTE_NAME = { aus: 'Ausrüstungskiste', held: 'Heldenkiste', gross: 'Große Kiste', episch: 'Epische Kiste', royal: 'Königliche Kiste', heldE: 'Epische Helden-Kiste' };
const kisteVonR = r => r >= 3 ? 'royal' : 'aus';   // Kiste „mind. <Seltenheit>“ (Preise, Abholfach): ab Episch die Königliche
function beuteR(b) {                                // Seltenheit der Kachel: eigene, sonst je Art (Edelsteine nach Menge)
    if (b.r >= 0) return Math.min(5, b.r | 0);
    if (b.a === 'sh' && b.held && typeof heroById === 'function' && heroById(b.held)) return heroById(b.held).r;
    if (b.a === 'gems') return b.n >= 500 ? 4 : b.n >= 100 ? 3 : 2;
    if (b.a === 'besch' && BESCH_MIN[b.dauer]) return beschR(b.dauer);
    const d = BEUTE_ART[b.a]; return d && d.r >= 0 ? d.r : 0;
}
function beuteName(b) {
    if (b.a === 'item') return (RARITY_DEFS[beuteR(b)] || RARITY_DEFS[0]).label + ' ' + ((EQUIPMENT_DEFS[b.slot] || {}).name || 'Ausrüstung');
    if (b.a === 'kiste') return KISTE_NAME[b.k || 'aus'] + (b.min ? ' (mind. ' + RARITY_DEFS[b.r].label + ')' : '');
    if (b.a === 'sh' && b.held && typeof heroById === 'function' && heroById(b.held)) return 'Splitter ' + heroById(b.held).name;
    if (b.a === 'schild') return 'Friedensschild ' + b.n + ' Std.';
    if (b.a === 'besch' && BESCH_MIN[b.dauer]) return 'Beschleuniger ' + beschText(b.dauer);
    return (BEUTE_ART[b.a] || { t: '' }).t;
}
function beuteBild(b) {
    if (b.a === 'item') return BEUTE_SLOT[b.slot] || 'beute_waffe';
    if (b.a === 'kiste') return KISTE_BILD[b.k || 'aus'] + '_zu';
    if (b.a === 'besch' && BESCH_MIN[b.dauer]) return beschBild(b.dauer);
    return (BEUTE_ART[b.a] || BEUTE_ART.gems).b;
}
function beuteMenge(b) {                            // unten rechts: Anzahl (Schild: Stunden); ein einzelnes Teil/eine Kiste ohne Zahl; ohneZahl: steht daneben
    if (b.ohneZahl) return '';
    if (b.minus) return '−' + (b.n >= 1e4 ? fmtCompact(b.n) : fmtNum(b.n));
    if (b.a === 'schild') return b.n + ' h';
    if ((b.a === 'item' || b.a === 'kiste' || b.a === 'rahmen') && !(b.n > 1)) return '';
    return b.n >= 1e4 ? fmtCompact(b.n) : fmtNum(b.n || 1);
}
function beuteKachel(b, tag) {                      // tag: 'li' in Listen (Tages-, Stufen-, Boss-Fenster), sonst span
    tag = tag || 'span'; const r = beuteR(b), m = beuteMenge(b), name = beuteName(b);
    const held = b.a === 'sh' && b.held && typeof heroImg === 'function' ? heroImg(b.held, 'bk-held') : '';
    return '<' + tag + ' class="bk" data-r="' + (RARITY_DEFS[r] || RARITY_DEFS[0]).key + '" data-beute="' + b.a + '"' + (b.minus ? ' data-minus' : '') + ' title="' + escapeHtml(name + (m ? ' · ' + m : '')) + '">' +
        '<img src="bilder/' + beuteBild(b) + '.webp" alt="' + escapeHtml(name) + '" draggable="false">' + held + (b.a === 'besch' && BESCH_MIN[b.dauer] ? '<i class="bk-zeit">' + beschText(b.dauer) + '</i>' : '') + (m ? '<b>' + m + '</b>' : '') + '</' + tag + '>';
}
function beuteZusammen(liste) {                     // gleiche Sachen in eine Kachel (10 Kisten: „3 × Episch Waffe“)
    const out = [], idx = {};
    for (const b of liste) { if (!b || !(b.n > 0 || b.a === 'item' || b.a === 'kiste' || b.a === 'rahmen')) continue;
        const k = [b.a, beuteR(b), b.slot || '', b.held || '', b.k || '', b.dauer || '', b.a === 'schild' ? b.n : '', b.minus ? 1 : ''].join('|');
        if (idx[k] !== undefined && b.a !== 'schild') { out[idx[k]].n = (out[idx[k]].n || 1) + (b.n || 1); continue; }
        idx[k] = out.length; out.push(Object.assign({}, b, { n: b.n || 1 })); }
    return out;
}
function beuteRaster(liste, cls, mitNamen) {        // Reihe von Kacheln; mitNamen: Name klein darunter (Belohnungs-Fenster)
    const L = beuteZusammen(liste); if (!L.length) return '';
    return '<div class="bk-raster' + (cls ? ' ' + cls : '') + '">' + L.map((b, i) => mitNamen ? '<span class="bk-mit" style="--i:' + i + '">' + beuteKachel(b) + '<small>' + escapeHtml(beuteName(b)) + '</small></span>' : beuteKachel(b)).join('') + '</div>';
}
function itemBeute(it) { return { a: 'item', slot: it.slot, r: it.rarity }; }   // ein Ausrüstungs-Teil als Kachel
function beuteLis(liste, el) {                      // Kacheln als <li> in die Listen der Fenster (Tag, Stufe, Kriegsherr) – kommen nacheinander
    el.innerHTML = beuteZusammen(liste).map(b => beuteKachel(b, 'li')).join('');
    [...el.children].forEach((li, i) => { li.style.animationDelay = (120 + i * 110) + 'ms'; });
}

// ---- Belohnungs-Fenster: über allem, mit Kiste (Animation) oder ohne; ein Tipp überspringt die Animation, „OK“ schließt ----
let beuteFensterTimer = [];
function beuteFenster(titel, liste, opt) {          // opt: { kiste: Kisten-Art, unter: Zeile unter dem Titel, n: so viele Kisten auf einmal }
    opt = opt || {}; const L = beuteZusammen(liste); if (!L.length) return;
    let f = document.getElementById('beuteFenster');
    if (!f) {
        f = document.createElement('div'); f.id = 'beuteFenster'; f.className = 'bf'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-labelledby', 'bfTitel');
        f.innerHTML = '<div class="bf-karte"><div class="bf-band"><h2 id="bfTitel"></h2></div><div class="bf-unter"></div><div class="bf-buehne"><i class="bf-strahlen"></i><img class="bf-kiste" alt="" draggable="false"><b class="bf-anzahl"></b></div>' +
            '<div class="bf-inhalt"></div><button type="button" class="btn btn--primary bf-ok"><span>OK</span></button></div>';
        document.body.appendChild(f);
        f.addEventListener('click', e => { if (e.target.closest('.bf-ok') || e.target === f) { beuteFensterZu(); return; } if (!f.classList.contains('is-fertig')) beuteFensterFertig(); });
    }
    beuteFensterTimer.forEach(clearTimeout); beuteFensterTimer = [];
    const k = opt.kiste && KISTE_BILD[opt.kiste], kiste = f.querySelector('.bf-kiste');
    f.querySelector('#bfTitel').textContent = titel;
    setText(f.querySelector('.bf-unter'), opt.unter || ''); f.querySelector('.bf-unter').hidden = !opt.unter;
    setText(f.querySelector('.bf-anzahl'), opt.n > 1 ? opt.n + '×' : '');
    f.querySelector('.bf-inhalt').innerHTML = beuteRaster(L, L.length > 8 ? 'bk-viele' : '', true);
    f.classList.toggle('mit-kiste', !!k); f.classList.remove('is-wackeln', 'is-auf', 'is-fertig');
    if (k) { kiste.src = 'bilder/' + k + '_zu.webp'; kiste.dataset.auf = 'bilder/' + k + '_offen.webp'; }
    f.hidden = false; f.querySelector('.bf-ok').focus({ preventScroll: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { beuteFensterFertig(); return; }
    if (k) { void f.offsetWidth; f.classList.add('is-wackeln');   // wackeln → aufgehen (Strahlen) → Kacheln nacheinander
        beuteFensterTimer.push(setTimeout(() => { kiste.src = kiste.dataset.auf; f.classList.remove('is-wackeln'); f.classList.add('is-auf'); }, 700));
        beuteFensterTimer.push(setTimeout(beuteFensterFertig, 700 + 260 + L.length * 90 + 400)); }
    else { f.classList.add('is-auf'); beuteFensterTimer.push(setTimeout(beuteFensterFertig, 260 + L.length * 90 + 400)); }
}
function beuteFensterFertig() {                     // Endbild: Kiste offen, alle Kacheln da
    const f = document.getElementById('beuteFenster'); if (!f) return;
    beuteFensterTimer.forEach(clearTimeout); beuteFensterTimer = [];
    const kiste = f.querySelector('.bf-kiste'); if (f.classList.contains('mit-kiste') && kiste.dataset.auf) kiste.src = kiste.dataset.auf;
    f.classList.remove('is-wackeln'); f.classList.add('is-auf', 'is-fertig');
}
function beuteFensterZu() { const f = document.getElementById('beuteFenster'); if (!f || f.hidden) return false; beuteFensterTimer.forEach(clearTimeout); beuteFensterTimer = []; f.hidden = true; return true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && beuteFensterZu()) e.stopPropagation(); }, true);
