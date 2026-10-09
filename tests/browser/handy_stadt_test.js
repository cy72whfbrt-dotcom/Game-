// Stadt, Helden und Gems-Käufe (Spieltest 5.10.): Gems ab 500 (auch Beschleunigen, Forschung) und Helden-Zurücksetzen erst nach „Wirklich?“ (zweiter Tipp nach
// >450 ms, binnen 4 s), übrige Splitter eines Helden mit 5 Sternen 1:1 umtauschen, Bauzeit kompakt („1 T“), Krankenhaus „Nächste
// Stufe“ mit Forschung, Heldenhalle ungebaut ohne Reiter. Handy + Desktop: Rohstoff-Liste geht beim Öffnen eines Fensters zu, Profil-
// Reiter und Kisten-Zeile ganz. Bilder (Stadt, Burg, Shop, Profil, Helden) in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof gemsWirklich === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png') }); };
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), ganz = e => !!e && e.scrollWidth <= e.clientWidth + 1;
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1); coins = 1e13; gems = 1e7; updateHud();
      const o = {};
      // 1) Rohstoff-Liste: auf, dann den Shop öffnen → zu
      document.getElementById('hudRoh').click(); await warte(200); const auf = !document.getElementById('rohDrop').hidden;
      document.getElementById('shopBtn').click(); await warte(400); o.roh = { auf, zuNachFenster: document.getElementById('rohDrop').hidden };
      document.querySelector('#shopPopup [data-sinfo="kiste"]').click(); await warte(100);   // Chancen liegen hinter „i“
      const rar = document.querySelector('#shopPopup .chip--rar'), box = rar && rar.parentElement.getBoundingClientRect(), rr = rar && rar.getBoundingClientRect();
      o.rar = rar ? { drin: rr.right <= box.right + 1 && rr.right <= innerWidth, ganz: ganz(rar), oben: parseFloat(getComputedStyle(rar).paddingTop) >= 3, hoch: rr.height >= rar.scrollHeight - 1 } : null;
      // 3) Helden: Zurücksetzen fragt (200 Gems), Splitter tauschen
      { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); }   // Helden erst mit Heldenhalle (Merkliste 21)
      const H = loadHeroes(), [a, z] = HEROES.slice(0, 2).map(h => h.id);
      Object.assign(H[a], { own: true, q: HERO_MAXQ, sh: 30, sk: [2, 0, 0, 0] }); Object.assign(H[z], { own: false, q: 0, sh: 1 }); saveHeroes();
      const vorher = heroDoSwap('player', z, a, 1);
      openHeroHall(a); await warte(300);
      const rs = document.querySelector('[data-hh-reset]'), g2 = gems; let U = Date.now(); const echt2 = Date.now; Date.now = () => U;
      rs.click(); const rsFrage = document.querySelector('[data-hh-reset]').textContent, rsNicht = heroSt('player', a).sk[0] === 2 && gems === g2;
      U += 600; document.querySelector('[data-hh-reset]').click(); Date.now = echt2;   // gleich prüfen (ohne Pause: kein anderer Takt dazwischen)
      o.reset = { frage: /Wirklich\?/.test(rsFrage), rsNicht, zurueck: heroSt('player', a).sk[0] === 0 && g2 - gems === HERO_RESET_GEMS };
      const sel = document.querySelector('[data-hh-swap-to]'), a0 = heroSt('player', a).sh, z0 = heroSt('player', z).sh, g3 = gems; sel.value = z; document.querySelector('[data-hh-swap]').click();
      o.swap = { vorherNein: !vorher, a: heroSt('player', a).sh, dazu: heroSt('player', z).sh - z0 === a0 && a0 > 0, gems: gems === g3, zielOhneMax: ![...sel.options].some(x => x.value === a) };
      await (async () => { const s = heroSt('player', a); s.sh = 5; saveHeroes(); renderHeroHall(); await warte(200); })();
      o.helden = document.getElementById('heroHall').scrollHeight > 0;
      closeHeroHall();
      // 4) Späher beschleunigen (1 Gem/Min.): 600 Gems erst nach „Wirklich?“ – die Nachfrage übersteht das Neuzeichnen der Liste; 100 Gems sofort
      const echt3 = Date.now; let V = echt3.call(Date) + 5000; Date.now = () => V;
      const ziel = islands.find(i => i.id !== playerIslandId).id, gross = { sourceId: playerIslandId, targetId: ziel, startedAt: V - 1000, resolveAt: V + 600 * 60000 - 1 },
        klein = { sourceId: playerIslandId, targetId: ziel, startedAt: V - 2000, resolveAt: V + 100 * 60000 - 1 };
      pendingScouts.push(gross, klein); renderActiveMarches();
      const sp = m => activeMarchesEl.querySelector('[data-mact="speed"][data-k="' + marchKeyOf(m) + '"]'), g4 = gems, r0 = gross.resolveAt;
      sp(gross).click(); const mFrage = sp(gross).textContent, mNicht = gems === g4 && gross.resolveAt === r0;
      renderActiveMarches(); const mNeu = sp(gross).textContent;          // neu gezeichnet: der Knopf fragt weiter
      V += 700; sp(gross).click(); const mBezahlt = g4 - gems === 600 && gross.resolveAt < r0;
      V += 700; const g5 = gems; sp(klein).click(); const mKlein = g5 - gems === 100;
      Date.now = echt3; pendingScouts.splice(pendingScouts.indexOf(gross), 1); pendingScouts.splice(pendingScouts.indexOf(klein), 1); renderActiveMarches();
      o.marsch = { frage: /Wirklich\?/.test(mFrage) && /600/.test(mFrage), mNicht, neu: /Wirklich\?/.test(mNeu), mBezahlt, mKlein };
      // 5) Forschung mit Gems fertig: 600 Gems erst nach „Wirklich?“, 100 Gems sofort
      const fid = Object.keys(FO_BY)[0], C = loadCity(), sheet = document.getElementById('citySheet'), knopf = document.createElement('button');
      knopf.type = 'button'; knopf.dataset.foGems = ''; knopf.textContent = 'Fertig'; sheet.appendChild(knopf);
      let W = echt3.call(Date) + 5000; Date.now = () => W;
      C.foRun = { id: fid, to: 1, startedAt: W - 1000, endsAt: W + 600 * 60000 - 1 }; saveCity();
      const g6 = gems; knopf.click(); const fFrage = knopf.textContent, fNicht = gems === g6 && !!loadCity().foRun;
      W += 700; knopf.click(); const fBezahlt = g6 - gems === 600 && !loadCity().foRun;
      const C2 = loadCity(); C2.foRun = { id: fid, to: 1, startedAt: W - 1000, endsAt: W + 100 * 60000 - 1 }; saveCity();
      W += 700; const g7 = gems; knopf.click(); const fKlein = g7 - gems === 100 && !loadCity().foRun;
      Date.now = echt3; knopf.remove();
      o.forschung = { frage: /Wirklich\?/.test(fFrage), fNicht, fBezahlt, fKlein };
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.roh.auf && r.roh.zuNachFenster, art + ': Rohstoff-Liste geht beim Öffnen eines Fensters zu', r.roh);
    ok(r.rar && r.rar.drin && r.rar.oben && r.rar.hoch, art + ': Kisten-Zeile „Legendär + Mythisch …“ ragt nicht heraus (Innenabstand oben/unten)', r.rar);
    ok(r.reset.frage && r.reset.rsNicht && r.reset.zurueck, art + ': Helden-Zurücksetzen erst nach „Wirklich?“', r.reset);
    ok(r.swap.vorherNein && r.swap.a === 0 && r.swap.dazu && r.swap.gems && r.swap.zielOhneMax, art + ': übrige Splitter 1:1 umgetauscht (nur vom 5-Sterne-Helden, keine Gems)', r.swap);
    ok(r.marsch.frage && r.marsch.mNicht && r.marsch.neu && r.marsch.mBezahlt && r.marsch.mKlein, art + ': Späher beschleunigen 600 Gems erst nach „Wirklich?“ (bleibt beim Neuzeichnen), 100 Gems sofort', r.marsch);
    ok(r.forschung.frage && r.forschung.fNicht && r.forschung.fBezahlt && r.forschung.fKlein, art + ': Forschung mit Gems 600 erst nach „Wirklich?“, 100 sofort', r.forschung);
    await bild('helden');
    const s = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), ganz = e => !!e && e.scrollWidth <= e.clientWidth + 1;
      closeHeroHall(); closeAllPopups();
      document.getElementById('profileBtn').click(); await warte(400);
      const tabs = [...document.querySelectorAll('#profileTabs .tab span')].map(e => [e.textContent, ganz(e)]);
      return { tabs };
    });
    ok(s.tabs.every(([, g]) => g), art + ': Profil-Reiter ganz (auch „Einstellungen“)', s.tabs);
    await bild('profil');
    const c = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms));
      closeAllPopups();
      const kurz = [fmtDuration(86400), fmtDuration(86400 + 60), fmtDuration(90061), fmtDuration(0)];
      const L = AUF.lazarettPlus; AUF.lazarettPlus = () => 10; const krank = cityEffectText('hospital', 2); AUF.lazarettPlus = L;
      const city = loadCity(); city.levels.heroes = 0; saveCity();
      const reiter = cityNutz('heroes', 0) === null && !!cityNutz('heroes', 1);
      openCity(); await warte(1200); cityOpenId = 'heroes'; cityPage = 'bau'; renderCitySheet(); await warte(300);
      const tabsZu = document.getElementById('cityTabs').hidden;
      const prozent = ['heroes', 'wall', 'academy', 'hospital'].map(id => cityEffectText(id, 2)).every(t => !/\d %/.test(t) && /\d\u00a0%/.test(t));   // „+3 %“ bricht nie um
      cityOpenId = null; document.getElementById('citySheet').hidden = true; updateCityBuilder();
      flashHint('Der Drache ist erschienen! Urdrache Vharak kreist über dem Thron – nur alle zusammen können ihn besiegen.', 5000, true); await warte(400);
      const hb = document.getElementById('hint').getBoundingClientRect(), kb = document.getElementById('cityBuilder').getBoundingClientRect();
      const hinweis = { frei: hb.top >= kb.bottom + 4 || hb.left >= kb.right + 4 || hb.right <= kb.left - 4, hint: Math.round(hb.top), knoepfe: Math.round(kb.bottom) };
      const kn = document.querySelector('#cityBuilder [data-cb-auf]'), bau = { zahl: kn && kn.textContent, liste: !!document.querySelector('#cityBuilder .cb-liste') };
      kn.click(); bau.auf = !!document.querySelector('#cityBuilder .cb-liste .cb-slot'); kn.click();
      cityOpenId = 'heroes'; renderCitySheet(); bau.zuMitFenster = document.getElementById('cityBuilder').getBoundingClientRect().height === 0;
      cityOpenId = null; document.getElementById('citySheet').hidden = true;
      flashHint('', 1); cityOpenId = 'heroes'; renderCitySheet(); await warte(200);
      return { kurz, krank, reiter, tabsZu, prozent, hinweis, bau };
    });
    ok(/^\d\/[12]$/.test(c.bau.zahl) && !c.bau.liste && c.bau.auf && c.bau.zuMitFenster, art + ': Bauarbeiter seitlich als Hammer „frei/alle“, Antippen klappt auf, bei offenem Fenster weg', c.bau);
    ok(c.kurz.join('|') === '1 T|1 T 1 m|1 T 1 h 1 m 1 s|0 s', art + ': Bauzeit kompakt ohne Nullen', c.kurz);
    ok(/Nächste Stufe: 25\u00a0%/.test(c.krank), art + ': Krankenhaus „Nächste Stufe“ mit Forschung (15 + 10 %)', c.krank);
    ok(c.reiter && c.tabsZu, art + ': Heldenhalle ungebaut ohne Reiter', c);
    ok(c.prozent, art + ': Gebäude-Wirkung „+3 %“ mit festem Leerzeichen (kein Umbruch vor „%“)');
    ok(c.hinweis.frei, art + ': Stadt: Hinweis liegt unter den Bauarbeiter-Knöpfen (nie darüber)', c.hinweis);
    await bild('heldenhalle');
    await p.evaluate(async () => { cityOpenId = '_keep'; cityPage = 'bau'; renderCitySheet(); await new Promise(f => setTimeout(f, 400)); });
    await bild('burg');
    await p.evaluate(async () => { cityOpenId = null; document.getElementById('citySheet').hidden = true; await new Promise(f => setTimeout(f, 600)); });
    await bild('stadt');
    await p.evaluate(async () => { closeCity && closeCity(); openShop('gems'); await new Promise(f => setTimeout(f, 500)); });
    await bild('shop');
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
