// All sound is synthesised in WebAudio: rain and thunder, steel, bells, and a slow organ-and-choir
// score with drums that come in when a fight starts. No audio files.

export class Sound {
  constructor() { this.ctx = null; this.on = true; this.musicVol = 0.55; this.mode = 'none'; this.nextBeat = 0; this.beat = 0; this.chordT = 0; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(c.destination);
    // a gentle room for everything
    this.verb = c.createConvolver(); this.verb.buffer = this._impulse(2.4); const vg = c.createGain(); vg.gain.value = 0.32; this.verb.connect(vg); vg.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.sfxVerb = c.createGain(); this.sfxVerb.gain.value = 0.3; this.sfx.connect(this.sfxVerb); this.sfxVerb.connect(this.verb);
    this.mus = c.createGain(); this.mus.gain.value = this.musicVol; this.mus.connect(this.master); const mv = c.createGain(); mv.gain.value = 0.6; this.mus.connect(mv); mv.connect(this.verb);
    this.amb = c.createGain(); this.amb.gain.value = 0.5; this.amb.connect(this.master);
    this.noise = this._noise(2);
    this._rain();
    this.nextBeat = c.currentTime + 0.1;
  }

  setEnabled(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); }
  setMusicVol(v) { this.musicVol = v; if (this.mus) this.mus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); }

  _noise(sec) { const c = this.ctx; const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  _impulse(sec) { const c = this.ctx; const n = c.sampleRate * sec; const b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); } return b; }

  _rain() {
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    this.rainGain = c.createGain(); this.rainGain.gain.value = 0.11;
    src.connect(hp); hp.connect(lp); lp.connect(this.rainGain); this.rainGain.connect(this.amb);
    const src2 = c.createBufferSource(); src2.buffer = this.noise; src2.loop = true; src2.playbackRate.value = 0.5;
    const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 260; const g2 = c.createGain(); g2.gain.value = 0.12;
    src2.connect(lp2); lp2.connect(g2); g2.connect(this.rainGain);
    src.start(); src2.start();
  }
  setRain(k) { if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.11 * k, this.ctx.currentTime, 0.8); }

  // ---------------------------------------------------------------- building blocks
  _env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  _osc(type, f0, f1, t, dur, peak, dest, a = 0.005) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain(); this._env(g, t, a, peak, dur); o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + a + dur + 0.05); return o;
  }
  _nz(t, dur, peak, type, f0, f1, q = 1, dest, a = 0.005, rate = 1) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q;
    const g = c.createGain(); this._env(g, t, a, peak, dur); s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
  }
  bell(t, f, dur = 4, peak = 0.25, dest) {
    const parts = [[0.5, 1], [1, 0.8], [1.19, 0.55], [1.5, 0.4], [2, 0.35], [2.51, 0.25], [2.66, 0.2], [3.01, 0.15], [4.17, 0.1], [5.43, 0.07]];
    for (const [r, a] of parts) this._osc('sine', f * r, f * r, t, dur * (1.2 - r * 0.15), peak * a, dest || this.sfx, 0.002);
  }

  // ---------------------------------------------------------------- sound effects
  play(name, o = {}) {
    if (!this.ctx || !this.on) return; const t = this.ctx.currentTime + (o.delay || 0); const v = o.vol ?? 1;
    switch (name) {
      case 'swing': this._nz(t, 0.14, 0.35 * v, 'bandpass', 2600 + Math.random() * 500, 600, 1.4); break;
      case 'swingHeavy': this._nz(t, 0.26, 0.45 * v, 'bandpass', 1400, 280, 1.2); this._osc('sine', 180, 60, t, 0.25, 0.12 * v); break;
      case 'hit': this._nz(t, 0.09, 0.5 * v, 'lowpass', 2400, 500, 0.8); this._osc('sine', 150, 50, t, 0.14, 0.45 * v); this._nz(t, 0.05, 0.25 * v, 'highpass', 4000, 3000, 1); break;
      case 'hitHeavy': this._nz(t, 0.18, 0.6 * v, 'lowpass', 1800, 200, 0.8); this._osc('sine', 110, 35, t, 0.3, 0.6 * v); this._osc('square', 80, 40, t, 0.12, 0.08 * v); break;
      case 'clang': { const b = 900 + Math.random() * 200; for (const [r, a] of [[1, 0.25], [1.51, 0.2], [2.13, 0.15], [2.76, 0.12], [3.6, 0.08]]) this._osc('sine', b * r, b * r * 0.995, t, 0.45, a * v, this.sfx, 0.001); this._nz(t, 0.05, 0.4 * v, 'highpass', 5000, 3000, 1); break; }
      case 'parry': this.play('clang', { vol: 1.3 }); this._osc('triangle', 1800, 2400, t, 0.3, 0.08); this._nz(t, 0.4, 0.15, 'bandpass', 6000, 9000, 4, null, 0.01); break;
      case 'block': this.play('clang', { vol: 0.7 }); this._osc('sine', 200, 120, t, 0.1, 0.2); break;
      case 'dash': this._nz(t, 0.2, 0.22 * v, 'bandpass', 500, 2800, 1.5, null, 0.02); break;
      case 'step': this._nz(t, 0.035, 0.05 * v, 'highpass', 2500 + Math.random() * 1500, 2000, 1); break;
      case 'tele': this._osc('sawtooth', 300, 240, t, 0.1, 0.035 * v); this._nz(t, 0.18, 0.08 * v, 'bandpass', 3500, 5500, 6); break;
      case 'foeDie': this._osc('sawtooth', 160, 60, t, 0.5, 0.08 * v); this._nz(t, 0.4, 0.15 * v, 'lowpass', 900, 200, 0.7); break;
      case 'heroHurt': this._osc('sine', 120, 45, t, 0.22, 0.5); this._nz(t, 0.18, 0.3, 'lowpass', 1200, 300, 0.8); this._osc('sawtooth', 90, 70, t, 0.15, 0.06); break;
      case 'heal': for (const [f, d] of [[1320, 0], [1760, 0.06], [2640, 0.12]]) this._osc('sine', f, f, t + d, 0.8, 0.07, this.sfx, 0.01); this._nz(t, 0.5, 0.08, 'bandpass', 800, 3000, 2, null, 0.1); break;
      case 'lamp': this._nz(t, 0.5, 0.3, 'lowpass', 200, 2400, 1, null, 0.05); this.bell(t + 0.1, 660, 2.2, 0.08); break;
      case 'gate': { const c = this.ctx; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); const lfo = c.createOscillator(); lfo.frequency.value = 9; const lg = c.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3; const g = c.createGain(); this._env(g, t, 0.08, 0.06, 0.8); o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1); this._nz(t + 0.85, 0.2, 0.35, 'lowpass', 1500, 200, 0.8); this._osc('sine', 140, 60, t + 0.85, 0.25, 0.3); break; }
      case 'bigBell': this.bell(t, 196, 7, 0.32); this.bell(t, 98, 8, 0.2); break;
      case 'toll': this.bell(t, o.f || 147, 5, 0.18 * v); break;
      case 'special': this._nz(t, 0.6, 0.3, 'bandpass', 300, 4000, 1.2, null, 0.3); this._choir(t, [146.8, 220, 293.7, 349.2], 1.8, 0.05); this.bell(t + 0.3, 392, 3, 0.12); break;
      case 'slashA': this._nz(t, 0.08, 0.3 * v, 'bandpass', 3800, 1200, 2); break;
      case 'thunder': this._nz(t, 2.8 * (o.big ? 1.3 : 1), 0.5 * v, 'lowpass', 500, 60, 0.7, this.amb, 0.04, 0.6); this._nz(t + 0.1, 1.6, 0.25 * v, 'lowpass', 220, 50, 1, this.amb, 0.3, 0.4); break;
      case 'orb': this._osc('sine', 520, 260, t, 0.3, 0.12 * v); this._nz(t, 0.25, 0.1 * v, 'bandpass', 900, 400, 2); break;
      case 'bolt': this._nz(t, 0.08, 0.4 * v, 'bandpass', 1800, 900, 2); this._osc('square', 300, 80, t, 0.05, 0.06 * v); break;
      case 'boom': this._osc('sine', 70, 28, t, 0.7, 0.7 * v); this._nz(t, 0.6, 0.45 * v, 'lowpass', 700, 60, 0.8); break;
      case 'perfect': this._nz(t, 0.35, 0.2, 'bandpass', 4000, 600, 2, null, 0.25); this._osc('sine', 2400, 3200, t, 0.6, 0.05); break;
      case 'kill': this._nz(t, 0.12, 0.35 * v, 'bandpass', 5000, 1500, 2); this._osc('sine', 90, 40, t + 0.03, 0.3, 0.35 * v); break;
      case 'ember': this._osc('sine', 1800 + Math.random() * 600, 2600, t, 0.08, 0.03 * v); break;
      case 'ui': this._osc('square', 660, 660, t, 0.03, 0.04); break;
      case 'uiOk': this._osc('square', 660, 990, t, 0.08, 0.05); this.bell(t, 880, 0.8, 0.04); break;
      case 'rise': this._nz(t, 0.8, 0.12 * v, 'lowpass', 120, 600, 1, null, 0.3); this._osc('sawtooth', 55, 80, t, 0.8, 0.04 * v, this.sfx, 0.3); break;
      case 'roar': this._osc('sawtooth', 90, 55, t, 1.2, 0.16, this.sfx, 0.1); this._osc('sawtooth', 93, 52, t, 1.2, 0.12, this.sfx, 0.1); this._nz(t, 1.2, 0.3, 'bandpass', 500, 250, 1.5, null, 0.1); break;
      case 'fire': this._nz(t, 0.6, 0.18 * v, 'bandpass', 600, 1400, 0.8, null, 0.05); break;
      case 'splash': this._nz(t, 0.4, 0.25 * v, 'bandpass', 1200, 400, 1, null, 0.01); break;
      case 'vanish': this._nz(t, 0.6, 0.2, 'highpass', 6000, 1000, 1, null, 0.2); break;
      case 'death': this.bell(t, 110, 5, 0.15); this._choir(t, [110, 130.8, 164.8], 3, 0.04); break;
    }
  }

  _choir(t, notes, dur, peak, dest) {
    const c = this.ctx;
    for (const f of notes) for (const det of [-6, 0, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.6;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(lp); lp.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.1);
    }
  }

  // ---------------------------------------------------------------- music
  // modes: title, explore, combat, boss, dawn, none
  setMusic(mode) { if (mode === this.mode) return; this.mode = mode; this.beat = 0; if (this.ctx) this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.05); }

  update() {
    if (!this.ctx || this.mode === 'none') return;
    const c = this.ctx; const ahead = c.currentTime + 0.25;
    const bpm = this.mode === 'boss' ? 124 : (this.mode === 'combat' ? 104 : 60); const spb = 60 / bpm / 2; // eighth notes
    const minor = [[146.8, 174.6, 220], [116.5, 146.8, 174.6], [98, 116.5, 146.8], [110, 138.6, 164.8]]; // Dm Bb Gm A
    const major = [[146.8, 185, 220], [98, 123.5, 146.8], [123.5, 146.8, 185], [110, 138.6, 164.8]]; // D G Bm A
    while (this.nextBeat < ahead) {
      const t = this.nextBeat; const b = this.beat;
      const prog = this.mode === 'dawn' ? major : minor;
      const barLen = this.mode === 'boss' || this.mode === 'combat' ? 16 : 8; // eighths per chord
      const chord = prog[Math.floor(b / barLen) % 4];
      if (b % barLen === 0) {
        // the organ pad
        const dur = barLen * spb;
        for (const f of chord) this._pad(t, f / 2, dur, this.mode === 'title' ? 0.03 : 0.025);
        this._pad(t, chord[0] / 4, dur, 0.03);
        if (this.mode === 'boss') this._choir(t, chord.map((f) => f * 2), dur, 0.012, this.mus);
        if (this.mode === 'dawn') this._choir(t, chord.map((f) => f * 2), dur, 0.015, this.mus);
      }
      if ((this.mode === 'explore' || this.mode === 'title') && b % 32 === 0) this.bell(t, 73.4 * 2, 6, 0.06, this.mus);
      if (this.mode === 'dawn' && b % 4 === 0) this.bell(t, chord[(b / 4) % 3] * 4, 3, 0.03, this.mus);
      if (this.mode === 'combat' || this.mode === 'boss') {
        const heavy = this.mode === 'boss';
        const pat = heavy ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0] : [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
        if (pat[b % 16]) this._drum(t, heavy ? 1 : 0.8);
        if (b % 8 === 4) this._snare(t, heavy ? 0.6 : 0.4);
        // ostinato
        const arp = [0, 1, 2, 1, 0, 2, 1, 2]; const f = chord[arp[b % 8]] * (heavy ? 2 : 1);
        this._pluck(t, f, spb * 1.6, heavy ? 0.05 : 0.04);
        if (heavy && b % 2 === 0) this._pluck(t, chord[0] / 2, spb * 1.8, 0.06, 'sawtooth');
      }
      this.beat++; this.nextBeat += spb;
    }
  }
  _pad(t, f, dur, peak) {
    const c = this.ctx;
    for (const det of [-8, 0, 9]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.5;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(1.5, dur * 0.3)); g.gain.setValueAtTime(peak, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      o.connect(lp); lp.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + 0.7);
    }
  }
  _pluck(t, f, dur, peak, type = 'triangle') { const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = f; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(300, t + dur); const g = c.createGain(); this._env(g, t, 0.004, peak, dur); o.connect(lp); lp.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + 0.05); }
  _drum(t, v) { this._osc('sine', 120, 42, t, 0.35, 0.5 * v, this.mus, 0.002); this._nz(t, 0.08, 0.12 * v, 'lowpass', 800, 200, 0.8, this.mus); }
  _snare(t, v) { this._nz(t, 0.18, 0.18 * v, 'bandpass', 1800, 900, 0.9, this.mus); this._osc('triangle', 220, 160, t, 0.08, 0.08 * v, this.mus); }
}
