// ===== aufbau.js – Paket D „Aufbau“ (wie Rise of Kingdoms): Burg-Stufe, Rohstoffe, neue Gebäude, Forschung,
// Marsch-Plätze =====
// Läuft nach spiel.js und vor buendnis.js (auch beim Weltrechner). spiel.js, bots.js, welt.js und buendnis.js rufen alles
// über AUF auf (bots.js: `var AUF = null` – solange diese Datei noch nicht geladen ist, gelten die alten Werte).
// Gleiche Regeln für alle: du ('player'), die Mitspieler (bot…) und andere echte Spieler (u<id>, ihre Stadt kommt aus
// ihrem Profil). Was nur dir gehört (Rohstoffe, Burg, Forschung, Truppen-Stufe), liegt in deinem Spielstand – der
// Weltrechner kennt es über dein Profil und prüft es (Stufe nur so hoch, wie Burg und Forschung erlauben).
'use strict';

// ---------------------------------------------------------------------------------------------------------------
// 1) ROHSTOFFE: Holz (h), Stein (s), Eisen (e)
// ---------------------------------------------------------------------------------------------------------------
const ROH = ['h', 's', 'e'];
const ROH_DEF = { h: { name: 'Holz', icon: 'wood', col: '#c08a4c' }, s: { name: 'Stein', icon: 'stone', col: '#aab3bd' }, e: { name: 'Eisen', icon: 'iron', col: '#8fb6e0' } };
const ROH_START = { h: Math.ceil(3000 * WIRTSCHAFT_KOSTEN), s: Math.ceil(2000 * WIRTSCHAFT_KOSTEN), e: Math.ceil(500 * WIRTSCHAFT_KOSTEN) };   // so viel hat jeder am Anfang (auch alte Spielstände ohne Rohstoffe) – ein Bestand: umgerechnet wie die Kosten (11b A)
const ROH_BIOM = { green: { h: 1, s: .5, e: .25 }, sand: { h: .3, s: 1, e: .5 }, snow: { h: .45, s: .6, e: 1 },   // Wiese: Holz · Wüste: Stein · Schnee/Gebirge: Eisen
    ice: { h: .2, s: .5, e: 1.3 }, volcano: { h: .15, s: 1.2, e: 1.1 }, swamp: { h: 1.3, s: .3, e: .3 } };   // (Paket C) Eis: viel Eisen · Vulkan: Stein + Eisen · Sumpf: viel Holz
const rohLeer = () => ({ h: 0, s: 0, e: 0 });
const rohSauber = (v, d) => { const r = rohLeer(); for (const k of ROH) { const x = v && +v[k]; r[k] = Number.isFinite(x) && x > 0 ? Math.min(1e15, x) : 0; } return v ? r : Object.assign(r, d); };
let roh = (() => { try { const v = JSON.parse(store.get('openWaterRes')); if (v && typeof v === 'object') return rohSauber(v); } catch (e) {} return Object.assign(rohLeer(), ROH_START); })();
function rohSpeichern() { store.set('openWaterRes', JSON.stringify({ h: Math.floor(roh.h), s: Math.floor(roh.s), e: Math.floor(roh.e) })); }

const rohRegionMem = {};
function rohRegion(lmId) {                                     // jede Region etwas anders: Landschaft × eine feste Laune der Region (0,8 … 1,2)
    let v = rohRegionMem[lmId]; if (v) return v;
    const lm = landmasses[lmId] || {}, b = ROH_BIOM[lm.bio] || ROH_BIOM.green, f = .8 + .4 * mulberry32((lmId | 0) * 7717 + 3)(), inner = lm.tier && lm.tier !== 'outer' ? 1.3 : 1;
    v = rohRegionMem[lmId] = { h: b.h * f * inner, s: b.s * f * inner, e: b.e * f * inner }; return v;
}
function rohVon(who) {                                         // der Rohstoff-Topf: deiner (privat) oder der eines anderen (in der Welt, Mitspieler-Daten)
    if (who === 'player') return roh;
    const b = loadBotState()[who]; if (!b) return null;
    if (!b.res || typeof b.res !== 'object') b.res = Object.assign(rohLeer(), ROH_START);
    return b.res;
}
function rohDazu(who, d, faktor) {                             // d: {h, s, e} (auch negativ, nie unter 0)
    const r = rohVon(who); if (!r || !d) return;
    for (const k of ROH) { const x = +d[k] * (faktor || 1); if (Number.isFinite(x) && x) r[k] = Math.max(0, Math.min(1e15, (r[k] || 0) + x)); }
    if (who === 'player') { rohSpeichern(); hudRoh(); } else saveBotState();
}
// Produktion: Rohstoffe kommen aus der STADT (Alexander 2.10.) – Holzfäller, Steinbruch, Eisenmine vor der Mauer, dazu ein
// kleines Grundeinkommen der Burg. Die Landschaft der Hauptstadt färbt es etwas (Schnee: mehr Eisen …). Die Basen draußen
// machen Münzen und Truppen, keine Rohstoffe mehr. (produceTicks ruft das für jede Basis – gezählt wird nur die Hauptstadt.)
const ROH_GEB = { h: 'lumber', s: 'quarry', e: 'mine' };      // Rohstoff → Gebäude
const ROH_GEB_STUNDE = 600, ROH_GEB_WACHS = 1.42, ROH_BURG_STUNDE = 150;   // Grundwerte (vor 5.10. pro Stunde, jetzt × WIRTSCHAFT_ERTRAG): Stufe 1: 600 … Stufe 25: ~2,7 Mio.; Burg allein: 150 je Rohstoff
const rohGebStunde = L => L > 0 ? ROH_GEB_STUNDE * Math.pow(ROH_GEB_WACHS, L - 1) : 0;
function rohStunde(who) {                                      // was ein Reich in einer Stunde an Rohstoffen macht (Anzeige, Markt, Schummel-Schutz) – 3.600× weniger als vor dem 5.10.
    const out = rohLeer(), cap = who === 'player' ? playerIslandId : botCapitalOf(who), isl = islandById[cap]; if (!isl) return out;
    const rg = rohRegion(isl.landmassId), e = ertrag(who);
    for (const x of ROH) out[x] = (ROH_BURG_STUNDE + rohGebStunde(bauStufe(who, ROH_GEB[x]))) * (.6 + .4 * rg[x]) * e * WIRTSCHAFT_ERTRAG;
    return out;
}
const rohCarry = {};
function basisRoh(who, islandId, level, ticks) {
    const cap = who === 'player' ? playerIslandId : botCapitalOf(who); if (islandId !== cap) return;
    const c = rohCarry[who] || (rohCarry[who] = rohLeer()), ms = who === 'player' ? productionTickMs() : botTickMs(who), h = rohStunde(who);
    for (const k of ROH) c[k] += h[k] * ms / 3600000 * ticks;
}
function rohBuchen(who) {
    const c = rohCarry[who]; if (!c) return; const d = rohLeer(); let any = false;
    for (const k of ROH) { const w = Math.floor(c[k] + 1e-6); if (w > 0) { d[k] = w; c[k] -= w; any = true; } }   // (Kommazahl-Rechenfehler kosten nie eine Einheit)
    if (!any) return;
    const r = rohVon(who); if (!r) return;
    for (const k of ROH) r[k] = Math.min(1e15, (r[k] || 0) + d[k]);
    if (who === 'player') { rohSpeichern(); hudRoh(); }
}
// Kosten { c: Münzen, h, s, e }: reicht es? bezahlen
const geldVon = who => who === 'player' ? coins : botCoins[who] || 0;
function kannZahlen(who, k) { if (!k) return true; if ((k.c || 0) > geldVon(who)) return false; const r = rohVon(who) || rohLeer(); return ROH.every(x => (k[x] || 0) <= (r[x] || 0)); }
function zahlen(who, k) {
    if (!kannZahlen(who, k)) return false;
    if (who === 'player') coins -= k.c || 0; else botCoins[who] = (botCoins[who] || 0) - (k.c || 0);
    const r = rohVon(who); for (const x of ROH) r[x] = Math.max(0, (r[x] || 0) - (k[x] || 0));
    if (who === 'player') { rohSpeichern(); hudRoh(); } else saveBotState();
    return true;
}
function kostenHtml(k, who) {                                  // Münzen + Rohstoffe, was fehlt rot
    const r = rohVon(who || 'player') || rohLeer(), g = geldVon(who || 'player'), teile = [];
    if (k.c) teile.push('<span class="kost' + (k.c > g ? ' is-bad' : '') + '">' + icon('coin', 'icon--coin') + fmtCompact(k.c) + '</span>');
    for (const x of ROH) if (k[x]) teile.push('<span class="kost kost--' + x + (k[x] > r[x] ? ' is-bad' : '') + '">' + icon(ROH_DEF[x].icon) + fmtCompact(k[x]) + '</span>');
    return teile.join('') || '–';
}

