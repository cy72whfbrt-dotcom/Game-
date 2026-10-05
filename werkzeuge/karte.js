// ===== karte.js – erzeugt KARTE.md (Aufruf über werkzeuge/karte.sh) =====
process.chdir(require('path').join(__dirname, '..'));
const fs = require('fs'), path = require('path');
const GAME = 'Game';
const KURZ = 80;
const kuerzen = s => { s = s.replace(/\s+/g, ' ').trim(); return s.length > KURZ ? s.slice(0, KURZ - 1) + '…' : s; };
const sortiert = a => a.slice().sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
const istTeil = f => /^\/\/ Teil /.test(fs.readFileSync(f, 'utf8').slice(0, 200));

// Dateien sammeln: zuerst die Teil-Ordner, dann die übrigen Dateien
const teilOrdner = sortiert(fs.readdirSync(GAME).filter(d => fs.statSync(path.join(GAME, d)).isDirectory()))
    .filter(d => fs.readdirSync(path.join(GAME, d)).some(f => /\.(js|php)$/.test(f) && istTeil(path.join(GAME, d, f))));
const gruppen = [];
for (const d of teilOrdner) gruppen.push({ titel: 'Game/' + d + '/ (Teile)', dateien: sortiert(fs.readdirSync(path.join(GAME, d)))
    .filter(f => /\.(js|php)$/.test(f) && istTeil(path.join(GAME, d, f))).map(f => path.join(GAME, d, f)) });
// Zusammengesetzte Dateien (spiel.js, server.php …) stehen schon als Teile drin: Liste aus der Tabelle ZIELE in spiel_bauen.sh
const zusammen = new Set([...fs.readFileSync('werkzeuge/spiel_bauen.sh', 'utf8').matchAll(/^\s*"Game\/[^|"]+\|(Game\/[^|"]+)\|/gm)].map(m => m[1]));
if (!zusammen.size) { console.error('FEHLER: Tabelle ZIELE in werkzeuge/spiel_bauen.sh nicht gefunden'); process.exit(1); }
gruppen.push({ titel: 'Game/ (übrige Dateien)', dateien: sortiert(fs.readdirSync(GAME)).filter(f => /\.(js|php)$/.test(f) && !zusammen.has(path.join(GAME, f))).map(f => path.join(GAME, f)) });
gruppen.push({ titel: 'Game/weltrechner/', dateien: sortiert(fs.readdirSync(path.join(GAME, 'weltrechner'))).filter(f => /\.(js|php)$/.test(f) && f !== 'jsdom.js').map(f => path.join(GAME, 'weltrechner', f)) });

// Kommentar direkt über Zeile i (zusammenhängende //- bzw. #-Zeilen), sonst Kommentar am Zeilenende nach „{“
function kommentar(z, i) {
    const block = [];
    for (let k = i - 1; k >= 0; k--) {
        const m = z[k].match(/^\s*(?:\/\/+|#|\*(?!\/)|\/\*+)\s?(.*?)(?:\*\/)?\s*$/);
        if (!m || /^\s*$/.test(z[k])) break;
        if (/^\s*\/\/ Teil /.test(z[k]) && k === 0) break;
        block.unshift(m[1]);
    }
    const txt = block.join(' ').replace(/^=+\s*|\s*=+$/g, '');
    if (txt.trim()) return kuerzen(txt);
    const hinten = z[i].match(/[{;]\s*\/\/\s*(.+)$/);
    return hinten ? kuerzen(hinten[1]) : '';
}

function kopfzeile(z) {
    for (const l of z.slice(0, 3)) { const m = l.match(/^\s*\/\/\s*(?:Teil \S+:\s*)?(.+)$/); if (m) return kuerzen(m[1].replace(/^=+\s*|\s*=+$/g, '')); }
    return '';
}

function jsEintraege(z) {
    const e = [], objekte = [], namen = {};
    let alias = null;
    for (let i = 0; i < z.length; i++) {
        const l = z[i], ein = l.match(/^\s*/)[0].length;
        while (objekte.length && (ein < objekte[objekte.length - 1].ein || (ein === objekte[objekte.length - 1].ein && /^\s*\}/.test(l)))) objekte.pop();
        let m;
        const obj = objekte[objekte.length - 1];
        if (obj && obj.kind === undefined && l.trim()) obj.kind = ein;   // Einrückung der Einträge (2 oder 4 Leerzeichen)
        if (obj && ein === obj.kind && (m = l.match(/^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/) || l.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/))) {
            if (!/^(if|for|while|switch|catch|function|return)$/.test(m[1])) e.push({ name: obj.name + '.' + m[1], zeile: i + 1, text: kommentar(z, i) });
        } else if ((m = l.match(/\bfunction\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(/))) {
            e.push({ name: m[1], zeile: i + 1, text: kommentar(z, i) });
        } else if ((m = l.match(/^\s*(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$.]*)\s*=\s*(?:async\s+)?function\b/))) {
            e.push({ name: m[1], zeile: i + 1, text: kommentar(z, i) });
        } else if (ein <= 4 && (m = l.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]{2,})\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*=>/))) {
            e.push({ name: m[1], zeile: i + 1, text: kommentar(z, i) });
        }
        if ((m = l.match(/^\s*(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$.]*)\s*=\s*\{\s*(?:\/\/.*)?$/))) objekte.push({ name: m[1], ein });
        if ((m = l.match(/^\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)+)\s*=\s*([A-Za-z_$][\w$]*)\s*;/)) && m[1].endsWith('.' + m[2])) namen[m[2]] = m[1];
    }
    for (const x of e) { const p = x.name.split('.')[0]; if (namen[p] && x.name.includes('.')) x.name = namen[p] + x.name.slice(p.length); }
    return e;
}

