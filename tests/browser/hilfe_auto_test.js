// Hilfe ohne Knopfdruck (Alexander 5.10.): ein ECHTER Spieler (mensch) im Bündnis wird angegriffen → ein Verbündeter schickt
// von selbst Verstärkung (genau einmal, Truppen stimmen). Ohne Botschaft: genau eine Meldung, keine Truppen. Kommt keiner
// rechtzeitig: genau eine Meldung. „Im Chat teilen“ kurz vor „Brauche Hilfe!“ → das Hilfe-Signal entsteht trotzdem.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    // H (Helfer) mit Hauptstadt Q; M (echter Spieler) bekommt eine freie Insel T auf derselben Landmasse (nicht seine Hauptstadt)
    let M, H, T, Q;
    for (const h of bots) { const q = botCapitalOf(h.id), t = islands.find(i => i.landmassId === islandById[q].landmassId && i.id !== megaTempleId && !islandOwnerOf(i.id));
      if (t) { H = h; Q = q; T = t.id; M = bots.find(x => x !== h); break; } }
    if (!M) return { fehler: 'keine freie Insel neben einem Mitspieler' };
    botOwnedIslands[M.id].add(T);
    const X = bots.find(x => x !== M && x !== H), S = [...botOwnedIslands[X.id]][0];
    for (const x of [M, H, X]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    botCoins[M.id] = 1e9; bundOp(M.id, { op: 'gruenden', name: 'Hilfeprobe', tag: 'HLF', offen: true }); bundOp(H.id, { op: 'beitreten', aid: bundVon(M.id).id });
    const a = bundVon(M.id), st = loadBotState();
    st[H.id].handy = { r: 0, bis: Date.now() + 1e9 }; saveBotState();                       // Helfer ist online
    const meld = []; window.bundMelden = (w, text) => { if (botById[w] && botById[w].mensch) meld.push({ w, text }); };   // (wie WELT.nachricht an das Handy)
    const botschaft = L => { const s = loadBotState()[M.id]; s.city.levels.keep = Math.max(5, s.city.levels.keep || 0); s.city.levels.embassy = L; saveBotState(); };
    const frisch = () => { a.sig = []; bundMem.hilfeSig = {}; bundMem.sigGemacht.clear(); bundMem.chatAt = {}; bundMem.botNext = {}; verst.l = [];
      pendingAttacks = pendingAttacks.filter(x => x.targetId !== T); pendingSends = pendingSends.filter(x => x.senderBotId !== H.id); meld.length = 0; };
    const angriff = ms => { const n = Date.now(); pendingAttacks.push({ sourceId: S, targetId: T, rawTroops: 50000, startedAt: n, resolveAt: n + ms, attackerBotId: X.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 }); };
    const runde = () => { const now = Date.now(); bundWegMem.clear(); bundMitspielerSignale(now); bundMitspielerAntworten(now); };
    islandLevels[T] = Math.max(5, islandLevels[T] || 1); islandTroops[T] = 1000; islandTroops[Q] = 200000;
    const out = { M: M.id, H: H.id, T, Q };
    botById[M.id].mensch = true;
    try {
      // 1) mit Botschaft: Verbündeter schickt von selbst, genau einmal
      frisch(); botschaft(1); angriff(3600000);
      const q0 = islandTroops[Q]; runde(); runde(); runde();
      const hs = a.sig.filter(s => s.art === 'hilfe' && s.w === M.id && s.z === T), m1 = pendingSends.filter(x => x.senderBotId === H.id && x.toId === T && x.verst);
      out.auto = { signale: hs.length, maersche: m1.length, n: m1[0] ? m1[0].troops : 0, weg: q0 - islandTroops[Q], meld: meld.slice() };
      // 1b) danach drückt er selbst „Brauche Hilfe!“ → kein zweites Signal
      hs.forEach(s => s.at -= 60000); bundMem.chatAt = {}; bundOp(M.id, { op: 'chat', k: 'hilfe', z: T });
      out.knopf = { signale: a.sig.filter(s => s.art === 'hilfe' && s.w === M.id && s.z === T).length };
      // 2) ohne Botschaft: genau eine Meldung, keine Truppen
      frisch(); botschaft(0); angriff(3600000); const q2 = islandTroops[Q];
      for (let i = 0; i < 4; i++) runde();
      out.ohne = { signale: a.sig.filter(s => s.art === 'hilfe' && s.w === M.id).length, maersche: pendingSends.filter(x => x.senderBotId === H.id && x.toId === T).length, weg: q2 - islandTroops[Q], meld: meld.slice() };
      // 3) Angriff gleich da: keiner kommt rechtzeitig → genau eine Meldung
      frisch(); botschaft(1); angriff(9000);
      for (let i = 0; i < 4; i++) runde();
      out.zuSpaet = { signale: a.sig.filter(s => s.art === 'hilfe' && s.w === M.id).length, maersche: pendingSends.filter(x => x.senderBotId === H.id && x.toId === T).length, meld: meld.slice() };
      // 4) „teilen“ kurz vor „Hilfe“: der Hilferuf geht nicht verloren
      frisch(); angriff(3600000);
      bundOp(M.id, { op: 'chat', k: 'teilen', z: S }); bundMem.chatAt = {};
      bundOp(M.id, { op: 'chat', k: 'hilfe', z: T });
      out.teilen = { teilen: a.sig.filter(s => s.art === 'teilen' && s.w === M.id).length, hilfe: a.sig.filter(s => s.art === 'hilfe' && s.w === M.id && s.z === T).length };
    } finally { botById[M.id].mensch = false; frisch(); botOwnedIslands[M.id].delete(T); }
    return out;
  });
  console.log(JSON.stringify(r));
  if (r.fehler) { ok(false, r.fehler); await b.close(); return; }
  ok(r.auto.signale === 1 && r.auto.maersche === 1 && r.auto.n > 0 && r.auto.n === r.auto.weg && !r.auto.meld.length, 'angegriffen, mit Botschaft: Verbündeter schickt von selbst genau einmal Verstärkung (Truppen stimmen)', r.auto);
  ok(r.knopf.signale === 1, '„Brauche Hilfe!“ danach: kein zweites Hilfe-Signal', r.knopf);
  ok(r.ohne.signale === 1 && r.ohne.maersche === 0 && r.ohne.weg === 0 && r.ohne.meld.length === 1 && /keine Botschaft/.test(r.ohne.meld[0].text), 'ohne Botschaft: genau eine Meldung, keine Truppen', r.ohne);
  ok(r.zuSpaet.maersche === 0 && r.zuSpaet.meld.length === 1 && /rechtzeitig/.test(r.zuSpaet.meld[0].text), 'Angriff gleich da: genau eine Meldung „kommt nicht rechtzeitig“', r.zuSpaet);
  ok(r.teilen.teilen === 1 && r.teilen.hilfe === 1, '„teilen“ kurz vor „Hilfe“: Hilfe-Signal entsteht', r.teilen);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
