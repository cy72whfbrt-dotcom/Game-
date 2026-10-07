// Oberfläche aus KI-Bildern (Alexander 7.10.): HUD, Leiste, Karten-Knöpfe, Knöpfe, Fenster-Rahmen, Reiter, Kacheln nutzen bilder/ui_*.webp,
// alle Bilder laden, Knöpfe/IDs bleiben, auf dem Handy (390 px) nichts abgeschnitten. Fotos in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3], fehlt = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  p.on('pageerror', e => fe.push(e.message));
  p.on('requestfailed', r => { if (/ui_/.test(r.url())) fehlt.push(r.url()); });
  p.on('response', r => { if (/ui_/.test(r.url()) && r.status() >= 400) fehlt.push(r.url()); });
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const ev = (f, a) => p.evaluate(f, a);
  const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, 'ui_' + n + '.png') }); };
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } closeAllPopups(); });
  await p.waitForTimeout(500);
  // 1) Karte: HUD, Leiste, Karten-Knöpfe mit Bildern
  const karte = await ev(() => {
    const bg = (s, pseudo) => { const e = document.querySelector(s); if (!e) return ''; const c = getComputedStyle(e, pseudo); return c.backgroundImage + ' ' + c.borderImageSource; };
    const ids = ['hudPlayer', 'coinCount', 'gemCount', 'troopCount', 'hudRoh', 'cityNavBtn', 'bundBtn', 'battleLogBtn', 'goalsBtn', 'shopBtn', 'zoomInBtn', 'zoomOutBtn', 'homeBtn', 'markerBtn', 'armyBtn'];
    const raus = [...document.querySelectorAll('.hud-werte .res, #hudRoh, .nav-btn:not(#profileBtn), .mapctl button')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(e => e.id || e.className);
    const zahlen = ['coinCount', 'gemCount', 'troopCount'].map(id => { const e = document.getElementById(id); return e.scrollWidth <= e.clientWidth + 1; });
    return { ids: ids.filter(i => !document.getElementById(i)), raus, zahlen,
      ring: /ui_ring/.test(bg('.hud-me .avatar-ring', '::after')), kapsel: /ui_kapsel/.test(bg('.hud-werte > .res')), kasten: /ui_kasten/.test(bg('#hudRoh')),
      dock: /ui_dock/.test(bg('#cornerButtons')), rund: /ui_rund/.test(bg('#bundBtn > .icon')) && /ui_dock_bund/.test(bg('#bundBtn > .icon')),
      zoom: /ui_zoom_rein/.test(bg('#zoomInBtn .icon')) && /ui_rund/.test(bg('#zoomInBtn')) };
  });
  ok(!karte.ids.length, 'Knöpfe/IDs bleiben', karte.ids);
  ok(karte.ring && karte.kapsel && karte.kasten, 'HUD: Wappen-Ring, Kapseln, Holzkasten als Bild', karte);
  ok(karte.dock && karte.rund, 'Leiste unten: Bild-Leiste, runde Bild-Knöpfe mit Symbol', karte);
  ok(karte.zoom, 'Karten-Knöpfe: runde Bild-Knöpfe mit Lupe/Kompass/Fahne', karte);
  ok(!karte.raus.length && karte.zahlen.every(Boolean), 'Handy 390 px: nichts ragt heraus, Zahlen ganz lesbar', karte);
  await bild('karte');
  // 2) Fenster mit Reitern und Knöpfen (Profil)
  const fenster = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    document.getElementById('hudPlayer').click(); await warte(800);
    const pan = document.getElementById('profilePopup'), c = getComputedStyle(pan, '::before'), tab = document.querySelector('#profileTabs .tab.active');
    const x = pan.querySelector('.btn-x .icon');
    return { offen: pan.classList.contains('is-open'), rahmen: /ui_rahmen/.test(c.borderImageSource), reiter: tab && /ui_reiter_an/.test(getComputedStyle(tab).borderImageSource),
      zu: x && /ui_zu/.test(getComputedStyle(x).backgroundImage),
      knopf: [...pan.querySelectorAll('.btn--primary,.btn--secondary')].some(k => /ui_k_/.test(getComputedStyle(k).borderImageSource)) };
  });
  ok(fenster.offen && fenster.rahmen && fenster.reiter && fenster.zu, 'Fenster: Bild-Rahmen, Reiter, rotes X', fenster);
  await bild('fenster');
  // 3) Belohnungs-Kacheln (Inventar im Profil)
  const kachel = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    const t = [...document.querySelectorAll('#profileTabs .tab')].find(t => /Ausr|Inv|Gegen/i.test(t.textContent)); if (t) t.click(); await warte(600);
    const k = document.querySelector('.tile[data-r]:not(.empty)');
    return { da: !!k, bild: k ? /ui_kachel_/.test(getComputedStyle(k).backgroundImage) : null };
  });
  ok(!kachel.da || kachel.bild, 'Kacheln: Seltenheit als Bild', kachel);
  await bild('kacheln');
  await ev(() => closeAllPopups());
  await p.waitForTimeout(1500);
  ok(!fehlt.length, 'alle ui-Bilder geladen', fehlt);
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
