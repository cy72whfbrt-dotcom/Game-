# Stadt, Burg, Gebäude, Forschung

Die Hauptstadt ist das Wichtigste im Spiel: Burg (Stufe 1–25) mit Gebäuden und Labor-Forschung, bleibt über jeden
Saison-Reset. Wichtigste Dateien: `Game/aufbau.js` (`AUF`: Burg-Fenster, Kosten `stadtKosten`/`foKosten`, Forschungs-Baum,
Markt, Marsch-Plätze, `burgFair`), `Game/spiel/08a-stadt-bauen.js` (`burgZeitTab`, `burgBasis`, Bauzeiten, `openCity`),
`08b-stadt-burg-aussehen.js` (`cityFehlt`, `cityWarte`), `08d1-stadt-gebaeude-wirkung.js, 08d2-stadt-teleport.js`, `08e`/`08f` (Stadtbild).

## Burg
- Eigene Burg-Stufe 1–25 (`city.levels.keep`); die Hauptstadt auf der Karte folgt ihr (Anzeige = Burg-Stufe, intern × 4).
  Kein „Aufwerten“ der Hauptstadt draußen, nur über die Burg. Andere Basen draußen: sofort mit Münzen, ohne Bauzeit.
- Bauzeit als Tabelle (`burgZeitTab`, Alexander 7.10.): 1→2 10 s … 10→11 12 Std., ab 11 steil bis 45 Tage (24→25).
  Burg 10 am ersten Tag, Burg 18 nach ~35 Tagen, Burg 25 nach ~231 Tagen (~4 Saisons). Burg 25 NICHT in einer Saison.
- Kosten `burgBasis` = 1.000 × 1,75 je Stufe bis 10, danach × 1,6 (Burg 2: 1.000 Holz / 1.100 Münzen; Burg 25 ~110 Mio. Holz),
  Münzen + Holz + Stein + Eisen. Mit Edelsteinen schneller (1 je Minute, ab 500 „Wirklich?“).
- Schaltet frei: Gebäude höchstens bis zur Burg-Stufe; Marsch-Plätze 2 + (Burg−1)/6; Markt ab Burg 4, Botschaft ab 5.
- Burg-Schutz: so viel von jedem Rohstoff ist vor Beute sicher – Münzen `burgSchutz`, Holz/Stein/Eisen `burgSchutzRoh`
  (= Münz-Schutz × `ROH_JE_MUENZE`); wächst mit der Burg, Forschung „Burg-Schutz+“ +10/20/30 %. Anzeige gerundet (`schutzText`).

## Gebäude (Alexander 4.10.: alles auf Deutsch)
- Burg, Labor (früher Akademie), Schmiede, Heldenhalle, Markt, Krankenhaus (früher Lazarett, bis Stufe 40), Botschaft,
  Mauer, Holzfäller, Steinbruch, Eisenmine (die drei in der Base). Raus: Kaserne, Schatzkammer, Lager, Tempelschrein,
  Späherturm, Wachturm, T1–T5-Truppenstufen.
- Kosten = 30 % der Burg-Kosten gleicher Stufe, Zeit 15 % der Burg-Zeit (mind. 10 s, höchstens 7 Tage); Krankenhaus
  26–40 × 1,15 je Stufe. Ein Bauarbeiter, 2. Bauarbeiter kaufbar (Edelsteine).
- Holzfäller/Steinbruch/Eisenmine: Ertrag pro Stunde, +33 % je Stufe × Landschaft der Hauptstadt × Forschung „Ertrag“ ×
  `ROH_FAKTOR`; ohne Gebäude kommt von der Burg allein ~75/Std. Rohstoffe gibt es nur aus der Stadt und Sammel-Feldern.
- Botschaft = Bündnis-Gebäude: Verstärkungs-Platz, Rally-Größe, Bündnis-Hilfen (siehe `buendnis.md`).
- Mauer: Verteidigung + Verteidigungs-Helden (siehe `helden.md`).
- Markt: Rohstoff ↔ Münzen (Handeln nur im Shop → Markt), Gebühr je Stufe, Tageslimit (`marktLimit`, `MARKT_WERT`).
- Gebäude-Fenster wie RoK: oben Bild, „Stufe N → N+1“ (+ „von 25“), Reiter Aufwerten | eigene Seite, Tabelle „Jetzt /
  Stufe N+1“, Voraussetzungen mit Haken/Kreuz „hast / brauchst“, Fuß-Knopf fest unten („Fehlt: 2.000 Holz“ bzw.
  „Fehlt: Holz, Stein, Eisen“, darunter Wartezeit beim jetzigen Ertrag „in ~7 Min.“). Fehlt die Burg: rote Zeile „Zur Burg“.
- Gebäude antippen: runde Knöpfe im Bogen (`cityRingAuf`): Aufwerten/Bauen/Beschleunigen/Info + eigene Seite.
- Bündnis-Hilfe: während Bau/Forschung „Bündnis um Hilfe bitten“, jede Hilfe 1 % kürzer (mind. 1 Min.), so viele wie die
  Botschaft-Stufe; nur für die nächste Stufe, je Gebäude/Forschung eine offene Bitte.

## Labor-Forschung
- Eine Forschung gleichzeitig, kostet Münzen + Rohstoffe + Zeit, mit Edelsteinen fertig (ab 500 „Wirklich?“).
- Wirtschaft (Ertrag, Sammeln, Traglast, Tempel), Militär (Angriff, Verteidigung, Krankenhaus), Erkundung (Marschtempo,
  Späher bis 10, Kundschaft). Ab Labor 23: Burg-Schutz+, Krankenhaus II, Marschtempo II (je Stufe 1–3 bei Labor 23/24/25).
- Ansicht als Baum (Spalten nach nötiger Labor-Stufe). Wirkungen beim Weltrechner über das Profil (`fo`) → `AUF.kampf`
  usw.; `profil_bereinigen` (server/02) kennt alle Forschungen mit Höchststufen. Test `forschung_kosten_test`.

## Stadtbild
- Gezeichnet (08e/08f): Bauplätze um die Burg, leere Plätze zeigen das Gebäude ausgegraut. Draußen um die Mauer liegt die
  Weltkarte der Hauptstadt (`cityAussen`), keine Felder/Windmühle. Schilder kleben unter ihrem Gebäude, nur ganz im Bild,
  verdeckte fallen weg (`cityFrame`, `cityNamePlatz`). Handy-Start zeigt alle Baufelder (`cityStartZoom`), beim ersten
  Betreten „‹ Wischen – mehr Gebäude ›“.
- Übergang Karte ↔ Stadt: Kamera fliegt nah (`CITY_NAH`), Karte taucht ein, Stadt blendet darüber (`stadtBlende`), dünne
  Wolken; zurück umgekehrt. In der Stadt bleiben obere Leiste und untere Knopf-Leiste („Stadt“ heißt dort „Karte“).
- Offen: Merkliste 11c Nr. 22 (außerhalb der Mauer nur echte Außenkarte, Blick enger), Nr. 9 (Gebäude-Fenster seitlich
  verschiebbar).

## Burg fair beim Reset (einmalig, 6.10.)
- Der erste Saison-Reset nach dem 6.10. setzte EINMALIG jede Burg über 4 auf 4 (`BURG_FAIR`, Merker `saison.burgFair`),
  Gebäude/Forschung auf das Erlaubte, ohne Erstattung; dazu Edelsteine genau 1.000, Holz/Stein/Eisen 0. Spätere Resets: die
  ganze Stadt bleibt (siehe `saison-reset.md`).
