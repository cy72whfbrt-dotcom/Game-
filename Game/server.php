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

// ===== Der Weltrechner auf dem Server (weltrechner/start.js) =====
// Er meldet sich mit einem geheimen Schlüssel (Kopfzeile X-Weltrechner), nicht mit einem Login. Der Schlüssel wird aus dem
// Datenbank-Passwort abgeleitet (steht nirgends sonst); wachhund.php gibt ihn beim Start mit. Nur er rechnet die Welt –
// niemals das Gerät eines Spielers (Regel von Alexander).
function weltrechner_schluessel() { return hash_hmac('sha256', 'open-water-weltrechner', (string)(cfg()['db_pass'] ?? '')); }
function system_zugang() {
    $k = (string)($_SERVER['HTTP_X_WELTRECHNER'] ?? '');
    if ($k === '' || !hash_equals(weltrechner_schluessel(), $k)) return null;
    return ['id' => 0, 'name' => 'Weltrechner', 'login' => '', 'anzeigename' => null, 'system' => true];
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

// ===== Sicherheit =====
// Sicherheits-Kopfzeilen für jede Seite (keine fremden Rahmen, kein Rätselraten beim Dateityp, keine Herkunft nach außen)
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// Admins (dürfen admin.php benutzen und auch während der Wartung spielen): feste Spieler-Nummern aus config.php
// ('admin_ids'), nicht Namen – einen Namen könnte sich sonst jemand anderes registrieren.
function ist_admin($ich) {
    if (!$ich) return false;
    $ids = array_map('intval', (array)(cfg()['admin_ids'] ?? []));
    return in_array((int)$ich['id'], $ids, true);
}
// Wartung (neue Version wird hochgeladen): solange die Datei wartung.txt da ist, kommt NIEMAND ins Spiel (auch kein Admin;
// Admins können sie in admin.php beenden)
const WARTUNG_DATEI = __DIR__ . '/wartung.txt';
function wartung() { return is_file(WARTUNG_DATEI); }

// Nichts mit < oder > in Daten, die andere Spieler zu sehen bekommen (kein eingeschleuster Code)
function sauber($v, $tiefe = 0) {
    if ($tiefe > 40) return false;
    if (is_string($v)) return strpbrk($v, '<>') === false;
    if (is_array($v) || is_object($v)) { foreach ($v as $k => $x) if ((is_string($k) && strpbrk($k, '<>') !== false) || !sauber($x, $tiefe + 1)) return false; }
    return true;
}
function sauber_json($text) { if (!is_string($text) || strpbrk($text, '<>') === false) return true; return false; }

// Zu viele Versuche (Passwort raten, Massen-Anmeldungen): höchstens $max in $sek Sekunden pro Schlüssel
function bremse($schluessel, $max, $sek) {
    return lager()->bremse(hash('sha256', $schluessel), $max, $sek);
}
// Profil eines Spielers (sehen alle anderen): wird komplett neu aufgebaut – nur bekannte Felder, Zahlen als Zahlen,
// Kennungen nur aus Buchstaben/Ziffern/_/- (nichts, was anderswo Code einschleusen könnte)
function profil_bereinigen($text) {
    $p = json_decode((string)$text, true, 12);
    if (!is_array($p)) return null;
    $id = function ($v) { return is_string($v) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $v) ? $v : null; };
    $zahl = function ($v, $max = 1e30) { return is_numeric($v) && is_finite((float)$v) ? max(-$max, min($max, $v + 0)) : 0; };
    $karte = function ($v, $wert, $max = 80) use ($id) { $r = []; if (is_array($v)) foreach ($v as $k => $x) { if (count($r) >= $max) break; if ($id((string)$k) !== null) $r[(string)$k] = $wert($x); } return (object)$r; };
    $liste = function ($v) use ($id) { $r = []; if (is_array($v)) foreach (array_slice($v, 0, 60) as $x) if ($id($x) !== null) $r[] = $x; return $r; };
    $gear = [];
    foreach (['weapon', 'armor', 'shield', 'boots'] as $sl) { $g = $p['gear'][$sl] ?? null; $gear[$sl] = is_array($g) ? ['r' => (int)$zahl($g['r'] ?? 0, 9), 'lvl' => (int)$zahl($g['lvl'] ?? 1, 999), 'st' => (int)$zahl($g['st'] ?? 0, 99)] : null; }
    $hs = $karte($p['hs'] ?? [], function ($h) use ($zahl) { $h = is_array($h) ? $h : [];
        $sk = []; foreach (array_slice((array)($h['sk'] ?? []), 0, 4) as $x) $sk[] = (int)$zahl($x, 99);
        return ['sh' => (int)$zahl($h['sh'] ?? 0, 1e9), 'q' => (int)$zahl($h['q'] ?? 0, 99), 'own' => !empty($h['own']), 'sk' => $sk, 'rage' => $zahl($h['rage'] ?? 0, 1e6)]; }, 40);
    $lk = is_array($p['look'] ?? null) ? $p['look'] : [];
    $cr = is_array($p['crest'] ?? null) ? $p['crest'] : null;
    $bs = is_array($p['baustil'] ?? null) ? $p['baustil'] : null;
    return json_encode([
        'lvl' => (int)$zahl($p['lvl'] ?? 1, 10000),
        'skills' => $karte($p['skills'] ?? [], function ($x) use ($zahl) { return (int)$zahl($x, 100000); }, 20),
        'gear' => $gear,
        'city' => ['levels' => $karte($p['city']['levels'] ?? [], function ($x) use ($zahl) { return (int)$zahl($x, 1000); }, 20)],
        'wounded' => $zahl($p['wounded'] ?? 0),
        'hs' => $hs,
        'shieldUntil' => $zahl($p['shieldUntil'] ?? 0), 'neuBis' => $zahl($p['neuBis'] ?? 0),
        'look' => ['ring' => $id($lk['ring'] ?? null), 'rings' => $liste($lk['rings'] ?? []), 'march' => $id($lk['march'] ?? null), 'marchs' => $liste($lk['marchs'] ?? []),
                   'frame' => $id($lk['frame'] ?? null), 'title' => $id($lk['title'] ?? null), 'throne' => !empty($lk['throne'])],
        'stats' => $karte($p['stats'] ?? [], function ($x) use ($zahl) { return $zahl($x); }, 80),
        'earned' => $zahl($p['earned'] ?? 0), 'coins' => $zahl($p['coins'] ?? 0),
        'crest' => $cr ? array_map(function ($k) use ($cr, $zahl) { return (int)$zahl($cr[$k] ?? 0, 99); }, ['shape' => 'shape', 'div' => 'div', 'c1' => 'c1', 'c2' => 'c2', 'sym' => 'sym', 'ink' => 'ink']) : null,
        'baustil' => $bs ? ['style' => $id($bs['style'] ?? null) ?: 'klassisch', 'cap' => ($bs['cap'] ?? '') === 'wasser' ? 'wasser' : 'huegel'] : null,
    ], JSON_UNESCAPED_UNICODE);
}
// Einen Flicken auf einen Welt-Teil anwenden (Objekte, nicht Arrays – leere {} bleiben {}):
//   s: {Eintrag: neuer Wert}   w: [Einträge, die wegfallen]   d: {Eintrag: {s: {Feld: Wert}, w: [Felder]}} (eine Ebene tiefer)
function flicken_anwenden($obj, $p) {
    foreach ((array)($p->s ?? []) as $k => $v) $obj->{$k} = $v;
    foreach ((array)($p->w ?? []) as $k) unset($obj->{$k});
    foreach ((array)($p->d ?? []) as $k => $sub) {
        if (!isset($obj->{$k}) || !is_object($obj->{$k}) || !is_object($sub)) return false;
        foreach ((array)($sub->s ?? []) as $kk => $vv) $obj->{$k}->{$kk} = $vv;
        foreach ((array)($sub->w ?? []) as $kk) unset($obj->{$k}->{$kk});
    }
    return true;
}
// Nachrichten, die der Weltrechner an andere schicken darf (Geschenke nur über admin.php)
const WELTRECHNER_NACHRICHTEN = ['delta', 'bericht', 'startschild'];

