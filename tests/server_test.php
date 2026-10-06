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
    'city' => ['levels' => ['wall' => 1000, 'forge' => 9, 'gibtsnicht' => 5]], 'hs' => ['h1' => ['q' => 99, 'sk' => [99, 1], 'sh' => 1e12]], 'stats' => ['x' => 1e30], 'earned' => 1e30, 'tp' => 1e30])), true);
pruefe('Stufe gedeckelt', $p['lvl'], 2000);
pruefe('Thron-Punkte im Profil gedeckelt (Kappe beim Saison-Reset)', (float)$p['tp'], 1e12);
pruefe('Thron-Punkte im Profil nicht öffentlich', isset(profil_oeffentlich(json_decode(json_encode($p)))->tp), false);
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
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 50, 'fo' => ['m_laz2' => 9, 'x_tempo2' => 2, 'w_schutz' => 3, 'gibtsnicht' => 4]])), true);
pruefe('Forschung ab Labor 23 bleibt im Profil (höchstens 3)', [$p['fo']['m_laz2'], $p['fo']['x_tempo2'], $p['fo']['w_schutz'], isset($p['fo']['gibtsnicht'])], [3, 2, 3, false]);
pruefe('Kaputtes Profil', profil_bereinigen('kein json'), null);
// Langzeit (6.10.): Rohstoff-Gebäude bleiben im Profil, Bau- und Forschungs-Ende für den Push „Bau fertig“ / „Forschung fertig“
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3, 'city' => ['levels' => ['lumber' => 4, 'quarry' => 99, 'mine' => 2], 'bau' => ['gibtsnicht', 'wall', 'keep'], 'bauBis' => [5, 1700000000000, 'x'], 'foLauf' => 'm_atk', 'foBis' => 1700000500000]])), true);
pruefe('Holzfäller/Steinbruch/Eisenmine bleiben (höchstens 25)', [$p['city']['levels']['lumber'] ?? null, $p['city']['levels']['quarry'] ?? null, $p['city']['levels']['mine'] ?? null], [4, 25, 2]);
pruefe('Bau-Ende passt zum Gebäude (Unbekanntes fällt mit seiner Zeit weg)', [$p['city']['bau'] ?? null, $p['city']['bauBis'] ?? null], [['wall'], [1700000000000]]);
pruefe('Forschungs-Ende bleibt', $p['city']['foBis'] ?? null, 1700000500000);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3, 'city' => ['levels' => ['keep' => 2], 'foBis' => 'kaputt']])), true);
pruefe('ohne Bau/Forschung: keine Zeiten', [$p['city']['bau'], $p['city']['bauBis'] ?? null, $p['city']['foBis'] ?? null], [[], [], 0]);
pruefe('Push-Arten: Bau fertig, Forschung fertig', [in_array('bau', PUSH_ARTEN, true), in_array('forschung', PUSH_ARTEN, true)], [true, true]);

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
$bf = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"bot1":{"lvl":2,"foP":17,"city":{"levels":{"keep":4},"fo":{"m_def":5}}}}', 'u3'), true);
pruefe('fremd: Forschungs-Summe (Rangliste Hauptstadt) sichtbar, die Forschung selbst nicht', [$bf['bot1']['foP'] ?? null, isset($bf['bot1']['city']['fo'])], [17, false]);
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
// Münzen anderer (Mitspieler wie echte Spieler) sieht nur der Weltrechner
pruefe('Münzen ganz verborgen', weltteil_fuer_spieler('openWaterBotCoins', '{"bot1":500,"u3":900}', 'u3'), '{}');
$f = json_decode(flicken_fuer_spieler('openWaterBotCoins', '{"s":{"bot1":500,"u4":7}}', 'u3'), true);
pruefe('Münzen-Flicken verborgen', $f['s'] ?? null, []);
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"bot1":{"lvl":7}}', 'u3'), true);
pruefe('Stufe der Mitspieler bleibt', $b['bot1']['lvl'], 7);

