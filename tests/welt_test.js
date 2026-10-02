// Tests für die Flicken (nur Änderungen schicken) in Game/welt.js und Syntax aller Spiel-Dateien.  Aufruf:  node tests/welt_test.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const G = path.join(__dirname, '..', 'Game');
let fehler = 0, n = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER: ' + name); } };

// 1) Jede Spiel-Datei ist gültiges JavaScript
for (const d of ['spiel.js', 'bots.js', 'welt.js', 'buendnis.js', 'haendler.js', 'speichern.js', 'ladebildschirm.js', 'baukunst.js', 'benachrichtigung.js', 'sw.js', 'weltrechner/start.js', 'weltrechner/push.js']) {
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

console.log(fehler ? fehler + ' von ' + n + ' Tests FEHLGESCHLAGEN' : 'Alle ' + n + ' Spiel-Tests bestanden.');
process.exit(fehler ? 1 : 0);
