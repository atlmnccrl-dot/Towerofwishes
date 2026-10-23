#!/usr/bin/env python3
"""
Tower of Wishes - synthesise the fight sounds and ambience loops (original work, made here;
no samples). Writes assets/sfx/fight/*.mp3 and assets/sfx/amb/*.mp3.

    python3 tools/make_sfx.py

Each sound is built from noise, filters and decaying partials: swings are swept band-passed
noise, blows a falling low thump with a noise crack, parries ring with inharmonic metal
partials, spells shimmer. Rerun after changing a recipe; ffmpeg encodes the MP3s.
"""
import os, subprocess, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sfx')
rng = np.random.default_rng(7)

def t_(dur): return np.arange(int(round(SR * dur))) / SR
def env(dur, a=0.005, d=None, curve=4.0):
    t = t_(dur); n = len(t); e = np.ones(n)
    na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    k = np.linspace(0, 1, n - na); e[na:] = (1 - k) ** curve
    return e
def noise(dur): return rng.standard_normal(int(round(SR * dur)))
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)
def sweep_bp(x, f0, f1, q=2.5):
    # band-pass whose centre glides from f0 to f1 (processed in short blocks)
    out = np.zeros_like(x); blk = 256; n = len(x)
    for i in range(0, n, blk):
        k = i / max(1, n - 1); f = f0 * (f1 / f0) ** k
        lo, hi = f / (1 + 1 / q), min(f * (1 + 1 / q), SR / 2 - 100)
        sos = signal.butter(2, [lo, hi], 'bandpass', fs=SR, output='sos')
        seg = x[max(0, i - 512): i + blk]
        y = signal.sosfilt(sos, seg); out[i:i + blk] = y[-len(x[i:i + blk]):]
    return out
def glide(f0, f1, dur, shape=2.0):
    t = t_(dur); k = (t / dur) ** (1 / shape); f = f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def partials(base, ratios, decays, dur, amps=None):
    t = t_(dur); y = np.zeros_like(t)
    for i, (r, d) in enumerate(zip(ratios, decays)):
        a = 1 if amps is None else amps[i]
        y += a * np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    return y
def norm(y, peak=0.9):
    m = np.max(np.abs(y)) or 1
    return y / m * peak
def pad(y, dur):
    n = int(SR * dur)
    return np.concatenate([y, np.zeros(max(0, n - len(y)))])[:n] if len(y) < n else y
def mix(*ys):
    n = max(len(y) for y in ys); out = np.zeros(n)
    for y in ys: out[:len(y)] += y
    return out
