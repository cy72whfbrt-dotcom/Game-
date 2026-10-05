// ===== weltrechner/start.js – der Weltrechner auf dem Server =====
// Rechnet die EINE Welt rund um die Uhr (Mitspieler, Märsche, Kämpfe, Münzen …) – auch wenn kein Spieler online ist.
// Kein Handy rechnet je die Welt (Regel von Alexander). Benutzt genau denselben Spiel-Code wie die Spieler (spiel.js,
// bots.js, welt.js), nur ohne Bildschirm: die Seite läuft in jsdom (jsdom.js, eine Datei), Zeichnen ist abgeschaltet.
//
// Gestartet wird er von wachhund.php (Cronjob jede Minute) mit diesen Umgebungsvariablen:
//   OW_URL        Adresse des Game-Ordners, z. B. https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/
//   OW_SCHLUESSEL der geheime Schlüssel (wr_schluessel aus config.php, bei jedem Hochladen neu)
//   OW_SPEICHER_MB höchstens so viel Speicher (Standard 600 – Vorgabe von Alexander)
//
// Schutzgeländer:
//   - Speicher: über der Grenze → sofort beenden (der Wachhund startet neu)
//   - Herzschlag: alle 5 s in herz.php – hängt das Programm (Endlosschleife), merkt es der Wachhund und beendet es hart
//   - Prüfer: vor jedem Schreiben der Welt werden die Zahlen geprüft; kaputt → nicht schreiben; 3-mal hintereinander → beenden
//     (beim Neustart wird der letzte gute Stand aus der Datenbank geladen)
//   - zu viele Fehler pro Minute → beenden
//   - Wartung → sauber beenden (kein Absturz)
'use strict';
process.env.TZ = process.env.TZ || 'Europe/Berlin';   // Tage, Wochen-Event, Invasion, Drache: deutsche Zeit (wie bei den Spielern)
const fs = require('fs'), path = require('path'), os = require('os');

const ORDNER = __dirname, GAME = path.join(__dirname, '..');
const URL_BASIS = String(process.env.OW_URL || '').replace(/\/?$/, '/');
const SCHLUESSEL = String(process.env.OW_SCHLUESSEL || '');
delete process.env.OW_SCHLUESSEL;   // nur noch hier im Programm, nicht mehr in der Umgebung (die das Spiel sehen könnte)
const SPEICHER_MB = Math.min(600, parseInt(process.env.OW_SPEICHER_MB || '600', 10) || 600);
const HERZ = path.join(ORDNER, 'herz.php');   // .php mit Sperre davor: im Browser nie lesbar (nur wachhund.php/admin.php lesen es)
const SPERRE = '<?php http_response_code(404); exit; ?>\n';
const START = Date.now();
const NODE_MS = Math.round(process.uptime() * 1000);   // so lange brauchte Node selbst zum Starten (auf einem überlasteten Server: Sekunden)

function log(...t) { console.log(new Date().toISOString(), ...t); }
// Ende mit Grund – der Code sagt dem Wachhund, was los war: 0 = geplant (Wartung, läuft schon), sonst Absturz
function ende(code, grund) {
    log('ENDE (' + code + '):', grund);
    try { herzSchreiben({ ende: grund, code }); } catch (e) {}
    process.exit(code);
}
if (!URL_BASIS.startsWith('http') || !SCHLUESSEL) ende(2, 'OW_URL oder OW_SCHLUESSEL fehlt');
process.on('uncaughtException', e => ende(1, 'Fehler: ' + (e && e.stack || e)));
process.on('unhandledRejection', e => log('Warnung (Promise):', e && e.message || e));

