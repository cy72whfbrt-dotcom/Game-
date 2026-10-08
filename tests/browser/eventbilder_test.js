// Test-Dateien Thron-/Wochen-Event: alle Bilder laden, keine Platzhalter mehr, Shop-Reiter sortiert (Kisten · Event · Tempo, Gruppen mit Zwischenüberschrift, Beschleuniger aufsteigend), Lager-Tagesgrenze, Turm-Geschosse, Herrscher-Burg (Fotos in den Arbeitsordner)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = path.resolve(__dirname, '../..'), OUT = process.argv[3] || '.';
const ANS = [['thronevent', 'karte'], ['thronevent', 'herrscher'], ['thronevent', 'woche'], ['thronevent', 'shopkisten'], ['thronevent', 'shop'], ['thronevent', 'shoptempo'],
  ['wochenevent', 'mo'], ['wochenevent', 'rang&b=1'], ['wochenevent', 'lager'], ['wochenevent', 'kisten']];
const TYP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(D)) { r.writeHead(403); r.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYP[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const fehler = [];
  p.on('pageerror', e => fehler.push('js: ' + e.message));
  for (const [datei, a] of ANS) {
    await p.goto('http://127.0.0.1:' + srv.address().port + '/werkzeuge/' + datei + '/' + datei + '.html?a=' + a); await p.waitForTimeout(700);
    const r = await p.evaluate(() => ({ kaputt: [...document.images].filter(i => !i.naturalWidth).map(i => i.src.split('/').pop()),
      platzh: document.querySelectorAll('.platzh, .hinweis').length, thronReiter: [...document.querySelectorAll('#shopTabs .tab')].some(t => /Thron/.test(t.textContent)),
      reiter: (document.querySelector('#shopTabs .tab.active') || {}).textContent, ware: document.querySelectorAll('.is-open .ware').length,
      oeffnen: document.querySelectorAll('.is-open .oeffnen').length, bahn: document.querySelectorAll('#k2 .bahn img').length, schuss: document.querySelectorAll('.schuss').length,
      gruppen: [...document.querySelectorAll('.is-open .sort-kopf')].map(k => k.textContent).join('|'), reihe: [...document.querySelectorAll('#shopTabs .tab')].map(t => t.textContent.trim()).join('|'),
      zeiten: [...document.querySelectorAll('.is-open .sort-kopf')].filter(k => /^Beschleuniger/.test(k.textContent)).map(k => [...k.nextElementSibling.querySelectorAll('.zeit')].map(z => z.textContent).join(',')),
      grenze: [...document.querySelectorAll('.lg-grenze b')].map(b => b.textContent).join('|'), angelegt: !!document.querySelector('.is-open .angelegt'), herrBurg: !!document.querySelector('.burg.herrscher .krone') }));
    const w = datei + '?a=' + a;
    if (r.kaputt.length) fehler.push(w + ': Bild fehlt ' + r.kaputt.join(','));
    if (r.platzh) fehler.push(w + ': noch Platzhalter');
    if (r.thronReiter) fehler.push(w + ': Thron-Reiter noch da');
    if (a === 'shop' && (!/Event/.test(r.reiter) || r.ware < 10)) fehler.push(w + ': Event-Reiter falsch');
    if (a === 'shopkisten' && (!/Kisten/.test(r.reiter) || r.ware < 6)) fehler.push(w + ': Kisten-Reiter falsch');
    if (a === 'shopkisten' && r.oeffnen < 8) fehler.push(w + ': je Kiste 1×/10× öffnen fehlt');
    const TEMPO = '1 Min,5 Min,15 Min,1 Std,3 Std,8 Std,24 Std';
    if (/^shop/.test(a) && r.reihe !== 'Kisten|Event|Tempo|Schilde|Markt') fehler.push(w + ': Reiter-Reihenfolge ' + r.reihe);
    if (a === 'shopkisten' && r.gruppen !== 'Ausrüstung|Helden|Schlüssel') fehler.push(w + ': Kisten-Gruppen ' + r.gruppen);
    if (a === 'shop' && r.gruppen !== 'Beschleuniger|Schlüssel|Kisten') fehler.push(w + ': Event-Gruppen ' + r.gruppen);
    if ((a === 'shop' || a === 'shoptempo') && r.zeiten.join() !== TEMPO) fehler.push(w + ': Beschleuniger nicht aufsteigend');
    if (a === 'lager' && !/2,5 Mio.*Schlüssel \d\/3.*Lila \d\/1/.test(r.grenze)) fehler.push(w + ': Lager-Tagesgrenze fehlt');
    if (a === 'karte' && (r.bahn < 3 || r.schuss)) fehler.push(w + ': Turm-Geschosse fehlen');
    if (a === 'herrscher' && (!r.angelegt || !r.herrBurg)) fehler.push(w + ': Herrscher-Skin automatisch/Burg mit Krone fehlt');
    await p.screenshot({ path: path.join(OUT, datei + '_' + a.replace(/\W/g, '_') + '.png'), fullPage: true });
  }
  const bes = await p.evaluate(() => [...document.images].map(i => i.src).filter(s => /beute_beschleuniger\.webp/.test(s)).length);
  if (bes) fehler.push('altes Beschleuniger-Bild statt klein/mittel/groß');
  await b.close(); srv.close();
  console.log(fehler.length ? 'FEHLER\n' + fehler.join('\n') : 'OK eventbilder');
  process.exit(fehler.length ? 1 : 0);
});
