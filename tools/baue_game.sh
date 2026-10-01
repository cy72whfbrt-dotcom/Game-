#!/bin/sh
# Baut den Server-Ordner "Game" nach dist/Game (zum Hochladen auf office.hobbitonhill.de).
# Das Spiel selbst bleibt index.html / botlogik.js / baukunst.js - hier wird es nur für den Server verpackt.
set -e
cd "$(dirname "$0")/.."
rm -rf dist/Game
mkdir -p dist/Game/api dist/Game/js dist/Game/inhalt dist/Game/daten
cp server/index.php server/spiel.php dist/Game/
cp server/api/lib.php server/api/speichern.php server/api/config.beispiel.php dist/Game/api/
# Zugangsdaten nur aus den Umgebungsvariablen (nie ins Git): DB_USER, DB_PASS, DB_HOST, DB_NAME
if [ -n "$DB_PASS" ]; then
  php -r '$c = ["speicher" => "mysql", "db_host" => getenv("DB_HOST") ?: "dbwebintern.silentnetwork.de", "db_name" => getenv("DB_NAME") ?: "k17700_alex", "db_user" => getenv("DB_USER"), "db_pass" => getenv("DB_PASS")];
    file_put_contents("dist/Game/api/config.php", "<?php\n// Zugangsdaten - nie ins Git\nreturn " . var_export($c, true) . ";\n");'
fi
cp server/daten/index.php dist/Game/daten/
cp server/js/speicher.js server/js/fflate.min.js botlogik.js baukunst.js dist/Game/js/
printf '<?php http_response_code(404); exit;\n' > dist/Game/inhalt/index.php
# Spielseite: erste Zeile sperrt den direkten Aufruf, Skripte liegen in js/
{ printf '<?php http_response_code(404); exit; ?>\n'
  sed -e 's#src="botlogik.js"#src="js/botlogik.js"#' -e 's#src="baukunst.js"#src="js/baukunst.js"#' index.html; } > dist/Game/inhalt/spiel.php
grep -q 'src="js/botlogik.js"' dist/Game/inhalt/spiel.php && grep -q 'src="js/baukunst.js"' dist/Game/inhalt/spiel.php
echo "fertig: dist/Game"
