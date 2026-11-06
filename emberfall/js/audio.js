// EMBERFALL — music and sound. One battle track (Heartfelt Battle, CC0) and the synthesised fight
// and ambience clips from ../assets/sfx. Everything waits for the first tap (browser autoplay rules).
(function () {
  const EF = window.EF; const A = EF.audio = { unlocked: false, music: null, musicName: null, vol: 1, sfxVol: 1, amb: null, ambName: null, pool: {} };
  const ROOT = EF.ROOT || '../assets/';
  const SFX = { blow_0: 'fight/blow_0.mp3', blow_1: 'fight/blow_1.mp3', blow_2: 'fight/blow_2.mp3', blow_big: 'fight/blow_big.mp3', bolt: 'fight/bolt.mp3', charge: 'fight/charge.mp3', clang_0: 'fight/clang_0.mp3', clang_1: 'fight/clang_1.mp3',
    fire: 'fight/fire.mp3', horn: 'fight/horn.mp3', ice: 'fight/ice.mp3', ko: 'fight/ko.mp3', magic: 'fight/magic.mp3', quake: 'fight/quake.mp3', slash_0: 'fight/slash_0.mp3', slash_1: 'fight/slash_1.mp3', slash_2: 'fight/slash_2.mp3',
    step_0: 'fight/step_0.mp3', swish_0: 'fight/swish_0.mp3', swish_1: 'fight/swish_1.mp3', swish_2: 'fight/swish_2.mp3', thud: 'fight/thud.mp3', whoosh: 'fight/whoosh.mp3', allout: 'fight/allout.mp3' };
  A.unlock = function () { if (A.unlocked) return; A.unlocked = true; if (A.pendingMusic) A.playMusic(A.pendingMusic); if (A.pendingAmb) A.playAmb(A.pendingAmb); };
  A.sfx = function (name, vol) {
    if (!A.unlocked || !SFX[name]) return; let p = A.pool[name]; if (!p) p = A.pool[name] = [];
    let a = p.find(x => x.paused || x.ended); if (!a) { if (p.length >= 4) return; a = new Audio(ROOT + 'sfx/' + SFX[name]); p.push(a); }
    a.volume = Math.min(1, (vol == null ? 0.7 : vol) * A.sfxVol); a.currentTime = 0; a.play().catch(() => {});
  };
  A.pick = (names, vol) => A.sfx(names[Math.floor(Math.random() * names.length)], vol);
  A.playMusic = function (name) {
    if (!A.unlocked) { A.pendingMusic = name; return; } if (A.musicName === name) return; A.stopMusic(); if (!name) return;
    const a = new Audio(ROOT + 'music/' + name + '.mp3'); a.loop = true; a.volume = 0.55 * A.vol; a.play().catch(() => {}); A.music = a; A.musicName = name;
  };
  A.stopMusic = function () { if (A.music) { A.music.pause(); A.music = null; } A.musicName = null; };
  A.playAmb = function (name) {
    if (!A.unlocked) { A.pendingAmb = name; return; } if (A.ambName === name) return; if (A.amb) { A.amb.pause(); A.amb = null; } A.ambName = name; if (!name) return;
    const a = new Audio(ROOT + 'sfx/amb/' + name + '.mp3'); a.loop = true; a.volume = 0.35 * A.vol; a.play().catch(() => {}); A.amb = a;
  };
  A.setVolume = function (v) { A.vol = v; if (A.music) A.music.volume = 0.55 * v; if (A.amb) A.amb.volume = 0.35 * v; };
  A.ambFor = w => ({ ash: 'wind', snow: 'wind', rain: 'night', fog: 'wind', fireflies: 'night', embers: 'fire', motes: 'night' })[w] || 'wind';
  // Combat events → sounds.
  A.onEvent = function (ev) {
    switch (ev.type) {
      case 'swing': A.pick(ev.kind === 'ranged' ? ['bolt'] : ev.kind === 'heavy' ? ['swish_2'] : ['swish_0', 'swish_1'], 0.5); break;
      case 'damage': if (ev.element === 'burn') A.sfx('fire', 0.5); else if (ev.element === 'frost') A.sfx('ice', 0.5); else if (ev.element === 'shock') A.sfx('magic', 0.4); else if (ev.crit || ev.heavy) A.sfx('blow_big', 0.7); else A.pick(ev.fx === 'hit_blunt' || ev.fx === 'hit_punch' ? ['blow_0', 'blow_1', 'blow_2'] : ['slash_0', 'slash_1', 'slash_2', 'clang_0', 'clang_1'], 0.55); break;
      case 'break': A.sfx('clang_1', 0.9); A.sfx('thud', 0.8); break;
      case 'kill': A.sfx(ev.boss ? 'horn' : 'ko', ev.boss ? 1 : 0.6); break;
      case 'dodge': A.sfx('whoosh', 0.45); break;
      case 'special': A.sfx('charge', 0.8); break;
      case 'dash': A.sfx('whoosh', 0.8); break;
      case 'explode': A.sfx('quake', 0.8); A.sfx('fire', 0.8); break;
      case 'surge': A.sfx('allout', 1); break;
      case 'surgeready': A.sfx('magic', 0.6); break;
      case 'perfect': A.sfx('clang_0', 0.9); break;
      case 'heal': case 'potion': A.sfx('magic', 0.6); break;
      case 'phase': A.sfx('horn', 0.8); A.sfx('quake', 0.6); break;
      case 'wave': if (ev.n > 0) A.sfx('horn', 0.5); break;
      case 'win': A.sfx('horn', 1); break;
      case 'lose': A.sfx('ko', 1); break;
      case 'bolt': A.sfx('bolt', 0.5); break;
      case 'herodown': A.sfx('ko', 0.8); break;
    }
  };
})();
