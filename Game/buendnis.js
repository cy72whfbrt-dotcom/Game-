// ===== buendnis.js – Bündnisse (Paket A): Gründen, Beitreten, Signale, Rally, Geschenke, Tempel-Bonus, Gebiet =====
// Geladen nach spiel.js. Für echte Spieler UND Mitspieler – gleiche Regeln für alle.
// - Welt-Schlüssel openWaterBuendnisse: { b: { a<n>: Bündnis }, r: [Rallys], n: nächste Nummer } (welt.js rechnet die
//   Kennungen um: u<id> ↔ 'player'). Ändern darf ihn NUR der Weltrechner: Spieler schicken Befehle WELT.befehl('bund', …),
//   der Weltrechner prüft alles (bundOp). Mitspieler rufen bundOp direkt auf.
// - Bündnis: { id, name, tag, farbe, zeichen, anf (Anführer), mit: [Mitglieder], offen, at, anfragen: [{ w, at }],
//   sig: [{ id, w, art, z, at }], log: [{ at, t }], gesch: { tag, n: { wer: Anzahl }, k: { wer: Kisten } } }
// - Rally: { id, aid, by, at (Sammelpunkt = Basis des Starters), t (Ziel), start, los, n0 (Truppen des Starters),
//   j: [{ w, f (von Basis), n, s (Start des Marschs), da (angekommen) }] }
// Kapitel: 1) Daten  2) Regeln (Weltrechner)  3) Rally  4) Geschenke, Tempel-Bonus, Gebiet  5) Mitspieler
//          6) Fenster  7) Karte  8) Verbindung zur Welt

// ==============================================================================================================
// 1) DATEN
// ==============================================================================================================
const BUND = {
    MAX: 20, KOSTEN: 30000,                                   // höchstens 20 Mitglieder · Gründen kostet 30.000 Münzen
    SIG_MS: 10 * 60000, SIG_PAUSE: 30000, SIG_MAX: 30,        // Signale: 10 Min. auf der Karte, 1 pro 30 s und Spieler
    RALLY_MIN: [1, 3, 5], RALLY_PRO_BUND: 3,
    GESCHENKE_TAG: 5, KISTEN_TAG: 3,                          // pro Mitglied höchstens 5 Geschenke am Tag · pro Geber 3 Kisten-Geschenke
    TEMPEL_PCT: 2, MEGA_PCT: 5, BONUS_MAX: 12,                // Tempel-Bonus: +2 % je Tempel, Mega-Tempel +5 %, höchstens +12 %
    GEBIET_TEMPO: 1.1,                                        // im eigenen Gebiet 10 % schneller
    FARBEN: ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d68910', '#16a085', '#e84393', '#5d6d7e', '#b7950b', '#d35400', '#1abc9c', '#7d3c98'],
    ZEICHEN: ['crown', 'star', 'shield', 'attack', 'temple', 'castle', 'flag', 'troops']
};
const BUND_SIGNALE = {
    hilfe:       { name: 'Hilfe!', ic: 'shield', farbe: '#e74c3c', text: z => 'Hilfe! ' + z + ' wird angegriffen' },
    angriff:     { name: 'Angriff!', ic: 'attack', farbe: '#e67e22', text: z => 'Angriff auf ' + z + '!' },
    sammeln:     { name: 'Sammeln', ic: 'flag', farbe: '#f1c40f', text: z => 'Sammeln bei ' + z },
    verteidigen: { name: 'Verteidigt', ic: 'defense', farbe: '#3498db', text: z => 'Verteidigt ' + z + '!' },
    danke:       { name: 'Danke!', ic: 'star', farbe: '#2ecc71', text: () => 'Danke!' }
};
const BUND_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]| (?! )){1,18}[A-Za-z0-9]$/, BUND_TAG_RE = /^[A-Z]{2,4}$/;
let bund = { b: {}, r: [], n: 1 };
let bundIdx = new Map();                                      // wer → Bündnis-Kennung
function bundLaden() {
    let v = null; try { v = JSON.parse(store.get('openWaterBuendnisse')); } catch (e) {}
    bund = v && typeof v === 'object' ? v : { b: {}, r: [], n: 1 };
    if (!bund.b || typeof bund.b !== 'object') bund.b = {}; if (!Array.isArray(bund.r)) bund.r = []; if (!(bund.n > 0)) bund.n = 1;
    bundIndex();
}
function bundIndex() { bundIdx = new Map(); for (const id in bund.b) for (const w of bund.b[id].mit || []) bundIdx.set(w, id); bundCache.ver++; }
function bundSpeichern() { bundIndex(); store.set('openWaterBuendnisse', JSON.stringify(bund)); requestRender(); }
const bundCache = { ver: 0 };
function bundVon(who) { const id = who && bundIdx.get(who); return id ? bund.b[id] || null : null; }
function bundVerbuendet(a, b) { if (!a || !b || a === b) return false; const x = bundIdx.get(a); return !!x && x === bundIdx.get(b); }
function bundTagVon(who) { const a = bundVon(who); return a ? a.tag : ''; }
function bundName(w) { return w === 'player' ? ((window.profileName && profileName.value) || 'Du') : (botById[w] || {}).name || 'Jemand'; }
function bundBasenText(w) { const n = whoBases(w); return fmtNum(n) + (n === 1 ? ' Basis' : ' Basen'); }
function bundMacht(a) { let s = 0; for (const w of a.mit) s += staerke(w); return s; }
function bundCap(w) { return w === 'player' ? playerIslandId : botCapitalOf(w); }
function bundBasen(w) { return w === 'player' ? ownedIslands : botOwnedIslands[w] || new Set(); }
function bundMitte(a) { let x = 0, y = 0, n = 0; for (const w of a.mit) { const c = islandById[bundCap(w)]; if (c) { x += c.x; y += c.y; n++; } } return n ? { x: x / n, y: y / n } : null; }
function bundLog(a, t) { (a.log || (a.log = [])).unshift({ at: Date.now(), t: String(t).slice(0, 160) }); if (a.log.length > 12) a.log.length = 12; }
function bundUnterAngriff(id) {                                  // kommt gerade ein Angriff (oder eine Armee) von außerhalb des Bündnisses?
    const ow = islandOwnerOf(id); if (!ow) return null; let str = 0, at = Infinity;
    for (const a of pendingAttacks) if (a.targetId === id && !a.fightEndsAt && (a.attackerBotId || 'player') !== ow && !bundVerbuendet(a.attackerBotId || 'player', ow)) { str += (a.rawTroops + (a.attackBonus || 0)) * (a.atkTitle || 1) * (a.atkKraft || 1); at = Math.min(at, a.resolveAt); }
    for (const x of armies) if (x.mv && x.mv.to && x.mv.to.kind === 'base' && x.mv.to.id === id) { const w = armyWho(x); if (w !== ow && !bundVerbuendet(w, ow)) { str += x.troops; at = Math.min(at, x.mv.resolveAt); } }
    return at < Infinity ? { str, at } : null;   // (am Handy ist die Stärke fremder Angriffe unbekannt – 0 – der Angriff zählt trotzdem)
}

