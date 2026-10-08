// Teil 03b-gebaeude-3d.js: Gebäude der Karte als KI-Bild (Basen, Pass-Tore, Thron und Tempel)
// Pass-Tor auf der Karte: steht genau auf der Grenze im Pass (KARTE_ZONEN.paesse – die Grenze läuft dort gerade, 03a karteObjekte)
// → { x, y, r: Abstand Mitte–Schild, senk: Grenze läuft senkrecht } oder null
const TOR_PUNKT_ZOOM = 0.0015;                                                  // noch weiter draußen keine Tor-Punkte (Handy: über 500 Punkte wären nur Rauschen)
function torMitte(island) {
  if (island.type !== 'gate' || !karteBilder()) return null;
  if (island.torMitte) return island.torMitte;
  const p = island.pass, im = KB.img.tor_zu, x = p.x, y = p.y, senk = p.senk;
  return (island.torMitte = { x, y, senk, r: senk ? TOR_SENK.hoch * .07 : KARTE_MASS.tor * im.height / im.width * (1 - KETTE_ACHSE.tor_zu) * .9 });   // (senkrecht: Schild knapp unter dem Weg)
}
// (Bildschirm) Pass-Tor offen/zu; dunkel: noch im Nebel. Waagrechte Grenze: das Pass-Tor-Bild (Mauer in Kettenrichtung).
// Senkrechte Grenze: das Tor-Bild für Nord-Süd-Ketten, Weg genau auf dem Torpunkt, Kettenachse auf der Grenzlinie.
function drawTorBild(island, open, z, dunkel) {
  const tm = torMitte(island), n = open ? 'tor_offen' : 'tor_zu', w = KARTE_MASS.tor * z, mx = toSX(tm.x), my = toSY(tm.y);   // (fest in der Welt wie die Kette)
  if (w < 16) { if (dunkel || z < KARTE_BILD_ZOOM) return;                       // (ganz weit: die Pass-Punkte in Zonenfarbe, drawUebersichtZeichen)
    ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fillStyle = open ? '#d4ad66' : '#d24c40'; ctx.fill();   // weit draußen: Punkt (offen gold, zu rot)
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0f1217'; ctx.stroke(); return; }
  if (mx + w < 0 || mx - w > viewW || my + w < 0 || my - w > viewH) return;
  if (tm.senk) { const ns = open ? 'tor_senk_offen' : 'tor_senk_zu', hs = TOR_SENK.hoch * z, ws = hs * KB.img[ns].width / KB.img[ns].height;
    ctx.drawImage(kbBild(ns, ws * dpr), mx - ws * TOR_SENK.achse, my - hs * TOR_SENK.weg, ws, hs); return; }
  const h = w * KB.img[n].height / KB.img[n].width; ctx.drawImage(kbBild(n, w * dpr), mx - w / 2, my - h * KETTE_ACHSE[n], w, h);
}
// Ganz weit (wie die Karten-Testdatei): Pass-Punkte in der Farbe ihrer Stufe (noch zu: blass), die Zonen-Nummern und Thron und
// Tempel – auch unter dem Nebel (das Ziel aller ist immer zu sehen, wie RoK)
function drawUebersichtZeichen(z) {
  if (z >= KARTE_BILD_ZOOM || !karteBilder()) return;
  setScreen(ctx); const jetzt = Date.now(), r = viewW < 600 ? 6 : 5;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + (viewW < 600 ? 11 : 14) + 'px Georgia, serif'; ctx.lineJoin = 'round';
  for (const lm of landmasses) { if (lm.zone === ZONE_MITTE) continue; const t = lm.tier === 'guardian', x = toSX(lm.x), y = toSY(lm.y) + (t ? Math.max(HEILIGTUM_BREITE.guardian * z, 30) * .55 : 0);
    if (x < -20 || y < -20 || x > viewW + 20 || y > viewH + 20) continue;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,16,.8)'; ctx.strokeText(lm.name, x, y); ctx.fillStyle = '#e4c886'; ctx.fillText(lm.name, x, y); }
  for (const isl of islands) if (isl.bildR && !islandSeen(isl)) heiligtumBild(isl, z);
  for (const br of bridges) { const x = toSX(br.pass.x), y = toSY(br.pass.y); if (x < -10 || y < -10 || x > viewW + 10 || y > viewH + 10) continue;
    ctx.globalAlpha = passOpensAt(br) > jetzt ? .45 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = PASS_FARBE[br.pass.stufe]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0c0f14'; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawToreImNebel(view, z) {                                            // die Kette hat an jedem Tor eine Lücke: auch unerforschte Tore zeigen (der Nebel liegt darüber)
  if (!karteBilder() || KARTE_MASS.tor * z < 16) return;
  setScreen(ctx);
  const m = KARTE_MASS.tor;
  for (const br of bridges) { const isl = islandById[br.gateId]; if (!isl || islandSeen(isl)) continue;
    const tm = torMitte(isl); if (tm.x < view.l - m || tm.x > view.r + m || tm.y < view.t - m || tm.y > view.b + m) continue;
    drawTorBild(isl, false, z, true); }
}
const HEILIGTUM_BILD = { megaTemple: ['thron', .56, 64], tempel: ['tempel', .6, 30], waechtertempel: ['waechtertempel', .6, 30] };   // Bild, Fuß im Bild (y), kleinste Breite (px)
function heiligtumBild(island, z) {                                            // (Bildschirm) Thron bzw. Wächter-Tempel an seinem Weltpunkt
  const art = island.type === 'megaTemple' ? 'megaTemple' : island.tempelArt, [n, ay, minPx] = HEILIGTUM_BILD[art], im = KB.img[n];
  const w = Math.max(HEILIGTUM_BREITE[island.type === 'megaTemple' ? 'megaTemple' : 'guardian'] * z, minPx), h = w * im.height / im.width, x = toSX(island.x), y = toSY(island.y);
  if (x + w < 0 || x - w > viewW || y + h < 0 || y - h > viewH) return;
  ctx.drawImage(kbBild(n, w * dpr), x - w / 2, y - h * ay, w, h);
}
// Basen als KI-Bild (Alexander 7.10.): Stufe 1–100 gleichmäßig auf 15 Bilder, ALLE gleich groß (keine Größe nach Stufe); die Hauptstadt
// über ihre Kartenstufe (burgKarte). Darunter das Namensschild bzw. bei freien die Stufen-Zahl (drawBasisSchilder). Mittlerer Zoom (wie RoK: Basen bleiben sichtbar): Basen
// mit Besitzer nie kleiner als BASIS_MIN_PX, freie in echter Größe bis BASIS_KLEIN_PX; ganz weit (unter TOR_PUNKT_ZOOM) Übersicht wie bisher.
const BASIS_BREITE = 5500, BASIS_MIN_PX = 22, BASIS_KLEIN_PX = 10;
const BASIS_BILD = { img: [], mip: [], offen: -1 };
const basisBildNr = L => Math.max(1, Math.min(15, Math.ceil(Math.max(1, L) * 15 / 100)));
function basisBild(nr) {                                                       // das Bild nr (1–15), lädt beim ersten Mal alle 15
  if (BASIS_BILD.offen < 0) { BASIS_BILD.offen = 15;
    for (let i = 1; i <= 15; i++) { const im = new Image(); im.onload = () => { if (im.naturalWidth) { BASIS_BILD.img[i] = im; requestRender(); } };
      im.src = 'bilder/basis_' + String(i).padStart(2, '0') + '.webp'; } }
  return BASIS_BILD.img[nr] || null;
}
function basisMip(nr, px) {                                                    // Bild nr, so oft halbiert, wie es noch ≥ px breit bleibt (klein flimmert es sonst, schont das Handy)
  const m = BASIS_BILD.mip[nr] || (BASIS_BILD.mip[nr] = [BASIS_BILD.img[nr]]);
  let i = 0;
  while (i < 4 && m[i].width >= 2 * px) {
    if (!m[i + 1]) { const c = document.createElement('canvas'); c.width = m[i].width >> 1; c.height = m[i].height >> 1;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(m[i], 0, 0, c.width, c.height); m[i + 1] = c; }
    i++; }
  return m[i];
}
function basisBreite(island, z) {                                              // Breite des Basis-Bilds in px, 0 = kein Bild
  const w = BASIS_BREITE * z; if (w >= BASIS_MIN_PX) return w;
  if (z < TOR_PUNKT_ZOOM) return 0;
  return islandOwnerOf(island.id) ? BASIS_MIN_PX : w >= BASIS_KLEIN_PX ? w : 0;
}
function basisKreis(isl, z) {                                                 // Basis als Bild: Mitte (dy über dem Fußpunkt) und Halbmesser für Ringe/Kuppel – sonst null
  const w = isl.type === 'tower' ? basisBreite(isl, z) : 0, im = w && basisBild(basisBildNr(baseLevelOf(isl)));
  return im ? { dy: w * im.height / im.width * .22, r: w * .42 } : null;
}
function drawBasisBild(island, ownerKey, z) {                                  // (Bildschirm) → true, wenn das Bild gezeichnet ist
  const w = basisBreite(island, z); if (!w) return false;
  const nr = basisBildNr(baseLevelOf(island)), im = basisBild(nr); if (!im) return false;
  const h = w * im.height / im.width, x = toSX(island.x), y = toSY(island.y);
  if (x + w < 0 || x - w > viewW || y + h < 0 || y - h > viewH) return true;
  ctx.drawImage(basisMip(nr, w * dpr), x - w / 2, y - h * .72, w, h);
  if ((island.id === playerIslandId || isCapital(island.id)) && brennt(island.id)) drawBrand(x, y - h * .3, w / 64);   // eine geplünderte Hauptstadt brennt
  return true;
}
// Namensschild unter jeder Basis mit Besitzer (Alexander 7.10., wie im alten Spiel; freie: nur die Stufen-Zahl, 8.10.): 70 % so breit wie das Basis-Bild, mittig direkt darunter
// (Unterkante Basis = Oberkante Schild). Auf jeder Zoomstufe mit Basis-Bild (Alexander 7.10.: nichts springt), weit nur die Stufe. Im runden Feld das Wappen
// des Besitzers, im Balken Stufe und Truppen – eigene und Bündnis die echte Zahl (sofern das Handy sie hat), fremde
// „?“ bis gespäht (wie die Fahnen, bannerModel). Text und Strich in der Besitzer-Farbe. Passt die Zahl nicht: nur die Stufe.
// Ein Schild wird je Größe (8-px-Stufen) einmal gemalt und gemerkt.
const SCHILD_ANTEIL = .7, SCHILD_MIN = 90, SCHILD_ZAHL = 96, SCHILD_ZOOM = BASIS_MIN_PX / BASIS_BREITE;   // (Truppen-Zahl erst ab 96 px Breite)
const SCHILD_FARBE = { player: '#8cc0ff', ally: '#86e09a', bot: '#ff8d82', neutral: '#eadfc4' };
const SCHILD_MERK = new Map();
function schildRect(island, z) {                                               // (Bildschirm) wo das Schild einer Basis steht
  const w = BASIS_BREITE * z, im = basisBild(basisBildNr(baseLevelOf(island))), h = im ? w * im.height / im.width : w;
  const W = Math.max(SCHILD_MIN, Math.floor(SCHILD_ANTEIL * w / 8) * 8), H = W * 159 / 512; return { x: toSX(island.x) - W / 2, y: toSY(island.y) + h * .17, w: W, h: H };   // (das Bild hat unten einen leeren Rand)
}
function schildDaten(island) {                                                 // → { art, wer, stufe, truppen }
  const m = bannerModel(island), wer = islandOwnerOf(island.id);
  const truppen = m.kind === 'ally' && islandTroops[island.id] !== undefined ? fmtCompact(islandTroops[island.id]) : m.troops;
  return { art: m.kind === 'player' || m.kind === 'ally' || m.kind === 'bot' ? m.kind : 'neutral', wer, stufe: anzeigeStufe(island.id), truppen };
}
// Rahmen als Ring ums Wappen (Merkliste 7): Saison- und Mitte-Rahmen als KI-Bild wie im Profil (Neuling trägt jeder: kein Ring)
const RAHMEN_RING = { sz1: 'champion', sz2: 'grossadmiral', sz4: 'admiral', sz6: 'kapitaen', mgut: 'mitte' }, RING_BILD = {}, RING_WER = new Map();
function ringBild(fr) {                                                        // geladenes Bild oder null (lädt beim ersten Mal)
  const n = RAHMEN_RING[fr]; if (!n) return null;
  if (!RING_BILD[fr]) { const im = RING_BILD[fr] = new Image(); im.onload = () => { SCHILD_MERK.clear(); requestRender(); }; im.src = 'bilder/ui_rahmen_' + n + '.webp'; }
  return RING_BILD[fr].complete && RING_BILD[fr].naturalWidth ? RING_BILD[fr] : null;
}
function rahmenAufKarte(who) {                                                 // angelegter Rahmen des Besitzers (je 2 s gemerkt – jedes Bild fragt danach)
  const now = Date.now(), m = RING_WER.get(who); if (m && now - m.t < 2000) return m.fr;
  let fr = null; try { fr = who === 'player' ? playerFrame() : botLook(who).frame; } catch (e) {}
  RING_WER.set(who, { fr, t: now }); return fr;
}
function schildBild(d, W, mitZahl) {                                           // das fertige Schild, W px breit (Leinwand × dpr)
  const cr = crestFor(d.wer), ring = ringBild(rahmenAufKarte(d.wer));          // (Schilde gibt es nur mit Besitzer: immer ein Wappen)
  const key = d.art + '|' + d.stufe + '|' + (mitZahl ? d.truppen : '') + '|' + crestKeyOf(cr) + '|' + (ring ? ring.src : '') + '|' + W + '|' + dpr;
  let c = SCHILD_MERK.get(key); if (c) return c;
  const H = W * 159 / 512, k = W / 512, farbe = SCHILD_FARBE[d.art];
  c = document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr); g.drawImage(KB.img.schild, 0, 0, W, H);
  drawCrest(g, 82 * k, 79 * k, 76 * k, cr);                                    // im runden Feld
  if (ring) g.drawImage(ring, 12 * k, 9 * k, 140 * k, 140 * k);                 // der Rahmen ums Wappen
  const x0 = 168 * k, x1 = 462 * k, ym = 79 * k, fs = Math.max(8, Math.min(14, Math.round(W * .1)));   // (klein: die Schrift passt in den Balken)   // der Balken innen
  g.textBaseline = 'middle'; g.font = '700 ' + fs + 'px Inter, system-ui, sans-serif';
  const lang = 'Stufe ' + d.stufe, t = mitZahl ? g.measureText(d.truppen).width + fs + 6 : 0;   // erst „Stufe 12“, wird es eng nur „12“
  const st = g.measureText(lang).width + t <= x1 - x0 ? lang : String(d.stufe), zahl = mitZahl && g.measureText(st).width + t <= x1 - x0;
  g.textAlign = zahl ? 'left' : 'center'; g.fillStyle = farbe; g.fillText(st, zahl ? x0 : (x0 + x1) / 2, ym + .5);
  if (zahl) { g.textAlign = 'right'; g.fillStyle = '#f3e6c4'; g.fillText(d.truppen, x1, ym + .5);
    drawGlyph(g, 'troops', x1 - g.measureText(d.truppen).width - fs * .55 - 2, ym, fs - 1, '#d9c9a0'); }
  if (W >= SCHILD_ZAHL) { g.strokeStyle = farbe; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, 106 * k); g.lineTo(x1, 106 * k); g.stroke(); }   // der Besitzer auf einen Blick (klein: nur die Schriftfarbe)
  if (SCHILD_MERK.size > 400) SCHILD_MERK.clear(); SCHILD_MERK.set(key, c); return c;
}
// Dichte Karte: Schilde nie übereinander. Der Reihe nach (eigene, Bündnis, fremde) – stößt eins an ein schon gesetztes, erst kleiner
// (SCHILD_KLEIN), sonst weg. Freie Basen tragen kein Schild (Alexander 8.10.: sonst sieht man die Karte nicht mehr), nur die Stufen-Zahl
// (drawStufenZahl). → [{ isl, r, d }] (auch die Tipp-Flächen, layoutBanners)
const SCHILD_KLEIN = 64, SCHILD_RANG = { player: 0, ally: 1, bot: 2 };
function basisSchilde(vis, z) {
  if (z < SCHILD_ZOOM || !KB.img.schild) return [];
  const sicht = r => r.x + r.w >= 0 && r.x <= viewW && r.y + r.h >= 0 && r.y <= viewH;
  const alle = vis.filter(i => i.type === 'tower' && islandOwnerOf(i.id)).map(isl => ({ isl, r: schildRect(isl, z), d: schildDaten(isl) }))
    .filter(s => s.d.art !== 'neutral' && sicht(s.r))
    .sort((a, b) => SCHILD_RANG[a.d.art] - SCHILD_RANG[b.d.art] || (b.isl.id === playerIslandId) - (a.isl.id === playerIslandId));
  const gesetzt = [], frei = r => !gesetzt.some(s => overlap(r, s.r) > 0);
  for (const s of alle) {
    let r = s.r;
    if (!frei(r)) { const W = Math.max(SCHILD_KLEIN, Math.floor(r.w * .7 / 8) * 8); r = { x: r.x + (r.w - W) / 2, y: r.y, w: W, h: W * 159 / 512 }; }
    if (!frei(r)) continue;
    gesetzt.push({ isl: s.isl, r, d: s.d });
  }
  return gesetzt;
}
// Freie Basen (wie Barbaren/Felder in RoK): nur ein kleines, dezentes Abzeichen mit der Stufe rechts unten am Bild – kein Schild, kein Kreis.
// Ab BASIS_MIN_PX Bildbreite (kleiner wäre es lauter als die Basis). Je Stufe und Größe einmal gemalt und gemerkt (SCHILD_MERK).
function stufenZahlBild(stufe, fs) {
  const key = 'z|' + stufe + '|' + fs + '|' + dpr; let c = SCHILD_MERK.get(key); if (c) return c;
  const t = String(stufe), font = '700 ' + fs + 'px Inter, system-ui, sans-serif'; c = document.createElement('canvas');
  let g = c.getContext('2d'); g.font = font;
  const H = fs + 4, W = Math.max(H, Math.ceil(g.measureText(t).width) + 8);
  c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr); c.cssW = W; c.cssH = H;
  g = c.getContext('2d'); g.scale(dpr, dpr); rr(g, .5, .5, W - 1, H - 1, H / 2 - .5);
  g.fillStyle = 'rgba(24,18,10,.7)'; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(234,223,196,.45)'; g.stroke();
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SCHILD_FARBE.neutral; g.fillText(t, W / 2, H / 2 + .5);
  if (SCHILD_MERK.size > 400) SCHILD_MERK.clear(); SCHILD_MERK.set(key, c); return c;
}
function stufenZahlen(vis, z) {                                               // → [{ isl, x, y, c }] (Bildschirm, linke obere Ecke) der freien Basen im Bild
  const w = BASIS_BREITE * z; if (w < BASIS_MIN_PX) return [];
  const fs = Math.max(9, Math.min(12, Math.round(w * .1))), aus = [];
  for (const isl of vis) {
    if (isl.type !== 'tower' || islandOwnerOf(isl.id)) continue;
    const im = basisBild(basisBildNr(baseLevelOf(isl))); if (!im) continue;
    const h = w * im.height / im.width, c = stufenZahlBild(anzeigeStufe(isl.id), fs);
    const x = toSX(isl.x) + w * .3 - c.cssW / 2, y = toSY(isl.y) + h * .08 - c.cssH / 2;
    if (x + c.cssW >= 0 && x <= viewW && y + c.cssH >= 0 && y <= viewH) aus.push({ isl, x, y, c });
  }
  return aus;
}
function drawBasisSchilder(vis, z) {                                          // nach allen Basen: Schilde und Stufen-Zahlen liegen obenauf
  const rs = basisSchilde(vis, z), zs = stufenZahlen(vis, z); if (!rs.length && !zs.length) return;
  setScreen(ctx);
  for (const { x, y, c } of zs) ctx.drawImage(c, Math.round(x * dpr) / dpr, Math.round(y * dpr) / dpr, c.cssW, c.cssH);
  for (const { r, d } of rs) ctx.drawImage(schildBild(d, r.w, r.w >= SCHILD_ZAHL), Math.round(r.x * dpr) / dpr, Math.round(r.y * dpr) / dpr, r.w, r.h);
}
// Alle Gebäude nur noch als KI-Bild (Alexander 8.10.: die alte 3D-Burg ist raus). Solange ein Bild noch lädt, liegt dort nur ein
// leiser Schatten; Pass-Tore ohne Bild gar nichts. Ganz weit draußen (kein Basis-Bild mehr): eigene Basen ein Punkt, freie ein Fleck.
function drawPlatzhalter(x, y, w) {
  ctx.beginPath(); ctx.ellipse(x, y, w * .32, w * .12, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,16,10,.22)'; ctx.fill();
}
function drawBuilding(island, ownerKey, z) {                                   // screen space (setScreen active)
  const x = toSX(island.x), y = toSY(island.y);
  if (island.bildR) {                                                          // Thron und Wächter-Tempel: das KI-Bild (fest in der Welt, ganz weit nie winzig)
    if (KB.fertig) heiligtumBild(island, z); else drawPlatzhalter(x, y, Math.max(HEILIGTUM_BREITE[island.type === 'megaTemple' ? 'megaTemple' : 'guardian'] * z, 30));
    return; }
  if (island.type === 'gate') {                                                // Karte wie RoK: das Pass-Tor (Bild) in der Kette, offen/zu wie heute
    if (torMitte(island)) drawTorBild(island, ownerKey !== 'neutral' && !gateSettings(island).closed, z);
    return; }
  if (drawBasisBild(island, ownerKey, z)) return;                              // Basen als KI-Bild (Stufe → Bild, alle gleich groß)
  const w = basisBreite(island, z);
  if (w) { drawPlatzhalter(x, y, w); return; }                                 // Bild lädt noch
  if (ownerKey === 'player') { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#8cc0ff'; ctx.fill(); }
  else if (ownerKey === 'neutral' && z >= TOR_PUNKT_ZOOM) { ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, island.radius * z * .3), 0, Math.PI * 2); ctx.fillStyle = 'rgba(40,30,18,.3)'; ctx.fill(); }
}
function drawBrand(x, y, u) {                                                  // Flammen auf den Dächern und Rauch, der aufsteigt
  const t = performance.now();
  ctx.save();
  for (let i = 0; i < 5; i++) {                                                 // Rauch
    const p = ((t / 2600) + i / 5) % 1, sx = x + Math.sin(i * 2.1 + p * 3) * 8 * u + p * 10 * u, sy = y - 16 * u - p * 46 * u, r = (5 + p * 14) * u;
    ctx.fillStyle = 'rgba(40,36,34,' + (.42 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [dx, dy, s] of [[-12, 2, 1], [9, -4, 1.15], [0, -12, .9], [15, 6, .8], [-5, 8, .75]]) {   // Flammen
    const f = .75 + .25 * Math.sin(t / 90 + dx * 1.7) * Math.sin(t / 133 + dy), fx = x + dx * u, fy = y + dy * u, h = 13 * s * f * u;
    const gr = ctx.createRadialGradient(fx, fy - h * .3, 0, fx, fy - h * .3, h);
    gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(.35, 'rgba(255,150,40,.75)'); gr.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(fx, fy - h * .35, h * .5, h, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore(); liveAnimation = true;
}

function bannerModel(island) {
  const owner = islandOwnerOf(island.id), isTemple = island.type === 'temple' || island.type === 'megaTemple';
  const scouted = scoutedIslands.has(island.id), level = anzeigeStufe(island.id);
  const tName = island.type === 'megaTemple' ? 'Mega-Tempel' : island.guardian ? 'Wächter-Tempel' : 'Tempel';
  const boss = bossAt(island.id);
  if (boss) return { kind: 'bot', glyph: 'attack', name: boss.name, troops: fmtCompact(boss.troops), def: null, level, temple: false, p: 4.8 };
  const tag = owner && typeof bundTagVon === 'function' ? bundTagVon(owner) : '';   // Bündnis-Kürzel: eigenes Chip vor dem Namen
  if (owner === 'player') {                                                       // eigene Basen: Name nur an der Hauptstadt (Farbe + Wappen reichen), dafür ohne Vorrang
    const cap = island.id === playerIslandId;
    return { kind: 'player', glyph: isTemple ? 'temple' : island.type === 'gate' ? 'lock' : 'crest:player:' + crestKey(),
             name: cap ? 'Hauptstadt' : '', tag: '', cap, troops: fmtCompact(islandTroops[island.id] || 0), def: null, level, temple: isTemple, p: cap || isTemple ? 4 : 3.5 };
  }
  if (owner) { const cap = botCapitalOf(owner) === island.id;
    return { kind: bundFreund('player', owner) ? 'ally' : 'bot', glyph: isTemple ? 'temple' : 'crest:' + owner, name: botById[owner].name, tag, cap,
             troops: scouted ? fmtCompact(islandTroops[island.id] || 0) : '?', def: null, level, temple: isTemple, p: cap || isTemple ? 3.2 : 3 }; }
  if (island.type === 'gate') return { kind: 'neutral', glyph: 'lock', name: island.gateKind === 'throne' ? 'Thron-Tor' : island.gateKind === 'guardian' ? 'Wächter-Tor' : 'Grenztor',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null, level, temple: false, p: 2.5 };
  return { kind: 'neutral', glyph: isTemple ? 'temple' : 'question', name: isTemple ? tName : 'Neutral',
           troops: scouted ? fmtCompact(island.neutralTroops) : '?', def: scouted ? fmtCompact(island.neutralDefense) : null,
           level, temple: isTemple, mega: island.type === 'megaTemple', p: isTemple ? 2 : 0, filler: !isTemple };
}

// Fahnen-Stufen: Breite passt sich dem Text an (tw = höchstens so breites Textfeld), Schrift mind. 11 px, Name bis 14 Zeichen;
// K (kompakt) und C nur Wappen + Stufe + Truppenzahl, N (neutral, nicht gespäht) nur Wappen + Stufe
const TIER = { A: { H: 34, av: 34, fn: 12.5, fs: 11.5, pad: 8, lv: 17, tw: 140, max: 14 },
               B: { H: 30, av: 28, fn: 11,   fs: 11,   pad: 7, lv: 16, tw: 120, max: 14 },
               K: { H: 26, av: 26, fn: 11,   fs: 12,   pad: 6, lv: 16, tw: 84,  max: 0 },
               C: { H: 22, av: 22, fn: 11,   fs: 11,   pad: 4, lv: 15, tw: 62,  max: 0 },
               N: { H: 22, av: 22, fn: 11,   fs: 11,   pad: 0, lv: 15, tw: 0,   max: 0 } };
const PLATE = { player: { top: '#2b5d9b', bot: '#183a66', line: 'rgba(140,192,255,.7)',  hi: '#8cc0ff' },
                bot:    { top: '#8e2b24', bot: '#5a1814', line: 'rgba(255,141,130,.62)', hi: '#ff8d82' },
                neutral:{ top: '#474a51', bot: '#2f3136', line: 'rgba(198,201,207,.42)', hi: '#c6c9cf' },
                ally:   { top: '#2c7a4b', bot: '#17472b', line: 'rgba(140,230,170,.62)', hi: '#8ce6aa' } };   // Bündnis-Mitglieder: grün
const trunc = (s, n) => s.length <= n ? s : s.slice(0, n - 1) + '…';
