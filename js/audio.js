/*
 * Tower of Wishes — UI sound (assets/sfx/: "Fantasy UI SFX Free" by heyheythere, CC BY 4.0).
 *
 *   TowAudio.play(name, volume)   e.g. play('level_up'), play('chest_open', 0.6)
 *   TowAudio.on                   sound on/off (saved), toggled by the menu's Sound button
 *   TowAudio.music(name | null)   the music that should be playing now; it fades across. Tracks
 *                                 (assets/music/): 'battle' = "Heartfelt Battle" (OpenGameArt, CC0)
 *
 * Web Audio, unlocked on the first touch (iPhone Safari needs a gesture before any sound).
 * Every button click plays a soft click unless its id has its own sound below.
 */
(function () {
  'use strict';
  const NAMES = ['accept_01', 'anvil_01', 'book_open_01', 'cancel_01', 'chest_open', 'click_iron_01', 'click_stone_01', 'click_wood_01',
    'coin_01', 'confirm_01', 'drink_01', 'equip_armor_01', 'error_01', 'heal_02', 'hover_harp_01', 'level_up', 'locked_01', 'notify_01',
    'page_turn_01', 'pick_up_01', 'quest_complete', 'quest_new', 'scroll_open_01', 'spell_select_01', 'talk_mid_01', 'tick_01',
    'toggle_off_01', 'toggle_on_01', 'uncork_01', 'unsheathe_01'];
  // Buttons with their own sound (by id); others click softly.
  const BUTTONS = {
    'btn-story': ['confirm_01', 0.6], 'btn-chapters': ['scroll_open_01', 0.6], 'btn-team': ['book_open_01', 0.6],
    'btn-pause': ['toggle_off_01', 0.5], 'btn-again': ['accept_01', 0.6], 'btn-allout': ['spell_select_01', 0.8],
    'btn-skip': ['page_turn_01', 0.5], 'btn-story-menu': ['cancel_01', 0.5], 'btn-reset-yes': ['error_01', 0.6],
  };
  const KEY = 'tow.sound';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* private mode: default on */ }
  let ctx = null;
  const buffers = {};
  // Music streams from an <audio> element routed through a gain node (iPhone ignores element volume).
  const MUSIC = { battle: ['assets/music/heartfelt_battle.mp3', 0.4] };
  const tracks = {};
  let musName = null;
  function track(n) {
    if (tracks[n]) return tracks[n];
    const el = new Audio(MUSIC[n][0]);
    el.loop = true; el.preload = 'auto';
    const g = ctx.createGain(); g.gain.value = 0;
    ctx.createMediaElementSource(el).connect(g); g.connect(ctx.destination);
    return (tracks[n] = { el, g, stop: 0 });
  }
  function ramp(T, v, s) { const t = ctx.currentTime; T.g.gain.cancelScheduledValues(t); T.g.gain.setValueAtTime(T.g.gain.value, t); T.g.gain.linearRampToValueAtTime(v, t + s); }
  function applyMusic() {
    if (!ctx) return;
    for (const [n, T] of Object.entries(tracks)) {
      if (n === musName && on) continue;
      ramp(T, 0, 1.2); clearTimeout(T.stop);
      T.stop = setTimeout(() => { if (musName !== n || !on) T.el.pause(); }, 1300);
    }
    if (!musName || !on || !MUSIC[musName]) return;
    const T = track(musName);
    clearTimeout(T.stop);
    if (T.el.paused) { try { T.el.currentTime = 0; } catch (e) { /* not loaded yet */ } T.el.play().catch(() => {}); }
    ramp(T, MUSIC[musName][1], 1.6);
  }
  function music(name) { if (name === musName) return; musName = name; applyMusic(); }
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    applyMusic();
    for (const n of NAMES) {
      fetch('assets/sfx/' + n + '.mp3').then((r) => r.arrayBuffer())
        .then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
        .then((buf) => { buffers[n] = buf; })
        .catch(() => {});
    }
  }
  function play(name, vol) {
    if (!on || !ctx || !buffers[name]) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[name]; g.gain.value = vol == null ? 0.7 : vol;
    src.connect(g); g.connect(ctx.destination);
    src.start();
  }
  function label() { const b = document.getElementById('btn-sound'); if (b) b.textContent = 'Sound: ' + (on ? 'on' : 'off'); }
  function setOn(v) { on = !!v; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* ignore */ } label(); applyMusic(); }
  if (typeof document !== 'undefined') {
    for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, unlock, { passive: true });
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button, summary');
      if (!b) return;
      if (b.id === 'btn-sound') { setOn(!on); if (on) play('toggle_on_01', 0.6); return; }
      const s = BUTTONS[b.id];
      if (s) play(s[0], s[1]); else play('click_wood_01', 0.35);
    }, true);
    document.addEventListener('DOMContentLoaded', label);
  }
  window.TowAudio = { play, music, get on() { return on; }, set on(v) { setOn(v); } };
})();
