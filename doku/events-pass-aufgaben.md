# Events, Saison-Pass, Aufgaben, Erfolge, Anleitung

Alles im Fenster „Events“: Wochen-Event, Barbaren-Lager, Kriegsherr, Aufgaben, Erfolge, Saison-Pass, Abholen, dazu die
Anleitung für neue Spieler. Alles rechnet der Weltrechner (Welt-Teil `openWaterEvents`, `evState.wo`), Zeiten = Berliner Zeit.
Wichtigste Dateien: `Game/spiel/09c-events-woche.js` (Wochen-Event, Event-Fenster, `evPreis`, `evLeisteHtml`),
`09b-lager-tagesboss.js` (Lager, Tagesboss), `07b-kriegsherr.js`, `06a-aufgaben.js` (`QUEST_STAT`, Abholfach), `06b-pass-anleitung.js`,
`05c-profil-erfolge-rangliste.js` (`ACHIEVEMENTS`), `bots/` (Mitspieler machen mit). Gegenstände (Event-Münzen, Schlüssel 1/2,
Beschleuniger, `gibBelohnung`) in `05e-belohnung.js`. Test: `wochenevent_test`. Vorbild: `werkzeuge/wochenevent/wochenevent.html`.

## Fenster Events (4 Reiter)
Aufgaben (Chips Täglich · Erfolge) · Abholen (Abholfach + Tagesbelohnung) · Pass · Ereignisse (Chips Woche · Lager, Thron-Event
von Team B). Chip mit Punkt: grün = läuft, grau = läuft nicht (darunter „Mo“). „!“ am Chip = Belohnung zum Abholen.
Lange Regeln hinter „i“ (`infoKlapp`), leere Zustände `leerHtml`. Hinweis unter dem HUD (`evChips`): „Mo · Bauherr  Platz N“.

## Wochen-Event (Mo 0:00 – Fr 20:00, jede Woche gleich, `WO_TAGE`)
- Mo Bauherr: 30 P. × neue Stufe (Stadt-Gebäude und Basen), 1 P. je beschleunigte Minute, 2 P. je Edelstein fürs Beschleunigen ·
  Di Krieger: 1 P. je getötete gegnerische Truppe (Angriff + Abwehr, Rally/Verstärkung nach Anteil – nicht im Lager) ·
  Mi Sammeln: 1 P. je 100 gesammelte Rohstoffe · Do Boss-Jagd: 1 P. je 1.000 Schaden (Tagesboss nur donnerstags) ·
  Fr Helden-Tag: Helden-Stufe 100, Ausrüstung schmieden/verbessern 150, Kiste öffnen 120 (`WO_PKT`).
- Nur das Event des Tages zählt (`evPunkte(art, wer, n)`, nur wer rechnet). Echte Spieler: Bau/Forschung/Helden/Kisten zählt das Hauptbuch (10d3).
- 5 Tages-Kisten (`WO_KISTEN`, Punkte des Tages): 1.000 / 3.000 / 6.000 / 12.000 / 20.000 → Event-Münzen 50/100/150/250/400,
  Edelsteine 10/20/30/50/80, Beschleuniger 5 Min/15 Min/1 Std/3 Std/8 Std, die letzte + 1 Schlüssel. Bis Tagesende im Event
  abholen (Leiste), danach im Abholfach. Mitspieler bekommen alles sofort.
- Fenster: Tag-Leiste Mo–Fr + 6. Feld „Rangliste“ (antippen = Tag ansehen), Punkte heute/Woche + Platz, „So gibt es Punkte“, Kisten,
  Top 5. Rangliste: Uhr bis Fr 20 Uhr, Umschalter Rangliste/Belohnungen, Podest Top 3, Liste bis 50, eigener Platz fest unten.
- Fr 20 Uhr Auswertung (`woPay`, Preise ins Abholfach, `WO_RANG`): 1: 3.000 EM, 500 Edelst., 3 S2, 10 S1, 24 Std · 2: 2.200/350/2/8/24 Std ·
  3: 1.700/250/1/6/8 Std · 4–10: 1.000/150/1/4/8 Std · 11–50: 500/80/–/2/3 Std · ab 51 (mind. 1 P.): 200/20/–/1/1 Std.
