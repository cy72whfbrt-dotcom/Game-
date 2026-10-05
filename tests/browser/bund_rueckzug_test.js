// Bündnis-Signal „Rückzug!“ (Alexander 5.10., LIESMICH 11b C): Mitspieler kehren mit allem um, was zu dem Ort unterwegs ist
// (Truppen stimmen: nichts doppelt, nichts weg), und holen ihre Verstärkung dort heim; ein echter Spieler bekommt nur eine
// Nachricht und sein Marsch läuft weiter. Dazu der Chat der Mitspieler (11b D): auf „Später“ folgt nach 5–15 Min. „Jetzt!“
// (und sie greifen an) oder „Nein“; „Danke!“, wenn Verstärkung ankommt; „Gut gemacht!“ nach einem gemeinsamen Sieg.
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    // S ruft, H ist Mitspieler (online), M echter Spieler, X der Gegner mit Basis E; Basis T gehört M (H verstärkt dort)
    // Gegner X bekommt eine freie Basis E auf der Insel von H, S eine Basis F daneben (beide kommen ohne Tor hin)
    let H, E, F; for (const h of bots) { const L = islandById[botCapitalOf(h.id)].landmassId, frei = islands.filter(i => i.landmassId === L && i.id !== megaTempleId && !islandOwnerOf(i.id));
      if (frei.length >= 2) { H = h; E = frei[0].id; F = frei[1].id; break; } }
    if (!H) return { fehler: 'keine zwei freien Inseln neben einem Mitspieler' };
    const [S, M, X] = bots.filter(x => x !== H); botCoins[S.id] = botCoins[H.id] = 1e9; botDropShield(X.id);
    botOwnedIslands[X.id].add(E); botOwnedIslands[S.id].add(F); islandTroops[E] = 1000; islandTroops[F] = 500000;
    for (const x of [S, H, M, X]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    botCoins[S.id] = 1e9; bundOp(S.id, { op: 'gruenden', name: 'Rueckzugprobe', tag: 'RZP', offen: true });
    const a = bundVon(S.id); bundOp(H.id, { op: 'beitreten', aid: a.id }); bundOp(M.id, { op: 'beitreten', aid: a.id });
    const st = loadBotState(); st[H.id].handy = { r: 0, bis: Date.now() + 1e9 }; saveBotState();
    const meld = []; window.bundMelden = (w, text) => { if (botById[w] && botById[w].mensch) meld.push({ w, text }); };
    const T = botCapitalOf(M.id), HQ = botCapitalOf(H.id), MQ = [...botOwnedIslands[M.id]].find(id => id !== T) ?? T;
    const out = { a: a.mit.length };
    const zeilen = k => ((bundChat[a.id] || {}).l || []).filter(x => x.k === k);
    const runde = () => { bundWegMem.clear(); bundMitspielerAntworten(Date.now()); };
    const truppen = w => pendingAttacks.filter(m => m.attackerBotId === w).reduce((s, m) => s + m.rawTroops, 0) + pendingSends.filter(m => m.senderBotId === w).reduce((s, m) => s + m.troops, 0) + verst.l.filter(v => v.w === w).reduce((s, v) => s + v.n, 0);
    botById[M.id].mensch = true;
    try {
      // 1) Angriff von H und vom echten Spieler M auf E unterwegs → Rückzug von E
      const n0 = Date.now();
      pendingAttacks.push({ sourceId: HQ, targetId: E, rawTroops: 4000, startedAt: n0 - 20000, resolveAt: n0 + 3600000, attackerBotId: H.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 });
      pendingAttacks.push({ sourceId: MQ, targetId: E, rawTroops: 3000, startedAt: n0 - 20000, resolveAt: n0 + 3600000, attackerBotId: M.id, attackBonus: 0, atkTitle: 1, atkKraft: 1 });
      const h0 = truppen(H.id);
      const why = bundOp(S.id, { op: 'chat', k: 'rueckzug', z: E });
      out.signal = { why, sig: a.sig.filter(s => s.art === 'rueckzug' && s.z === E && s.w === S.id).length, zeile: zeilen('rueckzug').length, meld: meld.filter(m => m.w === M.id && /Rückzug/.test(m.text)).length };
      runde(); runde();
      const heim = pendingSends.filter(m => m.senderBotId === H.id && m.back && m.fromId === E);
      out.umkehr = { angriffH: pendingAttacks.filter(m => m.attackerBotId === H.id && m.targetId === E).length, heim: heim.length, heimTruppen: heim.reduce((s, m) => s + m.troops, 0), nachHause: heim[0] && heim[0].toId === HQ,
        zurueckIn: heim[0] ? Math.round((heim[0].resolveAt - Date.now()) / 1000) : null, gleich: truppen(H.id) === h0,
        mensch: pendingAttacks.filter(m => m.attackerBotId === M.id && m.targetId === E).length };
      // 2) H verstärkt T (Basis von M) und schickt gerade noch mehr hin → Rückzug von T: alles heim, Meldung an M, Zeile im Chat
      a.sig.forEach(s => s.at -= 60000); meld.length = 0; bundMem.chatAt = {};
      verst.l.push({ id: 'vRZ', w: H.id, t: T, n: 2500, von: HQ, at: Date.now() });
      pendingSends.push({ fromId: HQ, toId: T, troops: 900, startedAt: Date.now() - 5000, resolveAt: Date.now() + 600000, senderBotId: H.id, verst: 1 });
      const h1 = truppen(H.id);
      bundOp(S.id, { op: 'chat', k: 'rueckzug', z: T }); runde();
      const heim2 = pendingSends.filter(m => m.senderBotId === H.id && m.back && m.fromId === T);
      out.verst = { bleibt: verst.l.filter(v => v.w === H.id && v.t === T).length, heim: heim2.length, heimTruppen: heim2.reduce((s, m) => s + m.troops, 0), unterwegs: pendingSends.filter(m => m.senderBotId === H.id && m.toId === T && !m.back).length,
        gleich: truppen(H.id) === h1, meld: meld.filter(m => m.w === M.id && /holt seine 2[.,]?500 Truppen aus .* heim/.test(m.text)).length, chat: zeilen('s_heim').filter(x => x.w === H.id && x.z === T && x.d && x.d.n === 2500).length };
      // 3) „Später“ → nach 5–15 Min. „Jetzt!“ (mit Ziel, sie greifen an) bzw. „Nein“ (ohne Ziel)
      const zufall = Math.random; bundMem.chatQ = []; bundMem.ziel = {}; bundMem.chatAt = {};
      bundOp(M.id, { op: 'chat', k: 'teilen', z: E }); bundMem.chatAt = {};
      Math.random = () => .9; try { bundChatAntworten(a, M.id, 'wann'); } finally { Math.random = zufall; }
      const t0 = Date.now(), q0 = bundMem.chatQ.filter(q => q.w === H.id || q.w === S.id).map(q => q.k);
      bundChatTakt(t0 + 30000);
      const folge = bundMem.chatQ.filter(q => q.tat && q.tat.folge !== undefined);
      out.spaeter = { gesagt: q0, zeile: zeilen('spaeter').length, folge: folge.length, ab: folge[0] ? Math.round((folge[0].at - t0) / 60000) : null, ziel: folge[0] ? folge[0].tat.folge : null };
      for (const w of [S.id, H.id]) { st[w].handy = { r: 0, bis: Date.now() + 1e9 }; } saveBotState();
      islandTroops[HQ] = Math.max(islandTroops[HQ] || 0, 500000);
      bundChatTakt(t0 + 16 * 60000);
      const wer = folge[0] ? folge[0].w : null;
      out.jetzt = { wer, jetzt: zeilen('jetzt').filter(x => x.w === wer).length, nein: zeilen('nein').filter(x => x.w === wer).length, ziel: wer && bundMem.ziel[wer] ? bundMem.ziel[wer].t : null, rest: bundMem.chatQ.length };
      // ohne Ziel: „Nein“
      bundMem.chatQ = [{ at: 0, aid: a.id, w: H.id, k: 'jetzt', z: null, tat: { folge: null, bis: Date.now() + 1e9 } }]; bundChat[a.id].l = bundChat[a.id].l.filter(x => x.k !== 'teilen');
      const n1 = zeilen('nein').length; bundChatTakt(Date.now() + 60000);
      out.ohneZiel = { nein: zeilen('nein').length - n1 };
      // 4) „Danke!“ wenn Verstärkung bei einem Mitspieler ankommt (selten – hier mit Glück)
      const hb = loadBotState()[H.id]; hb.city.levels.keep = Math.max(5, hb.city.levels.keep || 0); hb.city.levels.embassy = Math.max(1, hb.city.levels.embassy || 0); saveBotState();
      bundMem.chatQ = []; bundMeldeZeit.clear(); Math.random = () => .1;
      try { resolveSend({ fromId: MQ, toId: HQ, troops: 700, startedAt: Date.now() - 1000, resolveAt: Date.now(), senderBotId: M.id, verst: 1 }); } finally { Math.random = zufall; }
      out.danke = bundMem.chatQ.filter(q => q.k === 'danke' && q.w === H.id).length;
      // 5) „Gut gemacht!“ nach einem gemeinsamen Sieg
      bundMem.chatQ = []; Math.random = () => .1;
      try { bundRallyBeute({ rally: { by: S.id, an: [[S.id, botCapitalOf(S.id), 1000], [H.id, HQ, 800]] } }, 0, true, E, null); } finally { Math.random = zufall; }
      out.gut = bundMem.chatQ.filter(q => q.k === 'gut').length;
    } finally { botById[M.id].mensch = false; verst.l = verst.l.filter(v => v.id !== 'vRZ'); botOwnedIslands[X.id].delete(E); botOwnedIslands[S.id].delete(F); }
    return out;
  });
  console.log(JSON.stringify(r));
  if (r.fehler) { ok(false, r.fehler); await b.close(); return; }
  ok(r.signal.why === '' && r.signal.sig === 1 && r.signal.zeile === 1, '„Rückzug!“: Signal mit Ort und Zeile im Bündnis-Chat', r.signal);
  ok(r.signal.meld === 1, 'echter Spieler: genau eine Nachricht (er entscheidet selbst)', r.signal);
  ok(r.umkehr.angriffH === 0 && r.umkehr.heim === 1 && r.umkehr.heimTruppen === 4000 && r.umkehr.nachHause && r.umkehr.zurueckIn > 0 && r.umkehr.zurueckIn <= 25 && r.umkehr.gleich, 'Mitspieler kehrt um: Angriff weg, 4.000 Truppen gehen heim (so lange, wie er unterwegs war)', r.umkehr);
  ok(r.umkehr.mensch === 1, 'der Angriff des echten Spielers läuft weiter', r.umkehr);
  ok(r.verst.bleibt === 0 && r.verst.unterwegs === 0 && r.verst.heim === 2 && r.verst.heimTruppen === 3400 && r.verst.gleich, 'Rückzug aus einer Basis: Verstärkung und Marsch dorthin gehen heim (Truppen stimmen)', r.verst);
  ok(r.verst.meld === 1 && r.verst.chat === 1, 'Meldung „… holt seine 2.500 Truppen aus … heim“ an den Gastgeber + Zeile im Chat', r.verst);
  ok(r.spaeter.zeile >= 1 && r.spaeter.folge === 1 && r.spaeter.ab >= 5 && r.spaeter.ab <= 15, '„Später“: Folge-Antwort in 5–15 Min. geplant', r.spaeter);
  ok(r.jetzt.jetzt === 1 && r.jetzt.ziel === r.spaeter.ziel && r.jetzt.ziel !== null, 'nach „Später“ kommt „Jetzt!“ – und er greift das geteilte Ziel an', r.jetzt);
  ok(r.ohneZiel.nein === 1, 'ohne Ziel: nach „Später“ kommt „Nein“', r.ohneZiel);
  ok(r.danke === 1, '„Danke!“, wenn Verstärkung bei einem Mitspieler ankommt', r.danke);
  ok(r.gut === 1, '„Gut gemacht!“ nach einem gemeinsamen Sieg', r.gut);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
