<?php
// Sicherung mit Spielerkonten (6.10.): einmal am Tag kommen Konten (Passwörter nur als Prüfwert) und private Spielstände mit.
// „Nur Welt“ zurückspielen lässt sie unberührt, „alles“ spielt sie zurück – genau einmal (Nachrichten, Befehle), wer seitdem neu ist,
// bleibt. Braucht MariaDB: eine eigene Datenbank (Zufallsname), wird am Ende gelöscht.  Aufruf:  php tests/sicherung_test.php
// (Zugang: OW_DB_USER/OW_DB_PW, sonst root über den Socket)
$_SERVER['SCRIPT_FILENAME'] = __FILE__;
ob_start(); require __DIR__ . '/../Game/server.php'; ob_end_clean();
$fehler = 0; $n = 0;
function pruefe($name, $ist, $soll) { global $fehler, $n; $n++; if ($ist !== $soll) { $fehler++; echo "FEHLER: $name – erwartet " . var_export($soll, true) . ', bekommen ' . var_export($ist, true) . "\n"; } else echo "OK   $name\n"; }
$zugang = ['db_host' => 'localhost', 'db_user' => getenv('OW_DB_USER') ?: 'root', 'db_pass' => getenv('OW_DB_PW') ?: ''];
$name = 'ow_sicherung_' . getmypid() . '_' . bin2hex(random_bytes(3));
try { $root = new PDO('mysql:host=localhost;charset=utf8mb4', $zugang['db_user'], $zugang['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); $root->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4"); }
catch (Throwable $e) { echo "FEHLER: keine Datenbank (MariaDB) erreichbar – " . $e->getMessage() . "\n"; exit(1); }
register_shutdown_function(function () use ($root, $name) { $root->exec("DROP DATABASE IF EXISTS `$name`"); });

$l = new MysqlLager($zugang + ['db_name' => $name]);
$db = (function () { return $this->db; })->call($l);
$wert = function ($sql, $w = []) use ($db) { $q = $db->prepare($sql); $q->execute($w); return $q->fetchColumn(); };
$DAMALS = '2026-01-01 12:00:00';
// Ausgangslage: Welt (Version 10), zwei Spieler mit privatem Spielstand, Nachrichten von vorher
$db->exec("UPDATE ow_welt_info SET version = 10 WHERE id = 1");
$db->exec("INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (0, 'openWaterIslandTroops', '{\"1\":500}'), (0, 'openWaterKarte', '{\"n\":15}')");
$db->exec("INSERT INTO ow_bots (spieler_id, bot_id, nr, basen, zustand) VALUES (0, 'b1', 1, '[1]', '{}')");
$db->exec("INSERT INTO ow_spieler (id, name, pw_hash, spiel_token, anzeigename, speicher_nr) VALUES (1, 'anna', 'pruefwert-a', 'tokenanna', 'Anna', 5), (2, 'ben', 'pruefwert-b', 'tokenben', 'Ben', 3)");
$db->exec("INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (1, 'openWaterGems', '100'), (1, 'openWaterEreignisFertig', '[3]'), (2, 'openWaterGems', '50')");
$db->exec("INSERT INTO ow_bots (spieler_id, bot_id, nr, basen, zustand) VALUES (1, 'alt1', 1, '[]', '{}')");
$db->exec("INSERT INTO ow_ereignisse (id, spieler_id, ereignis, erstellt, abgeholt) VALUES (3, 1, '{}', '2026-01-01 10:00:00', 1), (4, 1, '{}', '2026-01-01 11:00:00', 0), (5, 1, '{}', '2026-01-01 11:30:00', 0)");

// 1) Sicherung mit Konten – und eine ohne
$sk = $l->sicherung_anlegen(0, true); $sw = $l->sicherung_anlegen();
pruefe('Sicherung mit Konten angelegt (konten = 1)', [$sk > 0, (int)$wert('SELECT konten FROM ow_sicherungen WHERE id = ?', [$sk])], [true, 1]);
pruefe('Sicherung ohne Konten (konten = 0)', (int)$wert('SELECT konten FROM ow_sicherungen WHERE id = ?', [$sw]), 0);
pruefe('Liste zeigt „mit Spielerkonten“', array_map(function ($z) { return (int)$z['konten']; }, $l->sicherungen_liste()), [0, 1]);
$d = json_decode(gzdecode($wert('SELECT daten FROM ow_sicherungen WHERE id = ?', [$sk])), true);
pruefe('Konten-Teil gültig, Passwort nur als Prüfwert', [konten_gueltig($d['konten']), $d['konten']['spieler'][0]['pw_hash'], array_key_exists('pw', $d['konten']['spieler'][0]), count($d['konten']['staende'])], [true, 'pruefwert-a', false, 3]);
pruefe('Sicherung ohne Konten hat keinen Konten-Teil', array_key_exists('konten', json_decode(gzdecode($wert('SELECT daten FROM ow_sicherungen WHERE id = ?', [$sw])), true)), false);
pruefe('letzte Konten-Sicherung bekannt (für „einmal am Tag“)', $l->letzte_sicherung_zeit(true) > time() - 60, true);
$db->exec("UPDATE ow_sicherungen SET erstellt = '$DAMALS'");

// Danach geht das Spiel weiter: Anna ändert alles, Cara meldet sich neu an, neue Nachrichten und Befehle
$nachher = function () use ($db) {
    $db->exec("UPDATE ow_spieler SET pw_hash = 'pruefwert-neu', anzeigename = 'AnnaNeu', spiel_token = 'tokenneu' WHERE id = 1");
    $db->exec("REPLACE INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (1, 'openWaterGems', '999'), (1, 'openWaterEreignisFertig', '[3,4]')");
    $db->exec("INSERT IGNORE INTO ow_spieler (id, name, pw_hash, anzeigename) VALUES (3, 'cara', 'pruefwert-c', 'Cara')");
    $db->exec("REPLACE INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (3, 'openWaterGems', '7')");
    $db->exec("UPDATE ow_ereignisse SET abgeholt = 1 WHERE id = 4");
    $db->exec("REPLACE INTO ow_ereignisse (id, spieler_id, ereignis, erstellt, abgeholt) VALUES (6, 1, '{}', '2026-01-01 13:00:00', 0)");
    $db->exec("DELETE FROM ow_befehle");
    $db->exec("INSERT INTO ow_befehle (id, spieler_id, befehl, art, erstellt, fertig, ok, fertig_v) VALUES
        (1, 1, '{}', 'ausbau', '2026-01-01 11:00:00', 1, 1, 20),
        (2, 1, '{}', 'ausbau', '2026-01-01 13:00:00', 1, 1, 20),
        (3, 1, '{}', 'angriff', '2026-01-01 13:00:00', 0, 0, NULL),
        (4, 3, '{}', 'ausbau', '2026-01-01 13:00:00', 1, 1, 20)");
};
$nachher();
$befehle = function () use ($db) { $r = []; foreach ($db->query('SELECT id, fertig, nach FROM ow_befehle ORDER BY id') as $z) $r[(int)$z['id']] = [(int)$z['fertig'], (int)$z['nach']]; return $r; };

// 2) Nur Welt (wie bisher): Konten und Spielstände bleiben, bezahlte Befehle nach der Sicherung laufen nochmal
pruefe('nur Welt zurückgespielt', $l->sicherung_zurueck($sk), true);
pruefe('… Annas Konto und Spielstand bleiben', [$wert('SELECT pw_hash FROM ow_spieler WHERE id = 1'), $wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 1 AND schluessel = 'openWaterGems'")], ['pruefwert-neu', '999']);
pruefe('… bezahlte Befehle nach der Sicherung nochmal (wie bisher)', $befehle(), [1 => [0, 1], 2 => [0, 1], 3 => [0, 0], 4 => [0, 1]]);
pruefe('… Vorab-Sicherung ohne Konten', (int)$wert('SELECT konten FROM ow_sicherungen ORDER BY id DESC LIMIT 1'), 0);

// 3) Alles: nur mit einer Konten-Sicherung
$nachher(); $db->exec("UPDATE ow_ereignisse SET abgeholt = 1 WHERE id = 4");
pruefe('alles mit einer Sicherung ohne Konten: abgelehnt', [$l->sicherung_zurueck($sw, true), $wert('SELECT pw_hash FROM ow_spieler WHERE id = 1')], [false, 'pruefwert-neu']);
pruefe('alles zurückgespielt', $l->sicherung_zurueck($sk, true), true);
pruefe('… Annas Konto von damals (Prüfwert, Name), offene Spiele müssen neu laden', [$wert('SELECT pw_hash FROM ow_spieler WHERE id = 1'), $wert('SELECT anzeigename FROM ow_spieler WHERE id = 1'), $wert('SELECT spiel_token FROM ow_spieler WHERE id = 1'), (int)$wert('SELECT speicher_nr FROM ow_spieler WHERE id = 1')], ['pruefwert-a', 'Anna', '', 0]);
pruefe('… Annas Spielstand von damals', [$wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 1 AND schluessel = 'openWaterGems'"), $wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 1 AND schluessel = 'openWaterEreignisFertig'"), (int)$wert('SELECT COUNT(*) FROM ow_bots WHERE spieler_id = 1')], ['100', '[3]', 1]);
pruefe('… Cara (seitdem neu) bleibt unverändert', [$wert('SELECT pw_hash FROM ow_spieler WHERE id = 3'), $wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 3 AND schluessel = 'openWaterGems'")], ['pruefwert-c', '7']);
$ab = []; foreach ($db->query('SELECT id, abgeholt FROM ow_ereignisse ORDER BY id') as $z) $ab[(int)$z['id']] = (int)$z['abgeholt'];
pruefe('… Nachrichten genau einmal: verbuchte bleiben weg, damals offene kommen wieder, spätere verfallen', $ab, [3 => 1, 4 => 0, 5 => 0, 6 => 1]);
pruefe('… Befehle: bezahlt vor der Sicherung nochmal, Annas spätere verfallen, Caras laufen nochmal', $befehle(), [1 => [0, 1], 2 => [1, 0], 3 => [1, 0], 4 => [0, 1]]);
pruefe('… die Welt ist von damals', $wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 0 AND schluessel = 'openWaterIslandTroops'"), '{"1":500}');
$vorher = (int)$wert('SELECT MAX(id) FROM ow_sicherungen');
pruefe('… Vorab-Sicherung MIT Konten (das Zurückspielen lässt sich zurückspielen)', (int)$wert('SELECT konten FROM ow_sicherungen WHERE id = ?', [$vorher]), 1);
pruefe('Zurückspielen rückgängig (Vorab-Sicherung, alles)', [$l->sicherung_zurueck($vorher, true), $wert('SELECT pw_hash FROM ow_spieler WHERE id = 1'), $wert("SELECT wert FROM ow_spielstand WHERE spieler_id = 1 AND schluessel = 'openWaterGems'")], [true, 'pruefwert-neu', '999']);

// 4) Prüfung des Konten-Teils
$k = $d['konten'];
$k2 = $k; $k2['spieler'][0]['pw_hash; DROP TABLE x'] = 1; pruefe('Konten-Teil: fremde Spaltennamen abgelehnt', konten_gueltig($k2), false);
$k2 = $k; $k2['spieler'][0]['pw_hash'] = ''; pruefe('Konten-Teil: ohne Passwort-Prüfwert abgelehnt', konten_gueltig($k2), false);
$k2 = $k; $k2['staende'][0]['spieler_id'] = 0; pruefe('Konten-Teil: Welt (Spieler 0) nie als Spielstand', konten_gueltig($k2), false);
pruefe('Konten-Teil: leer abgelehnt', konten_gueltig(['spieler' => [], 'staende' => [], 'bots' => []]), false);

// 5) Alte Sicherungen begrenzt wie bisher (die letzten 48)
for ($i = 0; $i < 50; $i++) $l->sicherung_anlegen(0, $i === 0);
pruefe('höchstens 48 Sicherungen', (int)$wert('SELECT COUNT(*) FROM ow_sicherungen'), 48);

echo ($fehler ? "FEHLER: $fehler von $n Tests nicht bestanden\n" : "Alle $n Sicherungs-Tests bestanden.\n");
exit($fehler ? 1 : 0);
