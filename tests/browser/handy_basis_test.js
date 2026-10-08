// Basis- und Angriffsfenster übersichtlich (11b F, P3) – Handy (390×844) und Desktop:
// eigene Basis: EIN Haupt-Knopf (Hauptstadt: Stadt betreten, sonst Aufwerten) vorn, Rest als Zweit-Knöpfe, Beschriftung ganz;
// fremde Basis ungespäht: EINE Kachel „Stärke unbekannt“ (kein „Erst spähen“ doppelt), antippen schickt den Späher;
// Untertitel nie abgeschnitten (Koordinaten in eigener Zeile); Handy: die Basis steht mittig über dem Fenster;
// Angriff vorbereiten: Startbasis + Angriff gegen Abwehr bleiben beim Scrollen oben stehen, „Abwehr unbekannt“ nicht doppelt,
// Helden in einer Zeile (quer wischen), Knopf „Angreifen“ fest unten. Angriff kompakt (6.10.): Handy ≤ 55 % hoch ohne Scrollen,
// Marschzeit nur einmal (Sanduhr im Knopf), Angriff/Abwehr mit Überschrift, ungespäht „Spähen“, Schieber ganze Breite,
// Held + Zweitheld als zwei Chips zum Aufklappen.
// Neu 8.10. (fenster_neu_test): runde Knöpfe, Held-Bild neben Startbasis/Angriff/Abwehr, goldener Knopf „Losmarschieren“.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), ganz = e => !!e && e.scrollWidth <= e.clientWidth + 1;
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      try { anleitung.schritt = ANLEITUNG.length; } catch (e) {}
      closeAllPopups(); gems = 1e5; coins = 1e9;
      const sichtbar = e => !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none';
      const knoepfe = () => [...document.querySelectorAll('#popupActions > .act')].filter(sichtbar);
      // 1) eigene Hauptstadt: Haupt-Knopf „Stadt betreten“ zuerst, Zweit-Knöpfe ganz lesbar
      const home = islandById[playerIslandId]; openIslandPopup(home); await warte(500);
      const k1 = knoepfe(), haupt1 = k1.filter(x => x.classList.contains('act--haupt'));
      const eigen = { haupt: haupt1.map(x => x.id), erster: k1.slice().sort((a, c) => a.getBoundingClientRect().top - c.getBoundingClientRect().top || a.getBoundingClientRect().left - c.getBoundingClientRect().left)[0].id,
        ganz: k1.map(x => [x.id, ganz(x.querySelector('.act-t')), ganz(x.querySelector('.act-s'))]).filter(z => !z[1] || !z[2]), sub: ganz(document.getElementById('popupSub')) };
      // 2) zweite eigene Basis: Haupt-Knopf „Aufwerten“
      const nah = l => l.sort((a, c) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(c.x - home.x, c.y - home.y))[0];
      const zweite = nah(islands.filter(i => i.id !== playerIslandId && !islandOwnerOf(i.id) && i.type === 'tower'));
      ownedIslands.add(zweite.id); islandTroops[zweite.id] = 500; openIslandPopup(zweite); await warte(400);
      const basis = { erster: knoepfe().sort((a, c) => a.getBoundingClientRect().top - c.getBoundingClientRect().top || a.getBoundingClientRect().left - c.getBoundingClientRect().left)[0].id };
      ownedIslands.delete(zweite.id); delete islandTroops[zweite.id];
      // 3) fremde Basis ungespäht: eine Kachel, Untertitel ganz, Basis mittig über dem Fenster (Handy)
      const ziel = nah(islands.filter(i => islandOwnerOf(i.id) && islandOwnerOf(i.id) !== 'player' && i.type === 'tower' && canReach(home.landmassId, i.landmassId)));
      scoutedIslands.delete(ziel.id); pendingScouts.splice(0, pendingScouts.length);
      flyTo(home.x, home.y); await warte(400); openIslandPopup(ziel); await warte(900);
      const st = document.getElementById('popupStats'), sub = document.getElementById('popupSub');
      const pr = popup.getBoundingClientRect(), sx = ziel.x * mapState.zoom + mapState.offsetX, sy = ziel.y * mapState.zoom + mapState.offsetY;
      const fremd = { kachel: st.querySelectorAll('[data-spaehen]').length, unk: st.querySelectorAll('.unk').length, doppelt: (st.textContent.match(/Stärke unbekannt/g) || []).length,
        sub: ganz(sub), teile: [...sub.children].filter(x => sichtbar(x) && !x.classList.contains('sep')).map(x => ganz(x)).every(Boolean), ort: !!sub.querySelector('.psub-ort'),
        mitte: uiLayout() !== 'phone' || (Math.abs(sx - innerWidth / 2) < 40 && sy > 60 && sy < pr.top - 40), sx: Math.round(sx), sy: Math.round(sy), oben: Math.round(pr.top) };
      // 4) Kachel antippen = Späher losschicken
      const vorher = window.__befehle ? window.__befehle.length : 0, sp0 = pendingScouts.length;
      st.querySelector('[data-spaehen]').click(); await warte(300);
      fremd.spaeher = pendingScouts.length > sp0 || (window.__befehle && window.__befehle.length > vorher) || !isPanelOpen(popup);
      pendingScouts.splice(0, pendingScouts.length);
      // 4b) Angriff kompakt (Alexander 6.10.): Handy höchstens 55 % hoch ohne Scrollen, Startbasis + Marschzeit nur EINMAL,
      //     Zahlen ganz, Held + Zweitheld als zwei Chips (≥ 44 px) – antippen klappt die Auswahl auf, eine Wahl klappt sie zu
      { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); }   // Helden erst mit Heldenhalle (Merkliste 21)
      const hs0 = loadHeroes(); HEROES.forEach((h, i) => { if (hs0[h.id]) hs0[h.id].own = i < 3; });
      const kompakt = [], maut0 = tollFor;
      for (const sp of [false, true]) {
        if (sp) scoutedIslands.add(ziel.id); else scoutedIslands.delete(ziel.id);
        tollFor = sp ? () => ({ closed: true, cost: 0 }) : maut0;   // gespäht: hinter einem geschlossenen Tor (macht das Fenster nicht höher)
        openIslandPopup(ziel); await warte(300);
        previewSourceId = playerIslandId; previewFraction = 1; previewHero = HEROES[0].id; previewHero2 = null; popupView = 'preview'; previewShownAt = Date.now(); renderPopup(); await warte(500);
        const pb = popup.querySelector('.pbody'), sel = document.getElementById('attackFromSel'), pr2 = popup.getBoundingClientRect(), ch = [...st.querySelectorAll('.ap-hchip')].filter(sichtbar);
        kompakt.push({ sp, hoch: +(pr2.height / innerHeight).toFixed(3), scroll: pb.scrollHeight - pb.clientHeight, kopf: sub.textContent.trim(),
          zeit: (sel.selectedOptions[0].textContent.match(/\d+:\d\d/g) || []).length, label: !!st.querySelector('.from-field, .field-l + #attackFromSel'),
          knopfZeit: sichtbar(document.getElementById('attackZeit')) && /^\d+:\d\d$/.test(document.getElementById('attackZeit').textContent) && !!document.querySelector('#attackZeit .icon'),
          titel: [...st.querySelectorAll('.force .stat-l')].filter(sichtbar).map(e => e.textContent.trim()).join(), spaehen: sichtbar(st.querySelector('.force--foe [data-spaehen]')),
          strich: getComputedStyle(document.getElementById('attackTroopsLabel')).borderBottomStyle, schieber: +(document.getElementById('attackTroopsSlider').getBoundingClientRect().width / st.getBoundingClientRect().width).toFixed(2),
          chips: ch.length, chipsOk: ch.every(c => c.getBoundingClientRect().right <= pr2.right && c.getBoundingClientRect().height >= 44 && ganz(c.querySelector('b'))),
          zahlen: [...st.querySelectorAll('.force b')].every(ganz), zu: st.querySelector('[data-preview="hero"]').hidden, tor: document.getElementById('popupOverline').textContent });
        if (!sp) { const s0 = pendingScouts.length, b0 = window.__befehle ? window.__befehle.length : 0; st.querySelector('.ap-spaehen').click(); await warte(300);   // „Spähen“ schickt den Späher
          kompakt[0].geschickt = pendingScouts.length > s0 || (window.__befehle && window.__befehle.length > b0); pendingScouts.splice(0, pendingScouts.length); }
      }
      tollFor = maut0;
      const c1 = st.querySelector('[data-held-auf="1"]'), l1 = st.querySelector('[data-preview="hero"]'); c1.click(); await warte(100);
      const auf = { liste1: !l1.hidden && c1.getAttribute('aria-expanded') === 'true' };
      l1.querySelector('[data-hero="' + HEROES[1].id + '"]').click(); await warte(100);
      auf.zu1 = l1.hidden && previewHero === HEROES[1].id && c1.textContent.includes(HEROES[1].name);
      st.querySelector('[data-held-auf="2"]').click(); await warte(100);
      const l2 = st.querySelector('[data-preview="hero2"]'); auf.liste2 = !l2.hidden;
      const b2 = [...l2.querySelectorAll('[data-hero2]')].find(x => x.dataset.hero2 && !x.disabled);
      if (b2) { b2.click(); await warte(100); }
      auf.zu2 = !!b2 && l2.hidden && previewHero2 === b2.dataset.hero2 && st.querySelector('[data-held-auf="2"]').textContent.includes(heroById(previewHero2).name);
      previewHero = previewHero2 = null; closeAllPopups();
      // 5) Angriff vorbereiten (ungespäht): feste Kopfzeile beim Scrollen, kein doppelter Hinweis, Helden einzeilig, Knopf unten
      scoutedIslands.delete(ziel.id); openIslandPopup(ziel); await warte(400);
      previewSourceId = playerIslandId; previewFraction = 1; popupView = 'preview'; previewShownAt = Date.now(); renderPopup(); await warte(700);   // (wie „Angreifen“ – ohne Schild/Tor-Umweg)
      popup.style.maxHeight = '300px'; await warte(100);   // kleines Handy: der Mittelteil muss scrollen (das kompakte Fenster passt sonst ganz)
      const body = popup.querySelector('.pbody'), kopf = st.querySelector('.ap-kopf'); body.scrollTop = 1e6; await warte(200);
      const br = body.getBoundingClientRect(), kr = kopf && kopf.getBoundingClientRect(), hs = st.querySelector('[data-preview="hero"]'), ab = document.getElementById('attackBtn').getBoundingClientRect();
      const angriff = { kopf: !!kopf, versus: !!(kopf && kopf.querySelector('.versus') && kopf.querySelector('#attackFromSel')),
        oben: !!kr && body.scrollTop > 20 && kr.top >= br.top - 16 && kr.top <= br.top + 2 && kr.bottom <= br.bottom, gescrollt: body.scrollTop,
        hinweis: /Abwehr unbekannt/.test(st.textContent), foe: (st.querySelector('[data-foe="total"]') || {}).textContent,
        helden: !hs || (hs.classList.contains('chips-quer') && getComputedStyle(hs).flexWrap === 'nowrap' && hs.getBoundingClientRect().height < 60),
        knopf: ab.bottom <= innerHeight && ab.top >= br.bottom - 2, zahl: !!st.querySelector('.ap-truppen #attackTroopsLabel') && !!st.querySelector('[data-preview="quick"]') && !!document.getElementById('attackTroopsSlider') };
      popup.style.maxHeight = ''; closeAllPopups();
      return { eigen, basis, fremd, angriff, kompakt, auf };
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.eigen.erster === 'cityBtn', art + ': Hauptstadt – runder Knopf „Betreten“ ganz vorn', r.eigen);
    ok(!r.eigen.ganz.length && r.eigen.sub, art + ': Hauptstadt – Zweit-Knöpfe und Untertitel ganz lesbar', r.eigen);
    ok(r.basis.erster === 'upgradeBtn', art + ': andere eigene Basis – runder Knopf „Aufwerten“ ganz vorn', r.basis);
    ok(r.fremd.kachel === 1 && r.fremd.unk === 0 && r.fremd.doppelt === 1, art + ': fremde Basis – eine Kachel „Stärke unbekannt“ statt 2× „Erst spähen“ + Kasten', r.fremd);
    ok(r.fremd.sub && r.fremd.teile && r.fremd.ort, art + ': Untertitel nicht abgeschnitten (Koordinaten in eigener Zeile)', r.fremd);
    ok(r.fremd.mitte, art + ': Basis mittig über dem Fenster', r.fremd);
    ok(r.fremd.spaeher, art + ': Kachel antippen schickt den Späher', r.fremd);
    for (const k of r.kompakt) {
      const w = art + ': Angriff kompakt (' + (k.sp ? 'gespäht' : 'ungespäht') + ', 3 Helden)';
      ok(art === 'Handy' ? k.hoch <= 0.63 : k.scroll <= 1, w + (art === 'Handy' ? ' – höchstens 62 % hoch (Rest scrollt)' : ' – alles ohne Scrollen'), k);
      ok(k.kopf === '' && k.zeit === 0 && k.knopfZeit && !k.label && (!k.sp || /Tor geschlossen/.test(k.tor)), w + ' – Marschzeit nur einmal (Sanduhr im Knopf „Angreifen“), keine Unterzeile (Maut/Tor in der Überzeile), kein Extra-Label', k);
      ok(k.titel === 'Angriff,Abwehr' && k.spaehen === !k.sp && (k.sp || k.geschickt) && k.strich === 'none' && k.schieber >= 0.95, w + ' – Überschriften Angriff/Abwehr, ungespäht „Spähen“ in der Abwehr, Schieber ganze Breite, keine gestrichelte Linie', k);
      ok(k.chips === 2 && k.chipsOk && k.zahlen && k.zu, w + ' – Held + Zweitheld als zwei ganze Chips (≥ 44 px), Zahlen ganz', k);
    }
    ok(r.auf.liste1 && r.auf.zu1 && r.auf.liste2 && r.auf.zu2, art + ': Held-Chip antippen klappt die Auswahl auf, eine Wahl klappt sie zu (Held und Zweitheld)', r.auf);
    ok(r.angriff.kopf && r.angriff.versus, art + ': Angriff – Startbasis + Angriff/Abwehr neben dem Held-Bild', r.angriff);
    ok(!r.angriff.hinweis && r.angriff.foe === '?', art + ': „Abwehr unbekannt“ nicht doppelt (nur „?“ in der Kachel)', r.angriff);
    ok(r.angriff.helden && r.angriff.zahl, art + ': Helden-Auswahl in einer Zeile, Truppen: Schieber + Prozent + Zahl', r.angriff);
    ok(r.angriff.knopf, art + ': „Losmarschieren“ fest unten sichtbar', r.angriff);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