function client_ip() { return (string)($_SERVER['REMOTE_ADDR'] ?? '?'); }

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
    if ($sys = system_zugang()) return weltrechner_seite($sys);
    try {
        $ich = aktueller_spieler();
        if (!$ich) { header('Location: ./'); exit; }
        if (wartung()) { header('Location: ./'); exit; }   // Wartung: niemand kommt ins Spiel (auch kein Admin) – zurück zur Startseite
        // Gerade noch gespielt (Neuladen)? Dann auf den "Abschied" des alten Fensters warten (seine letzte Sicherung),
        // höchstens 8 Sekunden - so lädt die neue Seite nie einen älteren Stand.
        $altTok = lager()->spiel_token($ich['id']);
        $uebernehmen = ($_GET['weiter'] ?? '') === '1';   // "Hier weiterspielen": sofort übernehmen (das andere Gerät fliegt raus)
        if (!$uebernehmen && $altTok !== '' && time() - lager()->zuletzt_gespeichert($ich['id']) < 60) {
            for ($i = 0; $i < 20 && lager()->abschied($ich['id']) !== $altTok; $i++) usleep(100000);
        }
        lager()->sperren($ich['id']);
        // Wer hier zuletzt das Spiel öffnet, darf speichern - ein älterer Tab/anderes Gerät wird gestoppt.
        $tok = bin2hex(random_bytes(16));
        lager()->spiel_token_setzen($ich['id'], $tok);
        $stand = lager()->stand_laden($ich['id']);
        // die EINE Welt: ganzer Stand und alle Spieler. Rechnen tut sie nur der Weltrechner auf dem Server – nie ein Spieler.
        lager()->welt_sperren();
        $leiter = false;
        $welt = lager()->welt_seit(0);
        lager()->welt_entsperren();
        $spieler = lager()->spieler_liste(0);
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
    $ow = json_encode([
        'stand' => (object)$stand, 'neu' => $neu, 'token' => $tok, 'name' => $ich['name'],
        'uid' => (int)$ich['id'], 'leiter' => $leiter, 'welt' => $welt, 'spieler' => $spieler,
        'nameGewaehlt' => !empty($ich['anzeigename']), 'admin' => ist_admin($ich),
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($ow === false) { http_response_code(503); exit('Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.'); }
    return '<script>window.__OW = ' . $ow . ';</script>'
        . '<script src="speichern.js?v=' . filemtime(__DIR__ . '/speichern.js') . '"></script>';
}
// Die Spielseite für den Weltrechner: kein eigener Spielstand, keine Basis – nur die Welt und alle Spieler
function weltrechner_seite($sys) {
    if (wartung()) { http_response_code(503); exit('wartung'); }
    try {
        $tok = bin2hex(random_bytes(16));
        lager()->welt_sperren();
        $wi = lager()->welt_info();
        if ((int)$wi['leiter_id'] === 0 && (int)$wi['leiter_bis'] >= time() && $wi['leiter_token'] !== '') { lager()->welt_entsperren(); http_response_code(409); exit('läuft schon'); }   // nie zwei Weltrechner
        lager()->leiter_setzen(0, $tok, time() + 30);
        $welt = lager()->welt_seit(0);
        lager()->welt_entsperren();
        $spieler = lager()->spieler_liste(0);
    } catch (Throwable $e) { http_response_code(503); exit('datenbank'); }
    $ow = json_encode(['stand' => ['openWaterReset' => '1'], 'neu' => false, 'token' => $tok, 'name' => 'Weltrechner', 'uid' => 0, 'leiter' => true, 'system' => true,
        'welt' => $welt, 'spieler' => $spieler, 'nameGewaehlt' => true, 'admin' => false],
        JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    return '<script>window.__OW = ' . $ow . ';</script>'
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
        // Bremse gegen zu viele Versuche (Passwort raten, Massen-Anmeldungen)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_bremse (
            schluessel CHAR(64) PRIMARY KEY,
            anzahl INT UNSIGNED NOT NULL DEFAULT 0,
            seit INT UNSIGNED NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
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
        // Änderungen der Welt („Flicken“): der Weltrechner schickt bei großen Teilen nur, was sich geändert hat. Die Spieler
        // bekommen dann auch nur diese Änderungen (statt jedes Mal den ganzen Teil). Gemerkt werden die letzten ~600 Versionen.
        // flicken = NULL: in dieser Version wurde der Teil ganz neu geschrieben (dann bekommt man ihn ganz).
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_welt_flicken (
            version BIGINT UNSIGNED NOT NULL,
            schluessel VARCHAR(100) NOT NULL,
            flicken MEDIUMTEXT NULL,
            PRIMARY KEY (version, schluessel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Sicherungen der Welt (wachhund.php: jede Stunde eine, die letzten 48 bleiben; Admin kann zurückspielen)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_sicherungen (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            groesse INT UNSIGNED NOT NULL DEFAULT 0,
            daten LONGBLOB NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        // Übersicht in der Spieler-Tabelle (zum Anschauen in phpMyAdmin)
        $da = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'")->fetchAll(PDO::FETCH_COLUMN);
        $neu = ['stufe' => 'INT NULL', 'muenzen' => 'DOUBLE NULL', 'gems' => 'DOUBLE NULL', 'anzahl_basen' => 'INT NULL', 'zuletzt_gespeichert' => 'DATETIME NULL', 'abschied' => "CHAR(32) NOT NULL DEFAULT ''",
                'profil' => 'MEDIUMTEXT NULL', 'profil_zeit' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'online_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'anzeigename' => 'VARCHAR(20) NULL'];
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
        $q = $this->db->prepare('SELECT s.id, s.name, s.anzeigename FROM ow_sitzungen z JOIN ow_spieler s ON s.id = z.spieler_id WHERE z.token_hash = ? AND z.ablauf > ?');
        $q->execute([$th, time()]);
        $r = $q->fetch();
        return $r ? ['id' => (int)$r['id'], 'name' => $r['anzeigename'] ?: $r['name'], 'login' => $r['name'], 'anzeigename' => $r['anzeigename']] : null;
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
        $this->bots_einige($uid, $sp, $obj);
    }
    private function bots_einige($uid, $sp, $obj) {
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
    // Nur die geänderten Mitspieler-Zeilen schreiben (statt alle 150 neu): $obj = der ganze neue Teil, $p = der Flicken
    private function bots_teilweise($uid, $sp, $obj, $p) {
        $ids = array_merge(array_keys((array)($p->s ?? [])), array_keys((array)($p->d ?? [])));
        if ($ids) { $teil = new stdClass; foreach ($ids as $id) if (property_exists($obj, (string)$id)) $teil->{$id} = $obj->{$id}; $this->bots_einige($uid, $sp, $teil); }
        foreach ((array)($p->w ?? []) as $id) {
            $extra = $sp === 'basen' ? ', anzahl_basen = NULL' : ($sp === 'zustand' ? ', stufe = NULL' : '');
            $this->db->prepare("UPDATE ow_bots SET $sp = NULL$extra WHERE spieler_id = ? AND bot_id = ?")->execute([$uid, (string)$id]);
        }
        $this->db->prepare('DELETE FROM ow_bots WHERE spieler_id = ? AND zustand IS NULL AND muenzen IS NULL AND basen IS NULL')->execute([$uid]);
    }
    // true = noch erlaubt (und mitgezählt), false = zu viele Versuche
    function bremse($k, $max, $sek) {
        $jetzt = time();
        $this->db->prepare('DELETE FROM ow_bremse WHERE seit < ?')->execute([$jetzt - 86400]);
        $q = $this->db->prepare('SELECT anzahl, seit FROM ow_bremse WHERE schluessel = ?'); $q->execute([$k]); $r = $q->fetch();
        if (!$r || $r['seit'] < $jetzt - $sek) { $this->db->prepare('REPLACE INTO ow_bremse (schluessel, anzahl, seit) VALUES (?, 1, ?)')->execute([$k, $jetzt]); return true; }
        if ((int)$r['anzahl'] >= $max) return false;
        $this->db->prepare('UPDATE ow_bremse SET anzahl = anzahl + 1 WHERE schluessel = ?')->execute([$k]);
        return true;
    }
    function bremse_frei($k) { $this->db->prepare('DELETE FROM ow_bremse WHERE schluessel = ?')->execute([$k]); }
    // Anzeigename: frei, wenn ihn kein anderer Spieler als Login- oder Anzeigenamen hat
    function name_frei($uid, $name) {
        $q = $this->db->prepare('SELECT COUNT(*) FROM ow_spieler WHERE id <> ? AND (name = ? OR anzeigename = ?)');
        $q->execute([$uid, $name, $name]);
        return !(int)$q->fetchColumn();
    }
    function anzeigename_setzen($uid, $name) { $this->db->prepare('UPDATE ow_spieler SET anzeigename = ? WHERE id = ?')->execute([$name, $uid]); }
    function alle_spieler() { return $this->db->query('SELECT id, name, anzeigename, stufe, muenzen, gems, anzahl_basen, online_bis, erstellt FROM ow_spieler ORDER BY id')->fetchAll(); }

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
    // $flicken: [schluessel => Flicken-Text] – nur die Änderungen eines großen Teils (siehe flicken_anwenden).
    // Gibt die Version zurück und in $voll die Teile, deren Flicken nicht passte (die soll der Weltrechner ganz schicken).
    function welt_schreiben($setzen, $loeschen, $welt_zeit, $flicken = [], &$voll = []) {
        $i = $this->welt_info();
        $v = (int)$i['version'] + 1;
        $vs = $i['versionen'];
        $voll = []; $gemerkt = [];
        foreach ($setzen as $k => $_) { $vs[$k] = $v; $gemerkt[$k] = null; }   // ganz geschrieben
        foreach ($loeschen as $k) { $vs[$k] = $v; $gemerkt[$k] = null; }
        if ($flicken) {
            $alt = $this->stand_laden(0, array_keys($flicken));
            foreach ($flicken as $k => $text) {
                $p = json_decode($text);
                $obj = isset($alt[$k]) ? json_decode($alt[$k]) : null;
                if (!is_object($p) || !is_object($obj) || !flicken_anwenden($obj, $p)) { $voll[] = $k; continue; }
                $neu = json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
                if ($neu === false || !sauber_json($neu)) { $voll[] = $k; continue; }
                if ($k === 'openWaterBotOwnedIslands') $basenNeu = $obj;
                if (isset(self::BOT_TEILE[$k])) $this->bots_teilweise(0, self::BOT_TEILE[$k], $obj, $p);   // nur geänderte Zeilen
                else $setzen[$k] = $neu;
                $vs[$k] = $v; $gemerkt[$k] = $text;
            }
        }
        $this->stand_schreiben(0, $setzen, $loeschen);
        $f = $this->db->prepare('INSERT INTO ow_welt_flicken (version, schluessel, flicken) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE flicken = VALUES(flicken)');
        foreach ($gemerkt as $k => $text) $f->execute([$v, $k, $text]);
        if ($v % 50 === 0) $this->db->prepare('DELETE FROM ow_welt_flicken WHERE version < ?')->execute([$v - 600]);
        if (isset($setzen['openWaterBotOwnedIslands']) || isset($basenNeu)) {   // Übersicht: Basen jedes echten Spielers in ow_spieler
            $b = isset($basenNeu) ? json_decode(json_encode($basenNeu), true) : (json_decode($setzen['openWaterBotOwnedIslands'], true) ?: []);
            $q = $this->db->prepare('UPDATE ow_spieler SET anzahl_basen = ? WHERE id = ?');
            foreach ($b as $wer => $liste) if (preg_match('/^u(\d+)$/', $wer, $m)) $q->execute([is_array($liste) ? count($liste) : 0, (int)$m[1]]);
        }
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
    // Für die Spieler: wie welt_seit, aber große Teile nur als Änderungen („flicken“: [Teil => [Flicken-Texte der Reihe nach]]),
    // wenn alle Änderungen seit $seit noch gemerkt sind – sonst der ganze Teil.
    function welt_seit_flicken($seit) {
        $i = $this->welt_info();
        $neu = []; foreach ($i['versionen'] as $k => $v) if ($v > $seit) $neu[] = $k;
        $flicken = []; $ganz = $neu;
        if ($seit > 0 && $neu && $seit >= (int)$i['version'] - 590) {
            $in = implode(',', array_fill(0, count($neu), '?'));
            $q = $this->db->prepare("SELECT version, schluessel, flicken FROM ow_welt_flicken WHERE version > ? AND schluessel IN ($in) ORDER BY version");
            $q->execute(array_merge([(int)$seit], $neu));
            $liste = []; $kaputt = [];
            foreach ($q as $z) { if ($z['flicken'] === null) $kaputt[$z['schluessel']] = true; else $liste[$z['schluessel']][] = $z['flicken']; }
            $ganz = [];
            foreach ($neu as $k) { if (isset($kaputt[$k]) || empty($liste[$k])) $ganz[] = $k; else $flicken[$k] = $liste[$k]; }
        }
        $teile = $this->stand_laden(0, $ganz);
        $weg = []; foreach ($ganz as $k) if (!isset($teile[$k])) $weg[] = $k;
        return ['version' => (int)$i['version'], 'setzen' => (object)$teile, 'flicken' => (object)$flicken, 'loeschen' => $weg, 'welt_zeit' => (int)$i['welt_zeit']];
    }
    // wie viele Teile hätte der Spielstand mit diesen neuen Schlüsseln? (Schutz gegen Müll-Schlüssel)
    function anzahl_teile($uid, $neu) {
        $q = $this->db->prepare("SELECT schluessel FROM ow_spielstand WHERE spieler_id = ?"); $q->execute([$uid]);
        $da = array_flip($q->fetchAll(PDO::FETCH_COLUMN));
        foreach ($neu as $k) $da[$k] = 1;
        return count($da);
    }
    // ===== Sicherungen der Welt =====
    function sicherung_anlegen() {
        $sp = $this->db->query('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = 0')->fetchAll();
        $bo = $this->db->query('SELECT bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand FROM ow_bots WHERE spieler_id = 0')->fetchAll();
        if (!$sp) return 0;
        $gz = gzencode(json_encode(['spielstand' => $sp, 'bots' => $bo], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 6);
        $this->db->prepare('INSERT INTO ow_sicherungen (groesse, daten) VALUES (?, ?)')->execute([strlen($gz), $gz]);
        $id = (int)$this->db->lastInsertId();
        $this->db->exec('DELETE FROM ow_sicherungen WHERE id <= ' . ($id - 48));   // die letzten 48 bleiben
        return $id;
    }
    function letzte_sicherung_zeit() { return (int)$this->db->query('SELECT UNIX_TIMESTAMP(MAX(erstellt)) FROM ow_sicherungen')->fetchColumn(); }
    function sicherungen_liste() { return $this->db->query('SELECT id, erstellt, groesse FROM ow_sicherungen ORDER BY id DESC')->fetchAll(); }
    // Eine Sicherung zurückspielen (der Weltrechner muss dafür aus sein). Alle Teile bekommen eine neue Version → alle laden neu.
    function sicherung_zurueck($id) {
        $q = $this->db->prepare('SELECT daten FROM ow_sicherungen WHERE id = ?'); $q->execute([(int)$id]);
        $d = json_decode((string)@gzdecode((string)$q->fetchColumn()), true);
        if (!is_array($d) || empty($d['spielstand'])) return false;
        $this->welt_sperren();
        $this->db->beginTransaction();
        $this->db->exec('DELETE FROM ow_spielstand WHERE spieler_id = 0');
        $this->db->exec('DELETE FROM ow_bots WHERE spieler_id = 0');
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (0, ?, ?)');
        foreach ($d['spielstand'] as $z) $s->execute([$z['schluessel'], $z['wert']]);
        $b = $this->db->prepare('INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES (0, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($d['bots'] as $z) $b->execute([$z['bot_id'], $z['nr'], $z['stufe'], $z['muenzen'], $z['anzahl_basen'], $z['basen'], $z['zustand']]);
        $i = $this->welt_info(); $v = (int)$i['version'] + 1; $vs = [];
        foreach ($d['spielstand'] as $z) if ($z['schluessel'] !== '_bot_teile') $vs[$z['schluessel']] = $v;
        foreach (array_keys(self::BOT_TEILE) as $k) $vs[$k] = $v;
        foreach ($i['versionen'] as $k => $_) if (!isset($vs[$k])) $vs[$k] = $v;   // was es damals nicht gab: wird gelöscht
        $this->db->prepare('UPDATE ow_welt_info SET version = ?, versionen = ?, leiter_bis = 0 WHERE id = 1')->execute([$v, json_encode($vs)]);
        $this->db->commit();
        $this->welt_entsperren();
        return true;
    }
    function aufraeumen() {   // alte Befehle (niemand hat gerechnet) und nie abgeholte Nachrichten
        $this->db->exec('DELETE FROM ow_befehle WHERE erstellt < NOW() - INTERVAL 1 DAY');
        $this->db->exec('DELETE FROM ow_ereignisse WHERE erstellt < NOW() - INTERVAL 60 DAY');
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
        $q = $this->db->prepare('SELECT id, COALESCE(anzeigename, name) name, online_bis, profil_zeit, IF(profil_zeit > ?, profil, NULL) profil FROM ow_spieler');
        $q->execute([(int)$seit]);
        return array_map(function ($z) { return ['id' => (int)$z['id'], 'name' => $z['name'], 'online' => (int)$z['online_bis'] > time(), 'profil_zeit' => (int)$z['profil_zeit'], 'profil' => $z['profil'] !== null ? json_decode($z['profil'], false, 12) : null]; }, $q->fetchAll());
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
        $ich = system_zugang() ?: aktueller_spieler();
        if (!$ich) json_antwort(401, ['fehler' => 'abgemeldet']);

        $roh = file_get_contents('php://input', false, null, 0, 8 * 1024 * 1024);
        if (($_SERVER['HTTP_X_GEPACKT'] ?? '') === '1') {
            $roh = @gzdecode($roh, 24 * 1024 * 1024);
            if ($roh === false) json_antwort(400, ['fehler' => 'kaputt']);
        }
        $d = json_decode($roh, true);
        if (!is_array($d)) json_antwort(400, ['fehler' => 'kaputt']);

        $aktion = (string)($d['aktion'] ?? '');
        if (!empty($ich['system']) && $aktion !== 'puls') json_antwort(200, ['ok' => true]);   // der Weltrechner hat keinen eigenen Spielstand
        if ($aktion === 'name') name_anfrage($ich, $d);
        if ($aktion === 'puls') { if (wartung()) json_antwort(503, ['fehler' => 'wartung']); welt_puls($ich, $d); }   // Wartung gilt für alle
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
        if (count($setzen) > 150 || count($loeschen) > 150) json_antwort(400, ['fehler' => 'zu viel']);
        foreach ($setzen as $v) if (strlen($v) > 6 * 1024 * 1024) json_antwort(400, ['fehler' => 'zu groß']);
        if (lager()->anzahl_teile($ich['id'], array_keys($setzen)) > 150) json_antwort(400, ['fehler' => 'zu viele Teile']);
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

// ===== Spielername wählen (Willkommen-Fenster) =====
function name_anfrage($ich, $d) {
    $l = lager();
    if (!hash_equals($l->spiel_token($ich['id']), (string)($d['token'] ?? ''))) json_antwort(409, ['fehler' => 'anderswo geöffnet']);
    $name = trim(preg_replace('/\s+/u', ' ', (string)($d['name'] ?? '')));
    if (!preg_match('/^[\p{L}\p{N} _.-]{3,20}$/u', $name)) json_antwort(200, ['ok' => false, 'grund' => 'Der Name braucht 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).']);
    if (!bremse('name:' . $ich['id'], 10, 3600)) json_antwort(200, ['ok' => false, 'grund' => 'Zu viele Versuche – bitte später nochmal.']);
    if (!$l->name_frei($ich['id'], $name)) json_antwort(200, ['ok' => false, 'grund' => 'Diesen Namen hat schon jemand.']);
    $l->anzeigename_setzen($ich['id'], $name);
    json_antwort(200, ['ok' => true, 'name' => $name]);
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
    $sys = !empty($ich['system']);
    $tok = (string)($d['token'] ?? '');
    if (!$sys && !hash_equals($l->spiel_token($uid), $tok)) json_antwort(409, ['fehler' => 'anderswo geöffnet']);
    $jetzt = time();
    if (!$sys) $l->online($uid, $jetzt + 20);
    // Zur Sicherheit (falls der Cronjob fehlt): ist ein Spieler da und der Weltrechner schlägt nicht mehr, schaut der Wachhund nach
    if (!$sys && $jetzt - (int)@filemtime(__DIR__ . '/weltrechner/herz.php') > 60 && $jetzt - (int)@filemtime(__DIR__ . '/weltrechner/zustand.php') > 30 && is_file(__DIR__ . '/weltrechner/wachhund.php')) {
        try { require_once __DIR__ . '/weltrechner/wachhund.php'; wachhund_runde('spieler'); } catch (Throwable $e) { error_log('Open Water Wachhund: ' . $e->getMessage()); }
    }
    if (!$sys && isset($d['profil']) && is_string($d['profil']) && strlen($d['profil']) < 400000 && ($pr = profil_bereinigen($d['profil'])) !== null && $pr !== false) $l->profil_setzen($uid, $pr);
    if (!$sys) foreach (array_slice((array)($d['befehle'] ?? []), 0, 60) as $b) if (is_array($b) && sauber($b)) { $j = json_encode($b, JSON_UNESCAPED_UNICODE); if ($j !== false && strlen($j) < 20000) $l->befehl_ablegen($uid, $j); }

    $l->welt_sperren();
    $i = $l->welt_info();
    // Rechnen darf nur der Weltrechner auf dem Server (uid 0, mit seinem Zeichen) – nie ein Spieler
    $bin_leiter = $sys && (int)$i['leiter_id'] === 0 && hash_equals((string)$i['leiter_token'], $tok);
    if ($sys && !$bin_leiter && (int)$i['leiter_id'] === 0 && (int)$i['leiter_bis'] >= $jetzt) { $l->welt_entsperren(); json_antwort(409, ['fehler' => 'ein anderer Weltrechner läuft']); }
    $antwort = [];
    if ($bin_leiter && isset($d['welt'])) {   // nur der Weltrechner darf die Welt schreiben
        $w = $d['welt'];
        $setzen = [];
        foreach ((array)($w['setzen'] ?? []) as $k => $v) if (is_string($k) && preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k) && is_string($v) && sauber_json($v)) $setzen[$k] = $v;
        $loeschen = array_values(array_filter((array)($w['loeschen'] ?? []), function ($k) { return is_string($k) && preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k); }));
        $flicken = [];   // nur Änderungen großer Teile (als Text, damit {} und [] erhalten bleiben)
        foreach ((array)($w['flicken'] ?? []) as $k => $t) if (is_string($k) && preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k) && is_string($t) && strlen($t) < 6 * 1024 * 1024 && sauber_json($t)) $flicken[$k] = $t;
        if ($setzen && $l->anzahl_teile(0, array_keys($setzen)) > 80) $setzen = [];   // die Welt hat nur eine feste Zahl Teile
        $voll = [];
        if ($setzen || $loeschen || $flicken) $l->welt_schreiben($setzen, $loeschen, (int)($w['welt_zeit'] ?? 0), $flicken, $voll);
        if ($voll) $antwort['welt_voll'] = $voll;   // diese Teile beim nächsten Mal ganz schicken
        if (mt_rand(1, 500) === 1) $l->aufraeumen();
        foreach (array_slice((array)($d['ereignisse'] ?? []), 0, 500) as $e) if (isset($e['an'], $e['e']) && (int)$e['an'] > 0 && is_array($e['e']) && in_array($e['e']['art'] ?? '', WELTRECHNER_NACHRICHTEN, true) && sauber($e['e'])) {
            $j = json_encode($e['e'], JSON_UNESCAPED_UNICODE); if ($j !== false && strlen($j) < 200000) $l->ereignis_ablegen((int)$e['an'], $j); }
    }
    $neu_leiter = false;
    if ($sys) {   // Weltrechner bleibt (oder übernimmt nach einem Neustart)
        $neu_leiter = !$bin_leiter;
        $l->leiter_setzen(0, $tok, $jetzt + LEITER_SEK);
        $bin_leiter = true;
    }
    $seit = (int)($d['seit'] ?? 0);
    $antwort['welt'] = $bin_leiter ? $l->welt_seit($neu_leiter ? $seit : PHP_INT_MAX) : $l->welt_seit_flicken($seit);   // der Weltrechner hat schon alles; Spieler bekommen nur Änderungen
    if ($bin_leiter && !$neu_leiter) { $antwort['welt']['setzen'] = new stdClass; $antwort['welt']['loeschen'] = []; }
    if ($bin_leiter) $antwort['befehle'] = $l->befehle_abholen();
    $l->welt_entsperren();
    $antwort['leiter'] = $bin_leiter;
    $antwort['rechner'] = $bin_leiter || ((int)$i['leiter_id'] === 0 && (int)$i['leiter_bis'] >= $jetzt);   // läuft der Weltrechner? (sonst: „Verbindung wird wiederhergestellt …“)
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
