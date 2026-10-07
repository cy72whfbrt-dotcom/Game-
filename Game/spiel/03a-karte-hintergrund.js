// Teil 03a-karte-hintergrund.js: Karte zeichnen: Grundlagen, Boden nach Ringen, Gebirgsketten, Wald, Gebiete, Wege
// ===== MAP RENDERER (verified in the running game; see spec §5) =====
var viewW = innerWidth, viewH = innerHeight;           // CSS px; written ONLY by sizeBackingStore() (§6) so a resize still knows the old centre.
                                                      // `var` on purpose: sizeBackingStore() already runs at boot, before this block.
const setScreen = g => g.setTransform(dpr, 0, 0, dpr, 0, 0);
const toSX = x => x * mapState.zoom + mapState.offsetX, toSY = y => y * mapState.zoom + mapState.offsetY;

// World bounds (camera clamp)
const WORLD = (() => { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const lm of landmasses) { l = Math.min(l, lm.x - lm.shapeMaxR); r = Math.max(r, lm.x + lm.shapeMaxR); t = Math.min(t, lm.y - lm.shapeMaxR); b = Math.max(b, lm.y + lm.shapeMaxR); }
  l = Math.min(l, -FRAME_HALF); t = Math.min(t, -FRAME_HALF); r = Math.max(r, FRAME_HALF); b = Math.max(b, FRAME_HALF);   // the map border fits too
  return { l, t, r, b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2, radius: Math.hypot(r - l, b - t) / 2 }; })();

// Landmass paths: smoothed edge (quadratic curves through edge midpoints), world units – fürs Stadtbild (08e) und den Nebel
for (const lm of landmasses) {
  const P = lm.shape, n = P.length, p = new Path2D();
  const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
  let m = mid(P[n - 1], P[0]); p.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const c = P[i]; m = mid(P[i], P[(i + 1) % n]); p.quadraticCurveTo(c.x, c.y, m[0], m[1]); }
  p.closePath();
  lm.path = p;
  lm.bbox = { l: lm.x - lm.shapeMaxR, t: lm.y - lm.shapeMaxR, r: lm.x + lm.shapeMaxR, b: lm.y + lm.shapeMaxR };
  lm.stone = lm.tier === 'throne' || lm.tier === 'guardian';                    // the middle and the 4 Wächter regions (Berge aus 01f: grau, mehr Einzelfelsen)
  let forest = null;                                                             // Bäume fürs Stadtbild (08e), erst bei Bedarf gebaut
  Object.defineProperty(lm, 'forest', { get: () => forest || (forest = buildForest(lm)), configurable: true });
}

// ===== Weltkarte wie RoK (LIESMICH 11c Punkt 25): kein Wasser – Boden nach Ringen (außen grün → Mitte Sand), Gebirgsketten auf
// allen Gebietsgrenzen, Pass-Tore in den Lücken (03b), Gipfel-Knoten an den Ecken, Bergstöcke und Wälder – alles aus den
// KI-Bildern Game/bilder/karte_*.webp. Geladen erst beim ersten Zeichnen (der Weltrechner zeichnet nie: lädt nie ein Bild).
// Bis alle da sind (oder wenn eins fehlt) und weit draußen: Farbflächen, Gebirge als Bänder, die gezeichneten Berge aus 01f.
const KB_DATEIEN = ['boden_aussen', 'boden_mitte', 'boden_innen', 'boden_sand', 'kette_quer1', 'kette_quer2', 'kette_hoch1', 'kette_hoch2',
  'kette_knoten', 'tor_zu', 'tor_offen', 'turm', 'wald1', 'wald2'];   // (Bergstöcke: fels_1/2.webp, 01f; turm = Turm aus dem Tor-Bild)
const KB = { img: {}, mip: {}, muster: {}, offen: -1, fertig: false };
function karteBilder() {                             // true, sobald alle Bilder geladen sind (beim ersten Aufruf geht das Laden los)
  if (KB.offen < 0) { KB.offen = KB_DATEIEN.length;
    for (const n of KB_DATEIEN) { const im = new Image();
      const ende = ok => { if (ok) KB.img[n] = im; if (--KB.offen) return; KB.fertig = KB_DATEIEN.every(k => KB.img[k]); if (KB.fertig) { KB.img.weg = wegBild(); BG.valid = false; requestRender(); } };
      im.onload = () => ende(im.naturalWidth > 0); im.onerror = () => ende(false); im.src = 'bilder/karte_' + n + '.webp'; } }
  return KB.fertig;
}
function wegBild() {                                 // Erdweg durch eine Pass-Lücke: kurz, Ränder weich (als Bild, damit er wie die Felsen sortiert wird)
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(160,122,80,0)'); gr.addColorStop(.25, 'rgba(160,122,80,.9)'); gr.addColorStop(.75, 'rgba(160,122,80,.9)'); gr.addColorStop(1, 'rgba(160,122,80,0)');
  x.fillStyle = gr; x.filter = 'blur(3px)'; x.beginPath(); x.ellipse(128, 24, 124, 15, 0, 0, Math.PI * 2); x.fill();
  return c;
}
function karteSkala(z) { return 1 + .5 * Math.max(0, Math.min(1, (0.03 - z) / 0.018)); }   // mittlerer Zoom: Ketten, Knoten, Tore bis 1,5× (sonst wirken sie dünn), nah 1×
function kbVariante(n) {                             // „name~warm“: in den inneren Ringen warm getönt (kein grünes Moos auf Ocker)
  const im = KB.img[n.split('~')[0]], c = document.createElement('canvas'), x = c.getContext('2d');
  c.width = im.width; c.height = im.height; x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(214,170,104,.32)'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function kbBild(n, px) {                             // Bild n, so oft halbiert, wie es noch ≥ px breit bleibt (verkleinert flimmert es sonst)
  const m = KB.mip[n] || (KB.mip[n] = [n.includes('~') ? kbVariante(n) : KB.img[n]]);
  let i = 0;
  while (i < 6 && m[i].width >= 2 * px && m[i].width > 8) {
    if (!m[i + 1]) { const c = document.createElement('canvas'); c.width = m[i].width >> 1; c.height = m[i].height >> 1;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(m[i], 0, 0, c.width, c.height); m[i + 1] = c; }
    i++; }
  return m[i];
}
// Maße (Welt-Einheiten, Burg ≈ 1.000; Vorgabe Designer): Achse = wo im Bild die Gratlinie liegt (Bilder vorab gerade geschert)
const KARTE_MASS = { boden: 7000, quer: 12500, hoch: 12500, knoten: 11000, tor: 12500, wald: [2600, 3400], abstand: .42 };
const RAND_AUSSEN = 3200;                            // Kartenrand: die Kette steht nach außen versetzt (die Basen reichen dort bis nah an die Linie)
const KETTE_GERADE = { quer: 22000, hoch: 30000 };   // so weit vor/nach einem Tor läuft die Kette gerade (die Hälfte ganz gerade)
const TOR_SENK = { luecke: 3000, turmB: 1200, weg: 7000 };   // senkrechte Grenze: halbe Pass-Lücke (dort enden die Kettenstücke, darauf stehen die Türme), Turmbreite, Weglänge
const KETTE_REIHEN = { quer: [[-1500, .5, .85], [0, 0, 1], [1300, .25, .8]], hoch: [[-1300, 0, 1], [0, .5, .9], [1300, .25, .85]] };   // je Reihe: Abstand quer zur Grenze, Versatz (Stück), Größe – ein breiter Gebirgszug
const KETTE_ACHSE = { kette_quer1: .63, kette_quer2: .616, kette_hoch1: .512, kette_hoch2: .485, tor_zu: .553, tor_offen: .553, kette_knoten: .6 };
const KARTE_BILD_ZOOM = 0.0025, BODEN_BILD_ZOOM = 0.006;   // darunter (ganz draußen): nur Farbflächen + Bänder (schont das Handy) · Boden-Kacheln erst ab hier (weiter draußen wäre es ein Punkte-Raster)
const BODEN_ARTEN = ['aussen', 'mitte', 'innen', 'sand'], BODEN_BIS_RING = { mitte: 5, innen: 3, sand: 1 };
const BODEN_FARBE = { aussen: [114, 140, 44], mitte: [140, 142, 60], innen: [186, 138, 80], sand: [207, 176, 131] };   // weit draußen (Mittel der Bilder, etwas ruhiger)

