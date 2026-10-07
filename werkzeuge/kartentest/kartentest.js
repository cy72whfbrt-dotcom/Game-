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
  'kette_knoten', 'tor_zu', 'tor_offen', 'tor_senk_zu', 'tor_senk_offen', 'wald1', 'wald2'];
const KB = { img: {}, mip: {}, muster: {}, fertig: false };
let offen = DATEIEN.length;
for (const n of DATEIEN) { const im = new Image();
  im.onload = () => { KB.img[n] = im; if (!--offen) { KB.fertig = true; objekteBauen(); zeichnen(); } };
  im.onerror = () => { --offen; };
  im.src = (typeof KARTE_BILDER !== 'undefined' ? KARTE_BILDER[n] : KARTE_BILD_PFAD + 'karte_' + n + '.webp'); }
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
const GROSS = 1.8;                                    // die Gebiete sind viel größer als im Spiel: Gebirge, Knoten und Tore entsprechend breiter
const MASS = { boden: 7000, quer: 12500 * GROSS, hoch: 12500 * GROSS, knoten: 11000 * GROSS, tor: 12500 * GROSS, wald: [2600, 3400], abstand: .42 };
const TOR_SENK = { hoch: 18000 * GROSS, achse: .539, weg: .488 };
const KETTE_REIHEN = [[-1500, .5, .85], [0, 0, 1], [1300, .25, .8]].map(([a, v, g]) => [a * GROSS, v, g]);   // je Reihe: Abstand quer zur Grenze, Versatz (Stück), Größe
const ACHSE = { kette_quer1: .63, kette_quer2: .616, kette_hoch1: .512, kette_hoch2: .485, tor_zu: .553, tor_offen: .553, kette_knoten: .6 };
const SCHER = .4;                                     // Stücke folgen schrägen Grenzen nur bis zu dieser Scherung (stärker wirkt der Fels zerrissen)
const ZOOM = { nah: 0.05, mittel: 0.012, weit: 0.004, max: 0.16 };
const BILD_ZOOM = 0.0025;                             // darunter: Übersicht (ein Bild der ganzen Karte)
const BODEN_FARBE = { aussen: [114, 140, 44], mitte: [140, 142, 60], innen: [186, 138, 80] };
const ZONEN_FARBE = { 1: [[70, 140, 40], [40, 96, 30]], 2: [[46, 104, 140], [32, 78, 112]], 3: [[118, 62, 140], [118, 62, 140]] };
const PASS_FARBE = { gruen: '#5fc23a', blau: '#3a9ad8', lila: '#b05ad0' };
const skala = z => 1 + .5 * Math.max(0, Math.min(1, (0.03 - z) / 0.018));   // mittlerer Zoom: Ketten, Knoten, Tore bis 1,5×
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

