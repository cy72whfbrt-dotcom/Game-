# Events, Saison-Pass, Aufgaben, Erfolge, Tutorial

Alles im Fenster „Events“: Wochen-Event, Barbaren-Lager, Kriegsherr, Aufgaben, Erfolge, Saison-Pass, Abholen, dazu die
Tutorial für neue Spieler. Alles rechnet der Weltrechner (Welt-Teil `openWaterEvents`, `evState.wo`), Zeiten = Berliner Zeit.
Wichtigste Dateien: `Game/spiel/09c-events-woche.js` (Wochen-Event, Event-Fenster, `evPreis`, `evLeisteHtml`),
`09b-lager-tagesboss.js` (Lager, Tagesboss), `07b-kriegsherr.js`, `06a-aufgaben.js` (`QUEST_STAT`, Abholfach), `06b-pass-anleitung.js`, `10c2-tutorial.js`,
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
- 6 am Tag (2 leicht / 2 mittel / 2 schwer: 5/7/10 Edelsteine + 1/2/3 Std. Münzen); Bonus bei 3 (2 Std. Truppen) und bei
  allen 6 (Kiste, 16 Edelsteine, 5 Splitter) – 60 Edelsteine am Tag. Nur was heute geht (Bündnis, Gebäude, Tagesboss
  nur donnerstags; Tempel-Aufgabe erst wenn Zone 4 offen, Thron-Aufgabe ab Tag 7). Zähler `QUEST_STAT` (auch vom Weltrechner).
  Weltrechner: Truppen-Quelle `aufgabe` höchstens 2 in 24 Std., Münz-Topf 12 Std. am Tag.
  „Schwer“ nie mit einem Klick: Forschung, Heilen, Markt, Rally, Zusammenlegen, Verstärkung nur leicht/mittel (`steps[2]` 0), Bauen 1/2/3.

## Erfolge
- Geben nur Edelsteine. Hauptstadt-Erfolge (Burg 5/10/15/20/25, Labor, Saison-Top-10); hohe
  Langzeit-Ziele bleiben (1.000 Eroberungen, Thron 10 Std., Burg 25 …), „Großreich“ = 100 Basen gleichzeitig.
  Mitspieler gleich (`BOT_GOAL_VAL`).

## Tutorial (neue Spieler, Burg 1 → 3) – `10c2-tutorial.js`
- Nur neue Spieler (`__OW.neu` bzw. ganz frischer Stand); alte Stände ohne `openWaterTutorial` sehen alles wie bisher.
  Auch offline (normale Vorschau, frischer Speicher). Test-Vorschauen (`vorschau_bauen.php … test` / `ohnetutorial`, alle_tests.sh)
  setzen `window.__owOhneTutorial` – dort startet es offline nicht. Tages-Belohnung erst nach dem Tutorial (`maybeShowDaily`).
