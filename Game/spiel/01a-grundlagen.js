// Teil 01a-grundlagen.js: Grundlagen: rechnet(), Zahlen- und Zeit-Anzeige, Bausteine für Kampfbericht und Live-Anzeige, Konstanten
// Wirtschaft (Alexander 5.10.): Ertrag pro Stunde statt pro Sekunde; Kosten-Faktor siehe LIESMICH 11b A
const WIRTSCHAFT_ERTRAG = 1 / 3600;   // was früher pro Sekunde kam, kommt jetzt pro Stunde
const WIRTSCHAFT_KOSTEN = 1 / 1800;   // Kosten/Gegner: kleiner, aber nur halb so stark wie der Ertrag → alles etwa 2× langsamer als vorher (nie zu einfach)
// Holz/Stein/Eisen in normalen RoK-Größen (Alexander 6.10., Z1): ihre Kosten ohne ÷ 1.800, ihr Ertrag × 1.800
const ROH_FAKTOR = 1800;
// Münzen auch in normalen Zahlen (Alexander 6.10., „B“): Ertrag, Kosten und Belohnungen in Münzen × 1.000 – das Verhältnis bleibt
const MUENZ_FAKTOR = 1000;
const ROH_JE_MUENZE = ROH_FAKTOR / MUENZ_FAKTOR;   // Burg-Schutz: je Münze Schutz 1,8 je Holz/Stein/Eisen
// Rechnet dieses Spiel gerade die Welt (Weltrechner)? Ohne welt.js: immer.
function rechnet() { return !window.WELT || WELT.leiter; }
// Läuft hier der Weltrechner auf dem Server (weltrechner/start.js)? Dann: kein eigener Spieler, keine Basis, nichts zeichnen.
const SYSTEM = !!(window.__OW && window.__OW.system);
// Zuschauer (Handy am Server): von anderen kennt es nur Öffentliches (server.php FREMD_OEFFENTLICH) – Macht vom Weltrechner,
// Helden, Ausrüstung, Fähigkeiten, Stadt und Forschung nur aus dem Spähbericht
function fremdGeheim() { return !SYSTEM && !rechnet(); }
// Zuschauer: Befehl an den Weltrechner (gibt true zurück, wenn er geschickt wurde – dann nur noch das Private hier tun)
function alsBefehl(art, daten) { if (rechnet()) return false; WELT.befehl(art, daten); return true; }
const neutralId = id => (id === 'player' && window.WELT) ? WELT.ich : id;     // 'player' → u<meine id> (für Befehle/Nachrichten)
const lokalId = id => (window.WELT && id === WELT.ich) ? 'player' : id;
// Bündnisse (buendnis.js, wird nach spiel.js geladen): sind a und b im selben Bündnis? – Mitglieder greifen sich nicht an
function bundFreund(a, b) { return typeof bundVerbuendet === 'function' && bundVerbuendet(a, b); }
// Truppen, die dir geschenkt werden (Stufe, Thron-Shop, Krankenhaus, Funde, Admin): beim Zuschauer macht es der Weltrechner.
// q = woher (stufe/thron/heil/fund/geschenk/pass/aufgabe) – der Weltrechner prüft danach, wie viele es höchstens sein dürfen (Schummel-Schutz).
function eigeneTruppenDazu(base, n, q, mehr) { if (base === null || base === undefined || !(n > 0)) return; islandTroops[base] = (islandTroops[base] || 0) + n; alsBefehl('truppen', Object.assign({ n, q }, mehr || {})); }
// iPhone Home-Bildschirm-App: iOS macht die Seite um die Statusleiste zu kurz (unten bleibt ein schwarzer Streifen).
// Die Lücke wird gemessen, und die Leiste unten rutscht genau so weit runter (CSS-Wert --dock-off).
(function dockLuecke() {
    const setzen = () => { let off = 0;
        try { const app = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
              const w = innerWidth, h = innerHeight, sh = Math.max(screen.width, screen.height);
              const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden';
              document.body.appendChild(probe); const safeT = probe.offsetHeight; probe.remove();
              if (app && h > w && w < 900 && h > 500 && safeT > 0) off = Math.max(0, Math.min(safeT, Math.round(sh - h))); } catch (e) {}   // (nie mehr als die Statusleiste)
        document.documentElement.style.setProperty('--dock-off', off + 'px'); };
    if (document.body) setzen(); else addEventListener('DOMContentLoaded', setzen);
    addEventListener('resize', () => setTimeout(setzen, 50)); addEventListener('orientationchange', () => setTimeout(setzen, 300));
})();
// ===== spiel.js – das ganze Spiel Open Water (Karte, Stadt, Kämpfe, Helden, Ereignisse, Fenster …) =====
// Mitspieler: bots.js · 3D-Basen: baukunst.js · Speichern: speichern.js (alles geht über "store")
// Every storage access goes through here: blocked site data, sandboxed frames and a full quota must not stop the
// game - it then simply runs in memory.
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
                remove(k) { try { localStorage.removeItem(k); } catch (e) {} } };
