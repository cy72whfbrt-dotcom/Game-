// Texte aus dem Spieltest (6.10.): Events → Abholen nennt die wartende tägliche Belohnung (nicht „Gerade nichts zum Abholen“),
// Bündnis: „Eigenes Bündnis gründen“ zeigt den Preis als „… Münzen“, leere Liste weist aufs Gründen hin, Profil: Belohnung der
// nächsten Stufe verständlich („Belohnung für Stufe 2: +1 Münze, +1 Truppe“). Handy 390 px. Bilder in process.argv[3], wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }), bilder = process.argv[3];
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.addInitScript(() => { window.__OW = { nameGewaehlt: true }; });
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof bundOeffnen === 'function' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(3000);
  const ev = f => p.evaluate(f).catch(e => ({ fehler: e.message }));
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } if (typeof anleitung !== 'undefined') anleitung.schritt = ANLEITUNG.length; });
  // 1) Events → Abholen: Abholfach leer, tägliche Belohnung bereit → der Satz oben sagt das; nach dem Abholen der alte Satz
  const e = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    for (const x of inboxList().slice()) inboxClaim(x.id);
    dailyState = { last: '', day: 0 }; openGoals('reward'); await warte(400);
    const o = { bereit: dailyClaimable(), text: document.getElementById('inboxList').textContent, badge: goalsPopup.querySelector('[data-ggbadge="abholen"]').textContent };
    showDailyModal(); document.getElementById('dailyModalBtn').click(); await warte(200); closeDailyModal(); await warte(200);
    o.nachher = document.getElementById('inboxList').textContent; o.nochBereit = dailyClaimable(); closeAllPopups(); return o;
  });
  ok(e.bereit && /tägliche Belohnung wartet/.test(e.text) && e.badge === '1', 'Events → Abholen: Zahl 1 am Reiter und der Satz nennt die tägliche Belohnung', e);
  ok(!e.nochBereit && /^Gerade nichts zum Abholen/.test(e.nachher), 'nach dem Abholen: „Gerade nichts zum Abholen“', e.nachher);
  // 2) Bündnis ohne Bündnis: Preis klar als Münzen, leere Liste → Hinweis aufs Gründen, alles im Bild (390 px)
  const g = await ev(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), alt = bund.b; bund.b = {};
    try {
      bundOeffnen('suchen'); await warte(400);
      const k = document.querySelector('[data-bact="gruendenAuf"]'), c = k && k.querySelector('.cost'), kr = k && k.getBoundingClientRect(), cr = c && c.getBoundingClientRect();
      return { leer: (document.querySelector('#bundPopup .bd-liste .ev-leer') || {}).textContent || '', preis: c ? c.textContent.trim() : '', soll: fmtNum(BUND.KOSTEN) + ' Münzen',
        drin: !!(kr && cr && cr.right <= kr.right + 1 && cr.left >= kr.left - 1 && kr.right <= innerWidth), eineZeile: !!(cr && cr.height < 40), aria: k ? k.getAttribute('aria-label') : '' };
    } finally { bund.b = alt; }
  });
  ok(g.preis === g.soll && g.drin && g.eineZeile && /kostet/.test(g.aria), 'Bündnis gründen: Preis „' + g.soll + '“ am Knopf, ganz im Bild', g);
  ok(/keine Bündnisse/.test(g.leer) && /gründe/.test(g.leer), 'leere Bündnis-Liste weist aufs Gründen hin', g.leer);
  if (bilder) await p.screenshot({ path: path.join(bilder, 'spieltexte_buendnis.png') });
  await ev(() => closeAllPopups());
  // 3) Profil: Belohnung der nächsten Stufe verständlich, Einzahl richtig
  const pr = await ev(async () => {
    document.getElementById('profileBtn').click(); await new Promise(f => setTimeout(f, 400)); showProfileTab('info'); await new Promise(f => setTimeout(f, 300));
    const x = document.getElementById('xpNext'), t = x.textContent, n = playerLvl + 1, bk = [...x.querySelectorAll('.bk')].map(k => k.dataset.beute + ':' + (k.querySelector('b') || {}).textContent); closeAllPopups();
    return { t, bk, m: levelRewardCoins(n), tr: levelRewardTroops(n), n };
  });
  ok(new RegExp('^Belohnung für Stufe ' + pr.n).test(pr.t) && pr.bk.some(k => k.startsWith('coins:')) && pr.bk.some(k => k.startsWith('tr:')), 'Profil: „Belohnung für Stufe N“ als Bild-Kacheln (Münzen, Truppen) mit Zahl', pr);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
