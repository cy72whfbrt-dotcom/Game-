<?php
// Registrieren, Anmelden, Abmelden.
declare(strict_types=1);
require __DIR__ . '/../inc/db.php';
ow_require_api();

$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) ow_json(['ok' => false, 'fehler' => 'Ungültige Anfrage.'], 400);
$was = $in['was'] ?? '';

try {
    if ($was === 'abmelden') { ow_logout(); ow_json(['ok' => true]); }

    ow_schema();
    $db = ow_db();
    $name = trim((string)($in['name'] ?? ''));
    $pw   = (string)($in['pw'] ?? '');
    $ip   = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);

    // Schutz gegen Durchprobieren: höchstens 10 Fehlversuche in 15 Minuten pro Adresse.
    $db->prepare('DELETE FROM ow_fails WHERE t < ?')->execute([time() - 900]);
    $st = $db->prepare('SELECT COUNT(*) FROM ow_fails WHERE ip = ?'); $st->execute([$ip]);
    if ((int)$st->fetchColumn() >= 10) ow_json(['ok' => false, 'fehler' => 'Zu viele Versuche. Bitte in 15 Minuten nochmal.'], 429);
    $fail = function (string $msg) use ($db, $ip) {
        $db->prepare('INSERT INTO ow_fails (ip, t) VALUES (?, ?)')->execute([$ip, time()]);
        ow_json(['ok' => false, 'fehler' => $msg]);
    };

    if ($was === 'registrieren') {
        if (!preg_match('/^[\p{L}\p{N} _.\-]{3,20}$/u', $name)) ow_json(['ok' => false, 'fehler' => 'Name: 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).']);
        if (mb_strlen($pw) < 6 || strlen($pw) > 200) ow_json(['ok' => false, 'fehler' => 'Passwort: mindestens 6 Zeichen.']);
        $st = $db->prepare('SELECT id FROM ow_users WHERE LOWER(name) = LOWER(?)'); $st->execute([$name]);
        if ($st->fetch()) $fail('Diesen Namen gibt es schon.');
        $db->prepare('INSERT INTO ow_users (name, pw_hash, created) VALUES (?, ?, ?)')->execute([$name, password_hash($pw, PASSWORD_DEFAULT), time()]);
        ow_login((int)$db->lastInsertId());
        ow_json(['ok' => true]);
    }

    if ($was === 'anmelden') {
        $st = $db->prepare('SELECT id, pw_hash FROM ow_users WHERE LOWER(name) = LOWER(?)'); $st->execute([$name]);
        $u = $st->fetch();
        if (!$u || !password_verify($pw, $u['pw_hash'])) $fail('Name oder Passwort stimmt nicht.');
        if (password_needs_rehash($u['pw_hash'], PASSWORD_DEFAULT))
            $db->prepare('UPDATE ow_users SET pw_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
        ow_login((int)$u['id']);
        ow_json(['ok' => true]);
    }

    ow_json(['ok' => false, 'fehler' => 'Ungültige Anfrage.'], 400);
} catch (Throwable $e) {
    error_log('open water konto: ' . $e->getMessage());
    ow_json(['ok' => false, 'fehler' => 'Der Server hat gerade ein Problem. Bitte später nochmal.'], 500);
}