- Zuerst Willkommen (`#tutWillkommen`, Titelbild, Band, Aldric stellt sich vor, „Los geht's“, `tut.w`). Ohne Server (`!__OW`)
  mit Namensfeld (max. 16 Zeichen, Vorschlag „Kapitän 123“ → `openWaterPlayerName`); mit Server kommt der Name aus der Anmeldung.
- 27 Schritte (`TUT`, Drehbuch `scratchpad/design_tutorial2.md` + `design_tutorial3.md`; Stand merkt den Schritt-Namen `tut.k`) im echten Spiel: abgedunkelt (Handlung .55, Erklär-Schritt .40), Loch
  auf dem echten Element (Knopf, Stadt-Schild, rund auf Basis/Lager), Finger, Berater „Aldric“ (Namensschild) mit 1–2 Sätzen mit
  echten Zahlen aus dem Spiel (Kosten `stadtKosten`, Rohstoffe, Lager-Barbaren/-Münzen, Münzen/Std. einer Basis, Truppen). Jeder
  Teilschritt (Stadt → Schild → Bauen, Knopf → Reiter → Ziel, Angriff) hat seinen eigenen Satz und Punkte (`tutT`, `tutBauT`, `tutReihe`);
  Bau läuft: „Noch N Sekunden …“ mit Balken. Fertig gebaut: Freude-Moment (`freude`: „+N Holz pro Stunde“, „Burg 2!“ steigt am Ziel auf).
  Blase ruhig (Menschen-Test `tutorial_mensch_test`): feste Seite je Bildschirm-Lage (`tutLage`): Karte/Stadt, Heldenhalle, Kampfdetails
  unten; offenes Fenster (Panel, Gebäude-, Lager-Fenster) oben unter „Überspringen“, kleine Blase (`.klein`), das Fenster wird so gekürzt,
  dass es erst darunter beginnt (`tutKuerzen`, Inhalt rollt; nie über Fenster-Inhalt). Seite wechselt nur, wenn die Blase sonst das Loch
  deckte (Stadt-Schild: schon vorher aus der End-Lage, `tutStadtY`), und bleibt dann im Schritt. Die Blase ist oben verankert (unten: fester Platz
  `--tut-res` über der Leiste) und so hoch wie ihr Text – der Satz steht still; Fenster darunter rechnen mit dem festen Platz (verrutschen nicht). Sie blendet nur bei Erscheinen/Seitenwechsel ein (nur Deckkraft),
  neuer Satz blendet weich über (`.tausch`). Fenster auf/zu: Blase im selben Bild (MutationObserver + gleich nach jedem Tipp). „Weiter“
  in eigener Zeile. Gegenstand-Fenster („Ausrüsten“) liegt im Tutorial unter dem Dunkel (z 58). Lager: Kamera zeigt
  Hauptstadt + Lager; Karten-Ziele heller (.40).
  Nur das Loch nimmt Tipps. Belohnungs-Fenster gehen vor. Erklär-Schritte nur mit „Weiter“. Erklär-Teilschritte („so liest du das“, `tutE`,
  abgehakt in `tut.e`, „Weiter“ beendet den Schritt nicht): Bau-Info im Holzfäller-Fenster (Ertrag + Kosten), Angriffsleiste (Regler,
  Marschzeit, Kraft) vor dem Losmarschieren, Heldenhalle → „Helden“ → Karte des eigenen Helden (Sterne, Splitter), Aufgabe mit dem
  vollsten Balken (oder „Abholen“). Beim Warten erklärt Aldric im offenen Fenster (Burg 2: „schaltet frei“-Liste mit Rahmen; Marsch:
  Schild über den Truppen). Kampfbericht: Kampf → Berichte → „Kampfdetails“ → Erklärung der Seite (oben du, darunter die Barbaren,
  Beute; die Basen ersetzen Gefallene jede Stunde) → Weiter; die Seite liegt im Tutorial unter dem Dunkel (z 58). Ablauf: Münzen → Holz → Stein + Eisen → Edelsteine
  (je ein Schritt mit Loch; Edelsteine nur in ihrem Schritt sichtbar, `zeig`; vorher kein Knopf unten) → Holzfäller (Stadt-Knopf kommt) (+ Geschenk 2 Beschleuniger)
  → Beschleunigen → Steinbruch → Eisenmine → Burg 2 → Karte → eigenes Barbaren-Lager Stufe 1 angreifen → Kampfbericht → Beute
  abholen → neutrale Basis erobern (keine in Reichweite: nur erklärt) → Truppen
  → Heldenhalle → Helden-Kiste (+ 2 Schlüssel) → Angriff mit Held → Gratis-Kiste → Ausrüstungs-Kiste → anlegen → Rucksack →
  Burg 3 (mit Beschleuniger) → Labor + Forschung → Aufgaben. Truppen-Schritt wartet, bis der Kampf um die Basis entschieden ist (Satz:
  „Du hast N Truppen – X in deinen Basen, Y unterwegs“), Held-Schritt auch auf den Heimweg (`pendingRetreats`); Verteidiger nur mit Späher (sonst keine Zahl); Kampfbericht
  erst nach 2,5 s (`ruhe`: „Lager besiegt“ zuerst; Satz nennt Gefallene + Münzen im Abholfach). Gratis-Kiste erst, wenn der Angriff mit
  dem Helden entschieden ist. Ende: 100 Edelsteine + Kiste (`TUT_GEMS`), gleich abgeholt („Geschafft! Wie versprochen:“), danach Aldric
  „Gut gemacht … Nächstes Ziel: Burg 4 …“ und erst danach die tägliche Belohnung.
- Flüssig (11.10., Messung `scratchpad/tutflink/MESSUNG.md`): Loch springt zum Ziel (kein Gleiten über die Seite, kurzes Zusammenziehen
  nur mit scale/opacity), Glanz und Knopf-Einflug nur mit opacity/scale. Kein Loch, solange die Stadt umblendet (`cityBusy`) oder das
  Ziel/sein Fenster noch einfährt (`tutFaehrt`: laufende Animationen mit Lage-Eigenschaften); dann nach 80 ms nochmal (`tutBald`).
  Nach jedem Tipp ist das Loch verbraucht (Sperre drüber); das nächste Loch und „Weiter“ erst 300 ms nach dem letzten Tipp
  (`TUT_SPERRE`: ein Doppeltipp überspringt nichts). Ist das Loch noch nicht da (Fenster fährt ein), wirkt ein Tipp genau aufs Ziel
  trotzdem (`tutZielEl`, wird weitergereicht). Takt sonst 250 ms; `tutBald` holt den früheren Wunsch vor. Finger: in Fenstern zuerst seitlich, dann unten/oben –
  jeweils die erste Stelle, an der nichts steht (Knopf, Bild, Zahl, Text); Erklär-Löcher im Fenster oben/unten 20 px Rand.
  Überspringen sitzt in der Heldenhalle neben dem X (nicht über den Reitern).
- Sichtprüfung (`tutZeigen`): Ziele auf Karte/Stadt (`fokus`) mit Loch+Finger, sobald sie im Bild stehen (nicht unter Kopf/Leiste/Blase)
  und Karte/Stadt-Kamera ruhen; sonst gleich hinfahren (`flyTo`/`cityFocus`, max. 4×; ändert Hinfahren nichts – Bildrand –, gilt es so),
  spätestens nach 0,8 s Loch trotzdem (kein „…“ mehr; nur ab der Helden-Kiste kurz „…“, dann „Einen Moment …“). Loch nie über den
  Bildrand (nach innen geschoben). Erklär-Löcher mit mehreren Kästen im Fenster werden ins Bild gerollt, zwischen feste Leisten wie „Bauen“/„Forschen“ (`tutInsBild`); Loch nie über den Fensterrand. Knopf unten: rundes Loch; Finger nie auf Stadt-Schildern, auf der Karte von der eigenen Burg weg. Finger nie unter der Blase. Rohstoffe: Loch nur um Bild+Zahl.
- Labor: reicht es nicht für die erste Forschung (Burg 3 verbraucht die Rohstoffe), schenkt Aldric einmal genau die fehlenden
  Holz/Stein/Eisen (Beute-Fenster „Dir fehlt noch etwas – hier, von mir!“, `tut.g.f`, `gibBelohnung` holz/stein/eisen); dann Loch auf
  „Forschen“, weiter erst, wenn sie läuft. Weltrechner: Spielraum `hb.fr.r` (10d3 `hbTutRoh`: höchstens die Kosten einer ersten
  Forschung), verbraucht in `rohWacheProfil` (10d2) vor dem Stunden-Spielraum. Reicht es danach noch nicht: Aldric nennt, was fehlt, + „Weiter“.
- Bau-Teilschritte: Stadt → Schild → runder Knopf („Tipp auf „Bauen“/„Aufwerten““) → Fenster-Knopf; der runde Knopf steht unter dem
  Schild oder (kein Platz bis zur Leiste) direkt daneben (08f). Burg 2/3: großer Freude-Moment mit Bild, danach kurze Ruhe (`ruhe`).
- Angriffs-Schritte (`tutAngriff`): Satz je Teilschritt mit Zähler („2/5“): Karte → Basis → „Angreifen“ → Held-Feld/Held wählen → Losmarschieren;
  ohne freien Helden ehrlich „ohne Helden los“. Warten (Bau, Marsch): „Kurz warten – …“ mit Balken (`fort`). Hängt ein Schritt
  > 20 s ohne Ziel: „Weiter“ als Notausgang. Kein Fortschrittsband oben. Rohstoff-Schritte (`nah`): Kamera nah auf die eigene
  Hauptstadt (`tutHeim`, schon beim Willkommen), weniger abgedunkelt (`.is-hell`). Zoom-/Kompass-Knöpfe erst nach dem Tutorial (`tz-karte`).
  Neue Knöpfe: fliegen ein (0,6 s), Schild „NEU“ bis zum ersten Tipp (`tutRein`, `.tut-neuer`); neue Kapseln oben fliegen ein. Das Banner
  „Neu: …“ nur nach dem Tutorial (Burg-Stufe). Im Tutorial ruhen normale Hinweise (auch über Geschenk-Fenstern), der Edelstein-Knopf
  „Fertig für …“ ist weg; Leiste unten nur so breit wie ihre Knöpfe (Handy, `body.tut-schmal`). Burg 3: ein offener Rucksack geht zu (Desktop).
- Rohstoff-Kapseln oben, die noch fehlen, sind nur unsichtbar (`visibility`, Platz bleibt): jede Kapsel hat immer ihre normale Größe.
  Ohne freien Knopf ist die Leiste unten weg (`body.tz-leiste`); der erste Knopf blendet sie ein (`tutRein`).
- Knöpfe kommen nach und nach („Neu: …“, `body.tz-<teil>` blendet aus, Stil in 02); die Leiste unten verteilt
  auf dem Handy nur die sichtbaren Knöpfe gleichmäßig (05z, keine Lücke). Danach nach Burg-Stufe (`TUT_BURG`):
  Bündnis + Rangliste ab 4, Events (Pass, Erfolge, Ereignisse, Mitte-Leiste) ab 5, Teleport/Thron ab 6.
- Lager für Neue (09b `barbNeulingLager`, rechnet der Weltrechner): wer noch kein Lager besiegt hat und höchstens Burg 3 ist,
  bekommt eines der Stufe 1 nahe der Hauptstadt (`c.fuer`); nur er darf es angreifen (`barbFuerOk`, auch Mitspieler/Befehle).
- Profil → Einstellungen → „Tutorial noch mal“ (ohne Geschenke/Belohnung). Normale Hinweise oben ruhen im Tutorial (`body.tut-an`).
- „Überspringen“ fragt im Spiel, danach alles sichtbar. Das Welt-Namensfenster ruht im Tutorial. Tägliche Belohnung erst danach.
- Hauptbuch: Spielraum am Anfang `fr.g 100`, `fr.k 1`, `fr.bm 2`, `fr.s1 2` (Geschenke + Belohnung). Start-Rohstoffe 5.000/3.000/1.800 (aufbau.js `ROH_START`): Tutorial braucht
  4.120/2.200/1.380 + 1. Forschung – kein Warten bis Burg 3.
- Bilder: was Start und Tutorial zeigen, lädt und entpackt das Ladebild vorab (`ladebildschirm.js` `BILDER_START`, ab der Helden-Kiste
  `BILDER_BALD` gleich danach; fehlt dort noch etwas, wartet der Schritt mit „…“). Test: im Tutorial wird kein Bild nachgeladen, das
  in den Listen fehlt – neue Bilder im Tutorial dort eintragen.
- Platzhalter-Bilder: `einstieg_finger` (jetzt CSS-Pilz, Prompt in der Vorgabe), `einstieg_berater` (jetzt Helden-Kopf). Tests `tutorial_test` (390, Rest) und `tutorial_klein_test` (375×667); Warten (Bau, Marsch) spult der Test vor.

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
- Platz 1 = Herrscher eine Woche (`rulerOwner()` = `thronHerrscher()`): +25 % Ertrag, Skin `skin_herrscherburg` (Krone im Bild) auf der Karte,
  Rahmen `king` (ui_herrscher_rahmen), vergibt Titel (Feldherr +5 % Angriff, Burgvogt +5 % Verteidigung, Schatzmeister +10 % Ertrag,
  Narr −5 % Marschtempo; Abzeichen über dem Namensschild, `drawTitleBadges`), verschenkt 2 epische / 5 große / 10 Kisten
  (`herrKiste`, Befehl `thronKiste`; nicht an sich selbst; Mitspieler-Herrscher verschenken selbst, Bündnis zuerst).
- Events-Fenster Chip „Thron“ (`evThronHtml`, grüner Punkt = läuft), Herrscher-Fenster `#herrPopup` (`renderHerr`). Thron-Shop und
  Thron-Punkte als Währung sind weg; `earned`/`tpEarned` zählen nur noch für Saison-Rangliste und Erfolge. Pass gibt statt 150
  Thron-Punkten 150 Event-Münzen.
- Herrscher-Ansage (`herrAnsage`, 06c): nach der Auswertung bis 2 Tage lang einmal je Spieler großes Banner mit Krone „Neuer
  Herrscher: <Name>“ (`openWaterHerrGesehen` im Profil). Test `features_test`.
