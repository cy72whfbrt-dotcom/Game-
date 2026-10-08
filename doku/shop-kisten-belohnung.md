# Shop, Kisten, Belohnungen, Abholfach

Alles, was man kauft oder bekommt: Shop-Reiter, Ausrüstungs- und Heldenkisten, Belohnungs-Kacheln, Abholfach, Händler,
Thron-Shop, Markt. Wichtigste Dateien: `Game/spiel/02a-shop-stufen.js` (`CRATE_GEM_COST`, `openCrate`), `05e-belohnung.js`
(`beuteKachel`, `beuteRaster`, `beuteFenster`), `spielseite/05y-stil-kisten.php`, `06c-thron-mitte.js` (`throneAmount`),
`05b-profil-truhe-skills.js` (Truhe, Ausrüstung), `Game/haendler.js`, `aufbau.js` (`marktHtml`).

## Regeln
- BELOHNUNG = BILD + ZAHL (Alexander 8.10., immer behalten): jede Belohnung/jeder Preis/jede Beute als Bild-Kachel
  (`ui_kachel_*` je Seltenheit, KI-Symbol `bilder/beute_*.webp`, Menge unten rechts) – nie nur Text „+120.000 Münzen“.
  Gilt in Shop, Aufgaben, Erfolgen, Tagesbelohnung, Abholfach, Pass, Stufe, Kriegsherr, Event-Preisen, Thron-Shop,
  Kampfbericht (Rohstoffe). Bilder schneiden: `werkzeuge/beute_bilder_schneiden.py`.
- Jeder Kauf ab 500 Edelsteinen erst nach „Wirklich? N Edelsteine“ (zweiter Tipp nach > 450 ms, binnen 4 s,
  `gemsWirklich`, `gemsArmed`) – auch Beschleunigen, Forschung fertig, Premium-Pass, Schild 700, Teleport.
- Wörter: im Spiel „Edelsteine“ und „Fähigkeiten“ (nie „Gems“/„Skills“); Code-Namen bleiben. „Münzen“ statt „Gold“
  (außer „Goldmine“ und Seltenheit „Gold“).

## Kisten
- Ausrüstungskiste 150 Edelsteine (`CRATE_GEM_COST`). Aus gekauften/freien Kisten höchstens Episch
  (`RARITY_DROP_WEIGHTS`); Legendär/Mythisch nur durch Zusammenlegen (3 → 1). Nirgends eine Legendär-Kiste als Preis.
- Heldenkisten 150 / 500 / 1.200 Edelsteine (`HERO_CHESTS`), die ganze Karte kauft. Heldenkiste (hc1, `teile`): 6 Splitter auf
  2–3 verschiedene Helden (`heroChestTeile`, gewöhnlichere öfter, 5 Sterne fallen raus), im Fenster je Held eine Kachel.
- Shop-Knöpfe „1ד und „10ד (weniger Edelsteine: „N×“ mit dem Rest; ruft nur `openCrate`/`heroChestOpen` N-mal);
  Große/Epische Kiste einzeln (Bündnis-Geschenk ab 500 Edelsteinen, siehe `buendnis.md`).
- Öffnen: Belohnungs-Fenster mit KI-Kiste (`kiste_*_zu/offen.webp`), wackelt, geht auf, Strahlen, Kacheln nacheinander;
  Tipp = Endbild, „OK“ schließt. Test `belohnung_test`.
- Aufgabe „Öffne 3 Kisten“ zählt jede Kiste (Shop, Helden, Abholfach, Pass, Thron-Shop, Belohnungen).

## Shop (ein Fenster, Schaufenster-Stil)
- Reiter: Kisten (Ausrüstung + Helden) · Schilde (kaufen und einschalten nur hier) · Thron · Händler (nur solange einer da
  ist) · Markt (Handeln nur hier). Waren als Karten in Seltenheitsfarbe, Preis-Knopf unten (Gold = Edelsteine, Navy =
  Thron-Punkte, zu wenig = grau mit roter Zahl). Am Handy alle Kisten ohne Scrollen. CSS-Block in spielseite/04.
- Rucksack: Teleporter, Schilde u. a. Gegenstände (siehe `teleport-schild-rucksack.md`).
- Thron-Shop (Thron-Punkte): Münzen/Truppen = 2 Std. eigener Ertrag (`THRONE_STUNDEN`), Kisten, keine Edelsteine, kein
  Rahmen mehr. Hauptbuch rechnet je Kauf ebenso (`muenzGutscheine`, `truppenPruefen` „thron“).
- Wandernder Händler (`haendler.js`, Welt-Teil `openWaterHaendler`): alle 2–4 Std. für 30–60 Min., 3–4 von 5 Waren
  (Splitter, blaue Kiste, Sammel-Beschleuniger, Schild 2 Std., Söldner), je 1× pro Spieler und Besuch, nur für Münzen
  (n Stunden eigener Ertrag). Befehl `haendler`, Ware als Nachricht `haendlerWare` ins Abholfach. Mitspieler kaufen auch.
- Markt: siehe `stadt-burg-gebaeude.md`.

## Abholfach (Events → Abholen)
- Preise, Geschenke, Event-Stufen, Händler-Waren, umgetauschte Thron-Punkte landen hier und müssen abgeholt werden.
  Quellen u. a. „Geschenk“ (Admin), „Wochen-Event“, „haendler“. Admin-Truppen kommen beim Abholen in die Hauptstadt.
- Der rote Punkt am Events-Knopf öffnet zuerst „Abholen“, wenn dort etwas liegt.

## Tägliche Belohnung, Stufen-Belohnung
- Tagesbelohnung + Wochenkette (verpasster Tag = Tag 1); beim allerersten Start erst nach der Anleitung.
- Stufen-Belohnung: siehe `wirtschaft-zahlen.md`; startet beim Weltrechner bei SEINER Stufe (nie der vom Handy).

## Offen (Merkliste)
- 11c Nr. 31: Namensschild-Skins als KI-Bilder (später).
