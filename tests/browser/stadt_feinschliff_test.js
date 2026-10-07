// Stadt-Feinschliff (Spieltest 7.10.): „Stadt betreten“ ohne Konsolenfehler (Klick-Ereignis kam als „dann“ in openCity),
// Heldenkarte „Freischalten“ mit Kosten und ganz in der Karte, Viertelstern als Tortenstück, Erfolgs-Hinweis am Handy erst
// nach dem Fenster, Burg-Blatt: letzte Karte über dem festen Knopf lesbar, Stadt-Schilder nie unter der unteren Leiste.
// Fix-Runde 3: Wisch-Hinweis (Handy), Burg-Blatt ohne halbe Karte, Wartezeit am „Fehlt“-Knopf, gleiche Zahlen, Helden-Reiter, Hinweis unter der Anleitung.
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
    const r1 = await p.evaluate(() => ({ stadt: !cityView.hidden, anim: !!(cityCam && cityCam.anim) || cityPendingAnim, wisch: !document.getElementById('cityWisch').hidden }));
    ok(r1.stadt && !fe.length, art + ': „Stadt betreten“ öffnet die Stadt ohne Konsolenfehler', { ...r1, fe: fe.slice(0, 3) });
    // Fix-Runde 3 D: Handy hoch – die Stadt ist breiter als der Bildschirm: beim ersten Betreten „‹ Wischen ›“; Desktop (passt): keiner
    ok(r1.wisch === (art === 'Handy'), art + ': Wisch-Hinweis in der Stadt ' + (art === 'Handy' ? 'da' : 'nicht nötig'), r1.wisch);
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
    // Fix-Runde 3 (Spieltest r3): B Burg-Blatt beim Öffnen ohne halb verdeckte Karte · C „Fehlt“ mit Wartezeit · E gesperrter Held ohne
    // „Macht Gesperrt“, Gefolge nur über 0 · F „Helden“ öffnet gleich die Halle · G hast/brauchst gleich geschrieben · H Hinweis unter der Anleitung
    const f3 = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      closeHeroHall(); cityOpenId = 'keep'; cityPage = 'bau'; loadCity().builds = []; coins = 0; renderCitySheet(); await warte(300);
      const sh = document.getElementById('citySheet'); sh.scrollTop = 0; await warte(200);
      const ft = sh.querySelector('.city-bfoot').getBoundingClientRect().top;
      o.halb = [...sh.querySelectorAll('.anf, #cityBNote, .auf-grid > div')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(q => q.top < ft - 2 && q.bottom > ft + 2).length;
      o.knopf = document.getElementById('cityUpgradeBtn').querySelector('.lbl').textContent; o.warte = document.getElementById('cityUpWarte').textContent;
      const r = AUF.rohVon('player'), alt = { h: r.h, s: r.s, e: r.e }; r.h = r.s = r.e = 5000; coins = 998912; renderCitySheet(); await warte(100);
      o.zahlen = [...document.querySelectorAll('#cityBStats .anf b')].map(b => b.textContent); Object.assign(r, alt);
      o.warteVoll = document.getElementById('cityUpWarte').textContent;   // (alles da: keine Wartezeit)
      coins = 5e6; cityOpenId = null; sh.hidden = true;
      loadCity().levels.heroes = Math.max(1, loadCity().levels.heroes || 0); cityOpenId = 'heroes'; cityPage = 'bau'; renderCitySheet(); await warte(100);
      o.extra = document.getElementById('cityBExtra').textContent;
      document.querySelector('#cityTabs [data-cpage="nutz"]').click(); await warte(200);
      o.halle = !document.getElementById('heroHall').hidden; o.seite = cityPage;
      const H = loadHeroes(), zu = HEROES.find(x => !H[x.id].own); openHeroHall(zu.id); await warte(200);
      o.macht = document.querySelector('#heroHall .hh-unten').textContent;
      o.gefolge = HEROES.every(x => hhHero(x.id).includes('<span>Gefolge</span>') === heroStats('player', x.id).gef > 0);
      closeHeroHall(); cityOpenId = null; sh.hidden = true;
      if (innerWidth < 900) { closeCity(); await warte(1500);   // Handy: Basis-Fenster offen, Anleitung oben – der Hinweis steht darunter
        const a = document.getElementById('anleitung'); openIslandPopup(islandById[playerIslandId]); a.hidden = false; flashHint('Der Drache ist erschienen! Urdrache Vharak kreist über dem Thron – nur alle zusammen können ihn besiegen.', 5000); await warte(400);
        o.anl = Math.round(a.getBoundingClientRect().bottom); o.hinweis = Math.round(hintEl.getBoundingClientRect().top); }
      return o; });
    ok(!f3.halb, art + ': Burg-Blatt beim Öffnen – keine Karte halb unter dem festen Knopf', f3.halb);
    ok(/^Fehlt: .*Münzen$/.test(f3.knopf) && /^in ~\d+ (Min\.|Std\.|Tagen)$/.test(f3.warte) && f3.warteVoll === '', art + ': „Fehlt: … Münzen“ mit Wartezeit darunter (nur wenn etwas fehlt)', [f3.knopf, f3.warte, f3.warteVoll]);
    ok(f3.zahlen.length >= 4 && f3.zahlen.every(z => /^\d{1,3}(\.\d{3})* \/ \d{1,3}(\.\d{3})*$/.test(z)), art + ': Voraussetzungen hast/brauchst gleich geschrieben (998.912 / 1.100)', f3.zahlen);
    ok(f3.extra === '' && f3.halle && f3.seite === 'bau', art + ': Heldenhalle „Helden“ öffnet gleich die Helden (kein doppeltes „Helden öffnen“)', f3);
    ok(!/Gesperrt|Macht/.test(f3.macht) && f3.gefolge, art + ': gesperrter Held ohne „Macht Gesperrt“, Gefolge nur über 0', f3.macht);
    if (art === 'Handy') ok(f3.hinweis >= f3.anl, art + ': Hinweis beim Angriff unter der Anleitung, nicht dahinter', { anl: f3.anl, hinweis: f3.hinweis });
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
