# Open Water – LIESMICH (die einzige Info-Datei)

Neuer Chat? **Nur diese Datei lesen**, dann ist man auf dem Stand.

## 0. Mit wem und wie
**Feste Regeln von Alexander (immer einhalten):**
1. **Jede Änderung** (Code, Infos, Entscheidungen) wird **sofort hier in LIESMICH.md** eingetragen (Abschnitt 8 „Verlauf“ bzw. passender Abschnitt).
2. Code kommt **immer zuerst auf GitHub** (committen + pushen).
3. **Erst Alexander fragen**, ob diese Version auf den Server soll – `./hochladen.sh` nur nach seinem Ja.
   **Hochladen IMMER mit Wartung:** Wartung an → alle Spiele speichern (10 s) → hochladen → prüfen → Wartung aus.
   Genau das macht `./hochladen.sh` automatisch – niemals Dateien anders (z. B. einzeln im Editor) hochladen.
4. Es gibt **nur EINE Welt**, in der alle echten Spieler und alle Mitspieler zusammen spielen – nie eine eigene Welt pro Spieler.
5. Alles, was nicht zu Open Water gehört, kommt weg (Server, GitHub, alte Sitzungen).

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
  welt.js              die EINE Welt: Umrechnen, andere Spieler, Weltrechner, Puls, Befehle, Nachrichten
  buendnis.js          Bündnisse: Gründen, Beitreten, Signale, Rally, Geschenke, Tempel-Bonus, Gebiet (Abschnitt 18)
  aufbau.js            Aufbau: Burg-Stufe, Holz/Stein/Eisen, Forschung, Truppen-Stufen, Markt, Marsch-Plätze (Abschnitt 22)
  haendler.js          wandernder Händler: Karren auf der Karte, Angebot, Kauf über den Weltrechner (Abschnitt 23)
  server.php           alles auf dem Server: Datenbank, Login, Laden, Speichern, Welt, Sicherheit
  admin.php            nur für Admins (alexander): Wartung an/aus, Geschenke verschicken, Spielerliste
  app/                 Open Water als App auf dem Startbildschirm:
    index.html         Installier-Seite (Android: Knopf „Zum Startbildschirm hinzufügen“, iPhone: Anleitung)
    manifest.webmanifest  App-Datei (Name, Logo, startet ohne Browser-Leiste)
    logo.svg           das App-Logo (Krone über Burg auf einer Insel im Meer)
    icon-192.png, icon-512.png, apple-touch-icon.png   das Logo als Bild (aus logo.svg gerendert)
  weltrechner/         der Weltrechner auf dem Server (rechnet die Welt, nie ein Handy) – siehe Abschnitt 13
    start.js           das Programm (Node.js): Spiel ohne Bildschirm, Prüfer, Herzschlag, Speichergrenze
    jsdom.js           „Browser ohne Bildschirm“ (jsdom 24.1.3, eine Datei)
    wachhund.php       Cronjob jede Minute: starten, Hänger beenden, Notbremse, Sicherungen, Cronjob einrichten
    herz.php, log.php, zustand.php …   entstehen nur auf dem Server (gesperrt, nie im Git)
  config.php           Datenbank-Zugang – NUR auf dem Server, nie im Git (wird von hochladen.sh erzeugt)
LIESMICH.md            diese Datei
hochladen.sh           lädt Game/ auf den Server (ein Befehl)
```
**Server kaputt oder Editor abgestürzt?** Einfach `./hochladen.sh` – lädt alles neu hoch, erzeugt `config.php` aus den
Umgebungsvariablen, entfernt fremde Reste aus `Game/` und prüft, dass alles heil angekommen ist.
**Nach jeder Änderung:** testen → LIESMICH.md ergänzen → committen → pushen → **Alexander fragen** → erst dann `./hochladen.sh`.

## 3. Zugänge (in den Umgebungsvariablen der Cloud-Umgebung „Unity“)
| Variable | Wofür |
|---|---|
| `OFFICE_USER`, `OFFICE_PASS` | Login bei office.hobbitonhill.de (Datei-Editor) |
| `DB_USER`, `DB_PASS` | MySQL, Benutzer `k17700_alex` |
| `DB_HOST` | `dbwebintern.silentnetwork.de` (interne Adresse – nur der Office-Server kommt dran, die Cloud-Umgebung nicht) |
| `DB_NAME` | `k17700_alex` |
- Datenbank ansehen: phpMyAdmin auf **db.lapush.de**.
- Claude-Code-Modus auf **„Fragen“** stellen, nicht „Auto“ – sonst blockiert die Sicherheitsprüfung das Hochladen.

## 4. Office-Server
- Login: `POST https://office.hobbitonhill.de/index.php?` mit `name`, `pw`, `login=login` → `sid` steht in den Links.
- Editor: `html/editor.php?h=48&w=138&sid=…&path=<Ordner>`; Formularfeld `button`: `new folder`, `upload` (Datei im Feld `file`),
  `delete` (Ordner-Pfad + `file=<Name>`). Erlaubt ist nur `…/office.hobbitonhill.de/html/725/klassenarbeit_GR4/`.
- PHP 7.3, MySQL 8.4, schafft mehrere Anfragen gleichzeitig. Eine Sicherung dauert auf dem Server ~60 ms.
- Im Editor liegt nur noch der Ordner `Game` (`Main_game_folder_` vom anderen Spiel am 1.10. auf Alexanders Wunsch gelöscht).

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
- **1.10. Aufräumen (Alexanders Wunsch „alles weg, was nicht zum Spiel gehört“):** `Main_game_folder_` auf dem Server
  gelöscht, 27 alte Claude-Sitzungen archiviert. Alte GitHub-Branches kann Claude nicht löschen (GitHub sperrt das, 403)
  → Alexander löscht sie selbst (siehe Abschnitt 11). Neue feste Regeln in Abschnitt 0.

## 9. Fehlerliste (Alexander)
Alle 19 Punkte vom 1.10. sind erledigt. Neue Fehler hier nummeriert eintragen.

20. ✅ **Nebel zeigt zu viel:** Boss, Wanderer, Felder, Lager, Tagesboss, fremde Armeen/Märsche, Kampf-Effekte und
    Thron-Effekte werden unter dem Nebel nicht mehr gezeichnet.
21. ✅ **Angriff in den Nebel:** Basen, Felder, Lager, Boss und fremde Armeen im Nebel lassen sich nicht antippen und
    nicht angreifen („liegt im Nebel – schick zuerst einen Späher“). Auch „Zum Boss“/„nächstes Lager“ führen nicht in den Nebel.
22. ✅ **Nebel für Mitspieler:** Sie kennen nur Inseln mit eigenen Basen (auch früheren) und deren direkte Nachbarn über
    eine Brücke (`botKennt` in bots.js, gespeichert als `kennt`); nur dort greifen sie an, jagen Lager, sammeln, schlagen den Tagesboss.
23. ✅ **Sammeln ohne Bericht:** Kehren Sammler zurück, gibt es einen Bericht „Sammler zurück · Goldmine · +… Münzen ·
    … Truppen zurück“ (auch für Zuschauer, über den Weltrechner).
24. ✅ **Neue Spieler sofort plattgemacht:** **Anfängerschutz** – 48 Std. unangreifbar (für Mitspieler und echte
    Spieler), auch wenn man selbst Mitspieler/Lager/Felder angreift. Endet früher, sobald die **Macht 50 Mio.** erreicht
    (wie in der Rangliste) oder man einen echten Spieler angreift. Gilt auch für alle, die schon spielen und ihn noch nie
    hatten (einmalig ab dem nächsten Start).
25. ✅ **Späher durch geschlossene Tore:** Ein geschlossenes fremdes Tor lässt keinen Späher durch (`spaeherWeg`) – gilt
    für dich und die Mitspieler. Gibt es einen anderen Weg ohne geschlossenes Tor, darf er den nehmen.
27. ✅ **Kopieren/Nachschlagen beim langen Drücken:** Im Spiel lässt sich nichts mehr markieren, kein Kopieren-Menü
    (CSS `user-select:none`, `-webkit-touch-callout:none` + `selectstart`/`contextmenu` blockiert); Eingabefelder gehen weiter.
28. ✅ **Schwarzer Streifen unten (iPhone-App):** iOS-Fehler mit Statusleiste „black-translucent“ (Höhe um die
    Statusleiste zu klein) → Statusleiste jetzt „black“. Evtl. App einmal vom Home-Bildschirm löschen und neu hinzufügen.
29. ✅ **„Hier weiterspielen“ reagierte nicht:** Der Knopf zeigt sofort „Lädt …“, reagiert direkt aufs Tippen, und
    `spiel.php?weiter=1` übernimmt sofort (ohne bis zu 8 s auf das alte Gerät zu warten). Getestet: 1,7 s, altes Gerät fliegt raus.
26. ✅ **Anfängerschutz auch für Mitspieler:** gleiche Regeln (48 Std. ab Weltstart bzw. ab ihrem Neustart, endet mit
    50 Mio. Macht oder wenn sie einen echten Spieler angreifen; `botNeulingBis`). Text: „Anfängerschutz: … ist neu und
    noch … unangreifbar.“
- Hochladen: `hochladen.sh` wartet nach dem Einschalten der Wartung jetzt 10 s, damit jedes laufende Spiel noch
  speichert (beim Wartungs-Fenster wird automatisch gesichert), am Ende geht die Wartung wieder aus.

## 10. EINE Welt für alle (läuft auf dem Server)
Alexander will: **Alle Spieler und alle Mitspieler auf einer einzigen Karte.** Keine eigenen Welten pro Spieler.

**Plan (so wird es gebaut):**
1. **Die Welt liegt einmal in der Datenbank** – wie ein Spielstand mit der Nummer 0 (`ow_spielstand`/`ow_bots` mit
   `spieler_id = 0`): Karte, Besitzer aller Basen, Truppen, Märsche, Thron, Ereignisse, die 150 Mitspieler.
   Jeder Spieler behält seinen eigenen Teil (Münzen, Gems, Stadt, Helden, Skills, Aufgaben, Aussehen, Nebel, Berichte).
2. **Weltrechner:** Der Server kann nicht dauernd selbst rechnen (normales Webhosting). Darum rechnet **ein** Spieler,
   der gerade online ist, die Welt für alle (Mitspieler denken, Märsche kommen an, Kämpfe, Thron …) und schickt sie alle
   ~2 s an den Server. Meldet er sich 12 s nicht, übernimmt automatisch der nächste.
3. **Alle anderen** holen sich die Welt alle ~2 s (nur geänderte Teile). Ihre Befehle (angreifen, senden, spähen,
   ausbauen …) gehen über den Server an den Weltrechner, der sie ausführt.
4. **Andere echte Spieler** erscheinen in jedem Browser wie Mitspieler (Eintrag in der Mitspieler-Liste, Kennung `u<id>`,
   ohne eigenes Denken) – so funktionieren Karte, Kämpfe, Titel, Rangliste und Profil für sie gleich mit. Ihre Kampfwerte
   (Skills, Ausrüstung, Helden, Stadt) schicken sie als „Profil“ an den Server.
5. **Nachrichten** vom Weltrechner an einen Spieler (geplündert, Beute, Belohnung) laufen über `ow_ereignisse`.
6. Niemand online → die Welt steht still; der nächste Weltrechner holt die verpasste Zeit nach (wie „Willkommen zurück“).
7. Start der neuen Welt: **alle fangen bei Null an.**

**Server-Teil (fertig, lokal getestet, noch nicht hochgeladen):** in `server.php` → Tabellen `ow_welt_info`
(Version, wer Weltrechner ist), `ow_befehle`, `ow_ereignisse`, neue Spalten `profil`, `profil_zeit`, `online_bis` in
`ow_spieler`. Anfrage `aktion: "puls"` an `server.php`: Weltrechner wählen, Welt schreiben/lesen (nur geänderte Teile),
Befehle und Nachrichten verteilen, Spielerliste mit Profilen.

**Browser-Teil, Stufe 1 (fertig, lokal mit 2 Spielern getestet, noch nicht hochgeladen):**
- Neue Datei `Game/welt.js` (geladen nach bots.js, vor spiel.js): rechnet Welt-Teile um (neutral `u<id>` ↔ `'player'`,
  6 Arten, wie „du“ im Spiel markiert bist – siehe Kommentare), trägt andere echte Spieler als Mitspieler ein
  (`BOT_DEFS` mit `mensch: true`, Datensatz aus ihrem Profil), Puls alle 2 s, Weltrechner/Zuschauer-Wechsel,
  Unterschiede bei Münzen/Gems/EP/Thron-Punkten/Lazarett/Splittern der anderen als Nachrichten.
- `speichern.js`: Welt-Teile gehen nicht mehr in den eigenen Spielstand (Liste `WELT`); Thron-/Turnier-Teile werden
  geteilt (privat: `openWaterThroneMein`, `openWaterTourMein`).
- `bots.js`: Mitspieler-Gehirn überspringt echte Spieler, `botOnline` = wirklich online, EP gehen als Nachricht,
  Aussehen/Baustil aus dem Profil.
- `spiel.js`: Welt-Takte (Märsche, Kämpfe, Produktion, Thron, Boss, Wanderer, Felder, Lager, Armeen, Titel) nur beim
  Weltrechner (`rechnet()`); neuer Spieler bekommt einen freien Startplatz (`freierStartplatz`) und meldet ihn an
  (Befehl `beitreten`); Zuschauer laden die Welt laufend neu (`__weltLaden`); verpasste Zeit wird nachgeholt (`weltNachholen`).
- `server.php`: Spielseite bringt Welt, Spielerliste und „bin ich Weltrechner“ gleich mit.
- Test: Anna (Weltrechner) + Bernd (Zuschauer) sehen sich auf derselben Karte mit allen 150 Mitspielern; Bernds Münzen/
  Truppen wachsen über den Weltrechner; Anna schließt → Bernd wird nach ~12 s Weltrechner. Keine Fehler.

**Browser-Teil, Stufe 2 (fertig, lokal mit 3 Spielern getestet, noch nicht hochgeladen):**
- **Befehle der Zuschauer** (in `spiel.js`, Helfer `alsBefehl`): Angreifen (mit gewähltem Held), Senden, Zurückrufen,
  Beschleunigen (Gems zahlt man selbst), Basis/Burg ausbauen (Münzen zahlt man selbst), Hauptstadt verlegen,
  Truppen-Geschenke (Stufe, Thron-Shop, Lazarett, Funde → `eigeneTruppenDazu`), Tore (Maut/zu), Titel vergeben als
  Herrscher, Felder (hin/heim), Barbaren-Lager/Tagesboss, Armeen (aufstellen, auffüllen, ziehen).
  Der Weltrechner führt sie in `BEFEHLE` (Ende von spiel.js) für den Spieler `u<id>` aus – nur wenn ihm die Basis gehört.
- **Kampfberichte** für echte Spieler: Der Weltrechner baut sie (`WELT.bericht`, in bots.js `resolveBotAttack` und
  spiel.js `resolveAttack`) und schickt sie als Nachricht; beim Empfänger landen sie im Kampfbericht mit Hinweis + Effekt.
- **Warnung** bei Zuschauern, wenn ein neuer Angriff auf eine eigene Basis unterwegs ist.
- Tests: Zuschauer greift an → Weltrechner führt aus → Basis + Bericht + Münzen + EP beim Zuschauer; Ausbau bei beiden
  gleich; Weltrechner greift Zuschauer an → Bericht „Anna hat deine Basis erobert“; Weltrechner geht mitten im Angriff
  offline → anderer Spieler übernimmt nach ~12 s und rechnet den Angriff fertig; Rückkehrer sieht alles. Keine Fehler.

- `ow_spieler.anzahl_basen` wird jetzt aus der gemeinsamen Welt gefüllt (Weltrechner schreibt die Besitzer).
- Dauertest 3 Min. mit 2 Spielern: stabil, Münzen/Truppen wachsen bei beiden gleich, keine Fehler.

- **Startplatz neuer Spieler** (`freierStartplatz` in spiel.js, ausgeführt vom Weltrechner beim Befehl `beitreten`):
  1. freie Basis am äußeren Rand, auf der Landmasse mit den wenigsten Besitzern;
  2. Rand voll → irgendeine freie Basis (nie Mitte/Wächter-Land);
  3. ganze Karte voll → Randbasis vom größten Mitspieler-Reich (nie von einem echten Spieler, nie eine Hauptstadt),
     dazu 1 Stunde Friedensschild (wie bei den Mitspielern). Getestet mit voller Karte: klappt.

**HOCHGELADEN am 1.10. (Alexanders Ja):** Eine-Welt-Version liegt auf dem Server (`./hochladen.sh`, Ordner genau wie
GitHub). Alle Spielstände und die Welt auf Null gesetzt (Konten bleiben, nur noch `alexander`). Live mit zwei
Test-Konten geprüft (Angriff, Eroberung, Bericht, Ausbau, Gegenangriff – alles ok), danach Test-Konten gelöscht und
Welt nochmal frisch zurückgesetzt. Wer als Erster das Spiel öffnet, erschafft die Welt und ist Weltrechner.

## 10b. Admin, Wartung, Namen, Rauswurf, Sicherheit (1.10., lokal getestet)
- **Admin-Seite** `admin.php` – **nirgends verlinkt** (Alexanders Wunsch: kein Admin-Knopf auf der Startseite), nur
  direkt über die Adresse `…/Game/admin.php`; lässt nur Admins rein (`config.php` → `admin_ids`, alexander = 3): Wartung starten/beenden, Geschenk verschicken (Gems, Münzen, Helden-Splitter, Kiste; an einen oder alle
  Spieler) → kommt als Nachricht, landet im **Abholfach** (Ziele → Belohnung, Quelle „Geschenk“) und muss normal
  abgeholt werden; Spielerliste (Name, Login, Stufe, Münzen, Gems, Basen, online).
- **Wartung** = Datei `Game/wartung.txt`. Solange sie da ist: Startseite zeigt „neue Version wird aufgespielt“,
  `spiel.php` lässt niemanden rein, laufende Spiele bekommen beim nächsten Puls ein großes Fenster „Wartung“ (vorher
  wird noch gesichert). **Gilt für ALLE, auch für Admins** (Alexanders Wunsch) – nur admin.php bleibt erreichbar, um
  die Wartung zu beenden. `hochladen.sh` schaltet die Wartung **automatisch** an und am
  Ende wieder aus (bricht es ab, bleibt sie an – dann in admin.php beenden).
- **Rauswurf**: Meldet sich jemand mit demselben Konto woanders an, bekommt das alte Gerät ein großes Fenster
  „Verbindung getrennt – auf einem anderen Gerät angemeldet“ (geht nicht mehr weiter).
- **Willkommen-Fenster**: Jeder neue Spieler wählt einmal seinen Namen (3–20 Zeichen, frei, nicht der Name eines anderen
  oder eines Mitspielers). Gespeichert als `ow_spieler.anzeigename`, alle sehen ihn. Im Profil änderbar (wird geprüft).
- **Alter Fehler behoben**: Abmelden + neues Konto übernahm früher den alten Stand (Browser-Speicher). Jetzt liegt
  nichts mehr im Browser → neues Konto startet sauber (getestet).
- **Sicherheit (server.php/index.php)**: Bremse gegen Passwort-Raten (8 Versuche/15 Min. pro Name, 30 pro Gerät),
  höchstens 5 neue Konten pro Stunde pro Gerät, gleich lange Passwort-Prüfung (verrät nicht, ob es den Namen gibt),
  Daten mit `<`/`>` werden abgelehnt (kein eingeschleuster Code bei anderen Spielern), Größen-Grenzen (8 MB gepackt,
  24 MB entpackt, 150 Teile pro Spieler, 80 Teile Welt), Sicherheits-Kopfzeilen, alte Befehle/Nachrichten räumen sich
  weg. Passwörter nur als bcrypt-Hash; kein Weg liefert Hashes oder Zugangsdaten an den Browser.

**Sicherheitsprüfung (1.10., Prüf-Agent wie ein Angreifer) – behoben:**
- Kritisch: eingeschleuster Code über das Profil (Anführungszeichen in Attributen) → `escapeHtml` maskiert jetzt auch
  `" '`, und der Server baut jedes Profil neu auf (`profil_bereinigen`: nur bekannte Felder, Zahlen, Kennungen aus
  Buchstaben/Ziffern/_/-).
- Kritisch: Admin über den Login-Namen → jetzt feste Spieler-Nummern (`config.php` → `admin_ids`, alexander = 3;
  `hochladen.sh` schreibt das, Variable `ADMIN_IDS`). Login-Namen dürfen außerdem keinem Anzeigenamen gleichen.
- Hoch: Der Weltrechner kann keine Geschenke fälschen (nur Nachrichten `delta`, `bericht`, `startschild`).
- Spielseite kann durch ein kaputtes Profil nicht mehr zerbrechen; Befehle/Nachrichten haben Größen-Grenzen.
- In Ordnung laut Prüfung: alle Datenbank-Befehle (keine SQL-Einschleusung), Passwörter (bcrypt), Sitzungen/Cookie,
  keine abrufbaren Zugangsdaten oder Dateien, keine Fehlermeldungen mit Interna.
- **Bleibt (Bauart „Weltrechner“):** Der Browser des Weltrechners rechnet die Welt. Ein Betrüger mit Programmierkenntnissen
  könnte als Weltrechner die Welt oder Münz-Nachrichten verfälschen. Ganz verhindern ließe sich das nur, wenn der Server
  selbst rechnet (großer Umbau).

**HOCHGELADEN am 1.10. (Alexanders Ja):** Version mit Admin-Seite, Wartung, Rauswurf, Namenswahl, Nebel-Fixes,
Mitspieler-Nebel, Sammel-Bericht, Anfängerschutz und Sicherheits-Fixes. Live geprüft: Seiten erreichbar, Wartung aus,
`admin_ids` = [3], alexander ist Admin. Spielstände wurden dabei NICHT zurückgesetzt.

**HOCHGELADEN am 1.10. (Alexanders Ja):** Späher/Tore, Anfängerschutz für alle mit 50-Mio.-Grenze, kein Admin-Knopf.
Mit Wartung (an → 10 s Speichern → hochladen → aus). Live geprüft: kein Admin-Link auf der Startseite, Wartung aus.

