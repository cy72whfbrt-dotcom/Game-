// Mitspieler sparen wie echte Spieler (Alexander 8.10.): Kisten erst aus dem, was über dem Spar-Ziel liegt (botSparZiel:
// Teleport ab 8 Basen, Premium-Pass solange die Saison noch ≥ 7 Tage läuft, 2. Baumeister). (a) Tagesaufgaben geben die
// Edelsteine wie bei dir (alle 6: questGemsTag); (b) mit 10 Basen spart er auf 500 und teleportiert;
// (c) Premium-Pass wird angespart und gekauft; (d) Sterne/Schilde bleiben dringend (nur Rücklage 50).
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botSparZiel === 'function' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (keiner zieht nebenher)
    const rnd = Math.random, pe = passEndOf, out = {};
    try {
      Math.random = () => .01;                                                    // (spielt jeden Tag alle Aufgaben)
      const kisten = st => Object.values(st.spare).reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
      // (a) Tagesaufgaben
      const A = BOT_DEFS.find(d => !d.mensch && d.style === 'builder'), sa = loadBotState()[A.id];
      sa.gems = 0; sa.hsDay = 'alt'; sa.hsDays = 0; sa.hcDay = todayKey(); botHeroCare(A); const tag1 = sa.gems;
      sa.gems = 0; sa.hsDay = 'alt'; sa.hsDays = 6; botHeroCare(A); const tag7 = sa.gems;
      out.a = { tag1, tag7, soll: questGemsTag() };
      // (b) 10 Basen: spart auf 500 (keine Kiste darunter), dann Teleport
      const gut = i => i.type === 'tower' && i.id !== megaTempleId && !bossAt(i.id) && !ownedIslands.has(i.id);
      const Y = BOT_DEFS.find(d => !d.mensch && botSpart(d, 'tp') && (!d.mensch && d.style === 'veteran')) || BOT_DEFS.find(d => !d.mensch && botSpart(d, 'tp'));
      if (bundVon(Y.id)) bundOp(Y.id, { op: 'verlassen' });
      const T = islands.find(t => gut(t) && landmasses[t.landmassId].ring > 0 && landmasses[t.landmassId].tier !== 'throne' && islands.filter(i => gut(i) && i.landmassId === t.landmassId).length >= 11);
      if (!T) return { fehlt: 'kein Gebiet mit 11 Türmen' };
      for (const id of [...botOwnedIslands[Y.id]]) { botOwnedIslands[Y.id].delete(id); islandTroops[id] = 0; }
      const meine = islands.filter(i => gut(i) && i.landmassId === T.landmassId).slice(0, 10).map(i => i.id);
      for (const id of meine) { clearIslandOwner(id); botOwnedIslands[Y.id].add(id); islandTroops[id] = 1000; }
      for (let i = pendingSends.length - 1; i >= 0; i--) if (pendingSends[i].senderBotId === Y.id) pendingSends.splice(i, 1);
      const st = loadBotState()[Y.id]; st.capital = meine[0]; capitalCache = null; st.neuBis = 0; st.tpGratis = 1; st.city.builder2 = true;
      st.ps = { s: passNo(Date.now()), base: botPassScore(st), f: 0, p: 0, prem: false, want: false, at: 0 }; st.gems = 0; st.hcDay = todayKey();
      out.zielTp = botSparZiel(Y, st);
      const k0 = kisten(st); let kisteUnter = false, tage = 0;
      for (; tage < 30 && st.gems < TP_GEMS; tage++) { st.hsDay = 'alt'; const k = kisten(st); for (let n = 0; n < 4; n++) botShop(Y); if (kisten(st) > k && st.gems < TP_GEMS) kisteUnter = true; }
      out.b = { tage, gems: st.gems, kisteUnter, kisten: kisten(st) - k0, bezahlbar: botTpBezahlbar(Y.id) };
      localStorage.setItem('openWaterWorldStart', String(Date.now() - 864e6));   // (alle Pässe offen – Teleport nur über offene Pässe)
      const g0 = st.gems, c0 = islandById[meine[0]], t5 = islandById[meine[5]]; st.capMovedAt = 0;
      const tp = botTeleportCapital(Y, meine[5]);
      out.b.tp = { tp, nah: Math.hypot(c0.x - t5.x, c0.y - t5.y) < BASE_SPACING * 3.5, bezahlt: g0 - st.gems };   // (die Hauptstadt zieht neben den Turm)
      inselOrt = {}; inselOrtAnwenden();
      // (c) Premium-Pass: Saison läuft noch lange → Ziel 1000, angespart und gekauft; kurz vor Schluss: kein Ziel mehr
      passEndOf = n => Date.now() + 20 * 864e5;
      st.ps.want = true; st.ps.at = 0; st.gems = 0; out.zielPass = botSparZiel(Y, st); let tage2 = 0;
      for (; tage2 < 60 && !st.ps.prem; tage2++) { st.hsDay = 'alt'; st.ps.at = 0; for (let n = 0; n < 4; n++) botShop(Y); }
      out.c = { tage: tage2, prem: st.ps.prem, gems: st.gems };
      st.ps.prem = false; passEndOf = n => Date.now() + 3 * 864e5; out.zielSpaet = botSparZiel(Y, st);
      passEndOf = pe;
      // (d) Stern dringend: trotz Spar-Ziel aus der Rücklage 50
      st.ps.prem = true; st.gems = 400; if (!Object.values(st.gear).some(x => x)) st.gear.weapon = { r: 1, lvl: 1, st: 0 };   // (Ausrüstung kommt nicht mehr aus dem Lager – zur Not eine hinlegen)
      const g = Object.values(st.gear).find(x => x); if (g) g.st = 0; st.city.levels.forge = Math.max(1, st.city.levels.forge || 0);
      const ziel = botSparZiel(Y, st); botShop(Y); out.d = { ziel, stern: g ? g.st : -1, gems: st.gems };
    } finally { Math.random = rnd; passEndOf = pe; }
    return out;
  });
  console.log(JSON.stringify(r));
  ok(!r.fehlt, 'Gebiet gefunden', r.fehlt);
  ok(r.a && r.a.tag1 === r.a.soll && r.a.soll === 42 && r.a.tag7 === r.a.soll, '(a) Tagesaufgaben: 42 Edelsteine wie bei dir, auch am 7. Tag (keine Wochenkette mehr)', r.a);
  ok(r.zielTp === 500, '(b) mit 10 Basen: Spar-Ziel 500 (Teleport)', r.zielTp);
  ok(r.b && r.b.gems >= 500 && !r.b.kisteUnter && r.b.bezahlbar && r.b.tage <= 14, '(b) spart auf 500, keine Kiste darunter', r.b);
  ok(r.b && r.b.tp && r.b.tp.tp && r.b.tp.nah && r.b.tp.bezahlt === 500, '(b) danach Teleport für 500 (neben den eigenen Turm)', r.b && r.b.tp);
  ok(r.zielPass === 1000 && r.c && r.c.prem && r.c.gems >= 50, '(c) Premium-Pass: auf 1000 gespart und gekauft', [r.zielPass, r.c]);
  ok(r.zielSpaet === 500, '(c) kurz vor Saison-Ende: kein Pass-Ziel mehr (nur Teleport)', r.zielSpaet);
  ok(r.d && r.d.ziel === 500 && r.d.stern === 1, '(d) Stern bleibt dringend (trotz Spar-Ziel)', r.d);
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