// --- 3B: Hauptbuch und Gems nie beim Spieler, Nebel auf dem Server
$b = json_decode(weltteil_fuer_spieler('openWaterBotState', '{"u3":{"lvl":5,"hb":{"st":{"keep":[3,0]}},"hbK":1}}'), true);
pruefe('Hauptbuch verborgen', isset($b['u3']['hb']), false);
pruefe('Merker hbK bleibt', $b['u3']['hbK'], 1);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3, 'gems' => 1e20])), true);
pruefe('Gems im Profil gedeckelt', (float)$p['gems'], 1e13);
pruefe('Rohstoffe fehlen → null (nicht 0)', $p['res'], null);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3])), true);
pruefe('Gems fehlen → null', $p['gems'], null);
pruefe('Welt-Saison: Profil ohne Saison → 1', $p['saison'], 1);
$p = json_decode(profil_bereinigen(json_encode(['lvl' => 3, 'saison' => 4])), true);
pruefe('Welt-Saison: Saison des Spielstands bleibt im Profil', $p['saison'], 4);
pruefe('Welt-Saison: Saison-Sicherung bleibt 2 Wochen', SAISON_SICHERUNG_SEK, 14 * 86400);
pruefe('Welt-Saison: Wegräumen der Sicherungen schont die Saison-Sicherung', strpos(file_get_contents(__DIR__ . '/../Game/server.php'), "AND behalten_bis < ' . time()") !== false, true);
// Zurückspielen einer Sicherung mit fälligem Reset: angehalten bis zum Admin-Knopf (sonst begänne gleich wieder eine neue Saison)
$jz = 1700000000000;
$s = json_decode(saison_anhalten(json_encode(['nr' => 3, 'start' => 1, 'ende' => $jz - 1000, 'bald' => 1]), $jz), true);
pruefe('Welt-Saison zurückgespielt: Termin vorbei → angehalten', [$s['nr'], $s['halt']['seit'] ?? 0, $s['halt']['grund'] ?? ''], [3, $jz, 'sicherung']);
$s = json_decode(saison_anhalten(json_encode(['nr' => 3, 'start' => 1, 'ende' => $jz + 9e6, 'jetzt' => $jz - 5]), $jz), true);
pruefe('Welt-Saison zurückgespielt: Admin-Knopf gedrückt → angehalten, Anforderung weg', [isset($s['halt']), isset($s['jetzt'])], [true, false]);
$w = json_encode(['nr' => 3, 'start' => 1, 'ende' => $jz + 9e6]);
pruefe('Welt-Saison zurückgespielt: Termin noch nicht da → unverändert', saison_anhalten($w, $jz), $w);
pruefe('Welt-Saison zurückgespielt: kaputter Wert → unverändert', saison_anhalten('null', $jz), 'null');
pruefe('Welt-Saison: Nachrichten saison/saisonBald darf der Weltrechner schicken', in_array('saison', WELTRECHNER_NACHRICHTEN, true) && in_array('saisonBald', WELTRECHNER_NACHRICHTEN, true), true);
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

