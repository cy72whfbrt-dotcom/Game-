# Bündnis

Bündnisse wie in Rise of Kingdoms – für echte Spieler und Mitspieler mit gleichen Regeln: Gründen, Beitreten, Einladen,
Chat, Hilfe, Verstärkung, Rally, Geschenke, Tempel-Bonus, Gebiet. Wichtigste Dateien: `Game/buendnis/` (4 Teile →
`buendnis.js`): 01 daten-regeln (`BUND`, `bundOp`, Verstärkung `verstMoeglich`), 02 rally-geschenke (Rally, `kampfAnteile`,
`rallyWerte`), 03 mitspieler (`bundMitspielerRunde`, `bundRallyPlan`, `bundTreffpunkt`), 04 fenster-karte-welt (Fenster).
Welt-Teile `openWaterBuendnisse`, `openWaterBundChat`, `openWaterVerstaerkung`; Befehl `bund` mit `op` (Weltrechner prüft alles).

## Grundregeln
- Höchstens 5 Mitglieder (`BUND.MAX`, Alexander 3.10.). Name 3–20 Zeichen, Kürzel 2–4, Farbe + Wappen-Zeichen, offen oder
  „nur auf Anfrage“. Gründen 20.000 Münzen (`BUND.KOSTEN`, zu wenig → „Fehlt: … Münzen“).
- Mitglieder greifen sich nicht an (Angriff, Armee, Feld gesperrt); kommt ein Angriff an, wenn das Ziel inzwischen einem
  Mitglied gehört, gehen die Truppen heim. Tore von Mitgliedern sind für alle Mitglieder frei.
- Nach dem Verlassen 1 Std. kein neuer Beitritt. Geht der Anführer, führt das stärkste Mitglied.
- Ohne Bündnis: EINE Startseite (Einladungen, Vorteile, alle Bündnisse mit Beitreten), darunter „Bündnis gründen“ (eigene
  Seite mit Wappen-Vorschau).

## Einladen, Anfragen, Tauschen
- Nur der Anführer lädt ein: im Profil, an der Basis („Einladen“) oder in „Suchen“ (Liste „Ohne Bündnis – einladen“).
  Gilt 24 Std., höchstens 10 offene. Annehmen löscht alle anderen Einladungen/Anfragen.
- Volle Bündnisse: Bewerben trotzdem („Anfragen“); der Anführer kann „Tauschen“ (Mitglied entfernen → Bewerber kommt).
  Mitspieler-Anführer tauschen nur bei > 1,5× Stärke und entfernen nie einen echten Spieler.

## Chat (feste Sätze, kein freier Text)
- Fragen: Wir greifen an? · Wo? · Wann? · Rally? · Bin zu weit weg – machst du eine Rally? · Brauche Hilfe! · Wer ist online?
  Antworten: Ja · Nein · Bin dabei · Jetzt! · Später · Bin unterwegs · Bin online · Danke! · Gut gemacht! ·
  Ja, ich starte die Rally! · Bin zu weit weg · Kein Weg dorthin – ein Tor ist zu · Starte du die Rally – ich trete bei!
  Knöpfe werden aus `BUND_CHAT` gebaut (neuer Satz = automatisch Knopf).
- Ort teilen: Basis antippen → „Im Chat teilen“ (mit „Zeigen“); Kampfbericht teilen: „Im Bündnis teilen“.
- Meldungen des Spiels im Chat: beigetreten/raus, Rally gestartet, Hilferufe, Rally gegen ein Mitglied („Gefahr!“),
  Verstärkung heimgeholt. Höchstens 80 Zeilen je Bündnis, 1 Zeile pro 1,5 s; nur das eigene Bündnis liest mit (Server).
- Signal „Rückzug!“ (Inselfenster → Bündnis): Mitspieler kehren um; echte Spieler bekommen eine Nachricht.

## Hilfe und Verstärkung
- Verbündete helfen von selbst, wenn ein Mitglied (auch ein echter Spieler, auch an der Hauptstadt) angegriffen wird oder
  eine Rally gegen ihn sammelt (`bundMitspielerSignale`, `bundUnterAngriff`): Botschaft mit Platz, Helfer online, freier
  Marsch-Platz, kommt rechtzeitig an. „Brauche Hilfe!“ ohne Botschaft: „Hilfe braucht eine Botschaft (ab Burg-Stufe 5)“.
- Verstärkung: Basis eines Mitglieds antippen → „Verstärkung“ (jederzeit). Braucht dort eine Botschaft; Platz =
  Botschaft-Stufe × 10 % der eigenen Truppen des Gastgebers (mind. Stufe × 20.000), der Weltrechner schickt höchstens so
  viele, wie passen. Die Truppen bleiben deine („Heimschicken“ / „Zurückholen“, Basis antippen → „Verstärkung hier“).
  Mitspieler holen ihre nach 30 ruhigen Min. heim. Kampf-Regeln: `maersche-kampf.md`.
- Bündnis-Hilfe beim Bauen/Forschen: `stadt-burg-gebaeude.md`.

## Rally
- Regeln und Kampf: `maersche-kampf.md` (Abschnitt Rally). Mitspieler starten Rallys auf große Ziele, auch auf die Mitte
  (neutrale Tore, Wächter-Tempel, freier Thron – Thron vor Tempel vor Tor, innen vor außen; `bundRallyPlan`, `bundRallyReiz`),
  schicken nach Lage (`bundRallyLage`, mind. 40 %).
- Gemeinsam vorrücken (`bundTreffpunkt`): Treffpunkt = Schwerpunkt der Mitglieder 40 % näher am Thron; bei Ärger hinten
  (`bundAerger`) liegt er dort.

## Geschenke, Tempel-Bonus, Gebiet, Thron
- Geschenk: Boss besiegt oder große Kiste im Shop (ab 500 Edelsteinen, nur mit echter Ausgabe im Hauptbuch `hb.kaufG`) →
  alle anderen Mitglieder bekommen ein kleines Geschenk ins Abholfach (5 % einer Stunden-Produktion, selten graue/grüne
  Kiste). Höchstens 5 je Mitglied/Tag, Kisten-Geschenke 3 je Geber/Tag. Nachricht `bundGeschenk` (nie Edelsteine/Splitter).
  Kisten-Beleg (`hbBelegNeu`/`hbBelegGems` 10d3, `gAusMerken` 10d2): Splitter und ausgegebene Gems dürfen in getrennten
  Profilen kommen (innerhalb 10 Min. `KISTE_FRIST`); Splitter ohne Gems warten höchstens 60 s (`warte`), Gems zählen nur einmal.
- Tempel-Bonus: hält ein Mitglied einen Tempel, produzieren alle mehr: +2 % je Tempel, Mega-Tempel +5 %, höchstens +12 %
  (Forschung „Tempel“ +10 % je Stufe darauf).
- Gebiet: Basen färben die Karte zart; Mitglieder 10 % schneller zu Bündnis-Basen und in Gebieten mit ≥ 40 % Bündnis-Basen.
- Thron-Event: Halter 30, jeder mit Verstärkung im Thron 15 (nur beim verbündeten Halter, `THRONE_PTS_VERST`); Wachtürme schießen nie aufs eigene Bündnis.
- Profil zeigt das Bündnis (Wappen + Name, antippen öffnet es).

## Tests
`bund_rueckzug_test`, `rally_warnung_test`, `verst_heim_test`, `bund_bericht_test`, `thron_verst_test`, `hilfe_auto_test`,
`verst_kampf_test`, `rally_maut_test`, `rally_jeder_test`, `rally_name_test`, `bund_mitte_test`; Server: `verst_test`.
