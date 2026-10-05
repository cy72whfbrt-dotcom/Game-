// Handy 390×844: Rally-Ziel heißt wie auf der Karte (kein „Turm #N“), Verstärkungs-Formular ragt nicht aus der Box
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  // ragt: Kinder des Formulars, die rechts über die Box hinausgehen
  const ragt = () => p.evaluate(() => { const f = document.querySelector('.bd-wahl'); if (!f) return ['kein Formular']; const r = f.getBoundingClientRect().right + 1;
    return [...f.querySelectorAll('h4,select,button,.seg')].filter(e => e.getBoundingClientRect().right > r).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 20)); });
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const h = islandById[playerIslandId];
    const A = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    for (const d of BOT_DEFS) botNextAt[d.id] = Date.now() + 1e9;
    botCoins[A.id] = 1e9; if (bundVon(A.id)) bundOp(A.id, { op: 'verlassen' }); if (bundVon('player')) bundOp('player', { op: 'verlassen' });
    A.name = 'Kevin_Langername_93'; bundOp(A.id, { op: 'gruenden', name: 'Testbund', tag: 'TST', offen: true }); bundRein(bundVon(A.id), 'player'); bundSpeichern();
    const z = islands.filter(i => i.type === 'tower' && !islandOwnerOf(i.id) && !bossAt(i.id) && i.landmassId === h.landmassId).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    const fremd = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.id !== z.id), alt = botOwnerIndex.get(fremd.id);
    botOwnerIndex.set(fremd.id, A.id); const fn = bundZielName(fremd); if (alt) botOwnerIndex.set(fremd.id, alt); else botOwnerIndex.delete(fremd.id);   // (nur für den Namen kurz besetzt)
    return { A: A.id, cap: botCapitalOf(A.id), z: z.id, titel: islandTitle(z), name: bundZielName(z), fremd: fn }; });
  ok(/^Turm #/.test(v.titel) && /^Neutrale Basis · X \d+ · Y \d+$/.test(v.name), 'Neutraler Turm: „Neutrale Basis · X … · Y …“ statt Rohnummer', v);
  ok(v.fremd === 'Basis von Kevin_Langername_93', 'Besetzter Turm: „Basis von <Besitzer>“', v.fremd);
  await p.evaluate(z => { bundWahl = { mode: 'rally', t: z, min: 3, f: 1 }; bundOeffnen('rally'); }, v.z); await p.waitForTimeout(800);
  const t = await p.evaluate(() => { const e = document.querySelector('.bd-wahl h4'); return e ? e.textContent : ''; });
  ok(/^Rally auf Neutrale Basis/.test(t) && !/Turm #/.test(t), 'Rally-Formular: Titel wie auf der Karte', t);
  const r1 = await ragt(); ok(!r1.length, 'Rally-Formular passt in die Box', r1);
  await p.evaluate(c => { bundWahl = { mode: 'hilfe', nach: c, f: .5 }; bundOeffnen('sig'); }, v.cap); await p.waitForTimeout(800);
  const r2 = await ragt(); ok(!r2.length, 'Verstärkungs-Formular (Basis, „Alle“, „Senden“) passt in die Box', r2);
  await p.screenshot({ path: (process.argv[3] || require('os').tmpdir()) + '/rally_name.png' });
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
