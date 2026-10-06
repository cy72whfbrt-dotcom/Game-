// Design 11b F, Paket P1 (Handy 390×844 + Desktop 1280×800): Grundwerte als CSS-Variablen, HUD mit Spielerbild (antippen = Profil),
// EIN Streifen für alle Dauer-Hinweise („+N“ klappt auf), Leiste mit 5 runden Knöpfen (Profil nicht mehr dort),
// Fenster am Handy höchstens 70 % hoch mit fester Fußzeile, Hinweis nie über Fenster-Kopf/Fuß oder den Zoom-Knöpfen.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof renderMidBar === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), box = e => e.getBoundingClientRect(), sicht = e => !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const ueber = (a, c) => a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      document.getElementById('anleitung').hidden = true; closeAllPopups(); flashHint('', 1);
      // 1) Grundwerte
      const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
      const tokens = { ab: ['--ab-1', '--ab-2', '--ab-3', '--ab-4'].map(v), fs: ['--fs-11', '--fs-13', '--fs-15', '--fs-17', '--fs-22', '--fs-9', '--fs-10'].map(v),
        k: ['--k-haupt', '--k-zweit', '--k-gefahr', '--k-chip', '--k-tipp', '--k-rund'].map(v) };
      // 2) HUD: Spielerbild sichtbar, ≥ 44 px, antippen öffnet das Profil
      const hp = document.getElementById('hudPlayer'), ring = hp.querySelector('.avatar-ring'), rb = box(ring);
      const hud = { sicht: sicht(hp), ring: Math.round(rb.width), tipp: Math.round(Math.min(box(hp).width, box(hp).height)), werteZeile: new Set([...document.querySelectorAll('.hud-werte .res')].map(e => Math.round(box(e).top))).size };
      hp.click(); await warte(500); hud.profil = isPanelOpen(profilePopup); closeAllPopups(); await warte(200);
      // 3) Leiste: 5 runde Knöpfe in fester Reihenfolge, Profil nicht in der Leiste, Tippfläche ≥ 44 px
      const knoepfe = [...document.querySelectorAll('#cornerButtons .nav-btn')].filter(sicht);
      const leiste = { ids: knoepfe.map(e => e.id), rund: knoepfe.every(e => { const i = e.querySelector('.icon'); return box(i).width >= 44 && getComputedStyle(i).borderRadius === '50%'; }),
        hoehe: Math.min(...knoepfe.map(e => box(e).height)) };
      // 4) EIN Streifen: mehrere Dauer-Hinweise → einer sichtbar + „+N“, antippen klappt alle auf
      const altEv = evChips; evChips = () => [[2, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache"><span>Drache</span></button>'], [3, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv"><span>Barbaren-Invasion in</span></button>']];
      renderMidBar(); await warte(100);
      const mb = document.getElementById('midBar'), mehr = mb.querySelector('.mb-mehr');
      const streifen = { chips: mb.querySelectorAll('.mb-chip').length, mehr: mehr && mehr.textContent, zeile: Math.round(box(mb).height) <= 30, unterHud: box(mb).top >= box(document.querySelector('.hud-werte')).bottom };
      mehr.click(); await warte(50); streifen.auf = mb.querySelectorAll('.mb-chip').length;
      mb.querySelector('.mb-mehr').click(); await warte(50); streifen.zu = mb.querySelectorAll('.mb-chip').length;
      evChips = altEv; renderMidBar();
      // 5) Fenster: Handy höchstens 70 % hoch, Fußzeile ganz zu sehen; Hinweis nie über Kopf/Fuß des Fensters oder den Zoom-Knöpfen
      openShop(); await warte(600);
      const sp = document.getElementById('shopPopup'), kopf = sp.querySelector('.phead'), fuss = sp.querySelector('.pfoot');
      flashHint('Kurzer Hinweis', 4000); await warte(200);
      const h = document.getElementById('hint'), hb = box(h), hz = +getComputedStyle(h).zIndex, sz = +getComputedStyle(sp).zIndex;
      const fenster = { hoehe: box(sp).height / innerHeight, fussGanz: box(fuss).bottom <= innerHeight && box(fuss).top >= box(sp).top,
        hinweisFrei: (!ueber(hb, box(kopf)) && !ueber(hb, box(fuss))) || hz < sz };
      closeAllPopups(); flashHint('Kurzer Hinweis', 4000); await warte(200);
      const zoom = document.getElementById('mapControls'); fenster.zoomFrei = !sicht(zoom) || !ueber(box(h), box(zoom));
      flashHint('', 1);
      return { tokens, hud, leiste, streifen, fenster };
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.tokens.ab.join() === '4px,8px,12px,16px' && r.tokens.fs.join() === '11px,13px,15px,17px,22px,11px,11px' && r.tokens.k.join() === '48px,44px,48px,36px,44px,48px', art + ': Grundwerte (Abstände, Schriftstufen ohne 9,5/10, Knopf-Arten)', r.tokens);
    ok(r.hud.sicht && r.hud.ring >= (art === 'Handy' ? 44 : 34) && r.hud.tipp >= 44 && r.hud.profil, art + ': Spielerbild im HUD (Handy 44 px, Tippfläche ≥ 44), antippen öffnet das Profil', r.hud);
    ok(r.hud.werteZeile === 1, art + ': Münzen, Edelsteine, Truppen in einer Zeile', r.hud);
    ok(r.leiste.ids.join() === 'cityNavBtn,bundBtn,battleLogBtn,goalsBtn,shopBtn' && r.leiste.rund && r.leiste.hoehe >= 44, art + ': Leiste = 5 runde Knöpfe (Karte/Stadt, Bündnis, Kampf, Events, Shop), kein Profil', r.leiste);
    ok(r.streifen.chips === 1 && r.streifen.auf >= 2 && r.streifen.mehr === '+' + (r.streifen.auf - 1) && r.streifen.zeile && r.streifen.unterHud, art + ': ein Streifen unter den Werten – ein Hinweis + „+N“ (Drache, Invasion …)', r.streifen);
    ok(r.streifen.zu === 1, art + ': „+N“ klappt alle Hinweise auf und wieder zu', r.streifen);
    if (art === 'Handy') ok(r.fenster.hoehe <= 0.705, art + ': Fenster höchstens 70 % hoch (Karte bleibt sichtbar)', r.fenster);
    ok(r.fenster.fussGanz, art + ': Fußzeile mit dem Haupt-Knopf ganz zu sehen', r.fenster);
    ok(r.fenster.hinweisFrei && r.fenster.zoomFrei, art + ': Hinweis nie über Fenster-Kopf/Fuß oder den Zoom-Knöpfen', r.fenster);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
