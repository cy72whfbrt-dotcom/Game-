// Teil 01f-felsen.js: Lebendige Welt (11b G): Bergstöcke auf den Regionen, Märsche laufen darum herum (Wegpunkte), Zeichnen
// Alexander 5.10.: „Karte bleibt wie jetzt, dazu einige Berge/Felsen; Märsche laufen drumherum (Wege etwas länger, Basen dahinter
// etwas geschützter)“ – Design-Vorgabe Variante A „Berge in den Lücken“: Berge nur in freien Flächen, nie auf Basen, Bändern
// (Nachbar-Verbindungen), Brücken, Toren, Feldern oder Startplätzen; nur lange Märsche quer über die Region gehen außen herum.
// Die Berge kommen aus einem eigenen Zufall (wie die Felder) – auf jedem Handy und beim Weltrechner gleich. Jeder Bergstock hat
// eine konvexe Hülle (Hindernis); zwischen ihnen bleibt immer ein Durchgang, und jede Basis erreicht jede andere Basis ihrer
// Region mit höchstens 1,6 × Luftlinie (sonst wird der Bergstock verworfen).
// Weg um die Berge: kürzester Weg über die Hüllen-Ecken (Sichtbarkeits-Graph, Dijkstra), Ecken als Bogen abgerundet und in Punkte
// zerlegt → marchPath/marchPointAt/pathSoFar laufen darauf; die Marschdauer ist die Länge dieses Wegs (marschStrecke).
// Schalter WELT_FELSEN = false: keine Berge, alle Märsche wie vorher (Luftlinie über die Brücken).
const WELT_FELSEN = true;
const FELS_ABSTAND = { basis: 1400, gross: 3000, band: 900, bruecke: 2000, kueste: 700, feld: 1200, berg: 2200 };   // frei um die Hülle (Welt-Einheiten)
const FELS_RAND = 500, FELS_ECKE = 300, FELS_BOGEN = 700, FELS_UMWEG_MAX = 1.6;   // Hülle um die Gipfel · Wegpunkte davor · Bogen-Radius
const FELS_OHNE = { volcano: 1, swamp: 1 };          // Vulkan und Sumpf haben schon ihre Krater/Tümpel: keine Berge
let felsenDaten = null;                              // { liste, proLm: { lmId: [Bergstock] }, baender: { lmId: [[ax, ay, bx, by]] } }
function felsenListe() {                             // alle Bergstöcke (einmal berechnet; beim Laden, bevor Felder/Basen da sind: noch keine)
    if (!WELT_FELSEN) return [];
    if (felsenDaten) return felsenDaten.liste;
    let felder, basen;
    try { felder = resFields; basen = islandsByLandmass; } catch (e) { return []; }
    const liste = [], proLm = {}, baender = {}, r = mulberry32(60617);
    for (const lm of landmasses) {
        const hier = proLm[lm.id] = [], eigene = basen[lm.id] || [];
        const band = baender[lm.id] = [];                                     // alle möglichen Gebiets-Bänder: Nachbarbasen bis zum Verbindungsabstand
        const nachX = eigene.slice().sort((p, q) => p.x - q.x);
        for (let i = 0; i < nachX.length; i++) for (let j = i + 1; j < nachX.length && nachX[j].x - nachX[i].x <= TERRITORY_CONNECT_MAX_DIST; j++) { const A = nachX[i], B = nachX[j];
            if (Math.hypot(A.x - B.x, A.y - B.y) <= TERRITORY_CONNECT_MAX_DIST) band.push([A.x, A.y, B.x, B.y]); }
        for (const g of gateSpots) if (g.lm === lm.id) band.push([g.x, g.y, g.ex, g.ey]);   // der Weg vom Tor auf die Brücke
        if (lm.tier === 'throne' || FELS_OHNE[lm.bio]) continue;
        const want = eigene.length < 8 ? Math.floor(r() * 2) : 2 + Math.floor(r() * 2), enden = [];   // kleine Regionen 0–1, sonst 2–3 (passen nicht alle: 1–3)
        for (const br of bridges) { if (br.a === lm.id || br.b === lm.id) enden.push([br.x1, br.y1], [br.x2, br.y2]); }
        const meineFelder = felder.filter(f => f.landmassId === lm.id);
        for (let k = 0, tries = 0; k < want && tries < 160; tries++) {
            const x = lm.x + (r() * 2 - 1) * lm.shapeMaxR * .75, y = lm.y + (r() * 2 - 1) * lm.shapeMaxR * .75;
            if (eigene.some(i => Math.abs(i.x - x) < 3200 && Math.abs(i.y - y) < 3200 && Math.hypot(i.x - x, i.y - y) < i.radius + FELS_ABSTAND.basis + 1200)) continue;   // (schnell: zu nah an einer Basis)
            if (!aufLand(lm, x, y) || band.some(q => pointToSegmentDistance(x, y, q[0], q[1], q[2], q[3]) < FELS_ABSTAND.band + 800)) continue;   // (schnell: Wasser oder Band)
            const b = felsBergstock(x, y, r, tries >= 60);                         // (findet sich lange kein Platz: kleinerer Stock)
            if (!felsPasst(lm, b, eigene, band, enden, meineFelder, hier)) continue;
            hier.push(b);
            if (!felsErreichbar(eigene, b, hier)) { hier.pop(); continue; }
            b.id = liste.length; b.lm = lm.id; liste.push(b); k++;
        }
    }
    felsenDaten = { liste, proLm, baender };
    return liste;
}
function felsBergstock(x, y, r, klein) {             // 3–7 Gipfel in zwei versetzten Reihen entlang einer leicht gebogenen Linie: in der Mitte der höchste,
    const n = klein ? 3 + Math.floor(r() * 2) : 3 + Math.floor(r() * 5), ang = (r() - .5) * Math.PI * .9, bieg = (r() - .5) * .5, ca = Math.cos(ang), sa = Math.sin(ang);   // dazu Hülle und Wegpunkte
    const gipfel = [], w0 = (klein ? 1150 : 1400) + r() * 300, haupt = Math.floor(n / 2 + (r() - .5)); let t = 0;
    for (let i = 0; i < n; i++) { const s = Math.max(.55, 1 - .17 * Math.abs(i - haupt) + (r() - .5) * .2), w = Math.max(800, Math.min(1700, w0 * s));
        gipfel.push({ t, v: (i % 2 ? 1 : -1) * w0 * (.12 + r() * .2), w, h: w * (.65 + r() * .3), off: w * (.1 + r() * .1) }); t += w * (.55 + r() * .2); }
    const mitte = t / 2;
    for (const g of gipfel) { const u = g.t - mitte, v = bieg * u * u / Math.max(1, mitte) * .5 + g.v; g.x = x + u * ca - v * sa; g.y = y + u * sa + v * ca; }
    const ymin = Math.min(...gipfel.map(g => g.y)), ymax = Math.max(...gipfel.map(g => g.y));
    for (const g of gipfel) { const f = ymax > ymin ? (ymax - g.y) / (ymax - ymin) : .5; g.w *= .85 + f * .3; g.h *= .85 + f * .3; }   // hinten größer, vorne kleiner
    gipfel.sort((p, q) => p.y - q.y);
    const pts = [];                                  // Grundriss jedes Gipfels (mit Spitze nach oben) + Rand
    for (const g of gipfel) for (let i = 0; i < 8; i++) { const th = i / 8 * Math.PI * 2, rx = g.w / 2 + FELS_RAND, ry = (Math.sin(th) < 0 ? g.h * .8 : g.w * .25) + FELS_RAND;
        pts.push({ x: g.x + Math.cos(th) * rx, y: g.y + Math.sin(th) * ry }); }
    const poly = felsHuelle(pts), cx = poly.reduce((s, p) => s + p.x, 0) / poly.length, cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    const bb = { l: Math.min(...poly.map(p => p.x)), r: Math.max(...poly.map(p => p.x)), t: Math.min(...poly.map(p => p.y)), b: Math.max(...poly.map(p => p.y)) };
    const ecken = poly.map(p => { const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1; return { x: p.x + dx / d * FELS_ECKE, y: p.y + dy / d * FELS_ECKE }; });
    return { x, y, gipfel, poly, bb, ecken, saat: Math.floor(r() * 1e9) };
}
function felsHuelle(pts) {                           // konvexe Hülle (gegen den Uhrzeigersinn)
    pts = pts.slice().sort((p, q) => p.x - q.x || p.y - q.y);
    const kreuz = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x), unten = [], oben = [];
    for (const p of pts) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], p) <= 0) unten.pop(); unten.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], p) <= 0) oben.pop(); oben.push(p); }
    return unten.slice(0, -1).concat(oben.slice(0, -1));
}
function felsAbstand(poly, x, y) {                   // Abstand eines Punkts zur Hülle (0 = drin)
    if (pointInPolygon(x, y, poly)) return 0;
    let d = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, pointToSegmentDistance(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y));
    return d;
}
function felsAbstandStrecke(f, ax, ay, bx, by) {     // Abstand einer Strecke zur Hülle (0 = berührt)
    if (felsKreuzt(f, ax, ay, bx, by)) return 0;
    let d = Math.min(felsAbstand(f.poly, ax, ay), felsAbstand(f.poly, bx, by));
    for (const p of f.poly) d = Math.min(d, pointToSegmentDistance(p.x, p.y, ax, ay, bx, by));
    return d;
}
function felsPasst(lm, b, basen, band, enden, felder, andere) {
    const A = FELS_ABSTAND, P = b.poly, weit = (l, t, r, u, m) => r < b.bb.l - m || l > b.bb.r + m || u < b.bb.t - m || t > b.bb.b + m;
    for (const i of basen) { const m = i.radius + (i.startSlot || i.type !== 'tower' ? A.gross : A.basis);   // Startplätze, Tempel, Tore: mehr Platz
        if (!weit(i.x, i.y, i.x, i.y, m) && felsAbstand(P, i.x, i.y) < m) return false; }
    for (const [ax, ay, bx, by] of band) if (!weit(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), A.band) && felsAbstandStrecke(b, ax, ay, bx, by) < A.band) return false;
    for (const [x, y] of enden) if (felsAbstand(P, x, y) < A.bruecke) return false;
    for (const f of felder) if (felsAbstand(P, f.x, f.y) < f.radius + A.feld) return false;
    for (const o of andere) if (o.poly.some(p => felsAbstand(P, p.x, p.y) < A.berg) || P.some(p => felsAbstand(o.poly, p.x, p.y) < A.berg)) return false;
    const tief = HEX_SPACING / 2 - 7700 - A.kueste;   // (das Ufer schlängelt sich höchstens ±3,8k: tiefer drin ist sicher Land)
    for (const p of P) { const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, x = p.x + dx / d * A.kueste, y = p.y + dy / d * A.kueste;   // ganz auf dem Land, mit Abstand zur Küste
        if (Math.abs(x - lm.x) < tief && Math.abs(y - lm.y) < tief) continue;
        if (!aufLand(lm, x, y)) return false; }
    return true;
}
function felsErreichbar(basen, b, fs) {              // keine Basis eingemauert: jeder Weg, den der neue Bergstock schneidet, höchstens 1,6 × Luftlinie
    const umfang = felsLaenge(b.poly.concat([b.poly[0]])), sicher = umfang / 2 / (FELS_UMWEG_MAX - 1);   // so weit auseinander: halb herum reicht immer
    for (let i = 0; i < basen.length; i++) for (let j = i + 1; j < basen.length; j++) { const A = basen[i], B = basen[j];
        if (Math.hypot(A.x - B.x, A.y - B.y) > sicher || !felsKreuzt(b, A.x, A.y, B.x, B.y)) continue;
        const w = felsWegUm(A, B, fs); if (!w) return false;
        if (felsLaenge(w) > FELS_UMWEG_MAX * Math.hypot(A.x - B.x, A.y - B.y)) return false; }
    return true;
}
function felsKreuzt(f, ax, ay, bx, by) {             // geht die Strecke a→b durch die Hülle?
    const bb = f.bb;
    if (Math.max(ax, bx) < bb.l || Math.min(ax, bx) > bb.r || Math.max(ay, by) < bb.t || Math.min(ay, by) > bb.b) return false;
    const P = f.poly, n = P.length, kreuz = (ox, oy, px, py, qx, qy) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const d1 = kreuz(ax, ay, bx, by, P[j].x, P[j].y), d2 = kreuz(ax, ay, bx, by, P[i].x, P[i].y);
        const d3 = kreuz(P[j].x, P[j].y, P[i].x, P[i].y, ax, ay), d4 = kreuz(P[j].x, P[j].y, P[i].x, P[i].y, bx, by);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    }
    return pointInPolygon((ax + bx) / 2, (ay + by) / 2, P) || pointInPolygon(ax, ay, P) || pointInPolygon(bx, by, P);
}
const felsLaenge = w => { let s = 0; for (let i = 1; i < w.length; i++) s += Math.hypot(w[i].x - w[i - 1].x, w[i].y - w[i - 1].y); return s; };
const felsLmAn = (() => { const m = {}; let fertig = false; return (x, y) => {   // Region unter einem Punkt (Raster der Regionen; Berge liegen innen)
    if (!fertig) { for (const lm of landmasses) m[lm.q + ',' + lm.r] = lm.id; fertig = true; }
    return m[Math.round(x / HEX_SPACING) + ',' + Math.round(y / HEX_SPACING)]; }; })();
