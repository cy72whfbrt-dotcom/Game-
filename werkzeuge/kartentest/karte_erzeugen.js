// Karten-Testdatei (LIESMICH 11c Punkt 30): erzeugt das Datenmodell der Zonen-Karte wie das RoK-Königreich
// (Vorlage vorbilder/13_rok_zonen_vorlage.png) → karte_daten.js. Aufruf: node werkzeuge/kartentest/karte_erzeugen.js
// Zone 1 außen … Zone 4 innen: je Ring mehrere große Gebiete, dann die Mitte mit dem Thron. Grenzen = Linienzüge zwischen
// genau zwei Gebieten (b = -1: Kartenrand), jedes Gebiet ist ein Ring aus seinen Grenzen. Pässe liegen auf einer Grenze,
// dort läuft die Grenze ein Stück genau waagrecht (Quer-Tor) bzw. senkrecht (Tor für Nord-Süd-Ketten).
'use strict';
const fs = require('fs'), path = require('path');

const H = 850000;                                     // halbe Kartenbreite (größer als das Spiel heute: Platz für 5 Ringe)
const N = 150, ZELLE = 2 * H / N;                     // Raster zum Finden der Grenzen (danach geglättet)
const MITTE = 5;                                      // Zonen 1 (außen) … 4, 5 = Mitte
const ANZAHL = { 1: 10, 2: 8, 3: 6, 4: 4 };           // Gebiete je Ring
const RING_R = [.68, .5, .33, .165];                  // Außenrand von Zone 2 … Mitte (Anteil der halben Breite, ohne Wellen)
const zufall = (() => { let x = 4711; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
const WINKEL = {};                                    // Grenzwinkel je Ring (0° = Osten, 90° = Süden), gegeneinander versetzt, leicht ungleich
for (let z = 1; z <= 4; z++) { const n = ANZAHL[z], ph = [.5, 0, .5, 0][z - 1];
  WINKEL[z] = Array.from({ length: n }, (_, k) => (k + ph + (zufall() - .5) * .3) * 2 * Math.PI / n).sort((a, b) => a - b); }
const START = { [MITTE]: 0 }; { let id = 1; for (let z = 4; z >= 1; z--) { START[z] = id; id += ANZAHL[z]; } }   // Gebiet-Nummern: 0 = Mitte, dann Zone 4 … Zone 1
const GEBIETE = START[1] + ANZAHL[1];

function zoneAn(u, v) {                               // u, v: −1…1 → Zone 1…4, 5 = Mitte
  const r = Math.pow(Math.abs(u) ** 3 + Math.abs(v) ** 3, 1 / 3), t = Math.atan2(v, u);
  let z = 1;
  RING_R.forEach((R, k) => { const w = R + R * (.07 * Math.sin(3 * t + 1 + k) + .04 * Math.sin(5 * t + 2 + 2 * k) + .02 * Math.sin(9 * t + .3 + k)); if (r < w) z = k + 2; });
  return z;
}
function sektor(u, v, winkel, wellen) {               // Index des Winkelbereichs (Grenzen schwingen mit dem Abstand zur Mitte)
  const r = Math.hypot(u, v); let t = Math.atan2(v, u); if (t < 0) t += 2 * Math.PI;
  for (let k = winkel.length - 1; k >= 0; k--) {
    const w = winkel[k] + wellen * (Math.sin(r * 7 + k * 1.3) + .5 * Math.sin(r * 15 + k * 2.1));
    if (t >= w) return k;
  }
  return winkel.length - 1;
}
function gebietAn(u, v) {
  const z = zoneAn(u, v);
  return z === MITTE ? 0 : START[z] + sektor(u, v, WINKEL[z], .06);
}
const zoneVon = g => g === 0 ? MITTE : +Object.keys(START).find(z => z < MITTE && g >= START[z] && g < START[z] + ANZAHL[z]);

// 1) Raster füllen, kleine Splitter dem Nachbarn geben
const L = new Int8Array(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) L[j * N + i] = gebietAn(((i + .5) / N) * 2 - 1, ((j + .5) / N) * 2 - 1);
const an = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? -1 : L[j * N + i]);
for (let pass = 0; pass < 3; pass++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {   // Zacken: Zelle mit ≥ 3 anderen Nachbarn gleicher Art
  const z = {}; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = an(i + a, j + b); if (q >= 0) z[q] = (z[q] || 0) + 1; }
  const best = Object.keys(z).sort((a, b) => z[b] - z[a])[0];
  if (z[best] >= 3 && +best !== L[j * N + i]) L[j * N + i] = +best;
}
for (let g = 0; g < GEBIETE; g++) {                   // je Gebiet nur das größte zusammenhängende Stück
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

// 4) Pässe: im Ring jedes Nachbarpaar, je Gebiet einer nach innen (zum Gebiet mit den wenigsten), Zone 4 → Mitte.
//    stufe = Zone, in die der Pass führt (1: Zone 1 untereinander … 5: in die Mitte) – danach öffnen sie gestaffelt.
const paare = new Map();                                // "a,b" → Grenzen
for (const g of grenzen) if (g.b !== -1) { const k = g.a + ',' + g.b; (paare.get(k) || paare.set(k, []).get(k)).push(g); }
const RAND_FREI = 60000;                              // Pässe nie am Kartenrand
const TOR_GERADE = 28000, TOR_WEICH = 34000,   // (gerade ±TOR_GERADE längs der alten Linie – gerade gezogen bleibt davon gut ±20.000)
      TOR_ABSTAND = 50000;
const paesse = [];
function passSetzen(a, b, stufe) {
  const gs = paare.get(Math.min(a, b) + ',' + Math.max(a, b)); if (!gs) return false;
  let best = null; const lang = Math.max(...gs.map(g => laengen(g.punkte).pop()));
  for (const g of gs) {
    const s = laengen(g.punkte), len = s[s.length - 1], rand = TOR_GERADE + 12000;   // (kurze Grenzstücke im Ring: das Tor passt, der weiche Übergang wird kürzer)
    for (let d = rand; d <= len - rand; d += 3000) {
      const p = punktBei(g.punkte, s, d), p0 = punktBei(g.punkte, s, d - TOR_GERADE), p1 = punktBei(g.punkte, s, d + TOR_GERADE);
      const senk = Math.abs(p1[1] - p0[1]) > Math.abs(p1[0] - p0[0]);
      let abw = 0; for (let e = -TOR_GERADE - TOR_WEICH; e <= TOR_GERADE + TOR_WEICH; e += 3000) { const q = punktBei(g.punkte, s, d + e); abw += Math.abs(senk ? q[0] - p[0] : q[1] - p[1]); }
      if (paesse.some(o => Math.hypot(o.x - p[0], o.y - p[1]) < TOR_ABSTAND) || Math.max(Math.abs(p[0]), Math.abs(p[1])) > H - RAND_FREI) continue;
      const wert = Math.abs(d - len / 2) + (lang - len) * .5 + abw * .05;   // mittig im Grenzstück zwischen seinen zwei Knoten (das längste Stück des Paars), gerade Stellen nur knapp bevorzugt
      if (!best || wert < best.wert) best = { wert, g, d, x: p[0], y: p[1], senk };
    } }
  if (!best) return false;
  // Grenze am Pass gerade ziehen: ±TOR_GERADE genau waagrecht/senkrecht, weich zurück in den Schwung
  const g = best.g, s = laengen(g.punkte);
  g.punkte = g.punkte.map((q, i) => { const u = Math.abs(s[i] - best.d); if (u >= TOR_GERADE + TOR_WEICH || i === 0 || i === g.punkte.length - 1) return q;   // (die Knoten an den Enden bleiben: dort stoßen andere Grenzen an)
    const w = u <= TOR_GERADE ? 1 : 1 - (u - TOR_GERADE) / TOR_WEICH, k = w * w * (3 - 2 * w);
    return best.senk ? [q[0] + (best.x - q[0]) * k, q[1]] : [q[0], q[1] + (best.y - q[1]) * k]; });
  paesse.push({ id: paesse.length, a: g.a, b: g.b, grenze: g.id, x: Math.round(best.x), y: Math.round(best.y), senk: best.senk, stufe });
  return true;
}
const nachbarn = g => [...paare.keys()].map(k => k.split(',').map(Number)).filter(([a, b]) => a === g || b === g).map(([a, b]) => a === g ? b : a);
const laenge = (a, b) => (paare.get(Math.min(a, b) + ',' + Math.max(a, b)) || []).reduce((m, q) => m + q.punkte.length, 0);
for (let z = 1; z <= 4; z++) for (let k = 0; k < ANZAHL[z]; k++) passSetzen(START[z] + k, START[z] + (k + 1) % ANZAHL[z], z);   // im Ring: an jeder Grenze zum Nachbarn ein Pass
const herein = new Map();
for (let z = 1; z <= 4; z++) for (let k = 0; k < ANZAHL[z]; k++) {                                        // nach innen
  const g = START[z] + k, innen = nachbarn(g).filter(n => zoneVon(n) === z + 1);
  innen.sort((x, y) => (herein.get(x) || 0) - (herein.get(y) || 0) || laenge(g, y) - laenge(g, x));
  for (const n of innen) if (passSetzen(g, n, z + 1)) { herein.set(n, (herein.get(n) || 0) + 1); break; } }
for (let g = 1; g < START[1]; g++) if (!herein.get(g)) {                                                    // jedes innere Gebiet von außen erreichbar
  const z = zoneVon(g);
  for (const n of nachbarn(g).filter(n => zoneVon(n) === z - 1)) if (passSetzen(n, g, z)) { herein.set(g, 1); break; } }
const zahl = g => paesse.filter(p => p.a === g || p.b === g).length;
for (let g = 0; g < GEBIETE; g++) for (const n of nachbarn(g).sort((x, y) => Math.abs(zoneVon(x) - zoneVon(g)) - Math.abs(zoneVon(y) - zoneVon(g)) || zahl(x) - zahl(y))) {   // jedes Gebiet mindestens 2 Pässe
  if (zahl(g) >= 2) break;
  if (!paesse.some(p => (p.a === g && p.b === n) || (p.a === n && p.b === g))) passSetzen(g, n, Math.max(zoneVon(g), zoneVon(n))); }

// 5) Gebiete als Ringe aus ihren Grenzen
const rund = p => [Math.round(p[0]), Math.round(p[1])];
for (const g of grenzen) g.punkte = g.punkte.map(rund);
const gebiete = [], umrisse = [];                     // (umrisse: nur hier zum Nachschlagen, im Spiel baut 01b sie aus den Grenzen)
for (let id = 0; id < GEBIETE; id++) {
  const teile = grenzen.filter(g => g.a === id || g.b === id).map(g => ({ id: g.id, pts: g.punkte }));
  const ring = [], rand = [], gleich = (p, q) => Math.abs(p[0] - q[0]) < 2 && Math.abs(p[1] - q[1]) < 2;
  let t = teile.shift(); rand.push(t.id); ring.push(...t.pts);
  while (teile.length) {
    const ende = ring[ring.length - 1], k = teile.findIndex(x => gleich(x.pts[0], ende) || gleich(x.pts[x.pts.length - 1], ende));
    if (k < 0) throw new Error('Gebiet ' + id + ': Rand nicht geschlossen');
    const x = teile.splice(k, 1)[0], vor = gleich(x.pts[0], ende); rand.push(vor ? x.id : -x.id - 1);
    ring.push(...(vor ? x.pts : [...x.pts].reverse()).slice(1));
  }
  const z = zoneVon(id);
  gebiete.push({ id, zone: z, name: z === MITTE ? 'Mitte' : String(z), boden: ['', 'aussen', 'mitte', 'sand', 'mitte', 'innen'][z], rand });
  umrisse[id] = ring;
}

// 6) Tempel: in jedem Zone-4-Gebiet einer, an der Stelle am weitesten weg von allen Grenzen (Raster-Abstand), nicht nah an Pässen;
//    abwechselnd Tempel im Felskessel und Wächter-Tempel (beide mit Bild karte_tempel)
const abst = new Int16Array(N * N).fill(-1), schlange = [];
for (let p = 0; p < N * N; p++) { const i = p % N, j = (p - i) / N;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => an(i + a, j + b) !== L[p])) { abst[p] = 0; schlange.push(p); } }
for (let k = 0; k < schlange.length; k++) { const p = schlange[k], i = p % N, j = (p - i) / N;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b, q = y * N + x; if (an(x, y) === L[p] && abst[q] < 0) { abst[q] = abst[p] + 1; schlange.push(q); } } }
const tempel = [];
for (const g of gebiete.filter(g => g.zone === 4)) {
  let best = null;
  for (let p = 0; p < N * N; p++) if (L[p] === g.id) { const i = p % N, j = (p - i) / N, x = ((i + .5) / N * 2 - 1) * H, y = ((j + .5) / N * 2 - 1) * H;
    const wert = abst[p] * ZELLE - Math.max(0, 60000 - Math.min(...paesse.map(q => Math.hypot(q.x - x, q.y - y)))) * 2;
    if (!best || wert > best.wert) best = { wert, x, y }; }
  tempel.push({ gebiet: g.id, x: Math.round(best.x), y: Math.round(best.y), art: tempel.length % 2 ? 'waechtertempel' : 'tempel' });
}
// Kern jedes Gebiets (dort steht im Spiel sein Mittelpunkt): der Tempel, die Mitte (0, 0), sonst die Stelle am weitesten weg von den Grenzen
for (const g of gebiete) { const t = tempel.find(q => q.gebiet === g.id);
  if (t || g.zone === MITTE) { g.kern = t ? [t.x, t.y] : [0, 0]; continue; }
  let best = -1, bp = 0; for (let p = 0; p < N * N; p++) if (L[p] === g.id && abst[p] > best) { best = abst[p]; bp = p; }
  const i = bp % N, j = (bp - i) / N; g.kern = [Math.round(((i + .5) / N * 2 - 1) * H), Math.round(((j + .5) / N * 2 - 1) * H)]; }

