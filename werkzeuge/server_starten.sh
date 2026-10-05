#!/bin/bash
# Lokalen Test-Server starten (für tests/server_tests.sh), nur was noch nicht läuft:
#   MariaDB (service mariadb start) und php -S 127.0.0.1:8770 -t www im Arbeitsordner (Log <arbeitsordner>/php8770.log)
# Aufruf: werkzeuge/server_starten.sh <arbeitsordner>   (Port: OW_TEST_PORT, Standard 8770)
# Am Ende Prüfung per curl: „SERVER OK“ oder „FEHLER: …“ (Exit-Code 1).
A="${1:?Aufruf: werkzeuge/server_starten.sh <arbeitsordner>}"; A=$(cd "$A" && pwd) || exit 1
PORT="${OW_TEST_PORT:-8770}"
URL="http://127.0.0.1:$PORT/html/725/klassenarbeit_GR4/Game/"
service mariadb status >/dev/null 2>&1 || { echo "== MariaDB starten"; service mariadb start >/dev/null || { echo "FEHLER: MariaDB startet nicht"; exit 1; }; }
if curl -s -o /dev/null --max-time 5 "$URL"; then echo "== PHP-Server läuft schon (Port $PORT)"
else
  [ -d "$A/www" ] || { echo "FEHLER: $A/www fehlt"; exit 1; }
  echo "== PHP-Server starten (Port $PORT, Log $A/php$PORT.log)"
  (cd "$A" && exec nohup php -S 127.0.0.1:$PORT -t www >> "php$PORT.log" 2>&1 < /dev/null 9>&-) &
  for i in $(seq 1 20); do curl -s -o /dev/null --max-time 2 "$URL" && break; sleep 0.5; done
fi
curl -s -o /dev/null --max-time 10 "$URL" || { echo "FEHLER: lokaler Server antwortet nicht ($URL)"; exit 1; }
echo "SERVER OK"
