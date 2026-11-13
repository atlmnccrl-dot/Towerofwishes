// The bosses of the new districts: stats and looks (BOSSES2) and their move sets (BOSS_AI2), in the
// same shape as BOSSES / BOSS_AI in defs.js and ai.js. Pure logic.
import { strike, ringAt, circleAt, summon } from './ai.js';

const deg = (d) => (d * Math.PI) / 180;

export const BOSSES2 = {
  harbormaster: { name: 'The Harbormaster', title: 'Who Drags the Drowned Ashore', hp: 2200, poise: 999, speed: 2.6, r: 0.85, mass: 9, scale: 1.85, boss: true, look: { weapon: 'axe', blade: 0x5a6a70, eyes: 0x60e0d0, hat: 'brim', bulk: 1.5, colors: { skin: 0x4a5a5a, tunic: 0x26343a, pants: 0x1c2a2e, boots: 0x101818, hat: 0x141c20, glove: 0x2a3a3a, shoulder: 0x34444a } } },
  ossuary: { name: 'The Ossuary Knight', title: 'Keeper of Ten Thousand Names', hp: 2800, poise: 999, speed: 3.0, r: 0.75, mass: 8, scale: 1.75, boss: true, look: { weapon: 'greatsword', blade: 0xd8d0c0, eyes: 0xfff0c0, horns: 0xd8d0c0, bulk: 1.3, colors: { skin: 0xd8d0c0, tunic: 0xa89e8a, pants: 0x8a806c, boots: 0x6a6250, shoulder: 0xe0d8c8, glove: 0xc8c0b0 } } },
  founder: { name: 'The Bellfounder', title: 'Who Poured the Silent Bell', hp: 3300, poise: 999, speed: 2.2, r: 0.95, mass: 10, scale: 2.0, boss: true, look: { weapon: 'bell', eyes: 0xffa020, mask: 0x8a5a20, bulk: 1.6, colors: { skin: 0x8a5a28, tunic: 0x5a3a1a, pants: 0x4a2e14, boots: 0x2a1a0c, belt: 0x3a2a14, glove: 0x6a4420, shoulder: 0x9a6a30 } } },
  regent: { name: 'The Pale Regent', title: 'Who Sold the Dawn', hp: 3700, poise: 999, speed: 3.6, r: 0.65, mass: 7, scale: 1.6, boss: true, look: { weapon: 'saber', blade: 0xf0e8ff, bladeGlow: 0x403860, eyes: 0xc0a0ff, crown: 0xd8c070, crownGlow: true, cloak: true, colors: { skin: 0xd8d0dc, tunic: 0x3a2a4a, pants: 0x2a1e36, boots: 0x140e1a, cloak: 0x4a2a5a, cloakDark: 0x2a1a36, glove: 0xd8d0dc, shoulder: 0x5a3a6a } } },
};

// Stand-in move sets (to be replaced with each boss's own): a heavy chop, a sweep and a slam ring.
const basic = (extra = []) => ({
  phases: [0.5], keep: 2.6, turn: 3.6,
  moves() {
    return [
      { id: 'chop', w: 3, max: 3.4, a: strike({ name: 'chop', anim: 'slam', range: 3.2, shape: 'line', width: 1.4, windup: 0.8, active: 0.9, dur: 1.45, dmg: 22, lunge: 1.5, tele: 'line' }) },
      { id: 'sweep', w: 2, max: 3.6, a: strike({ name: 'sweep', anim: 'sweep', range: 3.4, arc: deg(210), windup: 0.7, active: 0.86, dur: 1.4, dmg: 20 }) },
      { id: 'quake', w: 1, cd: 6, a: strike({ name: 'quake', anim: 'slam', shape: 'circle', offset: 1.5, radius: 2.2, windup: 0.95, active: 1.05, dur: 1.8, dmg: 24, lunge: 0.5, tele: 'circle', onStrike: (w, e) => ringAt(w, e, e.x, e.z, 9, { warn: 0, life: 1.1, dmg: 14 }) }) },
      ...extra,
    ];
  },
  onPhase(w, e) { summon(w, e, 'hushed', 2, 2, 5); },
});
export const BOSS_AI2 = { harbormaster: basic(), ossuary: basic(), founder: basic(), regent: basic() };
export const _unused = { circleAt };
