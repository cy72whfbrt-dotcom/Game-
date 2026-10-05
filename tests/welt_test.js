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

// 3) Hauptbuch (10-start.js): keine Fehlalarme für Thron-Shop-Kisten, Splitter → Gems (alle Helden voll), Wochenketten-/Pass-Kisten (fr.kg)
{
    const s10 = fs.readFileSync(path.join(G, 'spiel', '10-start.js'), 'utf8'), stueck = (a, b) => { const i = s10.indexOf(a), j = s10.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nicht gefunden: ' + a); return s10.slice(i, j); };
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
}

// 4) Welt-Saison (09-events.js): der Termin ist immer ein Sonntag 18 Uhr, 8 Wochen nach dem Start (auch über Sommer-/Winterzeit)
{
    const s9 = fs.readFileSync(path.join(G, 'spiel', '09-events.js'), 'utf8'), i = s9.indexOf('function saisonEnde'), j = s9.indexOf('function saisonJetzt', i);
    const saisonEnde = new Function('SAISON_WOCHEN', 'SAISON_STUNDE', s9.slice(i, j) + '; return saisonEnde;')(8, 18);
    let gut = true;
    for (const ab of ['2026-10-06T10:00:00', '2026-10-04T18:00:03', '2026-02-01T18:00:00', '2026-08-02T18:00:00', '2026-12-31T23:59:00']) {
        const t = new Date(ab).getTime(), e = new Date(saisonEnde(t)), tage = (e - t) / 864e5;
        if (e.getDay() !== 0 || e.getHours() !== 18 || e.getMinutes() !== 0 || tage < 55.9 || tage > 63) { gut = false; console.log('  Saison ab', ab, '→', e.toString()); }
    }
    pruefe('Welt-Saison: Termin Sonntag 18 Uhr, 8 Wochen nach dem Start', gut);
    const w = fs.readFileSync(path.join(G, 'welt.js'), 'utf8');
    pruefe('Welt-Saison: welt.js nimmt nur Profile der laufenden Saison', /\(\+s\.profil\.saison \|\| 1\) >= nr/.test(w) && /saison: parseInt\(d\.openWaterSaisonMein/.test(w));
}

console.log(fehler ? fehler + ' von ' + n + ' Tests FEHLGESCHLAGEN' : 'Alle ' + n + ' Spiel-Tests bestanden.');
process.exit(fehler ? 1 : 0);
