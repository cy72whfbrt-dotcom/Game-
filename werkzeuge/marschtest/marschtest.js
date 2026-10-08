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
const SPIEL = [...HELDEN.map(h => `held_${h}_kopf`), 'beute_muenzen', 'beute_holz', 'ui_edelstein',
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
// Laufzeit wie travelDurationSeconds (02b): Weg über die Pässe ÷ (300 × Kartenmaßstab 1,8) Einheiten/s, auf 6–60 s geklemmt, nie unter 3 s
// (ohne Tempo-Skill, Akademie, Forschung, Bündnis-Gebiet, Held – die kämen beim Einbau aus dem Spiel)
const MARSCH_TEMPO = 300 * 1.8, reise = d => Math.max(3, Math.min(60, Math.max(6, d / MARSCH_TEMPO)));
const laenge = pts => pts.reduce((x, p, i) => i ? x + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0);
function aufWeg(pts, f) {                             // Punkt bei Anteil f eines Linienzugs
  let rest = laenge(pts) * Math.max(0, Math.min(1, f));
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (rest <= d || i === pts.length - 1) { const q = d ? Math.min(1, rest / d) : 1; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * q, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * q }; }
    rest -= d; }
  return pts[pts.length - 1];
}
const hinWeg = a => a.ueber ? [a.start, a.ueber, halt(a)] : [a.start, halt(a)];   // (über den Pass: Knick-Linie wie marchPath)
const KUERZEL = { eigen: 'NW', bund: 'NW', feind: 'RX', barb: '' };
function armee(o) {
  const a = Object.assign({ id: naechsteId++, art: 'marsch', phase: 'hin', t0: jetzt, spiegel: 1, verlust: 0, zurueck: false, beute: null }, o);
  a.kuerzel = o.kuerzel !== undefined ? o.kuerzel : KUERZEL[a.seite]; a.start = rand(a.von, a.ziel); a.truppen0 = a.truppen0 || a.truppen;
  a.dauer = a.dauer || reise(laenge(hinWeg(a)));
  if (meins(a) && a.art === 'marsch' && !a.beitritt && a.ziel.art === 'basis' && basis('eigen').schild) {   // wie launchAttack: wer angreift, verliert seinen Schild
    schildSetzen('[NW]Alex', false); effekte.push({ art: 'dazu', t0: jetzt, ziel: basis('eigen'), feind: true, text: 'Dein Friedensschild ist gefallen, weil du angreifst.' }); }
  armeen.push(a); return a;
}
function halt(a) {                                     // wo die Armee am Ziel stehen bleibt: vor der Basis/dem Lager, auf ihrer Ankunftsseite
  const z = a.ziel, q = a.ueber || a.start, dx = q.x - z.x, dy = q.y - z.y, d = Math.hypot(dx, dy) || 1, r = z.art === 'feld' ? 0 : z.art === 'lager' ? 9000 : 7500;
  return { x: z.x + dx / d * r, y: z.y + dy / d * r };
}
function rand(b, q) {                                 // Trupp zeigt sich erst am Burgrand (Richtung q), nicht mitten auf der Burg
  const r = b.art === 'basis' ? 3600 : b.art === 'lager' ? 5000 : 0, dx = q.x - b.x, dy = q.y - b.y, d = Math.hypot(dx, dy) || 1;
  return { x: b.x + dx / d * r, y: b.y + dy / d * r };
}
function pos(a) {                                      // Weltpunkt der Armee jetzt
  if (a.phase === 'hin') return aufWeg(hinWeg(a), (jetzt - a.t0) / a.dauer);
  if (a.phase === 'rueck') return aufWeg(a.rweg, (jetzt - a.t0) / a.dauer);
  if (a.zug) { const f = Math.min(1, (jetzt - a.zug.t0) / .6); return { x: a.zug.von.x + (a.steht.x - a.zug.von.x) * f, y: a.zug.von.y + (a.steht.y - a.zug.von.y) * f }; }
  return a.steht || halt(a);
}
function rest(a) { return a.phase === 'hin' || a.phase === 'rueck' ? a.dauer - (jetzt - a.t0) : a.phase === 'sammelt' ? (a.art === 'sammeln' ? sammelRest(a) : a.ende - jetzt) : a.kampf ? a.kampf.dauer - (jetzt - a.kampf.t0) : 0; }
function hinstellen(a, p) { a.zug = { von: pos(a), t0: jetzt }; a.steht = p; }   // in 0,6 s an den neuen Platz (Aufstellung um das Ziel)
function heimwaerts(a, zurueck) {                      // Rückweg ab hier (Zurückrufen: sofort, weiße Fahne)
  if (a.art === 'sammeln' && a.phase === 'sammelt') { if (a.ziel.sammler === a) a.ziel.sammler = null;   // (Sammler packen ein: was sie haben, nehmen sie mit)
    if (a.got >= 1) a.beute = { bild: 'beute_holz', n: Math.floor(a.got) }; }
  const p = pos(a), gelaufen = a.phase === 'hin' ? jetzt - a.t0 : 0, vorPass = a.ueber && a.phase === 'hin' && laenge([a.start, a.ueber]) > laenge(hinWeg(a)) * Math.min(1, gelaufen / a.dauer);
  a.ab = p; a.heim = rand(a.von, a.ueber || p); a.rweg = a.ueber && !vorPass ? [p, a.ueber, a.heim] : [p, a.heim];   // (zurück über denselben Pass)
  a.dauer = zurueck && a.phase === 'hin' ? Math.max(1, gelaufen) : reise(laenge(a.rweg));   // Zurückrufen (recallMarch): so lange zurück, wie schon gelaufen
  a.phase = 'rueck'; a.t0 = jetzt; a.zurueck = !!zurueck;
}

// ===== Sammeln wie im Spiel (09a fieldArrive/fieldTick): EIN Sammler je Feld. Das Feld gibt in fester Zeit sein Holz her
// (Tempo = voll / Dauer, egal wie viele Truppen); die Truppen bestimmen nur die Traglast (Holz: 2 je Truppe). Kommt ein weiterer
// Marsch DESSELBEN Spielers an, tritt er bei: Truppen und Traglast wachsen (o.troops += m.troops). Ein Bündnis-Mitglied geht
// wieder heim. Voll beladen oder Feld leer: alle zusammen heim mit der Ladung. (Kampf um ein fremd besetztes Feld: hier nicht gezeigt.)
const LAST = 2, SAMMEL_DAUER = 60;                     // (Spiel: 1–4 Std.; hier 60 s für das ganze Feld)
const traglast = a => a.truppen * LAST;
const sammelTempo = f => f.voll / SAMMEL_DAUER;
function sammelRest(a) { return Math.max(0, Math.min(traglast(a) - a.got, a.ziel.rest)) / sammelTempo(a.ziel); }
function feldAnkunft(a) {
  const f = a.ziel, o = f.sammler;
  if (!o) { f.sammler = a; a.phase = 'sammelt'; a.steht = { x: f.x, y: f.y + 900 }; a.got = 0; return; }
  if (o.name === a.name) { o.truppen += a.truppen; o.truppen0 = o.truppen; armeen.splice(armeen.indexOf(a), 1);   // eigener Marsch: tritt dem Sammeln bei
    effekte.push({ art: 'dazu', t0: jetzt, ziel: f, text: `Sammler dazu: +${fmtCompact(a.truppen)} · Traglast jetzt ${fmtCompact(traglast(o))} Holz` }); return; }
  effekte.push({ art: 'dazu', t0: jetzt, ziel: f, feind: true, text: `Feld besetzt von ${o.name} – ${a.name} kehrt um` });
  heimwaerts(a);
}