- Sa/So: Thron-Event (Team B). Neue Welt-Saison: laufende Woche fängt bei 0 an.

## Barbaren-Lager (letzter Chip)
- Stufe 1–25, 20 Siege am Tag. Je Sieg nur feste Münzen 30K × 1,15^(Stufe−1) (`lagerMuenzen`), ab Stufe 10 ein Schlüssel, ab
  Stufe 20 ein epischer – bis zur Tagesgrenze 2,5 Mio. Münzen, 3 Schlüssel, 1 epischer (`LAGER_GRENZE`, `lagerBeute`). Keine andere
  Beute; Tote im Lager zählen nicht für den Krieger-Tag. Fenster: Tagesgrenze oben (Bild + Zahl + Balken), Münzen je Stufe.
- Lager-Fortschritt startet jede Saison bei 1.

## Tagesboss (nur donnerstags)
- `dbossEnsure` legt ihn nur donnerstags an (`DBOSS_TAG`), 10 Angriffe am Tag, höchstens 5 % Leben je Angriff, Münzen je Schaden.
  Keine eigenen Belohnungen mehr – der Schaden zählt für die Boss-Jagd. Erste 3 Tage einer Saison weniger Leben (`saisonAnfang`).
- Kriegsherr (Wanderboss) bleibt. Invasion, Drache, Themen-Woche und Wochenkette sind raus.

## Saison-Pass
- Ein Pass läuft 28 Tage (gleicher Kalender für alle, `PASS_EPOCH`/`PASS_LEN`, 3 Tage Nachfrist zum Abholen).
- 100 Stufen × 150 Punkte; jede Stufe gibt in beiden Reihen etwas (`passRewardAt`): frei z. B. 1 = 3 Std. Münzen,
  3 = Kiste, 5 = 20 Edelsteine, 10 = Königliche Kiste, 25/50/75/100 = 50 + Königliche; Premium u. a. 12 Std. Münzen,
  Schild 8 Std., 150 Thron-Punkte. Keine Rahmen im Pass (Stufe 100 gibt Edelsteine). Edelsteine je Pass frei 360,
  Premium 950.
- Premium 1.000 Edelsteine mit „Wirklich?“; eine neue Welt-Saison setzt Punkte, Stufen und Premium zurück (Handy 01a,
  Mitspieler 09f).
- Punkte (`PASS_XP`): Bau/Forschung gestartet 15, Lager 5, Tagesboss-Angriff 10 u. a.
- Ansicht: lange waagrechte Leiste (oben Premium, Mitte Stufe, unten Frei) mit Belohnungs-Kacheln. Heißt „Saison-Pass“. Kleines Handy (360×640): Kacheln kleiner, Premium-Reihe ohne Krone – ganz im Fenster (Test handy_360).

## Aufgaben
- 6 am Tag (2 leicht / 2 mittel / 2 schwer: 3/5/8 Edelsteine + 1/2/3 Std. Münzen); Bonus bei 3 (2 Std. Truppen) und bei
  allen 6 (Kiste, 10 Edelsteine, 5 Splitter) – 42 Edelsteine am Tag. Nur was heute geht (Bündnis, Gebäude, Tagesboss
  nur donnerstags; Tempel-Aufgabe erst wenn Zone 4 offen, Thron-Aufgabe ab Tag 7). Zähler `QUEST_STAT` (auch vom Weltrechner).
  Weltrechner: Truppen-Quelle `aufgabe` höchstens 2 in 24 Std., Münz-Topf 12 Std. am Tag.

## Erfolge
- Geben nur Edelsteine. Hauptstadt-Erfolge (Burg 5/10/15/20/25, Labor, Saison-Top-10); hohe
  Langzeit-Ziele bleiben (1.000 Eroberungen, Thron 10 Std., Burg 25 …), „Großreich“ = 100 Basen gleichzeitig.
  Mitspieler gleich (`BOT_GOAL_VAL`).

