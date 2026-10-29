"""Vael's music, composed here from synthesised instruments (so it is original and needs no licence):
a title theme, a camp and road theme, a boss theme, and the victory and defeat stings.

    python3 v2/tools/compose.py            ->  v2/assets/music/{title,camp,boss}.mp3, v2/assets/sfx/{victory,defeat}.mp3

The loops are written with their reverb tail folded back onto the start, so they repeat without a seam.
Needs numpy, scipy and ffmpeg.
"""
import os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
NOTE.update({'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10})
def m(name):   # 'D4' -> midi
    return NOTE[name[:-1]] + 12 * (int(name[-1]) + 1)

def env(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None):
    """attack, decay, sustain level, release, over n samples (the note sounds for hold samples, then releases)"""
    hold = n if hold is None else hold
    e = np.zeros(n)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    i = np.arange(n)
    e = np.where(i < A, i / max(1, A), np.where(i < A + D, 1 - (1 - s) * (i - A) / max(1, D), s))
    rel = np.clip((i - hold) / max(1, R), 0, 1)
    return e * (1 - rel)

def lowpass(x, cut, order=2):
    b, a = butter(order, min(0.99, cut / (SR / 2)), 'low'); return lfilter(b, a, x)
def highpass(x, cut, order=2):
    b, a = butter(order, min(0.99, cut / (SR / 2)), 'high'); return lfilter(b, a, x)
def bandpass(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), min(0.99, hi / (SR / 2))], 'band'); return lfilter(b, a, x)

def saw(f, t, harmonics=24, detune=0.0):
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if f * k > SR / 2 * 0.9: break
        out += np.sin(2 * np.pi * f * k * t * (1 + detune)) / k
    return out

# ---- instruments: each returns a mono note of length dur (+ its own ring)
def harp(f, dur, vel=1.0):
    n = int((dur + 1.6) * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 14):
        out += np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t * (1.6 + 0.9 * k)) / k ** 1.1
    return out * vel * np.minimum(1, t / 0.003)
def lute(f, dur, vel=1.0):
    n = int((dur + 1.0) * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 18):
        out += np.sin(2 * np.pi * f * k * (1 + 0.0007 * k) * t + k) * np.exp(-t * (3 + 2.2 * k)) / k ** 0.8
    out = lowpass(out, 3800)
    return out * vel * np.minimum(1, t / 0.002)
def strings(f, dur, vel=1.0, a=0.35, r=0.6, bright=2400):
    n = int((dur + r) * SR); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.6)
    out = sum(saw(f, t * vib, 20, d) for d in (-0.004, 0, 0.005)) / 3
    out = lowpass(out, bright)
    return out * env(n, a, 0.2, 0.85, r, int(dur * SR)) * vel
def pad(f, dur, vel=1.0):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR
    out = sum(saw(f, t, 10, d) for d in (-0.007, -0.002, 0.003, 0.008)) / 4
    out = lowpass(out, 1100)
    return out * env(n, 0.9, 0.5, 0.8, 1.2, int(dur * SR)) * vel
def choir(f, dur, vel=1.0):
    n = int((dur + 1.0) * SR); t = np.arange(n) / SR
    src = sum(saw(f, t * (1 + 0.003 * np.sin(2 * np.pi * 4.6 * t + p)), 30, d) for p, d in ((0, -0.004), (1.3, 0.004)))
    out = bandpass(src, 500, 900) * 1.2 + bandpass(src, 1100, 1300) * 0.6 + lowpass(src, 400) * 0.4   # an "ah"
    return out * env(n, 0.6, 0.3, 0.85, 1.0, int(dur * SR)) * vel
def horn(f, dur, vel=1.0):
    n = int((dur + 0.4) * SR); t = np.arange(n) / SR
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5 * t) * np.minimum(1, t / 0.4)
    src = saw(f, t * vib, 24)
    # the brass "bloom": the filter opens as the note speaks
    cut = 500 + 1600 * np.minimum(1, t / 0.12) * vel
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        out[i:i + seg] = lowpass(src[max(0, i - 64):i + seg], float(cut[i]))[-len(src[i:i + seg]):]
    return out * env(n, 0.05, 0.2, 0.8, 0.35, int(dur * SR)) * vel
def flute(f, dur, vel=1.0):
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3)
    out = np.sin(2 * np.pi * f * t * vib) + 0.18 * np.sin(4 * np.pi * f * t * vib) + 0.05 * np.sin(6 * np.pi * f * t * vib)
    breath = bandpass(rng.standard_normal(n), f * 0.8, f * 3) * 0.05
    return (out + breath) * env(n, 0.08, 0.1, 0.85, 0.25, int(dur * SR)) * vel
