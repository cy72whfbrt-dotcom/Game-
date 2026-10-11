# Oberfläche und Design

HUD, Leiste, Fenster, Texte, KI-Bilder und Prompt-Regeln. Vorbild für Aufbau und Aussehen: Rise of Kingdoms (RoK),
Million Lords, Lords Mobile – „sieht aus wie ein Spiel, nicht wie eine Liste“. Wichtigste Dateien: `Game/spielseite/`
(01 Grundwerte, 02 HUD/Fenster, 03 Bausteine, 05z KI-Bilder mit der GRUNDFORM FENSTER im Kopfkommentar, 07 Fenster,
08 Dialoge), `Game/spiel/05a-profil-rahmen.js`, `10c-start-einstellungen.js`, `06c` (`renderMidBar`), `Game/index.php`,
`Game/ladebildschirm.js`.

## Regeln (CLAUDE.md, Alexander)
- KI-BILDER STATT CODE (7.10.): überall, wo Grafik ein Bild sein kann, ein KI-Bild (Alexander erzeugt sie mit ChatGPT);
  gezeichnet wird nur, was sich dauernd ändert (Zahlen, Balken, Linien). Sieht etwas schlecht aus → sofort ein Prompt für
  Alexander, nicht mit Code nachbessern.
- BELOHNUNG = BILD + ZAHL (8.10.): siehe `shop-kisten-belohnung.md`.
- Design-Aufgaben: zuerst Vorbilder online suchen (Designer) → Vorgabe `<scratchpad>/design_*.md`; die Fotos der
  Design-Liste (`<scratchpad>/vorbilder/`, `LISTE.md`, `design_liste.html`) sind verbindlich. Vor dem Zeigen an Alexander
  prüft der Designer die Bilder. Alexander nie nach Vorbildern fragen.
- Im Spiel kurze deutsche Texte; nie „Bot“/„KI“; „Edelsteine“, „Fähigkeiten“, „Münzen“. Nichts im Browser speichern außer
  dem Login-Cookie (Merker wie offene Info-Kästen nur im Speicher).

## Prompt-Regeln für KI-Bilder
- Fester Stil-Satz am Ende JEDES Prompts: *Style: rich hand-painted medieval fantasy illustration, glossy semi-realistic 3D
  look, warm light from the top-left, soft short shadows, deep navy blue and polished gold accents, clean readable
  silhouettes, transparent background, PNG.* Keine Wörter „game“ oder „UI“ im Prompt; Fahnen/Bänder ohne Buchstaben.
- Mehrere Teile auf einem Blatt: „like stickers laid out on a table in a neat grid … with wide empty space between them,
  each fully visible“. Größen nur 1024×1024, 1536×1024, 1024×1536. Alle Bilder eines Satzes im selben Chat
  („gleicher Stil, gleiche Kamera, gleiches Licht“). Echtes Alpha prüfen (kein gemaltes Schachbrett).
- Jeder Prompt nennt den Dateinamen. Schneiden: `werkzeuge/ui_bilder_schneiden.py`, `beute_bilder_schneiden.py`,
  `helden_bilder_schneiden.py`; Ablage `Game/bilder/*.webp` (ui_*, beute_*, kiste_*, karte_*, basis_*, marsch_*, Helden).

## HUD und Leiste
- Handy oben links Spielerbild (44 px, Stufe, Name, antippen = Profil, Saison-Rahmen als Ring), daneben EINE Reihe Kapseln
  Münzen · Edelsteine · Truppen · Holz · Stein · Eisen (`fmtHud`, höchstens 5 Zeichen). Darunter EIN Streifen mit dem
  dringendsten Dauer-Hinweis (`renderMidBar`, Rest als „+N“).
- Leiste unten (runde KI-Knöpfe): Stadt/Karte · Bündnis · Kampf · Events · Rucksack · Shop; Profil über das Spielerbild.
  Karten-Knöpfe rechts: Zoom, Heimat, Wegmarke, Armee. In der Stadt bleiben HUD und Leiste.
