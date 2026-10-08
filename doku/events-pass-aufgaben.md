# Events, Saison-Pass, Aufgaben, Erfolge, Anleitung

Alles im Fenster „Events“: Wochen-Event, Invasion, Drache, Tagesboss, Barbaren-Lager, Kriegsherr, Aufgaben, Erfolge,
Saison-Pass, Abholen, dazu die Anleitung für neue Spieler. Alles rechnet der Weltrechner (Welt-Teil `openWaterEvents`),
Zeiten = Berliner Zeit. Wichtigste Dateien: `Game/spiel/09c-events-drache.js` (`evBild`/`evBanner`, Drache),
`09b-lager-tagesboss.js`, `07b-kriegsherr.js`, `06a-aufgaben.js` (`QUEST_STAT`, `loadQuests`), `06b-pass-anleitung.js`
(`passRewardAt`, `PASS_XP`, `ANLEITUNG`), `05c-profil-erfolge-rangliste.js` (`ACHIEVEMENTS`), `bots/` (Mitspieler machen mit).

## Fenster Events (4 Reiter)
Aufgaben (Chips Täglich · Erfolge) · Abholen (Abholfach + Tagesbelohnung) · Pass · Ereignisse (Chips Woche · Invasion ·
Drache · Boss & Lager). Jedes Ereignis hat oben ein Bild-Banner mit Titel und Uhr; lange Regeln hinter „i“ (`infoKlapp`).
Leere Zustände mit Symbol + Satz + einem Gold-Knopf (`leerHtml`). Hinweise unter dem HUD: ein Streifen (`renderMidBar`).

## Ereignisse
- **Wochen-Event** Mo 0:00 – Fr 23:59, Themen reihum (`EV_WOCHE`): Sammel-Rausch → Krieger-Woche → Boss-Jagd → Bauherr.
  Höchstens 30 Punkte auf einmal, im Schnitt 10/Min. Rangliste; Preise nach Platz 1 · 2–5 · 6–10 · 11–20 · 21–100 ·
  101–1000 (danach nichts), für echte Spieler und Mitspieler; Auszahlung Freitag Mitternacht ins Abholfach.
  Das Wochenende ist frei (kein Turnier mehr). Krieger-Woche-Punkte nach Anteil an alle Kämpfer.
- **Barbaren-Invasion** alle 3 Tage um 20 Uhr eine Stunde, 6 Wellen; jeder echte Spieler bekommt je Welle eine Armee auf
  seine äußerste Basis (Neulinge halb so stark). Barbaren erobern nichts; Abwehr/Abfangen gibt Punkte. Belohnung als
  LEISTE (Punkte-Linie mit Kisten, Schlüssel je Stufe, nie doppelt). Chip in der Karten-Leiste: „Invasion 2/6“ (Welle).
- **Event-Belohnungen abholen** (Alexander A, 8.10.): Invasion, Drache, Tagesboss, Lager werden im Event abgeholt („Abholen“
  an der Kiste/Stufe). Der Eintrag liegt mit `bis` (Event-Ende, bei Tagesboss/Lager Mitternacht, `evTagesEnde`) im Fach;
  `inboxFach()` zeigt ihn im Abholfach erst danach – nichts geht verloren. Roter Punkt `.mb-hol` am Invasions-/Drachen-Chip,
  „!“ am Reiter (`evHolBereit`). Echte Spieler: `bis` kommt in der evPreis-Nachricht mit (höchstens 1 Tag). Wochen-Event-
  und Saison-Platzpreise kommen direkt ins Abholfach; Mitspieler bekommen alles sofort.
- **Drache** jeden Sonntag 19–22 Uhr über dem Thron; Leben ≈ 75 % dessen, was alle schaffen; 10 Angriffe pro Person,
  höchstens 2 % Leben pro Angriff; Treffer zählt ab 10 % aller eigenen Truppen. Nur Leiste, keine Extra-Preise für die Besten.
  Karte: `drawDragon` nach den Gebäuden, `drFlug` setzt ihn über die Spitze des Thron-Bilds (halb so breit wie der Thron, mind. 120 px).
  Fenster Drache/Tagesboss: oben ein Satz `.ev-zaehlt`, was zählt (Treffer bzw. Schaden je Angriff, Grenze aus DR_CAP/DBOSS_CAP).
- **Tagesboss** (täglich): Belohnung je Angriff nach Schadens-Klasse (Anteil am Boss-Leben bis 0,05 % / 0,5 % / 1 % /
  2,5 % / darüber; gleiche Klasse zweimal = zweimal); „Boss fällt“ für alle. Keine Platz-Preise, kein „entkommen“-Preis.
  Für alle ohne Nebel-Sperre (Platz einmal am Tag aufgedeckt).
- **Barbaren-Lager**: Stufe 1–25 je Tag, Belohnung je geschaffter Stufe (jeden Tag neu, ~210 Edelsteine/Woche, Alexander B);
  Lager-Fortschritt startet jede Saison bei 1.
