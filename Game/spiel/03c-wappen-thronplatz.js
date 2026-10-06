// Teil 03c-wappen-thronplatz.js: Wappen und der Thronplatz in der Mitte
// ===== WAPPEN: the player's coat of arms (profile, HUD, own nameplates, battle banner) =====
var CREST_COLORS = ['#2c4a70', '#8e2a24', '#2f5a2f', '#1d1d24', '#d4a93c', '#ece6d6', '#5b2c6f'];
var CREST_SHAPES = ['heater', 'round', 'kite'], CREST_DIVS = ['plain', 'pale', 'fess', 'quarterly', 'bend', 'chevron'];
var CREST_SYMBOLS = ['none', 'star', 'attack', 'castle', 'temple', 'flag', 'crown'], CREST_INK = ['#e8c547', '#f5f0e5', '#16161c'];
var crestState = null;
function loadCrest() {
    if (crestState) return crestState;
    try { crestState = JSON.parse(store.get('openWaterCrest')) || null; } catch (e) { crestState = null; }
    return crestState = Object.assign({ shape: 0, div: 3, c1: 0, c2: 4, sym: 2, ink: 1 }, crestState || {});
}
function crestKey() { const c = loadCrest(); return [c.shape, c.div, c.c1, c.c2, c.sym, c.ink].join('.'); }
function crestPath(g, x, y, s, shape) {             // (x, y) = centre, s = height
    const w = s * .82, t = y - s / 2, b = y + s / 2; g.beginPath();
    if (shape === 'round') { g.moveTo(x - w / 2, t); g.lineTo(x + w / 2, t); g.lineTo(x + w / 2, y); g.arc(x, y, w / 2, 0, Math.PI); g.closePath(); }
    else if (shape === 'kite') { g.moveTo(x, t); g.quadraticCurveTo(x + w / 2, t, x + w / 2, t + s * .28); g.quadraticCurveTo(x + w * .4, y + s * .2, x, b); g.quadraticCurveTo(x - w * .4, y + s * .2, x - w / 2, t + s * .28); g.quadraticCurveTo(x - w / 2, t, x, t); g.closePath(); }
    else { g.moveTo(x - w / 2, t); g.lineTo(x + w / 2, t); g.lineTo(x + w / 2, y - s * .05); g.quadraticCurveTo(x + w / 2, y + s * .32, x, b); g.quadraticCurveTo(x - w / 2, y + s * .32, x - w / 2, y - s * .05); g.closePath(); }
}
function drawCrest(g, x, y, s, c) {
    c = c || loadCrest(); const shape = CREST_SHAPES[c.shape], div = CREST_DIVS[c.div], c1 = CREST_COLORS[c.c1], c2 = CREST_COLORS[c.c2];
    g.save(); crestPath(g, x, y, s, shape); g.fillStyle = c1; g.fill(); g.clip();
    const w = s * .82, L = x - w / 2, T0 = y - s / 2; g.fillStyle = c2; g.beginPath();
    if (div === 'pale') g.rect(x, T0, w / 2, s);
    else if (div === 'fess') g.rect(L, y - s * .04, w, s);
    else if (div === 'quarterly') { g.rect(x, T0, w / 2, s / 2 - s * .04); g.rect(L, y - s * .04, w / 2, s); }
    else if (div === 'bend') { g.moveTo(L, T0); g.lineTo(L + w, T0 + s); g.lineTo(L, T0 + s); g.closePath(); }
    else if (div === 'chevron') { g.moveTo(L, y + s * .3); g.lineTo(x, y - s * .12); g.lineTo(L + w, y + s * .3); g.lineTo(L + w, y + s * .55); g.lineTo(x, y + s * .12); g.lineTo(L, y + s * .55); g.closePath(); }
    if (div !== 'plain') g.fill();
    const hl = g.createLinearGradient(L, T0, L + w, T0 + s); hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(.5, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = hl; g.fillRect(L, T0, w, s);
    g.restore();
    const sym = CREST_SYMBOLS[c.sym], ink = CREST_INK[c.ink];
    if (sym === 'crown') { const cw = s * .42; g.save(); g.translate(x, y + cw * .3); g.fillStyle = ink; g.beginPath(); g.moveTo(-cw / 2, 0); g.lineTo(-cw / 2, -cw * .34); g.lineTo(-cw / 4, -cw * .16); g.lineTo(0, -cw * .62); g.lineTo(cw / 4, -cw * .16); g.lineTo(cw / 2, -cw * .34); g.lineTo(cw / 2, 0); g.closePath(); g.fill(); g.lineWidth = Math.max(.8, s * .025); g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke(); g.restore(); }
    else if (sym !== 'none') drawGlyph(g, sym, x, y - s * .02, s * .5, ink);
    crestPath(g, x, y, s, shape); g.lineWidth = Math.max(1, s * .05); g.strokeStyle = '#d8b56c'; g.stroke();
    crestPath(g, x, y, s * 1.04, shape); g.lineWidth = Math.max(.8, s * .025); g.strokeStyle = 'rgba(0,0,0,.7)'; g.stroke();
}
// Everyone has a coat of arms: yours from the editor, every other ruler their own (drawn once from their name,
// following the old rule: gold or silver on a colour, a colour on gold or silver).
const otherCrests = {};
function crestFor(who) {
    if (!who || who === 'player') return loadCrest();
    const pm = window.WELT && WELT.menschen && WELT.menschen[who]; if (pm && pm.profil && pm.profil.crest) return pm.profil.crest;   // echter Spieler: sein Wappen
    if (otherCrests[who]) return otherCrests[who];
    const idn = parseInt(String(who).replace(/\D/g, ''), 10) || 7, r = mulberry32(idn * 6151 + 3);
    const c1 = Math.floor(r() * CREST_COLORS.length), metal1 = c1 === 4 || c1 === 5;
    let c2 = metal1 ? [0, 1, 2, 3, 6][Math.floor(r() * 5)] : [4, 5][Math.floor(r() * 2)];
    const div = Math.floor(r() * CREST_DIVS.length), sym = 1 + Math.floor(r() * (CREST_SYMBOLS.length - 1));
    const ink = div === 0 ? (metal1 ? 2 : Math.floor(r() * 2)) : (metal1 ? 2 : (c2 === 4 ? 1 : 0));
    return otherCrests[who] = { shape: Math.floor(r() * CREST_SHAPES.length), div, c1, c2, sym, ink };
}
function crestKeyOf(c) { return [c.shape, c.div, c.c1, c.c2, c.sym, c.ink].join('.'); }
var crestUrlCache = {};
function crestDataUrl(px, who) {                      // for the HTML avatars (yours by default)
    const cr = crestFor(who), k = (who || 'player') + ':' + crestKeyOf(cr) + '@' + px; if (crestUrlCache[k]) return crestUrlCache[k];
    const c = document.createElement('canvas'), d = 2; c.width = c.height = px * d; const g = c.getContext('2d'); g.scale(d, d);
    drawCrest(g, px / 2, px / 2, px * .86, cr); return crestUrlCache[k] = c.toDataURL();
}
const FONT = (w, px) => w + ' ' + px + 'px Inter, system-ui, sans-serif';
function plateW(T) { return T.tw ? T.av + 4 + T.tw + T.pad : T.av + T.lv / 2; }   // feste Breite je Stufe (N: nur Wappen + Stufen-Chip)
function plateText(g, t, x, y, maxW, color) {     // mit 1px Schatten; zu breit → schmaler gesetzt, nie abgeschnitten
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(t, x, y + 1, maxW); g.fillStyle = color; g.fillText(t, x, y, maxW);
}
function paintPlate(g, T, m, withDef) {           // g translated so the plate's top-left is (0,0); returns nothing
  const o = PLATE[m.kind], W = plateW(T), H = T.H, px = T.av / 2, pw = W - T.av / 2, tx = T.av + 4, tw = T.tw;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (tw) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.top); gr.addColorStop(1, o.bot);
    rr(g, px + .5, .5, pw - 1, H - 1, 3); g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = o.line; g.stroke();          // plate
    g.strokeStyle = 'rgba(0,0,0,.55)'; rr(g, px - .5, -.5, pw + 1, H + 1, 3.5); g.stroke();                                          // 0.5px black outer line (no blur)
    g.strokeStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(px + T.av / 2, 1.5); g.lineTo(px + pw - 3, 1.5); g.stroke();    // top highlight
    const trW = (y, size) => {                                                                                                     // Zeile Truppen (+ Abwehr)
      g.font = FONT(600, size); const s = size, t1 = g.measureText(m.troops).width, d1 = withDef ? g.measureText(m.def).width : 0;
      const need = s * 1.25 + t1 + (withDef ? s * 1.95 + d1 : 0), k = Math.min(1, tw / need);
      g.save(); g.translate(tx, 0); g.scale(k, 1);
      drawGlyph(g, 'troops', s * .5, y - s * .36, s * 1.05, 'rgba(238,230,212,.78)');
      plateText(g, m.troops, s * 1.25, y, undefined, m.troops === '?' ? 'rgba(238,230,212,.62)' : '#eee6d4');
      if (withDef) { const dx = s * 1.25 + t1 + s * .7; drawGlyph(g, 'shield', dx + s * .5, y - s * .36, s * 1.05, 'rgba(238,230,212,.78)'); plateText(g, m.def, dx + s * 1.25, y, undefined, '#eee6d4'); }
      g.restore();
    };
    if (T.max) {                                                                                                                   // A/B: Zeile 1 Kürzel-Chip + Name, Zeile 2 Truppen
      const y1 = 3 + T.fn * .78, y2 = H - 3 - T.fs * .22; let nx = tx;
      if (m.tag) {
        g.font = FONT(700, 11); const cw = Math.ceil(g.measureText(m.tag).width) + 8, ch = 14, cy = y1 - 11;
        rr(g, nx, cy, cw, ch, 3); g.fillStyle = 'rgba(0,0,0,.38)'; g.fill(); g.lineWidth = 1; g.strokeStyle = o.hi; g.stroke();
        g.fillStyle = o.hi; g.fillText(m.tag, nx + 4, cy + 11); nx += cw + 4;
      }
      const name = trunc(m.name, T.max), room = tx + tw - nx; let fn = T.fn;
      g.font = FONT(600, fn); const nw = g.measureText(name).width;
      if (nw > room) { fn = Math.max(11, fn * room / nw); g.font = FONT(600, fn); }                                                  // erst kleiner (bis 11 px), dann schmaler
      plateText(g, name, nx, y1, room, '#f5f0e5');
      trW(y2, T.fs);
    } else trW(H / 2 + T.fs * .36, T.fs);                                                                                           // C: nur die Zahl
  }
  const ax = T.av / 2, ay = H / 2, ar = T.av / 2;                                                                                  // avatar medallion
  const rg = g.createRadialGradient(ax, ay - ar * .35, 1, ax, ay, ar); rg.addColorStop(0, o.top); rg.addColorStop(1, o.bot);
  g.beginPath(); g.arc(ax, ay, ar - .5, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
  g.lineWidth = 1.4; g.strokeStyle = m.temple ? '#e4c886' : o.hi; g.stroke();
  g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(ax, ay, ar + .6, 0, Math.PI * 2); g.stroke();
  if (m.glyph.startsWith('crest')) drawCrest(g, ax - 1, ay - 1, T.av * .62, crestFor(m.glyph.split(':')[1])); else
  drawGlyph(g, m.glyph, ax - 1.5, ay - 1.5, T.av * .52, '#f5f0e5');                                                                // up-left, clear of the chip
  const ls = T.lv, lx = ax + ar * .78, lyy = Math.min(ay + ar * .66, H + 1.5 - ls / 2);                                          // gold level chip on the rim
  rr(g, lx - ls / 2, lyy - ls / 2, ls, ls, 2); g.fillStyle = '#14110b'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#d8b56c'; g.stroke();
  g.fillStyle = '#f0dfb0'; g.font = FONT(700, Math.max(11, ls * .66)); g.textAlign = 'center';
  g.fillText(String(m.level), lx, lyy + 4); g.textAlign = 'left';
}

