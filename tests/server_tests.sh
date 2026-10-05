#!/bin/bash
# Server-Tests mit lokalem PHP-Server + MariaDB + Weltrechner – in 3 Gruppen GLEICHZEITIG (ca. 13–15 statt 30 Minuten).
#   tests/server_tests.sh <arbeitsordner>     → am Ende „ALLES OK“ oder die Liste der Fehler
# <arbeitsordner> enthält:
#   www/html/725/klassenarbeit_GR4/Game/  lokaler Spiel-Ordner (mit eigener config.php: Test-Datenbank, nie im Git)
#   zugang.env   (nicht im Git) OW_ADMIN_NAME=…, OW_ADMIN_PW=…, OW_TEST_PW=…  (Test-Konten der lokalen Datenbank;
#                können auch als Umgebungsvariablen gesetzt sein)
#   php8770.log  (wenn da) Ausgabe des PHP-Servers – neue PHP-Warnungen gelten als Fehler
# MariaDB + PHP-Server (8770): startet das Skript selbst über werkzeuge/server_starten.sh, wenn 8770 nicht antwortet
#   (von Hand: service mariadb start;  cd <arbeitsordner> && nohup php -S 127.0.0.1:8770 -t www >> php8770.log 2>&1 &)
# Gruppen: Gruppe 1 läuft auf dem Server oben (Port 8770 bzw. OW_TEST_PORT). Für Gruppe 2 und 3 legt das Skript selbst an:
#   <arbeitsordner>/gruppeN/www/…/Game   eigene Kopie des Spiel-Ordners (config.php: eigene Datenbank + Adresse)
#   Datenbank <testdb>_gN                bei jedem Lauf frisch kopiert aus der Test-Datenbank (ohne alte Sicherungen);
#                                        braucht „mysql“ als Datenbank-Admin ohne Passwort (root über den Socket)
#   php -S auf Port 8771/8772 (Port+1/+2) mit Log gruppeN/php877N.log, eigener Weltrechner
#   Am Ende werden PHP-Server und Weltrechner der Gruppen 2/3 beendet. OW_TEST_GRUPPEN=1: alles nacheinander wie früher.
# Ablauf je Gruppe: Game/ in den Spiel-Ordner kopieren (ohne config.php und die Laufzeit-Dateien des Weltrechners),
# Weltrechner neu starten, dann ihre Tests aus tests/server/ (Minuten: gemessen 5.10. in komplett.sh unter Last;
# die aktuellen Zeiten stehen in tests/zeiten.txt):
#   absturz_test (0,7) Weltrechner-Absturz, Leitung, ganz-oder-gar-nicht beim Speichern, Sicherung + Zurückspielen
#   admin_test (0,5) Admin freischalten, Rückfrage beim Zurückspielen, keine CSP-/Skript-Fehler
#   armee_test (0,6) Nebel: fremde Armeen/Felder im Nebel ohne Zahlen
#   kiste_test (7,5) Bündnis-Kiste: Geschenk nur bei echter Heldenkiste
#   verst_test (5,5) Verstärkung über Server + Weltrechner (hin, sichtbar nur fürs Bündnis, zurück)
#   schummel_test (11) verändertes Handy: Münzen/Holz erfinden, Gebäude ohne Bauzeit – nichts davon in der Welt
#   klick_test (7,5) neuer Spieler: alle Fenster/Knöpfe, Angriff, Bau, neu laden, keine Schummel-Hinweise
# Gruppen: nach tests/zeiten.txt verteilt (längster Test zuerst in die bisher kürzeste Gruppe → ungefähr gleich lang);
#   nach jedem grünen Test wird seine Dauer dort aktualisiert (fehlt eine Zeit: Schätzung ZEIT_SCHAETZUNG unten).
#   OW_TROCKEN=1: nur die Gruppen anzeigen, nichts starten.
# Rote Tests werden am Ende EINMAL allein (Gruppe 1, nichts anderes läuft) wiederholt: grün → zählt als OK, aber
#   „rot → grün bei Wiederholung (Last?)“; wieder rot → FEHLER.
# OW_FORTSCHRITT=<datei>: je Test eine Zeile (Gruppe, Test, Start, Ergebnis) – setzt tests/komplett.sh.
# Einzelne Tests (nacheinander, nur Gruppe 1): tests/server_tests.sh <arbeitsordner> kiste_test armee_test
# Nur betroffene Tests: tests/server_tests.sh <arbeitsordner> betroffen [<git-bereich>]
#   schaut git diff --name-only <git-bereich> an (Standard origin/claude/neues-projekt-8agldl...HEAD, dazu Änderungen ohne
#   Commit) und wählt die Tests nach der Tabelle BETROFFEN unten (in den üblichen Gruppen). OW_TROCKEN=1: nur anzeigen.
cd "$(dirname "$0")/.." || exit 1
G=$(pwd)
. werkzeuge/fortschritt.sh
A="${1:?Aufruf: tests/server_tests.sh <arbeitsordner> [test …]}"; A=$(cd "$A" && pwd) || exit 1; shift

