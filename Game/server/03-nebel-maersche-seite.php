// Teil 03-nebel-maersche-seite.php: Nebel, Marschgrößen, Hilfen (IP, Herkunft, JSON) und Spielseite vorbereiten
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