const BANNER_SPRITES = new Map();
function flushBannerSprites() { BANNER_SPRITES.clear(); }
function bannerSprite(tierKey, m) {
  const T = TIER[tierKey], withDef = m.def != null && !!T.max;
  const key = tierKey + '|' + m.kind + '|' + m.glyph + '|' + (m.tag || '') + '|' + (T.max ? m.name : '') + '|' + (T.tw ? m.troops : '') + '|' + (withDef ? m.def : '') + '|' + m.level + '|' + (m.temple ? 1 : 0) + '|' + dpr;
  let s = BANNER_SPRITES.get(key);
  if (s) { BANNER_SPRITES.delete(key); BANNER_SPRITES.set(key, s); return s; }           // LRU refresh
  const W = Math.ceil(plateW(T)), H = T.H;
  const c = document.createElement('canvas'); c.width = Math.ceil((W + 4) * dpr); c.height = Math.ceil((H + 4) * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 2 * dpr, 2 * dpr);
  paintPlate(g, T, m, withDef);
  s = { c, w: W, h: H };
  BANNER_SPRITES.set(key, s);
  while (BANNER_SPRITES.size > 400) BANNER_SPRITES.delete(BANNER_SPRITES.keys().next().value);   // (die Truppenzahl steckt im Schlüssel – 1500 hielten bis ~100 MB im Handy)
  return s;
}
const DOWN = { A: 'B', B: 'C', C: 'C', N: 'N' };
function tierFor(z) { return z >= 0.06 ? 'A' : z >= 0.026 ? 'B' : 'C'; }
let bannerHitRects = [];
function overlap(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }

