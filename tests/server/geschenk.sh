#!/bin/bash
# geschenk.sh <spieler-id> <gems> [münzen]: Admin-Geschenk über admin.php (vorher Admin freischalten) – für die Server-Tests.
# Braucht OW_TEST_URL, OW_ADMIN_NAME, OW_ADMIN_PW (setzt tests/server_tests.sh).
B="${OW_TEST_URL%/}"; O="Origin: $(echo "$B" | grep -oE '^https?://[^/]+')"; J=$(mktemp)
curl -s -c "$J" -b "$J" -o /dev/null -H "$O" --data-urlencode "name=$OW_ADMIN_NAME" --data-urlencode "pw=$OW_ADMIN_PW" "$B/index.php"
Z=$(curl -s -b "$J" "$B/admin.php" | grep -o 'name="zeichen" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"//')
curl -s -b "$J" -o /dev/null -H "$O" --data "zeichen=$Z&was=freischalten" --data-urlencode "pw=$OW_ADMIN_PW" "$B/admin.php"
N=$(curl -s -b "$J" "$B/admin.php" | grep -o 'name="nr" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"//')
curl -s -b "$J" -H "$O" --data "zeichen=$Z&nr=$N&was=geschenk&an=$1&gems=$2&coins=${3:-0}&sh=0&tr=0&crate=-1" "$B/admin.php" | grep -o 'class="ok">[^<]*\|class="fehler">[^<]*'
rm -f "$J"
