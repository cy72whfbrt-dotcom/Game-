# Server, Weltrechner, Hauptbuch, Speichern

EINE Welt für alle; der Weltrechner (Node auf dem Server) ist der einzige, der die Welt schreibt; Handys sind Zuschauer und
schicken Befehle. Wichtigste Dateien: `Game/server/` (7 Teile → `server.php`: 01 grundlagen-login · 02 sicherheit-datenlecks ·
03 nebel-maersche-seite · 04 datenbank-spieler · 05 datenbank-welt `MysqlLager` · 06 speichern-push-konto · 07 welt-puls),
`Game/welt.js` (Umrechnen, Puls, Flicken, Befehle, `profilZuBot`), `Game/speichern.js`, `Game/weltrechner/` (`start.js`,
`wachhund.php`, `push.js`, `jsdom.js`), `Game/spiel/10d*` (10d5-welt-befehle: `BEFEHLE`, `WELT.wache`; 10d3-welt-hauptbuch: `hbKlemmen`; 10d2: Schummel-Schutz).

## Server und Datenbank
- Live: https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/ – Office-Server (netcup-Webhosting von Alexander,
  PHP 7.3, MySQL 8.4, Node 22 unter `/opt/plesk/node/22/bin/node`, 16 Kerne geteilt, kein Chrome).
- Office-Editor: Login `POST https://office.hobbitonhill.de/index.php?` (`name`, `pw`, `login=login` → `sid`); Editor
  `html/editor.php?…&path=<Ordner>`, Feld `button` = `new folder`/`upload`/`delete`. Erlaubt nur `…/html/725/klassenarbeit_GR4/`.
  Der Editor zeigt Rückstriche als Kürzel (`<bsl>`, `<n>` …) – `werkzeuge/editor_text.php` wandelt zurück.
- Zugänge nur in Umgebungsvariablen der Cloud-Umgebung „Unity“: `OFFICE_USER`/`OFFICE_PASS`, `DB_USER`/`DB_PASS`,
  `DB_HOST` (`dbwebintern.silentnetwork.de`, nur vom Office-Server erreichbar), `DB_NAME` `k17700_alex`. phpMyAdmin: db.lapush.de.
  `config.php` nur auf dem Server (erzeugt `hochladen.sh`), `admin_ids` (alexander = 3).
- Tabellen: `ow_spieler` (Konto, Übersicht, `profil`, `online_bis`, `sicht`, `push_aus`), `ow_bots`, `ow_spielstand`,
  `ow_sitzungen`, `ow_welt_info`, `ow_befehle`, `ow_ereignisse`, `ow_welt_flicken`, `ow_sicherungen`, `ow_push`.
  Legen sich selbst an; bei JEDER Tabellen-Änderung `MysqlLager::TABELLEN_STAND` hochzählen. Fremde Tabellen eines
  anderen Spiels (`nutzer`, `mail`, `handel`, `kronen` …) nie anfassen. Cronjob für cron.lapush.de nie anfassen.

## Speichern
- Das Spiel nutzt intern `store` (localStorage-Form); `speichern.js` hält alles im Arbeitsspeicher und schickt geänderte
  Teile alle 3 s gepackt an `server.php`, beim Schließen sofort (keepalive + „Abschied“). Im Browser liegt nur das
  Login-Cookie `ow_login` (30 Tage, HttpOnly). Nur das zuletzt geöffnete Fenster speichert.
- Welt-Teile gehen nie in den eigenen Spielstand (Liste `WELT` in speichern.js).

## Weltrechner (Prinzip Schiedsrichter)
- `weltrechner/start.js` lädt die Spielseite ohne Bildschirm (jsdom) und lässt denselben Spiel-Code laufen (`rechnet()` true,
  `SYSTEM`-Modus). REGEL: nie ein Handy die Welt rechnen lassen. Höchstens 600 MB (Heap 450 MB, `--expose-gc`, ab 80 %
  aufräumen), `nice 10`, Node im Sicherheitsmodus (`--permission`). Anmeldung per Kopfzeile `X-Weltrechner` (Zufallsschlüssel
  je Hochladen, nur über die Umgebung).
- Puls: Befehle abholen (`befehle_da` alle 0,3 s, gerecht 40 je Runde), rechnen, Welt + Nachrichten + Sicht + Quittung in
  EINER Transaktion speichern. Nur Änderungen („Flicken“, `flickenBauen`/`flicken_anwenden`), Spieler holen alle ~2 s.
  Leitung gilt 45 s ab Ende des Pulses (`LEITER_SEK`, nach langsamem Puls doppelt bis 3 Min.); ein alter Weltrechner
  bekommt 409 und beendet sich. Handy-Hinweis „Verbindung wird wiederhergestellt …“ erst nach 20 s ohne Weltrechner.
