#!/bin/bash
# hochladen.sh – lädt den Ordner Game/ auf office.hobbitonhill.de (…/klassenarbeit_GR4/Game/).
# Während des Hochladens ist WARTUNG an (Datei wartung.txt): niemand außer den Admins kommt ins Spiel.
# NUR nach Alexanders Ja benutzen (Regel in LIESMICH.md).
# Zugangsdaten nur aus den Umgebungsvariablen: OFFICE_USER, OFFICE_PASS, DB_USER, DB_PASS (DB_HOST, DB_NAME optional).
# config.php (Datenbank-Zugang) wird dabei aus den Variablen erzeugt – sie liegt nie im Git.
set -e
cd "$(dirname "$0")"
B=/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4
E=https://office.hobbitonhill.de/html/editor.php
U=https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# 1) Anmelden
curl -sS -c $T/jar -b $T/jar -L 'https://office.hobbitonhill.de/index.php?' --data-urlencode "name=$OFFICE_USER" --data-urlencode "pw=$OFFICE_PASS" -d login=login -o $T/login.html
SID=$(grep -o 'sid=[a-f0-9]*' $T/login.html | head -1 | cut -d= -f2)
[ -n "$SID" ] || { echo "Office-Login fehlgeschlagen"; exit 1; }
ed() { local pfad=$1; shift; curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B$pfad&charset=&lines=" "$@"; }
ls_ordner() { curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B$1" | grep -o 'path=[^"&]*' | sed "s#.*klassenarbeit_GR4$1/##" | grep -v '^\.\.$\|^path=' | sort -u; }

# 2) config.php aus den Umgebungsvariablen
if [ -n "$DB_PASS" ]; then
  # admin_ids: feste Spieler-Nummern der Admins (alexander = 3), änderbar über die Variable ADMIN_IDS (z. B. "3,5")
  php -r '$c = ["db_host" => getenv("DB_HOST") ?: "dbwebintern.silentnetwork.de", "db_name" => getenv("DB_NAME") ?: "k17700_alex", "db_user" => getenv("DB_USER"), "db_pass" => getenv("DB_PASS"),
    "admin_ids" => array_map("intval", array_filter(explode(",", getenv("ADMIN_IDS") ?: "3")))];
    file_put_contents($argv[1], "<?php\n// Zugangsdaten der Datenbank - nur auf dem Server, nie ins Git\nreturn " . var_export($c, true) . ";\n");' "$T/config.php"
fi

# 3) Ordner Game anlegen (falls weg), WARTUNG an (niemand kommt ins Spiel, Spielende werden mit "Wartung" rausgebeten),
#    dann alle Dateien hochladen
ed "" -F text= -F file=Game -F "button=new folder" -o /dev/null
echo "Wartung seit $(date '+%d.%m.%Y %H:%M') (hochladen.sh)" > $T/wartung.txt
ed /Game -F "file=@$T/wartung.txt" -F "button=upload" -o /dev/null -w "Wartung an: %{http_code}\n"
sleep 5   # die laufenden Spiele merken es beim nächsten Puls (alle 2 s) und sichern noch
for f in $(cd Game && ls -1); do
  [ "$f" = config.php ] && continue
  ed /Game -F "file=@Game/$f" -F "button=upload" -o /dev/null -w "$f %{http_code}\n"
done
[ -f $T/config.php ] && ed /Game -F "file=@$T/config.php" -F "button=upload" -o /dev/null -w "config.php %{http_code}\n"

# 4) Alles auf dem Server, was nicht (mehr) zum Spiel gehört, aus Game/ entfernen (alte Ordner api, js, inhalt, daten …)
weg() { local ordner=$1 name=$2; ed "$ordner" -F text= -F "file=$name" -F "button=delete" -o /dev/null; echo "entfernt: Game${ordner#/Game}/$name"; }
for x in $(ls_ordner /Game); do
  if [ -f "Game/$x" ] || [ "$x" = config.php ] || [ "$x" = wartung.txt ]; then continue; fi
  if curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B/Game/$x" | grep -q "klassenarbeit_GR4/Game/$x/\.\.\""; then   # ist ein Ordner: erst leeren
    for y in $(ls_ordner "/Game/$x"); do weg "/Game/$x" "$y"; done
  fi
  weg /Game "$x"
done

# 5) Prüfen: Dateien unverändert angekommen?
for f in ladebildschirm.js spiel.js bots.js welt.js baukunst.js speichern.js; do
  [ "$(sha1sum < Game/$f)" = "$(curl -sS "$U/$f" | sha1sum)" ] && echo "geprüft: $f" || { echo "FEHLER: $f anders"; exit 1; }
done
# 6) Wartung aus – alle können wieder spielen
ed /Game -F text= -F file=wartung.txt -F "button=delete" -o /dev/null && echo "Wartung aus"
echo "Auf dem Server: $(ls_ordner /Game | tr '\n' ' ')"
