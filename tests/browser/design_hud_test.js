// Design 11b F, Paket P1 (Handy 390×844 + Desktop 1280×800): Grundwerte als CSS-Variablen, HUD mit Spielerbild (antippen = Profil),
// EIN Streifen für alle Dauer-Hinweise („+N“ klappt auf), Leiste mit 5 runden Knöpfen (Profil nicht mehr dort),
// Fenster am Handy höchstens 70 % hoch (Ausnahme Shop: bis an die Leiste) mit fester Fußzeile, Hinweis nie über Fenster-Kopf/Fuß oder den Zoom-Knöpfen.
// Spieltest: Tippflächen ≥ 44 px, Angriffs-Karte über der Leiste, Startbasis/Kopfzeile/Profil nicht abgeschnitten, Bauarbeiter unter dem HUD.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [];
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
    await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
    await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof playerIslandId !== 'undefined' && islandById[playerIslandId] && typeof renderMidBar === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), box = e => e.getBoundingClientRect(), sicht = e => !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const ueber = (a, c) => a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
      for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      document.getElementById('anleitung').hidden = true; closeAllPopups(); flashHint('', 1);
      // 1) Grundwerte
      const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
      const tokens = { ab: ['--ab-1', '--ab-2', '--ab-3', '--ab-4'].map(v), fs: ['--fs-11', '--fs-13', '--fs-15', '--fs-17', '--fs-22', '--fs-9', '--fs-10'].map(v),
        k: ['--k-haupt', '--k-zweit', '--k-gefahr', '--k-chip', '--k-tipp', '--k-rund'].map(v) };
      // 2) HUD: Spielerbild sichtbar, ≥ 44 px, antippen öffnet das Profil
      const hp = document.getElementById('hudPlayer'), ring = hp.querySelector('.avatar-ring'), rb = box(ring);
      const hud = { sicht: sicht(hp), ring: Math.round(rb.width), tipp: Math.round(Math.min(box(hp).width, box(hp).height)), werteZeile: new Set([...document.querySelectorAll('.hud-werte .res')].map(e => Math.round(box(e).top))).size };
      hp.click(); await warte(500); hud.profil = isPanelOpen(profilePopup); closeAllPopups(); await warte(200);
      // 3) Leiste: 5 runde Knöpfe in fester Reihenfolge, Profil nicht in der Leiste, Tippfläche ≥ 44 px
      const knoepfe = [...document.querySelectorAll('#cornerButtons .nav-btn')].filter(sicht);
      const leiste = { ids: knoepfe.map(e => e.id), rund: knoepfe.every(e => { const i = e.querySelector('.icon'); return box(e).width >= 44 && box(e).height >= 44 && getComputedStyle(i).borderRadius === '50%'; }),   // (Alexander 7.10.: Knöpfe kleiner, die Tippfläche bleibt ≥ 44 px)
        hoehe: Math.min(...knoepfe.map(e => box(e).height)) };
      // 4) EIN Streifen: mehrere Dauer-Hinweise → einer sichtbar + „+N“, antippen klappt alle auf
      const altEv = evChips; evChips = () => [[2, '<button type="button" class="mb-chip is-drache" data-mb="ev-drache"><span>Drache</span></button>'], [3, '<button type="button" class="mb-chip is-warn" data-mb="ev-inv"><span>Barbaren-Invasion in</span></button>']];
      renderMidBar(); await warte(100);
      const mb = document.getElementById('midBar'), mehr = mb.querySelector('.mb-mehr');
      const streifen = { chips: mb.querySelectorAll('.mb-chip').length, mehr: mehr && mehr.textContent, zeile: Math.round(box(mb).height) <= 30, unterHud: box(mb).top >= box(document.querySelector('.hud-werte')).bottom };
      mehr.click(); await warte(50); streifen.auf = mb.querySelectorAll('.mb-chip').length;
      mb.querySelector('.mb-mehr').click(); await warte(50); streifen.zu = mb.querySelectorAll('.mb-chip').length;
      evChips = altEv; renderMidBar();
      // 5) Fenster: Handy höchstens 70 % hoch, Fußzeile ganz zu sehen; Hinweis nie über Kopf/Fuß des Fensters oder den Zoom-Knöpfen
      openShop(); await warte(600);
      const sp = document.getElementById('shopPopup'), kopf = sp.querySelector('.phead'), fuss = sp.querySelector('.pfoot');
      flashHint('Kurzer Hinweis', 4000); await warte(200);
      const h = document.getElementById('hint'), hb = box(h), hz = +getComputedStyle(h).zIndex, sz = +getComputedStyle(sp).zIndex;
      const fenster = { shop: box(sp).height / innerHeight, shopUeberLeiste: box(sp).bottom <= box(document.getElementById('cornerButtons')).top + 1, fussGanz: !fuss || (box(fuss).bottom <= innerHeight && box(fuss).top >= box(sp).top),   // (der Shop hat keine Fußzeile mehr)
        hinweisFrei: (!ueber(hb, box(kopf)) && !(fuss && ueber(hb, box(fuss)))) || hz < sz };
      closeAllPopups(); document.getElementById('battleLogBtn').click(); await warte(400);   // (ein gewöhnliches Fenster: Kampf)
      fenster.hoehe = box(document.getElementById('battleLogPopup')).height / innerHeight;
      closeAllPopups(); flashHint('Kurzer Hinweis', 4000); await warte(200);
      const zoom = document.getElementById('mapControls'); fenster.zoomFrei = !sicht(zoom) || !ueber(box(h), box(zoom));
      flashHint('', 1);
      // 6) Spieltest: Tippflächen ≥ 44 px (sichtbar darf kleiner sein), Angriffs-Karte über der Leiste, nichts abgeschnitten
      const trifft = e => { const r = box(e), x = r.left + r.width / 2, y = r.top + r.height / 2, in_ = (a, c) => { const t = document.elementFromPoint(a, c); return !!t && (t === e || e.contains(t)); };
        return in_(x - 21, y) && in_(x + 21, y) && in_(x, y - 21) && in_(x, y + 21); };
      const klein = sel => [...document.querySelectorAll(sel)].filter(sicht).filter(e => { e.scrollIntoView({ block: 'center', inline: 'nearest' });   // (erst ins Bild: nicht unter der festen Fußzeile)
        const q = e.closest('.chips-quer'); return (!q || (box(e).left >= box(q).left - 1 && box(e).right <= box(q).right + 1)) && !trifft(e); }).map(e => e.id || e.textContent.trim().slice(0, 20));
      const passt = e => e.scrollWidth <= e.clientWidth + 1;
      await warte(600);   // (der Hinweis ist ganz weg)
      const st = { klein: klein('#midBar .mb-chip, .hud > .res--roh' + (innerWidth < 900 ? ', #mapControls button' : '')) };
      const h0 = islandById[playerIslandId], ziel = islands.filter(i => !islandOwnerOf(i.id) && !/temple|gate/i.test(i.type || '')).sort((a, c) => Math.hypot(a.x - h0.x, a.y - h0.y) - Math.hypot(c.x - h0.x, c.y - h0.y))[0];
      openIslandPopup(ziel); await warte(400); document.getElementById('attackBtn').click(); await warte(600);
      st.klein.push(...klein('.panel--island .seg button, .panel--island .ap-hchip, .panel--island .ap-spaehen, .panel--island .pfoot .btn'));
      const sel = document.getElementById('attackFromSel'), mass = document.createElement('canvas').getContext('2d'); mass.font = getComputedStyle(sel).font;
      const selText = Math.round(mass.measureText(sel.options[sel.selectedIndex].text).width);
      const selCs = getComputedStyle(sel); st.startbasis = selText + parseFloat(selCs.paddingLeft) + parseFloat(selCs.paddingRight) + 22 <= sel.offsetWidth || [selText, sel.offsetWidth];   // (22: Pfeil + Rand)
      st.kopfzeile = [...document.querySelectorAll('#popupSub > span')].filter(sicht).every(passt);
      if (uiLayout() === 'desktop') {                      // Basis ganz unten über der Leiste: die Karte daneben endet über der Leiste
        const nav = box(document.getElementById('cornerButtons'));
        mapState.offsetX = (nav.left + nav.right) / 2 - ziel.x * mapState.zoom; mapState.offsetY = innerHeight - 30 - ziel.y * mapState.zoom; positionIslandPopover();
        const pr = box(document.querySelector('.panel--island')); st.ueberLeiste = !ueber(pr, nav) && pr.top >= 72; st.karte = [Math.round(pr.left), Math.round(pr.top), Math.round(pr.bottom), Math.round(nav.top)];
      }
      closeAllPopups(); await warte(300);
      document.getElementById('hudPlayer').click(); await warte(500);
      const bund = document.querySelector('#profilePopup .rp-bund'), tag = document.getElementById('profileTitle'), rang = document.getElementById('profileRank');
      st.klein.push(...klein('#profilePopup button.rp-bund')); st.bundGanz = !!bund && passt(bund.querySelector('span'));
      st.titel = !tag.textContent || Math.abs(box(tag).top - box(rang).top) < 2 || getComputedStyle(tag, '::before').position === 'absolute';   // „· Neuling“ nie mit Punkt allein in der Zeile
      closeAllPopups(); await warte(200);
      document.getElementById('battleLogBtn').click(); await warte(400);
      document.getElementById('combatLogList').insertAdjacentHTML('afterbegin', '<div class="logRow" id="testZeile"><span class="mact"><button type="button">Zurück</button><button type="button">Schneller</button></span></div>');
      st.klein.push(...klein('#testZeile .mact button')); document.getElementById('testZeile').remove(); closeAllPopups(); await warte(200);
      const randnotiz = [...document.querySelectorAll('#goalsPopup .sect > span.sect-aside')].map(e => getComputedStyle(e).fontSize);   // „verpasster Tag = Tag 1“ so klein wie „Neu um …“
      st.randnotiz = randnotiz.length > 1 && new Set(randnotiz).size === 1 ? randnotiz[0] : randnotiz;
      openCity(); await warte(2500);
      const hudU = box(document.getElementById('hud')).bottom; st.bauarbeiter = [...document.querySelectorAll('#cityBuilder .cb-slot')].filter(sicht).every(e => box(e).top >= hudU);
      st.klein.push(...klein('#cityBuilder button.cb-slot')); closeCity(); await warte(1500);
      return { tokens, hud, leiste, streifen, fenster, st };
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.tokens.ab.join() === '4px,8px,12px,16px' && r.tokens.fs.join() === '11px,13px,15px,17px,22px,11px,11px' && r.tokens.k.join() === '48px,44px,48px,36px,44px,48px', art + ': Grundwerte (Abstände, Schriftstufen ohne 9,5/10, Knopf-Arten)', r.tokens);
    ok(r.hud.sicht && r.hud.ring >= (art === 'Handy' ? 44 : 34) && r.hud.tipp >= 44 && r.hud.profil, art + ': Spielerbild im HUD (Handy 44 px, Tippfläche ≥ 44), antippen öffnet das Profil', r.hud);
    ok(r.hud.werteZeile === 1, art + ': Münzen, Edelsteine, Truppen in einer Zeile', r.hud);
    ok(r.leiste.ids.join() === 'cityNavBtn,bundBtn,battleLogBtn,goalsBtn,shopBtn' && r.leiste.rund && r.leiste.hoehe >= 44, art + ': Leiste = 5 runde Knöpfe (Karte/Stadt, Bündnis, Kampf, Events, Shop), kein Profil', r.leiste);
    ok(r.streifen.chips === 1 && r.streifen.auf >= 2 && r.streifen.mehr === '+' + (r.streifen.auf - 1) && r.streifen.zeile && r.streifen.unterHud, art + ': ein Streifen unter den Werten – ein Hinweis + „+N“ (Drache, Invasion …)', r.streifen);
    ok(r.streifen.zu === 1, art + ': „+N“ klappt alle Hinweise auf und wieder zu', r.streifen);
    if (art === 'Handy') ok(r.fenster.hoehe <= 0.705, art + ': Fenster höchstens 70 % hoch (Karte bleibt sichtbar)', r.fenster);
    // Ausnahme Shop (Vorgabe design_shop.md, Schaufenster A): bis an die Leiste hoch, damit alle Kisten ohne Scrollen passen
    if (art === 'Handy') ok(r.fenster.shop > 0.705 && r.fenster.shop <= 0.9 && r.fenster.shopUeberLeiste, art + ': Shop (Ausnahme) höher, endet über der Leiste', r.fenster);
    ok(r.fenster.fussGanz, art + ': Fußzeile mit dem Haupt-Knopf ganz zu sehen', r.fenster);
    ok(r.fenster.hinweisFrei && r.fenster.zoomFrei, art + ': Hinweis nie über Fenster-Kopf/Fuß oder den Zoom-Knöpfen', r.fenster);
    ok(!r.st.klein.length, art + ': Tippflächen ≥ 44 px (Zoom-Knöpfe, Rohstoff-Knopf, Angriff-Chips/Held/Knöpfe, Bündnis im Profil, Zurück/Schneller, Bauarbeiter)', r.st);
    ok(r.st.startbasis === true && r.st.kopfzeile && r.st.bundGanz && r.st.titel, art + ': nicht abgeschnitten – Startbasis, „Von Hauptstadt“, „Kein Bündnis – jetzt eins suchen“, Titel nie mit Punkt allein', r.st);
    ok(r.st.randnotiz === '11px', art + ': Events – Randnotizen („verpasster Tag = Tag 1“) klein wie „Neu um …“', r.st.randnotiz);
    ok(r.st.bauarbeiter, art + ': Bauarbeiter-Zeile in der Stadt unter dem HUD', r.st);
    if (art === 'Desktop') ok(r.st.ueberLeiste, art + ': Angriffs-Karte endet über der Leiste (Events/Shop antippbar)', r.st);
    await ctx.close();
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
