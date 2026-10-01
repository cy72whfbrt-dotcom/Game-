<?php
// Das Spiel. Nur für angemeldete Spieler; der Spielstand kommt aus der Datenbank direkt in die Seite.
declare(strict_types=1);
require __DIR__ . '/inc/db.php';

try {
    $u = ow_user();
} catch (Throwable $e) {
    error_log('open water spiel: ' . $e->getMessage());
    http_response_code(503); header('Content-Type: text/plain; charset=utf-8');
    exit('Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.');
}
if (!$u) { header('Location: ./', true, 302); exit; }

$db = ow_db();
// Dieses Fenster ist ab jetzt das einzige, das speichern darf.
$tab = bin2hex(random_bytes(16));
$db->prepare('UPDATE ow_users SET tab = ? WHERE id = ?')->execute([$tab, $u['id']]);

$st = $db->prepare('SELECT data, rev FROM ow_saves WHERE user_id = ?');
$st->execute([$u['id']]);
$row = $st->fetch();
$data = '{}'; $rev = 0;
if ($row) {
    $blob = is_resource($row['data']) ? stream_get_contents($row['data']) : $row['data'];
    $dec = gzdecode($blob);
    if ($dec === false) { http_response_code(500); exit('Spielstand konnte nicht gelesen werden.'); }   // nie mit leerem Stand weiterspielen
    $data = $dec; $rev = (int)$row['rev'];
}

$start = '<script>window.__OW_START={"tab":' . json_encode($tab) . ',"rev":' . $rev . ',"neu":' . ($row ? 'false' : 'true')
       . ',"name":' . json_encode($u['name'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ',"data":' . $data . '};</script>'
       . '<script src="js/speicher.js?v=' . filemtime(__DIR__ . '/js/speicher.js') . '"></script>';

$html = file_get_contents(__DIR__ . '/inc/spiel.html');
$v = function (string $f) { return 'js/' . $f . '?v=' . filemtime(__DIR__ . '/js/' . $f); };
$html = str_replace(['src="baukunst.js"', 'src="botlogik.js"'], ['src="' . $v('baukunst.js') . '"', 'src="' . $v('botlogik.js') . '"'], $html);
$html = preg_replace('/<\/head>/i', $start . "\n</head>", $html, 1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo $html;
