// Basis-, Angriffs- und Grenztor-Fenster (Alexander 8.10.: „nichts darf überlappen“) auf 360×640, 390×844 und Desktop:
// Hauptstadt / eigene Basis / fremde Basis / Angriff vorbereiten / Grenztor ohne Nachbar-Basis – keine zwei Bausteine
// überdecken sich, nichts ragt aus dem Fenster oder dem Bildschirm, Beschriftungen ganz, Tippflächen ≥ 44 px.
// Dazu: Werte als Symbol+Zahl, runde Knöpfe (Hauptstadt Betreten/Teleport/Schild/Truppen, Basis Aufwerten/Senden/Sammeln/Truppen,
// „Mehr“ zeigt Mehrfach & Co.), Angriff mit Hauptheld groß + Zweitheld klein, goldener Knopf „Losmarschieren“,
// Grenztor: Hinweis als Zeile im Inhalt, Angreifen grau (antippen = Hinweis), Spähen daneben.
// Aufruf: node tests/browser/fenster_neu_test.js <vorschau> [<bilder-ordner>]
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['360', { ...devices['iPhone 13'], viewport: { width: 360, height: 640 } }], ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const p = await (await b.newContext(opt)).newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const ev = (f, a) => p.evaluate(f, a), bild = async n => { if (process.argv[3]) await p.screenshot({ path: path.join(process.argv[3], art + '_' + n + '.png') }); };
    await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      try { anleitung.schritt = ANLEITUNG.length; } catch (e) {} const a = document.getElementById('anleitung'); if (a) a.hidden = true;
      closeAllPopups(); gems = 3000; coins = 250000;   // (normale Zahlen, wie ein Spieler)
      const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity();
      const hs = loadHeroes(); HEROES.forEach((h, i) => { if (hs[h.id]) hs[h.id].own = i < 3; }); });
    // Prüfung eines offenen Fensters: Bausteine überlappen nicht, bleiben im Fenster/Bildschirm, Texte ganz, Knöpfe ≥ 44 px
    const pruefe = () => ev(() => {
      const pop = document.getElementById('islandPopup'), pr = pop.getBoundingClientRect(), pb = pop.querySelector('.pbody'), br = pb.getBoundingClientRect();
      const sicht = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
      const teile = [...pop.querySelectorAll('.phead > *:not(.sheet-grab), #popupStats > *, #popupStats .ap-oben > *, #popupStats .ap-held > *, #popupStats .ap-held-wahl button, #popupStats .bw-werte > *, #popupActions > *, #popupBund > *, .pfoot > *')]
        .filter(sicht).filter(e => !pb.contains(e) || (e.getBoundingClientRect().bottom > br.top + 1 && e.getBoundingClientRect().top < br.bottom - 1)).filter(e => !e.querySelector('.ap-oben') && !e.classList.contains('ap-oben') && !e.classList.contains('bw-werte') && !e.classList.contains('ap-held') && !e.classList.contains('ap-held-wahl'));
      const r = e => { const x = e.getBoundingClientRect(); if (!pb.contains(e)) return x;   // im Inhalt: nur der sichtbare Teil (der Rest ist weggescrollt)
        const t = Math.max(x.top, br.top), u = Math.min(x.bottom, br.bottom); return { left: x.left, right: x.right, top: t, bottom: Math.max(t, u), width: x.width, height: Math.max(0, u - t) }; }, name = e => (e.id || e.className || e.tagName).toString().slice(0, 30);
      const ueber = [];
      for (let i = 0; i < teile.length; i++) for (let j = i + 1; j < teile.length; j++) {
        const a = teile[i], c = teile[j]; if (a.contains(c) || c.contains(a)) continue;
        const x = r(a), y = r(c), w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
        if (w > 1 && h > 1) ueber.push(name(a) + ' × ' + name(c));
      }
      let raus = teile.filter(e => { const x = r(e); return x.left < pr.left - 1 || x.right > pr.right + 1 || x.left < 0 || x.right > innerWidth + 1 || x.bottom > innerHeight + 1; }).map(name);
      const texte = [...pop.querySelectorAll('.act-t, .act-s, .bw-wert b, .ptitle, .ap-leiste b, #attackBtn .lbl, .notice span, .force b, .force small, .balance-note, .ap-hchip-t b, .ap-hchip-t small, .ap-max, .hero-seg button, .balance-note b')].filter(sicht)
        .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim());
      const sel = pop.querySelector('#attackFromSel');   // Auswahl: der gewählte Text passt ganz hinein
      if (sel && sicht(sel)) { const c = document.createElement('canvas').getContext('2d'), cs = getComputedStyle(sel); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        if (c.measureText(sel.selectedOptions[0].textContent).width > sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) texte.push('Auswahl: ' + sel.selectedOptions[0].textContent); }
      const prR = pr.right;   // kein Text/Bild ragt rechts aus dem Fenster (Quer-Wischlisten ausgenommen)
      for (const e of pop.querySelectorAll('.pbody *, .phead *, .pfoot *')) if (sicht(e) && !e.closest('.chips-quer') && e.getBoundingClientRect().right > prR + 1) { raus.push('ragt raus: ' + name(e)); break; }
      const bal = pop.querySelector('.ap-bal .balance'), note = pop.querySelector('.balance-note'), kopf = pop.querySelector('.ap-oben .ap-kopf');   // „Überlegen 1,1×“ neben dem Balken, ganz im Kasten
      if (note && sicht(note)) { const a = bal.getBoundingClientRect(), n = note.getBoundingClientRect(), k = kopf.getBoundingClientRect();
        if (n.left < a.right - 1 || n.right > k.right - 2) ueber.push('Überlegen × Balken/Rand'); }
      for (const z of [pop.querySelector('.ap-hchip--klein')]) if (z && sicht(z) && z.getBoundingClientRect().height > 50) ueber.push('Zweitheld-Knopf > 2 Zeilen');
      for (const id of ['hud', 'midBar']) { const e = document.getElementById(id); if (!e || !sicht(e)) continue; const x = e.getBoundingClientRect();   // Fenster verdeckt die Leisten oben nicht
        for (const c of [...e.children, ...e.querySelectorAll('.mb-chip')].filter(sicht)) { const y = c.getBoundingClientRect(); if (Math.min(y.right, pr.right) - Math.max(y.left, pr.left) > 1 && Math.min(y.bottom, pr.bottom) - Math.max(y.top, pr.top) > 1) ueber.push('Fenster über ' + id); } }
      const hint = document.getElementById('hint'), hr = hint && !hint.hidden && getComputedStyle(hint).display !== 'none' && +getComputedStyle(hint).opacity > 0 && hint.textContent.trim() ? hint.getBoundingClientRect() : null;
      if (hr) { const lh = parseFloat(getComputedStyle(hint).lineHeight) || 16; if (hr.height > 2 * lh + 18) ueber.push('Hinweis > 2 Zeilen (' + Math.round(hr.height) + ' px)'); }
      if (hr) for (const e of pop.querySelectorAll('button')) if (sicht(e)) { const x = e.getBoundingClientRect(); if (Math.min(x.right, hr.right) - Math.max(x.left, hr.left) > 1 && Math.min(x.bottom, hr.bottom) - Math.max(x.top, hr.top) > 1) { ueber.push('Hinweis über ' + name(e)); break; } }
      const bedien = [...pop.querySelectorAll('#attackTroopsSlider, #attackTroopsLabel, [data-preview="quick"] button, #attackBtn')].filter(e => sicht(e)).filter(e => { const x = e.getBoundingClientRect(), bx = pb.contains(e) ? br : pr; return x.top < bx.top - 1 || x.bottom > bx.bottom + 1 || x.height < 1; }).map(name);
      const knoepfe = [...pop.querySelectorAll('button, select, input')].filter(sicht).filter(e => !e.closest('[hidden]'))
        .filter(e => !pb.contains(e) || r(e).height > 1).map(e => { const x = e.getBoundingClientRect(); return [name(e) + ':' + (e.textContent || '').trim().slice(0, 12), Math.round(x.width), Math.round(x.height)]; })
        .filter(([n, w, h]) => !/slider|troop-in|who-link/i.test(n) && (w < 43.5 || h < 43.5));   // (Schieber: der Daumen zählt; Name im Untertitel: Textverweis)
      return { ueber, raus, texte, knoepfe, bedien, oben: Math.round(pr.top), scroll: pb.scrollHeight > pb.clientHeight + 2 };
    });
    const gut = (x, t) => ok(!x.ueber.length && !x.raus.length && !x.texte.length && !x.knoepfe.length && !x.bedien.length, art + ': ' + t + ' – nichts überlappt/abgeschnitten, Knöpfe ≥ 44 px', x);
    const knoepfe = () => ev(() => [...document.querySelectorAll('#popupActions > .act')].filter(e => e.offsetParent)   // wie man sie sieht: Zeile für Zeile, links nach rechts
      .sort((a, c) => a.getBoundingClientRect().top - c.getBoundingClientRect().top || a.getBoundingClientRect().left - c.getBoundingClientRect().left).map(e => e.querySelector('.act-t').textContent.trim()));

    // 1) Hauptstadt
    await ev(async () => { closeAllPopups(); openIslandPopup(islandById[playerIslandId]); await new Promise(r => setTimeout(r, 600)); });
    const h1 = await ev(() => ({ werte: document.querySelectorAll('#popupStats .bw-werte .bw-wert').length, bilder: [...document.querySelectorAll('#popupStats .bw-wert img')].length,
      rund: document.getElementById('popupActions').classList.contains('rund'), kopf: !!document.querySelector('#popupEmblem .bw-bild') }));
    ok(h1.werte === 3 && h1.bilder === 3 && h1.rund, art + ': Hauptstadt – 3 Werte als Bild + Zahl, runde Knöpfe', h1);
    ok((await knoepfe()).join() === 'Betreten,Teleport,Schild,Truppen,Mehr', art + ': Hauptstadt – Betreten, Teleport, Schild, Truppen, Mehr', await knoepfe());
    gut(await pruefe(), 'Hauptstadt'); await bild('hauptstadt');
    await ev(async () => { const m = document.getElementById('mehrBtn'); if (m) m.click(); await new Promise(r => setTimeout(r, 200)); });
    const mehr = await knoepfe();
    ok(['Senden', 'Sammeln', 'Mehrfach'].every(t => mehr.includes(t)), art + ': „Mehr“ zeigt Senden, Sammeln, Mehrfach', mehr);
    gut(await pruefe(), 'Hauptstadt mit „Mehr“'); await bild('hauptstadt_mehr');
    const schild = await ev(async () => { const s = document.getElementById('schildBtn'); if (s) s.click(); await new Promise(r => setTimeout(r, 300)); const o = isPanelOpen(document.getElementById('rucksackPopup')); closeAllPopups(); return o; });
    ok(schild, art + ': „Schild“ öffnet den Rucksack mit den Friedensschilden');

    // 2) eigene Basis
    const zweite = await ev(async () => { const home = islandById[playerIslandId];
      const z = islands.filter(i => i.id !== playerIslandId && !islandOwnerOf(i.id) && i.type === 'tower').sort((a, c) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(c.x - home.x, c.y - home.y))[0];
      ownedIslands.add(z.id); islandTroops[z.id] = 12400; closeAllPopups(); openIslandPopup(z); await new Promise(r => setTimeout(r, 600)); return z.id; });
    ok((await knoepfe()).join() === 'Aufwerten,Senden,Sammeln,Truppen,Mehr', art + ': eigene Basis – Aufwerten, Senden, Sammeln, Truppen, Mehr', await knoepfe());
    const ein = await ev(() => [...document.querySelectorAll('#popupStats .bw-wert b')].map(e => e.textContent));
    const sym = await ev(() => [...document.querySelectorAll('#popupStats .bw-wert')].filter(e => /^\+/.test(e.textContent)).map(e => e.querySelector('img').getAttribute('src')));
    ok(ein.filter(t => /^\+/.test(t)).every(t => /\/Std\.$/.test(t)) && sym.join() === 'bilder/ui_res_muenzen.webp,bilder/ui_res_truppen.webp', art + ': eigene Basis – Ertrag mit Einheit „/Std.“ und Münz-/Truppen-Symbol', { ein, sym });
    gut(await pruefe(), 'eigene Basis'); await bild('basis');
    await ev(async () => { const m = document.getElementById('mehrBtn'); if (m) m.click(); await new Promise(r => setTimeout(r, 200)); });
    ok((await knoepfe()).includes('Mehrfach'), art + ': eigene Basis – „Mehr“ zeigt Mehrfach', await knoepfe());
    gut(await pruefe(), 'eigene Basis mit „Mehr“');
    await ev(id => { closeAllPopups(); ownedIslands.delete(id); delete islandTroops[id]; }, zweite);

    // 3) fremde Basis gespäht + 4) Angriff vorbereiten
    const ziel = await ev(async () => { const home = islandById[playerIslandId];
      const z = islands.filter(i => islandOwnerOf(i.id) && islandOwnerOf(i.id) !== 'player' && i.type === 'tower' && canReach(home.landmassId, i.landmassId) && !baseShieldedFor(i.id, 'player'))
        .sort((a, c) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(c.x - home.x, c.y - home.y))[0] || islands.find(i => !islandOwnerOf(i.id) && i.type === 'tower' && canReach(home.landmassId, i.landmassId));
      scoutedIslands.add(z.id); islandTroops[playerIslandId] = Math.max(20000, islandTroops[playerIslandId] || 0); closeAllPopups(); openIslandPopup(z); await new Promise(r => setTimeout(r, 600)); return z.id; });
    const f1 = await ev(() => ({ einheit: true, werte: [...document.querySelectorAll('#popupStats .bw-wert')].map(e => e.textContent.trim()), fuss: [...document.querySelectorAll('.pfoot > button')].filter(e => e.offsetParent).map(e => e.id),
      rund: document.getElementById('islandPopup').classList.contains('fuss-rund') }));
    ok(f1.werte.length === 3 && /gespäht/.test(f1.werte[2]) && f1.fuss.join() === 'scoutBtn,attackBtn' && f1.rund, art + ': fremde Basis – Truppen, Verteidigung, gespäht; runde Knöpfe Spähen + Angreifen', f1);
    gut(await pruefe(), 'fremde Basis'); await bild('fremd');
    await ev(async id => { previewSourceId = playerIslandId; previewFraction = 1; previewHero = HEROES[0].id; previewHero2 = null; popupView = 'preview'; previewShownAt = Date.now(); renderPopup(); await new Promise(r => setTimeout(r, 500)); }, ziel);
    const a1 = await ev(() => { const g = document.querySelector('.ap-held [data-held-auf="1"]'), k = document.querySelector('.ap-held [data-held-auf="2"]'), at = document.getElementById('attackBtn');
      return { gross: g ? Math.round(g.getBoundingClientRect().height) : 0, klein: k && k.offsetParent ? Math.round(k.getBoundingClientRect().height) : 0, zweit: k ? k.textContent : '',
        knopf: at.querySelector('.lbl').textContent, gold: at.classList.contains('btn--gold'), zeit: document.getElementById('attackZeit').textContent, leiste: document.querySelectorAll('.ap-leiste > span').length,
        kachel: !!document.querySelector('.ap-truppen .ap-kachel img'), quick: document.querySelectorAll('[data-preview="quick"] button').length, chance: !!document.querySelector('[data-preview="balance"]') }; });
    ok(a1.gross > a1.klein && a1.klein >= 44 && (a1.zweit.match(/Zweitheld/g) || []).length === 1 && (a1.zweit.match(/\+/g) || []).length <= 1, art + ': Angriff – Hauptheld groß, Zweitheld klein („Zweitheld · 50 %“)', a1);
    ok(a1.knopf === 'Losmarschieren' && a1.gold && /\d:\d\d/.test(a1.zeit) && a1.leiste === 3 && a1.kachel && a1.quick === 4 && a1.chance, art + ': Angriff – Truppen-Kachel, 25/50/75/Alle, Leiste, Gewinnchance, goldener Knopf mit Zeit', a1);
    await ev(() => flashHint('Der Drache ist erschienen! Urdrache Vharak kreist über dem Thron – nur alle zusammen können ihn besiegen.', 5000)); await p.waitForTimeout(300);   // ein Hinweis kommt dazu: nie über den Knöpfen
    gut(await pruefe(), 'Angriff vorbereiten (mit Hinweis)'); await bild('angriff');
    const a2 = await ev(async () => { const k = document.querySelector('[data-held-auf="2"]'); if (k) k.click(); await new Promise(r => setTimeout(r, 200)); const l = document.querySelector('[data-preview="hero2"]'); return !!l && !l.hidden; });
    ok(a2, art + ': Angriff – Zweitheld antippen klappt die Auswahl auf');
    gut(await pruefe(), 'Angriff mit Helden-Auswahl'); await bild('angriff_held');
    await ev(id => { closeAllPopups(); scoutedIslands.delete(id); }, ziel);

    // 5) Grenztor ohne eigene Basis daneben
    const tor = await ev(async () => { const g = islands.find(i => i.type === 'gate' && !ownedIslands.has(i.id) && !(passOpensAt(bridgeOfGate(i)) > Date.now()) && ![...ownedIslands].some(id => canReach(islandById[id].landmassId, i.landmassId)));
      if (!g) return null; scoutedIslands.add(g.id);
      closeAllPopups(); popupIslandId = g.id; popupView = 'menu'; renderPopup(); await new Promise(r => setTimeout(r, 600));
      const hw = document.querySelector('#popupStats .tor-hinweis'), at = document.getElementById('attackBtn'), sp = document.getElementById('scoutBtn');
      const out = { hinweis: hw ? hw.textContent : '', imInhalt: !!hw && document.getElementById('popupStats').contains(hw), grau: at.classList.contains('is-grau'), spaehen: sp.offsetParent !== null };
      const h0 = (document.getElementById('hint') || {}).textContent || ''; at.click(); await new Promise(r => setTimeout(r, 200));
      const h1 = (document.getElementById('hint') || {}).textContent || ''; out.toast = h1 !== h0 && /Keine deiner Basen/.test(h1); out.blinkt = !!hw && hw.classList.contains('blinkt'); out.offen = isPanelOpen(popup);
      out.gespaeht = (document.getElementById('islandPopup').textContent.match(/gespäht/gi) || []).length; out.unbesetzt = (document.querySelector('#islandPopup .phead').textContent.match(/unbesetzt/gi) || []).length; return out; });
    if (tor) {
      ok(/Keine deiner Basen grenzt/.test(tor.hinweis) && tor.imInhalt && tor.grau && tor.spaehen, art + ': Grenztor – Hinweis als Zeile im Fenster, Angreifen grau, Spähen da', tor);
      ok(!tor.toast && tor.blinkt && tor.offen && tor.gespaeht === 1 && tor.unbesetzt === 1, art + ': Grenztor – grauer Knopf lässt die Zeile blinken (kein Hinweis darüber), „gespäht“ und „unbesetzt“ nur einmal', tor);
      gut(await pruefe(), 'Grenztor'); await bild('grenztor');
    } else ok(false, art + ': kein Grenztor ohne Nachbar-Basis gefunden');
    await p.close();
  }
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
