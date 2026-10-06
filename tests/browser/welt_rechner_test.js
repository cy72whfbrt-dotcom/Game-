// Weltrechner robust (6.10.): Geduld bei überlastetem Office-Server (statt nach 2 Min. ohne Puls neu zu starten), Dauer des Starts,
// Schummel-Verdacht als Nachricht an die Admins (höchstens 1× pro Spieler und Stunde, nie bremsen).
// Ohne Browser: die Stücke werden aus Game/weltrechner/start.js gelesen und mit Ersatz-Teilen geprüft; push.js wird geladen
// (Senden an die Geräte über ein Ersatz-fetch – nichts geht ins Netz).
//   node tests/browser/welt_rechner_test.js [vorschau (unbenutzt)] [arbeitsordner (unbenutzt)]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let fehler = 0;
const ok = (b, t, x) => { console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 400) : '')); if (!b) fehler++; };
const W = path.join(__dirname, '../../Game/weltrechner');
const quelle = fs.readFileSync(path.join(W, 'start.js'), 'utf8');
const block = (von, bis) => { const a = quelle.indexOf(von), e = quelle.indexOf(bis, a); if (a < 0 || e < 0) throw new Error('Stück nicht gefunden: ' + von); return quelle.slice(a, e); };

(async () => {
  // 1) Geduld: Puls fehlt 130 s – bei Last 3 je Kern warten, bei Last 0,5 beenden (Code 7); nach 10 Min. auch bei Last
  const geduld = last => {
    const logs = [], enden = [];
    const f = new Function('os', 'log', 'ende', 'stat', 'START', 'NODE_MS',
      block('const startZeit = {', 'function herzSchreiben') + block('function pulsPruefen', '\n}\n') + '\n}\n' +
      'return { pulsPruefen, pulsFrist, startMerken, startZeit };');
    const stat = { letzterPuls: 0, geduld: 0 };
    const t = f({ cpus: () => new Array(16).fill({}), loadavg: () => [last * 16, 0, 0] }, (...a) => logs.push(a.join(' ')), (c, g) => enden.push([c, g]), stat, Date.now() - 5000, 400);
    return Object.assign(t, { logs, enden, stat });
  };
  let g = geduld(3);
  ok(g.pulsFrist(0.5) === 120000 && g.pulsFrist(3) === 600000, 'Frist: normal 2 Min., Server überlastet (Last über 1,5 je Kern) 10 Min.');
  const j = Date.now(); g.stat.letzterPuls = j - 130000; g.pulsPruefen(j);
  ok(!g.enden.length && /Server überlastet \(Last 3\.0 je Kern, 16 Kerne\): seit 130 s kein Puls – warte bis 10 Min\./.test(g.logs.join('\n')), 'überlastet, Puls fehlt 130 s: kein Neustart, eine Zeile ins Log', g.logs);
  g.pulsPruefen(j + 5000); ok(g.logs.length === 1, 'die Meldung kommt nur einmal');
  g.stat.letzterPuls = j; g.pulsPruefen(j + 1000);
  ok(g.stat.geduld === 0 && /Puls kommt wieder an/.test(g.logs[1] || ''), 'Puls kommt wieder an: Geduld vorbei (Log)', g.logs);
  g.stat.letzterPuls = j - 610000; g.pulsPruefen(j);
  ok(g.enden.length === 1 && g.enden[0][0] === 7 && /seit 610 s kein Puls/.test(g.enden[0][1]), 'nach 10 Min. ohne Puls auch bei Last: Ende mit Code 7 (Server antwortet nicht)', g.enden);
  g = geduld(0.5); g.stat.letzterPuls = Date.now() - 130000; g.pulsPruefen(Date.now());
  ok(g.enden.length === 1 && g.enden[0][0] === 7, 'Server NICHT überlastet: nach 2 Min. ohne Puls wie bisher Ende (Code 7)', g.enden);

  // 2) Dauer des Starts: Laden, Einlesen, erster Puls → Log + Herzschlag
  g = geduld(0.2);
  g.startMerken('laden'); g.startMerken('einlesen'); ok(g.startZeit.gesamt === undefined && !g.logs.length, 'Start-Dauer erst mit dem ersten Puls fertig');
  g.startMerken('puls'); g.startMerken('puls');
  const z = g.startZeit;
  ok(z.node === 400 && z.laden >= 5000 && z.einlesen >= z.laden && z.puls >= z.einlesen && z.gesamt === 400 + Math.max(z.einlesen, z.puls), 'Start-Dauer: Node, Laden, Einlesen, erster Puls, gesamt (ms)', z);
  ok(g.logs.length === 1 && /^Start-Dauer: Node 0,4 s · Laden 5,\d s · Einlesen \d+,\d s · erster Puls \d+,\d s · gesamt 5,\d s \(Server-Last 0,2 je Kern\)$/.test(g.logs[0]), 'Start-Dauer im Log (einmal)', g.logs);
  ok(/startDauer: startZeit/.test(quelle) && /startMerken\('laden'\)/.test(quelle) && /startMerken\('einlesen'\)/.test(quelle) && /startMerken\('puls'\)/.test(quelle), 'Start-Dauer geht in den Herzschlag, alle drei Zeitpunkte werden gemessen');

  // 3) Schummel-Verdacht: ab 5 Auffälligkeiten in einer Stunde → Nachricht an die Admins, höchstens 1× pro Spieler und Stunde
  const geschrieben = [];
  const fsErsatz = { readFileSync: () => { throw new Error('nicht da'); }, writeFileSync: (f, t) => geschrieben.push(t), renameSync: () => {} };
  const s = new Function('fs', 'path', 'ORDNER', 'SPERRE', 'SCHUMMEL', 'log',
    block('let auffaellig = [];', 'let spielFenster = null;') +
    'let spielFenster = { WELT: { menschen: { u5: { name: "Mogel" } } } };' +
    'return { auffaelligSammeln, adminOffen, gemeldet: () => gemeldet, setzeMelder: m => { pushMelder = m; } };')(fsErsatz, path, '/x', '', '/x/schummel.php', () => {});
  const warn = (uid, n, was) => { const t = Date.now(); s.auffaelligSammeln(Array.from({ length: n }, (_, i) => ({ uid, was: was || 'hauptbuch', text: 'Gems ' + (i + 1) * 100 + ' zu viel', wert: 1, zeit: t }))); };
  warn(5, 4); ok(!s.adminOffen.length, '4 Auffälligkeiten in einer Stunde: noch keine Nachricht');
  warn(5, 1, 'truppen');
  ok(s.adminOffen.length === 1 && s.adminOffen[0].titel === 'Schummel-Verdacht' && /^Mogel: 5 Auffälligkeiten in der letzten Stunde \(hauptbuch, truppen\)\. Nur zur Info – nichts wurde gebremst\./.test(s.adminOffen[0].text), 'die 5. → Nachricht an die Admins (Name, Anzahl, Arten, „nichts gebremst“)', s.adminOffen);
  warn(5, 10); ok(s.adminOffen.length === 1, 'weitere in derselben Stunde: keine zweite Nachricht');
  ok(/"gemeldet":\{"5":\d+\}/.test(geschrieben[geschrieben.length - 1] || ''), '„gemeldet“ steht in schummel.php (übersteht Neustarts)');
  const gemeldet = []; s.setzeMelder({ adminMelden: d => gemeldet.push(d) });
  warn(6, 5); ok(gemeldet.length === 1 && /^Spieler 6: 5 Auffälligkeiten/.test(gemeldet[0].text), 'anderer Spieler: eigene Nachricht (über den Melder)', gemeldet);
  s.gemeldet()[5] = Date.now() - 3600001; warn(5, 1);
  ok(gemeldet.length === 2 && /^Mogel: 16 Auffälligkeiten/.test(gemeldet[1].text), 'nach einer Stunde: wieder eine Nachricht', gemeldet.map(x => x.text));

  // 4) push.js: Nachricht nur an die Geräte der Admin-Konten (auch wenn sie spielen), nie an andere
  const { melder } = require(path.join(W, 'push.js'));
  const vapid = crypto.createECDH('prime256v1'); vapid.generateKeys();
  const geraet = () => { const e = crypto.createECDH('prime256v1'); e.generateKeys(); return { p256dh: e.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') }; };
  const abos = [Object.assign({ id: 1, uid: 3, endpoint: 'https://push.beispiel.invalid/admin', aus: ['angriff'] }, geraet()), Object.assign({ id: 2, uid: 7, endpoint: 'https://push.beispiel.invalid/spieler', aus: [] }, geraet())];
  const holen = async (url, opt) => { const a = JSON.parse(opt.body).aktion; return new Response(JSON.stringify(a === 'push_abos' ? { an: true, public: vapid.getPublicKey().toString('base64url'), private: vapid.getPrivateKey().toString('base64url'), sub: 'mailto:test@beispiel.invalid', abos, admins: [3] } : {}), { status: 200 }); };
  const gesendet = [], fetchVorher = global.fetch;
  global.fetch = async (u, o) => { gesendet.push({ u: String(u), kopf: o.headers }); return new Response('', { status: 201 }); };
  const logs = [], m = melder(holen, t => logs.push(t));
  m.adminMelden({ titel: 'Schummel-Verdacht', text: 'Mogel: 5 Auffälligkeiten' });
  await m.runde({ eval: () => JSON.stringify({ raus: [], online: { u3: true } }) });
  global.fetch = fetchVorher;
  ok(gesendet.length === 1 && gesendet[0].u === 'https://push.beispiel.invalid/admin' && gesendet[0].kopf['Content-Encoding'] === 'aes128gcm' && m.stat.admin === 1, 'push.js: verschlüsselt nur an das Gerät des Admins (online, Einstellungen egal)', { gesendet: gesendet.map(x => x.u), logs });
  await m.runde({ eval: () => JSON.stringify({ raus: [], online: {} }) });
  ok(gesendet.length === 1, 'nichts doppelt: die Nachricht geht genau einmal raus');

  // 5) welt.js (Weltrechner): nie mehrere Nachfragen „Befehle da?“ gleichzeitig, Pause nach langsamem Puls, Spieler-Liste ganz nur alle 10 s
  const wj = fs.readFileSync(path.join(__dirname, '../../Game/welt.js'), 'utf8');
  ok(/if \(nachfrage \|\| pulsLaeuft/.test(wj) && /finally \{ nachfrage = false; \}/.test(wj), 'welt.js: immer nur EINE Nachfrage „Befehle da?“ gleichzeitig');
  ok(/ruheBis = pulsDauer > 8000 \? Date\.now\(\) \+ Math\.min\(20000, pulsDauer \/ 2\) : 0/.test(wj) && /if \(!SYSTEM \|\| Date\.now\(\) >= ruheBis\) puls\(\)/.test(wj), 'welt.js: nach einem langsamen Puls (über 8 s) Pause bis zum nächsten regelmäßigen');
  ok(/\{ const alle = pulsStart - spielerAlleAt > 10000; anfrage\.spieler_alle = alle \? 1 : 0;/.test(wj) && !/if \(!SYSTEM\) \{ anfrage\.sicht_v = W\.sichtV;\s*\n\s*const alle/.test(wj), 'welt.js: auch der Weltrechner holt die ganze Spieler-Liste nur alle 10 s');

  console.log(fehler ? 'FEHLER: ' + fehler + ' Prüfung(en) nicht bestanden' : 'Fehler: keine');
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.log('FEHLER Ablauf: ' + (e && e.stack || e)); process.exit(1); });
