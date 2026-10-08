# PLATZHALTER für die 4 KI-Blätter der Marsch-Vorgabe (bis Alexander die echten Bilder macht): einfache flache Formen in den Farben
# der Vorgabe, gleiches Raster wie die Prompts, jedes Teil mit rosa Platzhalter-Punkt. Danach wie echte Blätter schneiden:
#   python3 -I werkzeuge/marschtest/platzhalter_blaetter.py <ordner>
#   python3 -I werkzeuge/marschtest/marsch_bilder_schneiden.py <ordner>
import math, os, sys
from PIL import Image, ImageDraw

ZIEL = sys.argv[1]
K = 4   # viermal so groß malen, auf doppelte Blattgröße verkleinern (weiche Kanten, genug Pixel für Handy ×2)
FARBE = {'eigen': ((63, 134, 216), (22, 54, 92)), 'bund': ((92, 191, 98), (31, 74, 34)), 'feind': ((201, 66, 58), (82, 21, 15))}
HAUT, DUNKEL, STAHL, HOLZ = (232, 196, 160), (30, 26, 22), (190, 196, 204), (120, 80, 44)
PH = (255, 60, 200)


def punkt(d, x, y):   # rosa Platzhalter-Punkt
    d.ellipse([x - 7 * K, y - 7 * K, x + 7 * K, y + 7 * K], fill=PH, outline=(255, 255, 255), width=2 * K)


def soldat(d, x, y, f, rand, kampf=False, hoch=False):   # Fuß bei (x, y)
    s = 9 * K
    d.ellipse([x - s, y - s * .5, x + s, y + s * .5], fill=(0, 0, 0, 70))                       # Schatten
    d.rounded_rectangle([x - s * .7, y - s * 2.6, x + s * .7, y - s * .2], s * .4, fill=f, outline=rand, width=K)
    d.ellipse([x - s * .55, y - s * 3.6, x + s * .55, y - s * 2.5], fill=STAHL if hoch else HAUT, outline=rand, width=K)
    if kampf:
        d.line([x + s * .6, y - s * 1.8, x + s * 1.6, y - s * 4], fill=STAHL, width=2 * K)
    else:
        d.line([x + s * .9, y - s * .3, x + s * .9, y - s * 4.2], fill=HOLZ, width=K + 1)
        d.polygon([(x + s * .9, y - s * 4.8), (x + s * .6, y - s * 4.1), (x + s * 1.2, y - s * 4.1)], fill=STAHL)
    d.ellipse([x - s * 1.3, y - s * 2.1, x - s * .1, y - s * .8], fill=f, outline=STAHL, width=K)   # Rundschild


def fahne(d, x, y, f, rand, gesenkt=False):
    if gesenkt:
        d.line([x, y, x + 50 * K, y - 22 * K], fill=HOLZ, width=2 * K)
        d.polygon([(x + 50 * K, y - 22 * K), (x + 30 * K, y - 4 * K), (x + 22 * K, y - 22 * K)], fill=f, outline=rand)
        return
    d.line([x, y, x, y - 70 * K], fill=HOLZ, width=2 * K)
    d.polygon([(x, y - 70 * K), (x + 30 * K, y - 62 * K), (x, y - 50 * K)], fill=f, outline=rand)


def trupp(d, cx, cy, seite, art):
    f, rand = FARBE[seite]
    if art == 'verletzt':
        pos = [(-22, 6), (0, 14), (22, 6)]
    else:
        pos = [(dx * 26 + (r % 2) * 13 - 30, r * 16 - 12) for r in range(3) for dx in range(3)][:8]
    pos = [(cx + a * K * (1 if art != 'hoch' else 1), cy + (b if art != 'hoch' else -b) * K) for a, b in pos]
    for x, y in sorted(pos, key=lambda p: p[1]):
        soldat(d, x, y, f, rand, kampf=art == 'kampf', hoch=art == 'hoch')
    if art == 'kampf':
        for a in (-50, 0, 46):
            d.ellipse([cx + (a - 10) * K, cy + 24 * K, cx + (a + 10) * K, cy + 32 * K], fill=(200, 190, 170, 160))
    fahne(d, cx + 34 * K, cy + 6 * K, f, rand, gesenkt=art == 'verletzt')
    punkt(d, cx + 52 * K, cy + 30 * K)


