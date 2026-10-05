// Teil 02-rally-geschenke.js: Bündnis: Rally, Geschenke, Tempel-Bonus, Gebiet
// ==============================================================================================================
// 3) RALLY – gemeinsamer Angriff: sammeln beim Starter, nach Ablauf EIN Angriff mit allen Truppen
// ==============================================================================================================
function bundRallyStart(a, who, b) {
    const at = b.basis, t = b.ziel, min = b.min;   // („at“ ist schon die Zeit des Befehls)
    if (!bundGehoert(at, who) || !Number.isInteger(t) || !BUND.RALLY_MIN.includes(min) || !bundZahl(b.n)) return 'kaputt';
    const why = bundZielOk(who, t); if (why) return why;
    if (bund.r.some(r => r.by === who)) return 'Du hast schon eine Rally laufen';
    if (AUF && !AUF.marschOk(who)) return AUF.marschVoll(who);                // eine Rally = ein Marsch-Platz (Paket D)
    if (bund.r.filter(r => r.aid === a.id).length >= BUND.RALLY_PRO_BUND) return 'Dein Bündnis hat schon ' + BUND.RALLY_PRO_BUND + ' Rallys laufen';
    if (!routeFor(islandById[at].landmassId, islandById[t].landmassId, who)) return 'Vom Sammelpunkt gibt es keinen Weg zum Ziel';
    const n = Math.floor(Math.min(b.n, islandTroops[at] || 0)); if (n < 1) return 'Keine Truppen am Sammelpunkt';
    islandTroops[at] -= n;
    const now = Date.now(), r = { id: 'r' + (bund.n++), aid: a.id, by: who, at, t, start: now, los: now + min * 60000, n0: n, j: [] };
    const held = typeof b.held === 'string' && heroOwned(who, b.held) && !heroBusy(who, b.held) ? b.held : null;   // der Held des Anführers führt die ganze Rally (Alexander 4.10.)
    if (held) { r.held = held; const h2 = heroZweitOk(who, held, typeof b.held2 === 'string' ? b.held2 : null); if (h2) r.held2 = h2; }
    bund.r.push(r);
    bundLog(a, bundName(who) + ' sammelt zur Rally auf ' + bundZielName(islandById[t]) + '.'); bundChatDazu(a, who, 's_rally', t);
    const ow = islandOwnerOf(t), warnt = ow && ow !== who && bundEinmal('r|' + ow + '|' + who + '|' + t);
    if (warnt) bundPush(ow, { art: 'rally', von: bundName(who), basis: bundZielName(islandById[t]), ankunft: r.los });
    if (warnt && botById[ow] && botById[ow].mensch) bundMelden(ow, 'Achtung: ' + bundName(who) + ' sammelt Truppen für einen gemeinsamen Angriff auf ' + bundZielName(islandById[t]) + '!');
    if (warnt && bundVon(ow)) bundChatDazu(bundVon(ow), who, 's_gegen', t);   // Warnung im Chat des angegriffenen Bündnisses (die Hilfe: bundMitspielerSignale – wie bei jedem Angriff)
    for (const w of a.mit) if (w !== who && bundKommtHin(w, at, Infinity) && bundEinmal('ri|' + w + '|' + who + '|' + t)) bundMelden(w, bundName(who) + ' startet eine Rally auf ' + bundZielName(islandById[t]) + ' – mach mit (Bündnis → Rally).');   // (nur wer es rechtzeitig schafft)
    saveGame(); return '';
}
function bundKommtHin(w, ziel, bis) {                            // hat w eine Basis, deren Truppen rechtzeitig bei ziel sind?
    if (!botById[w] || !botById[w].mensch) return false; const Z = islandById[ziel];
    for (const id of bundBasen(w)) { const s = islandById[id]; if (id === ziel || (islandTroops[id] || 0) < 1 || !routeFor(s.landmassId, Z.landmassId, w)) continue;
        if (Date.now() + travelDurationSeconds(s, Z, w) * 1000 < bis - 2000) return true; }
    return false;
}
function bundRallyDazu(a, who, b) {
    const r = bund.r.find(x => x.id === b.rid && x.aid === a.id); if (!r) return 'Diese Rally gibt es nicht mehr';
    if (!bundGehoert(b.von, who) || b.von === r.at || !bundZahl(b.n)) return 'kaputt';
    if (r.j.length >= 60) return 'Die Rally ist voll';
    const frei = rallyFrei(r); if (frei < 1) return 'Die Rally ist voll – mehr Platz gibt die Botschaft von ' + bundName(r.by);
    b = Object.assign({}, b, { n: Math.min(b.n, frei) });             // (nur so viele, wie noch Platz ist)
    // (Beitreten geht immer – Alexander 4.10.: „nur wer sie eröffnet, muss nah genug dran sein“. Wer nach dem Start ankommt,
    //  marschiert vom Sammelpunkt direkt zum Ziel weiter und kämpft mit – siehe bundSendAnkunft)
    // Seine Helden (Alexander 4.10.: jeder bringt höchstens 2 mit – Haupt- und Zweitheld, zählen nur für SEINE Truppen).
    // Wer schon mit Helden in dieser Rally ist (oder sie führt), bringt keine weiteren. Belegt bis zum Kampfende (heroBusy).
    const schon = who === r.by || r.j.some(j => j.w === who && (j.held || j.held2));
    const held = !schon && typeof b.held === 'string' && heroOwned(who, b.held) && !heroBusy(who, b.held) ? b.held : null;
    const held2 = heroZweitOk(who, held, typeof b.held2 === 'string' ? b.held2 : null);
    const extra = { rally: r.id }; if (held) extra.held = held; if (held2) extra.held2 = held2;
    const k = pendingSends.length, why = bundMarsch(who, b.von, r.at, b.n, extra); if (why) return why;
    const m = pendingSends[pendingSends.length - 1]; if (pendingSends.length === k || !m) return 'kaputt';
    const j = { w: who, f: b.von, n: m.troops, s: m.startedAt, k: marchKeyOf(m), da: false }; if (held) j.held = held; if (held2) j.held2 = held2;
    r.j.push(j);
    return '';
}
function bundRallyTruppen(r) { return r.n0 + r.j.reduce((s, j) => s + (j.da ? j.n : 0), 0); }
function bundRallyUnterwegs(r) { return r.j.reduce((s, j) => s + (j.da ? 0 : j.n), 0); }
function bundRallyEnde(r, grund) {                               // abgebrochen: alle Truppen wieder heim
    bund.r = bund.r.filter(x => x !== r);
    const by = r.by, own = islandOwnerOf(r.at) === by;
    if (own) islandTroops[r.at] = (islandTroops[r.at] || 0) + r.n0; else bundHeimschicken(by, r.at, bundCap(by), r.n0);
    for (const j of r.j) if (j.da) bundHeimschicken(j.w, r.at, j.f, j.n);    // (die noch unterwegs sind, kehren bei der Ankunft um)
    const a = bund.b[r.aid], txt = 'Rally auf ' + bundZielName(islandById[r.t]) + ' abgebrochen: ' + grund + '.';
    if (a) bundLog(a, txt); for (const w of new Set([by].concat(r.j.map(j => j.w)))) bundMelden(w, txt);   // (Bescheid bekommen nur die, die mitmachen)
    saveGame(); saveProgression(); bundSpeichern();
}
function bundRallyLos(r) {
    bund.r = bund.r.filter(x => x !== r);                                       // zuerst raus: bricht unten etwas ab, startet sie nicht in der nächsten Sekunde nochmal (doppelte Truppen)
    const by = r.by;
    if (islandOwnerOf(r.at) !== by) return bundRallyEnde(r, 'der Sammelpunkt ist gefallen');
    if (bundZielOk(by, r.t)) { const ow = islandOwnerOf(r.t);                // (Grund für alle Mitglieder verständlich)
        return bundRallyEnde(r, ow === by || bundVerbuendet(ow, by) ? 'das Ziel gehört inzwischen dem Bündnis' : 'das Ziel steht unter einem Friedensschild'); }
    let total = bundRallyTruppen(r); const vorher = islandTroops[r.at] || 0;
    islandTroops[r.at] = vorher + total;
    if (AUF) AUF.frei.an();                                                     // (der gemeinsame Angriff war schon als Rally gezählt)
    r.startet = true;                                                           // (ihr Held ist ab jetzt im Angriff – nicht mehr „belegt durch die Rally“)
    let atk = null, kaputt = false, fehlt = null;
    try { for (;;) {                                                            // (jeder zahlt die Maut für SEINE Truppen – Alexander #11)
        const maut = {}, k = pendingAttacks.length; mautZahler = rallyMaut(r, maut);
        try { launchAttack(r.at, r.t, by, total, r.held || null, r.held2 || null); } catch (e) { kaputt = true; console.warn('Rally:', e); } finally { mautZahler = null; }
        atk = pendingAttacks.length > k ? pendingAttacks[pendingAttacks.length - 1] : null;   // (auch wenn danach etwas warf: steht er drin, marschiert er – Maut ist bezahlt)
        if (atk && atk.attackerBotId === by) break; atk = null;
        fehlt = !kaputt && maut.fehlt; if (!fehlt || fehlt === by) break;
        // Ein Mitglied kann seinen Maut-Anteil nicht zahlen (Alexander B1): nur er bleibt draußen, seine Truppen gehen heim, die anderen zahlen neu
        for (const j of r.j.filter(x => x.da && x.w === fehlt)) {         // (einzeln: wirft etwas, steht der Rest noch in der Rally – nichts doppelt/weg)
            bundHeimschicken(j.w, r.at, j.f, j.n); r.j = r.j.filter(x => x !== j); total -= j.n; islandTroops[r.at] = Math.max(0, (islandTroops[r.at] || 0) - j.n); }
        bundMelden(fehlt, 'Du hattest nicht genug Münzen für deinen Maut-Anteil – deine Truppen kehren heim.');
        bundMelden(by, bundName(fehlt) + ' war zu arm für die Maut und ist nicht dabei.');
    } } catch (e) { atk = null; kaputt = true; console.warn('Rally:', e); } finally { if (AUF) AUF.frei.aus(); }   // (noch nicht los: unten wieder heim)
    if (!atk) { islandTroops[r.at] = Math.min(islandTroops[r.at] || 0, vorher);   // (noch nicht los: die Truppen wieder heim, auch nach einem Fehler)
        return bundRallyEnde(r, kaputt ? 'ein Fehler beim Losmarsch' : fehlt ? bundName(fehlt) + ' hat nicht genug Münzen für seine Maut' : 'der Weg ist versperrt (Tor zu oder Maut zu teuer)'); }
    atk.rally = { id: r.id, by, an: [[by, r.at, r.n0]].concat(r.j.filter(j => j.da).map(j => [j.w, j.f, j.n])) };
    try { rallyWerte(atk, by, r.n0, r.j.filter(j => j.da)); } catch (e) { console.warn('Rally-Werte:', e); }   // (der Angriff ist schon unterwegs – er kämpft dann mit den Werten des Anführers)
    for (const j of r.j) if (j.da) { botDropShield(j.w); botNeulingWeg(j.w, islandOwnerOf(r.t)); }   // (alle, die mitmachen, greifen an: Friedensschild und Anfängerschutz fallen)
    for (const k in bundMem.rallyWeg) if (bundMem.rallyWeg[k].bis < Date.now()) delete bundMem.rallyWeg[k];   // (abgelaufene weg – sonst wächst die Liste ewig)
    bundMem.rallyWeg[r.id] = { t: r.t, at: r.at, by, bis: Date.now() + 60 * 60000 };   // (für Nachzügler: sie folgen direkt zum Ziel)
    const a = bund.b[r.aid], txt = 'Rally auf ' + bundZielName(islandById[r.t]) + ' marschiert los: ' + fmtCompact(total) + ' Truppen von ' + atk.rally.an.length + (atk.rally.an.length === 1 ? ' Basis.' : ' Basen.');
    if (a) bundLog(a, txt); for (const w of new Set(atk.rally.an.map(x => x[0]))) bundMelden(w, txt);
    saveGame(); saveProgression(); bundSpeichern();
}
// Maut einer Rally (für launchAttack): die Maut für alle Truppen (mit dem Helden-Rabatt des Anführers, wie bisher) wird nach
// Truppen-Anteil auf die Teilnehmer verteilt – jeder zahlt seinen Teil. Kann einer nicht zahlen, zahlt keiner (maut.fehlt = wer;
// zuerst der Anführer) – bundRallyLos nimmt ihn heraus und versucht es mit den anderen nochmal.
function rallyMaut(r, maut) {
    return (fromLm, toLm, n, by, targetId, cut) => {
        const { gate, cost, closed } = tollFor(fromLm, toLm, n, by, targetId, cut);
        if (!cost) return true; if (closed) return false;
        const an = new Map([[by, r.n0]]); for (const j of r.j) if (j.da) an.set(j.w, (an.get(j.w) || 0) + j.n);
        const sum = [...an.values()].reduce((s, x) => s + x, 0) || 1, teil = new Map(); let bis = 0, vor = 0;
        for (const [w, x] of an) { bis += x; const z = Math.round(cost * bis / sum); teil.set(w, z - vor); vor = z; }   // (aufsummiert gerundet: zusammen genau die Maut)
        const hat = w => w === 'player' ? coins : (botCoins[w] || 0);
        for (const [w, z] of teil) if (hat(w) < z) { maut.fehlt = w; return false; }
        const owner = islandOwnerOf(gate.id);
        for (const [w, z] of teil) { if (!z) continue; if (w === 'player') coins -= z; else botCoins[w] -= z; goalBump(w, 'tolls'); }
        if (owner === 'player') coins += cost; else if (owner) botCoins[owner] = (botCoins[owner] || 0) + cost;
        goalBump(owner, 'tollCoins', cost);
        return true;
    };
}
// Rally: jeder zählt mit SEINEN Werten für SEINE Truppen (Skill Angriff, Titel, Forschung, seine Helden) – der Held des Anführers für dessen Truppen.
// (Stärke = (Truppen + Bonus) × Titel × Forschung des Anführers; die anderen werden darauf umgerechnet)
// Eintrag rally.an: [0] wer · [1] seine Basis · [2] Truppen · [3] Bonus (in Einheiten des Anführers) · [4] sein Held (hx) · [5] sein Schild (+ Held)
//                   [6] sein Skill-Anteil (für rallyAussortieren) · [7] der Helden-Anteil in [3] (fällt weg, wenn er im Kampf schon Helden hat)
function rallyWerte(atk, by, n0, mit) {
    const st = w => titleMult(w, 'attack') * (AUF ? AUF.kampf(w, 'a') : 1), stBy = st(by) || 1;
    const sk = (w, n) => w === 'player' ? attackFlatBonus(n) : Math.round(n * (botMults(w).attackPct || 0) / 100);
    const hb = atk.hx ? Math.round(n0 * atk.hx.atk / 100) + heroGefOf(atk.hx, n0) : 0; atk.heldBonus = hb;
    const src = islandById[atk.sourceId], tgt = islandById[atk.targetId], mitHeld = new Set();
    let skill = sk(by, n0), bonus = skill + hb;
    for (const j of mit) {
        const hx = j.held && j.w !== by && !mitHeld.has(j.w) && src && tgt ? heroLaunch(j.w, j.held, src, tgt, j.n, j.held2 || null) : null;   // seine Helden (volle Wut: die aktive Fähigkeit zündet – wie beim Anführer)
        if (hx) mitHeld.add(j.w);
        const b = sk(j.w, j.n), h = hx ? Math.round(j.n * hx.atk / 100) + heroGefOf(hx, j.n) : 0, p = (j.n + b + h) * st(j.w) / stBy - j.n; skill += b; bonus += p;
        const x = atk.rally.an.find(q => q[0] === j.w && q[2] === j.n && q[3] === undefined);
        if (x) { x[3] = Math.round(p); x[5] = Math.min(90, rallySchild(j.w) + (hx ? hx.loss || 0 : 0)); x[6] = b; if (hx) { x[4] = hx; x[7] = Math.round(h * st(j.w) / stBy); } }   // (für den Kampfbericht: was er mitbringt)
    }
    atk.attackBonus = Math.round(bonus); atk.skillBonus = skill;
}
// Schild (Ausrüstung) eines Mitglieds: weniger Verluste für SEINE Truppen (Alexander 5.10.: jeder für sich, wie Helden und Stärke)
function rallySchild(w) { return Math.min(90, (w === 'player' ? shieldLossReductionPct() : botMults(w).shield) || 0); }
// (Kampf, gewonnen) Verluste einer Rally/eines gemeinsamen Angriffs je Eintrag: jeder mit SEINEM Schild (der Anführer: red, mit Held).
// Merkt sich die Überlebenden je Eintrag (rally.rest) – bundRallyHeim schickt dann genau die heim.
function rallyVerluste(attack, def, my, red) {
    const an = attack.rally.an, by = attack.rally.by;
    const e = an.map(x => { const r = x[0] === by ? red : x[5] != null ? x[5] : rallySchild(x[0]);
        return Math.max(0, Math.min(x[2], Math.round(def * (1 - (Number.isFinite(r) ? r : 0) / 100) * x[2] / Math.max(1, my)))); });
    attack.rally.rest = an.map((x, i) => x[2] - e[i]);
    return { summe: e.reduce((s, v) => s + v, 0), e };
}
// (Kampf, vor dem Kampf) Wer nicht mehr im Bündnis des Anführers ist (verlassen nach dem Losmarsch, gewechselt), kämpft nicht mit:
// seine Truppen gehen vom Ziel heim, seine Stärke zählt nicht mehr.
function rallyAussortieren(attack, zielId) {
    const by = attack.rally.by, raus = attack.rally.an.filter(x => x[0] !== by && !bundFreund(by, x[0]));
    for (const x of raus) {
        attack.rawTroops = Math.max(0, attack.rawTroops - x[2]); attack.attackBonus = (attack.attackBonus || 0) - (x[3] || 0);
        if (attack.skillBonus !== undefined) attack.skillBonus = Math.max(0, attack.skillBonus - (x[6] != null ? x[6] : x[3] || 0));   // (sein echter Skill-Anteil)
        if (x[4]) heroWutZurueck(x[0], x[4]);                                   // (seine Helden kämpfen nicht – die Wut bleibt)
        if (x[2] > 0) bundHeimschicken(x[0], zielId, x[1], x[2]);
        bundMelden(x[0], 'Du bist nicht mehr im Bündnis von ' + bundName(by) + ' – deine Truppen aus dem gemeinsamen Angriff kehren heim.');
    }
    if (raus.length) attack.rally.an = attack.rally.an.filter(x => !raus.includes(x));
}
// Der Held eines Spielers in einem gemeinsamen Kampf (Anführer: der Held des Angriffs, sonst seiner aus rally.an)
function rallyHx(attack, w) { if (w === attack.rally.by) return attack.hx || null; const x = attack.rally.an.find(q => q[0] === w && q[4]); return x ? x[4] : null; }
// (Kampf, verloren) Wer flieht: jeder Spieler mit SEINEM Helden (Standhaft, Leichtfuß …). Merkt sich die Geflohenen je Eintrag
// (rally.rest) – bundRallyHeim schickt dann genau die heim. → { flucht: alle Geflohenen, e: Verluste je Eintrag }
function rallyFlucht(attack) {
    const an = attack.rally.an, f = an.map(x => Math.max(0, Math.min(x[2], Math.floor(x[2] * retreatPct({ hx: rallyHx(attack, x[0]) }) / 100))));
    attack.rally.rest = f;
    return { flucht: f.reduce((s, v) => s + v, 0), e: an.map((x, i) => x[2] - f[i]) };
}
// (Kampf) Überlebende einer Rally gehen anteilig zu ihren Basen zurück. ohneStarter: dessen Anteil wird zurückgegeben (bleibt vor Ort)
function bundRallyHeim(attack, n, vonId, ohneStarter) {
    const an = attack.rally && attack.rally.an || [], sum = an.reduce((s, x) => s + x[2], 0); let rest = Math.floor(n), bleibt = 0;
    attack._heim = 1;                                                       // (verteilt – bricht der Kampf danach ab, gehen sie nicht nochmal heim)
    if (attack.rally && !attack._kampf) for (const x of an) if (x[4] && x[0] !== attack.rally.by) heroWutZurueck(x[0], x[4]);   // (kein Kampf: die Wut der Mitglieds-Helden kommt zurück)
    if (!sum || rest < 1) return 0;
    const je = attack.rally.rest && attack.rally.rest.length === an.length && attack.rally.rest.reduce((s, v) => s + v, 0) === rest ? attack.rally.rest : null;   // (genau seine Überlebenden bzw. Geflohenen)
    an.forEach((x, i) => {
        const share = je ? je[i] : i === an.length - 1 ? rest : Math.min(rest, Math.floor(n * x[2] / sum)); rest -= share; if (share < 1) return;
        if (ohneStarter && x[0] === attack.rally.by) { bleibt += share; return; }
        bundHeimschicken(x[0], vonId, x[1], share, (rallyHx(attack, x[0]) || {}).ret || 0);   // (Rückweg: sein Held)
    });
    return bleibt;
}
// Anteile an einem gemeinsamen Kampf nach Stärke (für Wochen-Punkte und Erfahrung) → [[wer, Anteil 0…1], …]
function kampfTeile(L) { const k = q => Math.max(0, q.k !== undefined ? q.k : q.n || 0), s = L.reduce((t, q) => t + k(q), 0) || 1; return L.map(q => [q.w, k(q) / s]); }
// Anteile der Verteidiger: Besitzer + jeder Helfer (Verstärkung) nach seiner Stärke (Truppen + seine Werte); gesamt = Truppen + Verteidigung
function verstAnteile(vk, owner, gesamt) {
    if (!owner) return null; if (!vk || !vk.L.length) return [[owner, 1]];
    const h = vk.L.map(x => [x.v.w, Math.max(0, x.n0 + (x.plus || 0))]), sh = h.reduce((s, x) => s + x[1], 0), g = Math.max(gesamt || 0, sh) || 1;
    return [[owner, Math.max(0, g - sh) / g]].concat(h.map(x => [x[0], x[1] / g]));
}
// (Kampf) Gemeinsamer Angriff (Rally oder mehrere Bündnis-Angriffe auf dasselbe Ziel): jeder verliert nach SEINEN Verlusten (rv),
// seine Verwundeten gehen in SEIN Krankenhaus (mit SEINEM Helden). Gibt die Angreifer-Liste für den Kampfbericht zurück
// (je Spieler: fallen, wounded, fled = geflohen, rest = übrig).
function kampfAnteile(attack, fallen, hosp, rv, won) {   // rv: Verluste je Eintrag (rallyVerluste / rallyFlucht) – sonst nach Truppen
    const an = attack.rally.an, by = attack.rally.by, sum = an.reduce((s, x) => s + x[2], 0) || 1, m = new Map();
    for (const x of an) { if (!m.has(x[0])) m.set(x[0], { w: x[0], n: 0, plus: 0, eig: 0 }); const q = m.get(x[0]); q.n += x[2]; if (x[3] !== undefined) { q.plus += x[3]; q.eig = 1; } if (x[4]) q.hx = x[4]; }
    const stA = (attack.atkTitle !== undefined ? attack.atkTitle : titleMult(by, 'attack')) * (attack.atkKraft || 1), ganz = Math.round((attack.rawTroops + (attack.attackBonus || 0)) * stA);
    let andere = 0; for (const q of m.values()) if (q.w !== by && q.eig) { q.k = Math.round((q.n + q.plus) * stA); andere += q.k; }
    if (m.has(by)) { const q = m.get(by); q.k = ganz - andere; }                  // (Stärke je Spieler: der Anführer bekommt den Rest – die Summe passt genau)
    const L = [...m.values()]; let rest = Math.max(0, Math.floor(fallen));
    const fw = {}; if (rv) an.forEach((x, i) => { fw[x[0]] = (fw[x[0]] || 0) + rv.e[i]; });
    L.forEach((x, i) => {
        const f = rv ? fw[x.w] || 0 : i === L.length - 1 ? rest : Math.min(rest, Math.round(fallen * x.n / sum)); rest -= f;
        const hx = x.w === by ? attack.hx : x.hx;                           // Krankenhaus: SEINES, mit SEINEM Helden (Feldlazarett)
        const pct = x.w === by ? hosp : hx ? Math.min(100, (x.w === 'player' ? hospitalPct() : botHospitalPct(x.w)) + (hx.hosp || 0)) : undefined;
        const wd = f > 0 ? (x.w === 'player' ? hospitalTake(f, pct) : botHospitalTake(x.w, f, pct)) || 0 : 0;
        const ueb = Math.max(0, x.n - f);                                    // (gewonnen: übrig · verloren: geflohen)
        Object.assign(x, { name: bundName(x.w), fallen: f - wd, wounded: wd, fled: won ? 0 : ueb, rest: won ? ueb : 0, gear: fighterSnapshot(x.w, hx) }); if (x.w !== by) x.rate = killGoldRate(x.w, x.hx); delete x.eig; delete x.hx;   // (rate: sein Gold je Kill – braucht resolveBotAttack)
    });
    return L;
}
// (Kampf) Beute (Gold, Holz, Stein, Eisen) der Rally nach Truppen verteilen und allen Beteiligten Bescheid geben
function bundRallyBeute(attack, gain, won, targetId, roh) {   // roh: Holz/Stein/Eisen aus der Beute – auch nach Truppen geteilt
    const an = attack.rally.an, by = attack.rally.by, sum = an.reduce((s, x) => s + x[2], 0) || 1, ziel = bundZielName(islandById[targetId]);
    const anteile = {}; for (const x of an) anteile[x[0]] = (anteile[x[0]] || 0) + x[2];
    for (const w in anteile) {
        const teil = gain > 0 && w !== by ? Math.floor(gain * anteile[w] / sum) : 0;
        if (teil > 0) { botCoins[by] = Math.max(0, (botCoins[by] || 0) - teil); botCoins[w] = (botCoins[w] || 0) + teil; }
        let t = null;
        if (roh && AUF && w !== by) { t = { h: Math.floor((roh.h || 0) * anteile[w] / sum), s: Math.floor((roh.s || 0) * anteile[w] / sum), e: Math.floor((roh.e || 0) * anteile[w] / sum) };
            if (t.h || t.s || t.e) { AUF.rohDazu(by, { h: -t.h, s: -t.s, e: -t.e }); AUF.rohDazu(w, t); } }
        const anteil = beuteText({ loot: teil, roh: t });                  // (Gold, Holz, Stein, Eisen – wie viel er bekommen hat)
        if (w !== by && !attack.rally.zus) bundMelden(w, 'Rally auf ' + ziel + ': ' + (won ? 'Sieg!' : 'gescheitert.') + ' Deine überlebenden Truppen kehren heim' + (anteil ? '. Dein Anteil: ' + anteil + '.' : '.'));
    }
    const a = bundVon(by); if (a) { bundLog(a, (attack.rally.zus ? 'Gemeinsamer Angriff auf ' : 'Rally auf ') + ziel + ': ' + (won ? 'Sieg' : 'gescheitert') + '.'); bundSpeichern(); }
    if (a && won) bundGutGemacht(a, Object.keys(anteile));
}

