# Sicherheit und Schummel-Schutz

Login, Datenlecks, Server-Filter und was der Weltrechner gegen gefälschte Handys prüft. Wichtigste Dateien:
`Game/server/01-grundlagen-login.php`, `02-sicherheit-datenlecks.php` (`profil_bereinigen`, `FREMD_OEFFENTLICH`,
`fremd_kuerzen`, `muenzen_kuerzen`, `NUR_WELTRECHNER`, `befehl_ok`, CSP), `03-nebel-maersche-seite.php` (`nebel_welt`,
`marsch_teil`, `marsch_welt`), `Game/index.php` (Login), `10d2-welt-schummelschutz.js/10d3-welt-hauptbuch.js` (Hauptbuch – siehe
`server-weltrechner-hauptbuch.md`). Regel: keine Passwörter in Dateien/Commits, nur Umgebungsvariablen.

## Login und Konto
- Passwörter nur als bcrypt-Hash, 10–72 Zeichen; gleich lange Prüfung (verrät keine Namen). Cookie `ow_login` HttpOnly,
  SameSite=Lax, Pfad /Game/, nur Fingerabdruck in der DB.
- Bremsen zählen nur Fehlversuche: je Name/Gerät, 100 Fehlversuche in 15 Min. je Adresse, IPv6 je /64; die große Grenze pro
  Konto sperrt nicht, wo der Spieler in den letzten 24 Std. gespielt hat. 30 neue Konten pro Stunde je Adresse (Schulklassen).
- Namen 3–20 Zeichen, nur lateinische Buchstaben (keine Doppelgänger-Schrift), nicht wie ein Mitspieler, eindeutig.
- Passwort ändern mit „wiederholen“, beendet Sitzungen und Push auf den ANDEREN Geräten. Rauswurf: anderes Gerät meldet sich
  an → altes bekommt „Verbindung getrennt“. „Hier weiterspielen“ nur von der eigenen Seite.
- Admin: feste Spieler-Nummern (`admin_ids`) + eigenes Admin-Passwort (15 Min., „jetzt sperren“); Formulare mit Zufallsnummer
  (nie doppelt), Post/Redirect/Get.

## Server-Schutz
- Sicherheits-Kopfzeilen: HSTS, CSP ohne fremde Skripte (seit 8.10. kein three.js/CDN), Skripte nur mit Nonce,
  `script-src-attr 'none'`, Styles mit 'unsafe-inline'; `X-Frame-Options: DENY`. Schriften selbst ausgeliefert (`Game/schrift/`).
- Formulare und Puls nur von dieser Seite (`herkunft_ok`). Daten mit `<`/`>` abgelehnt, `escapeHtml` maskiert auch `" '`.
- Grenzen: 8 MB gepackt / 24 MB entpackt, 150 Teile je Spieler, 40 MB je Konto, Puls 150/Min., 30 Befehle je Puls, offene
  Befehle je Spieler begrenzt, Befehle nur bekannter Art mit echten Zahlen (`befehl_ok`, bis 1e30).
- Kein PHP-Fehlertext im Browser; 500 = Serverfehler (wird wiederholt), 503 nur Wartung. Weltrechner-Dateien (.php mit
  Sperre) und config.php liefern nichts.
- Bekannter Rest (Hosting): andere Seiten auf demselben Webspace laufen unter demselben Benutzer und könnten config.php
  lesen – echte Trennung nur mit eigenem Konto/Domain (Alexander: bleibt bei der jetzigen Adresse).

## Was ein Handy von anderen bekommt (Datenlecks)
- Von anderen nur öffentlich (`FREMD_OEFFENTLICH`): Stufe, Macht (`macht`, rechnet der Weltrechner), Truppen-Summe (`tt`),
  Hauptstadt, Schild/Anfängerschutz, online, Aussehen, Burg-Stufe, Eroberungen/Thron-Punkte. Helden, Ausrüstung,
  Fähigkeiten, Stadt, Forschung, Edelsteine, Münzen (auch der Mitspieler, `muenzen_kuerzen`) nur per Spähbericht.
- Truppen fremder Basen nur für sichtbare Inseln (Server-Nebel). Fremde Märsche ohne Truppen/Held/Kampfwerte
  (`marsch_teil`); greift einer DICH an, kommt seine echte Stärke erst, wenn der Kampf läuft. Gemeinsame Angriffe sieht nur,
  wer dabei ist. Bündnis-Chat, Verstärkungen und Bündnis-Logs, -Signale, -Geschenke, Beitritts-Anfragen und Einladungen nur fürs eigene Bündnis (bei fremden bleibt nur die eigene Anfrage/Einladung); fremde Rally-Einträge gekürzt
  (`rally.an` [3]–[5]; [6]/[7] noch nachtragen – offen).
- Keine Gedanken der Mitspieler (Groll, Pläne, Handy-Zeiten), keine Login-Namen, kein Hauptbuch.

## Schummel-Schutz (Weltrechner prüft jeden Befehl)
- Nur eigene Basen, echte Orte, Wege über offene/eigene Tore (auch Senden, Sammeln, Lager, Invasion, Armeen), nie mehr
  Truppen als da sind, Marsch-Plätze, geschenkte Truppen nur aus echten Quellen (Stufe, Thron-Shop, Krankenhaus, Fund,
  Admin, Händler, Pass, Aufgabe).
- Keine Angriffe auf sich selbst (Gratis-EP), Tagesgrenzen beim Weltrechner, Bauherr-Rabatt nur mit Server-Zeit, Heilen
  kostet Münzen, Stufen-Belohnung ab der Weltrechner-Stufe, Beschleunigen/Teleport/Fähigkeiten-Reset kosten im Hauptbuch. Event-Shop: Wochen-Limit je Ware und zusammen (Woche ab Mo 0 Uhr Berlin, Server-Zeit) prüft das
  Hauptbuch (`hbEvShop`, Profil `evs`) – darüber wird nicht bezahlt und gemeldet.
- Rally-Warnung/Einladung/Beitritts-Anfrage/Bündnis-Einladung an dieselbe Person höchstens alle 10 Min.
- Abgelehntes erscheint als „Auffälligkeit“ auf der Admin-Seite (`weltrechner/schummel.php`, höchstens 20 je Spieler).
- Bewusst offen: das Handy rechnet weiter selbst (Weltrechner prüft Plausibilität); mehrere Gebäude gleichzeitig auf einem
  gefälschten Handy (voll bezahlt); Armeen/Felder im Nebel stehen noch in den Daten.
- Tests: `tests/server/schummel_test.js`, `php tests/server_test.php`, `fremd_test`.
