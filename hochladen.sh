#!/bin/bash
# hochladen.sh – lädt den Ordner Game/ auf office.hobbitonhill.de (…/klassenarbeit_GR4/Game/).
# Während des Hochladens ist WARTUNG an (Datei wartung.txt): niemand kommt ins Spiel (auch kein Admin).
# NUR nach Alexanders Ja benutzen (Regel in LIESMICH.md). Nur lesend, jederzeit: ./hochladen.sh pruefen (PHP-Dateien auf dem
# Server = Game/ hier?).
# Zugangsdaten nur aus den Umgebungsvariablen: OFFICE_USER, OFFICE_PASS, DB_USER, DB_PASS (DB_HOST, DB_NAME optional).
# config.php (Datenbank-Zugang) wird dabei aus den Variablen erzeugt – sie liegt nie im Git.
# Robust (6.10.; vorher brach spiel.php 2× mit „curl: (35) Connection reset by peer“ ab): jede Anfrage hat Zeitgrenzen und wird
# bis zu 3× wiederholt (Pausen 5/15/30 s). Jede hochgeladene Datei wird danach über den Editor zurückgelesen und mit dem lokalen
# Stand verglichen (anders → nochmal hochladen). Erst wenn alles gleich ist: Wartung aus – und geprüft, dass wartung.txt weg ist.
# Klappt etwas auch nach 3 Wiederholungen nicht: große Meldung „WARTUNG NOCH AN – …“, Ende mit Fehler (einfach neu starten).
# Zum Testen umleitbar (tests/browser/welt_hochladen_test.js, nachgebauter Editor): OW_OFFICE (statt https://office.hobbitonhill.de),
# OW_PAUSEN („5 15 30“), OW_WARTUNG_PAUSE (10 s), OW_MAXZEIT (300 s je Anfrage), OW_VERBINDEN (20 s Verbindungsaufbau).
cd "$(dirname "$0")" || exit 1
O=${OW_OFFICE:-https://office.hobbitonhill.de}
B=/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4
E=$O/html/editor.php
U=$O/html/725/klassenarbeit_GR4/Game
read -r -a PAUSEN <<< "${OW_PAUSEN:-5 15 30}"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
umask 077
WARTUNG=0   # 1: wartung.txt liegt auf dem Server

# Ende mit Fehler – bei eingeschalteter Wartung unübersehbar (das Spiel bleibt zu, bis das Hochladen ganz geklappt hat)
abbruch() {
  if [ "$WARTUNG" = 1 ]; then
    echo; echo "####################################################################"
    echo "  WARTUNG NOCH AN – $1"
    echo "  ./hochladen.sh erneut starten"
    echo "####################################################################"
  else echo "FEHLER: $1 – Wartung nicht eingeschaltet, nichts hochgeladen"; fi
  exit 1
}
# nochmal <befehl…>: klappt der Befehl nicht, bis zu 3 Wiederholungen mit Pause
nochmal() {
  "$@" && return 0
  local p
  for p in "${PAUSEN[@]}"; do echo "  … nicht geklappt, neuer Versuch in $p s" >&2; sleep "$p"; "$@" && return 0; done
  return 1
}
c() { curl -sS --connect-timeout "${OW_VERBINDEN:-20}" --max-time "${OW_MAXZEIT:-300}" "$@"; }
# ed <pfad> [curl-args…]: Editor des Hosters (Inhalt bzw. Ordnerliste) · ed_tun: Aktion, Erfolg nur bei Antwort 2xx/3xx
ed() { local pfad=$1; shift; c -b "$T/jar" "$E?h=48&w=138&sid=$SID&path=$B$pfad&charset=&lines=" "$@"; }
ed_tun() { local code; code=$(ed "$@" -o /dev/null -w '%{http_code}') || return 1
  case "$code" in 2*|3*) return 0;; esac; echo "  Editor antwortet $code" >&2; return 1; }
