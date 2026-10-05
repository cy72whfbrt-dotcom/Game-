// Verstärkung im Kampf (Vorschau, ohne Server): verteidigt mit, Verluste anteilig, Basis fällt → Verstärkung weg
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2];
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(d); }); }).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fehler = []; p.on('pageerror', e => fehler.push(e.message));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(b => !b.mensch && botOwnedIslands[b.id] && botOwnedIslands[b.id].size >= 1);
    const B = bots[0], H = bots[1], X = bots[2];
    const T = [...botOwnedIslands[B.id]].find(id => id !== botCapitalOf(B.id)) ?? [...botOwnedIslands[B.id]][0], S = [...botOwnedIslands[X.id]][0];
    const out = {};
    // 0) Ankunft: ein Verstärkungs-Marsch kommt an → stationiert (bleibt seine), nicht heim
    { const a0 = bundVon(B.id) || null; if (a0) bundOp(B.id, { op: 'verlassen' }); if (bundVon(H.id)) bundOp(H.id, { op: 'verlassen' }); botCoins[B.id] = 1e7;
      bundOp(B.id, { op: 'gruenden', name: 'Probehilfe', tag: 'PHX', offen: true }); bundOp(H.id, { op: 'beitreten', aid: bundVon(B.id).id });
      const hb0 = loadBotState()[B.id]; hb0.city.levels.keep = Math.max(5, hb0.city.levels.keep || 0); hb0.city.levels.embassy = Math.max(1, hb0.city.levels.embassy || 0); saveBotState();
      verst.l = []; const n0 = Date.now(); resolveSend({ fromId: [...botOwnedIslands[H.id]][0], toId: T, troops: 700, startedAt: n0 - 1000, resolveAt: n0, senderBotId: H.id, verst: 1 });
      const v0 = verst.l.find(v => v.w === H.id && v.t === T); out.ankunft = { stationiert: v0 ? v0.n : 0, heim: pendingSends.some(s => s.senderBotId === H.id && s.back && s.fromId === T) }; }
    // 1) Angriff scheitert: Verluste anteilig
    islandTroops[T] = 10000; verst.l = [{ id: 'vT', w: H.id, t: T, n: 10000, von: [...botOwnedIslands[H.id]][0], at: Date.now() }];
    { const hb = loadBotState()[H.id]; hb.city.levels.hospital = Math.max(10, hb.city.levels.hospital || 0); hb.wounded = 0; saveBotState(); }   // Helfer mit Lazarett und Platz
    out.lazarett = { stufe: botBld(H.id, 'hospital'), prozent: botHospitalPct(H.id), platz: botHospitalCapacity(H.id) };
    const hW0 = (loadBotState()[H.id] || {}).wounded || 0;
    const now = Date.now();
    resolveBotAttack({ sourceId: S, targetId: T, rawTroops: 8000, startedAt: now - 1000, resolveAt: now, attackerBotId: X.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 });
    const v1 = verst.l.find(v => v.id === 'vT');
    out.gescheitert = { besitzerVorher: 10000, besitzerNachher: islandTroops[T], helferVorher: 10000, helferNachher: v1 && v1.n, helferVerwundet: ((loadBotState()[H.id] || {}).wounded || 0) - hW0, besitzerNoch: islandOwnerOf(T) };
    // 1b) ungleich: Besitzer 9.000, Helfer nur 1.000 → Helfer verliert nur seinen Anteil (1/10)
    islandTroops[T] = 9000; verst.l = [{ id: 'vK', w: H.id, t: T, n: 1000, von: [...botOwnedIslands[H.id]][0], at: Date.now() }];
    resolveBotAttack({ sourceId: S, targetId: T, rawTroops: 8000, startedAt: now - 1000, resolveAt: now, attackerBotId: X.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 });
    const vk = verst.l.find(v => v.id === 'vK');
    out.ungleich = { besitzerVerlust: 9000 - islandTroops[T], helferVerlust: 1000 - (vk ? vk.n : 0), besitzerNoch: islandOwnerOf(T) === B.id };
    // 2) Angriff gewinnt: Basis fällt, Verstärkung ist weg
    islandTroops[T] = 1000; verst.l = [{ id: 'vU', w: H.id, t: T, n: 1000, von: [...botOwnedIslands[H.id]][0], at: Date.now() }];
    resolveBotAttack({ sourceId: S, targetId: T, rawTroops: 9e9, startedAt: now - 1000, resolveAt: now, attackerBotId: X.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 });
    out.erobert = { neuerBesitzer: islandOwnerOf(T), angreifer: X.id, hauptstadt: isCapital(T), garnison: islandTroops[T], verstUebrig: verst.l.filter(v => v.t === T).length };
    // 3) Kampf bricht nach der Eroberung ab (vor verstNachKampf): Aufräumen nimmt die überlebenden Angreifer nicht als Verteidiger-Rest
    { const T2 = [...botOwnedIslands[B.id]][0]; islandTroops[T2] = 500; verst.l = [{ id: 'vA', w: H.id, t: T2, n: 500, von: [...botOwnedIslands[H.id]][0], at: Date.now() }];
      const a3 = { targetId: T2, _vk: verstVorKampf(T2), _vkOwner: 'nicht-mehr-da' }; islandTroops[T2] = 3000;   // (Besitzer jetzt ein anderer, dort 3.000 Angreifer)
      kampfAufraeumen(a3); out.abbruch = { garnison: islandTroops[T2], verstUebrig: verst.l.filter(v => v.t === T2).length, vk: a3._vk === undefined && a3._vkOwner === undefined };
      islandTroops[T2] = 500; verst.l = [{ id: 'vB', w: H.id, t: T2, n: 500, von: [...botOwnedIslands[H.id]][0], at: Date.now() }];
      kampfAufraeumen({ targetId: T2, _vk: verstVorKampf(T2), _vkOwner: islandOwnerOf(T2) }); const vb = verst.l.find(v => v.id === 'vB');
      out.abbruchGehalten = { garnison: islandTroops[T2], helfer: vb ? vb.n : 0 }; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log((r.ankunft.stationiert === 700 && !r.ankunft.heim ? 'OK   ' : 'FEHLER ') + 'Ankunft: Verstärkung bleibt stationiert (läuft nicht heim) – ' + JSON.stringify(r.ankunft));
  const g = r.gescheitert;
  console.log((g.besitzerNachher === g.helferNachher && g.besitzerNachher < 10000 ? 'OK   ' : 'FEHLER ') + 'gescheitert: beide verlieren gleich viel (anteilig)');
  console.log((g.helferVerwundet > 0 && g.helferVerwundet < 10000 - g.helferNachher ? 'OK   ' : 'FEHLER ') + 'Helfer mit Lazarett: ein Teil seiner Verluste ist nur verwundet (in seinem Lazarett) – ' + g.helferVerwundet + ' von ' + (10000 - g.helferNachher));
  const u = r.ungleich; console.log((u.besitzerNoch && u.helferVerlust > 0 && u.helferVerlust < 1000 && Math.abs(u.besitzerVerlust - 9 * u.helferVerlust) <= 9 ? 'OK   ' : 'FEHLER ') + 'ungleich (9.000 + 1.000): Helfer verliert nur seinen Anteil');
  console.log(((r.erobert.neuerBesitzer === r.erobert.angreifer || (r.erobert.hauptstadt && r.erobert.garnison === 0)) && r.erobert.verstUebrig === 0 ? 'OK   ' : 'FEHLER ') + 'erobert: Verstärkung gefallen');
  console.log((r.abbruch.garnison === 3000 && r.abbruch.verstUebrig === 0 && r.abbruch.vk ? 'OK   ' : 'FEHLER ') + 'Abbruch nach Eroberung: Angreifer bleiben, Verstärkung gefallen – ' + JSON.stringify(r.abbruch));
  console.log((r.abbruchGehalten.garnison === 500 && r.abbruchGehalten.helfer === 500 ? 'OK   ' : 'FEHLER ') + 'Abbruch ohne Eroberung: Besatzung und Verstärkung wieder getrennt – ' + JSON.stringify(r.abbruchGehalten));
  console.log('Fehler:', fehler.length ? fehler : 'keine'); await b.close(); srv.close();
})();
