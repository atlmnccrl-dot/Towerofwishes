// Bannerborn — synthesised sound effects, a procedural war-drum score, and recorded monster voices (assets/sfx).
(function () {
  const BB = window.BB;
  let ac = null, master, sfxBus, musBus, noiseBuf;
  const last = {};
  function init() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ac.createGain(); master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    musBus = ac.createGain(); musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    BB.setVolumes();
    return ac;
  }
  BB.audioUnlock = function () { init(); if (ac && ac.state === 'suspended') ac.resume(); if (ac && !preloaded) { preloaded = true; for (const n of VOICES) loadV(n); } };
  // ---- recorded monster voices (assets/sfx, from Ririsaurus' Fantasy Monsters, Dinosaurs and Abyssal Horror packs)
  const VOICES = ['warg_growl', 'warg_snarl', 'warg_big', 'hiss', 'hob_growl', 'hob_babble', 'hob_chant', 'giant_attack', 'giant_grunt', 'giant_grunt2', 'giant_pain', 'giant_pain2', 'giant_laugh', 'giant_dizzy',
    'jelly', 'river', 'boggart', 'deep_growl', 'deep_growl2', 'deep_growl3', 'deep_grunt', 'deep_grunt2', 'deep_froth', 'deep_groan', 'deep_roar', 'rumble', 'descent', 'dino_bellow', 'dino_bellow2', 'dino_growl', 'dino_horde', 'dino_grunt', 'dino_soft'];
  const vbuf = {}, vload = {}; let preloaded = false, active = 0;
  function loadV(n) { if (vbuf[n] || vload[n] || !ac) return; vload[n] = fetch('assets/sfx/' + n + '.mp3').then((r) => r.arrayBuffer()).then((a) => new Promise((res, rej) => ac.decodeAudioData(a, res, rej))).then((b) => { vbuf[n] = b; }).catch(() => {}); }
  BB.voice = function (name, vol, rate) {
    if (!ac || ac.state !== 'running' || !name) return;
    const now = ac.currentTime; if (last['v' + name] && now - last['v' + name] < 0.3) return;
    const b = vbuf[name]; if (!b) { loadV(name); return; }
    if (active >= 5) return; last['v' + name] = now; active++;
    const src = ac.createBufferSource(); src.buffer = b; src.playbackRate.value = rate || (0.9 + Math.random() * 0.2);
    const g = ac.createGain(); g.gain.value = vol === undefined ? 0.85 : vol; src.connect(g); g.connect(sfxBus); src.onended = () => { active--; }; src.start();
  };
  // who sounds like what
  const FV = {
    ghoul: { atk: ['hob_growl', 'boggart'], die: ['jelly'] }, beastkin: { atk: ['warg_growl', 'warg_snarl'], die: ['warg_big'], pounce: ['warg_big'] },
    stalker: { atk: ['hiss'], die: ['hiss'], pounce: ['hiss'] }, warden: { atk: ['giant_attack', 'giant_grunt'], hurt: ['giant_pain2'], die: ['giant_pain'] },
    necro: { cast: ['hob_chant'], atk: ['hob_babble'], die: ['deep_grunt2'] }, warlock: { cast: ['hob_chant'], atk: ['hob_babble'], die: ['deep_grunt'] },
    wraith: { atk: ['deep_growl3', 'deep_growl2'], die: ['deep_growl'] }, kestrelfoe: { atk: ['hiss'], die: ['hiss'] },
    ossric: { atk: ['giant_attack', 'giant_grunt', 'giant_grunt2'], hurt: ['giant_pain2'], enrage: ['dino_bellow'], brk: ['giant_dizzy'], die: ['giant_pain'], taunt: ['giant_laugh'] },
    sallow: { atk: ['deep_froth', 'deep_grunt'], cast: ['hob_chant'], enrage: ['dino_bellow2'], brk: ['deep_groan'], die: ['deep_groan'], taunt: ['deep_froth'] },
    regent: { atk: ['deep_growl', 'deep_growl2'], enrage: ['deep_roar'], brk: ['deep_grunt'], die: ['deep_groan'], taunt: ['deep_roar'] },
    vesh: { atk: ['deep_growl2', 'deep_growl3'], cast: ['deep_froth'], enrage: ['deep_roar'], brk: ['deep_groan'], die: ['descent'], taunt: ['deep_roar'] },
  };
  BB.foeVoice = function (e, what, chance) {
    if (!e || !ac) return; const set = FV[e.kind]; if (!set || !set[what]) return;
    if (chance !== undefined && Math.random() > chance) return;
    const now = ac.currentTime; if (!e.boss && last.foeAny && now - last.foeAny < 0.35) return; last.foeAny = now;
    const list = set[what]; BB.voice(list[Math.floor(Math.random() * list.length)], e.boss ? 0.95 : 0.6, e.boss ? 0.85 + Math.random() * 0.1 : undefined);
  };
  BB.setVolumes = function () {
    if (!ac) return;
    const s = (BB.save && BB.save.settings) || { sfx: 0.8, music: 0.5 };
    sfxBus.gain.value = s.sfx * 0.55; musBus.gain.value = s.music * 0.32;
  };
  function noise(t, dur, f0, f1, q, vol, type) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const flt = ac.createBiquadFilter(); flt.type = type || 'bandpass'; flt.Q.value = q || 1;
    flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(sfxBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function tone(t, dur, f0, f1, type, vol, bus) {
    const o = ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    swing: (t) => noise(t, 0.16, 2400, 700, 1.2, 0.35),
    slash: (t) => { noise(t, 0.1, 3500, 1200, 2, 0.3); tone(t, 0.08, 220, 120, 'square', 0.06); },
    hit: (t) => { noise(t, 0.09, 900, 200, 1, 0.5); tone(t, 0.1, 140, 60, 'sine', 0.3); },
    crit: (t) => { noise(t, 0.14, 1600, 200, 0.8, 0.6); tone(t, 0.2, 180, 50, 'triangle', 0.4); tone(t + 0.02, 0.12, 900, 1400, 'square', 0.05); },
    hurt: (t) => { noise(t, 0.12, 600, 150, 1, 0.45); tone(t, 0.15, 110, 70, 'sawtooth', 0.08); },
    kill: (t) => { noise(t, 0.3, 1200, 300, 0.6, 0.35); tone(t, 0.25, 300, 90, 'triangle', 0.15); },
    crumble: (t) => noise(t, 0.4, 800, 200, 0.5, 0.15),
    bow: (t) => { tone(t, 0.12, 520, 180, 'triangle', 0.18); noise(t, 0.08, 4000, 2000, 3, 0.12); },
    cast: (t) => { tone(t, 0.25, 300, 900, 'sine', 0.12); tone(t, 0.25, 450, 1350, 'sine', 0.06); },
    flame: (t) => { noise(t, 0.6, 400, 1800, 0.5, 0.5, 'lowpass'); tone(t, 0.5, 90, 60, 'sawtooth', 0.1); },
    guard: (t) => { tone(t, 0.4, 330, 330, 'triangle', 0.15); tone(t, 0.4, 495, 495, 'triangle', 0.1); noise(t, 0.1, 3000, 2000, 4, 0.2); },
    heal: (t) => { [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.07, 0.5, f, 0, 'sine', 0.1)); },
    leap: (t) => noise(t, 0.3, 300, 1500, 0.7, 0.3),
    slam: (t) => { tone(t, 0.5, 90, 30, 'sine', 0.7); noise(t, 0.45, 500, 80, 0.5, 0.6, 'lowpass'); },
    dodge: (t) => noise(t, 0.18, 1500, 4000, 1, 0.25),
    perfect: (t) => { tone(t, 0.4, 1200, 2400, 'sine', 0.15); tone(t + 0.05, 0.4, 1800, 3600, 'sine', 0.08); },
    boom: (t) => { tone(t, 0.7, 80, 25, 'sine', 0.8); noise(t, 0.8, 1200, 60, 0.4, 0.8, 'lowpass'); },
    portal: (t) => { tone(t, 0.8, 110, 55, 'sawtooth', 0.06); tone(t, 0.8, 165, 80, 'sine', 0.1); },
    gate: (t) => { tone(t, 1, 200, 40, 'sawtooth', 0.15); noise(t, 1, 2000, 100, 0.5, 0.5); },
    boss: (t) => { tone(t, 1.6, 55, 50, 'sawtooth', 0.22); tone(t, 1.6, 82, 80, 'sawtooth', 0.14); noise(t, 1.2, 300, 60, 0.4, 0.3, 'lowpass'); },
    blink: (t) => tone(t, 0.3, 1400, 200, 'sine', 0.12),
    rally: (t) => { [0, 0.18, 0.36].forEach((d, i) => { tone(t + d, 0.9, [196, 247, 294][i], 0, 'sawtooth', 0.12); tone(t + d, 0.9, [392, 494, 587][i], 0, 'square', 0.04); }); tone(t + 0.5, 1.4, 392, 0, 'sawtooth', 0.14); },
    victory: (t) => { [392, 494, 587, 784].forEach((f, i) => tone(t + i * 0.16, 0.9, f, 0, 'triangle', 0.16)); },
    defeat: (t) => { [294, 262, 220, 147].forEach((f, i) => tone(t + i * 0.3, 1, f, 0, 'triangle', 0.14)); },
    herodie: (t) => tone(t, 0.8, 330, 110, 'triangle', 0.15),
    click: (t) => tone(t, 0.05, 900, 600, 'square', 0.04),
    levelup: (t) => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(t + i * 0.08, 0.6, f, 0, 'triangle', 0.12)); },
    coin: (t) => { tone(t, 0.08, 1800, 0, 'square', 0.05); tone(t + 0.07, 0.15, 2400, 0, 'square', 0.05); },
    forge: (t) => { tone(t, 0.3, 1400, 1200, 'triangle', 0.15); noise(t, 0.05, 5000, 3000, 5, 0.3); },
    charge: (t) => { tone(t, 1.3, 90, 420, 'sawtooth', 0.05); noise(t, 1.3, 300, 2600, 3, 0.1); },
    chime: (t) => { [880, 1320, 1760].forEach((f, i) => tone(t + i * 0.05, 0.5, f, 0, 'triangle', 0.09)); },
    burst: (t) => { tone(t, 0.9, 240, 40, 'sawtooth', 0.16); noise(t, 0.7, 3200, 180, 4, 0.4); [523, 784, 1046, 1318].forEach((f, i) => tone(t + 0.12 + i * 0.07, 1, f, 0, 'triangle', 0.1)); },
    flame: (t) => { noise(t, 1.1, 400, 1800, 2, 0.22); noise(t + 0.1, 0.9, 1200, 500, 3, 0.12); tone(t, 0.8, 70, 50, 'sawtooth', 0.05); },
    snap: (t) => { noise(t, 0.08, 6000, 2500, 8, 0.45); tone(t, 0.25, 180, 60, 'square', 0.12); noise(t + 0.05, 0.4, 900, 200, 3, 0.2); },
    enchant: (t) => { [660, 990, 1320, 1760].forEach((f, i) => tone(t + i * 0.05, 0.45, f, 0, 'sine', 0.08)); noise(t, 0.35, 6000, 2000, 2, 0.14); },
  };
  BB.sfx = function (name) {
    if (!ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < 0.045) return;
    last[name] = now;
    const f = SFX[name]; if (f) f(now);
  };

  // ---- music: a looping war drum and drone in D minor; mood = 'calm' | 'battle' | 'boss'
  let musTimer = null, mood = null, step = 0, nextT = 0;
  const CH = { calm: [[146.8, 220, 293.7], [116.5, 174.6, 233.1], [130.8, 196, 261.6], [110, 164.8, 220]],
    battle: [[146.8, 220, 293.7], [174.6, 261.6, 349.2], [130.8, 196, 261.6], [116.5, 174.6, 233.1]],
    boss: [[146.8, 207.7, 293.7], [138.6, 207.7, 277.2], [155.6, 233.1, 311.1], [130.8, 196, 261.6]] };
  function drum(t, f, vol) {
    const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.3);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.4);
  }
  function pad(t, freqs, dur, vol) {
    for (const f of freqs) {
      for (const det of [-4, 4]) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 700;
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(flt); flt.connect(g); g.connect(musBus); o.start(t); o.stop(t + dur + 0.1);
      }
    }
  }
  function schedule() {
    if (!ac) return;
    const bpm = mood === 'calm' ? 70 : mood === 'boss' ? 118 : 104;
    const beat = 60 / bpm;
    while (nextT < ac.currentTime + 0.4) {
      const bar = Math.floor(step / 8), b = step % 8;
      const ch = CH[mood][bar % 4];
      if (b === 0) pad(nextT, ch, beat * 8, mood === 'calm' ? 0.03 : 0.025);
      if (mood !== 'calm') {
        if (b === 0 || b === 3 || b === 4 || (mood === 'boss' && b === 6)) drum(nextT, 70, 0.6);
        if (b === 2 || b === 6) { const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = ac.createGain(); g.gain.setValueAtTime(0.12, nextT); g.gain.exponentialRampToValueAtTime(0.001, nextT + 0.12); s.connect(f); f.connect(g); g.connect(musBus); s.start(nextT); s.stop(nextT + 0.15); }
        if (b % 2 === 1) tone(nextT, beat * 0.9, ch[0] * 2 * [1, 1.2, 1.5, 1.33][(step >> 1) % 4], 0, 'triangle', 0.035, musBus);
      } else if (b === 0 || b === 4) {
        tone(nextT, beat * 3, ch[2] * 2, 0, 'sine', 0.03, musBus);
      }
      step++; nextT += beat / 2;
    }
  }
  BB.music = function (m) {
    if (!init()) return;
    if (m === mood) return;
    mood = m; step = 0; nextT = ac.currentTime + 0.1;
    if (!musTimer) musTimer = setInterval(() => { if (mood) schedule(); }, 120);
    if (!m) { clearInterval(musTimer); musTimer = null; }
  };
})();
