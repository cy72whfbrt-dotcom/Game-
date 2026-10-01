<?php
// Nimmt den ganzen Spielstand (gzip-gepacktes JSON {Schlüssel: Text}) und legt ihn in die Datenbank.
declare(strict_types=1);
require __DIR__ . '/../inc/db.php';
ow_require_api();

try {
    $u = ow_user();
    if (!$u) ow_json(['ok' => false, 'grund' => 'login'], 401);
    // Nur das zuletzt geöffnete Spielfenster darf speichern - ein altes Fenster überschreibt nie einen neueren Stand.
    $tab = (string)($_SERVER['HTTP_X_OW_TAB'] ?? '');
    if ($tab === '' || !hash_equals((string)$u['tab'], $tab)) ow_json(['ok' => false, 'grund' => 'fenster'], 409);

    $raw = file_get_contents('php://input', false, null, 0, OW_MAX_SAVE + 1);
    if ($raw === false || $raw === '' || strlen($raw) > OW_MAX_SAVE) ow_json(['ok' => false, 'grund' => 'groesse'], 413);
    $json = ($_SERVER['HTTP_X_OW_GZ'] ?? '1') === '0' ? $raw : @gzdecode($raw, OW_MAX_SAVE);   // ältere Browser schicken ungepackt
    if ($json === false) ow_json(['ok' => false, 'grund' => 'daten'], 400);
    $data = json_decode($json, true);
    if (!is_array($data)) ow_json(['ok' => false, 'grund' => 'daten'], 400);
    foreach ($data as $k => $v)
        if (!is_string($k) || strlen($k) > 80 || !is_string($v)) ow_json(['ok' => false, 'grund' => 'daten'], 400);
    // Neu verpackt, so dass er sicher in die Spielseite eingebettet werden kann.
    $json = json_encode((object)$data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $blob = gzencode($json, 6);
    $rev  = (int)($_SERVER['HTTP_X_OW_REV'] ?? 0);

    $db = ow_db();
    $now = time();
    $db->beginTransaction();
    $st = $db->prepare('SELECT rev, backed_up, data FROM ow_saves WHERE user_id = ?' . (ow_is_mysql() ? ' FOR UPDATE' : ''));
    $st->execute([$u['id']]);
    $old = $st->fetch();
    if ($old && $rev <= (int)$old['rev']) { $db->commit(); ow_json(['ok' => true, 'alt' => true]); }   // schon neuer gespeichert
    $backedUp = $old ? (int)$old['backed_up'] : $now;
    if ($old && $now - $backedUp >= OW_BACKUP_EVERY) {
        // Stündliche Sicherung des bisherigen Stands.
        $b = $db->prepare('INSERT INTO ow_backups (user_id, data, rev, created) VALUES (?, ?, ?, ?)');
        $b->bindValue(1, $u['id'], PDO::PARAM_INT); $b->bindValue(2, $old['data'], PDO::PARAM_LOB);
        $b->bindValue(3, (int)$old['rev'], PDO::PARAM_INT); $b->bindValue(4, $now, PDO::PARAM_INT); $b->execute();
        $ids = $db->prepare('SELECT id FROM ow_backups WHERE user_id = ? ORDER BY id DESC');
        $ids->execute([$u['id']]);
        $keep = array_slice($ids->fetchAll(PDO::FETCH_COLUMN), OW_BACKUP_KEEP);
        foreach ($keep as $id) $db->prepare('DELETE FROM ow_backups WHERE id = ?')->execute([$id]);
        $backedUp = $now;
    }
    $sql = $old ? 'UPDATE ow_saves SET data = ?, size = ?, rev = ?, updated = ?, backed_up = ? WHERE user_id = ?'
                : 'INSERT INTO ow_saves (data, size, rev, updated, backed_up, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    $w = $db->prepare($sql);
    $w->bindValue(1, $blob, PDO::PARAM_LOB); $w->bindValue(2, strlen($json), PDO::PARAM_INT); $w->bindValue(3, $rev, PDO::PARAM_INT);
    $w->bindValue(4, $now, PDO::PARAM_INT); $w->bindValue(5, $backedUp, PDO::PARAM_INT); $w->bindValue(6, $u['id'], PDO::PARAM_INT);
    $w->execute();
    $db->commit();
    ow_json(['ok' => true]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('open water speichern: ' . $e->getMessage());
    ow_json(['ok' => false, 'grund' => 'server'], 500);
}
