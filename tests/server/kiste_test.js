// Bündnis-Kiste: Geschenk nur gegen eine ECHTE Heldenkiste (Splitter + voller Preis) – Schild/anderer Kauf zählt nie
const G = require('./gemeinsam');
const { sql, warte, ok, ende } = G;
let UID = 0, AID = null;
const hb = () => { const z = JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='u${UID}'`) || '{}'); return z.hb || {}; };
const geschenke = () => { const v = JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterBuendnisse'") || '{}'); const a = v.b && v.b[AID]; return a && a.gesch && a.gesch.k ? (a.gesch.k['u' + UID] || 0) : 0; };
const auff = was => { const e = G.schummelListe().find(x => x.uid === UID && x.was === was); return e ? e.anzahl : 0; };
const RUNDE = 75000;   // Profil (10 s) → Weltrechner → Hauptbuch in der Welt (höchstens jede Minute gespeichert)
let b;
(async () => {
  b = await G.browser(); const fehler = [];
  const NAME = 'kiste' + Date.now().toString(36).slice(-5);
  const p = await G.rein(b, NAME, { neu: true, fehler });
  await G.willkommen(p, 'Kistentest');
  UID = G.spielerId(NAME);
  console.log(G.geschenk(UID, 12000, 0));
  await warte(8000);
  await p.evaluate(() => { for (const x of inboxList().slice()) inboxClaim(x.id); });
  // einem offenen Bündnis mit Mitgliedern beitreten (Geschenke gehen an die anderen)
  AID = await p.evaluate(() => { const a = Object.values(bund.b).filter(x => x.offen && x.mit.length >= 2 && x.mit.length < BUND.MAX).sort((x, y) => y.mit.length - x.mit.length)[0]; if (!a) return null; bundBefehl('beitreten', { aid: a.id }); return a.id; });
  await warte(10000);
  ok('im Bündnis mit anderen', !!AID && await p.evaluate(() => { const a = bundVon('player'); return !!a && a.mit.length >= 2; }), AID);
  await warte(RUNDE);
  const g0 = geschenke(), alarm0 = auff('gems');
  // 1) Schild kaufen → Geschenk-Befehl fälschen
  await p.evaluate(() => { gems -= 300; saveGame(); });   // (wie im Shop: Schild 24 Std.)
  await warte(12000);
  await p.evaluate(() => WELT.befehl('bund', { op: 'kiste', c: 'hcE' }));
  // 2) Befehl fälschen → danach anderer Gem-Kauf (gleicher Betrag wie die Kiste)
  await p.evaluate(() => WELT.befehl('bund', { op: 'kiste', c: 'hcE' }));
  await warte(4000);
  await p.evaluate(() => { gems -= 1200; saveGame(); });
  await warte(RUNDE);
  ok('Schild/anderer Kauf + gefälschte Befehle: KEIN Geschenk', geschenke() === g0, g0 + ' → ' + geschenke());
  ok('… sie warten nur (verfallen nach 10 Min.)', (hb().kisteOffen || []).length === 2, JSON.stringify((hb().kisteOffen || []).map(k => k.g)));
  // 3) zwei echte Käufe gleichzeitig (Große Kiste 500) → genau zwei Geschenke (die gefälschten verbrauchen keinen Beleg doppelt)
  const g1 = geschenke();
  await p.evaluate(() => { const c = HERO_CHESTS.find(x => x.id === 'hc3'); for (let i = 0; i < 2; i++) { gems -= c.gems; heroChestOpen('player', c); } updateHud(); saveGame(); });
  await warte(RUNDE);
  const g2 = geschenke(), h2 = hb();
  ok('zwei echte Kisten → zwei Geschenke', g2 - g1 === 2, g1 + ' → ' + g2 + ' · offen ' + (h2.kisteOffen || []).length + ' · Belege ' + JSON.stringify(h2.shKauf));
  ok('keine Gem-Alarme bei echten Käufen', auff('gems') === alarm0, alarm0 + ' → ' + auff('gems'));
  // 4) Neuladen + derselbe Befehl nochmal (verlorene Antwort) → nicht doppelt
  const cidAlt = await p.evaluate(() => { const c = HERO_CHESTS.find(x => x.id === 'hc3'); gems -= c.gems; heroChestOpen('player', c); updateHud(); saveGame(); return WELT.ausgang.length ? WELT.ausgang[WELT.ausgang.length - 1].cid : null; });
  await warte(3000);
  await p.reload(); await p.waitForTimeout(12000);
  if (cidAlt) await p.evaluate(c => { WELT.befehle.push({ art: 'bund', op: 'kiste', c: 'hc3', at: Date.now(), cid: c }); }, cidAlt);
  await warte(RUNDE);
  const g3 = geschenke();
  ok('Neuladen + doppelt geschickt → höchstens ein Geschenk (Tagesgrenze 3)', g3 - g2 <= 1 && g3 <= 3, g2 + ' → ' + g3 + ' (cid ' + cidAlt + ', Zeilen ' + sql(`SELECT COUNT(*) FROM ow_befehle WHERE cid='${cidAlt}'`) + ')');
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende();
  await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