**App für den Startbildschirm (1.10.):** Ordner `Game/app/` (siehe Abschnitt 2). Startseite und Spielseite verweisen
auf die App-Datei (Manifest, Logo, Apple-Angaben). Auf der Startseite steht „📱 Open Water als App auf den
Startbildschirm“ → `app/`. Kein Service-Worker (der würde Dateien im Browser speichern – Regel: nichts im Browser).
`hochladen.sh` lädt jetzt auch Unterordner (app/) hoch. Logo neu zeichnen: `logo.svg` ändern und die PNGs neu rendern
(Playwright: SVG in 512/192/180 Pixel abfotografieren).

**HOCHGELADEN am 1.10. (Alexanders Ja):** App für den Startbildschirm (Ordner `app/`) – mit Wartung. Live geprüft:
Installier-Seite, App-Datei (application/manifest+json), Logos erreichbar, Wartung wieder aus.

**HOCHGELADEN am 1.10. (Alexanders Ja):** Wartung für alle, kein Markieren/Kopieren, Statusleiste schwarz (kein
Streifen unten), „Hier weiterspielen“ sofort – mit Wartung. Live geprüft: Startseite ok, Wartung aus.

**Schneller rein + Rand unten (1.10.) – HOCHGELADEN mit Wartung (Alexanders Ja), live geprüft: Startseite ok, Wartung aus:** „Weiterspielen“ auf der Startseite
zeigt sofort „Lädt …“. Beim Betreten wartet der Server nur noch höchstens 2 s (statt 8 s) auf das letzte Speichern
des alten Fensters (`server.php`, `spielseite_vorbereiten`). Lokal: Spiel nach 1,5 s da. Handy-Leiste unten: Knöpfe
sitzen tiefer (nur 45 % des iPhone-Abstands zum Home-Balken), und unter der Leiste ist alles in Leistenfarbe gefüllt
(`spiel.php`, `.nav` / `.nav::after`, nur Handy hochkant).

**Rand unten, richtige Ursache + Truppen im Admin (1.10.) – HOCHGELADEN mit Wartung (Alexanders Ja), Wartung wieder aus:**
- Rand unten: Alexanders Bildschirmfoto zeigt, dass iOS die Seite in der Home-Bildschirm-App um die Statusleiste
  (ca. 59 Punkte) zu kurz macht. Darum endete die Leiste zu früh. `spiel.js` (oben, `dockLuecke`) misst die Lücke
  (Bildschirmhöhe minus Seitenhöhe, höchstens so hoch wie die Statusleiste, nur in der App, nur hochkant) und setzt
  den CSS-Wert `--dock-off`. Die Leiste rutscht um so viel nach unten, und alles, was auf der Leiste sitzt (Fenster,
  Knöpfe, Meldungen), rutscht mit (`spiel.php`). Die 45-%-Änderung von vorher ist wieder raus. Im Browser und ohne
  Lücke bleibt alles wie bisher (0 px).
- Admin-Seite: Beim Geschenk gibt es jetzt auch „Truppen“. Sie landen im Abholfach und kommen beim Abholen in die
  Hauptstadt (beim Zuschauer als Befehl an den Weltrechner, wie alle geschenkten Truppen). Hat der Spieler gerade keine
  Basis, bleiben die Truppen im Abholfach. Lokal getestet: 250.000 geschickt → abgeholt → beim Spieler und beim
  Weltrechner +250.000.
- Alten Absturz behoben: Die Startplatz-Suche für neue Spieler (`freierStartplatz`) stürzte ab, wenn gerade ein
  Tagesboss auf einem Turm stand (Besitz war beim Laden noch nicht da). Jetzt wird das abgefangen, und den Platz prüft
  der Weltrechner.

**Admin: Nebel freischalten, Geschenke an Bots, Bot-Liste (1.10.) – HOCHGELADEN mit Wartung (Alexanders Ja), Wartung wieder aus, admin.php ohne Login → Startseite:**
- Wer bekommt ein Geschenk? Nur der ausgewählte Spieler (oder alle Spieler, wenn „ALLE“ gewählt ist). Das Geschenk
  liegt in `ow_ereignisse` unter seiner Spieler-Nummer, und nur er bekommt es beim Puls. Der Weltrechner darf keine
  Geschenke verschicken (nur `delta`, `bericht`, `startschild`). Lokal geprüft: Bot-Geschenk → der andere Spieler
  und der Admin selbst bekommen nichts.
- Geschenk an Bots: In der Auswahl „An“ gibt es zwei Gruppen, „Spieler“ und „Bots“ (alle 60 einzeln und „an ALLE
  Bots“). Die Bot-Namen liest `admin.php` aus `bots.js`. Das Geschenk für Bots geht als Befehl unter Spieler 0 in
  `ow_befehle` (nur `admin.php` kann unter 0 schreiben). Der Weltrechner gibt es dem Bot direkt
  (`spiel.js`, `adminBefehl`): Gems, Münzen, Helden-Splitter, Truppen in die Hauptstadt, Kiste als Ausrüstung im
  Lager. Kommt an, sobald jemand im Spiel ist. Lokal: Kevin_93 +777 Gems, +5.000 Truppen; andere Bots unverändert.
- Neue Karte „Bots“ auf der Admin-Seite: Liste aller Bots (Name, Kennung).
- „Nebel freischalten“: Für einen Spieler (oder alle) wird die ganze Karte aufgedeckt (Ereignis `nebel` →
  `revealAround` über die ganze Karte, wird mit dem Spielstand gespeichert). Lokal: 13 → 46.656 offene Felder,
  der andere Spieler unverändert.

**Rand unten, dritter Versuch (1.10.) – HOCHGELADEN mit Wartung (Alexanders Ja), Wartung wieder aus:** Alexanders neues Foto zeigt: Die
Leiste nach unten zu schieben war falsch. iOS malt unterhalb der (zu kurzen) Seite nichts, nur die Hintergrundfarbe
der Seite. Darum waren die Beschriftungen abgeschnitten. Jetzt: Die Leiste bleibt ganz in der Seite. Von der
Home-Balken-Lücke wird nur so viel freigelassen, wie noch innerhalb der Seite liegt (`--safe-bd` = Home-Abstand minus
gemessene Lücke, nie unter 0). Die Hintergrundfarbe der Seite (`html`) ist genau die Farbe unten in der Leiste
(rgb 8,10,13). So sieht der Streifen darunter aus wie ein Teil der Leiste (wie bei iPhone-Apps). Die Startseite war
schon richtig (dort geht der Hintergrund bis ganz unten).

## 11. Offen
- **GitHub aufräumen (macht Alexander, Claude darf es nicht):** Unter Settings → General → Default branch auf
  `claude/neues-projekt-8agldl` stellen. Danach unter Branches alle anderen löschen (`claude/chat-session-k7ozkc`,
  `claude/aaa-rpg-character-vfx-9ydhnc`, `claude/game-server-setup-0n2gbr`, `claude/login-finance-dashboard-89et7f`,
  `claude/office-login-game-server-u7tgrc`, `claude/rpg-player-effects-design-kxqmsb`, `claude/spiel-anzeigen-6e8l5z`).
  Das andere Repo `-Open-source-pixel-art-game-project-built` gehört nicht zu Open Water – löschen kann es nur Alexander.
- Fremde Tabellen eines anderen Spiels in der Datenbank (`nutzer`, `mail`, `handel` …): löschen? Noch nicht gefragt.
- Münz-Wirtschaft bei hohen Stufen riesig („Münzen fühlen sich nichts wert an“).
- Kleinigkeiten: Schild-Restzeit in der Burg zählt nicht live; Ausbau-Knopf schaltet nicht live frei; Stadt-Ansicht am
  Handy manchmal langsam (Wolken).

## 12a. MERKLISTE – machen wir später (Alexander, 1.10.)
- ⭐ **SEHR WICHTIG – Hauptbasis:** Die Hauptbasis (Hauptstadt) soll unabhängig von der Spieler-Stufe sein. Man soll
  sie SELBST aufleveln, das kostet Rohstoffe (Münzen u. a.) – wie ein eigenes Gebäude, nicht automatisch mit dem Level.
- ✅ ~~Gems kommen zu schnell~~ – erledigt 2.10. (neue Saison, Abschnitt 16).
- **Punkt 11 – Münz-Wirtschaft:** bei hohen Stufen fühlen sich Münzen nichts wert an.
- **Punkt 6 – Bündnis-Signale statt Chat** (siehe Abschnitt 12).

**Ideen-Sammlung 2.10. (Alexander hat ausgewählt – nichts davon gebaut, hochladen nur nach seinem Ja):**
- *Bündnis (zusammen bauen):* 23 Bündnisse für Spieler + Bots (Name, Wappen) · 24 Bündnis-Signale ⭐ wichtig ·
  26 Rally: mehrere greifen zusammen an (z. B. auf 3 Mann in der Mitte) · 27 Bündnis-Geschenke ·
  5 Tempel/heilige Orte geben dem ganzen Bündnis Bonus · 25 Bündnis-Gebiet (vielleicht).
- *Welt:* 1 größere Karte (neue Landschaften) · 3 Tag und Nacht · 7 wandernde Händler.
- *Events:* 29 Wochenend-Events mit Themen · 30 Barbaren-Invasion · 31 Drachen-Event (viele zusammen).
- *Aufbau (zusammen mit der Hauptbasis besprechen):* 8 Burg wie RoK-Rathaus (reden) · 9 neue Rohstoffe (Holz, Stein,
  Eisen) · 10 neue Gebäude · 11 Forschung · 14 stärkere Truppen-Stufen (T1–T5) – aber NUR eine Truppenart (13 nein).
- *Helden:* 19 mehr Helden · 20 zwei Helden pro Marsch.
- *Sonst:* 39 VIP durch Spielen · 45 Anleitung für neue Spieler · 46 mehr Push-Nachrichten · 49 „3B“ (alles auf dem Server).
- *51 Einstellungen (Alexander 2.10.):* eigenes Fenster im Spiel (Zahnrad) – Benachrichtigungen an/aus (je Art), Ton und
  Musik, Grafik/Akku sparen, Name, Passwort ändern, **Abmelden** (heute nur auf der Startseite), Hilfe/Anleitung, Version.
- *Reden:* Basen/Hauptbasis, 8, 25, 17 (Spähbericht mit Held/Ausrüstung – heute nur Truppen + Verteidigung).
- *Nicht:* 13 (mehrere Truppenarten), 21/22 (Talente/Helden-Ausrüstung, zu viel). 12 (Burg-Aussehen je Stufe) und
  15 (Lazarett, der Rest stirbt) gibt es schon.

## 12. Ideen (gemerkt, noch nicht gebaut)
- **Bündnis-Signale statt Chat (Alexander: „B finde ich gut“):** Kein freier Text. Feste Knöpfe: „Hilfe!“, „Greif
  mit mir diese Basis an“, „Danke!“, „Rückzug“. Bots antworten mit Taten (Truppen schicken, mit angreifen, 👍),
  nicht mit Worten. So verhalten sich Bots und Menschen gleich, und niemand merkt etwas. Kein freier Chat mit Bots.
- Weitere Ideen aus der Liste: Nachricht an alle (Admin), Welt-Ereignis auf Knopfdruck (Admin), Schatzkarten im
  Nebel, Wetter, Leuchttürme, Saison-Rangliste, Thron-Krieg am Wochenende, Handel, Statistik-Seite.
- **Handy-Benachrichtigung („Deine Basis wird angegriffen“):** geht auf dem iPhone seit iOS 16.4, aber nur für die App
  auf dem Home-Bildschirm. Braucht: einen Service-Worker (eine kleine Datei, die im Browser bleibt – Ausnahme von der
  Regel „nichts im Browser“, Alexander muss zustimmen), ein Schlüsselpaar auf dem Server, die Erlaubnis jedes Spielers
  (Knopf antippen) und dass der Office-Server nach außen zu Apple senden darf (noch prüfen). Noch nicht entschieden.

## 13. Weltrechner auf dem Server (Node.js) – LÄUFT LIVE seit 1.10. (Alexanders Ja)
**Erster Start live (1.10., 21:01):** Welt geladen (6.632 Basen), 37 Pulse in 90 s, 256 MB, 0 Fehler. Dabei gefunden:
der Start aus PHP heraus hing (PHP wartete auf das Hintergrund-Programm). Behoben in wachhund.php: das Programm wird ganz
abgelöst gestartet (eigene Gruppe mit setsid, Ein-/Ausgabe umgeleitet) – lokal kommt der Start in 0,02 s zurück.
Live nachgeprüft: Start kommt nach 0,5 s zurück. **Cronjob-Knopf** schlug live fehl (das crontab-Programm des Servers
schneidet lange Dateipfade ab; bestehende Cronjobs blieben unverändert). Behoben: die Liste geht direkt über die Eingabe
(`crontab -`, `wr_crontab_setzen`). Lokal mit nachgebautem crontab getestet: lapush-Eintrag bleibt, Wachhund-Zeile kommt
dazu, zweiter Klick ändert nichts, Sicherung `crontab_sicherung.php` wird angelegt.
**Server-Test am 1.10. (Testdateien wieder gelöscht):** Office-Server (netcup-Webhosting, gehört Alexander, dort laufen
auch seine anderen Seiten) kann: Node.js 22 (`/opt/plesk/node/22/bin/node`), Programme über PHP starten (exec),
Cronjobs (Konto hat schon einen für cron.lapush.de – nie anfassen, nur eigene Zeile dazu, vorher sichern).
16 Kerne, 64 GB (geteilt mit allen Seiten). Kein Chrome. 10-Minuten-Test bestanden: ein Node-Programm im Hintergrund
lief 12 Minuten ohne Unterbrechung. Dauerbetrieb ist also möglich (mit Wachhund zur Sicherheit).

**REGEL (Alexander): Niemals ein Handy/Gerät eines Spielers die Welt rechnen lassen – auch nicht als Ersatz.**
Höchstens 600 MB Speicher. Vor einem Testlauf auf dem Server Alexander Bescheid sagen.

**So funktioniert es (Prinzip „Schiedsrichter“):** Der Weltrechner ist ein Node-Programm auf dem Server
(`Game/weltrechner/start.js`). Es lädt die Spielseite ohne Bildschirm (jsdom, eine Datei `weltrechner/jsdom.js`, 6 MB,
jsdom 24.1.3 mit esbuild zu einer Datei gebündelt) und lässt GENAU DENSELBEN Spiel-Code laufen (spiel.js, bots.js,
welt.js) – nur ohne Zeichnen. Er ist der einzige „Leiter“: rechnet Bots, Märsche, Kämpfe, Münzen, rund um die Uhr.
Alle Spieler sind Zuschauer: sie zeigen an und schicken Befehle (wie bisher die Zuschauer).
- Anmeldung des Weltrechners: Kopfzeile `X-Weltrechner` mit einem Schlüssel = HMAC aus dem Datenbank-Passwort
  (`weltrechner_schluessel()` in server.php). Steht in keiner Datei; wachhund.php gibt ihn beim Start als
  Umgebungsvariable mit. Der Weltrechner ist Spieler-Nummer 0 (= die Welt), hat keine Basis, keinen Spielstand.
- server.php: Leiter darf NUR der Weltrechner sein (`welt_puls`, `weltrechner_seite`); nie zwei gleichzeitig.
  Spieler bekommen im Puls `rechner: true/false`. Ist er weg → „Verbindung wird wiederhergestellt …“ (spiel.js).
- welt.js/spiel.js/speichern.js: `SYSTEM`-Modus (keine eigene Basis, kein Startplatz, kein privates Speichern,
  nie die Welt zurücksetzen).

**Schutzgeländer (alle lokal getestet):**
1. Speicher: über 600 MB → Programm beendet sich, Wachhund startet neu. Node-Heap 450 MB. Niedrigste Priorität (nice 19).
2. Herzschlag alle 5 s (`weltrechner/herz.php`). Wachhund (`weltrechner/wachhund.php`, Cronjob jede Minute +
   zur Sicherheit bei jedem Spieler-Puls, wenn der Herzschlag älter als 60 s ist): hängt → hart beenden, neu starten.
   Test: eingefroren → nach 68 s beendet und neu gestartet. ✔
3. Notbremse: 5 Abstürze in 5 Minuten → keine Neustarts mehr, WARTUNG an, roter Alarm mit Protokoll auf der
   Admin-Seite. Sperre und Wartung hebt nur Alexander auf. Test: 5 Abstürze → Wartung an. ✔
4. Prüfer vor JEDEM Schreiben der Welt (vom allerersten Puls an): keine kaputten Zahlen (NaN, minus, zu groß), keine
   Basis mit zwei Besitzern, und die Welt darf nicht verschwinden (weniger als 80 % der Basen oder unter 20 % der
   Truppen auf einmal). Kaputt → nicht schreiben; 3-mal hintereinander → beenden (Neustart lädt den guten Stand).
   Test: absichtlich eingebauter Fehler, der die Welt löschen wollte → Datenbank blieb unversehrt. ✔
5. Sicherungen: jede Stunde (Tabelle `ow_sicherungen`, die letzten 48). Admin: „Zurückspielen“. Test ✔
6. Zu viele Fehler (über 120 pro Minute) → beenden. Wartung → sauber beenden (zählt nie als Absturz).
7. Dateien in `weltrechner/` (herz, log, zustand) heißen .php und beginnen mit einer Sperre: im Browser 404, leer.
8. Admin-Seite: Status (läuft/wartet/gestoppt), Speicher, Herzschlag, Puls, Fehler, Abstürze, Cronjob, Protokoll,
   Knöpfe „Neu starten“, „Wachhund-Cronjob einrichten“ (sichert vorher die bestehenden Cronjobs, fügt nur eine Zeile
   hinzu, prüft danach), „Sicherung zurückspielen“, „Sperre aufheben“.

**Tests mit der ECHTEN Welt (lokale Kopie, ohne Passwörter; Export-Dateien auf dem Server sofort wieder gelöscht):**
- Gefunden und behoben: Der Weltrechner hätte beim ersten Start die ganze Welt zurückgesetzt (Spiel-Reset ohne
  eigenen Spielstand). Doppelt behoben + Prüfer-Regel „Welt darf nicht verschwinden“.
- Gefunden und behoben: Rohstoff-Felder und Barbarenlager wurden über die Zeichenfläche des Browsers platziert
  (`isPointInPath`) – auf dem Server gar nicht, und je nach Browser evtl. minimal anders. Jetzt reine Rechnung
  (`aufLand` in spiel.js). Geprüft: alle 576 Felder liegen exakt an derselben Stelle wie vorher.
- Gefunden und behoben: Sammel-Marsch zu einem Feld, das es nicht gibt → Absturz bei jedem Schritt. Jetzt gehen die
  Truppen nach Hause.
- Weltrechner 3 Minuten auf der echten Welt: 0 Fehler, ~290 MB. Spieler (iceman, echter Spielstand): 0 Fehler in der
  Konsole. Auch die jetzige Online-Version (Handy rechnet) zeigt in Chrome 0 Fehler → Alexanders Fehler kommen evtl.
  von Safari (hier nicht testbar) – Bildschirmfoto der Fehler erbeten.
- Belastungstest: 100 Spieler gleichzeitig, 3 Minuten, 3.643 Befehle (679 absichtlich kaputt): 0 Fehler, keine
  Abstürze, keine Schleifen, Prüfer nie nötig, Weltrechner 190–280 MB, Antwort Ø 55 ms.
  **Problem gefunden:** jeder Spieler bekommt pro Puls Ø ~780 KB (ungepackt), weil geänderte Welt-Teile immer ganz
  geschickt werden (Mitspieler-Daten 400 KB, Insel-Stufen 166 KB, Truppen 97 KB). Für viele Spieler nötig: nur noch
  Änderungen schicken. Noch nicht gebaut.

**Weniger Daten: nur Änderungen schicken („Flicken“, 1.10., lokal getestet, noch NICHT hochgeladen):**
Große Welt-Teile ändern sich alle 2 s nur an wenigen Stellen. Jetzt schickt der Weltrechner (welt.js `flickenBauen`) bei
großen Teilen nur den Unterschied: neue/geänderte Einträge, weggefallene, und bei Mitspielern sogar nur die geänderten
Felder. server.php setzt den Flicken auf den gespeicherten Teil (`flicken_anwenden`, schreibt bei Mitspielern nur die
geänderten Zeilen in `ow_bots`) und merkt ihn sich (Tabelle `ow_welt_flicken`, die letzten ~600 Versionen). Spieler
bekommen dann auch nur die Flicken (`welt_seit_flicken`) und setzen sie auf ihren Stand (welt.js `flickenAnwenden`).
Passt einmal etwas nicht → der Spieler holt sich beim nächsten Puls die ganze Welt (nichts geht kaputt).
Gemessen mit der echten Welt: vorher ~864 KB pro Puls, jetzt Ø 249 KB ungepackt / **66 KB über die Leitung**.
Geprüft: 3× die Welt beim Spieler mit der Datenbank verglichen – jedes Mal genau gleich, 0 Fehler.
(Truppen ändern sich bei jedem Schritt auf fast allen Inseln – die gehen weiter ganz; später evtl. seltener schicken.)

**„Du warst … weg“ wieder da (Alexanders Meldung):** Die Begrüßung gab es nur, wenn das eigene Gerät die Welt
nachrechnete – als Zuschauer nie. Jetzt (spiel.js): nach dem Einloggen warten, bis die Nachrichten der Abwesenheit da
sind (3 Pulse), dann Begrüßung mit Produktion, Angriffen, Berichten. Getestet: „iceman, du warst 58 Min. weg | Produktion
+958,5 Mio. · 5,2 Mrd. Truppen“.
**Datenbank-Flut verhindert:** Für Spieler, die offline sind, legte der Weltrechner alle 2 s eine Nachricht („+Münzen“)
ab – nach 8 Stunden ~14.000 Einträge pro Spieler. Jetzt (welt.js `deltaMerken`): gesammelt und höchstens alle 5 Minuten
EINE Nachricht; online sofort.

**Späher durch geschlossene Tore (Alexanders Meldung) – behoben (bots.js):** Bots schickten Späher los, obwohl die
Tor-Prüfung „zu“ sagte (Ergebnis wurde an 4 Stellen nicht beachtet), und geprüft wurde vom Hauptsitz aus statt von der
Basis/Armee, von der der Späher wirklich losläuft. Jetzt: `botLearn(…, vonLm)` prüft vom echten Startpunkt, und ohne
freien Weg geht kein Späher los (und es gibt keine Meldung „Späher unterwegs“).

