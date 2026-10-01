# Übergabe für eine neue Sitzung (Open Water)

Lies diese Datei zuerst. Danach `FEHLER.md` (Fehlerliste mit Stand) und `IDEEN.md` (entschiedene Pläne).

## Projekt
- Deutsches Browser-Strategiespiel **„Open Water“**: `index.html` (ein großes Script), `botlogik.js` (150 Mitspieler, wird vor dem Hauptscript geladen, nur Definitionen), `baukunst.js` (3D-Basen, three.js von cdn.jsdelivr.net).
- Branch: `claude/neues-projekt-8agldl` – immer dort committen und mit `git push -u origin claude/neues-projekt-8agldl` pushen.
- Commit-Nachrichten auf Deutsch.
- Veröffentlichtes Spiel (Claude-Artifact): https://claude.ai/artifact/FtYfCTcfkiUgg5YM8Y7Qhn – neu veröffentlichen mit `index.html` als Seite und den Dateien `botlogik.js` und `baukunst.js` (Artifact-Parameter `files`).
- Mit dem Spieler (Alexander) immer **auf Deutsch** und einfach erklären.

## Wichtigste Regeln
- **Der Spielstand darf nie verloren gehen:** `WORLD_VERSION`, Kartenerzeugung und die `openWater…`-Speicherschlüssel nicht ändern oder umbenennen; alte Stände immer ohne Verlust umrechnen.
- Texte im Spiel kurz, deutsch, nie „Bot“/„KI“ (die Mitspieler sind normale Spieler).
- Vor jedem Veröffentlichen testen (Playwright, Syntax-Check), dann committen, pushen, veröffentlichen.

## Problem, das gerade gelöst werden soll
Das Spiel speichert nur im Browser-Speicher der Claude-App. Die App leert diesen Speicher manchmal (z. B. wenn sie im Hintergrund beendet wird) → **das Spiel startet neu, der Spielstand ist weg** (passiert am 1.10. mehrmals). Der Spielcode selbst löscht nichts.

## Plan: Spiel auf Alexanders eigenen Server
- **office.hobbitonhill.de** – „Office“: eigenes Programm mit Login (Felder „Vorname“ und „Passwort“), Nginx. Über diesen Editor/Server soll das Spiel online gehen, damit jeder spielen kann.
- **db.lapush.de** – **phpMyAdmin 5.2.1** (MySQL) auf einem Webhosting, Benutzer `k17700_admin`.
- Zugangsdaten stehen in den **Umgebungsvariablen** der Cloud-Umgebung „Unity“: `OFFICE_USER`, `OFFICE_PASS` (später evtl. `DB_USER`, `DB_PASS`, `FTP_…`). Netzwerkzugriff ist auf „Vollständig“ gestellt.
- Ziel:
  1. Bei Office einloggen (Daten aus den Umgebungsvariablen) und schauen, wie man dort Dateien/Seiten hochlädt.
  2. Spiel (`index.html`, `botlogik.js`, `baukunst.js`) dort online stellen.
  3. Kleines PHP-Skript (`save.php`) + Tabelle in MySQL für Spielstände; das Spiel lädt/speichert darüber (pro Spieler eigener Stand).
- Vorher dem Spieler kurz erklären, was gemacht wird, und nichts auf dem Server löschen oder überschreiben, ohne zu fragen.
- Alternative, falls das nicht klappt: Sicherung über den eingebauten Artifact-Speicher (`db`-Capability, privater Bereich `data/users/<id>/`) – der Spieler hat dazu noch nicht „ja“ gesagt.

