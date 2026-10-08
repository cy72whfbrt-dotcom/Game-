// Verteidigungs-Helden über die Mauer (Alexander 6.10.), Vorschau ohne Server:
// A) Mitspieler mit Mauer 3 und eingetragenem Helden: seine Basis verteidigt mit ihm (effectiveDefense + Zeile „Held …“),
//    der Zweitheld zählt erst ab Mauer 5 (zu 50 %), eintragen unter Mauer 5 wird abgelehnt
// B) Held unterwegs (Angriff läuft): er verteidigt nicht – zurück: wieder
// C) Kampf: der Verteidigungs-Held steht im Kampfbericht (defGear.hx), weniger gefallene Verteidiger (Verluste −X %)
// D) Spähbericht zeigt den Verteidigungs-Held mit Werten, Summe der Teile = effectiveDefense
// E) Mitspieler stellen selbst einen ein (botHeroCare) · F) Mauer-Fenster: du trägst Haupt- und Zweitheld ein, deine Basen
//    verteidigen mit ihm · G) Weltrechner: Befehl „vheld“ (eigener Held, Mauer-Stufe) – fremde Helden abgelehnt
// Bilder (Mauer-Fenster, Spähbericht) nur, wenn ein Ordner als 2. Argument kommt.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', bilder = process.argv[3] || null, fe = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => fe.push(e.message));
  await p.addInitScript(() => {
    window.__befehle = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht() {}, befehl(art, d) { window.__befehle.push([art, d]); }, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(9000);
  await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof verst !== 'undefined', null, { timeout: 60000, polling: 500 }).catch(() => {});
  await p.evaluate(() => { const c = loadCity(); c.levels.heroes = Math.max(1, c.levels.heroes || 0); saveCity(); for (const s of Object.values(loadBotState())) if (s && s.city) s.city.levels.heroes = Math.max(1, s.city.levels.heroes || 0); });   // Helden erst mit Heldenhalle (Merkliste 21)
  await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  const a = await p.evaluate(() => {
    const out = {}, lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange;
    const bots = BOT_DEFS.filter(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size >= 1);
    const frei = id => !isCapital(id) && !bossAt(id) && islandById[id].type === 'tower';
    let B = bots.find(d => [...botOwnedIslands[d.id]].some(frei));
    if (!B) { B = bots[0]; const n = islands.find(i => !islandOwnerOf(i.id) && frei(i.id)); botOwnedIslands[B.id].add(n.id); islandLevels[n.id] = 1; }
    const T = [...botOwnedIslands[B.id]].find(frei), bs = loadBotState(), s = bs[B.id], isl = islandById[T];
    s.shieldUntil = 0; s.neuBis = 0; s.city.levels.wall = 3;
    for (const id of ['brunhild', 'sigrun']) s.hs[id] = { sh: 0, q: 12, own: true, sk: [0, 3, 0, 0], rage: 0 };
    s.vh = ['brunhild', 'sigrun']; saveBotState(); vhMem = null;
    islandLevels[T] = 10; islandTroops[T] = 40000; verst.l = [];
    for (let i = pendingAttacks.length - 1; i >= 0; i--) if (pendingAttacks[i].attackerBotId === B.id || pendingAttacks[i].targetId === T) pendingAttacks.splice(i, 1);
    armies = armies.filter(x => x.who !== B.id);
    out.B = B.id; out.T = T;
    const ohne = () => { const v = s.vh; s.vh = null; vhMem = null; const d = effectiveDefense(isl); s.vh = v; vhMem = null; return d; };
    // A) Mauer 3: nur der Hauptheld
    let fx = vhFx(B.id);
    out.A = { id: fx && fx.id, id2: fx && fx.id2 || null, atk: fx && fx.atk, loss: fx && fx.loss, gef: fx && fx.gef, mit: effectiveDefense(isl), ohne: ohne(), plus: vhPlus(fx, 40000),
      teil: (defenseParts(isl).find(q => /^Held /.test(q[0])) || null) };
    out.A.zweitNein = vhSetzen(B.id, 'brunhild', 'sigrun');                 // unter Mauer 5: abgelehnt
    s.vh = ['brunhild', 'sigrun']; s.city.levels.wall = 5; vhMem = null; fx = vhFx(B.id);
    out.A.m5 = { id: fx && fx.id, id2: fx && fx.id2 || null, atk: fx && fx.atk, h2: fx && fx.h2 && fx.h2.id };
    out.A.zweitJa = vhSetzen(B.id, 'brunhild', 'sigrun');
    s.city.levels.wall = 3; vhMem = null;
    // B) Held unterwegs: ein laufender Angriff mit Brunhild
    const zielB = islands.find(i => !islandOwnerOf(i.id) && i.type === 'tower');
    const atk = { sourceId: T, targetId: zielB.id, rawTroops: 10, attackerBotId: B.id, hero: 'brunhild', startedAt: Date.now(), resolveAt: Date.now() + 1e8 };
    pendingAttacks.push(atk); vhMem = null;
    out.B1 = { fx: vhFx(B.id), def: effectiveDefense(isl), ohne: ohne() };
    pendingAttacks.splice(pendingAttacks.indexOf(atk), 1); vhMem = null;
    out.B2 = { id: (vhFx(B.id) || {}).id, def: effectiveDefense(isl) };
    // C) Kampf: du greifst mit wenigen Truppen an und verlierst
    fx = vhFx(B.id); const vor = islandTroops[T], my = 3000;
    try { resolveAttack({ sourceId: playerIslandId, targetId: T, rawTroops: my, attackBonus: 0, atkTitle: 1, atkKraft: 1, startedAt: Date.now() - 1000, resolveAt: Date.now(), shieldLossReductionPct: 0, rewardGoldRate: 0 }); } catch (x) { out.kampfFehler = x.message; }
    const k = combatLog.find(x => x.type === 'attack' && x.targetId === T);
    out.C = { loss: fx.loss, fall: k && k.defenderCasualties, erwartet: Math.round(Math.min(vor, my) * (1 - fx.loss / 100)), hx: k && k.defGear && k.defGear.hx && k.defGear.hx.id, vh: k && k.defGear && k.defGear.hx && k.defGear.hx.vh,
      teil: k && (k.defParts || []).some(q => /^Held Brunhild/.test(q[0])), weg: vor - islandTroops[T] };
    closeAllPopups(); battleLogBtn.click();
    let row = [...combatLogListEl.children][combatLog.indexOf(k)];
    out.C.text = row ? row.textContent.replace(/\s+/g, ' ') : '';
    // D) Spähbericht
    islandTroops[T] = 40000; vhMem = null;
    resolveScout({ sourceId: playerIslandId, targetId: T, startedAt: Date.now() - 2000, resolveAt: Date.now() - 1 });
    const e = combatLog.find(x => x.type === 'scout' && x.targetId === T), sp = e && e.spy || {};
    out.D = { vh: sp.vh && sp.vh.id, lines: sp.vh && sp.vh.lines, va: sp.k && sp.k.va, summe: (sp.teile || []).reduce((x, q) => x + q[1], 0), def: e && e.defense, eff: effectiveDefense(isl), teil: (sp.teile || []).some(q => /^Held Brunhild/.test(q[0])) };
    closeAllPopups(); battleLogBtn.click();
    row = [...combatLogListEl.children][combatLog.indexOf(e)]; const det = row && row.querySelector('details'); if (det) det.open = true;
    out.D.text = row ? row.textContent.replace(/\s+/g, ' ') : '';
    out.D.held = row ? [...row.querySelectorAll('.logHero:not(.kl-keinheld) b')].map(x => x.textContent) : [];
    // E) Mitspieler stellt selbst einen ein
    const C = bots.find(d => d !== B && botBld(d.id, 'wall') >= 0), sc = bs[C.id]; sc.city.levels.wall = 6; sc.vh = null;
    for (const id of ['hagen', 'otto']) sc.hs[id] = Object.assign(sc.hs[id] || {}, { own: true, q: 4, sk: [0, 0, 0, 0], sh: 0, rage: 0 });
    botHeroCare(C); out.E = { vh: sc.vh, own: !!(sc.vh && heroOwned(C.id, sc.vh[0])), own2: !!(sc.vh && heroOwned(C.id, sc.vh[1])), fx: !!vhFx(C.id) };
    // F) Mauer-Fenster: du trägst ein
    const c = loadCity(); c.levels.wall = 5; c.vh = null; saveCity(); vhMem = null;
    const hz = loadHeroes(); for (const id of ['brunhild', 'sigrun']) Object.assign(hz[id], { own: true, q: 8 }); saveHeroes();
    out.F = { vor: effectiveDefense(islandById[playerIslandId]) };
    closeAllPopups(); openCity(); cityOpenId = 'wall'; cityPage = 'bau'; renderCitySheet();
    const box = () => document.querySelector('#cityBExtra [data-vh-box]'), sh = document.getElementById('citySheet');
    out.F.reiter = [...document.querySelectorAll('#cityTabs [data-cpage]')].map(x => x.textContent);   // wie Krankenhaus/Schmiede: Aufwerten | Helden
    document.querySelector('#cityTabs [data-cpage="nutz"]').click();
    out.F.box = !!box() && getComputedStyle(document.getElementById('cityBExtra')).display !== 'none'; __befehle.length = 0; WELT.leiter = false;   // (wie ein Handy: der Befehl geht an den Weltrechner)
    out.F.chips = box() ? box().querySelectorAll('[data-vh-auf]').length : 0; out.F.zuVorher = !box().querySelector('[data-vh1]');   // zu: nur die zwei Chips
    const auf = k => { const c = box() && box().querySelector('[data-vh-auf="' + k + '"]'); if (c) c.click(); };
    auf(1); out.F.auf = box().querySelectorAll('[data-vh1]').length;
    const k1 = box() && box().querySelector('[data-vh1="brunhild"]'); if (k1) k1.click();
    out.F.zuNach = !box().querySelector('[data-vh1]');
    auf(2); const k2 = box() && box().querySelector('[data-vh2="sigrun"]'); if (k2) k2.click();
    WELT.leiter = true; out.F.vh = loadCity().vh; vhMem = null; out.F.nach = effectiveDefense(islandById[playerIslandId]);
    out.F.befehle = __befehle.filter(x => x[0] === 'vheld');
    out.F.text = box() ? box().textContent.replace(/\s+/g, ' ') : '';
    return out;
  });
  console.log(JSON.stringify(a).slice(0, 2500));
  const A = a.A || {};
  ok(A.id === 'brunhild' && !A.id2 && A.atk > 0 && A.loss > 0, 'Mauer 3: Brunhild verteidigt, ohne Zweitheld', A);
  ok(A.mit - A.ohne === A.plus && A.plus > 0 && A.teil && A.teil[1] === A.plus, 'Verteidigung der Basis: + Held (Angriff % der Besatzung + Gefolge), eigene Zeile „Held Brunhild“', A);
  ok(A.zweitNein === false && A.zweitJa === true && A.m5 && A.m5.id2 === 'sigrun' && A.m5.atk > A.atk, 'Zweitheld erst ab Mauer 5 (dann zu 50 % dabei)', A.m5);
  ok(a.B1 && (!a.B1.fx || a.B1.fx.id !== 'brunhild') && a.B1.def === a.B1.ohne && a.B2.id === 'brunhild' && a.B2.def === A.mit, 'Held unterwegs verteidigt nicht – zurück verteidigt er wieder', { B1: a.B1, B2: a.B2 });
  const C = a.C || {};
  ok(!a.kampfFehler && C.hx === 'brunhild' && C.vh === 1 && C.teil, 'Kampfbericht: Verteidigungs-Held mit Zeile und Werten', C);
  ok(C.fall === C.erwartet && C.fall < Math.min(3000, 40000) && C.weg === C.fall, 'abgewehrt: weniger gefallene Verteidiger (Verluste −' + C.loss + ' %)', C);
  ok(/Verteidigungs-Held/.test(C.text || '') && /Brunhild/.test(C.text || ''), 'Kampfbericht-Anzeige: „Verteidigungs-Held“ Brunhild', (C.text || '').slice(0, 300));
  const D = a.D || {};
  ok(D.vh === 'brunhild' && D.va > 0 && D.teil && D.summe === D.def && D.def === D.eff, 'Spähbericht: Verteidigungs-Held, Werte, Summe der Teile = Verteidigung', D);
  ok(D.held && D.held.some(x => /Brunhild/.test(x)) && !/zählen beim Verteidigen nicht/.test(D.text || ''), 'Spähbericht-Anzeige zeigt Brunhild (kein „zählt nicht“)', { held: D.held, text: (D.text || '').slice(0, 300) });
  ok(a.E && a.E.own && a.E.own2 && a.E.fx, 'Mitspieler stellt selbst Verteidigungs-Helden ein (Haupt- und Zweitheld)', a.E);
  const F = a.F || {};
  ok(F.box && F.vh && F.vh[0] === 'brunhild' && F.vh[1] === 'sigrun' && F.nach > F.vor, 'Mauer-Fenster: Haupt- und Zweitheld eingetragen, deine Basis verteidigt stärker', F);
  ok(F.befehle && F.befehle.length === 2 && F.befehle[1][1].h1 === 'brunhild' && F.befehle[1][1].h2 === 'sigrun', 'Befehl „vheld“ an den Weltrechner', F.befehle);
  ok(/Verteidigungs-Helden/.test(F.text || '') && /Brunhild/.test(F.text || ''), 'Mauer-Fenster zeigt den Stand', (F.text || '').slice(0, 200));
  ok(F.reiter && F.reiter.length === 2 && /Helden/.test(F.reiter[1]) && F.chips === 2 && F.zuVorher && F.zuNach, 'Mauer-Fenster: Reiter „Helden“, zwei Chips, antippen klappt die Auswahl auf (nach der Wahl zu)', F);
  await p.waitForTimeout(1500);   // (openCity zeigt die Stadt verzögert und schließt dabei das Fenster: danach neu öffnen)
  let L = {};
  for (let i = 0; i < 10 && !L.offen; i++) { await p.evaluate(() => { cityOpenId = 'wall'; cityPage = 'nutz'; vhAuf = 1; renderCitySheet(); }); await p.waitForTimeout(500);   // (unter Last zeigt openCity die Stadt später: bis das Fenster offen ist)
  L = await p.evaluate(() => { const sh = document.getElementById('citySheet'), rs = sh.getBoundingClientRect(), kb = [...document.querySelectorAll('[data-vh-box] [data-vh1]')];
    const r = { n: kb.length, offen: !sh.hidden && rs.width > 0, passt: kb.every(x => { const q = x.getBoundingClientRect(); return q.width > 40 && q.left >= rs.left + 14 && q.right <= rs.right - 14; }),   // nichts rechts abgeschnitten
      rahmen: getComputedStyle(sh, '::before').content === 'none' && /url/.test(getComputedStyle(sh).borderImageSource),   // der Rahmen ist der Rand: scrollt nicht mit
      kopfOben: Math.round(document.querySelector('.city-sheet-head').getBoundingClientRect().top - rs.top), scrollTop: sh.scrollTop, inhalt: sh.scrollHeight, hoch: sh.clientHeight };
    r.werteRuhen = !document.querySelector('[data-vh-box] .vh-werte'); r.kopf = r.kopfOben >= 0 && r.scrollTop === 0 && r.inhalt <= r.hoch + 1; return r; }); }   // Reiter „Helden“ passt ohne Scrollen
  ok(F.box && F.auf > 1 && L.n > 1 && L.offen && L.passt && L.rahmen && L.kopf && L.werteRuhen, 'Mauer-Fenster: Auswahl passt in die Breite, Rahmen fest, Kopf sichtbar, kein Scrollen (Werte ruhen, solange die Auswahl offen ist)', L);
  await p.evaluate(() => { vhAuf = 0; renderCitySheet(); });
  ok(/Angriff der Verteidiger/.test(F.text || '') && /Eigene Verluste/.test(F.text || ''), 'Werte verständlich: „Angriff der Verteidiger“, „Eigene Verluste“', (F.text || '').slice(0, 300));
  const zu = () => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    document.querySelectorAll('body > div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }); flashHint('', 1); };   // (Willkommen-Fenster der nachgebauten Welt)
  if (bilder) { await p.evaluate(zu); await p.waitForTimeout(2500); await p.evaluate(() => { cityOpenId = 'wall'; cityPage = 'nutz'; vhAuf = 0; renderCitySheet(); flashHint('', 1); });
    await p.waitForTimeout(400); await p.screenshot({ path: path.join(bilder, 'mauer_fenster.png') });
    await p.evaluate(() => { vhAuf = 2; renderCitySheet(); flashHint('', 1); }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(bilder, 'mauer_fenster_auf.png') });
    await p.evaluate(() => { cityPage = 'bau'; vhAuf = 0; renderCitySheet(); const sh = document.getElementById('citySheet'); sh.scrollTop = sh.scrollHeight; });
    await p.waitForTimeout(300); await p.screenshot({ path: path.join(bilder, 'mauer_aufwerten.png') }); }
  // G) Weltrechner: Befehl vheld (echter Spieler = Mitspieler mit mensch)
  const g = await p.evaluate(() => {
    const out = {}; if (!WELT.BEFEHLE || !WELT.BEFEHLE.vheld) { out.fehlt = 1; return out; }
    const M = BOT_DEFS.find(d => !d.mensch && botOwnedIslands[d.id] && botOwnedIslands[d.id].size), s = loadBotState()[M.id];
    M.mensch = true; WELT.menschen[M.id] = {}; s.city.levels.wall = 3; s.vh = null;
    s.hs.ida = Object.assign(s.hs.ida || {}, { own: true, q: 4, sk: [0, 0, 0, 0] }); s.hs.lene = Object.assign(s.hs.lene || {}, { own: true, q: 4, sk: [0, 0, 0, 0] }); s.hs.ragna = Object.assign(s.hs.ragna || {}, { own: false });
    WELT.BEFEHLE.vheld(M.id, { h1: 'ida', h2: 'lene' }); out.unter5 = s.vh;          // Zweitheld unter Mauer 5: abgelehnt
    WELT.BEFEHLE.vheld(M.id, { h1: 'ida' }); out.haupt = s.vh && s.vh.slice();
    WELT.BEFEHLE.vheld(M.id, { h1: 'ragna' }); out.fremd = s.vh && s.vh.slice();      // hat er nicht: bleibt Ida
    s.city.levels.wall = 5; WELT.BEFEHLE.vheld(M.id, { h1: 'ida', h2: 'lene' }); out.m5 = s.vh && s.vh.slice();
    vhMem = null; out.fx = (vhFx(M.id) || {}).id2 || null;
    return out;
  });
  ok(!g.fehlt && g.unter5 === null && g.haupt[0] === 'ida' && g.fremd[0] === 'ida' && g.m5[1] === 'lene' && g.fx === 'lene', 'Weltrechner: Befehl „vheld“ prüft eigenen Held und Mauer-Stufe', g);
  if (bilder) {
    await p.evaluate(zu); await p.evaluate(() => { closeAllPopups(); closeCity(); battleLogBtn.click(); document.querySelector('#battleTabs [data-ktab="berichte"]').click(); const e = combatLog.find(x => x.type === 'scout'); const row = [...combatLogListEl.children][combatLog.indexOf(e)];
      const sm = row && row.querySelector('details summary'); if (sm) sm.click(); });
    await p.waitForTimeout(600); await p.evaluate(() => { const h = [...document.querySelectorAll('.logGearHeroes')].find(x => x.offsetParent && /Brunhild/.test(x.textContent)); if (h) h.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(400); await p.screenshot({ path: path.join(bilder, 'spaehbericht.png') });
  }
  // H) Kriegsherr (die Invasion gibt es nicht mehr): der Verteidigungs-Held zählt wie bei jedem Angriff (weniger Verluste)
  const h = await p.evaluate(([B, T]) => {
    const out = {}, s = loadBotState()[B], von = islands.find(i => i.id !== T && !islandOwnerOf(i.id)).id;
    s.shieldUntil = 0; s.city.levels.wall = 3; s.vh = ['brunhild', null]; saveBotState(); verst.l = [];
    const neu = () => { islandTroops[T] = 40000; vhMem = null; return vhFx(B); };
    let fx = neu(); out.loss = fx && fx.loss;
    try { wander = { wander: true, name: 'Kriegsherr', troops: 3000, defense: 450, max: 3000, at: von, from: von, to: T, arriveAt: Date.now() }; wanderArrive(Date.now()); } catch (x) { out.fehlerK = x.message; }
    out.K = { weg: 40000 - islandTroops[T], erwartet: Math.round(3000 * (1 - fx.loss / 100)) };
    return out;
  }, [a.B, a.T]);
  ok(!h.fehlerK && h.loss > 0 && h.K.weg === h.K.erwartet, 'Kriegsherr abgewehrt: weniger gefallene Verteidiger (Verteidigungs-Held, Verluste −' + h.loss + ' %)', h);
  ok(!fe.length, 'keine Seitenfehler', fe.slice(0, 3));
  await b.close();
})();
