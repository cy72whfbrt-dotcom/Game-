// Hacker in der Browser-Konsole (Alexander 11.10.: „Münzen hacken darf im echten Spiel nicht passieren“). Drei neue Spieler:
//   H (Hacker) ändert Münzen, Gems, Rohstoffe, Stufe, Schlüssel, Beschleuniger, Event-Münzen, Ausrüstung, Gebäude, Forschung,
//     Fähigkeiten, Rangliste-Zahlen, zweiten Bauarbeiter direkt im Spiel und schickt gefälschte/doppelte Befehle und Anfragen
//   T holt die Tutorial-Belohnung (100 Gems) und das Forschungs-Geschenk (Rohstoffe) mehrmals (Tutorial in der Konsole zurückgesetzt)
//   Z (Zeuge, ehrlich) bekommt ein Admin-Geschenk und kauft damit den zweiten Bauarbeiter – keine Hinweise, keine Korrektur
// Geprüft wird: nichts Erfundenes kommt in die Welt oder zu anderen Spielern, und das Handy des Hackers (= sein Spielstand beim
// Server) wird nach ~2 Min. zurückgesetzt (Nachricht „korrektur“ vom Weltrechner).
const G = require('./gemeinsam');
const { sql, warte, bis, ok, ende } = G;
const RUNDE = 75000;   // Profil (10 s) → Weltrechner → Welt in der Datenbank (höchstens jede Minute gespeichert)
const welt = uid => JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='u${uid}'`) || '{}');
const weltMuenzen = uid => { const v = JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterBotCoins'") || '{}'); return +(v['u' + uid] || 0); };
const stand = (uid, k) => sql(`SELECT wert FROM ow_spielstand WHERE spieler_id=${uid} AND schluessel='${k}'`);
const auff = (uid, was) => G.schummelListe().filter(x => x.uid === uid && (!was || x.was === was)).reduce((a, x) => a + x.anzahl, 0);
const bereit = p => p.waitForFunction(() => window.WELT && WELT.pulse >= 2 && typeof inboxList === 'function', null, { timeout: 90000 });
const handy = p => p.evaluate(() => ({ coins, gems, lvl: playerLvl, res: AUF.rohVon('player'), em: eventMuenzen, s1: schluessel1, s2: schluessel2, bm: beschMinuten(), korr: window.__korr || 0 }));
const korrZaehlen = p => p.evaluate(() => { window.__korr = 0; WELT.beiNachricht.push(e => { if (e && e.art === 'korrektur') window.__korr++; }); });
let b;
(async () => {
  b = await G.browser(); const fehler = [], t = Date.now().toString(36).slice(-5);
  const neu = async (name, anzeige) => { const p = await G.rein(b, name, { neu: true, fehler, warte: 0 }); await bereit(p); await bis(() => p.evaluate(() => !!document.getElementById('wkName')), 15000); await G.willkommen(p, anzeige); await korrZaehlen(p); return p; };
  const pH = await neu('hack' + t, 'Hacker'), pT = await neu('tuto' + t, 'Wiederholer'), pZ = await neu('zeug' + t, 'Zeuge');
  const H = G.spielerId('hack' + t), T = G.spielerId('tuto' + t), Z = G.spielerId('zeug' + t);
  console.log(G.geschenk(Z, 600, 0));                    // Z: Gems für den zweiten Bauarbeiter (500), wie von Alexander geschenkt
  await bis(() => pZ.evaluate(() => inboxList().length > 0), 30000);
  await pZ.evaluate(() => { for (const x of inboxList().slice()) inboxClaim(x.id); });
  await warte(RUNDE);
  await bis(() => [H, T, Z].every(u => ((welt(u).res || {}).h || 0) > 0 && !!welt(u).hb), 120000);   // (der Weltrechner kennt alle drei)
  const cap = await pH.evaluate(() => playerIslandId), tr = () => +(JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterIslandTroops'") || '{}')[cap] || 0);
  const w0 = welt(H), tr0 = tr(), hT0 = await handy(pT), z0 = await handy(pZ);
  ok('ehrlicher Start: keine Schummel-Hinweise', !auff(H) && !auff(T) && !auff(Z), JSON.stringify(G.schummelListe().filter(x => [H, T, Z].includes(x.uid))));
  // 1) wie im Bericht: localStorage + Neuladen in einer Zeile
  await pH.evaluate(() => { localStorage.setItem('openWaterCoins', 999999999); location.reload(); }).catch(() => {});
  await bereit(pH); await korrZaehlen(pH);
  // 2) + 3) direkt im laufenden Spiel ändern und speichern lassen
  await pH.evaluate(() => {
    coins += 5e8; gems += 1e6; const r = AUF.rohVon('player'); r.h += 1e7; r.s += 1e7; r.e += 1e7; AUF.rohSpeichern();
    playerLvl = 80; skills.attack = 50;
    schluessel1 += 500; schluessel2 += 50; besch['24h'] = (besch['24h'] || 0) + 100; eventMuenzen += 1e6; gegenstSpeichern();
    const id = 'x' + nextItemId++; inventory[id] = { id, slot: 'weapon', rarity: 5, level: 20, stars: 5 }; equippedItems.weapon = id;
    throneState.earned = 1e9; saveThrone(); playerStats.captures = 1e6; store.set('openWaterStats', JSON.stringify(playerStats));
    const c = loadCity(); c.levels.forge = 5; c.levels.hospital = 20; c.fo = Object.assign(c.fo || {}, { w_prod: 10, m_atk: 10 });
    c.builder2 = true; saveCity();                       // 5) zweiter Bauarbeiter ohne zu bezahlen
    saveGame(); saveProgression(); updateHud();
  });
  // 4) gefälschte Befehle und Anfragen direkt an server.php
  await pH.evaluate(cap => { WELT.befehl('truppen', { q: 'geschenk', n: 1e9 }); WELT.befehl('truppen', { q: 'stufe', von: 1, bis: 400, n: 1e9 });
    WELT.befehl('truppen', { q: 'fund', n: 1e7 }); WELT.befehl('ausbau', { insel: cap, stufe: 99 }); WELT.befehl('senden', { von: cap, nach: cap + 1, n: 1e12 }); }, cap);
  const roh = await pH.evaluate(async () => {
    const schick = befehle => fetch('server.php', { method: 'POST', headers: { 'X-Open-Water': '1', 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ aktion: 'puls', token: window.__OW.token, seit: 0, befehle }) }).then(r => r.json()).then(a => a.befehle_ok || []).catch(e => 'Fehler ' + e.message);
    const cid = 'hackDoppelt' + Date.now().toString(36);
    return { fremd: await schick([{ art: 'gold', n: 5, cid: 'hackGold' + Date.now().toString(36) }, { art: 'truppen', q: 'fund', n: -5, cid: 'hackMinus' + Date.now().toString(36) },
      { art: 'truppen', q: 'fund', n: 1e40, cid: 'hackRiesig' + Date.now().toString(36) }, { art: 'truppen', q: 'fund', n: '1e9', cid: 'hackText' + Date.now().toString(36) }]),
      doppelt: [await schick([{ art: 'truppen', q: 'fund', n: 50, cid }]), await schick([{ art: 'truppen', q: 'fund', n: 50, cid }])], cid };
  });
  ok('Server nimmt keine unbekannten Befehle und keine kaputten Zahlen an', Array.isArray(roh.fremd) && !roh.fremd.length && !+sql(`SELECT COUNT(*) FROM ow_befehle WHERE spieler_id=${H} AND art='gold'`), JSON.stringify(roh.fremd));
  ok('doppelt gesendeter Befehl (gleiche Nummer) liegt nur einmal da', +sql(`SELECT COUNT(*) FROM ow_befehle WHERE spieler_id=${H} AND cid='${roh.cid}'`) === 1, JSON.stringify(roh.doppelt));
  // 6) Tutorial mehrmals: einmal ehrlich, dann 20-mal in der Konsole zurückgesetzt (Belohnung 100 Gems, Forschungs-Geschenk Rohstoffe)
  const tutRoh = await pT.evaluate(() => {
    const d = AUF.FORSCHUNG.find(x => x.aka === 1), k = AUF.foKosten(d, 1), gib = () => tutGeschenk('f', 'Geschenk', [['holz', k.h || 0], ['stein', k.s || 0], ['eisen', k.e || 0]].filter(x => x[1] > 0));
    tut.belohnt = false; tutEnde(); gib();
    for (let i = 0; i < 20; i++) { tut.belohnt = false; tut.g.f = 0; tutEnde(); gib(); }
    beuteFensterZu(); saveGame(); return k;
  });
  // Z (ehrlich): kauft den zweiten Bauarbeiter wie im Spiel (cityBuyBuilder2: 500 Gems weg, builder2 an)
  await pZ.evaluate(() => { const c = loadCity(); gems -= CITY_BUILDER2_GEMS; c.builder2 = true; saveCity(); saveGame(); updateHud(); });
  // Warten: Korrektur frühestens nach 2 Min. (Profil zeigt es so lange), dann eine Nachricht bis zum Handy
  await bis(async () => { const h = await handy(pH), x = await handy(pT); return h.korr > 0 && h.coins < 5e8 && h.gems < 1e5 && h.lvl < 10 && h.res.h < 1e6 && h.s1 < 100 && x.korr > 0; }, 6 * 60000, 3000);
  await warte(20000);   // (Speichern beim Server, Welt in der Datenbank)
  await bis(() => !!welt(Z).hb && !!welt(Z).hb.b2, RUNDE);
  const h1 = await handy(pH), w1 = welt(H), hb = w1.hb || {}, gg = hb.gg || {};
  // ---- H: nichts davon in der Welt ----
  ok('Welt: erfundene Münzen nicht', weltMuenzen(H) < 5e7, weltMuenzen(H));
  ok('Welt: Stufe, Fähigkeiten, Waffe, Forschung, Schmiede/Krankenhaus nicht', (w1.lvl || 1) < 10 && Object.values(w1.skills || {}).reduce((a, v) => a + v, 0) <= 3 && !(w1.gear && w1.gear.weapon && w1.gear.weapon.r >= 5)
    && !((w1.city && w1.city.fo) || {}).w_prod && !((w1.city || {}).levels || {}).forge && (((w1.city || {}).levels || {}).hospital || 0) < 5, JSON.stringify({ lvl: w1.lvl, sk: w1.skills, gear: w1.gear, city: w1.city }));
  ok('Welt: Holz/Stein/Eisen nicht', ['h', 's', 'e'].every(k => ((w1.res || {})[k] || 0) < 1e6), JSON.stringify(w1.res));
  ok('Welt: Eroberungen und Thron-Punkte (Rangliste) nicht', ((w1.stats || {}).caps || 0) < 1000 && ((w1.stats || {}).tpEarned || 0) < 1e6, JSON.stringify(w1.stats));
  ok('Hauptbuch: erfundene Schlüssel, Beschleuniger, Event-Münzen nicht', (gg.s1 || 0) < 100 && (gg.s2 || 0) < 10 && (gg.bm || 0) < 1000 && (gg.em || 0) < 1e5 && (hb.bMin || 0) < 1000, JSON.stringify({ gg, bMin: hb.bMin }));
  ok('Hauptbuch: zweiter Bauarbeiter nicht ohne die 500 Gems', !hb.b2, JSON.stringify({ b2: hb.b2 }));
  ok('Welt: geschenkte Truppen nur im Rahmen (keine Mrd.)', tr() - tr0 < 1e6, tr0 + ' → ' + tr());
  ok('Ausbau auf Stufe 99 nicht', (JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterIslandLevels'") || '{}')[cap] || 1) < 10);
  const zs = await pZ.evaluate(id => { const x = loadBotState()['u' + id] || {}; return { lvl: x.lvl, caps: (x.stats || {}).caps || 0, tp: (x.stats || {}).tpEarned || 0, forge: ((x.city || {}).levels || {}).forge || 0 }; }, H);
  ok('andere Spieler sehen nichts davon (Stufe, Eroberungen, Thron-Punkte)', (zs.lvl || 1) < 10 && zs.caps < 1000 && zs.tp < 1e6 && !zs.forge, JSON.stringify(zs));
  // ---- H: sein Handy und sein Spielstand beim Server sind zurückgesetzt ----
  ok('Handy: Münzen, Gems, Stufe, Rohstoffe zurückgesetzt', h1.coins < 5e8 && h1.gems < 1e5 && h1.lvl < 10 && ['h', 's', 'e'].every(k => h1.res[k] < 1e6), JSON.stringify(h1));
  ok('Handy: Schlüssel, Beschleuniger, Event-Münzen zurückgesetzt', h1.s1 < 100 && h1.s2 < 10 && h1.bm < 1000 && h1.em < 1e5, JSON.stringify(h1));
  ok('Spielstand beim Server: Münzen/Gems zurückgesetzt (auch nach Neuladen)', +stand(H, 'openWaterCoins') < 5e8 && +stand(H, 'openWaterGems') < 1e5, stand(H, 'openWaterCoins') + ' · ' + stand(H, 'openWaterGems'));
  ok('… und der Admin sieht Hinweise', auff(H, 'muenzen') && auff(H, 'gems') && auff(H, 'hauptbuch'), JSON.stringify(G.schummelListe().filter(x => x.uid === H).map(x => x.was + ':' + x.anzahl)));
  // ---- T: Tutorial-Belohnung nur einmal ----
  const hT = await handy(pT), wT = welt(T);
  ok('Tutorial 21× abgeholt: Handy behält nur einmal die 100 Gems (+ Spielraum)', hT.gems - hT0.gems < 200 && hT.korr > 0, hT0.gems + ' → ' + hT.gems + ' · Korrekturen ' + hT.korr);
  ok('Tutorial-Rohstoffe 21×: höchstens die Hälfte bleibt (einmal + Spielraum, Welt + Handy)', ['h', 's', 'e'].every(k => !(tutRoh[k] > 0) || (hT.res[k] - hT0.res[k] < 10.5 * tutRoh[k] && ((wT.res || {})[k] || 0) - hT0.res[k] < 10.5 * tutRoh[k])), JSON.stringify({ geschenk: tutRoh, vorher: hT0.res, handy: hT.res, welt: wT.res }));
  // ---- Z: ehrlicher Spieler – keine Hinweise, keine Korrektur, sein Bauarbeiter zählt ----
  const z1 = await handy(pZ);
  ok('ehrlich: zweiter Bauarbeiter (gekauft) zählt im Hauptbuch', !!(welt(Z).hb || {}).b2);
  ok('ehrlich: keine Schummel-Hinweise, keine Korrektur, Gems bleiben', !auff(Z) && !z1.korr && z1.gems >= z0.gems - 500, JSON.stringify({ auff: G.schummelListe().filter(x => x.uid === Z), korr: z1.korr, gems: z0.gems + ' → ' + z1.gems }));
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende();
  await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
