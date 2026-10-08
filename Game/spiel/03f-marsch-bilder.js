// Teil 03f-marsch-bilder.js: Märsche und Kämpfe auf der Karte als KI-Bilder (Trupp, Sechseck-Kopf, Pfeilketten, Kampf-Kreis)
// Nur Darstellung (Vorlage werkzeuge/marschtest, Vorgabe design_marsch.md, Alexander 8.10.): alle Zahlen und Zustände kommen aus den
// echten Märschen (pendingAttacks/-Sends/-Retreats/-Scouts, Felder, Lager) und den laufenden Schlachten (mapBattles). Fremde Truppen
// und Helden nur, wenn das Spiel sie kennt (sonst „?“ und das Wappen statt des Helden) – wie bisher.
const MZ_FARBE = {
  eigen: { haupt: '#3f86d8', hell: '#8cc0ff', dunkel: '#16365c' },
  bund: { haupt: '#5cbf62', hell: '#a6e6a0', dunkel: '#1f4a22' },
  feind: { haupt: '#c9423a', hell: '#ff8d82', dunkel: '#52150f' },
  barb: { haupt: '#80848c', hell: '#c8ccd2', dunkel: '#34373c' },
  rally: { haupt: '#eab24a', hell: '#f0dfb0', dunkel: '#795823' },
};
const MZ_MASS = { nah: { trupp: 56, kopf: 44, linie: 3, pfeil: 18 }, mittel: { trupp: 36, kopf: 32, linie: 2, pfeil: 14 }, weit: { punkt: 8, kopf: 20, linie: 1.5 }, ganz: { punkt: 6, linie: 1 } };
const MZ_BEUTE = { holz: 'beute_holz', stein: 'beute_stein', eisen: 'beute_eisen', gold: 'beute_muenzen', gem: 'beute_edelsteine' };
const MZ_BILD = {};
function mzBild(n) {                                   // bilder/<n>.webp, einmal geladen (danach neu zeichnen)
  if (n in MZ_BILD) return MZ_BILD[n];
  MZ_BILD[n] = null; const im = new Image();
  im.onload = () => { MZ_BILD[n] = im; marchFlagCache.clear(); requestRender(); }; im.src = 'bilder/' + n + '.webp';
  return null;
}
const mzS = () => viewW >= 700 ? 1.25 : 1;              // Desktop: alle Pixelwerte ×1,25
function mzStufe() { const z = mapState.zoom; return z >= .016 * (viewW >= 700 ? 1.5 : 1) ? 'nah' : z >= .006 ? 'mittel' : z >= .0025 ? 'weit' : 'ganz'; }
function mzSeite(who) { if (!who || who === 'player') return 'eigen'; if (typeof bundVerbuendet === 'function' && bundVerbuendet('player', who)) return 'bund'; return botById[who] ? 'feind' : 'barb'; }
function mzName(who) {                                 // „[NW]Alex“ wie im Bündnis
  if (who !== 'player' && !botById[who]) return 'Barbaren';
  const tag = typeof bundTagVon === 'function' ? bundTagVon(who) : '';
  return (tag ? '[' + tag + ']' : '') + (who === 'player' ? (window.profileName && profileName.value) || 'Du' : botById[who].name);
}
let mzAnzeige = { koepfe: [], kaempfe: [] };          // was gerade gezeichnet ist (Sechsecke mit Zahl, Kampf-Tafeln) – fürs Antippen und Prüfen
let mzKampfFlaechen = [], mzLeisten = [];              // Sechsecke/Chips der Schlachten vom letzten Bild (Märsche weichen aus) · Leisten über der Karte
function mzLeistenLesen() {                            // Kopfleiste, Zoom-Knöpfe, Anleitung …: dort kein Chip und kein Knopf
  const cv = canvas.getBoundingClientRect(); mzLeisten = [];
  for (const id of BANNER_UNTER) { const el = document.getElementById(id); if (!el || el.hidden) continue; const b = el.getBoundingClientRect(); if (b.width && b.height) mzLeisten.push({ x: b.left - cv.left, y: b.top - cv.top, w: b.width, h: b.height }); }
}
const mzImBild = r => r.x >= 4 && r.y >= 4 && r.x + r.w <= viewW - 4 && r.y + r.h <= viewH - 4;

