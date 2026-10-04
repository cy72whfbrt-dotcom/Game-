// Gemeinsame Hilfen für die Server-Tests (lokaler PHP-Server + MariaDB + Weltrechner).
// Wird von tests/server_tests.sh gestartet; die Werte kommen aus Umgebungsvariablen:
//   OW_TEST_GAME  Spiel-Ordner im lokalen Server (…/www/html/725/klassenarbeit_GR4/Game)
//   OW_TEST_URL   Adresse des Spiels (http://127.0.0.1:8770/html/725/klassenarbeit_GR4/Game/)
//   OW_TEST_PW    Passwort der Test-Spieler (pruefer5, pruefer6, neue Test-Spieler)
//   OW_ADMIN_NAME / OW_ADMIN_PW  Admin-Test-Konto (für Geschenke und den Admin-Test)
// Die Datenbank-Zugangsdaten stehen in der config.php des lokalen Servers (nie im Git).
const { execSync, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

function muss(n) { const v = process.env[n]; if (!v) { console.log('FEHLER Umgebungsvariable ' + n + ' fehlt (tests/server_tests.sh setzt sie)'); process.exit(1); } return v; }
const W = muss('OW_TEST_GAME').replace(/\/$/, '');
const B = muss('OW_TEST_URL').replace(/\/?$/, '/');
const PW = muss('OW_TEST_PW');

// Datenbank-Zugang aus der config.php des lokalen Servers
const CFG = JSON.parse(execFileSync('php', ['-r', 'echo json_encode(require $argv[1]);', W + '/config.php']).toString());
const DB_ENV = Object.assign({}, process.env, { MYSQL_PWD: CFG.db_pass || '' });
const DB_ARGS = ['-h', CFG.db_host || '127.0.0.1', '-u', CFG.db_user, CFG.db_name];
const sql = q => execFileSync('mysql', DB_ARGS.concat(['-N', '-e', q]), { env: DB_ENV, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }).toString().trim();
const sqlRoh = q => execFileSync('mysql', DB_ARGS.concat(['-N', '-B', '--raw', '-e', q]), { env: DB_ENV, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// PHP im Weltrechner-Ordner mit geladenem wachhund.php ausführen
const php = code => execFileSync('php', ['-r', '$_SERVER["SCRIPT_FILENAME"]="x"; chdir(' + JSON.stringify(W + '/weltrechner') + '); require "wachhund.php"; ' + code]).toString().trim();

const warte = ms => new Promise(r => setTimeout(r, ms));

// Ergebnisse: Zeilen „OK   …“ / „FEHLER …“, am Ende „Alles OK“ oder „FEHLER gefunden“
const erg = [];
const ok = (n, b, i) => { erg.push((b ? 'OK   ' : 'FEHLER ') + n + (i !== undefined && i !== '' ? ' – ' + i : '')); };
const ende = () => { console.log(erg.join('\n')); console.log(erg.some(x => x.startsWith('FEHLER')) ? 'FEHLER gefunden' : 'Alles OK'); };

// Browser ohne Internet (alles außer 127.0.0.1 läuft ins Leere)
async function browser() {
  const { chromium } = require('playwright');
  return chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
}
// Meldungen, die nur daher kommen, dass die Test-Umgebung kein Internet hat (Schriften, Bilder von außen)
const NUR_UMGEBUNG = /ERR_PROXY|PROXY_CONNECTION|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource/;

// Anmelden auf dem Handy; gibt die Seite zurück. o: { neu: Konto anlegen, pw, warte: ms nach dem Anmelden,
//   fehler: Liste für Skript-Fehler (pageerror), name: Vorsilbe für diese Fehler, konsole: auch Konsolen-Fehler sammeln }
async function rein(b, name, o) {
  o = o || {};
  const { devices } = require('playwright');
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  if (o.fehler) {
    p.on('pageerror', e => o.fehler.push((o.name || name) + ': ' + e.message));
    if (o.konsole) p.on('console', m => { if (m.type() === 'error' && !NUR_UMGEBUNG.test(m.text())) o.fehler.push((o.name || name) + ' Konsole: ' + m.text().slice(0, 150)); });
  }
  await p.goto(B + (o.neu ? '?m=neu' : '')); await p.fill('[name=name]', name); await p.fill('[name=pw]', o.pw || PW);
  if (o.neu && await p.$('[name=pw2]')) await p.fill('[name=pw2]', o.pw || PW);
  await Promise.all([p.waitForURL(/spiel\.php/, { timeout: 30000 }), p.click('button[type=submit]')]);
  await p.waitForTimeout(o.warte === undefined ? 15000 : o.warte);
  return p;
}
// Neuer Spieler: Willkommens-Name eintragen
const willkommen = (p, name) => p.evaluate(n => { const w = document.getElementById('wkName'); if (w) { w.value = n; const k = w.closest('div').parentElement.querySelector('button'); if (k) k.click(); } }, name);

const spielerId = name => +sql(`SELECT id FROM ow_spieler WHERE name='${esc(name)}'`);

// Admin-Geschenk über admin.php (wie Alexander im Admin-Bereich)
function geschenk(uid, gems, coins) {
  return execFileSync(path.join(__dirname, 'geschenk.sh'), [String(uid), String(gems || 0), String(coins || 0)]).toString().trim();
}

// Schummel-Hinweise des Weltrechners (schummel.php)
function schummelListe() {
  try { const t = fs.readFileSync(W + '/weltrechner/schummel.php', 'utf8'); return JSON.parse(t.slice(t.indexOf('{'))).liste || []; } catch (e) { return []; }
}

module.exports = { W, B, PW, sql, sqlRoh, esc, php, warte, erg, ok, ende, browser, NUR_UMGEBUNG, rein, willkommen, spielerId, geschenk, schummelListe };
