// Verstärkung heimholen (Alexander 5.10., LIESMICH 11b D): holt ein Verbündeter seine Verstärkung heim – auch ein Mitspieler nach
// 30 ruhigen Minuten (vorher ohne Wort) –, bekommt der Gastgeber die Meldung „Finn holt seine 2 Mio. Truppen aus … heim“ und im
// Bündnis-Chat steht eine Zeile. Truppen stimmen. Beim Antippen der EIGENEN Basis sieht man, wer dort mit wie vielen Truppen
// verstärkt (mit „Heimschicken“), bei der Basis eines Mitglieds die eigenen Truppen dort (mit „Zurückholen“).
const { chromium, devices } = require('playwright');
const ok = (b, t, x) => console.log((b ? 'OK   ' : 'FEHLER ') + t + (x !== undefined ? ' – ' + JSON.stringify(x) : ''));
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=http://127.0.0.1:9'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); const fe = []; p.on('pageerror', e => fe.push(e.message));
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '/index.html'); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const bots = BOT_DEFS.filter(x => !x.mensch && botOwnedIslands[x.id] && botOwnedIslands[x.id].size && islandById[botCapitalOf(x.id)]);
    const [M, H] = bots, T = botCapitalOf(M.id), HQ = botCapitalOf(H.id);
    for (const x of [M, H]) if (bundVon(x.id)) bundOp(x.id, { op: 'verlassen' });
    botCoins[M.id] = 1e9; bundOp(M.id, { op: 'gruenden', name: 'Heimprobe', tag: 'HMP', offen: true }); bundOp(H.id, { op: 'beitreten', aid: bundVon(M.id).id });
    const a = bundVon(M.id), meld = []; window.bundMelden = (w, text) => { if (botById[w] && botById[w].mensch) meld.push({ w, text }); };
    const zeilen = k => ((bundChat[a.id] || {}).l || []).filter(x => x.k === k);
    const out = {}, zufall = Math.random;
    botById[M.id].mensch = true;
    try {
      // 1) Mitspieler holt nach 30 ruhigen Minuten heim
      verst.l = [{ id: 'vH1', w: H.id, t: T, n: 2000000, von: HQ, at: Date.now() - 31 * 60000 }];
      Math.random = () => .29; try { bundMitspielerRunde(Date.now()); } finally { Math.random = zufall; }
      const heim = pendingSends.filter(m => m.senderBotId === H.id && m.back && m.fromId === T);
      out.ruhe = { bleibt: verst.l.filter(v => v.id === 'vH1').length, heim: heim.reduce((s, m) => s + m.troops, 0), nach: heim[0] && heim[0].toId,
        meld: meld.filter(m => m.w === M.id).map(m => m.text), chat: zeilen('s_heim').filter(x => x.w === H.id && x.z === T && x.d && x.d.n === 2000000).map(x => bundChatText(x, false)) };
      // 2) der Helfer holt sie selbst (Befehl „verstZurueck“) → dieselbe Meldung
      meld.length = 0; verst.l = [{ id: 'vH2', w: H.id, t: T, n: 3000, von: HQ, at: Date.now() }];
      bundOp(H.id, { op: 'verstZurueck', vid: 'vH2' });
      out.selbst = { bleibt: verst.l.length, meld: meld.filter(m => m.w === M.id && /holt seine 3[.,]?000 Truppen aus .* heim/.test(m.text)).length };
    } finally { botById[M.id].mensch = false; pendingSends = pendingSends.filter(m => m.senderBotId !== H.id); }
    // 3) Inselfenster (Zuschauer): eigene Basis zeigt, wer dort verstärkt; Basis des Mitglieds zeigt deine Truppen dort
    const P = playerIslandId; a.mit.push('player'); bundIndex();
    verst.l = [{ id: 'vP1', w: H.id, t: P, n: 1234567, von: HQ, at: Date.now() }, { id: 'vP2', w: 'player', t: HQ, n: 4321, von: P, at: Date.now() }];
    window.__befehle = [];
    const W = { leiter: false, ich: 'u999', menschen: {}, beiNachricht: [], befehl(art, d) { window.__befehle.push(Object.assign({ art }, d)); }, nachricht() {}, bericht() {} };
    window.WELT = new Proxy(W, { get: (o, k) => k in o ? o[k] : () => [] });
    closeAllPopups(); popupIslandId = P; popupView = 'menu'; renderPopup();
    const box = document.getElementById('popupBund'), t1 = box.innerText;
    const knopf = box.querySelector('[data-bvheim="vP1"]'); if (knopf) knopf.click();
    closeAllPopups(); popupIslandId = HQ; popupView = 'menu'; renderPopup();
    const t2 = document.getElementById('popupBund').innerText, k2 = !!document.getElementById('popupBund').querySelector('[data-bvheim="vP2"]');
    out.fenster = { eigen: /Verstärkung hier/.test(t1) && t1.includes(bundName(H.id)) && /1\.234\.567/.test(t1), knopf: !!knopf, befehl: window.__befehle.filter(x => x.op === 'verstZurueck' && x.vid === 'vP1').length,
      mitglied: /Deine Truppen hier/.test(t2) && /4\.321/.test(t2) && k2, rueckzug: !!document.querySelector('#popupBund [data-bsig="rueckzug"]'), t1: t1.slice(0, 200) };
    return out;
  });
  console.log(JSON.stringify(r));
  ok(r.ruhe.bleibt === 0 && r.ruhe.heim === 2000000, 'Mitspieler holt nach 30 ruhigen Min. heim: 2 Mio. Truppen marschieren zurück (nichts weg, nichts doppelt)', r.ruhe);
  ok(r.ruhe.meld.length === 1 && /holt seine 2\sMio\. Truppen aus .* heim/.test(r.ruhe.meld[0]), 'Meldung an den Gastgeber: „… holt seine 2 Mio. Truppen aus … heim“', r.ruhe.meld);
  ok(r.ruhe.chat.length === 1 && /holt seine 2\sMio\. Truppen aus .* heim/.test(r.ruhe.chat[0]), 'Zeile im Bündnis-Chat (mit Ort)', r.ruhe.chat);
  ok(r.selbst.bleibt === 0 && r.selbst.meld === 1, 'holt der Helfer selbst heim: dieselbe Meldung', r.selbst);
  ok(r.fenster.eigen && r.fenster.knopf && r.fenster.befehl === 1, 'eigene Basis antippen: wer dort mit wie vielen Truppen verstärkt + „Heimschicken“', r.fenster);
  ok(r.fenster.mitglied, 'Basis eines Mitglieds: deine Truppen dort + „Zurückholen“', r.fenster);
  ok(r.fenster.rueckzug, 'Inselfenster hat den Knopf „Rückzug!“', r.fenster);
  console.log('Fehler:', fe.length ? [...new Set(fe)].slice(0, 5) : 'keine'); await b.close();
})();
