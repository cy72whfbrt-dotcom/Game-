// Alte Welt auf neuer Karte (8.10.): gespeicherte Basen-IDs, die es auf der Karte nicht mehr gibt (Spielstand von vor der
// Karten-Umstellung), dürfen nie einen Skriptfehler geben. Mitspieler ohne gültige Hauptstadt bekommen nach der normalen
// Regel eine neue (stärkster eigener Turm), unbekannte IDs fallen aus dem Besitz.
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
  await ctx.addInitScript(() => {             // vor dem zweiten Laden: Spielstand mit IDs, die es nicht gibt (wie aus einer alten Welt)
    try { if (!localStorage.getItem('testAlteWelt')) return; localStorage.removeItem('testAlteWelt');
      const ALT = 987654, r = JSON.parse(localStorage.getItem('openWaterBotOwnedIslands')) || {}, st = JSON.parse(localStorage.getItem('openWaterBotState')) || {};
      const ids = Object.keys(r); let k = 0;
      for (const id of ids) { r[id] = (r[id] || []).concat([ALT + k]); st[id] = st[id] || {}; st[id].capital = ALT + k; k++; }
      if (ids[0]) r[ids[0]] = [ALT + 100];                                   // einer hat NUR noch alte Basen
      const eig = JSON.parse(localStorage.getItem('openWaterOwnedIslands')) || []; eig.push(ALT + 200, ALT + 201);   // auch der Spieler: unbekannte IDs
      localStorage.setItem('openWaterOwnedIslands', JSON.stringify(eig));
      localStorage.setItem('openWaterBotOwnedIslands', JSON.stringify(r)); localStorage.setItem('openWaterBotState', JSON.stringify(st));      localStorage.setItem('testAlteWeltIds', JSON.stringify({ nur: ids[0] || null, alt: ALT }));
    } catch (e) {}
  });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html';
  const bereit = () => p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botCapitalOf === 'function' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  await p.goto(url); await p.waitForTimeout(6000); await bereit();
  await p.evaluate(() => { if (typeof flushBotState === 'function') flushBotState(); if (typeof saveGame === 'function') saveGame(); localStorage.setItem('testAlteWelt', '1'); });
  await p.reload(); await p.waitForTimeout(8000); await bereit();
  const r = await p.evaluate(() => {
    const info = JSON.parse(localStorage.getItem('testAlteWeltIds') || '{}'), out = { info, fehler: [] };
    const versuch = (name, f) => { try { return f(); } catch (e) { out.fehler.push(name + ': ' + e.message); } };
    out.unbekannt = []; for (const d of BOT_DEFS) for (const id of botOwnedIslands[d.id] || []) if (!islandById[id]) out.unbekannt.push(d.id + ':' + id);
    out.eigenUnbekannt = [...ownedIslands].filter(id => !islandById[id]);
    out.caps = {}; for (const d of BOT_DEFS) { const c = versuch('botCapitalOf ' + d.id, () => botCapitalOf(d.id)); out.caps[d.id] = c === null || c === undefined ? null : islandById[c] ? islandById[c].type : 'UNBEKANNT'; }
    versuch('islandTitle', () => { for (const i of islands.slice(0, 50)) islandTitle(i); });
    versuch('isCapital', () => { for (const i of islands.slice(0, 50)) isCapital(i.id); });
    versuch('bundPopup', () => { if (typeof bundPopup === 'function') bundPopup(); });
    versuch('renderActiveMarches', () => renderActiveMarches());
    return out;
  });
  ok(r.info && r.info.alt, 'alte IDs eingeschleust', r.info);
  ok(!r.unbekannt.length, 'keine unbekannten Basen im Besitz der Mitspieler', r.unbekannt.slice(0, 5));
  ok(!r.eigenUnbekannt.length, 'unbekannte Spieler-ID in openWaterOwnedIslands fällt weg (OwnSet)', r.eigenUnbekannt);
  ok(Object.values(r.caps).every(c => c === null || c === 'tower'), 'Hauptstadt der Mitspieler: ein Turm der Karte oder keine', r.caps);
  ok(!r.fehler.length, 'Aufrufe ohne Absturz', r.fehler);
  ok(!fe.length, 'keine Skript-Fehler', fe.slice(0, 5));
  await b.close();
})().catch(e => { console.log('FEHLER Test lief durch – ' + e.message); process.exit(1); });
