// Spieler-Durchsicht 6.10. (Bereiche A + J), Handy 390×844 und Desktop 1440×900 / 1280×720:
// Gebäude-Fenster endet über der Leiste (Bauen-Knopf frei), unter festen Fußknöpfen (Burg „Bauen“, Held „Aufwerten“) schaut kein Inhalt
// hervor, am Ende ist alles über dem Fußknopf; eigene Basis: steht frei (nicht unter Anleitung, Fenster oder Leiste), alle Knöpfe im
// Fenster; Anleitung: „Schritt 1/7“ links neben dem Text, Text ganz, höchstens 4 Zeilen (≤ 84 px; Spieltest 7.10.: vorher nach 2 Zeilen „…“); HUD: Holz/Stein/Eisen am Desktop, Handy „Rohstoffe“;
// ganz rausgezoomt ruhiger Nebel statt Wolken-Brei, die Gebiete schimmern durch, Wappen an der Hauptstadt; Umlaute in Versalien
// (Reiter, Überzeilen) nicht abgeschnitten. Bilder in den Arbeitsordner (process.argv[3]), wenn angegeben.
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
      const roh = document.getElementById('hudRoh');   // (Alexander 7.10.: Holz/Stein/Eisen als Kapseln in der EINEN Werte-Reihe, kein Rohstoff-Knopf mehr)
      const zahlen = [...roh.querySelectorAll('[data-roh] b')].map(x => x.getBoundingClientRect()).filter(r => r.width > 0 && r.right <= innerWidth);
      return { sicht: !a.hidden, nebenText: (n.top + n.bottom) / 2 > t.getBoundingClientRect().top && (n.top + n.bottom) / 2 < t.getBoundingClientRect().bottom && n.right <= t.getBoundingClientRect().left, zeilen, hoehe: Math.round(a.getBoundingClientRect().height),
        mini: zahlen.length === 3 };
    });
    ok(anl.sicht && anl.nebenText && anl.zeilen <= 4 && anl.hoehe <= 84, art + ': Anleitung – „Schritt“ links neben dem Text, Text ganz, höchstens 4 Zeilen, ≤ 84 px hoch', anl);   // (Entscheidung Projektleiter 6.10.: eine Zeile statt Überzeile)
    ok(anl.mini, art + ': Holz/Stein/Eisen im HUD zu sehen', anl);
    await bild('hud');
    // 2) Nebel ganz draußen: ruhige Fläche (kaum Helligkeits-Unterschiede), nah: Wolken
    const nebel = await ev(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), h = islandById[playerIslandId];
      const streu = (wx, wy, k = 60) => { const c = fogComp, g = c.getContext('2d'), z = mapState.zoom;   // k×k Punkte Nebel um die Welt-Stelle (wx, wy), ohne Stelle: Ecke oben links
        const x = wx === undefined ? 0 : Math.max(0, Math.round((wx * z + mapState.offsetX) / innerWidth * c.width) - k / 2), y = wy === undefined ? 0 : Math.max(0, Math.round((wy * z + mapState.offsetY) / innerHeight * c.height) - k / 2);
        const d = g.getImageData(x, y, Math.min(k, c.width - x), Math.min(k, c.height - y)).data;
        const L = []; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) L.push(d[i] + d[i + 1] + d[i + 2]);
        const m = L.reduce((s, x) => s + x, 0) / Math.max(1, L.length); return { n: L.length, sd: Math.round(Math.sqrt(L.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, L.length))) }; };
      flyTo(h.x, h.y, { zoom: 0.012, instant: true }); requestRender(); await warte(700); const nah = streu();
      flyTo(h.x, h.y, { zoom: minZoom }); await warte(1500); requestRender(); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));   // wie mit „−“: die Kamera darf die Hauptstadt über die Leiste schieben
      const z = mapState.zoom, imBild = l => { const x = l.x * z + mapState.offsetX, y = l.y * z + mapState.offsetY; return x > 60 && x < innerWidth - 60 && y > 120 && y < innerHeight - 120; };
      const fern = landmasses.filter(imBild).reduce((a, l) => Math.hypot(l.x - h.x, l.y - h.y) > Math.hypot(a.x - h.x, a.y - h.y) ? l : a);   // das Gebiet im Bild am weitesten weg (im Nebel)
      const weit = streu(fern.x, fern.y, 6), c = fogComp.getContext('2d');
      const fx = Math.round((fern.x * z + mapState.offsetX) / innerWidth * fogComp.width), fy = Math.round((fern.y * z + mapState.offsetY) / innerHeight * fogComp.height);
      const f = c.getImageData(fx, fy, 1, 1).data, land = Math.abs(f[0] - 0x1a) + Math.abs(f[1] - 0x24) + Math.abs(f[2] - 0x33);   // Gebiet schimmert durch (nicht die leere Nebelfläche)
      const hx = h.x * z + mapState.offsetX, hy = h.y * z + mapState.offsetY, px = ctx.getImageData(Math.round((hx + 22) * dpr) - 2, Math.round(hy * dpr) - 2, 5, 5).data; let ring = 0;
      for (let i = 0; i < px.length; i += 4) ring = Math.max(ring, px[i] - px[i + 2]);                   // goldener Rand (r 22) um das Wappen an der Hauptstadt
      const nav = document.getElementById('cornerButtons').getBoundingClientRect(), hud = document.getElementById('hud').getBoundingClientRect();
      const frei = hy + 22 <= nav.top + 1 && hy - 22 >= hud.bottom - 1 && hx > 0 && hx < innerWidth;   // das Wappen nicht unter Leiste oder HUD
      const w = typeof nebelWeit === 'function' ? nebelWeit : () => -1;   // (alter Stand: keine Weit-Stufe)
      return { nah, weit, land, ring, frei, wappen: [Math.round(hx), Math.round(hy)], leiste: Math.round(nav.top), w0: w(0.012), w1: w(minZoom) };
    });
    ok(nebel.w0 === 0 && nebel.w1 === 1 && nebel.weit.n >= 30 && nebel.weit.sd < 12 && nebel.weit.sd < nebel.nah.sd / 2, art + ': ganz draußen ruhiger Nebel statt Wolken', nebel);
    ok(nebel.land > 40 && nebel.ring > 60 && nebel.frei, art + ': ganz draußen Gebiete unter dem Nebel zu sehen, Wappen mit goldenem Rand an der Hauptstadt (frei)', nebel);
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
      { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); }   // Helden erst mit Heldenhalle (Merkliste 21)
      document.getElementById('citySheet').hidden = true; cityOpenId = null; openHeroHall(); await warte(600);
      const k = document.querySelector('#heroHall [data-hh], #heroHall .hh-card, #heroHall button[data-hero]'); if (k) k.click(); await warte(600);
      const hh = document.getElementById('heroHall'), act = hh.querySelector('.hh-actions');
      if (!act || !act.offsetParent) return { ohne: true };
      hh.scrollTop = 0; await warte(200);
      const o = { ohne: false, unten: R(act).bottom >= Math.min(innerHeight, R(hh).bottom) - 2, scroll: hh.scrollHeight > hh.clientHeight + 2 };
      closeHeroHall(); return o;
    });
    ok(held.ohne || !held.scroll || held.unten, art + ': Held – „Aufwerten“ bis an den Rand, nichts schaut darunter hervor', held);
    // 6) Umlaute in Versalien (Reiter „Übersicht“, Überzeile „Spähbericht“): die Punkte werden nicht oben abgeschnitten
    const schnitt = () => ev(() => { const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { if (!/[ÄÖÜäöü]/.test(n.data)) continue; const el = n.parentElement; if (!el || !el.getClientRects().length) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || !(cs.textTransform === 'uppercase' || /Cinzel/.test(cs.fontFamily) || /[ÄÖÜ]/.test(n.data))) continue;
        const r = document.createRange(); r.selectNodeContents(n); const rr = r.getBoundingClientRect(); if (!rr.width) continue;
        for (let a = el, k = 0; a && a !== document.body && k < 4; a = a.parentElement, k++) { const ac = getComputedStyle(a); if (ac.overflowY === 'visible') continue;
          const top = a.getBoundingClientRect().top + parseFloat(ac.borderTopWidth), lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
          if (rr.top < top - 0.2 || (a === el && lh < fs * 1.25)) out.push(n.data.trim().slice(0, 20) + ' (' + el.className + ')'); break; } }
      return out; });
    await ev(() => { closeAllPopups(); bundOeffnen('info'); }); await p.waitForTimeout(800);
    const uBund = await schnitt();
    const uSpaeh = await ev(async () => { const warte = ms => new Promise(f => setTimeout(f, ms)); closeAllPopups();
      const B = BOT_DEFS.find(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size), K = [...botOwnedIslands[B.id]][0], jetzt = Date.now();
      resolveScout({ sourceId: playerIslandId, targetId: K, startedAt: jetzt - 2000, resolveAt: jetzt - 1 }); battleLogBtn.click(); await warte(800);
      const s = [...combatLogListEl.children][0].querySelector('summary'); if (s) s.click(); await warte(1500);
      const k = document.getElementById('klArt'); return k && k.offsetParent ? k.textContent : null; });
    const uBericht = await schnitt();
    ok(!uBund.length && !uBericht.length && /Späh/.test(uSpaeh || ''), art + ': Umlaute in Reitern und Überschriften ganz zu sehen (nicht abgeschnitten)', { uBund, uBericht, uSpaeh });
    if (uSpaeh) await bild('spaehbericht');
    await ctx.close();
  }
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