## Anleitung (neue Spieler, 7 Schritte)
- Schritte unten am Bildschirm, nächster nötiger Knopf pulsiert (`body[data-anl-puls]`); Schritt 7 erklärt Knöpfe ohne
  Text. Text passt zum offenen Fenster; liegt nie über Knöpfen/Fenstern (Handy unter dem HUD, bis 4 Zeilen).
- Schritt 6 zählt erst nach echtem Abholen. „×“ fragt „Wirklich überspringen?“. Profil → Einstellungen → „Anleitung noch
  mal“; Belohnung (10 Edelsteine) nur beim ersten Mal. Tägliche Belohnung erst nach der Anleitung.
- Stand liegt im Spielstand auf dem Server (`openWaterAnleitung`), nie im Browser. Test `anleitung_test`.

## Offen
- 11c Nr. 5: alte Event-Ranglisten/Wochen-Punkte beim Reset (prüfen, ob erledigt).
- Helden-Tag beim Weltrechner: Ausrüstungs-Stufen zählen nur über Sterne (`hbSterne`), Kisten über neue Teile (`hbGearNeu`).

## Thron-Event (Mitte, `06c-thron-mitte.js`, Test `thron_event_test`)
- Sa 10 – So 22 Uhr (`thronFenster`, Ortszeit). Sonst Kuppel über Thron + 4 Wachtürmen (`thronKuppel`): Start (02b), Ankunft (04,
  Truppen gehen heim), Armeen (09d), Mitspieler/Rally (03-angreifen, buendnis 03) sperren; Karte zeigt `karte_kuppel` (03b).
- Thron + 4 Wachtürme (Tempel der Zone 4) sind immer bekannt: Bild auch im Nebel bei jedem Zoom (`drawUebersichtZeichen`), antippbar
  (03e/09e). „Zum Königsthron“ fliegt so nah, dass der ganze Thron im Bild ist; Fenster darf dort höher sein (`ist-heiligtum`).
- Alle 3 Min. Rangpunkte (`throneState.week`): Halter (`thronHalter`) 30, je Wachturm 15, Verstärkung beim verbündeten Halter 15.
  Alle 10 Min. schießt jeder Wachturm außerhalb des Bündnisses des Halters 2 % (Krankenhaus wie überall). Kopfgeld auf den Halter.
- Jedes Event startet bei 0, übrige Herrscher-Kisten verfallen. So 22 Uhr `thronAuswertung` (nur Weltrechner): `THRON_PREISE`
  Platz 1/2/3/4–8, Teilnahme ab 500 – Münzen-Stunden + Gegenstände `b` [Art, Menge, Extra] über `evPreis` (Abholfach `src: 'thron'`,
  Abholen ruft `gibBelohnung`; Holz direkt in den Topf; Hauptbuch-Felder em/s1/s2/besch).
- Platz 1 = Herrscher eine Woche (`rulerOwner()` = `thronHerrscher()`): +25 % Ertrag, Skin `skin_koenigsburg` + Krone auf der Karte,
  Rahmen `king` (ui_herrscher_rahmen), vergibt Titel (Feldherr +5 % Angriff, Burgvogt +5 % Verteidigung, Schatzmeister +10 % Ertrag,
  Narr −5 % Marschtempo; Abzeichen über dem Namensschild, `drawTitleBadges`), verschenkt 2 epische / 5 große / 10 Kisten
  (`herrKiste`, Befehl `thronKiste`; nicht an sich selbst; Mitspieler-Herrscher verschenken selbst, Bündnis zuerst).
- Events-Fenster Chip „Thron“ (`evThronHtml`, grüner Punkt = läuft), Herrscher-Fenster `#herrPopup` (`renderHerr`). Thron-Shop und
  Thron-Punkte als Währung sind weg; `earned`/`tpEarned` zählen nur noch für Saison-Rangliste und Erfolge. Pass gibt statt 150
  Thron-Punkten 150 Event-Münzen.
