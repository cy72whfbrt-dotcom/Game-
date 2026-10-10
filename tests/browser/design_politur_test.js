// Politur nach der Designer-Prüfung (6.10., nur Anzeige): Burg-Schutz in „Münzen“ und glatt (10.000 statt 10.001), Fuß-Knopf nennt
// ALLE fehlenden Rohstoffe, Rohstoffe pro Stunde ganze Zahlen (ungebauter Holzfäller „Jetzt –“), Wochen-Event: Titel nur das Thema,
// „18 Punkte je 10 besiegte Krieger“, ohne Platz kein „– ·“, leere Top 10 / Bündnis-Liste / Märsche mit Symbol (+ Gold-Knopf),
// Bündnis-Kopf ohne „Bündnis / Bündnis“, Ereignis-Chips ganz im Bild, Kistennamen nicht abgeschnitten, Shop-Reiter Desktop ≥ 12 px,
// Karten-Knöpfe nicht unter dem breiten Desktop-Shop.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const VB = path.resolve(process.argv[2]);
const typ = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(VB, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typ[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const p = await (await b.newContext(opt)).newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('http://127.0.0.1:' + srv.address().port + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof AUF !== 'undefined' && AUF && typeof bundOeffnen === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {}, txt = el => el ? el.textContent : '';
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); await document.fonts.ready;
      // 1) Stadt: Burg – Schutz, Fuß-Knopf; Holzfäller ungebaut
      cityShow(); await warte(300); const C = loadCity(); C.builds = []; C.levels.lumber = 0; C.levels.keep = 1;
      coins = 0; Object.assign(AUF.rohVon('player'), { h: 0, s: 0, e: 0 });
      cityPage = 'bau'; cityOpenId = '_keep'; renderCitySheet();
      const up = document.getElementById('cityUpgradeBtn'), extra = txt(document.getElementById('cityBExtra'));
      o.burg = { alle: up.querySelector('.lbl').textContent, schutz: (extra.match(/Schutz[^·]*·[^F]*/) || [''])[0] };
      coins = 1e12; Object.assign(AUF.rohVon('player'), { h: 0, s: 1e9, e: 1e9 }); renderCitySheet(); o.burg.eins = up.querySelector('.lbl').textContent;
      o.burg.gold = /Gold/.test(extra + txt(document.getElementById('cityBDesc')));
      cityOpenId = 'lumber'; renderCitySheet();
      const vgl = document.querySelector('#cityBNote .vgl'); o.holz = vgl ? [...vgl.querySelectorAll('.vgl-z')].map(z => [...z.children].map(c => c.textContent)) : null;
      rohUmschalten(true); o.roh = txt(document.getElementById('rohDrop')); rohUmschalten(false);
      document.getElementById('citySheet').hidden = true; cityOpenId = null; cityView.hidden = true; stadtLeiste(false); closeAllPopups();
      // 2) Wochen-Event
      openGoals('tour'); await warte(250);
      const body = document.getElementById('eventBody');
      o.tour = { titel: txt(body.querySelector('.ev-card.is-tour .barb-ct > b')).trim(), text: body.innerText, leer: !!body.querySelector('.ev-leer .icon') || !!body.querySelector('.barb-rank') };
      const chips = [...document.querySelectorAll('#goalsTabs [data-gtab]:not([hidden])')], box = document.getElementById('goalsTabs').getBoundingClientRect();
      o.chips = chips.map(c => [c.textContent.trim(), Math.round(c.getBoundingClientRect().right) <= Math.round(box.right) + 1]);
      closeAllPopups();
      // 3) Kampf: nichts unterwegs → Symbol + Gold-Knopf, der zur Karte führt
      battleLogBtn.click(); showBattleTab('unterwegs'); renderActiveMarches(); await warte(200);
      const k = document.querySelector('#activeMarches [data-mact="karte"]');
      o.kampf = { leer: !!document.querySelector('#activeMarches .ev-leer .icon'), gold: !!k && k.classList.contains('btn--primary') };
      if (k) { k.click(); await warte(150); o.kampf.zu = !isPanelOpen(battleLogPopup); }
      closeAllPopups();
      // 4) Bündnis ohne Bündnis: Kopf einmal „Bündnis“, leere Liste mit Symbol
      const alt = bund.b; bund.b = {};
      try { bundOeffnen('suchen'); await warte(300);
        const ov = document.querySelector('#bundPopup .phead .overline');
        o.bund = { ov: ov ? getComputedStyle(ov).display : '', titel: txt(document.getElementById('bundTitle')), leer: !!document.querySelector('#bundPopup .bd-liste .ev-leer .icon') };
      } finally { bund.b = alt; }
      closeAllPopups();
      // 5) Shop: Kistennamen nicht abgeschnitten, Reiter-Schrift, Karten-Knöpfe nicht darunter
      openShop('gems'); await warte(300);
      o.shop = { namen: [...document.querySelectorAll('#shopPopup .ware-name')].filter(n => n.offsetParent).map(n => [n.textContent, n.scrollWidth <= n.clientWidth + 1 && n.scrollHeight <= n.clientHeight + 6]),
        reiter: Math.min(...[...document.querySelectorAll('#shopTabs .tab')].map(t => parseFloat(getComputedStyle(t).fontSize))) };
      const mc = document.querySelector('.mapctl'), sp = document.getElementById('shopPopup').getBoundingClientRect(), m = mc.getBoundingClientRect();
      o.shop.knoepfe = getComputedStyle(mc).display === 'none' || m.right <= sp.left || m.bottom <= sp.top;
      closeAllPopups();
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) continue;
    ok(r.burg.alle === 'Fehlt: Münzen, Holz, Stein, Eisen' && /^Fehlt: [\d.]+ Holz$/.test(r.burg.eins), art + ': Fuß-Knopf nennt alle fehlenden (eins: mit Zahl)', r.burg);
    ok(!r.burg.gold && /10\.000 je Rohstoff · 5\.600 Münzen/.test(r.burg.schutz), art + ': Burg-Schutz „10.000 je Rohstoff · 5.600 Münzen“ (glatt, kein „Gold“)', r.burg);
    ok(r.holz && r.holz[0][1] === '–' && /^\d[\d.]*$/.test(r.holz[0][2]), art + ': Holzfäller ungebaut – Jetzt „–“, nächste Stufe ganze Zahl', r.holz);
    ok(!/\d,\d+\/Std/.test(r.roh) && /\/Std\./.test(r.roh) && /Münzen vor Angreifern/.test(r.roh), art + ': Rohstoff-Liste ohne Kommazahlen, Schutz in Münzen', r.roh.slice(-120));
    ok(r.tour.titel && /·/.test(r.tour.titel) && !/Wochen-Event/.test(r.tour.titel), art + ': Wochen-Banner zeigt nur das Thema', r.tour.titel);
    ok(!/\d,\d Punkte pro/.test(r.tour.text) && !/– · \d/.test(r.tour.text) && (/Krieger-Woche/.test(r.tour.titel) ? /18 Punkte je 10 besiegte Krieger/.test(r.tour.text) : true), art + ': Punkte als ganze Zahlen, kein „– ·“', r.tour.text.slice(0, 300));
    ok(r.tour.leer, art + ': Top 10 leer → Symbol + Satz', r.tour.leer);
    ok(r.chips.length === 3 && r.chips.every(c => c[1]), art + ': Ereignis-Chips ganz im Bild', r.chips);
    ok(r.kampf.leer && r.kampf.gold && r.kampf.zu, art + ': Kampf leer – Symbol, Gold-Knopf „Ziel auf der Karte wählen“ schließt das Fenster', r.kampf);
    ok(r.bund.ov === 'none' && r.bund.titel === 'Bündnis' && r.bund.leer, art + ': Bündnis ohne Bündnis – Kopf nicht doppelt, leere Liste mit Symbol', r.bund);
    ok(r.shop.namen.length >= 4 && r.shop.namen.every(n => n[1]), art + ': Kistennamen ganz zu sehen', r.shop.namen);
    ok(art === 'Handy' || r.shop.reiter >= 12, art + ': Shop-Reiter mindestens 12 px', r.shop.reiter);
    ok(r.shop.knoepfe, art + ': Karten-Knöpfe nicht unter dem Shop', r.shop);
  }
  ok(!fe.length, 'keine Seitenfehler', [...new Set(fe)].slice(0, 5));
  await b.close(); srv.close();
});
