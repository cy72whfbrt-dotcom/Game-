#!/bin/sh
# Kopiert das aktuelle Spiel in den Server-Ordner server/Game (inc/spiel.html, js/botlogik.js, js/baukunst.js).
set -e
cd "$(dirname "$0")/.."
cp index.html server/Game/inc/spiel.html
cp botlogik.js baukunst.js server/Game/js/
echo "server/Game ist bereit."
