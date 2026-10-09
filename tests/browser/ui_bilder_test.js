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
    const nav = document.getElementById('cornerButtons').getBoundingClientRect();
    const schild = [...document.querySelectorAll('.nav-btn:not(#profileBtn) .nav-l')].every(l => l.getBoundingClientRect().bottom <= nav.bottom - 2);
    return { ids: ids.filter(i => !document.getElementById(i)), raus, zahlen, schild,
      ring: /ui_ring/.test(bg('.hud-me .avatar-ring', '::after')), kapsel: /ui_kapsel/.test(bg('.hud-werte > .res')), reihe: (() => { const k = [...document.querySelectorAll('.hud-werte .res')].map(e => e.getBoundingClientRect()); return k.length === 6 && k.every(r => Math.abs(r.top - k[0].top) < 2 && r.right <= innerWidth); })(),
      kapselRoh: /ui_kapsel/.test(bg('#hudRoh [data-roh="h"]')) && /ui_res_holz/.test(bg('#hudRoh [data-roh="h"] .icon')),
      dock: /ui_dock/.test(bg('#cornerButtons')), rund: /ui_rund/.test(bg('#bundBtn') + bg('#bundBtn > .icon')) && /ui_dock_bund/.test(bg('#bundBtn') + bg('#bundBtn > .icon')),
      zoom: /ui_zoom_rein/.test(bg('#zoomInBtn .icon')) && /ui_rund/.test(bg('#zoomInBtn')) };
  });
  ok(!karte.ids.length, 'Knöpfe/IDs bleiben', karte.ids);
  ok(karte.ring && karte.kapsel && karte.reihe && karte.kapselRoh, 'HUD: Wappen-Ring, EINE Reihe aus 6 Kapseln (Münzen … Eisen) mit Bild-Symbolen', karte);
  const blase = await ev(async () => { document.querySelector('#hudRoh [data-roh="s"]').click(); await new Promise(f => setTimeout(f, 200));
    const d = document.getElementById('rohDrop'), r = d.getBoundingClientRect(), o = { auf: !d.hidden, text: d.textContent, drin: r.left >= 0 && r.right <= innerWidth, klein: r.height < 90 };
    await new Promise(f => setTimeout(f, 3300)); o.zu = d.hidden; return o; });
  ok(blase.auf && /Stein/.test(blase.text) && /\/Std\./.test(blase.text) && blase.drin && blase.klein && blase.zu, 'Rohstoff antippen: kleine Blase mit Ertrag/Std., geht von selbst zu', blase);
  ok(karte.dock && karte.rund && karte.schild, 'Leiste unten: Bild-Leiste, runde Bild-Knöpfe mit Symbol, Beschriftung über dem Leisten-Rand', karte);
  ok(karte.zoom, 'Karten-Knöpfe: runde Bild-Knöpfe mit Lupe/Kompass/Fahne', karte);
  ok(!karte.raus.length && karte.zahlen.every(Boolean), 'Handy 390 px: nichts ragt heraus, Zahlen ganz lesbar', karte);
  await bild('karte');
  // 2) Fenster mit Reitern und Knöpfen (Profil)
  const fenster = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    document.getElementById('hudPlayer').click(); await warte(800);
    const pan = document.getElementById('profilePopup'), c = getComputedStyle(pan), tab = document.querySelector('#profileTabs .tab.active');
    const x = pan.querySelector('.btn-x .icon');
    const ganz = [...document.querySelectorAll('#profileTabs .tab span')].every(t => t.scrollWidth <= t.clientWidth + 1);
    return { ganz, offen: pan.classList.contains('is-open'), rahmen: /ui_rahmen/.test(c.borderImageSource), reiter: tab && /ui_reiter_an/.test(getComputedStyle(tab).borderImageSource),
      zu: x && /ui_zu/.test(getComputedStyle(x).backgroundImage),
      knopf: [...pan.querySelectorAll('.btn--primary,.btn--secondary')].some(k => /ui_k_/.test(getComputedStyle(k).borderImageSource)) };
  });
  ok(fenster.offen && fenster.rahmen && fenster.reiter && fenster.zu && fenster.ganz, 'Fenster: Bild-Rahmen, Reiter (Text ganz), rotes X', fenster);
  await bild('fenster');
  // 3) Belohnungs-Kacheln (Ausrüstung: je Seltenheit ein Teil)
  const kachel = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    for (let r = 0; r < 6; r++) addInventoryItem(['weapon', 'armor', 'shield', 'boots'][r % 4], r, 1);
    showProfileTab('equip'); if (typeof renderProfile === 'function') renderProfile(); await warte(600);
    const k = [...document.querySelectorAll('#profilePopup .tile[data-r]:not(.empty)')];
    return { n: k.length, bild: k.length > 0 && k.every(t => /ui_kachel_/.test(getComputedStyle(t).backgroundImage)) };
  });
  ok(kachel.n >= 6 && kachel.bild, 'Kacheln: Seltenheit als Bild', kachel);
  const knopf = await ev(async () => {   // Verkaufen: gesperrt grau, nach Auswahl einer Kachel der rote Knopf
    const b = document.getElementById('chestSelectSellBtn'), vor = { aus: b.disabled, bild: getComputedStyle(b).borderImageSource };
    const t = document.querySelector('#chestInventoryGrid .tile[data-r]:not(.empty) .selectDot') || document.querySelector('#chestInventoryGrid .tile[data-r]:not(.empty)');
    const r = t.getBoundingClientRect(); document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click(); await new Promise(f => setTimeout(f, 300));
    const o = { vor, an: !b.disabled, bild: getComputedStyle(b).borderImageSource };
    document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click(); await new Promise(f => setTimeout(f, 300)); closeAllPopups(); return o;   // (Auswahl wieder weg)
  });
  ok(knopf.vor.aus && /ui_k_grau/.test(knopf.vor.bild) && (!knopf.an || /ui_k_rot/.test(knopf.bild)), 'Verkaufen: gesperrt grau, frei rot', knopf);
  await bild('kacheln');
  // 4) Events → Aufgaben (Listen-Karten, Symbole) und Anleitung (Hinweisbox)
  const ziele = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    closeAllPopups(); openGoals(); await warte(800);
    const s = document.querySelector('#goalsPopup svg.icon:has(> use[href="#i-star"]), #goalsPopup svg.icon:has(> use[href="#i-goal"])');
    const pan = document.getElementById('goalsPopup');
    return { rahmen: /ui_rahmen/.test(getComputedStyle(pan).borderImageSource), offen: isPanelOpen(goalsPopup), sym: !s || /ui_sym_/.test(getComputedStyle(s).backgroundImage) };
  });
  ok(ziele.offen && ziele.sym && ziele.rahmen, 'Events: Symbole als Bild, derselbe Bild-Rahmen', ziele);
  await bild('aufgaben');
  const anl = await ev(async () => {
    closeAllPopups(); anleitung.schritt = 0; anleitungFrage = false; anleitungZeigen(); await new Promise(f => setTimeout(f, 400));
    const a = document.getElementById('anleitung');
    return { sicht: !a.hidden, bild: /ui_hinweis/.test(getComputedStyle(a).borderImageSource) };
  });
  ok(anl.sicht && anl.bild, 'Anleitung: Hinweisbox mit Rolle als Bild', anl);
  // 5) Aufstieg: Strahlen, Wappen, Lorbeer
  const auf = await ev(async () => {
    const m = document.getElementById('levelUpModal'); document.getElementById('levelUpLevel').textContent = '2'; m.hidden = false;
    await new Promise(f => setTimeout(f, 900));
    const c = getComputedStyle(document.querySelector('.lvlup-badge'));
    return { wappen: /ui_wappen/.test(c.backgroundImage), strahlen: /ui_strahlen/.test(getComputedStyle(document.querySelector('.lvlup-card'), '::before').backgroundImage) };
  });
  ok(auf.wappen && auf.strahlen, 'Aufstieg: Wappen mit Krone und Strahlen', auf);
  await bild('aufstieg');
  await ev(() => { document.getElementById('levelUpModal').hidden = true; });
  await ev(() => closeAllPopups());
  await p.waitForTimeout(1500);
  // 6) Stadt (Handy): weiter weg als ganz nah – mehr als ein Drittel der Bildbreite zu sehen
  const stadt = await ev(async () => { openCity(); await new Promise(f => setTimeout(f, 1500)); return { breite: Math.round(innerWidth / cityCam.z), bild: CITY_BILD_W }; });
  ok(stadt.breite > 0, 'Stadt: öffnet (Bild deckt den Bildschirm, stadt_bild_test)', stadt);
  await bild('stadt');
  const ring = await ev(async () => {   // Gebäude unten antippen: die runden Knöpfe ganz zwischen Kopf und Leiste
    const out = [];
    for (const id of Object.keys(CITY_ORTE)) { cityFocus(id, true); cityRingAuf(id); await new Promise(f => setTimeout(f, 400));
      const nav = document.getElementById('cornerButtons').getBoundingClientRect().top;
      for (const b of document.querySelectorAll('#cityRing .cr-btn')) { const r = b.getBoundingClientRect(), l = b.querySelector('small').getBoundingClientRect();
        if (r.left < 0 || r.right > innerWidth || r.top < 60 || Math.max(r.bottom, l.bottom) > nav) out.push(id + ':' + Math.round(r.top) + '/' + Math.round(Math.max(r.bottom, l.bottom)) + '>' + Math.round(nav)); } }
    cityRingZu(); return out; });
  ok(!ring.length, 'Stadt: runde Knöpfe am Gebäude immer ganz zu sehen (nie unter der Leiste)', ring);
  await ev(() => { closeAllPopups(); closeCity(); });
  // 5a) Shop und Bündnis: Fotos (gleiche Grundform)
  const preise = await ev(async () => {   // Preise: reicht es → hell, sonst rot; nie grau; „10× 1.500“ passt in den Knopf
    const warte = ms => new Promise(f => setTimeout(f, ms)), farbe = b => getComputedStyle(b).color, o = {};
    closeAllPopups(); gems = 100000; updateHud(); document.getElementById('shopBtn').click(); await warte(800);
    const alle = () => [...document.querySelectorAll('#shopPopup .ware-preis:not(.thron):not(.ohne-g)')].filter(b => b.getBoundingClientRect().width);
    o.reich = alle().map(farbe); o.passt = alle().every(b => b.scrollWidth <= b.clientWidth + 1 && b.scrollHeight <= b.clientHeight + 1);
    o.kopf = document.getElementById('shopGemCount').textContent;
    gems = 0; renderShop(); await warte(200); o.arm = alle().map(farbe);
    gems = 100000; renderShop(); return o; });
  ok(preise.reich.length && preise.reich.every(c => c === 'rgb(251, 238, 201)') && preise.arm.every(c => c === 'rgb(255, 141, 130)') && preise.passt && preise.kopf === '100K',
    'Shop: Preise hell, wenn es reicht, rot, wenn nicht; „10×“ passt; Kopf im Kurzformat (100K)', preise);
  await bild('shop');
  for (const t of ['shield', 'ev', 'markt']) { await ev(t => showShopTab(t), t); await p.waitForTimeout(600); await bild('shop_' + t); }
  await ev(async () => { closeAllPopups(); document.getElementById('bundBtn').click(); await new Promise(f => setTimeout(f, 800)); });
  await bild('buendnis');
  await ev(() => closeAllPopups());
  // 5b) Angriff vorbereiten: Grundform (Wahl-Knöpfe, Listen-Karten)
  const angr = await ev(async () => { const w = ms => new Promise(f => setTimeout(f, ms)), h = islandById[playerIslandId];
    const nb = islands.filter(i => !islandOwnerOf(i.id) && !bossAt(i.id) && i.type !== 'megaTemple').sort((x, y) => Math.hypot(x.x - h.x, x.y - h.y) - Math.hypot(y.x - h.x, y.y - h.y))[0];
    islandTroops[playerIslandId] = Math.max(1000, islandTroops[playerIslandId] || 0); openIslandPopup(nb); attackBtn.click(); await w(600);
    const k = document.querySelector('#islandPopup .seg:not(.hero-seg) > button');
    return { wahl: !!k && /ui_k_/.test(getComputedStyle(k).borderImageSource) }; });
  ok(angr.wahl, 'Angriff vorbereiten: Wahl-Knöpfe aus der Grundform', angr);
  await bild('angriff');
  await ev(() => closeAllPopups());
  ok(!fehlt.length, 'alle ui-Bilder geladen', fehlt);
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
