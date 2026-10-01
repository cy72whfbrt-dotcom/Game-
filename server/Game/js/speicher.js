// Spielstand auf dem eigenen Server: im Browser wird nichts gespeichert. Der Stand liegt im Arbeitsspeicher
// (window.__OW_MEM, das Spiel greift über "store" darauf zu) und geht regelmäßig als Ganzes in die Datenbank.
(function () {
    'use strict';
    var S = window.__OW_START || {}; delete window.__OW_START;
    var m = new Map(Object.entries(S.data || {}));
    var dirty = false, busy = false, stopped = false, fails = 0, rev = S.rev | 0;
    var EVERY = 10000;   // alle 10 s, wenn sich etwas geändert hat

    if (S.neu) {         // neuer Spieler: echter Start bei Null - ohne die alten Test-Geschenke, Zeitsprünge, Vorspulen der anderen und Test-Läufe
        var done = { openWaterReset: '1', openWaterJump3d: '1', openWaterJumpCenter: '1', openWaterJump6d: '1', openWaterTourTest1: '1',
                     openWaterBotsJump3d: '1', openWaterBotsCenter: '1', openWaterBotsCenter2: '1', openWaterBotsJump6d: '1',
                     openWaterCoinsMax2: '1', openWaterCoinsMax3: '1', openWaterCoinsMax4: '1', openWaterGiftMax: '1', openWaterGems9: '1',
                     openWaterFogOff: '1', openWaterGift3: 'g3', openWaterEmmaOnlyMine: '2', openWaterEmmaFair: '1' };
        Object.keys(done).forEach(function (k) { m.set(k, done[k]); });
        if (S.name) m.set('openWaterPlayerName', S.name);
        dirty = true;
    }

    window.__OW_MEM = {
        getItem: function (k) { return m.has(k) ? m.get(k) : null; },
        setItem: function (k, v) { v = String(v); if (m.get(k) !== v) { m.set(k, v); dirty = true; } },
        removeItem: function (k) { if (m.delete(k)) dirty = true; },
        keys: function () { return Array.from(m.keys()); }
    };

    function pack(text) {
        if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
        try { return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }
        catch (e) { return Promise.resolve(null); }
    }

    function flush(leaving) {
        if (!dirty || busy || stopped) return;
        dirty = false; busy = true; rev++;
        var myRev = rev, text = JSON.stringify(Object.fromEntries(m));
        pack(text).then(function (gz) {
            var body = gz || text, size = gz ? gz.byteLength : text.length;
            return fetch('api/speichern.php', {
                method: 'POST', credentials: 'same-origin', keepalive: leaving === true && size < 50000, body: body,   // keepalive nur beim Verlassen (der Browser erlaubt dafür nur wenig)
                headers: { 'X-OW': '1', 'X-OW-Tab': S.tab || '', 'X-OW-Rev': String(myRev), 'X-OW-Gz': gz ? '1' : '0',
                           'Content-Type': 'application/octet-stream' }
            });
        }).then(function (r) {
            busy = false;
            if (r.status === 409) return stop('Das Spiel ist in einem anderen Fenster geöffnet.', 'Hier weiterspielen', function () { location.reload(); });
            if (r.status === 401) return stop('Du bist nicht mehr angemeldet.', 'Anmelden', function () { location.href = './'; });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            fails = 0; note(false);
            if (dirty && document.visibilityState === 'hidden') flush(true);   // beim Weggehen noch den neuesten Stand nachschicken
        }).catch(function (e) {
            if (window.console) console.warn('Speichern:', e && e.message);
            busy = false; dirty = true; fails++;
            if (fails >= 2) note(true);
            setTimeout(function () { flush(false); }, Math.min(60000, 3000 * fails));
        });
    }

    var bar = null;
    function note(on) {
        if (!on) { if (bar) bar.style.display = 'none'; return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:#7a2a1a;color:#fff;'
                + 'font:600 14px/1.3 Inter,system-ui,sans-serif;padding:8px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);max-width:90vw;text-align:center';
            bar.textContent = 'Speichern klappt gerade nicht – bitte Internet prüfen. Es wird weiter versucht.';
            document.body.appendChild(bar);
        }
        bar.style.display = '';
    }

    function stop(text, btnText, act) {
        stopped = true;
        var o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(5,12,24,.92);display:flex;align-items:center;justify-content:center;padding:16px';
        o.innerHTML = '<div style="background:#13233b;color:#eef3f8;border-radius:14px;padding:22px;max-width:340px;text-align:center;font:500 16px/1.4 Inter,system-ui,sans-serif">'
            + '<p style="margin:0 0 16px"></p><button type="button" style="font:700 16px Inter,system-ui,sans-serif;padding:10px 18px;border:0;border-radius:10px;background:#e0b04a;color:#1b1406"></button></div>';
        o.querySelector('p').textContent = text;
        var b = o.querySelector('button'); b.textContent = btnText; b.onclick = act;
        document.body.appendChild(o);
    }

    setInterval(function () { flush(false); }, EVERY);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', function () { flush(true); });
    window.__OW_FLUSH = flush;   // (für Tests)
    window.__OW_INFO = function () { return { dirty: dirty, busy: busy, stopped: stopped, fails: fails, rev: rev }; };
})();