# ls_ordner <pfad>: Namen in einem Ordner auf dem Server (Ergebnis in $T/liste; Fehler, wenn nicht lesbar)
ls_ordner() { c -b "$T/jar" "$E?h=48&w=138&sid=$SID&path=$B$1" -o "$T/ls.html" || return 1
  grep -o 'path=[^"&]*' "$T/ls.html" | sed "s#.*klassenarbeit_GR4$1/##" | grep -v '^\.\.$\|^path=' | sort -u > "$T/liste"; }
# ed_lesen <datei unter Game/> <ziel>: Inhalt aus dem Textfeld des Editors, Kürzel <bsl>/<n> … zurückverwandelt
# (werkzeuge/editor_text.php, auch für werkzeuge/nach_hochladen.sh)
ed_lesen() { ed "/Game/$1" -o "$T/roh.html" || return 1; php werkzeuge/editor_text.php "$T/roh.html" "$2"; }
# Vergleich mit dem Editor: Zeilenenden und Leerzeilen am Anfang/Ende zählen nicht (so zeigt ihn das Textfeld) – alles andere schon
text_gleich() { php -r '$n = function ($f) { return trim(str_replace("\r", "", file_get_contents($f)), "\n"); }; exit($n($argv[1]) === $n($argv[2]) ? 0 : 1);' "$1" "$2"; }
url_holen() { c -H 'Cache-Control: no-cache' "$U/$1?v=$RANDOM$RANDOM" -o "$T/url"; }
url_gleich() { url_holen "$1" && [ "$(sha1sum < "$2")" = "$(sha1sum < "$T/url")" ]; }
# gleich <datei> <lokale quelle>: ist die Datei genau so auf dem Server? PHP nur über den Editor (über die Adresse liefe sie),
# Bilder über die Adresse (Textfeld zeigt keine Bytes), alles andere über den Editor – zeigt er sie anders, zählt die Adresse
gleich() {
  case "$1" in
    *.png|*.jpg|*.jpeg|*.gif|*.ico|*.webp|*.woff|*.woff2) nochmal url_gleich "$1" "$2"; return;;
  esac
  if nochmal ed_lesen "$1" "$T/zurueck" && text_gleich "$2" "$T/zurueck"; then return 0; fi
  case "$1" in *.php) return 1;; esac
  nochmal url_gleich "$1" "$2"
}
# hoch <datei unter Game/> [lokale quelle]: Ordner anlegen, hochladen, zurücklesen + vergleichen; anders angekommen → nochmal
hoch() {
  local f=$1 q=${2:-Game/$1} dir i
  dir=$(dirname "$f"); [ "$dir" = . ] && dir="" || dir="/$dir"
  for i in 0 "${!PAUSEN[@]}"; do
    [ -z "$dir" ] || nochmal ed_tun /Game -F text= -F "file=${dir#/}" -F "button=new folder" || return 1
    nochmal ed_tun "/Game$dir" -F "file=@$q;filename=$(basename "$f")" -F "button=upload" || return 1
    if gleich "$f" "$q"; then echo "$f hochgeladen + geprüft"; return 0; fi
    echo "  $f ist auf dem Server anders als hier – nochmal hochladen"
  done
  return 1
}
nur_server() {   # entstehen nur auf dem Server (Weltrechner) – nie hochladen, nie löschen
  case "$1" in weltrechner/herz*.php|weltrechner/log*.php|weltrechner/zustand*.php|weltrechner/sperre.php|weltrechner/crontab*.php|weltrechner/schummel*.php|weltrechner/vapid*.php) return 0;; esac
  return 1
}

# 1) Anmelden
# (Zugangsdaten über eine Datei statt in der Befehlszeile – dort wären sie in der Prozessliste sichtbar)
printf 'name=%s&pw=%s&login=login' "$(php -r 'echo rawurlencode(getenv("OFFICE_USER"));')" "$(php -r 'echo rawurlencode(getenv("OFFICE_PASS"));')" > "$T/anmelden"
anmelden() { c -c "$T/jar" -b "$T/jar" -L "$O/index.php?" --data-binary @"$T/anmelden" -o "$T/login.html" && grep -q 'sid=[a-f0-9]' "$T/login.html"; }
nochmal anmelden; rm -f "$T/anmelden"
SID=$(grep -o 'sid=[a-f0-9]*' "$T/login.html" 2>/dev/null | head -1 | cut -d= -f2)
[ -n "$SID" ] || abbruch "Office-Login fehlgeschlagen"