// ==============================================================================================================
// 2) REGELN – nur der Weltrechner ändert die Bündnisse. who = 'u<id>' (echter Spieler) oder 'bot<n>'.
//    → '' (gut) oder ein kurzer Grund, warum nicht. Echte Spieler bekommen den Grund als Nachricht.
// ==============================================================================================================
function bundMelden(w, text) { if (window.WELT && /^u\d+$/.test(w) && botById[w] && botById[w].mensch) WELT.nachricht(parseInt(w.slice(1), 10), { art: 'bundInfo', text: String(text).slice(0, 300) }); }
function bundAlleMelden(a, text, ausser) { for (const w of a.mit) if (w !== ausser) bundMelden(w, text); }
function bundPush(w, daten) { if (/^u\d+$/.test(w || '')) (window.__bundPush || (window.__bundPush = [])).push(Object.assign({ an: w }, daten)); if (window.__bundPush && window.__bundPush.length > 200) window.__bundPush.splice(0, 100); }
function bundGehoert(id, w) { return Number.isInteger(id) && !!islandById[id] && islandOwnerOf(id) === w; }
function bundZahl(v) { return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1e15; }
function bundZielOk(w, t) {                                      // darf w diese Basis angreifen? '' = ja
    const isl = islandById[t]; if (!isl) return 'Ziel gibt es nicht';
    const ow = islandOwnerOf(t);
    if (ow === w) return 'Das Ziel gehört dir schon';
    if (bundVerbuendet(w, ow)) return 'Das Ziel gehört einem Bündnis-Mitglied';
    if (isCapital(t)) return 'Hauptstädte können nicht angegriffen werden';
    if (baseShieldedFor(t, w)) return 'Das Ziel steht unter einem Friedensschild';
    return '';
}
function bundZahlen(w, kosten) {                                 // Münzen abziehen (bei echten Spielern über ihr Konto beim Weltrechner)
    if ((botCoins[w] || 0) < kosten) return false;
    if (botById[w] && botById[w].mensch && WELT.wache && !WELT.wache.kann(w, kosten)) return false;
    botCoins[w] -= kosten; return true;                          // (echte Spieler: geht als Nachricht „−Münzen“ an ihr Handy)
}
function bundRaus(a, w, grund) {                                 // w verlässt das Bündnis (oder wird rausgeworfen)
    a.mit = a.mit.filter(x => x !== w); if (a.dabei) delete a.dabei[w]; if (a.leer) delete a.leer[w];
    for (const r of bund.r.filter(r => r.aid === a.id && r.by === w)) bundRallyEnde(r, 'Der Starter ist nicht mehr im Bündnis');
    if (!a.mit.length) { delete bund.b[a.id]; return; }
    if (a.anf === w) { a.anf = a.mit.slice().sort((x, y) => staerke(y) - staerke(x))[0]; bundLog(a, bundName(a.anf) + ' führt jetzt das Bündnis.'); }
    bundLog(a, bundName(w) + (grund || ' hat das Bündnis verlassen.'));
}
function bundRein(a, w) {
    for (const x in bund.b) { const b = bund.b[x]; b.anfragen = (b.anfragen || []).filter(q => q.w !== w); }
    a.mit.push(w); (a.dabei || (a.dabei = {}))[w] = Date.now(); bundLog(a, bundName(w) + ' ist beigetreten.');   // (dabei: seit wann – Mitspieler wechseln frühestens nach 12 Std.)
}
function bundOp(who, b) {
    if (!b || typeof b !== 'object' || !botById[who]) return 'kaputt';
    const a = bundVon(who), now = Date.now(), op = b.op;
    const kennung = v => typeof v === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(v) ? v : null;
    const fertig = (txt) => { bundSpeichern(); if (txt) bundMelden(who, txt); return ''; };
    if (op === 'gruenden') {
        if (a) return 'Du bist schon in einem Bündnis';
        const name = typeof b.name === 'string' ? b.name.trim() : '', tag = typeof b.tag === 'string' ? b.tag.trim().toUpperCase() : '';
        if (!BUND_NAME_RE.test(name)) return 'Name: 3–20 Buchstaben oder Ziffern';
        if (!BUND_TAG_RE.test(tag)) return 'Kürzel: 2–4 Buchstaben';
        for (const x in bund.b) { if (bund.b[x].name.toLowerCase() === name.toLowerCase()) return 'Diesen Namen gibt es schon'; if (bund.b[x].tag === tag) return 'Dieses Kürzel gibt es schon'; }
        if (!bundBasen(who).size) return 'Du brauchst eine Basis';
        if (!bundZahlen(who, BUND.KOSTEN)) return 'Zu wenig Münzen (Gründen kostet ' + fmtNum(BUND.KOSTEN) + ')';
        const id = 'a' + (bund.n++);
        bund.b[id] = { id, name, tag, farbe: Number.isInteger(b.farbe) && b.farbe >= 0 && b.farbe < BUND.FARBEN.length ? b.farbe : 0, zeichen: Number.isInteger(b.zeichen) && b.zeichen >= 0 && b.zeichen < BUND.ZEICHEN.length ? b.zeichen : 0,
            anf: who, mit: [], offen: b.offen !== false, at: now, anfragen: [], sig: [], log: [], gesch: { tag: '', n: {}, k: {} } };
        bundRein(bund.b[id], who); bund.b[id].log = []; bundLog(bund.b[id], bundName(who) + ' hat das Bündnis gegründet.');
        return fertig('Bündnis [' + tag + '] ' + name + ' gegründet!');
    }
    if (op === 'beitreten') {
        const z = bund.b[kennung(b.aid)]; if (!z) return 'Dieses Bündnis gibt es nicht mehr';
        if (a) return 'Du bist schon in einem Bündnis';
        if (z.mit.length >= BUND.MAX) return 'Das Bündnis ist voll (' + BUND.MAX + ' Mitglieder)';
        if (z.offen) { bundRein(z, who); bundAlleMelden(z, bundName(who) + ' ist deinem Bündnis beigetreten.', who); return fertig('Willkommen im Bündnis [' + z.tag + '] ' + z.name + '!'); }
        z.anfragen = (z.anfragen || []).filter(q => q.w !== who && now - q.at < 24 * 3600000);
        if (z.anfragen.length >= 30) return 'Zu viele Anfragen – versuch es später';
        z.anfragen.push({ w: who, at: now }); bundMelden(z.anf, bundName(who) + ' möchte deinem Bündnis beitreten.');
        return fertig('Anfrage an [' + z.tag + '] ' + z.name + ' geschickt.');
    }
    if (op === 'anfrageWeg') { for (const x in bund.b) bund.b[x].anfragen = (bund.b[x].anfragen || []).filter(q => q.w !== who); return fertig(''); }
    if (!a) return 'Du bist in keinem Bündnis';
    const chef = a.anf === who, ziel = kennung(b.w);
    if (op === 'verlassen') { bundRaus(a, who); return fertig('Du hast das Bündnis verlassen.'); }
    if (op === 'anfrage') {                                      // Anführer: Ja / Nein
        if (!chef) return 'Nur der Anführer entscheidet';
        const q = (a.anfragen || []).find(x => x.w === ziel); if (!q) return '';
        a.anfragen = a.anfragen.filter(x => x !== q);
        if (b.ja === true) {
            if (bundVon(ziel)) return fertig('');
            if (a.mit.length >= BUND.MAX) { bundMelden(ziel, '[' + a.tag + '] ' + a.name + ' ist voll.'); return fertig('Das Bündnis ist voll (' + BUND.MAX + ' Mitglieder).'); }
            bundRein(a, ziel); bundMelden(ziel, 'Du bist jetzt im Bündnis [' + a.tag + '] ' + a.name + '!');
        } else bundMelden(ziel, '[' + a.tag + '] ' + a.name + ' hat deine Anfrage abgelehnt.');
        return fertig('');
    }
    if (op === 'rauswerfen') {
        if (!chef || !ziel || ziel === who || !a.mit.includes(ziel)) return 'Nur der Anführer kann Mitglieder entfernen';
        bundRaus(a, ziel, ' wurde aus dem Bündnis entfernt.'); bundMelden(ziel, 'Du wurdest aus dem Bündnis [' + a.tag + '] ' + a.name + ' entfernt.'); return fertig('');
    }
    if (op === 'anfuehrer') {
        if (!chef || !ziel || ziel === who || !a.mit.includes(ziel)) return 'Nur der Anführer kann das Amt übergeben';
        a.anf = ziel; bundLog(a, bundName(ziel) + ' führt jetzt das Bündnis.'); bundMelden(ziel, 'Du führst jetzt das Bündnis [' + a.tag + '] ' + a.name + '.'); return fertig('');
    }
    if (op === 'offen') { if (!chef) return 'Nur der Anführer'; a.offen = b.offen === true; return fertig(''); }
    if (op === 'signal') return bundSignal(a, who, b.s, b.z) || fertig('');   // (s = Art des Signals – „art“ ist schon die Art des Befehls)
    if (op === 'rally') return bundRallyStart(a, who, b) || fertig('');
    if (op === 'rallyDazu') return bundRallyDazu(a, who, b) || fertig('');
    if (op === 'rallyAbbruch') {
        const r = bund.r.find(x => x.id === kennung(b.rid) && x.aid === a.id); if (!r) return '';
        if (r.by !== who && !chef) return 'Nur wer die Rally gestartet hat';
        bundRallyEnde(r, bundName(who) + ' hat die Rally abgebrochen'); return fertig('');
    }
    if (op === 'hilfe') return bundHilfe(who, b.von, b.nach, b.n) || fertig('');
    if (op === 'kiste') {                                          // im Shop eine große Kiste gekauft → Geschenk für die anderen (pro Tag gedeckelt)
        const c = HERO_CHESTS.find(c => c.id === b.c && c.gems >= 500); if (!c) return 'kaputt';
        if (botById[who] && botById[who].mensch && window.WELT && WELT.kisteGekauft) { WELT.kisteGekauft(who, c); return ''; }   // echter Spieler: erst, wenn das Hauptbuch den Kauf sieht
        bundGeschenk(who, 'kiste'); return '';
    }
    return 'kaputt';
}
function bundSignal(a, who, art, z) {
    const S = BUND_SIGNALE[art]; if (!S) return 'kaputt';
    const now = Date.now(); a.sig = (a.sig || []).filter(s => now - s.at < 30 * 60000);
    const letztes = a.sig.find(s => s.w === who); if (letztes && now - letztes.at < BUND.SIG_PAUSE) return 'Warte kurz – höchstens ein Signal alle 30 Sekunden';
    if (art === 'danke') z = null;
    else {
        if (!Number.isInteger(z) || !islandById[z]) return 'kaputt';
        const ow = islandOwnerOf(z);
        if (art === 'hilfe' && ow !== who) return 'Hilfe rufen geht nur für eigene Basen';
        if ((art === 'sammeln' || art === 'verteidigen') && !(ow === who || bundVerbuendet(ow, who))) return 'Nur für Basen des Bündnisses';
        if (art === 'angriff' && (ow === who || bundVerbuendet(ow, who))) return 'Das ist eine Basis des Bündnisses';
    }
    const s = { id: 's' + (bund.n++), w: who, art, z, at: now };
    a.sig.unshift(s); if (a.sig.length > BUND.SIG_MAX) a.sig.length = BUND.SIG_MAX;
    if (art === 'hilfe') for (const w of a.mit) if (w !== who) bundPush(w, { art: 'hilfe', von: bundName(who), basis: islandTitle(islandById[z]) });
    return '';
}
// Truppen zur Verstärkung an die Basis eines Mitglieds, die gerade angegriffen wird (sie gehören dann dort zur Besatzung)
function bundHilfe(who, von, nach, n) {
    if (!bundGehoert(von, who) || !Number.isInteger(nach) || !islandById[nach] || !bundZahl(n)) return 'kaputt';
    const ow = islandOwnerOf(nach); if (!bundVerbuendet(ow, who)) return 'Nur an Basen deines Bündnisses';
    if (!bundUnterAngriff(nach)) return islandTitle(islandById[nach]) + ' wird gerade nicht angegriffen';
    return bundMarsch(who, von, nach, n, { hilfe: 1 });
}
function bundMarsch(who, von, nach, n, extra) {                  // ein Marsch zur Basis eines anderen Mitglieds (Rally oder Hilfe) → '' oder Grund
    const src = islandById[von], dst = islandById[nach];
    n = Math.floor(Math.min(n, islandTroops[von] || 0)); if (n < 1) return 'Keine Truppen dort';
    if (AUF && !AUF.marschOk(who)) return AUF.marschVoll(who);                // Marsch-Plätze der Burg (Paket D) – gilt für alle
    if (!routeFor(src.landmassId, dst.landmassId, who)) return 'Kein Weg dorthin (Tor zu?)';
    const hop = lastHop(src.landmassId, dst.landmassId, who); if (!payToll(hop[0], hop[1], n, who)) return 'Das Tor ist zu oder die Maut zu teuer';
    islandTroops[von] -= n;
    const t0 = Date.now(), m = Object.assign({ fromId: von, toId: nach, troops: n, startedAt: t0, resolveAt: t0 + travelDurationSeconds(src, dst, who) / (AUF ? AUF.botschaftTempo(who) : 1) * 1000, senderBotId: who }, extra || {});   // Botschaft: schneller
    pendingSends.push(m); saveGame(); saveProgression();
    return '';
}
// (resolveSend) ein Rally-/Hilfe-Marsch kommt an → true, wenn hier erledigt
function bundSendAnkunft(send) {
    const who = send.senderBotId; if (!who) return false;
    if (send.rally) {
        const r = bund.r.find(x => x.id === send.rally);
        const j = r && islandOwnerOf(r.at) === r.by && Date.now() < r.los + 3000 ? r.j.find(x => x.w === who && x.f === send.fromId && x.s === send.startedAt && !x.da) : null;
        if (j) { j.da = true; bundSpeichern(); return true; }
    } else if (send.hilfe) {
        const ow = islandOwnerOf(send.toId);
        if (ow && bundVerbuendet(ow, who)) {
            islandTroops[send.toId] = (islandTroops[send.toId] || 0) + send.troops;
            bundMelden(ow, bundName(who) + ' hat dir ' + fmtCompact(send.troops) + ' Truppen nach ' + islandTitle(islandById[send.toId]) + ' geschickt.');
            const a = bundVon(ow); if (a && !(botById[ow] || {}).mensch && Math.random() < .5) bundSignal(a, ow, 'danke');   // ein Mitspieler bedankt sich
            saveGame(); return true;
        }
    } else return false;
    bundHeimschicken(who, send.toId, send.fromId, send.troops);   // Rally schon weg / Basis nicht mehr im Bündnis: zurück
    saveGame(); saveProgression(); return true;
}
function bundHeimschicken(w, vonId, zuId, n) {
    if (!(n >= 1)) return;
    const own = bundBasen(w), to = own.has(zuId) ? zuId : bundCap(w);
    if (to === null || to === undefined || !islandById[to]) return;
    const now = Date.now(), dur = travelDurationSeconds(islandById[vonId] || islandById[to], islandById[to], w === 'player' ? undefined : w);
    pendingSends.push({ fromId: vonId, toId: to, troops: Math.floor(n), startedAt: now, resolveAt: now + Math.max(1, dur) * 1000, senderBotId: w, back: true });
}

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
    bund.r.push(r);
    bundLog(a, bundName(who) + ' sammelt zur Rally auf ' + islandTitle(islandById[t]) + '.');
    const ow = islandOwnerOf(t); if (ow && ow !== who) bundPush(ow, { art: 'rally', von: bundName(who), basis: islandTitle(islandById[t]), ankunft: r.los });
    if (ow && botById[ow] && botById[ow].mensch) bundMelden(ow, 'Achtung: ' + bundName(who) + ' sammelt Truppen für einen gemeinsamen Angriff auf ' + islandTitle(islandById[t]) + '!');
    for (const w of a.mit) if (w !== who && bundKommtHin(w, at, r.los)) bundMelden(w, bundName(who) + ' startet eine Rally auf ' + islandTitle(islandById[t]) + ' – mach mit (Bündnis → Rally).');   // (nur wer es rechtzeitig schafft)
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
    const eta = travelDurationSeconds(islandById[b.von], islandById[r.at], who) * 1000;
    if (Date.now() + eta > r.los - 1000) return 'Von dort kommen die Truppen nicht mehr rechtzeitig an';
    const k = pendingSends.length, why = bundMarsch(who, b.von, r.at, b.n, { rally: r.id }); if (why) return why;
    const m = pendingSends[pendingSends.length - 1]; if (pendingSends.length === k || !m) return 'kaputt';
    r.j.push({ w: who, f: b.von, n: m.troops, s: m.startedAt, da: false });
    return '';
}
function bundRallyTruppen(r) { return r.n0 + r.j.reduce((s, j) => s + (j.da ? j.n : 0), 0); }
function bundRallyUnterwegs(r) { return r.j.reduce((s, j) => s + (j.da ? 0 : j.n), 0); }
function bundRallyEnde(r, grund) {                               // abgebrochen: alle Truppen wieder heim
    bund.r = bund.r.filter(x => x !== r);
    const by = r.by, own = islandOwnerOf(r.at) === by;
    if (own) islandTroops[r.at] = (islandTroops[r.at] || 0) + r.n0; else bundHeimschicken(by, r.at, bundCap(by), r.n0);
    for (const j of r.j) if (j.da) bundHeimschicken(j.w, r.at, j.f, j.n);    // (die noch unterwegs sind, kehren bei der Ankunft um)
    const a = bund.b[r.aid], txt = 'Rally auf ' + islandTitle(islandById[r.t]) + ' abgebrochen: ' + grund + '.';
    if (a) bundLog(a, txt); for (const w of new Set([by].concat(r.j.map(j => j.w)))) bundMelden(w, txt);   // (Bescheid bekommen nur die, die mitmachen)
    saveGame(); saveProgression(); bundSpeichern();
}
function bundRallyLos(r) {
    const by = r.by;
    if (islandOwnerOf(r.at) !== by) return bundRallyEnde(r, 'der Sammelpunkt ist gefallen');
    if (bundZielOk(by, r.t)) { const ow = islandOwnerOf(r.t);                // (Grund für alle Mitglieder verständlich)
        return bundRallyEnde(r, ow === by || bundVerbuendet(ow, by) ? 'das Ziel gehört inzwischen dem Bündnis' : isCapital(r.t) ? 'das Ziel ist jetzt eine Hauptstadt' : 'das Ziel steht unter einem Friedensschild'); }
    const total = bundRallyTruppen(r);
    islandTroops[r.at] = (islandTroops[r.at] || 0) + total;
    if (AUF) AUF.frei.an();                                                     // (der gemeinsame Angriff war schon als Rally gezählt)
    const k = pendingAttacks.length; let ok = false; try { ok = launchAttack(r.at, r.t, by, total); } finally { if (AUF) AUF.frei.aus(); }
    const atk = ok && pendingAttacks.length > k ? pendingAttacks[pendingAttacks.length - 1] : null;
    if (!atk || atk.attackerBotId !== by) { islandTroops[r.at] = Math.max(0, (islandTroops[r.at] || 0) - total); return bundRallyEnde(r, 'der Weg ist versperrt (Tor zu oder Maut zu teuer)'); }
    atk.rally = { id: r.id, by, an: [[by, r.at, r.n0]].concat(r.j.filter(j => j.da).map(j => [j.w, j.f, j.n])) };
    bund.r = bund.r.filter(x => x !== r);
    const a = bund.b[r.aid], txt = 'Rally auf ' + islandTitle(islandById[r.t]) + ' marschiert los: ' + fmtCompact(total) + ' Truppen von ' + atk.rally.an.length + (atk.rally.an.length === 1 ? ' Basis.' : ' Basen.');
    if (a) bundLog(a, txt); for (const w of new Set(atk.rally.an.map(x => x[0]))) bundMelden(w, txt);
    saveGame(); saveProgression(); bundSpeichern();
}
// (Kampf) Überlebende einer Rally gehen anteilig zu ihren Basen zurück. ohneStarter: dessen Anteil wird zurückgegeben (bleibt vor Ort)
function bundRallyHeim(attack, n, vonId, ohneStarter) {
    const an = attack.rally && attack.rally.an || [], sum = an.reduce((s, x) => s + x[2], 0); let rest = Math.floor(n), bleibt = 0;
    if (!sum || rest < 1) return 0;
    an.forEach((x, i) => {
        const share = i === an.length - 1 ? rest : Math.min(rest, Math.floor(n * x[2] / sum)); rest -= share; if (share < 1) return;
        if (ohneStarter && x[0] === attack.rally.by) { bleibt += share; return; }
        bundHeimschicken(x[0], vonId, x[1], share);
    });
    return bleibt;
}
// (Kampf) Beute (Münzen) der Rally anteilig verteilen und allen Beteiligten Bescheid geben
function bundRallyBeute(attack, gain, won, targetId) {
    const an = attack.rally.an, by = attack.rally.by, sum = an.reduce((s, x) => s + x[2], 0) || 1, ziel = islandTitle(islandById[targetId]);
    const anteile = {}; for (const x of an) anteile[x[0]] = (anteile[x[0]] || 0) + x[2];
    for (const w in anteile) {
        const teil = gain > 0 && w !== by ? Math.floor(gain * anteile[w] / sum) : 0;
        if (teil > 0) { botCoins[by] = Math.max(0, (botCoins[by] || 0) - teil); botCoins[w] = (botCoins[w] || 0) + teil; }
        if (w !== by) bundMelden(w, 'Rally auf ' + ziel + ': ' + (won ? 'Sieg!' : 'gescheitert.') + ' Deine überlebenden Truppen kehren heim' + (teil > 0 ? ', +' + fmtCompact(teil) + ' Münzen Beute.' : '.'));
    }
    const a = bundVon(by); if (a) { bundLog(a, 'Rally auf ' + ziel + ': ' + (won ? 'Sieg' : 'gescheitert') + '.'); bundSpeichern(); }
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

// ==============================================================================================================
// 5) MITSPIELER – gründen, beitreten, Signale senden und mit Taten beantworten, Rallys starten und mitmachen
// ==============================================================================================================
const BUND_NAMEN = ['Sturmbund', 'Nordwacht', 'Eisenkrone', 'Seewoelfe', 'Drachenhort', 'Goldene Flotte', 'Schwarze Segel', 'Rote Rose', 'Bernsteinbund', 'Silberne Hand',
    'Wellenreiter', 'Graue Garde', 'Feuerkreis', 'Sternenwacht', 'Klippenbund', 'Tiefe See', 'Morgenrot', 'Wolfsrudel', 'Inselherren', 'Sturmflut', 'Kronenwacht', 'Nebelbund',
    'Donnerbucht', 'Salzkrieger', 'Leuchtturm', 'Ankerbund', 'Gezeiten', 'Brandungsrat', 'Kaperbund', 'Nordlicht Pakt'];
const bundMem = { botNext: {}, sigGemacht: new Set(), rallyGemacht: new Set(), ziel: {}, hilfeSig: {}, runde: 0, rallyRunde: {}, rallySeh: 0, sigSeh: 0 };
const bundWegMem = new Map();                                  // gibt es einen Weg (über eigene Tore)? – je Runde gemerkt
function bundWeg(a, b, w, n) {                                 // Weg da, letztes Tor offen und die Maut bezahlbar? (wie botCanCross, aber je Runde gemerkt)
    if (a === b) return true; const k = a + '>' + b + ':' + w; let h = bundWegMem.get(k);
    if (h === undefined) { const r = routeFor(a, b, w); h = r ? (r.length > 1 ? [r[r.length - 2], r[r.length - 1]] : [a, a]) : null; bundWegMem.set(k, h); }
    if (!h) return false; const t = tollFor(h[0], h[1], n || 1, w); return !t.closed && (botCoins[w] || 0) >= t.cost;
}
function bundZielVon(botId) { const z = bundMem.ziel[botId]; return z && Date.now() < z.until ? z.t : null; }   // (bots.js: ein Signal „Angriff auf X“ zieht sie dorthin)
function bundEinzelgaenger(bot) { return mulberry32((parseInt(bot.id.slice(3), 10) || 0) * 7717 + 3)() < .22; }   // manche spielen lieber allein
function bundBotBereit(bot, now) { return !bot.mensch && botOnline(bot, now) && now >= (bundMem.botNext[bot.id] || 0) && botOwnedIslands[bot.id] && botOwnedIslands[bot.id].size > 0; }
function bundBotGetippt(bot, now) { bundMem.botNext[bot.id] = now + (botStyle(bot).tapMs || 5000) * (.8 + Math.random() * .8); }
function bundTagFuer(name) {
    const w = name.split(' '), roh = (w.length > 1 ? w.map(x => x[0]).join('') + w[w.length - 1].slice(1, 3) : name.slice(0, 3)).toUpperCase().replace(/[^A-Z]/g, '');
    for (let L = 3; L <= 4; L++) for (let i = 0; i < 26; i++) { const t = (roh.slice(0, L - 1) + (i ? String.fromCharCode(64 + i) : roh[L - 1] || 'X')).slice(0, L);
        if (BUND_TAG_RE.test(t) && !Object.values(bund.b).some(b => b.tag === t)) return t; }
    return null;
}
function bundMitspielerRunde(now) {                              // alle 15 s: gründen, beitreten, Anfragen beantworten
    const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size);
    // a) Anfragen: ein Mitspieler als Anführer entscheidet nach Macht und Nähe
    for (const id in bund.b) {
        const a = bund.b[id], chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now)) continue;
        for (const q of (a.anfragen || []).slice()) {
            if (now - q.at < 20000) continue;
            const m = bundMitte(a), c = islandById[bundCap(q.w)], nah = m && c ? Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .45 : false;
            const schnitt = bundMacht(a) / Math.max(1, a.mit.length), ja = a.mit.length < BUND.MAX && !bundVon(q.w) && (staerke(q.w) >= schnitt * .25 || nah);
            bundOp(a.anf, { op: 'anfrage', w: q.w, ja });
        }
        if (botOwnedIslands[a.anf] && !botOwnedIslands[a.anf].size && a.mit.length > 1) { const neu = a.mit.filter(w => w !== a.anf).sort((x, y) => staerke(y) - staerke(x))[0]; a.anf = neu; bundLog(a, bundName(neu) + ' führt jetzt das Bündnis.'); bundSpeichern(); }
    }
    // b) gründen: etwa ein Bündnis pro 12 Mitspieler, in verschiedenen Gegenden
    const zahl = Object.values(bund.b).filter(a => botById[a.anf] && !botById[a.anf].mensch).length;
    if (zahl < Math.ceil(bots.length / 12) && Math.random() < .5) {
        const mitten = Object.values(bund.b).map(bundMitte).filter(Boolean);
        const kand = bots.filter(b => !bundVon(b.id) && !bundEinzelgaenger(b) && botOnline(b, now) && botOwnedIslands[b.id].size >= 4 && (botCoins[b.id] || 0) >= BUND.KOSTEN * 1.5 && b.style !== 'builder')
            .filter(b => { const c = islandById[botCapitalOf(b.id)]; return c && mitten.every(m => Math.hypot(c.x - m.x, c.y - m.y) > FRAME_HALF * .35); })
            .sort((x, y) => botOwnedIslands[y.id].size - botOwnedIslands[x.id].size).slice(0, 5);
        const g = kand[Math.floor(Math.random() * kand.length)];
        if (g) { const frei = BUND_NAMEN.filter(n => !Object.values(bund.b).some(b => b.name === n)), name = frei[Math.floor(Math.random() * frei.length)], tag = name && bundTagFuer(name);
            if (name && tag) { const used = new Set(Object.values(bund.b).map(b => b.farbe)), f = BUND.FARBEN.findIndex((_, i) => !used.has(i));
                bundOp(g.id, { op: 'gruenden', name, tag, farbe: f >= 0 ? f : Math.floor(Math.random() * BUND.FARBEN.length), zeichen: Math.floor(Math.random() * BUND.ZEICHEN.length), offen: Math.random() < .6 }); } }
    }
    // c) beitreten: ein paar Mitspieler ohne Bündnis schauen sich um – das nächste passende Bündnis (Nähe vor Macht, ähnlicher Stil hilft)
    const ohne = bots.filter(b => !bundVon(b.id) && !bundEinzelgaenger(b) && bundBotBereit(b, now) && Math.random() < .15).slice(0, 6);
    for (const bot of ohne) {
        const c = islandById[botCapitalOf(bot.id)]; if (!c) continue;
        let best = null;
        for (const id in bund.b) { const a = bund.b[id]; if (a.mit.length >= BUND.MAX || (a.anfragen || []).some(q => q.w === bot.id)) continue;
            const m = bundMitte(a); if (!m) continue; const d = Math.hypot(c.x - m.x, c.y - m.y); if (d > FRAME_HALF * .6) continue;
            const stil = a.mit.filter(w => botById[w] && botById[w].style === bot.style).length / a.mit.length;
            const s = d / FRAME_HALF - stil * .15 - Math.min(.2, bundMacht(a) / Math.max(1, staerke(bot.id)) * .01) + a.mit.length * .01;
            if (!best || s < best.s) best = { s, a }; }
        if (best) { bundOp(bot.id, { op: 'beitreten', aid: best.a.id }); bundBotGetippt(bot, now); }
    }
    // d) Was echte Spieler als Anführer auch können – Mitspieler als Anführer tun es selten und nachvollziehbar (gleiche Befehle):
    //    Mitglieder entfernen, die seit einem Tag keine Basis mehr haben · das Amt dem viel stärkeren Mitspieler übergeben ·
    //    fast voll → nur noch auf Anfrage, wieder Platz → offen
    for (const id in bund.b) {
        const a = bund.b[id]; if (!a) continue;
        const leer = a.leer || (a.leer = {});
        for (const w of a.mit) { if (botOwnedIslands[w] && botOwnedIslands[w].size) delete leer[w]; else if (!leer[w]) leer[w] = now; }
        const chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now)) continue;
        const weg = a.mit.find(w => w !== a.anf && leer[w] && now - leer[w] > 24 * 3600000);
        if (weg && Math.random() < .5) { bundOp(a.anf, { op: 'rauswerfen', w: weg }); continue; }
        const st = a.mit.filter(w => w !== a.anf && botById[w] && !botById[w].mensch && botOwnedIslands[w] && botOwnedIslands[w].size).sort((x, y) => staerke(y) - staerke(x))[0];
        if (st && staerke(a.anf) * 3 < staerke(st) && Math.random() < .05) { bundOp(a.anf, { op: 'anfuehrer', w: st }); continue; }
        if (a.offen && a.mit.length >= BUND.MAX - 4 && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: false });
        else if (!a.offen && a.mit.length <= BUND.MAX / 2 && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: true });
    }
    // e) wechseln (wie ein Spieler: austreten, dann beitreten): ein Mitspieler, dessen Hauptstadt inzwischen weit weg vom Bündnis liegt
    //    (umgezogen, Gebiet verloren), geht zu einem offenen Bündnis mit Platz in seiner Nähe – frühestens 12 Std. nach dem Beitritt,
    //    nie der Anführer
    for (const bot of bots.filter(b => bundVon(b.id) && bundBotBereit(b, now) && Math.random() < .05).slice(0, 3)) {
        const a = bundVon(bot.id); if (!a || a.anf === bot.id || now - ((a.dabei && a.dabei[bot.id]) || 0) < 12 * 3600000) continue;
        const c = islandById[botCapitalOf(bot.id)], m = bundMitte(a); if (!c || !m || Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .8) continue;
        let best = null;
        for (const x in bund.b) { const z = bund.b[x]; if (z === a || !z.offen || z.mit.length >= BUND.MAX) continue; const mz = bundMitte(z); if (!mz) continue;
            const d = Math.hypot(c.x - mz.x, c.y - mz.y); if (d < FRAME_HALF * .5 && (!best || d < best.d)) best = { z, d }; }
        if (best && !bundOp(bot.id, { op: 'verlassen' })) { bundOp(bot.id, { op: 'beitreten', aid: best.z.id }); bundBotGetippt(bot, now); }
    }
}
// Signale der Mitspieler: angegriffen und allein zu schwach → „Hilfe!“
function bundMitspielerSignale(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const w of a.mit) {
            const bot = botById[w]; if (!bot || bot.mensch || !botOnline(bot, now) || now - (bundMem.hilfeSig[w] || 0) < 4 * 60000) continue;   // höchstens alle 4 Min. ein Hilferuf
            for (const t of botThreatened(w)) {
                const k = w + ':' + t, last = bundMem.hilfeSig[k] || ((a.sig || []).find(s => s.w === w && s.z === t && s.art === 'hilfe') || {}).at; if (last && now - last < 5 * 60000) continue;
                const g = bundUnterAngriff(t); if (!g || g.at - now < 8000) continue;
                const isl = islandById[t], def = effectiveTroops(isl) + effectiveDefense(isl);
                if (def >= g.str * 1.1 || isCapital(t)) continue;
                if ((islandLevels[t] || 1) < 5 && (islandTroops[t] || 0) < whoTroops(w) * .05 && isl.type === 'tower') continue;   // nur für Basen, um die es sich lohnt
                if (!bundSignal(a, w, 'hilfe', t)) { bundMem.hilfeSig[k] = bundMem.hilfeSig[w] = now; bundSpeichern(); }
                break;
            }
        }
    }
    for (const k in bundMem.hilfeSig) if (now - bundMem.hilfeSig[k] > 10 * 60000) delete bundMem.hilfeSig[k];
}
// Antworten mit Taten: Hilfe schicken, mit angreifen, zur Rally kommen
function bundMitspielerAntworten(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const s of a.sig || []) {
            if (now - s.at > 3 * 60000) continue;
            if (s.art === 'hilfe' || s.art === 'verteidigen') {
                const g = bundUnterAngriff(s.z); if (!g) continue;
                const isl = islandById[s.z], kommt = pendingSends.filter(x => x.toId === s.z && !x.back && x.resolveAt < g.at).reduce((n, x) => n + x.troops, 0);
                let fehlt = g.str * 1.2 - (effectiveTroops(isl) + effectiveDefense(isl) + kommt); if (fehlt <= 0) continue;
                for (const w of a.mit) {
                    const bot = botById[w], key = s.id + ':' + w; if (fehlt <= 0) break;
                    if (!bot || bot.mensch || w === islandOwnerOf(s.z) || bundMem.sigGemacht.has(key) || !bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) continue;
                    bundMem.sigGemacht.add(key);
                    const thr = botThreatened(w); let best = null;
                    for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId) continue; const n = Math.floor((islandTroops[sid] || 0) * .5); if (n < 1000) continue;
                        const src = islandById[sid]; if (!bundWeg(src.landmassId, isl.landmassId, w, n)) continue;
                        const eta = travelDurationSeconds(src, isl, w) * 1000; if (now + eta > g.at - 1500) continue;
                        if (!best || n > best.n) best = { id: sid, n }; }
                    if (!best) continue;
                    const give = Math.min(best.n, Math.ceil(fehlt));
                    if (!bundHilfe(w, best.id, s.z, give)) { fehlt -= give; bundBotGetippt(bot, now); }
                }
            } else if (s.art === 'angriff') {
                for (const w of a.mit) { const bot = botById[w]; if (!bot || bot.mensch || w === s.w || bundMem.sigGemacht.has(s.id + ':' + w)) continue;
                    bundMem.sigGemacht.add(s.id + ':' + w);
                    if (bot.style === 'builder' && Math.random() < .6) continue;                      // nicht jeder zieht mit
                    bundMem.ziel[w] = { t: s.z, until: now + 10 * 60000 }; }
            }
        }
    }
    if (bundMem.sigGemacht.size > 5000) bundMem.sigGemacht.clear();
}
function bundMitspielerRally(now) {
    // a) mitmachen: wer rechtzeitig ankommt, schickt einen guten Teil einer großen Basis
    for (const r of bund.r) {
        const a = bund.b[r.aid]; if (!a || now > r.los - 4000) continue;
        const at = islandById[r.at];
        for (const w of a.mit) {
            const bot = botById[w], key = r.id + ':' + w; if (!bot || bot.mensch || w === r.by || bundMem.rallyGemacht.has(key) || r.j.some(j => j.w === w) || !bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) continue;
            const zielOw = islandOwnerOf(r.t); if (zielOw && (bundVerbuendet(w, zielOw) || zielOw === w)) continue;
            const thr = botThreatened(w); let best = null;
            for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId || sid === r.at) continue; const n = Math.floor((islandTroops[sid] || 0) * (botStyle(bot).commit || .7) * .8); if (n < 1000) continue;
                const src = islandById[sid]; if (!bundWeg(src.landmassId, at.landmassId, w, n)) continue;
                if (now + travelDurationSeconds(src, at, w) * 1000 > r.los - 2000) continue;
                if (!best || n > best.n) best = { id: sid, n }; }
            bundMem.rallyGemacht.add(key);
            if (!best || (bot.style === 'builder' && Math.random() < .5)) continue;
            if (!bundRallyDazu(a, w, { rid: r.id, von: best.id, n: best.n })) { bundBotGetippt(bot, now); bundSpeichern(); }
        }
    }
    if (bundMem.rallyGemacht.size > 5000) bundMem.rallyGemacht.clear();
    // b) starten: ein großes Ziel in Reichweite, das einer allein nicht schafft, das Bündnis zusammen aber schon
    for (const id in bund.b) {
        const a = bund.b[id]; if (a.mit.length < 2 || now < (bundMem.rallyRunde[id] || 0)) continue;
        bundMem.rallyRunde[id] = now + 45000 + Math.random() * 45000;
        if (bund.r.filter(r => r.aid === id).length >= 2) continue;
        const starter = a.mit.map(w => botById[w]).filter(b => b && !b.mensch && !bund.r.some(r => r.by === b.id) && bundBotBereit(b, now) && b.style !== 'builder')
            .sort((x, y) => staerke(y.id) - staerke(x.id))[0];
        if (!starter) continue;
        const plan = bundRallyPlan(a, starter, now); if (!plan) continue;
        if (!bundRallyStart(a, starter.id, plan)) { bundSignal(a, starter.id, 'angriff', plan.ziel); bundBotGetippt(starter, now); bundSpeichern(); }
    }
}
function bundRallyPlan(a, bot, now) {                            // → { basis, ziel, min, n } oder null
    const own = [...botOwnedIslands[bot.id]], thr = botThreatened(bot.id);
    const quellen = own.filter(id => !thr.has(id) && id !== megaTempleId && (islandTroops[id] || 0) > 5000).sort((x, y) => (islandTroops[y] || 0) - (islandTroops[x] || 0)).slice(0, 3);
    if (!quellen.length) return null;
    const kennt = botKennt(bot.id), atk = botAtkFactor(bot, true);
    // was das Bündnis in ~3 Minuten zum Sammelpunkt bringen kann (grob: die halbe Besatzung der großen Basen in der Nähe)
    const kraft = at => { let s = (islandTroops[at] || 0) * .9; const A = islandById[at];
        for (const w of a.mit) { if (w === bot.id) continue; const top = [...bundBasen(w)].sort((x, y) => (islandTroops[y] || 0) - (islandTroops[x] || 0)).slice(0, 4);
            for (const id of top) { const I = islandById[id]; if ((I.landmassId === A.landmassId || landmassesConnected(I.landmassId, A.landmassId)) && travelDurationSeconds(I, A, w === 'player' ? undefined : w) < 150) s += (islandTroops[id] || 0) * .4; } }
        return s; };
    let best = null, gespaeht = false;
    for (const at of quellen) {
        const A = islandById[at], k = kraft(at), allein = (islandTroops[at] || 0) * .95 * atk;
        for (const lm of reachableLandmassIds[A.landmassId] || []) {
            if (!kennt.has(lm) || !landmassesConnected(A.landmassId, lm)) continue;
            for (const t of islandsByLandmass[lm] || []) {
                const ow = islandOwnerOf(t.id); if (!ow || bundZielOk(bot.id, t.id)) continue;
                const it = botIntel(bot, t.id);
                if (!it) { if (!gespaeht && !botScouting(bot, t.id) && (t.type !== 'tower' || (islandLevels[t.id] || 1) >= 5) && Math.random() < .2) { gespaeht = true; botLearn(bot.id, t.id, now + scoutSecs(A, t, bot.id) * 1000, A.landmassId); } continue; }   // erst spähen (einer pro Runde)
                const s = it.s; if (s < allein * .9 || s > k * atk * .85) continue;                // allein zu schwer, gemeinsam machbar
                const reiz = (t.id === megaTempleId ? .2 : t.type === 'temple' ? .5 : 1) * (botById[ow] && botById[ow].mensch ? .7 : 1) * (1 + landmasses[t.landmassId].ring * .15) * Math.hypot(t.x - A.x, t.y - A.y);
                if (!best || reiz < best.reiz) best = { reiz, at, ziel: t.id };
            }
        }
    }
    if (!best) return null;
    return { basis: best.at, ziel: best.ziel, min: Math.random() < .5 ? 3 : 5, n: Math.floor((islandTroops[best.at] || 0) * .9) };
}
// (Weltrechner) jede Sekunde: Rallys losschicken, alte Signale weg, die Mitspieler handeln lassen
function bundTakt() {
    if (!window.WELT || !WELT.leiter) return;
    const now = Date.now(); let geaendert = false;
    for (const r of bund.r.slice()) if (now >= r.los) bundRallyLos(r);
    for (const id in bund.b) { const a = bund.b[id], vor = (a.sig || []).length; a.sig = (a.sig || []).filter(s => now - s.at < 30 * 60000); if (a.sig.length !== vor) geaendert = true;
        const q = (a.anfragen || []).length; a.anfragen = (a.anfragen || []).filter(x => now - x.at < 24 * 3600000 && !bundVon(x.w)); if (a.anfragen.length !== q) geaendert = true;
        if (!a.mit.length) { delete bund.b[id]; geaendert = true; } else if (!a.mit.includes(a.anf)) { a.anf = a.mit[0]; geaendert = true; } }
    if (geaendert) bundSpeichern();
    try {
        bundWegMem.clear();
        if (now - bundMem.sigSeh > 2500) { bundMem.sigSeh = now; bundMitspielerSignale(now); bundMitspielerAntworten(now); }
        if (now - bundMem.rallySeh > 4000) { bundMem.rallySeh = now; bundMitspielerRally(now); }
        if (now - bundMem.runde > 15000) { bundMem.runde = now; bundMitspielerRunde(now); }
    } catch (e) { if (!bundTakt.gewarnt) { bundTakt.gewarnt = true; console.warn('Bündnisse:', e); } }
}
setInterval(bundTakt, 1000);

