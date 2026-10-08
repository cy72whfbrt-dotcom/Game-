# Schneidet die KI-Bilder der Marsch-Vorgabe (design_marsch.md Abschnitt 3) in Einzelteile marsch_*.webp.
#   python3 -I werkzeuge/marschtest/marsch_bilder_schneiden.py <ordner> [<zielordner>, Standard werkzeuge/marschtest/bilder]
# Im Ordner entweder marsch_alle.png (alle 4 Blätter als 2×2 Viertel, durch weiße Linien getrennt: oben links trupps, oben rechts
# sonder, unten links kampf, unten rechts rahmen) oder die 4 Blätter einzeln (marsch_trupps.png …).
# Die Teile stehen in Lese-Reihenfolge des Rasters (Reihe für Reihe, links nach rechts).
# Freistellen: echte Transparenz → Kern = Alpha > 60, jedes Stück des Kerns gehört zur nächsten Mitte (Fahnen, Schwerter und
# Funken ragen oft über die Rastergrenze). Weiche Glüh-Ränder bleiben (Alpha um den Kern herum), blasser Dunst (Alpha < 14) fällt weg.
# Ohne Transparenz: Abstand zur Randfarbe des Blatts. Teil knapp beschnitten, längste Seite = Größe in px.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

QUELLE = sys.argv[1]
ZIEL = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bilder')

T = lambda s: [f'marsch_trupp_{s}_{a}' for a in ('runter', 'hoch', 'kampf', 'verletzt')]
# Blatt (Raster wie im Prompt, z. B. trupps 3 Spalten × 4 Reihen): ([(Name oder (Name links, Name rechts), längste Seite px)], Mitten je Name als Anteil (x, y) am Blatt –
# gemessen am KI-Bild vom 8.10.; ein neues Bild mit anderer Lage: Mitten anpassen) – Reihenfolge wie im Prompt
BLAETTER = {
    'marsch_trupps': ([(n, 256) for r in zip(T('eigen'), T('bund'), T('feind')) for n in r],
                      [(x, y) for y in (.13, .36, .6, .85) for x in (.17, .48, .79)]),
    'marsch_sonder': ([('marsch_spaeher', 256), ('marsch_trupp_sammler', 256), ('marsch_trupp_rally', 320),
                             ('marsch_zeichen_zurueck', 128), (('marsch_geschoss_pfeil_feuer', 'marsch_geschoss_pfeil'), 128), ('marsch_geschoss_stein', 128)],
                      [(.16, .33), (.48, .36), (.82, .34), (.18, .77), (.42, .74), (.58, .87), (.82, .78)]),
    'marsch_kampf': ([('marsch_kampf_kreis', 512), ('marsch_ring_gold', 384), ('marsch_kampf_saeule', 448), ('marsch_sieg_blitz', 384)],
                     [(.27, .2), (.76, .2), (.25, .56), (.74, .67)]),
    'marsch_rahmen': ([('marsch_rahmen_eigen', 200), ('marsch_rahmen_bund', 200), ('marsch_rahmen_feind', 200), ('marsch_rahmen_gold', 200),
                             ('marsch_band_sieg', 640), ('marsch_band_niederlage', 640), ('marsch_fahne_leer', 128), ('marsch_zeichen_warnung', 128)],
                      [(.13, .27), (.37, .27), (.61, .27), (.85, .27), (.19, .75), (.46, .77), (.73, .7), (.9, .8)]),
}
VIERTEL = ['marsch_trupps', 'marsch_sonder', 'marsch_kampf', 'marsch_rahmen']   # in marsch_alle.png: oben links, oben rechts, unten links, unten rechts


