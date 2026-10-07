// Kartentest als EINE Datei (Bilder als data-URLs, Skripte eingebettet) – zum Ansehen ohne Server und ohne Repo.
// Aufruf: node werkzeuge/kartentest/einzeln_bauen.js <ziel.html>
'use strict';
const fs = require('fs'), path = require('path');
const hier = __dirname, bilder = path.join(hier, '../../Game/bilder'), ziel = process.argv[2];
if (!ziel) { console.error('Aufruf: node einzeln_bauen.js <ziel.html>'); process.exit(1); }
const B = {};
for (const f of fs.readdirSync(bilder)) if (/^karte_.*\.webp$/.test(f)) B[f.slice(6, -5)] = 'data:image/webp;base64,' + fs.readFileSync(path.join(bilder, f)).toString('base64');
B.thron = 'data:image/webp;base64,' + fs.readFileSync(path.join(hier, 'karte_thron.webp')).toString('base64');   // (nur im Kartentest-Ordner)
const roh = n => fs.readFileSync(path.join(hier, n), 'utf8').replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync(path.join(hier, 'kartentest.html'), 'utf8');
html = html.replace(/<script>const KARTE_BILD_PFAD[^<]*<\/script>/, () => '<script>const KARTE_BILDER = ' + JSON.stringify(B) + ';</script>')
  .replace(/<script src="([^"]+)"><\/script>/g, (_, n) => '<script>\n' + roh(n) + '</script>');
fs.writeFileSync(ziel, html);
console.log(ziel, (fs.statSync(ziel).size / 1048576).toFixed(2) + ' MB');
