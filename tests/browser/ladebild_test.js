// Ladebild + Startseite neu (6.10., LIESMICH 11c Punkt 16): gemaltes Titelbild (hoch/quer nach Seitenverhältnis) über der
// Canvas-Szene, unten nur Tipp-Zeile + dünner Balken, Prozent = Füllung des Balkens (schon bevor spiel.js da ist).
//   node tests/browser/ladebild_test.js <vorschau>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2], GAME = path.join(__dirname, '..', '..', 'Game');
let fehler = 0; const ok = (b, was, info) => { if (!b) { fehler++; console.log('FEHLER: ' + was + (info !== undefined ? ' ' + JSON.stringify(info) : '')); } else console.log('ok: ' + was); };
const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

(async () => {
  // Dateien: Bilder klein genug, Startseite lädt die Szene als eigenes Skript (CSP), Vorschau kopiert die Bilder
  for (const n of ['titel_hoch.jpg', 'titel_quer.jpg']) { const f = path.join(GAME, 'bilder', n); ok(fs.existsSync(f) && fs.statSync(f).size < 260000, 'Game/bilder/' + n + ' da und < 260 KB', fs.existsSync(f) && fs.statSync(f).size); }
  const ix = fs.readFileSync(path.join(GAME, 'index.php'), 'utf8');
  ok(ix.includes('<canvas id="titelCanvas"') && ix.includes("<script src=\"<?= skript('ladebildschirm') ?>\"></script>") && /input:-webkit-autofill/.test(ix), 'Startseite: Szene + Skript + kein Autofill-Gelb');
  ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(fs.readFileSync(path.join(GAME, 'ladebildschirm.js'), 'utf8')), 'Ladebild speichert nichts im Browser');

  const srv = http.createServer((q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(D, p); if (!f.startsWith(D) || !fs.existsSync(f)) { a.writeHead(404); return a.end(); }
    a.writeHead(200, { 'Content-Type': TYP[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(a); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1'] });
  for (const [art, vp, bild] of [['Handy', { width: 390, height: 844 }, 'titel_hoch.jpg'], ['Desktop', { width: 1440, height: 900 }, 'titel_quer.jpg'], ['ohne Bild', { width: 390, height: 844 }, null]]) {
    const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage(), fe = [], geholt = [];
    p.on('pageerror', e => fe.push(e.message)); p.on('request', r => { if (/bilder\//.test(r.url())) geholt.push(path.basename(r.url().split('?')[0])); });
    await p.addInitScript(o => { window.__FORCE_SPLASH = true; if (o) window.__titelBild = false; }, !bild);
    await p.route(/(^|\/)(klein\/)?(spiel|bots|buendnis|aufbau|haendler|speichern)\.js/, r => r.abort());   // nur das Ladebild (spiel.js kommt „nie“)
    await p.goto(B);
    const proben = [];
    for (const ms of [400, 800, 1300]) { await p.waitForTimeout(ms);
      proben.push(await p.evaluate(() => { const f = document.getElementById('splashFill'), bar = f.parentNode;
        return { pct: document.getElementById('splashPct').textContent, soll: Math.floor(f.getBoundingClientRect().width / bar.clientWidth * 100 + 0.01) + ' %' }; })); }
    ok(proben.every(x => x.pct === x.soll) && proben[2].pct !== '0 %', art + ': Prozent passt zur Füllung, auch ohne spiel.js', proben);
    const r = await p.evaluate(() => { const c = document.getElementById('splashCanvas'), x = document.createElement('canvas'); x.width = 40; x.height = 40;
      const g = x.getContext('2d'); g.drawImage(c, 0, 0, 40, 40); const d = g.getImageData(0, 0, 40, 40).data; let farbig = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) farbig++;
      return { farbig, kasten: !!document.querySelector('.splash-tipcard, .splash-cap, #splashTipPic'), tipp: document.getElementById('splashTip').textContent.length,
               balkenHoehe: document.querySelector('.splash-bar').getBoundingClientRect().height }; });
    ok(r.farbig > 400 && !r.kasten && r.tipp > 20 && r.balkenHoehe <= 5, art + ': Bild gemalt, nur Tipp-Zeile + dünner Balken', r);
    if (bild) ok(geholt.length === 1 && geholt[0] === bild, art + ': nur das passende Titelbild geladen (' + bild + ')', geholt);   // (ohne Bild holt der Vorab-Link es trotzdem – egal)
    ok(!fe.length, art + ': keine Skript-Fehler', fe);
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(fehler ? 'FEHLER: ' + fehler + ' Prüfungen rot' : 'OK: Ladebild – alles bestanden');
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.log('FEHLER: ' + e.message); process.exit(1); });
