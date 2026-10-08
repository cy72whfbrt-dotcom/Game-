# Tests, Werkzeuge, Bauen, Hochladen

Wie man den Code zusammensetzt, prüft, testet und hochlädt. Wichtigste Dateien: `werkzeuge/spiel_bauen.sh`,
`werkzeuge/vor_commit.sh`, `tests/alle_tests.sh`, `tests/komplett.sh`, `tests/server_tests.sh`, `hochladen.sh`,
`werkzeuge/nach_hochladen.sh`, `werkzeuge/vorschau_bauen.php`. Die Regeln dazu stehen auch in `CLAUDE.md` (gelten immer).

## Code zusammensetzen
- `Game/spiel.js`, `bots.js`, `buendnis.js`, `spiel.php`, `server.php` werden aus den Teil-Ordnern `Game/spiel/`, `bots/`,
  `buendnis/`, `spielseite/`, `server/` zusammengesetzt (Tabelle ZIELE in `spiel_bauen.sh`). NUR in den Teilen ändern, dann
  `werkzeuge/spiel_bauen.sh`; `spiel_bauen.sh pruefen` meldet Abweichungen. Jeder Teil beginnt mit EINER Kopfzeile
  `// Teil <name>: …`. (Eine Datei im Browser, weil beim Laden Funktionen aufgerufen werden, die weiter hinten stehen.)
- `spiel_bauen.sh` verkleinert danach alle Browser-Skripte nach `Game/klein/` (terser, nicht im Git; `skript.php` liefert sie
  gepackt mit Version in der Adresse, passt die sha1 nicht → Original) und erzeugt `KARTE.md` neu (`werkzeuge/karte.sh`).
- `KARTE.md`: Index Funktion → Datei:Zeile (auch Teile, Server-Aktionen). Nur per `grep` lesen. `merge=ours` in
  `.gitattributes` (Treiber setzt `werkzeuge/git_einrichten.sh`).
- Dateien im Spiel-Ordner: `index.php` (Login), `spiel.php`, `ladebildschirm.js`, `speichern.js`, `welt.js`, `aufbau.js`,
  `haendler.js`, `benachrichtigung.js`, `sw.js` (nur Push), `skript.php`, `admin.php`, `app/`, `schrift/`, `bilder/`,
  `weltrechner/`. Teil-Ordner kommen nicht auf den Server.

## Vor jedem Commit
- `werkzeuge/vor_commit.sh`: Leerzeichen-Fehler im Staging, Konfliktmarker (.md/.js/.sh/.php/.json), `spiel_bauen.sh pruefen`,
  KARTE.md aktuell, `bash -n` auf geänderte .sh, kein `pkill`/`killall` ohne Pfad in `tests/` (Ausnahme `# vor_commit: ok`).
- Weitere Prüfungen: `node --check`, `php -l`, `node tests/welt_test.js`, `php tests/server_test.php`.

## Tests ohne Server
- `tests/alle_tests.sh` – alle Einheitstests + Browser-Tests aus `tests/browser/` (bis zu 4 gleichzeitig, ca. 3–4 Min., am
  Ende „ALLES OK“). Schnelltest: `tests/alle_tests.sh rally burg` (Tests, deren Name so anfängt). Neue Browser-Tests in die
  LISTE im Skript eintragen (Argument: Vorschau `$V` = Test-Modus „test viele“, `$N` = normal).
- Browser-Tests: nie feste Ports/`/tmp`-Namen (`srv.listen(0, '127.0.0.1')`, Bilder in `process.argv[3]`). Höchstens 4
  Test-Prozesse auf der ganzen Maschine (Slots `/tmp/ow_slot1…4` per `flock`, `OW_SLOTS`). Ergebnis in `<arbeitsordner>/FERTIG`.
- Rote Tests werden am Ende einmal allein wiederholt („rot → grün bei Wiederholung (Last?)“ zählt als OK).
- Vorschau ohne Server: `php werkzeuge/vorschau_bauen.php <ordner> [artifact] [test [viele]]` – „test“: kein Nebel, fast
  unbegrenzt alles (alle 10 s aufgefüllt), Drache/Invasion früh (`EV_TEST` in `werkzeuge/vorschau_test.js`); „test viele“ =
  alle Mitspieler. Spieltester baut normal (ohne „test“).
