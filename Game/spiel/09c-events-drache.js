// Teil 09c-events-drache.js: Events: Wochen-Event, Barbaren-Invasion, Drache
// ===== EVENTS (Paket B): Wochen-Event, Barbaren-Invasion, Drache – alles rechnet der Weltrechner, Zuschauer sehen es =====
// Zeitpläne (Ortszeit des Weltrechners): Wochen-Event Mo–Fr mit wechselndem Thema (Wochenende frei),
// Invasion alle 3 Tage 20:00–21:00, Drache sonntags 19:00–22:00. Welt-Schlüssel: openWaterEvents (evState, Wochen-Event in evState.wo).
var EV_TEST = null;   // NUR für Tests in einer lokalen Kopie: { inv: Startzeit, dr: Startzeit } – im echten Spiel immer null
// ---- die 4 Themen wechseln wöchentlich im Wochen-Event (Mo–Fr): wofür es Punkte gibt + ein Bonus ----
const EV_WOCHE = [
    { k: 'sam', name: 'Sammel-Rausch', ic: 'coin', pkt: 'Gesammeltes – ein volles Feld bringt 30', bonus: 'Sammeln 50 % schneller' },
    { k: 'krieg', name: 'Krieger-Woche', ic: 'attack', pkt: 'besiegte Truppen – überall: Basen, Felder, Lager, Barbaren', bonus: '10 Barbaren-Lager mehr pro Tag' },
    { k: 'boss', name: 'Boss-Jagd', ic: 'star', pkt: 'Schaden an Tagesboss und Drache (30 je voller Treffer)', bonus: 'Kriegsherr doppelt so oft, 5 Tagesboss-Angriffe mehr' },
    { k: 'bau', name: 'Bauherr', ic: 'upgrade', pkt: 'Aufwerten von Basen und Gebäuden in der Stadt (2 + neue Stufe)', bonus: 'Ausbau 20 % günstiger' }
];
// ---- WOCHEN-EVENT Mo 0:00 – Fr 23:59, Wochenende frei jede Woche eins der 4 Themen, eigene Punkte (gedeckelt), Rangliste und kleine Preise ----
const WO_PRIZES = [{ to: 1, gems: 250, crate: 3, sh: 20, mh: 8, t: '1.' }, { to: 5, gems: 150, crate: 2, sh: 12, mh: 6, t: '2.–5.' }, { to: 10, gems: 100, crate: 2, sh: 8, mh: 4, t: '6.–10.' },
    { to: 20, gems: 60, crate: 1, sh: 5, mh: 3, t: '11.–20.' }, { to: 100, gems: 30, crate: 0, sh: 3, mh: 2, t: '21.–100.' }, { to: 1000, gems: 10, sh: 1, mh: 1, t: '101.–1000.' }];   // (Merkliste 33: mh = Stunden Münzen; ab Platz 1001 nichts)
let woWinMemo = null;
function woWin(now) {                                 // diese oder (am Wochenende) nächste Woche, Mo 0:00 – Fr 23:59: { on, start, end, key }
    now = now || Date.now(); const m = woWinMemo; if (m && now >= m.from && now < m.to) return m.w;
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Montag dieser Woche
    let start = d.getTime(), key = todayKey(d); d.setDate(d.getDate() + 5); let end = d.getTime();
    if (now >= end) { const n = new Date(start); n.setDate(n.getDate() + 7); start = n.getTime(); key = todayKey(n); n.setDate(n.getDate() + 5); end = n.getTime(); }   // Wochenende: frei
    const on = now >= start && now < end;
    woWinMemo = { w: { on, start, end, key }, from: on ? start : now, to: on ? end : start }; return woWinMemo.w;
}
function woOn(now) { return woWin(now).on; }
function woThemaAm(t) { const w = woWin(t), d = new Date(w.start); d.setHours(12, 0, 0, 0); const n = Math.floor(d.getTime() / (7 * 864e5)); return EV_WOCHE[((n % EV_WOCHE.length) + EV_WOCHE.length) % EV_WOCHE.length]; }
function evThemaAktivAm(t, k) { try { return woOn(t) && woThemaAm(t).k === k; } catch (e) { return false; } }   // (beim Laden evtl. noch nicht bereit)
function evThemaAktiv(k) { return evThemaAktivAm(Date.now(), k); }
function evPunkte(kind, who, n) { if (evThemaAktiv(kind)) woDeckel(who, n, kind); }
function woSt() { return evState.wo || (evState.wo = { pts: {}, kb: {} }); }
function woRoll(now) {                                // (nur wer rechnet) eine fertige Woche zahlt einmal aus, eine neue beginnt leer
    const W = woSt(), w = woWin(now);
    if (W.key && !W.paid && now >= W.end) woPay();
    if (w.on && W.key !== w.key) { Object.assign(W, { key: w.key, end: w.end, k: woThemaAm(now).k, pts: {}, kb: {}, paid: false }); evDirty = true; }
}
function woDeckel(who, n, kind) {                     // höchstens 30 Punkte auf einmal, im Schnitt 10 pro Minute – für alle gleich
    if (!rechnet() || !who || !(n > 0) || (who !== 'player' && !botById[who])) return; const now = Date.now(); if (!woOn(now)) return; woRoll(now);
    const W = woSt(), k = W.kb[who] || [WO_KILL_MAX, now], left = Math.min(WO_KILL_MAX, k[0] + Math.max(0, now - k[1]) / 60000 * WO_KILL_MIN), m = Math.min(WO_KILL_MAX, n, left);
    if (!(m > 0)) return; W.kb[who] = [left - m, now]; W.pts[who] = (W.pts[who] || 0) + m; evDirty = true;
}
function woPay() {                                    // Platz 1, 2–3, 4–10 und alle anderen mit Punkten – du, echte Spieler und Mitspieler gleich
    const W = woSt(), th = EV_WOCHE.find(x => x.k === W.k) || EV_WOCHE[0], list = evRang(W.pts).filter(e => e[1] >= 1);
    W.paid = true; let me = 0;
    list.forEach(([who], i) => { const p = WO_PRIZES.find(x => i + 1 <= x.to); if (p) evPreis(who, 'woche', 'Wochen-Event ' + th.name + ' · Platz ' + (i + 1), p, W.key); if (who === 'player' && p) me = i + 1; });
    W.last = { key: W.key, k: W.k, top: list.slice(0, WO_TOP).map(e => [e[0], Math.floor(e[1])]), n: list.length };
    evDirty = true; saveBotState(); saveEv();
    if (me) afterSplash(() => setTimeout(() => flashHint('Wochen-Event vorbei: Platz ' + me + ' – dein Preis liegt unter Events → Belohnung.', 6000), 2500));
}
function barbTagMax() { return BARB_DAY + (evThemaAktiv('krieg') ? 10 : 0); }
function dbossHitsMax() { return DBOSS_HITS + (evThemaAktiv('boss') ? 5 : 0); }
function evBossTakt() { return evThemaAktiv('boss') ? .5 : 1; }   // Boss-Jagd: der Kriegsherr kommt doppelt so oft

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
function evPreis(who, src, title, p, schl, bis) {     // schl: fester Schlüssel der Auszahlung (Woche, Tag, Stufe …) – kommt nie doppelt an; ein Preis: deiner ins Abholfach, ein echter Mitspieler bekommt ihn als Nachricht (auch Kisten), Mitspieler direkt
    // bis: Ende des Events (Invasion, Drache) bzw. des Tages (Tagesboss, Lager) – bis dahin nur im Event abholbar, danach im Abholfach
    const gems = Math.round(p.gems || 0), sh = Math.round(p.sh || 0), crate = p.crate >= 0 ? p.crate : -1, titel = saisonTitel(p.titel) ? p.titel : null;   // titel: Saison-Platz (Erfolg; der Saison-Rahmen kommt aus saison.last)
    const { coins, tr } = evStunden(who, p), k = schl != null ? src + '|' + schl : undefined;   // k: das Abholfach kennt die Stufe (Leiste im Event-Fenster)
    let b = Array.isArray(p.b) && p.b.length ? p.b : undefined;   // b: Gegenstände [Art, Menge, Extra] (Thron-Event)
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
function evPlanTag(now, ok, stunde, dauer) {          // der nächste Tag (ab heute), an dem ok(Datum) gilt, zur Stunde – solange er noch nicht vorbei ist
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 10; i++) { const t = new Date(d); t.setDate(d.getDate() + i); if (!ok(t)) continue; t.setHours(stunde, 0, 0, 0); const s = t.getTime(); if (s + dauer > now) return { start: s, end: s + dauer }; }
    return { start: now + 864e5, end: now + 864e5 + dauer };
}