// Boden-Masken: für jede innere Bodenart, wie stark sie an einer Stelle liegt (0…255, über die geschlängelten Grenzen,
// an der Grenze weich auf ±1.500 überblendet – die Kette deckt die Naht). Einmal gebaut, 640 × 640 über die ganze Karte.
let BM = null;
function bodenMasken() {
  if (BM) return BM;
  const n = 640, R = FRAME_HALF + 20000, k = n / (2 * R), ring = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ring[j * n + i] = ringAn(-R + (i + .5) / k, -R + (j + .5) / k);
  const weich = a => { const b = new Float32Array(n * n);                         // Kastenfilter ±1 px, zweimal, waagrecht und senkrecht
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let d = -1; d <= 1; d++) { const x = i + d; if (x >= 0 && x < n) { s += a[j * n + x]; c++; } } b[j * n + i] = s / c; }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let d = -1; d <= 1; d++) { const y = j + d; if (y >= 0 && y < n) { s += b[y * n + i]; c++; } } a[j * n + i] = s / c; } }
    return a; };
  BM = { n, R, k, w: {}, maske: {}, farbe: document.createElement('canvas') };
  const fc = BM.farbe; fc.width = fc.height = n; const fd = fc.getContext('2d').createImageData(n, n), F = BODEN_FARBE;
  for (let p = 0; p < n * n; p++) { fd.data[p * 4] = F.aussen[0]; fd.data[p * 4 + 1] = F.aussen[1]; fd.data[p * 4 + 2] = F.aussen[2]; fd.data[p * 4 + 3] = 255; }
  for (const art of ['mitte', 'innen', 'sand']) {
    const a = new Float32Array(n * n); for (let p = 0; p < n * n; p++) a[p] = ring[p] <= BODEN_BIS_RING[art] ? 1 : 0;
    weich(a);
    const w = BM.w[art] = new Uint8Array(n * n), c = BM.maske[art] = document.createElement('canvas'); c.width = c.height = n;
    const md = c.getContext('2d').createImageData(n, n);
    for (let p = 0; p < n * n; p++) { const v = w[p] = Math.round(a[p] * 255); md.data[p * 4 + 3] = v;
      for (let q = 0; q < 3; q++) fd.data[p * 4 + q] += (F[art][q] - fd.data[p * 4 + q]) * a[p]; }
    c.getContext('2d').putImageData(md, 0, 0);
  }
  fc.getContext('2d').putImageData(fd, 0, 0);
  return BM;
}
function bodenAnteil(art, l, t, r, b) {              // [kleinster, größter] Anteil der Bodenart im Weltrechteck (0…255)
  const M = bodenMasken(), w = M.w[art], cl = v => Math.max(0, Math.min(M.n - 1, v));
  const i0 = cl(Math.floor((l + M.R) * M.k) - 1), i1 = cl(Math.ceil((r + M.R) * M.k) + 1), j0 = cl(Math.floor((t + M.R) * M.k) - 1), j1 = cl(Math.ceil((b + M.R) * M.k) + 1);
  let lo = 255, hi = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const v = w[j * M.n + i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
}
function bodenMuster(art, z, dreh) {                 // Muster der Bodenkachel in passender Größe (Welt-verankert, setTransform im Weltmaß); dreh: gedreht + größer
  const c = kbBild('boden_' + art, KARTE_MASS.boden * z * dpr), key = art + c.width + (dreh ? 'd' : '');
  let p = KB.muster[key];
  if (!p) { p = KB.muster[key] = ctx.createPattern(c, 'repeat'); p.setTransform(dreh ? new DOMMatrix().rotate(37).scale(KARTE_MASS.boden * 1.618 / c.width) : new DOMMatrix().scale(KARTE_MASS.boden / c.width)); }
  return p;
}
function bodenFuellen(x, art, z, l, t, w, h) {      // Kachel + darüber dieselbe Kachel gedreht und größer, halb durchsichtig: kein sichtbares Raster, keine Naht
  x.fillStyle = bodenMuster(art, z); x.fillRect(l, t, w, h);
  x.globalAlpha = .42; x.fillStyle = bodenMuster(art, z, true); x.fillRect(l, t, w, h); x.globalAlpha = 1;
}
// Boden in den Ausschnitt (Weltrechteck cl, ct, W, H) einer Kachel T; bild = Kacheln aus den Bildern, sonst die Farbfläche
function paintBoden(g, T, cl, ct, W, H, clip, bild) {
  const M = bodenMasken(), z = T.z, setW = x => x.setTransform(dpr * z, 0, 0, dpr * z, -T.l * z * dpr, -T.t * z * dpr);
  setW(g);
  if (!bild) { g.imageSmoothingEnabled = true; g.drawImage(M.farbe, -M.R, -M.R, 2 * M.R, 2 * M.R); return; }
  const r = cl + W, b = ct + H, anteil = {};
  let start = 0;                                     // die oberste Bodenart, die den Ausschnitt ganz bedeckt: darunter muss nichts gemalt werden
  for (let i = 1; i < BODEN_ARTEN.length; i++) { const a = anteil[BODEN_ARTEN[i]] = bodenAnteil(BODEN_ARTEN[i], cl, ct, r, b); if (a[0] === 255) start = i; }
  bodenFuellen(g, BODEN_ARTEN[start], z, cl, ct, W, H);
  const x0 = clip ? clip.x : 0, y0 = clip ? clip.y : 0, w = clip ? clip.w : T.c.width, h = clip ? clip.h : T.c.height;
  for (let i = start + 1; i < BODEN_ARTEN.length; i++) {
    const art = BODEN_ARTEN[i]; if (anteil[art][1] === 0) continue;
    const L = layer.getContext('2d');                // die Bodenart auf die Hilfsfläche, mit ihrer Maske ausgestanzt, dann darüber
    L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(x0, y0, w, h);
    setW(L); bodenFuellen(L, art, z, cl, ct, W, H);
    L.globalCompositeOperation = 'destination-in'; L.imageSmoothingEnabled = true; L.drawImage(M.maske[art], -M.R, -M.R, 2 * M.R, 2 * M.R);
    L.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, x0, y0, w, h, x0, y0, w, h); setW(g);
  }
}

