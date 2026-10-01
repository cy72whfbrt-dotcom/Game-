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
  server.php           alles auf dem Server: Datenbank, Login, Laden, Speichern, Welt, Sicherheit
  admin.php            nur für Admins (alexander): Wartung an/aus, Geschenke verschicken, Spielerliste
  app/                 Open Water als App auf dem Startbildschirm:
    index.html         Installier-Seite (Android: Knopf „Zum Startbildschirm hinzufügen“, iPhone: Anleitung)
    manifest.webmanifest  App-Datei (Name, Logo, startet ohne Browser-Leiste)
    logo.svg           das App-Logo (Krone über Burg auf einer Insel im Meer)
    icon-192.png, icon-512.png, apple-touch-icon.png   das Logo als Bild (aus logo.svg gerendert)
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
- Alexander sollte seine Passwörter ändern (standen am 1.10. im Chat). Neues DB-Passwort → Variable ändern → `./hochladen.sh`.

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
