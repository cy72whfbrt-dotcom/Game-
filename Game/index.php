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
<link rel="preload" href="bilder/titel_hoch.jpg" as="image" media="(orientation: portrait)">
<link rel="preload" href="bilder/titel_quer.jpg" as="image" media="(orientation: landscape)">
<link rel="preload" href="schrift/cinzel.woff2" as="font" type="font/woff2" crossorigin>
<link href="schrift/schrift.css" rel="stylesheet">
<style>
  /* Farben + Schrift wie die Spielseite (Obsidian & Gold, Cinzel/Inter); dahinter dieselbe gemalte Szene wie im Ladebild */
  :root { color-scheme: dark; --feld: #0a0f1e;
          --gold-100: #f0dfb0; --gold-200: #e4c886; --gold-300: #d4ad66;
          --tx-1: #eee6d4; --tx-2: #c0b7a3; --tx-3: #8b8373; --blood-300: #f08a7e; --good: #9fd38a;
          --line-1: rgba(212,176,102,.14); --line-2: rgba(212,173,102,.45);
          --font-display: 'Cinzel', 'Trajan Pro', Georgia, serif; --font-ui: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  * { box-sizing: border-box; }
  html { background: #0b1430; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center;
         padding: calc(env(safe-area-inset-top, 0px) + 8vh) 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
         font: 400 13px/1.4 var(--font-ui); color: var(--tx-1); -webkit-font-smoothing: antialiased; background: #0b1430; }
  .szene, .schleier { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .szene { display: block; }
  .schleier { background: radial-gradient(ellipse 90% 80% at 50% 40%, transparent 55%, rgba(3,5,12,.6)),
                          linear-gradient(180deg, rgba(3,5,12,.3), transparent 20%, transparent 45%, rgba(4,6,14,.9)); }
  .logo, .karte, .hinweis { position: relative; }
  .logo { display: flex; flex-direction: column; align-items: center; text-align: center; }
  h1 { margin: 0; display: flex; flex-direction: column; align-items: center; font: 700 clamp(42px, 12vw, 54px)/.98 var(--font-display); letter-spacing: .06em; text-transform: uppercase;
       filter: drop-shadow(0 2px 0 #5a3f14) drop-shadow(0 4px 14px rgba(0,0,0,.75)); }
  h1 span { background-image: linear-gradient(180deg, #fff3cf 8%, #e4c886 45%, #a27832 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  h1 span:first-child { font-size: .55em; letter-spacing: .34em; margin-right: -.34em; }
  .logo::before { content: ""; position: absolute; inset: -28px -56px; z-index: -1; background: radial-gradient(ellipse 70% 60% at 45% 50%, rgba(6,12,32,.62), transparent 72%); }   /* Kontrast auf hellem Himmel */
  .unter { display: flex; align-items: center; gap: 12px; margin: 12px 0 0; font: 600 12px/1 var(--font-ui); letter-spacing: .34em; text-transform: uppercase; color: #fff1d0;
           text-shadow: 0 1px 3px #000, 0 0 10px rgba(0,0,0,.7); }
  .unter span { width: 30px; height: 1px; background: linear-gradient(90deg, transparent, #d9b56a); } .unter span:last-child { transform: scaleX(-1); }
  .karte { width: 100%; max-width: 380px; margin-top: auto; padding: 16px 16px 12px; border: 1px solid var(--line-2); border-radius: 10px;
           background: rgba(10,14,28,.78); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
           box-shadow: inset 0 1px 0 rgba(255,240,205,.06), 0 20px 50px rgba(0,0,0,.6); }
  .reiter { display: flex; margin: -6px 0 6px; border-bottom: 1px solid var(--line-1); }
  .reiter a { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 44px; margin-bottom: -1px; text-decoration: none; border-bottom: 2px solid transparent;
              font: 600 14px/1 var(--font-ui); letter-spacing: .04em; color: var(--tx-3); }
  .reiter a.an { color: var(--gold-100); border-bottom-color: var(--gold-200); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .feld { position: relative; margin-top: 10px; }
  input[type=text], input[type=password] { display: block; width: 100%; height: 48px; margin-top: 10px; padding: 0 14px; font: 400 16px var(--font-ui); color: var(--tx-1);
         background: var(--feld); border: 1px solid #7a6030; border-radius: 6px; outline: none; transition: border-color .15s, box-shadow .15s; }
  .feld input { margin-top: 0; padding-right: 48px; }
  input::placeholder { color: var(--tx-3); opacity: 1; }
  input:focus { border-color: var(--gold-200); box-shadow: 0 0 0 3px rgba(228,200,134,.2); }
  /* kein Gelb/Weiß vom Browser beim automatischen Ausfüllen */
  input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 1000px var(--feld) inset; box-shadow: 0 0 0 1000px var(--feld) inset;
         -webkit-text-fill-color: var(--tx-1); caret-color: var(--tx-1); border-color: #7a6030; transition: background-color 9999s; }
  .regel { margin: 4px 2px 0; font-size: 11px; line-height: 1.3; color: var(--tx-3); }
  .regel.ok { color: var(--good); } .regel.nein { color: var(--blood-300); }
  button { width: 100%; min-height: 56px; margin-top: 16px; padding: 0 16px; font: 700 18px/1 var(--font-display); letter-spacing: .12em; text-transform: uppercase; border-radius: 8px; cursor: pointer;
           border: 1px solid #ffe9a8; background: linear-gradient(180deg, #ffe28a 0%, #f5b82e 55%, #d98a12 100%); color: #3a2306;
           text-shadow: 0 1px 0 rgba(255,240,205,.5); box-shadow: inset 0 1px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.25), 0 6px 18px rgba(245,184,46,.35); }
  button:active { transform: translateY(1px); }
  button:disabled { opacity: .6; cursor: default; }
  .auge { position: absolute; top: 2px; right: 2px; width: 44px; min-height: 44px; margin: 0; padding: 0; display: grid; place-items: center;
          border: 0; background: none; box-shadow: none; text-shadow: none; color: var(--tx-3); }
  .auge[hidden] { display: none; } .auge svg { width: 20px; height: 20px; } .auge[aria-pressed=true] { color: var(--gold-200); }
  button.leise { min-height: 44px; margin-top: 4px; border: 0; background: none; box-shadow: none; text-shadow: none; font: 600 13px/1 var(--font-ui); letter-spacing: .02em; text-transform: none;
           color: var(--tx-2); text-decoration: underline; text-underline-offset: 3px; }
  .fuss { position: relative; display: flex; justify-content: center; margin: 4px 0 0; }
  .knopf2 { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 8px; text-decoration: none; font: 600 12px/1.2 var(--font-ui); color: var(--tx-2); text-shadow: 0 1px 3px #000; }
  .knopf2 svg { width: 16px; height: 16px; flex: none; color: var(--gold-200); }
  .fehler { margin: 10px 0 4px; padding: 8px 12px; border: 1px solid rgba(240,138,126,.45); border-radius: 6px; background: rgba(210,76,64,.14); color: var(--blood-300); font-size: 13px; }
  .hinweis { margin: 0; text-align: center; font-size: 10px; color: var(--tx-3); text-shadow: 0 1px 3px #000; }
  .hallo { margin: 0; text-align: center; font-size: 15px; color: var(--tx-2); } .hallo b { color: var(--gold-100); }
  :focus-visible { outline: 2px solid var(--gold-300); outline-offset: 2px; }
  /* Desktop: Logo oben links wie ein Plakat, Kasten rechts in der Mitte – die Burg bleibt frei */
  @media (min-width: 900px) and (min-aspect-ratio: 11/10) {
    body { display: block; padding: 0; }
    .logo { position: absolute; left: 4vw; top: 15vh; align-items: flex-start; text-align: left; }
    h1 { font-size: 88px; align-items: flex-start; } .unter { margin-top: 16px; }
    .karte { position: absolute; right: 4vw; bottom: calc(8vh + 40px); width: 380px; margin: 0; }
    .fuss { position: absolute; right: 4vw; bottom: calc(8vh); width: 380px; }
    .hinweis { position: absolute; right: 4vw; bottom: calc(8vh - 22px); width: 380px; margin: 0; }
  }
  @media (max-width: 380px) { .unter { letter-spacing: .22em; gap: 8px; } .unter span { width: 18px; } }   /* (sonst 8 px breiter als ein kleines Handy) */
  /* Handy hochkant: kleineres Logo, damit der Feldherr über dem Kasten frei bleibt */
  @media (max-width: 899px) and (orientation: portrait) { h1 { font-size: clamp(34px, 10vw, 44px); } }
  /* Handy quer: alles ohne Scrollen */
  @media (max-height: 560px) { body { padding-top: 12px; padding-bottom: 8px; } h1 { font-size: 30px; } .unter { display: none; } .karte { padding: 10px 14px; margin-top: 12px; }
    .reiter a { min-height: 36px; } input[type=text], input[type=password] { height: 42px; margin-top: 8px; } .feld { margin-top: 8px; } button { min-height: 46px; margin-top: 10px; } .hinweis { display: none; } }
</style>
</head>
<body>
<canvas id="titelCanvas" class="szene" aria-hidden="true"></canvas>
<div class="schleier" aria-hidden="true"></div>
<header class="logo">
  <h1><span>Open</span> <span>Water</span></h1>
  <p class="unter"><span></span>Erobere die Inseln<span></span></p>
</header>
<main class="karte">
<?php if ($ich && wartung()): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <div class="fehler">Gerade wird eine neue Version aufgespielt. In ein paar Minuten geht es weiter.</div>
  <form action="./" method="get"><button type="submit">Nochmal versuchen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php elseif ($ich): ?>
  <p class="hallo">Angemeldet als <b><?= h($ich['name']) ?></b></p>
  <form action="spiel.php" method="get" data-laedt><button type="submit">Spielen</button></form>
  <form action="?aus=1" method="post"><button type="submit" class="leise">Abmelden</button></form>
<?php else: ?>
  <nav class="reiter">
    <a href="./" class="<?= $modus === 'login' ? 'an' : '' ?>">Anmelden</a>
    <a href="?m=neu" class="<?= $modus === 'neu' ? 'an' : '' ?>">Neu registrieren</a>
  </nav>
  <?php if ($fehler): ?><div class="fehler" role="alert"><?= h($fehler) ?></div><?php endif; ?>
  <form method="post" action="<?= $modus === 'neu' ? '?m=neu' : './' ?>" data-einmal>
    <input type="hidden" name="modus" value="<?= $modus ?>">
    <label for="name" class="sr">Name</label>
    <input type="text" id="name" name="name" maxlength="20" placeholder="Name" autocomplete="username" required value="<?= h(is_string($_POST['name'] ?? null) ? $_POST['name'] : '') ?>"<?= $modus === 'neu' ? ' aria-describedby="nameRegel"' : '' ?>>
    <?php if ($modus === 'neu'): ?><p class="regel" id="nameRegel" data-min="3">3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -)</p><?php endif; ?>
    <label for="pw" class="sr">Passwort</label>
    <div class="feld">
      <input type="password" id="pw" name="pw" placeholder="Passwort" autocomplete="<?= $modus === 'neu' ? 'new-password' : 'current-password' ?>" required<?= $modus === 'neu' ? ' aria-describedby="pwRegel"' : '' ?>>
      <button type="button" class="auge" aria-label="Passwort zeigen" aria-pressed="false" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
    </div>
    <?php if ($modus === 'neu'): ?>
    <p class="regel" id="pwRegel" data-min="10">Mindestens 10 Zeichen</p>
    <label for="pw2" class="sr">Passwort wiederholen</label>
    <input type="password" id="pw2" name="pw2" placeholder="Passwort wiederholen" autocomplete="new-password" required>
    <?php endif; ?>
    <button type="submit"><?= $modus === 'neu' ? 'Konto anlegen' : 'Spielen' ?></button>
  </form>
<?php endif; ?>
</main>
<?php if (!$ich): ?>
<div class="fuss"><a class="knopf2" href="app/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>App auf den Startbildschirm</a></div>
<?php endif; ?>
<p class="hinweis">Dein Spielstand liegt auf dem Server. Im Browser bleibt nur ein Login-Cookie (30 Tage).</p>
<script src="<?= skript('ladebildschirm') ?>"></script>
<script nonce="<?= h(csp_nonce()) ?>">   // (statt onsubmit=…: Inline-Handler erlaubt die CSP nicht mehr)
document.querySelectorAll('form[data-laedt]').forEach(function (f) { f.addEventListener('submit', function () { var k = f.querySelector('button'); k.textContent = 'Lädt …'; k.disabled = true; }); });
document.querySelectorAll('form[data-einmal]').forEach(function (f) { f.addEventListener('submit', function (e) { var b = f.querySelector('button[type=submit]'); if (b.disabled) { e.preventDefault(); return; } b.disabled = true; }); });
// Am Rechner gleich ins Namensfeld (am Handy nicht – sonst springt die Tastatur auf)
if (matchMedia('(pointer: fine)').matches && document.getElementById('name')) document.getElementById('name').focus();
// Auge: Passwort zeigen/verbergen (ohne Skript bleibt der Knopf versteckt)
document.querySelectorAll('.auge').forEach(function (a) { var i = a.parentNode.querySelector('input'); a.hidden = false;
  a.addEventListener('click', function () { var zeigen = i.type === 'password'; i.type = zeigen ? 'text' : 'password'; a.setAttribute('aria-pressed', zeigen); a.setAttribute('aria-label', zeigen ? 'Passwort verbergen' : 'Passwort zeigen'); }); });
// Regeln schon beim Tippen: grün, sobald lang genug (nur die Länge – alles Weitere prüft der Server)
document.querySelectorAll('.regel[data-min]').forEach(function (r) { var i = document.querySelector('[aria-describedby="' + r.id + '"]');
  i.addEventListener('input', function () { var n = Array.from(i.name === 'name' ? i.value.trim() : i.value).length; r.classList.toggle('ok', n >= +r.dataset.min); r.classList.toggle('nein', n > 0 && n < +r.dataset.min); }); });
</script>
</body>
</html>