// ===== Gelände-Bilder: Ketten, Knoten, Wald (die Bergstöcke malt 01f) – EINE Liste, nach Fuß-y sortiert (vorne verdeckt hinten), Raster zum Finden =====
// Objekt: { n: Bild, x, y: Anker (Welt), w, h, ax, ay: Anker im Bild (0…1), sx/sy: Scherung (folgt dem Schwung der Grenze), fuss, bb }
let KO = null;
const KO_ZELLE = 20000;
function karteObjekte() {
  if (KO) return KO;
  const liste = [], S = HEX_SPACING, M = KARTE_MASS, ende = (GRID_HALF + .5) * S, rnd = mulberry32(90917);
  const neu = (n, x, y, w, ax, ay, sx, sy, fuss, f = 1, gross = !n.startsWith('wald')) => { const im = KB.img[n.split('~')[0]], h = w * im.height / im.width;   // f = -1: gespiegelt; gross: mittel größer (karteSkala)
    const xs = [], ys = []; for (const u of [-ax * w, (1 - ax) * w]) for (const v of [-ay * h, (1 - ay) * h]) { xs.push(x + f * u + sx * v); ys.push(y + v + sy * f * u); }
    liste.push({ n, x, y, w, h, ax, ay, sx, sy, f, fuss, gross, bb: { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) } }); };
  const warm = (n, x, y) => ringAn(x, y) <= BODEN_BIS_RING.innen ? n + '~warm' : n;
  const linien = []; for (let k = -GRID_HALF - 1; k <= GRID_HALF; k++) linien.push(k + .5);
  // Gipfel-Knoten, wo Ketten zusammenstoßen (auch am Rand: dort laufen die Ketten in den Knoten)
  const knoten = {};
  for (const lv of linien) for (const lh of linien) { let x = lv * S, y = lh * S;
    for (let it = 0; it < 4; it++) { x = grenzLinie(true, lv, y); y = grenzLinie(false, lh, x); }
    if (Math.abs(lv) > GRID_HALF) x += Math.sign(lv) * RAND_AUSSEN; if (Math.abs(lh) > GRID_HALF) y += Math.sign(lh) * RAND_AUSSEN;   // (Kartenrand: nach außen)
    knoten[lv + ',' + lh] = { x, y };
    neu(warm('kette_knoten', x, y), x, y, M.knoten * (.92 + rnd() * .16), .5, KETTE_ACHSE.kette_knoten, 0, 0, y, rnd() < .5 ? -1 : 1); }
  // Ketten: Stücke entlang jeder Grenze, Lücke an jedem Tor (Brückenmitte) und an den Knoten
  const tore = bridges.map(br => ({ x: (br.x1 + br.x2) / 2, y: (br.y1 + br.y2) / 2, senk: Math.abs(br.x2 - br.x1) > Math.abs(br.y2 - br.y1) }));
  const nahFelder = resFields.filter(q => { const S2 = HEX_SPACING / 2, dx = Math.abs(((q.x % S) + S) % S - S2), dy = Math.abs(((q.y % S) + S) % S - S2); return dx < 9000 || dy < 9000; });   // Felder nah an einer Grenzlinie
  for (const senk of [true, false]) for (const L of linien) {
    const sperren = linien.map(l2 => { const k = knoten[senk ? L + ',' + l2 : l2 + ',' + L]; return [senk ? k.y : k.x, M.knoten * .2]; });
    const hier = tore.filter(t => t.senk === senk && Math.abs((senk ? t.x : t.y) - grenzLinie(senk, L, senk ? t.y : t.x)) < S * .3).map(t => senk ? t.y : t.x);
    for (const t of hier) sperren.push([t, senk ? TOR_SENK.luecke + M.hoch * .15 : 3000]);   // (waagrecht: die Nachbarstücke laufen hinter die Torfelsen; senkrecht: Stücke enden an der Lücke)
    // Vor und nach jedem Tor läuft die Kette gerade auf das Tor zu, weich zurück in den Schwung der Grenze – kein Versatz, kein Knick.
    // Waagrechte Grenze: das Pass-Tor-Bild (Mauer in Kettenrichtung). Senkrechte Grenze: gerade Kette mit Pass-Lücke, Erdweg quer
    // hindurch und je ein Wachturm oben und unten auf der Linie (03b drawTorBild) – das Quer-Tor-Bild stünde dort quer zur Kette.
    const linie = t => { let p = grenzLinie(senk, L, t); for (const g of hier) { const u = Math.abs(t - g) / KETTE_GERADE[senk ? 'hoch' : 'quer']; if (u < 1) {
      const w = u < .5 ? 1 : 1 - (u - .5) / .5, s = w * w * (3 - 2 * w); p += (grenzLinie(senk, L, g) - p) * s; } } return p; };
    sperren.sort((a, b) => a[0] - b[0]);
    const len = senk ? M.hoch : M.quer, schritt = len * M.abstand;
    for (let i = 0; i + 1 < sperren.length; i++) {
      const a = sperren[i][0] + sperren[i][1], b = sperren[i + 1][0] - sperren[i + 1][1]; if (b <= a || a > ende || b < -ende) continue;
      const anz = Math.max(1, Math.round((b - a) / schritt));
      for (const [ab, ph, gs] of KETTE_REIHEN[senk ? 'hoch' : 'quer']) for (let s = 0; s < anz - (ph ? 1 : 0); s++) {   // zwei Reihen: ein breiter Gebirgszug
        const t = a + (s + .5 + ph) * (b - a) / anz, n = (senk ? 'kette_hoch' : 'kette_quer') + (rnd() < .5 ? 1 : 2), f = rnd() < .5 ? -1 : 1;
        const p = linie(t) + ab + (Math.abs(L) > GRID_HALF ? Math.sign(L) * RAND_AUSSEN : 0), x = senk ? p : t, y = senk ? t : p;
        let gr = len * gs * (.92 + rnd() * .16);
        // ein Feld (Rohstoff) liegt nah an der Grenze (Lage = Spiellogik): dort das Stück weglassen bzw. kleiner, damit nichts im Berg liegt
        const fd = nahFelder.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, q.y - y) - q.radius), Infinity);
        if (fd < 1800 && ab) continue; if (fd < 4500) gr *= fd < 1800 ? .45 : .7;
        const steig = Math.max(-.5, Math.min(.5, (linie(t + gr / 2) - linie(t - gr / 2)) / gr)), amTor = senk && hier.some(g => Math.abs(g - t) < len);   // (am Pass nicht vergrößern: die Lücke bleibt frei)
        if (senk) neu(warm(n, p, t), p, t, gr * KB.img[n].width / KB.img[n].height, KETTE_ACHSE[n], .5, steig, 0, t + gr * .3, f, !amTor);
        else neu(warm(n, t, p), t, p, gr, .5, KETTE_ACHSE[n], 0, steig, p, f);
      } } }
  // senkrechte Grenze: Pass-Lücke mit Erdweg quer durch die Kette (West–Ost), je ein Turm (aus dem Tor-Bild, rote Fahne) über und unter
  // dem Weg auf der Linie der Kette – sie schließen die Kette an die Lücke an
  for (const t of tore) { if (!t.senk) continue;
    const L = Math.round(t.x / S - .5) + .5, x = grenzLinie(true, L, t.y), y = t.y, tb = TOR_SENK.turmB;
    neu('weg', x, y, TOR_SENK.weg, .5, .5, 0, 0, y - TOR_SENK.luecke - 1, 1, false);
    neu('turm', x, y - TOR_SENK.luecke * .35, tb, .5, .96, 0, 0, y - TOR_SENK.luecke * .35, 1, false);
    neu('turm', x, y + TOR_SENK.luecke * 1.3, tb, .5, .96, 0, 0, y + TOR_SENK.luecke * 1.3, -1, false); }
  // Wald am Fuß der Ketten (wie RoK: dichte Nadelwälder an den Pässen und Bergen) – nicht auf Basen, Feldern, Toren, Knoten
  const frei = (x, y, w) => { const id = felsLmAn(x, y); if (id === undefined) return false;
    return !(islandsByLandmass[id] || []).some(b => Math.hypot(b.x - x, b.y - y) < b.radius + w * .5) && !resFields.some(f => f.landmassId === id && Math.hypot(f.x - x, f.y - y) < f.radius + w * .5)
      && !tore.some(t => Math.hypot(t.x - x, t.y - y) < M.tor * .6) && !Object.values(knoten).some(k => Math.hypot(k.x - x, k.y - y) < M.knoten * .55) && ringAn(x, y) > BODEN_BIS_RING.innen; };
  for (const senk of [true, false]) for (const L of linien) for (let t = -ende + 6000; t < ende - 6000; t += 7000) {
    if (rnd() < .45) continue;
    const s = rnd() < .5 ? -1 : 1, w = M.wald[0] * (.8 + rnd() * .3), q = grenzLinie(senk, L, t) + s * (senk ? 2900 : s < 0 ? 2600 : 2300), x = senk ? q : t, y = senk ? t : q;
    if (frei(x, y, w)) neu(rnd() < .55 ? 'wald1' : 'wald2', x, y, w, .5, .78, 0, 0, y, rnd() < .5 ? -1 : 1); }
  // Wälder: lockere Gruppen auf freier Wiese – nicht auf Basen, Feldern, Wegen (Bändern), Bergen, nicht an der Kette
  for (const lm of landmasses) {
    const r2 = mulberry32(lm.id * 7919 + 41), bases = islandsByLandmass[lm.id] || [], band = (felsenDaten && felsenDaten.baender[lm.id]) || [];
    const felder = resFields.filter(f => f.landmassId === lm.id), wald = [], want = { aussen: 9, mitte: 6, innen: 3, sand: 0 }[lm.boden];
    for (let i = 0; i < 400 && wald.length < want; i++) {
      const x = lm.x + (r2() - .5) * S * .9, y = lm.y + (r2() - .5) * S * .9, w = M.wald[0] + r2() * (M.wald[1] - M.wald[0]);
      if (Math.abs(x - grenzLinie(true, Math.round(x / S - .5) + .5, y)) < 3200 || Math.abs(y - grenzLinie(false, Math.round(y / S - .5) + .5, x)) < 3200) continue;
      if (bases.some(b => Math.abs(b.x - x) < 2600 && Math.abs(b.y - y) < 2600 && Math.hypot(b.x - x, b.y - y) < b.radius + w * .5)) continue;
      if (felder.some(f => Math.hypot(f.x - x, f.y - y) < f.radius + w * .5) || felsAuf(x, y, w * .6) || wald.some(o => Math.hypot(o[0] - x, o[1] - y) < 4000)) continue;
      if (band.some(s => pointToSegmentDistance(x, y, s[0], s[1], s[2], s[3]) < w * .4)) continue;
      wald.push([x, y]); neu(r2() < .55 ? 'wald1' : 'wald2', x, y, w, .5, .78, 0, 0, y, r2() < .5 ? -1 : 1); } }
  liste.sort((a, b) => a.fuss - b.fuss);
  const zellen = new Map();
  liste.forEach((o, i) => { o.ord = i;
    for (let cx = Math.floor(o.bb.l / KO_ZELLE); cx <= Math.floor(o.bb.r / KO_ZELLE); cx++) for (let cy = Math.floor(o.bb.t / KO_ZELLE); cy <= Math.floor(o.bb.b / KO_ZELLE); cy++) {
      const k = cx + ',' + cy; (zellen.get(k) || zellen.set(k, []).get(k)).push(o); } });
  return (KO = { liste, zellen });
}
function paintGelaende(g, T, v) {                    // die Gelände-Bilder im Weltrechteck v in die Kachel T (Reihenfolge der Liste)
  const K = karteObjekte(), k0 = dpr * T.z, E = -T.l * k0, F = -T.t * k0, hier = new Set(), sk = karteSkala(T.z);
  const drin = o => { const s = o.gross ? sk : 1; return o.x + (o.bb.r - o.x) * s > v.l && o.x + (o.bb.l - o.x) * s < v.r && o.y + (o.bb.b - o.y) * s > v.t && o.y + (o.bb.t - o.y) * s < v.b; };
  for (let cx = Math.floor(v.l / KO_ZELLE); cx <= Math.floor(v.r / KO_ZELLE); cx++) for (let cy = Math.floor(v.t / KO_ZELLE); cy <= Math.floor(v.b / KO_ZELLE); cy++)
    for (const o of K.zellen.get(cx + ',' + cy) || []) if (drin(o)) hier.add(o);
  for (const o of [...hier].sort((a, b) => a.ord - b.ord)) {
    const k = o.gross ? k0 * sk : k0, px = o.w * k; if (px < 2) continue;   // (größer um den Anker: der Fuß bleibt auf der Linie)
    g.setTransform(k * o.f, k * o.sy * o.f, k * o.sx, k, k0 * o.x + E, k0 * o.y + F);
    g.drawImage(kbBild(o.n, px), -o.ax * o.w, -o.ay * o.h, o.w, o.h);
  }
}
// Weit draußen / ohne Bilder: Gebirge als Band entlang jeder Grenze (Weltmaß, nie dünner als ein paar Pixel)
let gebirgsPfadMem = null;
function gebirgsPfad() {
  if (gebirgsPfadMem) return gebirgsPfadMem;
  const p = new Path2D(), ende = (GRID_HALF + .5) * HEX_SPACING;
  for (let k = -GRID_HALF - 1; k <= GRID_HALF; k++) for (const senk of [true, false]) { const L = k + .5;
    for (let t = -ende - 4000, erst = true; t <= ende + 4000; t += 1500, erst = false) { const q = grenzLinie(senk, L, t);
      if (erst) senk ? p.moveTo(q, t) : p.moveTo(t, q); else senk ? p.lineTo(q, t) : p.lineTo(t, q); } }
  return (gebirgsPfadMem = p);
}
function paintBaender(g, zl) {                       // (Weltmaß gesetzt) dunkles Band, oben eine Lichtkante
  const p = gebirgsPfad(), w = Math.max(2400, 3 / zl);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#2e2b24'; g.lineWidth = w * 1.25; g.stroke(p);
  g.strokeStyle = '#5e5a4e'; g.lineWidth = w; g.stroke(p);
  g.strokeStyle = 'rgba(156,151,132,.55)'; g.lineWidth = w * .35; g.stroke(p);
  g.lineCap = 'butt';
}

