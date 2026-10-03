#!/bin/bash
# hochladen.sh – lädt den Ordner Game/ auf office.hobbitonhill.de (…/klassenarbeit_GR4/Game/).
# Während des Hochladens ist WARTUNG an (Datei wartung.txt): niemand kommt ins Spiel (auch kein Admin).
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
# (Zugangsdaten über eine Datei statt in der Befehlszeile – dort wären sie in der Prozessliste sichtbar)
umask 077; printf 'name=%s&pw=%s&login=login' "$(php -r 'echo rawurlencode(getenv("OFFICE_USER"));')" "$(php -r 'echo rawurlencode(getenv("OFFICE_PASS"));')" > $T/anmelden
curl -sS -c $T/jar -b $T/jar -L 'https://office.hobbitonhill.de/index.php?' --data-binary @$T/anmelden -o $T/login.html; rm -f $T/anmelden
SID=$(grep -o 'sid=[a-f0-9]*' $T/login.html | head -1 | cut -d= -f2)
[ -n "$SID" ] || { echo "Office-Login fehlgeschlagen"; exit 1; }
ed() { local pfad=$1; shift; curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B$pfad&charset=&lines=" "$@"; }
ls_ordner() { curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B$1" | grep -o 'path=[^"&]*' | sed "s#.*klassenarbeit_GR4$1/##" | grep -v '^\.\.$\|^path=' | sort -u; }

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
ed "" -F text= -F file=Game -F "button=new folder" -o /dev/null
echo "Wartung seit $(date '+%d.%m.%Y %H:%M') (hochladen.sh)" > $T/wartung.txt
ed /Game -F "file=@$T/wartung.txt" -F "button=upload" -o /dev/null -w "Wartung an: %{http_code}\n"
sleep 10  # die laufenden Spiele merken es beim nächsten Puls (alle 2 s) und sichern noch
for f in $(cd Game && find . -type f | sed 's#^\./##' | sort); do
  [ "$f" = config.php ] && continue
  case "$f" in weltrechner/herz*.php|weltrechner/log*.php|weltrechner/zustand*.php|weltrechner/sperre.php|weltrechner/crontab*.php|weltrechner/schummel*.php|weltrechner/vapid*.php) continue;; esac   # entstehen nur auf dem Server
  dir=$(dirname "$f"); [ "$dir" = . ] && dir="" || { dir="/$dir"; ed /Game -F text= -F "file=${dir#/}" -F "button=new folder" -o /dev/null; }
  code=$(ed "/Game$dir" -F "file=@Game/$f" -F "button=upload" -o /dev/null -w "%{http_code}" || echo 000); echo "$f $code"
  case "$code" in 2*|3*) ;; *) echo "FEHLER beim Hochladen von $f ($code) – Wartung bleibt an"; exit 1;; esac   # (PHP-Dateien kann Schritt 5 nicht prüfen)
done
[ -f $T/config.php ] && ed /Game -F "file=@$T/config.php" -F "button=upload" -o /dev/null -w "config.php %{http_code}\n"

# 4) Alles auf dem Server, was nicht (mehr) zum Spiel gehört, aus Game/ entfernen (alte Ordner api, js, inhalt, daten …)
# (--form-string: ein Dateiname vom Server, der mit @ oder < beginnt, lädt nie eine lokale Datei hoch)
weg() { local ordner=$1 name=$2; ed "$ordner" -F text= --form-string "file=$name" -F "button=delete" -o /dev/null; echo "entfernt: Game${ordner#/Game}/$name"; }
for x in $(ls_ordner /Game); do
  if [ -e "Game/$x" ] || [ "$x" = config.php ] || [ "$x" = wartung.txt ]; then continue; fi
  if curl -sS -b $T/jar "$E?h=48&w=138&sid=$SID&path=$B/Game/$x" | grep -q "klassenarbeit_GR4/Game/$x/\.\.\""; then   # ist ein Ordner: erst leeren
    for y in $(ls_ordner "/Game/$x"); do weg "/Game/$x" "$y"; done
  fi
  weg /Game "$x"
done

# 5) Prüfen: Dateien unverändert angekommen?
for f in ladebildschirm.js spiel.js bots.js welt.js aufbau.js buendnis.js haendler.js baukunst.js speichern.js weltrechner/start.js weltrechner/push.js weltrechner/jsdom.js sw.js benachrichtigung.js app/manifest.webmanifest app/icon-512.png app/logo.svg; do
  [ "$(sha1sum < Game/$f)" = "$(curl -sS "$U/$f" | sha1sum)" ] && echo "geprüft: $f" || { echo "FEHLER: $f anders"; exit 1; }
done
# 6) Wartung aus – alle können wieder spielen
ed /Game -F text= -F file=wartung.txt -F "button=delete" -o /dev/null && echo "Wartung aus"
echo "Auf dem Server: $(ls_ordner /Game | tr '\n' ' ')"
