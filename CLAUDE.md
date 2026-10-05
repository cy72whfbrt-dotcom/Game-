# Open Water – Hinweise für Claude und Agenten

Spiel von Alexander (Browser-Strategiespiel, Deutsch). Antworten an Alexander: kurz, einfach, auf Deutsch.
Alles Wichtige steht in `LIESMICH.md` – jede Änderung wird dort eingetragen.

## Code
- `Game/spiel.js`, `Game/bots.js` und `Game/buendnis.js` werden **automatisch zusammengesetzt** aus `Game/spiel/`,
  `Game/bots/` und `Game/buendnis/`. **Nur in den Teilen ändern**, danach `werkzeuge/spiel_bauen.sh` (setzt alle drei neu
  zusammen). `werkzeuge/spiel_bauen.sh pruefen` meldet einen Fehler, wenn eine Datei nicht zu ihren Teilen passt.
  Jeder Teil beginnt mit EINER Kopfzeile `// Teil <name>: …` (kommt nicht in die zusammengesetzte Datei).
  (Eine Datei im Spiel, weil der Code beim Laden Funktionen aufruft, die weiter hinten stehen.)
- Teile von spiel.js (41): 01a grundlagen · 01b weltkarte · 01c basen-spielstand · 01d helden-mitspieler ·
  01e nebel-kampfwerte-hud · 02a shop-stufen · 02b maersche · 02c spaeher-ankunft (resolveAttack) · 03a karte-hintergrund ·
  03b gebaeude-3d · 03c wappen-thronplatz · 03d maersche-tagnacht · 03e kamera-eingabe · 04 kampf (Ankunft, kampfDazu) ·
  05a aussehen-profil · 05b truhe-skills · 05c erfolge-rangliste · 05d maersche-kampfbericht · 06a aufgaben ·
  06b pass-anleitung · 06c thron-mitte · 06d schild-produktion · 06e nebel-zeichnen · 07a schlachten · 07b kriegsherr ·
  08a stadt-bauen · 08b burg-aussehen · 08c helden · 08d gebaeude-wirkung · 08e stadtbild-haeuser · 08f stadtbild-bild ·
  09a funde-felder · 09b lager-tagesboss · 09c events-drache · 09d armeen-wegmarken · 09e inselfenster · 09f saison ·
  10a inselfenster-vorschau · 10b inselfenster-knoepfe · 10c start-einstellungen ·
  10d welt-weltrechner (Weltrechner-Befehle, Hauptbuch/Schummel-Schutz).
  bots.js (Mitspieler), Teile in bots/ (6): 01 spieler · 02 kampf-karte · 03 angreifen · 04 stand-stadt · 05 verteidigen-takt · 06 aussehen-felder-barbaren.
  buendnis.js (Bündnis, Rally, Chat, Verstärkung), Teile in buendnis/ (4): 01 daten-regeln (bundOp) · 02 rally-geschenke · 03 mitspieler · 04 fenster-karte-welt.
- Weitere Dateien: `aufbau.js` (Stadt-Stufen, Marsch-Plätze), `welt.js` (Verbindung Server), `server.php`,
  `weltrechner/` (Node-Weltrechner + Wachhund).
- Der Weltrechner (`rechnet()` true) ist der einzige, der die Welt schreibt; Handys sind Zuschauer.
  Echte Spieler sind dort Bots `u<id>` mit `mensch`.

## Testen
- Vorschau ohne Server: `php werkzeuge/vorschau_bauen.php <ordner> test` (setzt `spiel.js` vorher zusammen).
- Server-Tests: `php tests/server_test.php`.
- **Alle Tests ohne Server auf einmal: `tests/alle_tests.sh`** (Einheitstests + Browser-Tests aus `tests/browser/`, bis zu
  4 gleichzeitig, ca. 3–4 Min., am Ende „ALLES OK“). Schnelltest: `tests/alle_tests.sh rally burg` (nur Tests, deren Name so
  anfängt). Neue Browser-Tests dort ablegen und in die LISTE im Skript eintragen (Argument: Vorschau-Ordner).
  Parallel-Läufe in verschiedenen Kopien (Worktrees) sind erlaubt. Darum in Browser-Tests nie feste Ports oder /tmp-Namen:
  `srv.listen(0, '127.0.0.1')` + `srv.address().port`, Dateien in den Arbeitsordner (`process.argv[3]`).
  Grenze für die ganze Maschine: höchstens 4 Test-Prozesse über ALLE Läufe (Slots `/tmp/ow_slot1…4` per `flock`,
  `OW_SLOTS` ändert die Zahl) – weitere warten. Ergebnis steht am Ende in `<arbeitsordner>/FERTIG` (Pfad wird am
  Anfang ausgegeben): dort nachsehen statt zu warten.
