// hochladen.sh (6.10.): abgebrochene Verbindungen werden wiederholt, jede Datei wird über den Editor zurückgelesen und
// verglichen, erst dann ist die Wartung aus. Ohne Browser und NIE mit dem echten Server: ein nachgebauter Editor des Hosters
// (freier Port, kappt jede 3. Verbindung, eine Anfrage hängt, eine Datei kommt einmal kaputt an) im Arbeitsordner.
//   node tests/browser/welt_hochladen_test.js <vorschau (unbenutzt)> <arbeitsordner>
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const ok = (b, t, x) => { console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 600) : '')); if (!b) fehler++; };
let fehler = 0;
const REPO = path.join(__dirname, '../..'), ARBEIT = process.argv[3] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'ow_hochladen_'));
const B = '/var/www/vhosts/hosting126306.a2feb.netcup.net/httpdocs/office.hobbitonhill.de/html/725/klassenarbeit_GR4';
const SID = '0123abcd';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

// Der nachgebaute Editor: Anmelden (index.php), editor.php (Ordnerliste, Textfeld, Hochladen, Ordner anlegen, Löschen),
// öffentliche Adresse …/Game/<datei>. Fehler: jede 3. Verbindung gekappt, Verbindung Nr. haengen bleibt ohne Antwort,
// die erste Hochladung von kaputt kommt halb an, Dateien in nie kommen nie an (Verbindung bricht ab).
function editor(wurzel, { haengen = 0, kaputt = '', nie = '' } = {}) {
  let n = 0; const offen = [], st = { gekappt: 0, gehaengt: 0, kaputt: 0, hoch: {} };
  const lokal = p => { if (!p.startsWith(B)) return null; const r = path.normalize(p.slice(B.length)); return r.includes('..') && !r.endsWith('/..') ? null : path.join(wurzel, r); };
  const srv = http.createServer((q, s) => {
    if (q.socket.haengt) return;   // diese Anfrage bekommt nie eine Antwort
    const teile = []; q.on('data', d => teile.push(d)); q.on('end', () => {
      const body = Buffer.concat(teile), u = new URL(q.url, 'http://x');
      if (u.pathname === '/index.php') { s.end('<html><a href="start.php?sid=' + SID + '">weiter</a></html>'); return; }
      if (u.pathname.startsWith('/html/725/klassenarbeit_GR4/Game/')) {
        const f = path.join(wurzel, 'Game', decodeURIComponent(u.pathname.slice('/html/725/klassenarbeit_GR4/Game/'.length)));
        if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nicht da'); return; }
        if (f.endsWith('.php')) { s.end('<html>läuft</html>'); return; }
        s.end(fs.readFileSync(f)); return;
      }
      if (u.pathname !== '/html/editor.php' || u.searchParams.get('sid') !== SID) { s.writeHead(403); s.end('nein'); return; }
      const ort = lokal(u.searchParams.get('path') || '');
      if (!ort) { s.writeHead(400); s.end('Pfad?'); return; }
      if (q.method === 'POST') {
        const grenze = (String(q.headers['content-type']).match(/boundary=(.+)$/) || [])[1], felder = {};
        if (grenze) {
          let a = body.indexOf('--' + grenze);
          while (a >= 0) {
            const b = body.indexOf('--' + grenze, a + grenze.length + 2); if (b < 0) break;
            const teil = body.slice(a + grenze.length + 4, b - 2), k = teil.indexOf('\r\n\r\n'), kopf = teil.slice(0, k).toString();
            const name = (kopf.match(/name="([^"]*)"/) || [])[1], datei = (kopf.match(/filename="([^"]*)"/) || [])[1];
            felder[name] = datei !== undefined ? { datei, inhalt: teil.slice(k + 4) } : teil.slice(k + 4).toString();
            a = b;
          }
        }
        if (felder.button === 'upload' && felder.file && felder.file.datei) {
          const d = felder.file.datei;
          if (nie && d === nie) { s.socket.destroy(); return; }
          let inhalt = felder.file.inhalt;
          if (kaputt && d === kaputt && !st.kaputt) { st.kaputt++; inhalt = inhalt.slice(0, inhalt.length >> 1); }
          fs.mkdirSync(ort, { recursive: true }); fs.writeFileSync(path.join(ort, d), inhalt); st.hoch[d] = (st.hoch[d] || 0) + 1;
        } else if (felder.button === 'new folder') fs.mkdirSync(path.join(ort, felder.file), { recursive: true });
        else if (felder.button === 'delete') fs.rmSync(path.join(ort, felder.file), { recursive: true, force: true });
        s.end('<html>erledigt</html>'); return;
      }
      if (fs.existsSync(ort) && fs.statSync(ort).isDirectory()) {
        const p = u.searchParams.get('path').replace(/\/$/, '');
        s.end('<html><a href="editor.php?h=48&sid=' + SID + '&path=' + p + '/..">..</a>' + fs.readdirSync(ort).map(x => '<a href="editor.php?h=48&sid=' + SID + '&path=' + p + '/' + x + '">' + x + '</a>').join('') + '</html>');
        return;
      }
      if (!fs.existsSync(ort)) { s.end('<html>Datei nicht gefunden</html>'); return; }
      s.end('<html><form><textarea name="text" rows="48">\n' + esc(fs.readFileSync(ort, 'utf8')) + '</textarea></form></html>');
    });
  });
  srv.on('connection', so => {
    n++;
    if (n % 3 === 0) { st.gekappt++; so.destroy(); return; }
    if (haengen && n === haengen) { st.gehaengt++; offen.push(so); so.haengt = true; }
  });
  return { srv, st, zu: () => { for (const so of offen) so.destroy(); srv.close(); } };
}
function lauf(port, ordner) {
  return new Promise(fertig => {
    const env = Object.assign({}, process.env, { OW_OFFICE: 'http://127.0.0.1:' + port, OW_PAUSEN: '0.1 0.1 0.1', OW_WARTUNG_PAUSE: '0', OW_MAXZEIT: '4', OW_VERBINDEN: '4',
      OFFICE_USER: 'probe', OFFICE_PASS: 'probe', DB_USER: 'probe', DB_PASS: 'nur-ein-test', NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' });
    for (const k of ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'ALL_PROXY', 'all_proxy', 'ALLES']) delete env[k];
    const p = spawn('bash', [path.join(ordner, 'hochladen.sh')], { env }); let aus = '';
    p.stdout.on('data', d => aus += d); p.stderr.on('data', d => aus += d);
    const t = setTimeout(() => p.kill('SIGKILL'), 600000);
    p.on('close', code => { clearTimeout(t); fertig({ code, aus }); });
  });
}
const gleich = (a, b) => fs.existsSync(a) && fs.existsSync(b) && Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0;
const NUR_SERVER = /^weltrechner\/(herz.*|log.*|zustand.*|sperre|crontab.*|schummel.*|vapid.*)\.php$/, TEILE = /^(spiel|bots|buendnis|baukunst|spielseite|server)\//;
function dateien(d, r = '') { return fs.readdirSync(path.join(d, r)).flatMap(x => fs.statSync(path.join(d, r, x)).isDirectory() ? dateien(d, path.join(r, x)) : [path.join(r, x)]); }

(async () => {
  // eine Kopie des Spiels (hochladen.sh setzt vorher zusammen – nie im echten Ordner)
  const kopie = path.join(ARBEIT, 'kopie'); fs.rmSync(kopie, { recursive: true, force: true }); fs.mkdirSync(kopie, { recursive: true });
  execFileSync('cp', ['-r', path.join(REPO, 'Game'), path.join(REPO, 'werkzeuge'), path.join(REPO, 'hochladen.sh'), kopie]);
  const soll = dateien(path.join(kopie, 'Game')).filter(f => !TEILE.test(f) && !NUR_SERVER.test(f) && f !== 'config.php');

  // 1) jede 3. Verbindung gekappt, eine hängt, bots.js kommt einmal halb an → am Ende alles gleich, Wartung aus
  const w1 = path.join(ARBEIT, 'server1'); fs.rmSync(w1, { recursive: true, force: true });
  fs.mkdirSync(path.join(w1, 'Game/api'), { recursive: true }); fs.writeFileSync(path.join(w1, 'Game/altes.txt'), 'alt'); fs.writeFileSync(path.join(w1, 'Game/api/x.php'), '<?php');
  fs.copyFileSync(path.join(kopie, 'Game/sw.js'), path.join(w1, 'Game/sw.js'));   // schon gleich: kommt nicht nochmal hoch
  const e1 = editor(w1, { haengen: 80, kaputt: 'bots.js' }); await new Promise(f => e1.srv.listen(0, '127.0.0.1', f));
  const t0 = Date.now(), r1 = await lauf(e1.srv.address().port, kopie); e1.zu(); fs.writeFileSync(path.join(ARBEIT, 'lauf1.log'), r1.aus);
  ok(r1.code === 0, 'Hochladen trotz gekappter Verbindungen fertig (Exit 0)', { code: r1.code, ende: r1.aus.slice(-1500) });
  ok(/Wartung aus \(wartung\.txt ist weg\)/.test(r1.aus) && !fs.existsSync(path.join(w1, 'Game/wartung.txt')), 'Wartung aus und wartung.txt wirklich weg');
  const fehlt = soll.filter(f => !gleich(path.join(kopie, 'Game', f), path.join(w1, 'Game', f)));
  ok(!fehlt.length, 'jede Datei des Spiels liegt genau gleich auf dem Server (' + soll.length + ' Dateien)', fehlt);
  ok(/'db_pass' => 'nur-ein-test'/.test(fs.existsSync(path.join(w1, 'Game/config.php')) ? fs.readFileSync(path.join(w1, 'Game/config.php'), 'utf8') : ''), 'config.php aus den Umgebungsvariablen hochgeladen + geprüft');
  ok(e1.st.gekappt >= 10 && /neuer Versuch/.test(r1.aus), 'gekappte Verbindungen wurden wiederholt', { gekappt: e1.st.gekappt });
  ok(e1.st.gehaengt === 1 && /curl: \(28\)/.test(r1.aus), 'hängende Anfrage: Zeitgrenze, dann neuer Versuch', { gehaengt: e1.st.gehaengt });
  ok(e1.st.kaputt === 1 && e1.st.hoch['bots.js'] === 2 && /bots\.js ist auf dem Server anders als hier – nochmal hochladen/.test(r1.aus), 'halb angekommenes bots.js beim Zurücklesen erkannt und nochmal hochgeladen', { hoch: e1.st.hoch['bots.js'] });
  ok(e1.st.hoch['spiel.php'] === 1 && /spiel\.php hochgeladen \+ geprüft/.test(r1.aus), 'PHP-Datei über den Editor zurückgelesen und geprüft');
  ok(!e1.st.hoch['sw.js'], 'unveränderte Datei nicht nochmal hochgeladen');
  ok(!fs.existsSync(path.join(w1, 'Game/altes.txt')) && !fs.existsSync(path.join(w1, 'Game/api')), 'alte Dateien/Ordner auf dem Server entfernt');
  console.log('  (Lauf 1: ' + Math.round((Date.now() - t0) / 1000) + ' s, ' + e1.st.gekappt + ' Verbindungen gekappt)');

  // 2) spiel.php kommt nie an → nach 3 Wiederholungen große Meldung, Wartung bleibt an
  const w2 = path.join(ARBEIT, 'server2'); fs.rmSync(w2, { recursive: true, force: true }); fs.mkdirSync(path.join(w2, 'Game'), { recursive: true });
  const e2 = editor(w2, { nie: 'spiel.php' }); await new Promise(f => e2.srv.listen(0, '127.0.0.1', f));
  const r2 = await lauf(e2.srv.address().port, kopie); e2.zu();
  ok(r2.code !== 0 && /WARTUNG NOCH AN – Datei spiel\.php fehlt/.test(r2.aus) && /\.\/hochladen\.sh erneut starten/.test(r2.aus), 'Datei kommt nie an: große Meldung „WARTUNG NOCH AN – Datei spiel.php fehlt“', { code: r2.code, ende: r2.aus.slice(-600) });
  ok(fs.existsSync(path.join(w2, 'Game/wartung.txt')), 'dann bleibt die Wartung an (niemand spielt mit halber Version)');
  ok((r2.aus.match(/neuer Versuch/g) || []).length >= 3, 'vorher 3 Wiederholungen');

  fs.rmSync(kopie, { recursive: true, force: true });
  console.log(fehler ? 'FEHLER: ' + fehler + ' Prüfung(en) nicht bestanden' : 'Fehler: keine');
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.log('FEHLER Ablauf: ' + (e && e.stack || e)); process.exit(1); });
