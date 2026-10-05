// Langzeit (6.10.): Ranglisten-Reiter „Hauptstadt“ (Burg-Stufe, bei Gleichstand Forschung – von anderen nur die Summe foP vom
// Weltrechner) und das Bündnis im Profil (eigenes + fremdes: Wappen, Name; antippen öffnet gleich das Bündnis-Fenster).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(6000);
  await p.waitForFunction(() => typeof AUF !== 'undefined' && AUF && typeof bundOp === 'function' && islandById[playerIslandId], null, { timeout: 60000, polling: 500 }).catch(() => {});
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  // 1) Rangliste „Hauptstadt“
  const r = await ev(() => {
    const bs = loadBotState(), [x, y, z] = BOT_DEFS.filter(d => !d.mensch && bs[d.id]).slice(0, 3);
    for (const d of BOT_DEFS) if (bs[d.id]) { bs[d.id].city.levels.keep = 1; bs[d.id].city.fo = {}; }
    bs[x.id].city.levels.keep = 24; bs[x.id].city.fo = { w_prod: 1 };
    bs[y.id].city.levels.keep = 24; bs[y.id].city.fo = { w_prod: 6, m_atk: 2 };   // gleiche Burg, mehr Forschung → vor x
    bs[z.id].city.levels.keep = 23; bs[z.id].city.fo = { w_prod: 10, m_atk: 10 };
    const c = loadCity(); c.levels.keep = 25; c.fo = { w_prod: 3 }; saveCity();
    openRankings('burg');
    const reihen = [...document.querySelectorAll('#rankBody .lb-row')].map(e => e.dataset.profile), erste = document.querySelector('#rankBody .lb-row');
    const out = { titel: document.getElementById('rankTitle').textContent, tab: !!document.querySelector('#rankTabs [data-rtab="burg"].active'), reihen: reihen.slice(0, 4), soll: ['player', y.id, x.id, z.id],
      text: erste ? erste.innerText.replace(/\s+/g, ' ') : '', schlecht: /undefined|NaN|\[object/.test(document.getElementById('rankBody').innerText) };
    // Zuschauer: fremde Forschung kennt das Handy nicht – es nimmt die Summe vom Weltrechner (foP)
    const alt = window.fremdGeheim; window.fremdGeheim = () => true; bs[x.id].foP = 40;
    try { out.zuschauer = [foPunkte(x.id), foPunkte(z.id), foPunkte('player')]; } finally { window.fremdGeheim = alt; }
    closeAllPopups(); return out;
  });
  ok(r.titel === 'Hauptstadt' && r.tab, 'Reiter „Hauptstadt“ da und aktiv', r.titel);
  ok(JSON.stringify(r.reihen) === JSON.stringify(r.soll), 'Reihenfolge: Burg-Stufe, bei Gleichstand Forschung', r);
  ok(/25/.test(r.text) && /Forschung 3/.test(r.text) && /Burg-Stufe/i.test(r.text) && !r.schlecht, 'Zeile zeigt Burg-Stufe und Forschung', r.text);
  ok(r.zuschauer.join() === '40,0,3', 'Zuschauer: fremde Forschung nur als Summe (foP), eigene selbst gerechnet', r.zuschauer);
  // 2) Bündnis im Profil: ohne Bündnis → „suchen“
  const o = await ev(() => { closeAllPopups(); renderProfile(); const el = document.getElementById('profileBund'); return { txt: el.innerText, knopf: !!el.querySelector('button[data-bund-zeigen]') }; });
  ok(o.knopf && /Kein Bündnis/.test(o.txt), 'eigenes Profil ohne Bündnis: Knopf zum Suchen', o);
  await ev(() => { profileBtn.click(); }); await p.waitForTimeout(400);
  await p.locator('#profileBund button').click(); await p.waitForTimeout(500);
  const o2 = await ev(() => ({ bund: isPanelOpen(bundPopup), profil: isPanelOpen(profilePopup), tab: bundTab }));
  ok(o2.bund && !o2.profil && o2.tab === 'suchen', 'antippen öffnet gleich das Bündnis-Fenster (Suchen)', o2);
  // ein Bündnis mit dir (die Vorschau hat keinen Weltrechner für deine Bündnis-Befehle: direkt eingetragen), ein Mitspieler in einem anderen
  const g = await ev(() => {
    closeAllPopups(); const bs = loadBotState(), frei = BOT_DEFS.filter(d => !d.mensch && bs[d.id] && !bundVon(d.id) && bundBasen(d.id).size), [m, f] = frei;
    botCoins[m.id] = botCoins[f.id] = 1e9;
    bundOp(m.id, { op: 'gruenden', name: 'Nachtwache', tag: 'NW', farbe: 2, zeichen: 1, offen: true }); bundVon(m.id).mit.push('player'); bundIndex();
    bundOp(f.id, { op: 'gruenden', name: 'Sturmfalken', tag: 'SF', farbe: 4, zeichen: 2, offen: true });
    renderProfile(); const el = document.getElementById('profileBund');
    return { mein: bundIch() && bundIch().tag, txt: el.innerText, wappen: !!el.querySelector('.bd-wappen'), fremd: f.id, fremdBund: bundVon(f.id) && bundVon(f.id).id };
  });
  ok(g.mein === 'NW' && /\[NW\] Nachtwache/.test(g.txt) && g.wappen, 'eigenes Profil: Bündnis mit Wappen und Name', g);
  await ev(() => { profileBtn.click(); }); await p.waitForTimeout(400);
  await p.locator('#profileBund button').click(); await p.waitForTimeout(500);
  const g2 = await ev(() => ({ bund: isPanelOpen(bundPopup), tab: bundTab, titel: document.getElementById('bundTitle').textContent }));
  ok(g2.bund && g2.tab === 'info' && /Nachtwache/.test(g2.titel), 'antippen: eigenes Bündnis (Info)', g2);
  // fremdes Profil: sein Bündnis, antippen → Suchen mit seiner Zeile
  const f = await ev(id => { closeAllPopups(); openRulerProfile(id); const s = document.getElementById('rulerSub'); return { txt: s.innerText, wappen: !!s.querySelector('.bd-wappen'), knopf: !!s.querySelector('[data-bund-zeigen]') }; }, g.fremd);
  ok(/\[SF\] Sturmfalken/.test(f.txt) && f.wappen && f.knopf, 'fremdes Profil: sein Bündnis mit Wappen', f);
  await p.locator('#rulerSub [data-bund-zeigen]').click(); await p.waitForTimeout(500);
  const f2 = await ev(() => ({ bund: isPanelOpen(bundPopup), ruler: isPanelOpen(rulerPopup), tab: bundTab, ziel: (document.querySelector('#bundPopup .bd-zeile.is-ziel b') || {}).textContent || '' }));
  ok(f2.bund && !f2.ruler && f2.tab === 'suchen' && /Sturmfalken/.test(f2.ziel), 'antippen: Bündnis-Fenster, seine Zeile markiert', f2);
  const f3 = await ev(() => { closeAllPopups(); const d = BOT_DEFS.find(x => !x.mensch && loadBotState()[x.id] && !bundVon(x.id)); openRulerProfile(d.id); const s = document.getElementById('rulerSub'); return { txt: s.innerText, knopf: !!s.querySelector('[data-bund-zeigen]') }; });
  ok(/kein Bündnis/.test(f3.txt) && !f3.knopf, 'fremd ohne Bündnis: nur Text, kein Knopf', f3);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
