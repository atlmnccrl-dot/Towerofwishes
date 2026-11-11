# Assemble the trailer: the captured clips in order, title cards in the game's font, and a mixed score
# (the battle track, ambience, and every sound the game played, at its frame). Writes trailer.mp4.
import json, os, re, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
T = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(T, '..', '..')); FR = T + '/frames'; OUT = T + '/seq'; FPS = 30; SR = 44100
os.makedirs(OUT, exist_ok=True)
FONT = REPO + '/assets/ui/adventurer.ttf'
# 2026-11-11: the story is cut from the opening film (js/openfilm.js): the kings' deaths, the First Cut, the chained guardians, tonight and Vesper, the summit; then the fights; then the title.
EDIT = [('k1_king', 0, 90), ('k2_king', 0, 132), ('k4_king', 0, 84), ('k6_spell', 0, 117), ('k7_rise', 0, 57),
        ('card', 'ONE NIGHT.', 39), ('c08_g1', 0, 90), ('c09_g2', 15, 90), ('c10_art', 0, 108),
        ('card', 'SIX GUARDIANS', 39), ('c13_boss', 0, 96), ('c14_g3', 0, 78), ('c15_ldx', 0, 138),
        ('card', 'ONE BLADE.', 36), ('c17_god', 0, 108), ('t_title', 0, 75), ('end', 'CLIMB THE SPIRE BEFORE DAWN', 96)]
FILM_FROM = {}   # clips cut from the old vector opening (none now): their sounds came from opening_sfx.json
OPEN_SFX = json.load(open(T + '/opening_sfx.json'))['SFX'] if os.path.exists(T + '/opening_sfx.json') else []
ALIAS = dict(re.findall(r"(\w+): '(\w+)'", re.search(r"const ALIAS = \{([^}]*)\}", open(REPO + '/vesper/js/audio.js').read()).group(1)))

def card(text, i, n, end=False):
    im = Image.new('RGB', (1280, 720), (4, 2, 6)); d = ImageDraw.Draw(im)
    size = 64 if not end else 52; f = ImageFont.truetype(FONT, size)
    a = min(1, i / 8) * (min(1, (n - i) / 8) if not end else 1)
    w = d.textlength(text, font=f); x, y = (1280 - w) / 2, 330 - size / 2
    glow = Image.new('RGB', (1280, 720), (0, 0, 0)); ImageDraw.Draw(glow).text((x, y), text, font=f, fill=(int(255 * a), int(40 * a), int(68 * a))); glow = glow.filter(ImageFilter.GaussianBlur(14))
    im = Image.fromarray(np.clip(np.asarray(im, np.int16) + np.asarray(glow, np.int16), 0, 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    d.text((x, y), text, font=f, fill=(int(255 * a + 4 * (1 - a)), int(64 * a), int(84 * a)))
    if end:
        f2 = ImageFont.truetype(FONT, 30); t2 = 'THE BLEEDING MOON'; w2 = d.textlength(t2, font=f2)
        d.text(((1280 - w2) / 2, 420), t2, font=f2, fill=(int(232 * min(1, i / 20)), int(220 * min(1, i / 20)), int(226 * min(1, i / 20))))
        if i > n - 18: im = Image.fromarray((np.asarray(im) * max(0, (n - i) / 18)).astype(np.uint8))
    return im

# Pictures.
n = 0; starts = []
for e in EDIT:
    starts.append(n)
    if e[0] in ('card', 'end'):
        for i in range(e[2]): card(e[1], i, e[2], e[0] == 'end').save(f'{OUT}/{n:05d}.jpg', quality=93); n += 1
    else:
        for i in range(e[1], e[2]):
            src = f'{FR}/{e[0]}_{i:05d}.jpg'; dst = f'{OUT}/{n:05d}.jpg'
            if os.path.exists(dst): os.remove(dst)
            os.link(src, dst); n += 1
total = n / FPS; print('frames', n, 'seconds', round(total, 2))

# Sound.
cache = {}
def load(path):
    if path not in cache:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
        cache[path] = np.frombuffer(raw, np.float32).reshape(-1, 2)
    return cache[path]
mix = np.zeros((int((total + 2) * SR), 2), np.float32)
def add(buf, t, vol, fade_in=0, fade_out=0, dur=None):
    i0 = int(t * SR); b = buf if dur is None else buf[:int(dur * SR)]
    b = b[:max(0, len(mix) - i0)].copy() * vol
    if fade_in: k = min(len(b), int(fade_in * SR)); b[:k] *= np.linspace(0, 1, k)[:, None]
    if fade_out: k = min(len(b), int(fade_out * SR)); b[len(b) - k:] *= np.linspace(1, 0, k)[:, None]
    mix[i0:i0 + len(b)] += b
def sfx(name, t, v, g=0.55):
    name = ALIAS.get(name, name)
    for p in (f'{REPO}/assets/sfx/fight/{name}.mp3', f'{REPO}/assets/sfx/{name}.mp3'):
        if os.path.exists(p): add(load(p), t, g * v); return
# Wind and the story music under the kings, the guardians' theme (the game's own) from the first card to the end.
wind = load(REPO + '/assets/sfx/amb/wind.mp3'); add(np.tile(wind, (4, 1)), 0, 0.22, 1.0, 1.5, dur=starts[5] / FPS)
add(load(REPO + '/assets/music/vesper_story.mp3'), 0, 0.8, 0.5, 0.6, dur=starts[5] / FPS)
music = load(REPO + '/assets/music/vesper_boss.mp3'); m0 = starts[5] / FPS
add(np.tile(music, (2, 1)), m0, 1.1, 0.05, 2.5, dur=total - m0)
for k, e in enumerate(EDIT):
    t0 = starts[k] / FPS
    if e[0] in ('card', 'end'): sfx('blow_big', t0, 0.9); sfx('quake', t0, 0.6); continue
    if e[0] in FILM_FROM:
        f0 = FILM_FROM[e[0]] + e[1] / FPS; dur = (e[2] - e[1]) / FPS
        for (t, name, v) in OPEN_SFX:
            if f0 <= t < f0 + dur: sfx(name, t0 + t - f0, v, 0.32 if k < 5 else 0.5)   # the story quieter, so the trailer builds
    else:
        for ev in json.load(open(f'{FR}/{e[0]}.json'))['ev']:
            if e[1] <= ev['f'] < e[2]: sfx(ev['n'], t0 + (ev['f'] - e[1]) / FPS, ev['v'])
mix = mix[:int(total * SR)]
mix = np.tanh(mix * 1.1) * 0.9   # a soft limiter
mix.astype(np.float32).tofile(T + '/score.f32')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', f'{OUT}/%05d.jpg', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', T + '/score.f32',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', T + '/trailer.mp4'], check=True)
print('wrote', T + '/trailer.mp4', round(os.path.getsize(T + '/trailer.mp4') / 1e6, 1), 'MB')
