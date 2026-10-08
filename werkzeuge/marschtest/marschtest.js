// Marsch-Testdatei (Merkliste 23, Vorgabe design_marsch.md): wie Marsch und Angriff auf der Karte aussehen sollen – NOCH NICHT im Spiel.
// Karte = Karten-Testdatei (kartentest.js zeichnet auf #karte, nur bei Kamera-Änderung), hier oben drauf eine zweite Zeichenfläche
// #marsch, die jedes Bild neu malt: Märsche (Sechseck-Kopf, Namensband, Lebensbalken, Pfeilketten), Kampf (Kreis, Säule, Geschosse,
// fliegende Verluste), Sieg/Niederlage, Rückweg, Zurückrufen, Rally, Späher, Sammeln, Feind auf dich zu. Daten erfunden, nur Anzeige:
// der Kampf spielt ein fertiges Ergebnis ab (Verluste über die Dauer verteilt), keine Spielregel.
'use strict';
(() => {
const D = MARSCH_DATEN, ov = document.getElementById('marsch'), g = ov.getContext('2d');
const $ = id => document.getElementById(id);
const NF = new Intl.NumberFormat('de-DE'), NF_C = new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 });
function fmtCompact(n) {                              // wie im Spiel (01a): bis 100.000 genau, dann „412 Tsd.“, „12,4 Mio.“, „16,8 Bio.“
  const a = Math.abs(n);
  if (a < 100000) return NF.format(Math.round(n));
  if (a < 1e6) return NF.format(Math.floor(n / 100) / 10) + ' Tsd.';
  return NF_C.format(n);
}
const uhr = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ===== Farben je Seite (Tokens aus spielseite/01) =====
const FARBE = {
  eigen: { haupt: '#3f86d8', hell: '#8cc0ff', dunkel: '#16365c' },
  bund: { haupt: '#5cbf62', hell: '#a6e6a0', dunkel: '#1f4a22' },
  feind: { haupt: '#c9423a', hell: '#ff8d82', dunkel: '#52150f' },
  barb: { haupt: '#80848c', hell: '#c8ccd2', dunkel: '#34373c' },
  rally: { haupt: '#eab24a', hell: '#f0dfb0', dunkel: '#795823' },
};
const BILD_SEITE = { eigen: 'eigen', bund: 'bund', feind: 'feind', barb: 'feind' };   // Barbaren: rotes Bild, im Code entsättigt
const RAHMEN = { eigen: 'eigen', bund: 'bund', feind: 'feind', barb: 'feind', rally: 'gold' };
const HELDEN = ['aldric', 'bernhard', 'brunhild', 'bruno', 'eskil', 'fenn', 'greta', 'hagen', 'ida', 'kasimir', 'lene', 'mira', 'nora', 'otto', 'pia', 'ragna', 'sigrun', 'thora', 'wolfram', 'yrsa'];

// ===== Bilder: marsch_* (KI-Blatt, hier im Ordner bilder/), Köpfe, Beute, Basen und Knopf-Zeichen aus Game/bilder =====
const MARSCH = ['band_niederlage', 'band_sieg', 'fahne_leer', 'geschoss_pfeil', 'geschoss_pfeil_feuer', 'geschoss_stein', 'kampf_kreis', 'kampf_saeule',
  'rahmen_bund', 'rahmen_eigen', 'rahmen_feind', 'rahmen_gold', 'ring_gold', 'sieg_blitz', 'spaeher', 'trupp_rally', 'trupp_sammler', 'zeichen_warnung', 'zeichen_zurueck',
  ...['eigen', 'bund', 'feind'].flatMap(s => ['runter', 'hoch', 'kampf', 'verletzt'].map(a => `trupp_${s}_${a}`))].map(n => 'marsch_' + n);
const SPIEL = [...HELDEN.map(h => `held_${h}_kopf`), 'beute_muenzen', 'beute_holz', 'beute_beschleuniger',
  ...Array.from({ length: 15 }, (_, i) => 'basis_' + String(i + 1).padStart(2, '0')),
  'ui_sym_rolle', 'ui_sym_rueckzug', 'ui_sym_rally', 'ui_sym_schwert', 'ui_sym_spaeher'];
const BILD = {};
let bilderOffen = MARSCH.length + SPIEL.length;
const quelle = (n, pfad) => typeof ALLE_BILDER !== 'undefined' ? ALLE_BILDER[n] : pfad + n + '.webp';
for (const [liste, pfad] of [[MARSCH, MARSCH_BILD_PFAD], [SPIEL, SPIEL_BILD_PFAD]]) for (const n of liste) {
  const im = new Image(); im.onload = () => { BILD[n] = im; if (!--bilderOffen) { MERK.clear(); neu(); } };   // (vorgemalte Köpfe ohne Bild neu)
  im.onerror = () => { --bilderOffen; }; im.src = quelle(n, pfad); }

