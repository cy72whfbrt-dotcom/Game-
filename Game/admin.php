<?php
// ===== admin.php – nur für Admins (Alexander): Wartung an/aus, Geschenke an Spieler, Spielerliste =====
require __DIR__ . '/server.php';
require __DIR__ . '/weltrechner/wachhund.php';
header('Cache-Control: no-store');

$ich = null;
try { $ich = aktueller_spieler(); } catch (Throwable $e) { $ich = null; }
if (!$ich || !ist_admin($ich)) { header('Location: ./'); exit; }

// Schutz gegen fremde Formulare: jede Aktion braucht dieses Zeichen (hängt am Login-Cookie)
$zeichen = hash_hmac('sha256', 'admin', (string)($_COOKIE[COOKIE_NAME] ?? ''));
$meldung = ''; $fehler = '';
// Die Bots (fest in bots.js): id => Name
$BOTS = [];
if (preg_match_all("/\\{ id: '(bot\\d+)',\\s*name: '([^']+)'/", (string)@file_get_contents(__DIR__ . '/bots.js'), $m, PREG_SET_ORDER)) foreach ($m as $x) $BOTS[$x[1]] = $x[2];
// … und die 90 weiteren, die bots.js aus einer Namensliste erzeugt (bot61 …)
if (preg_match("/\\/\\/ More players on the map[^\\n]*\\n\\[([^\\]]+)\\]\\.forEach/", (string)@file_get_contents(__DIR__ . '/bots.js'), $m) && preg_match_all("/'([^']+)'/", $m[1], $nm)) foreach ($nm[1] as $i => $n) $BOTS['bot' . (61 + $i)] = $n;
$KISTEN = ['Gewöhnlich', 'Ungewöhnlich', 'Selten', 'Episch', 'Legendär', 'Mythisch'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !herkunft_ok()) { http_response_code(403); exit('Ungültige Anfrage.'); }
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
                foreach ($ids as $id) {
                    lager()->ereignis_ablegen($id, json_encode(['art' => 'geschenk', 'gems' => $gems, 'coins' => $coins, 'sh' => $sh, 'tr' => $tr, 'crate' => $crate]));
                    // Schummel-Schutz: dem Weltrechner sagen, dass dieser Spieler so viele Truppen/Münzen geschenkt bekommt –
                    // sonst hält er das Abholen für gefälscht (Befehl unter Spieler 0, das kann nur admin.php)
                    // (3B: auch Gems, Splitter und Kiste – das Hauptbuch des Weltrechners zählt sie als sicher)
                    lager()->befehl_ablegen(0, json_encode(['art' => 'admin', 'was' => 'gutschrift', 'an' => $id, 'tr' => $tr, 'coins' => $coins, 'gems' => $gems, 'sh' => $sh, 'crate' => $crate]));
                }
                if ($ids) $meldung = 'Geschenk verschickt an ' . count($ids) . ' Spieler – es liegt im Abholfach (Ziele → Belohnung).';
            }
        }
        // ===== Weltrechner =====
        if ($was === 'wr_neustart') { $r = wachhund_neustart(); $meldung = 'Weltrechner neu gestartet (' . $r . ').'; }
        if ($was === 'wr_entsperren') { wachhund_entsperren(); $meldung = 'Sperre aufgehoben. Wenn der Fehler behoben ist: Wartung beenden – dann startet der Weltrechner von selbst.'; }
        if ($was === 'wr_cron') $meldung = wachhund_cron_einrichten();
        if ($was === 'wr_sicherung') {
            $sid = (int)($_POST['sicherung'] ?? 0); $h = wr_herz();
            if ($h) wr_beenden((int)($h['pid'] ?? 0), 'Sicherung wird zurückgespielt');
            if (lager()->sicherung_zurueck($sid)) { wr_log('Sicherung ' . $sid . ' vom Admin zurückgespielt'); wachhund_neustart(); $meldung = 'Sicherung zurückgespielt – die Welt ist wieder auf dem Stand von damals. Der Weltrechner startet neu.'; }
            else $fehler = 'Sicherung nicht gefunden oder kaputt – nichts verändert.';
        }
        if ($was === 'nebel') {
            $an = (string)($_POST['an'] ?? ''); $ids = [];
            foreach (lager()->alle_spieler() as $sp) if ($an === 'alle' || (string)$sp['id'] === $an) $ids[] = (int)$sp['id'];
            foreach ($ids as $id) lager()->ereignis_ablegen($id, json_encode(['art' => 'nebel']));
            if ($ids) lager()->befehl_ablegen(0, json_encode(['art' => 'admin', 'was' => 'nebel', 'an' => $an === 'alle' ? 'alle' : $ids[0]]));   // 3B: auch der Nebel auf dem Server
            if ($ids) $meldung = 'Nebel freigeschaltet für ' . count($ids) . ' Spieler – die ganze Karte ist aufgedeckt (beim nächsten Öffnen des Spiels, wenn er gerade nicht spielt).';
            else $fehler = 'Spieler nicht gefunden.';
        }
    }
}
$spieler = lager()->alle_spieler();
$wrH = wr_herz(); $wrZ = wr_zustand(); $wrCron = wachhund_cron_da();
$wrLaeuft = $wrH && empty($wrH['ende']) && wr_laeuft($wrH['pid'] ?? 0) && time() - (int)(($wrH['zeit'] ?? 0) / 1000) <= WR_HERZ_ALT;
$wrSicherungen = lager()->sicherungen_liste();
// Auffälligkeiten (Schummel-Schutz des Weltrechners, weltrechner/schummel.php): wer, was, wann – mit Namen statt u-Nummer
$auffaellig = (wr_lesen('schummel.php') ?: [])['liste'] ?? [];
if (!is_array($auffaellig)) $auffaellig = [];
$spielerName = [];
foreach ($spieler as $sp) $spielerName[(int)$sp['id']] = $sp['anzeigename'] ?: $sp['name'];
$AUFF_ART = ['truppen' => 'Truppen', 'ausbau' => 'Ausbau', 'muenzen' => 'Münzen', 'stufe' => 'Stufe', 'lazarett' => 'Lazarett', 'kaputt' => 'kaputter Befehl',
             'schneller' => 'Beschleunigen', 'hauptstadt' => 'Hauptstadt', 'flut' => 'zu viele Befehle',
             'rohstoffe' => 'Rohstoffe', 'lager' => 'Lager/Boss', 'gems' => 'Gems', 'hauptbuch' => 'Hauptbuch (Stadt, Forschung, Ausrüstung, Helden, Schild)', 'spaehen' => 'Späher'];   // 3B
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