# ./hochladen.sh pruefen: NUR LESEN – jede PHP-Datei über den Editor zurücklesen und mit Game/ hier vergleichen (wie nach dem
# Hochladen), nichts hochladen, keine Wartung. Ende 0 = alles gleich.
if [ "$1" = pruefen ]; then
  ANDERS=0
  for f in $(cd Game && find . -name '*.php' | sed 's#^\./##' | sort); do
    [ "$f" = config.php ] && continue
    nur_server "$f" && continue
    case "$f" in spiel/*|bots/*|buendnis/*|spielseite/*|server/*) continue;; esac
    if nochmal ed_lesen "$f" "$T/zurueck" && text_gleich "Game/$f" "$T/zurueck"; then echo "gleich: $f"; else echo "ANDERS: $f"; ANDERS=1; fi
  done
  exit $ANDERS
fi

# 2) config.php aus den Umgebungsvariablen
if [ -n "$DB_PASS" ]; then
  # admin_ids: feste Spieler-Nummern der Admins (alexander = 3), änderbar über die Variable ADMIN_IDS (z. B. "3,5")
  # vapid_public/vapid_private: Schlüssel für Handy-Benachrichtigungen (Variablen VAPID_PUBLIC, VAPID_PRIVATE) – leer = Push aus
  php -r '$c = ["db_host" => getenv("DB_HOST") ?: "dbwebintern.silentnetwork.de", "db_name" => getenv("DB_NAME") ?: "k17700_alex", "db_user" => getenv("DB_USER"), "db_pass" => getenv("DB_PASS"),
    "admin_ids" => array_map("intval", array_filter(explode(",", getenv("ADMIN_IDS") ?: "3"))),
    "spiel_url" => "https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/",
    "wr_schluessel" => bin2hex(random_bytes(32)),   // Schlüssel des Weltrechners: bei jedem Hochladen neu, zufällig, steht nur in config.php
    "vapid_public" => getenv("VAPID_PUBLIC") ?: "", "vapid_private" => getenv("VAPID_PRIVATE") ?: ""];
    file_put_contents($argv[1], "<?php\n// Zugangsdaten der Datenbank - nur auf dem Server, nie ins Git\nreturn " . var_export($c, true) . ";\n");' "$T/config.php"
fi

# 3) Ordner Game anlegen (falls weg), WARTUNG an (niemand kommt ins Spiel, Spielende werden mit "Wartung" rausgebeten),
#    dann alle Dateien hochladen
werkzeuge/spiel_bauen.sh || abbruch "spiel.js/bots.js/buendnis.js/spiel.php/server.php lassen sich nicht zusammensetzen"   # (bearbeitet wird in Game/spiel/, bots/, buendnis/, spielseite/, server/)
# Game/klein/ (verkleinerte Skripte) ist nicht im Git – spiel_bauen.sh hat es eben erzeugt; jede Datei muss da sein und passen
node werkzeuge/verkleinern.js voll || abbruch "Game/klein/ unvollständig"
nochmal ed_tun "" -F text= -F file=Game -F "button=new folder" || abbruch "Ordner Game nicht anlegbar"
# Vorher (Spiel läuft noch): welche Dateien sind anders als auf dem Server? Nur die kommen gleich während der Wartung hoch –
# so ist die Wartung (und die Pause des Weltrechners) kurz. PHP-Dateien lassen sich so nicht vergleichen (sie laufen): immer hoch.
# ALLES=1 ./hochladen.sh lädt wie früher alles hoch. (Nicht erreichbar = anders: dann kommt sie eben hoch.)
AENDERN=""
for f in $(cd Game && find . -type f | sed 's#^\./##' | sort); do
  [ "$f" = config.php ] && continue
  nur_server "$f" && continue
  case "$f" in klein/*.neu) continue;; esac   # (entsteht gerade in einem anderen Bau-Lauf, werkzeuge/verkleinern.js)
  case "$f" in spiel/*|bots/*|buendnis/*|spielseite/*|server/*) continue;; esac   # (die Teile von spiel.js, bots.js, buendnis.js, spiel.php, server.php – auf den Server kommen nur die zusammengesetzten Dateien)
  case "$f" in *.php) AENDERN="$AENDERN $f"; continue;; esac
  if [ -z "$ALLES" ] && { url_holen "$f" 2>/dev/null || url_holen "$f" 2>/dev/null; } && [ "$(sha1sum < "Game/$f")" = "$(sha1sum < "$T/url")" ]; then continue; fi   # (abgebrochen: gleich noch einmal)
  AENDERN="$AENDERN $f"
done
echo "Neu hochzuladen:$AENDERN"
echo "Wartung seit $(date '+%d.%m.%Y %H:%M') (hochladen.sh)" > "$T/wartung.txt"
nochmal ed_tun /Game -F "file=@$T/wartung.txt" -F "button=upload" || abbruch "Wartung ließ sich nicht einschalten"
WARTUNG=1; echo "Wartung an"
sleep "${OW_WARTUNG_PAUSE:-10}"  # die laufenden Spiele merken es beim nächsten Puls (alle 2 s) und sichern noch
N=0
for f in $AENDERN; do hoch "$f" || abbruch "Datei $f fehlt (nicht vollständig hochgeladen)"; N=$((N + 1)); done
if [ -f "$T/config.php" ]; then hoch config.php "$T/config.php" || abbruch "Datei config.php fehlt (nicht vollständig hochgeladen)"; N=$((N + 1)); fi

# 4) Alles auf dem Server, was nicht (mehr) zum Spiel gehört, aus Game/ entfernen (alte Ordner api, js, inhalt, daten …)
# (--form-string: ein Dateiname vom Server, der mit @ oder < beginnt, lädt nie eine lokale Datei hoch). Klappt das nicht: nur Warnung.
weg() { local ordner=$1 name=$2; if nochmal ed_tun "$ordner" -F text= --form-string "file=$name" -F "button=delete"; then echo "entfernt: Game${ordner#/Game}/$name"; else echo "Warnung: Game${ordner#/Game}/$name nicht entfernt"; fi; }
if nochmal ls_ordner /Game; then
  for x in $(cat "$T/liste"); do
    if [ -e "Game/$x" ] || [ "$x" = config.php ] || [ "$x" = wartung.txt ]; then continue; fi
    if c -b "$T/jar" "$E?h=48&w=138&sid=$SID&path=$B/Game/$x" | grep -q "klassenarbeit_GR4/Game/$x/\.\.\""; then   # ist ein Ordner: erst leeren
      nochmal ls_ordner "/Game/$x" && for y in $(cat "$T/liste"); do weg "/Game/$x" "$y"; done
    fi
    weg /Game "$x"
  done
else echo "Warnung: Ordnerliste nicht lesbar – alte Dateien bleiben diesmal liegen"; fi

# 5) Wartung aus – erst jetzt (alles ist geprüft angekommen) – und nachsehen, dass wartung.txt wirklich weg ist
wartung_weg() { ed_tun /Game -F text= -F file=wartung.txt -F "button=delete" && ls_ordner /Game && ! grep -qx wartung.txt "$T/liste"; }
nochmal wartung_weg || abbruch "wartung.txt ließ sich nicht löschen (alle $N Dateien sind aber geprüft angekommen)"
WARTUNG=0
echo "Alle $N Dateien hochgeladen und geprüft · Wartung aus (wartung.txt ist weg)"
echo "Auf dem Server: $(tr '\n' ' ' < "$T/liste")"