- **Kriegsherr** (Wanderboss) bleibt; Turnier, Weltboss (Drachenturm/Piratenfestung) und VIP sind komplett raus.
- Am Saisonanfang (erste 3 Tage) kleinere Untergrenzen für Tagesboss/Drache (`saisonAnfang`).
- Push: Invasion in 10 Min., Drache erschienen, Kriegsherr erschienen (einzeln abschaltbar).
- Test-Zeiten nur in der Vorschau (`EV_TEST` in `werkzeuge/vorschau_test.js`), im Git immer `null`.

## Saison-Pass
- Ein Pass läuft 28 Tage (gleicher Kalender für alle, `PASS_EPOCH`/`PASS_LEN`, 3 Tage Nachfrist zum Abholen).
- 100 Stufen × 150 Punkte; jede Stufe gibt in beiden Reihen etwas (`passRewardAt`): frei z. B. 1 = 3 Std. Münzen,
  3 = Kiste, 5 = 20 Edelsteine, 10 = Königliche Kiste, 25/50/75/100 = 50 + Königliche; Premium u. a. 12 Std. Münzen,
  Schild 8 Std., 150 Thron-Punkte. Keine Rahmen im Pass (Stufe 100 gibt Edelsteine). Edelsteine je Pass frei 360,
  Premium 950.
- Premium 1.000 Edelsteine mit „Wirklich?“; eine neue Welt-Saison setzt Punkte, Stufen und Premium zurück (Handy 01a,
  Mitspieler 09f).
- Punkte (`PASS_XP`): Bau/Forschung gestartet 15, Lager 5, Tagesboss/Drache-Angriff 10, Invasions-Punkt 1 u. a.
- Ansicht: lange waagrechte Leiste (oben Premium, Mitte Stufe, unten Frei) mit Belohnungs-Kacheln. Heißt „Saison-Pass“. Kleines Handy (360×640): Kacheln kleiner, Premium-Reihe ohne Krone – ganz im Fenster (Test handy_360).

## Aufgaben
- 6 am Tag (2 leicht / 2 mittel / 2 schwer: 3/5/8 Edelsteine + 1/2/3 Std. Münzen); Bonus bei 3 (2 Std. Truppen) und bei
  allen 6 (Kiste, 10 Edelsteine, 5 Splitter) – 42 Edelsteine am Tag. Nur was heute geht (Bündnis, Gebäude, Invasions-/
  Drachen-Tag; Tempel-Aufgabe erst wenn Zone 4 offen, Thron-Aufgabe ab Tag 7). Zähler `QUEST_STAT` (auch vom Weltrechner).
  Weltrechner: Truppen-Quelle `aufgabe` höchstens 2 in 24 Std., Münz-Topf 12 Std. am Tag.

## Erfolge
- Geben nur Edelsteine. Hauptstadt-Erfolge (Burg 5/10/15/20/25, Labor, Drache, Invasion, Saison-Top-10); hohe
  Langzeit-Ziele bleiben (1.000 Eroberungen, Thron 10 Std., Burg 25 …), „Großreich“ = 100 Basen gleichzeitig.
  Mitspieler gleich (`BOT_GOAL_VAL`).

## Anleitung (neue Spieler, 7 Schritte)
- Schritte unten am Bildschirm, nächster nötiger Knopf pulsiert (`body[data-anl-puls]`); Schritt 7 erklärt Knöpfe ohne
  Text. Text passt zum offenen Fenster; liegt nie über Knöpfen/Fenstern (Handy unter dem HUD, bis 4 Zeilen).
- Schritt 6 zählt erst nach echtem Abholen. „×“ fragt „Wirklich überspringen?“. Profil → Einstellungen → „Anleitung noch
  mal“; Belohnung (10 Edelsteine) nur beim ersten Mal. Tägliche Belohnung erst nach der Anleitung.
- Stand liegt im Spielstand auf dem Server (`openWaterAnleitung`), nie im Browser. Test `anleitung_test`.

## Offen (Merkliste)
- 11c Nr. 5: alte Event-Ranglisten/Wochen-Punkte beim Reset (prüfen, ob erledigt); Nr. 28: Invasionsleiste „0 P.“.
- Test-Ansicht Thron-Event (Vorschlag, noch nicht im Spiel): `werkzeuge/thronevent/thronevent.html?a=woche|wochenende|shop|karte|herrscher` – echtes Events-Fenster mit Chip „Thron“ (Punkt = läuft), Shop-Reiter „Event“, Karte mit fast durchsichtiger, pulsierender Kuppel je Turm/Thron (`karte_kuppel.webp`, nur Rand + Runen), am Wochenende fliegen Turm-Geschosse mit Einschlag zum Thron; Shop-Kisten mit „1×/10× öffnen“; Herrscher: Skin/Rahmen automatisch angelegt, Herrscher-Burg mit Krone + Goldschein neben normaler Burg. Stil + Symbole aus `Game/spiel.php` per `werkzeuge/thronevent/stil_holen.sh`.
