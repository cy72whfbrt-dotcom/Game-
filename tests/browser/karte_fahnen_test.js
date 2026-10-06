// Handy 390×844: Namensfahnen auf der Karte (11b F) – Bündnis-Kürzel als eigenes Chip, Name bis 14 Zeichen, feste Breite je Stufe,
// Schrift mind. 11 px, zwei Zeilen mit Abstand; neutrale, nicht gespähte Basen nur Wappen + Stufe (Fahne erst beim Antippen/ganz nah)
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const h = islandById[playerIslandId], dist = i => Math.hypot(i.x - h.x, i.y - h.y);
    const nb = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id)).sort((a, c) => dist(a) - dist(c));
    const bot = Object.values(botById)[0], basis = nb[0], neutral = nb.slice(1, 6);
    botById[bot.id].name = 'Wellenbrecherin';                                      // 15 Zeichen → 14 sichtbar mit „…“
    const altOwner = islandOwnerOf; window.islandOwnerOf = id => id === basis.id ? bot.id : altOwner(id);
    window.bundTagVon = w => w === bot.id ? 'WEL' : '';
    for (const i of neutral) scoutedIslands.delete(i.id);
    flushBannerSprites();
    const m = bannerModel(basis);
    const r = { tag: m.tag, name: m.name, schrift: [], abstand: [] };
    for (const k of ['A', 'B', 'C']) { const T = TIER[k]; r.schrift.push(T.fn, T.fs); if (T.max) r.abstand.push(T.H - (T.fn + T.fs)); }
    const kurz = { ...m, name: 'Kai', tag: '' }, lang = { ...m, name: 'Sturmfaust der Große' };
    r.breite = ['A', 'B', 'C'].map(k => [bannerSprite(k, kurz).w, bannerSprite(k, lang).w]);
    r.max = TIER.A.max + '/' + TIER.B.max;
    // neutrale Basen in der Nähe: ruhig (Stufe N); ausgewählt → volle Fahne
    flyTo(h.x, h.y, { zoom: 0.062, instant: true });
    const vis = [basis, ...neutral], z = mapState.zoom;
    const it1 = layoutBanners(vis, z, null), nW = Math.ceil(TIER.N.av + TIER.N.lv / 2);
    r.neutralRuhig = it1.filter(x => neutral.includes(x.isl)).every(x => x.sp.w === nW);
    const it2 = layoutBanners(vis, z, neutral[0].id);
    r.neutralGewaehlt = it2.find(x => x.isl === neutral[0]).sp.w > nW * 2;
    r.spielerVoll = it2.find(x => x.isl === basis).sp.w > 120;
    const n0 = BANNER_SPRITES.size; layoutBanners(vis, z, null); layoutBanners(vis, z, null); r.cacheGleich = BANNER_SPRITES.size === n0;
    return r;
  });
  ok(v.tag === 'WEL' && v.name === 'Wellenbrecherin' && !/\[/.test(v.name), 'Bündnis-Kürzel getrennt vom Namen (eigenes Chip)', v);
  ok(v.max === '14/14', 'Name bis 14 Zeichen (Stufe A und B)', v.max);
  ok(v.schrift.every(x => x >= 11), 'Schrift auf allen Fahnen mind. 11 px', v.schrift);
  ok(v.abstand.every(x => x >= 8), 'Zeile 1 und 2 berühren sich nicht (Höhe ≥ Schriften + 8)', v.abstand);
  ok(v.breite.every(([a, c]) => a === c), 'feste Breite je Stufe (kurzer und langer Name gleich breit)', v.breite);
  ok(v.neutralRuhig, 'neutrale, nicht gespähte Basen: nur Wappen + Stufe');
  ok(v.neutralGewaehlt && v.spielerVoll, 'angetippte neutrale Basis und Mitspieler: volle Fahne');
  ok(v.cacheGleich, 'Fahnen werden wiederverwendet (kein Neuzeichnen bei jedem Bild)');
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/karte_fahnen.png' });
  await b.close();
})();
