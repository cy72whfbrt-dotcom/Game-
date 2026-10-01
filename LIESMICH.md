# Open Water – LIESMICH (die einzige Info-Datei)

Neuer Chat? **Nur diese Datei lesen**, dann ist man auf dem Stand.

## 0. Mit wem und wie
- Spieler und Chef: **Alexander**. Schreibt am Handy, kurz, mit Tippfehlern. **Immer auf Deutsch, einfach, ohne Fachchinesisch.**
- Er testet viel und schickt Screenshots. Sagt er „Fehler sammeln“: nur eine nummerierte Liste führen (Abschnitt 9), nichts reparieren, bis er „mach das alles“ sagt.
- Große Aufgaben gern mit Agenten parallel, danach zusammenführen, testen, committen, pushen, hochladen.
- Bei Kleinigkeiten selbst sinnvoll entscheiden und danach kurz erklären. Rückfragen kurz halten.
- **Nie ungefragt** Dinge ändern, die er nicht wollte. **Nichts auf dem Server löschen ohne sein klares Ja.**
- Im Spiel: kurze deutsche Texte, **nie „Bot“ oder „KI“** (die Mitspieler sind „Spieler“).
- Commits auf Deutsch, Branch `claude/neues-projekt-8agldl`, pushen mit `git push -u origin claude/neues-projekt-8agldl`.
- **Keine Passwörter in Dateien oder Commits.**

