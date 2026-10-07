// Fenster-Feinschliff aus dem Spieltest 7.10. (Vorschau ohne Server, Handy 390×844 + Desktop 1440×900):
// A) Rucksack: „Kaufen“ zeigt den Preis mit Edelstein (wie im Shop); Handy: eine Splitter-Reihe (4 Helden) steht ganz im Fenster (nicht unter der Blende)
// B) Pass (Handy): die Premium-Reihe steht ganz im Fenster
// C) Shop „Markt“ (Handy): so hoch wie die anderen Fenster (keine leere Fläche); „Kisten“ bleibt die hohe Ausnahme
// D) Reiter Rangliste („Thron-Punkte“) und Profil („Einstellungen“): Text ≥ 8 px vom Rand
// E) Events → Abholen: „Tag 1: … / Bereit zum Abholen“ klebt nicht am linken Rand
// F) Desktop: Hinweis bei offenem Basis-Fenster liegt nicht über dem Fenster (z. B. „Zum Verlegen brauchst du …“)
// G) Marsch-Meldungen ohne falsches „zu Neutrale Basis“: „Späher unterwegs: Neutrale Basis …“
//   node tests/browser/fenster_fein_test.js <vorschau> [bilder]
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 500) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', bilder = process.argv[3] || null, fe = [];
  for (const art of ['Handy', 'Desktop']) {
    const ctx = await b.newContext(art === 'Handy' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.addInitScript(() => { const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht() {}, befehl() {}, profilZuBot(p, b) { return b; } };
      window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] }); });
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof renderRucksack === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      document.querySelectorAll('body > div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }); closeAllPopups(); flashHint('', 1);
      anleitung.schritt = 0; anleitungZeigen(); });
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, art.toLowerCase() + '_' + n + '.png') }); };
    await bild('anleitung'); await p.evaluate(() => { anleitung.schritt = ANLEITUNG.length; anleitungZeigen(); });   // (Bild: Anleitung Schritt 1, ganz lesbar)
    const ev = (f, a) => p.evaluate(f, a);
    // „frei“: Abstand vom Ende des Elements bis zum unteren Rand des Fensterinhalts (≥ 30: nicht unter der Blende)
    const frei = sel => ev(sel => { const pb = document.querySelector('.panel.is-open > .pbody'), e = document.querySelector(sel); return pb && e ? Math.round(pb.getBoundingClientRect().bottom - e.getBoundingClientRect().bottom) : null; }, sel);
    // A) Rucksack (Anfängerschutz-Zeile zweizeilig, 4 Helden mit Splittern, kein Schild, kein Teleporter – wie im Spieltest)
    await ev(() => { store.set('openWaterNeulingBis', String(Date.now() + 2 * 86400000)); store.set('openWaterShield', '0'); shieldMemAt = 0; store.remove('openWaterShieldStock'); store.remove('openWaterTeleporter'); store.set('openWaterTpGratis', '1');
      HEROES.forEach((h, i) => { const s = heroSt('player', h.id); if (s) s.sh = i < 4 ? 4 : 0; }); saveHeroes(); openRucksack(); });
    await p.waitForTimeout(500); await ev(() => { HEROES.forEach((h, i) => { const s = heroSt('player', h.id); if (s) s.sh = i < 4 ? 4 : 0; }); saveHeroes(); renderRucksack(); }); await p.waitForTimeout(300);   // (die Test-Vorschau setzt die Helden beim Start noch einmal)
    const rk = await ev(() => [...document.querySelectorAll('#rkInhalt [data-rk-kauf]')].map(k => ({ text: k.textContent.replace(/\s+/g, ''), gem: !!k.querySelector('.icon') })));
    ok(rk.length === 4 && rk.every(k => k.gem) && rk.map(k => k.text).join('|') === 'Kaufen80|Kaufen300|Kaufen700|Kaufen500', art + ': Rucksack – „Kaufen“ mit Preis und Edelstein (80/300/700, Teleporter 500)', rk);
    if (art === 'Handy') { const f = await frei('#rkInhalt .rk-splitter'); ok(f >= 30, art + ': Rucksack – Splitter-Reihe ganz im Fenster (nicht abgeschnitten)', f); }
    await bild('rucksack');
    const hRuck = await ev(() => Math.round(rucksackPopup.getBoundingClientRect().height));
    // B) Pass
    await ev(() => { closeAllPopups(); openGoals(); showGoalsTab('pass'); }); await p.waitForTimeout(500);
    if (art === 'Handy') { const f = await frei('#passPane .pass-prem'); ok(f >= 30, art + ': Pass – Premium-Reihe ganz im Fenster', f); }
    await bild('pass');
    // E) Abholen: tägliche Belohnung mit Abstand zum linken Rand
    await ev(() => { showGoalsTab('reward'); }); await p.waitForTimeout(400);
    const tag = await ev(() => { const r = document.querySelector('#dailyCard .daily-row'), t = r && r.querySelector('.daily-txt'); return r && t ? Math.round(t.getBoundingClientRect().left - r.getBoundingClientRect().left) : null; });
    await bild('abholen');
    ok(tag >= 8, art + ': Abholen – „Tag 1 …“ mit Abstand zum linken Rand (≥ 8 px)', tag);
    // C) Markt so hoch wie die anderen Fenster (Handy), Kisten bleibt höher
    await ev(() => { closeAllPopups(); openShop('markt'); }); await p.waitForTimeout(400);
    const hMarkt = await ev(() => Math.round(shopPopup.getBoundingClientRect().height));
    await bild('markt');
    await ev(() => { showShopTab('gems'); }); await p.waitForTimeout(400);
    const hKisten = await ev(() => Math.round(shopPopup.getBoundingClientRect().height));
    if (art === 'Handy') ok(Math.abs(hMarkt - hRuck) <= 2 && hKisten > hMarkt + 40, art + ': Shop „Markt“ so hoch wie andere Fenster, „Kisten“ höher', { hMarkt, hRuck, hKisten });
    // D) Reiter: Text nie am Rand
    const rand = sel => ev(sel => [...document.querySelectorAll(sel)].filter(x => x.offsetParent).map(x => { const a = x.getBoundingClientRect(), s = x.querySelector('span'), q = s.getBoundingClientRect();
      return { t: s.textContent, l: Math.round(q.left - a.left), r: Math.round(a.right - q.right), voll: s.scrollWidth <= s.clientWidth }; }), sel);
    await ev(() => { closeAllPopups(); openRankings('week'); }); await p.waitForTimeout(400);
    const rr = await rand('#rankTabs .tab'); await bild('rang');
    ok(rr.length === 5 && rr.every(x => x.voll && x.l >= 8 && x.r >= 8), art + ': Rangliste – Reiter-Text ganz und ≥ 8 px vom Rand („Thron-Punkte“)', rr);
    await ev(() => { closeAllPopups(); document.getElementById('profileBtn').click(); showProfileTab('set'); }); await p.waitForTimeout(400);
    const pr = await rand('#profileTabs .tab');
    ok(pr.length === 4 && pr.every(x => x.voll && x.l >= 8 && x.r >= 8), art + ': Profil – Reiter-Text ganz und ≥ 8 px vom Rand („Einstellungen“)', pr);
    const knoepfe = await ev(() => [...document.querySelectorAll('#profilePopup .set-knoepfe button, #profilePopup [data-set-sprung], #profilePopup .set-wahl button')].filter(x => x.offsetParent).length);
    ok(knoepfe > 0, art + ': Einstellungen – Knöpfe sichtbar', knoepfe);
    // F) Desktop: Hinweis nicht über dem offenen Basis-Fenster
    if (art === 'Desktop') {
      const h = await ev(async () => { closeAllPopups(); gems = 0; openIslandPopup(islandById[playerIslandId]); await new Promise(f => setTimeout(f, 400));
        flashHint('Zum Verlegen brauchst du 50 Edelsteine.', 5000); await new Promise(f => setTimeout(f, 100));
        const t = hintEl.getBoundingClientRect(), q = document.getElementById('islandPopup').getBoundingClientRect();
        return { ueber: t.left < q.right && t.right > q.left && t.top < q.bottom && t.bottom > q.top, sicht: t.height > 0 && t.top >= 0, t: [Math.round(t.left), Math.round(t.top), Math.round(t.right), Math.round(t.bottom)], q: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)] }; });
      await bild('hinweis');
      ok(!h.ueber && h.sicht, art + ': Hinweis liegt nicht über dem Basis-Fenster (Knöpfe frei)', h);
      const h2 = await ev(async () => { closeAllPopups(); flashHint('Probe', 5000); await new Promise(f => setTimeout(f, 50)); return hintEl.classList.contains('toast--oben'); });
      ok(!h2, art + ': ohne Fenster bleibt der Hinweis an seinem Platz', h2);
    }
    // G) Späher-Meldung: „unterwegs: Neutrale Basis“ (nicht „unterwegs zu Neutrale Basis“)
    const sp = await ev(() => { closeAllPopups(); const h = islandById[playerIslandId], seen = [];
      const n = islands.filter(i => !islandOwnerOf(i.id) && !bossAt(i.id) && i.type !== 'megaTemple' && /Neutrale Basis/.test(ortName(i))).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y))[0];
      if (!n) return null; const alt = flashHint; flashHint = function (t) { seen.push(t); return alt.apply(this, arguments); };
      try { launchScout(n.id); } finally { flashHint = alt; } return seen.join(' | '); });
    ok(sp && /Späher unterwegs: Neutrale Basis/.test(sp) && !/unterwegs zu Neutrale/.test(sp), art + ': Späher-Meldung „Späher unterwegs: Neutrale Basis …“', sp);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
