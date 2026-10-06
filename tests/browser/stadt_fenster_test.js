// Stadt, Burg, Labor, Helden und Shop übersichtlich (11b F, P4) – Handy + Desktop: Haupt-Knopf (Aufwerten/Forschen) ohne Scrollen
// sichtbar, Burg-Schild-Kasten unter den Voraussetzungen, „Fehlt: … Holz“ statt totem Knopf, Helden-Reiter Helden | Paare mit
// gesperrten Helden darunter, Knöpfe ≥ 44 px. (Shop: shop_test.js)
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof AUF !== 'undefined' && AUF, null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
      const sicht = e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.top >= 0 && q.bottom <= innerHeight + 1; };
      const deckt = (a, z) => { const x = a.getBoundingClientRect(), y = z.getBoundingClientRect(); return getComputedStyle(a).display !== 'none' && x.height > 0 && x.bottom > y.top && x.top < y.bottom && x.right > y.left && x.left < y.right; };
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); coins = 5e6; gems = 5e4; updateHud();
      const rohSetzen = h => Object.assign(AUF.rohVon('player'), { h, s: 1e9, e: 1e9 });   // (der Topf kann neu geladen werden: jedes Mal frisch holen)
      cityShow(); loadCity().levels.academy = 3; loadCity().builds = [];
      // 1) Burg: Knopf fest unten, Schild-Kasten unter den Voraussetzungen, „Fehlt: … Holz“, kein roter Kreis
      cityOpenId = 'keep'; rohSetzen(0); renderCitySheet();
      const sh = document.getElementById('citySheet'), up = document.getElementById('cityUpgradeBtn'), note = document.getElementById('cityBNote'), anf = document.querySelector('#cityBStats .anf-h');
      const fehlt = /^Fehlt: .+ Holz$/.test(up.querySelector('.lbl').textContent), aus = up.disabled; await warte(300);
      flashHint('Späher unterwegs zu Turm #23739 · ca. 0:21', 60000); await warte(200);
      const toast = document.getElementById('hint');
      o.burg = { knopf: sicht(up), fehlt, aus, schildUnten: note.getBoundingClientRect().top > anf.getBoundingClientRect().top,
        kreisWeg: [...document.querySelectorAll('#cityBStats .anf.is-bad > i')].every(i => getComputedStyle(i).visibility === 'hidden'), toastFrei: !deckt(toast, document.querySelector('.city-bfoot')),
        xh: Math.round(document.getElementById('citySheetClose').getBoundingClientRect().height * 10) / 10 }; o.burg.x44 = o.burg.xh >= 44;
      rohSetzen(1e9); renderCitySheet(); o.burg.wiederAuf = /Burg aufwerten/i.test(up.textContent) && !up.disabled;
      // 2) Labor: Forschen-Knopf ohne Scrollen sichtbar
      cityOpenId = 'academy'; cityPage = 'nutz'; renderCitySheet(); sh.scrollTop = 0; await warte(300);
      const go = document.querySelector('#citySheet .fo-go'); o.forschen = { da: !!go, sicht: !!go && sicht(go) && go.getBoundingClientRect().bottom <= sh.getBoundingClientRect().bottom + 1 };
      cityPage = 'bau'; sh.hidden = true; cityOpenId = null; flashHint('', 1);
      // 3) Helden: Reiter, gesperrte Helden kleiner darunter, Paare auf eigenem Reiter
      const Hs = loadHeroes(), ohne = HEROES.filter(h => !Hs[h.id].own); ohne.forEach((h, i) => { Hs[h.id].sh = i ? 0 : Math.max(Hs[h.id].sh, HERO_UNLOCK[h.r]); });   // (Test-Welt: fast unbegrenzt Splitter – sonst wäre jeder „Freischalten“ statt gesperrt)
      openHeroHall(); await warte(200);
      const hh = document.getElementById('heroHall'), seiten = [...hh.querySelectorAll('[data-hh-seite]')];
      o.helden = { reiter: seiten.map(x => x.textContent).join('|'), h44: seiten.every(x => x.getBoundingClientRect().height >= 44),
        eigeneOben: !hh.querySelector('.hh-cards:not(.hh-cards--zu) .is-locked'), bereitOben: !ohne.length || !!hh.querySelector('.hh-cards:not(.hh-cards--zu) .is-ready'), gesperrt: hh.querySelectorAll('.hh-cards--zu .hh-card.is-locked').length, paareNichtHier: !hh.querySelector('.hh-pairs') };
      hh.querySelector('[data-hh-seite="paare"]').click(); await warte(100);
      o.helden.paare = !!hh.querySelector('.hh-pairs .hh-pair') && !hh.querySelector('.hh-cards');
      hh.querySelector('[data-hh-seite="helden"]').click(); closeHeroHall();
      cityView.hidden = true; stadtLeiste(false);
      flashHint('', 1); closeAllPopups();
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.burg.knopf && r.burg.x44, art + ': Burg – „Aufwerten“ ohne Scrollen sichtbar, X 44 px', r.burg);
    ok(r.burg.fehlt && r.burg.aus && r.burg.wiederAuf, art + ': Burg – fehlt Holz: Knopf sagt „Fehlt: … Holz“, mit Holz wieder „Burg aufwerten“', r.burg);
    ok(r.burg.schildUnten && r.burg.kreisWeg, art + ': Burg – Schild-Kasten unter den Voraussetzungen, kein roter Kreis', r.burg);
    ok(r.burg.toastFrei, art + ': Burg – Hinweis liegt nicht über der Fußzeile', r.burg);
    ok(r.forschen.da && r.forschen.sicht, art + ': Labor – „Forschen“ ohne Scrollen sichtbar', r.forschen);
    ok(r.helden.reiter === 'Helden|Paare' && r.helden.h44 && r.helden.paare && r.helden.paareNichtHier, art + ': Helden – Reiter Helden | Paare (44 px)', r.helden);
    ok(r.helden.eigeneOben && r.helden.bereitOben && r.helden.gesperrt > 0, art + ': Helden – eigene + freischaltbare oben, gesperrte kleiner darunter', r.helden);
    await ctx.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
