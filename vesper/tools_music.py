# THE BLEEDING MOON - original music, composed and synthesised in code (numpy, no samples, no licence to check:
# the game's own). 2026-11-11, "one track plays everywhere". Every track is in D minor around one motif, the moon's
# (D F E A, Bb A G F E D), and loops seamlessly (each is rendered with its tail folded back onto its start).
#   vesper_title   slow strings and a distant choir under the motif on bells; a low boom every eight bars
#   vesper_map     harp arpeggios over a soft pad, the motif on a celesta in the second half
#   vesper_story   tension under the story scenes: a low drone, a heartbeat drum, a string cluster, glass
#   vesper_boss    140 bpm: taiko, a low string ostinato, brass with the motif, the choir, a breakdown and build
#   vesper_night   128 bpm battle for the late acts and endless: Phrygian (the dark Eb), sixteenth-note strings, toms
#   vesper_result  a short victory loop that turns to D major
# Writes assets/music/<name>.mp3 (the shared music folder: new names only, never a file that is there).
# Usage: python3 vesper/tools_music.py [name ...] [--force]
import os, sys, subprocess
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = ROOT + '/assets/music'; SR = 44100
rng = np.random.default_rng(23)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR

# ---- filters in the frequency domain (fast for whole notes and whole tracks) ---------------------------------------
def ffilt(x, H):
    n = len(x); N = 1 << (n - 1).bit_length(); X = np.fft.rfft(x, N); f = np.fft.rfftfreq(N, 1 / SR)
    return np.fft.irfft(X * H(f), N)[:n]
def lp(x, fc, order=4): return ffilt(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))
def hp(x, fc, order=4): return ffilt(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))
def bp(x, lo, hi): return hp(lp(x, hi), lo)

def adsr(n, a=0.01, d=0.1, s=0.8, r=0.3):
    """Attack, decay to sustain, held, then released over the last r seconds."""
    t = np.arange(n) / SR; T = n / SR; e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((T - t) / max(r, 1e-4), 0, 1); return e * rel
def saw(f, t, ph=0.0): p = f * t + ph; return 2 * (p - np.floor(p + 0.5))

# ---- instruments: each returns a mono note ---------------------------------------------------------------------------
def strings(m, d, v=1.0, bright=2600, a=0.7, r=1.2):
    t = tt(d + r); f = hz(m); x = sum(saw(f * 2 ** (c / 1200), t, rng.random()) for c in (-9, -4, 0, 5, 10)) / 5
    x *= 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)
    return lp(x, bright, 3) * adsr(len(t), a, 0.6, 0.85, r) * v
def choir(m, d, v=1.0, a=1.0, r=1.4, vowel='ah'):
    t = tt(d + r); f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * 4.8 * t + rng.random() * 6))
    p = np.cumsum(f) / SR; x = sum(2 * ((p * 2 ** (c / 1200) + rng.random()) % 1) - 1 for c in (-8, 0, 7))
    F = {'ah': [(750, 1.0, 110), (1150, 0.55, 130), (2700, 0.12, 220)], 'oo': [(350, 1.0, 80), (800, 0.35, 110), (2300, 0.05, 220)]}[vowel]
    x = ffilt(x, lambda fr: (sum(g * np.exp(-((fr - c) / w) ** 2) for c, g, w in F) + 0.004) / np.sqrt(1 + (fr / 3400) ** 8))
    return x * adsr(len(t), a, 0.8, 0.9, r) * v * 3
def bell(m, d, v=1.0):
    t = tt(max(d, 3.5)); f = hz(m); x = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 3.2), (2.0, 0.45, 2.0), (2.76, 0.32, 1.3), (5.40, 0.16, 0.6), (8.93, 0.08, 0.3)):
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    return x * np.clip(t / 0.002, 0, 1) * v * 0.5
def celesta(m, d, v=1.0):
    t = tt(2.2); f = hz(m); x = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.25)
    return x * np.clip(t / 0.002, 0, 1) * v * 0.5
def harp(m, d, v=1.0):
    t = tt(2.6); f = hz(m); x = np.zeros_like(t)
    for k in range(1, 9): x += (1 / k ** 1.4) * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (1.9 / k ** 0.7))
    return x * np.clip(t / 0.003, 0, 1) * v * 0.45
