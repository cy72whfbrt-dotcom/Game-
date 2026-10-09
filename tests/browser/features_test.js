// Neuerungen 9.10.: Gratis-Kiste im Shop (alle 8 Std., Countdown), Bündnis-Hilfe beim Bauen (jede Hilfe 1 % bzw. mind. 1 Min.,
// höchstens Botschaft-Stufe Hilfen), Handy-Nachrichten „Thron-Event startet“ / „Tages-Kiste bereit“ (weltrechner/push.js),
// Herrscher-Ansage nach dem Thron-Event (einmal je Spieler). Fotos (Handy) in den Arbeitsordner (argv[3]).
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  // Push-Texte (ohne Browser)
  const { nachrichtBauen } = require(path.join(__dirname, '..', '..', 'Game', 'weltrechner', 'push.js'));
  const jetzt = Date.now(), n1 = nachrichtBauen([{ art: 'thron', ankunft: jetzt + 3600000 }], jetzt), n2 = nachrichtBauen([{ art: 'tageskiste' }], jetzt);
  ok(n1.titel === 'Thron-Event startet bald' && /startet in 60 Minuten/.test(n1.text), 'Push: Thron-Event in 1 Stunde', n1);
  ok(n2.titel === 'Tages-Kiste bereit' && /Tages-Kiste/.test(n2.text), 'Push: Tages-Kiste bereit', n2);
  const ordner = process.argv[3] || path.resolve(process.argv[2]);
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  // Schalter in den Einstellungen
  const schalter = await p.evaluate(() => ['thron', 'tageskiste'].every(a => !!document.querySelector('[data-push-art="' + a + '"]')));
  ok(schalter, 'Einstellungen: Schalter Thron-Event und Tages-Kiste');
  // Gratis-Kiste
  const g = await p.evaluate(() => {
    store.remove('openWaterGratisKiste'); const vor = { g: gems, s: schluessel1, b: besch['5m'] };
    openShop('gems'); const k = document.querySelector('#shopKisten [data-gratis]'), bereit = !!k && !k.disabled;
    k.click(); const nach = { g: gems, s: schluessel1, b: besch['5m'] }, t = +store.get('openWaterGratisKiste');
    const dazu = (nach.g - vor.g === 10 ? 1 : 0) + (nach.s - vor.s === 1 ? 1 : 0) + (nach.b - vor.b === 1 ? 1 : 0);
    const bild = !!document.querySelector('#beuteFenster:not([hidden]) .bk, #beuteFenster:not([hidden]) img');
    beuteFensterZu(); renderShop();
    const k2 = document.querySelector('#shopKisten [data-gratis]'), zu = !!k2 && k2.disabled, uhr = !!document.querySelector('#shopKisten [data-uhr]');
    const g2 = gems, s2 = schluessel1, b2 = besch['5m']; gratisOeffnen(); const doppelt = gems !== g2 || schluessel1 !== s2 || besch['5m'] !== b2;
    return { bereit, dazu, gemerkt: t > 0, bild, zu, uhr, doppelt, ab: gratisAb() - t };
  });
  ok(g.bereit && g.dazu === 1 && g.gemerkt && g.bild, 'Gratis-Kiste: öffnen gibt genau einen kleinen Preis (Bild + Zahl)', g);
  ok(g.zu && g.uhr && !g.doppelt && g.ab === 8 * 3600000, 'Gratis-Kiste: danach 8 Std. zu, mit Countdown, nicht doppelt', g);
  await p.screenshot({ path: path.join(ordner, 'features_gratis_kiste.png') });
  // Bündnis-Hilfe (Mitspieler bittet, ein anderer hilft)
  const h = await p.evaluate(() => {
    closeAllPopups();
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size), [K, V] = bots;
    for (const w of [K.id, V.id]) if (bundVon(w)) bundOp(w, { op: 'verlassen' });
    botCoins[K.id] = 1e9; bundOp(K.id, { op: 'gruenden', name: 'Hilfeprobe', tag: 'HLP', offen: true }); const a = bundVon(K.id); bundOp(V.id, { op: 'beitreten', aid: a.id });
    const bs = loadBotState(), c = bs[K.id].city || (bs[K.id].city = { levels: {}, builds: [] }); c.levels = c.levels || {}; c.levels.embassy = 3; c.levels.keep = Math.max(c.levels.keep || 1, 10);
    const now = Date.now(), dauer = hilfeDauer('bau', 'embassy', 4); c.builds = [{ id: 'embassy', to: 4, startedAt: now, endsAt: now + 864e5 }]; saveBotState();
    const fehler = bundHilfeBitte(a, K.id, { was: 'bau', k: 'embassy', to: 4 }, now), hb = (a.hilfe || []).find(x => x.w === K.id);
    const e0 = c.builds[0].endsAt, ja = bundHelfen(a, V.id, hb.id, now), e1 = loadBotState()[K.id].city.builds[0].endsAt, nochmal = bundHelfen(a, V.id, hb.id, now);
    return { fehler, max: hb.max, ja, nochmal, weniger: e0 - e1, soll: Math.max(60000, dauer * .01) };
  });
  ok(h.fehler === '' && h.max === 3 && h.ja && !h.nochmal && Math.abs(h.weniger - h.soll) < 2, 'Bündnis-Hilfe: Bitte, Hilfe kürzt um 1 % (mind. 1 Min.), nur einmal je Mitglied', h);
  // Herrscher-Ansage: einmal, mit Name
  const a = await p.evaluate(() => {
    const K = BOT_DEFS.find(x => !x.mensch), seit = Date.now() - 60000; throneState.herr = { who: K.id, seit, bis: Date.now() + 864e5 }; store.remove('openWaterHerrGesehen');
    herrAnsage(Date.now()); const el = document.getElementById('herrAnsage'), txt = el ? el.textContent : '';
    return { da: !!el, name: txt.includes(K.name), titel: /Neuer Herrscher/.test(txt), krone: !!(el && el.querySelector('.herr-ansage-krone')) };
  });
  ok(a.da && a.name && a.titel && a.krone, 'Herrscher-Ansage: Banner mit Krone und Name', a);
  await p.screenshot({ path: path.join(ordner, 'features_herrscher.png') });
  const a2 = await p.evaluate(() => { document.getElementById('herrAnsage').click(); herrAnsage(Date.now()); return !document.getElementById('herrAnsage'); });
  ok(a2, 'Herrscher-Ansage: nur einmal je Spieler');
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
