// Teil 09c-events-drache.js: Events: Wochen-Event (Mo–Fr, Tages-Kisten, Wochen-Rangliste), Event-Fenster, gemeinsame Event-Bausteine
// ===== WOCHEN-EVENT (Alexander 8.10.): jede Woche gleich – Mo Bauherr · Di Krieger · Mi Sammeln · Do Boss-Jagd · Fr Helden-Tag.
// Nur das Event des Tages zählt. Je Tag 5 Tages-Kisten (nach Punkten des Tages, nicht abgeholt → Abholfach), Wochen-Rangliste
// (Mo–Fr zusammen), Auswertung Fr 20 Uhr ins Abholfach. Punkte zählt nur, wer rechnet (Weltrechner). Welt-Schlüssel: openWaterEvents (evState.wo).
const WO_TAGE = [
    { k: 'bau', kurz: 'Mo', name: 'Bauherr', ic: 'upgrade', pkt: [['upgrade', 'Gebäude oder Basis eine Stufe ausbauen', '30 P. × Stufe'], ['hourglass', 'Je Minute Beschleunigen (Bauen, Forschen)', '1 P.'], ['gem', 'Je Edelstein fürs Beschleunigen', '2 P.']] },
    { k: 'krieg', kurz: 'Di', name: 'Krieger', ic: 'attack', pkt: [['attack', 'Je getötete gegnerische Truppe', '1 P.'], ['shield', 'Gilt im Angriff und in der Abwehr – nicht im Barbaren-Lager', '']] },
    { k: 'sam', kurz: 'Mi', name: 'Sammeln', ic: 'crate', pkt: [['crate', 'Je 100 Rohstoffe von der Karte gesammelt', '1 P.'], ['flag', 'Alle Felder auf der Karte zählen', '']] },
    { k: 'boss', kurz: 'Do', name: 'Boss-Jagd', ic: 'crown', pkt: [['crown', 'Der Tagesboss erscheint nur heute auf der Karte', ''], ['attack', 'Je 1.000 Schaden am Boss', '1 P.']] },
    { k: 'held', kurz: 'Fr', name: 'Helden-Tag', ic: 'star', pkt: [['star', 'Held eine Stufe aufsteigen', '100 P.'], ['shield', 'Ausrüstung schmieden oder verbessern', '150 P.'], ['crate', 'Kiste öffnen', '120 P.']] }
];
const WO_PKT = { bauStufe: 30, bauMin: 1, bauGem: 2, samJe: 100, bossJe: 1000, held: 100, schmiede: 150, kiste: 120 };   // Punkte je Tat (ZAHLEN_WOCHE)
const WO_ENDE_STUNDE = 20, WO_TOP = 50;                // Fr 20 Uhr Auswertung · so viele Plätze merkt sich die letzte Woche
// Tages-Kisten (jeden Tag gleich, Punkte des Tages); kb: Kisten-Bild der Leiste. besch: Beschleuniger-Dauer (gemeinsame Namen, Team C)
const WO_KISTEN = [{ ab: 1000, kb: 'kiste_ausruestung', em: 50, gems: 10, besch: '5m' }, { ab: 3000, kb: 'kiste_gross', em: 100, gems: 20, besch: '15m' },
    { ab: 6000, kb: 'kiste_gross', em: 150, gems: 30, besch: '1h' }, { ab: 12000, kb: 'kiste_episch', em: 250, gems: 50, besch: '3h' },
    { ab: 20000, kb: 'kiste_royal', em: 400, gems: 80, s1: 1, besch: '8h' }];
// Wochen-Rangliste: Preise nach Platz (alle mit mind. 1 Punkt bekommen etwas)
const WO_RANG = [{ bis: 1, t: 'Platz 1', band: 'p1', bild: 'ui_rang_legende', em: 3000, gems: 500, s2: 3, s1: 10, besch: '24h' },
    { bis: 2, t: 'Platz 2', band: 'p2', bild: 'ui_rang_diamantherzog', em: 2200, gems: 350, s2: 2, s1: 8, besch: '24h' },
    { bis: 3, t: 'Platz 3', band: 'p3', bild: 'ui_rang_goldfuerst', em: 1700, gems: 250, s2: 1, s1: 6, besch: '8h' },
    { bis: 10, t: 'Platz 4–10', band: 'p4', bild: 'ui_rang_platingraf', em: 1000, gems: 150, s2: 1, s1: 4, besch: '8h' },
    { bis: 50, t: 'Platz 11–50', band: 'p4', bild: 'ui_rang_silberritter', em: 500, gems: 80, s1: 2, besch: '3h' },
    { bis: Infinity, t: 'Ab Platz 51', zusatz: 'alle mit mind. 1 Punkt', band: 'p5', bild: 'ui_rang_neuling', em: 200, gems: 20, s1: 1, besch: '1h' }];