// 7) Startplätze, Rohstoff-Felder, Barbaren-Lager: locker gestreut (Mindestabstände, keine Klumpen), nie auf Grenzen,
//    Pässen, Tempeln. Startplätze gleich viele je Zone-1-Gebiet; Felder überall außer der Mitte (Stufe steigt nach innen);
//    Barbaren Stufe 1–25 (Zone 1 schwach … Zone 4 stark, wie BARB_MAX_L im Spiel).
const streu = (() => { let x = 20251007; return () => (x = (x * 48271) % 2147483647) / 2147483647; })();
const grenzPunkte = new Map(), GZ = 20000;
for (const g of grenzen) if (g.b !== -1) for (const q of g.punkte) { const k = Math.floor(q[0] / GZ) + ',' + Math.floor(q[1] / GZ); (grenzPunkte.get(k) || grenzPunkte.set(k, []).get(k)).push(q); }
const grenzAbst = (x, y) => { let m = Infinity; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (const q of grenzPunkte.get((Math.floor(x / GZ) + i) + ',' + (Math.floor(y / GZ) + j)) || []) m = Math.min(m, Math.hypot(q[0] - x, q[1] - y)); return m; };
const imUmriss = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const gebietBei = (x, y) => umrisse.findIndex(P => imUmriss(x, y, P));   // (das geglättete Gebiet, nicht das Raster)
const alle = [];                                      // alles Gestreute: [x, y, Mindestabstand zu anderen]
const frei = (x, y, eigen, liste) => Math.max(Math.abs(x), Math.abs(y)) < H - 45000 && grenzAbst(x, y) > 26000
  && !paesse.some(p => Math.hypot(p.x - x, p.y - y) < 45000) && !tempel.some(t => Math.hypot(t.x - x, t.y - y) < 50000)
  && !alle.some(a => Math.hypot(a[0] - x, a[1] - y) < 24000) && !liste.some(o => Math.hypot(o.x - x, o.y - y) < eigen);
