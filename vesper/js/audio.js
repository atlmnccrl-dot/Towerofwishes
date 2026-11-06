// VESPER — sound. The battle track (Heartfelt Battle, CC0) and the repository's synthesised fight
// sounds and ambience loops. Nothing plays before the first tap (browser autoplay rules).
(function () {
  const VS = window.VS;
  const A = VS.audio = { unlocked: false, music: null, musicName: null, amb: null, ambName: null, vol: 1, sfxVol: 1, pool: {} };
  const ROOT = '../assets/';
  A.unlock = function () {
    if (A.unlocked) return; A.unlocked = true;
    if (A.pendingMusic) { const m = A.pendingMusic; A.pendingMusic = null; A.playMusic(m); }
    if (A.pendingAmb) { const m = A.pendingAmb; A.pendingAmb = null; A.playAmb(m); }
  };
  A.sfx = function (name, vol) {
    if (!A.unlocked || A.sfxVol <= 0) return;
    const p = A.pool[name] || (A.pool[name] = []);
    let a = p.find((x) => x.paused || x.ended);
    if (!a) { if (p.length >= 4) return; a = new Audio(ROOT + 'sfx/fight/' + name + '.mp3'); p.push(a); }
    a.volume = Math.min(1, (vol == null ? 0.7 : vol) * A.sfxVol); try { a.currentTime = 0; } catch (e) { /* not loaded yet */ }
    a.play().catch(() => {});
  };
  A.pick = (names, vol) => A.sfx(names[Math.floor(Math.random() * names.length)], vol);
  A.playMusic = function (name) {
    if (!A.unlocked) { A.pendingMusic = name; return; }
    if (A.musicName === name) return; A.stopMusic(); if (!name) return;
    const a = new Audio(ROOT + 'music/' + name + '.mp3'); a.loop = true; a.volume = 0.5 * A.vol; a.play().catch(() => {}); A.music = a; A.musicName = name;
  };
  A.stopMusic = function () { if (A.music) A.music.pause(); A.music = null; A.musicName = null; };
  A.playAmb = function (name) {
    if (!A.unlocked) { A.pendingAmb = name; return; }
    if (A.ambName === name) return; if (A.amb) A.amb.pause(); A.amb = null; A.ambName = name; if (!name) return;
    const a = new Audio(ROOT + 'sfx/amb/' + name + '.mp3'); a.loop = true; a.volume = 0.35 * A.vol; a.play().catch(() => {}); A.amb = a;
  };
  A.setVolume = function (v) { A.vol = v; if (A.music) A.music.volume = 0.5 * v; if (A.amb) A.amb.volume = 0.35 * v; };
  A.duck = function (on) { if (A.music) A.music.volume = (on ? 0.15 : 0.5) * A.vol; };
  // Fight events to sounds.
  A.events = function (evs) {
    for (const e of evs) {
      switch (e.type) {
        case 'hit': if (!e.art) A.pick(e.heavy ? ['slash_2', 'blow_big'] : ['slash_0', 'slash_1'], e.heavy ? 0.7 : 0.5); break;
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
      }
    }
  };
})();
