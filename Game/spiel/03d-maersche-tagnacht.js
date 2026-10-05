// Teil 03d-maersche-tagnacht.js: Märsche auf der Karte (Spur, Fahne, Skins) und Tag und Nacht
// Marsch-Skins on the map: a trail behind the column and a small flag with the owner's crest (one cached bitmap per owner + skin)
var marchFlagCache = new Map();
function marchFlag(g, x, y, sk, who) {                   // (x, y) = the token's centre; the pole stands on its upper right
  const cr = crestFor(who), key = (who || '') + '|' + sk.id + '|' + crestKeyOf(cr); let c = marchFlagCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = 72; c.height = 84; const q = c.getContext('2d'); q.scale(3, 3);
    q.strokeStyle = '#2a241b'; q.lineWidth = 1.4; q.beginPath(); q.moveTo(2, 27); q.lineTo(2, 1.5); q.stroke();
    q.fillStyle = sk.flag; q.beginPath(); q.moveTo(2.5, 2); q.lineTo(20, 2); q.lineTo(17, 8.5); q.lineTo(20, 15); q.lineTo(2.5, 15); q.closePath(); q.fill();
    q.lineWidth = .8; q.strokeStyle = 'rgba(10,8,4,.7)'; q.stroke(); drawCrest(q, 10, 8.6, 10, cr);
    if (marchFlagCache.size > 200) marchFlagCache.clear(); marchFlagCache.set(key, c); }
  g.drawImage(c, x + 3, y - 26, 24, 28);
}
function marchTrail(g, at, d0, sk, t, k) {               // at(d) → point on the path; d0 = where the trail starts (behind the token)
  if (!sk || !sk.trail) return; g.save(); g.fillStyle = sk.trail; g.strokeStyle = sk.trail; g.lineWidth = 1.1 * k;
  for (let i = 0; i < 10; i++) { const ph = (t / 45) % 7, d = d0 - (i * 7 + ph) * k; if (d < 0) break;
    const p = at(d), q = at(d + 2), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, w = Math.sin(i * 2.3 + t / 260) * 2.2 * k;
    const x = p.x - dy / l * w, y = p.y + dx / l * w, f = 1 - (i + ph / 7) / 10; g.globalAlpha = Math.max(0, f) * (sk.fx === 'smoke' ? .45 : .85);
    if (sk.fx === 'spark') { const r = (1 + f * 1.6) * k; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); }
    else if (sk.fx === 'leaf') { g.beginPath(); g.ellipse(x, y, 1.9 * k, 1 * k, i + t / 400, 0, Math.PI * 2); g.fill(); }
    else if (sk.fx === 'ember') { const r = (.7 + f) * k; g.fillRect(x - r, y - r - (1 - f) * 3 * k, r * 2, r * 2); }
    else { g.beginPath(); g.arc(x, y, (sk.fx === 'smoke' ? 1.6 + (1 - f) * 2.6 : .9 + f * 1.1) * k, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}
function drawMarchColumn(m, t) {                  // a short column of soldiers (pairs) trailing the token along its path
  const k = Math.max(1, Math.min(2, mapState.zoom / 0.02)), n = 8, gap = 8.5 * k;
  for (let i = n - 1; i >= 0; i--) {
    const d = m.d - 11 * k - Math.floor(i / 2) * gap; if (d < 0) continue;
    const p = marchPointAt(m, d), q = marchPointAt(m, d + 2), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    const side = i % 2 ? 1 : -1, ox = -dy / l * 3.4 * k * side, oy = dx / l * 3.4 * k * side;
    const x = p.x + ox, y = p.y + oy, bob = Math.abs(Math.sin(t / 110 + i * 1.7)) * 1.1 * k, fx = dx / l >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 3.4 + bob / k, 2.8, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(-1.7, -3.4, 3.4, 6);                   // body
    ctx.fillStyle = m.col; ctx.fillRect(fx > 0 ? 0.8 : -2.6, -2.8, 1.8, 3.6);        // shield in the troop colour
    ctx.beginPath(); ctx.arc(0, -4.7, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#aab2bc'; ctx.fill();   // helmet
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-fx * 1.3, 0.8); ctx.lineTo(fx * 2.4, -8.5); ctx.stroke();   // spear
    ctx.restore();
  }
}
const hitsAny = (r, list, e) => list.some(q => r.x < q.x + q.w + e && q.x < r.x + r.w + e && r.y < q.y + q.h + e && q.y < r.y + r.h + e);
function drawMarchTokens() {                      // drawn BEFORE the nameplates: a token slides along its path (up to 60 px)
  setScreen(ctx);                                 // to a spot clear of every plate; when there is none, the plate covers it
  const box = p => ({ x: p.x - 9, y: p.y - 9, w: 18, h: 18 });
  for (const m of marchTokens) {
    const plate = bannerHitRects.find(q => q.id === m.srcId);                   // leave the source base (tower + plate) visible
    let off = Math.min(m.tot * .5, m.r + 10);
    if (plate) while (off < m.tot * .5 && hitsAny(box(marchPointAt(m, off)), [plate], 1)) off += 2;
    const d0 = off + (m.tot - off) * m.progress; let d = d0;
    if (hitsAny(box(marchPointAt(m, d0)), bannerHitRects, 1))
      for (let k = 3; k <= 60; k += 3) {
        if (d0 + k <= m.tot && !hitsAny(box(marchPointAt(m, d0 + k)), bannerHitRects, 1)) { d = d0 + k; break; }
        if (d0 - k >= off && !hitsAny(box(marchPointAt(m, d0 - k)), bannerHitRects, 1)) { d = d0 - k; break; } }
    const p = marchPointAt(m, d); m.x = p.x; m.y = p.y; m.d = d;
  }
  const cols = mapState.zoom >= 0.006, t = performance.now();
  for (const m of marchTokens) if (m.sk && m.sk.trail) { const k = Math.max(1, Math.min(2, mapState.zoom / 0.02)); marchTrail(ctx, d => marchPointAt(m, d), m.d - (cols && m.glyph !== 'scout' ? 38 * k : 9), m.sk, t, k); }   // the skin's trail behind the column
  for (const m of marchTokens) if (cols && m.glyph !== 'scout') drawMarchColumn(m, t);
  for (const m of marchTokens) {
    ctx.beginPath(); ctx.arc(m.x, m.y, 7.5, 0, Math.PI * 2); ctx.fillStyle = '#141820'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = m.col; ctx.stroke();
    drawGlyph(ctx, m.glyph, m.x, m.y, 10, m.col);
    if (m.sk && cols) marchFlag(ctx, m.x, m.y, m.sk, m.who);                  // the flag with the owner's crest
  }
}
const CHIP_SLOTS = [0, -20, 20, -40, 40, -60, 60].flatMap(dy => [[1, dy], [-1, dy]])          // beside the cluster, then above / below;
  .concat([-10, 10, -30, 30, -50, 50, -80, 80].flatMap(dy => [[1, dy], [-1, dy]]),                                    // in between; further out
          [0, -20, 20, -40, 40].flatMap(dy => [[2, dy], [-2, dy]]), [0, -20, 20, -40, 40].flatMap(dy => [[3, dy], [-3, dy]]));
let chipDigit = null;                             // the widest digit: chips reserve the width of their widest label
let chipSlotOf = new Map();                       // cluster key → slot used last frame (a chip only moves when that slot gets blocked)
// Tap your own marching column (Späher, Lager, Sammler too): small buttons pop up beside it - on the way Zurück + Schneller (gems), heim nur Schneller.
var selMarch = null, marchBtnRects = [];
function drawMarchButtons() {
  marchBtnRects = [];
  if (!selMarch) return;
  const m = marchTokens.find(t => t.mk === selMarch);
  if (!m || m.x === undefined) { selMarch = null; return; }
  setScreen(ctx);
  const list = [pendingAttacks, pendingSends, pendingRetreats, pendingScouts, eigeneFeldBarb()].find(l => l.some(x => marchKeyOf(x) === selMarch)), mm = list && list.find(x => marchKeyOf(x) === selMarch);
  if (!mm) { selMarch = null; return; }
  const btns = (list !== pendingRetreats && !mm.back ? [{ act: 'recall', glyph: 'recall', label: 'Zurück' }] : []).concat([{ act: 'speed', glyph: 'hourglass', label: (gemsArmed('marsch:' + selMarch) ? 'Wirklich? ' : 'Schneller · ') + speedUpCost(mm) }]);
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  const ws = btns.map(b => ctx.measureText(b.label).width + 34 + (b.act === 'speed' ? 14 : 0)), total = ws.reduce((a, b) => a + b, 0) + 8 * (btns.length - 1);
  let x = Math.max(8, Math.min(viewW - total - 8, m.x - total / 2)); const y = Math.max(8, m.y - 74);
  btns.forEach((b, i) => { const w = ws[i];
    rr(ctx, x, y, w, 32, 16); ctx.fillStyle = 'rgba(14,12,10,.94)'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = b.act === 'speed' ? '#e4c886' : '#f2a066'; ctx.stroke();
    drawGlyph(ctx, b.glyph, x + 16, y + 16, 15, '#f3e6c4');
    ctx.fillStyle = '#f3e6c4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(b.label, x + 28, y + 16.5);
    if (b.act === 'speed') drawGlyph(ctx, 'gem', x + w - 14, y + 16, 12, '#7fd0ff');
    marchBtnRects.push({ act: b.act, x, y, w, h: 32 }); x += w + 8; });
  ctx.strokeStyle = 'rgba(228,200,134,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2); ctx.stroke();   // ring round the chosen column
}
function marchTapAt(sx, sy) {                     // → true when the tap was meant for a column or its buttons
  const b = marchBtnRects.find(r => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h);
  if (b && selMarch) { const k = selMarch; if (b.act === 'recall') { recallMarch(k); selMarch = null; } else speedUpMarch(k); requestRender(); return true; }
  const t = marchTokens.filter(m => m.mk && m.x !== undefined).map(m => ({ m, d: Math.hypot(m.x - sx, m.y - sy) })).filter(o => o.d < 22).sort((a, c) => a.d - c.d)[0];
  if (t) { selMarch = selMarch === t.m.mk ? null : t.m.mk; requestRender(); return true; }
  if (selMarch) { selMarch = null; requestRender(); }
  return false;
}
function drawMarchChips() {                       // after the nameplates: one chip per cluster of tokens, "×n" when merged
  setScreen(ctx);
  const far = mapState.zoom < 0.006;             // zoomed far out only the player's own
  const on = marchTokens.filter(m => (m.own || !far) && m.x > 0 && m.x < viewW && m.y > 0 && m.y < viewH);
  const root = on.map((_, i) => i), find = i => root[i] === i ? i : (root[i] = find(root[i]));
  for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++)   // chains of tokens < 34 px apart merge (own and incoming apart)
    if (on[i].own === on[j].own && Math.hypot(on[i].x - on[j].x, on[i].y - on[j].y) < 34) root[find(j)] = find(i);
  const byRoot = new Map();
  on.forEach((m, i) => { const r = find(i), g = byRoot.get(r);
    if (!g) { byRoot.set(r, { key: m.key, sx: m.x, sy: m.y, l: m.x, r: m.x, n: 1, secs: m.secs }); return; }
    g.n++; g.secs = Math.min(g.secs, m.secs); g.sx += m.x; g.sy += m.y; g.l = Math.min(g.l, m.x); g.r = Math.max(g.r, m.x); if (m.key < g.key) g.key = m.key; });
  const clusters = [...byRoot.values()].sort((a, b) => a.key < b.key ? -1 : 1);   // a steady order → steady slots
  for (const c of clusters) c.y = c.sy / c.n;
  const lastSlot = chipSlotOf; chipSlotOf = new Map();
  if (!clusters.length) return;
  ctx.font = '600 10.5px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  if (!chipDigit) chipDigit = [...'0123456789'].reduce((w, d) => ctx.measureText(d).width > ctx.measureText(w).width ? d : w, '0');
  const label = c => marschUhr(c.secs) + (c.n > 1 ? '  ×' + c.n : '');
  const tokens = marchTokens.map(m => ({ x: m.x - 8.5, y: m.y - 8.5, w: 17, h: 17 }));
  const towers = towerRects.map(t => ({ x: t.x + t.w * .2, y: t.y + t.h * .1, w: t.w * .6, h: t.h * .8 }));
  const screen = { x: 0, y: 0, w: viewW, h: viewH }, placed = [];
  const width = c => Math.ceil(ctx.measureText(label(c).replace(/\d/g, chipDigit)).width) + 22;   // steady from second to second
  const slot = (c, i) => { const [side, dy] = CHIP_SLOTS[i], tw = width(c);
    const gap = [0, 11, 34, 60][Math.abs(side)], r = { x: side > 0 ? c.r + gap : c.l - gap - tw, y: c.y - 9 + dy, w: tw, h: 18 }, e = { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 };
    let over = r.w * r.h - overlap(r, screen), hard = over, soft = 0;                // hard: within 2 px of a plate or a chip, or off screen
    for (const q of bannerHitRects) { hard += overlap(e, q); over += overlap(r, q); }    // over: really on top of one
    for (const q of placed) { hard += overlap(e, q.rect); over += overlap(r, q.rect); }
    for (const q of tokens) soft += 3 * overlap(e, q);
    for (const q of towers) soft += overlap(e, q);
    if (over < 0.5) over = 0; if (hard < 0.5) hard = 0;                                  // (float residue of the area sums)
    return { i, r, over, hard, soft, sc: (over > 0 ? 1e6 : 0) + (hard > 0 ? 1e5 : 0) + 50 * hard + soft }; };   // on a plate / off screen only when no slot avoids it
  const place = (c, s) => { c.rect = s.r; chipSlotOf.set(c.key, s.i); placed.push(c); };
  const rest = [];
  const bestSlot = c => { let best = null;
    for (let i = 0; i < CHIP_SLOTS.length; i++) { const s = slot(c, i); if (!best || s.sc < best.sc) best = s; if (s.sc === 0) break; }
    return best; };
  for (const c of clusters) {                     // a chip keeps last frame's slot (hysteresis) while it is not on a plate, a chip or
    const s = lastSlot.has(c.key) ? slot(c, lastSlot.get(c.key)) : null;   // the screen edge and does not hide most of a token
    if (s && s.over === 0 && s.soft < 1200) place(c, s); else rest.push(c);
  }
  for (const c of rest) {                         // others: the first free slot; none free → the least bad one (over a tower rather than
    if (!lastSlot.has(c.key)) { place(c, bestSlot(c)); continue; }   // a plate); a chip that had to leave its slot takes the nearest good one
    const p = slot(c, lastSlot.get(c.key)).r; let best = null, bs = Infinity;
    for (let i = 0; i < CHIP_SLOTS.length; i++) { const s = slot(c, i), v = s.sc + 20 * Math.hypot(s.r.x - p.x, s.r.y - p.y); if (v < bs) { bs = v; best = s; } }
    place(c, best);
  }
  for (const c of placed) {
    c.rect.x = Math.max(2, Math.min(viewW - c.rect.w - 2, c.rect.x)); c.rect.y = Math.max(2, Math.min(viewH - 20, c.rect.y));   // never cut by the edge
    const { x, y, w } = c.rect;
    rr(ctx, x, y, w, 18, 3); ctx.fillStyle = 'rgba(10,12,16,.86)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(212,176,102,.4)'; ctx.stroke();
    drawGlyph(ctx, 'hourglass', x + 8, y + 9, 10, '#e4c886'); ctx.fillStyle = '#eee6d4'; ctx.fillText(label(c), x + 16, y + 12.8);
  }
}

function ownerKeyOf(isl) { const o = islandOwnerOf(isl.id); return o === 'player' ? 'player' : o ? 'bot' : 'neutral'; }
function visibleIslands(view) {
  const out = [];
  for (const lm of landmasses) {
    if (lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b) continue;
    if (!isExplored(lm.id)) continue;                                              // under the fog
    for (const isl of islandsByLandmass[lm.id] || []) {
      if (!islandSeen(isl)) continue;
      const pad = isl.radius * 2.2;
      if (isl.x + pad < view.l || isl.x - pad > view.r || isl.y + pad < view.t || isl.y - pad > view.b) continue;
      out.push(isl);
    }
  }
  return out;
}


// ===== TAG UND NACHT (Paket C) – nur Optik, keine Spielwirkung =====
// Die Karte folgt der Uhrzeit in Berlin – nach der Uhr des Servers (welt.js merkt sich den Unterschied zur Handy-Uhr:
// WELT.uhrVersatz; geht das Handy falsch, zählt die Server-Uhr). Sonnenauf-/-untergang nach der Jahreszeit (grob für
// Berlin). Am Tag nichts, abends Abendrot, nachts dunkler (eine Fläche, „multiplizieren“) mit Lichtern an Basen und
// Burgen und leuchtender Lava; morgens Morgenrot. Billig: Werte nur alle 20 s neu, Leucht-Bilder fertig gemalt, kein
// eigenes Neuzeichnen (die Karte malt in Ruhe ohnehin jede Sekunde), mit „Akku sparen“ weniger Lichter.
const TN = { at: 0, v: null, fmt: null, glow: {} };
function serverJetzt() { const v = window.WELT && WELT.uhrVersatz; return Date.now() + (Math.abs(v) > 90000 ? v : 0); }
function berlinZeit(t) {                            // → { h: Stunde mit Bruchteil, doy: Tag im Jahr, utc: Stunden vor UTC }
  const d = new Date(t);
  try { const f = TN.fmt || (TN.fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', month: 'numeric', day: 'numeric' }));
    const p = {}; for (const x of f.formatToParts(d)) p[x.type] = parseInt(x.value, 10);
    const h = p.hour + p.minute / 60; return { h, doy: (p.month - 1) * 30.44 + p.day, utc: ((Math.round(h - d.getUTCHours() - d.getUTCMinutes() / 60) % 24) + 24) % 24 }; }
  catch (e) { return { h: d.getHours() + d.getMinutes() / 60, doy: d.getMonth() * 30.44 + d.getDate(), utc: 1 }; }
}
function tagLicht() {                               // → { n: Nacht 0…1, r: Morgen-/Abendrot 0…1, farbe (zum Multiplizieren), licht: Lampen 0…1 }
  const now = performance.now(), test = window.__testStunde;
  if (TN.v && now - TN.at < 20000 && test === undefined) return TN.v;
  const b = berlinZeit(serverJetzt()), h = typeof test === 'number' ? test : b.h;
  const mittag = 12.2 + (b.utc === 2 ? 1 : 0), halb = (12.2 + 4.6 * Math.cos(2 * Math.PI * (b.doy - 172) / 365)) / 2;   // Sommer ~16,8 Std. Tag, Winter ~7,6
  const nach = h < mittag ? mittag - halb - h : h - mittag - halb;                // Stunden nach Sonnenuntergang / vor Sonnenaufgang (< 0: Tag)
  const s = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const n = s((nach + .25) / 1.5), r = Math.max(0, 1 - Math.abs(nach + .15) / 1.1) * (1 - n * .7);
  const mix = (a, c, t) => a.map((v, i) => v + (c[i] - v) * t);
  const col = mix(mix([255, 255, 255], [255, 192, 148], r), [72, 88, 148], n);
  TN.v = { n, r, licht: s((nach + .1) / .8), farbe: 'rgb(' + col.map(Math.round).join(',') + ')' }; TN.at = now;
  return TN.v;
}
function tnGlow(art) {                              // fertiges Leucht-Bild (warm: Fenster/Fackeln, lava: rot-orange)
  if (TN.glow[art]) return TN.glow[art];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (art === 'lava') { gr.addColorStop(0, 'rgba(255,170,60,.95)'); gr.addColorStop(.35, 'rgba(240,80,20,.55)'); gr.addColorStop(1, 'rgba(200,30,0,0)'); }
  else if (art === 'fackel') { gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(.25, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); }
  else { gr.addColorStop(0, 'rgba(255,214,140,.75)'); gr.addColorStop(.5, 'rgba(255,170,80,.28)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (TN.glow[art] = c);
}
function drawNacht(vis, z, view) {                  // nach den Gebäuden, vor den Namensschildern (die bleiben gut lesbar)
  const L = tagLicht(); if (L.n < .02 && L.r < .02) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.farbe; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (L.licht > .03) {
    setScreen(ctx); ctx.globalCompositeOperation = 'lighter';
    let rest = akkuSparen ? 160 : 1400;                                           // höchstens so viele Lichter pro Bild
    const lava = tnGlow('lava'), warm = tnGlow('warm'), fackel = tnGlow('fackel');
    for (const lm of landmasses) {                                                // leuchtende Lava im Vulkan
      if (lm.bio !== 'volcano' || lm.bbox.r < view.l || lm.bbox.l > view.r || lm.bbox.b < view.t || lm.bbox.t > view.b || !isExplored(lm.id)) continue;
      if (!lm.lava) lm.deko;                                                      // (baut die Lava-Liste, falls die Region noch nie gemalt wurde)
      for (const [x, y, r] of lm.lava || []) { if (rest-- <= 0) break; if (akkuSparen && r < 800 && z < .01) continue;
        const R = Math.max(3, r * z * 2.2), sx = toSX(x), sy = toSY(y); if (sx < -R || sx > viewW + R || sy < -R || sy > viewH + R) continue;
        ctx.globalAlpha = L.licht * .9; ctx.drawImage(lava, sx - R, sy - R, R * 2, R * 2); } }
    for (const isl of vis) {                                                      // Fenster und Fackeln an Basen, Burgen und Tempeln
      if (rest <= 0) break;
      const ow = islandOwnerOf(isl.id); if (!ow && isl.type === 'tower') continue;                     // leere Basen bleiben dunkel
      const size = 2 * isl.radius * z * 1.5 * (isl.type === 'tower' ? 1 : 1.3), x = toSX(isl.x), y = toSY(isl.y);
      if (x < -size * 2 || x > viewW + size * 2 || y < -size * 2 || y > viewH + size * 2) continue;
      rest--; ctx.globalAlpha = L.licht * (ow ? 1 : .6);
      const R = Math.max(4, size * .75); ctx.drawImage(warm, x - R, y - size * .2 - R, R * 2, R * 2);
      if (size >= 18 && !akkuSparen) { const f = Math.max(3, size * .16);                             // zwei Fackeln am Tor
        for (const dx of [-.4, .4]) ctx.drawImage(fackel, x + dx * size - f, y + size * .08 - f, f * 2, f * 2); }
    }
  }
  ctx.restore();
}
function drawMap() {
  const now = performance.now(), wallNow = Date.now();
  const z = mapState.zoom;                                                       // viewW/viewH are owned by sizeBackingStore() (§6)
  const view = { l: -mapState.offsetX / z, t: -mapState.offsetY / z, r: (viewW - mapState.offsetX) / z, b: (viewH - mapState.offsetY) / z };
  const viewPad = { l: view.l - ISLAND_RADIUS * 2, t: view.t - ISLAND_RADIUS * 2, r: view.r + ISLAND_RADIUS * 2, b: view.b + ISLAND_RADIUS * 2 };
  liveAnimation = false; marchTokens = [];
  const shake = mapBattleShake(now); if (shake) { mapState.offsetX += shake.x; mapState.offsetY += shake.y; }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const dirty = ownershipDelta();                                                 // what a capture can have changed
  refreshTerritory();                                                            // rebuild only chunks whose ownership changed
  if (dirty && BG.valid) for (const d of dirty) repaintBackgroundRect(d);        // partial repaints, clipped (no full re-render)
  drawBackground();                                                              // 1-4: sea, land, bridges, territory
  drawFog(view, now);
  drawWorldFrame();                                                            // Nebel des Krieges over unexplored islands
  const vis = visibleIslands(viewPad);
  drawRings(vis, z, now);                                                        // 5
  for (const a of pendingAttacks) { if (a.attackerBotId && islandOwnerOf(a.targetId) !== 'player') continue;         // fog of war (unchanged)
    if (a.fightEndsAt) continue;                                                                                     // the fight is on - the battle shows it
    drawMarchLine(a.attackerBotId ? 'incoming' : 'attack', islandById[a.sourceId], islandById[a.targetId], a.startedAt, a.resolveAt, wallNow, null, a.attackerBotId ? null : marchKeyOf(a), a.attackerBotId || 'player'); }
  for (const s of pendingSends) {
    if (s.senderBotId) {                                                     // fremde Märsche: nur Bündnis-Mitglieder, die zu DIR kommen (Rally, Hilfe, Verstärkung) – sonst Nebel wie bisher
      if (!bundFreund(s.senderBotId, 'player') || (!s.back && islandOwnerOf(s.toId) !== 'player')) continue;   // (auch ihre Rückwege nach Hause – z. B. nach einer gemeinsamen Rally)
      drawMarchLine(s.back ? 'retreat' : 'send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, null, s.senderBotId); continue; }
    drawMarchLine('send', islandById[s.fromId], islandById[s.toId], s.startedAt, s.resolveAt, wallNow, null, marchKeyOf(s)); }
  for (const s of pendingScouts) drawMarchLine('scout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow, null, marchKeyOf(s));   // (antippen: Zurück/Schneller wie jeder Marsch)
  for (const s of botScoutsOnMap) drawMarchLine('enemyScout', islandById[s.sourceId], islandById[s.targetId], s.startedAt, s.resolveAt, wallNow);   // a bot's scout coming to look at you
  for (const r of pendingRetreats) drawMarchLine('retreat', islandById[r.fromId], islandById[r.toId], r.startedAt, r.resolveAt, wallNow, r.path, marchKeyOf(r));   // 6
  setScreen(ctx);
  if (typeof bundKarteUnten === 'function') bundKarteUnten(vis, z);                                                    // Bündnis-Gebiet: zart in der Bündnisfarbe
  drawBaseAuras(vis, z, now);                                                                                          // level + title auras under the towers
  drawThronePlaza(z, now);                                                                                             // the Thronplatz around the Mega-Tempel
  drawResFields(now, wallNow);                                                                                          // gold mines and gem veins
  drawBarb(now, wallNow); drawEvents(now, wallNow);                                                                                               // Barbaren-Lager, the Tagesboss and the columns on their way
  drawArmies(now, wallNow);                                                                                             // your armies out in the open
  for (const isl of vis.slice().sort((a, b) => a.y - b.y)) drawBuilding(isl, ownerKeyOf(isl), z);                    // 7
  drawThroneFx(z, now);
  drawBaseSparks(vis, z, now);
  drawWander(now);                                                                                                     // the Kriegsherr and his host
  drawNacht(vis, z, viewPad);                                                                                          // Paket C: Abendrot, Nacht, Lichter
  if (typeof drawHaendler === 'function') drawHaendler();                                                              // Paket C: der Karren des wandernden Händlers (haendler.js)
  const plates = layoutBanners(vis, z, isPanelOpen(popup) ? popupIslandId : null);
  drawMarchTokens();                                                                                                   // 8 tokens (clear of the plates)
  paintBanners(plates);                                                                                                // 9 nameplates on top
  drawArmyCamps(now);                                                                                                  // armies camping in the field
  drawRulerCrowns(plates);
  drawTitleBadges(z, now);                                                                                             // crown on the ruler's plates
  drawWander(now, true);
  drawMarchChips();                                                                                                    // 10 countdown chips
  drawMarchButtons();
  drawPasses(view, now);                                                                                               // chained, time-locked bridges
  drawPickups(now);                                                                                                    // 11 mini-event pickups
  drawMapBattles(now);                                                                                                 // fights playing out at the bases
  drawThroneShots(now);                                                                                                // the Wächter-Tempel firing on the throne
  drawMarkers();                                                                                                       // your own Wegmarken
  if (typeof bundKarteOben === 'function') bundKarteOben(z, now);                                                      // Bündnis: Signale und Rally-Fahnen
  drawBattleFx(now);                                                                                                   // 13 battle flashes + "Sieg!"
  if (shake) { mapState.offsetX -= shake.x; mapState.offsetY -= shake.y; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

