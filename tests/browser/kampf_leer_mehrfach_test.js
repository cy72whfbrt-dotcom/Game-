// Kampf leer + Mehrfachangriff (Alexander 9.10.), Vorschau ohne Server, Handy:
// A) Kampfbericht ohne Einträge: Bild bericht_leer + Knopf „Barbaren-Lager angreifen“ → Fenster zu, Lager-Fenster offen
// B) Mehrfach kostet 5 Edelsteine, höchstens 10 Ziele (11. Tipp: Hinweis, nicht dazu)
//   node tests/browser/kampf_leer_mehrfach_test.js <vorschau>
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto(url, { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof barbNearest === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const R = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    closeAllPopups();
    // A) Kampf leer
    combatLog.length = 0; document.getElementById('battleLogBtn').click(); await warte(500);
    const img = document.querySelector('#combatLogList .log-leer img'), k = document.querySelector('#combatLogList [data-log-lager]');
    if (img && !img.complete) await warte(800);
    o.leer = { bild: !!img && /bericht_leer/.test(img.src) && img.naturalWidth > 0, knopf: k && k.innerText.trim() };
    const t = barbNearest(); o.lagerDa = !!t;
    if (k) k.click(); await warte(400);
    o.lager = { zu: !isPanelOpen(battleLogPopup), sheet: !barbSheetEl.hidden && !!barbView && barbView.kind === 'camp' && (!t || barbView.id === t.id) };
    barbSheetEl.hidden = true;
    // B) Mehrfach: 5 Edelsteine, höchstens 10 Ziele
    o.kosten = MULTI_ATTACK_GEM_COST === 5 && MULTI_ATTACK_MAX === 10 && document.querySelector('#multiAttackBtn [data-const]').textContent === '5';
    const src = islandById[playerIslandId], ziele = islands.filter(i => i.type === 'tower' && !ownedIslands.has(i.id) && i.landmassId === src.landmassId && !baseShieldedFor(i.id, 'player'))
      .sort((a, c) => Math.hypot(a.x - src.x, a.y - src.y) - Math.hypot(c.x - src.x, c.y - src.y)).slice(0, 11);
    o.zieleN = ziele.length;
    startMultiAttack(playerIslandId); multiAttackTargets.push(...ziele.slice(0, 10).map(z => z.id));
    const elf = ziele[10];
    if (elf) { revealAround(elf.x, elf.y, REVEAL_BASE, true); mapState.zoom = Math.max(mapState.zoom, .02); mapState.offsetX = viewW / 2 - elf.x * mapState.zoom; mapState.offsetY = viewH / 2 - elf.y * mapState.zoom; requestRender();
      handleTap(viewW / 2, viewH / 2); }
    o.max = multiAttackTargets.length; o.hinweis = document.getElementById('hint').textContent;
    multiAttackCancelBtn.click();
    return o;
  });
  ok(R.leer.bild && /Barbaren-Lager angreifen/i.test(R.leer.knopf), 'Kampf leer: Bild bericht_leer + Knopf „Barbaren-Lager angreifen“', R.leer);
  ok(!R.lagerDa || (R.lager.zu && R.lager.sheet), 'Knopf: Kampf-Fenster zu, nächstes Lager offen', R);
  ok(R.kosten, 'Mehrfach kostet 5 Edelsteine (Knopf zeigt 5)', R);
  ok(R.zieleN < 11 || (R.max === 10 && /Höchstens 10 Ziele/.test(R.hinweis)), 'Mehrfach: 11. Ziel nicht dazu, Hinweis „Höchstens 10 Ziele“', R);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
