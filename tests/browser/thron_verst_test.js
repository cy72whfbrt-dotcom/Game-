// Thron-Punkte (Alexander 5.10., LIESMICH 11b C): alle 3 Min. bekommt der Halter des Thrones (Mega-Tempel) weiter 30, JEDER, der dort
// Verstärkung stehen hat, 15 (auch mit zwei Verstärkungen nur einmal) – Mitspieler wie du. Wer nichts dort hat, bekommt nichts.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    const [K, V1, V2, X] = bots, Z = megaTempleId, alt = islandOwnerOf(Z);
    if (alt === 'player') ownedIslands.delete(Z); else if (alt) botOwnedIslands[alt].delete(Z);
    botOwnedIslands[K.id].add(Z); islandTroops[Z] = 100000;
    const tp = w => { const s = loadBotState()[w]; return s ? s.tp || 0 : 0; };
    verst.l = [{ id: 'vT1', w: V1.id, t: Z, n: 5000, von: botCapitalOf(V1.id), at: Date.now() }, { id: 'vT2', w: V2.id, t: Z, n: 3000, von: botCapitalOf(V2.id), at: Date.now() },
      { id: 'vT3', w: V2.id, t: Z, n: 2000, von: botCapitalOf(V2.id), at: Date.now() }, { id: 'vT4', w: 'player', t: Z, n: 1000, von: playerIslandId, at: Date.now() }];
    const vor = { K: tp(K.id), V1: tp(V1.id), V2: tp(V2.id), X: tp(X.id), ich: throneState.pts || 0 };
    const waechter = w => guardianTempleIds.filter(g => islandOwnerOf(g) === w).length * THRONE_PTS_GUARD;
    const ein = { K: throneIncome(K.id), V1: throneIncome(V1.id), ich: throneIncome('player') };
    throneAward(true);
    const out = { ein, halter: rulerOwner() === K.id, K: tp(K.id) - vor.K - waechter(K.id), V1: tp(V1.id) - vor.V1 - waechter(V1.id), V2: tp(V2.id) - vor.V2 - waechter(V2.id), X: tp(X.id) - vor.X - waechter(X.id),
      ich: (throneState.pts || 0) - vor.ich - waechter('player'), text: (renderThroneShop(), (document.getElementById('throneShop') || {}).innerText || '') };
    verst.l = verst.l.filter(v => !/^vT/.test(v.id)); botOwnedIslands[K.id].delete(Z); if (alt === 'player') ownedIslands.add(Z); else if (alt) botOwnedIslands[alt].add(Z);
    return out;
  });
  const k = { halter: r.halter, K: r.K, V1: r.V1, V2: r.V2, X: r.X, ich: r.ich }; console.log(JSON.stringify(k));
  ok(r.halter && r.K === 30, 'Halter des Thrones: weiter 30 Thron-Punkte', k);
  ok(r.V1 === 15 && r.V2 === 15, 'jeder mit Verstärkung im Thron: 15 (zwei Verstärkungen zählen einmal)', k);
  ok(r.ich === 15, 'auch du mit Verstärkung im Thron: 15', k);
  ok(r.X === 0, 'ohne Verstärkung dort: nichts', k);
  ok(r.ein.K >= 30 && r.ein.V1 >= 15 && r.ein.ich >= 15, 'Anzeige „Du bekommst“ rechnet die Verstärkung mit', r.ein);
  ok(/Verstärkung stehen hat 15/.test(r.text), 'Thron-Shop erklärt die 15 Punkte für Verstärkung', r.text.slice(0, 200));
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