let woWinMemo = null;
function woWin(now) {                                 // diese oder (nach Fr 20 Uhr) nächste Woche, Mo 0:00 – Fr 20:00: { on, start, end, key }
    now = now || Date.now(); const m = woWinMemo; if (m && now >= m.from && now < m.to) return m.w;
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Montag dieser Woche
    const ende = t => { const e = new Date(t); e.setDate(e.getDate() + 4); e.setHours(WO_ENDE_STUNDE, 0, 0, 0); return e.getTime(); };
    let start = d.getTime(), key = todayKey(d), end = ende(start);
    if (now >= end) { const n = new Date(start); n.setDate(n.getDate() + 7); start = n.getTime(); key = todayKey(n); end = ende(start); }   // Wochenende: frei (Thron-Event)
    const on = now >= start && now < end;
    woWinMemo = { w: { on, start, end, key }, from: on ? start : now, to: on ? end : start }; return woWinMemo.w;
}
function woOn(now) { return woWin(now).on; }
function woTagNr(now) { const t = new Date(now || Date.now()); return (t.getDay() + 6) % 7; }   // 0 = Montag … 4 = Freitag (5, 6 = Wochenende)
function woHeute(now) { now = now || Date.now(); return woOn(now) ? WO_TAGE[woTagNr(now)] || null : null; }   // das Tages-Event, das gerade zählt (oder null)
function woTagEnde(now) { now = now || Date.now(); const m = new Date(now); m.setHours(24, 0, 0, 0); return Math.min(m.getTime(), woWin(now).end); }
function woSt() { return evState.wo || (evState.wo = { tp: {}, kl: {} }); }
const woSumme = W => { const o = {}; for (const w in W.tp || {}) o[w] = (W.tp[w] || []).reduce((a, x) => a + (x || 0), 0); return o; };
function woRoll(now) {                                // (nur wer rechnet) eine fertige Woche zahlt einmal aus, eine neue beginnt leer
    const W = woSt(), w = woWin(now);
    if (W.key && !W.paid && now >= W.end) woPay();
    if (w.on && W.key !== w.key) { Object.assign(W, { key: w.key, end: w.end, tp: {}, kl: {}, paid: false }); evDirty = true; }
}
function evPunkte(kind, who, n) {                     // eine Tat: zählt nur, wenn heute ihr Tag ist (und nur beim Weltrechner)
    if (!rechnet() || !who || !(n > 0) || (who !== 'player' && !botById[who])) return; const now = Date.now(), tag = woHeute(now); if (!tag || tag.k !== kind) return;
    woRoll(now); const W = woSt(), i = woTagNr(now), tp = W.tp[who] || (W.tp[who] = [0, 0, 0, 0, 0]);
    tp[i] = Math.round((tp[i] + n) * 10) / 10; evDirty = true; woKisten(W, who, i, now);
}
function woKisten(W, who, i, now) {                   // erreichte Tages-Kisten genau einmal – bis Tagesende im Event abholbar, danach im Abholfach
    const kl = W.kl[who] || (W.kl[who] = [0, 0, 0, 0, 0]), p = (W.tp[who] || [])[i] || 0;
    while (kl[i] < WO_KISTEN.length && p >= WO_KISTEN[kl[i]].ab) { const x = WO_KISTEN[kl[i]];
        evPreis(who, 'woche', 'Wochen-Event ' + WO_TAGE[i].name + ' · ' + fmtNum(x.ab) + ' P.', x, W.key + '|' + i + '|' + kl[i], woTagEnde(now)); kl[i]++; }
}
function woPay() {                                    // Fr 20 Uhr: Preise nach Platz – du, echte Spieler und Mitspieler gleich, ins Abholfach
    const W = woSt(), list = evRang(woSumme(W)).filter(e => e[1] >= 1);
    W.paid = true; let me = 0;
    list.forEach(([who], i) => { const p = WO_RANG.find(x => i + 1 <= x.bis); evPreis(who, 'woche', 'Wochen-Rangliste · Platz ' + (i + 1), p, W.key); if (who === 'player') me = i + 1; });
    W.last = { key: W.key, top: list.slice(0, WO_TOP).map(e => [e[0], Math.floor(e[1])]), n: list.length, me };
    evDirty = true; saveBotState(); saveEv();
    if (me) afterSplash(() => setTimeout(() => flashHint('Wochen-Event vorbei: Platz ' + me + ' – dein Preis liegt unter Events → Abholen.', 6000), 2500));
}