// candidate slots [x shift (in half widths + 0.6 r), y mode (0 below, ±1 below nudged by 0.3 h, 2 above, 3 centred), penalty]
const BANNER_SLOTS = [[0, 0, 0], [0, 1, 12], [0, -1, 12], [0, 2, 40], [1, 3, 60], [-1, 3, 60]];
let towerRects = [];                             // screen boxes of the visible buildings (the countdown chips keep off them)
function layoutBanners(visible, z, selectedId) {  // places every nameplate (sets bannerHitRects) → items for paintBanners()
  bannerHitRects = [];
  const towers = towerRects = visible.map(isl => { const s = 2 * isl.radius * z; return { id: isl.id, x: toSX(isl.x) - s / 2, y: toSY(isl.y) - s * 0.65, w: s, h: s }; });
  if (z < TERRITORY_VIEW_ZOOM) return [];
  const base = tierFor(z);
  const items = visible.map(isl => {
    const m = bannerModel(isl);
    let p = m.p; if (isl.id === selectedId) p = 5;
    let tier = base;
    if (m.filler && isl.id !== selectedId) tier = z >= 0.1 ? DOWN[base] : m.troops === '?' ? 'N' : 'C';   // neutrale Basen ruhig: Wappen + Stufe (gespäht: + Zahl), Name erst beim Antippen/ganz nah
    if (m.mega) { if (tier === 'C') tier = 'B'; if (p < 5) p = 4.5; }                  // placed first: temple > player > bot > neutral
    return { isl, m, p, tier };
  }).sort((a, b) => b.p - a.p || a.isl.y - b.isl.y);
  const placed = [];
  for (const it of items) {
    const r = it.isl.radius * z, sx = toSX(it.isl.x), sy = toSY(it.isl.y);
    let best = null;
    for (let t = it.tier; ; t = DOWN[t]) {
      const sp = bannerSprite(t, it.m), w = sp.w, h = sp.h;
      for (const [dx, dy, cost] of BANNER_SLOTS) {                                 // below, nudged, above, beside
        const rect = { x: sx - w / 2 + dx * (w / 2 + 0.6 * r), y: dy === 2 ? sy - 1.32 * r - h : dy === 3 ? sy - h / 2 : sy + 0.95 * r + dy * 0.3 * h, w, h };
        let sc = cost;
        for (const q of placed) sc += overlap(rect, q);
        for (const tw of towers) if (tw.id !== it.isl.id) sc += 0.35 * overlap(rect, tw);
        if (!best || sc < best.sc) best = { sc, rect, sp, t };
      }
      if (best.sc <= 0.25 * best.rect.w * best.rect.h || it.p > 3 || DOWN[t] === t) break;
    }
    it.rect = best.rect; it.sp = best.sp; placed.push(best.rect);
  }
  items.reverse();                                                               // painted lowest priority first
  for (const it of items) bannerHitRects.push({ id: it.isl.id, x: it.rect.x, y: it.rect.y, w: it.rect.w, h: it.rect.h });
  return items;
}
function paintBanners(items) {
  setScreen(ctx);
  for (const it of items) {
    ctx.globalAlpha = it.m.filler ? 0.8 : 1;
    const x = Math.round(it.rect.x * dpr) / dpr, y = Math.round(it.rect.y * dpr) / dpr;
    ctx.drawImage(it.sp.c, x - 2, y - 2, it.sp.c.width / dpr, it.sp.c.height / dpr);
  }
  ctx.globalAlpha = 1;
}

