# Open Water auf dem eigenen Server

Ordner `Game` = genau das, was auf den Server kommt (`…/klassenarbeit_GR4/Game/`).

- `index.php` – Startseite: Anmelden / Registrieren (Passwörter nur gehasht).
- `spiel.php` – das Spiel (nur angemeldet). Lädt den Spielstand aus der Datenbank direkt in die Seite.
- `js/speicher.js` – hält den Stand im Arbeitsspeicher, schickt ihn alle 10 s (und beim Verlassen) gepackt an `api/speichern.php`.
- `api/konto.php` – registrieren, anmelden, abmelden. `api/speichern.php` – Spielstand speichern.
- `inc/db.php` – Datenbank + Login-Cookie `ow_sid` (HttpOnly, 30 Tage). `inc/config.php` – Zugangsdaten, **nur auf dem Server, nie im Git** (Vorlage: `config.beispiel.php`).
- `inc/spiel.html`, `js/botlogik.js`, `js/baukunst.js` – werden von `tools/server_bauen.sh` aus dem Spiel kopiert.

Im Browser wird nichts gespeichert außer dem Login-Cookie. Nur das zuletzt geöffnete Spielfenster darf speichern.
Tabellen (werden beim ersten Anmelden selbst angelegt): `ow_users`, `ow_sessions`, `ow_saves` (ein gepackter Stand pro Spieler),
`ow_backups` (stündliche Sicherung, die letzten 48), `ow_fails` (Schutz gegen Passwort-Durchprobieren).
Neue Spieler starten bei Null: die alten Test-Geschenke, Zeitsprünge und das Vorspulen der Mitspieler sind für sie abgeschaltet.
