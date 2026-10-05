// Teil 06-speichern-push-konto.php: Speichern, Handy-Benachrichtigungen, Passwort ändern, Spielername


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
// Weltrechner (nur mit X-Weltrechner-Schlüssel): push_abos → alle Abos + VAPID-Schlüssel   push_weg {ids} (abgelaufene Abos)
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
const PUSH_ARTEN = ['angriff', 'spaeher', 'verloren', 'boss', 'sammler', 'schild', 'invasion', 'drache', 'hilfe', 'rally', 'haendler'];   // die Arten von Handy-Nachrichten (weltrechner/push.js)
function push_anfrage($ich, $d, $aktion) {
    $l = lager();
    $s = push_schluessel();
    if (!empty($ich['system'])) {   // der Weltrechner
        if ($aktion === 'push_abos') json_antwort(200, $s ? ['an' => true, 'public' => $s['public'], 'private' => $s['private'], 'sub' => (string)(cfg()['spiel_url'] ?? 'mailto:admin@hobbitonhill.de'), 'abos' => $l->push_alle()] : ['an' => false]);
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
