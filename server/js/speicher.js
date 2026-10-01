// Server-Speicher für Open Water: Der Spielstand kommt mit der Seite (window.__OW.stand) und liegt nur im Arbeitsspeicher.
// Das Spiel spricht weiter mit "localStorage" - das ist hier aber ein Ersatz, der nichts im Browser ablegt
// und alle 10 Sekunden die geänderten Teile an den Server schickt.
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
    function paket() {
        var setzen = {}, loeschen = [];
        geaendert.forEach(function (k) { if (k in daten) setzen[k] = daten[k]; else loeschen.push(k); });
        return { keys: Array.from(geaendert), text: JSON.stringify({ token: OW.token, setzen: setzen, loeschen: loeschen }) };
    }
    function packen(text) {
        if (typeof CompressionStream !== 'function') return Promise.resolve(null);
        try {
            var s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Response(s).arrayBuffer().catch(function () { return null; });
        } catch (e) { return Promise.resolve(null); }
    }
    function senden() {
        if (gestoppt || unterwegs || !geaendert.size) return unterwegs || Promise.resolve();
        var p = paket();
        geaendert.clear();
        unterwegs = packen(p.text).then(function (gz) {
            var kopf = { 'X-Open-Water': '1', 'Content-Type': 'application/octet-stream' };
            if (gz) kopf['X-Gepackt'] = '1';
            return fetch('api/speichern.php', { method: 'POST', headers: kopf, body: gz || p.text, credentials: 'same-origin', cache: 'no-store' });
        }).then(function (r) {
            if (r.ok) { fehlerZahl = 0; verstecke(); return; }
            if (r.status === 401) { gestoppt = true; zeige('Du bist abgemeldet – dein Spiel wird nicht mehr gespeichert.', ['Neu anmelden', './']); return; }
            if (r.status === 409) { gestoppt = true; zeige('Du spielst gerade in einem anderen Fenster oder auf einem anderen Gerät. Hier wird nicht mehr gespeichert.', ['Hier weiterspielen', 'spiel.php']); return; }
            throw new Error('HTTP ' + r.status);
        }).catch(function () {
            p.keys.forEach(function (k) { geaendert.add(k); });   // nichts geht verloren: beim nächsten Mal nochmal
            fehlerZahl++;
            if (fehlerZahl >= 2) zeige('Keine Verbindung zum Server – dein Spielstand wird gespeichert, sobald sie wieder da ist.');
        }).then(function () { unterwegs = null; });
        return unterwegs;
    }
    setInterval(senden, 10000);
    // Beim Wechsel in den Hintergrund sofort sichern (die App kann danach jederzeit beendet werden)
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') senden(); });
    window.addEventListener('pagehide', senden);
    window.addEventListener('beforeunload', senden);
    window.__owSpeichern = senden;   // für Tests
})();