// ==============================================================================================================
// 4) GESCHENKE, TEMPEL-BONUS, GEBIET
// ==============================================================================================================
function bundTagHeute() { return todayKey(); }   // (Ortszeit wie überall im Spiel)
// Boss besiegt / große Kiste gekauft → alle ANDEREN Mitglieder bekommen ein kleines Geschenk (pro Tag gedeckelt)
function bundGeschenk(geber, grund) {
    if (window.WELT && !rechnet()) return;
    const a = bundVon(geber); if (!a || a.mit.length < 2) return;
    const g = a.gesch && typeof a.gesch === 'object' ? a.gesch : (a.gesch = {}), heute = bundTagHeute();
    if (g.tag !== heute) { g.tag = heute; g.n = {}; g.k = {}; }
    if (grund === 'kiste') { g.k[geber] = (g.k[geber] || 0) + 1; if (g.k[geber] > BUND.KISTEN_TAG) return; }
    const von = bundName(geber), warum = grund === 'boss' ? 'hat einen Boss besiegt' : 'hat eine große Kiste gekauft';
    for (const w of a.mit) {
        if (w === geber || (g.n[w] || 0) >= BUND.GESCHENKE_TAG) continue;
        g.n[w] = (g.n[w] || 0) + 1;
        const hp = hourProduction(w), bg = AUF ? AUF.botschaftGeschenk(w) : 1, c = Math.round(Math.max(2000, hp.coins * .05) * bg), tr = Math.round(Math.max(500, hp.troops * .05) * bg);   // (Botschaft: größer)
        const x = Math.random(), crate = x < .03 ? 1 : x < .12 ? 0 : -1;                       // selten eine graue oder grüne Ausrüstung
        if (botById[w] && botById[w].mensch) {
            if (WELT.wache) WELT.wache.gutschrift(w, c, tr);                                   // (damit der Schummel-Schutz das Abholen durchlässt)
            WELT.nachricht(parseInt(w.slice(1), 10), { art: 'bundGeschenk', coins: c, tr, crate, hint: von + ' ' + warum + ' – ein Bündnis-Geschenk liegt für dich bereit (Events → Belohnung).' });
        } else {
            botCoins[w] = (botCoins[w] || 0) + c; const cap = botCapitalOf(w); if (cap !== null && cap !== undefined) islandTroops[cap] = (islandTroops[cap] || 0) + tr;
            const st = loadBotState()[w]; if (crate >= 0 && st && st.spare) { const k = pickRandomSlot(); if (st.spare[k]) st.spare[k][crate]++; }
        }
    }
    bundLog(a, von + ' ' + warum + ' – Geschenke für alle.');
    saveBotState(); saveGame(); bundSpeichern();
}
// Tempel-Bonus: hält ein Mitglied einen Tempel, produzieren ALLE Mitglieder etwas mehr (alle 5 s neu gezählt)
const BUND_TEMPEL = islands.filter(i => i.type === 'temple' || i.type === 'megaTemple').map(i => i.id);
let bundBonusMem = { at: 0, ver: -1, pct: {}, n: {} };
function bundBonus(a) {
    const now = Date.now();
    if (now - bundBonusMem.at > 5000 || bundBonusMem.ver !== bundCache.ver) {
        const pct = {}, n = {};
        for (const id of BUND_TEMPEL) { const ow = islandOwnerOf(id), x = ow && bundIdx.get(ow); if (!x) continue;
            const v = (n[x] || (n[x] = { t: 0, m: 0 })); if (islandById[id].type === 'megaTemple') v.m++; else v.t++; }
        for (const x in n) pct[x] = Math.min(BUND.BONUS_MAX, n[x].t * BUND.TEMPEL_PCT + n[x].m * BUND.MEGA_PCT);
        bundBonusMem = { at: now, ver: bundCache.ver, pct, n };
    }
    return { pct: bundBonusMem.pct[a.id] || 0, n: bundBonusMem.n[a.id] || { t: 0, m: 0 } };
}
function bundProdMult(who) { const x = who && bundIdx.get(who); if (!x || !bund.b[x]) return 1; return 1 + bundBonus(bund.b[x]).pct / 100; }
// Gebiet: wo das Bündnis mindestens 40 % der Basen einer Insel hält (oder die Zielbasis einem Mitglied gehört), marschieren Mitglieder 10 % schneller
let bundGebietMem = { at: 0, ver: -1, lm: {} };
function bundGebiet(aid) {
    const now = Date.now();
    if (now - bundGebietMem.at > 5000 || bundGebietMem.ver !== bundCache.ver) {
        const lm = {};
        for (const l of landmasses) { const on = islandsByLandmass[l.id] || []; if (!on.length) continue; const c = {};
            for (const i of on) { const ow = islandOwnerOf(i.id), x = ow && bundIdx.get(ow); if (x) c[x] = (c[x] || 0) + 1; }
            for (const x in c) if (c[x] / on.length >= .4) (lm[x] || (lm[x] = new Set())).add(l.id); }
        bundGebietMem = { at: now, ver: bundCache.ver, lm };
    }
    return bundGebietMem.lm[aid] || null;
}
function bundTempo(who, target) {
    const x = who && bundIdx.get(who); if (!x || !target) return 1;
    const ow = target.id !== undefined ? islandOwnerOf(target.id) : null;
    if (ow && bundIdx.get(ow) === x) return BUND.GEBIET_TEMPO;
    const g = bundGebiet(x); return g && g.has(target.landmassId) ? BUND.GEBIET_TEMPO : 1;
}

