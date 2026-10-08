# Übergabe (Stand 8.10. abends)

Erst lesen: `CLAUDE.md`, dann `doku/INDEX.md`. Offene Punkte: `doku/merkliste.md`.

## Stand
- Branch `claude/neues-projekt-8agldl` = alles fertig + geprüft (Endprüfung: komplett.sh grün, Server-Tests grün außer
  `kiste_test` = leere Test-Welt, bekannt). **Live: NICHTS hochgeladen** (Wartung; Alexander will erst weiterbauen).
- Test-Vorschau (unbegrenzt): https://claude.ai/artifact/XPoQzPd5cwov4ybQTTWN93
  (neu veröffentlichen: `vorschau_bauen.php <ordner> test`, Reset-Skript mit neuem `owVorschauStand` vor
  `klein/ladebildschirm.js`, Publish mit `url` + `root` + nur geänderten `files`).
- Server-Tests brauchen MariaDB: im neuen Container neu einrichten (Endprüfer kann das, siehe `tests/server_tests.sh`-Kopf).

## Nächste Schritte (mit Alexander besprechen, erst reden, dann starten)
1. Zahlen + Thron-Shop zusammen mit Alexander (eigene Frage-Runde, viel zu ändern).
2. Wichtig später: Hauptbuch zählt keine Bauarbeiter-Plätze (Schummel-Lücke).
3. Später: Namensschild-Skins, kompletter Code-Check / alter Code raus.
4. Hochladen + Welt-Neustart erst auf Alexanders Ja (neue Karte braucht neue Welt), danach `werkzeuge/nach_hochladen.sh`,
   Live-Wächter-Routine trig_01Qoa3CR2p5twrXZEv5Uvahh aktivieren, alte `baukunst.js` auf dem Server löschen.

## Offene Fragen an Alexander
- Fremde Tabellen eines anderen Spiels in der Datenbank löschen?
- Erfolge bleiben über den Saison-Reset – so gewollt?
- Ansehen: Ladebild/Login, Heldenhalle, Saison-Reset.

## Arbeitsweise, die gut lief
Erst reden → Test-Datei/Fotos zeigen → Alexander sagt Ja → einbauen. Fotos immer mit normalen Zahlen (Vorschau ohne „test“).
Designer prüft Fotos vor Alexander; Überlappungs-Tests (`fenster_neu_test`, `karte_ring_test`) streng halten.