function felsenBei(x, y) { felsenListe(); const id = felsLmAn(x, y); return felsenDaten && id !== undefined ? felsenDaten.proLm[id] || [] : []; }
// Liegt (x, y) auf einem Bergstock (mit Rand)? Für Lager, Tagesboss und Wälder, die ihren Platz selbst suchen.
function felsAuf(x, y, rand) { if (!WELT_FELSEN) return false; for (const f of felsenBei(x, y)) if (felsAbstand(f.poly, x, y) < (rand || 0)) return true; return false; }
function felsWegUm(a, b, fs) {                       // kürzester Weg a → b um die Hüllen fs (Ecken-Graph, Dijkstra) → Ecken-Punkte, oder null
    const knoten = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    for (const f of fs) for (const e of f.ecken) knoten.push(e);
    const n = knoten.length, dist = new Array(n).fill(Infinity), vor = new Array(n).fill(-1), fertig = new Array(n).fill(false);
    dist[0] = 0;
    for (;;) {
        let u = -1; for (let i = 0; i < n; i++) if (!fertig[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || u === 1) break;
        fertig[u] = true;
        for (let v = 0; v < n; v++) { if (fertig[v]) continue;
            const d = dist[u] + Math.hypot(knoten[v].x - knoten[u].x, knoten[v].y - knoten[u].y);
            if (d < dist[v] && !fs.some(f => felsKreuzt(f, knoten[u].x, knoten[u].y, knoten[v].x, knoten[v].y))) { dist[v] = d; vor[v] = u; } }
    }
    if (vor[1] < 0) return null;
    const weg = []; for (let i = 1; i >= 0; i = vor[i]) weg.unshift({ x: knoten[i].x, y: knoten[i].y });
    return weg;
}
function felsBogen(weg) {                            // Ecken als Bogen (quadratische Kurve), in Punkte alle ~150 Einheiten zerlegt
    if (weg.length < 3) return weg;
    const out = [weg[0]];
    for (let i = 1; i < weg.length - 1; i++) {
        const p = weg[i - 1], c = weg[i], q = weg[i + 1], l1 = Math.hypot(c.x - p.x, c.y - p.y) || 1, l2 = Math.hypot(q.x - c.x, q.y - c.y) || 1;
        const R = Math.min(FELS_BOGEN, l1 / 2, l2 / 2), A = { x: c.x - (c.x - p.x) / l1 * R, y: c.y - (c.y - p.y) / l1 * R }, B = { x: c.x + (q.x - c.x) / l2 * R, y: c.y + (q.y - c.y) / l2 * R };
        const k = Math.max(2, Math.ceil(2 * R / 150));
        for (let s = 0; s <= k; s++) { const t = s / k, u = 1 - t; out.push({ x: u * u * A.x + 2 * u * t * c.x + t * t * B.x, y: u * u * A.y + 2 * u * t * c.y + t * t * B.y }); }
    }
    out.push(weg[weg.length - 1]);
    return out;
}
const felsWegMem = new Map();                        // Umwege, schon gerechnet (höchstens 20.000 – dann von vorn; nie vorab für alle Paare)
function felsenWeg(a, b) {                           // a → b um die Berge herum: [a, Bogen-Punkte …, b]
    const gerade = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    if (!WELT_FELSEN) return gerade;
    let fs = felsenBei(a.x, a.y); const fb = felsenBei(b.x, b.y);
    if (fb !== fs) fs = fs.concat(fb.filter(f => !fs.includes(f)));
    fs = fs.filter(f => !pointInPolygon(a.x, a.y, f.poly) && !pointInPolygon(b.x, b.y, f.poly));   // (steht etwas auf einem Berg: der Berg zählt nicht)
    if (!fs.some(f => felsKreuzt(f, a.x, a.y, b.x, b.y))) return gerade;
    const key = Math.round(a.x) + ',' + Math.round(a.y) + '>' + Math.round(b.x) + ',' + Math.round(b.y);
    let weg = felsWegMem.get(key);
    if (!weg) { weg = felsBogen(felsWegUm(a, b, fs) || gerade); weg[0] = gerade[0]; weg[weg.length - 1] = gerade[1];
        if (felsWegMem.size >= 20000) felsWegMem.clear();
        felsWegMem.set(key, weg); }
    return weg.map(p => ({ x: p.x, y: p.y }));
}
function felsenPfad(pts) {                           // jede Strecke eines Marschwegs um die Berge herum
    if (!WELT_FELSEN || pts.length < 2) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const w = felsenWeg(pts[i - 1], pts[i]); for (let k = 1; k < w.length; k++) out.push(w[k]); }
    return out;
}

