// Anleitung für neue Spieler (LIESMICH 11b D, 5./6.10.): tägliche Belohnung erst nach Schritt 2, Hauptstadt-Fenster erklärt sich,
// der nächste nötige Knopf pulsiert, Schritt 6 zählt erst nach echtem Abholen, Schritt 7 erklärt die Knöpfe ohne Text (auch den Würfel = Rohstoffe, Verstanden),
// Schritt 2 beginnt positiv, Schritt 1 springt bei einer neutralen Basis gleich weiter (6.10. Spieltest), Belohnung nur beim ersten Mal, „Anleitung noch mal“ in den Einstellungen, „×“ fragt erst im Spiel (kein confirm()), alter
// Stand mit 6 Schritten bleibt fertig. Leiste kompakt: Schritt, Text und „×“ in einer Zeile. Handy (390×844) + Desktop. Bilder in den Arbeitsordner (process.argv[3]), wenn angegeben.
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
const ANFANG = () => { window.__OW = { neu: true, nameGewaehlt: true }; window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; };
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] }); const fe = [], bilder = process.argv[3], url = 'file://' + path.resolve(process.argv[2]) + '/index.html';
  const laden = async (ctx, vorher) => {
    const p = await ctx.newPage(); p.on('pageerror', e => fe.push(e.message)); await p.addInitScript(vorher);
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => typeof anleitung !== 'undefined' && typeof islands !== 'undefined' && islands.length && islandById[playerIslandId] && typeof anleitungZeigen === 'function', null, { timeout: 90000, polling: 500 }).catch(() => {});
    await p.waitForTimeout(4000); return p;
  };
  for (const [art, opt] of [['Handy', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['Desktop', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext(opt), p = await laden(ctx, ANFANG);
    const bild = async n => { if (bilder) await p.screenshot({ path: path.join(bilder, (art === 'Handy' ? 'm_' : 'd_') + n + '.png') }); };
    const r = await p.evaluate(async () => {
      const warte = ms => new Promise(f => setTimeout(f, ms)), bis = async (f, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await warte(150); } return !!f(); };
      const el = id => document.getElementById(id), zu = id => el(id).hidden, puls = e => !!e && getComputedStyle(e).animationName === 'anl-puls';
      const o = {};
      // 1) Start: Schritt 1, keine tägliche Belohnung (obwohl abholbar), das Fadenkreuz pulsiert
      o.start = { schritt: anleitung.schritt, sicht: !zu('anleitung'), text: el('anleitungSchritt').textContent, daily: zu('dailyModal'), abholbar: dailyClaimable(), puls: document.body.dataset.anlPuls, heim: puls(el('homeBtn')) };
      const rT = el('anleitungText').getBoundingClientRect(), mitte = e => { const q = e.getBoundingClientRect(); return (q.top + q.bottom) / 2; };
      o.start.zeile = { hoehe: Math.round(el('anleitung').getBoundingClientRect().height), eine: ['anleitungSchritt', 'anleitungWeg'].every(id => mitte(el(id)) > rT.top && mitte(el(id)) < rT.bottom) };   // Schritt · Text · × nebeneinander
      // 2) Hauptstadt antippen: der erklärende Satz im Fenster, weiter zu Schritt 2 – noch immer keine tägliche Belohnung
      openIslandPopup(islandById[playerIslandId]); await bis(() => anleitung.schritt === 1);
      const sa = el('popupAnleitung'); o.haupt = { schritt: anleitung.schritt, text: el('anleitungText').textContent, satz: !sa.hidden && sa.getBoundingClientRect().height > 0 && /Hier stehen deine Truppen\. Mit ihnen greifst du an und sammelst\./.test(sa.textContent) };
      closeAllPopups(); await warte(1300); o.haupt.daily = zu('dailyModal');
      // 3) neutrale Basis antippen: „Angreifen“ pulsiert; Angriff gestartet → Schritt 3, danach kommt die tägliche Belohnung
      const nb = islands.filter(i => anleitungNeutral(i.id) && islandSeen(i) && i.id !== playerIslandId).sort((x, y) => Math.hypot(x.x - islandById[playerIslandId].x, x.y - islandById[playerIslandId].y) - Math.hypot(y.x - islandById[playerIslandId].x, y.y - islandById[playerIslandId].y))[0];
      if (nb) { openIslandPopup(nb); await bis(() => document.body.dataset.anlPuls === 'angriff'); }
      o.angriff = { neutral: !!nb, puls: document.body.dataset.anlPuls, knopf: puls(attackBtn), satzWeg: el('popupAnleitung').hidden };
      closeAllPopups(); questProgress('attack', 1); await bis(() => anleitung.schritt === 2);
      o.angriff.schritt = anleitung.schritt; o.angriff.daily = await bis(() => !zu('dailyModal'));
      closeDailyModal(); await warte(300);
      // 4) Schritt 6: Events öffnen allein reicht nicht, solange etwas abholbar ist – erst echtes Abholen
      anleitung.schritt = 5; anleitungZeigen(); openGoals(); await warte(1300);
      const knoepfe = [...el('goalsPopup').querySelectorAll('button')].filter(x => x.offsetParent && puls(x));
      o.events = { bereit: eventsBereit(), schritt: anleitung.schritt, puls: document.body.dataset.anlPuls, pulsKnopf: knoepfe.length };
      el('goalsPopup').querySelector('[data-daily]') ? el('goalsPopup').querySelector('[data-daily]').click() : showDailyModal(); await warte(200);
      el('dailyModalBtn').click(); await warte(200); closeDailyModal();
      o.events.abgeholt = await bis(() => anleitung.schritt === 6); o.events.nichtAbholbar = !dailyClaimable();
      // 5) Schritt 7: Knöpfe ohne Text erklärt, alle Karten-Knöpfe pulsieren, „Verstanden“ schließt ab → Belohnung einmal ins Abholfach
      closeAllPopups(); await warte(1300);
      const ok7 = el('anleitungOk'), bar = el('anleitung').getBoundingClientRect(), okR = ok7.getBoundingClientRect();
      o.knoepfe = { sicht: !zu('anleitung'), text: el('anleitungText').textContent, ok: !ok7.hidden && okR.width > 0 && okR.right <= innerWidth + 1 && okR.bottom <= innerHeight + 1 && okR.top >= bar.top - 1,
        puls: ['homeBtn', 'markerBtn', 'armyBtn', 'zoomInBtn'].every(id => puls(el(id))), wurfelPuls: puls(el('hudRoh')), wegSicht: !zu('anleitungWeg'),
        okUnten: okR.top >= el('anleitungText').getBoundingClientRect().bottom - 1 };
      const geschenke = () => inboxList().filter(x => x.title === 'Anleitung geschafft').length, g0 = geschenke();
      ok7.click(); await bis(() => anleitung.schritt >= ANLEITUNG.length);
      o.fertig = { schritt: anleitung.schritt, belohnt: anleitung.belohnt, geschenk: geschenke() - g0, weg: zu('anleitung'), puls: document.body.dataset.anlPuls || '', gespeichert: JSON.parse(store.get('openWaterAnleitung')).belohnt === true };
      // 6) „Anleitung noch mal“ (Profil → Einstellungen): von vorn, am Ende keine zweite Belohnung
      el('profileBtn').click(); await warte(300); showProfileTab('set'); await warte(300);
      const nm = el('anleitungNochmal'), nmR = nm.getBoundingClientRect(); o.nochmal = { knopf: nmR.width > 0 && nmR.height > 0 };
      nm.click(); await warte(400); o.nochmal.schritt = anleitung.schritt; o.nochmal.sicht = await bis(() => !zu('anleitung')); o.nochmal.profilZu = !isPanelOpen(el('profilePopup'));
      const g1 = geschenke(), gems1 = gems; anleitung.schritt = ANLEITUNG.length - 1; anleitungZeigen(); await warte(200); el('anleitungOk').click(); await bis(() => anleitung.schritt >= ANLEITUNG.length);
      o.nochmal.fertig = anleitung.schritt >= ANLEITUNG.length; o.nochmal.keinZweites = geschenke() === g1 && gems === gems1;
      // 7) „×“: erst „Wirklich überspringen?“ im Spiel; „Weiter lernen“ bleibt, „Überspringen“ beendet – nie confirm()
      nm.click(); await bis(() => !zu('anleitung')); const s0 = anleitung.schritt;
      el('anleitungWeg').click(); await warte(1300);
      const fr = el('anleitungFrage'), ja = el('anleitungJa').getBoundingClientRect(), nein = el('anleitungNein').getBoundingClientRect(), bar2 = el('anleitung').getBoundingClientRect();
      o.frage = { sicht: !fr.hidden, text: /wirklich überspringen/i.test(el('anleitungText').textContent), schritt: anleitung.schritt === s0, laeuft: anleitung.schritt < ANLEITUNG.length,
        knoepfeDrin: [ja, nein].every(k => k.width > 0 && k.left >= bar2.left - 1 && k.right <= bar2.right + 1 && k.right <= innerWidth && k.bottom <= innerHeight), xWeg: zu('anleitungWeg') };
      el('anleitungNein').click(); await warte(300);
      o.frage.nein = { frageZu: fr.hidden, laeuft: anleitung.schritt === s0, text: !/wirklich/i.test(el('anleitungText').textContent) };
      let taeglich = 0; const md = maybeShowDaily; maybeShowDaily = function () { taeglich++; return md.apply(this, arguments); };   // nach dem Überspringen kommt die tägliche Belohnung
      el('anleitungWeg').click(); await warte(200); el('anleitungJa').click(); await warte(300);
      o.frage.ja = { fertig: anleitung.schritt >= ANLEITUNG.length, weg: zu('anleitung') }; o.frage.confirms = window.__confirms;
      o.frage.ja.taeglich = await bis(() => taeglich > 0, 4000); maybeShowDaily = md;
      // 8) Schritt 1, aber der Spieler tippt schon eine fremde Basis: kein stehengebliebenes „Tippe auf deine Hauptstadt“
      closeAllPopups(); nm.click(); await bis(() => anleitung.schritt === 0 && !zu('anleitung'));
      const fremd = islands.find(i => islandOwnerOf(i.id) && islandOwnerOf(i.id) !== 'player' && !bossAt(i.id)), sah = islandSeen;
      if (fremd) { islandSeen = () => true; try { openIslandPopup(fremd); } finally { islandSeen = sah; } await warte(1300); }   // (im Nebel ginge kein Fenster auf)
      o.vorweg = { fremd: !!fremd, offen: anleitungInsel() ? popupIslandId : null, schritt: anleitung.schritt, text: el('anleitungText').textContent };
      closeAllPopups(); await warte(300);
      if (nb) { openIslandPopup(nb); await warte(100); attackBtn.click(); }   // gleich „Angriff vorbereiten“
      o.vorweg.neutral = await bis(() => anleitung.schritt === 1); o.vorweg.neutralText = el('anleitungText').textContent; o.vorweg.ansicht = popupView;
      closeAllPopups();
      return o;
    }).catch(e => ({ fehler: e.message }));
    ok(!r.fehler, art + ': Szenen laufen', r.fehler);
    if (r.fehler) { await ctx.close(); continue; }
    ok(r.start.schritt === 0 && r.start.sicht && r.start.text === 'Schritt 1/7', art + ': neuer Spieler sieht Schritt 1/7', r.start);
    ok(r.start.abholbar && r.start.daily && r.haupt.daily, art + ': tägliche Belohnung beim ersten Start NICHT vor Schritt 2', { start: r.start.daily, nachSchritt1: r.haupt.daily });
    ok(r.start.zeile.eine && r.start.zeile.hoehe <= (art === 'Handy' ? 110 : 80), art + ': Leiste kompakt: Schritt, Text und „×“ in einer Zeile', r.start.zeile);
    ok(r.start.puls === 'heim' && r.start.heim, art + ': Schritt 1: das Fadenkreuz (zur Hauptstadt) pulsiert', r.start);
    ok(r.haupt.schritt === 1 && r.haupt.satz, art + ': Hauptstadt-Fenster erklärt sich („Hier stehen deine Truppen …“)', r.haupt);
    ok(/^Gut!/.test(r.haupt.text) && !/keine neutrale/.test(r.haupt.text), art + ': Schritt 2 beginnt positiv (Hauptstadt noch offen: „Gut! …“, kein Fehler-Satz)', r.haupt.text);
    ok(r.angriff.neutral && r.angriff.puls === 'angriff' && r.angriff.knopf && r.angriff.satzWeg, art + ': Schritt 2: bei einer neutralen Basis pulsiert „Angreifen“', r.angriff);
    ok(r.angriff.schritt === 2 && r.angriff.daily, art + ': nach Schritt 2 kommt die tägliche Belohnung', r.angriff);
    ok(r.events.bereit > 0 && r.events.schritt === 5 && r.events.puls === 'abholen' && r.events.pulsKnopf > 0, art + ': Schritt 6: Events öffnen allein zählt nicht, „Abholen“ pulsiert', r.events);
    ok(r.events.abgeholt && r.events.nichtAbholbar, art + ': Schritt 6 zählt nach echtem Abholen', r.events);
    ok(r.knoepfe.sicht && /Fadenkreuz/.test(r.knoepfe.text) && /Fahne/.test(r.knoepfe.text) && /Schwerter/.test(r.knoepfe.text) && r.knoepfe.ok && r.knoepfe.okUnten && r.knoepfe.puls, art + ': Schritt 7 erklärt die Knöpfe ohne Text, „Verstanden“ sichtbar (unter dem Text), Knöpfe pulsieren', r.knoepfe);
    ok(/Würfel/.test(r.knoepfe.text) && /Rohstoffe/.test(r.knoepfe.text) && r.knoepfe.wurfelPuls, art + ': Schritt 7 erklärt den Würfel oben (Rohstoffe), er pulsiert mit', r.knoepfe);
    ok(r.fertig.schritt === 7 && r.fertig.belohnt && r.fertig.geschenk === 1 && r.fertig.weg && r.fertig.puls === '' && r.fertig.gespeichert, art + ': fertig: einmal Belohnung ins Abholfach, nichts pulsiert mehr', r.fertig);
    ok(r.nochmal.knopf && r.nochmal.schritt === 0 && r.nochmal.sicht && r.nochmal.profilZu, art + ': „Anleitung noch mal“ startet von vorn', r.nochmal);
    ok(r.nochmal.fertig && r.nochmal.keinZweites, art + ': zweiter Durchgang: keine zweite Belohnung', r.nochmal);
    ok(r.frage.sicht && r.frage.text && r.frage.schritt && r.frage.laeuft && r.frage.knoepfeDrin && r.frage.xWeg, art + ': „×“ fragt erst „Wirklich überspringen?“ (Knöpfe ganz im Bild)', r.frage);
    ok(r.frage.nein.frageZu && r.frage.nein.laeuft && r.frage.nein.text, art + ': „Weiter lernen“ lässt die Anleitung weiterlaufen', r.frage.nein);
    ok(r.frage.ja.fertig && r.frage.ja.weg && r.frage.confirms === 0, art + ': „Überspringen“ beendet sie – ohne Browser-Fenster (confirm)', r.frage);
    ok(r.frage.ja.taeglich, art + ': nach „Überspringen“ wird die tägliche Belohnung angeboten (nicht erst beim nächsten Laden)', r.frage.ja);
    ok(r.vorweg.fremd && r.vorweg.schritt === 0 && /nicht deine Hauptstadt/.test(r.vorweg.text), art + ': Schritt 1 + fremde Basis offen: Hinweis „Das ist nicht deine Hauptstadt …“ statt des alten Satzes', r.vorweg);
    ok(r.vorweg.neutral && /Angreifen/.test(r.vorweg.neutralText), art + ': Schritt 1 + neutrale Basis (Angriff vorbereiten): springt zu Schritt 2 („Angreifen“)', r.vorweg);
    await bild('anleitung');
    await ctx.close();
  }
  // alter Stand (6 Schritte, fertig) bleibt fertig – keine neue Belohnung, nichts zu sehen
  { const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await laden(ctx, () => { localStorage.setItem('openWaterReset', '1'); localStorage.setItem('openWaterAnleitung', '{"schritt":6}'); window.__OW = { nameGewaehlt: true }; });
    const r = await p.evaluate(() => ({ schritt: anleitung.schritt, belohnt: anleitung.belohnt, weg: document.getElementById('anleitung').hidden, geschenk: inboxList().some(x => x.title === 'Anleitung geschafft') })).catch(e => ({ fehler: e.message }));
    ok(r.schritt === 7 && r.belohnt === true && r.weg && !r.geschenk, 'alter Stand (6 von 6) bleibt fertig, keine zweite Belohnung', r);
    await ctx.close(); }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