// Puls: Marsch-Teile, die nur als Flicken kamen, aus demselben festen Stand (vorgeladen) – kein Nachladen (hier ohne Datenbank)
$mw = ['setzen' => (object)['openWaterArmies' => '[]'], 'flicken' => (object)['openWaterPendingSends' => [['x']], 'openWaterArmies' => [['y']], 'islandTroops' => [['z']]]];
pruefe('marsch_fehlt: nur Marsch-Teile, die bloß als Flicken kamen', marsch_fehlt($mw), ['openWaterPendingSends']);
$mw2 = marsch_welt($mw, 1, ['eigen' => [], 'armeen' => []], ['openWaterPendingSends' => '[]']);
pruefe('marsch_welt: vorgeladenes Teil ganz geschickt, Flicken weg', [isset(((array)$mw2['setzen'])['openWaterPendingSends']), isset(((array)$mw2['flicken'])['openWaterPendingSends']), isset(((array)$mw2['flicken'])['islandTroops'])], [true, false, true]);
// Weltrechner-Leitung (Hänger bei Last): gilt 45 s, gerechnet ab dem ENDE seines Pulses (ein Puls von 15–30 s ist kein Ausfall)
pruefe('Leitung gilt 45 s', LEITER_SEK, 45);
$wp = file_get_contents(__DIR__ . '/../Game/server/07-welt-puls.php');
pruefe('Leitung ab Ende der Anfrage (time(), nicht $jetzt)', [strpos($wp, 'leiter_setzen(0, $tok, time() + leiter_sek(time() - ') !== false, strpos($wp, '$jetzt + LEITER_SEK') !== false], [true, false]);
// (6.10.) überlasteter Server: dauerte der Puls lange, gilt die Leitung doppelt so lange (höchstens 3 Min.) – kein „Verbindung …“ bei allen
pruefe('Leitung: schneller Puls 45 s, Puls 30 s → 60 s, Puls 93 s → 180 s (höchstens)', [leiter_sek(0), leiter_sek(30), leiter_sek(93), leiter_sek(600)], [45, 60, 180, 180]);
pruefe('Wachhund erkennt einen Absturz am Herzschlag, nicht an der Leitung', LEITER_SEK < 180 && strpos(file_get_contents(__DIR__ . '/../Game/weltrechner/wachhund.php'), 'const WR_HERZ_ALT = 180;') !== false, true);
// Wachhund (6.10.): bei überlastetem Office-Server Geduld statt Neustart – aber nur, wenn der Weltrechner selbst kaum rechnet
// (eine Endlosschleife rechnet) und höchstens 10 Min.
require_once __DIR__ . '/../Game/weltrechner/wachhund.php';
pruefe('Geduld: 5.10. 21:07 (Last 3 je Kern, selbst 2 von 27 s gerechnet)', wr_geduldig(200, 3.0, 2 / 27), true);
pruefe('keine Geduld: Endlosschleife (rechnet so viel, wie er bei der Last bekommt)', wr_geduldig(200, 3.0, 0.3), false);
pruefe('keine Geduld: Server nicht überlastet (echter Hänger)', wr_geduldig(200, 0.8, 0.0), false);
pruefe('keine Geduld: über 10 Min. ohne Herzschlag', wr_geduldig(601, 3.0, 0.0), false);
pruefe('Geduld ohne Messung nur eine Runde (dann ist eine da)', wr_geduldig(200, 3.0, null), true);
pruefe('Rechenzeit eines Prozesses lesbar (/proc)', is_float(wr_cpu(getmypid())) || is_int(wr_cpu(getmypid())), true);
$zw = []; pruefe('Anteil: erste Messung → noch keiner', [wr_anteil($zw, getmypid(), time()), $zw['cpu']['pid'] ?? 0], [null, getmypid()]);
$zw['cpu'] = ['pid' => getmypid(), 't' => time() - 60, 's' => wr_cpu(getmypid())];
$a = wr_anteil($zw, getmypid(), time()); pruefe('Anteil: nach 60 s gemessen (0…1), neue Messung gemerkt', [$a !== null && $a >= 0 && $a < 1, $zw['cpu']['t']], [true, time()]);
$zw['cpu'] = ['pid' => 4242, 't' => time() - 60, 's' => 0]; pruefe('Anteil: Messung eines anderen Prozesses zählt nicht', wr_anteil($zw, getmypid(), time()), null);
$wh = file_get_contents(__DIR__ . '/../Game/weltrechner/wachhund.php');
pruefe('Wachhund merkt sich die Start-Dauer (letzte 10)', strpos($wh, "\$z['startDauern'] = array_slice(") !== false && strpos($wh, "-10)") !== false, true);
pruefe('Wachhund: einmal am Tag eine Sicherung mit Spielerkonten', strpos($wh, 'lager()->letzte_sicherung_zeit(true) >= 84600') !== false && strpos($wh, 'sicherung_anlegen(0, $konten)') !== false, true);
// --- Datenbank-Teile ohne Datenbank: eine nachgemachte (merkt sich SQL und Werte)
class TestDb { public $sql = []; public $werte = []; public $zeilen = [];
    function prepare($q) { $this->sql[] = $q; return $this; } function exec($q) { $this->sql[] = $q; return 0; } function query($q) { $this->sql[] = $q; return $this; }
    function execute($w = []) { $this->werte[] = $w; return true; } function fetchAll() { return $this->zeilen; } }
class TestLager extends MysqlLager { public $info; function __construct() {}
    function welt_info() { return $this->info; }
    function stand_laden($uid, $nur = null) { $r = []; foreach ((array)$nur as $k) $r[$k] = '{"k":"' . $k . '"}'; return $r; } }
