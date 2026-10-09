# Übergabe (Stand 9.10. abends)

Erst lesen: `CLAUDE.md`, dann `doku/INDEX.md`. Offene Punkte: `doku/merkliste.md`.

## Stand
- Haupt-Branch `claude/neues-projekt-8agldl` = alles fertig + geprüft (komplett.sh + Server-Tests mit MariaDB grün,
  letzte Funde behoben). **Live: NICHTS hochgeladen** – Hochladen + Welt-Neustart erst, wenn Alexander es sagt
  (beim Hochladen alte `baukunst.js` auf dem Server löschen, danach `werkzeuge/nach_hochladen.sh`).
- Neu seit 8.10.: Wochen-Event Mo–Fr (Tages-Kisten, Rangliste Fr 20 Uhr), Thron-Event Sa 10–So 22 (Kuppel, Türme,
  Herrscher, Titel, Kisten), Lager neu (feste Münzen + Schlüssel, Tagesgrenze 2,5 Mio), Shop (Kisten 1×/10×, Event,
  Tempo, Gratis-Kiste 8 Std.), Schlüssel/Beschleuniger/Event-Münzen, Rucksack-Raster, Marsch-Plätze über Labor,
  neuer Kampfbericht, Hauptstadt-Bilder je Stufe, Herrscherburg, Burg-Münzkosten höher, Aufgaben 60 Edelsteine,
  Push „Thron startet“/„Tages-Kiste bereit“, Herrscher-Ansage, Code-Check-Fixes, alter Code raus.
- MariaDB + Test-DB `owtest` im Container eingerichtet (Zugang nur lokal in scratchpad, nie ins Git;
  im neuen Container neu einrichten, siehe Kopf `tests/server_tests.sh`).

## NÄCHSTER SCHRITT (wichtigste Aufgabe, Alexander 9.10.)
Freunde (Erwachsene + Jugendliche) testeten ca. 1 Std.: „unübersichtlich, viel zu viel auf der Karte, wissen nicht
was tun“. Verwirrt hat ALLES: volle Karte, zu viele Knöpfe/Fenster, kein klares Ziel. Die Anleitung unten (Schritt x/7)
haben sie gar nicht wahrgenommen. Es fängt SCHON BEIM REINKOMMEN an (Ladebild, Login, erster Bildschirm: „viel zu viel“) – dort beginnen. Plan „Erste Stunde neu“: (1) Spieltester spielt als völlig neuer Spieler und notiert
jede Verwirrung, (2) Designer: wie machen RoK/Whiteout die erste Stunde, (3) Test-Datei neuer Anfang: Karte klein mit
Nebel (nur eigene Burg + 3–4 Ziele), EIN Ziel oben groß mit Pfeil statt Leiste unten, Knöpfe/Events/Shop/Bündnis/Helden
erst nach und nach freischalten („Neu: …“), fremde Basen weit weg nur als Punkte. Alexander zeigt es dann den Freunden.

## Offene Fragen an Alexander (Empfehlung jeweils A)
- 25 Gratis-Kiste-Inhalt: 60 % Beschleuniger 5 Min, 30 % 10 Edelsteine, 10 % 1 Schlüssel – A so / B mehr.
- 26 Roter Punkt am Shop-Knopf, wenn Gratis-Kiste bereit – A ja.
- 27 Bauzeit Burg 11–20 geglättet (1/1,5/2/3/4,5/6,5/9/13/17,5 T) – A so lassen / B nur Burg 14.
- 28 Pass-Tor-Symbole ganz weit größer – A ja.
- Kampfbericht: Bilder für Feind-Wappen + VS fehlen (Prompts: scratchpad/kampfbericht/PROMPTS.md – im neuen Chat neu schreiben).

## Später (Merkliste)
Helden-Event, Namensschild-Skins, Tages-Kisten-Bilder je Tag, Wachturm-Fahne in Bündnisfarbe, Ladebild mit Thron.

## Arbeitsweise, die gut lief
Test-Datei zuerst → Alexander sagt Ja → 2–3 Programmierer parallel (Worktrees) → Zusammenführer → Spieltester +
Endprüfer am Ende. Gemeinsame Namen vorab in einem Bauplan festlegen.