function buildForest(lm) {                           // (Stadtbild: wo um die Stadt herum Bäume stehen)
  const rnd = mulberry32(lm.id * 991 + 7), bases = islandsByLandmass[lm.id] || [];
  const dark = new Path2D(), mid = new Path2D(), lit = new Path2D();
  const sb = { l: Math.min(...lm.shape.map(p => p.x)), r: Math.max(...lm.shape.map(p => p.x)), t: Math.min(...lm.shape.map(p => p.y)), b: Math.max(...lm.shape.map(p => p.y)) };
  const edgeDist = (x, y) => { let d = Infinity; const S = lm.shape;
    for (let i = 0, j = S.length - 1; i < S.length; j = i++) d = Math.min(d, pointToSegmentDistance(x, y, S[j].x, S[j].y, S[i].x, S[i].y)); return d; };
  for (let i = 0; i < 600; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * lm.shapeMaxR;
    const fx = lm.x + Math.cos(a) * d, fy = lm.y + Math.sin(a) * d, cnt = 3 + (rnd() * 5 | 0), spread = 380 + rnd() * 420;
    if (bases.some(b => Math.abs(b.x - fx) < 1600 && Math.abs(b.y - fy) < 1900 && (Math.hypot(b.x - fx, b.y - fy) < b.radius + 550 || (fy > b.y && fy < b.y + 1900)))) continue;   // cheap test first
    if (felsAuf(fx, fy, 400 + spread)) continue;                                  // kein Wald an den Bergen (01f)
    const deep = fx > sb.l + 9000 && fx < sb.r - 9000 && fy > sb.t + 9000 && fy < sb.b - 9000;   // far from every bank: no coast test needed
    if (!deep && (!pointInPolygon(fx, fy, lm.shape) || edgeDist(fx, fy) < 700)) continue;
    const trees = [];
    for (let k = 0; k < cnt + 3; k++) trees.push([fx + (rnd() - .5) * spread * 2, fy + (rnd() - .5) * spread * 1.4, 110 + rnd() * 110]);
    trees.sort((p, q) => p[1] - q[1]);
    for (const [x, y, r] of trees) {
      dark.moveTo(x + r, y); dark.arc(x, y, r, 0, Math.PI * 2);
      mid.moveTo(x - .12 * r + .74 * r, y - .18 * r); mid.arc(x - .12 * r, y - .18 * r, .74 * r, 0, Math.PI * 2);
      lit.moveTo(x - .3 * r + .3 * r, y - .36 * r); lit.arc(x - .3 * r, y - .36 * r, .3 * r, 0, Math.PI * 2);
    }
  }
  return [dark, mid, lit];
}

// Cache per (group, landmass). group 'player' = ownedIslands; group 'enemy' = every bot (all red).
const TERR = { player: new Map(), enemy: new Map() };        // lmId -> { sig, path, bbox }
function territorySigs() {                                    // cheap: ~2000 ids, order-independent sum hash
  const out = { player: new Map(), enemy: new Map() };
  const add = (grp, id, tag) => { const lmId = islandById[id].landmassId, m = out[grp];
    m.set(lmId, ((m.get(lmId) || 0) + Math.imul(id + 1, 2654435761) + tag * 40503) >>> 0); };
  for (const id of ownedIslands) add('player', id, 0);
  BOT_DEFS.forEach((bot, i) => { for (const id of botOwnedIslands[bot.id]) add('enemy', id, i + 1); });
  return out;
}

