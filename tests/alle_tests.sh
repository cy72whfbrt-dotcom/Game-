#!/bin/bash
# Alle Tests ohne Server (ca. 3–4 Minuten): Spiel- und Server-Einheitstests, dann die Browser-Tests in einer Vorschau –
# bis zu 4 gleichzeitig (OW_PARALLEL=1: nacheinander wie früher).
#   tests/alle_tests.sh                → am Ende „ALLES OK“ oder die Liste der Fehler
#   tests/alle_tests.sh rally burg     → Schnelltest: nur die Browser-Tests, deren Name so anfängt (plus die Einheitstests)
# Browser-Tests (tests/browser/): Bündnis (Rückzug, Chat der Mitspieler, Kampfbericht teilen, Rally-Warnung), Verstärkung (heimholen), Thron-Punkte für Verstärkung, gemeinsamer Angriff, Rally 2 gegen 1, Rally-Schild/Boss je Spieler, Rally „jeder für sich“ (Helden, Flucht, Krankenhaus, Punkte, EP), neue Kampf-Regel, Welt-Saison (Server-Reset), Klick-Test aller Fenster, fremde Werte nur nach dem Spähen, Spähbericht mit Verstärkung + Kriegsherr gegen Verstärkung, Handy-Texte nicht abgeschnitten, Wirtschaft pro Stunde (Profil = was ankommt, Saison-Ende Sonntag 18 Uhr Berlin), hochladen.sh mit nachgebautem Editor (welt_hochladen), Weltrechner-Geduld/Start-Dauer/Schummel-Nachricht (welt_rechner). Einheitstest sicherung_test.php braucht MariaDB (eigene Datenbank, wird gelöscht). Schneller laden (verkleinerte Skripte, skript.php, 3D später), Marsch-Knöpfe auf der Karte + Startbasis eines Angriffs, Spähbericht mit Ausrüstung/Teilen/Alter + „hat deine Basis ausgespäht“, Anleitung für neue Spieler, Langzeit (Hauptstadt-Erfolge, Rangliste „Hauptstadt“, Bündnis im Profil, Aufgaben/Kisten/Pass/Bauherr).
# Mit Server dazu, beide Reihen gleichzeitig: tests/komplett.sh <arbeitsordner>
# Mehrere Läufe gleichzeitig (auch in verschiedenen Kopien) stören sich nicht: eigener Temp-Ordner je Lauf, die
# Browser-Tests nehmen einen freien Port vom System (listen(0)) und legen Bilder in ihren Arbeitsordner.
# Grenze für die ganze Maschine (4 Kerne): höchstens OW_SLOTS (Standard 4) Test-Prozesse über ALLE Läufe zusammen.
# Jeder Test holt sich vorher einen Slot (flock auf /tmp/ow_slot1…N, frei sobald der Test endet – auch bei Absturz),
# sonst wartet er („wartet auf einen freien Test-Slot“).
# Ergebnis steht am Ende in <arbeitsordner>/FERTIG (Exit-Code + ALLES OK/FEHLER, Pfad wird am Anfang ausgegeben) –
# Agenten können dort nachsehen statt zu warten. Die Logs bleiben daneben liegen.
# Rote Tests werden am Ende EINMAL allein wiederholt: grün → zählt als OK, steht aber als „rot → grün bei Wiederholung
# (Last?)“ in Ausgabe und FERTIG; wieder rot → FEHLER. OW_FORTSCHRITT=<datei>: je Test eine Zeile (setzt komplett.sh).
cd "$(dirname "$0")/.." || exit 1
. werkzeuge/fortschritt.sh
T=$(mktemp -d); V="$T/test"; N="$T/normal"; FEHLER=0; J="${OW_PARALLEL:-4}"; S="${OW_SLOTS:-4}"
echo "Arbeitsordner: $T (Ergebnis am Ende in $T/FERTIG)"
fertig() { rm -rf "$V" "$N" "$T"/a_* "$T/alle"; echo "$1 $2" > "$T/FERTIG"; echo "$2"; echo "Ergebnis: $T/FERTIG"; exit "$1"; }
filter() { grep -E "^(OK|FEHLER)|bestanden|Fehler|Text-Auff"; }
# lauf <name> <log> <befehl…>: wartet auf einen freien Slot der Maschine, dann Befehl mit Ausgabe ins Log
lauf() { local n=$1 l=$2 i w=0; shift 2
  while :; do
    for i in $(seq 1 "$S"); do
      exec 9>>"/tmp/ow_slot$i" 2>/dev/null || continue
      flock -n 9 && { "$@" > "$l" 2>&1 9>&-; return; }   # (9>&-: Kinder erben den Slot nicht – er gehört nur diesem Job)
      exec 9>&-
    done
    [ $w = 0 ] && echo "… $n wartet auf einen freien Test-Slot (alle $S belegt)"; w=1; sleep 2
  done; }
# rot <log>: Test gescheitert (Fehlerzeile oder gar keine Ergebnis-Zeile – abgebrochen)
rot() { grep -qE "^FEHLER|nicht bestanden" "$1" || grep -E "^Fehler: " "$1" | grep -qv "Fehler: keine" || ! grep -qE "^(OK|FEHLER|Fehler:|Text-Auff)|bestanden" "$1"; }
# test1 <gruppe> <name> <befehl…>: lauf mit Zeile im Fortschritt
test1() { local g=$1 n=$2; shift 2; fortschritt "$g" "$n" läuft; lauf "$n" "$T/$n.log" timeout 900 "$@"
  if rot "$T/$n.log"; then fortschritt "$g" "$n" FEHLER; else fortschritt "$g" "$n" OK; fi; }
