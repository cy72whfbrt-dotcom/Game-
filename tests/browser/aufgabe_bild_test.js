// Events/Bündnis/Shop mit Bildern (Gesamt-Blick 6.10.): je Ereignis ein gezeichnetes Bild-Banner mit Titel + Uhr, lange
// Erklärungen hinter „i“ (bleiben beim Neuzeichnen offen), leere Zustände mit Symbol + EINEM Knopf (Rally, Chat, Markt,
// Schild-Vorrat), alle Knopf-Texte passen; am Desktop im Angriffs-Fenster auch die Zweitheld-Wahl.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html';
  const laden = async opt => { const p = await (await b.newContext(opt)).newPage(), fe = []; p.on('pageerror', e => fe.push(e.message));
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof bundOp === 'function' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 });
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } closeAllPopups(); });
    return { p, fe }; };
  const passt = '(el => !!el && el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= innerWidth)';
  // 1) Handy: Events
  const { p, fe } = await laden({ ...devices['iPhone 13'] });
  const e = await p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    for (const t of ['tour', 'inv', 'drache', 'boss']) {
      openGoals(t); await warte(250);
      const bn = document.querySelector('#eventBody .ev-banner'), r = bn && bn.getBoundingClientRect(), t0 = bn && bn.querySelector('.ev-banner-t'), svg = bn && bn.querySelector('svg.ev-bild');
      o[t] = { da: !!svg, art: bn ? bn.className : '', h: r ? Math.round(r.height) : 0, drin: !!r && r.left >= 0 && r.right <= innerWidth, titel: t0 ? t0.innerText.split('\n')[0] : '',
        uhr: !!(bn && bn.querySelector('[data-ev-bis]')) || t === 'boss', textDrin: !!t0 && t0.getBoundingClientRect().bottom <= r.bottom };
    }
    openGoals('inv'); await warte(250);
    const d = document.querySelector('#eventBody details.ev-info'); o.zu = !!d && !d.open && !/Wellen, je 5/.test(document.getElementById('eventBody').innerText);
    d.querySelector('summary').click(); await warte(100); o.auf = /Wellen, je 5/.test(document.getElementById('eventBody').innerText);
    document.getElementById('eventBody')._lh = 'anders'; renderEvents(); await warte(50);   // neu gezeichnet: bleibt offen
    const d2 = document.querySelector('#eventBody details.ev-info'); o.bleibt = !!d2 && d2.open;
    d2.querySelector('summary').click(); await warte(50);
    const ids = [...document.querySelectorAll('svg.ev-bild [id]')].map(x => x.id); o.idsEinzeln = ids.length > 0 && new Set(ids).size === ids.length;
    closeAllPopups(); return o;
  });
  for (const t of ['tour', 'inv', 'drache', 'boss']) ok(e[t].da && e[t].h >= 80 && e[t].h <= 120 && e[t].drin && e[t].titel.length > 3 && e[t].uhr && e[t].textDrin, 'Events „' + t + '“: Bild-Banner (gezeichnet) mit Titel' + (t === 'boss' ? '' : ' und Uhr') + ' darauf, ganz im Bild', e[t]);
  ok(e.zu && e.auf && e.bleibt, 'Invasion: Regeln hinter „i“ (zu), aufklappen zeigt sie, bleibt beim Neuzeichnen offen', { zu: e.zu, auf: e.auf, bleibt: e.bleibt });
  ok(e.idsEinzeln, 'Banner-Verläufe mit eigenen Kennungen (keine doppelten ids)', e.idsEinzeln);
  // 2) Bündnis: Tempel-Banner, Chat leer, Rally leer mit Knopf zur Karte
  const g = await p.evaluate(async passt => { passt = eval(passt);
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    const X = BOT_DEFS.find(x => !x.mensch && !bundVon(x.id) && botOwnedIslands[x.id].size).id; botCoins[X] = 1e9; o.gr = bundOp(X, { op: 'gruenden', name: 'Bildprobe', tag: 'BLD', offen: true }) || 'ok';   // (wie saison_test: Mitspieler gründet, du bist dabei)
    if (!bundVon('player')) { bundRein(bundVon(X), 'player'); bundSpeichern(); }
    const chatAlt = bundChatZeilen; bundChatZeilen = () => [];   // (ein leerer Chat)
    bundOeffnen('info'); await warte(400);
    o.tempel = !!document.querySelector('#bundPopup .ev-banner--tempel svg') && !/Hält ein Mitglied/.test(document.querySelector('#bundPopup').innerText);
    document.querySelector('#bundPopup [data-btab="sig"]').click(); await warte(300);
    const lc = document.querySelector('#bdChat .ev-leer'); o.chat = !!lc && !!lc.querySelector('.icon') && /ruhig/.test(lc.innerText);
    document.querySelector('#bundPopup [data-btab="rally"]').click(); await warte(300);
    bundChatZeilen = chatAlt;
    o.rallyBild = !!document.querySelector('#bundPopup .ev-banner--rally svg');
    const kurz = document.querySelector('#bundPopup .bd-kurz'); o.zeilen = kurz ? Math.round(kurz.getBoundingClientRect().height / parseFloat(getComputedStyle(kurz).lineHeight)) : 99;
    o.lang = /Beute \(Gold/.test(document.querySelector('#bundPopup').innerText);
    const k = document.querySelector('#bundPopup .ev-leer [data-bact="zurKarte"]'); o.knopf = !!k && passt(k) && k.classList.contains('btn--primary');
    if (k) k.click(); await warte(200); o.zu = !isPanelOpen(bundPopup);
    closeAllPopups(); return o;
  }, passt);
  ok(g.gr === 'ok' || /gegründet/.test(g.gr), 'Bündnis gegründet (du bist dabei)', g.gr);
  ok(g.tempel, 'Bündnis-Übersicht: Tempel-Bonus als Bild-Banner, Erklärung hinter „i“', g.tempel);
  ok(g.chat, 'Bündnis-Chat leer: Symbol + Satz statt grauer Zeile', g.chat);
  ok(g.rallyBild && g.zeilen <= 3 && !g.lang, 'Rally: Banner + höchstens 3 Zeilen Text, die lange Erklärung hinter „i“', { bild: g.rallyBild, zeilen: g.zeilen, lang: g.lang });
  ok(g.knopf && g.zu, 'Rally leer: goldener Knopf „Ziel auf der Karte wählen“ (Text passt), schließt das Fenster', { knopf: g.knopf, zu: g.zu });
  // 3) Shop: Markt noch nicht gebaut → Bild + Knopf in die Stadt; Schild-Vorrat leer → ein Satz
  const s = await p.evaluate(async passt => { passt = eval(passt);
    const warte = ms => new Promise(f => setTimeout(f, ms)), o = {};
    openShop('markt'); await warte(300);
    const k = document.querySelector('#shopMarkt .ev-leer [data-markt-bauen]'); o.markt = !!k && passt(k) && !!document.querySelector('#shopMarkt .ev-leer > .icon'); o.ziel = k ? k.dataset.marktBauen : '';
    o.text = k ? k.innerText.trim() : '';
    store.remove('openWaterShieldStock'); openShop('shield'); await warte(300);
    o.leer = /Kein Schild im Vorrat/.test(document.getElementById('shieldUse').innerText) && !document.querySelector('[data-shield-use]');
    store.set('openWaterShieldStock', JSON.stringify({ 2: 1, 8: 0, 24: 0 })); renderShop(); await warte(200);
    o.voll = document.querySelectorAll('[data-shield-use]').length === 3; store.remove('openWaterShieldStock');
    openShop('markt'); await warte(200); document.querySelector('#shopMarkt [data-markt-bauen]').click();
    for (let i = 0; i < 40 && !(!cityView.hidden && cityOpenId === o.ziel); i++) await warte(250);   // (Stadt blendet ein – auf belasteter Maschine dauert es)
    o.stadt = !cityView.hidden && cityOpenId === o.ziel; o.offen = cityOpenId; o.shopZu = !isPanelOpen(shopPopup);
    try { closeCity(); } catch (x) {} return o;
  }, passt);
  ok(s.markt && s.ziel === (/Markt/.test(s.text) ? 'market' : '_keep'), 'Shop → Markt ohne Markt: Bild + goldener Knopf (' + s.text + '), Text passt', s);
  ok(s.stadt && s.shopZu, 'Knopf schließt den Shop und öffnet die Stadt beim passenden Gebäude', { stadt: s.stadt, offen: s.offen, shopZu: s.shopZu });
  ok(s.leer && s.voll, 'Schild-Vorrat leer: ein Satz statt drei „0×“-Kästen; mit Vorrat die drei Knöpfe', { leer: s.leer, voll: s.voll });
  // 4) Desktop: Angriffs-Fenster mit Zweitheld-Wahl (wie am Handy)
  const D = await laden({ viewport: { width: 1440, height: 900 } });
  const a = await D.p.evaluate(async () => {
    const warte = ms => new Promise(f => setTimeout(f, ms));
    const hs = loadHeroes(); HEROES.forEach((h, i) => { if (hs[h.id]) hs[h.id].own = i < 3; });
    const home = islandById[playerIslandId], ziel = islands.filter(i => !ownedIslands.has(i.id) && i.type === 'tower').sort((x, y) => Math.hypot(x.x - home.x, x.y - home.y) - Math.hypot(y.x - home.x, y.y - home.y))[0];
    openIslandPopup(ziel); await warte(300); previewSourceId = playerIslandId; previewFraction = 1; previewHero = HEROES[0].id; previewHero2 = null; popupView = 'preview'; renderPopup(); await warte(500);
    const c2 = popupStats.querySelector('[data-held-auf="2"]'), r = c2 && c2.getBoundingClientRect(), pr = popup.getBoundingClientRect();
    return { da: !!c2 && !c2.hidden && r.width > 40, drin: !!r && r.right <= pr.right + 1 && r.bottom <= innerHeight, text: c2 ? c2.innerText : '' };
  });
  ok(a.da && a.drin && /Zweitheld/.test(a.text), 'Desktop: Angriffs-Fenster zeigt die Zweitheld-Wahl', a);
  if (process.argv[3]) await p.screenshot({ path: path.join(process.argv[3], 'aufgabe_bild.png') });
  ok(!fe.length && !D.fe.length, 'keine Seitenfehler', fe.concat(D.fe).slice(0, 5));
  await b.close();
})();
