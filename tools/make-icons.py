# Erzeugt die App-Icons: Häuser bei Nacht mit Mond und erleuchteten Fenstern
from PIL import Image, ImageDraw
import random, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(OUT, exist_ok=True)

def icon(size, maskable=False, radius=True):
    S = 1024
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bg = Image.new('RGBA', (S, S))
    d = ImageDraw.Draw(bg)
    top, bot = (20, 26, 60), (59, 52, 112)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,))
    pad = 140 if maskable else 0
    sc = (S - 2 * pad) / S
    def P(x, y): return (pad + x * sc, pad + y * sc)
    # Sterne
    rnd = random.Random(3)
    for _ in range(26):
        x, y = rnd.uniform(60, 960), rnd.uniform(60, 470)
        r = rnd.choice([3, 4, 6])
        d.ellipse([*P(x - r, y - r), *P(x + r, y + r)], fill=(255, 255, 255, 200))
    # Mond (Sichel)
    d.ellipse([*P(650, 140), *P(850, 340)], fill=(255, 246, 216, 255))
    d.ellipse([*P(700, 110), *P(900, 310)], fill=(22, 28, 64, 255))
    # Häuser
    sil = (11, 16, 34, 255)
    houses = [(90, 560, 260, 'gable'), (330, 430, 220, 'flat'), (530, 600, 180, 'gable'), (690, 500, 240, 'chim')]
    win = (255, 201, 77, 255)
    for x, top_y, w, kind in houses:
        d.rectangle([*P(x, top_y), *P(x + w, 1024)], fill=sil)
        if kind == 'gable': d.polygon([P(x - 10, top_y), P(x + w / 2, top_y - 110), P(x + w + 10, top_y)], fill=sil)
        if kind == 'chim': d.rectangle([*P(x + 30, top_y - 60), *P(x + 70, top_y)], fill=sil)
        for wy in range(int(top_y) + 50, 940, 95):
            for wx in range(x + 35, x + w - 50, 70):
                if rnd.random() < .5:
                    d.rounded_rectangle([*P(wx, wy), *P(wx + 36, wy + 48)], radius=6 * sc, fill=win)
    if radius and not maskable:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=220, fill=255)
        img.paste(bg, (0, 0), mask)
    else:
        img = bg
    return img.resize((size, size), Image.LANCZOS)

icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
icon(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, radius=False).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
print('Icons erstellt')