## 1. Wo das Spiel läuft
**https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/**
- Startseite: Anmelden / Neu registrieren (Name + Passwort, Passwort nur verschlüsselt gespeichert).
- **Alles wird auf dem Server gespeichert** (MySQL). Im Browser liegt **nur** das Login-Cookie `ow_login` (30 Tage).
- Echtzeit. Keine Test-Uhr, keine Test-Geschenke.

## 2. Dateien (GitHub = Server, genau gleich)
```
Game/                  ← genau dieser Ordner liegt auf dem Server
  index.php            Startseite: Anmelden / Registrieren / Abmelden
  spiel.php            Spielseite: Aufbau (HTML) + Aussehen (CSS)
  ladebildschirm.js    Ladebildschirm (Meer, Burg, Tageszeit, Tipps)
  spiel.js             das ganze Spiel
  bots.js              alles über die Mitspieler (Denken, Angriffe, Stadt, Helden …)
  baukunst.js          3D-Bilder der Basen (braucht three.js aus dem Netz, sonst 2D)
  speichern.js         Speichern/Laden: hält den Stand im Arbeitsspeicher, schickt ihn an server.php
  server.php           alles auf dem Server: Datenbank, Login, Laden, Speichern
  config.php           Datenbank-Zugang – NUR auf dem Server, nie im Git (wird von hochladen.sh erzeugt)
LIESMICH.md            diese Datei
hochladen.sh           lädt Game/ auf den Server (ein Befehl)
```
**Server kaputt oder Editor abgestürzt?** Einfach `./hochladen.sh` – lädt alles neu hoch, erzeugt `config.php` aus den
Umgebungsvariablen, entfernt fremde Reste aus `Game/` und prüft, dass alles heil angekommen ist.
**Nach jeder Änderung:** testen → committen → pushen → `./hochladen.sh`. So bleiben GitHub und Server gleich.

## 3. Zugänge (in den Umgebungsvariablen der Cloud-Umgebung „Unity“)
| Variable | Wofür |
|---|---|
| `OFFICE_USER`, `OFFICE_PASS` | Login bei office.hobbitonhill.de (Datei-Editor) |
| `DB_USER`, `DB_PASS` | MySQL, Benutzer `k17700_alex` |
| `DB_HOST` | `dbwebintern.silentnetwork.de` (interne Adresse – nur der Office-Server kommt dran, die Cloud-Umgebung nicht) |
| `DB_NAME` | `k17700_alex` |
- Datenbank ansehen: phpMyAdmin auf **db.lapush.de**.
- Claude-Code-Modus auf **„Fragen“** stellen, nicht „Auto“ – sonst blockiert die Sicherheitsprüfung das Hochladen.
- Alexander sollte seine Passwörter ändern (standen am 1.10. im Chat). Neues DB-Passwort → Variable ändern → `./hochladen.sh`.

## 4. Office-Server
- Login: `POST https://office.hobbitonhill.de/index.php?` mit `name`, `pw`, `login=login` → `sid` steht in den Links.
- Editor: `html/editor.php?h=48&w=138&sid=…&path=<Ordner>`; Formularfeld `button`: `new folder`, `upload` (Datei im Feld `file`),
  `delete` (Ordner-Pfad + `file=<Name>`). Erlaubt ist nur `…/office.hobbitonhill.de/html/725/klassenarbeit_GR4/`.
- PHP 7.3, MySQL 8.4, schafft mehrere Anfragen gleichzeitig. Eine Sicherung dauert auf dem Server ~60 ms.
- Neben `Game` liegt **`Main_game_folder_`** (anderes Spiel: Bilder, Backup). **Nicht anfassen**, bis Alexander klar „löschen“ sagt.

## 5. Datenbank `k17700_alex`
| Tabelle | Inhalt |
|---|---|
| `ow_spieler` | alle Spieler: Name, Passwort-Hash, Übersicht `stufe`, `muenzen`, `gems`, `anzahl_basen`, `zuletzt_gespeichert` |
| `ow_bots` | alle Mitspieler: eine Zeile je Mitspieler: `stufe`, `muenzen`, `anzahl_basen`, `basen`, `zustand` (Rest) |
| `ow_spielstand` | alles andere (Gebäude, Truppen, Angriffe, Titel, Helden, Aufgaben …), je Teil eine Zeile |
| `ow_sitzungen` | Logins (nur Fingerabdruck des Cookies) |
Tabellen legen sich selbst an. **Fremde Tabellen eines anderen Spiels (`nutzer`, `mail`, `handel`, `kronen` …) nie anfassen.**

## 6. Speichern (so funktioniert es)
- Das Spiel spricht intern mit „localStorage“ (über `store` in spiel.js); `speichern.js` ersetzt das durch einen Speicher
  im Arbeitsspeicher. Im Browser landet nichts.
- Alle 3 s gehen die geänderten Teile gepackt an `server.php`. Beim Wegschieben/Schließen/Neuladen sofort (keepalive).
- Beim Schließen/Neuladen schickt das Fenster einen „Abschied“; die neue Seite wartet (bis 8 s), bis der da ist → nie ein älterer Stand.
- Nur das zuletzt geöffnete Fenster speichert; ein älteres zeigt einen Hinweis.
- **Speicherschlüssel `openWater…`, `WORLD_VERSION` und die Kartenerzeugung nicht umbenennen** – sonst sind Spielstände weg.

## 7. Das Spiel (Kurzfassung)
Karte mit Inseln/Basen, Hauptstadt mit Gebäuden, Truppen, Angriffe/Späher/Senden, Tore und Brücken, Mitte mit Thron und
4 Wächter-Tempeln, Titel aus der Mitte (gut/Straf/Herrscher/Turniersieger, Ringe), 14 Helden (Splitter, Viertel-Sterne,
4 Fähigkeiten, Wut, Gefolge), Ausrüstung, Skills, Lager, 2. Bauarbeiter, Aussehen (nur kaufen), Ziele (Täglich, Belohnung
mit Abholfach, Erfolge, Saison-Pass), Rangliste, Ereignisse (Barbaren-Lager, Tagesboss, Wochenend-Turnier, Kopfgeld),
Shop mit Heldenkisten, 3D-Basen (Baukunst), 150 Mitspieler mit eigener Stadt, Helden, Ausrüstung und Online-Zeiten.
Titel-Regeln: guter Titel vom Herrscher = Träger greift ihn seltener an; Straf-Titel = −25 % Angriff, wird eher
angegriffen und grollt dem Herrscher; Mitspieler als Herrscher verteilen Titel nach Verhalten (alle 3 Min.).
Plündern: 2 % pro Basis / 4 % Hauptstadt, höchstens 30 Min. Einnahmen des Opfers. Zahlen ab 10 Mio. kurz („18,4 Mrd.“).

**Nicht gewollt / gestrichen:** Taverne, Deko, Mauer-Skins, Sammelangriff, Heldenausrüstung, Talente, Armee-Paar, SvS,
Kampfmusik, Belagerung, Rache-Knopf, Truppen-Event, Postfach. Erfolge geben nur Gems, keine Kosmetik.

## 8. Verlauf
- **30.9.–1.10. (1. Sitzung):** Großer Ausbau (alles aus Abschnitt 7), Fehlerrunde mit 19 Punkten, Gesamtcheck. Spiel lief
  als Claude-Artifact – dort ging der Spielstand verloren, weil die App ihren Speicher leert → Umzug auf den eigenen Server.
- **1.10. (2. Sitzung):** Office-Login erkundet, Plan gemacht, nichts hochgeladen.
- **1.10. (3. Sitzung):** Login + Spiel + Datenbank gebaut und live gestellt. Speichern beim Schließen/Neuladen repariert
  (Abschied). Test-Uhr (+17 Tage), Vorspulen der Mitspieler, Turnier-Test und Test-Geschenke (10 Trd. von allem) entfernt,
  Alexanders kaputter Stand zurückgesetzt. Mitspieler-Tabelle `ow_bots`. Alles sortiert: ein Ordner `Game` mit wenigen,
  klar benannten Dateien, GitHub = Server, nur noch diese eine Info-Datei. Alte Entwurfsseiten (designs.html, mitte.html)
  und die Claude-Artifact-Version sind raus (liegen noch in der Git-Geschichte).

## 9. Fehlerliste (Alexander)
Alle 19 Punkte vom 1.10. sind erledigt. Neue Fehler hier nummeriert eintragen.

## 10. Als Nächstes: EINE Welt für alle
Alexander will: **Alle Spieler und alle Mitspieler auf einer einzigen Karte.** Keine eigenen Welten pro Spieler.
Heute hat jeder Spieler noch seine eigene Welt (das Spiel rechnet alles im Browser). Plan siehe Chat vom 1.10.;
Stand der Umsetzung wird hier eingetragen.

## 11. Offen
- `Main_game_folder_` löschen? Wartet auf Alexanders klares Ja.
- Münz-Wirtschaft bei hohen Stufen riesig („Münzen fühlen sich nichts wert an“).
- Kleinigkeiten: Schild-Restzeit in der Burg zählt nicht live; Ausbau-Knopf schaltet nicht live frei; Stadt-Ansicht am
  Handy manchmal langsam (Wolken).