- Testdateien nur für Aussehen: `werkzeuge/marschtest/` (Märsche), `werkzeuge/kartentest/` (Zonen-Karte, erzeugt auch
  `01a2-karte-zonen.js`). Regeln/Zahlen kommen immer aus dem Spiel.

## Tests mit Server
- `tests/server_tests.sh <arbeitsordner>` (MariaDB + `php -S 127.0.0.1:8770 -t www` im Arbeitsordner, `config.php` der
  Test-DB, `zugang.env` mit `OW_ADMIN_NAME`, `OW_ADMIN_PW`, `OW_TEST_PW` – nie ins Git). 3 Gruppen gleichzeitig (Gruppe 2/3:
  DB `<testdb>_gN`, Port 8771/8772, eigener Weltrechner), ca. 15 Min. `werkzeuge/server_starten.sh` startet bei Bedarf.
- Nur passende Tests: `tests/server_tests.sh <arbeitsordner> betroffen [<bereich>]` (Tabelle `BETROFFEN`, Standard
  `$(git merge-base origin/claude/neues-projekt-8agldl HEAD)..HEAD`, `OW_TROCKEN=1` zeigt nur die Auswahl). Läuft schon ein
  Lauf im Ordner, wartet das Skript (bis 60 Min., `OW_WARTEN_MIN`, `OW_NICHT_WARTEN=1`) und räumt Reste ab.
  Dauer grüner Tests in `tests/zeiten.txt` (Gruppen-Verteilung).
- `tests/komplett.sh <arbeitsordner>`: beide Reihen gleichzeitig (Server zuerst, Browser mit `OW_SLOTS=2 nice`), ca. 15–20 Min.,
  `FORTSCHRITT`, `komplett.log`, `FERTIG` – vor jedem Hochladen (Endprüfer). Programmierer nur betroffene Tests.
- `tests/sicherung_test.php` (eigene MariaDB-DB), `tests/server/` (absturz, admin, armee, kiste, klick, schummel, verst …).

## Hochladen (nur nach Alexanders Ja)
- Code zuerst auf GitHub (Branch `claude/neues-projekt-8agldl`, Commits auf Deutsch). Erst Alexander fragen, dann
  `./hochladen.sh`: vergleicht vorher, welche Dateien sich geändert haben → Wartung an → 10 s Speichern → nur geänderte
  Dateien (PHP immer) hochladen → zurücklesen und vergleichen → Wartung aus. Zeitgrenzen + 3 Wiederholungen je Anfrage;
  bricht etwas ab: „WARTUNG NOCH AN – … erneut starten“. `ALLES=1` lädt alles; `./hochladen.sh pruefen` vergleicht nur.
  Erzeugt `config.php` aus den Umgebungsvariablen, entfernt fremde Reste aus `Game/`. Nie Dateien anders hochladen.
- Danach immer `werkzeuge/nach_hochladen.sh [zeitpunkt]` (nur lesend): Weltrechner neu gestartet und lebt, keine neuen
  FEHLER, Speicher < 600 MB, Startseite 200 → „LIVE OK“ oder Fehlerliste.
- Neue Welt: `werkzeuge/welt_neustart.php` (siehe `server-weltrechner-hauptbuch.md`). Auf dem Server liegen noch
  `baukunst.js`/`klein/baukunst.js` (werden nicht mehr geladen – beim nächsten Aufräumen löschen).

## Firma (Agenten)
- Rollen in `.claude/agents/`, Ablauf und Regeln in `CLAUDE.md`. Statuszeile: `werkzeuge/status.sh <kurzname> <schritt>
  <text>` → `<scratchpad>/firma/<kurzname>.txt`. Live-Seite „Agenten-Firma“ (Artifact). Fortschritt-Zeilen: `werkzeuge/fortschritt.sh`.
