// Tests für die Flicken (nur Änderungen schicken) in Game/welt.js und Syntax aller Spiel-Dateien.  Aufruf:  node tests/welt_test.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const G = path.join(__dirname, '..', 'Game');
let fehler = 0, n = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER: ' + name); } };

// 1) Jede Spiel-Datei ist gültiges JavaScript
for (const d of ['spiel.js', 'bots.js', 'welt.js', 'aufbau.js', 'buendnis.js', 'haendler.js', 'speichern.js', 'ladebildschirm.js', 'baukunst.js', 'benachrichtigung.js', 'sw.js', 'weltrechner/start.js', 'weltrechner/push.js']) {
    try { execFileSync(process.execPath, ['--check', path.join(G, d)], { stdio: 'pipe' }); pruefe(d, true); } catch (e) { pruefe(d + ': ' + String(e.stderr).split('\n')[0], false); }
}

// 2) Flicken: bauen und wieder einsetzen ergibt genau den neuen Stand (2000 Zufallsfälle)
const src = fs.readFileSync(path.join(G, 'welt.js'), 'utf8');
const J = v => JSON.stringify(v), istObjekt = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const teil = src.slice(src.indexOf('    function flickenBauen'), src.indexOf('    const gesendet = {};'));
const { flickenBauen, flickenAnwenden } = new Function('J', 'istObjekt', teil + '; return { flickenBauen, flickenAnwenden };')(J, istObjekt);
let zufall = 12345; const r = () => (zufall = (zufall * 1103515245 + 12345) % 2147483648) / 2147483648;
const wert = t => { const x = r(); if (t > 1 || x < .4) return Math.floor(r() * 1000); if (x < .55) return 'w' + Math.floor(r() * 9); if (x < .65) return null; if (x < .75) return [1, 2, Math.floor(r() * 5)]; const o = {}; const m = Math.floor(r() * 5); for (let i = 0; i < m; i++) o['k' + Math.floor(r() * 8)] = wert(t + 1); return o; };
const welt = () => { const o = {}; const m = Math.floor(r() * 30); for (let i = 0; i < m; i++) o[String(Math.floor(r() * 50))] = wert(0); return o; };
const aendern = a => { const b = JSON.parse(J(a)); for (const k of Object.keys(b)) { const x = r(); if (x < .1) delete b[k]; else if (x < .3) b[k] = wert(0); else if (x < .4 && istObjekt(b[k])) { for (const kk of Object.keys(b[k])) if (r() < .5) delete b[k][kk]; b[k]['n' + Math.floor(r() * 3)] = wert(1); } } if (r() < .5) b['neu' + Math.floor(r() * 9)] = wert(0); return b; };
const sortiert = v => Array.isArray(v) ? v.map(sortiert) : istObjekt(v) ? Object.keys(v).sort().reduce((o, k) => (o[k] = sortiert(v[k]), o), {}) : v;
let gut = 0;
for (let i = 0; i < 2000; i++) {
    const a = welt(), b = aendern(a), f = JSON.parse(J(flickenBauen(a, b))), c = JSON.parse(J(a));
    if (flickenAnwenden(c, f) && J(sortiert(c)) === J(sortiert(b))) gut++;
    else if (gut + 1 === i + 1 - 0) { console.log('  Beispiel:', J(a), '→', J(b), 'Flicken', J(f), 'ergibt', J(c)); }
}
pruefe('Flicken hin und zurück (' + gut + ' von 2000)', gut === 2000);
pruefe('leere {} bleiben {}', (() => { const a = { x: {} }, b = { x: {}, y: {} }, c = JSON.parse(J(a)); flickenAnwenden(c, flickenBauen(a, b)); return J(c) === '{"x":{},"y":{}}'; })());
pruefe('Flicken auf fehlenden Eintrag wird erkannt', flickenAnwenden({ a: 1 }, { d: { z: { s: { x: 1 } } } }) === false);

