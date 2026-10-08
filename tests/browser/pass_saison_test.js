// Saison-Pass (7.10., Event-Zahlen): 100 Stufen × 150 Punkte, jede Stufe gibt in beiden Reihen etwas (auch Truppen), Edelsteine
// je Saison frei 360 / Premium 1100 (Stufe 100: Edelsteine statt Rahmen, 7.10.); die Ansicht ist eine lange waagrechte Leiste mit Belohnungs-Kacheln; Premium (1000) erst nach
// „Wirklich?“; Truppen kommen in die Hauptstadt; Mitspieler bekommen dieselben Belohnungen. Argument 3: Ordner für ein Handy-Foto.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } anleitung.schritt = ANLEITUNG.length; });
  // 1) Zahlen
  const z = await ev(() => {
    const o = { lv: PASS_LVLS, step: PASS_STEP, leer: [], g: [0, 0], bsp: {} };
    for (let L = 1; L <= PASS_LVLS; L++) for (const pr of [0, 1]) { const rs = passRewardAt(L, !!pr); if (!rs.length) o.leer.push([L, pr]); for (const r of rs) if (r.k === 'gems') o.g[pr] += r.n; }
    const k = rs => rs.map(r => r.k + (r.n || r.id)).join('+');
    for (const L of [1, 2, 3, 4, 5, 6, 10, 25, 100]) o.bsp[L] = [k(passRewardAt(L, false)), k(passRewardAt(L, true))];
    o.trStunden = [0, 1].map(pr => { let n = 0; for (let L = 1; L <= PASS_LVLS; L++) for (const r of passRewardAt(L, !!pr)) if (r.k === 'tr') n += r.n; return n; });
    return o; });
  ok(z.lv === 100 && z.step === 150, '100 Stufen × 150 Punkte', [z.lv, z.step]);
  ok(!z.leer.length, 'jede Stufe gibt in beiden Reihen etwas', z.leer);
  ok(z.g[0] === 360 && z.g[1] === 1100, 'Edelsteine je Saison: frei 360, Premium 1100', z.g);
  ok(z.bsp[1].join() === 'coins3,coins12+gems10' && z.bsp[2].join() === 'tr2,tr6' && z.bsp[3].join() === 'crate1,shield8' && z.bsp[4].join() === 'shards3,shards8' &&
    z.bsp[5].join() === 'gems20,gems30' && z.bsp[6].join() === 'crate1,eventMuenzen150' && z.bsp[10].join() === 'royal1,royal1' && z.bsp[25].join() === 'gems50+royal1,gems150+royal1' && z.bsp[100].join() === 'gems50+royal1,gems150+royal1',
    'Beispiele wie im Vorschlag (1 Münzen · 2 Truppen · 3 Kiste · 4 Splitter · 5 Edelsteine · 10 lila · 25 50 + lila · 100 Edelsteine, kein Rahmen)', z.bsp);
  ok(z.trStunden[0] === 28 && z.trStunden[1] === 84, 'Truppen in beiden Reihen (14 Stufen: frei 2, Premium 6 Std.)', z.trStunden);
  // 2) Leiste
  await ev(() => { const x = passOf(passNo(Date.now())); x.xp = 12 * PASS_STEP + 40; x.f = []; x.p = []; x.prem = false; passSave(); gems = 5000; openGoals('pass'); });
  await p.waitForTimeout(700);
  const l = await ev(() => { const pl = document.querySelector('#passPane .pl'), sp = pl ? pl.querySelectorAll('.pl-spalte') : [];
    return { spalten: sp.length, kacheln: pl ? pl.querySelectorAll('.pl-zelle .bk').length : 0, breit: pl ? pl.scrollWidth > pl.clientWidth * 5 : false, links: pl ? Math.round(pl.scrollLeft) : -1,
      bereit: document.querySelectorAll('#passPane .pl-zelle.is-ready').length, zu: document.querySelectorAll('#passPane .pl-zelle.is-p.is-closed').length,
      seite: document.documentElement.scrollWidth <= window.innerWidth + 1, oben: sp[0] ? sp[0].firstElementChild.classList.contains('is-p') : false,
      namen: pl ? getComputedStyle(pl.querySelector('.pl-namen')).position : '',
      frei: (() => { const sp = pl && pl.querySelector('.pl-namen span:last-child'), t = sp && [...sp.childNodes].find(n => n.nodeType === 3); if (!t) return null; const r = document.createRange(); r.selectNodeContents(t);
        return Math.round(r.getBoundingClientRect().top - sp.getBoundingClientRect().top); })() }; });
  ok(l.spalten === 100 && l.kacheln >= 200 && l.breit, 'Leiste: 100 Spalten mit Belohnungs-Kacheln, waagrecht zum Wischen', l);
  ok(l.links > 0 && l.bereit === 12 && l.zu === 100 && l.oben && l.namen === 'sticky', 'Leiste: steht bei der nächsten Stufe, 12 bereit, Premium oben (gesperrt), Namen bleiben links', l);
  ok(l.seite, 'keine waagrechte Seiten-Verschiebung', l.seite);
  ok(l.frei !== null && l.frei <= 12, 'Leiste: „Frei“ steht oben in der Reihe – schon lesbar, wenn das Fenster die Reihe unten anschneidet (vorher „EI“)', l.frei);
  if (process.argv[3]) { await ev(() => { const pb = goalsPopup.querySelector('.pbody'), pl = document.querySelector('#passPane .pl'); pb.scrollTop += pl.getBoundingClientRect().top - pb.getBoundingClientRect().top - 120; });
    await p.waitForTimeout(300); await p.screenshot({ path: require('path').join(process.argv[3], 'pass_leiste.png') }); }
  // 3) Abholen: Truppen (Stufe 2) in die Hauptstadt, Münzen (Stufe 1)
  const a = await ev(() => { const base = rewardBaseId(), t0 = islandTroops[base] || 0, c0 = coins, hp = hourProduction('player');
    passClaim([[passNo(Date.now()), 2, 0]]); const t1 = islandTroops[base] || 0; passClaim([[passNo(Date.now()), 2, 0]]);
    passClaim([[passNo(Date.now()), 1, 0]]);
    return { tr: t1 - t0, soll: passTruppen(hp, 2), doppelt: (islandTroops[base] || 0) - t1, c: coins - c0, cSoll: passMuenzen(hp, 3) }; });
  ok(a.tr === a.soll && a.tr >= 1 && a.doppelt === 0, 'Stufe 2: 2 Std. Truppen in die Hauptstadt – nur einmal', a);
  ok(a.c === a.cSoll, 'Stufe 1: 3 Std. Münzen', a);
  await ev(() => { if (typeof beuteFensterZu === 'function') beuteFensterZu(); });
  // 4) Premium: erst „Wirklich?“, dann 1000 Edelsteine
  await ev(() => { closeAllPopups(); openGoals('pass'); }); await p.waitForTimeout(400);
  const g0 = await ev(() => gems);
  await p.locator('[data-pass-buy]').click(); await p.waitForTimeout(600);
  const m1 = await ev(() => ({ prem: passOf(passNo(Date.now())).prem, gems, txt: document.querySelector('[data-pass-buy]').textContent }));
  await p.locator('[data-pass-buy]').click(); await p.waitForTimeout(300);
  const m2 = await ev(() => ({ prem: passOf(passNo(Date.now())).prem, gems, offen: document.querySelectorAll('#passPane .pl-zelle.is-p.is-closed').length }));
  ok(!m1.prem && m1.gems === g0 && /Wirklich/.test(m1.txt), 'Premium: erster Tipp fragt „Wirklich?“', m1);
  ok(m2.prem && g0 - m2.gems === 1000 && m2.offen === 0, 'Premium: zweiter Tipp zahlt 1000 Edelsteine, Reihe offen', { g0, ...m2 });
  // 5) Mitspieler: dieselben Belohnungen (auch Truppen in ihre Hauptstadt), ohne Fehler
  const m = await ev(() => { const bd = BOT_DEFS.find(d => !d.mensch && loadBotState()[d.id] && botCapitalOf(d.id) !== null), bs = loadBotState()[bd.id], cap = botCapitalOf(bd.id), t0 = islandTroops[cap] || 0, g0 = bs.gems;
    bs.ps = { s: passNo(Date.now()), base: botPassScore(bs) - 6 * PASS_STEP, f: 0, p: 0, prem: false, at: 0 }; botPassPay(bd.id, bs);
    return { f: bs.ps.f, tr: (islandTroops[cap] || 0) - t0, gems: bs.gems - g0 }; });
  ok(m.f === 6 && m.tr > 0 && m.gems >= 20, 'Mitspieler: Stufe 1–6 ausgezahlt (Truppen in die Hauptstadt, Edelsteine)', m);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
