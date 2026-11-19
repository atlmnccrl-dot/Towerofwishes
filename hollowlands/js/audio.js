'use strict';
// HOLLOWLANDS — all sound is synthesised live (WebAudio). No recorded or third-party audio.
HL.Audio = (() => {
  let ctx = null, master = null, sfxBus = null, ambBus = null, noise = null, amb = null, muted = false, want = null;
  const ensure = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.5; ambBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  };
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  function tone(f, dur, type = 'sine', vol = 0.2, slide = 0, when = 0, bus = sfxBus) {
    if (!ensure()) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, freq, q = 1, vol = 0.2, type = 'bandpass', sweep = 0, when = 0, bus = sfxBus) {
    if (!ensure()) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // inharmonic bell partials — the sound the whole world is about
  function bell(f, vol = 0.25, dur = 3, when = 0) {
    [[1, 1], [2.01, 0.55], [2.74, 0.4], [3.76, 0.25], [5.4, 0.15], [0.5, 0.3]].forEach(([m, a], i) => tone(f * m, dur * (1 - i * 0.12), 'sine', vol * a, 0, when));
    hiss(0.05, f * 4, 2, vol * 0.4, 'bandpass', 0, when);
  }
  const S = {
    step: (surf) => {
      if (surf === 'stone') hiss(0.05, 1800, 2, 0.05); else if (surf === 'wood') { tone(140, 0.06, 'triangle', 0.06); hiss(0.03, 900, 1, 0.03); } else if (surf === 'water') hiss(0.12, 700, 0.7, 0.07, 'lowpass');
      else hiss(0.07, 500, 0.8, 0.06, 'lowpass');
    },
    swing: (heavy) => hiss(heavy ? 0.22 : 0.12, heavy ? 600 : 1100, 1.5, heavy ? 0.22 : 0.14, 'bandpass', heavy ? 3 : 2.5),
    hit: () => { tone(110, 0.12, 'triangle', 0.3, 0.5); hiss(0.08, 1500, 1, 0.22, 'lowpass'); },
    hitHeavy: () => { tone(70, 0.25, 'triangle', 0.4, 0.4); hiss(0.18, 900, 1, 0.3, 'lowpass'); },
    clank: () => { [1230, 1870, 2690].forEach((f, i) => tone(f, 0.25 - i * 0.05, 'square', 0.05)); hiss(0.05, 4000, 2, 0.1); },
    hurt: () => { tone(160, 0.2, 'sawtooth', 0.12, 0.5); hiss(0.15, 400, 1, 0.2, 'lowpass'); },
    die: () => { tone(90, 0.5, 'sawtooth', 0.12, 0.3); hiss(0.4, 300, 0.5, 0.15, 'lowpass', 0.3); },
    roll: () => hiss(0.2, 400, 0.6, 0.12, 'lowpass', 0.5),
    pickup: () => { tone(660, 0.1, 'triangle', 0.08); tone(990, 0.16, 'triangle', 0.07, 0, 0.07); },
    item: () => { bell(880, 0.08, 1.2); },
    open: () => { tone(90, 0.15, 'square', 0.05, 1.5); hiss(0.25, 600, 3, 0.1, 'bandpass', 1.8); },
    unlock: () => { tone(1500, 0.04, 'square', 0.06); tone(900, 0.06, 'square', 0.05, 0, 0.06); hiss(0.4, 300, 4, 0.12, 'bandpass', 2, 0.1); },
    locked: () => { tone(220, 0.05, 'square', 0.05); tone(200, 0.05, 'square', 0.05, 0, 0.08); },
    tick: () => tone(1200, 0.025, 'square', 0.03),
    page: () => hiss(0.15, 3000, 1, 0.06, 'highpass'),
    twang: () => { tone(300, 0.12, 'triangle', 0.08, 0.6); hiss(0.05, 2500, 3, 0.05); },
    ratchet: () => { for (let i = 0; i < 6; i++) tone(700 + i * 30, 0.03, 'square', 0.04, 0, i * 0.09); },
    growl: () => { tone(70, 0.4, 'sawtooth', 0.08, 0.8); hiss(0.3, 250, 2, 0.06); },
    bark: () => { tone(260, 0.1, 'sawtooth', 0.08, 0.6); },
    burst: () => { hiss(0.3, 200, 0.7, 0.25, 'lowpass', 0.5); tone(60, 0.3, 'sine', 0.3, 0.5); },
    fire: () => { hiss(0.6, 500, 0.5, 0.25, 'lowpass', 0.4); tone(80, 0.4, 'sawtooth', 0.1, 0.5); },
    rumble: () => { hiss(1.2, 120, 0.5, 0.3, 'lowpass'); tone(45, 1.2, 'sine', 0.25, 0.8); },
    bellLow: () => bell(146, 0.25, 3.5), bellMid: () => bell(220, 0.22, 3), bellHigh: () => bell(330, 0.2, 2.6),
    bad: () => { tone(155, 0.5, 'sawtooth', 0.08); tone(164, 0.5, 'sawtooth', 0.08); },
    toll: () => bell(98, 0.35, 4),
    ult: () => { bell(110, 0.3, 2.5); hiss(0.5, 300, 0.8, 0.25, 'lowpass', 4); },
    rest: () => { bell(196, 0.12, 4); bell(294, 0.08, 4, 0.6); },
    ui: () => tone(500, 0.03, 'triangle', 0.05),
    eat: () => { hiss(0.08, 1200, 2, 0.06); hiss(0.08, 1000, 2, 0.06, 'bandpass', 0, 0.14); },
  };
  function ambient(kind) {
    if (!ensure() || (amb && amb.kind === kind)) return;
    if (amb) { const old = amb; old.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6); setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* stopped */ } }), 2500); }
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(ambBus); g.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    const nodes = [];
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'crypt' ? 180 : 420; f.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = kind === 'crypt' ? 60 : 220; lfo.connect(lg); lg.connect(f.frequency);
    const ng = ctx.createGain(); ng.gain.value = kind === 'crypt' ? 0.16 : 0.12;
    s.connect(f); f.connect(ng); ng.connect(g); s.start(); lfo.start(); nodes.push(s, lfo);
    const drone = ctx.createOscillator(), dg = ctx.createGain(); drone.type = 'sine'; drone.frequency.value = kind === 'crypt' ? 55 : kind === 'boss' ? 49 : 73.4; dg.gain.value = kind === 'boss' ? 0.07 : 0.035;
    drone.connect(dg); dg.connect(g); drone.start(); nodes.push(drone);
    amb = { kind, g, nodes };
  }
  return {
    unlock: () => { const had = !!ctx; ensure(); if (!had && ctx && want) try { ambient(want); } catch (e) { /* optional */ } },
    play: (n, a) => { if (!muted && ctx && S[n]) try { S[n](a); } catch (e) { /* audio is optional */ } },
    ambient: (k) => { want = k; if (ctx) try { ambient(k); } catch (e) { /* optional */ } },
    setMuted: (m) => { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    get muted() { return muted; },
  };
})();
