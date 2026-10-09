// Event-Preise genau einmal (Endprüfung 9.10.): ein echter Mitspieler (mensch) bekommt seinen Preis als Nachricht „evPreis“ –
// Event-Münzen, Schlüssel und Beschleuniger kamen dort doppelt an (als Feld UND als Gegenstand b). Wochen-Event (Platz 1),
// Thron-Event (Gegenstände b) und der eigene Spieler: abholen bringt genau die Menge, das Hauptbuch (Felder der Nachricht) zählt dieselbe.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof evPreis === 'function' && typeof BOT_DEFS !== 'undefined' && islandById[playerIslandId], null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const X = BOT_DEFS.find(x => !x.mensch).id, w0 = window.WELT, post = [];
    const stand = () => ({ em: eventMuenzen, s1: schluessel1, s2: schluessel2, b: Object.values(besch).reduce((a, n) => a + n, 0) });
    const hol = id => { const v = stand(); inboxClaim(id); const n = stand(); return { em: n.em - v.em, s1: n.s1 - v.s1, s2: n.s2 - v.s2, b: n.b - v.b }; };
    const abholen = x => { inboxAdd(x); return hol(inboxList().find(e => e.k === x.k).id); };
    const preise = [['woche', { mh: 0, em: 3000, s1: 2, s2: 1, besch: '1h' }], ['thron', { b: [['eventMuenzen', 500], ['schluessel1', 2], ['besch', 1, { dauer: '1h' }]] }], ['lager', { s1: 3 }]];
    const o = { mensch: [], selbst: [] };
    botById[X].mensch = true; window.WELT = new Proxy({}, { get: (q, k) => k === 'nachricht' ? (u, e) => post.push(JSON.parse(JSON.stringify(e))) : () => [] });
    try { preise.forEach(([src, pr], i) => evPreis(X, src, 'Test ' + src, pr, 'pt' + i)); } finally { window.WELT = w0; botById[X].mensch = false; }
    post.forEach((m, i) => { const x = evPreisFach(m); o.mensch.push({ src: m.src, hb: { em: m.em || 0, s1: m.s1 || 0, s2: m.s2 || 0, b: Object.values(m.besch || {}).reduce((a, n) => a + n, 0) }, got: x ? abholen(x) : null }); });
    preise.forEach(([src, pr], i) => { evPreis('player', src, 'Selbst ' + src, pr, 'ps' + i); });
    o.selbst = preise.map(([src]) => { const e = inboxList().find(x => x.title === 'Selbst ' + src); return e ? hol(e.id) : null; });
    return o;
  });
  const soll = [{ em: 3000, s1: 2, s2: 1, b: 1 }, { em: 500, s1: 2, s2: 0, b: 1 }, { em: 0, s1: 3, s2: 0, b: 0 }], S = JSON.stringify;
  r.mensch.forEach((m, i) => {
    ok(S(m.got) === S(soll[i]), 'echter Mitspieler, ' + m.src + ': abholen bringt genau den Preis (nicht doppelt)', { got: m.got, soll: soll[i] });
    ok(S(m.hb) === S(soll[i]), 'echter Mitspieler, ' + m.src + ': Hauptbuch (Felder der Nachricht) zählt dieselbe Menge', m.hb);
  });
  r.selbst.forEach((g, i) => ok(S(g) === S(soll[i]), 'eigener Spieler, Preis ' + (i + 1) + ': abholen bringt genau den Preis', { got: g, soll: soll[i] }));
  ok(r.mensch.length === 3 && r.selbst.length === 3, 'alle Preise angekommen', [r.mensch.length, r.selbst.length]);
  ok(fe.length === 0, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
