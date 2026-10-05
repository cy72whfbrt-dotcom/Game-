#!/bin/bash
# Erzeugt die Code-Karte KARTE.md im Hauptordner: je Datei/Teil die Funktionen mit Zeile und Kommentar, oben ein Index.
# Aufruf: werkzeuge/karte.sh   (aus jedem Ordner; schreibt <hauptordner>/KARTE.md, braucht nur node; Code in karte.js)
# Immer NACH werkzeuge/spiel_bauen.sh laufen lassen (und KARTE.md mit committen). Gleiche Eingabe → gleiche Datei.
# Erfasst: alle Unterordner von Game/ mit Teilen (Dateien beginnen mit „// Teil …“), die übrigen Game/*.js und *.php
# (ohne die zusammengesetzten), Game/weltrechner/*.js|*.php (ohne jsdom.js).
exec node "$(dirname "$0")/karte.js"
