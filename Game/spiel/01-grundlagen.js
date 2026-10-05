// ===== Teil 01-grundlagen.js: Grundlagen: Konstanten, Inseln und Karte, Truppen, Werte, Helden-Daten, Herrscher der Meere =====
// Rechnet dieses Spiel gerade die Welt (Weltrechner)? Ohne welt.js: immer.
function rechnet() { return !window.WELT || WELT.leiter; }
// Läuft hier der Weltrechner auf dem Server (weltrechner/start.js)? Dann: kein eigener Spieler, keine Basis, nichts zeichnen.
const SYSTEM = !!(window.__OW && window.__OW.system);
// Zuschauer: Befehl an den Weltrechner (gibt true zurück, wenn er geschickt wurde – dann nur noch das Private hier tun)
function alsBefehl(art, daten) { if (rechnet()) return false; WELT.befehl(art, daten); return true; }
const neutralId = id => (id === 'player' && window.WELT) ? WELT.ich : id;     // 'player' → u<meine id> (für Befehle/Nachrichten)
const lokalId = id => (window.WELT && id === WELT.ich) ? 'player' : id;
// Bündnisse (buendnis.js, wird nach spiel.js geladen): sind a und b im selben Bündnis? – Mitglieder greifen sich nicht an
function bundFreund(a, b) { return typeof bundVerbuendet === 'function' && bundVerbuendet(a, b); }
// Truppen, die dir geschenkt werden (Stufe, Thron-Shop, Krankenhaus, Funde, Admin): beim Zuschauer macht es der Weltrechner.
// q = woher (stufe/thron/heil/fund/geschenk) – der Weltrechner prüft danach, wie viele es höchstens sein dürfen (Schummel-Schutz).
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
const fmtTile = fmtNum;   // stat tiles: same rule as everywhere
function setBtnLabel(btn, text) { const l = btn.querySelector('.lbl') || btn; if (l.textContent !== text) l.textContent = text; }   // (nur bei einer Änderung: offene Fenster ziehen jede Sekunde nach)
function fmtDHMS(sec) {                           // every longer time the same way: 3 T 4 h 5 m 6 s (units that are 0 at the front are left out)
    sec = Math.max(0, Math.ceil(sec));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s2 = sec % 60;
    return d ? d + ' T ' + h + ' h ' + m + ' m ' + s2 + ' s' : h ? h + ' h ' + m + ' m ' + s2 + ' s' : m ? m + ' m ' + s2 + ' s' : s2 + ' s';
}
function fmtClock(sec) { sec = Math.max(0, Math.ceil(sec)); return sec >= 3600 ? fmtDHMS(sec) : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
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
function uhrText(bis, art) { const s = (bis - Date.now()) / 1000; return art === 'clock' ? fmtClock(s) : art === 'vor' ? fmtDHMS(Math.max(1, -s)) : fmtDHMS(s); }
function uhrHtml(bis, art) {                        // eine Restzeit, die von selbst herunterzählt (bis = Zeitpunkt in ms; art 'clock' = 4:05, 'vor' = seitdem vergangen, sonst 3 h 4 m 5 s)
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
function drawGlyph(g, name, cx, cy, size, color) {
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

// Layout: a honeycomb - the important central landmass (the hub) at
// the middle of a hex grid, with rings of same-size landmasses
// radiating outward around it (like Million Lord: lots of islands
// packed tightly edge to edge). Every hex-ADJACENT pair of
// landmasses gets its own short "mini bridge", not just hub-to-
// outer - so expanding means hopping from island to island outward
// through whichever neighbors you've bridged/captured, not
// attacking anything anywhere. Spacing found via a search against
// the actual coastline generator for the tightest hex packing with
// zero overlap.
const GRID_N = 17;         // square world: 17 × 17 regions (Paket C, vorher 15 × 15 – Messwerte in LIESMICH 23), the Thron-Insel in the middle, the 8 regions around it form the ring
const HEX_SPACING = 56120; // distance between orthogonally adjacent cell centres (tightest packing with zero overlap)
const GRID_HALF = (GRID_N - 1) / 2;
const RIVER_HALF = 1500;   // one big square continent: its regions are split by narrow rivers (half width)
const FRAME_HALF = (GRID_HALF + .5) * HEX_SPACING + 9000;   // the square map border (world units from the centre)
// Bases are scattered freely across a landmass (rejection-sampled,
// not a rigid grid) - only constraint is a minimum distance from
// every other base and the temple, so nothing ends up crowded.
// Neutral strength of the inner islands (the outer ring keeps the small starter values):
// the Thron-Insel is late-game, the Wächter-Inseln mid-game.
const TIER_STATS = {
    throne:   { troops: [5e6, 2e7],   def: [1e6, 4e6],   level: 40, temple: [2.5e8, 6e7], templeLevel: 60 },
    guardian: { troops: [1e5, 1e6],   def: [2e4, 2e5],   level: 20, temple: [5e6, 1e6],   templeLevel: 30 }
};
const RING_MULT = { 2: 300, 3: 60, 4: 20, 5: 8, 6: 2, 7: 1 };   // neutral strength of outer regions: the edge is easy, near the middle hard
function ringMult(lm) { return lm.tier === 'outer' ? (RING_MULT[lm.ring] || 1) : 1; }
function niceRoundW(n) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / p) * p; }
const ISLAND_RADIUS = 650; // tower footprint - bigger again, still well under the guaranteed minimum spacing between towers
const NEUTRAL_DEFENSE_MAX = 100;
const NEUTRAL_DEFENSE_MIN = 20;
const NEUTRAL_TROOPS_MAX = 100;
const NEUTRAL_TROOPS_MIN = 0;
// Temples: one per landmass except the center, which gets the
// stronger Mega-Tempel instead. Harder to hold than a regular tower,
// and reward Gold/Truppen/Gems on top of the normal per-level
// production for as long as the player keeps holding them.
const TEMPLE_DEFENSE_MIN = 220;
const TEMPLE_DEFENSE_MAX = 380;
const TEMPLE_TROOPS_MIN = 150;
const TEMPLE_TROOPS_MAX = 260;
const MEGA_TEMPLE_MULT = 8;        // Mega-Tempel (centre): 8x a normal temple's bonus
const GUARDIAN_TEMPLE_MULT = 3;    // Wächter-Tempel (the 4 guardian islands): 3x
function templeBaseMult(isl) { return isl.type === 'megaTemple' ? MEGA_TEMPLE_MULT : isl.guardian ? GUARDIAN_TEMPLE_MULT : 1; }
const TEMPLE_GEMS_PER_TICK = 0.0015;   // ~5 Gems an hour (up to ~24 held with a full Tempelschrein): a few hundred a day, not tens of thousands
const TEMPLE_COIN_BONUS_PER_TICK = 15;
const TEMPLE_TROOP_BONUS_PER_TICK = 6;
const TEMPLE_HOLD_STREAK_MS = 30 * 60 * 1000; // 30min to reach the max hold bonus
const TEMPLE_HOLD_STREAK_MAX_MULT = 2; // holding it long enough doubles its output

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(1337);

// Ray-casting point-in-polygon test, used to keep towers from being
// placed off the edge of a landmass's organic (non-square) coastline.
// Liegt (x, y) auf dem Land? Reine Rechnung (die geglättete Küste in feine Stücke zerlegt) – gibt in jedem Browser und
// auf dem Server genau dasselbe Ergebnis (früher über die Zeichenfläche: je nach Browser minimal anders, auf dem Server gar nicht).
function aufLand(lm, x, y) {
    if (!lm.feinKueste) { const P = lm.shape, n = P.length, out = [], mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        let m0 = mid(P[n - 1], P[0]);
        for (let i = 0; i < n; i++) { const c = P[i], m1 = mid(P[i], P[(i + 1) % n]);
            for (let k = 0; k < 12; k++) { const t = k / 12, u = 1 - t; out.push({ x: u * u * m0.x + 2 * u * t * c.x + t * t * m1.x, y: u * u * m0.y + 2 * u * t * c.y + t * t * m1.y }); }
            m0 = m1; }
        lm.feinKueste = out; }
    return pointInPolygon(x, y, lm.feinKueste);
}
function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersects = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

// The point on a landmass's coastline that faces exactly toward
// some other point, i.e. where the straight line between the two
// landmass centers crosses the coastline - not just "whichever
// shape point happens to be closest", which could sit off to the
// side and make the bridge cut across at a crooked angle. Works
// directly off generateRegionShape()'s own parametrization: its
// points are sampled at uniformly increasing angles around the
// landmass's center, so the point at any bearing is a straight
// interpolation between the two samples that bracket it.
function polygonPointAtAngle(lm, angle) {
    const n = lm.shape.length;
    const step = (Math.PI * 2) / n;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = norm / step;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const t = idx - Math.floor(idx);
    const p0 = lm.shape[i0], p1 = lm.shape[i1];
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

// Game balance - exponential, so a base keeps mattering from the first
// hundred troops up to the trillions (level 100 ≈ 0,9 Bio. defence).
// Costs grow a bit faster than income, so every level takes longer.
const MAX_BASE_LEVEL = 100;
const BASE_DEFENSE = 100, DEFENSE_GROWTH = 1.26;
const BASE_COINS = 10, BASE_TROOPS = 5, PRODUCTION_GROWTH = 1.15;
const UPGRADE_BASE_COST = 120, UPGRADE_COST_GROWTH = 1.27;

// The level-based defense every base gets, with no equipment/
// skill bonus - used for bot- and (in a future PvP defense) other-
// player-owned bases, which don't have the human player's gear.
function baseDefenseForLevel(level) {
    return Math.round(BASE_DEFENSE * Math.pow(DEFENSE_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1));
}
function defenseForLevel(level) {
    return Math.round(baseDefenseForLevel(level) * (1 + armorDefensePct() / 100));
}
function coinsPerTick(level) {
    return Math.round(BASE_COINS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1));
}
function troopsPerTick(level) {
    return Math.round(BASE_TROOPS * Math.pow(PRODUCTION_GROWTH, Math.min(level, MAX_BASE_LEVEL) - 1));
}
function upgradeCostRoh(level) { return Math.round(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, level - 1)); }   // ohne Rabatt
function upgradeCost(level) {                    // Wochen-Event „Bauherr“: 20 % günstiger
    let r = 1; try { if (evThemaAktiv('bau')) r = .8; } catch (e) {}
    return Math.round(upgradeCostRoh(level) * r);
}

// The big islands themselves - just background land, drawn as one
// organic coastline each, no ownership state of their own. Landmass
// 0 is always the centre (Thron-Insel); the others sit on a square
// 9 × 9 grid around it.
// A region of the continent: a square cell whose edges follow the river centre lines between the cells
// (shared by both neighbours, so the banks match) - sampled at uniform angles,
// so polygonPointAtAngle works on it. The continent's outer edge is a gently wavy coast.
function riverOffset(vertical, line, t) {       // meander of the river line `line` (between cells) at position t along it
    const k = line * 2.37 + (vertical ? 0 : 11.3);
    return 1400 * Math.sin(t / 6100 + k) + 700 * Math.sin(t / 2300 + k * 1.9) + 300 * Math.sin(t / 900 + k * 3.7);
}
function generateRegionShape(q, r) {
    const S = HEX_SPACING, cx = q * S, cy = r * S, N = 120, out = [];
    const edge = (side, t) => {                  // world coordinate of one bank at position t along it
        const vertical = side === 0 || side === 2, line = side === 0 ? q + .5 : side === 2 ? q - .5 : side === 1 ? r + .5 : r - .5;
        const outer = Math.abs(line) > GRID_HALF, base = line * S + riverOffset(vertical, line, t) * (outer ? 1.6 : 1);
        const sign = side === 0 || side === 1 ? -1 : 1;             // right / bottom bank sits left / above the river line
        return base + sign * (outer ? 0 : RIVER_HALF);
    };
    for (let i = 0; i < N; i++) {
        const th = i / N * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
        let best = Infinity;
        for (let side = 0; side < 4; side++) {
            const vertical = side === 0 || side === 2, d = vertical ? dx : dy;
            if ((side === 0 || side === 1) ? d <= 1e-6 : d >= -1e-6) continue;
            let tt = S * .5;
            for (let it = 0; it < 4; it++) {                         // the bank moves with t: a few fixed-point steps
                const along = vertical ? cy + dy * tt : cx + dx * tt;
                tt = ((edge(side, along)) - (vertical ? cx : cy)) / d;
            }
            if (tt > 0) best = Math.min(best, tt);
        }
        out.push({ x: cx + dx * best, y: cy + dy * best });
    }
    return out;
}

