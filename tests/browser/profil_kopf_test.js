// Profil aus Spieler-Sicht (Spieler-Durchsicht, Bereich C): überall derselbe Name (HUD, Profil, Rangliste, Einstellungen –
// nie „Du“/„Dein Name“/„–“), Kopf mit Macht, „Basen 1“ statt „1 / 25.024“, Hauptstadt als Koordinaten mit „Zeigen“,
// „Nächster Rang“ statt „Weltanteil < 0,1 %“; Ausrüstung leer: keine Reihe „0 %“, leere Felder führen zur Kiste;
// Fähigkeiten: große runde Knoten mit Namen; Einstellungen ohne Konto: klarer Satz statt „Einen Moment …“, keine Zeile „–“.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof renderProfile === 'function', null, { timeout: 120000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(1500);
  const ev = f => p.evaluate(f);

  // 1) Name überall gleich
  const n = await ev(async () => {
    for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    closeAllPopups(); updateHudPlayer(); document.getElementById('profileBtn').click(); await new Promise(r => setTimeout(r, 300));
    const kopf = document.querySelector('#profilePopup .phead');
    const out = { name: profileName.value, hud: document.getElementById('hudName').textContent, kopfH: Math.round(kopf.getBoundingClientRect().height),
      kennung: document.getElementById('profileKennung').textContent, basen: document.getElementById('kBases').textContent,
      rang: document.getElementById('profileNextRank').textContent, stats: document.getElementById('profileStats').textContent,
      ring: document.getElementById('pAvatarRing').style.getPropertyValue('--progress') };
    document.getElementById('tabBtnSet').click(); await new Promise(r => setTimeout(r, 200));
    const nr = document.getElementById('setNr').parentElement;
    out.setName = document.getElementById('setName').textContent; out.nrZeile = getComputedStyle(nr).display; out.push = document.getElementById('pushText').textContent;
    closeAllPopups(); openRankings('power'); await new Promise(r => setTimeout(r, 400));
    const ich = document.querySelector('#rankPopup .lb-row.isMe .lb-name b > span'); out.rangliste = ich ? ich.textContent : '';
    closeAllPopups(); return out; });
  ok(n.name === 'Statthalter' && n.hud === n.name && n.setName === n.name && n.rangliste === n.name, 'Name: ohne Konto „Statthalter“ – HUD, Profil, Einstellungen, Rangliste gleich (nie „Du“/„Dein Name“/„–“)', n);
  ok(/Macht\s*\S+/.test(n.kennung) && !/Nr\./.test(n.kennung), 'Profil-Kopf: Macht (Spieler-Nummer nur mit Konto)', n.kennung);
  ok(n.kopfH <= 140, 'Profil-Kopf bleibt kompakt (≤ 140 px auf dem Handy)', n.kopfH);
  ok(/^\d+$/.test(n.basen.replace(/\./g, '')) && !/\//.test(n.basen), 'Reich: „Basen 1“ ohne „/ 25.024“', n.basen);
  ok(/^Silber ab 5 Basen$/.test(n.rang) && n.ring !== '', 'Reich: „Nächster Rang: Silber ab 5 Basen“ statt Weltanteil, Ring zeigt den Weg', { rang: n.rang, ring: n.ring });
  ok(/Hauptstadt\s*X \d+ · Y \d+\s*Zeigen/.test(n.stats) && !/Turm #|Insel \d/.test(n.stats), 'Hauptstadt als Koordinaten mit „Zeigen“ (keine internen Nummern)', n.stats);
  ok(/nur nach der Anmeldung/.test(n.push) && n.nrZeile === 'none', 'Einstellungen ohne Konto: klarer Satz statt „Einen Moment …“, keine Zeile „Spieler-Nummer –“', { push: n.push, nr: n.nrZeile });

  // 2) Hauptstadt „Zeigen“: Profil zu, Karte fährt hin
  const z = await ev(async () => { document.getElementById('profileBtn').click(); await new Promise(r => setTimeout(r, 200));
    let hin = false; const alt = window.recenterOnHome; recenterOnHome = a => { hin = a === true; };
    try { document.querySelector('#profileStats [data-heimzeigen]').click(); } finally { recenterOnHome = alt; }
    return { zu: !isPanelOpen(profilePopup), hin }; });
  ok(z.zu && z.hin, 'Hauptstadt „Zeigen“: Profil schließt, Karte fährt zur Hauptstadt', z);

  // 3) Ausrüstung leer: keine „0 %“-Reihe, leeres Feld → Ausrüstungskiste
  const a = await ev(async () => { for (const k of Object.keys(equippedItems)) equippedItems[k] = null;
    closeAllPopups(); document.getElementById('profileBtn').click(); document.getElementById('tabBtnEquip').click(); await new Promise(r => setTimeout(r, 200));
    const leer = document.querySelector('#chestEquippedGrid .tile.empty'), out = { reihe: document.getElementById('equipStats').hidden, plus: !!(leer && leer.querySelector('.p5-plus')),
      text: [...document.querySelectorAll('#chestEquippedGrid .slot-r')].map(x => x.textContent) };
    leer.click(); await new Promise(r => setTimeout(r, 200));
    out.shop = isPanelOpen(document.getElementById('shopPopup')) && shopTab === 'gems'; closeAllPopups(); return out; });
  ok(a.reihe && a.plus && a.text.every(t => t === 'Kiste holen') && a.shop, 'Ausrüstung leer: keine „0 %“-Reihe, leere Felder mit Plus führen zur Ausrüstungskiste', a);

  // 4) Fähigkeiten: große runde Knoten mit Namen
  const s = await ev(async () => { document.getElementById('profileBtn').click(); document.getElementById('tabBtnSkills').click(); await new Promise(r => setTimeout(r, 200));
    const k = [...document.querySelectorAll('#skillGrid .skillNode')]; const r = k[0].getBoundingClientRect();
    const namen = k.map(x => (x.querySelector('.nName') || {}).textContent || ''), sicht = k.every(x => { const q = x.querySelector('.nName').getBoundingClientRect(); return q.height > 0 && q.left >= 0 && q.right <= innerWidth; });
    closeAllPopups(); return { n: k.length, namen, w: Math.round(r.width), rund: getComputedStyle(k[0]).borderRadius, sicht }; });
  ok(s.n === 6 && s.namen.every(t => t.length > 2) && s.namen.includes('Geschwindigkeit') && s.w >= 64 && s.rund === '50%' && s.sicht, 'Fähigkeiten: 6 große runde Knoten, Name unter jedem (ganz zu sehen)', s);

  ok(!fe.length, 'keine Skriptfehler', fe.slice(0, 3));
  await b.close();
})();
