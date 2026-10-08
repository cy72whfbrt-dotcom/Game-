#!/bin/bash
# Holt Stil + Symbole aus Game/spiel.php für die Ansicht thronevent.html (Fenster sehen aus wie im Spiel).
# Neu holen, wenn sich der Spiel-Stil ändert: werkzeuge/thronevent/stil_holen.sh
set -e
cd "$(dirname "$0")"
SP=../../Game/spiel.php
awk '/^ *<style/{f=1;next} /<\/style>/{f=0} f' "$SP" | sed 's#url(bilder/#url(../../Game/bilder/#g' > spiel_stil.css
{ printf '// Erzeugt von stil_holen.sh: Symbole (#i-…) aus Game/spiel.php\ndocument.body.insertAdjacentHTML(%s, `' "'afterbegin'"
  awk '/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="0" height="0"/{f=1} f{print} f&&/^<\/svg>/{exit}' "$SP"
  printf '`);\n'; } > symbole.js
