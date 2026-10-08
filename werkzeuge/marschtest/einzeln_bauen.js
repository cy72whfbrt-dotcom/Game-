// Marschtest als EINE Datei (Bilder und Schriften als data-URLs, Skripte eingebettet) – zum Ansehen ohne Server und ohne Repo.
// Aufruf: node werkzeuge/marschtest/einzeln_bauen.js <ziel.html>
'use strict';
const fs = require('fs'), path = require('path');
const hier = __dirname, spiel = path.join(hier, '../../Game/bilder'), ziel = process.argv[2];
if (!ziel) { console.error('Aufruf: node einzeln_bauen.js <ziel.html>'); process.exit(1); }
const daten = (f, typ) => `data:${typ};base64,` + fs.readFileSync(f).toString('base64');
const js = fs.readFileSync(path.join(hier, 'marschtest.js'), 'utf8');
const KARTE = {}, ALLE = {};
for (const f of fs.readdirSync(spiel)) if (/^karte_.*\.webp$/.test(f)) KARTE[f.slice(6, -5)] = daten(path.join(spiel, f), 'image/webp');
for (const f of fs.readdirSync(path.join(hier, 'bilder'))) if (/\.webp$/.test(f)) ALLE[f.slice(0, -5)] = daten(path.join(hier, 'bilder', f), 'image/webp');
// aus Game/bilder nur, was marschtest.js nennt (Köpfe, Beute, Basen, Knopf-Zeichen)
for (const f of fs.readdirSync(spiel)) { const n = f.slice(0, -5); if (/\.webp$/.test(f) && !/^karte_/.test(f) && (js.includes(`'${n}'`) || /^held_.*_kopf$|^basis_\d\d$/.test(n))) ALLE[n] = daten(path.join(spiel, f), 'image/webp'); }
const roh = n => fs.readFileSync(path.join(hier, n), 'utf8').replace(/<\/script/gi, '<\\/script');
const schrift = fs.readFileSync(path.join(hier, '../../Game/schrift/schrift.css'), 'utf8')
  .replace(/url\(([a-z]+\.woff2)\)/g, (_, n) => `url(${daten(path.join(hier, '../../Game/schrift', n), 'font/woff2')})`);
let html = fs.readFileSync(path.join(hier, 'marschtest.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="[^"]*schrift\.css">/, () => '<style>' + schrift + '</style>')
  .replace(/<script>const KARTE_BILD_PFAD[^<]*<\/script>/, () => '<script>const KARTE_BILDER = ' + JSON.stringify(KARTE) + ', ALLE_BILDER = ' + JSON.stringify(ALLE)
    + ", SPIEL_BILD_PFAD = '', MARSCH_BILD_PFAD = '';</script>")
  .replace(/<script src="([^"]+)"><\/script>/g, (_, n) => '<script>\n' + roh(n) + '</script>');
fs.writeFileSync(ziel, html);
console.log(ziel, (fs.statSync(ziel).size / 1048576).toFixed(2) + ' MB');