def blatt(name, sp, re, malen, w=1536, h=1024):
    im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(sp * re):
        r, s = divmod(i, sp)
        malen(d, i, (s + .5) * w * K / sp, (r + .5) * h * K / re)
    im.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join(ZIEL, name + '.png'))
    print(name + '.png')


def sechseck(d, cx, cy, w, h, f, rand, gem):
    pts = lambda sw, sh: [(cx + sw * math.cos(math.radians(a)), cy + sh * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    d.polygon(pts(w / 2, h / 2), fill=rand)
    d.polygon(pts(w / 2 - 4 * K, h / 2 - 4 * K), fill=f)
    d.polygon(pts(w / 2 - 14 * K, h / 2 - 14 * K), fill=STAHL if gem != (234, 178, 74) else (255, 236, 170))
    d.polygon(pts(w / 2 - 18 * K, h / 2 - 18 * K), fill=(0, 0, 0, 0))
    d.ellipse([cx - 7 * K, cy + h / 2 - 12 * K, cx + 7 * K, cy + h / 2 + 2 * K], fill=gem, outline=rand, width=K)


def ellipsen(d, cx, cy, f, glanz):
    for i, (rw, rh) in enumerate([(300, 110), (250, 90)]):
        for b, a in ((22, 40), (12, 90), (5, 255)):
            d.ellipse([cx - rw * K, cy - rh * K, cx + rw * K, cy + rh * K], outline=(f if a == 255 else glanz) + (a,), width=b * K // 2 + 1)
    for k in range(10):
        w = math.radians(k * 36 + 10)
        x, y = cx + 300 * K * math.cos(w), cy + 110 * K * math.sin(w)
        d.ellipse([x - 4 * K, y - 4 * K, x + 4 * K, y + 4 * K], fill=glanz + (230,))


def sonder(d, i, cx, cy):
    if i == 0:   # Späher: Pferd + Reiter
        d.ellipse([cx - 60 * K, cy - 20 * K, cx + 50 * K, cy + 20 * K], fill=(140, 90, 50), outline=DUNKEL, width=K)
        for a in (-45, -25, 20, 38):
            d.line([cx + a * K, cy + 10 * K, cx + (a + 12) * K, cy + 52 * K], fill=(110, 70, 40), width=6 * K)
        d.polygon([(cx + 40 * K, cy - 10 * K), (cx + 80 * K, cy + 20 * K), (cx + 70 * K, cy + 32 * K), (cx + 32 * K, cy + 10 * K)], fill=(140, 90, 50), outline=DUNKEL)
        d.polygon([(cx - 22 * K, cy - 20 * K), (cx - 60 * K, cy - 40 * K), (cx - 14 * K, cy - 58 * K)], fill=(28, 52, 110))
        d.rounded_rectangle([cx - 18 * K, cy - 64 * K, cx + 4 * K, cy - 18 * K], 6 * K, fill=(150, 110, 70), outline=DUNKEL, width=K)
        d.ellipse([cx - 16 * K, cy - 86 * K, cx + 2 * K, cy - 66 * K], fill=HAUT, outline=DUNKEL, width=K)
    elif i == 1:   # Sammler: Karren mit Säcken + 2 Arbeiter
        d.rectangle([cx - 50 * K, cy - 30 * K, cx + 40 * K, cy + 10 * K], fill=HOLZ, outline=DUNKEL, width=K)
        for a in (-30, 0, 24):
            d.ellipse([cx + (a - 16) * K, cy - 58 * K, cx + (a + 16) * K, cy - 24 * K], fill=(214, 190, 140), outline=DUNKEL, width=K)
        for a in (-34, 26):
            d.ellipse([cx + (a - 14) * K, cy, cx + (a + 14) * K, cy + 28 * K], fill=(90, 60, 30), outline=DUNKEL, width=2 * K)
        for a in (64, 90):
            soldat(d, cx + a * K, cy + 24 * K, (170, 140, 90), DUNKEL)
    elif i == 2:   # Rally-Heerzug: 14 Soldaten gemischt + 3 goldene Banner
        fs = [FARBE['eigen'], FARBE['bund'], FARBE['eigen'], FARBE['bund']]
        pos = [(dx * 26 + (r % 2) * 13 - 70, r * 18 - 28) for r in range(4) for dx in range(5)][:14]
        for k, (a, b) in enumerate(sorted(pos, key=lambda p: p[1])):
            soldat(d, cx + a * K, cy + b * K, *fs[k % 4])
        for a in (-56, 0, 56):
            fahne(d, cx + a * K, cy - 20 * K, (234, 178, 74), (121, 88, 35))
    elif i == 3:   # weiße Fahne (Rückzug)
        d.line([cx - 20 * K, cy + 60 * K, cx - 20 * K, cy - 60 * K], fill=HOLZ, width=5 * K)
        d.polygon([(cx - 20 * K, cy - 60 * K), (cx + 50 * K, cy - 44 * K), (cx + 30 * K, cy - 24 * K), (cx + 54 * K, cy - 6 * K), (cx - 20 * K, cy - 8 * K)], fill=(245, 245, 240), outline=(120, 120, 120))
    elif i == 4:   # brennender Pfeil links, Pfeil rechts
        for dx, feuer in ((-70, True), (70, False)):
            x = cx + dx * K
            d.line([x - 50 * K, cy + 20 * K, x + 50 * K, cy - 20 * K], fill=HOLZ, width=4 * K)
            d.polygon([(x + 60 * K, cy - 24 * K), (x + 40 * K, cy - 24 * K), (x + 48 * K, cy - 8 * K)], fill=STAHL, outline=DUNKEL)
            d.polygon([(x - 50 * K, cy + 20 * K), (x - 62 * K, cy + 14 * K), (x - 58 * K, cy + 30 * K)], fill=(240, 240, 240))
            punkt(d, x, cy)
            if feuer:
                d.ellipse([x + 22 * K, cy - 36 * K, x + 48 * K, cy - 6 * K], fill=(255, 140, 30, 230))
                d.ellipse([x + 28 * K, cy - 28 * K, x + 42 * K, cy - 12 * K], fill=(255, 220, 90))
    else:   # Katapult-Stein mit Feuerspur
        for k in range(5):
            d.ellipse([cx - (60 + k * 16) * K, cy - (14 - k * 2) * K + k * 6 * K, cx - (34 + k * 16) * K, cy + (14 - k * 2) * K + k * 6 * K], fill=(255, 150, 50, 180 - k * 30))
        d.ellipse([cx - 34 * K, cy - 34 * K, cx + 34 * K, cy + 34 * K], fill=(128, 124, 116), outline=DUNKEL, width=2 * K)
        d.ellipse([cx - 20 * K, cy - 24 * K, cx - 2 * K, cy - 8 * K], fill=(170, 166, 156))
    if i != 4:
        punkt(d, cx + 60 * K, cy + 60 * K)


def kampf(d, i, cx, cy):
    if i == 0:
        ellipsen(d, cx, cy, (220, 40, 40), (255, 130, 140))
    elif i == 1:
        ellipsen(d, cx, cy, (234, 178, 74), (255, 230, 140))
    elif i == 2:   # rote Lichtsäule + gekreuzte Schwerter oben
        for b, a in ((60, 50), (36, 110), (14, 255)):
            d.rounded_rectangle([cx - b * K / 2, cy - 160 * K, cx + b * K / 2, cy + 200 * K], b * K / 2, fill=(230, 50, 50, a) if a < 255 else (255, 190, 180))
        for s in (-1, 1):
            d.line([cx - 40 * s * K, cy - 230 * K, cx + 40 * s * K, cy - 150 * K], fill=(230, 40, 40), width=12 * K)
            d.line([cx - 40 * s * K, cy - 230 * K, cx + 40 * s * K, cy - 150 * K], fill=(255, 170, 160), width=4 * K)
            d.line([cx + 28 * s * K, cy - 172 * K, cx + 14 * s * K, cy - 186 * K], fill=(120, 20, 20), width=10 * K)
    else:   # Strahlen-Blitz gold
        for k in range(16):
            w = math.radians(k * 22.5)
            r = (200 if k % 2 else 140) * K
            d.polygon([(cx, cy), (cx + r * math.cos(w - .08), cy + r * math.sin(w - .08)), (cx + r * math.cos(w + .08), cy + r * math.sin(w + .08))], fill=(255, 214, 110, 170))
        for r, a in ((70, 120), (44, 200), (24, 255)):
            d.ellipse([cx - r * K, cy - r * K, cx + r * K, cy + r * K], fill=(255, 245, 200, a))
    punkt(d, *((cx + 300 * K, cy) if i < 2 else (cx, cy + 120 * K) if i == 2 else (cx + 40 * K, cy + 40 * K)))


def rahmen(d, i, cx, cy):
    if i < 4:
        f = [(63, 134, 216), (92, 191, 98), (201, 66, 58), (234, 178, 74)][i]
        rand = [(22, 54, 92), (31, 74, 34), (82, 21, 15), (121, 88, 35)][i]
        sechseck(d, cx, cy, 176 * K, 200 * K, f, rand, (234, 178, 74) if i == 3 else (240, 240, 255))
        punkt(d, cx + 76 * K, cy - 80 * K)
        return
    if i in (4, 5):   # Band: Sieg gold mit Flügeln, Niederlage dunkelrot zerrissen
        sieg = i == 4
        f, rand = ((234, 178, 74), (121, 88, 35)) if sieg else ((110, 22, 18), (52, 10, 8))
        b, h = 330 * K / 2, 70 * K / 2
        if sieg:
            for s in (-1, 1):
                for k in range(5):
                    d.polygon([(cx + s * b * .8, cy - h * .6 + k * 10 * K), (cx + s * (b + (60 - k * 8) * K), cy - h * 1.6 + k * 22 * K),
                               (cx + s * (b + (40 - k * 8) * K), cy - h * 1.1 + k * 22 * K)], fill=(255, 226, 140), outline=rand)
            d.polygon([(cx - b, cy - h), (cx + b, cy - h), (cx + b - 20 * K, cy), (cx + b, cy + h), (cx - b, cy + h), (cx - b + 20 * K, cy)], fill=f, outline=rand)
            d.rectangle([cx - b + 24 * K, cy - h + 6 * K, cx + b - 24 * K, cy + h - 6 * K], outline=(255, 236, 170), width=2 * K)
        else:
            zack = [(cx - b + k * 2 * b / 12, cy - h + (8 * K if k % 2 else 0)) for k in range(13)]
            unten = [(cx + b - k * 2 * b / 12, cy + h - (10 * K if k % 2 else 0)) for k in range(13)]
            d.polygon(zack + [(cx + b - 14 * K, cy)] + unten + [(cx - b + 18 * K, cy)], fill=f, outline=rand)
            d.line([cx - 60 * K, cy - h, cx - 40 * K, cy - 4 * K], fill=rand, width=2 * K)
            d.line([cx + 80 * K, cy + h, cx + 66 * K, cy + 8 * K], fill=rand, width=2 * K)
        punkt(d, cx + b - 30 * K, cy + h + 20 * K)
        return
    if i == 6:   # leere weiße Fahne (Kürzel + Tönung im Code)
        d.line([cx - 40 * K, cy + 90 * K, cx - 40 * K, cy - 90 * K], fill=HOLZ, width=6 * K)
        d.polygon([(cx - 40 * K, cy - 90 * K), (cx + 60 * K, cy - 90 * K), (cx + 44 * K, cy - 50 * K), (cx + 60 * K, cy - 10 * K), (cx - 40 * K, cy - 10 * K)], fill=(246, 244, 236), outline=(140, 136, 126))
        punkt(d, cx + 40 * K, cy + 60 * K)
        return
    # Warn-Dreieck rot, leere Mitte
    pts = lambda r: [(cx, cy - r), (cx + r * .95, cy + r * .65), (cx - r * .95, cy + r * .65)]
    d.polygon(pts(96 * K), fill=(255, 120, 100, 120))
    d.polygon(pts(84 * K), fill=(200, 40, 34), outline=(82, 21, 15))
    d.polygon(pts(56 * K), fill=(0, 0, 0, 0))
    punkt(d, cx + 70 * K, cy + 80 * K)


os.makedirs(ZIEL, exist_ok=True)
SEITEN, ARTEN = ('eigen', 'bund', 'feind'), ('runter', 'hoch', 'kampf', 'verletzt')
blatt('marsch_trupps', 3, 4, lambda d, i, x, y: trupp(d, x, y, SEITEN[i % 3], ARTEN[i // 3]))
blatt('marsch_sonder', 3, 2, sonder)
blatt('marsch_kampf', 2, 2, kampf)
blatt('marsch_rahmen', 4, 2, rahmen)