// ---------------------------------------------------------------------------------------------------------------
// 2) BURG-STUFE (1–25): getrennt von der Basis-Stufe draußen. Bauzeit, Münzen + Rohstoffe, Bauarbeiter wie die Gebäude
// ---------------------------------------------------------------------------------------------------------------
const BURG_MAX = 25;
const BAU_AB_BURG = { market: 4, embassy: 5 };                 // neue Gebäude: erst ab dieser Burg-Stufe
// (Truppen-Stufen T1–T5 gibt es nicht mehr – Alexander 4.10.: „alles raus“)
function stadtVon(who) {
    if (who === 'player') return loadCity();
    const b = loadBotState()[who]; return b && b.city || null;
}
function burgStufe(who) { const c = stadtVon(who); return Math.max(1, Math.min(BURG_MAX, (c && c.levels && c.levels.keep) | 0 || 1)); }
// Die Burg ist die Hauptstadt (Alexander 4.10.): langsam – nicht in 5 Tagen auf 25, sondern über viele Server-Resets.
// Jede Stufe kostet Gold, Holz, Stein und Eisen (die ersten mittelmäßig, später viel mehr) und dauert 1 Tag (Stufe 1 → 2)
// bis 60 Tage (Stufe 24 → 25) – zusammen rund ein Jahr. Mit Gems geht es schneller (wie jeder Bau).
function burgKosten(L) {                                       // von Stufe L auf L + 1 – alles × WIRTSCHAFT_KOSTEN (5.10.)
    const b = 5000 * Math.pow(1.6, L - 1) * (L > 10 ? Math.pow(1.25, L - 10) : 1);   // vorher Stufe 1: 5.000 · 10: 340.000 · 24: 5,6 Mrd. (heute ÷ 1.800)
    return { c: niceRound(wirtK(b * 2)), h: niceRound(wirtK(b)), s: niceRound(wirtK(b * .8)), e: niceRound(wirtK(b * .5)) };
}
function burgZeitRoh(L) { return 86400 * Math.pow(60, (Math.max(1, Math.min(BURG_MAX - 1, L)) - 1) / (BURG_MAX - 2)); }   // 1 Tag … 60 Tage
// Burg-Schutz (statt Lager): so viel von jedem Rohstoff (Gold, Holz, Stein, Eisen) kann kein Angreifer holen.
// Stufe 1: 10.000 · Stufe 10: 1 Mio. · Stufe 25: 100 Mio. (dazwischen gleichmäßig steigend) – × WIRTSCHAFT_KOSTEN (5.10.: 6 … 55.556)
function burgSchutzStufe(B) { B = Math.max(1, Math.min(BURG_MAX, B | 0 || 1)); return wirtK(B <= 10 ? 1e4 * Math.pow(100, (B - 1) / 9) : 1e6 * Math.pow(100, (B - 10) / 15)); }
const burgSchutz = (who, B) => Math.round(burgSchutzStufe(B || burgStufe(who)) * (1 + foWert(who, 'w_schutz') / 100));   // (+ Forschung Burg-Schutz+)
const STADT_MIX = { lumber: { h: .3, s: .9, e: .2 }, quarry: { h: 1.1, s: .2, e: .2 }, mine: { h: 1, s: .9, e: 0 }, wall: { h: .5, s: 1.3, e: .3 }, forge: { h: .6, s: .6, e: 1 }, market: { h: 1.2, s: .6, e: .2 } };
function stadtKosten(id, L) {                                  // alles für ein Gebäude von Stufe L auf L + 1 (Burg: eigene Tabelle)
    if (id === 'keep') return burgKosten(L);
    const m = STADT_MIX[id] || { h: 1, s: .7, e: .35 }, b = 300 * Math.pow(1.75, L);   // (× WIRTSCHAFT_KOSTEN wie die Münzen in cityCost)
    return { c: cityCost(id, L), h: niceRound(wirtK(b * m.h)), s: L >= 2 ? niceRound(wirtK(b * m.s)) : 0, e: L >= 6 ? niceRound(wirtK(b * m.e)) : 0 };
}
function stadtCap(who, id) {                                   // höchste Stufe, die die Burg gerade erlaubt
    if (id === 'keep') return BURG_MAX;
    const B = burgStufe(who); return B >= BURG_MAX ? cityMaxLevel(id) : Math.min(cityMaxLevel(id), B);
}
// Marsch-Plätze: so viele Aktionen gleichzeitig (Angriff, Verstärkung, Sammeln, Lager/Boss, Armee). Ein Mehrfachangriff
// (oder „Truppen sammeln“) zählt als EINE Aktion. Rückwege zählen nicht.
const marschGrenze = who => 2 + Math.floor((burgStufe(who) - 1) / 6);   // Burg 1: 2 · 7: 3 · 13: 4 · 19: 5 · 25: 6
let marschFreiPass = 0;                                        // (Rally-Start: der gemeinsame Angriff ist schon gezählt)
const werIst = x => x || 'player';
function marschBelegt(who) {
    const k = new Set(), t0 = Date.now();
    for (const a of pendingAttacks) if (werIst(a.attackerBotId) === who && !a.fromArmy && a.resolveAt > t0 - 5000) k.add(a.grp ? 'g' + a.grp : 'a' + marchKeyOf(a));
    for (const s of pendingSends) if (werIst(s.senderBotId) === who && !s.back) k.add(s.grp ? 'g' + s.grp : 's' + marchKeyOf(s));
    for (const m of fieldMarches) if (m.who === who && !m.back) k.add('f' + m.fieldId + ':' + m.startedAt);
    for (const f of resFields) { const st = fieldState[f.id]; if (st && st.occ && st.occ.who === who) k.add('o' + f.id); }
    for (const m of barbMarches) if (m.who === who && !m.back) k.add('b' + m.startedAt + ':' + m.homeId + ':' + m.k);
    for (const a of armies) if (armyWho(a) === who) k.add('r' + a.id);
    if (typeof bund !== 'undefined' && bund && Array.isArray(bund.r)) for (const r of bund.r) if (r.by === who) k.add('y' + r.id);
    return k.size;
}
function gruppeLaeuft(who, grp, src) {                         // gehört dieser Angriff zu einem gerade gestarteten Mehrfachangriff?
    if (!grp) return false; const now = Date.now();
    // Angriff (src): nur zu Angriffen derselben Gruppe vom SELBEN Ort; Senden („Truppen sammeln“): nur zu Sendungen derselben Gruppe.
    // Die 60 s zählen ab dem ERSTEN Marsch der Gruppe (sonst ließe sich das Fenster mit jedem neuen Marsch verlängern)
    const liste = src !== undefined ? pendingAttacks.filter(a => werIst(a.attackerBotId) === who && a.grp === grp && a.sourceId === src)
        : pendingSends.filter(s => werIst(s.senderBotId) === who && s.grp === grp && !s.back);
    if (!liste.length) return false;
    return now - Math.min(...liste.map(m => m.startedAt)) < 60000;
}
const marschFrei = who => Math.max(0, marschGrenze(who) - marschBelegt(who));
function marschOk(who, grp, src) { return marschFreiPass > 0 || gruppeLaeuft(who, grp, src) || marschBelegt(who) < marschGrenze(who); }
function marschVoll(who) { who = who || 'player'; const n = marschGrenze(who), B = burgStufe(who), nx = B < BURG_MAX ? Math.min(BURG_MAX, (Math.floor((B - 1) / 6) + 1) * 6 + 1) : 0;
    return 'Alle ' + n + ' Marsch-Plätze sind belegt – warte, bis ein Marsch ankommt' + (nx ? ' (Burg Stufe ' + nx + ': ' + (n + 1) + ' Plätze).' : '.'); }

