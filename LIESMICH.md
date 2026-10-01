# LIESMICH – Open Water (zuerst lesen!)

Diese Datei ist der Einstieg für jeden neuen Chat. Sie erklärt, **was es gibt, wo es liegt und was bisher passiert ist**.
Danach bei Bedarf: `UEBERGABE.md` (Regeln, Technik), `VERLAUF.md` (erste Sitzung), `FEHLER.md`, `IDEEN.md`.

Mit dem Spieler (**Alexander**) immer **auf Deutsch, kurz und einfach** reden. Er schreibt am Handy, kurz, mit Tippfehlern.

---

## 1. Wo das Spiel läuft

**https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/**

- Startseite = Anmelden / Neu registrieren (Name + Passwort). Danach geht es ins Spiel.
- Jeder Spieler hat seinen **eigenen Spielstand** (und seine eigene Welt mit 150 Mitspielern).
- **Alles wird auf dem Server gespeichert** (MySQL-Datenbank). **Im Browser wird nichts gespeichert** –
  einzige Ausnahme: das Login-Cookie `ow_login` (HttpOnly, läuft nach 30 Tagen ab).
- Das Spiel läuft in **Echtzeit** (keine Test-Uhr, keine Test-Geschenke mehr).

Die alte Version als Claude-Artifact (https://claude.ai/artifact/FtYfCTcfkiUgg5YM8Y7Qhn) wird **nicht mehr weiter
veröffentlicht** – der Server ist jetzt das Zuhause des Spiels.

## 2. Alles liegt auf GitHub – Server kaputt? Einfach neu hochladen

Der Office-Editor stürzt manchmal ab. **Alles, was auf dem Server liegt, liegt auch hier im Git** (Branch
`claude/neues-projekt-8agldl`), fertig zum Hochladen im Ordner **`dist/Game/`**. Einzige Ausnahme: `api/config.php`
(enthält das Datenbank-Passwort, darf nie ins Git) – sie wird beim Bauen aus den Umgebungsvariablen erzeugt.

**Neu hochladen (alles, ein Befehl):**
```
tools/baue_game.sh && tools/office_hochladen.sh
```
- `tools/baue_game.sh` baut `dist/Game` aus dem aktuellen Spiel (`index.html`, `botlogik.js`, `baukunst.js`) und
  den Server-Dateien in `server/`. Sind `DB_USER`/`DB_PASS` gesetzt, entsteht auch `dist/Game/api/config.php`.
- `tools/office_hochladen.sh` loggt sich bei Office ein (`OFFICE_USER`/`OFFICE_PASS`), legt die Ordner an,
  lädt jede Datei hoch und prüft, dass die Skripte unverändert angekommen sind.
- Nach jeder Änderung am Spiel: bauen, testen, **committen + pushen**, hochladen. So ist GitHub immer gleich dem Server.

## 3. Zugänge (stehen in den Umgebungsvariablen der Cloud-Umgebung, nie in Dateien!)

| Variable | Wofür |
|---|---|
| `OFFICE_USER`, `OFFICE_PASS` | Login bei office.hobbitonhill.de (Datei-Editor) |
| `DB_USER`, `DB_PASS` | MySQL (Benutzer `k17700_alex`) |
| `DB_HOST` | `dbwebintern.silentnetwork.de` (interne Adresse 10.35.47.236 – nur vom Office-Server erreichbar, nicht von der Cloud-Umgebung) |
| `DB_NAME` | `k17700_alex` (Standard im Bauskript, falls nicht gesetzt) |

- phpMyAdmin zum Anschauen: **db.lapush.de**.
- Der Claude-Code-Modus muss auf **„Fragen“ (Default)** stehen, nicht „Auto“ – sonst blockiert die Sicherheitsprüfung
  das Einloggen/Hochladen bei Office.
- Alexander hat am 1.10. Passwörter im Chat geschrieben – ihm wurde geraten, sie zu ändern. Ändert er das
  Datenbank-Passwort, muss `api/config.php` auf dem Server neu (einfach neu bauen + hochladen mit neuer Variable).

## 4. Der Office-Server (Editor)

- Editor: `https://office.hobbitonhill.de/html/editor.php?h=48&w=138&sid=<sid>&path=<Ordner>` (nach dem Login,
  `POST https://office.hobbitonhill.de/index.php?` mit `name`, `pw`, `login=login`; die `sid` steht danach in den Links).
- Erlaubt ist nur `/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4/`.
- Knöpfe (Formularfeld `button`): `new folder` / `new file` (Name in Feld `file`), `upload` (Datei in Feld `file`),
  `delete` (im **Ordner**-Pfad mit `file=<Dateiname>`), `save`, `rename`.
- Server: PHP 7.3, MySQL 8.4, nginx. Bis zu 8 Anfragen gleichzeitig kein Problem.
- Im Ordner liegt außer `Game` noch **`Main_game_folder_`** (anderes Spiel, Bilder und Backup) – **nichts löschen ohne Alexanders klares Ja.**

## 5. Ordner `Game` auf dem Server (= `dist/Game` im Git)

```
Game/
  index.php            Anmelden / Registrieren / Abmelden
  spiel.php            Das Spiel (nur angemeldet). Schickt den Spielstand gleich mit der Seite mit.
  api/lib.php          Login-Cookie, Datenbank, Tabellen (legen sich selbst an), Mitspieler-Aufteilung
  api/speichern.php    Nimmt die geänderten Teile des Spielstands an (gzip)
  api/config.php       Zugangsdaten (NUR auf dem Server, nicht im Git)
  js/speicher.js       Ersetzt localStorage durch einen Speicher im Arbeitsspeicher und speichert auf den Server
  js/fflate.min.js     Packen (gzip) ohne Warten – nötig für die Sicherung beim Schließen
  js/botlogik.js, js/baukunst.js   das Spiel
  inhalt/spiel.php     die Spielseite (= index.html), direkt aufrufen geht nicht (404)
  daten/               nur für den Notfall-Speicher „Dateien“ (wird bei MySQL nicht benutzt)
```

## 6. Datenbank (`k17700_alex`)

| Tabelle | Inhalt |
|---|---|
| `ow_spieler` | **Alle Spieler:** Name, Passwort (nur verschlüsselt), Übersicht zum Anschauen: `stufe`, `muenzen`, `gems`, `anzahl_basen`, `zuletzt_gespeichert` |
| `ow_bots` | **Alle Mitspieler:** eine Zeile pro Mitspieler und Spieler: `bot_id`, `stufe`, `muenzen`, `anzahl_basen`, `basen` (Liste), `zustand` (alles andere: Stadt, Helden, Ausrüstung …) |
| `ow_spielstand` | Alles andere vom Spieler und seiner Welt (Gebäude-Stufen, Truppen, Angriffe unterwegs, Titel, Helden, Aufgaben …), je Teil eine Zeile |
| `ow_sitzungen` | Logins (nur ein Fingerabdruck des Cookies) |

**Achtung:** In derselben Datenbank liegen Tabellen eines anderen Spiels (`nutzer`, `mail`, `handel`, `kronen` …) – **nie anfassen.**

## 7. Wie das Speichern funktioniert

- Das Spiel benutzt intern weiter „localStorage“ (über `store`), aber `js/speicher.js` tauscht das gegen einen
  Speicher im Arbeitsspeicher. Nichts landet im Browser.
- **Alle 3 Sekunden** gehen die geänderten Teile gepackt an `api/speichern.php`.
- **Beim Wegschieben, Schließen oder Neuladen** wird sofort gesichert (mit `keepalive`, kommt auch an, wenn die Seite
  weg ist). Beim Schließen/Neuladen ist das ein „Abschied“: Die neue Seite wartet auf dem Server (bis 8 s), bis die
  letzte Sicherung des alten Fensters drin ist – so wird nie ein älterer Stand geladen.
- Nur das **zuletzt geöffnete Fenster** speichert. Ein älteres Fenster/anderes Gerät zeigt „Du spielst gerade in einem
  anderen Fenster …“ und speichert nicht mehr (sonst würden sich zwei Stände gegenseitig überschreiben).
- Keine Verbindung: Es wird gesammelt und später gesendet, oben erscheint ein Hinweis.
- Getestet (lokal und live): Registrieren, Anmelden, falsches Passwort, Abmelden, Neuladen und Schließen direkt nach
  einer Änderung (gespeichert), zweites Fenster, Mitspieler-Daten exakt gleich nach Zerlegen/Zusammensetzen.

## 8. Was am 1.10. (dritte Sitzung) passiert ist

1. Stand vom alten Chat gelesen. Office-Login erst von der Sicherheitsprüfung („Auto“-Modus) blockiert → Alexander hat
   auf „Fragen“ umgestellt, danach ging alles.
2. Geprüft: Der Office-Server erreicht die Datenbank (`dbwebintern.silentnetwork.de`), Datenbank heißt `k17700_alex`.
3. Ordner `Game` angelegt, Login + Spiel + Speichern gebaut, lokal (PHP + MariaDB + Playwright) und live getestet,
   Test-Konten wieder gelöscht.
4. Alexander: „Speichern dauert zu lang, beim Schließen/Neuladen geht es verloren.“ → Ursache: Der Browser holt die
   neue Seite, bevor die letzte Sicherung ankommt. Behoben (3 s statt 10 s, Sofort-Sicherung mit keepalive, Abschied).
5. Alexander: „Warum habe ich 10 Trd. von allem?“ → Im Spiel steckten alte **Einmal-Test-Geschenke** (10 Trd. Münzen,
   Gems, Truppen, 999 Mrd., 9,9 Mrd. Gems), Test-Uhr (+17 Tage), Vorspulen der Mitspieler (bis in die Mitte),
   Turnier-Test, Karte ohne Nebel, Emma-Tests. **Alles aus dem Spiel entfernt** – Echtzeit.
6. Alexanders Spielstand auf dem Server war dadurch kaputt (10 Trd., Stufe 46) → **zurückgesetzt** (Konto bleibt).
   Er startet fair neu (Stufe 1, ein paar Hundert Münzen, 0 Gems).
7. Datenbank aufgeteilt: Spieler-Tabelle mit Übersicht, eigene **Mitspieler-Tabelle** `ow_bots`.
8. Alles kommt auf GitHub (inkl. fertigem `dist/Game`), damit man nach einem Editor-Absturz einfach neu hochladen kann.

## 9. Offen / gefragt

- **Aufräumen im Editor:** Alexander möchte, dass alte Sachen rauskommen und nur noch unsere wichtigen Dateien zu sehen
  sind. Gemeint ist wohl `Main_game_folder_` (anderes Spiel). **Noch nicht gelöscht** – erst nach seinem klaren „Ja“,
  vorher auf Wunsch eine Sicherung davon ins Git.
- Jeder Spieler hat zurzeit **seine eigene Welt** (eigene 150 Mitspieler). Eine gemeinsame Welt, in der echte Spieler
  gegeneinander spielen, wäre ein großer Umbau – noch nicht besprochen.
- Münz-Wirtschaft bei hohen Stufen riesig (siehe VERLAUF.md).
