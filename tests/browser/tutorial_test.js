// Tutorial für neue Spieler (10c2, Alexander 10.10.): im echten Spiel von Burg 1 bis Burg 3 durchspielen – jeder Tipp geht als echter
// Klick in das Loch im Dunkel (Stadt-Schilder, Basen auf der Karte, Knöpfe in den echten Fenstern), Belohnungs-Fenster werden mit „OK“ zu.
// Prüft: eigenes Lager Stufe 1 (nur für ihn), am Anfang fast nichts zu sehen (nur Münzen + „Stadt“), Tipp neben das Loch tut nichts, jeder Schritt bringt sein „Neu: …“,
// Neuladen mittendrin bleibt beim Schritt, am Ende Burg 3 + Belohnung im Abholfach, Bündnis/Events erst später (Burg-Stufe);
// „Überspringen“ fragt erst (im Spiel) und zeigt dann alles; ein alter Spieler (ohne Tutorial-Stand) sieht alles wie bisher.
// Ziel immer ganz im Bild, Blase nie darüber (375×667: tutorial_klein_test), Teilschritte mit Zähler; Rohstoff-Kapseln behalten ihren Platz, leere Leiste/Zoom-Knöpfe weg, Kamera nah auf der Hauptstadt. Handy 390×844 und 375×667. Fotos je Schritt (t390_01_<schritt>.png …) in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const NEU = () => { window.__OW = { neu: true, nameGewaehlt: true }; window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; };
const HANDY = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } };
const KLEIN = process.env.OW_TUT_TEIL === 'klein';   // tutorial_klein_test: nur das kleine Handy (375×667) – jede Hälfte bleibt unter 15 Min.
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [], bilder = process.argv[3], url = 'file://' + path.resolve(process.argv[2]) + '/index.html';
  const laden = async (p, vorher) => {
    if (vorher) await p.addInitScript(vorher);
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof tutZeigen === 'function', null, { timeout: 90000, polling: 500 });
    await p.waitForTimeout(3000);
  };
  const sichtbar = p => p.evaluate(() => {   // was ein Spieler sieht: Knöpfe unten, Werte oben, Karten-Knöpfe
    const da = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => e.id || e.className.split(' ')[1] || e.className);
    return { unten: da('#cornerButtons .nav-btn'), oben: da('#hud .res'), karte: da('#mapControls button'), leiste: getComputedStyle(document.getElementById('cornerButtons')).visibility };
  });
  // ---- einmal ganz durchspielen: jeder Tipp ins Loch; prüft dabei: Loch ganz im Bild (≥ 2 px), Blase deckt es nie, Teilschritte mit eigenem Satz ----
  const spielen = async (p, W, H, mitNeuladen) => {
    const gesehen = [], banner = new Set(), neuer = new Set(), probleme = [], heldSaetze = new Set(), zaehler = new Set(); let neu = !mitNeuladen, alt = -1, schritte = 0, hinweis = '', truppen = null, doppelt = null;
    const geholt = new Set(), bild = r => { const u = r.url(); if (/\/bilder\//.test(u)) geholt.add('bilder/' + u.split('/bilder/')[1].split('?')[0]); };   // jedes Bild, das im Tutorial geholt wird
    p.on('request', bild); const bericht = { saetze: new Set(), kd: null, zu: null };
    for (let i = 0; i < 900; i++) {
      const z = await p.evaluate(() => {
        const el = id => document.getElementById(id), r = e => { const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height, l: q.left, t: q.top, r: q.right, b: q.bottom }; };
        const bn = el('tutBanner'); const o = { s: tut.s, k: (TUT[tut.s] || {}).k, fertig: !!tut.fertig, banner: bn.hidden ? '' : bn.textContent, satz: el('tutSatz').textContent,
          zl: el('tutZaehler').hidden ? '' : el('tutZaehler').dataset.teil, neuer: [...document.querySelectorAll('.tut-neuer')].map(e => e.id) };
        const bf = document.querySelector('#beuteFenster:not([hidden]) .bf-ok'), mod = ['levelUpBtn', 'rewardModalBtn'].map(el).find(x => x && x.offsetParent);
        if (bf || mod) return { ...o, modal: bf ? '.bf-ok' : '#' + mod.id };
        if (el('tut').hidden) return o;
        if (!el('tutWeiter').hidden) return { ...o, weiter: r(el('tutWeiter')) };
        if (!el('tutLoch').hidden && !el('tutFinger').hidden) return { ...o, loch: r(el('tutLoch')) };
        return o;
      });
      if (z.fertig) break;
      if (z.banner) banner.add(z.banner); for (const n of z.neuer || []) neuer.add(n);
      if (z.k === 'held') { heldSaetze.add(z.satz); if (z.zl) zaehler.add(z.zl); }
      if (z.k === 'bericht') { bericht.saetze.add(z.zl + ' ' + z.satz);
        if (z.zl === '4/4' && !bericht.kd) bericht.kd = await p.evaluate(() => { const kl = document.querySelector('.kl-seite'), e = document.elementFromPoint(innerWidth / 2, 3);
          return { offen: !kl.hidden, tutOben: !!(e && e.closest('#tut')), weiter: !document.getElementById('tutWeiter').hidden, loch: !document.getElementById('tutLoch').hidden }; }); }
      if (z.k === 'beute' && !bericht.zu) bericht.zu = await p.evaluate(() => ({ klZu: document.querySelector('.kl-seite').hidden }));
      if (z.s !== alt) {                                     // neuer Schritt: Foto, merken
        alt = z.s; schritte++; await p.waitForTimeout(500);
        if (bilder) await p.screenshot({ path: path.join(bilder, 't' + W + '_' + String(z.s + 1).padStart(2, '0') + '_' + z.k + '.png') });
        gesehen.push(z.k);
        if (z.k === 'stein') hinweis = await p.evaluate(() => { flashHint('Test-Hinweis', 3000); const h = getComputedStyle(document.getElementById('hint')).display; flashHint('', 1); return h; });
        if (z.k === 'karte' && !neu) {                       // Neuladen mittendrin: gleicher Schritt, gleiche Knöpfe
          neu = true; const vor = await p.evaluate(() => JSON.stringify(tut)), sv = await sichtbar(p);
          await p.reload(); await p.waitForFunction(() => typeof tutZeigen === 'function' && typeof islands !== 'undefined' && islands.length, null, { timeout: 90000 }); await p.waitForTimeout(3000);
          const nach = await p.evaluate(() => JSON.stringify(tut)), sn = await sichtbar(p);
          ok(JSON.parse(nach).s - JSON.parse(vor).s <= 1 && JSON.parse(nach).s >= JSON.parse(vor).s && JSON.stringify(sn.unten) === JSON.stringify(sv.unten), 'Neuladen mittendrin: gleicher Schritt (oder schon erledigt: der nächste), gleiche Knöpfe', { vor: JSON.parse(vor).s, nach: JSON.parse(nach).s, sv: sv.unten, sn: sn.unten });
          alt = -1; continue;
        }
      }
      if (z.modal) { await p.click(z.modal); await p.waitForTimeout(300); continue; }
      if (z.weiter && z.k === 'truppen' && !truppen) truppen = await p.evaluate(() => { const zahl = (document.getElementById('tutSatz').textContent.match(/Du hast ([\d.]+) Truppen/) || [])[1];
        const alle = totalTroops() + pendingAttacks.filter(a => !a.attackerBotId).reduce((a, x) => a + x.rawTroops, 0) + pendingRetreats.reduce((a, x) => a + x.troops, 0);
        return { satz: zahl ? +zahl.replace(/\./g, '') : null, alle, kapsel: document.getElementById('troopCount').textContent }; });
      if (z.weiter) { await p.mouse.click(z.weiter.x, z.weiter.y); await p.waitForTimeout(400); continue; }
      if (z.loch && !doppelt && await p.evaluate(() => { const q = document.getElementById('tutLoch').getBoundingClientRect(), n = document.getElementById('cityNavBtn').getBoundingClientRect();
          return q.left <= n.left + n.width / 2 && q.right >= n.left + n.width / 2 && q.top <= n.top + n.height / 2 && q.bottom >= n.top + n.height / 2; })) {   // Loch auf „Stadt“: zweimal tippen –
        const vor = await p.evaluate(() => cityView.hidden);   // die Stadt geht auf und bleibt auf (das alte Loch nimmt keinen zweiten Tipp, kein Loch während sie umblendet)
        await p.mouse.click(z.loch.x, z.loch.y);
        const busy = await p.evaluate(v => new Promise(f => { let loch = false; const t = setInterval(() => { loch = loch || cityBusy && !document.getElementById('tutLoch').hidden;
          if (cityView.hidden !== v && !cityBusy) { clearInterval(t); f(loch); } }, 15); }), vor);
        await p.mouse.click(z.loch.x, z.loch.y);                // (genau, wenn die Stadt da ist: ein Spieler tippt nochmal)
        await p.waitForTimeout(1500); doppelt = await p.evaluate(v => ({ gewechselt: cityView.hidden !== v, k: TUT[tut.s].k }), vor);
        doppelt.lochWaehrendWechsel = busy; continue;
      }
      if (z.loch) {
        await p.waitForTimeout(350);                         // (Loch gleitet zum Ziel; danach neu messen)
        const l = await p.evaluate(() => { const q = document.getElementById('tutLoch').getBoundingClientRect(), b = document.getElementById('tutBerater').getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
          return { x, y, w: q.width, l: q.left, t: q.top, r: q.right, b: q.bottom, weg: document.getElementById('tut').hidden || document.getElementById('tutLoch').hidden,
            blase: b.left < q.right && q.left < b.right && b.top < q.bottom && q.top < b.bottom, ueber: !!(document.elementFromPoint(x, y) || { closest: () => 1 }).closest('#tut') }; });
        if (l.weg || !l.w) continue;                           // (inzwischen anderes Fenster)
        if (l.l < 0 || l.t < 0 || l.r > W || l.b > H) probleme.push(z.k + ': Loch außerhalb ' + [l.l, l.t, l.r, l.b].map(Math.round));
        if (l.blase && await (async () => { await p.waitForTimeout(800);   // (Loch gleitet noch, Fenster fährt noch auf: nach dem Gleiten nochmal messen)
          return p.evaluate(() => { const q = document.getElementById('tutLoch').getBoundingClientRect(), b = document.getElementById('tutBerater').getBoundingClientRect();
            return !document.getElementById('tutLoch').hidden && b.left < q.right && q.left < b.right && b.top < q.bottom && q.top < b.bottom; }); })()) probleme.push(z.k + ': Blase über dem Loch');
        if (l.ueber) {                                       // (gleitet gerade: kurz warten, dann muss es frei sein)
          await p.waitForTimeout(800);
          if (await p.evaluate(() => { const q = document.getElementById('tutLoch').getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !document.getElementById('tutLoch').hidden && !!(e && e.closest('#tut')); })) { ok(false, 'Loch in Schritt ' + z.k + ' ist zugedeckt', l); break; }
          continue;
        }
        await p.mouse.click(l.x, l.y); await p.waitForTimeout(700); continue;
      }
      await p.evaluate(() => {                               // Warten (Marsch, Bau) vorspulen – der Test hat 15 Min.: bleibt 1 s, Fortschritt passt
        if (document.getElementById('tutFort').hidden) return; const t = Date.now(), vor = (x, e, s) => { const d = x[e] - t - 1000; if (d > 0) { x[e] -= d; x[s] -= d; } };
        pendingAttacks.filter(a => !a.attackerBotId).forEach(a => vor(a, 'resolveAt', 'startedAt')); pendingRetreats.forEach(r => vor(r, 'resolveAt', 'startedAt'));
        barbMarches.filter(m => m.who === 'player' && !m.back).forEach(m => vor(m, 'resolveAt', 'startedAt')); loadCity().builds.forEach(b => vor(b, 'endsAt', 'startedAt')); });
      await p.waitForTimeout(500);                           // warten (Bau, Marsch, Kamera)
    }
    p.off('request', bild);
    const vorab = await p.evaluate(() => ({ liste: window.__bilderVorab ? __bilderVorab.liste : [], nach: window.__bilderVorab && __bilderVorab.nach ? [...__bilderVorab.nach] : [], e: Object.keys(tut.e || {}) }));
    const fehlt = [...geholt].filter(u => !vorab.liste.includes(u) && !vorab.nach.includes(u) && !/titel_/.test(u));   // (Titelbild: lädt das Ladebild selbst)
    return { gesehen, banner, neuer: [...neuer], schritte, hinweis, probleme, heldSaetze: [...heldSaetze], zaehler: [...zaehler], truppen, doppelt, bericht: { ...bericht, saetze: [...bericht.saetze] }, fehlt, vorabN: vorab.liste.length, erkl: vorab.e };
  };
  const pruefSicht = (r, wo) => {
    ok(r.truppen && r.truppen.satz === r.truppen.alle, wo + ': Schritt „Truppen“ nennt die echte Zahl aller Truppen des Spielers (Basen + unterwegs)', r.truppen);
    ok(!r.probleme.length, wo + ': bei jedem Schritt ist das Ziel ganz im Bild und die Blase liegt nie darüber', r.probleme.slice(0, 6));
    ok(r.doppelt && r.doppelt.gewechselt && !r.doppelt.lochWaehrendWechsel, wo + ': zweimal auf „Stadt“ (zweiter Tipp genau, wenn die Stadt da ist) – sie bleibt offen, kein Loch während sie umblendet', r.doppelt);
    ok(r.bericht.saetze.some(x => /^3\/4 .*Kampfdetails/.test(x)) && r.bericht.kd && r.bericht.kd.offen && r.bericht.kd.tutOben && r.bericht.kd.weiter && r.bericht.kd.loch && r.bericht.saetze.some(x => /^4\/4 .*Beute.*neue Truppen/.test(x)) && r.bericht.zu && r.bericht.zu.klZu,
      wo + ': Kampfbericht: Tipp auf „Kampfdetails“, dann erklärt Aldric die Seite (Loch über der Seite, „Weiter“), danach ist sie zu', r.bericht);
    ok(['bauinfo', 'angriff', 'halle'].every(k => r.erkl.includes(k)), wo + ': Erklär-Teilschritte gesehen (Bau-Info, Angriffsleiste, Helden)', r.erkl);
    ok(r.vorabN > 150 && !r.fehlt.length, wo + ': kein Bild wird im Tutorial erst nachgeladen – alle stehen in der Vorab-Liste des Ladebilds', { n: r.vorabN, fehlt: r.fehlt });
    ok(r.heldSaetze.length >= 3 && r.heldSaetze.some(x => /Karte/.test(x)) && r.heldSaetze.some(x => /Basis/.test(x)) && r.zaehler.some(x => /^\d\/5$/.test(x)), wo + ': Schritt „Held“ sagt je Teilschritt, was zu tun ist (mit Zähler x/5)', { s: r.heldSaetze, z: r.zaehler });
  };
  let p;
  if (!KLEIN) {
  // ---- 1) neuer Spieler: einmal ganz durch ----
  const ctx = await b.newContext(HANDY); p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
  await laden(p, NEU);
  const wk = await p.evaluate(() => ({ an: !document.getElementById('tutWillkommen').hidden, name: !document.getElementById('twNameZeile').hidden, tut: !document.getElementById('tut').hidden, unten: [...document.querySelectorAll('#cornerButtons .nav-btn')].filter(e => e.getClientRects().length).length }));
  ok(wk.an && !wk.name && !wk.tut && !wk.unten, 'zuerst das Willkommen (mit Server ohne Namensfeld), darunter nichts zu tippen', wk);
  if (bilder) await p.screenshot({ path: path.join(bilder, 't00_willkommen.png') });
  await p.click('#twLos'); await p.waitForTimeout(600);
  const start = await sichtbar(p), st0 = await p.evaluate(() => ({ s: tut.s, laeuft: tutLaeuft(), sicht: !document.getElementById('tut').hidden, willkommen: !!document.getElementById('wkName') }));
  ok(st0.laeuft && st0.s === 0 && st0.sicht && !st0.willkommen, 'neuer Spieler: Tutorial läuft ab Schritt 1, kein Namens-Fenster (Name aus der Anmeldung)', st0);
  ok(!start.unten.length && !start.oben.some(x => /gem|troop/.test(x)) && start.karte.every(x => !/marker|army/.test(x)), 'am Anfang fast nichts: unten keine Knöpfe, oben keine Edelsteine/Truppen, keine Zoom-Knöpfe/Wegmarke/Armee', start);
  ok(start.leiste === 'hidden', 'ohne Knopf keine leere Leiste unten', start.leiste);
  const lg = await p.evaluate(() => { const c = barbState.camps.find(x => x.fuer === 'player'), h = islandById[playerIslandId], bot = BOT_DEFS[0].id, cap = botCapitalOf(bot);
    const vor = islandTroops[cap]; islandTroops[cap] = Math.max(vor || 0, 5000); const fremd = c ? barbSend(bot, cap, 'c', c.id, 1000) : null; islandTroops[cap] = vor;
    return { da: !!c, L: c && c.L, weit: c && Math.round(Math.hypot(c.x - h.x, c.y - h.y)), fremd, nochDa: !!(c && barbCampById(c.id)) }; });
  ok(lg.da && lg.L === 1 && lg.weit < 20000 && lg.fremd === false && lg.nochDa, 'neuer Spieler hat sein Barbaren-Lager Stufe 1 nahe der Hauptstadt – ein Mitspieler darf es nicht angreifen', lg);
  const s0 = await p.evaluate(() => tut.s); await p.mouse.click(10, 420); await p.waitForTimeout(400);
  ok(await p.evaluate(() => tut.s) === s0 && await p.evaluate(() => isPanelOpen(goalsPopup) || !cityView.hidden) === false, 'Tipp neben das Loch tut nichts');
  const r1 = await spielen(p, 390, 844, true), { gesehen, banner, neuer, schritte, hinweis } = r1;
  pruefSicht(r1, '390×844');
  const ende = await p.evaluate(() => ({ fertig: !!tut.fertig, alles: !!tut.alles, burg: loadCity().levels.keep, held: Object.values(equippedItems).some(Boolean), helden: HEROES.filter(h => heroOwned('player', h.id)).length,
    frei: tut.frei, geschenk: (f => !f.hidden && /Geschafft/.test(f.textContent) && /100/.test(f.textContent))(document.getElementById('beuteFenster')) && !inboxList().some(x => x.title === 'Tutorial geschafft'), tz: [...document.body.classList].filter(c => c.startsWith('tz-')), gespeichert: JSON.parse(store.get('openWaterTutorial')).fertig === true,
    lumber: loadCity().levels.lumber, quarry: loadCity().levels.quarry, mine: loadCity().levels.mine, academy: loadCity().levels.academy, heroes: loadCity().levels.heroes }));
  if (bilder) await p.screenshot({ path: path.join(bilder, 't99_ende.png') });
  ok(ende.fertig && !ende.alles && ende.burg === 3 && ende.gespeichert, 'Tutorial komplett durchgespielt bis Burg 3 (' + schritte + ' Schritte)', { ende, gesehen });
  ok(ende.lumber && ende.quarry && ende.mine && ende.academy && ende.heroes && ende.held && ende.helden > 0, 'unterwegs gebaut: Holzfäller, Steinbruch, Eisenmine, Heldenhalle, Labor; Ausrüstung angelegt, Helden da', ende);
  ok(ende.geschenk, 'am Ende: 100 Edelsteine gleich abgeholt, als Bild + Zahl („Geschafft!“)', ende);
  ok(gesehen.includes('lager') && gesehen.indexOf('lager') < gesehen.indexOf('bericht'), 'erster Angriff = das eigene Barbaren-Lager, danach Kampfbericht', gesehen);
  ok(hinweis === 'none', 'im Tutorial liegt kein normaler Hinweis über Sprechblase oder „Überspringen“', hinweis);
  ok(!banner.size && ['cityNavBtn', 'battleLogBtn', 'goalsBtn', 'shopBtn', 'rucksackBtn'].every(k => neuer.includes(k)) && ['stadt', 'kampf', 'events', 'truppen', 'shop', 'profil', 'rucksack', 'aufgaben'].every(k => ende.frei.includes(k)),
    'Teile kommen nach und nach dazu: neuer Knopf fliegt ein und trägt „NEU“ (kein Banner im Tutorial)', { banner: [...banner], neuer, frei: ende.frei });
  ok(['bund', 'rang', 'events2', 'welt'].every(k => ende.tz.includes('tz-' + k)) && !ende.tz.includes('tz-shop'), 'nach dem Tutorial (Burg 3): Bündnis, Rangliste, Events, Teleport noch zu – der Rest da', ende.tz);
  const dk = await p.evaluate(() => { const nav = document.getElementById('cornerButtons').getBoundingClientRect(), x = [...document.querySelectorAll('#cornerButtons .nav-btn')].filter(e => e.getClientRects().length).map(e => { const q = e.getBoundingClientRect(); return q.left + q.width / 2; });
    const d = x.slice(1).map((v, i) => v - x[i]); return { n: x.length, d: d.map(Math.round), links: Math.round(x[0] - nav.left), rechts: Math.round(nav.right - x[x.length - 1]) }; });
  ok(dk.n >= 5 && Math.max(...dk.d) - Math.min(...dk.d) <= 2 && Math.abs(dk.links - dk.rechts) <= 3, 'Handy-Leiste: Bündnis noch versteckt – die sichtbaren Knöpfe gleichmäßig über die ganze Leiste, keine Lücke', dk);
  const b4 = await p.evaluate(async () => { const c = loadCity(); c.levels.keep = 5; saveCity(); tutFrei(); await new Promise(f => setTimeout(f, 300)); return { tz: [...document.body.classList].filter(c => c.startsWith('tz-')), banner: document.getElementById('tutBanner').textContent }; });
  ok(!b4.tz.includes('tz-bund') && !b4.tz.includes('tz-events2') && b4.tz.includes('tz-welt') && /Bündnis/.test(b4.banner), 'Burg 5: Bündnis und Events kommen dazu (mit „Neu: …“), Teleport erst ab Burg 6', b4);
  const nm = await p.evaluate(async () => { beuteFensterZu(); for (const id of ['levelUpModal', 'rewardModal', 'dailyModal']) document.getElementById(id).hidden = true;   // (offene Belohnungs-Fenster: das Tutorial wartet sonst)
    const s1 = schluessel1, g0 = inboxList().filter(x => x.title === 'Tutorial geschafft').length; document.getElementById('tutNochmal').click();
    for (let i = 0; i < 8; i++) { await new Promise(f => setTimeout(f, 700)); const w = document.getElementById('tutWeiter'); if (!w.hidden) w.click(); }
    await new Promise(f => setTimeout(f, 2500));
    return { laeuft: tutLaeuft(), s: tut.s, lager: TUT.findIndex(x => x.k === 'lager'), belohnt: tut.belohnt, keineGeschenke: schluessel1 === s1 && !document.querySelector('#beuteFenster:not([hidden])'), g0 }; });
  ok(nm.laeuft && nm.belohnt && nm.keineGeschenke && nm.s >= nm.lager - 1, '„Tutorial noch mal“ (Einstellungen): läuft von vorn, Gebautes zählt als erledigt, keine zweiten Geschenke', nm);
  await ctx.close();
  // ---- 2) Überspringen: erst fragen, „Weiter lernen“ bleibt, „Überspringen“ zeigt alles ----
  const c2 = await b.newContext(HANDY); p = await c2.newPage(); p.on('pageerror', e => fe.push(e.message)); await laden(p, NEU); await p.click('#twLos'); await p.waitForTimeout(400);
  await p.click('#tutWeg'); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => ({ frage: !document.getElementById('tutFrage').hidden, satz: document.getElementById('tutSatz').textContent, laeuft: tutLaeuft() }));
  await p.click('#tutNein'); await p.waitForTimeout(300);
  const nein = await p.evaluate(() => ({ laeuft: tutLaeuft(), frage: !document.getElementById('tutFrage').hidden }));
  await p.click('#tutWeg'); await p.waitForTimeout(200); await p.click('#tutJa'); await p.waitForTimeout(600);
  const ja = await p.evaluate(() => ({ laeuft: tutLaeuft(), weg: document.getElementById('tut').hidden, tz: [...document.body.classList].filter(c => c.startsWith('tz-')), confirms: window.__confirms, alles: tut.alles }));
  const jaSicht = await sichtbar(p);
  ok(fr.frage && /wirklich/i.test(fr.satz) && fr.laeuft, 'Überspringen fragt erst „Wirklich?“ im Spiel', fr);
  ok(nein.laeuft && !nein.frage, '„Weiter lernen“: Tutorial läuft weiter', nein);
  ok(!ja.laeuft && ja.weg && !ja.tz.length && ja.confirms === 0 && ja.alles && jaSicht.unten.length >= 6, '„Überspringen“: alles sichtbar (kein Browser-Fenster)', { ja, unten: jaSicht.unten });
  await c2.close();
  // ---- 3) alter Spieler (kein Tutorial-Stand): alles wie bisher ----
  const c3 = await b.newContext(HANDY); p = await c3.newPage(); p.on('pageerror', e => fe.push(e.message)); await laden(p, null);
  const alt3 = await p.evaluate(() => ({ tut, tz: [...document.body.classList].filter(c => c.startsWith('tz-')), weg: document.getElementById('tut').hidden })), s3 = await sichtbar(p);
  ok(!alt3.tut && !alt3.tz.length && alt3.weg && s3.unten.length >= 6 && s3.oben.some(x => /gem/.test(x)), 'alter Spieler: kein Tutorial, alles sichtbar wie bisher', { alt3, s3 });
  await c3.close();
  }
  if (KLEIN) {
  // ---- 5) kleines Handy 375×667: einmal ganz durch, Ziel immer ganz im Bild ----
  const c5 = await b.newContext({ ...HANDY, viewport: { width: 375, height: 667 } }); p = await c5.newPage(); p.on('pageerror', e => fe.push(e.message)); await laden(p, NEU); await p.click('#twLos'); await p.waitForTimeout(600);
  const ap = await p.evaluate(async () => { const hm = islandById[playerIslandId], t = islands.filter(i => !islandOwnerOf(i.id) && i.type === 'tower').sort((a, b) => Math.hypot(a.x - hm.x, a.y - hm.y) - Math.hypot(b.x - hm.x, b.y - hm.y))[0];
    openIslandPopup(t); attackBtn.click(); await new Promise(f => setTimeout(f, 400)); const o = document.querySelector('#islandPopup .ap-oben--ohne'), k = document.querySelector('#islandPopup .ap-oben--ohne > .ap-kopf');
    const r = o && k ? [Math.round(o.getBoundingClientRect().width), Math.round(k.getBoundingClientRect().width)] : null; closeAllPopups(); return r; });
  ok(ap && ap[1] >= ap[0] * .9, '375×667: Angriffsfenster ohne Held nutzt die ganze Breite (nicht in eine schmale Spalte gequetscht)', ap);
  const r5 = await spielen(p, 375, 667, false); pruefSicht(r5, '375×667');
  ok(await p.evaluate(() => !!tut.fertig && loadCity().levels.keep === 3), '375×667: Tutorial bis Burg 3 durchgespielt', r5.gesehen);
  await c5.close();
  }
  if (!KLEIN) {
  // ---- 4) normale Vorschau (ohne „ohnetutorial“), frischer Speicher, kein Server: Tutorial startet, Tages-Belohnung erst danach ----
  const fs = require('fs'), v4 = fs.mkdtempSync(path.join(bilder || path.dirname(path.resolve(process.argv[2])), 'tut_vorschau_'));
  fs.cpSync(process.argv[2], v4, { recursive: true });
  fs.writeFileSync(v4 + '/index.html', fs.readFileSync(v4 + '/index.html', 'utf8').replace(/<script>window\.__owOhneTutorial = true;<\/script>\s*/, ''));
  const c4 = await b.newContext(HANDY); p = await c4.newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + v4 + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof tutZeigen === 'function' && typeof islands !== 'undefined' && islands.length, null, { timeout: 90000, polling: 500 });
  await p.waitForTimeout(4000);
  const st4 = await p.evaluate(() => ({ ow: !!window.__OW, laeuft: tutLaeuft(), s: tut && tut.s, wk: !document.getElementById('tutWillkommen').hidden, name: !document.getElementById('twNameZeile').hidden,
    vorschlag: document.getElementById('twName').value, tut: !document.getElementById('tut').hidden, tag: !document.getElementById('dailyModal').hidden })), s4 = await sichtbar(p);
  ok(!st4.ow && st4.laeuft && st4.s === 0 && st4.wk && st4.name && st4.vorschlag.length > 0 && st4.vorschlag.length <= 16 && !st4.tut && !st4.tag && !s4.unten.length,
    'normale Vorschau, frischer Speicher: Willkommen mit Namensfeld (Vorschlag), keine Tages-Belohnung, unten nichts', { st4, s4 });
  await p.fill('#twName', '   '); await p.click('#twLos'); await p.waitForTimeout(300);
  const leer = await p.evaluate(() => ({ wk: !document.getElementById('tutWillkommen').hidden, f: document.getElementById('twFehler').textContent }));
  ok(leer.wk && leer.f, 'leerer Name: Willkommen bleibt, mit Hinweis', leer);
  await p.fill('#twName', 'Seeräuberin Ida 12345'); await p.click('#twLos'); await p.waitForTimeout(800);
  const nm4 = await p.evaluate(() => ({ name: store.get('openWaterPlayerName'), wk: !document.getElementById('tutWillkommen').hidden, w: tut.w }));
  ok(nm4.name === 'Seeräuberin Ida' && !nm4.wk && nm4.w, 'Name (max. 16 Zeichen) steht im Spielstand, Willkommen zu', nm4);
  const roh = [];
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => !document.getElementById('tutLoch').hidden, null, { timeout: 5000 });   // (neue Kapseln fliegen erst ein: dann das Loch)
    const z = await p.evaluate(() => { const l = document.getElementById('tutLoch').getBoundingClientRect(), x = l.left + l.width / 2, y = l.top + l.height / 2;
      const t = document.getElementById('tut'); t.hidden = true; const e = document.elementFromPoint(x, y); t.hidden = false;
      const res = e && e.closest('.res'), m = document.querySelector('#hud .res--coin').getBoundingClientRect(), h = islandById[playerIslandId];
      const drin = sel => { const q = document.querySelector(sel).getBoundingClientRect(); return q.left >= l.left - 1 && q.right <= l.right + 1 && q.top >= l.top - 1 && q.bottom <= l.bottom + 1; };
      return { beide: drin('#hud .res--s') && drin('#hud .res--e'), muenze: [m.left, m.width].map(Math.round).join(), nah: mapState.zoom >= maxZoom * .9 && toSX(h.x) > 0 && toSX(h.x) < innerWidth && toSY(h.y) > innerHeight * .2 && toSY(h.y) < innerHeight * .7,
        hell: document.getElementById('tut').classList.contains('is-hell'), k: TUT[tut.s].k, satz: document.getElementById('tutSatz').textContent, weiter: !document.getElementById('tutWeiter').hidden,
        res: res ? res.className.replace('res ', '') : '', stadt: !!document.getElementById('cityNavBtn').getClientRects().length, stadtOffen: !cityView.hidden }; });
    roh.push(z);
    if (bilder && i < 2) await p.screenshot({ path: path.join(bilder, 'v_' + z.k + '.png') });
    await p.waitForTimeout(1200); ok(await p.evaluate(k => TUT[tut.s].k === k, z.k), 'Ressourcen-Schritt „' + z.k + '“ springt nicht von selbst weiter');
    await p.click('#tutWeiter'); await p.waitForTimeout(500);
  }
  ok(roh.map(x => x.k).join() === 'muenzen,r_holz,r_stein,r_gems' && roh.every(x => x.weiter && x.satz && !x.stadt && !x.stadtOffen)
    && ['res--coin', 'res--h', null, 'res--gem'].every((c, i) => c ? roh[i].res.includes(c) : roh[i].beide && /Stein und Eisen/.test(roh[i].satz)), 'Ressourcen erklärt (Loch auf Münzen, Holz, Stein + Eisen zusammen, Edelsteine), je mit „Weiter“; Stadt/Bauen noch zu', roh);
  ok(roh.every(x => x.muenze === roh[0].muenze) && +roh[0].muenze.split(',')[1] < 390 / 3, 'Münz-Kapsel behält Größe und Platz, auch wenn nur sie zu sehen ist (nie über die ganze Breite)', roh.map(x => x.muenze));
  ok(roh.every(x => x.nah && x.hell), 'Rohstoff-Schritte: Kamera nah auf der eigenen Hauptstadt, weniger abgedunkelt', roh.map(x => [x.nah, x.hell]));
  const nach4 = await p.evaluate(() => ({ k: TUT[tut.s].k, gem: getComputedStyle(document.querySelector('#hud .res--gem')).visibility !== 'hidden', leiste: getComputedStyle(document.getElementById('cornerButtons')).visibility, stadt: !!document.getElementById('cityNavBtn').getClientRects().length }));
  ok(nach4.k === 'holz' && !nach4.gem && nach4.stadt && nach4.leiste === 'visible', 'erst danach: Bauen (Stadt-Knopf kommt, mit ihm die Leiste), Edelsteine wieder weg', nach4);
  await c4.close(); fs.rmSync(v4, { recursive: true, force: true });
  }
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 5));
  await b.close();
})();
