# Mitspieler (Bots)

150 Mitspieler spielen in derselben Welt wie echte Spieler, mit denselben Regeln, Kosten und Grenzen. Im Spiel heißen sie
NIE „Bot“ oder „KI“ (sie sind „Spieler“). Wichtigste Dateien: `Game/bots/` (6 Teile → `bots.js`): 01 spieler,
02 kampf-karte (`botFrei`, `resolveBotAttack`, `kampfHeimTeile`), 03 angreifen (`botLearn`, `botScoutLos`), 04 stand-stadt
(`botSparZiel`, `BOT_SPAR`, `botGather`), 05 verteidigen-takt (`botDefend`, `botSchaetzAngriff`, `botTeleportCapital`,
`botCapitalPlan`), 06 aussehen-felder-barbaren. Bündnis-Verhalten: `buendnis/03-mitspieler.js`.

## Grundsatz (Alexander)
- Mitspieler IMMER genau wie echte Spieler: Start (5.000 Truppen, 10.000 Münzen), Marsch-Plätze, Kosten, Helden,
  Ausrüstung, Forschung, Anfängerschutz, Saison-Reset, Teleport. Echte Spieler sind beim Weltrechner Einträge `u<id>` mit
  `mensch: true` (ohne eigenes Denken).
- Mitspieler wissen nur, was ein echter Spieler wüsste: Nebel (`botKennt`), Angriffe vor dem Kampf nur ungefähr (±30 %, je
  Angriff fest, ohne Boni – `botSchaetzAngriff`/`botSchaetzArmee`), echte Stärke erst im Kampf. Vorsicht ×1,1 halten,
  ×1,2 Hilfe.

## Verhalten
- Online-Zeiten wie Menschen mit Handy (`b.handy`): offline angegriffen → tagsüber meist nach 2–30 Min. reinschauen,
  nachts erst morgens; dann kurz verteidigen (Hilfe, Truppen raus, Notschild).
- Truppen nach Lage (`botFrei`): angegriffene Basis gibt nichts, Ärger in der Nähe 30 %, Grenzland 60 %, sonst 90 %,
  Hauptstadt als Helfer höchstens 50 %.
- Erste Basen: die Hauptstadt zählt beim „gut ausgebaut“ nicht mit (sonst kamen manche nie vom Fleck).
- Greifen auch Feld-Armeen echter Spieler an (Schild und Bündnis schützen); Neulinge nie als Späher-Ziel.
- Späher nur mit freiem Weg vom echten Startpunkt (`botLearn(…, vonLm)`), Mitspieler spähen alle ~10 Min. neu.
- Tagesboss/Drache/Invasion/Lager/Händler: machen mit, ohne Nebel-Sperre beim Boss.
- Ausgeschiedene kommen über `botRespawn` zurück (10 Min., Schild), Startverteilung nur auf dem Weltrechner.
- Hauptstadt eines Mitspielers ist immer ein Turm (`botCapitalOf`).

## Hauptstadt umziehen = Teleport (8.10.)
- Kein Verlegen auf eigenen Turm mehr: Mitspieler teleportieren wie echte Spieler – 500 Edelsteine (bzw. Gratis-Teleport
  im Anfängerschutz), dieselben Prüfungen (`tpPruefen`), Hauptstadt mit Truppen an eine freie Stelle neben dem gewählten
  eigenen Turm (`botTeleportCapital`/`botTpOrt`). Zu wenig Edelsteine: kein Umzug.
- Wann (`botCapitalPlan`): ab 6 eigenen Türmen in der Nähe 1–3 Ringe nach vorne, nur wenn hinten Ruhe ist; Ärger hinten
  (≥ 3 Angriffe/Verluste in 20 Min., `botAerger`) → zurück und helfen; Bündnis „gemeinsam vorrücken“ zum Treffpunkt.

## Sparen (8.10.)
- Kisten, Heldenkisten, Beschleunigen, Helden-Reset nur aus dem, was über dem Spar-Ziel liegt (`botSparZiel`): Teleport 500
  (ab 8 Basen), Premium-Pass (Saison läuft noch ≥ 7 Tage), 2. Baumeister – je Gruppe verschieden (`BOT_SPAR`). Pass und
  Baumeister kaufen sie, sobald es reicht. Rest 50 Edelsteine (`BOT_GEMS_REST`); Sterne und Schilde bleiben dringend.
- Edelsteine aus Aufgaben wie du (`questGemsTag` = 42, alle 7 Tage + 150 Wochenkette). Test `mitspieler_sparen_test`.

## Stadt, Helden, Forschung
- Bauen Burg und Gebäude mit gleichen Kosten, forschen nach Spielstil (`BOT_FO_LIEBER`, neue Labor-23-Forschungen zuletzt),
  handeln am Markt, sammeln Rohstoffe, wählen Helden-Paare (`heroPickPair`) und Verteidigungs-Helden (`botVhCare`).
- Aussehen: kaufen keine Rahmen (Rahmen nur Titel, siehe `oberflaeche-design.md`).

## Bündnis und Chat (Einzelheiten `buendnis.md`)
- Gründen (~1 Bündnis je 6 Mitspieler), beitreten, einladen, tauschen, wechseln, entfernen, Führung abgeben, öffnen/schließen.
- Antworten im Chat nur mit dem, was sie dann tun (Rally starten, beitreten, „Bin zu weit weg“, „Kein Weg dorthin – ein Tor
  ist zu“, „Starte du die Rally – ich trete bei!“); auf „Später“ folgt nach 5–15 Min. „Jetzt!“ oder „Nein“.
- Lesen geteilte Kampfberichte (nur frische): schwach → greifen mit an; zu stark → Rally; eigener Ort → „Gut gemacht!“.
- Signal „Rückzug!“: kehren mit allem um, holen Verstärkung heim, brechen Rally ab.
- Helfen von selbst bei Angriffen und Rallys gegen Mitglieder (auch echte Spieler und Hauptstädte), beschleunigen zur Rally
  mit Edelsteinen (bis 4×).

## Tests
`mitspieler_feld_test`, `mitspieler_schaetzen_test`, `mitspieler_mitte_test`, `mitspieler_sparen_test`, `teleport_test`,
`bund_mitte_test`.
