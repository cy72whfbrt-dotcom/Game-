// Spieler-Durchsicht 6.10. (Bereiche A + J), Handy 390×844 und Desktop 1440×900 / 1280×720:
// Gebäude-Fenster endet über der Leiste (Bauen-Knopf frei), unter festen Fußknöpfen (Burg „Bauen“, Held „Aufwerten“) schaut kein Inhalt
// hervor, am Ende ist alles über dem Fußknopf; eigene Basis: steht frei (nicht unter Anleitung, Fenster oder Leiste), alle Knöpfe im
// Fenster; Anleitung: „Schritt 1/7“ als Überzeile, höchstens 4 Textzeilen; HUD: Holz/Stein/Eisen am Desktop, Handy „Rohstoffe“;
// ganz rausgezoomt ruhiger Nebel statt Wolken-Brei. Bilder in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1440, height: 900 } }], ['Desktop klein', { viewport: { width: 1280, height: 720 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof renderCitySheet === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, 'leiste_' + art.replace(' ', '_') + '_' + n + '.png') }); };
    const ev = (f, a) => p.evaluate(f, a);
    const handy = art === 'Handy';
    // 1) Anleitung kompakt; HUD-Rohstoffe
    const anl = await ev(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms));
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      closeAllPopups(); anleitung.schritt = 0; anleitungFrage = false; anleitungZeigen(); await warte(300);
      const a = document.getElementById('anleitung'), n = document.getElementById('anleitungSchritt').getBoundingClientRect(), t = document.getElementById('anleitungText');
      const zeilen = Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight));
      const roh = document.getElementById('hudRoh'), mini = roh.querySelector('.roh-mini'), nach = getComputedStyle(roh, '::after');
      const zahlen = [...roh.querySelectorAll('.roh-mini b')].map(x => x.getBoundingClientRect()).filter(r => r.width > 0 && r.right <= innerWidth);
      return { sicht: !a.hidden, ueberzeile: n.bottom <= t.getBoundingClientRect().top + 1, zeilen, hoehe: Math.round(a.getBoundingClientRect().height),
        mini: getComputedStyle(mini).display !== 'none' && zahlen.length === 3, schrift: nach.content, schriftRechts: (() => { const r = roh.getBoundingClientRect(), w = parseFloat(nach.width) || 0;   // ragt die Beschriftung rechts aus dem Bild?
          return w > 0 && (nach.right === 'auto' ? r.left + r.width / 2 + w / 2 : r.right - parseFloat(nach.right)) <= innerWidth + 0.5; })() };
    });
    ok(anl.sicht && anl.ueberzeile && anl.zeilen <= 4, art + ': Anleitung – „Schritt“ als Überzeile, Text höchstens 4 Zeilen', anl);
    if (handy) ok(/Rohstoffe/.test(anl.schrift) && anl.schriftRechts, art + ': Rohstoff-Knopf beschriftet („Rohstoffe“)', anl);
    else ok(anl.mini, art + ': Holz/Stein/Eisen im HUD zu sehen', anl);
    await bild('hud');
    // 2) Nebel ganz draußen: ruhige Fläche (kaum Helligkeits-Unterschiede), nah: Wolken
    const nebel = await ev(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), h = islandById[playerIslandId];
      const streu = (wx, wy) => { const c = fogComp, g = c.getContext('2d'), z = mapState.zoom;   // 60×60 Punkte Nebel um die Welt-Stelle (wx, wy), ohne Stelle: Ecke oben links
        const x = wx === undefined ? 0 : Math.max(0, Math.round((wx * z + mapState.offsetX) / innerWidth * c.width) - 30), y = wy === undefined ? 0 : Math.max(0, Math.round((wy * z + mapState.offsetY) / innerHeight * c.height) - 30);
        const d = g.getImageData(x, y, Math.min(60, c.width - x), Math.min(60, c.height - y)).data;
        const L = []; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) L.push(d[i] + d[i + 1] + d[i + 2]);
        const m = L.reduce((s, x) => s + x, 0) / Math.max(1, L.length); return { n: L.length, sd: Math.round(Math.sqrt(L.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, L.length))) }; };
      flyTo(h.x, h.y, { zoom: 0.012, instant: true }); requestRender(); await warte(700); const nah = streu();
      flyTo(h.x, h.y, { zoom: minZoom, instant: true }); requestRender(); await warte(1200); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); const weit = streu(-FRAME_HALF * 0.6, -FRAME_HALF * 0.6);   // weit weg von der Hauptstadt, innerhalb des Kartenrands
      const z = mapState.zoom, rx = (h.x * z + mapState.offsetX + 15) * dpr, ry = (h.y * z + mapState.offsetY) * dpr;   // goldener Ring (r 15) um die Hauptstadt
      const px = ctx.getImageData(Math.round(rx) - 2, Math.round(ry) - 2, 5, 5).data; let ring = 0;
      for (let i = 0; i < px.length; i += 4) ring = Math.max(ring, px[i] - px[i + 2]);
      const w = typeof nebelWeit === 'function' ? nebelWeit : () => -1;   // (alter Stand: keine Weit-Stufe)
      return { nah, weit, ring, w0: w(0.012), w1: w(minZoom) };
    });
    ok(nebel.w0 === 0 && nebel.w1 === 1 && nebel.weit.n > 100 && nebel.weit.sd < nebel.nah.sd / 2 && nebel.ring > 60, art + ': ganz draußen ruhiger Nebel statt Wolken, goldener Ring an der Hauptstadt', nebel);
    await bild('nebel_weit');
    // 3) eigene Basis: frei sichtbar, alle Knöpfe im Fenster
    const basis = await ev(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), h = islandById[playerIslandId], R = e => e.getBoundingClientRect();
      flyTo(h.x, h.y, { zoom: 0.05, instant: true }); closeAllPopups(); anleitung.schritt = 1; anleitungZeigen();
      const nav = R(document.getElementById('cornerButtons'));
      flyTo(h.x, h.y, { zoom: 0.05, instant: true, screenX: innerWidth / 2, screenY: nav.top - 30 });   // die Basis knapp über der Leiste (wie nach dem Antippen dort)
      await warte(300); openIslandPopup(h); await warte(1200); anleitungZeigen(); await warte(300);
      const z = mapState.zoom, sx = h.x * z + mapState.offsetX, sy = h.y * z + mapState.offsetY, pr = R(popup), a = document.getElementById('anleitung'), ar = R(a);
      const anlSicht = !a.hidden && getComputedStyle(a).visibility !== 'hidden';
      const im = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      const frei = !im(pr, sx, sy) && !(anlSicht && im(ar, sx, sy - 10)) && sy < nav.top - 10 && sy > 40;
      const kn = [...popup.querySelectorAll('#popupActions > .act')].filter(x => x.offsetParent);
      const ab = kn.filter(x => R(x).bottom > Math.min(pr.bottom, nav.top) + 1).map(x => x.id);
      return { sx: Math.round(sx), sy: Math.round(sy), popup: [Math.round(pr.top), Math.round(pr.bottom)], anl: anlSicht ? [Math.round(ar.top), Math.round(ar.bottom)] : null, nav: Math.round(nav.top), frei, ab, n: kn.length };
    });
    ok(basis.frei, art + ': eigene Basis frei zu sehen (nicht unter Fenster, Anleitung oder Leiste)', basis);
    ok(basis.n >= 4 && !basis.ab.length, art + ': Basis-Fenster – alle Knöpfe ganz im Fenster', basis);
    await bild('basis');
    // 4) Burg-Fenster: Bauen-Knopf über der Leiste und frei; nichts schaut unter ihm hervor; am Ende alles darüber
    await ev(() => { closeAllPopups(); anleitung.schritt = ANLEITUNG.length; anleitungZeigen(); openCity(); });
    await p.waitForTimeout(2500);
    for (const id of ['_keep', 'market']) {
      const s = await ev(async id => {
        const warte = ms => new Promise(f => setTimeout(f, ms)), R = e => e.getBoundingClientRect();
        cityPage = 'bau'; cityOpenId = id; renderCitySheet(); const sh = document.getElementById('citySheet'); sh.scrollTop = 0; await warte(400);
        for (let i = 0, u = -1; i < 20 && R(sh).bottom !== u; i++) { u = R(sh).bottom; await warte(150); }   // bis das Fenster steht (Einblenden, Last)
        const btn = document.getElementById('cityUpgradeBtn'), fuss = sh.querySelector('.city-bfoot'), nav = R(document.getElementById('cornerButtons'));
        const br = R(btn), fr = R(fuss), sr = R(sh), t = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
        const o = { knopf: [Math.round(br.top), Math.round(br.bottom)], leiste: Math.round(nav.top), knopfFrei: !!t && (t === btn || btn.contains(t)), ueberLeiste: br.bottom <= nav.top + 1 || br.top >= nav.bottom, fussUnten: fr.bottom >= sr.bottom - 2, scroll: sh.scrollHeight > sh.clientHeight + 2 };
        sh.scrollTop = 1e6; await warte(300);
        const kinder = [...sh.children].filter(e => e !== fuss && e.offsetParent && e.getBoundingClientRect().height > 0 && getComputedStyle(e).position !== 'sticky');
        o.amEnde = kinder.every(e => R(e).bottom <= R(fuss).top + 1); o.unter = kinder.filter(e => R(e).bottom > R(fuss).top + 1).map(e => e.id || e.className);
        sh.scrollTop = 0; return o;
      }, id);
      ok(s.knopfFrei && s.ueberLeiste && (s.fussUnten || !s.scroll) && s.amEnde, art + ': Gebäude-Fenster ' + id + ' – Bauen-Knopf frei über der Leiste, nichts unter dem Fußknopf, am Ende alles darüber', s);
      if (id === '_keep') await bild('burg');
    }
    // 5) Held: „Aufwerten“ fest unten, darunter schaut nichts hervor
    const held = await ev(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), R = e => e.getBoundingClientRect();
      document.getElementById('citySheet').hidden = true; cityOpenId = null; openHeroHall(); await warte(600);
      const k = document.querySelector('#heroHall [data-hh], #heroHall .hh-card, #heroHall button[data-hero]'); if (k) k.click(); await warte(600);
      const hh = document.getElementById('heroHall'), act = hh.querySelector('.hh-actions');
      if (!act || !act.offsetParent) return { ohne: true };
      hh.scrollTop = 0; await warte(200);
      const o = { ohne: false, unten: R(act).bottom >= Math.min(innerHeight, R(hh).bottom) - 2, scroll: hh.scrollHeight > hh.clientHeight + 2 };
      closeHeroHall(); return o;
    });
    ok(held.ohne || !held.scroll || held.unten, art + ': Held – „Aufwerten“ bis an den Rand, nichts schaut darunter hervor', held);
    await ctx.close();
  }
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
