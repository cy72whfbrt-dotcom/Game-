// Teil 05-datenbank-welt.php: MysqlLager: Welt, Sicherungen, Befehle, Nachrichten, Web-Push-Daten

    // ===== Welt =====
    function welt_sperren() { if ((int)$this->db->query("SELECT GET_LOCK('ow_welt', 15)")->fetchColumn() !== 1) throw new RuntimeException('Welt-Sperre nicht bekommen'); }
    function welt_entsperren() { $this->db->query("SELECT RELEASE_LOCK('ow_welt')"); }
    // Lesen aus einem festen Stand – OHNE die Welt-Sperre (die braucht nur, wer schreibt: der Weltrechner, Zurückspielen).
    // Alles, was $f liest, stammt aus demselben Augenblick: der Weltrechner schreibt Welt, Version und Flicken immer in EINER
    // Transaktion (Zurückspielen und Welt-Neustart auch) – man sieht also nie einen halben Stand. In $f nichts schreiben.
    function fest_lesen(callable $f) {
        if ($this->tiefe > 0 || $this->db->inTransaction()) return $f();   // (schon in einer Transaktion)
        $this->db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');   // (nur für die nächste Transaktion)
        try { $this->db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'); }
        catch (PDOException $e) { $this->db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT'); }   // (alte Datenbank ohne READ ONLY)
        try { $r = $f(); }
        catch (Throwable $e) { try { $this->db->exec('ROLLBACK'); } catch (Throwable $x) {} throw $e; }
        $this->db->exec('COMMIT');
        return $r;
    }
    function welt_info() {
        $r = $this->db->query('SELECT version, versionen, leiter_id, leiter_token, leiter_bis, welt_zeit, zurueck FROM ow_welt_info WHERE id = 1')->fetch();
        $r['versionen'] = json_decode((string)$r['versionen'], true) ?: [];
        return $r;
    }
    function leiter_setzen($uid, $tok, $bis) {
        $this->db->prepare('UPDATE ow_welt_info SET leiter_id = ?, leiter_token = ?, leiter_bis = ? WHERE id = 1')->execute([$uid, $tok, $bis]);
    }
    // Weltrechner schreibt: Teile speichern, Version hochzählen, je Teil merken, in welcher Version er zuletzt geändert wurde
    // $flicken: [schluessel => Flicken-Text] – nur die Änderungen eines großen Teils (siehe flicken_anwenden).
    // Gibt die Version zurück und in $voll die Teile, deren Flicken nicht passte (die soll der Weltrechner ganz schicken).
    function welt_schreiben($setzen, $loeschen, $welt_zeit, $flicken = [], &$voll = []) {
        $i = $this->welt_info();
        $v = (int)$i['version'] + 1;
        $vs = $i['versionen'];
        $voll = []; $gemerkt = [];
        foreach ($setzen as $k => $_) { $vs[$k] = $v; $gemerkt[$k] = null; }   // ganz geschrieben
        foreach ($loeschen as $k) { $vs[$k] = $v; $gemerkt[$k] = null; }
        if ($flicken) {
            $alt = $this->stand_laden(0, array_keys($flicken));
            foreach ($flicken as $k => $text) {
                $p = json_decode($text);
                $obj = isset($alt[$k]) ? json_decode($alt[$k]) : null;
                if (!is_object($p) || !is_object($obj) || !flicken_anwenden($obj, $p)) { $voll[] = $k; continue; }
                $neu = json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
                if ($neu === false || !sauber_json($neu)) { $voll[] = $k; continue; }
                if ($k === 'openWaterBotOwnedIslands') $basenNeu = $obj;
                if (isset(self::BOT_TEILE[$k])) $this->bots_teilweise(0, self::BOT_TEILE[$k], $obj, $p);   // nur geänderte Zeilen
                else $setzen[$k] = $neu;
                $vs[$k] = $v; $gemerkt[$k] = $text;
            }
        }
        $this->stand_schreiben(0, $setzen, $loeschen);
        $f = $this->db->prepare('INSERT INTO ow_welt_flicken (version, schluessel, flicken) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE flicken = VALUES(flicken)');
        foreach ($gemerkt as $k => $text) $f->execute([$v, $k, $text]);
        if ($v % 50 === 0) $this->db->prepare('DELETE FROM ow_welt_flicken WHERE version < ?')->execute([$v - 600]);
        if (isset($setzen['openWaterBotOwnedIslands']) || isset($basenNeu)) {   // Übersicht: Basen jedes echten Spielers in ow_spieler
            $b = isset($basenNeu) ? json_decode(json_encode($basenNeu), true) : (json_decode($setzen['openWaterBotOwnedIslands'], true) ?: []);
            $soll = []; foreach ($b as $wer => $liste) if (preg_match('/^u(\d+)$/', $wer, $m)) $soll[(int)$m[1]] = is_array($liste) ? count($liste) : 0;
            // nur, wo sich die Zahl geändert hat (vorher: jede Zeile bei jedem Puls – hielt die Transaktion lang und sperrte die
            // Zeilen der Spieler, die gerade speichern)
            $ist = [];
            foreach (array_chunk(array_keys($soll), 500) as $t) { $q = $this->db->prepare('SELECT id, anzahl_basen FROM ow_spieler WHERE id IN (' . implode(',', array_fill(0, count($t), '?')) . ')'); $q->execute($t);
                foreach ($q as $z) $ist[(int)$z['id']] = $z['anzahl_basen'] === null ? null : (int)$z['anzahl_basen']; }
            $q = $this->db->prepare('UPDATE ow_spieler SET anzahl_basen = ? WHERE id = ?');
            foreach ($soll as $id => $n) if (array_key_exists($id, $ist) && $ist[$id] !== $n) $q->execute([$n, $id]);
        }
        $this->db->prepare('UPDATE ow_welt_info SET version = ?, versionen = ?, welt_zeit = GREATEST(welt_zeit, ?) WHERE id = 1')->execute([$v, json_encode($vs), (int)$welt_zeit]);
        return $v;
    }
    // Was hat sich seit Version $seit geändert? (seit = 0: alles)
    function welt_seit($seit) {
        $i = $this->welt_info();
        $neu = []; $weg = [];
        foreach ($i['versionen'] as $k => $v) if ($v > $seit) $neu[] = $k;
        $teile = $this->stand_laden(0, $neu);
        foreach ($neu as $k) if (!isset($teile[$k])) $weg[] = $k;
        return ['version' => (int)$i['version'], 'setzen' => (object)$teile, 'loeschen' => $weg, 'welt_zeit' => (int)$i['welt_zeit']];
    }
    // Für die Spieler: wie welt_seit, aber große Teile nur als Änderungen („flicken“: [Teil => [Flicken-Texte der Reihe nach]]),
    // wenn alle Änderungen seit $seit noch gemerkt sind – sonst der ganze Teil.
    function welt_seit_flicken($seit) {
        $i = $this->welt_info();
        if ($seit > (int)$i['version']) $seit = 0;   // Stand aus einer „Zukunft“ (nach welt_neustart: Version wieder klein) – sonst kämen nur einmal geschriebene Teile nie mehr
        $neu = []; foreach ($i['versionen'] as $k => $v) if ($v > $seit) $neu[] = $k;
        $flicken = []; $ganz = $neu;
        if ($seit > 0 && $neu && $seit >= (int)$i['version'] - 590) {
            $in = implode(',', array_fill(0, count($neu), '?'));
            $q = $this->db->prepare("SELECT version, schluessel, flicken FROM ow_welt_flicken WHERE version > ? AND version <= ? AND schluessel IN ($in) ORDER BY version");
            $q->execute(array_merge([(int)$seit, (int)$i['version']], $neu));   // (nie Flicken aus einer „Zukunft“, z. B. nach dem Zurückspielen einer Sicherung)
            $liste = []; $kaputt = [];
            foreach ($q as $z) { if ($z['flicken'] === null) $kaputt[$z['schluessel']] = true; else $liste[$z['schluessel']][] = $z['flicken']; }
            $ganz = [];
            foreach ($neu as $k) { if (isset($kaputt[$k]) || empty($liste[$k])) $ganz[] = $k; else $flicken[$k] = $liste[$k]; }
        }
        $teile = $this->stand_laden(0, $ganz);
        $weg = []; foreach ($ganz as $k) if (!isset($teile[$k])) $weg[] = $k;
        return ['version' => (int)$i['version'], 'setzen' => (object)$teile, 'flicken' => (object)$flicken, 'loeschen' => $weg, 'welt_zeit' => (int)$i['welt_zeit']];
    }
    // wie viele Teile hätte der Spielstand mit diesen neuen Schlüsseln? (Schutz gegen Müll-Schlüssel)
    function anzahl_teile($uid, $neu) {
        $q = $this->db->prepare("SELECT schluessel FROM ow_spielstand WHERE spieler_id = ?"); $q->execute([$uid]);
        $da = array_flip($q->fetchAll(PDO::FETCH_COLUMN));
        foreach ($neu as $k) $da[$k] = 1;
        return count($da);
    }
    // ===== Sicherungen der Welt =====
    // $konten (6.10., einmal am Tag – wachhund.php): dazu die Spielerkonten (ow_spieler; Passwörter nur als gespeicherte Prüfwerte
    // pw_hash) und die privaten Spielstände (ow_spielstand/ow_bots der Spieler) – aus demselben festen Stand wie die Welt.
    public $sicherung_info = null;   // (für das Log des Wachhunds: Dauer, Größe)
    function sicherung_anlegen($behalten_bis = 0, $konten = false) {   // behalten_bis (Unix-Zeit): so lange nicht wegräumen (Saison-Sicherung: 2 Wochen)
        $t0 = microtime(true);
        // alle Tabellen aus demselben Stand (fester Stand statt Welt-Sperre: der Weltrechner muss nicht warten)
        [$sp, $bo, $v, $k] = $this->fest_lesen(function () use ($konten) {
            return [$this->db->query('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = 0')->fetchAll(),
                $this->db->query('SELECT bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand FROM ow_bots WHERE spieler_id = 0')->fetchAll(),
                $this->db->query('SELECT version FROM ow_welt_info WHERE id = 1')->fetchColumn(),   // welcher Welt-Stand das ist
                $konten ? ['spieler' => $this->db->query('SELECT * FROM ow_spieler ORDER BY id')->fetchAll(),
                    'staende' => $this->db->query('SELECT spieler_id, schluessel, wert FROM ow_spielstand WHERE spieler_id > 0')->fetchAll(),
                    'bots' => $this->db->query('SELECT spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand FROM ow_bots WHERE spieler_id > 0')->fetchAll()] : null];
        });
        if (!sicherung_gueltig(['spielstand' => $sp, 'bots' => $bo])) return 0;   // eine leere/kaputte Welt verdrängt nie eine gute Sicherung
        $d = ['spielstand' => $sp, 'bots' => $bo, 'version' => (int)$v]; if ($k !== null) $d['konten'] = $k;
        unset($sp, $bo, $k);   // (Speicher früh freigeben)
        $j = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); unset($d);   // (ein alter Name mit kaputtem UTF-8 verhindert nie die ganze Sicherung)
        if ($j === false) return 0;
        $roh = strlen($j);
        $gz = gzencode($j, 3); unset($j);   // (Stufe 3: kaum größer als 6, aber viel weniger Rechenzeit auf dem geteilten Server)
        if ($gz === false || gzdecode($gz) === false) return 0;   // (nur ganz lesbare Sicherungen)
        $this->db->prepare('INSERT INTO ow_sicherungen (groesse, daten, behalten_bis, konten) VALUES (?, ?, ?, ?)')->execute([strlen($gz), $gz, (int)$behalten_bis, $konten ? 1 : 0]);
        $id = (int)$this->db->lastInsertId();
        $this->db->exec('DELETE FROM ow_sicherungen WHERE id <= ' . ($id - 48) . ' AND behalten_bis < ' . time());   // die letzten 48 bleiben (und die Saison-Sicherung 2 Wochen)
        $this->sicherung_info = ['ms' => (int)round((microtime(true) - $t0) * 1000), 'roh' => $roh, 'gz' => strlen($gz), 'konten' => (bool)$konten];
        return $id;
    }
    function letzte_sicherung_zeit($konten = false) { return (int)$this->db->query('SELECT UNIX_TIMESTAMP(MAX(erstellt)) FROM ow_sicherungen' . ($konten ? ' WHERE konten = 1' : ''))->fetchColumn(); }
    function sicherungen_liste() { return $this->db->query('SELECT id, erstellt, groesse, behalten_bis, konten FROM ow_sicherungen ORDER BY id DESC')->fetchAll(); }
    // Eine Sicherung zurückspielen (der Weltrechner muss dafür aus sein). Alle Teile bekommen eine neue Version → alle laden neu.
    // Vorher wird der jetzige Stand selbst gesichert (nichts geht still verloren – auch das Zurückspielen lässt sich zurückspielen).
    // Bereits ausgeführte Befehle bleiben quittiert (sie laufen nie ein zweites Mal), nicht ausgeführte warten weiter;
    // Auszahlungen, die der Weltrechner danach nochmal macht, haben feste Nummern und kommen nicht doppelt an.
    // $alles (6.10., nur mit Rückfrage im Admin, nur Sicherungen mit Konten): dazu die Spielerkonten und privaten Spielstände
    // (konten_zurueck). Ohne: nur die Welt wie bisher – die Spielstände der Spieler bleiben.
    function sicherung_zurueck($id, $alles = false) {
        $q = $this->db->prepare('SELECT daten, erstellt FROM ow_sicherungen WHERE id = ?'); $q->execute([(int)$id]); $z = $q->fetch() ?: ['daten' => '', 'erstellt' => ''];
        $d = json_decode((string)@gzdecode((string)$z['daten']), true); $damals = (string)$z['erstellt']; unset($z);
        if (!sicherung_gueltig($d) || ($alles && !konten_gueltig($d['konten'] ?? null))) return false;
        $vorher = $this->sicherung_anlegen(0, $alles);   // der jetzige Stand (bei „alles“ mit Konten) – ist er selbst kaputt (oft der Grund fürs Zurückspielen), gibt es keine
        if (!$vorher) error_log('Open Water: Zurückspielen ohne Vorab-Sicherung – der jetzige Stand ist nicht vollständig');   // Sicherung davon, aber das Zurückspielen geht
        $this->welt_sperren();
        try {
        $this->db->beginTransaction();
        $this->db->exec('DELETE FROM ow_spielstand WHERE spieler_id = 0');
        $this->db->exec('DELETE FROM ow_bots WHERE spieler_id = 0');
        $this->db->exec('DELETE FROM ow_welt_flicken');   // alte Änderungen passen nicht mehr zum zurückgespielten Stand
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (0, ?, ?)');
        foreach ($d['spielstand'] as $z) $s->execute([$z['schluessel'], $z['schluessel'] === 'openWaterSaison' ? saison_anhalten($z['wert'], (int)round(microtime(true) * 1000)) : $z['wert']]);   // (ein fälliger Saison-Reset wartet auf den Admin-Knopf)
        $b = $this->db->prepare('INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES (0, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($d['bots'] as $z) $b->execute([$z['bot_id'], $z['nr'], $z['stufe'], $z['muenzen'], $z['anzahl_basen'], $z['basen'], $z['zustand']]);
        $i = $this->welt_info(); $v = (int)$i['version'] + 1; $vs = [];
        foreach ($d['spielstand'] as $z) if ($z['schluessel'] !== '_bot_teile') $vs[$z['schluessel']] = $v;
        foreach (array_keys(self::BOT_TEILE) as $k) $vs[$k] = $v;
        foreach ($i['versionen'] as $k => $_) if (!isset($vs[$k])) $vs[$k] = $v;   // was es damals nicht gab: wird gelöscht
        $this->db->prepare('UPDATE ow_welt_info SET version = ?, versionen = ?, leiter_bis = 0, leiter_token = \'\', zurueck = ? WHERE id = 1')->execute([$v, json_encode($vs), (int)round(microtime(true) * 1000)]);   // (auch das Zeichen: ein alter Weltrechner darf nicht mehr schreiben)
        // Bezahlte Befehle, deren Wirkung erst NACH dieser Sicherung gespeichert wurde, fehlen jetzt in der Welt – das Handy hat sie
        // aber bezahlt: noch einmal ausführen (genau einmal: in der zurückgespielten Welt steckt ihre Wirkung ja nicht).
        // Alles andere (Angriffe, Märsche …) bleibt erledigt – die Welt ist eben wieder auf dem Stand von damals.
        // Nur die der Weltrechner damals angenommen hat (ok) – die laufen jetzt OHNE nochmal zu bezahlen (nach): bezahlt hat er schon,
        // und das Hauptbuch wird gerade an seinen Spielstand angeglichen (der die Zahlung schon enthält).
        // Bei „alles“ von den zurückgespielten Spielern nur die vor der Sicherung gegebenen: nur deren Zahlung steckt in ihrem Spielstand
        // von damals (spätere siehe konten_zurueck). Wer seitdem neu ist, behält seinen Spielstand – bei ihm wie bisher.
        $wer = $alles ? implode(',', array_map(function ($z) { return (int)$z['id']; }, $d['konten']['spieler'])) : '';
        if (isset($d['version'])) $this->db->prepare("UPDATE ow_befehle SET fertig = 0, fertig_v = NULL, nach = 1 WHERE fertig = 1 AND ok = 1 AND fertig_v > ? AND art IN ('" . implode("','", BEFEHLE_BEZAHLT) . "')" . ($alles ? " AND (erstellt <= ? OR spieler_id NOT IN ($wer))" : ''))->execute($alles ? [(int)$d['version'], $damals] : [(int)$d['version']]);
        if ($alles) $this->konten_zurueck($d['konten'], $damals);
        $this->db->commit();
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); $this->welt_entsperren(); throw $e; }   // ganz oder gar nicht
        $this->welt_entsperren();
        return true;
    }
    // Spielerkonten + private Spielstände aus einer Sicherung von $damals (in der Transaktion von sicherung_zurueck). Wer damals
    // schon da war, bekommt Konto und Spielstand von damals; wer sich seitdem angemeldet hat, bleibt unverändert. Nur Spalten, die es
    // heute noch gibt. Offene Spiele dieser Spieler müssen neu laden (spiel_token leer → „anderswo geöffnet“) – sonst schickte ein
    // offenes Handy seinen neueren Stand über den zurückgespielten. Genau einmal, bezogen auf den Stand von damals:
    //   - Nachrichten von damals, die sein Spielstand noch nicht verbucht hatte (Nummer über der höchsten in openWaterEreignisFertig),
    //     kommen wieder; spätere gehören zur zurückgedrehten Welt und verfallen
    //   - seine Befehle seit damals, die noch nicht ausgeführt sind, verfallen (ihre Zahlung ist mit dem Spielstand zurückgedreht)
    function konten_zurueck($k, $damals) {
        $q = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'");
        $heute = array_flip($q->fetchAll(PDO::FETCH_COLUMN)); $ids = [];
        foreach ($k['spieler'] as $z) {
            $z = array_intersect_key($z, $heute); unset($z['spiel_token'], $z['speicher_nr']);
            $sp = array_keys($z); $ids[] = (int)$z['id'];
            $this->db->prepare('INSERT INTO ow_spieler (' . implode(', ', $sp) . ', spiel_token, speicher_nr) VALUES (' . implode(', ', array_fill(0, count($sp), '?')) . ", '', 0)"
                . ' ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(function ($c) { return "$c = VALUES($c)"; }, array_diff($sp, ['id']))) . ", spiel_token = '', speicher_nr = 0")->execute(array_values($z));
        }
        $in = implode(',', $ids);
        $this->db->exec("DELETE FROM ow_spielstand WHERE spieler_id IN ($in)");
        $this->db->exec("DELETE FROM ow_bots WHERE spieler_id IN ($in)");
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (?, ?, ?)'); $fertig = [];
        foreach ($k['staende'] as $z) if (in_array((int)$z['spieler_id'], $ids, true)) {
            $s->execute([(int)$z['spieler_id'], $z['schluessel'], $z['wert']]);
            if ($z['schluessel'] === 'openWaterEreignisFertig') $fertig[(int)$z['spieler_id']] = max(array_merge([0], array_map('intval', (array)json_decode($z['wert'], true))));
        }
        $b = $this->db->prepare('INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($k['bots'] as $z) if (in_array((int)$z['spieler_id'], $ids, true)) $b->execute([(int)$z['spieler_id'], $z['bot_id'], $z['nr'], $z['stufe'], $z['muenzen'], $z['anzahl_basen'], $z['basen'], $z['zustand']]);
        $wieder = $this->db->prepare('UPDATE ow_ereignisse SET abgeholt = 0 WHERE spieler_id = ? AND id > ? AND erstellt <= ?');
        foreach ($ids as $uid) $wieder->execute([$uid, $fertig[$uid] ?? 0, $damals]);
        $this->db->prepare("UPDATE ow_ereignisse SET abgeholt = 1 WHERE spieler_id IN ($in) AND erstellt > ?")->execute([$damals]);
        $this->db->prepare("UPDATE ow_befehle SET fertig = 1 WHERE fertig = 0 AND spieler_id IN ($in) AND erstellt > ?")->execute([$damals]);
    }
    // Wie groß wäre der Spielstand eines Spielers mit diesen neuen Teilen? (Bytes)
    function groesse_nach($uid, $setzen) {
        $q = $this->db->prepare('SELECT schluessel, LENGTH(wert) l FROM ow_spielstand WHERE spieler_id = ?'); $q->execute([$uid]);
        $g = []; foreach ($q as $z) $g[$z['schluessel']] = (int)$z['l'];
        foreach ($setzen as $k => $v) $g[$k] = strlen($v);
        return array_sum($g);
    }
    // Erledigtes (nach einer Weile), alte Befehle (niemand hat gerechnet) und nie abgeholte Nachrichten. Bezahlte Befehle bleiben
    // erledigt 14 Tage stehen (Zurückspielen holt sie nach – auch die Saison-Sicherung, die 2 Wochen bleibt), unerledigt 7 Tage; abgeholte
    // Nachrichten 3 Tage (so lange erkennt der Server eine feste Nummer nach dem Zurückspielen wieder)
    function aufraeumen() {
        $bez = "'" . implode("','", BEFEHLE_BEZAHLT) . "'";
        $this->db->exec("DELETE FROM ow_befehle WHERE (art IS NULL OR art NOT IN ($bez)) AND ((fertig = 1 AND erstellt < NOW() - INTERVAL 1 HOUR) OR erstellt < NOW() - INTERVAL 1 DAY)");
        $this->db->exec("DELETE FROM ow_befehle WHERE art IN ($bez) AND ((fertig = 1 AND erstellt < NOW() - INTERVAL 14 DAY) OR erstellt < NOW() - INTERVAL 7 DAY)");
        $this->db->exec('DELETE FROM ow_ereignisse WHERE (abgeholt = 1 AND erstellt < NOW() - INTERVAL 3 DAY) OR erstellt < NOW() - INTERVAL 60 DAY');
    }
    // Befehle: das Handy gibt jedem eine Nummer (cid) – kommt er wegen einer Wiederholung nochmal, wird er nicht nochmal abgelegt.
    // Gelöscht wird erst, wenn der Weltrechner quittiert hat, dass die Wirkung in der gespeicherten Welt steht (befehle_quittieren).
    function befehl_ablegen($uid, $b, $cid = null) { $a = json_decode($b, true); $art = is_array($a) && is_string($a['art'] ?? null) ? substr($a['art'], 0, 16) : null;
        $this->db->prepare('INSERT IGNORE INTO ow_befehle (spieler_id, befehl, cid, art) VALUES (?, ?, ?, ?)')->execute([$uid, $b, $cid, $art]); }
    function offene_befehle($uid) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_befehle WHERE spieler_id = ? AND fertig = 0'); $q->execute([$uid]); return (int)$q->fetchColumn(); }
    function befehle_offen() { return (int)$this->db->query('SELECT IFNULL(SUM(LEAST(c, 40)), 0) FROM (SELECT COUNT(*) c FROM ow_befehle WHERE fertig = 0 GROUP BY spieler_id) x')->fetchColumn(); }   // (je Spieler höchstens 40 – wie befehle_gerecht abholt)
    function befehle_quittieren($ids) {   // genau diese Nummern (nicht „alles bis“: eine kleinere Nummer kann später eingetragen sein)
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, 0, 2000)), function ($x) { return $x > 0; })));
        $v = (int)$this->db->query('SELECT version FROM ow_welt_info WHERE id = 1')->fetchColumn();   // (die Wirkung steckt in der Welt bis einschließlich dieser Version)
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_befehle SET fertig = 1, fertig_v = ? WHERE fertig = 0 AND id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute(array_merge([$v], $t));
    }
    function befehle_bezahlt_ok($ids) {   // der Weltrechner hat diese bezahlten Befehle angenommen (nur die werden nach dem Zurückspielen nachgeholt)
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, 0, 2000)), function ($x) { return $x > 0; })));
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_befehle SET ok = 1 WHERE id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute($t);
    }
    function befehle_abholen() {
        // zu alt: die Lage hat sich geändert (Angriffe, Märsche …). Bezahlte (Ausbau, Hauptstadt, Beschleunigen, Truppen) und
        // Admin-Befehle verfallen NIE so – war der Weltrechner länger aus, holt er sie nach (sonst wäre Bezahltes weg)
        $this->db->exec("DELETE FROM ow_befehle WHERE fertig = 0 AND spieler_id <> 0 AND erstellt < NOW() - INTERVAL 10 MINUTE AND (art IS NULL OR art NOT IN ('" . implode("','", BEFEHLE_BEZAHLT) . "'))");
        // _id: seine Nummer (der Weltrechner meldet damit „bezahlt angenommen“), _nach: nach dem Zurückspielen nachgeholt – schon bezahlt
        // _t: wann der Server ihn bekam (ms) – stammt das Profil, an dem der Weltrechner sein Konto geeicht hat, von danach, steckt
        // die Zahlung schon darin (Hauptbuch: nicht nochmal abbuchen)
        return array_map(function ($z) { $b = json_decode($z['befehl']); if (is_object($b)) { $b->_id = (int)$z['id']; $b->_t = (int)$z['t'] * 1000; if ((int)$z['nach']) $b->_nach = 1; }
                return ['id' => (int)$z['id'], 'von' => (int)$z['spieler_id'], 'b' => $b]; },
            $this->befehle_gerecht());
    }
    // gerecht: höchstens 40 je Spieler pro Abholen – einer, der hunderte schickt (die beim Weltrechner warten), verstopft nie die der anderen
    function befehle_gerecht() {
        try { return $this->db->query('SELECT id, spieler_id, befehl, nach, t FROM (SELECT id, spieler_id, befehl, nach, UNIX_TIMESTAMP(erstellt) t, ROW_NUMBER() OVER (PARTITION BY spieler_id ORDER BY id) nr FROM ow_befehle WHERE fertig = 0) x WHERE nr <= 40 ORDER BY id LIMIT 500')->fetchAll(); }
        catch (Throwable $e) { return $this->db->query('SELECT id, spieler_id, befehl, nach, UNIX_TIMESTAMP(erstellt) t FROM ow_befehle WHERE fertig = 0 ORDER BY id LIMIT 500')->fetchAll(); }   // (alte Datenbank ohne ROW_NUMBER)
    }
    // Nachrichten: der Weltrechner gibt jeder eine Nummer (mid) – nach einer verlorenen Antwort schickt er sie nochmal, abgelegt
    // wird sie trotzdem nur einmal. Abgeholt ist sie erst, wenn der Spieler sie in seinem Spielstand verbucht hat
    // (openWaterEreignisFertig: die Nummern der zuletzt verbuchten, siehe speichern_anfrage) – stirbt die Seite vorher, kommt
    // sie beim nächsten Laden wieder.
    function ereignis_ablegen($uid, $e, $mid = null) { $this->db->prepare('INSERT IGNORE INTO ow_ereignisse (spieler_id, ereignis, mid) VALUES (?, ?, ?)')->execute([$uid, $e, $mid]); }
    function ereignisse_abholen($uid) {
        $q = $this->db->prepare('SELECT id, ereignis FROM ow_ereignisse WHERE spieler_id = ? AND abgeholt = 0 ORDER BY id LIMIT 200');
        $q->execute([$uid]);
        $raus = []; $kaputt = [];
        foreach ($q->fetchAll() as $z) { $e = json_decode($z['ereignis']); if (is_object($e)) { $e->_eid = (int)$z['id']; $raus[] = $e; } else $kaputt[] = (int)$z['id']; }
        if ($kaputt) $this->ereignisse_verbucht($uid, $kaputt);   // unlesbar (kann nie wirken): nicht ewig im Fenster der 200 stehen lassen
        return $raus;
    }
    function ereignisse_verbucht($uid, $ids) {
        $ids = array_values(array_unique(array_filter(array_map('intval', array_slice((array)$ids, -1000)), function ($x) { return $x > 0; })));
        foreach (array_chunk($ids, 500) as $t) $this->db->prepare('UPDATE ow_ereignisse SET abgeholt = 1 WHERE spieler_id = ? AND abgeholt = 0 AND id IN (' . implode(',', array_fill(0, count($t), '?')) . ')')->execute(array_merge([$uid], $t));
    }
    // ===== Handy-Benachrichtigungen (Web-Push) =====
    // Ein Gerät gehört immer dem, der sich dort zuletzt angemeldet hat (gleiches Gerät, anderes Konto → wird umgeschrieben).
    function push_speichern($uid, $endpoint, $p256dh, $auth, $sitzung = '') {
        $this->db->prepare('INSERT INTO ow_push (spieler_id, endpoint_hash, endpoint, p256dh, auth, sitzung) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE spieler_id = VALUES(spieler_id), endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth), sitzung = VALUES(sitzung), erstellt = CURRENT_TIMESTAMP')
            ->execute([$uid, hash('sha256', $endpoint), $endpoint, $p256dh, $auth, $sitzung]);
        // höchstens 10 Geräte pro Spieler: die ältesten fliegen raus
        $q = $this->db->prepare('SELECT id FROM ow_push WHERE spieler_id = ? ORDER BY erstellt DESC, id DESC LIMIT 100 OFFSET 10');
        $q->execute([$uid]);
        foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) $this->db->prepare('DELETE FROM ow_push WHERE id = ?')->execute([(int)$id]);
    }
    function push_weg_sitzung($sitzung) { $this->db->prepare('DELETE FROM ow_push WHERE sitzung = ?')->execute([$sitzung]); }
    function push_sitzung($uid, $endpoint, $sitzung) { $this->db->prepare('UPDATE ow_push SET sitzung = ? WHERE spieler_id = ? AND endpoint_hash = ?')->execute([$sitzung, $uid, hash('sha256', $endpoint)]); }
    function push_abmelden($uid, $endpoint) { $this->db->prepare('DELETE FROM ow_push WHERE spieler_id = ? AND endpoint_hash = ?')->execute([$uid, hash('sha256', $endpoint)]); }
    function push_hat($uid, $endpoint) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_push WHERE spieler_id = ? AND endpoint_hash = ?'); $q->execute([$uid, hash('sha256', $endpoint)]); return (int)$q->fetchColumn() > 0; }
    function push_aus($uid) { $q = $this->db->prepare('SELECT push_aus FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); $v = (string)$q->fetchColumn(); return $v === '' ? [] : explode(',', $v); }
    function push_aus_setzen($uid, $arten) { $this->db->prepare('UPDATE ow_spieler SET push_aus = ? WHERE id = ?')->execute([implode(',', $arten), $uid]); }
    function pw_hash_von($uid) { $q = $this->db->prepare('SELECT pw_hash FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); return (string)$q->fetchColumn(); }
    function pw_setzen($uid, $hash) { $this->db->prepare('UPDATE ow_spieler SET pw_hash = ? WHERE id = ?')->execute([$hash, $uid]); }
    function andere_sitzungen_loeschen($uid, $behalten) { $this->db->prepare('DELETE FROM ow_sitzungen WHERE spieler_id = ? AND token_hash <> ?')->execute([$uid, $behalten]); }
    function push_anzahl($uid) { $q = $this->db->prepare('SELECT COUNT(*) FROM ow_push WHERE spieler_id = ?'); $q->execute([$uid]); return (int)$q->fetchColumn(); }
    function push_alle() {   // nur für den Weltrechner
        return array_map(function ($z) { return ['id' => (int)$z['id'], 'uid' => (int)$z['spieler_id'], 'endpoint' => $z['endpoint'], 'p256dh' => $z['p256dh'], 'auth' => $z['auth'],
                'aus' => $z['push_aus'] === '' || $z['push_aus'] === null ? [] : explode(',', $z['push_aus'])]; },
            $this->db->query('SELECT p.id, p.spieler_id, p.endpoint, p.p256dh, p.auth, s.push_aus FROM ow_push p LEFT JOIN ow_spieler s ON s.id = p.spieler_id ORDER BY p.id LIMIT 20000')->fetchAll());
    }
    function push_alle_weg($uid, $ausser = '') { $this->db->prepare('DELETE FROM ow_push WHERE spieler_id = ? AND endpoint_hash <> ?')->execute([$uid, $ausser === '' ? '' : hash('sha256', $ausser)]); }
    function push_weg($ids) { $q = $this->db->prepare('DELETE FROM ow_push WHERE id = ?'); foreach ($ids as $id) $q->execute([(int)$id]); }
    // Nebel (3B): Sicht eines Spielers – Bitfeld vom Weltrechner + seine eigenen Basen (aus der Welt) → für nebel_sieht
    function sicht_laden($uid) {
        $q = $this->db->prepare('SELECT sicht, sicht_v, armee_sicht FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); $z = $q->fetch() ?: ['sicht' => null, 'sicht_v' => 0, 'armee_sicht' => null];
        $q = $this->db->prepare('SELECT basen FROM ow_bots WHERE spieler_id = 0 AND bot_id = ?'); $q->execute(['u' . (int)$uid]);
        $eigen = []; foreach ((array)json_decode((string)$q->fetchColumn(), true) as $id) if (is_numeric($id)) $eigen[(int)$id] = true;
        $bits = $z['sicht'] !== null ? (string)base64_decode((string)$z['sicht'], true) : '';
        $armeen = []; foreach ((array)json_decode((string)$z['armee_sicht'], true) as $id) if (is_string($id)) $armeen[$id] = true;   // fremde Armeen/Felder, die er sieht (Weltrechner)
        return ['bits' => $bits, 'eigen' => $eigen, 'v' => (int)$z['sicht_v'], 'armeen' => $armeen];
    }
    function armee_sicht_setzen($uid, $json) { $this->db->prepare('UPDATE ow_spieler SET armee_sicht = ?, sicht_v = sicht_v + 1 WHERE id = ? AND (armee_sicht IS NULL OR armee_sicht <> ?)')->execute([$json, $uid, $json]); }   // (geändert: neue Sicht → Teile ganz)
    function sicht_setzen($uid, $b64) { $this->db->prepare('UPDATE ow_spieler SET sicht = ?, sicht_v = sicht_v + 1 WHERE id = ? AND (sicht IS NULL OR sicht <> ?)')->execute([$b64, $uid, $b64]); }   // (gleich geblieben: nichts)
    function profil_setzen($uid, $p, $abstand = 8000) { $j = (int)round(microtime(true) * 1000);   // höchstens ein Profil je 8 s (ehrliche Handys: alle 10 s – sonst bis 150/Min. an alle Handys und den Weltrechner)
        $q = $this->db->prepare('UPDATE ow_spieler SET profil = ?, profil_zeit = ? WHERE id = ? AND profil_zeit <= ?'); $q->execute([$p, $j, $uid, $j - $abstand]); return $q->rowCount() > 0; }   // (ms: zwei Profile in derselben Sekunde gehen nicht verloren)
    // Puls zählen (zugleich „online“ setzen) – gibt zurück, wie viele Pulse in dieser Minute schon kamen
    function puls_zaehlen($uid, $jetzt) {
        $m = intdiv($jetzt, 60);
        $this->db->prepare('UPDATE ow_spieler SET online_bis = ?, puls_anzahl = IF(puls_minute = ?, puls_anzahl + 1, 1), puls_minute = ? WHERE id = ?')->execute([$jetzt + 20, $m, $m, $uid]);
        $q = $this->db->prepare('SELECT puls_anzahl FROM ow_spieler WHERE id = ?'); $q->execute([$uid]); return (int)$q->fetchColumn();
    }
    // Alle echten Spieler (für die Karte), Profile nur wenn neuer als $seit – mit 5 s Überlappung: profil_zeit steht schon vor dem
    // Speichern fest, ein Profil kann also nach einem neueren sichtbar werden (doppelte übernimmt welt.js nicht ein zweites Mal).
    // $ganz = false: nur, wer gerade online ist, eben offline ging (30 s) oder ein neues Profil hat – die ganze Liste holt das Handy alle ~10 s
    const SPIELER_UEBERLAPPUNG = 5000;
    function spieler_liste($seit, $alles = false, $ganz = true) {   // $alles: Weltrechner (sieht Münzen und Verwundete der anderen)
        $ab = (int)$seit > 0 ? (int)$seit - self::SPIELER_UEBERLAPPUNG : 0;
        $q = $this->db->prepare('SELECT id, COALESCE(anzeigename, CONCAT(\'Spieler \', id)) name, online_bis, profil_zeit, IF(profil_zeit > ?, profil, NULL) profil FROM ow_spieler'
            . ($ganz ? '' : ' WHERE online_bis > ? OR profil_zeit > ?'));
        $q->execute($ganz ? [$ab] : [$ab, time() - 30, $ab]);
        return array_map(function ($z) use ($alles) {
            $p = $z['profil'] !== null ? json_decode($z['profil'], false, 12) : null;
            if ($p && !$alles) $p = profil_oeffentlich($p);   // Münzen, Verwundete, Rohstoffe, Gems, Helden, Ausrüstung, Fähigkeiten, Stadt anderer sieht nur der Weltrechner
            return ['id' => (int)$z['id'], 'name' => $z['name'], 'online' => (int)$z['online_bis'] > time(), 'profil_zeit' => (int)$z['profil_zeit'], 'profil' => $p]; }, $q->fetchAll());
    }

    // Lesbare Übersicht in ow_spieler
    private function uebersicht($uid, $setzen) {
        if (!$uid) return;
        $f = ['zuletzt_gespeichert = NOW()']; $w = [];
        if (isset($setzen['openWaterLevel'])) { $f[] = 'stufe = ?'; $w[] = (int)$setzen['openWaterLevel']; }
        if (isset($setzen['openWaterCoins'])) { $f[] = 'muenzen = ?'; $w[] = (float)$setzen['openWaterCoins']; }
        if (isset($setzen['openWaterGems'])) { $f[] = 'gems = ?'; $w[] = (float)$setzen['openWaterGems']; }
        if (isset($setzen['openWaterOwnedIslands'])) { $b = json_decode($setzen['openWaterOwnedIslands'], true); $f[] = 'anzahl_basen = ?'; $w[] = is_array($b) ? count($b) : null; }
        $w[] = $uid;
        $this->db->prepare('UPDATE ow_spieler SET ' . implode(', ', $f) . ' WHERE id = ?')->execute($w);
    }
}
