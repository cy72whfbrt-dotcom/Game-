// Shop neu (Alexander 8.10., Test-Datei werkzeuge/thronevent ?a=shopkisten|shop|shoptempo) – Handy 390×844 + Desktop:
// A) Reiter Kisten · Event · Tempo · Schilde · Markt (kein Thron; Händler nur bei Besuch), oben Edelsteine + Event-Münzen
// B) Kisten: Ausrüstung/Helden je normal + episch, „1ד/„10ד – mit Schlüssel (genau 1/10 weg, keine Edelsteine), sonst 100/500 Edelsteine;
//    ab 500 erst „Wirklich?“ (Doppel-Tipp zählt nicht); Epische: spätestens beim 20. Mal sicher Lila (Zähler X/20); Schlüssel kaufen 100/500
// C) Event-Shop: nur Event-Münzen, Woche-Limit (danach „ausverkauft“), Schild/Teleporter/Beschleuniger/Schlüssel landen im Rucksack
// D) Tempo: Beschleuniger für Edelsteine; Beschleuniger benutzen beim Bauen (Restzeit kürzer / fertig) und Forschen (Labor)
// E) gibBelohnung (gemeinsam für alle Teams), Kachel mit Bild + Zahl; Rucksack zeigt Schlüssel, Event-Münzen, Beschleuniger
// F) Marsch-Plätze: 2 von Anfang an, +1 je Stufe der Labor-Forschung „Marsch-Plätze“ (Labor 5/10/16/22) – nicht mehr die Burg
// Bilder (Reiter, Rucksack, Labor) in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 600) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof gibBelohnung === 'function' && typeof AUF !== 'undefined' && AUF, null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(2000);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png'), timeout: 120000, animations: 'disabled' }); };
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      document.querySelectorAll('body > div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }); closeAllPopups(); flashHint('', 1);
      for (const d of BOT_DEFS) botNextAt[d.id] = Date.now() + 1e9; });
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), o = {}, bfZu = () => { beuteFensterZu(); };
      eventMuenzen = 0; schluessel1 = 0; schluessel2 = 0; for (const d of BESCH_DAUERN) besch[d] = 0; gegenstSpeichern(); store.remove('openWaterKistenZ'); store.remove('openWaterEvShop');
      // A) Reiter
      gems = 5000; updateHud(); openShop('gems'); await warte(300);
      o.reiter = [...document.querySelectorAll('#shopTabs [data-stab]')].filter(t => !t.hidden).map(t => t.innerText.trim()).join(',');
      o.em = !!document.getElementById('shopEmCount') && !document.getElementById('shopThroneCount');
      // B) Kisten
      const k = (id, n) => document.querySelector('[data-kiste="' + id + '"][data-anz="' + n + '"]');
      o.kisten = { karten: document.querySelectorAll('#shopKisten .ware').length, gruppen: [...document.querySelectorAll('#shopKisten .sort-kopf')].map(x => x.textContent).join(','),
        preise: ['aus', 'ausE', 'held', 'heldE'].map(id => k(id, 1).innerText.replace(/\D/g, '') + '/' + k(id, 10).innerText.replace(/\D/g, '').replace(/^10/, '')).join(' ') };
      let g0 = gems, i0 = Object.keys(inventory).length; k('aus', 1).click(); await warte(50); bfZu();
      o.ausGems = { weg: g0 - gems, teil: Object.keys(inventory).length - i0 };
      gibBelohnung('schluessel1', 12); renderShop(); await warte(50);
      g0 = gems; i0 = Object.keys(inventory).length; k('aus', 10).click(); await warte(50); bfZu();
      o.ausS = { gemsWeg: g0 - gems, s1: schluessel1, teile: Object.keys(inventory).length - i0 };
      g0 = gems; k('held', 1).click(); await warte(50); bfZu(); o.heldS = { gemsWeg: g0 - gems, s1: schluessel1 };
      g0 = gems; i0 = Object.keys(inventory).length; let bt = k('ausE', 1); bt.click(); await warte(50);
      o.epi = { erst: g0 - gems, frage: /Wirklich/.test(k('ausE', 1).innerText) }; k('ausE', 1).click(); o.epi.doppel = g0 - gems;
      await warte(600); const g1 = gems; k('ausE', 1).click(); o.epi.dann = g1 - gems; await warte(50); bfZu(); o.epi.teil = Object.keys(inventory).length - i0;
      // Lila sicher beim 20. Mal: Zähler auf 19, dann eine mit Schlüssel 2
      kistenZSetzen({ ausE: 19, heldE: 19 }); gibBelohnung('schluessel2', 2); renderShop(); await warte(50);
      o.pityText = k('ausE', 1).closest('.ware').innerText.includes('19/20');
      i0 = new Set(Object.keys(inventory)); k('ausE', 1).click(); await warte(50); bfZu();
      const neu = Object.values(inventory).filter(it => !i0.has(it.id)); o.pity = { r: neu.map(it => it.rarity), z: kistenZ().ausE, s2: schluessel2 };
      const sh0 = HEROES.reduce((a, h) => a + (heroSt('player', h.id).sh || 0), 0), epi0 = HEROES.filter(h => h.r === 3).reduce((a, h) => a + (heroSt('player', h.id).sh || 0), 0);
      k('heldE', 1).click(); await warte(50); bfZu();
      o.heldPity = { epiDazu: HEROES.filter(h => h.r === 3).reduce((a, h) => a + (heroSt('player', h.id).sh || 0), 0) - epi0, alle: HEROES.reduce((a, h) => a + (heroSt('player', h.id).sh || 0), 0) - sh0, z: kistenZ().heldE };
      g0 = gems; const s1 = schluessel1; document.querySelector('[data-s-kauf="1"]').click(); o.sKauf = { weg: g0 - gems, s1: schluessel1 - s1 };
      // C) Event-Shop
      gibBelohnung('eventMuenzen', 3000); showShopTab('ev'); await warte(200);
      o.ev = { gruppen: [...document.querySelectorAll('#shopEvent .sort-kopf')].map(x => x.textContent).join(','), karten: document.querySelectorAll('#shopEvent .ware').length, guthaben: document.querySelector('#shopEvent .ev-guthaben').innerText.includes('3.000') };
      const st0 = shieldStock()[8]; document.querySelector('[data-ev-kauf="schild8"]').click(); await warte(30); bfZu();
      document.querySelector('[data-ev-kauf="schild8"]').click(); await warte(30); bfZu();
      o.ev.schild = shieldStock()[8] - st0; o.ev.em = eventMuenzen; renderShop(); await warte(30);
      const sk = document.querySelector('[data-ev-kauf="schild8"]'); o.ev.aus = sk.disabled && /ausverkauft/.test(sk.closest('.ware').innerText);
      document.querySelector('[data-ev-kauf="b1h"]').click(); await warte(30); o.ev.besch = besch['1h']; o.ev.fenster = !!document.querySelector('#beuteFenster .bk[data-beute="besch"]'); bfZu();
      // D) Tempo + benutzen
      showShopTab('tempo'); await warte(100); g0 = gems; document.querySelector('[data-tempo-kauf="5m"]').click(); o.tempo = { weg: g0 - gems, n: besch['5m'], karten: document.querySelectorAll('#shopTempo .ware').length };
      const c = loadCity(); c.builds = [{ id: 'lumber', to: (c.levels.lumber || 0) + 1, startedAt: Date.now(), endsAt: Date.now() + 90 * 60000 }]; saveCity();
      closeAllPopups(); beschWahl('bau:lumber'); await warte(100);
      const vor = cityBuildOf(loadCity(), 'lumber').endsAt; document.querySelector('[data-besch-d="5m"]').click(); await warte(50);
      o.bau = { kuerzer: Math.round((vor - cityBuildOf(loadCity(), 'lumber').endsAt) / 60000), n5: besch['5m'] };
      gibBelohnung('besch', 2, '1h'); renderBesch(); document.querySelector('[data-besch-auto]').click(); await warte(50);
      o.bau.fertig = !cityBuildOf(loadCity(), 'lumber'); o.bau.rest1h = besch['1h'];
      closeAllPopups();
      // E) Kachel + Rucksack
      o.kachel = { s1: beuteKachel({ a: 'schluessel1', n: 3 }).includes('beute_schluessel.webp'), em: beuteKachel({ a: 'eventMuenzen', n: 500 }).includes('beute_eventmuenze'), b: /beute_beschleuniger_gross[\s\S]*24 Std/.test(beuteKachel({ a: 'besch', n: 1, dauer: '24h' })),
        gibt: JSON.stringify(gibBelohnung('besch', 1, '8h')), falsch: gibBelohnung('besch', 1, '7h') === null };
      schluessel2 = Math.max(1, schluessel2); rkTab = 'tempo'; openRucksack(); await warte(200); const S = rkSachen();
      o.rucksack = { schl: S.schl.some(x => x.name === 'Epischer Schlüssel'), em: S.sonst.some(x => x.k === 'ev'), besch: document.querySelectorAll('#rkInhalt .rk-raster .bk[data-beute="besch"]').length };
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.reiter === 'Kisten,Event,Tempo,Schilde,Markt' && r.em, art + ': Reiter Kisten · Event · Tempo · Schilde · Markt (kein Thron), oben Event-Münzen', r);
    ok(r.kisten.karten === 6 && r.kisten.gruppen === 'Ausrüstung,Helden,Schlüssel' && r.kisten.preise === '1100/1000 1500/5000 1100/1000 1500/5000', art + ': Kisten in Gruppen, ohne Schlüssel 100/500 Edelsteine (10×: 1.000/5.000)', r.kisten);
    ok(r.ausGems.weg === 100 && r.ausGems.teil === 1, art + ': Ausrüstungs-Kiste mit Edelsteinen: 100 weg, 1 Teil', r.ausGems);
    ok(r.ausS.gemsWeg === 0 && r.ausS.s1 === 2 && r.ausS.teile === 10, art + ': 10× mit Schlüsseln: 10 Schlüssel weg, keine Edelsteine, 10 Teile', r.ausS);
    ok(r.heldS.gemsWeg === 0 && r.heldS.s1 === 1, art + ': Helden-Kiste mit Schlüssel', r.heldS);
    ok(r.epi.erst === 0 && r.epi.frage && r.epi.doppel === 0 && r.epi.dann === 500 && r.epi.teil === 1, art + ': Epische mit Edelsteinen: erst „Wirklich?“, Doppel-Tipp zählt nicht, dann genau 500', r.epi);
    ok(r.pityText && r.pity.r.length === 1 && r.pity.r[0] === 3 && r.pity.z === 0 && r.pity.s2 === 1, art + ': Epische Ausrüstung: beim 20. Mal sicher Lila (Zähler 19/20 → 0)', r);
    ok(r.heldPity.epiDazu === 10 && r.heldPity.alle === 10 && r.heldPity.z === 0, art + ': Epische Helden-Kiste: beim 20. Mal 10 Splitter für einen epischen Helden', r.heldPity);
    ok(r.sKauf.weg === 100 && r.sKauf.s1 === 1, art + ': Schlüssel kaufen: 100 Edelsteine', r.sKauf);
    ok(r.ev.gruppen === 'Friedensschild,Teleporter,Beschleuniger,Schlüssel' && r.ev.karten === 12 && r.ev.guthaben, art + ': Event-Shop: Schild · Teleporter · Beschleuniger · Schlüssel, Guthaben oben', r.ev);
    ok(r.ev.schild === 2 && r.ev.em === 1800 && r.ev.aus, art + ': Event-Shop: Schild 8 Std 600 Event-Münzen, Woche 2/2 → ausverkauft', r.ev);
    ok(r.ev.besch === 1 && r.ev.fenster, art + ': Event-Shop: Beschleuniger 1 Std im Rucksack, Belohnung als Kachel', r.ev);
    ok(r.tempo.weg === 20 && r.tempo.n === 1 && r.tempo.karten === 7, art + ': Tempo: 7 Beschleuniger, 5 Min für 20 Edelsteine', r.tempo);
    ok(r.bau.kuerzer === 5 && r.bau.n5 === 0 && r.bau.fertig, art + ': Beschleuniger beim Bauen: −5 Min, „Passend benutzen“ macht den Bau fertig', r.bau);
    ok(r.kachel.s1 && r.kachel.em && r.kachel.b && r.kachel.gibt === '{"a":"besch","n":1,"dauer":"8h"}' && r.kachel.falsch, art + ': gibBelohnung + Kacheln (Schlüssel, Event-Münze, Beschleuniger mit Dauer)', r.kachel);
    ok(r.rucksack.schl && r.rucksack.em && r.rucksack.besch >= 1, art + ': Rucksack zeigt Schlüssel, Event-Münzen und Beschleuniger', r.rucksack);
    await bild('rucksack');
    for (const t of ['gems', 'ev', 'tempo']) { await p.evaluate(async t => { closeAllPopups(); gems = 5000; openShop(t); await new Promise(f => setTimeout(f, 400)); }, t); await bild('shop_' + t); }
    if (art === 'Handy') {
      // F) Marsch-Plätze über das Labor
      const m = await p.evaluate(async () => {
        const c = loadCity(), o = {}; c.fo = c.fo || {}; delete c.fo.x_marsch; c.levels.keep = 25; c.levels.academy = 4; saveCity();
        o.start = marschGrenze('player'); const d = AUF.FORSCHUNG.find(x => x.id === 'x_marsch');
        o.labor = [1, 2, 3, 4].map(L => AUF.foAkaFuer(d, L)).join(',');
        o.sperre = AUF.foStufe('player', 'x_marsch') === 0 && /Labor Stufe 5/.test(foStart('player', 'x_marsch'));
        c.levels.academy = 22; c.fo.x_marsch = 4; saveCity(); o.voll = marschGrenze('player');
        c.fo.x_marsch = 1; c.levels.academy = 10; saveCity(); o.eins = marschGrenze('player');
        gibBelohnung('besch', 1, '15m'); c.foRun = { id: 'x_marsch', to: 2, startedAt: Date.now(), endsAt: Date.now() + 3 * 3600000 }; saveCity();
        closeAllPopups(); openCity(); await new Promise(f => setTimeout(f, 1500)); cityOpenId = 'academy'; renderCitySheet(); await new Promise(f => setTimeout(f, 300));
        o.knopf = !!document.querySelector('[data-fo-besch]'); const v = loadCity().foRun.endsAt; document.querySelector('[data-fo-besch]').click(); await new Promise(f => setTimeout(f, 100));
        document.querySelector('[data-besch-d="15m"]').click(); o.fo = Math.round((v - loadCity().foRun.endsAt) / 60000);
        closePanel(beschPopup); renderCitySheet(); return o;
      });
      ok(m.start === 2 && m.labor === '5,10,16,22' && m.sperre && m.voll === 6 && m.eins === 3, 'Marsch-Plätze: 2 am Anfang, +1 bei Labor 5/10/16/22 (Forschung), Burg zählt nicht mehr', m);
      ok(m.knopf && m.fo === 15, 'Labor: Beschleuniger-Knopf bei laufender Forschung, 15 Min kürzer', m);
      await p.waitForTimeout(300); await bild('labor');
    }
    await ctx.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