// ===== Zahlen für Herzschlag und Admin-Seite =====
let phase = 'start';   // 'start' (Welt holen und einlesen – darf bei großer Welt / langsamem Server lange dauern) | 'läuft'
const stat = { pulseOk: 0, pulseFehler: 0, letzterPuls: 0, pulsMs: 0, fehlerMinute: [], prueferFehler: 0, prueferHintereinander: 0, geduld: 0 };
// Dauer des Starts (6.10.): Node, Laden (Spielseite mit der ganzen Welt vom Server), Einlesen (Spiel starten), erster Puls –
// ins Log, in den Herzschlag und so auf die Admin-Seite (der Wachhund merkt sich die letzten Starts)
const startZeit = { node: NODE_MS };
function startMerken(was) {
    if (startZeit[was] !== undefined) return;
    startZeit[was] = Date.now() - START;
    if (startZeit.einlesen === undefined || startZeit.puls === undefined) return;
    const s = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s', z = startZeit;
    z.gesamt = NODE_MS + Math.max(z.einlesen, z.puls);
    log('Start-Dauer: Node ' + s(z.node) + ' · Laden ' + s(z.laden) + ' · Einlesen ' + s(z.einlesen - z.laden) + ' · erster Puls ' + s(Math.max(0, z.puls - z.einlesen)) + ' · gesamt ' + s(z.gesamt) + ' (Server-Last ' + lastJeKern().toFixed(1).replace('.', ',') + ' je Kern)');
}
// Server-Last je Kern (1-Minuten-Mittel). Über 1,5 ist der Office-Server überlastet: dann kommt der Puls langsam, obwohl der
// Weltrechner selbst gesund ist (5.10. 21:07 und 21:37: Last 30–53 bei 16 Kernen, Puls 93 s → unnötige Neustarts)
const KERNE = Math.max(1, (os.cpus() || []).length);
function lastJeKern() { try { return os.loadavg()[0] / KERNE; } catch (e) { return 0; } }
const PULS_FRIST = 120000, PULS_FRIST_LAST = 600000, LAST_HOCH = 1.5;
// Wie lange darf der Puls fehlen? Normal 2 Min.; bei überlastetem Server 10 Min. – dieser Prozess lebt ja (er prüft das hier
// selbst) und speichert, sobald der Server antwortet. Ein Neustart würde den Server nur noch mehr belasten (ganze Welt laden).
function pulsFrist(last) { return last > LAST_HOCH ? PULS_FRIST_LAST : PULS_FRIST; }
function herzSchreiben(extra) {
    const m = process.memoryUsage();
    const h = Object.assign({ zeit: Date.now(), pid: process.pid, gestartet: START, phase, speicherMb: Math.round(m.rss / 1048576), heapMb: Math.round(m.heapUsed / 1048576), heapGesamtMb: Math.round(m.heapTotal / 1048576), externMb: Math.round(m.external / 1048576),
        grenzeMb: SPEICHER_MB, pulseOk: stat.pulseOk, pulseFehler: stat.pulseFehler, letzterPuls: stat.letzterPuls, pulsMs: stat.pulsMs,
        fehlerProMinute: stat.fehlerMinute.length, prueferFehler: stat.prueferFehler, befehle: befehleGezaehlt(), gcLang: stat.gcLang || 0, push: stat.push || null, pauseMaxMs: stat.pauseMax, pauseStundeMs: stat.pauseMaxStunde,
        startDauer: startZeit, geduld: stat.geduld }, extra || {});
    const neu = path.join(ORDNER, 'herz_neu.php'); fs.writeFileSync(neu, SPERRE + JSON.stringify(h)); fs.renameSync(neu, HERZ);
}
// Befehle zählt welt.js beim Lesen der Antwort (vorher hier ein zweites Mal die ganze Antwort gelesen – je Puls)
function befehleGezaehlt() { try { const n = spielFenster && spielFenster.WELT && spielFenster.WELT.befehleGezaehlt; return typeof n === 'number' ? n : 0; } catch (e) { return 0; } }
// Längste Pause (der Weltrechner war so lange am Stück beschäftigt – ab 3 Min. hält ihn der Wachhund für hängend):
// jede Sekunde nachsehen, wie viel später als geplant wir drankommen. Steht im Herzschlag (Admin-Seite), lange Pausen im Log.
// Bei einer langen Pause steht im Log, WARUM: hat er selbst gerechnet (CPU ≈ Pause) oder kam er nicht dran (CPU ≈ 0 – der
// Office-Server war ausgelastet: Last, freier Speicher)? So lässt sich die Ursache der Hänger finden (5.10.).
let pauseLetzte = Date.now(), cpuLetzte = process.cpuUsage(); stat.pauseMax = 0; stat.pauseMaxStunde = 0;
setInterval(() => { const j = Date.now(), p = j - pauseLetzte - 1000, cpu = process.cpuUsage(cpuLetzte); pauseLetzte = j; cpuLetzte = process.cpuUsage();
    if (p > stat.pauseMax) stat.pauseMax = p; if (p > stat.pauseMaxStunde) stat.pauseMaxStunde = p;
    if (p > 20000 && phase === 'läuft') { let wie = ''; try { const os = require('os'), last = os.loadavg().map(x => x.toFixed(1)).join('/'), rechen = Math.round((cpu.user + cpu.system) / 1000);
            wie = ' (selbst gerechnet ' + Math.round(rechen / 1000) + ' s von ' + Math.round((p + 1000) / 1000) + ' s · Server-Last ' + last + ' · frei ' + Math.round(os.freemem() / 1048576) + ' von ' + Math.round(os.totalmem() / 1048576) + ' MB · eigener Speicher ' + Math.round(process.memoryUsage().rss / 1048576) + ' MB)'; } catch (e) {}
        log('Warnung: ' + Math.round(p / 1000) + ' s am Stück beschäftigt' + wie); } }, 1000).unref();
