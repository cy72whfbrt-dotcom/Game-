<?php
// ===== admin.php – nur für Admins (Alexander): Wartung an/aus, Geschenke an Spieler, Spielerliste =====
require __DIR__ . '/server.php';

$ich = null;
try { $ich = aktueller_spieler(); } catch (Throwable $e) { $ich = null; }
if (!$ich || !ist_admin($ich)) { header('Location: ./'); exit; }

// Schutz gegen fremde Formulare: jede Aktion braucht dieses Zeichen (hängt am Login-Cookie)
$zeichen = hash_hmac('sha256', 'admin', (string)($_COOKIE[COOKIE_NAME] ?? ''));
$meldung = ''; $fehler = '';
// Die Bots (fest in bots.js): id => Name
$BOTS = [];
if (preg_match_all("/\\{ id: '(bot\\d+)',\\s*name: '([^']+)'/", (string)@file_get_contents(__DIR__ . '/bots.js'), $m, PREG_SET_ORDER)) foreach ($m as $x) $BOTS[$x[1]] = $x[2];
$KISTEN = ['Gewöhnlich', 'Ungewöhnlich', 'Selten', 'Episch', 'Legendär', 'Mythisch'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($zeichen, (string)($_POST['zeichen'] ?? ''))) { $fehler = 'Ungültiges Formular – Seite neu laden.'; }
    else {
        $was = (string)($_POST['was'] ?? '');
        if ($was === 'wartung_an') { file_put_contents(WARTUNG_DATEI, 'Wartung seit ' . date('d.m.Y H:i') . "\n"); $meldung = 'Wartung ist AN – niemand kommt ins Spiel (auch du nicht), alle werden rausgeworfen.'; }
        if ($was === 'wartung_aus') { @unlink(WARTUNG_DATEI); $meldung = 'Wartung ist AUS – alle können wieder spielen.'; }
        if ($was === 'geschenk') {
            $gems = max(0, min(1000000, (int)($_POST['gems'] ?? 0)));
            $coins = max(0, min(1e15, (float)($_POST['coins'] ?? 0)));
            $sh = max(0, min(10000, (int)($_POST['sh'] ?? 0)));
            $tr = max(0, min(1e12, (int)($_POST['tr'] ?? 0)));
            $crate = (int)($_POST['crate'] ?? -1); if ($crate < -1 || $crate > 5) $crate = -1;
            $an = (string)($_POST['an'] ?? '');
            if (!$gems && !$coins && !$sh && !$tr && $crate < 0) $fehler = 'Das Geschenk ist leer.';
            elseif ($an === 'bots' || isset($BOTS[$an])) {   // Bots: der Weltrechner gibt es ihnen direkt (sie sammeln es selbst ein)
                lager()->befehl_ablegen(0, json_encode(['art' => 'admin', 'was' => 'geschenk_bot', 'bot' => $an === 'bots' ? 'alle' : $an, 'gems' => $gems, 'coins' => $coins, 'sh' => $sh, 'tr' => $tr, 'crate' => $crate]));
                $meldung = 'Geschenk verschickt an ' . ($an === 'bots' ? 'alle ' . count($BOTS) . ' Bots' : 'den Bot ' . $BOTS[$an]) . ' – kommt an, sobald jemand im Spiel ist.';
            }
            else {
                $ids = [];
                foreach (lager()->alle_spieler() as $sp) if ($an === 'alle' || (string)$sp['id'] === $an) $ids[] = (int)$sp['id'];
                if (!$ids) $fehler = 'Spieler nicht gefunden.';
                foreach ($ids as $id) lager()->ereignis_ablegen($id, json_encode(['art' => 'geschenk', 'gems' => $gems, 'coins' => $coins, 'sh' => $sh, 'tr' => $tr, 'crate' => $crate]));
                if ($ids) $meldung = 'Geschenk verschickt an ' . count($ids) . ' Spieler – es liegt im Abholfach (Ziele → Belohnung).';
            }
        }
        if ($was === 'nebel') {
            $an = (string)($_POST['an'] ?? ''); $ids = [];
            foreach (lager()->alle_spieler() as $sp) if ($an === 'alle' || (string)$sp['id'] === $an) $ids[] = (int)$sp['id'];
            foreach ($ids as $id) lager()->ereignis_ablegen($id, json_encode(['art' => 'nebel']));
            if ($ids) $meldung = 'Nebel freigeschaltet für ' . count($ids) . ' Spieler – die ganze Karte ist aufgedeckt (beim nächsten Öffnen des Spiels, wenn er gerade nicht spielt).';
            else $fehler = 'Spieler nicht gefunden.';
        }
    }
}
$spieler = lager()->alle_spieler();
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$spielerOptionen = '';
foreach ($spieler as $sp) $spielerOptionen .= '<option value="' . (int)$sp['id'] . '">' . h($sp['anzeigename'] ?: $sp['name']) . ($sp['anzeigename'] && $sp['anzeigename'] !== $sp['name'] ? ' (' . h($sp['name']) . ')' : '') . '</option>';
function zahl($n) { return $n === null ? '–' : number_format((float)$n, 0, ',', '.'); }
?><!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Open Water – Admin</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: Georgia, serif; background: #0b2a4a; color: #2b2118; }
  .karte { max-width: 760px; margin: 0 auto 16px; background: #f6efe0; border: 2px solid #d8c9a6; border-radius: 12px; padding: 18px; }
  h1 { margin: 0 0 4px; color: #1d3b5c; } h2 { margin: 0 0 10px; font-size: 19px; color: #1d3b5c; }
  label { display: block; font-size: 14px; margin: 8px 0 3px; }
  input, select { width: 100%; padding: 9px; font-size: 15px; border: 1px solid #d8c9a6; border-radius: 7px; background: #fff; }
  .reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  button { margin-top: 12px; padding: 11px 16px; font-size: 16px; font-family: inherit; border: 0; border-radius: 8px; cursor: pointer; background: linear-gradient(#c9a227, #a8831a); font-weight: bold; }
  button.rot { background: #a33a2a; color: #fff; } button.gruen { background: #3f7a3a; color: #fff; }
  .ok { background: #dcefd6; color: #2d5a28; padding: 9px 12px; border-radius: 8px; margin-bottom: 10px; }
  .fehler { background: #f5d9d3; color: #a33a2a; padding: 9px 12px; border-radius: 8px; margin-bottom: 10px; }
  .status { font-size: 17px; margin: 4px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; } td, th { padding: 6px 5px; border-bottom: 1px solid #e3d7bd; text-align: left; }
  .tabelle { overflow-x: auto; } a { color: #1d3b5c; }
</style>
</head>
<body>
<div class="karte">
  <h1>Admin</h1>
  <p>Angemeldet als <b><?= h($ich['name']) ?></b> · <a href="spiel.php">ins Spiel</a></p>
  <?php if ($meldung): ?><div class="ok"><?= h($meldung) ?></div><?php endif; ?>
  <?php if ($fehler): ?><div class="fehler"><?= h($fehler) ?></div><?php endif; ?>
</div>

<div class="karte">
  <h2>Wartung (neue Version wird aufgespielt)</h2>
  <p class="status">Zurzeit: <b><?= wartung() ? 'AN – niemand kommt ins Spiel' : 'AUS – alle können spielen' ?></b></p>
  <form method="post">
    <input type="hidden" name="zeichen" value="<?= h($zeichen) ?>">
    <?php if (wartung()): ?><button class="gruen" name="was" value="wartung_aus">Wartung beenden</button>
    <?php else: ?><button class="rot" name="was" value="wartung_an">Wartung starten</button><?php endif; ?>
  </form>
</div>

<div class="karte">
  <h2>Geschenk verschicken</h2>
  <p>Landet beim Spieler im Abholfach (Ziele → Belohnung) und muss dort ganz normal abgeholt werden.</p>
  <form method="post">
    <input type="hidden" name="zeichen" value="<?= h($zeichen) ?>">
    <input type="hidden" name="was" value="geschenk">
    <label for="an">An</label>
    <select id="an" name="an">
      <optgroup label="Spieler"><?= $spielerOptionen ?><option value="alle">— an ALLE Spieler —</option></optgroup>
      <optgroup label="Bots"><?php foreach ($BOTS as $id => $n): ?><option value="<?= h($id) ?>"><?= h($n) ?></option><?php endforeach; ?><option value="bots">— an ALLE Bots —</option></optgroup>
    </select>
    <div class="reihe">
      <div><label for="gems">Gems</label><input id="gems" name="gems" type="number" min="0" value="0"></div>
      <div><label for="coins">Münzen</label><input id="coins" name="coins" type="number" min="0" value="0"></div>
      <div><label for="sh">Helden-Splitter</label><input id="sh" name="sh" type="number" min="0" value="0"></div>
      <div><label for="tr">Truppen</label><input id="tr" name="tr" type="number" min="0" value="0"></div>
      <div><label for="crate">Kiste</label><select id="crate" name="crate"><option value="-1">keine</option><?php foreach ($KISTEN as $i => $k): ?><option value="<?= $i ?>">mind. <?= h($k) ?></option><?php endforeach; ?></select></div>
    </div>
    <button>Verschicken</button>
  </form>
</div>

<div class="karte">
  <h2>Nebel freischalten</h2>
  <p>Deckt für den Spieler die ganze Karte auf.</p>
  <form method="post">
    <input type="hidden" name="zeichen" value="<?= h($zeichen) ?>">
    <input type="hidden" name="was" value="nebel">
    <label for="nebelAn">Für</label>
    <select id="nebelAn" name="an"><?= $spielerOptionen ?><option value="alle">— ALLE Spieler —</option></select>
    <button>Nebel freischalten</button>
  </form>
</div>

<div class="karte">
  <h2>Bots (<?= count($BOTS) ?>)</h2>
  <p>Die Mitspieler, die die Welt beleben. Geschenke an sie gibt es oben bei „Geschenk verschicken“ (Gruppe „Bots“).</p>
  <div class="tabelle"><table><tr><th>Name</th><th>Kennung</th></tr>
    <?php foreach ($BOTS as $id => $n): ?><tr><td><?= h($n) ?></td><td><?= h($id) ?></td></tr><?php endforeach; ?>
  </table></div>
</div>

<div class="karte">
  <h2>Spieler (<?= count($spieler) ?>)</h2>
  <div class="tabelle"><table>
    <tr><th>Name</th><th>Login</th><th>Stufe</th><th>Münzen</th><th>Gems</th><th>Basen</th><th>Online</th><th>Seit</th></tr>
    <?php foreach ($spieler as $sp): ?>
    <tr><td><?= h($sp['anzeigename'] ?: '–') ?></td><td><?= h($sp['name']) ?></td><td><?= zahl($sp['stufe']) ?></td><td><?= zahl($sp['muenzen']) ?></td><td><?= zahl($sp['gems']) ?></td>
        <td><?= zahl($sp['anzahl_basen']) ?></td><td><?= (int)$sp['online_bis'] > time() ? 'ja' : '–' ?></td><td><?= h(substr((string)$sp['erstellt'], 0, 10)) ?></td></tr>
    <?php endforeach; ?>
  </table></div>
</div>
</body>
</html>
