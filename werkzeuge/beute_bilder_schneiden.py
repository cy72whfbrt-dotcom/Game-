# Schneidet Belohnungs-Symbole und Kisten aus den KI-Blättern (ChatGPT, ohne echte Transparenz: weicher Lichtschein-Hintergrund)
# und speichert sie als Game/bilder/beute_*.webp / kiste_*.webp.
#   python3 -I werkzeuge/beute_bilder_schneiden.py <ordner mit blatt_03.png, blatt_04.png> [<zielordner>, Standard Game/bilder]
# Freistellen: Hintergrund = glatter Verlauf. Er wird aus den Pixeln zwischen den Teilen geschätzt (gewichtete Unschärfe), Teil ist,
# was deutlich davon abweicht oder harte Kanten hat; Löcher füllen, Krümel weg, Rand 1 px weich. Randpixel nehmen die Farbe des Inneren.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

QUELLE = sys.argv[1]
ZIEL = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'Game', 'bilder')

# Blatt: (Größe der Ausgabe in px, [(Name, Punkt im Teil (x, y)[, Schwelle])]) – Punkte für 1536x1024. Jedes Teil bleibt in seiner
# Zelle (Punkt am nächsten). Schwelle: Abstand zum Hintergrund (Standard 55; kleiner bei hellen Teilen auf hellem Schein).
BLAETTER = {
    'blatt_03': (192, [('beute_muenzen', (140, 200)), ('beute_edelsteine', (480, 210)), ('beute_holz', (790, 200)),
                       ('beute_stein', (1080, 200), 18), ('beute_eisen', (1380, 200)), ('beute_truppen', (190, 480)),
                       ('beute_splitter', (500, 500)), ('beute_thron', (790, 470)), ('beute_schild', (1080, 480)),
                       ('beute_waffe', (1390, 480), 28), ('beute_ruestung', (140, 830)), ('beute_rundschild', (400, 830)),
                       ('beute_stiefel', (640, 830), 28), ('beute_punkte', (900, 830)), ('beute_beschleuniger', (1160, 820)),
                       ('beute_buch', (1400, 830))]),
    'blatt_04': (288, [('kiste_ausruestung_zu', (210, 200)), ('kiste_ausruestung_offen', (580, 220)), ('kiste_held_zu', (970, 200)),
                       ('kiste_held_offen', (1340, 220)), ('kiste_gross_zu', (200, 520)), ('kiste_gross_offen', (580, 540)),
                       ('kiste_episch_zu', (970, 520)), ('kiste_episch_offen', (1340, 520)), ('kiste_royal_zu', (210, 870)),
                       ('kiste_royal_offen', (580, 880))]),
}


def abstand(rgb):   # (Abstand zum geschätzten Hintergrund, harte Kanten)
    f = rgb.astype(np.float32)
    lum = ndimage.gaussian_filter(f.mean(axis=2), 1)
    # Kanten: Teile haben harte Kanten und Umrisse, der Schein ist glatt
    kante = np.hypot(ndimage.sobel(lum, 0), ndimage.sobel(lum, 1)) > 60
    # Hintergrund aus dem, was sicher kein Teil ist, glatt auffüllen
    frei = ~ndimage.binary_dilation(kante, iterations=16)
    w = ndimage.gaussian_filter(frei.astype(np.float32), 40) + 1e-4
    bg = np.dstack([ndimage.gaussian_filter(f[:, :, k] * frei, 40) / w for k in range(3)])
    ruhe = ndimage.uniform_filter(lum ** 2, 7) - ndimage.uniform_filter(lum, 7) ** 2 < 12   # glatt wie der Schein
    return np.abs(f - bg).max(axis=2), kante, ruhe


def teil(diff, kante, ruhe, zelle, punkt, schwelle):
    m = ((diff > schwelle) | kante) & zelle
    m = ndimage.binary_closing(m, iterations=3)
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_opening(m, iterations=4) & zelle
    lab, _ = ndimage.label(m)
    x, y = punkt
    nr = lab[y, x]
    if not nr:
        _, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
        nr = lab[iy[y, x], ix[y, x]]
    t = ndimage.binary_fill_holes(lab == nr)
    if schwelle < 55:   # kleine Schwelle nimmt Schein mit: glatte, schwach abweichende Pixel am Rand wieder weg
        rand = t & ~ndimage.binary_erosion(t, iterations=18)
        t = ndimage.binary_opening(t & ~(rand & ruhe & (diff < 60)), iterations=2)
        t = ndimage.binary_fill_holes(t)
        lab, _ = ndimage.label(t)
        t = lab == np.argmax(np.bincount(lab.ravel())[1:]) + 1
    return t


summe = 0
for blatt, (groesse, auswahl) in BLAETTER.items():
    bild = Image.open(os.path.join(QUELLE, blatt + '.png')).convert('RGB')
    if bild.size != (1536, 1024):
        bild = bild.resize((1536, 1024), Image.LANCZOS)
    rgb = np.array(bild)
    diff, kante, ruhe = abstand(rgb)
    yy, xx = np.mgrid[0:1024, 0:1536]
    naechster = np.argmin([(xx - e[1][0]) ** 2 + (yy - e[1][1]) ** 2 for e in auswahl], axis=0)
    for i, (name, punkt, *rest) in enumerate(auswahl):
        t = teil(diff, kante, ruhe, naechster == i, punkt, rest[0] if rest else 55)
        t = ndimage.binary_erosion(t, iterations=2)   # Saum aus Schein weg
        a = ndimage.gaussian_filter(t.astype(np.float32), 0.8)
        a = np.clip((a - 0.15) / 0.7, 0, 1) * 255
        voll = a >= 250
        _, (iy, ix) = ndimage.distance_transform_edt(~voll, return_indices=True)
        out = np.dstack([rgb[iy, ix], a.astype(np.uint8)])
        ys, xs = np.nonzero(t)
        x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
        st = Image.fromarray(out[y0:y1, x0:x1], 'RGBA')
        s = max(st.size)
        q = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        q.paste(st, ((s - st.size[0]) // 2, (s - st.size[1]) // 2))
        q = q.resize((groesse, groesse), Image.LANCZOS)
        q.save(os.path.join(ZIEL, name + '.webp'), 'WEBP', quality=88, method=6)
        summe += 1
        print(name, st.size, '->', groesse)
print(summe, 'Bilder')
