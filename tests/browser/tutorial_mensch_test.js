// Menschen-Test fürs Tutorial (Alexander 11.10.: „Texte hüpfen, beim Antippen gibt es Probleme“): spielt das Tutorial wie ein Mensch auf dem iPhone –
// Touch-Emulation 390×844 (hasTouch, isMobile, 3×), CPU 2× langsamer, Netz 4G, echte Finger-Tipps (touchscreen.tap) auf die MITTE des Lochs bzw. „Weiter“,
// mit Pausen 600–1500 ms, dazu mal ein Tipp daneben, mal zu früh (sobald das Ziel da ist), mal doppelt. Misst die ganze Zeit (alle 40 ms im Spiel):
// Satz-Position (bleibt in einem Schritt auf derselben Bildschirm-Lage stehen: Karte, Stadt, Fenster …), „…“ höchstens 1,5 s am Stück, Blase nie über dem Loch
// und nie mitten über einem offenen Fenster, kein neues Einblenden der Blase, wenn nur der Text wechselt, jeder Tipp aufs Ziel wirkt, Tipp daneben tut nichts,
// Doppeltipp überspringt nichts. OW_FOTOS=1: Bilder (m<breite>_<nr>_<schritt>.png) in process.argv[3]. OW_MENSCH_W=375 OW_MENSCH_H=667: kleines Handy.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const W = +(process.env.OW_MENSCH_W || 390), H = +(process.env.OW_MENSCH_H || 844), bilder = process.env.OW_FOTOS && process.argv[3];
const HANDY = { ...devices['iPhone 13'], viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 };
let saat = 7; const zufall = () => { saat = (saat * 16807) % 2147483647; return (saat - 1) / 2147483646; };   // fester Zufall: jeder Lauf gleich
const pause = () => 600 + Math.round(zufall() * 900);
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const ctx = await b.newContext(HANDY), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 85, downloadThroughput: 4e6 / 8, uploadThroughput: 3e6 / 8 });
  await p.addInitScript(() => { window.__OW = { neu: true, nameGewaehlt: true }; });
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof tutZeigen === 'function', null, { timeout: 120000, polling: 500 });
  await p.waitForTimeout(3000);
  const tw = await p.evaluate(() => { const q = document.getElementById('twLos').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.touchscreen.tap(tw.x, tw.y);
  // ---- Messung im Spiel: was ein Spieler sieht, alle 40 ms (nur Änderungen) ----
  await p.evaluate(() => {
    const M = window.__mess = { log: [], rein: [] }, $ = id => document.getElementById(id);
    const lage = () => { if (!$('heroHall').hidden) return 'halle'; const kl = document.querySelector('.kl-seite'); if (kl && !kl.hidden) return 'kampfdetails';
      const offen = [...document.querySelectorAll('.panel')].filter(isPanelOpen).map(x => x.id).concat(barbSheetEl.hidden ? [] : ['barbSheet']); if (offen.length) return 'fenster:' + offen.join('+');
      return !$('citySheet').hidden ? 'gebaeude' : cityView.hidden ? 'karte' : 'stadt'; };
    const box = e => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); };
    window.__lage = lage;
    let alt = '';
    const mess = () => {
      const t = $('tut'), aus = t.hidden || $('tutBerater').style.visibility === 'hidden' || !tutLaeuft() || !$('tutFrage').hidden || !!document.querySelector('#beuteFenster:not([hidden])');
      const o = aus ? { aus: 1 } : { s: tut.s, k: (TUT[tut.s] || {}).k, teil: $('tutZaehler').hidden ? '' : $('tutZaehler').dataset.teil || '', lage: lage(), satz: $('tutSatz').textContent,
        py: Math.round($('tutSatz').getBoundingClientRect().top), bh: Math.round(document.querySelector('.tut-blase').getBoundingClientRect().height), ob: $('tutBerater').classList.contains('oben'), blase: box(document.querySelector('.tut-blase')), berater: box($('tutBerater')), loch: $('tutLoch').hidden ? null : box($('tutLoch')), weiter: !$('tutWeiter').hidden,
        fenster: [...document.querySelectorAll('.panel')].filter(isPanelOpen).map(x => { const k = x.querySelector('.phead'), q = x.getBoundingClientRect(), qk = k && k.getBoundingClientRect();
          return [Math.round(q.left), Math.round(Math.max(q.top, qk ? qk.bottom : q.top)), Math.round(q.right), Math.round(q.bottom)]; })[0] || null };
      const j = JSON.stringify(o); if (j !== alt) { alt = j; M.log.push({ t: performance.now(), ...o }); }
    };
    let tm = 0; const bild = t => { if (t - tm >= 35) { tm = t; mess(); } requestAnimationFrame(bild); }; requestAnimationFrame(bild);   // (vor jedem gemalten Bild: was der Spieler wirklich sieht)
    const be = $('tutBerater');                               // Blase blendet neu ein (Klasse „rein“ neu gesetzt): war sie vorher schon auf derselben Seite zu sehen?
    new MutationObserver(rs => { if (!rs.some(r => !(r.oldValue || '').split(/\s+/).includes('rein')) || !be.classList.contains('rein')) return; const v = M.log[M.log.length - 1] || { aus: 1 };
      M.rein.push({ t: performance.now(), s: tut.s, satz: $('tutSatz').textContent, falsch: !v.aus && v.ob === be.classList.contains('oben') }); }).observe(be, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
  });
  // ---- Zustand für einen Tipp: woran sieht man, dass er gewirkt hat? ----
  const sig = () => p.evaluate(() => JSON.stringify([tut.s, !!tut.fertig, Object.keys(tut.e || {}).length, document.getElementById('tutZaehler').dataset.teil || '', __lage(), cityRingId || '', cityOpenId || '', cityPage || '',
    typeof popupView !== 'undefined' ? popupView : '', previewHero || '', typeof goalsTab !== 'undefined' ? goalsTab : '', profilePopup.dataset.tab || '', (document.querySelector('#shopTabs .active') || {}).dataset?.stab || '',
    (document.querySelector('#battleTabs .active') || {}).dataset?.ktab || '', !!document.querySelector('.logRow details[open]'), !!document.querySelector('#beuteFenster:not([hidden])'), Object.keys(tutTat).join(),
    pendingAttacks.length, barbMarches.length, loadCity().builds.length, inboxList().length, Object.keys(inventory).length, Object.values(equippedItems).filter(Boolean).length, !!loadCity().foRun]));
  const lage = () => p.evaluate(() => ({ s: tut.s, k: (TUT[tut.s] || {}).k, lage: __lage(), fertig: !!tut.fertig }));
  const tipps = { ziel: 0, ohne: [], daneben: 0, danebenFalsch: [], doppelt: 0, doppeltFalsch: [], frueh: 0 };
  const wirkt = async (vor, ms) => { for (let t = 0; t < ms; t += 100) { await p.waitForTimeout(100); if (await sig() !== vor) return true; } return false; };
  const zustand = () => p.evaluate(() => {
    const $ = id => document.getElementById(id), r = e => { const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, l: q.left, t: q.top, r: q.right, b: q.bottom }; };
    const o = { s: tut.s, k: (TUT[tut.s] || {}).k, fertig: !!tut.fertig, teil: $('tutZaehler').dataset.teil || '', satz: $('tutSatz').textContent };
    const bf = document.querySelector('#beuteFenster:not([hidden]) .bf-ok'), mod = ['levelUpBtn', 'rewardModalBtn'].map($).find(x => x && x.offsetParent);
    if (bf || mod) return { ...o, modal: r(bf || mod) };
    if ($('tut').hidden) return o;
    if (!$('tutWeiter').hidden) return { ...o, weiter: r($('tutWeiter')), blase: r(document.querySelector('.tut-blase')) };
    if (!$('tutLoch').hidden && !$('tutFinger').hidden && $('tutSperre').hidden) return { ...o, loch: r($('tutLoch')), blase: r(document.querySelector('.tut-blase')) };
    return { ...o, warte: !$('tutFort').hidden };
  });
  const danebenPunkt = z => {                                  // ein Punkt im Dunkel: weit weg von Loch, Blase, oben (HUD, Überspringen) und unten (Leiste)
    const frei = ([x, y]) => [z.loch || z.weiter, z.blase].every(q => !q || x < q.l - 30 || x > q.r + 30 || y < q.t - 30 || y > q.b + 30);
    return [[W * .5, H * .3], [W * .2, H * .55], [W * .8, H * .5], [W * .5, H * .62]].find(frei);
  };
  let n = 0, fotoAlt = '', fotos = 0, letzterTipp = 0;
  const start = Date.now();
  for (let i = 0; i < 1400 && Date.now() - start < 780000; i++) {
    const z = await zustand();
    if (z.fertig) break;
    const fk = z.s + '|' + z.teil;
    if (bilder && fk !== fotoAlt && (z.loch || z.weiter) && fotos < 90) { fotoAlt = fk; fotos++; await p.screenshot({ path: path.join(bilder, 'm' + W + '_' + String(fotos).padStart(2, '0') + '_' + z.k + (z.teil ? '_' + z.teil.replace('/', 'v') : '') + '.png') }); }
    if (z.modal) { await p.waitForTimeout(pause()); await p.touchscreen.tap(z.modal.x, z.modal.y); await p.waitForTimeout(300); continue; }
    const ziel = z.weiter || z.loch;
    if (ziel) {
      n++;
      if (n % 7 === 3) {                                      // daneben getippt: nichts darf passieren
        const d = danebenPunkt(z);
        if (d) { tipps.daneben++; const vor = await lage(); await p.touchscreen.tap(d[0], d[1]); await p.waitForTimeout(700); const nach = await lage();
          if (JSON.stringify(vor) !== JSON.stringify(nach)) tipps.danebenFalsch.push({ vor, nach, d: d.map(Math.round) }); continue; }
      }
      const frueh = n % 5 === 2;                               // zu früh: sobald das Ziel zu sehen ist, ohne Pause (ein Mensch tippt frühestens 0,4 s nach dem letzten Tipp)
      if (frueh) { tipps.frueh++; await p.waitForTimeout(Math.max(0, 400 - (Date.now() - letzterTipp))); } else await p.waitForTimeout(pause());
      const z2 = frueh ? z : await zustand(); const ziel2 = z2.weiter || z2.loch;
      if (!ziel2 || z2.s !== z.s || z2.teil !== z.teil) continue;   // (inzwischen anders: neu sehen)
      const vor = await sig(), vorL = await lage();
      const doppelt = n % 6 === 5;
      await p.touchscreen.tap(ziel2.x, ziel2.y); letzterTipp = Date.now();
      if (doppelt) { tipps.doppelt++; await p.waitForTimeout(110); await p.touchscreen.tap(ziel2.x, ziel2.y); }
      tipps.ziel++;
      if (!await wirkt(vor, 2500)) tipps.ohne.push({ k: z2.k, teil: z2.teil, satz: z2.satz.slice(0, 60), weiter: !!z2.weiter, frueh, x: Math.round(ziel2.x), y: Math.round(ziel2.y) });
      else if (doppelt) { await p.waitForTimeout(600); const nach = await lage();   // Doppeltipp: höchstens ein Schritt weiter (ein Teilschritt-Text darf nicht übersprungen sein: Prüfung unten „blitzt“)
        if (nach.s > vorL.s + 1) tipps.doppeltFalsch.push({ vor: vorL, nach }); }
      continue;
    }
    await p.evaluate(() => {                                  // Warten (Marsch, Bau) vorspulen: bleibt 1 s
      if (document.getElementById('tutFort').hidden) return; const t = Date.now(), vor = (x, e, s) => { const d = x[e] - t - 1000; if (d > 0) { x[e] -= d; x[s] -= d; } };
      pendingAttacks.filter(a => !a.attackerBotId).forEach(a => vor(a, 'resolveAt', 'startedAt')); pendingRetreats.forEach(r => vor(r, 'resolveAt', 'startedAt'));
      barbMarches.filter(m => m.who === 'player' && !m.back).forEach(m => vor(m, 'resolveAt', 'startedAt')); loadCity().builds.forEach(x => vor(x, 'endsAt', 'startedAt')); });
    await p.waitForTimeout(250);
  }
  const M = await p.evaluate(() => ({ ...window.__mess, fertig: !!tut.fertig, burg: loadCity().levels.keep, k: (TUT[tut.s] || {}).k }));
  if (bilder) require('fs').writeFileSync(path.join(bilder, 'mess' + W + '.json'), JSON.stringify(M));
  ok(M.fertig && M.burg === 3, W + '×' + H + ': mit dem Finger bis zum Ende durchgespielt (Burg 3)', { k: M.k, burg: M.burg, s: Math.round((Date.now() - start) / 1000) });
  // ---- Auswertung ----
  const L = M.log.map((x, i) => ({ ...x, bis: (M.log[i + 1] || { t: x.t + 40 }).t }));
  const dauer = x => x.bis - x.t;
  const punkte = [], lang = []; let pk = null;                // „…“ am Stück
  for (const x of L) { if (!x.aus && x.satz === '…') { if (!pk) pk = { t: x.t, k: x.k, lage: x.lage }; pk.bis = x.bis; } else if (pk) { punkte.push(pk); pk = null; } }
  for (const x of punkte) if (x.bis - x.t > 1500) lang.push({ k: x.k, lage: x.lage, ms: Math.round(x.bis - x.t) });
  ok(!lang.length, 'nie länger als 1,5 s nur „…“ (Aldric wartet auf die Kamera/das Ziel)', lang.slice(0, 8));
  // Satz-Position: innerhalb eines Schritts auf derselben Lage (Karte, Stadt, Gebäude, je Fenster) bleibt der Satz stehen (Blase springt nicht, wächst nicht nach oben)
  const spr = []; let g = null;
  for (const x of L) { if (x.aus || dauer(x) < 120) continue;   // (kürzer als 120 ms: Zwischenbild, sieht man nicht)
    const key = x.s + '|' + x.lage;
    if (g && g.key === key && Math.abs(g.py - x.py) > 3) spr.push({ k: x.k, teil: x.teil, lage: x.lage, von: g.py, nach: x.py, satz: x.satz.slice(0, 50) });
    g = { key, py: x.py }; }
  ok(!spr.length, 'Satz bleibt in jedem Schritt an seinem Platz (Blase springt nicht zwischen oben/unten/Mitte, Text hüpft nicht)', { n: spr.length, bsp: spr.slice(0, 8) });
  const deckt = (a, q) => a && q && a[0] < q[2] && q[0] < a[2] && a[1] < q[3] && q[1] < a[3];
  const ueber = L.filter(x => !x.aus && x.loch && dauer(x) > 300 && deckt(x.berater, x.loch)).map(x => ({ k: x.k, teil: x.teil, berater: x.berater, loch: x.loch }));
  ok(!ueber.length, 'Blase (mit Aldric-Bild) liegt nie über dem Loch', ueber.slice(0, 6));
  const mitten = L.filter(x => !x.aus && x.fenster && /^fenster:/.test(x.lage) && dauer(x) > 400 && x.blase[1] > x.fenster[1] + 30 && x.blase[3] < x.fenster[3] - 30 && x.blase[0] < x.fenster[2] && x.fenster[0] < x.blase[2])
    .map(x => ({ k: x.k, teil: x.teil, lage: x.lage, blase: x.blase, fenster: x.fenster }));
  ok(!mitten.length, 'Blase nie mitten im offenen Fenster (über dessen Inhalt)', mitten.slice(0, 6));
  const erkl = L.filter(x => !x.aus && x.weiter && x.loch && dauer(x) > 300);
  const erklSchritte = [...new Set(L.filter(x => !x.aus && x.weiter).map(x => x.k + ' ' + x.teil))], erklOhne = [...new Set(L.filter(x => !x.aus && x.weiter && x.teil && !x.loch && dauer(x) > 1500).map(x => x.k + ' ' + x.teil))];
  ok(erkl.length && !erklOhne.length, 'Erklär-Teilschritte („Weiter“): Loch sichtbar auf dem erklärten Bereich', { mitLoch: [...new Set(erkl.map(x => x.k + ' ' + x.teil))], ohneLoch: erklOhne, alle: erklSchritte.length });
  const ohneZahl = t => t.replace(/[\d.,]+/g, '#');             // (Zahlen zählen hoch: derselbe Satz)
  const R = []; for (const x of L) { const sx = x.aus ? '' : ohneZahl(x.satz || ''), v = R[R.length - 1]; if (v && v.sx === sx) v.bis = x.bis; else R.push({ ...x, sx }); }   // ein Satz am Stück (Loch/Blase dürfen sich dabei bewegen)
  const blitz = []; for (let i = 1; i < R.length - 1; i++) { const x = R[i]; if (x.aus || x.satz === '…' || !x.satz || dauer(x) >= 350) continue;   // ein Satz, der nur kurz aufblitzt (übersprungen/flackert)
    const lang = y => !y.aus && y.sx === x.sx && dauer(y) >= 350;
    if (R.slice(0, i).some(lang) || R.slice(i + 1).some(lang)) continue;   // (der Satz kommt sonst richtig vor)
    if (/^Noch \d|noch \d+ Sekunde|Restzeit: noch/.test(x.satz)) continue;   // (Countdown)
    blitz.push({ k: x.k, teil: x.teil, ms: Math.round(dauer(x)), satz: x.satz.slice(0, 50), davor: (R[i - 1].satz || '').slice(0, 40), danach: (R[i + 1].satz || '').slice(0, 40) }); }
  ok(!blitz.length, 'kein Satz blitzt nur kurz auf (nichts übersprungen, kein Flackern)', blitz.slice(0, 8));
  // neues Einblenden der Blase nur, wenn sie neu erscheint (vorher weg) oder auf die andere Seite wechselt – nicht, wenn nur der Text wechselt
  const reinFalsch = M.rein.filter(r => r.falsch).map(r => ({ s: r.s, satz: r.satz.slice(0, 40) }));   // (vorher schon zu sehen, auf derselben Seite)
  ok(reinFalsch.length <= 1, 'Blase blendet nicht bei jedem neuen Satz neu ein (Text wechselt weich)', { n: reinFalsch.length, bsp: reinFalsch.slice(0, 6) });
  ok(!tipps.ohne.length, 'jeder Finger-Tipp aufs Ziel wirkt (' + tipps.ziel + ' Tipps, ' + tipps.frueh + ' davon ohne Pause, ' + tipps.doppelt + ' doppelt)', tipps.ohne.slice(0, 8));
  ok(tipps.daneben > 3 && !tipps.danebenFalsch.length, 'Tipp daneben (' + tipps.daneben + '×) tut nichts', tipps.danebenFalsch.slice(0, 4));
  ok(tipps.doppelt > 3 && !tipps.doppeltFalsch.length, 'Doppeltipp überspringt keinen Schritt', tipps.doppeltFalsch.slice(0, 4));
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 5));
  await b.close();
})();
