# Wirtschaft und Zahlen

Ertrag, Kosten, Gegner-Stärken und Belohnungs-Größen. Alle Zahlen gelten für dich, Mitspieler und echte Spieler gleich.
Wichtigste Stellen: Konstanten oben in `Game/spiel/01a-grundlagen.js` (`WIRTSCHAFT_ERTRAG`, `WIRTSCHAFT_KOSTEN`,
`ROH_FAKTOR`, `MUENZ_FAKTOR`, `PLAYER_START_COINS`), Hilfsfunktionen `wirtK`/`wirtR`/`wirtM` (01b), Produktion
`06d-schild-produktion.js` (`produceTicks`, `coinsPerTick`, `troopsPerTick`), Anzeige `fmtStunde`/`proStunde` (01e).
Regel (CLAUDE.md): Zahlen immer aus Spieler-Sicht prüfen und mit RoK vergleichen („Burg 4 kostet 7 Holz“ = Fehler).

## Faktoren
- `WIRTSCHAFT_ERTRAG = 1/3600`: alles, was früher pro Sekunde kam, kommt pro Stunde (Basen, Tempel, Felder, Hauptstadt).
  Bruchteile warten je Basis bis zur ganzen Einheit (`truppenMitRest`). Anzeige überall „/ Std.“.
- `WIRTSCHAFT_KOSTEN = 1/1800`: Kosten und Gegner → alles etwa 2× langsamer als ganz früher.
- `ROH_FAKTOR = 1800`: Holz/Stein/Eisen in RoK-Größe (Kosten und Ertrag ×1.800).
- `MUENZ_FAKTOR = 1000`: alle Münz-Werte × 1.000 (`wirtM`) – Ertrag, Kosten, Belohnungen; Verhältnis bleibt.
- `ROH_JE_MUENZE` 1,8 (Burg-Schutz der Rohstoffe = Münz-Schutz × 1,8).
- Bleiben: alle Edelstein-Preise (außer Ausrüstungskiste 150), Bauzeiten-Tabelle der Burg.

## Start (Alexander 6.10./8.10.)
- Neue Spieler, Mitspieler und jede neue Saison: 5.000 Truppen (`PLAYER_START_TROOPS`, 01c), 10.000 Münzen
  (`PLAYER_START_COINS`), Rohstoffe 3.000 Holz / 2.000 Stein / 500 Eisen (`ROH_START`).

## Ertrag
- Basis Stufe 1: 15 Truppen/Std. (7.10.) und 10.000 Münzen/Std.; Basis-Ertrag × 1,15 je Stufe bis 100.
- Tempel: normal ×1, Wächter ×3, Mega ×8 einer Grund-Menge (Münzen/Truppen; Edelsteine bleiben); Bündnis-Tempel-Bonus
  siehe `buendnis.md`.
- Hauptstadt-Rohstoffe aus Holzfäller/Steinbruch/Eisenmine (siehe `stadt-burg-gebaeude.md`).
- Sammel-Felder: feste Dauer (außen 1 Std. … innen 4 Std., `fieldDauerSec`), Truppen bestimmen nur die Traglast
  (Holz/Stein 2 je Truppe, Eisen 1,5, Gold 10). Alle Felder außer Edelstein mit √Ring-Faktor. Nachwachsen nach 60 Min.
- Fähigkeit „Geschwindigkeit“ verkürzt den Produktions-Tick (`productionTickMs`).

## Kosten
- Burg/Gebäude/Forschung: siehe `stadt-burg-gebaeude.md`. Basis aufwerten draußen nie unter 1.000 Münzen.
- Heilen 100 Münzen je Truppe (`HEAL_COIN_PER_TROOP`), auch beim Weltrechner.
- Maut je Truppe 100–2.000 (`mautJeTruppe`), je Marsch höchstens 560.000 (`MAUT_MAX`).
- Bündnis gründen 20.000 Münzen (`BUND.KOSTEN`). Teleport 500 Edelsteine. Schild 2/8/24 Std. = 80/300/700 Edelsteine (`SHIELD_PRICES`).
- Markt: `MARKT_WERT` (100 Rohstoffe ≈ 278 Münzen), Tageslimit für alle zusammen (`wache.rm`).

