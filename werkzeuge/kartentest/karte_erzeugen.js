// Karten-Testdatei (LIESMICH 11c Punkt 30): erzeugt das Datenmodell der Zonen-Karte wie das RoK-Königreich
// (Vorlage vorbilder/13_rok_zonen_vorlage.png) → karte_daten.js. Aufruf: node werkzeuge/kartentest/karte_erzeugen.js
// Zone 1 außen: 8 Gebiete · Zone 2: 4 Gebiete als Ring · Zone 3: die Mitte mit dem Thron. Grenzen = Linienzüge zwischen
// genau zwei Gebieten (b = -1: Kartenrand), jedes Gebiet ist ein Ring aus seinen Grenzen. Pässe liegen auf einer Grenze,
// dort läuft die Grenze ein Stück genau waagrecht (Quer-Tor) bzw. senkrecht (Tor für Nord-Süd-Ketten).
'use strict';
const fs = require('fs'), path = require('path');

const H = 477000;                                     // halbe Kartenbreite (wie im Spiel: 8,5 × 56.120)
const N = 96, ZELLE = 2 * H / N;                      // Raster zum Finden der Grenzen (danach geglättet)
const GRAD = Math.PI / 180;
// Grenzwinkel (0° = Osten, 90° = Süden): Zone 1 zwischen den Ecken und Seiten, Zone 2 um 45° dazu versetzt
const Z1_WINKEL = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((w, k) => (w + [5, -8, 6, -4, 9, -6, 3, -7][k]) * GRAD);
const Z2_WINKEL = [0, 90, 180, 270].map((w, k) => (w + [8, -6, 5, -9][k]) * GRAD);

function zoneAn(u, v) {                               // u, v: −1…1; 3 = Mitte, 2 = Ring, 1 = außen
  const r = Math.pow(Math.abs(u) ** 3 + Math.abs(v) ** 3, 1 / 3), t = Math.atan2(v, u);
  const r3 = .27 + .035 * Math.sin(3 * t + 1) + .02 * Math.sin(5 * t + 2) + .012 * Math.sin(9 * t + .3);
  const r2 = .62 + .05 * Math.sin(2 * t + .5) + .03 * Math.sin(5 * t + 4) + .015 * Math.sin(11 * t + 1.7);
  return r < r3 ? 3 : r < r2 ? 2 : 1;
}
function sektor(u, v, winkel, wellen) {               // Index des Winkelbereichs (Grenzen schwingen mit dem Abstand zur Mitte)
  const r = Math.hypot(u, v); let t = Math.atan2(v, u); if (t < 0) t += 2 * Math.PI;
  for (let k = winkel.length - 1; k >= 0; k--) {
    const w = winkel[k] + wellen * (Math.sin(r * 7 + k * 1.3) + .5 * Math.sin(r * 15 + k * 2.1));
    if (t >= w) return k;
  }
  return winkel.length - 1;
}
// Gebiet-Nummern: 0 = Mitte, 1–4 Zone 2, 5–12 Zone 1
function gebietAn(u, v) {
  const z = zoneAn(u, v);
  return z === 3 ? 0 : z === 2 ? 1 + sektor(u, v, Z2_WINKEL, .1) : 5 + sektor(u, v, Z1_WINKEL, .09);
}

// 1) Raster füllen, kleine Splitter dem Nachbarn geben
const L = new Int8Array(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) L[j * N + i] = gebietAn(((i + .5) / N) * 2 - 1, ((j + .5) / N) * 2 - 1);
const an = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? -1 : L[j * N + i]);
for (let pass = 0; pass < 3; pass++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {   // Zacken: Zelle mit ≥ 3 anderen Nachbarn gleicher Art
  const z = {}; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = an(i + a, j + b); if (q >= 0) z[q] = (z[q] || 0) + 1; }
  const best = Object.keys(z).sort((a, b) => z[b] - z[a])[0];
  if (z[best] >= 3 && +best !== L[j * N + i]) L[j * N + i] = +best;
}
for (let g = 0; g < 13; g++) {                        // je Gebiet nur das größte zusammenhängende Stück
  const seen = new Uint8Array(N * N), teile = [];
  for (let p = 0; p < N * N; p++) if (L[p] === g && !seen[p]) {
    const st = [p], teil = []; seen[p] = 1;
    while (st.length) { const q = st.pop(); teil.push(q); const i = q % N, j = (q - i) / N;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b, r = y * N + x; if (an(x, y) === g && !seen[r]) { seen[r] = 1; st.push(r); } } }
    teile.push(teil); }
  teile.sort((a, b) => b.length - a.length);
  for (const t of teile.slice(1)) for (const q of t) { const i = q % N, j = (q - i) / N; L[q] = [an(i + 1, j), an(i - 1, j), an(i, j + 1), an(i, j - 1)].find(x => x >= 0 && x !== g); }
}

