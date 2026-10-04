<?php
// ===== weltrechner/wachhund.php – passt auf den Weltrechner auf =====
// Läuft jede Minute (Cronjob) – und zur Sicherheit auch, wenn ein Spieler online ist und der Herzschlag fehlt (server.php).
//   - Weltrechner läuft und schlägt (Herzschlag jünger als 60 s) → nichts tun
//   - hängt (Herzschlag älter als 60 s) → hart beenden, zählt als Absturz, neu starten
//   - abgestürzt → neu starten
//   - 5 Abstürze in 5 Minuten → keine Neustarts mehr, WARTUNG an (niemand kommt rein, die Welt steht still, nichts geht
//     verloren) und Alarm auf der Admin-Seite. Wartung und Sperre hebt nur Alexander auf (admin.php).
//   - Wartung (Hochladen) → nicht starten; das zählt nie als Absturz
//   - jede Stunde eine Sicherung der Welt (die letzten 48 bleiben)
// Grenzen: höchstens 600 MB Speicher (start.js prüft selbst, Node bekommt 450 MB Heap, räumt vor der Grenze erst auf), niedrigste Priorität (nice 19).
// Alle Dateien hier heißen .php und beginnen mit einer Sperre – im Browser sieht man nie etwas davon.
require_once __DIR__ . '/../server.php';

const WR_ORDNER = __DIR__;
const WR_SPERRE = "<?php http_response_code(404); exit; ?>\n";
const WR_HERZ_ALT = 180;           // Sekunden ohne Herzschlag = hängt (im Betrieb; eine große Welt speichern darf dauern)
const WR_HERZ_ALT_START = 900;     // … beim Start (Welt holen und einlesen): bei großer Welt und langsamem Server dauert das
const WR_OHNE_HERZ = 120;          // gestartet, aber nach so vielen Sekunden noch kein einziger Herzschlag = Node startet gar nicht
const WR_ABSTUERZE = 5;            // so viele Abstürze …
const WR_FENSTER = 300;            // … in so vielen Sekunden → Wartung + Alarm
const WR_SPEICHER_MB = 600;        // Vorgabe von Alexander

