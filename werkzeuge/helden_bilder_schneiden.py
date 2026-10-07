# Schneidet die 20 Helden aus den KI-Bild-Blättern (Alexander/ChatGPT, echte Transparenz) → Game/bilder/held_<id>.webp
# (Figur 360×480, Kopf überall gleich groß und an derselben Stelle) und held_<id>_kopf.webp (Kopf-Quadrat 160 für kleine Chips).
#   python3 -I werkzeuge/helden_bilder_schneiden.py <ordner mit blatt_07.png, blatt_13_helden_rest.png> [<zielordner>]
# Figuren, die sich berühren (Schwert, Speer), werden per Wasserscheide getrennt: je Held ein Punkt im Rumpf und einer am Kopf.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.segmentation import watershed

QUELLE = sys.argv[1]
ZIEL = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'Game', 'bilder')

# Blatt → (Maßstab, Helden: (id, Rumpf x, y, Kopf-Mitte x, y[, weitere Punkte, die zum Helden gehören]))
# Maßstab: auf Blatt 13 und 11 sind die Figuren größer – der Ausschnitt wächst mit, damit alle Köpfe gleich groß sind.
# id mit „-“ vorn: nur zum Trennen (Nachbar), wird nicht gespeichert. Aldric von Blatt 11: auf Blatt 07 liegt Sigruns Säbel über ihm.
BLAETTER = {
    'blatt_07': (1, [('brunhild', 200, 330, 180, 140), ('ragna', 520, 340, 500, 165), ('sigrun', 790, 330, 775, 145, [(900, 345), (985, 290)]),
                 ('-aldric', 1090, 340, 1075, 145), ('kasimir', 1380, 340, 1385, 120),
                 ('yrsa', 140, 840, 160, 620), ('ida', 390, 840, 370, 640), ('bernhard', 600, 840, 585, 630),
                 ('mira', 870, 860, 865, 665), ('nora', 1120, 860, 1125, 640), ('fenn', 1400, 860, 1400, 640)]),
    'blatt_13_helden_rest': (1.18, [('otto', 190, 330, 215, 95), ('greta', 480, 330, 515, 130), ('hagen', 770, 330, 760, 110),
                             ('wolfram', 1090, 330, 1090, 95), ('thora', 1420, 330, 1425, 110),
                             ('eskil', 210, 850, 230, 590), ('lene', 600, 850, 555, 580, [(752, 650), (790, 560)]), ('bruno', 960, 850, 960, 580),
                             ('pia', 1340, 850, 1310, 580)]),
    'blatt_11': (1.6, [('-sigrun', 1000, 520, 985, 280, [(1100, 830), (1180, 850)]), ('aldric', 1330, 560, 1340, 255),
                       ('-ragna', 600, 560, 615, 250)]),
}
BOX_W, BOX_H, KOPF_OBEN = 390, 520, 120   # Ausschnitt im Blatt: Kopf-Mitte 120 px unter dem oberen Rand, waagrecht mittig
FIG_W, FIG_H = 360, 480
KOPF_SEITE, KOPF_PX = 220, 160

for blatt, (mass, helden) in BLAETTER.items():
    bw, bh, ko, ks = round(BOX_W * mass), round(BOX_H * mass), round(KOPF_OBEN * mass), round(KOPF_SEITE * mass)
    im = np.array(Image.open(os.path.join(QUELLE, blatt + '.png')).convert('RGBA')).astype(np.float32)
    a = im[:, :, 3]
    fg = a > 30
    mk = np.zeros(a.shape, np.int32)
    for i, (hid, rx, ry, kx, ky, *mehr) in enumerate(helden):
        mk[ry - 60:ry + 60, rx - 25:rx + 25] = i + 1
        for x, y in [(kx, ky)] + (mehr[0] if mehr else []):
            mk[y - 12:y + 12, x - 12:x + 12] = i + 1
    lab = watershed(-ndimage.distance_transform_edt(fg), mk, mask=fg)
    for i, (hid, rx, ry, kx, ky, *_) in enumerate(helden):
        if hid[0] == '-': continue
        cl, _ = ndimage.label(lab == i + 1)
        m = cl == cl[ry, rx]                              # nur das Stück am Rumpf (keine Splitter der Nachbarn)
        m = ndimage.binary_dilation(m, iterations=2) & fg  # Kante weich lassen
        al = a * m
        rgba = im.copy(); rgba[:, :, 3] = al
        full = Image.fromarray(rgba.astype(np.uint8), 'RGBA')
        def ausschnitt(x0, y0, w, h):
            c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            c.paste(full.crop((max(0, x0), max(0, y0), min(full.width, x0 + w), min(full.height, y0 + h))), (max(0, -x0), max(0, -y0)))
            return c
        ausschnitt(kx - bw // 2, ky - ko, bw, bh).resize((FIG_W, FIG_H), Image.LANCZOS) \
            .save(os.path.join(ZIEL, 'held_' + hid + '.webp'), 'WEBP', quality=84, method=6)
        ausschnitt(kx - ks // 2, ky - int(ks * .48), ks, ks).resize((KOPF_PX, KOPF_PX), Image.LANCZOS) \
            .save(os.path.join(ZIEL, 'held_' + hid + '_kopf.webp'), 'WEBP', quality=84, method=6)
        print(hid)
