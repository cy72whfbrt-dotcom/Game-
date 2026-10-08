// Märsche und Kämpfe als KI-Bilder im echten Spiel (03f, Alexander 8.10.) – Handy UND Desktop (Vorschau mit echten Zahlen):
// A) Kampf: dein Angriff + 2. Welle + Verbündeter = EIN Kampf (Tafel „3 Armeen“, Summe = Kampf-Zahlen), Verteidiger-Zahl sichtbar und
//    sinkt, Verstärker des Gegners mit eigenem Sechseck, fremder Dritter wartet sichtbar („⌛ wartet“), keine Sechsecke übereinander
// B) Märsche: Truppen-Chip am Sechseck = Spieldaten, Rally (goldener Kopf), Sammeln (Karren), Späher, Zurückgerufen (Rückweg)
// C) Antippen: eigene Armee → runde Knöpfe Info/Zurück/Schneller, fremde → Info/Angreifen/Spähen; Bilder/s bei vielen Märschen
// (MARSCH_FOTOS=<ordner>: Bildschirmfotos dorthin)
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2], FOTOS = process.env.MARSCH_FOTOS || '';
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
const ueber = l => { let n = []; for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { const a = l[i], b = l[j];   // Sechsecke (mit Chip) übereinander?
  const f = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  if (f > .15 * Math.min(a.w * a.h, b.w * b.h)) n.push(a.text + ' / ' + b.text); } return n; };
