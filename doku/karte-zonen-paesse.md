# Karte, Zonen, Pässe, Nebel

Die Weltkarte ist EINE große Landkarte wie das RoK-Königreich: Gebiete in Zonen, dazwischen Gebirgsketten, nur Pässe
(Tore) führen durch. Wichtigste Dateien: `Game/spiel/01a2-karte-zonen.js` (Daten `KARTE_ZONEN`, erzeugt von
`werkzeuge/kartentest/karte_erzeugen.js` – nie von Hand ändern), `01b-weltkarte.js` (Pässe, Wege `passOpensAt`,
`thronOffenAb`, `landmassesConnected`), `03a-karte-hintergrund.js` / `03b` / `03c` (Zeichnen), `06e-karte-nebel-paesse.js`.

## Aufbau (Alexander 7.10., entschieden)
- Zone 1 außen (10 Gebiete, Start), Zone 2 (8), Zone 3 (6), Zone 4 (4, je ein Tempel/Wächter-Tempel), in der Mitte der
  Thron (Mega-Tempel). Zusammen 29 Gebiete. Vorlage: `<scratchpad>/vorbilder/13_rok_zonen_vorlage.png`.
- Kein Wasser (kein Meer, keine Flüsse/Seen). Zwischen Gebieten hohe Felsketten (`grenzLinie`, `karteObjekte`) – man läuft
  NUR über Pässe (frühere Brücken-Tore). Gebiete/Tore/Maut/Öffnungszeiten-Logik wie vorher.
- Boden nur nach Ring (`lm.boden`: außen grün → Mitte karg/Sand, weich überblendet `bodenMasken`); `lm.bio` nur noch für
  Rohstoffe/Felder/Stadtbild (reine Optik). Bergstöcke in Gebieten (`01f-felsen.js`) sind raus (7.10.).
- Grafik = KI-Bilder `Game/bilder/karte_*.webp` (Boden nahtlos, Ketten, Tore), geladen beim ersten Zeichnen (Weltrechner nie).
  Basen sind überall das KI-Bild `basis_01…15` (`drawBasisBild`), Thron/Tempel/Pass-Tore ihr Bild; solange ein Bild lädt nur
  ein Schatten (`drawPlatzhalter`). Die 3D-Burg (three.js, baukunst.js) ist seit 8.10. ganz raus.
- Weit draußen (< 0,0025): Farbflächen, Gebirgs-Bänder, Tore als Punkte (gold offen, rot zu), Mitte immer sichtbar, eigenes
  Wappen an der Hauptstadt (`drawHeimWappen`); Nebel weit = dunkle Fläche #1a2433 mit Landschaftsfarben (`nebelWeit`).

## Pässe und Öffnungszeiten
- Jeder Pass hat eine Stufe 1–5 (`KARTE_ZONEN.paesse[].stufe`); er öffnet an Tag = Stufe ab Welt-Start
  (`KARTE_ZONEN.oeffnen`, `openWaterWorldStart` – setzt `saisonWelt` bei jedem Reset neu). Zone 1 untereinander ab Tag 1,
  weiter nach innen Tag für Tag. Bis dahin für alle zu (Spieler und Mitspieler).
- Der Thron zählt erst ab Tag 7 (`KARTE_ZONEN.thron.tag`, `thronOffenAb`) – vorher greift ihn niemand an (auch Armeen, 09d).
- Ein Pass gehört nach Eroberung dem Eroberer: offen mit Maut oder zu. Echte Spieler erobern → offen mit normaler Maut.
  Tore von Bündnis-Mitgliedern sind für alle Mitglieder frei. Maut: `mautJeTruppe` (100–2.000 Münzen je Truppe,
  `MAUT_MIN` 100, `MAUT_MAX` 560.000 je Marsch).
- Wege: kürzester Weg über die Gebiete (Dijkstra, `marschStrecke` 02b, `marchPath` 03c). Ein fremdes Tor dazwischen = kein
  Weg (Handy prüft vorher mit derselben Regel wie der Weltrechner, Meldung „Kein Weg nach … – ein fremdes Tor …“).
  Geschlossene fremde Tore lassen auch keine Späher durch (`spaeherWeg`).
