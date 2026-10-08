# Merkliste – nur OFFENE Punkte

Was noch zu tun oder zu prüfen ist. Erledigtes fliegt hier raus (steht dann als Stand in der Themen-Datei; die alte Liste
mit allen Punkten in `archiv.md`, Abschnitte 11, 11b, 11c, 12, 12a). Nummern „11c Nr. N“ = Fehler-Merkliste ab 6.10.
Stand: 8.10. Bei „prüfen“ war der Punkt laut Git-Verlauf schon angegangen, aber nicht als erledigt markiert.

## Offen (bauen, wenn Alexander es sagt)
- **11c Nr. 10** Angriffs-Fenster wirkt wie ein Formular → neu mit Designer + Vorbildern (RoK „Marsch aufstellen“).
  (Grundform 6.10. eingebaut – Alexander fragen, ob es jetzt passt.)
- **11c Nr. 11** Fenster „Deine Basis“ wirkt wie Tabelle → Bild der Basis, Name, wenige Werte als Symbol-Zeile, runde
  Knöpfe. Zahlen-Fragen: Münzen/Std. vs. Truppen/Std., „Sammeln“/„Mehrfach“ je 1 Edelstein sinnvoll?
- **11c Nr. 15** Spähbericht und Kampfbericht: Helden-Plätze einheitlich (leer = ein Platz mit „?“ und einem Satz).
- **11c Nr. 17** eigene Hauptstadt auf der Karte hervorheben (Tore sind schon KI-Bilder, auch im Nebel).
- **11c Nr. 19** Schloss-Symbol an angreifbarem Grenztor; Hinweis „Keine deiner Basen grenzt …“ liegt über dem Inhalt.
- **11c Nr. 26** Zahlen (später): Produktion Spätspiel aufgebläht, Friedensschild gegen Edelstein-Einkommen prüfen.
- **11c Nr. 27** Karte: Ecken ganz weit leicht dunkel, senkrechte Ketten weit schmaler, Leistung ganz weit.
- **11c Nr. 31** Namensschild-Skins als KI-Bilder (später).
- **11c Nr. 32** Zahlen aus Spieler-Sicht: Thron-Shop „10 Truppen“ für 200 Punkte, Schild Stufe 1 „+0,2 %“, Späh-Bericht
  über fremden Spieler zeigt eigene Helden (prüfen), Burg-Schutz-Zahl Späh- vs. Burg-Fenster.
- **11c Nr. 34** Teleport-Animation (Lichtsäule/Staub, später).
- **11c Nr. 36** Aufräumen: (b) kompletter Code-Check, (d) alter Code raus (gefunden nur `BAND` in 03a).
  (a App-Bild, c Doku, e Sortieren: 8.10. erledigt.)

## Prüfen (vermutlich erledigt, live ansehen)
- 11c Nr. 2/4/5/8 Saison-Reset: Hauptstädte nur Zone 1, Pass/Ranglisten/Event-Stände neu – Thron-Punkte-Kappung bei
  Mitspielern prüfen; Mitspieler-Tempo nach dem Reset (30 Min. → 15–24 Basen?) mit Alexander besprechen.
- 11c Nr. 14/25 Insel-Design – durch die Karte wie RoK ersetzt; Alexander zeigen.
- 11c Nr. 16 Ladebild + Login mit Titelbild – gebaut, wartet auf Alexanders Blick.
- 11c Nr. 20 Helden-Fenster neu wie RoK – gebaut 7.10. (Heldenhalle neu, KI-Bilder), Alexander zeigen.

## Bekannte Reste im Code (klein)
- Münzen/Rohstoffe im Profil auf 1 Billiarde gedeckelt (Truppen 1e30) – bei Bedarf anheben.
- Hauptbuch: Edelsteine statt Splitter noch nicht geprüft (Thron-Shop-Kisten kennt es) (nur mögliche Fehlalarme im Admin).
- **WICHTIG (später, Alexander 8.10.)** Hauptbuch zählt keine Bauarbeiter-Plätze (gefälschtes Handy könnte mehrere Gebäude gleichzeitig bauen, voll bezahlt).
- Auf dem Server liegen `baukunst.js`/`klein/baukunst.js` noch (beim nächsten Aufräumen löschen, mit Alexanders Ja).
- Code-Kommentare verweisen auf „LIESMICH 11b A“ / „11c Punkt 30“ – gemeint ist jetzt `archiv.md` (beim nächsten Anfassen
  der Datei auf `doku/…` umstellen).

## Fragen an Alexander (offen)
- GitHub aufräumen (macht Alexander selbst): Default-Branch `claude/neues-projekt-8agldl`, alte Branches löschen
  (`claude/chat-session-k7ozkc`, `claude/aaa-rpg-character-vfx-9ydhnc`, `claude/game-server-setup-0n2gbr`,
  `claude/login-finance-dashboard-89et7f`, `claude/office-login-game-server-u7tgrc`, `claude/rpg-player-effects-design-kxqmsb`,
  `claude/spiel-anzeigen-6e8l5z`), fremdes Repo `-Open-source-pixel-art-game-project-built`.