def save(name, y, peak=0.9, stereo_w=0.0):
    y = norm(y, peak)
    fade = min(len(y) // 4, int(0.01 * SR)); y[-fade:] *= np.linspace(1, 0, fade)
    path = os.path.join(ROOT, name + '.mp3'); os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: tmp = f.name
    data = np.stack([y, y], 1) if not stereo_w else np.stack([y, np.roll(y, int(stereo_w * SR))], 1)
    wavfile.write(tmp, SR, (data * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '96k', path], check=True)
    os.unlink(tmp)
    print('wrote', os.path.relpath(path, os.path.join(ROOT, '..', '..')), f'{len(y) / SR:.2f}s')

# ------------------------------------------------------------ fight
def swish(i):
    d = 0.22 + 0.04 * i
    x = sweep_bp(noise(d), 700 + 150 * i, 2600 - 200 * i, q=1.6) * env(d, a=d * 0.45, curve=2.2)
    return x
def blow(i):
    d = 0.18
    thump = glide(110 - 12 * i, 48, d, 1.6) * env(d, a=0.002, curve=3.5)
    crack = lp(noise(0.05), 2200 + 600 * i) * env(0.05, a=0.001, curve=2.5)
    cloth = bp(noise(0.09), 400, 1600) * env(0.09, a=0.002, curve=2) * 0.5
    return mix(thump * 1.0, crack * 0.8, cloth)
def blow_big():
    d = 0.42
    thump = glide(90, 32, d, 1.4) * env(d, a=0.002, curve=2.6)
    crunch = lp(noise(0.12), 1800) * env(0.12, a=0.001, curve=1.8)
    y = mix(thump * 1.2, crunch * 0.9)
    return np.tanh(y * 2.2)
def slash(i):
    # a blade connecting: a short bright scrape over a blow
    d = 0.2
    scrape = sweep_bp(noise(d), 3200, 1500, q=3) * env(d, a=0.002, curve=2.4)
    ring = partials(1450 + 160 * i, [1, 2.4, 3.9], [0.06, 0.04, 0.03], d) * 0.25
    return mix(scrape * 0.9, ring, blow(i) * 0.7)
def clang(i):
    d = 0.9
    ring = partials(620 + 90 * i, [1, 2.76, 5.40, 8.93, 13.3], [0.5, 0.32, 0.18, 0.1, 0.06], d, [1, 0.7, 0.5, 0.3, 0.2])
    click = hp(noise(0.02), 2000) * env(0.02, a=0.0005, curve=2)
    return mix(ring * 0.6, click * 0.9)
def whoosh_soft():
    d = 0.32
    return sweep_bp(noise(d), 500, 1400, q=1.2) * env(d, a=0.12, curve=2.5) * 0.6
def ko():
    d = 0.7
    fall = glide(70, 30, 0.5, 1.2) * env(0.5, a=0.003, curve=2.2)
    dust = lp(noise(d), 600) * env(d, a=0.02, curve=3)
    return mix(fall * 1.1, dust * 0.5)
def allout():
    d = 0.9
    rise = sweep_bp(noise(d), 300, 4000, q=1.4) * np.linspace(0, 1, int(SR * d)) ** 2
    boom = np.concatenate([np.zeros(int(SR * 0.62)), glide(80, 30, 0.6, 1.3) * env(0.6, a=0.002, curve=2.2)])
    return mix(rise * 0.7, boom * 1.2)
def magic():
    d = 0.8
    t = t_(d)
    y = np.zeros_like(t)
    for k, f in enumerate([660, 990, 1320, 1760]):
        vib = 1 + 0.01 * np.sin(2 * np.pi * (5 + k) * t)
        y += np.sin(2 * np.pi * np.cumsum(f * vib * (1 + 0.12 * t)) / SR) * np.exp(-t / (0.35 + 0.1 * k))
    sh = hp(noise(d), 5000) * env(d, a=0.05, curve=2) * 0.15
    return mix(y * env(d, a=0.03, curve=1.5), sh)
def fire():
    d = 0.6
    roar = lp(noise(d), 900) * env(d, a=0.04, curve=1.8)
    pops = np.zeros(int(SR * d))
    for _ in range(14):
        p = int(rng.uniform(0, d - 0.02) * SR); pops[p:p + 120] += hp(rng.standard_normal(120), 1500) * rng.uniform(0.3, 1)
    return mix(roar, pops * 0.6)
def ice():
    d = 0.6
    y = partials(2100, [1, 1.5, 2.13, 2.9, 3.7], [0.25, 0.2, 0.15, 0.1, 0.08], d, [1, 0.8, 0.6, 0.5, 0.4])
    crack = hp(noise(0.05), 3000) * env(0.05, a=0.0005, curve=2)
    return mix(y * 0.5, crack)
def quake():
    d = 1.1
    rum = lp(noise(d), 120, 4) * env(d, a=0.05, curve=1.5) * 3
    return np.tanh(mix(rum, glide(45, 28, d, 1) * env(d, a=0.01, curve=1.6)))
def thud():
    return blow_big()[:int(SR * 0.3)] * 0.8
def bolt():
    d = 0.5
    crack = hp(noise(d), 1200) * env(d, a=0.001, curve=4)
    buzz = signal.sawtooth(2 * np.pi * 70 * t_(d)) * env(d, a=0.001, curve=3) * 0.3
    return mix(crack, buzz)
def charge():
    d = 1.2
    t = t_(d)
    tone = np.sin(2 * np.pi * np.cumsum(180 + 600 * (t / d) ** 2) / SR) * (t / d)
    air = sweep_bp(noise(d), 300, 3000, q=1.5) * (t / d) ** 1.5
    return mix(tone * 0.5, air * 0.6)
def step(i):
    d = 0.09
    return mix(lp(noise(d), 500 + 120 * i) * env(d, a=0.002, curve=3), glide(90, 60, 0.05) * env(0.05, a=0.001) * 0.4)

def horn():
    # the Tower's horn: one vast low brass note heard across the world (swell, hold, long tail)
    d = 6.5; t = t_(d)
    sw = np.clip(t / 1.1, 0, 1) ** 1.6 * np.where(t < 3.6, 1, np.exp(-(t - 3.6) / 1.1))
    f = 55 * (1 + 0.004 * np.sin(2 * np.pi * 4.2 * t) * sw)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(k * ph + rng.uniform(0, 6.28)) / k ** 1.15 for k in range(1, 18))
    fifth = sum(np.sin(1.5 * k * ph + rng.uniform(0, 6.28)) / k ** 1.4 for k in range(1, 9))
    y = tone + 0.35 * fifth
    y = mix(lp(y, 700, 4) * sw, lp(y, 1600, 2) * sw ** 3 * 0.5)   # the brass opens as it swells
    rumble = lp(noise(d), 90, 4) * sw * 2.0
    tail = np.convolve(y, lp(noise(2.5), 900) * np.exp(-t_(2.5) / 0.8), 'full')[:len(y)]
    return mix(y, norm(tail, np.max(np.abs(y)) * 0.6), rumble)