// ---------------------------------------------------------------------------------------------------------------
// 3) FORSCHUNG (Labor – im Gebäude 'academy'): drei Äste, lange Zeiten, eine Forschung gleichzeitig. Im Labor wird ALLES
//    geforscht (Alexander 4.10.): auch Tempel-Bonus (früher Tempelschrein) und Späher-Tempo (früher Späherturm).
// ---------------------------------------------------------------------------------------------------------------
const FO_AESTE = { w: 'Wirtschaft', m: 'Militär', x: 'Erkundung' };
const FORSCHUNG = [
    { id: 'w_prod', ast: 'w', name: 'Ertrag', icon: 'coin', max: 10, aka: 1, pro: 3, txt: v => '+' + v + ' % Münzen aus allen Basen und Rohstoffe aus der Stadt' },
    { id: 'w_sam', ast: 'w', name: 'Sammeln', icon: 'hourglass', max: 10, aka: 2, pro: 5, txt: v => 'Sammler arbeiten ' + v + ' % schneller' },
    { id: 'w_last', ast: 'w', name: 'Traglast', icon: 'crate', max: 10, aka: 3, pro: 6, txt: v => 'Sammler tragen ' + v + ' % mehr' },
    { id: 'w_tempel', ast: 'w', name: 'Tempel', icon: 'temple', max: 10, aka: 4, pro: 10, txt: v => '+' + v + ' % Bonus aus allen deinen Tempeln (Münzen, Truppen, Edelsteine)' },
    { id: 'm_atk', ast: 'm', name: 'Angriff', icon: 'attack', max: 10, aka: 2, pro: 2, txt: v => '+' + v + ' % Kampfkraft beim Angreifen' },
    { id: 'm_def', ast: 'm', name: 'Verteidigung', icon: 'defense', max: 10, aka: 2, pro: 2, txt: v => '+' + v + ' % Kampfkraft beim Verteidigen' },
    { id: 'm_laz', ast: 'm', name: 'Krankenhaus', icon: 'plus', max: 10, aka: 4, pro: 2, txt: v => '+' + v + ' % der Gefallenen ins Krankenhaus' },
    { id: 'x_tempo', ast: 'x', name: 'Marschtempo', icon: 'send', max: 10, aka: 1, pro: 3, txt: v => 'Truppen laufen ' + v + ' % schneller' },
    { id: 'x_spaeh', ast: 'x', name: 'Späher', icon: 'scout', max: 10, aka: 3, pro: 10, txt: v => 'Späher ' + v + ' % schneller' },
    { id: 'x_nebel', ast: 'x', name: 'Kundschaft', icon: 'flag', max: 5, aka: 6, pro: 15, txt: v => 'eroberte Basen decken ' + v + ' % mehr Nebel auf' + (v >= 45 ? ' (Mitspieler: auch die Nachbarn der Nachbarn)' : '') },
    // ab Labor 23 (Alexander 5.10.): je Stufe eine Labor-Stufe mehr (23, 24, 25) – wirken überall dort, wo die Grundforschung wirkt
    { id: 'w_schutz', ast: 'w', name: 'Burg-Schutz+', icon: 'castle', max: 3, aka: 23, schritt: 1, pro: 10, txt: v => 'die Burg schützt ' + v + ' % mehr von jedem Rohstoff' },
    { id: 'm_laz2', ast: 'm', name: 'Krankenhaus II', icon: 'plus', max: 3, aka: 23, schritt: 1, pro: 5, vor: 'm_laz', txt: v => 'noch +' + v + ' % der Gefallenen ins Krankenhaus' },
    { id: 'x_tempo2', ast: 'x', name: 'Marschtempo II', icon: 'send', max: 3, aka: 23, schritt: 1, pro: 3, vor: 'x_tempo', txt: v => 'Truppen laufen noch ' + v + ' % schneller' }
];
const FO_BY = {}; for (const d of FORSCHUNG) FO_BY[d.id] = d;
const foAkaFuer = (d, L) => d.aka + (L - 1) * (d.schritt || 2);   // Stufe L braucht diese Labor-Stufe
function foStufe(who, id) { const c = stadtVon(who), d = FO_BY[id]; if (!c || !d || !c.fo) return 0; return Math.max(0, Math.min(d.max, (c.fo[id] | 0) || 0)); }
function foWert(who, id) { const d = FO_BY[id]; return d && d.pro ? foStufe(who, id) * d.pro : 0; }
const foSumme = who => FORSCHUNG.reduce((a, d) => a + foStufe(who, d.id), 0);   // alle erforschten Stufen (Erfolge, Rangliste „Hauptstadt“)
const foGesamt = () => FORSCHUNG.reduce((a, d) => a + d.max, 0);
function foKosten(d, L) {                                      // Stufe L erforschen
    const k = Math.pow(1.6, d.aka - 1), g = Math.pow(1.8, L - 1);
    return { c: niceRound(wirtK(3000 * k * g)), h: niceRound(wirtK(1500 * k * g)), s: niceRound(wirtK(1200 * k * g)), e: niceRound(wirtK(600 * k * g * (d.ast === 'm' ? 1.6 : 1))) };   // (× WIRTSCHAFT_KOSTEN)
}
function foZeitRoh(d, L) { return Math.min(7 * 86400, 300 * Math.pow(1.7, L - 1) * Math.pow(1.35, d.aka - 1)); }   // 5 Min. … Tage
const foZeit = (who, d, L) => Math.round(foZeitRoh(d, L));
function foSperre(who, d) {                                    // warum diese Forschung gerade nicht geht (oder null)
    const c = stadtVon(who); if (!c) return 'kaputt';
    const L = foStufe(who, d.id) + 1, aka = c.levels.academy || 0;
    if (L > d.max) return 'Fertig erforscht.';
    if (aka < foAkaFuer(d, L)) return 'Braucht Labor Stufe ' + foAkaFuer(d, L) + '.';
    if (d.vor && foStufe(who, d.vor) < 1) return 'Braucht zuerst „' + FO_BY[d.vor].name + '“.';
    if (c.foRun && !FO_BY[c.foRun.id]) c.foRun = null;           // (alter Spielstand: diese Forschung gibt es nicht mehr – Wachturm, T2–T5)
    if (c.foRun) return 'Das Labor forscht schon (' + FO_BY[c.foRun.id].name + ').';
    return null;
}
function foStart(who, id, now) {                               // → '' oder warum nicht
    const d = FO_BY[id]; if (!d) return 'kaputt';
    const why = foSperre(who, d); if (why) return why;
    const c = stadtVon(who), L = foStufe(who, id) + 1, k = foKosten(d, L);
    if (!zahlen(who, k)) return 'Nicht genug Münzen oder Rohstoffe.';
    now = now || Date.now(); c.foRun = { id, to: L, startedAt: now, endsAt: now + foZeit(who, d, L) * 1000 };
    if (who === 'player') { saveCity(); saveGame(); updateHud(); questProgress('forschung', 1); } else saveBotState();   // (Tagesaufgabe + Saison-Pass)
    return '';
}
function foFertig(who, sofort) {                               // läuft eine Forschung ab (oder sofort: mit Gems), wird sie gutgeschrieben
    const c = stadtVon(who); if (!c || !c.foRun) return false;
    const r = c.foRun; if (!sofort && Date.now() < r.endsAt) return false;
    if (!c.fo) c.fo = {};
    if (FO_BY[r.id]) c.fo[r.id] = Math.max(c.fo[r.id] || 0, Math.min(FO_BY[r.id].max, r.to));
    c.foRun = null;
    if (who === 'player') { saveCity(); if (FO_BY[r.id]) flashHint('Forschung fertig: ' + FO_BY[r.id].name + (FO_BY[r.id].max > 1 ? ' Stufe ' + r.to : '') + '.', 3500); sfx('upgrade'); if (cityOpenId === 'academy') renderCitySheet(); }
    else saveBotState();
    return true;
}
const foGems = c => c && c.foRun ? Math.max(1, Math.ceil((c.foRun.endsAt - Date.now()) / 60000) * CITY_GEMS_PER_MIN) : 0;