**Bekannte Schwachstelle (noch offen):** Münzen/Gems eines Spielers rechnet noch sein eigenes Gerät (privater Spielstand).
Ein Schummler könnte Befehle wie „Truppen dazu“ oder „Ausbau“ fälschen, ohne zu bezahlen. Lösung: auch das private
Konto auf den Server (nächster großer Schritt).

**Admin-Seite:** zeigt jetzt alle 150 Bots (60 feste + 90 aus der Namensliste in bots.js), nicht nur 60.

## 14. Handy-Benachrichtigungen (Web-Push) – gebaut 1.10., lokal getestet
Spieler bekommen eine Nachricht aufs Handy, auch wenn die App zu ist: „X greift deine Basis Y an (Ankunft in 4 Minuten)“,
„Basis Y verloren an X“, „Ein Späher von X ist unterwegs zu deiner Basis Y“.
- **Einschalten:** Profil → Spieler → „Benachrichtigungen“ → „Benachrichtigungen erlauben“ (erst nach Antippen gefragt).
  **iPhone/iPad:** nur, wenn Open Water als App auf dem Home-Bildschirm liegt (ab iOS 16.4) – sonst ein Hinweis.
- **Nicht nerven:** nur wenn man gerade NICHT im Spiel ist, höchstens 1 Nachricht pro Minute, zusammengefasst.
- **So geht es:** `weltrechner/push.js` merkt Angriffe/Späher/verlorene Basen und schickt verschlüsselt (RFC 8291, ohne
  Zusatzpakete) an Apple/Google. Geräte in Tabelle `ow_push` (mehrere pro Spieler), abgelaufene werden gelöscht.
- **Ausnahme (Alexander erlaubt): Service-Worker `Game/sw.js` nur für Push** – kein Zwischenspeicher, keine Spieldaten.
- **Schlüssel (VAPID):** erzeugt der Server beim ersten Bedarf EINMAL selbst (`push_schluessel` in server.php) und legt
  sie in `weltrechner/vapid.php` ab (von außen 404, nur der Server darf lesen, nie im Git, hochladen.sh überschreibt sie
  nie). Alexander muss nichts tun (2.10.). Die Datei NIE löschen – sonst neue Schlüssel und alle müssen Push neu erlauben.
  (Stehen `vapid_public`/`vapid_private` in config.php, gelten die stattdessen.)
- **Live getestet 2.10.:** Alexanders iPhone eingetragen (web.push.apple.com), Test-Nachricht vom Server → Apple antwortet
  201 (angenommen). Der Server darf also nach außen senden. Fehler stehen im Weltrechner-Log („Push:“).

## 14b. Schummel-Schutz: Weltrechner prüft jeden Befehl (3A) – gebaut 1.10.
Münzen/Gems/Stufe rechnet noch das Handy (bis 3B). Darum prüft der Weltrechner jeden Befehl (spiel.js vor `BEFEHLE`):
nur richtige Zahlen, eigene Basen, echte Orte; Feld/Lager/Armee nie mehr Truppen, als die Basis hat; geschenkte Truppen
nur aus echten Quellen (Stufenaufstieg je Stufe einmal, Thron-Shop, Lazarett, Fund, Admin-Geschenk); Ausbau nur +1 und
nur mit (geschätzten) Münzen; Grenzen für zu viele Befehle. Abgelehntes erscheint auf der Admin-Seite unter
**„Auffälligkeiten“** (`weltrechner/schummel.php`, gesperrt, nie im Git). Echte Spieler wurden in keinem Test blockiert.
Grenzen: pro Stunde ist noch ein kleiner Gratis-Ausbau-Spielraum möglich; Gems prüft der Server noch nicht (→ 3B).
**Seit 3B (Abschnitt 24):** Gems, Stufe, Stadt, Forschung, Truppen-Stufe, Ausrüstung, Helden und Schild stehen im Hauptbuch
des Weltrechners; die Welt benutzt nur noch, was er wirklich haben kann.

## 14c. Mitspieler reagieren wie Menschen mit Handy – gebaut 1.10.
Offline angegriffen → „Benachrichtigung“: tagsüber meist nach 2–30 Min. reinschauen (manchmal 1–2 Std.), nachts fast
immer erst morgens (zu spät). Wer rechtzeitig reinschaut, ist ein paar Minuten online und verteidigt sich wie sonst
(Hilfe, Truppen raus, Notschild), dann wieder offline. Gemerkt in `b.handy` (übersteht Neustarts). bots.js.

## 14d. Anzeige live + Stadt schneller – gebaut 1.10.
Alles in offenen Fenstern zieht von selbst nach (Schild-Restzeit, Ausbau-Knöpfe, Inselfenster, Profil, Shop, Helden,
Ziele, Rangliste …) – geschrieben wird nur, was sich ändert (kein Flackern). Stadt am Handy: Boden/Mauern als fertiges
Bild, Wolken in halber Auflösung, in Ruhe 30 statt 60 Bilder/s – gemessen ~20 statt 2 Bilder/s (Prozessor 4× gedrosselt).

## 15. SICHERHEITS-AUDIT (Nacht 1.→2.10.) – Zweig `audit/full-review`
Geprüft: das ganze Projekt (Server, Datenbank, Anfragen, Schummeln, Datenlecks, Abhängigkeiten, Fehler). Drei Prüfer
haben gelesen, alles Gefundene wurde behoben und getestet. Tests: `php tests/server_test.php` (41) und
`node tests/welt_test.js` (13, u. a. 2000 Zufallsfälle für die Flicken) – beide liegen nicht auf dem Server.

**Zugangsdaten:** In der ganzen Git-Geschichte (13 Zweige) stehen die echten Passwörter NIE – nur Platzhalter in alten
Beispieldateien. Es gab nie eine config.php/.env im Git. `.env.example` (ohne Werte) beschreibt, was hochladen.sh braucht.

**Behoben (Server, PHP):**
- Kein PHP-Fehlertext mehr im Browser (`display_errors` aus, eigener Fehler-Fänger); Admin-Seite/Spielseite nie im Zwischenspeicher.
- Sicherheits-Kopfzeilen: HSTS (immer HTTPS), CSP (nur eigene Dateien + three.js + Google-Schriften; Daten nur an den
  eigenen Server), `X-Frame-Options: DENY`, Permissions-Policy. three.js mit Echtheitsprüfung (`integrity`).
- Formulare (Anmelden, Registrieren, Abmelden, Admin) und Puls/Speichern nur von dieser Seite (`herkunft_ok`).
- Login-Bremse in einem Schritt (nicht mit vielen gleichzeitigen Anfragen umgehbar), pro Konto UND Gerät (niemand kann
  ein fremdes Konto von außen aussperren) + Grenze pro Konto über alle Geräte. Neue Passwörter ab 10, höchstens 72 Zeichen.
- Namen: nur lateinische Buchstaben (keine Doppelgänger wie kyrillisches „а“), Namen der Mitspieler gesperrt,
  eindeutiger Anzeigename in der Datenbank (zwei gleichzeitig → nur einer bekommt ihn).
- Puls-Bremse (höchstens 150/Minute), höchstens 30 Befehle pro Puls, höchstens 200 wartende Befehle pro Spieler, Befehle
  älter als 10 Minuten verfallen. Befehle nur bekannter Art mit echten Zahlen (`befehl_ok`).
- Speicher pro Konto höchstens 40 MB. Datenbank-Sperren werden geprüft. Neue Indizes (Aufräumen ohne Tabellen-Scan).
- Profil mit echten Spielgrenzen (Stufe ≤ 2000, Münzen ≤ 10¹⁵, Schild ≤ 8 Tage, Anfängerschutz ≤ 48 h, Skills,
  Ausrüstung, Helden, Stadt nur bis zu ihren Höchststufen).

**Behoben (Weltrechner):** eigener Zufalls-Schlüssel bei jedem Hochladen (nicht mehr aus dem DB-Passwort abgeleitet),
nur über die Umgebung übergeben (nie in einer Befehlszeile), nur an den eigenen Server gesendet. Node im
**Sicherheitsmodus** (`--permission`): darf nur die Spiel-Skripte und den eigenen Ordner lesen, nur dort schreiben,
keine Programme starten – getestet: config.php lesen → verweigert. Der Wachhund probiert vor jedem Start aus, ob Node den Modus kennt (sonst `--experimental-permission`, sonst ohne + Warnung im Log) – nie eine Absturz-Schleife wegen eines alten Node. Das Spiel-Fenster bekommt keine Node-Objekte mehr.
Prüfer-Neustarts zählen nicht mehr für die Notbremse (sonst hätte ein Schummler das Spiel in Wartung zwingen können);
erst 10 in 30 Minuten. Kein Ersatz-Hostname aus Anfragen.

**Behoben (Schummeln):** Angriff auf die eigene Basis (Gratis-EP), Tagesgrenzen Boss/Lager nur auf dem Handy, Beschleunigen
15× in Folge, freie Startplatzwahl, Dauer-Anfängerschutz und Dauer-Schild per gefälschtem Profil, Münzen-Riesenwerte,
„Befehl raus, App weg, Münzen behalten“ (jetzt wird vor jedem Befehl gespeichert).

**Behoben (Datenlecks in den Paketen):** Spieler bekommen keine Gedanken der Mitspieler mehr (Groll, Rache-Ziel, Pläne,
geplante Verlegung, Handy-Reaktionszeit, Schummel-Merkliste), keine Münzen/Verwundeten anderer, keine Login-Namen.

**Behoben (Fehler, 3. Prüfer):**
- Ausbau als Zuschauer: die Stufe sprang beim nächsten Puls kurz zurück, man konnte dieselbe Stufe zweimal bezahlen.
  Jetzt merkt sich das Handy den Ausbau 90 s (`wartendeAusbauten`), bis der Weltrechner ihn bestätigt.
- Angriff/Truppen schicken als Zuschauer: geschlossenes Tor und Maut werden jetzt vorher geprüft (`mautVorab`).
  Mehrfachangriff kostet keine Gems mehr, wenn nichts losgeht.
- Weltrechner-Log: Kopieren + Leeren statt Umbenennen (sonst wuchs die alte Datei endlos weiter).
- Gesammelte Münzen/EP für Spieler, die offline sind, liegen jetzt auch in der Welt (`dOffen`, sieht nur der Weltrechner).
  Bei einem Neustart geht nichts mehr verloren.
- Hinweise oben: bis 4 Zeilen statt 2 (lange Texte waren abgeschnitten). Namensfeld: dunkle Schrift auf Weiß.
  Angriffs-Warnungen: die Merkliste wird aufgeräumt.

**Behoben (2.10. morgens, Alexander):**
- Kampfberichte der Nacht standen alle mit der Uhrzeit, zu der man zurückkam („vor 3 s“). Jetzt bekommt jeder Bericht beim
  Weltrechner die echte Kampfzeit mit (`WELT.bericht` → `at`), und das Kampflog wird nach Zeit sortiert.
- Begrüßung „Du warst … weg“ kam viel zu spät (wartete auf Pulse/Nachrichten, dann noch hinter der täglichen
  Belohnung). Jetzt: sofort nach dem Ladebild (Test: 2,3 s nach dem Anmelden), ZUERST die Begrüßung, danach die tägliche
  Belohnung. Münzen/Truppen/Berichte der Nacht füllen sich live nach, solange sie offen ist (`welcomeLive`, 1 Minute).
  Gilt auch, wenn die App im Hintergrund lag. Ist das Spiel auf einem anderen Gerät/Tab offen geblieben, gilt man als „nicht weg“.

- Keine Kampf-Animation auf dem Handy: Die Schlacht auf der Karte lief nur beim Weltrechner. Beim Spieler blieb der Marsch
  bei „0:00“ stehen, bis das Ergebnis kam. Jetzt zeigt das Handy die Schlacht selbst (`zuschauerKampf` in spiel.js),
  sobald der Marsch ankommt, für eigene Angriffe und Angriffe auf einen. Ist der Kampf beim Weltrechner entschieden,
  spielt sie zu Ende, danach kommt das Ergebnis-Band.

- Befehle (Angriff, Beschleunigen, Senden …) brauchten 4–7 s: Weltrechner wartete bis zu 2 s auf seinen Puls, speicherte
  das Ergebnis erst 2 s später, das Handy holte es nochmal bis zu 2 s später. Jetzt: der Weltrechner fragt alle 0,3 s
  kurz „Befehle da?“ (`befehle_da`, nur mit Weltrechner-Schlüssel, eine winzige Abfrage) und rechnet dann sofort; nach
  ausgeführten Befehlen speichert er gleich (60 ms); das Handy holt nach einem Befehl nach 1,1 und 2 s extra ab.
  Gemessen: Angriff nach 1 s auf der Karte, Beschleunigen nach 0,4–0,8 s bestätigt.
- Beschleunigen sprang auf dem Handy kurz zurück (wie früher der Ausbau): jetzt gemerkt (`wartendSchneller`), bis der
  Weltrechner es übernommen hat.
- Schnell hintereinander beschleunigen zählt wieder jedes Mal (die 2-s-Sperre pro Marsch ist weg – sie schützte nichts,
  weil die Gems noch auf dem Handy liegen; Grenze bleibt 60× pro Minute). Test: 5× in 0,6 s → 55 s auf 1 s.
- Losschicken (Angriff, Mehrfach, Senden, Sammeln): der Marsch steht sofort auf der Karte (`vorlaeufigeMaersche`), bis
  der echte vom Weltrechner da ist (~1 s) – nie doppelt; Beschleunigen/Zurückrufen erst, wenn der echte da ist.

**Geprüft und sicher:** SQL-Injection (überall Platzhalter), Passwörter (bcrypt), Login-Cookie (HttpOnly, nur Hash in der
DB), Admin (feste Nummer + Formular-Zeichen), keine Datei gibt Geheimnisse preis (config.php 0 Bytes, Weltrechner-Dateien
404, Ordnerlisten 403), keine Daten anderer Spieler in Antworten, Push-Adressen gegen 16 Umgehungsversuche geprüft.
jsdom (einzige Abhängigkeit): 0 bekannte Lücken (`npm audit`).

**Noch offen (braucht Alexander / größere Umbauten):**
- ~~Nebel ist im Paket umgehbar~~ – Truppenzahlen gelöst mit 3B (Abschnitt 24: Nebel auf dem Server). Märsche, Armeen und
  Sammler anderer stehen weiter im Paket.
- ~~3B (Konto auf dem Server)~~ – gebaut, siehe Abschnitt 24 (Hauptbuch beim Weltrechner).
- Spielregel-Frage an Alexander: Hauptstadt auf eine gerade angegriffene Basis verlegen erlauben? (heute ja – damit
  rettet man jede Basis).
- Klein: Handy-Uhr falsch gestellt → Marschzeiten wirken verschoben (Handys stellen die Uhr meist selbst; nicht gebaut).

## 16. Neue Saison 2.10. – Spiel langsamer wie RoK (Alexanders Wunsch), Welt neu gestartet
Nach einem Tag hatten Spieler Stufe 100, Mrd. Truppen und Gold-Ausrüstung. Ursachen und Änderungen (spiel.js/bots.js):
- **EP:** vorher so viele EP wie der Gegner Truppen hatte (ein Sieg = Stufe 1 → 65). Jetzt höchstens ¼ der aktuellen
  Stufe pro Kampf (`kampfEp`, `KAMPF_EP_ANTEIL`), für Spieler, Bots und echte Mitspieler. Bis Stufe 100: mind. 400 Siege.
- **Sammeln wie RoK:** ein Feld leert sich in fester Zeit (außen 1 Std. … innen 4 Std., `fieldDauerSec`), egal wie viele
  Truppen; die Truppen bestimmen nur die Traglast. Gem-Felder 20 … 147 Gems (vorher bis 18.000 in unter 1 Min.).
  Gold-Felder gleiche Größe wie vorher, aber auch feste Zeit. Nachwachsen nach 60 statt 20 Min.
- **Bosse:** alle 4–6 Std. (vorher 20–35 Min.), 20 Gems + lila Kiste (vorher 50 + Gold). Wanderboss alle 6–8 Std. (vorher
  45–60 Min.), 50 Gems + lila Kiste (vorher 150 + Gold). Gold-Kiste nur noch Platz 1 beim Tagesboss.
- **Thron-Shop:** keine Gems mehr (vorher 100 Gems für 150 Punkte ≈ 22.000 Gems/Tag für den Herrscher).
- **Skills:** jede Fähigkeit höchstens 50 Punkte (Tempo 10) – auch in der Server-Prüfung (`profil_bereinigen`).
- Basen draußen aufwerten: bleibt sofort, ohne Bauzeit (Alexander).

**Welt-Neustart:** `werkzeuge/welt_neustart.php` (liegt NICHT auf dem Server). Ablauf: Wartung an → warten, bis der
Weltrechner beendet ist → Datei mit Zufallsnamen in Game/ legen → `?ja=NEUSTART` → Datei löschen → Wartung aus.
Sichert vorher alles in `weltrechner/altwelt_<Datum>.php` (404 von außen), löscht Welt + alle Spielstände (Stufe, Münzen,
Gems, Ausrüstung, Stadt), leert `spiel_token` (alte offene Fenster können nichts zurückschreiben). Konten, Namen, Logins,
Push bleiben. Der Weltrechner baut beim Start eine neue Welt (150 Mitspieler). Lokal getestet 2.10.
- **Bug 2.10.:** Mehrfachangriff auf 100 Ziele – nur ~30 kamen an. Der Server nimmt höchstens 30 Befehle pro Puls und
  warf den Rest still weg. Jetzt schickt das Handy je 30 und gleich danach die nächsten 30 (welt.js). Test: 84/84 angenommen.

## 17. Einstellungen + Spähbericht (2.10., lokal getestet – NOCH NICHT hochgeladen)
- **Einstellungen (Idee 51):** Zahnrad unten in der Kartenleiste (`#settingsBtn`, `#settingsPopup` in spiel.php).
  - Benachrichtigungen (aus dem Profil hierher umgezogen) + je Art an/aus: Angriff, Späher, Basis verloren. Gespeichert
    auf dem Server (`ow_spieler.push_aus`, Aktion `push_arten`, nur diese 3 Arten erlaubt); der Weltrechner (push.js)
    lässt ausgeschaltete Arten weg.
  - Ton: Musik + Effekte / nur Effekte / aus (gleich wie der Knopf an der Karte, `Music.setMode`).
  - Akku sparen: halb so viele Bilder pro Sekunde, Schärfe 1,5 statt 2 (`akkuSparen`).
  - Konto: Name (führt zum Namensfeld im Profil), Spieler-Nummer, **Passwort ändern** (Aktion `passwort`: altes
    Passwort nötig, neues 10–72 Zeichen, höchstens 5 Versuche in 15 Min., danach alle anderen Geräte abgemeldet),
    **Abmelden** (POST an index.php?aus=1).
  - Hilfe (kurz) und Version (Datum von spiel.js).
- **Spähbericht (Idee 17):** Der Späher bringt jetzt zusätzlich mit (bei Basen von Mitspielern): Herr + Stufe + Titel,
  Friedensschild, die 3 besten Helden mit Sternen, Fähigkeiten (Angriff/Verteidigung/Truppen), Mauer-Stufe und die
  4 Ausrüstungsteile mit Seltenheit, Stufe und Sternen (`spaeherBlick`; im Kampflog unter „Spähbericht“).
- Idee 5 (Tempel-Bonus fürs Bündnis) kommt mit den Bündnissen (Paket A).

## 22. Aufbau (Paket D) – wie Rise of Kingdoms (2.10., lokal getestet – NICHT hochgeladen, braucht Welt-Neustart)
Alexanders Auswahl 8, 9, 10, 11, 14. Neue Datei **`Game/aufbau.js`** (nach spiel.js, vor buendnis.js; Weltrechner lädt sie
mit: start.js, wachhund.php; auch hochladen.sh, Vorschau, Tests). spiel.js/bots.js/welt.js/buendnis.js rufen alles über
`AUF` (in bots.js `var AUF = null`, solange aufbau.js noch nicht geladen ist → dann gelten die alten Werte).
Gleiche Regeln für dich, die Mitspieler und andere echte Spieler. **Die Welt muss neu gestartet werden** (neue Saison) –
alte Spielstände stürzen nicht ab: fehlende Felder werden vorbelegt (Burg 1, keine Forschung, T1, Start-Rohstoffe).
- **8 Burg wie das RoK-Rathaus:** eigene **Burg-Stufe 1–25** (`city.levels.keep`), getrennt von der Basis-Stufe draußen
  (die Basen auf der Karte, auch die Hauptstadt, bleiben sofort aufwertbar ohne Bauzeit). Aufwerten in der Stadt (Burg
  antippen): braucht einen Bauarbeiter, hat Bauzeit, mit Gems beschleunigbar (1 Gem/Min. wie Gebäude), VIP −2 %/Stufe.
  - Kosten Stufe L → L+1: Münzen 2.000 × 1,85^(L−1), Holz 1.000 × 1,72^(L−1), Stein 80 % davon (ab 2), Eisen 40 % (ab 5).
    Beispiel L 1→2: 2.000 Münzen + 1.000 Holz; L 24→25: ~2,8 Mrd. Münzen + ~260 Mio. Holz.
  - Bauzeit: 60 s × 1,55^(L−1) bis Stufe 14 (~5 Std.), dann × 1,25 je Stufe, höchstens 7 Tage (24→25 ≈ 2 Tage, zusammen ~10 Tage).
  - Schaltet frei: **Stadt-Gebäude höchstens bis zur Burg-Stufe** (ab Burg 25 bis zu ihrem Höchstwert); **Marsch-Plätze**
    2 + (Burg−1)/6 → Burg 1: 2, 7: 3, 13: 4, 19: 5, 25: 6; **Truppen-Stufen** T2 ab Burg 6, T3 ab 11, T4 ab 16, T5 ab 21
    (mit Forschung); neue Gebäude: Wachturm ab Burg 3, Markt ab 4, Botschaft ab 5. **Keine Grenze für die Zahl der Basen.**
  - Burg-Fenster (`AUF.renderKeep`, ersetzt `renderKeepSheet`): Kosten, Bauzeit, „Jetzt“ (Marsch-Plätze belegt/frei,
    Gebäude bis Stufe, Truppen-Stufe), „Burg-Stufe X schaltet frei“, Friedensschild, Aussehen. Die Burg in der Stadt wächst
    mit der Burg-Stufe (alle 5 Stufen größer).