// 3) Hauptbuch (10d-welt-weltrechner.js): keine Fehlalarme für Thron-Shop-Kisten, Splitter → Gems (alle Helden voll), Wochenketten-/Pass-Kisten (fr.kg)
{
    const s10 = fs.readFileSync(path.join(G, 'spiel', '10d-welt-weltrechner.js'), 'utf8'), stueck = (a, b) => { const i = s10.indexOf(a), j = s10.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nicht gefunden: ' + a); return s10.slice(i, j); };
    const code = stueck('    const kWert', '    function hbKisteDazu') + stueck('    const hbThronPreis', '    function hbFreiDazu') + stueck('    function hbGearNeu', '    // alle Neuerungen eines Profils');
    const nn = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0), WERT = { a: 0 };
    const H = new Function('nn', 'HEROES', 'HERO_MAXQ', 'hbHeldZeile', 'hbHeldenWert', 'hbE0f', 'HB_SLOTS', 'starGemCost', 'CRATE_GEM_COST', 'hbZahlen', 'fz', 'THRONE_OFFERS', 'STAR_PCT', 'ITEM_MAX_LEVEL',
        code + '; return { hbThronKisten, hbSplitterGems, hbGearNeu };')(nn, [{ id: 'a', r: 1 }], 20, z => [z.own ? 1 : 0, z.q | 0, z.sh | 0, 0, 0, 0, 0], () => WERT.a, () => 10,
        ['weapon', 'armor', 'shield', 'boots'], () => 50, 100, () => false, String, [{ id: 'crate', cost: 60 }, { id: 'royal', cost: 400 }], 5, 30);
    const hbLeer = () => ({ kN: 0, kG: 0, fr: { k: 0, kg: 0, sh: 0 }, gear: { weapon: [], armor: [], shield: [], boots: [] }, hs: { a: [1, 20, 0, 0, 0, 0, 0] }, shB: 0 });
    let hb = hbLeer();
    pruefe('Hauptbuch: Episches Teil ohne sichere Kiste und ohne Gems wird abgelehnt', H.hbGearNeu('u1', hb, {}, 'weapon', [3, 1, 0], 5) !== '');
    hb = hbLeer(); hb.fr.kg = 27;
    pruefe('Hauptbuch: Episches Teil aus Wochenkette/Pass (fr.kg) wird angenommen', H.hbGearNeu('u1', hb, {}, 'weapon', [3, 1, 0], 5) === '' && hb.fr.kg === 0 && hb.kG === 0);
    hb = hbLeer(); H.hbThronKisten(hb, 900);
    pruefe('Hauptbuch: bisheriger Spieler ohne thK – schon verdiente Thron-Punkte nur gemerkt, keine Kisten', hb.thK === 900 && hb.fr.k === 0 && hb.fr.kg === 0);
    hb = hbLeer(); hb.thK = 0; H.hbThronKisten(hb, 400); H.hbThronKisten(hb, 400);
    pruefe('Hauptbuch: 400 Thron-Punkte → Königliche Kiste (einmal gutgeschrieben)', hb.fr.kg === 27 && Math.abs(hb.fr.k - 400 / 60) < 1e-9 && hb.thK === 400);
    pruefe('Hauptbuch: … und das Epische Teil daraus wird angenommen', H.hbGearNeu('u1', hb, {}, 'armor', [3, 1, 0], 5) === '');
    hb = hbLeer(); WERT.a = 100; hb.shB = 95; hb.fr.sh = 2;   // Helden voll (Wert 100, Start 10): 5 unverbrauchte Splitter + 2 aus dem Spielraum
    pruefe('Hauptbuch: Splitter → Gems bei vollen Helden (20 je Splitter, verbraucht)', H.hbSplitterGems(hb, null, 100) === 100 && hb.fr.sh === 0 && hb.shB === 92);
    pruefe('Hauptbuch: … höchstens so viele, wie Splitter da sind', H.hbSplitterGems(hb, null, 1000) === 40 && hb.shB === 90);
    hb = hbLeer(); hb.hs.a = [1, 12, 0, 0, 0, 0, 0]; hb.shB = 95;
    pruefe('Hauptbuch: Helden nicht voll → keine Gems aus Splittern', H.hbSplitterGems(hb, { hs: { a: { own: true, q: 12 } } }, 100) === 0);
    pruefe('Hauptbuch: … außer sein Profil zeigt sie gerade voll', H.hbSplitterGems(hb, { hs: { a: { own: true, q: 20 } } }, 100) === 100);
    // Münz-Spielraum (Wirtschaft 5.10.): der feste Tages-Rest und die Mindest-Stunde × WIRTSCHAFT_KOSTEN (vorher 50.000 + 3 × 5.000)
    const S = new Function('levelRewardCoins', 'WIRTSCHAFT_KOSTEN', stueck('    const kW', '    function spielraumTag') + '; return { spielraumTeile, TR_STUNDE_MIN, FUND_TR_MIN };')(() => 0, 1 / 1800);
    const t = S.spielraumTeile('u1', { lvl: 1, lvlLog: [], ein: [], hp0: 0, initT: Date.now() - 2 * 3600000 });
    pruefe('Hauptbuch: fester Münz-Spielraum × WIRTSCHAFT_KOSTEN (28 + 3 × 3 statt 65.000)', t.fix === 28 + 3 * 3 && t.lv === 0);
    pruefe('Hauptbuch: Mindest-Truppen (Thron-Shop 1.000, Fund 100) × WIRTSCHAFT_KOSTEN, nie unter 1', S.TR_STUNDE_MIN === 1 && S.FUND_TR_MIN === 1);
    // Thron-Shop zahlt wie Händler/Markt 2 Stunden Produktion (Alexander 6.10.): 3 freie Käufe = 3 × 2 Stunden ohne Fehlalarm
    const MG = new Function('PASS_LVLS', 'passRewardAt', 'SR_STUNDE_MIN', 'nn', 'hourProduction', 'passNo', 'throneEarnedOf', 'saveBotState', 'THRONE_STUNDEN',
        stueck('    let passMuenzH', '    function spielraumFrei') + '; return muenzGutscheine;')(0, null, 3, x => +x || 0, () => ({ coins: 1000 }), () => 7, () => 0, () => {}, 1 / 1800 / (1 / 3600));
    const dT = { pS: 7, pM: 0, tC: 0 }, h12 = 1000 * 1.2;
    pruefe('Hauptbuch: 3 Thron-Käufe à 2 Stunden Münzen gedeckt (je Kauf 2 × Stundenproduktion)', MG('u1', 3 * 2 * h12, dT) === 3 * 2 * h12 && Math.abs(dT.tC - 3) < 1e-9);
    pruefe('Hauptbuch: … ein 4. Kauf ohne Thron-Punkte nicht', MG('u1', 2 * h12, dT) === 0);
}