// Landscape: snow in the north, grassland in the middle band, desert in the south (the border steps a little per column);
// the ring around the middle is stone, the regions right next to it stay green.
// Paket C: dazu Eis ganz im Norden (oberste Reihe), zwei Vulkan-Gebiete nahe der Mitte (west und ost, je 5 Regionen)
// und Sumpf in den Flussniederungen des grünen Mittelstreifens (außen, verstreut). Reine Optik – keine Spielwirkung.
const VULKANE = [[-4, 0], [4, 1]];
function regionBiome(q, r) {
    const ring = Math.max(Math.abs(q), Math.abs(r)); if (ring <= 2) return 'green';
    if (ring <= 5 && VULKANE.some(([vq, vr]) => Math.abs(q - vq) + Math.abs(r - vr) <= 1)) return 'volcano';
    const h = Math.sin(q * 12.9898 + 78.233) * 43758.5453, wob = Math.round((h - Math.floor(h)) * 2 - 1), y = r + wob * .6;
    if (y <= -GRID_HALF + .6) return 'ice';
    if (y <= -2.6) return 'snow';
    if (y >= 2.6) return 'sand';
    const n = Math.sin(q * 39.346 + r * 11.135 + 4.17) * 24634.6345, nass = n - Math.floor(n);   // feuchte Niederung?
    return ring >= 4 && Math.abs(y) < 2 && nass > .6 ? 'swamp' : 'green';
}
// Temples: the Mega-Tempel in the middle, a Wächter-Tempel in each of the 4 corners of the ring, and 24 normal temples on two
// clean squares around the middle (ring 3: corners + side middles, ring 5: corners, side middles and two more per side).
function regionHasTemple(lm) {
    if (lm.isCenter || lm.corner) return true;
    const aq = Math.abs(lm.q), ar = Math.abs(lm.r);
    return (lm.ring === 3 && ((aq === 3 && ar === 3) || lm.q === 0 || lm.r === 0)) || (lm.ring === 5 && ((aq === 5 && ar === 5) || lm.q === 0 || lm.r === 0 || aq === 3 || ar === 3));
}
const landmasses = [];
{
    let lmId = 0;
    // World layout (square map): the Thron-Insel (Mega-Tempel) in the middle cell, the 4 Wächter-Inseln
    // north / east / south / west of it, every other cell an outer island where the player and bots start.
    const cells = [];
    for (let r = -GRID_HALF; r <= GRID_HALF; r++) for (let q = -GRID_HALF; q <= GRID_HALF; q++) cells.push({ q, r, d: Math.max(Math.abs(q), Math.abs(r)) });
    cells.sort((u, v) => u.d - v.d || u.r - v.r || u.q - v.q);                      // landmass 0 = the centre, then the guardians
    for (const cell of cells) {
        const isC = cell.d === 0, tier = isC ? 'throne' : cell.d === 1 ? 'guardian' : 'outer';
        const radius = HEX_SPACING * .4;                                             // (tower spacing scales with it)
        const x = cell.q * HEX_SPACING, y = cell.r * HEX_SPACING;
        const shape = generateRegionShape(cell.q, cell.r);
        let shapeMaxR = 0;
        for (const p of shape) shapeMaxR = Math.max(shapeMaxR, Math.hypot(p.x - x, p.y - y));
        const corner = cell.d === 1 && Math.abs(cell.q) === 1 && Math.abs(cell.r) === 1;
        landmasses.push({ id: lmId, q: cell.q, r: cell.r, ring: cell.d, x, y, radius, shape, shapeMaxR, isCenter: isC, tier, corner, bio: regionBiome(cell.q, cell.r) });
        lmId++;
    }
}

