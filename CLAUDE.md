# Open Water – Hinweise für Claude und Agenten

Spiel von Alexander (Browser-Strategiespiel, Deutsch). Antworten an Alexander: kurz, einfach, auf Deutsch.
Alles Wichtige steht in `LIESMICH.md` – jede Änderung wird dort eingetragen.

## Code
- **Erst in `KARTE.md` suchen** (`grep -n "bundHilfe" KARTE.md` → Datei:Zeile, auch Teile und Server-Aktionen).
  Wird von `werkzeuge/spiel_bauen.sh` automatisch neu erzeugt (einzeln: `werkzeuge/karte.sh`).
- `Game/spiel.js`, `Game/bots.js`, `Game/buendnis.js`, `Game/baukunst.js`, `Game/spiel.php` und `Game/server.php` werden
  **automatisch zusammengesetzt** aus `Game/spiel/`, `Game/bots/`, `Game/buendnis/`, `Game/baukunst/`, `Game/spielseite/`
  und `Game/server/`. **Nur in den Teilen ändern**, danach `werkzeuge/spiel_bauen.sh` (setzt alle neu zusammen).
  `werkzeuge/spiel_bauen.sh pruefen` meldet einen Fehler, wenn eine Datei nicht zu ihren Teilen passt.
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
  baukunst.js (Basen in 3D), Teile in baukunst/ (8): 01 werkzeugkasten · 02 buehne-grundbasis · 03 wahrzeichen-feuer ·
  04 vielfalt-stile · 05 umland · 06 turmhof-festung · 07 hafen-palast · 08 himmelsfeste-bilder.
  spiel.php (Spielseite), Teile in spielseite/ (8, *.php): 01 kopf-grundwerte · 02 stil-hud-fenster · 03 stil-bausteine ·
  04 stil-shop-handy · 05 stil-ladebild-stadt · 06 symbole-karte · 07 fenster · 08 dialoge-stadt-skripte.
  server.php, Teile in server/ (7, *.php): 01 grundlagen-login · 02 sicherheit-datenlecks · 03 nebel-maersche-seite ·
  04 datenbank-spieler · 05 datenbank-welt (MysqlLager) · 06 speichern-push-konto · 07 welt-puls.
  Auch die PHP-Teile beginnen mit „// Teil …“ (fällt beim Zusammensetzen weg). Neue Ziele: Tabelle ZIELE in spiel_bauen.sh.
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
- **Beide Reihen gleichzeitig: `tests/komplett.sh <arbeitsordner>`** (ca. 15–20 Min.) – vor jedem Hochladen. Im
  Arbeitsordner: `FORTSCHRITT` (je Test eine Zeile), am Ende `FERTIG`. Rote Tests werden einmal allein wiederholt
  („rot → grün bei Wiederholung (Last?)“ zählt als OK, wieder rot = FEHLER).
- **Tests mit lokalem Server: `tests/server_tests.sh <arbeitsordner>`** (Tests aus `tests/server/` in 3 Gruppen
  gleichzeitig, ca. 15 statt 30 Min.). Braucht MariaDB + `php -S 127.0.0.1:8770 -t www` im Arbeitsordner; dort
  `www/…/Game/config.php` (Test-DB) und `zugang.env` mit `OW_ADMIN_NAME`, `OW_ADMIN_PW`, `OW_TEST_PW` (nie ins Git).
  Gruppe 2/3 legt das Skript selbst an (Server/Weltrechner werden am Ende beendet, Ordner + DB erst beim nächsten Lauf neu angelegt): Ordner `<arbeitsordner>/gruppeN/`, DB `<testdb>_gN`
  (frische Kopie, `mysql` als Admin über den Socket), Port 8771/8772, eigener Weltrechner. Am Ende „ALLES OK“.
  Einzelne Tests: Namen dahinter schreiben (nacheinander, nur 8770). Mehr im Kopf des Skripts.
  Nur passende Tests zu den Änderungen: `tests/server_tests.sh <arbeitsordner> betroffen [<git-bereich>]` (Tabelle im
  Skript; `OW_TROCKEN=1` zeigt nur die Auswahl). Server startet bei Bedarf selbst (`werkzeuge/server_starten.sh`).
  Ohne Bereich nimmt `betroffen` alles seit `git merge-base origin/claude/neues-projekt-8agldl HEAD` (Ausgabe „N Dateien → Tests …“).
  Läuft im selben Arbeitsordner schon ein Lauf, wartet das Skript (bis 60 Min., `OW_WARTEN_MIN`; jede Minute „wartet auf Lauf
  von …“ aus `.server.lock.info`; `OW_NICHT_WARTEN=1` bricht ab) und räumt danach Reste abgebrochener Läufe (Gruppen-Server,
  Weltrechner, DB `_gN`) selbst ab.