// ==============================================================================================================
// 6) FENSTER „Bündnis“ (Zuschauer)
// ==============================================================================================================
const bundPopup = document.getElementById('bundPopup'), bundBody = document.getElementById('bundLive'), bundOben = document.getElementById('bundOben');
let bundTab = 'info', bundWahl = null, bundSicher = {};        // bundWahl: offene Auswahl (Rally starten / mitmachen / Hilfe senden)
function bundBefehl(op, d, hint) {
    if (!window.WELT || SYSTEM) return false;
    WELT.befehl('bund', Object.assign({ op }, d || {})); if (hint) flashHint(hint, 2500); return true;
}
function bundIch() { return bundVon('player'); }
function bundZeichenHtml(a, gross) { return '<span class="bd-wappen' + (gross ? ' bd-wappen--gross' : '') + '" style="--bf:' + BUND.FARBEN[a.farbe] + '">' + icon(BUND.ZEICHEN[a.zeichen] || 'flag') + '</span>'; }
function bundOeffnen(tab) { if (tab) bundTab = tab; openPanel(bundPopup); bundRender(true); }
function bundSchliessen() { closePanel(bundPopup); bundWahl = null; }
function bundSicherKnopf(key, text, sicherText) { return bundSicher[key] && Date.now() < bundSicher[key] ? sicherText : text; }
function bundRender(neu) {
    if (!bundPopup || !isPanelOpen(bundPopup)) return;
    const a = bundIch();
    for (const t of bundPopup.querySelectorAll('[data-btab]')) t.classList.toggle('active', t.dataset.btab === bundTab);
    setText(document.getElementById('bundTitle'), a ? '[' + a.tag + '] ' + a.name : 'Bündnis');
    liveHtml(document.getElementById('bundSub'), a ? a.mit.length + ' / ' + BUND.MAX + ' Mitglieder · ' + (a.anf === 'player' ? 'du führst' : 'Anführer ' + escapeHtml(bundName(a.anf))) : 'Gemeinsam stärker');
    const em = document.getElementById('bundEmblem'); if (em) { em.style.setProperty('--bf', a ? BUND.FARBEN[a.farbe] : ''); em.classList.toggle('bd-em', !!a); const u = em.querySelector('use'); if (u) u.setAttribute('href', '#i-' + (a ? BUND.ZEICHEN[a.zeichen] || 'bund' : 'bund')); }
    if (neu || bundOben.dataset.fuer !== bundObenSchluessel()) bundObenZeichnen();
    liveHtml(bundBody, bundTab === 'info' ? (a ? bundInfoHtml(a) : bundOhneHtml()) : bundTab === 'sig' ? (a ? bundSigHtml(a) : bundOhneHtml())
        : bundTab === 'rally' ? (a ? bundRallyHtml(a) : bundOhneHtml()) : bundSuchenHtml(a));
}
function bundOhneHtml() { return '<div class="notice">' + icon('info') + '<span>Du bist in keinem Bündnis. Unter „Suchen“ kannst du einem beitreten oder selbst eines gründen.</span><button type="button" class="btn btn--secondary btn--sm" data-bact="tab" data-t="suchen">Suchen</button></div>'; }
function bundInfoHtml(a) {
    const chef = a.anf === 'player', bon = bundBonus(a), heute = a.gesch && a.gesch.tag === bundTagHeute() ? (a.gesch.n || {}).player || 0 : 0, now = Date.now();
    const mit = a.mit.slice().sort((x, y) => (y === a.anf) - (x === a.anf) || staerke(y) - staerke(x));
    return '<div class="bd-kopf">' + bundZeichenHtml(a, true) + '<div><b>[' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) + '</b><small>Macht ' + fmtCompact(bundMacht(a)) + ' · ' + (a.offen ? 'offen für alle' : 'nur auf Anfrage') + '</small></div></div>' +
        '<div class="stat-grid">' + statTile('Tempel-Bonus', 'temple', '+' + bon.pct + ' %', bon.pct ? 'is-good' : '') + statTile('Gebiet', 'send', '+10 % Tempo') + '</div>' +
        '<div class="notice">' + icon('temple') + '<span>' + (bon.n.t || bon.n.m ? 'Dein Bündnis hält ' + (bon.n.t ? bon.n.t + ' Tempel' : '') + (bon.n.t && bon.n.m ? ' und ' : '') + (bon.n.m ? 'den Mega-Tempel' : '') + ': alle Mitglieder produzieren +' + bon.pct + ' % Münzen und Truppen.'
            : 'Hält ein Mitglied einen Tempel, produzieren alle Mitglieder mehr: +' + BUND.TEMPEL_PCT + ' % je Tempel, Mega-Tempel +' + BUND.MEGA_PCT + ' % (höchstens +' + BUND.BONUS_MAX + ' %).') + ' Im eigenen Gebiet marschiert ihr 10 % schneller.</span></div>' +
        '<div class="notice">' + icon('shop') + '<span>Bündnis-Geschenke heute: ' + heute + ' / ' + BUND.GESCHENKE_TAG + ' – wenn ein Mitglied einen Boss besiegt oder eine große Kiste kauft.</span></div>' +
        (chef && (a.anfragen || []).length ? '<div class="sect"><h4>Anfragen</h4></div><div class="bd-liste">' + a.anfragen.map(q => '<div class="bd-zeile"><span class="bd-name">' + whoLink(q.w, bundName(q.w)) + '<small>Macht ' + fmtCompact(staerke(q.w)) + ' · ' + bundBasenText(q.w) + '</small></span>' +
            '<button type="button" class="btn btn--primary btn--sm" data-bact="anfrage" data-w="' + q.w + '" data-ja="1">Ja</button><button type="button" class="btn btn--secondary btn--sm" data-bact="anfrage" data-w="' + q.w + '">Nein</button></div>').join('') + '</div>' : '') +
        '<div class="sect"><h4>Mitglieder</h4><span class="sect-aside">' + a.mit.length + ' / ' + BUND.MAX + '</span></div><div class="bd-liste">' + mit.map(w => {
            const on = w === 'player' || (botById[w] && botOnline(botById[w], now));
            return '<div class="bd-zeile' + (w === 'player' ? ' is-me' : '') + '"><i class="bd-dot' + (on ? ' on' : '') + '"></i><span class="bd-name">' + (w === 'player' ? '<b>' + escapeHtml(bundName(w)) + '</b>' : whoLink(w, bundName(w))) +
                '<small>' + (w === a.anf ? '<em>Anführer</em> · ' : '') + 'Macht ' + fmtCompact(staerke(w)) + ' · ' + bundBasenText(w) + '</small></span>' +
                (chef && w !== 'player' ? '<button type="button" class="btn btn--secondary btn--sm" data-bact="anfuehrer" data-w="' + w + '">' + bundSicherKnopf('chef:' + w, 'Anführer', 'Sicher?') + '</button><button type="button" class="btn btn--ghost btn--sm" data-bact="raus" data-w="' + w + '">' + bundSicherKnopf('raus:' + w, 'Entfernen', 'Sicher?') + '</button>' : '') + '</div>'; }).join('') + '</div>' +
        ((a.log || []).length ? '<div class="sect"><h4>Neuigkeiten</h4></div><div class="bd-log">' + a.log.slice(0, 6).map(l => '<div><span>' + escapeHtml(l.t) + '</span><small>vor ' + uhrHtml(l.at, 'vor') + '</small></div>').join('') + '</div>' : '') +
        '<div class="bd-knoepfe">' + (chef ? '<button type="button" class="btn btn--secondary btn--sm" data-bact="offen">' + (a.offen ? 'Nur auf Anfrage' : 'Für alle öffnen') + '</button>' : '') +
        '<button type="button" class="btn btn--ghost btn--sm" data-bact="verlassen">' + bundSicherKnopf('verlassen', 'Bündnis verlassen', 'Wirklich verlassen?') + '</button></div>';
}
function bundSigText(s) { const S = BUND_SIGNALE[s.art]; return S ? S.text(s.z !== null && islandById[s.z] ? islandTitle(islandById[s.z]) : '') : ''; }
function bundSigHtml(a) {
    const now = Date.now(), liste = (a.sig || []).filter(s => now - s.at < 30 * 60000);
    return '<div class="notice">' + icon('info') + '<span>Signale statt Chat: tippe eine Basis auf der Karte an → „Hilfe!“, „Angriff!“, „Sammeln“ oder „Verteidigt“. Mitspieler im Bündnis antworten mit Taten.</span></div>' +
        '<div class="bd-knoepfe"><button type="button" class="btn btn--primary btn--sm" data-bact="signal" data-art="danke">' + icon('star') + '<span>Danke!</span></button></div>' +
        '<div class="bd-liste">' + (liste.length ? liste.map(s => { const S = BUND_SIGNALE[s.art], mir = s.w === 'player', zl = s.z !== null && islandById[s.z];
            const helfen = zl && (s.art === 'hilfe' || s.art === 'verteidigen') && islandOwnerOf(s.z) !== 'player' && bundUnterAngriff(s.z);
            return '<div class="bd-zeile bd-sig' + (now - s.at < BUND.SIG_MS ? ' is-neu' : '') + '" style="--sf:' + S.farbe + '"><span class="bd-sic">' + icon(S.ic) + '</span><span class="bd-name"><b>' + escapeHtml(bundSigText(s)) + '</b><small>' + (mir ? 'Du' : escapeHtml(bundName(s.w))) + ' · vor ' + uhrHtml(s.at, 'vor') + '</small></span>' +
                (zl ? '<button type="button" class="btn btn--secondary btn--sm" data-bact="zeigen" data-z="' + s.z + '">Zeigen</button>' : '') +
                (helfen ? '<button type="button" class="btn btn--primary btn--sm" data-bact="hilfeWahl" data-z="' + s.z + '">Helfen</button>' : '') + '</div>'; }).join('')
            : '<div class="inbox-empty">Noch keine Signale.</div>') + '</div>';
}
function bundRallyZeile(r, meins) {
    const now = Date.now(), ziel = islandById[r.t], mein = r.j.filter(j => j.w === 'player').reduce((s, j) => s + j.n, 0) + (r.by === 'player' ? r.n0 : 0);
    return '<div class="bd-zeile bd-rally' + (meins ? '' : ' is-feind') + '"><span class="bd-sic">' + icon(meins ? 'flag' : 'attack') + '</span><span class="bd-name"><b>' + (meins ? 'Rally auf ' : 'Gefahr: Rally auf ') + escapeHtml(islandTitle(ziel)) + '</b>' +
        '<small>' + escapeHtml(bundName(r.by)) + ' · los in ' + uhrHtml(r.los, 'clock') + (meins ? ' · ' + fmtCompact(bundRallyTruppen(r)) + ' bereit' + (bundRallyUnterwegs(r) ? ' + ' + fmtCompact(bundRallyUnterwegs(r)) + ' unterwegs' : '') + ' · ' + (new Set([r.by].concat(r.j.map(j => j.w))).size) + ' dabei' + (mein ? ' · du: ' + fmtCompact(mein) : '') : '') + '</small></span>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-bact="zeigen" data-z="' + r.at + '">Zeigen</button>' +
        (meins && now < r.los - 2000 ? '<button type="button" class="btn btn--primary btn--sm" data-bact="dazuWahl" data-rid="' + r.id + '">Mitmachen</button>' : '') +
        (meins && (r.by === 'player' || bundIch().anf === 'player') ? '<button type="button" class="btn btn--ghost btn--sm" data-bact="abbruch" data-rid="' + r.id + '">' + bundSicherKnopf('abbruch:' + r.id, 'Abbrechen', 'Sicher?') + '</button>' : '') + '</div>';
}
function bundRallyHtml(a) {
    const meine = bund.r.filter(r => r.aid === a.id), gegen = bund.r.filter(r => r.aid !== a.id && bundVerbuendet('player', islandOwnerOf(r.t)) || r.aid !== a.id && islandOwnerOf(r.t) === 'player');
    return '<div class="notice">' + icon('info') + '<span>Rally: ein Mitglied sammelt Truppen an seiner Basis, die anderen schicken ihre dazu. Nach Ablauf (1, 3 oder 5 Min.) marschiert alles als EIN Angriff los. Beute und Überlebende gehen anteilig zurück. Starten: feindliches Ziel antippen → „Rally“.</span></div>' +
        '<div class="bd-liste">' + (meine.length ? meine.map(r => bundRallyZeile(r, true)).join('') : '<div class="inbox-empty">Gerade läuft keine Rally.</div>') + '</div>' +
        (gegen.length ? '<div class="sect"><h4>Gegen euch</h4></div><div class="bd-liste">' + gegen.map(r => bundRallyZeile(r, false)).join('') + '</div>' : '');
}
function bundSuchenHtml(a) {
    const alle = Object.values(bund.b).map(x => ({ x, m: bundMacht(x) })).sort((p, q) => q.m - p.m), angefragt = id => (bund.b[id].anfragen || []).some(q => q.w === 'player');
    return (a ? '<div class="notice">' + icon('info') + '<span>Du bist in [' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) + '. Um zu wechseln, verlasse erst dein Bündnis.</span></div>' : '') +
        '<div class="sect"><h4>Alle Bündnisse</h4><span class="sect-aside">' + alle.length + '</span></div><div class="bd-liste">' + (alle.length ? alle.map(({ x, m }) =>
            '<div class="bd-zeile">' + bundZeichenHtml(x) + '<span class="bd-name"><b>[' + escapeHtml(x.tag) + '] ' + escapeHtml(x.name) + '</b><small>' + x.mit.length + ' / ' + BUND.MAX + ' · Macht ' + fmtCompact(m) + ' · ' + (x.offen ? 'offen' : 'auf Anfrage') + ' · Anführer ' + escapeHtml(bundName(x.anf)) + '</small></span>' +
            (a ? '' : x.mit.length >= BUND.MAX ? '<span class="chip">voll</span>' : angefragt(x.id) ? '<button type="button" class="btn btn--ghost btn--sm" data-bact="anfrageWeg">Angefragt ✕</button>'
                : '<button type="button" class="btn btn--primary btn--sm" data-bact="beitreten" data-aid="' + x.id + '">' + (x.offen ? 'Beitreten' : 'Anfragen') + '</button>') + '</div>').join('')
            : '<div class="inbox-empty">Noch gibt es keine Bündnisse.</div>') + '</div>';
}
// oben im Fenster: was sich nicht jede Sekunde ändern darf (Eingaben, Auswahl)
function bundObenSchluessel() { const a = bundIch(); return bundTab + '|' + (a ? a.id : '-') + '|' + (bundWahl ? JSON.stringify(bundWahl) : ''); }
function bundObenZeichnen() {
    bundOben.dataset.fuer = bundObenSchluessel();
    const a = bundIch();
    if (bundWahl) { bundOben.innerHTML = bundWahlHtml(); bundWahlRechnen(); return; }
    if (bundTab === 'suchen' && !a) {
        bundOben.innerHTML = '<div class="bd-form"><div class="sect"><h4>Bündnis gründen</h4><span class="sect-aside">' + icon('coin', 'icon--coin') + fmtNum(BUND.KOSTEN) + '</span></div>' +
            '<input id="bdName" maxlength="20" placeholder="Name (3–20 Buchstaben)" autocomplete="off"><input id="bdTag" maxlength="4" placeholder="Kürzel (2–4)" autocomplete="off" class="bd-tag">' +
            '<div class="bd-farben" id="bdFarben">' + BUND.FARBEN.map((f, i) => '<button type="button" data-farbe="' + i + '" style="--bf:' + f + '"' + (i === 0 ? ' class="on"' : '') + ' aria-label="Farbe ' + (i + 1) + '"></button>').join('') + '</div>' +
            '<div class="bd-zeichen" id="bdZeichen">' + BUND.ZEICHEN.map((z, i) => '<button type="button" data-zeichen="' + i + '"' + (i === 0 ? ' class="on"' : '') + '>' + icon(z) + '</button>').join('') + '</div>' +
            '<label class="set-zeile"><span>Offen für alle<small>sonst nur auf Anfrage</small></span><input type="checkbox" id="bdOffen" checked></label>' +
            '<button type="button" class="btn btn--primary" data-bact="gruenden">' + icon('flag') + '<span>Gründen</span></button><p class="bd-fehler" id="bdFehler"></p></div>';
        return;
    }
    bundOben.innerHTML = '';
}
// Auswahl: Rally starten (Ziel t) · bei einer Rally mitmachen (rid) · Hilfe senden (nach)
function bundQuellen(ziel, frist) {                              // eigene Basen, die ziel erreichen (frist: rechtzeitig bis dahin)
    const out = [], now = Date.now();
    for (const id of ownedIslands) { if (id === ziel.id) continue; const n = islandTroops[id] || 0; if (n < 1) continue; const s = islandById[id];
        if (!routeFor(s.landmassId, ziel.landmassId, 'player')) continue;
        const eta = travelDurationSeconds(s, ziel) * 1000; if (frist && now + eta > frist - 1000) continue;
        out.push({ id, n, eta }); }
    return out.sort((x, y) => y.n - x.n).slice(0, 40);
}
function bundWahlHtml() {
    const w = bundWahl, ziel = islandById[w.mode === 'rally' ? w.t : w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach];
    if (!ziel) { bundWahl = null; return ''; }
    const r = w.mode === 'dazu' ? bund.r.find(x => x.id === w.rid) : null;
    const q = w.mode === 'rally' ? [...ownedIslands].filter(id => (islandTroops[id] || 0) >= 1 && id !== ziel.id && routeFor(islandById[id].landmassId, ziel.landmassId, 'player')).map(id => ({ id, n: islandTroops[id] || 0, eta: travelDurationSeconds(islandById[id], ziel) * 1000 })).sort((x, y) => y.n - x.n).slice(0, 40)
        : bundQuellen(ziel, r ? r.los : (bundUnterAngriff(ziel.id) || {}).at);
    if (w.von === undefined || !q.some(x => x.id === w.von)) w.von = q.length ? q[0].id : null;
    const titel = w.mode === 'rally' ? 'Rally auf ' + islandTitle(ziel) : w.mode === 'dazu' ? 'Mitmachen: Rally auf ' + islandTitle(islandById[r.t]) : 'Hilfe für ' + islandTitle(ziel);
    return '<div class="bd-form bd-wahl"><div class="sect"><h4>' + escapeHtml(titel) + '</h4></div>' +
        (q.length ? '<label class="bd-feld"><span>' + (w.mode === 'rally' ? 'Sammelpunkt (deine Basis)' : 'Von Basis') + '</span><select id="bdVon">' + q.map(x => '<option value="' + x.id + '"' + (x.id === w.von ? ' selected' : '') + '>' + escapeHtml(islandTitle(islandById[x.id])) + ' · ' + fmtCompact(x.n) + ' · ' + fmtClock(x.eta / 1000) + '</option>').join('') + '</select></label>' +
            (w.mode === 'rally' ? '<div class="bd-feld"><span>Wartezeit</span><div class="seg" id="bdMin" style="grid-template-columns:repeat(3,1fr)">' + BUND.RALLY_MIN.map(m => '<button type="button" data-min="' + m + '" class="' + ((w.min || 3) === m ? 'on' : '') + '">' + m + ' Min.</button>').join('') + '</div></div>' : '') +
            '<div class="bd-feld"><span>Truppen</span><div class="seg" id="bdAnteil">' + [.25, .5, .75, 1].map(f => '<button type="button" data-f="' + f + '" class="' + ((w.f || 1) === f ? 'on' : '') + '">' + (f === 1 ? 'Alle' : f * 100 + ' %') + '</button>').join('') + '</div></div>' +
            '<p class="bd-info" id="bdInfo"></p><div class="bd-knoepfe"><button type="button" class="btn btn--secondary btn--sm" data-bact="wahlZu">Abbrechen</button><button type="button" class="btn btn--primary btn--sm" data-bact="wahlLos">' +
            (w.mode === 'rally' ? 'Rally starten' : w.mode === 'dazu' ? 'Truppen schicken' : 'Hilfe senden') + '</button></div>'
            : '<div class="notice notice--warn">' + icon('info') + '<span>' + (w.mode === 'rally' ? 'Keine deiner Basen hat Truppen und einen Weg zum Ziel.' : 'Keine deiner Basen schafft es rechtzeitig dorthin.') + '</span></div><div class="bd-knoepfe"><button type="button" class="btn btn--secondary btn--sm" data-bact="wahlZu">Schließen</button></div>') + '</div>';
}
function bundWahlRechnen() {
    const w = bundWahl, info = document.getElementById('bdInfo'); if (!w || !info || w.von === null) return;
    const n = Math.floor((islandTroops[w.von] || 0) * (w.f || 1)), von = islandById[w.von];
    const ziel = islandById[w.mode === 'rally' ? w.t : w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach]; if (!ziel || !von) return;
    info.textContent = fmtNum(n) + ' Truppen · ' + (w.mode === 'rally' ? 'Angriff nach ' + (w.min || 3) + ' Min. · Marsch dann ca. ' + fmtClock(travelDurationSeconds(von, ziel)) : 'Ankunft in ca. ' + fmtClock(travelDurationSeconds(von, ziel)));
}
function bundWahlLos() {
    const w = bundWahl; if (!w || w.von === null || w.von === undefined) return;
    const von = islandById[w.von], n = Math.floor((islandTroops[w.von] || 0) * (w.f || 1)); if (!von || n < 1) { flashHint('Dort sind keine Truppen.', 2500); return; }
    if (w.mode === 'rally') {
        const why = bundZielOk('player', w.t); if (why) { flashHint(why + '.', 3000); return; }
        bundBefehl('rally', { basis: w.von, ziel: w.t, min: w.min || 3, n }, 'Rally gestartet – dein Bündnis kann jetzt mitmachen.');
        islandTroops[w.von] = Math.max(0, (islandTroops[w.von] || 0) - n);
    } else {
        const nach = w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach; if (nach === undefined) return;
        const vh = lastHop(von.landmassId, islandById[nach].landmassId, 'player'); if (!mautVorab(vh[0], vh[1], n)) return;
        bundBefehl(w.mode === 'dazu' ? 'rallyDazu' : 'hilfe', w.mode === 'dazu' ? { rid: w.rid, von: w.von, n } : { von: w.von, nach, n }, w.mode === 'dazu' ? 'Truppen unterwegs zur Rally.' : 'Hilfe unterwegs.');
        islandTroops[w.von] = Math.max(0, (islandTroops[w.von] || 0) - n);
        const t0 = Date.now(); vorlaeufigDazu('s', { fromId: w.von, toId: nach, troops: n, startedAt: t0, resolveAt: t0 + travelDurationSeconds(von, islandById[nach]) * 1000, senderBotId: null });
        sfx('send');
    }
    bundWahl = null; updateHud(); bundRender(true);
}
function bundSignalSenden(art, z) {
    const a = bundIch(); if (!a) { flashHint('Du bist in keinem Bündnis.', 2500); return; }
    const mein = (a.sig || []).find(s => s.w === 'player'); if (mein && Date.now() - mein.at < BUND.SIG_PAUSE) { flashHint('Warte kurz – höchstens ein Signal alle 30 Sekunden.', 2500); return; }
    if (Date.now() - (bundSignalSenden.zuletzt || 0) < BUND.SIG_PAUSE) { flashHint('Warte kurz – höchstens ein Signal alle 30 Sekunden.', 2500); return; }
    bundSignalSenden.zuletzt = Date.now();
    bundBefehl('signal', { s: art, z: z === undefined ? null : z }, 'Signal gesendet: ' + BUND_SIGNALE[art].text(z !== undefined && z !== null ? islandTitle(islandById[z]) : ''));
    sfx('send');
}
if (bundPopup) {
    document.getElementById('bundBtn').addEventListener('click', e => { e.stopPropagation(); if (isPanelOpen(bundPopup)) return bundSchliessen();   // Dock-Knopf „Bündnis“
        closeAllPopups(); bundOeffnen(bundIch() ? bundTab === 'suchen' ? 'info' : bundTab : 'suchen'); bundGesehen(); });
    document.getElementById('bundCloseBtn').addEventListener('click', bundSchliessen);
    bundPopup.addEventListener('click', e => {
        const tab = e.target.closest('[data-btab]'); if (tab) { bundTab = tab.dataset.btab; bundWahl = null; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; if (bundTab === 'sig') bundGesehen(); return; }
        const fb = e.target.closest('[data-farbe]'), zb = e.target.closest('[data-zeichen]');
        if (fb || zb) { const box = (fb || zb).parentElement; for (const x of box.children) x.classList.toggle('on', x === (fb || zb)); return; }
        const mb = e.target.closest('[data-min]'), fr = e.target.closest('#bdAnteil [data-f]');
        if (mb && bundWahl) { bundWahl.min = +mb.dataset.min; bundRender(true); return; }
        if (fr && bundWahl) { bundWahl.f = +fr.dataset.f; bundRender(true); return; }
        const b = e.target.closest('[data-bact]'); if (!b) return;
        const act = b.dataset.bact, w = b.dataset.w ? neutralId(b.dataset.w) : null, now = Date.now();
        const sicher = key => { if (bundSicher[key] && now < bundSicher[key]) { delete bundSicher[key]; return true; } bundSicher[key] = now + 3000; bundRender(); setTimeout(bundRender, 3100); return false; };
        if (act === 'tab') { bundTab = b.dataset.t; bundRender(true); }
        else if (act === 'gruenden') {
            const name = document.getElementById('bdName').value.trim(), tag = document.getElementById('bdTag').value.trim().toUpperCase(), fehler = document.getElementById('bdFehler');
            const farbe = +((bundOben.querySelector('#bdFarben .on') || {}).dataset || {}).farbe || 0, zeichen = +((bundOben.querySelector('#bdZeichen .on') || {}).dataset || {}).zeichen || 0;
            const grund = !BUND_NAME_RE.test(name) ? 'Name: 3–20 lateinische Buchstaben oder Ziffern (Leerzeichen in der Mitte erlaubt).' : !BUND_TAG_RE.test(tag) ? 'Kürzel: 2–4 Buchstaben A–Z.'
                : Object.values(bund.b).some(x => x.name.toLowerCase() === name.toLowerCase()) ? 'Diesen Namen gibt es schon.' : Object.values(bund.b).some(x => x.tag === tag) ? 'Dieses Kürzel gibt es schon.'
                : coins < BUND.KOSTEN ? 'Zu wenig Münzen – Gründen kostet ' + fmtNum(BUND.KOSTEN) + '.' : '';
            fehler.textContent = grund; if (grund) return;
            bundBefehl('gruenden', { name, tag, farbe, zeichen, offen: document.getElementById('bdOffen').checked }, 'Bündnis wird gegründet …');
        }
        else if (act === 'beitreten') bundBefehl('beitreten', { aid: b.dataset.aid }, 'Einen Moment …');
        else if (act === 'anfrageWeg') bundBefehl('anfrageWeg', {}, 'Anfrage zurückgezogen.');
        else if (act === 'anfrage') bundBefehl('anfrage', { w, ja: b.dataset.ja === '1' });
        else if (act === 'anfuehrer') { if (sicher('chef:' + b.dataset.w)) bundBefehl('anfuehrer', { w }, bundName(b.dataset.w) + ' führt jetzt das Bündnis.'); }
        else if (act === 'raus') { if (sicher('raus:' + b.dataset.w)) bundBefehl('rauswerfen', { w }, bundName(b.dataset.w) + ' wurde entfernt.'); }
        else if (act === 'offen') { const a = bundIch(); if (a) bundBefehl('offen', { offen: !a.offen }, a.offen ? 'Beitritt nur noch auf Anfrage.' : 'Dein Bündnis ist jetzt offen für alle.'); }
        else if (act === 'verlassen') { if (sicher('verlassen')) { bundBefehl('verlassen', {}, 'Du verlässt das Bündnis.'); } }
        else if (act === 'signal') bundSignalSenden(b.dataset.art);
        else if (act === 'zeigen') { const isl = islandById[+b.dataset.z]; if (isl) { bundSchliessen(); flyTo(isl.x, isl.y); setTimeout(() => openIslandPopup(isl), 380); } }
        else if (act === 'hilfeWahl') { bundWahl = { mode: 'hilfe', nach: +b.dataset.z, f: .5 }; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; }
        else if (act === 'dazuWahl') { bundWahl = { mode: 'dazu', rid: b.dataset.rid, f: .5 }; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; }
        else if (act === 'abbruch') { if (sicher('abbruch:' + b.dataset.rid)) bundBefehl('rallyAbbruch', { rid: b.dataset.rid }, 'Rally wird abgebrochen.'); }
        else if (act === 'wahlZu') { bundWahl = null; bundRender(true); }
        else if (act === 'wahlLos') bundWahlLos();
    });
    bundPopup.addEventListener('change', e => { if (e.target.id === 'bdVon' && bundWahl) { bundWahl.von = +e.target.value; bundWahlRechnen(); } });
    bundPopup.addEventListener('input', e => { if (e.target.id === 'bdTag') { const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); if (v !== e.target.value) e.target.value = v; } });
    setInterval(() => { if (!document.hidden && isPanelOpen(bundPopup)) try { bundRender(); } catch (e) { if (!bundRender.gewarnt) { bundRender.gewarnt = true; console.warn('Bündnis-Fenster:', e); } } }, 1000);
}
// Kleiner Punkt am Knopf: neue Signale oder Rallys seit dem letzten Blick
let bundGesehenAt = Date.now();
function bundGesehen() { bundGesehenAt = Date.now(); bundPunkt(); }
function bundPunkt() {
    const p = document.getElementById('bundBadge'); if (!p) return; const a = bundIch();
    const neu = a ? (a.sig || []).filter(s => s.at > bundGesehenAt && s.w !== 'player').length + bund.r.filter(r => r.aid === a.id && r.start > bundGesehenAt && r.by !== 'player').length : 0;
    p.style.display = neu ? '' : 'none'; p.textContent = neu > 9 ? '9+' : String(neu);
}
// Inselfenster: Bündnis-Knöpfe (Signal, Rally, Hilfe) und keine Angriffe auf Mitglieder
function bundInselfenster(island, view) {
    const box = document.getElementById('popupBund'); if (!box) return;
    const a = bundIch(), ow = islandOwnerOf(island.id);
    if (view !== 'menu' || !a || SYSTEM) { liveHtml(box, ''); return; }
    const ally = ow && ow !== 'player' && bundVerbuendet('player', ow), mein = ow === 'player', kn = [];
    if (ally) { attackBtn.style.display = 'none'; multiAttackBtn.style.display = 'none'; popupOverline.textContent = 'Bündnis-Mitglied · [' + a.tag + ']'; }
    if (mein) { kn.push(['hilfe', 'shield', 'Hilfe!']); kn.push(['sammeln', 'flag', 'Sammeln']); }
    else if (ally) { kn.push(['verteidigen', 'defense', 'Verteidigt']); kn.push(['sammeln', 'flag', 'Sammeln']); if (bundUnterAngriff(island.id)) kn.push(['hilfeWahl', 'send', 'Truppen schicken']); }
    else if (!bundZielOk('player', island.id) || ow && !isCapital(island.id)) { kn.push(['angriff', 'attack', 'Angriff!']); if (!bundZielOk('player', island.id)) kn.push(['rallyWahl', 'troops', 'Rally']); }
    liveHtml(box, (ally ? '<div class="notice notice--gold">' + icon('bund') + '<span>' + escapeHtml(bundName(ow)) + ' ist in deinem Bündnis – Mitglieder greifen sich nicht an.</span></div>' : '') +
        (kn.length ? '<div class="bd-insel"><span class="bd-insel-l">' + icon('bund') + 'Bündnis</span>' + kn.map(k => '<button type="button" class="btn btn--secondary btn--sm" data-bsig="' + k[0] + '">' + icon(k[1]) + '<span>' + k[2] + '</span></button>').join('') + '</div>' : ''));
}
document.getElementById('popupBund') && document.getElementById('popupBund').addEventListener('click', e => {
    const b = e.target.closest('[data-bsig]'); if (!b || popupIslandId === null) return;
    const id = popupIslandId, art = b.dataset.bsig;
    if (art === 'rallyWahl') { const why = bundZielOk('player', id); if (why) { flashHint(why + '.', 3000); return; } closeIslandPopup(); bundWahl = { mode: 'rally', t: id, min: 3, f: 1 }; bundOeffnen('rally'); return; }
    if (art === 'hilfeWahl') { closeIslandPopup(); bundWahl = { mode: 'hilfe', nach: id, f: .5 }; bundOeffnen('sig'); return; }
    bundSignalSenden(art, id);
});

