# Märsche und Kampf

Alles über Losschicken, Marschwege, Ankunft, Kampf, gemeinsame Kämpfe, Rally-Kampf, Verstärkung im Kampf, Beute und
die Marsch-/Kampf-Anzeige. Wichtigste Dateien: `Game/spiel/02b-marsch-losschicken.js` (`launchAttack`, `marschStrecke`,
`marschPlatz`), `02c-marsch-spaeher-ankunft.js` (`resolveAttack`, Späher), `04-kampf-ankunft.js` (Ankunft, `kampfDazu`, `welleHeim`,
`kampfAufraeumen`), `05d-marsch-liste-kampfbericht.js`, `07a-kampf-schlachten.js`, `03d`/`03f-marsch-bilder.js`,
`bots/02-kampf-karte.js` (`resolveBotAttack`), `buendnis/02-rally-geschenke.js` (`rallyWerte`, `kampfAnteile`).

## Losschicken
- Arten: Angriff, Senden (eigene Basis), Mehrfachangriff (bis 10 Ziele, ◆5)/„Truppen sammeln“ (◆1); je zusammen als EIN Marsch-Platz, Kennung `grp`,
  nur vom selben Ort und zur selben Basis, innerhalb 60 s), Sammeln (Feld), Lager/Tagesboss/Drache/Invasion, Armee, Rally,
  Verstärkung, Späher.
- Marsch-Plätze: 2 + Stufe der Labor-Forschung „Marsch-Plätze“ (`x_marsch`, Labor 5/10/16/22 → höchstens 6), geprüft in `marschPlatz` für dich, Mitspieler und beim Weltrechner.
  Rückwege zählen nicht.
- Startbasis eines Angriffs (`angriffStart`, 10b): die nächste eigene Basis mit GENUG Truppen (wie die Vorschau gerechnet,
  ohne Held); reicht keine → die mit den meisten; ungespäht → die nächste mit Truppen. Im Angriffsfenster änderbar.
- Laufzeit = Weglänge (Pässe, kürzester Weg) ÷ Tempo, 6–60 s (`travelDurationSeconds`, `MAX_ATTACK_SECONDS` 60);
  Tempo-Boni: Held, Forschung Marschtempo (I + II), Bündnis-Gebiet +10 %.
- Losgeschickt steht der Marsch sofort auf der Karte (`vorlaeufigeMaersche`), bis der echte vom Weltrechner da ist.
  Lehnt der Weltrechner ab (Plätze voll, Tor zu, Maut, Schild, kein Weg), kommt eine Meldung mit Grund.

## Unterwegs
- Jeder Marsch: hin „Zurück“ (kehrt um, braucht heim so lange wie schon gelaufen) + „Schneller“; heim nur „Schneller“.
  Gilt auch für Späher, Lager, Tagesboss, Drache, Invasions-Armee, Sammler. Rally-Märsche nie zurück, im Kampf nicht.
- „Schneller“ = Restzeit halbieren, 1 Edelstein je angefangene Restminute, ab 500 „Wirklich?“ (`gemsWirklich`);
  „Alle schneller“ nimmt alle mit. Weltrechner-Befehle `zurueck`/`schneller` (`spaeherVon` für Späher).
- Ein Marsch am Ziel zeigt „wird ausgewertet …“ statt 0:00 (`marschUhr`).

## Ankunft und Kampf
- Sieg nur, wenn Angriff > Truppen + Verteidigung des Ziels. Sieger verliert die Verteidigung; Verlierer: Flucht (20 %
  bzw. Held) heim. Kampfdauer `fightDurationMs` (4–12 s).
- Ziel inzwischen eigen/Bündnis/Schild/kaputt: kein Kampf, die Welle läuft den Weg zurück (`welleHeim`) bzw. zieht ein
  („… gehört schon dir – N Truppen verstärken die Besatzung“). Fiel die Ziel-Basis vor der Ankunft einer Sendung:
  sichtbarer Rückmarsch + Meldung.
- Ein Ziel, ein Kampf (`kampfDazu`): Wellen desselben Angreifers oder eines Bündnis-Mitglieds gehen in den laufenden
  Kampf (Kampf mind. noch 2,5 s). Eigene Wellen aus mehreren Basen merkt `quellen`: die Überlebenden gehen jede zu IHRER
  Basis heim (`kampfHeimTeile`; Spieler-Vorschau `heimWellen` in `resolveAttack`). Fremde warten vor dem Ziel und kämpfen danach gegen den neuen Besitzer.
