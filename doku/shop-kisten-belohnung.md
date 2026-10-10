# Shop, Kisten, Belohnungen, Abholfach

Alles, was man kauft oder bekommt: Shop-Reiter, Ausrüstungs- und Heldenkisten, Belohnungs-Kacheln, Abholfach, Händler,
Markt, Gegenstände. Wichtigste Dateien: `Game/spiel/06g-shop-gegenstaende.js` (Reiter Kisten/Event/Tempo, Beschleuniger benutzen),
`02a-shop-stufen.js` (`CRATE_GEM_COST`), `05e-belohnung.js` (`gibBelohnung`, `beuteKachel`, `beuteRaster`, `beuteFenster`), `spielseite/05y-stil-kisten.php`, `06c-thron-mitte.js` (`throneAmount`),
`05b-profil-truhe-skills.js` (Truhe, Ausrüstung), `Game/haendler.js`, `aufbau.js` (`marktHtml`).

## Regeln
- BELOHNUNG = BILD + ZAHL (Alexander 8.10., immer behalten): jede Belohnung/jeder Preis/jede Beute als Bild-Kachel
  (`ui_kachel_*` je Seltenheit, KI-Symbol `bilder/beute_*.webp`, Menge unten rechts) – nie nur Text „+120.000 Münzen“.
  Gilt in Shop, Aufgaben, Erfolgen, Tagesbelohnung, Abholfach, Pass, Stufe, Kriegsherr, Event-Preisen,
  Kampfbericht (Rohstoffe). Bilder schneiden: `werkzeuge/beute_bilder_schneiden.py`.
- Jeder Kauf ab 500 Edelsteinen erst nach „Wirklich? N Edelsteine“ (zweiter Tipp nach > 450 ms, binnen 4 s,
  `gemsWirklich`, `gemsArmed`) – auch Beschleunigen, Forschung fertig, Premium-Pass, Schild 700, Teleport.
- Wörter: im Spiel „Edelsteine“ und „Fähigkeiten“ (nie „Gems“/„Skills“); Code-Namen bleiben. „Münzen“ statt „Gold“
  (außer „Goldmine“ und Seltenheit „Gold“).

## Gegenstände (gemeinsam für alle Events, 05e)
- Spielstand `openWaterGegenst`: `eventMuenzen`, `schluessel1`, `schluessel2`, `besch` {'1m','5m','15m','1h','3h','8h','24h'}.
  Gutschreiben nur über `gibBelohnung(art, menge, extra)` (Arten `eventMuenzen`, `schluessel1/2`, `besch` mit Dauer, `gems`, `coins`)
  → Kachel-Angabe. Kacheln: beute_eventmuenze, beute_schluessel(_episch), beute_beschleuniger_klein/mittel/gross (Dauer oben links).
- Preise in 05e: `SCHLUESSEL_PREIS` (100/500 Edelsteine, 200/1.000 Event-Münzen, Woche 10/3), `BESCH_PREIS` (Edelsteine, Event-Münzen, Limit).
- Beschleuniger kürzen Bauen und Forschen (Knopf im Gebäude-Fenster und im Labor → Fenster `beschPopup`, einzeln oder
  „Passend benutzen“); nicht Truppen. Heilen geht sofort mit Münzen – dort keiner.
- Hauptbuch (10d3 `hbGegenst`, Profil `gg`): Zuwachs nur aus Nachrichten (evPreis/bundGeschenk mit `em`, `s1`, `s2`,
  `besch` {Dauer: n} → `hbGegenstDazu`), Spielraum je Tag (`HB_TAG` em/s1/s2/bm) oder mit Edelsteinen gekauft; benutzte Schlüssel
  zählen als Kisten/Splitter, benutzte Beschleuniger kürzen die Bauzeit-Prüfung (`hbTempo`), ausgegebene Event-Münzen zählen halb als Edelsteine.

## Kisten (Reiter „Kisten“)
- Ausrüstung + Helden je normal und episch, „1ד/„10ד: mit Schlüssel (1/10), solange genug da, sonst 100/500 Edelsteine je Kiste
  (`CRATE_GEM_COST` 100, `HERO_CHESTS` hc1 100 / hcE 500). Ab 500 „Wirklich?“.