// ==============================================================================================================
// 7) KARTE: Gebiet zart in der Bündnisfarbe, Signale und Rally-Fahnen
// ==============================================================================================================
function bundKarteUnten(vis, z) {
    if (!bundIdx.size || z < 0.0015) return;
    setScreen(ctx); const nach = new Map();
    for (const isl of vis) { const ow = islandOwnerOf(isl.id), x = ow && bundIdx.get(ow); if (!x || !bund.b[x]) continue;
        const f = BUND.FARBEN[bund.b[x].farbe]; let p = nach.get(f); if (!p) { p = new Path2D(); nach.set(f, p); }
        const sx = toSX(isl.x), sy = toSY(isl.y), R = Math.max(6, isl.radius * z * 2.4); if (sx < -R || sy < -R || sx > viewW + R || sy > viewH + R) continue;
        p.moveTo(sx + R, sy); p.arc(sx, sy, R, 0, Math.PI * 2); }
    ctx.save(); ctx.globalAlpha = .16; for (const [f, p] of nach) { ctx.fillStyle = f; ctx.fill(p, 'nonzero'); } ctx.restore();
}
function bundKarteOben(z, now) {
    const a = bundIch(); if (!a && !bund.r.length) return;
    setScreen(ctx); ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const punkt = id => { const i = islandById[id]; return i ? { x: toSX(i.x), y: toSY(i.y), r: Math.max(8, i.radius * z) } : null; };
    const pille = (x, y, text, farbe) => { ctx.font = '700 11px Inter, system-ui, sans-serif'; const w = ctx.measureText(text).width + 14;
        ctx.fillStyle = 'rgba(14,14,20,.88)'; ctx.strokeStyle = farbe; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - 10, w, 20, 10) : ctx.rect(x, y - 10, w, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3e6c4'; ctx.fillText(text, x + 7, y + .5); };
    // Rallys: Fahne am Sammelpunkt mit Countdown und Truppen, gestrichelt zum Ziel (eigenes Bündnis; gegen dich in Rot)
    for (const r of bund.r) {
        const meins = a && r.aid === a.id, gegen = !meins && (islandOwnerOf(r.t) === 'player' || bundVerbuendet('player', islandOwnerOf(r.t)));
        if (!meins && !gegen) continue;
        const p = punkt(r.at), q = punkt(r.t); if (!p || !q) continue;
        const farbe = meins ? BUND.FARBEN[a.farbe] : '#e74c3c';
        ctx.setLineDash([6, 6]); ctx.lineDashOffset = -(now / 60) % 12; ctx.strokeStyle = farbe; ctx.globalAlpha = .75; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (p.x < -160 || p.x > viewW + 160 || p.y < -80 || p.y > viewH + 80) continue;
        const fx = p.x + p.r * .5, fy = p.y - p.r * 1.1;
        ctx.strokeStyle = '#2a241b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(fx, fy + 8); ctx.lineTo(fx, fy - 26); ctx.stroke();
        const wv = Math.sin(now / 260) * 2; ctx.fillStyle = farbe; ctx.beginPath(); ctx.moveTo(fx, fy - 26); ctx.quadraticCurveTo(fx + 10, fy - 30 + wv, fx + 20, fy - 22); ctx.lineTo(fx, fy - 14); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
        const rest = Math.max(0, (r.los - Date.now()) / 1000);
        pille(fx + 22, fy - 20, (meins ? 'Rally ' : 'Rally gegen euch ') + fmtClock(rest) + (meins ? ' · ' + fmtCompact(bundRallyTruppen(r)) : ''), farbe);
        liveAnimation = true;
    }
    // Signale (nur das eigene Bündnis, 10 Minuten lang)
    if (a) for (const s of a.sig || []) {
        if (s.z === null || now - s.at > BUND.SIG_MS) continue; const p = punkt(s.z); if (!p || p.x < -120 || p.x > viewW + 120 || p.y < -80 || p.y > viewH + 80) continue;
        const S = BUND_SIGNALE[s.art], alt = (Date.now() - s.at) / BUND.SIG_MS, puls = 1 + .12 * Math.sin(now / 200);
        const cx = p.x - p.r * .6, cy = p.y - p.r * 1.25 - 14, R = 11 * puls;
        ctx.globalAlpha = Math.max(.45, 1 - alt * .6);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy + 2, R + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = S.farbe; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        drawGlyph(ctx, S.ic, cx, cy, 14, '#fff');
        if (z > 0.01) pille(cx + 14, cy, S.name + ' · ' + bundName(s.w), S.farbe);
        ctx.globalAlpha = 1; liveAnimation = true;
    }
    ctx.restore();
}

// ==============================================================================================================
// 8) VERBINDUNG ZUR WELT
// ==============================================================================================================
bundLaden();
if (window.WELT) {
    if (WELT.BEFEHLE) WELT.BEFEHLE.bund = function (who, b) {          // (Weltrechner) Befehl eines echten Spielers
        if (WELT.wache && WELT.wache.zuOft(who, 'bund', 40, 60000)) { WELT.wache.warnen(who, 'flut', 'Über 40 Bündnis-Befehle in einer Minute – der Rest verfällt.'); return; }
        let why = ''; try { why = bundOp(who, b); } catch (e) { console.warn('Bündnis-Befehl', e); why = 'Fehler'; }
        if (why === 'kaputt') WELT.wache && WELT.wache.warnen(who, 'kaputt', 'Bündnis-Befehl mit kaputten Angaben (' + String(b && b.op).slice(0, 20) + ') – abgelehnt.');
        else if (why) bundMelden(who, why + '.');
    };
    const vorher = window.__weltLaden;
    window.__weltLaden = function (keys) {
        if (vorher) vorher(keys);
        if (!keys.includes('openWaterBuendnisse')) return;
        const alt = bund; bundLaden();
        // neue Signale/Rallys im eigenen Bündnis: kurzer Hinweis (nicht die eigenen)
        const a = bundIch(), altA = a && alt.b && alt.b[a.id], seit = Date.now() - 20000;
        if (a && altA && !SYSTEM) {
            const kannte = new Set((altA.sig || []).map(s => s.id));
            const neu = (a.sig || []).filter(s => !kannte.has(s.id) && s.w !== 'player' && s.at > seit)[0];
            if (neu && Date.now() - (bundMem.hinweisAt || 0) > 45000) { bundMem.hinweisAt = Date.now(); flashHint('Bündnis · ' + bundName(neu.w) + ': ' + bundSigText(neu), 4500); }   // (höchstens alle 45 s ein Hinweis)
        }
        bundPunkt(); if (isPanelOpen(bundPopup)) bundRender(); requestRender();
    };
    WELT.beiNachricht.push(function (e) {                         // Bündnis-Geschenk → Abholfach (nur Münzen, Truppen, selten eine graue/grüne Kiste)
        if (!e || e.art !== 'bundGeschenk') return;
        const c = Math.max(0, Math.min(1e12, +e.coins || 0)), tr = Math.max(0, Math.min(1e12, +e.tr || 0)), crate = e.crate === 0 || e.crate === 1 ? e.crate : -1;
        inboxAdd({ src: 'gift', title: 'Bündnis-Geschenk', coins: c, tr, crate });
        flashHint(typeof e.hint === 'string' ? e.hint.slice(0, 200) : 'Ein Bündnis-Geschenk liegt für dich bereit – Events → Belohnung.', 4500); if (typeof liveBald === 'function') liveBald();
    });
    WELT.beiNachricht.push(function (e) { if (e && e.art === 'bundInfo' && typeof e.text === 'string') { flashHint(e.text.slice(0, 300), 4500); if (bundPopup && isPanelOpen(bundPopup)) bundRender(); } });
}