- Jeder für sich (Alexander 5.10., verbindlich): jeder bringt höchstens 2 Helden (Haupt + Zweit), seine Truppen und
  seine Werte (Fähigkeit, Titel, Forschung, Schild) – alles zählt NUR für seine Truppen. Verluste nach Truppenzahl,
  Verwundete in das EIGENE Krankenhaus (mit eigenem Held), Gold für Kills mit eigenem Satz, Erfahrung/Wochen-Punkte
  nach Anteil. Der Erste ist Anführer und erobert; die anderen gehen mit ihrem Anteil heim (`kampfHeimTeile`,
  `fight.quellen` je Basis).
- EP: höchstens ¼ der eigenen Stufe pro Kampf und × (Gegner-Stärke / eigene Stärke), max. 1 (`kampfEp`).
- Fehler mitten im Kampf: Verstärkung wird getrennt, Rally-Truppen gehen heim (`kampfAufraeumen`), nie doppelt.
- Tests: `kampf_faelle_test` (alle 11 Fälle mit Truppen-Bilanz: geschickt = heim + Basis + gefallen + verwundet),
  `gemeinsam_test`, `gemeinsam_heim_test`, `regel_test`, `rally_jeder_test`, `verst_kampf_test`.

## Beute (Alexander 4.10.)
- Nur an der Hauptstadt: der Sieger nimmt 10 % von jedem Rohstoff (Münzen, Holz, Stein, Eisen) über dem Burg-Schutz
  (`HAUPT_BEUTE`, `plunderOf`). Die Hauptstadt fällt nie, die Garnison fällt, sie „brennt“ 30 Min. (nur Optik,
  `openWaterBrand`). Türme: erobern ja, keine Beute. Armeen greifen keine Hauptstädte an.
- Hauptstadt-Beute wird bei gemeinsamen Kämpfen nach Truppen geteilt (auch Holz/Stein/Eisen); Münz-Beute ins Abholfach.

## Rally (buendnis/02, `bundRallyStart/Dazu/Los/Ende`)
- Ziel antippen → „Rally“: Sammelpunkt (eigene Basis), Wartezeit 1/3/5 Min., Haupt- + Zweitheld. Starter braucht einen
  Weg vom Sammelpunkt zum Ziel (Tore offen/eigen/Bündnis). Ziel-Besitzer wird gewarnt (Chat, Push, Kampf-Fenster).
- Platz: (Botschaft-Stufe + 1) × 10 % der eigenen Truppen des Starters (mind. 20.000); wer mehr schickt, bringt nur den Rest.
- Beitreten geht immer: Tore und Maut auf dem Weg zum Sammelpunkt egal; Nachzügler ziehen nach dem Start direkt zum Ziel
  und kämpfen mit. Mitglieder bringen eigene Helden (belegt bis Kampfende, `heroBusy`).
- Maut nach Truppen-Anteil (`rallyMaut`); wer seinen Anteil nicht zahlen kann, bleibt draußen (Truppen heim, Meldung),
  die anderen zahlen neu verteilt. Kann der Anführer nicht zahlen, fällt die Rally aus (Entscheidung B1, 5.10.).
- Start mit Fehlerschutz: `bundRallyLos` nimmt die Rally zuerst aus `bund.r`; eingetragener Angriff zählt als gestartet.
  Marsch-Tempo = Anführer. Wer nach dem Losmarsch das Bündnis verlässt, kämpft nicht mit (`rallyAussortieren`).
- `rally.an` je Teilnehmer: Spieler, Truppen, Quelle, …, [5] Schild, [6] Skill-Anteil, [7] Helden-Anteil.
- Rally-Fenster: jeder Teilnehmer mit Truppen und „✓ da“ / „unterwegs, da in …“ / „folgt zum Ziel“.
- Boss mit Rally: JEDER Teilnehmer bekommt den vollen Preis.

## Verstärkung im Kampf
- Verstärkung (Botschaft, siehe `buendnis.md`) verteidigt mit; danach verliert jeder denselben Anteil, Verwundete ins
  eigene Krankenhaus, fällt die Basis, fallen alle. Gilt für Angriffe, Rallys, Invasion, Kriegsherr (`verstVorKampf`/
  `verstNachKampf`, `verstBerichte`). Werte des Helfers zählen für seine Truppen (`verstWert`), Mauer der Basis für alle.