# ------------------------------------------------------------ ambience loops (seamless)
def loopify(y, xf=1.0):
    n = int(SR * xf); a = y[:n]; b = y[-n:]
    k = np.linspace(0, 1, n)
    y2 = y[n:-n].copy() if len(y) > 3 * n else y[n:].copy()
    head = b * (1 - k) + a * k
    return np.concatenate([head, y[n:-n]])
def wind():
    d = 12
    x = noise(d + 2)
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * t_(d + 2) / 6.0 + 1) * np.sin(2 * np.pi * t_(d + 2) / 3.7)
    y = lp(x, 420, 2) * lfo + bp(noise(d + 2), 700, 1400) * 0.12 * lfo
    return loopify(y, 2.0)
def crackle():
    d = 10
    base = lp(noise(d + 2), 300) * 0.25
    pops = np.zeros(int(SR * (d + 2)))
    for _ in range(int(9 * d)):
        p = int(rng.uniform(0, d + 1.9) * SR); L = int(rng.uniform(40, 220))
        pops[p:p + L] += hp(rng.standard_normal(L), 900) * rng.uniform(0.1, 1) * np.linspace(1, 0, L)
    return loopify(mix(base, pops * 0.7), 1.0)
def night():
    d = 10
    t = t_(d + 2); y = lp(noise(d + 2), 300) * 0.08
    for _ in range(26):
        s = rng.uniform(0, d + 1.5); f = rng.uniform(4200, 5600); n = int(rng.uniform(4, 9))
        for j in range(n):
            st = int((s + j * 0.055) * SR); L = int(0.03 * SR)
            if st + L < len(y): y[st:st + L] += np.sin(2 * np.pi * f * t_(0.03)) * np.hanning(L) * 0.25
    return loopify(y, 1.0)
def murmur():
    # a room of low voices: many band-limited, slowly gated noise "speakers"
    d = 12
    T = t_(d + 2); y = np.zeros_like(T)
    for k in range(9):
        v = bp(noise(d + 2), 180 + 40 * k, 900 + 60 * k)
        syl = (np.sin(2 * np.pi * rng.uniform(2.5, 4.5) * T + rng.uniform(0, 6)) > rng.uniform(-0.2, 0.4)).astype(float)
        syl = lp(syl, 12)
        phrase = (np.sin(2 * np.pi * rng.uniform(0.08, 0.2) * T + rng.uniform(0, 6)) > -0.3).astype(float)
        y += v * np.clip(syl, 0, 1) * lp(phrase, 2) * rng.uniform(0.5, 1)
    return loopify(lp(y, 1800), 2.0)

if __name__ == '__main__':
    for i in range(3): save(f'fight/swish_{i}', swish(i), 0.6)
    for i in range(3): save(f'fight/blow_{i}', blow(i), 0.85)
    for i in range(3): save(f'fight/slash_{i}', slash(i), 0.8)
    for i in range(2): save(f'fight/clang_{i}', clang(i), 0.7)
    for i in range(3): save(f'fight/step_{i}', step(i), 0.4)
    save('fight/blow_big', blow_big(), 0.95)
    save('fight/whoosh', whoosh_soft(), 0.5)
    save('fight/ko', ko(), 0.9)
    save('fight/allout', allout(), 0.9)
    save('fight/magic', magic(), 0.6)
    save('fight/fire', fire(), 0.7)
    save('fight/ice', ice(), 0.6)
    save('fight/quake', quake(), 0.9)
    save('fight/thud', thud(), 0.85)
    save('fight/bolt', bolt(), 0.7)
    save('fight/charge', charge(), 0.7)
    save('amb/wind', wind(), 0.5, 0.012)
    save('amb/fire', crackle(), 0.5, 0.009)
    save('amb/night', night(), 0.4, 0.015)
    save('amb/murmur', murmur(), 0.45, 0.02)
    save('fight/horn', horn(), 0.9, 0.02)