- **Vor jedem Commit: `werkzeuge/vor_commit.sh`** (Leerzeichen-Fehler, Konfliktmarker, `spiel_bauen.sh pruefen`, `bash -n`
  auf geänderte *.sh).
- `KARTE.md` hat in `.gitattributes` `merge=ours` (kein Merge-Konflikt, wird beim Bauen neu erzeugt); den Treiber setzt
  `werkzeuge/git_einrichten.sh` (rufen `spiel_bauen.sh` und `vor_commit.sh` selbst auf).
- Statuszeile der Firma: `werkzeuge/status.sh <kurzname> <schritt> <text>` (Ordner `OW_FIRMA`, Standard der Firmen-Ordner).

## Arbeitsweise (Alexander 5.10.: „schneller, effizient, richtig“)
- Erst EINMAL alles sammeln (mehrere Agenten gleichzeitig suchen, je ein Bereich), daraus EINE Liste; offene Fragen auf
  einmal an Alexander. Dann in einem Rutsch abarbeiten – nicht Stück für Stück immer Neues anfangen.
- **Agenten-Firma** (immer benutzen): Alexander = Chef (Aufgaben, Ideen). Claude = Projektleiter: redet mit Alexander,
  klärt Fragen, verteilt an die Firma, prüft alle 5 Min. (Wecker), treibt langsame Agenten an.
  **Grenze:** Claude macht selbst nur Kleinkram unter 2 Min. (ein Satz in Regeln/LIESMICH, Live-Seite). Spiel-Code, Tests,
  Skripte, Zusammenführen und Prüfen machen immer Agenten. Hochladen macht Claude nur nach Alexanders Ja, danach immer
  `werkzeuge/nach_hochladen.sh`.
  Rollen in `.claude/agents/`: **sucher** (findet Fehler/Lücken, nur lesen) · **programmierer** (baut eine Aufgabe in
  zugewiesenen Dateien + Test) · **schnellpruefer** (nach jeder Aufgabe, ~5–10 Min.: Diff + Schnelltests) ·
  **endpruefer** (einmal vor dem Hochladen, gründlich: alle Änderungen + `tests/komplett.sh`) · **aufpasser** (inkl.
  Disponent; alle 5 Min., max. 2 Min.: bekommt laufende Agenten + wartende Aufgaben, meldet „läuft ok / hängt → antreiben /
  jetzt starten“) · **verbesserer** (nach jeder großen Aufgabe – nach dem Hochladen bzw. wenn eine Aufgabenliste fertig ist:
  Vorschläge, wie die Firma schneller/genauer wird – Claude baut sie ein) · **zusammenfuehrer** (nach jeder Prüfung:
  fertige Branches mergen, Konflikte lösen, Schnelltests, pushen – nie hochladen) · **spieltester** (vor dem Endprüfer und
  nach großen Änderungen an Oberfläche/Abläufen: spielt die Vorschau auf Handy + Desktop, Liste mit Bildschirmfotos) ·
  **livewaechter** (stündlich + nach jedem Hochladen, nur lesen: `werkzeuge/nach_hochladen.sh`, „LIVE OK“ oder Funde) ·
  **designer** (vor jeder Design-Aufgabe: Vorbilder online → Vorgabe; danach: Bilder prüfen, bevor Alexander sie sieht). Nur ZWEI Prüfungen (schnell + end). Schnell UND genau.
  **DURCHLAUF (Alexander 6.10., gilt für jede Aufgabe):** Programmierer vorn → direkt dahinter Prüfer → dahinter Designer,
  alle GLEICHZEITIG, nicht nacheinander. Prüfer prüft jedes fertige Stück sofort wie ein Spieler (Vorschau, Handy-Fotos:
  Zahlen sinnvoll? Ablauf klappt? Fehler?) und gibt Funde gleich an den Programmierer. Designer ändert nichts: sucht
  Grafik-Fehler (→ an Prüfer → an Programmierer) und gibt Alexander Verbesserungs-Ideen. Nichts geht hoch, bevor Prüfer
  + Designer durch sind. Claude startet nichts ohne Alexanders Auftrag (Fehler-Meldungen nur in die Merkliste).
  **Niemand wartet still:** jeder Agent schreibt beim Start und mindestens alle 5 Min. eine Zeile in
  `<scratchpad>/firma/<kurzname>.txt` (`<Uhrzeit UTC> | <Schritt> | <was läuft>`, am Ende `… | fertig | <Ergebnis>`);
  den Kurznamen gibt Claude im Auftrag mit. Älter als 10 Min. = „hängt“.
  So viele parallel wie sinnvoll: je Agent eine Aufgabe, getrennte Dateien (sonst eigene Kopie: Worktree).
