// Server-Speicher für Open Water: Der Spielstand kommt mit der Seite (window.__OW.stand) und liegt nur im Arbeitsspeicher.
// Das Spiel spricht weiter mit "localStorage" - das ist hier aber ein Ersatz, der nichts im Browser ablegt
// und alle 3 Sekunden (und sofort beim Schließen) die geänderten Teile an den Server schickt.
(function () {
    'use strict';
    var OW = window.__OW || { stand: {}, token: '' };
    var daten = Object.create(null);
    Object.keys(OW.stand || {}).forEach(function (k) { daten[k] = String(OW.stand[k]); });
    delete OW.stand;
    var geaendert = new Set();          // Schlüssel, die noch zum Server müssen
    var unterwegs = null;               // laufende Übertragung
    var gestoppt = false;               // abgemeldet oder anderswo geöffnet: nicht mehr speichern
    var fehlerZahl = 0;

    function merke(k) { if (String(k).indexOf('openWater') === 0) geaendert.add(String(k)); }
    var api = {
        getItem: function (k) { k = String(k); return k in daten ? daten[k] : null; },
        setItem: function (k, v) { k = String(k); v = String(v); if (daten[k] === v) return; daten[k] = v; merke(k); },
        removeItem: function (k) { k = String(k); if (!(k in daten)) return; delete daten[k]; merke(k); },
        clear: function () { Object.keys(daten).forEach(api.removeItem); },
        key: function (i) { var ks = Object.keys(daten); return i >= 0 && i < ks.length ? ks[i] : null; },
        get length() { return Object.keys(daten).length; }
    };
    var ersatz = new Proxy(api, {
        get: function (t, p) { if (p in t) return t[p]; return typeof p === 'string' && p in daten ? daten[p] : undefined; },
        set: function (t, p, v) { api.setItem(p, v); return true; },
        has: function (t, p) { return p in t || p in daten; },
        deleteProperty: function (t, p) { api.removeItem(p); return true; },
        ownKeys: function () { return Object.keys(daten); },
        getOwnPropertyDescriptor: function (t, p) { if (typeof p === 'string' && p in daten) return { value: daten[p], writable: true, enumerable: true, configurable: true }; return undefined; }
    });
    var sm = Object.create(null);       // sessionStorage: nur im Arbeitsspeicher, wird nie gesendet
    var leer = {
        getItem: function (k) { k = String(k); return k in sm ? sm[k] : null; },
        setItem: function (k, v) { sm[String(k)] = String(v); },
        removeItem: function (k) { delete sm[String(k)]; },
        clear: function () { Object.keys(sm).forEach(function (k) { delete sm[k]; }); },
        key: function (i) { return Object.keys(sm)[i] || null; },
        get length() { return Object.keys(sm).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: ersatz, configurable: true }); } catch (e) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: leer, configurable: true }); } catch (e) {}

    // ===== kleine Anzeige oben, nur wenn etwas nicht stimmt =====
    var schild = null;
    function zeige(text, knopf) {
        if (!document.body) { document.addEventListener('DOMContentLoaded', function () { zeige(text, knopf); }); return; }
        if (!schild) {
            schild = document.createElement('div');
            schild.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 32px);' +
                'background:#2b2118;color:#f6efe0;border:1px solid #c9a227;border-radius:10px;padding:8px 12px;font:14px Georgia,serif;' +
                'box-shadow:0 6px 20px rgba(0,0,0,.5);text-align:center';
            document.body.appendChild(schild);
        }
        schild.textContent = text;
        if (knopf) {
            var a = document.createElement('a');
            a.href = knopf[1]; a.textContent = knopf[0];
            a.style.cssText = 'color:#c9a227;margin-left:10px;font-weight:bold';
            schild.appendChild(a);
        }
        schild.style.display = '';
    }
    function verstecke() { if (schild) schild.style.display = 'none'; }

    // ===== senden =====
    // Regelmäßig alle 3 s. Beim Schließen/Neuladen/Wegschieben sofort und im selben Moment (gzip ohne Warten, fflate),
    // mit "keepalive" - so kommt die Sicherung auch an, wenn die Seite gleich danach weg ist.
    var MAX_KEEPALIVE = 60000;           // Browser lassen beim Schließen nur ~64 KB pro Sicherung zu
    var imFlug = new Set();              // Schlüssel der laufenden normalen Übertragung (wird beim Schließen mitgeschickt)
    function paketText(keys, abschied) {
        var setzen = {}, loeschen = [];
        keys.forEach(function (k) { if (k in daten) setzen[k] = daten[k]; else loeschen.push(k); });
        var o = { token: OW.token, setzen: setzen, loeschen: loeschen };
        if (abschied) o.abschied = 1;   // letzte Sicherung dieses Fensters: die neue Seite darf jetzt laden
        return JSON.stringify(o);
    }
    function packen(text) {
        try { if (window.fflate) return window.fflate.gzipSync(window.fflate.strToU8(text), { level: 6 }); } catch (e) {}
        return null;
    }
    function schicke(keys, keepalive, abschied) {
        var text = paketText(keys, abschied), gz = packen(text);
        var kopf = { 'X-Open-Water': '1', 'Content-Type': 'application/octet-stream' };
        if (gz) kopf['X-Gepackt'] = '1';
        return fetch('api/speichern.php', { method: 'POST', headers: kopf, body: gz || text, credentials: 'same-origin', cache: 'no-store', keepalive: !!keepalive });
    }
    function antwort(r) {
        if (r.ok) { fehlerZahl = 0; verstecke(); return; }
        if (r.status === 401) { gestoppt = true; zeige('Du bist abgemeldet – dein Spiel wird nicht mehr gespeichert.', ['Neu anmelden', './']); return; }
        if (r.status === 409) { gestoppt = true; zeige('Du spielst gerade in einem anderen Fenster oder auf einem anderen Gerät. Hier wird nicht mehr gespeichert.', ['Hier weiterspielen', 'spiel.php']); return; }
        throw new Error('HTTP ' + r.status);
    }
    function fehlgeschlagen(keys) {
        keys.forEach(function (k) { geaendert.add(k); });   // nichts geht verloren: beim nächsten Mal nochmal
        fehlerZahl++;
        if (fehlerZahl >= 2) zeige('Keine Verbindung zum Server – dein Spielstand wird gespeichert, sobald sie wieder da ist.');
    }
    function senden() {
        if (gestoppt || unterwegs || !geaendert.size) return unterwegs || Promise.resolve();
        var keys = Array.from(geaendert);
        geaendert.clear();
        keys.forEach(function (k) { imFlug.add(k); });
        unterwegs = Promise.resolve().then(function () { return schicke(keys, false); }).then(antwort)
            .catch(function () { fehlgeschlagen(keys); })
            .then(function () { imFlug.clear(); unterwegs = null; });
        return unterwegs;
    }
    // Sofort-Sicherung beim Verlassen: alles Offene plus die laufende Übertragung (die der Browser evtl. abbricht).
    // abschied = Fenster wird geschlossen/neu geladen (nicht nur in den Hintergrund geschoben).
    var abschiedGesendet = false;
    function sofort(abschied) {
        if (gestoppt) return;
        var offen = new Set(geaendert);
        imFlug.forEach(function (k) { offen.add(k); });
        if (!offen.size && !(abschied && !abschiedGesendet)) return;
        if (abschied) abschiedGesendet = true;
        geaendert.clear(); imFlug.clear();
        // kleine Teile zuerst (Münzen, Stufen, Helden …), große (Welt, Mitspieler) danach - passt alles in eine, umso besser
        var keys = Array.from(offen).sort(function (a, b) { return ((daten[a] || '').length) - ((daten[b] || '').length); });
        var teil = keys, rest = [];
        var gz = packen(paketText(teil));
        while (gz && gz.length > MAX_KEEPALIVE && teil.length > 1) {
            var n = Math.max(1, Math.floor(teil.length * 0.7));
            rest = teil.slice(n).concat(rest); teil = teil.slice(0, n);
            gz = packen(paketText(teil));
        }
        if (!gz || gz.length > MAX_KEEPALIVE) { rest = keys; teil = []; }
        var los = function (ks, ka, ab) { try { schicke(ks, ka, ab).then(antwort).catch(function () { fehlgeschlagen(ks); }); } catch (e) { fehlgeschlagen(ks); } };
        // der Abschied geht mit dem letzten Paket, damit die neue Seite erst lädt, wenn alles drin ist
        if (teil.length || !rest.length) los(teil, true, abschied && !rest.length);
        if (rest.length) los(rest, false, abschied);   // zu groß für "keepalive": normal hinterher
    }
    window.addEventListener('pageshow', function (e) { if (e.persisted) abschiedGesendet = false; });
    setInterval(senden, 3000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sofort(false); });
    window.addEventListener('pagehide', function () { sofort(true); });
    window.addEventListener('beforeunload', function () { sofort(true); });   // kommt beim Neuladen VOR dem Laden der neuen Seite
    window.__owSpeichern = senden;   // für Tests
    window.__owSofort = sofort;
})();
