// Einstieg-Klick-Probe (werkzeuge/einstieg/einstieg.html, Alexander 10.10.): neuer Spieler, Bildschirm dunkel mit Loch, Finger zeigt.
// Prüft: Tipp neben das Loch tut nichts, jeder Schritt bis zur Beute klappt, Knöpfe kommen nach und nach, oben höchstens 1 Rohstoff,
// am Ende Ziel „Burg 3“ + „Was kommt wann“, Überspringen fragt erst. Handy 390×844; Fotos s01… in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [], bilder = process.argv[3];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../werkzeuge/einstieg/einstieg.html')); await p.waitForTimeout(800);
  const loch = () => p.evaluate(() => window.__einstieg.zustand().loch);
  const n = 14;
  let l = await loch();
  await p.mouse.click(5, 420); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__einstieg.schritt()) === 0, 'Tipp neben das Loch tut nichts');
  const sicht = [];
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < 40 && !(l = await loch()); t++) await p.waitForTimeout(200);
    if (!l) { ok(false, 'Schritt ' + i + ' hat kein Loch'); break; }
    await p.waitForTimeout(450);
    if (bilder) await p.screenshot({ path: path.join(bilder, 's' + String(i + 1).padStart(2, '0') + '.png') });
    sicht.push(await p.evaluate(() => ({ knoepfe: document.querySelectorAll('#unten .dock').length, roh: document.querySelectorAll('#roh .res').length })));
    l = await loch(); await p.mouse.click(l.cx, l.cy);
    if (i === 12) { await p.waitForTimeout(1500); if (bilder) await p.screenshot({ path: path.join(bilder, 's13b_kampf.png') }); }
    l = null;
  }
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ fertig: window.__einstieg.zustand().fertig, ziel: document.getElementById('zielText').textContent, knoepfe: document.querySelectorAll('#unten .dock').length }));
  if (bilder) await p.screenshot({ path: path.join(bilder, 's15_ende.png') });
  ok(r.fertig && r.ziel === 'Nächstes Ziel: Burg 3', 'Tutorial bis zur Beute durch, Ziel Burg 3', r);
  ok(sicht[4].knoepfe === 1 && r.knoepfe === 2, 'Knöpfe kommen nach und nach (1 → 2)', [sicht[4].knoepfe, r.knoepfe]);
  ok(sicht.every(x => x.roh <= 1), 'oben höchstens 1 Rohstoff');
  await p.click('#zielKnopf'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#wann tr').length) === 7, '„Was kommt wann“ zeigt 7 Stufen');
  if (bilder) await p.screenshot({ path: path.join(bilder, 's16_wann.png') });
  await p.click('#neu'); await p.waitForTimeout(500); await p.click('#weiter'); await p.waitForTimeout(200);
  const frage = await p.evaluate(() => !document.getElementById('frage').classList.contains('weg') && !window.__einstieg.zustand().fertig);
  if (bilder) await p.screenshot({ path: path.join(bilder, 's17_wirklich.png') });
  await p.click('#jaWeg'); await p.waitForTimeout(300);
  ok(frage && await p.evaluate(() => window.__einstieg.zustand().fertig), 'Überspringen fragt „Wirklich?“, dann fertig');
  ok(!fe.length, 'keine JS-Fehler', fe);
  await b.close();
})();
