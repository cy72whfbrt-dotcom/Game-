// Einstellungen → Benachrichtigungen (benachrichtigung.js, Spieltest 6.10.): antwortet server.php nicht (Hoster unter Last), steht
// nach der Frist ein klarer Text mit „Nochmal versuchen“ statt ewig „Einen Moment …“; antwortet er beim zweiten Versuch, normal weiter.
// Eigener kleiner Server (Port 0, kein fester Port): liefert eine Seite mit der Karte und benachrichtigung.js, hält server.php fest.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const js = fs.readFileSync(path.join(__dirname, '..', '..', 'Game', 'benachrichtigung.js'));
  const seite = '<!doctype html><meta charset="utf-8"><div id="pushKarte"><p id="pushText">Einen Moment …</p><button id="pushKnopf" hidden></button><div id="pushArten" hidden></div></div>' +
    '<script>window.flashHint = () => {};</script><script src="benachrichtigung.js"></script>';
  let antworten = false, anfragen = 0;
  const srv = http.createServer((q, r) => {
    if (q.url.startsWith('/server.php')) { anfragen++; if (antworten) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"an":false}'); } return; }   // sonst: keine Antwort
    if (q.url.startsWith('/benachrichtigung.js')) { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(js); }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(seite);
  });
  await new Promise(f => srv.listen(0, '127.0.0.1', f));
  const b = await chromium.launch(), p = await b.newPage(), fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  const lage = () => p.evaluate(() => ({ text: document.getElementById('pushText').textContent, knopf: document.getElementById('pushKnopf').hidden ? '' : document.getElementById('pushKnopf').textContent }));
  await p.waitForTimeout(6000);
  const vorher = await lage();
  await p.waitForFunction(() => !/Einen Moment/.test(document.getElementById('pushText').textContent), null, { timeout: 15000 }).catch(() => {});
  const nach = await lage();
  ok(/Einen Moment/.test(vorher.text) && anfragen > 0, 'erst „Einen Moment …“, die Frage an den Server läuft', { vorher, anfragen });
  ok(/antwortet gerade nicht/.test(nach.text) && nach.knopf === 'Nochmal versuchen', 'nach der Frist: klarer Text + „Nochmal versuchen“', nach);
  antworten = true; await p.click('#pushKnopf');
  await p.waitForFunction(() => /gibt es gerade nicht/.test(document.getElementById('pushText').textContent), null, { timeout: 8000 }).catch(() => {});
  const zwei = await lage();
  ok(/gibt es gerade nicht/.test(zwei.text), 'zweiter Versuch mit Antwort: normaler Zustand', zwei);
  console.log('Fehler:', fe.length ? fe.slice(0, 3) : 'keine'); await b.close(); srv.closeAllConnections(); srv.close();
})();
