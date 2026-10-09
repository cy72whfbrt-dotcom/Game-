# Teleport, Friedensschild, Anfängerschutz, Rucksack

Wie man seine Hauptstadt versetzt, sich schützt und was im Rucksack liegt. Wichtigste Dateien:
`Game/spiel/08d2-stadt-teleport.js` (`tpPruefen`, `teleportOrt`, `TP_GEMS`, `TELEPORT_NUR_OFFEN`, Rucksack-Fenster),
`09d-karte-armeen-wegmarken.js` (`feldRingAuf` – Menü auf freiem Land), `06d-schild-produktion.js` (`SHIELD_PRICES`, Schild),
`bots/05-verteidigen-takt.js` (`botTeleportCapital`, `botTpOrt`), `10d5-welt-befehle.js` (Befehl `teleport`).

## Teleport (Alexander 7.10./8.10.)
- Tipp auf freies Land → runde Knöpfe: Teleportieren · Markierung (Wegmarke) · Truppen hierher (neue Armee an der Stelle).
- Teleportieren: die Hauptstadt-Basis selbst zieht an die Stelle (Truppen, Stufe, Stadt bleiben). Platz wie für eine Basis
  (nicht im Gebirge, nicht an Basen/Toren/Feldern/Lagern/Tempeln, nicht in der Thron-Mitte, nicht die eigene Stelle).
  Nur in Gebiete, die über Pässe erreichbar sind, deren Öffnungszeit vorbei ist (Tor-Besitzer egal; `TELEPORT_NUR_OFFEN`).
  Nicht, solange ein Marsch/Angriff an der Hauptstadt hängt.
- Kosten: 1 Teleporter aus dem Rucksack oder 500 Edelsteine (`TP_GEMS`), immer mit Bestätigung „Hierher teleportieren?“
  (`gemsWirklich`); keine Abklingzeit. Neue Spieler haben 1 Gratis-Teleporter im Rucksack (geht zuerst, Befehl `gratis`).
- Das alte „Hauptstadt verlegen in einen eigenen Turm“ (50 Edelsteine, Befehl `hauptstadt`) ist raus (8.10.). Der Knopf
  im Hauptstadt-Fenster heißt „Teleportieren“ und führt zur Auswahl auf der Karte.
- Weltrechner-Befehl `teleport` (Hauptbuch zieht Edelsteine/Teleporter ab, nur echte Spieler); Welt-Teil
  `openWaterInselOrt` (verlegte Basen – neue Saison: alle zurück). Mitspieler teleportieren genauso (siehe `mitspieler.md`).
- Effekt (`teleportFx`/`tpFxZeichnen`, 08d2, gezeichnet aus `drawBattleFx`): goldene Lichtsäule `bilder/karte_lichtsaeule.webp`
  (Bodenkreis auf dem neuen Platz; fehlt das Bild: Lichtband + `ui_strahlen.webp`), Staub/Funken am Boden, alte Stelle verblasst;
  `FX_MS` 2,6 s, Band „Hauptstadt – hierher teleportiert“ die ganze Zeit lesbar; `tpBandOrt` setzt es so, dass es kein Basisschild, nicht die Leiste
  und nicht die Anleitung berührt (erst unter der Basis, dann über der Säule, zuletzt vor der Säule). Kaum Bewegung (Akku).
- Tests `teleport_test` (mit Bilder-Ordner: Ablauf in 5 Bildern `teleport_fx_*`), `rucksack_test`.

## Rucksack (7.10.)
- Eigener Knopf in der Leiste. Raster aus Bild-Kacheln (Anzahl, Seltenheits-Rahmen), nur was man besitzt, Reiter Tempo
  (Beschleuniger) · Schilde · Schlüssel · Sonstiges (Teleporter, Event-Münzen, Splitter je Held) – `rkSachen`, `RK_TABS`.
  Antippen → unten die Zeile mit „Einsetzen“/„Benutzen“/„Zum Helden“…; Schild: die Zeit kommt zum laufenden Schild DAZU.
  Leerer Reiter → „Im Shop holen“. Keine Kaufen-Knöpfe im Rucksack.
- Shop → Schilde: nur kaufen (eingesetzt wird im Rucksack); Teleporter 500 Edelsteine mit „Wirklich?“.

## Friedensschild
- 2 / 8 / 24 Std. = 80 / 300 / 700 Edelsteine (`SHIELD_PRICES`, 700 mit „Wirklich?“), höchstens 8 Tage am Stück.
- Wer mit Schild angreift (auch Armee, Feld, Rally-Teilnahme), verliert ihn. Angriffe auf einen Schild prallen ab
  (keine Verluste, Truppen laufen heim). Schild-Prüfung mit Server-Uhr (`schildAlt`, ±60 s).
- Push „Schild läuft in der nächsten Stunde ab“ (abschaltbar).

## Anfängerschutz (Alexander 7.10., Variante B)
- 48 Std. unangreifbar UND nicht ausspähbar (Spieler, Mitspieler, Weltrechner: `neulingAktiv`), für neue Spieler,
  Mitspieler und alle nach jedem Saison-Reset.
- Endet, sobald EINES eintritt: 48 Std. vorbei, 100.000 Truppen (Gesamttruppen wie im HUD, `whoTroops`) oder man greift
  selbst einen echten Spieler an (auch Armee, Feld, Rally – `botNeulingWeg`). Mitspieler-, Lager-, Feld-Angriffe beenden ihn nicht.
- Hinweis „Anfängerschutz – noch … (oder bis 100.000 Truppen)“ (`neulingBlockText`) bei Spähen/Angreifen, im Schild-Fenster,
  in der Burg und im Profil. Mitspieler: `botNeulingBis`. Weltrechner-Wert `neuBis` (Profil kann ihn nur kürzer machen).
- Neue Spieler werden bei Invasionen nur mit halb so starken Armeen angegriffen. Tests `neuling_test`, `neuling_vorschau_test`.
