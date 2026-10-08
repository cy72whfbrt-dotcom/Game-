// Marschtest: erfundene Basen, Lager und Felder um einen Startplatz (nur Anzeige). Liegt vor kartentest.js, damit Feld und Lager
// in dessen Gelände-Liste kommen. Abstände wie „Nah“: eine Stadt zur nächsten ≈ ein Handy-Bildschirm.
'use strict';
const MARSCH_DATEN = (() => {
  const M = { x: 653349, y: -592249 };                 // Mitte: Startplatz in Gebiet 27 (weit weg von Grenzen und Pässen)
  // vert: Verteidigungswert der Basis (Stufe, Mauer …; wie effectiveDefense) · haupt: Hauptstadt (nie eroberbar, wird geplündert)
  // gold/schutz: Münzen des Besitzers und sein Burg-Schutz (Beute = 10 % über dem Schutz, wie plunderOf)
  const basis = (id, dx, dy, seite, name, held, bild, truppen, mehr) => Object.assign({ id, art: 'basis', x: M.x + dx, y: M.y + dy, seite, name, held, bild, truppen, vert: 0, haupt: true }, mehr);
  const basen = [
    basis('eigen', 0, 6000, 'eigen', '[NW]Alex', 'aldric', 9, 12.4e6, { vert: 3e6 }),
    basis('mira', -12000, -8000, 'bund', '[NW]Mira_7', 'mira', 6, 3.6e6),
    basis('bjarne', 11000, -13000, 'bund', '[NW]Bjarne', 'bruno', 5, 2.9e6),
    basis('kevin', 5000, -19000, 'feind', '[RX]Kevin_93', 'hagen', 11, 8.1e6, { vert: 2e6, gold: 42e6, schutz: 12e6 }),
    basis('wulf', 48745, 340018, 'feind', '[DK]Wulfgar', 'yrsa', 7, 3.1e6, { vert: 1e6, haupt: false }),   // hinter dem Pass (Gebiet 28)
    basis('turm', 17000, -27000, 'feind', '[RX]Kevin_93', 'hagen', 3, 2.4e6, { vert: .8e6, haupt: false }),   // ein Turm von Kevin: eroberbar
    basis('sturm', -10000, 22000, 'feind', '[RX]Sturmfaust', 'ragna', 8, 16.8e9),
  ];
  const lager = { id: 'lager', art: 'lager', x: M.x - 14000, y: M.y - 21000, seite: 'barb', name: 'Barbaren-Lager', stufe: 7, truppen: 1.2e6 };
  const feld = { id: 'feld', art: 'feld', x: M.x + 14000, y: M.y + 13000, seite: 'barb', name: 'Holz-Feld', stufe: 4, rest: 412000, voll: 600000 };
  const sp = KARTE_ZONEN.startplaetze; sp.splice(sp.findIndex(o => o.x === M.x && o.y === M.y), 1);   // (dort steht jetzt die eigene Burg)
  KARTE_ZONEN.barbaren.push({ x: lager.x, y: lager.y, gebiet: 27, stufe: lager.stufe });
  KARTE_ZONEN.felder.push({ x: feld.x, y: feld.y, gebiet: 27, art: 'holz', stufe: feld.stufe });
  const pass = { x: 699257, y: -272032, besitzer: '[DK]Wulfgar', stufe: 3 };   // Pass 8 (Gebiet 27 → 28) mit Tor von Wulfgar, Maut-Stufe 3 (0,5)
  return { mitte: M, basen, lager, feld, pass, muenzen: 2e6, edelsteine: 2000 };
})();
