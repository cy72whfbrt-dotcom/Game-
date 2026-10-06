// Handy 390×844: Namensfahnen auf der Karte (11b F) – Bündnis-Kürzel als eigenes Chip, Name bis 14 Zeichen, Breite nach Text,
// Schrift mind. 11 px, zwei Zeilen mit Abstand; neutrale, nicht gespähte Basen nur Wappen + Stufe (Fahne erst beim Antippen/ganz nah).
// Rausgezoomt ruhig (Alexander 6.10.): eigene Basen ohne Namen (nur Hauptstadt), fremde Nicht-Hauptstädte erst ganz nah mit Namen,
// keine Fahne verdeckt eine andere, Stufen-Chip so breit wie die Zahl (nicht über Wappen/Zahl), „?“ ohne langen leeren Balken;
// Designer: weit weg eigene nur Wappen + Stufe, Zahl kürzer, Drachen-Name über der Kuppel, Fahnen unter Leisten blass
const { chromium, devices } = require('playwright');
const TIERW = [34 + 4 + 140 + 8 + 12, 28 + 4 + 120 + 7 + 12, 22 + 4 + 62 + 4 + 12];   // Wappen + Textfeld-Grenze + Rand (+ breiterer Stufen-Chip)
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
    const g = document.createElement('canvas').getContext('2d'), geo = plateGeo(g, TIER.C, { ...m, level: 100, troops: '?' }, false);
    g.font = FONT(700, 11); r.chip = { lw: geo.lw, zahl: g.measureText('100').width, frei: geo.tx >= geo.lx0 + geo.lw, W: geo.W };
    r.chipWappen = ['A', 'B', 'K', 'C', 'N'].every(k => { const T = TIER[k], q = plateGeo(g, T, { ...m, level: 100 }, false); return q.lx0 >= T.av / 2 - 1 + T.av * .62 * .41; });   // Chip rechts neben dem Wappen
    r.kurz = [plateTroops(TIER.C, '464,7 Mrd.'), plateTroops(TIER.C, '29,7 Mrd.'), plateTroops(TIER.A, '464,7 Mrd.')];
    r.drache = drawMap.toString().indexOf('drawDragonName') > drawMap.toString().indexOf('paintBanners(') && !/drawDragonName/.test(drawEvents.toString());
    // neutrale Basen in der Nähe: ruhig (Stufe N); ausgewählt → volle Fahne
    flyTo(h.x, h.y, { zoom: 0.062, instant: true });
    const vis = [basis, ...neutral], z = mapState.zoom;
    const it1 = layoutBanners(vis, z, null), nW = 40;
    r.neutralRuhig = it1.filter(x => neutral.includes(x.isl)).every(x => x.sp.w < nW && x.sp.h === TIER.N.H);
    const it2 = layoutBanners(vis, z, neutral[0].id);
    r.neutralGewaehlt = it2.find(x => x.isl === neutral[0]).sp.w > nW * 2;
    r.spielerVoll = it2.find(x => x.isl === basis).sp.h === TIER.A.H;
    const n0 = BANNER_SPRITES.size; layoutBanners(vis, z, null); layoutBanners(vis, z, null); r.cacheGleich = BANNER_SPRITES.size === n0;
    // viele eigene Basen dicht beieinander (wie „iceman“): Name nur an der Hauptstadt, nichts überdeckt sich
    const eigene = islands.filter(i => i.type === 'tower' && i.id !== playerIslandId && i.id !== basis.id).sort((a, c) => dist(a) - dist(c)).slice(0, 40);
    profileName.value = 'iceman';
    for (const i of eigene) { botOwnerIndex.delete(i.id); ownedIslands.add(i.id); islandTroops[i.id] = 464.7e9; islandLevels[i.id] = 78; }
    const alle = [h, basis, ...eigene];
    r.eigenOhneName = eigene.every(i => bannerModel(i).name === '') && bannerModel(h).name === 'Hauptstadt';
    r.zoom = [];
    for (const zz of [0.07, 0.035, 0.02]) {
      flyTo(h.x, h.y, { zoom: zz, instant: true });
      const it = layoutBanners(alle, mapState.zoom, null), rs = it.map(x => x.rect);
      let schlimm = 0;
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (overlap(rs[i], rs[j]) > 0.3 * Math.min(rs[i].w * rs[i].h, rs[j].w * rs[j].h)) schlimm++;
      const hs = it.find(x => x.isl === h), fremd = it.find(x => x.isl === basis);
      r.zoom.push({ z: zz, fahnen: it.length, schlimm, hauptH: hs && hs.sp.h, fremdH: fremd && fremd.sp.h,
                    eigenMitName: it.filter(x => eigene.includes(x.isl) && x.sp.h >= TIER.B.H).length, breiteMax: Math.max(...it.filter(x => x.isl !== h).map(x => x.sp.w)),
                    eigenNurWappen: it.filter(x => eigene.includes(x.isl)).every(x => x.sp.h === TIER.N.H) });
    }
    // Fahnen unter der oberen Leiste blass, mitten auf der Karte voll
    const al = []; ctx.drawImage = function () { al.push(ctx.globalAlpha); };
    const sp = bannerSprite('C', bannerModel(h)), hud = document.getElementById('hud').getBoundingClientRect();
    try { paintBanners([{ m: {}, sp, rect: { x: hud.left + 10, y: hud.top + 5, w: sp.w, h: sp.h } }, { m: {}, sp, rect: { x: 150, y: 420, w: sp.w, h: sp.h } }]); } finally { delete ctx.drawImage; }
    r.blass = al;
    return r;
  });
  ok(v.tag === 'WEL' && v.name === 'Wellenbrecherin' && !/\[/.test(v.name), 'Bündnis-Kürzel getrennt vom Namen (eigenes Chip)', v);
  ok(v.max === '14/14', 'Name bis 14 Zeichen (Stufe A und B)', v.max);
  ok(v.schrift.every(x => x >= 11), 'Schrift auf allen Fahnen mind. 11 px', v.schrift);
  ok(v.abstand.every(x => x >= 8), 'Zeile 1 und 2 berühren sich nicht (Höhe ≥ Schriften + 8)', v.abstand);
  ok(v.breite.slice(0, 2).every(([a, c]) => a < c) && v.breite.every(([a, c], i) => c <= Math.ceil(TIERW[i])), 'Breite nach Text (kurzer Name schmaler, langer höchstens bis zur Grenze)', v.breite);
  ok(v.chip.lw >= v.chip.zahl + 4 && v.chip.frei && v.chip.W < 80, 'Stufen-Chip so breit wie „100“, Zahl dahinter; „?“ ohne langen leeren Balken', v.chip);
  ok(v.eigenOhneName, 'eigene Basen: Name nur an der Hauptstadt');
  const [nah, mitte, weit] = v.zoom;
  ok(v.zoom.every(x => x.schlimm === 0 && x.eigenMitName === 0), 'viele eigene Basen: keine Fahne verdeckt eine andere, nirgends „iceman“ (3 Zoomstufen)', v.zoom);
  ok(nah.fremdH === 34 && mitte.fremdH < 30 && weit.hauptH === 22 && mitte.hauptH === 30, 'fremde Nicht-Hauptstadt: Name nur ganz nah; Hauptstadt mit Namen bis rausgezoomt', v.zoom);
  ok(weit.breiteMax <= 88 && weit.eigenNurWappen, 'rausgezoomt kompakte Plaketten, eigene Basen nur Wappen + Stufe (keine 20× gleiche Zahl)', weit);
  ok(v.chipWappen, 'Stufen-Chip neben dem Wappen, nicht darauf (alle Stufen)');
  ok(v.kurz.join('|') === '465 Mrd.|29,7 Mrd.|464,7 Mrd.', 'weit weg kürzere Zahl („465 Mrd.“), nah die genaue', v.kurz);
  ok(v.drache, 'Drachen-Name nach allen Gebäuden und Fahnen gezeichnet (Thron-Kuppel deckt ihn nicht zu)');
  ok(v.blass[0] < 0.5 && v.blass[1] === 1, 'Fahnen unter der oberen Leiste blass, auf der Karte voll', v.blass);
  ok(v.neutralRuhig, 'neutrale, nicht gespähte Basen: nur Wappen + Stufe');
  ok(v.neutralGewaehlt && v.spielerVoll, 'angetippte neutrale Basis und Mitspieler: volle Fahne');
  ok(v.cacheGleich, 'Fahnen werden wiederverwendet (kein Neuzeichnen bei jedem Bild)');
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/karte_fahnen.png' });
  await b.close();
})();
