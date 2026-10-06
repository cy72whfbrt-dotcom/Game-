<?php
// ===== skript.php – liefert die verkleinerten Spiel-Skripte aus Game/klein/ (entstehen in werkzeuge/spiel_bauen.sh) =====
// Gepackt (gzip), wenn der Browser es kann, und lange zwischengespeichert: die Adresse enthält die Version (?v=…), eine
// neue Version hat eine neue Adresse (skript() in server.php baut sie). Nur die Namen aus der Liste – nie andere Dateien.
// Ohne Datenbank, ohne Login: es sind dieselben Skripte, die jeder auch als Original (spiel.js …) laden kann.
const SKRIPTE = ['ladebildschirm', 'speichern', 'bots', 'welt', 'spiel', 'aufbau', 'buendnis', 'haendler', 'benachrichtigung', 'baukunst'];   // wie in werkzeuge/verkleinern.js
$name = $_GET['d'] ?? '';
$datei = __DIR__ . '/klein/' . (is_string($name) ? $name : '') . '.js';
if (!in_array($name, SKRIPTE, true) || !is_file($datei)) { http_response_code(404); header('Cache-Control: no-store'); exit; }
header('Content-Type: text/javascript; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Vary: Accept-Encoding');
$inhalt = file_get_contents($datei);
// passende Version (Anfang der sha1 des Originals, steht in der ersten Zeile): ein Jahr behalten, ohne nachzufragen ·
// andere Version (z. B. Seite von vor dem Hochladen): jedes Mal nachfragen
$v = preg_match('/^\/\* verkleinert aus [a-z]+\.js · ([0-9a-f]{40}) · /', $inhalt, $m) ? substr($m[1], 0, 12) : '-';
header(($_GET['v'] ?? '') === $v ? 'Cache-Control: public, max-age=31536000, immutable' : 'Cache-Control: no-cache');
if (strpos((string)($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''), 'gzip') !== false && !ini_get('zlib.output_compression') && function_exists('gzencode')) {   // (packt PHP schon selbst, nicht doppelt)
    header('Content-Encoding: gzip'); $inhalt = gzencode($inhalt, 6);
}
header('Content-Length: ' . strlen($inhalt));
echo $inhalt;
