#!/bin/bash
# Nach jedem Hochladen: prüft den Live-Server (nur lesend). Ausgabe „LIVE OK“ oder die Liste der Fehler (Exit-Code 1).
#   werkzeuge/nach_hochladen.sh                       → seit 10 Minuten
#   werkzeuge/nach_hochladen.sh "2026-10-05 14:30"    → seit diesem Zeitpunkt (alles, was „date -d“ versteht)
# Geprüft: Weltrechner seit dem Zeitpunkt neu gestartet und lebt (Herzschlag jünger als 1 Min.), keine neuen FEHLER im
# Weltrechner-Log seitdem, Speicher < 600 MB, pulseFehler und fehlerProMinute 0, Startseite antwortet.
# Zugang wie hochladen.sh nur über Umgebungsvariablen OFFICE_USER, OFFICE_PASS (nie in Dateien).
cd "$(dirname "$0")/.." || exit 1
for v in OFFICE_USER OFFICE_PASS; do [ -n "${!v}" ] || { echo "FEHLER: Umgebungsvariable $v fehlt"; exit 1; }; done
SEIT=$(date -d "${1:-10 minutes ago}" +%s) || { echo "FEHLER: Zeitpunkt „$1“ unbekannt"; exit 1; }
B=/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4
E=https://office.hobbitonhill.de/html/editor.php
U=https://office.hobbitonhill.de/html/725/klassenarbeit_GR4/Game/
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
holen() { curl -sS --retry 3 --retry-all-errors --retry-delay 3 --max-time 60 "$@"; }
echo "Prüfe Live-Server seit $(date -d "@$SEIT" '+%d.%m. %H:%M:%S') …"

# Anmelden (Zugangsdaten über eine Datei statt in der Befehlszeile – dort wären sie in der Prozessliste sichtbar)
(umask 077; printf 'name=%s&pw=%s&login=login' "$(php -r 'echo rawurlencode(getenv("OFFICE_USER"));')" "$(php -r 'echo rawurlencode(getenv("OFFICE_PASS"));')" > "$T/anmelden")
holen -c "$T/jar" -b "$T/jar" -L 'https://office.hobbitonhill.de/index.php?' --data-binary @"$T/anmelden" -o "$T/login.html"; rm -f "$T/anmelden"
SID=$(grep -o 'sid=[a-f0-9]*' "$T/login.html" 2>/dev/null | head -1 | cut -d= -f2)
[ -n "$SID" ] || { echo "FEHLER: Office-Login fehlgeschlagen"; exit 1; }
# lesen <datei unter Game/> → Inhalt (aus dem Textfeld des Editors, HTML-Zeichen und Kürzel <bsl>/<n> … zurückverwandelt)
lesen() { holen -b "$T/jar" "$E?h=48&w=138&sid=$SID&path=$B/Game/$1&charset=&lines=" | php werkzeuge/editor_text.php; }
lesen weltrechner/herz.php > "$T/herz"
lesen weltrechner/log.php > "$T/log"
CODE=$(holen -o /dev/null -w '%{http_code}' "$U")

# Auswerten (php: JSON des Herzschlags, Zeiten im Log)
php -r '
[$seit, $herzDatei, $logDatei, $code] = array_slice($argv, 1); $f = [];
$roh = file_get_contents($herzDatei); $h = preg_match("~\{.*\}~s", $roh, $m) ? json_decode($m[0], true) : null;
if (!is_array($h)) $f[] = "Herzschlag nicht lesbar";
else {
    $alt = time() - intdiv((int)$h["zeit"], 1000);
    printf("Herz: gestartet %s, vor %d s geschrieben, Phase %s, Speicher %d MB, pulseOk %d, pulseFehler %d, fehlerProMinute %d\n",
        date("d.m. H:i:s", intdiv((int)$h["gestartet"], 1000)), $alt, $h["phase"] ?? "?", $h["speicherMb"] ?? -1, $h["pulseOk"] ?? 0, $h["pulseFehler"] ?? -1, $h["fehlerProMinute"] ?? -1);
    if (intdiv((int)($h["gestartet"] ?? 0), 1000) < $seit) $f[] = "Weltrechner nicht neu gestartet (gestartet " . date("d.m. H:i:s", intdiv((int)$h["gestartet"], 1000)) . ")";
    if ($alt > 60) $f[] = "Herzschlag ist $alt s alt (Weltrechner hängt oder läuft nicht)";
    if (!empty($h["ende"])) $f[] = "Weltrechner beendet: " . $h["ende"];
    if (($h["speicherMb"] ?? 9999) >= 600) $f[] = "Speicher " . ($h["speicherMb"] ?? "?") . " MB (Grenze 600)";
    if (($h["pulseFehler"] ?? 1) != 0) $f[] = "pulseFehler " . ($h["pulseFehler"] ?? "?");
    if (($h["fehlerProMinute"] ?? 1) != 0) $f[] = "fehlerProMinute " . ($h["fehlerProMinute"] ?? "?");
}
$neu = 0; $fehler = [];
foreach (explode("\n", file_get_contents($logDatei)) as $z) {
    if (!preg_match("~^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)~", $z, $m) || strtotime($m[1]) < $seit) continue;
    $neu++; if (strpos($z, "FEHLER") !== false) $fehler[] = substr($z, 0, 200);
}
printf("Log: %d neue Zeilen seit dem Zeitpunkt, davon %d mit FEHLER\n", $neu, count($fehler));
if (!$neu) $f[] = "keine neuen Zeilen im Weltrechner-Log (Log nicht lesbar oder kein Neustart)";
foreach (array_slice($fehler, 0, 10) as $z) $f[] = "Log: $z";
if ($code !== "200") $f[] = "Startseite antwortet mit $code";
else echo "Startseite: 200\n";
if ($f) { echo "LIVE FEHLER:\n"; foreach ($f as $x) echo "  - $x\n"; exit(1); }
echo "LIVE OK\n";
' "$SEIT" "$T/herz" "$T/log" "$CODE"
