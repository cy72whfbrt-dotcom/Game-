<?php
// Gemeinsame Teile: Einstellungen, Login-Cookie und die beiden Speicher (MySQL oder Dateien).
// Im Browser liegt nur der Login-Cookie (HttpOnly, 30 Tage) - alles andere steht hier auf dem Server.

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'lib.php') { http_response_code(404); exit; }

ini_set('serialize_precision', '-1');   // Kommazahlen exakt wie im Browser

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
        // Mitspieler: eine Zeile pro Mitspieler und Spieler (jeder Spieler hat seine eigene Welt mit eigenen Mitspielern)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_bots (
            spieler_id INT UNSIGNED NOT NULL,
            bot_id VARCHAR(20) NOT NULL,
            nr INT UNSIGNED NOT NULL DEFAULT 0,
            stufe INT NULL,
            muenzen DOUBLE NULL,
            anzahl_basen INT NULL,
            basen MEDIUMTEXT NULL,
            zustand MEDIUMTEXT NULL,
            geaendert TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (spieler_id, bot_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Übersicht in der Spieler-Tabelle (zum Anschauen in phpMyAdmin)
        $da = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'")->fetchAll(PDO::FETCH_COLUMN);
        $neu = ['stufe' => 'INT NULL', 'muenzen' => 'DOUBLE NULL', 'gems' => 'DOUBLE NULL', 'anzahl_basen' => 'INT NULL', 'zuletzt_gespeichert' => 'DATETIME NULL', 'abschied' => "CHAR(32) NOT NULL DEFAULT ''"];
        foreach ($neu as $sp => $typ) if (!in_array($sp, $da, true)) $this->db->exec("ALTER TABLE ow_spieler ADD COLUMN $sp $typ");
    }
    function sperren($uid) { $this->db->query("SELECT GET_LOCK('ow_spieler_" . (int)$uid . "', 15)"); }
    function entsperren($uid) { $this->db->query("SELECT RELEASE_LOCK('ow_spieler_" . (int)$uid . "')"); }
    function abschied($uid) {
        $q = $this->db->prepare('SELECT abschied FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (string)$q->fetchColumn();
    }
    function abschied_setzen($uid, $tok) { $this->db->prepare('UPDATE ow_spieler SET abschied = ? WHERE id = ?')->execute([$tok, $uid]); }
    function zuletzt_gespeichert($uid) {
        $q = $this->db->prepare('SELECT UNIX_TIMESTAMP(zuletzt_gespeichert) FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (int)$q->fetchColumn();
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
    // Die drei Mitspieler-Teile des Spielstands und ihre Spalte in ow_bots
    const BOT_TEILE = ['openWaterBotState' => 'zustand', 'openWaterBotCoins' => 'muenzen', 'openWaterBotOwnedIslands' => 'basen'];

    function stand_laden($uid) {
        $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ?');
        $q->execute([$uid]);
        $r = [];
        foreach ($q as $z) $r[$z['schluessel']] = $z['wert'];
        // Mitspieler wieder zusammensetzen (nur wenn der Teil nicht als Ganzes in ow_spielstand liegt)
        $q = $this->db->prepare('SELECT bot_id, muenzen, basen, zustand FROM ow_bots WHERE spieler_id = ? ORDER BY nr, bot_id');
        $q->execute([$uid]);
        $teile = ['zustand' => [], 'muenzen' => [], 'basen' => []];
        foreach ($q as $z) {
            if ($z['zustand'] !== null) $teile['zustand'][] = json_encode((string)$z['bot_id']) . ':' . $z['zustand'];
            if ($z['muenzen'] !== null) $teile['muenzen'][] = json_encode((string)$z['bot_id']) . ':' . json_encode((float)$z['muenzen'] == floor((float)$z['muenzen']) && abs((float)$z['muenzen']) < 9e15 ? (int)$z['muenzen'] : (float)$z['muenzen']);
            if ($z['basen'] !== null) $teile['basen'][] = json_encode((string)$z['bot_id']) . ':' . $z['basen'];
        }
        unset($r['_bot_teile']);
        $da = $this->bot_teile_da($uid);
        foreach (self::BOT_TEILE as $k => $sp) if (!isset($r[$k]) && !empty($da[$sp])) $r[$k] = '{' . implode(',', $teile[$sp]) . '}';
        return $r;
    }
    // Welche Mitspieler-Teile gibt es (auch leere Objekte "{}")? Merker in ow_spielstand.
    private function bot_teile_da($uid) {
        $q = $this->db->prepare("SELECT wert FROM ow_spielstand WHERE spieler_id = ? AND schluessel = '_bot_teile'");
        $q->execute([$uid]);
        $v = json_decode((string)$q->fetchColumn(), true);
        return is_array($v) ? $v : [];
    }
    function stand_schreiben($uid, $setzen, $loeschen) {
        $this->db->beginTransaction();
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE wert = VALUES(wert)');
        $d = $this->db->prepare('DELETE FROM ow_spielstand WHERE spieler_id = ? AND schluessel = ?');
        $da = null;
        foreach ($setzen as $k => $v) {
            if (isset(self::BOT_TEILE[$k])) {
                $obj = json_decode($v);   // als Objekte lesen: leere {} bleiben {} (nicht [])
                if (is_object($obj)) {
                    $this->bots_schreiben($uid, self::BOT_TEILE[$k], $obj);
                    $d->execute([$uid, $k]);
                    if ($da === null) $da = $this->bot_teile_da($uid);
                    $da[self::BOT_TEILE[$k]] = true;
                    continue;
                }
                // unerwartetes Format: als Ganzes speichern (geht nie verloren)
                $this->bots_leeren($uid, self::BOT_TEILE[$k]);
            }
            $s->execute([$uid, $k, $v]);
        }
        foreach ($loeschen as $k) {
            $d->execute([$uid, $k]);
            if (isset(self::BOT_TEILE[$k])) {
                $this->bots_leeren($uid, self::BOT_TEILE[$k]);
                if ($da === null) $da = $this->bot_teile_da($uid);
                unset($da[self::BOT_TEILE[$k]]);
            }
        }
        if ($da !== null) $s->execute([$uid, '_bot_teile', json_encode((object)$da)]);
        $this->uebersicht($uid, $setzen);
        $this->db->commit();
    }
    private function bots_leeren($uid, $sp) {
        $extra = $sp === 'basen' ? ', anzahl_basen = NULL' : ($sp === 'zustand' ? ', stufe = NULL' : '');
        $this->db->prepare("UPDATE ow_bots SET $sp = NULL$extra WHERE spieler_id = ?")->execute([$uid]);
        $this->db->prepare('DELETE FROM ow_bots WHERE spieler_id = ? AND zustand IS NULL AND muenzen IS NULL AND basen IS NULL')->execute([$uid]);
    }
    private function bots_schreiben($uid, $sp, $obj) {
        $this->bots_leeren($uid, $sp);
        $reihen = [];
        foreach ($obj as $id => $wert) {
            $id = (string)$id;
            $nr = preg_match('/(\d+)$/', $id, $m) ? (int)$m[1] : 0;
            if ($sp === 'zustand') $reihen[] = [$uid, $id, $nr, is_object($wert) && isset($wert->lvl) ? (int)$wert->lvl : null, null, null, null, json_encode($wert, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION)];
            elseif ($sp === 'muenzen') $reihen[] = [$uid, $id, $nr, null, is_numeric($wert) ? (float)$wert : 0, null, null, null];
            else $reihen[] = [$uid, $id, $nr, null, null, is_array($wert) ? count($wert) : 0, json_encode($wert, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), null];
        }
        $upd = $sp === 'zustand' ? 'stufe = VALUES(stufe), zustand = VALUES(zustand)' : ($sp === 'muenzen' ? 'muenzen = VALUES(muenzen)' : 'anzahl_basen = VALUES(anzahl_basen), basen = VALUES(basen)');
        foreach (array_chunk($reihen, 50) as $block) {
            $sql = 'INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES '
                 . implode(',', array_fill(0, count($block), '(?,?,?,?,?,?,?,?)')) . " ON DUPLICATE KEY UPDATE $upd";
            $this->db->prepare($sql)->execute(array_merge(...$block));
        }
    }
    // Lesbare Übersicht in ow_spieler
    private function uebersicht($uid, $setzen) {
        $f = ['zuletzt_gespeichert = NOW()']; $w = [];
        if (isset($setzen['openWaterLevel'])) { $f[] = 'stufe = ?'; $w[] = (int)$setzen['openWaterLevel']; }
        if (isset($setzen['openWaterCoins'])) { $f[] = 'muenzen = ?'; $w[] = (float)$setzen['openWaterCoins']; }
        if (isset($setzen['openWaterGems'])) { $f[] = 'gems = ?'; $w[] = (float)$setzen['openWaterGems']; }
        if (isset($setzen['openWaterOwnedIslands'])) { $b = json_decode($setzen['openWaterOwnedIslands'], true); $f[] = 'anzahl_basen = ?'; $w[] = is_array($b) ? count($b) : null; }
        $w[] = $uid;
        $this->db->prepare('UPDATE ow_spieler SET ' . implode(', ', $f) . ' WHERE id = ?')->execute($w);
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
    private $sperre = null;
    function sperren($uid) { $this->sperre = fopen($this->dir . '/staende/' . (int)$uid . '.php.lock', 'c'); flock($this->sperre, LOCK_EX); }
    function entsperren($uid) { if ($this->sperre) { flock($this->sperre, LOCK_UN); fclose($this->sperre); $this->sperre = null; } }
    function abschied($uid) { return (string)($this->lesen($this->id_datei($uid))['abschied'] ?? ''); }
    function abschied_setzen($uid, $tok) { $u = $this->lesen($this->id_datei($uid)); $u['abschied'] = $tok; $this->schreiben($this->id_datei($uid), $u); }
    function zuletzt_gespeichert($uid) { $f = $this->dir . '/staende/' . (int)$uid . '.php'; clearstatcache(); return is_file($f) ? filemtime($f) : 0; }
    function stand_laden($uid) { return $this->lesen($this->dir . '/staende/' . (int)$uid . '.php') ?: []; }
    function stand_schreiben($uid, $setzen, $loeschen) {
        $f = $this->dir . '/staende/' . (int)$uid . '.php';   // gesperrt wird vorher mit sperren()
        $st = $this->lesen($f) ?: [];
        foreach ($setzen as $k => $v) $st[$k] = $v;
        foreach ($loeschen as $k) unset($st[$k]);
        $this->schreiben($f, (object)$st);
    }
}