// ---------------------------------------------------------------------------------------------------------------
// 4) WIRKUNGEN – gleiche Rechnung für alle (Spieler, Mitspieler, andere echte Spieler)
// ---------------------------------------------------------------------------------------------------------------
function kampf(who, art) {                                     // Kampfkraft-Faktor: Forschung Angriff/Verteidigung
    if (!who) return 1;
    try { return 1 + foWert(who, art === 'd' ? 'm_def' : 'm_atk') / 100; } catch (e) { return 1; }
}
const ertrag = who => 1 + foWert(who, 'w_prod') / 100;         // Münzen und Rohstoffe der Basen
const sammelTempo = who => 1 + foWert(who, 'w_sam') / 100;
const traglast = who => 1 + foWert(who, 'w_last') / 100;
const marschTempo = who => 1 + (foWert(who, 'x_tempo') + foWert(who, 'x_tempo2')) / 100;   // (+ Marschtempo II)
const spaeherTempo = who => 1 + foWert(who, 'x_spaeh') / 100;
const lazarettPlus = who => foWert(who, 'm_laz') + foWert(who, 'm_laz2');   // (+ Krankenhaus II)
const nebelWeite = who => 1 + foWert(who, 'x_nebel') / 100;
const tempelPlus = who => foWert(who, 'w_tempel') / 100;       // (früher Tempelschrein)
const bauStufe = (who, id) => { const c = stadtVon(who); return c && c.levels ? c.levels[id] || 0 : 0; };
const botschaftTempo = who => 1 + bauStufe(who, 'embassy') * .03;   // Hilfe und Rally zu Bündnis-Mitgliedern
const botschaftGeschenk = who => 1 + bauStufe(who, 'embassy') * .04;

// ---------------------------------------------------------------------------------------------------------------
// 5) MARKT: Rohstoffe gegen Münzen (Gebühr, Tageslimit) – ein Rohstoff ist 5 Münzen wert
// ---------------------------------------------------------------------------------------------------------------
const MARKT_WERT = 5;
const marktGebuehr = L => Math.max(5, 25 - L) / 100;           // Stufe 1: 24 %, ab Stufe 20: 5 %
function marktLimit(who) {                                     // Münz-Wert pro Tag und Richtung (wie alle Kosten × WIRTSCHAFT_KOSTEN – die
    const L = bauStufe(who, 'market'); if (!L) return 0;          //   Stunden-Produktion ist × WIRTSCHAFT_ERTRAG, darum × Kosten ÷ Ertrag)
    let hp = 0; try { hp = hourProduction(who).coins * WIRTSCHAFT_KOSTEN / WIRTSCHAFT_ERTRAG; } catch (e) {}
    return Math.round(Math.max(wirtK(50000), hp * (.2 + .032 * L)));
}
function marktHeute(c) { const d = todayKey(); if (!c.markt || c.markt.d !== d) c.markt = { d, k: 0, v: 0 }; return c.markt; }
function marktTausch(who, art, x, n) {                         // art 'k' = kaufen (Münzen → Rohstoff), 'v' = verkaufen; → '' oder warum nicht
    const c = stadtVon(who), L = bauStufe(who, 'market'); if (!c || !L) return 'Baue zuerst den Markt.';
    if (!ROH_DEF[x] || !(n >= 1)) return 'kaputt';
    n = Math.floor(n); const m = marktHeute(c), lim = marktLimit(who), f = marktGebuehr(L), wert = n * MARKT_WERT;
    if (m[art] + wert > lim) return 'Tageslimit erreicht – heute noch ' + fmtCompact(Math.max(0, lim - m[art]) / MARKT_WERT) + ' ' + ROH_DEF[x].name + '.';
    const r = rohVon(who);
    if (art === 'v') { if ((r[x] || 0) < n) return 'So viel ' + ROH_DEF[x].name + ' hast du nicht.'; r[x] -= n; const g = Math.floor(wert * (1 - f)); if (who === 'player') coins += g; else botCoins[who] = (botCoins[who] || 0) + g; }
    else { const p = Math.ceil(wert * (1 + f)); if (geldVon(who) < p) return 'Nicht genug Münzen (' + fmtCompact(p) + ').'; if (who === 'player') coins -= p; else botCoins[who] -= p; r[x] += n; }
    m[art] += wert;
    if (who === 'player') { rohSpeichern(); saveCity(); saveGame(); updateHud(); } else saveBotState();
    return '';
}

