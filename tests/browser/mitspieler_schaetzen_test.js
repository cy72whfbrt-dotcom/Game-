// Mitspieler sehen die Stärke eines Angriffs nur so ungenau wie echte Spieler (Alexander 5.10., 11b C): vor dem Kampf nur die
// Truppenzahl, ungefähr (±30 %, je Angriff fest) und ohne Boni (Held, Fähigkeit, Titel, Forschung); kämpft er schon, die echten
// Zahlen. Geprüft an botDefend (Hilfe schicken/räumen) und bundUnterAngriff (Bündnis-Hilfe).
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botDefend === 'function' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const r = await p.evaluate(() => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (keiner zieht nebenher)
    const frei = lm => islands.filter(i => i.type === 'tower' && i.landmassId === lm && !islandOwnerOf(i.id) && !bossAt(i.id) && i.id !== megaTempleId);
    const Y = BOT_DEFS.find(d => !d.mensch && botCapitalOf(d.id) != null && frei(islandById[botCapitalOf(d.id)].landmassId).length >= 2);
    if (!Y) return { fehlt: 'kein Mitspieler mit 2 freien Türmen daneben' };
    if (bundVon(Y.id)) bundOp(Y.id, { op: 'verlassen' });
    const st = loadBotState()[Y.id]; st.shieldUntil = 0; st.neuBis = 0;
    const [zid, hid] = frei(islandById[botCapitalOf(Y.id)].landmassId).map(i => i.id), ziel = islandById[zid];   // zwei Türme für ihn: Ziel und Helfer
    botOwnedIslands[Y.id].add(zid); botOwnedIslands[Y.id].add(hid); capitalCache = null;
    islandTroops[hid] = 1e6;                                      // (genug für Hilfe, falls er die echte Stärke wüsste)
    const now = Date.now(), a = { sourceId: playerIslandId, targetId: zid, rawTroops: 10000, attackBonus: 30000, atkTitle: 1.25, atkKraft: 1.2,
      startedAt: now - 60000, resolveAt: now + 1e7, attackerBotId: null };
    const echt = (10000 + 30000) * 1.25 * 1.2;
    islandTroops[zid] = Math.ceil(13000 * 1.1) + 10;             // hält gegen jede Schätzung (höchstens +30 %), nicht gegen die echte Stärke
    pendingAttacks.push(a);
    const out = { echt };
    try {
      out.def = effectiveTroops(ziel) + effectiveDefense(ziel);
      out.schaetz = typeof botSchaetzAngriff === 'function' ? botSchaetzAngriff(a) : null;
      out.schaetz2 = typeof botSchaetzAngriff === 'function' ? botSchaetzAngriff(a) : null;
      const g = bundUnterAngriff(zid); out.bund = g && g.str;
      const sends0 = pendingSends.filter(x => x.senderBotId === Y.id).length;
      botActOf(Y.id).defNext = 0; botDefend(Y);
      out.hilfe = pendingSends.filter(x => x.senderBotId === Y.id).length - sends0;
      if (typeof botSchaetzAngriff !== 'function') return out;
      // verschiedene Angriffe: nicht immer dieselbe Schätzung, alle im Rahmen ±30 %
      const fs = []; for (let i = 0; i < 40; i++) fs.push(botSchaetzAngriff({ ...a, startedAt: now - 60000 - i * 7777, sourceId: i }) / 10000);
      out.fMin = Math.min(...fs); out.fMax = Math.max(...fs);
      // der Kampf läuft: die echten Zahlen
      a.fightEndsAt = now + 5000; out.kampf = botSchaetzAngriff(a);
      // Feld-Armee auf die Basis: nur ihre Truppenzahl, keine Boni
      const arm = { id: 'atestSchaetz', who: 'player', x: ziel.x + ISLAND_RADIUS * 3, y: ziel.y, lm: ziel.landmassId, troops: 5000, homeId: null,
        mv: { to: { kind: 'base', id: zid, x: ziel.x, y: ziel.y, lm: ziel.landmassId }, startedAt: now - 60000, resolveAt: now + 1e7 } };
      out.armee = botSchaetzArmee(arm);
    } finally {
      const i = pendingAttacks.indexOf(a); if (i >= 0) pendingAttacks.splice(i, 1);
      for (let k = pendingSends.length - 1; k >= 0; k--) if (pendingSends[k].senderBotId === Y.id && pendingSends[k].toId === zid) { islandTroops[pendingSends[k].fromId] += pendingSends[k].troops; pendingSends.splice(k, 1); }
    }
    return out;
  });
  console.log(JSON.stringify(r));
  ok(!r.fehlt, 'Mitspieler mit 2 Türmen', r.fehlt);
  ok(r.schaetz !== null && r.schaetz >= 7000 && r.schaetz <= 13000, 'Schätzung: nur Truppenzahl ±30 %, ohne Held/Titel/Forschung', [r.schaetz, r.echt]);
  ok(r.schaetz === r.schaetz2, 'Schätzung bleibt für denselben Angriff gleich (kein Flackern)');
  ok(r.bund === r.schaetz, 'Bündnis-Hilfe (bundUnterAngriff) nimmt dieselbe Schätzung', [r.bund, r.schaetz]);
  ok(r.hilfe === 0, 'Basis hält nach der Schätzung: keine genau passende Hilfe', r.hilfe);
  ok(r.fMin >= .7 && r.fMax <= 1.3 && r.fMax - r.fMin > .2, 'Schätzungen streuen im Rahmen ±30 %', [r.fMin, r.fMax]);
  ok(Math.abs(r.kampf - r.echt) < 1, 'im Kampf: die echte Stärke', [r.kampf, r.echt]);
  ok(r.armee === 5000, 'Feld-Armee: nur ihre Truppenzahl', r.armee);
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
