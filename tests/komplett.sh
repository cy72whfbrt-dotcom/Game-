#!/bin/bash
# Alles auf einmal (ca. 15–20 Minuten): die Tests mit lokalem Server (tests/server_tests.sh, selbst in 3 Gruppen) und die
# ohne Server (tests/alle_tests.sh) GLEICHZEITIG. Am Ende „ALLES OK“ oder die Fehler.
#   tests/komplett.sh <arbeitsordner>     (Arbeitsordner wie bei tests/server_tests.sh)
# Die Server-Reihe zuerst; die Browser-Reihe startet erst, wenn alle Server-Gruppen laufen (+30 s), mit nur 2 Slots
# (OW_SLOTS=2) und niedriger Priorität – sonst verhungern Weltrechner, PHP und Datenbank und Tests scheitern an der Zeit.
# Rote Tests wiederholen beide Reihen am Ende einmal allein („rot → grün bei Wiederholung (Last?)“ zählt als OK).
# Im Arbeitsordner (dort nachsehen statt zu warten):
#   FORTSCHRITT  je Test eine Zeile: Gruppe | Test | Start | Ergebnis (wartet/läuft/OK/FEHLER)
#   FERTIG       am Ende: Exit-Code + „ALLES OK …“ oder „ES GIBT FEHLER …“ (wie bei alle_tests.sh)
#   komplett.log die ganze Ausgabe beider Reihen
exec 8>/tmp/ow_komplett.lock; flock -n 8 || { echo "FEHLER: komplett.sh läuft schon"; exit 1; }   # nie zwei gleichzeitig
cd "$(dirname "$0")/.." || exit 1
A="${1:?Aufruf: tests/komplett.sh <arbeitsordner>}"; A=$(cd "$A" && pwd) || exit 1
rm -f "$A/FERTIG" "$A/FORTSCHRITT" "$A/FORTSCHRITT.lock" "$A/komplett.log"
export OW_FORTSCHRITT="$A/FORTSCHRITT"
echo "Fortschritt: $A/FORTSCHRITT · Ergebnis am Ende in $A/FERTIG"
fertig() { echo "$1 $2" > "$A/FERTIG"; echo "$2"; echo "Ergebnis: $A/FERTIG"; exit "$1"; }
werkzeuge/spiel_bauen.sh >/dev/null || fertig 1 "FEHLER: spiel.js lässt sich nicht zusammensetzen"   # einmal vorher – danach ändert sich nichts mehr
T=$(mktemp -d); T0=$SECONDS
tests/server_tests.sh "$A" > "$T/mit.log" 2>&1 8>&- & P2=$!   # (8>&-: Kinder erben die Sperre nicht)
# warten, bis alle Server-Gruppen laufen (server_tests.sh legt GRUPPEN_LAUFEN an) – oder sie schon vorbei ist
until [ -f "$A/GRUPPEN_LAUFEN" ] || ! kill -0 $P2 2>/dev/null || [ $((SECONDS - T0)) -gt 600 ]; do sleep 2; done
[ -f "$A/GRUPPEN_LAUFEN" ] && sleep 30
OW_SLOTS=2 nice -n 10 tests/alle_tests.sh > "$T/ohne.log" 2>&1 8>&- & P1=$!
wait $P1; R1=$?; wait $P2; R2=$?
{ echo "===== MIT SERVER"; cat "$T/mit.log"; echo "===== OHNE SERVER"; cat "$T/ohne.log"; } | tee "$A/komplett.log"; rm -rf "$T"
echo "== Dauer gesamt: $(( (SECONDS - T0) / 60 )) Min. $(( (SECONDS - T0) % 60 )) s"
W=$(grep -h "rot → grün bei Wiederholung" "$A/komplett.log" | grep -oE '[a-z0-9_]+_test(\.js|\.php)?' | sort -u | tr '\n' ' ')
H=""; [ -n "$W" ] && H=" · rot → grün bei Wiederholung (Last?): $W"
E="$(grep -h '^ES GIBT FEHLER' "$A/komplett.log" | tr '\n' ' ')"
[ $R1 = 0 ] && [ $R2 = 0 ] && fertig 0 "ALLES OK (beide Reihen)$H" || fertig 1 "ES GIBT FEHLER (siehe $A/komplett.log): $E$H"