// ===== Gelände-Objekte: Kettenstücke, Knoten, Tore, Wald – eine Liste nach Fuß-y, Raster zum Finden =====
let KO = null;
const ZELLE = 25000;
function objekteBauen() {
  const liste = [], rnd = zufall(90917);
  const neu = (n, x, y, w, ax, ay, sx, sy, fuss, f = 1, gross = !n.startsWith('wald'), extra) => { const im = KB.img[n], h = w * im.height / im.width;
    const xs = [], ys = []; for (const u of [-ax * w, (1 - ax) * w]) for (const v of [-ay * h, (1 - ay) * h]) { xs.push(x + f * u + sx * v); ys.push(y + v + sy * f * u); }
    liste.push(Object.assign({ n, x, y, w, h, ax, ay, sx, sy, f, fuss, gross, bb: { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) } }, extra)); };
  // Knoten: wo Grenzen zusammenstoßen
  const knoten = [];
  for (const g of innen) for (const q of [g.punkte[0], g.punkte[g.punkte.length - 1]]) if (!knoten.some(k => Math.hypot(k[0] - q[0], k[1] - q[1]) < 5000)) knoten.push(q);
  for (const [x, y] of knoten) neu('kette_knoten', x, y, MASS.knoten * (.92 + rnd() * .16), .5, ACHSE.kette_knoten, 0, 0, y, rnd() < .5 ? -1 : 1);
  // Tore: genau auf der Grenze (dort läuft sie gerade); waagrecht das Quer-Tor, senkrecht das Tor für Nord-Süd-Ketten
  for (const p of KD.paesse) {
    if (p.senk) { const im = KB.img.tor_senk_zu, hs = TOR_SENK.hoch, ws = hs * im.width / im.height;
      neu('tor_senk_zu', p.x, p.y, ws, TOR_SENK.achse, TOR_SENK.weg, 0, 0, p.y + hs * .3, 1, false, { tor: p }); }
    else neu('tor_zu', p.x, p.y, MASS.tor, .5, ACHSE.tor_zu, 0, 0, p.y + MASS.tor * .3, 1, true, { tor: p });   // (vor den Kettenstücken daneben: seine Felsen decken deren Enden)
  }
  // Ketten: Stücke entlang jeder Grenze, Lücke an Knoten und Toren
  for (const g of innen) {
    const pts = g.punkte, s = laengen(pts), len = s[s.length - 1], sperren = [[0, MASS.knoten * .2], [len, MASS.knoten * .2]];
    for (const p of KD.paesse) if (p.grenze === g.id) { let bd = 0, be = Infinity; pts.forEach((q, i) => { const e = Math.hypot(q[0] - p.x, q[1] - p.y); if (e < be) { be = e; bd = s[i]; } });
      sperren.push([bd, p.senk ? TOR_SENK.hoch * .3 : MASS.tor * .45]); }
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
  // Wald: lockere Gruppen auf freier Wiese (Zone 1 dicht, Zone 2 weniger, Mitte keiner), nicht an Ketten und Toren
  const nahe = new Map(), NZ = 10000;
  for (const g of innen) for (const q of g.punkte) { const k = Math.floor(q[0] / NZ) + ',' + Math.floor(q[1] / NZ); (nahe.get(k) || nahe.set(k, []).get(k)).push(q); }
  const randAbstand = (x, y) => { let m = Infinity; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of nahe.get((Math.floor(x / NZ) + i) + ',' + (Math.floor(y / NZ) + j)) || []) m = Math.min(m, Math.hypot(q[0] - x, q[1] - y)); return m; };
  const pruef = document.createElement('canvas').getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const x = (rnd() * 2 - 1) * (H - 6000), y = (rnd() * 2 - 1) * (H - 6000), g = KD.gebiete.find(q => pruef.isPointInPath(q.pfad, x, y));
    if (!g || g.zone === 3 || (g.zone === 2 && rnd() < .5)) continue;
    for (let k = 0, m = 1 + Math.floor(rnd() * 4); k < m; k++) {
      const wx = x + (rnd() - .5) * 9000, wy = y + (rnd() - .5) * 7000, w = MASS.wald[0] + rnd() * (MASS.wald[1] - MASS.wald[0]);
      if (randAbstand(wx, wy) < 9000 || KD.paesse.some(p => Math.hypot(p.x - wx, p.y - wy) < 24000) || Math.abs(wx) > H - 3000 || Math.abs(wy) > H - 3000) continue;
      neu(rnd() < .55 ? 'wald1' : 'wald2', wx, wy, w, .5, .78, 0, 0, wy, rnd() < .5 ? -1 : 1);
    } }
  liste.sort((a, b) => a.fuss - b.fuss);
  const zellen = new Map();
  liste.forEach((o, i) => { o.ord = i;
    for (let cx = Math.floor(o.bb.l / ZELLE); cx <= Math.floor(o.bb.r / ZELLE); cx++) for (let cy = Math.floor(o.bb.t / ZELLE); cy <= Math.floor(o.bb.b / ZELLE); cy++) {
      const k = cx + ',' + cy; (zellen.get(k) || zellen.set(k, []).get(k)).push(o); } });
  KO = { liste, zellen };
}

