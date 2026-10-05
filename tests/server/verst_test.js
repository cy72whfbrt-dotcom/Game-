// Verstärkung mit Server + Weltrechner: neuer Spieler H wird (Test: Weltrechner kurz aus, Welt-Eintrag) Mitglied eines Bündnisses,
// in dem ein Mitspieler eine echte Botschaft hat → schickt Verstärkung → kommt an (bleibt H's), Fremder sieht nichts, zurückholen
const G = require('./gemeinsam');
const { sql, php, warte, ok, ende, esc } = G;
const welt = k => JSON.parse(sql(`SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='${k}'`) || 'null');
let b; const fehler = [];
const rein = name => G.rein(b, name, { fehler });
(async () => {
  b = await G.browser();
  const HN = 'pruefer6';
  let h = await rein(HN); const HID = G.spielerId(HN);
  // Gastgeber: der nächste erreichbare Mitspieler (kein Mensch) in einem Bündnis – bekommt für den Test eine Botschaft Stufe 1
  const wahl = await h.evaluate(() => { const c = islandById[playerIslandId]; let best = null;
    for (const i of islands) { const w = islandOwnerOf(i.id); if (!w || w === 'player' || String(w).startsWith('u')) continue;
      const r = routeFor(c.landmassId, i.landmassId, 'player'); if (!r) continue; const tore = [];   // die Tore auf dem Weg (Test: gleich offen und ohne Maut)
      let unbesetzt = false; for (let k = 1; k < r.length; k++) { const g = gateOnRoute(r[k - 1], r[k]); if (g) { tore.push(g.id); if (!islandOwnerOf(g.id)) unbesetzt = true; } } if (unbesetzt) continue;   // (unbesetzte Tore sind zu – Spielregel)
      const t = travelDurationSeconds(c, i), a = bundVon(w); if (!best || t < best.t) best = { aid: a ? a.id : null, wirt: w, ziel: i.id, t, tore }; }
    return best || { leer: 1, cap: playerIslandId, lm: c && c.landmassId, inseln: islands.length, erreichbar: islands.filter(i => routeFor(c.landmassId, i.landmassId, 'player')).length, besitzer: islands.filter(i => islandOwnerOf(i.id)).length }; });
  ok('Mitspieler mit Botschaft gefunden', !!wahl && !wahl.leer, JSON.stringify(wahl)); if (!wahl || wahl.leer) throw new Error('keiner');
  await h.close();
  // Test-Abkürzung: H direkt ins Bündnis (Weltrechner aus, Welt-Eintrag, wieder an)
  php('$h = wr_herz(); wr_beenden((int)($h["pid"] ?? 0), "Test: Verstärkung");'); sql("UPDATE ow_welt_info SET leiter_bis = 0, leiter_token = ''");
  const gc = welt('openWaterGateCfg') || {}; for (const g of wahl.tore) gc[g] = Object.assign(gc[g] || {}, { closed: false, toll: 0 });
  sql(`UPDATE ow_spielstand SET wert='${esc(JSON.stringify(gc))}' WHERE spieler_id=0 AND schluessel='openWaterGateCfg'`);
  const bu = welt('openWaterBuendnisse');
  if (!wahl.aid) { wahl.aid = 'a' + (bu.n++); bu.b[wahl.aid] = { id: wahl.aid, name: 'Testhilfe', tag: 'THX', farbe: 0, zeichen: 0, anf: wahl.wirt, mit: [wahl.wirt], offen: false, at: Date.now(), anfragen: [], sig: [], log: [], gesch: { tag: '', n: {}, k: {} } }; }
  for (const x of Object.values(bu.b)) { x.mit = x.mit.filter(w => w !== 'u' + HID); if (x.anf === 'u' + HID) x.anf = x.mit[0]; }
  for (const k of Object.keys(bu.b)) if (!bu.b[k].mit.length) delete bu.b[k];
  bu.b[wahl.aid].mit.push('u' + HID); if (bu.b[wahl.aid].dabei) bu.b[wahl.aid].dabei['u' + HID] = Date.now();
  const z = JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='${wahl.wirt}'`)); z.city.levels.keep = Math.max(5, z.city.levels.keep || 0); z.city.levels.embassy = Math.max(1, z.city.levels.embassy || 0);
  sql(`UPDATE ow_bots SET zustand='${esc(JSON.stringify(z))}' WHERE spieler_id=0 AND bot_id='${wahl.wirt}'`);
  sql(`UPDATE ow_spielstand SET wert='${esc(JSON.stringify(bu))}' WHERE spieler_id=0 AND schluessel='openWaterBuendnisse'`);
  php('echo wachhund_neustart();'); await warte(60000);
  h = await rein(HN);
  console.log(G.geschenk(HID, 0, 500000)); await warte(6000);
  await h.evaluate(() => { for (const x of inboxList().slice()) inboxClaim(x.id); saveGame(); }); await warte(75000);   // Münzen für die Maut (Profil → Weltrechner)
  const zw = JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='${wahl.wirt}'`));
  ok('Gastgeber hat jetzt eine Botschaft (Welt)', (zw.city.levels.embassy || 0) >= 1, JSON.stringify(zw.city.levels));
  // Handy: die Botschaft anderer ist geheim (nur die Burg-Stufe kommt an) – trotzdem gibt es den Knopf „Verstärkung“ (Weltrechner prüft den Platz)
  ok('Handy kennt die fremde Botschaft nicht, bietet Verstärkung trotzdem an', await h.evaluate(w => verstUnbekannt(w) && verstMoeglich(w), wahl.wirt));
  ok('H ist im Bündnis', await h.evaluate(a => { const x = bundVon('player'); return !!x && x.id === a; }, wahl.aid));
  const r = await h.evaluate(z => { islandTroops[playerIslandId] = Math.max(islandTroops[playerIslandId] || 0, 0); const n = islandTroops[playerIslandId] || 0; bundWahl = { mode: 'hilfe', nach: z, f: Math.min(1, 500 / Math.max(1, n)), von: playerIslandId }; const aus0 = WELT.ausgang.length; const hint = []; const fh = window.flashHint; window.flashHint = t => { hint.push(t); return fh && fh(t); }; bundWahlLos(); window.flashHint = fh; return 'Truppen ' + n + ' · frei ' + Math.floor(verstFrei(islandOwnerOf(z))) + ' · Befehl ' + (WELT.ausgang.length > aus0) + ' · ' + hint.join(' / '); }, wahl.ziel);
  await warte(12000);
  const m = (welt('openWaterPendingSends') || []).find(x => x.senderBotId === 'u' + HID && x.verst);
  ok('Verstärkung marschiert (Welt)', !!m, m ? Math.round((m.resolveAt - Date.now()) / 1000) + ' s · ' + m.troops + ' Truppen' : 'Antwort: ' + r);
  if (m) await warte(Math.min(600000, Math.max(0, m.resolveAt - Date.now()) + 20000));
  const v = (welt('openWaterVerstaerkung') || { l: [] }).l.find(x => x.w === 'u' + HID);
  ok('angekommen: steht beim Gastgeber, gehört H', !!v && v.t === wahl.ziel && v.n >= 1, JSON.stringify(v));
  await warte(6000);
  ok('H sieht sie (Botschaft-Liste)', await h.evaluate(() => verst.l.some(x => x.w === 'player')));
  const f = await rein('pruefer5');
  ok('Fremder (anderes Bündnis) sieht sie nicht', await f.evaluate(id => !verst.l.some(x => x.id === id), v && v.id));
  if (v) { await h.evaluate(id => bundBefehl('verstZurueck', { vid: id }), v.id); await warte(12000);
    ok('zurückgeholt: nicht mehr stationiert', !(welt('openWaterVerstaerkung') || { l: [] }).l.some(x => x.id === v.id));
    ok('… marschiert heim', (welt('openWaterPendingSends') || []).some(x => x.senderBotId === 'u' + HID && x.back)); }
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende();
  await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
