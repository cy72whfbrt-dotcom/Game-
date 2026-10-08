// Helden mit KI-Bildern + zuletzt geschickte Helden (Merkliste 18 + 20), Vorschau ohne Server:
// A) alle 20 Helden haben Figur + Kopf (bilder/held_<id>.webp, held_<id>_kopf.webp) mit echter Transparenz; heroImg zeigt den Kopf
// B) Heldenhalle: Raster aus Bild-Karten (Figur, Seltenheits-Rahmen data-r), Held groß mit Figur, 4 Fähigkeits-Kacheln, 4 Werte
// C) Merkliste 18: nach dem Losschicken stehen die Helden in der Stadt (Spielstand, kein eigener Browser-Schlüssel); die nächste
//    Angriffs-Vorschau hat sie vorausgewählt, ist der erste unterwegs, rückt der nächste nach; Feld/Barbaren/Rally ebenso
// Bilder (Helden-Liste, Held, Marsch-Auswahl, Kampfbericht) nur, wenn ein Ordner als 2. Argument kommt.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', bilder = process.argv[3] || null, fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof HEROES !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  await p.evaluate(() => { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); for (const s of Object.values(loadBotState())) if (s && s.city) s.city.levels.heroes = Math.max(1, s.city.levels.heroes || 0); });   // Helden erst mit Heldenhalle (Merkliste 21)
  await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  const foto = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, n + '.png') }); };
  const warte = ms => p.waitForTimeout(ms);
  // A) Bilder: da (Datei), Größe, Transparenz in der Ecke (als data:-URL geladen – file:// würde die Leinwand sperren)
  const ids = await p.evaluate(() => HEROES.map(h => h.id)), fs = require('fs'), daten = {};
  for (const id of ids) for (const n of [id, id + '_kopf']) { const f = path.join(path.resolve(process.argv[2]), 'bilder', 'held_' + n + '.webp'); daten[n] = fs.existsSync(f) ? fs.readFileSync(f).toString('base64') : null; }
  const A = await p.evaluate(async daten => {
    const lade = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const out = { fehlt: [], groesse: [], deckend: [], ids: HEROES.length };
    for (const h of HEROES) for (const gross of [true, false]) { const n = h.id + (gross ? '' : '_kopf');
      const i = daten[n] && await lade('data:image/webp;base64,' + daten[n]); if (!i) { out.fehlt.push(n); continue; }
      if (gross ? i.naturalWidth !== 360 || i.naturalHeight !== 480 : i.naturalWidth !== 160 || i.naturalHeight !== 160) out.groesse.push([n, i.naturalWidth, i.naturalHeight]);
      const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let leer = 0; for (let k = 3; k < d.length; k += 4) if (d[k] < 10) leer++;
      if (leer < c.width * c.height * .1) out.deckend.push(n);                 // (Hintergrund durchsichtig: mindestens ein Zehntel ganz leer)
    }
    out.chip = heroImg(HEROES[0].id); out.gross = heroImg(HEROES[0].id, 'x', true);
    return out;
  }, daten);
  ok(A.ids === 20 && !A.fehlt.length, 'A 20 Helden mit Figur und Kopf (alle Bilder da)', A.fehlt);
  ok(!A.groesse.length, 'A einheitlich zugeschnitten (Figur 360×480, Kopf 160×160)', A.groesse);
  ok(!A.deckend.length, 'A echte Transparenz (Hintergrund durchsichtig)', A.deckend);
  ok(/held_[a-z]+_kopf\.webp/.test(A.chip) && /held_[a-z]+\.webp/.test(A.gross) && !/data:image/.test(A.chip), 'A heroImg: Kopf für Chips, Figur für große Karten', [A.chip, A.gross]);
  // B) Heldenhalle
  await p.evaluate(() => { const H = loadHeroes(); for (const id of ['sigrun', 'bernhard', 'ida', 'brunhild', 'ragna']) Object.assign(H[id], { own: true, q: 6, sk: [1, 2, 0, 0], sh: 3 }); saveHeroes(); openHeroHall(); });
  await warte(1200); await foto('helden_liste');
  const B1 = await p.evaluate(() => { const k = [...document.querySelectorAll('#heroHall .hh-card')];
    return { n: k.length, r: k.every(x => x.dataset.r && getComputedStyle(x).borderImageSource.includes('ui_kachel_' + x.dataset.r)),
      fig: k.every(x => /held_[a-z]+\.webp/.test(x.querySelector('.hh-art img').getAttribute('src'))), geladen: k.filter(x => x.querySelector('.hh-art img').naturalWidth > 0).length }; });
  ok(B1.n === 20 && B1.r && B1.fig, 'B Raster: 20 Bild-Karten mit Figur im Seltenheits-Rahmen', B1);
  ok(B1.geladen === 20, 'B alle Figuren geladen', B1.geladen);
  await p.evaluate(() => openHeroHall('sigrun')); await warte(1000); await foto('held_detail');
  const B2 = await p.evaluate(() => { const el = document.getElementById('heroHall'), img = el.querySelector('.hh-portrait'), r = img && img.getBoundingClientRect();
    return { src: img && img.getAttribute('src'), w: r && Math.round(r.width), h: r && Math.round(r.height), geladen: img && img.naturalWidth, kacheln: el.querySelectorAll('.hh-skk').length,
      werte: el.querySelectorAll('.hh-vals > div .hh-vi').length, plus: el.querySelectorAll('[data-hh-sk]').length, name: (el.querySelector('.hh-nm') || {}).textContent,
      breit: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  ok(/held_sigrun\.webp$/.test(B2.src) && B2.geladen > 0 && B2.h > 250, 'B Held groß: Figur auf der Bühne', B2);
  ok(B2.kacheln === 4 && B2.werte === 4 && B2.plus === 4 && B2.name === 'Sigrun' && B2.breit, 'B Fähigkeiten als Kacheln, Werte mit Symbol, Knöpfe da, nichts ragt raus', B2);
  await p.evaluate(() => closeHeroHall());
  // C) Merkliste 18: zuletzt geschickt → vorausgewählt
  const C = await p.evaluate(async () => {
    const out = {}, warte = ms => new Promise(r => setTimeout(r, ms));
    const c = loadCity(); c.lh = null; saveCity();
    const ziel = islands.filter(i => !islandOwnerOf(i.id) && i.type === 'tower' && canReach(islandById[playerIslandId].landmassId, i.landmassId) && !bossAt(i.id))
      .sort((a, b) => Math.hypot(a.x - islandById[playerIslandId].x, a.y - islandById[playerIslandId].y) - Math.hypot(b.x - islandById[playerIslandId].x, b.y - islandById[playerIslandId].y))[0];
    out.ziel = !!ziel; islandTroops[playerIslandId] = 50000;
    const vorschau = async () => { closeAllPopups(); openIslandPopup(ziel); await warte(300); previewSourceId = playerIslandId; previewFraction = 1; popupView = 'preview'; previewShownAt = Date.now(); renderPopup(); await warte(500); };
    previewHero = previewHero2 = null; await vorschau(); out.leer = [previewHero, previewHero2];
    previewHero = 'sigrun'; previewHero2 = 'bernhard'; patchAttackPreview();
    previewShownAt = Date.now() - 1000;                                       // (der Knopf wartet 350 ms nach dem Öffnen)
    document.getElementById('attackBtn').click(); await warte(300);
    out.lh = loadCity().lh; out.imStand = JSON.parse(localStorage.getItem('openWaterCity')).lh;
    out.unterwegs = heroBusy('player', 'sigrun');
    out.schluessel = Object.keys(localStorage).filter(k => /letzt|lh/i.test(k));
    previewHero = previewHero2 = null; await vorschau();                     // Sigrun und Bernhard laufen: die nächsten freien aus der Liste
    out.danach = [previewHero, previewHero2];
    c.lh = ['ida', 'brunhild', 'ragna']; saveCity(); previewHero = previewHero2 = null; await vorschau();
    out.vor = [previewHero, previewHero2]; const chip = popupStats.querySelector('[data-held-auf="1"]'); out.chip = chip ? chip.textContent : '';
    out.chipBild = !!(chip && chip.querySelector('img[src*="held_ida_kopf"]'));
    previewHeldAuf = 1; patchAttackPreview(); return out;
  });
  await warte(800); await foto('marsch_auswahl');
  Object.assign(C, await p.evaluate(() => {
    const out = {}; closeAllPopups();
    // Feld, Barbaren, Rally: frisch geöffnet → dieselben
    const f = resFields.find(x => !(fieldState[x.id] && fieldState[x.id].occ)); fieldHero = fieldHero2 = null; closeFieldSheet(); openFieldSheet(f); out.feld = [fieldHero, fieldHero2]; closeFieldSheet();
    barbHero = barbHero2 = null; closeBarbSheet(); const camp = barbState.camps[0] || null;
    if (camp) { openBarbSheet({ kind: 'camp', id: camp.id }); out.barb = [barbHero, barbHero2]; closeBarbSheet(); }
    out.rally = bundHeldVor();
    return out;
  }));
  ok(C.ziel && C.leer[0] === null, 'C ohne Merkliste: kein Held vorausgewählt', C.leer);
  ok(C.lh && C.lh[0] === 'sigrun' && C.lh[1] === 'bernhard' && C.imStand && C.imStand[0] === 'sigrun' && C.unterwegs, 'C losgeschickt: Helden im Spielstand (Stadt) gemerkt', [C.lh, C.imStand, C.unterwegs]);
  ok(!C.schluessel.length, 'C kein eigener Browser-Schlüssel', C.schluessel);
  ok(C.danach[0] !== 'sigrun' && C.danach[0] !== 'bernhard', 'C laufende Helden nicht vorausgewählt', C.danach);
  ok(C.vor[0] === 'ida' && C.vor[1] === 'brunhild' && /Ida/.test(C.chip) && C.chipBild, 'C Vorschau: zuletzt geschickte Helden vorausgewählt (mit Bild)', C);
  ok(C.feld[0] === 'ida' && C.feld[1] === 'brunhild', 'C Feld: vorausgewählt', C.feld);
  ok(!C.barb || (C.barb[0] === 'ida' && C.barb[1] === 'brunhild'), 'C Barbaren: vorausgewählt', C.barb);
  ok(C.rally.held === 'ida' && C.rally.held2 === 'brunhild', 'C Rally: vorausgewählt', C.rally);
  // Bild: Kampfbericht mit Held
  if (bilder) {
    await p.evaluate(() => { closeAllPopups(); const a = pendingAttacks.find(x => x.hero === 'sigrun'); if (a) { a.resolveAt = Date.now(); resolveAttack(a); pendingAttacks.splice(pendingAttacks.indexOf(a), 1); }
      battleLogBtn.click(); const r = combatLogListEl.firstElementChild; if (r) r.click(); });
    await warte(1200); await foto('kampfbericht');
  }
  ok(!fe.length, 'keine Skript-Fehler', fe);
  await b.close();
})();