// 4) Welt-Saison (09f-saison.js): der Termin ist immer ein Sonntag 18 Uhr deutscher Zeit, 8 Wochen nach dem Start (auch über
//    Sommer-/Winterzeit, egal in welcher Zeitzone der Server läuft)
{
    const s9 = fs.readFileSync(path.join(G, 'spiel', '09f-saison.js'), 'utf8'), i = s9.indexOf('const BERLIN'), j = s9.indexOf('function saisonJetzt', i);
    const saisonEnde = new Function('SAISON_WOCHEN', 'SAISON_STUNDE', s9.slice(i, j) + '; return saisonEnde;')(8, 18);
    let gut = true;
    const B = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (const ab of ['2026-10-06T10:00:00Z', '2026-10-04T16:00:03Z', '2026-02-01T17:00:00Z', '2026-08-02T16:00:00Z', '2026-12-31T23:59:00Z', '2027-03-28T16:30:00Z']) {
        const t = new Date(ab).getTime(), e = new Date(saisonEnde(t)), tage = (e - t) / 864e5;
        if (B.format(e) !== 'So., 18:00' || tage < 55.9 || tage > 63) { gut = false; console.log('  Saison ab', ab, '→', e.toISOString(), B.format(e)); }
    }
    pruefe('Welt-Saison: Termin Sonntag 18 Uhr deutscher Zeit, 8 Wochen nach dem Start', gut);
    const w = fs.readFileSync(path.join(G, 'welt.js'), 'utf8');
    pruefe('Welt-Saison: welt.js nimmt nur Profile der laufenden Saison', /\(\+s\.profil\.saison \|\| 1\) >= nr/.test(w) && /saison: parseInt\(d\.openWaterSaisonMein/.test(w));
}

// 5) Push „Bau fertig“ / „Forschung fertig“ (weltrechner/push.js): Zeiten aus dem Profil, je einmal, beim ersten Blick nur merken
{
    const { BEOBACHTER, nachrichtBauen } = require(path.join(G, 'weltrechner', 'push.js')), jetzt = Date.now();
    const M = { u7: { online: false, profil: { city: { levels: { academy: 4, keep: 3 }, bau: ['academy', 'keep'], bauBis: [jetzt - 60000, jetzt + 3600000], foLauf: 'w_prod', foBis: jetzt - 1000 }, fo: { w_prod: 2 } } } };
    const win = {}, defs = { academy: { name: 'Labor' }, keep: { name: 'Burg' } };
    const lauf = () => JSON.parse(new Function('window', 'WELT', 'botById', 'cityDef', 'AUF', 'pendingAttacks', 'botIntelMem', 'botOwnedIslands', 'return ' + BEOBACHTER)(win, { menschen: M }, {}, id => defs[id], { FORSCHUNG: [{ id: 'w_prod', name: 'Ertrag' }] }, [], {}, {})).raus;
    pruefe('Push Bau/Forschung: beim ersten Blick nur merken', lauf().length === 0);
    M.u7.profil.city.bauBis[0] = jetzt - 30000; win.__pushMerker.ev = {};   // (nach einem Neustart wäre alles schon gemerkt – hier frisch)
    const r = lauf(), bau = r.filter(e => e.art === 'bau'), fo = r.filter(e => e.art === 'forschung');
    pruefe('Push Bau fertig: nur der fertige Bau (Labor 5), nicht die laufende Burg', bau.length === 1 && bau[0].name === 'Labor' && bau[0].stufe === 5 && bau[0].an === 'u7');
    pruefe('Push Forschung fertig: Ertrag Stufe 3', fo.length === 1 && fo[0].name === 'Ertrag' && fo[0].stufe === 3);
    pruefe('Push Bau/Forschung: kommt nur einmal', lauf().length === 0);
    const n = nachrichtBauen(bau.concat(fo), jetzt);
    pruefe('Push-Text Bau/Forschung', n.titel === 'Bau fertig' && /Fertig gebaut: Labor Stufe 5\./.test(n.text) && /Fertig erforscht: Ertrag Stufe 3/.test(n.text));
    M.u7.profil.city.bauBis[0] = jetzt - 20 * 60000; win.__pushMerker.ev = {};
    pruefe('Push Bau fertig: über 10 Min. alt → keine Meldung mehr', !lauf().some(e => e.art === 'bau'));
    const s10 = fs.readFileSync(path.join(G, 'spiel', '10d-welt-weltrechner.js'), 'utf8'), schritt = s10.slice(s10.indexOf('function hbStadtSchritt'), s10.indexOf('function hbFoSchritt'));
    pruefe('Bauherr: echte Spieler bekommen beim Weltrechner Punkte für Stadt-Gebäude', /evPunkte\('bau', who, 2 \+ L \+ 1\)/.test(schritt));
    pruefe('Welt-Profil schickt Bau- und Forschungs-Ende mit', /bauBis: bl\.map/.test(fs.readFileSync(path.join(G, 'welt.js'), 'utf8')));
}

console.log(fehler ? fehler + ' von ' + n + ' Tests FEHLGESCHLAGEN' : 'Alle ' + n + ' Spiel-Tests bestanden.');
process.exit(fehler ? 1 : 0);
