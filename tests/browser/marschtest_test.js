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
      ok(/Held: Aldric/.test(info) && /Truppen: 6,2\sMio\./.test(info) && /Restzeit: ⌛ \d+:\d\d/.test(info), `${name} ${art}: Info zeigt Held, Truppen, Ziel, Restzeit`, info);
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
      await p.click('[data-knopf="info"]', { force: true });
      const fi = await p.$eval('#karte-info', e => e.textContent);
      ok(/Held: \?/.test(fi) && /Truppen: \? \(Nebel\)/.test(fi), `${name} ${art}: Nebel: fremder Angreifer – Held und Truppen unbekannt`, fi);
      await p.mouse.click(ff[0].x + ff[0].w / 2, ff[0].y + 18);
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
      // Gemeinsamer Kampf wie im Spiel (kampfDazu): 3 eigene Märsche versetzt → EIN Kampf, ein Kreis, Truppen addiert, Armeen um das Ziel
      await leer(); await p.click('#mehr-knopf'); await p.click('#drei'); await p.click('#mehr-knopf'); await p.evaluate(() => { MT.tempo = 3; });
      ok(await bis(() => MT.kaempfe.length === 1 && MT.kaempfe[0].teile.length === 3), `${name} ${art}: 3 Angriffe treten EINEM Kampf bei`);
      const gk = await p.evaluate(() => { const k = MT.kaempfe[0], w = k.teile.map(a => a.winkel);
        return { n: MT.kaempfe.length, a0: k.a0, summe: k.teile.reduce((x, a) => x + a.truppen, 0), sieg: k.sieg, abstand: Math.min(...w.flatMap((x, i) => w.slice(i + 1).map(y => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)))))),
          dazu: MT.effekte.filter(e => e.art === 'dazu').length }; });
      ok(gk.n === 1 && gk.a0 === 12.4e6 && gk.summe === gk.a0 && gk.sieg && gk.abstand > .4, `${name} ${art}: ein Kreis, Truppen addiert (4,2+3,1+5,1 = 12,4 Mio. → Sieg), Armeen nebeneinander um das Ziel`, gk);
      ok(await bis(() => MT.effekte.some(e => e.art === 'sieg' && /3 Armeen/.test(e.text))) && await p.evaluate(() => MT.armeen.filter(a => a.phase === 'rueck' && a.beute).length === 3),
        `${name} ${art}: Sieg-Band „3 Armeen“, jede Armee geht mit ihrem Beute-Anteil heim`);
      // Verbündeter tritt bei, Verstärkung des Gegners erhöht die Verteidiger, dritte Seite wartet und kämpft danach
      await leer(); await p.evaluate(() => { MT.D.basen.find(b => b.id === 'kevin').truppen = 8.1e6; MT.dreiAngriffe(); MT.DAZU.bund(); MT.DAZU.gegner(); MT.DAZU.dritter(); MT.tempo = 3; });
      ok(await bis(() => MT.kaempfe.length === 1 && MT.armeen.some(a => a.phase === 'wartet')), `${name} ${art}: dritter Spieler kommt an und wartet`);
      const vb = await p.evaluate(() => { const k = MT.kaempfe[0]; return { n: MT.kaempfe.length, bund: k.teile.some(a => a.seite === 'bund'), d0: k.d0, a0: k.a0, verst: MT.armeen.some(a => a.art === 'verst'),
        wartet: MT.armeen.filter(a => a.phase === 'wartet').map(a => a.name) }; });
      ok(vb.n === 1 && vb.bund && vb.a0 === 4.2e6 + 2.9e6 && vb.d0 === 8.1e6 + 3.5e6 && !vb.verst && vb.wartet.join() === '[DK]Wulfgar',
        `${name} ${art}: Verbündeter addiert Angreifer, Verstärkung Gegner addiert Verteidiger, Wulfgar wartet (kein zweiter Kreis)`, vb);
      ok(await p.evaluate(() => MT.D.basen.find(b => b.id === 'kevin').verst.length === 1), `${name} ${art}: der Verstärker steht als eigenes Sechseck in der Basis`);
      ok(await bis(() => MT.kaempfe.length === 1 && MT.kaempfe[0].a.kuerzel === 'DK', null, 40000), `${name} ${art}: nach der Entscheidung kämpft der Wartende gegen die Basis`);
      const nach = await p.evaluate(() => { const k = MT.kaempfe[0], kv = MT.D.basen.find(b => b.id === 'kevin'); return { verst: kv.verst.length, d0: k.d0, brennt: kv.brennt > MT.jetzt, titel: kv.seite }; });
      ok(nach.brennt && nach.titel === 'feind', `${name} ${art}: Hauptstadt geplündert: bleibt Kevins, Garnison fällt, die Stadt brennt`, nach);
      ok(nach.verst === 0 && nach.d0 < 8.1e6, `${name} ${art}: Verteidiger verloren → Verstärker weg, Wulfgar trifft nur den Rest der Besatzung`, nach);
      // Verbündeter allein zu deinem laufenden Kampf: tritt bei (wartet nie), Summe steigt
      await leer(); await knopf('niederlage'); await p.evaluate(() => { MT.tempo = 3; });
      ok(await bis(() => MT.kaempfe.length === 1), `${name} ${art}: Kampf läuft`);
      const vor = await p.evaluate(() => { const a0 = MT.kaempfe[0].a0; MT.DAZU.bund(); return a0; });
      ok(await bis(() => MT.kaempfe[0] && MT.kaempfe[0].teile.some(a => a.seite === 'bund')), `${name} ${art}: + Verbündeter tritt dem Kampf bei`);
      const vb2 = await p.evaluate(() => ({ a0: MT.kaempfe[0].a0, wartet: MT.armeen.filter(a => a.phase === 'wartet').length, w: MT.kaempfe[0].teile.map(a => a.winkel) }));
      ok(vb2.a0 === vor + 2.9e6 && vb2.wartet === 0 && Math.abs(vb2.w[0] - vb2.w[1]) > .5, `${name} ${art}: Summe steigt um 2,9 Mio., niemand wartet, zwei getrennte Plätze`, [vor, vb2]);
      // Nebel: Märsche zwischen anderen unsichtbar; „Nebel aus“ zeigt sie
      await leer(); await p.evaluate(() => { MT.DAZU.dritter(); });
      const nb = await p.evaluate(() => { const a = MT.armeen[0], v1 = MT.versteckt(a); MT.nebel = false; const v2 = MT.versteckt(a); MT.nebel = true; return [v1, v2]; });
      ok(nb[0] === true && nb[1] === false, `${name} ${art}: Nebel: fremder Marsch zu Kevin unsichtbar, ohne Nebel sichtbar`, nb);
      // Ergebnis wie resolveAttack/barbFight: Hauptstadt geplündert + brennt; Turm erobert (Überlebende bleiben, keine Beute); Lager sofort
      await leer(); await p.evaluate(() => { MT.ERGEBNIS.turm(); MT.tempo = 3; });
      ok(await bis(() => MT.D.basen.find(b => b.id === 'turm').seite === 'eigen', null, 30000), `${name} ${art}: Turm erobert → gehört dir`);
      const tu = await p.evaluate(() => { const t = MT.D.basen.find(b => b.id === 'turm'); return { n: t.truppen, armeen: MT.armeen.length, band: MT.effekte.filter(e => e.art === 'sieg').map(e => e.titel + ' ' + e.text) }; });
      ok(tu.n === 6.2e6 - .8e6 && tu.armeen === 0 && /SIEG/.test(tu.band.join()), `${name} ${art}: Überlebende (6,2 − 0,8 Verteidigung = 5,4 Mio.) bleiben als Besatzung, keine Beute, Band SIEG`, tu);
      await p.evaluate(() => MT.zuruecksetzen(MT.D.basen.find(b => b.id === 'turm')));
      await leer(); await p.evaluate(() => { MT.ERGEBNIS.lager(); MT.tempo = 3; });
      ok(await bis(() => MT.effekte.some(e => e.titel === 'LAGER BESIEGT' && e.beute && e.beute.n > 0)), `${name} ${art}: Lager sofort besiegt, Band mit Beute-Kachel`);
      const la = await p.evaluate(() => [MT.kaempfe.length, MT.armeen[0] && MT.armeen[0].phase, MT.armeen[0] && MT.armeen[0].truppen]);
      ok(la[0] === 0 && la[1] === 'rueck' && la[2] === 6.2e6 - 1.2e6, `${name} ${art}: keine Schlacht, Überlebende (6,2 − 1,2 Mio.) heim`, la);
      await leer(); await p.evaluate(() => { MT.ERGEBNIS.lagerSchwach(); MT.tempo = 3; });
      ok(await bis(() => MT.effekte.some(e => e.titel === 'ABGEWEHRT')), `${name} ${art}: Lager zu stark → Band ABGEWEHRT`);
      const ls = await p.evaluate(() => [MT.armeen.length, MT.D.lager.truppen]);
      ok(ls[0] === 0 && ls[1] === 1.2e6 - 5e5, `${name} ${art}: Niederlage am Lager: alle Truppen weg, Lager geschwächt`, ls);
      // Friedensschild (welleHeim): Angriff prallt ab, keine Verluste, Truppen laufen heim; wer angreift, verliert seinen Schild
      await leer(); await p.evaluate(() => { MT.ERGEBNIS.kevinSchild(); MT.tempo = 3; });
      ok(await bis(() => MT.effekte.some(e => e.titel === 'SCHILD HÄLT' && /Dein Angriff prallt ab/.test(e.text))), `${name} ${art}: Kevins Schild: „Schild hält – Dein Angriff prallt ab“`);
      const sh = await p.evaluate(() => [MT.armeen[0].phase, MT.armeen[0].truppen, MT.kaempfe.length]);
      ok(sh[0] === 'rueck' && sh[1] === 6.2e6 && sh[2] === 0, `${name} ${art}: abgeprallt: kein Kampf, alle 6,2 Mio. laufen heim`, sh);
      await p.evaluate(() => { MT.ERGEBNIS.kevinSchild(); });   // (Schild wieder aus)
      await leer(); await p.evaluate(() => { MT.D.basen[0].schild = true; });
      await knopf('marsch');
      ok(await p.evaluate(() => !MT.D.basen[0].schild && MT.effekte.some(e => /Friedensschild ist gefallen, weil du angreifst/.test(e.text))), `${name} ${art}: dein Angriff lässt deinen Schild fallen`);
      // Laufzeit wie travelDurationSeconds (6–60 s) und Weg über den Pass mit Maut (beim Losschicken bezahlt); Tor zu = kein Weg
      await leer(); await knopf('marsch');
      const lz = await p.evaluate(() => MT.armeen[0].dauer);
      ok(Math.abs(lz - Math.hypot(5000, 25000 - 3600 - 7500) / 540) < 2, `${name} ${art}: Laufzeit Alex → Kevin wie im Spiel (Strecke ÷ 540/s)`, lz);
      await leer(); await p.evaluate(() => { MT.D.muenzen = 2e6; MT.ERGEBNIS.pass(); });
      const pa = await p.evaluate(() => { const a = MT.armeen[0]; return { ueber: !!a.ueber, dauer: a.dauer, muenzen: MT.D.muenzen, hinweis: MT.effekte.map(e => e.text).join('|') }; });
      ok(pa.ueber && pa.dauer === 60 && pa.muenzen === 2e6 - 560000 && /Maut bezahlt: 560\.000 Münzen an Wulfgar/.test(pa.hinweis), `${name} ${art}: über den Pass: Knick-Linie, 60 s (gedeckelt), Maut 560.000 beim Losschicken`, pa);
      await leer(); await p.click('#mehr-knopf'); await p.click('#tore'); await p.click('#mehr-knopf');
      await p.evaluate(() => MT.ERGEBNIS.pass());
      const tz = await p.evaluate(() => [MT.armeen.length, MT.effekte.some(e => /Tor ist geschlossen/.test(e.text))]);
      ok(tz[0] === 0 && tz[1], `${name} ${art}: Tor zu: kein Marsch, Hinweis „Das Tor ist geschlossen“ (kein Warten am Tor)`, tz);
      await p.click('#mehr-knopf'); await p.click('#tore'); await p.click('#mehr-knopf');
      // Zurückrufen: so lange zurück, wie schon gelaufen
      await leer(); await knopf('marsch'); await p.evaluate(() => { MT.tempo = 5; }); await p.waitForTimeout(1000);
      const zr = await p.evaluate(() => { const a = MT.armeen[0], gel = MT.jetzt - a.t0; MT.waehlen(a); document.querySelector('[data-knopf="zurueck"]').click(); return [gel, a.dauer]; });
      ok(Math.abs(zr[0] - zr[1]) < .5, `${name} ${art}: Zurückrufen: Rückweg so lange wie schon gelaufen`, zr);
      // Marsch zweimal: jeder nur mit den Truppen, die noch in der Basis sind (12,4 → 6,2 + 3,1 Mio.), nie doppelt
      await leer(); await knopf('marsch'); await knopf('marsch');
      const mz = await p.evaluate(() => MT.armeen.map(a => a.truppen));
      ok(mz.join() === '6200000,3100000', `${name} ${art}: zwei Märsche teilen die Truppen der Basis (nie doppelt)`, mz);
      // Sammeln zweimal aufs selbe Feld: der zweite tritt bei (EIN Sammler, Truppen und Traglast wachsen), Tempo bleibt
      await leer(); await p.evaluate(() => { MT.D.feld.rest = 412000; MT.D.feld.sammler = null; }); await knopf('sammeln'); await knopf('sammeln'); await p.evaluate(() => { MT.tempo = 5; });
      ok(await bis(() => MT.armeen.length === 1 && MT.armeen[0].phase === 'sammelt'), `${name} ${art}: zwei Sammel-Märsche → ein Sammler am Feld`);
      const sm = await p.evaluate(() => { const a = MT.armeen[0]; return { t: a.truppen, dazu: MT.effekte.some(e => e.art === 'dazu' && /Traglast jetzt 240/.test(e.text)) }; });
      ok(sm.t === 120000 && sm.dazu, `${name} ${art}: Truppen addiert (120 Tsd.), Hinweis „Traglast jetzt 240 Tsd. Holz“`, sm);
      ok(await bis(() => MT.armeen[0] && MT.armeen[0].phase === 'rueck' && MT.armeen[0].beute && MT.armeen[0].beute.n >= 239999), `${name} ${art}: voll beladen heim mit 240 Tsd. Holz`);
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
