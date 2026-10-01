<?php
// Gemeinsame Teile: Einstellungen, Login-Cookie und die beiden Speicher (MySQL oder Dateien).
// Im Browser liegt nur der Login-Cookie (HttpOnly, 30 Tage) - alles andere steht hier auf dem Server.

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'lib.php') { http_response_code(404); exit; }

const COOKIE_NAME = 'ow_login';
const COOKIE_TAGE = 30;

function cfg() {
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/config.php';
        if (!is_file($f)) { http_response_code(500); exit('config.php fehlt'); }
        $c = require $f;
    }
    return $c;
}

// Pfad des Game-Ordners in der Adresse (für den Cookie), z. B. /html/725/klassenarbeit_GR4/Game/
function basis_pfad() {
    $p = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
    if (basename($p) === 'api') $p = dirname($p);
    return rtrim($p, '/') . '/';
}

function ist_https() {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function setze_cookie($wert, $ablauf) {
    setcookie(COOKIE_NAME, $wert, [
        'expires' => $ablauf, 'path' => basis_pfad(), 'secure' => ist_https(), 'httponly' => true, 'samesite' => 'Lax',
    ]);
}

function lager() {
    static $l = null;
    if ($l === null) $l = (cfg()['speicher'] ?? 'mysql') === 'dateien' ? new DateiLager(__DIR__ . '/../daten') : new MysqlLager(cfg());
    return $l;
}

// Angemeldeter Spieler (['id' => …, 'name' => …]) oder null
function aktueller_spieler() {
    $t = $_COOKIE[COOKIE_NAME] ?? '';
    if (!is_string($t) || !preg_match('/^[a-f0-9]{64}$/', $t)) return null;
    return lager()->sitzung_holen(hash('sha256', $t));
}

function anmelden($uid) {
    $t = bin2hex(random_bytes(32));
    $ablauf = time() + COOKIE_TAGE * 86400;
    lager()->sitzung_anlegen(hash('sha256', $t), $uid, $ablauf);
    setze_cookie($t, $ablauf);
}

function abmelden() {
    $t = $_COOKIE[COOKIE_NAME] ?? '';
    if (is_string($t) && preg_match('/^[a-f0-9]{64}$/', $t)) lager()->sitzung_loeschen(hash('sha256', $t));
    setze_cookie('', time() - 3600);
}

function json_antwort($code, $daten) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

// ===== MySQL =====
class MysqlLager {
    private $db;
    function __construct($c) {
        $this->db = new PDO('mysql:host=' . $c['db_host'] . ';dbname=' . $c['db_name'] . ';charset=utf8mb4', $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 5,
        ]);
        $this->tabellen();
    }
    private function tabellen() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_spieler (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(20) NOT NULL,
            pw_hash VARCHAR(255) NOT NULL,
            spiel_token CHAR(32) NOT NULL DEFAULT '',
            erstellt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_sitzungen (
            token_hash CHAR(64) PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            ablauf INT UNSIGNED NOT NULL,
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_spielstand (
            spieler_id INT UNSIGNED NOT NULL,
            schluessel VARCHAR(100) NOT NULL,
            wert LONGTEXT NOT NULL,
            geaendert TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (spieler_id, schluessel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
    }
    function spieler_nach_name($name) {
        $q = $this->db->prepare('SELECT id, name, pw_hash FROM ow_spieler WHERE name = ?');
        $q->execute([$name]);
        return $q->fetch() ?: null;
    }
    function spieler_anlegen($name, $hash) {
        try {
            $this->db->prepare('INSERT INTO ow_spieler (name, pw_hash) VALUES (?, ?)')->execute([$name, $hash]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') return null;   // Name schon vergeben
            throw $e;
        }
        return (int)$this->db->lastInsertId();
    }
    function sitzung_anlegen($th, $uid, $ablauf) {
        $this->db->prepare('DELETE FROM ow_sitzungen WHERE ablauf < ?')->execute([time()]);
        $this->db->prepare('INSERT INTO ow_sitzungen (token_hash, spieler_id, ablauf) VALUES (?, ?, ?)')->execute([$th, $uid, $ablauf]);
    }
    function sitzung_holen($th) {
        $q = $this->db->prepare('SELECT s.id, s.name FROM ow_sitzungen z JOIN ow_spieler s ON s.id = z.spieler_id WHERE z.token_hash = ? AND z.ablauf > ?');
        $q->execute([$th, time()]);
        $r = $q->fetch();
        return $r ? ['id' => (int)$r['id'], 'name' => $r['name']] : null;
    }
    function sitzung_loeschen($th) {
        $this->db->prepare('DELETE FROM ow_sitzungen WHERE token_hash = ?')->execute([$th]);
    }
    function spiel_token_setzen($uid, $tok) {
        $this->db->prepare('UPDATE ow_spieler SET spiel_token = ? WHERE id = ?')->execute([$tok, $uid]);
    }
    function spiel_token($uid) {
        $q = $this->db->prepare('SELECT spiel_token FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (string)$q->fetchColumn();
    }
    function stand_laden($uid) {
        $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ?');
        $q->execute([$uid]);
        $r = [];
        foreach ($q as $z) $r[$z['schluessel']] = $z['wert'];
        return $r;
    }
    function stand_schreiben($uid, $setzen, $loeschen) {
        $this->db->beginTransaction();
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE wert = VALUES(wert)');
        foreach ($setzen as $k => $v) $s->execute([$uid, $k, $v]);
        $d = $this->db->prepare('DELETE FROM ow_spielstand WHERE spieler_id = ? AND schluessel = ?');
        foreach ($loeschen as $k) $d->execute([$uid, $k]);
        $this->db->commit();
    }
}

// ===== Dateien (falls die Datenbank nicht erreichbar ist) =====
// Jede Datei beginnt mit einer PHP-Sperre, damit niemand sie über die Adresse lesen kann.
class DateiLager {
    private $dir;
    const SPERRE = "<?php http_response_code(404); exit; ?>\n";
    function __construct($dir) {
        $this->dir = $dir;
        foreach (['', '/spieler', '/sitzungen', '/staende'] as $u) if (!is_dir($dir . $u)) mkdir($dir . $u, 0750, true);
    }
    private function lesen($f) {
        if (!is_file($f)) return null;
        $s = file_get_contents($f);
        return json_decode(substr($s, strlen(self::SPERRE)), true);
    }
    private function schreiben($f, $daten) {
        $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
        file_put_contents($tmp, self::SPERRE . json_encode($daten, JSON_UNESCAPED_UNICODE), LOCK_EX);
        rename($tmp, $f);   // erst fertig schreiben, dann austauschen: nie halbe Spielstände
    }
    private function name_datei($name) { return $this->dir . '/spieler/' . bin2hex(mb_strtolower($name, 'UTF-8')) . '.php'; }
    private function id_datei($uid) { return $this->dir . '/spieler/id_' . (int)$uid . '.php'; }
    function spieler_nach_name($name) {
        $n = $this->lesen($this->name_datei($name));
        return $n ? $this->lesen($this->id_datei($n['id'])) : null;
    }
    function spieler_anlegen($name, $hash) {
        $lock = fopen($this->dir . '/spieler/.lock', 'c');
        flock($lock, LOCK_EX);
        try {
            if (is_file($this->name_datei($name))) return null;
            $zf = $this->dir . '/spieler/zaehler.php';
            $id = (int)($this->lesen($zf)['n'] ?? 0) + 1;
            $this->schreiben($zf, ['n' => $id]);
            $this->schreiben($this->id_datei($id), ['id' => $id, 'name' => $name, 'pw_hash' => $hash, 'spiel_token' => '']);
            $this->schreiben($this->name_datei($name), ['id' => $id]);
            return $id;
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }
    function sitzung_anlegen($th, $uid, $ablauf) {
        $this->schreiben($this->dir . '/sitzungen/' . $th . '.php', ['id' => $uid, 'ablauf' => $ablauf]);
    }
    function sitzung_holen($th) {
        $s = $this->lesen($this->dir . '/sitzungen/' . $th . '.php');
        if (!$s || $s['ablauf'] < time()) return null;
        $u = $this->lesen($this->id_datei($s['id']));
        return $u ? ['id' => (int)$u['id'], 'name' => $u['name']] : null;
    }
    function sitzung_loeschen($th) { @unlink($this->dir . '/sitzungen/' . $th . '.php'); }
    function spiel_token_setzen($uid, $tok) {
        $u = $this->lesen($this->id_datei($uid));
        $u['spiel_token'] = $tok;
        $this->schreiben($this->id_datei($uid), $u);
    }
    function spiel_token($uid) { return (string)($this->lesen($this->id_datei($uid))['spiel_token'] ?? ''); }
    function stand_laden($uid) { return $this->lesen($this->dir . '/staende/' . (int)$uid . '.php') ?: []; }
    function stand_schreiben($uid, $setzen, $loeschen) {
        $f = $this->dir . '/staende/' . (int)$uid . '.php';
        $lock = fopen($f . '.lock', 'c');
        flock($lock, LOCK_EX);
        try {
            $st = $this->lesen($f) ?: [];
            foreach ($setzen as $k => $v) $st[$k] = $v;
            foreach ($loeschen as $k) unset($st[$k]);
            $this->schreiben($f, (object)$st);
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }
}