// ===== BARBAREN-INVASION: alle 3 Tage um 20 Uhr eine Stunde lang kommen Wellen von Barbaren-Armeen vom Rand ihrer Insel
// und greifen die nächsten Basen an (echte Spieler und Mitspieler). Abwehren und Armeen schlagen bringt Punkte, jede erreichte
// Stufe der Belohnungs-Leiste wird im Event abgeholt (bis zum Ende, danach liegt sie im Abholfach). Barbaren erobern nichts – wer verliert, verliert Truppen.
const INV_TAGE = 3, INV_STUNDE = 20, INV_DAUER = 60 * 60000, INV_WELLEN = 6, INV_WELLE_MS = 9 * 60000, INV_PRO_WELLE = 12;
const INV_PTS_WEHR = 15, INV_PTS_SIEG = 20;
const INV_LEISTE = [{ ab: 20, gems: 5, mh: 2 }, { ab: 50, gems: 15, crate: 0 }, { ab: 100, gems: 20, sh: 5, crate: 1 }, { ab: 150, th: 2, mh: 4 }, { ab: 200, gems: 20, crate: 2 }, { ab: 300, gems: 30, sh: 10, crate: 2 }];   // Punkte → Belohnung (mh/th: Stunden Münzen/Truppen)
// Leiste auszahlen (nur wer rechnet): jede erreichte Stufe genau einmal (lst[who] = so viele Stufen schon bezahlt, fester Schlüssel je Stufe)
function evLeisteZahlen(X, stufen, who, wert, src, titel, schl) {
    const L = X.lst || (X.lst = {}); let n = L[who] || 0;
    while (n < stufen.length && wert >= stufen[n].ab) { evPreis(who, src, titel(stufen[n], n), stufen[n], schl + '|' + n, X.end); n++; L[who] = n; evDirty = true; }
}
function invLeiste(I, who) { evLeisteZahlen(I, INV_LEISTE, who, (I.pts || {})[who] || 0, 'inv', x => 'Barbaren-Invasion · ' + x.ab + ' Punkte', I.start); }
const evTagNr = t => Math.round(new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12).getTime() / 864e5);
function invPlan(now) {
    now = now || Date.now();
    if (EV_TEST && EV_TEST.inv) return { start: EV_TEST.inv, end: EV_TEST.inv + INV_DAUER };
    return evPlanTag(now, t => evTagNr(t) % INV_TAGE === 0, INV_STUNDE, INV_DAUER);
}
function invAktiv(now) { const I = evState.inv; now = now || Date.now(); return I && !I.paid && now >= I.start && now < I.end + 5 * 60000 ? I : null; }
const invArmee = id => { const I = invAktiv(); return I && (I.armies || []).find(a => a.id === id) || null; };
function invPos(a, now) {                            // wo die Armee gerade ist: vom Rand gerade auf ihr Ziel zu
    const t = islandById[a.tid], q = Math.max(0, Math.min(1, ((now || Date.now()) - a.at0) / Math.max(1, a.at1 - a.at0)));
    return t ? { x: a.x0 + (t.x - a.x0) * q, y: a.y0 + (t.y - a.y0) * q, lm: a.lm, landmassId: a.lm } : { x: a.x0, y: a.y0, lm: a.lm, landmassId: a.lm };
}
function invTreffpunkt(a, homeId, who) {             // wo deine Truppen die Armee treffen (oder null: sie kämen zu spät)
    const home = islandById[homeId]; if (!home || !a) return null; const now = Date.now();
    let p = invPos(a, now);
    for (let i = 0; i < 3; i++) { const t = travelDurationSeconds(home, barbPt(p), who === 'player' ? undefined : who) * 1000; p = invPos(a, now + t); p.at = now + t; }
    return p.at < a.at1 - 3000 ? p : null;
}
function invStartPunkt(isl) {                        // am Rand ihrer Insel, auf der Seite weg von der Mitte der Karte
    const lm = landmasses[isl.landmassId], L = Math.hypot(isl.x, isl.y) || 1; let ux = isl.x / L, uy = isl.y / L;
    for (const dreh of [0, .7, -.7, 1.4, -1.4]) {
        const vx = ux * Math.cos(dreh) - uy * Math.sin(dreh), vy = ux * Math.sin(dreh) + uy * Math.cos(dreh);
        let last = 0; for (let s = ISLAND_RADIUS; s < lm.shapeMaxR * 2.2; s += ISLAND_RADIUS * .8) { if (aufLand(lm, isl.x + vx * s, isl.y + vy * s)) last = s; else if (last) break; }
        if (last >= ISLAND_RADIUS * 4) return { x: isl.x + vx * last, y: isl.y + vy * last };
    }
    return { x: isl.x + ux * ISLAND_RADIUS * 8, y: isl.y + uy * ISLAND_RADIUS * 8 };   // kleine Insel: sie kommen übers Wasser
}
// Ein Friedensschild hält die Barbaren ab. Der Anfängerschutz nicht – aber Neulinge bekommen nur halb so starke Armeen
// (meist ein Sieg mit Punkten, ein Kennenlernen statt eines Verlusts).
function invGeschuetzt(o, now) { return o === 'player' ? shieldUntil() > now : ((loadBotState()[o] || {}).shieldUntil || 0) > now; }
const invNeuling = (o, now) => (o === 'player' ? neulingBis() : botNeulingBis(o, loadBotState()[o] || {})) > now;
function invZielOk(id, used, now) {
    const isl = islandById[id], o = isl && islandOwnerOf(id);
    return !!o && isl.type === 'tower' && !used.has(id) && !midZoneIds.has(id) && !invGeschuetzt(o, now) && landmasses[isl.landmassId].tier === 'outer';
}
function invZiele(I, now) {                          // jeder echte Spieler bekommt pro Welle eine Armee (seine äußerste Basis), dazu Mitspieler-Basen
    const used = new Set(I.armies.map(a => a.tid)), out = [];
    const menschen = BOT_DEFS.filter(b => b.mensch).map(b => b.id); if (ownedIslands.size) menschen.unshift('player');
    for (const who of menschen) { let best = null, bs = -1;
        for (const id of (who === 'player' ? ownedIslands : botOwnedIslands[who]) || []) { if (!invZielOk(id, used, now)) continue; const lm = landmasses[islandById[id].landmassId], s = lm.ring * 10 + Math.random() * 5; if (s > bs) { bs = s; best = id; } }
        if (best !== null) { out.push(best); used.add(best); } }
    const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size);
    for (let n = 0, tries = 0; n < INV_PRO_WELLE && bots.length && tries < INV_PRO_WELLE * 15; tries++) {
        const own = [...botOwnedIslands[bots[Math.floor(Math.random() * bots.length)].id]], id = own[Math.floor(Math.random() * own.length)];
        if (invZielOk(id, used, now)) { out.push(id); used.add(id); n++; } }
    return out;
}
function invWelle(I, now) {                          // eine Welle: jede Armee so stark wie ihr Ziel (spätere Wellen stärker), 5–7 Min. Marsch
    const w = I.welle + 1; let mich = 0;
    for (const tid of invZiele(I, now)) {
        const isl = islandById[tid], s = invStartPunkt(isl), base = effectiveTroops(isl) + effectiveDefense(isl);
        const t = niceRound(Math.max(wirtK(5000), base * (.5 + .13 * w) * (.8 + Math.random() * .4) * (invNeuling(islandOwnerOf(tid), now) ? .5 : 1)));   // (Mindeststärke × WIRTSCHAFT_KOSTEN)
        I.armies.push({ id: 'i' + (I.n++), x0: Math.round(s.x), y0: Math.round(s.y), lm: isl.landmassId, tid, t, max: t, at0: now, at1: now + (5 + Math.random() * 2) * 60000, w });
        if (islandOwnerOf(tid) === 'player') mich++;
    }
    evDirty = true; requestRender();
    flashHint('Barbaren-Invasion: Welle ' + w + ' von ' + INV_WELLEN + ' rückt an!' + (mich ? ' Eine Armee marschiert auf deine Basis.' : ''), 4500);
}
function invPunkteDazu(I, who, n) { if (!who || !(n > 0) || (who !== 'player' && !botById[who])) return; I.pts[who] = (I.pts[who] || 0) + n; evDirty = true; goalBump(who, 'invPkt', n); invLeiste(I, who); }   // (invPkt: Pass-Punkte je Invasions-Punkt)
function invAnkunft(I, a, now) {                     // die Armee erreicht ihr Ziel: dieselbe Rechnung wie jeder Angriff (Truppen + Verteidigung)
    const isl = islandById[a.tid], o = isl && islandOwnerOf(a.tid); if (!o || invGeschuetzt(o, now)) return;
    const vk = typeof verstVorKampf === 'function' ? verstVorKampf(a.tid) : null;   // Verstärkung (Botschaft) verteidigt mit
    const dHx = vhFx(o);                                                   // Verteidigungs-Helden aus der Mauer: Angriff + Gefolge in effectiveDefense, dazu Verluste + Krankenhaus
    let en = 0, def = 0, durch = false, verlustAlle = 0, vs = null;
    try {                                                                  // (ein Fehler dazwischen: die Verstärkung wird trotzdem wieder getrennt)
        en = effectiveTroops(isl); def = effectiveDefense(isl); durch = a.t > en + def;
        verlustAlle = Math.min(en, Math.round(durch ? en * .6 : a.t * .35 * (1 - (dHx ? dHx.loss : 0) / 100)));
        islandTroops[a.tid] = Math.max(0, (islandTroops[a.tid] || 0) - verlustAlle);
    } finally { vs = vk ? verstNachKampf(a.tid, vk, false) : null; }
    const verlust = vs ? vs.eigenWeg : verlustAlle, wounded = verlust > 0 ? fieldHurt(o, verlust, dHx) : 0;   // (jeder seinen Anteil)
    if (vs) for (const h of vs.helfer) if (h.fallen + h.wounded > 0) bundMelden(h.w, 'Barbaren-Invasion bei ' + islandTitle(isl) + ': deine Verstärkung verlor ' + fmtCompact(h.fallen + h.wounded) + (h.wounded ? ' (' + fmtCompact(h.wounded) + ' ins Krankenhaus)' : '') + '.');
    if (!durch) { invPunkteDazu(I, o, INV_PTS_WEHR); I.wehr[o] = (I.wehr[o] || 0) + 1;
        for (const [w, f] of (typeof verstAnteile === 'function' && verstAnteile(vk, o, en + def)) || [[o, 1]]) if (f > 0) evPunkte('krieg', w, a.t * f / WO_KILL_PER); }   // (Wochen-Punkte: Besitzer + Helfer nach Anteil)
    const titel = islandTitle(isl);
    evBericht(o, { type: 'ev', ic: 'defense', gut: !durch, badge: durch ? 'Überrannt' : 'Abgewehrt', title: 'Barbaren-Invasion · ' + titel,
        txt: fmtCompact(a.t) + ' Barbaren gegen ' + fmtCompact(en + def) + ' · ' + fmtCompact(verlust) + ' Truppen verloren' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (durch ? '' : ' · +' + INV_PTS_WEHR + ' Punkte'), at: now },
        durch ? 'Barbaren haben ' + titel + ' überrannt – ' + fmtCompact(verlust) + ' Truppen verloren.' : 'Barbaren-Welle bei ' + titel + ' abgewehrt: +' + INV_PTS_WEHR + ' Punkte.');
    spawnBattleFx(a.tid, !durch, durch ? 'Überrannt' : 'Abgewehrt', 'Barbaren-Invasion');
}
function invTreffer(m, now) {                        // deine (oder ihre) Truppen treffen eine Barbaren-Armee draußen
    const I = invAktiv(now), a = I && I.armies.find(x => x.id === m.tid), who = m.who, isP = who === 'player';
    if (!a) { barbHome(m, m.troops, now); if (isP) flashHint('Die Barbaren-Armee ist schon weg – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), fb = barbFight(who, m.troops, hx, a.t), wounded = fieldHurt(who, fb.loss, hx);
    const gold = payGold(who, fb.kill * .3 * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR * (1 + (hx || HX0).gold / 100)), pts = fb.won ? INV_PTS_SIEG : Math.max(1, Math.round(INV_PTS_SIEG * fb.kill / a.max));
    if (fb.won) I.armies = I.armies.filter(x => x !== a); else a.t = Math.max(1, Math.round(a.t - fb.kill));
    invPunkteDazu(I, who, pts); evPunkte('krieg', who, fb.kill / WO_KILL_PER); goalBump(who, 'barb');
    barbHome(m, m.troops - fb.loss, now); evDirty = true;
    const ziel = islandById[a.tid], fuer = ziel && islandOwnerOf(ziel.id) !== who ? ' (auf ' + fieldWhoName(islandOwnerOf(ziel.id)) + ')' : '';
    evBericht(who, { type: 'ev', ic: 'attack', gut: fb.won, badge: fb.won ? 'Besiegt' : 'Geschwächt', title: 'Barbaren-Armee' + fuer,
        txt: fmtCompact(fb.SA) + ' gegen ' + fmtCompact(fb.won ? a.t : a.t + fb.kill) + ' Barbaren · ' + fmtCompact(fb.loss) + ' gefallen' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (gold ? ' · +' + fmtCompact(gold) + ' Münzen' : '') + ' · +' + pts + ' Punkte', at: now },
        fb.won ? 'Barbaren-Armee geschlagen: +' + pts + ' Punkte.' : 'Die Barbaren-Armee ist geschwächt (noch ' + fmtCompact(a.t) + ') – +' + pts + ' Punkte.');
    if (isP) { spawnBattleFx({ x: m.x, y: m.y }, fb.won, fb.won ? 'Armee geschlagen' : 'Geschwächt', '+' + pts + ' Punkte'); updateHud(); saveGame(); }
    if (barbView && barbView.kind === 'inv') barbSheetRefresh();
}
function invAuszahlen() {                            // nach der Invasion: was noch fehlt von der Leiste, Erfolg für alle mit mindestens einer Stufe
    const I = evState.inv; if (!I || I.paid) return; I.paid = true; I.armies = []; evDirty = true;
    let n = 0;
    for (const [who, p] of evRang(I.pts)) { invLeiste(I, who); if (p < INV_LEISTE[0].ab) continue; n++; goalBump(who, 'inv'); }   // (Erfolg: eine Invasion mit Preis überstanden)
    if (n) flashHint('Die Barbaren-Invasion ist vorbei – ' + n + ' Verteidiger haben Belohnungen geholt.', 5000);
    saveBotState(); requestRender();
}
function invTakt(now) {                              // (nur Weltrechner) Wellen losschicken, Ankünfte, Ende
    const E = evState, p = invPlan(now); E.plan = E.plan || {};
    if (!E.plan.inv || E.plan.inv.start !== p.start) { E.plan.inv = p; evDirty = true; }
    let I = E.inv;
    if (now >= p.start && now < p.end && (!I || I.start !== p.start)) {
        if (I && !I.paid) invAuszahlen();
        I = E.inv = { start: p.start, end: p.end, welle: 0, n: 0, armies: [], pts: {}, wehr: {}, paid: false }; evDirty = true;
        flashHint('Die Barbaren-Invasion beginnt! ' + INV_WELLEN + ' Wellen in einer Stunde – verteidige deine Basen.', 6000);
    }
    if (!I || I.paid) return;
    while (I.welle < INV_WELLEN && now < I.end && now >= I.start + I.welle * INV_WELLE_MS) {     // (eine verpasste Welle fällt aus)
        if (now - (I.start + I.welle * INV_WELLE_MS) < INV_WELLE_MS) invWelle(I, now); I.welle++; evDirty = true; }
    const da = I.armies.filter(a => a.at1 <= now);
    if (da.length) { I.armies = I.armies.filter(a => a.at1 > now); for (const a of da) try { invAnkunft(I, a, now); } catch (e) { console.warn('Invasion:', e); } evDirty = true; saveGame(); requestRender(); }
    if (now >= I.end && (!I.armies.length || now >= I.end + 5 * 60000)) invAuszahlen();
}

// ===== DER DRACHE: jeden Sonntag 19–22 Uhr erscheint über dem Thron ein riesiger Drache, den nur alle zusammen besiegen.
// Jeder Angriff macht Schaden (wie beim Tagesboss, höchstens 2 % seines Lebens), 10 Angriffe pro Person.
// Belohnungs-Leiste nach Treffern (Merkliste 33): ein Treffer zählt nur mit mind. 10 % der eigenen Truppen. Fällt er, bekommen alle
// mit mind. einem Treffer noch etwas dazu – keine Extra-Preise für die Besten.
const DR_STUNDE = 19, DR_DAUER = 3 * 3600000, DR_HITS = 10, DR_CAP = .02, DR_NAME = 'Urdrache Vharak', DR_COL = '#d8452e';
const DR_LEISTE = [{ ab: 1, mh: 4 }, { ab: 3, gems: 10, crate: 0 }, { ab: 5, sh: 5, th: 2 }, { ab: 8, gems: 20, crate: 1 }, { ab: 10, gems: 30, sh: 10, crate: 2 }], DR_FALL = { crate: 2, sh: 5 }, DR_ANTEIL = .1;
const DR_MIN_ANFANG = 4 * DR_HITS * PLAYER_START_TROOPS * .25;   // neue Welt-Saison (erste 3 Tage, nur Start-Truppen): 4 Spieler mit je 10 Angriffen aus einem Viertel schaffen ihn (sonst 1e7 × WIRTSCHAFT_KOSTEN) – bei 5.000 Start-Truppen 50.000 Leben
function evTruppenAlle(who) { let n = 0; for (const id of (who === 'player' ? ownedIslands : botOwnedIslands[who]) || []) n += islandTroops[id] || 0; return n; }   // alle Truppen in den eigenen Basen
function drLeiste(D, who) { evLeisteZahlen(D, DR_LEISTE, who, (D.tr || {})[who] || 0, 'drache', x => D.name + ' · ' + x.ab + ' Treffer', D.start); }
function drPlan(now) {
    now = now || Date.now();
    if (EV_TEST && EV_TEST.dr) return { start: EV_TEST.dr, end: EV_TEST.dr + DR_DAUER };
    return evPlanTag(now, t => t.getDay() === 0, DR_STUNDE, DR_DAUER);
}
function drAktiv(now) { const D = evState.dr; now = now || Date.now(); return D && !D.paid && D.hp > 0 && now >= D.start && now < D.end ? D : null; }
function drOnMap(now) { const D = evState.dr; now = now || Date.now(); return D && now >= D.start && now < D.end && (D.hp > 0 || now - (D.fell || 0) < DBOSS_GONE) ? D : null; }
function drNeu(p) {                                  // über dem Thron; Leben: etwa 75 % von dem, was alle mit ihren Angriffen schaffen können
    const m = islandById[megaTempleId] || islands[0];
    let pool = 0; for (const bot of BOT_DEFS) { let big = 0; for (const id of botOwnedIslands[bot.id] || []) big = Math.max(big, islandTroops[id] || 0); pool += big * .25 * DR_HITS * barbFa(bot.id); }
    const hp = niceRound(Math.max(saisonAnfang() ? DR_MIN_ANFANG : wirtK(1e7), pool * .75));
    return { start: p.start, end: p.end, x: Math.round(m.x), y: Math.round(m.y - ISLAND_RADIUS * 6), lm: m.landmassId, name: DR_NAME, hp, max: hp, dmg: {}, hits: {}, fell: 0, paid: false };
}
function drTreffer(m, now) {                         // wie beim Tagesboss: Schaden (höchstens 2 %), ein Drittel der Kämpfer fällt, Münzen nach Schaden
    const D = evState.dr, who = m.who, isP = who === 'player';
    if (!D || D.paid || D.hp <= 0 || D.start !== m.d || now >= D.end) { barbHome(m, m.troops, now); if (isP) flashHint('Der Drache ist nicht mehr da – deine Truppen kehren um.', 3500); return; }
    const hx = heroFieldFx(who, m.hero, {}, m.hero2), h = hx || HX0, fa = (1 + (fieldAtkPct(who) + h.atk) / 100) * titleMult(who, 'attack') * (AUF ? AUF.kampf(who, 'a') : 1);
    const dmg = Math.max(1, Math.min(D.hp, Math.round((m.troops + heroGefOf(h, m.troops)) * fa), Math.round(D.max * DR_CAP)));
    const used = Math.min(m.troops, dmg / fa), loss = Math.min(m.troops, Math.round(used * .33 * (1 - Math.min(90, fieldShield(who) + h.loss) / 100))), wounded = fieldHurt(who, loss, hx);
    D.hp -= dmg; D.dmg[who] = (D.dmg[who] || 0) + dmg; evDirty = true;
    const zaehlt = m.voll !== false; if (zaehlt) { (D.tr || (D.tr = {}))[who] = (D.tr[who] || 0) + 1; drLeiste(D, who); }   // (mit weniger als 10 % der Truppen: Schaden ja, Treffer nein)
    const gold = payGold(who, dmg * .2 * WIRTSCHAFT_KOSTEN * MUENZ_FAKTOR * (1 + h.gold / 100));   // (Gold je Schaden wie das Kampf-Gold)
    evPunkte('boss', who, 30 * dmg / (D.max * DR_CAP));
    barbHome(m, m.troops - loss, now);
    const rk = evRang(D.dmg), pl = rk.findIndex(e => e[0] === who) + 1;
    evBericht(who, { type: 'ev', ic: 'star', gut: true, badge: 'Drache', title: D.name, txt: fmtCompact(dmg) + ' Schaden · noch ' + fmtCompact(Math.max(0, D.hp)) + ' Leben · ' + (zaehlt ? 'Treffer ' + D.tr[who] + ' / ' + DR_HITS : 'zählt nicht (unter 10 % deiner Truppen)') + ' · Platz ' + pl + ' von ' + rk.length + ' · ' + fmtCompact(loss) + ' gefallen' + (wounded ? ' (' + fmtCompact(wounded) + ' ins Krankenhaus)' : '') + (gold ? ' · +' + fmtCompact(gold) + ' Münzen' : ''), at: now },
        zaehlt ? 'Treffer beim Drachen: ' + fmtCompact(dmg) + ' Schaden – Treffer ' + D.tr[who] + ' / ' + DR_HITS + '.' : 'Schaden beim Drachen: ' + fmtCompact(dmg) + ' – zählt nicht als Treffer (unter 10 % deiner Truppen).');
    if (isP) { spawnBattleFx({ x: D.x, y: D.y }, true, 'Treffer', '−' + fmtCompact(dmg) + ' Leben'); updateHud(); saveGame(); }
    if (D.hp <= 0) { D.hp = 0; D.fell = now; drAuszahlen(true); }
    if (barbView && barbView.kind === 'drache') barbSheetRefresh();
}
function drAuszahlen(fell) {
    const D = evState.dr; if (!D || D.paid) return; D.paid = true; evDirty = true;
    const rk = evRang(D.dmg); let n = 0;
    rk.forEach(([who]) => { goalBump(who, 'dboss'); if (fell) goalBump(who, 'drache');   // (Erfolg: beim Sieg über den Drachen dabei)
        drLeiste(D, who); if (fell && (D.tr || {})[who] >= 1) { n++; evPreis(who, 'drache', D.name + ' gefallen', DR_FALL, D.start + '|fall', D.end); } });
    flashHint(fell ? D.name + ' ist gefallen! ' + n + ' Kämpfer bekommen eine Belohnung.' : D.name + ' ist entkommen.', 6000);
    if (fell) spawnBattleFx({ x: D.x, y: D.y }, true, D.name + ' gefallen', rk.length + ' Kämpfer belohnt');
    saveBotState(); requestRender();
}
function drTakt(now) {                               // (nur Weltrechner) erscheinen, entkommen
    const E = evState, p = drPlan(now); E.plan = E.plan || {};
    if (!E.plan.dr || E.plan.dr.start !== p.start) { E.plan.dr = p; evDirty = true; }
    let D = E.dr;
    if (now >= p.start && now < p.end && (!D || D.start !== p.start)) {
        if (D && !D.paid) drAuszahlen(D.hp <= 0);
        D = E.dr = drNeu(p); evDirty = true; requestRender();
        flashHint('Der Drache ist erschienen! ' + D.name + ' kreist über dem Thron – nur alle zusammen können ihn besiegen.', 7000);
    }
    if (D && !D.paid && now >= D.end) drAuszahlen(D.hp <= 0);
}

// ---- jede Sekunde ----
function evTick() {
    const now = Date.now();
    if (rechnet()) { try { invTakt(now); drTakt(now); woRoll(now); } catch (e) { console.warn('Events:', e); } if (evDirty && now - evSaveAt > 2000) saveEv(); }
    evAnzeige(now);
}
setInterval(evTick, 1000);
function evPlanVon(k) { const p = evState.plan && evState.plan[k]; return p && p.end > Date.now() ? p : k === 'inv' ? invPlan() : drPlan(); }   // was der Weltrechner sagt (sonst selbst gerechnet)
let evGesehen = null;
function evHinweise() {                              // (Zuschauer) neue Welle, Drache erschienen → kurzer Hinweis (beim Weltrechner kommt er direkt)
    const I = evState.inv, D = evState.dr, g = { w: I && !I.paid ? I.start + ':' + I.welle : '', d: D && D.hp > 0 && !D.paid ? D.start : 0 };
    if (evGesehen && !rechnet()) {
        if (g.w && g.w !== evGesehen.w && I.welle > 0) { const n = I.armies.filter(a => a.w === I.welle && islandOwnerOf(a.tid) === 'player').length;
            flashHint('Barbaren-Invasion: Welle ' + I.welle + ' von ' + INV_WELLEN + ' rückt an!' + (n ? ' Eine Armee marschiert auf deine Basis – schick Verstärkung oder fang sie ab.' : ''), 5500); if (n) sfx('warn'); }
        if (g.d && g.d !== evGesehen.d) { flashHint('Der Drache ist erschienen! ' + D.name + ' kreist über dem Thron – nur alle zusammen können ihn besiegen.', 6500); sfx('event'); }
    }
    evGesehen = g;
}
function evAnzeige(now) {                            // Uhren in Fenster und Leiste, offenes Fenster auffrischen
    evHinweise();
    for (const el of document.querySelectorAll('[data-ev-bis]')) setText(el, fmtDHMS(Math.max(0, +el.dataset.evBis - now) / 1000));
    if (evOffen() && now - evRenderAt > 2500) renderEvents();
}

// ---- die Karte: Barbaren-Armeen (wie Märsche: gestrichelte Linie + Marke) und der Drache ----
function evAt(sx, sy) {                              // → { kind: 'drache' } | { kind: 'inv', id } unter einem Tippen
    const z = mapState.zoom, D = drOnMap();
    if (D && z >= .0015) { const s = drFlug(D), kb = s.kb; if (Math.hypot(s.x - sx, s.y - sy + 12 * kb) < Math.max(28, 52 * kb)) return { kind: 'drache' }; }
    const I = invAktiv(); if (!I || z < .003) return null;
    let best = null, bd = 20; for (const a of I.armies) { const p = invPos(a); if (!invSichtbar(a, p)) continue; const s = barbScreen(p), d = Math.hypot(s.x - sx, s.y - sy + 6); if (d < bd) { bd = d; best = a; } }
    return best ? { kind: 'inv', id: best.id } : null;
}
function drFlug(D) {                                  // (Bildschirm) wo und wie groß der Drache kreist: über der Spitze des Thron-Bilds (03b), halb so breit wie der Thron
    const m = islandById[megaTempleId], im = typeof KB !== 'undefined' && KB.img && KB.img.thron, z = mapState.zoom;
    const tw = Math.max(HEILIGTUM_BREITE.megaTemple * z, 64), th = tw * (im && im.width ? im.height / im.width : 1), w = Math.max(120, Math.min(viewW * .7, tw * .5));
    const c = barbScreen(m || D); return { x: c.x, y: c.y - th * .56 - w * .15, w, kb: w / 170 };
}
const invSichtbar = (a, p) => isCellOpen(p.x, p.y) || islandOwnerOf(a.tid) === 'player';
function drawEvents(now, wallNow) {
    const z = mapState.zoom, I = invAktiv(wallNow);
    if (I && z >= .0025) { setScreen(ctx);
        for (const a of I.armies) {
            const p = invPos(a, wallNow), t = islandById[a.tid]; if (!t || !invSichtbar(a, p)) continue;
            const s = barbScreen(p), e = barbScreen(t); if (Math.max(s.x, e.x) < -30 || Math.min(s.x, e.x) > viewW + 30 || Math.max(s.y, e.y) < -30 || Math.min(s.y, e.y) > viewH + 30) continue;
            const mine = islandOwnerOf(a.tid) === 'player', k = Math.max(.7, Math.min(1.6, z / .01));
            ctx.save(); ctx.globalAlpha = .7; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -(now / 45) % 24; ctx.lineWidth = mine ? 2.2 : 1.6; ctx.strokeStyle = mine ? '#ff5a4a' : '#c9423a';
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
            ctx.translate(s.x, s.y); ctx.scale(k, k);
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 9, 11, 3.5, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#5a1712'; ctx.strokeStyle = '#140808'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(9, 2); ctx.quadraticCurveTo(0, 12, -9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();   // Schild
            ctx.fillStyle = '#e8d9b8'; ctx.beginPath(); ctx.arc(0, -2, 3.6, 0, 7); ctx.fill();                                                   // Schädel mit Hörnern
            ctx.strokeStyle = '#e8d9b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-7, -6, -6, -11); ctx.moveTo(3, -4); ctx.quadraticCurveTo(7, -6, 6, -11); ctx.stroke();
            ctx.fillStyle = '#140808'; ctx.fillRect(-2, -3, 1.4, 1.4); ctx.fillRect(.6, -3, 1.4, 1.4);
            const lbl = fmtCompact(a.t); ctx.font = '700 8px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const tw = ctx.measureText(lbl).width + 8; rr(ctx, -tw / 2, 12, tw, 11, 5.5); ctx.fillStyle = 'rgba(20,8,8,.9)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = mine ? '#ff5a4a' : '#8a2a22'; ctx.stroke();
            ctx.fillStyle = '#ffe2d8'; ctx.fillText(lbl, 0, 17.8);
            ctx.restore(); liveAnimation = true;
        }
    }
}
function drawDragon(now, wallNow) {                  // der Drache: nach den Gebäuden, groß über dem Thron (sonst deckt ihn das Thron-Bild zu)
    const z = mapState.zoom, D = drOnMap(wallNow); if (!D || z < .0015) return;
    const s = drFlug(D), kb = s.kb; if (s.x < -200 || s.x > viewW + 200 || s.y < -200 || s.y > viewH + 200) return;
    const dead = D.hp <= 0; setScreen(ctx);
    if (!dead) { const R = 110 * kb, gr = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, R); gr.addColorStop(0, 'rgba(255,120,60,.45)'); gr.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(s.x, s.y - (dead ? 0 : Math.sin(now / 700) * 4 * kb)); ctx.scale(kb, kb); if (dead) { ctx.globalAlpha = .45; ctx.filter = 'grayscale(1)'; }
    const bild = glyphBild('drache');                                          // der Drache als KI-Bild (Alexander 7.10.), sonst gezeichnet
    if (bild) { const w = 170, h = w * bild.naturalHeight / bild.naturalWidth; ctx.drawImage(bild, -w / 2, -h * .62, w, h); } else drDraw(ctx, dead ? 0 : Math.sin(now / 260));
    ctx.restore();
    liveAnimation = true;
}
function drawDragonName(wallNow) {                   // Name und Leben des Drachen: unter dem Drachen, über der Thron-Spitze
    const z = mapState.zoom, D = drOnMap(wallNow); if (!D || z < .0015) return;
    const s = drFlug(D), kb = s.kb; if (s.x < -200 || s.x > viewW + 200 || s.y < -200 || s.y > viewH + 200) return;
    const dead = D.hp <= 0; setScreen(ctx);
    const bw = Math.max(90, Math.min(220, 130 * kb)), by = s.y + 30 * kb;
    ctx.font = '800 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = dead ? D.name + ' · besiegt' : D.name, tw = ctx.measureText(label).width + 18;
    rr(ctx, s.x - tw / 2, by, tw, 20, 10); ctx.fillStyle = 'rgba(24,8,6,.92)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2c75c'; ctx.stroke();
    ctx.fillStyle = '#ffe9c8'; ctx.fillText(label, s.x, by + 10.5);
    if (!dead) { rr(ctx, s.x - bw / 2, by + 24, bw, 7, 3.5); ctx.fillStyle = 'rgba(10,8,10,.85)'; ctx.fill(); rr(ctx, s.x - bw / 2 + 1, by + 25, Math.max(2, (bw - 2) * D.hp / D.max), 5, 2.5); ctx.fillStyle = '#e0483a'; ctx.fill(); }
}
function drDraw(g, flap) {                           // der Drache: Flügel (schlagend), Körper, langer Hals, gehörnter Kopf, Schwanz, Feueratem
    const col = DR_COL, dark = '#2a0c08', belly = '#f0b45a';
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 46, 52, 11, 0, 0, 7); g.fill();
    g.strokeStyle = dark; g.lineWidth = 2.5;
    const wy = -40 - flap * 16;
    for (const s of [-1, 1]) {                       // Flügel: Haut zwischen den Fingern
        g.fillStyle = '#9c2a1c'; g.beginPath(); g.moveTo(s * 8, -6); g.lineTo(s * 40, wy); g.lineTo(s * 78, wy + 10 + flap * 4); g.quadraticCurveTo(s * 62, wy + 26, s * 70, wy + 40); g.quadraticCurveTo(s * 50, wy + 38, s * 52, wy + 54); g.quadraticCurveTo(s * 34, 6, s * 10, 10); g.closePath(); g.fill(); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(s * 40, wy); g.lineTo(s * 70, wy + 40); g.moveTo(s * 40, wy); g.lineTo(s * 52, wy + 54); g.stroke(); g.lineWidth = 2.5;
    }
    g.fillStyle = col; g.beginPath(); g.moveTo(-6, 30); g.quadraticCurveTo(-30, 46, -50, 38); g.quadraticCurveTo(-36, 44, -14, 22); g.closePath(); g.fill(); g.stroke();   // Schwanz
    g.beginPath(); g.ellipse(0, 16, 22, 24, 0, 0, 7); g.fill(); g.stroke();                               // Körper
    g.fillStyle = belly; g.beginPath(); g.ellipse(0, 20, 11, 17, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-10, -26, 6, -40); g.lineTo(18, -32); g.quadraticCurveTo(6, -18, 9, 0); g.closePath(); g.fill(); g.stroke();   // Hals
    g.beginPath(); g.moveTo(2, -44); g.quadraticCurveTo(16, -52, 32, -42); g.lineTo(30, -34); g.quadraticCurveTo(16, -32, 8, -30); g.closePath(); g.fill(); g.stroke();             // Kopf
    g.fillStyle = '#f2e6c8'; for (const [x, y, x2, y2] of [[6, -46, -2, -60], [12, -48, 8, -62]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.lineTo(x + 5, y + 1); g.closePath(); g.fill(); }   // Hörner
    for (const [r, a] of [[6, .3], [2.6, 1]]) { g.globalAlpha *= a; g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(18, -42, r, 0, 7); g.fill(); g.globalAlpha /= a; }   // glühendes Auge
    if (flap > -.2) { const f = (flap + .2) / 1.2, gr = g.createLinearGradient(32, -38, 62, -30); gr.addColorStop(0, 'rgba(255,230,120,.95)'); gr.addColorStop(1, 'rgba(255,90,30,0)');   // Feueratem
        g.fillStyle = gr; g.beginPath(); g.moveTo(31, -38); g.quadraticCurveTo(48, -44 - f * 6, 62 + f * 10, -34); g.quadraticCurveTo(48, -28 + f * 4, 31, -35); g.closePath(); g.fill(); }
}

// ---- das Blatt an der Karte (wie Lager/Tagesboss): eine Barbaren-Armee oder der Drache ----
function invSheetHtml(head) {
    const a = invArmee(barbView.id); if (!a) return head('attack', 'Barbaren-Armee') + '<div class="notice">' + icon('check') + '<span>Diese Armee ist nicht mehr da.</span></div>';
    const t = islandById[a.tid], o = islandOwnerOf(a.tid), need = a.t * 1.15 / barbFa('player'), p = invPos(a), src = barbSource(p, need), tp = src !== null ? invTreffpunkt(a, src, 'player') : null;
    return head('attack', 'Barbaren-Armee · Welle ' + a.w) +
        '<div class="barb-hp"><i style="width:' + (a.t / a.max * 100).toFixed(1) + '%"></i><span>' + fmtCompact(a.t) + ' / ' + fmtCompact(a.max) + ' Barbaren</span></div>' +
        '<div class="field-lines"><span>Ziel</span><b>' + escapeHtml(islandTitle(t)) + ' · ' + escapeHtml(fieldWhoName(o)) + '</b><span>Ankunft in</span><b data-ev-bis="' + a.at1 + '">' + fmtDHMS((a.at1 - Date.now()) / 1000) + '</b>' +
        '<span>Für den Sieg</span><b>+' + INV_PTS_SIEG + ' Punkte</b></div>' +
        (src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen mit Truppen kommt hierher.</span></div>'
            : !tp ? '<div class="notice">' + icon('hourglass') + '<span>Zu weit weg – deine Truppen kämen zu spät. ' + (o === 'player' ? 'Schick lieber Verstärkung in deine Basis.' : '') + '</span></div>'
            : barbAttackHtml(islandTroops[src] || 0, need, src, 'Abfangen')) +
        '<div class="barb-note">Barbaren erobern nichts, aber wer sie nicht aufhält, verliert Truppen. Abwehren: +' + INV_PTS_WEHR + ' Punkte, eine Armee schlagen: +' + INV_PTS_SIEG + ' (auch für Nachbarn). Belohnung nach der Invasion nach Punkten.</div>';
}
function drSheetHtml(head) {
    const D = drOnMap(); if (!D) return head('star', DR_NAME) + '<div class="notice">' + icon('info') + '<span>Der Drache ist nicht mehr da. Nächstes Mal: Sonntag ab ' + DR_STUNDE + ' Uhr.</span></div>';
    const dead = D.hp <= 0, rk = evRang(D.dmg), mine = rk.findIndex(e => e[0] === 'player'), hits = (D.hits || {}).player || 0, src = barbSource(D, 1, true);
    const row = (e, i) => '<li' + (e[0] === 'player' ? ' class="me"' : '') + '><em>' + (i + 1) + '</em><span>' + escapeHtml(fieldWhoName(e[0])) + '</span><b>' + fmtCompact(e[1]) + '</b></li>';
    return head('star', 'Drache · ' + escapeHtml(D.name)) +
        '<div class="barb-hp"><i style="width:' + (D.hp / D.max * 100).toFixed(1) + '%"></i><span>' + (dead ? 'Besiegt' : fmtCompact(D.hp) + ' / ' + fmtCompact(D.max) + ' Leben') + '</span></div>' +
        '<div class="field-lines"><span>' + (dead ? 'Vorbei' : 'Fliegt weg in') + '</span><b' + (dead ? '>–' : ' data-ev-bis="' + D.end + '">' + fmtDHMS((D.end - Date.now()) / 1000)) + '</b><span>Deine Angriffe</span><b>' + hits + ' / ' + DR_HITS + '</b>' +
        '<span>Dein Schaden</span><b>' + (mine >= 0 ? fmtCompact(rk[mine][1]) + ' · Platz ' + (mine + 1) : '–') + (barbOut('player', 'd') ? ' <small>· Angriff unterwegs</small>' : '') + '</b></div>' +
        (rk.length ? '<ol class="barb-rank">' + rk.slice(0, 5).map(row).join('') + (mine >= 5 ? row(rk[mine], mine) : '') + '</ol>' : '') +
        (dead ? '' : hits >= DR_HITS ? '<div class="notice notice--gold">' + icon('hourglass') + '<span>Du hast alle ' + DR_HITS + ' Angriffe gemacht – jetzt sind die anderen dran.</span></div>' :
            src === null ? '<div class="notice">' + icon('lock') + '<span>Keine deiner Basen hat Truppen.</span></div>' : barbAttackHtml(islandTroops[src] || 0, (islandTroops[src] || 0) * .5, src, 'Angreifen')) +
        '<div class="barb-note">Höchstens 2 % Leben pro Angriff, ein Drittel der Kämpfer fällt. Ein Treffer zählt für die Belohnungs-Leiste nur mit mind. 10 % deiner Truppen (jetzt ' + fmtCompact(Math.ceil(evTruppenAlle('player') * DR_ANTEIL)) + '). Fällt er, bekommen alle mit einem Treffer noch etwas dazu.</div>';
}

// ---- die Ereignisse im Events-Fenster (Dock → Events, untere Reiter): Termine, Uhren, Ranglisten ----
var evTab = 'boss', evRenderAt = 0;
function evJetzt(now) {                              // was gerade läuft (für das „!“ am Reiter und den ersten Blick ins Fenster)
    try { now = now || Date.now(); return invAktiv(now) ? 'inv' : drAktiv(now) ? 'drache' : null; } catch (e) { return null; }
}
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
    tour: ['#1a0f2e', '#5b2f92', '#c9a2ff'], inv: ['#1d0807', '#7a2616', '#ff8a4a'], drache: ['#2a0b06', '#b8431a', '#ffc46a'],
    boss: ['#0b1512', '#35502a', '#f2c75c'], rally: ['#0a1424', '#2c5585', '#9cc8ff'], tempel: ['#0e1a20', '#7a5e26', '#ffe4a0'],
};
const EV_SZENE = {                                   // S: Schattenriss, L: Licht
    drache: (S, L) => '<g fill="' + S + '"><path d="M268 46 L226 14 L236 30 L214 24 L228 40 L208 42 L256 58Z"/><path d="M274 46 L318 10 L310 28 L336 20 L320 38 L342 40 L284 58Z"/><ellipse cx="270" cy="54" rx="17" ry="8"/>' +
        '<path d="M282 50 Q296 40 306 44 L316 42 L311 49 L302 52 Q292 56 284 60Z"/><path d="M256 58 Q232 72 210 62 Q230 78 260 64Z"/>' +
        '<rect x="338" y="76" width="62" height="34"/><rect x="358" y="58" width="18" height="40"/><path d="M354 58 L367 40 L380 58Z"/>' + [338, 348, 386, 394].map(x => '<rect x="' + x + '" y="70" width="5" height="7"/>').join('') + '</g>' +
        '<path d="M314 45 Q342 38 376 54 Q346 51 314 50Z" fill="' + L + '" opacity=".9"/><circle cx="305" cy="46" r="1.6" fill="' + L + '"/><rect x="364" y="66" width="5" height="8" fill="' + L + '" opacity=".8"/>',
    inv: (S, L) => '<circle cx="342" cy="94" r="22" fill="' + L + '" opacity=".35"/><g fill="' + S + '"><path d="M222 100 L246 62 L270 100Z"/><path d="M276 100 L306 52 L336 100Z"/><path d="M352 100 L374 68 L396 100Z"/>' +
        '<path d="M306 52 V32 h2 V52Z"/></g>' +
        '<path d="M308 32 L326 37 L308 43Z" fill="#c9423a"/><path d="M242 100 L246 86 L250 100Z M302 100 L306 82 L310 100Z" fill="' + L + '" opacity=".7"/><path d="M336 100 Q342 84 342 80 Q348 90 348 100Z" fill="' + L + '"/>',
    tour: (S, L) => '<g transform="translate(40 0)">' + [[300, 40], [300, -40]].map(([x, r]) => '<g transform="translate(' + x + ' 58) rotate(' + r + ')"><path d="M-3 -44 L0 -52 L3 -44 V18 H-3Z" fill="#e8dcc8"/><rect x="-12" y="18" width="24" height="4" fill="' + L + '"/><rect x="-2" y="22" width="4" height="13" fill="' + S + '"/></g>').join('') +
        [236, 346].map(x => '<path d="M' + x + ' 104 V28" stroke="' + S + '" stroke-width="3"/><path d="M' + x + ' 30 h22 v32 l-11 -7 l-11 7Z" fill="#7a3fc0" stroke="' + L + '" stroke-width="1"/>').join('') +
        [[210, 18], [262, 12], [338, 16], [370, 30], [222, 44]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="1.3" fill="' + L + '"/>').join('') + '</g>',
    boss: (S, L) => '<g fill="' + S + '"><path d="M250 110 Q252 72 280 64 Q282 40 300 36 Q318 40 320 64 Q348 72 350 110Z"/><path d="M204 100 L222 74 L240 100Z"/><path d="M366 100 L382 78 L398 100Z"/></g>' +
        '<path d="M290 46 Q276 32 280 18 Q286 34 296 42Z M310 46 Q324 32 320 18 Q314 34 304 42Z" fill="#e8d9b8"/><circle cx="294" cy="52" r="2.2" fill="' + L + '"/><circle cx="306" cy="52" r="2.2" fill="' + L + '"/>',
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
function woPunkteJe() {                               // „18 Punkte je 10 besiegte Krieger“ – ganze Zahlen statt „1,8 Punkte pro …“
    const p = 1 / WO_KILL_PER, n = [1, 10, 100, 1000].find(n => Math.abs(p * n - Math.round(p * n)) < 1e-6 && p * n >= 1) || 1000;
    return fmtNum(Math.round(p * n)) + (Math.round(p * n) === 1 ? ' Punkt' : ' Punkte') + (n === 1 ? ' pro besiegtem Krieger' : ' je ' + fmtNum(n) + ' besiegte Krieger');
}
function evPreisHtml(p, i) {                          // ein Preis (Platz): Kacheln wie RoK (05e) – Edelsteine, Münzen, Splitter, Kiste
    return '<div class="tour-prize' + (i ? '' : ' is-1') + '"><b>' + p.t + '</b>' + beuteRaster(evBeute(p)) + '</div>';
}
// ---- Belohnungs-Leiste wie RoK (Merkliste 33): Balken mit Kisten an den Stufen; erreicht = leuchtet + „Abholen“ (bis Event-Ende nur hier, danach auch im Abholfach),
// abgeholt = offene Kiste mit Haken. Was erreicht und bezahlt ist, sagt der Weltrechner (evState / barbWho / dayBoss), das Fach sagt „abgeholt“. ----
function evHolBereit(tab) { const q = tab === 'tour' ? 'woche' : tab; return inboxList().some(x => x.src === q); }   // (läuft schon beim Laden – nichts aus diesem Teil davor)
let evHpMemo = null;
function evBeute(p) {                                 // Kacheln einer Belohnung – Stunden Münzen/Truppen mit deinen Zahlen von jetzt
    const now = Date.now(); if (!evHpMemo || now - evHpMemo.t > 5000) evHpMemo = { t: now, hp: hourProduction('player') };
    const { coins, tr } = evStunden('player', p, evHpMemo.hp);
    return [{ a: 'gems', n: p.gems }, { a: 'coins', n: coins }, { a: 'tr', n: tr }, { a: 'sh', n: p.sh }, p.crate >= 0 && { a: 'kiste', k: kisteVonR(p.crate), r: p.crate, min: p.crate > 0 }];
}
const evKisteBild = p => p.crate >= 3 ? 'kiste_royal' : p.crate === 2 ? 'kiste_episch' : p.crate === 1 ? 'kiste_gross' : p.crate === 0 ? 'kiste_ausruestung' : null;
const evHolKnopf = (schl, txt) => '<button class="btn btn--primary btn--sm" type="button" data-ev-hol="' + escapeHtml(schl) + '"><span>' + (txt || 'Abholen') + '</span></button>';
function evLeistePos(stufen, wert) {                  // wie weit der Balken reicht (0–1): Stufe i sitzt in der Mitte ihrer Spalte
    const n = stufen.length; let k = 0; while (k < n && wert >= stufen[k].ab) k++;
    if (k >= n) return 1; const a = k ? stufen[k - 1].ab : 0, f = Math.max(0, Math.min(1, (wert - a) / Math.max(1e-9, stufen[k].ab - a)));
    return Math.max(0, (k ? k - .5 + f : f * .5) / n);
}
// o: { stufen, schl(i): Schlüssel im Abholfach, erreicht(i), bezahlt(i), pos 0–1, label(x, i), zeilen/mehr: nur so viele Zeilen darunter }
function evLeisteHtml(o) {
    const L = inboxList(), n = o.stufen.length;
    const st = o.stufen.map((x, i) => L.some(y => y.k === o.schl(i)) ? 'hol' : !o.erreicht(i) ? 'zu' : o.bezahlt(i) ? 'ok' : 'bald');
    const knoten = o.stufen.map((x, i) => { const s = st[i], kb = evKisteBild(x), b0 = evBeute(x).find(y => y && (y.n > 0 || y.a === 'kiste'));
        const bild = kb ? kb + (s === 'ok' ? '_offen' : '_zu') : beuteBild(b0 || { a: 'gems' }), tag = s === 'hol' ? 'button' : 'span';
        return '<' + tag + (s === 'hol' ? ' type="button" data-ev-hol="' + escapeHtml(o.schl(i)) + '"' : '') + ' class="evl-k is-' + s + (kb ? '' : ' is-ding') + '" title="' + escapeHtml(o.label(x, i)) + '"><span class="evl-bild"><img src="bilder/' + bild + '.webp" alt="" draggable="false">' +
            (s === 'ok' ? '<i class="evl-haken"><img src="bilder/ui_sym_haken.webp" alt="abgeholt" draggable="false"></i>' : '') + '</span><small>' + o.label(x, i) + '</small></' + tag + '>'; }).join('');
    const zeile = (x, i) => { const s = st[i];
        return '<div class="evl-z is-' + s + '"><b>' + o.label(x, i) + '</b>' + beuteRaster(evBeute(x), 'bk-mini') + '<span class="evl-st">' +
            (s === 'hol' ? evHolKnopf(o.schl(i)) : s === 'ok' ? '<img src="bilder/ui_sym_haken.webp" alt="" draggable="false"><small>Abgeholt</small>' : s === 'bald' ? '<small>kommt gleich</small>' : icon('lock')) + '</span></div>'; };
    const nz = Math.min(n, o.zeilen || n);
    return '<div class="evl" style="--n:' + n + '"><div class="evl-bahn"><div class="evl-spur"><i style="width:' + (o.pos * 100).toFixed(1) + '%"></i></div>' + knoten + '</div></div>' +
        '<div class="evl-zeilen">' + o.stufen.slice(0, nz).map(zeile).join('') + '</div>' + (nz < n ? '<div class="barb-note">' + o.mehr + '</div>' : '');
}
function evHolen(schl) {                              // „Abholen“: eine Stufe (Schlüssel) oder alles einer Quelle („src:boss“) aus dem Abholfach
    const quelle = schl.startsWith('src:') ? schl.slice(4) : null, ids = inboxList().filter(x => quelle ? x.src === quelle : x.k === schl).map(x => x.id);
    if (!ids.length) return renderEvents();
    const aus = [], kiste = inboxList().find(x => ids.includes(x.id) && x.crate >= 0), txt = ids.map(id => inboxClaim(id, aus)).filter(Boolean).join(', ');
    if (txt) { sfx('coin'); if (aus.length) beuteFenster('Abgeholt', aus, { kiste: kiste ? kisteVonR(kiste.crate) : null }); else flashHint('Abgeholt: ' + txt + '.', 4500); }
    updateGoalsBadge(); renderEvents();
}
function evTourHtml() { return woHtml(); }            // Events → Reiter „Wochen-Event“ (Schlüssel 'tour' von früher)
function woHtml() {                                   // das Wochen-Event: Thema, Uhr, dein Platz, Preise, Rangliste, die nächsten Wochen
    const now = Date.now(), w = woWin(now), th = woThemaAm(now), W = evState.wo || {}, live = w.on && W.key === w.key, rk = live ? evRang(W.pts) : [], mine = rk.findIndex(e => e[0] === 'player') + 1;
    const kopf = (w.on ? 'Läuft · endet in ' : 'Montag bis Freitag · beginnt in ') + evUhr(w.on ? w.end : w.start);
    const preise = WO_PRIZES.map(evPreisHtml).join(''), hol = inboxList().some(x => x.src === 'woche') ? evHolKnopf('src:woche', 'Preis abholen') : '';
    const plan = [1, 2, 3, 4].map(i => { const t = w.start + 7 * 864e5 * i + 3600000, x = woThemaAm(t), a = new Date(t), e = new Date(t + 4 * 864e5); return '<span>Mo ' + a.getDate() + '.' + (a.getMonth() === e.getMonth() ? '' : (a.getMonth() + 1) + '.') + ' – Fr ' + e.getDate() + '.' + (e.getMonth() + 1) + '.</span><b>' + icon(x.ic) + ' ' + x.name + '</b>'; }).join('');
    const alt = !live && W.last && W.last.top ? W.last.top : null, liste = live ? rk : alt || [];
    const meinePkt = fmtNum(Math.floor((W.pts || {}).player || 0)) + ' Punkte';   // (noch ohne Platz: nur die Punkte, kein „– ·“)
    return evKarte(th.ic, th.name, kopf, '<div class="ev-zeilen"><div><small>Punkte für</small><span>' + th.pkt + (th.k === 'krieg' ? ' (' + woPunkteJe() + ')' : '') + '</span></div><div><small>Bonus</small><span>' + th.bonus + '</span></div></div>' +
            (live ? '<div class="field-lines"><span>' + (mine ? 'Dein Platz' : 'Deine Punkte') + '</span><b>' + (mine ? mine + ' · ' : '') + meinePkt + '</b></div>' : ''), 'is-tour ev-woche--' + th.k, 'tour') +
        '<div class="lb-gap">' + (live ? 'Live · Top 10' : alt ? 'Letzte Woche · Top 10' : 'Top 10') + '</div>' +
        (evRangHtml(liste, v => fmtNum(Math.floor(v)) + ' P.') || rangLeer(w.on ? 'Sobald jemand Punkte holt, steht er hier.' : 'Am Montag geht es los.')) +
        '<div class="lb-gap">Preise nach Platz</div>' + hol + '<div class="tour-prizes ev-prizes3">' + preise + '</div>' +
        infoKlapp('tour', 'So gibt es Punkte', '<div class="tour-rules"><span>' + icon('hourglass') + '<span>Höchstens ' + WO_KILL_MAX + ' Punkte auf einmal, im Schnitt ' + WO_KILL_MIN + ' pro Minute. Jede Woche (Mo–Fr) ein anderes Thema, am Wochenende ist frei.</span></span></div>') +
        '<div class="lb-gap">Nächste Wochen</div><div class="field-lines ev-plan">' + plan + '</div>';
}
function evInvHtml() {
    const now = Date.now(), I = evState.inv, akt = invAktiv(now), p = evPlanVon('inv'), last = I && I.paid ? I : null;
    const kopf = akt ? 'Läuft · Welle ' + Math.min(INV_WELLEN, akt.welle) + ' / ' + INV_WELLEN + ' · noch ' + evUhr(akt.end) : 'Nächste in ' + evUhr(p.start);
    const pts = I ? I.pts || {} : {}, me = Math.floor(pts.player || 0), rk = evRang(pts), mine = I ? rk.findIndex(e => e[0] === 'player') + 1 : 0;
    const meine = akt ? akt.armies.filter(a => islandOwnerOf(a.tid) === 'player') : [];
    let inh = '<div class="field-lines"><span>Termin</span><b>' + evWann(akt ? akt.start : p.start) + ' – ' + evWann(akt ? akt.end : p.end).slice(-5) + '</b>' +
        (akt ? '<span>Armeen unterwegs</span><b>' + akt.armies.length + (meine.length ? ' · <span class="ev-rot">' + meine.length + ' auf dich</span>' : '') + '</b>' : '') +
        (I && (akt || last) ? '<span>' + (akt ? 'Deine Punkte' : 'Letztes Mal') + '</span><b>' + fmtNum(me) + (mine ? ' · Platz ' + mine : '') + '</b>' : '') + '</div>';
    const st = I ? I.start : 0, lst = I && I.lst ? I.lst.player || 0 : 0;
    const leiste = evLeisteHtml({ stufen: INV_LEISTE, schl: i => 'inv|' + st + '|' + i, erreicht: i => me >= INV_LEISTE[i].ab, bezahlt: i => i < lst, pos: evLeistePos(INV_LEISTE, me), label: x => x.ab + ' P.' });
    return evKarte('defense', 'Barbaren-Invasion', kopf, inh +
        (meine.length ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="inv">' + icon('send') + '<span>Zur Armee auf deine Basis</span></button>' : ''), akt ? 'is-warn' : '', 'inv') +
        '<div class="lb-gap">Belohnungs-Leiste · ' + (akt || !I ? 'deine Punkte' : 'letzte Invasion') + '</div>' + leiste +
        infoKlapp('inv', 'Alle 3 Tage · so gibt es Punkte', '<div class="tour-rules"><span>' + icon('hourglass') + '<span><b>Alle 3 Tage um ' + INV_STUNDE + ' Uhr, eine Stunde</b> – ' + INV_WELLEN + ' Wellen, je 5–7 Minuten Marsch vom Rand der Insel</span></span>' +
        '<span>' + icon('defense') + '<span><b>+' + INV_PTS_WEHR + ' Punkte</b> für jede abgewehrte Armee an deiner Basis – schick vorher Verstärkung</span></span>' +
        '<span>' + icon('attack') + '<span><b>+' + INV_PTS_SIEG + ' Punkte</b> für jede Armee, die du unterwegs schlägst – auch die auf deine Nachbarn (Teilschaden zählt anteilig)</span></span>' +
        '<span>' + icon('crown') + '<span>Jede erreichte Stufe holst du hier ab – was bis zum Ende liegen bleibt, kommt ins Abholfach.</span></span>' +
        '<span>' + icon('losses') + '<span>Barbaren erobern nichts – aber wer sie nicht aufhält, verliert viele Truppen.</span></span></div>') +
        '<div class="lb-gap">' + (akt ? 'Live · Top 10' : 'Letzte Invasion') + '</div>' +
        (evRangHtml(rk, v => fmtNum(Math.floor(v)) + ' P.') || rangLeer(akt ? 'Sobald jemand Punkte holt, steht er hier.' : 'Noch keine Invasion gewesen.'));
}
function evDrHtml() {
    const now = Date.now(), D = evState.dr, akt = drAktiv(now), p = evPlanVon('dr'), rk = D ? evRang(D.dmg) : [], mine = rk.findIndex(e => e[0] === 'player') + 1;
    const kopf = akt ? 'Da · fliegt weg in ' + evUhr(akt.end) : D && D.start === p.start && D.hp <= 0 && now < D.end ? 'Besiegt!' : 'Nächster in ' + evUhr(p.start);
    const tr = D && D.tr ? D.tr.player || 0 : 0, lst = D && D.lst ? D.lst.player || 0 : 0, st = D ? D.start : 0;
    let inh = (akt ? '<div class="barb-hp"><i style="width:' + (akt.hp / akt.max * 100).toFixed(1) + '%"></i><span>' + fmtCompact(akt.hp) + ' / ' + fmtCompact(akt.max) + ' Leben</span></div>' : '') +
        '<div class="field-lines"><span>Termin</span><b>' + evWann(akt ? akt.start : p.start) + ' – ' + evWann(akt ? akt.end : p.end).slice(-5) + '</b>' +
        (D ? '<span>' + (akt ? 'Deine Treffer' : 'Letztes Mal') + '</span><b>' + tr + ' / ' + DR_HITS + '</b>' : '') +
        '<span>Treffer zählt ab</span><b>' + fmtCompact(Math.max(1, Math.ceil(evTruppenAlle('player') * DR_ANTEIL))) + ' Truppen (10 %)</b>' +
        (D && rk.length ? '<span>' + (akt ? 'Dein Schaden' : 'Schaden') + '</span><b>' + (mine ? fmtCompact(rk[mine - 1][1]) : '–') + '</b>' : '') + '</div>';
    const go = drOnMap() ? '<button class="btn btn--primary btn--sm" type="button" data-ev-go="drache">' + icon('send') + '<span>Zum Drachen</span></button>' : '';
    const leiste = evLeisteHtml({ stufen: DR_LEISTE, schl: i => 'drache|' + st + '|' + i, erreicht: i => tr >= DR_LEISTE[i].ab, bezahlt: i => i < lst, pos: evLeistePos(DR_LEISTE, tr), label: x => x.ab + '×' });
    const fk = 'drache|' + st + '|fall', fHol = inboxList().some(x => x.k === fk), fOk = D && D.hp <= 0 && tr >= 1;
    const fall = '<div class="evl-zeilen"><div class="evl-z is-' + (fHol ? 'hol' : fOk ? 'ok' : 'zu') + '"><b>Drache fällt<small>mit 1 Treffer</small></b>' + beuteRaster(evBeute(DR_FALL), 'bk-mini') + '<span class="evl-st">' +
        (fHol ? evHolKnopf(fk) : fOk ? '<img src="bilder/ui_sym_haken.webp" alt="" draggable="false"><small>Abgeholt</small>' : icon('lock')) + '</span></div></div>';
    return evKarte('star', 'Der Drache', kopf, inh + go, akt ? 'is-drache' : '', 'drache') +
        '<div class="barb-note ev-zaehlt">Es zählen deine <b>Treffer</b> (1×, 3× …): jeder Angriff mit mind. 10 % deiner Truppen ist ein Treffer. Der Schaden (höchstens ' + Math.round(DR_CAP * 100) + ' % seines Lebens pro Angriff) zählt nur für die Rangliste.</div>' +
        '<div class="lb-gap">Belohnungs-Leiste · Treffer</div>' + leiste + fall +
        infoKlapp('drache', 'Jeden Sonntag · so läuft es', '<div class="tour-rules"><span>' + icon('hourglass') + '<span><b>Jeden Sonntag ' + DR_STUNDE + '–' + (DR_STUNDE + DR_DAUER / 3600000) + ' Uhr</b> kreist ' + DR_NAME + ' über dem Thron – sehr viel Leben, nur alle zusammen schaffen ihn</span></span>' +
        '<span>' + icon('attack') + '<span><b>' + DR_HITS + ' Angriffe</b> pro Person, höchstens 2 % seines Lebens pro Angriff, ein Drittel der Kämpfer fällt</span></span>' +
        '<span>' + icon('crown') + '<span>Ein Treffer zählt für die Leiste nur mit mind. 10 % deiner Truppen. Fällt er, bekommen alle mit einem Treffer noch etwas dazu.</span></span></div>') +
        '<div class="lb-gap">' + (akt ? 'Live · Schaden' : 'Letzter Drache') + '</div>' +
        (evRangHtml(rk, v => fmtCompact(v)) || rangLeer(akt ? 'Noch hat niemand angegriffen.' : 'Noch kein Drache gewesen.'));
}
function evBossHtml() {                              // Reiter „Boss“: Tagesboss, Schadens-Klassen je Angriff (mit Zähler), „Boss fällt“
    const b = dbossEnsure(), rec = barbRec('player'), kl = (b.kl || {}).player || [], hol = inboxList().filter(x => x.src === 'boss').length;
    const boss = evKarte('crown', 'Tagesboss · ' + escapeHtml(b.name), b.hp <= 0 ? 'Besiegt · neuer in ' + evUhr(Date.now() + msToMidnight()) : rec.h + ' / ' + dbossHitsMax() + ' Angriffe heute',
        '<div class="barb-hp"><i style="width:' + (b.hp / b.max * 100).toFixed(1) + '%"></i><span>' + (b.hp <= 0 ? 'Besiegt' : fmtCompact(b.hp) + ' / ' + fmtCompact(b.max) + ' Leben') + '</span></div>' +
        (dbossOnMap() ? '<button class="btn btn--secondary btn--sm" type="button" data-ev-go="boss">' + icon('send') + '<span>Zum Tagesboss</span></button>' : ''), 'ev-boss--' + b.k, 'boss');   // (Klasse je Boss: sein Bild im Banner, 05z)
    const zeile = (x, i) => '<div class="evl-z' + (kl[i] ? ' is-ok' : '') + '"><b>Klasse ' + (i + 1) + '<small>' + x.t + ' seines Lebens</small></b>' + beuteRaster(evBeute(x), 'bk-mini') + '<span class="evl-st evk-n">' + (kl[i] ? '×' + kl[i] : '') + '</span></div>';
    const fk = 'boss|' + b.d + '|fall', fHol = inboxList().some(x => x.k === fk), fOk = b.hp <= 0 && b.dmg.player > 0;
    const fall = '<div class="evl-z is-' + (fHol ? 'hol' : fOk ? 'ok' : 'zu') + '"><b>Boss fällt<small>alle, die trafen</small></b>' + beuteRaster(evBeute(DBOSS_FALL), 'bk-mini') + '<span class="evl-st">' + (fHol ? '<small>bereit</small>' : fOk ? '<img src="bilder/ui_sym_haken.webp" alt="" draggable="false">' : icon('lock')) + '</span></div>';
    return boss + '<div class="barb-note ev-zaehlt">Es zählt der <b>Schaden jedes einzelnen Angriffs</b> (Anteil am Boss-Leben, höchstens ' + Math.round(DBOSS_CAP * 100) + ' % pro Angriff) – jeder Angriff bringt die Belohnung seiner Klasse.</div>' +
        '<div class="lb-gap">Belohnung je Angriff · nach Schaden</div>' + (hol ? evHolKnopf('src:boss', 'Alles abholen · ' + hol) : '') +
        '<div class="evl-zeilen evk">' + DBOSS_KLASSEN.map(zeile).join('') + fall + '</div>' +
        '<div class="barb-note">Zweimal dieselbe Klasse = zweimal die Belohnung.</div>';
}
function evLagerHtml() {                             // Reiter „Lager“: Barbaren-Lager, Belohnung je Stufe – jeden Tag neu
    const rec = barbRec('player'), near = barbNearest(), s = rec.s || 0, offen = Math.min(BARB_MAX_L, rec.b + 1);
    let hoch = 0; for (let L = BARB_MAX_L; L >= 1; L--) if (s & (1 << (L - 1))) { hoch = L; break; }
    const lager = evKarte('attack', 'Barbaren-Lager', rec.n + ' / ' + barbTagMax() + ' heute', '<div class="field-lines"><span>Freigeschaltet</span><b>bis Stufe ' + offen + '</b><span>Neuer Tag in</span>' + evUhr(Date.now() + msToMidnight()) + '</div>' +
        (near ? '<button class="btn btn--secondary btn--sm" type="button" data-ev-go="camp">' + icon('send') + '<span>Nächstes Lager · Stufe ' + near.L + '</span></button>' : ''));
    const hol = inboxList().filter(x => x.src === 'lager').length;
    return lager + '<div class="lb-gap">Belohnung je Stufe · jeden Tag neu</div>' + (hol > 1 ? evHolKnopf('src:lager', 'Alles abholen · ' + hol) : '') +
        evLeisteHtml({ stufen: LAGER_LEISTE, schl: i => 'lager|' + rec.d + '|' + (i + 1), erreicht: i => !!(s & (1 << i)), bezahlt: i => !!(s & (1 << i)), pos: hoch ? (hoch - .5) / BARB_MAX_L : 0, label: x => 'St. ' + x.ab,
            zeilen: Math.max(5, offen), mehr: 'Weitere Stufen: besiege zuerst ein Lager der Stufe ' + offen + '.' });
}
function evOffen() { return isPanelOpen(goalsPopup) && EV_TABS.includes(goalsTab); }
function renderEvents() {
    evRenderAt = Date.now();
    const sk = saisonKarte(), oben = sk && saisonOben(Date.now()), sz = sk ? '<div class="ev-saison">' + sk + '</div>' : '';
    liveHtml(document.getElementById('eventBody'), (oben ? sz : '') + (evTab === 'tour' ? evTourHtml() : evTab === 'thron' ? evThronHtml() : evTab === 'inv' ? evInvHtml() : evTab === 'drache' ? evDrHtml() : evTab === 'lager' ? evLagerHtml() : evBossHtml()) + (!oben && evTab === 'tour' ? sz : ''));
}
// Welt-Saison: nur in den letzten 3 Tagen (oder angehalten) oben in jedem Reiter – sonst unten im Wochen-Event (der Inhalt des Reiters geht vor)
function saisonOben(now) { return !!(saison && (saison.halt || saison.ende - now <= SAISON_BALD_MS)); }
document.getElementById('eventBody').addEventListener('click', e => {
    const hol = e.target.closest('[data-ev-hol]'); if (hol) return evHolen(hol.dataset.evHol);
    const go = e.target.closest('[data-ev-go]'); if (!go) return; const k = go.dataset.evGo;
    let t = null, v = null;
    if (k === 'drache') { t = drOnMap(); v = { kind: 'drache' }; }
    else if (k === 'boss') { t = dbossOnMap(); v = { kind: 'boss' }; if (t && !isCellOpen(t.x, t.y)) { flashHint('Der Tagesboss steht im Nebel – erforsche zuerst das Gebiet.', 3500); return; } }
    else if (k === 'camp') { t = barbNearest(); v = t && { kind: 'camp', id: t.id }; }
    else if (k === 'inv') { const I = invAktiv(), a = I && I.armies.filter(x => islandOwnerOf(x.tid) === 'player').sort((x, y) => x.at1 - y.at1)[0]; if (a) { t = invPos(a); v = { kind: 'inv', id: a.id }; } }
    if (!t) { flashHint('Gerade nichts davon auf der Karte.', 2500); return renderEvents(); }
    closePanel(goalsPopup); flyTo(t.x, t.y, k === 'drache' ? { zoom: .015, screenY: viewH * .3 } : { zoom: Math.max(mapState.zoom, .02), screenY: viewH * .2 }); openBarbSheet(v);
});
// der Hinweis unter dem HUD: Invasion bald/läuft, Drache bald/da → [Dringlichkeit, html] (0 = am dringendsten)
function evChips(now) {
    const hol = k => evHolBereit(k) ? '<em class="mb-hol" aria-label="Belohnung abholen"></em>' : '';   // roter Punkt: im Event liegt etwas zum Abholen
    const out = [], ip = evPlanVon('inv'), I = invAktiv(now), D = drAktiv(now), dp = evPlanVon('dr');
    if (I) { const n = I.armies.filter(a => islandOwnerOf(a.tid) === 'player').length, p = Math.floor(I.pts.player || 0);   // 0 Punkte: nichts zeigen
        out.push([n ? 0 : 2, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv" title="Barbaren-Invasion · Welle ' + Math.min(INV_WELLEN, I.welle) + '/' + INV_WELLEN + '">' + icon('defense') + '<span>Invasion ' + Math.min(INV_WELLEN, I.welle) + '/' + INV_WELLEN + '</span>' + (n ? '<b>' + n + ' auf dich</b>' : p > 0 ? '<b>' + fmtNum(p) + (p === 1 ? ' Punkt' : ' Punkte') + '</b>' : '') + hol('inv') + '</button>']); }
    else if (ip.start > now && ip.start - now <= 30 * 60000) out.push([3, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv">' + icon('defense') + '<span>Barbaren-Invasion in</span><i data-ev-bis="' + ip.start + '"></i></button>']);
    if (D) out.push([2, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache">' + icon('star') + '<span>Drache</span><b>' + Math.ceil(D.hp / D.max * 100) + ' %</b><i data-ev-bis="' + D.end + '"></i>' + hol('drache') + '</button>']);
    else if (dp.start > now && dp.start - now <= 30 * 60000) out.push([3, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache">' + icon('star') + '<span>Der Drache kommt in</span><i data-ev-bis="' + dp.start + '"></i></button>']);
    const sz = saisonChip(now); if (sz) out.push(sz);                                  // die letzten 3 Tage einer Welt-Saison: Countdown
   
    return out;
}