function test_lager() { $t = new TestLager; $db = new TestDb; $p = new ReflectionProperty(MysqlLager::class, 'db'); $p->setAccessible(true); $p->setValue($t, $db); return [$t, $db]; }
// Welt-Neustart (Version wieder klein): ein schlafender Tab mit seit=50000 bekommt trotzdem alle Teile
[$tl, $db] = test_lager(); $tl->info = ['version' => 3, 'versionen' => ['openWaterKarte' => 1, 'openWaterIslandTroops' => 3], 'welt_zeit' => 0];
$w = $tl->welt_seit_flicken(50000);
pruefe('Stand aus der Zukunft: alle Teile ganz', array_keys((array)$w['setzen']), ['openWaterKarte', 'openWaterIslandTroops']);
pruefe('Stand aus der Zukunft: keine Flicken, nichts aus der Datenbank', [(array)$w['flicken'], $db->sql], [[], []]);
pruefe('Puls prüft den Stand vor $ganz', strpos($wp, "if (\$seit > (int)\$i['version']) \$seit = 0;") < strpos($wp, '$ganz = (int)'), true);
// Spieler-Liste: Profile mit 5 s Überlappung; ohne „ganz“ nur, wer online ist/eben ging oder ein neues Profil hat
[$tl, $db] = test_lager(); $db->zeilen = [['id' => 7, 'name' => 'Anna', 'online_bis' => 0, 'profil_zeit' => 99000, 'profil' => null]];
$sl = $tl->spieler_liste(100000);
pruefe('Spieler-Liste: Überlappung 5 s', $db->werte[0], [95000]);
pruefe('Spieler-Liste ganz: ohne Bedingung', strpos($db->sql[0], 'WHERE'), false);
pruefe('Spieler-Liste: Eintrag', [$sl[0]['id'], $sl[0]['name'], $sl[0]['online'], $sl[0]['profil_zeit']], [7, 'Anna', false, 99000]);
[$tl, $db] = test_lager(); $tl->spieler_liste(0, false, false);
pruefe('Spieler-Liste nur Änderungen', [strpos($db->sql[0], 'WHERE online_bis > ? OR profil_zeit > ?') !== false, $db->werte[0][0], $db->werte[0][2], abs($db->werte[0][1] - (time() - 30)) <= 2], [true, 0, 0, true]);
$wj = file_get_contents(__DIR__ . '/../Game/welt.js');
pruefe('welt.js: doppeltes Profil nicht nochmal', strpos($wj, '!(m.profil && (s.profil_zeit || 0) <= (m.profilZeit || 0))') !== false, true);
pruefe('welt.js: ganze Spieler-Liste alle 10 s', strpos($wj, 'pulsStart - spielerAlleAt > 10000') !== false, true);
// Aufräumen: erledigte bezahlte Befehle bleiben 14 Tage (Saison-Sicherung bleibt 2 Wochen und holt sie beim Zurückspielen nach)
[$tl, $db] = test_lager(); $tl->aufraeumen();
pruefe('bezahlte Befehle 14 Tage', [strpos($db->sql[1], 'art IN') !== false, strpos($db->sql[1], 'fertig = 1 AND erstellt < NOW() - INTERVAL 14 DAY') !== false], [true, true]);
pruefe('Saison-Sicherung nicht länger als die Befehle', SAISON_SICHERUNG_SEK <= 14 * 86400, true);
// Puls-Antwort: kaputtes UTF-8 wird ersetzt (nicht die ganze Antwort weg); was gar nicht geht: false (→ 500 + Log)
pruefe('Antwort mit kaputtem UTF-8', welt_antwort_text(['name' => "Anna\xff"]), "{\"name\":\"Anna\u{FFFD}\"}");
pruefe('Antwort, die nicht geht', welt_antwort_text(['x' => NAN]), false);
pruefe('Antwort: false → 500', strpos($wp, "json_antwort(500,") !== false, true);
// Wachhund im Puls erst nach der Antwort (wenn der Server die Anfrage vorher abschließen kann)
pruefe('Wachhund nach der Antwort', [strpos($wp, "welt_antwort(\$antwort, \$wachhund ? 'puls_wachhund' : null)") !== false, strpos($wp, 'fastcgi_finish_request') !== false], [true, true]);
// Login-Grenzen pro Adresse (Schulklassen, Alexander 5.10.): 30 neue Konten pro Stunde, 100 Fehlversuche in 15 Min.
$ix = file_get_contents(__DIR__ . '/../Game/index.php');
pruefe('Grenze neue Konten', strpos($ix, "bremse('neu:' . client_ip(), 30, 3600)") !== false, true);
pruefe('Grenze Fehlversuche je Adresse', strpos($ix, "bremse('loginip:' . client_ip(), 100, 900)") !== false, true);
// Startseite im Spiel-Stil (11b F): Regeln vor dem Fehler sichtbar, Auge kein Absende-Knopf, App-Link als Knopf, nichts im Browser speichern
pruefe('Startseite: Regel 10 Zeichen vorab', [strpos($ix, 'id="pwRegel" data-min="10">Mindestens 10 Zeichen') !== false, strpos($ix, 'id="nameRegel" data-min="3">3 bis 20 Zeichen') !== false], [true, true]);
pruefe('Startseite: Auge ist type=button', [strpos($ix, '<button type="button" class="auge"') !== false, substr_count($ix, '<button type="submit"')], [true, 5]);
pruefe('Startseite: App-Link als Knopf, Spiel-Schrift', [strpos($ix, '<a class="knopf2" href="app/">') !== false, strpos($ix, 'Times New Roman') === false, strpos($ix, 'family=Cinzel') !== false], [true, true, true]);
pruefe('Startseite: kein Browser-Speicher, Skript nur mit Nonce', [preg_match('/localStorage|sessionStorage|indexedDB|document\.cookie/', $ix), substr_count($ix, '<script'), substr_count($ix, '<script nonce="<?= h(csp_nonce()) ?>">')], [0, 1, 1]);
// CSP: fremde Skripte nur genau three.js (nicht ganz jsdelivr) – und genau die Datei, die die Spielseite einbindet
$sh = file_get_contents(__DIR__ . '/../Game/server/02-sicherheit-datenlecks.php');
pruefe('CSP nur three.js', [strpos($sh, "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js; script-src-attr") !== false, strpos($sh, 'https://cdn.jsdelivr.net;') !== false], [true, false]);
pruefe('Spielseite bindet genau diese Datei ein', strpos(file_get_contents(__DIR__ . '/../Game/spielseite/08-dialoge-stadt-skripte.php'), 'data-three="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"') !== false, true);   // (lädt spiel.js nach dem ersten Bild: dreiDLaden)
// Skript-Adressen (schneller laden, 6.10.): verkleinert über skript.php, wenn Game/klein/ aktuell ist – sonst das Original
$g = __DIR__ . '/../Game';
$sha = sha1_file("$g/spiel.js"); $frisch = strpos((string)@file_get_contents("$g/klein/spiel.js", false, null, 0, 160), "/* verkleinert aus spiel.js · $sha · ") === 0;
pruefe('Skript-Adresse spiel', skript('spiel'), $frisch ? 'skript.php?d=spiel&amp;v=' . substr($sha, 0, 12) : 'spiel.js?v=' . filemtime("$g/spiel.js"));
pruefe('Skript ohne verkleinerte Fassung → Original', skript('sw'), 'sw.js?v=' . filemtime("$g/sw.js"));
$sk = file_get_contents("$g/skript.php"); preg_match("/const SKRIPTE = \[([^\]]*)\]/", $sk, $m1); preg_match("/const SKRIPTE = \[([^\]]*)\]/", file_get_contents(__DIR__ . '/../werkzeuge/verkleinern.js'), $m2);
pruefe('Startseite holt die Skripte vorab (nicht in der Wartung)', strpos($ix, "if (!wartung()) foreach (['ladebildschirm', 'speichern', 'bots', 'welt', 'spiel', 'aufbau', 'buendnis', 'haendler', 'benachrichtigung'] as \$s) echo '<link rel=\"prefetch\" href=\"' . skript(\$s) . '\">'") !== false, true);
pruefe('Spielseite gepackt (nach dem Login-Teil)', preg_match("/spielseite_vorbereiten\(\);[^\n]*\nif \(!ini_get\('zlib.output_compression'\) && function_exists\('ob_gzhandler'\)\) ob_start\('ob_gzhandler'\);/", file_get_contents("$g/spiel.php")), 1);
pruefe('skript.php und verkleinern.js: dieselbe Liste', [$m1[1] ?? 'fehlt', strpos($sk, "in_array(\$name, SKRIPTE, true)") !== false], [$m2[1] ?? 'fehlt2', true]);
// Game/klein/ ist nicht im Git: Vorschau/alle_tests.sh und hochladen.sh prüfen nach dem Bauen, dass jede Datei da ist
$w = __DIR__ . '/../werkzeuge'; $hs = file_get_contents(__DIR__ . '/../hochladen.sh');
pruefe('hochladen.sh: klein/ vollständig vor dem Hochladen', [strpos($hs, 'node werkzeuge/verkleinern.js voll ||') > strpos($hs, 'werkzeuge/spiel_bauen.sh ||'), strpos($hs, 'node werkzeuge/verkleinern.js voll ||') < strpos($hs, 'AENDERN=""')], [true, true]);
pruefe('Vorschau und alle_tests.sh: klein/ vollständig', [strpos(file_get_contents("$w/vorschau_bauen.php"), "verkleinern.js') . ' voll") !== false, strpos(file_get_contents(__DIR__ . '/alle_tests.sh'), 'node werkzeuge/verkleinern.js voll ') !== false], [true, true]);
// Profil → Einstellungen → Version: Zeit von spiel.js kommt mit der Spielseite (die Skript-Adresse hat jetzt die sha1)
pruefe('Spielseite nennt die Version', strpos(file_get_contents("$g/server/03-nebel-maersche-seite.php"), "'version' => filemtime(__DIR__ . '/spiel.js'),") !== false, true);
echo ($fehler ? "$fehler von $n Tests FEHLGESCHLAGEN\n" : "Alle $n Server-Tests bestanden.\n");
exit($fehler ? 1 : 0);
