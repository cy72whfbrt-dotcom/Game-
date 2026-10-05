#!/bin/bash
# Fortschritt der Testreihen (zum Einbinden mit „. werkzeuge/fortschritt.sh“ in alle_tests.sh/server_tests.sh):
#   fortschritt <gruppe> <test> <ergebnis>   → eine Zeile je Gruppe+Test in $OW_FORTSCHRITT (leer: tut nichts),
#   z. B. „Gruppe 2 | kiste_test | 12:03:10 | läuft“, danach dieselbe Zeile mit OK/FEHLER (Startzeit bleibt).
# Gesetzt wird OW_FORTSCHRITT von tests/komplett.sh (<arbeitsordner>/FORTSCHRITT). Mehrere Schreiber: flock.
fortschritt() {
  [ -n "$OW_FORTSCHRITT" ] || return 0
  local f="$OW_FORTSCHRITT"
  (
    flock 7
    s=$(awk -F' [|] ' -v g="$1" -v t="$2" '$1 == g && $2 == t { print $3 }' "$f" 2>/dev/null)
    [ -n "$s" ] || s=$(date +%H:%M:%S)
    { awk -F' [|] ' -v g="$1" -v t="$2" '!($1 == g && $2 == t)' "$f" 2>/dev/null
      echo "$1 | $2 | $s | $3"; } > "$f.neu" && mv "$f.neu" "$f"
  ) 7>>"$f.lock"
}