// ---------------------------------------------------------------------------------------------------------------
// 7) DEIN TAKT (jede Sekunde aus cityTick): Forschung fertig?
// ---------------------------------------------------------------------------------------------------------------
function spielerTakt() { try { foFertig('player'); } catch (e) {} }

// ---------------------------------------------------------------------------------------------------------------
// 8) ANZEIGE: HUD, Burg-Fenster, Gebäude (Labor, Markt, Botschaft)
// ---------------------------------------------------------------------------------------------------------------
let rohOffen = false;
function hudRoh() {
    if (SYSTEM) return;
    const el = document.getElementById('hudRoh'); if (!el) return;
    for (const x of ROH) { const s = el.querySelector('[data-r="' + x + '"]'); if (s) setText(s, fmtCompact(Math.floor(roh[x]))); }
    const t = ROH.map(x => ROH_DEF[x].name + ' ' + fmtNum(Math.floor(roh[x]))).join(' · '); if (el.title !== t) el.title = t;
    if (rohOffen) rohDropMalen();
}
function rohDropMalen() {
    const d = document.getElementById('rohDrop'); if (!d) return;
    const ps = rohStunde('player');
    liveHtml(d, ROH.map(x => '<div class="roh-row">' + icon(ROH_DEF[x].icon, 'roh-' + x) + '<span>' + ROH_DEF[x].name + '</span><b>' + fmtNum(Math.floor(roh[x])) + '</b><small>+' + fmtStunde(ps[x]) + '/Std.</small></div>').join('') +
        '<small class="roh-hint">Holzfäller, Steinbruch und Eisenmine in deiner Stadt machen Rohstoffe (je nach Landschaft der Hauptstadt). Mehr durch Sammeln auf Holz-, Stein- und Eisen-Feldern der Karte. Gebraucht für Burg, Gebäude und Forschung. Die Burg schützt ' + fmtCompact(burgSchutz('player')) + ' von jedem Rohstoff vor Angreifern.</small>');
}
function rohUmschalten(an) { rohOffen = an === undefined ? !rohOffen : an; const d = document.getElementById('rohDrop'); if (!d) return; d.hidden = !rohOffen; document.getElementById('hudRoh').classList.toggle('on', rohOffen); if (rohOffen) rohDropMalen(); }

