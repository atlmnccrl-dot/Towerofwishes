// Data for the fight: the hero's moves and every foe. Pure data, no DOM, no three.js.
// Angles in radians, distances in metres, times in seconds, speeds in m/s.
// An attack: windup = when the hit window opens, active = when it closes, dur = when the move ends,
// cancel = from when the next input may chain. shape 'arc' (range + arc), 'circle' (radius at
// offset), 'line' (range x width). lunge = forward speed while winding up.

const deg = (d) => (d * Math.PI) / 180;

export const HERO = {
  maxHp: 100, speed: 6.2, r: 0.38, tonics: 3,
  dash: { dur: 0.24, speed: 15, iframes: 0.2, cooldown: 0.36, perfectWindow: 0.16 },
  parry: { window: 0.2, dur: 0.42 },
  heal: { dur: 0.95, at: 0.5, amount: 0.45 },
  combo: [
    { name: 'L1', anim: 'slash1', dur: 0.4, windup: 0.09, active: 0.17, cancel: 0.2, range: 2.05, arc: deg(150), dmg: 11, poise: 12, kb: 2.5, lunge: 4.2 },
    { name: 'L2', anim: 'slash2', dur: 0.42, windup: 0.09, active: 0.17, cancel: 0.2, range: 2.05, arc: deg(150), dmg: 12, poise: 12, kb: 2.5, lunge: 4.2 },
    { name: 'L3', anim: 'slash3', dur: 0.62, windup: 0.16, active: 0.27, cancel: 0.42, range: 2.4, arc: deg(250), dmg: 20, poise: 30, kb: 7, lunge: 5.5, heavy: true },
  ],
  dashAttack: { name: 'DA', anim: 'thrust', dur: 0.42, windup: 0.06, active: 0.2, cancel: 0.28, range: 2.6, width: 1.0, shape: 'line', dmg: 15, poise: 18, kb: 4, lunge: 11 },
  heavy: { name: 'H', anim: 'heavy', dur: 0.62, windup: 0.1, active: 0.22, cancel: 0.5, range: 2.8, arc: deg(290), dmg: 22, poise: 45, kb: 9, lunge: 3, heavy: true, chargeMax: 0.85, chargeDmg: 22 },
  finisher: { dur: 0.95, hitAt: 0.55, dmgMul: 5, heal: 8, meter: 12 },
  special: { dur: 1.6, radius: 6.5, hits: 7, dmg: 13, cost: 100 },
  meter: { onHit: 2.4, onParry: 20, onPerfect: 22, onKill: 5, onHurt: 1.5 },
};

// Foe attacks
const A = {
  slash: { name: 'slash', anim: 'fslash', dur: 1.05, windup: 0.5, active: 0.62, range: 1.75, arc: deg(110), dmg: 12, poise: 0, kb: 4, lunge: 3.2, tele: 'arc' },
  slash2: { name: 'slash2', anim: 'fslash', dur: 1.4, windup: 0.5, active: 0.62, range: 1.75, arc: deg(110), dmg: 10, kb: 3, lunge: 3.2, tele: 'arc', chain: { at: 0.8, windup: 0.95, active: 1.06, lunge: 3 } },
  claw: { name: 'claw', anim: 'pounce', dur: 0.9, windup: 0.42, active: 0.62, range: 1.3, arc: deg(100), dmg: 9, kb: 3, lunge: 8.5, lungeT: [0.42, 0.62], tele: 'line', teleRange: 3.4 },
  orb: { name: 'orb', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, ranged: { kind: 'orb', speed: 6.5, r: 0.28, dmg: 13, life: 3.2, homing: 1.4, reflect: true }, tele: 'none' },
  orbFan: { name: 'orbFan', anim: 'cast', dur: 1.4, windup: 0.7, active: 0.72, ranged: { kind: 'orb', speed: 6, r: 0.28, dmg: 11, life: 3, fan: 3, spread: deg(22), reflect: true }, tele: 'none' },
  bolt: { name: 'bolt', anim: 'aim', dur: 1.5, windup: 0.95, active: 0.97, ranged: { kind: 'bolt', speed: 19, r: 0.18, dmg: 13, life: 1.6, reflect: true }, tele: 'ray', teleRange: 18 },
  slam: { name: 'slam', anim: 'slam', dur: 1.6, windup: 0.9, active: 1.0, shape: 'circle', offset: 1.6, radius: 1.8, dmg: 26, kb: 9, lunge: 1.2, tele: 'circle', heavy: true },
  sweep: { name: 'sweep', anim: 'sweep', dur: 1.3, windup: 0.7, active: 0.85, range: 2.8, arc: deg(200), dmg: 20, kb: 8, lunge: 1.5, tele: 'arc', heavy: true },
  thrust: { name: 'thrust', anim: 'fthrust', dur: 1.1, windup: 0.55, active: 0.7, shape: 'line', range: 2.6, width: 0.8, dmg: 14, kb: 5, lunge: 5, tele: 'line' },
  shieldBash: { name: 'bash', anim: 'bash', dur: 0.9, windup: 0.4, active: 0.52, range: 1.4, arc: deg(90), dmg: 9, kb: 7, lunge: 6, tele: 'arc' },
};
export const ATTACKS = A;

