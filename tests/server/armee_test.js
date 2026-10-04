// Nebel bei Armeen und Feldern (Server): fremde Armeen/Felder im Nebel zeigen keine Truppenzahl und keinen Helden
const G = require('./gemeinsam');
const { sql, ok, ende } = G;
let b;
(async () => {
  b = await G.browser(); const fehler = [];
  const p = await G.rein(b, 'pruefer6', { fehler, warte: 25000 });
  for (const runde of [1, 2]) {
    const r = await p.evaluate(() => {
      const fa = armies.filter(a => a.who), nebel = fa.filter(a => { const q = armyPos(a); return !isCellOpen(q.x, q.y); });
      const ff = Object.entries(fieldState).filter(([id, st]) => st && st.occ && st.occ.who !== 'player'), fNebel = ff.filter(([id]) => { const f = resFields.find(x => x.id === id); return f && !isCellOpen(f.x, f.y); });
      return { fremdeArmeen: fa.length, imNebel: nebel.length, imNebelMitZahl: nebel.filter(a => a.troops > 0 || a.hero).length, sichtbarMitZahl: fa.filter(a => a.troops > 0).length,
        fremdeFelder: ff.length, felderImNebel: fNebel.length, felderImNebelMitZahl: fNebel.filter(([, st]) => st.occ.troops > 0 || st.occ.hero).length };
    });
    ok('Runde ' + runde + ': im Nebel keine Zahlen', r.imNebelMitZahl === 0 && r.felderImNebelMitZahl === 0, JSON.stringify(r));
    await p.waitForTimeout(20000);
  }
  console.log('armee_sicht gespeichert:', sql(`SELECT LEFT(IFNULL(armee_sicht,'(leer)'),80) FROM ow_spieler WHERE id=${G.spielerId('pruefer6')}`));
  ok('keine Skript-Fehler', !fehler.length, fehler.join(' | '));
  ende(); await b.close();
})().catch(async e => { ok('Test lief durch', false, e.message); ende(); if (b) await b.close(); });
