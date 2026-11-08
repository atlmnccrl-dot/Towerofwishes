"""Build Vesper as a self-contained web game in dist/vesper-web (and a zip beside it), ready for
itch.io or any static host: the page, the code with its asset root pointed at ./assets, the install
manifest, icons and service worker, and only the assets Vesper uses (every character set named in
its code plus the random-cast sets and their bundles, effects, tiles, sound and music).
Run: python3 -I vesper/tools_build.py
"""
import os, re, shutil, zipfile

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, 'dist', 'vesper-web')

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'js'))
    code = ''
    for f in sorted(os.listdir(os.path.join(HERE, 'js'))):
        s = open(os.path.join(HERE, 'js', f)).read(); code += s
        open(os.path.join(OUT, 'js', f), 'w').write(s.replace("ROOT: '../assets/'", "ROOT: 'assets/'"))
    html = open(os.path.join(HERE, 'index.html')).read().replace("url('../assets/", "url('assets/")
    open(os.path.join(OUT, 'index.html'), 'w').write(html)
    for f in ('manifest.webmanifest', 'sw.js'): shutil.copy(os.path.join(HERE, f), OUT)
    shutil.copytree(os.path.join(HERE, 'icons'), os.path.join(OUT, 'icons'))
    A = os.path.join(REPO, 'assets'), os.path.join(OUT, 'assets')
    # Whole folders Vesper loads from.
    for d in ('fx', 'iso', 'music', 'tiles', 'ui', 'vfx'): shutil.copytree(os.path.join(A[0], d), os.path.join(A[1], d))
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
    z = OUT + '.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(OUT):
            for f in files: p = os.path.join(root, f); zf.write(p, os.path.relpath(p, OUT))
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
    print(f'{OUT}: {n} character files, {size / 1e6:.0f} MB; {z}: {os.path.getsize(z) / 1e6:.0f} MB')

if __name__ == '__main__':
    main()