function freiText(B) {                                         // was die Burg-Stufe B freischaltet
    const out = ['Gebäude bis Stufe ' + (B >= BURG_MAX ? 'zum Höchstwert' : B)];
    const m = 2 + Math.floor((B - 1) / 6); if (B === 1 || (B - 1) % 6 === 0) out.push(m + ' Marsch-Plätze');
    out.push('Schutz: ' + fmtCompact(burgSchutz('player', B)) + ' von jedem Rohstoff');
    for (const id in BAU_AB_BURG) if (BAU_AB_BURG[id] === B) out.push('neues Gebäude: ' + cityDef(id).name);
    return out;
}
function renderKeep() {                                        // das Burg-Fenster (Burg in der Stadt antippen)
    const c = loadCity(), B = burgStufe('player'), max = B >= BURG_MAX, bau = cityBuildOf(c, 'keep'), k = max ? null : burgKosten(B);
    const now = Date.now(), sh = shieldUntil() > now ? shieldUntil() : 0, neu = sh ? 0 : neulingBis();
    document.getElementById('citySheet').hidden = false;
    cityBildSetzen('keep', B);
    setText(document.getElementById('cityBOver'), 'Deine Burg');
    setText(document.getElementById('cityBName'), 'Burg');
    setText(document.getElementById('cityBLevel'), max ? 'Burg-Stufe ' + B + ' · höchste Stufe' : 'Burg-Stufe ' + B + ' → ' + (B + 1) + ' (von ' + BURG_MAX + ')');
    setText(document.getElementById('cityBDesc'), 'Das Herz deines Reiches – unabhängig von der Basis-Stufe draußen auf der Karte. Die Burg-Stufe bestimmt, wie hoch deine Gebäude gehen, wie viele Märsche gleichzeitig laufen und wie viel Gold, Holz, Stein und Eisen vor Angreifern sicher ist. Jede Stufe dauert lange (1 bis 60 Tage).');
    const note = document.getElementById('cityBNote'), blk = !bau && !max ? cityBlocker('keep') : null; let cls, nh;
    if (bau) { cls = 'notice notice--gold'; nh = icon('hourglass') + '<span style="flex:1">Ausbau auf Burg-Stufe ' + bau.to + ' · noch <b id="cityBNoteTime"></b><div class="city-progress" style="margin-top:6px"><i></i></div>' + (typeof bundHilfeKnopf === 'function' ? bundHilfeKnopf('bau', 'keep', bau.to, bau.endsAt) : '') + '</span>'; }
    else { cls = 'notice city-wirkung'; nh = icon('shield') + '<span>' + (sh ? 'Friedensschild aktiv – noch ' + uhrHtml(sh) : neu > now ? 'Anfängerschutz – noch ' + uhrHtml(neu) : 'Kein Friedensschild aktiv.') + '</span>'; }
    if (note.className !== cls) note.className = cls; liveHtml(note, nh);
    liveHtml(document.getElementById('cityBStats'), max || bau ? '' : cityAnfHtml('keep', B, k));
    const up = document.getElementById('cityUpgradeBtn'), sp = document.getElementById('citySpeedBtn');
    setBtnLabel(up, max ? 'Höchste Stufe' : 'Burg aufwerten'); setText(document.getElementById('cityUpTime'), max ? '' : fmtDuration(cityTimeSec('keep', B)));
    up.disabled = max || !!blk || !!bau || !kannZahlen('player', k); up.title = blk || ''; up.style.display = bau ? 'none' : '';
    sp.style.display = bau ? '' : 'none'; if (bau) renderCitySheetTimer();
    const belegt = marschBelegt('player');
    liveHtml(document.getElementById('cityBExtra'),
        '<div class="keep-h">Jetzt</div><div class="auf-grid"><div><span>Marsch-Plätze</span><b>' + belegt + ' / ' + marschGrenze('player') + ' belegt</b></div><div><span>Gebäude</span><b>bis Stufe ' + stadtCap('player', 'wall') + '</b></div><div><span>Schutz</span><b>' + fmtCompact(burgSchutz('player')) + ' je Rohstoff</b></div></div>' +
        (max ? '' : '<div class="keep-h">Burg-Stufe ' + (B + 1) + ' schaltet frei</div><ul class="auf-frei">' + freiText(B + 1).map(t => '<li>' + icon('check') + t + '</li>').join('') + '</ul>') +
        '<small class="keep-note">Fällt nie · Sieger nimmt ' + Math.round(HAUPT_BEUTE * 100) + ' % über dem Schutz</small>');
}
function effektText(id, lvl) {
    if (id === 'academy') return (lvl ? 'Forschung bis Labor-Stufe ' + lvl + ' · Truppen laufen +' + lvl * 2 + ' % schneller.' : 'Baue das Labor, um zu forschen.') + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: mehr Forschung, +' + (lvl + 1) * 2 + ' % Tempo.' : '');
    if (id === 'embassy') { const t = L => 'Verstärkung ' + fmtCompact(typeof verstPlatzStufe === 'function' ? verstPlatzStufe('player', L) : 0) + ' · Rally +' + fmtCompact(typeof rallyPlatzStufe === 'function' ? rallyPlatzStufe('player', L) : 0) + ' · ' + L + ' Hilfen';
        return (lvl ? t(lvl) : 'Verstärkung, Rally, Bündnis-Hilfe') + (lvl < CITY_MAX_LEVEL ? ' → ' + t(lvl + 1) : ''); }
    const rx = { lumber: ['h', 'Holz'], quarry: ['s', 'Stein'], mine: ['e', 'Eisen'] }[id];
    if (rx) { const k = rx[0], jetzt = rohStunde('player')[k], f = jetzt / Math.max(1, ROH_BURG_STUNDE + rohGebStunde(lvl));
        return (lvl ? 'Jetzt: ' : 'Ohne Gebäude (nur die Burg): ') + fmtStunde(jetzt) + ' ' + rx[1] + ' pro Stunde.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: ' + fmtStunde((ROH_BURG_STUNDE + rohGebStunde(lvl + 1)) * f) + '.' : ''); }
    if (id === 'market') return lvl ? 'Gebühr ' + Math.round(marktGebuehr(lvl) * 100) + ' % · Tageslimit ' + fmtCompact(marktLimit('player')) + ' Münzen je Richtung.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: Gebühr ' + Math.round(marktGebuehr(lvl + 1) * 100) + ' %, höheres Limit.' : '') : 'Baue den Markt, um Rohstoffe gegen Münzen zu tauschen.';
    return '';
}
let foAst = 'w', marktMenge = 1;   // (Markt-Mengen 1 … 1.000: das kleinste Tageslimit ist 28 Münzen-Wert = 5 Rohstoffe)
// Forschung als Baum (wie in Rise of Kingdoms): Spalten nach der nötigen Labor-Stufe, jede Forschung ein Feld mit
// Stufen-Balken; antippen zeigt unten alles dazu (Wirkung jetzt → nächste Stufe, Voraussetzungen, hast / brauchst, Forschen)
let foSel = null;
const foBedingt = (who, d, L) => { const c = stadtVon(who); return !!c && (c.levels.academy || 0) >= foAkaFuer(d, L) && !(d.vor && foStufe(who, d.vor) < 1); };
function foBaum(aka) {
    const liste = FORSCHUNG.filter(f => f.ast === foAst), c = loadCity(), spalten = [...new Set(liste.map(d => d.aka))].sort((a, b) => a - b);
    if (!liste.some(d => d.id === foSel)) foSel = (liste.find(d => foStufe('player', d.id) < d.max && foBedingt('player', d, foStufe('player', d.id) + 1)) || liste[0]).id;
    const knoten = d => { const L = foStufe('player', d.id), max = L >= d.max, lauf = c.foRun && c.foRun.id === d.id, zu = !max && !foBedingt('player', d, L + 1);
        return '<button type="button" class="fo-node' + (max ? ' is-max' : '') + (lauf ? ' is-run' : '') + (zu ? ' is-lock' : '') + (d.id === foSel ? ' is-sel' : '') + '" data-fo-sel="' + d.id + '">' +
            '<span class="fo-node-ic">' + icon(zu ? 'lock' : d.icon) + '</span><b>' + d.name + '</b><span class="fo-bar"><i style="--p:' + Math.round(L / d.max * 100) + '%"></i></span><small>' + L + ' / ' + d.max + '</small></button>'; };
    return '<div class="fo-baum">' + spalten.map(a => '<div class="fo-spalte' + (aka >= a ? '' : ' is-zu') + '"><span class="fo-aka">Labor ' + a + '</span>' + liste.filter(d => d.aka === a).map(knoten).join('') + '</div>').join('') + '</div>' + foDetail(FO_BY[foSel]);
}
function foDetail(d) {
    if (!d) return '';
    const L = foStufe('player', d.id), max = L >= d.max, c = loadCity(), lauf = c.foRun && c.foRun.id === d.id, why = max ? null : foSperre('player', d), k = max ? null : foKosten(d, L + 1);
    const jetzt = d.pro ? (L ? d.txt(L * d.pro) : 'noch nichts') : (L ? 'erforscht' : 'noch nicht erforscht'), naechst = max ? '' : d.pro ? d.txt((L + 1) * d.pro) : d.txt();
    let anf = '';
    if (!max) {
        const need = foAkaFuer(d, L + 1); anf += anfZeile((c.levels.academy || 0) >= need, 'flask', 'Labor Stufe ' + need);
        if (d.vor) anf += anfZeile(foStufe('player', d.vor) >= 1, FO_BY[d.vor].icon, FO_BY[d.vor].name);
        if (!lauf) anf += anfZeile(!c.foRun, 'hourglass', c.foRun ? 'Labor forscht schon (' + (FO_BY[c.foRun.id] || {}).name + ')' : 'Labor frei');
        anf += anfKosten(k);
    }
    return '<div class="fo-detail"><div class="fo-dh"><span class="fo-node-ic">' + icon(d.icon) + '</span><span><b>' + d.name + '</b><small>' + FO_AESTE[d.ast] + ' · Stufe ' + L + ' / ' + d.max + '</small></span></div>' +
        '<div class="fo-wirk"><div><span>Jetzt</span><b>' + jetzt + '</b></div>' + (max ? '' : '<div><span>Nächste Stufe</span><b>' + naechst + '</b></div>') + '</div>' +
        (max ? '<div class="anf is-ok">' + icon('check') + '<span>Fertig erforscht</span></div>' : lauf ? '' :
            '<div class="anf-h">Voraussetzungen</div><div class="anf-list">' + anf + '</div>') + '</div>' +
        (max || lauf ? '' : '<button type="button" class="btn btn--primary btn--grow fo-go" data-fo="' + d.id + '"' + (why || !kannZahlen('player', k) ? ' disabled' : '') + ' title="' + (why || '') + '">' + icon('flask') + '<span class="lbl">Forschen</span><small class="city-uptime">' + fmtDuration(foZeit('player', d, L + 1)) + '</small></button>');   // (eigenes Teil: zählen die Münzen hoch, bleibt der Knopf unter dem Finger stehen)
}
function extraHtml(id, lvl) {
    if (id === 'academy') {
        const c = loadCity(), r = c.foRun, d = r && FO_BY[r.id];
        const lauf = d ? '<div class="notice notice--gold fo-lauf">' + icon('hourglass') + '<span style="flex:1"><b>' + d.name + (d.max > 1 ? ' Stufe ' + r.to : '') + '</b> · noch ' + uhrHtml(r.endsAt) + '<div class="city-progress" style="margin-top:6px"><i style="--p:' + Math.min(100, (Date.now() - r.startedAt) / Math.max(1, r.endsAt - r.startedAt) * 100).toFixed(1) + '%"></i></div>' + (typeof bundHilfeKnopf === 'function' ? bundHilfeKnopf('fo', r.id, r.to, r.endsAt) : '') + '</span><button type="button" class="btn btn--secondary btn--sm" data-fo-gems' + (gems < foGems(c) ? ' disabled' : '') + '>' + (gemsArmed('fo:' + r.id) ? 'Wirklich? ' + icon('gem') + foGems(c) : 'Fertig · ' + icon('gem') + foGems(c)) + '</button></div>' : '';
        if (!lvl) return lauf;
        return lauf + '<div class="seg fo-tabs">' + Object.keys(FO_AESTE).map(a => '<button type="button" data-fo-ast="' + a + '"' + (a === foAst ? ' class="on"' : '') + '>' + FO_AESTE[a] + '</button>').join('') + '</div>' +
            foBaum(lvl);
    }
    if (id === 'market' && lvl) return '<button type="button" class="btn btn--primary btn--sm" data-markt-shop>' + icon('shop') + '<span>Handeln: Shop → Markt</span></button>';
    return '';
}
function marktHtml() {                                         // Shop → Markt: Rohstoffe gegen Münzen (die Stufe des Markt-Gebäudes bestimmt Gebühr und Limit)
    const lvl = bauStufe('player', 'market');
    if (!lvl) return '<div class="notice">' + icon('lock') + '<span>Baue zuerst den Markt in deiner Stadt (ab Burg-Stufe ' + BAU_AB_BURG.market + ').</span></div>';
    const c = loadCity(), m = marktHeute(c), lim = marktLimit('player'), f = marktGebuehr(lvl), N = marktMenge;
    return '<div class="seg" data-mk-n>' + [1, 10, 100, 1000].map(v => '<button type="button" data-mk-menge="' + v + '"' + (v === N ? ' class="on"' : '') + '>' + fmtCompact(v) + '</button>').join('') + '</div><div class="fo-list">' +
            ROH.map(x => '<div class="fo-row">' + icon(ROH_DEF[x].icon, 'roh-' + x) + '<span class="fo-t"><b>' + ROH_DEF[x].name + '</b><small>' + fmtNum(Math.floor(roh[x])) + ' vorhanden</small></span>' +
                '<button type="button" class="btn btn--secondary btn--sm" data-mk="v:' + x + '"' + (roh[x] < N || m.v + N * MARKT_WERT > lim ? ' disabled' : '') + '>+' + fmtCompact(Math.floor(N * MARKT_WERT * (1 - f))) + ' ' + icon('coin', 'icon--coin') + '</button>' +
                '<button type="button" class="btn btn--primary btn--sm" data-mk="k:' + x + '"' + (coins < Math.ceil(N * MARKT_WERT * (1 + f)) || m.k + N * MARKT_WERT > lim ? ' disabled' : '') + '>−' + fmtCompact(Math.ceil(N * MARKT_WERT * (1 + f))) + ' ' + icon('coin', 'icon--coin') + '</button></div>').join('') +
            '</div><small class="keep-note">Links verkaufen, rechts kaufen (' + fmtCompact(N) + ' Stück). 1 Rohstoff = ' + MARKT_WERT + ' Münzen, Gebühr ' + Math.round(f * 100) + ' % (Markt Stufe ' + lvl + '). Heute noch: verkaufen ' + fmtCompact(Math.max(0, lim - m.v)) + ', kaufen ' + fmtCompact(Math.max(0, lim - m.k)) + ' Münzen-Wert.</small>';
}
// Klicks im Gebäude-Fenster (Labor, Markt)
document.getElementById('citySheet').addEventListener('click', e => {
    const a = e.target.closest('[data-fo-ast]'); if (a) { foAst = a.dataset.foAst; renderCitySheet(); return; }
    const fs = e.target.closest('[data-fo-sel]'); if (fs) { foSel = fs.dataset.foSel; renderCitySheet(); return; }
    const f = e.target.closest('[data-fo]:not([disabled])'); if (f) { const why = foStart('player', f.dataset.fo); flashHint(why || 'Forschung gestartet: ' + FO_BY[f.dataset.fo].name + '.', 2800); if (!why) sfx('upgrade'); renderCitySheet(); return; }
    const fg = e.target.closest('[data-fo-gems]:not([disabled])');
    if (fg) { const c = loadCity(), g = foGems(c); if (!g || gems < g || !c.foRun || !gemsWirklich('fo:' + c.foRun.id, g, fg)) return; gems -= g; saveGame(); updateHud(); foFertig('player', true); renderCitySheet(); return; }
    if (e.target.closest('[data-markt-shop]')) { closeCity(); openShop('markt'); }
});
{ const mp = document.getElementById('shopMarkt'); if (mp) mp.addEventListener('click', e => {   // Shop → Markt
    const mm = e.target.closest('[data-mk-menge]'); if (mm) { marktMenge = +mm.dataset.mkMenge; renderShop(); return; }
    const mk = e.target.closest('[data-mk]:not([disabled])'); if (mk) { const [art, x] = mk.dataset.mk.split(':'), why = marktTausch('player', art, x, marktMenge); if (why) flashHint(why, 3000); else sfx('coin'); renderShop(); }
}); }
if (!SYSTEM) {
    document.getElementById('hudRoh').addEventListener('click', () => rohUmschalten());
    document.getElementById('rohDrop').addEventListener('click', () => rohUmschalten(false));
}

