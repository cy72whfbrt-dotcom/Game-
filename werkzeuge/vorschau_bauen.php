<?php
// Vorschau bauen: das Spiel als Datei zum Anschauen – OHNE Server (php werkzeuge/vorschau_bauen.php <Zielordner>).
// Es läuft dann wie früher allein im Browser: die Welt mit den Mitspielern rechnet das eigene Gerät, gespeichert wird nur
// in diesem Browser. Kein Login, keine Datenbank, keine Handy-Nachrichten. Nur zum Ansehen neuer Sachen – nie hochladen.
$quelle = dirname(__DIR__) . '/Game';
$ziel = $argv[1] ?? (dirname(__DIR__) . '/vorschau');
@mkdir($ziel, 0755, true);
$html = file_get_contents($quelle . '/spiel.php');
$html = substr($html, strpos($html, '<!DOCTYPE html>'));
$html = str_replace('<?= $kopf ?>', '', $html);
$html = preg_replace_callback("/<\?= v\('([^']+)'\) \?>/", function ($m) use ($quelle) { return filemtime($quelle . '/' . $m[1]); }, $html);
foreach (['welt.js', 'benachrichtigung.js'] as $weg) $html = preg_replace('#\s*<script[^>]*src="' . preg_quote($weg, '#') . '[^"]*"[^>]*></script>#', '', $html);   // brauchen den Server
if (strpos($html, '<?') !== false) exit("Fehler: noch PHP in spiel.php\n");
file_put_contents($ziel . '/index.html', $html);
foreach (['ladebildschirm.js', 'baukunst.js', 'bots.js', 'spiel.js', 'buendnis.js'] as $f) copy($quelle . '/' . $f, $ziel . '/' . $f);
@mkdir($ziel . '/app', 0755, true);
foreach (glob($quelle . '/app/*') as $f) copy($f, $ziel . '/app/' . basename($f));
echo "Vorschau in $ziel (" . round(array_sum(array_map('filesize', glob($ziel . '/*.*'))) / 1048576, 1) . " MB)\n";