function buildTerritoryChunk(group, lmId) {
  const sets = group === 'player' ? [ownedIslands] : BOT_DEFS.map(b => botOwnedIslands[b.id]);
  const path = new Path2D(); let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const lmIslands = islandsByLandmass[lmId] || [];
  const cw = q => { let a = 0; for (let k = 0; k < q.length; k++) { const [x1, y1] = q[k], [x2, y2] = q[(k + 1) % q.length]; a += x1 * y2 - x2 * y1; } return a < 0 ? q.reverse() : q; };
  const pieces = [];                                                   // {bb, c:[x,y,R]} | {bb, q:[[x,y],...]}: lets a clipped repaint rebuild only nearby geometry
  const addPoly = q => { q = cw(q); path.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) path.lineTo(q[k][0], q[k][1]); path.closePath();
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]); pieces.push({ q, bb: { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) } }); };
  for (const set of sets) {
    const owned = lmIslands.filter(isl => set.has(isl.id));
    const link = new Map();                                              // id -> Set(ids) of corridor partners
    for (const isl of owned) { const R = isl.radius + TERRITORY_PADDING;
      path.moveTo(isl.x + R, isl.y); path.arc(isl.x, isl.y, R, 0, Math.PI * 2);
      pieces.push({ c: [isl.x, isl.y, R], bb: { l: isl.x - R, t: isl.y - R, r: isl.x + R, b: isl.y + R } });
      l = Math.min(l, isl.x - R); r = Math.max(r, isl.x + R); t = Math.min(t, isl.y - R); b = Math.max(b, isl.y + R); link.set(isl.id, new Set()); }
    for (let i = 0; i < owned.length; i++) for (let j = i + 1; j < owned.length; j++) {
      const A = owned[i], B = owned[j];
      if (Math.hypot(A.x - B.x, A.y - B.y) > TERRITORY_CONNECT_MAX_DIST) continue;
      const hw = Math.min(A.radius, B.radius) + TERRITORY_PADDING;
      if (!canConnectHalos(A, B, hw)) continue;
      link.get(A.id).add(B.id); link.get(B.id).add(A.id);
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * hw, ny = dx / len * hw;
      addPoly([[A.x + nx, A.y + ny], [B.x + nx, B.y + ny], [B.x - nx, B.y - ny], [A.x - nx, A.y - ny]]);
    }
    // triangle holes: a-b-c pairwise linked, and no other base of this landmass inside or within (radius + padding) of the triangle
    for (const A of owned) for (const bid of link.get(A.id)) { if (bid <= A.id) continue;
      for (const cid of link.get(bid)) { if (cid <= bid || !link.get(A.id).has(cid)) continue;
        const B = islandById[bid], C = islandById[cid];
        const blocked = lmIslands.some(o => { if (o.id === A.id || o.id === bid || o.id === cid) return false;
          const m = o.radius + TERRITORY_PADDING;
          return pointInPolygon(o.x, o.y, [A, B, C]) || pointToSegmentDistance(o.x, o.y, A.x, A.y, B.x, B.y) < m ||
                 pointToSegmentDistance(o.x, o.y, B.x, B.y, C.x, C.y) < m || pointToSegmentDistance(o.x, o.y, C.x, C.y, A.x, A.y) < m; });
        if (!blocked) addPoly([[A.x, A.y], [B.x, B.y], [C.x, C.y]]);
      } }
  }
  return { path, pieces, bbox: { l, t, r, b } };
}
function piecesPath(chunk, v) {                                        // Path2D of the pieces touching world rect v (same winding as chunk.path)
  const p = new Path2D();
  for (const pc of chunk.pieces) {
    if (pc.bb.r < v.l || pc.bb.l > v.r || pc.bb.b < v.t || pc.bb.t > v.b) continue;
    if (pc.c) { p.moveTo(pc.c[0] + pc.c[2], pc.c[1]); p.arc(pc.c[0], pc.c[1], pc.c[2], 0, Math.PI * 2); }
    else { p.moveTo(pc.q[0][0], pc.q[0][1]); for (let k = 1; k < pc.q.length; k++) p.lineTo(pc.q[k][0], pc.q[k][1]); p.closePath(); }
  }
  return p;
}

let OWNER_SNAPSHOT = new Map();                                // islandId -> 0 (player) | 1..n (bot index)
let ownDeltaVer = -1, terrVer = -1;                            // ownVer seen by ownershipDelta / refreshTerritory (nothing changed → no scan of ~2000 ids per frame)
function ownershipDelta() {                                    // world rects a capture can influence (one per changed base: base ± connect distance), or null
  if (ownDeltaVer === ownVer) return null; ownDeltaVer = ownVer;
  const cur = new Map(); let r = null;
  for (const id of ownedIslands) cur.set(id, 0);
  BOT_DEFS.forEach((bot, i) => { for (const id of botOwnedIslands[bot.id]) cur.set(id, i + 1); });
  const grow = id => { const isl = islandById[id]; if (!isl) return; const m = TERRITORY_CONNECT_MAX_DIST + isl.radius + TERRITORY_PADDING;
    (r = r || []).push({ l: isl.x - m, t: isl.y - m, r: isl.x + m, b: isl.y + m }); };   // per base: one far capture never touches the view's tiles
  for (const [id, tag] of cur) if (OWNER_SNAPSHOT.get(id) !== tag) grow(id);
  for (const id of OWNER_SNAPSHOT.keys()) if (!cur.has(id)) grow(id);
  OWNER_SNAPSHOT = cur;
  return r;
}
function refreshTerritory() {
  if (terrVer === ownVer) return null; terrVer = ownVer;
  const sigs = territorySigs(); let changed = null;
  const grow = bb => { changed = changed ? { l: Math.min(changed.l, bb.l), t: Math.min(changed.t, bb.t), r: Math.max(changed.r, bb.r), b: Math.max(changed.b, bb.b) } : { ...bb }; };
  for (const grp of ['player', 'enemy']) {
    const cache = TERR[grp], want = sigs[grp];
    for (const lmId of [...cache.keys()]) if (!want.has(lmId)) { grow(cache.get(lmId).bbox); cache.delete(lmId); }
    for (const [lmId, sig] of want) { const c = cache.get(lmId); if (!c || c.sig !== sig) { const n = { sig, ...buildTerritoryChunk(grp, lmId) }; cache.set(lmId, n); grow(n.bbox); if (c) grow(c.bbox); } }
  }
  return changed;                       // world bbox of everything that changed, or null
}

const HATCH_PX = () => Math.round(9 * dpr);
function hatchTile(color) { const s = HATCH_PX(), c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.strokeStyle = color; x.lineWidth = 1.25 * dpr; x.beginPath();
  for (const o of [-s, 0, s]) { x.moveTo(o, s); x.lineTo(o + s, 0); } x.stroke(); return c; }
let HATCH = null;                                              // rebuilt when dpr changes
function hatchPatterns() { return HATCH || (HATCH = { player: ctx.createPattern(hatchTile('rgba(150,200,255,.36)'), 'repeat'),
                                                      enemy:  ctx.createPattern(hatchTile('rgba(255,150,140,.34)'), 'repeat') }); }
const TERR_STYLE = { player: { fill: 'rgba(63,134,216,.20)', line: '#8cc0ff' }, enemy: { fill: 'rgba(201,66,58,.20)', line: '#ff8d82' } };
const layer = document.createElement('canvas'), L = layer.getContext('2d');   // sized in renderBackground()


