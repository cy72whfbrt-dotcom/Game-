// Teil 04-fenster-karte-welt.js: Bündnis: Fenster, Karte (Gebiet, Signale, Fahnen), Verbindung zur Welt
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
    const ort = x.z !== null && x.z !== undefined && islandById[x.z] ? islandTitle(islandById[x.z]) : '';
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
    return '<div class="bd-zeile bd-rally' + (meins ? '' : ' is-feind') + '"><span class="bd-sic">' + icon(meins ? 'flag' : 'attack') + '</span><span class="bd-name"><b>' + (meins ? 'Rally auf ' : 'Gefahr: Rally auf ') + escapeHtml(islandTitle(ziel)) + '</b>' +
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
    const titel = w.mode === 'rally' ? 'Rally auf ' + islandTitle(ziel) : w.mode === 'dazu' ? 'Mitmachen: Rally auf ' + islandTitle(islandById[r.t]) : 'Verstärkung für ' + bundName(islandOwnerOf(ziel.id)) + ' · ' + islandTitle(ziel);
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
    bundMem.chatQ = []; bundMem.sigGemacht.clear(); bundMem.rallyGemacht.clear();
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