def bass(m, d, v=1.0, fc=520):
    t = tt(d + 0.08); f = hz(m); x = 0.7 * saw(f, t) + 0.3 * saw(f * 1.004, t) + 0.6 * np.sin(2 * np.pi * f / 2 * t)
    return lp(x, fc, 3) * adsr(len(t), 0.006, 0.12, 0.6, 0.06) * v
def brass(m, d, v=1.0, a=0.08):
    t = tt(d + 0.25); f = hz(m); n = len(t); e = adsr(n, a, 0.3, 0.75, 0.25); b = 1.5 + 9 * e
    x = np.zeros(n); vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t - 0.3, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    for k in range(1, 22):
        if f * k > 9000: break
        x += (1 / k) * np.exp(-(k - 1) / b) * np.sin(k * ph)
    return x * e * v * 0.9
def taiko(v=1.0, f0=72, f1=44):
    t = tt(1.4); f = f1 + (f0 - f1) * np.exp(-t / 0.05); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.42)
    x += lp(rng.standard_normal(len(t)), 600) * np.exp(-t / 0.05) * 0.8
    return x * v
def tom(v=1.0, f0=150): return taiko(v, f0, f0 * 0.7)[: int(0.7 * SR)] * np.exp(-tt(0.7) / 0.18)
def hit(v=1.0):
    t = tt(0.4); x = bp(rng.standard_normal(len(t)), 700, 5000) * np.exp(-t / 0.08) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.06)
    return x * v * 0.6
def tick(v=1.0): t = tt(0.12); return hp(rng.standard_normal(len(t)), 6000) * np.exp(-t / 0.025) * v * 0.3
def swell(d, v=1.0):
    t = tt(d); x = hp(rng.standard_normal(len(t)), 4500, 2) * (t / d) ** 2.5
    return x * v * 0.35
def boom(v=1.0):
    t = tt(4.0); x = np.sin(2 * np.pi * (38 + 30 * np.exp(-t / 0.15)) * t) * np.exp(-t / 1.4) + lp(rng.standard_normal(len(t)), 180) * np.exp(-t / 0.5) * 0.7
    return x * v
def heart(v=1.0):
    t = tt(0.5); return np.sin(2 * np.pi * (52 + 20 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.13) * v
def glass(m, d, v=1.0):
    t = tt(d); x = np.sin(2 * np.pi * hz(m) * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 6.5 * t)) + 0.2 * np.sin(2 * np.pi * hz(m) * 3.01 * t)
    return x * adsr(len(t), d * 0.4, 0.5, 0.9, d * 0.4) * v * 0.25
def drone(ms, d, v=1.0, xf=0.02):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(m) * t + rng.random() * 6) * (1 + 0.3 * np.sin(2 * np.pi * (0.05 + 0.03 * i) * t)) for i, m in enumerate(ms))
    x += lp(rng.standard_normal(len(t)), 260) * 0.25 * (1 + 0.5 * np.sin(2 * np.pi * 0.07 * t))
    e = np.clip(np.minimum(t, d - t) / xf, 0, 1); return x * e * v / len(ms)

# ---- the score: a stereo bus per track, with reverb ------------------------------------------------------------------
class Track:
    def __init__(self, length, bpm):
        self.L = length; self.bpm = bpm; self.beat = 60 / bpm; tail = 6.0
        self.dry = np.zeros((2, int((length + tail) * SR))); self.wet = np.zeros_like(self.dry)
    def put(self, x, at, pan=0.0, rev=0.3, gain=1.0):
        i = int(at * SR); n = min(len(x), self.dry.shape[1] - i)
        if n <= 0: return
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); x = x[:n] * gain
        self.dry[0, i:i + n] += x * l * (1 - rev * 0.5); self.dry[1, i:i + n] += x * r * (1 - rev * 0.5)
        self.wet[0, i:i + n] += x * l * rev; self.wet[1, i:i + n] += x * r * rev
    def b(self, beats): return beats * self.beat
    def render(self, decay=2.8, target=-21.0):
        n = int(decay * SR); t = np.arange(n) / SR; out = self.dry.copy()
        for c in (0, 1):   # a different decaying noise for each ear: a wide hall
            ir = rng.standard_normal(n) * np.exp(-t * 6.9 / decay); ir = lp(ir, 5200, 2) * 0.6 + lp(ir, 1200, 2) * 0.4; ir[: int(0.012 * SR)] = 0
            ir /= np.sqrt(np.sum(ir ** 2)); N = 1 << (len(self.wet[c]) + n).bit_length()
            out[c] += np.fft.irfft(np.fft.rfft(self.wet[c], N) * np.fft.rfft(ir, N), N)[: out.shape[1]] * 0.55
        L = int(self.L * SR); y = out[:, :L].copy(); tail = out[:, L:]; y[:, : tail.shape[1]] += tail   # the loop: the tail folds onto the start
        y = hp(y[0], 28, 2), hp(y[1], 28, 2); y = np.vstack(y)
        rms = np.sqrt(np.mean(y ** 2)) + 1e-9; y *= 10 ** ((target - 3) / 20) / rms
        lim = lambda z: np.tanh(z * 1.1) / np.tanh(1.1)   # a soft limiter
        for _ in range(2): y *= 10 ** ((target - lufs(lim(y))) / 20)   # to the loudness asked, measured as a player hears it
        y = lim(y); k = int(0.003 * SR); ramp = np.linspace(0, 1, k)   # 3 ms in and out: the wrap never clicks
        y[:, :k] *= ramp; y[:, -k:] *= ramp[::-1]; return y

