#!/bin/bash
# Kurze Prüfung vor jedem Commit (ein paar Sekunden, ohne Server und Browser):
#   1. git diff --check --cached   Leerzeichen-Fehler in dem, was gerade committet wird
#   2. Konfliktmarker (<<<<<<< / ======= / >>>>>>>) in allen getrackten .md/.js/.sh/.php/.json-Dateien
#   3. werkzeuge/spiel_bauen.sh pruefen   spiel.js, bots.js, buendnis.js passen zu ihren Teilen
# Aufruf: werkzeuge/vor_commit.sh  → „VOR-COMMIT OK“ oder die Fehler (Exit-Code 1)
cd "$(dirname "$0")/.." || exit 1
FEHLER=""
if ! A=$(git diff --check --cached 2>&1); then echo "$A"; FEHLER="$FEHLER Leerzeichen-Fehler"; fi
if K=$(git grep -nE '^(<<<<<<< |=======$|>>>>>>> )' -- '*.md' '*.js' '*.sh' '*.php' '*.json'); then
  echo "$K"; FEHLER="$FEHLER Konfliktmarker"
fi
werkzeuge/spiel_bauen.sh pruefen || FEHLER="$FEHLER Teile-passen-nicht"
[ -z "$FEHLER" ] && echo "VOR-COMMIT OK" || { echo "VOR-COMMIT FEHLER:$FEHLER"; exit 1; }