## Gegner (fest, nicht ÷ Wirtschaft)
| Gegner | Truppen (+ Verteidigung) |
|---|---|
| Basis außen | 70–100 (+10–30), weiter innen bis 700–1.000 (+100–300) |
| Tempel normal | 150–260 % einer Basis des Rings |
| Grenz-Tore außen → innen | 5.000 / 8.000 / 12.000 / 20.000 (+1.500 … 6.000) |
| Wächter-Türme / Wächter-Tempel / Wächter-Tor | 5.000–20.000 / 60.000 / 30.000 (+10.000) |
| Thron-Türme / Mega-Tempel / Thron-Tor | 50.000–150.000 / 500.000 / 200.000 (+60.000), Thron-Tor mind. `THRON_TOR_MIN` |
| Barbaren-Lager Stufe L | 500 × 1,42^(L−1) Krieger (1: 500, 4: 1.400, 10: 12.000, 25: 2,3 Mio.); Beute Krieger × 20 + 5.000 × L |
- Grundverteidigung jeder Basis mindestens 50 je Stufe, ab ~Stufe 47 wie die alte Formel (`baseDefenseForLevel`).
- Tagesboss/Drache/Kriegsherr/Invasion: Leben aus der Stärke aller (siehe `events-pass-aufgaben.md`); am Saisonanfang
  kleinere Untergrenzen (`DBOSS_MIN_ANFANG`, `DR_MIN_ANFANG`).

## Belohnungs-Größen
- Stufen-Belohnung Truppen = 1 Tag Truppen-Ertrag einer Basis dieser Stufe (`levelRewardTroops` = 24 × `troopsPerTick`;
  Stufe 10: 1.300, 30: 21.000, 50: 340.000); Münzen mind. 10.000 (`STUFE_LOHN_MIN`). Hauptbuch prüft mit derselben Funktion.
  Helden-Gefolge und Funde rechnen mit dem alten Maß (`stufenTruppenMass`).
- „N Std. Münzen/Truppen“ (Pass, Aufgaben, Thron-Shop, Händler) = N × eigener Stunden-Ertrag; Thron-Shop 2 Std.
  (`THRONE_STUNDEN`), mind. 20.000 Münzen / 2.000 Truppen; Händler/Markt genauso („n Stunden eigener Ertrag“).
- Kampf-Gold je Kill: Fähigkeiten „Angriff/Verteidigung: Münzen“ (`SKILL_DEFS`), Held-Anteil (`killGoldRate`, `fieldGold`),
  Anzeige „je 1.000 Kills“.
- Ausrüstung: Wirkung (Wert + 6) × 0,15 % (grau 1 ≈ 1 %), Zerlegen 5 + Wert Punkte.
- Edelsteine je Tag aus Aufgaben 60 (2 × (5 + 7 + 10) + 16 Bonus; Hauptbuch-Spielraum folgt questGemsTag), Wochenkette 150/Woche; Pass frei 360, Premium 950 je Saison.

## Offen (Merkliste)
- 11c Nr. 26: Produktion im Spätspiel aufgebläht, Friedensschild-Preise gegen Einkommen prüfen (Teile durch 7.10. erledigt).
- 11c Nr. 32: einzelne Zahlen aus Spieler-Sicht (Thron-Shop-Truppen, Schild Stufe 1 „+0,2 %“).
- Münzen/Rohstoffe im Profil auf 1 Billiarde gedeckelt (Truppen ohne Grenze, 1e30) – bei Bedarf anheben.

Alte Tabellen „vorher/nachher“ (A, A2, A3, A4 vom 5./6.10.) stehen in `archiv.md` (Abschnitt 11b).