// ===== Zeichnen (im Kachel-Bild, Welt-Koordinaten – wie Wälder): Low-Poly wie die Berge im Stadtbild, Licht oben links, keine Verläufe =====
// Farben je Landschaft: Licht, Schatten, Grat-Kante, Kappe (Schnee auf den 1–2 höchsten, Wüste: Tafelberge ohne Kappe)
const FELS_FARBE = {
    green: ['#9a8a72', '#5e5242', 'rgba(30,24,16,.55)', '#eef2f5'],
    sand:  ['#c48a55', '#8a5a34', 'rgba(60,34,14,.5)', null],
    snow:  ['#e9eef3', '#8fa0b0', 'rgba(50,66,82,.5)', null],
    ice:   ['#e9eef3', '#87a9c3', 'rgba(50,66,82,.5)', null],
    stone: ['#8e8f8c', '#55575a', 'rgba(24,24,26,.6)', null]
};
const felsMisch = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const FELS_TOENE = {};                               // 5 Flächen-Töne je Landschaft: hell (oben links) · licht · mittel (vorne) · dunkel (rechts) · tief (hinten rechts)
for (const k in FELS_FARBE) { const [L, S] = FELS_FARBE[k]; FELS_TOENE[k] = [felsMisch(L, '#ffffff', .16), L, felsMisch(L, S, .45), S, felsMisch(S, '#000000', .22)]; }
function felsFacetten(d, x, y, w, h, off, rnd, tafel, kappe) {   // ein Gipfel (oder Felsbrocken) aus 5 Flächen; Fuß-Mitte (x, y)
    const hw = w / 2, j = () => (rnd() - .5) * w * .1, P = (px, py) => ({ x: px + j(), y: py + j() });
    const B0 = P(x - hw, y - h * .05), B1 = P(x - hw * .5, y + w * .16), B2 = P(x + hw * .1, y + w * .22), B3 = P(x + hw * .6, y + w * .14), B4 = P(x + hw, y - h * .04);
    const S = { x: x - off, y: y - h }, SL = P(x - hw * .62, y - h * (.4 + rnd() * .15)), SR = P(x + hw * .55, y - h * (.42 + rnd() * .16)), K = P(x - off * .3 + hw * .06, y - h * .36);
    const S1 = tafel ? { x: S.x - w * .14, y: S.y + h * .16 } : S, S2 = tafel ? { x: S.x + w * .16, y: S.y + h * .16 } : S;   // Wüste: Spitze abgeflacht
    const flaeche = (p, ...q) => { p.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) p.lineTo(q[i].x, q[i].y); p.closePath(); };
    d.boden.moveTo(x + w * .12 + hw * 1.05, y + w * .12); d.boden.ellipse(x + w * .12, y + w * .12, hw * 1.05, w * .24, 0, 0, Math.PI * 2);
    flaeche(d.ton[0], SL, S1, S2, K); flaeche(d.ton[1], B0, SL, K, B1); flaeche(d.ton[2], B1, K, B2);
    flaeche(d.ton[3], S2, SR, B3, B2, K); flaeche(d.ton[4], SR, B4, B3);
    d.kante.moveTo(B0.x, B0.y); d.kante.lineTo(SL.x, SL.y); d.kante.lineTo(S1.x, S1.y); d.kante.lineTo(S2.x, S2.y); d.kante.lineTo(SR.x, SR.y); d.kante.lineTo(B4.x, B4.y);
    d.kante.moveTo(S2.x, S2.y); d.kante.lineTo(K.x, K.y); d.kante.lineTo(B2.x, B2.y);
    d.sil.moveTo(B0.x, B0.y); for (const q of [SL, S1, S2, SR, B4, B3, B2, B1]) d.sil.lineTo(q.x, q.y); d.sil.closePath();
    if (kappe) { const m = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });   // Schneekappe: oberes Drittel, unten gezackt
        const a = m(S, SL, .55), b = m(S, SR, .5), c = m(S, K, .6);
        flaeche(d.kappe, S, b, { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 - h * .06 }, c, { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 - h * .05 }, a); }
}
function felsBild(lm) {                              // die Pfade einer Region (einmal gebaut): ≤ 14 fill/stroke je Region und Kachel, egal wie viele Gipfel
    if (lm.felsBild !== undefined) return lm.felsBild;
    if (FELS_OHNE[lm.bio] && !lm.stone) return (lm.felsBild = null);
    felsenListe();
    const fs = felsenDaten.liste.filter(f => f.lm === lm.id), P = () => new Path2D();
    const d = { boden: P(), ton: [P(), P(), P(), P(), P()], kante: P(), sil: P(), kappe: P(), geroell: P(), baum: P(), baumL: P(), fels: null };
    const tafel = lm.bio === 'sand' && !lm.stone, schnee = (FELS_FARBE[lm.stone ? 'stone' : lm.bio] || FELS_FARBE.green)[3];
    const blob = (p, x, y, rx, ry, rnd, k) => { for (let i = 0; i <= k; i++) { const t = i / k * Math.PI * 2, f = .78 + rnd() * .3, px = x + Math.cos(t) * rx * f, py = y + Math.sin(t) * ry * f; i ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath(); };
    for (const f of fs) {
        const rnd = mulberry32(f.saat);
        const hoechste = f.gipfel.slice().sort((p, q) => q.h - p.h).slice(0, 1 + (rnd() < .5 ? 1 : 0));
        for (const g of f.gipfel) felsFacetten(d, g.x, g.y, g.w, g.h, g.off, rnd, tafel, !tafel && !!schnee && g.w > 1300 && hoechste.includes(g));   // hinten zuerst (nach y sortiert)
        const fuss = f.gipfel.slice().sort((p, q) => q.y - p.y);
        for (let i = 0, n = 4 + Math.floor(rnd() * 7); i < n; i++) { const g = fuss[Math.floor(rnd() * Math.min(3, fuss.length))], rr = 60 + rnd() * 80;   // Geröll am Fuß
            blob(d.geroell, g.x + (rnd() - .5) * g.w * 1.2, g.y + g.w * (.2 + rnd() * .16), rr, rr * .7, rnd, 5); }
        if ((lm.bio === 'green' || lm.bio === 'snow') && !lm.stone) for (let i = 0, n = 1 + Math.floor(rnd() * 2); i < n; i++) {   // 1–2 Baumgruppen am Fuß
            const g = fuss[Math.floor(rnd() * fuss.length)], bx = g.x + (rnd() < .5 ? -1 : 1) * g.w * (.55 + rnd() * .3), by = g.y + g.w * .25;
            for (let k = 0; k < 4; k++) { const x = bx + (rnd() - .5) * 500, y = by + (rnd() - .5) * 260, rr = 100 + rnd() * 90;
                d.baum.moveTo(x + rr, y); d.baum.arc(x, y, rr, 0, Math.PI * 2); d.baumL.moveTo(x - .12 * rr + .74 * rr, y - .18 * rr); d.baumL.arc(x - .12 * rr, y - .18 * rr, .74 * rr, 0, Math.PI * 2); } }
    }
    {   // Einzelfelsen (nur nah sichtbar, kein Hindernis): Wiese/Schnee 2–5 Gruppen; Wüste/Stein 10–16 – sie ersetzen dort die alten runden Häufchen
        const rnd = mulberry32(lm.id * 4243 + 17), bas = islandsByLandmass[lm.id] || [], band = felsenDaten.baender[lm.id] || [], viel = lm.stone || lm.bio === 'sand';
        const e = d.fels = { boden: P(), ton: [P(), P(), P(), P(), P()], kante: P(), sil: P(), kappe: null };
        for (let i = 0, ok = 0, want = viel ? 10 + Math.floor(rnd() * 7) : 2 + Math.floor(rnd() * 4); i < want * 12 && ok < want; i++) {
            const a = rnd() * Math.PI * 2, r0 = Math.sqrt(rnd()) * lm.shapeMaxR * .85, x = lm.x + Math.cos(a) * r0, y = lm.y + Math.sin(a) * r0;
            if (!aufLand(lm, x, y) || bas.some(b => Math.abs(b.x - x) < 3000 && Math.abs(b.y - y) < 3000 && Math.hypot(b.x - x, b.y - y) < b.radius + 1400) || felsAuf(x, y, 600)
                || band.some(s => pointToSegmentDistance(x, y, s[0], s[1], s[2], s[3]) < 900)) continue;
            ok++;
            const n = 2 + Math.floor(rnd() * 3), br = [];
            for (let k = 0; k < n; k++) { const s = (k ? 240 : 380) + rnd() * 260; br.push([x + (rnd() - .5) * 800, y + (rnd() - .5) * 420, s]); }
            br.sort((p, q) => p[1] - q[1]);
            for (const [bx, by, s] of br) felsFacetten(e, bx, by, s, s * (.5 + rnd() * .3), s * (.05 + rnd() * .12), rnd, false, false);
        }
    }
    return (lm.felsBild = d);
}
function felsFlaechen(g, d, t, kante, kw) {          // Bodenschatten + 5 Flächen-Töne (+ Grat-Kante)
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fill(d.boden);
    for (let i = 4; i >= 0; i--) { g.fillStyle = t[i]; g.fill(d.ton[i]); }
    if (kante) { g.lineJoin = 'round'; g.strokeStyle = kante; g.lineWidth = kw; g.stroke(d.kante); }
}
function felsenMalen(g, lm, zd, zl) {                // in paintBackground: zd = Zoom der Kachel (Übersicht: 0 = weit, 1 = alles), zl = Maßstab der Kachel
    if (!WELT_FELSEN) return;
    const d = felsBild(lm); if (!d) return;
    const k = lm.stone ? 'stone' : FELS_FARBE[lm.bio] ? lm.bio : 'green', f = FELS_FARBE[k], t = FELS_TOENE[k];
    const gipfelA = Math.min(1, Math.max(0, (Math.max(zd, zl) - 0.0042) / 0.002)), feinA = Math.min(1, Math.max(0, (zd - 0.016) / 0.006));
    if (gipfelA < 1) { g.globalAlpha = 1 - gipfelA; g.fillStyle = f[1]; g.fill(d.sil); }   // weit weg (Gipfel < 6 px): nur die dunkle Silhouette
    if (gipfelA > 0) { g.globalAlpha = gipfelA;
        if (feinA > 0) { g.globalAlpha = gipfelA * feinA; g.fillStyle = '#284d22'; g.fill(d.baum); g.fillStyle = '#35652c'; g.fill(d.baumL); g.globalAlpha = gipfelA; }
        felsFlaechen(g, d, t, null);
        if (feinA > 0) { g.globalAlpha = gipfelA * feinA;
            if (f[3]) { g.fillStyle = f[3]; g.fill(d.kappe); }
            g.fillStyle = t[3]; g.fill(d.geroell);
            g.lineJoin = 'round'; g.strokeStyle = f[2]; g.lineWidth = 30; g.stroke(d.kante);
            felsFlaechen(g, d.fels, t, f[2], 18); } }
    g.globalAlpha = 1;
}
