// Test der Code-Karte (werkzeuge/karte.sh): KARTE.md aktuell, zusammengesetzte Dateien nicht doppelt erfasst.
// Aufruf: node tests/karte_test.js  (nach werkzeuge/spiel_bauen.sh) → „OK …“ oder „FEHLER …“
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const G = path.join(__dirname, '..');
let fehler = 0;
const pruef = (ok, text) => { console.log((ok ? 'OK ' : 'FEHLER ') + text); if (!ok) fehler = 1; };
let aktuell = true;
try { execFileSync(path.join(G, 'werkzeuge/karte.sh'), ['pruefen'], { stdio: 'pipe' }); } catch (e) { aktuell = false; }
pruef(aktuell, 'KARTE.md ist aktuell (werkzeuge/karte.sh pruefen)');
const karte = fs.readFileSync(path.join(G, 'KARTE.md'), 'utf8');
const ziele = [...fs.readFileSync(path.join(G, 'werkzeuge/spiel_bauen.sh'), 'utf8').matchAll(/^\s*"(Game\/[^|"]+)\|(Game\/[^|"]+)\|/gm)];
pruef(ziele.length >= 5, 'Tabelle ZIELE gelesen (' + ziele.length + ' Zieldateien)');
for (const [, ordner, ziel] of ziele) {
    pruef(!karte.includes('→ ' + ziel + ':') && !karte.includes('### ' + ziel + '\n') && !karte.includes('### ' + ziel + ' '), ziel + ' nicht doppelt in KARTE.md');
    pruef(karte.includes('## ' + ordner + '/ (Teile)'), ordner + '/ als Teile in KARTE.md');
}
pruef(/`marsch_welt` → Game\/server\/[^:]+\.php:\d+/.test(karte), 'marsch_welt zeigt auf den Teil in Game/server/');
pruef(/`bundOp` → Game\/buendnis\/[^:]+\.js:\d+/.test(karte), 'bundOp zeigt auf den Teil in Game/buendnis/');
pruef(!/baukunst/.test(karte), 'keine 3D-Burg (baukunst) mehr in KARTE.md');
console.log(fehler ? 'FEHLER: karte_test nicht bestanden' : 'OK: karte_test bestanden');
process.exit(fehler);
