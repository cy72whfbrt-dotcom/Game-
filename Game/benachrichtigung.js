// ===== benachrichtigung.js – „Benachrichtigungen erlauben“ im Profil (Web-Push aufs Handy) =====
// Läuft nach spiel.js. Fragt NUR, wenn der Spieler auf den Knopf tippt (iOS verlangt das). Erst dann wird der
// Service-Worker sw.js eingetragen (Ausnahme von „nichts im Browser“, von Alexander erlaubt – er zeigt nur Nachrichten an)
// und das Abo (Adresse beim Push-Dienst + Schlüssel des Geräts) an server.php geschickt. „Ausschalten“ trägt alles aus.
// Gesendet wird vom Weltrechner (weltrechner/push.js), nur wenn du gerade nicht im Spiel bist.
// iPhone/iPad: geht nur, wenn Open Water als App auf dem Home-Bildschirm liegt (ab iOS 16.4) – dann ein Hinweis.
(function () {
    'use strict';
    const OW = window.__OW || {};
    if (OW.system) return;                           // der Weltrechner hat kein Handy
    const karte = document.getElementById('pushKarte'), text = document.getElementById('pushText'), knopf = document.getElementById('pushKnopf');
    if (!karte || !text || !knopf) return;
    const kann = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const app = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    let info = null, beschaeftigt = false, zustand = '';
    const hinweis = (t, ms) => { if (typeof flashHint === 'function') flashHint(t, ms || 3500); };

    async function server(aktion, daten) {
        const r = await fetch('server.php', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
            headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ aktion }, daten || {})) });
        if (r.status === 429) return { ok: false, grund: 'Zu viele Versuche – bitte später nochmal.' };
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }
    function bytes(s) {                              // base64url → Uint8Array (öffentlicher Schlüssel des Servers)
        const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
        return Uint8Array.from(b, c => c.charCodeAt(0));
    }
    function gleich(a, b) { if (!a || !b) return false; a = new Uint8Array(a); if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
    async function meinAbo() {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg ? { reg, sub: await reg.pushManager.getSubscription() } : { reg: null, sub: null };
    }

    const TEXTE = {
        aus: ['Bekomme eine Nachricht aufs Handy, wenn deine Basen angegriffen werden – auch wenn das Spiel zu ist.', 'Benachrichtigungen erlauben'],
        an: ['✓ An. Du bekommst eine Nachricht, wenn deine Basis angegriffen wird, eine Basis fällt oder ein Späher kommt – nur wenn du gerade nicht im Spiel bist (höchstens eine pro Minute).', 'Ausschalten'],
        iosApp: ['Auf dem iPhone geht das nur in der App: im Browser auf Teilen → „Zum Home-Bildschirm“ tippen, dann Open Water vom Home-Bildschirm öffnen und hier erlauben.', 'So geht’s'],
        kannNicht: ['Dieser Browser kann leider keine Benachrichtigungen.', ''],
        verboten: ['Benachrichtigungen sind für Open Water verboten. Erlauben kannst du sie in den Einstellungen deines Handys (bzw. Browsers) – danach hier nochmal tippen.', 'Nochmal versuchen']
    };
    function zeigen(z) {
        zustand = z;
        if (z === 'serverAus') { karte.hidden = true; return; }   // ohne Schlüssel auf dem Server gibt es nichts zu erlauben
        karte.hidden = false;
        text.textContent = TEXTE[z][0];
        knopf.textContent = TEXTE[z][1]; knopf.hidden = !TEXTE[z][1]; knopf.disabled = beschaeftigt;
    }

    // Beim Laden: wie ist es gerade? (ein kleiner Aufruf; ein bestehendes Abo wird für dieses Konto aufgefrischt)
    async function pruefen() {
        if (!kann) return zeigen(ios && !app ? 'iosApp' : 'kannNicht');
        try {
            const { sub } = await meinAbo();
            info = await server('push_info', sub ? { endpoint: sub.endpoint } : {});
            if (!info.an) return zeigen('serverAus');
            if (Notification.permission === 'denied') return zeigen('verboten');
            if (sub && Notification.permission === 'granted') {
                let s = sub;
                if (!gleich(s.options && s.options.applicationServerKey, bytes(info.schluessel))) {   // Server hat neue Schlüssel: neu abonnieren
                    await s.unsubscribe();
                    s = await (await navigator.serviceWorker.ready).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(info.schluessel) });
                    info.dieses = false;
                }
                if (!info.dieses) await server('push_an', { abo: s.toJSON() });   // z. B. anderes Konto auf diesem Gerät
                return zeigen('an');
            }
            zeigen('aus');
        } catch (e) { console.warn('Benachrichtigungen:', e); zeigen(ios && !app ? 'iosApp' : 'aus'); }
    }

    async function einschalten() {
        // ZUERST fragen (direkt nach dem Antippen – sonst fragt iOS gar nicht)
        const erlaubnis = await Notification.requestPermission();
        if (erlaubnis !== 'granted') { zeigen(erlaubnis === 'denied' ? 'verboten' : 'aus'); return; }
        if (!info) info = await server('push_info');
        if (!info.an) { zeigen('serverAus'); return; }
        const reg = await navigator.serviceWorker.register('sw.js');   // nur Push, kein Cache (siehe sw.js)
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(info.schluessel) });
        const r = await server('push_an', { abo: sub.toJSON() });
        if (!r.ok) { await sub.unsubscribe().catch(() => {}); hinweis(r.grund || 'Das hat nicht geklappt.'); zeigen('aus'); return; }
        info.dieses = true;
        zeigen('an'); hinweis('Benachrichtigungen sind an.');
    }
    async function ausschalten() {
        const { reg, sub } = await meinAbo();
        if (sub) { await server('push_ab', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
        if (reg) await reg.unregister().catch(() => {});   // nichts bleibt im Browser
        zeigen('aus'); hinweis('Benachrichtigungen sind aus.');
    }

    knopf.addEventListener('click', async () => {
        if (beschaeftigt) return;
        if (zustand === 'iosApp') { window.location.href = 'app/'; return; }
        beschaeftigt = true; knopf.disabled = true;
        const vorher = zustand;
        try { if (vorher === 'an') await ausschalten(); else await einschalten(); }
        catch (e) {
            console.warn('Benachrichtigungen:', e); hinweis('Das hat nicht geklappt – bitte später nochmal.');
            if (vorher !== 'an') try { const { reg, sub } = await meinAbo(); if (reg && !sub) await reg.unregister(); } catch (x) {}   // halb eingerichtet: wieder austragen
            zeigen(vorher === 'an' ? 'an' : 'aus');
        }
        finally { beschaeftigt = false; knopf.disabled = false; }
    });

    setTimeout(pruefen, 2500);   // nach dem Laden (das Spiel geht vor)
})();