// Vorgemalte Teile (je Größe einmal): Köpfe, Namensbänder, getönte/entsättigte Bilder – spart pro Bild viel Arbeit (Handy ≥ 30 Bilder/s)
const MERK = new Map();
function merk(key, w, h, malen) {
  let c = MERK.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr); malen(x, w, h); c.w = w; c.h = h; MERK.set(key, c); return c;
}
function getoent(n, seite) {                           // Barbaren: Bild entsättigt · Fahne: in Seitenfarbe getönt
  const im = BILD[n]; if (!im) return null;
  return merk('t|' + n + seite, im.width / dpr, im.height / dpr, (x, w, h) => {
    x.drawImage(im, 0, 0, w, h);
    x.globalCompositeOperation = n === 'marsch_fahne_leer' ? 'multiply' : 'saturation';
    x.fillStyle = n === 'marsch_fahne_leer' ? FARBE[seite].haupt : 'rgba(128,128,128,.85)'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0, w, h); });
}
function sechseckPfad(x, cx, cy, w, h) { x.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; x.lineTo(cx + w / 2 * Math.cos(a), cy + h / 2 * Math.sin(a)); } x.closePath(); }
function kopfBild(a, w) {                              // Sechseck-Kopf: Rahmen der Seite, darin rund der Held (oder Fahne mit Kürzel)
  const h = w * 50 / 44, held = heldAn && a.held, rahmen = 'marsch_rahmen_' + RAHMEN[a.rally ? 'rally' : a.seite];
  return merk(`k|${held}|${a.seite}|${a.rally}|${w}|${a.kuerzel}`, w + 4, h + 6, (x) => {
    const cx = w / 2 + 2, cy = h / 2 + 2, r = w * .41;
    x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 4; x.shadowOffsetY = 2;
    sechseckPfad(x, cx, cy, w * .92, h * .92); x.fillStyle = '#10141c'; x.fill(); x.restore();
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
    if (held && BILD[`held_${held}_kopf`]) x.drawImage(BILD[`held_${held}_kopf`], cx - r, cy - r, 2 * r, 2 * r);
    else { x.fillStyle = FARBE[a.seite].dunkel; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      const f = getoent('marsch_fahne_leer', a.seite); if (f) x.drawImage(f, cx - r * .9, cy - r * .85, r * 1.8, r * 1.8 * f.h / f.w);
      x.font = `800 ${Math.round(w * .2)}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      x.fillText(a.kuerzel || '', cx + r * .05, cy - r * .2); }
    x.restore();
    const im = a.seite === 'barb' && !a.rally ? getoent(rahmen, 'barb') : BILD[rahmen];
    if (im) x.drawImage(im, 2, 2, w, h); });
}
function band(text, farbe, px) {                        // Namensband „[NW]Alex“ in Seitenfarbe hell auf dunkel
  return merk(`b|${text}|${farbe}|${px}`, text.length * px * .62 + 12, px + 5, (x, w, h) => {
    x.font = `700 ${px}px Inter, system-ui, sans-serif`; const tw = x.measureText(text).width;
    x.fillStyle = 'rgba(10,12,16,.78)'; x.beginPath(); x.roundRect((w - tw - 12) / 2, 0, tw + 12, h, 8); x.fill();
    x.fillStyle = farbe; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + .5); });
}

// ===== Zustand =====
let jetzt = 0, tempo = 1, nacht = false, heldAn = true, seite = 'eigen', naechsteId = 1, gewaehlt = null;
const armeen = [], kaempfe = [], effekte = [];
const ziele = [...D.basen, D.lager, D.feld];
const basis = id => D.basen.find(b => b.id === id);
const TEMPO = 1500;                                    // Welt-Einheiten je Sekunde (Nah: eine Stadt zur nächsten ≈ 20 s)
const KUERZEL = { eigen: 'NW', bund: 'NW', feind: 'RX', barb: '' };
function armee(o) {
  const a = Object.assign({ id: naechsteId++, art: 'marsch', phase: 'hin', t0: jetzt, spiegel: 1, verlust: 0, zurueck: false, beute: null }, o);
  a.kuerzel = KUERZEL[a.seite]; a.start = rand(a.von, a.ziel); a.truppen0 = a.truppen0 || a.truppen;
  a.dauer = a.dauer || Math.hypot(a.ziel.x - a.von.x, a.ziel.y - a.von.y) / TEMPO;
  armeen.push(a); return a;
}
function halt(a) {                                     // wo die Armee am Ziel stehen bleibt: vor der Basis/dem Lager, auf ihrer Ankunftsseite
  const z = a.ziel, dx = a.start.x - z.x, dy = a.start.y - z.y, d = Math.hypot(dx, dy) || 1, r = z.art === 'feld' ? 0 : z.art === 'lager' ? 9000 : 7500;
  return { x: z.x + dx / d * r, y: z.y + dy / d * r };
}
function rand(b, q) {                                 // Trupp zeigt sich erst am Burgrand (Richtung q), nicht mitten auf der Burg
  const r = b.art === 'basis' ? 3600 : b.art === 'lager' ? 5000 : 0, dx = q.x - b.x, dy = q.y - b.y, d = Math.hypot(dx, dy) || 1;
  return { x: b.x + dx / d * r, y: b.y + dy / d * r };
}
function pos(a) {                                      // Weltpunkt der Armee jetzt
  if (a.phase === 'hin') { const h = halt(a), f = Math.min(1, (jetzt - a.t0) / a.dauer); return { x: a.start.x + (h.x - a.start.x) * f, y: a.start.y + (h.y - a.start.y) * f }; }
  if (a.phase === 'rueck') { const f = Math.min(1, (jetzt - a.t0) / a.dauer); return { x: a.ab.x + (a.heim.x - a.ab.x) * f, y: a.ab.y + (a.heim.y - a.ab.y) * f }; }
  return a.steht || halt(a);
}
function rest(a) { return a.phase === 'hin' || a.phase === 'rueck' ? a.dauer - (jetzt - a.t0) : a.phase === 'sammelt' ? a.ende - jetzt : 0; }
function heimwaerts(a, zurueck) {                      // Rückweg ab hier (Zurückrufen: sofort, weiße Fahne)
  const p = pos(a); a.ab = p; a.heim = rand(a.von, p); a.phase = 'rueck'; a.t0 = jetzt; a.zurueck = !!zurueck;
  a.dauer = Math.max(1, Math.hypot(a.heim.x - p.x, a.heim.y - p.y) / TEMPO);
}

// ===== Kampf: fertiges Ergebnis, Verluste in Wellen (je Welle eine Zahl; Summe = Verlust) =====
function kampf(a, sieg) {
  const z = a.ziel, d0 = z.truppen, a0 = a.truppen;
  const aV = Math.round(a0 * (sieg ? .18 : .72)), dV = Math.round(d0 * (sieg ? (z.art === 'lager' ? 1 : .64) : .21));
  const k = { a, z, t0: jetzt, dauer: 6.5, sieg, a0, d0, aV, dV, wellen: [], zahlen: [], geschosse: [], funken: [], naechst: { a: 0, d: .15 } };
  for (const [s, v] of [['a', aV], ['d', dV]]) {    // 8 Wellen je Seite, Gewichte zufällig, gerundet, Rest in die letzte: nie „-0“
    const n = Math.max(1, Math.min(8, v)), w = Array.from({ length: n }, () => .5 + Math.random()), sw = w.reduce((x, y) => x + y, 0);
    let summe = 0;
    w.forEach((x, i) => { const m = i === n - 1 ? v - summe : Math.max(1, Math.round(v * x / sw)); summe += m;
      k.wellen.push({ t: .4 + (i + (s === 'd' ? .5 : 0)) * (k.dauer - 1.2) / n, s, n: m }); });
  }
  k.wellen = k.wellen.filter(w => w.n > 0).sort((x, y) => x.t - y.t);
  a.phase = 'kampf'; a.kampf = k; a.steht = halt(a); kaempfe.push(k); return k;
}
function kampfStand(k, s) { const t = jetzt - k.t0; return k.wellen.filter(w => w.s === s && w.t <= t).reduce((x, w) => x + w.n, 0); }
function kampfEnde(k) {
  const a = k.a; kaempfe.splice(kaempfe.indexOf(k), 1);
  a.truppen = k.a0 - k.aV; k.z.truppen = k.d0 - k.dV; a.kampf = null; a.verletzt = !k.sieg;
  if (a.seite === 'eigen' || a.rally) effekte.push({ art: k.sieg ? 'sieg' : 'niederlage', t0: jetzt, ziel: k.z,
    text: k.sieg ? (k.z.art === 'lager' ? `Barbaren-Lager Stufe ${k.z.stufe} besiegt` : `Burg von ${k.z.name.replace(/^\[\w+\]/, '')} erobert`) : `Angriff auf ${k.z.name.replace(/^\[\w+\]/, '')} abgewehrt` });
  if (k.sieg) { effekte.push({ art: 'blitz', t0: jetzt, ziel: k.z }); a.beute = { bild: 'beute_muenzen', n: Math.round(k.dV * 3.2) }; }
  if (a.rally) a.rally.mitglieder.forEach(m => { m.truppen = Math.round(m.truppen * a.truppen / k.a0); });
  heimwaerts(a);
}

// ===== Testknöpfe =====
const HEIM = { eigen: 'eigen', bund: 'mira', feind: 'sturm', barb: null };
function ziel(s, art) {                                // wohin die Seite marschiert
  if (art === 'sammeln') return D.feld;
  if (s === 'eigen') return basis('kevin');
  if (s === 'bund') return D.lager;
  return basis('eigen');                               // Feind und Barbaren: auf dich zu
}
function von(s) { return s === 'barb' ? D.lager : basis(HEIM[s]); }
function heldVon(s) { return { eigen: 'aldric', bund: 'mira', feind: 'ragna', barb: null }[s]; }
function name(s) { return { eigen: '[NW]Alex', bund: '[NW]Mira_7', feind: '[RX]Sturmfaust', barb: 'Barbaren' }[s]; }
function blickAuf(p, q) { if (stufeJetzt() === 'ganz weit') return; cam.x = (p.x + q.x) / 2; cam.y = (p.y + q.y) / 2; begrenzen(); neu(); }
const ZUSTAND = {
  marsch() { const v = von(seite), z = ziel(seite, 'marsch'); armee({ seite, von: v, ziel: z, held: heldVon(seite), name: name(seite), truppen: seite === 'barb' ? 640000 : v.truppen }); blickAuf(v, z); },
  sammeln() { const v = von(seite === 'barb' ? 'eigen' : seite), s = seite === 'barb' ? 'eigen' : seite;
    armee({ seite: s, art: 'sammeln', von: v, ziel: D.feld, held: heldVon(s), name: name(s), truppen: 1.8e6 }); blickAuf(D.feld, { x: (v.x + D.feld.x) / 2, y: (v.y + D.feld.y) / 2 }); },
  spaeher() { const s = seite === 'barb' ? 'eigen' : seite, v = von(s), z = s === 'feind' ? basis('eigen') : basis('kevin');
    armee({ seite: s, art: 'spaeher', von: v, ziel: z, name: name(s), truppen: 1, dauer: Math.hypot(z.x - v.x, z.y - v.y) / (TEMPO * 1.8) }); blickAuf(v, z); },
  rally() { rallyStarten(); },
  kampf() { schnellKampf(Math.random() < .6); },
  sieg() { schnellKampf(true); },
  niederlage() { schnellKampf(false); },
  zurueck() { const a = [...armeen].reverse().find(x => x.seite === 'eigen' && x.phase === 'hin' && !x.beitritt);
    if (a) return heimwaerts(a, true);
    const b = armee({ seite: 'eigen', von: basis('eigen'), ziel: basis('kevin'), held: 'aldric', name: '[NW]Alex', truppen: 12.4e6 }); b.rufen = jetzt + 2.5; },
};
function schnellKampf(sieg) {                          // eigene Armee kurz vor dem Ziel: gleich Kampf, Ergebnis wie gewünscht
  const v = basis('eigen'), z = seite === 'bund' ? D.lager : basis('kevin');
  const a = armee({ seite: seite === 'bund' ? 'bund' : 'eigen', von: seite === 'bund' ? basis('mira') : v, ziel: z, held: seite === 'bund' ? 'mira' : 'aldric',
    name: seite === 'bund' ? '[NW]Mira_7' : '[NW]Alex', truppen: sieg ? 12.4e6 : 4.2e6 });
  a.t0 = jetzt - a.dauer + 1.2; a.sieg = sieg; z.truppen = z.truppen0 = z.truppen0 || z.truppen; blickAuf(z, z);
}
function rallyStarten() {                              // Anführer sammelt an seiner Burg, 3 Bündnis-Märsche kommen dazu, dann Rally-Marsch zu Kevin
  const v = basis('eigen'), z = basis('kevin');
  const r = armee({ seite: 'eigen', art: 'rally', von: v, ziel: z, held: 'aldric', name: '[NW]Alex', truppen: 12.4e6, phase: 'sammelt', steht: { x: v.x + 4800, y: v.y + 1800 } });
  r.rally = { mitglieder: [{ name: '[NW]Alex', held: 'aldric', truppen: 12.4e6 }], platz: 10 }; r.ende = jetzt + 18;
  [['mira', 'mira', 3.6e6], ['bjarne', 'bruno', 2.9e6], [null, 'greta', 9.1e6]].forEach(([b, h, t], i) => {
    const q = i === 2 ? { x: v.x + 15000, y: v.y + 12000 } : basis(b);
    armee({ seite: 'bund', von: q, ziel: { x: r.steht.x, y: r.steht.y, art: 'feld' }, held: h, name: i === 2 ? '[NW]Tilda' : basis(b).name, truppen: t,
      beitritt: r, dauer: 5 + i * 3.5 }); });
  blickAuf(v, z);
}
function gedraenge() {                                 // 12 Armeen + 2 Kämpfe (Leistung: Bilder/s oben rechts)
  const M = D.mitte, rnd = (a, b) => a + Math.random() * (b - a), seiten = ['eigen', 'bund', 'feind', 'barb'];
  for (let i = 0; i < 12; i++) { const s = seiten[i % 4], w = i / 12 * Math.PI * 2, r = rnd(14000, 26000);
    const v = { x: M.x + Math.cos(w) * r, y: M.y + Math.sin(w) * r * .9 }, z = ziele[(i * 5) % ziele.length];
    const a = armee({ seite: s, art: i % 6 === 5 ? 'sammeln' : 'marsch', von: v, ziel: i % 6 === 5 ? D.feld : z, held: s === 'barb' ? null : HELDEN[i % HELDEN.length],
      name: s === 'barb' ? 'Barbaren' : `[${KUERZEL[s]}]${['Ole', 'Jana_2', 'Wolf', 'Kai', 'Tilda', 'Rune', 'Ben_88', 'Sina', 'Ivo', 'Lara', 'Mats', 'Edda'][i]}`,
      truppen: Math.round(Math.exp(rnd(Math.log(120000), Math.log(16.8e12)))) });
    a.t0 = jetzt - a.dauer * rnd(.05, .6); a.ohneKampf = true; }
  schnellKampf(true); seite = 'bund'; schnellKampf(true); seite = $('seite').dataset.s || 'eigen';
  zoomStufe('mittel', D.mitte.x, D.mitte.y); zoomText();
}

// ===== Ablauf je Bild =====
function schritt(dt) {
  jetzt += dt * tempo;
  for (const a of [...armeen]) {
    if (a.rufen && jetzt >= a.rufen && a.phase === 'hin') { a.rufen = 0; heimwaerts(a, true); }
    const z = a.ziel;
    if (a.phase === 'hin' && jetzt - a.t0 >= a.dauer) {
      if (a.beitritt) { const r = a.beitritt; r.rally.mitglieder.push({ name: a.name, held: a.held, truppen: a.truppen }); r.truppen += a.truppen; r.truppen0 = r.truppen; armeen.splice(armeen.indexOf(a), 1); continue; }
      if (a.art === 'spaeher') { effekte.push({ art: 'licht', t0: jetzt, ziel: z }); heimwaerts(a); continue; }
      if (a.art === 'sammeln') { a.phase = 'sammelt'; a.steht = { x: z.x, y: z.y + 900 }; a.ende = jetzt + 14; a.feld0 = z.rest; continue; }
      if (a.ohneKampf) { heimwaerts(a); continue; }
      if (a.art === 'rally' && !a.angekommen) { a.angekommen = jetzt; effekte.push({ art: 'pfeile', t0: jetzt, ziel: z }); }
      if (a.art !== 'rally' || jetzt - a.angekommen > 1.5) kampf(a, a.sieg !== undefined ? a.sieg : a.truppen > z.truppen * 1.2);
    }
    if (a.phase === 'sammelt' && a.art === 'sammeln') { const f = Math.min(1, 1 - (a.ende - jetzt) / 14); z.rest = Math.round(a.feld0 - 86400 * f);
      if (jetzt >= a.ende) { a.beute = { bild: 'beute_holz', n: 86400 }; heimwaerts(a); } }
    if (a.phase === 'sammelt' && a.art === 'rally' && jetzt >= a.ende) { a.phase = 'hin'; a.t0 = jetzt; a.start = { x: a.steht.x, y: a.steht.y }; a.steht = null;
      a.dauer = Math.hypot(z.x - a.start.x, z.y - a.start.y) / (TEMPO * .8); a.angekommen = 0; }
    if (a.phase === 'rueck' && jetzt - a.t0 >= a.dauer) armeen.splice(armeen.indexOf(a), 1);
  }
  for (const k of [...kaempfe]) if (jetzt - k.t0 >= k.dauer) kampfEnde(k);
  for (let i = effekte.length - 1; i >= 0; i--) if (jetzt - effekte[i].t0 > ({ sieg: 2.85, niederlage: 2.85, blitz: .8, licht: 1, pfeile: 1.5 })[effekte[i].art]) effekte.splice(i, 1);
  if (gewaehlt && !armeen.includes(gewaehlt)) waehlen(null);
}

// ===== Zeichnen =====
const S = () => W >= 700 ? 1.25 : 1;                   // Desktop: alle Pixelwerte ×1,25
function stufeJetzt() { const z = cam.z, k = W >= 700 ? 1.5 : 1; return z >= .016 * k ? 'nah' : z >= .007 * k ? 'mittel' : z >= BILD_ZOOM ? 'weit' : 'ganz weit'; }
const MASS = { nah: { trupp: 56, kopf: 44, linie: 3, pfeil: 18 }, mittel: { trupp: 36, kopf: 32, linie: 2, pfeil: 14 }, weit: { punkt: 8, kopf: 20, linie: 1.5 }, 'ganz weit': { punkt: 6, linie: 1 } };
const P = p => ({ x: sx(p.x), y: sy(p.y) });
const zuMir = a => (a.seite === 'feind' || a.seite === 'barb') && a.ziel === basis('eigen') && a.phase === 'hin';
const sichtbar = (a, st) => st !== 'ganz weit' || a.seite === 'eigen' || zuMir(a);
function farbeVon(a) { return FARBE[a.rally && a.art === 'rally' ? 'rally' : a.seite]; }

function pfeilkette(p, q, farbe, breit, abstand, alpha, phase, versatz = 0) {   // ››› von p nach q, wandert mit 40 px/s
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy); if (L < 4) return;
  const ux = dx / L, uy = dy / L, nx = -uy * versatz, ny = ux * versatz, s = breit * 1.6 + 1.5;
  g.beginPath();
  for (let d = (phase * 40) % abstand; d < L - 4; d += abstand) { const x = p.x + ux * d + nx, y = p.y + uy * d + ny;
    g.moveTo(x - ux * s - uy * s, y - uy * s + ux * s); g.lineTo(x, y); g.lineTo(x - ux * s + uy * s, y - uy * s - ux * s); }
  g.globalAlpha = alpha; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = breit + 2; g.stroke();
  g.strokeStyle = farbe; g.lineWidth = breit; g.stroke(); g.globalAlpha = 1;
}
function strich(p, q, farbe, breit, muster, alpha) {
  g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.setLineDash(muster); g.globalAlpha = alpha;
  g.strokeStyle = farbe; g.lineWidth = breit; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
}
function linie(a, st) {
  const m = MASS[st], f = farbeVon(a), p = P(pos(a)), t = jetzt;
  if (st === 'ganz weit' && !(a.seite === 'eigen' || zuMir(a))) return;
  if (a.phase === 'rueck') { const q = P(a.heim); return st === 'nah' || st === 'mittel' ? pfeilkette(p, q, f.haupt, m.linie, m.pfeil, .45, t) : strich(p, q, f.haupt, m.linie, [1.5, 4], .45); }
  if (a.phase !== 'hin') return;
  const q = P(a.beitritt ? a.ziel : halt(a));
  if (a.art === 'spaeher') return strich(p, q, '#ffffff', 1.5, [1.5, 5], .7);
  if (a.art === 'sammeln') return strich(p, q, '#e3b65a', Math.max(1.5, m.linie), [6, 5], .9);
  if (st !== 'nah' && st !== 'mittel') return strich(p, q, zuMir(a) ? '#ff5a4e' : f.haupt, m.linie, [1.5, 4], .85);
  if (a.art === 'rally') { for (const v of [-6, 0, 6]) pfeilkette(p, q, FARBE.rally.haupt, m.linie * .8, m.pfeil * 1.4, .9, t, v * S()); return; }
  pfeilkette(p, q, zuMir(a) ? '#ff4a3e' : f.haupt, m.linie, m.pfeil, .85, t);
}
function bildAn(n, x, y, w, ax = .5, ay = .5, spiegel = 1) {
  const im = n && (n.width ? n : BILD[n]); if (!im) return 0;
  const iw = im.w || im.width, ih = im.h || im.height, h = w * ih / iw;
  if (spiegel !== 1) { g.save(); g.translate(x, y); g.scale(spiegel, 1); g.drawImage(im, -w * ax, -h * ay, w, h); g.restore(); }
  else g.drawImage(im, x - w * ax, y - h * ay, w, h);
  return h;
}
function truppBild(a) {
  if (a.art === 'spaeher') return BILD.marsch_spaeher;
  if (a.art === 'sammeln') return BILD.marsch_trupp_sammler;
  if (a.art === 'rally' && a.phase !== 'sammelt') return BILD.marsch_trupp_rally;
  const s = BILD_SEITE[a.seite], dir = a.kampf ? 'kampf' : a.verletzt ? 'verletzt' : richtung(a).dy > 0 ? 'runter' : 'hoch';
  const n = `marsch_trupp_${s}_${dir}`; return a.seite === 'barb' ? getoent(n, 'barb') : BILD[n];
}
function richtung(a) {
  const z = a.phase === 'rueck' ? a.heim : a.kampf ? a.ziel : a.phase === 'hin' ? halt(a) : a.ziel, p = pos(a);
  const s = a.phase === 'rueck' ? a.ab : a.start; return { dx: (z.x - (a.phase === 'hin' || a.phase === 'rueck' ? s.x : p.x)) || 1, dy: z.y - (a.phase === 'hin' || a.phase === 'rueck' ? s.y : p.y) };
}
function balken(x, y, w, h, anteil, farbe) {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - w / 2, y, w, h);
  if (anteil < .25) g.globalAlpha = .6 + .4 * (.5 + .5 * Math.sin(performance.now() / 600 * Math.PI * 2));
  g.fillStyle = farbe; g.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, anteil)), h); g.globalAlpha = 1;
  g.strokeStyle = '#0c0f14'; g.lineWidth = 1; g.strokeRect(x - w / 2 - .5, y - .5, w + 1, h + 1);
}
function chip(text, x, y, px, farbe = '#eee6d4', grund = 'rgba(10,12,16,.82)', links = false) {
  g.font = `600 ${px}px Inter, system-ui, sans-serif`; const tw = g.measureText(text).width, w = tw + 10, h = px + 6, x0 = links ? x : x - w / 2;
  g.fillStyle = grund; g.beginPath(); g.roundRect(x0, y, w, h, h / 2); g.fill();
  g.fillStyle = farbe; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x0 + 5, y + h / 2 + .5); return w;
}
function kopf(a, x, y, w, st, ohneText) {               // Sechseck (Mitte x, y) + Namensband + Lebensbalken (+ Chip bei Nah); → Treffer-Fläche
  const s = S(), k = kopfBild(a, w), h = w * 50 / 44;
  g.drawImage(k, x - w / 2 - 2, y - h / 2 - 2, k.w, k.h);
  if (a.zurueck) bildAn('marsch_zeichen_zurueck', x + w * .42, y - h * .38, 14 * s);
  const fl = { x: x - Math.max(22, w / 2), y: y - Math.max(22, h / 2), w: Math.max(44, w), h: Math.max(44, h) };
  if (ohneText) return fl;
  let yy = y + h / 2 + 2;
  if (st === 'nah') { const b = band(a.name, farbeVon(a).hell, Math.round(11 * s)); g.drawImage(b, x - b.w / 2, yy, b.w, b.h); yy += b.h + 3; }
  const anteil = (a.truppen - (a.kampf ? kampfStand(a.kampf, 'a') : 0)) / a.truppen0;
  balken(x, yy, (st === 'nah' ? 36 : 28) * s, (st === 'nah' ? 5 : 4) * s, anteil, farbeVon(a).haupt);
  const r = rest(a), zeit = a.phase === 'kampf' ? '' : '⌛ ' + uhr(r);
  if (a.art !== 'spaeher' && zeit) {
    const txt = st === 'nah' ? (a.beute ? zeit + ' · Beute' : fmtCompact(a.truppen - (a.kampf ? kampfStand(a.kampf, 'a') : 0)) + ' · ' + zeit) : zeit;
    const cw = chip(txt, x + w / 2 + 4, y - 8 * s, Math.round(10 * s), '#eee6d4', 'rgba(10,12,16,.82)', true);
    if (a.beute && st === 'nah') beuteKachel(a.beute, x + w / 2 + 8 + cw, y - 12 * s, 18 * s);
  }
  return fl;
}
function beuteKachel(b, x, y, w) {                     // BELOHNUNG = BILD + ZAHL: kleine Kachel mit Beute-Bild und Zahl darauf
  g.fillStyle = 'rgba(40,30,14,.9)'; g.strokeStyle = '#d9b46a'; g.lineWidth = 1; g.beginPath(); g.roundRect(x, y, w, w, 4); g.fill(); g.stroke();
  bildAn(b.bild, x + w / 2, y + w / 2, w * .9);
  g.font = `800 ${Math.round(w * .42)}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const t = fmtCompact(b.n).replace(' Tsd.', 'K').replace(' Mio.', 'M'); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t, x + w / 2, y + w + 3); g.fillStyle = '#fff'; g.fillText(t, x + w / 2, y + w + 3);
}
function armeeZeichnen(a, st) {
  const s = S(), p = P(pos(a)), f = farbeVon(a); a.flaeche = null;
  if (st === 'weit' || st === 'ganz weit') {
    if (!sichtbar(a, st)) return;
    const r = MASS[st].punkt * s / 2; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fillStyle = zuMir(a) ? '#ff5a4e' : f.haupt; g.fill(); g.lineWidth = 2; g.strokeStyle = f.dunkel; g.stroke();
    if (st === 'weit' && a.seite === 'eigen' && a.art !== 'spaeher') a.flaeche = kopf(a, p.x, p.y - 18 * s, 20 * s, st, true);
    a.flaeche = a.flaeche || { x: p.x - 22, y: p.y - 22, w: 44, h: 44 };
    return;
  }
  const m = MASS[st], dir = richtung(a), ziel = dir.dx < 0 ? -1 : 1;
  a.spiegel += Math.sign(ziel - a.spiegel) * Math.min(Math.abs(ziel - a.spiegel), 2 * dtBild / .15);   // Wenden in 150 ms
  let w = m.trupp * s * (a.art === 'rally' && a.phase !== 'sammelt' ? 1.4 : 1) * (a.phase === 'rueck' && a.truppen < a.truppen0 * .5 ? .8 : 1) * (a.art === 'spaeher' ? .9 : 1);
  const wack = a.kampf ? Math.sin(performance.now() / 70 + a.id) : 0, im = truppBild(a);
  const h = bildAn(im, p.x + wack, p.y + 6 * s, w, .5, .55, Math.abs(a.spiegel) < .05 ? .05 : a.spiegel);
  const tf = { x: p.x - Math.max(22, w / 2), y: p.y - Math.max(22, h / 2), w: Math.max(44, w), h: Math.max(44, h) };
  if (a.art === 'spaeher') {                           // Späher: kein Sechseck, nur Auge im Kreis
    const y = p.y - h * .55 - 12 * s; g.beginPath(); g.arc(p.x, y, 9 * s, 0, 7); g.fillStyle = 'rgba(10,12,16,.85)'; g.fill(); g.strokeStyle = f.hell; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.ellipse(p.x, y, 6 * s, 3.5 * s, 0, 0, 7); g.strokeStyle = '#fff'; g.stroke(); g.beginPath(); g.arc(p.x, y, 1.8 * s, 0, 7); g.fillStyle = '#fff'; g.fill();
    a.flaeche = tf; return;
  }
  if (a.art === 'sammeln' && a.phase === 'sammelt') {  // Sammeln: Fortschritt im Feld (echter Rest) + Mini-Kopf
    const y = p.y - h * .55 - 14 * s, r = 11 * s, ant = Math.min(1, (a.feld0 - a.ziel.rest) / 86400);
    g.beginPath(); g.arc(p.x + 16 * s, y, r, 0, 7); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill();
    g.beginPath(); g.arc(p.x + 16 * s, y, r - 2, -Math.PI / 2, -Math.PI / 2 + ant * Math.PI * 2); g.strokeStyle = '#e3b65a'; g.lineWidth = 3; g.stroke();
    kopf(a, p.x - 10 * s, y, 20 * s, st, true);
    chip(`⌛ ${uhr(rest(a))} · ${fmtCompact(a.ziel.rest)} Holz`, p.x, y + 14 * s, Math.round(10 * s));
    a.flaeche = tf; return;
  }
  const ky = p.y + 6 * s - h * .55 - 4 * s - m.kopf * 50 / 44 / 2 - (st === 'nah' ? 30 * s : 12 * s);   // Kopf über dem Trupp (darunter Band + Balken)
  const fl = kopf(a, p.x, ky, m.kopf * s, st);
  if (a.rally && a.art === 'rally') miniKoepfe(a, p.x, ky + m.kopf * s * 50 / 44 / 2 + (st === 'nah' ? 30 : 12) * s, st);
  a.flaeche = { x: Math.min(fl.x, tf.x), y: fl.y, w: Math.max(fl.x + fl.w, tf.x + tf.w) - Math.min(fl.x, tf.x), h: tf.y + tf.h - fl.y };
}
function miniKoepfe(a, x, y, st) {                     // Rally: bis zu 4 Mitglieder als Mini-Sechseck, sonst „+6“
  const s = S(), w = 20 * s, ms = a.rally.mitglieder.slice(1), n = Math.min(4, ms.length), x0 = x - (n - 1) * (w + 3) / 2 + (ms.length > 4 ? -10 : 0);
  if (a.phase === 'sammelt') return;
  ms.slice(0, 4).forEach((m, i) => kopf({ ...m, seite: 'bund', kuerzel: 'NW', zurueck: false }, x0 + i * (w + 3), y + 34 * s, w, st, true));
  if (ms.length > 4) chip('+' + (ms.length - 4), x0 + n * (w + 3), y + 28 * s, Math.round(10 * s), '#1d1406', '#eab24a', true);
  a.miniFlaeche = { x: x0 - w / 2, y: y + 34 * s - w * .6, w: n * (w + 3) + 30, h: w * 1.2 };
}
function zielRing(a, st) {                             // am Linienende ein kleiner Ring in Seitenfarbe (antippbar)
  if (a.phase !== 'hin' || a.beitritt || (st !== 'nah' && st !== 'mittel')) return;
  const q = P(a.art === 'sammeln' ? a.ziel : halt(a)), s = S();
  g.beginPath(); g.ellipse(q.x, q.y, 14 * s, 5.5 * s, 0, 0, 7); g.globalAlpha = .6; g.strokeStyle = farbeVon(a).haupt; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
  a.ringFlaeche = { x: q.x - 22, y: q.y - 22, w: 44, h: 44 };
}
function zielBreite(z) { return Math.max(22, (z.art === 'lager' ? 10500 : 5500) * cam.z); }
function kampfZeichnen(k, st) {
  const s = S(), t = jetzt - k.t0, z = P(k.z), zw = zielBreite(k.z), a = k.a, ap = P(pos(a));
  if (st === 'ganz weit' && a.seite !== 'eigen') return;
  // Boden: rote Doppel-Ellipse, pulst 0,97 ↔ 1,03 (800 ms)
  const puls = 1 + .03 * Math.sin(performance.now() / 800 * Math.PI * 2);
  bildAn('marsch_kampf_kreis', z.x, z.y - zw * .1, zw * 1.3 * puls);
  if (st === 'weit' || st === 'ganz weit') { k.flaeche = { x: z.x - 22, y: z.y - 22, w: 44, h: 44 }; return; }
  // Lichtsäule mit Schwertern über dem Ziel
  g.globalAlpha = .8; bildAn('marsch_kampf_saeule', z.x, z.y - zw * .1, Math.max(48 * s, zw * .55), .5, .92); g.globalAlpha = 1;
  // Verteidiger-Kopf über dem Ziel
  const vk = { seite: k.z.seite, held: k.z.held, name: k.z.art === 'lager' ? `Lager Stufe ${k.z.stufe}` : k.z.name, truppen: k.d0, truppen0: k.d0, phase: 'kampf', kuerzel: k.z.art === 'lager' ? '' : 'RX', zurueck: false };
  const m = MASS[st], vy = z.y - zw * .62 - m.kopf * s * .5 - 20 * s;
  const vkh = kopf(vk, z.x, vy, m.kopf * s, st, true);
  const lagerBand = st === 'nah' && k.z.art === 'lager';   // (Basen tragen ihr Namensschild schon auf der Karte: nicht doppelt)
  if (lagerBand) { const b = band(vk.name, FARBE[k.z.seite].hell, Math.round(11 * s)); g.drawImage(b, z.x - b.w / 2, vy + m.kopf * s * 50 / 44 / 2 + 2, b.w, b.h); }
  balken(z.x, vy + m.kopf * s * 50 / 44 / 2 + (lagerBand ? 20 : 4) * s, (st === 'nah' ? 36 : 28) * s, (st === 'nah' ? 5 : 4) * s, (k.d0 - kampfStand(k, 'd')) / k.d0, FARBE[k.z.seite].haupt);
  k.flaeche = { x: z.x - zw * .65, y: vkh.y, w: zw * 1.3, h: z.y - vkh.y + zw * .3 };
  // Geschosse: je Seite alle 250–400 ms 1–3 Stück, Bogen 450 ms, 30 px hoch, Einschlag = 6 Funken
  for (const sd of ['a', 'd']) if (t >= k.naechst[sd] && t < k.dauer - .5) {
    k.naechst[sd] = t + .25 + Math.random() * .15;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) k.geschosse.push({ sd, t0: t + i * .06, art: sd === 'd' ? (Math.random() < .5 ? 'marsch_geschoss_pfeil_feuer' : 'marsch_geschoss_stein') : 'marsch_geschoss_pfeil', dx: (Math.random() - .5) * 16, dy: (Math.random() - .5) * 10 });
  }
  const ziel = sd => sd === 'a' ? { x: z.x, y: z.y - zw * .2 } : { x: ap.x, y: ap.y };
  const vonP = sd => sd === 'a' ? { x: ap.x, y: ap.y - 10 } : { x: z.x, y: z.y - zw * .35 };
  for (let i = k.geschosse.length - 1; i >= 0; i--) { const q = k.geschosse[i], f = (t - q.t0) / .45;
    if (f < 0) continue;
    const p0 = vonP(q.sd), p1 = ziel(q.sd);
    if (f >= 1) { k.geschosse.splice(i, 1); for (let j = 0; j < 6; j++) { const w = Math.random() * 7; k.funken.push({ x: p1.x + q.dx, y: p1.y + q.dy, vx: Math.cos(w) * 60, vy: Math.sin(w) * 60 - 30, t0: t }); } continue; }
    const x = p0.x + (p1.x + q.dx - p0.x) * f, y = p0.y + (p1.y + q.dy - p0.y) * f - Math.sin(f * Math.PI) * 30 * s;
    const im = BILD[q.art]; if (!im) continue;
    const ang = Math.atan2((p1.y - p0.y) / .45 - Math.cos(f * Math.PI) * Math.PI * 30 * s / .45, (p1.x - p0.x) / .45);
    g.save(); g.translate(x, y); g.rotate(q.art === 'marsch_geschoss_stein' ? 0 : ang + (q.art === 'marsch_geschoss_pfeil' ? -2.62 : -2.8)); const w = 14 * s * (q.art === 'marsch_geschoss_stein' ? 1 : 1.6);
    g.drawImage(im, -w / 2, -w * im.height / im.width / 2, w, w * im.height / im.width); g.restore(); }
  g.fillStyle = '#ffd678';
  for (let i = k.funken.length - 1; i >= 0; i--) { const f = k.funken[i], d = t - f.t0; if (d > .35) { k.funken.splice(i, 1); continue; }
    g.globalAlpha = 1 - d / .35; g.fillRect(f.x + f.vx * d - 1.5, f.y + f.vy * d - 1.5, 3, 3); }
  g.globalAlpha = 1;
  // Schadenszahlen: je Welle eine Zahl über dem getroffenen Kopf, steigt 34 px in 900 ms, ab 600 ms aus; höchstens 4 zugleich
  const hk = { a: { x: ap.x + m.kopf * s * .5 + 30 * s, y: ap.y - 60 * s }, d: { x: z.x + m.kopf * s * .5 + 30 * s, y: vy } };   // (neben dem Sechseck: nichts überdeckt)
  const aktiv = k.wellen.filter(w => t >= w.t && t < w.t + .9).slice(-4);
  for (const w of aktiv) { const d = t - w.t, gross = w.n > (w.s === 'a' ? k.a0 : k.d0) * .1, px = Math.round((gross ? 16 : 13) * s);
    const eigen = (w.s === 'a' && a.seite === 'eigen') || (w.s === 'd' && k.z.seite === 'eigen');
    g.globalAlpha = d < .6 ? 1 : 1 - (d - .6) / .3; g.font = `800 ${px}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = hk[w.s].x, y = hk[w.s].y - 34 * s * d / .9;
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText('-' + fmtCompact(w.n), x, y);
    g.fillStyle = gross && d < .25 ? '#ffd678' : eigen ? '#ff8d82' : '#ffffff'; g.fillText('-' + fmtCompact(w.n), x, y); }
  g.globalAlpha = 1;
}
function effektZeichnen(e, st) {
  const s = S(), t = jetzt - e.t0, z = P(e.ziel), zw = zielBreite(e.ziel);
  if (e.art === 'licht') { g.beginPath(); g.ellipse(z.x, z.y, 40 * s * t, 16 * s * t, 0, 0, 7); g.strokeStyle = `rgba(255,255,255,${1 - t})`; g.lineWidth = 3; g.stroke(); return; }
  if (e.art === 'blitz') { g.globalAlpha = Math.max(0, 1 - t / .8); bildAn('marsch_sieg_blitz', z.x, z.y - zw * .3, zw * (1 + t)); g.globalAlpha = 1; return; }
  if (e.art === 'pfeile') {                            // Rally kommt an: Pfeile von allen Seiten (wie lm_1), 1,5 s
    g.globalAlpha = Math.min(1, (1.5 - t) * 2);
    for (let i = 0; i < 14; i++) { const w = i / 14 * Math.PI * 2, r0 = 120 * s, d = (t * 60 * s + i * 7) % (90 * s), r = r0 - d;
      const x = z.x + Math.cos(w) * r, y = z.y - zw * .2 + Math.sin(w) * r * .55, ux = -Math.cos(w), uy = -Math.sin(w) * .55, q = 7 * s;
      g.beginPath(); g.moveTo(x - ux * q - uy * q, y - uy * q + ux * q); g.lineTo(x, y); g.lineTo(x - ux * q + uy * q, y - uy * q - ux * q);
      g.strokeStyle = '#eab24a'; g.lineWidth = 3.5 * s; g.stroke(); }
    g.globalAlpha = 1; return;
  }
  // Sieg / Niederlage: Band über dem Ziel, rein 250 ms (0,6 → 1,05 → 1), steht 2,2 s, raus 400 ms
  const sieg = e.art === 'sieg', bw = (W >= 700 ? 420 : 300), im = BILD[sieg ? 'marsch_band_sieg' : 'marsch_band_niederlage']; if (!im) return;
  const sk = t < .17 ? .6 + .45 * t / .17 : t < .25 ? 1.05 - .05 * (t - .17) / .08 : 1, al = t > 2.45 ? Math.max(0, 1 - (t - 2.45) / .4) : 1;
  const bh = bw * im.height / im.width, x = Math.max(bw / 2 + 4, Math.min(W - bw / 2 - 4, z.x)), y = Math.max(bh + 120, Math.min(HT - 80, z.y - zw * .9));
  g.save(); g.globalAlpha = al; g.translate(x, y); g.scale(sk, sk);
  g.drawImage(im, -bw / 2, -bh / 2, bw, bh);
  g.font = `900 ${30 * (W >= 700 ? 1.25 : 1)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (sieg) { g.fillStyle = '#1d1406'; g.fillText('SIEG', 0, bh * .1); }
  else { g.lineWidth = 3; g.strokeStyle = 'rgba(40,6,4,.8)'; g.strokeText('NIEDERLAGE', 0, 0); g.fillStyle = '#ffc1b8'; g.fillText('NIEDERLAGE', 0, 0); }
  g.font = `700 ${13 * S()}px Inter, system-ui, sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(e.text, 0, bh / 2 + 12 * S());
  g.fillStyle = sieg ? '#fff3d6' : '#ffc1b8'; g.fillText(e.text, 0, bh / 2 + 12 * S()); g.restore();
}
function rallyPlatz(a, st) {                           // Rally sammelt: goldener Bodenring dreht (12°/s) + Countdown-Chip
  const s = S(), p = P(a.steht), im = BILD.marsch_ring_gold; if (!im) return;
  const r = 35 * s * (st === 'nah' ? 1.6 : 1);
  g.save(); g.translate(p.x, p.y); g.scale(1, .38); g.rotate(jetzt * 12 * Math.PI / 180); g.drawImage(im, -r, -r, 2 * r, 2 * r); g.restore();
  if (st === 'nah' || st === 'mittel') chip(`Rally ⌛ ${uhr(a.ende - jetzt)} · ${a.rally.mitglieder.length}/${a.rally.platz}`, p.x, p.y + r * .38 + 6 * s, Math.round(11 * s), '#1d1406', 'rgba(234,178,74,.95)');
}
function warnung(st) {                                 // Feind auf dich zu: rotes Warn-Dreieck an deiner Burg, pulst
  if (!armeen.some(zuMir)) return;
  const e = basis('eigen'), f = armeen.filter(zuMir).map(pos).sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y))[0];
  const b = P(rand(e, f)), s = S(), w = (st === 'ganz weit' ? 18 : 30) * s;   // an der Burgseite, von der der Feind kommt
  g.globalAlpha = .55 + .45 * Math.sin(performance.now() / 300); bildAn('marsch_zeichen_warnung', b.x, b.y - 8 * s, w); g.globalAlpha = 1;
}
let dtBild = 0;
function malen() {
  const st = stufeJetzt();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ov.width, ov.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (nacht) { g.fillStyle = 'rgba(8,16,44,.5)'; g.fillRect(0, 0, W, HT); }
  if (!KB.fertig) return;
  for (const a of armeen) if (a.phase === 'sammelt' && a.art === 'rally') rallyPlatz(a, st);
  for (const a of armeen) linie(a, st);
  for (const a of armeen) zielRing(a, st);
  for (const k of kaempfe) kampfZeichnen(k, st);
  warnung(st);
  for (const a of [...armeen].sort((x, y) => pos(x).y - pos(y).y)) armeeZeichnen(a, st);
  for (const e of effekte) effektZeichnen(e, st);
}

// ===== Basen in die Karte (Kartenebene: nur bei Kamera-Änderung) =====
const karteZeichnen = zeichnen;
zeichnen = function () {
  karteZeichnen();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const z = cam.z;
  for (const b of D.basen) {
    const im = BILD['basis_' + String(b.bild).padStart(2, '0')], w = 5500 * z, x = sx(b.x), y = sy(b.y);
    if (z < BILD_ZOOM) { ctx.fillStyle = FARBE[b.seite].haupt; ctx.fillRect(x - 2, y - 2, 4, 4); continue; }
    if (!im) continue;
    const bw = Math.max(22, w), bh = bw * im.height / im.width;
    ctx.drawImage(im, x - bw / 2, y - bh * .72, bw, bh);
    if (bw >= 60) { ctx.font = `700 ${Math.round(11 * S())}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(b.name).width + 12; ctx.fillStyle = 'rgba(10,12,16,.78)'; ctx.beginPath(); ctx.roundRect(x - tw / 2, y + bh * .28 + 2, tw, 16, 8); ctx.fill();
      ctx.fillStyle = FARBE[b.seite].hell; ctx.fillText(b.name, x, y + bh * .28 + 10.5); }
  }
};

// ===== Antippen: Armee → runde Knöpfe; Sechseck, Ziel-Ring, Kampf-Kreis, Mini-Köpfe → Kurzinfo =====
const drin = (f, x, y) => f && x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h;
function karteInfo(titel, zeilen) { $('karte-info-text').innerHTML = `<h3>${titel}</h3>` + zeilen.map(z => `<div>${z}</div>`).join(''); $('karte-info').classList.add('offen'); }
function infoArmee(a) {
  karteInfo(a.name, [`Held: ${a.held ? a.held[0].toUpperCase() + a.held.slice(1) : '–'}`, `Truppen: ${fmtCompact(a.truppen)}`,
    `Ziel: ${a.ziel.name || 'Rally-Platz'}`, `${a.phase === 'rueck' ? 'Heimweg' : a.phase === 'kampf' ? 'Kampf läuft' : 'Restzeit'}: ⌛ ${uhr(rest(a))}`]);
}
const KNOPF = {
  info: ['ui_sym_rolle', 'Info', a => infoArmee(a)],
  zurueck: ['ui_sym_rueckzug', 'Zurück', a => { if (a.phase === 'hin' || a.phase === 'sammelt') heimwaerts(a, true); waehlen(null); }],
  schneller: ['beute_beschleuniger', 'Schneller', a => { if ((a.phase === 'hin' || a.phase === 'rueck') && (a.beschl ?? 12) > 0) {   // Restzeit halbieren, Ort bleibt
    const f = Math.min(.99, (jetzt - a.t0) / a.dauer); a.dauer = rest(a) / 2 / (1 - f); a.t0 = jetzt - f * a.dauer; a.beschl = (a.beschl ?? 12) - 1; } waehlen(a); }],
  rally: ['ui_sym_rally', 'Rally', a => karteInfo('Rally', a.rally.mitglieder.map(m => `${m.name} · ${fmtCompact(m.truppen)}`))],
  angreifen: ['ui_sym_schwert', 'Angreifen', a => { const b = basis('eigen'); armee({ seite: 'eigen', von: b, ziel: { x: pos(a).x, y: pos(a).y, art: 'feld', name: a.name }, held: 'aldric', name: '[NW]Alex', truppen: 12.4e6, ohneKampf: true }); waehlen(null); }],
  spaehen: ['ui_sym_spaeher', 'Spähen', a => { const b = basis('eigen'), q = pos(a); armee({ seite: 'eigen', art: 'spaeher', von: b, ziel: { x: q.x, y: q.y, art: 'feld', name: a.name }, name: '[NW]Alex', truppen: 1, dauer: 4 }); waehlen(null); }],
};
function waehlen(a) {
  gewaehlt = a; const box = $('knoepfe'); box.innerHTML = '';
  if (!a) return;
  const liste = a.seite === 'eigen' ? ['info', 'zurueck', 'schneller', ...(a.rally ? ['rally'] : [])] : ['info', 'angreifen', 'spaehen'];
  for (const n of liste) { const [bild, text, tun] = KNOPF[n], b = document.createElement('button'); b.dataset.knopf = n;
    b.innerHTML = `<img alt="" src="${quelle(bild, SPIEL_BILD_PFAD)}"><span>${text}</span>` + (n === 'schneller' ? `<i>${a.beschl ?? 12}</i>` : '');
    b.addEventListener('click', e => { e.stopPropagation(); tun(a); }); box.appendChild(b); }
  knoepfeSetzen();
}
function knoepfeSetzen() {                             // Halbkreis über der Armee, 44 px, 8 px Abstand; folgt der Armee
  if (!gewaehlt || !gewaehlt.flaeche) return;
  const f = gewaehlt.flaeche, cx = f.x + f.w / 2, cy = f.y + 22, bs = [...$('knoepfe').children], n = bs.length, r = 66;   // (Bogen über dem Kopf)
  const bogen = Math.max(Math.asin(Math.min(1, 26 / r)) * 2, Math.PI / (n + 1));   // (44 px + 8 px Abstand auf dem Bogen)
  bs.forEach((b, i) => { const w = Math.PI * 1.5 + (i - (n - 1) / 2) * bogen;
    const x = Math.max(26, Math.min(W - 26, cx + Math.cos(w) * r)), y = Math.max(140, Math.min(HT - 40, cy + Math.sin(w) * r * .9));
    b.style.left = x + 'px'; b.style.top = y + 'px'; });
}
function tippen(x, y) {
  $('karte-info').classList.remove('offen');
  for (const a of [...armeen].reverse()) {
    if (a.art === 'rally' && drin(a.miniFlaeche, x, y) && a.phase !== 'sammelt') return karteInfo('Rally-Mitglieder', a.rally.mitglieder.map(m => `${m.name} · ${fmtCompact(m.truppen)}`));
    if (drin(a.flaeche, x, y)) return waehlen(a);
  }
  for (const k of kaempfe) if (drin(k.flaeche, x, y)) return karteInfo('Kampf', [`${k.a.name}: ${fmtCompact(k.a0 - kampfStand(k, 'a'))} / ${fmtCompact(k.a0)}`,
    `${k.z.name}: ${fmtCompact(k.d0 - kampfStand(k, 'd'))} / ${fmtCompact(k.d0)}`, `Kampf läuft ⌛ ${uhr(k.dauer - (jetzt - k.t0))}`]);
  for (const a of armeen) if (a.phase === 'hin' && drin(a.ringFlaeche, x, y)) { cam.x = a.ziel.x; cam.y = a.ziel.y; begrenzen(); neu(); waehlen(null); return; }
  waehlen(null);
}
let druck = null;
cv.addEventListener('pointerdown', e => { druck = { x: e.clientX, y: e.clientY, t: performance.now() }; });
cv.addEventListener('pointerup', e => { if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) < 10 && performance.now() - druck.t < 500) tippen(e.clientX, e.clientY); druck = null; });
$('karte-info').querySelector('.zu').addEventListener('click', () => $('karte-info').classList.remove('offen'));

