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
pruefe('Riesenmenge (absurd)', befehl_ok(['art' => 'truppen', 'n' => 1e31]), false);
pruefe('große ehrliche Menge (alte Welt) geht', befehl_ok(['art' => 'angriff', 'src' => 1, 'ziel' => 2, 'n' => 1e16]), true);
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

// --- Fremde Spieler (6.10.): nur Öffentliches – Helden, Ausrüstung, Skills, Stadt, Forschung erst im Spähbericht
$voll = '{"lvl":7,"macht":12345,"hs":{"ida":{"own":true,"q":4}},"gear":{"armor":{"r":3}},"spare":{},"skills":{"defense":5},"gems":900,"xp":5,"sp":1,"pts":3,"shields":{"2":1},"ps":{"s":1},"goals":{},"tp":50,'
    . '"city":{"levels":{"keep":4,"wall":9,"academy":3},"fo":{"m_def":5},"builds":[1]},"stats":{"caps":12,"tpEarned":40,"healed":99},"ring":"jade","march":"glut","frames":["gold"],"titles":["x"],"capital":17,"shieldUntil":5,"neuBis":0,"mensch":1,"tt":800}';
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"bot1":' . $voll . ',"u3":' . $voll . '}', 'u3'), true);
pruefe('fremd: ohne Helden/Ausrüstung/Skills/Gems/Schilde/Pass', array_values(array_intersect(array_keys($b['bot1']), ['hs', 'gear', 'spare', 'skills', 'gems', 'xp', 'sp', 'pts', 'shields', 'ps', 'goals', 'tp'])), []);
pruefe('fremd: Stadt nur Burg-Stufe', json_encode($b['bot1']['city']), '{"levels":{"keep":4}}');
pruefe('fremd: Rangliste-Zahlen bleiben', json_encode($b['bot1']['stats']), '{"caps":12,"tpEarned":40}');
pruefe('fremd: Macht, Stufe, Aussehen, Hauptstadt, Schild bleiben', [$b['bot1']['macht'], $b['bot1']['lvl'], $b['bot1']['ring'], $b['bot1']['march'], $b['bot1']['capital'], $b['bot1']['shieldUntil'], $b['bot1']['tt']], [12345, 7, 'jade', 'glut', 17, 5, 800]);
pruefe('eigener Eintrag ganz', [isset($b['u3']['hs']), $b['u3']['city']['levels']['wall'], $b['u3']['skills']['defense']], [true, 9, 5]);
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"u3":' . $voll . '}'), true);
pruefe('ohne Spieler-Nummer: alle fremd', isset($b['u3']['hs']), false);
$f = json_decode(flicken_fuer_spieler('openWaterBotState', '{"s":{"bot2":' . $voll . '},"d":{"bot1":{"s":{"hs":{"a":1},"city":{"levels":{"keep":5,"wall":2}},"macht":99,"gear":{}},"w":["spare","ring"]},"u3":{"s":{"hs":{"a":1},"city":{"levels":{"keep":5,"wall":2}}}}}}', 'u3'), true);
pruefe('Flicken fremd: neuer Eintrag gekürzt', [isset($f['s']['bot2']['hs']), json_encode($f['s']['bot2']['city'])], [false, '{"levels":{"keep":4}}']);
pruefe('Flicken fremd: Felder gekürzt', [isset($f['d']['bot1']['s']['hs']), isset($f['d']['bot1']['s']['gear']), $f['d']['bot1']['s']['macht'], json_encode($f['d']['bot1']['s']['city'])], [false, false, 99, '{"levels":{"keep":5}}']);
pruefe('Flicken fremd: Löschen nur Öffentliches', $f['d']['bot1']['w'], ['ring']);
pruefe('Flicken eigener Eintrag ganz', [isset($f['d']['u3']['s']['hs']), $f['d']['u3']['s']['city']['levels']['wall']], [true, 2]);
$p = profil_oeffentlich(json_decode(profil_bereinigen(json_encode(['lvl' => 9, 'skills' => ['attack' => 3], 'gear' => ['weapon' => ['r' => 2, 'lvl' => 3]], 'hs' => ['ida' => ['own' => true]],
    'city' => ['levels' => ['keep' => 3, 'wall' => 5]], 'fo' => ['m_atk' => 2], 'stats' => ['captures' => 4, 'healed' => 9], 'look' => ['ring' => 'jade'], 'coins' => 5]))));
pruefe('Profil anderer: nur Öffentliches', [isset($p->skills), isset($p->gear), isset($p->hs), isset($p->fo), isset($p->coins), json_encode($p->city), json_encode($p->stats), $p->lvl, $p->look->ring], [false, false, false, false, false, '{"levels":{"keep":3}}', '{"captures":4}', 9, 'jade']);

