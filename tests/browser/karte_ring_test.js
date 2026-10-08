// Eigene Hauptstadt + gesperrte Grenztore auf der Karte (Vorgaben design_hauptstadt A, design_grenztor):
// A) Goldring unter der EIGENEN Hauptstadt (Bild karte_hauptstadt_ring, fehlt es: marsch_ring_gold), Puls 0,55 ↔ 0,9, nicht 30 Bilder/s (Akku sparen: fest 0,8, kein Puls)
// B) Namensschild der Hauptstadt mit Krone (nur die eigene), ganz weit nur Krone + Ring (kein Wappen)
// C) Schloss auf Toren, die du nicht angreifen kannst (keine deiner Basen grenzt an, wie der Angriffsknopf 10b); angreifbar/eigen: keins
// D) Schloss bei jedem Zoom gleich groß, oben auf dem Tor; nichts überlappt (Schilde, Fahnen, Schlösser) – 360/390/1280, nah und weit
//   node tests/browser/karte_ring_test.js <vorschau> [fotoordner]
const { chromium } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const VS = path.resolve(process.argv[2]), FOTO = process.argv[3];
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  for (const [bw, bh] of [[390, 844], [360, 740], [1280, 800]]) {
    const p = await (await b.newContext({ viewport: { width: bw, height: bh }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + VS + '/index.html', { timeout: 120000 }); await p.waitForTimeout(6000);
    await p.waitForFunction(() => typeof karteBilder === 'function' && karteBilder() && KB.fertig, null, { timeout: 60000, polling: 500 }).catch(() => {});
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      window.islandSeen = () => true; window.isExplored = () => true; hauptRingBild(); hauptBild('ui_sym_krone'); hauptBild('ui_sym_schloss'); });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const h = islandById[playerIslandId], d = i => Math.hypot(i.x - h.x, i.y - h.y), o = {};
      const tore = islands.filter(i => i.type === 'gate' && !islandOwnerOf(i.id)).sort((a, c) => d(a) - d(c));
      const offen = br => !br || passOpensAt(br) <= Date.now();
      const nah = tore.find(t => torAngreifbar(t) && offen(bridgeOfGate(t))), fern = tore.slice().reverse().find(t => !torAngreifbar(t) && offen(bridgeOfGate(t)));
      o.ring = (hauptRingBild() || {}).src || ''; o.puls = [0, 500, 1000, 1500].map(t => +hauptPuls(t).toFixed(3));
      o.krone = schildDaten(h).krone === true && islands.filter(i => i.type === 'tower' && i.id !== playerIslandId).slice(0, 50).every(i => !schildDaten(i).krone);
      o.regel = [!!nah && torAngreifbar(nah), !!fern && !torAngreifbar(fern)];
      o.regelGleich = !!fern && ![...ownedIslands].some(id => canReach(islandById[id].landmassId, fern.landmassId));
      // gezeichnet: Ring nah (Puls), Krone + Ring weit
      const zeichne = () => { const od = ctx.drawImage, n = []; ctx.drawImage = function (im) { n.push((im && im.src) || ''); return od.apply(this, arguments); }; drawMap(); ctx.drawImage = od; return n; };
      flyTo(h.x, h.y, { zoom: maxZoom * .5, instant: true }); let n = zeichne();
      o.ringNah = n.some(s => /marsch_ring_gold|karte_hauptstadt_ring/.test(s)); o.kein30 = !!hauptPulsUhr;
      clearTimeout(hauptPulsUhr); hauptPulsUhr = 0; akkuSparen = true; zeichne();
      o.akku = { uhr: !hauptPulsUhr, fest: [0, 500, 1500].map(t => hauptPuls(t)).every(a => a === .8) }; akkuSparen = false;
      const alt = window.islandOwnerOf; window.islandOwnerOf = id => id === playerIslandId ? Object.keys(botById)[0] : alt(id);
      o.nurEigene = !zeichne().some(s => /marsch_ring_gold|karte_hauptstadt_ring/.test(s)); window.islandOwnerOf = alt;
      flyTo(h.x, h.y, { zoom: 0.0028, instant: true }); n = zeichne();
      o.weit = { ring: n.some(s => /marsch_ring_gold|karte_hauptstadt_ring/.test(s)), krone: n.some(s => /ui_sym_krone/.test(s)) };
      // Schlösser: gleich groß bei jedem Zoom, oben auf dem Tor, nichts überlappt
      o.zoom = [];
      if (fern) for (const zz of [maxZoom, maxZoom * .5, maxZoom * .2, 0.004]) {
        const tm = torMitte(fern); flyTo(tm.x, tm.y, { zoom: zz, instant: true }); n = zeichne();
        const s = schlossRects.find(q => q.id === fern.id), andere = bannerHitRects.filter(q => !schlossRects.includes(q));
        const zu = schlossRects.reduce((a, q) => a + andere.filter(x => overlap(q, x) > 1).length + schlossRects.filter(x => x !== q && overlap(q, x) > 1).length, 0);
        o.zoom.push({ zz: +zz.toFixed(4), torPx: Math.round(KARTE_MASS.tor * mapState.zoom), h: s && s.h, mitteX: !!s && Math.abs(s.x + s.w / 2 - toSX(tm.x)) < 1,
          ueber: !!s && s.y < toSY(tm.y), zu, gemalt: n.some(x => /ui_sym_schloss/.test(x)) });
      }
      if (nah) { const tm = torMitte(nah); flyTo(tm.x, tm.y, { zoom: maxZoom * .5, instant: true }); zeichne(); o.nahFrei = !schlossRects.some(q => q.id === nah.id); }
      flyTo(h.x, h.y, { zoom: maxZoom * .5, instant: true }); drawMap();
      return o;
    });
    const tag = bw + 'px: ';
    ok(/marsch_ring_gold|karte_hauptstadt_ring/.test(r.ring), tag + 'Ring-Bild geladen (karte_hauptstadt_ring, sonst marsch_ring_gold)', r.ring.split('/').pop());
    ok(Math.min(...r.puls) >= .549 && Math.max(...r.puls) <= .901 && r.puls[1] > .85 && r.puls[3] < .6, tag + 'Ring pulsiert 0,55 ↔ 0,9 in 2 s', r.puls);
    ok(r.kein30 && r.nurEigene && r.ringNah, tag + 'Ring nur an der eigenen Hauptstadt, Puls über eigenen langsamen Takt', [r.kein30, r.nurEigene, r.ringNah]);
    ok(r.akku.uhr && r.akku.fest, tag + 'Akku sparen: kein Puls (fest 0,8), kein Extra-Neuzeichnen', r.akku);
    ok(r.krone, tag + 'Krone im Namensschild nur der eigenen Hauptstadt');
    ok(r.weit.ring && r.weit.krone, tag + 'ganz weit: Krone + Ring', r.weit);
    ok(r.regel[0] && r.regel[1] && r.regelGleich, tag + 'angreifbar wie der Angriffsknopf (eine eigene Basis grenzt an)', r.regel);
    ok(r.nahFrei, tag + 'angreifbares Tor ohne Schloss');
    const zs = r.zoom.filter(x => x.torPx >= 16);
    ok(zs.length >= 3 && zs.every(x => x.h === 30 && x.mitteX && x.ueber && x.gemalt), tag + 'Schloss bei jedem Zoom 30 px, mittig oben auf dem Tor', r.zoom);
    ok(r.zoom.every(x => x.zu === 0), tag + 'nichts überlappt (Schloss, Schilde, Fahnen)', r.zoom.map(x => x.zu));
    if (FOTO) {
      await p.waitForTimeout(800); await p.screenshot({ path: path.join(FOTO, 'hauptstadt_' + bw + '.png') });
      await p.evaluate(() => { const t = islands.filter(i => i.type === 'gate' && !torAngreifbar(i) && passOpensAt(bridgeOfGate(i)) <= Date.now()).pop(), tm = torMitte(t); flyTo(tm.x, tm.y, { zoom: maxZoom * .5, instant: true }); });
      await p.waitForTimeout(800); await p.screenshot({ path: path.join(FOTO, 'grenztor_' + bw + '.png') });
      await p.evaluate(() => flyTo(islandById[playerIslandId].x, islandById[playerIslandId].y, { zoom: 0.0028, instant: true }));
      await p.waitForTimeout(800); await p.screenshot({ path: path.join(FOTO, 'weit_' + bw + '.png') });
    }
    await p.context().close();
  }
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
