// ===== sw.js – Service-Worker NUR für Handy-Benachrichtigungen (Web-Push) =====
// AUSNAHME von der Regel „nichts im Browser“ – von Alexander erlaubt, aber NUR für Push:
//   - KEIN Zwischenspeichern von Dateien (kein Cache), KEIN fetch-Handler, KEINE Spieldaten, kein Speicher.
//   - Er empfängt nur die Nachricht vom Push-Dienst (Apple/Google …), zeigt sie an, und Antippen öffnet das Spiel.
// Eingetragen wird er erst, wenn der Spieler im Profil auf „Benachrichtigungen erlauben“ tippt (benachrichtigung.js);
// „Ausschalten“ trägt ihn wieder aus. Die Nachrichten schickt der Weltrechner (weltrechner/push.js), verschlüsselt.
'use strict';

self.addEventListener('install', () => self.skipWaiting());   // neue Version sofort benutzen (es gibt nichts zu laden)

self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (x) { d = { text: e.data ? e.data.text() : '' }; }
    const titel = String(d.titel || 'Open Water').slice(0, 80);
    e.waitUntil(self.registration.showNotification(titel, {
        body: String(d.text || '').slice(0, 400),
        icon: 'app/icon-192.png', badge: 'app/icon-192.png',
        tag: String(d.tag || 'open-water').slice(0, 40), renotify: true,
        lang: 'de'
    }));
});

// Antippen: ein offenes Spiel nach vorne holen, sonst das Spiel öffnen
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenster => {
        for (const f of fenster) if ('focus' in f) return f.focus();
        return self.clients.openWindow('spiel.php');
    }));
});
