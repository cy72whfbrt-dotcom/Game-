#!/bin/bash
# Alles auf einmal (ca. 15 Minuten): die Tests ohne Server (tests/alle_tests.sh) und die mit lokalem Server
# (tests/server_tests.sh, selbst in 3 Gruppen) GLEICHZEITIG – sie stören sich nicht. Am Ende „ALLES OK“ oder die Fehler.
#   tests/komplett.sh <arbeitsordner>     (Arbeitsordner wie bei tests/server_tests.sh)
exec 8>/tmp/ow_komplett.lock; flock -n 8 || { echo "FEHLER: komplett.sh läuft schon"; exit 1; }   # nie zwei gleichzeitig
cd "$(dirname "$0")/.." || exit 1
A="${1:?Aufruf: tests/komplett.sh <arbeitsordner>}"
werkzeuge/spiel_bauen.sh >/dev/null || exit 1          # einmal vorher – danach ändert sich spiel.js nicht mehr
T=$(mktemp -d)
# (Browser-Reihe mit niedrigerer Priorität: sonst verhungert die Server-Reihe – Weltrechner, PHP, Datenbank – und ihre Tests scheitern an der Zeit)
nice -n 10 tests/alle_tests.sh > "$T/ohne.log" 2>&1 8>&- & P1=$!   # (8>&-: Kinder erben die Sperre nicht)
tests/server_tests.sh "$A" > "$T/mit.log" 2>&1 8>&- & P2=$!
wait $P1; R1=$?; wait $P2; R2=$?
echo "===== OHNE SERVER"; cat "$T/ohne.log"; echo "===== MIT SERVER"; cat "$T/mit.log"; rm -rf "$T"
[ $R1 = 0 ] && [ $R2 = 0 ] && echo "ALLES OK (beide Reihen)" || { echo "ES GIBT FEHLER (siehe oben)"; exit 1; }