// Full reset (raise the number to start everyone from scratch again): wipes every saved value of the game once.
const RESET_VERSION = '1';
if (!SYSTEM && store.get('openWaterReset') !== RESET_VERSION) {   // (nie beim Weltrechner – der würde sonst die ganze Welt löschen)
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('openWater')) localStorage.removeItem(k); } catch (e) {}
    store.set('openWaterReset', RESET_VERSION);
}
// WELT-SAISON (Server-Reset alle 8 Wochen, Alexander 5.10.) – der eigene Spielstand übernimmt den Reset beim Laden, bevor das
// Spiel irgendetwas liest. openWaterSaisonMein = die Saison, in der dieser Spielstand ist (geht im Profil mit – ein Profil von
// vor dem Reset zählt beim Weltrechner nicht). openWaterSaisonNeu setzt die Nachricht „saison“ (09f-saison.js), danach lädt die
// Seite neu. Bleibt: Stadt (Burg, Gebäude, Forschung), Helden, Ausrüstung, Gems, Holz/Stein/Eisen, Gekauftes, Abholfach.
// Weg: Stufe (→ 1, damit alle Fähigkeitspunkte), Münzen (→ 0 wie ein neuer Spieler), Verwundete, Kampfberichte, Nebel, Späher,
// alte Befehle. (Basen, Truppen, Bündnis, Märsche stehen in der Welt – die setzt der Weltrechner zurück.)
// Anfängerschutz (Alexander 5.10.): nach dem Reset 48 Std. wie ein neuer Spieler – die Zeit kommt vom Weltrechner (openWaterSaisonSchutz).
// Burg fair (Alexander 6.10. A): der erste Reset danach setzt jede Burg über Stufe BURG_FAIR auf BURG_FAIR (saison.burgFair = diese Saison,
// sonst openWaterSaisonBurg aus der Nachricht) – Gebäude, Forschung, Bauten passt aufbau.js beim Laden an (openWaterBurgFair, burgFair).
// Alexander 6.10.: einmalige Ausnahme (wegen des Fehlers, damit es fair bleibt) – im selben Schritt Edelsteine auf genau 1.000 und
// Holz/Stein/Eisen auf 0 (Münzen sind beim Reset immer 0). Bei späteren Resets nicht.
// Thron-Punkte (Alexander 6.10., jeder Reset): höchstens 20.000 gehen mit, der Rest wird 10 : 1 zu Edelsteinen – ins Abholfach.
// Zurückgespielte Sicherung (Alexander 5.10.): ist die Saison der Welt älter als die dieses Spielstands, holt er sich den Stand von
// vor dem Reset zurück (openWaterSaisonVorher, beim Reset gemerkt) – die Welt (Server) ist maßgeblich, das Handy folgt nur.
var saisonNeuGeladen = 0, saisonZurueckGeladen = 0, saisonBurgGeladen = 0;  // (09f-saison.js: Hinweis nach dem Neuladen · Burg: aufbau.js)
const BURG_FAIR = 4, SAISON_AUSNAHME_GEMS = 1000, SAISON_TP_MAX = 20000, SAISON_TP_JE_GEM = 10;
const SAISON_PRIVAT = ['openWaterLevel', 'openWaterXp', 'openWaterSkills', 'openWaterSkillPoints', 'openWaterCoins', 'openWaterNeulingBis'];   // (was der Reset ändert und das Zurückspielen wiederholt)
if (!SYSTEM) {
    let mein = parseInt(store.get('openWaterSaisonMein'), 10) || 0, nrW = 0, fairNr = 0;
    const neu = parseInt(store.get('openWaterSaisonNeu'), 10) || 0;
    try { const sw = JSON.parse(store.get('openWaterSaison')) || {}; nrW = sw.nr | 0; fairNr = sw.burgFair | 0; } catch (e) {}
    if (!mein) {                                     // ganz neu: die laufende Saison · ein Spielstand von vor der Saison-Regel: Saison 1
        mein = store.get('openWaterLevel') === null && store.get('openWaterCity') === null ? Math.max(1, nrW) : 1;
        store.set('openWaterSaisonMein', String(mein));
    }
    if (nrW > 0 && mein > nrW && !(neu > mein)) {    // die Welt ist wieder in einer älteren Saison (Sicherung zurückgespielt)
        let v = null; try { v = JSON.parse(store.get('openWaterSaisonVorher')); } catch (e) {}
        if (v && v.nr === nrW && v.k) { for (const k of SAISON_PRIVAT) { if (typeof v.k[k] === 'string') store.set(k, v.k[k]); else if (k === 'openWaterNeulingBis') store.set(k, '0'); else store.remove(k); }   // (ohne NeulingBis gäbe 10d-welt-weltrechner.js neuen Schutz)
            try { const c = JSON.parse(store.get('openWaterCity')); if (c && typeof c === 'object' && v.w >= 0) { c.wounded = v.w; store.set('openWaterCity', JSON.stringify(c)); } } catch (e) {}
            if (typeof v.res === 'string') store.set('openWaterRes', v.res);   // (Rohstoffe vor der Umrechnung)
            if (typeof v.city === 'string') { store.set('openWaterCity', v.city); store.remove('openWaterBurgFair'); }   // (Stadt vor „Burg fair“)
            if (typeof v.gems === 'string') store.set('openWaterGems', v.gems); }   // (Edelsteine vor der Ausnahme)
        mein = nrW; store.set('openWaterSaisonMein', String(mein)); saisonZurueckGeladen = nrW;
        if (window.WELT) { WELT.befehle.length = 0; WELT.ausgang = []; }
    }
    if (neu > mein) {
        const vorher = { nr: mein, k: {}, w: 0 }; for (const k of SAISON_PRIVAT) { const x = store.get(k); if (x !== null) vorher.k[k] = x; }
        const fair = fairNr > mein && fairNr <= neu ? BURG_FAIR : Math.min(BURG_FAIR, parseInt(store.get('openWaterSaisonBurg'), 10) || 0);
        if (fair > 0) { if (store.get('openWaterCity') !== null) vorher.city = store.get('openWaterCity'); store.set('openWaterBurgFair', String(fair)); }   // → aufbau.js
        try { vorher.w = (JSON.parse(store.get('openWaterCity')) || {}).wounded || 0; } catch (e) {}
        store.set('openWaterSaisonVorher', JSON.stringify(vorher));   // (für ein Zurückspielen der Sicherung von vor dem Reset)
        store.set('openWaterLevel', '1'); store.set('openWaterXp', '0'); store.set('openWaterSkills', '{}'); store.set('openWaterSkillPoints', '0');
        store.set('openWaterCoins', '0');
        const schutz = parseFloat(store.get('openWaterSaisonSchutz')) || 0; if (schutz > Date.now()) store.set('openWaterNeulingBis', String(schutz));   // 48 Std. Anfängerschutz
        for (const k of ['openWaterCombatLog', 'openWaterFogCells', 'openWaterExplored', 'openWaterScoutedIslands', 'openWaterPendingScouts', 'openWaterCarryTroops', 'openWaterBefehlAus']) store.remove(k);
        try { const c = JSON.parse(store.get('openWaterCity')); if (c && typeof c === 'object') { c.wounded = 0; store.set('openWaterCity', JSON.stringify(c)); } } catch (e) {}
        if (fair > 0) {                               // einmalige Ausnahme (Alexander 6.10.): Edelsteine genau 1.000, Holz/Stein/Eisen 0
            if (vorher.res === undefined && store.get('openWaterRes') !== null) vorher.res = store.get('openWaterRes');
            if (store.get('openWaterGems') !== null) vorher.gems = store.get('openWaterGems');
            store.set('openWaterGems', String(SAISON_AUSNAHME_GEMS));
            let r = null; try { r = JSON.parse(store.get('openWaterRes')); } catch (e) {} r = r && typeof r === 'object' ? r : {};
            for (const k of ['h', 's', 'e']) r[k] = 0; store.set('openWaterRes', JSON.stringify(r));
            store.set('openWaterSaisonVorher', JSON.stringify(vorher));
        }
        try { const t = JSON.parse(store.get('openWaterThrone'));   // Thron-Punkte: höchstens 20.000, der Rest 10 : 1 als Edelsteine ins Abholfach
            if (t && t.pts > SAISON_TP_MAX) { const g = Math.floor((t.pts - SAISON_TP_MAX) / SAISON_TP_JE_GEM); t.pts = SAISON_TP_MAX; store.set('openWaterThrone', JSON.stringify(t));
                let L = null; try { L = JSON.parse(store.get('openWaterInbox')); } catch (e) {} if (!Array.isArray(L)) L = [];
                const t0 = Date.now(); if (g > 0) { L.unshift({ src: 'saison', title: 'Thron-Punkte aus Saison ' + mein + ' umgetauscht', gems: g, coins: 0, sh: 0, crate: -1, tr: 0, n: 1, id: t0.toString(36) + 'tp', at: t0 }); store.set('openWaterInbox', JSON.stringify(L)); } } } catch (e) {}
        if (window.WELT) { WELT.befehle.length = 0; WELT.ausgang = []; }   // (welt.js hat die alten Befehle schon gelesen – sie gehören zur alten Welt)
        store.set('openWaterSaisonMein', String(neu)); saisonNeuGeladen = neu;
    }
    for (const k of ['openWaterSaisonNeu', 'openWaterSaisonSchutz', 'openWaterSaisonRoh', 'openWaterSaisonBurg']) if (store.get(k) !== null) store.remove(k);
}
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

