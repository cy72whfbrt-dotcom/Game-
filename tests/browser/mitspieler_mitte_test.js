// Mitspieler wie Menschen: Mitte erobern, Rest im Blick (Alexander 6.10.). Geprüft an einem Mitspieler mit zwei Gruppen
// eigener Türme (vorne Ring r, hinten Ring r+1): (a) ruhig → Hauptstadt 1 Ring nach vorne; (b) Ärger hinten → Hauptstadt
// zurück in die Nähe (kostet Edelsteine, Truppen ziehen mit), von dort Hilfe; nicht gleich wieder vor; (c) Sammeln für die
// Mitte: bedrohte Basen geben nichts, Basen mit Ärger und die Hauptstadt nur einen Teil (botFrei), keiner wird leergezogen.
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botCapitalPlan === 'function' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (keiner zieht nebenher)
    const R = ISLAND_RADIUS * 25, gut = i => i.type === 'tower' && i.id !== megaTempleId && !bossAt(i.id) && !ownedIslands.has(i.id);
    const nah = t => islands.filter(i => gut(i) && i.id !== t.id && Math.hypot(i.x - t.x, i.y - t.y) <= R && (reachableLandmassIds[t.landmassId] || [t.landmassId]).includes(i.landmassId));
    // vorne T (Zone 2 oder 3, mit ≥ 7 Türmen drumherum) und hinten C (die Zone davor, ≥ 4 Türme, weit weg von T) – Zonen wie RoK: Ringe 7 / 5 / 2
    let T = null, C = null;
    for (const t of islands) { const zn = landmasses[t.landmassId].zone; if (!gut(t) || zn < 2 || zn > 3 || nah(t).length < 7) continue;
      const c = islands.find(i => gut(i) && landmasses[i.landmassId].zone === zn - 1 && Math.hypot(i.x - t.x, i.y - t.y) > ISLAND_RADIUS * 70 && nah(i).length >= 4);
      if (c) { T = t; C = c; break; } }
    if (!T) return { fehlt: 'keine passenden Türme auf der Karte' };
    const Y = BOT_DEFS.find(d => !d.mensch); if (bundVon(Y.id)) bundOp(Y.id, { op: 'verlassen' });
    for (const id of [...botOwnedIslands[Y.id]]) { botOwnedIslands[Y.id].delete(id); islandTroops[id] = 0; }
    const gibt = id => { clearIslandOwner(id); botOwnedIslands[Y.id].add(id); islandTroops[id] = 0; };
    const vorne = [T, ...nah(T)].map(i => i.id), hinten = [C, ...nah(C)].map(i => i.id);
    for (const id of [...vorne, ...hinten]) gibt(id);
    for (let i = pendingSends.length - 1; i >= 0; i--) if (pendingSends[i].senderBotId === Y.id) pendingSends.splice(i, 1);   // (nichts Eigenes unterwegs)
    const st = loadBotState()[Y.id]; st.shieldUntil = 0; st.neuBis = 0; st.rally = null; st.capWish = null; st.gems = 1000;
    st.capital = C.id; st.capMovedAt = Date.now() - 3600000; capitalCache = null; botAergerMem[Y.id] = []; botLossMem[Y.id] = [];
    const out = { ringT: landmasses[T.landmassId].ring, ringC: landmasses[C.landmassId].ring };
    const sends = []; let a = null;
    try {
      // (a) ruhig: 1 Zone nach vorne (früher erst ab 2 Ringen und 10 Türmen)
      const pa = botCapitalPlan(Y, Date.now());
      out.a = pa && { why: pa.why, ring: landmasses[islandById[pa.to].landmassId].ring, vorne: vorne.includes(pa.to) };
      // (b) Hauptstadt vorne bei T, hinten drei Angriffe in kurzer Zeit → zurück in die Nähe, helfen
      st.capital = T.id; st.capMovedAt = Date.now() - 20 * 60000; capitalCache = null; islandTroops[T.id] = 1e6;
      const now = Date.now();
      for (const id of hinten.slice(1, 4)) botAergerNote(Y.id, id, now - 60000);
      const pb = botCapitalPlan(Y, now); out.b = pb && { why: pb.why, hinten: hinten.includes(pb.to) };
      const gems0 = st.gems; botCapNext[Y.id] = 0; botActOf(Y.id).next = 0; botCapLastAny = 0;
      botConsiderCapital(Y, now); botCapLastAny = 0; botConsiderCapital(Y, now + 61000);
      const cap = botCapitalOf(Y.id);
      out.bZug = { hinten: hinten.includes(cap), gems: gems0 - st.gems, teleGems: TELEPORT_GEMS, truppen: islandTroops[cap], alt: islandTroops[T.id] };
      out.bNichtVor = (botCapitalPlan(Y, now + 70000) || {}).why !== 'forward';
      // ein Angriff hinten: Hilfe kommt (die Hauptstadt ist jetzt nah)
      const ziel = hinten.find(id => id !== cap); islandTroops[ziel] = 100;
      a = { sourceId: playerIslandId, targetId: ziel, rawTroops: 50000, startedAt: now - 60000, resolveAt: now + 1e7, attackerBotId: null };
      pendingAttacks.push(a);
      const s0 = pendingSends.length; botActOf(Y.id).defNext = 0; botDefend(Y);
      for (const x of pendingSends.slice(s0)) sends.push(x);
      out.hilfe = sends.filter(x => x.senderBotId === Y.id && x.toId === ziel).map(x => ({ von: x.fromId, cap: x.fromId === cap, n: x.troops }));
      for (const x of sends) { islandTroops[x.fromId] += x.troops; pendingSends.splice(pendingSends.indexOf(x), 1); } sends.length = 0;
      // (c) Sammeln für die Mitte (botRally): „ziel“ bedroht (der Angriff oben), B (hinten) mit Ärger, Hauptstadt T, D ruhig
      st.capital = T.id; capitalCache = null; botAergerMem[Y.id] = []; st.rally = null; botActOf(Y.id).plan = null;
      for (const id of [...vorne, ...hinten]) islandTroops[id] = 0;
      const [, at, D] = vorne, B = hinten.find(id => id !== ziel && id !== cap); islandTroops[T.id] = 1e6; islandTroops[B] = 1e6; islandTroops[D] = 1e6; islandTroops[ziel] = 1e6; islandTroops[at] = 1e5;
      botAergerNote(Y.id, B, now);
      out.frei = { bedroht: botFrei(Y.id, ziel, now + 1), aerger: botFrei(Y.id, B, now + 1), cap: botFrei(Y.id, T.id, now + 1), ruhig: botFrei(Y.id, D, now + 1) };
      const mitte = islandById[megaTempleId], s1 = pendingSends.length;
      out.rally = botRally(Y, mitte, at, 1e6, 8);
      const plan = botActOf(Y.id).plan;
      out.steps = plan ? [...plan.steps] : [];
      for (const x of pendingSends.slice(s1)) { sends.push(x); out.steps.unshift({ from: x.fromId, n: x.troops, los: true }); }
      out.bedrohtDabei = out.steps.some(s2 => s2.from === ziel);
      out.capN = (out.steps.find(s2 => s2.from === T.id) || {}).n || 0;
      out.bN = (out.steps.find(s2 => s2.from === B) || {}).n || 0;
      out.dN = (out.steps.find(s2 => s2.from === D) || {}).n || 0;
    } finally {
      if (a) { const i = pendingAttacks.indexOf(a); if (i >= 0) pendingAttacks.splice(i, 1); }
      for (const x of sends) { const i = pendingSends.indexOf(x); if (i >= 0) { islandTroops[x.fromId] += x.troops; pendingSends.splice(i, 1); } }
      botActOf(Y.id).plan = null; st.rally = null;
    }
    return out;
  });
  console.log(JSON.stringify(r));
  ok(!r.fehlt, 'passende Türme gefunden', r.fehlt);
  ok(r.a && r.a.why === 'forward' && r.a.ring === r.ringT && r.a.vorne, '(a) ruhig: Hauptstadt 1 Zone nach vorne (ab 6 Türmen in der Nähe)', r.a);
  ok(r.b && r.b.why === 'hilfe' && r.b.hinten, '(b) Ärger hinten: Plan „zurück, helfen“', r.b);
  ok(r.bZug && r.bZug.hinten && r.bZug.gems === r.bZug.teleGems && r.bZug.truppen >= 1e6 && r.bZug.alt === 0, '(b) Hauptstadt verlegt: kostet Edelsteine wie bei dir, Truppen ziehen mit', r.bZug);
  ok(r.bNichtVor, '(b) nicht gleich wieder nach vorne (Ärger noch frisch)');
  ok(r.hilfe && r.hilfe.length >= 1 && r.hilfe.some(h => h.cap), '(b) Angriff hinten: Hilfe aus der nahen Hauptstadt', r.hilfe);
  ok(r.frei && r.frei.bedroht === 0 && r.frei.aerger < .5 && r.frei.cap <= .5 && r.frei.ruhig >= .6, '(c) botFrei nach Lage: bedroht 0, Ärger wenig, Hauptstadt höchstens die Hälfte', r.frei);
  ok(r.rally && !r.bedrohtDabei, '(c) Sammeln für die Mitte: die bedrohte Basis gibt nichts', { rally: r.rally, steps: r.steps });
  ok(r.capN <= 5e5 && r.bN <= 3e5 && r.dN > 5e5 && r.dN <= 9e5, '(c) Hauptstadt höchstens die Hälfte, Basis mit Ärger wenig, ruhige Basis den Großteil', [r.capN, r.bN, r.dN]);
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
