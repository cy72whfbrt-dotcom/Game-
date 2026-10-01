<?php
// ===== server.php – alles auf dem Server: Datenbank, Login, Spielstand laden und speichern =====
// Wird von index.php und spiel.php eingebunden. Direkt aufgerufen (POST von speichern.js) speichert es den Spielstand.
// Im Browser liegt nur der Login-Cookie (HttpOnly, 30 Tage) - alles andere steht hier in der Datenbank.

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
    if ($l === null) $l = new MysqlLager(cfg());
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

// ===== Spielseite vorbereiten (spiel.php) =====
// Login prüfen, auf die letzte Sicherung eines gerade geschlossenen Fensters warten, Spielstand laden.
// Gibt die Zeilen für den Seitenkopf zurück (Spielstand + speichern.js).
function spielseite_vorbereiten() {
    try {
        $ich = aktueller_spieler();
        if (!$ich) { header('Location: ./'); exit; }
        // Gerade noch gespielt (Neuladen)? Dann auf den "Abschied" des alten Fensters warten (seine letzte Sicherung),
        // höchstens 8 Sekunden - so lädt die neue Seite nie einen älteren Stand.
        $altTok = lager()->spiel_token($ich['id']);
        if ($altTok !== '' && time() - lager()->zuletzt_gespeichert($ich['id']) < 60) {
            for ($i = 0; $i < 80 && lager()->abschied($ich['id']) !== $altTok; $i++) usleep(100000);
        }
        lager()->sperren($ich['id']);
        // Wer hier zuletzt das Spiel öffnet, darf speichern - ein älterer Tab/anderes Gerät wird gestoppt.
        $tok = bin2hex(random_bytes(16));
        lager()->spiel_token_setzen($ich['id'], $tok);
        $stand = lager()->stand_laden($ich['id']);
        $neu = !$stand;
        if ($neu) {   // neuer Spieler: Start bei Null, Spielername = Login-Name - sofort in die Datenbank
            $stand = ['openWaterReset' => '1', 'openWaterPlayerName' => $ich['name']];
            lager()->stand_schreiben($ich['id'], $stand, []);
        }
        lager()->entsperren($ich['id']);
    } catch (Throwable $e) {
        error_log('Open Water Spiel: ' . $e->getMessage());
        http_response_code(503);
        exit('Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.');
    }
    return '<script>window.__OW = ' . json_encode([
        'stand' => (object)$stand, 'neu' => $neu, 'token' => $tok, 'name' => $ich['name'],
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE) . ';</script>'
        . '<script src="speichern.js?v=' . filemtime(__DIR__ . '/speichern.js') . '"></script>';
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
        // ===== Die EINE Welt =====
        // Der Weltstand selbst liegt wie ein Spielstand mit der Nummer 0 in ow_spielstand / ow_bots (spieler_id = 0).
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_welt_info (
            id TINYINT UNSIGNED PRIMARY KEY,
            version BIGINT UNSIGNED NOT NULL DEFAULT 0,
            versionen MEDIUMTEXT NULL,
            leiter_id INT UNSIGNED NOT NULL DEFAULT 0,
            leiter_token CHAR(32) NOT NULL DEFAULT '',
            leiter_bis INT UNSIGNED NOT NULL DEFAULT 0,
            welt_zeit BIGINT UNSIGNED NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        $this->db->exec("INSERT IGNORE INTO ow_welt_info (id) VALUES (1)");
        // Befehle der Spieler an den Weltrechner (angreifen, senden, ausbauen …)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_befehle (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            befehl MEDIUMTEXT NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Nachrichten vom Weltrechner an einen Spieler (geplündert, Beute, Belohnung …)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_ereignisse (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            ereignis MEDIUMTEXT NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Übersicht in der Spieler-Tabelle (zum Anschauen in phpMyAdmin)
        $da = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'")->fetchAll(PDO::FETCH_COLUMN);
        $neu = ['stufe' => 'INT NULL', 'muenzen' => 'DOUBLE NULL', 'gems' => 'DOUBLE NULL', 'anzahl_basen' => 'INT NULL', 'zuletzt_gespeichert' => 'DATETIME NULL', 'abschied' => "CHAR(32) NOT NULL DEFAULT ''",
                'profil' => 'MEDIUMTEXT NULL', 'profil_zeit' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'online_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0'];
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

    // $nur: nur diese Teile laden (Liste von Schlüsseln) - sonst alles
    function stand_laden($uid, $nur = null) {
        if ($nur !== null && !$nur) return [];
        $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ?');
        $q->execute([$uid]);
        $r = [];
        foreach ($q as $z) if ($nur === null || in_array($z['schluessel'], $nur, true)) $r[$z['schluessel']] = $z['wert'];
        if ($nur !== null && !array_intersect(array_keys(self::BOT_TEILE), $nur)) return $r;
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
        foreach (self::BOT_TEILE as $k => $sp) if (!isset($r[$k]) && !empty($da[$sp]) && ($nur === null || in_array($k, $nur, true))) $r[$k] = '{' . implode(',', $teile[$sp]) . '}';
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
    // ===== Welt =====
    function welt_sperren() { $this->db->query("SELECT GET_LOCK('ow_welt', 15)"); }
    function welt_entsperren() { $this->db->query("SELECT RELEASE_LOCK('ow_welt')"); }
    function welt_info() {
        $r = $this->db->query('SELECT version, versionen, leiter_id, leiter_token, leiter_bis, welt_zeit FROM ow_welt_info WHERE id = 1')->fetch();
        $r['versionen'] = json_decode((string)$r['versionen'], true) ?: [];
        return $r;
    }
    function leiter_setzen($uid, $tok, $bis) {
        $this->db->prepare('UPDATE ow_welt_info SET leiter_id = ?, leiter_token = ?, leiter_bis = ? WHERE id = 1')->execute([$uid, $tok, $bis]);
    }
    // Weltrechner schreibt: Teile speichern, Version hochzählen, je Teil merken, in welcher Version er zuletzt geändert wurde
    function welt_schreiben($setzen, $loeschen, $welt_zeit) {
        $i = $this->welt_info();
        $v = (int)$i['version'] + 1;
        $vs = $i['versionen'];
        foreach ($setzen as $k => $_) $vs[$k] = $v;
        foreach ($loeschen as $k) $vs[$k] = $v;
        $this->stand_schreiben(0, $setzen, $loeschen);
        $this->db->prepare('UPDATE ow_welt_info SET version = ?, versionen = ?, welt_zeit = GREATEST(welt_zeit, ?) WHERE id = 1')->execute([$v, json_encode($vs), (int)$welt_zeit]);
        return $v;
    }
    // Was hat sich seit Version $seit geändert? (seit = 0: alles)
    function welt_seit($seit) {
        $i = $this->welt_info();
        $neu = []; $weg = [];
        foreach ($i['versionen'] as $k => $v) if ($v > $seit) $neu[] = $k;
        $teile = $this->stand_laden(0, $neu);
        foreach ($neu as $k) if (!isset($teile[$k])) $weg[] = $k;
        return ['version' => (int)$i['version'], 'setzen' => (object)$teile, 'loeschen' => $weg, 'welt_zeit' => (int)$i['welt_zeit']];
    }
    function befehl_ablegen($uid, $b) { $this->db->prepare('INSERT INTO ow_befehle (spieler_id, befehl) VALUES (?, ?)')->execute([$uid, $b]); }
    function befehle_abholen() {
        $r = $this->db->query('SELECT id, spieler_id, befehl FROM ow_befehle ORDER BY id LIMIT 500')->fetchAll();
        if ($r) $this->db->prepare('DELETE FROM ow_befehle WHERE id <= ?')->execute([end($r)['id']]);
        return array_map(function ($z) { return ['von' => (int)$z['spieler_id'], 'b' => json_decode($z['befehl'])]; }, $r);
    }
    function ereignis_ablegen($uid, $e) { $this->db->prepare('INSERT INTO ow_ereignisse (spieler_id, ereignis) VALUES (?, ?)')->execute([$uid, $e]); }
    function ereignisse_abholen($uid) {
        $q = $this->db->prepare('SELECT id, ereignis FROM ow_ereignisse WHERE spieler_id = ? ORDER BY id LIMIT 200');
        $q->execute([$uid]);
        $r = $q->fetchAll();
        if ($r) $this->db->prepare('DELETE FROM ow_ereignisse WHERE spieler_id = ? AND id <= ?')->execute([$uid, end($r)['id']]);
        return array_map(function ($z) { return json_decode($z['ereignis']); }, $r);
    }
    function profil_setzen($uid, $p) { $this->db->prepare('UPDATE ow_spieler SET profil = ?, profil_zeit = ? WHERE id = ?')->execute([$p, time(), $uid]); }
    function online($uid, $bis) { $this->db->prepare('UPDATE ow_spieler SET online_bis = ? WHERE id = ?')->execute([$bis, $uid]); }
    // Alle echten Spieler (für die Karte), Profile nur wenn neuer als $seit
    function spieler_liste($seit) {
        $q = $this->db->prepare('SELECT id, name, online_bis, profil_zeit, IF(profil_zeit > ?, profil, NULL) profil FROM ow_spieler');
        $q->execute([(int)$seit]);
        return array_map(function ($z) { return ['id' => (int)$z['id'], 'name' => $z['name'], 'online' => (int)$z['online_bis'] > time(), 'profil_zeit' => (int)$z['profil_zeit'], 'profil' => $z['profil'] !== null ? json_decode($z['profil']) : null]; }, $q->fetchAll());
    }

    // Lesbare Übersicht in ow_spieler
    private function uebersicht($uid, $setzen) {
        if (!$uid) return;
        $f = ['zuletzt_gespeichert = NOW()']; $w = [];
        if (isset($setzen['openWaterLevel'])) { $f[] = 'stufe = ?'; $w[] = (int)$setzen['openWaterLevel']; }
        if (isset($setzen['openWaterCoins'])) { $f[] = 'muenzen = ?'; $w[] = (float)$setzen['openWaterCoins']; }
        if (isset($setzen['openWaterGems'])) { $f[] = 'gems = ?'; $w[] = (float)$setzen['openWaterGems']; }
        if (isset($setzen['openWaterOwnedIslands'])) { $b = json_decode($setzen['openWaterOwnedIslands'], true); $f[] = 'anzahl_basen = ?'; $w[] = is_array($b) ? count($b) : null; }
        $w[] = $uid;
        $this->db->prepare('UPDATE ow_spieler SET ' . implode(', ', $f) . ' WHERE id = ?')->execute($w);
    }
}


// ===== Speichern (POST von speichern.js) =====
// Inhalt: {"token": "...", "setzen": {schluessel: wert}, "loeschen": [schluessel], "abschied": 1?}, meist gzip-gepackt (X-Gepackt: 1)
function speichern_anfrage() {
    $t0 = microtime(true);
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

        if (($d['aktion'] ?? '') === 'puls') welt_puls($ich, $d);
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
        header(sprintf('Server-Timing: lesen;dur=%d, warten;dur=%d, schreiben;dur=%d', ($t1 - $t0) * 1000, ($t2 - $t1) * 1000, (microtime(true) - $t2) * 1000));
        if (!empty($d['abschied'])) lager()->abschied_setzen($ich['id'], (string)$d['token']);   // Fenster wird geschlossen/neu geladen
        json_antwort(200, ['ok' => true]);
    } catch (Throwable $e) {
        error_log('Open Water Speichern: ' . $e->getMessage());
        json_antwort(503, ['fehler' => 'server']);
    }
}

// ===== Puls der EINEN Welt (alle ~2 s von jedem Spieler) =====
// Anfrage:  {aktion:"puls", token, seit, spieler_seit, befehle:[…], profil?, welt?:{setzen,loeschen,welt_zeit}, ereignisse?:[{an, e}]}
//           welt/ereignisse schickt nur der Weltrechner.
// Antwort:  {leiter, version, welt:{setzen,loeschen}, befehle:[{von,b}] (nur Weltrechner), ereignisse:[…], spieler:[…]}
// Der Weltrechner ist der Spieler, der gerade rechnet; meldet er sich 12 s nicht, übernimmt der nächste.
const LEITER_SEK = 12;
function welt_puls($ich, $d) {
    $l = lager();
    $uid = $ich['id'];
    $tok = (string)($d['token'] ?? '');
    if (!hash_equals($l->spiel_token($uid), $tok)) json_antwort(409, ['fehler' => 'anderswo geöffnet']);
    $jetzt = time();
    $l->online($uid, $jetzt + 20);
    if (isset($d['profil']) && is_string($d['profil']) && strlen($d['profil']) < 2000000) $l->profil_setzen($uid, $d['profil']);
    foreach ((array)($d['befehle'] ?? []) as $b) $l->befehl_ablegen($uid, json_encode($b, JSON_UNESCAPED_UNICODE));

    $l->welt_sperren();
    $i = $l->welt_info();
    $bin_leiter = (int)$i['leiter_id'] === $uid && hash_equals((string)$i['leiter_token'], $tok) && (int)$i['leiter_bis'] >= $jetzt;
    $antwort = [];
    if ($bin_leiter && isset($d['welt'])) {   // nur der Weltrechner darf die Welt schreiben
        $w = $d['welt'];
        $setzen = [];
        foreach ((array)($w['setzen'] ?? []) as $k => $v) if (is_string($k) && preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k) && is_string($v)) $setzen[$k] = $v;
        $loeschen = array_values(array_filter((array)($w['loeschen'] ?? []), function ($k) { return is_string($k) && preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k); }));
        if ($setzen || $loeschen) $l->welt_schreiben($setzen, $loeschen, (int)($w['welt_zeit'] ?? 0));
        foreach ((array)($d['ereignisse'] ?? []) as $e) if (isset($e['an'], $e['e']) && (int)$e['an'] > 0) $l->ereignis_ablegen((int)$e['an'], json_encode($e['e'], JSON_UNESCAPED_UNICODE));
    }
    $neu_leiter = false;
    if ($bin_leiter || (int)$i['leiter_bis'] < $jetzt) {   // Weltrechner bleiben oder freien Platz übernehmen
        $neu_leiter = !$bin_leiter;
        $l->leiter_setzen($uid, $tok, $jetzt + LEITER_SEK);
        $bin_leiter = true;
    }
    $seit = (int)($d['seit'] ?? 0);
    $antwort['welt'] = $l->welt_seit($bin_leiter && !$neu_leiter ? PHP_INT_MAX : $seit);   // der Weltrechner hat schon alles
    if ($bin_leiter && !$neu_leiter) { $antwort['welt']['setzen'] = new stdClass; $antwort['welt']['loeschen'] = []; }
    if ($bin_leiter) $antwort['befehle'] = $l->befehle_abholen();
    $l->welt_entsperren();
    $antwort['leiter'] = $bin_leiter;
    $antwort['neu_leiter'] = $neu_leiter;
    $antwort['version'] = $antwort['welt']['version'];
    $antwort['ereignisse'] = $l->ereignisse_abholen($uid);
    $antwort['spieler'] = $l->spieler_liste((int)($d['spieler_seit'] ?? 0));
    $antwort['zeit'] = $jetzt;
    welt_antwort($antwort);
}
// Antwort gepackt, wenn der Browser das kann (Welt-Teile sind groß)
function welt_antwort($a) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $j = json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strpos($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip') !== false && strlen($j) > 2000) { header('Content-Encoding: gzip'); $j = gzencode($j, 5); }
    echo $j;
    exit;
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) speichern_anfrage();