- Hinweise (Toasts) am Handy oben unter dem HUD, nie über Fenster-Kopf/Fuß; `flashHint(text, ms, lang)`.

## Fenster
- EINE Grundform für alle (spielseite/05z): `.ki-fenster` Rahmen, `.phead` (Symbol · Überzeile · Titel · rotes X), Reiter
  `.tabs > .tab`, Listen-Karten `.ki-karte`, Knöpfe `.btn--primary` (Gold) / `--secondary` / `--danger`, Kacheln
  `[data-r=…]`, Balken. Neue Fenster nur daraus bauen.
- Grundwerte (spielseite/01): Abstände `--ab-1…4`, Schrift `--fs-11…22` (nichts unter 11 px), Tippflächen ≥ 44 px.
- Fenster am Handy höchstens 70 % hoch (Shop Ausnahme), Fußknopf fest unten; Insel/Angriff ≤ 62 %, der Inhalt scrollt.
  Umlaute in Versalien nicht abschneiden (`overflow-x:clip`). Alles in offenen Fenstern zieht live nach (kein Flackern).
- Basis-Fenster (8.10., Test `fenster_neu_test`: 360×640, 390×844, Desktop – nichts überlappt, Tippflächen ≥ 44 px):
  Kopf mit Basis-/Tor-Bild, Werte als Bild + Zahl (`bwWerte`), runde Knöpfe (ui_rund) mit kurzem Wort:
  Hauptstadt Betreten · Teleport · Schild (Rucksack) · Truppen (Armee aufstellen) · Mehr (Senden, Sammeln, Mehrfach);
  eigene Basis Aufwerten · Senden · Sammeln · Truppen · Mehr (Mehrfach, Titel). Fremd: Truppen/Verteidigung/gespäht,
  runde Knöpfe Spähen + Angreifen; ungespäht eine Kachel „Stärke unbekannt“ (Tipp = spähen). Keine eigene Basis daneben
  (Grenztor & Co.): Zeile „Keine deiner Basen grenzt an …“ im Inhalt, Angreifen grau (Tipp = Zeile blinkt, kein Hinweis darüber).
  Hinweise (Toast) liegen nie über Fenster-Knöpfen; kleines Handy (≤ 700 px hoch): Angriff ohne Überzeile/Leiste, alles ohne Scrollen.
  Angriff vorbereiten: Hauptheld groß, Zweitheld klein darunter („+ Zweitheld“; antippen = Auswahl daneben statt Startbasis), daneben
  Startbasis + Angriff | Abwehr + Kräfte-Balken (Vorschau-Rechnung), Truppen-Kachel + Zahl, Schieber + 25/50/75/Alle,
  Leiste Zeit · Truppen · Angriffskraft, goldener Knopf „Losmarschieren ⌛ 0:21“ (Traglast gibt es im Spiel nicht).
- Profil: Kopf (Rang · Titel, Name, Stufe, Macht, Spieler-Nummer), Reiter Spieler · Ausrüstung · Fähigkeiten ·
  Einstellungen; Rangliste als eigenes Fenster (Macht, Eroberungen, Titel, Thron-Punkte, Hauptstadt). Name = Konto-Name,
  wenn keiner eingetragen.
- Einstellungen: Benachrichtigungen (Gruppen Angriff/Bündnis/Events/Stadt), Ton & Grafik (Akku sparen), Konto (Name,
  Passwort, Abmelden), Hilfe; ganz unten klein „Version …“ (nur für Rückfragen).
- Aktive Wahl-Knöpfe/Chips (gold, `ui_k_gold`) ohne Hintergrundfarbe – sonst ein dunkles Viereck hinter den runden Ecken.
- Stadt: die runden Knöpfe am Gebäude stehen unter dem Schild, unten an der Leiste ganz darüber – nie auf dem Schild.
- Burg-Fenster: „Fällt nie · Sieger nimmt 10 %“ direkt unter dem Schutz, Abstand zu „schaltet frei“. Lager-Fenster:
  Zeilen in `--tx-2` (lesbar). Bericht-Namen „Stufe 1“ mit geschütztem Leerzeichen (kein Umbruch).
