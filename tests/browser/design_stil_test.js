// Designer-Gesamtblick 6.10. (Einheitlichkeit): Schriften Cinzel/Inter selbst ausgeliefert (kein Google-Aufruf, Lizenz dabei),
// Edelstein/Münze überall gleiche Farbe (HUD, Reiter, Gold-Knopf, Marsch-Knopf), Umlaut-Platz in Reitern/Overlines,
// Unter-Chips nicht größer als die Hauptreiter, Platzhalter ruhig (400), gesperrter Knopf mit --tx-3.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const VB = path.resolve(process.argv[2]), GAME = path.resolve(__dirname, '../../Game');
// 1) Dateien: Schrift + Lizenz da, Startseite/Spielseite/Sicherheitsregel ohne Google Fonts
for (const f of ['cinzel.woff2', 'inter.woff2', 'schrift.css', 'OFL-Cinzel.txt', 'OFL-Inter.txt']) ok(fs.existsSync(path.join(GAME, 'schrift', f)), 'Game/schrift/' + f + ' vorhanden');
ok(/SIL Open Font License/.test(fs.readFileSync(path.join(GAME, 'schrift/OFL-Cinzel.txt'), 'utf8')), 'Cinzel-Lizenz ist die OFL');
for (const f of ['index.php', 'spiel.php', 'server.php']) { const t = fs.readFileSync(path.join(GAME, f), 'utf8'); ok(!/fonts\.(googleapis|gstatic)\.com\/(css|s\/)|style-src[^;]*googleapis|font-src[^;]*gstatic/.test(t), f + ': kein Google-Fonts-Aufruf'); }
for (const f of ['index.php', 'spiel.php']) ok(fs.readFileSync(path.join(GAME, f), 'utf8').includes('schrift/schrift.css'), f + ' lädt schrift/schrift.css');
const typ = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(VB, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typ[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1'] }); const fe = [], fremd = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const p = await (await b.newContext(opt)).newPage(); p.on('pageerror', e => fe.push(e.message));
    p.on('request', q => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(q.url())) fremd.push(q.url()); });
    await p.goto('http://127.0.0.1:' + srv.address().port + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof openGoals === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2500);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), cs = (e, pe) => getComputedStyle(e, pe);
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      document.getElementById('anleitung').hidden = true; closeAllPopups();
      await document.fonts.ready;
      const schrift = { cinzel: document.fonts.check('600 17px Cinzel'), inter: document.fonts.check('400 13px Inter'),
        geladen: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')) };
      // Edelstein-Farbe an verschiedenen Stellen (Farbe des <use>, daraus currentColor im Symbol)
      const gemSoll = cs(document.documentElement).getPropertyValue('--res-gem').trim(), farbe = sel => { const u = document.querySelector(sel); return u ? cs(u).color : null; };
      const gem = { hud: farbe('.res--gem use[href="#i-gem"]'), shopReiter: farbe('#shopTabs .tab.active use[href="#i-gem"]') };
      const k = document.createElement('div'); k.innerHTML = '<button class="btn btn--primary" type="button">' + icon('gem') + '<span>500</span></button><button class="ach-claim" type="button">' + icon('gem') + '5</button>'
        + '<span class="mact"><button type="button">Schneller · <b>3</b>' + icon('gem') + '</button></span><button class="btn btn--primary" type="button">' + icon('coin') + '</button>';
      document.getElementById('goalsPopup').appendChild(k);
      gem.goldKnopf = cs(k.querySelector('.btn--primary use')).color; gem.erfolg = cs(k.querySelector('.ach-claim use')).color; gem.marsch = cs(k.querySelector('.mact use')).color;
      const muenze = cs(k.querySelector('use[href="#i-coin"]')).color; k.remove();
      // Reiter/Chips: Umlaut-Platz, Chips nicht größer als die Hauptreiter
      openGoals(); await warte(300); document.querySelector('#goalsGruppen [data-ggrp="aufgaben"]').click(); await warte(300);
      const tab = document.querySelector('#goalsGruppen .tab.active'), ts = tab.querySelector('span'), chip = [...document.querySelectorAll('#goalsTabs .p5-chip')].find(c => c.offsetParent);
      const lh = e => parseFloat(cs(e).lineHeight) / parseFloat(cs(e).fontSize);
      const ov = document.querySelector('#goalsPopup .overline');
      const reiter = { tabLh: lh(ts), overLh: lh(ov), chipH: chip.getBoundingClientRect().height, tabH: tab.getBoundingClientRect().height, chipFs: parseFloat(cs(chip).fontSize), tabFs: parseFloat(cs(tab).fontSize) };
      // Platzhalter + gesperrter Knopf
      const inp = document.createElement('input'); inp.placeholder = '3–20 Buchstaben'; inp.style.fontSize = '22px'; inp.style.fontWeight = '700'; document.body.appendChild(inp);
      const ph = { gewicht: cs(inp, '::placeholder').fontWeight, groesse: parseFloat(cs(inp, '::placeholder').fontSize) }; inp.remove();
      const bt = document.createElement('button'); bt.className = 'btn btn--primary'; bt.disabled = true; bt.textContent = 'Fehlt'; document.body.appendChild(bt);
      const gesperrt = cs(bt).color, tx3 = (() => { const s = document.createElement('i'); s.style.color = 'var(--tx-3)'; document.body.appendChild(s); const c = cs(s).color; s.remove(); return c; })(); bt.remove();
      const gs = document.createElement('i'); gs.style.color = gemSoll; document.body.appendChild(gs); const gemRgb = cs(gs).color; gs.style.color = 'var(--res-coin)'; const coinRgb = cs(gs).color; gs.remove();
      closeAllPopups();
      return { schrift, gem, gemRgb, muenze, coinRgb, reiter, ph, gesperrt, tx3 };
    });
    ok(r.schrift.cinzel && r.schrift.inter && r.schrift.geladen.includes('Cinzel') && r.schrift.geladen.includes('Inter'), art + ': Cinzel + Inter aus Game/schrift geladen', r.schrift.geladen);
    ok(Object.values(r.gem).every(c => c === r.gemRgb), art + ': Edelstein überall ' + r.gemRgb + ' (HUD, Shop-Reiter, Gold-Knopf, Erfolg, Marsch)', r.gem);
    ok(r.muenze === r.coinRgb, art + ': Münze auf Gold-Knopf in Münzfarbe', r.muenze);
    ok(r.reiter.tabLh >= 1.34 && r.reiter.overLh >= 1.34, art + ': Reiter/Overline mit Platz für Umlaut-Punkte', r.reiter);
    ok(r.reiter.chipH > 0 && r.reiter.chipH <= r.reiter.tabH && r.reiter.chipH <= 37 && r.reiter.chipFs <= Math.max(12, r.reiter.tabFs), art + ': Unter-Chips nicht größer als Hauptreiter', r.reiter);
    ok(r.ph.gewicht === '400' && r.ph.groesse <= 15, art + ': Platzhalter normal und nicht groß', r.ph);
    ok(r.gesperrt === r.tx3, art + ': gesperrter Knopf in --tx-3', [r.gesperrt, r.tx3]);
  }
  ok(!fremd.length, 'keine fremden Aufrufe (Google Fonts)', fremd.slice(0, 5));
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 5));
  await b.close(); srv.close();
});
