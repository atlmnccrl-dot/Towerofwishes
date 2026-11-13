// The newer foes: their stats and looks (UNITS) and, where they behave differently from the common
// melee/ranged pattern in ai.js, their own behaviour (UNIT_AI[type](world, foe, dt); return false to
// fall back to the common behaviour). Pure logic, no DOM.
import { ATTACKS as A } from './defs.js';

const deg = (d) => (d * Math.PI) / 180;

// Stand-ins until each unit gets its full behaviour and body: valid stats so districts can place them.
export const UNITS = {
  hound: { name: 'Grave Hound', hp: 46, poise: 16, flinch: 2, speed: 5.4, r: 0.4, mass: 0.9, aggro: 13, keep: 2.6, attacks: [{ a: A.claw, w: 1, min: 1, max: 3.6 }], drop: 6, look: { weapon: 'none', claws: 0xd8d0c0, eyes: 0xff3020, noHair: true, colors: { skin: 0x3a3634, tunic: 0x2c2826, pants: 0x262220, boots: 0x3a3634, glove: 0x3a3634 }, bulk: 0.9 } },
  bomber: { name: 'Tallow Bomber', hp: 44, poise: 16, flinch: 2, speed: 2.6, r: 0.38, mass: 1, aggro: 14, keep: 7, ranged: true, attacks: [{ a: A.orb, w: 1, min: 3, max: 12 }], drop: 7, look: { weapon: 'none', offhand: 'lantern', hood: true, eyes: 0xffa030, colors: { skin: 0x4a4440, tunic: 0x4a3a2a, pants: 0x2a2420, boots: 0x161210, hood: 0x3a2e24, glove: 0x2a2420 } } },
  gargoyle: { name: 'Gargoyle', hp: 58, poise: 24, flinch: 1, speed: 3.6, r: 0.45, mass: 1.2, aggro: 14, keep: 3, hover: true, attacks: [{ a: A.claw, w: 1, min: 1, max: 3.4 }], drop: 9, look: { weapon: 'none', claws: 0x8a8a90, eyes: 0xff4030, horns: 0x5a5a62, colors: { skin: 0x5a5c64, tunic: 0x4a4c54, pants: 0x44464e, boots: 0x3a3c44, glove: 0x5a5c64 }, bulk: 1.1 } },
  shade: { name: 'Shade', hp: 50, poise: 20, flinch: 1, speed: 3.4, r: 0.38, mass: 0.8, aggro: 14, keep: 1.6, blink: true, attacks: [{ a: A.slash, w: 1, min: 0, max: 1.9 }], drop: 9, look: { weapon: 'saber', blade: 0x8090c0, bladeGlow: 0x203060, hood: true, eyes: 0x80a0ff, cloak: true, colors: { skin: 0x10121a, tunic: 0x0c0e14, pants: 0x0a0c12, boots: 0x08090c, cloak: 0x10121a, hood: 0x10121a, glove: 0x0c0e14 } } },
  chanter: { name: 'Chanter', hp: 48, poise: 18, flinch: 2, speed: 2.4, r: 0.38, mass: 1, aggro: 14, keep: 8, ranged: true, attacks: [{ a: A.orb, w: 1, min: 3, max: 12 }], drop: 10, look: { weapon: 'staff', orb: 0xe8d070, hood: true, eyes: 0xffe080, skirt: 0x5a4a30, colors: { skin: 0x4a4440, tunic: 0x6a5a3a, pants: 0x3a3022, boots: 0x161210, hood: 0x5a4a30, glove: 0x3a3022 } } },
  sentinel: { name: 'Bronze Sentinel', hp: 360, poise: 140, flinch: 0, speed: 1.8, r: 0.66, mass: 3.5, aggro: 12, keep: 2.2, armor: true, scale: 1.5, attacks: [{ a: A.slam, w: 1, min: 0, max: 3.2 }, { a: A.sweep, w: 1, min: 0, max: 2.7 }], drop: 26, look: { weapon: 'axe', blade: 0x9a7a40, eyes: 0xffa030, mask: 0x6a5228, bulk: 1.4, colors: { skin: 0x7a6030, tunic: 0x6a5228, pants: 0x5a4420, boots: 0x4a3818, shoulder: 0x8a6a38, glove: 0x6a5228 } } },
  rat: { name: 'Plague Rat', hp: 16, poise: 6, flinch: 1, speed: 5, r: 0.26, mass: 0.4, aggro: 12, keep: 1.0, scale: 0.55, attacks: [{ a: { ...A.claw, dmg: 5, range: 1.0, lunge: 6 }, w: 1, min: 0, max: 2.2 }], drop: 2, look: { weapon: 'none', claws: 0xc8b8a0, eyes: 0xff3020, noHair: true, colors: { skin: 0x4a4038, tunic: 0x3a322c, pants: 0x342c26, boots: 0x4a4038, glove: 0x4a4038 }, bulk: 0.8 } },
  spitter: { name: 'Mire Spitter', hp: 46, poise: 16, flinch: 2, speed: 2.6, r: 0.38, mass: 1, aggro: 14, keep: 6.5, ranged: true, attacks: [{ a: A.orbFan, w: 1, min: 3, max: 11 }], drop: 7, look: { weapon: 'none', claws: 0x8aa060, eyes: 0x90ff60, hood: true, colors: { skin: 0x3a4a34, tunic: 0x2a3a26, pants: 0x223020, boots: 0x161e14, hood: 0x2a3a26, glove: 0x3a4a34 } } },
  knight: { name: 'Pale Knight', hp: 150, poise: 60, flinch: 1, speed: 2.6, r: 0.44, mass: 1.8, aggro: 12, keep: 1.7, shield: true, attacks: [{ a: A.slash2, w: 2, min: 0, max: 1.9 }, { a: A.thrust, w: 1, min: 0, max: 2.6 }], drop: 16, look: { weapon: 'sword', offhand: 'shield', eyes: 0xf0f0ff, horns: 0xc8c4bc, colors: { skin: 0xc8c4bc, tunic: 0xb8b4ac, pants: 0x8a8680, boots: 0x6a6660, shoulder: 0xd8d4cc, glove: 0xa8a49c }, bulk: 1.15 } },
};

export const UNIT_AI = {};
