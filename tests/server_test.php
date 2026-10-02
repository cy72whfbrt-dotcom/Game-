<?php
// Tests für die Sicherheits-Teile von Game/server.php (ohne Datenbank).  Aufruf:  php tests/server_test.php
// Lädt server.php nur für die Funktionen (keine Anfrage wird beantwortet).
$_SERVER['SCRIPT_FILENAME'] = __FILE__;
ob_start(); require __DIR__ . '/../Game/server.php'; ob_end_clean();
$fehler = 0; $n = 0;
function pruefe($name, $ist, $soll) { global $fehler, $n; $n++; if ($ist !== $soll) { $fehler++; echo "FEHLER: $name – erwartet " . var_export($soll, true) . ', bekommen ' . var_export($ist, true) . "\n"; } }

// --- Befehle: nur bekannte Arten, nur echte Zahlen
pruefe('Angriff normal', befehl_ok(['art' => 'angriff', 'src' => 12, 'ziel' => 40, 'n' => 500, 'at' => 1]), true);
pruefe('unbekannte Art', befehl_ok(['art' => 'nichtda']), false);
pruefe('Zahl als Text', befehl_ok(['art' => 'angriff', 'src' => 1, 'ziel' => 2, 'n' => 'x']), false);
pruefe('negative Menge', befehl_ok(['art' => 'truppen', 'n' => -5]), false);
pruefe('Riesenmenge', befehl_ok(['art' => 'truppen', 'n' => 1e16]), false);
pruefe('Stufe als Text', befehl_ok(['art' => 'ausbau', 'insel' => 3, 'stufe' => '7']), false);
pruefe('zu tief verschachtelt', befehl_ok(['art' => 'armee', 'ziel' => ['a' => ['b' => ['c' => ['d' => ['e' => 1]]]]]]), false);
pruefe('HTML im Text', befehl_ok(['art' => 'titel', 'key' => '<script>']), false);
pruefe('zu langer Text', befehl_ok(['art' => 'titel', 'key' => str_repeat('x', 300)]), false);
pruefe('Bündnis-Befehl', befehl_ok(['art' => 'bund', 'op' => 'gruenden', 'name' => 'Test Bund', 'tag' => 'TB', 'farbe' => 2, 'zeichen' => 1, 'offen' => true, 'at' => 1]), true);
pruefe('Bündnis-Name mit HTML', befehl_ok(['art' => 'bund', 'op' => 'gruenden', 'name' => '<b>x</b>']), false);
pruefe('Bündnis-Geschenk ok', bund_geschenk_ok(['art' => 'bundGeschenk', 'coins' => 2000, 'tr' => 500, 'crate' => 1, 'hint' => 'X hat einen Boss besiegt']), true);
pruefe('Bündnis-Geschenk mit Gems', bund_geschenk_ok(['art' => 'bundGeschenk', 'coins' => 2000, 'gems' => 500]), false);
pruefe('Bündnis-Geschenk Gold-Kiste', bund_geschenk_ok(['art' => 'bundGeschenk', 'coins' => 1, 'crate' => 4]), false);
pruefe('Bündnis-Geschenk riesig', bund_geschenk_ok(['art' => 'bundGeschenk', 'coins' => 1e14]), false);
pruefe('Armee mit Koordinaten (auch minus)', befehl_ok(['art' => 'armee', 'op' => 'neu', 'pt' => ['x' => -3500.5, 'y' => 1200, 'lm' => 4], 'quellen' => [1, 2]]), true);

// --- Profil: Fantasiewerte werden auf echte Spielgrenzen gekappt
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 99999, 'coins' => 1e19, 'wounded' => -5, 'shieldUntil' => 1e15, 'neuBis' => 1e15,
    'skills' => ['attack' => 99999, 'speed' => 99, 'erfunden' => 5], 'gear' => ['weapon' => ['r' => 9, 'lvl' => 999, 'st' => 99]],
    'city' => ['levels' => ['wall' => 1000, 'forge' => 9, 'gibtsnicht' => 5]], 'hs' => ['h1' => ['q' => 99, 'sk' => [99, 1], 'sh' => 1e12]], 'stats' => ['x' => 1e30], 'earned' => 1e30])), true);
pruefe('Stufe gedeckelt', $p['lvl'], 2000);
pruefe('Münzen gedeckelt', (float)$p['coins'], 1e15);
pruefe('Verwundete nie negativ', $p['wounded'], 0);
pruefe('Schild höchstens 8 Tage', $p['shieldUntil'] <= time() * 1000 + 8 * 86400000, true);
pruefe('Anfängerschutz höchstens 48 h', $p['neuBis'] <= time() * 1000 + 48 * 3600000, true);
pruefe('Tempo-Skill höchstens 10', $p['skills']['speed'], 10);
pruefe('Angriff-Skill höchstens 50', $p['skills']['attack'], 50);
pruefe('unbekannter Skill weg', isset($p['skills']['erfunden']), false);
pruefe('Skillpunkte höchstens Stufe+20', array_sum($p['skills']) <= 2020, true);
pruefe('Seltenheit 0–5', $p['gear']['weapon']['r'], 5);
pruefe('Gegenstand-Stufe höchstens 20', $p['gear']['weapon']['lvl'], 20);
pruefe('Sterne höchstens 5', $p['gear']['weapon']['st'], 5);
pruefe('Mauer höchstens 25', $p['city']['levels']['wall'], 25);
pruefe('Schmiede höchstens 5', $p['city']['levels']['forge'], 5);
pruefe('unbekanntes Gebäude weg', isset($p['city']['levels']['gibtsnicht']), false);
pruefe('Held: Stufe höchstens 20', $p['hs']['h1']['q'], 20);
pruefe('Held: Fähigkeit höchstens 5', $p['hs']['h1']['sk'][0], 5);
pruefe('Kaputtes Profil', profil_bereinigen('kein json'), null);

