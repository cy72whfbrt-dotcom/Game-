// Anfängerschutz auch in der Vorschau ohne Server (Alexander 7.10., Entscheidung B): beim frischen Start ist der Spieler geschützt –
// kein Mitspieler späht ihn aus oder greift ihn an; '0' im Spielstand schaltet ihn ab (so machen es Tests mit frühen Angriffen).
// Start-Münzen (Alexander 8.10.): 10.000 für neue Spieler und Mitspieler.
//   node tests/browser/neuling_vorschau_test.js <vorschau>
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && typeof neulingAktiv === 'function' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 });
  const r = await p.evaluate(() => ({ welt: !!window.WELT, aktiv: neulingAktiv('player'), stunden: Math.round((neulingVon('player') - Date.now()) / 3600000),
    spaeher: pendingScouts ? pendingScouts.filter(s => islandOwnerOf(s.targetId) === 'player').length : 0 }));
  ok(!r.welt && r.aktiv && r.stunden >= 47 && r.stunden <= 48, 'Vorschau ohne Server: Anfängerschutz 48 Std. ab dem ersten Start', r);
  await p.waitForTimeout(8000);
  const s = await p.evaluate(() => ({ spaeher: (typeof pendingScouts !== 'undefined' ? pendingScouts : []).filter(x => x.botId && islandOwnerOf(x.targetId) === 'player').length,
    angriffe: pendingAttacks.filter(a => a.attackerBotId && islandOwnerOf(a.targetId) === 'player').length }));
  ok(s.spaeher === 0 && s.angriffe === 0, 'kein Mitspieler späht oder greift den Neuling an', s);
  const aus = await p.evaluate(() => { store.set('openWaterNeulingBis', '0'); return neulingAktiv('player'); });
  ok(aus === false, "Tests: '0' schaltet den Schutz ab", aus);
  const m = await p.evaluate(() => ({ coins, bots: BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id].size).map(d => botCoins[d.id]) }));
  ok(m.coins >= 10000 && m.coins < 12000, 'neuer Spieler startet mit 10.000 Münzen (Alexander 8.10.)', m.coins);
  ok(m.bots.length && m.bots.filter(c => c >= 5000).length >= m.bots.length * .8, 'Mitspieler starten auch mit 10.000 Münzen (fast alle haben noch über 5.000)', m.bots.slice(0, 12));
  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
