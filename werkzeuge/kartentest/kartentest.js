// Karten-Testdatei (LIESMICH 11c Punkt 30): nur die Weltkarte mit Zonen wie das RoK-Königreich, aus dem Datenmodell
// KARTE_ZONEN (karte_daten.js). Boden je Zone, Gebirgsketten an allen Grenzen, Pass-Tore genau in der Kette, Kamera
// (Ziehen, Zoomen mit Finger + Maus). Ganz weit: Übersicht (Zonenfarben, Gebirgsbänder, Pass-Punkte). Maße wie im Spiel (03a).
'use strict';
const KD = KARTE_ZONEN, H = KD.welt.halb;
const cv = document.getElementById('karte'), ctx = cv.getContext('2d');
let dpr = 1, W = 0, HT = 0;
const cam = { x: 0, y: 0, z: 0.001 };
let toreOffen = true;

// ===== Bilder (wie 03a: halbierte Fassungen, damit verkleinert nichts flimmert) =====
const DATEIEN = ['boden_aussen', 'boden_mitte', 'boden_innen', 'boden_sand', 'kette_quer1', 'kette_quer2', 'kette_hoch1', 'kette_hoch2',
  'kette_knoten', 'tor_zu', 'tor_offen', 'tor_senk_zu', 'tor_senk_offen', 'barbaren', 'feld_holz', 'feld_stein', 'feld_eisen', 'feld_gold', 'feld_edelstein', 'ruinen', 'tempel', 'waechtertempel', 'thron'];   // (thron: aus dem KI-Blatt ausgeschnitten, liegt hier im Ordner)
const KB = { img: {}, mip: {}, muster: {}, fertig: false };
let offen = DATEIEN.length;
for (const n of DATEIEN) { const im = new Image();
  im.onload = () => { KB.img[n] = im; if (!--offen) { KB.fertig = true; objekteBauen(); UEB = null; zeichnen(); } };
  im.onerror = () => { --offen; };
  im.src = typeof KARTE_BILDER !== 'undefined' ? KARTE_BILDER[n] : n === 'thron' ? 'karte_thron.webp' : KARTE_BILD_PFAD + 'karte_' + n + '.webp'; }
function kbBild(n, px) {
  const m = KB.mip[n] || (KB.mip[n] = [KB.img[n]]);
  let i = 0;
  while (i < 6 && m[i].width >= 2 * px && m[i].width > 8) {
    if (!m[i + 1]) { const c = document.createElement('canvas'); c.width = m[i].width >> 1; c.height = m[i].height >> 1;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(m[i], 0, 0, c.width, c.height); m[i + 1] = c; }
    i++; }
  return m[i];
}

// ===== Maße (Welt-Einheiten, Burg ≈ 1.000; wie 03a) =====
const GROSS = 2.0;                                    // die Gebiete sind viel größer als im Spiel: Gebirge, Knoten und Tore entsprechend breiter
const MASS = { boden: 7000, quer: 12500 * GROSS, hoch: 12500 * GROSS, knoten: 11000 * GROSS, tor: 12500 * GROSS, abstand: .42 };
const DINGE = { feld: 9000, barbaren: 10500, ruinen: 12000, start: 7000 };   // Weltbreite der gestreuten Dinge (Kette 25.000, Tempel 38.000)
const FELD_FARBE = { holz: '#c08a4c', stein: '#aab3bd', eisen: '#8fb6e0', gold: '#e8c547', edelstein: '#7fd0ff' };   // (wie FIELD_KINDS im Spiel)
const STUFE_ZOOM = 0.003;                             // ab hier stehen die Stufen-Zahlen an Feldern und Lagern
const TOR_SENK = { hoch: 18000 * GROSS, achse: .539, weg: .488 };
const KETTE_REIHEN = [[-1500, .5, .85], [0, 0, 1], [1300, .25, .8]].map(([a, v, g]) => [a * GROSS, v, g]);   // je Reihe: Abstand quer zur Grenze, Versatz (Stück), Größe
const ACHSE = { kette_quer1: .63, kette_quer2: .616, kette_hoch1: .512, kette_hoch2: .485, tor_zu: .553, tor_offen: .553, kette_knoten: .6 };
const SCHER = .4;                                     // Stücke folgen schrägen Grenzen nur bis zu dieser Scherung (stärker wirkt der Fels zerrissen)
const ZOOM = { nah: 0.05, mittel: 0.012, weit: 0.004, max: 0.16 };
const BILD_ZOOM = 0.0025;                             // darunter: Übersicht (ein Bild der ganzen Karte)
const MITTE = 5;                                      // Zone der Mitte (1 außen … 4 innen)
const ZONEN_FARBE = { 1: [[104, 150, 70], [80, 124, 58]], 2: [[64, 138, 116], [50, 116, 98]], 3: [[196, 164, 104], [176, 146, 92]],
  4: [[64, 106, 150], [52, 90, 132]], 5: [[150, 108, 56], [150, 108, 56]] };   // Tönung ganz weit: hell/dunkel abwechselnd, Mitte braun-gold
