// Belohnungen wie RoK (7.10., Merkliste 23/24): Kachel je Seltenheit mit KI-Symbol und Menge unten rechts – überall gleich (Shop, Aufgaben,
// Tagesbelohnung, Abholfach, Pass, Stufe, Events, Kampfbericht); Kisten öffnen: Fenster mit Kiste (wackelt, geht auf, Strahlen, Kacheln
// nacheinander), „1ד und „10ד (weniger Edelsteine: „N×“ mit dem Rest, ab 500 „Wirklich?“), Edelsteine und Teile genau wie N Einzelkäufe.
// Handy 390 px. Fotos (Kiste 1×, 10×-Ergebnis, Aufgaben-Belohnung) in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), bilder = process.argv[3];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof openShop === 'function' && typeof islandById !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const ev = (f, a) => p.evaluate(f, a).catch(e => ({ fehler: e.message }));
  const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, n + '.png') }).catch(() => {}); };
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } closeAllPopups(); flashHint('', 1); });
  const fenster = () => ev(() => { const f = document.getElementById('beuteFenster'); if (!f || f.hidden) return null;
    const k = [...f.querySelectorAll('.bf-inhalt .bk')];
    return { titel: f.querySelector('#bfTitel').textContent, kiste: f.classList.contains('mit-kiste') ? f.querySelector('.bf-kiste').getAttribute('src') : '', fertig: f.classList.contains('is-fertig'),
      kacheln: k.length, arten: k.map(x => x.dataset.beute + ':' + x.dataset.r + ':' + (x.querySelector('b') ? x.querySelector('b').textContent : '')),
      summe: k.reduce((s, x) => s + (+(x.querySelector('b') || { textContent: '1' }).textContent.replace(/\D/g, '') || 1), 0), voll: f.querySelector('.bf-karte').getBoundingClientRect().right <= innerWidth + 1 }; });
  const zu = () => ev(() => beuteFensterZu());

  // 1) alle KI-Bilder da (echte Transparenz: geladen, nicht leer)
  const bi = await ev(async () => { const n = ['muenzen', 'edelsteine', 'holz', 'stein', 'eisen', 'truppen', 'splitter', 'schild', 'waffe', 'ruestung', 'rundschild', 'stiefel', 'punkte', 'beschleuniger'].map(x => 'beute_' + x)
      .concat(...['ausruestung', 'held', 'gross', 'episch', 'royal'].map(k => ['kiste_' + k + '_zu', 'kiste_' + k + '_offen']));
    const lade = s => new Promise(f => { const i = new Image(); i.onload = () => f(i.naturalWidth); i.onerror = () => f(0); i.src = 'bilder/' + s + '.webp'; });
    const w = await Promise.all(n.map(lade)); return { n: n.length, fehlt: n.filter((x, i) => !w[i]) }; });
  ok(bi.n === 24 && !bi.fehlt.length, '24 KI-Bilder (14 Symbole, 10 Kisten) laden', bi);
  // 2) eine Kachel: Seltenheit, Symbol, Menge unten rechts
  const ka = await ev(() => { const d = document.createElement('div'); d.innerHTML = beuteKachel({ a: 'gems', n: 1200 }) + beuteKachel({ a: 'item', slot: 'boots', r: 4 }) + beuteKachel({ a: 'coins', n: 25000 }); document.body.appendChild(d);
    const k = [...d.querySelectorAll('.bk')], o = k.map(x => { const r = x.getBoundingClientRect(), z = x.querySelector('b'), zr = z && z.getBoundingClientRect(); return [x.dataset.r, x.querySelector('img').getAttribute('src'), z ? z.textContent : '', zr ? zr.right > r.right - r.width * .3 && zr.bottom > r.bottom - r.height * .35 : null]; });
    d.remove(); return o; });
  ok(ka[0][0] === 'gold' && /beute_edelsteine/.test(ka[0][1]) && ka[0][2] === '1.200' && ka[0][3] && ka[1][0] === 'gold' && /beute_stiefel/.test(ka[1][1]) && ka[1][2] === '' && ka[2][0] === 'gruen' && /beute_muenzen/.test(ka[2][1]),
    'Kachel: Farbe je Seltenheit, KI-Symbol, Menge unten rechts (ein einzelnes Teil ohne Zahl)', ka);

  // 3) Shop: Ausrüstungskiste 1× – Edelsteine genau einmal, Fenster mit Kiste (zu → offen), eine Kachel
  const s1 = await ev(async () => { gems = 2000; updateHud(); openShop('gems'); await new Promise(f => setTimeout(f, 400));
    const g0 = gems, i0 = Object.keys(inventory).length, bilder = [...document.querySelectorAll('#shopPopup [data-spane="gems"] .ware .ware-bild img.kiste-bild')].length;
    document.querySelector('[data-kiste="aus"][data-anz="1"]').click(); const f = document.getElementById('beuteFenster');
    const amAnfang = f.querySelector('.bf-kiste').getAttribute('src'), wackelt = f.classList.contains('is-wackeln');
    return { weg: g0 - gems, teile: Object.keys(inventory).length - i0, amAnfang, wackelt, bilder }; });
  await p.waitForTimeout(2600); const f1 = await fenster(); await bild('kiste_1x');
  ok(s1.bilder === 7 && s1.weg === 100 && s1.teile === 1 && /kiste_ausruestung_zu/.test(s1.amAnfang) && s1.wackelt, 'Ausrüstungskiste 1×: 100 weg, 1 Teil, Kiste (KI-Bild) wackelt zuerst', s1);
  ok(f1 && /kiste_ausruestung_offen/.test(f1.kiste) && f1.fertig && f1.kacheln === 1 && /^item:/.test(f1.arten[0]) && f1.voll, 'danach: Kiste offen, Strahlen, eine Kachel im Fenster', f1);
  await zu();
  // 4) 10×: „Wirklich?“ (1.500), dann genau 10 Teile und 1.500 weg; das Fenster fasst zusammen
  const s10 = await ev(async () => { gems = 2000; renderShop(); const bt = () => document.querySelector('#shopPopup [data-kiste="aus"][data-anz="10"]'), g0 = gems, i0 = Object.keys(inventory).length;
    const text = bt().textContent.replace(/\s+/g, ''); bt().click(); const frage = /Wirklich/.test(bt().textContent), nichts = gems === g0;
    await new Promise(f => setTimeout(f, 600)); bt().click();
    return { text, frage, nichts, weg: g0 - gems, teile: Object.keys(inventory).length - i0 }; });
  await p.waitForTimeout(3000); const f10 = await fenster(); await bild('kiste_10x');
  ok(s10.text === '10×1.000' && s10.frage && s10.nichts && s10.weg === 1000 && s10.teile === 10, '10×: erst „Wirklich?“, dann genau 1.000 weg und 10 Teile', s10);
  ok(f10 && f10.fertig && f10.summe === 10 && f10.kacheln <= 10 && f10.arten.every(a => /^item:/.test(a)) && f10.voll, '10×-Ergebnis: Kacheln zusammengefasst (Summe 10), ganz im Bild', f10);
  await zu();
  // 5) zu wenig Edelsteine für 10×: nichts weg, keine Teile
  const sn = await ev(async () => { gems = 3 * CRATE_GEM_COST + 20; renderShop(); const bt = () => document.querySelector('#shopPopup [data-kiste="aus"][data-anz="10"]'), g0 = gems, i0 = Object.keys(inventory).length;
    bt().click(); return { weg: g0 - gems, teile: Object.keys(inventory).length - i0 }; });
  ok(sn.weg === 0 && sn.teile === 0, 'zu wenig Edelsteine für 10×: nichts weg', sn);
  // 6) Heldenkiste 10×: dieselbe Kiste 10-mal (Splitter-Kacheln mit Held), Edelsteine genau 10 × 150
  const sh = await ev(async () => { gems = 1600; renderShop(); const bt = () => document.querySelector('[data-kiste="held"][data-anz="10"]'), g0 = gems; bt().click(); await new Promise(f => setTimeout(f, 600)); bt().click();
    const f = document.getElementById('beuteFenster'); return { weg: g0 - gems, held: !!f.querySelector('.bk[data-beute="sh"] img.bk-held'), kiste: f.querySelector('.bf-kiste').dataset.auf}; });
  ok(sh.weg === 1000 && sh.held && /kiste_held_offen/.test(sh.kiste), 'Helden-Kiste 10×: 1.000 weg (nach „Wirklich?“), Splitter-Kacheln mit Held', sh);
  await zu(); await ev(() => closeAllPopups());

  // 7) Aufgabe abholen: Belohnungs-Fenster mit Edelstein-Kachel; Zeile zeigt die Kachel
  const q = await ev(async () => { const s = loadQuests(), t = s.list[0]; t.progress = t.target; t.claimed = false; saveQuests(); openGoals('daily'); await new Promise(f => setTimeout(f, 300));
    const zeile = !!document.querySelector('#questList .quest .quest-rew .bk[data-beute="gems"]'), g0 = gems; claimQuest(0); return { zeile, plus: gems - g0, soll: t.gems }; });
  await p.waitForTimeout(1500); const fq = await fenster(); await bild('aufgabe');
  ok(q.zeile && q.plus === q.soll && fq && fq.titel === 'Aufgabe erledigt' && fq.arten[0] === 'gems:blau:' + q.soll, 'Aufgabe: Kachel in der Zeile, Abholen zeigt das Belohnungs-Fenster', [q, fq]);
  await zu(); await ev(() => closeAllPopups());
  // 8) Tagesbelohnung, Abholfach, Pass, Stufe, Events, Kampfbericht: überall Kacheln
  const ue = await ev(async () => { const o = {};
    dailyState = { last: null, day: 0 }; showDailyModal(); o.tag = !!document.querySelector('#dailyModalRewards li.bk[data-beute="kiste"]');
    document.getElementById('dailyModalBtn').click(); o.tagDanach = document.querySelectorAll('#dailyModalRewards li.bk[data-beute="item"]').length >= 1; closeDailyModal();
    inboxAdd({ src: 'gift', title: 'Kachel-Test', gems: 7, crate: 3 }); openGoals('reward'); await new Promise(f => setTimeout(f, 300));
    o.fach = document.querySelectorAll('#inboxList .inbox-row .bk').length >= 2; const g0 = gems; document.querySelector('#inboxList [data-inbox]').click();
    const f = document.getElementById('beuteFenster'); o.fachAb = gems - g0 >= 7 && !f.hidden && /kiste_royal/.test(f.querySelector('.bf-kiste').getAttribute('src')); beuteFensterZu();
    showGoalsTab('pass'); await new Promise(f => setTimeout(f, 300)); o.pass = document.querySelectorAll('#passPane .pl-zelle .bk').length >= 200;
    showGoalsTab('tour'); await new Promise(f => setTimeout(f, 300)); o.events = document.querySelectorAll('#tourPane .evl-z .bk, .evl-z .bk').length >= 4; closeAllPopups();
    levelUpShown = { from: 2, to: 3, coins: 500, troops: 300, gems: 10, points: 1 }; renderLevelUpModal(); o.stufe = document.querySelectorAll('#levelUpRewards li.bk').length === 4; closeLevelUpModal();
    const d = document.createElement('div'); d.innerHTML = beuteRaster([{ a: 'holz', n: 900 }, { a: 'eisen', n: 40, minus: true }]); o.minus = !!d.querySelector('.bk[data-minus] b') && d.querySelector('.bk[data-minus] b').textContent === '−40';
    return o; });
  ok(ue.tag && ue.tagDanach, 'Tagesbelohnung: Kisten-Kachel vorher, Teil-Kacheln nachher', ue);
  ok(ue.fach && ue.fachAb, 'Abholfach: Kacheln in der Zeile, Abholen zeigt das Fenster mit Königlicher Kiste', ue);
  ok(ue.pass && ue.events && ue.stufe && ue.minus, 'Pass, Wochen-Event-Preise, Aufstieg, Kampfbericht-Verlust: Kacheln', ue);
  ok(!fe.length, 'keine Skriptfehler', fe);
  await b.close();
})();