pruefe('Spähbericht darf vom Weltrechner kommen', in_array('spaeh', WELTRECHNER_NACHRICHTEN, true), true);

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

// --- Märsche: fremde Stärke auf meine Basis erst, wenn er dort kämpft (wie danach im Kampfbericht; Wachturm seit 4.10. raus)
$angr = json_encode([['attackerBotId' => 'bot7', 'targetId' => 5, 'rawTroops' => 123456789, 'hero' => 'h1'], ['attackerBotId' => 'bot7', 'targetId' => 5, 'rawTroops' => 123456789, 'fightEndsAt' => 99, 'hero' => 'h1']]);
$m = json_decode(marsch_teil('openWaterPendingAttacks', $angr, 'u3', [5 => 1]), true);
pruefe('Angriff auf mich, unterwegs: Stärke geheim', $m[0]['rawTroops'], 0);
pruefe('Angriff auf mich, unterwegs: kein Held', isset($m[0]['hero']), false);
pruefe('Angriff auf mich, kämpft schon: echte Stärke', $m[1]['rawTroops'], 123456789);
pruefe('Angriff auf mich, kämpft schon: Held zu sehen', $m[1]['hero'] ?? null, 'h1');
$m = json_decode(marsch_teil('openWaterPendingAttacks', $angr, 'u3', [9 => 1]), true);
pruefe('Angriff auf andere: nie Zahlen', $m[0]['rawTroops'], 0);

// --- Armeen und besetzte Felder: fremde nur mit Zahlen, wenn der Weltrechner sie als sichtbar meldet (sonst im Nebel)
$arm = json_encode(['armies' => [['id' => 'x1', 'who' => 'bot7', 'troops' => 500, 'hero' => 'h1'], ['id' => 'x2', 'who' => 'bot7', 'troops' => 600, 'hero' => 'h2'], ['id' => 'x3', 'who' => 'u3', 'troops' => 700]], 'joins' => [], 'raids' => []]);
$m = json_decode(marsch_teil('openWaterArmies', $arm, 'u3', [], ['x2' => true]), true);
pruefe('fremde Armee im Nebel: keine Zahl, kein Held', [$m['armies'][0]['troops'], $m['armies'][0]['hero']], [0, null]);
pruefe('fremde Armee gesehen: mit Zahl', $m['armies'][1]['troops'], 600);
pruefe('eigene Armee: immer mit Zahl', $m['armies'][2]['troops'], 700);
$fld = json_encode(['f1' => ['occ' => ['who' => 'bot7', 'troops' => 900, 'hero' => 'h1', 'got' => 50]], 'f2' => ['occ' => ['who' => 'bot7', 'troops' => 800]]]);
$m = json_decode(marsch_teil('openWaterFields', $fld, 'u3', [], ['f2' => true]), true);
pruefe('fremdes Feld im Nebel: keine Zahl', [$m['f1']['occ']['troops'], $m['f1']['occ']['hero'], $m['f1']['occ']['got']], [0, null, 0]);
pruefe('fremdes Feld gesehen: mit Zahl', $m['f2']['occ']['troops'], 800);

// --- Bündnisse: fremde Rallys ohne Truppenzahlen, fremde Logs weg; die eigenen bleiben ganz
$bd = json_encode(['b' => ['a1' => ['mit' => ['u3', 'bot1'], 'log' => [['t' => 'meins']]], 'a2' => ['mit' => ['bot7'], 'log' => [['t' => '5 Mio. Truppen']]]],
    'r' => [['id' => 'r1', 'aid' => 'a1', 'n0' => 1000, 'j' => [['w' => 'bot1', 'n' => 50]]], ['id' => 'r2', 'aid' => 'a2', 't' => 5, 'n0' => 9000, 'j' => [['w' => 'bot7', 'n' => 70]]]], 'n' => 3]);
$m = json_decode(marsch_teil('openWaterBuendnisse', $bd, 'u3', []), true);
pruefe('eigene Rally: Truppen bleiben', $m['r'][0]['n0'], 1000);
pruefe('fremde Rally: Truppen geheim', [$m['r'][1]['n0'], $m['r'][1]['j'][0]['n']], [0, 0]);
pruefe('fremde Rally: Ziel bleibt (Warnung)', $m['r'][1]['t'], 5);
pruefe('fremdes Bündnis: Log weg', isset($m['b']['a2']['log']), false);
pruefe('eigenes Bündnis: Log bleibt', $m['b']['a1']['log'][0]['t'], 'meins');

echo ($fehler ? "$fehler von $n Tests FEHLGESCHLAGEN\n" : "Alle $n Server-Tests bestanden.\n");
exit($fehler ? 1 : 0);
