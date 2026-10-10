// Tutorial für neue Spieler (10c2, Alexander 10.10.): im echten Spiel von Burg 1 bis Burg 3 durchspielen – jeder Tipp geht als echter
// Klick in das Loch im Dunkel (Stadt-Schilder, Basen auf der Karte, Knöpfe in den echten Fenstern), Belohnungs-Fenster werden mit „OK“ zu.
// Prüft: am Anfang fast nichts zu sehen (nur Münzen + „Stadt“), Tipp neben das Loch tut nichts, jeder Schritt bringt sein „Neu: …“,
// Neuladen mittendrin bleibt beim Schritt, am Ende Burg 3 + Belohnung im Abholfach, Bündnis/Events erst später (Burg-Stufe);
// „Überspringen“ fragt erst (im Spiel) und zeigt dann alles; ein alter Spieler (ohne Tutorial-Stand) sieht alles wie bisher.
// Handy 390×844. Fotos je Schritt (t01_<schritt>.png …) in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const NEU = () => { window.__OW = { neu: true, nameGewaehlt: true }; window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; };
const HANDY = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } };
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [], bilder = process.argv[3], url = 'file://' + path.resolve(process.argv[2]) + '/index.html';
  const laden = async (p, vorher) => {
    if (vorher) await p.addInitScript(vorher);
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof tutZeigen === 'function', null, { timeout: 90000, polling: 500 });
    await p.waitForTimeout(3000);
  };
  const sichtbar = p => p.evaluate(() => {   // was ein Spieler sieht: Knöpfe unten, Werte oben, Karten-Knöpfe
    const da = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && e.getBoundingClientRect().width > 0).map(e => e.id || e.className.split(' ')[1] || e.className);
    return { unten: da('#cornerButtons .nav-btn'), oben: da('#hud .res'), karte: da('#mapControls button') };
  });
  // ---- 1) neuer Spieler: einmal ganz durch ----
  const ctx = await b.newContext(HANDY); let p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
  await laden(p, NEU);
  const start = await sichtbar(p), st0 = await p.evaluate(() => ({ s: tut.s, laeuft: tutLaeuft(), sicht: !document.getElementById('tut').hidden, willkommen: !!document.getElementById('wkName') }));
  ok(st0.laeuft && st0.s === 0 && st0.sicht && !st0.willkommen, 'neuer Spieler: Tutorial läuft ab Schritt 1, kein Namens-Fenster (Name aus der Anmeldung)', st0);
  ok(start.unten.join() === 'cityNavBtn' && !start.oben.some(x => /gem|troop/.test(x)) && start.karte.every(x => !/marker|army/.test(x)), 'am Anfang fast nichts: unten nur „Stadt“, oben keine Edelsteine/Truppen, keine Wegmarke/Armee', start);
  const s0 = await p.evaluate(() => tut.s); await p.mouse.click(10, 420); await p.waitForTimeout(400);
  ok(await p.evaluate(() => tut.s) === s0 && await p.evaluate(() => isPanelOpen(goalsPopup) || !cityView.hidden) === false, 'Tipp neben das Loch tut nichts');
  const gesehen = [], banner = new Set(); let neu = false, alt = -1, schritte = 0;
  for (let i = 0; i < 900; i++) {
    const z = await p.evaluate(() => {
      const el = id => document.getElementById(id), r = e => { const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height }; };
      const bn = el('tutBanner'); const o = { s: tut.s, k: (TUT[tut.s] || {}).k, fertig: !!tut.fertig, banner: bn.hidden ? '' : bn.textContent, satz: el('tutSatz').textContent };
      const bf = document.querySelector('#beuteFenster:not([hidden]) .bf-ok'), mod = ['levelUpBtn', 'rewardModalBtn'].map(el).find(x => x && x.offsetParent);
      if (bf || mod) return { ...o, modal: bf ? '.bf-ok' : '#' + mod.id };
      if (el('tut').hidden) return o;
      if (!el('tutWeiter').hidden) return { ...o, weiter: r(el('tutWeiter')) };
      if (!el('tutLoch').hidden && !el('tutFinger').hidden) return { ...o, loch: r(el('tutLoch')), ueber: !!document.elementFromPoint(r(el('tutLoch')).x, r(el('tutLoch')).y).closest('#tut') };
      return o;
    });
    if (z.fertig) break;
    if (z.banner) banner.add(z.banner);
    if (z.s !== alt) {                                     // neuer Schritt: Foto (Handy), merken
      alt = z.s; schritte++; await p.waitForTimeout(500);
      if (bilder) await p.screenshot({ path: path.join(bilder, 't' + String(z.s + 1).padStart(2, '0') + '_' + z.k + '.png') });
      gesehen.push(z.k);
      if (z.k === 'karte' && !neu) {                       // Neuladen mittendrin: gleicher Schritt, gleiche Knöpfe
        neu = true; const vor = await p.evaluate(() => JSON.stringify(tut)), sv = await sichtbar(p);
        await p.reload(); await p.waitForFunction(() => typeof tutZeigen === 'function' && typeof islands !== 'undefined' && islands.length, null, { timeout: 90000 }); await p.waitForTimeout(3000);
        const nach = await p.evaluate(() => JSON.stringify(tut)), sn = await sichtbar(p);
        ok(JSON.parse(nach).s === JSON.parse(vor).s && JSON.stringify(sn.unten) === JSON.stringify(sv.unten), 'Neuladen mittendrin: gleicher Schritt, gleiche Knöpfe', { vor: JSON.parse(vor).s, nach: JSON.parse(nach).s, sv: sv.unten, sn: sn.unten });
        alt = -1; continue;
      }
    }
    if (z.modal) { await p.click(z.modal); await p.waitForTimeout(300); continue; }
    if (z.weiter) { await p.mouse.click(z.weiter.x, z.weiter.y); await p.waitForTimeout(400); continue; }
    if (z.loch) {
      if (z.ueber) { ok(false, 'Loch in Schritt ' + z.k + ' ist zugedeckt', z); break; }
      await p.mouse.click(z.loch.x, z.loch.y); await p.waitForTimeout(700); continue;
    }
    await p.waitForTimeout(500);                           // warten (Bau, Marsch, Kamera)
  }
  const ende = await p.evaluate(() => ({ fertig: !!tut.fertig, alles: !!tut.alles, burg: loadCity().levels.keep, held: Object.values(equippedItems).some(Boolean), helden: HEROES.filter(h => heroOwned('player', h.id)).length,
    geschenk: inboxList().some(x => x.title === 'Tutorial geschafft'), tz: [...document.body.classList].filter(c => c.startsWith('tz-')), gespeichert: JSON.parse(store.get('openWaterTutorial')).fertig === true,
    lumber: loadCity().levels.lumber, quarry: loadCity().levels.quarry, mine: loadCity().levels.mine, academy: loadCity().levels.academy, heroes: loadCity().levels.heroes }));
  if (bilder) await p.screenshot({ path: path.join(bilder, 't99_ende.png') });
  ok(ende.fertig && !ende.alles && ende.burg === 3 && ende.gespeichert, 'Tutorial komplett durchgespielt bis Burg 3 (' + schritte + ' Schritte)', { ende, gesehen });
  ok(ende.lumber && ende.quarry && ende.mine && ende.academy && ende.heroes && ende.held && ende.helden > 0, 'unterwegs gebaut: Holzfäller, Steinbruch, Eisenmine, Heldenhalle, Labor; Ausrüstung angelegt, Helden da', ende);
  ok(ende.geschenk, 'am Ende: Belohnung im Abholfach', ende);
  ok(['Stadt', 'Kampf', 'Abholen', 'Truppen', 'Shop', 'Profil', 'Rucksack', 'Aufgaben'].every(n => [...banner].some(t => t.includes(n))), '„Neu: …“ kommt für jedes neue Teil', [...banner]);
  ok(['bund', 'rang', 'events2', 'welt'].every(k => ende.tz.includes('tz-' + k)) && !ende.tz.includes('tz-shop'), 'nach dem Tutorial (Burg 3): Bündnis, Rangliste, Events, Teleport noch zu – der Rest da', ende.tz);
  const b4 = await p.evaluate(async () => { const c = loadCity(); c.levels.keep = 5; saveCity(); tutFrei(); await new Promise(f => setTimeout(f, 300)); return { tz: [...document.body.classList].filter(c => c.startsWith('tz-')), banner: document.getElementById('tutBanner').textContent }; });
  ok(!b4.tz.includes('tz-bund') && !b4.tz.includes('tz-events2') && b4.tz.includes('tz-welt') && /Bündnis/.test(b4.banner), 'Burg 5: Bündnis und Events kommen dazu (mit „Neu: …“), Teleport erst ab Burg 6', b4);
  await ctx.close();
  // ---- 2) Überspringen: erst fragen, „Weiter lernen“ bleibt, „Überspringen“ zeigt alles ----
  const c2 = await b.newContext(HANDY); p = await c2.newPage(); p.on('pageerror', e => fe.push(e.message)); await laden(p, NEU);
  await p.click('#tutWeg'); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => ({ frage: !document.getElementById('tutFrage').hidden, satz: document.getElementById('tutSatz').textContent, laeuft: tutLaeuft() }));
  await p.click('#tutNein'); await p.waitForTimeout(300);
  const nein = await p.evaluate(() => ({ laeuft: tutLaeuft(), frage: !document.getElementById('tutFrage').hidden }));
  await p.click('#tutWeg'); await p.waitForTimeout(200); await p.click('#tutJa'); await p.waitForTimeout(600);
  const ja = await p.evaluate(() => ({ laeuft: tutLaeuft(), weg: document.getElementById('tut').hidden, tz: [...document.body.classList].filter(c => c.startsWith('tz-')), confirms: window.__confirms, alles: tut.alles }));
  const jaSicht = await sichtbar(p);
  ok(fr.frage && /wirklich/i.test(fr.satz) && fr.laeuft, 'Überspringen fragt erst „Wirklich?“ im Spiel', fr);
  ok(nein.laeuft && !nein.frage, '„Weiter lernen“: Tutorial läuft weiter', nein);
  ok(!ja.laeuft && ja.weg && !ja.tz.length && ja.confirms === 0 && ja.alles && jaSicht.unten.length >= 7, '„Überspringen“: alles sichtbar (kein Browser-Fenster)', { ja, unten: jaSicht.unten });
  await c2.close();
  // ---- 3) alter Spieler (kein Tutorial-Stand): alles wie bisher ----
  const c3 = await b.newContext(HANDY); p = await c3.newPage(); p.on('pageerror', e => fe.push(e.message)); await laden(p, null);
  const alt3 = await p.evaluate(() => ({ tut, tz: [...document.body.classList].filter(c => c.startsWith('tz-')), weg: document.getElementById('tut').hidden })), s3 = await sichtbar(p);
  ok(!alt3.tut && !alt3.tz.length && alt3.weg && s3.unten.length >= 7 && s3.oben.some(x => /gem/.test(x)), 'alter Spieler: kein Tutorial, alles sichtbar wie bisher', { alt3, s3 });
  await c3.close();
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 5));
  await b.close();
})();
