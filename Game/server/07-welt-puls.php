// Teil 07-welt-puls.php: Puls der einen Welt (alle ~2 s von jedem Spieler)

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
