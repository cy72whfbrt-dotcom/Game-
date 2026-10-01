#!/bin/bash
# Lädt dist/Game (vorher tools/baue_game.sh) in den Ordner Game auf office.hobbitonhill.de.
# Zugangsdaten nur aus den Umgebungsvariablen OFFICE_USER / OFFICE_PASS. api/config.php wird NICHT überschrieben,
# es sei denn, sie liegt in dist/Game/api (nur wenn server/api/config.php lokal existiert).
set -e
cd "$(dirname "$0")/.."
D=dist/Game
[ -d $D ] || { echo "erst tools/baue_game.sh"; exit 1; }
B=/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game
E=https://office.hobbitonhill.de/html/editor.php
J=$(mktemp)
curl -sS -c $J -b $J -L 'https://office.hobbitonhill.de/index.php?' --data-urlencode "name=$OFFICE_USER" --data-urlencode "pw=$OFFICE_PASS" -d login=login -o $J.html
SID=$(grep -o 'sid=[a-f0-9]*' $J.html | head -1 | cut -d= -f2)
[ -n "$SID" ] || { echo "Office-Login fehlgeschlagen"; exit 1; }
for f in api js inhalt daten; do curl -sS -b $J "$E?h=48&w=138&sid=$SID&path=$B&charset=&lines=" -F text= -F file=$f -F "button=new folder" -o /dev/null; done
for f in $(cd $D && find . -type f | sed 's#^\./##' | sort); do
  dir=$(dirname "$f"); [ "$dir" = . ] && dir="" || dir="/$dir"
  curl -sS -b $J "$E?h=48&w=138&sid=$SID&path=$B$dir&charset=&lines=" -F "file=@$D/$f" -F "button=upload" -o /dev/null -w "$f %{http_code}\n"
done
rm -f $J $J.html
U=https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game
for f in js/speicher.js js/botlogik.js js/baukunst.js; do
  [ "$(sha1sum < $D/$f)" = "$(curl -sS $U/$f | sha1sum)" ] && echo "geprüft: $f" || { echo "FEHLER: $f anders"; exit 1; }
done
