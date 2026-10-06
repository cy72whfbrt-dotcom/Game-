// Fenster-Design (11b F, P5) auf dem Handy (390 × 844): Events mit 4 Reitern + Chips, roter Punkt → Abholen, Kampf mit
// Reitern „Unterwegs | Berichte“ und antippbaren Karten, Bündnis ohne Bündnis (Suchen zuerst, Gründen danach),
// Profil-Kopf kompakt (keine HUD-Werte doppelt, Rangliste nur als Weg ins eigene Fenster), Einstellungen in Gruppen.
// Aufruf: node tests/browser/handy_fenster_test.js <vorschau> [<bilder-ordner>]
const { chromium, devices } = require('playwright');
const path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof bundOp === 'function' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a), bild = async n => { if (process.argv[3]) await p.screenshot({ path: path.join(process.argv[3], n + '.png') }); };
  const zu = () => ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } const a = document.getElementById('anleitung'); if (a) a.hidden = true; });
  await zu();
  // Reiter: eine Zeile, Beschriftung ganz zu sehen, mind. 44 px hoch
  const reiter = sel => ev(sel => [...document.querySelectorAll(sel)].filter(x => x.offsetParent).map(x => { const r = x.getBoundingClientRect(), s = x.querySelector('span');
    return { t: x.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height), voll: !s || s.scrollWidth <= s.clientWidth + 1 }; }), sel);
  const gut = L => L.every(x => x.voll && x.h >= 44) && new Set(L.map(x => x.top)).size === 1;

  // 1) Events
  const e1 = await ev(() => { closeAllPopups(); inboxAdd({ src: 'fight', coins: 100 }); updateGoalsBadge(); const rot = getComputedStyle(document.getElementById('goalsBadge')).display !== 'none';
    document.getElementById('goalsBtn').click(); return { rot, tab: goalsTab, gruppe: (document.querySelector('#goalsGruppen .tab.active') || {}).dataset.ggrp, chips: document.getElementById('goalsTabs').hidden }; });
  ok(e1.rot && e1.tab === 'reward' && e1.gruppe === 'abholen' && e1.chips, 'Events: roter Punkt öffnet direkt „Abholen“ (ohne Chips)', e1);
  await p.waitForTimeout(400); await bild('n_events_abholen');
  const e2 = await reiter('#goalsGruppen .tab');
  ok(e2.length === 4 && gut(e2), 'Events: 4 Reiter in einer Zeile, ganz lesbar, ≥ 44 px', e2);
  const e3 = await ev(async () => { const out = {};
    for (const b of document.querySelectorAll('#goalsTabs [data-gtab]')) { b.click(); await new Promise(r => setTimeout(r, 120));
      const pane = [...goalsPopup.querySelectorAll('[data-gpane]')].find(x => !x.hidden), sicht = [...document.querySelectorAll('#goalsTabs [data-gtab]')].filter(x => x.offsetParent).map(x => x.dataset.gtab);
      out[b.dataset.gtab] = { tab: goalsTab, pane: pane && pane.dataset.gpane, gruppe: document.querySelector('#goalsGruppen .tab.active').dataset.ggrp, sicht: sicht.join(), chipH: Math.round(b.getBoundingClientRect().height) }; }
    return out; });
  const soll = { daily: ['daily', 'aufgaben'], ach: ['ach', 'aufgaben'], reward: ['reward', 'abholen'], pass: ['pass', 'pass'], tour: ['ev', 'ereignisse'], inv: ['ev', 'ereignisse'], drache: ['ev', 'ereignisse'], boss: ['ev', 'ereignisse'] };
  ok(Object.keys(soll).every(k => e3[k] && e3[k].tab === k && e3[k].pane === soll[k][0] && e3[k].gruppe === soll[k][1]), 'Events: jeder Unterreiter zeigt sein Fach und seine Gruppe', e3);
  ok(e3.boss.sicht === 'tour,inv,drache,boss' && e3.daily.sicht === 'daily,ach' && e3.boss.chipH >= 36, 'Events: Chips nur der offenen Gruppe sichtbar', { boss: e3.boss.sicht, daily: e3.daily.sicht });
  const e4 = await ev(() => { document.querySelector('#goalsGruppen [data-ggrp="ereignisse"]').click(); const a = goalsTab; document.querySelector('#goalsGruppen [data-ggrp="aufgaben"]').click(); const b2 = goalsTab;
    document.querySelector('#goalsGruppen [data-ggrp="pass"]').click(); return [a, b2, goalsTab]; });
  ok(e4[0] === 'boss' && e4[1] === 'ach' && e4[2] === 'pass', 'Events: Reiter merkt sich den letzten Unterreiter', e4);
  await ev(() => { document.querySelector('#goalsTabs [data-gtab="tour"]').click(); }); await p.waitForTimeout(300); await bild('n_events_ereignisse');

  // 2) Kampf: Reiter + ganze Karte antippbar
  const k1 = await ev(async () => { closeAllPopups(); combatLog.unshift({ type: 'send', at: Date.now(), toId: playerIslandId, troops: 50 }); battleLogBtn.click();
    const L = [...document.querySelectorAll('#battleTabs [data-ktab]')].map(x => x.dataset.ktab), tab = battleTab, sicht = !document.getElementById('combatLogList').hidden && document.getElementById('activeMarches').hidden;
    const row = document.querySelector('#combatLogList > .logRow'); row.querySelector('.lt b').click(); await new Promise(r => setTimeout(r, 900));
    return { L, tab, sicht, zu: !isPanelOpen(battleLogPopup), insel: isPanelOpen(document.getElementById('islandPopup')) }; });
  ok(k1.L.join() === 'unterwegs,berichte' && k1.tab === 'berichte' && k1.sicht, 'Kampf: Reiter „Unterwegs | Berichte“, neuer Bericht → Berichte', k1);
  ok(k1.zu && k1.insel, 'Kampf: Karte antippen (nicht nur „Zeigen“) zeigt die Basis', k1);
  const k2 = await ev(() => { closeAllPopups(); battleLogBtn.click(); const t1 = battleTab; document.querySelector('#battleTabs [data-ktab="unterwegs"]').click();
    return { t1, t2: battleTab, sicht: !document.getElementById('activeMarches').hidden && document.getElementById('combatLogList').hidden }; });
  ok(k2.t2 === 'unterwegs' && k2.sicht, 'Kampf: Reiter „Unterwegs“ zeigt die Märsche', k2);
  ok(gut(await reiter('#battleTabs .tab')), 'Kampf: Reiter ganz lesbar, ≥ 44 px');
  await ev(() => document.querySelector('#battleTabs [data-ktab="berichte"]').click()); await p.waitForTimeout(300); await bild('n_kampf');

  // 3) Bündnis ohne Bündnis: Suchen zuerst, Gründen danach
  const b1 = await ev(() => { closeAllPopups(); if (bundIch()) return { imBund: true }; document.getElementById('bundBtn').click();
    const liste = [...document.querySelectorAll('#bundLive .sect h4')].find(h => /Alle Bündnisse/.test(h.textContent)), kn = document.querySelector('#bundUnten [data-bact="gruendenAuf"]');
    return { tab: bundTab, liste: !!liste, knopf: !!kn, form: !!document.getElementById('bdName'), vorher: liste && kn ? !!(liste.compareDocumentPosition(kn) & Node.DOCUMENT_POSITION_FOLLOWING) : false, h: kn ? Math.round(kn.getBoundingClientRect().height) : 0 }; });
  ok(!b1.imBund && b1.tab === 'suchen' && b1.liste && b1.knopf && !b1.form && b1.vorher && b1.h >= 44, 'Bündnis: ohne Bündnis erst die Liste, darunter „Eigenes Bündnis gründen“', b1);
  await p.waitForTimeout(300); await bild('n_buendnis');
  const b2 = await ev(async () => { document.querySelector('#bundUnten [data-bact="gruendenAuf"]').click(); await new Promise(r => setTimeout(r, 1300));   // (Bündnis zeichnet jede Sekunde neu)
    document.querySelector('#bdFarben [data-farbe="2"]').click(); return { form: !!document.getElementById('bdName'), farbe: !!document.querySelector('#bundUnten #bdFarben [data-farbe="2"].on'), knopf: !!document.querySelector('#bundUnten [data-bact="gruenden"]') }; });
  ok(b2.form && b2.farbe && b2.knopf, 'Bündnis: Knopf öffnet das Gründen-Formular (Farbe wählbar, bleibt offen)', b2);

  // 4) Profil: Kopf kompakt, keine HUD-Werte doppelt, Rangliste nur als Weg, Einstellungen in Gruppen
  const p1 = await ev(() => { closeAllPopups(); document.getElementById('profileBtn').click(); const kopf = document.querySelector('#profilePopup .phead');
    return { kopfH: Math.round(kopf.getBoundingClientRect().height), naechste: !!document.querySelector('#tabInfo #xpNext') && /Stufe/.test(document.getElementById('xpNext').textContent),
      titel: !!document.querySelector('#profilePopup .overline #profileTitle'), doppelt: !!(document.getElementById('kTroops') || document.getElementById('kCoins')) || /Edelsteine/.test(document.getElementById('profileStats').textContent),
      reiter: [...document.querySelectorAll('#profileTabs .tab')].map(x => x.textContent.trim()) }; });
  ok(p1.kopfH <= 140 && p1.naechste && p1.titel, 'Profil: Kopf kompakt (Titel in der ersten Zeile, nächste Stufe im Spieler-Reiter)', p1);
  ok(!p1.doppelt, 'Profil: Truppen, Münzen, Edelsteine nicht doppelt zum HUD', p1);
  ok(p1.reiter.join() === 'Spieler,Ausrüstung,Fähigkeiten,Einstellungen' && gut(await reiter('#profileTabs .tab')), 'Profil: 4 Reiter, ganz lesbar, ≥ 44 px', p1.reiter);
  await bild('n_profil');
  const p2 = await ev(async () => { document.getElementById('tabBtnRank').click(); await new Promise(r => setTimeout(r, 300)); const o = isPanelOpen(document.getElementById('rankPopup')); closeAllPopups(); return o; });
  ok(p2, 'Profil: „Rangliste“ öffnet das Ranglisten-Fenster');
  const p3 = await ev(async () => { document.getElementById('profileBtn').click(); document.getElementById('tabBtnSet').click(); await new Promise(r => setTimeout(r, 200));
    const gr = [...document.querySelectorAll('#pushArten .p5-gruppe')].map(x => x.textContent), n = document.querySelectorAll('#pushArten [data-push-art]').length;
    const sp = [...document.querySelectorAll('#tabSet [data-sprung]')], pb = profilePopup.querySelector('.pbody');
    sp.find(x => x.dataset.sprung === 'setKonto').click(); const k = document.getElementById('setKonto').getBoundingClientRect().top - pb.getBoundingClientRect().top;
    return { gr, n, sprung: sp.map(x => x.textContent.trim()), h: Math.round(Math.min(...sp.map(x => x.getBoundingClientRect().height))), konto: Math.round(k), hilfe: !!document.querySelector('#tabSet details.p5-hilfe'), nochmal: document.getElementById('anleitungNochmal').getBoundingClientRect().height }; });
  ok(p3.gr.join() === 'Angriff,Bündnis,Events,Stadt' && p3.n === 13, 'Einstellungen: Benachrichtigungen in Gruppen, alle 13 Schalter da', p3);
  ok(p3.sprung.join() === 'Benachrichtigungen,Ton & Grafik,Konto,Hilfe' && p3.h >= 44 && p3.konto >= -2 && p3.konto < 40, 'Einstellungen: Sprung-Knöpfe (≥ 44 px) springen zur Gruppe', p3);
  ok(p3.hilfe && p3.nochmal >= 30, 'Einstellungen: Hilfe-Text eingeklappt, „Anleitung noch mal“ sichtbar', p3);
  await ev(() => { profilePopup.querySelector('.pbody').scrollTop = 0; }); await p.waitForTimeout(200); await bild('n_einstellungen');
  ok(fe.length === 0, 'keine JS-Fehler', fe.slice(0, 3));
  await b.close();
})().catch(e => { console.log('FEHLER Abbruch: ' + e.message); process.exit(1); });
