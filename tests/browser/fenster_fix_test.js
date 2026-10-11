// Fenster-Fehler aus dem Spieltest 11.10. (3 Testspieler, Handy 390×844 und 375×812, Vorschau ohne Server):
// 1 Tägliche Belohnung: „Abholen“ im Events-Fenster holt sofort ab (kein zweites „Abholen“), „Erhalten“ zeigt Bild + Name + Zahl
// 2 Seltenheit grammatisch („Epische Waffe“, „Gewöhnliche Stiefel“, „Ungewöhnlicher Schild“) · 3 keine „Turm #N“, Version klein
// 5 Kachel-Zahlen kurz (154K statt „154,6 Tsd.“), Rucksack-Namen ganz, Beschleuniger-Dauer im Rahmen, Bericht „Stufe 1“ ohne Umbruch,
//   Bündnis-Farben verschieden + „Gründen“-Leiste, Lager-Zeilen lesbar, aktiver Wahl-Knopf ohne dunkles Viereck, Burg „Fällt nie“ beim Schutz
// 6 Karten-Knöpfe gehen zu, sobald ein Fenster aufgeht, oben am Rand nach unten · 7 Shop „Markt“ so hoch wie „Kisten“
// 8 Sieg-Band nie unter dem Hinweis · 9 Stadt: runder Knopf nie auf dem Schild
//   node tests/browser/fenster_fix_test.js <vorschau (test)>
const { chromium } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  for (const [w, h] of [[390, 844], [375, 812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof islands !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const art = w + ' px';
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {}, rr = el => el.getBoundingClientRect();
      const schnitt = (a, c) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      // 1) Tägliche Belohnung: ein Tipp im Events-Fenster
      dailyState = { last: null, day: 0 }; closeAllPopups(); openGoals('reward'); await warte(300);
      document.querySelector('#dailyCard [data-daily]').click(); await warte(300);
      const li = [...document.querySelectorAll('#dailyModalRewards li.bk-mit')];
      o.daily = { offen: !dailyModal.hidden, label: document.getElementById('dailyModalLabel').textContent, knopf: document.getElementById('dailyModalBtn').textContent.trim(), abgeholt: !dailyClaimable(),
        kacheln: li.map(x => [!!x.querySelector('.bk img'), (x.querySelector('small') || {}).textContent || '', (x.querySelector('.bk > b') || {}).textContent || '']) };
      closeDailyModal(); closeAllPopups();
      // 2) Grammatik
      o.gram = [rarTeil(3, 'weapon'), rarTeil(0, 'boots'), rarTeil(1, 'shield'), rarTeil(4, 'armor'), rarWort(2, 'Kiste'), beuteName({ a: 'item', slot: 'shield', r: 3 })];
      // 3) keine technischen Nummern
      const t = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !i.guardian && !bossAt(i.id));
      const cap = islandById[playerIslandId];
      o.namen = [islandTitle(t), deineBasis(t), deineBasis(cap, true), ortName(t, true)];
      openPanel(profilePopup); showProfileTab('set'); await warte(200);
      const v = document.getElementById('setVersion'); o.version = { gross: parseFloat(getComputedStyle(v.parentNode).fontSize), kv: !!v.closest('.kv') };
      closeAllPopups();
      // 5a) Kachel-Zahlen
      o.zahlen = [beuteMenge({ a: 'coins', n: 154600 }), beuteMenge({ a: 'coins', n: 20000 }), beuteMenge({ a: 'gems', n: 10 }), beuteMenge({ a: 'item', slot: 'weapon', r: 0, n: 1, mitZahl: true })];
      // 5b) Rucksack: volle Namen, Beschleuniger-Dauer im Rahmen
      for (const hd of HEROES.slice(0, 8)) heroGrantShards('player', 3, hd.id);
      gibBelohnung('besch', 2, '1m'); rkTab = 'sonst'; rkWahl = null; openRucksack(); await warte(300);
      o.rkNamen = [...document.querySelectorAll('.rk-item small')].filter(s => s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1).map(s => s.textContent);
      rkTab = 'tempo'; renderRucksack(); await warte(200);
      const z = document.querySelector('#rkInhalt .bk-zeit'), k = z.closest('.bk'), zr = rr(z), kr = rr(k);
      o.besch = { innen: zr.left >= kr.left + 2 && zr.right <= kr.right - 2 && zr.top >= kr.top + 2, mitte: Math.abs((zr.left + zr.right) / 2 - (kr.left + kr.right) / 2) < 2 };
      const an = document.querySelector('.rk-tabs button.on'); o.chip = getComputedStyle(an).backgroundColor;
      closeAllPopups();
      // 5c) Bericht: „Stufe 1“ bricht nicht um
      addCombatLogEntry({ type: 'barb', L: 1, won: true, atk: 575, def: 500, left: 0, kill: 500, troops: 575, gef: 500, loss: 500, wounded: 0, gold: 30000, kGold: 0, crate: '', sh: '', sourceId: playerIslandId, up: 1, open: 2 });
      document.getElementById('battleLogBtn').click(); await warte(200); showBattleTab('berichte'); await warte(300);
      const titel = [...document.querySelectorAll('#battleLogPopup .logRow')].map(e => e.textContent).find(x => x.includes('Barbaren-Lager · Stufe'));
      o.bericht = !!titel && titel.includes('Stufe\u00a01');   // (geschütztes Leerzeichen: „Stufe“ und „1“ trennt kein Umbruch)
      closeAllPopups();
      // 5d) Bündnis: 12 verschiedene Farben, „Gründen“ in einer festen Leiste mit „Offen für alle“
      const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), F = BUND.FARBEN.map(hex);
      let nah = 1e9; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) nah = Math.min(nah, Math.hypot(...F[i].map((x, q) => x - F[j][q])));
      bundOeffnen(); await warte(300); bundPopup.querySelector('[data-bact="gruendenAuf"]').click(); await warte(300);
      const fuss = bundPopup.querySelector('.bd-gf-fuss'), pb = bundPopup.querySelector('.pbody');
      o.bund = { nah: Math.round(nah), fuss: !!fuss && getComputedStyle(fuss).position === 'sticky' && !!fuss.querySelector('.bd-gf-los') && !!fuss.querySelector('#bdOffen'),
        sicht: rr(fuss.querySelector('.bd-gf-los')).bottom <= rr(pb).bottom + 1, vorschau: document.getElementById('bdVorschau').innerText.split('\n')[0] };
      closeAllPopups();
      // 5e) Lager: Zeilen lesbar, „Heute“ ohne doppeltes „heute“
      const c = barbState.camps.find(x => x.L <= 1) || barbState.camps[0];
      if (c) { openBarbSheet({ kind: 'camp', id: c.id }); await warte(300); const fl = document.querySelector('#barbSheet .field-lines');
        const ref = document.createElement('i'); ref.style.color = 'var(--tx-2)'; document.body.appendChild(ref);
        o.lager = { farbe: getComputedStyle(fl).color === getComputedStyle(ref).color, text: fl.innerText.replace(/\n/g, ' ') }; ref.remove(); closeBarbSheet(); }
      // 5f) Burg: „Fällt nie …“ direkt beim Schutz, vor „schaltet frei“
      openCity(); await warte(1500); cityPage = 'bau'; cityOpenId = '_keep'; renderCitySheet(); await warte(300);
      const ex = document.getElementById('cityBExtra'), nt = ex.querySelector('.keep-note'), fr = ex.querySelector('.keep-frei');
      o.burg = !!nt && !!fr && !!(nt.compareDocumentPosition(fr) & Node.DOCUMENT_POSITION_FOLLOWING) && rr(fr).top - rr(nt).bottom >= 14;
      // 9) Stadt: der runde Knopf liegt nie auf dem Schild (auch ganz unten an der Leiste)
      cityOpenId = null; document.getElementById('citySheet').hidden = true; await warte(300);
      const schilder = cityNamen.slice(); o.ring = [];
      for (const s of schilder) { cityRingAuf(s.id); await warte(250); const q = cityNamen.find(x => x.id === s.id) || s;
        for (const kn of document.querySelectorAll('#cityRing .cr-btn')) { const a = rr(kn), lab = rr(kn.querySelector('small'));
          const sch = { left: q.x, right: q.x + q.w, top: q.y, bottom: q.y + q.h }; if (schnitt(a, sch) > 4 || schnitt(lab, sch) > 4) o.ring.push(s.id); } }
      cityRingZu(); closeCity(); await warte(2500);   // (Kamera ruht wieder)
      // 6) Karten-Knöpfe: gehen zu, wenn ein Fenster aufgeht; oben am Rand stehen sie unter der Stelle
      feldRingAuf(innerWidth / 2, innerHeight / 2); await warte(100); const vorher = !document.getElementById('feldRing').hidden;
      openShop('gems'); await warte(200); o.feld = { vorher, nachher: !document.getElementById('feldRing').hidden };
      closeAllPopups(); await warte(200);
      let da = false; for (let y0 = 95; y0 < 140 && !da; y0 += 5) for (let x0 = 100; x0 < innerWidth - 100 && !da; x0 += 20) da = feldRingAuf(x0, y0);
      await warte(500); const hud = rr(document.getElementById('hud')).bottom;
      o.feldOben = [...document.querySelectorAll('#feldRing .cr-btn')].map(x => Math.round(rr(x).top - hud)); feldRingZu();
      // 7) Shop: alle Reiter gleich hoch
      const hs = {}; for (const tb of ['gems', 'markt']) { openShop(tb); await warte(300); hs[tb] = Math.round(rr(shopPopup).height); } o.shop = hs; closeAllPopups();
      // 8) Sieg-Band: nie über dem Hinweis
      const ins = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !i.guardian && !bossAt(i.id) && i.id !== t.id) || t;
      mapState.offsetX = innerWidth / 2 - ins.x * mapState.zoom; mapState.offsetY = 190 - ins.y * mapState.zoom; requestRender(); await warte(200);
      flashHint('Sieg bei ' + islandTitle(ins) + '! 4.443 übrig.', 6000); spawnBattleFx(ins.id, true, 'Sieg', 'Basis erobert'); await warte(1200);
      const proben = [];   // 10 Proben je nach einem Bild: liegt das Band über dem Hinweis, muss der Hinweis zurücktreten (ein Bild Verzug erlaubt)
      for (let n = 0; n < 10 && battleFx.length; n++) { await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));
        const ht = rr(hintEl), fx = battleFx[battleFx.length - 1], sx = fx.x * mapState.zoom + mapState.offsetX, sy = fx.y * mapState.zoom + mapState.offsetY;
        ctx.save(); const band = mzErgebnisBand(fx, 0, 1, sx, sy); ctx.restore();
        proben.push(schnitt(ht, { left: band.x - band.w / 2, right: band.x + band.w / 2, top: band.y - band.h / 2, bottom: band.y + band.h / 2 }) > 0 && !hintEl.classList.contains('toast--zurueck')); }
      o.band = { proben: proben.length, darueber: proben.filter(Boolean).length };
      return o;
    });
    const d = r.daily;
    ok(d.offen && d.abgeholt && d.label === 'Erhalten' && /Weiter/.test(d.knopf), art + ': Tägliche Belohnung – ein Tipp auf „Abholen“ holt ab, Fenster zeigt „Erhalten“ + „Weiter“', d);
    ok(d.kacheln.length >= 1 && d.kacheln.every(([bild, name, zahl]) => bild && name.length > 2 && /^\d/.test(zahl)), art + ': „Erhalten“ – jede Sache mit Bild, Name und Zahl', d.kacheln);
    ok(JSON.stringify(r.gram) === JSON.stringify(['Epische Waffe', 'Gewöhnliche Stiefel', 'Ungewöhnlicher Schild', 'Legendäre Rüstung', 'Seltene Kiste', 'Epischer Schild']), art + ': Seltenheit grammatisch richtig', r.gram);
    ok(r.namen.every(n => !/#\d/.test(n)) && /^Basis Stufe \d+$/.test(r.namen[0]) && /^deine Basis Stufe \d+$/.test(r.namen[1]) && r.namen[2] === 'deiner Hauptstadt', art + ': keine „Turm #N“ – „Basis Stufe N“, „deine Basis Stufe N“, „deiner Hauptstadt“', r.namen);
    ok(r.version.gross <= 11 && !r.version.kv, art + ': Version in den Einstellungen klein und unauffällig', r.version);
    ok(JSON.stringify(r.zahlen) === JSON.stringify(['154K', '20K', '10', '1']), art + ': Kachel-Zahlen kurz wie im HUD (154K, 20K), einzelnes Teil mit „1“', r.zahlen);
    ok(r.rkNamen.length === 0, art + ': Rucksack – alle Namen ganz lesbar (kein „Splitter Br…“)', r.rkNamen);
    ok(r.besch.innen && r.besch.mitte, art + ': Beschleuniger – „1 Min“ mittig im Kachel-Rahmen', r.besch);
    ok(/rgba\(0, 0, 0, 0\)|transparent/.test(r.chip), art + ': aktiver Wahl-Knopf ohne dunkles Viereck dahinter', r.chip);
    ok(r.bericht, art + ': Bericht „Barbaren-Lager · Stufe 1“ – „Stufe 1“ bleibt zusammen', r.bericht);
    ok(r.bund.nah >= 40 && r.bund.fuss && r.bund.sicht && r.bund.vorschau === 'Dein Bündnis', art + ': Bündnis gründen – 12 klar verschiedene Farben, „Gründen“ mit „Offen für alle“ in fester Leiste, Vorschau ohne „[…]“', r.bund);
    ok(r.lager && r.lager.farbe === true && !/heute/.test(r.lager.text.replace(/Heute/, '')), art + ': Lager-Fenster – Zeilen lesbar (--tx-2), kein doppeltes „heute“', r.lager);
    ok(r.burg, art + ': Burg – „Fällt nie …“ direkt beim Schutz, Abstand zu „schaltet frei“', r.burg);
    ok(r.ring.length === 0, art + ': Stadt – runder Knopf samt Beschriftung nie auf einem Schild', r.ring);
    ok(r.feld.vorher && !r.feld.nachher, art + ': Karten-Knöpfe gehen zu, sobald ein Fenster aufgeht', r.feld);
    ok(r.feldOben.length === 3 && r.feldOben.every(v => v >= 0), art + ': Tipp ganz oben – Knöpfe unter der Rohstoff-Leiste', r.feldOben);
    ok(Math.abs(r.shop.gems - r.shop.markt) <= 2, art + ': Shop – „Markt“ so hoch wie „Kisten“', r.shop);
    ok(r.band.proben >= 5 && r.band.darueber <= 1, art + ': Sieg-Band liegt nicht unter dem Hinweis (ausgewichen oder Hinweis tritt zurück)', r.band);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
