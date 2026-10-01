<?php
// Nimmt die geänderten Teile des Spielstands entgegen: {"token": "...", "setzen": {schluessel: wert}, "loeschen": [schluessel]}
// Der Inhalt kommt gzip-gepackt (Kopfzeile X-Gepackt: 1) oder als normales JSON.
require __DIR__ . '/lib.php';
$GLOBALS['ow_t0'] = microtime(true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_antwort(405, ['fehler' => 'nur POST']);
if (($_SERVER['HTTP_X_OPEN_WATER'] ?? '') !== '1') json_antwort(403, ['fehler' => 'falscher Aufruf']);   // nur aus dem Spiel (fremde Seiten dürfen diese Kopfzeile nicht setzen)

try {
    $ich = aktueller_spieler();
    if (!$ich) json_antwort(401, ['fehler' => 'abgemeldet']);

    $roh = file_get_contents('php://input', false, null, 0, 40 * 1024 * 1024);
    if (($_SERVER['HTTP_X_GEPACKT'] ?? '') === '1') {
        $roh = @gzdecode($roh, 200 * 1024 * 1024);
        if ($roh === false) json_antwort(400, ['fehler' => 'kaputt']);
    }
    $d = json_decode($roh, true);
    if (!is_array($d)) json_antwort(400, ['fehler' => 'kaputt']);

    $t1 = microtime(true);
    lager()->sperren($ich['id']);   // Laden (spiel.php) wartet, bis diese Sicherung drin ist
    if (!hash_equals(lager()->spiel_token($ich['id']), (string)($d['token'] ?? ''))) json_antwort(409, ['fehler' => 'anderswo geöffnet']);

    $setzen = [];
    foreach ((array)($d['setzen'] ?? []) as $k => $v) {
        if (!is_string($k) || !preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k) || !is_string($v)) json_antwort(400, ['fehler' => 'ungültig']);
        $setzen[$k] = $v;
    }
    $loeschen = [];
    foreach ((array)($d['loeschen'] ?? []) as $k) {
        if (!is_string($k) || !preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k)) json_antwort(400, ['fehler' => 'ungültig']);
        $loeschen[] = $k;
    }
    $t2 = microtime(true);
    lager()->stand_schreiben($ich['id'], $setzen, $loeschen);
    header(sprintf('Server-Timing: lesen;dur=%d, warten;dur=%d, schreiben;dur=%d', ($t1 - $GLOBALS['ow_t0']) * 1000, ($t2 - $t1) * 1000, (microtime(true) - $t2) * 1000));
    if (!empty($d['abschied'])) lager()->abschied_setzen($ich['id'], (string)$d['token']);   // Fenster wird geschlossen/neu geladen
    json_antwort(200, ['ok' => true]);
} catch (Throwable $e) {
    error_log('Open Water Speichern: ' . $e->getMessage());
    json_antwort(503, ['fehler' => 'server']);
}
