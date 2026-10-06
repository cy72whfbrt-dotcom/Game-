// Schneller laden (6.10.): verkleinerte Skripte aus Game/klein/, skript.php (gepackt + lange zwischengespeichert),
// three.js + baukunst.js erst nach dem ersten Bild der Karte.   node tests/browser/laden_test.js <vorschau> [arbeitsordner]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), net = require('net'), zlib = require('zlib'), vm = require('vm'), crypto = require('crypto');
const { spawn } = require('child_process');
const D = process.argv[2], GAME = path.join(__dirname, '..', '..', 'Game');
const SKRIPTE = ['ladebildschirm', 'speichern', 'bots', 'welt', 'spiel', 'aufbau', 'buendnis', 'haendler', 'benachrichtigung', 'baukunst'];
let fehler = 0; const pruef = (ok, was) => { if (!ok) { fehler++; console.log('FEHLER: ' + was); } else console.log('ok: ' + was); };
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';

const freierPort = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const holen = (port, pfad, gzip) => new Promise((ja, nein) => http.get({ host: '127.0.0.1', port, path: pfad, headers: gzip ? { 'Accept-Encoding': 'gzip' } : {} }, r => {
  const teile = []; r.on('data', d => teile.push(d)); r.on('end', () => ja({ code: r.statusCode, h: r.headers, body: Buffer.concat(teile) }));
}).on('error', nein));