CH = {'Dm': [50, 53, 57], 'Bb': [46, 50, 53], 'Gm': [43, 46, 50], 'A': [45, 49, 52], 'F': [41, 45, 48], 'C': [48, 52, 55], 'Eb': [51, 55, 58],
      'D': [50, 54, 57], 'Am': [45, 48, 52], 'Gm/Bb': [46, 50, 55], 'Asus': [45, 50, 52]}
MOTIF = [(74, 1), (77, 1), (76, 2), (69, 2), (70, 1), (69, 1), (67, 1), (65, 1), (64, 2), (62, 2)]   # (midi, beats): 14 beats

def chord_pad(T, prog, bar_beats, start_bar, inst, oct=12, v=0.5, pan=0.3, rev=0.5, **kw):
    for i, c in enumerate(prog):
        at = T.b((start_bar + i) * bar_beats); d = T.b(bar_beats) + 0.2
        for j, m in enumerate(CH[c]): T.put(inst(m + oct, d, v, **kw), at, pan * (j - 1), rev)

def motif(T, at_beat, inst, shift=0, v=0.6, pan=0.15, rev=0.55, scale=1.0):
    b = at_beat
    for m, l in MOTIF: T.put(inst(m + shift, T.b(l * scale), v), T.b(b), pan, rev); b += l * scale

def title():
    T = Track(64.0, 60)   # 16 bars of 4
    prog = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'F', 'Bb', 'Gm', 'Dm', 'Bb', 'A', 'A']
    T.put(drone([26, 38, 45], 66.0, 0.5, xf=2.0), 0, 0, 0.3)   # its last two seconds fold onto its first two: a crossfade
    chord_pad(T, prog, 4, 0, strings, 0, 0.32, 0.5, 0.55, bright=1800)
    for i, c in enumerate(prog[8:]): [T.put(choir(m + 12, T.b(4) + 0.3, 0.13), T.b((8 + i) * 4), 0.4 * (j - 1), 0.75) for j, m in enumerate(CH[c])]
    for i, c in enumerate(prog): T.put(bass(CH[c][0] - 12, T.b(4), 0.35, 260), T.b(i * 4), 0, 0.2)
    motif(T, 2, bell, 0, 0.55); motif(T, 34, bell, 12, 0.32, -0.2)
    for at in (0, 32): T.put(boom(0.9), T.b(at), 0, 0.4)
    return T.render(3.4, -23.0)

def map_():
    T = Track(16 * 4 * 60 / 76, 76)   # 16 bars of 4
    prog = ['Dm', 'F', 'C', 'Gm', 'Dm', 'F', 'Bb', 'A', 'Dm', 'F', 'C', 'Gm', 'Bb', 'F', 'Asus', 'A']
    for i, c in enumerate(prog):
        r, th, fi = CH[c]; pat = [r, fi, r + 12, th + 12, fi + 12, th + 12, r + 12, fi]
        for k, m in enumerate(pat): T.put(harp(m + 12, 0.5, 0.42 if k % 4 else 0.55), T.b(i * 4 + k * 0.5), -0.3 + 0.08 * (k % 4), 0.5)
        T.put(bass(r - 12, T.b(4), 0.22, 220), T.b(i * 4), 0, 0.3)
    chord_pad(T, prog, 4, 0, strings, 0, 0.16, 0.6, 0.6, bright=1300, a=1.2)
    motif(T, 32 + 1, celesta, 12, 0.35, 0.35)
    return T.render(3.0, -23.5)