// 2) Kanten zwischen verschiedenen Zellen (Gitterpunkte i, j = 0…N), dann zu Linienzügen zwischen Knoten verbinden
const kanten = [], amPunkt = new Map();
const pk = (i, j) => i * (N + 1) + j;
function kante(i1, j1, i2, j2, a, b) {
  const e = { p: pk(i1, j1), q: pk(i2, j2), a: Math.min(a, b), b: Math.max(a, b), weg: false };
  e.a2 = e.a === -1 ? e.b : e.a; e.b2 = e.a === -1 ? -1 : e.b;   // Kartenrand immer als b = −1
  kanten.push(e);
  for (const x of [e.p, e.q]) (amPunkt.get(x) || amPunkt.set(x, []).get(x)).push(e);
}
for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
  const c = an(i, j), r = an(i + 1, j), u = an(i, j + 1);
  if (j >= 0 && c !== r && (c >= 0 || r >= 0)) kante(i + 1, j, i + 1, j + 1, c, r);
  if (i >= 0 && c !== u && (c >= 0 || u >= 0)) kante(i, j + 1, i + 1, j + 1, c, u);
}
const istKnoten = p => { const es = amPunkt.get(p); return es.length !== 2 || es[0].a2 !== es[1].a2 || es[0].b2 !== es[1].b2; };
const linien = [];
function verfolgen(start, e0) {
  const pts = [start]; let p = start, e = e0;
  while (e && !e.weg) { e.weg = true; p = e.p === p ? e.q : e.p; pts.push(p); if (istKnoten(p)) break; e = amPunkt.get(p).find(x => !x.weg); }
  linien.push({ a: e0.a2, b: e0.b2, pts });
}
for (const [p, es] of amPunkt) if (istKnoten(p)) for (const e of es) if (!e.weg) verfolgen(p, e);
for (const e of kanten) if (!e.weg) verfolgen(e.p, e);          // (geschlossene Ringe ohne Knoten)
const welt = p => { const i = Math.floor(p / (N + 1)), j = p % (N + 1); return [i * ZELLE - H, j * ZELLE - H]; };

