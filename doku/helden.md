# Helden

20 Helden mit Splittern, Sternen (in Vierteln), Fähigkeiten und Wut; je Marsch Haupt- und Zweitheld, Verteidigungs-Helden
über die Mauer. Wichtigste Dateien: `Game/spiel/08c-helden-fenster.js` (Heldenhalle, `heroHalle`, `heroDoSwap`, `vhFx`/`vhSetzen`/
`vhBest`), `01d-helden-daten-herrscher.js` (`HERO_*`-Tabellen), `08d1-stadt-gebaeude-wirkung.js` (Mauer-Fenster `vhHtml`), `04-kampf-ankunft.js`
(`heroBonus`, `heroDuo`, `heroBusy`, `heroWutZurueck`).

## Grundregeln
- Helden gibt es erst mit Heldenhalle Stufe 1 (`heroHalle`, für dich, Mitspieler und Weltrechner – 7.10.): ohne Halle
  „Baue die Heldenhalle“, kein Freischalten/Aufwerten/Fähigkeiten, kein Held im Marsch; Splitter sammeln geht.
- Freischalten und Viertel-Sterne kosten Splitter; Fähigkeiten ≤ 1 Punkt je halbem Stern. Wut rechnet nur der Weltrechner;
  Wut kommt zurück bei Zurückrufen/Abprallen/2. Welle (`heroWutZurueck`).
- Übrige Splitter eines Helden mit 5 Sternen 1:1 in Splitter für einen anderen tauschen (`heroDoSwap`, keine Edelsteine).
  Sind alle Helden voll, werden Splitter zu Edelsteinen.
- Helden-Fähigkeiten zurücksetzen 200 Edelsteine (mit „Wirklich?“), Spieler-Fähigkeiten zurücksetzen 500.
- Start-Helden: alle behalten die 3 Standard-Helden (Alexander 7.10., B).
- Neue Helden (2.10.): Wolfram, Thora, Eskil, Lene, Bruno, Pia – Stärke wie andere Helden derselben Seltenheit (`HERO_TIER`).

## Haupt- und Zweitheld
- Zweitheld gibt Werte (Angriff, Verteidigung, Tempo, Gefolge) und passive Fähigkeiten zu 50 % (`HERO_ZWEIT`); Wut-Fähigkeit
  nur beim Haupthelden. Passendes Paar +10 % auf alle Heldenwerte (`HERO_PAIR_BONUS`, 6 Paare `HERO_PAIRS`: Kasimir & Wolfram,
  Ragna & Thora, Yrsa & Eskil, Ida & Lene, Hagen & Bruno, Fenn & Pia).
- Ein Held kann nur in einem Marsch sein (`heroBusy`: Angriff, Armee, Feld, Rally inkl. Sammeln, laufender Kampf).
- Höchstens 2 Helden je Angreifer – auch bei mehreren eigenen Wellen im selben Kampf (nur die Helden der ersten Welle) und
  bei Rally-Mitgliedern (jeder seine 2, nur für seine Truppen).
- Auswahl: Angriffs-Vorschau, Mehrfachangriff, Feld, Lager/Boss, Armee, Rally – erst Hauptheld, dann „Zweitheld“; der
  passende Partner steht vorn („Paar +10 %“). Befehle tragen `held`/`held2`; der Weltrechner prüft Besitz/belegt
  (`heroZweitOk`), ein falscher Zweitheld fällt weg.
- Mitspieler wählen Paare genauso (`heroPickPair`, Sammler `botGatherHeroes`).
- Offen (Merkliste 11c Nr. 18): zuletzt benutzte Helden vorbelegen.

## Verteidigungs-Helden (Mauer, 6.10.)
- Stadt → Mauer → Reiter „Helden“: Verteidigungs-Hauptheld (ab Mauer 1) und Zweitheld (ab Mauer 5, 50 %, Paar +10 %).
- Sie verteidigen JEDE eigene Basis mit derselben Rechnung wie beim Angriff, ohne Wut: Angriff % auf die Besatzung + Gefolge
  (Zeile „Held …“ in `effectiveDefense`/`defenseParts`), Verteidigung = weniger Gefallene, Krankenhaus und Gold wie beim
  Angreifer. Derselbe Held darf angreifen – solange er unterwegs ist, verteidigt er nicht.
- Weltrechner-Befehl `vheld` (`vhSetzen`), Eintrag `vh` im Mitspieler-Datensatz (Fremde sehen ihn nur im Spähbericht).
  Mitspieler tragen ihren besten Helden ein (`botVhCare`). Test `mauer_helden_test`.
- Offen: Drache/Kriegsherr-Angriffe auf Basen nehmen nur Angriff + Gefolge der Verteidigungs-Helden.

## Anzeige
- Heldenhalle: Reiter „Helden | Paare“, gesperrte Helden kleiner unter „N gesperrt“; genug Splitter → Karte golden oben mit
  „Freischalten“; Stern als „Stern N · k von 4 Vierteln“ + Balken. Kampf- und Spähbericht zeigen beide Helden.
- Offen (Merkliste 11c Nr. 20): Helden-Fenster neu wie RoK/Call of Dragons (Designer).
- Heldenkisten: siehe `shop-kisten-belohnung.md` (Heldenkiste: 6 Splitter auf 2–3 verschiedene Helden, `heroChestTeile`).