- **Marsch-Plätze (gilt für ALLE, auch Mitspieler – Wunsch Koordinator, live haben Bots ohne Grenze in 4 Std. 600 Basen
  erobert):** eine Aktion = ein Angriff, eine Verstärkung (Senden, Bündnis-Hilfe, Rally-Beitrag), ein Sammler (auf dem Weg
  oder am Feld), ein Marsch zu Lager/Tagesboss/Drache/Invasion, eine Armee im Feld, eine eigene Rally. Rückwege zählen nicht,
  Truppen zu einer bestehenden Armee auch nicht. **Ein Mehrfachangriff (und „Truppen sammeln“) zählt als EINE Aktion**
  (Kennung `grp`, nur vom selben Ort, nur innerhalb 60 s). Geprüft wird ganz unten in `launchAttack`, `launchSend`,
  `fieldSend`, `barbSend`, `armyCreate`, `bundMarsch`, `bundRallyStart` (`marschPlatz` in spiel.js) – also für dich (mit
  Hinweis „Alle 2 Marsch-Plätze sind belegt …“), für jeden Mitspieler und beim Weltrechner für jeden Befehl (gefälschte
  Befehle am Handy vorbei werden abgelehnt). Mitspieler rechnen mit `AUF.marschFrei` (botThink, botFreeSlots, Sammeln).
- **9 Rohstoffe Holz, Stein, Eisen** (`openWaterRes`, privat wie die Münzen; Start 3.000 / 2.000 / 500):
  - ~~Jede Basis macht nebenbei …~~ **geändert in Abschnitt 26:** Rohstoffe kommen jetzt aus Holzfäller, Steinbruch und
    Eisenmine in der Stadt (Landschaft und Region der Hauptstadt zählen weiter mit).
  - **Neue Felder** (eigener Zufall, die Gold-/Gem-Felder bleiben genau, wo sie waren): Holzfällerei, Steinbruch, Eisenmine,
    je äußere Region 2 (ganz außen 3), passend zur Landschaft. Gleiche RoK-Regel wie Gold: feste Dauer (außen 1 Std. …
    innen 4 Std.), Vorrat 8.000 / 8.000 / 6.000 × Regions-Faktor, Traglast 2 / 2 / 1,5 je Truppe.
  - HUD: Knopf mit Kiste rechts (am PC mit den drei Zahlen), antippen → Liste mit Menge und „+…/Std.“.
  - Weltrechner: Rohstoffe der anderen in `botState[id].res` (nur der Weltrechner sieht sie: server.php `NUR_WELTRECHNER`,
    Profil ohne `res` an andere). Für echte Spieler gehen Änderungen als Nachricht `delta` mit `res` (welt.js `topf`/
    `deltaMerken`), das Profil schickt `res` zurück. **Schummel-Schutz:** zählt die geschickten Rohstoffe mit; zeigt das
    Profil mehr als möglich (Spielraum 30.000 + 2,5 Std. Einnahmen + ein Tag Markt) → Warnung „rohstoffe“ auf der Admin-Seite.
- **10 Neue Gebäude** (Stadt-Ansicht mit eigenem Bild und Bauplatz, Kosten jetzt Münzen + Rohstoffe: Holz 300 × 1,75^L,
  Stein ab Stufe 2, Eisen ab Stufe 6, je Gebäude etwas anders gemischt):
  - **Akademie** (gab es schon, +2 % Marschtempo/Stufe bleibt): hier wird jetzt geforscht.
  - **Wachturm** (`tower`): Angriffe auf dich zeigen im Kampf-Fenster die Stärke (ab 1 ungefähr, ab 10 genau mit
    Truppen-Stufe und Held); Spähberichte zeigen Burg + Truppen-Stufe, ab 5 die Militär-Forschung. Mitspieler bemerken
    Angriffe früher (+8 %/Stufe) und auch „Spurlos“-Helden eher (−3 %/Stufe).
  - **Botschaft** (`embassy`): Hilfe- und Rally-Märsche zu Bündnis-Mitgliedern +3 %/Stufe schneller, Bündnis-Geschenke an
    dich +4 %/Stufe (buendnis.js).
  - **Markt** (`market`): Rohstoff ↔ Münzen, 1 Rohstoff = 5 Münzen, Gebühr 24 % (Stufe 1) … 5 % (ab 20), Tageslimit je
    Richtung max(50.000, Stunden-Münzen × (0,2 + 0,032 × Stufe)) Münzen-Wert (Stufe 25 ≈ eine Stunde Einnahmen).
- **11 Forschung** (Akademie, eine gleichzeitig, mit Gems beschleunigbar, VIP gilt; Stufe L braucht Akademie „ab“ + 2 × (L−1)):
  - Wirtschaft: Ertrag +3 % Münzen und Rohstoffe (10 Stufen, ab Akademie 1) · Sammeln +5 % schneller (10, ab 2) ·
    Traglast +6 % (10, ab 3).
  - Militär: Angriff +2 % Kampfkraft (10, ab 2) · Verteidigung +2 % (10, ab 2) · Lazarett +2 % der Gefallenen (10, ab 4) ·
    Truppen-Stufe T2 (Akademie 5, Burg 6), T3 (10/11), T4 (15/16), T5 (20/21), jede braucht die vorige.
  - Erkundung: Marschtempo +3 % (10, ab 1) · Späher +10 % schneller (5, ab 3) · Kundschaft +15 % Nebel beim Erobern
    (5, ab 6; Mitspieler kennen ab Stufe 3 auch die Nachbarn der Nachbarn).
  - Kosten Stufe L: Münzen 3.000 / Holz 1.500 / Stein 1.200 / Eisen 600 (Militär ×1,6) × 1,6^(Akademie-ab − 1) × 1,8^(L−1),
    Truppen-Stufen ×30. Zeit: 5 Min. × 1,7^(L−1) × 1,35^(ab − 1), Truppen-Stufen ×8, höchstens 7 Tage
    (z. B. Angriff 1: 6½ Min., T2 ≈ 2 Std., T3 ≈ 10 Std., T4 ≈ 2 Tage, T5 7 Tage).
  - Wirkungen beim Weltrechner über das Profil (`fo`) → `profilZuBot` → `AUF.kampf`, `botMults` (Ertrag), `botMarchMult`,
    `botHospitalPct`, Sammeln/Traglast, `scoutSecs`. server.php `profil_bereinigen`: feste Liste mit Höchststufen.
- **14 Truppen-Stufen T1–T5, nur EINE Truppenart:** die Qualität des ganzen Reiches. T1 Standard, T2 +10 %, T3 +25 %,
  T4 +45 %, T5 +70 % Kampfkraft (Angriff UND Verteidigung). Wählen in der **Kaserne**; jede neue Stufe kostet einmal Eisen
  (T2 20.000, T3 250.000, T4 3 Mio., T5 30 Mio.), zurückstellen ist frei. Rechnung (`AUF.kampf`): Angriff = Truppen ×
  Titel × Stufe × (1 + Forschung Angriff) – beim Losschicken festgehalten (`atkKraft`, `atkTier`), gilt in `resolveAttack`,
  `resolveBotAttack`, `fightEstimate`, Vorschau, Feld-/Armee-Kämpfen, Lager/Boss/Drache. Verteidigung: Besatzung UND
  Verteidigung zählen × Stufe × (1 + Forschung Verteidigung) (in `effectiveDefense`, Kampfbericht-Zeile „Truppen-Stufe T3“).
  Der Weltrechner zählt eine Stufe nur so hoch, wie Burg und Forschung im Profil erlauben (Profil mit T5 ohne Forschung → T1/…).
- **Mitspieler (bots.js + aufbau.js) nutzen alles mit gleichen Kosten:** Burg (sobald Gebäude an sie stoßen), neue Gebäude,
  Forschung nach Spielstil (`BOT_FO_LIEBER`), Truppen-Stufe (wenn Eisen mit Polster da ist), Markt (kaufen nur, was fehlt,
  mit übrigen Münzen), sammeln Rohstoffe (der für die Burg fehlende lockt mehr; Fleißige 2 Sammler), Vorspulen inklusive.
- **Getestet (Port 8784, DB `owtest_au`, Weltrechner + 3 Spieler):** Burg-Ausbau mit Bauzeit + Gems; Gebäude über Burg-Stufe
  gesperrt; Forschung (eine gleichzeitig) + Gems; T3 gewählt (250.000 Eisen weg); Markt (1.000 Holz → 4.000 Münzen bei 20 %);
  Angriff des Zuschauers kommt beim Weltrechner mit Kampfkraft 1,25 × 1,02 = 1,275 an, Bericht 20.000 → 25.500; anderer
  Spieler sieht Burg 11/T3, obwohl das Profil T5 meldet; 4 gefälschte Angriffs-Befehle → nur 2 angenommen (Burg 1),
  Sammeln dann abgelehnt; Mehrfachangriff auf 3 Ziele + 1 Angriff = 2 Aktionen, der nächste abgelehnt; Eisen-Sammler kommt
  mit 59 Eisen zurück (Nachricht kommt an); Wachturm/Spähbericht; alte Stände ohne Felder. Mitspieler nach ~15 Min.:
  alle innerhalb ihrer Marsch-Plätze, Burg 2–4, Akademie/Wachturm gebaut, Forschung läuft. Keine Fehler in Konsole/Weltrechner.
- **Offen:** Burg-Stufe, Gebäude, Forschung und Rohstoffe rechnet weiter das Handy (privat, wie Stadt und Münzen bis 3B) –
  der Weltrechner prüft nur Plausibilität (Stufe nur mit Burg + Forschung, Rohstoff-Sprünge als Warnung). Ein Schummler könnte
  sich eine höhere Burg-Stufe ins Profil schreiben (mehr Marsch-Plätze) – erst mit 3B ganz sicher. **→ erledigt mit 3B
  (Abschnitt 24): Burg, Gebäude, Forschung, Truppen-Stufe zählen nur noch so, wie das Hauptbuch sie angenommen hat.**
- **Beobachtung:** Auch mit 2 Marsch-Plätzen nehmen Mitspieler am Anfang schnell neutrale Basen (die Märsche am Rand dauern
  nur Sekunden): im Test nach ~30 Min. der beste 36 Basen, Ø 15. Die Grenze wirkt (nie mehr als erlaubt gleichzeitig),
  das Tempo der Ausbreitung selbst hängt an den Marschzeiten und der Stärke der neutralen Basen.

## 21. Paket F + Gem-Bremse (2.10., lokal getestet – NICHT hochgeladen)
- **Gem-Bremse:** Erfolge geben 5× weniger Gems (vorher zusammen ~18.000 → Gold-Ausrüstung in Stunden, auch bei Bots),
  eine Ausrüstungskiste kostet 15 statt 5 Gems. Gilt für Spieler und Mitspieler gleich.
- **46 Mehr Handy-Nachrichten** (push.js `BEOBACHTER`/`nachrichtBauen`): Boss/Wanderboss erschienen, Sammler zurück
  (mit Menge), Friedensschild läuft in der nächsten Stunde ab. Je Art in den Einstellungen abschaltbar
  (`PUSH_ARTEN` in server.php). „Gebäude fertig“ geht nicht: die Stadt liegt nur im eigenen Spielstand.
- **39 VIP durch Spielen:** jeder Spieltag zählt (VIP 1 nach 1 Tag … VIP 10 nach 120 Tagen, `VIP_TAGE`). Vorteile:
  Stadt-Bauzeit −2 % je Stufe, jeden Tag eine VIP-Tageskiste ins Abholfach (Münzen, ab VIP 5 + Ausrüstungskiste).
  Anzeige im Profil. Nur im eigenen Spielstand (`openWaterVip`).
- **45 Anleitung für neue Spieler:** 6 Schritte unten am Bildschirm (Burg antippen, aufwerten, neutrale Basis angreifen,
  Gebäude bauen, sammeln, Ziele öffnen), jeder hakt sich von selbst ab, „×“ überspringt. Am Ende 10 Gems + Kiste.
  Nur für neue Spieler (`openWaterAnleitung`).


## 20. Helden (Paket E) – 2.10., lokal getestet (NOCH NICHT hochgeladen)
- **19 Mehr Helden:** 6 neue Helden (jetzt 20), jeder mit kurzer Geschichte (`story`, in der Helden-Halle), eigenem Bild
  (`HERO_LOOK`) und Fähigkeiten aus den vorhandenen Wirkungen. Freischalten über Splitter wie bisher, gleiche Start-Splitter.
  - Wolfram (Legendär, Armeen): Kesselschlacht (Wut: Angriff gegen Armeen), weniger Verluste / Verteidigung / Tempo im Feld.
  - Thora (Episch, Überfall): Überrumpeln (Wut: Verteidigung des Ziels zählt weniger), Tempo, später bemerkt, Rückzug.
  - Eskil (Episch, Lazarett & Wut): Runenheilung (Wut: mehr ins Lazarett), weniger Verluste, Wut schneller, Flucht.
  - Lene (Selten, Brücken): Fährmannslist (Wut: über eine Brücke Verteidigung −), Tempo, Maut, Rückzug.
  - Bruno (Selten, Angriff): Bärenkraft (Wut: Angriff), Angriff gegen neutrale Basen, weniger Verluste, Gold.
  - Pia (Gewöhnlich, Sammeln): Großer Fang (Wut: Gold), schneller sammeln, mehr Traglast, Sammler verteidigen.
  Stärke: jeweils wie die vorhandenen Helden derselben Seltenheit (gleiche `HERO_TIER`-Werte), keine neue Wirkung.
- **20 Zwei Helden pro Marsch:** Hauptheld + Zweitheld (`hero2` an Angriff, Feld-Marsch, Lager/Boss-Marsch, Armee).
  Der Zweitheld gibt seine Werte (Angriff, Verteidigung, Tempo, Gefolge) und passiven Fähigkeiten zu 50 % (`HERO_ZWEIT`),
  die Wut-Fähigkeit zündet nur beim Haupthelden, nur dessen Wut füllt sich. Passendes Paar: +10 % auf alle Heldenwerte
  des Marsches (`HERO_PAIR_BONUS`). 6 Paare (`HERO_PAIRS`, jeder Held in höchstens einem): Kasimir & Wolfram „Die alte
  Garde“, Ragna & Thora „Wind und Welle“, Yrsa & Eskil „Hüter der Runen“, Ida & Lene „Pfad und Furt“, Hagen & Bruno
  „Raufbrüder“, Fenn & Pia „Fels und Meer“. Rechnung: `heroDuo` (spiel.js) hängt den Zweithelden an das `hx` des Marsches.
  - Ein Held kann nur in einem Marsch sein (`heroBusy` prüft Haupt- und Zweitheld überall).
  - Auswahl: Angriffs-Vorschau, Mehrfachangriff, Feld, Barbaren-Lager/Boss, Armee – erst den Haupthelden wählen, dann
    erscheint „Zweitheld“; der passende Partner steht vorn und ist markiert („Paar +10 %“).
  - Befehle: `angriff`, `feld`, `lager` haben jetzt `held2`; neu `armee` mit `op: 'held'` (Held einer Armee wechseln –
    ging beim Zuschauer bisher gar nicht an den Weltrechner). Der Weltrechner prüft Besitz und „belegt“ (`heroZweitOk`,
    `armySetHeroes`); ein falscher Zweitheld fällt einfach weg. Server: keine neue Befehls-Art, `befehl_ok` passt.
  - Mitspieler wählen Paare genauso (`heroPickPair`: bester Hauptheld, dann der Zweitheld, der am meisten dazugibt –
    ein Paar zählt dabei von selbst mehr; Sammler: `botGatherHeroes` nimmt den Partner).
  - Kampfbericht: beide Helden mit Bild, der Zweitheld mit „Zweitheld · 50 %“, die Paar-Zeile; kurze Berichte „Hagen & Bruno“.
- **Helden-Halle:** unten die Paare (beide Bilder, Name, Geschichte, „bereit“, wenn beide freigeschaltet); beim Helden
  seine Geschichte und sein Paar mit Partner.
- Nebenbei behoben: `armyCreate` für andere Spieler beim Weltrechner brach beim Ton ab (kein AudioContext) – jetzt ohne Ton.
- Wirtschaft unverändert: keine neuen Splitter- oder Gem-Quellen (mehr Helden = die Splitter verteilen sich auf mehr).
- Test (Port 8783, DB `owtest_he`): Zuschauer wählt Hagen + Bruno → Weltrechner führt Angriff mit beiden aus, Paar-Bonus
  stimmt (Zweitheld halb, ×1,1), Bruno ist belegt; gefälschte Zweithelden (nicht im Besitz, belegt, doppelt) fallen weg;
  Feld mit Pia + Fenn, Armee mit Otto + Greta (belegter Zweitheld abgelehnt); Bericht zeigt den Zweithelden; Mitspieler
  ziehen mit Zweithelden los (Angriffe, Armeen, Lager, Felder). Keine Fehler in der Konsole.

## 19. Events (Paket B) – wie Rise of Kingdoms (2.10., lokal getestet – NOCH NICHT hochgeladen)
Alles rechnet der Weltrechner (Welt-Schlüssel **`openWaterEvents`**, in `speichern.js` WELT und `welt.js` UMRECHNEN),
Spieler sehen es als Zuschauer. Zeiten = Uhr des Weltrechners. Neu im Spiel-Code: Abschnitt „EVENTS (Paket B)“ in spiel.js.
- **Ereignis-Knopf** an der Karte (`#eventBtn`, neues Zeichen) öffnet das Fenster **„Ereignisse“** (`#eventPopup`) mit
  Übersicht (Turnier, Invasion, Drache, Tagesboss, Lager – Termine, Uhren, „Zur …“-Knöpfe) und je einem Reiter mit
  Regeln, Preisen und Rangliste (Top 10 + deine Zeile). Unter dem HUD erscheinen Hinweise: „Barbaren-Invasion in …“
  (30 Min. vorher), „Invasion · Welle 3/6“, „Der Drache kommt in …“, „Drache 63 %“, freitags „Ab Samstag: <Thema>“.
- **Wochenend-Turnier mit Themen** (Sa+So wie bisher, jede Woche ein anderes Thema, für alle gleich, rotierend):
  „Kampf um die Mitte“ (wie bisher: Thron/Tempel/Kämpfe in der Mitte · Bonus Thron-Punkte +50 %), „Sammel-Rausch“
  (Punkte fürs Gesammelte, volles Feld = 30 · Sammeln 50 % schneller), „Krieger-Woche“ (Punkte für besiegte Truppen
  überall, 1 je 1.000 · 10 Barbaren-Lager mehr pro Tag), „Boss-Jagd“ (Punkte für Schaden an Tagesboss und Drache ·
  Weltbosse doppelt so oft, 5 Tagesboss-Angriffe mehr), „Bauherr“ (Punkte fürs Aufwerten, 2 + neue Stufe · Ausbau 20 %
  günstiger – auch der Schummel-Schutz rechnet mit dem Rabatt). Gedeckelt wie bisher: höchstens 30 Punkte auf einmal,
  im Schnitt 10 pro Minute (`tourDeckel`). **Preise maßvoller:** 1.: 1.000 Gems + 30 Splitter + goldene Kiste ·
  2.–3.: 500 + 15 + lila · 4.–10.: 200 + 6 + blau · alle anderen 50 + 2 (vorher 3.000/1.500/600/100 Gems).
- **Barbaren-Invasion:** alle 3 Tage um 20 Uhr eine Stunde. 6 Wellen (alle 9 Min.): Barbaren-Armeen kommen vom Rand
  ihrer Insel und marschieren 5–7 Min. auf eine Basis – jeder echte Spieler bekommt pro Welle eine (seine äußerste
  Basis), dazu 12 Mitspieler-Basen; nie in der Mitte, nie bei Friedensschild. Stärke wie das Ziel (spätere Wellen
  stärker); wer noch Anfängerschutz hat, bekommt nur halb so starke Armeen (meist ein Sieg mit Punkten). Barbaren erobern nichts: wer verliert, verliert 60 % der Truppen; wer abwehrt, verliert
  etwas und bekommt **+15 Punkte**. Armeen kann man unterwegs abfangen (antippen → „Abfangen“, nur wenn man rechtzeitig
  ankommt): Sieg **+20 Punkte**, Teilschaden anteilig – auch für Armeen auf Nachbarn. Belohnung danach (klein): ab 10
  Punkten 10 Gems + 1 Splitter, ab 40: 30 + 3 + grüne Kiste, ab 100: 60 + 6 + blaue Kiste. Mitspieler schicken
  Verstärkung in bedrohte Basen und fangen Armeen in ihrer Nähe ab (`botInvasion` in bots.js, gleiche Regeln).
- **Der Drache** („Urdrache Vharak“): jeden Sonntag 19–22 Uhr über dem Thron, sehr viel Leben (≈ 75 % dessen, was alle
  zusammen schaffen). 10 Angriffe pro Person, höchstens 2 % Leben pro Angriff, ein Drittel der Kämpfer fällt, Münzen
  nach Schaden. Fällt er: Platz 1 goldene Kiste + 150 Gems + 20 Splitter, Platz 2–10 lila Kiste + 60 + 8, alle anderen
  15 Gems + 2 Splitter. Entkommt er: alle Kämpfer das Kleine. Mitspieler greifen über den Abend verteilt an (`botDrache`).
  Auf der Karte gezeichnet (Flügelschlag, Feueratem, Lebensbalken), auch im Nebel sichtbar.
- Angriffe auf Armeen/Drachen laufen über den bekannten Befehl `lager` (neue Arten `k: 'i'` und `k: 'd'`, Weltrechner
  prüft: Armee/Drache da, höchstens 10 Drachen-Angriffe, höchstens 40 Event-Angriffe pro Stunde). Märsche wie bei
  Lager/Tagesboss (`barbMarches`). Preise für echte Spieler kommen als Nachricht `evPreis` ins Abholfach (auch Kisten –
  gilt jetzt auch fürs Turnier; server.php `WELTRECHNER_NACHRICHTEN` kennt `evPreis`), Berichte als Kampflog-Eintrag
  (Art `ev`).
