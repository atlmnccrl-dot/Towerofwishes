"""Build Vesper as a self-contained web game in dist/vesper-web (and a zip beside it), ready for
itch.io or any static host: the page, the code with its asset root pointed at ./assets, the install
manifest, icons and service worker, and only the assets Vesper uses (every character set named in
its code plus the random-cast sets and their bundles, effects, tiles, sound and music).
Run: python3 -I vesper/tools_build.py          the web build (no ads, no shop: window.VESPER_WEB_RELEASE)
     python3 -I vesper/tools_build.py --app    the store apps' web layer, into vesper/app/www (ads and purchases on;
                                               then `cd vesper/app && npx cap sync`)
"""
import os, re, shutil, sys, zipfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
APP = '--app' in sys.argv
OUT = os.path.join(HERE, 'app', 'www') if APP else os.path.join(REPO, 'dist', 'vesper-web')

def palettize(path):
    """A sheet of 256 colours or fewer saved as an exact palette PNG (each colour with its own alpha): lossless, and often
    a third of the size. Checked pixel for pixel; kept only when smaller."""
    im = Image.open(path)
    if im.mode == 'P': return 0
    a = np.asarray(im.convert('RGBA')); flat = a.reshape(-1, 4).view(np.uint32).ravel()
    cols, idx = np.unique(flat, return_inverse=True)
    if len(cols) > 256: return 0
    rgba = cols.view(np.uint8).reshape(-1, 4)
    p = Image.fromarray(idx.reshape(a.shape[:2]).astype(np.uint8), 'P'); p.putpalette(rgba[:, :3].ravel().tolist())
    tmp = path + '.tmp.png'; p.save(tmp, optimize=True, transparency=bytes(rgba[:, 3].tolist()))
    if not np.array_equal(np.asarray(Image.open(tmp).convert('RGBA')), a) or os.path.getsize(tmp) >= os.path.getsize(path): os.remove(tmp); return 0
    saved = os.path.getsize(path) - os.path.getsize(tmp); os.replace(tmp, path); return saved

def to_webp(path):
    """The store apps: a sheet as lossless WebP (every pixel the same; both platforms' web views read it)."""
    im = Image.open(path); out = path[:-4] + '.webp'
    im.convert('RGBA').save(out, 'WEBP', lossless=True, quality=100, exact=False, method=4)
    def seen(x): x = np.asarray(x.convert('RGBA')).copy(); x[x[..., 3] == 0] = 0; return x   # what can be seen: a fully clear pixel's colour never is
    if not np.array_equal(seen(Image.open(out)), seen(im)): os.remove(out); return None
    os.remove(path); return os.path.basename(path)

def webp_all(folder):
    """Every PNG sheet in folder to WebP, and the JSON beside them pointed at the new names."""
    from multiprocessing import Pool
    pngs = [os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.png')]
    with Pool() as pool: done = [d for d in pool.map(to_webp, pngs) if d]
    names = set(done)
    for f in os.listdir(folder):
        if not f.endswith('.json'): continue
        j = os.path.join(folder, f); t = open(j).read()
        t2 = re.sub(r'"([A-Za-z0-9_\-]+)\.png"', lambda m: '"' + m.group(1) + '.webp"' if m.group(1) + '.png' in names else m.group(0), t)
        if t2 != t: open(j, 'w').write(t2)
    return len(done)

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'js'))
    code = ''
    for f in sorted(os.listdir(os.path.join(HERE, 'js'))):
        s = open(os.path.join(HERE, 'js', f)).read(); code += s
        open(os.path.join(OUT, 'js', f), 'w').write(s.replace("ROOT: '../assets/'", "ROOT: 'assets/'"))
    html = open(os.path.join(HERE, 'index.html')).read().replace("url('../assets/", "url('assets/")
    if not APP: html = html.replace('<script src="js/data.js">', '<script>window.VESPER_WEB_RELEASE = true;</script>\n<script src="js/data.js">', 1)   # the web build: no ads, no shop
    open(os.path.join(OUT, 'index.html'), 'w').write(html)
    if not APP:
        for f in ('manifest.webmanifest', 'sw.js'): shutil.copy(os.path.join(HERE, f), OUT)
    shutil.copytree(os.path.join(HERE, 'icons'), os.path.join(OUT, 'icons'))
    A = os.path.join(REPO, 'assets'), os.path.join(OUT, 'assets')
    # Whole folders Vesper loads from.
    for d in ('fx', 'cbfx', 'iso', 'music', 'tiles', 'ui', 'vfx'): shutil.copytree(os.path.join(A[0], d), os.path.join(A[1], d))
    os.makedirs(os.path.join(A[1], 'sfx'))
    shutil.copytree(os.path.join(A[0], 'sfx', 'fight'), os.path.join(A[1], 'sfx', 'fight')); shutil.copytree(os.path.join(A[0], 'sfx', 'amb'), os.path.join(A[1], 'sfx', 'amb'))
    for f in re.findall(r"'([a-z_0-9]+)'", open(os.path.join(HERE, 'js', 'audio.js')).read()):
        src = os.path.join(A[0], 'sfx', f + '.mp3')
        if os.path.exists(src): shutil.copy(src, os.path.join(A[1], 'sfx'))
    # Character sets: the random cast (vh_*, metadata in bundles) and every other set the code names.
    os.makedirs(os.path.join(A[1], 'pixel'))
    named = set(re.findall(r"'([a-z][a-z0-9_]+)'", code))
    n = 0
    for f in os.listdir(os.path.join(A[0], 'pixel')):
        base = re.sub(r'(_\d+)?\.(png|json)$', '', f)
        keep = f.startswith('vh_') and (f.endswith('.png') or re.match(r'vh_(b\d+|map)\.json$', f)) or base in named
        if keep: shutil.copy(os.path.join(A[0], 'pixel', f), os.path.join(A[1], 'pixel')); n += 1
    saved = sum(palettize(os.path.join(A[1], 'pixel', f)) for f in os.listdir(os.path.join(A[1], 'pixel')) if f.endswith('.png'))
    print(f'palette sheets: {saved / 1e6:.0f} MB saved, losslessly')
    if APP:   # the stores cap an app's size (Google Play: 200 MB): the sheets go to lossless WebP
        n_webp = webp_all(os.path.join(A[1], 'pixel')) + webp_all(os.path.join(A[1], 'cbfx'))
        cb = os.path.join(A[1], 'cbfx', 'cb.json'); import json as _j; d = _j.load(open(cb))
        if all(os.path.exists(os.path.join(A[1], 'cbfx', f'cb_{i}.webp')) for i in range(d['pages'])): d['ext'] = '.webp'; _j.dump(d, open(cb, 'w'), separators=(',', ':'))
        print(f'webp sheets: {n_webp}')
        size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
        print(f'{OUT}: {n} character files, {size / 1e6:.0f} MB (now: cd vesper/app && npx cap sync)'); return
    z = OUT + '.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(OUT):
            for f in files: p = os.path.join(root, f); zf.write(p, os.path.relpath(p, OUT))
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
    print(f'{OUT}: {n} character files, {size / 1e6:.0f} MB; {z}: {os.path.getsize(z) / 1e6:.0f} MB')

if __name__ == '__main__':
    main()
