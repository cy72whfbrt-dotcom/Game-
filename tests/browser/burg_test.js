// Laufender Burg-Bau bleibt nach dem Neuladen so lang, wie er ist (früher: beim Laden auf die alte, kurze Bauzeit gekürzt)
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  const now = Date.now();
  await p.evaluate(now => { const c = JSON.parse(localStorage.getItem('openWaterCity') || '{"levels":{}}'); c.levels.keep = 10; c.builds = [{ id: 'keep', to: 11, startedAt: now, endsAt: now + 10 * 86400000 }]; localStorage.setItem('openWaterCity', JSON.stringify(c)); window.onbeforeunload = null; }, now);
  await p.reload(); await p.waitForTimeout(6000);
  const r = await p.evaluate(() => { const b = (loadCity().builds || []).find(x => x.id === 'keep'); return { rest: b ? (b.endsAt - Date.now()) / 3600000 : null, soll: AUF.burgZeitRoh(10) / 3600 }; });
  ok(r.rest !== null && r.rest >= Math.min(240, r.soll) - 1, 'Burg-Bau nach dem Neuladen nicht gekürzt (Stunden)', r);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