setInterval(() => { stat.pauseMaxStunde = 0; }, 3600000).unref();
// Lange Speicher-Aufräumpausen (GC, über 0,5 s) ins Log – auch sie halten den Weltrechner an
try { const { PerformanceObserver } = require('perf_hooks');
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 500) { stat.gcLang = (stat.gcLang || 0) + 1; log('Warnung: Aufräumen (GC) dauerte ' + Math.round(e.duration) + ' ms'); } }).observe({ entryTypes: ['gc'] }); }
catch (e) { log('Warnung: GC-Messung geht nicht (' + e.message + ')'); }
herzSchreiben();   // gleich beim Start: der Wachhund sieht sofort „lebt, lädt noch“ (nicht erst nach 5 s)
let gcZuletzt = 0;
setInterval(() => {
    let rss = process.memoryUsage().rss / 1048576;
    // erst aufräumen (Node hält Müll lange fest) – höchstens jede Minute (ein volles Aufräumen kann Sekunden dauern), außer kurz vor dem Beenden
    if (rss > SPEICHER_MB * .8 && typeof global.gc === 'function' && (Date.now() - gcZuletzt >= 60000 || rss > SPEICHER_MB)) { gcZuletzt = Date.now(); global.gc(); rss = process.memoryUsage().rss / 1048576; stat.aufgeraeumt = (stat.aufgeraeumt || 0) + 1; }
    if (rss > SPEICHER_MB) ende(3, 'Speicher voll: ' + Math.round(rss) + ' MB (Grenze ' + SPEICHER_MB + ' MB)');
    const jetzt = Date.now(); stat.fehlerMinute = stat.fehlerMinute.filter(t => jetzt - t < 60000);
    pulsPruefen(jetzt);
    herzSchreiben();
}, 5000).unref();
// Kommt der Puls noch beim Server an? (alle 5 s) Frist siehe pulsFrist – Code 7: der Server antwortet nicht (zählt beim Wachhund
// nicht als Absturz, er versucht es mit Pause wieder)
function pulsPruefen(jetzt) {
    if (stat.letzterPuls && jetzt - stat.letzterPuls > PULS_FRIST) {
        const last = lastJeKern(), frist = pulsFrist(last), ohne = Math.round((jetzt - stat.letzterPuls) / 1000);
        if (jetzt - stat.letzterPuls > frist) return ende(7, 'seit ' + ohne + ' s kein Puls beim Server angekommen (Server-Last ' + last.toFixed(1) + ' je Kern)');
        if (!stat.geduld) { stat.geduld = jetzt; log('Server überlastet (Last ' + last.toFixed(1) + ' je Kern, ' + KERNE + ' Kerne): seit ' + ohne + ' s kein Puls – warte bis ' + Math.round(frist / 60000) + ' Min. statt neu zu starten'); }
    } else if (stat.geduld) { log('Puls kommt wieder an (nach ' + Math.round((jetzt - stat.geduld) / 1000) + ' s Geduld)'); stat.geduld = 0; }
}
// ===== Auffälligkeiten (Schummel-Schutz in spiel.js → WELT.warnungen) → schummel.php → Admin-Seite =====
// Höchstens die letzten 200; gleiche (selber Spieler, selbe Art, gleicher Text bis auf die Zahlen, innerhalb einer
// Stunde) werden zusammengefasst (Anzahl, letzter Text).
// Die Datei überlebt Neustarts (wird beim Start gelesen) und ist wie herz.php gesperrt (im Browser 404).
const SCHUMMEL = path.join(ORDNER, 'schummel.php');
let auffaellig = [];
// Schummel-Verdacht (6.10., Alexander): sammeln sich bei einem Spieler VERDACHT_AB Auffälligkeiten in einer Stunde, bekommen die
// Admin-Konten eine Handy-Nachricht (push.js adminMelden) – höchstens 1× pro Spieler und Stunde. Nur eine Nachricht: der Spieler
// wird nie automatisch gebremst. „gemeldet“ steht mit in schummel.php (übersteht Neustarts).
const VERDACHT_AB = 5, STUNDE = 3600000;
const haeufung = new Map();    // uid → Zeiten seiner Auffälligkeiten (letzte Stunde)
let gemeldet = {};             // uid → wann zuletzt gemeldet
const adminOffen = [];         // Nachrichten an die Admins, bis der Melder (push.js) läuft
let pushMelder = null;
try { const t = fs.readFileSync(SCHUMMEL, 'utf8'); const v = JSON.parse(t.slice(t.indexOf('{'))); if (Array.isArray(v.liste)) auffaellig = v.liste.slice(0, 200); if (v.gemeldet && typeof v.gemeldet === 'object') gemeldet = v.gemeldet; } catch (e) {}
function verdachtPruefen(uid, jetzt) {
    const z = (haeufung.get(uid) || []).filter(t => jetzt - t < STUNDE).slice(-200); haeufung.set(uid, z);   // (höchstens 200 Zeiten je Spieler)
    if (z.length < VERDACHT_AB || jetzt - (+gemeldet[uid] || 0) < STUNDE) return;
    gemeldet[uid] = jetzt;
    const arten = [...new Set(auffaellig.filter(x => x.uid === uid && jetzt - x.letzte < STUNDE).map(x => x.was))].slice(0, 5).join(', ');
    let name = 'Spieler ' + uid; try { const m = spielFenster && spielFenster.WELT && spielFenster.WELT.menschen['u' + uid]; if (m && m.name) name = String(m.name).slice(0, 30); } catch (e) {}
    const daten = { titel: 'Schummel-Verdacht', text: name + ': ' + z.length + ' Auffälligkeiten in der letzten Stunde' + (arten ? ' (' + arten + ')' : '') + '. Nur zur Info – nichts wurde gebremst. Mehr auf der Admin-Seite unter „Auffälligkeiten“.' };
    log('Schummel-Verdacht an die Admins: ' + daten.text);
    if (pushMelder) pushMelder.adminMelden(daten); else adminOffen.push(daten);
}
const muster = t => String(t || '').replace(/[0-9][0-9.,]*([\s ]*(Tsd|Mio|Mrd|Bio|Brd|Trill|Trd|Quadr)\.)?/g, '#').replace(/#\.+/g, '#');
function auffaelligSammeln(neu) {
    if (!neu || !neu.length) return;
    for (const w of neu) {
        if (!w || !(w.uid > 0)) continue;
        const text = String(w.text).slice(0, 300), m = muster(text);
        const gleich = auffaellig.find(x => x.uid === w.uid && x.was === w.was && muster(x.text) === m && w.zeit - x.letzte < 3600000);
        if (gleich) { gleich.anzahl++; gleich.letzte = w.zeit; gleich.text = text; gleich.wert = Math.max(gleich.wert || 0, w.wert || 0); }
        else auffaellig.push({ uid: w.uid, was: String(w.was).slice(0, 20), text, wert: w.wert || 0, erste: w.zeit, letzte: w.zeit, anzahl: 1 });
        (haeufung.get(w.uid) || haeufung.set(w.uid, []).get(w.uid)).push(w.zeit);
    }
    const jetzt = Date.now();
    for (const uid of new Set(neu.map(w => w && w.uid).filter(u => u > 0))) verdachtPruefen(uid, jetzt);
    for (const u in gemeldet) if (jetzt - gemeldet[u] >= STUNDE) delete gemeldet[u];
    auffaellig.sort((a, b) => b.letzte - a.letzte);
    const jeSpieler = {};   // höchstens 20 Einträge je Spieler – einer allein kann die Liste nicht fluten und andere verdrängen
    auffaellig = auffaellig.filter(x => (jeSpieler[x.uid] = (jeSpieler[x.uid] || 0) + 1) <= 20).slice(0, 200);
    try { const neuD = path.join(ORDNER, 'schummel_neu.php'); fs.writeFileSync(neuD, SPERRE + JSON.stringify({ zeit: Date.now(), liste: auffaellig, gemeldet })); fs.renameSync(neuD, SCHUMMEL); }
    catch (e) { log('Warnung: schummel.php nicht schreibbar (' + e.message + ')'); }
}
let spielFenster = null;   // (los) das Fenster des Spiels – daraus holt der Takt unten die Auffälligkeiten
setInterval(() => {
    try { const W = spielFenster && spielFenster.WELT; if (W && Array.isArray(W.warnungen) && W.warnungen.length) auffaelligSammeln(W.warnungen.splice(0)); }
    catch (e) { log('Warnung: Auffälligkeiten (' + e.message + ')'); }
}, 5000).unref();
function fehler(t) {
    stat.fehlerMinute.push(Date.now()); log('FEHLER:', t);
    if (stat.fehlerMinute.length > 120) ende(4, 'zu viele Fehler (über 120 in einer Minute)');
}

// ===== Mit dem Server reden: immer mit Schlüssel, nie länger als 60 s warten (die Spielseite beim Start: 5 Min.) =====
// Bei überlastetem Server (6.10.) 2 Min.: eine abgebrochene Anfrage rechnet der Server trotzdem zu Ende, und der Weltrechner schickt
// danach alles nochmal – doppelte Arbeit genau dann, wenn der Server am wenigsten Zeit hat.
// Bei Last beim Hoster dauert ein Puls 15–30 s. Stand Node selbst (großer Rechen-Schritt), kommt die Uhr zu spät dran – die
// Antwort liegt dann oft schon bereit: einmal 2 s Nachfrist, statt sie als Fehler zu verwerfen.
function zeitGrenze(ms) {
    const ac = new AbortController(), soll = Date.now() + ms; let nachfrist = false;
    const pruefen = () => {
        if (!nachfrist && Date.now() - soll > 1000) { nachfrist = true; setTimeout(pruefen, 2000).unref(); return; }
        ac.abort(new DOMException('Zeitgrenze (' + Math.round(ms / 1000) + ' s)', 'TimeoutError'));
    };
    const t = setTimeout(pruefen, ms); t.unref();
    return { signal: ac.signal, stopp: () => { clearTimeout(t); } };
}
async function holen(url, opt) {
    opt = Object.assign({}, opt || {});
    const kopf = Object.assign({}, opt.headers || {}); kopf['X-Weltrechner'] = SCHLUESSEL;
    let body = opt.body; if (body && typeof body !== 'string') body = Buffer.from(body.buffer ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : body);
    const ziel = new URL(url, URL_BASIS + 'spiel.php').href;
    if (!ziel.startsWith(URL_BASIS)) throw new Error('fremde Adresse – der Schlüssel geht nur an den eigenen Server');
    const zg = zeitGrenze(opt.zeit || (lastJeKern() > LAST_HOCH ? 120000 : 60000));
    try {
        const r = await fetch(ziel, { method: opt.method || 'GET', headers: kopf, body, redirect: 'error', signal: zg.signal });   // (nie einer Umleitung folgen – der Schlüssel ginge mit)
        // Inhalt noch unter der Zeitgrenze lesen: hängt der Server mitten in der Antwort, bricht auch das nach der Frist ab
        const inhalt = [204, 205, 304].includes(r.status) ? null : await r.arrayBuffer();
        return new Response(inhalt, { status: r.status, statusText: r.statusText, headers: r.headers });
    } finally { zg.stopp(); }
}

// ===== Prüfer: sind die Zahlen der Welt in Ordnung? (läuft im Spiel, vor jedem Schreiben) =====
const PRUEFER = `(function () {
    const bad = [];
    // Grenzen nur gegen KAPUTTE Zahlen (keine Zahl, unendlich, negativ, absurd) – nie gegen große ehrliche: Truppen und Münzen
    // wachsen ohne Obergrenze im Spiel; mit „1 Billiarde“ als Grenze hätte eine alte Welt nach Tagen jedes Speichern blockiert
    const zahl = (v, max) => typeof v === 'number' && isFinite(v) && v >= 0 && v <= max, RIESIG = 1e30;
    for (const k in islandTroops) if (!zahl(islandTroops[k], RIESIG)) { bad.push('Truppen ' + k + ' = ' + islandTroops[k]); break; }
    for (const k in islandLevels) if (!zahl(islandLevels[k], 10000)) { bad.push('Stufe ' + k + ' = ' + islandLevels[k]); break; }
    for (const k in botCoins) if (!zahl(botCoins[k], RIESIG)) { bad.push('Münzen ' + k + ' = ' + botCoins[k]); break; }
    const wem = new Map();
    for (const w in botOwnedIslands) for (const id of botOwnedIslands[w] || []) { if (wem.has(id)) { bad.push('Basis ' + id + ' gehört zweien: ' + wem.get(id) + ' und ' + w); break; } wem.set(id, w); }
    const bs = loadBotState(); for (const k in bs) { const b = bs[k]; if (!b) continue; if (!zahl(b.gems || 0, RIESIG) || !zahl(b.lvl || 1, 100000)) { bad.push('Mitspieler ' + k + ' Gems/Stufe kaputt'); break; } }
    for (const a of pendingAttacks || []) if (!zahl(a.rawTroops, RIESIG)) { bad.push('Angriff mit Truppen ' + a.rawTroops); break; }
    // Die Welt kann nicht in 2 Sekunden verschwinden: viel weniger Basen oder fast alle Truppen weg → das ist ein Fehler, kein Krieg
    let basen = 0, truppen = 0; for (const w in botOwnedIslands) basen += (botOwnedIslands[w] || new Set()).size;
    for (const k in islandTroops) truppen += islandTroops[k] || 0;
    const v = window.__prVorher;
    if (v && v.basen > 50 && basen < v.basen * .8) bad.push('Basen ' + v.basen + ' → ' + basen + ' (Welt verschwunden?)');
    // (Truppen: nur wenn praktisch KEINE mehr da sind – weniger als eine pro Basis. Ein großer Kampf darf fast alle Truppen der
    //  Welt kosten, wenn sie an einer Stelle standen: 3.10., junge Welt, 1 Billion → 0,3 Mrd. war echt und kein Datenverlust)
    if (v && v.truppen > 1e6 && truppen < v.truppen * .2 && truppen < Math.max(1, basen)) bad.push('Truppen ' + Math.round(v.truppen) + ' → ' + Math.round(truppen) + ' (Welt verschwunden?)');
    if (!bad.length) window.__prVorher = { basen, truppen };
    return bad.join('; ');
})()`;

// ===== Ein Leinwand-Ersatz: alles Zeichnen tut nichts (der Weltrechner hat keinen Bildschirm) =====
function leinwand(canvas) {
    const werte = { canvas, globalAlpha: 1, lineWidth: 1, font: '10px sans-serif' };
    const nichts = () => undefined;
    const besondere = {
        measureText: t => ({ width: String(t || '').length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
        createLinearGradient: () => ({ addColorStop: nichts }), createRadialGradient: () => ({ addColorStop: nichts }), createConicGradient: () => ({ addColorStop: nichts }),
        createPattern: () => ({ setTransform: nichts }),
        createImageData: (w, h) => { if (typeof w === 'object') { h = w.height; w = w.width; } return { width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }; },
        getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } }),
        isPointInPath: () => false, isPointInStroke: () => false, getLineDash: () => []
    };
    return new Proxy(werte, {
        get(t, k) { if (k in besondere) return besondere[k]; if (k in t) return t[k]; return nichts; },
        set(t, k, v) { t[k] = v; return true; }
    });
}