function phpEintraege(z) {
    const e = [], aktionen = new Set();
    let klasse = null, klasseEin = -1;
    for (let i = 0; i < z.length; i++) {
        const l = z[i], ein = l.match(/^\s*/)[0].length;
        let m;
        if (klasse && ein <= klasseEin && /^\s*\}/.test(l)) klasse = null;
        if ((m = l.match(/^\s*(?:final\s+|abstract\s+)?class\s+(\w+)/))) { klasse = m[1]; klasseEin = ein; continue; }
        if ((m = l.match(/\bfunction\s+&?\s*(\w+)\s*\(/))) e.push({ name: (klasse && ein > klasseEin ? klasse + '->' : '') + m[1], zeile: i + 1, text: kommentar(z, i) });
        const re = /(?:\bcase\s+|\$(?:aktion|was|modus)\s*===?\s*)'([\w-]+)'/g;
        while ((m = re.exec(l))) if (!aktionen.has(m[1])) { aktionen.add(m[1]); e.push({ name: "'" + m[1] + "'", aktion: true, zeile: i + 1, text: kommentar(z, i) }); }
    }
    return e;
}

const abschnitte = [], index = [];
for (const g of gruppen) {
    const teile = [];
    for (const f of g.dateien) {
        const z = fs.readFileSync(f, 'utf8').split('\n');
        const eintr = f.endsWith('.php') ? phpEintraege(z) : jsEintraege(z);
        let s = '### ' + f + (kopfzeile(z) ? ' — ' + kopfzeile(z) : '') + '\n';
        for (const x of eintr) {
            s += '- ' + (x.aktion ? 'Aktion ' : '') + '`' + x.name + '` :' + x.zeile + (x.text ? ' — ' + x.text : '') + '\n';
            index.push({ name: x.aktion ? 'Aktion ' + x.name : x.name, ort: f + ':' + x.zeile });
        }
        teile.push(s);
    }
    abschnitte.push('## ' + g.titel + '\n\n' + teile.join('\n'));
}
index.sort((a, b) => { const x = a.name.toLowerCase(), y = b.name.toLowerCase(); return x < y ? -1 : x > y ? 1 : a.ort < b.ort ? -1 : a.ort > b.ort ? 1 : 0; });
const kopf = '# KARTE – wo steht was? (automatisch von werkzeuge/karte.sh, NICHT von Hand ändern)\n\n' +
    'Suchen: `grep -n "bundHilfe" KARTE.md`. Zeilen gelten in der genannten Datei (bei Teilen: im Teil, nicht in spiel.js).\n' +
    'Server-Aktionen stehen als `Aktion \'name\'`. Neu erzeugt von `werkzeuge/spiel_bauen.sh` (einzeln: `werkzeuge/karte.sh`).\n\n' +
    '## Index (Name → Datei:Zeile)\n\n' + index.map(x => '- `' + x.name + '` → ' + x.ort).join('\n') + '\n\n';
const inhalt = kopf + abschnitte.join('\n');
let alt = null;
try { alt = fs.readFileSync('KARTE.md', 'utf8'); } catch (e) { }
if (process.argv[2] === 'pruefen') {   // nur vergleichen, nichts schreiben
    if (alt === inhalt) console.log('KARTE.md aktuell');
    else { console.log('FEHLER: KARTE.md veraltet – werkzeuge/karte.sh'); process.exit(1); }
} else if (alt === inhalt) console.log('KARTE.md unverändert (' + index.length + ' Einträge)');
else { fs.writeFileSync('KARTE.md', inhalt); console.log('KARTE.md neu (' + index.length + ' Einträge)'); }
