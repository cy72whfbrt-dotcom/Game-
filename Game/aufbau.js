// ===== aufbau.js – Paket D „Aufbau“ (wie Rise of Kingdoms): Burg-Stufe, Rohstoffe, neue Gebäude, Forschung,
// Truppen-Stufen T1–T5 und Marsch-Plätze =====
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
const ROH_START = { h: 3000, s: 2000, e: 500 };                 // so viel hat jeder am Anfang (auch alte Spielstände ohne Rohstoffe)
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
const ROH_GEB_STUNDE = 600, ROH_GEB_WACHS = 1.42, ROH_BURG_STUNDE = 150;   // Stufe 1: 600/Std. … Stufe 25: ~2,7 Mio./Std.; Burg allein: 150/Std. je Rohstoff
const rohGebStunde = L => L > 0 ? ROH_GEB_STUNDE * Math.pow(ROH_GEB_WACHS, L - 1) : 0;
function rohStunde(who) {                                      // was ein Reich in einer Stunde an Rohstoffen macht (Anzeige, Markt, Schummel-Schutz)
    const out = rohLeer(), cap = who === 'player' ? playerIslandId : botCapitalOf(who), isl = islandById[cap]; if (!isl) return out;
    const rg = rohRegion(isl.landmassId), e = ertrag(who);
    for (const x of ROH) out[x] = (ROH_BURG_STUNDE + rohGebStunde(bauStufe(who, ROH_GEB[x]))) * (.6 + .4 * rg[x]) * e;
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
    for (const k of ROH) { const w = Math.floor(c[k]); if (w > 0) { d[k] = w; c[k] -= w; any = true; } }
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
const BAU_AB_BURG = { tower: 3, market: 4, embassy: 5 };       // neue Gebäude: erst ab dieser Burg-Stufe
const TIER_KRAFT = [1, 1, 1.1, 1.25, 1.45, 1.7];               // Truppen-Stufe T1 … T5: Kampfkraft (Angriff und Verteidigung)
const TIER_BURG = [0, 1, 6, 11, 16, 21];                       // ab welcher Burg-Stufe
const TIER_EISEN = [0, 0, 20000, 250000, 3e6, 3e7];            // einmal Eisen für jede neue Stufe
function stadtVon(who) {
    if (who === 'player') return loadCity();
    const b = loadBotState()[who]; return b && b.city || null;
}
function burgStufe(who) { const c = stadtVon(who); return Math.max(1, Math.min(BURG_MAX, (c && c.levels && c.levels.keep) | 0 || 1)); }
function burgKosten(L) {                                       // von Stufe L auf L + 1
    const b = 1000 * Math.pow(1.72, L - 1);
    return { c: niceRound(2000 * Math.pow(1.85, L - 1)), h: niceRound(b), s: L >= 2 ? niceRound(b * .8) : 0, e: L >= 5 ? niceRound(b * .4) : 0 };
}
function burgZeitRoh(L) { return Math.min(7 * 86400, L <= 14 ? 60 * Math.pow(1.55, L - 1) : 60 * Math.pow(1.55, 13) * Math.pow(1.25, L - 14)); }   // 1 Min. … ~2 Tage
const STADT_MIX = { lumber: { h: .3, s: .9, e: .2 }, quarry: { h: 1.1, s: .2, e: .2 }, mine: { h: 1, s: .9, e: 0 }, wall: { h: .5, s: 1.3, e: .3 }, forge: { h: .6, s: .6, e: 1 }, barracks: { h: .9, s: .6, e: .6 }, market: { h: 1.2, s: .6, e: .2 }, tower: { h: .8, s: 1, e: .4 } };
function stadtKosten(id, L) {                                  // alles für ein Gebäude von Stufe L auf L + 1 (Burg: eigene Tabelle)
    if (id === 'keep') return burgKosten(L);
    const m = STADT_MIX[id] || { h: 1, s: .7, e: .35 }, b = 300 * Math.pow(1.75, L);
    return { c: cityCost(id, L), h: niceRound(b * m.h), s: L >= 2 ? niceRound(b * m.s) : 0, e: L >= 6 ? niceRound(b * m.e) : 0 };
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
// 3) FORSCHUNG (Akademie): drei Äste, lange Zeiten, eine Forschung gleichzeitig
// ---------------------------------------------------------------------------------------------------------------
const FO_AESTE = { w: 'Wirtschaft', m: 'Militär', x: 'Erkundung' };
const FORSCHUNG = [
    { id: 'w_prod', ast: 'w', name: 'Ertrag', icon: 'coin', max: 10, aka: 1, pro: 3, txt: v => '+' + v + ' % Münzen aus allen Basen und Rohstoffe aus der Stadt' },
    { id: 'w_sam', ast: 'w', name: 'Sammeln', icon: 'hourglass', max: 10, aka: 2, pro: 5, txt: v => 'Sammler arbeiten ' + v + ' % schneller' },
    { id: 'w_last', ast: 'w', name: 'Traglast', icon: 'crate', max: 10, aka: 3, pro: 6, txt: v => 'Sammler tragen ' + v + ' % mehr' },
    { id: 'm_atk', ast: 'm', name: 'Angriff', icon: 'attack', max: 10, aka: 2, pro: 2, txt: v => '+' + v + ' % Kampfkraft beim Angreifen' },
    { id: 'm_def', ast: 'm', name: 'Verteidigung', icon: 'defense', max: 10, aka: 2, pro: 2, txt: v => '+' + v + ' % Kampfkraft beim Verteidigen' },
    { id: 'm_laz', ast: 'm', name: 'Lazarett', icon: 'plus', max: 10, aka: 4, pro: 2, txt: v => '+' + v + ' % der Gefallenen ins Lazarett' },
    { id: 'm_t2', ast: 'm', name: 'Truppen-Stufe T2', icon: 'troops', max: 1, aka: 5, tier: 2, vor: 'm_atk', txt: () => 'schaltet T2 frei (+10 % Kampfkraft)' },
    { id: 'm_t3', ast: 'm', name: 'Truppen-Stufe T3', icon: 'troops', max: 1, aka: 10, tier: 3, vor: 'm_t2', txt: () => 'schaltet T3 frei (+25 % Kampfkraft)' },
    { id: 'm_t4', ast: 'm', name: 'Truppen-Stufe T4', icon: 'troops', max: 1, aka: 15, tier: 4, vor: 'm_t3', txt: () => 'schaltet T4 frei (+45 % Kampfkraft)' },
    { id: 'm_t5', ast: 'm', name: 'Truppen-Stufe T5', icon: 'troops', max: 1, aka: 20, tier: 5, vor: 'm_t4', txt: () => 'schaltet T5 frei (+70 % Kampfkraft)' },
    { id: 'x_tempo', ast: 'x', name: 'Marschtempo', icon: 'send', max: 10, aka: 1, pro: 3, txt: v => 'Truppen laufen ' + v + ' % schneller' },
    { id: 'x_spaeh', ast: 'x', name: 'Späher', icon: 'scout', max: 5, aka: 3, pro: 10, txt: v => 'Späher ' + v + ' % schneller' },
    { id: 'x_nebel', ast: 'x', name: 'Kundschaft', icon: 'flag', max: 5, aka: 6, pro: 15, txt: v => 'eroberte Basen decken ' + v + ' % mehr Nebel auf' + (v >= 45 ? ' (Mitspieler: auch die Nachbarn der Nachbarn)' : '') }
];
const FO_BY = {}; for (const d of FORSCHUNG) FO_BY[d.id] = d;
const foAkaFuer = (d, L) => d.aka + (L - 1) * 2;               // Stufe L braucht diese Akademie-Stufe
function foStufe(who, id) { const c = stadtVon(who), d = FO_BY[id]; if (!c || !d || !c.fo) return 0; return Math.max(0, Math.min(d.max, (c.fo[id] | 0) || 0)); }
function foWert(who, id) { const d = FO_BY[id]; return d && d.pro ? foStufe(who, id) * d.pro : 0; }
function foKosten(d, L) {                                      // Stufe L erforschen
    const k = Math.pow(1.6, d.aka - 1) * (d.tier ? 30 : 1), g = Math.pow(1.8, L - 1);
    return { c: niceRound(3000 * k * g), h: niceRound(1500 * k * g), s: niceRound(1200 * k * g), e: niceRound(600 * k * g * (d.ast === 'm' ? 1.6 : 1)) };
}
function foZeitRoh(d, L) { return Math.min(7 * 86400, 300 * Math.pow(1.7, L - 1) * Math.pow(1.35, d.aka - 1) * (d.tier ? 8 : 1)); }   // 5 Min. … Tage
const foZeit = (who, d, L) => Math.round(foZeitRoh(d, L));
function foSperre(who, d) {                                    // warum diese Forschung gerade nicht geht (oder null)
    const c = stadtVon(who); if (!c) return 'kaputt';
    const L = foStufe(who, d.id) + 1, aka = c.levels.academy || 0;
    if (L > d.max) return 'Fertig erforscht.';
    if (aka < foAkaFuer(d, L)) return 'Braucht Akademie Stufe ' + foAkaFuer(d, L) + '.';
    if (d.tier && burgStufe(who) < TIER_BURG[d.tier]) return 'Braucht Burg Stufe ' + TIER_BURG[d.tier] + '.';
    if (d.vor && foStufe(who, d.vor) < 1) return 'Braucht zuerst „' + FO_BY[d.vor].name + '“.';
    if (c.foRun) return 'Die Akademie forscht schon (' + (FO_BY[c.foRun.id] || {}).name + ').';
    return null;
}
function foStart(who, id, now) {                               // → '' oder warum nicht
    const d = FO_BY[id]; if (!d) return 'kaputt';
    const why = foSperre(who, d); if (why) return why;
    const c = stadtVon(who), L = foStufe(who, id) + 1, k = foKosten(d, L);
    if (!zahlen(who, k)) return 'Nicht genug Münzen oder Rohstoffe.';
    now = now || Date.now(); c.foRun = { id, to: L, startedAt: now, endsAt: now + foZeit(who, d, L) * 1000 };
    if (who === 'player') { saveCity(); saveGame(); updateHud(); } else saveBotState();
    return '';
}
function foFertig(who, sofort) {                               // läuft eine Forschung ab (oder sofort: mit Gems), wird sie gutgeschrieben
    const c = stadtVon(who); if (!c || !c.foRun) return false;
    const r = c.foRun; if (!sofort && Date.now() < r.endsAt) return false;
    if (!c.fo) c.fo = {};
    if (FO_BY[r.id]) c.fo[r.id] = Math.max(c.fo[r.id] || 0, Math.min(FO_BY[r.id].max, r.to));
    c.foRun = null;
    if (who === 'player') { saveCity(); flashHint('Forschung fertig: ' + FO_BY[r.id].name + (FO_BY[r.id].max > 1 ? ' Stufe ' + r.to : '') + '.', 3500); sfx('upgrade'); if (cityOpenId === 'academy') renderCitySheet(); }
    else saveBotState();
    return true;
}
const foGems = c => c && c.foRun ? Math.max(1, Math.ceil((c.foRun.endsAt - Date.now()) / 60000) * CITY_GEMS_PER_MIN) : 0;

// ---------------------------------------------------------------------------------------------------------------
// 4) WIRKUNGEN – gleiche Rechnung für alle (Spieler, Mitspieler, andere echte Spieler)
// ---------------------------------------------------------------------------------------------------------------
function tierErlaubt(who) { const B = burgStufe(who); let t = 1; for (let T = 2; T <= 5; T++) if (foStufe(who, 'm_t' + T) >= 1 && B >= TIER_BURG[T]) t = T; else break; return t; }
function truppenStufe(who) { const c = stadtVon(who); return Math.max(1, Math.min((c && c.tier) | 0 || 1, tierErlaubt(who))); }   // (ein Profil mit zu hoher Stufe zählt nur bis zur erlaubten)
function kampf(who, art) {                                     // Kampfkraft-Faktor: Truppen-Stufe × Forschung Angriff/Verteidigung
    if (!who) return 1;
    try { return TIER_KRAFT[truppenStufe(who)] * (1 + foWert(who, art === 'd' ? 'm_def' : 'm_atk') / 100); } catch (e) { return 1; }
}
const ertrag = who => 1 + foWert(who, 'w_prod') / 100;         // Münzen und Rohstoffe der Basen
const sammelTempo = who => 1 + foWert(who, 'w_sam') / 100;
const traglast = who => 1 + foWert(who, 'w_last') / 100;
const marschTempo = who => 1 + foWert(who, 'x_tempo') / 100;
const spaeherTempo = who => 1 + foWert(who, 'x_spaeh') / 100;
const lazarettPlus = who => foWert(who, 'm_laz');
const nebelWeite = who => 1 + foWert(who, 'x_nebel') / 100;
const bauStufe = (who, id) => { const c = stadtVon(who); return c && c.levels ? c.levels[id] || 0 : 0; };
const botschaftTempo = who => 1 + bauStufe(who, 'embassy') * .03;   // Hilfe und Rally zu Bündnis-Mitgliedern
const botschaftGeschenk = who => 1 + bauStufe(who, 'embassy') * .04;
const wachturm = who => bauStufe(who, 'tower');

// ---------------------------------------------------------------------------------------------------------------
// 5) MARKT: Rohstoffe gegen Münzen (Gebühr, Tageslimit) – ein Rohstoff ist 5 Münzen wert
// ---------------------------------------------------------------------------------------------------------------
const MARKT_WERT = 5;
const marktGebuehr = L => Math.max(5, 25 - L) / 100;           // Stufe 1: 24 %, ab Stufe 20: 5 %
function marktLimit(who) {                                     // Münz-Wert pro Tag und Richtung
    const L = bauStufe(who, 'market'); if (!L) return 0;
    let hp = 0; try { hp = hourProduction(who).coins; } catch (e) {}
    return Math.round(Math.max(50000, hp * (.2 + .032 * L)));
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
// 6) TRUPPEN-STUFE wählen (eine Truppenart für das ganze Reich)
// ---------------------------------------------------------------------------------------------------------------
function tierSetzen(who, T) {                                  // → '' oder warum nicht
    const c = stadtVon(who); if (!c || !(T >= 1 && T <= 5)) return 'kaputt';
    if (T > tierErlaubt(who)) return 'T' + T + ' braucht die Forschung „Truppen-Stufe T' + T + '“ und Burg Stufe ' + TIER_BURG[T] + '.';
    const bez = c.tierBez || 1;
    if (T > bez) {                                             // jede neue Stufe einmal Eisen – auch die übersprungenen (wie das Hauptbuch auf dem Server rechnet)
        let e = 0; for (let t = bez + 1; t <= T; t++) e += TIER_EISEN[t];
        if (!zahlen(who, { e })) return 'Die Umstellung auf T' + T + ' kostet ' + fmtCompact(e) + ' Eisen' + (T > bez + 1 ? ' (alle Stufen bis dahin)' : '') + '.'; c.tierBez = T; }
    c.tier = T;
    if (who === 'player') { saveCity(); saveGame(); } else saveBotState();
    return '';
}

// ---------------------------------------------------------------------------------------------------------------
// 7) DEIN TAKT (jede Sekunde aus cityTick): Forschung fertig?
// ---------------------------------------------------------------------------------------------------------------
function spielerTakt() { try { foFertig('player'); } catch (e) {} }

// ---------------------------------------------------------------------------------------------------------------
// 8) ANZEIGE: HUD, Burg-Fenster, Gebäude (Akademie, Kaserne, Markt, Wachturm, Botschaft)
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
    liveHtml(d, ROH.map(x => '<div class="roh-row">' + icon(ROH_DEF[x].icon, 'roh-' + x) + '<span>' + ROH_DEF[x].name + '</span><b>' + fmtNum(Math.floor(roh[x])) + '</b><small>+' + fmtCompact(Math.round(ps[x])) + '/Std.</small></div>').join('') +
        '<small class="roh-hint">Holzfäller, Steinbruch und Eisenmine in deiner Stadt machen Rohstoffe (je nach Landschaft der Hauptstadt). Mehr durch Sammeln auf Holz-, Stein- und Eisen-Feldern der Karte. Gebraucht für Burg, Gebäude, Forschung, Truppen-Stufen.</small>');
}
function rohUmschalten(an) { rohOffen = an === undefined ? !rohOffen : an; const d = document.getElementById('rohDrop'); if (!d) return; d.hidden = !rohOffen; document.getElementById('hudRoh').classList.toggle('on', rohOffen); if (rohOffen) rohDropMalen(); }

function freiText(B) {                                         // was die Burg-Stufe B freischaltet
    const out = ['Gebäude bis Stufe ' + (B >= BURG_MAX ? 'zum Höchstwert' : B)];
    const m = 2 + Math.floor((B - 1) / 6); if (B === 1 || (B - 1) % 6 === 0) out.push(m + ' Marsch-Plätze');
    for (let T = 2; T <= 5; T++) if (TIER_BURG[T] === B) out.push('Truppen-Stufe T' + T + ' (mit Forschung)');
    for (const id in BAU_AB_BURG) if (BAU_AB_BURG[id] === B) out.push('neues Gebäude: ' + cityDef(id).name);
    return out;
}
function renderKeep() {                                        // das Burg-Fenster (Burg in der Stadt antippen)
    const c = loadCity(), B = burgStufe('player'), max = B >= BURG_MAX, bau = cityBuildOf(c, 'keep'), k = max ? null : burgKosten(B);
    const now = Date.now(), sh = shieldUntil() > now ? shieldUntil() : 0, neu = sh ? 0 : neulingBis();
    document.getElementById('citySheet').hidden = false;
    liveHtml(document.getElementById('cityBIcon'), icon('castle'));
    setText(document.getElementById('cityBOver'), 'Deine Burg');
    setText(document.getElementById('cityBName'), 'Burg');
    setText(document.getElementById('cityBLevel'), 'Burg-Stufe ' + B + ' / ' + BURG_MAX);
    setText(document.getElementById('cityBDesc'), 'Das Herz deines Reiches – unabhängig von der Basis-Stufe draußen auf der Karte. Die Burg-Stufe bestimmt, wie hoch deine Gebäude gehen, wie viele Märsche gleichzeitig laufen und welche Truppen-Stufen möglich sind.');
    const note = document.getElementById('cityBNote'), blk = !bau && !max ? cityBlocker('keep') : null; let cls, nh;
    if (bau) { cls = 'notice notice--gold'; nh = icon('hourglass') + '<span style="flex:1">Ausbau auf Burg-Stufe ' + bau.to + ' · noch <b id="cityBNoteTime"></b><div class="city-progress" style="margin-top:6px"><i></i></div></span>'; }
    else if (blk) { cls = 'notice notice--warn'; nh = icon('lock') + '<span>' + blk + '</span>'; }
    else { cls = 'notice'; nh = icon('shield') + '<span>' + (sh ? 'Friedensschild aktiv – noch ' + uhrHtml(sh) : neu > now ? 'Anfängerschutz – noch ' + uhrHtml(neu) : 'Kein Friedensschild aktiv.') + '</span>'; }
    if (note.className !== cls) note.className = cls; liveHtml(note, nh);
    liveHtml(document.getElementById('cityBStats'), max ? '' : '<div class="city-kosten"><span>Kosten</span><b>' + kostenHtml(k) + '</b></div><div><span>Bauzeit</span><b>' + icon('hourglass') + fmtDuration(cityTimeSec('keep', B)) + '</b></div>');
    const up = document.getElementById('cityUpgradeBtn'), sp = document.getElementById('citySpeedBtn');
    setBtnLabel(up, max ? 'Höchste Stufe' : 'Burg aufwerten auf ' + (B + 1)); up.disabled = max || !!blk || !!bau || !kannZahlen('player', k); up.title = blk || ''; up.style.display = bau ? 'none' : '';
    sp.style.display = bau ? '' : 'none'; if (bau) renderCitySheetTimer();
    const belegt = marschBelegt('player'), T = truppenStufe('player');
    liveHtml(document.getElementById('cityBExtra'),
        '<div class="keep-h">Jetzt</div><div class="auf-grid"><div><span>Marsch-Plätze</span><b>' + belegt + ' / ' + marschGrenze('player') + ' belegt</b></div><div><span>Gebäude</span><b>bis Stufe ' + stadtCap('player', 'wall') + '</b></div><div><span>Truppen</span><b>T' + T + ' · +' + Math.round((TIER_KRAFT[T] - 1) * 100) + ' %</b></div></div>' +
        (max ? '' : '<div class="keep-h">Burg-Stufe ' + (B + 1) + ' schaltet frei</div><ul class="auf-frei">' + freiText(B + 1).map(t => '<li>' + icon('check') + t + '</li>').join('') + '</ul>') +
        '<small class="keep-note">Deine Hauptstadt hat nur diese EINE Stufe: auf der Karte steht sie auf Stufe ' + burgKarte(B) + ' (Burg 25 = Stufe 100). Die anderen Basen draußen wertest du sofort mit Münzen auf. Friedensschilde: Shop → Schilde.</small>');
}
function effektText(id, lvl) {
    if (id === 'academy') return (lvl ? 'Forschung bis Akademie-Stufe ' + lvl + ' · Truppen laufen +' + lvl * 2 + ' % schneller.' : 'Baue die Akademie, um zu forschen.') + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: mehr Forschung, +' + (lvl + 1) * 2 + ' % Tempo.' : '');
    if (id === 'tower') return lvl ? 'Angriffe auf dich: ' + (lvl >= 10 ? 'genaue Stärke, Truppen-Stufe und Held' : 'ungefähre Stärke') + '. Spähberichte zeigen ' + (lvl >= 5 ? 'Burg, Truppen-Stufe und Forschung' : 'Burg und Truppen-Stufe') + '.' + (lvl < 5 ? ' Ab Stufe 5: Forschung im Spähbericht.' : lvl < 10 ? ' Ab Stufe 10: genaue Angreifer.' : '') : 'Baue den Wachturm: du siehst, wie stark Angreifer sind, und spähst genauer.';
    if (id === 'embassy') return lvl ? 'Hilfe und Rally zu Bündnis-Mitgliedern +' + lvl * 3 + ' % schneller · Bündnis-Geschenke +' + lvl * 4 + ' %.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: +' + (lvl + 1) * 3 + ' % / +' + (lvl + 1) * 4 + ' %.' : '') : 'Baue die Botschaft für schnellere Bündnis-Hilfe und größere Bündnis-Geschenke.';
    const rx = { lumber: ['h', 'Holz'], quarry: ['s', 'Stein'], mine: ['e', 'Eisen'] }[id];
    if (rx) { const k = rx[0], jetzt = rohStunde('player')[k], f = jetzt / Math.max(1, ROH_BURG_STUNDE + rohGebStunde(lvl));
        return (lvl ? 'Jetzt: ' : 'Ohne Gebäude (nur die Burg): ') + fmtCompact(jetzt) + ' ' + rx[1] + ' pro Stunde.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: ' + fmtCompact((ROH_BURG_STUNDE + rohGebStunde(lvl + 1)) * f) + '.' : ''); }
    if (id === 'market') return lvl ? 'Gebühr ' + Math.round(marktGebuehr(lvl) * 100) + ' % · Tageslimit ' + fmtCompact(marktLimit('player')) + ' Münzen je Richtung.' + (lvl < CITY_MAX_LEVEL ? ' Nächste Stufe: Gebühr ' + Math.round(marktGebuehr(lvl + 1) * 100) + ' %, höheres Limit.' : '') : 'Baue den Markt, um Rohstoffe gegen Münzen zu tauschen.';
    return '';
}
let foAst = 'w', marktMenge = 1000;
function foZeile(d) {
    const L = foStufe('player', d.id), max = L >= d.max, c = loadCity(), lauf = c.foRun && c.foRun.id === d.id, why = max ? null : foSperre('player', d), k = max ? null : foKosten(d, L + 1);
    const jetzt = d.pro ? (L ? d.txt(L * d.pro) : 'noch nichts') : (L ? 'erforscht' : d.txt());
    return '<div class="fo-row' + (max ? ' is-max' : '') + (lauf ? ' is-run' : '') + '">' + icon(d.icon) + '<span class="fo-t"><b>' + d.name + (d.max > 1 ? ' <em>' + L + '/' + d.max + '</em>' : '') + '</b><small>' + jetzt + (max || !d.pro ? '' : ' → ' + d.txt((L + 1) * d.pro)) + '</small>' +
        (max ? '' : '<small class="fo-k">' + kostenHtml(k) + '<span class="kost">' + icon('hourglass') + fmtDuration(foZeit('player', d, L + 1)) + '</span></small>') + '</span>' +
        (max ? '<em class="fo-ok">' + icon('check') + '</em>' : lauf ? '<em>läuft</em>' : '<button type="button" class="btn btn--primary btn--sm" data-fo="' + d.id + '"' + (why || !kannZahlen('player', k) ? ' disabled' : '') + ' title="' + (why || '') + '">Forschen</button>') +
        (why && !max && !lauf && !c.foRun ? '<small class="fo-why">' + why + '</small>' : '') + '</div>';
}
function extraHtml(id, lvl) {
    if (id === 'academy') {
        const c = loadCity(), r = c.foRun, d = r && FO_BY[r.id];
        const lauf = d ? '<div class="notice notice--gold fo-lauf">' + icon('hourglass') + '<span style="flex:1"><b>' + d.name + (d.max > 1 ? ' Stufe ' + r.to : '') + '</b> · noch ' + uhrHtml(r.endsAt) + '<div class="city-progress" style="margin-top:6px"><i style="--p:' + Math.min(100, (Date.now() - r.startedAt) / Math.max(1, r.endsAt - r.startedAt) * 100).toFixed(1) + '%"></i></div></span><button type="button" class="btn btn--secondary btn--sm" data-fo-gems' + (gems < foGems(c) ? ' disabled' : '') + '>Fertig · ' + foGems(c) + ' Gems</button></div>' : '';
        if (!lvl) return lauf;
        return lauf + '<div class="seg fo-tabs">' + Object.keys(FO_AESTE).map(a => '<button type="button" data-fo-ast="' + a + '"' + (a === foAst ? ' class="on"' : '') + '>' + FO_AESTE[a] + '</button>').join('') + '</div>' +
            '<div class="fo-list">' + FORSCHUNG.filter(f => f.ast === foAst).map(foZeile).join('') + '</div><small class="keep-note">Eine Forschung gleichzeitig. Die Akademie-Stufe bestimmt, wie weit du forschen kannst.</small>';
    }
    if (id === 'barracks') {
        const T = truppenStufe('player'), erl = tierErlaubt('player'), bez = loadCity().tierBez || 1;
        return '<div class="keep-h">Truppen-Stufe (eine Truppenart für dein ganzes Reich)</div><div class="fo-list">' + [1, 2, 3, 4, 5].map(t => {
            let kost = 0; for (let x = bez + 1; x <= t; x++) kost += TIER_EISEN[x]; const ok = t <= erl;   // (übersprungene Stufen zählen mit)
            return '<div class="fo-row' + (t === T ? ' is-run' : '') + '">' + icon('troops') + '<span class="fo-t"><b>T' + t + (t === T ? ' <em>aktiv</em>' : '') + '</b><small>' + (t === 1 ? 'Standard' : '+' + Math.round((TIER_KRAFT[t] - 1) * 100) + ' % Kampfkraft (Angriff und Verteidigung)') + '</small>' +
                (t > 1 && !ok ? '<small class="fo-why">Braucht Forschung „Truppen-Stufe T' + t + '“ und Burg Stufe ' + TIER_BURG[t] + '.</small>' : '') + '</span>' +
                (t === T ? '<em class="fo-ok">' + icon('check') + '</em>' : '<button type="button" class="btn btn--' + (t > T ? 'primary' : 'secondary') + ' btn--sm" data-tier="' + t + '"' + (!ok || roh.e < kost ? ' disabled' : '') + '>' + (kost ? icon(ROH_DEF.e.icon) + fmtCompact(kost) : 'Umstellen') + '</button>') + '</div>';
        }).join('') + '</div><small class="keep-note">Jede neue Stufe kostet einmal Eisen. Zurückstellen ist frei. Laufende Märsche kämpfen mit der Stufe vom Losschicken.</small>';
    }
    if (id === 'market' && lvl) return '<button type="button" class="btn btn--primary btn--sm" data-markt-shop>' + icon('shop') + '<span>Handeln: Shop → Markt</span></button>';
    return '';
}
function marktHtml() {                                         // Shop → Markt: Rohstoffe gegen Münzen (die Stufe des Markt-Gebäudes bestimmt Gebühr und Limit)
    const lvl = bauStufe('player', 'market');
    if (!lvl) return '<div class="notice">' + icon('lock') + '<span>Baue zuerst den Markt in deiner Stadt (ab Burg-Stufe ' + BAU_AB_BURG.market + ').</span></div>';
    const c = loadCity(), m = marktHeute(c), lim = marktLimit('player'), f = marktGebuehr(lvl), N = marktMenge;
    return '<div class="seg" data-mk-n>' + [1000, 10000, 100000, 1000000].map(v => '<button type="button" data-mk-menge="' + v + '"' + (v === N ? ' class="on"' : '') + '>' + fmtCompact(v) + '</button>').join('') + '</div><div class="fo-list">' +
            ROH.map(x => '<div class="fo-row">' + icon(ROH_DEF[x].icon, 'roh-' + x) + '<span class="fo-t"><b>' + ROH_DEF[x].name + '</b><small>' + fmtNum(Math.floor(roh[x])) + ' im Lager</small></span>' +
                '<button type="button" class="btn btn--secondary btn--sm" data-mk="v:' + x + '"' + (roh[x] < N || m.v + N * MARKT_WERT > lim ? ' disabled' : '') + '>+' + fmtCompact(Math.floor(N * MARKT_WERT * (1 - f))) + ' ' + icon('coin', 'icon--coin') + '</button>' +
                '<button type="button" class="btn btn--primary btn--sm" data-mk="k:' + x + '"' + (coins < Math.ceil(N * MARKT_WERT * (1 + f)) || m.k + N * MARKT_WERT > lim ? ' disabled' : '') + '>−' + fmtCompact(Math.ceil(N * MARKT_WERT * (1 + f))) + ' ' + icon('coin', 'icon--coin') + '</button></div>').join('') +
            '</div><small class="keep-note">Links verkaufen, rechts kaufen (' + fmtCompact(N) + ' Stück). 1 Rohstoff = ' + MARKT_WERT + ' Münzen, Gebühr ' + Math.round(f * 100) + ' % (Markt Stufe ' + lvl + '). Heute noch: verkaufen ' + fmtCompact(Math.max(0, lim - m.v)) + ', kaufen ' + fmtCompact(Math.max(0, lim - m.k)) + ' Münzen-Wert.</small>';
}
// Klicks im Gebäude-Fenster (Akademie, Kaserne, Markt)
document.getElementById('citySheet').addEventListener('click', e => {
    const a = e.target.closest('[data-fo-ast]'); if (a) { foAst = a.dataset.foAst; renderCitySheet(); return; }
    const f = e.target.closest('[data-fo]:not([disabled])'); if (f) { const why = foStart('player', f.dataset.fo); flashHint(why || 'Forschung gestartet: ' + FO_BY[f.dataset.fo].name + '.', 2800); if (!why) sfx('upgrade'); renderCitySheet(); return; }
    if (e.target.closest('[data-fo-gems]:not([disabled])')) { const c = loadCity(), g = foGems(c); if (!g || gems < g) return; gems -= g; saveGame(); updateHud(); foFertig('player', true); renderCitySheet(); return; }
    const t = e.target.closest('[data-tier]:not([disabled])'); if (t) { const why = tierSetzen('player', +t.dataset.tier); flashHint(why || 'Deine Truppen kämpfen jetzt als T' + t.dataset.tier + '.', 3000); updateHud(); renderCitySheet(); return; }
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

// Wachturm: was du über einen Angriff auf dich siehst
function angreiferInfo(a) {
    const L = wachturm('player'); if (!L) return '';
    const n = a.rawTroops || 0; if (!n) return '';
    if (L < 10) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return ' · ca. ' + fmtCompact(Math.round(n / p) * p) + ' Truppen'; }
    const h = a.hero && heroById(a.hero);
    return ' · ' + fmtCompact(n) + ' Truppen' + (a.atkTier > 1 ? ' T' + a.atkTier : '') + (h ? ' · ' + h.name : '');
}
// Spähbericht: mehr mit Wachturm (für dich und alle anderen gleich)
function spaeherMehr(spaeher, owner) {
    const L = wachturm(spaeher); if (!L || !owner) return null;
    const o = { burg: burgStufe(owner), tier: truppenStufe(owner) };
    if (L >= 5) o.fo = { atk: foStufe(owner, 'm_atk'), def: foStufe(owner, 'm_def'), laz: foStufe(owner, 'm_laz') };
    return o;
}

// ---------------------------------------------------------------------------------------------------------------
// 9) MITSPIELER: Burg, Gebäude, Forschung, Truppen-Stufe, Markt – gleiche Regeln und Kosten, nie geschummelt
// ---------------------------------------------------------------------------------------------------------------
const BOT_FO_LIEBER = {
    raider: ['m_atk', 'm_t2', 'm_t3', 'x_tempo', 'm_t4', 'm_laz', 'm_t5', 'w_prod', 'm_def', 'w_last', 'w_sam', 'x_spaeh', 'x_nebel'],
    builder: ['w_prod', 'm_def', 'w_last', 'w_sam', 'm_atk', 'm_t2', 'm_laz', 'm_t3', 'x_tempo', 'm_t4', 'm_t5', 'x_spaeh', 'x_nebel'],
    templer: ['m_atk', 'm_def', 'm_t2', 'w_prod', 'm_t3', 'm_laz', 'm_t4', 'x_tempo', 'm_t5', 'w_last', 'w_sam', 'x_nebel', 'x_spaeh'],
    balanced: ['w_prod', 'm_atk', 'm_def', 'm_t2', 'x_tempo', 'w_sam', 'm_t3', 'm_laz', 'w_last', 'm_t4', 'm_t5', 'x_spaeh', 'x_nebel'],
    veteran: ['m_atk', 'w_prod', 'm_t2', 'm_def', 'm_t3', 'x_tempo', 'm_t4', 'm_laz', 'm_t5', 'w_sam', 'w_last', 'x_nebel', 'x_spaeh']
};
function botStadtFix(b) {                                      // fehlende Felder (alte Spielstände): Burg 1, keine Forschung, T1, Start-Rohstoffe
    const c = b.city; if (!c) return;
    if (!(c.levels.keep >= 1)) c.levels.keep = 1;
    if (!c.fo || typeof c.fo !== 'object') c.fo = {};
    if (!(c.tier >= 1)) c.tier = 1;
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
        foStart(bot.id, id, now); return;
    }
}
function botTruppenStufe(bot) {                                // eine höhere Stufe, sobald erlaubt und das Eisen da ist (mit Polster)
    const b = loadBotState()[bot.id]; if (!b || !b.city) return;
    const T = truppenStufe(bot.id), erl = tierErlaubt(bot.id); if (erl <= T) return;
    const N = T + 1, kost = N > (b.city.tierBez || 1) ? TIER_EISEN[N] : 0;
    if ((b.res.e || 0) >= kost * 1.2) tierSetzen(bot.id, N);
    else if (Math.random() < .3) botMarkt(bot, { e: kost * 1.2 });
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
    ROH_DEF, BURG_MAX, BAU_AB_BURG, TIER_BURG, TIER_EISEN, FORSCHUNG, MARKT_WERT,
    rohVon, rohDazu, rohSpeichern, basisRoh, rohBuchen, rohStunde, kannZahlen, zahlen, kostenHtml,
    burgStufe, burgZeitRoh, stadtKosten, stadtCap,
    marschFrei, marschOk, marschVoll, frei: { an() { marschFreiPass++; }, aus() { marschFreiPass = Math.max(0, marschFreiPass - 1); } },
    foStufe, foWert, foKosten, foFertig, truppenStufe, marktLimit, marktHtml,
    kampf, ertrag, sammelTempo, traglast, marschTempo, spaeherTempo, lazarettPlus, nebelWeite, botschaftTempo, botschaftGeschenk, botschaftStufe: who => bauStufe(who, 'embassy'),
    spielerTakt, hud: hudRoh, renderKeep, effektText, extraHtml, angreiferInfo, spaeherMehr,
    botStadtFix, botForschung, botTruppenStufe, botMarkt, botBurgWert, botRohWunsch
};
for (const id in (loadBotState() || {})) try { botStadtFix(botState[id]); } catch (e) {}
hudRoh();
