// Rucksack (Alexander 7.10.), Vorschau ohne Server, Handy:
// A) Leiste: 6 Knöpfe Stadt · Bündnis · Kampf · Events · Rucksack · Shop, je Tippfläche ≥ 44 px, nichts überlappt, alle in der Leiste
// B) Shop → Schilde: nur kaufen (kein „Einschalten“ mehr), gekauft liegt im Rucksack; Teleporter 500 Edelsteine mit „Wirklich?“
// C) Rucksack: Schild einsetzen – die Zeit kommt zum laufenden Schild DAZU; ohne Schild „Kaufen“ → Shop
// D) Teleporter: „Benutzen“ → Karte; Tipp auf freies Feld zeigt „1 Teleporter“ und verbraucht ihn statt 500 Edelsteinen;
//    der Gratis-Teleporter neuer Spieler liegt als 1 Teleporter im Rucksack und geht zuerst (Befehl gratis), danach die gekauften
// E) Splitter je Held als Kacheln, Tipp öffnet den Helden
// Bilder (Leiste, Rucksack, Shop Schilde/Teleporter) nur, wenn ein Ordner als 2. Argument kommt.
//   node tests/browser/rucksack_test.js <vorschau> [bilder]
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 500) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', bilder = process.argv[3] || null, fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 360, height: 760 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.addInitScript(() => {
    window.__befehle = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht() {}, befehl(art, d) { window.__befehle.push([art, d]); }, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  await p.goto(url, { timeout: 120000 });
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof renderRucksack === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, 'rucksack_' + n + '.png') }); };
  await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    document.querySelectorAll('body > div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }); closeAllPopups(); flashHint('', 1);
    for (const d of BOT_DEFS) botNextAt[d.id] = Date.now() + 1e9;
    store.set('openWaterNeulingBis', '0'); store.set('openWaterShield', '0'); shieldMemAt = 0; store.remove('openWaterShieldStock'); store.remove('openWaterTeleporter'); });
  // A) Leiste
  const a = await p.evaluate(() => {
    const R = e => e.getBoundingClientRect(), nav = R(document.getElementById('cornerButtons'));
    const k = [...document.querySelectorAll('#cornerButtons .nav-btn')].filter(e => R(e).width > 0);
    const rs = k.map(R), l = k.map(e => R(e.querySelector('.nav-l')));
    return { ids: k.map(e => e.id).join(), tipp: Math.min(...rs.map(r => Math.min(r.width, r.height))), drin: rs.every(r => r.left >= nav.left - 1 && r.right <= nav.right + 1),
      ueber: rs.some((r, i) => i && r.left < rs[i - 1].right - 1), text: l.some((r, i) => i && r.left < l[i - 1].right - 1), bild: /ui_dock_rucksack/.test(getComputedStyle(document.getElementById('rucksackBtn')).backgroundImage + getComputedStyle(document.querySelector('#rucksackBtn > .icon')).backgroundImage) };
  });
  ok(a.ids === 'cityNavBtn,bundBtn,battleLogBtn,goalsBtn,rucksackBtn,shopBtn' && a.tipp >= 44 && a.drin && !a.ueber && !a.text && a.bild, 'Leiste: 6 Knöpfe (… Events · Rucksack · Shop), Tippfläche ≥ 44 px, nichts überlappt (auch die Namen), Rucksack-Bild', a);
  await bild('leiste');
  // B) Shop → Schilde: nur kaufen; Teleporter mit „Wirklich?“
  const s = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    gems = 2000; updateHud(); openShop('shield'); await warte(300);
    o.keinEinschalten = !document.getElementById('shieldUse') && !/Einschalten/.test(document.querySelector('[data-spane="shield"]').innerText);
    document.querySelector('[data-shield="2"]').click(); o.schild = shieldStock()[2] === 1 && gems === 1920;
    const tk = document.querySelector('[data-tele-kauf]'); o.preis = tk.innerText.replace(/\D/g, '');
    const tt = tk.closest('.ware').querySelector('.ware-txt small'); o.text = { ganz: tt.scrollWidth <= tt.clientWidth + 1, w: tt.clientWidth, sw: tt.scrollWidth };   // (Handy: nicht „Hauptstadt an ei…“)
    tk.click(); o.erst = gems === 1920 && teleVorrat() === 0 && /Wirklich/.test(tk.innerText);
    await warte(600); tk.click(); o.dann = gems === 1420 && teleVorrat() === 1;
    renderShop(); o.link = document.getElementById('shopRucksackN').textContent;
    return o;
  });
  ok(s.keinEinschalten && s.schild, 'Shop → Schilde: nur kaufen (kein „Einschalten“), der Schild liegt im Rucksack', s);
  ok(s.preis === '500' && s.erst && s.dann, 'Teleporter: 500 Edelsteine, erst „Wirklich?“, dann gekauft (in den Rucksack)', s);
  ok(s.text.ganz, 'Shop-Kachel Teleporter: Beschreibung ganz lesbar (nicht abgeschnitten)', s.text);
  ok(/1 Schild · 1 Teleporter/.test(s.link), 'Shop zeigt, was im Rucksack liegt', s.link);
  await p.evaluate(() => document.querySelector('#shopPopup .pbody').scrollTo(0, 1e5)); await p.waitForTimeout(300); await bild('shop_schilde');
  // C) Rucksack: Schild dazu
  const c = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    document.querySelector('[data-zum-rucksack]').click(); await warte(300);
    o.offen = isPanelOpen(rucksackPopup) && !isPanelOpen(shopPopup) && document.getElementById('rucksackBtn').classList.contains('active'); const em = document.querySelector('#rucksackPopup .rk-emblem'); o.kopf = !!em && em.complete && em.naturalWidth > 0;
    const jetzt = serverJetzt(); store.set('openWaterShield', String(jetzt + 3600000)); shieldMemAt = 0; rkTab = null; renderRucksack();
    o.reiter = [...document.querySelectorAll('#rkInhalt [data-rk-tab]')].map(t => t.textContent.replace(/\d/g, '')).join() === 'Tempo,Schilde,Schlüssel,Sonstiges' && document.querySelector('#rkInhalt [data-rk-tab].on').dataset.rkTab === 'schild' && document.querySelectorAll('#rkInhalt .rk-raster .rk-item .bk').length === 1;
    document.querySelector('[data-rk-schild="2"]').click(); await warte(100);
    o.dazu = Math.round((shieldUntil() - jetzt) / 60000); o.weg = shieldStock()[2] === 0;
    o.kaufen = !document.querySelector('[data-rk-schild]') && !document.querySelector('#rkInhalt .rk-raster') && !/Kaufen/.test(document.getElementById('rkInhalt').innerText) && !!document.querySelector('.rk-leer [data-rk-shop="shield"]');
    document.querySelector('[data-rk-tab="sonst"]').click(); o.tele = !!document.querySelector('[data-rk-tele]') && /1× im Rucksack/.test(document.getElementById('rkInhalt').innerText);
    return o;
  });
  ok(c.offen && c.kopf, 'Shop „Rucksack ›“ öffnet den Rucksack (Leisten-Knopf leuchtet, Rucksack-Bild im Kopf)', c);
  ok(c.reiter, 'Rucksack: Reiter Tempo/Schilde/Schlüssel/Sonstiges, Schilde als Kachel im Raster (nur was man hat)', c);
  ok(c.dazu >= 179 && c.dazu <= 181 && c.weg, 'Schild einsetzen: 1 Std. laufend + 2 Std. = 3 Std. (Zeit addiert), Schild aus dem Rucksack weg', c);
  ok(c.kaufen && c.tele, 'Rucksack: ohne Schild kein „Kaufen“, sondern „Im Shop holen“; Teleporter 1× mit „Benutzen“', c);
  // E) Splitter je Held
  const e = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), h = HEROES[0]; const ci = loadCity(); ci.levels.heroes = Math.max(1, ci.levels.heroes || 0); saveCity(); loadHeroes()[h.id].sh = 37; rkTab = 'sonst'; renderRucksack();
    const k = document.querySelector('[data-rk-wahl="h' + h.id + '"]'), o = { da: !!k, zahl: k && k.innerText.includes('37') };
    k.click(); document.querySelector('[data-rk-held="' + h.id + '"]').click(); await warte(300); o.held = !document.getElementById('heroHall').hidden && hhCur === h.id && !isPanelOpen(rucksackPopup);
    closeHeroHall(); openRucksack(); await warte(300); return o;
  });
  ok(e.da && e.zahl && e.held, 'Splitter je Held als Kachel (Anzahl), Tipp → „Zum Helden“ öffnet ihn', e);
  await bild('fenster');
  // D) Teleporter benutzen
  const d0 = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    localStorage.setItem('openWaterWorldStart', String(Date.now() - 10 * 864e5)); for (const br of bridges) clearIslandOwner(br.gateId);
    pendingAttacks.length = 0; pendingSends.length = 0; pendingRetreats.length = 0; fieldMarches.length = 0; barbMarches.length = 0; barbState.camps = [];
    document.querySelector('[data-rk-tele]').click(); await warte(200); o.zu = !isPanelOpen(rucksackPopup);
    const cap = islandById[playerIslandId], lm = landmasses[cap.landmassId], frei = [];
    for (let x = lm.x - lm.shapeMaxR; x < lm.x + lm.shapeMaxR; x += 2500) for (let y = lm.y - lm.shapeMaxR; y < lm.y + lm.shapeMaxR; y += 2500)
      if (gebietAn(x, y) === lm.id && !tpPruefen('player', x, y)) frei.push([x, y]);
    window.__frei = frei.filter(q => Math.hypot(q[0] - cap.x, q[1] - cap.y) > 12000); o.frei = __frei.length; return o;
  });
  const tippe = i => p.evaluate(i => { const z = __frei.filter(q => !tpPruefen('player', q[0], q[1]))[i];   // (nicht neben der schon verlegten Hauptstadt: „steht schon hier“)
    revealAround(z[0], z[1], REVEAL_BASE, true); mapState.zoom = Math.max(mapState.zoom, .02); mapState.offsetX = viewW / 2 - z[0] * mapState.zoom; mapState.offsetY = viewH / 2 - z[1] * mapState.zoom; requestRender();
    feldRingZu(); handleTap(viewW / 2, viewH / 2); const k = document.querySelector('#feldRing [data-fring="tp"]'); return k ? k.textContent.trim() : ''; }, i);
  const bestaetigen = () => p.evaluate(async () => { const warte = ms => new Promise(f => setTimeout(f, ms)), tp = () => document.querySelector('#feldRing [data-fring="tp"]');
    const g0 = gems, n0 = teleVorrat(); window.__befehle.length = 0; tp().click(); const frage = tp().textContent; await warte(600); tp().click(); await warte(100);
    const tb = window.__befehle.find(x => x[0] === 'teleport'); return { frage, gems: g0 - gems, tele: n0 - teleVorrat(), gratis: tb ? tb[1].gratis : store.get('openWaterTpGratis') === '1', ring: document.getElementById('feldRing').hidden }; });
  ok(d0.zu && d0.frei >= 3, 'Rucksack „Benutzen“: Fenster zu, Karte zur Zielwahl', d0);
  await p.waitForTimeout(1500);   // (die Karte fährt zur Hauptstadt)
  const k1 = await tippe(0); await p.waitForTimeout(300); await bild('feld');
  const d1 = await bestaetigen();
  ok(/1 Teleporter/.test(k1) && /1 Teleporter/.test(d1.frage) && d1.gems === 0 && d1.tele === 1 && d1.gratis === false && d1.ring, 'freies Feld mit Teleporter: „1 Teleporter“ statt 500, verbraucht ihn, keine Edelsteine (nicht gratis)', { k1, d1 });
  const k2 = await tippe(1), d2 = await bestaetigen();
  ok(/500/.test(k2) && d2.gems === 500 && d2.tele === 0, 'ohne Teleporter wie bisher 500 Edelsteine', { k2, d2 });
  // Gratis-Teleporter neuer Spieler: liegt als 1 Teleporter im Rucksack, geht vor dem gekauften
  const g = await p.evaluate(() => { store.set('openWaterNeulingBis', String(Date.now() + 36e5)); store.remove('openWaterTpGratis'); store.set('openWaterTeleporter', '1');
    rkTab = 'sonst'; rkWahl = null; openRucksack(); return { n: teleImRucksack(), text: document.getElementById('rkInhalt').innerText }; });
  ok(g.n === 2 && /2× im Rucksack/.test(g.text) && /gratis/.test(g.text), 'neuer Spieler: Gratis-Teleporter liegt (zusätzlich) im Rucksack', g);
  await p.evaluate(() => closeAllPopups());
  const k3 = await tippe(2), d3 = await bestaetigen();
  ok(/1 Teleporter/.test(k3) && d3.gems === 0 && d3.tele === 0 && d3.gratis === true, 'zuerst der Gratis-Teleporter (gratis verbraucht), der gekaufte bleibt', { k3, d3 });
  const g2 = await p.evaluate(() => ({ n: teleImRucksack(), vorrat: teleVorrat() }));
  ok(g2.n === 1 && g2.vorrat === 1, 'danach: 1 gekaufter Teleporter übrig', g2);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
