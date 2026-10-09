# Kampfbericht – jedes Feld heute (05d + 01a/01e/08c) → Platz im neuen Bericht
Quelle: Game/spiel/05d-marsch-liste-kampfbericht.js (renderCombatLog `attack`/`botAttack`, kampfGearHtml, kampflogUmbauen), 01a (verstZeilen, angreiferZeilen, logBalance, beuteChips), 01e (attackParts, defenseParts, heroDefPart), 08c (Helden-Zeilen).

| Feld heute | Code | Neuer Platz (Abschnitt) |
|---|---|---|
| Badge Sieg/Niederlage/Verteidigt/Verloren/Geplündert | karte(...) badge | 1 Band oben (Text im Band) |
| Ziel-Name, „von <Quelle>“, „Rally mit X“ / „N Angreifer“ | karte title/sub | 1 unter dem Band |
| Zeit „vor 12 min“ | timeAgoLabel | Kopfzeile (Overline) |
| Koordinaten + „Zeigen“ + „Im Bündnis teilen“ | logOrt, bundTeilenKnopf | 1 Ort-Zeile mit 2 kleinen Knöpfen |
| Kräfte-Balken Angriff gesamt vs Verteidigung gesamt, Namen aller Angreifer/Helfer | logBalance + umbauen | 2 Kräfte-Balken |
| Verlust-Chips, „X übrig“, „X fliehen heim“, „Hauptstadt brennt“ | verlustChips, beuteChips | 4 Truppen + 1 Band-Unterzeile (Hauptstadt brennt) |
| Angreifer: Truppen (alle), je Rally-Mitglied Truppen + gefallen/verwundet | angreiferZeilen | 3 Seiten-Karten + 8 Rally/Verstärkung |
| Verteidiger: Truppen (alle), Besitzer eigen, je Verstärkung Truppen + gefallen/verwundet | verstZeilen | 3 + 8 |
| Fähigkeit Angriff (Stufe, +%) | attackParts | 5 Kampfkraft Angreifer, mit Quelle |
| Held(en) Angriff +%, Gefolge, Wut gezündet | attackParts | 5 Kampfkraft Angreifer |
| Titel (Mega-Tempel ±%) | attackParts / defenseParts | 5 beide Seiten |
| Forschung Angriff / Verteidigung (+% Kampfkraft) | attackParts / defenseParts | 5 beide Seiten |
| Grundverteidigung (Basis Stufe L) | defenseParts / normal() | 5 Verteidiger |
| Rüstung (Ausrüstung) | defenseParts | 5 Verteidiger |
| Fähigkeit Verteidigung (Stufe, % der Truppen) | defenseParts | 5 Verteidiger |
| Mauer (+% Stadt) | defenseParts | 5 Verteidiger |
| Verstärkung: eigene Werte | defenseParts | 5 Verteidiger |
| Verteidigungs-Held aus der Mauer (Angriff %, Gefolge) | defenseParts | 5 Verteidiger + 6 Helden |
| Malus: Held senkt Verteidigung (Rammbock …) −% | heroDefPart | 5 Verteidiger, rot |
| „Eigene Werte“ (Rally-Anteil), „Held dabei/+0“ | seiteUmbauen/heldZeile | 5 je Seite |
| Gesamt (grün = stärker) | logSum advantage | 5 Summe + 2 Balken |
| Gefallen, Verwundet, Geflohen | logCasualty | 4 Truppen |
| Verluste gespart: Schild −%, Held −% Verluste | lossSaved | 4 Truppen (Zeile „gerettet“) |
| Verwundete → Krankenhaus (eigene + Gegner) | logWounded | 4 Truppen-Zeile „Lazarett“ + 10 Hinweise |
| Geflohene kehren zurück | logRetreat | 4 + 10 |
| Spieler-Stufe, Titel | kampfGearHtml Head | 3 Seiten-Karte + 7 |
| Ausrüstung 4 Plätze (Waffe/Rüstung/Schild/Stiefel), Seltenheit, Stufe, Sterne, leer | kampfGearHtml tiles | 7 Ausrüstung (Bild-Kacheln) |
| Hauptheld + Zweitheld: Bild, Name, Sterne, Seltenheit, gezündet / nicht, Zweitheld 50 %, Verteidigungs-Held | kampfGearHtml heroes | 6 Helden |
| Held-Zeilen: Angriff %, Verteidigung −% Verluste, Gefolge, Tempo, Fähigkeiten (inkl. Wut), Paar-Bonus | 08c fx.lines | 6 Helden (je Held Liste) |
| „Kein Hauptheld / Kein Zweitheld“ | leerHeld | 6 leere Plätze mit „?“ |
| Fähigkeit Angriff/Verteidigung Stufe, Mauer, Krankenhaus, Heldenhalle | logGearMeta | 7 Stadt & Fähigkeiten |
| Rohstoffe je Seite (Münzen/Holz/Stein/Eisen ±) als Kacheln, je Rally-Anteil | normal() kl-rss | 9 Beute / Geraubt |
| Burg schützt X Münzen · Y je Rohstoff | normal() schutz | 9 |
| Angriff: Münzen für getötete Truppen / Verteidigung: Münzen | killGold, defGold | 9 als Kachel |
| Kampfrunden/Verlauf | – gibt es im Spiel nicht | – (nicht erfinden) |
| Späh-Teile (Basis, Rohstoffe zu holen) | spaeh*() | nur Spähbericht, nicht im Kampfbericht |
