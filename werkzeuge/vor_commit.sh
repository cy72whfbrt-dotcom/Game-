#!/bin/bash
# Kurze Prüfung vor jedem Commit (ein paar Sekunden, ohne Server und Browser):
#   1. git diff --check --cached   Leerzeichen-Fehler in dem, was gerade committet wird
#   2. Konfliktmarker (<<<<<<< / ======= / >>>>>>>) in allen getrackten .md/.js/.sh/.php/.json-Dateien
#   3. werkzeuge/spiel_bauen.sh pruefen   die zusammengesetzten Dateien (spiel.js, server.php …) passen zu ihren Teilen
#   4. werkzeuge/karte.sh pruefen         KARTE.md ist aktuell
#   5. pkill/killall/„pgrep … | xargs kill“ in tests/ nur mit Pfad oder Prozessgruppe
# Aufruf: werkzeuge/vor_commit.sh  → „VOR-COMMIT OK“ oder die Fehler (Exit-Code 1)
cd "$(dirname "$0")/.." || exit 1
FEHLER=""
if ! A=$(git diff --check --cached 2>&1); then echo "$A"; FEHLER="$FEHLER Leerzeichen-Fehler"; fi
if K=$(git grep -nE '^(<<<<<<< |=======$|>>>>>>> )' -- '*.md' '*.js' '*.sh' '*.php' '*.json'); then
  echo "$K"; FEHLER="$FEHLER Konfliktmarker"
fi
# Tests dürfen nur ihre eigenen Prozesse beenden: pkill/killall/„pgrep … | xargs kill“ nur mit Pfad (/…) oder
# Prozessgruppe (-g) – sonst trifft es die Läufe anderer Kopien. Ausnahme: Kommentar „# vor_commit: ok“ in der Zeile.
if K=$(git grep -nE '\b(pkill|killall)\b|pgrep.*\|.*xargs.*kill' -- tests/ \
    | awk '{ z = $0; sub(/^[^:]*:[^:]*:/, "", z); if (z !~ /\/|-g |--pgroup|# vor_commit: ok/) print }' | grep .); then
  echo "$K"; FEHLER="$FEHLER pkill-ohne-Pfad"
fi
werkzeuge/spiel_bauen.sh pruefen || FEHLER="$FEHLER Teile-passen-nicht"
werkzeuge/karte.sh pruefen || FEHLER="$FEHLER KARTE.md-veraltet"
[ -z "$FEHLER" ] && echo "VOR-COMMIT OK" || { echo "VOR-COMMIT FEHLER:$FEHLER"; exit 1; }
