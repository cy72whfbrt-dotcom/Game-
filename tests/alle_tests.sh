#!/bin/bash
# Alle Tests ohne Server (dauert ca. 10 Minuten): Spiel- und Server-Einheitstests, dann die Browser-Tests in einer Vorschau.
#   tests/alle_tests.sh          → am Ende „ALLES OK“ oder die Liste der Fehler
# Browser-Tests (tests/browser/): Bündnis, Verstärkung, gemeinsamer Angriff, Rally 2 gegen 1, neue Kampf-Regel, Klick-Test aller Fenster.
cd "$(dirname "$0")/.." || exit 1
LOG=$(mktemp); FEHLER=0
lauf() { echo "== $1"; shift; timeout 900 "$@" 2>&1 | tee -a "$LOG" | grep -E "^(OK|FEHLER)|bestanden|Fehler|Text-Auff" ; }
lauf "Spiel-Tests" node tests/welt_test.js
lauf "Server-Tests" php tests/server_test.php
T=$(mktemp -d); V="$T/test"; N="$T/normal"
php werkzeuge/vorschau_bauen.php "$V" test viele >/dev/null || exit 1      # Test-Modus: alle Mitspieler, fast unbegrenzt alles
php werkzeuge/vorschau_bauen.php "$N" >/dev/null || exit 1                 # normal: echte Zahlen (für Kampf-Rechnungen)
for t in bund_bot_test bund_amt_test verst_kampf_test gemeinsam_test; do lauf "$t" node "tests/browser/$t.js" "$V"; done
for t in regel_test rally21_test rally_menschen_test rally_held_test helden_beute_test; do lauf "$t" node "tests/browser/$t.js" "$N"; done
for t in burg_test; do lauf "$t" node "tests/browser/$t.js" "$N"; done
for t in alles_test teil2_test; do lauf "$t" node "tests/browser/$t.js" "$V" "$T"; done
grep -E "^FEHLER|nicht bestanden" "$LOG" && FEHLER=1
grep -E "^Fehler: " "$LOG" | grep -v "Fehler: keine" && FEHLER=1
rm -rf "$T" "$LOG"
[ $FEHLER = 0 ] && echo "ALLES OK" || { echo "ES GIBT FEHLER (siehe oben)"; exit 1; }