(async () => {
  const br = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const fe = [];
  for (const [name, geraet] of [['Handy', { ...devices['iPhone 13'] }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const p = await (await br.newContext(geraet)).newPage(); p.on('pageerror', e => fe.push(name + ': ' + e.message));
    await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(8000);
    await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof AUF !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
    const foto = async n => { if (FOTOS) await p.screenshot({ path: path.join(FOTOS, name.toLowerCase() + '_' + n + '.png') }); };
    const bild = () => p.evaluate(() => new Promise(r => { requestRender(); requestAnimationFrame(() => requestAnimationFrame(() => r(JSON.parse(JSON.stringify(mzAnzeige))))); }));
    // ===== A) gemeinsamer Kampf =====
    const ids = await p.evaluate(() => {
      for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (Mitspieler ruhig)
      pendingAttacks = []; pendingSends = []; pendingRetreats = []; pendingScouts = [];
      const home = islandById[playerIslandId], L = home.landmassId, weg = i => Math.hypot(i.x - home.x, i.y - home.y);
      const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size);
      for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' }); if (bundVon('player')) bundOp('player', { op: 'verlassen' });
      const [A, B, C, Dd] = bots; bundAustritt.clear();   // (gerade ausgetreten: sonst erst in 1 Std. wieder)
      botCoins[A.id] = botCoins[B.id] = 1e9; bundOp(A.id, { op: 'gruenden', name: 'Marschtest', tag: 'MT', offen: true }); bundRein(bundVon(A.id), 'player'); bundSpeichern();
      bundOp(B.id, { op: 'gruenden', name: 'Gegner', tag: 'GG', offen: true }); bundOp(C.id, { op: 'beitreten', aid: bundVon(B.id).id });
      const frei = islands.filter(i => i.landmassId === L && i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && !isCapital(i.id) && i.id !== home.id).sort((x, y) => weg(x) - weg(y));
      const gib = (w, id) => { clearIslandOwner(id); if (w === 'player') ownedIslands.add(id); else botOwnedIslands[w].add(id); };
      const T = frei[2], ia = frei[0], idd = frei[4], own2 = frei[1];
      gib(B.id, T.id); gib(A.id, ia.id); gib(Dd.id, idd.id); gib('player', own2.id); islandLevels[own2.id] = islandLevels[own2.id] || 1;
      for (const w of [A.id, B.id, Dd.id]) { const st = loadBotState()[w]; if (st) st.neuBis = 0; botDropShield(w); }
      islandTroops[T.id] = 5e6; islandTroops[home.id] = 1e9; islandTroops[own2.id] = 1e8; islandTroops[ia.id] = 1e8; islandTroops[idd.id] = 1e8;
      verst.l.push({ id: 'vtest', w: C.id, t: T.id, n: 3e6, von: botCapitalOf(C.id), at: Date.now() });
      revealAround(T.x, T.y, 60000, false); scoutedIslands.add(T.id);
      window.__los = (src, who, n, ms) => { AUF.frei && AUF.frei.an(); try { launchAttack(src, T.id, who, n); } finally { AUF.frei && AUF.frei.aus(); }
        const a = pendingAttacks[pendingAttacks.length - 1]; const now = Date.now(); a.startedAt = now - 20000; a.resolveAt = now + ms; return a.rawTroops; };
      __los(home.id, null, 6e6, 200);
      flyTo(T.x, T.y + 1500, { instant: true, zoom: innerWidth >= 700 ? .03 : .02 });
      if (!bundFreund('player', A.id) || !bundFreund(B.id, C.id)) return { fehler: 'Bündnisse nicht aufgesetzt' };
      return { T: T.id, A: A.id, B: B.id, C: C.id, D: Dd.id, home: home.id, own2: own2.id, frei: frei.slice(3, 8).map(i => i.id) };
    });
    ok(!ids.fehler, name + ': Bündnisse aufgesetzt (du + Verbündeter, Gegner + sein Verbündeter)', ids);
    await p.waitForFunction(T => pendingAttacks.some(a => a.targetId === T && a.fightEndsAt), ids.T, { timeout: 8000, polling: 100 }).catch(() => {});
    await p.evaluate(ids => { __los(ids.own2, null, 3e6, 300); __los(ids.home, null, 2e6, 400); __los(botCapitalOf(ids.A) && islandById[botCapitalOf(ids.A)].landmassId === islandById[ids.T].landmassId ? botCapitalOf(ids.A) : [...botOwnedIslands[ids.A]].find(id => islandById[id].landmassId === islandById[ids.T].landmassId), ids.A, 4e6, 500);
      __los([...botOwnedIslands[ids.D]].find(id => islandById[id].landmassId === islandById[ids.T].landmassId), ids.D, 5e6, 600); }, ids);
    await p.waitForTimeout(700);
    // Verbündeter kommt dazu: beim Weltrechner sind alle Spieler Mitspieler – er legt die Welle in den Kampf (kampfDazu) und schickt
    // sie dem Handy mit der Kampf-Zeit (Zuschauer) – hier so nachgestellt
    await p.evaluate(ids => { const f = pendingAttacks.find(a => a.targetId === ids.T && a.fightEndsAt), v = f && pendingAttacks.find(a => a.attackerBotId === ids.A && a.targetId === ids.T);
      if (v) { v.fightEndsAt = f.fightEndsAt; v.resolveAt = Date.now(); } }, ids);
    await p.waitForTimeout(700);
    const k1 = await bild(); await foto('kampf');
    await p.waitForTimeout(3500);
    const k2 = await bild();
    const daten = await p.evaluate(T => { const f = pendingAttacks.find(a => a.targetId === T && a.fightEndsAt); const b = f && mapBattles.find(x => x.attackId === kampfKey(f));
      return { teile: f ? (f.rally ? f.rally.an.length : f.quellen ? f.quellen.length : 1) + pendingAttacks.filter(a => a !== f && a.targetId === T && a.fightEndsAt).length : 0, n: f ? f.rawTroops : 0, b: b ? { my: b.my, en: b.en } : null,
        wartet: pendingAttacks.filter(a => a.targetId === T && !a.fightEndsAt).length }; }, ids.T);
    const kf = k1.kaempfe.find(k => k.ziel === ids.T), kf2 = k2.kaempfe.find(k => k.ziel === ids.T);
    console.log(name, JSON.stringify({ daten, kf, kf2, koepfe: k1.koepfe.map(k => k.art + ':' + k.text) }));
    ok(kf && daten.teile >= 3 && kf.armeen === daten.teile && kf.tafel.startsWith(daten.teile + ' Armeen'), name + ': 2 eigene Wellen + Verbündeter = EIN Kampf, Tafel „N Armeen“', { daten, kf });
    const summe = k1.koepfe.filter(k => k.art === 'kampf').reduce((x, k) => x + k.n, 0);
    ok(kf && Math.abs(summe - kf.a) <= daten.teile && kf.a <= daten.b.my && kf.a > 0, name + ': Zahlen an den Armeen = Summe des Kampfs (aus den Spieldaten)', { summe, kf, b: daten.b });
    const dSumme = k1.koepfe.filter(k => k.art === 'vert' || k.art === 'verst').reduce((x, k) => x + k.n, 0);
    ok(kf && kf.helfer >= 1 && k1.koepfe.some(k => k.art === 'verst' && k.n > 0) && Math.abs(dSumme - kf.d) <= 2 && kf.d <= daten.b.en, name + ': Verteidiger + Verstärker des Gegners je mit Sechseck und Zahl', { dSumme, kf });
    ok(kf && kf2 && kf2.d < kf.d, name + ': Verteidiger-Zahl sinkt im Kampf', { vorher: kf && kf.d, nachher: kf2 && kf2.d });
    ok(daten.wartet >= 1 && k1.koepfe.some(k => /wartet/.test(k.text)), name + ': fremder Dritter wartet sichtbar (⌛ wartet)', daten);
    ok(!ueber(k1.koepfe).length, name + ': keine Sechsecke/Chips übereinander (Kampf)', ueber(k1.koepfe));
    // ===== B) Märsche: Chip = Spieldaten, Rally, Sammeln, Späher, Zurückgerufen =====
    await p.waitForFunction(T => !pendingAttacks.some(a => a.targetId === T), ids.T, { timeout: 30000, polling: 300 }).catch(() => {});
    await p.waitForTimeout(3000);
    const m0 = await p.evaluate(ids => {
      closeAllPopups(); pendingAttacks = []; pendingSends = []; pendingRetreats = []; pendingScouts = []; battleFx = [];
      const home = islandById[ids.home], now = Date.now(), halb = a => { a.startedAt = now - 300000; a.resolveAt = now + 300000; };
      AUF.frei && AUF.frei.an();
      try {
        launchAttack(ids.home, ids.frei[0], null, 7e6); const a = pendingAttacks[pendingAttacks.length - 1]; halb(a);
        launchAttack(ids.own2, ids.frei[1], null, 9e6); const r = pendingAttacks[pendingAttacks.length - 1]; halb(r);
        r.rally = { id: 'rt', by: 'player', an: [['player', ids.own2, 6e6], [ids.A, ids.own2, 3e6]] };   // (Anzeige wie eine Rally)
        const f = resFields.filter(f => f.landmassId === home.landmassId).sort((x, y) => Math.hypot(x.x - home.x, x.y - home.y) - Math.hypot(y.x - home.x, y.y - home.y))[0];
        fieldSend('player', ids.home, f.id, 60000); halb(fieldMarches[fieldMarches.length - 1]);
        launchSend(ids.home, ids.own2, null, 4e6); halb(pendingSends[pendingSends.length - 1]); recallMarch(marchKeyOf(pendingSends[pendingSends.length - 1]));
        launchScout(ids.frei[2]); if (pendingScouts.length) halb(pendingScouts[pendingScouts.length - 1]);
      } finally { AUF.frei && AUF.frei.aus(); }
      const xs = [home.x, islandById[ids.frei[0]].x, islandById[ids.own2].x], ys = [home.y, islandById[ids.frei[0]].y, islandById[ids.own2].y];
      flyTo(xs.reduce((s, v) => s + v) / 3, ys.reduce((s, v) => s + v) / 3, { instant: true, zoom: innerWidth >= 700 ? .022 : .016 });
      return { rueck: pendingRetreats.length, felder: fieldMarches.filter(m => m.who === 'player').length, spaeher: pendingScouts.length };
    }, ids);
    await p.waitForTimeout(800);
    const m1 = await bild(); await foto('maersche');
    const arten = await p.evaluate(() => marchTokens.map(m => m.info.art));
    console.log(name, JSON.stringify({ m0, arten, koepfe: m1.koepfe.map(k => k.art + ':' + k.text) }));
    ok(m1.koepfe.some(k => k.art === 'marsch' && /^7\sMio\./.test(k.text)), name + ': Angriff zeigt seine Truppen am Sechseck („7 Mio. · ⌛ …“)', m1.koepfe);
    ok(m1.koepfe.some(k => k.art === 'rally' && /^9\sMio\./.test(k.text)), name + ': Rally mit goldenem Kopf und ihrer Truppenzahl', m1.koepfe);
    ok(arten.includes('sammeln') && arten.includes('rueck') && arten.includes('spaeher'), name + ': Sammeln, Rückweg (zurückgerufen) und Späher stehen auf der Karte', { arten, m0 });
    ok(!ueber(m1.koepfe).length, name + ': keine Sechsecke/Chips übereinander (Märsche)', ueber(m1.koepfe));
    // ===== C) Antippen + Bilder/s =====
    const c = await p.evaluate(() => new Promise(r => { requestRender(); requestAnimationFrame(() => {
      const m = marchTokens.find(t => t.info.art === 'marsch' && t.mk && t.kopf); if (!m) return r({});
      handleTap(m.kopf.x + m.kopf.w / 2, m.kopf.y + m.kopf.h / 2); requestRender();
      requestAnimationFrame(() => requestAnimationFrame(() => r({ sel: selMarch, knoepfe: marchBtnRects.map(x => x.act), rund: marchBtnRects.every(x => x.w === 44 && x.h === 44) }))); }); }));
    ok(c.sel && JSON.stringify(c.knoepfe) === '["info","recall","speed"]' && c.rund, name + ': eigene Armee antippen → runde Knöpfe Info/Zurück/Schneller', c);
    await foto('knoepfe');
    const ohne = await p.evaluate(() => { selMarch = null; window.__alt = [pendingAttacks, pendingSends, pendingRetreats, pendingScouts]; pendingAttacks = []; pendingSends = []; pendingRetreats = []; pendingScouts = [];
      return new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; requestRender(); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }); });
    await p.evaluate(() => { [pendingAttacks, pendingSends, pendingRetreats, pendingScouts] = __alt; });
    const bps = await p.evaluate(ids => { selMarch = null; const now = Date.now(), b = [...ownedIslands];
      for (let i = 0; i < 24; i++) { const a = { fromId: b[i % b.length], toId: b[(i + 1) % b.length], troops: 1e5 * (i + 1), startedAt: now - 1e5 * (i % 7 + 1), resolveAt: now + 1e5 * (8 - i % 7), senderBotId: null };
        if (a.fromId !== a.toId) pendingSends.push(a); }
      let ms = 0; const mess = n => { const f = window[n]; window[n] = function () { const t = performance.now(); const r = f.apply(this, arguments); ms += performance.now() - t; return r; }; };
      for (const n of ['drawMarchLine', 'drawMarchTokens', 'drawMarchChips', 'drawMapBattles']) mess(n);   // (Rechenzeit der Marsch-Anzeige je Bild)
      return new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; requestRender(); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else r({ bps: Math.round(n * 1000 / (performance.now() - t0)), ms: Math.round(ms / n * 10) / 10 }); }; requestAnimationFrame(f); }); }, ids);
    console.log(name + ': ' + bps.bps + ' Bilder/s bei ' + (await p.evaluate(() => marchTokens.length)) + ' Märschen auf dem Bild (ohne Märsche ' + ohne + '), Marsch-Anzeige ' + bps.ms + ' ms je Bild');
    ok(bps.ms < 10, name + ': Marsch-Anzeige rechnet schnell (unter 10 ms je Bild, auch bei 4 Testläufen zugleich)', bps);
    await p.context().close();
  }
  ok(!fe.length, 'keine Skript-Fehler', fe);
  await br.close(); srv.close();
})();
