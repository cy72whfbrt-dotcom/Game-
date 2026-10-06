// Märsche: Knöpfe auf der Karte und Startbasis eines Angriffs (Vorschau, ohne Server) – auf dem Handy UND am Desktop:
// A) Späher auf der Karte antippen → hin „Zurück“ + „Schneller“, heim nur „Schneller“; Zurück = sofort umkehren, kein Bericht;
//    Schneller kostet Edelsteine, ab 500 erst „Wirklich?“ (zweiter Tipp zahlt)
// B) Angriff: vorausgewählt ist die nächste eigene Basis mit GENUG Truppen (keine hat genug → die mit den meisten;
//    nicht gespäht → die nächste mit Truppen); im Angriffsfenster mit einer Auswahl änderbar, der Angriff startet von dort
// C) Zuschauer: Späher-Befehle gehen an den Weltrechner (spaehen mit Kennung, zurueck, schneller)
// D) Weltrechner (WELT nachgebaut, leiter): schneller/zurueck finden den Späher über seine Kennung – zurück = kein Bericht
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const url = 'file://' + path.resolve(process.argv[2]) + '/index.html', fe = [];
  const seite = async (geraet, init) => { const p = await (await b.newContext(geraet)).newPage(); p.on('pageerror', e => fe.push(e.message));
    if (init) await p.addInitScript(init);
    await p.goto(url); await p.waitForTimeout(8000);
    await p.waitForFunction(() => typeof BOT_DEFS !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
    await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      const lange = Date.now() + 1e9; for (const d of BOT_DEFS) botNextAt[d.id] = lange; });   // (Mitspieler ruhig: keine fremden Angriffe dazwischen)
    return p; };
  const GERAETE = [['Handy', { ...devices['iPhone 13'] }], ['Desktop', { viewport: { width: 1280, height: 800 } }]];
  for (const [name, geraet] of GERAETE) {
    const p = await seite(geraet);
    // ===== A) Späher auf der Karte =====
    const a0 = await p.evaluate(() => {
      closeAllPopups(); gems = 5000; pendingScouts = []; pendingAttacks = []; pendingSends = []; pendingRetreats = [];
      const home = islandById[playerIslandId];
      const ziel = islands.filter(i => i.id !== home.id && !ownedIslands.has(i.id) && i.landmassId === home.landmassId).sort((x, y) => Math.hypot(x.x - home.x, x.y - home.y) - Math.hypot(y.x - home.x, y.y - home.y))[3];
      revealAround(ziel.x, ziel.y, 30000, false);
      launchScout(ziel.id);
      const sc = pendingScouts[0], now = Date.now(); sc.startedAt = now - 600000; sc.resolveAt = now + 600000;   // halb unterwegs, noch 10 Min.
      flyTo((sc && islandById[sc.sourceId].x + ziel.x) / 2, (islandById[sc.sourceId].y + ziel.y) / 2, { zoom: .02 });
      return { ziel: ziel.id, sc: !!sc, log: combatLog.length };
    });
    await p.waitForTimeout(1800);
    const tippe = async () => p.evaluate(() => { requestRender(); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => {
      const t = marchTokens.find(m => m.glyph === 'scout' && m.own && m.x !== undefined);
      if (!t) return r({ token: false });
      handleTap(t.x, t.y); requestRender();
      requestAnimationFrame(() => requestAnimationFrame(() => r({ token: true, sel: selMarch, knoepfe: marchBtnRects.map(x => x.act) })));
    }))); });
    const knopf = async act => p.evaluate(act => { const k = marchBtnRects.find(x => x.act === act); if (!k) return false; handleTap(k.x + k.w / 2, k.y + k.h / 2); return true; }, act);
    const a1 = await tippe();
    ok(a0.sc && a1.token, name + ': Späher läuft und steht auf der Karte', { a0, a1 });
    ok(a1.sel && a1.knoepfe && a1.knoepfe.includes('recall') && a1.knoepfe.includes('speed'), name + ': Späher (hin) antippen → „Zurück“ + „Schneller“', a1);
    const a2 = await p.evaluate(() => { const g = gems, sc = pendingScouts.find(s => !s.back), vor = sc ? sc.resolveAt - Date.now() : 0; return { g, vor }; });
    await knopf('speed'); await p.waitForTimeout(700);
    const a3 = await p.evaluate(a2 => { const sc = pendingScouts.find(s => !s.back); return { g: gems, bezahlt: a2.g - gems, rest: sc ? sc.resolveAt - Date.now() : 0 }; }, a2);
    ok(a3.bezahlt >= 1 && a3.bezahlt < 500 && Math.abs(a3.rest - a2.vor / 2) < 5000, name + ': „Schneller“ halbiert die Restzeit und kostet Edelsteine', { a2, a3 });
    await p.waitForTimeout(700);
    await knopf('recall'); await p.waitForTimeout(300);
    const a4 = await p.evaluate(ziel => ({ hin: pendingScouts.filter(s => !s.back).length, heim: pendingScouts.filter(s => s.back).length, bericht: combatLog.some(e => e.type === 'scout' && e.targetId === ziel && Date.now() - e.at < 60000) }), a0.ziel);
    ok(a4.hin === 0 && a4.heim === 1 && !a4.bericht, name + ': „Zurück“ → der Späher kehrt sofort um, kein Bericht', a4);
    const a5 = await tippe();
    ok(a5.sel && a5.knoepfe && !a5.knoepfe.includes('recall') && a5.knoepfe.includes('speed'), name + ': Späher (heim) antippen → nur „Schneller“', a5);
    // ab 500 Edelsteinen: erst „Wirklich?“
    await p.evaluate(() => { const sc = pendingScouts.find(s => s.back); if (!sc) return; const now = Date.now(); sc.startedAt = now - 60000; sc.resolveAt = now + 600 * 60000; });
    await p.waitForTimeout(700);
    const g0 = await p.evaluate(() => gems);
    await knopf('speed'); await p.waitForTimeout(200);
    const a6 = await p.evaluate(() => { requestRender(); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r({ g: gems, armed: gemsArmed('marsch:' + selMarch) })))); });
    await p.waitForTimeout(700); await knopf('speed'); await p.waitForTimeout(200);
    const a7 = await p.evaluate(() => { const sc = pendingScouts.find(s => s.back); return { g: gems, rest: sc ? Math.round((sc.resolveAt - Date.now()) / 60000) : -1 }; });
    ok(a6.g === g0 && a6.armed, name + ': ab 500 Edelsteinen erst „Wirklich?“ (nichts bezahlt)', { g0, a6 });
    ok(g0 - a7.g >= 500 && a7.rest > 280 && a7.rest < 320, name + ': zweiter Tipp zahlt und halbiert', { g0, a7 });

    // ===== B) Startbasis eines Angriffs =====
    const b0 = await p.evaluate(() => {
      closeAllPopups(); selMarch = null; pendingScouts = []; pendingAttacks = [];
      const home = islandById[playerIslandId], lm = home.landmassId;
      const frei = islands.filter(i => i.landmassId === lm && i.type === 'tower' && !ownedIslands.has(i.id) && !islandOwnerOf(i.id) && !bossAt(i.id) && i.id !== home.id);
      const T = frei[0], weg = i => Math.hypot(i.x - T.x, i.y - T.y);
      const rest = frei.filter(i => i !== T).sort((x, y) => weg(x) - weg(y));
      const A = rest[0], B = rest[1], C = rest[rest.length - 1];
      for (const i of [A, B, C]) { ownedIslands.add(i.id); islandLevels[i.id] = islandLevels[i.id] || 1; }
      for (const id of ownedIslands) islandTroops[id] = 0;
      revealAround(T.x, T.y, 40000, false); scoutedIslands.add(T.id);
      T.neutralTroops = Math.max(T.neutralTroops || 0, 1000);                // feste Stärke: ein leerer Turm (0 Truppen) ergäbe brauch = 1 und C bekäme 0 Truppen (Test flackerte)
      const brauch = effectiveTroops(T) + effectiveDefense(T);
      const wahl = () => { closeAllPopups(); openIslandPopup(T); attackBtn.click(); return previewSourceId; };
      const out = { T: T.id, A: A.id, B: B.id, C: C.id, brauch, weg: [weg(A), weg(B), weg(C)].map(Math.round) };
      islandTroops[A.id] = 1; islandTroops[B.id] = brauch * 3 + 10; islandTroops[C.id] = brauch * 30 + 10;
      out.genug = wahl();                                                  // B: die nächste mit genug (C hat mehr, liegt aber weiter weg)
      islandTroops[B.id] = Math.floor(brauch / 4); islandTroops[C.id] = Math.floor(brauch / 2);
      out.keine = wahl();                                                  // keine hat genug → die mit den meisten (C)
      scoutedIslands.delete(T.id);
      out.ungespaeht = wahl();                                             // nicht gespäht → die nächste mit Truppen (A)
      scoutedIslands.add(T.id); islandTroops[B.id] = brauch * 3 + 10;
      out.zurueck = wahl();
      const sel = document.getElementById('attackFromSel');
      out.sel = !!sel;
      if (sel) { const r = sel.getBoundingClientRect(); out.box = { h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), w: innerWidth, sichtbar: r.width > 0 && r.height > 0 };
        out.optionen = [...sel.options].map(o => +o.value); out.vorgewaehlt = +sel.value; out.texte = [...sel.options].map(o => o.textContent);
        sel.value = String(C.id); sel.dispatchEvent(new Event('change', { bubbles: true }));
        out.gewechselt = previewSourceId; out.kopf = popupSub.textContent.includes('Von ' + islandTitle(C)); }
      return out;
    });
    console.log(name, JSON.stringify(b0).slice(0, 700));
    ok(b0.genug === b0.B, name + ': Angriff → nächste Basis mit GENUG Truppen vorausgewählt (nicht die weit entfernte mit den meisten)', b0);
    ok(b0.keine === b0.C, name + ': keine Basis hat genug → die mit den meisten Truppen', b0);
    ok(b0.ungespaeht === b0.A, name + ': nicht gespäht → die nächste Basis mit Truppen', b0);
    ok(b0.sel && b0.vorgewaehlt === b0.B && JSON.stringify(b0.optionen) === JSON.stringify([b0.A, b0.B, b0.C]) && !b0.texte.some(t => /undefined|NaN|null/.test(t)), name + ': Angriffsfenster hat eine Auswahl „Von Basis“ (nächste zuerst, die vorausgewählte markiert)', b0);
    ok(b0.box && b0.box.sichtbar && b0.box.h >= 36 && b0.box.l >= 0 && b0.box.r <= b0.box.w, name + ': Auswahl gut bedienbar (sichtbar, mind. 36 px hoch, passt in die Breite)', b0.box);
    ok(b0.gewechselt === b0.C && b0.kopf, name + ': andere Basis gewählt → Fenster zeigt sie', b0);
    await p.waitForTimeout(500);
    const b1 = await p.evaluate(b0 => { attackBtn.click(); const a = pendingAttacks.find(x => !x.attackerBotId && x.targetId === b0.T); return a ? a.sourceId : null; }, b0);
    ok(b1 === b0.C, name + ': „Angreifen“ startet von der gewählten Basis', b1);
    await p.context().close();
  }

  // ===== C) Zuschauer: Befehle an den Weltrechner =====
  const pz = await seite({ ...devices['iPhone 13'] });
  const c = await pz.evaluate(() => {
    const w0 = window.WELT, bef = []; window.WELT = { leiter: false, ich: 'u999', befehl(art, d) { bef.push([art, JSON.parse(JSON.stringify(d))]); } };
    const out = {};
    try {
      gems = 5000; pendingScouts = [];
      const bot = BOT_DEFS.find(d => (botOwnedIslands[d.id] || new Set()).size), T = [...botOwnedIslands[bot.id]].find(id => !bossAt(id));
      revealAround(islandById[T].x, islandById[T].y, 30000, false);
      launchScout(T);
      const sc = pendingScouts.find(s => !s.back && s.targetId === T), k = sc && marchKeyOf(sc), sp = bef.find(x => x[0] === 'spaehen');
      out.spaehen = sp ? sp[1] : null; out.key = k;
      sc.startedAt = Date.now() - 600000; sc.resolveAt = Date.now() + 600000;
      speedUpMarch(k); const sb = bef.find(x => x[0] === 'schneller'); out.schneller = sb ? sb[1] : null;
      recallMarch(k); const zb = bef.find(x => x[0] === 'zurueck'); out.zurueck = zb ? zb[1] : null;
      out.heim = pendingScouts.filter(s => s.back).length;
    } catch (e) { out.err = e.message; } finally { window.WELT = w0; }
    return out;
  });
  console.log(JSON.stringify(c).slice(0, 500));
  ok(c.spaehen && c.spaehen.blick === 1 && c.spaehen.key === c.key, 'Zuschauer: Späher-Befehl trägt die Kennung des Marschs', c);
  ok(c.schneller && Array.isArray(c.schneller.keys) && c.schneller.keys[0] === c.key, 'Zuschauer: „Schneller“ beim Späher geht als Befehl an den Weltrechner', c);
  ok(c.zurueck && c.zurueck.key === c.key && c.heim === 1, 'Zuschauer: „Zurück“ beim Späher geht als Befehl an den Weltrechner, Späher kehrt um', c);

  // ===== D) Weltrechner nachgebaut =====
  const p2 = await seite({ ...devices['iPhone 13'] }, () => {
    window.__nachr = [];
    const W = { leiter: true, ich: 'u0', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      nachricht(an, e) { window.__nachr.push(e); }, bericht() {}, befehl() {}, profilZuBot(p, b) { return b; } };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
  });
  const d = await p2.evaluate(() => {
    const out = { befehle: !!(WELT.BEFEHLE && WELT.BEFEHLE.spaehen) }; if (!out.befehle) return out;
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size);
    const H = bots[0].id, B = bots.find(x => x.id !== H), T = [...botOwnedIslands[B.id]].find(id => !bossAt(id));
    const bs = loadBotState(); bs[H].hb = { v: 1, nbAlle: 1 }; saveBotState(); WELT.menschen[H] = {};
    const hb = () => loadBotState()[H].hb;
    WELT.BEFEHLE.spaehen(H, { ziel: T, blick: 1, key: 'sp1' });
    const e = (hb().sb || []).find(x => x[2] === 'sp1'); out.sb = e ? e.slice() : null;
    if (e) { const now = Date.now(); e[1] = now + 600000; e[3] = now - 600000; }
    WELT.BEFEHLE.schneller(H, { keys: ['sp1'], _nach: 1 });
    const e2 = (hb().sb || []).find(x => x[2] === 'sp1'); out.restMin = e2 ? Math.round((e2[1] - Date.now()) / 60000) : null;
    WELT.BEFEHLE.zurueck(H, { key: 'sp1' });
    out.wegNachZurueck = !(hb().sb || []).some(x => x[2] === 'sp1');
    if (hb().sb) hb().sb.push([T, Date.now() - 1, 'alt', Date.now() - 2000]);   // (ein anderer kommt an: Bericht wie immer)
    __nachr.length = 0; try { __weltVorPuls(); } catch (er) { out.puls = er.message; }
    out.berichte = __nachr.filter(x => x.art === 'spaeh' && x.ziel === T).length;
    WELT.BEFEHLE.spaehen(H, { ziel: T, ex: islandById[T].x, ey: islandById[T].y, key: 'er1' });   // Erkundung
    const f = (hb().sp || []).find(x => x[6] === 'er1'); out.sp = !!f;
    if (f) { const now = Date.now(); f[3] = now - 600000; f[4] = now + 600000; }
    WELT.BEFEHLE.schneller(H, { keys: ['er1'], _nach: 1 });
    const f2 = (hb().sp || []).find(x => x[6] === 'er1'); out.erRestMin = f2 ? Math.round((f2[4] - Date.now()) / 60000) : null;
    WELT.BEFEHLE.zurueck(H, { key: 'er1' });
    out.erWeg = !(hb().sp || []).some(x => x[6] === 'er1');
    return out;
  });
  console.log(JSON.stringify(d).slice(0, 500));
  ok(d.befehle, 'Weltrechner-Befehle da (WELT nachgebaut)');
  ok(d.sb && d.sb[2] === 'sp1', 'Weltrechner: Späher merkt sich die Kennung vom Handy', d);
  ok(d.restMin === 5, 'Weltrechner: „schneller“ halbiert die Restzeit des Spähers', d);
  ok(d.wegNachZurueck && d.berichte === 1, 'Weltrechner: „zurueck“ → dieser Späher bringt keinen Bericht (andere wie immer)', d);
  ok(d.sp && d.erRestMin === 5 && d.erWeg, 'Weltrechner: Erkundungs-Späher ebenso (schneller, zurück)', d);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