- Verteidigungs-Helden aus der Mauer: siehe `helden.md`.

## Späher
- Späher läuft hin und zurück; Bericht bei Ankunft (`spaeh`-Nachricht vom Weltrechner, `spaehBericht`). Ohne Antwort nach
  10 Min. „Kein Bericht“ (`spaehAbgelaufen`). Spähen zeigt sofort alles (Wachturm gibt es nicht mehr).
- Neulinge (Anfängerschutz) kann niemand ausspähen (`neulingAktiv`).
- Wer ausgespäht wird, bekommt „X hat deine Basis ausgespäht“ (+ Push `spaeher`), höchstens alle 30 Min. je Späher und
  Basis (`AUSGESPAEHT_PAUSE_MS`), höchstens 10 solche Einträge im Kampflog.

## Kampfbericht und Spähbericht
- Leer: Bild `bericht_leer` + Knopf „Barbaren-Lager angreifen“ (fliegt zum nächsten Lager, `barbNearest`).
- Kampfbericht-Liste: jede Karte Abzeichen + Ort („Zeigen“), Kräfte-Balken (alle Namen), Zahlen-Kästchen, „Kampfdetails“.
  Jeder Bericht einzeln abgesichert („kann nicht angezeigt werden“).
- Kampfdetails (Angriff/Verteidigung) = eigene Seite nach Entwurf `werkzeuge/kampfbericht/` (Alexander 9.10., `kampfBerichtHtml`,
  Daten `kbSeiten`): Band Sieg/Niederlage (KI-Bild), Ort + Zeigen/Teilen, „Hauptstadt brennt“, Kräfte, VS-Karten (Wappen
  `ui_wappen` als Platzhalter), Truppen je Seite (Start/Übrig/Verwundet/Gefallen/Geflohen, Verluste gerettet), Kampfkraft
  mit Quelle je Bonus + Gesamt, Helden (Haupt/Zweit, leer = „?“), Ausrüstung & Stadt (4 Kacheln, Fähigkeiten, Mauer,
  Krankenhaus, Heldenhalle, Titel), Jeder Spieler (eigene Werte, Beute-Anteil), Beute/Geraubt als Bild + Zahl, Burg-Schutz,
  Hinweise, Knöpfe „Nochmal angreifen“ (Insel-Fenster) bzw. „Verwundete heilen“ (Krankenhaus). Eigener Spieler + Gegner
  offen, weitere Rally-Mitglieder/Verstärkung in `details.kb-mehr` (zu). Nur Zahlen aus dem Bericht, keine Kampfrunden.
- Spähbericht kompakt (Vorbild RoK): Truppen, Verstärkung, Verteidigung Teil für Teil, „Verteidigung gesamt“ als EINE Zahl
  (`spaehGesamt`), Herr, Verteidigungs-Held, Basis, Rohstoffe (gegen Rohstoff-Schutz). Alter oben („Gespäht vor …“, ab
  30 Min. gelb `SPAEH_ALT_MS`). Kopf „Spieler-Stufe N · Basis Stufe M“. Gespähte Abwehr nutzt `spaehWerte`.
- Ohne (Verteidigungs-)Held zeigen Kampf- und Spähbericht gleich: zwei leere „?“-Plätze „Kein Hauptheld“/„Kein Zweitheld“
  (ohne Zusatztext) und die Zeile „Held +0“ (mit Held „dabei“, `heldZeile`). Leere Ausrüstungs-Plätze grau abgedunkelt
  (`LEER_STIL`/`LEER_IC`); ganz ohne Ausrüstung steht „keine Ausrüstung angelegt“.
- Fremde Werte (Helden, Ausrüstung, Fähigkeiten, Stadt) sieht man nur im Spähbericht (Server-Filter, `sicherheit-schummel.md`).
- Bericht im Bündnis teilen: Knopf „Im Bündnis teilen“ (Mitspieler reagieren, siehe `mitspieler.md`).

## Aussehen der Märsche (Teil 03f, 8.10.)
- Jede Armee = Trupp-Bild (`Game/bilder/marsch_*.webp`) + Sechseck-Kopf (Held, sonst Wappen) + Chip „Truppen · ⌛ Restzeit“
  (fremde Truppen „?“ bis zum Kampf). Weg als Pfeilkette in Seitenfarbe (eigen blau, Bündnis grün, Feind rot, Rally gold),
  Späher Reiter + Punktlinie, Sammeln Karren, Rückweg blass mit Beute-Kachel, zurückgerufen weiße Fahne.
