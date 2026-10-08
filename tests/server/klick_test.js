// Großer Klick-Test auf dem lokalen Server: alle Fenster, Reiter, Knöpfe + Texte prüfen + Kernabläufe (neuer Spieler)
// Aufruf: node klick_test.js <neuer-spielername> [bilder-ordner]. Danach: neu laden (bleibt alles?), keine Schummel-Hinweise für den neuen Spieler.
const path = require('path'), fs = require('fs');
const G = require('./gemeinsam');
const { ok, ende, warte } = G;
const D = process.argv[2] || ('pruefer' + Date.now().toString(36).slice(-5)), OUT = process.argv[3] || require('os').tmpdir();
const SCHLECHT = /undefined|NaN|\bnull\b|\[object|Infinity|Invalid Date|\bVIP\b|Turnier|Drachenturm|Piratenfestung|Weltboss|Mo–So|Montag bis Sonntag/;
let b;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  b = await G.browser(); const fehler = [], texte = [];
  let wo = 'start';
  const p = await G.rein(b, D, { neu: true, fehler: { push: t => fehler.push(wo + ': ' + t.replace(/^[^:]*: /, '')) }, konsole: true, warte: 15000 });
  await G.willkommen(p, 'Pruefer'); await p.waitForTimeout(2000);
  const ev = (f, a) => p.evaluate(f, a);
  const zu = () => ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } try { if (!document.getElementById('heroHall').hidden) closeHeroHall(); } catch (e) {} document.querySelectorAll('.marker-sheet:not([hidden])').forEach(x => x.hidden = true); });
  const klick = s => ev(s => document.querySelector(s).click(), s);
  await zu();
  const pruef = async (name) => { const t = await ev(() => [...document.querySelectorAll('.panel.is-open, #citySheet:not([hidden]), #armySheet:not([hidden]), .marker-sheet:not([hidden]), #midBar, #anleitung:not([hidden])')].map(e => e.innerText).join('\n')); for (const z of t.split('\n')) if (SCHLECHT.test(z)) texte.push(name + ' → ' + z.trim().slice(0, 140)); return t.length; };
  const out = { fenster: {} };
  const PANELS = [['#bundBtn', 'bundPopup', '#bundPopup [data-btab]'], ['#battleLogBtn', 'battleLogPopup', '#battleLogPopup [data-ktab]'], ['#goalsBtn', 'goalsPopup', '#goalsPopup [data-gtab]'], ['#shopBtn', 'shopPopup', '#shopPopup [data-stab]'], ['#profileBtn', 'profilePopup', '#profilePopup [id^=tabBtn]']];
  for (const [btn, pan, tabs] of PANELS) {
    wo = pan; await zu(); await ev(() => document.querySelectorAll('.panel.is-open').forEach(x => closePanel(x)));
    await klick(btn); await p.waitForTimeout(600);
    const tabIds = tabs ? await ev(s => [...document.querySelectorAll(s)].map((x, i) => i), tabs) : [null];
    const info = { offen: await ev(pan => isPanelOpen(document.getElementById(pan)), pan), reiter: {} };
    for (const i of tabIds) {
      if (i !== null) { wo = pan + '#' + i; await ev(([s, i]) => document.querySelectorAll(s)[i].click(), [tabs, i]); await p.waitForTimeout(500); }
      const nm = i === null ? 'haupt' : await ev(([s, i]) => document.querySelectorAll(s)[i].textContent.trim().slice(0, 20), [tabs, i]);
      info.reiter[nm] = await pruef(pan + '/' + nm);
      await p.screenshot({ path: path.join(OUT, 'z_' + pan + '_' + (i ?? 0) + '.png') });
      // jeden sichtbaren Knopf im Fenster einmal drücken (außer Schließen/Abmelden/Überspringen)
      const n = await ev(pan => [...document.getElementById(pan).querySelectorAll('button')].filter(x => x.offsetParent && !x.disabled).length, pan);
      let gedrueckt = 0;
      for (let k = 0; k < Math.min(n, 30); k++) {
        const r = await ev(([pan, k]) => { const bs = [...document.getElementById(pan).querySelectorAll('button')].filter(x => x.offsetParent && !x.disabled); const x = bs[k]; if (!x) return null;
          const t = (x.textContent || x.getAttribute('aria-label') || x.id || '').trim().slice(0, 30);
          if (/close|schlie|abmelden|zurück|Close/i.test(t + x.className + x.id) || x.closest('form[action]') || x.matches('[id^=tabBtn],[data-gtab],[data-ggrp],[data-ktab],[data-stab],[data-btab]') || /Passwort|Name ändern|Verkaufen|Verlassen|Austreten|Auflösen|löschen/i.test(t) || /^(beitreten|anfrage|anfrageWeg|einlJa|einlNein|einlAn|einlWeg)$/.test(x.dataset.bact || '')) return '-';   // (Beitreten-Knöpfe der Bündnis-Startseite: sonst > 40 Bündnis-Befehle/Minute = Flut-Hinweis)
          x.click(); return t; }, [pan, k]);
        if (r && r !== '-') { gedrueckt++; wo = pan + '/' + nm + ' Knopf „' + r + '“'; await p.waitForTimeout(250); await zu(); await pruef(wo);
          const offen = await ev(pan => isPanelOpen(document.getElementById(pan)), pan);
          if (!offen) { await ev(() => { document.querySelectorAll('.panel.is-open').forEach(x => closePanel(x)); const c = document.getElementById('cityView'); }); await klick(btn); await p.waitForTimeout(300); if (i !== null) { await ev(([s, i]) => document.querySelectorAll(s)[i].click(), [tabs, i]); await p.waitForTimeout(200); } }
        }
      }
      info.reiter[nm] += ' (' + gedrueckt + ' Knöpfe)';
    }
    out.fenster[pan] = info;
  }
  await ev(() => document.querySelectorAll('.panel.is-open').forEach(x => closePanel(x)));
  // Stadt: jedes Gebäude öffnen
  wo = 'stadt'; await zu(); await klick('#cityNavBtn'); await p.waitForTimeout(1500);
  out.stadt = await ev(async () => { const ids = ['_keep'].concat(CITY_BUILDINGS.map(b => b.id)); const r = []; for (const id of ids) { try { cityOpenId = id; if (id === '_keep') renderKeepSheet(); else renderCitySheet(); document.getElementById('citySheet').hidden = false; r.push(id + ':' + document.getElementById('citySheet').innerText.length); } catch (e) { r.push(id + ' FEHLER ' + e.message); } await new Promise(z => setTimeout(z, 60)); } return r; }).catch(e => 'FEHLER ' + e.message);
  await pruef('stadt'); await p.screenshot({ path: path.join(OUT, 'z_stadt.png') });
  out.holzBau = await ev(async () => { cityOpenId = 'lumber'; renderCitySheet(); const up = document.getElementById('cityUpgradeBtn'); if (up.disabled) return 'aus: ' + up.textContent; const L0 = (loadCity().levels || {}).lumber || 0; up.click(); for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 500)); const c = loadCity(); if ((c.builds || []).some(x => x.id === 'lumber') || ((c.levels || {}).lumber || 0) > L0) return 'lumber'; } return 'kein Bau (Stufe ' + L0 + ')'; }).catch(e => 'FEHLER ' + e.message);
  await ev(() => { document.getElementById('citySheet').hidden = true; document.getElementById('cityCloseBtn') && document.getElementById('cityCloseBtn').click(); });
  await p.waitForTimeout(800);
  // Angriff auf eine neutrale Basis
  wo = 'angriff'; await zu();
  // Ziel: die nächste neutrale Basis, die man sieht, über offenen Weg (Tor/Pass) erreicht, mit allen Truppen der Startbasis
  // sicher schlägt (wie der Angriffs-Knopf: angriffStart/angriffReicht) und in 90 s erreicht (der Test wartet 120 s)
  out.angriff = await ev(async () => { const h = islandById[playerIslandId];
    const passt = i => { if (islandOwnerOf(i.id) || /temple|gate/i.test(i.type || '') || bossAt(i.id) || !islandSeen(i)) return false;
      const von = angriffStart(i); if (von === null || !angriffReicht(von, i) || travelDurationSeconds(islandById[von], i) > 90) return false;
      const hop = lastHop(islandById[von].landmassId, i.landmassId, 'player'), tl = tollFor(hop[0], hop[1], islandTroops[von] || 0, 'player', i.id);
      return !tl.closed && (tl.cost || 0) <= coins; };
    const ziel = islands.filter(passt).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y))[0];
    if (!ziel) return { ziel: null, grund: 'keine sichtbare, erreichbare, schwächere neutrale Basis in 90 s Marsch' };
    const staerke = Math.round(effectiveTroops(ziel) + effectiveDefense(ziel)), von = angriffStart(ziel), truppen = islandTroops[von] || 0, dauer = Math.round(travelDurationSeconds(islandById[von], ziel));
    const vor = pendingAttacks.length; openIslandPopup(ziel); await new Promise(r => setTimeout(r, 400)); document.getElementById('attackBtn').click(); await new Promise(r => setTimeout(r, 600)); const vorschauText = document.getElementById('islandPopup').innerText.slice(0, 200); document.getElementById('attackBtn').click(); await new Promise(r => setTimeout(r, 400));
    return { ziel: ziel.id, staerke, truppen, dauer, unterwegs: pendingAttacks.length - vor, vorschau: vorschauText.replace(/\n+/g, ' | ').slice(0, 160) }; }).catch(e => 'FEHLER ' + e.message);
  // warten bis angekommen, dann aufwerten
  const ziel = out.angriff.ziel; let gehoert = false;
  for (let i = 0; ziel !== null && i < 40 && !gehoert; i++) { await p.waitForTimeout(3000); await zu(); gehoert = await ev(id => islandOwnerOf(id) === 'player', ziel); }
  out.erobert = gehoert;
  if (!gehoert && ziel) out.angriff.danach = await ev(id => ({ besitzer: islandOwnerOf(id), unterwegs: pendingAttacks.filter(a => a.targetId === id).length }), ziel);   // (verloren / noch unterwegs / jemand anders)
  wo = 'aufwerten';
  if (gehoert) out.aufwerten = await ev(async id => { const vor = islandLevels[id] || 1; openIslandPopup(islandById[id]); await new Promise(r => setTimeout(r, 400)); document.getElementById('upgradeBtn').click(); await new Promise(r => setTimeout(r, 600)); return { vor, nach: islandLevels[id] }; }, ziel).catch(e => 'FEHLER ' + e.message);
  await ev(() => { try { closeIslandPopup(); } catch (e) {} });
  // Feld: Sammeln
  wo = 'feld'; await zu();
  out.feld = await ev(async () => { const h = islandById[playerIslandId]; const fs = (typeof fields !== 'undefined' ? fields : []).filter(f => !(fieldState[f.id] && fieldState[f.id].occ)).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y)); if (!fs.length) return 'keine Felder';
    const ok = fieldSend('player', playerIslandId, fs[0].id, 1000); return { ok, maersche: fieldMarches.filter(m => m.who === 'player').length }; }).catch(e => 'FEHLER ' + e.message);
  // Kiste öffnen + Held
  wo = 'kiste'; out.kiste = await ev(() => { const it = openCrate(); return it ? RARITY_DEFS[it.rarity].label + ' ' + it.slot : 'keine'; }).catch(e => 'FEHLER ' + e.message);
  // Events: Wochen-Event
  await p.waitForTimeout(5000); wo = 'events';
  out.events = await ev(() => ({ woche: woOn(), heute: (woHeute() || {}).name || 'frei', chip: document.getElementById('midBar').innerText.replace(/\n/g, ' ').slice(0, 80) }));
  wo = 'wochen-event'; out.wochenEvent = await ev(async () => { openGoals('tour'); await new Promise(r => setTimeout(r, 500)); return { tage: document.querySelectorAll('#eventBody .wo-tage > button').length, kisten: document.querySelectorAll('#eventBody .evl-k').length }; }).catch(e => 'FEHLER ' + e.message);
  await pruef('woche'); await p.screenshot({ path: path.join(OUT, 'z_woche.png') });
  // Anleitung als neuer Spieler
  wo = 'anleitung'; await ev(() => { document.querySelectorAll('.panel.is-open').forEach(x => closePanel(x)); document.getElementById('armySheet').hidden = true; anleitung.schritt = 0; }); await p.waitForTimeout(1500);
  out.anleitung = await ev(() => document.getElementById('anleitungText').textContent);
  console.log(JSON.stringify(out, null, 1));
  console.log('Text-Auffälligkeiten:', texte.length ? [...new Set(texte)].slice(0, 40) : 'keine');
  // neu laden: ist alles noch da (Server + Weltrechner)?
  wo = 'neu laden'; const vor = await ev(id => ({ basen: ownedIslands.size, ziel: islandOwnerOf(id), stufe: islandLevels[id], bau: (loadCity().builds || []).map(x => x.id).join(','), rechnet: rechnet() }), out.angriff.ziel);
  await p.waitForTimeout(8000); await p.reload(); await p.waitForTimeout(15000); await zu();
  const nach = await ev(id => ({ basen: ownedIslands.size, ziel: islandOwnerOf(id), stufe: islandLevels[id], bau: (loadCity().builds || []).map(x => x.id).join(','), holz: (loadCity().levels || {}).lumber || 0, rechnet: rechnet() }), out.angriff.ziel);
  console.log('vor dem Neuladen', JSON.stringify(vor)); console.log('nach dem Neuladen', JSON.stringify(nach));
  ok('Holz-Bau startet (auch als Zuschauer über den Weltrechner)', out.holzBau === 'lumber' || /^aus: /.test(out.holzBau), out.holzBau);
  ok('Basis erobert', out.erobert === true, JSON.stringify(out.angriff));
  ok('nach dem Neuladen alles noch da', nach.basen === vor.basen && nach.ziel === vor.ziel && nach.stufe === vor.stufe && nach.bau === vor.bau, JSON.stringify(vor) + ' → ' + JSON.stringify(nach));
  ok('Weltrechner rechnet, nicht das Handy', vor.rechnet === false && nach.rechnet === false);
  ok('keine auffälligen Texte', !texte.length, [...new Set(texte)].slice(0, 40).join(' | '));
  ok('keine Skript-Fehler', !fehler.length, [...new Set(fehler)].slice(0, 20).join(' | '));
  await b.close(); b = null;
  // ein ganz normaler neuer Spieler darf beim Schummel-Schutz nicht auffallen (Weltrechner prüft im Minutentakt)
  await warte(60000);
  const uid = G.spielerId(D), alarme = G.schummelListe().filter(e => e.uid === uid);
  ok('keine Schummel-Hinweise für den neuen Spieler', !alarme.length, alarme.map(e => e.was + ': ' + e.text).join(' | '));
  ende();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