def bass(f, dur, vel=1.0):
    n = int((dur + 0.15) * SR); t = np.arange(n) / SR
    out = lowpass(saw(f, t, 12), 600) + 0.5 * np.sin(2 * np.pi * f * t)
    return out * env(n, 0.005, 0.1, 0.7, 0.12, int(dur * SR)) * vel
def timpani(f, vel=1.0):
    n = int(2.2 * SR); t = np.arange(n) / SR
    fr = f * (1 + 0.15 * np.exp(-t * 30))
    out = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR) * np.exp(-t * 6)
    out += lowpass(rng.standard_normal(n), 400) * np.exp(-t * 25) * 0.6
    return out * np.exp(-t * 2.2) * vel
def taiko(vel=1.0, f=62):
    n = int(1.0 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.2 * np.exp(-t * 40))
    out = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7)
    out += lowpass(rng.standard_normal(n), 900) * np.exp(-t * 35) * 0.8
    return out * vel
def snare(vel=1.0):
    n = int(0.4 * SR); t = np.arange(n) / SR
    return (bandpass(rng.standard_normal(n), 1200, 6000) * np.exp(-t * 18) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5) * vel
def frame_drum(vel=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 110 * t * (1 + 0.4 * np.exp(-t * 30))) * np.exp(-t * 9) + bandpass(rng.standard_normal(n), 300, 2000) * np.exp(-t * 40) * 0.4) * vel
def cymbal(dur, vel=1.0, swell=False):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR
    noise = highpass(rng.standard_normal(n), 5000)
    e = np.minimum(1, t / dur) ** 2 * (t < dur) if swell else np.exp(-t * 1.8)
    if swell: e = e + (t >= dur) * np.exp(-(t - dur) * 3)
    return noise * e * vel * 0.35

# ---- a track: layers placed in seconds, reverb, a seamless loop
class Track:
    def __init__(self, seconds, bpm):
        self.n = int(seconds * SR); self.bpm = bpm; self.beat = 60 / bpm
        self.dry = np.zeros((2, self.n + 8 * SR)); self.wet = np.zeros((2, self.n + 8 * SR))
    def add(self, sig, at, gain=1.0, pan=0.0, rev=0.3):
        i = int(at * SR); sig = sig[: self.dry.shape[1] - i]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        for c, g in ((0, l), (1, r)):
            self.dry[c, i:i + len(sig)] += sig * gain * g * (1 - rev * 0.5)
            self.wet[c, i:i + len(sig)] += sig * gain * g * rev
    def b(self, beats): return beats * self.beat   # beats -> seconds
    def render(self, loop=True, room=2.6):
        ir_n = int(room * SR); t = np.arange(ir_n) / SR
        out = self.dry.copy()
        for c in range(2):
            ir = lowpass(rng.standard_normal(ir_n), 5000) * np.exp(-t * 6.9 / room)
            ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
            out[c] += fftconvolve(self.wet[c], ir)[: out.shape[1]] * 0.12
        if loop:   # the tail that runs past the end comes in again at the start
            tail = out[:, self.n:]
            out = out[:, : self.n].copy(); k = min(tail.shape[1], self.n); out[:, :k] += tail[:, :k]
        else:
            last = np.max(np.nonzero(np.abs(out).max(axis=0) > 1e-4)) + 1; out = out[:, :last]
        out = np.tanh(out / (np.abs(out).max() + 1e-9) * 1.25) / np.tanh(1.25) * 0.89   # gentle limiting, peak about -1 dB
        return out

def save(track_audio, path, loop=True, lufs=-20):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: tmp = f.name
    wavfile.write(tmp, SR, (track_audio.T * 32767).astype(np.int16))
    # levelled to sit with the battle theme (about -20 LUFS; the stings a little louder) by one fixed gain,
    # measured first, so a loop keeps the same level at its seam
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    now = float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', f'volume={lufs - now:.2f}dB', '-codec:a', 'libmp3lame', '-b:a', '128k', path], check=True)
    os.remove(tmp)
    print('wrote', os.path.relpath(path, ROOT), f'{track_audio.shape[1] / SR:.1f} s')

CHORDS = {'Dm': ['D', 'F', 'A'], 'Bb': ['Bb', 'D', 'F'], 'F': ['F', 'A', 'C'], 'C': ['C', 'E', 'G'], 'Gm': ['G', 'Bb', 'D'], 'A': ['A', 'C#', 'E'],
          'Am': ['A', 'C', 'E'], 'G': ['G', 'B', 'D'], 'Em': ['E', 'G', 'B'], 'D': ['D', 'F#', 'A'], 'B': ['B', 'D#', 'F#'], 'E': ['E', 'G#', 'B']}