- **Immer arbeiten, nie warten:** ist ein Agent fertig, bekommt sofort der nächste eine Aufgabe; nichts Offenes bleibt
  unvergeben. Nach 30 Min. ohne Ergebnis Zwischenstand holen und antreiben. Live-Seite (Artifact „Agenten-Firma“,
  claude.ai/artifact/UDzcMoamcZSv1qugqKXymm) bei jeder Vergabe/jedem Abschluss aktualisieren (Regelwerk steht dort); sie
  zeigt bei jedem Agenten den letzten Schritt aus seiner Statusdatei, wer >10 Min. nichts meldet, steht dort rot.
- Einmal am Ende komplett testen (`tests/komplett.sh`), dann Alexander wegen Hochladen fragen.
- Spieltester schon auf dem ersten fertigen Branch einer Oberflächen-Aufgabe laufen lassen (parallel), nicht erst vor dem Endprüfer.
  Bei Netz/Server-Änderungen prüft ein Sucher Fristen/Zeitgrenzen gegen langsame Antworten (Hoster-Last).
- Programmierer/Schnellprüfer: Server-Tests nur `betroffen` statt der ganzen Reihe; vor dem Commit `werkzeuge/vor_commit.sh`.
  Bereich für `betroffen`: `$(git merge-base origin/claude/neues-projekt-8agldl HEAD)..HEAD` (nie `origin/..HEAD`).
- Fertig erst melden, wenn alle eigenen Hintergrund-Läufe zu Ende sind (FERTIG gelesen); letzte Statuszeile `… | fertig | <Ergebnis>` ist Pflicht (auch Schnellprüfer).
- Fix für einen roten Test: erst rot VOR dem Fix zeigen und die Ursache in einem Satz nennen; braucht es Anlauf 2, sucht ein Sucher die Ursache.
  Prüfliste: jeder Kauf ab 500 Edelsteinen hat „Wirklich?“ (`gemsWirklich`); Truppen/Münzen/Edelsteine nie doppelt oder weg.
- Spieltester baut die Vorschau normal (`php werkzeuge/vorschau_bauen.php <ordner>`), „test“ nur wenn ausdrücklich verlangt.
- Maschine hat 4 Kerne: nie mehrere volle Testreihen gleichzeitig (nur Endprüfer/Zusammenführen); Programmierer testen nur
  ihre betroffenen Tests. Zusammenführen: zuerst Branch + Commit prüfen (`git log -1 <branch>`).
- Fragen an Alexander: immer mit Beispiel aus dem Spiel, Folge für den Spieler in einem Satz, Auswahl A/B mit Empfehlung.
- Design-Aufgaben (Alexander 6.10.): ZUERST ein Agent online Vorbilder suchen lassen (RoK, Million Lords, Lords Mobile …) →
  Vorgabe in `<scratchpad>/design_*.md`; Programmierer baut danach. Vor dem Zeigen an Alexander prüft ein Agent die Bilder
  gegen die Vorgabe („sieht es aus wie ein Spiel, nicht wie eine Liste?“). Alexander nie nach Vorbildern fragen.
- Zahlen (Kosten, Erträge, Gegner) immer aus Spieler-Sicht prüfen, bevor sie live gehen: „Burg 4 kostet 7 Holz“ ist ein Fehler,
  auch wenn die Tests grün sind. Vergleich mit RoK-Größen.

## Regeln von Alexander
- Code zuerst auf GitHub (Branch `claude/neues-projekt-8agldl`), **vor jedem Hochladen Alexander fragen**
  (`./hochladen.sh`, nur nach seinem Ja). Nach jedem Hochladen: `werkzeuge/nach_hochladen.sh` (Live-Server, nur lesend →
  „LIVE OK“ oder Fehlerliste).
- Keine neuen Spielregeln erfinden – echte Fehler beheben. Bots heißen nie „Bot“/„KI“.
- Keine Passwörter in Dateien oder Commits (nur Umgebungsvariablen).
- Nichts im Browser speichern außer dem Login-Cookie. Weltrechner höchstens 600 MB Speicher.
