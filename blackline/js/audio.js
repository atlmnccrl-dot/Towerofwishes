// BLACKLINE — synthesised sound: rain and wind beds, thunder, gunfire, explosions, rotors.
// No audio files: everything is shaped noise and oscillators. Starts on the first tap.
(function () {
  const BL = window.BL;
  let ac = null, master = null, noiseBuf = null, rainGain = null, windGain = null, windFilter = null, rotorGain = null;
  let enabled = true;
  const last = {};

  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ac.destination);
    // two seconds of white noise, reused by everything
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // rain: filtered noise bed
    rainGain = ac.createGain(); rainGain.gain.value = 0.16;
    const rf = ac.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2400; rf.Q.value = 0.4;
    loopNoise().connect(rf); rf.connect(rainGain); rainGain.connect(master);
    // wind: low band that moves with gusts
    windGain = ac.createGain(); windGain.gain.value = 0.06;
    windFilter = ac.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 380; windFilter.Q.value = 1.4;
    loopNoise().connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    // rotor: noise chopped by a low oscillator
    rotorGain = ac.createGain(); rotorGain.gain.value = 0;
    const rflt = ac.createBiquadFilter(); rflt.type = 'lowpass'; rflt.frequency.value = 260;
    const chop = ac.createGain(); chop.gain.value = 0;
    const lfo = ac.createOscillator(); lfo.frequency.value = 17;
    const lfoAmp = ac.createGain(); lfoAmp.gain.value = 0.5;
    lfo.connect(lfoAmp); lfoAmp.connect(chop.gain);
    const bias = ac.createConstantSource ? ac.createConstantSource() : null;
    if (bias) { bias.offset.value = 0.5; bias.connect(chop.gain); bias.start(); }
    loopNoise().connect(rflt); rflt.connect(chop); chop.connect(rotorGain); rotorGain.connect(master);
    lfo.start();
  }

  function loopNoise() {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    s.loopStart = Math.random(); s.start(0, Math.random() * 2);
    return s;
  }

  function throttle(key, ms) {
    const now = performance.now();
    if (last[key] && now - last[key] < ms) return false;
    last[key] = now;
    return true;
  }

  function burst(opts) {
    if (!ac || !enabled) return;
    const t = ac.currentTime + (opts.delay || 0);
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    f.Q.value = opts.q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.vol), t + (opts.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 1.5, opts.dur + 0.1);
  }

  function thump(freq, dur, vol, delay) {
    if (!ac || !enabled) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const api = {
    start,
    setEnabled(on) { enabled = on; if (master) master.gain.value = on ? 0.8 : 0; },
    get enabled() { return enabled; },
    shot(e, near) {
      if (!ac || near <= 0.02) return;
      const k = e.wk;
      if (e.w === 'shell') { if (throttle('gun', 60)) { burst({ freq: 300, freqEnd: 80, dur: 0.6, vol: 0.5 * near, q: 0.7, type: 'lowpass' }); thump(70, 0.5, 0.5 * near); } return; }
      if (e.w === 'rocket') { if (throttle('rk', 50)) burst({ freq: 1200, freqEnd: 400, dur: 0.5, vol: 0.18 * near, q: 0.8 }); return; }
      const mg = k === 'machine gun' || k === 'coaxial MG' || k === 'chin gun';
      const cannon = k === 'autocannon';
      if (!throttle(mg ? 'mg' : cannon ? 'ac' : 'rf', mg ? 45 : 35)) return;
      const enemy = e.team === 1;
      burst({ freq: cannon ? 700 : mg ? 1500 : 1900, freqEnd: cannon ? 200 : 500, dur: cannon ? 0.22 : 0.12, vol: (cannon ? 0.24 : 0.12) * near * (enemy ? 0.8 : 1), q: 0.9 });
    },
    boom(r, near) {
      if (!ac || near <= 0.02 || !throttle('boom', 70)) return;
      const big = r >= 30;
      burst({ freq: big ? 500 : 900, freqEnd: 60, dur: big ? 1.6 : 0.8, vol: (big ? 0.7 : 0.4) * near, q: 0.6, type: 'lowpass' });
      thump(big ? 55 : 80, big ? 1.2 : 0.6, (big ? 0.7 : 0.4) * near);
    },
    ping(near) { if (ac && near > 0.05 && throttle('ping', 60)) burst({ freq: 3200, dur: 0.08, vol: 0.06 * near, q: 6 }); },
    whistle(near) {
      if (!ac || !enabled || !throttle('wh', 200)) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 1);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * Math.max(0.3, near), t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.1);
    },
    thunder(delay) {
      if (!ac) return;
      burst({ freq: 260, freqEnd: 40, dur: 3.2, vol: 0.45, q: 0.5, type: 'lowpass', delay, attack: 0.08 });
      burst({ freq: 900, freqEnd: 120, dur: 0.6, vol: 0.12, q: 0.5, type: 'lowpass', delay });
    },
    radio() { if (ac && throttle('radio', 400)) { burst({ freq: 1800, dur: 0.18, vol: 0.05, q: 3 }); thump(880, 0.08, 0.03, 0.02); } },
    click() { if (ac) thump(1100, 0.05, 0.05); },
    weather(wind, rotorNear) {
      if (!ac) return;
      const t = ac.currentTime;
      windGain.gain.setTargetAtTime(0.03 + wind * 0.1, t, 0.4);
      windFilter.frequency.setTargetAtTime(250 + wind * 500, t, 0.4);
      rotorGain.gain.setTargetAtTime(rotorNear * 0.35, t, 0.2);
    },
  };
  BL.audio = api;
})();
