// Teil 05e-belohnung.js: Belohnungen überall gleich wie RoK (Kachel je Seltenheit, großes KI-Symbol, Menge unten rechts) und das Belohnungs-Fenster (Kiste wackelt, geht auf, Strahlen, Kacheln nacheinander)
// ===== BELOHNUNGEN: eine Kachel je Sache – Kachel-Bild nach Seltenheit (ui_kachel_*), Symbol aus bilder/beute_*.webp, Menge unten rechts =====
// Eine Belohnung b: { a: Art (BEUTE_ART), n: Menge, r: Seltenheit 0–5 (sonst nach Art/Menge), slot: Ausrüstungs-Platz (a 'item'), held: Helden-ID (a 'sh'),
// k: Kisten-Art (a 'kiste': aus|held|gross|episch|royal), min: „mind.“ Seltenheit, ohneZahl: Menge steht schon daneben, minus: verloren (Kampfbericht) }. Nur Anzeige – wer etwas gibt, gibt es wie bisher und meldet hier nur, WAS es war.
var BEUTE_ART = {
    gems: { b: 'beute_edelsteine', t: 'Edelsteine' }, coins: { b: 'beute_muenzen', t: 'Münzen', r: 1 }, holz: { b: 'beute_holz', t: 'Holz', r: 1 },
    stein: { b: 'beute_stein', t: 'Stein', r: 1 }, eisen: { b: 'beute_eisen', t: 'Eisen', r: 1 }, tr: { b: 'beute_truppen', t: 'Truppen', r: 2 },
    sh: { b: 'beute_splitter', t: 'Helden-Splitter', r: 3 }, tp: { b: 'beute_thron', t: 'Thron-Punkte', r: 4 }, schild: { b: 'beute_schild', t: 'Friedensschild', r: 2 },
    punkte: { b: 'beute_punkte', t: 'Fähigkeitspunkte', r: 2 }, tele: { b: 'ui_sym_verlegen', t: 'Teleporter', r: 3 }, rahmen: { b: 'ui_sym_krone', t: 'Rahmen', r: 4 }, item: { t: 'Ausrüstung', r: 0 }, kiste: { t: 'Kiste', r: 0 }
};
var BEUTE_SLOT = { weapon: 'beute_waffe', armor: 'beute_ruestung', shield: 'beute_rundschild', boots: 'beute_stiefel' };
var KISTE_BILD = { aus: 'kiste_ausruestung', held: 'kiste_held', gross: 'kiste_gross', episch: 'kiste_episch', royal: 'kiste_royal' };
var KISTE_NAME = { aus: 'Ausrüstungskiste', held: 'Heldenkiste', gross: 'Große Kiste', episch: 'Epische Kiste', royal: 'Königliche Kiste' };
const kisteVonR = r => r >= 3 ? 'royal' : 'aus';   // Kiste „mind. <Seltenheit>“ (Preise, Abholfach): ab Episch die Königliche
function beuteR(b) {                                // Seltenheit der Kachel: eigene, sonst je Art (Edelsteine nach Menge)
    if (b.r >= 0) return Math.min(5, b.r | 0);
    if (b.a === 'sh' && b.held && typeof heroById === 'function' && heroById(b.held)) return heroById(b.held).r;
    if (b.a === 'gems') return b.n >= 500 ? 4 : b.n >= 100 ? 3 : 2;
    const d = BEUTE_ART[b.a]; return d && d.r >= 0 ? d.r : 0;
}
function beuteName(b) {
    if (b.a === 'item') return (RARITY_DEFS[beuteR(b)] || RARITY_DEFS[0]).label + ' ' + ((EQUIPMENT_DEFS[b.slot] || {}).name || 'Ausrüstung');
    if (b.a === 'kiste') return KISTE_NAME[b.k || 'aus'] + (b.min ? ' (mind. ' + RARITY_DEFS[b.r].label + ')' : '');
    if (b.a === 'sh' && b.held && typeof heroById === 'function' && heroById(b.held)) return 'Splitter ' + heroById(b.held).name;
    if (b.a === 'schild') return 'Friedensschild ' + b.n + ' Std.';
    return (BEUTE_ART[b.a] || { t: '' }).t;
}
function beuteBild(b) {
    if (b.a === 'item') return BEUTE_SLOT[b.slot] || 'beute_waffe';
    if (b.a === 'kiste') return KISTE_BILD[b.k || 'aus'] + '_zu';
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
        '<img src="bilder/' + beuteBild(b) + '.webp" alt="' + escapeHtml(name) + '" draggable="false">' + held + (m ? '<b>' + m + '</b>' : '') + '</' + tag + '>';
}
function beuteZusammen(liste) {                     // gleiche Sachen in eine Kachel (10 Kisten: „3 × Episch Waffe“)
    const out = [], idx = {};
    for (const b of liste) { if (!b || !(b.n > 0 || b.a === 'item' || b.a === 'kiste' || b.a === 'rahmen')) continue;
        const k = [b.a, beuteR(b), b.slot || '', b.held || '', b.k || '', b.a === 'schild' ? b.n : '', b.minus ? 1 : ''].join('|');
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
function beuteFensterOffen() { const f = document.getElementById('beuteFenster'); return !!f && !f.hidden; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && beuteFensterZu()) e.stopPropagation(); }, true);