// Spähbericht: der Späher sieht alles (Alexander 4.10.) – Burg, Rohstoffe (und wie viel davon zu holen ist), Forschung
function spaeherMehr(owner) {
    if (!owner) return null;
    const r = owner === 'player' ? roh : (loadBotState()[owner] || {}).res, o = { burg: burgStufe(owner), roh: { schutz: burgSchutz(owner), c: Math.floor(geldVon(owner)) } };
    if (r) for (const x of ROH) o.roh[x] = Math.floor(r[x] || 0);
    o.fo = { atk: foStufe(owner, 'm_atk'), def: foStufe(owner, 'm_def'), laz: foStufe(owner, 'm_laz') };
    return o;
}

// ---------------------------------------------------------------------------------------------------------------
// 9) MITSPIELER: Burg, Gebäude, Forschung, Truppen-Stufe, Markt – gleiche Regeln und Kosten, nie geschummelt
// ---------------------------------------------------------------------------------------------------------------
const BOT_FO_LIEBER = {
    raider: ['m_atk', 'x_tempo', 'm_laz', 'w_prod', 'm_def', 'w_tempel', 'w_last', 'w_sam', 'x_spaeh', 'x_nebel', 'm_laz2', 'x_tempo2', 'w_schutz'],
    builder: ['w_prod', 'm_def', 'w_last', 'w_sam', 'm_atk', 'm_laz', 'w_tempel', 'x_tempo', 'x_spaeh', 'x_nebel', 'm_laz2', 'x_tempo2', 'w_schutz'],
    templer: ['w_tempel', 'm_atk', 'm_def', 'w_prod', 'm_laz', 'x_tempo', 'w_last', 'w_sam', 'x_nebel', 'x_spaeh', 'm_laz2', 'x_tempo2', 'w_schutz'],
    balanced: ['w_prod', 'm_atk', 'm_def', 'x_tempo', 'w_sam', 'm_laz', 'w_tempel', 'w_last', 'x_spaeh', 'x_nebel', 'm_laz2', 'x_tempo2', 'w_schutz'],
    veteran: ['m_atk', 'w_prod', 'm_def', 'x_tempo', 'm_laz', 'w_tempel', 'w_sam', 'w_last', 'x_nebel', 'x_spaeh', 'm_laz2', 'x_tempo2', 'w_schutz']
};
function botStadtFix(b) {                                      // fehlende Felder (alte Spielstände): Burg 1, keine Forschung, Start-Rohstoffe
    const c = b.city; if (!c) return;
    if (!(c.levels.keep >= 1)) c.levels.keep = 1;
    if (!c.fo || typeof c.fo !== 'object') c.fo = {};
    delete c.tier; delete c.tierBez;                           // (Truppen-Stufen gibt es nicht mehr)
    if (c.foRun && !FO_BY[c.foRun.id]) c.foRun = null;
    if (!b.res || typeof b.res !== 'object') b.res = Object.assign(rohLeer(), ROH_START);
}
function botForschung(bot, now) {                              // fertig? sonst: die nächste, die zum Spielstil passt und bezahlbar ist (behält Reserven)
    const b = loadBotState()[bot.id]; if (!b || !b.city) return;
    if (b.city.foRun) { if (now >= b.city.foRun.endsAt) foFertig(bot.id); return; }
    if (!(b.city.levels.academy > 0)) return;
    const liste = BOT_FO_LIEBER[bot.style] || BOT_FO_LIEBER.balanced, spar = (typeof botStyle === 'function' ? botStyle(bot).build : 0) || .5;
    for (const id of liste) {
        const d = FO_BY[id]; if (foSperre(bot.id, d)) continue;
        const k = foKosten(d, foStufe(bot.id, id) + 1);
        if ((botCoins[bot.id] || 0) * spar < k.c) continue;     // (behält die Hälfte für Truppen und Basen, wie beim Bauen)
        if (!kannZahlen(bot.id, k)) { botMarkt(bot, k); continue; }
        if (!foStart(bot.id, id, now)) botStat(bot.id, 'fo'); return;   // (Saison-Pass wie bei dir)
    }
}
function botMarkt(bot, k) {                                    // fehlt ein Rohstoff, kauft er ihn auf dem Markt – nur mit Münzen, die er übrig hat, im Tageslimit
    const b = loadBotState()[bot.id]; if (!b || !bauStufe(bot.id, 'market') || !k) return;
    for (const x of ROH) {
        const fehlt = Math.ceil((k[x] || 0) - (b.res[x] || 0)); if (fehlt <= 0) continue;
        const preis = fehlt * MARKT_WERT * (1 + marktGebuehr(bauStufe(bot.id, 'market')));
        if ((botCoins[bot.id] || 0) < preis * 3 + (k.c || 0)) continue;
        marktTausch(bot.id, 'k', x, fehlt);
    }
}
function botBurgWert(bot, b) {                                 // wie dringend die Burg ist (kleiner = eher): sobald ein Gebäude anstößt
    const c = b.city, B = c.levels.keep || 1;
    const anstoss = BOT_BUILDINGS.filter(k => (c.levels[k] || 0) >= stadtCap(bot.id, k) && (c.levels[k] || 0) < cityMaxLevel(k)).length;
    return (B + 1) * (anstoss ? .55 : 1.1);
}
// Sammeln: welcher Rohstoff fehlt am meisten? (für die Wahl des Feldes)
function botRohWunsch(botId) {
    const r = rohVon(botId) || rohLeer(), B = burgStufe(botId), k = B < BURG_MAX ? burgKosten(B) : { h: 1, s: 1, e: 1 };
    let best = null, bv = Infinity; for (const x of ROH) { const v = (r[x] + 1) / ((k[x] || 1) + 1); if (v < bv) { bv = v; best = x; } }
    return bv < 1.5 ? best : null;
}

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// Die Hauptstadt hat EINE Stufe: die Burg (Alexander 2.10.). Auf der Karte folgt ihre Stufe der Burg (Burg 1 → 1 …
// Burg 25 → 100), mit Münzen wird sie nicht mehr aufgewertet. Wer rechnet (Weltrechner / allein), stellt das für ALLE ein.
// Zieht die Hauptstadt um, bekommt die alte Basis ihre eigene Stufe von vorher zurück (sonst gäbe es Gratis-Stufen).
// ---------------------------------------------------------------------------------------------------------------
const burgKarte = B => Math.round(1 + (Math.max(1, Math.min(BURG_MAX, B | 0 || 1)) - 1) * (MAX_BASE_LEVEL - 1) / (BURG_MAX - 1));
const hauptVon = who => who === 'player' ? playerIslandId : botCapitalOf(who);
var hauptVor = (() => { try { return JSON.parse(store.get('openWaterHauptVor')) || {}; } catch (e) { return {}; } })();   // je Herr: { id: Hauptstadt, vor: ihre eigene Stufe }
function hauptstadtStufen() {
    if (window.WELT && !rechnet()) {                           // Zuschauer: die eigene Burg gleich auf der Karte zeigen (der Weltrechner zieht nach)
        const cap = playerIslandId, soll = burgKarte(burgStufe('player'));
        if (islandById[cap] && (islandLevels[cap] || 1) < soll) { islandLevels[cap] = soll; ausbauMerken(cap, soll); requestRender(); }
        return;
    }
    let neu = false;
    const wer = (typeof SYSTEM !== 'undefined' && SYSTEM) ? [] : ['player']; for (const b of BOT_DEFS) wer.push(b.id);
    for (const w of wer) {
        const cap = hauptVon(w); if (cap === null || cap === undefined || !islandById[cap] || islandOwnerOf(cap) !== w) continue;
        const h = hauptVor[w];
        if (!h || h.id !== cap) {
            if (h && islandById[h.id] && islandOwnerOf(h.id) === w && (islandLevels[h.id] || 1) > h.vor) islandLevels[h.id] = h.vor;
            hauptVor[w] = { id: cap, vor: islandLevels[cap] || 1 }; neu = true;
        }
        const soll = burgKarte(burgStufe(w)); if ((islandLevels[cap] || 1) !== soll) { islandLevels[cap] = soll; neu = true; }
    }
    if (neu) { store.set('openWaterHauptVor', JSON.stringify(hauptVor)); saveGame(); requestRender(); }
}
setInterval(hauptstadtStufen, 3000);

