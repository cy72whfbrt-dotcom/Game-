#!/bin/bash
# Alle Tests ohne Server (ca. 3–4 Minuten): Spiel- und Server-Einheitstests, dann die Browser-Tests in einer Vorschau –
# bis zu 4 gleichzeitig (OW_PARALLEL=1: nacheinander wie früher).
#   tests/alle_tests.sh                → am Ende „ALLES OK“ oder die Liste der Fehler
#   tests/alle_tests.sh rally burg     → Schnelltest: nur die Browser-Tests, deren Name so anfängt (plus die Einheitstests)
# Browser-Tests (tests/browser/): Bündnis, Verstärkung, gemeinsamer Angriff, Rally 2 gegen 1, Rally-Schild/Boss je Spieler, Rally „jeder für sich“ (Helden, Flucht, Krankenhaus, Punkte, EP), neue Kampf-Regel, Welt-Saison (Server-Reset), Klick-Test aller Fenster.
# Mit Server dazu, beide Reihen gleichzeitig: tests/komplett.sh <arbeitsordner>
cd "$(dirname "$0")/.." || exit 1
T=$(mktemp -d); V="$T/test"; N="$T/normal"; FEHLER=0; J="${OW_PARALLEL:-4}"
filter() { grep -E "^(OK|FEHLER)|bestanden|Fehler|Text-Auff"; }
php werkzeuge/vorschau_bauen.php "$V" test viele >/dev/null || exit 1      # Test-Modus: alle Mitspieler, fast unbegrenzt alles
php werkzeuge/vorschau_bauen.php "$N" >/dev/null || exit 1                 # normal: echte Zahlen (für Kampf-Rechnungen)
for x in "welt_test.js|node tests/welt_test.js" "server_test.php|php tests/server_test.php"; do (timeout 900 ${x#*|} > "$T/${x%%|*}.log" 2>&1) & done   # (erst nach dem Zusammensetzen von spiel.js)
# Test | Vorschau (alles_test/teil2_test bekommen den Arbeitsordner für ihre Bilder dazu – jeder seinen eigenen)
LISTE="bund_bot_test|$V bund_amt_test|$V verst_kampf_test|$V gemeinsam_test|$V regel_test|$N rally21_test|$N rally_menschen_test|$N rally_jeder_test|$N
rally_held_test|$N rally_schild_test|$N helden_beute_test|$N burg_test|$N saison_test|$N alles_test|$V teil2_test|$V"
WAHL=""; for t in $LISTE; do n=${t%%|*}; if [ $# = 0 ]; then WAHL="$WAHL $t"; else for p in "$@"; do [[ $n == $p* ]] && WAHL="$WAHL $t"; done; fi; done
for t in $WAHL; do n=${t%%|*}; v=${t#*|}; mkdir -p "$T/a_$n"
  while [ "$(jobs -rp | wc -l)" -ge "$J" ]; do wait -n; done
  ( timeout 900 node "tests/browser/$n.js" "$v" "$T/a_$n" > "$T/$n.log" 2>&1 ) &
done
wait
for x in welt_test.js server_test.php; do echo "== $x"; filter < "$T/$x.log"; done
for t in $WAHL; do n=${t%%|*}; echo "== $n"; filter < "$T/$n.log"; done
cat "$T"/*.log > "$T/alle"
grep -E "^FEHLER|nicht bestanden" "$T/alle" && FEHLER=1
grep -E "^Fehler: " "$T/alle" | grep -v "Fehler: keine" && FEHLER=1
for t in $WAHL; do n=${t%%|*}; grep -qE "^(OK|FEHLER|Fehler:|Text-Auff)" "$T/$n.log" || { echo "FEHLER $n: keine Ausgabe (abgebrochen?)"; tail -3 "$T/$n.log"; FEHLER=1; }; done
rm -rf "$T"
[ $FEHLER = 0 ] && echo "ALLES OK" || { echo "ES GIBT FEHLER (siehe oben)"; exit 1; }
