<?php
// Das Spiel: nur angemeldet. Der Spielstand kommt direkt mit der Seite aus dem Server-Speicher,
// js/speicher.js hält ihn im Arbeitsspeicher und schickt Änderungen laufend zurück.
require __DIR__ . '/api/lib.php';

try {
    $ich = aktueller_spieler();
    if (!$ich) { header('Location: ./'); exit; }
    $stand = lager()->stand_laden($ich['id']);
    // Wer hier zuletzt das Spiel öffnet, darf speichern - ein älterer Tab/anderes Gerät wird gestoppt.
    $tok = bin2hex(random_bytes(16));
    lager()->spiel_token_setzen($ich['id'], $tok);
} catch (Throwable $e) {
    error_log('Open Water Spiel: ' . $e->getMessage());
    http_response_code(503);
    exit('Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.');
}

$neu = !$stand;
if ($neu) {
    // Neuer Spieler: echte Uhrzeit (keine alten Test-Zeitsprünge, kein Turnier-Test), Spielername = Login-Name.
    $stand = [
        'openWaterReset' => '1', 'openWaterJump3d' => '1', 'openWaterJumpCenter' => '1', 'openWaterJump6d' => '1',
        'openWaterTourTest1' => '1', 'openWaterPlayerName' => $ich['name'],
    ];
}

$seite = file_get_contents(__DIR__ . '/inhalt/spiel.php');
$seite = substr($seite, strpos($seite, "\n") + 1);   // erste Zeile ist die Sperre gegen direkten Aufruf
$kopf = '<script>window.__OW = ' . json_encode([
    'stand' => (object)$stand, 'neu' => $neu, 'token' => $tok, 'name' => $ich['name'],
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE) . ';</script>'
      . '<script src="js/speicher.js?v=' . filemtime(__DIR__ . '/js/speicher.js') . '"></script>';
$pos = stripos($seite, '<head>');
$seite = substr($seite, 0, $pos + 6) . "\n" . $kopf . substr($seite, $pos + 6);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo $seite;
