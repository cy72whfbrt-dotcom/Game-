// Teil 01-daten-regeln.js: Bündnis: Daten und Regeln (bundOp, nur der Weltrechner ändert)
// ===== buendnis.js – Bündnisse (Paket A): Gründen, Beitreten, Signale, Rally, Geschenke, Tempel-Bonus, Gebiet =====
// Geladen nach spiel.js. Für echte Spieler UND Mitspieler – gleiche Regeln für alle.
// - Welt-Schlüssel openWaterBuendnisse: { b: { a<n>: Bündnis }, r: [Rallys], n: nächste Nummer } (welt.js rechnet die
//   Kennungen um: u<id> ↔ 'player'). Ändern darf ihn NUR der Weltrechner: Spieler schicken Befehle WELT.befehl('bund', …),
//   der Weltrechner prüft alles (bundOp). Mitspieler rufen bundOp direkt auf.
// - Bündnis: { id, name, tag, farbe, zeichen, anf (Anführer), mit: [Mitglieder], offen, at, anfragen: [{ w, at }], einl: [{ w, at }] (Einladungen des Anführers, 24 Std.),
//   sig: [{ id, w, art, z, at }], log: [{ at, t }], gesch: { tag, n: { wer: Anzahl }, k: { wer: Kisten } } }
// - Rally: { id, aid, by, at (Sammelpunkt = Basis des Starters), t (Ziel), start, los, n0 (Truppen des Starters),
//   j: [{ w, f (von Basis), n, s (Start des Marschs), da (angekommen) }] }
// Kapitel: 1) Daten  2) Regeln (Weltrechner)  3) Rally  4) Geschenke, Tempel-Bonus, Gebiet  5) Mitspieler
//          6) Fenster  7) Karte  8) Verbindung zur Welt

