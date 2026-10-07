// Stadt-Feinschliff (Spieltest 7.10.): „Stadt betreten“ ohne Konsolenfehler (Klick-Ereignis kam als „dann“ in openCity),
// Heldenkarte „Freischalten“ mit Kosten und ganz in der Karte, Viertelstern als Tortenstück, Erfolgs-Hinweis am Handy erst
// nach dem Fenster, Burg-Blatt: letzte Karte über dem festen Knopf lesbar, Stadt-Schilder nie unter der unteren Leiste.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(), fe = [];
    p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (m.type() === 'error' && /is not a function/.test(m.text())) fe.push(m.text()); });
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof AUF !== 'undefined' && AUF, null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    // 1) Hauptstadt antippen → „Stadt betreten“ (echter Klick): kein Fehler, die Stadt landet mit Bewegung
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } closeAllPopups(); openIslandPopup(islandById[playerIslandId]); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const k = document.getElementById('cityBtn'); k.hidden = false; k.style.display = ''; k.click(); });
    await p.waitForFunction(() => !cityView.hidden && !cityBusy, null, { timeout: 20000, polling: 100 }).catch(() => {});
    const r1 = await p.evaluate(() => ({ stadt: !cityView.hidden, anim: !!(cityCam && cityCam.anim) || cityPendingAnim }));
    ok(r1.stadt && !fe.length, art + ': „Stadt betreten“ öffnet die Stadt ohne Konsolenfehler', { ...r1, fe: fe.slice(0, 3) });
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      coins = 5e6; updateHud(); await warte(600);
      // 2) Stadt-Schilder: keins unter der unteren Leiste – jedes Gebäude einmal so geschoben, dass sein Schild auf der Leiste säße
      const lr = document.getElementById('cornerButtons').getBoundingClientRect(), W = innerWidth, H = innerHeight; o.schilder = []; o.geprueft = 0;
      cityCam.z = Math.max(1.6, cityZMin(W, H) * 2.5); cityCam.anim = null;
      for (const id of Object.keys(CITY_ORTE)) { const ort = cityOrt(id);
        cityCam.x = ort.x - ((lr.left + lr.right) / 2 - W / 2) / cityCam.z; cityCam.y = ort.sy - (lr.top + 12 - H / 2) / cityCam.z; cityCam.tx = cityCam.ty = undefined;
        cityClampCam(W, H); const sy = H / 2 + (ort.sy - cityCam.y) * cityCam.z, sx = W / 2 + (ort.x - cityCam.x) * cityCam.z;
        if (sy + 18 < lr.top || sy - 18 > lr.bottom || sx < lr.left || sx > lr.right) continue;   // (am Bildrand: dort kommt das Schild nicht hin)
        o.geprueft++; cityFrame.drawn = 0; await warte(350);
        const q = cityNamen.find(n => n.id === id); if (q && q.y + q.h > lr.top && q.x + q.w > lr.left && q.x < lr.right) o.schilder.push(id); }
      // 3) Burg-Blatt ganz nach unten gescrollt: die letzte Karte steht über dem festen Knopf
      cityOpenId = 'keep'; cityPage = 'bau'; loadCity().builds = []; coins = 0; renderCitySheet(); hintEl.textContent = ''; await warte(300);
      const nt = document.querySelector('#cityBNote > span'); nt.textContent = 'Anfängerschutz – noch 1 T 23 h 59 m 48 s (oder bis 100.000 Truppen)';   // (Test-Welt: zu viele Truppen für den echten Schutz – so lang wie dort)
      o.schutz = /Anfängerschutz/.test(document.getElementById('cityBNote').textContent);
      const sh = document.getElementById('citySheet'), fuss = sh.querySelector('.city-bfoot'); sh.scrollTop = 1e6; await warte(300);
      const fr = fuss.getBoundingClientRect(), vor = [...sh.children].filter(e => e !== fuss && e.getBoundingClientRect().height > 0 && getComputedStyle(e).position !== 'sticky');
      const letzte = vor.reduce((a, e) => !a || e.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? e : a, null);
      o.burg = { letzte: letzte && (letzte.id || letzte.className), unten: Math.round(letzte.getBoundingClientRect().bottom), knopf: Math.round(fr.top) };
      o.burg.frei = o.burg.unten <= o.burg.knopf + 1; o.burg.schutz = o.schutz;
      return o; });
    if (process.argv[3]) await p.screenshot({ path: path.join(process.argv[3], 'burg_unten_' + art + '.png') });
    Object.assign(r, await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      cityOpenId = null; document.getElementById('citySheet').hidden = true; coins = 5e6;
      // 4) Heldenkarte „Freischalten“: Kosten drauf, Knopf ganz in der Karte
      const H = loadHeroes(), h = HEROES.find(x => !H[x.id].own); loadCity().levels.heroes = Math.max(1, loadCity().levels.heroes || 0);
      H[h.id].sh = HERO_UNLOCK[h.r]; saveHeroes(); hhSeite = 'helden'; openHeroHall(); await warte(300);
      const fk = document.querySelector('[data-hh-frei="' + h.id + '"]'), karte = fk && fk.closest('.hh-card');
      if (fk) { const a = fk.getBoundingClientRect(), k = karte.getBoundingClientRect();
        o.frei = { text: fk.textContent, kosten: fk.textContent.includes(HERO_UNLOCK[h.r] + ' Splitter'), drin: a.left >= k.left - .5 && a.right <= k.right + .5, inhalt: fk.scrollWidth <= fk.clientWidth + 1 }; }
      // 5) Viertelstern: Füllung als Tortenstück vom Kern aus (kein Streifen am linken Rand)
      const st = document.createElement('div'); st.innerHTML = hhStars(1); document.getElementById('heroHall').appendChild(st);
      o.stern = getComputedStyle(st.querySelector('i')).backgroundImage.slice(0, 40); st.remove();
      // 6) Handy: Erfolgs-Hinweis nicht über dem offenen Fenster – er kommt nach dem Schließen
      const a = ACHIEVEMENTS.find(x => !achClaimed[x.id] && !achDone(x)), ziel = a.goal;
      achKnown = new Set(achClaimable().map(x => x.id)); a.goal = 0;              // (gerade erreicht: neu für achCheck)
      hintEl.textContent = ''; achCheck(); o.hinweisOffen = hintEl.textContent;
      closeHeroHall(); await warte(100); achCheck(); o.hinweisZu = hintEl.textContent; a.goal = ziel; achKnown = null;
      return o;
    }));
    ok(r.geprueft > 0 && !r.schilder.length, art + ': kein Stadt-Schild unter der unteren Leiste', { geprueft: r.geprueft, drunter: r.schilder });
    ok(r.burg.schutz, art + ': Burg-Blatt zeigt die Anfängerschutz-Karte');
    ok(r.burg.frei, art + ': Burg-Blatt ganz unten – letzte Karte über dem festen Knopf', r.burg);
    ok(r.frei && r.frei.kosten && r.frei.drin && r.frei.inhalt, art + ': Heldenkarte „Freischalten“ zeigt Kosten und passt in die Karte', r.frei);
    ok(/conic/.test(r.stern), art + ': Viertelstern als Tortenstück', r.stern);
    if (art === 'Handy') ok(!r.hinweisOffen && /^Erfolg: .+Edelsteine/.test(r.hinweisZu), art + ': Erfolgs-Hinweis erst nach dem Heldenfenster (kurz)', { offen: r.hinweisOffen, zu: r.hinweisZu });
    else ok(/^Erfolg: /.test(r.hinweisOffen), art + ': Erfolgs-Hinweis kommt am Desktop gleich', r.hinweisOffen);
    if (process.argv[3]) { await p.screenshot({ path: path.join(process.argv[3], 'feinschliff_' + art + '.png') });
      await p.evaluate(() => { hhSeite = 'helden'; openHeroHall(); }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(process.argv[3], 'helden_' + art + '.png') });
      await p.evaluate(() => { const H = loadHeroes(), h = HEROES.find(x => H[x.id].own); H[h.id].q = 1; openHeroHall(h.id); }); await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(process.argv[3], 'stern_' + art + '.png') }); }
    await ctx.close();
  }
  await b.close();
})();
