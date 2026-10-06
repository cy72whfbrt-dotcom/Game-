// Lebendige Welt (11b G, Teil 01f-felsen.js): Bergstöcke auf der Karte, Märsche laufen darum herum.
// A) Berge kommen fest aus dem Welt-Zufall (zweimal gerechnet, zweites Gerät: gleich), nicht zu langsam
// B) Freiräume: kein Berg an Basen, Startplätzen, Toren, Brücken-Enden, Feldern, Gebiets-Bändern; ganz auf dem Land
// C) Jede Basis bleibt erreichbar: jeder Weg zwischen zwei Basen einer Region, den ein Berg schneidet, geht außen herum
//    (höchstens 1,6 × Luftlinie), nie über einen Gipfel, auf dem Land
// D) Marsch um einen Berg: länger als Luftlinie (Strecke, Angriff, Mitspieler, Späher), marchPath = gezeichnete Linie
// E) Handy (Zuschauer, vorläufiger Marsch) und Weltrechner (WELT nachgebaut, leiter) rechnen dieselbe Marschzeit
// F) Schalter WELT_FELSEN = false (Kopie der Vorschau): keine Berge, alle Wege wie vorher (Luftlinie über die Brücken)
// G) Aussehen: Low-Poly-Gipfel (5 Flächen-Töne), 1–3 Stöcke je Region; Wüste/Stein: Felsen statt der alten runden Häufchen
// H) Marsch-Zeitschild: die Zahl steht links neben der Sanduhr (textAlign 'left'; vorher 'center' von den Namensschildern →
//    Zahl über der Sanduhr, „9̶1:43“)
// Bilder (Handy + Desktop, 3 Zoomstufen, Marsch um einen Berg) in den Arbeitsordner.
//   node tests/browser/welt_felsen_test.js <vorschau> [arbeitsordner]
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const VS = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '.');
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const seite = async (ordner, geraet) => { const p = await (await b.newContext(geraet)).newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + ordner + '/index.html', { timeout: 120000 }); await p.waitForTimeout(8000);
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof resFields !== 'undefined', null, { timeout: 60000, polling: 500 }).catch(() => {});
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange; });   // (Mitspieler ruhig)
    return p; };
  const kennung = () => JSON.stringify(felsenListe().map(f => [f.lm, f.poly.map(q => [Math.round(q.x), Math.round(q.y)])]));
  const p = await seite(VS, { ...devices['iPhone 13'] });

  // ===== A) fest aus dem Welt-Zufall =====
  const a = await p.evaluate(k => { const kennung = eval(k), h1 = kennung(); felsenDaten = null; const t0 = performance.now(); const h2 = kennung(), ms = performance.now() - t0;
    const L = felsenListe(), lms = new Set(L.map(f => f.lm));
    return { gleich: h1 === h2, ms: Math.round(ms), n: L.length, regionen: lms.size, h: h1, ohne: L.filter(f => FELS_OHNE[landmasses[f.lm].bio] || landmasses[f.lm].tier === 'throne').length,
             gipfel: Math.min(...L.map(f => f.gipfel.length)) + '–' + Math.max(...L.map(f => f.gipfel.length)) }; }, kennung.toString());
  ok(a.gleich && a.n > 100 && a.regionen > 100, 'Bergstöcke fest aus dem Welt-Zufall (zweimal gerechnet: gleich)', { n: a.n, regionen: a.regionen, gipfel: a.gipfel });
  ok(a.ohne === 0, 'keine Berge auf der Thron-Insel, in Vulkan und Sumpf', a.ohne);
  ok(a.ms < 3000, 'Berge rechnen geht schnell (einmal beim Laden)', a.ms + ' ms');
  { const p2 = await seite(VS, { viewport: { width: 1280, height: 800 } }); const h = await p2.evaluate(k => eval(k)(), kennung.toString()); await p2.context().close();
    ok(h === a.h, 'zweites Gerät (Desktop) hat genau dieselben Berge'); }

  // ===== B) Freiräume + C) erreichbar =====
  const c = await p.evaluate(() => {
    const A = FELS_ABSTAND, L = felsenListe(), zu = [];
    for (const f of L) { const lm = landmasses[f.lm];
      for (const i of islandsByLandmass[f.lm] || []) { const m = i.radius + (i.startSlot || i.type !== 'tower' ? A.gross : A.basis); if (felsAbstand(f.poly, i.x, i.y) < m) zu.push(['Basis', f.id, i.id, i.type]); }
      for (const fl of resFields) if (fl.landmassId === f.lm && felsAbstand(f.poly, fl.x, fl.y) < fl.radius + A.feld) zu.push(['Feld', f.id, fl.id]);
      for (const br of bridges) for (const [x, y] of [[br.x1, br.y1], [br.x2, br.y2]]) if (felsAbstand(f.poly, x, y) < A.bruecke) zu.push(['Brücke', f.id]);
      for (const s of felsenDaten.baender[f.lm]) if (felsAbstandStrecke(f, s[0], s[1], s[2], s[3]) < A.band) zu.push(['Band', f.id]);
      for (const q of f.poly) if (!aufLand(lm, q.x, q.y)) zu.push(['Küste', f.id]);
      for (const o of L) if (o !== f && o.lm === f.lm && o.poly.some(q => felsAbstand(f.poly, q.x, q.y) < A.berg)) zu.push(['Berg', f.id, o.id]); }
    let paare = 0, maxV = 1; const fehler = [], beste = [];
    for (const lmId of new Set(L.map(f => f.lm))) { const B = islandsByLandmass[lmId], fs = felsenDaten.proLm[lmId], lm = landmasses[lmId];
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const P = B[i], Q = B[j];
        if (!fs.some(f => felsKreuzt(f, P.x, P.y, Q.x, Q.y))) continue;
        paare++;
        const roh = felsWegUm(P, Q, fs), w = felsenWeg(P, Q), luft = Math.hypot(P.x - Q.x, P.y - Q.y), v = felsLaenge(w) / luft;
        if (!roh) { fehler.push(['kein Weg', P.id, Q.id]); continue; }
        for (let k = 1; k < roh.length; k++) if (fs.some(f => felsKreuzt(f, roh[k - 1].x, roh[k - 1].y, roh[k].x, roh[k].y))) fehler.push(['durch den Berg', P.id, Q.id]);
        for (const q of w) { if (!aufLand(lm, q.x, q.y)) fehler.push(['im Wasser', P.id, Q.id]);
          for (const f of fs) for (const g of f.gipfel) if (Math.hypot(q.x - g.x, q.y - g.y) < g.w / 2) fehler.push(['über einen Gipfel', P.id, Q.id]); }
        maxV = Math.max(maxV, v);
        if (luft / BASE_ATTACK_SPEED < 40 && P.type === 'tower' && Q.type === 'tower' && !P.startSlot && !Q.startSlot) beste.push({ a: P.id, c: Q.id, v });
      } }
    beste.sort((x, y) => y.v - x.v);
    return { zu: zu.slice(0, 8), nZu: zu.length, paare, maxV: +maxV.toFixed(3), fehler: fehler.slice(0, 8), nFehler: fehler.length, paar: beste[Math.min(3, beste.length - 1)], nBeste: beste.length };
  });
  ok(c.nZu === 0, 'Freiräume: kein Berg an Basen, Startplätzen, Toren, Brücken, Feldern, Gebiets-Bändern, Küste oder anderem Berg', c.zu);
  ok(c.paare > 50 && c.nFehler === 0, 'jede Basis bleibt erreichbar: ' + c.paare + ' Wege zwischen Basen gehen um die Berge herum (nicht hindurch, nicht über Gipfel, auf dem Land)', c.fehler);
  ok(c.maxV > 1 && c.maxV <= 1.6, 'Umweg höchstens 1,6 × Luftlinie', c.maxV);

  // ===== G) Aussehen =====
  const gg = await p.evaluate(() => {
    const L = felsenListe(), je = {}; for (const f of L) je[f.lm] = (je[f.lm] || 0) + 1;
    const gross = landmasses.filter(l => l.tier !== 'throne' && !FELS_OHNE[l.bio] && (islandsByLandmass[l.id] || []).length >= 8);
    const ohne = gross.filter(l => !je[l.id]).length, max = Math.max(...Object.values(je));
    const toene = Object.values(FELS_TOENE).every(t => t.length === 5 && new Set(t).size === 5);
    const wueste = landmasses.find(l => l.bio === 'sand' && !l.stone && felsBild(l)), stein = landmasses.find(l => l.stone);
    const zaehl = lm => { let n = 0; const d = Object.getOwnPropertyDescriptor(lm, 'forest'); Object.defineProperty(lm, 'forest', { get: () => (n++, d.get()), configurable: true });
      const c = document.createElement('canvas'); c.width = c.height = 128; paintBackground({ c, g: c.getContext('2d'), z: .03, l: lm.x - 2000, t: lm.y - 2000, noSea: true }, null, true);
      Object.defineProperty(lm, 'forest', d); return n; };
    return { je: Object.keys(je).length, ohne, gross: gross.length, max, toene, felsW: wueste && wueste.felsBild.fels ? 1 : 0, wald: [zaehl(wueste), zaehl(stein)],
             gruen: (() => { const l = landmasses.find(x => x.bio === 'green' && !x.stone); return zaehl(l); })() };
  });
  ok(gg.max <= 3 && gg.ohne <= gg.gross * .15, '1–3 Bergstöcke je Region (große Regionen fast alle mit Bergen)', gg);
  ok(gg.toene, 'Low-Poly: 5 verschiedene Flächen-Töne je Landschaft (hell, licht, mittel, dunkel, tief)');
  ok(gg.felsW && gg.wald[0] === 0 && gg.wald[1] === 0 && gg.gruen > 0, 'Wüste/Stein: Felsen statt der runden Häufchen (Wiese: Wald bleibt)', gg);

  // ===== D) Marsch um einen Berg + E) Handy = Weltrechner =====
  const d = await p.evaluate(({ a: aId, c: cId }) => {
    const A = islandById[aId], C = islandById[cId], luft = Math.hypot(A.x - C.x, A.y - C.y), lm = landmasses[A.landmassId];
    let D = null;                                   // gleich weit weg, aber freie Sicht (ohne Berg dazwischen)
    for (let k = 1; k < 72 && !D; k++) { const an = Math.atan2(C.y - A.y, C.x - A.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 36;
      const x = A.x + Math.cos(an) * luft, y = A.y + Math.sin(an) * luft;
      if (aufLand(lm, x, y) && !felsAuf(x, y, 0) && !felsenBei(A.x, A.y).some(f => felsKreuzt(f, A.x, A.y, x, y))) D = { id: 'frei', x, y, landmassId: A.landmassId, radius: 1 }; }
    const bot = BOT_DEFS.find(x => !x.mensch).id, mp = marchPath(A, C);
    const out = { luft: Math.round(luft), weg: Math.round(marschStrecke(A, C)), zeichnung: Math.round(felsLaenge(mp)), punkte: mp.length, frei: !!D,
      t: [travelDurationSeconds(A, C), D && travelDurationSeconds(A, D)], tBot: [travelDurationSeconds(A, C, bot), D && travelDurationSeconds(A, D, bot)], tSp: [scoutSecs(A, C), D && scoutSecs(A, D)] };
    // E) beide Basen gehören dir; Handy als Zuschauer schickt los (vorläufiger Marsch), dann rechnet der Weltrechner denselben Befehl
    for (const id of [aId, cId]) { const ow = islandOwnerOf(id); if (ow && ow !== 'player') { botOwnedIslands[ow].delete(id); botOwnerIndex.delete(id); } ownedIslands.add(id); }
    islandTroops[aId] = 5000; pendingSends = []; const w0 = window.WELT, bef = [];
    try {
      window.WELT = { leiter: false, ich: 'u999', befehl(art, x) { bef.push([art, x]); } };
      launchSend(aId, cId, null, 100); const v = pendingSends.find(m => m.vorlaeufig);
      out.handy = v ? v.resolveAt - v.startedAt : null; out.befehl = bef.length && bef[0][0];
      pendingSends = []; vorlaeufigeMaersche.length = 0; islandTroops[aId] = 5000;
      window.WELT = Object.assign(Object.create(null), { leiter: true, ich: 'u0', befehl() {} });
      launchSend(aId, cId, null, 100); const m = pendingSends.find(x => !x.vorlaeufig);
      out.welt = m ? m.resolveAt - m.startedAt : null;
    } catch (e) { out.err = e.message; } finally { window.WELT = w0; }
    out.ganz = travelDurationSeconds(A, C) * 1000;
    // für das Bild: der Marsch bleibt eine Minute auf der Karte
    const now = Date.now(); pendingSends = [{ fromId: aId, toId: cId, troops: 100, startedAt: now - 20000, resolveAt: now + 600000, senderBotId: null }];
    revealAround((A.x + C.x) / 2, (A.y + C.y) / 2, 40000, false);
    return out;
  }, c.paar || { a: 0, c: 0 });
  ok(d.weg > d.luft * 1.01 && d.weg === d.zeichnung && d.punkte > 2, 'Marsch um den Berg: Weg länger als Luftlinie, die Linie auf der Karte ist genau dieser Weg', { luft: d.luft, weg: d.weg, zeichnung: d.zeichnung, punkte: d.punkte });
  ok(d.frei && d.t[0] > d.t[1] && d.tBot[0] > d.tBot[1] && d.tSp[0] > d.tSp[1], 'Marschzeit um den Berg länger als bei gleicher Luftlinie ohne Berg (du, Mitspieler, Späher)', { du: d.t, mitspieler: d.tBot, spaeher: d.tSp });
  ok(d.befehl === 'senden' && d.handy > 0 && d.welt > 0 && Math.abs(d.handy - d.welt) < 5 && Math.abs(d.welt - d.ganz) < 5, 'Handy (Zuschauer) und Weltrechner rechnen dieselbe Marschzeit', { handy: d.handy, welt: d.welt, err: d.err });
  ok(d.weg <= d.luft * 1.6, 'auch dieser Umweg höchstens 1,6 × Luftlinie', d.weg / d.luft);

  // Bilder: Handy, drei Zoomstufen, Marsch um den Berg
  const bilder = async (seite, vor) => { if (c.paar) for (const [name, z] of [['weit', .004], ['mittel', .011], ['nah', .03]]) {
    await seite.evaluate(({ id, z }) => { closeAllPopups(); const A = islandById[id.a], C = islandById[id.c]; flyTo((A.x + C.x) / 2, (A.y + C.y) / 2, { zoom: z }); }, { id: c.paar, z });
    await seite.waitForTimeout(3500); await seite.screenshot({ path: path.join(OUT, vor + 'felsen_' + name + '.png') });
  } };
  await bilder(p, '');
  // ===== H) Marsch-Zeitschild: Zahl links neben der Sanduhr =====
  const h = await p.evaluate(() => new Promise(fertig => { const o = ctx.fillText, z = [];
    ctx.fillText = function (t, x, y) { if (/^\d+:\d\d/.test(t)) z.push({ t, a: ctx.textAlign }); return o.apply(this, arguments); };
    requestRender(); setTimeout(() => { ctx.fillText = o; fertig(z); }, 1500); }));
  ok(h.length > 0 && h.every(x => x.a === 'left'), 'Marsch-Zeitschild: Zahl links neben der Sanduhr (nicht darüber)', h.slice(0, 3));
  await p.context().close();
  { const p4 = await seite(VS, { viewport: { width: 1440, height: 900 } });   // Desktop: derselbe Marsch
    await p4.evaluate(({ a: aId, c: cId }) => { const A = islandById[aId], C = islandById[cId], now = Date.now();
      pendingSends = [{ fromId: aId, toId: cId, troops: 100, startedAt: now - 20000, resolveAt: now + 600000, senderBotId: null }]; revealAround((A.x + C.x) / 2, (A.y + C.y) / 2, 40000, false); }, c.paar || { a: 0, c: 0 });
    await bilder(p4, 'd_'); await p4.context().close(); }

  // ===== F) Schalter aus =====
  const AUS = path.join(OUT, 'vorschau_aus'); fs.rmSync(AUS, { recursive: true, force: true }); fs.cpSync(VS, AUS, { recursive: true });
  let gesetzt = 0;
  for (const f of ['klein/spiel.js', 'spiel.js']) { const q = path.join(AUS, f); if (!fs.existsSync(q)) continue; const s = fs.readFileSync(q, 'utf8'), t = s.replace(/const WELT_FELSEN ?= ?true/, 'const WELT_FELSEN = false'); if (t !== s) gesetzt++; fs.writeFileSync(q, t); }
  const p3 = await seite(AUS, { ...devices['iPhone 13'] });
  const f = await p3.evaluate(({ a: aId, c: cId }) => {
    const A = islandById[aId], C = islandById[cId], luft = Math.hypot(A.x - C.x, A.y - C.y);
    const fern = islands.find(i => i.type === 'tower' && i.landmassId !== A.landmassId && landmassesConnected(i.landmassId, A.landmassId)), mp = marchPath(A, fern);
    return { schalter: WELT_FELSEN, berge: felsenListe().length, gerade: Math.abs(marschStrecke(A, C) - luft) < 1e-6, pfad: marchPath(A, C).length, brueckenPfad: mp.length, aufFels: felsAuf(A.x, A.y, 1e9) };
  }, c.paar || { a: 0, c: 0 });
  await p3.context().close(); fs.rmSync(AUS, { recursive: true, force: true });
  ok(gesetzt > 0 && f.schalter === false && f.berge === 0 && !f.aufFels, 'Schalter WELT_FELSEN = false: keine Berge', f);
  ok(f.gerade && f.pfad === 2 && f.brueckenPfad === 4, 'Schalter aus: Märsche wie vorher (Luftlinie, über die Brücke)', f);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
