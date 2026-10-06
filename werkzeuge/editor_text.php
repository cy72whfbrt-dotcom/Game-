<?php
// Inhalt aus dem Textfeld des Editors beim Hoster (hochladen.sh, werkzeuge/nach_hochladen.sh).
//   php werkzeuge/editor_text.php [<seite.html> [<ziel>]]   (ohne Seite: von stdin, ohne Ziel: nach stdout; kein Textfeld → Ende 1)
// Der Editor zeigt Rückstriche als Kürzel (Legende unter dem Textfeld: <nbsp> <bsl> <r> <n> <rn>; aus \\n wird <bsl><n>) –
// zurückverwandelt in einem Durchgang (strtr, längstes Kürzel zuerst). Gemessen 6.10. am echten Editor (server.php);
// ein geschütztes Leerzeichen zeigt er unverändert (darum <nbsp> nicht zurück).
$s = file_get_contents(($argv[1] ?? '-') === '-' ? 'php://stdin' : $argv[1]);
$a = stripos($s, '<textarea'); $e = strripos($s, '</textarea>');
if ($a === false || $e === false) exit(1);
$a = strpos($s, '>', $a); if ($a === false || $a > $e) exit(1);
$t = html_entity_decode(substr($s, $a + 1, $e - $a - 1), ENT_QUOTES | ENT_HTML5, 'UTF-8');
file_put_contents($argv[2] ?? 'php://stdout', strtr($t, ['<rn>' => '\r\n', '<r>' => '\r', '<n>' => '\n', '<bsl>' => '\\']));
