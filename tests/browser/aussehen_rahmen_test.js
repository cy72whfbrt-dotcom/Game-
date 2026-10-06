// Aussehen (Alexander 6.10.): Rahmen und Titel in EINEM Reiter „Rahmen“ – Reiter Wappen · Rahmen · Basis · Marsch, erst die Rahmen,
// darunter Titel aus der Mitte, Deine Titel, Titel zu kaufen. openLookSheet('title') öffnet „Rahmen“ und rollt zu den Titeln.
// Käufe wie vorher: ab 500 Edelsteinen erst nach „Wirklich?“, darunter sofort; Titel anlegen per Tipp. Handy + Desktop, nichts ragt
// seitlich heraus. Bilder in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof openLookSheet === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png') }); };
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), sh = document.getElementById('lookSheet'), o = {};
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1); gems = 1e6; updateHud();
      openLookSheet('frame'); await warte(300);
      const tabs = [...document.querySelectorAll('#lkTabs [data-lk-tab]')], pane = document.getElementById('lkPane'), tr = tabs.map(t => t.getBoundingClientRect());
      o.reiter = { namen: tabs.map(t => t.textContent.trim()), aktiv: (document.querySelector('#lkTabs .active') || {}).textContent, eineZeile: tr.every(q => Math.abs(q.top - tr[0].top) < 2),
        breit: tr.every(q => q.width > 50), ganz: tabs.every(t => t.scrollWidth <= t.clientWidth + 1) };
      const hs = [...pane.querySelectorAll('.keep-h')].map(h => h.textContent), rahmen = pane.querySelector('[data-lk^="frame:"]'), titel = document.getElementById('lkTitel');
      o.inhalt = { hs, rahmenZuerst: !!rahmen && !!titel && !!(rahmen.compareDocumentPosition(titel) & Node.DOCUMENT_POSITION_FOLLOWING),
        rahmen: pane.querySelectorAll('[data-lk^="frame:"]').length, titel: pane.querySelectorAll('[data-lk^="title:"]').length, mitte: !!pane.querySelector('.lk-mid'),
        seitlich: sh.scrollWidth <= sh.clientWidth + 1 };
      // aus anderen Stellen: openLookSheet('title') → Reiter „Rahmen“, die Titel stehen sichtbar unter den Reitern
      closeAllPopups(); sh.hidden = true; openLookSheet('title'); await warte(300);
      const tb = document.getElementById('lkTabs').getBoundingClientRect(), tt = document.getElementById('lkTitel').getBoundingClientRect();
      o.sprung = { tab: lkTab, gerollt: sh.scrollTop, sichtbar: tt.top >= tb.bottom - 1 && tt.top < innerHeight * 0.75, aktiv: (document.querySelector('#lkTabs .active') || {}).dataset.lkTab };
      // kaufen: 1.000 erst nach „Wirklich?“ (eigene Uhr), 200 sofort, danach anlegen per Tipp
      const echt = Date.now; let T = echt.call(Date); Date.now = () => T;
      const g0 = gems, k1 = document.querySelector('[data-lk="title:duke"]'); k1.click(); const frage = (document.querySelector('[data-lk="title:duke"]') || k1).textContent;
      const nicht = gems === g0 && !lkHas('title', 'duke');
      T += 600; document.querySelector('[data-lk="title:duke"]').click(); Date.now = echt;
      o.gross = { frage: /Wirklich\?/.test(frage), nicht, gekauft: lkHas('title', 'duke') && g0 - gems === 1000, traegt: playerTitle() === 'Diamantherzog' };
      const g1 = gems; document.querySelector('[data-lk="title:knight"]').click(); await warte(100);
      o.klein = { hat: lkHas('title', 'knight'), weg: g1 - gems, titel: playerTitle() };
      document.querySelector('.look-titles [data-lk="title:duke"]').click(); await warte(100);
      o.anlegen = { titel: playerTitle(), an: !!document.querySelector('.look-titles .look-title.on[data-lk="title:duke"]'), tab: lkTab, gems: g1 - gems };
      sh.scrollTop = 0; return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.reiter.namen.join(' · ') === 'Wappen · Rahmen · Basis · Marsch' && r.reiter.aktiv.trim() === 'Rahmen' && r.reiter.eineZeile && r.reiter.breit && r.reiter.ganz, art + ': Reiter Wappen · Rahmen · Basis · Marsch (kein „Titel“ mehr), in einer Zeile', r.reiter);
    ok(r.inhalt.rahmenZuerst && r.inhalt.rahmen >= 9 && r.inhalt.titel >= 10 && r.inhalt.mitte && r.inhalt.seitlich && ['Titel aus der Mitte', 'Deine Titel', 'Titel zu kaufen'].every(h => r.inhalt.hs.includes(h)), art + ': Reiter „Rahmen“: erst die Rahmen, darunter die Titel-Abschnitte', r.inhalt);
    ok(r.sprung.tab === 'frame' && r.sprung.aktiv === 'frame' && r.sprung.sichtbar, art + ': openLookSheet(\'title\') öffnet „Rahmen“ und rollt zu den Titeln', r.sprung);
    ok(r.gross.frage && r.gross.nicht && r.gross.gekauft && r.gross.traegt, art + ': Titel für 1.000 Edelsteine erst nach „Wirklich?“', r.gross);
    ok(r.klein.hat && r.klein.weg === 200 && r.klein.titel === 'Silberritter', art + ': Titel für 200 Edelsteine sofort gekauft und angelegt', r.klein);
    ok(r.anlegen.titel === 'Diamantherzog' && r.anlegen.an && r.anlegen.tab === 'frame' && r.anlegen.gems === r.klein.weg, art + ': eigenen Titel per Tipp anlegen (kostet nichts, bleibt im Reiter „Rahmen“)', r.anlegen);
    await bild('aussehen_rahmen');
    await p.evaluate(() => { openLookSheet('title'); });
    await p.waitForTimeout(300); await bild('aussehen_titel');
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