- Bündnis gründen: 12 klar verschiedene Farben; „Offen für alle“ + „Gründen“ in einer festen Leiste unten (Handy).

## Aussehen (Kosmetik)
- Nur noch Wappen und Rahmen (Marsch-, Basis-, Ring-Skins raus). Rahmen = Titel + Ring in einem, nicht kaufbar: Saison-Rahmen
  (Platz 1–10, bis zum nächsten Saison-Ende) und Titel aus der Mitte (Herrscher „Herrscher der Meere“, gut = Gold, Straf =
  Rot). Früher Gekauftes bleibt. Weltrechner merkt Rahmen (`hbRahmen`). Test `aussehen_rahmen_test`.
- Titel: der Herrscher (Platz 1 Thron-Event) vergibt Feldherr/Burgvogt/Schatzmeister/Narr im Herrscher-Fenster;
  Mitspieler als Herrscher nach Verhalten.

## Startseite und Ladebild
- `index.php` dunkel/Gold im Spielstil, Felder ohne Autofill-Gelb, Regeln unter den Feldern, Auge-Knopf. KI-Titelbild
  (`bilder/titel_hoch.jpg`/`titel_quer.jpg`) hinter Ladebild und Startseite; Ladebild nur Tipp-Zeile + Balken.
- Ladebild lädt UND entpackt (`img.decode()`) die Bilder der ersten Minuten (`ladebildschirm.js` `BILDER_START`, ~3,6 MB,
  6 gleichzeitig, `fetchPriority low` – Skripte zuerst); der Balken zeigt den echten Stand (4 % + 90 % × geladen, 100 % wenn
  spiel.js fertig). `finishSplash` (10c) wartet darauf, höchstens 25 s, mindestens 2,6 s. Gleich danach `BILDER_BALD` (Helden,
  Kisten, Ausrüstung, ~1,7 MB, auch entpackt; das Tutorial wartet ab „Kiste“ notfalls mit „…“, `tutBilderDa`). Danach
  `bilderNachladen`: übrige Bilder aus den Stilen + Helden einzeln im Leerlauf (nur Browser-Zwischenspeicher, nichts gespeichert;
  ohne Titelbilder, nicht bei „Daten sparen“). Auf dem Balken läuft ein Lichtschein (nur transform/opacity: bewegt sich auch, während
  das Spiel die Welt baut). Start schneller (11.10.): Nebel-Felder je Zeile gerechnet (`fogLandCells`, gleiches Ergebnis), Basen-Raster
  mit Zahl-Schlüsseln (01c), Weichzeichner der Boden-Masken ohne Randprüfung je Punkt, Übersichtskarte füllt nur das Rechteck je Gebiet;
  in der Vorschau verteilt das Ladebild die ersten Mitspieler-Züge (1–9 s, sonst alle im ersten Takt).
- Stadtbild: steht die Kamera, wird der Hintergrund (Bild + Schleier) einmal groß gezeichnet und danach 1:1 kopiert (`cityFrame.hinten`);
  pro Bild nur Schilder und Hammer neu.
- App für den Startbildschirm: `Game/app/` (Manifest, Logo, iPhone-Anleitung). Statusleiste „black“, Leiste füllt die
  Home-Balken-Lücke (`dockLuecke`, `--safe-bd`). Kein Markieren/Kopieren im Spiel.
- Schrift Cinzel + Inter selbst ausgeliefert (`Game/schrift/`, OFL).

## Offen (Merkliste)
- 11c Nr. 1 (Mitte im Nebel weit draußen), 10/11 (Angriffs- und Basis-Fenster wie ein Spiel), 15 (Spähbericht-Helden wie
  Kampfbericht), 17 (Tore/eigene Basen erkennbar), 19 (fremde Märsche mit Figur), 36a (Home-App-Bild neu).
- Erfolgs-Meldungen erscheinen nacheinander (nie übereinander); Wisch-Hinweis in der Stadt ist bei offenem Fenster/Blatt aus.