// --- Flicken: hin und zurück, leere {} bleiben {}
$o = json_decode('{"a":{"x":1,"y":2},"b":5,"c":{}}');
pruefe('Flicken anwenden', flicken_anwenden($o, json_decode('{"s":{"b":6,"n":{}},"w":["c"],"d":{"a":{"s":{"x":9},"w":["y"]}}}')), true);
pruefe('Flicken Ergebnis', json_encode($o), '{"a":{"x":9},"b":6,"n":{}}');
pruefe('Flicken auf fehlenden Eintrag', flicken_anwenden(json_decode('{"a":1}'), json_decode('{"d":{"z":{"s":{"x":1}}}}')), false);

// --- Datenlecks: Gedanken der Mitspieler kommen nie beim Spieler an
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"bot1":{"lvl":5,"grudge":{"u3":1},"vendetta":{"who":"u3"},"plan":[1],"wache":{"lv":3},"handy":{"k":1,"n":1,"r":5,"bis":0}}}'), true);
pruefe('Bot behält Stufe', $b['bot1']['lvl'], 5);
pruefe('Bot ohne Groll/Rache/Plan/Wache', array_intersect(array_keys($b['bot1']), ['grudge', 'vendetta', 'plan', 'wache', 'dOffen']), []);
pruefe('Handy-Reaktionszeit verborgen', isset($b['bot1']['handy']), false);
$f = json_decode(flicken_fuer_spieler('openWaterBotState', '{"d":{"bot1":{"s":{"grudge":{"u3":2},"lvl":6,"handy":{"r":9,"bis":0}}}}}'), true);
pruefe('Flicken ohne Groll', isset($f['d']['bot1']['s']['grudge']), false);
pruefe('Flicken behält Stufe', $f['d']['bot1']['s']['lvl'], 6);
pruefe('Flicken löscht Handy beim Spieler', in_array('handy', $f['d']['bot1']['w'] ?? [], true), true);

// --- 3B: Hauptbuch und Gems nie beim Spieler, Nebel auf dem Server
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"u3":{"lvl":5,"hb":{"st":{"keep":[3,0]}},"hbK":1}}'), true);
pruefe('Hauptbuch verborgen', isset($b['u3']['hb']), false);
pruefe('Merker hbK bleibt', $b['u3']['hbK'], 1);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3, 'gems' => 1e20])), true);
pruefe('Gems im Profil gedeckelt', (float)$p['gems'], 1e13);
pruefe('Rohstoffe fehlen → null (nicht 0)', $p['res'], null);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3])), true);
pruefe('Gems fehlen → null', $p['gems'], null);
$bits = str_repeat("\0", 4); $bits[1] = chr(1 << 2);   // Insel 10 sichtbar
$s = ['bits' => $bits, 'eigen' => [3 => true]];
pruefe('sieht Insel 10', nebel_sieht($s, '10'), true);
pruefe('sieht eigene Insel 3', nebel_sieht($s, 3), true);
pruefe('sieht Insel 11 nicht', nebel_sieht($s, 11), false);
pruefe('sieht Insel außerhalb nicht', nebel_sieht($s, 9999), false);
pruefe('Truppen gefiltert', nebel_teil('{"3":500,"10":7,"11":900,"200":1}', $s), '{"3":500,"10":7}');
pruefe('leerer Teil bleibt {}', nebel_teil('{"11":900}', $s), '{}');
pruefe('Flicken gefiltert', nebel_flicken('{"s":{"10":8,"11":901},"w":["12"]}', $s), '{"s":{"10":8},"w":["12"]}');
$w = nebel_welt(['setzen' => (object)['openWaterIslandTroops' => '{"10":1,"11":2}', 'openWaterIslandLevels' => '{"11":5}'], 'flicken' => (object)['openWaterNeutralTroopOverrides' => ['{"s":{"11":1}}']]], $s);
pruefe('Welt: Truppen gefiltert', $w['setzen']->openWaterIslandTroops, '{"10":1}');
pruefe('Welt: andere Teile unverändert', $w['setzen']->openWaterIslandLevels, '{"11":5}');
pruefe('Welt: Flicken gefiltert', $w['flicken']->openWaterNeutralTroopOverrides[0], '{"s":{}}');
pruefe('Befehl spaehen erlaubt', befehl_ok(['art' => 'spaehen', 'ziel' => 12, 'ex' => -300, 'ey' => 4000, 'at' => 1]), true);

// --- Herkunft: fremde Seiten dürfen nichts abschicken
$_SERVER['HTTP_HOST'] = 'office.hobbitonhill.de';
unset($_SERVER['HTTP_ORIGIN'], $_SERVER['HTTP_SEC_FETCH_SITE']); pruefe('ohne Origin (alter Browser)', herkunft_ok(), true);
$_SERVER['HTTP_ORIGIN'] = 'https://office.hobbitonhill.de'; pruefe('eigene Seite', herkunft_ok(), true);
$_SERVER['HTTP_ORIGIN'] = 'https://boese.example'; pruefe('fremde Seite', herkunft_ok(), false);
$_SERVER['HTTP_ORIGIN'] = 'https://office.hobbitonhill.de.boese.example'; pruefe('Täusch-Adresse', herkunft_ok(), false);
unset($_SERVER['HTTP_ORIGIN']); $_SERVER['HTTP_SEC_FETCH_SITE'] = 'cross-site'; pruefe('Browser meldet fremd', herkunft_ok(), false);

echo ($fehler ? "$fehler von $n Tests FEHLGESCHLAGEN\n" : "Alle $n Server-Tests bestanden.\n");
exit($fehler ? 1 : 0);
