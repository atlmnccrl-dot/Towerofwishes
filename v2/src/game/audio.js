// Music and sound. Web Audio, unlocked by the first tap (iOS needs a gesture). Music: the battle theme
// in battles, the campfire and the night at camp. Sounds: the UI pack and the fight sounds, with a
// little pitch variation and a cap on how many play at once.
const UI = ['accept_01', 'cancel_01', 'chest_open', 'coin_01', 'confirm_01', 'equip_armor_01', 'error_01', 'level_up', 'locked_01',
  'notify_01', 'page_turn_01', 'quest_complete', 'quest_new', 'click_wood_01', 'unsheathe_01', 'anvil_01', 'heal_02'];
const FIGHT = ['allout', 'blow_0', 'blow_1', 'blow_2', 'blow_big', 'bolt', 'charge', 'clang_0', 'clang_1', 'fire', 'horn', 'ice', 'ko',
  'magic', 'quake', 'slash_0', 'slash_1', 'slash_2', 'swish_0', 'swish_1', 'swish_2', 'thud', 'whoosh'];
const LOOPS = { battle: 'assets/music/heartfelt_battle.mp3', fire: 'assets/sfx/amb/fire.mp3', night: 'assets/sfx/amb/night.mp3' };

export function createAudio(getSettings) {
  const settings = new Proxy({}, { get: (_, k) => getSettings()[k] });
  let ctx = null, master = null, musicBus = null, sfxBus = null, scene = null;
  const buffers = {}, playing = {}, recent = new Map();
  const vol = () => { if (!ctx) return; musicBus.gain.value = settings.music; sfxBus.gain.value = settings.sfx; };
  async function load(name, url) {
    if (buffers[name]) return buffers[name];
    try { const r = await fetch(url); buffers[name] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { buffers[name] = null; }
    return buffers[name];
  }
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain(); musicBus.connect(master); sfxBus.connect(master); vol();
    for (const n of UI) load(n, `assets/sfx/${n}.mp3`);
    for (const n of FIGHT) load(n, `assets/sfx/fight/${n}.mp3`);
    if (scene) { const s = scene; scene = null; setScene(s); }
  }
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, unlock, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });

  // a short sound; names may be a list to pick from
  function play(name, { vary = 0.06, gain = 1, gap = 0.05 } = {}) {
    if (!ctx || !settings.sfx) return;
    const n = Array.isArray(name) ? name[Math.floor(Math.random() * name.length)] : name, b = buffers[n];
    const key = Array.isArray(name) ? name[0] : name, now = ctx.currentTime;
    if (!b || now - (recent.get(key) || -1) < gap) return;
    recent.set(key, now);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; src.playbackRate.value = 1 + (Math.random() * 2 - 1) * vary; g.gain.value = gain;
    src.connect(g); g.connect(sfxBus); src.start();
  }
  // the music for a screen: 'battle', 'camp' (fire and night together) or null
  async function setScene(name) {
    if (name === scene) return; scene = name;
    if (!ctx) return;
    for (const [k, p] of Object.entries(playing)) { p.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); p.src.stop(ctx.currentTime + 2); delete playing[k]; }
    const want = name === 'battle' ? [['battle', 0.55]] : name === 'camp' ? [['fire', 0.7], ['night', 0.35]] : [];
    for (const [k, level] of want) {
      const b = await load(k, LOOPS[k]); if (!b || scene !== name) continue;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; src.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(level, ctx.currentTime, 0.6);
      src.connect(g); g.connect(musicBus); src.start(); playing[k] = { src, g };
    }
  }
  // the battle's events as sounds
  const SWING = { slash: ['swish_0', 'swish_1', 'swish_2'], dagger: ['swish_0', 'swish_1'], thrust: ['whoosh'], blunt: ['swish_2'], claw: ['slash_0', 'slash_1'] };
  function battleEvents(b) {
    for (const e of b.events) {
      if (e.type === 'swing') play(SWING[e.fx] || SWING.slash, { gain: 0.5, gap: 0.07 });
      else if (e.type === 'shoot') play('bolt', { gain: 0.4, gap: 0.08 });
      else if (e.type === 'hit' && !e.dot) play(e.crit ? 'blow_big' : ['blow_0', 'blow_1', 'blow_2'], { gain: e.crit ? 0.8 : 0.45, gap: 0.05 });
      else if (e.type === 'cast') play('charge', { gain: 0.6 });
      else if (e.type === 'ability') {
        const fx = e.fx || '';
        play(/fire|flame|ignite/.test(fx) ? 'fire' : /ice|frost/.test(fx) ? 'ice' : /rock|shock|quake/.test(fx) ? 'quake' : /slash|cleave|claw|multi/.test(fx) ? ['slash_0', 'slash_1', 'slash_2'] : 'magic', { gain: 0.8 });
      } else if (e.type === 'heal') play('heal_02', { gain: 0.35, gap: 0.2 });
      else if (e.type === 'ko') play('ko', { gain: 0.6 });
      else if (e.type === 'end') play(e.result === 'win' ? 'horn' : 'thud', { gain: 0.8 });
    }
  }
  return { unlock, play, setScene, battleEvents, setVolumes: vol };
}