<?php if (!empty($wrZ['gesperrt'])): ?>
<div class="karte" style="border-color:#a33a2a;background:#f5d9d3">
  <h2 style="color:#a33a2a">⚠️ Alarm: Weltrechner gestoppt</h2>
  <p><b><?= h($wrZ['grund'] ?? '') ?></b> (<?= h(date('d.m.Y H:i', (int)($wrZ['alarm']['zeit'] ?? time()))) ?>). Die Wartung ist automatisch an: niemand kommt rein, die Welt steht still, nichts geht verloren.</p>
  <p>Was tun: Fehler beheben lassen (das Protokoll unten zeigt den Grund) → „Sperre aufheben“ → „Wartung beenden“.</p>
  <pre style="white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto;background:#fff;padding:8px;border-radius:6px"><?= h($wrZ['alarm']['log'] ?? '') ?></pre>
  <form method="post"><input type="hidden" name="zeichen" value="<?= h($zeichen) ?>"><button class="gruen" name="was" value="wr_entsperren">Sperre aufheben</button></form>
</div>
<?php endif; ?>

<div class="karte">
  <h2>Weltrechner (rechnet die Welt auf dem Server)</h2>
  <p class="status">Zurzeit: <b><?= !empty($wrZ['gesperrt']) ? '⛔ gestoppt (Alarm)' : (wartung() ? '⏸ wartet (Wartung)' : ($wrLaeuft ? '✅ läuft' : '⏳ startet / nicht da')) ?></b></p>
  <?php if ($wrH): ?>
  <table>
    <tr><td>Speicher</td><td><b><?= (int)($wrH['speicherMb'] ?? 0) ?> MB</b> von höchstens <?= (int)($wrH['grenzeMb'] ?? 600) ?> MB</td></tr>
    <tr><td>Letzter Herzschlag</td><td>vor <?= max(0, time() - (int)(($wrH['zeit'] ?? 0) / 1000)) ?> s</td></tr>
    <tr><td>Läuft seit</td><td><?= h(date('d.m.Y H:i', (int)(($wrH['gestartet'] ?? 0) / 1000))) ?></td></tr>
    <tr><td>Puls zum Server</td><td><?= (int)($wrH['pulsMs'] ?? 0) ?> ms · <?= zahl($wrH['pulseOk'] ?? 0) ?> gut, <?= zahl($wrH['pulseFehler'] ?? 0) ?> Fehler</td></tr>
    <tr><td>Befehle der Spieler</td><td><?= zahl($wrH['befehle'] ?? 0) ?></td></tr>
    <tr><td>Fehler (letzte Minute)</td><td><?= (int)($wrH['fehlerProMinute'] ?? 0) ?> · Prüfer hat <?= (int)($wrH['prueferFehler'] ?? 0) ?>× kaputte Zahlen verhindert</td></tr>
    <tr><td>Abstürze (letzte 5 Min.)</td><td><?= count($wrZ['abstuerze'] ?? []) ?> von höchstens <?= WR_ABSTUERZE - 1 ?></td></tr>
    <tr><td>Wachhund (Cronjob)</td><td><?= $wrCron ? '✅ jede Minute' : '❌ nicht eingerichtet – nur wenn Spieler online sind' ?></td></tr>
    <?php if (!empty($wrH['ende'])): ?><tr><td>Zuletzt beendet</td><td><?= h($wrH['ende']) ?></td></tr><?php endif; ?>
  </table>
  <?php endif; ?>
  <form method="post" style="display:flex;gap:8px;flex-wrap:wrap">
    <input type="hidden" name="zeichen" value="<?= h($zeichen) ?>">
    <button name="was" value="wr_neustart">Neu starten</button>
    <?php if (!$wrCron): ?><button name="was" value="wr_cron">Wachhund-Cronjob einrichten</button><?php endif; ?>
  </form>
  <details style="margin-top:10px"><summary>Protokoll (letzte 40 Zeilen)</summary>
    <pre style="white-space:pre-wrap;font-size:12px;max-height:300px;overflow:auto;background:#fff;padding:8px;border-radius:6px"><?= h(wr_log_ende(40)) ?></pre></details>
  <?php if ($wrSicherungen): ?>
  <form method="post" style="margin-top:10px" onsubmit="return confirm('Wirklich? Die Welt springt auf diesen Stand zurück. Alles danach ist weg.')">
    <input type="hidden" name="zeichen" value="<?= h($zeichen) ?>"><input type="hidden" name="was" value="wr_sicherung">
    <label for="sicherung">Sicherung zurückspielen (jede Stunde eine, die letzten 48)</label>
    <select id="sicherung" name="sicherung"><?php foreach ($wrSicherungen as $sc): ?><option value="<?= (int)$sc['id'] ?>"><?= h(date('d.m.Y H:i', strtotime($sc['erstellt']))) ?> (<?= round($sc['groesse'] / 1024) ?> KB)</option><?php endforeach; ?></select>
    <button class="rot">Zurückspielen</button>
  </form>
  <?php endif; ?>