// ===== Vorgemalte Teile (je Größe einmal): Köpfe, Namensbänder – spart je Bild viel Arbeit (Handy ≥ 30 Bilder/s) =====
var marchFlagCache = new Map();                        // (ein neues Wappen leert ihn: 05a)
function mzMerk(key, w, h, malen) {
  let c = marchFlagCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr); malen(x, w, h); c.w = w; c.h = h;
  if (marchFlagCache.size > 400) marchFlagCache.clear(); marchFlagCache.set(key, c); return c;
}
function mzSechseck(x, cx, cy, w, h) { x.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; x.lineTo(cx + w / 2 * Math.cos(a), cy + h / 2 * Math.sin(a)); } x.closePath(); }
function mzKopf(o, w) {                                // Sechseck: Rahmen der Seite, darin rund der Held – ohne Held das Wappen des Besitzers
  const h = w * 50 / 44, rn = 'marsch_rahmen_' + (o.rally ? 'gold' : o.seite === 'eigen' || o.seite === 'bund' ? o.seite : 'feind'), rb = mzBild(rn);
  const kopf = o.held ? mzBild('held_' + o.held + '_kopf') : null, wappen = !kopf && o.who && (o.who === 'player' || botById[o.who]) ? crestFor(o.who) : null;
  return mzMerk(`k|${kopf ? o.held : ''}|${wappen ? crestKeyOf(wappen) : ''}|${o.seite}|${rn}|${!!rb}|${w}|${dpr}`, w + 4, h + 6, x => {
    const cx = w / 2 + 2, cy = h / 2 + 2, r = w * .41;
    x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 4; x.shadowOffsetY = 2; mzSechseck(x, cx, cy, w * .92, h * .92); x.fillStyle = '#10141c'; x.fill(); x.restore();
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
    if (kopf) x.drawImage(kopf, cx - r, cy - r, 2 * r, 2 * r);
    else { x.fillStyle = MZ_FARBE[o.seite].dunkel; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); if (wappen) drawCrest(x, cx, cy + r * .05, r * 1.35, wappen); }
    x.restore();
    if (rb) x.drawImage(rb, 2, 2, w, h); else { mzSechseck(x, cx, cy, w, h); x.lineWidth = 3; x.strokeStyle = MZ_FARBE[o.seite].haupt; x.stroke(); }
  });
}
function mzBand(text, farbe, px) {                      // Namensband „[NW]Alex“ in Seitenfarbe hell auf dunkel
  return mzMerk(`b|${text}|${farbe}|${px}|${dpr}`, text.length * px * .62 + 14, px + 5, (x, w, h) => {
    x.font = `700 ${px}px Inter, system-ui, sans-serif`; const tw = Math.min(w - 2, x.measureText(text).width + 12);
    x.fillStyle = 'rgba(10,12,16,.78)'; rr(x, (w - tw) / 2, 0, tw, h, Math.min(8, h / 2)); x.fill();
    x.fillStyle = farbe; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + .5);
  });
}
function mzBildAn(n, x, y, w, ax = .5, ay = .5, spiegel = 1) {   // Bild mit Breite w an (x, y); → Höhe (0: noch nicht geladen)
  const im = mzBild(n); if (!im) return 0;
  const h = w * im.height / im.width;
  if (spiegel < 0) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(im, -w * ax, -h * ay, w, h); ctx.restore(); }
  else ctx.drawImage(im, x - w * ax, y - h * ay, w, h);
  return h;
}
function mzChip(text, x, y, px, farbe, links) {         // Chip „12,4 Mio. · ⌛ 2:14“ (am Bildrand nach innen) → { x, y, w, h }
  ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 10, h = px + 6, x0 = Math.max(4, Math.min(viewW - w - 4, links ? x - w : x));
  ctx.fillStyle = 'rgba(10,12,16,.86)'; rr(ctx, x0, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = farbe; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + 5, y + h / 2 + .5);
  return { x: x0, y, w, h };
}
function mzBalken(x, y, w, h, anteil, farbe) {           // Lebensbalken: unter 25 % pulst er (blendet mit dem Kampf aus)
  const a0 = ctx.globalAlpha; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y, w, h);
  if (anteil < .25) ctx.globalAlpha *= .6 + .4 * (.5 + .5 * Math.sin(performance.now() / 600 * Math.PI * 2));
  ctx.fillStyle = farbe; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, anteil)), h); ctx.globalAlpha = a0;
  ctx.strokeStyle = '#0c0f14'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 - .5, y - .5, w + 1, h + 1);
}
function mzBeute(b, x, y, w) {                          // BELOHNUNG = BILD + ZAHL: kleine Kachel mit Beute-Bild und Zahl darauf
  ctx.fillStyle = 'rgba(40,30,14,.9)'; ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = 1; rr(ctx, x, y, w, w, 4); ctx.fill(); ctx.stroke();
  mzBildAn(b.bild, x + w / 2, y + w / 2, w * .9);
  ctx.font = `800 ${Math.round(w * .42)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const t = fmtCompact(b.n).replace(' Tsd.', 'K').replace(' Mio.', 'M');
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(t, x + w / 2, y + w + 3); ctx.fillStyle = '#fff'; ctx.fillText(t, x + w / 2, y + w + 3);
}
function mzSanduhr(x, y, r) {                           // wartet: goldene Sanduhr im dunklen Kreis, pulst
  ctx.globalAlpha = .7 + .3 * Math.sin(performance.now() / 300);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = 'rgba(10,12,16,.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffd678'; ctx.stroke();
  const q = r * .5; ctx.beginPath(); ctx.moveTo(x - q, y - q * 1.2); ctx.lineTo(x + q, y - q * 1.2); ctx.lineTo(x - q, y + q * 1.2); ctx.lineTo(x + q, y + q * 1.2); ctx.closePath();
  ctx.fillStyle = '#ffd678'; ctx.fill(); ctx.globalAlpha = 1;
}
function mzPfeile(pts, farbe, breit, abstand, alpha, versatz) {   // Pfeilkette ››› entlang der Punkte, wandert mit 40 px/s zum Ziel
  const ph = performance.now() / 1000 * 40 % abstand, s = breit * 1.6 + 1.5; let lauf = 0;
  ctx.beginPath();
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i], dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy); if (L < .5) continue;
    const ux = dx / L, uy = dy / L, nx = -uy * versatz, ny = ux * versatz;
    for (let d = ((ph - lauf) % abstand + abstand) % abstand; d < L; d += abstand) { const x = p.x + ux * d + nx, y = p.y + uy * d + ny;
      ctx.moveTo(x - ux * s - uy * s, y - uy * s + ux * s); ctx.lineTo(x, y); ctx.lineTo(x - ux * s + uy * s, y - uy * s - ux * s); }
    lauf += L;
  }
  ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = breit + 2; ctx.stroke(); ctx.strokeStyle = farbe; ctx.lineWidth = breit; ctx.stroke(); ctx.globalAlpha = 1;
}
function mzStrich(pts, farbe, breit, muster, alpha) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.setLineDash(muster); ctx.lineDashOffset = -(performance.now() / 40) % 26; ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  ctx.strokeStyle = farbe; ctx.lineWidth = breit; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// ===== Märsche: was ein Marsch ist (aus den echten Daten), Linie, Trupp, Kopf mit Chip =====
function mzMarschVon(mk) {                             // dein Marsch zur Kennung (Angriff, Senden, Rückweg, Späher, Feld, Lager)
  for (const l of [pendingAttacks, pendingSends, pendingRetreats, pendingScouts, eigeneFeldBarb()]) { const m = l.find(x => marchKeyOf(x) === mk); if (m) return m; }
  return null;
}
function mzInfo(type, o, who, own, target, progress) {
  const spaeher = type === 'scout' || type === 'enemyScout', feld = o && o.fieldId !== undefined ? fieldById[o.fieldId] : null;
  const rueck = type === 'retreat' || !!(o && o.back), seite = !own && !who ? 'feind' : mzSeite(who);
  const n = o && (seite === 'eigen' || seite === 'bund' || o.fightEndsAt) ? o.rawTroops ?? o.troops : null;   // (fremde Truppen erst im Kampf – wie bisher)
  return { seite, who, n: n > 0 ? n : null, held: o && (o.hero || o.held) || null,
    art: spaeher ? 'spaeher' : rueck ? 'rueck' : o && o.rally ? 'rally' : feld ? 'sammeln' : 'marsch',
    rally: !rueck && o && o.rally && Array.isArray(o.rally.an) ? o.rally.an : null,
    zurueck: type === 'retreat' && !!o && 'path' in o,            // (zurückgerufen: recallMarch gibt den Weg mit)
    verletzt: type === 'retreat' && !!o && !('path' in o) && !o.senderBotId,   // (nach einem verlorenen Kampf)
    beute: rueck && feld && o.load >= 1 ? { bild: MZ_BEUTE[feld.kind] || 'beute_muenzen', n: o.load } : null,
    zuMir: !own && target.id !== undefined && islandOwnerOf(target.id) === 'player',
    wartet: (type === 'attack' || type === 'incoming') && !!o && (!!o.wartet || (progress >= 1 && !o.fightEndsAt && !o.back && !mzTrittBei(o))) };
}
function mzTrittBei(a) {                               // angekommene Welle, deren Seite (derselbe oder ein Verbündeter) dort gerade kämpft: sie tritt bei, wartet nicht
  const seite = x => x.attackerBotId || 'player';
  return pendingAttacks.some(p => p !== a && p.fightEndsAt && p.targetId === a.targetId && (seite(p) === seite(a) || bundFreund(seite(p), seite(a))));
}
function mzWartetBeiMir(a, now) {                      // fremde Welle steht schon am Ziel, an dem gerade DEINE Schlacht läuft (sie wartet)
  return a.resolveAt <= now && !a.fightEndsAt && mapBattles.some(b => b.targetId === a.targetId && !b.final);
}
function mzRadius(isl) {                                // halbe Breite des Ziels auf dem Bildschirm (Basis-Bild, sonst Radius)
  const z = mapState.zoom, bk = isl && isl.type === 'tower' && basisKreis(isl, z);
  return bk ? bk.r * 1.15 : (isl && isl.radius || 0) * z;
}
function mzLinie(m, st) {                               // der noch offene Weg ab der Armee: Pfeilkette in Seitenfarbe
  const I = m.info, M = MZ_MASS[st], f = MZ_FARBE[I.seite];
  if (st === 'ganz' && I.seite !== 'eigen' && !I.zuMir) return;
  const pts = [marchPointAt(m, m.d)]; let s = 0;
  for (let i = 0; i < m.seg.length; i++) { s += m.seg[i]; if (s > m.d && s < m.dEnde) pts.push(m.pts[i + 1]); }
  pts.push(marchPointAt(m, m.dEnde)); setScreen(ctx);
  const nahe = st === 'nah' || st === 'mittel', farbe = I.zuMir ? '#ff4a3e' : f.haupt;
  if (I.art === 'spaeher') return mzStrich(pts, '#ffffff', 1.5, [1.5, 5], .7);
  if (I.art === 'sammeln') return mzStrich(pts, '#e3b65a', Math.max(1.5, M.linie), [6, 5], .9);
  if (!nahe) return mzStrich(pts, farbe, M.linie, [1.5, 4], I.art === 'rueck' ? .45 : .85);
  if (I.art === 'rueck') return mzPfeile(pts, f.haupt, M.linie, M.pfeil, .45, 0);
  if (I.art === 'rally') { for (const v of [-6, 0, 6]) mzPfeile(pts, MZ_FARBE.rally.haupt, M.linie * .8, M.pfeil * 1.4, .9, v * mzS()); return; }
  mzPfeile(pts, farbe, M.linie, M.pfeil, .85, 0);
}
function mzTruppBild(m) {
  const I = m.info;
  if (I.art === 'spaeher') return 'marsch_spaeher';
  if (I.art === 'sammeln') return 'marsch_trupp_sammler';
  if (I.art === 'rally') return 'marsch_trupp_rally';
  const s = I.seite === 'eigen' || I.seite === 'bund' ? I.seite : 'feind';
  return `marsch_trupp_${s}_${I.verletzt ? 'verletzt' : m.richtung.dy > 0 ? 'runter' : 'hoch'}`;
}
function drawMarchTokens() {                            // vor den Namensschildern: Linie und Trupp (Kopf und Chip danach: drawMarchChips)
  mzKampfFlaechen = mzAnzeige.koepfe.filter(k => k.art === 'vert' || k.art === 'verst' || k.art === 'kampf' || k.art === 'tafel');
  setScreen(ctx); mzAnzeige = { koepfe: [], kaempfe: [] }; mzLeistenLesen();
  const st = mzStufe(), s = mzS();
  for (const m of marchTokens) {
    const off = Math.min(m.tot * .45, m.r + 8);
    m.dEnde = m.tot - (m.info.art === 'sammeln' ? 0 : Math.min(m.tot * .3, m.tr * .9));   // (vor dem Ziel stehen bleiben, nicht auf der Basis)
    if (m.info.wartet) m.dEnde = Math.max(off, m.tot - m.tr * 2.4 - 150 * s);   // (wartet: außerhalb der Schlacht, weg von ihren Armeen)
    m.d = off + Math.max(0, m.dEnde - off) * m.progress;
    const p = marchPointAt(m, m.d), q = marchPointAt(m, Math.min(m.dEnde, m.d + 6)); m.x = p.x; m.y = p.y;
    m.richtung = { dx: q.x - p.x || (m.pts[m.pts.length - 1].x - p.x) || 1, dy: q.y - p.y || (m.pts[m.pts.length - 1].y - p.y) };
    mzLinie(m, st);
  }
  if (st === 'weit' || st === 'ganz') {                  // weit: Punkt in Seitenfarbe (ganz weit nur deine und die auf dich zu)
    for (const m of marchTokens) { if (st === 'ganz' && m.info.seite !== 'eigen' && !m.info.zuMir) continue;
      const f = MZ_FARBE[m.info.seite]; ctx.beginPath(); ctx.arc(m.x, m.y, MZ_MASS[st].punkt * s / 2, 0, 7);
      ctx.fillStyle = m.info.zuMir ? '#ff5a4e' : f.haupt; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = f.dunkel; ctx.stroke(); }
    return;
  }
  for (const m of marchTokens.slice().sort((a, b) => a.y - b.y)) {
    const I = m.info, w = MZ_MASS[st].trupp * s * (I.art === 'rally' ? 1.4 : I.art === 'spaeher' ? .9 : 1);
    const h = mzBildAn(mzTruppBild(m), m.x, m.y + 6 * s, w, .5, .55, m.richtung.dx < 0 ? -1 : 1) || w * .8;
    m.tf = { x: m.x - Math.max(22, w / 2), y: m.y + 6 * s - h * .55, w: Math.max(44, w), h: Math.max(44, h) };
    m.kopfY = m.y + 6 * s - h * .55;                    // Oberkante des Trupps: darüber sitzt der Kopf
  }
}
function mzKopfText(I, secs) {                          // Chip am Sechseck: Truppen · Restzeit (fremd unbekannt: „?“)
  const zeit = I.wartet ? '⌛ wartet' : '⌛ ' + marschUhr(secs);
  if (I.beute) return zeit + ' · Beute';
  return I.n ? fmtCompact(I.n) + ' · ' + zeit : I.seite === 'eigen' ? zeit : '? · ' + zeit;
}
const MZ_STUFEN = [[0, 1, 0], [0, 0, 0], [1, 1, 0], [0, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 1]];   // [klein, ganz im Bild, weit]
const MZ_AUSWEICH = [];                                // Ausweich-Plätze (Spalten × Zeilen um den Trupp), die nächsten zuerst (eine Spalte ≈ 2 Zeilen breit)
for (let ox = -3; ox <= 3; ox++) for (let oy = -5; oy <= 5; oy++) MZ_AUSWEICH.push([ox, oy]);
MZ_AUSWEICH.sort((a, b) => Math.hypot(a[0] * 2.1, a[1] + (a[1] > 0 ? .3 : 0)) - Math.hypot(b[0] * 2.1, b[1] + (b[1] > 0 ? .3 : 0)));   // (gleich weit: lieber darüber)
const MZ_NAH = MZ_AUSWEICH.filter(([ox, oy]) => Math.abs(ox) <= 1 && oy >= -2 && oy <= 2);
function mzFrei(r, liste) { return !liste.some(q => overlap(r, q) > 0); }
function drawMarchChips() {                             // nach den Namensschildern: Sechseck-Kopf, Namensband, Chip (nie übereinander)
  setScreen(ctx);
  const st = mzStufe(), s = mzS(), belegt = mzKampfFlaechen.concat(mzLeisten, bannerHitRects);   // (Schlachten, Leisten, Namensschilder der Basen)
  if (!mzKampfFlaechen.length) for (const b of mapBattles) { const isl = islandById[b.targetId]; if (!isl || b.final) continue;   // (Schlacht im 1. Bild: Verteidiger, Tafel und Armeen-Ring frei halten – danach genau ihre Flächen)
    const bk = isl.type === 'tower' && basisKreis(isl, mapState.zoom), zw = Math.max(44, bk ? bk.r / .42 : isl.radius * mapState.zoom * 2), x = toSX(isl.x), y = toSY(isl.y) - (bk ? bk.dy : 0);
    belegt.push({ x: x - zw * .9 - 60 * s, y: y - zw * .55 - 110 * s, w: zw * 1.8 + 120 * s, h: zw * 1.2 + 150 * s }); }
  if (st === 'weit') for (const m of marchTokens) if (m.info.seite === 'eigen' && m.info.art !== 'spaeher') {   // weit: nur deine als Mini-Sechseck
    const k = mzKopf(m.info, 20 * s); ctx.drawImage(k, m.x - k.w / 2, m.y - 18 * s - k.h / 2, k.w, k.h);
    m.kopf = { x: m.x - 22, y: m.y - 18 * s - 22, w: 44, h: 44 }; }
  if (st === 'nah' || st === 'mittel') for (const m of marchTokens.slice().sort((a, b) => a.y - b.y)) {
    const I = m.info; m.kopf = null;
    if (m.x < -60 || m.x > viewW + 60 || m.y < -80 || m.y > viewH + 80) continue;
    if (I.art === 'spaeher') {                          // Späher: kein Sechseck, nur Auge im Kreis
      const y = m.kopfY - 10 * s; ctx.beginPath(); ctx.arc(m.x, y, 9 * s, 0, 7); ctx.fillStyle = 'rgba(10,12,16,.85)'; ctx.fill(); ctx.strokeStyle = MZ_FARBE[I.seite].hell; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(m.x, y, 6 * s, 3.5 * s, 0, 0, 7); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.beginPath(); ctx.arc(m.x, y, 1.8 * s, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
      m.kopf = { x: m.x - 22, y: y - 22, w: 44, h: 44 }; continue;
    }
    const kw0 = MZ_MASS[st].kopf * s, px = Math.round((st === 'nah' ? 12 : 11) * s), name0 = st === 'nah' ? mzName(I.who || 'player') : '';
    const txt = mzKopfText(I, m.secs); ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
    const cw0 = ctx.measureText(txt).width + 10 + (I.beute ? 26 * s : 0);
    // Platz: Kopf über dem Trupp, Chip rechts (am rechten Rand links); liegt dort schon etwas (Kopf, Chip, Schlacht, Basis-Schild, Leiste):
    // daneben / darüber / darunter – sonst klein (nur der Kopf, ohne Chip und Namen)
    const nw0 = name0 ? Math.max(0, ctx.measureText(name0).width + 12 - kw0) / 2 : 0;   // (Namensband breiter als der Kopf)
    const frei = (xx, yy, links, kw, cw, bandH, ganz) => { const kh = kw * 50 / 44, nw = bandH ? nw0 : 0;
      const r0 = { x: (links ? xx - kw / 2 - 4 - cw : xx - kw / 2) - nw, y: yy - kh / 2, w: kw + 4 + cw + 2 * nw, h: kh + bandH + 2 };
      return (ganz ? mzImBild(r0) : xx > 0 && xx < viewW && yy > 0 && yy < viewH) && mzFrei(r0, belegt) ? r0 : null; };   // (ganz: auch der Chip im Bild)
    let pl = null;
    for (const [klein, ganz, weit] of MZ_STUFEN) {     // erst groß nah am Trupp, dann klein nah, dann weiter weg (mit Strich zum Trupp)
      const kw = kw0 * (klein ? .7 : 1), cw = klein ? 0 : cw0, bandH = klein || !name0 ? 0 : px + 5;
      for (const [ox, oy] of weit ? MZ_AUSWEICH : MZ_NAH) {
        const xx = m.x + ox * (kw + cw + 8), yy = m.kopfY - kw * 25 / 44 - 2 * s + oy * (kw * 50 / 44 + bandH + 6);
        for (const links of klein ? [false] : [false, true]) { const r0 = frei(xx, yy, links, kw, cw, bandH, ganz); if (r0) { pl = { x: xx, y: yy, links, r: r0, kw, chip: !klein }; break; } }
        if (pl) break;
      }
      if (pl) break;
    }
    if (!pl) continue;                                 // (kein Platz im Bild: der Trupp allein)
    const { x, y, r, kw } = pl, kh = kw * 50 / 44, name = pl.chip ? name0 : '', bandH = name ? px + 5 : 0;
    belegt.push(r);
    if (x !== m.x || y < m.kopfY - kh) { ctx.strokeStyle = 'rgba(10,12,16,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m.x, m.kopfY); ctx.lineTo(x, y + kh / 2); ctx.stroke(); }
    const k = mzKopf({ ...I, rally: I.art === 'rally' }, kw); ctx.drawImage(k, x - kw / 2 - 2, y - kh / 2 - 2, k.w, k.h);
    if (I.zurueck) mzBildAn('marsch_zeichen_zurueck', x + kw * .42, y - kh * .38, 14 * s);
    if (I.wartet) mzSanduhr(x - kw * .5, y - kh * .5, 10 * s);
    if (name) { const b = mzBand(name, (I.art === 'rally' ? MZ_FARBE.rally : MZ_FARBE[I.seite]).hell, px - 1); ctx.drawImage(b, x - b.w / 2, y + kh / 2 + 1, b.w, b.h); }
    if (pl.chip) {
      const c = mzChip(txt, pl.links ? x - kw / 2 - 4 - (I.beute ? 26 * s : 0) : x + kw / 2 + 4, y - px / 2 - 3, px, I.wartet ? '#ffd678' : '#fff6dc', pl.links);
      if (I.beute && st === 'nah') mzBeute(I.beute, c.x + c.w + 4, y - 12 * s, 18 * s);
    }
    if (I.rally && I.rally.length > 1 && pl.chip) mzMiniKoepfe(I.rally, x, y + kh / 2 + bandH + 4 * s, s);
    m.kopf = { x: x - Math.max(22, kw / 2), y: y - Math.max(22, kh / 2), w: Math.max(44, kw), h: Math.max(44, kh) };
    mzAnzeige.koepfe.push({ art: I.art, seite: I.seite, n: I.n, text: pl.chip ? txt : I.wartet ? '⌛ wartet' : '', klein: !pl.chip, x: r.x, y: r.y, w: r.w, h: r.h });
  }
  if (st === 'nah') mzVerstAnBasen(s);
  mzWarnung(st);
}
function mzVerstAnBasen(s) {                            // Verstärker (Botschaft) in einer Basis, die du kennst: je ein Mini-Sechseck mit Name und Truppen
  if (typeof verst === 'undefined' || !verst.l.length) return;
  for (const q of towerRects) {
    if (mapBattles.some(b => b.targetId === q.id && !b.final)) continue;   // (im Kampf zeigt sie die Schlacht)
    const vs = verst.l.filter(v => v.t === q.id && v.n >= 1); if (!vs.length) continue;
    const w = 24 * s, x = q.x + q.w * .82, px = Math.round(10.5 * s);
    vs.slice(0, 4).forEach((v, i) => { const y = q.y + q.h * .3 + i * (w * 50 / 44 + 4 * s), k = mzKopf({ seite: mzSeite(v.w), who: v.w }, w);
      ctx.drawImage(k, x - k.w / 2, y - k.h / 2, k.w, k.h);
      const txt = mzName(v.w).replace(/^\[\w+\]/, '') + ' · ' + fmtCompact(v.n), c = mzChip(txt, x + w / 2 + 3, y - px / 2 - 3, px, MZ_FARBE[mzSeite(v.w)].hell);
      mzAnzeige.koepfe.push({ art: 'verst', n: v.n, text: txt, x: x - w / 2, y: y - w * 50 / 88, w: c.x + c.w - x + w / 2, h: w * 50 / 44 }); });
  }
}
function mzMiniKoepfe(an, x, y, s) {                     // Rally: bis zu 4 Mitglieder als Mini-Sechseck (ohne Anführer), sonst „+6“
  const ms = an.slice(1), w = 20 * s, n = Math.min(4, ms.length), x0 = x - (n - 1) * (w + 3) / 2;
  ms.slice(0, 4).forEach((q, i) => { const k = mzKopf({ seite: mzSeite(q[0]), who: q[0], held: q[4] && q[4].id || null }, w); ctx.drawImage(k, x0 + i * (w + 3) - k.w / 2, y, k.w, k.h); });
  if (ms.length > 4) mzChip('+' + (ms.length - 4), x0 + n * (w + 3) - w / 2, y + 3 * s, Math.round(10 * s), '#1d1406');
}
function mzWarnung(st) {                                // Feind auf dich zu: rotes Warn-Dreieck an deiner Basis, auf der Seite, von der er kommt
  const s = mzS(), schon = new Set();
  for (const m of marchTokens) {
    if (!m.info.zuMir || m.info.art === 'spaeher' || schon.has(m.tgtId)) continue; schon.add(m.tgtId);
    const e = m.pts[m.pts.length - 1], dx = m.x - e.x, dy = m.y - e.y, d = Math.hypot(dx, dy) || 1, R = Math.max(14, m.tr * .8);
    ctx.globalAlpha = .55 + .45 * Math.sin(performance.now() / 300);
    mzBildAn('marsch_zeichen_warnung', e.x + dx / d * R, e.y + dy / d * R - 8 * s, (st === 'ganz' || st === 'weit' ? 18 : 30) * s); ctx.globalAlpha = 1;
  }
}

// ===== Antippen: Armee → runde Knöpfe (deine: Info, Zurück, Schneller · fremde: Info, Angreifen, Spähen) =====
var selMarch = null, marchBtnRects = [];
const MZ_KNOPF = { info: ['ui_sym_rolle', 'Info'], recall: ['ui_sym_rueckzug', 'Zurück'], speed: ['ui_sym_beschleuniger', 'Schneller'], angriff: ['ui_sym_schwert', 'Angreifen'], spaehen: ['ui_sym_spaeher', 'Spähen'] };
const mzSelKey = m => m.mk || 'f|' + m.key;
function mzEigenerMarsch(mk) {                          // → [Liste, Marsch] (für Zurück/Schneller wie bisher)
  const l = [pendingAttacks, pendingSends, pendingRetreats, pendingScouts, eigeneFeldBarb()].find(x => x.some(y => marchKeyOf(y) === mk));
  return l ? [l, l.find(y => marchKeyOf(y) === mk)] : [null, null];
}
function drawMarchButtons() {
  marchBtnRects = [];
  if (!selMarch) return;
  const m = marchTokens.find(t => mzSelKey(t) === selMarch);
  if (!m || m.x === undefined) { selMarch = null; return; }
  setScreen(ctx);
  let acts;
  if (m.mk) { const [list, mm] = mzEigenerMarsch(m.mk); if (!mm) { selMarch = null; return; }
    acts = ['info'].concat(list !== pendingRetreats && !mm.back ? ['recall'] : [], mm.fightEndsAt ? [] : ['speed']); m.kosten = speedUpCost(mm); }
  else acts = ['info', 'angriff', 'spaehen'];
  const f = m.kopf || m.tf || { x: m.x - 22, y: m.y - 22, w: 44, h: 44 }, orte = mzKnopfOrte(f.x + f.w / 2, f.y + 22, acts.length);
  acts.forEach((act, i) => {
    const { x, y } = orte[i];
    const [bild, text0] = MZ_KNOPF[act], text = act === 'speed' && gemsArmed('marsch:' + selMarch) ? 'Wirklich?' : text0;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fillStyle = 'rgba(14,12,10,.94)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = act === 'speed' ? '#7fd0ff' : '#e4c886'; ctx.stroke();
    mzBildAn(bild, x, y - 2, 26);
    ctx.font = '700 10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(text, x, y + 29); ctx.fillStyle = '#f3e6c4'; ctx.fillText(text, x, y + 29);
    if (act === 'speed') { const k = String(m.kosten); ctx.font = '800 10px Inter, system-ui, sans-serif'; const kw = ctx.measureText(k).width + 18;
      ctx.fillStyle = '#123247'; rr(ctx, x + 8, y - 26, kw, 15, 7.5); ctx.fill(); drawGlyph(ctx, 'gem', x + 16, y - 18.5, 10, '#7fd0ff'); ctx.fillStyle = '#e6f6ff'; ctx.textAlign = 'left'; ctx.fillText(k, x + 22, y - 18); }
    marchBtnRects.push({ act, x: x - 22, y: y - 22, w: 44, h: 44 });
  });
  ctx.strokeStyle = 'rgba(228,200,134,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 16, 0, Math.PI * 2); ctx.stroke();   // (Ring um die gewählte Armee)
}
function mzKnopfOrte(cx, cy, n) {                      // Bogen über der Armee – passt er nicht (Bildrand, Kopfleiste, Zoom-Knöpfe): Reihe darüber/darunter, Spalte links/rechts
  const flaeche = p => ({ x: p.x - 26, y: p.y - 24, w: 52, h: 64 });   // (Knopf + Text darunter)
  const hb = hintEl.textContent !== defaultHint && hintEl.getBoundingClientRect(), cv = canvas.getBoundingClientRect();   // (auch nicht unter einem Hinweis)
  const leisten = hb && hb.width ? mzLeisten.concat({ x: hb.left - cv.left, y: hb.top - cv.top, w: hb.width, h: hb.height }) : mzLeisten;
  const fehler = orte => orte.reduce((z, p, i) => z + (mzImBild(flaeche(p)) ? 0 : 1) + leisten.filter(q => overlap(flaeche(p), q) > 0).length
    + orte.filter((q, j) => j > i && overlap(flaeche(p), flaeche(q)) > 0).length, 0);
  const bogen = Math.max(Math.asin(30 / 66) * 2, Math.PI / (n + 1)), lagen = [[...Array(n)].map((_, i) => { const w = Math.PI * 1.5 + (i - (n - 1) / 2) * bogen; return { x: cx + Math.cos(w) * 66, y: cy + Math.sin(w) * 59 }; })];
  const schieb = (v, a, b) => v.length ? Math.max(a - Math.min(...v), Math.min(0, b - Math.max(...v))) : 0;   // ganze Reihe/Spalte ins Bild schieben (Abstände bleiben)
  for (const dy of [-70, 66, -130, 126]) { const xs = [...Array(n)].map((_, i) => cx + (i - (n - 1) / 2) * 58), d = schieb(xs, 30, viewW - 30); lagen.push(xs.map(x => ({ x: x + d, y: cy + dy }))); }
  for (const dx of [-62, 62, -120, 120]) { const ys = [...Array(n)].map((_, i) => cy + (i - (n - 1) / 2) * 68), d = schieb(ys, 28, viewH - 44); lagen.push(ys.map(y => ({ x: cx + dx, y: y + d }))); }
  return lagen.map(l => ({ l, f: fehler(l) })).reduce((a, b) => b.f < a.f ? b : a).l;   // (die erste ohne Fehler, sonst die mit den wenigsten)
}
function mzInfoZeigen(m) {                              // Kurzinfo ohne Fenster: wer, Held, Truppen, Ziel, Restzeit
  const I = m.info, h = I.held && heroById(I.held), ziel = islandById[m.tgtId];
  flashHint([mzName(I.who || 'player'), h ? 'Held ' + h.name : '', 'Truppen ' + (I.n ? fmtNum(I.n) : I.seite === 'eigen' ? '–' : '?'),
    ziel ? (I.art === 'rueck' ? 'heim nach ' : 'Ziel ') + islandTitle(ziel) : '', I.wartet ? 'wartet, bis der Kampf entschieden ist' : '⌛ ' + marschUhr(m.secs)].filter(Boolean).join(' · '), 4000);
}
function marchTapAt(sx, sy) {                           // → true, wenn der Tipp einer Armee oder ihren Knöpfen galt
  const drin = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const b = marchBtnRects.find(r => drin(r, sx, sy)), m = selMarch && marchTokens.find(t => mzSelKey(t) === selMarch);
  if (b && m) {
    if (b.act === 'recall') { recallMarch(selMarch); selMarch = null; }
    else if (b.act === 'speed') speedUpMarch(selMarch);
    else if (b.act === 'info') mzInfoZeigen(m);
    else { const q = islandById[m.srcId]; selMarch = null;   // (fremde Armee: ihre Basis angreifen oder ausspähen – wie über das Basis-Fenster)
      if (q && b.act === 'angriff') openIslandPopup(q); else if (q) launchScout(q.id); }
    requestRender(); return true;
  }
  const t = marchTokens.filter(m => m.x !== undefined && (m.mk || (m.info.seite !== 'eigen' && islandById[m.srcId])))
    .map(m => ({ m, d: drin(m.kopf, sx, sy) || drin(m.tf, sx, sy) ? 0 : Math.hypot(m.x - sx, m.y - sy) })).filter(o => o.d < 22).sort((a, c) => a.d - c.d)[0];
  if (t) { const k = mzSelKey(t.m); selMarch = selMarch === k ? null : k; requestRender(); return true; }
  if (selMarch) { selMarch = null; requestRender(); }
  return false;
}

// ===== Kampf: Kreis + Säule am Ziel, Armeen im Halbkreis, Verteidiger mit Verstärkern, Tafel, Geschosse, Verluste =====
function mzKampfTeile(b) {                              // wer auf der Angreiferseite kämpft: [{ who, n, held, rally }] (Summe der Truppen = Kampf)
  const fa = b.attackId && pendingAttacks.find(a => kampfKey(a) === b.attackId);
  const wer = fa ? fa.attackerBotId || 'player' : b.feld ? b.aWho : b.atk === 'mine' ? 'player' : islandOwnerOf(b.sourceId) || 'barb';
  let l;
  if (fa && fa.rally && !fa.rally.zus) l = [{ who: fa.rally.by || wer, n: fa.rawTroops, held: fa.hero || null, rally: fa.rally.an }];
  else if (fa && fa.rally) l = fa.rally.an.map(x => ({ who: x[0] || wer, n: x[2], held: x[4] && x[4].id || null }));
  else if (fa && fa.quellen) l = fa.quellen.map((q, i) => ({ who: wer, n: q[1], held: i ? null : fa.hero || null }));
  else l = [{ who: wer, n: fa ? fa.rawTroops : b.my, held: fa ? fa.hero || null : b.hero || null }];
  if (fa) for (const p of pendingAttacks) if (p !== fa && p.fightEndsAt && p.targetId === fa.targetId) {   // (Zuschauer: Wellen, die der Weltrechner dazugelegt hat)
    const w = p.attackerBotId || 'player'; if (w === wer || bundFreund(w, wer)) l.push({ who: w, n: p.rawTroops, held: p.hero || null }); }
  return { l, fa };
}
const MZ_PLAETZE = [90, 67.5, 112.5, 45, 135, 22.5, 157.5, 0, 180, 78.75, 101.25, 56.25, 123.75, 33.75, 146.25, 11.25, 168.75].map(g => g * Math.PI / 180);   // unter und neben dem Ziel (oben: Verteidiger, Tafel)
const mzKleinFlaeche = (p, s) => ({ x: p.x - 28 * s, y: p.y - 62 * s, w: 56 * s, h: 66 * s });
function mzKleinPlatz(reihe, voll, s) {                 // freier Platz für eine kleine Armee – sonst der am wenigsten verdeckte (im Bild)
  const f = q => voll.reduce((z, v) => z + overlap(mzKleinFlaeche(q, s), v), 0) + (mzImBild(mzKleinFlaeche(q, s)) ? 0 : 1e5);
  const p = reihe.find(q => !f(q)) || reihe.map(q => ({ q, f: f(q) })).sort((a, c) => a.f - c.f)[0].q;
  p.klein = true; return p;
}
function mzPlaetze(b, n, tx, cy, R, belegt) {           // freie Plätze am nächsten zur Ankunftsseite: nicht auf einer anderen Basis, Kopf + Chip
  const w0 = Math.atan2(-b.uy, -b.ux), ab = (x, y) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y))), s = mzS();   // nie über einem anderen
  const andere = towerRects.filter(q => q.id !== b.targetId).map(q => ({ x: q.x + q.w * .1, y: q.y + q.h * .1, w: q.w * .8, h: q.h * .8 }))   // (andere Basen samt ihren Schildern:
    .concat(bannerHitRects.filter(q => q.id !== b.targetId));                                                                          //  sonst sieht die Armee aus, als stünde sie dort)
  const reihe = [1, 1.5, 2, 2.6, 3.3].flatMap(k => MZ_PLAETZE.slice().sort((x, y) => ab(x, w0) - ab(y, w0)).map(w => ({ x: tx + Math.cos(w) * R * k, y: cy + Math.sin(w) * R * k * .72 })));   // (nur unten und seitlich: oben stehen Verteidiger und Tafel)
  const flaeche = p => ({ x: p.x - 64 * s, y: p.y - 108 * s, w: 128 * s, h: 112 * s });   // (Trupp, Kopf und Chip darüber)
  const voll = belegt.slice(), aus = [];
  for (let i = 0; i < n; i++) {
    const drauf = q => flaeche(q).x >= 0 && flaeche(q).x + flaeche(q).w <= viewW;
    const p = reihe.find(q => !aus.includes(q) && drauf(q) && mzFrei(flaeche(q), andere) && mzFrei(flaeche(q), voll))
      || reihe.find(q => !aus.includes(q) && drauf(q) && mzFrei({ x: q.x - 18, y: q.y - 30, w: 36, h: 44 }, andere) && mzFrei(flaeche(q), voll))
      || reihe.find(q => !aus.includes(q) && drauf(q) && mzFrei(flaeche(q), voll))
      || mzKleinPlatz(reihe.filter(q => !aus.includes(q)), voll.concat(andere), s);   // (kein Platz für Trupp + Chip: klein, nur Trupp und Kopf)
    aus.push(p); voll.push(p.klein ? mzKleinFlaeche(p, s) : flaeche(p));
  }
  return aus;
}
function mzKampf(b, t, tx, ty) {                        // (Bildschirm) eine Schlacht nah: t = Ablauf 0 … MB_MS
  const s = mzS(), st = mzStufe() === 'nah' ? 'nah' : 'mittel', M = MZ_MASS[st], isl = b.feld ? null : islandById[b.targetId], now = Date.now();
  const bk = isl && isl.type === 'tower' && basisKreis(isl, mapState.zoom), zw = Math.max(44, bk ? bk.r / .42 : isl ? isl.radius * mapState.zoom * 2 : b.feld ? FELD_BREITE * mapState.zoom * .7 : 44);
  const cy = ty - (bk ? bk.dy : b.feld ? zw * .2 : 0), kz = b.feld ? +b.feld.slice(1) : b.targetId;   // (Feld: Mitte des Feld-Bilds; kz: Zufall je Ziel)
  const after = t > 3200, al = after ? Math.max(0, 1 - (t - 3200) / 900) : Math.min(1, t / 300);
  const tick = Math.max(0, Math.min(1, (t - 1000) / 2200)), e = 1 - Math.pow(1 - tick, 2);
  const va = Math.max(0, Math.round(b.my - b.myLoss * e)), vd = Math.max(0, Math.round(b.en - b.enLoss * e));
  const { l: teile, fa } = mzKampfTeile(b), summe = teile.reduce((x, q) => x + (q.n || 0), 0) || 1;
  const rest = fa && fa.fightEndsAt && !b.final ? '⚔ ' + fmtClock(Math.max(0, Math.ceil((fa.fightEndsAt - now) / 1000))) : '⚔';
  ctx.save(); ctx.globalAlpha = al;
  const puls = 1 + .03 * Math.sin(performance.now() / 800 * Math.PI * 2);   // Boden: rote Doppel-Ellipse pulst, Lichtsäule mit Schwertern
  mzBildAn('marsch_kampf_kreis', tx, cy + zw * .12, zw * 1.3 * puls);
  if (!after) { ctx.globalAlpha = .8 * al; mzBildAn('marsch_kampf_saeule', tx, cy + zw * .12, Math.max(48 * s, zw * .55), .5, .92); }
  ctx.restore();
  const kw = M.kopf * s, kh = kw * 50 / 44, px = Math.round((st === 'nah' ? 12 : 11) * s), tw0 = M.trupp * s, kw0 = kw, belegt = mzAnzeige.koepfe.filter(k => k.art === 'vert' || k.art === 'verst' || k.art === 'kampf' || k.art === 'tafel').concat(mzLeisten);   // (Schlacht vor Märschen: die weichen ihr aus)
  const owner = b.feld ? b.dWho : islandOwnerOf(b.targetId), dSeite = b.def === 'mine' ? 'eigen' : b.def === 'neutral' ? 'barb' : mzSeite(owner) === 'eigen' ? 'feind' : mzSeite(owner);
  // Verteidiger über dem Ziel (Wappen des Besitzers), daneben die Verstärker der Basis (am Feld: weitere Märsche der Sammler) je mit eigenem Sechseck
  const vy = cy - zw * .55 - kh / 2 - 4 * s, helfer = b.feld ? b.helfer : typeof verst !== 'undefined' ? verst.l.filter(v => v.t === b.targetId && v.n >= 1) : [];
  const hJetzt = v => Math.round(v.n * vd / Math.max(1, b.en)), besatzung = Math.max(0, vd - helfer.reduce((x, v) => x + hJetzt(v), 0));
  ctx.globalAlpha = al;
  const dk = mzKopf({ seite: dSeite, who: owner, held: b.dHeld || null }, kw); ctx.drawImage(dk, tx - kw / 2 - 2, vy - kh / 2 - 2, dk.w, dk.h);
  mzBalken(tx, vy + kh / 2 + 3 * s, (st === 'nah' ? 36 : 28) * s, (st === 'nah' ? 5 : 4) * s, vd / Math.max(1, b.en), MZ_FARBE[dSeite].haupt); ctx.globalAlpha = al;
  const dTxt = fmtCompact(besatzung) + ' · ' + rest, dc = mzChip(dTxt, tx + kw / 2 + 4, vy - px / 2 - 3, px, MZ_FARBE[dSeite].hell);
  const koepfe = [{ art: 'vert', n: besatzung, text: dTxt, x: tx - kw / 2, y: vy - kh / 2, w: dc.x + dc.w - tx + kw / 2, h: kh }];
  const hp = helfer.slice(0, 6).map((v, i) => {         // (rechts/links neben dem Verteidiger, eine Reihe tiefer)
    const x = tx + (i % 2 ? -1 : 1) * (kw * 1.6 + Math.floor(i / 2) * 104 * s), y = vy + kh * .95, w = kw * .78, hk = mzKopf({ seite: mzSeite(v.w), who: v.w, held: v.h || null }, w), n = hJetzt(v);
    ctx.drawImage(hk, x - w / 2 - 2, y - w * 50 / 44 / 2 - 2, hk.w, hk.h);
    const txt = mzName(v.w).replace(/^\[\w+\]/, '') + ' · ' + fmtCompact(n), c = mzChip(txt, x - 40 * s, y + w * 50 / 88 + 2 * s, Math.round(10.5 * s), MZ_FARBE[mzSeite(v.w)].hell);
    koepfe.push({ art: 'verst', n, text: txt, x: Math.min(x - w / 2, c.x), y: y - w * 50 / 88, w: Math.max(w, c.w), h: w * 50 / 44 + c.h + 2 * s });
    return { x, y };
  });
  ctx.globalAlpha = 1;
  // Tafel über dem Verteidiger: beide Seiten zusammen („3 Armeen · 12,4 Mio. ⚔ 8,1 Mio.“)
  const links = (teile.length > 1 ? teile.length + ' Armeen · ' : '') + fmtCompact(va), rechts = fmtCompact(vd);
  ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
  const lw = ctx.measureText(links).width, rw = ctx.measureText(rechts).width, tbw = lw + rw + 34 * s, tby = vy - kh * .62 - px - 14 * s, tbx = Math.max(4, Math.min(viewW - tbw - 4, tx - tbw / 2));
  const aSeite = mzSeite(teile[0].who), aF = (teile.length === 1 && teile[0].rally ? MZ_FARBE.rally : MZ_FARBE[aSeite]);
  ctx.globalAlpha = al; ctx.fillStyle = 'rgba(10,12,16,.88)'; rr(ctx, tbx, tby, tbw, px + 8, (px + 8) / 2); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = aF.hell; ctx.fillText(links, tbx + 7, tby + (px + 8) / 2 + .5);
  ctx.fillStyle = '#ffd678'; ctx.textAlign = 'center'; ctx.fillText('⚔', tbx + lw + 17 * s, tby + (px + 8) / 2 + .5);
  ctx.textAlign = 'left'; ctx.fillStyle = MZ_FARBE[dSeite].hell; ctx.fillText(rechts, tbx + tbw - rw - 7, tby + (px + 8) / 2 + .5);
  koepfe.push({ art: 'tafel', text: links + ' ⚔ ' + rechts, x: tbx, y: tby, w: tbw, h: px + 8 });
  // Angreifer im Halbkreis um das Ziel, je Trupp (Kampf-Bild) + Sechseck + Chip mit seinem Anteil
  const R = zw * .62 + tw0 * .55, orte = mzPlaetze(b, teile.length, tx, cy, R, belegt.concat(koepfe));
  const ap = orte.map((p, i) => {
    const q = teile[i], sd = mzSeite(q.who), wack = after ? 0 : Math.sin(performance.now() / 70 + i), n = Math.round(va * (q.n || 0) / summe), kl = p.klein ? .7 : 1, kw = kw0 * kl, kh = kw * 50 / 44, tw = tw0 * kl;
    const fl = b.won && after ? Math.min(1, (t - 3200) / 900) : 0, x = p.x + (tx - p.x) * fl * .6, y = p.y + (cy - p.y) * fl * .6;   // (Sieg: rücken ins Ziel ein)
    ctx.globalAlpha = al;
    const bild = q.rally ? 'marsch_trupp_rally' : 'marsch_trupp_' + (sd === 'eigen' || sd === 'bund' ? sd : 'feind') + '_kampf';
    const th = mzBildAn(bild, x + wack, y, tw * (q.rally ? 1.3 : 1), .5, .6, x > tx ? -1 : 1) || tw * .6;
    const ky = y - th * .6 - kh / 2 - 2 * s, k = mzKopf({ seite: sd, who: q.who, held: q.held, rally: !!q.rally }, kw);
    ctx.drawImage(k, x - kw / 2 - 2, ky - kh / 2 - 2, k.w, k.h);
    mzBalken(x, ky + kh / 2 + 3 * s, 28 * s, 4 * s, va / Math.max(1, b.my), MZ_FARBE[sd].haupt); ctx.globalAlpha = al;
    const txt = p.klein ? '' : fmtCompact(n) + ' · ' + rest; ctx.font = `700 ${px}px Inter, system-ui, sans-serif`;
    const cw = ctx.measureText(txt).width + 10, c = p.klein ? { x: x - kw / 2, y: ky - kh / 2, w: kw } : mzChip(txt, x - cw / 2, ky - kh / 2 - px - 9 * s, px, '#fff6dc');   // (Chip über dem Kopf: schmal, nichts daneben verdeckt)
    if (q.rally && !p.klein) mzMiniKoepfe(q.rally, x, ky + kh / 2 + 9 * s, s);
    koepfe.push({ art: 'kampf', seite: sd, n, text: txt, klein: !!p.klein, x: Math.min(x - Math.max(kw, tw) / 2, c.x), y: c.y, w: Math.max(kw, tw, c.w), h: y + th * .4 - c.y });   // (mit dem Trupp)
    return { x, y: ky };
  });
  ctx.globalAlpha = 1;
  if (!after) mzGeschosse(kz, t, ap, tx, cy, zw, s);
  // Verluste: je Welle eine Zahl neben dem getroffenen Kopf (echte Verluste in 5 Teilen), steigt und blendet aus, höchstens 4 zugleich
  if (t > 900 && t < 3400) {
    const i0 = Math.floor((t - 900) / 450);
    for (let i = Math.max(0, i0 - 1); i <= i0; i++) {
      const age = t - 900 - i * 450; if (age < 0 || age > 900 || i > 4) continue;
      const r = mulberry32(i * 31 + kz);
      for (const [atk, loss, ganz] of [[true, b.myLoss, b.my], [false, b.enLoss, b.en]]) {
        const n = Math.round(loss / 5); if (n < 1) continue;
        const ziel = atk ? ap[Math.floor(r() * ap.length)] : hp.length && r() < .5 ? hp[Math.floor(r() * hp.length)] : { x: tx, y: vy };
        if (!ziel) continue;
        const gross = n > ganz * .1, pz = Math.round((gross ? 16 : 13) * s), eigen = atk ? mzSeite(teile[0].who) === 'eigen' : dSeite === 'eigen';
        const x = Math.max(36 * s, ziel.x - kw / 2 - 26 * s), y = ziel.y - 34 * s * age / 900;   // (nie über den Bildrand)
        ctx.globalAlpha = age < 600 ? 1 : 1 - (age - 600) / 300; ctx.font = `800 ${pz}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText('-' + fmtCompact(n), x, y);
        ctx.fillStyle = gross && age < 220 ? '#ffd678' : eigen ? '#ff8d82' : '#ffffff'; ctx.fillText('-' + fmtCompact(n), x, y);
      }
    }
    ctx.globalAlpha = 1;
  }
  mzAnzeige.koepfe.push(...koepfe);
  mzAnzeige.kaempfe.push({ ziel: b.targetId, feld: b.feld || null, armeen: teile.length, a: va, d: vd, tafel: links + ' ⚔ ' + rechts, helfer: hp.length });
}
function mzGeschosse(kz, t, ap, tx, cy, zw, s) {          // je Seite alle 400 ms 1–3 Pfeile/Steine im Bogen (450 ms, 30 px hoch), Einschlag = Funken
  if (!ap.length) return;
  for (let k = Math.max(1, Math.floor((t - 620) / 400)); k <= Math.floor(t / 400); k++) {
    const r = mulberry32(kz * 131 + k * 7);
    for (const sd of ['a', 'd']) for (let j = 0, n = 1 + Math.floor(r() * 3); j < n; j++) {
      const q = (t - k * 400 - r() * 150 - j * 60) / 450, a = ap[Math.floor(r() * ap.length)], dx = (r() - .5) * 16, dy = (r() - .5) * 10, art = sd === 'a' ? 'marsch_geschoss_pfeil' : r() < .5 ? 'marsch_geschoss_pfeil_feuer' : 'marsch_geschoss_stein';
      if (q < 0 || q > 1.3) continue;
      const p0 = sd === 'a' ? { x: a.x, y: a.y + 10 * s } : { x: tx, y: cy - zw * .25 }, p1 = sd === 'a' ? { x: tx + dx, y: cy - zw * .1 + dy } : { x: a.x + dx, y: a.y + 14 * s + dy };
      if (q > 1) { ctx.fillStyle = '#ffd678'; ctx.globalAlpha = 1 - (q - 1) / .3;   // Einschlag: 6 Funken
        for (let f = 0; f < 6; f++) { const w = f * 1.05 + k, d = (q - 1) * 60; ctx.fillRect(p1.x + Math.cos(w) * d - 1.5, p1.y + Math.sin(w) * d - 10 * (q - 1) - 1.5, 3, 3); }
        ctx.globalAlpha = 1; continue; }
      const x = p0.x + (p1.x - p0.x) * q, y = p0.y + (p1.y - p0.y) * q - Math.sin(q * Math.PI) * 30 * s, im = mzBild(art); if (!im) continue;
      const ang = Math.atan2(p1.y - p0.y - Math.cos(q * Math.PI) * Math.PI * 30 * s, p1.x - p0.x), w = 14 * s * (art === 'marsch_geschoss_stein' ? 1 : 1.6);
      ctx.save(); ctx.translate(x, y); if (art !== 'marsch_geschoss_stein') ctx.rotate(ang + (art === 'marsch_geschoss_pfeil' ? -2.62 : -2.8));
      ctx.drawImage(im, -w / 2, -w * im.height / im.width / 2, w, w * im.height / im.width); ctx.restore();
    }
  }
}
// Kampf am Feld (Sammler angegriffen, 09a): wird sofort entschieden – die Karte spielt ihn trotzdem ~5 s als Schlacht ab, die Zahlen laufen
// auf das echte Ergebnis zu, danach das Band. Nur Anzeige (e = Feld-Bericht, aWho/dWho aus Sicht dieses Spielers); weitere Märsche der Sammler
// stehen als eigene Sechsecke auf der Verteidiger-Seite (dTeile), ihre Zahlen zusammen = die Sammler im Kampf.
const MZ_FELD_MS = 5000;
function feldKampfBild(e) {
  const f = fieldById[e.fieldId]; if (SYSTEM || !f || !e.aWho || !e.dWho) return;
  const home = islandById[e.aHome], dx = home ? f.x - home.x : 0, dy = home ? f.y - home.y : 1, l = Math.hypot(dx, dy) || 1, now = performance.now();
  const aWon = e.aWho === 'player' ? !!e.won : !e.won, du = e.aWho === 'player' ? aWon : !aWon;
  const t = e.dTeile || [], sum = t.reduce((x, q) => x + q[0], 0) || 1;
  const helfer = t.slice(1).map(q => ({ w: e.dWho, n: q[0] * e.dTroops / sum, h: q[1] }));
  sfx('clash');
  mapBattles.push({ feld: f.id, targetId: null, x: f.x, y: f.y, ux: dx / l, uy: dy / l, atk: e.aWho === 'player' ? 'mine' : 'bot', def: e.dWho === 'player' ? 'mine' : 'bot',
    aWho: e.aWho, dWho: e.dWho, hero: e.aHero || null, dHeld: e.dHero || null, helfer, my: e.aTroops, myLoss: e.aLoss, en: e.dTroops, enLoss: e.dLoss, won: aWon,
    born: now, t0: 0, anchor: now, slow: MB_MS / MZ_FELD_MS, final: true, done: false,
    onEnd: () => spawnBattleFx({ x: f.x, y: f.y }, du, du ? 'Sieg' : 'Niederlage', FIELD_KINDS[f.kind].name) });
  requestRender();
}
function mzKampfFern(tx, ty, rt) {                      // weit draußen: kleiner Kampf-Kreis mit gekreuzten Schwertern, pulst
  const p = 1 + Math.sin(rt / 140) * .08, s = mzS();
  mzBildAn('marsch_kampf_kreis', tx, ty, 40 * s * p);
  ctx.beginPath(); ctx.arc(tx, ty - 14 * s, 10 * s, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,10,8,.85)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ff8d7e'; ctx.stroke();
  drawGlyph(ctx, 'attack', tx, ty - 14 * s, 12 * s, '#ffd2c8');
}