const ZONEN_TOENUNG = { 1: .35, 2: .45, 3: .3, 4: .55, 5: .25 };   // so stark liegt die Zonenfarbe ganz weit über dem Boden
// Boden je Zone über der Grundkachel (data.boden): [weitere Kachel, Deckkraft, Farbschicht] – Nachbar-Ringe sehen deutlich anders aus
const BODEN_DAZU = { 3: [null, 0, 'rgba(110,88,58,.24)'], 4: ['innen', .35, 'rgba(34,44,22,.30)'] };   // 3 gedämpfte Wüste · 4 karg-oliv (Mitte: braune Erde)
const WEG = { lang: 13000, breit: 2400 };              // Weg durchs Quer-Tor: so weit in beide Gebiete, so breit
const TEMPEL = { breit: 38000, ax: .5, ay: .6, minPx: 30 };   // Tempel in Zone 4 (halb so breit wie der Thron; ganz weit nie kleiner als minPx)
const THRON = { breit: 80000, ax: .5, ay: .56, minPx: 64 };   // Thron-Tempel in der Mitte (Welt-Breite; ganz weit nie kleiner als minPx)
const PASS_FARBE = { 1: '#5cbf62', 2: '#3fc2a4', 3: '#e2c069', 4: '#4f9ef2', 5: '#e8a640' };   // je Stufe (Zone, in die der Pass führt)
function zufall(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ===== Wege der Gebiete und Grenzen =====
for (const g of KD.gebiete) { const p = new Path2D(); g.umriss.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); g.pfad = p;
  const xs = g.umriss.map(q => q[0]), ys = g.umriss.map(q => q[1]); g.bb = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
  g.farbe = ZONEN_FARBE[g.zone][g.id % 2]; }