// ---- gemeinsamer Zustand ----
var evState = (() => { try { return JSON.parse(store.get('openWaterEvents')) || null; } catch (e) { return null; } })() || {};
let evDirty = false, evSaveAt = 0;
function saveEv() { evDirty = false; evSaveAt = Date.now(); store.set('openWaterEvents', JSON.stringify(evState)); }
window.addEventListener('pagehide', () => { if (evDirty && rechnet()) saveEv(); });
const evRang = o => Object.entries(o || {}).filter(e => e[1] > 0 && (e[0] === 'player' || botById[e[0]])).sort((a, b) => b[1] - a[1]);
// Belohnung „N Std. Münzen / Truppen“ (mh, th): so viel, wie das Reich in N Stunden erzeugt (wie beim Pass) – rechnet, wer auszahlt
function evStunden(who, p, hp0) {
    let hp = hp0 || null; const h = () => hp || (hp = hourProduction(who));
    return { coins: p.mh > 0 ? Math.round(Math.max(wirtM(5000), h().coins) * p.mh) : 0, tr: p.th > 0 ? Math.round(Math.max(wirtK(500), h().troops) * p.th) : 0 };
}
const evDing = p => ({ em: Math.round(p.em || 0), s1: Math.round(p.s1 || 0), s2: Math.round(p.s2 || 0), besch: BESCH_MIN[p.besch] ? p.besch : undefined });   // Event-Münzen, Schlüssel, Beschleuniger
function evPreis(who, src, title, p, schl, bis) {     // schl: fester Schlüssel der Auszahlung (Woche, Tag, Stufe …) – kommt nie doppelt an; ein Preis: deiner ins Abholfach, ein echter Mitspieler bekommt ihn als Nachricht (auch Kisten), Mitspieler direkt
    // bis: Ende des Tages-Events – bis dahin nur im Event abholbar, danach im Abholfach
    const gems = Math.round(p.gems || 0), sh = Math.round(p.sh || 0), crate = p.crate >= 0 ? p.crate : -1, titel = saisonTitel(p.titel) ? p.titel : null;   // titel: Saison-Platz (Erfolg; der Saison-Rahmen kommt aus saison.last)
    const { coins, tr } = evStunden(who, p), k = schl != null ? src + '|' + schl : undefined;   // k: das Abholfach kennt die Stufe (Leiste im Event-Fenster)
    let b = Array.isArray(p.b) && p.b.length ? p.b : undefined;   // b: Gegenstände [Art, Menge, Extra] (Thron-Event)
    { const d = evDing(p); b = [...(b || []), ...(d.em ? [['eventMuenzen', d.em]] : []), ...(d.s1 ? [['schluessel1', d.s1]] : []), ...(d.s2 ? [['schluessel2', d.s2]] : []), ...(d.besch ? [['besch', 1, { dauer: d.besch }]] : [])]; if (!b.length) b = undefined; }   // A: Event-Münzen/Schlüssel/Beschleuniger als Gegenstände
    if (!(bis > Date.now())) bis = undefined;
    if (who === 'player') { inboxAdd({ src, title, gems, sh, crate, coins, tr, k, bis, b }); if (titel) saisonTitelGeben(titel); return; }
    const bd = botById[who]; if (!bd) return;
    if (titel) { const b0 = loadBotState()[who]; if (b0) { b0.sTitel = [...new Set([...(b0.sTitel || []), titel])]; saveBotState(); } }   // die vergebenen Saison-Titel führt nur, wer rechnet (ein Profil kann sich keinen eintragen)
    if (bd.mensch && window.WELT && b) { for (const [a, n] of b) if (a === 'holz' && AUF) AUF.rohDazu(who, { h: n }); b = b.filter(x => x[0] !== 'holz'); if (!b.length) b = undefined; }   // Holz gleich in seinen Topf (kommt mit dem nächsten Puls, das Hauptbuch kennt es)
    if (bd.mensch && window.WELT) { WELT.nachricht(parseInt(who.slice(1), 10), Object.assign({ art: 'evPreis', src, title, gems, sh, crate }, coins ? { coins } : {}, tr ? { tr } : {}, k ? { k } : {}, bis ? { bis } : {}, titel ? { titel } : {}, b ? { b } : {}, b ? beuteFelder(b) : {}), k); return; }   // (Münzen/Truppen: Gutschrift im Schummel-Schutz, 10d)
    const bs = loadBotState()[who]; if (bs) bs.gems = (bs.gems || 0) + gems; if (sh) heroGrantShards(who, sh); if (crate >= 0) barbCrate(who, crate);
    if (coins) botCoins[who] = (botCoins[who] || 0) + coins; if (tr) { const cap = botCapitalOf(who); if (cap !== null && cap !== undefined) islandTroops[cap] = (islandTroops[cap] || 0) + tr; }
    for (const [a, n, e] of b || []) beuteBot(who, a, n, e);
    if (bs && titel) { bs.titles = [...new Set([...(bs.titles || []), titel])]; saveBotState(); }
}
function beuteFelder(b) {                            // Gegenstände für das Hauptbuch (10d, Team C): em, s1, s2, besch {Dauer: Anzahl}
    const o = {}; for (const [a, n, e] of b) { if (a === 'eventMuenzen') o.em = (o.em || 0) + n; else if (a === 'schluessel1') o.s1 = (o.s1 || 0) + n; else if (a === 'schluessel2') o.s2 = (o.s2 || 0) + n;
        else if (a === 'besch' && e && e.dauer) { o.besch = o.besch || {}; o.besch[e.dauer] = (o.besch[e.dauer] || 0) + n; } }
    return o;
}
function evBericht(who, e, hint) {                    // ein kurzer Eintrag im Kampflog (dir direkt, echten Mitspielern über den Weltrechner)
    if (who === 'player') { addCombatLogEntry(e); if (hint) flashHint(hint, 4500); return; }
    if (window.WELT && botById[who] && botById[who].mensch) WELT.bericht(who, e, hint);
}

// ---- jede Sekunde ----
function evTick() {
    const now = Date.now();
    if (rechnet()) { try { woRoll(now); } catch (e) { console.warn('Events:', e); } if (evDirty && now - evSaveAt > 2000) saveEv(); }
    for (const el of document.querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));
    if (evOffen() && now - evRenderAt > 2500) renderEvents();
}
setInterval(evTick, 1000);

