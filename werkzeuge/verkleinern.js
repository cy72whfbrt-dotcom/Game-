// Verkleinert die Skripte, die der Browser lädt, nach Game/klein/<name>.js (läuft am Ende von werkzeuge/spiel_bauen.sh).
// Die Originale bleiben, wie sie sind: der Weltrechner, der Server (liest Namen aus spiel.js/bots.js) und die Tests lesen sie.
// Nur Leerraum und Kommentare raus und lokale Namen kürzer – nichts umgebaut (compress aus), Funktionsnamen bleiben (Fehlermeldungen
// lesbar), globale Namen bleiben (die Skripte rufen sich gegenseitig auf). Unverändertes Original: nichts zu tun (schnell).
//   node werkzeuge/verkleinern.js          → fehlende/veraltete neu, nicht mehr gebrauchte löschen
//   node werkzeuge/verkleinern.js pruefen  → nur prüfen: Fehler, wenn eine Datei in Game/klein/ nicht zu ihrem Original passt
//   node werkzeuge/verkleinern.js voll     → wie „pruefen“, und jede Datei muss da sein (hochladen.sh, alle_tests.sh, Vorschau)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const GAME = path.join(__dirname, '..', 'Game'), KLEIN = path.join(GAME, 'klein');
// dieselbe Liste wie SKRIPTE in Game/skript.php
const SKRIPTE = ['ladebildschirm', 'speichern', 'bots', 'welt', 'spiel', 'aufbau', 'buendnis', 'haendler', 'benachrichtigung'];
const OPTIONEN = { compress: false, mangle: { keep_fnames: true, keep_classnames: true }, format: { comments: false } };
const voll = process.argv[2] === 'voll', pruefen = voll || process.argv[2] === 'pruefen';
// erste Zeile: Original-Name · sha1 des Originals (skript() in server.php vergleicht ihn – nie alter Code, egal in welcher
// Reihenfolge die Dateien hochkommen) · Kennung von terser + Einstellungen (ändern sie sich, wird alles neu verkleinert)
const sha1 = x => crypto.createHash('sha1').update(x).digest('hex');
const kennung = q => '/* verkleinert aus ' + q + ' · ' + sha1(fs.readFileSync(path.join(GAME, q))) + ' · ' + sha1('terser 5.36.0 ' + JSON.stringify(OPTIONEN)).slice(0, 8) + ' */';
const frisch = f => { try { return Date.now() - fs.statSync(f).mtimeMs < 600000; } catch (e) { return true; } };   // (schon weg: auch gut)
const ersteZeile = f => { try { const fd = fs.openSync(f, 'r'), b = Buffer.alloc(200), n = fs.readSync(fd, b, 0, 200, 0); fs.closeSync(fd); return b.toString('utf8', 0, n).split('\n')[0]; } catch (e) { return ''; } };

(async () => {
    let fehler = 0, neu = 0;
    if (!pruefen) fs.mkdirSync(KLEIN, { recursive: true });
    for (const n of SKRIPTE) {
        const ziel = path.join(KLEIN, n + '.js'), k = kennung(n + '.js');
        if (ersteZeile(ziel) === k) continue;
        if (pruefen) { if (voll || fs.existsSync(ziel)) { console.log('FEHLER: Game/klein/' + n + '.js ' + (fs.existsSync(ziel) ? 'passt nicht zu Game/' + n + '.js' : 'fehlt') + ' – erst werkzeuge/spiel_bauen.sh'); fehler = 1; } continue; }
        const { minify } = require('./terser.js');
        const r = await minify(fs.readFileSync(path.join(GAME, n + '.js'), 'utf8'), OPTIONEN);
        if (!r.code) throw new Error(n + '.js: kein Ergebnis');
        const tmp = ziel + '.' + process.pid + '.neu';   // (erst ganz fertig, dann an den Platz; je Lauf eigener Name – zwei Bau-Läufe gleichzeitig, z. B. komplett.sh)
        fs.writeFileSync(tmp, k + '\n' + r.code + '\n'); fs.renameSync(tmp, ziel);
        neu++;
    }
    if (fs.existsSync(KLEIN)) for (const f of fs.readdirSync(KLEIN)) if (!SKRIPTE.includes(f.replace(/\.js$/, '')) || !f.endsWith('.js')) {
        if (f.endsWith('.neu') && frisch(path.join(KLEIN, f))) continue;   // entsteht gerade in einem anderen Lauf
        if (pruefen) { console.log('FEHLER: Game/klein/' + f + ' gehört nicht dazu – erst werkzeuge/spiel_bauen.sh'); fehler = 1; } else fs.rmSync(path.join(KLEIN, f), { force: true, recursive: true });
    }
    if (pruefen) console.log(fehler ? '' : 'Game/klein/ passt zu den Originalen'); else console.log('Game/klein/: ' + (neu ? neu + ' Skripte neu verkleinert' : 'unverändert'));
    process.exit(fehler);
})().catch(e => { console.log('FEHLER beim Verkleinern: ' + (e && e.message || e)); process.exit(1); });