function streuen(anzahl, eigen, passt, neu) {         // Pfeilwurf: bis anzahl Stück, je Versuch ein Zufallspunkt
  const liste = [];
  for (let v = 0; v < anzahl * 400 && liste.length < anzahl; v++) {
    const x = (streu() * 2 - 1) * H, y = (streu() * 2 - 1) * H, g = gebietBei(x, y);
    if (!passt(g, liste) || !frei(x, y, eigen, liste)) continue;
    const o = Object.assign({ x: Math.round(x), y: Math.round(y), gebiet: g }, neu(zoneVon(g))); liste.push(o); alle.push([x, y]);
  }
  return liste;
}
const START_JE_GEBIET = 10;
const startplaetze = streuen(START_JE_GEBIET * ANZAHL[1], 60000, (g, l) => zoneVon(g) === 1 && l.filter(o => o.gebiet === g).length < START_JE_GEBIET, () => ({}));
const FELD_ARTEN = ['holz', 'holz', 'holz', 'stein', 'stein', 'stein', 'eisen', 'eisen', 'gold', 'gold', 'edelstein'];   // (die Feld-Arten des Spiels, FIELD_KINDS)
const felder = streuen(560, 52000, g => zoneVon(g) < MITTE, z => ({ art: FELD_ARTEN[Math.floor(streu() * FELD_ARTEN.length)], stufe: 2 * z - 1 + (streu() < .5 ? 0 : 1) }));
const barbaren = streuen(110, 70000, g => zoneVon(g) < MITTE, z => ({ stufe: Math.min(25, 1 + (z - 1) * 6 + Math.floor(streu() * (z === 4 ? 7 : 6))) }));

