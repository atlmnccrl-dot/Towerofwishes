"""Render the hero portraits: tools/portraits/heroes.py -> assets/portraits/<hero>_<expr>.webp

    NODE_PATH=$(npm root -g) python3 tools/portraits/make.py [hero ...] [--sheet out.png]

Each SVG is rendered by headless Chromium at 768 x 768, mirrored so the hero faces right, and
saved as WebP with alpha. js/portraits.js loads them (and holds the face box the HUD chip
and the cut-ins crop to).
"""
import json, os, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from heroes import HEROES, ACCENT, build

SIZE = 768
EXPRS = ('calm', 'cry')
OUT = os.path.join(ROOT, 'assets', 'portraits')

RENDER_JS = r'''
const { chromium } = require('playwright');
(async () => {
  const jobs = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: %d, height: %d } });
  for (const j of jobs) {
    await p.setContent('<html><body style="margin:0;background:transparent">' + j.svg.replace('width="700" height="700"', 'width="%d" height="%d"') + '</body></html>');
    await p.screenshot({ path: j.out, omitBackground: true, clip: { x: 0, y: 0, width: %d, height: %d } });
  }
  await b.close();
})();
''' % (SIZE, SIZE, SIZE, SIZE, SIZE, SIZE)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    if sheet in args:
        args.remove(sheet)
    heroes = args or list(HEROES)
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    jobs = []
    for h in heroes:
        for e in EXPRS:
            jobs.append({'svg': build(h, e), 'out': os.path.join(tmp, f'{h}_{e}.png'), 'h': h, 'e': e})
    jf = os.path.join(tmp, 'jobs.json')
    json.dump(jobs, open(jf, 'w'))
    js = os.path.join(tmp, 'render.js')
    open(js, 'w').write(RENDER_JS)
    subprocess.run(['node', js, jf], check=True)
    for j in jobs:
        im = Image.open(j['out']).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
        im.save(os.path.join(OUT, f"{j['h']}_{j['e']}.webp"), 'WEBP', quality=88, method=6)
    # js/portraits.js holds the face and eye boxes (fractions of the mirrored image); they only change
    # if the SVG frame in heroes.build() moves. Print them so a change is easy to copy across.
    k = 1 / 700
    box = lambda x0, y0, x1, y1: [round((860 - x1) * k, 4), round((y0 - 170) * k, 4), round((x1 - x0) * k, 4), round((y1 - y0) * k, 4)]
    print('FACE', box(392, 300, 652, 580), 'EYES', box(400, 400, 610, 490))
    if sheet:
        cols = len(EXPRS) * 3
        rows = (len(heroes) * len(EXPRS) + cols - 1) // cols
        S = Image.new('RGBA', (cols * 384, rows * 384), (34, 30, 34, 255))
        for i, j in enumerate(jobs):
            im = Image.open(os.path.join(OUT, f"{j['h']}_{j['e']}.webp")).resize((384, 384), Image.LANCZOS)
            S.alpha_composite(im, ((i % cols) * 384, (i // cols) * 384))
        S.save(sheet)
    print('wrote', len(jobs), 'portraits to', OUT)


if __name__ == '__main__':
    main()