</div>

<div class="karte">
  <h2>Auffälligkeiten (<?= count($auffaellig) ?>)</h2>
  <p>Der Weltrechner prüft jeden Befehl der Spieler. Was er ablehnen oder kappen musste oder was verdächtig springt,
     steht hier (die letzten 200, gleiche innerhalb einer Stunde zusammengefasst). Ein einzelner Eintrag kann auch ein
     Zufall sein – auffällig ist, wenn sich bei einem Spieler viel sammelt.</p>
  <?php if (!$auffaellig): ?><p><b>Nichts Auffälliges.</b></p>
  <?php else: ?>
  <div class="tabelle" style="max-height:420px;overflow:auto"><table>
    <tr><th>Zuletzt</th><th>Spieler</th><th>Was</th><th>Wie oft</th></tr>
    <?php foreach ($auffaellig as $a): if (!is_array($a)) continue; $uid = (int)($a['uid'] ?? 0); ?>
    <tr><td style="white-space:nowrap"><?= h(date('d.m. H:i', (int)(($a['letzte'] ?? 0) / 1000))) ?></td>
        <td><?= h($spielerName[$uid] ?? ('Spieler ' . $uid)) ?></td>
        <td><b><?= h($AUFF_ART[$a['was'] ?? ''] ?? ($a['was'] ?? '')) ?>:</b> <?= h($a['text'] ?? '') ?></td>
        <td><?= zahl($a['anzahl'] ?? 1) ?>×<?php if ((int)($a['anzahl'] ?? 1) > 1): ?><br><small>seit <?= h(date('d.m. H:i', (int)(($a['erste'] ?? 0) / 1000))) ?></small><?php endif; ?></td></tr>
    <?php endforeach; ?>
  </table></div>
  <?php endif; ?>
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