// Ausgabe: die Karte als Teil des Spiels (eine Quelle für Spiel und Kartentest), Barbaren-Lager nur für den Kartentest (im Spiel entstehen sie laufend)
const daten = { welt: { halb: H }, thron: { x: 0, y: 0, tag: 7 }, tempel, startplaetze, felder, zonen: 4, oeffnen: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, gebiete, grenzen, paesse };
const SPIEL = path.join(__dirname, '../../Game/spiel/01a2-karte-zonen.js');
fs.writeFileSync(SPIEL, '// Teil 01a2-karte-zonen.js: Weltkarte wie das RoK-Königreich – Daten (erzeugt von werkzeuge/kartentest/karte_erzeugen.js, nicht von Hand ändern)\n' +
  '// gebiete: { id, zone 1–4 (5 = Mitte), name, boden, kern: Mittelpunkt, rand: Grenzen-Ids (−id−1 = rückwärts) – der Umriss ist der Ring daraus }\n' +
  '// grenzen: { id, a, b (−1 = Kartenrand), punkte } · paesse: { id, a, b, grenze, x, y, senk (Grenze läuft senkrecht), stufe 1–5 }\n' +
  '// tempel: { gebiet, x, y, art tempel|waechtertempel } – je Zone-4-Gebiet einer · startplaetze: { x, y, gebiet } – je Zone-1-Gebiet gleich viele\n' +
  '// felder: { x, y, gebiet, art holz|stein|eisen|gold|edelstein, stufe } – Rohstoff-Felder, Stufe steigt nach innen\n' +
  '// oeffnen: Stufe → Tag, an dem die Pässe aufgehen (von außen nach innen); thron.tag: ab dann zählt der Thron\n' +
  'const KARTE_ZONEN = ' + JSON.stringify(daten) + ';\n');
fs.writeFileSync(path.join(__dirname, 'karte_dinge.js'), '// Kartentest: Barbaren-Lager (erzeugt von karte_erzeugen.js) – im Spiel entstehen sie laufend (09b), mit derselben Stufe je Zone\n' +
  'Object.assign(KARTE_ZONEN, ' + JSON.stringify({ barbaren }) + ');\n');
console.log('Gebiete', gebiete.length, '· Grenzen', grenzen.length, '(Rand', grenzen.filter(g => g.b === -1).length + ') · Pässe', paesse.length,
  [1, 2, 3, 4, 5].map(st => 'Stufe ' + st + ': ' + paesse.filter(p => p.stufe === st).length).join(', '),
  '· Start', startplaetze.length, 'Felder', felder.length, 'Barbaren', barbaren.length, '· ohne Pass:', gebiete.filter(g => !paesse.some(p => p.a === g.id || p.b === g.id)).map(g => g.id).join(' ') || '-');
