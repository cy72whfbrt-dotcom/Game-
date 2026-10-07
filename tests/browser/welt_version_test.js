// Alter Spielstand einer früheren Karte (Weltversion 8): der Kartenteil wird einmal verworfen – auch Armeen, Felder, Lager,
// Ereignisse –, die Truppen (Basen, Armeen, Sammler) kommen in die neue Hauptstadt; danach zeichnet die Karte die Basen wieder.
//   node tests/browser/welt_version_test.js <vorschau>
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('alt')) return; sessionStorage.setItem('alt', '1');
    const S = (k, v) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    S('openWaterWorldVersion', '8'); S('openWaterPlayerIslandId', '99999'); S('openWaterOwnedIslands', [99999, 99998]); S('openWaterIslandTroops', { 99999: 300, 99998: 200 });
    S('openWaterArmies', { armies: [{ id: 'a1', troops: 1000, x: 1, y: 2, mv: { path: [{ x: 1, y: 2 }], to: { kind: 'base', id: 99997 } } }], joins: [], raids: [] });
    S('openWaterFieldMarches', [{ who: 'player', homeId: 99999, fieldId: 'f9999', troops: 50 }]);
    S('openWaterFields', { f9999: { occ: { who: 'player', troops: 7, homeId: 99999 } } });
    S('openWaterBarb', { camps: [{ id: 'alt1', x: 0, y: 0, lm: 99, L: 3 }], n: 2 }); S('openWaterCoins', '17392'); S('openWaterSaisonMein', '1'); S('openWaterLevel', '5'); S('openWaterReset', '1'); });
  const p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && islandById[playerIslandId], null, { timeout: 120000, polling: 500 });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const h = islandById[playerIslandId];
    return { version: localStorage.getItem('openWaterWorldVersion'), armeen: armies.length, felder: Object.keys(fieldState).filter(k => k === 'f9999').length, sammler: fieldMarches.filter(m => m.fieldId === 'f9999').length,
      lager: barbState.camps.filter(c => c.id === 'alt1').length, heim: !!h, truppen: islandTroops[playerIslandId] || 0, muenzen: coins >= 17392 };
  });
  ok(r.version === '9' && !r.armeen && !r.felder && !r.sammler && !r.lager && r.heim, 'alter Kartenteil verworfen (Armeen, Felder, Sammler, Lager), neue Hauptstadt da', r);
  ok(r.truppen >= 300 + 200 + 1000 + 50 + 7 && r.muenzen, 'Truppen aus Basen, Armee, Sammlern kommen mit, Münzen bleiben', r);
  ok(!fe.length, 'keine Fehler beim Laden', fe.slice(0, 3));
  await b.close();
})();