function titledCapitals() {                        // capital id → title (only people who hold one)
  const out = new Map(), t = loadTitles();
  for (const x of TITLES) { const who = t.by[x.key]; if (!who) continue; const cap = who === 'player' ? playerIslandId : botCapitalOf(who); if (cap !== null && cap !== undefined) out.set(cap, x); }
  return out;
}
// ---- base effects: nothing by level any more - only titles from the middle: halo, god rays (buff) or cursed purple fire (penalty) ----
function fxCurseFlames(x, y, R, now) {
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + now / 3000, fx = x + Math.cos(a) * R, fy = y + Math.sin(a) * R * .38, fl = .7 + .3 * Math.sin(now / 90 + i * 1.9), h = R * .75 * fl;
    const gr = ctx.createLinearGradient(0, fy - h, 0, fy); gr.addColorStop(0, 'rgba(190,90,255,0)'); gr.addColorStop(.5, 'rgba(150,50,220,.75)'); gr.addColorStop(1, 'rgba(60,10,90,.9)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(fx - R * .13, fy); ctx.quadraticCurveTo(fx - R * .16, fy - h * .5, fx + Math.sin(now / 120 + i) * R * .06, fy - h); ctx.quadraticCurveTo(fx + R * .16, fy - h * .5, fx + R * .13, fy); ctx.closePath(); ctx.fill();
  }
}
// ===== THRONPLATZ: the centre of the world looks the part =====
// a paved round plaza with obelisks, paths and a slowly turning rune circle, fire bowls at the edge;
// a beacon that shows from afar; the ruler's pillar of light and god rays over the Mega-Tempel.
function drawThronePlaza(z, now) {
    if (megaTempleId === undefined || !islandSeen(islandById[megaTempleId])) return;   // (unter dem Nebel nicht)
    const m = islandById[megaTempleId], x = toSX(m.x), y = toSY(m.y), R = Math.max(10, m.radius * z * 3.4);
    if (x < -R * 2 || y < -R * 2 || x > viewW + R * 2 || y > viewH + R * 2) return;
    setScreen(ctx); ctx.save();
    const ruler = rulerOwner(), rc = ruler === 'player' ? '120,180,255' : ruler ? '255,120,100' : '255,214,120';
    if (z < 0.006) {                                      // far out: a golden beacon marks the centre
        const pulse = .6 + .4 * Math.sin(now / 600), gr = ctx.createRadialGradient(x, y, 2, x, y, 40 + 10 * pulse);
        gr.addColorStop(0, 'rgba(' + rc + ',.9)'); gr.addColorStop(.3, 'rgba(' + rc + ',.35)'); gr.addColorStop(1, 'rgba(' + rc + ',0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill(); ctx.restore(); liveAnimation = true; return;
    }
    ctx.translate(x, y); ctx.scale(1, .55);                 // plaza lies flat on the ground
    for (let i = 0; i < 4; i++) {                          // paved roads leading in from the four gates
        ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = '#8f8673'; ctx.fillRect(-R * .09, R * .9, R * .18, R * 1.6);
        ctx.fillStyle = '#b3aa94'; ctx.fillRect(-R * .07, R * .9, R * .14, R * 1.6); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(0, R * .05, R * 1.04, 0, Math.PI * 2); ctx.fill();
    const pv = ctx.createRadialGradient(0, -R * .3, R * .1, 0, 0, R);
    pv.addColorStop(0, '#d8cfb8'); pv.addColorStop(1, '#9d9480');
    ctx.fillStyle = pv; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, R * .03); ctx.strokeStyle = '#5a5244'; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,82,68,.35)'; ctx.lineWidth = 1;
    for (const f of [.35, .55, .75]) { ctx.beginPath(); ctx.arc(0, 0, R * f, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .35, Math.sin(a) * R * .35); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
    ctx.save(); ctx.rotate(now / 9000); ctx.globalCompositeOperation = 'lighter';     // rune circle turning in the paving
    ctx.strokeStyle = 'rgba(' + rc + ',.55)'; ctx.lineWidth = Math.max(1.2, R * .018); ctx.beginPath(); ctx.arc(0, 0, R * .66, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([R * .05, R * .04]); ctx.beginPath(); ctx.arc(0, 0, R * .6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.save(); ctx.translate(Math.cos(a) * R * .63, Math.sin(a) * R * .63); ctx.rotate(a);
        ctx.fillStyle = 'rgba(' + rc + ',.8)'; ctx.beginPath(); ctx.moveTo(0, -R * .025); ctx.lineTo(R * .02, 0); ctx.lineTo(0, R * .025); ctx.lineTo(-R * .02, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.restore();
    if (ruler) {                                            // god rays behind the temple while someone rules
        const r = Math.max(12, m.radius * z * 2.3); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y - r * .5); ctx.rotate(now / 5000);
        for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); const L = r * (3.2 + .6 * Math.sin(now / 500 + i)), gr = ctx.createLinearGradient(0, 0, L, 0);
            gr.addColorStop(0, 'rgba(' + rc + ',.4)'); gr.addColorStop(1, 'rgba(' + rc + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -r * .16); ctx.lineTo(L, r * .16); ctx.closePath(); ctx.fill(); }
        ctx.restore();
    }
    const ob = [];                                          // obelisks and fire bowls around the rim (upright, so not squashed)
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; ob.push({ a, ox: x + Math.cos(a) * R * .92, oy: y + Math.sin(a) * R * .92 * .55, fire: i % 2 === 0 }); }
    ob.sort((p, q) => p.oy - q.oy);
    const H = R * .32;
    for (const o of ob) {
        if (o.fire) {                                       // bronze bowl on a stand, flames
            ctx.fillStyle = '#4a3a26'; ctx.fillRect(o.ox - H * .04, o.oy - H * .5, H * .08, H * .5);
            ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.ellipse(o.ox, o.oy - H * .5, H * .16, H * .06, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const fl = .75 + .25 * Math.sin(now / 90 + o.a * 5), fh = H * .45 * fl, gl = ctx.createRadialGradient(o.ox, o.oy - H * .6, 1, o.ox, o.oy - H * .6, H * .5);
            gl.addColorStop(0, 'rgba(255,180,80,.55)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(o.ox, o.oy - H * .6, H * .5, 0, Math.PI * 2); ctx.fill();
            const fg = ctx.createLinearGradient(0, o.oy - H * .5 - fh, 0, o.oy - H * .5); fg.addColorStop(0, 'rgba(255,230,150,0)'); fg.addColorStop(.5, 'rgba(255,170,60,.9)'); fg.addColorStop(1, 'rgba(230,80,20,.95)');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(o.ox - H * .12, o.oy - H * .5); ctx.quadraticCurveTo(o.ox - H * .14, o.oy - H * .5 - fh * .5, o.ox + Math.sin(now / 110 + o.a) * H * .05, o.oy - H * .5 - fh);
            ctx.quadraticCurveTo(o.ox + H * .14, o.oy - H * .5 - fh * .5, o.ox + H * .12, o.oy - H * .5); ctx.closePath(); ctx.fill(); ctx.restore();
        } else {                                            // obelisk with a gold cap
            const og = ctx.createLinearGradient(o.ox - H * .08, 0, o.ox + H * .08, 0); og.addColorStop(0, '#e2dac6'); og.addColorStop(1, '#8a8270');
            ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(o.ox - H * .08, o.oy); ctx.lineTo(o.ox - H * .055, o.oy - H); ctx.lineTo(o.ox + H * .055, o.oy - H); ctx.lineTo(o.ox + H * .08, o.oy); ctx.closePath(); ctx.fill();
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,34,26,.8)'; ctx.stroke();
            ctx.fillStyle = '#e4c35a'; ctx.beginPath(); ctx.moveTo(o.ox - H * .055, o.oy - H); ctx.lineTo(o.ox, o.oy - H * 1.15); ctx.lineTo(o.ox + H * .055, o.oy - H); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    }
    liveAnimation = true;
}
function drawThroneFx(z, now) {                      // over the Mega-Tempel: a warm glow, and when someone rules: their pillar of light and god rays
    if (megaTempleId === undefined || z < 0.006 || !islandSeen(islandById[megaTempleId])) return;
    const m = islandById[megaTempleId], x = toSX(m.x), y = toSY(m.y), r = Math.max(12, m.radius * z * 2.3);
    if (x < -r * 6 || y < -r * 8 || x > viewW + r * 6 || y > viewH + r * 6) return;
    const ruler = rulerOwner(), rc = ruler === 'player' ? '140,195,255' : ruler ? '255,130,110' : '255,220,140';
    setScreen(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (ruler) {
        const pulse = .8 + .2 * Math.sin(now / 400), ph = r * 9, pw = r * .9;
        const pg = ctx.createLinearGradient(0, y - ph, 0, y); pg.addColorStop(0, 'rgba(' + rc + ',0)'); pg.addColorStop(.6, 'rgba(' + rc + ',' + (.3 * pulse).toFixed(2) + ')'); pg.addColorStop(1, 'rgba(' + rc + ',' + (.12 * pulse).toFixed(2) + ')');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(x - pw / 2, y - r * .9); ctx.lineTo(x - pw * .2, y - ph); ctx.lineTo(x + pw * .2, y - ph); ctx.lineTo(x + pw / 2, y - r * .9); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 12; i++) { const q = ((now / 2200) + i / 12) % 1;       // motes rising in the pillar
            ctx.fillStyle = 'rgba(255,245,210,' + (.9 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.3 + now / 600) * pw * .25, y - r * .4 - q * ph * .8, 1.2 + (1 - q) * 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else {
        const gr = ctx.createRadialGradient(x, y - r * .3, 2, x, y - r * .3, r * 1.6);
        gr.addColorStop(0, 'rgba(' + rc + ',' + (.3 + .1 * Math.sin(now / 700)).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + rc + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - r * .3, r * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); liveAnimation = true;
}
function drawBaseAuras(vis, z, now) {             // under the towers
  if (z < 0.006) return;
  setScreen(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const titled = titledCapitals(); if (!titled.size) { ctx.restore(); return; }
  for (const isl of vis) {
    const t = titled.get(isl.id); if (!t || isl.type !== 'tower') continue;
    const x = toSX(isl.x), y = toSY(isl.y), r = Math.max(20, isl.radius * z * 1.25);
    if (x < -r * 5 || x > viewW + r * 5 || y < -r * 5 || y > viewH + r * 5) continue;
    if (t && t.good) {                             // god rays behind the base
      ctx.save(); ctx.translate(x, y - r * .6); ctx.rotate(now / 3500);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); const L = r * (3.6 + .5 * Math.sin(now / 400 + i)), gr = ctx.createLinearGradient(0, 0, L, 0);
        gr.addColorStop(0, 'rgba(255,236,160,.7)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -r * .28); ctx.lineTo(L, r * .28); ctx.closePath(); ctx.fill(); }
      ctx.restore(); liveAnimation = true;
    } else if (t) {                                 // cursed: a dark vortex on the ground
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y + r * .3); ctx.scale(1, .38); ctx.rotate(-now / 900);
      const gr = ctx.createRadialGradient(0, 0, r * .2, 0, 0, r * 2.2); gr.addColorStop(0, 'rgba(40,0,60,.75)'); gr.addColorStop(1, 'rgba(40,0,60,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(170,80,255,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (1 + i * .45), i, i + 4); ctx.stroke(); }
      ctx.restore(); liveAnimation = true;
    }
  }
  ctx.restore();
}
function drawBaseSparks(vis, z, now) {            // over the towers
  if (z < 0.006) return;
  setScreen(ctx); const shOwn = shieldedOwners(Date.now());
  const titled = titledCapitals();
  for (const isl of vis) {
    if (!islandOwnerOf(isl.id)) continue;
    const t = titled.get(isl.id), x = toSX(isl.x), y = toSY(isl.y), r = Math.max(20, isl.radius * z * 1.25);
    if (x < -r * 5 || x > viewW + r * 5 || y < -r * 6 || y > viewH + r * 5) continue;
    const shOw = islandOwnerOf(isl.id);
    if (shOwn.has(shOw) && shieldCovers(isl)) { const r = isl.radius * z;                                               // Friedensschild: a pale dome over every base of its owner
      const R = Math.max(r * 1.45, 16), ph = .6 + .4 * Math.sin(now / 700 + isl.id);
      const gd = ctx.createRadialGradient(x, y - R * .2, R * .3, x, y - R * .2, R);
      gd.addColorStop(0, 'rgba(210,235,255,.12)'); gd.addColorStop(.7, 'rgba(190,225,255,' + (.28 * ph).toFixed(2) + ')'); gd.addColorStop(1, 'rgba(230,245,255,' + (.6 * ph).toFixed(2) + ')');
      ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(x, y - R * .2, R, 0, Math.PI * 2); ctx.fill();
      ring(x, y - R * .2, R + 1, 5, 'rgba(10,30,60,.35)');
      ring(x, y - R * .2, R, 2.6, 'rgba(225,242,255,' + (.75 + .25 * ph).toFixed(2) + ')');
      ctx.strokeStyle = 'rgba(255,255,255,' + (.5 * ph).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - R * .2, R * .82, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();   // glint
      if (shOw !== 'player' && botById[shOw]) ring(x, y - R * .2, R + 3, 1.5, botById[shOw].color);   // whose shield it is
      liveAnimation = true;
    }
    if (isl.type !== 'tower' || !t) continue;                                                       // title effects: towers only (nothing by level)
    if (t.good) for (let i = 0; i < 8; i++) { const ph = ((now / 1700) + i / 14) % 1, a = i * 2.4;   // golden sparks rising
        ctx.fillStyle = 'rgba(255,226,140,' + (0.95 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.1 + Math.sin(now / 300 + i) * 2, y - r * .2 - ph * r * 3.2, 1.2 + (1 - ph) * 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (t.good) {                                  // a golden halo floating over the base
      const hy = y - r * 2.9 + Math.sin(now / 500) * 2;
      ctx.save(); ctx.translate(x, hy); ctx.scale(1, .32);
      ctx.strokeStyle = 'rgba(255,230,150,.95)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,230,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r * .9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } else {                                        // cursed purple fire and smoke
      fxCurseFlames(x, y + r * .3, r * 1.35, now);
      for (let i = 0; i < 6; i++) { const ph = ((now / 2400) + i / 6) % 1;
        ctx.fillStyle = 'rgba(60,20,70,' + (0.5 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 1.7 + now / 800) * r * .5, y - r * 1.2 - ph * r * 3, r * (.3 + ph * .5), 0, Math.PI * 2); ctx.fill(); }
    }
    liveAnimation = true;
  }
}
function drawTitleBadges(z, now) {                // the title's name over the titled capital
  if (z < 0.004) return;
  setScreen(ctx);
  for (const [id, t] of titledCapitals()) {
    const isl = islandById[id]; if (!isl || !islandSeen(isl)) continue;
    const x = toSX(isl.x), y = toSY(isl.y) - Math.max(26, isl.radius * z * 2.6);
    if (x < -60 || x > viewW + 60 || y < -30 || y > viewH + 30) continue;
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    const w = ctx.measureText(t.name).width + 28;
    rr(ctx, x - w / 2, y - 10, w, 20, 10); ctx.fillStyle = t.good ? 'rgba(40,32,8,.92)' : 'rgba(40,8,14,.92)'; ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = t.good ? '#e8c877' : '#e0605a'; ctx.stroke();
    drawGlyph(ctx, t.good ? 'star' : 'losses', x - w / 2 + 11, y, 11, t.good ? '#f3d98a' : '#ff9d90');
    ctx.fillStyle = t.good ? '#f6e7bd' : '#ffd0c9'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t.name, x - w / 2 + 20, y + .5);
  }
}
function ring(x, y, R, w, color, dash, offset) {
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.lineWidth = w; ctx.strokeStyle = color;
  ctx.setLineDash(dash || []); ctx.lineDashOffset = offset || 0; ctx.stroke(); ctx.setLineDash([]);
}
function ringBadge(x, y, b, st) {                  // the title's sign on top of the ring: a crown (good title, ruler) or a skull (penalty)
  ctx.beginPath(); ctx.arc(x, y, b + 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(10,8,4,.85)'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = st.c0; ctx.stroke();
  ctx.fillStyle = st.k === 'bad' ? '#f1e6dc' : '#ffd25a';
  if (st.k === 'bad') { ctx.beginPath(); ctx.arc(x, y - b * .12, b * .55, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - b * .32, y + b * .2, b * .64, b * .38);
    ctx.fillStyle = 'rgba(10,8,4,.95)'; ctx.beginPath(); ctx.arc(x - b * .22, y - b * .1, b * .14, 0, Math.PI * 2); ctx.arc(x + b * .22, y - b * .1, b * .14, 0, Math.PI * 2); ctx.fill(); }
  else { const w = b * .7, h = b * .55; ctx.beginPath(); ctx.moveTo(x - w, y + h * .6); ctx.lineTo(x - w, y - h * .5); ctx.lineTo(x - w * .45, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w * .45, y); ctx.lineTo(x + w, y - h * .5); ctx.lineTo(x + w, y + h * .6); ctx.closePath(); ctx.fill(); }
}
function drawRings(visible, z, now) {
  setScreen(ctx); const rankOf = ringStatusByOwner();
  const pulse = .5 + .5 * Math.sin(now / 280);
  const attackTarget = pendingAttackTargetId !== null ? islandById[pendingAttackTargetId] : null;
  for (const isl of visible) {
    const x = toSX(isl.x), y = toSY(isl.y), r = isl.radius * z, S = Math.max(r * 1.28 + 3, 12);
    const isOwned = ownedIslands.has(isl.id);
    const isTemple = isl.type === 'temple' || isl.type === 'megaTemple';
    if (isTemple && z >= 0.006) {
      ring(x, y, Math.max(r * 1.25, 8), 1.5, 'rgba(228,200,134,.85)'); ring(x, y, Math.max(r * 1.5, 11), 1, 'rgba(228,200,134,.35)');
      if (isl.type === 'megaTemple' && r >= 20) { ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2;
        ctx.moveTo(x + Math.cos(a) * r * 1.44, y + Math.sin(a) * r * 1.44); ctx.lineTo(x + Math.cos(a) * r * 1.52, y + Math.sin(a) * r * 1.52); }
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(228,200,134,.7)'; ctx.stroke(); }
    }
    if (isl.type === 'tower' && z >= 0.006) {                                  // ring round every base: a title from the middle or a bought Ring-Skin (see ringStatusByOwner)
      const o = islandOwnerOf(isl.id), st = o ? rankOf.get(o) : null;
      if (st && st.k === 'skin') {                                                  // a bought Ring-Skin: one plain thin ring - quiet, so the title rings stand out
        const R1 = Math.max(r * 1.35, 21); ring(x, y, R1, 3.6, 'rgba(10,8,4,.45)'); ring(x, y, R1, 1.8, st.c0);
      } else if (st) {                                                                // a title from the middle: bold double ring with notches + a badge (crown, or skull for a penalty)
        const R1 = Math.max(r * 1.35, 21), R2 = R1 + Math.max(r * .28, 5), W = 3.4;
        ring(x, y, R1, W + 2.5, 'rgba(10,8,4,.55)'); ring(x, y, R1, W, st.c0);          // dark underlay so the ring reads on grass and territory
        ring(x, y, R2, 3, 'rgba(10,8,4,.35)'); ring(x, y, R2, 1.4, st.c1);
        if (st.n) { const spin = st.spin ? now / 4000 : 0;                             // notches like the mega temple
          ctx.beginPath(); for (let i = 0; i < st.n; i++) { const a = i / st.n * Math.PI * 2 + spin;
            ctx.moveTo(x + Math.cos(a) * R1 * 1.07, y + Math.sin(a) * R1 * 1.07); ctx.lineTo(x + Math.cos(a) * R2 * .97, y + Math.sin(a) * R2 * .97); }
          ctx.lineWidth = 2; ctx.strokeStyle = st.c0; ctx.stroke(); if (st.spin) liveAnimation = true; }
        if (st.pulse) { const p2 = (now / 1800) % 1; ctx.globalAlpha = .8 * (1 - p2); ring(x, y, R2 + p2 * Math.max(r * .6, 12), 2, st.c0); ctx.globalAlpha = 1; liveAnimation = true; }
        if (st.dash) { ring(x, y, R2 + 5, 2, st.dash, [8, 5], -now / 40); liveAnimation = true; }
        if (R1 >= 18) ringBadge(x, y - R2 - 1, Math.min(13, Math.max(9, r * .22)), st);
      }
    }
    if (isl.id === playerIslandId && z >= 0.006) {                            // the capital: blue-gold double ring
      ring(x, y, Math.max(r * 1.55, 12), 2, 'rgba(228,200,134,.95)'); ring(x, y, Math.max(r * 1.8, 15), 1.2, 'rgba(140,192,255,.6)', [3, 4]);
    }
    if (teleportMode && isOwned && isl.id !== playerIslandId && isl.type === 'tower') ring(x, y, S, 2, 'rgba(228,200,134,' + (.45 + .55 * pulse).toFixed(2) + ')', [4, 4]);
    const isSelectable = (attackTarget && isOwned && canReach(isl.landmassId, attackTarget.landmassId)) ||
                         (pendingSendFromId !== null && isOwned && isl.id !== pendingSendFromId);
    if (isSelectable) ring(x, y, S, 2, 'rgba(255,255,255,' + (.45 + .55 * pulse).toFixed(2) + ')', [4, 4]);
    else if (isl.id === pendingSendFromId || (multiAttackMode && isl.id === multiAttackSourceId)) ring(x, y, S, 2.5, '#e4c886');
    else if (multiAttackMode && multiAttackTargets.includes(isl.id)) {
      ring(x, y, S, 2, '#b98cf0');
      const bx = x + Math.cos(-Math.PI / 4) * S, by = y + Math.sin(-Math.PI / 4) * S;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fillStyle = '#5b3a8c'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#b98cf0'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 9px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(multiAttackTargets.indexOf(isl.id) + 1), bx, by + .5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else if (multiAttackMode && multiAttackSourceId !== null && !isOwned &&
               canReach(isl.landmassId, islandById[multiAttackSourceId].landmassId))
      ring(x, y, S, 1.5, 'rgba(185,140,240,' + (.8 * (.45 + .55 * pulse)).toFixed(2) + ')', [4, 5]);
    if (isl.id === popupIslandId && isPanelOpen(popup)) {
      if (popupView === 'preview') ring(x, y, S, 2, '#ff8d82', [6, 4], -now / 60);
      else { ring(x, y, S, 2, '#e4c886'); ring(x, y, S + 5, 1, 'rgba(228,200,134,.35)'); }
    }
    if (isl.id === previewSourceId && popupView === 'preview' && isPanelOpen(popup)) ring(x, y, S, 2.5, '#e4c886');
  }
}

const MARCH_STYLE = { attack: ['#ff8d82', [7, 6], 'attack'], incoming: ['#ff8d82', [7, 6], 'bot'], send: ['#8cc0ff', [7, 6], 'send'],
                      scout: ['#e4c886', [3, 6], 'scout'], retreat: ['#f2a066', [5, 5], 'recall'], enemyScout: ['#ff9f7a', [3, 6], 'scout'] };
let marchTokens = [], liveAnimation = false;
function marchPath(source, target) {             // source → over every bridge on the route → target
  const path = [{ x: source.x, y: source.y }];
  if (source.landmassId !== target.landmassId) {
    const route = routeFor(source.landmassId, target.landmassId, islandOwnerOf(source.id) || 'player') || [source.landmassId, target.landmassId];
    for (let i = 0; i < route.length - 1; i++) {
      const br = bridgeBetween(route[i], route[i + 1]); if (!br) continue;
      const sA = br.a === route[i];
      path.push(sA ? { x: br.x1, y: br.y1 } : { x: br.x2, y: br.y2 }, sA ? { x: br.x2, y: br.y2 } : { x: br.x1, y: br.y1 });
    }
  }
  path.push({ x: target.x, y: target.y });
  return felsenPfad(path);                       // um die Berge herum (01f; Schalter aus: unverändert)
}
function drawMarchLine(type, source, target, startedAt, resolveAt, now, pathOverride, mk, who) {   // who: whose column (their Marsch-Skin); yours by default
  if (!source || !target) return;
  if (!startedAt) startedAt = resolveAt - MIN_ATTACK_SECONDS * 1000;
  const total = resolveAt - startedAt, progress = total > 0 ? Math.min(1, Math.max(0, (now - startedAt) / total)) : 1;
  const pts = (pathOverride || marchPath(source, target)).map(p => ({ x: toSX(p.x), y: toSY(p.y) }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  if (Math.max(...xs) < -20 || Math.min(...xs) > viewW + 20 || Math.max(...ys) < -20 || Math.min(...ys) > viewH + 20) return;
  liveAnimation = true;
  const [col, dash, glyphName] = MARCH_STYLE[type];
  setScreen(ctx); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); };
  trace(); ctx.setLineDash([]); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(6,8,12,.55)'; ctx.stroke();
  trace(); ctx.setLineDash(dash); ctx.lineDashOffset = -(now / 40) % 26; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]);
  const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); seg.push(l); tot += l; }
  // placed in drawMarchTokens(), after the nameplates, so the token can start past the source's own plate
  const own = type !== 'incoming' && type !== 'enemyScout'; if (who === undefined) who = own ? 'player' : null;
  marchTokens.push({ pts, seg, tot, progress, r: (source.radius || 0) * mapState.zoom, srcId: source.id, key: type + source.id + '>' + target.id + '@' + resolveAt, col, glyph: glyphName, own, mk: mk || null, secs: Math.max(0, Math.ceil((resolveAt - now) / 1000)),
                    who, sk: who && glyphName !== 'scout' ? marchSkinOf(who) : null });
}
function marchPointAt(m, d) {                   // screen point at path distance d
  for (let i = 0; i < m.seg.length; i++) { if (d <= m.seg[i] || i === m.seg.length - 1) { const t = m.seg[i] > 0 ? Math.min(1, Math.max(0, d / m.seg[i])) : 1;
    return { x: m.pts[i].x + (m.pts[i + 1].x - m.pts[i].x) * t, y: m.pts[i].y + (m.pts[i + 1].y - m.pts[i].y) * t }; } d -= m.seg[i]; }
  return m.pts[0];
}
