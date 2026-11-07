// HOLDFAST - sound. Web Audio: the repository's synthesised fight sounds and ambience loops,
// the UI sounds (converted from the fantasy UI pack), "Heartfelt Battle" (CC0) during attacks,
// and synthesised birdsong by day and crickets by night. Everything waits for the first tap.
(function () {
  const HF = window.HF; const AU = HF.AU = { on: false, ctx: null, buf: {}, vol: { master: 0.9, music: 0.5, sfx: 0.8, amb: 0.6 }, last: {} };
  const ROOT = '../assets/sfx/', OWN = 'assets/sfx/';
  const FILES = {
    blow_0: ROOT + 'fight/blow_0.mp3', blow_1: ROOT + 'fight/blow_1.mp3', blow_2: ROOT + 'fight/blow_2.mp3', blow_big: ROOT + 'fight/blow_big.mp3',
    clang_0: ROOT + 'fight/clang_0.mp3', clang_1: ROOT + 'fight/clang_1.mp3', slash_0: ROOT + 'fight/slash_0.mp3', slash_1: ROOT + 'fight/slash_1.mp3',
    swish_0: ROOT + 'fight/swish_0.mp3', swish_1: ROOT + 'fight/swish_1.mp3', swish_2: ROOT + 'fight/swish_2.mp3', whoosh: ROOT + 'fight/whoosh.mp3',
    horn: ROOT + 'fight/horn.mp3', ko: ROOT + 'fight/ko.mp3', quake: ROOT + 'fight/quake.mp3', thud: ROOT + 'fight/thud.mp3', magic: ROOT + 'fight/magic.mp3',
    bolt: ROOT + 'fight/bolt.mp3', fire: ROOT + 'fight/fire.mp3', step_0: ROOT + 'fight/step_0.mp3', charge: ROOT + 'fight/charge.mp3',
    amb_wind: ROOT + 'amb/wind.mp3', amb_night: ROOT + 'amb/night.mp3', amb_fire: ROOT + 'amb/fire.mp3', amb_murmur: ROOT + 'amb/murmur.mp3',
    click: OWN + 'click.mp3', confirm: OWN + 'confirm.mp3', cancel: OWN + 'cancel.mp3', coins: OWN + 'coins.mp3', craft: OWN + 'craft.mp3',
    notify: OWN + 'notify.mp3', reward: OWN + 'reward.mp3', error: OWN + 'error.mp3', page: OWN + 'page.mp3', hover: OWN + 'hover.mp3',
    music_battle: '../assets/music/heartfelt_battle.mp3',
  };
  // Simulation sound names -> [file, volume, pitch spread].
  const MAP = {
    chop: [['blow_0', 'blow_1'], 0.35, 0.15], pick: [['clang_0'], 0.18, 0.2], hammer: [['blow_2', 'blow_1'], 0.28, 0.2], anvil: [['clang_1'], 0.3, 0.1],
    swing: [['swish_0', 'swish_1', 'swish_2'], 0.32, 0.12], bow: [['whoosh'], 0.3, 0.2], magic: [['magic'], 0.4, 0.1], horn: [['horn'], 0.8, 0], horn_far: [['horn'], 0.4, 0],
    ko: [['ko'], 0.45, 0.1], boss_die: [['blow_big'], 0.9, 0], death: [['ko'], 0.8, 0], down: [['blow_big'], 0.6, 0], collapse: [['quake'], 0.6, 0.1],
    place: [['craft'], 0.5, 0.05], built: [['reward'], 0.45, 0], click: [['click'], 0.5, 0], confirm: [['confirm'], 0.5, 0], cancel: [['cancel'], 0.5, 0],
    craft: [['craft'], 0.5, 0], reward: [['reward'], 0.5, 0], notify: [['notify'], 0.45, 0], page: [['page'], 0.5, 0], error: [['error'], 0.45, 0], coins: [['coins'], 0.5, 0],
    hit: [['slash_0', 'slash_1', 'blow_0'], 0.4, 0.15], bhit: [['thud', 'blow_2'], 0.35, 0.15],
    stomp: [['thud'], 0.55, 0.05], impact: [['blow_big', 'quake'], 0.6, 0.1],
  };
  AU.unlock = function () {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AU.ctx = new C(); AU.on = true;
    const c = AU.ctx;
    AU.master = c.createGain(); AU.master.connect(c.destination);
    AU.gMusic = c.createGain(); AU.gSfx = c.createGain(); AU.gAmb = c.createGain();
    AU.gMusic.connect(AU.master); AU.gSfx.connect(AU.master); AU.gAmb.connect(AU.master);
    AU.applyVol();
    for (const k in FILES) fetch(FILES[k]).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => c.decodeAudioData(b, res, rej))).then(d => { AU.buf[k] = d; if (k.startsWith('amb_')) AU.ambUpdate(true); }).catch(() => {});
    AU.loops = {};
    setInterval(AU.nature, 400);
  };
  AU.applyVol = function () { if (!AU.ctx) return; AU.master.gain.value = AU.vol.master; AU.gMusic.gain.value = AU.vol.music; AU.gSfx.gain.value = AU.vol.sfx; AU.gAmb.gain.value = AU.vol.amb; };
  AU.play = function (name, vol, pitch, pan) {
    if (!AU.ctx || !AU.buf[name]) return;
    const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.buf[name]; s.playbackRate.value = pitch || 1;
    const g = c.createGain(); g.gain.value = vol == null ? 0.6 : vol;
    let node = g;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
    s.connect(g); node.connect(AU.gSfx); s.start();
  };
  // A simulation sound, attenuated by distance from the camera.
  AU.sfx = function (name, x, y) {
    if (name === 'screech') return AU.screech(x, y);
    const m = MAP[name]; if (!m) return;
    const now = performance.now(); if (AU.last[name] && now - AU.last[name] < 45) return; AU.last[name] = now;
    let vol = m[1], pan = 0;
    if (x != null && HF.R) {
      const p = HF.R.w2s(x, y); const dx = (p.x - HF.R.W / 2) / HF.R.W, dy = (p.y - HF.R.H / 2) / HF.R.H; const d = Math.hypot(dx, dy);
      vol *= Math.max(0, 1 - Math.max(0, d - 0.35) * 1.3) * Math.min(1.2, 0.6 + HF.R.cam.z * 0.25); pan = dx * 1.2;
      if (vol < 0.02) return;
    }
    const f = m[0][Math.floor(Math.random() * m[0].length)];
    AU.play(f, vol, 1 + (Math.random() - 0.5) * 2 * m[2], pan);
  };
  AU.ui = name => AU.sfx(name);
  // Synthesised creature voices (no samples for these): a roar and a screech.
  function noiseBuf() { if (AU.nb) return AU.nb; const c = AU.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return AU.nb = b; }
  function voice(dur, f0, f1, q, vol, pan, type) {
    if (!AU.ctx) return; const c = AU.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = noiseBuf(); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const o = c.createOscillator(); o.type = type || 'sawtooth'; o.frequency.setValueAtTime(f0 / 4, t); o.frequency.exponentialRampToValueAtTime(f1 / 4, t + dur);
    const og = c.createGain(); og.gain.value = 0.35;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.12); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let out = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); out = p; }
    n.connect(bp); bp.connect(g); o.connect(og); og.connect(g); out.connect(AU.gSfx); n.start(t); o.start(t); n.stop(t + dur + 0.05); o.stop(t + dur + 0.05);
  }
  function place(x, y) { if (x == null || !HF.R) return [1, 0]; const p = HF.R.w2s(x, y); const dx = (p.x - HF.R.W / 2) / HF.R.W, dy = (p.y - HF.R.H / 2) / HF.R.H; return [Math.max(0.15, 1 - Math.max(0, Math.hypot(dx, dy) - 0.4) * 0.9), dx]; }
  AU.roar = function (x, y) { const [v, p] = place(x, y); voice(1.9, 520, 140, 3, 0.9 * v, p); voice(1.6, 260, 90, 2, 0.6 * v, p, 'square'); AU.play('quake', 0.5 * v); };
  AU.screech = function (x, y) { const now = performance.now(); if (AU.lastScreech && now - AU.lastScreech < 600) return; AU.lastScreech = now; const [v, p] = place(x, y); voice(0.45, 2600, 1200, 6, 0.45 * v, p); };
  AU.thunder = function () { if (!AU.ctx) return; voice(2.6, 300, 60, 0.8, 0.9, 0, 'triangle'); AU.play('quake', 0.6, 0.7); };
  function loop(name, target) {
    if (!AU.ctx || !AU.buf[name]) return;
    let L = AU.loops[name];
    if (!L) { const s = AU.ctx.createBufferSource(); s.buffer = AU.buf[name]; s.loop = true; const g = AU.ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(name === 'music_battle' ? AU.gMusic : AU.gAmb); s.start(); L = AU.loops[name] = { s, g }; }
    L.g.gain.setTargetAtTime(target, AU.ctx.currentTime, 1.2);
  }
  // Ambience follows the hour, the weather and what is happening.
  AU.state = { night: false, rain: false, battle: false, fire: 0, menu: false, mute: false };
  AU.ambUpdate = function () {
    if (!AU.ctx) return; const s = AU.state;
    loop('amb_wind', s.menu ? 0.35 : s.rain ? 0.55 : 0.28);
    loop('amb_night', s.night ? 0.45 : 0.0);
    loop('amb_fire', Math.min(0.5, s.fire));
    loop('amb_murmur', s.murmur || 0);
    loop('music_battle', s.battle ? 0.8 : 0);
  };
  AU.set = function (o) { let ch = false; for (const k in o) if (AU.state[k] !== o[k]) { AU.state[k] = o[k]; ch = true; } if (ch) AU.ambUpdate(); };
  // Synthesised wildlife: chirps by day, crickets by night.
  AU.nature = function () {
    if (!AU.ctx || AU.state.battle || AU.state.mute) return;
    const c = AU.ctx, t = c.currentTime;
    if (!AU.state.night && !AU.state.rain && Math.random() < 0.18) {
      const base = 2200 + Math.random() * 2400, n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
        const t0 = t + i * (0.09 + Math.random() * 0.05);
        o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), t0 + 0.06);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.08);
        const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) { p.pan.value = Math.random() * 2 - 1; o.connect(g); g.connect(p); p.connect(AU.gAmb); } else { o.connect(g); g.connect(AU.gAmb); }
        o.start(t0); o.stop(t0 + 0.1);
      }
    }
    if (AU.state.night && Math.random() < 0.5) {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'triangle'; o.frequency.value = 4200 + Math.random() * 600; lfo.frequency.value = 28 + Math.random() * 10; lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(g.gain); g.gain.value = 0.0; o.connect(g); g.connect(AU.gAmb);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.35);
      o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
    }
  };
  // A low swell for cinematic beats.
  AU.swell = function (dur, freq) {
    if (!AU.ctx) return; const c = AU.ctx, t = c.currentTime;
    for (const f of [freq || 110, (freq || 110) * 1.5, (freq || 110) * 2]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(AU.gMusic); o.start(t); o.stop(t + dur + 0.1); }
  };
})();
