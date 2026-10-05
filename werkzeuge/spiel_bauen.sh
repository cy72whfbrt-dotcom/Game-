#!/bin/bash
# Setzt Game/spiel.js, Game/bots.js und Game/buendnis.js aus ihren Teilen zusammen (in der Reihenfolge der Dateinamen):
#   Game/spiel/*.js → Game/spiel.js · Game/bots/*.js → Game/bots.js · Game/buendnis/*.js → Game/buendnis.js
# Bearbeitet wird NUR in den Teilen – die drei Dateien werden hier jedes Mal neu geschrieben.
# Warum ein Zusammensetzen und keine vielen Dateien im Spiel: der Code ruft beim Laden Funktionen auf, die weiter hinten
# stehen – das geht nur in EINER Datei. So bekommt das Spiel genau denselben Code wie vor dem Aufteilen (4.10./5.10.).
# Jeder Teil beginnt mit EINER Kopfzeile „// Teil <name>: <was drin ist>“ – sie kommt nicht in die zusammengesetzte Datei.
#   werkzeuge/spiel_bauen.sh          → zusammensetzen
#   werkzeuge/spiel_bauen.sh pruefen  → nur prüfen, ob die drei Dateien zu den Teilen passen (Fehler, wenn nicht)
set -e
export LC_ALL=C   # feste Reihenfolge der Teile (01a vor 01b vor 02 …), egal welche Sprache eingestellt ist
cd "$(dirname "$0")/.."
fehler=0
baue() {   # $1 = Ordner der Teile, $2 = Zieldatei, $3 = erste Zeile (leer: keine)
    local T; T=$(mktemp --suffix=.js)
    { [ -z "$3" ] || echo "$3"
      for f in "$1"/[0-9]*.js; do
        case "$(head -n1 "$f")" in "// Teil "*) ;; *) echo "FEHLER: $f beginnt nicht mit der Kopfzeile „// Teil …“" >&2; rm -f "$T"; return 1;; esac
        tail -n +2 "$f"; [ -z "$(tail -c1 "$f")" ] || echo
      done; } > "$T"
    node --check "$T" || { rm -f "$T"; echo "FEHLER: zusammengesetztes $2 ist kaputt"; return 1; }
    if [ "$MODUS" = pruefen ]; then
        if cmp -s "$T" "$2"; then rm -f "$T"; echo "$(basename "$2") passt zu den Teilen"; return 0; fi
        rm -f "$T"; echo "FEHLER: $2 passt nicht zu $1/ – wurde $(basename "$2") direkt geändert? Erst werkzeuge/spiel_bauen.sh"; return 1
    fi
    if cmp -s "$T" "$2"; then rm -f "$T"; echo "$(basename "$2") unverändert"
    else mv "$T" "$2"; echo "$(basename "$2") neu zusammengesetzt ($(wc -l < "$2") Zeilen aus $(ls "$1"/[0-9]*.js | wc -l) Teilen)"; fi
}
MODUS=$1
baue Game/spiel Game/spiel.js "// ===== spiel.js – AUTOMATISCH ZUSAMMENGESETZT aus Game/spiel/*.js (werkzeuge/spiel_bauen.sh). NICHT hier ändern! =====" || fehler=1
baue Game/bots Game/bots.js "" || fehler=1
baue Game/buendnis Game/buendnis.js "" || fehler=1
exit $fehler