// 3) glätten (Enden fest, der Kartenrand bleibt gerade), dann auf 3.000er-Schritte bringen
function glaetten(pts, n) {
  for (let k = 0; k < n; k++) pts = pts.map((p, i) => (i === 0 || i === pts.length - 1) ? p : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]);
  return pts;
}
function laengen(pts) { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; }
function punktBei(pts, s, d) { let i = 1; while (i < pts.length - 1 && s[i] < d) i++; const t = (d - s[i - 1]) / ((s[i] - s[i - 1]) || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }
function neuTeilen(pts, schritt) { const s = laengen(pts), n = Math.max(1, Math.round(s[s.length - 1] / schritt)), o = [];
  for (let k = 0; k <= n; k++) o.push(punktBei(pts, s, s[s.length - 1] * k / n)); return o; }
const grenzen = linien.map((l, id) => {
  let pts = l.pts.map(welt);
  if (l.b !== -1) { pts = neuTeilen(pts, ZELLE / 3); pts = glaetten(pts, 40); pts = neuTeilen(pts, 3000); }
  return { id, a: l.a, b: l.b, punkte: pts };
});

// 4) Pässe: je Paar Nachbarn (Zone 1 untereinander, je Zone-1-Gebiet einer nach innen, Zone 2 untereinander, Zone 2 → Mitte)
const zoneVon = g => g === 0 ? 3 : g <= 4 ? 2 : 1;
const paare = new Map();                                // "a,b" → Grenzen
for (const g of grenzen) if (g.b !== -1) { const k = g.a + ',' + g.b; (paare.get(k) || paare.set(k, []).get(k)).push(g); }
const TOR_GERADE = 16000, TOR_WEICH = 34000, TOR_ABSTAND = 70000;
const paesse = [];
function passSetzen(a, b, art) {
  const gs = paare.get(Math.min(a, b) + ',' + Math.max(a, b)); if (!gs) return false;
  let best = null;
  for (const g of gs) {
    const s = laengen(g.punkte), len = s[s.length - 1], rand = TOR_GERADE + TOR_WEICH + 15000;
    for (let d = rand; d <= len - rand; d += 3000) {
      const p = punktBei(g.punkte, s, d), p0 = punktBei(g.punkte, s, d - TOR_GERADE), p1 = punktBei(g.punkte, s, d + TOR_GERADE);
      const senk = Math.abs(p1[1] - p0[1]) > Math.abs(p1[0] - p0[0]);
      let abw = 0; for (let e = -TOR_GERADE - TOR_WEICH; e <= TOR_GERADE + TOR_WEICH; e += 3000) { const q = punktBei(g.punkte, s, d + e); abw += Math.abs(senk ? q[0] - p[0] : q[1] - p[1]); }
      if (paesse.some(o => Math.hypot(o.x - p[0], o.y - p[1]) < TOR_ABSTAND)) continue;
      const wert = abw + Math.abs(d - len / 2) * .6;
      if (!best || wert < best.wert) best = { wert, g, d, x: p[0], y: p[1], senk };
    } }
  if (!best) return false;
  // Grenze am Pass gerade ziehen: ±TOR_GERADE genau waagrecht/senkrecht, weich zurück in den Schwung
  const g = best.g, s = laengen(g.punkte);
  g.punkte = g.punkte.map((q, i) => { const u = Math.abs(s[i] - best.d); if (u >= TOR_GERADE + TOR_WEICH) return q;
    const w = u <= TOR_GERADE ? 1 : 1 - (u - TOR_GERADE) / TOR_WEICH, k = w * w * (3 - 2 * w);
    return best.senk ? [q[0] + (best.x - q[0]) * k, q[1]] : [q[0], q[1] + (best.y - q[1]) * k]; });
  paesse.push({ id: paesse.length, a: g.a, b: g.b, grenze: g.id, x: best.x, y: best.y, senk: best.senk, art });
  return true;
}
const nachbarn = g => [...paare.keys()].map(k => k.split(',').map(Number)).filter(([a, b]) => a === g || b === g).map(([a, b]) => a === g ? b : a);
for (let g = 5; g <= 12; g++) passSetzen(g, g === 12 ? 5 : g + 1, 'gruen');                              // Zone 1 im Kreis
for (let g = 5; g <= 12; g++) { const innen = nachbarn(g).filter(n => zoneVon(n) === 2);                // je Zone-1-Gebiet ein Pass nach innen
  innen.sort((x, y) => paare.get(Math.min(g, y) + ',' + Math.max(g, y)).reduce((m, q) => m + q.punkte.length, 0) - paare.get(Math.min(g, x) + ',' + Math.max(g, x)).reduce((m, q) => m + q.punkte.length, 0));
  for (const n of innen) if (passSetzen(g, n, 'blau')) break; }
for (let g = 1; g <= 4; g++) passSetzen(g, g === 4 ? 1 : g + 1, 'blau');                                // Zone 2 im Kreis
for (let g = 1; g <= 4; g++) passSetzen(g, 0, 'lila');                                                  // Zone 2 → Mitte

// 5) Gebiete als Ringe aus ihren Grenzen
const rund = p => [Math.round(p[0]), Math.round(p[1])];
for (const g of grenzen) g.punkte = g.punkte.map(rund);
const gebiete = [];
for (let id = 0; id < 13; id++) {
  const teile = grenzen.filter(g => g.a === id || g.b === id).map(g => ({ id: g.id, pts: g.punkte }));
  const ring = [], rand = [], gleich = (p, q) => Math.abs(p[0] - q[0]) < 2 && Math.abs(p[1] - q[1]) < 2;
  let t = teile.shift(); rand.push(t.id); ring.push(...t.pts);
  while (teile.length) {
    const ende = ring[ring.length - 1], k = teile.findIndex(x => gleich(x.pts[0], ende) || gleich(x.pts[x.pts.length - 1], ende));
    if (k < 0) throw new Error('Gebiet ' + id + ': Rand nicht geschlossen');
    const x = teile.splice(k, 1)[0], vor = gleich(x.pts[0], ende); rand.push(vor ? x.id : -x.id - 1);
    ring.push(...(vor ? x.pts : [...x.pts].reverse()).slice(1));
  }
  let sx = 0, sy = 0, n = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (L[j * N + i] === id) { sx += i; sy += j; n++; }
  const z = zoneVon(id);
  gebiete.push({ id, zone: z, name: z === 3 ? 'Mitte' : 'Zone ' + z + ' · ' + (z === 2 ? id : id - 4), boden: ['', 'aussen', 'mitte', 'sand'][z],
    mitte: [Math.round(((sx / n + .5) / N * 2 - 1) * H), Math.round(((sy / n + .5) / N * 2 - 1) * H)], rand, umriss: ring.slice(0, -1) });
}
gebiete[0].mitte = [0, 0];

const daten = { welt: { halb: H }, thron: { x: 0, y: 0 }, gebiete, grenzen, paesse };
const kopf = '// Datenmodell der Zonen-Karte (erzeugt von karte_erzeugen.js – nicht von Hand ändern)\n' +
  '// gebiete: { id, zone 1–3, name, boden, mitte, rand: Grenzen-Ids (−id−1 = rückwärts), umriss: Punkte }\n' +
  '// grenzen: { id, a, b (−1 = Kartenrand), punkte } · paesse: { id, a, b, grenze, x, y, senk (Grenze läuft senkrecht), art gruen|blau|lila }\n';
fs.writeFileSync(path.join(__dirname, 'karte_daten.js'), kopf + 'const KARTE_ZONEN = ' + JSON.stringify(daten) + ';\n');
console.log('Gebiete', gebiete.length, '· Grenzen', grenzen.length, '(Rand', grenzen.filter(g => g.b === -1).length + ') · Pässe', paesse.length,
  paesse.map(p => p.art[0] + p.a + '-' + p.b + (p.senk ? '|' : '—')).join(' '));
