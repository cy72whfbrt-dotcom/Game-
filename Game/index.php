<?php
// ===== index.php – Startseite: Anmelden oder Registrieren. Danach geht es ins Spiel (spiel.php). =====
require __DIR__ . '/server.php';

$fehler = '';
$modus = ($_GET['m'] ?? '') === 'neu' ? 'neu' : 'login';

try {
    if (($_GET['aus'] ?? '') === '1' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        abmelden();
        header('Location: ./');
        exit;
    }
    $ich = aktueller_spieler();
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$ich) {
        $modus = ($_POST['modus'] ?? '') === 'neu' ? 'neu' : 'login';
        $name = trim((string)($_POST['name'] ?? ''));
        $pw = (string)($_POST['pw'] ?? '');
        if ($modus === 'neu') {
            if (!bremse('neu:' . client_ip(), 5, 3600)) $fehler = 'Zu viele neue Konten von hier – bitte später nochmal.';
            elseif (!preg_match('/^[\p{L}\p{N} _.-]{3,20}$/u', $name)) $fehler = 'Name: 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).';
            elseif (mb_strlen($pw) < 6) $fehler = 'Das Passwort braucht mindestens 6 Zeichen.';
            elseif ($pw !== (string)($_POST['pw2'] ?? '')) $fehler = 'Die beiden Passwörter sind nicht gleich.';
            elseif (!lager()->name_frei(0, $name)) $fehler = 'Diesen Namen gibt es schon.';
            else {
                $uid = lager()->spieler_anlegen($name, password_hash($pw, PASSWORD_DEFAULT));
                if ($uid === null) $fehler = 'Diesen Namen gibt es schon.';
                else { anmelden($uid); header('Location: spiel.php'); exit; }
            }
        } else {
            $sperre = 'login:' . mb_strtolower($name, 'UTF-8');
            if (!bremse($sperre, 8, 900) || !bremse('loginip:' . client_ip(), 30, 900)) { sleep(1); $fehler = 'Zu viele Versuche – bitte in 15 Minuten nochmal.'; }
            else {
                $u = $name !== '' ? lager()->spieler_nach_name($name) : null;
                $hash = $u ? $u['pw_hash'] : '$2y$10$PxK0RyR6Ng9cebr4sv40xeBHhcwZlL4gVKoVfvcJFrVmDh4qaH.ma';   // gleich lange prüfen, ob es den Namen gibt oder nicht
                if (password_verify($pw, $hash) && $u) { lager()->bremse_frei(hash('sha256', $sperre)); anmelden((int)$u['id']); header('Location: spiel.php'); exit; }
                sleep(1);   // bremst Passwort-Raten
                $fehler = 'Name oder Passwort stimmt nicht.';
            }
        }
    }
} catch (Throwable $e) {
    error_log('Open Water Login: ' . $e->getMessage());
    $fehler = 'Der Server hat gerade ein Problem. Bitte gleich nochmal versuchen.';
    $ich = null;
}
function h($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Open Water</title>
<link rel="manifest" href="app/manifest.webmanifest">
<link rel="icon" href="app/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="app/apple-touch-icon.png">
<meta name="theme-color" content="#0b2a4a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Open Water">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
  :root { --meer1: #0b2a4a; --meer2: #12507e; --karte: #f6efe0; --text: #2b2118; --gold: #c9a227; --gold2: #a8831a; --rot: #a33a2a; --rand: #d8c9a6; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
         font-family: Georgia, 'Times New Roman', serif; color: var(--text);
         background: radial-gradient(ellipse at 50% 20%, var(--meer2), var(--meer1) 70%); }
  .karte { width: 100%; max-width: 380px; background: var(--karte); border: 2px solid var(--rand); border-radius: 14px; padding: 26px 22px 22px;
           box-shadow: 0 12px 40px rgba(0,0,0,.45); }
  h1 { margin: 0 0 4px; text-align: center; font-size: 30px; letter-spacing: 1px; color: #1d3b5c; }
  .unter { text-align: center; margin: 0 0 20px; font-size: 14px; color: #6b5a44; }
  .reiter { display: flex; gap: 6px; margin-bottom: 16px; }
  .reiter a { flex: 1; text-align: center; padding: 9px 0; border-radius: 8px; text-decoration: none; color: var(--text); background: #e9dfc8; font-size: 15px; }
  .reiter a.an { background: #1d3b5c; color: #fff; }
  label { display: block; font-size: 14px; margin: 10px 0 4px; }
  input[type=text], input[type=password] { width: 100%; padding: 11px 12px; font-size: 16px; border: 1px solid var(--rand); border-radius: 8px; background: #fff; color: var(--text); }
  button { width: 100%; margin-top: 18px; padding: 12px; font-size: 17px; font-family: inherit; border: 0; border-radius: 8px; cursor: pointer;
           background: linear-gradient(var(--gold), var(--gold2)); color: #2b1d05; font-weight: bold; }
  button.leise { background: #e9dfc8; color: var(--text); font-weight: normal; margin-top: 10px; }
  .fehler { background: #f5d9d3; color: var(--rot); border-radius: 8px; padding: 9px 12px; font-size: 14px; margin-bottom: 6px; }
  .hinweis { font-size: 12px; color: #7a6a52; margin-top: 14px; text-align: center; }
  .hallo { text-align: center; font-size: 17px; margin: 6px 0 4px; }
</style>
</head>
<body>
<main class="karte">
  <h1>Open Water</h1>
  <p class="unter">Erobere die Inseln, halte den Thron.</p>
<?php if ($ich && wartung()): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <div class="fehler">Gerade wird eine neue Version aufgespielt. In ein paar Minuten geht es weiter.</div>
  <form action="./" method="get"><button type="submit">Nochmal versuchen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php elseif ($ich): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <form action="spiel.php" method="get"><button type="submit">Weiterspielen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php else: ?>
  <nav class="reiter">
    <a href="./" class="<?= $modus === 'login' ? 'an' : '' ?>">Anmelden</a>
    <a href="?m=neu" class="<?= $modus === 'neu' ? 'an' : '' ?>">Neu registrieren</a>
  </nav>
  <?php if ($fehler): ?><div class="fehler"><?= h($fehler) ?></div><?php endif; ?>
  <form method="post" action="<?= $modus === 'neu' ? '?m=neu' : './' ?>">
    <input type="hidden" name="modus" value="<?= $modus ?>">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" maxlength="20" autocomplete="username" required value="<?= h($_POST['name'] ?? '') ?>">
    <label for="pw">Passwort</label>
    <input type="password" id="pw" name="pw" autocomplete="<?= $modus === 'neu' ? 'new-password' : 'current-password' ?>" required>
    <?php if ($modus === 'neu'): ?>
    <label for="pw2">Passwort wiederholen</label>
    <input type="password" id="pw2" name="pw2" autocomplete="new-password" required>
    <?php endif; ?>
    <button type="submit"><?= $modus === 'neu' ? 'Konto anlegen' : 'Anmelden' ?></button>
  </form>
  <p class="hinweis"><a href="app/">📱 Open Water als App auf den Startbildschirm</a></p>
  <p class="hinweis">Dein Spielstand wird auf dem Server gespeichert. Im Browser bleibt nur ein Login-Cookie (30 Tage).</p>
<?php endif; ?>
</main>
</body>
</html>
