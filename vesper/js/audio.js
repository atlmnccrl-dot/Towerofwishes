// VESPER — sound. The battle track (Heartfelt Battle, CC0) and the repository's synthesised fight
// sounds and ambience loops. Nothing plays before the first tap (browser autoplay rules).
(function () {
  const VS = window.VS;
  const A = VS.audio = { unlocked: false, music: null, musicName: null, amb: null, ambName: null, vol: 1, sfxVol: 1 };
  const ROOT = () => VS.A.ROOT;
  // Effects play through Web Audio from decoded buffers (no stalls, real volume on iPhone);
  // music and ambience stream from media elements routed through gain nodes.
  const SFX = ['allout', 'blow_0', 'blow_1', 'blow_2', 'blow_big', 'bolt', 'charge', 'clang_0', 'clang_1', 'horn', 'ko', 'magic', 'quake',
    'slash_0', 'slash_1', 'slash_2', 'step_0', 'step_1', 'step_2', 'swish_0', 'swish_1', 'swish_2', 'thud', 'whoosh'];
  let ac = null, sfxGain = null, musicGain = null, ambGain = null; const buf = {}, live = {};
  function media(src, gain) {
    const a = new Audio(src); a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
    try { ac.createMediaElementSource(a).connect(gain); } catch (e) { a.volume = gain.gain.value; }
    return a;
  }
  A.unlock = function () {
    if (A.unlocked) { if (ac && ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    A.unlocked = true;
    sfxGain = ac.createGain(); musicGain = ac.createGain(); ambGain = ac.createGain();
    for (const g of [sfxGain, musicGain, ambGain]) g.connect(ac.destination);
    A.setVolume(A.vol);
    // A silent tick unlocks iOS output.
    try { const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(0); } catch (e) { /* fine */ }
    for (const n of SFX) fetch(ROOT() + 'sfx/fight/' + n + '.mp3').then((r) => r.arrayBuffer()).then((d) => new Promise((ok, no) => ac.decodeAudioData(d, ok, no))).then((b) => { buf[n] = b; }).catch(() => {});
    if (A.pendingMusic) { const m = A.pendingMusic; A.pendingMusic = null; A.playMusic(m); }
    if (A.pendingAmb) { const m = A.pendingAmb; A.pendingAmb = null; A.playAmb(m); }
  };
  A.sfx = function (name, vol) {
    if (!A.unlocked || A.sfxVol <= 0 || !buf[name]) return;
    if ((live[name] || 0) >= 3) return;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf[name]; g.gain.value = Math.min(1, vol == null ? 0.7 : vol);
    src.playbackRate.value = 0.9 + Math.random() * 0.2;   // a little variety so repeated blows don't sound identical
    src.connect(g); g.connect(sfxGain); live[name] = (live[name] || 0) + 1;
    src.onended = () => { live[name]--; };
    src.start(0);
  };
  A.pick = (names, vol) => A.sfx(names[Math.floor(Math.random() * names.length)], vol);
  A.playMusic = function (name) {
    if (!A.unlocked) { A.pendingMusic = name; return; }
    if (A.musicName === name) return; A.stopMusic(); if (!name) return;
    const a = media(ROOT() + 'music/' + name + '.mp3', musicGain); a.play().catch(() => {}); A.music = a; A.musicName = name;
  };
  A.stopMusic = function () { if (A.music) A.music.pause(); A.music = null; A.musicName = null; };
  A.playAmb = function (name) {
    if (!A.unlocked) { A.pendingAmb = name; return; }
    if (A.ambName === name) return; if (A.amb) A.amb.pause(); A.amb = null; A.ambName = name; if (!name) return;
    const a = media(ROOT() + 'sfx/amb/' + name + '.mp3', ambGain); a.play().catch(() => {}); A.amb = a;
  };
  A.setVolume = function (v) {
    A.vol = v; if (!ac) return;
    musicGain.gain.value = 0.5 * v * (A.ducked ? 0.3 : 1); ambGain.gain.value = 0.35 * v; sfxGain.gain.value = A.sfxVol;
  };
  A.duck = function (on) { A.ducked = on; A.setVolume(A.vol); };
  // Fight events to sounds.
  A.events = function (evs) {
    for (const e of evs) {
      switch (e.type) {
        case 'hit': if (!e.art) { A.pick(e.heavy ? ['slash_2', 'blow_big'] : ['slash_0', 'slash_1'], e.heavy ? 0.7 : 0.5); if (e.heavy) A.pick(['blow_0', 'blow_1', 'blow_2'], 0.5); } break;
        case 'hurt': A.pick(['blow_0', 'blow_1', 'blow_2'], 0.7); break;
        case 'parry': A.sfx('clang_0', 0.9); A.sfx('clang_1', 0.5); break;
        case 'perfect': A.sfx('whoosh', 0.8); break;
        case 'break': A.sfx('thud', 0.9); A.sfx('clang_1', 0.7); break;
        case 'kill': A.sfx(e.boss ? 'horn' : 'ko', e.boss ? 0.9 : 0.5); break;
        case 'dodge': A.pick(['swish_0', 'swish_1'], 0.45); break;
        case 'swing': A.pick(['swish_0', 'swish_1', 'swish_2'], 0.35); break;
        case 'windup': if (e.unparry) A.sfx('charge', 0.35); break;
        case 'bolt': A.sfx('bolt', 0.5); break;
        case 'blink': A.sfx('magic', 0.5); break;
        case 'boss': A.sfx('horn', 0.8); break;
        case 'phase': A.sfx('quake', 0.8); break;
        case 'moonFull': A.sfx('allout', 0.5); break;
        case 'launch': A.sfx('whoosh', 0.8); A.sfx('blow_big', 0.6); break;
        case 'juggle': A.pick(['slash_1', 'slash_2'], 0.6); break;
        case 'land': A.sfx('thud', 0.8); break;
        case 'wall': A.sfx('clang_1', 0.8); A.sfx('blow_big', 0.7); break;
        case 'impact': A.sfx('blow_big', e.size === 'big' ? 1 : 0.7); if (e.size === 'big') A.sfx('clang_1', 0.6); break;
        case 'spin': A.sfx('whoosh', 0.7); A.sfx('swish_2', 0.6); break;
        case 'spawn': A.sfx(e.boss ? 'charge' : 'magic', 0.4); break;
        case 'landed': if (e.boss) { A.sfx('quake', 1); A.sfx('blow_big', 0.8); } break;
        case 'portal': A.sfx('allout', 0.6); break;
        case 'counter': A.sfx('clang_0', 0.9); A.sfx('swish_1', 0.6); break;
        case 'healpulse': A.sfx('magic', 0.5); break;
        case 'reinforce': A.sfx('horn', 0.7); A.sfx('quake', 0.5); break;
        case 'finisher': A.sfx('blow_big', 1); A.sfx('clang_1', 0.7); break;
        case 'transit': A.sfx('whoosh', 0.9); break;
      }
    }
  };
})();
