// Teil 01-grundlagen-login.php: Einstellungen, Cookie, Weltrechner-Zugang, Login/Abmelden
<?php
// ===== server.php – alles auf dem Server: Datenbank, Login, Spielstand laden und speichern =====
// Wird von index.php und spiel.php eingebunden. Direkt aufgerufen (POST von speichern.js) speichert es den Spielstand.
// Im Browser liegt nur der Login-Cookie (HttpOnly, 30 Tage) - alles andere steht hier in der Datenbank.

ini_set('serialize_precision', '-1');   // Kommazahlen exakt wie im Browser
ini_set('display_errors', '0');         // nie Pfade, SQL oder Werte im Browser zeigen – nur ins Fehlerprotokoll
ini_set('log_errors', '1');
// Unerwarteter Fehler irgendwo: ins Protokoll, im Browser nur ein neutraler Satz (nie Pfade, SQL oder Werte)
set_exception_handler(function ($e) { error_log('Open Water: ' . get_class($e) . ' ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine());
    if (!headers_sent()) http_response_code(500); echo 'Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.'; });

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
// Er meldet sich mit einem geheimen Schlüssel (Kopfzeile X-Weltrechner), nicht mit einem Login; wachhund.php gibt ihn beim Start mit. Nur er rechnet die Welt –
// niemals das Gerät eines Spielers (Regel von Alexander).
// Eigener Zufalls-Schlüssel aus config.php (hochladen.sh erzeugt bei jedem Hochladen einen neuen). Nur lokal zum Testen
// ohne ihn: aus dem DB-Passwort abgeleitet.
function weltrechner_schluessel() {
    $k = (string)(cfg()['wr_schluessel'] ?? '');
    return strlen($k) >= 32 ? $k : hash_hmac('sha256', 'open-water-weltrechner', (string)(cfg()['db_pass'] ?? ''));
}
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

function sitzung_hash() { $t = $_COOKIE[COOKIE_NAME] ?? ''; return is_string($t) && preg_match('/^[a-f0-9]{64}$/', $t) ? hash('sha256', $t) : ''; }
function abmelden() {
    $h = sitzung_hash();
    if ($h !== '') { lager()->push_weg_sitzung($h); lager()->sitzung_loeschen($h); }   // (die Handy-Nachrichten dieses Geräts hören auch auf – Alexander 5.10.)
    setze_cookie('', time() - 3600);
}
