// Fremde Werte nur nach dem Spähen (6.10.): das Handy bekommt von anderen nur, was server.php (FREMD_OEFFENTLICH) durchlässt –
// hier echt mit dem Filter aus server.php gekürzt. Dann als Zuschauer (WELT, nicht Weltrechner): Rangliste, Profil, Insel-Fenster,
// Angriffs-Vorschau, Bündnis-Fenster ohne Fehler; Macht kommt vom Weltrechner (macht); Späher → Befehl, Bericht vom Weltrechner
// füllt den Kampflog und die Abwehr in der Vorschau stimmt wieder.
const { chromium, devices } = require('playwright');
const { execFileSync } = require('child_process'), path = require('path');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x).slice(0, 300) : ''));
const SCHLECHT = /undefined|NaN|\bnull\b|\[object|Infinity/;
const php = (code, ein) => execFileSync('php', ['-r', "$_SERVER['SCRIPT_FILENAME'] = '" + __filename + "'; ob_start(); require '" + path.join(__dirname, '../../Game/server.php') + "'; ob_end_clean(); " + code], { input: ein }).toString();
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = [];
  p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal', 'titleModal']) { const m = document.getElementById(id); if (m) m.hidden = true; } });
  // vorher (Weltrechner-Sicht): ein Mitspieler mit Basis, seine Abwehr, sein Spähblick, seine Macht
  const vor = await ev(() => {
    const bs = loadBotState();
    const bot = BOT_DEFS.find(d => !d.mensch && botOwnedIslands[d.id] && [...botOwnedIslands[d.id]].some(id => islandById[id].type === 'tower' && !bossAt(id)));
    const b = bs[bot.id]; b.skills.defense = 7; b.gear.armor = { r: 3, lvl: 5, st: 1 }; b.city.levels.wall = 6; b.city.levels.keep = 4; b.shieldUntil = 0; b.neuBis = 0;   // (damit es auffällt, wenn die Werte fehlen)
    for (const h of Object.keys(b.hs).slice(0, 2)) { b.hs[h].own = true; b.hs[h].q = 6; }
    const isl = [...botOwnedIslands[bot.id]].find(id => islandById[id].type === 'tower' && !bossAt(id));
    islandTroops[isl] = 5000; staerkeMem[bot.id] = null;
    for (const d of BOT_DEFS) bs[d.id].macht = Math.round(powerOf(whoProfile(d.id)));   // (wie der Weltrechner jede Minute)
    return { bot: bot.id, isl, def: effectiveDefense(islandById[isl]), troops: effectiveTroops(islandById[isl]), spy: spaeherBlick(bot.id), macht: bs[bot.id].macht, state: JSON.stringify(bs) };
  });
  // gekürzt mit dem echten Filter aus server.php (wie für Spieler u999)
  const gek = php("echo weltteil_fuer_spieler('openWaterBotState', stream_get_contents(STDIN), 'u999');", vor.state);
  const g = JSON.parse(gek)[vor.bot];
  ok(!g.hs && !g.gear && !g.skills && !g.spare && !g.gems && !g.shields && !g.ps, 'Filter: Helden, Ausrüstung, Skills, Gems, Schilde, Pass weg', Object.keys(g));
  ok(JSON.stringify(g.city) === '{"levels":{"keep":4}}' && g.macht === vor.macht && g.lvl >= 1, 'Filter: Burg-Stufe, Macht, Stufe bleiben', { city: g.city, macht: g.macht });
  // jetzt Zuschauer: WELT da, rechnet nicht; der gekürzte Stand
  const r1 = await ev(gek => {
    window.__befehle = [];
    const W = { leiter: false, ich: 'u999', menschen: {}, beiNachricht: [], ereignisseRaus: [], sichtRaus: {}, armeeSichtRaus: {}, sichtV: -1,
      befehl(art, d) { window.__befehle.push(Object.assign({ art }, d)); }, nachricht() {}, bericht() {} };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
    if (botSaveTimer) { clearTimeout(botSaveTimer); botSaveTimer = null; }
    store.set('openWaterBotState', gek); botState = null; loadBotState(); for (const k in staerkeMem) delete staerkeMem[k];
    return { geheim: fremdGeheim() };
  }, gek);
  ok(r1.geheim, 'Zuschauer-Modus aktiv');
  const r2 = await ev(v => {
    const out = {}, txt = [];
    out.macht = staerke(v.bot); out.def0 = effectiveDefense(islandById[v.isl]);
    out.helden = HEROES.filter(x => heroOwned(v.bot, x.id)).length;
    openRankings(); for (const t of Object.keys(RANK_TABS)) { rankTab = t; renderRankings(); txt.push(document.getElementById('rankBody').innerText); }
    closeAllPopups(); openRulerProfile(v.bot); txt.push(document.getElementById('rulerBody').innerText); out.profil = document.getElementById('rulerBody').innerText;
    closeAllPopups(); scoutedIslands.delete(v.isl); popupIslandId = v.isl; popupView = 'menu'; renderPopup(); txt.push(document.getElementById('popupStats').innerText);
    out.zeilen = txt.join('\n').split('\n').filter(z => /undefined|NaN|\bnull\b|\[object|Infinity/.test(z)).slice(0, 5);
    return out;
  }, vor);
  ok(r2.macht === vor.macht, 'Macht anderer kommt vom Weltrechner (macht)', [r2.macht, vor.macht]);
  ok(r2.helden === 0, 'keine fremden Helden ohne Spähen (auch keine Start-Helden)', r2.helden);
  ok(r2.def0 < vor.def, 'ohne Spähen: Abwehr ohne seine Boni (Werte unbekannt)', [r2.def0, vor.def]);
  ok(/erst, wenn du eine Basis/.test(r2.profil) && !/Ausrüstung\n/.test(r2.profil), 'Profil: Ausrüstung/Helden/Skills verdeckt, Hinweis aufs Spähen');
  ok(!r2.zeilen.length, 'Rangliste, Profil, Insel-Fenster ohne kaputte Texte', r2.zeilen);
  // Späher hin: Befehl an den Weltrechner; Bericht kommt vom Weltrechner (hier: der Blick von vorher)
  const r3 = await ev(v => {
    const n = combatLog.length;
    launchScout(v.isl);
    const sc = pendingScouts.find(s => s.targetId === v.isl && !s.back); sc.resolveAt = Date.now() - 1; resolveScout(sc); pendingScouts.splice(pendingScouts.indexOf(sc), 1);
    const e0 = combatLog.find(e => e.type === 'scout' && e.targetId === v.isl), wartet = !!(e0 && e0.wartet);
    spaehBericht({ art: 'spaeh', ziel: v.isl, troops: v.troops, defense: v.def, spy: v.spy });
    const e = combatLog.find(e => e.type === 'scout' && e.targetId === v.isl);
    const befehl = window.__befehle.find(b => b.art === 'spaehen' && b.ziel === v.isl);
    closeAllPopups(); battleLogBtn.click(); const log = document.getElementById('battleLogPopup').innerText;
    return { neu: combatLog.length - n, befehl: !!(befehl && befehl.blick), wartet, spy: !!(e && e.spy && e.spy.name), def: e && e.defense, abwehr: effectiveDefense(islandById[v.isl]),
      bad: log.split('\n').filter(z => /undefined|NaN|\bnull\b|\[object|Infinity/.test(z)).slice(0, 5) };
  }, vor).catch(e => ({ fehler: e.message }));
  ok(r3.befehl, 'Späher zu fremder Basis → Befehl „spaehen“ mit blick an den Weltrechner', r3);
  ok(r3.wartet && r3.neu === 1, 'Kampflog-Eintrag wartet auf den Bericht', r3);
  ok(r3.spy && r3.def === vor.def, 'Bericht vom Weltrechner füllt den Eintrag (Herr, Abwehr)', r3);
  ok(Math.abs(r3.abwehr - vor.def) <= Math.max(2, vor.def * .001), 'nach dem Spähen: Abwehr mit den Werten aus dem Bericht', [r3.abwehr, vor.def]);
  ok(!(r3.bad || []).length, 'Kampflog ohne kaputte Texte', r3.bad);
  // Angriffs-Vorschau (gespäht) und Bündnis-Fenster
  const r4 = await ev(v => {
    closeAllPopups(); popupIslandId = v.isl; previewSourceId = nearestOwnedIslandTo(islandById[v.isl]); popupView = 'preview'; renderPopup();
    const t = document.getElementById('popupStats').innerText, foe = (document.querySelector('[data-foe="total"]') || {}).textContent;
    closeAllPopups(); document.getElementById('bundBtn').click(); const bt = document.getElementById('bundPopup').innerText;
    return { t: t.slice(0, 300), foe, bad: (t + '\n' + bt).split('\n').filter(z => /undefined|NaN|\bnull\b|\[object|Infinity/.test(z)).slice(0, 5) };
  }, vor).catch(e => ({ fehler: e.message }));
  ok(!r4.fehler && !(r4.bad || []).length, 'Angriffs-Vorschau und Bündnis-Fenster ohne Fehler', r4);
  ok(r4.foe && r4.foe !== '?', 'Angriffs-Vorschau (gespäht) zeigt die Abwehr', r4.foe);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