def story():
    T = Track(57.6, 50)   # 12 bars of 4 at 50 bpm
    T.put(drone([26, 33, 38], 59.6, 0.55, xf=2.0), 0, 0, 0.3)
    for bar in range(12):
        at = T.b(bar * 4)
        T.put(heart(0.55), at, 0, 0.25); T.put(heart(0.38), at + 0.32, 0, 0.25)
        if bar % 4 == 2: T.put(heart(0.5), at + T.b(2), 0, 0.25); T.put(heart(0.33), at + T.b(2) + 0.32, 0, 0.25)
    for bar, ms in ((0, [50, 51]), (4, [53, 54]), (8, [50, 51, 57])):   # a slow minor-second cluster, swelling
        for j, m in enumerate(ms): T.put(strings(m, T.b(16) - 1.5, 0.22, 1400, a=4.0, r=2.5), T.b(bar * 4), 0.5 * (j - 0.5), 0.6)
    for j, m in enumerate([62, 65, 69]): T.put(choir(m, T.b(12), 0.1, a=5.0, r=3.0, vowel='oo'), T.b(16), 0.4 * (j - 1), 0.8)
    T.put(glass(93, T.b(8), 0.6), T.b(8), 0.6, 0.8); T.put(glass(92, T.b(8), 0.5), T.b(36), -0.6, 0.8)
    for bar, m in ((3, 74), (7, 75), (11, 69)): T.put(bell(m, 3.5, 0.3), T.b(bar * 4 + 2), -0.3, 0.7)
    return T.render(3.6, -25.0)

def boss():
    T = Track(32 * 4 * 60 / 140, 140)   # 32 bars of 4
    prog = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Gm', 'A'] * 4
    ost = [0, 0, 3, 0, 0, 0, 5, 3]   # semitones over the root, in eighths
    for bar in range(32):
        sec = bar // 8; c = prog[bar]; root = CH[c][0] - 12; at = T.b(bar * 4)
        # Drums: a big taiko on one, the pattern on the eighths; the breakdown (section 3) is taiko alone, then the build.
        T.put(taiko(1.0), at, 0, 0.35)
        for e, vv in ((3, 0.55), (4, 0.75), (6, 0.5), (7, 0.4)): T.put(taiko(vv, 90, 58), at + T.b(e * 0.5), 0.2 * ((e % 2) * 2 - 1), 0.3)
        if sec != 3:
            for e in (2, 6): T.put(hit(0.55), at + T.b(e * 0.5), 0.1, 0.35)
            for e in range(8): T.put(tick(0.5 if e % 2 else 0.8), at + T.b(e * 0.5), 0.5, 0.2)
            for e, s in enumerate(ost): T.put(bass(root + s, T.b(0.5) * 0.9, 0.5), at + T.b(e * 0.5), -0.1, 0.15)
            T.put(strings(root + 12, T.b(4), 0.25, 1500, a=0.05, r=0.3), at, -0.4, 0.4)
        else:
            T.put(drone([root - 12, root - 5], T.b(4) + 0.1, 0.4, xf=0.05), at, 0, 0.3)
        if sec in (1, 2):   # brass stabs on the chord, then the motif
            for j, m in enumerate(CH[c]): T.put(brass(m, T.b(1.5), 0.32), at, 0.3 * (j - 1), 0.4)
        if sec == 2:
            for j, m in enumerate(CH[c]): T.put(choir(m + 12, T.b(4) + 0.1, 0.14, a=0.15, r=0.5), at, 0.5 * (j - 1), 0.6)
    motif(T, 8 * 4, brass, -12, 0.5, 0.0, 0.45, scale=1.0); motif(T, 8 * 4 + 16, brass, -12, 0.5, 0.0, 0.45, scale=1.0)
    motif(T, 16 * 4, brass, 0, 0.42, 0.0, 0.5); motif(T, 16 * 4 + 16, strings, 12, 0.3, 0.2, 0.5)
    T.put(swell(T.b(16), 1.0), T.b(28 * 4), 0, 0.5)
    for i in range(16): T.put(tom(0.4 + i * 0.035, 130 + (i % 4) * 25), T.b(28 * 4 + 8 + i * 0.5), 0.3 * ((i % 2) * 2 - 1), 0.3)
    return T.render(2.4, -21.0)

