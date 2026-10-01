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

## Was der Spieler im neuen Chat schreiben kann
„Lies UEBERGABE.md und mach mit dem Plan weiter: logge dich bei Office ein und bring das Spiel auf meinen Server.“