- Ausrüstungs-Kiste: `RARITY_DROP_WEIGHTS` (höchstens Episch); Epische Ausrüstung `RARITY_EPISCH` (Ungewöhnlich 40/Selten 45/Episch 15).
  Helden-Kiste: 6 Splitter auf 2–3 Helden (`heroChestTeile`); Epische Helden-Kiste: 10 Splitter, 15 % epischer Held, sonst seltener.
- Episch: spätestens beim 20. Mal sicher Lila (`openWaterKistenZ`, Anzeige „Lila sicher X/20“). Gruppe „Schlüssel“ kaufen 100/500.
- Legendär/Mythisch nur durch Zusammenlegen (3 → 1). Epische Helden-Kiste: Bündnis-Geschenk (siehe `buendnis.md`).
- Öffnen: Belohnungs-Fenster mit KI-Kiste (`kiste_*_zu/offen.webp`), wackelt, geht auf, Strahlen, Kacheln nacheinander;
  Tipp = Endbild, „OK“ schließt. Test `belohnung_test`.
- Aufgabe „Öffne 3 Kisten“ zählt jede Kiste (Shop, Helden, Abholfach, Pass, Belohnungen).

## Shop (ein Fenster, Schaufenster-Stil)
- Reiter: Kisten · Event (nur Event-Münzen: Schild 8/24 Std 600/1.400, Teleporter 1.000, Beschleuniger, Schlüssel; Woche-Limit,
  füllt Montag 0 Uhr Berlin auf, `openWaterEvShop`, `evWocheAb`; Hauptbuch `hbEvShop` prüft Limit je Ware + Woche) · Tempo (Beschleuniger für Edelsteine) · Schilde · Händler (nur solange einer da
  ist) · Markt. Kein Thron-Reiter mehr. Oben Edelsteine + Event-Münzen. Gruppen mit Zwischenüberschrift (`.sort-kopf`), 3 Spalten. Waren als Karten in Seltenheitsfarbe, Preis-Knopf unten (Gold = Edelsteine, Navy =
  Thron-Punkte, zu wenig = grau mit roter Zahl). Am Handy alle Kisten ohne Scrollen. CSS-Block in spielseite/04.
- Rucksack: Teleporter, Schilde u. a. Gegenstände (siehe `teleport-schild-rucksack.md`).
- Wandernder Händler (`haendler.js`, Welt-Teil `openWaterHaendler`): alle 2–4 Std. für 30–60 Min., 3–4 von 5 Waren
  (Splitter, blaue Kiste, Sammel-Beschleuniger, Schild 2 Std., Söldner), je 1× pro Spieler und Besuch, nur für Münzen
  (n Stunden eigener Ertrag). Befehl `haendler`, Ware als Nachricht `haendlerWare` ins Abholfach. Mitspieler kaufen auch.
- Markt: siehe `stadt-burg-gebaeude.md`.

## Abholfach (Events → Abholen)
- Preise, Geschenke, Event-Stufen, Händler-Waren landen hier und müssen abgeholt werden.
  Quellen u. a. „Geschenk“ (Admin), „Wochen-Event“, „haendler“. Admin-Truppen kommen beim Abholen in die Hauptstadt.
- Der rote Punkt am Events-Knopf öffnet zuerst „Abholen“, wenn dort etwas liegt.

## Tägliche Belohnung, Stufen-Belohnung
- Tagesbelohnung + Wochenkette (verpasster Tag = Tag 1); beim allerersten Start erst nach dem Tutorial.
- Stufen-Belohnung: siehe `wirtschaft-zahlen.md`; startet beim Weltrechner bei SEINER Stufe (nie der vom Handy).

## Offen (Merkliste)
- 11c Nr. 31: Namensschild-Skins als KI-Bilder (später).
- Auch Profil „Belohnung für Stufe N“ und die Tages-Woche (Events) zeigen Bild-Kacheln (`beuteRaster`).
