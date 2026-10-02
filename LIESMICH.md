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
  - Jede Basis macht nebenbei 2 je Takt × 1,15^(Stufe−1) (= ⅕ der Münzen) × Landschaft: Wiese Holz 1 / Stein 0,5 /
    Eisen 0,25 · Wüste 0,3 / 1 / 0,5 · Schnee 0,45 / 0,6 / 1 – dazu je Region eine feste Laune 0,8–1,2, innere Regionen ×1,3.
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
  Farbe + Wappen-Zeichen, offen oder „nur auf Anfrage“. Höchstens 20 Mitglieder. Anführer + Mitglieder. Gründen kostet
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