// Bridges: the ONLY way to cross from one landmass to a different
// one - every hex-ADJACENT pair of landmasses gets its own short
// bridge (not just hub-to-outer), so the honeycomb is a proper mesh
// you expand outward through island by island. Anchored exactly on
// the straight line between the two landmass centers (see
// polygonPointAtAngle), so the bridge always crosses the water
// directly instead of angling off toward whatever shape point
// happened to be closest. Some coastline pairs land almost flush
// against each other (a near-zero gap) - stretched out to a
// minimum visible length here so the bridge always reads as a
// short straight line instead of collapsing into a round blob
// where its two line-cap ends overlap.
const MIN_BRIDGE_VISUAL_LENGTH = 700;
const bridges = [];
for (let i = 0; i < landmasses.length; i++) {
    for (let j = i + 1; j < landmasses.length; j++) {
        const a = landmasses[i], b = landmasses[j];
        const dq = a.q - b.q, dr = a.r - b.r;
        const isAdjacent = Math.abs(dq) + Math.abs(dr) === 1;                          // north / south / east / west neighbours
        if (!isAdjacent) continue;
        const angleAtoB = Math.atan2(b.y - a.y, b.x - a.x);
        let p1 = polygonPointAtAngle(a, angleAtoB);
        let p2 = polygonPointAtAngle(b, angleAtoB + Math.PI);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < MIN_BRIDGE_VISUAL_LENGTH) {
            const ux = dx / dist, uy = dy / dist;
            const extra = (MIN_BRIDGE_VISUAL_LENGTH - dist) / 2;
            p1 = { x: p1.x - ux * extra, y: p1.y - uy * extra };
            p2 = { x: p2.x + ux * extra, y: p2.y + uy * extra };
        }
        bridges.push({ a: a.id, b: b.id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
}
function bridgeBetween(a, b) {
    return bridges.find(br => (br.a === a && br.b === b) || (br.a === b && br.b === a)) || null;
}
// Passes (wie in großen Strategiespielen): the bridges into the Wächter-Inseln open on day 2 of a world,
// the bridges into the Thron-Insel on day 4. Until then they are chained shut for everyone.
const PASS_OPEN_DAYS = { guardian: 0, throne: 0 };        // Pass-Timer aus (Alexander 4.10.: „Tor-Pass-Timer kommt auch raus“) – zum Wieder-Anmachen: Tage ab Welt-Start, z. B. { guardian: .25, throne: 1 }
function worldStartAt() {
    let t = parseInt(store.get('openWaterWorldStart'), 10);
    if (!t) { t = Date.now(); store.set('openWaterWorldStart', String(t)); }
    return t;
}
function passOpensAt(br) {
    const ta = landmasses[br.a].tier, tb = landmasses[br.b].tier;
    const inner = ta === 'throne' || tb === 'throne' ? 'throne' : ta === 'guardian' || tb === 'guardian' ? 'guardian' : null;
    return inner ? worldStartAt() + PASS_OPEN_DAYS[inner] * 86400000 : 0;
}
function landmassesConnected(a, b) {
    if (a === b) return true;
    const br = bridgeBetween(a, b);
    return !!br && Date.now() >= passOpensAt(br);
}
// Long marches: troops may cross any number of regions as long as every gate on the way belongs to them;
// only the last crossing (into the target's region) may be someone else's gate (toll / shut as usual).
// → the chain of landmass ids from a to b, or null. BFS over the regions, cheap enough per call.
function routeFor(a, b, payer) {
    if (a === b) return [a];
    if (landmassesConnected(a, b)) return [a, b];
    const prev = { [a]: -1 }, queue = [a];
    while (queue.length) {
        const cur = queue.shift();
        for (const nb of reachableLandmassIds[cur] || []) {
            if (nb === cur || prev[nb] !== undefined || !landmassesConnected(cur, nb)) continue;
            const gate = gateOnRoute(cur, nb), free = !gate || islandOwnerOf(gate.id) === payer || bundFreund(islandOwnerOf(gate.id), payer);   // (Tore des eigenen Bündnisses sind frei)
            if (nb === b) { const out = [b]; for (let x = cur; x !== -1; x = prev[x]) out.unshift(x); return out; }
            if (!free) continue;                    // a foreign gate ends the march there
            prev[nb] = cur; queue.push(nb);
        }
    }
    return null;
}
function canReach(a, b, payer) { return !!routeFor(a, b, payer || 'player'); }
// Kommt ein Späher von a nach b? Ein geschlossenes fremdes Tor lässt ihn nicht durch (offene Tore schon).
// false nur, wenn genau ein geschlossenes Tor den Weg versperrt – sonst wie bisher.
function spaeherWeg(a, b, who) {
    if (a === b) return true;
    const suche = streng => { const seen = new Set([a]), q = [a];
        while (q.length) { const cur = q.shift();
            for (const nb of reachableLandmassIds[cur] || []) { if (seen.has(nb) || !landmassesConnected(cur, nb)) continue;
                if (streng) { const g = gateOnRoute(cur, nb); if (g && islandOwnerOf(g.id) !== who && !bundFreund(islandOwnerOf(g.id), who) && gateSettings(g).closed) continue; }
                if (nb === b) return true; seen.add(nb); q.push(nb); } }
        return false; };
    return suche(true) || !suche(false);
}
function lastHop(a, b, payer) { const r = routeFor(a, b, payer); return r && r.length > 1 ? [r[r.length - 2], r[r.length - 1]] : [a, b]; }
function gateOnRoute(fromLm, toLm) {            // the gate base guarding the bridge between two regions (or null)
    if (fromLm === toLm) return null;
    const br = bridgeBetween(fromLm, toLm);
    return br && br.gateId !== undefined ? islandById[br.gateId] : null;
}
// Gate owners set the toll per troop (0 = free passage) and can shut the gate: then nobody else gets across.
var gateCfg = null;
function loadGateCfg() { if (!gateCfg) { try { gateCfg = JSON.parse(store.get('openWaterGateCfg')) || {}; } catch (e) { gateCfg = {}; } } return gateCfg; }
function gateSettings(gate) { return Object.assign({ toll: gate.toll, closed: false }, loadGateCfg()[gate.id] || {}); }
function setGateSettings(gateId, patch) { const c = loadGateCfg(); c[gateId] = Object.assign(gateSettings(islandById[gateId]), patch); store.set('openWaterGateCfg', JSON.stringify(c)); }
const GATE_TOLLS = [0, 0.1, 0.25, 0.5, 1, 2], TOLL_MAX = 1e6;   // per troop, but never more than 1 Mio. per march
function tollFor(fromLm, toLm, troops, payer, targetId, cut) {  // → { gate, cost, closed } (free for the gate's owner - and for an attack ON the gate itself); cut = a hero's −% Maut
    const gate = gateOnRoute(fromLm, toLm);
    if (!gate || islandOwnerOf(gate.id) === payer || gate.id === targetId || bundFreund(islandOwnerOf(gate.id), payer)) return { gate, cost: 0 };   // Bündnis: Tore der Mitglieder sind für alle Mitglieder frei und offen
    const cfg = gateSettings(gate);
    if (!islandOwnerOf(gate.id) || cfg.closed) return { gate, cost: Infinity, closed: true };   // unowned gates are shut
    return { gate, cost: cfg.toll > 0 ? Math.round(Math.max(100, Math.min(TOLL_MAX, Math.round(Math.max(0, troops) * cfg.toll))) * (1 - Math.min(90, cut || 0) / 100)) : 0 };   // (ganze Münzen – auch mit Helden-Rabatt)
}
function payToll(fromLm, toLm, troops, payer, targetId, cut) { // payer: 'player' | bot id → false when it can't pay
    const { gate, cost, closed } = tollFor(fromLm, toLm, troops, payer, targetId, cut);
    if (!cost) return true;
    if (closed) { if (payer === 'player') { const ow = islandOwnerOf(gate.id);
        flashHint(ow ? 'Das Tor ist geschlossen – ' + botById[ow].name + ' lässt niemanden durch. Erobere das Tor.' : 'Das Tor ist unbesetzt und verschlossen – erobere es zuerst, dann kommst du durch.', 4000); } return false; }
    const have = payer === 'player' ? coins : (botCoins[payer] || 0);
    if (have < cost) { if (payer === 'player') flashHint('Maut am Tor: ' + fmtNum(cost) + ' Münzen – du hast zu wenig. Erobere das Tor, dann ist es kostenlos.', 4000); return false; }
    if (payer === 'player') coins -= cost; else botCoins[payer] -= cost;
    const owner = islandOwnerOf(gate.id);
    if (owner === 'player') { coins += cost; flashHint(botById[payer].name + ' zahlt ' + fmtNum(cost) + ' Münzen Maut an deinem Tor.', 3500); }
    else if (owner) botCoins[owner] = (botCoins[owner] || 0) + cost;
    if (payer === 'player') flashHint('Maut bezahlt: ' + fmtNum(cost) + ' Münzen' + (owner ? ' an ' + botById[owner].name : '') + '.', 3500);
    goalBump(payer, 'tolls'); goalBump(owner, 'tollCoins', cost);
    return true;
}
// (Zuschauer) vor dem Befehl prüfen, ob das Tor offen ist und die Maut reicht – bezahlt wird beim Weltrechner
function mautVorab(fromLm, toLm, troops, targetId, cut) {
    const { gate, cost, closed } = tollFor(fromLm, toLm, troops, 'player', targetId, cut);
    if (!cost) return true;
    if (closed) { const ow = islandOwnerOf(gate.id); flashHint(ow ? 'Das Tor ist geschlossen – ' + botById[ow].name + ' lässt niemanden durch. Erobere das Tor.' : 'Das Tor ist unbesetzt und verschlossen – erobere es zuerst, dann kommst du durch.', 4000); return false; }
    if (coins < cost) { flashHint('Maut am Tor: ' + fmtNum(cost) + ' Münzen – du hast zu wenig. Erobere das Tor, dann ist es kostenlos.', 4000); return false; }
    return true;
}
function fmtPassWait(ms) {
    return fmtDHMS(ms / 1000);
}
function noRouteHint(a, b) {
    const br = bridgeBetween(a, b);
    return br ? 'Der Pass ist noch verschlossen – er öffnet in ' + fmtPassWait(passOpensAt(br) - Date.now())
              : 'Keine Brücke zwischen diesen Inseln – erobere eine verbundene Basis, um näher heranzukommen.';
}

// Every landmass is covered in a grid of towers - the tower, not the
// island, is the capturable unit with its own troops/level/defense.
// The exact center slot of the grid is reserved for that landmass's
// temple instead of a regular tower (a Mega-Tempel on the hub, a
// plain Tempel on every outer landmass).
const islands = [];
let playerIslandId = null;

let id = 0;
// Tore first (the bases keep clear of them): a capturable gate on the outer bank of every bridge.
// Whoever owns a gate crosses its bridge for free and collects the toll everyone else pays. Unowned gates are shut.
const GATE_STATS = { guardian: { troops: 2e6, def: 5e5, level: 25, toll: 0.25 }, throne: { troops: 5e7, def: 1e7, level: 45, toll: 0.5 } };
const BORDER_GATE = { 4: { troops: 1500, def: 400, level: 3 }, 3: { troops: 12000, def: 3000, level: 8 }, 2: { troops: 1e5, def: 25000, level: 14 }, 1: { troops: 4e5, def: 1e5, level: 18 } };
const gateSpots = bridges.map(br => {
    const A = landmasses[br.a], B = landmasses[br.b], ta = A.tier, tb = B.tier;
    const kind = ta === 'throne' || tb === 'throne' ? 'throne' : ta === 'guardian' || tb === 'guardian' ? 'guardian' : 'border';
    const outerA = A.ring > B.ring || (A.ring === B.ring && A.id > B.id);                   // the gate stands on the side farther from the middle
    const ex = outerA ? br.x1 : br.x2, ey = outerA ? br.y1 : br.y2, ox = outerA ? br.x2 : br.x1, oy = outerA ? br.y2 : br.y1;
    const bl = Math.hypot(ox - ex, oy - ey) || 1, key = Math.max(1, Math.min(4, Math.ceil((Math.min(A.ring, B.ring) - 1) / 1.5)));
    const st = kind === 'border' ? Object.assign({ toll: 0.1 }, BORDER_GATE[key]) : GATE_STATS[kind];
    return { br, kind, st, lm: outerA ? br.a : br.b, x: ex - (ox - ex) / bl * 900, y: ey - (oy - ey) / bl * 900, ex, ey };
});
// Start places: 4 per region on the outermost two rings (player and bot capitals go there, the rest stays empty land).
const START_SLOT_OFFS = [[-.24, -.2], [.24, -.2], [-.24, .26], [.24, .26]];
const startSlots = [];
for (const lm of landmasses) if (lm.tier === 'outer' && lm.ring >= GRID_HALF - 1) for (const [sx, sy] of START_SLOT_OFFS) startSlots.push({ lm: lm.id, x: lm.x + sx * HEX_SPACING, y: lm.y + sy * HEX_SPACING });
const BASE_SPACING = HEX_SPACING * .083;                   // one distance between neighbouring bases everywhere (about 95 per region)
const segDistW = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
for (const lm of landmasses) {
    const isMega = lm.isCenter, hasTemple = regionHasTemple(lm), tierStats = TIER_STATS[lm.tier];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of lm.shape) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    // Keep clear: the temple, every gate on this region's banks with its road to the bridge, and the start places.
    const templeClear = !hasTemple ? 0 : HEX_SPACING * (isMega ? .19 : lm.corner ? .15 : .12);
    const myGates = gateSpots.filter(gsp => gsp.lm === lm.id || (gsp.br.a === lm.id || gsp.br.b === lm.id));
    const mySlots = startSlots.filter(sl => sl.lm === lm.id);
    const d = BASE_SPACING, inset = d * .45, grid = new Map(), mine = [];
    const safe = 7700 + inset;                                 // the banks meander at most ±3.8k: deeper inside than this is land for sure
    const inside = (x, y) => (x > minX + safe && x < maxX - safe && y > minY + safe && y < maxY - safe) ||
        (pointInPolygon(x, y, lm.shape) && pointInPolygon(x + inset, y, lm.shape) && pointInPolygon(x - inset, y, lm.shape) && pointInPolygon(x, y + inset, lm.shape) && pointInPolygon(x, y - inset, lm.shape));
    const free = (x, y) => {                                   // cheapest checks first
        const gx = Math.floor(x / d), gy = Math.floor(y / d);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const m of grid.get((gx + i) + ',' + (gy + j)) || []) if (Math.hypot(m.x - x, m.y - y) < d) return false;
        if (templeClear && Math.hypot(x - lm.x, y - lm.y) < templeClear) return false;
        for (const gsp of myGates) if (Math.hypot(x - gsp.x, y - gsp.y) < d * 1.1 || segDistW(x, y, gsp.x, gsp.y, gsp.ex, gsp.ey) < d * .7) return false;
        for (const sl of mySlots) if (Math.hypot(x - sl.x, y - sl.y) < d * 1.1) return false;
        return inside(x, y);
    };
    const add = p => { mine.push(p); const k = Math.floor(p.x / d) + ',' + Math.floor(p.y / d); (grid.get(k) || grid.set(k, []).get(k)).push(p); };
    // Even spread without gaps (Poisson-disc): start near the middle, grow outwards until the region is full.
    const active = [];
    const seed = () => { let best = null, bd = Infinity;
        for (let t = 0; t < 400; t++) { const x = minX + rand() * (maxX - minX), y = minY + rand() * (maxY - minY), dd = Math.hypot(x - lm.x, y - lm.y); if (dd < bd && free(x, y)) { bd = dd; best = { x, y }; } }
        if (best) { add(best); active.push(best); } return best; };
    if (seed()) while (true) {
        if (!active.length && !seed()) break;
        const i = Math.floor(rand() * active.length), a = active[i]; let found = false;
        for (let k = 0; k < 30; k++) { const an = rand() * Math.PI * 2, rad = d * (1 + rand() * .25), x = a.x + Math.cos(an) * rad, y = a.y + Math.sin(an) * rad;
            if (free(x, y)) { const p = { x, y }; add(p); active.push(p); found = true; break; } }
        if (!found) active.splice(i, 1);
    }
    for (const p of mine) islands.push({
        id: id++, landmassId: lm.id, x: p.x, y: p.y, radius: ISLAND_RADIUS, type: 'tower',
        neutralTroops: tierStats ? niceRoundW(tierStats.troops[0] + rand() * (tierStats.troops[1] - tierStats.troops[0])) : (NEUTRAL_TROOPS_MIN + Math.floor(rand() * (NEUTRAL_TROOPS_MAX - NEUTRAL_TROOPS_MIN + 1))) * ringMult(lm),
        neutralDefense: tierStats ? niceRoundW(tierStats.def[0] + rand() * (tierStats.def[1] - tierStats.def[0])) : (NEUTRAL_DEFENSE_MIN + Math.floor(rand() * (NEUTRAL_DEFENSE_MAX - NEUTRAL_DEFENSE_MIN + 1))) * ringMult(lm),
        neutralLevel: tierStats ? tierStats.level : 1 + Math.round(Math.log2(ringMult(lm)))
    });
    if (hasTemple) islands.push({
        id: id++, landmassId: lm.id, x: lm.x, y: lm.y,
        radius: ISLAND_RADIUS * (isMega ? 1.6 : lm.tier === 'guardian' ? 1.45 : 1.3),
        type: isMega ? 'megaTemple' : 'temple',
        guardian: lm.tier === 'guardian',
        neutralTroops: tierStats ? tierStats.temple[0] : Math.round(Math.floor(TEMPLE_TROOPS_MIN + rand() * (TEMPLE_TROOPS_MAX - TEMPLE_TROOPS_MIN)) * ringMult(lm)),
        neutralDefense: tierStats ? tierStats.temple[1] : Math.round(Math.floor(TEMPLE_DEFENSE_MIN + rand() * (TEMPLE_DEFENSE_MAX - TEMPLE_DEFENSE_MIN)) * ringMult(lm)),
        neutralLevel: tierStats ? tierStats.templeLevel : 1
    });
}
// Start places as bases: 64 of them, spread evenly round the edge (player + bots take them, the rest stay empty land).
{
    const order = startSlots.slice().sort((u, v) => Math.atan2(u.y, u.x) - Math.atan2(v.y, v.x));
    const want = 64, step = order.length / want;
    for (let k = 0; k < want && k * step < order.length; k++) {
        const sl = order[Math.floor(k * step)], lm = landmasses[sl.lm];
        islands.push({ id: id++, landmassId: sl.lm, x: sl.x, y: sl.y, radius: ISLAND_RADIUS, type: 'tower', startSlot: true,
            neutralTroops: NEUTRAL_TROOPS_MIN * ringMult(lm), neutralDefense: NEUTRAL_DEFENSE_MIN * ringMult(lm), neutralLevel: 1 });
    }
}
for (const gsp of gateSpots) {
    gsp.br.gateId = id;
    islands.push({ id: id++, ends: [[gsp.br.x1, gsp.br.y1], [gsp.br.x2, gsp.br.y2]], landmassId: gsp.lm, x: gsp.x, y: gsp.y, radius: ISLAND_RADIUS * 1.25,
                   type: 'gate', gateKind: gsp.kind, toll: gsp.st.toll, neutralTroops: gsp.st.troops, neutralDefense: gsp.st.def, neutralLevel: gsp.st.level });
}
const islandById = {};
for (const island of islands) islandById[island.id] = island;
// Kennung der Karte in der Welt (Paket C): der Weltrechner startet nur, wenn sie zur Karte des Spiels passt (start.js)
const KARTE_KENNUNG = JSON.stringify({ n: GRID_N, inseln: islands.length });
if (SYSTEM && store.get('openWaterKarte') !== KARTE_KENNUNG) store.set('openWaterKarte', KARTE_KENNUNG);

