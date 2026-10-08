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
const nah = l => l.filter(k => k.fig && Math.hypot(Math.max(k.x - k.fig.x - (k.fig.w || 0), 0, k.fig.x - k.x - k.w), Math.max(k.y - k.fig.y - (k.fig.h || 0), 0, k.fig.y - k.y - k.h)) > 60).map(k => k.text);   // Lücke Kopf–Figur über 60 px?
const leer = l => l.filter(k => ['marsch', 'rueck', 'rally', 'sammeln', 'kampf'].includes(k.art) && !/\d|\?/.test(k.text || '')).map(k => k.art + ':' + k.text);   // Sechseck ohne Zahl?
const ueber = l => { let n = []; for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { const a = l[i], b = l[j];   // Sechsecke (mit Chip) übereinander?
  const f = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  if (f > .15 * Math.min(a.w * a.h, b.w * b.h)) n.push(a.text + ' / ' + b.text); } return n; };
(async () => {
  const br = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const fe = [];
  for (const [name, geraet] of [['Handy', { ...devices['iPhone 13'] }], ['Handy360', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
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
    await p.evaluate(ids => { const now = Date.now();                       // Gedränge (Spieltest F1): zwei eigene Rückwege ziehen gerade vom Kampf weg
      for (const [n, nach] of [[1.8e6, ids.home], [1.6e6, ids.own2]]) pendingRetreats.push({ fromId: ids.T, toId: nach, troops: n, startedAt: now - 2000, resolveAt: now + 60000 }); }, ids);
    await p.waitForTimeout(700);
    await p.evaluate(T => flashHint('Verstärkung ist im Kampf um ' + islandTitle(islandById[T]) + ' eingetroffen: +2.000.000 Truppen, jetzt 11 Mio.', 8000), ids.T);
    await p.waitForTimeout(300);
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
    ok(!ueber(k1.koepfe).length, name + ': keine Sechsecke/Chips übereinander (Kampf mit 4 Armeen, Verstärker, Wartendem, 2 Rückwegen)', ueber(k1.koepfe));
    const imBild = await p.evaluate(() => { mzLeistenLesen(); return { schilde: bannerHitRects.slice(), leisten: mzLeisten, w: viewW, h: viewH }; });
    const stoert = (l, nur) => l.filter(k => !nur || nur.includes(k.art)).flatMap(k => imBild.schilde.concat(imBild.leisten).filter(q => Math.max(0, Math.min(k.x + k.w, q.x + q.w) - Math.max(k.x, q.x)) * Math.max(0, Math.min(k.y + k.h, q.y + q.h) - Math.max(k.y, q.y)) > .15 * k.w * k.h).map(() => k.text));
    ok(!stoert(k1.koepfe, ['kampf', 'rueck', 'marsch']).length, name + ': Armeen-Chips nicht auf Basis-Schildern oder Leisten', stoert(k1.koepfe, ['kampf', 'rueck', 'marsch']));
    ok(!nah(k1.koepfe).length, name + ': jeder Kopf dicht an seiner Armee (höchstens 60 px)', nah(k1.koepfe));
    ok(!leer(k1.koepfe).length, name + ': jedes Sechseck im Kampf zeigt eine Zahl', leer(k1.koepfe));
    const hint = await p.evaluate(() => { const c = canvas.getBoundingClientRect(), r = hintEl.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }; });
    const tafel = k1.koepfe.filter(k => k.art === 'tafel' && Math.max(0, Math.min(k.x + k.w, hint.x + hint.w) - Math.max(k.x, hint.x)) * Math.max(0, Math.min(k.y + k.h, hint.y + hint.h) - Math.max(k.y, hint.y)) > 0);
    ok(!tafel.length, name + ': Hinweis „Verstärkung …“ liegt nicht über der Kampf-Tafel', { hint, tafel });
    const unten = k1.koepfe.filter(k => (['vert', 'verst', 'kampf'].includes(k.art) || /wartet/.test(k.text)) && !(k1.oben || []).includes(k.text)).map(k => k.text);
    ok(!unten.length, name + ': Köpfe/Zahlen am Kampf (auch „⌛ wartet“) über Kreis, Säule und Speeren gezeichnet', unten);
    ok(!k1.koepfe.some(k => k.seite === 'eigen' && /wartet/.test(k.text)), name + ': eigene Wellen zeigen nie „⌛ wartet“', k1.koepfe.filter(k => /wartet/.test(k.text)));
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
    const ohneKopf = await p.evaluate(() => { mzLeistenLesen(); const oben = Math.max(0, ...mzLeisten.filter(q => q.y < 8 && q.w >= viewW).map(q => q.y + q.h));   // (unter der Kopfleiste verdeckt: ohne Kopf)
      return marchTokens.filter(m => m.info.art !== 'spaeher' && m.x > 0 && m.x < viewW && m.y > oben && m.y < viewH && !m.kopf).map(m => m.info.art); });
    ok(!ohneKopf.length, name + ': jeder Marsch im Bild hat seinen Kopf', ohneKopf);
    ok(!nah(m1.koepfe).length, name + ': Köpfe der Märsche dicht an ihrer Armee (höchstens 60 px)', nah(m1.koepfe));
    ok(!leer(m1.koepfe).length, name + ': jeder Marsch-Kopf zeigt eine Zahl (auch der Rückweg)', leer(m1.koepfe));
    const leiste = await p.evaluate(() => { mzLeistenLesen(); const hud = ['hud', 'midBar'].map(id => document.getElementById(id)).filter(e => e && !e.hidden).map(e => e.getBoundingClientRect()).filter(b => b.height);
      const unten = Math.max(0, ...hud.map(b => b.bottom - canvas.getBoundingClientRect().top)); return { unten, q: mzLeisten }; });
    const unterLeiste = m1.koepfe.filter(k => k.y < leiste.unten - 2 || leiste.q.some(q => Math.max(0, Math.min(k.x + k.w, q.x + q.w) - Math.max(k.x, q.x)) * Math.max(0, Math.min(k.y + k.h, q.y + q.h) - Math.max(k.y, q.y)) > .15 * k.w * k.h)).map(k => k.text);
    ok(!unterLeiste.length, name + ': kein Marsch-Kopf unter der Kopfleiste/dem Event-Streifen', { unterLeiste, unten: leiste.unten });
    ok(!ueber(m1.koepfe).length, name + ': keine Sechsecke/Chips übereinander (Märsche)', ueber(m1.koepfe));
    // ===== C) Antippen + Bilder/s =====
    const c = await p.evaluate(() => new Promise(r => { requestRender(); requestAnimationFrame(() => {
      const m = marchTokens.find(t => t.info.art === 'marsch' && t.mk && t.kopf); if (!m) return r({});
      handleTap(m.kopf.x + m.kopf.w / 2, m.kopf.y + m.kopf.h / 2); requestRender();
      requestAnimationFrame(() => requestAnimationFrame(() => r({ sel: selMarch, knoepfe: marchBtnRects.map(x => x.act), rund: marchBtnRects.every(x => x.w === 44 && x.h === 44) }))); }); }));
    ok(c.sel && JSON.stringify(c.knoepfe) === '["info","recall","speed"]' && c.rund, name + ': eigene Armee antippen → runde Knöpfe Info/Zurück/Schneller', c);
    await foto('knoepfe');
    const knoepfe = await p.evaluate(() => {                       // Spieltest F3/F4: Armee am rechten Rand / oben unter der Kopfleiste → Knöpfe frei im Bild, nie übereinander
      const out = {};
      for (const [art, wo] of [['rally', 'rechts'], ['sammeln', 'oben']]) {
        const m = marchTokens.find(t => t.info.art === art && t.mk); if (!m) { out[art] = 'fehlt'; continue; }
        const W = innerWidth, H = innerHeight, zx = wo === 'rechts' ? W - 24 : W / 2, zy = wo === 'rechts' ? H / 2 : 70;
        mapState.offsetX += zx - m.x; mapState.offsetY += zy - m.y; selMarch = mzSelKey(m); requestRender(); drawMap(); drawMap();
        const b = marchBtnRects.map(r => ({ x: r.x - 4, y: r.y, w: r.w + 8, h: r.h + 16 }));   // (mit Text darunter)
        const ueber2 = b.some((r, i) => b.some((q, j) => j > i && overlap(r, q) > 0)), raus = b.filter(r => r.x < 0 || r.y < 0 || r.x + r.w > viewW || r.y + r.h > viewH).length;
        out[art] = { n: b.length, ueber: ueber2, raus, leiste: b.filter(r => mzLeisten.some(q => overlap(r, q) > 0)).length };
      }
      return out; });
    await p.waitForTimeout(300); await foto('knoepfe_oben');
    ok(['rally', 'sammeln'].every(a => knoepfe[a].n >= 2 && !knoepfe[a].ueber && !knoepfe[a].raus && !knoepfe[a].leiste), name + ': Knöpfe am Rand/oben: im Bild, nicht unter Leisten, nie übereinander', knoepfe);
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
    // ===== D) Angriff auf Sammler: sofort entschieden (09a), trotzdem ~5 s Kampf-Szene, die Zahlen laufen auf das echte Ergebnis zu, danach das Band;
    //    dein 2. Sammel-Marsch steht als eigenes Sechseck auf der Verteidiger-Seite =====
    const fk0 = await p.evaluate(ids => {
      selMarch = null; pendingAttacks = []; pendingSends = []; pendingRetreats = []; pendingScouts = []; mapBattles = []; battleFx = []; dropShield(); window.__band = []; const fx0 = spawnBattleFx;
      spawnBattleFx = function (wo, gut, text) { __band.push({ text, at: performance.now() }); return fx0.apply(this, arguments); };
      window.__bandOrt = []; const eb0 = mzErgebnisBand; mzErgebnisBand = function (f, al, sc, sx, sy) { const r = eb0.apply(this, arguments); __bandOrt.push({ sx, sy, x: r.x, y: r.y, w: r.w, h: r.h, unter: mzAnzeige.koepfe.filter(k => k.art !== 'tafel' && Math.max(0, Math.min(k.x + k.w, r.x + r.w / 2) - Math.max(k.x, r.x - r.w / 2)) * Math.max(0, Math.min(k.y + k.h, r.y - r.h / 2 + r.h) - Math.max(k.y, r.y - r.h / 2)) > 0).map(k => k.text) }); return r; };   // (wo das Band steht)   // (wann das Band kommt)
      const home = islandById[ids.home], bq = [...botOwnedIslands[ids.D]].find(id => islandById[id].landmassId === home.landmassId);
      const f = resFields.filter(f => f.landmassId === home.landmassId && !(fieldState[f.id] && fieldState[f.id].occ) && !fieldMarches.some(m => m.fieldId === f.id))
        .sort((x, y) => Math.hypot(x.x - home.x, x.y - home.y) - Math.hypot(y.x - home.x, y.y - home.y))[0];
      fieldMarches = fieldMarches.filter(m => m.who !== 'player');
      const lm = loadBotState()[ids.D]; if (lm) lm.shieldUntil = 0; islandTroops[bq] = 1e8;
      AUF.frei && AUF.frei.an();
      try { fieldSend('player', ids.home, f.id, 3e6); fieldSend('player', ids.home, f.id, 1e6);
        for (const m of fieldMarches.filter(m => m.fieldId === f.id)) { fieldMarches.splice(fieldMarches.indexOf(m), 1); fieldArrive(m, Date.now()); }   // (beide angekommen: sammeln zusammen)
        if (fieldSend(ids.D, bq, f.id, 2e7)) fieldMarches[fieldMarches.length - 1].resolveAt = Date.now() + 300;   // (Gegner D greift deine Sammler an)
      } finally { AUF.frei && AUF.frei.aus(); }
      flyTo(f.x, f.y + 1200, { instant: true, zoom: innerWidth >= 700 ? .03 : .02 });
      return { f: f.id };
    }, ids);
    const born = await p.waitForFunction(() => { const b = mapBattles.find(b => b.feld); return b && b.born; }, null, { timeout: 5000, polling: 100 }).then(h => h.jsonValue()).catch(() => 0);
    const t0 = Date.now();
    await p.waitForTimeout(900);
    const fA = await bild(); await foto('feldkampf');
    const ber = await p.evaluate(F => { const e = combatLog.find(x => x.type === 'field' && x.fieldId === F); return e && { a: e.aTroops, aL: e.aLoss, d: e.dTroops, dL: e.dLoss, won: e.won }; }, fk0.f);
    await p.waitForTimeout(Math.max(0, 4300 - (Date.now() - t0)));
    const fB = await bild(); await foto('feldkampf_ende');
    await p.waitForTimeout(1500);
    const fx = await p.evaluate(([F, born]) => ({ feld: mapBattles.filter(b => b.feld).length, band: __band.map(x => ({ text: x.text, nach: Math.round(x.at - born) })) }), [fk0.f, born]);
    const kA = fA.kaempfe.find(k => k.feld === fk0.f), kB = fB.kaempfe.find(k => k.feld === fk0.f);
    console.log(name, JSON.stringify({ fk0, ber, kA, kB, fx, koepfe: fA.koepfe.map(k => k.art + ':' + k.text) }));
    ok(ber && kA && kA.a <= ber.a && kA.a >= ber.a - ber.aL && kA.d <= ber.d && kA.d >= ber.d - ber.dL, name + ': Angriff auf Sammler → Kampf-Szene am Feld mit den Zahlen des Kampfs', { ber, kA });
    const dS = fA.koepfe.filter(k => k.art === 'vert' || k.art === 'verst').reduce((x, k) => x + k.n, 0);
    ok(kA && kA.helfer === 1 && Math.abs(dS - kA.d) <= 2, name + ': dein 2. Sammel-Marsch als eigenes Sechseck auf der Verteidiger-Seite (Summe = Sammler)', { dS, kA });
    ok(ber && kB && kB.a === ber.a - ber.aL && kB.d === ber.d - ber.dL, name + ': Zahlen laufen auf das echte Ergebnis zu', { ber, kB });
    ok(fx.feld === 0 && fx.band.length === 1 && fx.band[0].text === (ber && ber.won ? 'Sieg' : 'Niederlage') && fx.band[0].nach >= 4000 && fx.band[0].nach < 6500, name + ': Szene ~5 s, danach Sieg/Niederlage-Band', fx);
    const bo = await p.evaluate(() => { const o = __bandOrt[__bandOrt.length - 1]; return o && { ...o, w: viewW, h: viewH }; });
    ok(bo && Math.abs(bo.x - Math.max(0, Math.min(bo.w, bo.sx))) < 140 && bo.y < Math.max(60, bo.sy) && Math.max(60, bo.sy) - bo.y < 220 && bo.y > 0 && bo.y < bo.h, name + ': Sieg/Niederlage-Band über dem Kampfort (nicht am Bildrand)', bo);
    const bandDrauf = await p.evaluate(() => [...new Set(__bandOrt.flatMap(o => o.unter))]);
    ok(!bandDrauf.length, name + ': Sieg/Niederlage-Band (samt Unterzeile) verdeckt keinen Kopf/Chip', bandDrauf);
    ok(!ueber(fA.koepfe).length, name + ': keine Sechsecke/Chips übereinander (Feld-Kampf)', ueber(fA.koepfe));
    await p.context().close();
  }
  ok(!fe.length, 'keine Skript-Fehler', fe);
  await br.close(); srv.close();
})();