## Stand 1.10. (zweite Sitzung) – nur angeschaut, NICHTS hochgeladen
- Der Spieler hat gesagt: **noch nichts hochladen, noch nichts bauen.** Erst wieder anfangen, wenn er „ja“ sagt.
- **Entschieden:** Auf dem Server darf das Spiel **bei Null anfangen**. Ein Übertragen des alten Spielstands aus der Claude-App wird **nicht** gebaut.
- Office-Login klappt: `POST https://office.hobbitonhill.de/index.php?` mit den Feldern `name`, `pw`, `login=login`. Danach steht in den Links eine `sid=…`, die bei jedem Aufruf mitgeschickt werden muss.
- Datei-Editor: `html/editor.php?h=48&w=138&sid=…&path=<Ordner>`. Er kann Dateien öffnen, speichern, anlegen, umbenennen, löschen und hochladen (Formularfeld `button` = save / new file / new folder / upload …).
- Sichtbarer Ordner: `…/office.hobbitonhill.de/html/725/klassenarbeit_GR4/`, darin `Main_game_folder_` (Unterordner `PNG` mit Bildern und `backup_vor_cleanup` mit alten Dateien eines anderen Spiels). **Nichts davon anfassen.**
- Was dort liegt, ist öffentlich erreichbar unter `https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/…`, und PHP läuft dort.
- Idee für später: einen eigenen neuen Ordner (z. B. `open_water`) anlegen und das Spiel plus `save.php` dort hineinlegen. Spielstände könnten auch ohne MySQL als Dateien gespeichert werden.
- Im Spiel laufen alle Speicherzugriffe über `store` (index.html, Anfang des Hauptscripts). Dort ließe sich die Server-Sicherung einbauen.
- Branch dieser Sitzung: `claude/office-login-game-server-u7tgrc`.

## Was der Spieler im neuen Chat schreiben kann
„Lies UEBERGABE.md und mach mit dem Plan weiter: logge dich bei Office ein und bring das Spiel auf meinen Server.“

## Entschieden vom Spieler (1.10., erste Sitzung)
- Im Office-Editor einen **eigenen Ordner `Game`** anlegen, darin alles sauber sortiert (z. B. `index.html` mit Login, `js/` fürs Spiel, `api/` für die PHP-Skripte).
- **Login mit Nutzer + Passwort** (Registrieren/Anmelden), Passwörter nur gehasht (`password_hash`). Danach geht es ins Spiel. Jeder Spieler hat seinen eigenen Spielstand.
- **Alle Spielstände in der MySQL-Datenbank auf db.lapush.de.** Die Datenbank-Zugangsdaten trägt der Spieler später selbst in die Umgebungsvariablen ein (`DB_USER`, `DB_PASS`, ggf. `DB_HOST`, `DB_NAME`) – laut ihm klappt der Zugriff.
- **Im Browser wird NICHTS gespeichert** (kein localStorage, kein sessionStorage, kein IndexedDB) – **einzige Ausnahme: ein Login-Cookie** (nur der Sitzungs-Schlüssel, HttpOnly, läuft nach 30 Tagen ab). Das Spiel hält den Stand im Arbeitsspeicher und speichert laufend auf den Server (z. B. über `store` in index.html).
- Der Spielstand auf dem Server fängt bei Null an.
- Erst bauen/hochladen, wenn der Spieler „ja“ sagt und die erste Sitzung ihren Gesamtcheck gepusht hat.

## Stand 1.10. (dritte Sitzung) – Server-Ordner gebaut, noch nicht hochgeladen
- Quellen in `server/` (Login `index.php`, `spiel.php`, `api/lib.php`, `api/speichern.php`, `js/speicher.js`). `tools/baue_game.sh` baut daraus `dist/Game` (nicht im Git) mit dem aktuellen Spiel.
- `api/config.php` (nicht im Git, Vorlage `config.beispiel.php`): `speicher` = `mysql` oder `dateien`.
- `js/speicher.js` ersetzt `localStorage` durch einen Speicher im Arbeitsspeicher; alle 10 s und beim Wechsel in den Hintergrund gehen die geänderten Teile gzip-gepackt an `api/speichern.php`. Im Browser liegt nur der Cookie `ow_login` (HttpOnly, 30 Tage).
- Nur das zuletzt geöffnete Fenster speichert (Spiel-Token); ältere Fenster zeigen einen Hinweis.
- Neue Spieler: keine Test-Zeitsprünge, kein Turnier-Test, Spielername = Login-Name.
- Lokal getestet (Playwright): Registrieren, Anmelden, falsches Passwort, Abmelden, Neu laden mit Spielstand, zweites Fenster, beide Speicherarten (MariaDB lokal).
- Office-Login klappt; der Editor erlaubt nur `…/html/725/klassenarbeit_GR4/`. Ziel: `…/klassenarbeit_GR4/Game/`.
- Offen: Hochladen (wurde von der Sicherheitsprüfung blockiert), Datenbankname, und ob der Office-Server die Datenbank `dbwebintern.silentnetwork.de` (interne Adresse 10.35.47.236) überhaupt erreicht.
