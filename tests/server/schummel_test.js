// Schummel-Schutz (5.10.): ein verändertes Handy versucht die Tricks, die der Weltrechner jetzt stoppt – und ein ehrlicher
// Spieler bekommt dabei keine falschen Hinweise. Geprüft wird, was danach IN DER WELT steht (nur das zählt für alle anderen).
//   Münzen erfinden · Rohstoffe erfinden (ohne Markt) · Fähigkeiten umverteilen ohne die Gems · Gebäude-Stufe ohne Bauzeit
const G = require('./gemeinsam');
const { sql, warte, ok, ende } = G;
let UID = 0;
const zustand = () => JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='u${UID}'`) || '{}');
const muenzen = () => { const v = JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterBotCoins'") || '{}'); return +(v['u' + UID] || 0); };
const auff = was => { const e = G.schummelListe().find(x => x.uid === UID && x.was === was); return e ? e.anzahl : 0; };
const RUNDE = 75000;   // Profil (10 s) → Weltrechner → Hauptbuch in der Welt (höchstens jede Minute gespeichert)
let b;
(async () => {
  b = await G.browser(); const fehler = [];
  const NAME = 'schum' + Date.now().toString(36).slice(-5);
  const p = await G.rein(b, NAME, { neu: true, fehler });
  await G.willkommen(p, 'Schummeltest');
  UID = G.spielerId(NAME);
  // ehrlich: die Start-Punkte verteilen (1 Fähigkeit) – der Weltrechner merkt sich das
  await p.evaluate(() => { const k = Object.keys(skills)[0]; if (skillPoints > 0) { skills[k] = (skills[k] || 0) + 1; skillPoints--; } saveGame(); saveProgression(); });
  await warte(RUNDE);
  const z0 = zustand(), c0 = muenzen(), sk0 = JSON.stringify(z0.skills || {}), lv0 = (z0.city && z0.city.levels) || {};
  ok('ehrlicher Start: keine Schummel-Hinweise', !G.schummelListe().some(x => x.uid === UID), JSON.stringify(G.schummelListe().filter(x => x.uid === UID)));
  // 1) Münzen erfinden: +100 Mio. auf dem Handy
  await p.evaluate(() => { coins += 1e8; saveGame(); });
  // 2) Rohstoffe erfinden: +5 Mio. Holz ohne Markt-Kauf
  await p.evaluate(() => { const r = AUF.rohVon('player'); r.h += 5e6; AUF.rohSpeichern(); saveGame(); });
  // 3) Fähigkeiten umverteilen ohne die Gems (Punkt von der ersten auf die zweite Fähigkeit)
  await p.evaluate(() => { const ks = Object.keys(skills), a = ks.find(k => skills[k] > 0), z = ks.find(k => k !== a); if (a && z) { skills[a]--; skills[z] = (skills[z] || 0) + 1; } gems = Math.min(gems, 20); saveGame(); saveProgression(); });
  // 4) Gebäude-Stufe ohne Bauzeit (Labor drei Stufen höher, Gems weg – Beschleunigen ginge also nicht)
  await p.evaluate(() => { const c = loadCity(); c.levels.academy = (c.levels.academy || 0) + 3; saveCity(); gems = 0; saveGame(); });
  await warte(RUNDE + 60000);   // (Hauptbuch: Hinweise erst nach 2 Min. im Profil)
  const z1 = zustand(), c1 = muenzen(), lv1 = (z1.city && z1.city.levels) || {};
  ok('erfundene Münzen kommen nicht in die Welt', c1 < c0 + 5e7, Math.round(c0) + ' → ' + Math.round(c1));
  ok('erfundenes Holz kommt nicht in die Welt', !(z1.res && z1.res.h >= 5e6), JSON.stringify(z1.res));
  ok('Fähigkeiten ohne Gems umverteilt: es gelten die alten', JSON.stringify(z1.skills || {}) === sk0, sk0 + ' → ' + JSON.stringify(z1.skills || {}));
  ok('Labor ohne Bauzeit: Stufe zählt nicht', (lv1.academy || 0) === (lv0.academy || 0), (lv0.academy || 0) + ' → ' + (lv1.academy || 0));
  ok('… und der Admin sieht Hinweise (Münzen/Rohstoffe/Hauptbuch)', auff('muenzen') + auff('rohstoffe') + auff('hauptbuch') >= 2, 'muenzen ' + auff('muenzen') + ' · rohstoffe ' + auff('rohstoffe') + ' · hauptbuch ' + auff('hauptbuch'));
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende();
  await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