/* ===== UI helpers (exactly as specified in design-spec.md section 2.3 / 4) ===== */
function icon(name, cls) { return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
const NF = new Intl.NumberFormat('de-DE');
const NF_C = new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 });
function fmtExact(n) { return NF.format(Math.round(n)); }   // every digit - only where exact counts matter
function fmtNum(n) { return Math.abs(n) >= 1e7 ? fmtCompact(n) : fmtExact(n); }   // from 10 Mio. on short like the HUD ("18,4 Mrd."), never 20 digits
function fmtCompact(n) {
  const a = Math.abs(n);
  if (a < 100000) return fmtExact(n);
  if (a < 1e6) return NF.format(Math.floor(n / 100) / 10) + ' Tsd.';
  if (a < 1e15 * .99995) return NF_C.format(n);
  for (const [v, u] of [[1e24, 'Quadr.'], [1e21, 'Trd.'], [1e18, 'Trill.'], [1e15, 'Brd.']])   // beyond "Bio.": Billiarde, Trillion, Trilliarde … (unit chosen on the rounded value)
    if (a >= v * .99995 || v === 1e15) return (a / v >= 1000 ? NF.format(Math.round(n / v)) : NF.format(Math.round(n / v * 10) / 10)) + ' ' + u;
}
function fmtHud(n) {                      // HUD-Reihe (6 Kapseln auf 390 px): kurz – 950 · 5,4K · 12,6K · 126K · 1,2M · 100Mrd · 10Bio
  const a = Math.abs(n), k = (v, u) => (v < 100 ? NF.format(Math.floor(v * 10) / 10) : NF.format(Math.floor(v))) + u;
  if (a < 1e3) return fmtExact(n);
  for (const [v, u] of [[1e15, 'Brd'], [1e12, 'Bio'], [1e9, 'Mrd'], [1e6, 'M'], [1e3, 'K']]) if (a >= v) return a >= v * 1e4 ? fmtCompact(n) : k(n / v, u);
}
const fmtTile = fmtNum;   // stat tiles: same rule as everywhere
function setBtnLabel(btn, text) { const l = btn.querySelector('.lbl') || btn; if (l.textContent !== text) l.textContent = text; }   // (nur bei einer Änderung: offene Fenster ziehen jede Sekunde nach)
function fmtDHMS(sec) {                           // every longer time the same way: 3 T 4 h 5 m 6 s (units that are 0 at the front are left out)
    sec = Math.max(0, Math.ceil(sec));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s2 = sec % 60;
    return d ? d + ' T ' + h + ' h ' + m + ' m ' + s2 + ' s' : h ? h + ' h ' + m + ' m ' + s2 + ' s' : m ? m + ' m ' + s2 + ' s' : s2 + ' s';
}
function fmtClock(sec) { sec = Math.max(0, Math.ceil(sec)); return sec >= 3600 ? fmtDHMS(sec) : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function marschUhr(sec) { return Math.ceil(sec) > 0 ? fmtClock(sec) : 'wird ausgewertet …'; }   // Marsch am Ziel: der Weltrechner wertet ihn gleich aus (bei Last ein paar Sekunden) – keine stehende 0:00
// ===== LIVE-ANZEIGE (Bausteine): offene Fenster werden jede Sekunde neu gerechnet (liveTick, unten), aber nur das
// geschrieben, was sich wirklich geändert hat – kein Flackern, Knöpfe bleiben antippbar, Scroll-Position und Eingaben bleiben.
// Laufende Uhren (uhrHtml) zählen dabei nicht als Änderung: die stellt liveUhren() jede Sekunde selbst weiter.
const UHR_RE = /(<[a-z]+ [^>]*data-(?:uhr|bclock|boss-clock|throne-fire|throne-pts|ev-bis)\b[^>]*>)[^<]*/g;
function liveHtml(el, h) {                          // → true, wenn neu geschrieben wurde
    if (!el) return false;
    const k = h.replace(UHR_RE, '$1'), meins = el._lh !== undefined && el._lhErst === el.firstChild;   // (hat anderer Code den Inhalt ersetzt, ist das erste Kind ein anderes)
    if (meins && el._lh === k) return false;
    if (meins && el.childNodes.length) {            // nur einzelne Teile anders: genau die tauschen – was gleich blieb (z. B. ein Knopf unter dem Finger), bleibt stehen
        const t = document.createElement('template'); t.innerHTML = h;
        const neu = [...t.content.childNodes], alt = [...el.childNodes];
        if (neu.length === alt.length) {
            for (let i = 0; i < neu.length; i++) if (!alt[i].isEqualNode(neu[i])) el.replaceChild(neu[i], alt[i]);
            el._lh = k; el._lhErst = el.firstChild; return true;
        }
    }
    el.innerHTML = h; el._lh = k; el._lhErst = el.firstChild; return true;
}
function uhrText(bis, art) { const s = (bis - Date.now()) / 1000; return art === 'clock' ? fmtClock(s) : art === 'marsch' ? marschUhr(s) : art === 'vor' ? fmtDHMS(Math.max(1, -s)) : fmtDHMS(s); }
function uhrHtml(bis, art) {                        // eine Restzeit, die von selbst herunterzählt (bis = Zeitpunkt in ms; art 'clock' = 4:05, 'marsch' = 4:05 bis „wird ausgewertet …“, 'vor' = seitdem vergangen, sonst 3 h 4 m 5 s)
    bis = Math.round(bis); return '<span data-uhr="' + bis + '"' + (art ? ' data-uhr-art="' + art + '"' : '') + '>' + uhrText(bis, art) + '</span>';
}
function liveUhren(root) {                          // → true, wenn eine Uhr gerade abgelaufen ist (dann muss das Fenster gleich umstellen)
    let ab = false; const now = Date.now();
    for (const el of (root || document).querySelectorAll('[data-uhr]')) { const bis = +el.dataset.uhr, t = uhrText(bis, el.dataset.uhrArt);
        if (el.textContent !== t) el.textContent = t;
        if (bis <= now && !el._ab && el.dataset.uhrArt !== 'vor') { el._ab = true; ab = true; } }
    for (const el of (root || document).querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));   // die Uhren der Events
    return ab;
}
function statTile(label, iconName, valueHtml, cls) {
  return '<div class="stat"><span class="stat-l">' + icon(iconName) + label + '</span><b class="stat-v' + (cls ? ' ' + cls : '') + '">' + valueHtml + '</b></div>';
}
const UNK = '<span class="unk">' + icon('scout') + 'Erst spähen</span>';
const logBadge = (kind, text) => '<span class="lbadge lbadge--' + kind + '">' + text + '</span>';
function logBalance(atk, def, atkLabel, defLabel, youDefend) {          // who was stronger, as a bar (like the attack preview) - your side is always green
    const a = Math.max(0, atk || 0), d = Math.max(0, def || 0), pct = a + d > 0 ? Math.round(a / (a + d) * 100) : 50;
    return '<div class="logBal' + (youDefend ? ' logBal--def' : '') + '"><div class="logBalBar" style="--a:' + pct + '%"><i></i></div><div class="logBalTxt"><span>' + atkLabel + '</span><span>' + defLabel + '</span></div></div>';
}
const fmtBig = fmtNum;   // huge sums read as "227,1 Trill.", not as 21 digits
// Verstärkung (Botschaft) im Kampfbericht: wer mit wie vielen Truppen verteidigt hat – und was jeder verloren hat
function verstZeilen(e, besitzer, gearHtml) {   // (gearHtml: kommt aus renderCombatLog)
    if (!e || !Array.isArray(e.verst) || !e.verst.length) return '';
    const n = x => fmtNum(Math.max(0, x || 0));
    return '<div class="logLine"><span>' + escapeHtml(besitzer) + '</span><span>' + n(e.eigen) + '</span></div>' +
        e.verst.map(h => '<div class="logLine buff"><span>Verstärkung · ' + escapeHtml(h.name || '?') + '</span><span>' + n(h.n) + '</span></div>' +
            ((h.fallen || h.wounded) ? '<div class="logCasualty"><span>· davon gefallen' + (h.wounded ? ' / verwundet' : '') + '</span><span>−' + n(h.fallen) + (h.wounded ? ' / ' + n(h.wounded) : '') + '</span></div>' : '') +
            (h.gear && gearHtml ? '<details class="verst-det"><summary>' + escapeHtml(h.name || '?') + ': Held, Ausrüstung, Fähigkeiten</summary>' + gearHtml(h.gear) + '</details>' : '')).join('');
}
// Gemeinsamer Angriff im Kampfbericht: jeder Angreifer mit seinen Truppen – und was er verloren hat
function angreiferZeilen(e, gearHtml) {
    if (!e || !Array.isArray(e.angreifer) || e.angreifer.length < 2) return '';
    const n = x => fmtNum(Math.max(0, x || 0));
    return e.angreifer.map(h => '<div class="logLine buff"><span>' + escapeHtml(h.name || '?') + '</span><span>' + n(h.n) + '</span></div>' +
        ((h.fallen || h.wounded) ? '<div class="logCasualty"><span>· davon gefallen' + (h.wounded ? ' / verwundet' : '') + '</span><span>−' + n(h.fallen) + (h.wounded ? ' / ' + n(h.wounded) : '') + '</span></div>' : '') +
        (h.gear && gearHtml ? '<details class="verst-det"><summary>' + escapeHtml(h.name || '?') + ': Held, Ausrüstung, Fähigkeiten</summary>' + gearHtml(h.gear) + '</details>' : '')).join('');
}
// Kampfbericht: jede Karte gleich – Titel, bei Kämpfen der Kräfte-Balken, dann kleine Zahlen-Kästchen (Verluste, Beute), dann „Kampfdetails“
const chipN = v => { v = Math.max(0, Math.round(v || 0)); return v >= 1e6 ? fmtCompact(v) : fmtNum(v); };
function logChips(list) {                          // [[Symbol, Text, gut|schlecht|warn], …] – leere fallen weg
    const l = (list || []).filter(c => c && c[1]);
    return l.length ? '<div class="lchips">' + l.map(([ic, t, k]) => '<span class="lchip' + (k ? ' lchip--' + k : '') + '">' + icon(ic) + '<span>' + t + '</span></span>').join('') + '</div>' : '';
}
const verlustChips = (gefallen, verwundet) => [gefallen > 0 && ['losses', '−' + chipN(gefallen) + ' gefallen', 'schlecht'], verwundet > 0 && ['plus', chipN(verwundet) + ' verwundet', 'warn']];
function beuteChips(e, mine) {                      // oben auf der Karte nur „Hauptstadt brennt“ – Gold, Holz, Stein, Eisen stehen unten in jedem Fenster (Alexander 4.10.)
    return [e.capitalHolds && ['castle', mine ? 'Hauptstadt brennt' : 'Deine Hauptstadt brennt', mine ? 'gut' : 'schlecht']];
}
function logRowHtml(kind, iconName, title, meta, trailing, extra) {
  return '<div class="logRow ' + kind + '"><span class="li">' + icon(iconName) + '</span><span class="lt"><b>' + title + '</b>' +
    (meta ? '<small>' + meta + '</small>' : '') + '</span><span class="lv">' + (trailing || '') + '</span>' + (extra || '') + '</div>';
}