// ---- die Ereignisse im Events-Fenster (Dock → Events, Reiter „Ereignisse“): Chips Woche · Lager ----
var evTab = 'tour', evRenderAt = 0, woSicht = null, woBelohn = false;   // woSicht: angesehener Tag (0–4) oder 'rang'; null = heute
const evUhr = (bis) => '<b data-ev-bis="' + bis + '">' + fmtDHMS(Math.max(0, bis - Date.now()) / 1000) + '</b>';
const evWann = t => { const d = new Date(t); return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function evRangHtml(list, fmt, lim) {                // Top 10 (+ deine Zeile)
    const mi = list.findIndex(e => e[0] === 'player');
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + whoLink(e[0], fieldWhoName(e[0])) + '</span><b>' + fmt(e[1]) + '</b></li>';
    return list.length ? '<ol class="barb-rank">' + list.slice(0, lim || 10).map(row).join('') + (mi >= (lim || 10) ? row(list[mi], mi) : '') + '</ol>' : '';
}
function evKarte(ic, titel, sub, inhalt, cls, art) {   // art: mit Bild-Banner (Titel + Uhr darauf) statt Textzeile
    return '<div class="barb-card ev-card' + (cls ? ' ' + cls : '') + (art ? ' ev-mit-bild' : '') + '">' + (art ? evBanner(art, icon(ic) + ' ' + titel, sub) : '<div class="barb-ct"><b>' + icon(ic) + ' ' + titel + '</b><small>' + sub + '</small></div>') + inhalt + '</div>'; }
// ---- Bild-Banner (Vorbild RoK/Call of Dragons): je Ereignis eine gezeichnete Szene, Titel und Uhr darauf ----
const EV_BILD = {                                    // Himmel oben, unten, Licht
    tour: ['#1a0f2e', '#5b2f92', '#c9a2ff'], rally: ['#0a1424', '#2c5585', '#9cc8ff'], tempel: ['#0e1a20', '#7a5e26', '#ffe4a0'],
};
const EV_SZENE = {                                   // S: Schattenriss, L: Licht
    tour: (S, L) => '<g transform="translate(40 0)">' + [[300, 40], [300, -40]].map(([x, r]) => '<g transform="translate(' + x + ' 58) rotate(' + r + ')"><path d="M-3 -44 L0 -52 L3 -44 V18 H-3Z" fill="#e8dcc8"/><rect x="-12" y="18" width="24" height="4" fill="' + L + '"/><rect x="-2" y="22" width="4" height="13" fill="' + S + '"/></g>').join('') +
        [236, 346].map(x => '<path d="M' + x + ' 104 V28" stroke="' + S + '" stroke-width="3"/><path d="M' + x + ' 30 h22 v32 l-11 -7 l-11 7Z" fill="#7a3fc0" stroke="' + L + '" stroke-width="1"/>').join('') +
        [[210, 18], [262, 12], [338, 16], [370, 30], [222, 44]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="1.3" fill="' + L + '"/>').join('') + '</g>',
    rally: (S, L) => '<g fill="' + S + '"><path d="M200 110 Q300 70 400 92 V110Z"/>' + Array.from({ length: 11 }, (_, i) => { const x = 212 + i * 17, y = 100 - Math.sin(i / 10 * Math.PI) * 14 - i;
            return '<path d="M' + x + ' ' + y + ' v-13 h5 v13Z"/><circle cx="' + (x + 2.5) + '" cy="' + (y - 16) + '" r="3"/><path d="M' + (x + 5) + ' ' + y + ' L' + (x + 7) + ' ' + (y - 30) + ' L' + (x + 8) + ' ' + (y - 30) + ' L' + (x + 6) + ' ' + y + 'Z"/>'; }).join('') +
        '<path d="M300 84 V20 h3 V84Z"/></g><path d="M303 22 L342 28 L328 36 L342 44 L303 48Z" fill="#f2c75c"/><path d="M314 30 l6 5 l-6 5 l-6 -5Z" fill="' + S + '"/>',
    tempel: (S, L) => '<g fill="' + L + '" opacity=".14"><path d="M310 0 L270 110 H300Z"/><path d="M310 0 L320 110 H350Z"/></g><g fill="' + S + '"><path d="M248 104 h124 v-6 h-124Z M254 98 h112 v-6 h-112Z"/>' +
        Array.from({ length: 6 }, (_, i) => '<rect x="' + (262 + i * 18) + '" y="56" width="8" height="36"/>').join('') + '<rect x="256" y="50" width="108" height="6"/><path d="M252 50 L310 28 L368 50Z"/></g><circle cx="310" cy="42" r="3" fill="' + L + '"/>',
};
function evBild(art) {
    const [o, u, l] = EV_BILD[art], id = 'evb-' + art, S = '#100b08';
    return '<svg class="ev-bild" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + o + '"/><stop offset="1" stop-color="' + u + '"/></linearGradient>' +
        '<radialGradient id="' + id + 'l"><stop offset="0" stop-color="' + l + '" stop-opacity=".7"/><stop offset="1" stop-color="' + l + '" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="400" height="110" fill="url(#' + id + ')"/><circle cx="300" cy="50" r="72" fill="url(#' + id + 'l)"/><path d="M0 92 Q60 78 120 88 T240 84 T400 86 V110 H0Z" fill="' + S + '" opacity=".5"/>' +
        EV_SZENE[art](S, l) + '<path d="M0 102 Q100 96 200 101 T400 99 V110 H0Z" fill="' + S + '"/></svg>';
}
function evBanner(art, titel, sub) { return '<div class="ev-banner ev-banner--' + art + '">' + evBild(art) + '<div class="ev-banner-t"><b>' + titel + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>'; }
// lange Erklärung zum Aufklappen („i“ wie bei RoK) – offen bleibt offen, auch wenn das Fenster neu zeichnet (nur im Speicher)
const infoAuf = {};
function infoKlapp(key, titel, inhalt) { return '<details class="lb-info ev-info" data-info="' + key + '"' + (infoAuf[key] ? ' open' : '') + '><summary>' + icon('info') + '<span>' + titel + '</span></summary>' + inhalt + '</details>'; }
document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.info) infoAuf[d.dataset.info] = d.open; }, true);
// leerer Zustand: Symbol, eine Zeile groß, eine klein, höchstens EIN goldener Knopf
function leerHtml(ic, titel, text, knopf) { return '<div class="empty-state ev-leer">' + icon(ic) + '<b>' + titel + '</b><span>' + text + '</span>' + (knopf || '') + '</div>'; }
const rangLeer = text => leerHtml('rank', 'Noch niemand auf der Liste', text);   // leere Rangliste: Symbol + Satz
// ---- Belohnungs-Leiste wie RoK: Balken mit Kisten an den Stufen; erreicht = leuchtet + „Abholen“ (bis Tagesende nur hier, danach auch im Abholfach),
// abgeholt = offene Kiste mit Haken. Was erreicht und bezahlt ist, sagt der Weltrechner (evState), das Fach sagt „abgeholt“. ----
function evHolBereit(tab) { const q = tab === 'tour' ? 'woche' : tab; return inboxList().some(x => x.src === q); }   // (läuft schon beim Laden – nichts aus diesem Teil davor)
let evHpMemo = null;
function evBeute(p) {                                 // Kacheln einer Belohnung: Event-Münzen, Edelsteine, Schlüssel, Beschleuniger (Stunden Münzen/Truppen mit deinen Zahlen von jetzt)
    const now = Date.now(); if (!evHpMemo || now - evHpMemo.t > 5000) evHpMemo = { t: now, hp: hourProduction('player') };
    const { coins, tr } = evStunden('player', p, evHpMemo.hp), d = evDing(p);
    return [{ a: 'eventMuenzen', n: d.em }, { a: 'gems', n: p.gems }, { a: 'schluessel2', n: d.s2 }, { a: 'schluessel1', n: d.s1 }, d.besch && { a: 'besch', dauer: d.besch, n: 1 },
        { a: 'coins', n: coins }, { a: 'tr', n: tr }, { a: 'sh', n: p.sh }, p.crate >= 0 && { a: 'kiste', k: kisteVonR(p.crate), r: p.crate, min: p.crate > 0 }];
}
const evHolKnopf = (schl, txt) => '<button class="btn btn--primary btn--sm" type="button" data-ev-hol="' + escapeHtml(schl) + '"><span>' + (txt || 'Abholen') + '</span></button>';
function evLeistePos(stufen, wert) {                  // wie weit der Balken reicht (0–1): Stufe i sitzt in der Mitte ihrer Spalte
    const n = stufen.length; let k = 0; while (k < n && wert >= stufen[k].ab) k++;
    if (k >= n) return 1; const a = k ? stufen[k - 1].ab : 0, f = Math.max(0, Math.min(1, (wert - a) / Math.max(1e-9, stufen[k].ab - a)));
    return Math.max(0, (k ? k - .5 + f : f * .5) / n);
}
// o: { stufen (mit kb: Kisten-Bild), schl(i): Schlüssel im Abholfach, erreicht(i), bezahlt(i), pos 0–1, label(x, i) }
function evLeisteHtml(o) {
    const L = inboxList(), n = o.stufen.length;
    const st = o.stufen.map((x, i) => L.some(y => y.k === o.schl(i)) ? 'hol' : !o.erreicht(i) ? 'zu' : o.bezahlt(i) ? 'ok' : 'bald');
    const knoten = o.stufen.map((x, i) => { const s = st[i], tag = s === 'hol' ? 'button' : 'span';
        return '<' + tag + (s === 'hol' ? ' type="button" data-ev-hol="' + escapeHtml(o.schl(i)) + '"' : '') + ' class="evl-k is-' + s + '" title="' + escapeHtml(o.label(x, i)) + '"><span class="evl-bild"><img src="bilder/' + x.kb + (s === 'ok' ? '_offen' : '_zu') + '.webp" alt="" draggable="false">' +
            (s === 'ok' ? '<i class="evl-haken"><img src="bilder/ui_sym_haken.webp" alt="abgeholt" draggable="false"></i>' : '') + '</span><small>' + o.label(x, i) + '</small></' + tag + '>'; }).join('');
    const zeile = (x, i) => { const s = st[i];
        return '<div class="evl-z is-' + s + '"><b>' + o.label(x, i) + ' P.</b>' + beuteRaster(evBeute(x), 'bk-mini') + '<span class="evl-st">' +
            (s === 'hol' ? evHolKnopf(o.schl(i)) : s === 'ok' ? '<img src="bilder/ui_sym_haken.webp" alt="" draggable="false"><small>Abgeholt</small>' : s === 'bald' ? '<small>kommt gleich</small>' : icon('lock')) + '</span></div>'; };
    return '<div class="evl" style="--n:' + n + '"><div class="evl-bahn"><div class="evl-spur"><i style="width:' + (o.pos * 100).toFixed(1) + '%"></i></div>' + knoten + '</div></div>' +
        '<div class="evl-zeilen">' + o.stufen.map(zeile).join('') + '</div>';
}
function evHolen(schl) {                              // „Abholen“: eine Stufe (Schlüssel) oder alles einer Quelle („src:woche“) aus dem Abholfach
    const quelle = schl.startsWith('src:') ? schl.slice(4) : null, ids = inboxList().filter(x => quelle ? x.src === quelle : x.k === schl).map(x => x.id);
    if (!ids.length) return renderEvents();
    const aus = [], kiste = inboxList().find(x => ids.includes(x.id) && x.crate >= 0), txt = ids.map(id => inboxClaim(id, aus)).filter(Boolean).join(', ');
    if (txt) { sfx('coin'); if (aus.length) beuteFenster('Abgeholt', aus, { kiste: kiste ? kisteVonR(kiste.crate) : null }); else flashHint('Abgeholt: ' + txt + '.', 4500); }
    updateGoalsBadge(); renderEvents();
}
// ---- Wochen-Event im Fenster: Tag-Leiste Mo–Fr + „Rangliste“, so gibt es Punkte, Tages-Kisten, Rangliste mit Preisen ----
const evKachelnHtml = (p, cls) => beuteRaster(evBeute(p), cls);
function woWappen(who) { let h = 0; for (const c of String(who)) h = (h * 31 + c.charCodeAt(0)) % 360; return '<img src="bilder/ui_wappen.webp" alt="" draggable="false" style="filter:hue-rotate(' + h + 'deg)">'; }   // (Wappen in der Farbe des Spielers)
const woBund = who => { const t = typeof bundTagVon === 'function' ? bundTagVon(who) : ''; return t ? '<small>[' + escapeHtml(t) + ']</small>' : ''; };
function woListe() {                                  // die Wochen-Rangliste: diese Woche live, sonst die letzte
    const now = Date.now(), w = woWin(now), W = evState.wo || {}, live = w.on && W.key === w.key;
    return live ? { live: true, list: evRang(woSumme(W)) } : { live: false, list: W.last && W.last.top ? W.last.top.filter(e => e[0] === 'player' || botById[e[0]]) : [], n: W.last ? W.last.n : 0 };
}
function woTageHtml(heute, sicht) {                   // 6 Felder: Mo–Fr (heute golden, sonst „vorbei“/„morgen“) und die Rangliste
    return '<div class="wo-tage">' + WO_TAGE.map((t, i) => '<button type="button" data-wo-sicht="' + i + '" class="' + [i === heute ? 'jetzt' : '', i === sicht ? 'an' : ''].join(' ').trim() + '"><b>' + t.kurz + '</b>' + icon(t.ic) + '<span>' + t.name + '</span><small>' +
        (heute < 0 ? t.kurz : i === heute ? 'heute' : i < heute ? 'vorbei' : i === heute + 1 ? 'morgen' : t.kurz) + '</small></button>').join('') +
        '<button type="button" data-wo-sicht="rang" class="t-rang' + (sicht === 'rang' ? ' an' : '') + '"><b>Woche</b><img src="bilder/ui_sym_pokal.webp" alt="" draggable="false"><span>Rangliste</span><small>Fr ' + WO_ENDE_STUNDE + ':00</small></button></div>';
}
function woPreiseHtml() { return '<div class="wo-preise">' + WO_RANG.map(x => '<div class="wo-rang"><div class="wo-band ' + x.band + '"><img src="bilder/' + x.bild + '.webp" alt="" draggable="false">' + x.t + (x.zusatz ? '<span>' + x.zusatz + '</span>' : '') + '</div>' + evKachelnHtml(x) + '</div>').join('') + '</div>'; }
function woZeile(e, i) { return '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em>' + woWappen(e[0]) + '<span>' + whoLink(e[0], fieldWhoName(e[0])) + woBund(e[0]) + '</span><b>' + fmtNum(Math.floor(e[1])) + '</b></li>'; }
function woRangHtml(heute) {                          // 6. Feld: Uhr bis Fr 20 Uhr, Umschalter Rangliste/Belohnungen, Podest Top 3, Liste bis 50, eigener Platz fest unten
    const now = Date.now(), w = woWin(now), R = woListe(), L = R.list, ich = L.findIndex(e => e[0] === 'player');
    const pod = (i, kl) => { const e = L[i]; if (!e) return '<div class="wo-pod ' + kl + '"></div>';
        return '<div class="wo-pod ' + kl + '"><div class="wp">' + (i === 0 ? '<img class="lb" src="bilder/ui_lorbeer.webp" alt="" draggable="false">' : '') + woWappen(e[0]) + '<i>' + (i + 1) + '</i></div><div class="nm">' + whoLink(e[0], fieldWhoName(e[0])) + '</div><div class="bd">' + (woBund(e[0]) || '–') + '</div><div class="pt">' + fmtNum(Math.floor(e[1])) + '</div><div class="sockel">' + (i + 1) + '</div></div>'; };
    const kopf = '<div class="barb-card ev-card is-tour"><div class="barb-ct"><b>' + icon('rank') + ' Wochen-Rangliste</b><small>Mo–Fr zusammen</small></div>' + woTageHtml(heute, 'rang') +
        '<div class="wo-uhr">' + icon('hourglass') + (w.on ? '<span>Auswertung Fr ' + WO_ENDE_STUNDE + ':00 in</span>' + evUhr(w.end) : '<span>Ausgewertet · neue Woche in</span>' + evUhr(w.start)) + '</div>' +
        '<div class="wo-um"><button type="button" data-wo-belohn="0"' + (woBelohn ? '' : ' class="an"') + '>Rangliste</button><button type="button" data-wo-belohn="1"' + (woBelohn ? ' class="an"' : '') + '>Belohnungen</button></div></div>';
    if (woBelohn) return kopf + '<div class="lb-gap">Preise nach Platz · Freitag ' + WO_ENDE_STUNDE + ' Uhr im Abholfach</div>' + woPreiseHtml();
    if (!L.length) return kopf + rangLeer(w.on ? 'Sobald jemand Punkte holt, steht er hier.' : 'Am Montag geht es los.');
    return kopf + (R.live ? '' : '<div class="lb-gap">Letzte Woche · Endstand</div>') + '<div class="wo-podest">' + pod(1, 's') + pod(0, 'g') + pod(2, 'b') + '</div>' +
        '<ol class="wo-rl">' + L.slice(3, WO_TOP).map((e, i) => woZeile(e, i + 3)).join('') + '</ol>' +
        (ich >= 0 ? '<div class="wo-ich"><ol class="wo-rl">' + woZeile(L[ich], ich) + '</ol></div>' : '');
}
function woHtml() {                                   // das Wochen-Event: angesehener Tag (Punkte, Kisten) oder die Rangliste
    const now = Date.now(), w = woWin(now), heute = w.on ? woTagNr(now) : -1, sicht = woSicht === 'rang' ? 'rang' : woSicht !== null ? woSicht : heute >= 0 ? heute : 'rang';
    if (sicht === 'rang') return woRangHtml(heute);
    const T = WO_TAGE[sicht], W = evState.wo || {}, live = w.on && W.key === w.key, tp = live ? (W.tp || {}).player || [] : [], kl = live ? (W.kl || {}).player || [] : [];
    const R = woListe(), platz = R.live ? R.list.findIndex(e => e[0] === 'player') + 1 : 0, summe = tp.reduce((a, x) => a + (x || 0), 0), pkt = tp[sicht] || 0;
    const sub = !w.on ? 'Wochen-Event beginnt Mo in ' + evUhr(w.start) : sicht === heute ? 'Nur heute · endet in ' + evUhr(woTagEnde(now)) : sicht < heute ? 'Vorbei' : 'Kommt am ' + T.kurz;
    const boss = T.k === 'boss' && sicht === heute ? (() => { const b = dbossOnMap(); return b ? '<div class="barb-hp"><i style="width:' + (b.hp / b.max * 100).toFixed(1) + '%"></i><span>' + escapeHtml(b.name) + ' · ' + (b.hp <= 0 ? 'Besiegt' : fmtCompact(b.hp) + ' / ' + fmtCompact(b.max) + ' Leben') + '</span></div>' +
        (b.hp > 0 ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="boss">' + icon('send') + '<span>Zum Tagesboss</span></button>' : '') : ''; })() : '';
    const kopf = '<div class="barb-card ev-card is-tour"><div class="barb-ct"><b>' + icon(T.ic) + ' ' + T.kurz + ' · ' + T.name + '</b><small>' + sub + '</small></div>' + woTageHtml(heute, sicht) +
        '<div class="wo-meine"><div><b>' + fmtNum(Math.floor(pkt)) + '</b>' + (sicht === heute ? 'Punkte heute' : 'Punkte am ' + T.kurz) + '</div><div><b>' + fmtNum(Math.floor(summe)) + '</b>Woche' + (platz ? ' · Platz ' + platz : '') + '</div></div>' + boss + '</div>';
    const punkte = '<div class="lb-gap">So gibt es ' + (sicht === heute ? 'heute' : 'am ' + T.kurz) + ' Punkte</div><div class="wo-pkt">' + T.pkt.map(([ic, t, p]) => '<div>' + icon(ic) + '<span>' + t + '</span>' + (p ? '<b>' + p + '</b>' : '') + '</div>').join('') + '</div>';
    const hol = live && sicht <= heute && inboxList().filter(x => x.src === 'woche' && x.bis > now).length > 1 ? evHolKnopf('src:woche', 'Alles abholen') : '';
    const kisten = '<div class="lb-gap">Kisten ' + (sicht === heute ? 'heute' : 'am ' + T.kurz) + ' · ab Punkten des Tages</div>' + hol +
        evLeisteHtml({ stufen: WO_KISTEN, schl: n => 'woche|' + W.key + '|' + sicht + '|' + n, erreicht: n => live && pkt >= WO_KISTEN[n].ab, bezahlt: n => n < (kl[sicht] || 0), pos: live ? evLeistePos(WO_KISTEN, pkt) : 0, label: x => fmtNum(x.ab) });
    const top = R.list.slice(0, 5), ich = R.list.findIndex(e => e[0] === 'player');
    const rang = '<div class="lb-gap">' + (R.live ? 'Wochen-Rangliste · Mo–Fr zusammen' : 'Letzte Woche · Endstand') + '</div>' +
        (top.length ? '<ol class="wo-rl">' + top.map(woZeile).join('') + (ich >= 5 ? woZeile(R.list[ich], ich) : '') + '</ol><button class="btn btn--secondary btn--sm wo-alle" type="button" data-wo-sicht="rang">' + icon('rank') + '<span>Ganze Rangliste · Preise</span></button>' : rangLeer(w.on ? 'Sobald jemand Punkte holt, steht er hier.' : 'Am Montag geht es los.'));
    const thron = '<div class="wo-satz">' + icon('crown') + '<span>Samstag und Sonntag: <b>Thron-Event</b> – Kampf um den Königsthron.</span></div>';
    return kopf + punkte + kisten + rang + thron;
}
function evTourHtml() { return woHtml(); }            // Events → Chip „Woche“ (Schlüssel 'tour' von früher)

// ===== BARBAREN-LAGER im Fenster (letzter Chip): Tagesgrenze oben (Bild + Zahl + Balken), Münzen je Stufe, Schlüssel ab Stufe 10/20 =====
function evLagerHtml() {
    const rec = barbRec('player'), near = barbNearest(), offen = Math.min(BARB_MAX_L, rec.b + 1);
    const balken = (a, r, txt, hab, max) => '<div class="lg-grenze">' + beuteKachel({ a, n: 0, r, ohneZahl: true }) + '<span><b>' + txt + '</b><i style="--p:' + Math.min(100, Math.round(100 * hab / max)) + '%"></i></span></div>';
    const kopf = '<div class="barb-card ev-card"><div class="barb-ct"><b>' + icon('attack') + ' Barbaren-Lager</b><small>' + rec.n + ' / ' + barbTagMax() + ' Angriffe heute · jeden Tag neu</small></div>' +
        '<div class="lg-heute"><div class="lg-titel">Heute <small>Tagesgrenze · neu in ' + evUhr(Date.now() + msToMidnight()) + '</small></div>' +
        balken('coins', 5, fmtCompact(rec.m || 0) + ' / ' + fmtCompact(LAGER_GRENZE.m) + ' Münzen', rec.m || 0, LAGER_GRENZE.m) +
        balken('schluessel1', 2, 'Schlüssel ' + (rec.k1 || 0) + ' / ' + LAGER_GRENZE.k1, rec.k1 || 0, LAGER_GRENZE.k1) +
        balken('schluessel2', 4, 'Epischer Schlüssel ' + (rec.k2 || 0) + ' / ' + LAGER_GRENZE.k2, rec.k2 || 0, LAGER_GRENZE.k2) + '</div>' +
        '<div class="field-lines"><span>Freigeschaltet</span><b>bis Stufe ' + offen + '</b></div>' +
        '<div class="wo-satz">' + icon('coin') + '<span>Jedes besiegte Lager gibt <b>feste Münzen</b> nach Stufe, ab Stufe ' + LAGER_S1_AB + ' auch <b>Schlüssel</b>, bis die Tagesgrenze voll ist. Getötete Truppen zählen <b>nicht</b> für den Krieger-Tag.</span></div>' +
        (near ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="camp">' + icon('send') + '<span>Nächstes Lager · Stufe ' + near.L + '</span></button>' : '') + '</div>';
    const zeile = L => { const s = L <= rec.b ? 'ok' : L === offen ? 'bald' : 'zu', r = L <= 5 ? 1 : L <= 10 ? 2 : L <= 18 ? 4 : 5;
        return '<div class="evl-z is-' + s + '"><b>Stufe ' + L + '</b>' + beuteRaster([{ a: 'coins', n: lagerMuenzen(L), r }, L >= LAGER_S1_AB && { a: 'schluessel1', n: 1 }, L >= LAGER_S2_AB && { a: 'schluessel2', n: 1 }], 'bk-mini') + '<span class="evl-st">' +
            (s === 'ok' ? '<img src="bilder/ui_sym_haken.webp" alt="" draggable="false"><small>besiegt</small>' : s === 'bald' ? '<small>offen</small>' : icon('lock')) + '</span></div>'; };
    return kopf + '<div class="lb-gap">Münzen je Lager-Stufe</div><div class="evl-zeilen">' + Array.from({ length: BARB_MAX_L }, (_, i) => zeile(i + 1)).join('') + '</div>';
}
function evOffen() { return isPanelOpen(goalsPopup) && EV_TABS.includes(goalsTab); }
function renderEvents() {
    evRenderAt = Date.now();
    const sk = saisonKarte(), oben = sk && saisonOben(Date.now()), sz = sk ? '<div class="ev-saison">' + sk + '</div>' : '';
    liveHtml(document.getElementById('eventBody'), (oben ? sz : '') + (evTab === 'thron' ? evThronHtml() : evTab === 'lager' ? evLagerHtml() : evTourHtml()) + (!oben && evTab === 'tour' ? sz : ''));
}
// Welt-Saison: nur in den letzten 3 Tagen (oder angehalten) oben in jedem Reiter – sonst unten im Wochen-Event (der Inhalt des Reiters geht vor)
function saisonOben(now) { return !!(saison && (saison.halt || saison.ende - now <= SAISON_BALD_MS)); }
document.getElementById('eventBody').addEventListener('click', e => {
    const hol = e.target.closest('[data-ev-hol]'); if (hol) return evHolen(hol.dataset.evHol);
    const ws = e.target.closest('[data-wo-sicht]'); if (ws) { woSicht = ws.dataset.woSicht === 'rang' ? 'rang' : +ws.dataset.woSicht; document.querySelector('#goalsPopup .pbody').scrollTop = 0; return renderEvents(); }
    const wb = e.target.closest('[data-wo-belohn]'); if (wb) { woBelohn = wb.dataset.woBelohn === '1'; return renderEvents(); }
    const go = e.target.closest('[data-ev-go]'); if (!go) return; const k = go.dataset.evGo;
    let t = null, v = null;
    if (k === 'boss') { t = dbossOnMap(); v = { kind: 'boss' }; if (t && !isCellOpen(t.x, t.y)) { flashHint('Der Tagesboss steht im Nebel – erforsche zuerst das Gebiet.', 3500); return; } }
    else if (k === 'camp') { t = barbNearest(); v = t && { kind: 'camp', id: t.id }; }
    if (!t) { flashHint('Gerade nichts davon auf der Karte.', 2500); return renderEvents(); }
    closePanel(goalsPopup); flyTo(t.x, t.y, { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .2 }); openBarbSheet(v);
});
// Chips im Fenster: grüner Punkt = läuft gerade, grau = läuft nicht (darunter, wann es wieder losgeht)
function evChipStatus() {                            // (läuft schon beim Laden – vor diesem Teil noch nichts)
    let an; try { an = { tour: woOn(), lager: true }; } catch (e) { return; } const ab = { tour: an.tour ? '' : 'Mo' };
    for (const k in an) { const b = goalsPopup.querySelector('[data-gtab="' + k + '"]'); if (!b) continue;
        const st = b.querySelector('.ev-st'), sm = b.querySelector('small'); if (st) st.classList.toggle('an', an[k]); if (sm) { setText(sm, ab[k] || ''); sm.hidden = !ab[k]; } }
}
// der Hinweis unter dem HUD: Wochen-Event mit Platz, die letzten Tage der Welt-Saison → [Dringlichkeit, html] (0 = am dringendsten)
function evChips(now) {
    const out = [], T = woHeute(now);
    if (T) { const W = evState.wo || {}, rk = W.key === woWin(now).key ? evRang(woSumme(W)) : [], pl = rk.findIndex(e => e[0] === 'player') + 1, hol = evHolBereit('tour') ? '<em class="mb-hol" aria-label="Belohnung abholen"></em>' : '';
        out.push([9, '<button type="button" class="mb-chip is-tour" data-mb="woche">' + icon(T.ic) + '<span>' + T.kurz + ' · ' + T.name + '</span><b class="mb-platz' + (pl ? '' : ' is-leer') + '">Platz ' + (pl || '–') + '</b>' + hol + '</button>']); }   // (Platz immer belegt: der Chip springt nicht, wenn der Rang kommt)
    const sz = saisonChip(now); if (sz) out.push(sz);                                  // die letzten 3 Tage einer Welt-Saison: Countdown
    return out;
}