const innen = KD.grenzen.filter(g => g.b !== -1);
const kettenPfad = new Path2D();
for (const g of innen) g.punkte.forEach((q, i) => i ? kettenPfad.lineTo(q[0], q[1]) : kettenPfad.moveTo(q[0], q[1]));
function laengen(pts) { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; }
function punktBei(pts, s, d) { d = Math.max(0, Math.min(s[s.length - 1], d)); let i = 1; while (i < pts.length - 1 && s[i] < d) i++;
  const t = (d - s[i - 1]) / ((s[i] - s[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }

// ===== Gelände-Objekte: Kettenstücke, Knoten, Tore, Felder, Lager, Ruinen – eine Liste nach Fuß-y, Raster zum Finden =====
let KO = null;
const ZELLE = 25000;
function objekteBauen() {
  const liste = [], rnd = zufall(90917);
  const neu = (n, x, y, w, ax, ay, sx, sy, fuss, f = 1, gross = true, extra) => { const im = KB.img[n], h = w * im.height / im.width;
    const xs = [], ys = []; for (const u of [-ax * w, (1 - ax) * w]) for (const v of [-ay * h, (1 - ay) * h]) { xs.push(x + f * u + sx * v); ys.push(y + v + sy * f * u); }
    liste.push(Object.assign({ n, x, y, w, h, ax, ay, sx, sy, f, fuss, gross, bb: { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) } }, extra)); };
  // Knoten: wo Grenzen zusammenstoßen
  const knoten = [];
  for (const g of innen) for (const q of [g.punkte[0], g.punkte[g.punkte.length - 1]]) if (!knoten.some(k => Math.hypot(k[0] - q[0], k[1] - q[1]) < 5000)) knoten.push(q);
  for (const [x, y] of knoten) neu('kette_knoten', x, y, MASS.knoten * (.92 + rnd() * .16), .5, ACHSE.kette_knoten, 0, 0, y, rnd() < .5 ? -1 : 1);
  // Tore: genau auf der Grenze (dort läuft sie gerade); waagrecht das Quer-Tor, senkrecht das Tor für Nord-Süd-Ketten
  for (const p of KD.paesse) {
    if (p.senk) { const im = KB.img.tor_senk_zu, hs = TOR_SENK.hoch, ws = hs * im.width / im.height;
      neu('tor_senk_zu', p.x, p.y, ws, TOR_SENK.achse, TOR_SENK.weg, 0, 0, p.y + hs * .45, 1, true, { tor: p }); }
    else neu('tor_zu', p.x, p.y, MASS.tor, .5, ACHSE.tor_zu, 0, 0, p.y + MASS.tor * .3, 1, true, { tor: p });   // (vor den Kettenstücken daneben: seine Felsen decken deren Enden)
  }
  // Ketten: Stücke entlang jeder Grenze, Lücke an Knoten und Toren
  for (const g of innen) {
    const pts = g.punkte, s = laengen(pts), len = s[s.length - 1], sperren = [[0, MASS.knoten * .2], [len, MASS.knoten * .2]];
    for (const p of KD.paesse) if (p.grenze === g.id) { let bd = 0, be = Infinity; pts.forEach((q, i) => { const e = Math.hypot(q[0] - p.x, q[1] - p.y); if (e < be) { be = e; bd = s[i]; } });
      sperren.push([bd, p.senk ? TOR_SENK.hoch * .42 : MASS.tor * .45]); }
    sperren.sort((a, b) => a[0] - b[0]);
    const schritt = MASS.quer * MASS.abstand;
    for (let i = 0; i + 1 < sperren.length; i++) {
      const a = sperren[i][0] + sperren[i][1], b = sperren[i + 1][0] - sperren[i + 1][1]; if (b <= a) continue;
      const anz = Math.max(1, Math.round((b - a) / schritt));
      for (const [ab, ph, gs] of KETTE_REIHEN) for (let k = 0; k < anz - (ph ? 1 : 0); k++) {
        const d = a + (k + .5 + ph) * (b - a) / anz, gr = MASS.quer * gs * (.92 + rnd() * .16);
        const p = punktBei(pts, s, d), p0 = punktBei(pts, s, d - gr / 2), p1 = punktBei(pts, s, d + gr / 2), tx = p1[0] - p0[0], ty = p1[1] - p0[1];
        const senk = Math.abs(ty) > Math.abs(tx), n = (senk ? 'kette_hoch' : 'kette_quer') + (rnd() < .5 ? 1 : 2), f = rnd() < .5 ? -1 : 1;
        let nx = -ty, ny = tx; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; if (senk ? nx < 0 : ny < 0) { nx = -nx; ny = -ny; }
        const x = p[0] + nx * ab, y = p[1] + ny * ab, im = KB.img[n];
        if (senk) neu(n, x, y, gr * im.width / im.height, ACHSE[n], .5, Math.max(-SCHER, Math.min(SCHER, tx / ty)), 0, y + gr * .3, f);
        else neu(n, x, y, gr, .5, ACHSE[n], 0, Math.max(-SCHER, Math.min(SCHER, ty / tx)), y, f);
      } }
  }
  // Gestreutes aus den Daten (gross = false: kein Gebirge, kommt nicht ins Übersichtsbild)
  for (const o of KD.felder) neu('feld_' + o.art, o.x, o.y, DINGE.feld, .5, .62, 0, 0, o.y, 1, false, { stufe: o.stufe });
  for (const o of KD.barbaren) neu('barbaren', o.x, o.y, DINGE.barbaren, .5, .62, 0, 0, o.y, 1, false, { stufe: o.stufe, barb: true });
  for (const o of KD.ruinen) neu('ruinen', o.x, o.y, DINGE.ruinen, .5, .62, 0, 0, o.y, rnd() < .5 ? -1 : 1, false);
  liste.sort((a, b) => a.fuss - b.fuss);
  const zellen = new Map();
  liste.forEach((o, i) => { o.ord = i;
    for (let cx = Math.floor(o.bb.l / ZELLE); cx <= Math.floor(o.bb.r / ZELLE); cx++) for (let cy = Math.floor(o.bb.t / ZELLE); cy <= Math.floor(o.bb.b / ZELLE); cy++) {
      const k = cx + ',' + cy; (zellen.get(k) || zellen.set(k, []).get(k)).push(o); } });
  KO = { liste, zellen };
}

// ===== Übersicht: einmal die ganze Karte als Bild (Boden je Zone, weich in Zonenfarbe getönt, Gebirge aus den Bildern) =====
let UEB = null;
function uebersicht() {
  if (UEB) return UEB;
  const n = Math.min(innerWidth, innerHeight) < 600 ? 2048 : 3072, k = n / (2 * H),   // (Handy: kleiner, iOS hat wenig Speicher für Zeichenflächen)
    c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), v = { l: -H, t: -H, r: H, b: H }; g.setTransform(k, 0, 0, k, H * k, H * k);
  for (const geb of KD.gebiete) {
    if (!KB.fertig) { g.fillStyle = `rgb(${geb.farbe.join(',')})`; g.fill(geb.pfad); continue; }
    g.save(); g.clip(geb.pfad); gebietBoden(g, geb, k / dpr, v); g.fillStyle = `rgba(${geb.farbe.join(',')},${ZONEN_TOENUNG[geb.zone]})`; g.fillRect(-H, -H, 2 * H, 2 * H); g.restore(); }
  if (KB.fertig) { g.lineJoin = 'round'; g.strokeStyle = 'rgba(58,52,40,.8)'; g.lineWidth = 6000 * GROSS; g.stroke(kettenPfad); gelaende(g, k, H * k, H * k, 2.4, v, true); }
  else baender(g, 1 / k);
  g.setTransform(k, 0, 0, k, H * k, H * k); g.strokeStyle = 'rgba(232,190,110,.8)'; g.lineWidth = 2 / k; g.stroke(KD.gebiete[0].pfad);
  return (UEB = c);
}
function baender(g, px) {                             // (Weltmaß gesetzt) Gebirge als dunkles Band mit Lichtkante, solange die Bilder fehlen; px = Welt pro Pixel
  const w = Math.max(4200 * GROSS, 3 * px);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#2e2b24'; g.lineWidth = w * 1.3; g.stroke(kettenPfad);
  g.strokeStyle = '#6b6552'; g.lineWidth = w; g.stroke(kettenPfad);
  g.strokeStyle = 'rgba(170,164,140,.6)'; g.lineWidth = w * .35; g.stroke(kettenPfad);
}

// ===== Boden je Zone (Kachel + gedrehte größere Lagen, wie 03a) =====
const BODEN_LAGEN = [[0, 1, 1], [37, 1.618, .42], [-61, 2.414, .3]];
const BODEN_GROESSE = { sand: 2.2 };                 // Sand mit Steinplatten größer gekachelt (sonst weit nur eine flache Fläche)
function bodenMuster(art, z, lage) {
  const b = MASS.boden * (BODEN_GROESSE[art] || 1), c = kbBild('boden_' + art, b * z * dpr), key = art + c.width + ':' + lage, [dr, gr] = BODEN_LAGEN[lage];
  let p = KB.muster[key];
  if (!p) { p = KB.muster[key] = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().rotate(dr).scale(b * gr / c.width)); }
  return p;
}
function gebietBoden(g, geb, z, v) {                 // (Weltmaß, auf das Gebiet geschnitten) Boden der Zone
  bodenFuellen(g, geb.boden, z, v);
  const d = BODEN_DAZU[geb.zone]; if (!d) return;
  g.save(); if (d[0]) { g.globalAlpha = d[1]; g.fillStyle = bodenMuster(d[0], z, 1); g.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); }
  g.globalAlpha = 1; g.fillStyle = d[2]; g.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); g.restore();
}
function bodenFuellen(g, art, z, v) {
  const n = art === 'innen' || art === 'sand' ? 3 : 2;
  for (let i = 0; i < n; i++) { g.globalAlpha = BODEN_LAGEN[i][2]; g.fillStyle = bodenMuster(art, z, i); g.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); }
  g.globalAlpha = 1;
}