- **Handy-Nachrichten** (push.js): „Barbaren-Invasion beginnt in 10 Minuten“ und „Der Drache ist erschienen“ an alle
  echten Spieler (nur wer gerade nicht im Spiel ist). Neue Arten `invasion`, `drache` in server.php `PUSH_ARTEN` und in
  den Einstellungen (`#pushArten`) einzeln abschaltbar.
- Behoben nebenbei: Zuschauer sahen die Turnier-Leiste unter dem HUD nie (sie wurde nur beim Weltrechner gezeichnet).
  Und: `sfx()` tut beim Weltrechner nichts mehr (jsdom hat keinen Ton – ein Kampf-Effekt warf dort einen Fehler).
- **Test-Zeiten:** `var EV_TEST = null` in spiel.js. Nur in einer lokalen Kopie auf z. B. `{ inv: Date.now() + 240000,
  dr: Date.now() + 150000 }` setzen – im Git bleibt es `null` (echte Zeitpläne).
## 18. Bündnisse (Paket A) – 2.10., lokal getestet, NOCH NICHT hochgeladen
Alexanders Auswahl 23–27 + 5: Bündnisse wie in Rise of Kingdoms – für echte Spieler UND Mitspieler, gleiche Regeln.
Neue Datei `Game/buendnis.js` (nach spiel.js geladen; der Weltrechner lädt sie mit, wachhund.php erlaubt das Lesen).
- **Bündnis (23):** Name 3–20 lateinische Buchstaben/Ziffern, Kürzel 2–4 Buchstaben (auf der Karte „[ABC] Name“),
  Farbe + Wappen-Zeichen, offen oder „nur auf Anfrage“. Höchstens 20 Mitglieder (seit Abschnitt 42: 5). Anführer + Mitglieder. Gründen kostet
  30.000 Münzen (zieht der Weltrechner ab, kommt als „−Münzen“ beim Spieler an). Beitreten / Anfragen (Anführer sagt
  Ja/Nein; ein Mitspieler als Anführer entscheidet nach Macht und Nähe), Verlassen, Entfernen, Anführer übergeben
  (geht der Anführer, führt das stärkste Mitglied). **Mitglieder greifen sich nicht an:** Angriff, Armee, Feld – gesperrt
  mit Hinweis; Mitspieler wählen Mitglieder nie als Ziel; kommt ein Angriff an, wenn das Ziel inzwischen einem Mitglied
  gehört, gehen die Truppen heim. **Tore von Mitgliedern** sind für alle Mitglieder frei und offen (sonst könnte ein
  Mitglied die anderen einsperren – angreifen dürfen sie das Tor ja nicht).
- **Mitspieler** gründen selbst (etwa 1 Bündnis pro 12 Mitspieler, in verschiedenen Gegenden, mit ≥ 4 Basen und genug
  Münzen), treten dem nächsten passenden bei (Nähe vor Macht, ähnlicher Spielstil hilft). Etwa jeder Fünfte bleibt allein.
- **Signale statt Chat (24):** „Hilfe! X wird angegriffen“, „Angriff auf X!“, „Sammeln bei X“, „Verteidigt X!“, „Danke!“.
  Senden: Basis antippen → Zeile „Bündnis“ im Inselfenster (oder „Danke!“ im Fenster). Höchstens 1 Signal pro 30 s.
  Liste im Tab „Signale“, auf der Karte 10 Min. als Zeichen über der Basis. **Mitspieler antworten mit Taten:**
  „Hilfe/Verteidigt“ → nahe Mitglieder schicken rechtzeitig Truppen (die werden Teil der Besatzung, nur an Basen, die
  gerade angegriffen werden); „Angriff auf X“ → passende Mitglieder ziehen dorthin (im Mitspieler-Kopf `bundZielVon`);
  „Sammeln“ → sie kommen zur Rally. Mitspieler rufen selbst um Hilfe, wenn eine lohnende Basis allein nicht hält
  (höchstens alle 4 Min.), und bedanken sich manchmal für Hilfe. Spieler können über „Helfen“ selbst Truppen schicken.
- **Rally (26):** Ziel antippen → „Rally“ → Sammelpunkt (eigene Basis), Wartezeit 1/3/5 Min., Truppen. Mitglieder
  schicken über „Mitmachen“ Truppen (nur wer rechtzeitig ankommt; Mitspieler automatisch, wenn sinnvoll). Nach Ablauf
  marschiert alles als EIN Angriff (normale Kampfregeln, Held/Boni des Starters). Überlebende gehen anteilig zu ihren
  Basen zurück, Münz-Beute wird anteilig verteilt (EP, Lazarett und eine eroberte Basis bekommt der Starter). Karte:
  Fahne am Sammelpunkt mit Countdown + Truppen, gestrichelt zum Ziel; eine Rally gegen dich/dein Bündnis rot.
  Mitspieler starten Rallys auf große Ziele, die einer allein nicht schafft (Mega-Tempel, Tempel, starke Spieler – erst
  spähen), höchstens 2 gleichzeitig pro Bündnis (Spieler: 3 pro Bündnis, 1 pro Spieler).
- **Geschenke (27):** Boss besiegt oder große Kiste im Shop (ab 500 Gems) → alle anderen Mitglieder bekommen ein kleines
  Bündnis-Geschenk ins Abholfach (5 % einer Stunden-Produktion an Münzen + Truppen, selten eine graue/grüne Kiste).
  Höchstens 5 Geschenke pro Mitglied und Tag, Kisten-Geschenke höchstens 3 pro Geber und Tag. Der Weltrechner meldet
  die Gutschrift dem Schummel-Schutz (sonst wäre das Abholen „verdächtig“). Neue Nachricht `bundGeschenk` (server.php
  prüft: nur Münzen/Truppen/Kiste grau-grün, nie Gems oder Splitter).
- **Tempel-Bonus (5):** Hält ein Mitglied einen Tempel, produzieren alle Mitglieder mehr Münzen und Truppen: +2 % je
  Tempel (auch Wächter-Tempel), Mega-Tempel +5 %, höchstens +12 %. Im Tab „Übersicht“ sichtbar.
- **Gebiet (25):** Basen eines Bündnisses färben die Karte zart in der Bündnisfarbe; Mitglieder marschieren 10 %
  schneller zu Basen des Bündnisses und auf Inseln, auf denen das Bündnis ≥ 40 % der Basen hält. Namensschilder von
  Mitgliedern deines Bündnisses sind grün.
- **Fenster „Bündnis“:** Knopf an der Karte (`#bundBtn`, roter Punkt = neue Signale/Rallys), Tabs Übersicht, Signale,
  Rally, Suchen (mit Gründen). Für das iPhone gebaut (Eingaben 16 px, kein Zoom).
- **Handy-Nachrichten:** „Bündnis ruft um Hilfe“ und „Rally gegen dich“ (push.js, `PUSH_ARTEN` + Einstellungen).
- **Technik:** Welt-Schlüssel `openWaterBuendnisse` (speichern.js `WELT`, welt.js `UMRECHNEN`). Befehl `bund` mit `op`
  (gruenden, beitreten, anfrage, anfrageWeg, verlassen, rauswerfen, anfuehrer, offen, signal, rally, rallyDazu,
  rallyAbbruch, hilfe, kiste) – server.php `BEFEHL_ARTEN`, der Weltrechner prüft alles (`bundOp`). Nachrichten
  `bundInfo`/`bundGeschenk` (server.php `WELTRECHNER_NACHRICHTEN`). Rally-/Hilfe-Märsche sind normale Sende-Märsche mit
  `rally`/`hilfe`, ein Rally-Angriff trägt `rally.an` (wer wie viel von wo).
- **Getestet (lokal, Weltrechner + 2 Spieler, 150 Mitspieler):** 10 Bündnisse der Mitspieler nach wenigen Minuten,
  Spieler gründet (30.000 Münzen weg), zweiter tritt bei, Anfrage an geschlossenes Bündnis (abgelehnt nach Macht/Nähe),
  Anführer-Wechsel beim Verlassen, Angriff auf Mitglied gesperrt, Signal kommt beim anderen an, Mitspieler schicken
  Hilfe und machen bei Rallys mit (bis 5 Basen pro Rally), Rally per Fenster gestartet + von 2. Basis mitgemacht →
  EIN Angriff mit allen Truppen, Sieg, Bericht; Überlebende anteilig heim; Kiste gekauft → Bündnis-Geschenk beim
  anderen Spieler im Abholfach und abgeholt (ohne Schummel-Warnung). Keine Fehler in der Konsole oder im Weltrechner.
- **Offen:** Die Bündnis-Daten (Signale, Rallys) sieht technisch jeder Spieler (wie die übrige Welt) – im Spiel gezeigt
  werden nur die eigenen (und Rallys gegen dich). Gebiet der Verbündeten wird nicht aus dem Nebel geholt.

## 21b. Nachschärfen 2.10. mittags (Alexander: „Bots nach 2 Std. schon Stufe 60, lila 5 Sterne“) – NICHT hochgeladen
- Live lief da noch der Stand von morgens (Gem-Bremse war noch nicht oben).
- **EP nur gegen Ebenbürtige:** `kampfEp(roh, lvl, gegner, eigene)` – höchstens ¼ Stufe pro Kampf UND mal (Gegner-Stärke /
  eigene Stärke), höchstens 1. Wer mit zehnfacher Übermacht angreift, bekommt ein Zehntel. Gilt für Spieler und Mitspieler.
- **Kisten:** Gold (Legendär) und Rot gibt es nicht mehr aus gekauften/freien Kisten (`RARITY_DROP_WEIGHTS = [60, 25, 11, 4, 0, 0]`),
  nur durch Zusammenlegen (3 → 1) oder als Hauptpreis (Kiste „mind. Legendär“, z. B. Platz 1 Tagesboss/Drache).
  Eine Kiste kostet 30 Gems (vorher 5, dann 15).
- **Zu schnelles Ausbreiten der Mitspieler** (600 Basen in 4 Std.): wird mit der Marsch-Grenze aus Paket D (Burg-Stufe) auch
  für Mitspieler gebremst.


## 23. Welt (Paket C) – größere Karte, neue Landschaften, Tag und Nacht, wandernde Händler (2.10., lokal getestet – NICHT hochgeladen)
**Achtung beim Hochladen: braucht eine NEUE WELT** (Saison-Neustart mit `werkzeuge/welt_neustart.php`, Abschnitt 16), weil
die Karte jetzt 17 × 17 Regionen hat und alle Basen-Nummern sich ändern. Schutz: Der Weltrechner (`start.js`) vergleicht
vor dem Start die Karte des Spiels (`GRID_N`) mit der Kennung der Welt in der Datenbank (neuer Welt-Schlüssel
**`openWaterKarte`** = `{ n: 17, inseln: 25024 }`; eine Welt ohne Kennung zählt als 15 × 15). Passt sie nicht → er startet
NICHT („Karte passt nicht zur Welt …“ im Log, zählt als Absturz → nach 5 Versuchen Wartung + Alarm), die Welt bleibt
unversehrt. Spieler sehen so lange „Verbindung wird wiederhergestellt …“ – getestet: alte 15er-Welt + neuer Code → keine
Fehler in der Konsole; nach `welt_neustart.php` neue Welt, alter Spieler bekommt neuen Startplatz, keine Fehler.
`WORLD_VERSION` (spiel.js) und `WELT_VERSION` (welt.js) sind jetzt beide '7' (müssen immer gleich sein, sonst würde jedes
Handy beim Laden seine Welt-Teile wegwerfen). Für Spieler löst das nichts weiter aus: welt.js setzt die Zahl beim Laden
selbst; nur ein Spiel ohne welt.js (gibt es nicht mehr) würde Karten-Teile eines alten Standes löschen.

**1 Größere Karte (17 × 17 statt 15 × 15, `GRID_N` bleibt eine Konstante).** Vorher gemessen (lokal, frische Welt, 150
Mitspieler, Handy 390 × 844):
| | 15 × 15 | 17 × 17 |
|---|---|---|
| Basen (Inseln) | 19.489 | 25.024 |
| Weltrechner-Speicher (5 Min., Spitze) | 220–252 MB (Heap ~90–116) | 230–271 MB (Heap ~100–130) |
| Puls pro Spieler (gepackt, Ø / größter) | 17 / 23 KB | 16 / 28 KB |
| Spielseite (gepackt) | 124 KB | 113–117 KB |
Die Grenzen (Speicher < 450 MB, Puls < 120 KB) halten mit Abstand: live lag die 15er-Welt bei ~290 MB und ~66 KB Puls;
die Karte selbst kostet nur ~+10–20 MB (feste Daten der Inseln), der Puls wächst mit dem Besitz, nicht mit der Kartengröße
(geschätzt live ≤ ~310 MB und ≤ ~85 KB). Startplätze bleiben auf den beiden äußersten Ringen (`GRID_HALF - 1`), Nachzügler
ab `GRID_HALF - 2`; Ring 7 und 8 sind leichte Randgebiete (Stärke ×1).
**Neue Landschaften** (`regionBiome`, reine Optik): **Eis** in der obersten Reihe (hellblau, Eisblöcke und Spalten),
**Vulkan/Asche** in zwei Gebieten nahe der Mitte (west um Region −4/0, ost um 4/1, je 5 Regionen: Asche-Boden, Felsbrocken,
ein Krater, Lava-Tümpel und glühende Lava-Adern zwischen den Basen), **Sumpf** verstreut in den feuchten Niederungen des
grünen Mittelstreifens (dunkles Oliv, Tümpel, Schilf, niedrige Bäume). Schnee, Wüste, Wiese, Stein wie bisher. Gezeichnet
wie die Wälder: einmal pro Region gebaut (`buildDeko`, erst wenn sie zum ersten Mal zu sehen ist) und in den Karten-Kacheln
gemalt (`paintDeko`) – kostet beim Zeichnen nichts extra. In der Stadt gilt Eis-Land als Schnee-Boden.

**3 Tag und Nacht** (`tagLicht`, `drawNacht` in spiel.js; nur Optik): Uhrzeit Berlin nach der **Server-Uhr** (welt.js merkt
sich `WELT.uhrVersatz` aus jedem Puls; geht ein Handy mehr als 1,5 Min. falsch, zählt der Server). Sonnenauf- und
-untergang je nach Jahreszeit (grob für Berlin, Sommer ~16,8 Std. Tag, Winter ~7,6). Morgen-/Abendrot ~1 Std. um
Sonnenauf-/-untergang, nachts dunkelblau abgedunkelt; dazu leuchten Fenster/Fackeln an allen Basen mit Besitzer, Tempeln
und Toren und die Lava im Vulkan; der Händler-Karren hat eine Laterne. Namensschilder bleiben hell (liegen darüber).
Billig: eine Fläche zum Abdunkeln, fertig gemalte Leucht-Bilder, Werte nur alle 20 s neu, kein eigenes Neuzeichnen;
**Akku sparen**: höchstens 160 Lichter, keine Fackeln, nur die großen Lava-Lichter aus der Ferne.
Gemessen (JS pro `drawMap`, Desktop / Prozessor 4× gedrosselt, Nebel weg): nah 0,3 → 0,45 ms, mittel (Zoom 0,02) 0,7 →
0,7–0,9 ms (4×: 3,5 → 4,3 ms); `drawNacht` selbst ~0,06–0,2 ms. Bildrate beim Schieben (ohne Grafikkarte) Tag 27–28 /
Nacht 26–32 Bilder/s – kein Unterschied. Nebenbei gefunden (NICHT von Paket C): ganz weit draußen (Zoom 0,006, Nebel
weg) kostet ein Bild ~20 ms – fast alles in `drawBaseSparks` (Friedensschild-Kuppeln mit Farbverlauf je Basis, in einer
frischen Welt haben viele Basen Schild). Vorschlag: als fertiges Bild malen.
Test-Hilfe: `window.__testStunde = 23` (in der Konsole) stellt die Uhr der Karte um.

**7 Wandernde Händler** (neue Datei `Game/haendler.js`, Welt-Schlüssel **`openWaterHaendler`** in speichern.js `WELT` und
welt.js `UMRECHNEN`): Alle 2–4 Std. steht für 30–60 Min. ein Händler-Karren an einem freien Platz einer bewohnten Region
(neue Welt: der erste nach 15–45 Min.). Ort, Zeit und Angebot bestimmt nur der Weltrechner. Auf der Karte: Karren mit
gestreifter Plane und goldenem Kreis (auch im Nebel sichtbar), unter dem HUD der Hinweis „Händler da · 41 m“ (antippen →
hinfliegen + Angebot). Karren antippen → Fenster „Wandernder Händler“ (`#hdPopup`): 3–4 von 5 Waren, jede **1× pro Spieler
und Besuch**, nur für **Münzen** (nie Gems, keine Gold-Kiste):
- 3 Helden-Splitter (2 Std.-Produktion) · Blaue Ausrüstungskiste, genau Selten (3 Std.) · Sammel-Beschleuniger: 2 Std.
  30 % schneller sammeln, wirkt sofort in der Welt (1 Std.) · Friedensschild 2 Std. in den Schild-Vorrat (2 Std.) ·
  Söldner: eine Stunde Truppen-Ausbildung (1,5 Std.).
- Preis = Faktor × eigene Stunden-Produktion an Münzen, mindestens 10.000–30.000, die Stunde zählt höchstens 2 Mio.
Kauf = Befehl **`haendler`** (`{ ware, id, preis }`, server.php `BEFEHL_ARTEN`). Der Weltrechner prüft: Händler da und
richtiger Besuch, Ware im Angebot, noch nicht gekauft, Preis (darf höchstens 25 % über dem angezeigten liegen), Münzen über
den Schummel-Schutz (`WELT.wache.kann`, wie beim Bündnis-Gründen; Münzen eben erst bekommen → bis zu 4 × 5 s nochmal
versuchen), höchstens 12 Käufe pro Minute. Bezahlt → „−Münzen“ beim Spieler, Ware als Nachricht **`haendlerWare`** ins
Abholfach (server.php `WELTRECHNER_NACHRICHTEN` + `haendler_ware_ok`: höchstens 10 Splitter, Kiste bis blau, Truppen, ein
2-Std.-Schild – nie Gems/Münzen). Söldner-Truppen meldet er dem Schummel-Schutz als Gutschrift. Abholfach kennt dafür
`kiste` (genau diese Seltenheit) und `schild` (Stunden). **Mitspieler kaufen auch** (gleiche Preise und Regeln, nur wer es
sich mit Reserve leisten kann, im Schnitt ~15 Käufe pro Besuch); „Zuletzt gekauft“ im Fenster.
**Handy-Nachricht** „Ein Händler ist da: <Name> (X … · Y …) – nur noch 40 Minuten.“ (push.js, Art `haendler`, in
`PUSH_ARTEN` und den Einstellungen abschaltbar). Test-Zeit: `var HD_TEST = null` in haendler.js (nur in einer lokalen Kopie
auf z. B. `Date.now() + 60000` setzen).
Weltrechner lädt haendler.js mit (start.js-Liste, wachhund.php Leserecht, hochladen.sh, tests/welt_test.js).
**Getestet** (Port 8785, DB `owtest_we`, Weltrechner + 2 Spieler, frische Welt): Händler erscheint, Hinweis + Karren,
Antippen öffnet das Fenster, Kauf Splitter/Kiste/Beschleuniger/Schild/Söldner → Münzen weg, Ware im Abholfach, abgeholt
(Splitter Hagen, Rüstung Selten, Schild im Vorrat, +18.000 Truppen, Sammeln ×1,3); gefälscht abgelehnt: zweiter Kauf
derselben Ware, Preis 1, falscher Besuch, Ware „gems“; der andere Spieler sieht den Kauf; Mitspieler kaufen; Push-Text
für beide Spieler. Keine Fehler in der Konsole oder im Weltrechner, keine Schummel-Warnungen.
**Zum Zusammenführen** (kleine Stellen außerhalb der Karte): `fieldTick` (Sammel-Beschleuniger `hdSammeln`), Abholfach
(`inboxAdd`/`inboxWhat`/`inboxClaim`, Quelle `haendler`), `renderMidBar` (Händler-Hinweis), `handleTap` (Karren),
`closeAllPopups`/`closeTopmostPanel`, Stadt-Boden (Eis → Schnee).

## 25. Vorschau-Datei zum Testen (2.10.)
- `php werkzeuge/vorschau_bauen.php <Ordner> [artifact] [test]` baut das Spiel als Datei OHNE Server (allein im Browser,
  die Welt rechnet das eigene Gerät, Speichern nur im Browser). `artifact` = für eine Claude-Vorschauseite,
  `test` = Test-Modus (`werkzeuge/vorschau_test.js`): kein Nebel, alles gespäht, du und alle Mitspieler habt fast
  unbegrenzt Münzen, Gems, Rohstoffe, Splitter und Truppen (alle 10 s aufgefüllt). NIE ins echte Spiel – die Datei liegt
  nicht in Game/ und wird nicht hochgeladen.
- Vorschau für Alexander: https://claude.ai/artifact/8pusjSdvm5Dj4Q9moYcbUD

## 26. Neue Ordnung (Alexander: „nichts sortiert, alles doppelt, Hauptstadt zweimal aufwerten“) – 2.10., NICHT hochgeladen
**Teil 1 – Hauptstadt nur EINE Stufe, Rohstoffe aus der Stadt:**
- Die Hauptstadt hat nur noch die **Burg-Stufe**. Auf der Karte steht sie automatisch auf Burg × 4 (Burg 1 = Stufe 1,
  Burg 13 = 51, Burg 25 = 100; `AUF.burgKarte`, `hauptstadtStufen` alle 3 s – für dich, alle Mitspieler und echte Spieler).
  An der Hauptstadt auf der Karte gibt es keinen „Aufwerten“-Knopf mehr, nur „Stadt“ (→ Burg). Die anderen Basen draußen
  wertest du weiter sofort mit Münzen auf (ohne Bauzeit). Ziehst du um, bekommt die alte Hauptstadt ihre alte Stufe
  zurück (Welt-Schlüssel `openWaterHauptVor`). Mitspieler werten ihre Hauptstadt draußen nicht mehr auf.