// Foe types. `tier` scales with the district (see scaleFoe). look: rig dress for the view.
export const FOES = {
  hushed: {
    name: 'Hushed', hp: 70, poise: 30, flinch: 3, speed: 2.9, r: 0.38, mass: 1, aggro: 11, keep: 1.4,
    attacks: [{ a: A.slash, w: 3, min: 0, max: 1.9 }, { a: A.slash2, w: 1.4, min: 0, max: 1.9 }], drop: 6,
    look: { weapon: 'saber', hood: true, eyes: 0xff2a20, cloak: true, colors: { skin: 0x4a4448, tunic: 0x2a2e38, pants: 0x1e2028, boots: 0x121216, cloak: 0x252933, cloakDark: 0x1c1f27, hood: 0x252933, glove: 0x181a20 } },
  },
  ghoul: {
    name: 'Ghoul', hp: 48, poise: 18, flinch: 2, speed: 4.6, r: 0.34, mass: 0.8, aggro: 13, keep: 2.6, hunch: true,
    attacks: [{ a: A.claw, w: 1, min: 1.2, max: 3.4 }, { a: { ...A.claw, lunge: 3, lungeT: [0.3, 0.5], windup: 0.3, active: 0.5, dur: 0.75, range: 1.4 }, w: 1, min: 0, max: 1.4 }], drop: 5,
    look: { weapon: 'none', claws: 0xd0c8b8, eyes: 0xff4020, noHair: true, colors: { skin: 0x6a6a72, tunic: 0x34343c, pants: 0x2a2a32, boots: 0x4a4a52, glove: 0x6a6a72 }, bulk: 0.85 },
  },
  acolyte: {
    name: 'Acolyte', hp: 52, poise: 20, flinch: 2, speed: 2.6, r: 0.36, mass: 0.9, aggro: 14, keep: 7, ranged: true, blink: true,
    attacks: [{ a: A.orb, w: 3, min: 3, max: 12 }, { a: A.orbFan, w: 1.5, min: 3, max: 12 }], drop: 7,
    look: { weapon: 'staff', orb: 0xff3448, hood: true, eyes: 0xff3040, skirt: 0x2a1418, colors: { skin: 0x3a3438, tunic: 0x3a161c, pants: 0x1a1214, boots: 0x0c0a0a, hood: 0x2e1218, glove: 0x1a1214 } },
  },
  crossbow: {
    name: 'Gallows Archer', hp: 50, poise: 20, flinch: 2, speed: 2.7, r: 0.36, mass: 0.9, aggro: 16, keep: 8.5, ranged: true,
    attacks: [{ a: A.bolt, w: 1, min: 3, max: 16 }], drop: 7,
    look: { weapon: 'crossbow', hat: 'brim', eyes: 0xff4028, cloak: true, colors: { skin: 0x4a4448, tunic: 0x34302c, pants: 0x222024, boots: 0x121214, cloak: 0x2c2826, hat: 0x18181c, glove: 0x201e22 } },
  },
  brute: {
    name: 'Executioner', hp: 320, poise: 120, flinch: 0, speed: 2.1, r: 0.62, mass: 3, aggro: 12, keep: 2.2, armor: true, scale: 1.45,
    attacks: [{ a: A.slam, w: 1.2, min: 0, max: 3.2 }, { a: A.sweep, w: 1.5, min: 0, max: 2.7 }], drop: 22,
    look: { weapon: 'axe', mask: 0x2a2a2e, eyes: 0xff3020, bulk: 1.35, colors: { skin: 0x6a5a54, tunic: 0x2a1c18, pants: 0x1a1414, boots: 0x0e0c0c, belt: 0x3a2a1e, glove: 0x2a2020 } },
  },
  warden: {
    name: 'Bell Warden', hp: 120, poise: 50, flinch: 1, speed: 2.4, r: 0.42, mass: 1.6, aggro: 12, keep: 1.6, shield: true,
    attacks: [{ a: A.thrust, w: 2, min: 0, max: 2.6 }, { a: A.shieldBash, w: 1, min: 0, max: 1.5 }], drop: 12,
    look: { weapon: 'sword', offhand: 'shield', eyes: 0xff4030, horns: 0x2a2a30, colors: { skin: 0x3a3438, tunic: 0x30343c, pants: 0x1c1e24, boots: 0x101114, shoulder: 0x4a505a, glove: 0x2a2e36 }, bulk: 1.1 },
  },
};

