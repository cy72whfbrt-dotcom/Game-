# Schneidet die Oberflächen-Teile aus den KI-Bild-Blättern (Alexander/ChatGPT) und speichert sie als Game/bilder/ui_*.webp.
#   python3 -I werkzeuge/ui_bilder_schneiden.py <ordner mit blatt*.png>[,<weiterer ordner>…] [<zielordner>, Standard Game/bilder] [<nur dieses blatt>]
# Säubern: Lichtschein (Glow) weg – schwache Deckkraft raus, bei blatt07 (deckender Schein) zählt nur, was im dunklen Umriss liegt;
# Randpixel bekommen die Farbe des Inneren (keine roten/gelben Säume). Reihenfolge der Teile: Zeile für Zeile (wie finden).
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

QUELLEN = sys.argv[1].split(',')
NUR = sys.argv[3] if len(sys.argv) > 3 else None
ZIEL = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'Game', 'bilder')

# Blatt: (Verfahren, Ausdehnung beim Finden, [(Name, Breite in px, Punkt im Teil (x, y) oder fester Kasten (x0, y0, x1, y1))])
# Punkt: das Teil, das dort liegt. Fester Kasten: genau so ausschneiden, ganz deckend (Teil mit Schein drumherum, ohne dunklen Umriss).
# Strahlen sind selbst ein Schein: roh (ohne Säubern).
BLAETTER = {
    'blatt01_hud': ('schwelle', 12, [('ring', 112, (250, 300)), ('stufe', 56, (680, 320)), ('namensleiste', 320, (1190, 310)),
                                     ('kasten', 88, (1100, 620)), ('kapsel', 300, (500, 640)), ('band_rot', 480, (600, 870)),
                                     ('punkt', 40, (1350, 870))]),
    'blatt02_dock': ('schwelle', 4, [('dock', 900, (770, 170)), ('rund', 120, (150, 490)), ('rund_an', 120, (460, 490)),
                                     ('dock_burg', 104, (760, 490)), ('dock_bund', 100, (1040, 490)), ('dock_kampf', 100, (1380, 490)),
                                     ('dock_events', 104, (380, 800)), ('dock_shop', 100, (760, 820)), ('dock_krone', 104, (1190, 820))]),
    'blatt03_kartenknoepfe': ('schwelle', 12, [('zoom_rein', 96, (960, 240)), ('zoom_raus', 96, (1320, 240)), ('kompass', 96, (260, 730)),
                                               ('fahne', 96, (840, 700)), ('armee', 96, (1310, 700))]),
    'blatt04_fenster': ('schwelle', 12, [('rahmen', 300, (260, 490)), ('kopf', 500, (1010, 200)), ('zu', 80, (830, 450)),
                                         ('zurueck', 80, (1160, 450)), ('reiter', 240, (750, 680)), ('reiter_an', 240, (1260, 680)),
                                         ('linie', 480, (1010, 848))]),
    'blatt05_knoepfe': ('schwelle', 2, [('k_gold', 300, (380, 210)), ('k_gold_an', 300, (1150, 210)), ('k_dunkel', 300, (380, 490)),
                                        ('k_rot', 300, (1150, 490)), ('k_grau', 300, (420, 795)), ('k_chip', 220, (1195, 785))]),
    'blatt06_kacheln': ('schwelle', 12, [('kachel_grau', 112, (275, 250)), ('kachel_gruen', 112, (770, 250)), ('kachel_blau', 112, (1260, 250)),
                                         ('kachel_lila', 112, (275, 690)), ('kachel_gold', 112, (770, 690)), ('kachel_rot', 112, (1260, 690))]),
    'blatt07_listen': ('umriss', 2, [('karte', 360, (390, 150)), ('karte_an', 360, (785, 62, 1502, 238)), ('hinweis', 480, (770, 380)),
                                     ('balken', 360, (500, 575)), ('balken_kurz', 200, (1270, 575)), ('edelstein', 80, (620, 775)),
                                     ('platz', 112, (910, 775))]),
    'blatt08_neu': ('schwelle', 12, [('sym_burg', 80, (220, 210)), ('sym_stern', 80, (1080, 220)), ('sym_krone', 80, (1540, 220)),
                                     ('sym_pokal', 80, (220, 650)), ('sym_zahnrad', 80, (650, 650)), ('sym_ziel', 80, (1100, 650)),
                                     ('sym_rolle', 80, (1530, 660))]),
    'blatt08_alt_rotrand': ('schwelle', 12, [('sym_schloss', 80, (200, 270)), ('sym_haken', 80, (570, 290))]),
    'blatt09_symbole': ('schwelle', 12, [('sym_schwert', 80, (220, 280)), ('sym_spaeher', 80, (590, 290)), ('sym_rueckzug', 80, (980, 290)),
                                         ('sym_pfeile', 80, (1340, 290)), ('sym_turm', 80, (230, 730)), ('sym_verluste', 80, (640, 750)),
                                         ('sym_aufstieg', 80, (990, 750)), ('sym_zeit', 80, (1340, 750))]),
    'blatt12_13_sieg_karte': ('schwelle', 2, [('strahlen', 200, (220, 230), 'roh'), ('band_gold', 400, (770, 150)),
                                              ('lorbeer', 200, (1320, 260)), ('niederlage', 200, (270, 740)), ('wappen', 160, (690, 700)),
                                              ('k_nadel', 64, (1000, 600)), ('k_beute', 80, (1300, 600)), ('k_kampf', 96, (960, 850)),
                                              ('k_fahne', 64, (1210, 840)), ('k_krone', 64, (1420, 850))]),
    # zweite Lieferung (ki_rest_eingang): Rohstoff-Symbole für die HUD-Reihe
    'blatt_03': ('schwelle', 1, [('res_muenzen', 64, (157, 157)), ('res_edelstein', 64, (472, 157)), ('res_holz', 64, (768, 157)),
                                 ('res_stein', 64, (1083, 157)), ('res_eisen', 64, (1378, 157)), ('res_truppen', 64, (157, 571)),
                                 ('res_splitter', 64, (487, 500)), ('res_thronpunkte', 64, (781, 500)), ('sym_friedensschild', 64, (1088, 491)),
                                 ('sym_waffe', 64, (1380, 494)), ('sym_ruestung', 64, (133, 832)), ('sym_schild', 64, (396, 830)),
                                 ('sym_stiefel', 64, (635, 832)), ('res_punkte', 64, (907, 829)), ('sym_beschleuniger', 64, (1168, 824)),
                                 ('res_xp', 64, (1407, 844))]),
}


