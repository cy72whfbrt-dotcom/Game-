// Eigene Hauptstadt + gesperrte Grenztore auf der Karte (Vorgaben design_hauptstadt A, design_grenztor):
// A) Goldring unter der EIGENEN Hauptstadt (Bild karte_hauptstadt_ring, fehlt es: marsch_ring_gold), Puls 0,55 ↔ 0,9, nicht 30 Bilder/s (Akku sparen: fest 0,8, kein Puls)
// B) Namensschild der Hauptstadt mit Krone (nur die eigene), ganz weit nur Krone + Ring (kein Wappen)
// C) Schloss auf Toren, die du nicht angreifen kannst (keine deiner Basen grenzt an, wie der Angriffsknopf 10b); angreifbar/eigen: keins
// E) Hauptstadt als eigenes Bild je Burg-Stufe (1–8/9–16/17–25), 1,5× so groß; Herrscher: skin_herrscherburg; ganz weit Zonen-Schild + Pass-Tor
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
      window.islandSeen = () => true; window.isExplored = () => true; hauptRingBild(); hauptBild('ui_sym_krone'); hauptBild('ui_sym_schloss');
      for (const n of ['basis_hauptstadt_1', 'basis_hauptstadt_2', 'basis_hauptstadt_3', 'skin_herrscherburg', 'zone_schild', 'pass_tor']) extraBild(n); });
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
      { flyTo(h.x, h.y, { zoom: maxZoom * .5, instant: true });               // Hauptstadt: keine Ring-Effekte (nur Kranz + Krone), Herrscher: Skin statt Kranz
        const oa = ctx.arc, oe = ctx.ellipse; let k = 0; ctx.arc = function () { k++; return oa.apply(this, arguments); }; ctx.ellipse = function () { k++; return oe.apply(this, arguments); };
        drawRings([h], mapState.zoom, performance.now()); ctx.arc = oa; ctx.ellipse = oe; o.keineRinge = k === 0;
        const ra = window.rulerOwner; window.rulerOwner = () => 'player'; o.herrKeinKranz = !zeichne().some(s => /marsch_ring_gold|karte_hauptstadt_ring/.test(s)); window.rulerOwner = ra; }
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
      for (const zz of [maxZoom, maxZoom * .5, maxZoom * .3]) {               // angetippte Hauptstadt: die Fahne verdeckt die Burg nicht
        flyTo(h.x, h.y, { zoom: zz, instant: true }); const f = layoutBanners([h], mapState.zoom, h.id).find(x => x.isl === h), bb = basisBildRect(h, mapState.zoom);
        (o.burgFrei = o.burgFrei || []).push(f && bb ? +(overlap(f.rect, bb) / (bb.w * bb.h)).toFixed(2) : -1); }
      // Thron im Nebel (Events → „Zum Königsthron“): Bild bei diesem Zoom gezeichnet und antippbar; Händler findet einen Platz
      { const m = islandById[megaTempleId], od = ctx.drawImage, im = [], os = window.islandSeen, oe = window.isExplored; window.islandSeen = () => false; window.isExplored = () => false; flyTo(m.x, m.y, { zoom: clampZoom(viewW * .7 / HEILIGTUM_BREITE.megaTemple), instant: true });
        ctx.drawImage = function (x) { im.push(x); return od.apply(this, arguments); }; drawMap(); ctx.drawImage = od;
        o.thron = { nebel: !islandSeen(m), bild: im.some(x => (KB.mip.thron_neu || []).includes(x)), tippen: pickIslandAtScreen(toSX(m.x), toSY(m.y)) === m,
          ort: typeof hdOrt === 'function' && !!hdOrt() }; window.islandSeen = os; window.isExplored = oe; }
      // Vorrat-Text eines Felds unter der HUD-Leiste: nicht halb darunter gezeichnet
      window.isCellOpen = () => true; const hud = document.getElementById('hud').getBoundingClientRect(), f = resFields[0], zf = Math.max(.012, maxZoom * .5);
      flyTo(f.x, f.y, { zoom: zf, instant: true }); mapState.offsetY += hud.top + hud.height / 2 - (f.y * zf + mapState.offsetY) - 8 * Math.max(.6, Math.min(2.2, zf / .012)) - 7;
      const ft = ctx.fillText, txt = []; ctx.fillText = function (t, x, y) { txt.push([t, y]); return ft.apply(this, arguments); }; drawMap(); ctx.fillText = ft;
      const vorrat = fmtCompact(Math.floor(fieldInfo(f).left));
      o.unterLeiste = { hud: [Math.round(hud.top), Math.round(hud.bottom)], gezeichnet: txt.filter(([t, y]) => t === vorrat && y >= hud.top - 15 && y <= hud.bottom).length };
      flyTo(h.x, h.y, { zoom: maxZoom * .5, instant: true }); drawMap();
      return o;
    });
    const tag = bw + 'px: ';
    ok(/marsch_ring_gold|karte_hauptstadt_ring/.test(r.ring), tag + 'Ring-Bild geladen (karte_hauptstadt_ring, sonst marsch_ring_gold)', r.ring.split('/').pop());
    ok(Math.min(...r.puls) >= .549 && Math.max(...r.puls) <= .901 && r.puls[1] > .85 && r.puls[3] < .6, tag + 'Ring pulsiert 0,55 ↔ 0,9 in 2 s', r.puls);
    ok(r.kein30 && r.nurEigene && r.ringNah, tag + 'Ring nur an der eigenen Hauptstadt, Puls über eigenen langsamen Takt', [r.kein30, r.nurEigene, r.ringNah]);
    ok(r.keineRinge && r.herrKeinKranz, tag + 'Hauptstadt: keine Ring-Effekte (rot/blau/gestrichelt), Herrscher: Skin statt Kranz', [r.keineRinge, r.herrKeinKranz]);
    ok(r.akku.uhr && r.akku.fest, tag + 'Akku sparen: kein Puls (fest 0,8), kein Extra-Neuzeichnen', r.akku);
    ok(r.burgFrei.every(a => a >= 0 && a <= .1), tag + 'angetippte Hauptstadt: Fahne höchstens 10 % auf der Burg', r.burgFrei);
    ok(r.unterLeiste.gezeichnet === 0, tag + 'Vorrat-Text eines Felds unter der HUD-Leiste weggelassen', r.unterLeiste);
    ok(r.thron.nebel && r.thron.bild && r.thron.tippen && r.thron.ort, tag + 'Thron im Nebel: Bild sichtbar, antippbar; Händler-Platz (hdOrt)', r.thron);
    ok(r.krone, tag + 'Krone im Namensschild nur der eigenen Hauptstadt');
    ok(r.weit.ring && r.weit.krone, tag + 'ganz weit: Krone + Ring', r.weit);
    ok(r.regel[0] && r.regel[1] && r.regelGleich, tag + 'angreifbar wie der Angriffsknopf (eine eigene Basis grenzt an)', r.regel);
    ok(r.nahFrei, tag + 'angreifbares Tor ohne Schloss');
    const zs = r.zoom.filter(x => x.torPx >= 16);
    ok(zs.length >= 3 && zs.every(x => x.h === 30 && x.mitteX && x.ueber && x.gemalt), tag + 'Schloss bei jedem Zoom 30 px, mittig oben auf dem Tor', r.zoom);
    ok(r.zoom.every(x => x.zu === 0), tag + 'nichts überlappt (Schloss, Schilde, Fahnen)', r.zoom.map(x => x.zu));
    const e = await p.evaluate(() => {
      const h = islandById[playerIslandId], o = {}, as = window.anzeigeStufe, ra = window.rulerOwner;
      const zeichne = () => { const od = ctx.drawImage, n = []; ctx.drawImage = function (im) { n.push((im && im.src) || ''); return od.apply(this, arguments); }; drawMap(); ctx.drawImage = od; return n.map(s => s.split('/').pop()); };
      o.nr = [1, 8, 9, 16, 17, 25].map(B => { window.anzeigeStufe = id => id === h.id ? B : as(id); return hauptBildNr(h); }); window.anzeigeStufe = as;
      const frei = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id)), z = maxZoom * .5;
      o.gross = +(basisBreite(h, z) / basisBreite(frei, z)).toFixed(2); o.freiNr = hauptBildNr(frei);
      flyTo(h.x, h.y, { zoom: z, instant: true }); let n = zeichne();
      o.bild = n.some(s => /^basis_hauptstadt_\d/.test(s)); o.alterSkin = n.some(s => /koenigsburg/.test(s));
      window.rulerOwner = () => 'player'; n = zeichne(); window.rulerOwner = ra; o.herr = n.some(s => /skin_herrscherburg/.test(s));
      flyTo(h.x, h.y, { zoom: 0.0028, instant: true }); n = zeichne(); o.weit = { schild: n.filter(s => /zone_schild/.test(s)).length, tor: n.filter(s => /pass_tor/.test(s)).length };
      return o;
    });
    ok(e.nr.join() === '1,1,2,2,3,3' && e.freiNr === 0, tag + 'Hauptstadt-Bild nach Burg-Stufe (1–8/9–16/17–25), freie Basis nicht', e);
    ok(e.gross === 1.5 && e.bild && !e.alterSkin, tag + 'Hauptstadt 1,5× so groß, als basis_hauptstadt_* gezeichnet', e);
    ok(e.herr, tag + 'Herrscher: skin_herrscherburg', e);
    ok(e.weit.schild > 3 && e.weit.tor > 3, tag + 'ganz weit: Zonen-Nummern auf zone_schild, Pässe mit pass_tor', e.weit);
    if (FOTO) {
      for (const B of [1, 10, 20]) { await p.evaluate(B => { const h = islandById[playerIslandId], as = window.anzeigeStufe; window.anzeigeStufe = id => id === h.id ? B : as(id); flyTo(h.x, h.y, { zoom: maxZoom * .5, instant: true }); drawMap(); }, B);
        await p.waitForTimeout(500); await p.screenshot({ path: path.join(FOTO, 'hauptstadt_stufe' + B + '_' + bw + '.png') }); }
      await p.evaluate(() => { window.rulerOwner = () => 'player'; drawMap(); }); await p.waitForTimeout(500); await p.screenshot({ path: path.join(FOTO, 'herrscherburg_' + bw + '.png') });
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
