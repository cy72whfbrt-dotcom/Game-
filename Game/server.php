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

// ===== Sicherheit =====
// Sicherheits-Kopfzeilen für jede Seite (keine fremden Rahmen, kein Rätselraten beim Dateityp, keine Herkunft nach außen)
header('X-Frame-Options: DENY');                                    // nie in einem fremden (oder Office-)Rahmen
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Strict-Transport-Security: max-age=31536000');               // immer HTTPS, auch beim ersten Aufruf
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
// Nur eigene Dateien + Google-Schriften; Daten gehen nur an den eigenen Server (kein Abfluss nach außen)
// Skripte nur aus eigenen Dateien und den eigenen Inline-Skripten mit der Nonce dieser Seite (csp_nonce()) – ein
// eingeschleustes <script> oder onclick=… liefe nicht ('unsafe-inline' gibt es nur noch für Styles)
function csp_nonce() { static $n = null; if ($n === null) $n = base64_encode(random_bytes(16)); return $n; }
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-" . csp_nonce() . "'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

// Admins (dürfen admin.php benutzen; während der Wartung kommen auch sie nicht ins Spiel): feste Spieler-Nummern aus config.php
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
function sauber_json($text) { return is_string($text) && strpbrk($text, '<>') === false; }

// Zu viele Versuche (Passwort raten, Massen-Anmeldungen): höchstens $max in $sek Sekunden pro Schlüssel
function bremse($schluessel, $max, $sek) {
    return lager()->bremse(hash('sha256', $schluessel), $max, $sek);
}
function bremse_zurueck($schluessel) { lager()->bremse_zurueck(hash('sha256', $schluessel)); }
// Bekannter Ort (IP), von dem aus dieser Spieler in den letzten 24 Std. gespielt hat: dort sperrt ihn die große Grenze pro Konto
// nicht aus (sonst könnte ein Fremder mit vielen falschen Passwörtern sein Konto sperren – Alexander 5.10.). Nichts im Browser.
function geraet_bekannt_merken($uid) { lager()->bremse(hash('sha256', 'kennt:' . (int)$uid . ':' . client_ip()), PHP_INT_MAX, 1); }
function geraet_bekannt($uid) { return lager()->bremse_da(hash('sha256', 'kennt:' . (int)$uid . ':' . client_ip()), 86400); }
// Erlaubte Namen: Buchstaben (auch Umlaute, keine Doppelgänger-Schriften), Ziffern, Leerzeichen, _ . – und nie „Spieler 12“
// (so heißt jeder ohne eigenen Namen – sonst könnte man sich als ein anderer ausgeben)
function name_erlaubt($name) { return preg_match('/^[A-Za-z0-9ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ _.-]{3,20}$/u', $name) && !preg_match('/^\s*spieler\s*\d+\s*$/iu', $name); }
// Profil eines Spielers (sehen alle anderen): wird komplett neu aufgebaut – nur bekannte Felder, Zahlen als Zahlen,
// Kennungen nur aus Buchstaben/Ziffern/_/- (nichts, was anderswo Code einschleusen könnte)
function profil_bereinigen($text) {
    $p = json_decode((string)$text, true, 12);
    if (!is_array($p)) return null;
    $id = function ($v) { return is_string($v) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $v) ? $v : null; };
    $zahl = function ($v, $max = 1e30) { return is_numeric($v) && is_finite((float)$v) ? max(-$max, min($max, $v + 0)) : 0; };
    $karte = function ($v, $wert, $max = 80) use ($id) { $r = []; if (is_array($v)) foreach ($v as $k => $x) { if (count($r) >= $max) break; if ($id((string)$k) !== null) $r[(string)$k] = $wert($x); } return (object)$r; };
    $liste = function ($v) use ($id) { $r = []; if (is_array($v)) foreach (array_slice($v, 0, 60) as $x) if ($id($x) !== null) $r[] = $x; return $r; };
    // Obergrenzen = die echten Höchstwerte des Spiels (spiel.js): nichts Ehrliches wird gekappt, Fantasiewerte schon
    $plus = function ($v, $max) use ($zahl) { return max(0, $zahl($v, $max)); };
    $lvl = (int)max(1, $plus($p['lvl'] ?? 1, 2000));
    $gear = [];
    foreach (['weapon', 'armor', 'shield', 'boots'] as $sl) { $g = $p['gear'][$sl] ?? null; $gear[$sl] = is_array($g) ? ['r' => (int)$plus($g['r'] ?? 0, 5), 'lvl' => (int)max(1, $plus($g['lvl'] ?? 1, 20)), 'st' => (int)$plus($g['st'] ?? 0, 5)] : null; }   // RARITY_DEFS 0–5, ITEM_MAX_LEVEL 20, STAR_MAX 5
    $hs = $karte($p['hs'] ?? [], function ($h) use ($plus) { $h = is_array($h) ? $h : [];
        $sk = []; foreach (array_slice((array)($h['sk'] ?? []), 0, 4) as $x) $sk[] = (int)$plus($x, 5);
        return ['sh' => (int)$plus($h['sh'] ?? 0, 1e6), 'q' => (int)$plus($h['q'] ?? 0, 20), 'own' => !empty($h['own']), 'sk' => $sk, 'rage' => $plus($h['rage'] ?? 0, 1000)]; }, 40);   // HERO_MAXQ 20
    $sk = []; foreach (['troops', 'attack', 'defense', 'speed', 'attackGold', 'defenseGold'] as $k) $sk[$k] = (int)$plus($p['skills'][$k] ?? 0, $k === 'speed' ? 10 : 50);
    if (array_sum($sk) > $lvl + 20) { $f = ($lvl + 20) / array_sum($sk); foreach ($sk as $k => $v) $sk[$k] = (int)floor($v * $f); }   // 1 Skillpunkt pro Stufe
    $STADT = ['academy' => 25, 'forge' => 5, 'hospital' => 40, 'wall' => 25, 'heroes' => 25,
              'keep' => 25, 'embassy' => 25, 'market' => 25, 'lumber' => 25, 'quarry' => 25, 'mine' => 25];   // cityMaxLevel · Burg-Stufe (keep), Labor (academy), Krankenhaus (hospital), Botschaft, Markt, Holzfäller, Steinbruch, Eisenmine
    $stadt = []; foreach ($STADT as $k => $mx) if (isset($p['city']['levels'][$k])) $stadt[$k] = (int)$plus($p['city']['levels'][$k], $mx);
    $bau = []; $bauBis = []; $bl = is_array($p['city']['bau'] ?? null) ? array_slice(array_values($p['city']['bau']), 0, 2) : []; $bz = is_array($p['city']['bauBis'] ?? null) ? array_values($p['city']['bauBis']) : [];
    foreach ($bl as $i => $x) if (is_string($x) && isset($STADT[$x])) { $bau[] = $x; $bauBis[] = $plus($bz[$i] ?? 0, 1e15); }   // was gerade gebaut wird + wann fertig (Push „Bau fertig“) – je Gebäude seine Zeit
    // Paket D: Forschung im Labor (feste Liste, Höchststufen wie FORSCHUNG in aufbau.js), Rohstoffe wie Münzen
    $FO = ['w_prod' => 10, 'w_sam' => 10, 'w_last' => 10, 'w_tempel' => 10, 'm_atk' => 10, 'm_def' => 10, 'm_laz' => 10, 'x_tempo' => 10, 'x_spaeh' => 10, 'x_nebel' => 5,
           'w_schutz' => 3, 'm_laz2' => 3, 'x_tempo2' => 3];   // (ab Labor 23, 5.10.)
    $fo = []; foreach ($FO as $k => $mx) if (isset($p['fo'][$k])) $fo[$k] = (int)$plus($p['fo'][$k], $mx);
    $foLauf = isset($p['city']['foLauf']) && is_string($p['city']['foLauf']) && isset($FO[$p['city']['foLauf']]) ? $p['city']['foLauf'] : null;
    $res = []; foreach (['h', 's', 'e'] as $k) $res[$k] = $plus($p['res'][$k] ?? 0, 1e15);
    // 3B: Gems kommen mit ins Profil – nur der Weltrechner sieht sie (spieler_liste) und hält sie gegen sein Hauptbuch
    $jetztMs = time() * 1000;
    $lk = is_array($p['look'] ?? null) ? $p['look'] : [];
    $cr = is_array($p['crest'] ?? null) ? $p['crest'] : null;
    return json_encode([
        'lvl' => $lvl,
        'skills' => (object)$sk,
        'gear' => $gear,
        'city' => ['levels' => (object)$stadt, 'bau' => $bau, 'bauBis' => $bauBis,
                   'b2' => !empty($p['city']['b2']), 'foLauf' => $foLauf, 'foBis' => $foLauf ? $plus($p['city']['foBis'] ?? 0, 1e15) : 0],   // (was gerade gebaut/geforscht wird – Bauzeit-Prüfung im Hauptbuch, Push „fertig“)
        'fo' => (object)$fo, 'res' => is_array($p['res'] ?? null) ? $res : null,   // (fehlt: null – nicht 0, sonst sähe es nach „alles ausgegeben“ aus)
        'wounded' => $plus($p['wounded'] ?? 0, 1e30),
        'hs' => $hs,
        'shieldUntil' => min($plus($p['shieldUntil'] ?? 0, 1e15), $jetztMs + 8 * 86400000), 'neuBis' => min($plus($p['neuBis'] ?? 0, 1e15), $jetztMs + 48 * 3600000),   // längster Schild 8 Tage, Anfängerschutz 48 h
        'look' => ['frame' => $id($lk['frame'] ?? null), 'frames' => $liste($lk['frames'] ?? []), 'titles' => $liste($lk['titles'] ?? [])],   // (Rahmen: angelegt + die er hat – Weltrechner hbRahmen)
        'stats' => $karte($p['stats'] ?? [], function ($x) use ($plus) { return $plus($x, 1e15); }, 80),
        'saison' => (int)max(1, $plus($p['saison'] ?? 1, 1e6)),   // Welt-Saison seines Spielstands (ein älteres Profil zählt beim Weltrechner nicht)
        'earned' => $plus($p['earned'] ?? 0, 1e12), 'coins' => $plus($p['coins'] ?? 0, 1e15), 'gems' => isset($p['gems']) ? $plus($p['gems'], 1e13) : null,
        'stW' => isset($p['stW']) ? $plus($p['stW'], 1e9) : null,   // Gems in allen Sternen (Hauptbuch: Rückgabe beim Verkaufen)
        'tp' => isset($p['tp']) ? $plus($p['tp'], 1e12) : null,   // Thron-Punkte im Geldbeutel (Hauptbuch: Kappe beim Saison-Reset – nur der Weltrechner)
        'crest' => $cr ? array_map(function ($k) use ($cr, $zahl) { return (int)$zahl($cr[$k] ?? 0, 99); }, ['shape' => 'shape', 'div' => 'div', 'c1' => 'c1', 'c2' => 'c2', 'sym' => 'sym', 'ink' => 'ink']) : null,
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
// Befehle der Spieler an den Weltrechner: nur bekannte Arten, nur saubere Werte (keine Texte statt Zahlen, nichts
// Unendliches, keine Riesenzahlen, nicht zu tief verschachtelt). Der Weltrechner prüft dann noch die Spielregeln.
const BEFEHL_ARTEN = ['angriff', 'senden', 'zurueck', 'schneller', 'ausbau', 'truppen', 'tor', 'titel', 'feld', 'feldHeim', 'lager', 'armee', 'beitreten', 'bund', 'haendler', 'spaehen', 'vheld', 'teleport'];   // vheld: Verteidigungs-Helden in der Mauer · spaehen (3B): Erkundungs-Späher – der Weltrechner deckt danach den Nebel auf (mit blick: Späher zu einer fremden Basis – er schreibt den Spähbericht) · teleport: Hauptstadt an eine freie Stelle
const BEFEHLE_BEZAHLT = ['ausbau', 'schneller', 'truppen', 'teleport'];   // hat das Handy schon bezahlt (wie BEZAHLT in welt.js)
const BEFEHL_MENGEN = ['n', 'stufe', 'anteil', 'tr'];   // müssen echte Zahlen ≥ 0 sein
function befehl_ok($b) {
    if (!is_array($b) || !in_array($b['art'] ?? null, BEFEHL_ARTEN, true)) return false;
    foreach (BEFEHL_MENGEN as $f) if (array_key_exists($f, $b) && $b[$f] !== null && (!(is_int($b[$f]) || is_float($b[$f])) || !is_finite($b[$f]) || $b[$f] < 0 || $b[$f] > 1e30)) return false;   // (nur gegen kaputte Zahlen – Truppen wachsen ohne Obergrenze)
    $gut = function ($v, $t) use (&$gut) {
        if ($t > 4) return false;
        if (is_string($v)) return strlen($v) <= 200 && strpbrk($v, '<>') === false;
        if (is_int($v) || is_float($v)) return is_finite($v) && abs($v) <= 1e30;
        if (is_bool($v) || $v === null) return true;
        if (is_array($v)) { if (count($v) > 100) return false; foreach ($v as $k => $x) if (strlen((string)$k) > 40 || !$gut($x, $t + 1)) return false; return true; }
        return false;
    };
    return $gut($b, 0);
}
// ===== Was Spieler NICHT bekommen (Datenlecks) =====
// Gedanken der Mitspieler (wen sie als Nächstes angreifen, Pläne, wann sie „aufs Handy schauen“ …) und die Merkliste des
// Schummel-Schutzes braucht nur der Weltrechner. Spieler bekommen diese Felder nie – weder im ganzen Teil noch in Flicken.
const NUR_WELTRECHNER = ['grudge', 'annoy', 'vendetta', 'capWish', 'mood', 'kennt', 'fails', 'outAt', 'rally', 'plan', 'wache', 'dOffen', 'res', 'hb', 'wounded'];   // res: Rohstoffe der anderen (Paket D) · hb: Hauptbuch (3B) · wounded: Lazarett
function mitspieler_kuerzen($b, $jetztMs) {
    if (!is_object($b)) return $b;
    foreach (NUR_WELTRECHNER as $f) unset($b->{$f});
    if (isset($b->handy) && !(is_object($b->handy) && ($b->handy->bis ?? 0) > $jetztMs)) unset($b->handy);   // nur sichtbar, solange er wirklich online ist
    return $b;
}
// Fremde Spieler und Mitspieler (6.10., Alexander): ohne Spähen sieht man nur Name, Macht, Bündnis, Burg-Stufe (dazu Stufe,
// Aussehen, Hauptstadt, Schild/Anfängerschutz, Eroberungen und Thron-Punkte für die Rangliste). Helden, Ausrüstung, Fähigkeiten,
// Stadt, Forschung, Gems, Schild-Vorrat, Pass … nur im Spähbericht (kommt fertig vom Weltrechner). Die Macht rechnet der
// Weltrechner (macht), ebenso die Summe aller Forschungs-Stufen (foP – Rangliste „Hauptstadt“ bei gleicher Burg-Stufe, ohne
// zu verraten, was erforscht ist). Der eigene Eintrag (u<id>) bleibt ganz – nur NUR_WELTRECHNER fehlt wie bei allen.
const FREMD_OEFFENTLICH = ['lvl', 'macht', 'foP', 'tt', 'capital', 'shieldUntil', 'neuBis', 'mensch', 'v2', 'hbK', 'handy', 'city', 'stats',
    'lookMig', 'frames', 'titles', 'lookFrame', 'achLook', 'bestRank'];
const FREMD_STATS = ['caps', 'capSeed', 'tpEarned'];   // (Rangliste: Eroberungen, Thron-Punkte)
function fremd_wert($f, $v) {                         // city: nur die Burg-Stufe · stats: nur die der Rangliste
    if ($f === 'city') return (object)['levels' => (object)(is_object($v) && isset($v->levels->keep) ? ['keep' => $v->levels->keep] : [])];
    if ($f === 'stats') { $r = []; if (is_object($v)) foreach (FREMD_STATS as $k) if (isset($v->{$k})) $r[$k] = $v->{$k}; return (object)$r; }
    return $v;
}
function fremd_kuerzen($b) {
    if (!is_object($b)) return $b;
    foreach (array_keys((array)$b) as $f) { if (!in_array($f, FREMD_OEFFENTLICH, true)) unset($b->{$f}); elseif ($f === 'city' || $f === 'stats') $b->{$f} = fremd_wert($f, $b->{$f}); }
    return $b;
}
// Profil eines anderen Spielers (spieler_liste): nur Stufe, Aussehen, Wappen, Baustil, Schild, Anfängerschutz, Burg-Stufe,
// Eroberungen und Thron-Punkte (wie FREMD_OEFFENTLICH)
function profil_oeffentlich($p) {
    if (!is_object($p)) return null;
    $r = new stdClass();
    foreach (['lvl', 'look', 'crest', 'shieldUntil', 'neuBis', 'earned'] as $f) if (isset($p->{$f})) $r->{$f} = $p->{$f};
    if (isset($p->city->levels->keep)) $r->city = (object)['levels' => (object)['keep' => $p->city->levels->keep]];
    if (isset($p->stats->captures)) $r->stats = (object)['captures' => $p->stats->captures];
    return $r;
}
// Münzen anderer in openWaterBotCoins (Mitspieler und echte Spieler) sieht nur der Weltrechner – wie in spieler_liste
// (Beute steht im Spähbericht; das Handy rechnet fehlende als 0)
function muenzen_kuerzen($o) { foreach (array_keys((array)$o) as $id) unset($o->{$id}); return $o; }
// ganzer Welt-Teil für einen Spieler ($ich: 'u<id>' – sein eigener Eintrag bleibt ganz; null: alle sind fremd)
function weltteil_fuer_spieler($k, $text, $ich = null) {
    if ($k === 'openWaterBotCoins' && is_string($text)) { $o = json_decode($text); return is_object($o) ? json_encode(muenzen_kuerzen($o), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION) : 'null'; }
    if ($k !== 'openWaterBotState' || !is_string($text)) return $text;
    $o = json_decode($text); if (!is_object($o)) return 'null';   // (kaputt: lieber gar nichts als ungefiltert)
    $j = microtime(true) * 1000; foreach ($o as $id => $b) { $b = mitspieler_kuerzen($b, $j); $o->{$id} = (string)$id === $ich ? $b : fremd_kuerzen($b); }
    return json_encode($o, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}
// Flicken für einen Spieler
function flicken_fuer_spieler($k, $text, $ich = null) {
    if ($k === 'openWaterBotCoins' && is_string($text)) { $p = json_decode($text); if (is_object($p) && isset($p->s) && is_object($p->s)) { muenzen_kuerzen($p->s); return json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION); } return is_object($p) ? $text : 'null'; }
    if ($k !== 'openWaterBotState' || !is_string($text)) return $text;
    $p = json_decode($text); if (!is_object($p)) return 'null';
    $j = microtime(true) * 1000;
    foreach ((array)($p->s ?? []) as $id => $b) { $b = mitspieler_kuerzen($b, $j); $p->s->{$id} = (string)$id === $ich ? $b : fremd_kuerzen($b); }
    foreach ((array)($p->d ?? []) as $id => $sub) {
        if (!is_object($sub)) continue;
        if (!isset($sub->s) || !is_object($sub->s)) $sub->s = new stdClass();
        foreach (NUR_WELTRECHNER as $f) unset($sub->s->{$f});
        if (isset($sub->s->handy) && !(is_object($sub->s->handy) && ($sub->s->handy->bis ?? 0) > $j)) { unset($sub->s->handy); $sub->w = array_values(array_unique(array_merge((array)($sub->w ?? []), ['handy']))); }
        if (isset($sub->w)) $sub->w = array_values(array_diff((array)$sub->w, NUR_WELTRECHNER));
        if ((string)$id === $ich) continue;
        foreach (array_keys((array)$sub->s) as $f) { if (!in_array($f, FREMD_OEFFENTLICH, true)) unset($sub->s->{$f}); else $sub->s->{$f} = fremd_wert($f, $sub->s->{$f}); }   // fremd: nur Öffentliches
        if (isset($sub->w)) $sub->w = array_values(array_intersect((array)$sub->w, FREMD_OEFFENTLICH));
    }
    return json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}
// ein ganzer Welt-Stand (welt_seit / welt_seit_flicken) für einen Spieler ($uid: seine Nummer)
function welt_fuer_spieler($w, $uid = 0) {
    $ich = $uid ? 'u' . (int)$uid : null;
    if (isset($w['setzen'])) { $t = (array)$w['setzen']; foreach ($t as $k => $v) $t[$k] = weltteil_fuer_spieler($k, $v, $ich); $w['setzen'] = (object)$t; }
    if (isset($w['flicken'])) { $f = (array)$w['flicken']; foreach ($f as $k => $liste) $f[$k] = array_map(function ($t) use ($k, $ich) { return flicken_fuer_spieler($k, $t, $ich); }, (array)$liste); $w['flicken'] = (object)$f; }
    return $w;
}
// ===== Nebel auf dem Server (3B) =====
// Truppenzahlen bekommt ein Spieler nur für Inseln, die er sehen darf: seine eigenen Basen und was der Weltrechner als
// „gesehen“ für ihn ausgerechnet hat (Sichtweite seiner Basen – auch früherer – und Erkundungs-Späher, gleiche Regel wie
// islandSeen im Spiel). Der Weltrechner schickt die Sicht als Bitfeld über die Insel-Nummern (base64) im Puls (`sicht`),
// der Server legt sie in ow_spieler.sicht ab (sicht_v zählt jede Änderung). Ändert sich die Sicht, bekommt der Spieler
// die gefilterten Teile beim nächsten Puls ganz (sonst fehlten ihm die Zahlen der neu sichtbaren Inseln).
const NEBEL_TEILE = ['openWaterIslandTroops', 'openWaterNeutralTroopOverrides'];
// $s = ['bits' => Bitfeld (Byte-Text) oder '', 'eigen' => [Insel-Nummer => true]]
function nebel_sieht($s, $id) {
    if (!is_numeric($id)) return false;
    $id = (int)$id; if (isset($s['eigen'][$id])) return true;
    $b = $s['bits']; $i = $id >> 3;
    return $id >= 0 && $i < strlen($b) && ((ord($b[$i]) >> ($id & 7)) & 1) === 1;
}
// ganzer Teil (Objekt Insel → Zahl): nur sichtbare Inseln
function nebel_teil($text, $s) {
    $o = json_decode((string)$text, true); if (!is_array($o)) return 'null';
    $r = []; foreach ($o as $id => $v) if (nebel_sieht($s, $id)) $r[$id] = $v;
    return json_encode((object)$r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}
// Flicken eines solchen Teils: neue/geänderte Werte nur für sichtbare Inseln (Wegfallen darf jeder wissen – er hatte sie ja)
function nebel_flicken($text, $s) {
    $p = json_decode((string)$text); if (!is_object($p)) return 'null';
    if (isset($p->s) && is_object($p->s)) { foreach ((array)$p->s as $id => $_) if (!nebel_sieht($s, $id)) unset($p->s->{$id}); }
    unset($p->d);   // (diese Teile haben keine zweite Ebene)
    return json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}
// ===== Marschgrößen (3.10.) =====
// Wie stark fremde Kolonnen sind (Angriffe, Senden, Rückzüge, Sammler, Lager-Märsche), sieht ein Spieler erst, wenn ein Angriff auf
// SEINE Basis kämpft (wie danach im Kampfbericht; Wachturm ist seit 4.10. raus). Darum schickt der Server fremde Zahlen gar nicht erst (sonst stünden sie im Handy, nur versteckt):
// Truppen 0, Held und Kampfwerte weg. Eigene Kolonnen bleiben, wie sie sind. Diese Teile gehen an Spieler immer ganz (nie als
// Flicken – die passten nicht zum gefilterten Stand im Handy). Armeen und besetzte Felder zeigt das Spiel mit Zahlen, wenn man sie
// sieht – im Nebel nicht: Truppen und Helden nur für die, die der Weltrechner ihm als sichtbar meldet (ow_spieler.armee_sicht).
const MARSCH_TEILE = ['openWaterPendingAttacks', 'openWaterPendingSends', 'openWaterPendingRetreats', 'openWaterFieldMarches', 'openWaterBarbMarches', 'openWaterArmies', 'openWaterFields', 'openWaterVerstaerkung', 'openWaterBundChat', 'openWaterBuendnisse'];   // (Bündnisse: fremde Rallys ohne Truppenzahlen, fremde Logs weg)   // (Bündnis-Chat: nur der des eigenen Bündnisses) (Verstärkung: nur seine eigene und die bei ihm)
function marsch_teil($k, $text, $ich, $eigen, $sieht = []) {
    $v = json_decode((string)$text); if (!is_array($v) && !is_object($v)) return $text;   // (als Objekte: {} bleibt {})
    $wer = function ($o, $f) { return isset($o->$f) && is_string($o->$f) ? $o->$f : ''; };
    if ($k === 'openWaterArmies') {
        foreach ((array)($v->armies ?? []) as $a) if (is_object($a) && $wer($a, 'who') !== $ich && !isset($sieht[(string)($a->id ?? '')])) { $a->troops = 0; $a->hero = null; $a->hero2 = null; }
        foreach ((array)($v->joins ?? []) as $j) if (is_object($j) && $wer($j, 'who') !== $ich) $j->troops = 0;
        foreach ((array)($v->raids ?? []) as $r) if (is_object($r) && $wer($r, 'tOwner') !== $ich) foreach (['troops', 'n', 'hero', 'hero2'] as $f) if (isset($r->$f)) $r->$f = is_numeric($r->$f) ? 0 : null;
    } elseif ($k === 'openWaterBundChat') {                       // nur der Chat des eigenen Bündnisses – kein anderes Bündnis liest mit
        foreach (array_keys((array)$v) as $aid) { $c = $v->$aid ?? null; if (!is_object($c) || !in_array($ich, (array)($c->mit ?? []), true)) unset($v->$aid); }
    } elseif ($k === 'openWaterBuendnisse') {                    // Rallys anderer Bündnisse: wohin und wann ja (Warnung „Gefahr“), wie viele Truppen nie
        $mein = null; foreach ((array)($v->b ?? []) as $aid => $a) if (is_object($a) && in_array($ich, (array)($a->mit ?? []), true)) $mein = (string)$aid;
        foreach ((array)($v->b ?? []) as $aid => $a) if (is_object($a) && (string)$aid !== $mein) unset($a->log, $a->sig);
        if (isset($v->r) && is_array($v->r)) foreach ($v->r as $r) if (is_object($r) && (string)($r->aid ?? '') !== $mein) {
            $r->n0 = 0; unset($r->held, $r->held2); if (isset($r->j) && is_array($r->j)) foreach ($r->j as $j) if (is_object($j)) { $j->n = 0; unset($j->held, $j->held2); } }
    } elseif ($k === 'openWaterVerstaerkung') {
        if (isset($v->l) && is_array($v->l)) $v->l = array_values(array_filter($v->l, function ($x) use ($wer, $ich, $eigen) { return is_object($x) && ($wer($x, 'w') === $ich || isset($eigen[(int)($x->t ?? -1)])); }));
    } elseif ($k === 'openWaterFields') {
        foreach ((array)$v as $fid => $st) if (is_object($st) && isset($st->occ) && is_object($st->occ) && $wer($st->occ, 'who') !== $ich && !isset($sieht[(string)$fid])) {
            $st->occ->troops = 0; $st->occ->hero = null; $st->occ->hero2 = null; if (isset($st->occ->got)) $st->occ->got = 0; }
    } elseif (is_array($v)) foreach ($v as $e) {
        if (!is_object($e)) continue;
        if ($k === 'openWaterPendingAttacks') {
            if ($wer($e, 'attackerBotId') === $ich) continue;
            if (isset($e->rally) && is_object($e->rally) && isset($e->rally->an) && is_array($e->rally->an)) {   // gemeinsamer Angriff: die Zahlen sieht nur, wer dabei ist
                $dabei = false; foreach ($e->rally->an as $x) if (is_array($x) && ($x[0] ?? '') === $ich) $dabei = true;
                if (!$dabei) foreach ($e->rally->an as $i => $x) if (is_array($x)) { $e->rally->an[$i][2] = 0; unset($e->rally->an[$i][3], $e->rally->an[$i][4], $e->rally->an[$i][5], $e->rally->an[$i][6], $e->rally->an[$i][7]); }
            }
            $kampf = !empty($e->fightEndsAt); $aufMich = isset($eigen[(int)($e->targetId ?? -1)]); $genau = $aufMich && $kampf;   // (kämpft er schon bei dir, siehst du seine Stärke – wie danach im Kampfbericht)
            $e->rawTroops = $genau ? ($e->rawTroops ?? 0) : 0;
            foreach (['hx', 'attackBonus', 'skillBonus', 'skillLvl', 'attackGoldRate', 'rewardGoldRate', 'shieldLossReductionPct', 'atkTitle', 'atkTitleKey', 'atkKraft', 'atkFo', 'planId', 'lastWave', 'heldBonus', 'heldVon'] as $f) unset($e->$f);
            if (!$genau) unset($e->hero, $e->hero2);
        } elseif ($k === 'openWaterPendingSends') { if ($wer($e, 'senderBotId') !== $ich) { $e->troops = 0; unset($e->held, $e->held2); } }
        elseif ($k === 'openWaterPendingRetreats') { if ($wer($e, 'owner') !== $ich) $e->troops = 0; }
        else { if ($wer($e, 'who') !== $ich) { $e->troops = 0; unset($e->hero, $e->hero2, $e->load); } }
    }
    return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}
// $s: Sicht (für die eigenen Basen), $uid: der Spieler. Teile, die nur als Flicken kamen, werden ganz (gefiltert) geschickt.
// $vorgeladen: diese Teile schon aus demselben festen Stand geladen (marsch_fehlt) – sonst hier nachladen.
function marsch_fehlt($w) {
    $t = (array)($w['setzen'] ?? []); $f = (array)($w['flicken'] ?? []);
    return array_values(array_filter(MARSCH_TEILE, function ($k) use ($t, $f) { return !isset($t[$k]) && isset($f[$k]); }));
}
function marsch_welt($w, $uid, $s, $vorgeladen = null) {
    $t = (array)($w['setzen'] ?? []); $f = (array)($w['flicken'] ?? []);
    $da = array_values(array_filter(MARSCH_TEILE, function ($k) use ($t, $f) { return isset($t[$k]) || isset($f[$k]); }));
    if (!$da) return $w;
    $fehlt = array_values(array_filter($da, function ($k) use ($t) { return !isset($t[$k]); }));
    if ($fehlt) foreach ($vorgeladen ?? lager()->stand_laden(0, $fehlt) as $k => $v) if (in_array($k, $fehlt, true)) $t[$k] = $v;
    foreach ($da as $k) { unset($f[$k]); if (isset($t[$k]) && is_string($t[$k])) $t[$k] = marsch_teil($k, $t[$k], 'u' . (int)$uid, $s['eigen'], $s['armeen'] ?? []); }
    $w['setzen'] = (object)$t; if (isset($w['flicken'])) $w['flicken'] = (object)$f;
    return $w;
}
// ein Welt-Stand (setzen/flicken) für einen Spieler mit Sicht $s filtern
function nebel_welt($w, $s) {
    if (isset($w['setzen'])) { $t = (array)$w['setzen']; foreach (NEBEL_TEILE as $k) if (isset($t[$k])) $t[$k] = nebel_teil($t[$k], $s); $w['setzen'] = (object)$t; }
    if (isset($w['flicken'])) { $f = (array)$w['flicken']; foreach (NEBEL_TEILE as $k) if (isset($f[$k])) $f[$k] = array_map(function ($t) use ($s) { return nebel_flicken($t, $s); }, (array)$f[$k]); $w['flicken'] = (object)$f; }
    return $w;
}

// Die Namen aller Mitspieler (fest in bots.js): id => Name – 60 feste und 90 aus der Namensliste (bot61 …)
function bot_namen() {
    static $n = null; if ($n !== null) return $n;
    $n = []; $src = (string)@file_get_contents(__DIR__ . '/bots.js');
    if (preg_match_all("/\\{ id: '(bot\\d+)',\\s*name: '([^']+)'/", $src, $m, PREG_SET_ORDER)) foreach ($m as $x) $n[$x[1]] = $x[2];
    if (preg_match("/\\/\\/ More players on the map[^\\n]*\\n\\[([^\\]]+)\\]\\.forEach/", $src, $m) && preg_match_all("/'([^']+)'/", $m[1], $nm)) foreach ($nm[1] as $i => $x) $n['bot' . (61 + $i)] = $x;
    return $n;
}
// Nachrichten, die der Weltrechner an andere schicken darf (Geschenke nur über admin.php – bis auf das kleine Bündnis-Geschenk)
const WELTRECHNER_NACHRICHTEN = ['delta', 'bericht', 'startschild', 'evPreis', 'bundInfo', 'bundGeschenk', 'haendlerWare', 'spaeh', 'saison', 'saisonBald'];   // evPreis: Preis aus Wochen-Event/Invasion/Drache/Welt-Saison (Abholfach) · spaeh: Spähbericht (6.10.) · saison/saisonBald: neue Welt-Saison (Reset) und ihre Ankündigung
// Ware vom wandernden Händler (haendler.js): höchstens 10 Splitter, eine Kiste bis blau, Truppen, ein 2-Std.-Schild – nie Gems, nie Münzen
function haendler_ware_ok($e) {
    foreach ($e as $k => $v) if (!in_array($k, ['art', 'title', 'sh', 'kiste', 'tr', 'schild', 'text'], true)) return false;
    $zahl = function ($v, $max) { return (is_int($v) || is_float($v)) && is_finite($v) && $v >= 0 && $v <= $max; };
    return $zahl($e['sh'] ?? 0, 10) && $zahl($e['tr'] ?? 0, 1e30) && in_array($e['kiste'] ?? -1, [-1, 0, 1, 2], true) && in_array($e['schild'] ?? 0, [0, 2], true)
        && is_string($e['title'] ?? '') && strlen($e['title'] ?? '') <= 120 && is_string($e['text'] ?? '') && strlen($e['text'] ?? '') <= 300;
}
// Bündnis-Geschenk (buendnis.js): nur Münzen, Truppen und höchstens eine graue/grüne Kiste – nie Gems oder Splitter
function bund_geschenk_ok($e) {
    foreach ($e as $k => $v) if (!in_array($k, ['art', 'coins', 'tr', 'crate', 'hint'], true)) return false;
    $zahl = function ($v, $max) { return (is_int($v) || is_float($v)) && is_finite($v) && $v >= 0 && $v <= $max; };
    return $zahl($e['coins'] ?? 0, 1e12) && $zahl($e['tr'] ?? 0, 1e12) && in_array($e['crate'] ?? -1, [-1, 0, 1], true) && is_string($e['hint'] ?? '') && strlen($e['hint'] ?? '') <= 300;
}

function client_ip() {   // (IPv6: das ganze /64-Netz zählt als eine Adresse – sonst wechselt man einfach die Adresse)
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '?');
    if (strpos($ip, ':') !== false && ($b = @inet_pton($ip)) !== false && strlen($b) === 16) return bin2hex(substr($b, 0, 8)) . '::/64';
    return $ip;
}
// Kommt ein Formular / eine Anfrage wirklich von dieser Seite? (fremde Seiten dürfen hier nichts abschicken)
function herkunft_ok() {
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') return false;
    $o = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($o === '' || $o === 'null') return $o === '';
    return strtolower((string)parse_url($o, PHP_URL_HOST)) === strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
}

function json_antwort($code, $daten) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

// Adresse eines Spiel-Skripts für die Spielseite: verkleinert über skript.php (gepackt, lange zwischengespeichert), wenn
// Game/klein/<name>.js aus genau diesem Original entstand (sha1 in seiner ersten Zeile, werkzeuge/verkleinern.js) – sonst
// das Original. Version in der Adresse = Anfang der sha1 (gleicher Inhalt, gleiche Adresse). Der Weltrechner bekommt immer
// das Original (er liest die Skripte selbst von der Festplatte, weltrechner/start.js).
function skript($name) {
    static $sys = null;
    if ($sys === null) $sys = (bool)system_zugang();
    $quelle = __DIR__ . '/' . $name . '.js';
    if (!$sys) {
        $kopf = @file_get_contents(__DIR__ . '/klein/' . $name . '.js', false, null, 0, 160); $sha = sha1_file($quelle);
        if ($kopf !== false && strpos($kopf, '/* verkleinert aus ' . $name . '.js · ' . $sha . ' · ') === 0) return 'skript.php?d=' . $name . '&amp;v=' . substr($sha, 0, 12);
    }
    return $name . '.js?v=' . filemtime($quelle);
}

// ===== Spielseite vorbereiten (spiel.php) =====
// Login prüfen, auf die letzte Sicherung eines gerade geschlossenen Fensters warten, Spielstand laden.
// Gibt die Zeilen für den Seitenkopf zurück (Spielstand + speichern.js).
function spielseite_vorbereiten() {
    header('Cache-Control: no-store');   // die Seite enthält Spielstand und Zeichen – nie zwischenspeichern
    if ($sys = system_zugang()) return weltrechner_seite($sys);
    try {
        $ich = aktueller_spieler();
        if (!$ich) { header('Location: ./'); exit; }
        if (wartung()) { header('Location: ./'); exit; }   // Wartung: niemand kommt ins Spiel (auch kein Admin) – zurück zur Startseite
        // Gerade noch gespielt (Neuladen)? Dann auf den "Abschied" des alten Fensters warten (seine letzte Sicherung),
        // höchstens 2 Sekunden - so lädt die neue Seite nie einen älteren Stand.
        $altTok = lager()->spiel_token($ich['id']);
        $uebernehmen = ($_GET['weiter'] ?? '') === '1' && in_array($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin', ['same-origin', 'none'], true);   // "Hier weiterspielen": sofort übernehmen (das andere Gerät fliegt raus) – nie von einer fremden Seite aus
        if (!bremse('seite:' . $ich['id'], 30, 60)) { http_response_code(429); exit('Zu oft neu geladen – bitte kurz warten.'); }   // (jedes Laden ist teuer: ganze Welt)
        geraet_bekannt_merken($ich['id']);
        if (!$uebernehmen && $altTok !== '' && time() - lager()->zuletzt_gespeichert($ich['id']) < 60) {
            for ($i = 0; $i < 20 && lager()->abschied($ich['id']) !== $altTok; $i++) usleep(100000);
        }
        lager()->sperren($ich['id']);
        // Wer hier zuletzt das Spiel öffnet, darf speichern - ein älterer Tab/anderes Gerät wird gestoppt.
        $tok = bin2hex(random_bytes(16));
        lager()->spiel_token_setzen($ich['id'], $tok);
        $stand = lager()->stand_laden($ich['id']);
        // die EINE Welt: ganzer Stand und alle Spieler. Rechnen tut sie nur der Weltrechner auf dem Server – nie ein Spieler.
        $leiter = false;
        [$welt, $sicht] = lager()->fest_lesen(function () use ($ich) { return [lager()->welt_seit(0), lager()->sicht_laden($ich['id'])]; });   // (ohne Welt-Sperre, aus einem festen Stand – wie beim Puls)
        $welt = welt_fuer_spieler($welt, $ich['id']);
        $welt = nebel_welt($welt, $sicht);   // 3B: Truppen nur, wo er hinsehen darf
        $welt = marsch_welt($welt, $ich['id'], $sicht);   // fremde Kolonnen ohne Zahlen (erst im Kampf)
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
        'uid' => (int)$ich['id'], 'leiter' => $leiter, 'welt' => $welt, 'spieler' => $spieler, 'sicht_v' => $sicht['v'],
        'nameGewaehlt' => !empty($ich['anzeigename']), 'admin' => ist_admin($ich),
        'version' => filemtime(__DIR__ . '/spiel.js'),   // Profil → Einstellungen → Version (Zeit des Hochladens)
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($ow === false) { http_response_code(503); exit('Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.'); }
    return '<script nonce="' . csp_nonce() . '">window.__OW = ' . $ow . ';</script>'
        . '<script src="' . skript('speichern') . '"></script>';
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
        $spieler = lager()->spieler_liste(0, true);
    } catch (Throwable $e) { http_response_code(503); exit('datenbank'); }
    $ow = json_encode(['stand' => ['openWaterReset' => '1'], 'neu' => false, 'token' => $tok, 'name' => 'Weltrechner', 'uid' => 0, 'leiter' => true, 'system' => true, 'zurueck' => (int)($wi['zurueck'] ?? 0),
        'welt' => $welt, 'spieler' => $spieler, 'nameGewaehlt' => true, 'admin' => false],
        JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    return '<script nonce="' . csp_nonce() . '">window.__OW = ' . $ow . ';</script>'
        . '<script src="speichern.js?v=' . filemtime(__DIR__ . '/speichern.js') . '"></script>';
}

// ===== MySQL =====
class MysqlLager {
    const TABELLEN_STAND = '2026-10-06t';   // (siehe Konstruktor)
    private $db;
    // Transaktionen (auch verschachtelt): was zusammengehört, gilt ganz oder gar nicht – stirbt PHP mittendrin, nimmt die Datenbank
    // alles zurück (z. B. Welt + Nachrichten + Quittungen des Weltrechners, Spielstand + „verbucht“ eines Spielers)
    private $tiefe = 0;
    function tx_anfang() { if ($this->tiefe++ === 0) $this->db->beginTransaction(); }
    function tx_ende() { if ($this->tiefe > 0 && --$this->tiefe === 0) $this->db->commit(); }
    function tx_abbruch() { if ($this->tiefe > 0) { $this->tiefe = 0; if ($this->db->inTransaction()) $this->db->rollBack(); } }
    function __construct($c) {
        $this->db = new PDO('mysql:host=' . $c['db_host'] . ';dbname=' . $c['db_name'] . ';charset=utf8mb4', $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 5,
        ]);
        // Tabellen prüfen/anlegen nur einmal je Tabellen-Stand (vorher bei jeder Anfrage – auch bei jedem Puls). Der Stand steht fest
        // im Code (nicht das Datei-Datum: ein PHP-Zwischenspeicher könnte sonst mit altem Code den neuen Stand als erledigt eintragen).
        // BEI JEDER ÄNDERUNG AN tabellen() HOCHZÄHLEN.
        $v = self::TABELLEN_STAND;
        try { $da = $this->db->query('SELECT tabellen_v FROM ow_welt_info WHERE id = 1')->fetchColumn(); } catch (PDOException $e) { $da = null; }
        if ($da !== $v) { $this->tabellen(); $this->db->prepare('UPDATE ow_welt_info SET tabellen_v = ? WHERE id = 1')->execute([$v]); }
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
        // Mitspieler: eine Zeile pro Mitspieler und Spieler (spieler_id = 0: die EINE Welt)
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
        $wi = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_welt_info'")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('tabellen_v', $wi, true)) $this->db->exec("ALTER TABLE ow_welt_info ADD COLUMN tabellen_v VARCHAR(40) NOT NULL DEFAULT ''");
        $sz = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_sitzungen'")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('admin_bis', $sz, true)) $this->db->exec("ALTER TABLE ow_sitzungen ADD COLUMN admin_bis INT UNSIGNED NOT NULL DEFAULT 0");   // Admin-Seite mit Passwort freigeschaltet bis (nur diese Sitzung)
        if (!in_array('zurueck', $wi, true)) $this->db->exec("ALTER TABLE ow_welt_info ADD COLUMN zurueck BIGINT UNSIGNED NOT NULL DEFAULT 0");   // wann zuletzt eine Sicherung zurückgespielt wurde (ms) – der Weltrechner gleicht danach das Hauptbuch an   // welcher Stand von server.php die Tabellen zuletzt geprüft hat
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
        // Handy-Benachrichtigungen (Web-Push): ein Eintrag pro Gerät (ein Spieler kann mehrere haben). endpoint = Adresse
        // beim Push-Dienst (Apple/Google/Mozilla/Microsoft), p256dh/auth = Schlüssel des Geräts zum Verschlüsseln.
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_push (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            endpoint_hash CHAR(64) NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh VARCHAR(100) NOT NULL,
            auth VARCHAR(40) NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY endpoint_hash (endpoint_hash),
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        // Übersicht in der Spieler-Tabelle (zum Anschauen in phpMyAdmin)
        $da = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'")->fetchAll(PDO::FETCH_COLUMN);
        $neu = ['stufe' => 'INT NULL', 'muenzen' => 'DOUBLE NULL', 'gems' => 'DOUBLE NULL', 'anzahl_basen' => 'INT NULL', 'zuletzt_gespeichert' => 'DATETIME NULL', 'abschied' => "CHAR(32) NOT NULL DEFAULT ''",
                'profil' => 'MEDIUMTEXT NULL', 'profil_zeit' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'online_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'anzeigename' => 'VARCHAR(20) NULL', 'puls_minute' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'puls_anzahl' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'push_aus' => "VARCHAR(60) NOT NULL DEFAULT ''",   // push_aus: Benachrichtigungs-Arten, die der Spieler ausgeschaltet hat (Einstellungen)
                'sicht' => 'MEDIUMTEXT NULL', 'sicht_v' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'speicher_nr' => 'BIGINT UNSIGNED NOT NULL DEFAULT 0', 'armee_sicht' => 'MEDIUMTEXT NULL'];   // 3B: was er sehen darf (Bitfeld vom Weltrechner), Zähler
        foreach ($neu as $sp => $typ) if (!in_array($sp, $da, true)) $this->db->exec("ALTER TABLE ow_spieler ADD COLUMN $sp $typ");
        $t = $this->db->query("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler' AND COLUMN_NAME = 'profil_zeit'")->fetchColumn();
        if ($t && strtolower($t) !== 'bigint') $this->db->exec("ALTER TABLE ow_spieler MODIFY profil_zeit BIGINT UNSIGNED NOT NULL DEFAULT 0");   // (Millisekunden)
        // Genau-einmal (3.10.): Befehle tragen eine Nummer vom Handy (cid), Nachrichten eine vom Weltrechner (mid) – doppelt
        // Geschicktes wird nicht nochmal abgelegt. Erledigtes bleibt eine Weile markiert stehen (fertig/abgeholt), damit eine
        // verspätete Wiederholung es nicht neu anlegt.
        // art: welche Art (bezahlte verfallen nie unbemerkt), fertig_v: Welt-Version, mit der die Wirkung gespeichert wurde (Zurückspielen)
        foreach (['ow_befehle' => ['cid' => 'VARCHAR(24) NULL', 'fertig' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0', 'art' => 'VARCHAR(16) NULL', 'fertig_v' => 'BIGINT UNSIGNED NULL', 'ok' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0', 'nach' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
                  'ow_ereignisse' => ['mid' => 'VARCHAR(24) NULL', 'abgeholt' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
                  'ow_push' => ['sitzung' => "CHAR(64) NOT NULL DEFAULT ''"],
                  'ow_sicherungen' => ['behalten_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'konten' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0']] as $tab => $spalten) {   // (behalten_bis: die Saison-Sicherung bleibt 2 Wochen; konten: mit Spielerkonten, einmal am Tag)   // (sitzung: mit welchem Login das Gerät eingetragen ist – Abmelden trägt es aus)
            $q = $this->db->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?"); $q->execute([$tab]);
            $hat = $q->fetchAll(PDO::FETCH_COLUMN);
            foreach ($spalten as $sp => $typ) if (!in_array($sp, $hat, true)) $this->db->exec("ALTER TABLE $tab ADD COLUMN $sp $typ");
        }
        // Indizes (Aufräumen und Zählen ohne die ganze Tabelle zu lesen) und ein eindeutiger Anzeigename
        $idx = $this->db->query("SELECT CONCAT(TABLE_NAME, '.', INDEX_NAME) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'ow\\_%'")->fetchAll(PDO::FETCH_COLUMN);
        foreach (['ow_bremse.seit' => 'ow_bremse ADD KEY seit (seit)', 'ow_sitzungen.ablauf' => 'ow_sitzungen ADD KEY ablauf (ablauf)',
                  'ow_befehle.spieler_id' => 'ow_befehle ADD KEY spieler_id (spieler_id)', 'ow_befehle.erstellt' => 'ow_befehle ADD KEY erstellt (erstellt)',
                  'ow_ereignisse.erstellt' => 'ow_ereignisse ADD KEY erstellt (erstellt)',
                  'ow_befehle.spieler_cid' => 'ow_befehle ADD UNIQUE KEY spieler_cid (spieler_id, cid)', 'ow_ereignisse.spieler_mid' => 'ow_ereignisse ADD UNIQUE KEY spieler_mid (spieler_id, mid)', 'ow_spieler.anzeigename' => 'ow_spieler ADD UNIQUE KEY anzeigename (anzeigename)',
                  'ow_befehle.offen' => 'ow_befehle ADD KEY offen (fertig, id)', 'ow_ereignisse.spieler_offen' => 'ow_ereignisse ADD KEY spieler_offen (spieler_id, abgeholt, id)'] as $n => $sql)   // (Erledigtes bleibt eine Weile stehen: Offenes trotzdem schnell finden)
            if (!in_array($n, $idx, true)) { try { $this->db->exec('ALTER TABLE ' . $sql); } catch (PDOException $e) { error_log('Open Water Index ' . $n . ': ' . $e->getMessage()); } }
    }
    function sperren($uid) { if ((int)$this->db->query("SELECT GET_LOCK('ow_spieler_" . (int)$uid . "', 15)")->fetchColumn() !== 1) throw new RuntimeException('Spieler-Sperre nicht bekommen'); }
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
    function admin_frei_bis($th) { $q = $this->db->prepare('SELECT admin_bis FROM ow_sitzungen WHERE token_hash = ?'); $q->execute([$th]); return (int)$q->fetchColumn(); }
    function admin_freischalten($th, $bis) { $this->db->prepare('UPDATE ow_sitzungen SET admin_bis = ? WHERE token_hash = ?')->execute([(int)$bis, $th]); }
    function sitzung_loeschen($th) {
        $this->db->prepare('DELETE FROM ow_sitzungen WHERE token_hash = ?')->execute([$th]);
    }
    function spiel_token_setzen($uid, $tok) {
        $this->db->prepare('UPDATE ow_spieler SET spiel_token = ?, speicher_nr = 0 WHERE id = ?')->execute([$tok, $uid]);   // neue Seite: Sicherungs-Nummern fangen neu an
    }
    // Sicherungen eines Fensters tragen eine laufende Nummer: kommt eine ältere nach einer neueren an (zwei gleichzeitig unterwegs),
    // wird sie nicht mehr geschrieben – sonst stünde ein alter Stand (z. B. Münzen) über dem neuen. → false = zu alt
    function speicher_nr_ok($uid, $nr) {
        if ($nr <= 0) return true;
        $q = $this->db->prepare('SELECT speicher_nr FROM ow_spieler WHERE id = ?'); $q->execute([$uid]);
        if ($nr < (int)$q->fetchColumn()) return false;
        $this->db->prepare('UPDATE ow_spieler SET speicher_nr = ? WHERE id = ?')->execute([$nr, $uid]);
        return true;
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
        // nur die gefragten Teile aus der Datenbank holen (vorher: immer alle, gefiltert erst hier – bei der Welt viele MB je Puls)
        if ($nur === null) { $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ?'); $q->execute([$uid]); }
        else {
            $nur = array_values(array_unique(array_map('strval', $nur)));
            $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ? AND schluessel IN (' . implode(',', array_fill(0, count($nur), '?')) . ')');
            $q->execute(array_merge([$uid], $nur));
        }
        $r = [];
        foreach ($q as $z) if ($nur === null || in_array($z['schluessel'], $nur, true)) $r[$z['schluessel']] = $z['wert'];
        if ($nur !== null && !array_intersect(array_keys(self::BOT_TEILE), $nur)) return $r;
        unset($r['_bot_teile']);
        // Mitspieler wieder zusammensetzen (nur wenn der Teil nicht als Ganzes in ow_spielstand liegt) – nur die nötigen Spalten
        $da = $this->bot_teile_da($uid);
        $sp = [];
        foreach (self::BOT_TEILE as $k => $s) if (!isset($r[$k]) && !empty($da[$s]) && ($nur === null || in_array($k, $nur, true))) $sp[$k] = $s;
        if (!$sp) return $r;
        $q = $this->db->prepare('SELECT bot_id, ' . implode(', ', $sp) . ' FROM ow_bots WHERE spieler_id = ? ORDER BY nr, bot_id');
        $q->execute([$uid]);
        $teile = ['zustand' => [], 'muenzen' => [], 'basen' => []];
        foreach ($q as $z) {
            if (isset($z['zustand'])) $teile['zustand'][] = json_encode((string)$z['bot_id']) . ':' . $z['zustand'];
            if (isset($z['muenzen'])) $teile['muenzen'][] = json_encode((string)$z['bot_id']) . ':' . json_encode((float)$z['muenzen'] == floor((float)$z['muenzen']) && abs((float)$z['muenzen']) < 9e15 ? (int)$z['muenzen'] : (float)$z['muenzen']);
            if (isset($z['basen'])) $teile['basen'][] = json_encode((string)$z['bot_id']) . ':' . $z['basen'];
        }
        foreach ($sp as $k => $s) $r[$k] = '{' . implode(',', $teile[$s]) . '}';
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
        $this->tx_anfang();
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
        $this->tx_ende();
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
        if (mt_rand(1, 50) === 1) $this->db->prepare('DELETE FROM ow_bremse WHERE seit < ?')->execute([$jetzt - 86400]);
        // zählen in einem einzigen Schritt (viele gleichzeitige Anfragen können nicht alle „noch frei“ lesen)
        $this->db->prepare('INSERT INTO ow_bremse (schluessel, anzahl, seit) VALUES (?, 1, ?)
            ON DUPLICATE KEY UPDATE anzahl = IF(seit < ?, 1, anzahl + 1), seit = IF(seit < ?, VALUES(seit), seit)')->execute([$k, $jetzt, $jetzt - $sek, $jetzt - $sek]);
        $q = $this->db->prepare('SELECT anzahl FROM ow_bremse WHERE schluessel = ?'); $q->execute([$k]);
        return (int)$q->fetchColumn() <= $max;
    }
    function bremse_da($k, $sek) { $q = $this->db->prepare('SELECT 1 FROM ow_bremse WHERE schluessel = ? AND seit >= ?'); $q->execute([$k, time() - $sek]); return (bool)$q->fetchColumn(); }
    function bremse_frei($k) { $this->db->prepare('DELETE FROM ow_bremse WHERE schluessel = ?')->execute([$k]); }
    function bremse_zurueck($k) { $this->db->prepare('UPDATE ow_bremse SET anzahl = GREATEST(0, anzahl - 1) WHERE schluessel = ?')->execute([$k]); }   // ein gelungener Versuch zählt nicht
    // Anzeigename: frei, wenn ihn kein anderer Spieler als Login- oder Anzeigenamen hat
    function name_frei($uid, $name) {
        $q = $this->db->prepare('SELECT COUNT(*) FROM ow_spieler WHERE id <> ? AND (name = ? OR anzeigename = ?)');
        $q->execute([$uid, $name, $name]);
        return !(int)$q->fetchColumn();
    }
    // false = gleichzeitig hat ihn jemand anderes bekommen (eindeutiger Schlüssel auf anzeigename)
    function anzeigename_setzen($uid, $name) {
        try { $this->db->prepare('UPDATE ow_spieler SET anzeigename = ? WHERE id = ?')->execute([$name, $uid]); return true; }
        catch (PDOException $e) { if ($e->getCode() === '23000') return false; throw $e; }
    }
    function alle_spieler() { return $this->db->query('SELECT id, name, anzeigename, stufe, muenzen, gems, anzahl_basen, online_bis, erstellt FROM ow_spieler ORDER BY id')->fetchAll(); }

    // ===== Welt =====
    function welt_sperren() { if ((int)$this->db->query("SELECT GET_LOCK('ow_welt', 15)")->fetchColumn() !== 1) throw new RuntimeException('Welt-Sperre nicht bekommen'); }
    function welt_entsperren() { $this->db->query("SELECT RELEASE_LOCK('ow_welt')"); }
    // Lesen aus einem festen Stand – OHNE die Welt-Sperre (die braucht nur, wer schreibt: der Weltrechner, Zurückspielen).
    // Alles, was $f liest, stammt aus demselben Augenblick: der Weltrechner schreibt Welt, Version und Flicken immer in EINER
    // Transaktion (Zurückspielen und Welt-Neustart auch) – man sieht also nie einen halben Stand. In $f nichts schreiben.
    function fest_lesen(callable $f) {
        if ($this->tiefe > 0 || $this->db->inTransaction()) return $f();   // (schon in einer Transaktion)
        $this->db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');   // (nur für die nächste Transaktion)
        try { $this->db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'); }
        catch (PDOException $e) { $this->db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT'); }   // (alte Datenbank ohne READ ONLY)
        try { $r = $f(); }
        catch (Throwable $e) { try { $this->db->exec('ROLLBACK'); } catch (Throwable $x) {} throw $e; }
        $this->db->exec('COMMIT');
        return $r;
    }
    function welt_info() {
        $r = $this->db->query('SELECT version, versionen, leiter_id, leiter_token, leiter_bis, welt_zeit, zurueck FROM ow_welt_info WHERE id = 1')->fetch();
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
            $soll = []; foreach ($b as $wer => $liste) if (preg_match('/^u(\d+)$/', $wer, $m)) $soll[(int)$m[1]] = is_array($liste) ? count($liste) : 0;
            // nur, wo sich die Zahl geändert hat (vorher: jede Zeile bei jedem Puls – hielt die Transaktion lang und sperrte die
            // Zeilen der Spieler, die gerade speichern)
            $ist = [];
            foreach (array_chunk(array_keys($soll), 500) as $t) { $q = $this->db->prepare('SELECT id, anzahl_basen FROM ow_spieler WHERE id IN (' . implode(',', array_fill(0, count($t), '?')) . ')'); $q->execute($t);
                foreach ($q as $z) $ist[(int)$z['id']] = $z['anzahl_basen'] === null ? null : (int)$z['anzahl_basen']; }
            $q = $this->db->prepare('UPDATE ow_spieler SET anzahl_basen = ? WHERE id = ?');
            foreach ($soll as $id => $n) if (array_key_exists($id, $ist) && $ist[$id] !== $n) $q->execute([$n, $id]);
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
        if ($seit > (int)$i['version']) $seit = 0;   // Stand aus einer „Zukunft“ (nach welt_neustart: Version wieder klein) – sonst kämen nur einmal geschriebene Teile nie mehr
        $neu = []; foreach ($i['versionen'] as $k => $v) if ($v > $seit) $neu[] = $k;
        $flicken = []; $ganz = $neu;
        if ($seit > 0 && $neu && $seit >= (int)$i['version'] - 590) {
            $in = implode(',', array_fill(0, count($neu), '?'));
            $q = $this->db->prepare("SELECT version, schluessel, flicken FROM ow_welt_flicken WHERE version > ? AND version <= ? AND schluessel IN ($in) ORDER BY version");
            $q->execute(array_merge([(int)$seit, (int)$i['version']], $neu));   // (nie Flicken aus einer „Zukunft“, z. B. nach dem Zurückspielen einer Sicherung)
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
    // $konten (6.10., einmal am Tag – wachhund.php): dazu die Spielerkonten (ow_spieler; Passwörter nur als gespeicherte Prüfwerte
    // pw_hash) und die privaten Spielstände (ow_spielstand/ow_bots der Spieler) – aus demselben festen Stand wie die Welt.
    public $sicherung_info = null;   // (für das Log des Wachhunds: Dauer, Größe)
    function sicherung_anlegen($behalten_bis = 0, $konten = false) {   // behalten_bis (Unix-Zeit): so lange nicht wegräumen (Saison-Sicherung: 2 Wochen)
        $t0 = microtime(true);
        // alle Tabellen aus demselben Stand (fester Stand statt Welt-Sperre: der Weltrechner muss nicht warten)
        [$sp, $bo, $v, $k] = $this->fest_lesen(function () use ($konten) {
            return [$this->db->query('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = 0')->fetchAll(),
                $this->db->query('SELECT bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand FROM ow_bots WHERE spieler_id = 0')->fetchAll(),
                $this->db->query('SELECT version FROM ow_welt_info WHERE id = 1')->fetchColumn(),   // welcher Welt-Stand das ist
                $konten ? ['spieler' => $this->db->query('SELECT * FROM ow_spieler ORDER BY id')->fetchAll(),
                    'staende' => $this->db->query('SELECT spieler_id, schluessel, wert FROM ow_spielstand WHERE spieler_id > 0')->fetchAll(),
                    'bots' => $this->db->query('SELECT spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand FROM ow_bots WHERE spieler_id > 0')->fetchAll()] : null];
        });
        if (!sicherung_gueltig(['spielstand' => $sp, 'bots' => $bo])) return 0;   // eine leere/kaputte Welt verdrängt nie eine gute Sicherung
        $d = ['spielstand' => $sp, 'bots' => $bo, 'version' => (int)$v]; if ($k !== null) $d['konten'] = $k;
        unset($sp, $bo, $k);   // (Speicher früh freigeben)
        $j = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); unset($d);   // (ein alter Name mit kaputtem UTF-8 verhindert nie die ganze Sicherung)
        if ($j === false) return 0;
        $roh = strlen($j);
        $gz = gzencode($j, 3); unset($j);   // (Stufe 3: kaum größer als 6, aber viel weniger Rechenzeit auf dem geteilten Server)
        if ($gz === false || gzdecode($gz) === false) return 0;   // (nur ganz lesbare Sicherungen)
        $this->db->prepare('INSERT INTO ow_sicherungen (groesse, daten, behalten_bis, konten) VALUES (?, ?, ?, ?)')->execute([strlen($gz), $gz, (int)$behalten_bis, $konten ? 1 : 0]);
        $id = (int)$this->db->lastInsertId();
        $this->db->exec('DELETE FROM ow_sicherungen WHERE id <= ' . ($id - 48) . ' AND behalten_bis < ' . time());   // die letzten 48 bleiben (und die Saison-Sicherung 2 Wochen)
        $this->sicherung_info = ['ms' => (int)round((microtime(true) - $t0) * 1000), 'roh' => $roh, 'gz' => strlen($gz), 'konten' => (bool)$konten];
        return $id;
    }
    function letzte_sicherung_zeit($konten = false) { return (int)$this->db->query('SELECT UNIX_TIMESTAMP(MAX(erstellt)) FROM ow_sicherungen' . ($konten ? ' WHERE konten = 1' : ''))->fetchColumn(); }
    function sicherungen_liste() { return $this->db->query('SELECT id, erstellt, groesse, behalten_bis, konten FROM ow_sicherungen ORDER BY id DESC')->fetchAll(); }
    // Eine Sicherung zurückspielen (der Weltrechner muss dafür aus sein). Alle Teile bekommen eine neue Version → alle laden neu.
    // Vorher wird der jetzige Stand selbst gesichert (nichts geht still verloren – auch das Zurückspielen lässt sich zurückspielen).
    // Bereits ausgeführte Befehle bleiben quittiert (sie laufen nie ein zweites Mal), nicht ausgeführte warten weiter;
    // Auszahlungen, die der Weltrechner danach nochmal macht, haben feste Nummern und kommen nicht doppelt an.
    // $alles (6.10., nur mit Rückfrage im Admin, nur Sicherungen mit Konten): dazu die Spielerkonten und privaten Spielstände
    // (konten_zurueck). Ohne: nur die Welt wie bisher – die Spielstände der Spieler bleiben.
    function sicherung_zurueck($id, $alles = false) {
        $q = $this->db->prepare('SELECT daten, erstellt FROM ow_sicherungen WHERE id = ?'); $q->execute([(int)$id]); $z = $q->fetch() ?: ['daten' => '', 'erstellt' => ''];
        $d = json_decode((string)@gzdecode((string)$z['daten']), true); $damals = (string)$z['erstellt']; unset($z);
        if (!sicherung_gueltig($d) || ($alles && !konten_gueltig($d['konten'] ?? null))) return false;
        $vorher = $this->sicherung_anlegen(0, $alles);   // der jetzige Stand (bei „alles“ mit Konten) – ist er selbst kaputt (oft der Grund fürs Zurückspielen), gibt es keine
        if (!$vorher) error_log('Open Water: Zurückspielen ohne Vorab-Sicherung – der jetzige Stand ist nicht vollständig');   // Sicherung davon, aber das Zurückspielen geht
        $this->welt_sperren();
        try {
        $this->db->beginTransaction();
        $this->db->exec('DELETE FROM ow_spielstand WHERE spieler_id = 0');
        $this->db->exec('DELETE FROM ow_bots WHERE spieler_id = 0');
        $this->db->exec('DELETE FROM ow_welt_flicken');   // alte Änderungen passen nicht mehr zum zurückgespielten Stand
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (0, ?, ?)');
        foreach ($d['spielstand'] as $z) $s->execute([$z['schluessel'], $z['schluessel'] === 'openWaterSaison' ? saison_anhalten($z['wert'], (int)round(microtime(true) * 1000)) : $z['wert']]);   // (ein fälliger Saison-Reset wartet auf den Admin-Knopf)
        $b = $this->db->prepare('INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES (0, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($d['bots'] as $z) $b->execute([$z['bot_id'], $z['nr'], $z['stufe'], $z['muenzen'], $z['anzahl_basen'], $z['basen'], $z['zustand']]);
        $i = $this->welt_info(); $v = (int)$i['version'] + 1; $vs = [];
        foreach ($d['spielstand'] as $z) if ($z['schluessel'] !== '_bot_teile') $vs[$z['schluessel']] = $v;
        foreach (array_keys(self::BOT_TEILE) as $k) $vs[$k] = $v;
        foreach ($i['versionen'] as $k => $_) if (!isset($vs[$k])) $vs[$k] = $v;   // was es damals nicht gab: wird gelöscht
        $this->db->prepare('UPDATE ow_welt_info SET version = ?, versionen = ?, leiter_bis = 0, leiter_token = \'\', zurueck = ? WHERE id = 1')->execute([$v, json_encode($vs), (int)round(microtime(true) * 1000)]);   // (auch das Zeichen: ein alter Weltrechner darf nicht mehr schreiben)
        // Bezahlte Befehle, deren Wirkung erst NACH dieser Sicherung gespeichert wurde, fehlen jetzt in der Welt – das Handy hat sie
        // aber bezahlt: noch einmal ausführen (genau einmal: in der zurückgespielten Welt steckt ihre Wirkung ja nicht).
        // Alles andere (Angriffe, Märsche …) bleibt erledigt – die Welt ist eben wieder auf dem Stand von damals.
        // Nur die der Weltrechner damals angenommen hat (ok) – die laufen jetzt OHNE nochmal zu bezahlen (nach): bezahlt hat er schon,
        // und das Hauptbuch wird gerade an seinen Spielstand angeglichen (der die Zahlung schon enthält).
        // Bei „alles“ von den zurückgespielten Spielern nur die vor der Sicherung gegebenen: nur deren Zahlung steckt in ihrem Spielstand
        // von damals (spätere siehe konten_zurueck). Wer seitdem neu ist, behält seinen Spielstand – bei ihm wie bisher.
        $wer = $alles ? implode(',', array_map(function ($z) { return (int)$z['id']; }, $d['konten']['spieler'])) : '';
        if (isset($d['version'])) $this->db->prepare("UPDATE ow_befehle SET fertig = 0, fertig_v = NULL, nach = 1 WHERE fertig = 1 AND ok = 1 AND fertig_v > ? AND art IN ('" . implode("','", BEFEHLE_BEZAHLT) . "')" . ($alles ? " AND (erstellt <= ? OR spieler_id NOT IN ($wer))" : ''))->execute($alles ? [(int)$d['version'], $damals] : [(int)$d['version']]);
        if ($alles) $this->konten_zurueck($d['konten'], $damals);
        $this->db->commit();
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); $this->welt_entsperren(); throw $e; }   // ganz oder gar nicht
        $this->welt_entsperren();
        return true;
    }
    // Spielerkonten + private Spielstände aus einer Sicherung von $damals (in der Transaktion von sicherung_zurueck). Wer damals
    // schon da war, bekommt Konto und Spielstand von damals; wer sich seitdem angemeldet hat, bleibt unverändert. Nur Spalten, die es
    // heute noch gibt. Offene Spiele dieser Spieler müssen neu laden (spiel_token leer → „anderswo geöffnet“) – sonst schickte ein
    // offenes Handy seinen neueren Stand über den zurückgespielten. Genau einmal, bezogen auf den Stand von damals:
    //   - Nachrichten von damals, die sein Spielstand noch nicht verbucht hatte (Nummer über der höchsten in openWaterEreignisFertig),
    //     kommen wieder; spätere gehören zur zurückgedrehten Welt und verfallen
    //   - seine Befehle seit damals, die noch nicht ausgeführt sind, verfallen (ihre Zahlung ist mit dem Spielstand zurückgedreht)
    function konten_zurueck($k, $damals) {
        $q = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'");
        $heute = array_flip($q->fetchAll(PDO::FETCH_COLUMN)); $ids = [];
        foreach ($k['spieler'] as $z) {
            $z = array_intersect_key($z, $heute); unset($z['spiel_token'], $z['speicher_nr']);
            $sp = array_keys($z); $ids[] = (int)$z['id'];
            $this->db->prepare('INSERT INTO ow_spieler (' . implode(', ', $sp) . ', spiel_token, speicher_nr) VALUES (' . implode(', ', array_fill(0, count($sp), '?')) . ", '', 0)"
                . ' ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(function ($c) { return "$c = VALUES($c)"; }, array_diff($sp, ['id']))) . ", spiel_token = '', speicher_nr = 0")->execute(array_values($z));
        }
        $in = implode(',', $ids);
        $this->db->exec("DELETE FROM ow_spielstand WHERE spieler_id IN ($in)");
        $this->db->exec("DELETE FROM ow_bots WHERE spieler_id IN ($in)");
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (?, ?, ?)'); $fertig = [];
        foreach ($k['staende'] as $z) if (in_array((int)$z['spieler_id'], $ids, true)) {
            $s->execute([(int)$z['spieler_id'], $z['schluessel'], $z['wert']]);
            if ($z['schluessel'] === 'openWaterEreignisFertig') $fertig[(int)$z['spieler_id']] = max(array_merge([0], array_map('intval', (array)json_decode($z['wert'], true))));
        }
        $b = $this->db->prepare('INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($k['bots'] as $z) if (in_array((int)$z['spieler_id'], $ids, true)) $b->execute([(int)$z['spieler_id'], $z['bot_id'], $z['nr'], $z['stufe'], $z['muenzen'], $z['anzahl_basen'], $z['basen'], $z['zustand']]);
        $wieder = $this->db->prepare('UPDATE ow_ereignisse SET abgeholt = 0 WHERE spieler_id = ? AND id > ? AND erstellt <= ?');
        foreach ($ids as $uid) $wieder->execute([$uid, $fertig[$uid] ?? 0, $damals]);
        $this->db->prepare("UPDATE ow_ereignisse SET abgeholt = 1 WHERE spieler_id IN ($in) AND erstellt > ?")->execute([$damals]);
        $this->db->prepare("UPDATE ow_befehle SET fertig = 1 WHERE fertig = 0 AND spieler_id IN ($in) AND erstellt > ?")->execute([$damals]);
    }
    // Wie groß wäre der Spielstand eines Spielers mit diesen neuen Teilen? (Bytes)
    function groesse_nach($uid, $setzen) {
        $q = $this->db->prepare('SELECT schluessel, LENGTH(wert) l FROM ow_spielstand WHERE spieler_id = ?'); $q->execute([$uid]);
        $g = []; foreach ($q as $z) $g[$z['schluessel']] = (int)$z['l'];
        foreach ($setzen as $k => $v) $g[$k] = strlen($v);
        return array_sum($g);
    }
    // Erledigtes (nach einer Weile), alte Befehle (niemand hat gerechnet) und nie abgeholte Nachrichten. Bezahlte Befehle bleiben
    // erledigt 14 Tage stehen (Zurückspielen holt sie nach – auch die Saison-Sicherung, die 2 Wochen bleibt), unerledigt 7 Tage; abgeholte
    // Nachrichten 3 Tage (so lange erkennt der Server eine feste Nummer nach dem Zurückspielen wieder)
    function aufraeumen() {
        $bez = "'" . implode("','", BEFEHLE_BEZAHLT) . "'";
        $this->db->exec("DELETE FROM ow_befehle WHERE (art IS NULL OR art NOT IN ($bez)) AND ((fertig = 1 AND erstellt < NOW() - INTERVAL 1 HOUR) OR erstellt < NOW() - INTERVAL 1 DAY)");
        $this->db->exec("DELETE FROM ow_befehle WHERE art IN ($bez) AND ((fertig = 1 AND erstellt < NOW() - INTERVAL 14 DAY) OR erstellt < NOW() - INTERVAL 7 DAY)");
        $this->db->exec('DELETE FROM ow_ereignisse WHERE (abgeholt = 1 AND erstellt < NOW() - INTERVAL 3 DAY) OR erstellt < NOW() - INTERVAL 60 DAY');
    }
    // Befehle: das Handy gibt jedem eine Nummer (cid) – kommt er wegen einer Wiederholung nochmal, wird er nicht nochmal abgelegt.
    // Gelöscht wird erst, wenn der Weltrechner quittiert hat, dass die Wirkung in der gespeicherten Welt steht (befehle_quittieren).
    function befehl_ablegen($uid, $b, $cid = null) { $a = json_decode($b, true); $art = is_array($a) && is_string($a['art'] ?? null) ? substr($a['art'], 0, 16) : null;
        $this->db->prepare('INSERT IGNORE INTO ow_befehle (spieler_id, befehl, cid, art) VALUES (?, ?, ?, ?)')->execute([$uid, $b, $cid, $art]); }
    function offene_befehle($uid) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_befehle WHERE spieler_id = ? AND fertig = 0'); $q->execute([$uid]); return (int)$q->fetchColumn(); }
    function befehle_offen() { return (int)$this->db->query('SELECT IFNULL(SUM(LEAST(c, 40)), 0) FROM (SELECT COUNT(*) c FROM ow_befehle WHERE fertig = 0 GROUP BY spieler_id) x')->fetchColumn(); }   // (je Spieler höchstens 40 – wie befehle_gerecht abholt)
    function befehle_quittieren($ids) {   // genau diese Nummern (nicht „alles bis“: eine kleinere Nummer kann später eingetragen sein)
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, 0, 2000)), function ($x) { return $x > 0; })));
        $v = (int)$this->db->query('SELECT version FROM ow_welt_info WHERE id = 1')->fetchColumn();   // (die Wirkung steckt in der Welt bis einschließlich dieser Version)
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_befehle SET fertig = 1, fertig_v = ? WHERE fertig = 0 AND id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute(array_merge([$v], $t));
    }
    function befehle_bezahlt_ok($ids) {   // der Weltrechner hat diese bezahlten Befehle angenommen (nur die werden nach dem Zurückspielen nachgeholt)
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, 0, 2000)), function ($x) { return $x > 0; })));
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_befehle SET ok = 1 WHERE id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute($t);
    }
    function befehle_abholen() {
        // zu alt: die Lage hat sich geändert (Angriffe, Märsche …). Bezahlte (Ausbau, Hauptstadt, Beschleunigen, Truppen) und
        // Admin-Befehle verfallen NIE so – war der Weltrechner länger aus, holt er sie nach (sonst wäre Bezahltes weg)
        $this->db->exec("DELETE FROM ow_befehle WHERE fertig = 0 AND spieler_id <> 0 AND erstellt < NOW() - INTERVAL 10 MINUTE AND (art IS NULL OR art NOT IN ('" . implode("','", BEFEHLE_BEZAHLT) . "'))");
        // _id: seine Nummer (der Weltrechner meldet damit „bezahlt angenommen“), _nach: nach dem Zurückspielen nachgeholt – schon bezahlt
        // _t: wann der Server ihn bekam (ms) – stammt das Profil, an dem der Weltrechner sein Konto geeicht hat, von danach, steckt
        // die Zahlung schon darin (Hauptbuch: nicht nochmal abbuchen)
        return array_map(function ($z) { $b = json_decode($z['befehl']); if (is_object($b)) { $b->_id = (int)$z['id']; $b->_t = (int)$z['t'] * 1000; if ((int)$z['nach']) $b->_nach = 1; }
                return ['id' => (int)$z['id'], 'von' => (int)$z['spieler_id'], 'b' => $b]; },
            $this->befehle_gerecht());
    }
    // gerecht: höchstens 40 je Spieler pro Abholen – einer, der hunderte schickt (die beim Weltrechner warten), verstopft nie die der anderen
    function befehle_gerecht() {
        try { return $this->db->query('SELECT id, spieler_id, befehl, nach, t FROM (SELECT id, spieler_id, befehl, nach, UNIX_TIMESTAMP(erstellt) t, ROW_NUMBER() OVER (PARTITION BY spieler_id ORDER BY id) nr FROM ow_befehle WHERE fertig = 0) x WHERE nr <= 40 ORDER BY id LIMIT 500')->fetchAll(); }
        catch (Throwable $e) { return $this->db->query('SELECT id, spieler_id, befehl, nach, UNIX_TIMESTAMP(erstellt) t FROM ow_befehle WHERE fertig = 0 ORDER BY id LIMIT 500')->fetchAll(); }   // (alte Datenbank ohne ROW_NUMBER)
    }
    // Nachrichten: der Weltrechner gibt jeder eine Nummer (mid) – nach einer verlorenen Antwort schickt er sie nochmal, abgelegt
    // wird sie trotzdem nur einmal. Abgeholt ist sie erst, wenn der Spieler sie in seinem Spielstand verbucht hat
    // (openWaterEreignisFertig: die Nummern der zuletzt verbuchten, siehe speichern_anfrage) – stirbt die Seite vorher, kommt
    // sie beim nächsten Laden wieder.
    function ereignis_ablegen($uid, $e, $mid = null) { $this->db->prepare('INSERT IGNORE INTO ow_ereignisse (spieler_id, ereignis, mid) VALUES (?, ?, ?)')->execute([$uid, $e, $mid]); }
    function ereignisse_abholen($uid) {
        $q = $this->db->prepare('SELECT id, ereignis FROM ow_ereignisse WHERE spieler_id = ? AND abgeholt = 0 ORDER BY id LIMIT 200');
        $q->execute([$uid]);
        $raus = []; $kaputt = [];
        foreach ($q->fetchAll() as $z) { $e = json_decode($z['ereignis']); if (is_object($e)) { $e->_eid = (int)$z['id']; $raus[] = $e; } else $kaputt[] = (int)$z['id']; }
        if ($kaputt) $this->ereignisse_verbucht($uid, $kaputt);   // unlesbar (kann nie wirken): nicht ewig im Fenster der 200 stehen lassen
        return $raus;
    }
    function ereignisse_verbucht($uid, $ids) {
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, -1000)), function ($x) { return $x > 0; })));
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_ereignisse SET abgeholt = 1 WHERE spieler_id = ? AND abgeholt = 0 AND id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute(array_merge([$uid], $t));
    }
    // ===== Handy-Benachrichtigungen (Web-Push) =====
    // Ein Gerät gehört immer dem, der sich dort zuletzt angemeldet hat (gleiches Gerät, anderes Konto → wird umgeschrieben).
    function push_speichern($uid, $endpoint, $p256dh, $auth, $sitzung = '') {
        $this->db->prepare('INSERT INTO ow_push (spieler_id, endpoint_hash, endpoint, p256dh, auth, sitzung) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE spieler_id = VALUES(spieler_id), endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth), sitzung = VALUES(sitzung), erstellt = CURRENT_TIMESTAMP')
            ->execute([$uid, hash('sha256', $endpoint), $endpoint, $p256dh, $auth, $sitzung]);
        // höchstens 10 Geräte pro Spieler: die ältesten fliegen raus
        $q = $this->db->prepare('SELECT id FROM ow_push WHERE spieler_id = ? ORDER BY erstellt DESC, id DESC LIMIT 100 OFFSET 10');
        $q->execute([$uid]);
        foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) $this->db->prepare('DELETE FROM ow_push WHERE id = ?')->execute([(int)$id]);
    }
    function push_weg_sitzung($sitzung) { $this->db->prepare('DELETE FROM ow_push WHERE sitzung = ?')->execute([$sitzung]); }
    function push_sitzung($uid, $endpoint, $sitzung) { $this->db->prepare('UPDATE ow_push SET sitzung = ? WHERE spieler_id = ? AND endpoint_hash = ?')->execute([$sitzung, $uid, hash('sha256', $endpoint)]); }
    function push_abmelden($uid, $endpoint) { $this->db->prepare('DELETE FROM ow_push WHERE spieler_id = ? AND endpoint_hash = ?')->execute([$uid, hash('sha256', $endpoint)]); }
    function push_hat($uid, $endpoint) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_push WHERE spieler_id = ? AND endpoint_hash = ?'); $q->execute([$uid, hash('sha256', $endpoint)]); return (int)$q->fetchColumn() > 0; }
    function push_aus($uid) { $q = $this->db->prepare('SELECT push_aus FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); $v = (string)$q->fetchColumn(); return $v === '' ? [] : explode(',', $v); }
    function push_aus_setzen($uid, $arten) { $this->db->prepare('UPDATE ow_spieler SET push_aus = ? WHERE id = ?')->execute([implode(',', $arten), $uid]); }
    function pw_hash_von($uid) { $q = $this->db->prepare('SELECT pw_hash FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); return (string)$q->fetchColumn(); }
    function pw_setzen($uid, $hash) { $this->db->prepare('UPDATE ow_spieler SET pw_hash = ? WHERE id = ?')->execute([$hash, $uid]); }
    function andere_sitzungen_loeschen($uid, $behalten) { $this->db->prepare('DELETE FROM ow_sitzungen WHERE spieler_id = ? AND token_hash <> ?')->execute([$uid, $behalten]); }
    function push_anzahl($uid) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_push WHERE spieler_id = ?'); $q->execute([$uid]); return (int)$q->fetchColumn(); }
    function push_alle() {   // nur für den Weltrechner
        return array_map(function ($z) { return ['id' => (int)$z['id'], 'uid' => (int)$z['spieler_id'], 'endpoint' => $z['endpoint'], 'p256dh' => $z['p256dh'], 'auth' => $z['auth'],
                'aus' => $z['push_aus'] === '' || $z['push_aus'] === null ? [] : explode(',', $z['push_aus'])]; },
            $this->db->query('SELECT p.id, p.spieler_id, p.endpoint, p.p256dh, p.auth, s.push_aus FROM ow_push p LEFT JOIN ow_spieler s ON s.id = p.spieler_id ORDER BY p.id LIMIT 20000')->fetchAll());
    }
    function push_alle_weg($uid, $ausser = '') { $this->db->prepare('DELETE FROM ow_push WHERE spieler_id = ? AND endpoint_hash <> ?')->execute([$uid, $ausser === '' ? '' : hash('sha256', $ausser)]); }
    function push_weg($ids) { $q = $this->db->prepare('DELETE FROM ow_push WHERE id = ?'); foreach ($ids as $id) $q->execute([(int)$id]); }
    // Nebel (3B): Sicht eines Spielers – Bitfeld vom Weltrechner + seine eigenen Basen (aus der Welt) → für nebel_sieht
    function sicht_laden($uid) {
        $q = $this->db->prepare('SELECT sicht, sicht_v, armee_sicht FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); $z = $q->fetch() ?: ['sicht' => null, 'sicht_v' => 0, 'armee_sicht' => null];
        $q = $this->db->prepare('SELECT basen FROM ow_bots WHERE spieler_id = 0 AND bot_id = ?'); $q->execute(['u' . (int)$uid]);
        $eigen = []; foreach ((array)json_decode((string)$q->fetchColumn(), true) as $id) if (is_numeric($id)) $eigen[(int)$id] = true;
        $bits = $z['sicht'] !== null ? (string)base64_decode((string)$z['sicht'], true) : '';
        $armeen = []; foreach ((array)json_decode((string)$z['armee_sicht'], true) as $id) if (is_string($id)) $armeen[$id] = true;   // fremde Armeen/Felder, die er sieht (Weltrechner)
        return ['bits' => $bits, 'eigen' => $eigen, 'v' => (int)$z['sicht_v'], 'armeen' => $armeen];
    }
    function armee_sicht_setzen($uid, $json) { $this->db->prepare('UPDATE ow_spieler SET armee_sicht = ?, sicht_v = sicht_v + 1 WHERE id = ? AND (armee_sicht IS NULL OR armee_sicht <> ?)')->execute([$json, $uid, $json]); }   // (geändert: neue Sicht → Teile ganz)
    function sicht_setzen($uid, $b64) { $this->db->prepare('UPDATE ow_spieler SET sicht = ?, sicht_v = sicht_v + 1 WHERE id = ? AND (sicht IS NULL OR sicht <> ?)')->execute([$b64, $uid, $b64]); }   // (gleich geblieben: nichts)
    function profil_setzen($uid, $p, $abstand = 8000) { $j = (int)round(microtime(true) * 1000);   // höchstens ein Profil je 8 s (ehrliche Handys: alle 10 s – sonst bis 150/Min. an alle Handys und den Weltrechner)
        $q = $this->db->prepare('UPDATE ow_spieler SET profil = ?, profil_zeit = ? WHERE id = ? AND profil_zeit <= ?'); $q->execute([$p, $j, $uid, $j - $abstand]); return $q->rowCount() > 0; }   // (ms: zwei Profile in derselben Sekunde gehen nicht verloren)
    // Puls zählen (zugleich „online“ setzen) – gibt zurück, wie viele Pulse in dieser Minute schon kamen
    function puls_zaehlen($uid, $jetzt) {
        $m = intdiv($jetzt, 60);
        $this->db->prepare('UPDATE ow_spieler SET online_bis = ?, puls_anzahl = IF(puls_minute = ?, puls_anzahl + 1, 1), puls_minute = ? WHERE id = ?')->execute([$jetzt + 20, $m, $m, $uid]);
        $q = $this->db->prepare('SELECT puls_anzahl FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); return (int)$q->fetchColumn();
    }
    // Alle echten Spieler (für die Karte), Profile nur wenn neuer als $seit – mit 5 s Überlappung: profil_zeit steht schon vor dem
    // Speichern fest, ein Profil kann also nach einem neueren sichtbar werden (doppelte übernimmt welt.js nicht ein zweites Mal).
    // $ganz = false: nur, wer gerade online ist, eben offline ging (30 s) oder ein neues Profil hat – die ganze Liste holt das Handy alle ~10 s
    const SPIELER_UEBERLAPPUNG = 5000;
    function spieler_liste($seit, $alles = false, $ganz = true) {   // $alles: Weltrechner (sieht Münzen und Verwundete der anderen)
        $ab = (int)$seit > 0 ? (int)$seit - self::SPIELER_UEBERLAPPUNG : 0;
        $q = $this->db->prepare('SELECT id, COALESCE(anzeigename, CONCAT(\'Spieler \', id)) name, online_bis, profil_zeit, IF(profil_zeit > ?, profil, NULL) profil FROM ow_spieler'
            . ($ganz ? '' : ' WHERE online_bis > ? OR profil_zeit > ?'));
        $q->execute($ganz ? [$ab] : [$ab, time() - 30, $ab]);
        return array_map(function ($z) use ($alles) {
            $p = $z['profil'] !== null ? json_decode($z['profil'], false, 12) : null;
            if ($p && !$alles) $p = profil_oeffentlich($p);   // Münzen, Verwundete, Rohstoffe, Gems, Helden, Ausrüstung, Fähigkeiten, Stadt anderer sieht nur der Weltrechner
            return ['id' => (int)$z['id'], 'name' => $z['name'], 'online' => (int)$z['online_bis'] > time(), 'profil_zeit' => (int)$z['profil_zeit'], 'profil' => $p]; }, $q->fetchAll());
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
    if (($_SERVER['HTTP_X_OPEN_WATER'] ?? '') !== '1') json_antwort(403, ['fehler' => 'falscher Aufruf']);
    if (!system_zugang() && !herkunft_ok()) json_antwort(403, ['fehler' => 'falscher Aufruf']);   // nur aus dem Spiel (fremde Seiten dürfen diese Kopfzeile nicht setzen)

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
        if (strpos($aktion, 'push_') === 0) push_anfrage($ich, $d, $aktion);   // Handy-Benachrichtigungen (eigener Teil, siehe unten)
        if (!empty($ich['system']) && $aktion === 'befehle_da') json_antwort(200, ['offen' => lager()->befehle_offen()]);   // (Weltrechner: liegen Befehle da? dann gleich ein Puls)
        if (!empty($ich['system']) && $aktion !== 'puls') json_antwort(200, ['ok' => true]);   // der Weltrechner hat keinen eigenen Spielstand
        if ($aktion === 'name') name_anfrage($ich, $d);
        if ($aktion === 'passwort') passwort_anfrage($ich, $d);
        if ($aktion === 'puls') { if (wartung()) json_antwort(503, ['fehler' => 'wartung']); welt_puls($ich, $d); }   // Wartung gilt für alle
        $t1 = microtime(true);
        lager()->sperren($ich['id']);   // Laden (spiel.php) wartet, bis diese Sicherung drin ist
        if (!hash_equals(lager()->spiel_token($ich['id']), (string)($d['token'] ?? ''))) json_antwort(409, ['fehler' => 'anderswo geöffnet']);

        $setzen = [];
        foreach ((array)($d['setzen'] ?? []) as $k => $v) {
            if (!is_string($k) || !preg_match('/^openWater[A-Za-z0-9_]{1,90}$/', $k) || !is_string($v)) json_antwort(400, ['fehler' => 'ungültig']);
            if (in_array($k, ['openWaterBotState', 'openWaterBotCoins', 'openWaterBotOwnedIslands'], true)) continue;   // Welt-Teile schickt ein Handy nie (speichern.js) – sonst tausende Zeilen in ow_bots je Speichern
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
        if (lager()->groesse_nach($ich['id'], $setzen) > 40 * 1024 * 1024) json_antwort(413, ['fehler' => 'Spielstand zu groß']);   // höchstens 40 MB pro Konto
        $t2 = microtime(true);
        $L = lager(); $L->tx_anfang();   // Nummer + Spielstand + „verbucht“: ganz oder gar nicht
        try {
            if (!$L->speicher_nr_ok($ich['id'], (int)($d['nr'] ?? 0))) { $L->tx_ende(); if (!empty($d['abschied'])) $L->abschied_setzen($ich['id'], (string)$d['token']); json_antwort(200, ['ok' => true, 'alt' => true]); }   // eine neuere war schneller (sie enthält alles hiervon)
            $L->stand_schreiben($ich['id'], $setzen, $loeschen);
            if (isset($setzen['openWaterEreignisFertig'])) $L->ereignisse_verbucht($ich['id'], json_decode($setzen['openWaterEreignisFertig'], true));   // diese Nachrichten stehen jetzt in seinem Spielstand
            $L->tx_ende();
        } catch (Throwable $e) { $L->tx_abbruch(); throw $e; }
        header(sprintf('Server-Timing: lesen;dur=%d, warten;dur=%d, schreiben;dur=%d', ($t1 - $t0) * 1000, ($t2 - $t1) * 1000, (microtime(true) - $t2) * 1000));
        if (!empty($d['abschied'])) lager()->abschied_setzen($ich['id'], (string)$d['token']);   // Fenster wird geschlossen/neu geladen
        json_antwort(200, ['ok' => true]);
    } catch (Throwable $e) {
        error_log('Open Water Speichern: ' . $e->getMessage());
        json_antwort(500, ['fehler' => 'server']);   // (503 heißt nur noch Wartung – ein kurzer Fehler wirft niemanden raus)
    }
}

// ===== Handy-Benachrichtigungen (Web-Push) =====
// Spieler (nur mit Login):  push_info → {an, schluessel}   push_an {abo:{endpoint, keys:{p256dh, auth}}}   push_ab {endpoint}
// Weltrechner (nur mit X-Weltrechner-Schlüssel): push_abos → alle Abos + VAPID-Schlüssel + Admin-Nummern   push_weg {ids} (abgelaufene Abos)
// Gesendet wird vom Weltrechner (weltrechner/push.js).
// VAPID-Schlüssel: aus config.php (vapid_public/vapid_private), sonst erzeugt der Server sie EINMAL selbst und legt sie in
// weltrechner/vapid.php ab (von außen 404, nie im Git, hochladen.sh überschreibt sie nie) – sie ändern sich also nie.
function push_schluessel_ok($pub, $priv) { return preg_match('/^[A-Za-z0-9_-]{87}$/', (string)$pub) && preg_match('/^[A-Za-z0-9_-]{42,43}$/', (string)$priv); }
function b64url($b) { return rtrim(strtr(base64_encode($b), '+/', '-_'), '='); }
function push_schluessel() {
    static $s = false;
    if ($s !== false) return $s;
    $c = cfg();
    if (push_schluessel_ok($c['vapid_public'] ?? '', $c['vapid_private'] ?? '')) return $s = ['public' => $c['vapid_public'], 'private' => $c['vapid_private']];
    $f = __DIR__ . '/weltrechner/vapid.php';
    $lesen = function () use ($f) {
        $t = @file_get_contents($f); if ($t === false) return null;
        $i = strpos($t, '?>'); $v = json_decode($i === false ? $t : substr($t, $i + 2), true);
        return is_array($v) && push_schluessel_ok($v['public'] ?? '', $v['private'] ?? '') ? ['public' => $v['public'], 'private' => $v['private']] : null;
    };
    if ($v = $lesen()) return $s = $v;
    if (!function_exists('openssl_pkey_new') || !is_dir(dirname($f))) return $s = null;
    $h = @fopen(__DIR__ . '/weltrechner/vapid_sperre.php', 'c'); if (!$h || !flock($h, LOCK_EX)) return $s = null;   // nie zwei gleichzeitig erzeugen
    try {
        if ($v = $lesen()) return $s = $v;
        if (is_file($f)) { error_log('Open Water Push: vapid.php kaputt – nicht überschrieben'); return $s = null; }   // nie still neue Schlüssel
        $k = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $d = $k ? openssl_pkey_get_details($k) : null;
        if (!$d || empty($d['ec']['d']) || empty($d['ec']['x']) || empty($d['ec']['y'])) return $s = null;
        $pad = function ($b) { return str_pad($b, 32, "\0", STR_PAD_LEFT); };
        $v = ['public' => b64url("\x04" . $pad($d['ec']['x']) . $pad($d['ec']['y'])), 'private' => b64url($pad($d['ec']['d'])), 'erzeugt' => date('c')];
        if (!push_schluessel_ok($v['public'], $v['private'])) return $s = null;
        $alt = umask(077);
        $ok = file_put_contents(__DIR__ . '/weltrechner/vapid_neu.php', "<?php http_response_code(404); exit; ?>\n" . json_encode($v)) !== false && rename(__DIR__ . '/weltrechner/vapid_neu.php', $f);
        umask($alt);
        return $s = $ok ? ['public' => $v['public'], 'private' => $v['private']] : null;
    } finally { flock($h, LOCK_UN); fclose($h); }
}
function b64url_bytes($s) {   // Länge in Byte, wenn $s sauberes base64url ist – sonst -1
    if (!is_string($s) || !preg_match('/^[A-Za-z0-9_-]{1,200}$/', $s)) return -1;
    $b = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    return $b === false ? -1 : strlen($b);
}
// Nur https-Adressen der bekannten Push-Dienste (sonst könnte man den Weltrechner Anfragen an beliebige Adressen schicken lassen)
function push_endpoint_ok($e) {
    if (!is_string($e) || strlen($e) > 800 || !preg_match('#^https://[A-Za-z0-9._~:/?\#\[\]@!$&\'()*+,;=%-]+$#', $e)) return false;
    $u = parse_url($e);
    if (!$u || ($u['scheme'] ?? '') !== 'https' || isset($u['user']) || isset($u['pass']) || (isset($u['port']) && (int)$u['port'] !== 443)) return false;
    $h = strtolower((string)($u['host'] ?? ''));
    return (bool)preg_match('/^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/', $h);
}
const PUSH_ARTEN = ['angriff', 'spaeher', 'verloren', 'boss', 'sammler', 'schild', 'invasion', 'drache', 'hilfe', 'rally', 'haendler', 'bau', 'forschung'];   // die Arten von Handy-Nachrichten (weltrechner/push.js)
function push_anfrage($ich, $d, $aktion) {
    $l = lager();
    $s = push_schluessel();
    if (!empty($ich['system'])) {   // der Weltrechner
        if ($aktion === 'push_abos') json_antwort(200, $s ? ['an' => true, 'public' => $s['public'], 'private' => $s['private'], 'sub' => (string)(cfg()['spiel_url'] ?? 'mailto:admin@hobbitonhill.de'), 'abos' => $l->push_alle(), 'admins' => array_values(array_map('intval', (array)(cfg()['admin_ids'] ?? [])))] : ['an' => false]);   // (admins: Schummel-Verdacht geht an diese Konten)
        if ($aktion === 'push_weg') { $l->push_weg(array_slice(array_filter(array_map('intval', (array)($d['ids'] ?? []))), 0, 500)); json_antwort(200, ['ok' => true]); }
        json_antwort(400, ['fehler' => 'unbekannt']);
    }
    $uid = (int)$ich['id'];
    if ($aktion === 'push_info') {   // mit endpoint: ist dieses Gerät für mich eingetragen? (sonst trägt das Spiel es neu ein)
        $e = $d['endpoint'] ?? null; $dieses = is_string($e) && strlen($e) <= 800 ? $l->push_hat($uid, $e) : false;
        if ($dieses && sitzung_hash() !== '') $l->push_sitzung($uid, $e, sitzung_hash());   // (ältere Einträge: an dieses Login binden)
        json_antwort(200, ['an' => (bool)$s, 'schluessel' => $s ? $s['public'] : null, 'geraete' => $l->push_anzahl($uid), 'aus' => $l->push_aus($uid),
            'dieses' => $dieses]);
    }
    if (!bremse('push:' . $uid, 30, 3600)) json_antwort(429, ['fehler' => 'Zu viele Versuche – bitte später nochmal.']);
    if ($aktion === 'push_an') {
        if (!$s) json_antwort(200, ['ok' => false, 'grund' => 'Benachrichtigungen sind auf dem Server noch nicht eingeschaltet.']);
        $a = $d['abo'] ?? null;
        $j = json_encode($a);
        if (!is_array($a) || $j === false || strlen($j) > 2000) json_antwort(400, ['fehler' => 'ungültig']);
        $e = $a['endpoint'] ?? ''; $p = $a['keys']['p256dh'] ?? ''; $au = $a['keys']['auth'] ?? '';
        if (!push_endpoint_ok($e)) json_antwort(200, ['ok' => false, 'grund' => 'Dieser Push-Dienst wird nicht unterstützt.']);
        if (b64url_bytes($p) !== 65 || b64url_bytes($au) !== 16) json_antwort(400, ['fehler' => 'ungültig']);
        $l->push_speichern($uid, $e, $p, $au, sitzung_hash());
        json_antwort(200, ['ok' => true]);
    }
    if ($aktion === 'push_arten') {   // Einstellungen: welche Arten von Nachrichten will er NICHT
        $aus = array_values(array_intersect(PUSH_ARTEN, array_map('strval', (array)($d['aus'] ?? []))));
        $l->push_aus_setzen($uid, $aus);
        json_antwort(200, ['ok' => true, 'aus' => $aus]);
    }
    if ($aktion === 'push_ab') {
        $e = $d['endpoint'] ?? '';
        if (is_string($e) && strlen($e) <= 800) $l->push_abmelden($uid, $e);
        json_antwort(200, ['ok' => true]);
    }
    json_antwort(400, ['fehler' => 'unbekannt']);
}

// ===== Passwort ändern (Einstellungen): altes Passwort nötig; danach sind alle anderen Geräte abgemeldet =====
function passwort_anfrage($ich, $d) {
    $l = lager();
    if (!bremse('pw:' . $ich['id'], 5, 900)) json_antwort(200, ['ok' => false, 'grund' => 'Zu viele Versuche – bitte in 15 Minuten nochmal.']);
    $alt = (string)($d['alt'] ?? ''); $neu = (string)($d['neu'] ?? '');
    if (strlen($alt) > 200 || !password_verify($alt, $l->pw_hash_von($ich['id']))) json_antwort(200, ['ok' => false, 'grund' => 'Das alte Passwort stimmt nicht.']);
    if (mb_strlen($neu) < 10 || strlen($neu) > 72) json_antwort(200, ['ok' => false, 'grund' => 'Das neue Passwort braucht 10 bis 72 Zeichen.']);
    if ($neu === $alt) json_antwort(200, ['ok' => false, 'grund' => 'Das neue Passwort ist dasselbe wie das alte.']);
    $l->pw_setzen($ich['id'], password_hash($neu, PASSWORD_DEFAULT));
    // neues Passwort: Handy-Nachrichten an die ANDEREN Geräte hören auf (wie ihre Sitzungen) – dieses Gerät behält sie
    $geraet = is_string($d['geraet'] ?? null) && strlen($d['geraet']) < 1000 ? $d['geraet'] : '';
    try { $l->push_alle_weg($ich['id'], $geraet); } catch (Throwable $e) {}
    $t = $_COOKIE[COOKIE_NAME] ?? '';
    $l->andere_sitzungen_loeschen($ich['id'], is_string($t) ? hash('sha256', $t) : '');
    json_antwort(200, ['ok' => true]);
}

// ===== Spielername wählen (Willkommen-Fenster) =====
function name_anfrage($ich, $d) {
    $l = lager();
    if (!hash_equals($l->spiel_token($ich['id']), (string)($d['token'] ?? ''))) json_antwort(409, ['fehler' => 'anderswo geöffnet']);
    $name = trim(preg_replace('/\s+/u', ' ', (string)($d['name'] ?? '')));
    // nur lateinische Buchstaben (auch Umlaute) – keine Doppelgänger wie kyrillisches „а“ in „аlexander“
    if (!name_erlaubt($name)) json_antwort(200, ['ok' => false, 'grund' => 'Der Name braucht 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).']);
    if (!bremse('name:' . $ich['id'], 10, 3600)) json_antwort(200, ['ok' => false, 'grund' => 'Zu viele Versuche – bitte später nochmal.']);
    $klein = mb_strtolower($name, 'UTF-8');
    foreach (bot_namen() as $bn) if (mb_strtolower($bn, 'UTF-8') === $klein) json_antwort(200, ['ok' => false, 'grund' => 'Diesen Namen hat schon jemand.']);
    if (!$l->name_frei($ich['id'], $name) || !$l->anzeigename_setzen($ich['id'], $name)) json_antwort(200, ['ok' => false, 'grund' => 'Diesen Namen hat schon jemand.']);
    json_antwort(200, ['ok' => true, 'name' => $name]);
}

// ===== Puls der EINEN Welt (alle ~2 s von jedem Spieler) =====
// Anfrage:  {aktion:"puls", token, seit, spieler_seit, befehle:[…], profil?, welt?:{setzen,loeschen,welt_zeit}, ereignisse?:[{an, e}]}
//           welt/ereignisse schickt nur der Weltrechner.
// Antwort:  {leiter, version, welt:{setzen,loeschen}, befehle:[{von,b}] (nur Weltrechner), ereignisse:[…], spieler:[…]}
// Weltrechner ist nur der Server-Weltrechner (weltrechner/start.js) – nie das Gerät eines Spielers.
const LEITER_SEK = 45;   // so lange gilt der Weltrechner nach seinem letzten Puls als „läuft“ (bei Last dauert ein Puls 15–30 s; einen Absturz erkennt der Wachhund am Herzschlag)
const LEITER_SEK_LAST = 180;   // höchstens so lange, wenn der Server überlastet ist (6.10.: Puls bis 93 s)
// Wie lange gilt die Leitung? Dauerte diese Anfrage lange (Server überlastet), kommt auch der nächste Puls später: doppelte Dauer,
// mindestens LEITER_SEK, höchstens LEITER_SEK_LAST – sonst sähen alle Spieler unnötig „Verbindung wird wiederhergestellt …“
function leiter_sek($dauer) { return (int)min(LEITER_SEK_LAST, max(LEITER_SEK, 2 * $dauer)); }
const SAISON_SICHERUNG_SEK = 14 * 86400;   // die Sicherung vor einer neuen Welt-Saison bleibt 2 Wochen (Alexander 5.10.)
// Eine Sicherung ist nur gültig, wenn sie ganz ist: Welt-Teile (Schlüssel + gültiges JSON) und Mitspieler vorhanden.
function sicherung_gueltig($d) {
    if (!is_array($d) || empty($d['spielstand']) || !is_array($d['spielstand']) || empty($d['bots']) || !is_array($d['bots'])) return false;
    $keys = [];
    foreach ($d['spielstand'] as $z) { if (!isset($z['schluessel'], $z['wert']) || !is_string($z['wert']) || json_decode($z['wert']) === null && $z['wert'] !== 'null') return false; $keys[$z['schluessel']] = 1; }
    foreach ($d['bots'] as $z) if (!isset($z['bot_id']) || !array_key_exists('basen', $z) || !array_key_exists('zustand', $z)) return false;
    return isset($keys['openWaterIslandTroops'], $keys['openWaterKarte']);   // die Karte und die Truppen gehören immer dazu
}
// Konten-Teil einer Sicherung (6.10.): Spieler mit Nummer, Name und Passwort-Prüfwert; Spielstände/Mitspieler je Spieler (> 0)
function konten_gueltig($k) {
    if (!is_array($k) || !isset($k['spieler'], $k['staende'], $k['bots']) || !is_array($k['spieler']) || !$k['spieler'] || !is_array($k['staende']) || !is_array($k['bots'])) return false;
    foreach ($k['spieler'] as $z) {
        if (!is_array($z) || !((int)($z['id'] ?? 0) > 0) || !is_string($z['name'] ?? null) || !is_string($z['pw_hash'] ?? null) || $z['pw_hash'] === '') return false;
        foreach (array_keys($z) as $c) if (!preg_match('/^[a-z_]{1,40}$/', (string)$c)) return false;   // (die Spaltennamen kommen ins SQL)
    }
    foreach ($k['staende'] as $z) if (!is_array($z) || !((int)($z['spieler_id'] ?? 0) > 0) || !is_string($z['schluessel'] ?? null) || !is_string($z['wert'] ?? null)) return false;
    foreach ($k['bots'] as $z) if (!is_array($z) || !((int)($z['spieler_id'] ?? 0) > 0) || !isset($z['bot_id']) || !array_key_exists('basen', $z) || !array_key_exists('zustand', $z)) return false;
    return true;
}
// Welt-Saison nach dem Zurückspielen (Alexander 5.10.): war in der Sicherung der Reset schon fällig (Termin vorbei oder Admin-Knopf),
// würde der Weltrechner sofort wieder neu beginnen – das Zurückspielen wäre umsonst. Dann ist der Reset ANGEHALTEN (halt), bis der
// Admin „Neue Saison jetzt beginnen“ drückt (09f-saison.js saisonTakt). $wert: openWaterSaison (JSON) → derselbe oder angehalten.
function saison_anhalten($wert, $jetzt_ms) {
    $s = json_decode((string)$wert, true);
    if (!is_array($s) || !((int)($s['nr'] ?? 0) > 0) || (empty($s['jetzt']) && (float)($s['ende'] ?? 0) > $jetzt_ms)) return $wert;   // (nicht fällig: bleibt)
    unset($s['jetzt']); $s['halt'] = ['seit' => (int)$jetzt_ms, 'grund' => 'sicherung'];
    return json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function welt_puls($ich, $d) {
    $l = lager();
    $uid = $ich['id'];
    $sys = !empty($ich['system']);
    $tok = (string)($d['token'] ?? '');
    if (!$sys && !hash_equals($l->spiel_token($uid), $tok)) json_antwort(409, ['fehler' => 'anderswo geöffnet']);
    $jetzt = time();
    if (!$sys && $l->puls_zaehlen($uid, $jetzt) > 150) json_antwort(429, ['fehler' => 'zu schnell']);   // normal: 30 pro Minute (+ einer pro Befehl)
    // Zur Sicherheit (falls der Cronjob fehlt): ist ein Spieler da und der Weltrechner schlägt nicht mehr, schaut der Wachhund nach –
    // erst NACH der Antwort (ein Neustart dauert Sekunden, der Spieler soll nicht darauf warten; siehe welt_antwort)
    $wachhund = !$sys && $jetzt - (int)@filemtime(__DIR__ . '/weltrechner/herz.php') > 60 && $jetzt - (int)@filemtime(__DIR__ . '/weltrechner/zustand.php') > 30 && is_file(__DIR__ . '/weltrechner/wachhund.php');
    if (!$sys && isset($d['profil']) && is_string($d['profil']) && strlen($d['profil']) < 400000 && ($pr = profil_bereinigen($d['profil'])) !== null && $pr !== false) $profil_ok = $l->profil_setzen($uid, $pr);
    // Angenommene Befehle meldet der Server zurück (befehle_ok) – nur die nimmt das Handy aus seinem Ausgang. Nie mehr als 200
    // wartende Befehle pro Spieler (kein Stau für alle) – bezahlte zählen nicht dazu und werden immer angenommen (sonst wäre
    // Bezahltes weg; sie sind durch die Kosten begrenzt).
    $befehle_ok = [];
    if (!$sys && !empty($d['befehle'])) { $offen_n = $l->offene_befehle($uid); $voll_b = $offen_n >= 200; $voll_alle = $offen_n >= 400;   // (auch bezahlte nicht ohne Ende – nicht angenommene schickt das Handy später nochmal, nichts geht verloren)
        foreach (array_slice((array)$d['befehle'], 0, 30) as $b) if (befehl_ok($b)) {
            foreach (array_keys($b) as $f) if (is_string($f) && $f !== '' && $f[0] === '_') unset($b[$f]);   // (_id, _nach … setzt nur der Server)
            if ($voll_alle || ($voll_b && !in_array($b['art'], BEFEHLE_BEZAHLT, true))) continue;
            $cid = is_string($b['cid'] ?? null) && preg_match('/^[A-Za-z0-9]{8,24}$/', $b['cid']) ? $b['cid'] : null;   // (ohne Nummer: altes Handy – wie früher)
            $j = json_encode($b, JSON_UNESCAPED_UNICODE); if ($j !== false && strlen($j) < 8000) { $l->befehl_ablegen($uid, $j, $cid); if ($cid !== null) $befehle_ok[] = $cid; } } }

    if (!$sys) {   // Spieler: nur lesen – OHNE die Welt-Sperre, aus einem festen Stand (der Weltrechner muss nie auf sie warten)
        $seit = (int)($d['seit'] ?? 0);
        [$i, $welt, $sicht, $ganz, $sk, $mv] = $l->fest_lesen(function () use ($l, $d, $uid, $seit) {
            $i = $l->welt_info();
            if ($seit > (int)$i['version']) $seit = 0;   // Stand aus einer „Zukunft“ (Welt-Neustart, Version wieder klein): alles neu
            $welt = $l->welt_seit_flicken($seit);   // (Version und Teile aus demselben Stand)
            $sicht = $l->sicht_laden($uid);
            $sk = array_merge(NEBEL_TEILE, ['openWaterArmies', 'openWaterFields']);   // (auch Armeen/Felder: was er jetzt sieht, kommt mit Zahlen)
            $ganz = (int)($d['sicht_v'] ?? -1) !== $sicht['v'] && $seit > 0 ? $l->stand_laden(0, $sk) : null;   // 3B: neue Sicht → diese Teile ganz (gefiltert) schicken
            $mf = marsch_fehlt($welt); $mv = $mf ? $l->stand_laden(0, $mf) : [];   // Marsch-Teile, die nur als Flicken kamen: ganz aus demselben Stand
            return [$i, $welt, $sicht, $ganz, $sk, $mv];
        });
        // filtern erst danach (ohne festen Stand, ohne Sperre)
        $antwort = ['welt' => welt_fuer_spieler($welt, $uid)]; unset($welt);   // Spieler bekommen nur Änderungen
        if ($ganz !== null) {
            $w = &$antwort['welt'];
            $t = (array)$w['setzen']; $f = (array)($w['flicken'] ?? []);
            foreach ($sk as $k) if (isset($ganz[$k])) { $t[$k] = $ganz[$k]; unset($f[$k]); }
            $w['setzen'] = (object)$t; $w['flicken'] = (object)$f; unset($w, $ganz);
        }
        $antwort['welt'] = nebel_welt($antwort['welt'], $sicht);   // 3B: Nebel – Truppen nur für Inseln, die er sehen darf
        $antwort['welt'] = marsch_welt($antwort['welt'], $uid, $sicht, $mv); unset($mv);   // fremde Kolonnen ohne Zahlen (erst im Kampf)
        $antwort['sicht_v'] = $sicht['v'];
        $antwort['leiter'] = false;
        $antwort['rechner'] = (int)$i['leiter_id'] === 0 && (int)$i['leiter_bis'] >= $jetzt;   // läuft der Weltrechner? (sonst: „Verbindung wird wiederhergestellt …“)
        $antwort['neu_leiter'] = false;
        $antwort['version'] = $antwort['welt']['version'];
        $antwort['ereignisse'] = $l->ereignisse_abholen($uid);   // (schon verbuchte, noch nicht gesicherte überspringt das Handy)
        // die ganze Liste (Namen, online) nur, wenn das Handy darum bittet (alle ~10 s) – sonst nur, wer sich gerade geändert hat
        // (altes Handy ohne spieler_alle: immer ganz)
        $antwort['spieler'] = $l->spieler_liste((int)($d['spieler_seit'] ?? 0), false, !array_key_exists('spieler_alle', $d) || !empty($d['spieler_alle']));
        if (!empty($d['befehle'])) $antwort['befehle_ok'] = $befehle_ok;
        if (isset($profil_ok)) $antwort['profil_ok'] = $profil_ok;   // (false: zu schnell – das Handy schickt es beim nächsten Mal nochmal)
        $antwort['zeit'] = $jetzt;
        welt_antwort($antwort, $wachhund ? 'puls_wachhund' : null);
    }
    // ab hier nur der Weltrechner (er allein schreibt die Welt – unter der Welt-Sperre)
    $l->welt_sperren();
    $i = $l->welt_info();
    // Rechnen darf nur der Weltrechner auf dem Server (uid 0, mit seinem Zeichen) – nie ein Spieler
    $bin_leiter = $sys && (int)$i['leiter_id'] === 0 && $tok !== '' && hash_equals((string)$i['leiter_token'], $tok);
    if ($sys && !$bin_leiter && (int)$i['leiter_id'] === 0 && (int)$i['leiter_bis'] >= $jetzt) { $l->welt_entsperren(); json_antwort(409, ['fehler' => 'ein anderer Weltrechner läuft']); }
    // Übernehmen darf ein Weltrechner nur, wenn er den NEUESTEN Stand hat (seit dem Laden hat niemand geschrieben). Ein alter
    // Weltrechner (nach Neustart, Zurückspielen, Welt-Neustart oder einem anderen, der inzwischen schrieb) hört so sicher auf –
    // nie überschreibt er mit seinem alten Stand eine neuere Welt.
    if ($sys && !$bin_leiter && (int)($d['seit'] ?? -1) !== (int)$i['version']) { $l->welt_entsperren(); json_antwort(409, ['fehler' => 'veralteter Stand']); }
    $antwort = [];
    // Welt-Saison: vor dem Reset immer eine Sicherung der Welt, wie sie jetzt in der Datenbank steht (der Weltrechner fragt danach und
    // setzt die Welt erst zurück, wenn hier eine Nummer > 0 zurückkommt; 0 = nicht geklappt, er fragt später nochmal)
    if ($sys && !empty($d['sicherung'])) { try { $antwort['sicherung'] = (int)$l->sicherung_anlegen(time() + SAISON_SICHERUNG_SEK); } catch (Throwable $e) { error_log('Open Water: Saison-Sicherung: ' . $e->getMessage()); $antwort['sicherung'] = 0; } }
    $l->tx_anfang();   // Welt + Nachrichten + Sicht + Quittungen: ganz oder gar nicht
    try {
    if ($sys && isset($d['welt'])) {   // nur der Weltrechner darf die Welt schreiben (Leiter oder mit dem neuesten Stand – siehe oben)
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
        if ($voll) $antwort['quittung_offen'] = true;   // ein Teil fehlt noch: Befehle erst quittieren, wenn ihre Wirkung ganz gespeichert ist
        else { $l->befehle_quittieren($d['quittung'] ?? []); $l->befehle_bezahlt_ok($d['bezahlt_ok'] ?? []); }   // diese Befehle stehen jetzt mit ihrer Wirkung in der gespeicherten Welt (bezahlt_ok: bezahlte, die der Weltrechner angenommen hat)
        // 3B: neue Sicht einzelner Spieler (vor den Nachrichten: dieselbe Reihenfolge wie beim Speichern eines Spielers – ow_spieler, dann ow_ereignisse – sonst könnten sich beide gegenseitig sperren; Bitfeld über die Insel-Nummern, base64)
        foreach (array_slice((array)($d['sicht'] ?? []), 0, 2000, true) as $an => $b64) if ((int)$an > 0 && is_string($b64) && strlen($b64) < 40000 && preg_match('/^[A-Za-z0-9+\/]*={0,2}$/', $b64)) $l->sicht_setzen((int)$an, $b64);
        foreach (array_slice((array)($d['armee_sicht'] ?? []), 0, 2000, true) as $an => $ids) if ((int)$an > 0 && is_array($ids) && count($ids) <= 5000) {
            $ids = array_values(array_filter($ids, function ($x) { return is_string($x) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $x); })); $l->armee_sicht_setzen((int)$an, json_encode($ids)); }
        foreach (array_slice((array)($d['ereignisse'] ?? []), 0, 2000) as $e) if (isset($e['an'], $e['e']) && (int)$e['an'] > 0 && is_array($e['e']) && in_array($e['e']['art'] ?? '', WELTRECHNER_NACHRICHTEN, true) && ($e['e']['art'] !== 'bundGeschenk' || bund_geschenk_ok($e['e'])) && ($e['e']['art'] !== 'haendlerWare' || haendler_ware_ok($e['e'])) && sauber($e['e'])) {
            $mid = is_string($e['mid'] ?? null) && preg_match('/^[A-Za-z0-9]{8,24}$/', $e['mid']) ? $e['mid'] : null;
            $j = json_encode($e['e'], JSON_UNESCAPED_UNICODE); if ($j !== false && strlen($j) < 200000) $l->ereignis_ablegen((int)$e['an'], $j, $mid); }
    }
    $l->tx_ende();
    } catch (Throwable $e) { $l->tx_abbruch(); $l->welt_entsperren(); throw $e; }   // nichts davon gilt – der Weltrechner schickt alles nochmal (gleiche Nummern)
    $neu_leiter = false;
    if ($sys) {   // Weltrechner bleibt (oder übernimmt nach einem Neustart)
        $neu_leiter = !$bin_leiter;
        $l->leiter_setzen(0, $tok, time() + leiter_sek(time() - (int)($_SERVER['REQUEST_TIME'] ?? time())));   // ab dem Ende der Anfrage (nicht ab ihrem Anfang: eine langsame wäre sonst schon fast abgelaufen)
        $bin_leiter = true;
    }
    $seit = (int)($d['seit'] ?? 0);
    $antwort['welt'] = $l->welt_seit($neu_leiter ? $seit : PHP_INT_MAX);   // der Weltrechner hat schon alles
    if (!$neu_leiter) { $antwort['welt']['setzen'] = new stdClass; $antwort['welt']['loeschen'] = []; }
    $antwort['befehle'] = $l->befehle_abholen();   // alle noch nicht quittierten (schon Ausgeführte überspringt der Weltrechner)
    $l->welt_entsperren();
    if (isset($d['welt']) && mt_rand(1, 500) === 1) $l->aufraeumen();   // (nach dem Entsperren: hält niemanden auf)
    $antwort['leiter'] = $bin_leiter;
    $antwort['rechner'] = $bin_leiter || ((int)$i['leiter_id'] === 0 && (int)$i['leiter_bis'] >= $jetzt);   // läuft der Weltrechner? (sonst: „Verbindung wird wiederhergestellt …“)
    $antwort['neu_leiter'] = $neu_leiter;
    $antwort['version'] = $antwort['welt']['version'];
    $antwort['ereignisse'] = $sys ? [] : $l->ereignisse_abholen($uid);   // (schon verbuchte, noch nicht gesicherte überspringt das Handy)
    $antwort['spieler'] = $l->spieler_liste((int)($d['spieler_seit'] ?? 0), $sys, !array_key_exists('spieler_alle', $d) || !empty($d['spieler_alle']));   // (auch der Weltrechner: die ganze Liste nur alle 10 s)
    if (!$sys && !empty($d['befehle'])) $antwort['befehle_ok'] = $befehle_ok;
    if (!$sys && isset($profil_ok)) $antwort['profil_ok'] = $profil_ok;
    $antwort['zeit'] = $jetzt;
    welt_antwort($antwort);
}
function puls_wachhund() {
    try { require_once __DIR__ . '/weltrechner/wachhund.php'; wachhund_runde('spieler'); } catch (Throwable $e) { error_log('Open Water Wachhund: ' . $e->getMessage()); }
}
// Antwort als JSON – kaputtes UTF-8 (z. B. in einem alten Namen) wird ersetzt statt die ganze Antwort zu verlieren. false: geht nicht
function welt_antwort_text($a) { return json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); }
// Antwort gepackt, wenn der Browser das kann (Welt-Teile sind groß). $danach: läuft erst, wenn die Antwort beim Spieler ist
// (kann der Server die Anfrage nicht vorher abschließen: wie früher davor)
function welt_antwort($a, $danach = null) {
    $j = welt_antwort_text($a);
    if ($j === false) { error_log('Open Water: Puls-Antwort nicht als JSON: ' . json_last_error_msg()); json_antwort(500, ['fehler' => 'Serverfehler']); }
    $ende = function_exists('fastcgi_finish_request') ? 'fastcgi_finish_request' : (function_exists('litespeed_finish_request') ? 'litespeed_finish_request' : null);
    if ($danach && !$ende) { $danach(); $danach = null; }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    if (strpos($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip') !== false && strlen($j) > 2000) { header('Content-Encoding: gzip'); $j = gzencode($j, 5); }
    echo $j;
    if ($danach) { $ende(); $danach(); }
    exit;
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) speichern_anfrage();
