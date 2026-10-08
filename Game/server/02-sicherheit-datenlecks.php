// Teil 02-sicherheit-datenlecks.php: Sicherheit (Bremse, Namen, Profil, Flicken, Befehle) und was Spieler nicht bekommen

// ===== Sicherheit =====
// Sicherheits-Kopfzeilen für jede Seite (keine fremden Rahmen, kein Rätselraten beim Dateityp, keine Herkunft nach außen)
header('X-Frame-Options: DENY');                                    // nie in einem fremden (oder Office-)Rahmen
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Strict-Transport-Security: max-age=31536000');               // immer HTTPS, auch beim ersten Aufruf
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
// Nur eigene Dateien + three.js (3D) + Google-Schriften; Daten gehen nur an den eigenen Server (kein Abfluss nach außen)
// Skripte nur aus eigenen Dateien, three.js und den eigenen Inline-Skripten mit der Nonce dieser Seite (csp_nonce()) – ein
// eingeschleustes <script> oder onclick=… liefe nicht ('unsafe-inline' gibt es nur noch für Styles)
function csp_nonce() { static $n = null; if ($n === null) $n = base64_encode(random_bytes(16)); return $n; }
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-" . csp_nonce() . "' https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

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
        'look' => ['frame' => $id($lk['frame'] ?? null), 'frames' => $liste($lk['frames'] ?? []), 'titles' => $liste($lk['titles'] ?? []), 'throne' => !empty($lk['throne'])],   // (Rahmen: angelegt + die er hat – Weltrechner hbRahmen)
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
const BEFEHL_ARTEN = ['angriff', 'senden', 'zurueck', 'schneller', 'ausbau', 'hauptstadt', 'truppen', 'tor', 'titel', 'feld', 'feldHeim', 'lager', 'armee', 'beitreten', 'bund', 'haendler', 'spaehen', 'vheld', 'teleport'];   // vheld: Verteidigungs-Helden in der Mauer · spaehen (3B): Erkundungs-Späher – der Weltrechner deckt danach den Nebel auf (mit blick: Späher zu einer fremden Basis – er schreibt den Spähbericht) · teleport: Hauptstadt an eine freie Stelle
const BEFEHLE_BEZAHLT = ['ausbau', 'hauptstadt', 'schneller', 'truppen', 'teleport'];   // hat das Handy schon bezahlt (wie BEZAHLT in welt.js)
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
    'lookMig', 'frames', 'titles', 'throneLook', 'lookFrame', 'achLook', 'bestRank'];
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
