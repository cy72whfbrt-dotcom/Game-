# Übergabe an den neuen Chat (Stand 8.10., ca. 10 Uhr UTC)

Erst lesen: `CLAUDE.md` (Regeln, Agenten-Firma, Tempo-Regeln A–E), dann `doku/INDEX.md` und nur die passende Themen-Datei.
Offene Punkte: `doku/merkliste.md`. Entscheidungen: `doku/entscheidungen-alexander.md`.

## Stand
- Branch `claude/neues-projekt-8agldl` = HEAD auf GitHub, alles gepusht. **Live ist NICHTS hochgeladen** (Live-Server soll
  in Wartung bleiben, bis das Spiel besser ist – Alexander schaltet Wartung selbst in admin.php).
- Vorschau (Testversion, viele Truppen, 100.000 Edelsteine): https://claude.ai/artifact/XPoQzPd5cwov4ybQTTWN93
  (Neu veröffentlichen: Vorschau bauen, Reset-Skript mit neuem Schlüssel `owVorschauStand` vor `klein/ladebildschirm.js`
  einfügen, Artifact-Publish mit `url` + `root` + `files` – nur geänderte Dateien, ≤ 255 je Publish).
- Marsch-Testdatei (nur Aussehen): https://claude.ai/artifact/W24RFZRHiZXP89Gggjsdtz (`werkzeuge/marschtest/`).

## Heute fertig (8.10.)
- Marsch/Kampf-Aussehen wie RoK im Spiel (Teil `03f-marsch-bilder.js`, Bilder `marsch_*.webp`): Sechseck mit Held, Chip
  Truppen·Restzeit, Trupp-Bilder, gemeinsamer Kampf mit Tafel, Gegner-Verstärker sichtbar, Wartender mit Sanduhr, Rally,
  Sammeln, Späher, Rückweg, Antipp-Knöpfe, Kampf-Szene am Feld (Sammler angegriffen). Spieltest-Funde F1–F6 behoben.
- Kampf-Logik geprüft: `tests/browser/kampf_faelle_test.js` (Fälle 1–9 aus Alexanders Liste klappen; Fall 10 „Verbündeter
  hilft beim Sammeln“ = Alexander B, so lassen).
- Entscheidungen: Start 10.000 Münzen; Verlegen-50 raus (nur Teleport 500 / Teleporter, auch Mitspieler); Premium-Pass wird
  bei neuer Saison zurückgesetzt; Stufen-Truppen = 1 Tag Ertrag; Mitspieler sparen (Teleport/Pass/Baumeister) und bekommen
  dieselbe Tagesaufgaben-Belohnung; neutrale Basen ohne Namensschild (nur Bild + kleine Stufe).
- 3D-Burg (baukunst) komplett raus; Testlauf zählt Abstürze jetzt als rot; Doku in `doku/` aufgeteilt.

## Nächste Schritte (Alexander hat alles freigegeben: „mach es so, dass alles klappt, besser und schneller“)
1. **Code sortieren (Merkliste 36e):** Teile nach Thema benennen (`marsch-…`, `kampf-…`, `helden-…`), große Teile aufteilen
   (`10d-welt-weltrechner.js` 1.400 Z.), irreführende Namen (`03b-gebaeude-3d` → Basen-Bilder, Teleport aus `08d`),
   KARTE.md nach Themen passend zu `doku/`. Danach alter/unnötiger Code raus (36d), kompletter Code-Check (36b).
   EIN großer Programmierer-Auftrag (Regel C), danach nur betroffene Tests (Regel B).
2. Merkliste 36a: neues Home-App-Bild (Startbildschirm) + App/Download erneuern → Bild-Prompt für Alexander schreiben.
3. Designer: Marsch-Gedränge auf kleinem Handy ansehen (Köpfe fehlen kurz / weit weg mit Strich).
4. Endprüfung vor dem Hochladen: `tests/komplett.sh` + Server-Tests mit FRISCHER Test-DB (`tests/server_tests.sh`) –
   nächtlicher Server-Testlauf war wegen Testumgebung unbrauchbar. Spieltester mit lokalem Server für Bündnis-Fälle
   (Verbündeter tritt bei – in der Vorschau ohne Server nicht prüfbar).
5. Erst dann Alexander fragen: Hochladen + Welt-Neustart (neue Karte braucht neue Welt; alte Welt-IDs passen nicht).
   Nach dem Hochladen: `werkzeuge/nach_hochladen.sh`, Live-Wächter-Routine trig_01Qoa3CR2p5twrXZEv5Uvahh wieder aktivieren,
   alte `baukunst.js`/`klein/baukunst.js` auf dem Server löschen.

## Offene Fragen an Alexander
- 7 Bild-Prompts aus der Nacht (Burg-Marken, gesperrte Heldenhalle, Sieg-Band, Pergament, Ersatz-Symbole, Markt …):
  `scratchpad` ist im neuen Chat weg → Designer schreibt sie bei Bedarf neu (Prompt-Regeln in `doku/oberflaeche-design.md`).
- Ideen-Liste (13 Vorschläge, z. B. Saison-Fahrplan, Handy-Nachricht „Pass offen“) – neu sammeln, wenn Alexander will.
- Langfristig: Server speichert keine Kartenversion zur Welt (alte Welt käme mit alten IDs durch) – mit dem Welt-Neustart
  erledigt, später Version mitspeichern.