// ===== Die Spielseite laden und ohne Bildschirm laufen lassen =====
async function los() {
    const { JSDOM, ResourceLoader, VirtualConsole } = require('./jsdom.js');
    log('Start – Speichergrenze ' + SPEICHER_MB + ' MB, Server ' + URL_BASIS);
    let r;
    try { r = await holen('spiel.php', { zeit: 300000 }); }   // (die ganze Welt kommt mit – bei großer Welt und langsamem Server dauert das)
    catch (e) { ende(8, 'Server zu langsam/nicht erreichbar beim Start: ' + (e && e.message || e)); }   // kein Absturz des Weltrechners: der Wachhund versucht es später nochmal
    if (r.status === 503) ende(0, 'Wartung – der Weltrechner wartet');
    if (r.status === 409) ende(0, 'es läuft schon ein Weltrechner');
    if (!r.ok) ende(5, 'Spielseite: HTTP ' + r.status);
    let html; try { html = await r.text(); } catch (e) { ende(8, 'Server zu langsam beim Start (Welt nicht ganz angekommen): ' + (e && e.message || e)); }
    startMerken('laden');
    if (!html.includes('"system":true')) ende(5, 'Spielseite ohne Weltrechner-Zugang (Schlüssel falsch?)');
    // Grundlinie für den Prüfer: so groß ist die Welt in der Datenbank (bevor das Spiel irgendetwas tut)
    let grundlinie = null;
    try {
        const ow = JSON.parse(html.match(/window\.__OW = (.*?);<\/script>/s)[1]), t = ow.welt && ow.welt.setzen || {};
        const own = JSON.parse(t.openWaterBotOwnedIslands || '{}'), tr = JSON.parse(t.openWaterIslandTroops || '{}');
        let basen = 0, truppen = 0; for (const k in own) basen += (own[k] || []).length; for (const k in tr) truppen += +tr[k] || 0;
        grundlinie = { basen, truppen }; log('Welt in der Datenbank: ' + basen + ' Basen, ' + Math.round(truppen) + ' Truppen');
        // Passt die Karte des Spiels (GRID_N in spiel.js) zur Welt in der Datenbank? Sonst würden alle Basen-Nummern falsch
        // gelesen. Dann NICHT starten (zählt als Absturz → nach 5 Versuchen Wartung + Alarm): erst eine neue Welt
        // (werkzeuge/welt_neustart.php). Eine Welt ohne Kennung (vor Paket C) hatte 15 × 15 Regionen.
        const code = fs.readFileSync(path.join(GAME, 'spiel.js'), 'utf8').match(/const GRID_N = (\d+);/), spielN = code ? +code[1] : 0;
        let weltN = 0; try { weltN = +(JSON.parse(t.openWaterKarte || 'null') || {}).n || 0; } catch (e) {}
        if (basen > 0 && spielN && (weltN || 15) !== spielN) ende(5, 'Karte passt nicht zur Welt: Welt ' + (weltN || 15) + ' × ' + (weltN || 15) + ', Spiel ' + spielN + ' × ' + spielN + ' Regionen – erst die Welt neu starten (werkzeuge/welt_neustart.php)');
    } catch (e) { log('Warnung: Grundlinie nicht lesbar (' + e.message + ')'); }

    // Skripte des Spiels direkt von der Festplatte (gleicher Ordner) – fremde (3D) und baukunst.js braucht der Weltrechner nicht
    class Lader extends ResourceLoader {
        fetch(url) {
            const u = new URL(url);
            if (!u.href.startsWith(URL_BASIS)) return Promise.resolve(Buffer.from(''));
            const datei = path.basename(u.pathname);
            if (!/^(speichern|ladebildschirm|bots|welt|spiel|aufbau|buendnis|haendler)\.js$/.test(datei)) return Promise.resolve(Buffer.from(''));
            return Promise.resolve(fs.readFileSync(path.join(GAME, datei)));
        }
    }
    const konsole = new VirtualConsole();
    konsole.on('error', (...a) => fehler('Konsole: ' + a.map(x => x && x.stack || x).join(' ').slice(0, 800)));
    konsole.on('warn', (...a) => log('Warnung:', a.map(x => x && x.message || x).join(' ').slice(0, 400)));
    konsole.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS|^Uncaught/.test(e.message)) fehler('jsdom: ' + e.message); });   // (Uncaught kommt schon über 'error')

    // Vor jedem Puls: Zahlen prüfen. Kaputt → die Welt wird diesmal nicht geschrieben (der letzte gute Stand bleibt in der
    // Datenbank); dreimal hintereinander → beenden, der Neustart lädt den guten Stand.
    const geprueftHolen = w => async (url, opt) => {
        const istPuls = String(url).includes('server.php') && opt && opt.body && !(typeof opt.body === 'string' && opt.body.includes('"aktion":"befehle_da"'));   // (die kurze Nachfrage „Befehle da?“ ist kein Puls)
        if (istPuls) {
            let schlecht = '';
            try { schlecht = w.eval(PRUEFER); } catch (e) { schlecht = 'Prüfer konnte nicht prüfen: ' + e.message; }
            if (schlecht) {
                stat.prueferFehler++; stat.prueferHintereinander++;
                fehler('PRÜFER: ' + schlecht);
                if (stat.prueferHintereinander >= 3) ende(6, 'Prüfer: Welt dreimal hintereinander kaputt – Neustart mit dem letzten guten Stand');
                throw new Error('Prüfer');   // welt.js behält alles für den nächsten Versuch
            }
            stat.prueferHintereinander = 0;
        }
        const t0 = Date.now();
        try {
            const antwort = await holen(url, opt);
            if (istPuls) {
                if (antwort.ok) { stat.pulseOk++; stat.letzterPuls = Date.now(); stat.pulsMs = Date.now() - t0; startMerken('puls'); }
                else stat.pulseFehler++;
            }
            return antwort;
        } catch (e) { if (istPuls) stat.pulseFehler++; throw e; }
    };
    const dom = new JSDOM(html, {
        url: URL_BASIS + 'spiel.php', runScripts: 'dangerously', resources: new Lader(), virtualConsole: konsole, pretendToBeVisual: false,
        beforeParse(w) {
            // Brücken ins Spiel hängen am Function des Spiel-Fensters – über sie kommt man nicht an Node heran (zusätzlich
            // läuft Node im Sicherheitsmodus: config.php ist nicht lesbar, keine Programme startbar; siehe wachhund.php)
            const bruecke = f => Object.setPrototypeOf(f, w.Function.prototype);
            // die einzige Brücke nach draußen: gibt nur Zahlen und Texte zurück
            const holenGeprueft = geprueftHolen(w);
            w.__holenRoh = bruecke((url, opt, ja, nein) => {
                const o = { method: opt.method, headers: Object.assign({}, opt.headers || {}), body: opt.body };
                holenGeprueft(url, o).then(async r => { const t = await r.text(); const k = {}; r.headers.forEach((v, n) => { k[n.toLowerCase()] = v; }); ja(r.status, r.ok, t, JSON.stringify(k)); })
                    .catch(e => nein(String(e && e.message || e)));
            });
            // Alle Ersatz-Teile (nie zeichnen, kein Bildschirm) entstehen IM Spiel-Fenster – das Spiel bekommt keine
            // Node-Objekte in die Hand (über die man sonst an Node herankäme).
            w.eval('(function () {' +
                'window.requestAnimationFrame = function () { return 0; }; window.cancelAnimationFrame = function () {};' +
                'window.matchMedia = function (q) { return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; };' +
                'window.ResizeObserver = window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };' +
                'var leinwand = ' + leinwand.toString() + ';' +
                'HTMLCanvasElement.prototype.getContext = function () { return this.__ctx || (this.__ctx = leinwand(this)); };' +
                'window.Path2D = class { constructor() { return new Proxy(this, { get: function (t, k) { return k in t ? t[k] : function () {}; } }); } };' +
                "HTMLCanvasElement.prototype.toDataURL = function () { return 'data:,'; }; HTMLCanvasElement.prototype.toBlob = function (cb) { if (cb) cb(null); };" +
                'Element.prototype.scrollIntoView = function () {}; Element.prototype.scrollTo = function () {}; window.scrollTo = function () {};' +
                'navigator.sendBeacon = function () { return true; }; navigator.vibrate = function () { return true; };' +
                // fetch: die Antwort wird im Spiel-Fenster als reine Daten nachgebaut
                'var roh = window.__holenRoh; delete window.__holenRoh;' +
                'function antwort(s, ok, text, kopf) { kopf = JSON.parse(kopf); return { ok: ok, status: s, headers: { get: function (n) { var v = kopf[String(n).toLowerCase()]; return v == null ? null : v; } },' +
                '  text: function () { return Promise.resolve(text); }, json: function () { return new Promise(function (a, b) { try { a(JSON.parse(text)); } catch (e) { b(e); } }); }, clone: function () { return antwort(s, ok, text, JSON.stringify(kopf)); } }; }' +
                'window.fetch = function (url, opt) { return new Promise(function (ja, nein) { roh(String(url), opt || {}, function (s, ok, text, kopf) { ja(antwort(s, ok, text, kopf)); }, function (m) { nein(new Error(m)); }); }); };' +
                '})()');
            w.addEventListener('error', e => fehler('Spiel: ' + (e.error && e.error.stack || e.message)));
            w.__prVorher = grundlinie ? w.JSON.parse(JSON.stringify(grundlinie)) : null;   // als Daten des Spiel-Fensters
            w.__weltrechnerEnde = bruecke(status => ende(status === 503 ? 0 : 5, status === 503 ? 'Wartung' : 'Server sagt ' + status + ' (anderer Weltrechner?)'));
        }
    });
    const w = dom.window; spielFenster = w;
    await new Promise(res => w.addEventListener('load', res));
    await new Promise(res => setTimeout(res, 3000));
    if (!w.WELT || !w.WELT.system) ende(5, 'Spiel nicht richtig gestartet (WELT fehlt)');
    const geladen = w.eval('(function () { let b = 0; for (const x in botOwnedIslands) b += botOwnedIslands[x].size; return b; })()');
    log('Welt geladen: ' + geladen + ' Basen in Besitz');
    log('Spiel läuft – ' + w.eval('BOT_DEFS.length') + ' Mitspieler, Welt-Version ' + w.WELT.version);

    stat.letzterPuls = Date.now(); phase = 'läuft'; startMerken('einlesen');
    herzSchreiben();

    // Handy-Benachrichtigungen (push.js): alle 5 s schauen, ob ein echter Spieler angegriffen wird, eine Basis verliert
    // oder ein Späher kommt – und ihm (nur wenn er nicht im Spiel ist) eine Nachricht aufs Handy schicken
    const push = require('./push.js').melder(holen, log);
    stat.push = push.stat; pushMelder = push;
    for (const d of adminOffen.splice(0)) push.adminMelden(d);
    setInterval(() => push.runde(w), 5000).unref();
}
los().catch(e => ende(5, 'Start fehlgeschlagen: ' + (e && e.stack || e)));