def tones(ch, octv): return [m(n + str(octv)) if NOTE[n] >= NOTE[CHORDS[ch][0]] else m(n + str(octv + 1)) for n in CHORDS[ch]]

def melody(tr, inst, notes, start_beat, gain, pan=0.0, rev=0.35):
    """notes: [(name or None, beats)]"""
    b = start_beat
    for name, beats in notes:
        if name: tr.add(inst(hz(m(name)), tr.b(beats) * 0.95), tr.b(b), gain, pan, rev)
        b += beats

# ---- the title: D minor, slow and wide; a harp turning under a horn theme
def title():
    prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'Bb', 'A'] * 2
    tr = Track(len(prog) * 4 * 60 / 72, 72)
    for i, ch in enumerate(prog):
        at = i * 4
        for f in tones(ch, 3): tr.add(pad(hz(f), tr.b(4)), tr.b(at), 0.16, rev=0.5)
        tr.add(strings(hz(tones(ch, 2)[0]), tr.b(4), a=0.6, bright=900), tr.b(at), 0.32, rev=0.4)
        arp = tones(ch, 4) + [tones(ch, 5)[0]] + tones(ch, 4)[::-1][1:] + [tones(ch, 4)[0]]
        for k, f in enumerate(arp[:8]): tr.add(harp(hz(f), tr.b(0.5)), tr.b(at + k * 0.5), 0.17, pan=0.3 * np.sin(k), rev=0.45)
        if i % 4 == 0: tr.add(timpani(hz(m('D2'))), tr.b(at), 0.5, rev=0.4)
        if i % 4 == 3: tr.add(cymbal(tr.b(2), 0.6, swell=True), tr.b(at + 2), 0.1, rev=0.5)
    theme = [('D5', 2), ('F5', 1), ('E5', 1), ('D5', 2), ('A4', 2), ('Bb4', 1), ('C5', 1), ('D5', 1), ('F5', 1), ('E5', 4),
             ('F5', 2), ('G5', 1), ('A5', 1), ('Bb5', 2), ('A5', 1), ('G5', 1), ('F5', 1.5), ('E5', 0.5), ('D5', 1), ('F5', 1), ('E5', 4)]
    melody(tr, horn, theme, 16, 0.3, -0.15, 0.4)
    melody(tr, strings, [(n[:-1] + str(int(n[-1]) - 1), d) for n, d in theme], 16, 0.12, 0.2, 0.5)
    for i in range(8, 16):
        for f in tones(prog[i], 4): tr.add(choir(hz(f), tr.b(4)), tr.b(i * 4), 0.08, rev=0.6)
    return tr.render()

# ---- camp and road: A minor folk; a lute, a flute, a frame drum by the fire
def camp():
    prog = ['Am', 'F', 'C', 'G'] * 4
    tr = Track(len(prog) * 4 * 60 / 84, 84)
    for i, ch in enumerate(prog):
        at = i * 4; t3 = tones(ch, 3)
        pattern = [t3[0] - 12, t3[2] - 12, t3[0], t3[1], t3[2], t3[1], t3[0], t3[2] - 12]
        for k, f in enumerate(pattern): tr.add(lute(hz(f), tr.b(0.5), 0.9 if k % 2 == 0 else 0.7), tr.b(at + k * 0.5), 0.26, pan=-0.25, rev=0.25)
        for f in t3: tr.add(pad(hz(f), tr.b(4)), tr.b(at), 0.07, rev=0.5)
        if i >= 4:
            tr.add(frame_drum(0.8), tr.b(at), 0.22, 0.2, 0.2); tr.add(frame_drum(0.5), tr.b(at + 2.5), 0.16, 0.2, 0.2)
    tune = [('E5', 1), ('A5', 1), ('G5', 1), ('E5', 1), ('F5', 2), ('C5', 2), ('E5', 1), ('G5', 1), ('C6', 1.5), ('B5', 0.5), ('G5', 4),
            ('A5', 1), ('C6', 1), ('B5', 1), ('A5', 1), ('F5', 1.5), ('G5', 0.5), ('A5', 2), ('G5', 1), ('E5', 1), ('D5', 1), ('C5', 1), ('D5', 2), ('B4', 2),
            ('C5', 1), ('E5', 1), ('A5', 2), ('F5', 1), ('A5', 1), ('C6', 2), ('B5', 1), ('A5', 1), ('G5', 1), ('E5', 1), ('D5', 2), ('E5', 2),
            ('A4', 4), (None, 4)]
    melody(tr, flute, tune, 16, 0.2, 0.2, 0.35)
    return tr.render(room=2.0)

