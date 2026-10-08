# Open Water – LIESMICH

Browser-Strategiespiel von Alexander (Deutsch, Handy zuerst) im Stil von Rise of Kingdoms / Million Lords: EINE Weltkarte
für alle echten Spieler und 150 Mitspieler, Hauptstadt mit Burg und Gebäuden, Märsche, Kämpfe, Bündnisse, Helden, Events
und eine Welt-Saison alle 8 Wochen.

**Die ganze Doku steht in `doku/`** – eine kleine Datei je Thema, Übersicht in `doku/INDEX.md`.
Suchen: `grep -ril <begriff> doku/`, dann nur die passende Datei öffnen. Code-Stellen: `grep -n "<name>" KARTE.md`.
Jede Änderung kommt in die passende `doku/`-Datei (aktueller Stand, keine Geschichte). Altes: `doku/archiv.md`.

## Wo es läuft
- Live: https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/ (Anmelden / Registrieren).
- Alles liegt auf dem Server (MySQL); im Browser nur das Login-Cookie `ow_login`. Echtzeit, keine Test-Uhr.
- Die Welt rechnet nur der Weltrechner (Node auf dem Server, `Game/weltrechner/`); Handys sind Zuschauer.
- Zugänge nur als Umgebungsvariablen (`OFFICE_USER`, `OFFICE_PASS`, `DB_*`) – nie in Dateien oder Commits.

## Ordner
```
Game/          genau dieser Ordner liegt auf dem Server (spiel.php, spiel.js, bots.js, buendnis.js, server.php …)
  spiel/ bots/ buendnis/ spielseite/ server/   Teile – NUR hier ändern, dann werkzeuge/spiel_bauen.sh
  aufbau.js welt.js speichern.js haendler.js   Stadt/Forschung · Welt-Verbindung · Speichern · Händler
  weltrechner/ app/ schrift/ bilder/          Weltrechner · App für den Startbildschirm · Schriften · KI-Bilder
doku/          Doku je Thema (INDEX.md)
tests/         alle_tests.sh, komplett.sh, server_tests.sh, browser/, server/ (nie auf dem Server)
werkzeuge/     spiel_bauen.sh, vor_commit.sh, vorschau_bauen.php, nach_hochladen.sh, welt_neustart.php …
CLAUDE.md      Regeln für Claude und die Agenten-Firma   ·   KARTE.md  Code-Karte (erzeugt)
hochladen.sh   lädt Game/ auf den Server (nur nach Alexanders Ja)
```

## Starten und ansehen
- Vorschau ohne Server: `php werkzeuge/vorschau_bauen.php <ordner>` (mit `test`: fast unbegrenzt alles, kein Nebel).
- Lokaler Server für Tests: `werkzeuge/server_starten.sh <arbeitsordner>` (MariaDB + `php -S 127.0.0.1:8770`).

## Ändern und testen
1. Stelle finden: `grep -n "<name>" KARTE.md`, Thema: `grep -ril <begriff> doku/`.
2. Nur in den Teilen ändern → `werkzeuge/spiel_bauen.sh` (prüfen: `werkzeuge/spiel_bauen.sh pruefen`).
3. Testen: `tests/alle_tests.sh <namen>` (Schnelltest), alles ohne Server: `tests/alle_tests.sh`; mit Server:
   `tests/server_tests.sh <arbeitsordner> betroffen`; vor dem Hochladen beide Reihen: `tests/komplett.sh <arbeitsordner>`.
4. Vor jedem Commit: `werkzeuge/vor_commit.sh`. Commits auf Deutsch, Branch `claude/neues-projekt-8agldl`.
5. Doku: passende `doku/`-Datei anpassen (bei neuen Entscheidungen auch `doku/entscheidungen-alexander.md`).
Einzelheiten: `doku/tests-werkzeuge.md`.

## Hochladen
- Code zuerst auf GitHub. **Erst Alexander fragen**, dann `./hochladen.sh` (Wartung an → speichern → geänderte Dateien →
  prüfen → Wartung aus). Nie Dateien anders hochladen. Danach immer `werkzeuge/nach_hochladen.sh` („LIVE OK“).
- Server kaputt? Einfach `./hochladen.sh` – lädt neu, erzeugt `config.php`, prüft alles. Nur vergleichen: `./hochladen.sh pruefen`.

## Feste Regeln (Alexander)
- Antworten kurz, einfach, Deutsch. Nie ungefragt ändern, was er nicht wollte; nichts auf dem Server löschen ohne sein Ja.
- Nur EINE Welt. Keine neuen Spielregeln erfinden. Mitspieler heißen im Spiel nie „Bot“/„KI“.
- Nichts im Browser speichern außer dem Login-Cookie. Weltrechner höchstens 600 MB, nie ein Handy als Weltrechner.
- Speicherschlüssel `openWater…`, `WORLD_VERSION` und die Kartenerzeugung nicht umbenennen (sonst Spielstände weg).
- Alle festen Entscheidungen: `doku/entscheidungen-alexander.md`. Offene Punkte: `doku/merkliste.md`.
