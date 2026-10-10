// Kleines Handy (360×640): nichts abgeschnitten (Spieltest 8.10.) – Events-Kopf („0 / 6 heute“ ganz), Invasions-Chip in der
// Karten-Leiste (Welle lesbar), Pass: Premium-Reihe ganz im Fenster. Dazu 390×844 und Desktop, damit dort nichts schlechter wird.
// Fotos: OW_FOTO=<ordner> legt je Größe ein Bild vom Pass ab.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], foto = process.env.OW_FOTO;
  for (const [art, opt] of [['Handy 360', { ...devices['iPhone 13'], viewport: { width: 360, height: 640 } }], ['Handy 390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.addInitScript(() => { const D = Date, d = D.UTC(2026, 9, 7, 10) - D.now(); Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + d])); } static now() { return D.now() + d; } }; });   // Uhr auf einen Mittwoch: das Wochen-Event läuft (am Wochenende ist es vorbei)
    await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof evChips === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), ganz = e => !!e && e.scrollWidth <= e.clientWidth + 1;
      const drin = (e, box) => { const a = e.getBoundingClientRect(), c = box.getBoundingClientRect(); return a.left >= c.left - 1 && a.right <= c.right + 1 && a.top >= c.top - 1 && a.bottom <= c.bottom + 1; };
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1);
      // 1) Karten-Leiste: Wochen-Event (Fr · Helden-Tag) – der Chip zeigt den Namen ganz (kein „…“)
      const altH = woHeute; woHeute = () => WO_TAGE[4];
      updateHud(); await warte(1500);
      const chip = document.querySelector('#midBar [data-mb="woche"]'), span = chip && chip.querySelector('span');
      const inv = { da: !!chip, text: span && span.textContent, ganz: ganz(span), imBild: !!chip && drin(chip, document.documentElement) };
      woHeute = altH;
      // 2) Events-Kopf: beide Marken ganz im Kopf
      openGoals('pass'); await warte(800);
      const sub = document.getElementById('goalsSub'), pills = [...sub.querySelectorAll('.pill')];
      const kopf = { texte: pills.map(e => e.textContent), ganz: pills.every(e => ganz(e) && drin(e, sub)) };
      // 3) Pass: Premium-Reihe ganz im sichtbaren Teil des Fensters
      const prem = document.querySelector('#passPane .pass-prem'), body = prem && prem.closest('.pbody');
      const pass = { da: !!prem, ganz: !!prem && drin(prem, body) && [...prem.querySelectorAll('b,small')].every(e => e.scrollHeight <= e.clientHeight + 1) };
      return { inv, kopf, pass };
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    if (foto) await p.screenshot({ path: foto + '/pass_' + art.replace(/ /g, '') + '.png' });
    ok(r.inv.da && /Helden-Tag/.test(r.inv.text) && r.inv.ganz && r.inv.imBild, art + ': Wochen-Event-Chip – Name ganz lesbar', r.inv);
    ok(r.kopf.texte.length === 2 && r.kopf.ganz, art + ': Events-Kopf – „… heute“ und „Erfolge“ ganz', r.kopf);
    ok(r.pass.da && r.pass.ganz, art + ': Pass – Premium-Reihe ganz sichtbar', r.pass);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
