<?php
// Gemeinsame Teile: Datenbank, Login-Cookie, Antworten.
declare(strict_types=1);

const OW_COOKIE   = 'ow_sid';
const OW_DAYS     = 30;                 // so lange bleibt man angemeldet
const OW_MAX_SAVE = 24 * 1024 * 1024;   // größter Spielstand (entpackt)
const OW_BACKUP_EVERY = 3600;           // eine Sicherung pro Stunde ...
const OW_BACKUP_KEEP  = 48;             // ... die letzten 48 bleiben

function ow_db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $pdo = new PDO($cfg['dsn'], $cfg['user'] ?? null, $cfg['pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function ow_is_mysql(): bool { return ow_db()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }

// Tabellen anlegen, falls sie fehlen (läuft nur bei Anmelden/Registrieren).
function ow_schema(): void {
    $my = ow_is_mysql();
    $ai   = $my ? 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $blob = $my ? 'LONGBLOB' : 'BLOB';
    $tail = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $db = ow_db();
    $db->exec("CREATE TABLE IF NOT EXISTS ow_users (id $ai, name VARCHAR(20) NOT NULL UNIQUE, pw_hash VARCHAR(255) NOT NULL,
               tab CHAR(32) NULL, created INT NOT NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS ow_sessions (token CHAR(64) NOT NULL PRIMARY KEY, user_id INT NOT NULL, expires INT NOT NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS ow_saves (user_id INT NOT NULL PRIMARY KEY, data $blob NOT NULL, size INT NOT NULL,
               rev INT NOT NULL, updated INT NOT NULL, backed_up INT NOT NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS ow_backups (id $ai, user_id INT NOT NULL, data $blob NOT NULL, rev INT NOT NULL, created INT NOT NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS ow_fails (ip VARCHAR(45) NOT NULL, t INT NOT NULL)$tail");
}

function ow_json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function ow_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function ow_set_cookie(string $value, int $expires): void {
    setcookie(OW_COOKIE, $value, ['expires' => $expires, 'path' => ow_base_path(), 'secure' => ow_https(),
                                  'httponly' => true, 'samesite' => 'Lax']);
}

// Pfad des Ordners Game (das Cookie gilt nur dort).
function ow_base_path(): string {
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    if (substr($dir, -4) === '/api') $dir = substr($dir, 0, -4);
    return rtrim($dir, '/') . '/';
}

// Angemeldeter Spieler oder null.
function ow_user(): ?array {
    $tok = $_COOKIE[OW_COOKIE] ?? '';
    if (!is_string($tok) || !preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $st = ow_db()->prepare('SELECT u.id, u.name, u.tab FROM ow_sessions s JOIN ow_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires > ?');
    $st->execute([hash('sha256', $tok), time()]);
    $u = $st->fetch();
    return $u ?: null;
}

function ow_login(int $userId): void {
    $tok = bin2hex(random_bytes(32));
    $exp = time() + OW_DAYS * 86400;
    $db = ow_db();
    $db->prepare('DELETE FROM ow_sessions WHERE expires < ?')->execute([time()]);
    $db->prepare('INSERT INTO ow_sessions (token, user_id, expires) VALUES (?, ?, ?)')->execute([hash('sha256', $tok), $userId, $exp]);
    ow_set_cookie($tok, $exp);
}

function ow_logout(): void {
    $tok = $_COOKIE[OW_COOKIE] ?? '';
    if (is_string($tok) && $tok !== '') ow_db()->prepare('DELETE FROM ow_sessions WHERE token = ?')->execute([hash('sha256', $tok)]);
    ow_set_cookie('', time() - 3600);
}

// Nur Anfragen aus unserem eigenen Spiel (fremde Seiten können diesen Kopf nicht setzen).
function ow_require_api(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || ($_SERVER['HTTP_X_OW'] ?? '') !== '1') ow_json(['ok' => false, 'fehler' => 'Ungültige Anfrage.'], 400);
}