# ---- the boss: E minor at a run; taiko, a driving bass, brass stabs, a choir over the top
def boss():
    prog = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'] * 2
    tr = Track(len(prog) * 4 * 60 / 140, 140)
    for i, ch in enumerate(prog):
        at = i * 4; root = tones(ch, 2)[0]
        for k in range(8): tr.add(bass(hz(root if k % 4 != 3 else root + 7), tr.b(0.45)), tr.b(at + k * 0.5), 0.35, rev=0.1)
        for k in range(16): tr.add(strings(hz(tones(ch, 4)[k % 3]), tr.b(0.22), 0.8 if k % 4 == 0 else 0.55, a=0.01, r=0.08, bright=3000), tr.b(at + k * 0.25), 0.13, pan=0.35, rev=0.2)
        for k, v in ((0, 1), (1.5, 0.7), (2, 0.9), (3, 0.6), (3.5, 0.8)): tr.add(taiko(v), tr.b(at + k), 0.45, -0.1, 0.25)
        tr.add(snare(0.7), tr.b(at + 1), 0.18, 0.15, 0.3); tr.add(snare(0.7), tr.b(at + 3), 0.18, 0.15, 0.3)
        if i % 2 == 0:
            for f in tones(ch, 3): tr.add(horn(hz(f), tr.b(0.9), 1.0), tr.b(at), 0.13, -0.3, 0.3)
        if i >= 8:
            for f in tones(ch, 4): tr.add(choir(hz(f), tr.b(4)), tr.b(at), 0.07, rev=0.6)
        if i % 8 == 7: tr.add(cymbal(tr.b(2), 0.7, swell=True), tr.b(at + 2), 0.12, rev=0.4)
    riff = [('E5', 1.5), ('G5', 0.5), ('F#5', 1), ('E5', 1), ('B5', 2), ('A5', 1), ('G5', 1), ('E5', 1.5), ('G5', 0.5), ('A5', 1), ('B5', 1), ('C6', 2), ('B5', 1), ('D6', 1),
            ('E6', 2), ('D6', 1), ('B5', 1), ('C6', 2), ('B5', 1), ('A5', 1), ('G5', 1.5), ('A5', 0.5), ('B5', 1), ('G5', 1), ('F#5', 2), ('D#5', 2)]
    melody(tr, horn, riff, 32, 0.24, 0.1, 0.35)
    return tr.render(room=1.8)

# ---- stings
def victory():
    tr = Track(5.5, 100)
    for k, n in enumerate(['D4', 'F#4', 'A4']): tr.add(horn(hz(m(n)), 0.22), 0.18 * k, 0.32, -0.1, 0.3)
    for n in ['D4', 'F#4', 'A4', 'D5']: tr.add(horn(hz(m(n)), 2.4), 0.6, 0.22, 0.1, 0.4)
    for n in ['D3', 'A3', 'F#4', 'D5']: tr.add(strings(hz(m(n)), 2.6, a=0.08), 0.6, 0.18, rev=0.4)
    for k in range(6): tr.add(timpani(hz(m('D2')), 0.5 + k * 0.08), 0.05 * k, 0.25, rev=0.3)
    tr.add(timpani(hz(m('D2')), 1.0), 0.6, 0.5, rev=0.4); tr.add(cymbal(0.1, 1.0), 0.6, 0.2, rev=0.4)
    for k, n in enumerate(['A5', 'D6', 'F#6', 'A6']): tr.add(harp(hz(m(n)), 0.3), 0.65 + 0.08 * k, 0.12, 0.4, 0.5)
    return tr.render(loop=False)
def defeat():
    tr = Track(5.0, 70)
    for k, n in enumerate(['A3', 'G3', 'F3', 'D3']): tr.add(strings(hz(m(n)), 1.1 if k < 3 else 2.6, a=0.15, bright=1400), 0.85 * k, 0.3, rev=0.5)
    tr.add(pad(hz(m('D2')), 3.6), 0, 0.25, rev=0.6); tr.add(timpani(hz(m('D2')), 0.8), 2.55, 0.4, rev=0.5)
    tr.add(choir(hz(m('F4')), 2.4), 2.55, 0.1, rev=0.7); tr.add(choir(hz(m('A4')), 2.4), 2.55, 0.08, rev=0.7)
    return tr.render(loop=False)

if __name__ == '__main__':
    save(title(), os.path.join(ROOT, 'assets/music/title.mp3'))
    save(camp(), os.path.join(ROOT, 'assets/music/camp.mp3'))
    save(boss(), os.path.join(ROOT, 'assets/music/boss.mp3'))
    save(victory(), os.path.join(ROOT, 'assets/sfx/victory.mp3'), loop=False, lufs=-17)
    save(defeat(), os.path.join(ROOT, 'assets/sfx/defeat.mp3'), loop=False, lufs=-18)