const GLYPH_CACHE = {};
function glyph(name) {                     // parse the sprite symbol once
  if (GLYPH_CACHE[name]) return GLYPH_CACHE[name];
  const sym = document.getElementById('i-' + name);
  if (!sym) return null;
  const baseW = +(sym.querySelector('g').getAttribute('stroke-width') || 1.5);
  return GLYPH_CACHE[name] = [...sym.querySelectorAll('path')].map(p => ({
    path: new Path2D(p.getAttribute('d')),
    fill: p.getAttribute('fill'),                 // null | 'currentColor' | '#000'
    stroke: p.getAttribute('stroke'),             // null (= currentColor) | 'none' | '#fff'
    w: +(p.getAttribute('stroke-width') || baseW),
    o: p.hasAttribute('opacity') ? +p.getAttribute('opacity') : 1
  }));
}
// Karten-Symbole als KI-Bild (Alexander 7.10., dieselben wie in den Fenstern, 05z): gibt es ein Bild, malt drawGlyph es statt der Linien
// (Wappen-Zeichen bleiben Linien: vektor = true). Lädt beim ersten Mal, dann neu zeichnen.
const GLYPH_BILD = { coin: 'res_muenzen', gem: 'res_edelstein', troops: 'res_truppen', wood: 'res_holz', stone: 'res_stein', iron: 'res_eisen',
  scout: 'sym_spaeher', attack: 'sym_schwert', hourglass: 'sym_zeit', lock: 'sym_schloss', star: 'sym_stern', losses: 'sym_verluste',
  defense: 'sym_turm', tower: 'sym_turm', flag: 'k_fahne', crown: 'k_krone', castle: 'sym_burg', shield: 'sym_friedensschild', weapon: 'sym_waffe', recall: 'sym_rueckzug',
  beute: 'k_beute', rund: 'rund', drache: 'karte_drache',
  send: 'sym_senden', temple: 'sym_tempelbonus', market: 'sym_markt', sell: 'sym_handeln' };   // (nur Bild: Fund-Beutel, runder Knopf-Grund)
