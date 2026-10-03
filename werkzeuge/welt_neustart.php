<?php
// Welt-Neustart (neue Saison) – NUR mit Alexanders Ja.
// So benutzen: Wartung an (wartung.txt), warten bis der Weltrechner beendet ist, diese Datei mit ZUFÄLLIGEM Namen in den
// Game-Ordner legen, einmal mit ?ja=NEUSTART aufrufen, Datei sofort wieder löschen, Wartung aus.
// Gelöscht wird: die Welt (Basen, Bots, Märsche …) und ALLE Spielstände (Stufe, Münzen, Gems, Ausrüstung, Stadt).
// Bleibt: Konten, Passwörter, Spielernamen, Logins, Push-Anmeldungen, die Sicherungen.
// Vorher wird alles in weltrechner/altwelt_<Datum>.php gesichert (von außen 404).
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/server.php';
if (($_GET['ja'] ?? '') !== 'NEUSTART') exit("nichts gemacht (ja=NEUSTART fehlt)\n");
if (!wartung()) exit("nichts gemacht: zuerst Wartung an\n");
$h = @file_get_contents(__DIR__ . '/weltrechner/herz.php');
if ($h !== false && ($j = json_decode(substr($h, strpos($h, '?>') + 2), true)) && time() - ($j['zeit'] ?? 0) / 1000 < 30) exit("nichts gemacht: der Weltrechner läuft noch\n");
$q = new ReflectionProperty('MysqlLager', 'db'); $q->setAccessible(true); $db = $q->getValue(lager());

// 1) Sicherung von allem
$alles = [
    'spielstand' => $db->query('SELECT spieler_id, schluessel, wert FROM ow_spielstand')->fetchAll(PDO::FETCH_ASSOC),
    'bots' => $db->query('SELECT * FROM ow_bots')->fetchAll(PDO::FETCH_ASSOC),
    'welt_info' => $db->query('SELECT * FROM ow_welt_info')->fetchAll(PDO::FETCH_ASSOC),
    'spieler' => $db->query('SELECT id, stufe, muenzen, gems, anzahl_basen, profil, profil_zeit FROM ow_spieler')->fetchAll(PDO::FETCH_ASSOC),
];
$gz = gzencode(json_encode($alles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE), 6);
$datei = __DIR__ . '/weltrechner/altwelt_' . date('Ymd_His') . '.php';
$alt = umask(077);
$ok = file_put_contents($datei, "<?php http_response_code(404); exit; ?>\n" . base64_encode($gz)) !== false;
umask($alt);
if (!$ok) exit("ABBRUCH: Sicherung konnte nicht geschrieben werden\n");
echo "Sicherung: " . basename($datei) . " (" . round(filesize($datei) / 1048576, 1) . " MB)\n";

// 2) Löschen
lager()->welt_sperren();
$db->beginTransaction();
$n = [];
foreach (['ow_spielstand', 'ow_bots', 'ow_welt_flicken', 'ow_befehle', 'ow_ereignisse', 'ow_sicherungen'] as $t)   // (Sicherungen der alten Welt passen nicht mehr – alles steht in altwelt_*.php)
    $n[$t] = $db->exec("DELETE FROM $t");
$db->exec("UPDATE ow_welt_info SET version = 0, versionen = NULL, welt_zeit = 0, leiter_id = 0, leiter_token = '', leiter_bis = 0 WHERE id = 1");
// spiel_token leeren: ein noch offenes altes Fenster bekommt beim Speichern 409 und kann keinen alten Stand zurückschreiben
$n['ow_spieler'] = $db->exec("UPDATE ow_spieler SET stufe = NULL, muenzen = NULL, gems = NULL, anzahl_basen = NULL, profil = NULL, profil_zeit = 0, spiel_token = '', sicht = NULL, sicht_v = sicht_v + 1");   // sicht: der Nebel der alten Welt
$db->commit();
lager()->welt_entsperren();
@unlink(__DIR__ . '/weltrechner/schummel.php');   // alte Auffälligkeiten gehören zur alten Welt
foreach ($n as $t => $z) echo "$t: $z\n";
echo "fertig – jetzt Wartung aus: der Weltrechner baut beim Start eine neue Welt\n";