- **Beide Reihen gleichzeitig: `tests/komplett.sh <arbeitsordner>`** (ca. 15–20 Min.) – vor jedem Hochladen.
- **Tests mit lokalem Server: `tests/server_tests.sh <arbeitsordner>`** (Tests aus `tests/server/` in 3 Gruppen
  gleichzeitig, ca. 15 statt 30 Min.). Braucht MariaDB + `php -S 127.0.0.1:8770 -t www` im Arbeitsordner; dort
  `www/…/Game/config.php` (Test-DB) und `zugang.env` mit `OW_ADMIN_NAME`, `OW_ADMIN_PW`, `OW_TEST_PW` (nie ins Git).
  Gruppe 2/3 legt das Skript selbst an und räumt sie am Ende ab: Ordner `<arbeitsordner>/gruppeN/`, DB `<testdb>_gN`
  (frische Kopie, `mysql` als Admin über den Socket), Port 8771/8772, eigener Weltrechner. Am Ende „ALLES OK“.
  Einzelne Tests: Namen dahinter schreiben (nacheinander, nur 8770). Mehr im Kopf des Skripts.

## Arbeitsweise (Alexander 5.10.: „schneller, effizient, richtig“)
- Erst EINMAL alles sammeln (mehrere Agenten gleichzeitig suchen, je ein Bereich), daraus EINE Liste; offene Fragen auf
  einmal an Alexander. Dann in einem Rutsch abarbeiten – nicht Stück für Stück immer Neues anfangen.
- **Agenten-Firma** (immer benutzen): Alexander = Chef (Aufgaben, Ideen). Claude = Projektleiter: redet mit Alexander,
  klärt Fragen, verteilt an die Firma, prüft alle 5 Min. (Wecker), treibt langsame Agenten an – arbeitet selbst kaum:
  auch Zusammenführen, Sortieren und Hochladen-Vorbereitung machen Agenten.
  Rollen in `.claude/agents/`: **sucher** (findet Fehler/Lücken, nur lesen) · **programmierer** (baut eine Aufgabe in
  zugewiesenen Dateien + Test) · **disponent** (bei jeder 5-Min.-Runde: welche wartende Aufgabe kann jetzt schon laufen?) ·
  **verbesserer** (alle ~30 Min. + nach großen Schritten: Vorschläge, wie die Firma schneller/genauer wird – Claude baut sie ein).
  Aufpasser-Runde prüft auch: wartet ein Agent, obwohl bei ihm nichts mehr läuft (keine Test-Prozesse)? → sofort antreiben. Nur ZWEI Prüfungen: **schnellpruefer** (nach jeder Aufgabe, ~5–10 Min.: Diff + Schnelltests)
  und **endpruefer** (einmal vor dem Hochladen, gründlich: alle Änderungen + `tests/komplett.sh`). Schnell UND genau.
  So viele parallel wie sinnvoll: je Agent eine Aufgabe, getrennte Dateien (sonst eigene Kopie: Worktree).
- **Immer arbeiten, nie warten:** ist ein Agent fertig, bekommt sofort der nächste eine Aufgabe; nichts Offenes bleibt
  unvergeben. Nach 30 Min. ohne Ergebnis Zwischenstand holen und antreiben. Live-Seite (Artifact „Agenten-Firma“,
  claude.ai/artifact/UDzcMoamcZSv1qugqKXymm) bei jeder Vergabe/jedem Abschluss aktualisieren (Regelwerk steht dort).
- Einmal am Ende komplett testen (`tests/komplett.sh`), dann Alexander wegen Hochladen fragen.
- Maschine hat 4 Kerne: nie mehrere volle Testreihen gleichzeitig (nur Endprüfer/Zusammenführen); Programmierer testen nur
  ihre betroffenen Tests. Zusammenführen: zuerst Branch + Commit prüfen (`git log -1 <branch>`).
- Fragen an Alexander: immer mit Beispiel aus dem Spiel, Folge für den Spieler in einem Satz, Auswahl A/B mit Empfehlung.

## Regeln von Alexander
- Code zuerst auf GitHub (Branch `claude/neues-projekt-8agldl`), **vor jedem Hochladen Alexander fragen**
  (`./hochladen.sh`, nur nach seinem Ja).
- Keine neuen Spielregeln erfinden – echte Fehler beheben. Bots heißen nie „Bot“/„KI“.
- Keine Passwörter in Dateien oder Commits (nur Umgebungsvariablen).
- Nichts im Browser speichern außer dem Login-Cookie. Weltrechner höchstens 600 MB Speicher.