# Tabelle BETROFFEN: Datei-Muster (wie bei case, Pfad ab Projekt-Ordner) → Server-Tests, die davon abhängen
BETROFFEN=(
  "Game/server.php|Game/server/*|Game/speichern.js            → klick_test admin_test absturz_test schummel_test"
  "Game/admin.php|Game/index.php                              → admin_test absturz_test"
  "Game/spiel.php|Game/spielseite/*|Game/ladebildschirm.js|Game/aufbau.js|Game/baukunst.js|Game/baukunst/*|Game/haendler.js|Game/sw.js|Game/app/* → klick_test"
  "Game/welt.js                                               → klick_test verst_test armee_test schummel_test"
  "Game/weltrechner/*                                         → absturz_test schummel_test verst_test kiste_test armee_test"
  "Game/buendnis/*|Game/buendnis.js                           → verst_test kiste_test klick_test"
  "Game/bots/*|Game/bots.js                                   → armee_test verst_test klick_test"
  "Game/spiel/10d*                                            → schummel_test absturz_test verst_test kiste_test"
  "Game/spiel/09f*|*saison*                                   → admin_test absturz_test"
  "Game/spiel/05b*                                            → kiste_test"
  "Game/spiel/01e*|Game/spiel/06e*|Game/spiel/09d*            → armee_test"
  "Game/spiel/*|Game/spiel.js                                 → klick_test"
  "tests/server/gemeinsam.js|tests/server_tests.sh|werkzeuge/server_starten.sh → absturz_test admin_test armee_test kiste_test verst_test schummel_test klick_test"
  "tests/server/geschenk.sh                                   → kiste_test verst_test klick_test"
)
if [ "$1" = betroffen ]; then
  BEREICH="${2:-origin/claude/neues-projekt-8agldl...HEAD}"
  DATEIEN=$(git diff --name-only "$BEREICH") || { echo "FEHLER: git diff $BEREICH geht nicht"; exit 1; }
  DATEIEN=$(printf '%s\n%s\n' "$DATEIEN" "$(git diff --name-only HEAD)" | sort -u)
  WAHL=" "
  for f in $DATEIEN; do
    case "$f" in tests/server/*_test.js) t=${f#tests/server/}; WAHL="$WAHL${t%.js} ";; esac   # geänderter Test selbst
    for z in "${BETROFFEN[@]}"; do
      IFS='|' read -ra MUSTER <<< "$(echo "${z%%→*}" | tr -d ' ')"
      for m in "${MUSTER[@]}"; do
        # shellcheck disable=SC2254
        case "$f" in $m) WAHL="$WAHL${z#*→} "; break;; esac
      done
    done
  done
  set --
  for t in klick_test verst_test absturz_test armee_test kiste_test admin_test schummel_test; do [[ "$WAHL" == *" $t "* ]] && set -- "$@" "$t"; done
  echo "== geänderte Dateien ($BEREICH): $(echo $DATEIEN | wc -w) · betroffene Server-Tests: ${*:-keine}"
  [ $# = 0 ] && { echo "keine betroffenen Server-Tests"; exit 0; }
  BETR_AUSWAHL="$*"; set --
fi

# Gruppen nach Dauer verteilen (Sekunden aus tests/zeiten.txt, sonst Schätzung): längster zuerst in die kürzeste Gruppe
ALLE_TESTS="klick_test verst_test absturz_test armee_test kiste_test admin_test schummel_test"
declare -A ZEIT_SCHAETZUNG=([klick_test]=300 [verst_test]=240 [absturz_test]=60 [armee_test]=60 [kiste_test]=240 [admin_test]=30 [schummel_test]=660)
declare -A ZEIT
for t in $ALLE_TESTS; do ZEIT[$t]=${ZEIT_SCHAETZUNG[$t]}; done
while read -r t s; do [[ "$t" == *_test && "$s" =~ ^[0-9]+$ ]] && ZEIT[$t]=$s; done < <(grep -v '^#' "$G/tests/zeiten.txt" 2>/dev/null)
verteilen() {   # $1 = Zahl der Gruppen, danach die Tests → GRUPPEN
  local k=$1 t i b; shift; local SUM=()
  GRUPPEN=(); [ "$k" -gt $# ] && k=$#
  for i in $(seq 0 $((k - 1))); do GRUPPEN[i]=""; SUM[i]=0; done
  for t in $(for t in "$@"; do echo "${ZEIT[$t]:-60} $t"; done | sort -s -k1,1nr | cut -d' ' -f2); do
    b=0; for i in "${!SUM[@]}"; do [ "${SUM[i]}" -lt "${SUM[b]}" ] && b=$i; done
    GRUPPEN[b]="${GRUPPEN[b]# } $t"; GRUPPEN[b]="${GRUPPEN[b]# }"; SUM[b]=$((SUM[b] + ${ZEIT[$t]:-60}))
  done
  GRUPPEN_SEK=("${SUM[@]}")
}
if [ $# -gt 0 ]; then GRUPPEN=("$*"); GRUPPEN_SEK=()
elif [ "${OW_TEST_GRUPPEN:-3}" = 1 ]; then GRUPPEN=("absturz_test admin_test armee_test kiste_test verst_test schummel_test klick_test"); GRUPPEN_SEK=()
else verteilen "${OW_TEST_GRUPPEN:-3}" ${BETR_AUSWAHL:-$ALLE_TESTS}; fi
if [ -n "$OW_TROCKEN" ]; then
  for i in "${!GRUPPEN[@]}"; do echo "Gruppe $((i + 1)): ${GRUPPEN[i]}${GRUPPEN_SEK[i]:+ (≈ $((GRUPPEN_SEK[i] / 60)):$(printf %02d $((GRUPPEN_SEK[i] % 60))) Min.)}"; done
  exit 0
fi
exec 9>"$A/.server.lock"; flock -n 9 || { echo "FEHLER: läuft schon in $A"; exit 1; }   # nie zwei Läufe im selben Arbeitsordner
rm -f "$A/GRUPPEN_LAUFEN"
PORT="${OW_TEST_PORT:-8770}"
PFAD="html/725/klassenarbeit_GR4/Game"
GAME1="$A/www/$PFAD"
[ -f "$A/zugang.env" ] && { set -a; . "$A/zugang.env"; set +a; }
for v in OW_ADMIN_NAME OW_ADMIN_PW OW_TEST_PW; do [ -n "${!v}" ] || { echo "FEHLER: $v fehlt (in $A/zugang.env oder als Umgebungsvariable)"; exit 1; }; done
[ -f "$GAME1/config.php" ] || { echo "FEHLER: $GAME1/config.php fehlt"; exit 1; }
curl -s -o /dev/null --max-time 10 "http://127.0.0.1:$PORT/$PFAD/" || OW_TEST_PORT=$PORT werkzeuge/server_starten.sh "$A" 9>&- || exit 1
cfgwert() { php -r 'echo (require $argv[1])[$argv[2]] ?? "";' "$1/config.php" "$2"; }
db() { MYSQL_PWD=$(cfgwert "$1" db_pass) mysql -h "$(cfgwert "$1" db_host)" -u "$(cfgwert "$1" db_user)" "$(cfgwert "$1" db_name)" -N -e "$2"; }
db "$GAME1" "SELECT 1" >/dev/null || { echo "FEHLER: Datenbank nicht erreichbar (service mariadb start?)"; exit 1; }
werkzeuge/spiel_bauen.sh >/dev/null || exit 1

# Eine Gruppe: Spiel-Ordner auffrischen, Weltrechner neu starten, Tests nacheinander, PHP-/Weltrechner-Log prüfen.
# reihe <name> <spiel-ordner> <php-log> <port> <tests…>. Ausgabe je Test „ZEIT <test> <sek>“ bzw. „ROT <test>“,
# letzte Zeile „GRUPPE OK“ oder „GRUPPE FEHLER: …“ (nur PHP-Warnungen/Weltrechner-Log – rote Tests stehen in ROT).
reihe() {
  local NAME="$1" W="$2" PL="$3"; export OW_TEST_GAME="$2" OW_TEST_URL="http://127.0.0.1:$4/$PFAD/"; shift 4
  rsync -a --exclude config.php --exclude 'weltrechner/herz*.php' --exclude 'weltrechner/log*.php' --exclude 'weltrechner/zustand*.php' \
    --exclude 'weltrechner/sperre.php' --exclude 'weltrechner/schummel*.php' --exclude 'weltrechner/vapid*.php' --exclude 'weltrechner/crontab*' \
    --exclude 'weltrechner/altwelt_*' --exclude wartung.txt "$G/Game/" "$W/"
  curl -s -o /dev/null "$OW_TEST_URL"
  db "$W" "DELETE FROM ow_bremse"
  echo "== Weltrechner neu starten: $(cd "$W/weltrechner" && php -r '$_SERVER["SCRIPT_FILENAME"]="x"; require "wachhund.php"; echo wachhund_neustart();' 9>&-)"   # (9>&-: der Weltrechner erbt die Sperre nicht)
  sleep 20
  local WL="$W/weltrechner/log.php" PL0 WL0 LOG BILDER FEHLER="" t ARG T0 NP NW
  PL0=$(cat "$PL" 2>/dev/null | wc -l); WL0=$(cat "$WL" 2>/dev/null | wc -l)
  LOG=$(mktemp); BILDER=$(mktemp -d)
  for t in "$@"; do
    db "$W" "DELETE FROM ow_bremse"
    T0=$SECONDS; fortschritt "$NAME" "$t" läuft
    ARG=""; [ "$t" = klick_test ] && ARG="pruefer$(date +%H%M%S) $BILDER"
    timeout 1500 node "tests/server/$t.js" $ARG > "$LOG" 2>&1 9>&-
    echo "== $t ($(( (SECONDS - T0) / 60 )):$(printf %02d $(( (SECONDS - T0) % 60 ))) Min.)"
    grep -E "^(OK|FEHLER)" "$LOG"
    if [ "$(tail -1 "$LOG")" != "Alles OK" ]; then echo "ROT $t"; fortschritt "$NAME" "$t" "FEHLER ($((SECONDS - T0)) s)"; grep -E "^(OK|FEHLER)" -v "$LOG" | tail -15
    else echo "ZEIT $t $((SECONDS - T0))"; fortschritt "$NAME" "$t" "OK ($((SECONDS - T0)) s)"; fi
  done
  NP=$(tail -n +$((PL0 + 1)) "$PL" 2>/dev/null | grep -ciE 'php (warning|notice|fatal)|deprecated')
  NW=$(tail -n +$((WL0 + 1)) "$WL" 2>/dev/null | grep -c FEHLER)
  echo "== neue PHP-Warnungen: $NP · neue Weltrechner-FEHLER: $NW"
  [ "$NP" = 0 ] || { tail -n +$((PL0 + 1)) "$PL" | grep -iE 'php (warning|notice|fatal)|deprecated' | sort | uniq -c | head; FEHLER="$FEHLER PHP-Warnungen"; }
  [ "$NW" = 0 ] || { tail -n +$((WL0 + 1)) "$WL" | grep FEHLER | head; FEHLER="$FEHLER Weltrechner-Log"; }
  rm -rf "$LOG" "$BILDER"
  [ -z "$FEHLER" ] && echo "GRUPPE OK" || echo "GRUPPE FEHLER:$FEHLER"
}

# Gruppe 2, 3 …: eigener Ordner, eigene Datenbank (frische Kopie), eigener PHP-Server
SERVER_PIDS=""; GRUPPEN_GAME=""
aufraeumen() {
  [ -n "$SERVER_PIDS" ] && kill $SERVER_PIDS 2>/dev/null
  for w in $GRUPPEN_GAME; do pkill -9 -f -- "$w/weltrechner" 2>/dev/null; done
}
trap aufraeumen EXIT
gruppe_db() {   # $1 = Nummer → Datenbank <testdb>_gN frisch als Kopie der Test-Datenbank (ohne alte Sicherungen)
  local DB0 DBN U h; DB0=$(cfgwert "$GAME1" db_name); DBN="${DB0}_g$1"; U=$(cfgwert "$GAME1" db_user)
  mysql -e "DROP DATABASE IF EXISTS \`$DBN\`; CREATE DATABASE \`$DBN\`" || { echo "FEHLER: Datenbank $DBN nicht anlegbar (mysql als Admin nötig)"; return 1; }
  for h in $(mysql -N -e "SELECT host FROM mysql.user WHERE user='$U'"); do mysql -e "GRANT ALL PRIVILEGES ON \`$DBN\`.* TO '$U'@'$h'"; done
  { mysqldump --single-transaction --no-data "$DB0"; mysqldump --single-transaction --no-create-info --ignore-table="$DB0.ow_sicherungen" "$DB0"; } | mysql "$DBN" \
    || { echo "FEHLER: Datenbank $DB0 nicht nach $DBN kopierbar"; return 1; }
}
gruppe_anlegen() {   # $1 = Nummer → legt an und gibt nichts aus außer Fehlern
  local n="$1" GA="$A/gruppe$1" P=$((PORT + $1 - 1)) DBN="$(cfgwert "$GAME1" db_name)_g$1"
  local W="$GA/www/$PFAD"
  curl -s -o /dev/null --max-time 3 "http://127.0.0.1:$P/" && { echo "FEHLER: Port $P ist schon belegt (Gruppe $n)"; return 1; }
  mkdir -p "$W/weltrechner"
  [ -f "$W/weltrechner/vapid.php" ] || cp "$GAME1/weltrechner/vapid.php" "$W/weltrechner/" 2>/dev/null
  # config.php der Gruppe: alles wie Gruppe 1 (liest deren config.php – kein Passwort in einer neuen Datei), nur Datenbank + Adresse anders
  printf '<?php return array_replace(require %s, [%s => %s, %s => %s]);\n' "'$GAME1/config.php'" "'db_name'" "'$DBN'" "'spiel_url'" "'http://127.0.0.1:$P/$PFAD/'" > "$W/config.php"
  (cd "$GA" && PHP_CLI_SERVER_WORKERS=4 exec nohup php -S 127.0.0.1:$P -t www >> "php$P.log" 2>&1 < /dev/null 9>&-) & SERVER_PIDS="$SERVER_PIDS $!"
  GRUPPEN_GAME="$GRUPPEN_GAME $W"
  local i; for i in $(seq 1 20); do curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$P/$PFAD/" && return 0; sleep 0.5; done
  echo "FEHLER: PHP-Server der Gruppe $n startet nicht (Port $P)"; return 1
}

T0=$SECONDS
DBP=(); for n in $(seq 2 ${#GRUPPEN[@]}); do gruppe_db $n & DBP+=($!); done   # (Kopien gleichzeitig)
for p in "${DBP[@]}"; do wait $p || exit 1; done
for n in $(seq 2 ${#GRUPPEN[@]}); do gruppe_anlegen $n || exit 1; done
OUT=$(mktemp -d); PIDS=()
for i in "${!GRUPPEN[@]}"; do for t in ${GRUPPEN[$i]}; do fortschritt "Gruppe $((i + 1))" "$t" wartet; done; done
for i in "${!GRUPPEN[@]}"; do
  n=$((i + 1))
  P=$((PORT + n - 1))
  if [ $n = 1 ]; then W="$GAME1"; PL="$A/php$P.log"
  else W="$A/gruppe$n/www/$PFAD"; PL="$A/gruppe$n/php$P.log"; fi
  reihe "Gruppe $n" "$W" "$PL" "$P" ${GRUPPEN[$i]} > "$OUT/$n.log" 2>&1 &
  PIDS+=($!)
done
touch "$A/GRUPPEN_LAUFEN"   # (für tests/komplett.sh: jetzt laufen alle Gruppen)
wait "${PIDS[@]}"
FEHLER=""; ROT=""
for i in "${!GRUPPEN[@]}"; do
  n=$((i + 1))
  [ ${#GRUPPEN[@]} -gt 1 ] && echo "===== Gruppe $n: ${GRUPPEN[$i]}"
  grep -vE '^(GRUPPE|ZEIT|ROT) ' "$OUT/$n.log"
  grep -q '^GRUPPE OK$' "$OUT/$n.log" || FEHLER="$FEHLER $(grep '^GRUPPE FEHLER:' "$OUT/$n.log" | sed 's/^GRUPPE FEHLER://')"
  grep -q '^GRUPPE ' "$OUT/$n.log" || FEHLER="$FEHLER Gruppe$n-abgebrochen"
  ROT="$ROT $(sed -n 's/^ROT //p' "$OUT/$n.log" | tr '\n' ' ')"
done
# Dauer der grünen Tests in tests/zeiten.txt (danach werden beim nächsten Lauf die Gruppen verteilt)
cat "$OUT"/*.log | sed -n 's/^ZEIT //p' > "$OUT/zeiten"
if [ -s "$OUT/zeiten" ]; then
  while read -r t s; do ZEIT[$t]=$s; done < "$OUT/zeiten"
  { grep '^#' tests/zeiten.txt 2>/dev/null || echo "# Dauer der Server-Tests in Sekunden (schreibt tests/server_tests.sh nach jedem grünen Test neu; danach verteilt es die Gruppen)"
    for t in $(printf '%s\n' "${!ZEIT[@]}" | sort); do echo "$t ${ZEIT[$t]}"; done; } > "$OUT/neu" && cp "$OUT/neu" tests/zeiten.txt
fi
# Rote Tests EINMAL allein wiederholen (alle Gruppen sind fertig – keine Last mehr): grün → OK mit Hinweis, rot → FEHLER
WIEDER=""
if [ -n "${ROT// /}" ]; then
  echo "===== Wiederholung allein:$ROT"
  reihe Wiederholung "$GAME1" "$A/php$PORT.log" "$PORT" $ROT > "$OUT/w.log" 2>&1
  grep -vE '^(GRUPPE|ZEIT|ROT) ' "$OUT/w.log"
  for t in $ROT; do
    if grep -q "^ZEIT $t " "$OUT/w.log"; then WIEDER="$WIEDER $t"; echo "== $t: rot → grün bei Wiederholung (Last?)"
    else FEHLER="$FEHLER $t"; fi
  done
  grep -q '^GRUPPE OK$' "$OUT/w.log" || FEHLER="$FEHLER Wiederholung:$(sed -n 's/^GRUPPE FEHLER://p' "$OUT/w.log")"
fi
rm -rf "$OUT"
echo "== Dauer: $(( (SECONDS - T0) / 60 )) Min. $(( (SECONDS - T0) % 60 )) s"
[ -n "$WIEDER" ] && echo "rot → grün bei Wiederholung (Last?):$WIEDER"
[ -z "${FEHLER// /}" ] && echo "ALLES OK" || { echo "ES GIBT FEHLER:$FEHLER"; exit 1; }
