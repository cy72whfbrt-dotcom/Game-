# Merkliste – nur OFFENE Punkte

Was noch zu tun oder zu prüfen ist. Erledigtes fliegt hier raus (steht dann als Stand in der Themen-Datei; die alte Liste
mit allen Punkten in `archiv.md`, Abschnitte 11, 11b, 11c, 12, 12a). Nummern „11c Nr. N“ = Fehler-Merkliste ab 6.10.
Stand: 8.10. Bei „prüfen“ war der Punkt laut Git-Verlauf schon angegangen, aber nicht als erledigt markiert.

## Offen (bauen, wenn Alexander es sagt)
- **11c Nr. 6b** Heldenkiste (normale, 6 Splitter): auf 2–3 Helden verteilen, nach Seltenheit gewichtet (Große Kiste macht es schon).
- **11c Nr. 10** Angriffs-Fenster wirkt wie ein Formular → neu mit Designer + Vorbildern (RoK „Marsch aufstellen“).
  (Grundform 6.10. eingebaut – Alexander fragen, ob es jetzt passt.)
- **11c Nr. 11** Fenster „Deine Basis“ wirkt wie Tabelle → Bild der Basis, Name, wenige Werte als Symbol-Zeile, runde
  Knöpfe. Zahlen-Fragen: Münzen/Std. vs. Truppen/Std., „Sammeln“/„Mehrfach“ je 1 Edelstein sinnvoll?
- **11c Nr. 15** Spähbericht und Kampfbericht: Helden-Plätze einheitlich (leer = ein Platz mit „?“ und einem Satz).
- **11c Nr. 17** eigene Hauptstadt auf der Karte hervorheben (Tore sind schon KI-Bilder, auch im Nebel).
- **11c Nr. 19** Schloss-Symbol an angreifbarem Grenztor; Hinweis „Keine deiner Basen grenzt …“ liegt über dem Inhalt.
- **11c Nr. 22** Stadt: außerhalb der Mauer nur die echte Außenkarte, Blick enger.
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
- Vorschau-Kampf des Spielers (`resolveAttack`, 02c): zusammengelegte Wellen gehen zur ersten Basis heim.
- Drache/Kriegsherr-Angriffe auf Basen nehmen von Verteidigungs-Helden nur Angriff + Gefolge.
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
- Fremde Tabellen eines anderen Spiels in der Datenbank (`nutzer`, `mail`, `handel` …): löschen? (noch nicht gefragt)
- Erfolge bleiben über den Reset (25/63) – so gewollt?

## Ideen (gemerkt, nicht gebaut)
- Nachricht an alle / Welt-Ereignis auf Knopfdruck (Admin), Schatzkarten im Nebel, Wetter, Leuchttürme, Handel,
  Statistik-Seite.
