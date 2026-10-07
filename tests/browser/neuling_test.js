// Anfängerschutz (Alexander 7.10., Variante B): 48 Std. kann niemand einen Neuling angreifen UND niemand ihn ausspähen
// (Spieler, Mitspieler, Weltrechner). Er endet früher bei 100.000 Truppen (Gesamttruppen wie im HUD) – die alte Grenze
// 50 Mio. Macht gilt nicht mehr. Vorschau ohne Server, WELT nachgebaut (Weltrechner).
// A) Mitspieler X will einen geschützten Mitspieler Y ausspähen → botLearn sagt nein, kein Späher unterwegs
// B) Du spähst Y aus → kein Späher, Hinweis „Anfängerschutz – noch … (oder bis 100.000 Truppen)“; Angreifen ebenso gesperrt
// C) Y bekommt 100.000 Truppen → Schutz vorbei (neuBis 0), Späher geht los
// D) Du: Schutz steht, Schild-Fenster zeigt „bis 100.000 Truppen“; mit 100.000 Truppen ist er vorbei
// E) Weltrechner-Befehl „spaehen“ eines echten Spielers zu einem Neuling → abgelehnt (Nachricht fehl)
const { chromium, devices } = require('playwright'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof botLearn === 'function' && islands.length && islandById[playerIslandId] && BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size).length >= 2, null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });

  const r = await ev(() => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;   // (keiner zieht nebenher)
    const nachrichten = [];
    window.WELT = new Proxy({ leiter: true, menschen: {}, nachricht(id, n) { nachrichten.push(n); } }, { get: (o, k) => k in o ? o[k] : () => {} });
    window.spaeherWeg = () => true;                                                  // (kein Tor im Weg)
    const hints = []; window.flashHint = t => hints.push(t);
    const mit = BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size), X = mit[0], Y = mit[1];
    let yt = [...botOwnedIslands[Y.id]].find(id => islandById[id].type === 'tower' && !bossAt(id));
    if (yt === undefined) { yt = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id)).id; botOwnedIslands[Y.id].add(yt); }   // (frische Welt: Y bekommt einen Turm)
    const bs = loadBotState(); bs[X.id].neuBis = 0; bs[X.id].shieldUntil = 0; bs[Y.id].shieldUntil = 0; bs[Y.id].neuBis = Date.now() + 10 * 3600000; saveBotState();
    for (const id of botOwnedIslands[Y.id]) islandTroops[id] = 100;                 // weit unter 100.000 Truppen
    const lm = islandById[yt].landmassId, out = { Y: Y.id };
    // A) Mitspieler X späht Y aus
    out.aLearn = botLearn(X.id, yt, Date.now() + 5000, lm);
    out.aUnterwegs = botScouting(X, yt);
    // B) du spähst Y aus / greifst an
    const vorher = pendingScouts.length; launchScout(yt);
    out.bNeu = pendingScouts.length - vorher; out.bHint = hints[hints.length - 1] || '';
    out.bAngriff = baseShieldedFor(yt, 'player'); out.bText = shieldBlockText(Y.id);
    return out;
  });
  ok(r.aLearn === false && !r.aUnterwegs, 'A) Mitspieler späht einen Neuling nicht aus (botLearn → nein)', r);
  ok(r.bNeu === 0 && /Anfängerschutz – noch/.test(r.bHint) && /100\.000 Truppen/.test(r.bHint), 'B) Du kannst einen Neuling nicht ausspähen – Hinweis mit Restzeit', r);
  ok(r.bAngriff && /Anfängerschutz – noch/.test(r.bText), 'B) Angreifen gesperrt, Hinweis „Anfängerschutz – noch …“', r.bText);

  await ev(Y => { islandTroops[[...botOwnedIslands[Y]].find(id => islandById[id].type === 'tower' && !bossAt(id))] = 100000; }, r.Y);
  await p.waitForTimeout(1500);                                                      // (Truppen werden höchstens einmal pro Sekunde neu gezählt)
  const c = await ev(Y => {
    const yt = [...botOwnedIslands[Y]].find(id => islandById[id].type === 'tower' && !bossAt(id));
    const X = BOT_DEFS.find(d => !d.mensch && d.id !== Y);
    const aktiv = neulingAktiv(Y), neuBis = loadBotState()[Y].neuBis;
    return { aktiv, neuBis, learn: botLearn(X.id, yt, Date.now() + 5000, islandById[yt].landmassId), angriff: baseShieldedFor(yt, 'player') };
  }, r.Y);
  ok(!c.aktiv && c.neuBis === 0 && c.learn !== false && !c.angriff, 'C) 100.000 Truppen: Schutz vorbei, Ausspähen und Angreifen gehen', c);

  const d = await ev(() => {
    store.set('openWaterShield', '0'); shieldMemAt = 0;
    for (const id of ownedIslands) islandTroops[id] = 10;
    store.set('openWaterNeulingBis', String(Date.now() + 20 * 3600000));
    const vor = { aktiv: neulingAktiv('player'), schild: ownerShielded('player') };
    renderShieldState(); vor.text = (document.getElementById('shieldState') || {}).textContent || '';
    return vor;
  });
  ok(d.aktiv && d.schild && /Anfängerschutz – noch/.test(d.text) && /bis 100\.000 Truppen/.test(d.text), 'D) Dein Anfängerschutz steht, Anzeige „… (oder bis 100.000 Truppen)“', d);
  await ev(() => { islandTroops[playerIslandId] = 100000; });
  await p.waitForTimeout(1500);
  const d2 = await ev(() => ({ aktiv: neulingAktiv('player'), gespeichert: store.get('openWaterNeulingBis') }));
  ok(!d2.aktiv && d2.gespeichert === '0', 'D) Mit 100.000 Truppen ist dein Anfängerschutz vorbei', d2);

  // E) Weltrechner nachgebaut (vor dem Laden): ein echter Spieler schickt einen Späher zu einem Neuling → abgelehnt
  await p.close(); const p2 = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p2.on('pageerror', x => fe.push(x.message));
  await p2.addInitScript(() => {
    window.__nachr = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht(an, x) { window.__nachr.push(x); }, bericht() {}, befehl() {}, profilZuBot(q, x) { return x; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  await p2.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 90000 }); await p2.waitForTimeout(9000);
  await p2.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && islands.length && window.WELT && WELT.BEFEHLE, null, { timeout: 60000, polling: 500 }).catch(() => {});
  const e = await p2.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && [...(botOwnedIslands[x.id] || [])].some(id => !bossAt(id)));
    const H = bots[0].id, Z = bots[1].id, T = [...botOwnedIslands[Z]].find(id => !bossAt(id));
    window.spaeherWeg = () => true; window.nbKennt = () => true;
    const bs = loadBotState(); bs[H].hb = { v: 1, nbAlle: 1 }; bs[Z].neuBis = Date.now() + 5 * 3600000; bs[Z].shieldUntil = 0; saveBotState(); WELT.menschen[H] = {};
    for (const id of botOwnedIslands[Z]) islandTroops[id] = 100;
    __nachr.length = 0; WELT.BEFEHLE.spaehen(H, { ziel: T, blick: 1, key: 'n1' });
    return { fehl: __nachr.some(x => x.art === 'spaeh' && x.fehl), unterwegs: (loadBotState()[H].hb.sb || []).some(x => x[2] === 'n1') };
  });
  ok(e.fehl && !e.unterwegs, 'E) Weltrechner lehnt den Späher eines echten Spielers zum Neuling ab', e);
  ok(!fe.length, 'keine Seitenfehler', fe);
  await b.close();
})().catch(e => { console.log('FEHLER Absturz', e.message); process.exit(1); });
