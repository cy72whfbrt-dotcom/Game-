// Merkliste 11c (Handy 390×844): 7 Saison-Rahmen am Namensschild der Basis + HUD-Wappen, 9 Gebäude-Fenster nur senkrecht
// scrollbar + Basis-Namen statt „Turm #N“, 12 Sammeln mit Tempo/Std., Restzeit und Balken. (28 Invasions-Chip: event_leiste_test)
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof islands !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    // 7) Champion-Rahmen angelegt → HUD-Ring + Ring im Namensschild der Hauptstadt, Hauptstadt-Fahne mit Wappen statt Burg-Symbol
    saison = Object.assign(saison || {}, { last: Object.assign((saison && saison.last) || {}, { top: [['player', 1]] }) });   // Platz 1 der letzten Saison
    look.frames = [...new Set([...(look.frames || []), 'sz1'])]; look.frame = 'sz1'; saveLook(); renderLook(); RING_WER.clear();
    const hr = document.querySelector('#hudPlayer .avatar-ring');
    o.hud = [hr.dataset.frame, /ui_rahmen_champion/.test(getComputedStyle(hr, '::after').backgroundImage)];
    const cap = islandById[playerIslandId]; ringBild('sz1');
    for (let i = 0; i < 100 && !ringBild('sz1'); i++) await warte(50);
    SCHILD_MERK.clear(); schildBild(schildDaten(cap), 200, false);
    o.schild = [rahmenAufKarte('player'), [...SCHILD_MERK.keys()].some(k => /ui_rahmen_champion/.test(k))];
    o.fahne = bannerModel(cap).glyph;
    // 9) Gebäude-Fenster (Mauer): nur senkrecht scrollen, nichts ragt seitlich hinaus
    closeAllPopups(); openCity(); cityOpenId = 'wall'; cityPage = 'bau'; renderCitySheet(); await warte(300);
    const sh = document.getElementById('citySheet'), cs = getComputedStyle(sh);
    sh.scrollLeft = 200;
    o.fenster = { ox: cs.overflowX, ta: cs.touchAction, breit: sh.scrollWidth <= sh.clientWidth + 1, links: sh.scrollLeft };
    cityOpenId = null; sh.hidden = true;
    // 9) Namen statt „Turm #N“: Basis-Fenster und Marsch-Hinweis
    const neutral = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id));
    o.namen = [ortName(neutral), ortName(neutral, true), ortName(cap)];
    openIslandPopup(neutral); popupIslandId = neutral.id; renderPopup(); o.titel = document.getElementById('popupTitle').textContent; closeAllPopups();
    // 12) Sammeln: eigene Sammler am Feld → Tempo pro Stunde, Restzeit, Balken gesammelt/Traglast
    const f = resFields.find(x => fieldInfo(x).left > 0 && !fieldInfo(x).occ), st = fieldInfo(f);
    st.occ = { who: 'player', troops: 5000, homeId: playerIslandId, hero: null, hero2: null, since: Date.now(), got: 10 };
    openFieldSheet(f); await warte(100);
    const fs = document.getElementById('fieldSheet');
    o.sammeln = { text: fs.innerText.replace(/\s+/g, ' '), balken: !!fs.querySelector('.field-fort .ach-bar i'), uhr: !!fs.querySelector('.field-lines [data-uhr]'), rate: fieldRateOf(f, st.occ, null) > 0,
      breit: fs.scrollWidth <= fs.clientWidth + 1 };
    closeFieldSheet(); st.occ = null;
    return o;
  });
  ok(r.hud[0] === 'sz1' && r.hud[1], 'HUD-Wappen trägt den Champion-Ring (Bild)', r.hud);
  ok(r.schild[0] === 'sz1' && r.schild[1], 'Namensschild unter der Hauptstadt: Champion-Ring ums Wappen', r.schild);
  ok(/^crest/.test(r.fahne), 'Hauptstadt-Fahne zeigt das Wappen statt des Burg-Symbols', r.fahne);
  ok(r.fenster.ox === 'hidden' && r.fenster.ta === 'pan-y' && r.fenster.breit && r.fenster.links === 0, 'Gebäude-Fenster: nur senkrecht scrollbar, nichts ragt seitlich hinaus', r.fenster);
  ok(/^Neutrale Basis · X \d+ · Y \d+$/.test(r.namen[0]) && r.namen[1] === 'Neutrale Basis' && r.namen[2] === 'Hauptstadt' && r.titel === 'Neutrale Basis', 'Namen statt „Turm #N“ (Fenster-Titel, Hinweise)', [r.namen, r.titel]);
  ok(/Tempo [\d.,]+ \S+ \/ Std\./.test(r.sammeln.text) && /(Voll|Feld leer) in \d/.test(r.sammeln.text) && r.sammeln.balken && r.sammeln.uhr && r.sammeln.rate, 'Sammeln: Tempo pro Stunde, Restzeit (läuft) und Balken', r.sammeln.text);
  ok(r.sammeln.breit && !/undefined|NaN/.test(r.sammeln.text), 'Sammel-Fenster passt aufs Handy, keine kaputten Werte', r.sammeln);
  ok(!fe.length, 'keine Fehler auf der Seite', fe.slice(0, 3));
  await b.close();
})();