## Ideen (gemerkt, nicht gebaut)
- Nachricht an alle / Welt-Ereignis auf Knopfdruck (Admin), Schatzkarten im Nebel, Wetter, Leuchttürme, Handel,
  Statistik-Seite.

## Geplant: Events neu (Alexander 8.10., noch nicht gebaut)
- Wochen-Event Mo–Fr, jede Woche gleich, je Tag ein Thema: Mo Bauherr (Ausbau, Beschleunigen je Min., Edelsteine),
  Di Krieger (getötete Truppen), Mi Sammel-Rausch (gesammelte Rohstoffe), Do Boss-Jagd, Fr Invasion.
  Fr 20 Uhr Ende → Auswertung, Plätze + Belohnungen.
- Sa 10 – So 22 Thron-Event (Mitte): Plan + Test-Datei `werkzeuge/thronevent/thronevent.html` (Zahlen in ZAHLEN-Vorschlag
  dort). Thron-Punkte → Event-Münzen + Event-Shop-Reiter im Shop. Weiter, wenn die Wochen-Events fertig sind.
- Drache, Boss, Lager bleiben als eigene Events (Einordnung offen).
- Beschlüsse 8.10. (Wochen-Event): Mo Bauherr · Di Krieger · Mi Sammeln · Do Boss-Jagd (1 P./1.000 Schaden) · Fr Helden-Tag.
  Je Tag 5 Tages-Kisten (Edelsteine bleiben, bis 190/Tag); nicht abgeholte Kisten → Abholfach. Wochen-Rangliste Fr 20 Uhr,
  6. Feld „Rangliste“ hinter Fr. Test-Datei `werkzeuge/wochenevent/wochenevent.html`. Alte Woche/Invasion/Drache/Boss raus.
- Barbaren-Lager bleibt (letzter Chip): nur feste Münzen je Stufe (höhere Stufen etwas mehr) + Schlüssel ab höheren Stufen;
  dort getötete Truppen zählen nicht für Krieger.
- Schlüssel 1 (normal) / 2 (episch) öffnen Ausrüstungs- und Helden-Kisten; ohne Schlüssel 100 / 500 Edelsteine; episch: sicher
  1 Lila spätestens nach 20 Versuchen. Beschleuniger 1/5/15 Min, 1/3/8/24 Std – gelten für Bauen, Forschen, Heilen (nicht Truppen).
- Schlüssel 1/2 und Beschleuniger gibt es auch als Event-Belohnung. Wochenkette (7 Tage Aufgaben) fliegt raus.
- Marsch-Plätze: nicht mehr über Burg-Stufe, sondern Labor-Forschung: 2 von Anfang an, Platz 3 ab Labor 5, 4 ab 10, 5 ab 16, 6 ab 22.
- Shop: neuer Reiter „Event“ (Event-Shop, Event-Münzen). Beschleuniger: Belohnung bei Events UND im Shop kaufbar für
  Edelsteine oder Event-Münzen. Kisten-Reiter: öffnen mit Schlüssel oder Edelsteinen.
- Bilder für Thron-/Wochen-Event (Karte, Herrscher, Titel, Event-Münze, Schlüssel, epische Helden-Kiste, Beschleuniger klein/mittel/groß) liegen in `Game/bilder/`; Test-Dateien nutzen sie (Test `eventbilder_test`), Shop dort mit Reitern Kisten + Event.
- Lager-Tagesgrenze: höchstens 2,5 Mio. Münzen, 3 Schlüssel 1 und 1 Schlüssel 2 pro Tag. Wochen-Rangliste-Stufen ok
  (1/2/3/4–10/11–50/Rest). Alte Thron-Punkte: Start bei 0. Shop sortiert (Test-Datei): Reiter Kisten · Event · Tempo · Schilde · Markt; Gruppen mit Zwischenüberschrift, je Gruppe nach Wert aufsteigend. Lager: 30K × 1,15^(Stufe−1), Tagesgrenze oben mit Balken.
- Mitte, Beschlüsse 8.10.: Nur die Thron-RANGPUNKTE starten jedes Wochenende bei 0; Event-Münzen bleiben. Herrscher vergibt
  keine Titel → Titel bleiben leer. Kisten gut/mittel/normal = episch/groß/normal, Inhalt sichtbar (Vorschau beim Verteilen).
  Verteilen freiwillig, Rest verfällt beim nächsten Thron-Event. Tote im Thron wie überall (Krankenhaus, wenn voll sterben).
  Türme dürfen verstärkt werden. Herrscher-Burg: vorhandenes Kronen-Bild über dem Skin (kein neues Bild nötig).
- Event-Shop: Friedensschild · Teleporter · Beschleuniger · Schlüssel (Preise in ZAHLEN_WOCHE-Vorschlag). Helden-Splitter RAUS.
- Idee für später (Alexander): eigenes Helden-Event (dort Helden/Splitter bekommen) – noch zu planen.