// ===== Kampf wie im Spiel (04-kampf.js, 07a kampfDazu): EIN Kampf je Ziel. Kommt eine weitere Welle derselben Seite an (eigener
// Marsch oder Bündnis-Mitglied), tritt sie dem laufenden Kampf bei: Truppen werden addiert, der Kampf läuft mindestens noch 2,5 s
// („the fresh troops get to fight too“). Verstärkung des Verteidigers landet in der Besatzung (mehr Verteidiger). Ein fremder
// Angreifer (andere Seite, nicht im Bündnis) wartet, bis der Kampf entschieden ist, und kämpft dann gegen die Basis, wie sie DANN steht.
// Dauer wie fightDurationMs (03e): 4 s + 1,5 s je Zehnerpotenz über 1000 Truppen, höchstens 12 s. Ergebnis fertig, Verluste in Wellen.
const dauerVon = (a0, d0) => Math.max(4, Math.min(12, 4 + 1.5 * Math.log10(Math.max(1, a0 + d0) / 1000)));
const freund = (x, y) => x.kuerzel === y.kuerzel;      // dieselbe Seite: gleicher Angreifer oder Bündnis (gleiches Kürzel)
// Ergebnis wie resolveAttack (02c) / resolveBotAttack: Sieg, wenn Angriff > Truppen + Verteidigung. Sieger verliert die
// Verteidigung (anteilig), der Verteidiger alles. Verloren: 20 % fliehen heim (RETREAT_RECOVERY_PCT), der Rest fällt; der Verteidiger
// verliert min(Besatzung, Angriff). (Ohne Helden, Schild-%, Titel und Forschung – die kämen beim Einbau aus dem Spiel.)
const FLUCHT = .2;
function ergebnis(k) {
  const A = k.a0, T = k.d0, V = k.z.vert || 0, sieg = A > T + V;
  const aV = sieg ? Math.min(A, V) : k.teile.reduce((x, a) => x + a.truppen - Math.floor(a.truppen * FLUCHT), 0);
  return { sieg, aV, dV: sieg ? T : Math.min(T, A) };
}
function planen(k) {                                   // Verluste aus den jetzigen Zahlen; schon gefallene bleiben, der Rest in neuen Wellen
  const t = jetzt - k.t0, e = ergebnis(k); k.sieg = e.sieg;
  k.wellen = k.wellen.filter(w => w.t <= t);
  const ende = k.dauer - .8;
  for (const [s, soll] of [['a', e.aV], ['d', e.dV]]) {   // je Seite bis zu 8 Wellen bis kurz vor Schluss, Gewichte zufällig, nie „-0“
    const v = Math.max(0, soll - kampfStand(k, s)), n = Math.max(1, Math.min(8, v)), w = Array.from({ length: n }, () => .5 + Math.random()), sw = w.reduce((x, y) => x + y, 0);
    let summe = 0;
    w.forEach((x, i) => { const m = i === n - 1 ? v - summe : Math.max(1, Math.round(v * x / sw)); summe += m;
      k.wellen.push({ t: t + .2 + (i + (s === 'd' ? .5 : 0)) * Math.max(.3, ende - t - .2) / n, s, n: m, i: Math.floor(Math.random() * 9) }); });
  }
  k.wellen = k.wellen.filter(w => w.n > 0).sort((x, y) => x.t - y.t);
  k.aV = k.wellen.filter(w => w.s === 'a').reduce((x, w) => x + w.n, 0); k.dV = k.wellen.filter(w => w.s === 'd').reduce((x, w) => x + w.n, 0);
}
function kampf(a) {
  const z = a.ziel, k = { a, teile: [a], z, t0: jetzt, a0: a.truppen, g0: z.truppen, d0: z.truppen + (z.verst || []).reduce((x, v) => x + v.truppen, 0), wellen: [], geschosse: [], funken: [], naechst: { a: 0, d: .15 } };
  k.dauer = dauerVon(k.a0, k.d0); planen(k);
  if (!a.steht) a.steht = halt(a); hinstellen(a, platz(z, a, [a]));   // (wer gewartet hat, tritt vom Rand nach vorn)
  a.phase = 'kampf'; a.kampf = k; kaempfe.push(k); return k;
}
const PLAETZE = [90, 60, 120, 30, 150, 0, 180, 210, 330].map(g => g * Math.PI / 180);   // Halbkreis unter dem Ziel (oben: Verteidiger, Tafel)
function platz(z, a, teile) {                          // freier Platz am nächsten zur Ankunftsseite, nicht auf einer anderen Basis
  const w0 = Math.atan2(halt(a).y - z.y, halt(a).x - z.x), r = z.art === 'lager' ? 10000 : 8500, ort = w => ({ x: z.x + Math.cos(w) * r, y: z.y + Math.sin(w) * r });
  const ab = (x, y) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
  const frei = PLAETZE.filter(w => teile.every(b => b === a || ab(w, b.winkel) > .3) && D.basen.every(b => b === z || Math.hypot(ort(w).x - b.x, ort(w).y - b.y) > 5500));
  const w = (frei.length ? frei : PLAETZE).sort((x, y) => ab(x, w0) - ab(y, w0))[0];
  a.winkel = w; return ort(w);
}
function beitreten(k, a) {                             // wie kampfDazu: Truppen addieren, Kampf geht mindestens 2,5 s weiter
  const z = k.z;
  a.phase = 'kampf'; a.kampf = k; if (!a.steht) a.steht = halt(a);
  hinstellen(a, platz(z, a, k.teile));                 // (die Armeen stellen sich um das Ziel)
  k.teile.push(a); k.a0 += a.truppen; k.dauer = Math.max(k.dauer, jetzt - k.t0 + 2.5); planen(k);
  effekte.push({ art: 'dazu', t0: jetzt, ziel: z, text: `Verstärkung im Kampf: +${fmtCompact(a.truppen)} · jetzt ${fmtCompact(k.a0 - kampfStand(k, 'a'))}` });   // (= Tafel)
}
function verteidigerDazu(k, v) {                       // Verstärkung des Verteidigers kämpft mit: mehr Verteidiger, Kampf rechnet neu
  k.d0 += v.truppen; planen(k);
  effekte.push({ art: 'dazu', t0: jetzt, ziel: k.z, feind: true, text: `${v.name} verstärkt: +${fmtCompact(v.truppen)} · jetzt ${fmtCompact(k.d0 - kampfStand(k, 'd'))}` });
}
function kampfStand(k, s) { const t = jetzt - k.t0; return k.wellen.filter(w => w.s === s && w.t <= t).reduce((x, w) => x + w.n, 0); }
const verstVerlust = (k, n) => Math.round(kampfStand(k, 'd') * n / k.d0);   // (Verteidiger-Seite: Besatzung g0 oder ein Verstärker)
const teilVerlust = a => a.kampf ? Math.round(kampfStand(a.kampf, 'a') * a.truppen / a.kampf.a0) : 0;   // (Verluste nach Truppen geteilt)
const ohneTag = n => n.replace(/^\[\w+\]/, '');
const kuerzelVon = z => (z.name.match(/^\[(\w+)\]/) || [])[1] || '';
function bandZeigen(e) { if (e.eigen) effekte.push(Object.assign({ t0: jetzt }, e)); }
function kampfEnde(k) {
  kaempfe.splice(kaempfe.indexOf(k), 1);
  const z = k.z, n = k.teile.length, mehr = n > 1 ? ` · ${n} Armeen` : '', eigen = k.teile.some(a => a.seite === 'eigen' || a.rally) || z.seite === 'eigen';
  if (k.teile.some(meins)) for (const a of k.teile) a.warMit = true;   // (Verbündete aus deinem Kampf: ihren Heimweg siehst du)
  const e = ergebnis(k); k.sieg = e.sieg; k.aV = e.aV; k.dV = e.dV;   // (das Ergebnis zählt, wie das Spiel es rechnet – die Wellen waren nur die Anzeige)
  const f = (k.d0 - k.dV) / k.d0;
  if (!k.sieg) {                                       // abgewehrt: Verteidiger verliert min(Besatzung, Angriff), Angreifer: 20 % fliehen heim
    z.truppen = Math.round(k.g0 * f); for (const v of z.verst || []) v.truppen = Math.round(v.truppen * f);
    bandZeigen({ eigen, art: 'niederlage', ziel: z, titel: 'NIEDERLAGE', text: '−' + fmtCompact(k.aV) + ' Truppen' + mehr });
    for (const a of k.teile) { const t0 = a.truppen; a.truppen = Math.floor(t0 * FLUCHT); a.kampf = null; a.zug = null; a.verletzt = true;
      if (a.rally) a.rally.mitglieder.forEach(m => { m.truppen = Math.floor(m.truppen * FLUCHT); });
      heimwaerts(a); }
    return;
  }
  z.verst = []; effekte.push({ art: 'blitz', t0: jetzt, ziel: z });   // Sieg: Besatzung und Verstärker fallen
  const rest = a => a.truppen - Math.round(k.aV * a.truppen / k.a0);
  if (z.haupt) {                                       // Hauptstadt hält: Garnison fällt, die Stadt brennt (30 Min.), Beute nur hier, Überlebende heim
    z.truppen = 0; z.brennt = jetzt + 30 * 60;
    const beute = Math.floor(Math.max(0, (z.gold || 0) - (z.schutz || 0)) * .1); z.gold = Math.max(0, (z.gold || 0) - beute);   // (HAUPT_BEUTE 10 % über dem Schutz)
    bandZeigen({ eigen, art: 'sieg', ziel: z, titel: 'GEPLÜNDERT', text: 'die Hauptstadt hält' + mehr });
    for (const a of k.teile) { const t0 = a.truppen; a.truppen = rest(a); a.kampf = null; a.zug = null;
      a.beute = { bild: 'beute_muenzen', n: Math.round(beute * t0 / k.a0) }; heimwaerts(a); }   // (Beute nach Truppen geteilt)
    return;
  }
  // Turm erobert: gehört jetzt dem Kampf-Besitzer, seine Überlebenden bleiben als Besatzung (keine Beute); Verbündete und die
  // Rally-Mitglieder (ohne Starter) gehen heim
  const wer = k.a, bleib = k.teile.filter(a => a.name === wer.name);
  z.orig = z.orig || { seite: z.seite, name: z.name, held: z.held, truppen: k.g0 };
  z.seite = wer.seite === 'bund' ? 'bund' : wer.seite; z.name = wer.name; z.held = wer.held; z.truppen = 0;
  bandZeigen({ eigen, art: 'sieg', ziel: z, titel: 'SIEG', text: ohneTag(z.orig.name) + 's Turm erobert' + mehr });
  for (const a of k.teile) { const r = rest(a); a.kampf = null; a.zug = null;
    if (bleib.includes(a) && !a.rally) { z.truppen += r; armeen.splice(armeen.indexOf(a), 1); continue; }
    if (a.rally) { const st = a.rally.mitglieder[0], anteil = Math.round(r * st.truppen / a.truppen); z.truppen += anteil; a.truppen = r - anteil; a.rally.mitglieder.shift(); }
    else a.truppen = r;
    if (a.truppen > 0) heimwaerts(a); else armeen.splice(armeen.indexOf(a), 1); }
  neu();                                               // (Basis hat jetzt deine Farbe)
}
// Barbaren-Lager wie barbFight (09b): sofort entschieden, keine Schlacht. Sieg: Verlust = Lager-Krieger, Münzen ins Abholfach,
// Überlebende heim; Niederlage: ALLE Truppen weg, das Lager ist um min(Krieger, Angriff) geschwächt
const lagerHeute = { n: 0 };
function lagerKampf(a) {
  const z = a.ziel, T = z.truppen, A = a.truppen, sieg = A > T, eigen = a.seite === 'eigen' || a.seite === 'bund';
  if (sieg) { lagerHeute.n++; const gold = Math.round((z.truppen0 || T) * 20 + 5000 * z.stufe);   // (barbLootOf)
    a.truppen = A - Math.min(A, T); z.truppen = z.truppen0 = z.truppen0 || T;   // (ein neues Lager steht bald wieder da)
    bandZeigen({ eigen, art: 'sieg', ziel: z, titel: 'LAGER BESIEGT', text: `Stufe ${z.stufe} · ${lagerHeute.n} / 20 heute`, beute: { bild: 'beute_muenzen', n: gold } });
    effekte.push({ art: 'blitz', t0: jetzt, ziel: z }); heimwaerts(a); return; }
  z.truppen = Math.max(1, T - Math.min(T, A));
  bandZeigen({ eigen, art: 'niederlage', ziel: z, titel: 'ABGEWEHRT', text: '−' + fmtCompact(A) + ' Truppen' });
  armeen.splice(armeen.indexOf(a), 1);
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
function blickAuf(p, q) { if (stufeJetzt() === 'ganz weit') { zoomStufe('nah', (p.x + q.x) / 2, (p.y + q.y) / 2); return zoomText(); } cam.x = (p.x + q.x) / 2; cam.y = (p.y + q.y) / 2; begrenzen(); neu(); }
function schicken(b) {                                 // wie im Spiel: nur Truppen, die noch in der Basis sind (die Hälfte der freien je Marsch)
  const weg = armeen.filter(a => a.von === b && !a.beitritt && a.art !== 'spaeher').reduce((x, a) => x + a.truppen, 0), frei = b.truppen - weg;
  if (frei < 100000) { effekte.push({ art: 'dazu', t0: jetzt, ziel: b, feind: true, text: 'Keine Truppen mehr frei – alle sind unterwegs' }); return 0; }
  return Math.round(frei / 2 / 1e5) * 1e5;
}
const ZUSTAND = {
  marsch() { const v = von(seite), z = ziel(seite, 'marsch'), n = seite === 'barb' ? 640000 : schicken(v); if (!n) return;
    armee({ seite, von: v, ziel: z, held: heldVon(seite), name: name(seite), truppen: n }); blickAuf(v, z); },
  sammeln() { const v = von(seite === 'barb' ? 'eigen' : seite), s = seite === 'barb' ? 'eigen' : seite;
    armee({ seite: s, art: 'sammeln', von: v, ziel: D.feld, held: heldVon(s), name: name(s), truppen: 60000 });   // (60 Tsd. tragen 120 Tsd. Holz)
    blickAuf(D.feld, D.feld); },
  spaeher() { const s = seite === 'barb' ? 'eigen' : seite, v = von(s), z = s === 'feind' ? basis('eigen') : basis('kevin');
    armee({ seite: s, art: 'spaeher', von: v, ziel: z, name: name(s), truppen: 1 }); blickAuf(v, z); },   // (Späher-Tempo wie ein Marsch – ohne Späher-Forschung)
  rally() { rallyStarten(); },
  kampf() { schnellKampf(Math.random() < .6); },
  sieg() { schnellKampf(true); },
  niederlage() { schnellKampf(false); },
  zurueck() { const a = [...armeen].reverse().find(x => x.seite === 'eigen' && x.phase === 'hin' && !x.beitritt);
    if (a) return heimwaerts(a, true);
    const b = armee({ seite: 'eigen', von: basis('eigen'), ziel: basis('kevin'), held: 'aldric', name: '[NW]Alex', truppen: 12.4e6 }); b.rufen = jetzt + 2.5; },
};
function zuruecksetzen(z) {                            // Testknöpfe: Ziel wie am Anfang (Besitzer, Besatzung, ohne Verstärker, brennt nicht)
  if (z.orig) { Object.assign(z, z.orig); z.orig = null; neu(); }
  z.truppen = z.truppen0 = z.truppen0 || z.truppen; z.verst = []; z.brennt = 0;
}
function schnellKampf(sieg) {                          // Armee kurz vor dem Ziel: 12,4 Mio. gewinnen, 4,2 Mio. verlieren (Regel wie im Spiel)
  const v = basis('eigen'), z = seite === 'bund' ? basis('turm') : basis('kevin');
  const a = armee({ seite: seite === 'bund' ? 'bund' : 'eigen', von: seite === 'bund' ? basis('mira') : v, ziel: z, held: seite === 'bund' ? 'mira' : 'aldric',
    name: seite === 'bund' ? '[NW]Mira_7' : '[NW]Alex', truppen: sieg ? 12.4e6 : 4.2e6 });
  a.t0 = jetzt - a.dauer + 1.2; zuruecksetzen(z); blickAuf(z, z);
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
// Gemeinsamer Kampf (Alexander 8.10.): mehrere Wellen aufs selbe Ziel, Verbündete, Verstärkung des Gegners, dritte Seite wartet
const kampfZiel = () => (kaempfe.find(k => k.teile.some(a => a.seite === 'eigen')) || {}).z || basis('kevin');
function welle(o, sek) {                               // Marsch, der in sek Sekunden ankommt (schon unterwegs)
  const a = armee(o); a.t0 = jetzt - Math.max(0, a.dauer - sek); return a;
}
function dreiAngriffe() {                              // 3 eigene Märsche, versetzt: allein zu schwach, zusammen Sieg
  const v = basis('eigen'), z = basis('kevin'); zuruecksetzen(z);
  [['aldric', 4.2e6, 3], ['greta', 3.1e6, 6], ['wolfram', 5.1e6, 9]].forEach(([held, t, sek]) => welle({ seite: 'eigen', von: v, ziel: z, held, name: '[NW]Alex', truppen: t }, sek));
  blickAuf(z, z);
}
const DAZU = {
  eigen() { const z = kampfZiel(); welle({ seite: 'eigen', von: basis('eigen'), ziel: z, held: 'otto', name: '[NW]Alex', truppen: 2.4e6 }, 3); blickAuf(z, z); },
  bund() { const z = kampfZiel(); welle({ seite: 'bund', von: basis('bjarne'), ziel: z, held: 'bruno', name: '[NW]Bjarne', truppen: 2.9e6 }, 3); blickAuf(z, z); },
  gegner() { const z = kampfZiel(), q = z === basis('kevin') ? basis('sturm') : basis('kevin');   // sein Bündnis schickt Verstärkung in die Besatzung
    welle({ seite: 'feind', art: 'verst', von: q, ziel: z, held: 'ragna', name: q.name, truppen: 3.5e6 }, 3); blickAuf(z, z); },
  dritter() { const z = kampfZiel();                   // ganz andere Seite ([DK], weder du noch der Gegner): muss warten
    welle({ seite: 'feind', kuerzel: 'DK', von: { x: z.x + 6000, y: z.y - 15000, art: 'feld' }, ziel: z, held: 'yrsa', name: '[DK]Wulfgar', truppen: 6.5e6 }, 3); blickAuf(z, z); },
};
// Pass-Tor und Maut wie tollFor/payToll (01b): beim Losschicken bezahlt, je Truppe Stufe × 1000 Münzen, mindestens 100, höchstens
// 560.000; geschlossenes Tor = kein Weg (kein Warten am Tor – das gibt es im Spiel nicht); eigenes/Bündnis-Tor frei.
const GATE_TOLLS = [0, .1, .25, .5, 1, 2];
function ueberPass() {
  const v = basis('eigen'), z = basis('wulf'), ps = D.pass, wer = ohneTag(ps.besitzer);
  if (!toreOffen) return effekte.push({ art: 'dazu', t0: jetzt, ziel: v, feind: true, text: `Das Tor ist geschlossen – ${wer} lässt niemanden durch. Erobere das Tor.` });
  const n = schicken(v); if (!n) return;
  const maut = kuerzelVon({ name: ps.besitzer }) === 'NW' ? 0 : Math.max(100, Math.min(560000, Math.round(n * GATE_TOLLS[ps.stufe] * 1000)));
  if (D.muenzen < maut) return effekte.push({ art: 'dazu', t0: jetzt, ziel: v, feind: true, text: `Maut am Tor: ${NF.format(maut)} Münzen – du hast zu wenig. Erobere das Tor, dann ist es kostenlos.` });
  D.muenzen -= maut; zuruecksetzen(z);
  const a = armee({ seite: 'eigen', von: v, ziel: z, held: 'aldric', name: '[NW]Alex', truppen: n, ueber: { x: ps.x, y: ps.y } });
  if (maut) effekte.push({ art: 'dazu', t0: jetzt, ziel: v, text: `Maut bezahlt: ${NF.format(maut)} Münzen an ${wer} · ⌛ ${uhr(a.dauer)}`, beute: { bild: 'beute_muenzen', n: maut } });
  const d = laenge(hinWeg(a)); cam.x = (v.x + ps.x) / 2; cam.y = (v.y + ps.y) / 2; cam.z = Math.min(W, HT) * .8 / d; begrenzen(); neu();
}
const ERGEBNIS = {
  pass: ueberPass,
  meinSchild() { const an = !basis('eigen').schild; schildSetzen('[NW]Alex', an); if (an) { seite = 'feind'; ZUSTAND.marsch(); seite = $('seite').dataset.s || 'eigen'; blickAuf(basis('eigen'), basis('eigen')); } },
  kevinSchild() { const z = basis('kevin'), an = !z.schild; zuruecksetzen(z); schildSetzen(z.name, an); if (an) welle({ seite: 'eigen', von: basis('eigen'), ziel: z, held: 'aldric', name: '[NW]Alex', truppen: 6.2e6 }, 3); blickAuf(z, z); },                                     // Ergebnis-Regeln: Turm wird deiner, Lager sofort entschieden
  turm() { const z = basis('turm'); zuruecksetzen(z); welle({ seite: 'eigen', von: basis('eigen'), ziel: z, held: 'aldric', name: '[NW]Alex', truppen: 6.2e6 }, 3); blickAuf(z, z); },
  lager() { const z = D.lager; z.truppen = z.truppen0 = z.truppen0 || z.truppen; welle({ seite: 'eigen', von: basis('eigen'), ziel: z, held: 'aldric', name: '[NW]Alex', truppen: 6.2e6 }, 3); blickAuf(z, z); },
  lagerSchwach() { const z = D.lager; z.truppen = z.truppen0 = z.truppen0 || z.truppen; welle({ seite: 'eigen', von: basis('eigen'), ziel: z, held: 'aldric', name: '[NW]Alex', truppen: 5e5 }, 3); blickAuf(z, z); },
};
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
function ankunft(a) {                                 // Welle am Ziel: beitreten, warten oder neuer Kampf (wie 04-kampf.js)
  const k = kaempfe.find(k => k.z === a.ziel);
  const z = a.ziel;
  if (!k && z.art === 'lager') return lagerKampf(a);
  if (!k && z.art === 'basis' && kuerzelVon(z) === a.kuerzel) {   // das Ziel gehört inzwischen dir (ziehen ein) oder deinem Bündnis (kein Kampf, heim)
    if (z.name === a.name) { z.truppen += a.truppen; armeen.splice(armeen.indexOf(a), 1);
      return effekte.push({ art: 'dazu', t0: jetzt, ziel: z, text: `gehört schon dir – ${fmtCompact(a.truppen)} Truppen verstärken die Besatzung` }); }
    effekte.push({ art: 'dazu', t0: jetzt, ziel: z, text: `${ohneTag(z.name)} ist im Bündnis – kein Kampf, ${ohneTag(a.name)} kehrt um` }); return heimwaerts(a); }
  if (!k && z.art === 'basis' && z.schild) {         // Friedensschild hält (welleHeim): kein Kampf, keine Verluste, die Truppen laufen heim
    bandZeigen({ eigen: meins(a) || z === basis('eigen'), art: z === basis('eigen') ? 'sieg' : 'niederlage', ziel: z, titel: 'SCHILD HÄLT',
      text: z === basis('eigen') ? `${ohneTag(a.name)} prallt ab` : 'Dein Angriff prallt ab' });
    return heimwaerts(a); }
  if (!k) return kampf(a);
  if (freund(k.a, a)) return beitreten(k, a);
  if (a.phase !== 'wartet') {                          // fremder Angreifer: stellt sich am Rand auf und wartet
    const h = halt(a), z = a.ziel, d = Math.hypot(h.x - z.x, h.y - z.y) || 1; a.phase = 'wartet'; a.steht = h; hinstellen(a, { x: z.x + (h.x - z.x) / d * (d + 1800), y: z.y + (h.y - z.y) / d * (d + 1800) }); }
}
function schritt(dt) {
  jetzt += dt * tempo;
  for (const a of [...armeen]) {
    if (a.rufen && jetzt >= a.rufen && a.phase === 'hin') { a.rufen = 0; heimwaerts(a, true); }
    const z = a.ziel;
    if (a.phase === 'hin' && jetzt - a.t0 >= a.dauer) {
      if (a.beitritt) { const r = a.beitritt; r.rally.mitglieder.push({ name: a.name, held: a.held, truppen: a.truppen }); r.truppen += a.truppen; r.truppen0 = r.truppen; armeen.splice(armeen.indexOf(a), 1); continue; }
      if (a.art === 'spaeher') { effekte.push({ art: 'licht', t0: jetzt, ziel: z }); if (meins(a)) z.gespaeht = true; heimwaerts(a); continue; }   // (dein Späher: Verstärker dort jetzt bekannt)
      if (a.art === 'sammeln') { feldAnkunft(a); continue; }
      if (a.ohneKampf) { heimwaerts(a); continue; }
      if (a.art === 'verst') { const v = { name: a.name, held: a.held, seite: a.seite, kuerzel: a.kuerzel, truppen: a.truppen };   // steht jetzt in der Basis (Botschaft)
        (z.verst = z.verst || []).push(v); const k = kaempfe.find(k => k.z === z); if (k) verteidigerDazu(k, v);
        armeen.splice(armeen.indexOf(a), 1); continue; }
      if (a.art === 'rally' && !a.angekommen) { a.angekommen = jetzt; effekte.push({ art: 'pfeile', t0: jetzt, ziel: z }); }
      if (a.art !== 'rally' || jetzt - a.angekommen > 1.5) ankunft(a);
    }
    if (a.phase === 'wartet' && !kaempfe.some(k => k.z === a.ziel)) ankunft(a);   // der Kampf ist entschieden: jetzt kämpft sie
    if (a.phase === 'sammelt' && a.art === 'sammeln') { const n = Math.max(0, Math.min(sammelTempo(z) * dt * tempo, z.rest, traglast(a) - a.got));
      a.got += n; z.rest -= n; if (a.got >= traglast(a) - 1e-6 || z.rest <= 0) heimwaerts(a); }
    if (a.phase === 'sammelt' && a.art === 'rally' && jetzt >= a.ende) { a.phase = 'hin'; a.t0 = jetzt; a.start = { x: a.steht.x, y: a.steht.y }; a.steht = null;
      a.dauer = reise(laenge(hinWeg(a))); a.angekommen = 0; }   // (Rally: normales Marsch-Tempo, wie bundRallyLos)
    if (a.phase === 'rueck' && jetzt - a.t0 >= a.dauer) armeen.splice(armeen.indexOf(a), 1);
  }
  for (const k of [...kaempfe]) if (jetzt - k.t0 >= k.dauer) kampfEnde(k);
  for (const a of armeen) if (a.zug && jetzt - a.zug.t0 >= .6) a.zug = null;
  for (let i = effekte.length - 1; i >= 0; i--) if (jetzt - effekte[i].t0 > ({ sieg: 1.9, niederlage: 1.9, blitz: .8, licht: 1, pfeile: 1.5, dazu: 2.5 })[effekte[i].art]) effekte.splice(i, 1);
  if (gewaehlt && !armeen.includes(gewaehlt)) waehlen(null);
}

// ===== Zeichnen =====
const S = () => W >= 700 ? 1.25 : 1;                   // Desktop: alle Pixelwerte ×1,25
function stufeJetzt() { const z = cam.z, k = W >= 700 ? 1.5 : 1; return z >= .016 * k ? 'nah' : z >= .007 * k ? 'mittel' : z >= BILD_ZOOM ? 'weit' : 'ganz weit'; }
const MASS = { nah: { trupp: 56, kopf: 44, linie: 3, pfeil: 18 }, mittel: { trupp: 36, kopf: 32, linie: 2, pfeil: 14 }, weit: { punkt: 8, kopf: 20, linie: 1.5 }, 'ganz weit': { punkt: 6, linie: 1 } };
const P = p => ({ x: sx(p.x), y: sy(p.y) });
const zuMir = a => (a.seite === 'feind' || a.seite === 'barb') && a.ziel === basis('eigen') && a.phase === 'hin';
// Nebel wie im Spiel (03d drawMap, server/03 marsch_teil): fremde Märsche siehst du nur, wenn sie auf DEINE Basis zielen; Bündnis-
// Mitglieder nur, wenn sie zu dir kommen (Rally-Beitritt), mit dir kämpfen oder heimgehen. Fremde Truppenzahl und Helden: unbekannt
// („?“, Fahne statt Held), bis ein Angriff auf deine Basis kämpft – in deinem Kampf (auch gemeinsam) siehst du alle Zahlen.
// Verstärker in einer fremden Basis nur nach einem Späher. „Nebel aus“ zeigt alles (Testansicht).
let nebel = true;
const meins = a => a.seite === 'eigen';
const mitMir = a => a.kampf && (a.kampf.teile.some(meins) || a.kampf.z === basis('eigen'));
const versteckt = a => nebel && !(meins(a) || a.ziel === basis('eigen') || a.beitritt || mitMir(a) || (a.seite === 'bund' && a.phase === 'rueck' && a.warMit));
const bekannt = a => !nebel || meins(a) || a.beitritt || mitMir(a) || a.warMit;
const kampfSichtbar = k => !nebel || k.teile.some(meins) || k.z === basis('eigen');
const verstSichtbar = z => !nebel || z.gespaeht || z === basis('eigen');
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
function restWeg(pts, f) {                             // der noch offene Teil eines Linienzugs ab Anteil f (Knick am Pass bleibt)
  const L = laenge(pts) * Math.max(0, Math.min(1, f)), aus = [aufWeg(pts, f)]; let s = 0;
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (s > L) aus.push(pts[i]); }
  return aus.length > 1 ? aus : [aus[0], pts[pts.length - 1]];
}
function linie(a, st) {
  const m = MASS[st], f = farbeVon(a), t = jetzt;
  if (st === 'ganz weit' && !(a.seite === 'eigen' || zuMir(a))) return;
  const zug = (pts, mal) => { const q = pts.map(P); for (let i = 1; i < q.length; i++) mal(q[i - 1], q[i]); };
  if (a.phase === 'rueck') return zug(restWeg(a.rweg, (jetzt - a.t0) / a.dauer), (p, q) => st === 'nah' || st === 'mittel' ? pfeilkette(p, q, f.haupt, m.linie, m.pfeil, .45, t) : strich(p, q, f.haupt, m.linie, [1.5, 4], .45));
  if (a.phase === 'wartet') return strich(P(pos(a)), P(a.ziel), '#ffd678', 1.5 * S(), [3, 5], .6);   // (wartet: gestrichelt zum Kampf)
  if (a.phase !== 'hin') return;
  const weg = a.beitritt ? [pos(a), a.ziel] : restWeg(hinWeg(a), (jetzt - a.t0) / a.dauer);
  if (a.art === 'spaeher') return zug(weg, (p, q) => strich(p, q, '#ffffff', 1.5, [1.5, 5], .7));
  if (a.art === 'sammeln') return zug(weg, (p, q) => strich(p, q, '#e3b65a', Math.max(1.5, m.linie), [6, 5], .9));
  if (st !== 'nah' && st !== 'mittel') return zug(weg, (p, q) => strich(p, q, zuMir(a) ? '#ff5a4e' : f.haupt, m.linie, [1.5, 4], .85));
  if (a.art === 'rally') return zug(weg, (p, q) => { for (const v of [-6, 0, 6]) pfeilkette(p, q, FARBE.rally.haupt, m.linie * .8, m.pfeil * 1.4, .9, t, v * S()); });
  zug(weg, (p, q) => pfeilkette(p, q, zuMir(a) ? '#ff4a3e' : f.haupt, m.linie, m.pfeil, .85, t));
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
  const p = pos(a), unterwegs = a.phase === 'hin' && !a.beitritt ? restWeg(hinWeg(a), (jetzt - a.t0) / a.dauer) : a.phase === 'rueck' ? restWeg(a.rweg, (jetzt - a.t0) / a.dauer) : null;
  const z = unterwegs ? unterwegs[1] : a.ziel; return { dx: (z.x - p.x) || 1, dy: z.y - p.y };   // (zum nächsten Wegpunkt)
}
function balken(x, y, w, h, anteil, farbe) {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - w / 2, y, w, h);
  if (anteil < .25) g.globalAlpha = .6 + .4 * (.5 + .5 * Math.sin(performance.now() / 600 * Math.PI * 2));
  g.fillStyle = farbe; g.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, anteil)), h); g.globalAlpha = 1;
  g.strokeStyle = '#0c0f14'; g.lineWidth = 1; g.strokeRect(x - w / 2 - .5, y - .5, w + 1, h + 1);
}
function chip(text, x, y, px, farbe = '#eee6d4', grund = 'rgba(10,12,16,.82)', links = false, dick = 600) {
  g.font = `${dick} ${px}px Inter, system-ui, sans-serif`; const tw = g.measureText(text).width, w = tw + 10, h = px + 6, x0 = Math.max(4, Math.min(W - w - 4, links ? x : x - w / 2));   // (am Bildrand nach innen)
  g.fillStyle = grund; g.beginPath(); g.roundRect(x0, y, w, h, h / 2); g.fill();
  g.fillStyle = farbe; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x0 + 5, y + h / 2 + .5); return w;
}
function kopf(a, x, y, w, st, ohneText) {               // Sechseck (Mitte x, y) + Namensband + Lebensbalken (+ Chip bei Nah); → Treffer-Fläche
  if (!bekannt(a) && a.held) a = { ...a, held: null };  // (fremder Held unbekannt: Fahne mit Kürzel)
  const s = S(), k = kopfBild(a, w), h = w * 50 / 44;
  g.drawImage(k, x - w / 2 - 2, y - h / 2 - 2, k.w, k.h);
  if (a.zurueck) bildAn('marsch_zeichen_zurueck', x + w * .42, y - h * .38, 14 * s);
  const fl = { x: x - Math.max(22, w / 2), y: y - Math.max(22, h / 2), w: Math.max(44, w), h: Math.max(44, h) };
  if (ohneText) return fl;
  let yy = y + h / 2 + 2;
  if (st === 'nah') { const b = band(a.name, farbeVon(a).hell, Math.round(11 * s)); g.drawImage(b, x - b.w / 2, yy, b.w, b.h); yy += b.h + 3; }
  const jetztT = a.truppen - teilVerlust(a), anteil = jetztT / a.truppen0;
  balken(x, yy, (st === 'nah' ? 36 : 28) * s, (st === 'nah' ? 5 : 4) * s, anteil, farbeVon(a).haupt);
  const zeit = a.phase === 'kampf' ? '⚔ ' + uhr(rest(a)) : a.phase === 'wartet' ? '⌛ wartet' : '⌛ ' + uhr(rest(a));
  if (a.art !== 'spaeher') {                           // Chip am Sechseck: Truppen · Restzeit (wie beim Rally, auch im Kampf und beim Warten)
    const txt = a.beute ? zeit + ' · Beute' : (bekannt(a) ? fmtCompact(jetztT) : '?') + ' · ' + zeit;
    const px = Math.round((st === 'nah' ? 12 : 11) * s); g.font = `700 ${px}px Inter, system-ui, sans-serif`;
    const lx = x - w / 2 - 4 - g.measureText(txt).width - 10, cx = a.kampf && Math.cos(a.winkel) < -.2 && lx > 4 ? lx : x + w / 2 + 4;   // (links vom Ziel: Chip nach links, nichts überdeckt)
    const cw = chip(txt, cx, y - 8 * s, px, a.phase === 'wartet' ? '#ffd678' : '#fff6dc', 'rgba(10,12,16,.86)', true, 700);
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
    const kw = (st === 'nah' ? 36 : 28) * s, y = p.y - h * .55 - kw * .7, r = 13 * s, ant = Math.min(1, a.got / traglast(a)), px = Math.round((st === 'nah' ? 12 : 11) * s);
    const fl = kopf(a, p.x - 12 * s, y, kw, st, true);      // Kopf + Ring: wie voll die Packen sind (gesammelt / Traglast)
    g.beginPath(); g.arc(p.x + kw * .5 + 4 * s, y, r, 0, 7); g.fillStyle = 'rgba(0,0,0,.6)'; g.fill();
    g.beginPath(); g.arc(p.x + kw * .5 + 4 * s, y, r - 2, -Math.PI / 2, -Math.PI / 2 + ant * Math.PI * 2); g.strokeStyle = '#e3b65a'; g.lineWidth = 3; g.stroke();
    chip(`${fmtCompact(a.truppen)} · ⌛ ${uhr(rest(a))}`, p.x + kw * .5 + 4 * s + r + 4, y - px / 2 - 3, px, '#fff6dc', 'rgba(10,12,16,.86)', true, 700);
    chip(`${fmtCompact(a.got)} / ${fmtCompact(traglast(a))} Holz · Feld ${fmtCompact(a.ziel.rest)}`, p.x, y + kw * .62 + 4 * s, px, '#f3dca0', 'rgba(10,12,16,.86)', false, 700);
    a.flaeche = { x: fl.x, y: fl.y, w: Math.max(fl.w, tf.x + tf.w - fl.x), h: tf.y + tf.h - fl.y }; return;
  }
  const ky = p.y + 6 * s - h * .55 - 4 * s - m.kopf * 50 / 44 / 2 - (st === 'nah' ? 30 * s : 12 * s);   // Kopf über dem Trupp (darunter Band + Balken)
  const fl = kopf(a, p.x, ky, m.kopf * s, st);
  if (a.phase === 'wartet') sanduhr(p.x - m.kopf * s * .5, ky - m.kopf * s * .5, 10 * s);
  if (a.rally && a.art === 'rally') miniKoepfe(a, p.x, ky + m.kopf * s * 50 / 44 / 2 + (st === 'nah' ? 30 : 12) * s, st);
  a.flaeche = { x: Math.min(fl.x, tf.x), y: fl.y, w: Math.max(fl.x + fl.w, tf.x + tf.w) - Math.min(fl.x, tf.x), h: tf.y + tf.h - fl.y };
}
function sanduhr(x, y, r) {                            // Wartezeichen: goldene Sanduhr im dunklen Kreis, pulst
  g.globalAlpha = .7 + .3 * Math.sin(performance.now() / 300);
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = 'rgba(10,12,16,.9)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#ffd678'; g.stroke();
  const q = r * .5; g.beginPath(); g.moveTo(x - q, y - q * 1.2); g.lineTo(x + q, y - q * 1.2); g.lineTo(x - q, y + q * 1.2); g.lineTo(x + q, y + q * 1.2); g.closePath();
  g.fillStyle = '#ffd678'; g.fill(); g.globalAlpha = 1;
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
  const s = S(), t = jetzt - k.t0, z = P(k.z), zw = zielBreite(k.z), teil = i => k.teile[i % k.teile.length], ap = i => P(pos(teil(i)));
  if (st === 'ganz weit' && !k.teile.some(a => a.seite === 'eigen')) return;
  // Boden: rote Doppel-Ellipse, pulst 0,97 ↔ 1,03 (800 ms)
  const puls = 1 + .03 * Math.sin(performance.now() / 800 * Math.PI * 2);
  bildAn('marsch_kampf_kreis', z.x, z.y - zw * .1, zw * 1.3 * puls);
  if (st === 'weit' || st === 'ganz weit') { k.flaeche = { x: z.x - 22, y: z.y - 22, w: 44, h: 44 }; return; }
  // Lichtsäule mit Schwertern über dem Ziel
  g.globalAlpha = .8; bildAn('marsch_kampf_saeule', z.x, z.y - zw * .1, Math.max(48 * s, zw * .55), .5, .92); g.globalAlpha = 1;
  // Verteidiger-Kopf über dem Ziel
  const vk = { seite: k.z.seite, held: k.z.held, name: k.z.art === 'lager' ? `Lager Stufe ${k.z.stufe}` : k.z.name, truppen: k.d0, truppen0: k.d0, phase: 'kampf', kuerzel: kuerzelVon(k.z), zurueck: false };
  const m = MASS[st], vy = z.y - zw * .62 - m.kopf * s * .5 - 20 * s;
  const vkh = kopf(vk, z.x, vy, m.kopf * s, st, true);
  const lagerBand = st === 'nah' && k.z.art === 'lager';   // (Basen tragen ihr Namensschild schon auf der Karte: nicht doppelt)
  if (lagerBand) { const b = band(vk.name, FARBE[k.z.seite].hell, Math.round(11 * s)); g.drawImage(b, z.x - b.w / 2, vy + m.kopf * s * 50 / 44 / 2 + 2, b.w, b.h); }
  balken(z.x, vy + m.kopf * s * 50 / 44 / 2 + (lagerBand ? 20 : 4) * s, (st === 'nah' ? 36 : 28) * s, (st === 'nah' ? 5 : 4) * s, 1 - kampfStand(k, 'd') / k.d0, FARBE[k.z.seite].haupt);
  // Besatzung am Sechseck (sinkt im Kampf), Verstärker daneben je mit Sechseck; Tafel über dem Verteidiger: beide Seiten zusammen
  const dRest = k.d0 - kampfStand(k, 'd'), aRest = k.a0 - kampfStand(k, 'a'), px = Math.round((st === 'nah' ? 12 : 11) * s);
  const vp = verstSichtbar(k.z) ? verstKoepfe(k.z, st, k) : [];
  chip(fmtCompact(k.g0 - verstVerlust(k, k.g0)) + ' · ⚔ ' + uhr(k.dauer - t), z.x + m.kopf * s / 2 + 4, vy - 8 * s, px, FARBE[k.z.seite].hell, 'rgba(10,12,16,.86)', true, 700);
  g.font = `700 ${px}px Inter, system-ui, sans-serif`;
  const links = (k.teile.length > 1 ? k.teile.length + ' Armeen · ' : '') + fmtCompact(aRest), rechts = fmtCompact(dRest), lw = g.measureText(links).width, rw = g.measureText(rechts).width;
  const tw = lw + rw + 34 * s, ty = vy - m.kopf * s * .62 - px - 14 * s, tx = z.x - tw / 2;   // (über dem Verteidiger: nichts überdeckt)
  g.fillStyle = 'rgba(10,12,16,.88)'; g.beginPath(); g.roundRect(tx, ty, tw, px + 8, (px + 8) / 2); g.fill();
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = farbeVon(k.a).hell; g.fillText(links, tx + 7, ty + (px + 8) / 2 + .5);
  g.fillStyle = '#ffd678'; g.textAlign = 'center'; g.fillText('⚔', tx + lw + 17 * s, ty + (px + 8) / 2 + .5);
  g.textAlign = 'left'; g.fillStyle = FARBE[k.z.seite].hell; g.fillText(rechts, tx + tw - rw - 7, ty + (px + 8) / 2 + .5);
  k.flaeche = { x: z.x - zw * .65, y: ty, w: zw * 1.3, h: z.y + zw * .3 - ty };
  // Geschosse: je Seite alle 250–400 ms 1–3 Stück, Bogen 450 ms, 30 px hoch, Einschlag = 6 Funken
  for (const sd of ['a', 'd']) if (t >= k.naechst[sd] && t < k.dauer - .5) {
    k.naechst[sd] = t + .25 + Math.random() * .15;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) k.geschosse.push({ sd, t0: t + i * .06, art: sd === 'd' ? (Math.random() < .5 ? 'marsch_geschoss_pfeil_feuer' : 'marsch_geschoss_stein') : 'marsch_geschoss_pfeil', dx: (Math.random() - .5) * 16, dy: (Math.random() - .5) * 10, i: Math.floor(Math.random() * 9) });
  }
  const ziel = q => q.sd === 'a' ? { x: z.x, y: z.y - zw * .2 } : ap(q.i);   // (jede Armee im Kampf schießt und wird beschossen)
  const vonP = q => q.sd === 'a' ? { x: ap(q.i).x, y: ap(q.i).y - 10 } : { x: z.x, y: z.y - zw * .35 };
  for (let i = k.geschosse.length - 1; i >= 0; i--) { const q = k.geschosse[i], f = (t - q.t0) / .45;
    if (f < 0) continue;
    const p0 = vonP(q), p1 = ziel(q);
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
  const dTeil = w => w.i % (vp.length + 1);            // (Verteidiger-Welle: trifft die Besatzung oder einen Verstärker, Zahl = sein Anteil)
  const hk = w => w.s === 'a' ? { x: ap(w.i).x - m.kopf * s * .5 - 34 * s, y: ap(w.i).y - 70 * s }   // (links neben dem Kopf: rechts steht der Chip)
    : dTeil(w) ? { x: vp[dTeil(w) - 1].x + (vp[dTeil(w) - 1].x > z.x ? 1 : -1) * 52 * s, y: vp[dTeil(w) - 1].y } : { x: z.x - m.kopf * s * .5 - 30 * s, y: vy };   // (neben dem Sechseck: nichts überdeckt)
  const zahl = w => w.s === 'a' || !vp.length ? w.n : Math.max(1, Math.round(w.n * (dTeil(w) ? vp[dTeil(w) - 1].n : k.g0) / k.d0));
  const aktiv = k.wellen.filter(w => t >= w.t && t < w.t + .9).slice(-4);
  for (const w of aktiv) { const d = t - w.t, gross = w.n > (w.s === 'a' ? k.a0 : k.d0) * .1, px = Math.round((gross ? 16 : 13) * s);
    const eigen = (w.s === 'a' && teil(w.i).seite === 'eigen') || (w.s === 'd' && k.z.seite === 'eigen');
    g.globalAlpha = d < .6 ? 1 : 1 - (d - .6) / .3; g.font = `800 ${px}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = hk(w).x, y = hk(w).y - 34 * s * d / .9;
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText('-' + fmtCompact(zahl(w)), x, y);
    g.fillStyle = gross && d < .25 ? '#ffd678' : eigen ? '#ff8d82' : '#ffffff'; g.fillText('-' + fmtCompact(zahl(w)), x, y); }
  g.globalAlpha = 1;
}
function brandZeichnen(x, y, u) {                     // geplünderte Hauptstadt brennt (wie drawBrand, 03b): Rauch steigt, Flammen auf den Dächern
  const t = performance.now(); g.save();
  for (let i = 0; i < 5; i++) { const p = ((t / 2600) + i / 5) % 1, px = x + Math.sin(i * 2.1 + p * 3) * 8 * u + p * 10 * u, py = y - 16 * u - p * 46 * u, r = (5 + p * 14) * u;
    g.fillStyle = 'rgba(40,36,34,' + (.42 * (1 - p)) + ')'; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'lighter';
  for (const [dx, dy, sk] of [[-12, 2, 1], [9, -4, 1.15], [0, -12, .9], [15, 6, .8], [-5, 8, .75]]) {
    const f = .75 + .25 * Math.sin(t / 90 + dx * 1.7) * Math.sin(t / 133 + dy), fx = x + dx * u, fy = y + dy * u, h = 13 * sk * f * u;
    const gr = g.createRadialGradient(fx, fy - h * .3, 0, fx, fy - h * .3, h);
    gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(.35, 'rgba(255,150,40,.75)'); gr.addColorStop(1, 'rgba(200,40,10,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(fx, fy - h * .35, h * .5, h, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function verstKoepfe(z, st, k) {                       // Verstärker in der Basis (Botschaft): je ein Sechseck mit Name, Truppen, Balken – rechts/links neben dem Verteidiger
  const vs = z.verst || []; if (!vs.length || (st !== 'nah' && st !== 'mittel')) return [];
  const s = S(), p = P(z), zw = zielBreite(z), m = MASS[st], vy = p.y - zw * .62 - m.kopf * s * .5 - 20 * s, w = m.kopf * s * .78, px = Math.round(10.5 * s);
  return vs.map((v, i) => {
    const x = p.x + (i % 2 ? -1 : 1) * (78 * s + Math.floor(i / 2) * 118 * s), y = vy + m.kopf * s * 1.05, n = v.truppen - (k ? verstVerlust(k, v.truppen) : 0);
    kopf({ ...v, zurueck: false, rally: false }, x, y, w, st, true);
    const ty = y + w * 50 / 44 / 2 + 2 * s;
    chip(`${v.name.replace(/^\[\w+\]/, '')} · ${fmtCompact(n)}`, x, ty, px, FARBE[v.seite].hell, 'rgba(10,12,16,.86)', false, 700);
    balken(x, ty + px + 9 * s, 30 * s, 4 * s, n / v.truppen, FARBE[v.seite].haupt);
    return { x, y, n: v.truppen };
  });
}
function effektZeichnen(e, st) {
  const s = S(), t = jetzt - e.t0, z = P(e.ziel), zw = zielBreite(e.ziel);
  if (e.art === 'licht') { g.beginPath(); g.ellipse(z.x, z.y, 40 * s * t, 16 * s * t, 0, 0, 7); g.strokeStyle = `rgba(255,255,255,${1 - t})`; g.lineWidth = 3; g.stroke(); return; }
  if (e.art === 'blitz') { g.globalAlpha = Math.max(0, 1 - t / .8); bildAn('marsch_sieg_blitz', z.x, z.y - zw * .3, zw * (1 + t)); g.globalAlpha = 1; return; }
  if (e.art === 'dazu') {                              // Verstärkung im Kampf: Hinweis über dem Ziel, steigt und blendet aus (wie flashHint im Spiel)
    g.globalAlpha = Math.min(1, (2.5 - t) * 2);
    const cy = z.y - zw * .62 - (MASS[st] && MASS[st].kopf || 32) * S() * 1.3 - 66 * S() - t * 14 * S();
    const cw = chip(e.text, z.x, cy, Math.round(12 * S()), e.feind ? '#ffd2c8' : '#e2ffd8', e.feind ? 'rgba(82,21,15,.92)' : 'rgba(31,74,34,.92)', false, 700);
    if (e.beute) beuteKachel(e.beute, Math.min(W - 30 * S(), z.x + cw / 2 + 4), cy - 4 * S(), 24 * S());   // (Münzen: Bild + Zahl)
    g.globalAlpha = 1; return;
  }
  if (e.art === 'pfeile') {                            // Rally kommt an: Pfeile von allen Seiten (wie lm_1), 1,5 s
    g.globalAlpha = Math.min(1, (1.5 - t) * 2);
    for (let i = 0; i < 14; i++) { const w = i / 14 * Math.PI * 2, r0 = 120 * s, d = (t * 60 * s + i * 7) % (90 * s), r = r0 - d;
      const x = z.x + Math.cos(w) * r, y = z.y - zw * .2 + Math.sin(w) * r * .55, ux = -Math.cos(w), uy = -Math.sin(w) * .55, q = 7 * s;
      g.beginPath(); g.moveTo(x - ux * q - uy * q, y - uy * q + ux * q); g.lineTo(x, y); g.lineTo(x - ux * q + uy * q, y - uy * q - ux * q);
      g.strokeStyle = '#eab24a'; g.lineWidth = 3.5 * s; g.stroke(); }
    g.globalAlpha = 1; return;
  }
  // Sieg / Niederlage (Titel wie spawnBattleFx: Sieg, Geplündert, Lager besiegt, Abgewehrt …): Band am Bildrand, 60 % breit,
  // rein 250 ms (0,6 → 1,05 → 1), steht 1,25 s, raus 400 ms
  const sieg = e.art === 'sieg', bw = Math.min(320, W * .6), im = BILD[sieg ? 'marsch_band_sieg' : 'marsch_band_niederlage']; if (!im) return;
  const sk = t < .17 ? .6 + .45 * t / .17 : t < .25 ? 1.05 - .05 * (t - .17) / .08 : 1, al = t > 1.5 ? Math.max(0, 1 - (t - 1.5) / .4) : 1;
  const bh = bw * im.height / im.width, x = Math.max(bw / 2 + 4, Math.min(W - bw / 2 - 4, z.x)), y = z.y > HT * .55 ? $('leiste').getBoundingClientRect().bottom + 40 + bh / 2 : HT - bh / 2 - 40;   // (am Bildrand, weg vom Ziel: nie über Köpfen und Zahlen)
  g.save(); g.globalAlpha = al; g.translate(x, y); g.scale(sk, sk);
  g.drawImage(im, -bw / 2, -bh / 2, bw, bh);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const titel = e.titel || (sieg ? 'SIEG' : 'NIEDERLAGE'); g.font = `900 ${Math.round(Math.min(bw / 10, bw * .6 / (titel.length * .78)))}px Cinzel, Georgia, serif`;   // (langer Titel passt aufs Band)
  if (sieg) { g.fillStyle = '#1d1406'; g.fillText(titel, 0, bh * .1); }
  else { g.lineWidth = 3; g.strokeStyle = 'rgba(40,6,4,.8)'; g.strokeText(titel, 0, 0); g.fillStyle = '#ffc1b8'; g.fillText(titel, 0, 0); }
  g.font = `700 ${13 * S()}px Inter, system-ui, sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(e.text, 0, bh / 2 + 12 * S());
  g.fillStyle = sieg ? '#fff3d6' : '#ffc1b8'; g.fillText(e.text, 0, bh / 2 + 12 * S());
  if (e.beute) beuteKachel(e.beute, g.measureText(e.text).width / 2 + 8, bh / 2, 26 * S());   // (Beute ins Abholfach: Bild + Zahl)
  g.restore();
}
function rallyPlatz(a, st) {                           // Rally sammelt: goldener Bodenring dreht (12°/s) + Countdown-Chip
  const s = S(), p = P(a.steht), im = BILD.marsch_ring_gold; if (!im) return;
  const r = 35 * s * (st === 'nah' ? 1.6 : 1);
  g.save(); g.translate(p.x, p.y); g.scale(1, .38); g.rotate(jetzt * 12 * Math.PI / 180); g.drawImage(im, -r, -r, 2 * r, 2 * r); g.restore();
  if (st === 'nah' || st === 'mittel') chip(`Rally ⌛ ${uhr(a.ende - jetzt)} · ${a.rally.mitglieder.length}/${a.rally.platz}`, p.x, p.y + r * .38 + 6 * s, Math.round(11 * s), '#1d1406', 'rgba(234,178,74,.95)');
}
function schildSetzen(name, an) { for (const b of D.basen) if (b.name === name) b.schild = an; }   // (der Schild deckt alle Basen des Besitzers)
function schildZeichnen(b) {                           // Friedensschild: helle Kuppel über der Basis (wie 03c), pulst
  const w = zielBreite(b), x = sx(b.x), R = w * .5, y = sy(b.y) - w * .2, ph = .6 + .4 * Math.sin(performance.now() / 700);
  const gd = g.createRadialGradient(x, y, R * .3, x, y, R);
  gd.addColorStop(0, 'rgba(210,235,255,.12)'); gd.addColorStop(.7, `rgba(190,225,255,${(.28 * ph).toFixed(2)})`); gd.addColorStop(1, `rgba(230,245,255,${(.6 * ph).toFixed(2)})`);
  g.fillStyle = gd; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(10,30,60,.35)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, R + 1, 0, 7); g.stroke();
  g.strokeStyle = `rgba(225,242,255,${(.75 + .25 * ph).toFixed(2)})`; g.lineWidth = 2.6; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
}
function warnung(st) {                                 // Feind auf dich zu: rotes Warn-Dreieck an deiner Burg, pulst (mit Schild: „prallt ab“)
  if (!armeen.some(zuMir)) return;
  if (basis('eigen').schild) { const e = P(basis('eigen')), s = S(); return chip('Friedensschild hält – prallt ab', e.x, e.y + zielBreite(basis('eigen')) * .4, Math.round(11 * s), '#e2f2ff', 'rgba(16,40,70,.9)', false, 700); }
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
  const zu = armeen.filter(a => !versteckt(a)); for (const a of armeen) if (versteckt(a)) a.flaeche = a.ringFlaeche = null;
  for (const a of zu) linie(a, st);
  for (const a of zu) zielRing(a, st);
  for (const b of D.basen) if (b.schild && st !== 'ganz weit') schildZeichnen(b);
  for (const b of D.basen) if (b.brennt > jetzt && st !== 'ganz weit') { const w = zielBreite(b); brandZeichnen(sx(b.x), sy(b.y) - w * .3, w / 64); }
  for (const k of kaempfe) if (kampfSichtbar(k)) kampfZeichnen(k, st); else k.flaeche = null;
  for (const b of D.basen) if (b.verst && b.verst.length && verstSichtbar(b) && !kaempfe.some(k => k.z === b)) verstKoepfe(b, st, null);
  warnung(st);
  for (const a of zu.sort((x, y) => pos(x).y - pos(y).y)) armeeZeichnen(a, st);
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
  const b = bekannt(a);
  karteInfo(a.name, [`Held: ${!b ? '?' : a.held ? a.held[0].toUpperCase() + a.held.slice(1) : '–'}`, `Truppen: ${b ? fmtCompact(a.truppen - teilVerlust(a)) : '? (Nebel)'}`,
    `Ziel: ${a.ziel.name || 'Rally-Platz'}`, a.phase === 'wartet' ? 'Wartet, bis der Kampf entschieden ist' : `${a.phase === 'rueck' ? 'Heimweg' : a.phase === 'kampf' ? 'Kampf läuft' : 'Restzeit'}: ⌛ ${uhr(rest(a))}`]);
}
// Zurückrufen wie recallMarch (02b): kehrt am Ort um; im Kampf „zu spät“; eine Rally nie; Späher ohne Bericht; Sammler mit Ladung.
// Beschleunigen wie speedUpMarch/speedUpAll: halbiert die Restzeit (Ort bleibt), kostet 1 Edelstein je angefangene Restminute,
// ab 500 Edelsteinen erst „Wirklich?“ (gemsWirklich), nicht im Kampf; „Alle schneller“ für alle eigenen Märsche.
const GEMS_WIRKLICH = 500;
const hinweis = (a, text) => effekte.push({ art: 'dazu', t0: jetzt, ziel: pos(a), feind: true, text });
const schnellKosten = a => Math.max(1, Math.ceil(rest(a) / 60));
const schnellBar = a => meins(a) && (a.phase === 'hin' || a.phase === 'rueck') && rest(a) >= 1.5;
let wirklich = null;                                   // { key, t } – zweiter Tipp innerhalb 4 s bestätigt
function edelsteineZahlen(key, kosten, knopf, a) {     // → true: jetzt zahlen
  if (D.edelsteine < kosten) { effekte.push({ art: 'dazu', t0: jetzt, ziel: a ? pos(a) : basis('eigen'), feind: true, text: `Zu wenig Edelsteine – Beschleunigen kostet ${NF.format(kosten)}.` }); return false; }
  if (kosten >= GEMS_WIRKLICH && !(wirklich && wirklich.key === key && performance.now() - wirklich.t < 4000)) {
    wirklich = { key, t: performance.now() }; if (knopf) { knopf.classList.add('wirklich'); const l = knopf.querySelector('span') || knopf; l.textContent = `Wirklich? 💎 ${NF.format(kosten)}`; } return false; }
  wirklich = null; D.edelsteine -= kosten; return true;
}
function halbieren(a) { const f = Math.min(.99, (jetzt - a.t0) / a.dauer); a.dauer = rest(a) / 2 / (1 - f); a.t0 = jetzt - f * a.dauer; }
function alleSchneller(knopf) {
  const l = armeen.filter(schnellBar); if (!l.length) return;
  const k = l.reduce((x, a) => x + schnellKosten(a), 0); if (!edelsteineZahlen('alle', k, knopf, l[0])) return;
  l.forEach(halbieren); effekte.push({ art: 'dazu', t0: jetzt, ziel: pos(l[0]), text: `${l.length} ${l.length === 1 ? 'Marsch' : 'Märsche'} beschleunigt – Restzeit halbiert.` });
  if (knopf) { knopf.classList.remove('wirklich'); knopf.textContent = 'Alle schneller'; }
}
const KNOPF = {
  info: ['ui_sym_rolle', 'Info', a => infoArmee(a)],
  zurueck: ['ui_sym_rueckzug', 'Zurück', a => {
    if (a.kampf) return hinweis(a, 'Die Truppen kämpfen schon – zu spät zum Zurückrufen.');
    if (a.art === 'rally') return hinweis(a, 'Eine Rally gehört allen, die mitmachen – sie kann nicht zurückgerufen werden.');
    if (a.phase === 'hin' || a.phase === 'sammelt') { heimwaerts(a, true); hinweis(a, a.art === 'spaeher' ? 'Dein Späher kehrt um.' : 'Deine Truppen kehren um.'); } waehlen(null); }],
  schneller: ['ui_edelstein', 'Schneller', (a, knopf) => { if (!schnellBar(a) || !edelsteineZahlen('m' + a.id, schnellKosten(a), knopf, a)) return; halbieren(a); waehlen(a); }],
  rally: ['ui_sym_rally', 'Rally', a => karteInfo('Rally', a.rally.mitglieder.map(m => `${m.name} · ${fmtCompact(m.truppen)}`))],
  angreifen: ['ui_sym_schwert', 'Angreifen', a => { const b = basis('eigen'); armee({ seite: 'eigen', von: b, ziel: { x: pos(a).x, y: pos(a).y, art: 'feld', name: a.name }, held: 'aldric', name: '[NW]Alex', truppen: 12.4e6, ohneKampf: true }); waehlen(null); }],
  spaehen: ['ui_sym_spaeher', 'Spähen', a => { const b = basis('eigen'), q = pos(a); armee({ seite: 'eigen', art: 'spaeher', von: b, ziel: { x: q.x, y: q.y, art: 'feld', name: a.name }, name: '[NW]Alex', truppen: 1, dauer: 4 }); waehlen(null); }],
};
function waehlen(a) {
  gewaehlt = a; const box = $('knoepfe'); box.innerHTML = '';
  if (!a) return;
  const liste = a.seite === 'eigen' ? ['info', 'zurueck', ...(a.kampf ? [] : ['schneller']), ...(a.rally ? ['rally'] : [])] : ['info', 'angreifen', 'spaehen'];
  for (const n of liste) { const [bild, text, tun] = KNOPF[n], b = document.createElement('button'); b.dataset.knopf = n;
    b.innerHTML = `<img alt="" src="${quelle(bild, SPIEL_BILD_PFAD)}"><span>${text}</span>` + (n === 'schneller' ? `<i>${schnellKosten(a)}</i>` : '');   // (Preis in Edelsteinen)
    b.addEventListener('click', e => { e.stopPropagation(); tun(a, b); }); box.appendChild(b); }
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
  for (const k of kaempfe) if (drin(k.flaeche, x, y)) return karteInfo('Kampf', [`<b>Angreifer</b>: ${fmtCompact(k.a0 - kampfStand(k, 'a'))} / ${fmtCompact(k.a0)}`,
    ...k.teile.map(a => `· ${a.name}: ${fmtCompact(a.truppen - teilVerlust(a))}`), `<b>${k.z.name}</b>: ${fmtCompact(k.d0 - kampfStand(k, 'd'))} / ${fmtCompact(k.d0)}`,
    ...armeen.filter(a => a.phase === 'wartet' && a.ziel === k.z).map(a => `${a.name} wartet: ${fmtCompact(a.truppen)}`), `Kampf läuft ⌛ ${uhr(k.dauer - (jetzt - k.t0))}`]);
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
$('alle').addEventListener('click', e => alleSchneller(e.target));
$('drei').addEventListener('click', () => { dreiAngriffe(); zustandText = '3 Angriffe'; });
document.querySelectorAll('#mehr [data-erg]').forEach(b => b.addEventListener('click', () => { ERGEBNIS[b.dataset.erg](); zustandText = b.textContent; }));
document.querySelectorAll('#mehr [data-dazu]').forEach(b => b.addEventListener('click', () => { DAZU[b.dataset.dazu](); zustandText = b.textContent; }));
$('gedraenge').addEventListener('click', () => { gedraenge(); $('bps').style.display = 'block'; zustandText = 'Gedränge'; });
$('nacht').addEventListener('click', e => { nacht = !nacht; e.target.textContent = nacht ? 'Nacht an' : 'Nacht aus'; e.target.classList.toggle('an', nacht); });
$('nebel').addEventListener('click', e => { nebel = !nebel; e.target.textContent = nebel ? 'Nebel an' : 'Nebel aus'; e.target.classList.toggle('an', nebel); });
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
    $('zeile').innerHTML = `<b>${ZOOM_NAME[{ nah: 'nah', mittel: 'mittel', weit: 'weit', 'ganz weit': 'ganz' }[stufeJetzt()]]}</b> · ${zustandText} · ${armeen.length} Armeen · 💎 ${NF.format(D.edelsteine)} · ${bps} Bilder/s`; }
  requestAnimationFrame(bild);
}
ZUSTAND.marsch(); seite = 'feind'; ZUSTAND.marsch(); seite = 'eigen'; zustandText = 'Marsch';
lage(); zoomStufe('nah', D.mitte.x, D.mitte.y - 4000); zoomText();
requestAnimationFrame(bild);
window.MT = { set nebel(v) { nebel = v; }, versteckt, bekannt, armeen, kaempfe, effekte, ZUSTAND, DAZU, ERGEBNIS, dreiAngriffe, zuruecksetzen, D, tippen, waehlen, get bps() { return bps; }, get jetzt() { return jetzt; }, set tempo(v) { tempo = v; },
  bereit: () => KB.fertig && !bilderOffen, stufe: stufeJetzt, flaeche: a => a.flaeche, gedraenge: () => $('gedraenge').click() };
})();