// ===== Leiste =====
document.querySelectorAll('#leiste [data-zustand]').forEach(b => b.addEventListener('click', () => { $('karte-info').classList.remove('offen'); ZUSTAND[b.dataset.zustand](); zustandText = b.textContent; }));
const ZOOMS = ['nah', 'mittel', 'weit', 'ganz'], ZOOM_NAME = { nah: 'Nah', mittel: 'Mittel', weit: 'Weit', ganz: 'Ganz weit' };
let zoomJetzt = 'nah', zustandText = '–';
function zoomText() { zoomJetzt = { nah: 'nah', mittel: 'mittel', weit: 'weit', 'ganz weit': 'ganz' }[stufeJetzt()]; $('zoom').textContent = 'Zoom: ' + ZOOM_NAME[zoomJetzt]; }
$('zoom').addEventListener('click', () => { const n = ZOOMS[(ZOOMS.indexOf(zoomJetzt) + 1) % 4];
  if (n === 'ganz') zoomStufe('ganz'); else zoomStufe(n, zoomJetzt === 'ganz' ? D.mitte.x : cam.x, zoomJetzt === 'ganz' ? D.mitte.y - 8000 : cam.y); zoomJetzt = n; $('zoom').textContent = 'Zoom: ' + ZOOM_NAME[n]; });
