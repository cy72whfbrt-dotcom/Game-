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
    for (const a of pendingAttacks) if (a.targetId === id && !a.fightEndsAt && (a.attackerBotId || 'player') !== ow && !bundVerbuendet(a.attackerBotId || 'player', ow)) { str += botSchaetzAngriff(a); at = Math.min(at, a.resolveAt); }
    for (const x of armies) if (x.mv && x.mv.to && x.mv.to.kind === 'base' && x.mv.to.id === id) { const w = armyWho(x); if (w !== ow && !bundVerbuendet(w, ow)) { str += botSchaetzArmee(x); at = Math.min(at, x.mv.resolveAt); } }
    return at < Infinity ? { str, at } : null;   // (Stärke wie die Mitspieler sie schätzen; am Handy unbekannt – 0 – der Angriff zählt trotzdem)
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
const bundMem = { chatAt: {}, chatQ: [], botNext: {}, sigGemacht: new Set(), sigGeschickt: new Set(), rallyGemacht: new Set(), rallySagt: {}, rallyWeg: {}, ziel: {}, hilfeSig: {}, runde: 0, rallyRunde: {}, rallySeh: 0, sigSeh: 0 };
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
            const schnitt = bundMacht(a) / Math.max(1, a.mit.length);
            if (a.mit.length >= BUND.MAX) {                                  // voll: tauschen nur gegen das schwächste Mitspieler-Mitglied, wenn der Bewerber viel stärker ist
                const schwach = a.mit.filter(w => w !== a.anf && botById[w] && !botById[w].mensch).sort((x, y) => staerke(x) - staerke(y))[0];
                const tausch = schwach && !bundVon(q.w) && staerke(q.w) > staerke(schwach) * 1.5;
                bundOp(a.anf, tausch ? { op: 'anfrage', w: q.w, ja: true, raus: schwach } : { op: 'anfrage', w: q.w, ja: false }); continue;
            }
            const ja = !bundVon(q.w) && (staerke(q.w) >= schnitt * .25 || nah);
            bundOp(a.anf, { op: 'anfrage', w: q.w, ja });
        }
        if (botOwnedIslands[a.anf] && !botOwnedIslands[a.anf].size && a.mit.length > 1) { const neu = a.mit.filter(w => w !== a.anf).sort((x, y) => staerke(y) - staerke(x))[0]; a.anf = neu; bundLog(a, bundName(neu) + ' führt jetzt das Bündnis.'); bundSpeichern(); }
    }
    // b) gründen: etwa ein Bündnis pro 6 Mitspieler (höchstens 5 Mitglieder – sonst blieben die meisten allein), in verschiedenen Gegenden
    const zahl = Object.values(bund.b).filter(a => botById[a.anf] && !botById[a.anf].mensch).length;
    if (zahl < Math.ceil(bots.length / 6) && Math.random() < .5) {
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
        for (const id in bund.b) { const a = bund.b[id]; if ((a.anfragen || []).some(q => q.w === bot.id)) continue;
            if (a.mit.length >= BUND.MAX && !(staerke(bot.id) > Math.min(...a.mit.filter(w => w !== a.anf).map(staerke)) * 1.5)) continue;   // voll: nur wenn sie viel stärker sind als das schwächste Mitglied
            const m = bundMitte(a); if (!m) continue; const d = Math.hypot(c.x - m.x, c.y - m.y); if (d > FRAME_HALF * .6) continue;
            const stil = a.mit.filter(w => botById[w] && botById[w].style === bot.style).length / a.mit.length;
            const s = d / FRAME_HALF - stil * .15 - Math.min(.2, bundMacht(a) / Math.max(1, staerke(bot.id)) * .01) + a.mit.length * .01;
            if (!best || s < best.s) best = { s, a }; }
        if (best) { bundOp(bot.id, { op: 'beitreten', aid: best.a.id }); bundBotGetippt(bot, now); }
    }
    // Verstärkung: nicht mehr im selben Bündnis → heim; Mitspieler holen ihre heim, wenn dort 30 Min. kein Angriff mehr lief
    verstPruefen();
    for (const v of verst.l.slice()) { const bot = botById[v.w]; if (!bot || bot.mensch) continue;
        if (bundUnterAngriff(v.t)) { v.ruhe = now; continue; }
        if (now - (v.ruhe || v.at) > 30 * 60000 && Math.random() < .3) verstHeim(v, ''); }
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
        if (a.offen && a.mit.length >= BUND.MAX - 1 && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: false });
        else if (!a.offen && a.mit.length <= Math.floor(BUND.MAX / 2) && Math.random() < .2) bundOp(a.anf, { op: 'offen', offen: true });
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
    // f) einladen (nur der Anführer, wie bei dir): ein Mitspieler als Anführer lädt ab und zu jemanden ohne Bündnis aus der Nähe
    //    ein – Mitspieler wie echte Spieler
    for (const id in bund.b) {
        const a = bund.b[id], chef = botById[a.anf]; if (!chef || chef.mensch || !botOnline(chef, now) || a.mit.length >= BUND.MAX || Math.random() > .1) continue;
        const m = bundMitte(a); if (!m) continue;
        let best = null;
        for (const w of BOT_DEFS.map(x => x.id).concat(['player'])) {
            if (w === a.anf || bundVon(w) || !bundBasen(w).size || (a.einl || []).some(q => q.w === w)) continue;
            if (botById[w] && !botById[w].mensch && bundEinzelgaenger(botById[w])) continue;
            const c = islandById[bundCap(w)]; if (!c) continue; const d = Math.hypot(c.x - m.x, c.y - m.y); if (d > FRAME_HALF * .45) continue;
            if (!best || d < best.d) best = { w, d }; }
        if (best) bundOp(a.anf, { op: 'einladen', w: best.w });
    }
    // g) eingeladen: ein Mitspieler entscheidet wie beim Beitreten (nicht allein bleiben wollen, Nähe) – nach etwas Bedenkzeit
    for (const bot of bots) {
        if (bundVon(bot.id) || !botOnline(bot, now)) continue;
        for (const a of bundEinladungen(bot.id)) { const q = a.einl.find(x => x.w === bot.id); if (!q || now - q.at < 30000) continue;
            const c = islandById[botCapitalOf(bot.id)], m = bundMitte(a), nah = c && m && Math.hypot(c.x - m.x, c.y - m.y) < FRAME_HALF * .6;
            const ja = !bundEinzelgaenger(bot) && nah && a.mit.length < BUND.MAX;
            bundOp(bot.id, { op: 'einladungAntwort', aid: a.id, ja }); if (ja) { bundBotGetippt(bot, now); break; } }
    }
    // h) näher ans Bündnis: ein Mitspieler verlegt seine Hauptstadt (wie du: auf einen EIGENEN Turm, 50 Gems) auf den Turm,
    //    der seinen Bündnis-Mitgliedern am nächsten ist – nur wenn das deutlich näher ist, und nicht öfter als sonst
    for (const bot of bots.filter(b => bundVon(b.id) && botOnline(b, now) && Math.random() < .05).slice(0, 3)) {
        const a = bundVon(bot.id), st = loadBotState()[bot.id]; if (!a || !st || (st.gems || 0) < TELEPORT_GEMS || now - (st.capMovedAt || 0) < BOT_CAP_COOLDOWN) continue;
        const andere = a.mit.filter(w => w !== bot.id).map(w => islandById[bundCap(w)]).filter(Boolean); if (!andere.length) continue;
        const VOR = .3;                                                // (Alexander 4.10.: Bündnisse ziehen nach und nach in die Mitte – der Treffpunkt liegt ein Stück näher am Thron (0,0) als die Mitglieder)
        const mx = andere.reduce((s2, c) => s2 + c.x, 0) / andere.length * (1 - VOR), my = andere.reduce((s2, c) => s2 + c.y, 0) / andere.length * (1 - VOR);
        const cap = islandById[botCapitalOf(bot.id)]; if (!cap) continue; const dJetzt = Math.hypot(cap.x - mx, cap.y - my);
        let best = null;
        for (const id of botOwnedIslands[bot.id]) { const t = islandById[id]; if (!t || t.type !== 'tower' || !botCapitalMoveOk(bot.id, id)) continue;
            const d = Math.hypot(t.x - mx, t.y - my); if (!best || d < best.d) best = { id, d }; }
        if (best && best.d < dJetzt * .6 && dJetzt - best.d > FRAME_HALF * .15 && botTeleportCapital(bot, best.id)) {
            bundLog(a, bundName(bot.id) + ' hat die Hauptstadt näher ans Bündnis verlegt.'); bundSpeichern(); bundBotGetippt(bot, now); }
    }
}
// Signale der Mitglieder: angegriffen und allein zu schwach → „Hilfe!“ – auch für echte Spieler (Alexander 5.10.: die
// Verbündeten helfen ihnen ohne Knopfdruck, ob sie gerade online sind oder nicht)
function bundMitspielerSignale(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const w of a.mit) {
            const bot = botById[w]; if (!bot || (!bot.mensch && !botOnline(bot, now)) || now - (bundMem.hilfeSig[w] || 0) < 4 * 60000) continue;   // höchstens alle 4 Min. ein Hilferuf
            for (const t of botThreatened(w)) {
                const k = w + ':' + t, last = bundMem.hilfeSig[k] || ((a.sig || []).find(s => s.w === w && s.z === t && s.art === 'hilfe') || {}).at; if (last && now - last < 5 * 60000) continue;
                const g = bundUnterAngriff(t); if (!g || g.at - now < 8000) continue;
                const isl = islandById[t], def = effectiveTroops(isl) + effectiveDefense(isl);
                if (def >= g.str * 1.1) continue;                   // (auch die Hauptstadt – Alexander 5.10.: alle Basen gleich)
                if (!isCapital(t) && (islandLevels[t] || 1) < 5 && (islandTroops[t] || 0) < whoTroops(w) * .05 && isl.type === 'tower') continue;   // nur für Basen, um die es sich lohnt (die Hauptstadt immer)
                if (bot.mensch && !verstStufe(w)) {                     // echter Spieler ohne Botschaft: keiner kann helfen – kein Signal, nur die Meldung an ihn
                    if (bundEinmal('hb|' + w)) bundMelden(w, 'Deine Verbündeten können dir nicht helfen: du hast noch keine Botschaft (ab Burg-Stufe 5).');
                    break; }
                if (!bundSignal(a, w, 'hilfe', t)) { bundMem.hilfeSig[k] = bundMem.hilfeSig[w] = now; bundSpeichern(); }
                break;
            }
        }
    }
    for (const k in bundMem.hilfeSig) if (now - bundMem.hilfeSig[k] > 10 * 60000) delete bundMem.hilfeSig[k];
}
// Mitspieler antworten im Chat – kurz danach, wie ein Mensch, und nur, was sie dann auch tun
function bundChatAntworten(a, who, k) {
    const now = Date.now(), on = a.mit.filter(w => w !== who && botById[w] && !botById[w].mensch && botOnline(botById[w], now));
    const spaeter = (w, kk, z, tat) => bundMem.chatQ.push({ at: now + 3000 + Math.random() * 15000, aid: a.id, w, k: kk, z: z === undefined ? null : z, tat });
    const c = bundChat[a.id], geteilt = c && c.l.slice().reverse().find(x => x.k === 'teilen' && now - x.at < 10 * 60000);
    if (k === 'angriff') {
        const z = geteilt ? geteilt.z : null;
        if (z === null) { if (on[0]) spaeter(on[0], 'wo'); return; }   // noch kein Ziel geteilt: „Wo?“
        for (const w of on.slice(0, 4)) { const ok = !bundZielOk(w, z) && botFreeSlots(botById[w]) > 0 && !(botById[w].style === 'builder' && Math.random() < .6);
            spaeter(w, ok ? (Math.random() < .5 ? 'ja' : 'dabei') : (Math.random() < .5 ? 'nein' : 'spaeter'), null, ok ? { ziel: z } : null); }
    } else if (k === 'rally' || k === 'rallyBitte') {
        // läuft schon eine Rally des Bündnisses: wer kann, kommt dazu (das Mitmachen selbst macht bundMitspielerRally)
        const lauf = k === 'rally' && bund.r.some(r => r.aid === a.id && now < r.los - 5000);
        if (lauf) { for (const w of on.slice(0, 4)) spaeter(w, botFreeSlots(botById[w]) > 0 ? 'dabei' : 'nein'); return; }
        // sonst: einer startet sie auf das geteilte Ziel – wer es erreicht und Truppen hat. „Ja“ heißt: er startet sie wirklich.
        const z = geteilt ? geteilt.z : null;
        if (z === null) { if (on[0]) spaeter(on[0], 'wo'); return; }   // noch kein Ziel geteilt
        let wer = null, plan = null;
        for (const w of on) { if (bund.r.some(r => r.by === w) || botFreeSlots(botById[w]) <= 0 || bundZielOk(w, z)) continue;
            const p = bundRallyFuer(w, z, now); if (p) { wer = w; plan = p; break; } }
        if (!wer) {                                                    // keiner von ihnen kommt ans Ziel (Tor zu) – beitreten geht aber immer: „Starte du“, wenn du hinkommst
            const T = islandById[z], weg = w => [...(w === 'player' ? ownedIslands : botOwnedIslands[w] || [])].some(id => islandById[id] && routeFor(islandById[id].landmassId, T.landmassId, w));
            if (weg(who) && !bundZielOk(who, z)) { for (const w of on.slice(0, 4)) if (botFreeSlots(botById[w]) > 0) spaeter(w, w === on[0] ? 'machdu' : 'dabei'); }
            else if (on[0]) spaeter(on[0], 'keinweg');
            return; }
        spaeter(wer, 'starte', null, { rally: plan });
        for (const w of on.filter(x => x !== wer).slice(0, 3)) if (botFreeSlots(botById[w]) > 0) spaeter(w, 'dabei');
    } else if (k === 'online') { for (const w of on.slice(0, 4)) spaeter(w, 'binon'); }
    else if (k === 'wann') { if (on[0]) spaeter(on[0], Math.random() < .7 ? 'jetzt' : 'spaeter'); }
    else if (k === 'wo') {                                         // ein Mitspieler mit einem Ziel teilt es
        for (const w of on) { const zi = bundMem.ziel[w]; if (zi && now < zi.until) { spaeter(w, 'teilen', zi.t); break; } }
    }
}
function bundChatTakt(now) {                                      // (Weltrechner) fällige Antworten der Mitspieler schreiben
    if (!bundMem.chatQ.length) return;
    const bleibt = [];
    for (const q of bundMem.chatQ) {
        if (now < q.at) { bleibt.push(q); continue; }
        const a = bund.b[q.aid]; if (!a || !a.mit.includes(q.w)) continue;
        if (q.k === 'teilen') { bundOp(q.w, { op: 'chat', k: 'teilen', z: q.z }); continue; }
        if (q.tat && q.tat.rally) {                                   // „Ja, ich starte die Rally!“ – und er tut es (sonst sagt er, dass es nicht geht)
            if (bund.r.some(r => r.by === q.w) || bundRallyFuer(q.w, q.tat.rally.ziel, now) === null) { bundChatDazu(a, q.w, 'nein'); continue; }   // (geht inzwischen nicht mehr)
            bundChatDazu(a, q.w, 'starte');
            if (bundRallyStart(a, q.w, q.tat.rally)) bundChatDazu(a, q.w, 'nein'); else bundSpeichern();   // (bundRallyStart schreibt „hat eine Rally gestartet“ dazu)
            continue;
        }
        bundChatDazu(a, q.w, q.k, q.z);
        if (q.tat && q.tat.ziel !== undefined) bundMem.ziel[q.w] = { t: q.tat.ziel, until: now + 10 * 60000 };   // „Ja“ heißt: sie greifen das geteilte Ziel an
    }
    bundMem.chatQ = bleibt;
}
// Antworten mit Taten: Hilfe schicken, mit angreifen, zur Rally kommen
function bundMitspielerAntworten(now) {
    for (const id in bund.b) {
        const a = bund.b[id];
        for (const s of a.sig || []) {
            if (now - s.at > 3 * 60000) continue;
            if (s.art === 'hilfe' || s.art === 'verteidigen') {
                const g = bundUnterAngriff(s.z); if (!g) continue;
                const isl = islandById[s.z], ow = islandOwnerOf(s.z), kommt = pendingSends.filter(x => x.toId === s.z && !x.back && x.resolveAt < g.at).reduce((n, x) => n + x.troops, 0);
                let fehlt = g.str * 1.2 - (effectiveTroops(isl) + effectiveDefense(isl) + kommt); if (fehlt <= 0) continue;
                if (!verstStufe(ow) || verstFrei(ow) < 1) {                // ohne Botschaft (oder voll) kann keiner helfen – sag es dem Spieler einmal, statt still nichts
                    if (bundEinmal('hb|' + ow)) bundMelden(ow, 'Deine Verbündeten können dir nicht helfen: ' + (verstStufe(ow) ? 'deine Botschaft ist voll' : 'du hast noch keine Botschaft (ab Burg-Stufe 5)') + '.');
                    continue; }
                let offen = false;                                          // (ein Helfer kann später noch: gerade nicht bereit / kein Marsch-Platz)
                for (const w of a.mit) {
                    const bot = botById[w], key = s.id + ':' + w; if (fehlt <= 0) break;
                    if (!bot || bot.mensch || w === ow || bundMem.sigGemacht.has(key)) continue;
                    if (!bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) { if (botOnline(bot, now)) offen = true; continue; }
                    bundMem.sigGemacht.add(key);                            // (geschickt oder kommt nicht rechtzeitig: dieser Helfer ist für das Signal fertig)
                    const thr = botThreatened(w); let best = null;
                    for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId) continue; const n = Math.floor((islandTroops[sid] || 0) * .5); if (n < 1000) continue;
                        const src = islandById[sid]; if (!bundWeg(src.landmassId, isl.landmassId, w, n)) continue;
                        const eta = travelDurationSeconds(src, isl, w) * 1000; if (now + eta > g.at - 1500) continue;
                        if (!best || n > best.n) best = { id: sid, n }; }
                    if (!best) continue;
                    const give = Math.min(best.n, Math.ceil(fehlt));
                    if (!bundHilfe(w, best.id, s.z, give)) { fehlt -= give; bundMem.sigGeschickt.add(s.id); bundBotGetippt(bot, now); bundMem.chatQ.push({ at: now + 1500 + Math.random() * 4000, aid: a.id, w, k: 'unterwegs', z: null }); }
                }
                if (!offen && fehlt > 0 && !bundMem.sigGeschickt.has(s.id) && bundEinmal('kh|' + ow + '|' + s.z)) bundMelden(ow, 'Keiner deiner Verbündeten kommt rechtzeitig an.');
            } else if (s.art === 'angriff') {
                for (const w of a.mit) { const bot = botById[w]; if (!bot || bot.mensch || w === s.w || bundMem.sigGemacht.has(s.id + ':' + w)) continue;
                    bundMem.sigGemacht.add(s.id + ':' + w);
                    if (bot.style === 'builder' && Math.random() < .6) continue;                      // nicht jeder zieht mit
                    bundMem.ziel[w] = { t: s.z, until: now + 10 * 60000 }; }
            }
        }
    }
    if (bundMem.sigGemacht.size > 5000) { bundMem.sigGemacht.clear(); bundMem.sigGeschickt.clear(); }
}
function bundMitspielerRally(now) {
    // a) mitmachen: wer einen Weg hat, schickt einen guten Teil einer großen Basis (zu spät am Sammelpunkt → folgt direkt zum Ziel)
    for (const r of bund.r) {
        const a = bund.b[r.aid]; if (!a || now > r.los - 4000) continue;
        const at = islandById[r.at];
        for (const w of a.mit) {
            const bot = botById[w], key = r.id + ':' + w; if (!bot || bot.mensch || w === r.by || bundMem.rallyGemacht.has(key) || r.j.some(j => j.w === w) || !bundBotBereit(bot, now) || botFreeSlots(bot) <= 0) continue;
            const zielOw = islandOwnerOf(r.t); if (zielOw && (bundVerbuendet(w, zielOw) || zielOw === w)) continue;
            const thr = botThreatened(w); let best = null;
            for (const sid of botOwnedIslands[w]) { if (thr.has(sid) || sid === megaTempleId || sid === r.at) continue; const n = Math.floor((islandTroops[sid] || 0) * (botStyle(bot).commit || .7) * .8); if (n < 1000) continue;
                const src = islandById[sid];                                // (Tore egal beim Beitreten)
                if (!best || n > best.n) best = { id: sid, n }; }
            bundMem.rallyGemacht.add(key);
            // (Rally eines echten Spielers: die Mitspieler sagen im Chat, ob sie kommen – vorher kam einfach keiner, ohne ein Wort)
            const sagen = k2 => { if (botById[r.by] && botById[r.by].mensch && (bundMem.rallySagt[r.id] = (bundMem.rallySagt[r.id] || 0) + 1) <= 4)
                bundMem.chatQ.push({ at: now + 2000 + Math.random() * 6000, aid: a.id, w, k: k2, z: null }); };
            if (!best) continue;                                            // (keine Basis mit genug Truppen)
            if (bot.style === 'builder' && Math.random() < .5) { sagen('nein'); continue; }
            const k0 = pendingSends.length;
            const hp = botPickHero(w, islandById[best.id], islandById[r.t], best.n, true);   // (seine Helden kommen mit – wie bei jedem seiner Angriffe)
            if (!bundRallyDazu(a, w, { rid: r.id, von: best.id, n: best.n, held: hp[0], held2: hp[1] })) { bundBotGetippt(bot, now); bundSpeichern(); sagen('unterwegs');
                const m = pendingSends.length > k0 ? pendingSends[pendingSends.length - 1] : null, st = loadBotState()[w];   // zu spät für den Start? mit Gems beschleunigen (wie du: halbiert die Zeit, 1 Gem pro Minute)
                for (let i = 0; m && st && i < 4 && m.resolveAt > r.los - 2000; i++) { const c = speedUpCost(m); if ((st.gems || 0) < c * 2) break;
                    st.gems -= c; const rem = m.resolveAt - now, pr = Math.max(0, Math.min(.99, (now - m.startedAt) / Math.max(1, m.resolveAt - m.startedAt))); m.resolveAt = now + rem / 2; m.startedAt = m.resolveAt - (rem / 2) / (1 - pr); }
                if (m && st) saveBotState(); }
        }
    }
    if (bundMem.rallyGemacht.size > 5000) { bundMem.rallyGemacht.clear(); bundMem.rallySagt = {}; }
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
// Eine Rally auf ein bestimmtes Ziel (Chat: „machst du eine Rally?“): die stärkste freie Basis mit Weg dorthin → Plan oder null
function bundRallyFuer(w, z, now) {
    const T = islandById[z], thr = botThreatened(w); if (!T) return null; let best = null;
    for (const id of botOwnedIslands[w] || []) { if (thr.has(id) || id === megaTempleId) continue;
        const n = Math.floor((islandTroops[id] || 0) * .8), I = islandById[id]; if (n < 5000 || !I) continue;
        if (!routeFor(I.landmassId, T.landmassId, w) || !bundWeg(I.landmassId, T.landmassId, w, n)) continue;
        if (!best || n > best.n) best = { basis: id, ziel: z, min: 3, n }; }
    return best;
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
    for (const r of bund.r.slice()) if (now >= r.los) try { bundRallyLos(r); } catch (e) { bund.r = bund.r.filter(x => x !== r); console.warn('Rally:', e); }   // (eine kaputte Rally hält den Takt nicht an)
    try { bundChatTakt(now); } catch (e) { if (!bundTakt.chatGewarnt) { bundTakt.chatGewarnt = true; console.warn('Bündnis-Chat:', e); } }
    for (const id in bund.b) { const a = bund.b[id], vor = (a.sig || []).length; a.sig = (a.sig || []).filter(s => now - s.at < 30 * 60000); if (a.sig.length !== vor) geaendert = true;
        const q = (a.anfragen || []).length; a.anfragen = (a.anfragen || []).filter(x => now - x.at < 24 * 3600000 && !bundVon(x.w)); if (a.anfragen.length !== q) geaendert = true;
        const e = (a.einl || []).length; a.einl = (a.einl || []).filter(x => now - x.at < BUND_EINL_MS && !bundVon(x.w) && botById[x.w]); if (a.einl.length !== e) geaendert = true;
        if (!a.mit.length) { delete bund.b[id]; geaendert = true; } else if (!a.mit.includes(a.anf)) { a.anf = a.mit[0]; geaendert = true; } }
    if (geaendert) bundSpeichern();
    try {
        bundWegMem.clear();
        if (now - bundMem.sigSeh > 2500) { bundMem.sigSeh = now; bundMitspielerSignale(now); bundMitspielerAntworten(now); }
        if (now - bundMem.rallySeh > 4000) { bundMem.rallySeh = now; bundMitspielerRally(now); }
        if (now - bundMem.runde > 15000) { bundMem.runde = now; bundMitspielerRunde(now); bundHilfeTakt(now); }
    } catch (e) { if (!bundTakt.gewarnt) { bundTakt.gewarnt = true; console.warn('Bündnisse:', e); } }
}
setInterval(bundTakt, 1000);

// ==============================================================================================================
// 6) FENSTER „Bündnis“ (Zuschauer)
// ==============================================================================================================
const bundPopup = document.getElementById('bundPopup'), bundBody = document.getElementById('bundLive'), bundOben = document.getElementById('bundOben');
let bundTab = 'info', bundWahl = null, bundSicher = {}, bundTauschFuer = null;   // bundTauschFuer: Bewerber, für den der Anführer gerade jemanden zum Tauschen wählt        // bundWahl: offene Auswahl (Rally starten / mitmachen / Hilfe senden)
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
    const ch0 = document.getElementById('bdChat'), unten = !ch0 || ch0.scrollHeight - ch0.scrollTop - ch0.clientHeight < 40, pos = ch0 ? ch0.scrollTop : 0;   // Chat: unten bleiben, wenn man unten war
    liveHtml(bundBody, bundTab === 'info' ? (a ? bundInfoHtml(a) : bundOhneHtml()) : bundTab === 'sig' ? (a ? bundChatHtml(a) : bundOhneHtml())
        : bundTab === 'rally' ? (a ? bundRallyHtml(a) : bundOhneHtml()) : bundSuchenHtml(a));
    const ch = document.getElementById('bdChat'); if (ch) ch.scrollTop = unten ? ch.scrollHeight : pos;
}
function bundEinladungenHtml() {                                  // an mich: Annehmen / Ablehnen
    const L = bundEinladungen('player'); if (!L.length || bundIch()) return '';
    return '<div class="sect"><h4>Einladungen</h4><span class="sect-aside">' + L.length + '</span></div><div class="bd-liste">' + L.map(x => { const q = x.einl.find(y => y.w === 'player');
        return '<div class="bd-zeile">' + bundZeichenHtml(x) + '<span class="bd-name"><b>[' + escapeHtml(x.tag) + '] ' + escapeHtml(x.name) + '</b><small>' + x.mit.length + ' / ' + BUND.MAX + ' · Macht ' + fmtCompact(bundMacht(x)) + ' · von ' + escapeHtml(bundName(x.anf)) + ' · noch ' + uhrHtml(q.at + BUND_EINL_MS, 'clock') + '</small></span>' +
            (x.mit.length >= BUND.MAX ? '<span class="chip">voll</span>' : '<button type="button" class="btn btn--primary btn--sm" data-bact="einlJa" data-aid="' + x.id + '">Annehmen</button>') +
            '<button type="button" class="btn btn--ghost btn--sm" data-bact="einlNein" data-aid="' + x.id + '">Ablehnen</button></div>'; }).join('') + '</div>';
}
function bundOhneHtml() { return bundEinladungenHtml() + '<div class="notice">' + icon('info') + '<span>Du bist in keinem Bündnis. Unter „Suchen“ kannst du einem beitreten oder selbst eines gründen.</span><button type="button" class="btn btn--secondary btn--sm" data-bact="tab" data-t="suchen">Suchen</button></div>'; }
function bundInfoHtml(a) {
    const chef = a.anf === 'player', bon = bundBonus(a), heute = a.gesch && a.gesch.tag === bundTagHeute() ? (a.gesch.n || {}).player || 0 : 0, now = Date.now();
    const mit = a.mit.slice().sort((x, y) => (y === a.anf) - (x === a.anf) || staerke(y) - staerke(x));
    return '<div class="bd-kopf">' + bundZeichenHtml(a, true) + '<div><b>[' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) + '</b><small>Macht ' + fmtCompact(bundMacht(a)) + ' · ' + (a.offen ? 'offen für alle' : 'nur auf Anfrage') + '</small></div></div>' +
        '<div class="stat-grid">' + statTile('Tempel-Bonus', 'temple', '+' + bon.pct + ' %', bon.pct ? 'is-good' : '') + statTile('Gebiet', 'send', '+10 % Tempo') + '</div>' +
        '<div class="notice">' + icon('temple') + '<span>' + (bon.n.t || bon.n.m ? 'Dein Bündnis hält ' + (bon.n.t ? bon.n.t + ' Tempel' : '') + (bon.n.t && bon.n.m ? ' und ' : '') + (bon.n.m ? 'den Mega-Tempel' : '') + ': alle Mitglieder produzieren +' + bon.pct + ' % Münzen und Truppen.'
            : 'Hält ein Mitglied einen Tempel, produzieren alle Mitglieder mehr: +' + BUND.TEMPEL_PCT + ' % je Tempel, Mega-Tempel +' + BUND.MEGA_PCT + ' % (höchstens +' + BUND.BONUS_MAX + ' %).') + ' Im eigenen Gebiet marschiert ihr 10 % schneller.</span></div>' +
        bundHilfeHtml(a) +
        '<div class="notice">' + icon('shop') + '<span>Bündnis-Geschenke heute: ' + heute + ' / ' + BUND.GESCHENKE_TAG + ' – wenn ein Mitglied einen Boss besiegt oder eine große Kiste kauft.</span></div>' +
        (chef && (a.anfragen || []).length ? '<div class="sect"><h4>Anfragen</h4></div><div class="bd-liste">' + a.anfragen.map(q => '<div class="bd-zeile"><span class="bd-name">' + whoLink(q.w, bundName(q.w)) + '<small>Macht ' + fmtCompact(staerke(q.w)) + ' · ' + bundBasenText(q.w) + '</small></span>' +
            (a.mit.length >= BUND.MAX ? '<button type="button" class="btn btn--primary btn--sm" data-bact="tauschWahl" data-w="' + q.w + '">Tauschen</button>' : '<button type="button" class="btn btn--primary btn--sm" data-bact="anfrage" data-w="' + q.w + '" data-ja="1">Ja</button>') +
            '<button type="button" class="btn btn--secondary btn--sm" data-bact="anfrage" data-w="' + q.w + '">Nein</button></div>' +
            (bundTauschFuer === q.w && a.mit.length >= BUND.MAX ? '<div class="notice">' + icon('info') + '<span>Wer geht für ' + escapeHtml(bundName(q.w)) + ' (Macht ' + fmtCompact(staerke(q.w)) + ')?</span></div>' +
                a.mit.filter(w => w !== 'player').sort((x, y) => staerke(x) - staerke(y)).map(w => '<div class="bd-zeile"><span class="bd-name">' + escapeHtml(bundName(w)) + '<small>Macht ' + fmtCompact(staerke(w)) + ' · ' + bundBasenText(w) + '</small></span>' +
                    '<button type="button" class="btn btn--ghost btn--sm" data-bact="tausch" data-w="' + q.w + '" data-raus="' + w + '">' + bundSicherKnopf('tausch:' + w, 'Entfernen', 'Sicher?') + '</button></div>').join('') : '')).join('') + '</div>' : '') +
        (chef && (a.einl || []).length ? '<div class="sect"><h4>Eingeladen</h4></div><div class="bd-liste">' + a.einl.map(q => '<div class="bd-zeile"><span class="bd-name">' + whoLink(q.w, bundName(q.w)) + '<small>Macht ' + fmtCompact(staerke(q.w)) + ' · noch ' + uhrHtml(q.at + BUND_EINL_MS, 'clock') + '</small></span>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-bact="einlWeg" data-w="' + q.w + '">Zurückziehen</button></div>').join('') + '</div>' : '') +
        (chef && a.mit.length < BUND.MAX ? '<div class="notice">' + icon('info') + '<span>Jemanden einladen: unter „Suchen“ stehen alle ohne Bündnis – oder tippe seine Basis bzw. seinen Namen an → „Einladen“.</span></div>' : '') +
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
function bundChatText(x, du) {                                    // was eine Zeile sagt (ohne den Namen; du: die eigene Zeile – „Du hast …“)
    const C = BUND_CHAT[x.k]; if (!C) return '';
    const ort = x.z !== null && x.z !== undefined && islandById[x.z] ? bundZielName(islandById[x.z]) : '';
    if (x.k === 'teilen') return (du ? 'hast ' : 'hat ') + (ort || 'einen Ort') + ' geteilt';
    if (x.k === 's_rally') return (du ? 'hast' : 'hat') + ' eine Rally auf ' + (ort || 'ein Ziel') + ' gestartet';
    if (x.k === 's_rein') return du ? 'bist dem Bündnis beigetreten' : C.t;
    if (x.k === 's_raus') return du ? 'bist nicht mehr im Bündnis' : C.t;
    if (x.k === 'hilfe' && ort) return 'Brauche Hilfe! (' + ort + ')';
    return C.t;
}
function bundChatZeilen(a) { const c = bundChat[a.id]; return c && Array.isArray(c.l) ? c.l : []; }
function bundChatHtml(a) {
    const l = bundChatZeilen(a).slice(-50), now = Date.now();
    const knopf = k => '<button type="button" class="btn btn--secondary btn--sm" data-bact="chat" data-k="' + k + '">' + escapeHtml(BUND_CHAT[k].t) + '</button>';
    return '<div class="bd-chat" id="bdChat">' + (l.length ? l.map(x => { const mir = x.w === 'player', sys = BUND_CHAT[x.k] && BUND_CHAT[x.k].g === 's', ort = x.z !== null && x.z !== undefined && islandById[x.z];
            return '<div class="bd-cz' + (mir ? ' is-me' : '') + (sys ? ' is-sys' : '') + (x.k === 'hilfe' ? ' is-hilfe' : '') + '"><b>' + (mir ? 'Du' : escapeHtml(bundName(x.w))) + (BUND_CHAT[x.k] && 'fa'.includes(BUND_CHAT[x.k].g) ? ':' : '') + '</b> <span>' + escapeHtml(bundChatText(x, mir)) + '</span>' +
                (ort ? ' <button type="button" class="btn btn--ghost btn--sm" data-bact="zeigen" data-z="' + x.z + '">Zeigen</button>' : '') + '<small>' + uhrHtml(x.at, 'vor') + '</small></div>'; }).join('')
            : '<div class="inbox-empty">Noch ist es ruhig. Frag dein Bündnis – oder tippe eine Basis an → „Im Chat teilen“.</div>') + '</div>' +
        '<div class="bd-ck"><span>Fragen</span>' + Object.keys(BUND_CHAT).filter(k => BUND_CHAT[k].g === 'f').map(knopf).join('') + '</div>' +   // (alle festen Sätze aus BUND_CHAT – kein zweites Verzeichnis)
        '<div class="bd-ck"><span>Antworten</span>' + Object.keys(BUND_CHAT).filter(k => BUND_CHAT[k].g === 'a').map(knopf).join('') + '</div>';
}
function bundChatNeu() {                                          // (Handy) neuer Chat vom Weltrechner: kurzer Hinweis, wenn das Fenster zu ist
    let v = null; try { v = JSON.parse(store.get('openWaterBundChat')); } catch (e) {}
    const alt = bundChat; bundChat = v && typeof v === 'object' ? v : {};
    const a = bundIch(); if (!a || SYSTEM) return;
    const vorher = new Set(((alt[a.id] && alt[a.id].l) || []).map(x => x.id)), seit = Date.now() - 20000;
    const neu = bundChatZeilen(a).filter(x => !vorher.has(x.id) && x.w !== 'player' && x.at > seit).pop();
    if (neu && !(isPanelOpen(bundPopup) && bundTab === 'sig') && Date.now() - (bundMem.hinweisAt || 0) > 20000) { bundMem.hinweisAt = Date.now(); flashHint('Bündnis · ' + bundName(neu.w) + ': ' + bundChatText(neu), 4500); }
}
function bundRallyZeile(r, meins) {
    const now = Date.now(), ziel = islandById[r.t], mein = r.j.filter(j => j.w === 'player').reduce((s, j) => s + j.n, 0) + (r.by === 'player' ? r.n0 : 0);
    return '<div class="bd-zeile bd-rally' + (meins ? '' : ' is-feind') + '"><span class="bd-sic">' + icon(meins ? 'flag' : 'attack') + '</span><span class="bd-name"><b>' + (meins ? 'Rally auf ' : 'Gefahr: Rally auf ') + escapeHtml(bundZielName(ziel)) + '</b>' +
        '<small>' + escapeHtml(bundName(r.by)) + (meins && r.held && heroById(r.held) ? ' mit ' + heroById(r.held).name + (r.held2 && heroById(r.held2) ? ' & ' + heroById(r.held2).name : '') : '') + ' · los in ' + uhrHtml(r.los, 'clock') + (meins ? ' · ' + fmtCompact(bundRallyTruppen(r)) + ' bereit' + (bundRallyUnterwegs(r) ? ' + ' + fmtCompact(bundRallyUnterwegs(r)) + ' unterwegs' : '') + ' · ' + (new Set([r.by].concat(r.j.map(j => j.w))).size) + ' dabei' + (mein ? ' · du: ' + fmtCompact(mein) : '') : '') + '</small></span>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-bact="zeigen" data-z="' + r.at + '">Zeigen</button>' +
        (meins && now < r.los - 2000 ? '<button type="button" class="btn btn--primary btn--sm" data-bact="dazuWahl" data-rid="' + r.id + '">Mitmachen</button>' : '') +
        (meins && (r.by === 'player' || bundIch().anf === 'player') ? '<button type="button" class="btn btn--ghost btn--sm" data-bact="abbruch" data-rid="' + r.id + '">' + bundSicherKnopf('abbruch:' + r.id, 'Abbrechen', 'Sicher?') + '</button>' : '') +
        (meins && r.j.length ? '<div class="bd-rally-mit">' + r.j.map(j => { const m = !j.da && pendingSends.find(x => x.rally === r.id && (x.senderBotId || 'player') === j.w && !x.back);   // wer mitmacht: angekommen oder unterwegs (mit Ankunft)
            return '<small>' + escapeHtml(bundName(j.w)) + ' · ' + fmtCompact(j.n) + ' · ' + (j.da ? '✓ da' : m ? 'unterwegs, da in ' + uhrHtml(m.resolveAt, 'marsch') + (m.resolveAt > r.los ? ' (folgt zum Ziel)' : '') : 'unterwegs') + '</small>'; }).join('') + '</div>' : '') + '</div>';
}
function bundRallyHtml(a) {
    const meine = bund.r.filter(r => r.aid === a.id), gegen = bund.r.filter(r => r.aid !== a.id && bundVerbuendet('player', islandOwnerOf(r.t)) || r.aid !== a.id && islandOwnerOf(r.t) === 'player');
    return '<div class="notice">' + icon('info') + '<span>Rally: ein Mitglied sammelt Truppen an seiner Basis, die anderen schicken ihre dazu (Tore egal – nur wer startet, braucht den Weg zum Ziel). Nach Ablauf (1, 3 oder 5 Min.) marschiert alles als EIN Angriff los; wer später ankommt, zieht direkt zum Ziel nach. Jeder kämpft mit seinen eigenen Werten, der Anführer nimmt Haupt- und Zweitheld mit. Beute (Gold, Holz, Stein, Eisen – nur an der Hauptstadt) und Überlebende gehen nach Truppen zurück. Starten: feindliches Ziel antippen → „Rally“.</span></div>' +
        '<div class="bd-liste">' + (meine.length ? meine.map(r => bundRallyZeile(r, true)).join('') : '<div class="inbox-empty">Gerade läuft keine Rally.</div>') + '</div>' +
        (gegen.length ? '<div class="sect"><h4>Gegen euch</h4></div><div class="bd-liste">' + gegen.map(r => bundRallyZeile(r, false)).join('') + '</div>' : '');
}
function bundSuchenHtml(a) {
    const alle = Object.values(bund.b).map(x => ({ x, m: bundMacht(x) })).sort((p, q) => q.m - p.m), angefragt = id => (bund.b[id].anfragen || []).some(q => q.w === 'player');
    return (a ? bundOhneListeHtml() + '<div class="notice">' + icon('info') + '<span>Du bist in [' + escapeHtml(a.tag) + '] ' + escapeHtml(a.name) + '. Um zu wechseln, verlasse erst dein Bündnis.</span></div>' : bundEinladungenHtml()) +
        '<div class="sect"><h4>Alle Bündnisse</h4><span class="sect-aside">' + alle.length + '</span></div><div class="bd-liste">' + (alle.length ? alle.map(({ x, m }) =>
            '<div class="bd-zeile">' + bundZeichenHtml(x) + '<span class="bd-name"><b>[' + escapeHtml(x.tag) + '] ' + escapeHtml(x.name) + '</b><small>' + x.mit.length + ' / ' + BUND.MAX + ' · Macht ' + fmtCompact(m) + ' · ' + (x.mit.length >= BUND.MAX ? 'voll – der Anführer kann tauschen' : x.offen ? 'offen' : 'auf Anfrage') + ' · Anführer ' + escapeHtml(bundName(x.anf)) + '</small></span>' +
            (a ? '' : angefragt(x.id) ? '<button type="button" class="btn btn--ghost btn--sm" data-bact="anfrageWeg">Angefragt ✕</button>'
                : '<button type="button" class="btn btn--primary btn--sm" data-bact="beitreten" data-aid="' + x.id + '">' + (x.offen && x.mit.length < BUND.MAX ? 'Beitreten' : 'Anfragen') + '</button>') + '</div>').join('')
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
function bundQuellen(ziel, frist, toreEgal) {                     // eigene Basen, die ziel erreichen (frist: rechtzeitig bis dahin; toreEgal: Rally beitreten)
    const out = [], now = Date.now();
    for (const id of ownedIslands) { if (id === ziel.id) continue; const n = islandTroops[id] || 0; if (n < 1) continue; const s = islandById[id];
        if (!toreEgal && !routeFor(s.landmassId, ziel.landmassId, 'player')) continue;
        const eta = travelDurationSeconds(s, ziel) * 1000; if (frist && now + eta > frist - 1000) continue;
        out.push({ id, n, eta }); }
    return out.sort((x, y) => y.n - x.n).slice(0, 40);
}
function bundWahlHtml() {
    const w = bundWahl, ziel = islandById[w.mode === 'rally' ? w.t : w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach];
    if (!ziel) { bundWahl = null; return ''; }
    const r = w.mode === 'dazu' ? bund.r.find(x => x.id === w.rid) : null;
    const q = w.mode === 'rally' ? [...ownedIslands].filter(id => (islandTroops[id] || 0) >= 1 && id !== ziel.id && routeFor(islandById[id].landmassId, ziel.landmassId, 'player')).map(id => ({ id, n: islandTroops[id] || 0, eta: travelDurationSeconds(islandById[id], ziel) * 1000 })).sort((x, y) => y.n - x.n).slice(0, 40)
        : bundQuellen(ziel, undefined, w.mode === 'dazu');   // (Rally beitreten: jederzeit und Tore egal – wer zu spät kommt, folgt direkt zum Ziel)   // (Verstärkung: jederzeit – sie bleibt dort, bis du sie zurückholst)
    if (w.von === undefined || !q.some(x => x.id === w.von)) w.von = q.length ? q[0].id : null;
    const titel = w.mode === 'rally' ? 'Rally auf ' + bundZielName(ziel) : w.mode === 'dazu' ? 'Mitmachen: Rally auf ' + bundZielName(islandById[r.t]) : 'Verstärkung für ' + bundName(islandOwnerOf(ziel.id)) + ' · ' + islandTitle(ziel);
    return '<div class="bd-form bd-wahl"><div class="sect"><h4>' + escapeHtml(titel) + '</h4></div>' +
        (q.length ? '<label class="bd-feld"><span>' + (w.mode === 'rally' ? 'Sammelpunkt (deine Basis)' : 'Von Basis') + '</span><select id="bdVon">' + q.map(x => '<option value="' + x.id + '"' + (x.id === w.von ? ' selected' : '') + '>' + escapeHtml(islandTitle(islandById[x.id])) + ' · ' + fmtCompact(x.n) + ' · ' + fmtClock(x.eta / 1000) + '</option>').join('') + '</select></label>' +
            ((w.mode === 'rally' || (w.mode === 'dazu' && r && r.by !== 'player' && !r.j.some(j => j.w === 'player' && (j.held || j.held2)))) && heroSegHtml('data-rhero', w.held) ?'<div class="bd-feld"><span>Haupt- und Zweitheld (zählen für deine Truppen)</span><div class="seg hero-seg" id="bdHeld">' + heroSegHtml('data-rhero', w.held) + '</div><div class="seg hero-seg hero-seg2" id="bdHeld2">' + heroSeg2Html('data-rhero2', w.held, w.held2) + '</div></div>' : '') +
            (w.mode === 'rally' ? '<div class="bd-feld"><span>Wartezeit</span><div class="seg" id="bdMin" style="grid-template-columns:repeat(3,1fr)">' + BUND.RALLY_MIN.map(m => '<button type="button" data-min="' + m + '" class="' + ((w.min || 3) === m ? 'on' : '') + '">' + m + ' Min.</button>').join('') + '</div></div>' : '') +
            '<div class="bd-feld"><span>Truppen</span><div class="seg" id="bdAnteil">' + [.25, .5, .75, 1].map(f => '<button type="button" data-f="' + f + '" class="' + ((w.f || 1) === f ? 'on' : '') + '">' + (f === 1 ? 'Alle' : f * 100 + ' %') + '</button>').join('') + '</div></div>' +
            '<p class="bd-info" id="bdInfo"></p><div class="bd-knoepfe"><button type="button" class="btn btn--secondary btn--sm" data-bact="wahlZu">Abbrechen</button><button type="button" class="btn btn--primary btn--sm" data-bact="wahlLos">' +
            (w.mode === 'rally' ? 'Rally starten' : w.mode === 'dazu' ? 'Truppen schicken' : 'Verstärkung senden') + '</button></div>'
            : '<div class="notice notice--warn">' + icon('info') + '<span>' + (w.mode === 'rally' ? 'Keine deiner Basen hat Truppen und einen Weg zum Ziel.' : 'Keine deiner Basen schafft es rechtzeitig dorthin.') + '</span></div><div class="bd-knoepfe"><button type="button" class="btn btn--secondary btn--sm" data-bact="wahlZu">Schließen</button></div>') + '</div>';
}
function bundWahlRechnen() {
    const w = bundWahl, info = document.getElementById('bdInfo'); if (!w || !info || w.von === null) return;
    const n = Math.floor((islandTroops[w.von] || 0) * (w.f || 1)), von = islandById[w.von];
    const ziel = islandById[w.mode === 'rally' ? w.t : w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach]; if (!ziel || !von) return;
    const ow = islandOwnerOf(ziel.id), offen = w.mode === 'hilfe' && verstUnbekannt(ow);   // (Platz bei anderen: nur der Weltrechner weiß ihn – er schickt höchstens so viele)
    const frei = w.mode === 'hilfe' && !offen ? Math.floor(verstFrei(ow)) : Infinity;
    info.textContent = fmtNum(Math.min(n, frei)) + ' Truppen · ' + (w.mode === 'rally' ? 'Angriff nach ' + (w.min || 3) + ' Min. · Marsch dann ca. ' + fmtClock(travelDurationSeconds(von, ziel)) : 'Ankunft in ca. ' + fmtClock(travelDurationSeconds(von, ziel)) +
        (w.mode === 'hilfe' ? (offen ? ' · höchstens so viele, wie in die Botschaft passen' : ' · Platz in der Botschaft: ' + fmtNum(frei) + (n > frei ? ' (mehr passt nicht)' : '')) + ' · bleiben deine, zurückholen in der Botschaft' : ''));
}
function bundWahlLos() {
    const w = bundWahl; if (!w || w.von === null || w.von === undefined) return;
    const von = islandById[w.von]; let n = Math.floor((islandTroops[w.von] || 0) * (w.f || 1)); if (!von || n < 1) { flashHint('Dort sind keine Truppen.', 2500); return; }
    if (w.mode === 'hilfe' && !verstUnbekannt(islandOwnerOf(w.nach))) { const ow = islandOwnerOf(w.nach), frei = Math.floor(verstFrei(ow)); if (frei < 1) { flashHint('Die Botschaft von ' + bundName(ow) + ' ist voll.', 3000); return; } n = Math.min(n, frei); }
    if (w.mode === 'rally') {
        const why = bundZielOk('player', w.t); if (why) { flashHint(why + '.', 3000); return; }
        const held = w.held && heroOwned('player', w.held) && !heroBusy('player', w.held) ? w.held : null, held2 = heroZweitOk('player', held, w.held2);
        bundBefehl('rally', { basis: w.von, ziel: w.t, min: w.min || 3, n, held, held2 }, 'Rally gestartet – dein Bündnis kann jetzt mitmachen.');
        islandTroops[w.von] = Math.max(0, (islandTroops[w.von] || 0) - n);
    } else {
        const nach = w.mode === 'dazu' ? (bund.r.find(r => r.id === w.rid) || {}).at : w.nach; if (nach === undefined) return;
        const vh = lastHop(von.landmassId, islandById[nach].landmassId, 'player'); if (!mautVorab(vh[0], vh[1], n)) return;
        const held = w.mode === 'dazu' && w.held && heroOwned('player', w.held) && !heroBusy('player', w.held) ? w.held : null, held2 = heroZweitOk('player', held, w.held2);   // (Rally-Mitglied: seine Helden für seine Truppen)
        bundBefehl(w.mode === 'dazu' ? 'rallyDazu' : 'hilfe', w.mode === 'dazu' ? { rid: w.rid, von: w.von, n, held, held2 } : { von: w.von, nach, n }, w.mode === 'dazu' ? 'Truppen unterwegs zur Rally.' :
            verstUnbekannt(islandOwnerOf(nach)) ? 'Verstärkung geschickt – passt nicht alles in die Botschaft, bleibt der Rest daheim.' : 'Verstärkung unterwegs – sie bleibt deine.');   // (fremde Botschaft: nur der Weltrechner kennt den Platz)
        islandTroops[w.von] = Math.max(0, (islandTroops[w.von] || 0) - n);
        const t0 = Date.now(); vorlaeufigDazu('s', { fromId: w.von, toId: nach, troops: n, startedAt: t0, resolveAt: t0 + travelDurationSeconds(von, islandById[nach]) * 1000, senderBotId: null });
        sfx('send');
    }
    bundWahl = null; updateHud(); bundRender(true);
}
if (bundPopup) {
    document.getElementById('bundBtn').addEventListener('click', e => { e.stopPropagation(); if (isPanelOpen(bundPopup)) return bundSchliessen();   // Dock-Knopf „Bündnis“
        closeAllPopups(); bundOeffnen(bundIch() ? bundTab === 'suchen' ? 'info' : bundTab : 'suchen'); bundGesehen(); });
    document.getElementById('bundCloseBtn').addEventListener('click', bundSchliessen);
    bundPopup.addEventListener('click', e => {
        const tab = e.target.closest('[data-btab]'); if (tab) { bundTab = tab.dataset.btab; bundWahl = null; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; if (bundTab === 'sig') { bundGesehen(); const c = document.getElementById('bdChat'); if (c) c.scrollTop = c.scrollHeight; } return; }
        const fb = e.target.closest('[data-farbe]'), zb = e.target.closest('[data-zeichen]');
        if (fb || zb) { const box = (fb || zb).parentElement; for (const x of box.children) x.classList.toggle('on', x === (fb || zb)); return; }
        const mb = e.target.closest('[data-min]'), fr = e.target.closest('#bdAnteil [data-f]');
        if (mb && bundWahl) { bundWahl.min = +mb.dataset.min; bundRender(true); return; }
        const hb = e.target.closest('[data-rhero]'), hb2 = e.target.closest('[data-rhero2]');   // Held des Anführers (führt die ganze Rally)
        if (hb && bundWahl && !hb.disabled) { bundWahl.held = hb.dataset.rhero || null; if (!bundWahl.held || bundWahl.held === bundWahl.held2) bundWahl.held2 = null; bundRender(true); return; }
        if (hb2 && bundWahl && !hb2.disabled) { bundWahl.held2 = hb2.dataset.rhero2 || null; bundRender(true); return; }
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
        else if (act === 'einlJa') bundBefehl('einladungAntwort', { aid: b.dataset.aid, ja: true }, 'Einen Moment …');
        else if (act === 'einlNein') bundBefehl('einladungAntwort', { aid: b.dataset.aid, ja: false }, 'Einladung abgelehnt.');
        else if (act === 'einlWeg') bundBefehl('einladungWeg', { w }, 'Einladung zurückgezogen.');
        else if (act === 'einlAn') { if (bundKannEinladen(b.dataset.w) && !bundEingeladen(b.dataset.w)) { b.disabled = true; bundBefehl('einladen', { w }, 'Einladung an ' + bundName(b.dataset.w) + ' geschickt.'); } }
        else if (act === 'anfrage') { bundTauschFuer = null; bundBefehl('anfrage', { w, ja: b.dataset.ja === '1' }); }
        else if (act === 'tauschWahl') { bundTauschFuer = bundTauschFuer === b.dataset.w ? null : b.dataset.w; bundRender(true); }
        else if (act === 'tausch') { if (sicher('tausch:' + b.dataset.raus)) { bundTauschFuer = null; bundBefehl('anfrage', { w, ja: true, raus: neutralId(b.dataset.raus) }, bundName(b.dataset.raus) + ' geht, ' + bundName(b.dataset.w) + ' kommt.'); } }
        else if (act === 'anfuehrer') { if (sicher('chef:' + b.dataset.w)) bundBefehl('anfuehrer', { w }, bundName(b.dataset.w) + ' führt jetzt das Bündnis.'); }
        else if (act === 'raus') { if (sicher('raus:' + b.dataset.w)) bundBefehl('rauswerfen', { w }, bundName(b.dataset.w) + ' wurde entfernt.'); }
        else if (act === 'offen') { const a = bundIch(); if (a) bundBefehl('offen', { offen: !a.offen }, a.offen ? 'Beitritt nur noch auf Anfrage.' : 'Dein Bündnis ist jetzt offen für alle.'); }
        else if (act === 'verlassen') { if (sicher('verlassen')) { bundBefehl('verlassen', {}, 'Du verlässt das Bündnis.'); } }
        else if (act === 'chat') { const k = b.dataset.k; if (!BUND_CHAT[k]) return;
            if (Date.now() - (bundMem.chatSend || 0) < BUND_CHAT_PAUSE) return; bundMem.chatSend = Date.now();
            bundBefehl('chat', { k, z: null }); sfx('send'); }
        else if (act === 'zeigen') { const isl = islandById[+b.dataset.z]; if (isl) { bundSchliessen(); flyTo(isl.x, isl.y); setTimeout(() => openIslandPopup(isl), 380); } }
        else if (act === 'hilfeWahl') { bundWahl = { mode: 'hilfe', nach: +b.dataset.z, f: .5 }; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; }
        else if (act === 'dazuWahl') { bundWahl = { mode: 'dazu', rid: b.dataset.rid, f: .5 }; bundRender(true); bundPopup.querySelector('.pbody').scrollTop = 0; }
        else if (act === 'abbruch') { if (sicher('abbruch:' + b.dataset.rid)) bundBefehl('rallyAbbruch', { rid: b.dataset.rid }, 'Rally wird abgebrochen.'); }
        else if (act === 'wahlZu') { bundWahl = null; bundRender(true); }
        else if (act === 'wahlLos') bundWahlLos();
        else if (act === 'helfen') { b.disabled = true; bundBefehl('helfen', { hid: b.dataset.hid }, 'Geholfen!'); sfx('coin'); }
        else if (act === 'alleHelfen') { b.disabled = true; bundBefehl('helfen', { alle: true }, 'Allen geholfen!'); sfx('coin'); }
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
    const neu = a ? bundChatZeilen(a).filter(x => x.at > bundGesehenAt && x.w !== 'player').length : bundEinladungen('player').length;
    p.style.display = neu ? '' : 'none'; p.textContent = neu > 9 ? '9+' : String(neu);
}
// Inselfenster: Bündnis-Knöpfe (Signal, Rally, Hilfe) und keine Angriffe auf Mitglieder
function bundInselfenster(island, view) {
    const box = document.getElementById('popupBund'); if (!box) return;
    const a = bundIch(), ow = islandOwnerOf(island.id);
    if (view !== 'menu' || !a || SYSTEM) { liveHtml(box, ''); return; }
    const ally = ow && ow !== 'player' && bundVerbuendet('player', ow), mein = ow === 'player', kn = [];
    if (ally) { attackBtn.style.display = 'none'; multiAttackBtn.style.display = 'none'; popupOverline.textContent = 'Bündnis-Mitglied · [' + a.tag + ']'; }
    kn.push(['teilen', 'flag', 'Im Chat teilen']);                                                   // im Bündnis-Chat besprechen
    if (mein) kn.push(['hilfe', 'shield', 'Brauche Hilfe!']);
    else if (ally) { if (verstMoeglich(islandOwnerOf(island.id))) kn.push(['hilfeWahl', 'send', 'Verstärkung']); }   // (nur mit Botschaft – die Truppen bleiben deine)
    else if (!bundZielOk('player', island.id)) kn.push(['rallyWahl', 'troops', 'Rally']);
    if (bundKannEinladen(ow)) kn.push(['einladen', 'bund', bundEingeladen(ow) ? 'Eingeladen' : 'Einladen']);   // Anführer: Herr dieser Basis ins Bündnis einladen
    liveHtml(box, (ally ? '<div class="notice notice--gold">' + icon('bund') + '<span>' + escapeHtml(bundName(ow)) + ' ist in deinem Bündnis – Mitglieder greifen sich nicht an.</span></div>' : '') +
        (kn.length ? '<div class="bd-insel"><span class="bd-insel-l">' + icon('bund') + 'Bündnis</span>' + kn.map(k => '<button type="button" class="btn btn--secondary btn--sm" data-bsig="' + k[0] + '">' + icon(k[1]) + '<span>' + k[2] + '</span></button>').join('') + '</div>' : ''));
}
document.getElementById('popupBund') && document.getElementById('popupBund').addEventListener('click', e => {
    const b = e.target.closest('[data-bsig]'); if (!b || popupIslandId === null) return;
    const id = popupIslandId, art = b.dataset.bsig;
    if (art === 'rallyWahl') { const why = bundZielOk('player', id); if (why) { flashHint(why + '.', 3000); return; } closeIslandPopup(); bundWahl = { mode: 'rally', t: id, min: 3, f: 1 }; bundOeffnen('rally'); return; }
    if (art === 'hilfeWahl') { closeIslandPopup(); bundWahl = { mode: 'hilfe', nach: id, f: .5 }; bundOeffnen('sig'); return; }
    if (art === 'einladen') { const ow = islandOwnerOf(id); if (!bundKannEinladen(ow) || bundEingeladen(ow)) return; b.disabled = true; bundBefehl('einladen', { w: ow }, 'Einladung an ' + bundName(ow) + ' geschickt.'); return; }
    if (art === 'hilfe' && !verstMoeglich('player')) { flashHint('Hilfe braucht eine Botschaft (ab Burg-Stufe 5).', 3500); return; }   // (ohne Botschaft kann keiner Truppen schicken)
    if (art === 'teilen' || art === 'hilfe') { if (Date.now() - (bundMem.chatSend || 0) < BUND_CHAT_PAUSE) return; bundMem.chatSend = Date.now();
        bundBefehl('chat', { k: art, z: id }, art === 'teilen' ? 'Im Bündnis-Chat geteilt.' : 'Hilferuf im Bündnis-Chat.'); sfx('send'); b.disabled = true; }
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

// Neue Welt-Saison (09f-saison.js saisonWelt): alle Bündnisse aufgelöst (neu gründen), Rallys, Chat und Verstärkungen weg
function bundSaisonNeu() {
    bund = { b: {}, r: [], n: bund.n || 1 }; bundSpeichern();
    bundChat = {}; store.set('openWaterBundChat', '{}');
    verst = { n: verst.n || 0, l: [] }; verstSpeichern();
    bundAustritt.clear(); bundWegMem.clear();
    for (const k of ['chatAt', 'botNext', 'rallySagt', 'rallyWeg', 'ziel', 'hilfeSig', 'rallyRunde']) bundMem[k] = {};
    bundMem.chatQ = []; bundMem.sigGemacht.clear(); bundMem.sigGeschickt.clear(); bundMem.rallyGemacht.clear();
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
        if (keys.includes('openWaterVerstaerkung')) { verst = verstLesen(); if (isPanelOpen(bundPopup)) bundRender(); }
        if (keys.includes('openWaterBrand')) { try { brand = JSON.parse(store.get('openWaterBrand')) || {}; } catch (e) { brand = {}; } requestRender(); }   // (eine Hauptstadt brennt)
        if (keys.includes('openWaterBundChat')) { bundChatNeu(); if (!keys.includes('openWaterBuendnisse')) { bundPunkt(); if (isPanelOpen(bundPopup)) bundRender(); } }
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

// Darf ich (Anführer, Platz frei) w einladen? Ist w schon eingeladen?
function bundKannEinladen(w) { const a = bundIch(); return !SYSTEM && !!a && a.anf === 'player' && a.mit.length < BUND.MAX && !!w && w !== 'player' && !!botById[w] && !bundVon(w) && bundBasen(w).size > 0; }
function bundEingeladen(w) { const a = bundIch(); return !!a && (a.einl || []).some(q => q.w === w && Date.now() - q.at < BUND_EINL_MS); }
// Reiter „Suchen“ für den Anführer: alle ohne Bündnis (Mitspieler und echte Spieler), die nächsten zuerst
function bundOhneListeHtml() {
    const a = bundIch(); if (!a || a.anf !== 'player') return '';
    if (a.mit.length >= BUND.MAX) return '<div class="notice">' + icon('info') + '<span>Dein Bündnis ist voll (' + BUND.MAX + ') – einladen geht erst wieder mit freiem Platz.</span></div>';
    const c = islandById[playerIslandId], liste = BOT_DEFS.map(b => b.id).filter(w => bundKannEinladen(w))
        .map(w => { const k = islandById[bundCap(w)]; return { w, d: c && k ? Math.hypot(k.x - c.x, k.y - c.y) : Infinity }; }).sort((x, y) => x.d - y.d);
    return '<div class="sect"><h4>Ohne Bündnis – einladen</h4><span class="sect-aside">' + liste.length + '</span></div><div class="bd-liste">' + (liste.length ? liste.slice(0, 30).map(({ w }) =>
        '<div class="bd-zeile"><span class="bd-name">' + whoLink(w, bundName(w)) + '<small>' + (botById[w].mensch ? 'Spieler · ' : '') + 'Macht ' + fmtCompact(staerke(w)) + ' · ' + bundBasenText(w) + '</small></span>' +
        (bundEingeladen(w) ? '<span class="chip">eingeladen</span>' : '<button type="button" class="btn btn--primary btn--sm" data-bact="einlAn" data-w="' + w + '">Einladen</button>') + '</div>').join('')
        : '<div class="inbox-empty">Gerade ist niemand ohne Bündnis.</div>') + '</div>' + (liste.length > 30 ? '<div class="inbox-empty">… und ' + (liste.length - 30) + ' weiter weg.</div>' : '');
}
// Profil eines Spielers (spiel.js openRulerProfile): als Anführer „Ins Bündnis einladen“
function bundProfilKnopf(who) {
    if (!bundKannEinladen(who)) return '';
    if (bundEingeladen(who)) return '<button class="btn btn--ghost btn--sm" type="button" disabled>' + icon('bund') + '<span>Eingeladen</span></button>';
    return '<button class="btn btn--secondary btn--sm" type="button" data-rp="einladen">' + icon('bund') + '<span>Ins Bündnis einladen</span></button>';
}
