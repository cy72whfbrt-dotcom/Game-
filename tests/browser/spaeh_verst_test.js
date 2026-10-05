// Verstärkung gegen den Kriegsherrn, im Spähbericht und in der Live-Schlacht; Spähbericht, der nie kommt (Vorschau, ohne Server):
// A) Kriegsherr: 5.000 eigene + 200.000 Verstärkung halten 100.000 – Verluste anteilig, die Helfer gehen nicht heil heim
// B) fightEstimate rechnet die Verstärkung mit (Live-Schlacht)
// C) Spähbericht: eigene Zeile „Verstärkung“; Ablehnung vom Weltrechner (fehl) und 10 Min. ohne Bericht → „Kein Bericht“
// D) Weltrechner (WELT nachgebaut, leiter): abgelehnter Späher → Nachricht fehl; Spähbericht bringt verst mit
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
const SCHLECHT = /undefined|NaN|\bnull\b|\[object|Infinity/;
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', fe = [];
  const seite = async init => { const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
    if (init) await p.addInitScript(init);
    await p.goto(url); await p.waitForTimeout(9000);
    await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof verst !== 'undefined', null, { timeout: 60000, polling: 500 }).catch(() => {});
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
    return p; };
  // Ziel: eine Basis eines Mitspielers (keine Hauptstadt), Helfer: ein anderer Mitspieler
  const wahl = () => {
    const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;
    const bots = BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size >= 1);
    const frei = id => !isCapital(id) && !bossAt(id) && islandById[id].type === 'tower';
    let B = bots.find(d => [...botOwnedIslands[d.id]].some(frei));
    if (!B) { B = bots[0]; const n = islands.find(i => !islandOwnerOf(i.id) && frei(i.id)); botOwnedIslands[B.id].add(n.id); islandLevels[n.id] = islandLevels[n.id] || 1; }   // (keine Nebenbasis: eine neutrale geben)
    const H = bots.find(d => d !== B), T = [...botOwnedIslands[B.id]].find(frei);
    const bs = loadBotState(); bs[B.id].shieldUntil = 0; bs[B.id].neuBis = 0; bs[B.id].city.levels.wall = 0; bs[B.id].skills.defense = 0; saveBotState();
    islandLevels[T] = 1;                                                                   // (kleine Abwehr: ohne Verstärkung fiele die Basis)
    for (let i = pendingAttacks.length - 1; i >= 0; i--) if (pendingAttacks[i].targetId === T) pendingAttacks.splice(i, 1);
    return { B: B.id, H: H.id, T, von: [...botOwnedIslands[H.id]][0] };
  };
  const p = await seite();
  const a = await p.evaluate(wahl.toString().replace(/^\(\) => /, '(() => ') + ')()').then(w => p.evaluate(w => {
    const out = { w };
    // A) Kriegsherr
    islandTroops[w.T] = 5000; verst.l = [{ id: 'vW', w: w.H, t: w.T, n: 200000, von: w.von, at: Date.now() }];
    const nachbar = islands.find(i => i.id !== w.T && i.landmassId === islandById[w.T].landmassId) || islands.find(i => i.id !== w.T), now = Date.now();
    wander = { wander: true, name: 'Probesturm', troops: 100000, defense: 15000, max: 100000, at: null, from: nachbar.id, to: w.T, departAt: now - 1000, arriveAt: now, campUntil: 0, endsAt: now + 1e7 };
    const def = effectiveDefense(islandById[w.T]);
    wanderArrive(now);
    const v = verst.l.find(x => x.id === 'vW');
    out.A = { besitzer: islandOwnerOf(w.T) === w.B, eigen: islandTroops[w.T], helfer: v ? v.n : 0, sturm: wander ? wander.troops : null, def };
    // B) Schätzung der Live-Schlacht
    islandTroops[w.T] = 5000; verst.l = [{ id: 'vE', w: w.H, t: w.T, n: 200000, von: w.von, at: Date.now() }];
    const atk = { sourceId: nachbar.id, targetId: w.T, rawTroops: 150000, attackerBotId: w.H, attackBonus: 0, atkTitle: 1, atkKraft: 1 };
    const mit = fightEstimate(atk); verst.l = []; const ohne = fightEstimate(atk);
    out.B = { mitEn: mit.en, mitWon: mit.won, ohneEn: ohne.en, ohneWon: ohne.won };
    // C) Spähbericht (Zuschauer): eigene Zeile, fehl, abgelaufen
    const fg = window.fremdGeheim; window.fremdGeheim = () => true;
    try {
      const sc = { sourceId: playerIslandId, targetId: w.T, startedAt: now - 2000, resolveAt: now - 1 };
      resolveScout(sc); const e1 = combatLog.find(e => e.type === 'scout' && e.targetId === w.T);
      out.C = { wartet: !!(e1 && e1.wartet) };
      spaehBericht({ art: 'spaeh', ziel: w.T, troops: 5000, defense: 1234, verst: 200000, spy: spaeherBlick(w.B) });
      out.C.verst = e1.verst;
      closeAllPopups(); battleLogBtn.click(); const log = document.getElementById('battleLogPopup').innerText;
      out.C.chip = /200\.000 Verstärkung|200K Verstärkung|200k Verstärkung/i.test(log);
      out.C.zeile = [...document.querySelectorAll('#battleLogPopup .logLine')].some(l => l.firstElementChild && /^Verstärkung/.test(l.firstElementChild.textContent) && l.lastElementChild.textContent.trim() === '200.000');
      out.C.schaetzung = verstSchaetzung(w.T).n;   // (Zuschauer kennt die Verstärkung nur aus dem Bericht)
      // Weltrechner lehnt ab → kein Bericht
      resolveScout(Object.assign({}, sc)); const e2 = combatLog.find(e => e.type === 'scout' && e.targetId === w.T);
      spaehBericht({ art: 'spaeh', ziel: w.T, fehl: 1 });
      out.C.fehl = !!(e2 !== e1 && e2.fehl && !e2.wartet);
      // 10 Min. ohne Bericht
      resolveScout(Object.assign({}, sc)); const e3 = combatLog.find(e => e.type === 'scout' && e.targetId === w.T);
      spaehAbgelaufen(Date.now() + 5 * 60000); const nochNicht = !!e3.wartet && !e3.fehl;
      spaehAbgelaufen(Date.now() + 11 * 60000);
      out.C.abgelaufen = nochNicht && !!e3.fehl && !e3.wartet;
      closeAllPopups(); battleLogBtn.click(); const log2 = document.getElementById('battleLogPopup').innerText;
      out.C.keinBericht = (log2.match(/kein Bericht/gi) || []).length >= 2;
      out.C.bad = log2.split('\n').filter(z => /undefined|NaN|\bnull\b|\[object|Infinity/.test(z)).slice(0, 5);
    } finally { window.fremdGeheim = fg; closeAllPopups(); }
    return out;
  }, w));
  console.log(JSON.stringify(a));
  ok(100000 > 5000 + a.A.def, 'Kriegsherr: ohne Verstärkung fiele die Basis (Probe sinnvoll)', a.A);
  ok(a.A.besitzer && a.A.eigen > 0 && a.A.eigen < 5000 && a.A.sturm === 35000, 'Kriegsherr: Verstärkung verteidigt mit – die Basis hält, der Besitzer verliert nur seinen Anteil', a.A);
  ok(a.A.helfer > 0 && a.A.helfer < 200000 && Math.abs((5000 - a.A.eigen) * 40 - (200000 - a.A.helfer)) <= 400, 'Kriegsherr: die Helfer verlieren ihren Anteil (nicht heil heim)', a.A);
  ok(a.B.mitEn === a.B.ohneEn + 200000 && !a.B.mitWon && a.B.ohneWon, 'fightEstimate: Verstärkung zählt in der Live-Schlacht mit', a.B);
  ok(a.C.wartet && a.C.verst === 200000, 'Spähbericht vom Weltrechner bringt die Verstärkung mit', a.C);
  ok(a.C.chip && a.C.zeile, 'Spähbericht: eigene Zeile „Verstärkung 200.000“', a.C);
  ok(a.C.schaetzung === 200000, 'Zuschauer: Live-Schlacht nimmt die Verstärkung aus dem Spähbericht', a.C.schaetzung);
  ok(a.C.fehl, 'Weltrechner lehnt ab (fehl) → „Kein Bericht“ statt für immer „wartet“', a.C);
  ok(a.C.abgelaufen && a.C.keinBericht, 'nach 10 Min. ohne Bericht → „Kein Bericht“', a.C);
  ok(!a.C.bad.length, 'Kampflog ohne kaputte Texte', a.C.bad);
  // D) Weltrechner nachgebaut: Befehle und Spähbericht
  const p2 = await seite(() => {
    window.__nachr = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht(an, e) { window.__nachr.push(e); }, bericht() {}, befehl() {}, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  const d = await p2.evaluate(wahl.toString().replace(/^\(\) => /, '(() => ') + ')()').then(w => p2.evaluate(w => {
    const out = { w, befehle: !!(WELT.BEFEHLE && WELT.BEFEHLE.spaehen) }; if (!out.befehle) return out;
    const bs = loadBotState(); bs[w.H].hb = { v: 1, nbAlle: 1 }; saveBotState();
    const eigen = [...botOwnedIslands[w.H]][0];
    __nachr.length = 0; WELT.BEFEHLE.spaehen(w.H, { ziel: eigen, blick: 1 });                 // eigene Basis: abgelehnt
    out.eigen = __nachr.find(e => e.art === 'spaeh' && e.ziel === eigen) || null;
    __nachr.length = 0; WELT.BEFEHLE.spaehen(w.H, { ziel: 999999, blick: 1 });                // kaputtes Ziel: abgelehnt (keine Nachricht – kein Ziel)
    out.kaputt = __nachr.length;
    __nachr.length = 0; WELT.BEFEHLE.spaehen(w.H, { ziel: eigen, ex: 1, ey: 1 });             // Erkundung (ohne blick): nie eine Nachricht
    out.erkundung = __nachr.length;
    islandTroops[w.T] = 5000; verst.l = [{ id: 'vS', w: w.H, t: w.T, n: 200000, von: w.von, at: Date.now() }];
    loadBotState()[w.H].hb.sb = [[w.T, Date.now() - 1]]; WELT.menschen[w.H] = {};
    __nachr.length = 0; try { __weltVorPuls(); } catch (e) { out.puls = e.message; }
    out.bericht = __nachr.find(e => e.art === 'spaeh' && e.ziel === w.T) || null;
    return out;
  }, w));
  console.log(JSON.stringify(d).slice(0, 600));
  ok(d.befehle, 'Weltrechner-Befehle da (WELT nachgebaut)');
  ok(d.eigen && d.eigen.fehl === 1, 'Weltrechner: Späher zur eigenen Basis abgelehnt → Nachricht fehl ans Handy', d.eigen);
  ok(d.kaputt === 0 && d.erkundung === 0, 'Weltrechner: ohne gültiges Ziel bzw. bei Erkundung keine Spähbericht-Nachricht', d);
  ok(d.bericht && d.bericht.verst === 200000 && !d.bericht.fehl, 'Weltrechner: Spähbericht mit Verstärkung (r.verst)', d.bericht);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
