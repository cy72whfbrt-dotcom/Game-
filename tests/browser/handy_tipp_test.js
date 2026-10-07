// Gesamt-Spieltest 6.10. (fix-st2), Handy (390×844) + Desktop: Tippflächen ≥ 44 px (sichtbar kleiner erlaubt: Rohstoffe, Anleitung-×,
// „Spähen“, Prozent-Chips, „Abholen“, „2. Bauarbeiter“, Kartenknöpfe), Anleitung Schritt 2 + Angriff mit „Alle“ aus der Hauptstadt sagt
// „… bleibt deine Hauptstadt ohne Truppen“ (nur Hinweis; das Fenster bleibt ≤ 55 % hoch), Profil → Rangliste/Einstellungen mit echtem Tipp, Heldenkisten: Tipp auf die ganze Karte fragt „Wirklich?“
// (ab 500), Wochen-Event-Chip springt nicht, wenn der Rang erscheint, Stadt: Stadtbild füllt den Bildschirm, jedes Gebäude erreichbar, Funde auf der Karte
// beschriftet und nie auf einem Namensschild. Bilder in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof islandById !== 'undefined' && islandById[playerIslandId] && typeof cityStartZoom === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const ev = (f, a) => p.evaluate(f, a), bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png') }); };
    const tap = async sel => { const e = await p.$(sel); if (e) await e.scrollIntoViewIfNeeded().catch(() => {}); const r = e && await e.boundingBox(); if (!r) return false;
      if (art === 'Handy') await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); return true; };
    await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      window.__tipp = e => { const r = e.getBoundingClientRect(); if (!r.width) return null; const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;   // Trefferfläche um die Mitte
        const drin = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); };
        let w = 0, h = 0; for (let d = 0; d <= 22; d++) { if (drin(cx + d, cy) && drin(cx - d, cy)) w = 2 * d; else break; } for (let d = 0; d <= 22; d++) { if (drin(cx, cy + d) && drin(cx, cy - d)) h = 2 * d; else break; }
        return { sicht: Math.round(r.width) + 'x' + Math.round(r.height), w, h }; };
      window.__t44 = sel => [...document.querySelectorAll(sel)].filter(x => x.offsetParent).map(x => window.__tipp(x)).filter(Boolean); });
    const gross = L => L.length > 0 && L.every(t => t.w >= 42 && t.h >= 42);   // (±21 px um die Mitte = 44 px Fläche)
    // 1) Karte: Rohstoffe, Kartenknöpfe; Anleitung-×
    const k = await ev(() => { const a = document.getElementById('anleitung'); a.hidden = false; const o = { roh: __t44('#hudRoh'), ctl: __t44('.mapctl button'), x: __t44('#anleitungWeg') }; a.hidden = true; return o; });
    ok(gross(k.roh) && gross(k.ctl) && gross(k.x), art + ': Rohstoffe, Kartenknöpfe und Anleitung-× mit Tippfläche ≥ 44 px', k);
    // 2) Angriff aus der Hauptstadt mit „Alle“: Hinweis; „Spähen“ und Prozent-Chips ≥ 44 px
    const a = await ev(async () => { const w = ms => new Promise(f => setTimeout(f, ms)), h = islandById[playerIslandId];
      const nb = islands.filter(i => !islandOwnerOf(i.id) && !bossAt(i.id) && i.type !== 'megaTemple').sort((x, y) => Math.hypot(x.x - h.x, x.y - h.y) - Math.hypot(y.x - h.x, y.y - h.y))[0];
      scoutedIslands.delete(nb.id); islandTroops[playerIslandId] = Math.max(1000, islandTroops[playerIslandId] || 0); openIslandPopup(nb); attackBtn.click(); await w(400);
      const s0 = anleitung.schritt, an = document.getElementById('anleitung'); anleitung.schritt = 1;
      const leer = () => { anleitungZeigen(); return /bleibt deine Hauptstadt ohne Truppen/.test(document.getElementById('anleitungText').textContent); };
      const o = { quelle: previewSourceId === playerIslandId, alle: leer(), spaeh: __t44('.ap-spaehen'), chips: __t44('.ap-regler .seg button') };
      popupStats.querySelector('[data-preview="quick"] [data-f=".5"]').click(); await w(100); o.halb = leer();
      popupStats.querySelector('[data-preview="quick"] [data-f="1"]').click(); await w(100); o.wieder = leer();
      o.truppen = islandTroops[playerIslandId] > 0; const tx = document.getElementById('anleitungText');
      o.zeilen = Math.round(tx.getBoundingClientRect().height / parseFloat(getComputedStyle(tx).lineHeight)); o.ganz = tx.scrollHeight <= tx.clientHeight + 1; o.text = tx.textContent; anleitung.schritt = s0; anleitungZeigen(); an.hidden = true; return o; });
    await bild('angriff');
    ok(a.quelle && a.alle && !a.halb && a.wieder && a.truppen && a.zeilen <= 2 && a.ganz, art + ': Anleitung + Angriff mit „Alle“ aus der Hauptstadt: Hinweis „… bleibt deine Hauptstadt ohne Truppen“ (bei 50 % nicht, nichts abgezogen, ganz in ≤ 2 Zeilen)', a);
    ok(gross(a.spaeh) && gross(a.chips), art + ': „Spähen“ und 25/50/75 %/Alle mit Tippfläche ≥ 44 px', { spaeh: a.spaeh, chips: a.chips });
    await ev(() => closeAllPopups());
    // 3) Events: „Abholen“ ≥ 44 px
    const e = await ev(async () => { inboxAdd({ src: 'gift', title: 'Tipptest', gems: 1, crate: 0 }); openGoals('reward'); await new Promise(f => setTimeout(f, 500)); const o = __t44('#goalsPopup [data-inbox]'); closeAllPopups(); return o; });
    ok(gross(e), art + ': Events „Abholen“ mit Tippfläche ≥ 44 px', e);
    // 4) Profil → Rangliste / Einstellungen mit echtem Tipp
    await ev(() => closeAllPopups()); await tap('#hudPlayer'); await p.waitForTimeout(700);
    const pr = { offen: await ev(() => isPanelOpen(profilePopup)) }; await tap('#tabBtnRank'); await p.waitForTimeout(700);
    pr.rang = await ev(() => isPanelOpen(document.getElementById('rankPopup')));
    await ev(() => closeAllPopups()); await tap('#hudPlayer'); await p.waitForTimeout(700); await tap('#tabBtnSet'); await p.waitForTimeout(500);
    pr.set = await ev(() => isPanelOpen(profilePopup) && profilePopup.dataset.tab === 'set');
    ok(pr.offen && pr.rang && pr.set, art + ': Profil → Rangliste und Einstellungen öffnen sich mit echtem Tipp', pr);
    await ev(() => closeAllPopups());
    // 5) Heldenkisten: Tipp auf das Bild der Karte = Preis-Knopf, ab 500 erst „Wirklich?“
    await ev(() => { gems = 5000; updateHud(); }); await tap('#shopBtn'); await p.waitForTimeout(700);
    const ks = {};
    for (const id of ['hc3', 'hcE']) { await p.waitForTimeout(900); const g0 = await ev(() => gems);   // (nach einem Kauf rollt das Ergebnis weich ins Bild)
      await tap('#heroChestOpts .ware:has([data-hchest="' + id + '"]) .ware-bild'); await p.waitForTimeout(200);
      ks[id] = await ev(([id, g0]) => { const bt = document.querySelector('[data-hchest="' + id + '"]'); return { frage: /Wirklich\?/.test(bt.textContent), nichtsWeg: gems === g0 }; }, [id, g0]);
      await p.waitForTimeout(600); await tap('#heroChestOpts .ware:has([data-hchest="' + id + '"]) .ware-bild'); await p.waitForTimeout(300);
      ks[id].gekauft = await ev(([id, g0]) => g0 - gems === HERO_CHESTS.find(c => c.id === id).gems, [id, g0]); }
    await bild('kisten');
    ok(Object.values(ks).every(x => x.frage && x.nichtsWeg && x.gekauft), art + ': Große/Epische Kiste: Tipp auf die Karte fragt „Wirklich?“, zweiter Tipp kauft', ks);
    await ev(() => closeAllPopups());
    // 6) Wochen-Event-Chip: gleiche Breite ohne und mit Rang
    const wc = await ev(async () => { const on = woOn; woOn = () => true; midBarHtml = ''; renderMidBar(); await new Promise(f => setTimeout(f, 100));
      const c = midBar.querySelector('[data-mb="woche"]'), o = { da: !!c };
      if (c) { o.ohne = c.getBoundingClientRect().width; const pl = c.querySelector('.mb-platz'); pl.classList.remove('is-leer'); pl.textContent = 'Platz 12'; o.mit = c.getBoundingClientRect().width; o.rechts = Math.round(c.getBoundingClientRect().right); }
      woOn = on; midBarHtml = ''; renderMidBar(); return o; });
    ok(wc.da && Math.abs(wc.ohne - wc.mit) < 1, art + ': Wochen-Event-Chip springt nicht, wenn der Rang erscheint', wc);
    if (art === 'Handy') ok(wc.rechts <= 390 - 60, art + ': Wochen-Event-Chip (mit Rang) bleibt links vom Schild „Rohstoffe“', wc);
    // 7) Funde auf der Karte: beschriftet, nie auf einem Namensschild
    const fu = await ev(async () => { const h = islandById[playerIslandId]; flyTo(h.x, h.y, { zoom: Math.max(mapState.zoom, .02), ms: 1 }); await new Promise(f => setTimeout(f, 400)); requestRender(); await new Promise(f => setTimeout(f, 300));
      const br = bannerHitRects.find(q => q.id === playerIslandId), s = br && { x: br.x + br.w / 2, y: br.y + br.h / 2 }, w = s && screenToWorld(s.x, s.y);
      if (!w) return { schild: false };
      const alt = pickups; pickups = [{ x: w.x, y: w.y, kind: 'coin', amount: 500, born: performance.now() - 1000, expires: Date.now() + 30000 }];
      const o = { schild: true, verdeckt: pickupVerdeckt(pickupScreenPos(pickups[0])), nimmt: collectPickupAt(s.x, s.y) };
      pickups = alt; return o; });
    ok(fu.schild && fu.verdeckt && !fu.nimmt, art + ': Fund auf einem Namensschild wird nicht gezeigt (und nicht genommen)', fu);
    // 8) Stadt: 2. Bauarbeiter ≥ 44 px, das Stadtbild füllt den Bildschirm, jedes Gebäude erreichbar
    const st = await ev(async () => { cityCam = null; openCity(); const t0 = Date.now(); while (Date.now() - t0 < 15000 && (cityBusy || cityView.hidden || !cityCam || cityCam.anim)) await new Promise(f => setTimeout(f, 100));
      await new Promise(f => setTimeout(f, 300)); const W = innerWidth, c = cityCam, raus = [];
      const ox = W / 2 - c.x * c.z, oy = innerHeight / 2 - c.y * c.z; const rand = W < 900 && innerHeight > 500 ? 75 : 0; if (ox > .5 || oy > rand + .5 || ox + CITY_BILD_W * c.z < W - .5 || oy + CITY_BILD_H * c.z < innerHeight - rand - .5) raus.push('Bildrand');   // das Stadtbild deckt den Bildschirm (Handy hochkant: zwischen HUD und Leiste)
      const schilder = cityNamen.map(n => n.id), fehlen = [];
      for (const id of Object.keys(CITY_ORTE)) { cityFocus(id, true); cityFrame.drawn = 0; await new Promise(f => setTimeout(f, 120)); if (!cityNamen.some(n => n.id === id)) fehlen.push(id); }   // jedes Gebäude per Wischen mit Schild
      cityFocus('_keep', true); return { z: Math.round(c.z * 100) / 100, raus, schilder, fehlen, bau: __t44('[data-cb-buy]') }; });
    await bild('stadt');
    ok(!st.raus.length && st.schilder.includes('_keep'), art + ': Stadt-Start: das Stadtbild füllt den Bildschirm, die Burg mit Schild', st);
    ok(!st.fehlen.length, art + ': Stadt: jedes Gebäude per Wischen erreichbar, mit Namensschild', st);
    if (st.bau.length) ok(gross(st.bau), art + ': „2. Bauarbeiter“ mit Tippfläche ≥ 44 px', st.bau);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine');
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
