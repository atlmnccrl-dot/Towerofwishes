# THE BLEEDING MOON - sound effects synthesised in code (numpy, no samples): the rift gates, the god's blade, souls,
# ice, fire, pickups, loot, a heartbeat and the rift's hum. Writes assets/sfx/fight/<name>.mp3 (via ffmpeg).
# Usage: python3 vesper/tools_sfx.py
import os, subprocess
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = ROOT + '/assets/sfx/fight'; SR = 44100
rng = np.random.default_rng(11)
def t_(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=0.3, d=None, curve=3.0):
    """Attack then an exponential-ish release over the whole length."""
    t = np.arange(n) / SR; tot = n / SR; e = np.clip(t / max(a, 1e-4), 0, 1) * np.clip(1 - (t - a) / max(tot - a, 1e-4), 0, 1) ** curve
    return e
def noise(n): return rng.standard_normal(n)
def lowpass(x, cut):
    """One-pole low-pass; cut may be a number or an array (a sweep)."""
    cut = np.broadcast_to(np.asarray(cut, float), x.shape); a = 1 - np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a[i] * (x[i] - acc); y[i] = acc
    return y
def highpass(x, cut): return x - lowpass(x, cut)
def sine(f, d, ph=0): t = t_(d); f = np.broadcast_to(np.asarray(f, float), t.shape); return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def saw(f, d): t = t_(d); f = np.broadcast_to(np.asarray(f, float), t.shape); p = np.cumsum(f) / SR; return 2 * (p - np.floor(p + 0.5))
def reverb(x, decay=0.35, taps=(0.029, 0.037, 0.043, 0.053, 0.067, 0.079)):
    y = np.concatenate([x, np.zeros(int(SR * 0.6))])
    for i, d in enumerate(taps):
        k = int(d * SR); g = decay * (0.85 ** i); y[k:k + len(x)] += x * g
    return y
def mix(*parts):
    n = max(len(p) for p in parts); y = np.zeros(n)
    for p in parts: y[:len(p)] += p
    return y
def at(x, sec, total):
    y = np.zeros(int(total * SR)); k = int(sec * SR); y[k:k + len(x)] = x[:len(y) - k]; return y
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak

def boom(d=1.0, f0=70, f1=32):
    n = int(d * SR); f = np.linspace(f0, f1, n); return sine(f, d) * env(n, 0.003, curve=2.2) + lowpass(noise(n), 300) * env(n, 0.002, curve=4) * 0.6

S = {}
# The gates open: a low rumble rising under a brass-like chord (two detuned saws through a slowly opening filter).
d = 1.8; n = int(d * SR); rumble = lowpass(noise(n), 120) * np.linspace(0.2, 1, n) * env(n, 0.4, curve=1.2) * 2.5
chord = sum(saw(f * (1 + dt), d) for f in (55, 82.4, 110) for dt in (-0.004, 0.004)) / 6
S['gate_open'] = norm(reverb(mix(rumble, lowpass(chord, np.linspace(200, 1400, n)) * env(n, 0.5, curve=1.5)), 0.4))
# A gate blown apart: a crack, a deep boom and falling debris.
d = 1.4; n = int(d * SR); crack = highpass(noise(int(0.08 * SR)), 1500) * env(int(0.08 * SR), 0.001, curve=2)
debris = sum(at(highpass(noise(int(0.03 * SR)), 2500) * env(int(0.03 * SR), 0.001) * (0.5 + rng.random() * 0.5), 0.15 + rng.random() * 0.9, d) for _ in range(18))
S['gate_break'] = norm(reverb(mix(crack * 1.2, boom(1.3, 90, 30) * 1.4, debris * 0.6), 0.3))
# The god's blade: a descending whoosh out of the sky, then the impact.
d = 1.0; n = int(0.55 * SR); sw = lowpass(noise(n), np.linspace(4000, 300, n)) * np.linspace(0.1, 1, n) ** 2 * 3
S['god_blade'] = norm(reverb(mix(sw, at(boom(0.7, 110, 35) * 1.6, 0.5, d), at(highpass(noise(int(0.06 * SR)), 1800) * env(int(0.06 * SR), 0.001), 0.5, d)), 0.3))
# A soul leaving: a pale rising chime with a breath of air.
d = 0.9; n = int(d * SR); ch = (sine(np.linspace(660, 990, n), d) * 0.6 + sine(np.linspace(990, 1480, n), d) * 0.3) * env(n, 0.02, curve=2.5)
S['soul'] = norm(reverb(mix(ch, lowpass(noise(n), 2500) * env(n, 0.1, curve=3) * 0.15), 0.45), 0.6)
# Ice: glassy pings over a crackle.
d = 0.7; ice = sum(at(sine(f, 0.3) * env(int(0.3 * SR), 0.001, curve=4), dt, d) for f, dt in ((2637, 0), (3136, 0.04), (3951, 0.09), (2349, 0.13)))
S['ice'] = norm(reverb(mix(ice, highpass(noise(int(d * SR)), 3000) * env(int(d * SR), 0.002, curve=5) * 0.4), 0.35), 0.7)
# Fire: a whoosh catching, then crackles.
d = 0.9; n = int(d * SR); wh = lowpass(noise(n), np.linspace(300, 2500, n)) * env(n, 0.08, curve=1.6)
cr = sum(at(highpass(noise(int(0.012 * SR)), 2000) * (0.3 + rng.random() * 0.7), rng.random() * d, d) for _ in range(30))
S['fire'] = norm(mix(wh, cr * 0.5), 0.75)
# A pickup: two bright notes.
d = 0.3; S['pickup'] = norm(reverb(mix(at(sine(988, 0.12) * env(int(0.12 * SR), 0.002, curve=2), 0, d), at(sine(1480, 0.18) * env(int(0.18 * SR), 0.002, curve=2), 0.07, d)), 0.3), 0.55)
# Loot: a sparkling arpeggio.
d = 0.8; S['loot'] = norm(reverb(sum(at(sine(f, 0.25) * env(int(0.25 * SR), 0.002, curve=3) * (1 - i * 0.1), i * 0.06, d) for i, f in enumerate((1047, 1319, 1568, 2093, 2637))), 0.4), 0.6)
# A heartbeat: lub-dub.
d = 0.8; beat = lambda f, l: lowpass(sine(np.linspace(f, f * 0.6, int(l * SR)), l) * env(int(l * SR), 0.004, curve=3), 200)
S['heartbeat'] = norm(mix(at(beat(60, 0.18), 0, d), at(beat(52, 0.2) * 0.75, 0.24, d)), 0.85)
# The rift's hum: a low wobbling drone with a shimmer.
d = 1.3; n = int(d * SR); lfo = 1 + 0.2 * np.sin(2 * np.pi * 5 * t_(d)); hum = (sine(48, d) * 0.7 + sine(96.5, d) * 0.3) * lfo
S['rift'] = norm(reverb(mix(hum * env(n, 0.2, curve=1.5), highpass(noise(n), 4000) * env(n, 0.3, curve=2) * 0.08), 0.3), 0.6)

os.makedirs(OUT, exist_ok=True)
for name, x in S.items():
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '96k', f'{OUT}/{name}.mp3'], input=pcm, check=True)
    print(name, round(len(x) / SR, 2), 's')
