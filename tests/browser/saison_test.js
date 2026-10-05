// Welt-Saison (Server-Reset alle 8 Wochen, Alexander 5.10.): Countdown in den letzten 3 Tagen, dann eine neue Saison auslösen (wie der
// Admin-Knopf) und prüfen: Hauptstadt (Burg, Gebäude, Forschung), Helden, Ausrüstung, Gems, Rohstoffe bleiben – Stufe 1, keine Fähigkeiten,
// Start-Truppen, Start-Gold, keine anderen Basen, keine Bündnisse; die besten 10 bekommen Gems + Saison-Titel. Für dich und Mitspieler gleich.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  // 1) vorher: ein großes Reich (2 Basen, Bündnis, Stufe 20, Münzen) mit Stadt, Forschung, Helden, Ausrüstung, Gems, Rohstoffen
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const c = loadCity(); c.levels.keep = 7; c.levels.academy = 3; c.levels.forge = 2; c.fo = { w_prod: 2, m_atk: 1 }; c.wounded = 5000; saveCity();
    const hs = loadHeroes(); const h0 = Object.keys(hs)[0]; hs[h0].sh = 77; saveHeroes();
    const it = addInventoryItem('weapon', 3, 1); if (it && it.id !== undefined) equippedItems.weapon = it.id;
    gems = 12345; coins = 5e6; playerLvl = 20; skillPoints = 4; skills.attack = 10; skills.defense = 5;
    const r = AUF.rohVon('player'); r.h = 77777; r.s = 66666; r.e = 55555; AUF.rohSpeichern();
    const cap0 = playerIslandId, home = islandById[cap0];
    const zweite = islands.find(i => i.type === 'tower' && !islandOwnerOf(i.id) && i.landmassId === home.landmassId && i.id !== cap0);
    ownedIslands.add(zweite.id); islandLevels[zweite.id] = 9; islandTroops[zweite.id] = 5e5; islandTroops[cap0] = 1e15;   // (Macht: Platz 1)
    const X = BOT_DEFS.find(x => !x.mensch && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).id, bx = loadBotState()[X];
    islandTroops[botCapitalOf(X)] = 1e14; bx.lvl = 30; bx.skills.attack = 12; bx.city.levels.keep = 6; bx.city.fo = { w_prod: 3 }; bx.gems = 999; bx.res = { h: 4444, s: 3333, e: 2222 }; botCoins[X] = 7e6; bx.city.builds = []; delete bx.city.foRun; saveBotState();
    botNextAt[X] = Date.now() + 1e9;   // (bis zum Neuladen kauft und baut er nichts – so lässt sich vergleichen)
    if (bundVon(X)) bundOp(X, { op: 'verlassen' }); bundOp(X, { op: 'gruenden', name: 'Saisontest', tag: 'STT', offen: true }); if (!bundVon('player')) { bundRein(bundVon(X), 'player'); bundSpeichern(); }
    saveGameNow(); saveProgressionNow();
    saisonTakt(); saison.ende = Date.now() + 2 * 864e5; saison.bald = 0; saisonSpeichern();   // nur noch 2 Tage: Ankündigung + Countdown
    const L = k => localStorage.getItem(k);
    const fk = i => fogKey(Math.floor(i.x / FOG_CELL), Math.floor(i.y / FOG_CELL));
    const vor = { X, cap0, fogAlt: fk(home), fogZweite: fk(zweite), zweite: zweite.id, inv: L('openWaterInventory'), eq: L('openWaterEquippedItems'), hel: L('openWaterHeroes2'), bot: JSON.parse(JSON.stringify({ city: bx.city.levels, fo: bx.city.fo, gear: bx.gear, hs: Object.fromEntries(Object.entries(bx.hs).map(([k, x]) => [k, [x.own, x.q]])) })) };
    return { vor, X, bund: !!bundVon(X), ich: bundVon('player') ? 1 : 0, nr: saison.nr };
  });
  ok(v.nr === 1 && v.bund && v.ich, 'Saison 1 läuft, Bündnis gegründet (du bist dabei)', { nr: v.nr, bund: v.bund, ich: v.ich });
  await p.waitForTimeout(6500);
  const cd = await p.evaluate(() => { const chip = document.getElementById('midBar').innerText; openGoals('boss'); const ev = document.getElementById('eventBody').innerText; closePanel(goalsPopup);
    return { chip, ev: ev.slice(0, 200), bald: saison.bald }; });
  ok(/Neue Saison in/.test(cd.chip) && /\d+ T \d+ h/.test(cd.chip), 'Countdown oben unter dem HUD (letzte 3 Tage)', cd.chip);
  ok(/Welt-Saison 1/.test(cd.ev) && /Neue Saison in/.test(cd.ev) && /Bleibt/.test(cd.ev), 'Countdown im Events-Fenster', cd.ev);
  ok(cd.bald === 1, 'Ankündigung 3 Tage vorher verschickt', cd.bald);
  // 2) die neue Saison (wie der Admin-Knopf) – die Seite lädt neu und übernimmt den Reset
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { try { const L = k => localStorage.getItem(k);
    window.__nach = { coins: L('openWaterCoins'), lvl: L('openWaterLevel'), sp: L('openWaterSkillPoints'), skills: L('openWaterSkills'), own: L('openWaterOwnedIslands'), troops: L('openWaterIslandTroops'), bund: L('openWaterBuendnisse'),
      botOwn: L('openWaterBotOwnedIslands'), botState: L('openWaterBotState'), schutz: L('openWaterNeulingBis'), at: Date.now(), botCoins: L('openWaterBotCoins'), log: L('openWaterCombatLog'), fog: L('openWaterFogCells') }; } catch (e) {} }));
  await Promise.all([p.waitForNavigation({ timeout: 30000 }), p.evaluate(() => saisonJetzt())]);
  await p.waitForTimeout(9000);
  const n = await p.evaluate(V => { const N = window.__nach, J = s => JSON.parse(s || 'null');
    const own = J(N.own) || [], tr = J(N.troops) || {}, bo = J(N.botOwn) || {}, bc = J(N.botCoins) || {}, bx = (J(N.botState) || {})[V.X] || {}, c = loadCity(), cap = playerIslandId, isl = islandById[cap];
    const anderer = BOT_DEFS.filter(x => (bo[x.id] || []).length > 1).length, ohne = Object.values(bo).filter(l => l.length === 1).length;
    const inbox = inboxList().find(x => x.src === 'saison');
    return { coins: N.coins, lvl: N.lvl, sp: N.sp, skills: J(N.skills), ownN: own.length, capNeu: cap !== V.cap0, rand: isl && isl.type === 'tower' && landmasses[isl.landmassId].tier === 'outer', zweite: islandOwnerOf(V.zweite),
      truppen: tr[cap], bund: Object.keys((J(N.bund) || {}).b || {}).length, log: N.log, fog: (J(N.fog) || []).filter(k => k === V.fogAlt || k === V.fogZweite).length, weit: Math.hypot(isl.x - islandById[V.cap0].x, isl.y - islandById[V.cap0].y) > 2 * REVEAL_BASE,
      keep: c.levels.keep, aca: c.levels.academy, forge: c.levels.forge, fo: c.fo, wounded: c.wounded, gems, roh: AUF.rohVon('player'),
      inv: localStorage.getItem('openWaterInventory') === V.inv, eq: localStorage.getItem('openWaterEquippedItems') === V.eq, hel: localStorage.getItem('openWaterHeroes2') === V.hel,
      preis: inbox && inbox.gems, titel: look.titles, traegt: playerTitle(), saison: { nr: saison.nr, ende: saison.ende - Date.now(), top: saison.last && saison.last.top.length, erster: saison.last && saison.last.top[0][0] },
      bot: { lvl: bx.lvl, skills: Object.values(bx.skills).reduce((a, x) => a + x, 0), coins: bc[V.X], basen: (bo[V.X] || []).length, keep: bx.city.levels.keep === V.bot.city.keep, city: JSON.stringify(bx.city.levels) === JSON.stringify(V.bot.city),
        fo: JSON.stringify(bx.city.fo) === JSON.stringify(V.bot.fo), gear: JSON.stringify(bx.gear) === JSON.stringify(V.bot.gear), gems: bx.gems, res: bx.res, titel: bx.titles, look: botLook(V.X).title,
        hs: Object.entries(bx.hs).every(([k, x]) => V.bot.hs[k] && V.bot.hs[k][0] === x.own && V.bot.hs[k][1] === x.q), truppen: tr[bx.capital] },
      schutz: (+N.schutz - N.at) / 36e5, botSchutz: (bx.neuBis - N.at) / 36e5, anderer, ohne, chip: document.getElementById('midBar').innerText };
  }, v.vor);
  console.log(JSON.stringify(n));
  ok(n.lvl === '1' && n.sp === '0' && n.skills && Object.values(n.skills).every(x => !x), 'Stufe 1, keine Fähigkeitspunkte', { lvl: n.lvl, sp: n.sp, skills: n.skills });
  ok(n.coins === '0', 'Start-Gold wie ein neuer Spieler (0)', n.coins);
  ok(n.ownN === 1 && n.capNeu && n.rand && n.zweite === null, 'nur noch die Hauptstadt – auf einem neuen Platz am Rand, die zweite Basis ist neutral', { ownN: n.ownN, neu: n.capNeu, rand: n.rand, zweite: n.zweite });
  ok(n.truppen >= 100000 && n.truppen < 2e5, 'Start-Truppen wie ein neuer Spieler (100.000)', n.truppen);
  ok(n.bund === 0, 'keine Bündnisse mehr', n.bund);
  ok(!n.log && (!n.fog || !n.weit) && n.wounded === 0, 'Kampfberichte, Nebel (um die alten Basen wieder zu) und Verwundete neu', { log: n.log, alteFelder: n.fog, wounded: n.wounded });
  ok(n.keep === 7 && n.aca === 3 && n.forge === 2 && n.fo && n.fo.w_prod === 2 && n.fo.m_atk === 1, 'Hauptstadt bleibt: Burg, Gebäude, Forschung', { keep: n.keep, aca: n.aca, forge: n.forge, fo: n.fo });
  ok(n.inv && n.eq && n.hel, 'Ausrüstung und Helden bleiben', { inv: n.inv, eq: n.eq, hel: n.hel });
  ok(n.gems >= 12345 && n.roh.h >= 77777 && n.roh.s >= 66666 && n.roh.e >= 55555, 'Gems und Holz/Stein/Eisen bleiben', { gems: n.gems, roh: n.roh });
  ok(n.preis === 3000 && (n.titel || []).includes('s1p1') && n.traegt === 'Champion Saison 1', 'Platz 1: 3.000 Gems im Abholfach + Titel „Champion Saison 1“ (angelegt)', { preis: n.preis, titel: n.titel, traegt: n.traegt });
  ok(n.saison.nr === 2 && n.saison.top === 10 && n.saison.erster === 'player' && n.saison.ende > 55 * 864e5, 'Saison 2 läuft, nächste in 8 Wochen, Top 10 gemerkt', n.saison);
  const B = n.bot;
  ok(B.lvl === 1 && B.skills === 0 && B.coins < 1e5 && B.basen === 1, 'Mitspieler: Stufe 1, keine Fähigkeiten, Start-Gold, nur die Hauptstadt', B);
  ok(B.truppen >= 100000 && B.truppen < 2e5, 'Mitspieler: Start-Truppen wie ein neuer Spieler', B.truppen);
  ok(B.keep && B.city && B.fo && B.gear && B.hs && B.res.h === 4444 && B.res.s === 3333 && B.res.e === 2222, 'Mitspieler: Stadt, Forschung, Ausrüstung, Helden, Rohstoffe bleiben', B);
  ok(B.gems === 999 + 2000 && (B.titel || []).includes('s1p2') && B.look === 'Saison 1 · Platz 2', 'Mitspieler Platz 2: 2.000 Gems + Titel „Saison 1 · Platz 2“', { gems: B.gems, titel: B.titel, look: B.look });
  ok(n.anderer === 0 && n.ohne >= 100, 'alle Reiche auf eine Hauptstadt zurückgesetzt', { mehr: n.anderer, eine: n.ohne });
  ok(!/Neue Saison in/.test(n.chip), 'Countdown oben erst wieder in den letzten 3 Tagen', n.chip);
  ok(n.schutz > 47 && n.schutz <= 48 && n.botSchutz > 47 && n.botSchutz <= 48, '48 Std. Anfängerschutz nach dem Reset (du und Mitspieler)', { du: n.schutz, mitspieler: n.botSchutz });
  // Sicherung von vor dem Reset zurückgespielt: die Welt ist wieder in Saison 1 → der Spielstand holt sich den Stand von vor dem Reset
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('openWaterSaison')); localStorage.setItem('openWaterSaison', JSON.stringify({ nr: 1, start: s.start - 864e5, ende: Date.now() + 10 * 864e5 })); window.onbeforeunload = null; });
  await p.reload(); await p.waitForTimeout(500);
  const z = await p.evaluate(() => ({ lvl: window.__nach.lvl, coins: +window.__nach.coins, skills: JSON.parse(window.__nach.skills || '{}'), mein: localStorage.getItem('openWaterSaisonMein') }));
  ok(z.lvl === '20' && z.coins >= 5e6 && z.skills.attack === 10 && z.mein === '1', 'Sicherung zurückgespielt: Handy holt den alten Stand (Stufe, Gold, Fähigkeiten)', z);
  await p.waitForTimeout(8000);
  // ein echter Spieler kann sich keinen Saison-Titel ins Profil schreiben: angezeigt wird er nur, wenn die Welt ihn vergeben hat
  const f = await p.evaluate(() => { const Y = BOT_DEFS.find(x => !x.mensch && loadBotState()[x.id] && !(loadBotState()[x.id].sTitel || []).length).id, by = loadBotState()[Y];
    botById[Y].mensch = true; by.lookTitle = 's1p1'; const falsch = botLook(Y).title;
    evPreis(Y, 'saison', 'Test', { gems: 0, titel: 's1p1' }, 'test'); const echt = botLook(Y).title; botById[Y].mensch = false; return { falsch, echt, liste: by.sTitel }; });
  ok(f.falsch === 'Neuling' && f.echt === 'Champion Saison 1' && f.liste.includes('s1p1'), 'Saison-Titel nur, wenn die Welt ihn vergeben hat (nicht aus dem Profil)', f);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
