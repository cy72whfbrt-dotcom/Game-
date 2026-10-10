<?php
// Vorschau bauen: das Spiel als Datei zum Anschauen – OHNE Server (php werkzeuge/vorschau_bauen.php <Zielordner>).
// Es läuft dann wie früher allein im Browser: die Welt mit den Mitspielern rechnet das eigene Gerät, gespeichert wird nur
// in diesem Browser. Kein Login, keine Datenbank, keine Handy-Nachrichten. Nur zum Ansehen neuer Sachen – nie hochladen.
$quelle = dirname(__DIR__) . '/Game';
function stopp($text) { fwrite(STDERR, "Fehler: $text\n"); exit(1); }   // (Exit-Code 1: alle_tests.sh merkt es)
passthru(escapeshellarg(__DIR__ . '/spiel_bauen.sh'), $rc); if ($rc) stopp('spiel.js/bots.js/buendnis.js/spiel.php/server.php lassen sich nicht zusammensetzen');   // (aus Game/spiel/, bots/, buendnis/, spielseite/, server/)
// Game/klein/ ist nicht im Git: spiel_bauen.sh hat es eben erzeugt – hier sicherstellen, dass alle verkleinerten Skripte da sind
exec('node ' . escapeshellarg(__DIR__ . '/verkleinern.js') . ' voll 2>&1', $aus, $rc); if ($rc) stopp("Game/klein/ unvollständig\n" . implode("\n", $aus));
$ziel = $argv[1] ?? (dirname(__DIR__) . '/vorschau');
@mkdir($ziel, 0755, true);
$html = file_get_contents($quelle . '/spiel.php');
$html = substr($html, strpos($html, '<!DOCTYPE html>'));
$html = str_replace('<?= $kopf ?>', '', $html);
// Skripte wie auf dem Server (skript() in server.php): verkleinert aus klein/, wenn aus genau diesem Original entstanden
$html = preg_replace_callback("/<\?= skript\('([a-z]+)'\) \?>/", function ($m) use ($quelle) { $q = $quelle . '/' . $m[1] . '.js'; $sha = sha1_file($q);
    return strpos((string)@file_get_contents($quelle . '/klein/' . $m[1] . '.js', false, null, 0, 160), '/* verkleinert aus ' . $m[1] . '.js · ' . $sha . ' · ') === 0
        ? 'klein/' . $m[1] . '.js?v=' . substr($sha, 0, 12) : $m[1] . '.js?v=' . filemtime($q); }, $html);
foreach (['welt.js', 'benachrichtigung.js'] as $weg) $html = preg_replace('#\s*<script[^>]*src="(klein/)?' . preg_quote($weg, '#') . '[^"]*"[^>]*></script>#', '', $html);   // brauchen den Server
if (strpos($html, '<?') !== false) stopp('noch PHP in spiel.php');
if (in_array('test', $argv, true) || in_array('ohnetutorial', $argv, true)) {   // Tests: kein Tutorial für den frischen Offline-Spieler (10c2)
    $html = preg_replace('#(<script src="(?:klein/)?bots\.js[^"]*"></script>)#', '<script>window.__owOhneTutorial = true;</script>' . "\n" . '    $1', $html, 1);
    if (strpos($html, '__owOhneTutorial') === false) stopp('Tutorial-Schalter nicht eingebaut');
}
if (in_array('test', $argv, true)) {   // Test-Modus (kein Nebel, fast unbegrenzt alles) – nur für die Vorschau
    copy(__DIR__ . '/vorschau_test.js', $ziel . '/testmodus.js');
    $html = preg_replace('#(<script src="(?:klein/)?haendler\.js[^"]*"></script>)#', '$1' . "\n" . '    <script src="testmodus.js"></script>', $html, 1);
    if (strpos($html, 'testmodus.js') === false) stopp('Test-Modus nicht eingebaut');
    // vorher (vor bots.js): eine eigene, frische Testwelt je Version – mit nur EINEM Mitspieler (… test viele: alle Mitspieler, für Tests)
    if (!in_array('viele', $argv, true)) {
    file_put_contents($ziel . '/testvorher.js', str_replace('TESTWELT_VERSION', date('Y-m-d H:i:s'), file_get_contents(__DIR__ . '/vorschau_test_vorher.js')));
    $html = preg_replace('#(<script src="(?:klein/)?bots\.js[^"]*"></script>)#', '<script src="testvorher.js"></script>' . "\n" . '    $1', $html, 1);
    if (strpos($html, 'testvorher.js') === false) stopp('Test-Welt nicht eingebaut');
    }
}
if (($argv[2] ?? '') === 'artifact') {   // als Claude-Artifact: ohne <html>/<head>/<body> (die setzt der Artifact-Rahmen), Titel ganz oben
    $html = preg_replace(['#<!DOCTYPE html>\s*#i', '#</?html[^>]*>\s*#i', '#</?head>\s*#i', '#<body[^>]*>\s*#i', '#</body>\s*#i', '#<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*#'], '', $html);
    $html = "<title>Open Water</title>\n" . preg_replace('#<title>[^<]*</title>\s*#', '', $html);
}
file_put_contents($ziel . '/index.html', $html);
foreach (['ladebildschirm.js', 'bots.js', 'spiel.js', 'aufbau.js', 'buendnis.js', 'haendler.js'] as $f) copy($quelle . '/' . $f, $ziel . '/' . $f);
@mkdir($ziel . '/klein', 0755, true);
foreach (glob($quelle . '/klein/*.js') as $f) copy($f, $ziel . '/klein/' . basename($f));
@mkdir($ziel . '/app', 0755, true);
foreach (glob($quelle . '/app/*') as $f) copy($f, $ziel . '/app/' . basename($f));
@mkdir($ziel . '/schrift', 0755, true);   // (Cinzel/Inter selbst ausgeliefert – auch ohne Netz die richtige Schrift)
foreach (glob($quelle . '/schrift/*') as $f) copy($f, $ziel . '/schrift/' . basename($f));
@mkdir($ziel . '/bilder', 0755, true);   // (Titelbild des Ladebilds)
foreach (glob($quelle . '/bilder/*') as $f) copy($f, $ziel . '/bilder/' . basename($f));
echo "Vorschau in $ziel (" . round(array_sum(array_map('filesize', glob($ziel . '/*.*'))) / 1048576, 1) . " MB)\n";