// ==============================================================================================================
// 1) DATEN
// ==============================================================================================================
const BUND = {
    MAX: 5, KOSTEN: 30000,                                    // höchstens 5 Mitglieder (Spieler und Mitspieler zusammen – Alexander 3.10.) · Gründen kostet 30.000 Münzen
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
    danke:       { name: 'Danke!', ic: 'star', farbe: '#2ecc71', text: () => 'Danke!' },
    teilen:      { name: 'Geteilt', ic: 'flag', farbe: '#f1c40f', text: z => 'Geteilt: ' + z }
};
// Bündnis-Chat (Alexander 4.10.): nur feste Sätze (kein freier Text), dazu „Ort teilen“ und Meldungen des Spiels.
// g: f = Frage, a = Antwort, o = Ort geteilt, s = Meldung des Spiels (kann man nicht selbst schicken)
const BUND_CHAT = {
    angriff: { g: 'f', t: 'Wir greifen an?' }, wo: { g: 'f', t: 'Wo?' }, wann: { g: 'f', t: 'Wann?' }, rally: { g: 'f', t: 'Rally?' },
    rallyBitte: { g: 'f', t: 'Bin zu weit weg – machst du eine Rally?' },
    hilfe: { g: 'f', t: 'Brauche Hilfe!' }, online: { g: 'f', t: 'Wer ist online?' },
    ja: { g: 'a', t: 'Ja' }, nein: { g: 'a', t: 'Nein' }, dabei: { g: 'a', t: 'Bin dabei' }, jetzt: { g: 'a', t: 'Jetzt!' }, spaeter: { g: 'a', t: 'Später' },
    starte: { g: 'a', t: 'Ja, ich starte die Rally!' }, machdu: { g: 'a', t: 'Starte du die Rally – ich trete bei!' }, zuweit: { g: 'a', t: 'Bin zu weit weg' }, keinweg: { g: 'a', t: 'Kein Weg dorthin – ein Tor ist zu' },
    unterwegs: { g: 'a', t: 'Bin unterwegs' }, binon: { g: 'a', t: 'Bin online' }, danke: { g: 'a', t: 'Danke!' }, gut: { g: 'a', t: 'Gut gemacht!' },
    teilen: { g: 'o', t: 'hat einen Ort geteilt' },
    s_rally: { g: 's', t: 'hat eine Rally gestartet' }, s_rein: { g: 's', t: 'ist dem Bündnis beigetreten' }, s_raus: { g: 's', t: 'ist nicht mehr im Bündnis' }
};
const BUND_CHAT_MAX = 80, BUND_CHAT_PAUSE = 1500;                // gemerkte Zeilen je Bündnis · höchstens eine Zeile pro 1,5 s und Spieler
// Welt-Teil openWaterBundChat = { aid: { mit: [Mitglieder – der Server zeigt jedem nur den Chat seines Bündnisses], l: [{ id, w, k, z, at }] } }
let bundChat = (() => { try { const v = JSON.parse(store.get('openWaterBundChat')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } })();
function bundChatSpeichern() {
    for (const id in bundChat) { const a = bund.b[id]; if (!a) delete bundChat[id]; else bundChat[id].mit = a.mit.slice(); }
    store.set('openWaterBundChat', JSON.stringify(bundChat)); requestRender();
}
function bundChatDazu(a, w, k, z) {                               // eine Zeile in den Chat des Bündnisses a
    if (!a || !BUND_CHAT[k]) return;
    const c = bundChat[a.id] || (bundChat[a.id] = { mit: [], l: [] }); if (!Array.isArray(c.l)) c.l = [];
    c.l.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), w, k, z: Number.isInteger(z) ? z : null, at: Date.now() });
    if (c.l.length > BUND_CHAT_MAX) c.l.splice(0, c.l.length - BUND_CHAT_MAX);
    bundChatSpeichern();
}
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
function bundZielName(isl) {                                                  // Ziel wie auf der Karte: Besitzer bzw. „Neutrale Basis“ statt „Turm #N“
    const t = islandTitle(isl); if (!/^Turm #/.test(t)) return t;
    const ow = islandOwnerOf(isl.id); return ow ? 'Basis von ' + bundName(ow) : 'Neutrale Basis · ' + coordText(isl.x, isl.y);
}
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
const bundAustritt = new Map();                                  // echter Spieler → wann er zuletzt ein Bündnis verlassen hat
const bundMeldeZeit = new Map();                                 // gegen Spam (Rally an/ab, Einladung an/weg …): dieselbe Meldung an dieselbe Person höchstens alle 10 Min.
function bundEinmal(key) { const now = Date.now(), t = bundMeldeZeit.get(key); if (t && now - t < 600000) return false;
    bundMeldeZeit.set(key, now); if (bundMeldeZeit.size > 5000) for (const [k, v] of bundMeldeZeit) if (now - v >= 600000) bundMeldeZeit.delete(k); return true; }
function bundAlleMelden(a, text, ausser) { for (const w of a.mit) if (w !== ausser) bundMelden(w, text); }
function bundPush(w, daten) { if (/^u\d+$/.test(w || '')) (window.__bundPush || (window.__bundPush = [])).push(Object.assign({ an: w }, daten)); if (window.__bundPush && window.__bundPush.length > 200) window.__bundPush.splice(0, 100); }
function bundGehoert(id, w) { return Number.isInteger(id) && !!islandById[id] && islandOwnerOf(id) === w; }
function bundZahl(v) { return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1e30; }   // (nur gegen kaputte Zahlen)
function bundZielOk(w, t) {                                      // darf w diese Basis angreifen? '' = ja
    const isl = islandById[t]; if (!isl) return 'Ziel gibt es nicht';
    const ow = islandOwnerOf(t);
    if (ow === w) return 'Das Ziel gehört dir schon';
    if (bundVerbuendet(w, ow)) return 'Das Ziel gehört einem Bündnis-Mitglied';
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
    for (const r of bund.r.filter(r => r.aid === a.id && r.by !== w)) for (const j of r.j.filter(j => j.w === w)) {   // seine Truppen in fremden Rallys gehen heim (die unterwegs kehren bei der Ankunft um)
        r.j = r.j.filter(x => x !== j); if (j.da) bundHeimschicken(w, r.at, j.f, j.n); }
    if (!a.mit.length) { delete bund.b[a.id]; bundChatSpeichern(); return; }
    bundChatDazu(a, w, 's_raus');
    if (a.anf === w) { a.anf = a.mit.slice().sort((x, y) => staerke(y) - staerke(x))[0]; bundLog(a, bundName(a.anf) + ' führt jetzt das Bündnis.'); }
    bundLog(a, bundName(w) + (grund || ' hat das Bündnis verlassen.'));
}
function bundRein(a, w) {
    for (const x in bund.b) { const b = bund.b[x]; b.anfragen = (b.anfragen || []).filter(q => q.w !== w); b.einl = (b.einl || []).filter(q => q.w !== w); }
    a.mit.push(w); (a.dabei || (a.dabei = {}))[w] = Date.now(); bundLog(a, bundName(w) + ' ist beigetreten.'); bundChatDazu(a, w, 's_rein');   // (dabei: seit wann – Mitspieler wechseln frühestens nach 12 Std.)
}
const BUND_EINL_MS = 24 * 3600000;                                // eine Einladung gilt 24 Std.
function bundEinladungen(w) { const now = Date.now(); return Object.values(bund.b).filter(a => (a.einl || []).some(q => q.w === w && now - q.at < BUND_EINL_MS)); }   // wer lädt w gerade ein?
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
        const raus = bundAustritt.get(who); if (raus && now - raus < 3600000) return 'Du hast gerade ein Bündnis verlassen – neu beitreten kannst du in ' + Math.ceil((3600000 - (now - raus)) / 60000) + ' Min.';   // (gegen Spam: beitreten/verlassen im Wechsel)
        const voll = z.mit.length >= BUND.MAX;                   // voll: trotzdem anfragen – der Anführer kann tauschen
        if (z.offen && !voll) { bundRein(z, who); bundAlleMelden(z, bundName(who) + ' ist deinem Bündnis beigetreten.', who); return fertig('Willkommen im Bündnis [' + z.tag + '] ' + z.name + '!'); }
        z.anfragen = (z.anfragen || []).filter(q => q.w !== who && now - q.at < 24 * 3600000);
        if (z.anfragen.length >= 30) return 'Zu viele Anfragen – versuch es später';
        z.anfragen.push({ w: who, at: now }); if (bundEinmal('a|' + z.anf + '|' + who)) bundMelden(z.anf, bundName(who) + ' möchte deinem Bündnis beitreten' + (voll ? ' (es ist voll – du kannst tauschen).' : '.'));
        return fertig('Anfrage an [' + z.tag + '] ' + z.name + ' geschickt' + (voll ? ' – das Bündnis ist voll, der Anführer kann tauschen.' : '.'));
    }
    if (op === 'einladungAntwort') {                              // Eingeladener: Ja / Nein (geht auch, wenn das Bündnis nur auf Anfrage offen ist)
        const z = bund.b[kennung(b.aid)]; if (!z) return 'Dieses Bündnis gibt es nicht mehr';
        const q = (z.einl || []).find(x => x.w === who && now - x.at < BUND_EINL_MS); if (!q) return 'Die Einladung gilt nicht mehr';
        z.einl = z.einl.filter(x => x !== q);
        if (b.ja !== true) { bundMelden(z.anf, bundName(who) + ' hat die Einladung nicht angenommen.'); return fertig(''); }
        if (a) return 'Du bist schon in einem Bündnis';
        if (z.mit.length >= BUND.MAX) return 'Das Bündnis ist voll (' + BUND.MAX + ' Mitglieder)';
        bundRein(z, who); bundAlleMelden(z, bundName(who) + ' hat die Einladung angenommen und ist deinem Bündnis beigetreten.', who);
        return fertig('Willkommen im Bündnis [' + z.tag + '] ' + z.name + '!');
    }
    if (op === 'anfrageWeg') { for (const x in bund.b) bund.b[x].anfragen = (bund.b[x].anfragen || []).filter(q => q.w !== who); return fertig(''); }
    if (!a) return 'Du bist in keinem Bündnis';
    const chef = a.anf === who, ziel = kennung(b.w);
    if (op === 'verlassen') { bundRaus(a, who); if (botById[who] && botById[who].mensch) bundAustritt.set(who, now); return fertig('Du hast das Bündnis verlassen.'); }   // (echte Spieler: 1 Std. kein neuer Beitritt)
    if (op === 'anfrage') {                                      // Anführer: Ja / Nein
        if (!chef) return 'Nur der Anführer entscheidet';
        const q = (a.anfragen || []).find(x => x.w === ziel); if (!q) return '';
        a.anfragen = a.anfragen.filter(x => x !== q);
        if (b.ja === true) {
            if (bundVon(ziel)) return fertig('');
            if (a.mit.length >= BUND.MAX) {                              // voll: tauschen – ein Mitglied geht, der Bewerber kommt
                const raus = kennung(b.raus);
                if (!raus || raus === who || !a.mit.includes(raus)) { a.anfragen.push(q); return 'Das Bündnis ist voll – wähle ein Mitglied zum Tauschen'; }
                bundRaus(a, raus, ' wurde entfernt (Platz für ' + bundName(ziel) + ').'); bundMelden(raus, 'Du wurdest aus dem Bündnis [' + a.tag + '] ' + a.name + ' entfernt – Platz für ein stärkeres Mitglied.');
            }
            bundRein(a, ziel); bundMelden(ziel, 'Du bist jetzt im Bündnis [' + a.tag + '] ' + a.name + '!');
        } else bundMelden(ziel, '[' + a.tag + '] ' + a.name + ' hat deine Anfrage abgelehnt.');
        return fertig('');
    }
    if (op === 'einladen') {                                      // nur der Anführer: jemanden ohne Bündnis einladen
        if (!chef) return 'Nur der Anführer kann einladen';
        if (!ziel || ziel === who || !botById[ziel]) return 'kaputt';
        if (bundVon(ziel)) return bundName(ziel) + ' ist schon in einem Bündnis';
        if (!bundBasen(ziel).size) return bundName(ziel) + ' hat keine Basis';
        if (a.mit.length >= BUND.MAX) return 'Dein Bündnis ist voll (' + BUND.MAX + ' Mitglieder)';
        a.einl = (a.einl || []).filter(x => now - x.at < BUND_EINL_MS);
        if (a.einl.some(x => x.w === ziel)) return '';
        if (a.einl.length >= 10) return 'Zu viele offene Einladungen (höchstens 10)';
        a.einl.push({ w: ziel, at: now });
        if (bundEinmal('e|' + ziel + '|' + a.tag)) bundMelden(ziel, bundName(who) + ' lädt dich ins Bündnis [' + a.tag + '] ' + a.name + ' ein – im Bündnis-Fenster annehmen oder ablehnen (24 Std.).');
        return fertig('Einladung an ' + bundName(ziel) + ' geschickt.');
    }
    if (op === 'einladungWeg') { if (!chef) return 'Nur der Anführer'; a.einl = (a.einl || []).filter(x => x.w !== ziel); return fertig(''); }
    if (op === 'rauswerfen') {
        if (!chef || !ziel || ziel === who || !a.mit.includes(ziel)) return 'Nur der Anführer kann Mitglieder entfernen';
        bundRaus(a, ziel, ' wurde aus dem Bündnis entfernt.'); bundMelden(ziel, 'Du wurdest aus dem Bündnis [' + a.tag + '] ' + a.name + ' entfernt.'); return fertig('');
    }
    if (op === 'anfuehrer') {
        if (!chef || !ziel || ziel === who || !a.mit.includes(ziel)) return 'Nur der Anführer kann das Amt übergeben';
        a.anf = ziel; bundLog(a, bundName(ziel) + ' führt jetzt das Bündnis.'); bundMelden(ziel, 'Du führst jetzt das Bündnis [' + a.tag + '] ' + a.name + '.'); return fertig('');
    }
    if (op === 'offen') { if (!chef) return 'Nur der Anführer'; a.offen = b.offen === true; return fertig(''); }
    if (op === 'chat') {                                          // eine feste Zeile in den Bündnis-Chat
        const k = typeof b.k === 'string' ? b.k : '', C = BUND_CHAT[k]; if (!C || C.g === 's') return 'kaputt';
        if (now - (bundMem.chatAt[who] || 0) < BUND_CHAT_PAUSE) return ''; bundMem.chatAt[who] = now;
        let z = Number.isInteger(b.z) && islandById[b.z] ? b.z : null;
        if (k === 'teilen') {
            if (z === null) return 'kaputt';
            bundChatDazu(a, who, 'teilen', z);
            a.sig = (a.sig || []).filter(x => now - x.at < 30 * 60000 && !(x.w === who && x.art === 'teilen')); a.sig.unshift({ id: 's' + (bund.n++), w: who, art: 'teilen', z, at: now });   // Marke auf der Karte (eine je Spieler)
            if (a.sig.length > BUND.SIG_MAX) a.sig.length = BUND.SIG_MAX;
        } else if (k === 'hilfe') {                                // Hilfe für eine eigene Basis (die angegriffene oder die Hauptstadt)
            if (z === null || islandOwnerOf(z) !== who) { z = [...bundBasen(who)].find(id => bundUnterAngriff(id)); if (z === undefined) z = bundCap(who); }
            if (bundSignal(a, who, 'hilfe', z)) bundChatDazu(a, who, 'hilfe', z);   // (das Signal schreibt die Zeile selbst – nur wenn es gerade nicht geht, die Zeile allein)
        } else bundChatDazu(a, who, k, null);
        bundChatAntworten(a, who, k);
        return fertig('');
    }
    if (op === 'rally') return bundRallyStart(a, who, b) || fertig('');
    if (op === 'rallyDazu') return bundRallyDazu(a, who, b) || fertig('');
    if (op === 'rallyAbbruch') {
        const r = bund.r.find(x => x.id === kennung(b.rid) && x.aid === a.id); if (!r) return '';
        if (r.by !== who && !chef) return 'Nur wer die Rally gestartet hat';
        bundRallyEnde(r, bundName(who) + ' hat die Rally abgebrochen'); return fertig('');
    }
    if (op === 'hilfe') return bundHilfe(who, b.von, b.nach, b.n) || fertig('');
    if (op === 'hilfeBitte') return bundHilfeBitte(a, who, b, now) || fertig('');
    if (op === 'helfen') { let n = 0; for (const id of b.alle ? (a.hilfe || []).map(h => h.id) : [kennung(b.hid)]) if (bundHelfen(a, who, id, now)) n++;
        return n ? fertig('') : b.alle ? '' : 'Da kannst du gerade nicht helfen'; }
    if (op === 'verstZurueck') {                                   // Verstärkung heim: der Helfer holt sie, oder der Gastgeber schickt sie
        const v = verst.l.find(x => x.id === kennung(b.vid)); if (!v) return '';
        const gast = islandOwnerOf(v.t); if (v.w !== who && gast !== who) return 'Nicht deine Verstärkung';
        verstHeim(v, v.w === who ? bundName(who) + ' holt ' + fmtCompact(v.n) + ' Truppen aus ' + islandTitle(islandById[v.t]) + ' zurück.' : bundName(who) + ' schickt deine ' + fmtCompact(v.n) + ' Truppen aus ' + islandTitle(islandById[v.t]) + ' heim.');
        return fertig('');
    }
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
    const letztes = a.sig.find(s => s.w === who && s.art !== 'teilen'); if (letztes && now - letztes.at < BUND.SIG_PAUSE) return 'Warte kurz – höchstens ein Signal alle 30 Sekunden';
    if (art === 'danke') z = null;
    else {
        if (!Number.isInteger(z) || !islandById[z]) return 'kaputt';
        const ow = islandOwnerOf(z);
        if (art === 'hilfe' && ow !== who) return 'Hilfe rufen geht nur für eigene Basen';
        if ((art === 'sammeln' || art === 'verteidigen') && !(ow === who || bundVerbuendet(ow, who))) return 'Nur für Basen des Bündnisses';
        if (art === 'angriff' && (ow === who || bundVerbuendet(ow, who))) return 'Das ist eine Basis des Bündnisses';
    }
    if (art === 'hilfe' && a.sig.some(s => s.w === who && s.art === 'hilfe' && s.z === z && now - s.at < 3 * 60000)) { bundChatDazu(a, who, 'hilfe', z); return ''; }   // (läuft schon – z. B. von selbst gesetzt: kein zweites Signal)
    const s = { id: 's' + (bund.n++), w: who, art, z, at: now };
    a.sig.unshift(s); if (a.sig.length > BUND.SIG_MAX) a.sig.length = BUND.SIG_MAX;
    if (art === 'hilfe') { for (const w of a.mit) if (w !== who) bundPush(w, { art: 'hilfe', von: bundName(who), basis: islandTitle(islandById[z]) }); bundChatDazu(a, who, 'hilfe', z); }
    return '';
}
// Truppen zur Verstärkung an die Basis eines Mitglieds, die gerade angegriffen wird (sie gehören dann dort zur Besatzung)
function bundHilfe(who, von, nach, n) {                         // Verstärkung: Truppen zur Basis eines Mitglieds – sie bleiben deine (Botschaft)
    if (!bundGehoert(von, who) || !Number.isInteger(nach) || !islandById[nach] || !bundZahl(n)) return 'kaputt';
    const ow = islandOwnerOf(nach); if (!bundVerbuendet(ow, who)) return 'Nur an Basen deines Bündnisses';
    if (!verstStufe(ow)) return bundName(ow) + ' hat noch keine Botschaft (ab Burg-Stufe 5)';
    const frei = verstFrei(ow); if (frei < 1) return 'Die Botschaft von ' + bundName(ow) + ' ist voll';
    return bundMarsch(who, von, nach, Math.min(n, frei), { verst: 1 });
}
function bundMarsch(who, von, nach, n, extra) {                  // ein Marsch zur Basis eines anderen Mitglieds (Rally oder Hilfe) → '' oder Grund
    const src = islandById[von], dst = islandById[nach];
    n = Math.floor(Math.min(n, islandTroops[von] || 0)); if (n < 1) return 'Keine Truppen dort';
    if (AUF && !AUF.marschOk(who)) return AUF.marschVoll(who);                // Marsch-Plätze der Burg (Paket D) – gilt für alle
    const rally = !!(extra && extra.rally);                         // (Rally beitreten: Tore sind egal – Alexander 4.10.: „nur wer sie startet, braucht den Weg zum Ziel“)
    if (!rally && !routeFor(src.landmassId, dst.landmassId, who)) return 'Kein Weg dorthin (Tor zu?)';
    if (!rally) { const hop = lastHop(src.landmassId, dst.landmassId, who); if (!payToll(hop[0], hop[1], n, who)) return 'Das Tor ist zu oder die Maut zu teuer'; }
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
        const j = r && islandOwnerOf(r.at) === r.by && bund.r.includes(r) ? r.j.find(x => x.w === who && x.f === send.fromId && !x.da && (x.k ? x.k === marchKeyOf(send) : x.s === send.startedAt)) : null;   // (k bleibt fest – „schneller“ ändert startedAt)
        if (j) { j.da = true; bundSpeichern(); return true; }
        const L = bundMem.rallyWeg[send.rally];                     // Nachzügler: die Rally ist schon los → vom Sammelpunkt direkt zum Ziel, mitkämpfen
        if (!r && L && Date.now() < L.bis && send.toId === L.at && !bundZielOk(who, L.t) && (islandOwnerOf(L.at) === who || bundVerbuendet(islandOwnerOf(L.at), who))) {
            islandTroops[L.at] = (islandTroops[L.at] || 0) + send.troops; const k = pendingAttacks.length; let ok = false;
            if (AUF) AUF.frei.an(); try { ok = launchAttack(L.at, L.t, who, send.troops, send.held || null, send.held2 || null); } finally { if (AUF) AUF.frei.aus(); }   // (seine Helden kommen mit)
            if (ok && pendingAttacks.length > k) { bundMelden(who, 'Die Rally auf ' + bundZielName(islandById[L.t]) + ' ist schon los – deine ' + fmtCompact(send.troops) + ' Truppen ziehen direkt weiter zum Ziel.'); saveGame(); saveProgression(); return true; }
            islandTroops[L.at] = Math.max(0, (islandTroops[L.at] || 0) - send.troops);
        }
    } else if (send.verst) {                                     // Verstärkung kommt an: stationiert (bleibt seine), sonst heim
        const ow = islandOwnerOf(send.toId);
        if (ow && ow !== who && bundVerbuendet(ow, who) && verstStufe(ow) && verstFrei(ow) >= 1) {
            const n = Math.min(send.troops, Math.floor(verstFrei(ow))), alt = verst.l.find(v => v.w === who && v.t === send.toId);
            if (alt) alt.n += n; else verst.l.push({ id: 'v' + (verst.n++), w: who, t: send.toId, n, von: send.fromId, at: Date.now() });
            verstSpeichern();
            if (send.troops > n) bundHeimschicken(who, send.toId, send.fromId, send.troops - n);
            bundMelden(ow, bundName(who) + ' verstärkt dich in ' + islandTitle(islandById[send.toId]) + ' mit ' + fmtCompact(n) + ' Truppen (Botschaft).');
            bundMelden(who, 'Deine ' + fmtCompact(n) + ' Truppen verstärken jetzt ' + bundName(ow) + ' in ' + islandTitle(islandById[send.toId]) + '.');
            const a = bundVon(ow); if (a && !(botById[ow] || {}).mensch && Math.random() < .5) bundSignal(a, ow, 'danke');
            saveGame(); return true;
        }
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
function bundHeimschicken(w, vonId, zuId, n, ret) {              // ret: Rückweg-Bonus SEINES Helden (+ % Tempo, wie retreatSecs)
    if (!(n >= 1)) return;
    const own = bundBasen(w), to = own.has(zuId) ? zuId : bundCap(w);
    if (to === null || to === undefined || !islandById[to]) return;
    const now = Date.now(), dur = travelDurationSeconds(islandById[vonId] || islandById[to], islandById[to], w === 'player' ? undefined : w) / (1 + (ret || 0) / 100);
    pendingSends.push({ fromId: vonId, toId: to, troops: Math.floor(n), startedAt: now, resolveAt: now + Math.max(1, dur) * 1000, senderBotId: w, back: true });
}

// Bündnis-Hilfe (Botschaft, Alexander 4.10.): wer baut oder forscht, bittet sein Bündnis um Hilfe. Jedes Mitglied kann einmal
// „Helfen“ tippen – jede Hilfe macht den Bau/die Forschung 1 % der ganzen Zeit kürzer (mindestens 1 Minute). Wie oft geholfen
// werden kann, bestimmt die Botschaft (Stufe = Anzahl Hilfen). Liste a.hilfe = [{ id, w, was: 'bau'|'fo', k, to, max, von: [...], at, bis }].
// Bei Mitspielern verkürzt der Weltrechner den Bau gleich; bei echten Spielern macht es ihr Handy (hilfeAnwenden) und der
// Weltrechner merkt es sich fürs Hauptbuch (WELT.wache.hilfe), sonst sähe der schnellere Bau nach Schummeln aus.
const HILFE_PCT = .01, HILFE_MIN_MS = 60000;
function hilfeDauer(was, k, to) {                                // ganze Dauer (ms) dieses Baus / dieser Forschung
    if (!Number.isInteger(to) || to < 1) return 0;
    if (was === 'bau') return k === 'keep' || CITY_BUILDINGS.some(d => d.id === k) ? cityTimeRoh(k, to - 1) * 1000 : 0;
    const d = AUF && AUF.FORSCHUNG.find(f => f.id === k); return d ? AUF.foZeitRoh(d, to) * 1000 : 0;
}
const hilfeSchritt = (was, k, to) => Math.max(HILFE_MIN_MS, hilfeDauer(was, k, to) * HILFE_PCT);
function hilfeJob(w, was, k, to) {                               // der laufende Bau / die laufende Forschung (Spieler oder Mitspieler)
    const c = w === 'player' ? loadCity() : ((loadBotState()[w] || {}).city || null); if (!c) return null;
    if (was === 'bau') return (c.builds || []).find(x => x.id === k && x.to === to) || null;
    return c.foRun && c.foRun.id === k && c.foRun.to === to ? c.foRun : null;
}
function hilfeName(h) { return h.was === 'fo' ? 'Forschung ' + ((AUF && AUF.FORSCHUNG.find(f => f.id === h.k)) || {}).name : (cityDef(h.k) || {}).name + ' Stufe ' + h.to; }
function bundHilfeBitte(a, who, b, now) {
    const was = b.was === 'fo' || b.was === 'bau' ? b.was : null, k = typeof b.k === 'string' && /^[a-z_]{1,20}$/.test(b.k) ? b.k : null, to = b.to;
    if (!was || !k || !hilfeDauer(was, k, to)) return 'kaputt';
    const L = AUF ? AUF.botschaftStufe(who) : 0; if (!L) return 'Baue zuerst die Botschaft – ihre Stufe bestimmt, wie oft dir dein Bündnis helfen kann';
    a.hilfe = (a.hilfe || []).filter(h => now < h.bis + 120000);
    const hb = botById[who] && botById[who].mensch && (loadBotState()[who] || {}).hb;   // echter Spieler: nur für die NÄCHSTE Stufe (laut Hauptbuch des Weltrechners) – keine Hilfe auf Vorrat
    if (hb && hb.st && hb.fo) { const naechste = was === 'bau' ? (hb.st[k] ? hb.st[k][0] + 1 : 0) : (hb.fo[k] | 0) + 1; if (to !== naechste) return '';
        a.hilfe = a.hilfe.filter(h => !(h.w === who && h.was === was && h.to <= (was === 'bau' ? (hb.st[h.k] || [0])[0] : hb.fo[h.k] | 0))); }   // (schon fertige Bitten weg)
    if (a.hilfe.some(h => h.w === who && h.was === was && (was === 'fo' || h.k === k))) return '';   // je Gebäude bzw. Forschung nur eine offene Bitte
    if (a.hilfe.length >= 60) return 'Gerade zu viele Hilfe-Bitten im Bündnis';
    const bis = Math.min(now + 62 * 864e5, now + hilfeDauer(was, k, to));   // (so lange wie der ganze Bau – eine selbst gesetzte kurze Zeit ließ die Bitte verfallen und neu stellen: Hilfe ohne Ende)
    a.hilfe.push({ id: 'h' + (bund.n++), w: who, was, k, to, max: L, von: [], at: now, bis });
    return '';
}
function bundHelfen(a, who, hid, now) {                          // → true, wenn geholfen
    const h = (a.hilfe || []).find(x => x.id === hid);
    if (!h || h.w === who || h.von.includes(who) || h.von.length >= h.max || now > h.bis || !a.mit.includes(h.w)) return false;
    h.von.push(who);
    const ms = hilfeSchritt(h.was, h.k, h.to), mensch = botById[h.w] && botById[h.w].mensch;
    if (h.w !== 'player' && !mensch) { const j = hilfeJob(h.w, h.was, h.k, h.to); if (j) { j.endsAt = Math.max(now, j.endsAt - ms); saveBotState(); } }   // Mitspieler: gleich kürzer
    else if (mensch && window.WELT && WELT.wache && WELT.wache.hilfe) WELT.wache.hilfe(h.w, h.was + ':' + h.k + ':' + h.to, ms);   // echter Spieler: sein Handy macht es kürzer, das Hauptbuch weiß es
    return true;
}
// (Handy) die Hilfen der anderen an meinen Bau / meine Forschung anrechnen – jede Hilfe genau einmal
function hilfeAnwenden() {
    if (SYSTEM) return; const a = bundIch(); if (!a || !Array.isArray(a.hilfe)) return;
    const c = loadCity(), an = c.hilfeAn || (c.hilfeAn = {}), now = Date.now(); let neu = 0, wer = '';
    for (const h of a.hilfe) { if (h.w !== 'player') continue; const n = h.von.length - (an[h.id] || 0); if (n <= 0) continue;
        const j = hilfeJob('player', h.was, h.k, h.to); if (j) { j.endsAt = Math.max(now, j.endsAt - n * hilfeSchritt(h.was, h.k, h.to)); neu += n; wer = bundName(h.von[h.von.length - 1]); }
        an[h.id] = h.von.length; }
    for (const id in an) if (!a.hilfe.some(h => h.id === id)) delete an[id];
    if (neu) { saveCity(); flashHint(wer + (neu > 1 ? ' und andere haben' : ' hat') + ' dir geholfen – dein Bau / deine Forschung geht schneller.', 3000); if (cityOpenId) renderCitySheet(); }
}
setInterval(() => { try { hilfeAnwenden(); } catch (e) {} }, 2000);
function hilfeMeine(was, k, to) { const a = bundIch(); return a ? (a.hilfe || []).find(h => h.w === 'player' && h.was === was && h.k === k && h.to === to) || null : null; }
function bundHilfeKnopf(was, k, to, bis) {                       // im Gebäude-/Labor-Fenster während des Baus: um Hilfe bitten oder sehen, wie viele geholfen haben
    if (!window.WELT || !bundIch()) return '';
    const h = hilfeMeine(was, k, to), L = AUF ? AUF.botschaftStufe('player') : 0;
    if (h) return '<small class="bd-hilfe-st">' + icon('bund') + 'Bündnis-Hilfe: ' + h.von.length + ' / ' + h.max + '</small>';
    if (!L) return '<small class="bd-hilfe-st">' + icon('bund') + 'Mit einer Botschaft kann dir dein Bündnis hier helfen.</small>';
    return '<button type="button" class="btn btn--secondary btn--sm bd-hilfe-btn" data-bhilfe="' + was + ':' + k + ':' + to + ':' + Math.round(bis) + '">' + icon('bund') + '<span>Bündnis um Hilfe bitten</span></button>';
}
function bundHilfeHtml(a) {                                       // Bündnis-Fenster: wem du gerade helfen kannst
    const now = Date.now(), L = (a.hilfe || []).filter(h => now < h.bis), offen = L.filter(h => h.w !== 'player' && !h.von.includes('player') && h.von.length < h.max), meine = L.filter(h => h.w === 'player');
    if (!offen.length && !meine.length) return '';
    return '<div class="sect"><h4>Bündnis-Hilfe</h4><span class="sect-aside">' + offen.length + '</span></div><div class="bd-liste">' +
        offen.map(h => '<div class="bd-zeile"><span class="bd-name"><b>' + escapeHtml(bundName(h.w)) + '</b><small>' + escapeHtml(hilfeName(h)) + ' · ' + h.von.length + ' / ' + h.max + '</small></span>' +
            '<button type="button" class="btn btn--primary btn--sm" data-bact="helfen" data-hid="' + h.id + '">Helfen</button></div>').join('') +
        meine.map(h => '<div class="bd-zeile is-me"><span class="bd-name"><b>Du</b><small>' + escapeHtml(hilfeName(h)) + ' · ' + h.von.length + ' / ' + h.max + ' Hilfen</small></span></div>').join('') + '</div>' +
        (offen.length > 1 ? '<div class="bd-knoepfe"><button type="button" class="btn btn--primary btn--sm" data-bact="alleHelfen">Allen helfen</button></div>' : '');
}
// (Weltrechner) Mitspieler bitten um Hilfe bei langen Bauten und helfen den anderen
function bundHilfeTakt(now) {
    for (const id in bund.b) { const a = bund.b[id], vor = (a.hilfe || []).length; let neu = false;
        a.hilfe = (a.hilfe || []).filter(h => now < h.bis + 120000 && a.mit.includes(h.w)); if (a.hilfe.length !== vor) neu = true;
        for (const w of a.mit) { const bot = botById[w]; if (!bot || bot.mensch || !botOnline(bot, now) || !(AUF && AUF.botschaftStufe(w))) continue;
            const c = (loadBotState()[w] || {}).city; if (!c) continue;
            const jobs = (c.builds || []).map(x => ['bau', x]).concat(c.foRun ? [['fo', c.foRun]] : []);
            for (const [was, j] of jobs) if (j.endsAt - now > 10 * 60000 && !a.hilfe.some(h => h.w === w && h.was === was && h.k === j.id && h.to === j.to) && !bundHilfeBitte(a, w, { was, k: j.id, to: j.to, bis: j.endsAt }, now)) neu = true; }
        for (const h of a.hilfe) for (const w of a.mit) { const bot = botById[w];
            if (!bot || bot.mensch || w === h.w || h.von.includes(w) || !botOnline(bot, now) || Math.random() > .25) continue;
            if (bundHelfen(a, w, h.id, now)) neu = true; }
        if (neu) bundSpeichern(); }
}
document.getElementById('citySheet').addEventListener('click', e => {
    const b = e.target.closest('[data-bhilfe]'); if (!b) return;
    const [was, k, to, bis] = b.dataset.bhilfe.split(':'); b.disabled = true;
    bundBefehl('hilfeBitte', { was, k, to: +to, bis: +bis }, 'Dein Bündnis wurde um Hilfe gebeten.');
});

// Verstärkung (Botschaft): Truppen eines Mitglieds stehen bei einem anderen – sie bleiben SEINE (zurückholen jederzeit). Im Kampf
// verteidigen sie mit; Tote und Verwundete werden anteilig geteilt (jeder seine, Verwundete ins eigene Krankenhaus).
// Welt-Teil openWaterVerstaerkung = { n, l: [{ id, w: Helfer, t: Basis, n: Truppen, von: seine Basis, at }] }.
// Platz: Botschaft-Stufe × 10 % seiner eigenen Truppen (mind. Stufe × 20.000) – für alle Verstärkungen bei ihm zusammen.
let verst = verstLesen();
var verstDefPlus = {};   // (nur während eines Kampfs) Basis → was die Helfer mit ihren eigenen Werten mehr/weniger verteidigen
function verstLesen() { let v = null; try { v = JSON.parse(store.get('openWaterVerstaerkung')); } catch (e) {} return v && Array.isArray(v.l) ? v : { n: 0, l: [] }; }
function verstSpeichern() { store.set('openWaterVerstaerkung', JSON.stringify(verst)); requestRender(); }
function verstStufe(w) { return AUF && AUF.botschaftStufe ? AUF.botschaftStufe(w) : 0; }
function eigeneTruppen(w) { let eigen = 0; for (const id of bundBasen(w)) eigen += islandTroops[id] || 0; return eigen; }
function verstPlatzStufe(w, L) { return L ? L * Math.max(20000, eigeneTruppen(w) * .1) : 0; }
function verstPlatz(w) { return verstPlatzStufe(w, verstStufe(w)); }
// Rally-Größe (Botschaft, Alexander 4.10.): so viele Truppen dürfen einer Rally beitreten – die Botschaft des Starters zählt
function rallyPlatzStufe(w, L) { return (L + 1) * Math.max(20000, eigeneTruppen(w) * .1); }
function rallyPlatz(w) { return rallyPlatzStufe(w, verstStufe(w)); }
const rallyFrei = r => Math.max(0, Math.floor(rallyPlatz(r.by) - r.j.reduce((s, j) => s + j.n, 0)));
function verstBelegt(w) { return verst.l.reduce((s, v) => s + (islandOwnerOf(v.t) === w ? v.n : 0), 0); }
function verstFrei(w) { return Math.max(0, verstPlatz(w) - verstBelegt(w)); }
// Zuschauer (Handy): die Botschaft anderer kennt nur der Weltrechner (vom Server kommt nur ihre Burg-Stufe) – er prüft Platz und Stufe
function verstUnbekannt(w) { return w !== 'player' && typeof fremdGeheim === 'function' && fremdGeheim(); }
function verstMoeglich(w) { return verstUnbekannt(w) ? !!AUF && AUF.burgStufe(w) >= AUF.BAU_AB_BURG.embassy : verstStufe(w) > 0; }
function verstHeim(v, text) {                                    // eine Verstärkung marschiert heim (zu ihrer Basis, sonst zur Hauptstadt)
    verst.l = verst.l.filter(x => x !== v); verstSpeichern();
    if (v.n >= 1) bundHeimschicken(v.w, v.t, v.von, v.n);
    if (text) { bundMelden(v.w, text); const g = islandOwnerOf(v.t); if (g && g !== v.w) bundMelden(g, text); }
}
// (Weltrechner, alle 15 s) Verstärkung bei jemandem, der nicht mehr im selben Bündnis ist oder die Basis nicht mehr hat → heim
function verstPruefen() {
    for (const v of verst.l.slice()) { const g = islandOwnerOf(v.t);
        if (!g || g === v.w || !bundVerbuendet(g, v.w)) verstHeim(v, 'Verstärkung aus ' + islandTitle(islandById[v.t]) + ' marschiert heim (nicht mehr im selben Bündnis).'); }
}
// Kampf um Basis id: vorher die Verstärkung dazu (kämpft wie die Besatzung), nachher wieder trennen – jeder trägt seinen Anteil.
// gefallen = die Basis ist weg (erobert oder Garnison geschlagen): alle Verteidiger sind gefallen.
function verstVorKampf(id) {
    const L = verst.l.filter(v => v.t === id); if (!L.length) return null;
    const G = islandTroops[id] || 0, V = L.reduce((s, v) => s + v.n, 0);
    islandTroops[id] = G + V;
    const ow = islandOwnerOf(id);                                  // jeder Helfer verteidigt seine Truppen mit SEINEN Werten (Skill, Titel, Forschung)
    const mauer = ow === 'player' ? wallDefensePct() : ow ? botBld(ow, 'wall') * 2 : 0;   // (die Mauer gehört zur Basis – sie verstärkt auch den Skill der Helfer)
    verstDefPlus[id] = ow ? L.reduce((s, v) => s + verstWert(v.w, v.n, mauer) - verstWert(ow, v.n, mauer), 0) : 0;
    return { G, V, L: L.map(v => ({ v, n0: v.n, plus: Math.round(verstWert(v.w, v.n, mauer)) })) };
}
// was n Truppen von w in einer Basis an Verteidigung mitbringen (Skill Verteidigung, Titel, Forschung; Mauer gehört zur Basis)
function verstWert(w, n, mauer) {
    const s = w === 'player' ? (skills.defense || 0) * SKILL_DEFS.defense.defPct / 100 : (botMults(w).defensePct || 0) / 100;
    const kk = AUF ? AUF.kampf(w, 'd') : 1;
    return n * s * (1 + (mauer || 0) / 100) * titleMult(w, 'defense') * kk + n * (kk - 1);
}
function verstNachKampf(id, k, gefallen) {
    delete verstDefPlus[id];
    if (!k) return null;
    const tot = k.G + k.V, rest = gefallen ? 0 : Math.max(0, Math.min(tot, islandTroops[id] || 0)), weg = tot - rest, helfer = [];
    let restV = 0;
    for (const x of k.L) {
        const f = Math.min(x.n0, Math.floor(weg * x.n0 / Math.max(1, tot)));   // (abrunden: zusammen nie mehr als gefallen)
        const wd = f > 0 ? (x.v.w === 'player' ? hospitalTake(f) : botHospitalTake(x.v.w, f)) || 0 : 0;   // seine Verwundeten in sein Krankenhaus
        x.v.n = x.n0 - f; restV += x.v.n;
        helfer.push({ w: x.v.w, name: bundName(x.v.w), n: x.n0, plus: x.plus, k: x.n0 + x.plus, fallen: f - wd, wounded: wd, gear: fighterSnapshot(x.v.w) });
    }
    if (!gefallen && restV > rest) { let zuviel = restV - rest;            // (abgerundet: ohne eigene Besatzung bleibt den Helfern sonst mehr als übrig ist)
        for (let i = k.L.length - 1; i >= 0 && zuviel > 0; i--) { const x = k.L[i], d = Math.min(zuviel, x.v.n); x.v.n -= d; helfer[i].fallen += d; zuviel -= d; restV -= d; } }
    if (!gefallen) islandTroops[id] = Math.max(0, rest - restV);   // die Besatzung behält ihren Anteil
    verst.l = verst.l.filter(v => v.n >= 1 && !(gefallen && v.t === id)); verstSpeichern();
    return { eigen: k.G, eigenWeg: gefallen ? k.G : Math.max(0, k.G - islandTroops[id]), helfer };
}
// Kampfbericht an die Helfer (echte Spieler): derselbe große Bericht, aus ihrer Sicht
function verstBerichte(vs, basis) {
    if (!vs || !window.WELT) return;
    for (const h of vs.helfer) if (botById[h.w] && botById[h.w].mensch) WELT.bericht(h.w, Object.assign({}, basis, { rolle: 'helfer', meine: h }),
        'Deine Verstärkung in ' + islandTitle(islandById[basis.targetId]) + ': ' + fmtCompact(h.fallen + h.wounded) + ' verloren' + (h.wounded ? ' (' + fmtCompact(h.wounded) + ' ins Krankenhaus)' : '') + '.');
}

// Die Botschaft (Stadt): wer dich verstärkt – und wo deine Truppen stehen. Zurückholen/heimschicken mit einem Tipp.
function verstHtml() {
    const zuMir = verst.l.filter(v => islandOwnerOf(v.t) === 'player'), meine = verst.l.filter(v => v.w === 'player');
    const zeile = (v, wer, knopf) => '<div class="forge-row">' + icon('defense') + '<span><b>' + escapeHtml(wer) + '</b><small>' + escapeHtml(islandTitle(islandById[v.t])) + ' · ' + fmtNum(v.n) + ' Truppen</small></span>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-vheim="' + v.id + '">' + knopf + '</button></div>';
    return '<div class="sect"><h4>Verstärkung bei dir</h4><span class="sect-aside">' + fmtNum(verstBelegt('player')) + ' / ' + fmtNum(Math.floor(verstPlatz('player'))) + '</span></div>' +
        '<div class="forge-list">' + (zuMir.length ? zuMir.map(v => zeile(v, bundName(v.w), 'Heimschicken')).join('') : '<div class="forge-row is-empty">' + icon('info') + '<span>Niemand verstärkt dich gerade. Bündnis-Mitglieder können dir Truppen schicken – sie verteidigen mit, Verluste werden geteilt.</span></div>') + '</div>' +
        '<div class="sect"><h4>Deine Truppen bei anderen</h4></div>' +
        '<div class="forge-list">' + (meine.length ? meine.map(v => zeile(v, bundName(islandOwnerOf(v.t)), 'Zurückholen')).join('') : '<div class="forge-row is-empty">' + icon('info') + '<span>Tippe die Basis eines Bündnis-Mitglieds an → „Verstärkung“.</span></div>') + '</div>';
}
document.getElementById('citySheet').addEventListener('click', e => {
    const b = e.target.closest('[data-vheim]'); if (!b) return;
    const v = verst.l.find(x => x.id === b.dataset.vheim); if (!v) return;
    b.disabled = true; bundBefehl('verstZurueck', { vid: v.id }, v.w === 'player' ? 'Deine Truppen kommen zurück.' : 'Die Verstärkung marschiert heim.');
});

