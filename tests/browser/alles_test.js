// Großer Klick-Test in der Vorschau: alle Fenster, Reiter, Knöpfe + Texte prüfen + Kernabläufe
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2], OUT = process.argv[3] || '.';
const SCHLECHT = /undefined|NaN|\bnull\b|\[object|Infinity|Invalid Date|\bVIP\b|Turnier|Drachenturm|Piratenfestung|Weltboss|Mo–So|Montag bis Sonntag/;
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); }).listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fehler = [], texte = [];
  let wo = 'start';
  p.on('pageerror', e => fehler.push(wo + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/PROXY|Failed to load resource/.test(m.text())) fehler.push(wo + ' konsole: ' + m.text().slice(0, 150)); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(9000);
  const ev = (f, a) => p.evaluate(f, a);
  const zu = () => ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } try { if (!document.getElementById('heroHall').hidden) closeHeroHall(); } catch (e) {} document.querySelectorAll('.marker-sheet:not([hidden])').forEach(x => x.hidden = true); });
  const klick = s => ev(s => document.querySelector(s).click(), s);
  await zu();
  const pruef = async (name) => { const t = await ev(() => [...document.querySelectorAll('.panel.is-open, #citySheet:not([hidden]), #armySheet:not([hidden]), .marker-sheet:not([hidden]), #midBar')].map(e => e.innerText).join('\n')); for (const z of t.split('\n')) if (SCHLECHT.test(z)) texte.push(name + ' → ' + z.trim().slice(0, 140)); return t.length; };
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
          if (/close|schlie|abmelden|zurück|Close/i.test(t + x.className + x.id) || x.closest('form[action]') || x.matches('[id^=tabBtn],[data-gtab],[data-ggrp],[data-ktab],[data-stab],[data-btab]') || /Passwort|Name ändern|Verkaufen|Verlassen|Austreten|Auflösen|löschen/i.test(t)) return '-';
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
  out.stadt = await ev(async () => { const ids = Object.keys(CITY_DEFS || {}); const r = []; for (const id of ids) { try { cityOpenId = id; renderCitySheet(); document.getElementById('citySheet').hidden = false; r.push(id + ':' + document.getElementById('citySheet').innerText.length); } catch (e) { r.push(id + ' FEHLER ' + e.message); } await new Promise(z => setTimeout(z, 60)); } return r; }).catch(e => 'FEHLER ' + e.message);
  await pruef('stadt'); await p.screenshot({ path: path.join(OUT, 'z_stadt.png') });
  out.holzBau = await ev(async () => { cityOpenId = 'lumber'; renderCitySheet(); const up = document.getElementById('cityUpgradeBtn'); if (up.disabled) return 'aus: ' + up.textContent; up.click(); await new Promise(r => setTimeout(r, 600)); const c = loadCity(); return (c.builds || []).map(x => x.id).join(',') || 'kein Bau'; }).catch(e => 'FEHLER ' + e.message);
  await ev(() => { document.getElementById('citySheet').hidden = true; document.getElementById('cityCloseBtn') && document.getElementById('cityCloseBtn').click(); });
  await p.waitForTimeout(800);
  // Angriff auf eine neutrale Basis
  wo = 'angriff'; await zu();
  out.angriff = await ev(async () => { const h = islandById[playerIslandId]; const ziel = islands.filter(i => !islandOwnerOf(i.id) && !/temple|gate/i.test(i.type || '') && !bossAt(i.id)).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y))[0];
    const vor = pendingAttacks.length; openIslandPopup(ziel); await new Promise(r => setTimeout(r, 400)); document.getElementById('attackBtn').click(); await new Promise(r => setTimeout(r, 600)); const vorschauText = document.getElementById('islandPopup').innerText.slice(0, 200); document.getElementById('attackBtn').click(); await new Promise(r => setTimeout(r, 400));
    return { ziel: ziel.id, unterwegs: pendingAttacks.length - vor, vorschau: vorschauText.replace(/\n+/g, ' | ').slice(0, 160) }; }).catch(e => 'FEHLER ' + e.message);
  // warten bis angekommen, dann aufwerten
  const ziel = out.angriff.ziel; let gehoert = false;
  for (let i = 0; i < 40 && !gehoert; i++) { await p.waitForTimeout(3000); await zu(); gehoert = await ev(id => islandOwnerOf(id) === 'player', ziel); }
  out.erobert = gehoert;
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
  console.log(JSON.stringify(out, null, 1));
  console.log('Text-Auffälligkeiten:', texte.length ? [...new Set(texte)].slice(0, 40) : 'keine');
  console.log('Fehler:', fehler.length ? [...new Set(fehler)].slice(0, 20) : 'keine'); await b.close(); srv.close();
});