def saeubern(rgba, verfahren):
    a = rgba[:, :, 3].astype(np.float32)
    if verfahren == 'umriss':   # deckender Schein: nur was der dunkle Umriss einschließt
        lum = rgba[:, :, :3].max(axis=2)
        umriss = (a > 180) & (lum < 75)
        innen = ndimage.binary_fill_holes(ndimage.binary_closing(umriss, iterations=2))
        innen = ndimage.binary_opening(innen, iterations=3)
        a = np.where(innen, a, 0)
        a = ndimage.uniform_filter(a, 2)
    a = np.clip((a - 110) / (235 - 110), 0, 1) * 255   # schwacher Schein raus, Kante bleibt weich
    voll = a >= 250
    # Randfarbe: jedes nicht ganz deckende Pixel nimmt die Farbe des nächsten ganz deckenden (Säume weg)
    _, (iy, ix) = ndimage.distance_transform_edt(~voll, return_indices=True)
    rgb = rgba[:, :, :3][iy, ix]
    out = np.dstack([rgb, a.astype(np.uint8)])
    return out


def teil(a, d, punkt):   # Kasten des Teils, das am Punkt liegt (oder ihm am nächsten ist)
    m = ndimage.binary_dilation(a > 128, iterations=d)
    lab, _ = ndimage.label(m)
    x, y = punkt
    nr = lab[y, x]
    if not nr:
        dist, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
        nr = lab[iy[y, x], ix[y, x]]
    ys, xs = np.nonzero(lab == nr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


summe = 0
for blatt, (verfahren, d, auswahl) in BLAETTER.items():
    if NUR and blatt != NUR: continue
    datei = next((os.path.join(q, blatt + '.png') for q in QUELLEN if os.path.exists(os.path.join(q, blatt + '.png'))), None)
    if not datei: print('fehlt:', blatt); continue
    roh = np.array(Image.open(datei).convert('RGBA'))
    sauber = saeubern(roh, verfahren)
    for name, breite, ort, *art in auswahl:
        if len(ort) == 4:
            x0, y0, x1, y1 = ort
            stueck = roh[y0:y1, x0:x1].copy(); stueck[:, :, 3] = 255
        elif art == ['roh']:
            x0, y0, x1, y1 = teil(roh[:, :, 3].astype(int) * 6, 6, ort)
            stueck = roh[y0:y1, x0:x1]
        else:
            x0, y0, x1, y1 = teil(sauber[:, :, 3], d, ort)
            stueck = sauber[y0:y1, x0:x1].copy()
            lab, n = ndimage.label(stueck[:, :, 3] > 100)   # Splitter vom Nachbarteil weg (unter 5 % der Fläche)
            groesse = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
            for i, g in enumerate(groesse, 1):
                if g < groesse.max() * 0.05: stueck[ndimage.binary_dilation(lab == i, iterations=3), 3] = 0
        stueck = Image.fromarray(stueck)
        stueck = stueck.crop(stueck.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
        h = round(stueck.height * breite / stueck.width)
        stueck = stueck.resize((breite, h), Image.LANCZOS)
        datei = os.path.join(ZIEL, 'ui_' + name + '.webp')
        stueck.save(datei, 'WEBP', quality=84, method=6)
        summe += os.path.getsize(datei)
        print(f'ui_{name}.webp {breite}x{h} {os.path.getsize(datei) // 1024} KB')
print('zusammen', summe // 1024, 'KB')