function drawTerritoriesInto(g, lay, z, originL, originT, pxW, pxH, clip) {   // g/lay: target + scratch layer (same device size)
  const setW = x => x.setTransform(dpr * z, 0, 0, dpr * z, -originL * z * dpr, -originT * z * dpr);
  const cx0 = clip ? clip.x : 0, cy0 = clip ? clip.y : 0, cx1 = clip ? clip.x + clip.w : pxW, cy1 = clip ? clip.y + clip.h : pxH;
  const view = { l: originL + cx0 / dpr / z, t: originT + cy0 / dpr / z, r: originL + cx1 / dpr / z, b: originT + cy1 / dpr / z };
  const pad = 12 / z, H = hatchPatterns(), LL = lay.getContext('2d');
  for (const grp of ['enemy', 'player']) {
    const chunks = [...TERR[grp].values()].filter(c => c.bbox.r > view.l - pad && c.bbox.l < view.r + pad && c.bbox.b > view.t - pad && c.bbox.t < view.b + pad);
    if (!chunks.length) continue;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const c of chunks) { l = Math.min(l, c.bbox.l); t = Math.min(t, c.bbox.t); r = Math.max(r, c.bbox.r); b = Math.max(b, c.bbox.b); }
    const x0 = Math.max(cx0, Math.floor(((l - originL) * z - 6) * dpr)), y0 = Math.max(cy0, Math.floor(((t - originT) * z - 6) * dpr));
    const x1 = Math.min(cx1, Math.ceil(((r - originL) * z + 6) * dpr)), y1 = Math.min(cy1, Math.ceil(((b - originT) * z + 6) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    const m = 8 / z, vv = { l: view.l - m, t: view.t - m, r: view.r + m, b: view.b + m };
    const paths = chunks.map(c => piecesPath(c, vv));                      // only the geometry near this tile / clip
    setW(g);
    g.fillStyle = TERR_STYLE[grp].fill; for (const p of paths) g.fill(p);
    const hs = HATCH_PX(), all = new Path2D(); for (const p of paths) all.addPath(p);      // hatch: world-anchored at an
    const ph = Math.round(originL * z * dpr), pv = Math.round(originT * z * dpr);        // integer device-px phase → the
    g.save(); g.clip(all); g.setTransform(1, 0, 0, 1, 0, 0);                           // lines run on across tile seams
    H[grp].setTransform(new DOMMatrix([1, 0, 0, 1, -(((ph % hs) + hs) % hs), -(((pv % hs) + hs) % hs)]));
    g.fillStyle = H[grp]; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
    LL.setTransform(1, 0, 0, 1, 0, 0); LL.clearRect(x0, y0, x1 - x0, y1 - y0); setW(LL); LL.lineJoin = 'round';
    LL.lineWidth = 5.5 / z; LL.strokeStyle = 'rgba(6,12,20,.55)'; for (const p of paths) LL.stroke(p);
    LL.lineWidth = 3.5 / z; LL.strokeStyle = TERR_STYLE[grp].line; for (const p of paths) LL.stroke(p);
    LL.globalCompositeOperation = 'destination-out'; LL.fillStyle = '#000'; for (const p of paths) LL.fill(p);
    LL.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lay, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  }
}

// ---- cached background: ground + mountain chains + forests + territory ----
// World-anchored tiles of TILE_PX CSS px, rendered at one exact zoom per "generation". Panning only renders the
// tiles that scroll into view (a few per frame, time-boxed); a zoom gesture draws the current generation scaled
// and starts a new one when the scale leaves 0.7-1.4. While tiles are missing, up to two older generations of a
// similar zoom (scaled) fill the gaps, else the ring colours plus a whole-world overview (built at idle right after
// boot), so nothing is ever rendered as one big blocking job and no empty area shows through; each gap pixel is drawn
// once. When the zoom settles off-scale, the crisp generation is built behind the complete scaled one and swapped
// in only once it covers the view (no patchwork).
// Canvas rasterisation is deferred until a tile is first drawn, so the per-frame budget counts device pixels, not ms,
// and adapts: it halves after a slow frame that rendered tiles (heavy territory, slow device) and recovers slowly.
const TILE_PX = 256, TILE_BUDGET_MOVING = 540000, TILE_BUDGET_IDLE = 1600000;   // device px of new tiles per frame (max; at least 1 tile)
const BG = { rate: TILE_BUDGET_IDLE, lastAt: 0, lastTiles: 0, valid: false, gen: null, olds: [], next: null, tiles: new Map(), pool: [], pending: false, over: null, seq: 0, lastZ: 0, hopAt: -1e9, land: null, hopGen: null };
function bgDropGen(gen) { for (const [key, T] of BG.tiles) if (T.gen === gen) { BG.tiles.delete(key); BG.pool.push(T.c); } }
function bgGen(z) { const td = Math.round(TILE_PX * dpr); return { z, td, ws: td / (dpr * z), id: ++BG.seq }; }   // ws = tile edge in world units
function bgShow(gen) {                         // gen becomes the displayed generation; the replaced one fills gaps until gen covers the view
  if (BG.gen && BG.gen !== gen) BG.olds.unshift(BG.gen);
  for (const g of BG.olds.splice(0).filter(g => g !== gen)) { if (bgKept(g) || (g.td === gen.td && BG.olds.length < 2 && g.z / gen.z > 0.55 && g.z / gen.z < 1.8)) BG.olds.push(g); else bgDropGen(g); }   // near zooms only: they look alike
  BG.gen = gen; return gen;
}
const bgKept = g => g === BG.land || g === BG.hopGen;   // a hop's end generation and its current far one: kept as filler until it lands
function bgRange(gen, pad, v) {                // tile index range covering the view (v: another view { x, y, z } centre + zoom) (+pad tiles)
  const z = v ? v.z : mapState.zoom, ws = gen.ws, l = v ? v.x - viewW / 2 / z : -mapState.offsetX / z, t = v ? v.y - viewH / 2 / z : -mapState.offsetY / z;
  return { x0: Math.floor(l / ws) - pad, x1: Math.floor((l + viewW / z) / ws) + pad, y0: Math.floor(t / ws) - pad, y1: Math.floor((t + viewH / z) / ws) + pad };
}
function bgMissing(gen, pad, v) {              // missing tiles, nearest to the view centre first
  const R = bgRange(gen, pad, v), out = [], z = mapState.zoom;
  const cx = (v ? v.x : (viewW / 2 - mapState.offsetX) / z) / gen.ws - .5, cy = (v ? v.y : (viewH / 2 - mapState.offsetY) / z) / gen.ws - .5;
  for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++)
    if (!BG.tiles.has(gen.id + ':' + tx + ':' + ty)) out.push({ tx, ty, d: (tx - cx) * (tx - cx) + (ty - cy) * (ty - cy) });
  return out.sort((a, b) => a.d - b.d);
}
function renderTile(gen, tx, ty) {
  const td = gen.td, c = BG.pool.pop() || document.createElement('canvas');
  if (c.width !== td || c.height !== td) { c.width = td; c.height = td; }
  if (layer.width !== td || layer.height !== td) { layer.width = td; layer.height = td; }
  const T = { c, g: c.getContext('2d'), gen, z: gen.z, l: tx * gen.ws, t: ty * gen.ws };
  paintBackground(T, null);
  BG.tiles.set(gen.id + ':' + tx + ':' + ty, T);
  return T;
}
const WARM = document.createElement('canvas'); WARM.width = WARM.height = 1; const WARMG = WARM.getContext('2d');
function bgWarm(T) { WARMG.clearRect(0, 0, 1, 1); WARMG.drawImage(T.c, 0, 0, 1, 1); T.drawn = true; }   // rasterise a tile now, not at its first blit
function bgOverview() {                        // whole-world map for gaps (Farbflächen + Bänder, no territory), painted at idle in slices, once per dpr
  let O = BG.over;
  if (O && O.dpr === dpr && O.done) return O;
  if (!O || O.dpr !== dpr) {
    const pad = .22, l = WORLD.l - WORLD.w * pad, t = WORLD.t - WORLD.h * pad, ww = WORLD.w * (1 + 2 * pad), wh = WORLD.h * (1 + 2 * pad);
    const z = 2048 / (Math.max(ww, wh) * dpr), c = document.createElement('canvas'); c.width = Math.ceil(ww * z * dpr); c.height = Math.ceil(wh * z * dpr);
    O = BG.over = { c, z, l, t, dpr, ref: 0.008, part: 'weit', row: 0, rows: 10, queued: false, done: false };   // ref: band widths as at zoom 0.008
  }
  if (!O.queued) { O.queued = true;
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => { O.queued = false; if (BG.over !== O) return;
      const h = Math.ceil(O.c.height / O.rows), y = O.row * h, clip = { x: 0, y, w: O.c.width, h: Math.min(h, O.c.height - y) };
      paintBackground({ ...O, g: O.c.getContext('2d') }, clip, true);
      bgWarm(O);                                                                 // rasterised slice by slice here, not at its first use
      if (++O.row >= O.rows) O.done = true; else bgOverview(); }, { timeout: 600 }); }
  return null;
}
function repaintBackgroundRect(r) {            // partial repaint of a WORLD rect (after a capture); pixels are deterministic → no seams
  for (const [key, T] of BG.tiles) {
    const e = T.gen.ws;
    if (T.l > r.r || T.l + e < r.l || T.t > r.b || T.t + e < r.t) continue;
    if (T.gen !== BG.gen && T.gen !== BG.next) { BG.tiles.delete(key); BG.pool.push(T.c); continue; }   // stale generation: just forget it
    const k = T.z * dpr, td = T.c.width;
    const x0 = Math.max(0, Math.floor((r.l - T.l) * k)), y0 = Math.max(0, Math.floor((r.t - T.t) * k));
    const x1 = Math.min(td, Math.ceil((r.r - T.l) * k)), y1 = Math.min(td, Math.ceil((r.b - T.t) * k));
    if (layer.width !== td || layer.height !== td) { layer.width = td; layer.height = td; }
    if (x1 > x0 && y1 > y0) paintBackground(T, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
}
function paintGrund(g, T, x, y, w, h) {        // Lückenfüller: die Farbfläche der Ringe ins Geräte-Rechteck x,y,w,h von g (Welt (T.l, T.t) bei 0,0)
  const M = bodenMasken(), z = T.z;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.setTransform(dpr * z, 0, 0, dpr * z, -T.l * z * dpr, -T.t * z * dpr); g.imageSmoothingEnabled = true;
  g.drawImage(M.farbe, -M.R, -M.R, 2 * M.R, 2 * M.R); g.restore();
}
function paintBackground(T, clip, noTerritory) {  // T = tile {c, g, z, l, t}; clip = device-px rect inside T.c, or null for everything
  const z = T.z, w = T.c.width, h = T.c.height, zl = T.ref || z;   // zl: zoom whose line widths to use (overview)
  const g = T.g;
  g.save();
  if (clip) { g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip(); }
  const cl = clip ? T.l + clip.x / dpr / z : T.l, ct = clip ? T.t + clip.y / dpr / z : T.t;
  const W = (clip ? clip.w : w) / dpr / z, H = (clip ? clip.h : h) / dpr / z;
  const view = { l: cl - ISLAND_RADIUS * 2, t: ct - ISLAND_RADIUS * 2, r: cl + W + ISLAND_RADIUS * 2, b: ct + H + ISLAND_RADIUS * 2 };
  const world = () => g.setTransform(dpr * z, 0, 0, dpr * z, -T.l * z * dpr, -T.t * z * dpr);
  // 1 Boden nach Ringen – nah aus den Bildern, weit draußen (und solange sie laden) die Farbfläche
  const bild = !T.part && z >= KARTE_BILD_ZOOM && karteBilder(), zd = T.part ? 0 : z;
  paintBoden(g, T, cl, ct, W, H, clip, bild && z >= BODEN_BILD_ZOOM);
  // 2 Bergstöcke (01f), dann Ketten, Knoten, Wald als Bilder – oder weit draußen die Gebirgs-Bänder
  world();
  for (const lm of landmasses) {
    if (lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b) continue;
    felsenMalen(g, lm, zd, zl);
  }
  const rand = KARTE_MASS.quer * karteSkala(z);                                    // (Bilder ragen so weit über ihren Anker hinaus)
  if (bild) paintGelaende(g, T, { l: cl - rand, t: ct - rand, r: cl + W + rand, b: ct + H + rand });
  else { world(); paintBaender(g, zl); }
  // 3 territory (cached geometry, see below)
  if (!noTerritory) drawTerritoriesInto(g, layer, z, T.l, T.t, w, h, clip);
  g.restore();
}
let cameraSettling = false;   // true while the zoom eases, a pinch runs or a camera flight plays (set by §6)
function drawBackground() {   // per frame: blit the cached tiles; render the missing ones within a pixel budget
  const z = mapState.zoom, now = performance.now(), gap = now - BG.lastAt, td0 = Math.round(TILE_PX * dpr);
  const bIdle = TILE_BUDGET_IDLE, bMove = TILE_BUDGET_MOVING;                   // ≈ 6 / 2 tiles at dpr 2 (always at least one)
  if (BG.lastTiles && gap > 30 && gap < 400) BG.rate = Math.max(td0 * td0, BG.rate * .5);   // the last frame's new tiles were too much (floor: 1 tile)
  else if (gap < 22) BG.rate = Math.min(bIdle, BG.rate * 1.15);
  BG.lastAt = now; BG.lastTiles = 0;
  if (!BG.valid) { BG.tiles.forEach(T => BG.pool.push(T.c)); BG.tiles.clear(); BG.gen = BG.next = null; BG.olds = []; BG.valid = true; }
  const O = bgOverview();                                                          // queued at idle right after boot
  const moving = gesture.active || cameraSettling || mapState.velocityX || mapState.velocityY;
  const has = (g, tx, ty) => BG.tiles.has(g.id + ':' + tx + ':' + ty);
  const anyIn = g => { if (!g) return false; const R = bgRange(g, 0);
    for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++) if (has(g, tx, ty)) return true; return false; };
  if (BG.next && (moving || BG.next.z !== z || BG.next.td !== td0)) { bgDropGen(BG.next); BG.next = null; }   // superseded
  // render for where the zoom is heading: the wheel / button ease and camera flights know their end zoom; a pinch that
  // leaves the window outward gets a generation 20 % further out (fewer, cheaper generations while zooming out).
  // A hop (a flight that dips below 0.6 · its end zoom): its end generation (BG.land) is set up at once and the end
  // view's tiles are rendered first, on the way, so it lands crisp; far out (hopOut) few, coarse generations follow
  // the zoom (z1's tiles would be specks, and a touch there must find tiles near the current zoom)
  const ratio = (a, b) => Math.abs(a / b - 1) < 1e-9 ? 1 : a / b;                // float noise is not a zoom change
  const F = cameraFlight, hop = !!F && F.zm < F.z1 * 0.6, hopOut = hop && z < F.z1 * 0.6;
  if (hop && (!F.land || F.land.td !== td0)) {
    F.land = [BG.gen, ...BG.olds].find(g => g && g.td === td0 && ratio(g.z, F.z1) === 1) || bgGen(F.z1);
    if (F.land !== BG.gen && !BG.olds.includes(F.land)) BG.olds.push(F.land);
  }
  if (!hop) BG.hopGen = null;
  BG.land = hop ? F.land : null;
  const zEnd = F ? (hopOut ? z : F.z1) : gesture.mode !== 'pinch' && mapState.targetZoom !== z ? mapState.targetZoom : z;
  let gen = BG.gen, k = gen ? ratio(z, gen.z) : 0, kEnd = gen ? ratio(zEnd, gen.z) : 0;
  const down = z < (BG.lastZ || z); BG.lastZ = z;
  if (hopOut) BG.hopAt = now;
  if (hopOut && gen && gen.td === td0) {                                             // fast, so fewer generations: each one spans a wide
    if (k < 0.6 || (!down && k > 1.5 && z < F.z1 * 0.45)) { gen = BG.hopGen = bgShow(bgGen(down ? Math.max(F.zm, z * 0.6) : z * 1.3)); k = z / gen.z; } }   // range, set ahead of the motion
  else if (hop) { if (gen !== F.land) gen = bgShow(F.land); k = ratio(z, gen.z); }  // the approach: the end generation, the far one as filler
  else if (!gen || gen.td !== td0 || kEnd < 0.7 || kEnd > 1.4) { gen = bgShow(bgGen(zEnd !== z ? zEnd : gen && gesture.mode === 'pinch' && k < 0.7 ? z * 0.8 : z)); k = z / gen.z; }
  const drawn = (g, tx, ty) => { const T = BG.tiles.get(g.id + ':' + tx + ':' + ty); return !!T && T.drawn; };   // (a filler never pays a first raster)
  const alike = o => !bgKept(o) || (o.td === gen.td && o.z / z > 0.55 && o.z / z < 1.8);          // a hop's kept generations fill in near their zoom only
  const covered = (tx, ty) => BG.olds.some(o => {                                  // an older generation already shows this tile
    if (!alike(o)) return false;
    const e = gen.ws * (1 - 1e-9), x0 = Math.floor(tx * gen.ws / o.ws), x1 = Math.floor((tx * gen.ws + e) / o.ws), y0 = Math.floor(ty * gen.ws / o.ws), y1 = Math.floor((ty * gen.ws + e) / o.ws);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!drawn(o, x, y)) return false; return true; });
  const missing = g => { const out = bgMissing(g, 0); if (g !== gen || !BG.olds.length) return out;
    const a = [], b = []; for (const m of out) (covered(m.tx, m.ty) ? b : a).push(m); return a.concat(b); };   // the uncovered ring first
  let miss = missing(gen), budget = 0;
  if (k !== 1 && !moving) {                                                        // settled off-scale
    if (miss.length) { gen = bgShow(bgGen(z)); k = 1; miss = bgMissing(gen, 0); }  // gaps anyway: render the crisp one directly
    else if (!BG.next) BG.next = bgGen(z);                                         // complete: build the crisp one behind it
  }
  if (miss.length && !cameraFlight && !anyIn(gen) && !BG.olds.some(anyIn) &&       // nothing cached here at all (boot, resize, jump): draw it now -
      !(O && now - BG.hopAt < 600)) {                                              // but not right after a hop (a touch mid-hop): the overview fills in
    for (const m of miss) renderTile(gen, m.tx, m.ty); miss = [];
  } else {
    budget = Math.min(BG.rate, moving ? bMove : bIdle);
    if (hop && gen !== F.land) {                                                   // far out on a hop: the end view first, rasterised
      const lw = bgMissing(F.land, 0, { x: F.end.x, y: F.end.y, z: F.z1 });      // now (a first blit after landing would stall)
      if (lw.length) { const m = lw[0]; bgWarm(renderTile(F.land, m.tx, m.ty)); budget -= F.land.td * F.land.td; BG.lastTiles++; }   // (one per frame: that costs real time)
    }
    const work = miss.length ? miss : BG.next ? bgMissing(BG.next, 0) : [], wg = miss.length ? gen : BG.next;
    for (let first = true; work.length && (first || budget >= wg.td * wg.td); first = false) {   // at least one tile per frame
      const m = work.shift(); renderTile(wg, m.tx, m.ty); budget -= wg.td * wg.td; BG.lastTiles++; }
    if (BG.next && !miss.length && !work.length) { gen = bgShow(BG.next); BG.next = null; k = 1; }   // the crisp one covers the view: swap
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const ox = mapState.offsetX * dpr, oy = mapState.offsetY * dpr;
  const blit = (g, only) => { const kk = ratio(z, g.z); ctx.imageSmoothingQuality = kk === 1 ? 'high' : 'low';   // scaled only mid-zoom: cheap bilinear
    const td = g.td, R = bgRange(g, 0);
    const ex = tx => Math.round(tx * td * kk + ox), ey = ty => Math.round(ty * td * kk + oy);   // shared tile edges → no seams
    for (let ty = R.y0; ty <= R.y1; ty++) for (let tx = R.x0; tx <= R.x1; tx++) {
      const key = g.id + ':' + tx + ':' + ty, T = BG.tiles.get(key); if (!T || (only && (!T.drawn || !only(g, tx, ty)))) continue;
      BG.tiles.delete(key); BG.tiles.set(key, T);                                        // LRU refresh
      const x = ex(tx), y = ey(ty); ctx.drawImage(T.c, x, y, ex(tx + 1) - x, ey(ty + 1) - y); T.drawn = true;
    }
    ctx.imageSmoothingQuality = 'high'; };
  // gaps (only where the current generation has no tile yet, so nothing is drawn twice): older generations where they
  // cover the hole, coarser first; otherwise the ring colours + the overview
  if (miss.length) {
    const holes = new Set(miss.map(m => m.tx + ':' + m.ty)), kg = k, tdg = gen.td;
    const gx = tx => Math.round(tx * tdg * kg + ox), gy = ty => Math.round(ty * tdg * kg + oy);
    const overHole = (o, tx, ty) => { const e = o.ws * (1 - 1e-9);                   // does old tile (tx, ty) overlap a hole?
      for (let y = Math.floor(ty * o.ws / gen.ws); y <= Math.floor((ty * o.ws + e) / gen.ws); y++)
        for (let x = Math.floor(tx * o.ws / gen.ws); x <= Math.floor((tx * o.ws + e) / gen.ws); x++) if (holes.has(x + ':' + y)) return true;
      return false; };
    const open = miss.filter(m => !covered(m.tx, m.ty)).map(m => { const x = gx(m.tx), y = gy(m.ty); return { m, x, y, w: gx(m.tx + 1) - x, h: gy(m.ty + 1) - y }; });
    if (open.length > 48) {                                                        // many holes: ring colours + overview once for the whole view
      const V = { z, l: -mapState.offsetX / z, t: -mapState.offsetY / z }, W = canvas.width, Hh = canvas.height;
      paintGrund(ctx, V, 0, 0, W, Hh);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'low';
      if (O) { const OC = O.c, s = O.z * dpr, u0 = (V.l - O.l) * s, v0 = (V.t - O.t) * s, us = viewW / z * s, vs = viewH / z * s;
        const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(O.c.width, u0 + us), cv1 = Math.min(O.c.height, v0 + vs);
        if (cu1 > cu0 && cv1 > cv0) ctx.drawImage(OC, cu0, cv0, cu1 - cu0, cv1 - cv0, (cu0 - u0) / us * W, (cv0 - v0) / vs * Hh, (cu1 - cu0) / us * W, (cv1 - cv0) / vs * Hh); }
    } else if (open.length) {                                                      // the ring colours + the overview (chains as bands)
      const V = { z, l: -mapState.offsetX / z, t: -mapState.offsetY / z };
      for (const r of open) paintGrund(ctx, V, r.x, r.y, r.w, r.h);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'low';
      const OC = O && O.c;
      if (O) for (const { m, x, y, w, h } of open) {
        const s = O.z * dpr, u0 = (m.tx * gen.ws - O.l) * s, v0 = (m.ty * gen.ws - O.t) * s, us = gen.ws * s;   // source rect in the overview
        const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(O.c.width, u0 + us), cv1 = Math.min(O.c.height, v0 + us);
        if (cu1 <= cu0 || cv1 <= cv0) continue;
        const dx = x + (cu0 - u0) / us * w, dy = y + (cv0 - v0) / us * h, dw = (cu1 - cu0) / us * w, dh = (cv1 - cv0) / us * h;
        ctx.drawImage(OC, cu0, cv0, cu1 - cu0, cv1 - cv0, dx, dy, dw, dh);
      }
    }
    ctx.imageSmoothingQuality = 'high';
    for (const o of BG.olds.slice().sort((a, b) => a.z - b.z)) if (alike(o)) blit(o, overHole);
  }
  blit(gen);
  let pre = [];                                                                    // prefetch a one-tile ring once the view is complete
  if (!miss.length && !BG.next && !hop) { pre = bgMissing(gen, 1);
    if (!BG.lastTiles) budget = Math.min(BG.rate, bMove);
    while (pre.length && budget >= gen.td * gen.td) { const m = pre.shift(); renderTile(gen, m.tx, m.ty); budget -= gen.td * gen.td; BG.lastTiles++; } }
  if (!miss.length && BG.olds.length) BG.olds = BG.olds.filter(g => bgKept(g) || (bgDropGen(g), false));   // the current generation covers the view
  const count = (g, pad) => { const R = bgRange(g, pad); return (R.x1 - R.x0 + 1) * (R.y1 - R.y0 + 1); };
  const cap = count(gen, 1) + (BG.next ? count(BG.next, 0) : 0) + BG.olds.reduce((n, o) => n + count(o, 0), 0) + 12;
  while (BG.tiles.size > cap) { const [key, T] = BG.tiles.entries().next().value; BG.tiles.delete(key); BG.pool.push(T.c); }   // least recently used first
  while (BG.pool.length > 24) { const c = BG.pool.pop(); c.width = c.height = 0; }   // free the backing store now, not at GC
  BG.pending = miss.length > 0 || pre.length > 0 || !!BG.next || (k !== 1 && !gesture.active);   // a scaled (blurry) view → come back for the crisp one
}

function strokeBox(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); g.stroke(); }   // replaces strokeRect (forbidden token, §7.4)
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const BAND = { player: '#3f86d8', bot: '#c9423a', neutral: '#7c8088' };

// Auf der Karte steht bei einer Hauptstadt ihre Burg-Stufe (1–25) – Alexander 4.10.: „nur das Level, das ich gerade bin“
function anzeigeStufe(id) { const ow = islandOwnerOf(id); return ow && typeof AUF !== 'undefined' && AUF && (id === playerIslandId || isCapital(id)) ? AUF.burgStufe(ow) : islandLevels[id] || 1; }
function baseLevelOf(isl) { return islandOwnerOf(isl.id) ? (islandLevels[isl.id] || 1) : (isl.neutralLevel || 1); }