def viertel(bild):   # marsch_alle.png → 4 Blätter, ohne die weißen Trennlinien
    weiss = (bild[:, :, :3].min(axis=2) > 225) & (bild[:, :, 3] > 200)
    h, w = weiss.shape
    def linie(anteil, achse, n):   # Linie nahe der Mitte: Reihen/Spalten, die fast ganz weiß sind
        idx = [i for i in np.nonzero(anteil > .8)[0] if abs(i - n / 2) < n * .15]
        return (min(idx), max(idx) + 1) if idx else (n // 2, n // 2)
    y0, y1 = linie(weiss.mean(axis=1), 1, h)
    x0, x1 = linie(weiss.mean(axis=0), 0, w)
    r = 3   # (Saum der Linie)
    stuecke = [bild[:max(0, y0 - r), :max(0, x0 - r)], bild[:max(0, y0 - r), x1 + r:], bild[y1 + r:, :max(0, x0 - r)], bild[y1 + r:, x1 + r:]]
    return {n: s.copy() for n, s in zip(VIERTEL, stuecke)}


def kern(bild, alpha):
    if alpha:
        k = bild[:, :, 3] > 60
    else:
        rgb = bild[:, :, :3].astype(np.float32)
        rand = np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)])
        k = ndimage.gaussian_filter(np.abs(rgb - np.median(rand, axis=0)).max(axis=2), 1) > 40
    k = ndimage.binary_opening(k, iterations=1)
    weiss = (bild[:, :, :3].min(axis=2) > 235) & (bild[:, :, 3] > 200)   # weiße Rand-/Trennlinien gehören zu keinem Teil
    rand = np.zeros_like(k); rand[:6], rand[-6:], rand[:, :6], rand[:, -6:] = True, True, True, True
    return k & ~(weiss & ndimage.binary_dilation(rand, iterations=8))


def zuteilen(k, saat):   # Kern → Teile: jedes Stück des Kerns zur nächsten Saat; Stücke, die über Glanz/Staub mehrere Teile verbinden, pixelweise
    h, w = k.shape
    sy, sx = np.array([q[1] * h for q in saat]), np.array([q[0] * w for q in saat])
    yy, xx = np.mgrid[0:h, 0:w]
    naechste = np.argmin([(xx - x) ** 2 + (yy - y) ** 2 for x, y in zip(sx, sy)], axis=0)
    lab, n = ndimage.label(k)
    teile = [np.zeros_like(k) for _ in saat]
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = lab[sl] == i + 1
        if m.sum() < 30:
            continue
        z = np.bincount(naechste[sl][m], minlength=len(saat))
        if z.max() >= .9 * m.sum():
            teile[int(z.argmax())][sl] |= m
        else:
            for j in np.nonzero(z)[0]:
                teile[j][sl] |= m & (naechste[sl] == j)
    return teile


def speichern(bild, t, mein, name, px, alpha):   # mein: Pixel, deren nächster Kern dieses Teil ist (kein Stück vom Nachbarn)
    weich = ndimage.binary_dilation(t, iterations=14) & mein   # Glüh-Rand um den Kern behalten
    if alpha:
        a = np.where(weich, bild[:, :, 3], 0)
        a = np.where(a < 14, 0, a).astype(np.uint8)
    else:
        a = (ndimage.gaussian_filter(t.astype(np.float32), .8) * 255).astype(np.uint8)
    ys, xs = np.nonzero(a > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    st = Image.fromarray(np.dstack([bild[:, :, :3], a])[y0:y1, x0:x1], 'RGBA')
    k = px / max(st.size)
    st.resize((max(1, round(st.size[0] * k)), max(1, round(st.size[1] * k))), Image.LANCZOS).save(
        os.path.join(ZIEL, name + '.webp'), 'WEBP', quality=90, method=6)
    print(name, st.size, '->', px)


os.makedirs(ZIEL, exist_ok=True)
alle = os.path.join(QUELLE, 'marsch_alle.png')
if os.path.exists(alle):
    quellen = viertel(np.array(Image.open(alle).convert('RGBA')))
else:
    quellen = {b: np.array(Image.open(os.path.join(QUELLE, b + '.png')).convert('RGBA')) for b in BLAETTER if os.path.exists(os.path.join(QUELLE, b + '.png'))}
summe = 0
for blatt, (teile, mitten) in BLAETTER.items():
    if blatt not in quellen:
        print('fehlt:', blatt)
        continue
    bild = quellen[blatt]
    alpha = (bild[:, :, 3] < 128).mean() > .2   # echte Transparenz?
    namen = [n for name, _ in teile for n in (name if isinstance(name, tuple) else (name,))]
    groessen = [px for name, px in teile for _ in (name if isinstance(name, tuple) else (name,))]
    masken = zuteilen(kern(bild, alpha), mitten)
    besitzer = np.zeros(bild.shape[:2], np.int32)
    for i, t in enumerate(masken):
        besitzer[t] = i + 1
    _, (iy, ix) = ndimage.distance_transform_edt(besitzer == 0, return_indices=True)
    naechster = besitzer[iy, ix]
    for i, (n, px, t) in enumerate(zip(namen, groessen, masken)):
        if t.sum() < 100:
            print('LEER:', blatt, n)
            continue
        speichern(bild, t, naechster == i + 1, n, px, alpha)
        summe += 1
print(summe, 'Bilder nach', ZIEL)