- **Neue Stadt-Gebäude vor der Mauer:** Holzfäller, Steinbruch, Eisenmine (je bis Stufe 25, Bauzeit + Bauarbeiter wie die
  anderen). Pro Stunde: 150 (die Burg allein) + 600 × 1,42^(Stufe−1) × Landschaft der Hauptstadt (0,6–1,0) × Ertrag
  (Forschung, Titel). Beispiel Holzfäller 5 auf Wiese: ~1.900 Holz/Std. Das Gebäude-Fenster zeigt „Jetzt … pro Stunde,
  nächste Stufe …“. Die alten Basis-Rohstoffe gibt es nicht mehr (nur noch Stadt + Felder sammeln). Mitspieler bauen sie auch.
- Anleitung angepasst (Schritt 4: Holzfäller bauen, Schritt 6: Belohnungen unter „Events“); in der Stadt erscheint sie nur
  beim Holzfäller-Schritt und nie über einem offenen Gebäude-Fenster.
- Getestet (Vorschau): Burg 13 → Hauptstadt Stufe 51, Holz/Stein/Eisen wachsen, Aufwerten-Knopf an der Hauptstadt weg,
  alle drei Gebäude im Bild, keine Fehler.

**Teil 2 – jedes Ding an genau EINEM Ort:**
- **Unten (Dock) 6 Knöpfe:** Stadt · Bündnis · Kampf · Events · Shop · Profil. Das Dock zeigt, welches Fenster offen ist.
- **Karte (rechts) nur noch Kartensachen:** Zoom +/−, Heimat, Wegmarke, Armee. Weg: Ton, Ereignisse, Bündnis, Zahnrad.
- **Stadt:** Burg (= Hauptstadt-Stufe), alle Gebäude, Holz/Stein/Eisen, Forschung (Akademie), Truppen-Stufe (Kaserne),
  Lazarett, Helden (Heldenhalle). Im Burg-Fenster gibt es keinen Schild und kein Aussehen mehr.
- **Events** (früher „Ziele“ + Ereignis-Knopf an der Karte, jetzt EIN Fenster): oben Täglich · Belohnung (mit Abholfach) ·
  Erfolge · Pass, unten Turnier · Invasion · Drache · Boss & Lager. Das Turnier mit der ganzen Rangliste steht NUR hier
  (aus der Rangliste und dem Thron-Shop entfernt, die alte „Übersicht“ auch). Ein „!“ zeigt, welches Ereignis gerade läuft.
- **Shop** (EIN Shop): Kisten (Ausrüstung + Helden) · Schilde (kaufen UND einschalten, nur hier) · Thron · Händler (der
  Reiter erscheint nur, solange ein wandernder Händler da ist; Karren antippen oder Hinweis öffnet ihn) · Markt (Handeln
  nur hier; das Markt-Gebäude in der Stadt hat einen Knopf dorthin). Das Gem-„+“ oben ist weg (Shop ist im Dock).
- **Profil:** Spieler (mit der EINEN Aussehen-Karte: Wappen, Rahmen, Titel, Skins, Ringe) · Ausrüstung · Skills ·
  Rangliste (Macht, Eroberungen, Titel, Thron-Punkte) · Einstellungen (Benachrichtigungen, Ton, Akku, Konto, Abmelden,
  Hilfe „wo finde ich was?“). Die Thron-Punkte-Bestenliste im Thron-Shop ist weg (steht in der Rangliste).
- **Hinweis-Leiste unter dem HUD:** nur noch EIN Hinweis, der dringendste (Invasion auf dich > Kopfgeld auf dich >
  Drache/Invasion läuft > bald > Turnier > Händler > …).
- Texte „unter Ziele“ heißen jetzt „unter Events“. Gelöscht: Fenster `settingsPopup`, `eventPopup`, `hdPopup`, Knöpfe
  `musicBtn`, `eventBtn`, `settingsBtn`, `hudShopBtn`, `lookGo`. Neu: `openShop(tab)`, `AUF.marktHtml`, `tourRangHtml`.
- Getestet (Vorschau, iPhone-Größe): alle 6 Dock-Knöpfe, alle 8 Events-Reiter mit Inhalt, Schild kaufen + einschalten im
  Shop, Markt verkaufen im Shop, Händler-Reiter erscheint mit Händler, Ton in den Einstellungen, Rangliste ohne Turnier,
  immer höchstens 1 Hinweis, Burg ohne Schild/Aussehen. Keine Fehler. Server- und Spiel-Tests grün.
- Danach 3B (Abschnitt 24) zusammengeführt und alles zusammen lokal mit Server + Weltrechner + Handy getestet: keine Fehler
  in Konsole und Weltrechner. Vorschau (Abschnitt 25) ist auf diesem Stand.


## 24. 3B – Konto beim Server (2.10., lokal getestet – NICHT hochgeladen, am besten mit Welt-Neustart)
Bis 3A rechnete das Handy Münzen, Gems, Stufe, Stadt, Ausrüstung, Helden – und die Welt glaubte seinem Profil (nur gekappt).
Jetzt führt der **Weltrechner für jeden echten Spieler ein Hauptbuch** (spiel.js, Abschnitt „HAUPTBUCH (3B)“ im Schummel-Schutz;
gespeichert in `botState[u<id>].hb`, Spieler bekommen es nie: server.php `NUR_WELTRECHNER` + `'hb'`). Das Handy rechnet weiter
wie bisher (flüssig), aber **was die Welt benutzt, kommt aus dem Hauptbuch**: welt.js `profilZuBot(p, alt, id)` ruft beim
Weltrechner `WELT.klemmen` (= `hbKlemmen`) – Stufe, Fähigkeiten, Ausrüstung, Helden, Burg/Gebäude (→ Marsch-Plätze), Forschung,
Truppen-Stufe (→ Kampfkraft) und Friedensschild sind nie höher als angenommen. Andere Spieler sehen dieselben Werte (Merker `hbK`:
ihr Handy nimmt die Welt-Werte statt des rohen Profils).

**Woher das Hauptbuch weiß, was einer haben kann:**
- *Sicher (zählt der Weltrechner selbst):* EP (→ Stufe, nur noch aus EP, das Profil hebt sie nicht mehr), Beute/Produktion/Gems/
  Rohstoffe aus den Nachrichten `delta`, Splitter, Preise (`evPreis`: Gems, Splitter, Kisten), Bündnis-Geschenke, Startschild,
  Admin-Geschenke (admin.php schickt jetzt auch Gems/Splitter/Kiste als Gutschrift).
- *Nur vom Handy:* Spielraum je Quelle und Tag (`HB_TAG`): Gems 25 (Tagesbelohnung) + 40 (Aufgaben) + 150/7 (Wochenkette),
  Karten-Funde 40/Std. nur online; Kisten 3 + 1 + 1 (VIP) + Wochenkette; Splitter 5 + 30/7. Erfolge nach und nach (30 Tage
  bzw. Stufe 100), Stufen-Gems mit der Stufe, Saison-Pass in einer halben Saison. Höchstens 14 Tage sammeln sich an.
- *Konten wie die Münzen (3A):* Gems (`gems` jetzt im Profil, nur der Weltrechner sieht sie) und Holz/Stein/Eisen. Zeigt das
  Profil weniger, ist es ausgegeben → **Topf** (`hb.gA`, `hb.cA`, `hb.rA`). Zeigt es mehr, als möglich, zählt das Mehr nicht
  (Auffälligkeit „Gems“/„Rohstoffe“). Rohstoffe: Spielraum nur noch 2.000/Std. + Markt-Tageslimit.

**Regeln für Neues im Profil (alles oder nichts, bezahlt aus Topf → Konto → Spielraum):**
- **Burg/Gebäude:** +1 Stufe nach der anderen; frühestens nach der Bauzeit (`cityTimeRoh`, VIP nur so hoch, wie er Tage dabei
  ist), schneller nur mit Gems (1 je Minute); Kosten wie im Spiel (`AUF.stadtKosten`); Burg-Grenze und „neues Gebäude ab Burg“.
- **Forschung:** eine nach der anderen (Zeit läuft ab der letzten), Akademie/Burg/Vorgänger wie im Spiel, Kosten `AUF.foKosten`.
- **Truppen-Stufe:** nur mit Burg + Forschung; jede neue Stufe einmal Eisen.
- **Ausrüstung:** Seltenheit/Stufe nur so hoch, wie er (statistisch) Kisten geöffnet haben kann: je Platz Ø + 3-fache Streuung +
  ein glückliches Lila, alle 4 Plätze zusammen dasselbe – Gold braucht so ~20 Kisten (im Schnitt 95), Rot ~150; sichere Kisten
  „mind. Episch/Legendär“ zählen extra. Fehlende Kisten zahlt erst der Spielraum, dann 30 Gems je Kiste. Sterne nur bis zur
  Schmiede-Stufe, jeder Stern kostet Gems wie im Spiel.
- **Helden:** Freischalten + Viertel-Sterne kosten Splitter; der „Splitter-Wert“ aller Helden ist nie höher als bekommen
  (sicher + Spielraum + Heldenkisten aus Gems). Fähigkeiten ≤ 1 Punkt je halbem Stern. Die **Wut** rechnet nur noch der
  Weltrechner (vorher kam sie aus dem Profil).
- **Fähigkeiten** (Skills): höchstens Stufe − 1 (+2) Punkte. **Friedensschild:** länger nur, wenn gekauft (Gems) oder geschenkt.
- **Beschleunigen** (Befehl `schneller`): kostet jetzt auch im Hauptbuch Gems – wer sie nicht haben kann, wird abgelehnt.
- Abgelehntes zählt nicht und wird alle 10 s neu geprüft (Gems/Münzen kommen evtl. einen Puls später); steht es nach **2 Min.**
  noch im Profil, gibt es EINE Auffälligkeit „Hauptbuch“ (Admin-Seite, neue Namen in `$AUFF_ART`).
- Alte Spielstände (ohne Hauptbuch) stürzen nicht ab: beim ersten Sehen wird das Hauptbuch **einmal aus dem Profil übernommen**
  (wie bisher gekappt). Ganz neue Spieler (und nach einem Welt-Neustart alle) beginnen bei Null – darum am besten mit neuer Saison.

**Nebel auf dem Server:** Der Weltrechner führt für jeden Spieler die aufgedeckten Nebel-Felder (`hb.nb`, wie
`openWaterFogCells`): um jede Basis, die er hat oder hatte (mit Forschung Kundschaft), und wo seine **Erkundungs-Späher** laufen
– dafür schickt das Handy jetzt den Befehl **`spaehen`** (server.php `BEFEHL_ARTEN`; geprüft: nächste eigene Basis, kein
geschlossenes Tor, bekanntes Gebiet, höchstens 120/Std.). Daraus die sichtbaren Inseln (wie `islandSeen`) als Bitfeld →
im Puls `sicht` → server.php speichert es in `ow_spieler.sicht` (+ `sicht_v`). Spieler bekommen **`openWaterIslandTroops` und
`openWaterNeutralTroopOverrides` nur für sichtbare + eigene Inseln** (`nebel_welt` – ganze Teile und Flicken; ändert sich die
Sicht, kommen diese Teile einmal ganz). Am Handy: fehlt die Zahl einer fremden Basis, liegt sie im Nebel („?“,
`truppenBekannt`). Die Rangliste nimmt fremde Truppen-Summen vom Weltrechner (`botState[id].tt`, jede Minute). Admin
„Nebel freischalten“ deckt jetzt auch auf dem Server alles auf. Ändert sich die Karte (andere Felder/Inseln, z. B. neue Saison mit
größerer Karte), passt `hb.nbSig` nicht mehr und der Server-Nebel fängt neu an (um die eigenen Basen sofort wieder offen).

**Nebenbei behoben:** Neue Spieler bekamen ihre Start-Rohstoffe doppelt (3.000 Holz kamen zusätzlich als Nachricht). Profile
ohne Rohstoffe/Gems (altes Handy) zählen jetzt als „unbekannt“ statt als 0.

**Gemessen (gleiche Welt, 2 Spieler, 90 s):** Puls vorher Ø 139,7 KB roh / 22 KB gepackt → nachher Ø 110,2 KB / 12,8 KB
(fremde Truppen fallen weg). Weltrechner 265–280 MB vorher wie nachher (Heap 105 → 120 MB). Hauptbuch je Spieler ~1,5–2,5 KB.
Server: Filtern eines 100-KB-Truppenteils ~1 ms.

**Getestet (Port 8786, DB `owtest_3b`, Weltrechner + bis 3 Spieler):**
- Ehrlich: Geschenk abholen, Tagesbelohnung, 20 und 300 Kisten + Zusammenlegen (2× Rot, Gold) + Verkaufen + Leveln, Akademie +
  Burg 1→2 mit Bauzeit, Burg 2→3 und Schmiede mit Gems, Forschung mit Gems, Mauer, Stern in der Schmiede, Heldenkiste + Helden
  aufwerten, Schild kaufen und einschalten, Angriff + Beschleunigen, Markt kaufen/verkaufen, Erkundungs-Späher → Welt = Handy,
  **keine Auffälligkeit**.
- Schummeln (Profil: Stufe 2000, 1 Mio. Gems, 1 Bio. Münzen, 1 Mrd. Rohstoffe, Gold-Ausrüstung Stufe 20 mit 5 Sternen, alle
  Gebäude/Burg 25, alle Forschung, T5, alle Helden 5 Sterne, 8-Tage-Schild; Befehle: 1 Mrd. Stufen-Truppen, Truppen ohne
  Quelle, Ausbau +49, Späher ins Unbekannte, 4 Angriffe bei 2 Marsch-Plätzen): in der Welt Stufe 1, Burg 2 (was die
  Start-Rohstoffe hergeben), T1, keine Forschung, keine Ausrüstung, Start-Helden, kein Schild, 2 von 4 Angriffen; ein anderer
  Spieler sieht dieselben Werte; im Paket nur Truppen der eigenen/sichtbaren Inseln. Nach 2 Min. alle Auffälligkeiten da.
- Weltrechner-Neustart: Hauptbuch und Werte unverändert, weiterspielen ohne Fehlalarm. Alter Stand ohne Hauptbuch: wird
  übernommen, kein Absturz. Admin-Seite zeigt die neuen Arten, Admin-„Nebel freischalten“ öffnet auch den Server-Nebel.
  Keine Fehler in Konsole, Weltrechner-Log oder PHP-Log. `php tests/server_test.php` (64, u. a. Nebel-Filter) und
  `node tests/welt_test.js` grün.

**Bewusst offen (3B ist ein Schiedsrichter, kein zweites Spiel):**
- Das Handy rechnet weiter selbst – der Weltrechner prüft Plausibilität, er kennt nicht jede Kiste/jeden Gegenstand einzeln.
  Ein Schummler bekommt höchstens, was ein ehrlicher Spieler mit allen Tages-Quellen (Spielraum) auch hätte, und Glück bei
  Kisten nur im Rahmen der Statistik. Bauen geht mit Gems schneller – auch mit Spielraum-Gems.
- Zwei Bauarbeiter werden nicht gezählt (jedes Gebäude hat seine eigene Bauzeit-Kette).
- Kleine Gem-Ausgaben ohne Welt-Wirkung prüft das Hauptbuch nicht einzeln (Zurückrufen, Mehrfachangriff, Verlegen, 2. Bauarbeiter,
  Aussehen) – sie senken nur sein Gem-Konto.
- Nebel: Truppen in Märschen, Armeen, Sammlern und Rallys anderer stehen weiter im Paket (gezeichnet wird im Nebel nichts);
  Insel-Stufen auch. Unterwegs zeigt ein Erkundungs-Späher die Zahlen erst, wenn der Weltrechner ihn sieht (~1–2 s später).
- Münzen-Spielraum wie 3A (pro Stunde etwas Gratis möglich). Weltrechner selbst bleibt die Vertrauensstelle.

## 27. Stadt innen neu gestaltet (Alexander: „innen Base sieht scheiße aus“) – 2.10., NICHT hochgeladen
Alles in spiel.js (Abschnitt „THE CITY, ISOMETRIC“), nur Aussehen – Gebäude, Stufen, Kosten und Regeln bleiben gleich.
- **Neue Anordnung:** 12 Bauplätze im Raster um den runden Burgplatz (4 × 4, die Mitte ist die Burg), Straßen wie ein „#“,
  vorn das Tor mit Hauptstraße und Laternen. Jeder Bauplatz ist gepflegter Rasen mit Randsteinen; an der Mauer ein Grünstreifen
  mit Bäumen und Blumenbeeten, am Burgplatz Brunnen, Statuen, Bäume.
- **Leere Bauplätze** sind keine gleichen Baustellen mehr: Grundmauern + das Gebäude ganz blass („so wird es aussehen“),
  darüber ein goldenes „+“ (hier bauen) oder ein Schloss (braucht eine höhere Burg-Stufe).
- **Landschaft draußen** je nach Gegend der Hauptstadt (Grün, Sand, Schnee/Eis, Sumpf, Vulkan): Bergkette hinten (Schnee-
  gipfel; im Sand Tafelberge), Wald links und hinten (Tannen, Laubbäume, im Sand Palmen), Fluss rechts, Felder vorn, Mühle,
  Bauernhof, Brunnen, Heuhaufen. Holzfäller im Wald, Steinbruch an den Bergen, Eisenmine am Felshügel.
- **Burg** neu: zwei Stufen Sockel, Ringmauer mit Ecktürmen, Halle und Kapelle, Bergfried, Torhaus mit Fallgatter – wird alle
  5 Burg-Stufen größer (goldene Dächer oben). **Dächer** aller Häuser mit Ziegel-Reihen. **Palisade** (Mauer Stufe 0) mit
  dicken, spitzen Stämmen und Holztürmen.
- **Namensschilder:** Stufe als Abzeichen links (Burg golden), Name rechts; ganz herausgezoomt nur noch die Stufe.
  Herauszoomen geht nur so weit, wie Land gemalt ist.
- Speicher: die Mauer-Bilder sind viel kleiner (nur noch so groß wie die Mauer), das Boden-Bild etwas kleiner.
- Getestet (Vorschau, iPhone-Größe): neue Stadt, ausgebaute Stadt, ganz weit, ganz nah, Grün/Sand/Schnee; Antippen von Burg,
  Gebäude und leerem Platz („Bauen“) klappt; Boden-Bild malt in ~50 ms; keine Fehler. Spiel- und Server-Tests grün.

## 28. Turnier um die Mitte wieder JEDES Wochenende + neues Wochen-Event Mo–Fr (Alexander 2.10.) – NICHT hochgeladen
- **Wochenend-Turnier (Sa 0:00 – So 23:59): immer „Kampf um die Mitte“** wie früher – Thron halten, Wächter-Tempel, Kämpfe in
  der Mitte; Bonus Thron-Punkte +50 %; Preise wie bisher (Platz 1: 1.000 Gems, 30 Splitter, Gold-Kiste, Titel + Ring).
  Die Mitte angreifen und halten geht wie immer jeden Tag (Thron-Punkte alle 3 Min., Kopfgeld, Titel).
- **Neu: Wochen-Event (Mo 0:00 – Fr 23:59)** mit den 4 anderen Themen, jede Woche ein anderes: Sammel-Rausch → Krieger-Woche →
  Boss-Jagd → Bauherr → … (Punkte und Bonus wie vorher am Wochenende; höchstens 30 Punkte auf einmal, im Schnitt 10/Min.).
  Preise (kleiner als das Turnier, die Wirtschaft bleibt langsam): Platz 1 200 Gems + 10 Splitter + Episch-Kiste,
  2.–3. 100 + 5 + Selten-Kiste, 4.–10. 40 + 2 + Ungewöhnlich-Kiste, alle anderen mit Punkten 10 Gems + 1 Splitter.
  Gleich für dich, echte Spieler (Preis kommt als Nachricht ins Abholfach) und Mitspieler.
- Wo: **Events → Turnier**, oben umschalten „Wochen-Event (Mo–Fr)“ / „Mitte (Sa+So)“ (offen ist, was gerade läuft); dazu Hinweis
  unter dem HUD (ganz unten in der Wichtigkeit). Im Abholfach Quelle „Wochen-Event“.
- Technik: Zustand in `openWaterEvents` → `evState.wo` (kein neuer Welt-Schlüssel, welt.js rechnet die Kennungen um),
  `woWin`/`woThema`/`woDeckel`/`woRoll`/`woPay` in spiel.js; der Weltrechner zahlt am Freitag um Mitternacht aus.
- Getestet: Wochenenden 3.10.–31.10. alle „Mitte“, Wochen wechseln die Themen, Punkte nur fürs laufende Thema (mit Deckel),
  Auszahlung ins Abholfach, Anzeige; mit Server + Weltrechner kommt das Wochen-Event beim Spieler an. Keine Fehler, Tests grün.
- Nachtrag (Alexander: „man sieht die Top 10 nicht“): In Events → Turnier steht die **Top 10 jetzt gleich unter dem Kopf**
  (wer wie viele Punkte hat, live; sonst das letzte Ergebnis), Regeln und Preise darunter – bei Wochen-Event und Mitte.

## 29. Turnier um die Mitte KOMPLETT RAUS (Alexander 2.10.) – NICHT hochgeladen
- Es gibt kein Wochenend-Turnier mehr (`tourWin` liefert immer „aus“: keine Turnier-Punkte, kein Hinweis, keine Ankündigung,
  kein Turniersieger, kein +50 % Thron-Punkte am Wochenende; Mitspieler verhalten sich am Wochenende wie unter der Woche).
- **Die Mitte selbst bleibt** wie immer: angreifen, halten, Thron-Punkte alle 3 Min., Kopfgeld, Titel.
- Das **Wochen-Event läuft Mo 0:00 – Fr 23:59** (Sammel-Rausch → Krieger-Woche → Boss-Jagd → Bauherr), Auszahlung
  Freitag um Mitternacht. **Das Wochenende ist frei, da passiert nichts** (Alexander: „Wochenende bleibt frei“; kurz war es
  Mo–So, das ist wieder zurück). Der Reiter in Events heißt „Wochen-Event“ (Top 10 oben). Unter „Nächste Wochen“ steht
  jetzt „Mo 5. – Fr 9.10.“ statt nur „Mo 5.10.“ (Alexander dachte, Events sind nur montags).
