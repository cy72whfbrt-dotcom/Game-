# Verlauf – alles aus der ersten Sitzung (30.9. – 1.10.)

Damit eine neue Sitzung auf demselben Stand ist. Zuerst `UEBERGABE.md` lesen (Server-Plan, Regeln), dann diese Datei, dann `FEHLER.md` (Fehlerliste mit Lösungen) und `IDEEN.md` (Entscheidungen und Pläne).

## Wer und wie
- Spieler: **Alexander**. Schreibt auf dem Handy, kurz, mit Tippfehlern – **immer auf Deutsch, einfach, ohne Fachchinesisch** antworten.
- Er testet viel und schickt Screenshots. **Arbeitsweise, die er will:**
  - Wenn er „Fehler sammeln“ sagt: erst nur **nummerierte Liste** in `FEHLER.md` führen, nichts reparieren, bis er „mach das alles“ sagt.
  - Große Aufgaben **mit Agenten parallel** erledigen (Worktrees), danach zusammenführen, testen, pushen, veröffentlichen.
  - Nach jeder Runde: kurz sagen, was gemacht wurde, und die neue Version veröffentlichen.
  - Bei Unklarheiten lieber selbst sinnvoll entscheiden („keine Ahnung, mach du“) und dann erklären.
- **Wichtigste Regel von ihm:** Der Spielstand darf nie durch ein Update verloren gehen.
- Offene Frage an ihn ist immer okay, aber kurz.

## Was in dieser Sitzung gebaut wurde (Nacht 30.9. → 1.10.)
Runde 1–4 mit Agenten, alles im Spiel:
- **Ringe:** kein Ring mehr nach Stufe. Ring nur durch **Titel aus der Mitte** (Gold gut, Rot Straf-Titel, Blutrot-Gold Herrscher, Lila-Gold Turniersieger) oder **gekauften Ring-Skin**. Titel-Ring vor Skin.
- **14 Helden** neu: Seltenheit wie Ausrüstung (Grün/Blau/Lila/Gold), freischalten nur mit **Splittern**, Viertel-Sterne bis 5, 1 Fähigkeitspunkt pro halbem Stern, 4 Fähigkeiten (1 aktiv mit Wut), Zurücksetzen kostet Gems, Gefolge. Echte Heldenbilder (SVG). Heldenhalle. Mitspieler nutzen alles genauso.
- **Baukunst:** 3D-Basen (three.js) mit Stilen, Stufen-Designs, Fallback auf 2D-Bilder.
- **Ladebildschirm:** Meer mit Burg, echte Tageszeit, Tipps mit Bildern, ohne Name/Wappen.
- **Lager** (schützt Münzen), **2. Bauarbeiter** (500 Gems), **Aussehen**-Fenster (5 Reiter, alles nur kaufen mit Gems/Thron-Punkten), **Ziele** (Täglich · Belohnung · Erfolge · Pass), **Rangliste** (Macht, Eroberungen, Titel, Thron-Punkte, Turnier).
- **Ereignisse:** Barbaren-Lager (Stufe 1–25, 20 pro Tag), Tagesboss, Wochenend-Turnier, Kopfgeld auf den Herrscher, Saison-Pass (28 Tage, Premium 1.000 Gems).
- **Heldenkisten im Shop** (150 / 500 / 1.200 Gems), Aussehen-Karte aus dem Shop entfernt.
- Schlussrunde: Balance, Mitspieler-Prüfung, Fehlersuche, Leistung, alter Code raus.

## Fehler und Wünsche vom Spieler am 1.10. (alle erledigt, Details in FEHLER.md)
1. Barbaren-Lager/Tagesboss: kein Kampfbericht → jetzt voller Bericht, Marsch unter „Unterwegs“.
2. Besiegter Tagesboss verschwindet nach 5 Min.
3./4./6. Turnier-Punkte (Kämpfe zählten zu viel) und „Thron (Woche)“ → Thron-Punkte laufen dauerhaft, Turnier zeigt Aufteilung Thron/Tempel/Kämpfe.
5. **Postfach abgeschafft**, tägliche Belohnung jetzt unter Ziele → Belohnung.
7. Großes Bild blitzt beim Aufwerten → altes 3D-Bild bleibt bis das neue fertig ist.
8./10. **Abholfach** (Ziele → Belohnung): Turnier, Tagesboss, Weltboss, Kopfgeld und **alle Kampfbeute** werden selbst eingesammelt (Kampfbeute sammelt sich in einem Eintrag).
9. Turnier-Countdown „in 0 s“ nach Test-Ende.
11. Lange Zahlen im Kampfbericht → **alles ab 10 Mio. kurz** („18,4 Mrd.“).
12./16. **Plündern** viel zu stark → 2 % pro Basis / 4 % Hauptstadt, höchstens 30 Min. Einnahmen des Opfers pro Kampf.
13./14. **Ringe unterscheidbar:** Titel-Ring = dicker Doppelring mit Abzeichen (Krone gut/Herrscher, Totenkopf Straf-Titel, **Pokal Turniersieger**); Ring-Skin = dünner schlichter Ring.
15. **Kopfgeld** gab es bei jedem Angriff → nur noch für den, der den Thron nimmt.
17.–19. **Titel-Logik:**
   - Guter Titel vom Herrscher = Respekt: Träger greift den Herrscher **deutlich seltener** an (nicht verboten – so wollte er es).
   - Straf-Titel: Träger ist schwächer (−25 %), die anderen greifen ihn eher an, und er **grollt dem Herrscher** (greift ihn eher öfter an). „Feigling“ hat keine Angst mehr, nur −25 % Angriff.
   - **Mitspieler als Herrscher** verteilen Titel wie ein Mensch: wer sie oft/gerade angreift → Straf-Titel; wer sie in Ruhe lässt → gute Titel; Gedächtnis halbiert sich alle 3 Std.; neu verteilt alle 3 Min., mit Meldung warum.
