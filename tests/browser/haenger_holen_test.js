// Weltrechner holen() (5.10.): die Zeitgrenze gilt bis der Inhalt gelesen ist – ein Server, der nach den Kopfzeilen hängt,
// bricht nach der Frist ab (statt ewig zu warten); normale Antworten (auch 204, Fehler-Status) kommen wie bisher an.
// (ohne Browser: zeitGrenze/holen werden aus Game/weltrechner/start.js gelesen und mit einem lokalen Server geprüft)
const http = require('http'), fs = require('fs'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const quelle = fs.readFileSync(path.join(__dirname, '../../Game/weltrechner/start.js'), 'utf8');
const stueck = name => { const a = quelle.indexOf('\nfunction ' + name) >= 0 ? quelle.indexOf('\nfunction ' + name) : quelle.indexOf('\nasync function ' + name), e = quelle.indexOf('\n}\n', a); return quelle.slice(a, e + 3); };
(async () => {
  const offen = [];
  const srv = http.createServer((q, s) => {
    if (q.url.includes('haengt')) { s.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': '100' }); s.write('erst'); offen.push(s); return; }
    if (q.url.includes('leer')) { s.writeHead(204); s.end(); return; }
    if (q.url.includes('fehlt')) { s.writeHead(404, { 'X-Probe': 'b' }); s.end('weg'); return; }
    s.writeHead(200, { 'Content-Type': 'application/json', 'X-Probe': 'a' }); s.end(JSON.stringify({ schluessel: q.headers['x-weltrechner'] }));
  });
  await new Promise(f => srv.listen(0, '127.0.0.1', f));
  const URL_BASIS = 'http://127.0.0.1:' + srv.address().port + '/', SCHLUESSEL = 'probe';
  const holen = new Function('URL_BASIS', 'SCHLUESSEL', stueck('zeitGrenze') + stueck('holen') + 'return holen;')(URL_BASIS, SCHLUESSEL);
  try {
    const r = await holen('spiel.php');
    ok(r.ok && r.status === 200 && r.headers.get('x-probe') === 'a' && (await r.json()).schluessel === 'probe', 'normale Antwort: Status, Kopfzeilen, Inhalt (mit Schlüssel)');
    const l = await holen('leer'); ok(l.status === 204 && (await l.text()) === '', '204 ohne Inhalt');
    const f = await holen('fehlt'); ok(!f.ok && f.status === 404 && f.headers.get('x-probe') === 'b' && (await f.text()) === 'weg', 'Fehler-Status mit Inhalt');
    const t0 = Date.now(); let fehler = null;
    const lesen = (async () => (await holen('haengt', { zeit: 800 })).text())(); lesen.catch(() => {});
    try { await Promise.race([lesen, new Promise(f => setTimeout(f, 6000))]); } catch (e) { fehler = e; }
    const ms = Date.now() - t0;
    ok(fehler && /Zeitgrenze/.test(String(fehler && (fehler.message || fehler))) && ms < 4000, 'Hänger beim Lesen des Inhalts: Abbruch nach der Zeitgrenze', { ms, fehler: String(fehler && (fehler.message || fehler)) });
    let fremd = null; try { await holen('https://example.org/x'); } catch (e) { fremd = e.message; }
    ok(/fremde Adresse/.test(fremd || ''), 'Schlüssel nie an eine fremde Adresse', fremd);
  } catch (e) { ok(false, 'Ablauf', e.message); }
  for (const s of offen) s.destroy(); srv.close();
  console.log('Fehler: keine'); process.exit(0);
})();