// ===== Übersicht: einmal die ganze Karte als Bild (Zonenfarben + Boden, Gebirgsbänder) =====
let UEB = null;
function uebersicht() {
  if (UEB) return UEB;
  const n = 3072, k = n / (2 * H), c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, H * k, H * k);
  for (const geb of KD.gebiete) { const b = BODEN_FARBE[geb.boden], z = geb.farbe, m = .62;
    g.fillStyle = `rgb(${b.map((v, i) => Math.round(v * (1 - m) + z[i] * m)).join(',')})`; g.fill(geb.pfad); }
  g.fillStyle = 'rgba(214,180,120,.55)'; g.beginPath(); g.arc(KD.thron.x, KD.thron.y, 40000, 0, Math.PI * 2); g.fill();
  baender(g, 1 / k);
  return (UEB = c);
}
function baender(g, px, unten) {                     // (Weltmaß gesetzt) Gebirge als dunkles Band mit Lichtkante; px = Welt pro Pixel; unten: unter den Bildern (schmal, ohne dunklen Rand)
  const w = Math.max(4200 * GROSS, 3 * px);
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (!unten) { g.strokeStyle = '#2e2b24'; g.lineWidth = w * 1.3; g.stroke(kettenPfad); }
  g.strokeStyle = unten ? '#8c8a64' : '#6b6552'; g.lineWidth = unten ? w * .6 : w; g.stroke(kettenPfad);
  g.strokeStyle = 'rgba(170,164,140,.6)'; g.lineWidth = w * .35; g.stroke(kettenPfad);
}

// ===== Boden je Zone (Kachel + gedrehte größere Lagen, wie 03a) =====
const BODEN_LAGEN = [[0, 1, 1], [37, 1.618, .42], [-61, 2.414, .3]];
function bodenMuster(art, z, lage) {
  const c = kbBild('boden_' + art, MASS.boden * z * dpr), key = art + c.width + ':' + lage, [dr, gr] = BODEN_LAGEN[lage];
  let p = KB.muster[key];
  if (!p) { p = KB.muster[key] = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().rotate(dr).scale(MASS.boden * gr / c.width)); }
  return p;
}
function bodenFuellen(g, art, z, v) {
  const n = art === 'innen' || art === 'sand' ? 3 : 2;
  for (let i = 0; i < n; i++) { g.globalAlpha = BODEN_LAGEN[i][2]; g.fillStyle = bodenMuster(art, z, i); g.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); }
  g.globalAlpha = 1;
}

