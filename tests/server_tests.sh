#!/bin/bash
# Server-Tests mit lokalem PHP-Server + MariaDB + Weltrechner (dauert ca. 30 Minuten).
#   tests/server_tests.sh <arbeitsordner>     → am Ende „ALLES OK“ oder die Liste der Fehler
# <arbeitsordner> enthält:
#   www/html/725/klassenarbeit_GR4/Game/  lokaler Spiel-Ordner (mit eigener config.php: Test-Datenbank, nie im Git)
#   zugang.env   (nicht im Git) OW_ADMIN_NAME=…, OW_ADMIN_PW=…, OW_TEST_PW=…  (Test-Konten der lokalen Datenbank;
#                können auch als Umgebungsvariablen gesetzt sein)
#   php8770.log  (wenn da) Ausgabe des PHP-Servers – neue PHP-Warnungen gelten als Fehler
# Vorher starten:  service mariadb start;  cd <arbeitsordner> && nohup php -S 127.0.0.1:8770 -t www >> php8770.log 2>&1 &
# Ablauf: Game/ in den lokalen Server kopieren (ohne config.php und die Laufzeit-Dateien des Weltrechners),
# Weltrechner neu starten, dann die Tests aus tests/server/:
#   absturz_test  Weltrechner-Absturz, Leitung, ganz-oder-gar-nicht beim Speichern, Sicherung + Zurückspielen
#   admin_test    Admin freischalten, Rückfrage beim Zurückspielen, keine CSP-/Skript-Fehler
#   armee_test    Nebel: fremde Armeen/Felder im Nebel ohne Zahlen
#   kiste_test    Bündnis-Kiste: Geschenk nur bei echter Heldenkiste
#   verst_test    Verstärkung über Server + Weltrechner (hin, sichtbar nur fürs Bündnis, zurück)
#   schummel_test verändertes Handy: Münzen/Holz erfinden, Fähigkeiten ohne Gems, Gebäude ohne Bauzeit – nichts davon in der Welt
#   klick_test    neuer Spieler: alle Fenster/Knöpfe, Angriff, Bau, neu laden, keine Schummel-Hinweise
# Einzelne Tests: tests/server_tests.sh <arbeitsordner> kiste_test armee_test
cd "$(dirname "$0")/.." || exit 1
G=$(pwd)
A="${1:?Aufruf: tests/server_tests.sh <arbeitsordner> [test …]}"; A=$(cd "$A" && pwd) || exit 1; shift
PORT="${OW_TEST_PORT:-8770}"
export OW_TEST_GAME="$A/www/html/725/klassenarbeit_GR4/Game"
export OW_TEST_URL="http://127.0.0.1:$PORT/html/725/klassenarbeit_GR4/Game/"
[ -f "$A/zugang.env" ] && { set -a; . "$A/zugang.env"; set +a; }
for v in OW_ADMIN_NAME OW_ADMIN_PW OW_TEST_PW; do [ -n "${!v}" ] || { echo "FEHLER: $v fehlt (in $A/zugang.env oder als Umgebungsvariable)"; exit 1; }; done
[ -f "$OW_TEST_GAME/config.php" ] || { echo "FEHLER: $OW_TEST_GAME/config.php fehlt"; exit 1; }
curl -s -o /dev/null --max-time 10 "$OW_TEST_URL" || { echo "FEHLER: lokaler Server antwortet nicht ($OW_TEST_URL) – siehe Kopf dieses Skripts"; exit 1; }
db() { MYSQL_PWD=$(php -r 'echo (require $argv[1])["db_pass"];' "$OW_TEST_GAME/config.php") mysql -h 127.0.0.1 \
  -u "$(php -r 'echo (require $argv[1])["db_user"];' "$OW_TEST_GAME/config.php")" "$(php -r 'echo (require $argv[1])["db_name"];' "$OW_TEST_GAME/config.php")" -N -e "$1"; }
db "SELECT 1" >/dev/null || { echo "FEHLER: Datenbank nicht erreichbar (service mariadb start?)"; exit 1; }

TESTS="${*:-absturz_test admin_test armee_test kiste_test verst_test schummel_test klick_test}"
werkzeuge/spiel_bauen.sh >/dev/null || exit 1
rsync -a --exclude config.php --exclude 'weltrechner/herz*.php' --exclude 'weltrechner/log*.php' --exclude 'weltrechner/zustand*.php' \
  --exclude 'weltrechner/sperre.php' --exclude 'weltrechner/schummel*.php' --exclude 'weltrechner/vapid*.php' --exclude 'weltrechner/crontab*' \
  --exclude 'weltrechner/altwelt_*' --exclude wartung.txt "$G/Game/" "$OW_TEST_GAME/"
curl -s -o /dev/null "$OW_TEST_URL"
db "DELETE FROM ow_bremse"
echo "== Weltrechner neu starten: $(cd "$OW_TEST_GAME/weltrechner" && php -r '$_SERVER["SCRIPT_FILENAME"]="x"; require "wachhund.php"; echo wachhund_neustart();')"
sleep 20
PL="$A/php8770.log"; WL="$OW_TEST_GAME/weltrechner/log.php"
PL0=$(cat "$PL" 2>/dev/null | wc -l); WL0=$(cat "$WL" 2>/dev/null | wc -l)

LOG=$(mktemp); BILDER=$(mktemp -d); FEHLER=""
for t in $TESTS; do
  db "DELETE FROM ow_bremse"
  echo "== $t"
  ARG=""; [ "$t" = klick_test ] && ARG="pruefer$(date +%H%M%S) $BILDER"
  timeout 1500 node "tests/server/$t.js" $ARG > "$LOG" 2>&1
  grep -E "^(OK|FEHLER)" "$LOG"
  if [ "$(tail -1 "$LOG")" != "Alles OK" ]; then FEHLER="$FEHLER $t"; grep -E "^(OK|FEHLER)" -v "$LOG" | tail -15; fi
done
NP=$(tail -n +$((PL0 + 1)) "$PL" 2>/dev/null | grep -ciE 'php (warning|notice|fatal)|deprecated')
NW=$(tail -n +$((WL0 + 1)) "$WL" 2>/dev/null | grep -c FEHLER)
echo "== neue PHP-Warnungen: $NP · neue Weltrechner-FEHLER: $NW"
[ "$NP" = 0 ] || { tail -n +$((PL0 + 1)) "$PL" | grep -iE 'php (warning|notice|fatal)|deprecated' | sort | uniq -c | head; FEHLER="$FEHLER PHP-Warnungen"; }
[ "$NW" = 0 ] || { tail -n +$((WL0 + 1)) "$WL" | grep FEHLER | head; FEHLER="$FEHLER Weltrechner-Log"; }
rm -rf "$LOG" "$BILDER"
[ -z "$FEHLER" ] && echo "ALLES OK" || { echo "ES GIBT FEHLER:$FEHLER"; exit 1; }
