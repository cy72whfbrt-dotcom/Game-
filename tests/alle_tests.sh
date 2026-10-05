#!/bin/bash
# Alle Tests ohne Server (ca. 3–4 Minuten): Spiel- und Server-Einheitstests, dann die Browser-Tests in einer Vorschau –
# bis zu 4 gleichzeitig (OW_PARALLEL=1: nacheinander wie früher).
#   tests/alle_tests.sh                → am Ende „ALLES OK“ oder die Liste der Fehler
#   tests/alle_tests.sh rally burg     → Schnelltest: nur die Browser-Tests, deren Name so anfängt (plus die Einheitstests)
# Browser-Tests (tests/browser/): Bündnis, Verstärkung, gemeinsamer Angriff, Rally 2 gegen 1, Rally-Schild/Boss je Spieler, Rally „jeder für sich“ (Helden, Flucht, Krankenhaus, Punkte, EP), neue Kampf-Regel, Welt-Saison (Server-Reset), Klick-Test aller Fenster, fremde Werte nur nach dem Spähen.
# Mit Server dazu, beide Reihen gleichzeitig: tests/komplett.sh <arbeitsordner>
# Mehrere Läufe gleichzeitig (auch in verschiedenen Kopien) stören sich nicht: eigener Temp-Ordner je Lauf, die
# Browser-Tests nehmen einen freien Port vom System (listen(0)) und legen Bilder in ihren Arbeitsordner.
# Grenze für die ganze Maschine (4 Kerne): höchstens OW_SLOTS (Standard 4) Test-Prozesse über ALLE Läufe zusammen.
# Jeder Test holt sich vorher einen Slot (flock auf /tmp/ow_slot1…N, frei sobald der Test endet – auch bei Absturz),
# sonst wartet er („wartet auf einen freien Test-Slot“).
# Ergebnis steht am Ende in <arbeitsordner>/FERTIG (Exit-Code + ALLES OK/FEHLER, Pfad wird am Anfang ausgegeben) –
# Agenten können dort nachsehen statt zu warten. Die Logs bleiben daneben liegen.
cd "$(dirname "$0")/.." || exit 1
T=$(mktemp -d); V="$T/test"; N="$T/normal"; FEHLER=0; J="${OW_PARALLEL:-4}"; S="${OW_SLOTS:-4}"
echo "Arbeitsordner: $T (Ergebnis am Ende in $T/FERTIG)"
fertig() { rm -rf "$V" "$N" "$T"/a_* "$T/alle"; echo "$1 $2" > "$T/FERTIG"; echo "$2"; echo "Ergebnis: $T/FERTIG"; exit "$1"; }
filter() { grep -E "^(OK|FEHLER)|bestanden|Fehler|Text-Auff"; }
# lauf <name> <log> <befehl…>: wartet auf einen freien Slot der Maschine, dann Befehl mit Ausgabe ins Log
lauf() { local n=$1 l=$2 i w=0; shift 2
  while :; do
    for i in $(seq 1 "$S"); do
      exec 9>>"/tmp/ow_slot$i" 2>/dev/null || continue
      flock -n 9 && { "$@" > "$l" 2>&1 9>&-; return; }   # (9>&-: Kinder erben den Slot nicht – er gehört nur diesem Job)
      exec 9>&-
    done
    [ $w = 0 ] && echo "… $n wartet auf einen freien Test-Slot (alle $S belegt)"; w=1; sleep 2
  done; }
php werkzeuge/vorschau_bauen.php "$V" test viele >/dev/null || fertig 1 "FEHLER: Vorschau (test) nicht gebaut"   # Test-Modus: alle Mitspieler, fast unbegrenzt alles
php werkzeuge/vorschau_bauen.php "$N" >/dev/null || fertig 1 "FEHLER: Vorschau (normal) nicht gebaut"            # normal: echte Zahlen (für Kampf-Rechnungen)
for x in "welt_test.js|node tests/welt_test.js" "server_test.php|php tests/server_test.php" "karte_test.js|node tests/karte_test.js"; do lauf "${x%%|*}" "$T/${x%%|*}.log" timeout 900 ${x#*|} & done   # (erst nach dem Zusammensetzen von spiel.js)
# Test | Vorschau (alles_test/teil2_test bekommen den Arbeitsordner für ihre Bilder dazu – jeder seinen eigenen)
LISTE="bund_bot_test|$V bund_amt_test|$V verst_kampf_test|$V gemeinsam_test|$V regel_test|$N rally21_test|$N rally_menschen_test|$N rally_jeder_test|$N
rally_held_test|$N rally_schild_test|$N helden_beute_test|$N burg_test|$N saison_test|$N alles_test|$V teil2_test|$V fremd_test|$V"
WAHL=""; for t in $LISTE; do n=${t%%|*}; if [ $# = 0 ]; then WAHL="$WAHL $t"; else for p in "$@"; do [[ $n == $p* ]] && WAHL="$WAHL $t"; done; fi; done
for t in $WAHL; do n=${t%%|*}; v=${t#*|}; mkdir -p "$T/a_$n"
  while [ "$(jobs -rp | wc -l)" -ge "$J" ]; do wait -n; done
  lauf "$n" "$T/$n.log" timeout 900 node "tests/browser/$n.js" "$v" "$T/a_$n" &
done
wait
for x in welt_test.js server_test.php karte_test.js; do echo "== $x"; filter < "$T/$x.log"; done
for t in $WAHL; do n=${t%%|*}; echo "== $n"; filter < "$T/$n.log"; done
cat "$T"/*.log > "$T/alle"
grep -E "^FEHLER|nicht bestanden" "$T/alle" && FEHLER=1
grep -E "^Fehler: " "$T/alle" | grep -v "Fehler: keine" && FEHLER=1
for t in $WAHL; do n=${t%%|*}; grep -qE "^(OK|FEHLER|Fehler:|Text-Auff)" "$T/$n.log" || { echo "FEHLER $n: keine Ausgabe (abgebrochen?)"; tail -3 "$T/$n.log"; FEHLER=1; }; done
[ $FEHLER = 0 ] && fertig 0 "ALLES OK" || fertig 1 "ES GIBT FEHLER (siehe oben)"
