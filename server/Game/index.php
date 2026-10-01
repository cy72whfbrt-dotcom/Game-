<?php
// Startseite: Anmelden oder Registrieren. Wer angemeldet ist, kann gleich weiterspielen.
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
$user = null; $problem = false;
try { $user = ow_user(); } catch (Throwable $e) { $problem = true; error_log('open water start: ' . $e->getMessage()); }
header('Cache-Control: no-store');
$h = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Open Water</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#06101f; --card:#11223a; --line:#24405f; --text:#eef3f8; --muted:#9db0c4; --gold:#e0b04a; --gold2:#f3d27c; --bad:#ff8a7a; }
  * { box-sizing:border-box; }
  html, body { margin:0; min-height:100%; }
  body { background:radial-gradient(120% 80% at 50% 0%, #1b3c66 0%, #0a1a30 55%, var(--bg) 100%); background-color:var(--bg); color:var(--text);
         font:500 16px/1.45 Inter, system-ui, sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 16px; }
  .box { width:100%; max-width:380px; }
  h1 { font:700 40px/1.1 Cinzel, serif; text-align:center; margin:0 0 4px; color:var(--gold2); letter-spacing:.04em; text-shadow:0 2px 18px rgba(224,176,74,.35); }
  .sub { text-align:center; color:var(--muted); margin:0 0 26px; }
  .card { background:rgba(17,34,58,.92); border:1px solid var(--line); border-radius:16px; padding:20px; box-shadow:0 12px 40px rgba(0,0,0,.45); }
  .tabs { display:flex; gap:6px; background:#0b1729; border-radius:12px; padding:4px; margin-bottom:18px; }
  .tabs button { flex:1; border:0; background:transparent; color:var(--muted); font:600 15px Inter, sans-serif; padding:9px; border-radius:9px; cursor:pointer; }
  .tabs button[aria-selected="true"] { background:var(--card); color:var(--text); box-shadow:0 0 0 1px var(--line) inset; }
  label { display:block; font-size:14px; color:var(--muted); margin:0 0 6px; }
  input { width:100%; font:500 16px Inter, sans-serif; color:var(--text); background:#0b1729; border:1px solid var(--line); border-radius:10px; padding:11px 12px; margin:0 0 14px; outline:none; }
  input:focus { border-color:var(--gold); }
  .go { width:100%; border:0; border-radius:12px; padding:13px; font:700 17px Inter, sans-serif; color:#1b1406; background:linear-gradient(180deg, var(--gold2), var(--gold)); cursor:pointer; }
  .go:disabled { opacity:.6; cursor:wait; }
  .ghost { width:100%; margin-top:10px; border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:12px; padding:11px; font:600 15px Inter, sans-serif; cursor:pointer; }
  .msg { min-height:22px; color:var(--bad); font-size:14px; margin:2px 0 10px; }
  .hi { text-align:center; margin:0 0 16px; }
  .hi b { color:var(--gold2); }
  .foot { text-align:center; color:var(--muted); font-size:13px; margin-top:16px; }
</style>
</head>
<body>
<main class="box">
  <h1>Open Water</h1>
  <p class="sub">Erobere die Inseln</p>
  <div class="card">
<?php if ($problem): ?>
    <p class="msg">Der Server hat gerade ein Problem. Bitte später nochmal versuchen.</p>
<?php elseif ($user): ?>
    <p class="hi">Hallo <b><?= $h($user['name']) ?></b>!</p>
    <button class="go" type="button" onclick="location.href='spiel.php'">Weiterspielen</button>
    <button class="ghost" type="button" id="out">Abmelden</button>
<?php else: ?>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="tIn" aria-selected="true">Anmelden</button>
      <button type="button" role="tab" id="tNew" aria-selected="false">Registrieren</button>
    </div>
    <form id="f" autocomplete="on">
      <label for="name">Name</label>
      <input id="name" name="username" autocomplete="username" maxlength="20" required>
      <label for="pw">Passwort</label>
      <input id="pw" name="password" type="password" autocomplete="current-password" required>
      <div id="pw2wrap" hidden><label for="pw2">Passwort wiederholen</label><input id="pw2" type="password" autocomplete="new-password"></div>
      <p class="msg" id="msg" role="alert"></p>
      <button class="go" id="go" type="submit">Anmelden</button>
    </form>
<?php endif; ?>
  </div>
  <p class="foot">Dein Spielstand wird auf dem Server gespeichert.</p>
</main>
<script>
(function () {
  function post(body) {
    return fetch('api/konto.php', { method: 'POST', credentials: 'same-origin', headers: { 'X-OW': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, fehler: 'Der Server antwortet nicht richtig.' }; }); });
  }
  var out = document.getElementById('out');
  if (out) out.onclick = function () { post({ was: 'abmelden' }).then(function () { location.reload(); }); };
  var f = document.getElementById('f'); if (!f) return;
  var neu = false, tIn = document.getElementById('tIn'), tNew = document.getElementById('tNew'), go = document.getElementById('go'), msg = document.getElementById('msg');
  var pw = document.getElementById('pw'), pw2 = document.getElementById('pw2'), wrap = document.getElementById('pw2wrap');
  function mode(n) {
    neu = n; tIn.setAttribute('aria-selected', String(!n)); tNew.setAttribute('aria-selected', String(n));
    wrap.hidden = !n; pw2.required = n; go.textContent = n ? 'Registrieren' : 'Anmelden';
    pw.autocomplete = n ? 'new-password' : 'current-password'; msg.textContent = '';
  }
  tIn.onclick = function () { mode(false); }; tNew.onclick = function () { mode(true); };
  f.onsubmit = function (e) {
    e.preventDefault();
    var name = document.getElementById('name').value.trim();
    if (neu && pw.value !== pw2.value) { msg.textContent = 'Die Passwörter sind nicht gleich.'; return; }
    go.disabled = true; msg.textContent = '';
    post({ was: neu ? 'registrieren' : 'anmelden', name: name, pw: pw.value })
      .then(function (r) { if (r.ok) location.href = 'spiel.php'; else { msg.textContent = r.fehler || 'Das hat nicht geklappt.'; go.disabled = false; } })
      .catch(function () { msg.textContent = 'Keine Verbindung zum Server.'; go.disabled = false; });
  };
})();
</script>
</body>
</html>