- Tests: `karte_rok_test` (jedes Tor, Märsche kreuzen die Kette nur am Tor), `zonen_marsch_test`, `kartentest_zonen_test`,
  `pass_test`.

## Basen, Startplätze, Stufen
- Neutrale Basen fest (nicht ÷ Wirtschaft): außen 70–1.000 Truppen (+10–300 Verteidigung), innen stärker
  (`RING_TRUPPEN`, `TIER_STATS` 01b, Tore 01c). Zahlen-Tabelle: `wirtschaft-zahlen.md`.
- Startplätze nur in Zone 1 (`KARTE_ZONEN.startplaetze`, je Zone-1-Gebiet gleich viele); `freierStartplatz` führt der
  Weltrechner beim Befehl `beitreten` aus (Rand voll → freie Basis, nie Mitte; Karte voll → Randbasis vom größten
  Mitspieler-Reich + 1 Std. Schild).
- Die Hauptstadt zeigt auf der Karte ihre Burg-Stufe 1–25 (`anzeigeStufe`); intern rechnet sie Burg × 4.
  Andere Basen bis Stufe 100, sofort mit Münzen aufwertbar (keine Bauzeit).
- Rohstoff-Felder (Holz/Stein/Eisen/Gold/Edelstein) aus `KARTE_ZONEN.felder`, Stufe steigt nach innen.

## Namensschilder an den Basen (8.10.)
- Unter jeder Basis mit Besitzer ein Namensschild (Wappen, Stufe, Truppen; fremde „?“ bis gespäht), ab mittlerem Zoom, statt
  Ring und Fahne; der angelegte Saison-Rahmen erscheint am Schild und im HUD-Wappen. Freie Basen ohne Schild, nur kleine
  Stufen-Zahl (Alexander 8.10.). Verdeckte Schilde fallen weg. Code `bannerModel`/`TIER` (03b), `paintPlate`/`layoutBanners`
  (03c). Tests `karte_fahnen_test`, `merkliste_ui_test`.
- Basis höchstens ein Drittel der Bildschirmbreite; mittlerer Zoom: Basen mit Besitzer mind. 22 px. Karte startet auf „mittel“.
- Basis-Fenster und Berichte nennen Basen beim Namen (`ortName`, „Neutrale Basis“, „Basis von X“) statt „Turm #N“.
- `WORLD_VERSION` 9 verwirft alte Kartenteile (neue Zonen-Karte).

## Nebel
- Jeder Spieler sieht nur um eigene (auch frühere) Basen und wo seine Späher waren; Nebel liegt auch auf dem Server
  (`hb.nb`, Puls `sicht` → `ow_spieler.sicht`). Fremde Truppen/Inseln nur für sichtbare Inseln (`nebel_welt`).
- Im Nebel wird nichts Fremdes gezeichnet und nichts lässt sich antippen/angreifen („liegt im Nebel – schick zuerst
  einen Späher“). Ausnahme: Tagesboss, Drache, Kriegsherr (für alle angekündigt, Platz einmal am Tag aufgedeckt).
- Mitspieler kennen nur Gebiete mit eigenen (auch früheren) Basen und deren Nachbarn (`botKennt`, gespeichert `kennt`).
- Admin „Nebel freischalten“ deckt für einen/alle Spieler alles auf (auch auf dem Server).

## Tag und Nacht
- Nur Optik (`tagLicht`, `drawNacht`): Berliner Zeit nach Server-Uhr (`WELT.uhrVersatz`), Sonnenauf-/-untergang nach
  Jahreszeit, nachts Fenster/Fackeln. Akku sparen: weniger Lichter. Test-Hilfe `window.__testStunde = 23`.

## Wichtige Schlüssel (nie umbenennen)
`openWater…`-Speicherschlüssel, `WORLD_VERSION` (spiel.js) = `WELT_VERSION` (welt.js), Kartenerzeugung – sonst sind
Spielstände weg. `openWaterKarte` (Kennung der Karte): passt sie nicht zum Code, startet der Weltrechner nicht.
