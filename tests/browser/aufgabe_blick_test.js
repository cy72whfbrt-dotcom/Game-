// Blick „mit den Augen eines Spielers“ (6.10.), Bereiche B/E/G/I: neuer Spieler ohne „Willkommen zurück“ und ohne Tagesbelohnung beim
// ersten Start (erst Anleitung), Tagesbelohnung zeigt, was es gibt; Events: Welt-Saison nur in den letzten 3 Tagen oben in jedem Reiter,
// sonst unten im Wochen-Event, alle Ereignis-Chips ganz im Bild (390 px), Pass ohne zweite Saison-Nummer, Abholen leer = eine Zeile;
// Rangliste: Zeile antippen öffnet das Profil, Thron-Punkte-Erklärung zum Aufklappen, leer kompakt; Heldenhalle: genug Splitter →
// Karte oben mit „Freischalten“ (antippen schaltet frei), Stern als 4 Viertel. Handy 390 px + Desktop. Bilder in process.argv[3].
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), bilder = process.argv[3];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof openGoals === 'function' && typeof islandById !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(4000);
  const ev = (f, a) => p.evaluate(f, a).catch(e => ({ fehler: e.message }));
  const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, 'blick_' + n + '.png') }).catch(() => {}); };
  // B) erster Start: nur die Anleitung – kein leeres „Willkommen zurück“, keine Tagesbelohnung davor
  const s = await ev(() => ({ welcome: !document.getElementById('welcomeModal').hidden, daily: !document.getElementById('dailyModal').hidden, anl: !document.getElementById('anleitung').hidden, schritt: anleitung.schritt, wf: !!welcomeFrom }));
  ok(!s.welcome && !s.wf && !s.daily && s.anl && s.schritt === 0, 'Erster Start: nur Anleitung Schritt 1 (kein „Willkommen zurück“, Tagesbelohnung erst später)', s);
  const d = await ev(() => { anleitung.schritt = ANLEITUNG.length; showDailyModal();
    const o = { rows: [...document.querySelectorAll('#dailyModalRewards li')].map(li => li.title || li.innerText.replace(/\s+/g, ' ')), tage: document.querySelectorAll('#dailyModalDays .daily-day').length, heute: !!document.querySelector('#dailyModalDays .is-today') };
    return o; });
  await bild('daily');
  ok(d.rows.length >= 1 && /kiste/i.test(d.rows[0]) && d.tage === 7 && d.heute, 'Tagesbelohnung zeigt, was es heute gibt (Kiste ×1) und die Woche mit „heute“', d);
  await ev(() => { document.getElementById('dailyModal').hidden = true; });
  // „Willkommen zurück“ (Live-Bild 6.10.): „Ertrag pro Stunde“ einzeilig, große Zahlen rutschen darunter
  const w = await ev(() => { welcomeFrom = Object.assign({ produced: { coins: 48e6, troops: 24e6, capped: false, thronePts: 0, throneHit: null } }, empireSnapshot(), { at: Date.now() - 33 * 60000 });
    const hp0 = hourProduction; hourProduction = () => ({ coins: 87.5e6, troops: 43.8e6 }); showWelcome(); hourProduction = hp0;
    const o = [...document.querySelectorAll('#welcomeList li')].map(li => { const sp = li.querySelector('span'), lh = parseFloat(getComputedStyle(sp).lineHeight) || 16;
      return [sp.innerText, Math.round(sp.getBoundingClientRect().height / lh), li.getBoundingClientRect().right <= li.parentElement.getBoundingClientRect().right + 1, li.querySelector('b').innerText.split('\n').length]; });
    return o; });
  await bild('willkommen');
  ok(w.length >= 2 && w.some(r => r[0] === 'Ertrag pro Stunde') && w.every(r => r[1] === 1 && r[2] && r[3] === 2), 'Willkommen zurück: Bezeichnungen einzeilig („Ertrag pro Stunde“), Münzen und Truppen je eine Zeile, nichts ragt hinaus', w);
  await ev(() => closeWelcome());
  // E) Events
  const e = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), txt = id => document.getElementById(id).innerText;
    saisonTakt(); const S = saison, ende0 = S.ende; S.ende = Date.now() + 30 * 864e5;
    const tab = async t => { openGoals(t); await warte(250); return txt('eventBody'); };
    const o = {}; o.inv = await tab('inv'); o.tour = await tab('tour');
    const lb = document.querySelector('.ev-saison .field-lines b'); o.links = lb ? getComputedStyle(lb).textAlign : '';
    o.boss = await tab('boss');
    o.tourSaisonUnten = o.tour.indexOf('Welt-Saison') > o.tour.indexOf('Punkte für');
    const k = [...document.querySelectorAll('#goalsTabs [data-gtab]:not([hidden])')], box = document.getElementById('goalsTabs').getBoundingClientRect();
    o.chips = k.map(c => { const r = c.getBoundingClientRect(); return [c.innerText.trim(), Math.round(r.left), Math.round(r.right)]; }); o.chipsRand = Math.round(box.right); o.breite = innerWidth;
    S.ende = Date.now() + 2 * 864e5; o.invBald = await tab('inv');
    S.ende = ende0; saisonSpeichern();
    openGoals('pass'); await warte(250); o.pass = txt('passPane').slice(0, 120);
    for (const x of inboxList().slice()) inboxClaim(x.id); dailyState = { last: todayKey(), day: 1 };
    openGoals('reward'); await warte(250); o.leer = document.querySelector('#inboxList .inbox-empty').getBoundingClientRect().height; o.leerText = txt('inboxList');
    closeAllPopups(); return o;
  });
  ok(!/Welt-Saison/.test(e.inv) && !/Welt-Saison/.test(e.boss) && /Welt-Saison/.test(e.tour) && e.tourSaisonUnten, 'Welt-Saison nicht mehr oben in jedem Reiter: nur unten im Wochen-Event', { inv: e.inv.slice(0, 40), tour: e.tourSaisonUnten });
  ok(/^\s*Welt-Saison/.test(e.invBald), 'Letzte 3 Tage: Welt-Saison mit Countdown oben in jedem Reiter', e.invBald.slice(0, 40));
  ok(e.links === 'left', 'Welt-Saison: Texte linksbündig', e.links);
  ok(e.chips.length === 5 && e.chips.every(c => c[1] >= 0 && c[2] <= e.chipsRand && c[2] <= e.breite), 'Handy 390 px: alle 5 Ereignis-Chips (mit Lager, Merkliste 33) ganz im Bild', e.chips);
  ok(/Saison-Pass/.test(e.pass) && !/Saison-Pass \d/.test(e.pass), 'Pass ohne eigene Saison-Nummer („Saison-Pass“, nicht „Saison-Pass 10“)', e.pass);
  ok(e.leerText.trim() === 'Gerade nichts zum Abholen.' && e.leer < 60, 'Abholen leer: eine Zeile', { t: e.leerText, h: e.leer });
  // G) Rangliste
  const g = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    openRankings('power'); const z = document.querySelectorAll('#rankBody .lb-row')[1], who = z.dataset.profile; z.querySelector('.lb-val').click(); await warte(300);
    const o = { profil: isPanelOpen(rulerPopup) && rulerWho === who };
    closeAllPopups(); openRankings('week'); await warte(200);
    const det = document.querySelector('#rankBody details.lb-info'); o.info = !!det && !det.open && /Thron-Punkte/.test(det.innerText);
    const leer = document.querySelector('#rankBody .lb-leer'); o.leer = leer ? Math.round(leer.getBoundingClientRect().height) : (document.querySelector('#rankBody .lb-row') ? -1 : 0);
    o.macht = rankPeople().map(e => powerOf(whoProfile(e.who)));   // (aus echten Werten: Truppen, Basen, Ausrüstung, Helden, Stadt)
    closeAllPopups(); return o;
  });
  ok(g.profil, 'Rangliste: Zeile antippen öffnet das Profil', g.profil);
  ok(g.info && (g.leer === -1 || (g.leer > 0 && g.leer < 120)), 'Thron-Punkte: Erklärung zum Aufklappen, leere Liste kompakt', { info: g.info, leer: g.leer });
  ok(g.macht.every(v => Number.isFinite(v) && v >= 0), 'Macht in der Rangliste aus echten Werten (keine NaN)', g.macht.slice(0, 6));
  // I) Heldenhalle
  const h = await ev(async () => {
    { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); }   // Helden erst mit Heldenhalle (Merkliste 21)
    const warte = ms => new Promise(f => setTimeout(f, ms)), H = loadHeroes(), z = HEROES.find(x => !H[x.id].own && x.r === 1);
    H[z.id].sh = HERO_UNLOCK[z.r]; const zu1 = HEROES.find(x => !H[x.id].own && x.id !== z.id); if (zu1) H[zu1.id].sh = 0; saveHeroes();   /* (einer bleibt gesperrt) */ openHeroHall(); await warte(200);
    const karte = document.querySelector('#heroHall .hh-cards:not(.hh-cards--zu) [data-hh="' + z.id + '"]');
    const o = { id: z.id, oben: !!karte && karte.classList.contains('is-ready'), knopf: !!(karte && karte.querySelector('[data-hh-frei]')), gesperrt: !!(karte && karte.querySelector('.hh-lk')),
      unten: !!document.querySelector('#heroHall .hh-cards--zu [data-hh="' + z.id + '"]') };
    const zuH = document.querySelector('#heroHall .hh-zu-h'), kz = document.querySelector('#heroHall .hh-cards--zu');
    o.zuLinks = zuH && kz ? Math.round(zuH.getBoundingClientRect().left - kz.getBoundingClientRect().left) : null;
    karte.querySelector('[data-hh-frei]').click(); await warte(200); o.frei = H[z.id].own; o.sh = H[z.id].sh;
    const eigen = HEROES.find(x => H[x.id].own); H[eigen.id].q = 6; openHeroHall(eigen.id); await warte(200);
    o.stern = [...document.querySelectorAll('#heroHall .hh-qinfo')].map(x => x.innerText.replace(/\s+/g, ' ')); o.viertel = document.querySelectorAll('#heroHall .hh-steps span.on').length;
    return o;
  });
  await bild('held');
  ok(h.oben && h.knopf && !h.gesperrt && !h.unten, 'Volle Splitter: Held steht oben (golden) mit „Freischalten“ statt „Gesperrt“', h);
  ok(h.zuLinks !== null && Math.abs(h.zuLinks) <= 2, '„N gesperrt“ steht über den gesperrten Karten (nicht am Fensterrand)', h.zuLinks);
  ok(h.frei && h.sh === 0, '„Freischalten“ auf der Karte schaltet frei (Splitter verbraucht)', { frei: h.frei, sh: h.sh });
  ok(h.stern.some(t => /Stern 2 2 von 4 Vierteln/.test(t)) && h.viertel === 2 && h.stern.some(t => /Nächstes Viertel .*Splitter/.test(t)), 'Held: Stern als 4 Viertel verständlich („Stern 2 · 2 von 4 Vierteln“)', h.stern);
  await ev(() => closeHeroHall());
  // Desktop: Heldenhalle nutzt die Breite (größere Karten)
  await p.setViewportSize({ width: 1440, height: 900 });
  const dk = await ev(async () => { openHeroHall(); await new Promise(f => setTimeout(f, 300)); const c = document.querySelector('#heroHall .hh-cards:not(.hh-cards--zu) .hh-card'); return c ? Math.round(c.getBoundingClientRect().width) : 0; });
  await bild('held_desktop');
  ok(dk >= 140, 'Desktop: Heldenkarten groß (mind. 140 px breit)', dk);
  ok(!fe.length, 'Keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