(async () => {
  // 1) Die verkleinerten Dateien: kleiner, gültig, merken sich ihr Original
  for (const n of SKRIPTE) {
    const k = path.join(GAME, 'klein', n + '.js'), q = path.join(GAME, n + '.js');
    if (!fs.existsSync(k)) { pruef(false, 'Game/klein/' + n + '.js fehlt'); continue; }
    const t = fs.readFileSync(k, 'utf8');
    let gueltig = true; try { new vm.Script(t); } catch (e) { gueltig = false; }
    const sha = crypto.createHash('sha1').update(fs.readFileSync(q)).digest('hex');
    pruef(gueltig && t.startsWith('/* verkleinert aus ' + n + '.js · ' + sha + ' · ') && t.length < fs.statSync(q).size * .9, n + '.js verkleinert (' + Math.round(fs.statSync(q).size / 1024) + ' → ' + Math.round(t.length / 1024) + ' KB)');
  }

  // 2) skript.php auf einem PHP-Server (ohne Datenbank, nur diese Datei)
  const port = await freierPort();
  const php = spawn('php', ['-S', '127.0.0.1:' + port, '-t', GAME], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await holen(port, '/skript.php'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
    const v = crypto.createHash('sha1').update(fs.readFileSync(path.join(GAME, 'spiel.js'))).digest('hex').slice(0, 12), klein = fs.readFileSync(path.join(GAME, 'klein', 'spiel.js'));
    let r = await holen(port, '/skript.php?d=spiel&v=' + v, true);
    pruef(r.code === 200 && r.h['content-encoding'] === 'gzip' && /immutable/.test(r.h['cache-control'] || '') && /javascript/.test(r.h['content-type'] || '') && zlib.gunzipSync(r.body).equals(klein),
      'skript.php: gepackt, ein Jahr zwischenspeichern, genau Game/klein/spiel.js (' + Math.round(r.body.length / 1024) + ' KB gepackt)');
    r = await holen(port, '/skript.php?d=spiel&v=' + v, false);
    pruef(r.code === 200 && !r.h['content-encoding'] && r.body.equals(klein), 'skript.php ohne gzip: ungepackt');
    r = await holen(port, '/skript.php?d=spiel&v=1', true);
    pruef(r.code === 200 && r.h['cache-control'] === 'no-cache', 'andere Version: nicht lange behalten');
    for (const d of ['config', '../server', 'spiel.js', '', 'klein/spiel', 'sw']) { r = await holen(port, '/skript.php?d=' + encodeURIComponent(d), true); pruef(r.code === 404, 'skript.php?d=' + d + ' → 404'); }
    r = await holen(port, '/skript.php?d[]=spiel', true); pruef(r.code === 404, 'skript.php mit Liste → 404');
  } finally { php.kill(); }

  // 3) Die Seite: Skripte aus klein/, 3D erst nach dem ersten Bild
  const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  pruef(srcs.length >= 6 && srcs.every(s => s.startsWith('klein/')), 'alle Spiel-Skripte verkleinert: ' + srcs.map(s => s.split('?')[0]).join(', '));
  pruef(!/three\.min\.js"[^>]*><\/script>|<script[^>]*baukunst/.test(html) && /id="spaeterLaden"[^>]*data-three="https:\/\/cdn\.jsdelivr\.net/.test(html), 'three.js und baukunst.js nicht mehr im Kopf der Seite');

  const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  try {
    for (const mit3D of [false, true]) {
      const wie = mit3D ? ' (three.js kommt an)' : ' (ohne Netz für three.js)';
      const p = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage(); const errs = [], reihe = [];
      p.on('pageerror', e => errs.push(e.message));
      p.on('request', x => { const u = x.url(); if (u.startsWith(THREE)) reihe.push('three'); else if (/baukunst/.test(u)) reihe.push('baukunst'); });
      // vor dem Spiel: zählen, wie oft schon ein Bild gemalt wurde (requestAnimationFrame)
      await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__bilder = 0; window.requestAnimationFrame = cb => raf(t => { window.__bilder++; cb(t); }); });
      let beimLaden = null;
      await p.route(THREE + '*', async r => {
        beimLaden = await p.evaluate(() => ({ bilder: window.__bilder, spiel: typeof splashDone === 'function' && Array.isArray(islands) && islands.length > 0 })).catch(e => ({ fehler: e.message }));
        if (!mit3D) return r.abort();
        r.fulfill({ body: 'window.__dreiStub = 1;', contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
      });
      if (mit3D) await p.route(url, async r => { const resp = await r.fetch(); r.fulfill({ response: resp, body: (await resp.text()).replace(/ data-sri="[^"]*"/, '') }); });   // (der Platzhalter passt nicht zur Prüfsumme)
      await p.goto(url); await p.waitForTimeout(4000);
      pruef(beimLaden && beimLaden.spiel && beimLaden.bilder >= 1, 'three.js erst nach dem ersten Bild der Karte geladen' + wie + ': ' + JSON.stringify(beimLaden));
      const st = await p.evaluate(() => ({ stub: window.__dreiStub || 0, ow: !!(window.OW && window.OW.game), insel: islands.length }));
      if (mit3D) pruef(reihe.join(',') === 'three,baukunst' && st.stub === 1 && !st.ow, 'nach three.js kommt baukunst.js (ohne echtes three: keine 3D-Bilder, kein Fehler)' + wie + ': ' + reihe.join(','));
      else pruef(reihe.join(',') === 'three', 'ohne three.js wird baukunst.js gar nicht geladen' + wie + ': ' + reihe.join(','));
      pruef(st.insel > 0 && errs.length === 0, 'Spiel läuft ohne Fehler' + wie + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
      if (!mit3D) {   // Profil → Einstellungen → Version: aus jeder Skript-Adresse (früher stand dort „–“, weil nur spiel.js?v=<Zeit> ging)
        const sha7 = crypto.createHash('sha1').update(fs.readFileSync(path.join(GAME, 'spiel.js'))).digest('hex').slice(0, 7);
        const ver = await p.evaluate(() => {
          const r = {}; openPanel(profilePopup); showProfileTab('set'); r.fenster = document.getElementById('setVersion').textContent;
          [...document.scripts].find(s => /spiel\.js/.test(s.src)).remove();
          const s = document.createElement('script'); s.type = 'text/plain'; s.src = 'skript.php?d=spiel&v=0123456789ab'; document.head.appendChild(s); r.server = spielVersion();
          s.src = 'spiel.js?v=1759700000'; r.original = spielVersion();
          window.__OW = { version: 1759750000 }; r.ow = spielVersion(); delete window.__OW;
          s.remove(); r.keine = spielVersion(); return r;
        });
        const datum = /^\d\d\.\d\d\.\d{4}, \d\d:\d\d$/;
        pruef(ver.fenster === sha7 && ver.server === '0123456' && datum.test(ver.original) && ver.original.includes('.10.2025') && datum.test(ver.ow) && ver.ow !== ver.original && ver.keine === '–',
          'Einstellungen → Version (Vorschau, skript.php, spiel.js?v=Zeit, Zeit vom Server, keine): ' + JSON.stringify(ver));
      }
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(fehler ? 'FEHLER: ' + fehler + ' Prüfungen rot' : 'OK: schneller laden – alles bestanden');
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.log('FEHLER: ' + (e && e.stack || e)); process.exit(1); });