function wr_lesen($name) {
    $t = @file_get_contents(WR_ORDNER . '/' . $name);
    if ($t === false) return null;
    if (strpos($t, WR_SPERRE) === 0) $t = substr($t, strlen(WR_SPERRE));
    $v = json_decode($t, true);
    return is_array($v) ? $v : null;
}
function wr_schreiben($name, $v) {
    $neu = WR_ORDNER . '/' . preg_replace('/\.php$/', '', $name) . '_neu.php';
    file_put_contents($neu, WR_SPERRE . json_encode($v, JSON_UNESCAPED_UNICODE));
    rename($neu, WR_ORDNER . '/' . $name);
}
function wr_log($text) {
    $f = WR_ORDNER . '/log.php';
    // nie größer als 2 MB (+ eine alte). Kopieren + leeren statt umbenennen: der Weltrechner schreibt mit offener Datei weiter hinein
    clearstatcache(true, $f);
    if (is_file($f) && filesize($f) > 2 * 1024 * 1024 && @copy($f, WR_ORDNER . '/log_alt.php')) { $h = @fopen($f, 'r+'); if ($h) { ftruncate($h, 0); fwrite($h, WR_SPERRE); fclose($h); } }
    if (!is_file($f)) file_put_contents($f, WR_SPERRE);
    file_put_contents($f, date('c') . ' Wachhund: ' . $text . "\n", FILE_APPEND);
}
// Die letzten Zeilen des Logs (für die Admin-Seite und den Alarm)
function wr_log_ende($n = 40) {
    $t = @file_get_contents(WR_ORDNER . '/log.php');
    if ($t === false) return '';
    if (strpos($t, WR_SPERRE) === 0) $t = substr($t, strlen(WR_SPERRE));
    $z = explode("\n", rtrim($t));
    return implode("\n", array_slice($z, -$n));
}
function wr_zustand() { return wr_lesen('zustand.php') ?: ['abstuerze' => [], 'gesperrt' => false, 'grund' => '', 'gezaehlt' => 0, 'starts' => []]; }
function wr_herz() { return wr_lesen('herz.php'); }
// Wie lange darf der Herzschlag fehlen? Beim Start (Welt einlesen) viel länger als im Betrieb.
function wr_herz_alt($h) { return ($h['phase'] ?? '') === 'start' ? WR_HERZ_ALT_START : WR_HERZ_ALT; }
// Codes, bei denen der SERVER nicht (schnell genug) antwortet – kein Fehler des Weltrechners: zählt nie als Absturz (keine Notbremse),
// der Wachhund versucht es mit wachsender Pause wieder (1, 2, 4 … höchstens 10 Min.), bis der Server wieder antwortet
const WR_SERVER_CODES = [7, 8];
// Läuft dieser Prozess noch – und ist es wirklich der Weltrechner (keine wiederverwendete Nummer)?
function wr_laeuft($pid) {
    $pid = (int)$pid; if ($pid <= 1) return false;
    $cmd = trim((string)@shell_exec('ps -o args= -p ' . $pid . ' 2>/dev/null'));
    return $cmd !== '' && strpos($cmd, 'start.js') !== false;
}
// ALLE Weltrechner-Prozesse dieses Spiels (auch die, die noch keinen Herzschlag geschrieben haben – z. B. nach vielen Starts
// kurz hintereinander). Erkannt am Schreib-Recht auf genau diesen Ordner bzw. an start.js mit diesem Ordner als Arbeitsordner.
function wr_alle_pids() {
    $r = [];
    foreach (explode("\n", (string)@shell_exec('ps -eo pid=,args= 2>/dev/null')) as $z) {
        if (!preg_match('/^\s*(\d+)\s+(.*)$/', $z, $m) || strpos($m[2], 'start.js') === false || (int)$m[1] === getmypid()) continue;
        $cwd = (string)@readlink('/proc/' . $m[1] . '/cwd');
        if (strpos($m[2], WR_ORDNER) !== false || $cwd === WR_ORDNER) $r[] = (int)$m[1];
    }
    return $r;
}
function wr_alter($pid) { return (int)trim((string)@shell_exec('ps -o etimes= -p ' . (int)$pid . ' 2>/dev/null')); }   // Sekunden seit dem Start
function wr_alle_beenden($grund) {   // vor jedem Start: nie zwei Weltrechner gleichzeitig (sie würden sich die CPU teilen und keiner käme durch)
    $p = wr_alle_pids(); if (!$p) return true;
    foreach ($p as $x) exec('kill -9 ' . (int)$x . ' 2>/dev/null');
    for ($i = 0; $i < 20 && wr_alle_pids(); $i++) usleep(100000);
    wr_log(count($p) . ' alte(n) Weltrechner-Prozess(e) beendet (' . $grund . ')');
    return !wr_alle_pids();
}
function wr_ps_geht() { return trim((string)@shell_exec('ps -o pid= -p ' . getmypid() . ' 2>/dev/null')) === (string)getmypid(); }   // zeigt ps hier Prozesse?
function wr_node() {
    $c = cfg();
    if (!empty($c['node'])) return $c['node'];
    foreach (['/opt/plesk/node/22/bin/node', '/opt/plesk/node/20/bin/node'] as $n) if (trim((string)@shell_exec('test -x ' . escapeshellarg($n) . ' && echo ja')) === 'ja') return $n;
    return 'node';
}
function wr_url() {
    $c = cfg();
    if (!empty($c['spiel_url'])) return $c['spiel_url'];
    // (kein Ersatz aus der Anfrage: ein gefälschter Host-Kopf könnte den Weltrechner samt Schlüssel woandershin schicken)
    return '';
}
function wr_starten() {
    $url = wr_url();
    if (!wr_alle_beenden('vor dem Start')) { wr_log('kann nicht starten: ein alter Weltrechner lässt sich nicht beenden'); return false; }
    if ($url === '') { wr_log('kann nicht starten: Adresse des Spiels unbekannt (spiel_url in config.php)'); return false; }
    if (!is_file(WR_ORDNER . '/log.php')) file_put_contents(WR_ORDNER . '/log.php', WR_SPERRE);
    // Node im Sicherheitsmodus: lesen nur die Spiel-Skripte und den eigenen Ordner (NIE config.php), schreiben nur im eigenen
    // Ordner, keine anderen Programme starten. Der Schlüssel geht nur über die Umgebung (nie in einer Befehlszeile – ps).
    $G = dirname(WR_ORDNER);
    $lesen = [WR_ORDNER];
    foreach (['speichern.js', 'ladebildschirm.js', 'bots.js', 'welt.js', 'spiel.js', 'aufbau.js', 'buendnis.js', 'haendler.js'] as $d) $lesen[] = $G . '/' . $d;
    $erlaubt = implode('', array_map(function ($p) { return ' --allow-fs-read=' . escapeshellarg($p); }, $lesen)) . ' --allow-fs-write=' . escapeshellarg(WR_ORDNER);
    // Kennt dieses Node den Sicherheitsmodus? (Node 22.13+: --permission, älter: --experimental-permission) – vorher kurz ausprobieren
    $rechte = '';
    foreach (['--permission', '--experimental-permission'] as $schalter) {
        $probe = trim((string)@shell_exec('cd ' . escapeshellarg(WR_ORDNER) . ' && timeout 20 ' . escapeshellarg(wr_node()) . ' ' . $schalter . $erlaubt . ' -e "process.stdout.write(\'ja\')" 2>/dev/null'));
        if ($probe === 'ja') { $rechte = $schalter . $erlaubt; break; }
    }
    if ($rechte === '') wr_log('WARNUNG: Node kennt den Sicherheitsmodus nicht – Weltrechner läuft ohne ihn (Node aktualisieren)');
    $cmd = 'exec ' . (trim((string)@shell_exec('command -v setsid')) !== '' ? 'setsid ' : '') . 'nohup nice -n 19 ' . escapeshellarg(wr_node()) . ' ' . $rechte . ' --expose-gc --max-old-space-size=450 start.js >> log.php 2>&1 < /dev/null';
    $env = ['OW_URL' => $url, 'OW_SCHLUESSEL' => weltrechner_schluessel(), 'OW_SPEICHER_MB' => (string)WR_SPEICHER_MB, 'TZ' => 'Europe/Berlin', 'PATH' => (string)(getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin')];
    // ganz vom Aufrufer lösen (eigene Gruppe, keine offene Leitung) – sonst wartet PHP, bis der Weltrechner endet
    $p = proc_open('(' . $cmd . ') > /dev/null 2>&1 &', [0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $leit, WR_ORDNER, $env);
    if (is_resource($p)) proc_close($p);
    wr_log('Weltrechner gestartet');
    return true;
}
// Gibt true zurück, wenn der Prozess sicher weg ist. Dann bekommt herz.php die Ende-Meldung (sonst wartete der nächste
// Start bis zu 60 s auf „herz frisch“). Ist er nicht wegzubekommen: false – dann startet kein zweiter.
function wr_beenden($pid, $grund) {
    $pid = (int)$pid;
    if (!wr_laeuft($pid)) return true;
    exec('kill -9 ' . $pid . ' 2>/dev/null');
    for ($i = 0; $i < 20 && wr_laeuft($pid); $i++) usleep(100000);
    if (wr_laeuft($pid)) { wr_log('Weltrechner ließ sich NICHT beenden (' . $grund . ') – kein neuer Start'); return false; }
    $h = wr_herz(); if ($h && (int)($h['pid'] ?? 0) === $pid) { $h['ende'] = 'hart beendet: ' . $grund; $h['code'] = 9; wr_schreiben('herz.php', $h); }
    wr_log('Weltrechner hart beendet (' . $grund . ')');
    return true;
}

// Die eigentliche Runde. $quelle: 'cron' | 'spieler' | 'admin'
function wachhund_runde($quelle = 'cron') {
    $f = fopen(WR_ORDNER . '/sperre.php', 'c');
    if (!$f || !flock($f, LOCK_EX | LOCK_NB)) return 'läuft schon';   // nie zwei Wachhunde gleichzeitig
    try {
        $z = wr_zustand(); $h = wr_herz(); $jetzt = time();
        $z['geprueft'] = $jetzt;
        // jede Stunde eine Sicherung
        // (höchstens ein Versuch pro Stunde – auch wenn er scheitert, z. B. weil der jetzige Stand unvollständig ist: sonst jede Minute
        //  die ganze Welt unter der Welt-Sperre lesen)
        if ($jetzt - (int)($z['sicherungVersuch'] ?? 0) >= 3600) {
            try { if ($jetzt - lager()->letzte_sicherung_zeit() >= 3600) { $z['sicherungVersuch'] = $jetzt; wr_schreiben('zustand.php', $z);
                if (lager()->sicherung_anlegen()) wr_log('Sicherung der Welt angelegt'); else wr_log('Sicherung NICHT angelegt: der jetzige Stand ist unvollständig'); } }
            catch (Throwable $e) { wr_log('Sicherung fehlgeschlagen: ' . $e->getMessage()); }
        }

        $pid = $h ? (int)($h['pid'] ?? 0) : 0;
        $laeuft = $pid && wr_laeuft($pid);
        if ($laeuft && $h && empty($h['ende']) && $jetzt - (int)($h['zeit'] / 1000) <= wr_herz_alt($h)) {
            if (($h['phase'] ?? '') !== 'start' && !empty($z['serverWeg'])) { $z['serverWeg'] = 0; $z['serverBis'] = 0; }   // läuft wieder: die Pause beim nächsten Mal wieder kurz
            $fremd = array_values(array_diff(wr_alle_pids(), [$pid]));   // übrig gebliebene Weltrechner (ohne Herzschlag): weg damit
            if ($fremd) { foreach ($fremd as $x) exec('kill -9 ' . (int)$x . ' 2>/dev/null'); wr_log(count($fremd) . ' übrige(n) Weltrechner-Prozess(e) beendet'); }
            wr_schreiben('zustand.php', $z); return ($h['phase'] ?? '') === 'start' ? 'startet' : 'läuft'; }
        $starts = (array)($z['starts'] ?? []); $letzterStart = $starts ? (int)end($starts) : 0;   // (alte zustand.php ohne „starts“)
        if ($laeuft) {   // läuft, aber kein Herzschlag mehr: hängt (Endlosschleife o. ä.)
            if (!wr_beenden($pid, 'hängt – letzter Herzschlag vor ' . ($jetzt - (int)($h['zeit'] / 1000)) . ' s')) { wr_schreiben('zustand.php', $z); return 'hängt, lässt sich nicht beenden'; }
            $z['abstuerze'][] = $jetzt; $z['gezaehlt'] = $pid;
        } elseif ($h && $pid && (int)($z['gezaehlt'] ?? 0) !== $pid) {   // beendet: geplant (Wartung, Code 0) oder Absturz?
            $z['gezaehlt'] = $pid;
            if (isset($h['code']) && in_array((int)$h['code'], WR_SERVER_CODES, true)) {   // Server langsam/weg: kein Absturz, später nochmal
                $z['serverWeg'] = (int)($z['serverWeg'] ?? 0) + 1; $z['serverBis'] = $jetzt + min(600, 60 * (1 << min(4, $z['serverWeg'] - 1)));
                wr_log('Server antwortet nicht schnell genug (zählt nicht als Absturz) – neuer Versuch in ' . round(($z['serverBis'] - $jetzt) / 60) . ' Min.: ' . ($h['ende'] ?? ''));
            }
            elseif (isset($h['code']) && (int)$h['code'] === 6) { $z['pruefer'][] = $jetzt; wr_log('Prüfer-Neustart (zählt nicht als Absturz): ' . ($h['ende'] ?? '')); }   // kaputte Zahlen verhindert – kein Grund für die Notbremse
            elseif (!isset($h['code']) || (int)$h['code'] !== 0) { $z['abstuerze'][] = $jetzt; wr_log('Absturz erkannt: ' . ($h['ende'] ?? 'ohne Meldung beendet (Speicher? hart beendet?)')); }
        }
        // gestartet, aber nie ein Herzschlag (z. B. Fehler gleich beim Laden) → auch ein Absturz
        if (!$laeuft && $letzterStart && $jetzt - $letzterStart >= WR_OHNE_HERZ && (!$h || (int)(($h['gestartet'] ?? 0) / 1000) < $letzterStart - 5) && (int)($z['ohneHerz'] ?? 0) !== $letzterStart) {
            $z['ohneHerz'] = $letzterStart; $z['abstuerze'][] = $jetzt; wr_log('Absturz erkannt: gestartet, aber nie ein Herzschlag');
        }
        $z['abstuerze'] = array_values(array_filter($z['abstuerze'], function ($t) use ($jetzt) { return $jetzt - $t <= WR_FENSTER; }));
        $z['pruefer'] = array_values(array_filter($z['pruefer'] ?? [], function ($t) use ($jetzt) { return $jetzt - $t <= 1800; }));
        if (!$z['gesperrt'] && count($z['pruefer']) >= 10) $z['abstuerze'] = array_merge($z['abstuerze'], [$jetzt, $jetzt, $jetzt, $jetzt, $jetzt]);   // 10 Prüfer-Neustarts in 30 Min.: dann stimmt wirklich etwas nicht
        if (!$z['gesperrt'] && count($z['abstuerze']) >= WR_ABSTUERZE) {   // Notbremse
            $z['gesperrt'] = true;
            $z['grund'] = count($z['abstuerze']) . ' Abstürze in ' . (WR_FENSTER / 60) . ' Minuten';
            $z['alarm'] = ['zeit' => $jetzt, 'grund' => $z['grund'], 'log' => wr_log_ende(40)];
            file_put_contents(WARTUNG_DATEI, 'Wartung seit ' . date('d.m.Y H:i') . ' – automatisch: Weltrechner ' . $z['grund'] . "\n");
            wr_log('NOTBREMSE: ' . $z['grund'] . ' – Wartung an, keine Neustarts mehr, Alarm für den Admin');
        }
        if ($z['gesperrt']) { wr_schreiben('zustand.php', $z); return 'gesperrt'; }
        if (wartung()) { wr_schreiben('zustand.php', $z); return 'wartung'; }
        if ($jetzt - $letzterStart < 50) { wr_schreiben('zustand.php', $z); return 'gerade gestartet'; }   // höchstens ein Start pro Minute
        if ($jetzt < (int)($z['serverBis'] ?? 0)) { wr_schreiben('zustand.php', $z); return 'wartet auf den Server'; }   // (Server war zu langsam: Pause)
        // Ein Weltrechner, der gerade erst gestartet wurde (auf einem überlasteten Server kann schon das Starten von Node dauern),
        // ist nicht „weg“: nicht wegräumen und keinen zweiten starten – sonst wird auf einem langsamen Server nie einer fertig.
        foreach (wr_alle_pids() as $x) { if (wr_alter($x) < WR_HERZ_ALT_START) { wr_schreiben('zustand.php', $z); return 'startet (noch ohne Herzschlag)'; } }
        // frischer Herzschlag ohne Ende-Meldung, aber kein Prozess gefunden: nur wenn ps hier nichts sieht (eingeschränkt) lieber
        // nicht – sonst liefen zwei. Sieht ps Prozesse (sich selbst), ist er wirklich weg (Speicher, hart beendet): gleich neu.
        if ($h && empty($h['ende']) && $jetzt - (int)($h['zeit'] / 1000) <= wr_herz_alt($h) && !wr_ps_geht()) { wr_schreiben('zustand.php', $z); return 'herz frisch'; }
        $z['starts'][] = $jetzt; $z['starts'] = array_slice($z['starts'], -30);
        wr_schreiben('zustand.php', $z);
        try { $i = lager()->welt_info(); if ((int)$i['leiter_id'] === 0) lager()->leiter_setzen(0, '', 0); } catch (Throwable $e) {}   // keiner läuft (Herzschlag alt oder beendet): der Platz ist frei
        wr_starten();
        return 'gestartet';
    } finally { flock($f, LOCK_UN); fclose($f); }
}

// Admin: Sperre aufheben (die Wartung beendet Alexander selbst, wenn alles wieder gut ist)
function wachhund_entsperren() {
    $z = wr_zustand(); $z['gesperrt'] = false; $z['grund'] = ''; $z['abstuerze'] = []; $z['pruefer'] = []; $z['alarm'] = null; $z['starts'] = [];
    wr_schreiben('zustand.php', $z); wr_log('Sperre vom Admin aufgehoben');
}
// Admin: neu starten (jetzt gleich)
function wachhund_neustart() {
    $h = wr_herz(); if ($h && !wr_beenden((int)($h['pid'] ?? 0), 'Neustart vom Admin')) return 'lässt sich nicht beenden';
    $z = wr_zustand(); $z['starts'] = []; $z['gezaehlt'] = $h ? (int)($h['pid'] ?? 0) : 0; wr_schreiben('zustand.php', $z);
    return wachhund_runde('admin');
}

// Cronjob „jede Minute wachhund.php“ einrichten (Admin-Knopf). Die bestehenden Cronjobs des Kontos bleiben unangetastet:
// vorher gesichert (crontab_sicherung.php), nur eine Zeile kommt dazu, danach wird geprüft, dass alle alten noch da sind.
function wr_php() {
    foreach (['/usr/local/php73/bin/php', '/usr/local/php83/bin/php', PHP_BINDIR . '/php'] as $p) if (trim((string)@shell_exec('test -x ' . escapeshellarg($p) . ' && echo ja')) === 'ja') return $p;
    return 'php';
}
// Neue Cronjob-Liste setzen: direkt über die Eingabe von „crontab -“ (der Server schneidet lange Dateipfade ab)
function wr_crontab_setzen($text) {
    $p = proc_open('crontab -', [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $r);
    if (!is_resource($p)) return [1, 'crontab nicht startbar'];
    fwrite($r[0], $text); fclose($r[0]);
    $aus = trim(stream_get_contents($r[1]) . ' ' . stream_get_contents($r[2])); fclose($r[1]); fclose($r[2]);
    return [proc_close($p), $aus];
}
function wachhund_cron_da() { return strpos((string)@shell_exec('crontab -l 2>/dev/null'), __FILE__) !== false; }
function wachhund_cron_einrichten() {
    $alt = (string)@shell_exec('crontab -l 2>/dev/null');
    if (strpos($alt, __FILE__) !== false) return 'Der Cronjob ist schon eingerichtet.';
    file_put_contents(WR_ORDNER . '/crontab_sicherung.php', WR_SPERRE . $alt);
    $neu = rtrim($alt, "\n") . ($alt === '' ? '' : "\n") . '* * * * * ' . wr_php() . ' -f ' . escapeshellarg(__FILE__) . " > /dev/null 2>&1\n";
    [$rc, $aus] = wr_crontab_setzen($neu);
    $jetzt = (string)@shell_exec('crontab -l 2>/dev/null');
    foreach (explode("\n", trim($alt)) as $z) if (trim($z) !== '' && strpos($jetzt, trim($z)) === false) {   // etwas Altes fehlt: sofort zurück
        wr_crontab_setzen($alt);
        wr_log('Cronjob NICHT eingerichtet (alte Einträge wären verloren gegangen) – alter Stand wiederhergestellt');
        return 'Fehler – nichts verändert, alter Stand wiederhergestellt.';
    }
    if ($rc !== 0 || strpos($jetzt, __FILE__) === false) { wr_log('Cronjob einrichten fehlgeschlagen: ' . $aus); return 'Fehler beim Einrichten: ' . $aus; }
    wr_log('Cronjob eingerichtet (jede Minute)');
    return 'Cronjob eingerichtet: der Wachhund schaut jetzt jede Minute nach.';
}

// Direkt aufgerufen (Cronjob: php wachhund.php) → eine Runde. Im Browser: nichts (404).
if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { echo wachhund_runde('cron'), "\n"; exit; }
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