// ===== Sieg / Niederlage: kleines Band (KI-Bild) am Bildrand, weg vom Ziel – verdeckt keine Köpfe und Zahlen =====
function mzErgebnisBand(f, alpha, scale, sx, sy) {
  const im = mzBild(f.good ? 'marsch_band_sieg' : 'marsch_band_niederlage'), bw = Math.min(viewW >= 700 ? 300 : 230, viewW * .6);
  const bh = im ? bw * im.height / im.width : 60, x = Math.max(bw / 2 + 4, Math.min(viewW - bw / 2 - 4, sx));
  const y = (sy > viewH * .55 ? 120 + bh / 2 : viewH - 120 - bh / 2) + (sy > viewH * .55 ? 1 : -1) * f.stack * (bh + 24);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  if (im) ctx.drawImage(im, -bw / 2, -bh / 2, bw, bh);
  const titel = f.label.toUpperCase(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(Math.min(bw / 10, bw * .55 / Math.max(1, titel.length * .78)))}px Cinzel, Georgia, serif`;
  if (f.good) { ctx.fillStyle = '#1d1406'; ctx.fillText(titel, 0, bh * .08); }
  else { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,6,4,.8)'; ctx.strokeText(titel, 0, 0); ctx.fillStyle = '#ffc1b8'; ctx.fillText(titel, 0, 0); }
  if (f.sub) { ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(f.sub, 0, bh / 2 + 10); ctx.fillStyle = f.good ? '#fff3d6' : '#ffc1b8'; ctx.fillText(f.sub, 0, bh / 2 + 10); }
  ctx.restore();
}

// ===== Rally sammelt: goldener Bodenring dreht (12°/s) am Sammelpunkt =====
function mzRallyRing(x, y, r) {
  const im = mzBild('marsch_ring_gold'); if (!im) return;
  const R = Math.max(30, r * 1.4) * mzS();
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .42); ctx.rotate(performance.now() / 1000 * 12 * Math.PI / 180); ctx.drawImage(im, -R, -R * im.height / im.width * 2, 2 * R, R * im.height / im.width * 4); ctx.restore();
}
