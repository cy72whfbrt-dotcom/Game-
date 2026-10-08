// Marsch-Testdatei (werkzeuge/marschtest, Merkliste 23): lädt ohne Fehler (Handy + Desktop), alle Bilder da, die Testknöpfe lösen
// ihre Zustände aus (Marsch, Sammeln, Späher, Rally sammeln → Rally-Marsch, Kampf mit Wellen, Sieg/Niederlage-Band, Rückweg mit Beute,
// Zurückrufen mit weißer Fahne, Feind auf dich zu), Verluste = Summe der Wellen und nie „-0“, Antippen der Armee zeigt die runden
// Knöpfe (eigene: Info/Zurück/Schneller, fremde: Info/Angreifen/Spähen), Info öffnet die Kurzinfo, Zoom-Knopf geht alle 4 Stufen durch.
// Leistung: „Gedränge“ (12 Armeen + 2 Kämpfe) am Handy ≥ 30 Bilder/s; die Einzeldatei (data-URLs) läuft auch.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const M = path.resolve(__dirname, '../../werkzeuge/marschtest'), arbeit = process.argv[3] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'mt-'));
(async () => {
  const fehlt = fs.readFileSync(path.join(M, 'marschtest.js'), 'utf8').match(/const MARSCH = \[([^\]]+)\]/)[1].match(/'[a-z_]+'/g).map(n => n.slice(1, -1))
    .filter(n => !['eigen', 'bund', 'feind'].includes(n)).concat(['eigen', 'bund', 'feind'].flatMap(s => ['runter', 'hoch', 'kampf', 'verletzt'].map(a => `trupp_${s}_${a}`)))
    .filter(n => !fs.existsSync(path.join(M, 'bilder', 'marsch_' + n + '.webp')));
  ok(!fehlt.length, 'alle marsch_*.webp liegen in werkzeuge/marschtest/bilder', fehlt);
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const pruefen = async (datei, name, nurLaden) => {
    for (const [art, opt] of [['Handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['Desktop', { viewport: { width: 1440, height: 900 } }]]) {
      const p = await (await b.newContext(opt)).newPage(), fe = [];
      p.on('pageerror', e => fe.push(e.message)); p.on('console', m => { if (m.type() === 'error') fe.push(m.text()); });
      await p.goto('file://' + datei); await p.waitForFunction(() => window.MT && MT.bereit(), null, { timeout: 60000 });
      const start = await p.evaluate(() => MT.armeen.map(a => a.seite + ':' + a.phase));
      ok(start.includes('eigen:hin') && start.includes('feind:hin'), `${name} ${art}: lädt mit eigenem Marsch und Feind auf dich zu`, start);
      if (nurLaden) { await p.waitForTimeout(800); ok(!fe.length, `${name} ${art}: ohne Fehler`, fe); await p.close(); continue; }
      const leer = () => p.evaluate(() => { MT.armeen.length = 0; MT.kaempfe.length = 0; MT.effekte.length = 0; MT.waehlen(null); MT.tempo = 1; });
      const knopf = n => p.click(`[data-zustand="${n}"]`);
      const bis = (f, arg, ms = 20000) => p.waitForFunction(f, arg, { timeout: ms }).then(() => true, () => false);
      // Antippen der eigenen Armee → runde Knöpfe, Info → Kurzinfo
      await leer(); await knopf('marsch'); await p.waitForTimeout(600);
      const f = await p.evaluate(() => MT.armeen[0].flaeche);
      await p.mouse.click(f.x + f.w / 2, f.y + 18);
      const kn = await p.$$eval('#knoepfe button', bs => bs.map(b => b.dataset.knopf));
      ok(kn.join() === 'info,zurueck,schneller', `${name} ${art}: Antippen der eigenen Armee zeigt runde Knöpfe`, kn);
      const groesse = await p.$eval('#knoepfe button', b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; });
      ok(groesse[0] >= 44 && groesse[1] >= 44, `${name} ${art}: Knöpfe mindestens 44 px`, groesse);
      await p.click('[data-knopf="info"]', { force: true });
      const info = await p.$eval('#karte-info', e => e.classList.contains('offen') && e.textContent);
      ok(/Held: Aldric/.test(info) && /Truppen: 12,4\sMio\./.test(info) && /Restzeit: ⌛ \d+:\d\d/.test(info), `${name} ${art}: Info zeigt Held, Truppen, Ziel, Restzeit`, info);
      const vorher = await p.evaluate(() => MT.armeen[0].dauer - (MT.jetzt - MT.armeen[0].t0));
      await p.mouse.click(f.x + f.w / 2, f.y + 18); await p.click('[data-knopf="schneller"]', { force: true });
      const nachher = await p.evaluate(() => [MT.armeen[0].dauer - (MT.jetzt - MT.armeen[0].t0), document.querySelector('[data-knopf="schneller"] i').textContent]);
      ok(nachher[0] < vorher * .6 && nachher[1] === '11', `${name} ${art}: Schneller halbiert die Restzeit, Zähler 12 → 11`, [vorher, nachher]);
      await p.click('[data-knopf="zurueck"]', { force: true });
      const zur = await p.evaluate(() => [MT.armeen[0].phase, MT.armeen[0].zurueck, document.querySelectorAll('#knoepfe button').length]);
      ok(zur[0] === 'rueck' && zur[1] && zur[2] === 0, `${name} ${art}: Zurück dreht die Armee um (weiße Fahne), Knöpfe zu`, zur);
      // fremde Armee: Info / Angreifen / Spähen
      await leer(); await p.click('#mehr-knopf'); await p.click('#seite'); await p.click('#seite'); await p.click('#mehr-knopf');
      await knopf('marsch'); await p.waitForTimeout(600);
      const ff = await p.evaluate(() => [MT.armeen[0].flaeche, MT.armeen[0].ziel.id]);
      await p.mouse.click(ff[0].x + ff[0].w / 2, ff[0].y + 18);
      const kf = await p.$$eval('#knoepfe button', bs => bs.map(b => b.dataset.knopf));
      ok(kf.join() === 'info,angreifen,spaehen' && ff[1] === 'eigen', `${name} ${art}: Feind auf dich zu, Antippen zeigt Info/Angreifen/Spähen`, [kf, ff[1]]);
      await p.click('[data-knopf="spaehen"]', { force: true });
      ok(await p.evaluate(() => MT.armeen.some(a => a.art === 'spaeher' && a.seite === 'eigen')), `${name} ${art}: Spähen schickt einen Späher los`);
      await p.click('#mehr-knopf'); await p.click('#seite'); await p.click('#seite'); await p.click('#mehr-knopf');
      // Sieg: Kampf mit Wellen → Band → Rückweg mit Beute
      await leer(); await knopf('sieg'); await p.evaluate(() => { MT.tempo = 3; });
      ok(await bis(() => MT.kaempfe.length === 1), `${name} ${art}: Sieg-Knopf: Kampf beginnt`);
      const k = await p.evaluate(() => { const k = MT.kaempfe[0]; return { aV: k.aV, dV: k.dV, a: k.wellen.filter(w => w.s === 'a').reduce((x, w) => x + w.n, 0), d: k.wellen.filter(w => w.s === 'd').reduce((x, w) => x + w.n, 0), min: Math.min(...k.wellen.map(w => w.n)) }; });
      ok(k.a === k.aV && k.d === k.dV && k.min >= 1, `${name} ${art}: Verluste = Summe der Wellen, keine Welle 0 (nie „-0“)`, k);
      ok(await bis(() => MT.effekte.some(e => e.art === 'sieg')), `${name} ${art}: am Ende das Sieg-Band`);
      const heim = await p.evaluate(() => { const a = MT.armeen[0]; return [a.phase, a.beute && a.beute.bild, a.beute && a.beute.n > 0]; });
      ok(heim[0] === 'rueck' && heim[1] === 'beute_muenzen' && heim[2], `${name} ${art}: danach Rückweg mit Beute-Kachel (Bild + Zahl)`, heim);
      await leer(); await knopf('niederlage'); await p.evaluate(() => { MT.tempo = 3; });
      ok(await bis(() => MT.effekte.some(e => e.art === 'niederlage')) && await p.evaluate(() => MT.armeen[0].verletzt), `${name} ${art}: Niederlage-Band, Trupp verletzt`);
      // Sammeln, Späher, Rally
      await leer(); await knopf('sammeln'); await p.evaluate(() => { MT.tempo = 5; });
      ok(await bis(() => MT.armeen[0] && MT.armeen[0].phase === 'sammelt') && await bis(() => MT.armeen[0] && MT.armeen[0].beute && MT.armeen[0].beute.bild === 'beute_holz'), `${name} ${art}: Sammeln: hin, sammelt, heim mit Holz`);
      await leer(); await knopf('spaeher'); await p.evaluate(() => { MT.tempo = 5; });
      ok(await bis(() => MT.effekte.some(e => e.art === 'licht')), `${name} ${art}: Späher: Lichtring am Ziel`);
      await leer(); await knopf('rally');
      const r0 = await p.evaluate(() => MT.armeen.map(a => a.art + ':' + a.phase).join());
      await p.evaluate(() => { MT.tempo = 5; });
      ok(/rally:sammelt/.test(r0) && await bis(() => MT.armeen.some(a => a.art === 'rally' && a.phase === 'hin' && a.rally.mitglieder.length === 4)), `${name} ${art}: Rally sammelt (3 Beitritte), dann Rally-Marsch mit 4 Mitgliedern`, r0);
      ok(await bis(() => MT.effekte.some(e => e.art === 'pfeile')) && await bis(() => MT.kaempfe.length === 1), `${name} ${art}: Rally kommt an (Pfeile von allen Seiten), dann Kampf`);
      // Zurückrufen ohne laufenden Marsch: Marsch geht los und dreht nach 2,5 s
      await leer(); await knopf('zurueck');
      ok(await bis(() => MT.armeen[0] && MT.armeen[0].phase === 'rueck' && MT.armeen[0].zurueck), `${name} ${art}: Zurückrufen dreht einen Marsch um`);
      // Zoom-Knopf: Mittel, Weit, Ganz weit, Nah
      const st = [];
      for (let i = 0; i < 4; i++) { await p.click('#zoom'); await p.waitForTimeout(150); st.push(await p.evaluate(() => MT.stufe())); }
      ok(st.join() === 'mittel,weit,ganz weit,nah', `${name} ${art}: Zoom-Knopf geht alle Stufen durch`, st);
      // Gedränge: 12 Armeen + 2 Kämpfe, Bilder/s über 3 s gezählt
      await leer(); await p.evaluate(() => MT.gedraenge()); await p.waitForTimeout(1000);
      const bps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }));
      const anz = await p.evaluate(() => [MT.armeen.length, MT.kaempfe.length]);
      ok(anz[0] >= 12 && anz[1] === 2 && (art === 'Desktop' || bps >= 30), `${name} ${art}: Gedränge ${anz[0]} Armeen, ${anz[1]} Kämpfe, ${bps} Bilder/s (Handy ≥ 30)`, bps);
      ok(!fe.length, `${name} ${art}: ohne Fehler`, fe);
      await p.close();
    } };
  await pruefen(path.join(M, 'marschtest.html'), 'Marschtest');
  const ein = path.join(arbeit, 'marschtest_einzeln.html');
  execFileSync('node', [path.join(M, 'einzeln_bauen.js'), ein]);
  const mb = fs.statSync(ein).size / 1048576;
  ok(mb < 12, 'Einzeldatei < 12 MB', mb.toFixed(2));
  await pruefen(ein, 'Einzeldatei', true);
  await b.close();
})();
