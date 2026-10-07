// Shop als Schaufenster (Alexander 6.10., design_shop.md) – Handy 390×844 + Desktop: Kisten als Karten mit KI-Bild der Truhe und EIGENEM
// Preis-Knopf (volle Breite, ≥ 44 px; unter 500 daneben „10ד), Epische Kiste groß über beide Spalten (Desktop: alles in einer Reihe), alle ohne Scrollen
// sichtbar, kein fester Unten-Knopf, Erklärung/Chancen hinter „i“ (Thron: eine Zeile, bleibt offen beim Neuzeichnen), Hinweis nie
// über einem Preis-Knopf. Kauf: Ausrüstungskiste/Heldenkiste (150) mit einem Tipp, Große Kiste (500) erst nach „Wirklich?“ –
// Edelsteine genau einmal abgezogen. Bilder (alle Reiter) in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof gemsWirklich === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png'), timeout: 120000, animations: 'disabled' }); };
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      const deckt = (a, z) => { const x = a.getBoundingClientRect(), y = z.getBoundingClientRect(); return getComputedStyle(a).display !== 'none' && x.height > 0 && x.bottom > y.top && x.top < y.bottom && x.right > y.left && x.left < y.right; };
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); flashHint('', 1); gems = 5e7; updateHud();   // (über den 10 Mio. des Test-Modus: der füllt sonst mitten im Kauf auf)
      openShop('gems'); await warte(500);
      const pb = document.querySelector('#shopPopup .pbody'), pr = pb.getBoundingClientRect();
      const knoepfe = [...document.querySelectorAll('#shopPopup [data-spane="gems"] .ware .ware-preis')], karten = [...document.querySelectorAll('#shopPopup [data-spane="gems"] .ware')];
      o.kisten = { n: knoepfe.length, aus: !!document.querySelector('.ware #shopOpenCrateBtn'), preis: document.getElementById('shopOpenCrateBtn').textContent.trim(),
        h44: knoepfe.every(k => k.getBoundingClientRect().height >= 44 && k.getBoundingClientRect().width >= 44),
        sicht: knoepfe.every(k => { const q = k.getBoundingClientRect(); return q.top >= pr.top - 1 && q.bottom <= pr.bottom + 1; }), scroll: pb.scrollTop,
        einZeilig: [...document.querySelectorAll('[data-spane="gems"] .ware-txt small')].every(s => s.getBoundingClientRect().height < 22),
        keinFuss: !document.getElementById('shopFoot') && !document.querySelector('#shopPopup .pfoot'),
        truhen: karten.filter(k => { const sv = k.querySelector('.ware-bild img.kiste-bild'); return sv && sv.complete && sv.naturalWidth > 0 && sv.getBoundingClientRect().height >= 70; }).length,
        breitKnopf: knoepfe.every(k => (k.closest('.ware-preise') || k).getBoundingClientRect().width >= k.closest('.ware').getBoundingClientRect().width - 4), mehr: [...document.querySelectorAll('#shopPopup [data-mehr]')].map(k => k.dataset.mehr).join(),
        gross: !!karten[0] && karten[0].classList.contains('ware--gross') && !!karten[0].querySelector('[data-hchest="hcE"]') && /Bester Wert/i.test(karten[0].textContent),
        grossBreit: karten[0].getBoundingClientRect().width >= 2 * karten[1].getBoundingClientRect().width,
        eineReihe: Math.abs(karten[0].getBoundingClientRect().top - karten[1].getBoundingClientRect().top) < 2 };
      // „i“: zu → auf (Chancen sichtbar) → zu
      const box = document.querySelector('[data-sinfo-box="kiste"]'), i = document.querySelector('[data-sinfo="kiste"]');
      o.info = { zu: box.hidden && [...document.querySelectorAll('#shopPopup [data-sinfo-box]')].every(x => x.hidden), i44: i.getBoundingClientRect().height >= 44 };
      i.click(); await warte(100); o.info.auf = !box.hidden && i.getAttribute('aria-expanded') === 'true' && document.getElementById('shopOdds').getBoundingClientRect().height > 0;
      i.click(); await warte(100); o.info.wiederZu = box.hidden;
      // Hinweis liegt über keinem Preis-Knopf
      flashHint('Späher unterwegs zu Turm #23739 · ca. 0:21', 60000); await warte(250);
      o.hinweisFrei = !knoepfe.some(k => deckt(document.getElementById('hint'), k)); flashHint('', 1);
      // Kauf: ein Tipp bei 150, „Wirklich?“ bei 500, Edelsteine genau einmal
      const echt = Date.now, qp = window.questProgress; let T = echt.call(Date); Date.now = () => T;   // eigene Uhr: unter Last zählt nicht, wie lange der Browser braucht
      window.questProgress = () => {};   // (eine fertige Aufgabe „Öffne Kisten“ schenkt sonst Edelsteine mitten in die Rechnung)
      try {
        const g0 = gems, inv0 = Object.keys(inventory).length; document.getElementById('shopOpenCrateBtn').click(); await warte(50);
        o.aus = { weg: g0 - gems, teil: Object.keys(inventory).length - inv0, ergebnis: !!document.getElementById('beuteFenster') && !document.getElementById('beuteFenster').hidden && document.getElementById('shopCrateResult').style.display !== 'block' };   // (Belohnungs-Fenster, keine Liste mehr unten im Shop)
        const g1 = gems; document.querySelector('[data-hchest="hc1"]').click(); await warte(50); o.held = { weg: g1 - gems };
        const g2 = gems, gross = () => document.querySelector('[data-hchest="hc3"]');
        gross().click(); await warte(50); o.gross = { erst: g2 - gems, frage: /Wirklich/.test(gross().textContent) && gross().classList.contains('is-armed') };
        T += 100; gross().click(); await warte(50); o.gross.doppel = g2 - gems;
        T += 600; gross().click(); await warte(50); o.gross.dann = g2 - gems; o.gross.ergebnis = !!document.getElementById('beuteFenster') && !document.getElementById('beuteFenster').hidden && document.getElementById('shopHeroResult').hidden;
        T += 600; o.gross.wieder = /^[\d.]+$/.test(gross().textContent.trim()); gross().click(); await warte(50); o.gross.neuFrage = g2 - gems;
        gemsArmAus();
      } finally { Date.now = echt; window.questProgress = qp; }
      // Schilde, Thron: Erklärung hinter „i“; Thron bleibt beim Neuzeichnen offen
      showShopTab('shield'); await warte(200);
      o.schild = { zu: document.querySelector('[data-sinfo-box="schild"]').hidden, kauf: document.querySelectorAll('.ware [data-shield]').length };
      showShopTab('throne'); await warte(300);
      const tb = () => document.querySelector('[data-sinfo-box="thron"]');
      const tk = [...document.querySelectorAll('#throneShop .ware [data-throne-buy]')], tr = pb.getBoundingClientRect();
      o.thron = { zu: tb().hidden, zeilen: tk.length, sicht: tk.every(k => k.getBoundingClientRect().bottom <= tr.bottom + 1), zeile: !!document.querySelector('#throneShop .thron-zeile[data-sinfo="thron"] [data-throne-pts]') };
      document.querySelector('[data-sinfo="thron"]').click(); await warte(50); renderThroneShop(); throneState.nextPts += 1000; renderThroneShop(); await warte(50);
      o.thron.bleibtAuf = !tb().hidden && /Mega-Tempel/.test(tb().textContent);
      document.querySelector('[data-sinfo="thron"]').click(); await warte(50); o.thron.wiederZu = tb().hidden;
      showShopTab('gems'); document.getElementById('shopCrateResult').style.display = 'none'; document.getElementById('shopHeroResult').hidden = true;
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.kisten.n === 6 && r.kisten.aus && r.kisten.preis === '150' && r.kisten.h44 && r.kisten.breitKnopf && r.kisten.mehr === 'hc1,aus', art + ': 4 Kisten-Karten, Preis-Leiste über die volle Breite (Ausrüstungskiste 150, ≥ 44 px), „10ד nur bei Kisten unter 500', r.kisten);
    ok(r.kisten.truhen === 4, art + ': jede Kiste mit KI-Bild der Truhe (≥ 70 px)', r.kisten);
    ok(r.kisten.gross && r.kisten.grossBreit && (art === 'Handy' ? !r.kisten.eineReihe : r.kisten.eineReihe), art + ': Epische Kiste groß (doppelt breit, „Bester Wert“)' + (art === 'Handy' ? ', darunter 2 Spalten' : ', alle in einer Reihe'), r.kisten);
    ok(r.kisten.sicht && r.kisten.scroll === 0 && r.kisten.einZeilig, art + ': alle Kisten ohne Scrollen sichtbar, Inhalt in einer Zeile', r.kisten);
    ok(r.kisten.keinFuss, art + ': kein fester Unten-Knopf („Kiste öffnen“) mehr', r.kisten);
    ok(r.info.zu && r.info.i44 && r.info.auf && r.info.wiederZu, art + ': Erklärung + Chancen hinter „i“ (zu → auf → zu, 44 px)', r.info);
    ok(r.hinweisFrei, art + ': Hinweis liegt über keinem Preis-Knopf');
    ok(r.aus.weg === 150 && r.aus.teil === 1 && r.aus.ergebnis, art + ': Ausrüstungskiste: ein Tipp = 150 weg, 1 Teil, Ergebnis', r.aus);
    ok(r.held.weg === 150, art + ': Heldenkiste: ein Tipp = 150 weg', r.held);
    ok(r.gross.erst === 0 && r.gross.frage && r.gross.doppel === 0 && r.gross.dann === 500 && r.gross.ergebnis, art + ': Große Kiste: erst „Wirklich?“, Doppel-Tipp zählt nicht, dann genau 500 weg', r.gross);
    ok(r.gross.wieder && r.gross.neuFrage === 500, art + ': danach wieder Preis im Knopf, nächster Kauf fragt wieder', r.gross);
    ok(r.schild.zu && r.schild.kauf === 3, art + ': Schilde – Erklärung hinter „i“, 3 Karten mit Kauf-Knopf', r.schild);
    ok(r.thron.zu && r.thron.zeile && r.thron.zeilen === 4 && r.thron.sicht && r.thron.bleibtAuf && r.thron.wiederZu, art + ': Thron – Status in einer Zeile (aufklappbar, bleibt beim Neuzeichnen offen), 4 Waren-Karten ohne Scrollen', r.thron);
    for (const t of ['gems', 'shield', 'throne', 'markt']) { await p.evaluate(async t => { showShopTab(t); await new Promise(f => setTimeout(f, 300)); }, t); await bild('shop_' + t); }
    await ctx.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
