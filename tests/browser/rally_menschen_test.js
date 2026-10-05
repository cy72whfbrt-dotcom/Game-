// Rally mit zwei ECHTEN Spielern (wie auf dem Server: Menschen = Mitspieler mit „mensch“), Anführer „Alex“ + „Emma“ gegen eine fremde Hauptstadt.
// Die Berichte werden abgefangen wie WELT.bericht sie verschickt und dann so angezeigt, wie jeder sie auf dem Handy sieht.
// Prüft: Werte beider zählen, jeder bekommt seinen Anteil an Gold/Holz/Stein/Eisen, Fenster im Kampflog stimmen.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const v = await p.evaluate(() => { for (const id of ['welcomeModal', 'dailyModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]).slice(0, 3);
    for (const x of bots) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    const [A, E, Z] = bots; botCoins[A.id] = 1e9;
    bundOp(A.id, { op: 'gruenden', name: 'Test', tag: 'TST', offen: true }); bundOp(E.id, { op: 'beitreten', aid: bundVon(A.id).id });
    const st = loadBotState(); st[A.id].skills.attack = 10; st[E.id].skills.attack = 30; saveBotState();
    const ziel = botCapitalOf(Z.id); islandTroops[ziel] = 1000; botCoins[Z.id] = 5e7; const rz = AUF.rohVon(Z.id); rz.h = 3e7; rz.s = 2e7; rz.e = 1e7; AUF.rohSpeichern();
    const vorher = id => ({ c: botCoins[id], ...AUF.rohVon(id) });
    window.__t = { A: A.id, E: E.id, Z: Z.id, vA: vorher(A.id), vE: vorher(E.id), berichte: [] };
    // wie auf dem Server: die beiden sind Menschen, ihre Berichte gehen über WELT.bericht an ihr Handy
    const orig = resolveBotAttack;
    resolveBotAttack = function (a) {
      const w0 = window.WELT; botById[A.id].mensch = botById[E.id].mensch = true;
      window.WELT = new Proxy({}, { get: (o, k) => k === 'bericht' ? (w, e, txt) => __t.berichte.push({ w, e: JSON.parse(JSON.stringify(e)), txt }) : () => [] });
      try { return orig.apply(this, arguments); } finally { window.WELT = w0; botById[A.id].mensch = botById[E.id].mensch = false; }
    };
    const r = { id: 'rm1', by: A.id, at: botCapitalOf(A.id), t: ziel, n0: 3e6, j: [{ w: E.id, f: botCapitalOf(E.id), n: 1e6, da: true }], aid: bundVon(A.id).id };
    bund.r.push(r); bundRallyLos(r);
    const a = pendingAttacks.find(x => x.rally && x.rally.id === 'rm1'); if (!a) return { fehler: 'keine Rally' };
    a.resolveAt = Date.now() + 300;
    const m = x => botMults(x).attackPct, s = x => titleMult(x, 'attack') * AUF.kampf(x, 'a');
    return { bonus: a.attackBonus, erwartet: Math.round(3e6 * m(A.id) / 100 + (a.hx ? Math.round(3e6 * a.hx.atk / 100) + heroGefOf(a.hx, 3e6) : 0) + (1e6 + Math.round(1e6 * m(E.id) / 100)) * s(E.id) / s(A.id) - 1e6), alt: Math.round(4e6 * m(A.id) / 100) }; });
  ok(v.bonus && Math.abs(v.bonus - v.erwartet) <= 2 && v.bonus !== v.alt, 'Werte von Alex UND Emma zählen (jeder für seine Truppen)', v);
  await p.waitForTimeout(30000);
  const e = await p.evaluate(() => { const { A, E, vA, vE, berichte } = __t, n = id => ({ c: botCoins[id], ...AUF.rohVon(id) });
    const d = (id, v0) => { const x = n(id); return { gold: Math.round(x.c - v0.c), h: Math.round(x.h - v0.h), s: Math.round(x.s - v0.s), e: Math.round(x.e - v0.e) }; };
    return { berichte: berichte.map(q => ({ an: q.w === A ? 'Alex' : q.w === E ? 'Emma' : q.w, rolle: q.e.rolle || 'Anführer', txt: q.txt })), A: d(A, vA), E: d(E, vE),
      plunder: berichte[0] && berichte[0].e.plunder, roh: berichte[0] && berichte[0].e.plunderRoh, won: berichte[0] && berichte[0].e.won }; });
  console.log(JSON.stringify(e));
  ok(e.berichte.length === 2 && e.berichte.some(q => q.an === 'Alex') && e.berichte.some(q => q.an === 'Emma' && q.rolle === 'mit'), 'beide bekommen einen Kampfbericht', e.berichte);
  const nah = (x, y) => Math.abs(x - y) <= Math.max(3000, y * 0.005);   // (Alex ist nebenbei ein Mitspieler und gibt in den 30 s etwas aus)
  ok(e.won && nah(e.E.gold, e.plunder / 4) && nah(e.A.gold, e.plunder * 3 / 4), 'Gold: Alex ¾, Emma ¼', { Alex: e.A.gold, Emma: e.E.gold, ges: e.plunder });
  ok(e.won && ['h', 's', 'e'].every(k => nah(e.E[k], e.roh[k] / 4) && nah(e.A[k], e.roh[k] * 3 / 4)), 'Holz, Stein, Eisen: Alex ¾, Emma ¼', { Alex: e.A, Emma: e.E, ges: e.roh });
  // jeden Bericht so anzeigen, wie der Spieler ihn auf dem Handy sieht
  for (const wer of ['Alex', 'Emma']) {
    const seite = await p.evaluate(wer => { const q = __t.berichte.find(x => (x.w === __t.A ? 'Alex' : 'Emma') === wer); combatLog.unshift(Object.assign(q.e, { at: Date.now() }));
      for (const id of ['welcomeModal', 'dailyModal', 'levelUpModal', 'rewardModal']) { const m = document.getElementById(id); if (m) m.hidden = true; }
      if (!isPanelOpen(battleLogPopup)) document.getElementById('battleLogBtn').click(); else renderCombatLog();
      document.querySelector('#combatLogList summary').click();
      const x = document.querySelector('.kl-seite'); const r = x && !x.hidden ? { titel: document.querySelector('#combatLogList .logRow .lt').innerText.split('\n').slice(0, 2).join(' | '), balken: document.querySelector('#combatLogList .logBalTxt').innerText.replace(/\n/g, ' / '),
        fenster: [...x.querySelectorAll('.logSide')].map(l => [l.querySelector('.logSideLabel').textContent, l.querySelector('.logSum').lastElementChild.textContent, [...l.querySelectorAll('.kl-rss .logLine')].map(z => z.lastElementChild.textContent).join(' ')]) } : null;
      x.querySelector('[data-klzu]').click(); return r; }, wer);
    const summe = seite ? seite.fenster.filter(f => /^Angreifer/.test(f[0])).reduce((s, f) => s + Number(f[1].replace(/\D/g, '')), 0) : 0;
    ok(seite && seite.fenster.length === 3 && /Anführer/.test(seite.fenster[0][0]) && /Verbündeter/.test(seite.fenster[1][0]), 'Kampflog von ' + wer + ': 3 Fenster (Alex, Emma, Verteidiger)', seite);
    ok(seite && Math.abs(summe - Number((seite.balken.match(/([\d.,]+)\s*Mio\./) || [0, '0'])[1].replace(',', '.')) * 1e6) < 1e5, 'Kampflog von ' + wer + ': Summe der Fenster = Balken oben', { summe, balken: seite && seite.balken });
  }
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
