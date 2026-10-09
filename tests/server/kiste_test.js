// Bündnis-Kiste: Geschenk nur gegen eine ECHTE Heldenkiste (Splitter + voller Preis) – Schild/anderer Kauf zählt nie
// Wartet auf Ereignisse (Profil beim Server, Weltrechner-Pulse, Werte in der Datenbank) statt fester Zeiten – unter Last
// (komplett.sh: beide Reihen gleichzeitig) dauert es einfach länger, statt zu früh zu prüfen.
const G = require('./gemeinsam');
const { sql, warte, bis, ok, ende } = G;
let UID = 0, AID = null;
const hb = () => { const z = JSON.parse(sql(`SELECT zustand FROM ow_bots WHERE spieler_id=0 AND bot_id='u${UID}'`) || '{}'); return z.hb || {}; };
const geschenke = () => { const v = JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterBuendnisse'") || '{}'); const a = v.b && v.b[AID]; return a && a.gesch && a.gesch.k ? (a.gesch.k['u' + UID] || 0) : 0; };
const imBund = () => { const v = JSON.parse(sql("SELECT wert FROM ow_spielstand WHERE spieler_id=0 AND schluessel='openWaterBuendnisse'") || '{}'); const a = v.b && v.b[AID]; return !!a && (a.mit || []).includes('u' + UID); };
const auff = was => { const e = G.schummelListe().find(x => x.uid === UID && x.was === was); return e ? e.anzahl : 0; };
const profilZeit = () => +sql(`SELECT profil_zeit FROM ow_spieler WHERE id=${UID}`) || 0;
const RUNDE = 75000;   // höchstens so lange auf eine Runde warten: Profil (10 s) → Weltrechner → Hauptbuch in der Welt (höchstens jede Minute gespeichert)
// Der Weltrechner hat ein Profil von nach t (ms) bekommen und danach noch n Pulse gerechnet (und gespeichert)
async function verarbeitet(t, n) { await bis(() => profilZeit() > t, 60000); await G.pulse(n || 5, 90000); }
// Spiel geladen und mindestens zwei Pulse mit dem Server
const bereit = p => p.waitForFunction(() => window.WELT && WELT.pulse >= 2 && typeof inboxList === 'function', null, { timeout: 90000 });
let b;
(async () => {
  b = await G.browser(); const fehler = [];
  const NAME = 'kiste' + Date.now().toString(36).slice(-5);
  const p = await G.rein(b, NAME, { neu: true, fehler, warte: 0 });
  await bereit(p);
  await bis(() => p.evaluate(() => !!document.getElementById('wkName')), 15000);
  await G.willkommen(p, 'Kistentest');
  UID = G.spielerId(NAME);
  console.log(G.geschenk(UID, 12000, 50000));   // Münzen: reicht zum Gründen, falls kein offenes Bündnis Platz hat
  await bis(() => p.evaluate(() => inboxList().length > 0), 30000);   // das Geschenk ist im Postfach
  await p.evaluate(() => { for (const x of inboxList().slice()) inboxClaim(x.id); });
  const tGeschenk = Date.now();
  // einem offenen Bündnis mit Mitgliedern beitreten (Geschenke gehen an die anderen)
  AID = await p.evaluate(() => { const a = Object.values(bund.b).filter(x => x.offen && x.mit.length >= 1 && x.mit.length < BUND.MAX).sort((x, y) => y.mit.length - x.mit.length)[0]; if (!a) return null; bundBefehl('beitreten', { aid: a.id }); return a.id; });
  if (!AID) {   // alle Mitspieler-Bündnisse voll/geschlossen: selbst gründen, ein zweiter echter Spieler tritt bei
    const k = Date.now().toString(36).slice(-4).toUpperCase().replace(/[^A-Z]/g, 'K');
    await p.evaluate(k => bundBefehl('gruenden', { name: 'Kiste' + k, tag: k.slice(0, 4), farbe: 0, zeichen: 0, offen: true }), k);
    await bis(() => p.evaluate(() => !!bundVon('player')), 90000);
    AID = await p.evaluate(() => { const a = bundVon('player'); return a ? a.id : null; });
    const p2 = await G.rein(b, NAME + 'b', { neu: true, fehler, warte: 0 });
    await bereit(p2);
    await bis(() => p2.evaluate(() => !!document.getElementById('wkName')), 15000);
    await G.willkommen(p2, 'Kistenfreund');
    await bis(() => p2.evaluate(a => !!bund.b[a], AID), 90000);
    await p2.evaluate(a => bundBefehl('beitreten', { aid: a }), AID);
  }
  await bis(() => p.evaluate(() => { const a = bundVon('player'); return !!a && a.mit.length >= 2; }), 90000);
  ok('im Bündnis mit anderen', !!AID && await p.evaluate(() => { const a = bundVon('player'); return !!a && a.mit.length >= 2; }), AID);
  // Weltrechner kennt die Gems (Profil nach dem Geschenk), Bündnis und Hauptbuch stehen in der Welt
  await verarbeitet(tGeschenk, 3);
  await bis(() => imBund() && hb().gU !== undefined, RUNDE);
  await G.pulse(3, 60000);
  const g0 = geschenke(), alarm0 = auff('gems');
  // 1) Schild kaufen → Geschenk-Befehl fälschen
  await p.evaluate(() => { gems -= 300; saveGame(); });   // (wie im Shop: Schild 24 Std.)
  const tSchild = Date.now();   // (jeweils NACH der Änderung: das nächste Profil enthält sie sicher)
  await verarbeitet(tSchild, 2);
  await p.evaluate(() => WELT.befehl('bund', { op: 'kiste', c: 'hcE' }));
  // 2) Befehl fälschen → danach anderer Gem-Kauf (gleicher Betrag wie die Kiste)
  await p.evaluate(() => WELT.befehl('bund', { op: 'kiste', c: 'hcE' }));
  await bis(() => (hb().kisteOffen || []).length >= 2, 30000);   // beide Befehle sind beim Weltrechner angekommen
  await p.evaluate(() => { gems -= 1200; saveGame(); });
  const tKauf = Date.now();
  await verarbeitet(tKauf, 5);
  await bis(() => geschenke() !== g0, 15000);   // (käme fälschlich doch eins: nicht zu früh prüfen)
  ok('Schild/anderer Kauf + gefälschte Befehle: KEIN Geschenk', geschenke() === g0, g0 + ' → ' + geschenke());
  ok('… sie warten nur (verfallen nach 10 Min.)', (hb().kisteOffen || []).length === 2, JSON.stringify((hb().kisteOffen || []).map(k => k.g)));
  // 3) zwei echte Käufe gleichzeitig (Große Kiste 500) → genau zwei Geschenke (die gefälschten verbrauchen keinen Beleg doppelt)
  const g1 = geschenke();
  await p.evaluate(() => { const c = HERO_CHESTS.find(x => x.id === 'hc3'); for (let i = 0; i < 2; i++) { gems -= c.gems; heroChestOpen('player', c); } updateHud(); saveGame(); });
  const tEcht = Date.now();
  await verarbeitet(tEcht, 3);
  await bis(() => geschenke() - g1 >= 2, RUNDE + 90000);   // (Weltrechner unter Last: bis zu 90 s länger warten – nicht mehr als 2 erlaubt, siehe unten)
  await G.pulse(5, 60000);   // (ein drittes käme gleich danach – auch das sehen)
  const g2 = geschenke(), h2 = hb();
  ok('zwei echte Kisten → zwei Geschenke', g2 - g1 === 2, g1 + ' → ' + g2 + ' · offen ' + (h2.kisteOffen || []).length + ' · Belege ' + JSON.stringify(h2.shKauf));
  ok('keine Gem-Alarme bei echten Käufen', auff('gems') === alarm0, alarm0 + ' → ' + auff('gems'));
  // 4) Neuladen + derselbe Befehl nochmal (verlorene Antwort) → nicht doppelt
  const cidAlt = await p.evaluate(() => { const c = HERO_CHESTS.find(x => x.id === 'hc3'); gems -= c.gems; heroChestOpen('player', c); updateHud(); saveGame(); return WELT.ausgang.length ? WELT.ausgang[WELT.ausgang.length - 1].cid : null; });
  const tNeu = Date.now();
  if (cidAlt) await bis(() => +sql(`SELECT COUNT(*) FROM ow_befehle WHERE cid='${cidAlt}'`) > 0, 15000);   // der Befehl ist beim Server
  else await warte(3000);
  await p.reload(); await bereit(p);
  if (cidAlt) await p.evaluate(c => { WELT.befehle.push({ art: 'bund', op: 'kiste', c: 'hc3', at: Date.now(), cid: c }); }, cidAlt);
  await verarbeitet(tNeu, 3);
  await bis(() => geschenke() > g2, RUNDE);
  await G.pulse(5, 60000);   // (ein doppeltes käme gleich danach – auch das sehen)
  const g3 = geschenke();
  ok('Neuladen + doppelt geschickt → höchstens ein Geschenk (Tagesgrenze 3)', g3 - g2 <= 1 && g3 <= 3, g2 + ' → ' + g3 + ' (cid ' + cidAlt + ', Zeilen ' + sql(`SELECT COUNT(*) FROM ow_befehle WHERE cid='${cidAlt}'`) + ')');
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende();
  await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