$('mehr-knopf').addEventListener('click', () => { const m = $('mehr'); m.classList.toggle('offen'); $('mehr-knopf').classList.toggle('an', m.classList.contains('offen')); lage(); });
const SEITEN = ['eigen', 'bund', 'feind', 'barb'], SEITE_NAME = { eigen: 'eigen', bund: 'Bündnis', feind: 'Feind', barb: 'Barbaren' };
$('seite').addEventListener('click', e => { seite = SEITEN[(SEITEN.indexOf(seite) + 1) % 4]; e.target.dataset.s = seite; e.target.textContent = 'Seite: ' + SEITE_NAME[seite]; });
$('tempo').addEventListener('click', e => { tempo = tempo === 1 ? 5 : 1; e.target.textContent = 'Tempo ×' + tempo; e.target.classList.toggle('an', tempo > 1); });
$('gedraenge').addEventListener('click', () => { gedraenge(); $('bps').style.display = 'block'; zustandText = 'Gedränge'; });
$('nacht').addEventListener('click', e => { nacht = !nacht; e.target.textContent = nacht ? 'Nacht an' : 'Nacht aus'; e.target.classList.toggle('an', nacht); });
$('held').addEventListener('click', e => { heldAn = !heldAn; e.target.textContent = heldAn ? 'Held an' : 'Held aus'; });
function lage() {                                      // Infozeile, Bilder/s und „Mehr“ unter die Leiste
  const u = $('leiste').getBoundingClientRect().bottom + 8;
  $('zeile').style.top = u + 'px'; $('bps').style.top = u + 'px'; $('mehr').style.top = u + 'px';
}
addEventListener('resize', () => { ov.width = cv.width; ov.height = cv.height; MERK.clear(); lage(); });
const BREIT = innerWidth >= 700 ? 1.5 : 1;              // Desktop: näher heran (eine Stadt zur nächsten ≈ ein Bildschirm)
ZOOM.nah = .022 * BREIT; ZOOM.mittel = .01 * BREIT; ZOOM.weit = .004 * BREIT;   // (Handy wie im Spiel: Nah = eine Basis gut 120 px breit)