- Gesamtcheck (letzter Stand): **großer Fehler gefunden** – durch eine Titel-Änderung brachen alle Züge der Mitspieler ab (keine Angriffe ab ca. 9:45). Behoben. Dazu: leerer Thron wird umkämpft, Rauswurf → Neustart am Rand mit Schild, keine Späher-Flut bei Übermacht, Fenster-Fehler, Abholfach-Kisten, Rechenlast halbiert.

## Was der Spieler NICHT will / gestrichen
- Taverne, Deko, Mauer-Skins, Sammelangriff, Heldenausrüstung, Talente, Armee-Paar, SvS.
- Erfolge geben **keine** Kosmetik mehr (nur Gems).
- Kein „Bot“/„KI“ im Spiel.
- Nicht ungefragt Dinge ändern, die er nicht wollte (z. B. Titel-Respekt = „seltener“, nicht „nie“).

## Offene Punkte / Ideen für später
- **Spielstand geht verloren:** Die Claude-App leert manchmal ihren Browser-Speicher → Spiel startet neu (mehrmals am 1.10.). **Lösung in Arbeit: Umzug auf seinen Server** (siehe `UEBERGABE.md`): Ordner `Game` im Office-Editor, Login Nutzer + Passwort, alle Spielstände in MySQL auf db.lapush.de, **im Browser nichts speichern außer einem Login-Cookie (30 Tage)**, Spiel startet dort bei Null.
- Münz-Wirtschaft ist bei hohen Stufen riesig („Münzen fühlen sich nichts wert an“) – evtl. später großer Umbau mit Umrechnung des Spielstands.
- Kleinigkeiten aus den Agenten-Berichten: Schild-Restzeit in der Burg zählt nicht live; Ausbau-Knopf schaltet nicht live frei; Stadt-Ansicht am Handy in den UI-Tests manchmal zu langsam (Wolken-Animation).
- Test-Uhr: Das Spiel läuft durch frühere Zeitsprünge ~17 Tage voraus (`openWaterTimeShift`) – gewollt.
- Einmaliger Turnier-Test (`tourTestOnce`, Schlüssel `openWaterTourTest1`): Turnier endet einmal nach 10 Min., +10.000 Punkte – kann später raus.

## Technik (Kurz)
- Dateien: `index.html` (Hauptspiel), `botlogik.js` (Mitspieler), `baukunst.js` (3D).
- Speichern: alles über `store` (Anfang Hauptscript) in `localStorage`-Schlüsseln `openWater…`.
- Tests im Scratchpad der ersten Sitzung (`checks.sh`, Playwright-Skripte) – in einer neuen Sitzung neu anlegen: Syntax-Check des Scripts (`node --check`), Playwright mit Chromium, Seite laden, 60–90 s laufen lassen, keine `pageerror`. Wenn cdn.jsdelivr.net gesperrt ist, Chromium über einen toten Proxy starten, sonst hängt das Laden.
- Veröffentlichen: Artifact https://claude.ai/artifact/FtYfCTcfkiUgg5YM8Y7Qhn (Seite `index.html`, Dateien `botlogik.js`, `baukunst.js`). Letzte Version: 232 (+ Aufräumen).
- Branch: `claude/neues-projekt-8agldl`. Die zweite Sitzung hat `claude/office-login-game-server-u7tgrc` (nur Notizen in UEBERGABE.md, schon zusammengeführt).
- **Keine Passwörter in Dateien oder Commits.** Zugangsdaten nur über die Umgebungsvariablen der Umgebung „Unity“.
