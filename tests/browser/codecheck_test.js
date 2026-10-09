// Code-Check (9.10.): Abholfach (Rest ohne Gegenstände, Stapel nur Münzen/Edelsteine), Späher ohne Weltrechner nicht beschleunigbar,
// „Truppen sammeln“ zahlt nur, wenn jemand losgeht, kein Angriff/Senden auf falsche Basis, ganze Truppen, Rally/Rückweg nicht
// zurückrufbar, ohne Zuhause keine Truppen weg, Lager-Beute = Tages-Rest, Lager-Grenzen in barbSend, Forschung aufräumen speichert.
const { chromium } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html', { timeout: 120000 });
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof islandById !== 'undefined' && islandById[playerIslandId], null, { timeout: 90000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(2000);
  const ev = (f, a) => p.evaluate(f, a).catch(e => ({ fehler: e.message }));

  // 1) Abholfach ohne Basis: Truppen bleiben, Gegenstände nur einmal
  const a = await ev(() => { const alt = rewardBaseId; window.rewardBaseId = () => null;
    try { inboxAdd({ src: 'thron', tr: 100, b: [['coins', 7]] }); const x = inboxList()[0], c0 = coins; inboxClaim(x.id); const rest = inboxList()[0];
      return { erst: coins - c0, restTr: rest && rest.tr, restB: rest && rest.b ? rest.b.length : 0 }; } finally { window.rewardBaseId = alt; } });
  ok(a.erst === 7 && a.restTr === 100 && !a.restB, 'Abholfach ohne Basis: Truppen bleiben liegen, Gegenstände nicht noch einmal', a);
  // 9) Kampfbeute mit Truppen stapelt nicht in einen Eintrag (sonst Truppen weg)
  const st = await ev(() => { inboxState = []; inboxAdd({ src: 'fight', gems: 3 }); inboxAdd({ src: 'fight', tr: 50 }); inboxAdd({ src: 'fight', gems: 2 });
    const L = inboxList(); return { n: L.length, tr: L.reduce((s, x) => s + (x.tr || 0), 0), gems: L.reduce((s, x) => s + (x.gems || 0), 0) }; });
  ok(st.n === 2 && st.tr === 50 && st.gems === 5, 'Abholfach: Truppen eigener Eintrag, Edelsteine stapeln', st);

  // 3) Zuschauer: Späher, den der Weltrechner nicht kennt (Rückweg) – kein Knopf, keine Gems weg
  const sp = await ev(() => { const altW = window.WELT; window.WELT = { leiter: false, befehl() {}, ich: 'u1' };
    try { const now = Date.now(), sc = { sourceId: playerIslandId, targetId: playerIslandId, startedAt: now, resolveAt: now + 600000, back: true }; pendingScouts.push(sc);
      gems = 1000; const k = marchKeyOf(sc), knopf = /data-mact="speed"/.test(marchButtons(sc, false)), inAlle = speedableMarches().includes(sc); speedUpZuletzt = 0; speedUpMarch(k);
      const r = { knopf, inAlle, gems }; pendingScouts.splice(pendingScouts.indexOf(sc), 1); return r; } finally { window.WELT = altW; } });
  ok(!sp.knopf && !sp.inAlle && sp.gems === 1000, 'Zuschauer: Späher ohne Weltrechner nicht beschleunigbar', sp);

  // eine zweite eigene Basis und ein fremdes/neutrales Ziel in der Nähe
  const z = await ev(() => { const cap = islandById[playerIslandId], d = i => Math.hypot(i.x - cap.x, i.y - cap.y);
    const nah = islands.filter(i => i.id !== playerIslandId && i.type === 'tower' && i.landmassId === cap.landmassId && !islandOwnerOf(i.id)).sort((x, y) => d(x) - d(y));
    return nah.length > 1 ? { eigen: nah[0].id, fremd: nah[1].id } : null; });
  // 5) eigene Basis (nicht Hauptstadt) ist kein Angriffsziel; Senden nur zur eigenen Basis
  const an = await ev(z => { ownedIslands.add(z.eigen); ownVer++; islandTroops[playerIslandId] = 5000; const n0 = pendingAttacks.length, s0 = pendingSends.length;
    const r1 = launchAttack(playerIslandId, z.eigen, null, 100), r2 = launchSend(playerIslandId, z.fremd, null, 100);
    const r = { angriffEigen: r1, nAtt: pendingAttacks.length - n0, sendFremd: r2, nSend: pendingSends.length - s0 };
    pendingAttacks.length = n0; pendingSends.length = s0; return r; }, z);
  ok(z && an.angriffEigen === false && an.nAtt === 0 && !an.sendFremd && an.nSend === 0, 'kein Angriff auf eigene Basis, kein Senden zu fremder Basis', an);
  // 7) ganze Truppen, kaputte Zahl schickt keine
  const gz = await ev(z => { islandTroops[playerIslandId] = 5000; const n0 = pendingAttacks.length, s0 = pendingSends.length;
    const rs = launchSend(playerIslandId, z.eigen, null, 10.7), sTr = pendingSends.length > s0 ? pendingSends[pendingSends.length - 1].troops : null;
    const rn = launchSend(playerIslandId, z.eigen, null, NaN), sN = pendingSends.length - s0;
    const ra = launchAttack(playerIslandId, z.eigen, null, NaN); pendingAttacks.length = n0; pendingSends.length = s0; islandTroops[playerIslandId] = 5000;
    return { rs, sTr, rn, sN, ra }; }, z);
  ok(gz.rs === true && gz.sTr === 10 && gz.rn === false && gz.sN === 1 && !gz.ra, 'ganze Truppen (10,7 → 10), NaN schickt keine; launchSend meldet true/false', gz);
  // 4) „Truppen sammeln“: geht keiner los, kostet es nichts
  const rc = await ev(z => { const altS = recallSources, altL = launchSend; window.recallSources = () => [z.eigen]; window.launchSend = () => false;
    try { gems = 1000; popupIslandId = playerIslandId; confirmRecall(); return { gems }; } finally { window.recallSources = altS; window.launchSend = altL; } }, z);
  ok(rc.gems === 1000, '„Truppen sammeln“: keiner losgegangen → keine Edelsteine weg', rc);
  // 8) offline: Rally und Rückweg nicht zurückrufbar
  const rl = await ev(z => { const now = Date.now(), m = { sourceId: playerIslandId, targetId: z.fremd, rawTroops: 10, startedAt: now, resolveAt: now + 600000, attackerBotId: null, rally: 'x' };
    pendingAttacks.push(m); const r0 = pendingRetreats.length; recallMarch(marchKeyOf(m)); const r = { noch: pendingAttacks.includes(m), rueck: pendingRetreats.length - r0 };
    pendingAttacks.splice(pendingAttacks.indexOf(m), 1); return r; }, z);
  ok(rl.noch && rl.rueck === 0, 'Rally kann nicht zurückgerufen werden (offline)', rl);
  // 6) ohne Zuhause: Rückweg wartet statt Truppen zu verlieren
  const oh = await ev(z => { const alt = rewardBaseId; window.rewardBaseId = () => null;
    try { const r = { fromId: z.fremd, toId: z.fremd, troops: 77, startedAt: Date.now() - 1000, resolveAt: Date.now() }; resolveRetreat(r);
      const da = pendingRetreats.includes(r); if (da) pendingRetreats.splice(pendingRetreats.indexOf(r), 1); return { da }; } finally { window.rewardBaseId = alt; } }, z);
  ok(oh.da, 'ohne eigene Basis: Rückmarsch wartet, Truppen bleiben', oh);
  await ev(z => { ownedIslands.delete(z.eigen); ownVer++; }, z);

  // 10) Lager: Beute = Rest bis zur Tagesgrenze, Schlüssel-Text; barbSend prüft Freischaltung selbst
  const lg = await ev(() => { const cap = islandById[playerIslandId], rec = barbRec('player'); rec.m = LAGER_GRENZE.m - 1000; rec.k1 = 0; rec.k2 = 0; rec.b = 1;
    const c = { id: 'cc_test', L: 20, t: 100, max: 100, x: cap.x + 50, y: cap.y + 50, lm: cap.landmassId }; barbState.camps.push(c);
    barbView = { kind: 'camp', id: c.id }; const h = barbSheetHtml(), m = /Beute<\/span><b>([^<]*)</.exec(h);
    islandTroops[playerIslandId] = 5000; const n0 = barbMarches.length, s = barbSend('player', playerIslandId, 'c', c.id, 100);
    barbMarches.length = n0; barbState.camps.splice(barbState.camps.indexOf(c), 1); barbView = null; return { beute: m && m[1], s }; });
  ok(lg.beute === '1.000 Münzen · Schlüssel + Epischer Schlüssel' && lg.s === false, 'Lager: Beute = Tages-Rest, beide Schlüssel genannt; Stufe 20 gesperrt auch in barbSend', lg);

  // 11) Forschung, die es nicht mehr gibt: aufgeräumt wird gespeichert
  const fo = await ev(() => { const c = loadCity(), alt = saveCity; let n = 0; window.saveCity = () => { n++; alt(); };
    try { c.foRun = { id: 'gibtsnicht', to: 1, startedAt: 0, endsAt: 1 }; c.levels.academy = 30; foSperre('player', AUF.FORSCHUNG[0]); return { leer: !c.foRun, n }; } catch (e) { return { fehler: e.message }; } finally { window.saveCity = alt; } });
  ok(fo.leer && fo.n >= 1, 'alte Forschung entfernt und gespeichert', fo);

  ok(!fe.length, 'keine Seitenfehler', fe);
  await b.close();
})();