// ===== Schleife + Bilder/s =====
let zuletzt = performance.now(), bilder = 0, bpsZeit = zuletzt, bps = 0;
function bild(t) {
  dtBild = Math.min(.1, (t - zuletzt) / 1000); zuletzt = t;
  if (ov.width !== cv.width || ov.height !== cv.height) { ov.width = cv.width; ov.height = cv.height; MERK.clear(); }
  schritt(dtBild); malen(); knoepfeSetzen();
  bilder++; if (t - bpsZeit >= 1000) { bps = Math.round(bilder * 1000 / (t - bpsZeit)); bilder = 0; bpsZeit = t;
    $('bps').textContent = bps + ' Bilder/s'; $('bps').classList.toggle('schlecht', bps < 30); zoomText();
    $('zeile').innerHTML = `<b>${ZOOM_NAME[{ nah: 'nah', mittel: 'mittel', weit: 'weit', 'ganz weit': 'ganz' }[stufeJetzt()]]}</b> · ${zustandText} · ${armeen.length} Armeen · ${bps} Bilder/s`; }
  requestAnimationFrame(bild);
}
ZUSTAND.marsch(); seite = 'feind'; ZUSTAND.marsch(); seite = 'eigen'; zustandText = 'Marsch';
lage(); zoomStufe('nah', D.mitte.x, D.mitte.y - 4000); zoomText();
requestAnimationFrame(bild);
window.MT = { armeen, kaempfe, effekte, ZUSTAND, tippen, waehlen, get bps() { return bps; }, get jetzt() { return jetzt; }, set tempo(v) { tempo = v; },
  bereit: () => KB.fertig && !bilderOffen, stufe: stufeJetzt, flaeche: a => a.flaeche, gedraenge: () => $('gedraenge').click() };
})();
