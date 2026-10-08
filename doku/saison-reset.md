# Welt-Saison und Reset

Alle 8 Wochen beginnt eine neue Saison: die Karte wird neu, die Hauptstadt bleibt. Wichtigste Dateien:
`Game/spiel/09f-saison.js` (`saisonTakt`, `saisonWelt`, `saisonNeu`, `SAISON_PREISE`, `saisonAnfang`), `01a-grundlagen.js`
(Reset am Handy), `10d3-welt-hauptbuch.js` (`WELT.saisonKonto`, Hauptbuch), `server/` (`sicherung_anlegen`,
`saison_anhalten`), `admin.php` (Karte „Welt-Saison“). Welt-Teil `openWaterSaison` = `{ nr, start, ende, bald, jetzt, last }`.

## Termin
- Ende = Start + 8 Wochen, immer Sonntag 18 Uhr Berliner Zeit (`saisonEnde`, `berlinUm`), vor dem Drachen um 19 Uhr.
- Admin-Knopf „Neue Saison jetzt beginnen“ (mit Rückfrage) → Befehl `admin/saison`.
- Vorher immer eine Sicherung (Puls `sicherung: 1` → `sicherung_anlegen()`), sonst neuer Versuch nach 1 Min.;
  die Saison-Sicherung bleibt 2 Wochen (`ow_sicherungen.behalten_bis`, `SAISON_SICHERUNG_SEK`).
- 3 Tage vorher: Nachricht `saisonBald` (Text nach echter Restzeit) + Countdown-Leiste; im Events-Fenster oben nur in den
  letzten 3 Tagen (oder angehalten), sonst unten im Wochen-Event.

## Was bleibt / was geht
- **Bleibt:** Hauptstadt (Burg, alle Gebäude, Forschung), Helden mit Fähigkeiten, Ausrüstung, Edelsteine, Holz/Stein/Eisen
  (unverändert), alles Gekaufte, Abholfach, Aufgaben/Erfolge, Thron-Punkte bis 20.000.
- **Neu/weg:** alle anderen Basen (Karte wieder neutral), Truppen (5.000 Start, in der Hauptstadt), Münzen (10.000 Start),
  Stufe 1 + alle Fähigkeitspunkte, Verwundete, Bündnisse (aufgelöst), Märsche, Späher, Rallys, Verstärkungen, Armeen,
  Felder, Tempel-Titel, Kopfgeld, Tor-Einstellungen, Nebel, Kampfberichte, Saison-Pass (Fortschritt + Premium),
  Lager-Fortschritt (wieder ab Stufe 1), verlegte Basen (`openWaterInselOrt`).
- Thron-Punkte über 20.000 (`SAISON_TP_MAX`) werden 10 : 1 zu Edelsteinen ins Abholfach (`hbThronReset`).
- Hauptstadt zieht auf einen freien Zufallsplatz am Rand (Zone 1). Mitspieler genau wie echte Spieler.
- 48 Std. Anfängerschutz für ALLE echten Spieler und Mitspieler (`neuBis`, Nachricht `saison` bringt ihn mit).
- Pässe öffnen wieder ab Tag 1 (neuer Welt-Start, siehe `karte-zonen-paesse.md`).

## Preise
- Top 10 nach Macht (`powerOf`): Edelsteine 3.000 / 2.000 / 1.500 / 4.–10. je 500 (`SAISON_PREISE`, Alexander 5.10.).
- Saison-Rahmen (= Titel + Ring): Platz 1 „Saison-Champion“, 2–3 „Saison-Großadmiral“, 4–5 „Saison-Admiral“, 6–10
  „Saison-Kapitän“ – nur bis zum nächsten Saison-Ende (abgeleitet aus `saison.last.top`). Vergeben merkt sich nur der
  Weltrechner (`botState[id].sTitel`) – ein Handy kann sich keinen vortäuschen.
- Preise gehen erst NACH der Nachricht `saison` raus (feste Nummer, nie doppelt).

## So kommt der Reset aufs Handy
- Weltrechner schickt erst alles Geschuldete (`deltaJetzt`), dann Nachricht `saison` (eindeutig je Reset
  `'saison|' + nr + '|' + Zeitpunkt`), dann die Preise. Das Handy verbucht, merkt `openWaterSaisonNeu`, hält an
  (`WELT.saisonHalt`), lädt neu und setzt den eigenen Stand zurück; Offline-Spieler beim nächsten Einloggen.
- Rückfall (`saisonNachholen`): kam keine Nachricht (z. B. 60 Tage offline), übernimmt das Handy den Reset trotzdem.
- Profil aus einer älteren Saison und alte Befehle zählen beim Weltrechner nicht (`openWaterSaisonMein`).
- Hauptbuch (`WELT.saisonKonto`): Stufe 1, Münz-/Verwundeten-Konto auf Start, Server-Nebel neu; Edelstein-/Rohstoff-Konten
  bleiben. Prüfer bekommt eine neue Grundlinie (`__prVorher`).

## Zurückspielen einer Sicherung
- Das Handy merkt seinen alten Stand (`openWaterSaisonVorher`); ist die Saison der Welt danach älter, holt es ihn zurück.
- Zurückspielen hält einen fälligen Reset an (`openWaterSaison.halt`); dann passiert nichts, bis der Admin den Knopf drückt
  (Events: „Neue Saison: der Termin folgt“).

## Einmalige Ausnahme (6.10., schon gelaufen)
- Erster Reset nach dem 6.10.: Burg max. 4 (`BURG_FAIR`, Merker `saison.burgFair`), Edelsteine genau 1.000, Holz/Stein/Eisen 0.
  Spätere Resets: alles wie oben.

## Tests
`saison_test`, `saison_anfang_test`, `welt_test` (Termin Sonntag 18 Uhr über Sommer-/Winterzeit), `server_test`.

## Offen (Merkliste 11c, Reset 6.10.)
- Nr. 2 Spawn nach dem Reset auch innen? · Nr. 4 Pass-Reset (seit 8.10. gebaut: Punkte, Stufen, Premium – live prüfen) · Nr. 5
  Event-Punkte/Ranglisten · Nr. 8 Eroberungs-Rangliste + Thron-Punkte-Kappung bei Mitspielern prüfen.