// The map was rebuilt (Thron-Insel + Wächter-Inseln): old base ids no longer match, so every
// map-bound part of an old save is cleared once. Coins, gems, gear, skills and level stay,
// and the player's whole army moves to the new home base.
const WORLD_VERSION = '7';   // 7: Karte 17 × 17 (Paket C) – welt.js setzt dieselbe Zahl (WELT_VERSION)
if (store.get('openWaterWorldVersion') !== WORLD_VERSION) {
    let carry = 0;
    try {
        const oldOwned = JSON.parse(store.get('openWaterOwnedIslands')) || [], oldTroops = JSON.parse(store.get('openWaterIslandTroops')) || {};
        for (const i of oldOwned) carry += oldTroops[i] || 0;
        for (const a of JSON.parse(store.get('openWaterPendingAttacks')) || []) if (!a.attackerBotId) carry += a.rawTroops || 0;
        for (const a of JSON.parse(store.get('openWaterPendingSends')) || []) if (!a.senderBotId) carry += a.troops || a.rawTroops || 0;
        for (const a of JSON.parse(store.get('openWaterPendingRetreats')) || []) carry += a.troops || 0;
    } catch (e) {}
    ['openWaterPlayerIslandId', 'openWaterOwnedIslands', 'openWaterIslandLevels', 'openWaterIslandTroops', 'openWaterBotOwnedIslands',
     'openWaterBotCoins', 'openWaterNeutralTroopOverrides', 'openWaterScoutedIslands', 'openWaterPendingAttacks', 'openWaterPendingSends',
     'openWaterPendingScouts', 'openWaterPendingRetreats', 'openWaterTempleHoldSince', 'openWaterExplored', 'openWaterFogCells', 'openWaterWorldStart', 'openWaterBotState', 'openWaterTitles', 'openWaterGateCfg', 'openWaterShield', 'openWaterShieldStock', 'openWaterWander', 'openWaterWanderNext'].forEach(k => store.remove(k));
    if (carry > 0) store.set('openWaterCarryTroops', String(Math.round(carry)));
    store.set('openWaterWorldVersion', WORLD_VERSION);
}

// Neutral islands normally regenerate the exact same neutralTroops
// every load (same seed, same order) - but a lost attack now
// permanently wounds the defender (see resolveAttack), so that
// damage has to survive a reload too. This overrides the freshly
// generated neutralTroops for any island that's taken casualties.
let neutralTroopOverrides;
try {
    neutralTroopOverrides = JSON.parse(store.get('openWaterNeutralTroopOverrides')) || {};
} catch (e) {
    neutralTroopOverrides = {};
}
for (const idStr of Object.keys(neutralTroopOverrides)) {
    const isl = islandById[idStr];
    if (isl) isl.neutralTroops = neutralTroopOverrides[idStr];
}

function centerIsland() {
    // Player's home base: a regular tower near the middle of the southernmost outer landmass,
    // as far from the Thron-Insel as the bots start.
    // → the start place furthest south, closest to the middle column
    return islands.filter(i => i.startSlot).reduce((a, b) => (b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && Math.abs(b.x) < Math.abs(a.x))) ? b : a);
}

// Startplatz für einen neuen Spieler in der EINEN Welt (gibt { insel, aus } zurück; aus = Mitspieler, dem sie gehörte):
// 1. eine freie Basis am äußeren Rand, auf der Landmasse mit den wenigsten Besitzern
// 2. Rand voll: irgendeine freie Basis (nie in der Mitte oder bei den Wächter-Tempeln)
// 3. Karte voll: eine Randbasis vom größten Mitspieler-Reich (nie von einem echten Spieler, nie eine Hauptstadt) – wie bei den Mitspielern
// besitz: { besitzer: [Basen] } – beim Weltrechner die lebenden Daten, sonst aus dem Speicher
function freierStartplatz(besitz) {
    if (!besitz) { besitz = {}; try { Object.assign(besitz, JSON.parse(store.get('openWaterBotOwnedIslands')) || {}); } catch (e) {} try { besitz.player = JSON.parse(store.get('openWaterOwnedIslands')) || []; } catch (e) {} }
    const wem = new Map(), proLm = {};
    for (const k in besitz) for (const id of besitz[k] || []) wem.set(id, k);
    if (!wem.size) return { insel: centerIsland() };                          // ganz neue Welt: der klassische Platz
    for (const id of wem.keys()) { const i = islandById[id]; if (i) proLm[i.landmassId] = (proLm[i.landmassId] || 0) + 1; }
    const besterOrt = liste => { const min = Math.min(...liste.map(i => proLm[i.landmassId] || 0)), beste = liste.filter(i => (proLm[i.landmassId] || 0) === min); return beste.find(i => i.startSlot) || beste[Math.floor(Math.random() * beste.length)]; };
    const turm = i => { if (i.type !== 'tower') return false; try { return !bossAt(i.id); } catch (e) { return true; } };   // (beim Laden gibt es den Besitz noch nicht – dann prüft es der Weltrechner)
    let frei = islands.filter(i => turm(i) && !wem.has(i.id) && landmasses[i.landmassId].tier === 'outer');
    if (frei.length) return { insel: besterOrt(frei) };
    frei = islands.filter(i => turm(i) && !wem.has(i.id) && landmasses[i.landmassId].tier !== 'throne' && landmasses[i.landmassId].tier !== 'guardian');
    if (frei.length) return { insel: besterOrt(frei) };
    const reiche = Object.keys(besitz).filter(k => /^bot\d+$/.test(k)).sort((u, v) => (besitz[v] || []).length - (besitz[u] || []).length);
    try { for (const k of reiche) {
        const caps = new Set(); try { const c = loadBotState()[k].capital; if (c !== undefined) caps.add(c); } catch (e) {}
        const rand = (besitz[k] || []).map(id => islandById[id]).filter(i => i && turm(i) && landmasses[i.landmassId].tier === 'outer' && !caps.has(i.id) && !(typeof isCapital === 'function' && isCapital(i.id)) && !(typeof pendingAttacks !== 'undefined' && pendingAttacks.some(a => a.targetId === i.id)));
        if (rand.length) return { insel: rand[Math.floor(Math.random() * rand.length)], aus: k };
    } } catch (e) {}                                                         // (beim Start ist noch nicht alles geladen)
    return { insel: null };
}
var startplatzNeu = false, startplatzAus = null; // (welt.js) frisch beigetreten: den Platz beim Weltrechner anmelden (aus: gehörte einem Mitspieler)
const storedId = parseInt(store.get('openWaterPlayerIslandId'), 10);
if (SYSTEM) {
    playerIslandId = centerIsland().id;                          // nur ein Bezugspunkt – der Weltrechner besitzt nichts
} else if (!Number.isNaN(storedId) && islandById[storedId]) {
    playerIslandId = storedId;
} else {
    const sp = freierStartplatz();
    playerIslandId = (sp.insel || centerIsland()).id; startplatzAus = sp.aus || null;
    startplatzNeu = true;
    store.set('openWaterPlayerIslandId', playerIslandId);
}

// Islands the player owns, each with its own level and troop garrison
var ownVer = 0;                                                  // bumped whenever anyone's bases change: the map skips its ownership scans while it stays
class OwnSet extends Set {
    add(id) { if (!this.has(id)) ownVer++; return super.add(id); }
    delete(id) { const r = super.delete(id); if (r) ownVer++; return r; }
    clear() { if (this.size) ownVer++; super.clear(); }
}
let ownedIslands;
try {
    ownedIslands = new OwnSet(JSON.parse(store.get('openWaterOwnedIslands')));
} catch (e) {
    ownedIslands = new OwnSet();
}
if (!SYSTEM) ownedIslands.add(playerIslandId);

let islandLevels;
try {
    islandLevels = JSON.parse(store.get('openWaterIslandLevels')) || {};
} catch (e) {
    islandLevels = {};
}
// strong inner islands show (and keep, minus one, on capture) their level
for (const isl of islands) if (isl.neutralLevel > 1 && islandLevels[isl.id] === undefined) islandLevels[isl.id] = isl.neutralLevel;
let islandTroops;
try {
    islandTroops = JSON.parse(store.get('openWaterIslandTroops')) || {};
} catch (e) {
    islandTroops = {};
}
// Only the very first time this player's save is created (no
// troop record for their home base yet) do they start with a
// 100,000-troop head start - not on every reload where troops
// happen to be at 0 from actual gameplay, and not for bots.
const PLAYER_START_TROOPS = 100000;
const isFreshPlayerSave = !(playerIslandId in islandTroops);
for (const ownedId of ownedIslands) {
    if (!islandLevels[ownedId]) islandLevels[ownedId] = 1;
    if (!islandTroops[ownedId]) {
        islandTroops[ownedId] = (ownedId === playerIslandId && isFreshPlayerSave) ? PLAYER_START_TROOPS : 0;
    }
}
// An old save may have moved the capital onto a temple or the throne (back then only gates were refused):
// it goes back to the strongest own tower - the garrison stays where it is, only the protection moves.
if (islandById[playerIslandId] && islandById[playerIslandId].type !== 'tower') {
    let best = null;
    for (const id of ownedIslands) if (islandById[id] && islandById[id].type === 'tower' && (best === null || (islandLevels[id] || 1) > (islandLevels[best] || 1))) best = id;
    if (best !== null) { playerIslandId = best; store.set('openWaterPlayerIslandId', playerIslandId); }
}

let coins = parseFloat(store.get('openWaterCoins')) || 0;   // parseFloat: huge sums are stored as "1e+22"
let gems = parseFloat(store.get('openWaterGems')) || 0;

let bonusGrantedAtBoot = false;   // persisted by saveGame() at the end of boot
// After the map rebuild: the old army arrives at the new home base.
const carriedTroops = parseFloat(store.get('openWaterCarryTroops')) || 0;   // parseFloat: huge armies are stored as "1e+22"
if (carriedTroops > 0) {
    bonusGrantedAtBoot = true;
    islandTroops[playerIslandId] = (islandTroops[playerIslandId] || 0) + carriedTroops;
    store.remove('openWaterCarryTroops');
}

// When each currently-owned temple was captured - the longer it's
// held continuously, the bigger its output bonus (see
// templeHoldMultiplier). Reset whenever a temple changes hands,
// whether that's the player or a bot taking it from a neutral
// garrison or from each other.
let templeHoldSince;
try {
    templeHoldSince = JSON.parse(store.get('openWaterTempleHoldSince')) || {};
} catch (e) {
    templeHoldSince = {};
}
function templeHoldMultiplier(templeId) {
    const since = templeHoldSince[templeId];
    if (!since) return 1;
    const heldMs = Date.now() - since;
    return 1 + Math.min(1, heldMs / TEMPLE_HOLD_STREAK_MS) * (TEMPLE_HOLD_STREAK_MAX_MULT - 1);
}

