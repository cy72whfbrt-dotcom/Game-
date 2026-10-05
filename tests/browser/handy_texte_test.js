// Handy (390×844) und Desktop: nichts abgeschnitten (Spieltest 5.10.) – Truppen in der oberen Leiste („100 Mrd.“ statt „100 Mr…“),
// Saison-Hinweis ganz lesbar und nie über einem offenen Fenster, fremde Basis nach dem Spähen: Name, Marke „Gespäht“ und Knopf „Neu spähen“ ganz.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof saisonBaldText === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), ganz = e => !!e && e.scrollWidth <= e.clientWidth + 1;
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1);
      // 1) obere Leiste: 100 Mrd. Truppen (Münzen/Gems auch groß) – alle drei Werte ganz
      coins = 1e13; gems = 1e7; islandTroops[playerIslandId] = 1e11; updateHud(); await warte(300);
      const leiste = [...document.querySelectorAll('.hud .res b')].slice(0, 3).map(e => [e.textContent, ganz(e)]);
      // 2) Saison-Hinweis: ohne Fenster ganz lesbar (kein „…“), mit offenem Fenster (Events → Boss & Lager) am Handy versteckt
      const h = document.getElementById('hint'), handy = matchMedia('(max-width:899px) and (min-height:501px)').matches;
      flashHint(saisonBaldText(Date.now() + 3 * 864e5), 9000, true); await warte(300);
      const lang = { klasse: h.classList.contains('toast--lang'), ganz: h.scrollHeight <= h.clientHeight + 1, preise: /besten 10/.test(h.textContent), sichtbar: getComputedStyle(h).display !== 'none' };
      openGoals('boss'); await warte(500);
      const mitFenster = getComputedStyle(h).display;
      flashHint('Kurzer Hinweis', 3000); await warte(100);
      const kurz = { klasse: h.classList.contains('toast--lang'), sichtbar: getComputedStyle(h).display !== 'none' };
      closeAllPopups(); flashHint('', 1);
      // 3) fremde Hauptstadt nach dem Spähen
      const home = islandById[playerIslandId], d = x => Math.hypot(islandById[botCapitalOf(x.id)].x - home.x, islandById[botCapitalOf(x.id)].y - home.y);
      const bot = BOT_DEFS.filter(x => !x.mensch && islandById[botCapitalOf(x.id)]).sort((a, c) => d(a) - d(c))[0], isl = botCapitalOf(bot.id);
      scoutedIslands.add(isl); openIslandPopup(islandById[isl]); await warte(600);
      const chip = document.querySelector('#popupSub .chip--scouted'), wer = document.querySelector('#popupSub .psub-who'), knopf = document.querySelector('#scoutBtn .lbl');
      return { leiste, handy, lang, mitFenster, kurz, fremd: { marke: ganz(chip), wer: ganz(wer), werText: wer && wer.textContent, knopf: knopf.textContent, knopfGanz: ganz(knopf) } };
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.leiste.every(([, g]) => g) && /Mrd/.test(r.leiste[2][0]), art + ': obere Leiste – alle Werte ganz (Truppen „100 Mrd.“)', r.leiste);
    ok(r.lang.klasse && r.lang.ganz && r.lang.preise && r.lang.sichtbar, art + ': Saison-Hinweis ganz lesbar (mit den Preisen)', r.lang);
    if (r.handy) ok(r.mitFenster === 'none', art + ': Saison-Hinweis verdeckt kein offenes Fenster', r.mitFenster);
    ok(!r.kurz.klasse && r.kurz.sichtbar, art + ': kurze Hinweise wie bisher', r.kurz);
    ok(r.fremd.marke && r.fremd.wer, art + ': fremde Basis – Name und Marke „Gespäht“ ganz', r.fremd);
    ok(r.fremd.knopf === 'Neu spähen' && r.fremd.knopfGanz, art + ': Knopf „Neu spähen“ ganz', r.fremd);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
