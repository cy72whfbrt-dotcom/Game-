const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const D = process.argv[2], OUT = process.argv[3] || '.';
const SCHLECHT = /undefined|NaN|\bnull\b|\[object|Infinity|Invalid Date|\bVIP\b|Turnier|Drachenturm|Piratenfestung|Weltboss|Mo–So/;
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); }).listen(8792, async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fehler = [], texte = []; let wo = 'start';
  p.on('pageerror', e => fehler.push(wo + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/PROXY|Failed to load resource/.test(m.text())) fehler.push(wo + ' konsole: ' + m.text().slice(0, 150)); });
  await p.goto('http://127.0.0.1:8792/'); await p.waitForTimeout(9000);
  const ev = (f, a) => p.evaluate(f, a);
  const zu = () => ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  const pruef = async n => { const t = await ev(() => [...document.querySelectorAll('#citySheet:not([hidden]), #barbSheet:not([hidden]), #armySheet:not([hidden]), #heroHall:not([hidden]), .marker-sheet:not([hidden])')].map(e => e.innerText).join('\n')); for (const z of t.split('\n')) if (SCHLECHT.test(z)) texte.push(n + ' → ' + z.trim().slice(0, 140)); };
  await zu(); const out = {};
  // Stadt: jedes Gebäude
  wo = 'stadt'; await ev(() => document.getElementById('cityNavBtn').click()); await p.waitForTimeout(1500);
  const lots = await ev(() => Object.keys(CITY_LOTS)); out.stadt = [];
  for (const id of lots) { wo = 'stadt/' + id; const r = await ev(id => { try { cityOpenId = id; renderCitySheet(); document.getElementById('citySheet').hidden = false; const t = document.getElementById('citySheet').innerText; return t.split('\n').filter(Boolean).slice(0, 2).join(' / ').slice(0, 60); } catch (e) { return 'FEHLER ' + e.message; } }, id); out.stadt.push(id + ': ' + r); await pruef(wo); }
  await p.screenshot({ path: path.join(OUT, 'y_stadt_sheet.png') });
  // Helden-Halle
  wo = 'helden'; out.helden = await ev(async () => { const k = [...document.querySelectorAll('button')].find(x => /Held/i.test(x.textContent) && x.offsetParent); if (!k) return 'kein Knopf'; k.click(); await new Promise(r => setTimeout(r, 600)); return document.getElementById('heroHall').hidden ? 'zu' : document.getElementById('heroHall').innerText.slice(0, 80).replace(/\n/g, ' | '); }); await pruef('helden');
  await ev(() => { try { closeHeroHall(); } catch (e) {} document.getElementById('citySheet').hidden = true; document.getElementById('cityCloseBtn').click(); }); await p.waitForTimeout(800);
  // Feld sammeln über das Feld-Fenster
  wo = 'feld'; out.feld = await ev(async () => { const h = islandById[playerIslandId]; const f = resFields.filter(f => !(fieldState[f.id] && fieldState[f.id].occ)).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y))[0]; if (!f) return 'kein Feld';
    const ok = fieldSend('player', playerIslandId, f.id, 1e6); await new Promise(r => setTimeout(r, 300)); return { feld: f.kind || f.type || f.id, ok, maersche: fieldMarches.filter(m => m.who === 'player').length }; }).catch(e => 'FEHLER ' + e.message);
  // Drache, Invasion, Tagesboss, Lager über das Karten-Fenster
  await p.waitForTimeout(62000);   // Invasion beginnt 1 Min. nach dem Laden
  for (const v of [{ kind: 'drache' }, { kind: 'boss' }, { kind: 'camp' }]) {
    wo = 'barb/' + v.kind;
    out[v.kind] = await ev(async v => { if (v.kind === 'camp') { const c = barbNearest(); if (!c) return 'kein Lager'; v.id = c.id; } if (v.kind === 'boss' && !dbossOnMap()) return 'kein Tagesboss gerade';
      openBarbSheet(v); await new Promise(r => setTimeout(r, 500)); const sh = document.getElementById('barbSheet'); const txt = sh.innerText.split('\n').filter(Boolean).slice(0, 3).join(' / ');
      const k = [...sh.querySelectorAll('button')].find(x => /Angreifen/i.test(x.textContent) && !x.disabled); if (!k) return { txt, knopf: 'keiner' };
      const vor = (typeof barbMarches !== 'undefined' ? barbMarches : []).length; k.click(); await new Promise(r => setTimeout(r, 500));
      return { txt: txt.slice(0, 90), marsch: (typeof barbMarches !== 'undefined' ? barbMarches : []).length - vor }; }, v).catch(e => 'FEHLER ' + e.message);
    await pruef(wo); await p.screenshot({ path: path.join(OUT, 'y_' + v.kind + '.png') }); await ev(() => { try { closeBarbSheet(); } catch (e) {} });
  }
  wo = 'invasion'; out.invasion = await ev(async () => { const I = invAktiv(); if (!I) return 'keine'; const a = I.armies[0]; if (!a) return 'keine Armee'; openBarbSheet({ kind: 'inv', id: a.id }); await new Promise(r => setTimeout(r, 500)); const sh = document.getElementById('barbSheet'); return { armeen: I.armies.length, txt: sh.innerText.split('\n').filter(Boolean).slice(0, 3).join(' / ').slice(0, 90) }; }).catch(e => 'FEHLER ' + e.message);
  await pruef('invasion'); await ev(() => { try { closeBarbSheet(); } catch (e) {} });
  // 60 s laufen lassen: kommen Märsche an, rechnen Mitspieler?
  wo = 'laufen'; await p.waitForTimeout(60000);
  out.danach = await ev(() => ({ drHp: Math.round(evState.dr.hp), drMeinSchaden: Math.round((evState.dr.dmg || {}).player || 0), feldBesetzt: Object.values(fieldState).filter(s => s && s.occ && s.occ.who === 'player').length, berichte: combatLog.slice(0, 4).map(e => (e.type || '') + ':' + (e.title || e.badge || '')) }));
  console.log(JSON.stringify(out, null, 1));
  console.log('Text-Auffälligkeiten:', texte.length ? [...new Set(texte)].slice(0, 30) : 'keine');
  console.log('Fehler:', fehler.length ? [...new Set(fehler)].slice(0, 20) : 'keine'); await b.close(); srv.close();
});
