#!/bin/bash
# Statuszeile eines Agenten der Firma (alle 5 Min. und am Ende „fertig“; älter als 10 Min. = hängt):
#   werkzeuge/status.sh <kurzname> <schritt> <text …>
#   → schreibt (überschreibt) „<Uhrzeit UTC> | <schritt> | <text>“ in <firma>/<kurzname>.txt
# <firma>: Umgebungsvariable OW_FIRMA, sonst der Firmen-Ordner im Scratchpad der Projektleiter-Sitzung (Standard unten).
K="${1:?Aufruf: werkzeuge/status.sh <kurzname> <schritt> <text>}"; S="${2:?Schritt fehlt}"; shift 2
case "$K" in */*|.*|"") echo "FEHLER: Kurzname ohne / und nicht mit . anfangen" >&2; exit 1;; esac
F="${OW_FIRMA:-/tmp/claude-0/-home-user-Game-/ef9a33c5-7a87-5b23-8d7f-4cc2dc089a18/scratchpad/firma}"
mkdir -p "$F" || exit 1
echo "$(date -u +%H:%M) | $S | $*" > "$F/$K.txt"