AUF = {
    ROH_START, foZeitRoh, foAkaFuer,                           // (für das Hauptbuch 3B in spiel.js)
    ROH_DEF, BURG_MAX, BAU_AB_BURG, FORSCHUNG, MARKT_WERT,
    rohVon, rohDazu, rohSpeichern, basisRoh, rohBuchen, rohStunde, kannZahlen, zahlen, kostenHtml,
    burgStufe, burgZeitRoh, stadtKosten, stadtCap, burgSchutz, burgSchutzStufe,
    marschFrei, marschOk, marschVoll, gruppeLaeuft, frei: { an() { marschFreiPass++; }, aus() { marschFreiPass = Math.max(0, marschFreiPass - 1); } },
    foStufe, foWert, foSumme, foGesamt, foKosten, foFertig, marktLimit, marktHtml, marktGebuehr, marktStufe: who => bauStufe(who, 'market'),
    kampf, ertrag, sammelTempo, traglast, marschTempo, spaeherTempo, lazarettPlus, nebelWeite, tempelPlus, botschaftTempo, botschaftGeschenk, botschaftStufe: who => bauStufe(who, 'embassy'),
    spielerTakt, hud: hudRoh, renderKeep, effektText, extraHtml, spaeherMehr,
    botStadtFix, botForschung, botMarkt, botBurgWert, botRohWunsch
};
for (const id in (loadBotState() || {})) try { botStadtFix(botState[id]); } catch (e) {}
hudRoh();