def night():
    T = Track(32 * 4 * 60 / 128, 128)
    prog = ['Dm', 'Eb', 'Dm', 'C', 'Dm', 'Eb', 'Bb', 'A'] * 4
    for bar in range(32):
        sec = bar // 8; c = prog[bar]; root = CH[c][0]; at = T.b(bar * 4)
        for s in range(16):   # sixteenth-note strings: the root and its fifth
            m = root + (7 if s % 4 == 2 else 12 if s % 8 == 7 else 0)
            T.put(strings(m - 12, T.b(0.25) * 0.8, 0.22 if s % 4 else 0.32, 2200, a=0.005, r=0.08), at + T.b(s * 0.25), -0.25, 0.25)
        T.put(bass(root - 24, T.b(4), 0.45, 300), at, 0, 0.1)
        for e in (0, 3, 6): T.put(taiko(0.8 if e == 0 else 0.5, 80, 50), at + T.b(e * 0.5), 0, 0.3)
        if sec >= 1:
            for e in (2, 6): T.put(hit(0.5), at + T.b(e * 0.5), 0.1, 0.3)
            for e in range(8): T.put(tick(0.45), at + T.b(e * 0.5), 0.4, 0.2)
        if sec >= 2:
            for j, m in enumerate(CH[c]): T.put(choir(m + 12, T.b(4) + 0.1, 0.12, a=0.3, r=0.6), at, 0.5 * (j - 1), 0.6)
        if sec == 3 and bar % 2 == 0:
            for j, m in enumerate(CH[c]): T.put(brass(m, T.b(2), 0.28), at, 0.3 * (j - 1), 0.4)
    motif(T, 8 * 4, strings, 0, 0.32, 0.25, 0.45); motif(T, 8 * 4 + 16, strings, 0, 0.32, 0.25, 0.45)
    motif(T, 24 * 4, brass, -12, 0.45, 0.0, 0.45); motif(T, 24 * 4 + 16, brass, -12, 0.45, 0.0, 0.45)
    for i in range(8): T.put(tom(0.4 + i * 0.06, 120 + (i % 4) * 30), T.b(31 * 4 + i * 0.5), 0.3 * ((i % 2) * 2 - 1), 0.3)
    return T.render(2.2, -21.0)

def result():
    T = Track(8 * 4 * 60 / 70, 70)
    prog = ['Bb', 'F', 'Gm', 'A', 'Bb', 'F', 'Gm/Bb', 'D']
    chord_pad(T, prog, 4, 0, strings, 0, 0.3, 0.5, 0.55, bright=2200, a=0.5)
    for i, c in enumerate(prog):
        T.put(bass(CH[c][0] - 12, T.b(4), 0.3, 260), T.b(i * 4), 0, 0.2)
        for k, m in enumerate([CH[c][0] + 12, CH[c][1] + 12, CH[c][2] + 12, CH[c][1] + 24]): T.put(harp(m, 0.5, 0.3), T.b(i * 4 + k), -0.3, 0.5)
    for j, (m, b) in enumerate([(74, 0), (77, 1), (76, 2), (69, 4), (70, 16), (69, 17), (67, 18), (66, 20), (62, 24)]): T.put(bell(m, 3.5, 0.4), T.b(b + 0.02), 0.2, 0.6)
    for j, m in enumerate([62, 66, 69]): T.put(choir(m + 12, T.b(4) + 0.4, 0.1), T.b(28), 0.4 * (j - 1), 0.7)
    return T.render(3.0, -22.0)

TRACKS = {'vesper_title': title, 'vesper_map': map_, 'vesper_story': story, 'vesper_boss': boss, 'vesper_night': night, 'vesper_result': result}

def lufs(y):
    pcm = (np.clip(y.T, -1, 1) * 32767).astype('<i2').tobytes()
    r = subprocess.run(['ffmpeg', '-hide_banner', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], input=pcm, capture_output=True)
    for line in r.stderr.decode().splitlines()[::-1]:
        if 'I:' in line: return float(line.split('I:')[1].split('LUFS')[0])
    return -20.0

def write(name, y, force=False):
    path = f'{OUT}/{name}.mp3'
    if os.path.exists(path) and not force: print('kept', path); return
    pcm = (np.clip(y.T, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '128k', path], input=pcm, check=True)
    print('wrote', path, f'{len(y[0]) / SR:.1f}s', os.path.getsize(path) // 1024, 'KB')

if __name__ == '__main__':
    force = '--force' in sys.argv; names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(TRACKS)
    for n in names: write(n, TRACKS[n](), force)