const GLYPH_IMG = {};
function glyphBild(name) {
  const n = GLYPH_BILD[name]; if (!n || typeof Image === 'undefined') return null;
  let im = GLYPH_IMG[n]; if (!im) { im = GLYPH_IMG[n] = new Image(); im.onload = () => requestRender(); im.src = 'bilder/ui_' + n + '.webp'; }
  return im.complete && im.naturalWidth ? im : null;
}
function drawGlyph(g, name, cx, cy, size, color, vektor) {
  const im = !vektor && glyphBild(name);
  if (im) { const k = size * 1.2 / Math.max(im.naturalWidth, im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; g.drawImage(im, cx - w / 2, cy - h / 2, w, h); return; }
  const L = glyph(name); if (!L) return;
  const k = size / 24;
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(k, k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of L) {
    g.globalAlpha = l.o;
    if (l.fill && l.fill !== 'none') { g.fillStyle = l.fill === 'currentColor' ? color : l.fill; g.fill(l.path); }
    if (l.stroke !== 'none') { g.strokeStyle = (!l.stroke || l.stroke === 'currentColor') ? color : l.stroke;
      g.lineWidth = Math.max(l.w, 1.1 / k); g.stroke(l.path); }   // never thinner than about 1.1 device px
  }
  g.restore();
}

const MQ_DESKTOP = matchMedia('(min-width:900px) and (min-height:501px)');
const MQ_LANDSCAPE = matchMedia('(max-height:500px) and (orientation:landscape)');
function uiLayout() { return MQ_DESKTOP.matches ? 'desktop' : MQ_LANDSCAPE.matches ? 'landscape' : 'phone'; }

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Backing store at min(devicePixelRatio, 2); sizeBackingStore() (camera block, hoisted) sizes it
// and writes viewW/viewH. The resize listener (onViewportResize) is registered in the camera block.
let dpr = Math.min(window.devicePixelRatio || 1, 2);
sizeBackingStore();

// Map state - zoom eases toward targetZoom; zoomAnchor keeps the point
// under the cursor/fingers fixed on screen while that easing plays out.
let mapState = {
    offsetX: window.innerWidth / 2,
    offsetY: window.innerHeight / 2,
    zoom: 0.03,
    targetZoom: 0.03,
    isDragging: false,
    velocityX: 0,
    velocityY: 0
};
let zoomAnchor = null; // { screenX, screenY, worldX, worldY }

// Every base shows its nameplate down to this zoom; below it only the
// buildings / LOD markers and the territory remain (drawBanners). Also
// bounds minZoom (updateZoomBounds).
const TERRITORY_VIEW_ZOOM = 0.018;