// Neutral islands hide their troop count until scouted
let scoutedIslands;
try {
    scoutedIslands = new Set(JSON.parse(store.get('openWaterScoutedIslands')));
} catch (e) {
    scoutedIslands = new Set();
}

// ===== HELDEN: 20 heroes with a fixed rarity like the gear (1 grün · 2 blau · 3 lila · 4 gold). Shards unlock them, then
// quarter stars up to 5; 1 skill point per half star for 4 skills (1 active at full rage, 3 passive). Only in fights they lead.
const HEROES = [
    { id: 'brunhild', name: 'Brunhild', title: 'Schildmaid des Nordens', role: 'Verteidigung', r: 4, icon: 'shield', color: '#8a4f2c', c2: '#3b2a4a', hair: '#c9a15a', g: 'shield', base: [4, 8, 0],
      sk: [['Schildwall', 'In diesem Kampf {v} % weniger Verluste.', 'loss'], ['Eisenhaut', '{v} % weniger Verluste in jedem Kampf.', 'loss'], ['Bollwerk', '+{v} % Verteidigung ihrer Armee im Feld.', 'fieldDef'], ['Standhaft', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee']] },
    { id: 'ragna', name: 'Ragna', title: 'Seekönigin', role: 'Brücken & Tore', r: 4, icon: 'send', color: '#1f5f8a', c2: '#0f2f4a', hair: '#e0e0e0', g: 'weapon', base: [8, 3, 6],
      sk: [['Sturmflut', 'Greift sie über eine Brücke an: Verteidigung des Ziels −{v} %.', 'bridgeDef'], ['Seefahrerin', '+{v} % Marschtempo.', 'spd'], ['Gezeiten', '−{v} % Maut an fremden Toren.', 'toll'], ['Torbrecherin', '+{v} % Angriff gegen Tore.', 'gateAtk']] },
    { id: 'sigrun', name: 'Sigrun', title: 'Klinge des Südens', role: 'Angriff', r: 3, icon: 'attack', color: '#9b2f2f', c2: '#1f1f2f', hair: '#d8d0c0', g: 'weapon', base: [8, 0, 2],
      sk: [['Sturmangriff', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Klingenmeisterin', '+{v} % Angriff.', 'atk'], ['Blutrausch', 'Wut füllt sich um {v} % schneller.', 'rage'], ['Todesmut', '+{v} % Angriff gegen stärkere Gegner.', 'strongAtk']] },
    { id: 'aldric', name: 'Aldric', title: 'Meister der Belagerung', role: 'Tore & Tempel', r: 3, icon: 'castle', color: '#5b4a8a', c2: '#2b2b2b', hair: '#3a2a1a', g: 'weapon', base: [7, 2, 0],
      sk: [['Rammbock', 'Verteidigung von Tor oder Tempel −{v} % für diesen Angriff.', 'siegeDef'], ['Belagerer', '+{v} % Angriff gegen Tore und Tempel.', 'siegeAtk'], ['Pioniere', '−{v} % Maut an fremden Toren.', 'toll'], ['Mauerbrecher', 'Die Verteidigung einer Basis zählt {v} % weniger.', 'defCut']] },
    { id: 'kasimir', name: 'Kasimir', title: 'Gestürzter König', role: 'Thron', r: 3, icon: 'crown', color: '#6a2f5b', c2: '#2a1a2a', hair: '#2a1a1a', g: 'weapon', base: [6, 3, 0],
      sk: [['Königsruf', 'Im Kampf um die Mitte: +{v} % Angriff.', 'midAtk'], ['Thronsturm', '+{v} % Angriff gegen die Wächter-Tempel.', 'guardAtk'], ['Rache am Thron', '+{v} % Angriff gegen den Herrscher.', 'rulerAtk'], ['Altes Wissen', '{v} % weniger Verluste im Kampf um die Mitte.', 'midLoss']] },
    { id: 'yrsa', name: 'Yrsa', title: 'Tempelwächterin', role: 'Tempel', r: 3, icon: 'temple', color: '#4a6a4a', c2: '#2a3a2a', hair: '#b0602a', g: 'shield', base: [3, 7, 0],
      sk: [['Heilige Mauer', 'Greift sie einen Tempel an: {v} % weniger Verluste.', 'templeLoss'], ['Tempelgold', '+{v} % Gold aus Kämpfen um Tempel.', 'templeGold'], ['Pilgerin', '+{v} % Angriff gegen Tempel.', 'templeAtk'], ['Segen', '+{v} % Verwundete statt Gefallene bei Tempelkämpfen.', 'templeHosp']] },
    { id: 'ida', name: 'Ida', title: 'Pfadfinderin', role: 'Tempo', r: 2, icon: 'boots', color: '#2f7a6a', c2: '#1f3a2f', hair: '#7a3a1a', g: 'weapon', base: [2, 2, 8],
      sk: [['Eilmarsch', 'Ihre Armee marschiert {v} % schneller.', 'spd'], ['Kartenkunde', '+{v} % Marschtempo.', 'spd'], ['Leichtfuß', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Rückweg', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'bernhard', name: 'Bernhard', title: 'Feldscher', role: 'Krankenhaus', r: 2, icon: 'plus', color: '#3d6b9b', c2: '#2a2a3a', hair: '#555', g: 'shield', base: [0, 6, 0],
      sk: [['Feldlazarett', '+{v} % der Gefallenen kommen ins Krankenhaus.', 'hosp'], ['Wundarzt', '{v} % weniger Verluste.', 'loss'], ['Sanitäter', 'Verliert er, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Feldküche', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'mira', name: 'Mira', title: 'Späherin', role: 'Späher', r: 2, icon: 'scout', color: '#6b7a2f', c2: '#2f3a1f', hair: '#1a1a1a', g: 'weapon', base: [2, 3, 4],
      sk: [['Adlerauge', '+{v} % Angriff gegen eine Basis, die du vorher ausgespäht hast.', 'scoutAtk'], ['Leise Sohlen', '+{v} % Marschtempo.', 'spd'], ['Spurlos', 'Die anderen bemerken ihren Angriff {v} % später.', 'late'], ['Fährtenleserin', '+{v} % Angriff gegen Armeen im Feld.', 'fieldAtk']] },
    { id: 'nora', name: 'Nora', title: 'Jägerin', role: 'Feldkampf', r: 2, icon: 'troops', color: '#4a5a8a', c2: '#20283a', hair: '#6a2a2a', g: 'weapon', base: [6, 2, 4],
      sk: [['Hinterhalt', 'Gegen Armeen im Feld: +{v} % Angriff.', 'fieldAtk'], ['Pirsch', '+{v} % Marschtempo im Feld.', 'fieldSpd'], ['Beute', '+{v} % Gold aus Kämpfen im Feld.', 'fieldGold'], ['Zäh', '{v} % weniger Verluste im Feld.', 'fieldLoss']] },
    { id: 'fenn', name: 'Fenn', title: 'Goldsucher', role: 'Felder', r: 2, icon: 'coin', color: '#7a6a4a', c2: '#3a3020', hair: '#a07a3a', g: 'none', base: [2, 3, 3],
      sk: [['Goldrausch', 'Im Kampf um ein Feld: +{v} % Angriff.', 'resAtk'], ['Spürnase', 'Seine Sammler sind {v} % schneller.', 'gatherSpd'], ['Packesel', '+{v} % Traglast seiner Sammler.', 'carry'], ['Lagerwache', 'Seine Sammler verteidigen mit +{v} %.', 'gatherDef']] },
    { id: 'otto', name: 'Otto', title: 'Händler', role: 'Gold', r: 1, icon: 'sell', color: '#8a7a2e', c2: '#3a2f1f', hair: '#8a6a3a', g: 'none', base: [3, 2, 0],
      sk: [['Beutezug', 'Dieser Kampf bringt +{v} % Gold.', 'gold'], ['Feilschen', '+{v} % Gold aus Kämpfen.', 'gold'], ['Lastträger', '+{v} % Traglast seiner Sammler.', 'carry'], ['Sparsam', '−{v} % Maut an fremden Toren.', 'toll']] },
    { id: 'greta', name: 'Greta', title: 'Kräuterfrau', role: 'Krankenhaus', r: 1, icon: 'plus', color: '#8a4a5b', c2: '#3a2030', hair: '#c0c0a0', g: 'none', base: [0, 6, 0],
      sk: [['Kräutersud', '+{v} % der Gefallenen kommen ins Krankenhaus.', 'hosp'], ['Salben', '{v} % weniger Verluste.', 'loss'], ['Hausmittel', 'Verliert sie, fliehen {v} % mehr Truppen zurück.', 'flee'], ['Wegzehrung', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'hagen', name: 'Hagen', title: 'Söldner', role: 'Angriff', r: 1, icon: 'weapon', color: '#5a5a5a', c2: '#2a2a2a', hair: '#3a3a3a', g: 'weapon', base: [8, 0, 2],
      sk: [['Wucht', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Söldner', '+{v} % Angriff.', 'atk'], ['Raufbold', '+{v} % Angriff gegen neutrale Basen.', 'neutralAtk'], ['Hartgesotten', '{v} % weniger Verluste.', 'loss']] },
    // Paket E: 6 neue Helden – jeder mit kurzer Geschichte (story) und einem Partner aus HERO_PAIRS
    { id: 'wolfram', name: 'Wolfram', title: 'Eiserner Marschall', role: 'Armeen', r: 4, icon: 'troops', color: '#4a5560', c2: '#1e2228', hair: '#9a9a9a', g: 'weapon', base: [6, 6, 3],
      story: 'Er führte einst das Heer von König Kasimir. Als der Thron fiel, blieb er als Einziger an der Seite seines Königs.',
      sk: [['Kesselschlacht', 'Gegen Armeen im Feld: in diesem Kampf +{v} % Angriff.', 'fieldAtk'], ['Heerführer', '{v} % weniger Verluste im Feld.', 'fieldLoss'], ['Feldlager', '+{v} % Verteidigung seiner Armee im Feld.', 'fieldDef'], ['Gewaltmarsch', '+{v} % Marschtempo im Feld.', 'fieldSpd']] },
    { id: 'thora', name: 'Thora', title: 'Sturmreiterin', role: 'Überfall', r: 3, icon: 'boots', color: '#3a6e8f', c2: '#1a2a3a', hair: '#e8c070', g: 'weapon', base: [6, 1, 6],
      story: 'Zehn Jahre stand sie als Steuerfrau auf Ragnas Flaggschiff. Heute jagt sie ihre Reiter so schnell über das Land wie früher das Schiff durch den Sturm.',
      sk: [['Überrumpeln', 'Die Verteidigung des Ziels zählt in diesem Angriff {v} % weniger.', 'defCut'], ['Sturmwind', '+{v} % Marschtempo.', 'spd'], ['Im Morgengrauen', 'Die anderen bemerken ihren Angriff {v} % später.', 'late'], ['Abdrehen', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'eskil', name: 'Eskil', title: 'Runenschmied', role: 'Krankenhaus & Wut', r: 3, icon: 'temple', color: '#5a4a7a', c2: '#221a30', hair: '#c8b8a0', g: 'shield', base: [2, 7, 0],
      story: 'Er hat die alten Runen in die Mauern der Tempel gemeißelt. Yrsa sagt, ohne seine Zeichen wären die Steine längst gefallen.',
      sk: [['Runenheilung', 'In diesem Kampf +{v} % der Gefallenen ins Krankenhaus.', 'hosp'], ['Schutzrune', '{v} % weniger Verluste.', 'loss'], ['Zornrune', 'Wut füllt sich um {v} % schneller.', 'rage'], ['Fluchtrune', 'Verliert er, fliehen {v} % mehr Truppen zurück.', 'flee']] },
    { id: 'lene', name: 'Lene', title: 'Fährfrau', role: 'Brücken', r: 2, icon: 'send', color: '#2f6a7a', c2: '#18303a', hair: '#5a3a2a', g: 'none', base: [3, 3, 6],
      story: 'Sie kennt jede Furt und jede Brücke zwischen den Inseln. Ida bringt die Truppen bis ans Ufer – Lene bringt sie hinüber.',
      sk: [['Fährmannslist', 'Greift sie über eine Brücke an: Verteidigung des Ziels −{v} %.', 'bridgeDef'], ['Strömung', '+{v} % Marschtempo.', 'spd'], ['Fährgeld', '−{v} % Maut an fremden Toren.', 'toll'], ['Zurück ans Ufer', 'Rückzüge sind {v} % schneller.', 'ret']] },
    { id: 'bruno', name: 'Bruno', title: 'Bärenringer', role: 'Angriff', r: 2, icon: 'weapon', color: '#6a4a2a', c2: '#2a1e14', hair: '#4a2a1a', g: 'weapon', base: [7, 3, 1],
      story: 'Auf jedem Jahrmarkt rang er mit Bären, bis Hagen ihn zum Söldner machte. Seitdem prügeln sich die beiden durch jede Hafenkneipe – meistens Seite an Seite.',
      sk: [['Bärenkraft', 'In diesem Kampf +{v} % Angriff.', 'atk'], ['Ringer', '+{v} % Angriff gegen neutrale Basen.', 'neutralAtk'], ['Dickes Fell', '{v} % weniger Verluste.', 'loss'], ['Zechpreller', '+{v} % Gold aus Kämpfen.', 'gold']] },
    { id: 'pia', name: 'Pia', title: 'Perlentaucherin', role: 'Sammeln', r: 1, icon: 'coin', color: '#3a7a8a', c2: '#183038', hair: '#2a2a3a', g: 'none', base: [2, 2, 3],
      story: 'Sie taucht nach Perlen, wo andere nur Wasser sehen. Mit Fenn teilt sie jeden Fund – er sucht im Fels, sie im Meer.',
      sk: [['Großer Fang', 'Dieser Kampf bringt +{v} % Gold.', 'gold'], ['Flinke Hände', 'Ihre Sammler sind {v} % schneller.', 'gatherSpd'], ['Tiefe Taschen', '+{v} % Traglast ihrer Sammler.', 'carry'], ['Strandwache', 'Ihre Sammler verteidigen mit +{v} %.', 'gatherDef']] }
];
// Paket E: zwei Helden pro Marsch. Der Zweitheld gibt seine Werte und passiven Fähigkeiten zu 50 % (die Wut-Fähigkeit zündet nur
// beim Haupthelden), ein passendes Paar gibt +10 % auf alle Heldenwerte des Marsches. Jeder Held steht in höchstens einem Paar.
const HERO_ZWEIT = .5, HERO_PAIR_BONUS = 10;
const HERO_PAIRS = [
    { a: 'kasimir', b: 'wolfram', name: 'Die alte Garde', story: 'König und Marschall: Der Thron fiel, die Treue blieb.' },
    { a: 'ragna', b: 'thora', name: 'Wind und Welle', story: 'Die Seekönigin und ihre alte Steuerfrau lesen einander jeden Sturm vom Gesicht ab.' },
    { a: 'yrsa', b: 'eskil', name: 'Hüter der Runen', story: 'Sie bewacht die Tempel, er hat ihre Mauern mit Runen geschützt.' },
    { a: 'ida', b: 'lene', name: 'Pfad und Furt', story: 'Ida findet den Weg zum Ufer, Lene den Weg hinüber.' },
    { a: 'hagen', b: 'bruno', name: 'Raufbrüder', story: 'Zwei Söldner, eine Kneipe, noch nie verloren.' },
    { a: 'fenn', b: 'pia', name: 'Fels und Meer', story: 'Fenn sucht Gold im Fels, Pia Perlen im Meer – geteilt wird jeder Fund.' }
];
function heroPairOf(a, b) { return a && b ? HERO_PAIRS.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a)) || null : null; }
function heroPartner(id) { const p = HERO_PAIRS.find(x => x.a === id || x.b === id); return p ? { pair: p, id: p.a === id ? p.b : p.a } : null; }
// rarity rule: in the same role rarer is always stronger. a/p = active/passive value at skill level 5, st = the stat multiplier
const HERO_TIER = { 1: { a: 15, p: 5, st: 1 }, 2: { a: 20, p: 8, st: 1.6 }, 3: { a: 30, p: 12, st: 2.4 }, 4: { a: 40, p: 15, st: 3.2 } };
const HERO_UNLOCK = { 1: 10, 2: 20, 3: 40, 4: 80 }, HERO_START_SHARDS = { 1: 10, 2: 8, 3: 6, 4: 4 };   // shards to unlock · everyone's starter shards
const HERO_MAXQ = 20, HERO_RAGE = 25, HERO_RESET_GEMS = 200, HERO_HALL_GEF = 3;
const HERO_SHARDS_WANDER = 25, HERO_SHARDS_DAY = 5, HERO_SHARDS_CHAIN = 30;   // where shards come from (and the hero chests in the shop)
const HERO_CHESTS = [{ id: 'hc1', name: 'Heldenkiste', gems: 150, sh: 6, n: 1, minR: 1, txt: '6 Splitter' }, { id: 'hc3', name: 'Große Kiste', gems: 500, sh: 8, n: 3, minR: 1, txt: '3 × 8 Splitter' },
    { id: 'hcE', name: 'Epische Kiste', gems: 1200, sh: 30, n: 1, minR: 3, txt: '30 Splitter · Episch+' }];   // gems per shard: 25 / 21 / 40 (only Episch or Legendär)                // 5 stars in quarters · rage per fight · reset price · +3 % Gefolge per hall level
const botById = {};
for (const bot of BOT_DEFS) botById[bot.id] = bot;

// Every bot's bases, plus an index base → bot kept in step with them, so "who owns this?" is one lookup, not 60.
const botOwnerIndex = new Map();
class BotBaseSet extends Set {
    constructor(owner, items) { super(); this.owner = owner; for (const id of items || []) this.add(id); }
    add(id) { if (!this.has(id)) ownVer++; botOwnerIndex.set(id, this.owner); return super.add(id); }
    delete(id) { if (botOwnerIndex.get(id) === this.owner) botOwnerIndex.delete(id); const r = super.delete(id); if (r) ownVer++; return r; }
    clear() { for (const id of this) if (botOwnerIndex.get(id) === this.owner) botOwnerIndex.delete(id); if (this.size) ownVer++; super.clear(); }
}
let botOwnedIslands;
try {
    const raw = JSON.parse(store.get('openWaterBotOwnedIslands'));
    botOwnedIslands = {};
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id] = new BotBaseSet(bot.id, raw && raw[bot.id] || []);
} catch (e) {
    botOwnedIslands = {};
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id] = new BotBaseSet(bot.id);
}
let botCoins;
try {
    botCoins = JSON.parse(store.get('openWaterBotCoins')) || {};
} catch (e) {
    botCoins = {};
}
for (const bot of BOT_DEFS) if (!botCoins[bot.id]) botCoins[bot.id] = 0;

// Gives every bot that doesn't already own a base one starting base,
// each on a different outer landmass so they begin spread out
// rather than clustered together or on the player's own home
// landmass. Runs per-bot (not just on a fully fresh game) so a bot
// added to BOT_DEFS later, on top of an existing save where the
// earlier bots already have territory, still gets seeded in.
{
    // every bot starts on one of the start places round the edge, spread out, never on the player's
    const usedTowerIds = new Set([playerIslandId]);
    for (const bot of BOT_DEFS) for (const id of botOwnedIslands[bot.id]) usedTowerIds.add(id);
    for (const id of ownedIslands) usedTowerIds.add(id);
    const home = islandById[playerIslandId], slots = islands.filter(i => i.startSlot && !usedTowerIds.has(i.id) && i.landmassId !== home.landmassId)
        .sort((u, v) => Math.atan2(u.y, u.x) - Math.atan2(v.y, v.x));
    const stepB = Math.max(1, slots.length / BOT_DEFS.length);
    BOT_DEFS.forEach((bot, i) => {
        if (bot.mensch || botOwnedIslands[bot.id].size > 0) return;      // echte Spieler bekommen ihren Platz vom Weltrechner
        const tower = slots[Math.floor(i * stepB) % slots.length];
        if (!tower || usedTowerIds.has(tower.id)) return;
        botOwnedIslands[bot.id].add(tower.id);
        islandLevels[tower.id] = 1;
        islandTroops[tower.id] = 0;                       // every player starts from nothing and builds up
        usedTowerIds.add(tower.id);
    });
    // more players than start places: the rest start on a free outer base, as far as possible from everyone else
    const late = BOT_DEFS.filter(bot => !bot.mensch && botOwnedIslands[bot.id].size === 0);
    if (late.length) {
        const taken = [...usedTowerIds].map(id => islandById[id]).filter(Boolean);
        for (const bot of BOT_DEFS) { let k = 0; for (const id of botOwnedIslands[bot.id]) { if (k++ % 25 === 0) taken.push(islandById[id]); } }   // a sample of every empire is enough
        const pool = islands.filter(i => i.type === 'tower' && !usedTowerIds.has(i.id) && !islandOwnerOf(i.id) && landmasses[i.landmassId].tier === 'outer' && landmasses[i.landmassId].ring >= GRID_HALF - 2 && i.landmassId !== home.landmassId);
        const rnd = mulberry32(4242);
        for (const bot of late) {
            let best = null, bestD = -1;
            for (let k = 0; k < 250 && pool.length; k++) {
                const c = pool[Math.floor(rnd() * pool.length)]; if (usedTowerIds.has(c.id)) continue;
                let dmin = Infinity; for (const t of taken) { const dd = (t.x - c.x) ** 2 + (t.y - c.y) ** 2; if (dd < dmin) dmin = dd; }
                if (dmin > bestD) { bestD = dmin; best = c; }
            }
            if (!best) break;
            botOwnedIslands[bot.id].add(best.id); islandLevels[best.id] = 1; islandTroops[best.id] = 0; usedTowerIds.add(best.id); taken.push(best);
        }
    }
}

// Who owns a given island right now: 'player', a bot id, or null
// for neutral. Player ownership always wins the check since a
// capture always removes the island from whichever set it used to
// be in first.
function islandOwnerOf(islandId) {
    if (ownedIslands.has(islandId)) return 'player';
    return botOwnerIndex.get(islandId) || null;
}
// Actual troops/defense a target currently has, regardless of who
// (if anyone) owns it - neutral islands use their fixed generated
// stats, an owned island uses its real garrison and level.
// ===== HERRSCHER DER MEERE =====
// Whoever holds the Mega-Tempel on the Thron-Insel rules: a crown on every nameplate,
// +25 % coins and troops on all bases, and the title "Herrscher der Meere".
const RULER_BONUS = 1.25;
const megaTempleId = (islands.find(i => i.type === 'megaTemple') || {}).id;
function rulerOwner() { return megaTempleId === undefined ? null : islandOwnerOf(megaTempleId); }
// Nebel des Krieges: only explored islands are visible. Owning a base explores its island and
// every island bridged to it; a scout sent into the fog explores the island it reaches.
// The fog lifts in small sections (FOG_CELL squares): around every own base, and wherever a scout goes.
const FOG_CELL = 4000, REVEAL_BASE = 7000, REVEAL_SCOUT = 8000;
var fogCells = null, fogLmCount = {}, cellLm = null, fogFx = [], fogMaskDirty = true, fogPrompt = null;
function fogKey(cx, cy) { return cx + ',' + cy; }
function fogLandCells() {                        // key → landmass id for every cell that touches land
    if (cellLm) return cellLm;
    cellLm = {};
    for (const lm of landmasses) {
        lm.fogCells = [];
        const r = lm.shapeMaxR, x0 = Math.floor((lm.x - r) / FOG_CELL), x1 = Math.floor((lm.x + r) / FOG_CELL), y0 = Math.floor((lm.y - r) / FOG_CELL), y1 = Math.floor((lm.y + r) / FOG_CELL);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
            const pts = [[.5, .5], [.1, .1], [.9, .1], [.1, .9], [.9, .9], [.5, .1], [.5, .9], [.1, .5], [.9, .5]];
            if (!pts.some(([fx, fy]) => pointInPolygon((cx + fx) * FOG_CELL, (cy + fy) * FOG_CELL, lm.shape))) continue;
            const k = fogKey(cx, cy); cellLm[k] = lm.id; lm.fogCells.push({ k, x: (cx + .5) * FOG_CELL, y: (cy + .5) * FOG_CELL });
        }
    }
    return cellLm;
}
function fogSet() {
    if (!fogCells) {
        try { fogCells = new Set(JSON.parse(store.get('openWaterFogCells')) || []); } catch (e) { fogCells = new Set(); }
        const cl = fogLandCells(); fogLmCount = {};
        for (const k of fogCells) { const id = cl[k]; if (id !== undefined) fogLmCount[id] = (fogLmCount[id] || 0) + 1; }
    }
    return fogCells;
}
function isCellOpen(x, y) { return fogSet().has(fogKey(Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))); }
function islandSeen(isl) {                      // a base is visible when its spot is explored - a gate also from its bridge
    if (!(isCellOpen(isl.x, isl.y) || (isl.ends && isl.ends.some(e => isCellOpen(e[0], e[1]))))) return false;
    return !nebelVomServer() || truppenBekannt(isl);
}
// 3B – Nebel auf dem Server: fremde Truppenzahlen kommen nur für Inseln, die der Weltrechner dich sehen lässt. Fehlt die Zahl
// einer fremden Basis, liegt sie für dich (noch) im Nebel („?“) – auch wenn dein Handy das Feld schon aufgedeckt hat.
function nebelVomServer() { return !SYSTEM && !!window.WELT && !WELT.leiter && WELT.sichtV >= 0; }
function truppenBekannt(isl) { const ow = islandOwnerOf(isl.id); return !ow || ow === 'player' || Object.prototype.hasOwnProperty.call(islandTroops, isl.id); }
function isExplored(lmId) { fogSet(); return (fogLmCount[lmId] || 0) > 0; }             // any part of the island known
function revealAround(x, y, r, fade) {
    const set = fogSet(), cl = fogLandCells(), now = performance.now(), rr2 = r + FOG_CELL * .35;
    let changed = false;
    for (let cx = Math.floor((x - r) / FOG_CELL); cx <= Math.floor((x + r) / FOG_CELL); cx++)
        for (let cy = Math.floor((y - r) / FOG_CELL); cy <= Math.floor((y + r) / FOG_CELL); cy++) {
            const k = fogKey(cx, cy), id = cl[k];
            if (set.has(k)) continue;
            const mx = (cx + .5) * FOG_CELL, my = (cy + .5) * FOG_CELL;
            if (Math.abs(mx) > FRAME_HALF + FOG_CELL || Math.abs(my) > FRAME_HALF + FOG_CELL) continue;
            if (Math.hypot(mx - x, my - y) > rr2) continue;
            set.add(k); changed = true;
            if (id !== undefined) fogLmCount[id] = (fogLmCount[id] || 0) + 1;
            if (fade) fogFx.push({ k, x: mx, y: my, d: Math.hypot(mx - x, my - y), t: now });
        }
    if (changed) { fogMaskDirty = true; store.set('openWaterFogCells', JSON.stringify([...set])); if (typeof requestRender === 'function') requestRender(); }
    return changed;
}
function exploreOwned() { for (const id of ownedIslands) { const i = islandById[id]; if (i) revealAround(i.x, i.y, REVEAL_BASE, false); } }
function effectiveTroops(island) {
    const boss = bossAt(island.id); if (boss) return boss.troops;
    const owner = islandOwnerOf(island.id);
    return owner ? (islandTroops[island.id] || 0) : island.neutralTroops;
}
function wallDefensePct() {                     // Mauer in the city: +2 % defense per level on every one of your bases
    try { return (loadCity().levels.wall || 0) * 2; } catch (e) { return 0; }   // (the city isn't set up yet during the very first boot steps)
}
function effectiveDefense(island) {
    const boss = bossAt(island.id); if (boss) return boss.defense;
    const owner = islandOwnerOf(island.id);
    if (!owner) return island.neutralDefense;
    const level = islandLevels[island.id] || 1;
    const garrison = islandTroops[island.id] || 0;   // Verteidigung skill: the garrison fights harder, +3 % of it per level (mirror of the sword)
    const def = (owner === 'player' ? (defenseForLevel(level) + garrison * (skills.defense || 0) * SKILL_DEFS.defense.defPct / 100) * (1 + wallDefensePct() / 100)
                                    : (baseDefenseForLevel(level) * (1 + (botMults(owner).armorPct || 0) / 100) + garrison * (botMults(owner).defensePct || 0) / 100) * (1 + botBld(owner, 'wall') * 2 / 100)) * titleMult(owner, 'defense');
    const kk = AUF ? AUF.kampf(owner, 'd') : 1;       // Truppen-Stufe + Forschung (Paket D): Besatzung UND Verteidigung zählen × Kampfkraft – das Mehr steckt hier
    const vp = typeof verstDefPlus !== 'undefined' && verstDefPlus[island.id] || 0;   // Verstärkung: jeder Helfer mit seinen eigenen Werten
    return Math.max(0, Math.round(def * kk + garrison * (kk - 1) + vp));
}
// Where every point of a fight comes from - for the battle report, line by line with its source.
function defenseParts(island) {
    const boss = bossAt(island.id); if (boss) return [['Verteidigung', boss.defense, 'Boss']];
    const owner = islandOwnerOf(island.id), L = islandLevels[island.id] || 1;
    if (!owner) return [['Verteidigung', island.neutralDefense, 'neutrale Basis']];
    const g = islandTroops[island.id] || 0, base = baseDefenseForLevel(L), out = [['Grundverteidigung', base, 'Basis Stufe ' + L]];
    let armor, skill, wallPct, sl;
    if (owner === 'player') { armor = defenseForLevel(L) - base; sl = skills.defense || 0; skill = g * sl * SKILL_DEFS.defense.defPct / 100; wallPct = wallDefensePct(); }
    else { const m = botMults(owner), b = loadBotState()[owner]; armor = base * (m.armorPct || 0) / 100; sl = b ? b.skills.defense : 0; skill = g * (m.defensePct || 0) / 100; wallPct = botBld(owner, 'wall') * 2; }
    if (armor) out.push(['Rüstung', Math.round(armor), 'Ausrüstung']);
    if (skill) out.push(['Skill Verteidigung', Math.round(skill), 'Stufe ' + sl + ' · +' + sl * SKILL_DEFS.defense.defPct + ' % der Truppen']);
    const sub = base + armor + skill;
    if (wallPct) out.push(['Mauer', Math.round(sub * wallPct / 100), 'Stadt · +' + wallPct + ' %']);
    const x = titleOf(owner); if (x && x.kind === 'defense') out.push(['Titel ' + x.name, Math.round(sub * (1 + wallPct / 100) * x.v), 'Mega-Tempel · ' + (x.v > 0 ? '+' : '−') + Math.round(Math.abs(x.v) * 100) + ' %']);
    const kk = AUF ? AUF.kampf(owner, 'd') : 1;
    if (kk !== 1) { const vor = out.reduce((a, q) => a + q[1], 0);
        out.push(['Forschung Verteidigung', Math.round((vor + g) * (kk - 1)), '+' + Math.round((kk - 1) * 100) + ' % auf Besatzung und Verteidigung']); }
    const vp = typeof verstDefPlus !== 'undefined' && Math.round(verstDefPlus[island.id] || 0);
    if (vp) out.push(['Verstärkung: eigene Werte', vp, 'jeder Helfer mit seinem Skill, Titel und seiner Forschung']);
    out[0][1] += effectiveDefense(island) - out.reduce((a, q) => a + q[1], 0);        // rounding goes to the base line
    return out;
}
// what each side brought: level, title, the 4 equipped items, the hero who led (stars, rage, every bonus) and the city - kept with the report
function heroReportOf(hx) { return hx && hx.id ? { id: hx.id, q: hx.q, fired: !!hx.fired, skill: hx.skill || null, lines: hx.lines || [], pair: hx.pair || null,
    h2: hx.h2 ? { id: hx.h2.id, q: hx.h2.q, zweit: 1, lines: hx.h2.lines || [] } : null,
    extra: (hx.extra || []).map(e => ({ id: e.id, q: e.q, fired: !!e.fired, zweit: e.zweit ? 1 : 0, skill: e.skill || null, lines: e.lines || [] })) } : null; }
function fighterSnapshot(who, hx) {
    if (!who) return null;
    const slots = Object.keys(EQUIPMENT_DEFS);
    if (who === 'player') return { lvl: playerLvl, title: (titleOf('player') || {}).name || null,
        items: slots.map(k => { const it = equippedItems[k] && inventory[equippedItems[k]]; return it ? [k, it.rarity, it.level, it.stars || 0] : [k, -1, 0, 0]; }),
        heroes: [], hx: heroReportOf(hx),
        skills: [skills.attack || 0, skills.defense || 0], city: [cityLevelSafe('wall'), cityLevelSafe('hospital'), cityLevelSafe('heroes')] };
    const b = loadBotState()[who]; if (!b) return null;
    return { lvl: b.lvl, title: (titleOf(who) || {}).name || null,
        items: slots.map(k => { const it = botItem(b, k); return it ? [k, it.rarity, it.level, it.stars] : [k, -1, 0, 0]; }),
        heroes: [], hx: heroReportOf(hx),
        skills: [b.skills.attack || 0, b.skills.defense || 0], city: [botBld(who, 'wall'), botBld(who, 'hospital'), botBld(who, 'heroes')] };
}
function attackParts(who, raw, bonus, total, hero, a) {       // a = the attack: its launch-time skill share and level win over today's values
    const out = [], snap = a && a.skillBonus !== undefined;
    const sl = snap && a.skillLvl !== undefined ? a.skillLvl : who === 'player' ? skills.attack || 0 : (loadBotState()[who] || { skills: {} }).skills.attack || 0;
    const skill = Math.min(bonus, snap ? a.skillBonus : who === 'player' ? attackFlatBonus(raw) : Math.round(raw * sl * SKILL_DEFS.attack.atkPct / 100));
    if (skill) out.push(['Skill Angriff', skill, 'Stufe ' + sl + ' · +' + sl * SKILL_DEFS.attack.atkPct + ' %']);
    const hx = a && a.hx, hd = hx && heroById(hx.id);             // the hero's Angriff and Gefolge (a fired skill included)
    const h2n = hx && hx.id2 && heroById(hx.id2) ? ' & ' + heroById(hx.id2).name : '';   // der Zweitheld zählt mit
    if (bonus - skill) out.push([hd ? 'Held ' + hd.name + ' ' + heroStarTxt(hx.q) + h2n : 'Helden', bonus - skill, hd ? 'Angriff +' + Math.round(hx.atk) + ' %' + (heroGefOf(hx, raw) ? ' · Gefolge +' + fmtCompact(heroGefOf(hx, raw)) : '') + (hx.fired ? ' · ' + hx.skill + ' gezündet' : '') : '']);
    const kr = a && a.atkKraft ? a.atkKraft : 1, kv = kr !== 1 ? Math.round(total - total / kr) : 0;   // Forschung Angriff (Paket D)
    const tv = total - raw - bonus - kv, x = a && a.atkTitleKey !== undefined ? TITLES.find(q => q.key === a.atkTitleKey) : titleOf(who);   // the title it marched with
    if (tv) out.push(['Titel ' + (x ? x.name : ''), tv, 'Mega-Tempel · ' + (tv > 0 ? '+' : '−') + (x ? Math.round(Math.abs(x.v) * 100) : 25) + ' %']);
    if (kv) out.push(['Forschung Angriff', kv, '+' + Math.round((kr - 1) * 100) + ' % Kampfkraft']);
    return out;
}
// Rammbock, Sturmflut, Mauerbrecher: the target's defense counts less. Gemeinsam (Rally): jeder Held nur nach dem Stärke-Anteil
// SEINES Spielers (Anführer-Held × sein Anteil + Mitglieds-Helden × deren Anteil – Alexander: jeder Held zählt nur für seine Truppen)
function heroDefCut(a) {
    const c = h => h ? Math.min(90, h.def || 0) / 100 : 0;
    if (!a || !a.rally || !Array.isArray(a.rally.an) || !a.rally.an.some(x => x && x[0] !== a.rally.by)) return c(a && a.hx);
    const ganz = (a.rawTroops || 0) + (a.attackBonus || 0); if (!(ganz > 0)) return c(a.hx);
    const by = a.rally.by, k = {}, hx = {}; let andere = 0;
    for (const x of a.rally.an) if (x && x[0] !== by && x[3] != null) { const s = Math.max(0, x[2] + x[3]); k[x[0]] = (k[x[0]] || 0) + s; andere += s; if (x[4] && !hx[x[0]]) hx[x[0]] = x[4]; }
    let cut = c(a.hx) * Math.max(0, ganz - andere) / ganz;
    for (const w in k) cut += c(hx[w]) * k[w] / ganz;
    return Math.min(.9, cut);
}
function heroDefPart(parts, a, full) {
    const cut = Math.round(full * heroDefCut(a)); if (!cut) return parts;
    const hd = a.hx && heroById(a.hx.id), mit = a.rally && Array.isArray(a.rally.an) && a.rally.an.some(x => x && x[0] !== a.rally.by && x[4]);
    parts.push([hd ? 'Held ' + hd.name + (a.hx.id2 && heroById(a.hx.id2) ? ' & ' + heroById(a.hx.id2).name : '') + (mit ? ' + Helden der Verbündeten' : '') : 'Helden der Verbündeten', -cut,
        'Verteidigung −' + Math.round(heroDefCut(a) * 100) + ' %' + (mit ? ' (je Held nach Anteil seines Spielers)' : '')]); return parts;
}
function attackFields(who, src, target, raw, hx) {      // everything an attack takes along at launch (skills, gear, title, hero) - for you and for everyone else
    const bot = who !== 'player', sk = bot ? Math.round(raw * botMults(who).attackPct / 100) : attackFlatBonus(raw);
    const hb = hx ? Math.round(raw * hx.atk / 100) + heroGefOf(hx, raw) : 0;   // (der Helden-Anteil – fällt weg, wenn der Angreifer im Kampf schon 2 Helden hat)
    return { attackBonus: sk + hb, heldBonus: hb, skillBonus: sk, skillLvl: bot ? loadBotState()[who].skills.attack : skills.attack || 0,
        attackGoldRate: bot ? botGoldRate(who, 'attackGold') : (skills.attackGold || 0) * SKILL_DEFS.attackGold.rate, rewardGoldRate: killGoldRate(who, hx),
        shieldLossReductionPct: Math.min(90, (bot ? botMults(who).shield : shieldLossReductionPct()) + (hx ? hx.loss : 0)), botShield: bot,
        atkTitle: titleMult(who, 'attack'), atkTitleKey: (titleOf(who) || {}).key || null, hero: hx ? hx.id : null, hero2: hx && hx.id2 || null, hx: hx || null,
        atkKraft: AUF ? AUF.kampf(who, 'a') : 1, atkFo: AUF ? AUF.foWert(who, 'm_atk') : 0 };   // Forschung Angriff (Paket D)
}
// Removes an island from whichever owner (player or a bot) it
// currently belongs to, without touching its troops/level - used
// right before handing it to whoever just conquered it.
function clearIslandOwner(islandId) {
    ownedIslands.delete(islandId);
    for (const bot of BOT_DEFS) botOwnedIslands[bot.id].delete(islandId);
}

// Many things change many times a second (150 rivals): the save is written at most once a second, and when the page goes away.
var saveGameTimer = null;
function saveGame() { if (!saveGameTimer) saveGameTimer = setTimeout(saveGameNow, 1000); }
window.addEventListener('pagehide', () => { if (saveGameTimer) saveGameNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveGameTimer) saveGameNow(); });
function saveGameNow() {
    clearTimeout(saveGameTimer); saveGameTimer = null;
    store.set('openWaterOwnedIslands', JSON.stringify([...ownedIslands]));
    store.set('openWaterIslandLevels', JSON.stringify(islandLevels));
    store.set('openWaterIslandTroops', JSON.stringify(islandTroops));
    store.set('openWaterCoins', String(coins));
    store.set('openWaterGems', String(gems));
    store.set('openWaterTempleHoldSince', JSON.stringify(templeHoldSince));
    store.set('openWaterScoutedIslands', JSON.stringify([...scoutedIslands]));
    store.set('openWaterNeutralTroopOverrides', JSON.stringify(neutralTroopOverrides));
    const botOwnedForSave = {};
    for (const bot of BOT_DEFS) botOwnedForSave[bot.id] = [...botOwnedIslands[bot.id]];
    store.set('openWaterBotOwnedIslands', JSON.stringify(botOwnedForSave));
    store.set('openWaterBotCoins', JSON.stringify(botCoins));
}

const coinCountEl = document.getElementById('coinCount');
const gemCountEl = document.getElementById('gemCount');
const troopCountEl = document.getElementById('troopCount');
function totalTroops() {
    let sum = 0;
    for (const ownedId of ownedIslands) sum += islandTroops[ownedId] || 0;
    return sum;
}
// The same multipliers runProductionTick uses (equipment/skills, ruler bonus, titles)
function cityLevelSafe(id) { try { return loadCity().levels[id] || 0; } catch (e) { return 0; } }   // (the city isn't set up during the first boot steps)
function playerCoinMult() { return coinProductionMultiplier() * (rulerOwner() === 'player' ? RULER_BONUS : 1) * titleMult('player', 'coins') * bundProdFaktor('player') * (AUF ? AUF.ertrag('player') : 1); }
function bundProdFaktor(who) { return typeof bundProdMult === 'function' ? bundProdMult(who) : 1; }   // Tempel-Bonus des Bündnisses
function playerTroopMult() { return troopProductionMultiplier() * (rulerOwner() === 'player' ? RULER_BONUS : 1) * titleMult('player', 'troops') * bundProdFaktor('player'); }
function totalTroopProductionPerTick() {
    let sum = 0; const m = playerTroopMult();
    for (const ownedId of ownedIslands) {
        sum += troopsPerTick(islandLevels[ownedId] || 1) * m;
        const isl = islandById[ownedId];
        if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) sum += Math.round(TEMPLE_TROOP_BONUS_PER_TICK * templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player'));
    }
    return sum;
}
function shrineMult(who) { return 1 + (AUF ? AUF.tempelPlus(who) : 0); }   // Forschung „Tempel“ im Labor (früher der Tempelschrein)
function totalCoinProductionPerTick() {
    let sum = 0; const m = playerCoinMult();
    for (const ownedId of ownedIslands) {
        sum += coinsPerTick(islandLevels[ownedId] || 1) * m;
        const isl = islandById[ownedId];
        if (isl && (isl.type === 'temple' || isl.type === 'megaTemple')) sum += Math.round(TEMPLE_COIN_BONUS_PER_TICK * templeBaseMult(isl) * templeHoldMultiplier(ownedId) * shrineMult('player'));
    }
    return sum;
}
function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }        // DOM writes only on a change: an equal write still costs a layout
function setShown(el, on) { const d = on ? 'block' : 'none'; if (el && el.style.display !== d) el.style.display = d; }
function updateHud() {
    const troops = totalTroops();
    setText(coinCountEl, fmtCompact(Math.floor(coins)));
    const tc = fmtNum(Math.floor(coins)) + ' Münzen', tg = fmtNum(Math.floor(gems)) + ' Gems', tt = fmtNum(troops) + ' Truppen';
    if (coinCountEl.parentNode.title !== tc) coinCountEl.parentNode.title = tc;
    setText(gemCountEl, fmtCompact(Math.floor(gems)));
    if (gemCountEl.parentNode.title !== tg) gemCountEl.parentNode.title = tg;
    setText(troopCountEl, fmtCompact(troops));
    if (troopCountEl.parentNode.title !== tt) troopCountEl.parentNode.title = tt;
    if (AUF) AUF.hud();                                                       // Holz, Stein, Eisen (aufbau.js)
    requestRender();   // HUD changes coincide with state changes -> the map may need a redraw
}
// Desktop player plate (#hudPlayer). Called at boot, from the 1s
// interval and from renderProfile(). It reads playerLvl, profileName
// and RANK_TIERS, which are declared further down, so it must never
// run before the script has passed those lines.
function updateHudPlayer() {
    setText(document.getElementById('hudName'), profileName.value || 'Du');
    setText(document.getElementById('hudLevel'), playerLvl);
    setText(document.getElementById('hudRankLine'), rulerOwner() === 'player' ? 'Herrscher der Meere' : 'Rang ' + currentRank());
}
updateHud();

// Equipment: bought with coins, each level grants a small permanent
// global bonus. Skills: bought with skill points earned by capturing
// towers, same idea, separate currency.
const EQUIPMENT_DEFS = {
  weapon: { icon: 'weapon', name: 'Waffe',   desc: 'Truppenproduktion', pct: 2 },
  armor:  { icon: 'armor',  name: 'Rüstung', desc: 'Verteidigung aller Basen', pct: 2 },
  shield: { icon: 'shield', name: 'Schild',  desc: 'weniger Truppenverlust bei Sieg', pct: 2 },
  boots:  { icon: 'boots',  name: 'Stiefel', desc: 'Münzproduktion', pct: 2 }
};
const SKILL_DEFS = {
  speed:       { icon: 'hourglass', name: 'Geschwindigkeit',    desc: 'schnellere Produktion und Märsche', msPerLevel: 40, max: 10 },
  troops:      { icon: 'troops',    name: 'Truppenherstellung', desc: 'Truppenproduktion', pct: 3, max: 50 },
  defense:     { icon: 'defense',   name: 'Verteidigung',       desc: 'jede Basis verteidigt mit mehr Truppen', defPct: 3, max: 50 },
  defenseGold: { icon: 'shield',    name: 'Verteidigung: Gold', desc: 'Gold pro getöteter Truppe', rate: 0.3, max: 50 },
  attack:      { icon: 'attack',    name: 'Angriff',            desc: 'mehr Truppen bei jedem Angriff', atkPct: 3, max: 50 },
  attackGold:  { icon: 'sell',      name: 'Angriff: Gold',      desc: 'Gold pro getöteter Truppe', rate: 0.3, max: 50 }
};
const EQUIPMENT_BASE_COST = 100;

