// Aussehen · Rahmen (Alexander 6.10.): Titel und Rahmen sind EIN Ding, Reiter Wappen · Rahmen · Basis · Marsch. Rahmen gibt es nicht
// zu kaufen (kein Preis, Tippen kauft nichts) – nur Saison-Rahmen (Platz 1 · 2–3 · 4–5 · 6–10) und die aus der Mitte (gehen vor). Vorher
// gekaufte Rahmen oder Titel bleiben und lassen sich anlegen. openLookSheet('title') öffnet „Rahmen“ und rollt zu den Saison-Rahmen.
// Mitspieler kaufen keine Rahmen mehr, der Thron-Shop hat keinen. Handy + Desktop, nichts ragt seitlich heraus. Bilder in den
// Arbeitsordner (process.argv[3]), wenn angegeben.
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
      const warte = ms => new Promise(f => setTimeout(f, ms)), sh = document.getElementById('lookSheet'), o = {}, pane = () => document.getElementById('lkPane');
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1); gems = 1e6; updateHud();
      look.frames = []; look.titles = []; look.frame = 'bronze'; delete look.bought; look.lookMig = 1; saveLook();
      openLookSheet('frame'); await warte(300);
      const tabs = [...document.querySelectorAll('#lkTabs [data-lk-tab]')], tr = tabs.map(t => t.getBoundingClientRect());
      o.reiter = { namen: tabs.map(t => t.textContent.trim()), aktiv: (document.querySelector('#lkTabs .active') || {}).textContent, eineZeile: tr.every(q => Math.abs(q.top - tr[0].top) < 2),
        ganz: tabs.every(t => t.scrollWidth <= t.clientWidth + 1) };
      // 1) neu: nur „Neuling“, Saison-Rahmen mit Platz statt Preis, nichts zu kaufen
      const P = pane(), g0 = gems;
      o.neu = { dein: [...P.querySelectorAll('.lk-grid')[0].querySelectorAll('[data-lk]')].map(x => x.dataset.lk), hs: [...P.querySelectorAll('.keep-h')].map(h => h.textContent),
        sz: [...P.querySelectorAll('[data-lk^="frame:sz"]')].map(x => x.querySelector('small').textContent), preis: P.innerHTML.includes('#i-gem'),
        seitlich: sh.scrollWidth <= sh.clientWidth + 1 };
      P.querySelector('[data-lk="frame:sz1"]').click(); lkBuy('frame', 'gold'); lkBuy('title', 'lord');
      o.neu.kauf = { gems: gems === g0, sz1: lkHas('frame', 'sz1'), gold: lkHas('frame', 'gold'), traegt: playerTitle() };
      // 2) gekauft (alter Spielstand): Goldfürst-Rahmen + Titel „Eroberer“ bleiben – beide anlegen, kostet nichts
      look.frames = ['gold']; look.titles = ['conq']; saveLook(); renderLookSheet(); await warte(100);
      pane().querySelector('[data-lk="frame:conq"]').click(); await warte(100);
      o.alt = { liste: [...pane().querySelectorAll('.lk-grid')[0].querySelectorAll('[data-lk]')].map(x => x.dataset.lk), titel: playerTitle(), rahmen: playerFrame(), gems: gems === g0,
        an: !!pane().querySelector('.lk-card.on[data-lk="frame:conq"]') };
      // 3) Mitte geht vor (Titel aus der Mitte: Rahmen in Gold / Rot), danach wieder der eigene
      const T = loadTitles(), gut = TITLES.find(x => x.good), straf = TITLES.find(x => !x.good);
      T.by[gut.key] = 'player'; saveTitles(); const m1 = { titel: playerTitle(), rahmen: playerFrame() };
      delete T.by[gut.key]; T.by[straf.key] = 'player'; saveTitles(); const m2 = { titel: playerTitle(), rahmen: playerFrame() };
      delete T.by[straf.key]; saveTitles(); o.mitte = { gut: m1, gutName: gut.name, straf: m2, strafName: straf.name, danach: playerTitle() };
      // 4) Saison: Platz 2 in der letzten Saison → „Saison-Großadmiral“ zum Anlegen
      if (!saison) saisonTakt(); const s0 = saison && saison.last; if (saison) { saison.last = { nr: 1, top: [['bot_x', 9], ['player', 8]] }; }
      renderLookSheet(); await warte(100); const k2 = pane().querySelector('[data-lk="frame:sz2"]'); k2.click(); await warte(100);
      o.saison = { da: !!saison, titel: playerTitle(), rahmen: playerFrame(), sz1: lkHas('frame', 'sz1') };
      if (saison) saison.last = s0;
      // 5) aus anderen Stellen: openLookSheet('title') → Reiter „Rahmen“, die Saison-Rahmen sichtbar unter den Reitern
      closeAllPopups(); sh.hidden = true; openLookSheet('title'); await warte(300);
      const tb = document.getElementById('lkTabs').getBoundingClientRect(), tt = document.getElementById('lkTitel').getBoundingClientRect();
      o.sprung = { tab: lkTab, sichtbar: tt.top >= tb.bottom - 1 && tt.top < innerHeight * 0.75, aktiv: (document.querySelector('#lkTabs .active') || {}).dataset.lkTab };
      // 6) Mitspieler kaufen keine Rahmen, der Thron-Shop hat keinen
      const X = BOT_DEFS.find(x => !x.mensch && loadBotState()[x.id]).id, bx = loadBotState()[X], fr0 = JSON.stringify(bx.frames || []), ti0 = JSON.stringify(bx.titles || []);
      bx.gems = 1e7; bx.tp = 1e7; for (let i = 0; i < 20; i++) botThroneShop(X);
      o.bots = { frames: JSON.stringify(bx.frames || []) === fr0, titles: JSON.stringify(bx.titles || []) === ti0, look: botLook(X), thron: THRONE_OFFERS.map(x => x.id).filter(id => id === 'look' || id.startsWith('ring_')) };
      look.frames = ['gold']; look.titles = ['conq']; look.frame = 'conq'; saveLook();
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.reiter.namen.join(' · ') === 'Wappen · Rahmen' && r.reiter.aktiv.trim() === 'Rahmen' && r.reiter.eineZeile && r.reiter.ganz, art + ': nur noch Reiter Wappen · Rahmen (Basis und Marsch raus, Alexander 7.10.), in einer Zeile', r.reiter);
    ok(r.neu.dein.join() === 'frame:bronze' && r.neu.hs.join(' · ') === 'Saison-Rahmen · Aus der Mitte' && r.neu.sz.join(' · ') === 'Platz 1 · Platz 2–3 · Platz 4–5 · Platz 6–10' && !r.neu.preis && r.neu.seitlich,
      art + ': neu: nur „Neuling“, darunter die 4 Saison-Rahmen (Platz statt Preis) und „Aus der Mitte“', r.neu);
    ok(r.neu.kauf.gems && !r.neu.kauf.sz1 && !r.neu.kauf.gold && r.neu.kauf.traegt === 'Neuling', art + ': Rahmen nicht zu kaufen (Tippen und lkBuy kosten nichts, geben nichts)', r.neu.kauf);
    ok(r.alt.liste.join() === 'frame:bronze,frame:gold,frame:conq' && r.alt.titel === 'Eroberer' && r.alt.rahmen === 'conq' && r.alt.gems && r.alt.an, art + ': gekaufte Rahmen/Titel bleiben und lassen sich anlegen (Titel „Eroberer“ = Rahmen)', r.alt);
    ok(r.mitte.gut.titel === r.mitte.gutName && r.mitte.gut.rahmen === 'mgut' && r.mitte.straf.titel === r.mitte.strafName && r.mitte.straf.rahmen === 'mstraf' && r.mitte.danach === 'Eroberer', art + ': Titel aus der Mitte geht vor (mit Rahmen Gold/Rot), danach wieder der eigene', r.mitte);
    ok(r.saison.da && r.saison.titel === 'Saison-Großadmiral' && r.saison.rahmen === 'sz2' && !r.saison.sz1, art + ': Saison Platz 2 → „Saison-Großadmiral“ anlegen (Platz 1 nicht)', r.saison);
    ok(r.sprung.tab === 'frame' && r.sprung.aktiv === 'frame' && r.sprung.sichtbar, art + ': openLookSheet(\'title\') öffnet „Rahmen“ bei den Saison-Rahmen', r.sprung);
    ok(r.bots.frames && r.bots.titles && !r.bots.thron.length && r.bots.look.frame && r.bots.look.title, art + ': Mitspieler kaufen keine Rahmen, Thron-Shop ohne Rahmen', r.bots);
    await p.evaluate(() => { closeAllPopups(); openLookSheet('frame'); }); await p.waitForTimeout(300); await bild('aussehen_rahmen');
    await p.evaluate(() => { openLookSheet('title'); }); await p.waitForTimeout(300); await bild('aussehen_saison');
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