// ===== Zeichnen =====
const weltSetzen = g => g.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (W / 2 - cam.x * cam.z), dpr * (HT / 2 - cam.y * cam.z));
const sx = x => (x - cam.x) * cam.z + W / 2, sy = y => (y - cam.y) * cam.z + HT / 2;
function zeichnen() {
  const z = cam.z, v = { l: cam.x - W / 2 / z, r: cam.x + W / 2 / z, t: cam.y - HT / 2 / z, b: cam.y + HT / 2 / z };
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1c2416'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (z < BILD_ZOOM || !KB.fertig) {
    weltSetzen(ctx); ctx.imageSmoothingEnabled = true; ctx.drawImage(uebersicht(), -H, -H, 2 * H, 2 * H);
  } else {
    weltSetzen(ctx); ctx.save(); ctx.beginPath(); ctx.rect(-H, -H, 2 * H, 2 * H); ctx.clip();
    for (const g of KD.gebiete) { if (g.bb.r < v.l || g.bb.l > v.r || g.bb.b < v.t || g.bb.t > v.b) continue;
      ctx.save(); ctx.clip(g.pfad); gebietBoden(ctx, g, z, v);
      const t = Math.max(0, Math.min(1, (0.0035 - z) / (0.0035 - BILD_ZOOM))) * .55;   // weiter draußen: Zonenfarbe kommt dazu (gleitet in die Übersicht)
      if (t > 0) { ctx.fillStyle = `rgba(${g.farbe.join(',')},${t})`; ctx.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); }
      ctx.restore();
      ctx.lineWidth = 5000; ctx.strokeStyle = bodenMuster(g.boden, z, 0); ctx.stroke(g.pfad); }   // Boden ein Stück unter die Kette ziehen: keine Naht zwischen den Gebieten
    wege(v); ctx.restore();
    const da = gelaende(ctx, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (HT / 2 - cam.y * z), 1, v);   // fest in der Welt: bei jedem Zoom dieselben Stücke in derselben Weltgröße
    startMarken(v);
    if (z >= STUFE_ZOOM) stufenZahlen(da);
  }
  for (const t of KD.tempel) heiligtum(t.art, t, TEMPEL);
  heiligtum('thron', KD.thron, THRON);
  if (z < BILD_ZOOM) { dingePunkte(); namen(); passPunkte(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  document.getElementById('info').classList.toggle('kurz', z >= BILD_ZOOM);   // die Legende nur ganz weit (nah bleibt die Karte frei)
  document.getElementById('stufe').textContent = stufe() + ' · Zoom ' + z.toFixed(4) + ' · ' + KD.gebiete.length + ' Gebiete · ' + KD.paesse.length + ' Pässe';
}
function wege(v) {                                    // Weg durchs Quer-Tor: quer zur Grenze in beide Gebiete (das Tor für Nord-Süd-Ketten hat ihn im Bild)
  for (const p of KD.paesse) { if (p.senk) continue;
    const dy = WEG.lang; if (p.x < v.l || p.x > v.r || p.y + dy < v.t || p.y - dy > v.b) continue;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - dy); ctx.lineTo(p.x, p.y + dy); ctx.lineCap = 'round'; ctx.strokeStyle = bodenMuster('innen', cam.z, 0);
    ctx.globalAlpha = .85; ctx.lineWidth = WEG.breit; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.lineCap = 'butt';
}
function gelaende(g, k0, E, F, sk, v, nurGebirge) {  // Gelände-Bilder im Weltrechteck v: Gerät = k0 · Welt + (E, F); sk: Vergrößerung der Ketten/Tore → die gezeichneten
  const hier = new Set();
  const drin = o => { const s = o.gross ? sk : 1; return o.x + (o.bb.r - o.x) * s > v.l && o.x + (o.bb.l - o.x) * s < v.r && o.y + (o.bb.b - o.y) * s > v.t && o.y + (o.bb.t - o.y) * s < v.b; };
  for (let cx = Math.floor(v.l / ZELLE) - 1; cx <= Math.floor(v.r / ZELLE); cx++) for (let cy = Math.floor(v.t / ZELLE) - 1; cy <= Math.floor(v.b / ZELLE); cy++)
    for (const o of KO.zellen.get(cx + ',' + cy) || []) if ((o.gross || !nurGebirge) && drin(o)) hier.add(o);
  const reihe = [...hier].sort((a, b) => a.ord - b.ord);
  for (const o of reihe) {
    const k = o.gross ? k0 * sk : k0, px = o.w * k; if (px < 2) continue;
    let n = o.n; if (o.tor) n = o.tor.senk ? (toreOffen ? 'tor_senk_offen' : 'tor_senk_zu') : (toreOffen ? 'tor_offen' : 'tor_zu');
    g.setTransform(k * o.f, k * o.sy * o.f, k * o.sx, k, k0 * o.x + E, k0 * o.y + F);
    g.drawImage(kbBild(n, px), -o.ax * o.w, -o.ay * o.h, o.w, o.h);
  }
  return reihe;
}
function stufenZahlen(reihe) {                        // Stufe als kleine Zahl oben rechts an Feldern und Barbaren-Lagern
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const o of reihe) { if (!o.stufe) continue;
    const x = sx(o.x) + o.w * cam.z * .32, y = sy(o.y) - o.h * cam.z * .5, t = String(o.stufe), b = Math.max(16, ctx.measureText(t).width + 8);
    ctx.fillStyle = o.barb ? 'rgba(120,24,18,.92)' : 'rgba(16,14,10,.85)'; ctx.beginPath(); ctx.roundRect(x - b / 2, y - 8, b, 16, 8); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = o.barb ? '#f0a080' : '#d9b46a'; ctx.stroke(); ctx.fillStyle = '#fff3d6'; ctx.fillText(t, x, y + .5); }
}
function burg(x, y, w) {                              // (Bildschirm) kleine Burg-Markierung eines Startplatzes: Mauer mit drei Türmen und Fahne, Fuß bei (x, y)
  const h = w * .7, u = w / 10;
  ctx.beginPath(); ctx.moveTo(x - 5 * u, y); ctx.lineTo(x - 5 * u, y - h * .55); ctx.lineTo(x - 3 * u, y - h * .55); ctx.lineTo(x - 3 * u, y - h * .4);
  ctx.lineTo(x - 1.5 * u, y - h * .4); ctx.lineTo(x - 1.5 * u, y - h); ctx.lineTo(x + 1.5 * u, y - h); ctx.lineTo(x + 1.5 * u, y - h * .4);
  ctx.lineTo(x + 3 * u, y - h * .4); ctx.lineTo(x + 3 * u, y - h * .55); ctx.lineTo(x + 5 * u, y - h * .55); ctx.lineTo(x + 5 * u, y); ctx.closePath();
  ctx.fillStyle = '#d8cdb4'; ctx.fill(); ctx.lineWidth = Math.max(1, u * .5); ctx.strokeStyle = '#3a3226'; ctx.stroke();
  ctx.fillStyle = '#4f9ef2'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h * 1.45); ctx.lineTo(x + 3 * u, y - h * 1.3); ctx.lineTo(x, y - h * 1.15); ctx.fill();
  ctx.strokeStyle = '#3a3226'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h * 1.45); ctx.stroke();
}
function startMarken(v) {                             // Startplätze (wo neue Spieler landen)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const w = Math.max(DINGE.start * cam.z, 12);
  for (const o of KD.startplaetze) if (o.x > v.l - DINGE.start && o.x < v.r + DINGE.start && o.y > v.t - DINGE.start && o.y < v.b + DINGE.start) burg(sx(o.x), sy(o.y), w);
}
function dingePunkte() {                              // ganz weit: Felder, Lager und Startplätze nur als kleine Punkte
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const punkt = (o, farbe, r) => { const x = sx(o.x), y = sy(o.y); if (x < -4 || y < -4 || x > W + 4 || y > HT + 4) return; ctx.fillStyle = farbe; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); };
  for (const o of KD.felder) punkt(o, FELD_FARBE[o.art], 1.2);
  for (const o of KD.barbaren) punkt(o, '#d2402e', 1.5);
  for (const o of KD.startplaetze) punkt(o, '#4f9ef2', 1.8);
}
function heiligtum(n, t, M) {                         // Thron/Tempel (KI-Bild) an seinem Weltpunkt; ganz weit nie kleiner als M.minPx
  const im = KB.img[n]; if (!im) return;
  const w = Math.max(M.breit * cam.z, M.minPx), h = w * im.height / im.width, x = sx(t.x), y = sy(t.y);
  if (x + w < 0 || x - w > W || y + h < 0 || y - h > HT) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(kbBild(n, w * dpr), x - w * M.ax, y - h * M.ay, w, h);
}
function passPunkte() {                               // Übersicht: Pässe als Punkte in Zonenfarbe (zu: blass)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = W < 600 ? 7 : 6;
  for (const p of KD.paesse) { const x = sx(p.x), y = sy(p.y); if (x < -10 || y < -10 || x > W + 10 || y > HT + 10) continue;
    ctx.globalAlpha = toreOffen ? 1 : .45; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = PASS_FARBE[p.stufe]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0c0f14'; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function namen() {                                    // Übersicht: Namen der Gebiete
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${W < 600 ? 11 : 15}px Georgia, serif`; ctx.lineJoin = 'round';
  for (const g of KD.gebiete) { if (g.zone === MITTE) continue; const t = KD.tempel.find(q => q.gebiet === g.id);   // (mit Tempel: der Name unter dem Tempel)
    const x = t ? sx(t.x) : sx(g.mitte[0]), y = t ? sy(t.y) + Math.max(TEMPEL.breit * cam.z, TEMPEL.minPx) * .55 : sy(g.mitte[1]);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,16,.8)'; ctx.strokeText(g.name, x, y); ctx.fillStyle = '#e4c886'; ctx.fillText(g.name, x, y); }
}

// ===== Kamera: Ziehen, Zoomen (Finger, Maus, Knöpfe) =====
const minZoom = () => Math.min(W, HT - 160) / (2 * H * 1.05);   // ganz weit: oben und unten Platz für Legende und Knöpfe
function begrenzen() {
  cam.z = Math.max(minZoom(), Math.min(ZOOM.max, cam.z));
  cam.x = Math.max(-H, Math.min(H, cam.x)); cam.y = Math.max(-H, Math.min(H, cam.y));   // bei jedem Zoom bis in jede Ecke: der Kartenrand kommt höchstens bis zur Bildschirmmitte
}
let geplant = false;
function neu() { if (geplant) return; geplant = true; requestAnimationFrame(() => { geplant = false; zeichnen(); }); }
function zoomUm(px, py, z) { const wx = (px - W / 2) / cam.z + cam.x, wy = (py - HT / 2) / cam.z + cam.y;
  cam.z = z; begrenzen(); cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - HT / 2) / cam.z; begrenzen(); neu(); }
function stufe() { const z = cam.z; return z < BILD_ZOOM ? 'ganz weit' : z < 0.007 ? 'weit' : z < 0.025 ? 'mittel' : 'nah'; }
function zoomStufe(s, x, y) { if (x !== undefined) { cam.x = x; cam.y = y; } else if (s === 'ganz') cam.x = cam.y = 0;   // (ganz weit: die ganze Karte in der Mitte)
  cam.z = s === 'ganz' ? minZoom() : ZOOM[s]; begrenzen(); neu();
  document.querySelectorAll('#leiste [data-zoom]').forEach(b => b.classList.toggle('an', b.dataset.zoom === s)); }
const finger = new Map(); let griff = null;
const zweiGriff = () => { const [a, b] = [...finger.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;   // Zwei Finger: der Weltpunkt zwischen ihnen bleibt unter ihnen
  return { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z, wx: (mx - W / 2) / cam.z + cam.x, wy: (my - HT / 2) / cam.z + cam.y }; };
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); finger.set(e.pointerId, { x: e.clientX, y: e.clientY }); griff = finger.size === 2 ? zweiGriff() : null; });
cv.addEventListener('pointermove', e => {
  if (!finger.has(e.pointerId)) return;
  const alt = [...finger.values()]; finger.set(e.pointerId, { x: e.clientX, y: e.clientY }); const jetzt = [...finger.values()];
  if (jetzt.length === 1) { cam.x -= (jetzt[0].x - alt[0].x) / cam.z; cam.y -= (jetzt[0].y - alt[0].y) / cam.z; begrenzen(); neu(); return; }
  const [a, b] = jetzt, d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  if (!griff) griff = zweiGriff();
  cam.z = griff.z * d / Math.max(10, griff.d); begrenzen(); cam.x = griff.wx - (mx - W / 2) / cam.z; cam.y = griff.wy - (my - HT / 2) / cam.z; begrenzen(); neu();
});
const los = e => { finger.delete(e.pointerId); griff = null; };
cv.addEventListener('pointerup', los); cv.addEventListener('pointercancel', los);
// iPhone (auch im eingebetteten Fenster): Safari zoomt sonst bei zwei Fingern die ganze Seite statt der Karte (weiße Ränder, „Nah“ nie erreicht)
for (const t of ['touchstart', 'touchmove']) cv.addEventListener(t, e => e.preventDefault(), { passive: false });
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
cv.addEventListener('wheel', e => { e.preventDefault(); zoomUm(e.clientX, e.clientY, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))); }, { passive: false });
document.querySelectorAll('#leiste [data-zoom]').forEach(b => b.addEventListener('click', () => zoomStufe(b.dataset.zoom)));
document.getElementById('tore').addEventListener('click', e => { toreOffen = !toreOffen; UEB = null; e.target.textContent = toreOffen ? 'Tore zu' : 'Tore auf'; neu(); });
function groesse() { W = innerWidth; HT = innerHeight; dpr = Math.min(2, devicePixelRatio || 1, Math.sqrt(8e6 / Math.max(1, W * HT)));   // (Zeichenfläche höchstens 8 Mio. Pixel: iOS zeigt größere leer)
  cv.width = Math.round(W * dpr); cv.height = Math.round(HT * dpr); begrenzen(); neu(); }
addEventListener('resize', groesse);
groesse(); zoomStufe('ganz');
document.getElementById('legende').innerHTML = Object.entries(KD.oeffnen).map(([st, tag]) =>
  `<div><i style="background:${PASS_FARBE[st]}"></i>${+st === 1 ? 'Pass in Zone 1' : +st === MITTE ? 'Pass zur Mitte' : 'Pass nach Zone ' + st} · offen ab Tag ${tag}</div>`).join('')
  + `<div><i style="background:#9a6a2c"></i>Thron · ab Tag ${KD.thron.tag}</div>`
  + `<div><i style="background:#4f9ef2;border-radius:2px"></i>Startplatz (${KD.startplaetze.length}) · <i style="background:#d2402e;border-radius:2px"></i>Barbaren (${KD.barbaren.length})</div>`
  + `<div><i style="background:#c08a4c;border-radius:2px"></i>Felder: Holz, Stein, Eisen, Gold, Edelstein (${KD.felder.length})</div>`;
window.KT = { cam, zoomStufe, zeichnen, bereit: () => KB.fertig && !!KO, daten: KD, get objekte() { return KO; } };
