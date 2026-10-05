// Teil 04-datenbank-spieler.php: MysqlLager: Tabellen, Spieler, Sitzungen, Spielstand, Bremse, Namen

// ===== MySQL =====
class MysqlLager {
    const TABELLEN_STAND = '2026-10-05s';   // (siehe Konstruktor)
    private $db;
    // Transaktionen (auch verschachtelt): was zusammengehört, gilt ganz oder gar nicht – stirbt PHP mittendrin, nimmt die Datenbank
    // alles zurück (z. B. Welt + Nachrichten + Quittungen des Weltrechners, Spielstand + „verbucht“ eines Spielers)
    private $tiefe = 0;
    function tx_anfang() { if ($this->tiefe++ === 0) $this->db->beginTransaction(); }
    function tx_ende() { if ($this->tiefe > 0 && --$this->tiefe === 0) $this->db->commit(); }
    function tx_abbruch() { if ($this->tiefe > 0) { $this->tiefe = 0; if ($this->db->inTransaction()) $this->db->rollBack(); } }
    function __construct($c) {
        $this->db = new PDO('mysql:host=' . $c['db_host'] . ';dbname=' . $c['db_name'] . ';charset=utf8mb4', $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 5,
        ]);
        // Tabellen prüfen/anlegen nur einmal je Tabellen-Stand (vorher bei jeder Anfrage – auch bei jedem Puls). Der Stand steht fest
        // im Code (nicht das Datei-Datum: ein PHP-Zwischenspeicher könnte sonst mit altem Code den neuen Stand als erledigt eintragen).
        // BEI JEDER ÄNDERUNG AN tabellen() HOCHZÄHLEN.
        $v = self::TABELLEN_STAND;
        try { $da = $this->db->query('SELECT tabellen_v FROM ow_welt_info WHERE id = 1')->fetchColumn(); } catch (PDOException $e) { $da = null; }
        if ($da !== $v) { $this->tabellen(); $this->db->prepare('UPDATE ow_welt_info SET tabellen_v = ? WHERE id = 1')->execute([$v]); }
    }
    private function tabellen() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_spieler (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(20) NOT NULL,
            pw_hash VARCHAR(255) NOT NULL,
            spiel_token CHAR(32) NOT NULL DEFAULT '',
            erstellt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_sitzungen (
            token_hash CHAR(64) PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            ablauf INT UNSIGNED NOT NULL,
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_spielstand (
            spieler_id INT UNSIGNED NOT NULL,
            schluessel VARCHAR(100) NOT NULL,
            wert LONGTEXT NOT NULL,
            geaendert TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (spieler_id, schluessel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Mitspieler: eine Zeile pro Mitspieler und Spieler (spieler_id = 0: die EINE Welt)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_bots (
            spieler_id INT UNSIGNED NOT NULL,
            bot_id VARCHAR(20) NOT NULL,
            nr INT UNSIGNED NOT NULL DEFAULT 0,
            stufe INT NULL,
            muenzen DOUBLE NULL,
            anzahl_basen INT NULL,
            basen MEDIUMTEXT NULL,
            zustand MEDIUMTEXT NULL,
            geaendert TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (spieler_id, bot_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Bremse gegen zu viele Versuche (Passwort raten, Massen-Anmeldungen)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_bremse (
            schluessel CHAR(64) PRIMARY KEY,
            anzahl INT UNSIGNED NOT NULL DEFAULT 0,
            seit INT UNSIGNED NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        // ===== Die EINE Welt =====
        // Der Weltstand selbst liegt wie ein Spielstand mit der Nummer 0 in ow_spielstand / ow_bots (spieler_id = 0).
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_welt_info (
            id TINYINT UNSIGNED PRIMARY KEY,
            version BIGINT UNSIGNED NOT NULL DEFAULT 0,
            versionen MEDIUMTEXT NULL,
            leiter_id INT UNSIGNED NOT NULL DEFAULT 0,
            leiter_token CHAR(32) NOT NULL DEFAULT '',
            leiter_bis INT UNSIGNED NOT NULL DEFAULT 0,
            welt_zeit BIGINT UNSIGNED NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        $this->db->exec("INSERT IGNORE INTO ow_welt_info (id) VALUES (1)");
        $wi = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_welt_info'")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('tabellen_v', $wi, true)) $this->db->exec("ALTER TABLE ow_welt_info ADD COLUMN tabellen_v VARCHAR(40) NOT NULL DEFAULT ''");
        $sz = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_sitzungen'")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('admin_bis', $sz, true)) $this->db->exec("ALTER TABLE ow_sitzungen ADD COLUMN admin_bis INT UNSIGNED NOT NULL DEFAULT 0");   // Admin-Seite mit Passwort freigeschaltet bis (nur diese Sitzung)
        if (!in_array('zurueck', $wi, true)) $this->db->exec("ALTER TABLE ow_welt_info ADD COLUMN zurueck BIGINT UNSIGNED NOT NULL DEFAULT 0");   // wann zuletzt eine Sicherung zurückgespielt wurde (ms) – der Weltrechner gleicht danach das Hauptbuch an   // welcher Stand von server.php die Tabellen zuletzt geprüft hat
        // Befehle der Spieler an den Weltrechner (angreifen, senden, ausbauen …)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_befehle (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            befehl MEDIUMTEXT NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Nachrichten vom Weltrechner an einen Spieler (geplündert, Beute, Belohnung …)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_ereignisse (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            ereignis MEDIUMTEXT NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Änderungen der Welt („Flicken“): der Weltrechner schickt bei großen Teilen nur, was sich geändert hat. Die Spieler
        // bekommen dann auch nur diese Änderungen (statt jedes Mal den ganzen Teil). Gemerkt werden die letzten ~600 Versionen.
        // flicken = NULL: in dieser Version wurde der Teil ganz neu geschrieben (dann bekommt man ihn ganz).
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_welt_flicken (
            version BIGINT UNSIGNED NOT NULL,
            schluessel VARCHAR(100) NOT NULL,
            flicken MEDIUMTEXT NULL,
            PRIMARY KEY (version, schluessel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin");
        // Sicherungen der Welt (wachhund.php: jede Stunde eine, die letzten 48 bleiben; Admin kann zurückspielen)
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_sicherungen (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            groesse INT UNSIGNED NOT NULL DEFAULT 0,
            daten LONGBLOB NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        // Handy-Benachrichtigungen (Web-Push): ein Eintrag pro Gerät (ein Spieler kann mehrere haben). endpoint = Adresse
        // beim Push-Dienst (Apple/Google/Mozilla/Microsoft), p256dh/auth = Schlüssel des Geräts zum Verschlüsseln.
        $this->db->exec("CREATE TABLE IF NOT EXISTS ow_push (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            spieler_id INT UNSIGNED NOT NULL,
            endpoint_hash CHAR(64) NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh VARCHAR(100) NOT NULL,
            auth VARCHAR(40) NOT NULL,
            erstellt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY endpoint_hash (endpoint_hash),
            KEY spieler_id (spieler_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=ascii");
        // Übersicht in der Spieler-Tabelle (zum Anschauen in phpMyAdmin)
        $da = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler'")->fetchAll(PDO::FETCH_COLUMN);
        $neu = ['stufe' => 'INT NULL', 'muenzen' => 'DOUBLE NULL', 'gems' => 'DOUBLE NULL', 'anzahl_basen' => 'INT NULL', 'zuletzt_gespeichert' => 'DATETIME NULL', 'abschied' => "CHAR(32) NOT NULL DEFAULT ''",
                'profil' => 'MEDIUMTEXT NULL', 'profil_zeit' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'online_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'anzeigename' => 'VARCHAR(20) NULL', 'puls_minute' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'puls_anzahl' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'push_aus' => "VARCHAR(60) NOT NULL DEFAULT ''",   // push_aus: Benachrichtigungs-Arten, die der Spieler ausgeschaltet hat (Einstellungen)
                'sicht' => 'MEDIUMTEXT NULL', 'sicht_v' => 'INT UNSIGNED NOT NULL DEFAULT 0', 'speicher_nr' => 'BIGINT UNSIGNED NOT NULL DEFAULT 0', 'armee_sicht' => 'MEDIUMTEXT NULL'];   // 3B: was er sehen darf (Bitfeld vom Weltrechner), Zähler
        foreach ($neu as $sp => $typ) if (!in_array($sp, $da, true)) $this->db->exec("ALTER TABLE ow_spieler ADD COLUMN $sp $typ");
        $t = $this->db->query("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ow_spieler' AND COLUMN_NAME = 'profil_zeit'")->fetchColumn();
        if ($t && strtolower($t) !== 'bigint') $this->db->exec("ALTER TABLE ow_spieler MODIFY profil_zeit BIGINT UNSIGNED NOT NULL DEFAULT 0");   // (Millisekunden)
        // Genau-einmal (3.10.): Befehle tragen eine Nummer vom Handy (cid), Nachrichten eine vom Weltrechner (mid) – doppelt
        // Geschicktes wird nicht nochmal abgelegt. Erledigtes bleibt eine Weile markiert stehen (fertig/abgeholt), damit eine
        // verspätete Wiederholung es nicht neu anlegt.
        // art: welche Art (bezahlte verfallen nie unbemerkt), fertig_v: Welt-Version, mit der die Wirkung gespeichert wurde (Zurückspielen)
        foreach (['ow_befehle' => ['cid' => 'VARCHAR(24) NULL', 'fertig' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0', 'art' => 'VARCHAR(16) NULL', 'fertig_v' => 'BIGINT UNSIGNED NULL', 'ok' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0', 'nach' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
                  'ow_ereignisse' => ['mid' => 'VARCHAR(24) NULL', 'abgeholt' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
                  'ow_push' => ['sitzung' => "CHAR(64) NOT NULL DEFAULT ''"],
                  'ow_sicherungen' => ['behalten_bis' => 'INT UNSIGNED NOT NULL DEFAULT 0']] as $tab => $spalten) {   // (behalten_bis: die Saison-Sicherung bleibt 2 Wochen)   // (sitzung: mit welchem Login das Gerät eingetragen ist – Abmelden trägt es aus)
            $q = $this->db->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?"); $q->execute([$tab]);
            $hat = $q->fetchAll(PDO::FETCH_COLUMN);
            foreach ($spalten as $sp => $typ) if (!in_array($sp, $hat, true)) $this->db->exec("ALTER TABLE $tab ADD COLUMN $sp $typ");
        }
        // Indizes (Aufräumen und Zählen ohne die ganze Tabelle zu lesen) und ein eindeutiger Anzeigename
        $idx = $this->db->query("SELECT CONCAT(TABLE_NAME, '.', INDEX_NAME) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'ow\\_%'")->fetchAll(PDO::FETCH_COLUMN);
        foreach (['ow_bremse.seit' => 'ow_bremse ADD KEY seit (seit)', 'ow_sitzungen.ablauf' => 'ow_sitzungen ADD KEY ablauf (ablauf)',
                  'ow_befehle.spieler_id' => 'ow_befehle ADD KEY spieler_id (spieler_id)', 'ow_befehle.erstellt' => 'ow_befehle ADD KEY erstellt (erstellt)',
                  'ow_ereignisse.erstellt' => 'ow_ereignisse ADD KEY erstellt (erstellt)',
                  'ow_befehle.spieler_cid' => 'ow_befehle ADD UNIQUE KEY spieler_cid (spieler_id, cid)', 'ow_ereignisse.spieler_mid' => 'ow_ereignisse ADD UNIQUE KEY spieler_mid (spieler_id, mid)', 'ow_spieler.anzeigename' => 'ow_spieler ADD UNIQUE KEY anzeigename (anzeigename)',
                  'ow_befehle.offen' => 'ow_befehle ADD KEY offen (fertig, id)', 'ow_ereignisse.spieler_offen' => 'ow_ereignisse ADD KEY spieler_offen (spieler_id, abgeholt, id)'] as $n => $sql)   // (Erledigtes bleibt eine Weile stehen: Offenes trotzdem schnell finden)
            if (!in_array($n, $idx, true)) { try { $this->db->exec('ALTER TABLE ' . $sql); } catch (PDOException $e) { error_log('Open Water Index ' . $n . ': ' . $e->getMessage()); } }
    }
    function sperren($uid) { if ((int)$this->db->query("SELECT GET_LOCK('ow_spieler_" . (int)$uid . "', 15)")->fetchColumn() !== 1) throw new RuntimeException('Spieler-Sperre nicht bekommen'); }
    function entsperren($uid) { $this->db->query("SELECT RELEASE_LOCK('ow_spieler_" . (int)$uid . "')"); }
    function abschied($uid) {
        $q = $this->db->prepare('SELECT abschied FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (string)$q->fetchColumn();
    }
    function abschied_setzen($uid, $tok) { $this->db->prepare('UPDATE ow_spieler SET abschied = ? WHERE id = ?')->execute([$tok, $uid]); }
    function zuletzt_gespeichert($uid) {
        $q = $this->db->prepare('SELECT UNIX_TIMESTAMP(zuletzt_gespeichert) FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (int)$q->fetchColumn();
    }
    function spieler_nach_name($name) {
        $q = $this->db->prepare('SELECT id, name, pw_hash FROM ow_spieler WHERE name = ?');
        $q->execute([$name]);
        return $q->fetch() ?: null;
    }
    function spieler_anlegen($name, $hash) {
        try {
            $this->db->prepare('INSERT INTO ow_spieler (name, pw_hash) VALUES (?, ?)')->execute([$name, $hash]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') return null;   // Name schon vergeben
            throw $e;
        }
        return (int)$this->db->lastInsertId();
    }
    function sitzung_anlegen($th, $uid, $ablauf) {
        $this->db->prepare('DELETE FROM ow_sitzungen WHERE ablauf < ?')->execute([time()]);
        $this->db->prepare('INSERT INTO ow_sitzungen (token_hash, spieler_id, ablauf) VALUES (?, ?, ?)')->execute([$th, $uid, $ablauf]);
    }
    function sitzung_holen($th) {
        $q = $this->db->prepare('SELECT s.id, s.name, s.anzeigename FROM ow_sitzungen z JOIN ow_spieler s ON s.id = z.spieler_id WHERE z.token_hash = ? AND z.ablauf > ?');
        $q->execute([$th, time()]);
        $r = $q->fetch();
        return $r ? ['id' => (int)$r['id'], 'name' => $r['anzeigename'] ?: $r['name'], 'login' => $r['name'], 'anzeigename' => $r['anzeigename']] : null;
    }
    function admin_frei_bis($th) { $q = $this->db->prepare('SELECT admin_bis FROM ow_sitzungen WHERE token_hash = ?'); $q->execute([$th]); return (int)$q->fetchColumn(); }
    function admin_freischalten($th, $bis) { $this->db->prepare('UPDATE ow_sitzungen SET admin_bis = ? WHERE token_hash = ?')->execute([(int)$bis, $th]); }
    function sitzung_loeschen($th) {
        $this->db->prepare('DELETE FROM ow_sitzungen WHERE token_hash = ?')->execute([$th]);
    }
    function spiel_token_setzen($uid, $tok) {
        $this->db->prepare('UPDATE ow_spieler SET spiel_token = ?, speicher_nr = 0 WHERE id = ?')->execute([$tok, $uid]);   // neue Seite: Sicherungs-Nummern fangen neu an
    }
    // Sicherungen eines Fensters tragen eine laufende Nummer: kommt eine ältere nach einer neueren an (zwei gleichzeitig unterwegs),
    // wird sie nicht mehr geschrieben – sonst stünde ein alter Stand (z. B. Münzen) über dem neuen. → false = zu alt
    function speicher_nr_ok($uid, $nr) {
        if ($nr <= 0) return true;
        $q = $this->db->prepare('SELECT speicher_nr FROM ow_spieler WHERE id = ?'); $q->execute([$uid]);
        if ($nr < (int)$q->fetchColumn()) return false;
        $this->db->prepare('UPDATE ow_spieler SET speicher_nr = ? WHERE id = ?')->execute([$nr, $uid]);
        return true;
    }
    function spiel_token($uid) {
        $q = $this->db->prepare('SELECT spiel_token FROM ow_spieler WHERE id = ?');
        $q->execute([$uid]);
        return (string)$q->fetchColumn();
    }
    // Die drei Mitspieler-Teile des Spielstands und ihre Spalte in ow_bots
    const BOT_TEILE = ['openWaterBotState' => 'zustand', 'openWaterBotCoins' => 'muenzen', 'openWaterBotOwnedIslands' => 'basen'];

    // $nur: nur diese Teile laden (Liste von Schlüsseln) - sonst alles
    function stand_laden($uid, $nur = null) {
        if ($nur !== null && !$nur) return [];
        // nur die gefragten Teile aus der Datenbank holen (vorher: immer alle, gefiltert erst hier – bei der Welt viele MB je Puls)
        if ($nur === null) { $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ?'); $q->execute([$uid]); }
        else {
            $nur = array_values(array_unique(array_map('strval', $nur)));
            $q = $this->db->prepare('SELECT schluessel, wert FROM ow_spielstand WHERE spieler_id = ? AND schluessel IN (' . implode(',', array_fill(0, count($nur), '?')) . ')');
            $q->execute(array_merge([$uid], $nur));
        }
        $r = [];
        foreach ($q as $z) if ($nur === null || in_array($z['schluessel'], $nur, true)) $r[$z['schluessel']] = $z['wert'];
        if ($nur !== null && !array_intersect(array_keys(self::BOT_TEILE), $nur)) return $r;
        unset($r['_bot_teile']);
        // Mitspieler wieder zusammensetzen (nur wenn der Teil nicht als Ganzes in ow_spielstand liegt) – nur die nötigen Spalten
        $da = $this->bot_teile_da($uid);
        $sp = [];
        foreach (self::BOT_TEILE as $k => $s) if (!isset($r[$k]) && !empty($da[$s]) && ($nur === null || in_array($k, $nur, true))) $sp[$k] = $s;
        if (!$sp) return $r;
        $q = $this->db->prepare('SELECT bot_id, ' . implode(', ', $sp) . ' FROM ow_bots WHERE spieler_id = ? ORDER BY nr, bot_id');
        $q->execute([$uid]);
        $teile = ['zustand' => [], 'muenzen' => [], 'basen' => []];
        foreach ($q as $z) {
            if (isset($z['zustand'])) $teile['zustand'][] = json_encode((string)$z['bot_id']) . ':' . $z['zustand'];
            if (isset($z['muenzen'])) $teile['muenzen'][] = json_encode((string)$z['bot_id']) . ':' . json_encode((float)$z['muenzen'] == floor((float)$z['muenzen']) && abs((float)$z['muenzen']) < 9e15 ? (int)$z['muenzen'] : (float)$z['muenzen']);
            if (isset($z['basen'])) $teile['basen'][] = json_encode((string)$z['bot_id']) . ':' . $z['basen'];
        }
        foreach ($sp as $k => $s) $r[$k] = '{' . implode(',', $teile[$s]) . '}';
        return $r;
    }
    // Welche Mitspieler-Teile gibt es (auch leere Objekte "{}")? Merker in ow_spielstand.
    private function bot_teile_da($uid) {
        $q = $this->db->prepare("SELECT wert FROM ow_spielstand WHERE spieler_id = ? AND schluessel = '_bot_teile'");
        $q->execute([$uid]);
        $v = json_decode((string)$q->fetchColumn(), true);
        return is_array($v) ? $v : [];
    }
    function stand_schreiben($uid, $setzen, $loeschen) {
        $this->tx_anfang();
        $s = $this->db->prepare('INSERT INTO ow_spielstand (spieler_id, schluessel, wert) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE wert = VALUES(wert)');
        $d = $this->db->prepare('DELETE FROM ow_spielstand WHERE spieler_id = ? AND schluessel = ?');
        $da = null;
        foreach ($setzen as $k => $v) {
            if (isset(self::BOT_TEILE[$k])) {
                $obj = json_decode($v);   // als Objekte lesen: leere {} bleiben {} (nicht [])
                if (is_object($obj)) {
                    $this->bots_schreiben($uid, self::BOT_TEILE[$k], $obj);
                    $d->execute([$uid, $k]);
                    if ($da === null) $da = $this->bot_teile_da($uid);
                    $da[self::BOT_TEILE[$k]] = true;
                    continue;
                }
                // unerwartetes Format: als Ganzes speichern (geht nie verloren)
                $this->bots_leeren($uid, self::BOT_TEILE[$k]);
            }
            $s->execute([$uid, $k, $v]);
        }
        foreach ($loeschen as $k) {
            $d->execute([$uid, $k]);
            if (isset(self::BOT_TEILE[$k])) {
                $this->bots_leeren($uid, self::BOT_TEILE[$k]);
                if ($da === null) $da = $this->bot_teile_da($uid);
                unset($da[self::BOT_TEILE[$k]]);
            }
        }
        if ($da !== null) $s->execute([$uid, '_bot_teile', json_encode((object)$da)]);
        $this->uebersicht($uid, $setzen);
        $this->tx_ende();
    }
    private function bots_leeren($uid, $sp) {
        $extra = $sp === 'basen' ? ', anzahl_basen = NULL' : ($sp === 'zustand' ? ', stufe = NULL' : '');
        $this->db->prepare("UPDATE ow_bots SET $sp = NULL$extra WHERE spieler_id = ?")->execute([$uid]);
        $this->db->prepare('DELETE FROM ow_bots WHERE spieler_id = ? AND zustand IS NULL AND muenzen IS NULL AND basen IS NULL')->execute([$uid]);
    }
    private function bots_schreiben($uid, $sp, $obj) {
        $this->bots_leeren($uid, $sp);
        $this->bots_einige($uid, $sp, $obj);
    }
    private function bots_einige($uid, $sp, $obj) {
        $reihen = [];
        foreach ($obj as $id => $wert) {
            $id = (string)$id;
            $nr = preg_match('/(\d+)$/', $id, $m) ? (int)$m[1] : 0;
            if ($sp === 'zustand') $reihen[] = [$uid, $id, $nr, is_object($wert) && isset($wert->lvl) ? (int)$wert->lvl : null, null, null, null, json_encode($wert, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION)];
            elseif ($sp === 'muenzen') $reihen[] = [$uid, $id, $nr, null, is_numeric($wert) ? (float)$wert : 0, null, null, null];
            else $reihen[] = [$uid, $id, $nr, null, null, is_array($wert) ? count($wert) : 0, json_encode($wert, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), null];
        }
        $upd = $sp === 'zustand' ? 'stufe = VALUES(stufe), zustand = VALUES(zustand)' : ($sp === 'muenzen' ? 'muenzen = VALUES(muenzen)' : 'anzahl_basen = VALUES(anzahl_basen), basen = VALUES(basen)');
        foreach (array_chunk($reihen, 50) as $block) {
            $sql = 'INSERT INTO ow_bots (spieler_id, bot_id, nr, stufe, muenzen, anzahl_basen, basen, zustand) VALUES '
                 . implode(',', array_fill(0, count($block), '(?,?,?,?,?,?,?,?)')) . " ON DUPLICATE KEY UPDATE $upd";
            $this->db->prepare($sql)->execute(array_merge(...$block));
        }
    }
    // Nur die geänderten Mitspieler-Zeilen schreiben (statt alle 150 neu): $obj = der ganze neue Teil, $p = der Flicken
    private function bots_teilweise($uid, $sp, $obj, $p) {
        $ids = array_merge(array_keys((array)($p->s ?? [])), array_keys((array)($p->d ?? [])));
        if ($ids) { $teil = new stdClass; foreach ($ids as $id) if (property_exists($obj, (string)$id)) $teil->{$id} = $obj->{$id}; $this->bots_einige($uid, $sp, $teil); }
        foreach ((array)($p->w ?? []) as $id) {
            $extra = $sp === 'basen' ? ', anzahl_basen = NULL' : ($sp === 'zustand' ? ', stufe = NULL' : '');
            $this->db->prepare("UPDATE ow_bots SET $sp = NULL$extra WHERE spieler_id = ? AND bot_id = ?")->execute([$uid, (string)$id]);
        }
        $this->db->prepare('DELETE FROM ow_bots WHERE spieler_id = ? AND zustand IS NULL AND muenzen IS NULL AND basen IS NULL')->execute([$uid]);
    }
    // true = noch erlaubt (und mitgezählt), false = zu viele Versuche
    function bremse($k, $max, $sek) {
        $jetzt = time();
        if (mt_rand(1, 50) === 1) $this->db->prepare('DELETE FROM ow_bremse WHERE seit < ?')->execute([$jetzt - 86400]);
        // zählen in einem einzigen Schritt (viele gleichzeitige Anfragen können nicht alle „noch frei“ lesen)
        $this->db->prepare('INSERT INTO ow_bremse (schluessel, anzahl, seit) VALUES (?, 1, ?)
            ON DUPLICATE KEY UPDATE anzahl = IF(seit < ?, 1, anzahl + 1), seit = IF(seit < ?, VALUES(seit), seit)')->execute([$k, $jetzt, $jetzt - $sek, $jetzt - $sek]);
        $q = $this->db->prepare('SELECT anzahl FROM ow_bremse WHERE schluessel = ?'); $q->execute([$k]);
        return (int)$q->fetchColumn() <= $max;
    }
    function bremse_da($k, $sek) { $q = $this->db->prepare('SELECT 1 FROM ow_bremse WHERE schluessel = ? AND seit >= ?'); $q->execute([$k, time() - $sek]); return (bool)$q->fetchColumn(); }
    function bremse_frei($k) { $this->db->prepare('DELETE FROM ow_bremse WHERE schluessel = ?')->execute([$k]); }
    function bremse_zurueck($k) { $this->db->prepare('UPDATE ow_bremse SET anzahl = GREATEST(0, anzahl - 1) WHERE schluessel = ?')->execute([$k]); }   // ein gelungener Versuch zählt nicht
    // Anzeigename: frei, wenn ihn kein anderer Spieler als Login- oder Anzeigenamen hat
    function name_frei($uid, $name) {
        $q = $this->db->prepare('SELECT COUNT(*) FROM ow_spieler WHERE id <> ? AND (name = ? OR anzeigename = ?)');
        $q->execute([$uid, $name, $name]);
        return !(int)$q->fetchColumn();
    }
    // false = gleichzeitig hat ihn jemand anderes bekommen (eindeutiger Schlüssel auf anzeigename)
    function anzeigename_setzen($uid, $name) {
        try { $this->db->prepare('UPDATE ow_spieler SET anzeigename = ? WHERE id = ?')->execute([$name, $uid]); return true; }
        catch (PDOException $e) { if ($e->getCode() === '23000') return false; throw $e; }
    }
    function alle_spieler() { return $this->db->query('SELECT id, name, anzeigename, stufe, muenzen, gems, anzahl_basen, online_bis, erstellt FROM ow_spieler ORDER BY id')->fetchAll(); }
