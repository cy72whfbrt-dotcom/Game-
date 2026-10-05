#!/bin/bash
# Setzt große Dateien aus ihren Teilen zusammen (in der Reihenfolge der Dateinamen) – Tabelle ZIELE unten:
#   Game/spiel/*.js → Game/spiel.js · Game/bots/*.js → Game/bots.js · Game/buendnis/*.js → Game/buendnis.js
#   Game/baukunst/*.js → Game/baukunst.js · Game/spielseite/*.php → Game/spiel.php · Game/server/*.php → Game/server.php
# Bearbeitet wird NUR in den Teilen – die Dateien werden hier jedes Mal neu geschrieben.
# Warum ein Zusammensetzen und keine vielen Dateien im Spiel: der Code ruft beim Laden Funktionen auf, die weiter hinten
# stehen – das geht nur in EINER Datei. So bekommt das Spiel genau denselben Code wie vor dem Aufteilen (4.10./5.10.).
# Jeder Teil beginnt mit EINER Kopfzeile „// Teil <name>: <was drin ist>“ – sie kommt nicht in die zusammengesetzte Datei
# (auch bei PHP: der erste Teil fängt danach mit „<?php“ an).
#   werkzeuge/spiel_bauen.sh          → zusammensetzen, danach KARTE.md neu (werkzeuge/karte.sh)
#   werkzeuge/spiel_bauen.sh pruefen  → nur prüfen, ob die Dateien zu den Teilen passen (Fehler, wenn nicht)
set -e
export LC_ALL=C   # feste Reihenfolge der Teile (01a vor 01b vor 02 …), egal welche Sprache eingestellt ist
cd "$(dirname "$0")/.."
# Tabelle ZIELE: Ordner der Teile | Zieldatei | erste Zeile (leer: keine). Endung der Teile = Endung der Zieldatei.
ZIELE=(
  "Game/spiel|Game/spiel.js|// ===== spiel.js – AUTOMATISCH ZUSAMMENGESETZT aus Game/spiel/*.js (werkzeuge/spiel_bauen.sh). NICHT hier ändern! ====="
  "Game/bots|Game/bots.js|"
  "Game/buendnis|Game/buendnis.js|"
  "Game/baukunst|Game/baukunst.js|"
  "Game/spielseite|Game/spiel.php|"
  "Game/server|Game/server.php|"
)
fehler=0
baue() {   # $1 = Ordner der Teile, $2 = Zieldatei, $3 = erste Zeile (leer: keine)
    local E="${2##*.}" T; T=$(mktemp --suffix=".$E")
    { [ -z "$3" ] || echo "$3"
      for f in "$1"/[0-9]*."$E"; do
        case "$(head -n1 "$f")" in "// Teil "*) ;; *) echo "FEHLER: $f beginnt nicht mit der Kopfzeile „// Teil …“" >&2; rm -f "$T"; return 1;; esac
        tail -n +2 "$f"; [ -z "$(tail -c1 "$f")" ] || echo
      done; } > "$T"
    case "$E" in js) node --check "$T" ;; php) php -l "$T" > /dev/null ;; esac || { rm -f "$T"; echo "FEHLER: zusammengesetztes $2 ist kaputt"; return 1; }
    if [ "$MODUS" = pruefen ]; then
        if cmp -s "$T" "$2"; then rm -f "$T"; echo "$(basename "$2") passt zu den Teilen"; return 0; fi
        rm -f "$T"; echo "FEHLER: $2 passt nicht zu $1/ – wurde $(basename "$2") direkt geändert? Erst werkzeuge/spiel_bauen.sh"; return 1
    fi
    if cmp -s "$T" "$2"; then rm -f "$T"; echo "$(basename "$2") unverändert"
    else mv "$T" "$2"; chmod 644 "$2"; echo "$(basename "$2") neu zusammengesetzt ($(wc -l < "$2") Zeilen aus $(ls "$1"/[0-9]*."$E" | wc -l) Teilen)"; fi
}
MODUS=$1
for z in "${ZIELE[@]}"; do
    IFS='|' read -r ordner ziel kopf <<< "$z"
    baue "$ordner" "$ziel" "$kopf" || fehler=1
done
[ "$fehler" = 1 ] || [ "$MODUS" = pruefen ] || werkzeuge/karte.sh || fehler=1
exit $fehler