- **Vorschau (Test-Modus):** Drache kommt 5 s nach dem Laden (3 Std.), Barbaren-Invasion 1 Min. nach dem Laden (1 Std.) –
  damit man beides ansehen kann (`EV_TEST` in werkzeuge/vorschau_test.js, nur Vorschau, nie im echten Spiel).
- **Drache gibt nichts Legendäres mehr** (Alexander 2.10.): Platz 1 Kiste „mind. Episch“, Platz 2–10 „mind. Selten“
  (`DR_PREISE`). Aus Kisten kommt höchstens Episch – also aus dem Drachen nie Legendär.

## 31. Weltboss (Drachenturm / Piratenfestung) KOMPLETT RAUS (Alexander 2.10.) – NICHT hochgeladen
- Es erscheint kein Boss mehr alle 4–6 Std. auf einer neutralen Basis. Ein alter aus dem Speicher wird beim nächsten
  Puls gelöscht (`bossState` bleibt immer leer, `spawnBoss`/`BOSS_KINDS`/`nextBossAt` sind weg).
- **Bleibt:** der Kriegsherr (Wanderboss), der Tagesboss, der Drache in der Mitte, die Barbaren-Invasion.
- Boss-Jagd-Bonus heißt jetzt „Kriegsherr doppelt so oft“; Erfolge „Bezwinger“/„Bossjäger“ zählen den Kriegsherrn.
- Nebenbei: das Beute-Fenster nach dem Kriegsherrn zeigte „mind. Legendär“, obwohl es eine epische Kiste ist – behoben.

## 32. Nirgends mehr eine Legendär-Kiste als Preis (Alexander 2.10.) – NICHT hochgeladen
- Tagesboss Platz 1 bekommt jetzt eine Kiste „mind. Episch“ statt „mind. Legendär“ (`DBOSS_PRIZE`), Rest wie vorher.
- Auch der (abgeschaltete) Turnier-Preis steht auf Episch. Legendär und Mythisch gibt es nur noch durch Zusammenlegen (3 → 1).

## 33. Anleitung: nicht mehr über den Knöpfen, Text passt zum Fenster (Alexander 3.10.) – NICHT hochgeladen
- Ist ein Fenster offen (z. B. eine Basis), steht der Hinweis jetzt **direkt über dem Fenster** – „Angreifen“/„Aufwerten“
  bleiben frei (vorher lag er genau auf dem Knopf).
- Der Text richtet sich nach dem offenen Fenster (dritter Eintrag in `ANLEITUNG`):
  - Schritt 2: neutrale Basis offen → „Gut! Jetzt unten rechts auf „Angreifen“ tippen.“; andere Basis → „Das ist keine
    neutrale Basis. Schließe das Fenster (×) …“. Grundtext: „tippe eine Basis mit dem Schild „Neutral“ an“ (statt „graue“).
  - Schritt 3: eigene Basis offen → „Jetzt auf „Aufwerten“ tippen.“; Hauptstadt → „wächst über die Burg …“; noch keine
    eroberte Basis → „Warte, bis dein Angriff angekommen ist …“.

## 34. Gesamttest 3.10. (Alexander: „teste alles noch mal, Texte und ob alles klappt“) – NICHT hochgeladen
- **Vorschau (Handy-Größe):** alle 5 Dock-Fenster mit allen Reitern geöffnet, jeden Knopf darin einmal gedrückt,
  alle 16 Stadt-Gebäude geöffnet, Holzfäller gebaut, Angriff → Eroberung → Aufwerten, Feld sammeln, Kiste,
  Drache/Tagesboss/Lager/Invasion angegriffen bzw. angesehen, Anleitung. **Keine Fehler.**
- **Mit Server + Weltrechner (lokal):** Welt-Neustart genau wie später (Wartung → welt_neustart.php → Wartung aus),
  neuer Spieler, dieselben Klicks, dann Neuladen: Basis, Stufe 2, Holzfäller – alles noch da. Keine Fehler,
  keine Auffälligkeiten beim Schummel-Schutz.
- **Texte geprüft** (nach undefined/NaN/VIP/Turnier/Weltboss/Mo–So …). Korrigiert:
  - Abholfach leer: „Preise aus Turnier …“ → „Preise aus Wochen-Event, Invasion, Drache und Tagesboss …“
  - Hilfe + Events-Knopf: „Turnier“ → „Wochen-Event“
- **Behoben:** die Anleitung lag bei Drache/Tagesboss/Lager/Feld noch auf dem „Angreifen“-Knopf – jetzt über jedem
  Fenster (auch Karten-Fenster und Helden-Halle); ist darüber kein Platz, wird sie so lange ausgeblendet.

## 30. VIP KOMPLETT RAUS (Alexander 2.10.: „VIP find ich totaler Müll“) – NICHT hochgeladen
- Weg: VIP-Stufen, Spieltage zählen (`openWaterVip`), VIP-Tageskiste, „Neue VIP-Stufe“-Hinweis, VIP-Zeile im Profil,
  Bauzeit −2 %/Stufe (Stadt und Forschung bauen jetzt für alle gleich lang).
- Hauptbuch (3B): `hbVip` weg (Bauzeit ohne Abzug), Kisten-Spielraum pro Tag eine weniger (`HB_TAG.k` = 3 + 1 + Wochenkette).
- Alte VIP-Kisten, die noch im Abholfach liegen, kann man noch abholen (heißen jetzt „Tageskiste“).
- Was in Abschnitt 21, 22 und 24 über VIP steht, gilt nicht mehr.

## 35. Kompletter Code-Check + alter Code raus (Alexander 3.10.: „komplett Check, alter Code raus, prüfe den ganzen Code“) – NICHT hochgeladen
Alle Dateien wurden durchgesehen (Server/PHP + Weltrechner, Spiel-Module, spiel.js + spiel.php), ~600 Zeilen alter Code raus.
- **Raus:** das ganze Wochenend-Turnier (tourState, Preise, Turniersieger-Ring/-Titel, Rangliste, Karten-Hinweise, CSS,
  Welt-Schlüssel `openWaterTourney`/`openWaterTourMein`, +50 % Thron-Punkte am Wochenende, Wochenend-Verhalten der
  Mitspieler), der Weltboss (bossState, Overlay, `openWaterBoss(Next)`), VIP-Reste, Vorspulen (botsFastForward/botVorspulen),
  unbenutzte Funktionen, Exporte (AUF), CSS-Klassen, tote Zweige (alte Burg-Ansicht, ffSummary …). Konstanten des Wochen-Events
  heißen jetzt `WO_KILL_PER/MAX/MIN`, `WO_TOP`, Themen `EV_WOCHE`.
- **Behobene Fehler:** zweiter Held bei Drache/Invasion wurde ignoriert · Sieg-Ton in Berichten spielte nie · Mehrfach-Angriff
  prüfte den Weg falsch herum · Lazarett-Text endete bei Stufe 25 (geht bis 40) · Weltrechner sammelte Hinweise ohne Ende
  (afterSplash) · Event-Uhren ließen die Fenster jede Sekunde neu zeichnen · Kriegsherr zählte doppelt (Erfolge + Pass;
  die doppelten Erfolge „Wanderjäger/Fährtenleser“ sind raus) · Bündnis-Geschenke zählten den Tag in UTC · Bild-Speicher (baukunst)
  zählte doppelt · Händler-Kauf-Notweg war kaputt (raus).
- **Sicherheit/Server:** Münzen und Lazarett anderer echter Spieler gehen nicht mehr an alle (`muenzen_kuerzen`, `wounded` in
  NUR_WELTRECHNER) · Tabellen werden nur einmal nach jedem Hochladen geprüft (`ow_welt_info.tabellen_v`), nicht mehr bei jedem
  Puls · `sauber_json` war verdreht · Passwort-Länge überall in Zeichen · hochladen.sh bricht bei einem Upload-Fehler ab (Wartung
  bleibt an) · welt_neustart.php löscht auch den alten Nebel (`sicht`) und die Sicherungen der alten Welt.
- **Texte:** Abholfach, Hilfe, Events-Knopf (kein „Turnier“ mehr) · Schild-Händler „Shop → Schilde“ · Händler-Meldung ohne
  „seinem“ · Ladebildschirm-Tipp „alle je verdienten Thron-Punkte“ · Forschung Ertrag „Münzen aus allen Basen und Rohstoffe aus
  der Stadt“ · Titel „neu alle 3 Min.“ · „Herrscher der Meere“ überall · Pass „Kriegsherr besiegt“ · Push „Kriegsherr erschienen“.
- **Getestet:** alle Tests, großer Klick-Test in der Vorschau und mit Server + Weltrechner (Welt-Neustart, neuer Spieler,
  Neuladen) – keine Fehler, keine falschen Texte.
- **Bewusst gelassen:** welt_neustart.php hat keinen Admin-Login (liegt nur Sekunden mit Zufallsnamen in der Wartung auf dem
  Server); CSP mit 'unsafe-inline' (wegen window.__OW); einige alte Kommentare in baukunst.js.

## 36. Tiefen-Prüfung des ganzen Spiels (Alexander 3.10.: „extrem gründlich, lückenlos, systemübergreifend“) – NICHT hochgeladen
9 Prüfer (Login/Konto, Netzwerk/Speichern, Weltrechner, Schummel-Schutz, Kampf, Wirtschaft, Events/KI/Bündnisse, Oberfläche,
Zusammenspiel der Systeme) – rund 170 Funde, jeder am Code nachgeprüft, die echten behoben. Wichtigste Änderungen:

**Genau einmal (Befehle und Nachrichten)** – vorher konnten Befehle doppelt laufen oder verloren gehen und Belohnungen doppelt
ankommen oder verschwinden (verlorene Antwort, Neuladen, Weltrechner-Neustart):
- Befehle tragen eine Nummer vom Handy (`cid`, eindeutig je Spieler – eine Wiederholung wird nicht neu abgelegt). Der Server
  löscht sie nicht mehr beim Abholen: der Weltrechner quittiert die ausgeführten Nummern (`quittung`) erst zusammen mit der Welt,
  in der ihre Wirkung steckt → `fertig`. Nach einem Absturz kommen nicht quittierte wieder (und laufen dann richtig).
- Nachrichten an Spieler tragen eine Nummer vom Weltrechner (`mid`, eindeutig). Abgeholt sind sie erst, wenn der Spieler sie in
  seinem Spielstand verbucht hat (`openWaterEreignisFertig`, mit Münzen/Gems derselben Sicherung) → `abgeholt`.
- Sicherungen tragen eine laufende Nummer (`speicher_nr`): eine ältere überschreibt nie eine neuere.
- `profil_zeit` in Millisekunden (zwei Profile in derselben Sekunde gingen verloren).
- Serverfehler = 500 (wird wiederholt), 503 nur noch Wartung (vorher flog bei jedem Datenbank-Hänger jeder raus, und der
  Weltrechner beendete sich „geplant“).
- Tabellen werden nur geprüft, wenn sich `MysqlLager::TABELLEN_STAND` ändert (BEI JEDER TABELLEN-ÄNDERUNG HOCHZÄHLEN).
- Weltrechner: Produktion fängt Fehler ab (blieb sonst für immer stehen), kein zweiter Weltrechner bei frischem Herzschlag,
  keine Umleitungen (Schlüssel), deutsche Zeit (`TZ=Europe/Berlin`), Sicherungen in einem Stand, Zurückspielen sperrt den alten,
  Gewinne während eines laufenden Pulses gehen nicht mehr verloren, Nachrichten des ersten Pulses gehen nicht verloren.

**Schummel-Schutz:** gefälschte Verwundete (→ Gratis-Truppen) und gefälschte Thron-Punkte (→ Gratis-Truppen) zählen nicht mehr ·
Wege, Brücken und fremde Tore prüft jetzt auch der Weltrechner (Angriff, Senden, Sammeln, Lager, Invasion, Armeen) · Hauptstadt
verlegen kostet die 50 Gems auch im Hauptbuch und geht nicht in eine angegriffene Basis · Marsch-Gruppen nur vom selben Ort, 60 s
ab dem ersten Marsch · ein beim Angreifen gefallener Schild kommt nicht gratis zurück · Bauherr-Rabatt nur einmal, nie „aus der
Zukunft“ · keine Gem-Gutschrift für Offline-Tage · keine Bruchteil-Truppen · zurückkehrende Märsche nicht nochmal umkehren · kein
Titel an sich selbst · Funde höchstens 12 in 10 Min.

**Kämpfe/Events/KI:** Kisten vom Tagesboss und aus Barbaren-Lagern kommen bei echten Spielern an (gingen verloren) · Kriegsherr:
echte Spieler bekommen Preis und Bericht · KI nimmt zum Neustart keinem Spieler (und keinem mit Schild) eine Basis · keine
Straf-Titel als Lückenfüller für Spieler · auf dem Weltrechner keine Schein-Hauptstadt mehr (eine Basis war uneinnehmbar) · kein
Kampf mehr gegen eine inzwischen eigene/verbündete Basis.

**Wirtschaft:** Tagesaufgabe „Erobere …“, Thron-Minuten und Helden-Zünder zählen jetzt für echte Spieler · Händler-Waren sind im
Hauptbuch bezahlt · übersprungene Truppen-Stufen kosten auf dem Handy wie im Hauptbuch · Saison-Pass/Thron-Münzen auf einmal
sind erlaubt · Premium-Pass bringt nicht mehr Gems zurück als er kostet (Skin schon da: 150 statt 1000 Gems) · Schild höchstens
8 Tage am Stück · Erfolgs-Gems sofort gesichert.

**Login:** Bremsen zählen nur Fehlversuche (eine Schulklasse sperrt sich nicht mehr aus), IPv6 je /64, Namen ohne
Doppelgänger-Schrift und nie „Spieler 12“, Neuladen gebremst (30/Min.), „Hier weiterspielen“ nur von der eigenen Seite, neues
Passwort beendet Handy-Nachrichten an alte Geräte, Welt-Neustart nur per POST (`curl -d ja=NEUSTART …`).

**Oberfläche:** Doppel-Tipp kostet nie doppelt Gems (Skill-Reset, 2. Bauarbeiter, Beschleunigen) · „Verlegen“ läuft nach 20 s
ab · 3D-Verlust (iPhone im Hintergrund) schaltet auf die gezeichneten Bilder um · kleinerer Bild-Speicher · Anleitung-Uhr stoppt ·
Anmelde-Formular nur einmal absenden.

**Getestet:** alle Tests, Klick-Test Vorschau, Server + Weltrechner mit Welt-Neustart, dazu gezielt: Belohnung kommt an und sofort
neu laden → genau einmal; dieselbe Nachricht zweimal → einmal; derselbe Befehl zweimal → einmal. Kein falscher Alarm.

**Bekannt, bewusst (noch) nicht geändert:** Bündnis-Geschenk „große Kiste“ prüft den Kauf nicht (höchstens 3/Tag, kleine
Geschenke) · Hauptbuch zählt keine Bauarbeiter-Plätze · Stern-Gems beim Verkaufen · Tagesboss zahlt nichts, wenn er überlebt
(so gewollt?) · Gleichstand im Schaden: wer zuerst traf, ist vorn · Marschgrößen anderer sind in den Daten sichtbar (nur Truppen
in Basen sind im Nebel) · die Spielseite liegt auf derselben Adresse wie andere Seiten des Office-Servers (Cookie nur per Pfad
getrennt) · CSP mit 'unsafe-inline'.


## 37. Nachrichten, Befehle, Admin, Sicherungen: genau einmal – auch bei Absturz, Neustart und Zurückspielen (Alexander 3.10.) – NICHT hochgeladen
**Eine Nummern-Logik für alle** (Spieler, Admin, Weltrechner – keine zweite, keine Admin-Sonderlösung):
- Befehle haben eine Nummer (`cid`), Nachrichten eine (`mid`); der Server legt dieselbe Nummer nie zweimal ab (eindeutiger
  Schlüssel je Spieler). Eine Wiederholung behält ihre Nummer. Alte Einträge ohne Nummer gehen weiter (einmal, wie früher).
- **Admin:** jedes Formular bekommt beim Anzeigen eine Zufallsnummer. Geschenk = Nachricht `mid=<nr>` + Gutschrift-Befehl
  `cid=<nr>g<Spieler>` in EINER Transaktion; Bot-Geschenk `cid=<nr>b`; Nebel `mid/cid=<nr>(n)`. Doppelklick, Neuladen, nochmal
  absenden → nichts doppelt. Ein Formular ohne Nummer (alte Seite) wird abgelehnt.
- **Event-Preise** (Wochen-Event, Tagesboss, Invasion, Drache, Kriegsherr) bekommen eine FESTE Nummer aus Auszahlung + Spieler
  (`W.nachricht(uid, e, schluessel)`): zahlt der Weltrechner nach Neustart/Zurückspielen dieselbe Auszahlung nochmal, kommt sie
  beim Spieler trotzdem nur einmal an. Abgeholte Nachrichten bleiben dafür 3 Tage stehen (Sicherungen reichen 48 Std. zurück).
- **Reihenfolge Weltrechner:** Befehl ausführen → Welt + Nachrichten + Sicht + „Befehl erledigt“ in EINER Transaktion speichern
  (ganz oder gar nicht; ein Fehler = 500 = nichts gilt, alles kommt mit denselben Nummern nochmal) → erst dann ist der Befehl weg.
  Fehlt beim Speichern ein Welt-Teil (Flicken passte nicht), wird noch nicht quittiert, bis der Teil ganz gespeichert ist.
- **Reihenfolge Spieler:** Nachricht wirkt → Spielstand MIT der Liste „verbucht“ gespeichert → erst dann ist sie abgeholt.
  Sicherungen tragen eine laufende Nummer (eine ältere überschreibt nie eine neuere) und werden nie mehr aufgeteilt; jede enthält
  alles, was noch unterwegs ist. Spielstand + „verbucht“ in einer Transaktion. Unlesbare Nachrichten blockieren nichts.

**Weltrechner – immer genau einer ist zuständig:**
- Schreiben darf nur der Leiter (sein Zeichen). Übernehmen darf ein anderer nur, wenn die Leitung abgelaufen ist UND er den
  NEUESTEN Stand hat (`seit` = Version). Ein alter Weltrechner (nach Absturz, Neustart, Zurückspielen) bekommt 409 und beendet sich –
  nie überschreibt er eine neuere Welt. Kein zweiter Weltrechner als „Ersatz“ parallel.
- Wachhund: kurzer Hänger (< 60 s Herzschlag) → nichts tun. Hart beenden wird geprüft (bis 2 s); lässt er sich nicht beenden,
  startet KEIN zweiter. Nach dem Beenden steht das Ende im Herzschlag → Neustart sofort (vorher bis 60 s „herz frisch“). Ist der
  Prozess wirklich weg (Speicher, hart beendet), startet er gleich neu; nur wenn `ps` nichts sehen darf, wird gewartet.
- Handy-Benachrichtigungen: nach einem Neustart merkt sich der Weltrechner zuerst nur den Stand – keine doppelten.

**Sicherungen / Zurückspielen:**
- Nur ganze, lesbare Sicherungen (Welt-Teile als gültiges JSON, Karte + Truppen + Mitspieler dabei) werden angelegt oder
  zurückgespielt; eine kaputte/leere Welt verdrängt keine gute Sicherung. Jede Sicherung trägt ihre Welt-Version.
- Zurückspielen: Weltrechner wird erst sicher beendet (sonst nichts verändert) → der jetzige Stand wird selbst gesichert (lässt
  sich also auch zurückspielen) → alles in einer Transaktion → neue, höhere Version, Leitung frei → Weltrechner neu.
  Erledigte Befehle bleiben erledigt (laufen nie zweimal), offene warten weiter. Die Welt (mit Hauptbuch) geht zurück, die
  Spielstände der Spieler nicht – Preise mit fester Nummer kommen deshalb nicht doppelt.

**Aus der Abschluss-Prüfung behoben:** Schild, den die Welt fallen ließ, kostete im Hauptbuch Gems (Handy meldete ihn noch) ·
Hauptstadt verlegen in eine angegriffene Basis: das Handy lehnt jetzt selbst ab (vorher 50 Gems weg) · Truppen zu einer
laufenden Armee: Weg wird vom jetzigen Ort geprüft · Indizes für offene Befehle/Nachrichten.

**Getestet (lokal, `absturz_test.js`, `profil_abbruch.js`, Admin doppelt):** fremder Weltrechner bei laufendem → 409 · nach
Absturz alter Stand → 409 · Speicherfehler mitten im Puls → Welt, Quittung, Leitung unverändert, Wiederholung → alles genau
einmal · Sicherung + Zurückspielen → Vorab-Sicherung, höhere Version, alter Weltrechner 409, erledigte Befehle bleiben erledigt ·
kaputte Sicherung abgelehnt · gleiche Auszahlung nach Zurückspielen → einmal · Admin-Neustart sofort · Spieler: Gewinn kommt,
Absturz vor dem Speichern → nach Neustart genau einmal; Speichern 3× Serverfehler → einmal; sofort neu laden → einmal; zweites
Fenster → altes raus, neues hat den Gewinn · Admin-Geschenk 3× abgeschickt → 1 Nachricht, 1 Befehl, ausgeführt · alle
Unit-Tests, Klick-Tests Vorschau + Server ohne Fehler.

**Bekannt:** Spieler-Befehle, die über 10 Min. nicht ausgeführt wurden (Weltrechner so lange aus), verfallen absichtlich (die
Lage hat sich geändert); was das Handy dafür schon bezahlt hat (z. B. Hauptstadt verlegen), ist dann weg · nach dem
Zurückspielen fehlt der Welt, was seitdem passiert ist (so gewollt) – Gewinne, die Spieler seitdem schon verbucht haben, behalten
sie · neues Passwort beendet die Handy-Nachrichten auch auf dem eigenen Gerät bis zum nächsten Laden.

## 38. Die 10 offenen Punkte am Code geprüft (Alexander 3.10.) – NICHT hochgeladen
Erst geprüft, ob es wirklich ein Problem ist und ob es so gewollt ist – nur dann geändert.