- Kampf: Kampf-Kreis, Armeen im Halbkreis um das Ziel (nie auf anderen Basen), Verstärker als eigene Sechsecke, Tafel
  „N Armeen · X ⚔ Y“, Geschosse, Verluste; Wartende mit Sanduhr; Sieg/Niederlage als Band-Bild. Armee antippen → runde
  Knöpfe (eigene: Info/Zurück/Schneller, fremde: Info/Angreifen/Spähen). Test `marsch_bild_test`.
- Kampf am Feld (Sammler angegriffen): wird wie bisher sofort entschieden (09a, Regeln unverändert), die Karte spielt ihn aber
  ~5 s als dieselbe Kampf-Szene ab (`feldKampfBild`, 03f): Zahlen laufen auf das echte Ergebnis zu, danach Sieg/Niederlage-Band;
  weitere eigene Sammel-Märsche am Feld stehen als eigene Sechsecke auf der Verteidiger-Seite (`occ.teile`, nur Anzeige). Zuschauer
  bekommen die Szene über den Feld-Bericht vom Weltrechner (`fieldId`, `aWho`/`dWho`). Test `marsch_bild_test` Teil D.
- Spieltest-Funde (8.10.): nichts liegt mehr übereinander – Marsch-Köpfe weichen den Schlachten (Flächen des letzten Bilds),
  Basis-Schildern, Leisten, der ganzen Kopfleiste (samt Streifen; Trupp darunter ohne Kopf) und dem Hinweis oben aus, Chip am rechten Rand links vom Kopf. Kopf, Chip und Trupp sind eine Einheit:
  höchstens 60 px Lücke (gestrichelter Strich in Seitenfarbe), sonst klein dicht am Trupp (Chip kleiner, ggf. unter dem Kopf);
  jeder Marsch hat Kopf und Zahl (auch Rückweg und kleine Armeen im Kampf). Rückwege aus einer laufenden Schlacht starten außerhalb
  ihrer Armeen; Armeen der Schlacht stellen sich neben Märsche. Kampf-Tafel nie unter dem Hinweis (sonst neben dem Verteidiger).
  Sieg/Niederlage-Band über dem Kampfort (im Bild gehalten, samt Unterzeile nie über einem Kopf/Chip). Köpfe und Zahlen am Kampf
  (auch Marsch-Köpfe wie „⌛ wartet“) werden über Kreis, Säule und Speeren nachgezeichnet. Armeen im Kampf nie an einer fremden Basis/auf ihrem Schild und nie
  außerhalb des Bilds (sonst klein). Antipp-Knöpfe: Bogen, sonst Reihe/Spalte – immer im Bild, nicht unter Leisten/Hinweis, nie übereinander.
  Eigene/verbündete Welle, die einem laufenden Kampf beitritt, zeigt kein „⌛ wartet“ mehr. Lebensbalken blendet mit dem Kampf aus.
- Fremde Märsche nur, wenn sie auf deine Basis zielen; Bündnis-Märsche zu dir (Rally, Hilfe, Verstärkung) und ihre
  Rückwege werden gezeichnet; Kämpfe zwischen anderen unsichtbar. Echte Zahlen des Angreifers erst, wenn er bei dir kämpft.
- Testdatei nur für die Darstellung: `werkzeuge/marschtest/` (Regeln kommen immer aus dem Spiel, Test `marschtest_test`).
- Absicherungen (Test `codecheck_test`): kein Angriff auf eigene Basen, `launchSend` nur zur eigenen Basis (gibt true/false),
  ganze Truppen (kaputte Zahl = keine). „Truppen sammeln“ zahlt nur, wenn mindestens ein Marsch losgeht. Rally/Rückweg nicht
  zurückrufbar; ohne eigene Basis kein Rückruf, ein Rückweg wartet (Truppen gehen nie verloren). Beim Zuschauer sind nur Späher
  beschleunigbar, die der Weltrechner kennt (`sc.wr`, kein Rückweg). Abholfach stapelt nur Münzen/Edelsteine/Splitter.
  Lager-Fenster zeigt den Tages-Rest der Beute; `barbSend` prüft Freischaltung und Tagesgrenzen selbst.