php werkzeuge/vorschau_bauen.php "$V" test viele >/dev/null || fertig 1 "FEHLER: Vorschau (test) nicht gebaut"   # Test-Modus: alle Mitspieler, fast unbegrenzt alles
php werkzeuge/vorschau_bauen.php "$N" >/dev/null || fertig 1 "FEHLER: Vorschau (normal) nicht gebaut"            # normal: echte Zahlen (für Kampf-Rechnungen)
# (die Vorschau setzt spiel.js usw. zusammen und erzeugt Game/klein/ – nicht im Git, fehlt in frischen Kopien; hier sicher da)
node werkzeuge/verkleinern.js voll >/dev/null || fertig 1 "FEHLER: Game/klein/ unvollständig (werkzeuge/spiel_bauen.sh)"
declare -A BEFEHL=([welt_test.js]="node tests/welt_test.js" [server_test.php]="php tests/server_test.php" [karte_test.js]="node tests/karte_test.js" [sicherung_test.php]="php tests/sicherung_test.php")
EINHEIT="welt_test.js server_test.php karte_test.js sicherung_test.php"
for x in $EINHEIT; do test1 Einheit "$x" ${BEFEHL[$x]} & done   # (erst nach dem Zusammensetzen von spiel.js)
# Test | Vorschau (alles_test/teil2_test bekommen den Arbeitsordner für ihre Bilder dazu – jeder seinen eigenen)
LISTE="bund_bot_test|$V bund_mitte_test|$V pass_test|$N bund_amt_test|$V bund_rueckzug_test|$V bund_bericht_test|$V rally_warnung_test|$V verst_heim_test|$V thron_verst_test|$V verst_kampf_test|$V hilfe_auto_test|$N gemeinsam_test|$V regel_test|$N rally21_test|$N rally_menschen_test|$N rally_jeder_test|$N
rally_held_test|$N rally_schild_test|$N rally_name_test|$N helden_beute_test|$N burg_test|$N haenger_test|$N haenger_holen_test|$N saison_test|$N saison_anfang_test|$N wirtschaft_roh_test|$N wirtschaft_muenz_test|$N rally_maut_test|$N gemeinsam_heim_test|$V handy_stadt_test|$V mitspieler_feld_test|$V alles_test|$V teil2_test|$V fremd_test|$V spaeh_verst_test|$V handy_texte_test|$V profil_stunde_test|$N wirtschaft_gold_test|$N forschung_kosten_test|$N welt_hochladen_test|$N ladebild_test|$N welt_rechner_test|$N laden_test|$N maersche_knoepfe_test|$N spaeh_bericht_test|$V mauer_helden_test|$N mitspieler_schaetzen_test|$V mitspieler_mitte_test|$V anleitung_test|$N erfolg_test|$N rang_profil_test|$N spieltexte_test|$N push_frist_test|$N aufgabe_test|$N karte_fahnen_test|$V design_hud_test|$V design_stil_test|$N design_politur_test|$N handy_basis_test|$V stadt_fenster_test|$V handy_fenster_test|$V aussehen_rahmen_test|$N profil_kopf_test|$N shop_test|$V stadt_bild_test|$V aufgabe_blick_test|$N aufgabe_bild_test|$N welt_felsen_test|$N handy_leiste_test|$N handy_tipp_test|$N karte_rok_test|$N"
WAHL=""; for t in $LISTE; do n=${t%%|*}; if [ $# = 0 ]; then WAHL="$WAHL $t"; else for p in "$@"; do [[ $n == $p* ]] && WAHL="$WAHL $t"; done; fi; done
for t in $WAHL; do n=${t%%|*}; v=${t#*|}; mkdir -p "$T/a_$n"; BEFEHL[$n]="node tests/browser/$n.js $v $T/a_$n"; fortschritt Browser "$n" wartet; done
for t in $WAHL; do n=${t%%|*}
  while [ "$(jobs -rp | wc -l)" -ge "$J" ]; do wait -n; done
  test1 Browser "$n" ${BEFEHL[$n]} &
done
wait
NAMEN="$EINHEIT"; for t in $WAHL; do NAMEN="$NAMEN ${t%%|*}"; done
ROT=""; for n in $NAMEN; do echo "== $n"; filter < "$T/$n.log"; rot "$T/$n.log" && ROT="$ROT $n"; done
# Rote Tests EINMAL allein wiederholen (nacheinander – die Last der anderen Tests ist dann weg)
WIEDER=""; ROT2=""
for n in $ROT; do
  mv "$T/$n.log" "$T/$n.erst"
  test1 Wiederholung "$n" ${BEFEHL[$n]}
  if rot "$T/$n.log"; then
    echo "== $n: auch bei Wiederholung rot"
    grep -hE "^FEHLER|nicht bestanden|^Fehler: " "$T/$n.erst" "$T/$n.log" | grep -v "Fehler: keine" | sort -u
    grep -qE "^(OK|FEHLER|Fehler:|Text-Auff)|bestanden" "$T/$n.log" || { echo "FEHLER $n: keine Ausgabe (abgebrochen?)"; tail -3 "$T/$n.log"; }
    FEHLER=1; ROT2="$ROT2 $n"
  else echo "== $n: rot → grün bei Wiederholung (Last?)"; WIEDER="$WIEDER $n"; fi
done
H=""; [ -n "$WIEDER" ] && H=" · rot → grün bei Wiederholung (Last?):$WIEDER"
[ $FEHLER = 0 ] && fertig 0 "ALLES OK$H" || fertig 1 "ES GIBT FEHLER:$ROT2$H"