**Geändert (echte Probleme):**
- **Weltrechner lange aus (9):** Befehle, die das Handy schon bezahlt hat (`ausbau`, `hauptstadt`, `schneller`, `truppen` –
  `BEFEHLE_BEZAHLT` / `BEZAHLT` in welt.js), verfallen nie mehr nach 10 Min. – der Weltrechner holt sie nach (Server: Spalte `art`;
  unerledigt bis 7 Tage, erledigt 3 Tage stehen). Angriffe/Märsche usw. verfallen wie bisher (die Lage hat sich geändert).
  Neu: **Ausgang am Handy** (`openWaterBefehlAus`): jeder Befehl steht in DERSELBEN Sicherung wie das Bezahlte, bis der Server
  ihn hat. Absturz/Akku leer/Neuladen vor dem Senden → nach dem Laden geht er mit derselben Nummer raus (nie doppelt; bezahlte
  bis 50 Min., andere 5 Min. – der Server kennt erledigte Nummern mind. 1 Std.).
- **Zurückspielen (10):** Welt und Spieler passen danach zusammen:
  - Bezahlte Befehle, deren Wirkung erst NACH der Sicherung gespeichert wurde (`fertig_v` > Version der Sicherung), laufen genau
    einmal nach. Alles andere bleibt erledigt.
  - Der Weltrechner gleicht das Hauptbuch EINMAL je Spieler an (`ow_welt_info.zurueck` → `__OW.zurueck`): Münzen, Verwundete,
    Gems, Rohstoffe, Stufe neu geeicht am nächsten Profil; Stadt, Forschung, Truppen-Stufe, Ausrüstung, Helden, Schild aus dem
    Profil (gekappt, nie weniger als vorher). Kein falscher Schummel-Alarm mehr nach dem Zurückspielen.
  - Preise mit fester Nummer kommen nicht doppelt; nicht abgeholte Nachrichten bleiben und kommen an.
- **Gemeinsame Adresse (7):** Cookie ist HttpOnly, SameSite=Lax, Pfad /Game/, Rahmen verboten – aber eine andere Seite auf
  derselben Adresse kann trotzdem mit dem Cookie des Besuchers Anfragen schicken und Antworten lesen (dieselbe Herkunft; Pfad und
  Herkunfts-Prüfung helfen da nicht). Darum: **Admin-Seite nur nach Passwort** (15 Min., nur diese Sitzung, „jetzt sperren“,
  5 Versuche/15 Min.). Gesperrt zeigt sie keine Daten und nimmt keine Aktion an.
- **CSP (8):** kein `'unsafe-inline'` mehr für Skripte: die zwei eigenen Inline-Skripte (`window.__OW`) bekommen eine Nonce,
  die drei `onsubmit=` sind jetzt kleine Skripte mit Nonce, dazu `script-src-attr 'none'`. Eingeschleuste `<script>`/`onclick=`
  liefen nicht mehr. (Styles behalten `'unsafe-inline'` – das Spiel setzt viele Styles direkt.)
- **Passwort/Benachrichtigungen:** neues Passwort beendet Push nur auf den ANDEREN Geräten (wie die Sitzungen); dieses Gerät
  schickt seine Adresse mit und behält sie (vorher war es bis zum Öffnen der Einstellungen stumm).
- **welt_neustart.php:** braucht jetzt keinen Login, ist aber nur 15 Min. nach dem Hochladen gültig, löscht sich danach und nach
  getaner Arbeit selbst (dazu wie bisher: nur POST, nur in der Wartung, nur wenn der Weltrechner steht). Vergessen = harmlos.

**Geprüft, so gelassen:**
- **Bündnis-Geschenk „große Kiste“ (1):** der Weltrechner prüft den Kauf NICHT – ein gefälschtes Handy kann den Befehl ohne Kauf
  schicken. Die Grenze hält aber: 3 je Geber und Tag, 5 je Empfänger und Tag, Zähler in der Welt, Befehle laufen nacheinander
  (kein paralleles Umgehen; Doppelklick = zwei echte Käufe). Ein Geschenk ist klein (5 % einer Stunden-Produktion, selten eine
  graue/grüne Kiste). Eine genaue Prüfung bräuchte eine Kisten-Buchung im Hauptbuch (sonst doppelte Abbuchung) → Vorschlag.
- **Bauarbeiter (2):** das Hauptbuch prüft jede Stufe mit Bauzeit + Kosten, aber je Gebäude einzeln – ein gefälschtes Handy
  könnte mehrere Gebäude gleichzeitig bauen (ehrlich: 1–2). Kosten und Bauzeit je Stufe bleiben Pflicht. Eine Prüfung der Plätze
  wäre ein Umbau mit Risiko für Fehlalarme bei ehrlichen Spielern (Offline-Bauten) → Vorschlag, nicht geändert.
- **Stern-Gems (3):** Menge/Preis stimmen (genau die bezahlten Gems zurück), keine negativen Werte, Doppel-Verkauf unmöglich
  (Teil ist danach weg). Lücke: Sterne auf einem NICHT angelegten Teil sieht das Hauptbuch nicht – wird es später (nach dem
  nächsten Profil) verkauft, meldet der Schutz „Gems springen“ (falscher Alarm, Konto beim Weltrechner zu niedrig) → Vorschlag.
- **Tagesboss (4):** „Fällt der Boss, gibt es für alle nach Rang …“ steht so im Spiel, pro Treffer gibt es Münzen – gewollt.
- **Gleicher Schaden (5):** überall dieselbe stabile Sortierung (wer zuerst traf, bleibt vorn), ausgezahlt nur vom Weltrechner
  mit fester Nummer – kein Ausnutzen, kein Widerspruch.
- **Marschgrößen (6):** Truppen fremder Angriffe/Armeen/Märsche stehen in den Daten (nur Basen-Truppen sind im Nebel). Laut Spiel
  sollen fremde Zahlen nur mit Wachturm sichtbar sein (ab 1 ungefähr, ab 10 genau) – mit einem gefälschten Handy sieht man sie
  also früher. Ändern = Server müsste Märsche je Spieler filtern → Frage an Alexander.

**Bleibt (Hosting):** andere Seiten/Skripte auf demselben Office-Server laufen unter demselben Benutzer – sie könnten
config.php lesen. Echte Trennung nur mit eigener Adresse/eigenem Konto.

**Getestet (lokal):** Admin gesperrt/falsches/richtiges Passwort/sperren · Admin-Geschenk 3× → einmal · CSP: Spiel, Login,
Admin ohne Fehler · Ausgang: Befehl erstellt, Puls blockiert, Absturz → nach Neustart genau einmal beim Server und ausgeführt ·
30 Min. alter bezahlter Befehl wird nachgeholt, alter Angriffs-Befehl verfällt · Zurückspielen: bezahlter Befehl danach läuft genau
einmal nach, davor nicht, Hauptbuch angeglichen, danach kein falscher Alarm · Push bleibt auf diesem Gerät · welt_neustart
abgelaufen → 404 und gelöscht · alle bisherigen Tests (Absturz, Spieler-Abbruch, genau einmal, Klick-Tests) wieder grün.

## 39. Nachprüfung der Punkte 1–6 + Hosting (Alexander 3.10.) – NICHT hochgeladen
**1. Bündnis-Kiste – war ein echter Exploit, behoben.** Ein gefälschtes Handy konnte den Befehl `bund kiste` ohne Kauf schicken →
Geschenke (Münzen, Truppen, selten eine Kiste) für alle Bündnis-Mitglieder, 3× am Tag. Parallel/doppelt/Neuladen/verlorene
Antwort waren dabei sicher (Befehle laufen nacheinander, Nummer, Zähler in der Welt, alles in einer Transaktion) – nur der
Kauf selbst wurde nicht geprüft. Jetzt: das Geschenk gibt es erst, wenn das Hauptbuch im Profil eine echte Gem-Ausgabe sieht
(mind. der halbe Preis – das Profil zeigt nur die Summe; z. B. ein gleichzeitiger Erfolg), höchstens 10 Min. vorher/nachher;
jede Ausgabe zählt für EIN Geschenk; ein Befehl ohne Kauf wartet und verfällt (`hb.kaufG`, `hb.kisteOffen`, `WELT.kisteGekauft`).

**2. Bauarbeiter – kein kostenloser oder doppelter Vorteil, nicht geändert.** Jede Stufe kostet im Hauptbuch ihre Münzen und
Rohstoffe und frühestens ihre Bauzeit (sonst Gems), je Gebäude nacheinander, gespeichert mit der Welt. Ein gefälschtes Handy
kann nur mehrere VERSCHIEDENE Gebäude gleichzeitig bauen (ehrlich 1–2) – voll bezahlt, nichts doppelt. Bleibt als bekannter Rest.

**3. Stern-Gems – echter Fehler, behoben.** Ablauf vorher: Stern auf ein Teil in der Truhe (Gems weg) → Hauptbuch sah ihn nicht
(nur angelegte Teile) → Verkauf (Gems zurück) → „Gems springen“ (falscher Alarm) und die Gems fehlten im Konto des Weltrechners
(später z. B. Schild abgelehnt). Jetzt schickt das Profil `stW` (Gems in allen Sternen); ein Kauf wird aus den ausgegebenen
Gems bezahlt und als Rücklage gemerkt, ein Verkauf gibt genau die zurück; Anlegen/Ablegen ändert nichts; nicht Bezahltes gibt
beim Verkauf nichts. Nach Neustart steht alles im Hauptbuch (Welt), nach Zurückspielen wird es angeglichen.

**4. Marschgrößen – Server filtert jetzt.** Vorher bekam jedes Handy alle Kolonnen mit Truppen, Held und Kampfwerten (die
Oberfläche zeigte sie nur nicht). Jetzt (`MARSCH_TEILE`, `marsch_teil`, `marsch_welt`): fremde Angriffe, Senden, Rückzüge,
Sammler und Lager-Märsche kommen mit 0 Truppen und ohne Held/Kampfwerte; Angriffe auf eigene Basen: Wachturm 1–9 gerundet
(2 Stellen), ab 10 genau mit Held und Truppen-Stufe – genau wie die Anzeige (`angreiferInfo`). Wachturm-Stufe aus dem Hauptbuch
(nicht vom Handy). Gilt beim Laden und bei jedem Puls; diese Teile gehen an Spieler immer ganz (keine Flicken). Der Weltrechner
bekommt alles ungefiltert. Bündnis „Truppen schicken“ erkennt Angriffe weiter (Stärke ist am Handy jetzt unbekannt).
Armeen im Feld und besetzte Felder zeigt das Spiel offen mit Zahl, wenn man sie sieht – unverändert (im Nebel stehen sie aber
noch in den Daten; dafür müsste der Weltrechner die Sicht je Armee ausrechnen).

**5. config.php / gemeinsames Hosting – Hosting-Risiko, nicht im Code lösbar.** Über das Web liefert config.php nichts (PHP
gibt ein Array zurück, keine Ausgabe). ABER: alle Seiten unter demselben Webspace (z. B. andere Ordner unter /html/, die über
den Office-Editor hochgeladen werden können – auch .php) laufen unter demselben System-Benutzer; ein fremdes PHP-Skript dort
könnte config.php lesen (DB-Zugang, Weltrechner-Schlüssel). Ob open_basedir das je Ordner trennt, lässt sich ohne Zugriff auf
den Server nicht prüfen. Echte Abhilfe nur beim Hosting: eigenes Konto/eigene (Sub-)Domain, oder der DB-Benutzer darf nur
diese Datenbank. Nichts am Spielcode geändert.

**Getestet (lokal, alles grün):** Unit-Tests · Marsch-Filter (Funktion: Wachturm 0/3/10, eigen/fremd, Flicken → ganz; im Handy
beim Laden und nach Pulsen keine fremden Zahlen) · Sterne mit neuem Spieler (Admin-Gems → Kiste → Stern in der Truhe → Verkauf:
Rücklage, kein Alarm) · Bündnis-Kiste (ohne Kauf wartet, echter Kauf gibt genau eins frei) · Absturz/Neustart/Zurückspielen
(`absturz_test`) · langer Ausfall + Nachholen (`ausfall_test`) · Ausgang (`ausgang_test`) · Speichern/Laden/Abbruch
(`profil_abbruch`, `genau_einmal`) · Login/Admin/CSP (`admin_csp`) · großer Klick-Test mit Server und Vorschau · keine
PHP-Warnungen, keine Fehler im Weltrechner-Log, keine falschen Schummel-Alarme. Nebenbei: der lokale Test-Webserver fiel nach
2 Std. aus (Zeitlimit) – der Weltrechner hat das ohne Schaden überstanden und lief danach normal weiter.

## 40. Unabhängiger Code-Durchlauf nach den Fixes (3.10.) – NICHT hochgeladen
Ein eigener Prüfer hat nur die Änderungen seit Abschnitt 36 gelesen und gezielt nach neuen Fehlern gesucht. Ergebnis und was
damit passiert ist:
- **Zurückspielen ging nicht, wenn die jetzige Welt kaputt ist** (Vorab-Sicherung scheiterte → Abbruch) – genau dann braucht man
  es. Jetzt: ohne Vorab-Sicherung weiter (wird geloggt).
- **Bezahlte Befehle konnten bei einem Stau (200 offene) verloren gehen:** der Server nahm sie stumm nicht an, das Handy löschte
  sie trotzdem aus dem Ausgang. Jetzt meldet der Server die angenommenen Nummern (`befehle_ok`); nur die gehen aus dem Ausgang,
  der Rest kommt nach 5 s nochmal. Bezahlte zählen nicht zum Stau-Limit.
- **Nachgeholte bezahlte Befehle wurden nach dem Zurückspielen nochmal berechnet** (Hauptbuch frisch geeicht → doppelt). Jetzt
  meldet der Weltrechner, welche bezahlten Befehle er ANGENOMMEN hat (`bezahlt_ok` → Spalte `ok`); nur die werden nachgeholt
  (`nach`), und zwar ohne nochmal zu zahlen (`_nach`; Ausbau, Hauptstadt, Beschleunigen – Truppen prüft er normal). `_id`/`_nach`
  setzt nur der Server (vom Handy werden Felder mit `_` entfernt).
- **Dabei gefunden (älter):** Ausbau und Truppen-Geschenke warten beim Weltrechner bis 60 s auf das Profil – sie galten aber sofort
  als erledigt; ein Absturz in der Zeit verlor sie. Jetzt quittiert er sie erst, wenn sie entschieden sind (`'wartet'`,
  `W.befehlWartet`); nach einem Absturz kommen sie wieder.
- Stern-Gems: die Übernahme beim ersten Mal war auf 1.500 Gems gedeckelt (mehr Sterne → wieder falscher Alarm) → jetzt 20.000.
- Angriff auf die eigene Basis: die Vorschau-Schlacht rechnete mit den (jetzt verborgenen) fremden Zahlen falsch → nur noch mit
  Wachturm-Zahlen, sonst ohne Vorschau (das Ergebnis kommt wie immer vom Weltrechner).
- Sicherung: höchstens ein Versuch pro Stunde (vorher bei unvollständigem Stand jede Minute die ganze Welt unter der Sperre).
- Weltrechner-Puls schreibt die Sicht vor den Nachrichten (gleiche Reihenfolge wie beim Speichern eines Spielers – keine
  gegenseitige Sperre).
- welt_neustart.php: Hinweis zur Datei-Zeit (Editor setzt „jetzt“).
**Bewusst so:** Abschieds-Sicherung über 60 KB (sehr selten; normal 2–5 KB) geht ohne keepalive – wird sie beim Schließen
abgebrochen, fehlen höchstens die letzten 3 s, nie etwas halb · Bündnis-Kiste zählt jede echte Gem-Ausgabe (mind. halber Preis)
– ohne echte Ausgabe gibt es nie ein Geschenk.
**Getestet:** neuer Test `warte_test` (wartender Befehl + Absturz → genau einmal; Stau → bezahlter angenommen, normaler bleibt
im Ausgang und kommt danach genau einmal) und alle bisherigen: Unit, `absturz_test`, `ausfall_test`, `ausgang_test`,
`profil_abbruch`, `genau_einmal`, `rest_test`, `admin_csp`, großer Klick-Test Server + Vorschau – alles grün, keine PHP-Warnungen,
keine Fehler im Weltrechner-Log, keine falschen Schummel-Alarme.

## 41. Mitspieler können im Bündnis jetzt alles, was Spieler können (Alexander 3.10.) – NICHT hochgeladen
Vorher: Mitspieler gründeten, traten bei, beantworteten Anfragen, riefen um Hilfe, schickten Truppen, machten Rallys und
Geschenke – aber sie verließen nie ein Bündnis, entfernten niemanden, gaben die Führung nie ab und öffneten/schlossen nie.
Jetzt (buendnis.js `bundMitspielerRunde`, mit denselben Befehlen wie ein Spieler – gleiche Prüfungen, gleiche Meldungen):
- **Wechseln:** ein Mitglied, dessen Hauptstadt inzwischen weit weg vom Bündnis liegt (umgezogen, Gebiet verloren), tritt aus und
  einem offenen Bündnis mit Platz in seiner Nähe bei – frühestens 12 Std. nach dem Beitritt (`a.dabei`), nie der Anführer.
- **Entfernen:** ein Mitspieler-Anführer entfernt Mitglieder, die seit einem Tag keine Basis mehr haben (`a.leer`) – auch echte
  Spieler (sie bekommen eine Nachricht, wie wenn ein Spieler-Anführer sie entfernt).
- **Führung abgeben:** ist der Anführer viel schwächer (unter ⅓) als der stärkste Mitspieler im Bündnis, übergibt er (selten).
- **Öffnen/Schließen:** fast voll (ab 16 von 20) → nur noch auf Anfrage; wieder Platz (höchstens 10) → offen.
Getestet in der Vorschau (`bund_bot_test`, `bund_amt_test`): Entfernen, Wechseln, Schließen, Amt übergeben – ohne Fehler.

## 42. Bündnis höchstens 5 Mitglieder (Alexander 3.10.: „5 maximal in einem Bündnis“) – NICHT hochgeladen
- `BUND.MAX` 20 → **5** (Spieler und Mitspieler zusammen). Gilt beim Beitreten, bei Anfragen und überall in der Anzeige („3 / 5“).
- Damit nicht die meisten Mitspieler allein bleiben: sie gründen jetzt etwa ein Bündnis pro 6 Mitspieler (vorher pro 12).
- Öffnen/Schließen der Mitspieler-Anführer angepasst: ab 4 von 5 nur noch auf Anfrage, bei höchstens 2 wieder offen.
- Bündnisse, die schon mehr als 5 Mitglieder haben, verlieren niemanden – es kommt nur keiner mehr dazu, bis sie unter 5 sind.

## 43. Verstärkung über die Botschaft (Alexander 3.10.) – NICHT hochgeladen
Vorher: Hilfe-Truppen nur, wenn gerade ein Angriff lief – und dann gehörten sie sofort dem anderen (nicht zurückholbar, im
Bericht nicht zu sehen). Jetzt (buendnis.js Abschnitt „Verstärkung“, Welt-Teil **`openWaterVerstaerkung`**):
- **Schicken:** Basis eines Bündnis-Mitglieds antippen → „Verstärkung“ (jederzeit, nicht nur bei Angriff). Geht nur, wenn er
  eine **Botschaft** hat (ab Burg-Stufe 5). Platz: Botschaft-Stufe × 10 % seiner eigenen Truppen (mind. Stufe × 20.000) für
  alle Verstärkungen bei ihm zusammen; was nicht passt, marschiert gleich heim.
- **Die Truppen bleiben deine.** In der Botschaft sieht er, wer ihn mit wie vielen Truppen verstärkt („Heimschicken“), und du,
  wo deine stehen („Zurückholen“). Nicht mehr im selben Bündnis / Basis verloren → sie marschieren heim.
- **Kampf:** die Verstärkung verteidigt mit (wie die Besatzung). Danach wird getrennt: **jeder verliert denselben Anteil**,
  Verwundete gehen ins **eigene** Lazarett. Fällt die Basis, fallen alle Verteidiger. Gilt für Angriffe, Rallys, die
  Barbaren-Invasion und Angriffe vom Handy (Vorschau).
- **Ein großer Kampfbericht:** Verteidiger = du + jeder Helfer (Truppen, Gefallene, Verwundete, Held/Ausrüstung/Fähigkeiten),
  dazu die Summe; Angreifer wie bisher. Die Helfer bekommen denselben Bericht („Verstärkung bei …“); der Angreifer sieht die
  Helfer auch.
- **Mitspieler** schicken Verstärkung, wenn ein Mitglied angegriffen wird und allein zu schwach ist (wie vorher die Hilfe), und
  holen sie heim, wenn dort 30 Min. kein Angriff mehr lief.
- **Server:** jeder Spieler bekommt nur seine eigenen Verstärkungen und die bei ihm (`marsch_welt`).
- **Verluste wie bei der Rally:** alle Truppen kämpfen zusammen (ein Kampf, eine Animation), jeder verliert nach seiner
  Truppenzahl – wer wenig schickt, verliert wenig (nie mehr, als er geschickt hat).
- **Fehler behoben (3.10.):** beim Ankommen wurde die Verstärkung nicht erkannt (`resolveSend` prüfte nur `rally`/`hilfe`,
  nicht `verst`) → sie lief gleich wieder heim. Jetzt bleibt sie stationiert.
- Getestet (Vorschau, `verst_kampf_test`): Ankunft → bleibt stationiert; gleich groß (10.000 + 10.000, 8.000 Verluste) → je
  4.000; ungleich (9.000 + 1.000) → 7.200 / 800; Helfer mit Lazarett (50 %) → 2.000 seiner 4.000 nur verwundet, in seinem
  Lazarett; Basis fällt → Verstärkung weg.
- Getestet (Server + Weltrechner, `verst_server3_test`): echter Knopf „Verstärkung“ → marschiert → kommt an (500, gehört dem
  Helfer) → Helfer sieht sie in der Botschaft → ein Spieler aus einem anderen Bündnis sieht sie nicht → zurückholen →
  marschiert heim. Keine Skript-Fehler, keine PHP-Warnungen, keine Weltrechner-Fehler.
- Dabei gesehen (gewollt, nichts geändert): eine nur eingetragene, nicht gebaute Botschaft lehnt das Hauptbuch ab; geschlossene
  Tore halten auch Verstärkung auf. Die alte Testwelt hat noch Bündnisse über 5 (vom alten Limit) – die neue Welt beim Upload nicht.
