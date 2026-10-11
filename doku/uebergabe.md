# Übergabe (Stand 11.10. abends)

Erst lesen: `CLAUDE.md`, dann `doku/INDEX.md`. Offene Punkte: `doku/merkliste.md`.

## Stand
- Haupt-Branch `claude/neues-projekt-8agldl` = `claude/stoic-lovelace-m0udyj` = a552a38, alles gepusht.
  **Live: NICHTS hochgeladen seit 8.10.** – Hochladen nur auf Alexanders Wort (alte `baukunst.js` dann löschen,
  danach `werkzeuge/nach_hochladen.sh`).
- Vorschau-Link für Alexander (Artifact, ohne Server): https://claude.ai/artifact/RPHX5uc6azfwmp8z1LWpPc – nach jeder
  Änderung neu bauen (`php werkzeuge/vorschau_bauen.php <scratchpad>/spiel_pub`) und mit derselben Datei-Liste neu
  veröffentlichen (index.html + spiel/bots/buendnis/aufbau/ladebildschirm.js und klein/…; Bilder nur wenn neu).
- Tutorial Burg 1–3 fertig (10c2, Drehbuch in `doku/events-pass-aufgaben.md`): Willkommen + Name, Aldric-Blase ruhig
  (feste Seite je Lage), Erklär-Teilschritte, Kampfdetails, Forschung mit Rohstoff-Geschenk (Variante B, Hauptbuch
  `hb.fr.r`), Burg-Feier, Ende 100 Edelsteine + „Nächstes Ziel: Burg 4“. Bilder vorladen im Ladebild (`BILDER_START`/`BILDER_BALD`).
- Fenster-Fixes der Testspieler (Tagesbelohnung, Grammatik „Epische Waffe“, keine Turm-Nummern, Shop-„Wirklich?“-Knopf
  bleibt beim Neuzeichnen, Aufgaben-Stufen-Fehler).
- **Prüfweise (Alexander 11.10.):** Nie nur per Code ins Loch tippen. `tests/browser/tutorial_mensch_test.js` tippt wie ein
  Mensch (Touch, Pausen, daneben/doppelt). Bei Oberflächen-Änderungen 3 Testspieler-Agenten (Lena 15 / Herr Becker 52
  iPhone SE / Deniz 27 RoK) spielen NUR nach Bildschirmfoto (kein DOM), Tagebuch + Funde an den Programmierer.

## NÄCHSTER SCHRITT (Alexander 11.10.: „Dann verbessere es“)
Zwei Agenten gleichzeitig, danach Testspieler-Runde, dann Link aktualisieren:
1. **„Nächstes Ziel“-Leiste** nach dem Tutorial (oben links, immer sichtbar, Tipp führt hin; Ziele aus vorhandenen
   Aufgaben/Burg-Stufen, keine neuen Regeln).
2. **Karte lebendig:** eigene Hauptstadt hervorheben (Merkliste 11c Nr. 17), Basen je Stufe unterscheidbar
   (KI-Bild-Prompts an Alexander), kleine Übersichtskarte/Orientierung. Design-Aufgabe → zuerst Designer (Vorbilder).
Danach (wenn Alexander will): Hochladen + Freunde zusammen testen lassen; dann Wirtschaft (3) und Bündnis früh zeigen (4).

## Offene Fragen an Alexander
- Wirtschaft: Aufgaben geben Holz+Stein statt Münzen (RoK-Art)? Analyse: merkliste.md „Fragen“.
- Bilder: einstieg_finger, einstieg_berater (Prompts in Designer-Vorgabe; Finger-Prompt im Chat gegeben), Feind-Wappen + VS.

## Bekannt
- `sicherung_test.php` rot ohne MariaDB (im neuen Container MariaDB neu einrichten, Kopf `tests/server_tests.sh`).
- Sicherheitslücke: Hauptbuch zählt keine Bauarbeiter-Plätze (merkliste).