// Bosses: base stats; their patterns live in ai.js.
export const BOSSES = {
  gaoler: {
    name: 'The Gaoler', title: 'Keeper of the Gallows Keys', hp: 1500, poise: 999, speed: 2.4, r: 0.85, mass: 9, scale: 1.9, boss: true,
    look: { weapon: 'cleaver', offhand: 'lantern', mask: 0x1e1a1a, eyes: 0xffa030, bulk: 1.5, colors: { skin: 0x6a5450, tunic: 0x2a1e1a, pants: 0x1c1616, boots: 0x0e0c0c, belt: 0x4a3a26, glove: 0x2a2020, shoulder: 0x3a3030 } },
  },
  tallow: {
    name: 'Mother Tallow', title: 'Who Keeps the Candles Burning', hp: 2000, poise: 999, speed: 3.2, r: 0.6, mass: 6, scale: 1.55, boss: true, hover: true,
    look: { weapon: 'staff', orb: 0xffb040, hood: true, eyes: 0xffd060, skirt: 0xd8ccb0, colors: { skin: 0xe0d4bc, tunic: 0xc8bca0, pants: 0xa89c84, boots: 0x8a7e68, hood: 0xd0c4a8, glove: 0xe0d4bc }, bulk: 1.1 },
  },
  deacon: {
    name: 'The Drowned Deacon', title: 'His Sermon Is the Tide', hp: 3700, poise: 999, speed: 2.8, r: 0.75, mass: 8, scale: 1.75, boss: true,
    look: { weapon: 'staff', orb: 0x40e0d0, hat: 'brim', eyes: 0x40ffe0, skirt: 0x1c3034, cloak: true, colors: { skin: 0x5a6a6a, tunic: 0x1e3236, pants: 0x162426, boots: 0x0c1414, cloak: 0x1a2c30, hat: 0x0e1a1c, glove: 0x2a3a3a }, bulk: 1.2 },
  },
  silence: {
    name: 'Saint Silence', title: 'The Hand That Stilled the Bell', hp: 6800, poise: 999, speed: 3.6, r: 0.7, mass: 8, scale: 1.7, boss: true,
    look: { weapon: 'bell', eyes: 0xf0f0ff, crown: 0xd8d0b0, crownGlow: true, cloak: true, mask: 0xd8d4cc, colors: { skin: 0xd8d4cc, tunic: 0xe8e4dc, pants: 0xc8c4bc, boots: 0x8a8680, cloak: 0xf0ece4, cloakDark: 0xc8c4bc, glove: 0xd8d4cc, shoulder: 0xd0ccc4 }, bulk: 1.15 },
  },
};

// District scaling: foes hit harder and last longer further in.
export function scaleFoe(def, tier) {
  const k = 1 + tier * 0.32; const kd = 1 + tier * 0.16;
  return { ...def, hp: Math.round(def.hp * k), dmgMul: kd, tier };
}

export const HERO_LOOK = {
  weapon: 'sword', cloak: true, cloakGlow: 0x2a0404, blade: 0xd8e0ea, guard: 0x8a7a58,
  colors: { skin: 0xd8b8a0, hair: 0xe8e4dc, tunic: 0x2a2228, pants: 0x1c1a20, boots: 0x14100e, cloak: 0x9e2226, cloakDark: 0x7c181c, glove: 0x2a2020, belt: 0x3a2a20 },
};
