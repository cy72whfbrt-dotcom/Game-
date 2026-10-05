# Open Water – Hinweise für Claude und Agenten

Spiel von Alexander (Browser-Strategiespiel, Deutsch). Antworten an Alexander: kurz, einfach, auf Deutsch.
Alles Wichtige steht in `LIESMICH.md` – jede Änderung wird dort eingetragen.

## Code
- `Game/spiel.js` wird **automatisch zusammengesetzt** aus `Game/spiel/01-…js` bis `10-…js`.
  **Nur in `Game/spiel/` ändern**, danach `werkzeuge/spiel_bauen.sh` (setzt `spiel.js` neu zusammen).
  `werkzeuge/spiel_bauen.sh pruefen` meldet einen Fehler, wenn `spiel.js` nicht zu den Teilen passt.
  (Eine Datei im Spiel, weil der Code beim Laden Funktionen aufruft, die weiter hinten stehen.)
- Teile: 01 Grundlagen · 02 Shop/Märsche · 03 Karte · 04 Kampf (Ankunft, kampfDazu) · 05 Profil/Kampfbericht ·
  06 Alltag (Aufgaben, Pass, Schild, Nebel) · 07 Schlachten-Anzeige · 08 Stadt/Helden · 09 Events (Boss, Drache, Armeen) ·
  10 Start (UI, Einstellungen, Weltrechner-Befehle, Schummel-Schutz).
- Weitere Dateien: `bots.js` (Mitspieler), `buendnis.js` (Bündnis, Rally, Chat, Verstärkung), `aufbau.js` (Stadt-Stufen,
  Marsch-Plätze), `welt.js` (Verbindung Server), `server.php`, `weltrechner/` (Node-Weltrechner + Wachhund).
- Der Weltrechner (`rechnet()` true) ist der einzige, der die Welt schreibt; Handys sind Zuschauer.
  Echte Spieler sind dort Bots `u<id>` mit `mensch`.

## Testen
- Vorschau ohne Server: `php werkzeuge/vorschau_bauen.php <ordner> test` (setzt `spiel.js` vorher zusammen).
- Server-Tests: `php tests/server_test.php`.
- **Alle Tests ohne Server auf einmal: `tests/alle_tests.sh`** (Einheitstests + Browser-Tests aus `tests/browser/`, bis zu
  4 gleichzeitig, ca. 3–4 Min., am Ende „ALLES OK“). Schnelltest: `tests/alle_tests.sh rally burg` (nur Tests, deren Name so
  anfängt). Neue Browser-Tests dort ablegen und in die LISTE im Skript eintragen (Argument: Vorschau-Ordner).
- **Beide Reihen gleichzeitig: `tests/komplett.sh <arbeitsordner>`** (ca. 30 Min.) – vor jedem Hochladen.
- **Tests mit lokalem Server: `tests/server_tests.sh <arbeitsordner>`** (Tests aus `tests/server/`, ca. 30 Min.).
  Braucht MariaDB + `php -S 127.0.0.1:8770 -t www` im Arbeitsordner; dort `www/…/Game/config.php` (Test-DB) und
  `zugang.env` mit `OW_ADMIN_NAME`, `OW_ADMIN_PW`, `OW_TEST_PW` (nie ins Git). Kopiert `Game/`, startet den
  Weltrechner neu, am Ende „ALLES OK“. Einzelne Tests: Namen dahinter schreiben. Mehr im Kopf des Skripts.

## Arbeitsweise (Alexander 5.10.: „schneller, effizient, richtig“)
- Erst EINMAL alles sammeln (mehrere Agenten gleichzeitig suchen, je ein Bereich), daraus EINE Liste; offene Fragen auf
  einmal an Alexander. Dann in einem Rutsch abarbeiten – nicht Stück für Stück immer Neues anfangen.
- **Agenten-Firma** (immer benutzen): Alexander = Chef (Aufgaben, Ideen). Claude = Projektleiter: redet mit Alexander,
  klärt Fragen, verteilt an die Firma, prüft alle 5 Min. (Wecker), treibt langsame Agenten an, führt Ergebnisse zusammen.
  Rollen in `.claude/agents/`: **sucher** (findet Fehler/Lücken, nur lesen) · **programmierer** (baut eine Aufgabe in
  zugewiesenen Dateien + Test) · **tester** (führt Testreihen aus, wertet Rot aus) · **pruefer** (Code-Review vor dem
  Hochladen). So viele parallel wie sinnvoll: je Agent eine Aufgabe, getrennte Dateien (sonst eigene Kopie: Worktree).
- Einmal am Ende komplett testen (`tests/komplett.sh`), dann Alexander wegen Hochladen fragen.

## Regeln von Alexander
- Code zuerst auf GitHub (Branch `claude/neues-projekt-8agldl`), **vor jedem Hochladen Alexander fragen**
  (`./hochladen.sh`, nur nach seinem Ja).
- Keine neuen Spielregeln erfinden – echte Fehler beheben. Bots heißen nie „Bot“/„KI“.
- Keine Passwörter in Dateien oder Commits (nur Umgebungsvariablen).
- Nichts im Browser speichern außer dem Login-Cookie. Weltrechner höchstens 600 MB Speicher.
