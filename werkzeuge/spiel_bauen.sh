#!/bin/bash
# Setzt Game/spiel.js aus den Teilen in Game/spiel/ zusammen (in der Reihenfolge der Nummern).
# Bearbeitet wird NUR in Game/spiel/*.js – Game/spiel.js wird hier jedes Mal neu geschrieben.
# Warum ein Zusammensetzen und keine 10 Dateien im Spiel: der Code ruft beim Laden Funktionen auf, die weiter hinten
# stehen – das geht nur in EINER Datei. So bekommt das Spiel genau denselben Code wie vor dem Aufteilen (4.10.).
#   werkzeuge/spiel_bauen.sh          → zusammensetzen
#   werkzeuge/spiel_bauen.sh pruefen  → nur prüfen, ob Game/spiel.js zu den Teilen passt (Fehler, wenn nicht)
set -e
cd "$(dirname "$0")/.."
T=$(mktemp --suffix=.js)
{ echo "// ===== spiel.js – AUTOMATISCH ZUSAMMENGESETZT aus Game/spiel/*.js (werkzeuge/spiel_bauen.sh). NICHT hier ändern! ====="
  for f in Game/spiel/[0-9]*.js; do cat "$f"; [ -z "$(tail -c1 "$f")" ] || echo; done; } > "$T"
node --check "$T" || { rm -f "$T"; echo "FEHLER: zusammengesetztes spiel.js ist kaputt"; exit 1; }
if [ "$1" = pruefen ]; then
  if cmp -s "$T" Game/spiel.js; then rm -f "$T"; echo "spiel.js passt zu den Teilen"; exit 0; fi
  rm -f "$T"; echo "FEHLER: Game/spiel.js passt nicht zu Game/spiel/ – wurde spiel.js direkt geändert? Erst werkzeuge/spiel_bauen.sh"; exit 1
fi
if cmp -s "$T" Game/spiel.js; then rm -f "$T"; echo "spiel.js unverändert"; else mv "$T" Game/spiel.js; echo "spiel.js neu zusammengesetzt ($(wc -l < Game/spiel.js) Zeilen aus $(ls Game/spiel/[0-9]*.js | wc -l) Teilen)"; fi
