// Hänger bei Last (5.10.): „Verbindung wird wiederhergestellt …“ erst nach 20 s ohne Weltrechner (ein langsamer Puls von 15–30 s
// ist kein Ausfall); ein Marsch am Ziel zeigt „wird ausgewertet …“ statt einer stehenden 0:00 (Unterwegs-Liste, Karte, Uhren).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const hinweis = () => p.evaluate(() => [...document.querySelectorAll('h2')].some(h => /Verbindung wird wiederhergestellt/.test(h.textContent) && h.offsetParent));
  // 1) kurz weg (langsamer Puls): kein Hinweis
  await p.evaluate(() => rechnerStatus(false)); await p.waitForTimeout(3000);
  ok(!(await hinweis()), 'nach 3 s ohne Weltrechner noch kein Hinweis');
  await p.evaluate(() => rechnerStatus(true)); await p.waitForTimeout(19000);
  ok(!(await hinweis()), 'kommt er vor 20 s zurück: gar kein Hinweis');
  // 2) länger als 20 s weg: Hinweis; kommt er zurück: weg
  await p.evaluate(() => rechnerStatus(false)); await p.waitForTimeout(12000);
  await p.evaluate(() => rechnerStatus(false));   // (ein zweites false startet die Frist nicht neu)
  ok(!(await hinweis()), 'nach 12 s noch kein Hinweis');
  await p.waitForTimeout(9500);
  ok(await hinweis(), 'nach über 20 s durchgehend ohne Weltrechner: Hinweis');
  await p.evaluate(() => rechnerStatus(true)); await p.waitForTimeout(300);
  ok(!(await hinweis()), 'Weltrechner wieder da: Hinweis weg');
  // 3) Marsch am Ziel: „wird ausgewertet …“
  const r = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const ziel = islands.find(i => i.id !== playerIslandId && !ownedIslands.has(i.id)), t = Date.now();
    pendingAttacks.push({ sourceId: playerIslandId, targetId: ziel.id, rawTroops: 10, startedAt: t - 60000, resolveAt: t - 2000, attackerBotId: null });
    pendingSends.push({ fromId: playerIslandId, toId: playerIslandId, troops: 5, startedAt: t, resolveAt: t + 65000, senderBotId: null });
    renderActiveMarches(); const txt = document.getElementById('activeMarches').innerText;
    const el = document.createElement('div'); el.innerHTML = uhrHtml(t - 1000, 'marsch') + '|' + uhrHtml(t + 125000, 'marsch'); document.body.appendChild(el); liveUhren(el);
    const out = { liste: txt, uhr: el.textContent, karte: [marschUhr(0), marschUhr(-3), marschUhr(0.2), marschUhr(65)] };
    el.remove(); pendingAttacks.pop(); pendingSends.pop(); return out;
  });
  ok(/wird ausgewertet …/.test(r.liste) && !/\b0:00\b/.test(r.liste), 'Unterwegs: Angriff am Ziel „wird ausgewertet …“, keine 0:00', r.liste);
  ok(/1:05/.test(r.liste), 'Unterwegs: laufender Marsch zählt weiter (1:05)', r.liste);
  ok(/^wird ausgewertet …\|2:0[45]$/.test(r.uhr), 'Uhr (uhrHtml marsch): abgelaufen → „wird ausgewertet …“, sonst Restzeit', r.uhr);
  ok(JSON.stringify(r.karte) === JSON.stringify(['wird ausgewertet …', 'wird ausgewertet …', '0:01', '1:05']), 'Marsch-Uhr auf der Karte (marschUhr)', r.karte);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
