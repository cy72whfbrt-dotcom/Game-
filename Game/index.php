<?php
// ===== index.php – Startseite: Anmelden oder Registrieren. Danach geht es ins Spiel (spiel.php). =====
require __DIR__ . '/server.php';

$fehler = '';
$modus = ($_GET['m'] ?? '') === 'neu' ? 'neu' : 'login';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !herkunft_ok()) { http_response_code(403); exit('Ungültige Anfrage.'); }   // Formulare nur von dieser Seite
    if (($_GET['aus'] ?? '') === '1' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        abmelden();
        header('Location: ./');
        exit;
    }
    $ich = aktueller_spieler();
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$ich) {
        $modus = ($_POST['modus'] ?? '') === 'neu' ? 'neu' : 'login';
        $name = is_string($_POST['name'] ?? null) ? trim($_POST['name']) : '';
        $pw = is_string($_POST['pw'] ?? null) ? $_POST['pw'] : '';
        if ($modus === 'neu') {
            if (!name_erlaubt($name)) $fehler = 'Name: 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).';
            elseif (in_array(mb_strtolower($name, 'UTF-8'), array_map(function ($n) { return mb_strtolower($n, 'UTF-8'); }, bot_namen()), true)) $fehler = 'Diesen Namen gibt es schon.';
            elseif (mb_strlen($pw) < 10) $fehler = 'Das Passwort braucht mindestens 10 Zeichen.';
            elseif (strlen($pw) > 72) $fehler = 'Das Passwort darf höchstens 72 Zeichen haben.';
            elseif ($pw !== (string)($_POST['pw2'] ?? '')) $fehler = 'Die beiden Passwörter sind nicht gleich.';
            elseif (!lager()->name_frei(0, $name)) $fehler = 'Diesen Namen gibt es schon.';
            elseif (!bremse('neu:' . client_ip(), 30, 3600)) $fehler = 'Zu viele neue Konten von hier – bitte später nochmal.';   // (nur gültige Versuche zählen – ein Tippfehler sperrt keine ganze Schulklasse)
            else {
                $uid = lager()->spieler_anlegen($name, password_hash($pw, PASSWORD_DEFAULT));
                if ($uid === null) $fehler = 'Diesen Namen gibt es schon.';
                else { anmelden($uid); header('Location: spiel.php'); exit; }
            }
        } else {
            // Bremse pro Konto UND Gerät (so kann niemand von außen ein fremdes Konto aussperren), dazu eine große Grenze
            // pro Konto über alle Geräte (gegen Raten von vielen Rechnern) und eine pro Gerät
            $u = $name !== '' && strlen($name) <= 60 ? lager()->spieler_nach_name($name) : null;
            $konto = $u ? 'id' . $u['id'] : 'name:' . mb_strtolower(mb_substr($name, 0, 60), 'UTF-8');
            $sperre = 'login:' . $konto . ':' . client_ip();
            // (die große Grenze pro Konto gilt nicht, wo er in den letzten 24 Std. schon gespielt hat – ein Fremder sperrt so nur sich selbst)
            if (!bremse($sperre, 8, 900) || !bremse('loginip:' . client_ip(), 100, 900) || (!bremse('loginkonto:' . $konto, 60, 900) && !($u && geraet_bekannt($u['id'])))) { sleep(1); $fehler = 'Zu viele Versuche – bitte in 15 Minuten nochmal.'; }
            else {
                $hash = $u ? $u['pw_hash'] : '$2y$10$PxK0RyR6Ng9cebr4sv40xeBHhcwZlL4gVKoVfvcJFrVmDh4qaH.ma';   // gleich lange prüfen, ob es den Namen gibt oder nicht
                if (password_verify($pw, $hash) && $u) { lager()->bremse_frei(hash('sha256', $sperre)); bremse_zurueck('loginkonto:' . $konto); bremse_zurueck('loginip:' . client_ip()); geraet_bekannt_merken($u['id']); anmelden((int)$u['id']); header('Location: spiel.php'); exit; }   // (gelungene Anmeldungen zählen nicht)
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
<?php   // die Spiel-Skripte schon hier im Hintergrund holen (während man sich anmeldet) – das Spiel startet dann schneller
if (!wartung()) foreach (['ladebildschirm', 'speichern', 'bots', 'welt', 'spiel', 'aufbau', 'buendnis', 'haendler', 'benachrichtigung'] as $s) echo '<link rel="prefetch" href="' . skript($s) . '">' . "\n"; ?>
<meta name="theme-color" content="#0a0c10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Open Water">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="preload" href="schrift/cinzel.woff2" as="font" type="font/woff2" crossorigin>
<link href="schrift/schrift.css" rel="stylesheet">
<style>
  /* Farben + Schrift wie die Spielseite (Obsidian & Gold, Cinzel/Inter wie dort) */
  :root { color-scheme: dark; --ink-0: #050608; --ink-1: #0a0c10;
          --gold-100: #f0dfb0; --gold-200: #e4c886; --gold-300: #d4ad66; --gold-400: #c29449;
          --tx-1: #eee6d4; --tx-2: #c0b7a3; --tx-3: #8b8373; --blood-300: #f08a7e; --good: #9fd38a;
          --line-1: rgba(212,176,102,.14); --line-2: rgba(212,176,102,.30); --line-3: rgba(228,200,134,.62);
          --font-display: 'Cinzel', 'Trajan Pro', Georgia, serif; --font-ui: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  * { box-sizing: border-box; }
  html { background: var(--ink-0); }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 16px;
         font: 400 13px/1.4 var(--font-ui); color: var(--tx-1); -webkit-font-smoothing: antialiased;
         background: radial-gradient(120% 60% at 50% 0%, rgba(40,78,120,.45), transparent 60%),
                     radial-gradient(90% 50% at 50% 100%, rgba(214,170,90,.08), transparent 70%), var(--ink-0); }
  .karte { position: relative; width: 100%; max-width: 400px; padding: 32px 16px 16px; border: 1px solid var(--line-2); border-radius: 6px;
           background: radial-gradient(140% 70% at 50% 0%, rgba(214,170,90,.09), transparent 55%), linear-gradient(180deg, #141820 0%, #0c0f14 100%);
           box-shadow: inset 0 1px 0 rgba(255,240,205,.06), 0 22px 60px rgba(0,0,0,.66); }
  .karte::before { content: ""; position: absolute; inset: 4px; border: 1px solid var(--line-1); border-radius: 4px; pointer-events: none; }
  .wappen { display: block; width: 48px; height: 48px; margin: 0 auto 12px; }
  h1 { margin: 0; text-align: center; font: 700 28px/1.1 var(--font-display); letter-spacing: .08em; color: var(--gold-200); text-transform: uppercase; }
  .zier { height: 12px; max-width: 160px; margin: 12px auto;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='12' viewBox='0 0 120 12' fill='none'%3E%3Cpath d='M4 6h40M76 6h40' stroke='%23c9a45c' stroke-opacity='.55'/%3E%3Cpath d='M47 6l5-3M47 6l5 3M73 6l-5-3M73 6l-5 3' stroke='%23e4c886' stroke-opacity='.85'/%3E%3Cpath d='M60 1l5 5-5 5-5-5z' fill='%230c0f14' stroke='%23e4c886'/%3E%3Ccircle cx='60' cy='6' r='1.4' fill='%23f0dfb0'/%3E%3C/svg%3E") center / contain no-repeat; }
  .unter { margin: 0 0 16px; text-align: center; font-size: 13px; color: var(--tx-2); }
  .reiter { display: flex; gap: 4px; padding: 4px; margin-bottom: 16px; border: 1px solid var(--line-1); border-radius: 6px; background: rgba(0,0,0,.3); }
  .reiter a { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 4px; text-decoration: none;
              font: 600 15px/1 var(--font-ui); color: var(--tx-3); }
  .reiter a.an { background: linear-gradient(180deg, rgba(214,170,90,.22), rgba(214,170,90,.08)); color: var(--gold-100); box-shadow: inset 0 0 0 1px var(--line-3); }
  label { display: block; margin: 12px 0 4px; font: 600 13px/1.2 var(--font-ui); color: var(--tx-2); }
  .feld { position: relative; }
  input[type=text], input[type=password] { width: 100%; height: 48px; padding: 0 12px; font: 400 16px var(--font-ui); color: var(--tx-1);
         background: var(--ink-1); border: 1px solid var(--line-2); border-radius: 4px; outline: none; }
  .feld input { padding-right: 48px; }
  input:focus { border-color: var(--gold-300); box-shadow: 0 0 0 2px rgba(214,170,90,.25); }
  .regel { margin: 4px 0 0; font-size: 11px; line-height: 1.3; color: var(--tx-3); }
  .regel.ok { color: var(--good); } .regel.nein { color: var(--blood-300); }
  button { width: 100%; min-height: 48px; margin-top: 16px; padding: 0 16px; font: 700 15px/1 var(--font-ui); letter-spacing: .04em; border-radius: 4px; cursor: pointer;
           border: 1px solid var(--gold-200); background: linear-gradient(180deg, var(--gold-200), var(--gold-400)); color: #1d1406;
           box-shadow: inset 0 1px 0 rgba(255,240,205,.5), 0 2px 10px rgba(214,170,90,.25); }
  button:disabled { opacity: .6; cursor: default; }
  .auge { position: absolute; top: 2px; right: 2px; width: 44px; min-height: 44px; margin: 0; padding: 0; display: grid; place-items: center;
          border: 0; background: none; box-shadow: none; color: var(--tx-3); }
  .auge[hidden] { display: none; } .auge svg { width: 20px; height: 20px; } .auge[aria-pressed=true] { color: var(--gold-200); }
  button.leise, .knopf2 { min-height: 44px; margin-top: 8px; border: 1px solid var(--line-2); background: linear-gradient(180deg, #1c212a, #0f1217);
           color: var(--tx-1); font-weight: 600; box-shadow: inset 0 1px 0 rgba(255,240,205,.06); }
  .knopf2 { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; border-radius: 4px; text-decoration: none; text-align: center; font: 600 15px/1.2 var(--font-ui); }
  .knopf2 svg { width: 18px; height: 18px; flex: none; color: var(--gold-200); }
  .fehler { margin-bottom: 4px; padding: 8px 12px; border: 1px solid rgba(240,138,126,.45); border-radius: 4px; background: rgba(210,76,64,.14); color: var(--blood-300); font-size: 13px; }
  .trenner { height: 1px; margin: 16px 0 8px; background: linear-gradient(90deg, transparent, var(--line-2), transparent); }
  .hinweis { margin: 12px 0 0; text-align: center; font-size: 11px; color: var(--tx-3); }
  .hallo { margin: 0 0 4px; text-align: center; font-size: 15px; color: var(--tx-2); } .hallo b { color: var(--gold-100); }
  :focus-visible { outline: 2px solid var(--gold-300); outline-offset: 2px; }
  @media (min-width: 700px) { .karte { padding: 40px 32px 24px; } h1 { font-size: 32px; } .wappen { width: 56px; height: 56px; } }
</style>
</head>
<body>
<main class="karte">
  <svg class="wappen" viewBox="0 0 56 56" aria-hidden="true"><path d="M28 3l21 7v16c0 13-9 22-21 27C16 48 7 39 7 26V10z" fill="#0f1217" stroke="#e4c886" stroke-width="1.5"/><path d="M28 9l15 5v12c0 9-6 16-15 20-9-4-15-11-15-20V14z" fill="none" stroke="#c9a45c" stroke-opacity=".5"/><path d="M14 33c4-3 7-3 10 0s7 3 10 0 6-3 8 0M14 39c4-3 7-3 10 0s7 3 10 0 6-3 8 0" fill="none" stroke="#6fa8dc" stroke-width="1.6" stroke-linecap="round"/><path d="M21 27l3-8 4 5 4-5 3 8z" fill="#e4c886"/></svg>
  <h1>Open Water</h1>
  <div class="zier"></div>
  <p class="unter">Erobere die Inseln, halte den Thron.</p>
<?php if ($ich && wartung()): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <div class="fehler">Gerade wird eine neue Version aufgespielt. In ein paar Minuten geht es weiter.</div>
  <form action="./" method="get"><button type="submit">Nochmal versuchen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php elseif ($ich): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <form action="spiel.php" method="get" data-laedt><button type="submit">Weiterspielen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php else: ?>
  <nav class="reiter">
    <a href="./" class="<?= $modus === 'login' ? 'an' : '' ?>">Anmelden</a>
    <a href="?m=neu" class="<?= $modus === 'neu' ? 'an' : '' ?>">Neu registrieren</a>
  </nav>
  <?php if ($fehler): ?><div class="fehler" role="alert"><?= h($fehler) ?></div><?php endif; ?>
  <form method="post" action="<?= $modus === 'neu' ? '?m=neu' : './' ?>" data-einmal>
    <input type="hidden" name="modus" value="<?= $modus ?>">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" maxlength="20" autocomplete="username" required value="<?= h(is_string($_POST['name'] ?? null) ? $_POST['name'] : '') ?>"<?= $modus === 'neu' ? ' aria-describedby="nameRegel"' : '' ?>>
    <?php if ($modus === 'neu'): ?><p class="regel" id="nameRegel" data-min="3">3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -)</p><?php endif; ?>
    <label for="pw">Passwort</label>
    <div class="feld">
      <input type="password" id="pw" name="pw" autocomplete="<?= $modus === 'neu' ? 'new-password' : 'current-password' ?>" required<?= $modus === 'neu' ? ' aria-describedby="pwRegel"' : '' ?>>
      <button type="button" class="auge" aria-label="Passwort zeigen" aria-pressed="false" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
    </div>
    <?php if ($modus === 'neu'): ?>
    <p class="regel" id="pwRegel" data-min="10">Mindestens 10 Zeichen</p>
    <label for="pw2">Passwort wiederholen</label>
    <input type="password" id="pw2" name="pw2" autocomplete="new-password" required>
    <?php endif; ?>
    <button type="submit"><?= $modus === 'neu' ? 'Konto anlegen' : 'Anmelden' ?></button>
  </form>
  <div class="trenner"></div>
  <a class="knopf2" href="app/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>App auf den Startbildschirm</a>
  <p class="hinweis">Dein Spielstand wird auf dem Server gespeichert. Im Browser bleibt nur ein Login-Cookie (30 Tage).</p>
<?php endif; ?>
</main>
<script nonce="<?= h(csp_nonce()) ?>">   // (statt onsubmit=…: Inline-Handler erlaubt die CSP nicht mehr)
document.querySelectorAll('form[data-laedt]').forEach(function (f) { f.addEventListener('submit', function () { var k = f.querySelector('button'); k.textContent = 'Lädt …'; k.disabled = true; }); });
document.querySelectorAll('form[data-einmal]').forEach(function (f) { f.addEventListener('submit', function (e) { var b = f.querySelector('button[type=submit]'); if (b.disabled) { e.preventDefault(); return; } b.disabled = true; }); });
// Auge: Passwort zeigen/verbergen (ohne Skript bleibt der Knopf versteckt)
document.querySelectorAll('.auge').forEach(function (a) { var i = a.parentNode.querySelector('input'); a.hidden = false;
  a.addEventListener('click', function () { var zeigen = i.type === 'password'; i.type = zeigen ? 'text' : 'password'; a.setAttribute('aria-pressed', zeigen); a.setAttribute('aria-label', zeigen ? 'Passwort verbergen' : 'Passwort zeigen'); }); });
// Regeln schon beim Tippen: grün, sobald lang genug (nur die Länge – alles Weitere prüft der Server)
document.querySelectorAll('.regel[data-min]').forEach(function (r) { var i = document.querySelector('[aria-describedby="' + r.id + '"]');
  i.addEventListener('input', function () { var n = Array.from(i.name === 'name' ? i.value.trim() : i.value).length; r.classList.toggle('ok', n >= +r.dataset.min); r.classList.toggle('nein', n > 0 && n < +r.dataset.min); }); });
</script>
</body>
</html>
