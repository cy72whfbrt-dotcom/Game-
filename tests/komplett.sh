#!/bin/bash
# Alles auf einmal (ca. 30 Minuten statt 40): die Tests ohne Server (tests/alle_tests.sh) und die mit lokalem Server
# (tests/server_tests.sh) GLEICHZEITIG – sie stören sich nicht. Am Ende „ALLES OK“ oder die Fehler.
#   tests/komplett.sh <arbeitsordner>     (Arbeitsordner wie bei tests/server_tests.sh)
cd "$(dirname "$0")/.." || exit 1
A="${1:?Aufruf: tests/komplett.sh <arbeitsordner>}"
werkzeuge/spiel_bauen.sh >/dev/null || exit 1          # einmal vorher – danach ändert sich spiel.js nicht mehr
T=$(mktemp -d)
tests/alle_tests.sh > "$T/ohne.log" 2>&1 & P1=$!
tests/server_tests.sh "$A" > "$T/mit.log" 2>&1 & P2=$!
wait $P1; R1=$?; wait $P2; R2=$?
echo "===== OHNE SERVER"; cat "$T/ohne.log"; echo "===== MIT SERVER"; cat "$T/mit.log"; rm -rf "$T"
[ $R1 = 0 ] && [ $R2 = 0 ] && echo "ALLES OK (beide Reihen)" || { echo "ES GIBT FEHLER (siehe oben)"; exit 1; }