// ===== Zeichnen =====
const weltSetzen = g => g.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (W / 2 - cam.x * cam.z), dpr * (HT / 2 - cam.y * cam.z));
const sx = x => (x - cam.x) * cam.z + W / 2, sy = y => (y - cam.y) * cam.z + HT / 2;
let lage = null;                                      // Hilfsfläche für den weichen Sand-Platz
function zeichnen() {
  const z = cam.z, v = { l: cam.x - W / 2 / z, r: cam.x + W / 2 / z, t: cam.y - HT / 2 / z, b: cam.y + HT / 2 / z };
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1c2416'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (z < BILD_ZOOM || !KB.fertig) {
    weltSetzen(ctx); ctx.imageSmoothingEnabled = true; ctx.drawImage(uebersicht(), -H, -H, 2 * H, 2 * H);
  } else {
    weltSetzen(ctx);
    for (const g of KD.gebiete) { if (g.bb.r < v.l || g.bb.l > v.r || g.bb.b < v.t || g.bb.t > v.b) continue;
      ctx.save(); ctx.clip(g.pfad); bodenFuellen(ctx, g.boden, z, v);
      const t = Math.max(0, Math.min(1, (0.0035 - z) / (0.0035 - BILD_ZOOM))) * .55;   // weiter draußen: Zonenfarbe kommt dazu (gleitet in die Übersicht)
      if (t > 0) { ctx.fillStyle = `rgba(${g.farbe.join(',')},${t})`; ctx.fillRect(v.l, v.t, v.r - v.l, v.b - v.t); }
      ctx.restore(); }
    sandPlatz(v);
    if (z < 0.006) baender(ctx, 1 / z, true);         // weit: unter den Bildern ein Band, damit die Kette geschlossen wirkt
    gelaende(v);
  }
  thron();
  if (z < BILD_ZOOM) passPunkte();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  document.getElementById('info').textContent = stufe() + ' · Zoom ' + z.toFixed(4) + ' · ' + KD.gebiete.length + ' Gebiete · ' + KD.paesse.length + ' Pässe';
}
function sandPlatz(v) {                               // Sand um den Thron, weich auslaufend
  const R = 52000, t = KD.thron; if (t.x + R < v.l || t.x - R > v.r || t.y + R < v.t || t.y - R > v.b) return;
  if (!lage || lage.width !== cv.width || lage.height !== cv.height) { lage = document.createElement('canvas'); lage.width = cv.width; lage.height = cv.height; }
  const L = lage.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, lage.width, lage.height);
  weltSetzen(L); bodenFuellen(L, 'sand', cam.z, { l: t.x - R, t: t.y - R, r: t.x + R, b: t.y + R });
  const gr = L.createRadialGradient(t.x, t.y, R * .45, t.x, t.y, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  L.globalCompositeOperation = 'destination-in'; L.fillStyle = gr; L.fillRect(t.x - R, t.y - R, 2 * R, 2 * R); L.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lage, 0, 0); weltSetzen(ctx);
}
function gelaende(v) {
  const k0 = dpr * cam.z, E = dpr * (W / 2 - cam.x * cam.z), F = dpr * (HT / 2 - cam.y * cam.z), sk = skala(cam.z), hier = new Set();
  const drin = o => { const s = o.gross ? sk : 1; return o.x + (o.bb.r - o.x) * s > v.l && o.x + (o.bb.l - o.x) * s < v.r && o.y + (o.bb.b - o.y) * s > v.t && o.y + (o.bb.t - o.y) * s < v.b; };
  for (let cx = Math.floor(v.l / ZELLE) - 1; cx <= Math.floor(v.r / ZELLE); cx++) for (let cy = Math.floor(v.t / ZELLE) - 1; cy <= Math.floor(v.b / ZELLE); cy++)
    for (const o of KO.zellen.get(cx + ',' + cy) || []) if (drin(o)) hier.add(o);
  for (const o of [...hier].sort((a, b) => a.ord - b.ord)) {
    const k = o.gross ? k0 * sk : k0, px = o.w * k; if (px < 2) continue;
    let n = o.n; if (o.tor) n = o.tor.senk ? (toreOffen ? 'tor_senk_offen' : 'tor_senk_zu') : (toreOffen ? 'tor_offen' : 'tor_zu');
    ctx.setTransform(k * o.f, k * o.sy * o.f, k * o.sx, k, k0 * o.x + E, k0 * o.y + F);
    if (o.tor && o.tor.senk && cam.z < 0.006) {       // weiter draußen nur die Kette mit Mauer, ohne die Weg-Stummel (wie 03b)
      const im = kbBild(n, px * .4), a = TOR_SENK.achse - .2;
      ctx.drawImage(im, a * im.width, 0, .4 * im.width, im.height, -.2 * o.w, -o.ay * o.h, .4 * o.w, o.h); continue; }
    ctx.drawImage(kbBild(n, px), -o.ax * o.w, -o.ay * o.h, o.w, o.h);
  }
  weltSetzen(ctx);
}
function thron() {                                    // Platzhalter, bis das KI-Bild des Throns da ist
  const t = KD.thron, x = sx(t.x), y = sy(t.y), r = Math.max(7, 9000 * cam.z);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#e7c35a'; ctx.fill(); ctx.lineWidth = Math.max(2, r * .15); ctx.strokeStyle = '#4a2f10'; ctx.stroke();
  ctx.font = `700 ${Math.round(Math.max(12, Math.min(28, r * .5)))}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,8,.85)'; ctx.strokeText('Thron', x, y + r + 4); ctx.fillStyle = '#fff2c8'; ctx.fillText('Thron', x, y + r + 4);
}
function passPunkte() {                               // Übersicht: Pässe als Punkte in Zonenfarbe (offen hell, zu mit rotem Rand)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = cam.z < BILD_ZOOM ? 6 : 5;
  for (const p of KD.paesse) { const x = sx(p.x), y = sy(p.y); if (x < -10 || y < -10 || x > W + 10 || y > HT + 10) continue;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = PASS_FARBE[p.art]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = toreOffen ? '#10140c' : '#d24c40'; ctx.stroke(); }
}

// ===== Kamera: Ziehen, Zoomen (Finger, Maus, Knöpfe) =====
const minZoom = () => Math.min(W, HT) / (2 * H * 1.05);
function begrenzen() {
  cam.z = Math.max(minZoom(), Math.min(ZOOM.max, cam.z));
  const mx = Math.max(0, H - W / 2 / cam.z), my = Math.max(0, H - HT / 2 / cam.z);
  cam.x = Math.max(-mx, Math.min(mx, cam.x)); cam.y = Math.max(-my, Math.min(my, cam.y));
}
let geplant = false;
function neu() { if (geplant) return; geplant = true; requestAnimationFrame(() => { geplant = false; zeichnen(); }); }
function zoomUm(px, py, z) { const wx = (px - W / 2) / cam.z + cam.x, wy = (py - HT / 2) / cam.z + cam.y;
  cam.z = z; begrenzen(); cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - HT / 2) / cam.z; begrenzen(); neu(); }
function stufe() { const z = cam.z; return z < BILD_ZOOM ? 'ganz weit' : z < 0.007 ? 'weit' : z < 0.025 ? 'mittel' : 'nah'; }
function zoomStufe(s, x, y) { if (x !== undefined) { cam.x = x; cam.y = y; } cam.z = s === 'ganz' ? minZoom() : ZOOM[s]; begrenzen(); neu();
  document.querySelectorAll('#leiste [data-zoom]').forEach(b => b.classList.toggle('an', b.dataset.zoom === s)); }
const finger = new Map(); let griff = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); finger.set(e.pointerId, { x: e.clientX, y: e.clientY }); griff = null; });
cv.addEventListener('pointermove', e => {
  if (!finger.has(e.pointerId)) return;
  const alt = [...finger.values()]; finger.set(e.pointerId, { x: e.clientX, y: e.clientY }); const jetzt = [...finger.values()];
  if (jetzt.length === 1) { cam.x -= (jetzt[0].x - alt[0].x) / cam.z; cam.y -= (jetzt[0].y - alt[0].y) / cam.z; begrenzen(); neu(); return; }
  const [a, b] = jetzt, d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  if (!griff) griff = { d, z: cam.z, wx: (mx - W / 2) / cam.z + cam.x, wy: (my - HT / 2) / cam.z + cam.y };
  cam.z = griff.z * d / Math.max(10, griff.d); begrenzen(); cam.x = griff.wx - (mx - W / 2) / cam.z; cam.y = griff.wy - (my - HT / 2) / cam.z; begrenzen(); neu();
});
const los = e => { finger.delete(e.pointerId); griff = null; };
cv.addEventListener('pointerup', los); cv.addEventListener('pointercancel', los);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomUm(e.clientX, e.clientY, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))); }, { passive: false });
document.querySelectorAll('#leiste [data-zoom]').forEach(b => b.addEventListener('click', () => zoomStufe(b.dataset.zoom)));
document.getElementById('tore').addEventListener('click', e => { toreOffen = !toreOffen; e.target.textContent = toreOffen ? 'Tore zu' : 'Tore auf'; neu(); });
function groesse() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; HT = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(HT * dpr); begrenzen(); neu(); }
addEventListener('resize', groesse);
groesse(); zoomStufe('ganz');
window.KT = { cam, zoomStufe, zeichnen, bereit: () => KB.fertig && !!KO, daten: KD };
