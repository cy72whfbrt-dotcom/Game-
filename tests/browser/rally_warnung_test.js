// Rally gegen ein Bündnis-Mitglied (Alexander 5.10., LIESMICH 11b D): Warnung im Chat des Bündnisses (Zeile mit Ort → „Zeigen“),
// Push + Nachricht an den echten Spieler wie bei einem Angriff, und die Verbündeten helfen von selbst wie beim Hilferuf
// (Botschaft, rechtzeitig vor der Ankunft der Rally, Truppen stimmen). Ohne Botschaft: keine Truppen, eine Meldung.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    // H (Helfer) mit Hauptstadt Q; M (echter Spieler) bekommt die freie Basis T daneben, der Gegner X den Sammelpunkt A daneben
    let H, Q, T, A;
    for (const h of bots) { const q = botCapitalOf(h.id), frei = islands.filter(i => i.landmassId === islandById[q].landmassId && i.id !== megaTempleId && !islandOwnerOf(i.id));
      if (frei.length >= 2) { H = h; Q = q; T = frei[0].id; A = frei[1].id; break; } }
    if (!H) return { fehler: 'keine zwei freien Inseln neben einem Mitspieler' };
    const [M, X] = bots.filter(x => x !== H);
    for (const x of [M, H, X]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    botOwnedIslands[M.id].add(T); botOwnedIslands[X.id].add(A); botCoins[M.id] = botCoins[X.id] = 1e9;
    bundOp(M.id, { op: 'gruenden', name: 'Warnprobe', tag: 'WRN', offen: true }); bundOp(H.id, { op: 'beitreten', aid: bundVon(M.id).id });
    bundOp(X.id, { op: 'gruenden', name: 'Rallyprobe', tag: 'RAP', offen: true });
    const a = bundVon(M.id), ax = bundVon(X.id), st = loadBotState();
    st[H.id].handy = { r: 0, bis: Date.now() + 1e9 }; saveBotState();
    const meld = [], push = []; window.bundMelden = (w, text) => { if (botById[w] && botById[w].mensch) meld.push({ w, text }); };
    window.bundPush = (w, d) => push.push(Object.assign({ an: w }, d));
    const botschaft = L => { const s = loadBotState()[M.id]; s.city.levels.keep = Math.max(5, s.city.levels.keep || 0); s.city.levels.embassy = L; saveBotState(); };
    const runde = () => { const now = Date.now(); bundWegMem.clear(); bundMitspielerSignale(now); bundMitspielerAntworten(now); };
    islandLevels[T] = Math.max(5, islandLevels[T] || 1); islandTroops[T] = 1000; islandTroops[Q] = 400000; islandTroops[A] = 60000;
    const out = {};
    botById[M.id].mensch = true;
    try {
      botschaft(1);
      const why = bundRallyStart(ax, X.id, { basis: A, ziel: T, min: 5, n: 50000 }), r0 = bund.r.find(r => r.by === X.id);
      const z = ((bundChat[a.id] || {}).l || []).filter(x => x.k === 's_gegen');
      out.warnung = { why, rally: !!r0, zeile: z.length, ort: z[0] && z[0].z === T, wer: z[0] && z[0].w === X.id, text: z[0] ? bundChatText(z[0], false) : '',
        push: push.filter(x => x.an === M.id && x.art === 'rally').length, meld: meld.filter(m => m.w === M.id && /Achtung/.test(m.text)).length,
        fremd: ((bundChat[ax.id] || {}).l || []).filter(x => x.k === 's_gegen').length };
      const g = bundUnterAngriff(T);
      out.gefahr = { str: g && g.str, ankunftNachStart: g && r0 ? g.at >= r0.los : false };
      const q0 = islandTroops[Q]; runde(); runde();
      const m1 = pendingSends.filter(x => x.senderBotId === H.id && x.toId === T && x.verst);
      out.hilfe = { signal: a.sig.filter(s => s.art === 'hilfe' && s.w === M.id && s.z === T).length, maersche: m1.length, n: m1[0] ? m1[0].troops : 0, weg: q0 - islandTroops[Q], rechtzeitig: m1[0] && g ? m1[0].resolveAt < g.at : false };
      // ohne Botschaft: keine Truppen, eine Meldung
      pendingSends = pendingSends.filter(x => x.senderBotId !== H.id); islandTroops[Q] = 400000; a.sig = []; bundMem.hilfeSig = {}; bundMem.sigGemacht.clear(); bundMeldeZeit.clear(); meld.length = 0; botschaft(0);
      const q2 = islandTroops[Q]; runde(); runde();
      out.ohne = { maersche: pendingSends.filter(x => x.senderBotId === H.id && x.toId === T).length, weg: q2 - islandTroops[Q], meld: meld.filter(m => /keine Botschaft/.test(m.text)).length };
    } finally {
      botById[M.id].mensch = false; for (const r of bund.r.filter(r => r.by === X.id)) bundRallyEnde(r, 'Test vorbei');
      pendingSends = pendingSends.filter(x => x.senderBotId !== H.id); botOwnedIslands[M.id].delete(T); botOwnedIslands[X.id].delete(A);
    }
    return out;
  });
  console.log(JSON.stringify(r));
  if (r.fehler) { ok(false, r.fehler); await b.close(); return; }
  ok(r.warnung.why === '' && r.warnung.rally && r.warnung.zeile === 1 && r.warnung.ort && r.warnung.wer && /Rally/.test(r.warnung.text) && r.warnung.fremd === 0, 'Rally gegen ein Mitglied: Warnung im Chat des Bündnisses (mit Ort), nicht im eigenen', r.warnung);
  ok(r.warnung.push === 1 && r.warnung.meld === 1, 'Push + Nachricht an den angegriffenen echten Spieler', r.warnung);
  ok(r.gefahr.str === 50000 && r.gefahr.ankunftNachStart, 'die Rally zählt als Gefahr (Stärke, Ankunft nach dem Start)', r.gefahr);
  ok(r.hilfe.signal === 1 && r.hilfe.maersche === 1 && r.hilfe.n > 0 && r.hilfe.n === r.hilfe.weg && r.hilfe.rechtzeitig, 'Verbündeter schickt von selbst Verstärkung – rechtzeitig, Truppen stimmen', r.hilfe);
  ok(r.ohne.maersche === 0 && r.ohne.weg === 0 && r.ohne.meld === 1, 'ohne Botschaft: keine Truppen, genau eine Meldung', r.ohne);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