- Wachhund (`wachhund.php`, Cronjob jede Minute + bei Spieler-Pulsen): Herzschlag mit Phase (`start` bis 15 Min., `läuft`
  3 Min.), Prozess jünger als 15 Min. gilt als „startet“; vor jedem Start alle alten Prozesse beenden; Server-Überlast
  (Last > 1,5 je Kern, Weltrechner rechnet kaum) → bis 10 Min. geduldig. Server zu langsam zählt nie als Absturz.
- Notbremse: 5 echte Abstürze in 5 Min. → keine Neustarts, Wartung an, Alarm auf der Admin-Seite (hebt nur Alexander auf).
- Prüfer vor jedem Schreiben: keine kaputten Zahlen (NaN, negativ, > 1e30), keine Basis mit zwei Besitzern, Welt darf nicht
  verschwinden (Basen < 80 % oder praktisch keine Truppen). 3× hintereinander → Neustart vom guten Stand.
- Sicherungen stündlich (die letzten 48; einmal am Tag mit Spielerkonten), Saison-Sicherung 2 Wochen. Zurückspielen:
  Weltrechner beenden → jetzigen Stand sichern → in einer Transaktion → neue Version; „nur Welt“ oder „alles“ (Kästchen).

## Genau einmal (Befehle, Nachrichten)
- Befehle tragen eine Nummer vom Handy (`cid`), Nachrichten eine vom Weltrechner (`mid`); der Server legt keine Nummer
  zweimal ab. Abgeholt erst, wenn verbucht (`openWaterEreignisFertig`). Ausgang am Handy (`openWaterBefehlAus`) in derselben
  Sicherung wie das Bezahlte. Bezahlte Befehle (`BEFEHLE_BEZAHLT`) verfallen nie (bis 7 Tage), andere nach 10 Min.
- Event-Preise mit fester Nummer aus Auszahlung + Spieler. Höchstens 30 Befehle pro Puls, 400 offene je Spieler.

## Hauptbuch (3B, Schummel-Schutz beim Weltrechner)
- Für jeden echten Spieler `botState[u<id>].hb` (Spieler bekommen es nie): Stufe nur aus EP, Münzen/Edelsteine/Rohstoffe als
  Konten mit Topf des Ausgegebenen, Spielraum je Quelle und Tag (`HB_TAG`), Stadt/Forschung nur mit Bauzeit + Kosten
  (`hb.ruhe`, `hb.bu`, `hb.foRuhe`), Ausrüstung/Helden statistisch, Schild nur gekauft. `WELT.klemmen` (`hbKlemmen`): die Welt
  benutzt nur, was er wirklich haben kann. Abgelehntes nach 2 Min. = eine Auffälligkeit „Hauptbuch“ (Admin-Seite).
- Rohstoff-Deckel für das ganze Profil (`m.rDeckelP`), Münz-Spielraum (`spielraumTeile`), Markt (`wache.rm`), Funde ≤ 300
  Truppen-Funde/Tag (`wache.fund`), Thron-Kisten `hb.thK`, Bündnis-Kiste `hb.kaufG`, Stern-Edelsteine `stW`.
- Nach Zurückspielen gleicht der Weltrechner das Hauptbuch einmal je Spieler an (`ow_welt_info.zurueck`).
- Schummel-Verdacht: ab 5 Auffälligkeiten/Std. eine Push an die Admin-Konten – nie automatisch bremsen.

## Push (Web-Push)
- `weltrechner/push.js`, Service-Worker `Game/sw.js` nur für Push (einzige Browser-Ausnahme, Alexander erlaubt). Nur wenn man
  nicht im Spiel ist, höchstens 1/Min. Arten einzeln abschaltbar (`PUSH_ARTEN`, Einstellungen). iPhone nur als Home-App.
- VAPID-Schlüssel in `weltrechner/vapid.php` (nie löschen, nie im Git). Abmelden trägt das Gerät aus.

## Admin, Wartung, Neustart
- `admin.php` (nirgends verlinkt, nur Admins, zusätzlich Passwort 15 Min.): Wartung, Geschenke (Abholfach, auch an
  Mitspieler), Spielerliste, Nebel freischalten, Weltrechner-Status, Sicherungen, Saison-Knopf, Auffälligkeiten.
- Wartung = `Game/wartung.txt` (gilt für alle, auch Admins). `werkzeuge/welt_neustart.php` (nur Wartung, POST
  `ja=NEUSTART`, 15 Min. gültig, löscht sich) setzt Welt und Spielstände neu, Konten bleiben.
- Hochladen und Prüfen danach: `tests-werkzeuge.md`.
