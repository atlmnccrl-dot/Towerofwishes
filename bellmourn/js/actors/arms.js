// Every weapon its own shape, and its own light in a fight; armor that changes the warden's outfit tier by tier.
// buildWeapon(rig, look) is called by Rig._dress when look.model names a weapon here (view.js puts the weapon's id
// in look.model): it builds the weapon in the right hand (and the twin in the left for knives) and returns true.
// WEAPON_FX[id]: trail colour, sparks shed while swinging, a slow aura while it is held.
// dressArmor(rig, look) adds the armor tier's pieces (look.armor = { tier, style }).
// Local frame: the weapon points along +Z from the fist, +Y is the back of the hand. Colours are hex.
// PROPOSAL: every shape and colour here.
import * as THREE from '../../vendor/three.module.min.js';

const BOX = new Map();
const box = (w, h, d) => { const k = w + ',' + h + ',' + d; if (!BOX.has(k)) BOX.set(k, new THREE.BoxGeometry(w, h, d)); return BOX.get(k); };
const CYL = new Map();
const cyl = (r0, r1, h, n = 8) => { const k = r0 + ',' + r1 + ',' + h + ',' + n; if (!CYL.has(k)) CYL.set(k, new THREE.CylinderGeometry(r0, r1, h, n)); return CYL.get(k); };

// a little kit over the rig: P(w, h, d, color, x, y, z, opts) adds a box to the group g on joint j
function kit(rig, j, g) {
  const P = (w, h, d, c, x, y, z, o = {}) => { const m = rig._part(j, box(w, h, d), c, x, y, z, o); g.add(m); return m; };
  const C = (r0, r1, h, c, x, y, z, o = {}) => { const m = rig._part(j, cyl(r0, r1, h, o.n || 8), c, x, y, z, o); g.add(m); return m; };
  const glow = (c, k = 2.4) => ({ glow: k, c });
  return { P, C, glow };
}
const E = (c, k = 2) => ({ emissive: c, ei: k });

// ------------------------------------------------------------------ the models
// each: (K, d) => { tip: [x, y, z], len, blade?, orb? }   K = kit(rig, 'haR', group)
const GRIP = 0x2a1e18, WOOD = 0x3a2a1e, DARKWOOD = 0x241a14, IRON = 0x5a5e66, STEEL = 0xc8d0da, BRASS = 0x9a8050, GOLD = 0xd8b048;
const M = {
  // ---------------- the Bell-Warden's blades
  wardenBlade: ({ P }) => {
    P(0.04, 0.04, 0.2, GRIP, 0, 0, 0); P(0.24, 0.04, 0.04, 0x8a7a58, 0, 0, 0.11); P(0.06, 0.06, 0.06, 0x8a7a58, 0, 0, -0.12);
    const b = P(0.05, 0.025, 1.05, 0xd8e0ea, 0, 0, 0.655, E(0x202830, 1)); return { tip: [0, 0, 1.18], len: 1.05, blade: b };
  },
  // a hangman's saber: a blade that curves back, a knuckle-bow, a red cord and a little noose at the pommel
  gallowsSaber: ({ P }) => {
    P(0.04, 0.04, 0.2, 0x3a1a14, 0, 0, 0); P(0.2, 0.035, 0.035, IRON, 0, 0, 0.11); P(0.03, 0.03, 0.22, IRON, 0.1, 0, 0.01); P(0.1, 0.03, 0.03, IRON, 0.05, 0, -0.1);
    let b; for (let i = 0; i < 5; i++) { const z = 0.2 + i * 0.19; b = P(0.055 - i * 0.004, 0.025, 0.2, 0xb8b0a8, 0, 0, z, { rx: -0.05 - i * 0.04, ...E(0x281010, 1) }); b.position.y = i * i * 0.008; }
    P(0.02, 0.1, 0.02, 0xa02020, 0, -0.06, -0.12); P(0.06, 0.06, 0.02, 0xa02020, 0, -0.13, -0.12);
    return { tip: [0, 0.14, 1.12], len: 1.0, blade: b };
  },
  // a flamberge of wax and fire: a waving blade, a candle for a pommel, a flame at the tip
  candleEdge: ({ P }) => {
    P(0.045, 0.045, 0.22, 0xe8dcc0, 0, 0, 0); P(0.3, 0.05, 0.05, 0x8a5a30, 0, 0, 0.12); for (const sx of [-1, 1]) P(0.04, 0.08, 0.04, 0xe8dcc0, sx * 0.15, 0.04, 0.12);
    let b; for (let i = 0; i < 6; i++) b = P(0.07, 0.025, 0.19, 0xffb060, (i % 2 ? 0.018 : -0.018), 0, 0.24 + i * 0.17, E(0x803010, 2.4));
    P(0.02, 0.03, 0.95, 0xfff0c0, 0, 0.012, 0.66, { glow: 2.4 });
    P(0.05, 0.08, 0.05, 0xffa030, 0, 0.02, 1.25, { glow: 3.2 }); P(0.03, 0.05, 0.03, 0xfff0a0, 0, 0.06, 1.25, { glow: 3.5 });
    P(0.06, 0.12, 0.06, 0xe8dcc0, 0, 0, -0.16); P(0.025, 0.05, 0.025, 0xffa030, 0, 0.07, -0.16, { glow: 3 });
    return { tip: [0, 0, 1.24], len: 1.1, blade: b };
  },
  // a broad sea cutlass, pale as ice, a scallop shell for a guard, a glowing edge
  tidecutter: ({ P }) => {
    P(0.045, 0.045, 0.2, 0x1a3a40, 0, 0, 0);
    for (let i = -2; i <= 2; i++) P(0.05, 0.03, 0.16 - Math.abs(i) * 0.03, 0xe0d8c8, i * 0.05, 0, 0.13, { ry: i * 0.25 });
    const b = P(0.11, 0.025, 0.8, 0x90e0e8, 0, 0, 0.6, E(0x104050, 2.2)); P(0.13, 0.025, 0.2, 0x90e0e8, 0.012, 0, 1.06, E(0x104050, 2.2));
    P(0.015, 0.03, 1.0, 0xc8f8ff, -0.06, 0, 0.68, { glow: 2.2 });
    P(0.04, 0.04, 0.04, 0xe0d8c8, 0.04, 0.03, 0.5); P(0.03, 0.03, 0.03, 0xe0d8c8, -0.03, 0.03, 0.78);
    return { tip: [0, 0, 1.17], len: 1.05, blade: b };
  },
  // bell-steel: a long white-gold blade with a lightning runnel, the guard two bronze wings, a little bell for a pommel
  bellsteel: ({ P, C }) => {
    P(0.05, 0.05, 0.28, 0x3a2a20, 0, 0, -0.02);
    for (const sx of [-1, 1]) { P(0.16, 0.05, 0.06, GOLD, sx * 0.1, 0, 0.13, { ry: sx * 0.3 }); P(0.08, 0.04, 0.05, GOLD, sx * 0.2, 0, 0.19, { ry: sx * 0.6 }); }
    const b = P(0.075, 0.03, 1.25, 0xf0e8c0, 0, 0, 0.8, E(0x504020, 2)); P(0.02, 0.035, 1.15, 0xc0e0ff, 0, 0, 0.78, { glow: 3 });
    P(0.04, 0.03, 0.08, 0xf0e8c0, 0, 0, 1.46, E(0x504020, 2));
    C(0.04, 0.08, 0.1, GOLD, 0, 0, -0.2, { rx: Math.PI / 2 });
    return { tip: [0, 0, 1.48], len: 1.35, blade: b };
  },

  // ---------------- the Huntress's crossbows (held like a gun; the bolt points along +Z)
  nightCrossbow: ({ P }) => {
    P(0.06, 0.08, 0.6, WOOD, 0, -0.04, 0.2); P(0.6, 0.04, 0.05, 0x1a1a1e, 0, -0.02, 0.42); P(0.58, 0.01, 0.01, 0x8a8a8a, 0, 0, 0.36);
    return { tip: [0, -0.04, 0.55], len: 0.6 };
  },
  // a whaler's harpoon bow: a heavy stock, a barbed harpoon loaded, a coil of rope under it
  harpoonBow: ({ P, C }) => {
    P(0.08, 0.1, 0.7, 0x4a3426, 0, -0.04, 0.22); P(0.7, 0.05, 0.06, 0x2a2420, 0, -0.01, 0.46);
    for (const sx of [-1, 1]) P(0.06, 0.08, 0.06, IRON, sx * 0.34, -0.01, 0.43);
    P(0.025, 0.025, 0.85, 0x8a8a8a, 0, 0.04, 0.5); P(0.08, 0.02, 0.1, STEEL, 0, 0.04, 0.95); for (const sx of [-1, 1]) P(0.03, 0.02, 0.07, STEEL, sx * 0.05, 0.04, 0.88, { ry: sx * 0.5 });
    C(0.08, 0.08, 0.08, 0xb89a68, 0, -0.14, 0.12, { rz: Math.PI / 2 });
    return { tip: [0, 0.04, 1.0], len: 0.9 };
  },
  // a repeater: a box of bolts on top, vents glowing like a stove
  emberRepeater: ({ P }) => {
    P(0.07, 0.09, 0.65, 0x3a2a20, 0, -0.04, 0.2); P(0.62, 0.04, 0.05, 0x2a1a14, 0, -0.02, 0.44);
    P(0.12, 0.16, 0.22, 0x4a3a2a, 0, 0.1, 0.3); P(0.13, 0.03, 0.24, BRASS, 0, 0.19, 0.3);
    for (let i = 0; i < 3; i++) P(0.135, 0.02, 0.03, 0xff7020, 0, 0.06 + i * 0.04, 0.42, { glow: 2.6 });
    P(0.04, 0.04, 0.08, 0xff8a30, 0, -0.02, 0.6, { glow: 2.4 });
    return { tip: [0, -0.02, 0.62], len: 0.62 };
  },
  // a storm arbalest: wide steel arms, copper coils, sparks waiting at the tips
  stormArbalest: ({ P }) => {
    P(0.08, 0.1, 0.72, 0x2a2a30, 0, -0.04, 0.24);
    for (const sx of [-1, 1]) { P(0.42, 0.05, 0.07, 0x7a8290, sx * 0.21, -0.01, 0.5, { ry: sx * 0.12 }); P(0.06, 0.08, 0.06, 0xc06a30, sx * 0.14, -0.01, 0.48); P(0.06, 0.08, 0.06, 0xc06a30, sx * 0.26, -0.01, 0.46); P(0.05, 0.05, 0.05, 0x9ad8ff, sx * 0.42, 0, 0.45, { glow: 3.2 }); }
    P(0.03, 0.03, 0.5, 0x9ad8ff, 0, 0.04, 0.5, { glow: 2.2 });
    return { tip: [0, 0.04, 0.78], len: 0.78 };
  },
  // a pale bone bow: long arched limbs of white, a string of light
  paleLongbow: ({ P }) => {
    P(0.06, 0.08, 0.62, 0xd8d0c0, 0, -0.04, 0.2);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) P(0.2, 0.04, 0.05, 0xe8e4d8, sx * (0.1 + i * 0.18), -0.01, 0.44 - i * i * 0.025, { ry: sx * (0.1 + i * 0.18) });
    P(1.3, 0.012, 0.012, 0xe0f0ff, 0, 0.01, 0.3, { glow: 2.4 }); P(0.03, 0.03, 0.4, 0xe0f0ff, 0, 0.03, 0.55, { glow: 2.2 });
    return { tip: [0, 0.03, 0.76], len: 0.76 };
  },

  // ---------------- the Bellbreaker's hammers
  ironMaul: ({ P }) => {
    P(0.06, 0.06, 1.25, WOOD, 0, 0, 0.42); const h = P(0.34, 0.3, 0.42, IRON, 0, 0, 1.08); P(0.36, 0.06, 0.44, 0x8a7a58, 0, 0.12, 1.08);
    return { tip: [0, 0, 1.25], len: 1.3, blade: h };
  },
  // an anchor for a hammer head, chain wound round the haft, rime on the iron
  anchorHammer: ({ P }) => {
    P(0.06, 0.06, 1.3, 0x2a3036, 0, 0, 0.44); for (let i = 0; i < 4; i++) P(0.09, 0.03, 0.05, 0x8a9298, 0, 0, 0.3 + i * 0.12);
    const h = P(0.16, 0.16, 0.5, 0x6a8090, 0, 0, 1.1, E(0x183040, 1.6));
    for (const sx of [-1, 1]) { P(0.26, 0.12, 0.14, 0x6a8090, sx * 0.17, 0, 1.24, { ry: sx * 0.6 }); P(0.1, 0.1, 0.16, 0x6a8090, sx * 0.3, 0, 1.12); P(0.06, 0.04, 0.06, 0xc8ecff, sx * 0.3, 0.06, 1.12, { glow: 2.4 }); }
    P(0.08, 0.12, 0.08, 0xc8ecff, 0, 0.1, 1.3, { glow: 2 });
    return { tip: [0, 0, 1.34], len: 1.35, blade: h };
  },
  // a knight-breaker: a spiked head, a pick on the back, dark steel and red leather
  knightBreaker: ({ P }) => {
    P(0.065, 0.065, 1.3, 0x1a1418, 0, 0, 0.44); P(0.08, 0.08, 0.3, 0x7a1a1a, 0, 0, 0.1);
    const h = P(0.3, 0.3, 0.3, 0x3a3e46, 0, 0, 1.1); P(0.32, 0.06, 0.32, 0x7a1a1a, 0, 0, 1.1);
    for (const [x, y] of [[0.18, 0], [-0.18, 0], [0, 0.18]]) P(x ? 0.12 : 0.06, y ? 0.12 : 0.06, 0.06, 0x8a8e96, x, y, 1.1);
    P(0.06, 0.06, 0.12, 0x8a8e96, 0, 0, 1.3); P(0.05, 0.3, 0.06, 0x8a8e96, 0, -0.26, 1.1, { rx: 0.2 });
    return { tip: [0, 0, 1.32], len: 1.35, blade: h };
  },
  // the Founder's maul: a crucible-heavy head of cooling bronze, molten light in its cracks
  founderMaul: ({ P }) => {
    P(0.07, 0.07, 1.35, 0x2a1a14, 0, 0, 0.46); P(0.1, 0.1, 0.08, BRASS, 0, 0, 0.82);
    const h = P(0.44, 0.38, 0.5, 0x5a3a24, 0, 0, 1.14, E(0x401000, 1.4));
    P(0.46, 0.04, 0.04, 0xff7a20, 0, 0.05, 1.14, { glow: 3 }); P(0.04, 0.4, 0.04, 0xff7a20, 0.1, 0, 1.39, { glow: 3 }); P(0.04, 0.04, 0.52, 0xff9a30, -0.23, -0.08, 1.14, { glow: 2.8 });
    P(0.3, 0.06, 0.3, 0xffa040, 0, 0.2, 1.14, { glow: 2.2 });
    return { tip: [0, 0, 1.4], len: 1.45, blade: h };
  },
  // a cathedral bell on a pole: gold, lightning in its mouth
  cathedralBell: ({ P, C }) => {
    P(0.07, 0.07, 1.4, 0x3a2a20, 0, 0, 0.46); P(0.1, 0.1, 0.1, GOLD, 0, 0, 1.1);
    const h = C(0.16, 0.32, 0.44, GOLD, 0, 0, 1.36, { rx: Math.PI / 2, ...E(0x403010, 1.4) }); C(0.33, 0.33, 0.04, 0xf0d070, 0, 0, 1.57, { rx: Math.PI / 2 });
    P(0.18, 0.18, 0.04, 0xc0e0ff, 0, 0, 1.6, { glow: 3.2 });
    return { tip: [0, 0, 1.6], len: 1.6, blade: h };
  },

  // ---------------- the Lamplighter's staves (the lantern stays in her left hand)
  lampStaff: ({ P }) => {
    P(0.05, 0.05, 1.6, 0x2a2018, 0, -0.05, 0.4); const o = P(0.12, 0.12, 0.12, 0xffb040, 0, -0.05, 1.22, { glow: 3 });
    return { tip: [0, -0.05, 1.25], len: 1.25, orb: o };
  },
  // a wick-rod: a twisted wax rod, a tall flame at its head, drips of wax
  wickRod: ({ P }) => {
    for (let i = 0; i < 8; i++) P(0.06, 0.06, 0.2, i % 2 ? 0xe8dcc0 : 0xc8b898, (i % 2 ? 0.01 : -0.01), -0.05, -0.2 + i * 0.19);
    P(0.1, 0.1, 0.08, 0xe8dcc0, 0, -0.05, 1.32); P(0.02, 0.06, 0.02, 0x1a1410, 0, -0.01, 1.38);
    const o = P(0.12, 0.2, 0.12, 0xff9020, 0, 0.08, 1.38, { glow: 3.2 }); P(0.06, 0.12, 0.06, 0xfff0a0, 0, 0.12, 1.38, { glow: 3.6 });
    for (const [z, y] of [[1.2, -0.11], [0.9, -0.1]]) P(0.04, 0.06, 0.04, 0xe8dcc0, 0.03, y, z);
    return { tip: [0, 0.1, 1.4], len: 1.4, orb: o };
  },
  // a tide censer: a hook-topped staff, a censer of cold fire swinging on a chain
  tideCenser: ({ P, C }) => {
    P(0.05, 0.05, 1.7, 0x2a3a40, 0, -0.05, 0.45); P(0.05, 0.05, 0.24, 0x8ab0b8, 0, 0.05, 1.3); P(0.05, 0.14, 0.05, 0x8ab0b8, 0, -0.02, 1.4);
    for (let i = 0; i < 3; i++) P(0.03, 0.06, 0.03, 0x8ab0b8, 0, -0.12 - i * 0.07, 1.4);
    const o = C(0.09, 0.07, 0.14, 0x6a8a90, 0, -0.38, 1.4); P(0.1, 0.06, 0.1, 0x80e8ff, 0, -0.3, 1.4, { glow: 3 });
    return { tip: [0, -0.3, 1.4], len: 1.4, orb: o };
  },
  // a bone scepter: vertebrae for a shaft, a skull at the head, green fire in its eyes
  boneScepter: ({ P }) => {
    for (let i = 0; i < 9; i++) { P(0.06, 0.06, 0.12, 0xd8d0b8, 0, -0.05, -0.2 + i * 0.17); P(0.1, 0.03, 0.04, 0xc8c0a8, 0, -0.05, -0.14 + i * 0.17); }
    const o = P(0.16, 0.16, 0.16, 0xe8e0c8, 0, -0.03, 1.32); P(0.12, 0.05, 0.1, 0xd8d0b8, 0, -0.1, 1.36);
    for (const sx of [-1, 1]) P(0.04, 0.04, 0.02, 0x70ff60, sx * 0.04, 0, 1.4, { glow: 3.4 });
    return { tip: [0, 0, 1.42], len: 1.42, orb: o };
  },
  // the Dawn Lantern: a gilt cage at the staff's head, a small sun inside it, its rays through the bars
  dawnLantern: ({ P }) => {
    P(0.055, 0.055, 1.7, 0x3a2a1a, 0, -0.05, 0.45); P(0.12, 0.12, 0.06, GOLD, 0, -0.05, 1.28);
    for (const [x, y] of [[0.1, 0.1], [-0.1, 0.1], [0.1, -0.1], [-0.1, -0.1]]) P(0.025, 0.025, 0.3, GOLD, x, y - 0.05, 1.45);
    P(0.24, 0.24, 0.04, GOLD, 0, -0.05, 1.6); const o = P(0.14, 0.14, 0.14, 0xfff0b0, 0, -0.05, 1.45, { glow: 4 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(0.02, 0.02, 0.12, 0xffe080, Math.cos(a) * 0.17, Math.sin(a) * 0.17 - 0.05, 1.45, { glow: 2.6 }); }
    return { tip: [0, -0.05, 1.5], len: 1.5, orb: o };
  },

  // ---------------- Kestrel's knives (a pair: twin: true builds the mirror in the left hand)
  cellKnives: ({ P }) => { P(0.04, 0.04, 0.14, 0x2a1a14, 0, 0, 0.02); P(0.12, 0.03, 0.03, 0x6a5a48, 0, 0, 0.09); const b = P(0.045, 0.02, 0.42, 0xd0d6dc, 0, 0.012, 0.31, E(0x202830, 1)); P(0.03, 0.02, 0.1, 0xd0d6dc, 0, 0.04, 0.53, { rx: -0.35 }); return { tip: [0, 0.04, 0.58], len: 0.6, blade: b, twin: true }; },
  // rusted shivs: ragged teeth, rag-wrapped grips
  rustShivs: ({ P }) => {
    P(0.05, 0.05, 0.16, 0x8a7a60, 0, 0, 0.02); P(0.06, 0.02, 0.02, 0x5a3a28, 0, 0.03, 0.0);
    const b = P(0.05, 0.02, 0.4, 0xa07858, 0, 0.012, 0.3, E(0x201008, 1)); for (let i = 0; i < 4; i++) P(0.025, 0.02, 0.04, 0xa07858, -0.035, 0.012, 0.16 + i * 0.09);
    return { tip: [0, 0.02, 0.52], len: 0.55, blade: b, twin: true };
  },
  // noose-cutters: hooked blades, a finger-ring at the pommel
  nooseCutters: ({ P }) => {
    P(0.04, 0.04, 0.14, 0x1a1414, 0, 0, 0.02); P(0.08, 0.08, 0.02, 0x8a8a90, 0, 0, -0.08);
    let b; for (let i = 0; i < 4; i++) { b = P(0.04, 0.02, 0.13, 0xe8e0c8, 0, 0.012, 0.15 + i * 0.11, { ry: 0.12 * i }); b.position.x = 0.012 * i * i; }
    P(0.02, 0.02, 0.06, 0xe8e0c8, 0.09, 0.012, 0.56, { ry: 1.2 });
    return { tip: [0.1, 0.01, 0.56], len: 0.58, blade: b, twin: true };
  },
  // moonlit fangs: two long crescents of pale blue, cold light along the edge
  moonFangs: ({ P }) => {
    P(0.04, 0.04, 0.14, 0x1a2a34, 0, 0, 0.02); P(0.1, 0.03, 0.03, 0x8ab0c8, 0, 0, 0.09);
    let b; for (let i = 0; i < 5; i++) { b = P(0.05, 0.02, 0.13, 0x9ce0f0, 0, 0.012, 0.15 + i * 0.11, { rx: -0.12 * i, ...E(0x104050, 2) }); b.position.y = 0.01 + i * i * 0.012; }
    P(0.012, 0.03, 0.55, 0xd0f8ff, -0.03, 0.06, 0.38, { glow: 2.4, rx: -0.22 });
    return { tip: [0, 0.32, 0.68], len: 0.75, blade: b, twin: true };
  },
  // the keys of the gallows: blades ground from great iron keys, a bow-ring for a pommel, teeth near the tip
  gallowsKeys: ({ P }) => {
    P(0.12, 0.12, 0.03, 0xf0d890, 0, 0, -0.06); P(0.06, 0.06, 0.035, 0x1a1410, 0, 0, -0.06);
    P(0.04, 0.04, 0.12, 0xb89a50, 0, 0, 0.04);
    const b = P(0.05, 0.03, 0.46, 0xf0d890, 0, 0.012, 0.33, E(0x504018, 2)); P(0.08, 0.03, 0.04, 0xf0d890, 0.04, 0.012, 0.46); P(0.06, 0.03, 0.04, 0xf0d890, 0.035, 0.012, 0.38);
    P(0.015, 0.035, 0.4, 0xc0e0ff, -0.02, 0.012, 0.33, { glow: 2.6 });
    return { tip: [0, 0.01, 0.58], len: 0.62, blade: b, twin: true };
  },

  // ---------------- Hollis's chain and anchor: links from the fist, a head at the end
  harbourAnchor: (K) => anchor(K, { col: 0x4a5a58, iron: 0x6a7274, barn: 0xd8d0b8 }),
  kelpChain: (K) => { const r = anchor(K, { col: 0x3a6a58, iron: 0x3a5a4a, small: true }); for (let i = 0; i < 4; i++) K.P(0.03, 0.18, 0.02, 0x4a8a50, (i % 2 ? 0.04 : -0.04), -0.08, 0.15 + i * 0.22, { rz: i % 2 ? 0.3 : -0.3 }); return r; },
  wreckAnchor: (K) => { const r = anchor(K, { col: 0x6a4a3a, iron: 0x5a4a40, big: true }); K.P(0.5, 0.06, 0.1, 0x5a4028, 0, 0.06, r.z0 + 0.12); K.P(0.4, 0.05, 0.08, 0x4a3420, 0.04, 0.12, r.z0 + 0.2, { ry: 0.2 }); return r; },
  // the Leviathan's hook: a great curved hook of bone at the chain's end
  leviathanHook: ({ P }) => {
    const links = 7, step = 0.14; for (let i = 0; i < links; i++) P(i % 2 ? 0.03 : 0.07, i % 2 ? 0.07 : 0.03, 0.12, 0x8a9a94, 0, 0, 0.06 + i * step);
    const z0 = 0.06 + links * step; P(0.14, 0.14, 0.1, 0xb8c8c0, 0, 0, z0);
    const b = P(0.11, 0.11, 0.5, 0xd8e0d8, 0, 0, z0 + 0.3); // the shank
    // the bend: a half circle from the shank's top over and down, then the barbed point
    const R = 0.2, cz = z0 + 0.55;
    for (let k = 0; k <= 6; k++) { const t = k / 6 * Math.PI; P(0.1 - k * 0.006, 0.1 - k * 0.006, 0.12, 0xd8e0d8, R - R * Math.cos(t), 0, cz + R * Math.sin(t), { ry: t }); }
    P(0.07, 0.07, 0.2, 0xe8f0e8, 2 * R, 0, cz - 0.1); P(0.05, 0.05, 0.12, 0xe8f0e8, 2 * R - 0.05, 0, cz - 0.16, { ry: -0.6 });
    P(0.05, 0.05, 0.05, 0x70ffb0, 0.02, 0.07, z0 + 0.3, { glow: 2.2 }); P(0.05, 0.05, 0.05, 0x70ffb0, 0.02, 0.07, z0 + 0.45, { glow: 2.2 });
    return { tip: [R, 0, cz + R], len: cz + R, blade: b };
  },
  stormAnchor: (K) => { const r = anchor(K, { col: 0x8ab0d0, iron: 0x6a7a8a, glow: 0x203850 }); K.P(0.03, 0.03, 0.66, 0x9ad8ff, 0, 0.06, r.z0 + 0.34, { glow: 3 }); for (const sx of [-1, 1]) K.P(0.06, 0.06, 0.06, 0x9ad8ff, sx * 0.3, 0, r.z0 + 0.58, { glow: 3.2 }); return r; },

  // ---------------- Mother Wren's forks
  choirFork: (K) => fork(K, { shaft: 0x5a4a64, metal: 0xd8dce8, orb: 0xb070ff }),
  // a cold psalm: frosted tines, icicles hanging from the yoke
  psalmStaff: (K) => { const r = fork(K, { shaft: 0x3a4a5a, metal: 0xc8ecff, orb: 0x80c8ff, glowMetal: true }); for (let i = -1; i <= 1; i++) K.P(0.03, 0.12, 0.03, 0xe0f8ff, i * 0.1, -0.13, 1.12, { glow: 1.6 }); return r; },
  // the requiem: black tines curling outwards like wings, a rose light between them
  requiemFork: ({ P }) => {
    P(0.05, 0.05, 1.5, 0x1a1420, 0, -0.05, 0.35); P(0.32, 0.05, 0.05, 0x2a2030, 0, -0.05, 1.12);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) P(0.05, 0.05, 0.16, 0x2a2030, sx * (0.14 + i * 0.03), -0.05, 1.2 + i * 0.13, { ry: sx * (0.2 + i * 0.15) });
    const o = P(0.12, 0.12, 0.12, 0xff70c0, 0, -0.05, 1.34, { glow: 3.2 }); P(0.05, 0.05, 0.3, 0xff70c0, 0, -0.05, 0.2, { glow: 1.6 });
    return { tip: [0, -0.05, 1.45], len: 1.45, orb: o };
  },
  // the bell-tongue fork: gold, small bells hanging from the yoke
  bellFork: (K) => { const r = fork(K, { shaft: 0x4a3a24, metal: GOLD, orb: 0xffd080 }); for (const sx of [-1, 0, 1]) K.C(0.025, 0.05, 0.07, 0xe8c060, sx * 0.13, -0.14, 1.12); return r; },
  // the last hymn: white-gold tines, a halo round them
  lastHymn: ({ P }) => {
    P(0.05, 0.05, 1.55, 0xe8e0d0, 0, -0.05, 0.36); P(0.32, 0.05, 0.05, 0xf0e8c8, 0, -0.05, 1.12);
    for (const sx of [-1, 1]) P(0.05, 0.05, 0.46, 0xfff8e0, sx * 0.13, -0.05, 1.36, E(0x605030, 2));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; P(0.04, 0.04, 0.04, 0xfff0b0, Math.cos(a) * 0.26, Math.sin(a) * 0.26 - 0.05, 1.42, { glow: 2.4 }); }
    const o = P(0.14, 0.14, 0.14, 0xffffff, 0, -0.05, 1.38, { glow: 3.6 });
    return { tip: [0, -0.05, 1.5], len: 1.5, orb: o };
  },
};

function anchor({ P }, o) {
  const links = o.big ? 6 : 7, step = 0.14; for (let i = 0; i < links; i++) P(i % 2 ? 0.03 : 0.07, i % 2 ? 0.07 : 0.03, 0.12, o.iron, 0, 0, 0.06 + i * step);
  const z0 = 0.06 + links * step; const s = o.big ? 1.3 : (o.small ? 0.8 : 1); const em = o.glow ? E(o.glow, 2) : {};
  P(0.12 * s, 0.12 * s, 0.08, o.col, 0, 0, z0); const b = P(0.09 * s, 0.09 * s, 0.62 * s, o.col, 0, 0, z0 + 0.34 * s, em); P(0.5 * s, 0.07 * s, 0.07 * s, o.col, 0, 0, z0 + 0.1);
  for (const sx of [-1, 1]) { P(0.3 * s, 0.08 * s, 0.08 * s, o.col, sx * 0.14 * s, 0, z0 + 0.66 * s, { ry: sx * 0.5, ...em }); P(0.12 * s, 0.06 * s, 0.14 * s, o.col, sx * 0.27 * s, 0, z0 + 0.56 * s, { ry: sx * 0.3 }); }
  if (o.barn) for (const [x, z] of [[0.05, 0.4], [-0.05, 0.62], [0.2, 0.68]]) P(0.06, 0.06, 0.06, o.barn, x, 0.04, z0 + z);
  return { tip: [0, 0, z0 + 0.7 * s], len: z0 + 0.7 * s, blade: b, z0 };
}
function fork({ P }, o) {
  P(0.05, 0.05, 1.5, o.shaft, 0, -0.05, 0.35); P(0.3, 0.05, 0.05, o.metal, 0, -0.05, 1.12, o.glowMetal ? E(0x204050, 2) : {});
  for (const sx of [-1, 1]) P(0.05, 0.05, 0.42, o.metal, sx * 0.13, -0.05, 1.34, o.glowMetal ? E(0x204050, 2) : {});
  const orb = P(0.12, 0.12, 0.12, o.orb, 0, -0.05, 1.34, { glow: 3 });
  return { tip: [0, -0.05, 1.4], len: 1.4, orb };
}

// build look.model's weapon on the rig; false when there is no such model (the rig's own shapes take over)
export function buildWeapon(rig, d) {
  const fn = M[d.model]; if (!fn) return false;
  rig.weapon = new THREE.Group(); rig.j.haR.add(rig.weapon); rig.weapon.position.set(0, -0.05, 0);
  rig.tip = new THREE.Object3D(); rig.weapon.add(rig.tip);
  const r = fn(kit(rig, 'haR', rig.weapon), d) || {};
  rig.tip.position.set(...(r.tip || [0, 0, 1])); rig.bladeLen = r.len || 1; if (r.blade) rig.blade = r.blade; if (r.orb) rig.orb = r.orb;
  if (r.twin) { // the pair: the same knife in the left fist
    const g = new THREE.Group(); g.position.set(0, -0.05, 0); rig.j.haL.add(g); rig.weaponL = g;
    const r2 = fn(kit(rig, 'haL', g), d) || {}; rig.tipL = new THREE.Object3D(); rig.tipL.position.set(...(r2.tip || [0, 0, 0.6])); g.add(rig.tipL);
  }
  return true;
}

// ------------------------------------------------------------------ what each weapon does to the light in a fight
// trail: the swing's ribbon (bright additive range); swing: sparks shed from the blade while it swings;
// aura: what drifts off it while held ({ c, rate, grav, size }); hit: the spark colour of its blows.
const F = (trail, swing, aura, hit) => ({ trail, swing, aura, hit: hit || swing || trail });
const FIRE = [3, 1.4, 0.35], FROST = [0.9, 2.2, 2.8], STORM = [2.4, 2.6, 3], BLOOD = [2.6, 0.35, 0.3], GOLDL = [3, 2.5, 1.2], GREEN = [0.7, 2.6, 0.8], ROSE = [2.8, 0.9, 2.0], WHITE = [2.8, 2.8, 2.8], VIOLET = [1.7, 0.9, 2.8];
export const WEAPON_FX = {
  wardenBlade: F([2.4, 2.3, 2.5]),
  gallowsSaber: F([2.6, 1.1, 1.0], BLOOD, null),
  candleEdge: F([3, 1.6, 0.5], FIRE, { c: FIRE, rate: 10, grav: -1.2, size: 1 }),
  tidecutter: F([1.2, 2.4, 2.8], FROST, { c: [1.4, 2.2, 2.6], rate: 6, grav: 0.4, size: 1 }),
  bellsteel: F([2.9, 2.7, 2.0], STORM, { c: STORM, rate: 5, grav: 0, size: 1 }, STORM),
  nightCrossbow: F([2.2, 2.2, 2.4]),
  harpoonBow: F([2.4, 2.4, 2.4], WHITE),
  emberRepeater: F(FIRE, FIRE, { c: FIRE, rate: 6, grav: -1, size: 1 }),
  stormArbalest: F(STORM, STORM, { c: STORM, rate: 7, grav: 0, size: 1 }),
  paleLongbow: F(WHITE, WHITE, { c: [2.4, 2.6, 2.8], rate: 4, grav: -0.3, size: 1 }),
  ironMaul: F([2.2, 2.1, 2.0]),
  anchorHammer: F(FROST, FROST, { c: [1.4, 2.2, 2.6], rate: 5, grav: 0.5, size: 1 }),
  knightBreaker: F([2.6, 0.8, 0.7], BLOOD),
  founderMaul: F(FIRE, FIRE, { c: FIRE, rate: 12, grav: -1.4, size: 1 }),
  cathedralBell: F(GOLDL, STORM, { c: GOLDL, rate: 6, grav: -0.2, size: 1 }, STORM),
  lampStaff: F([3, 2.0, 0.8]),
  wickRod: F(FIRE, FIRE, { c: FIRE, rate: 12, grav: -1.4, size: 1 }),
  tideCenser: F(FROST, FROST, { c: [1.2, 2.2, 2.6], rate: 8, grav: -0.4, size: 1 }),
  boneScepter: F(GREEN, GREEN, { c: GREEN, rate: 6, grav: -0.6, size: 1 }),
  dawnLantern: F(GOLDL, GOLDL, { c: GOLDL, rate: 12, grav: -0.5, size: 1 }),
  cellKnives: F([2.6, 2.4, 2.4]),
  rustShivs: F([2.4, 1.2, 0.8], BLOOD),
  nooseCutters: F([2.8, 2.7, 2.4], WHITE),
  moonFangs: F(FROST, FROST, { c: [1.6, 2.3, 2.8], rate: 5, grav: 0.3, size: 1 }),
  gallowsKeys: F(GOLDL, STORM, { c: GOLDL, rate: 4, grav: 0, size: 1 }, STORM),
  harbourAnchor: F([0.7, 2.0, 1.8]),
  kelpChain: F([0.6, 2.2, 1.2], FROST, { c: [0.6, 1.8, 1.0], rate: 3, grav: 0.6, size: 1 }),
  wreckAnchor: F([2.2, 1.6, 1.2], [2.0, 1.4, 0.9]),
  leviathanHook: F([0.8, 2.6, 1.8], GREEN, { c: [0.8, 2.4, 1.6], rate: 4, grav: -0.3, size: 1 }),
  stormAnchor: F(STORM, STORM, { c: STORM, rate: 8, grav: 0, size: 1 }),
  choirFork: F(VIOLET),
  psalmStaff: F(FROST, FROST, { c: FROST, rate: 6, grav: 0.3, size: 1 }),
  requiemFork: F(ROSE, ROSE, { c: ROSE, rate: 6, grav: -0.5, size: 1 }),
  bellFork: F(GOLDL, GOLDL, { c: GOLDL, rate: 5, grav: -0.4, size: 1 }),
  lastHymn: F(WHITE, GOLDL, { c: [3, 2.8, 2.2], rate: 10, grav: -0.6, size: 1 }),
};

// ------------------------------------------------------------------ armor: four tiers over the warden's own clothes
// style: the class's metals and cut (heavy plate, leathers, robes). Each tier adds to the one below:
// 1 shoulder guards and bracers; 2 a breastplate or jerkin and greaves; 3 a helm or cowl, a gorget, a belt of
// plates; 4 the full harness, glowing trim, a tabard. look.armor = { tier, style: ARMOR_STYLE[hero] }.
export const ARMOR_STYLE = {
  warden: { metal: 0x8a8e98, dark: 0x3a3a44, trim: 0xb8962a, cloth: 0x6a1418, glow: 0xff3030, heavy: 1, helm: 'crest' },
  huntress: { metal: 0x5a4a38, dark: 0x2a2a24, trim: 0x7aa898, cloth: 0x2f6456, glow: 0x70ffd0, heavy: 0, helm: 'cowl' },
  bellbreaker: { metal: 0x6a6a72, dark: 0x2a2a30, trim: 0xb07a3a, cloth: 0x5a3018, glow: 0xff8a30, heavy: 2, helm: 'pot' },
  lamplighter: { metal: 0x9a8a6a, dark: 0x3a3a40, trim: 0xd8b060, cloth: 0xd8d4cc, glow: 0xffc060, heavy: 0, helm: 'veil' },
  kestrel: { metal: 0x4a4a50, dark: 0x1a1a1e, trim: 0x8a2020, cloth: 0x2a2a30, glow: 0xff5050, heavy: 0, helm: 'mask' },
  hollis: { metal: 0x5a6a6a, dark: 0x2a3434, trim: 0x3e7a62, cloth: 0x2a4a52, glow: 0x60e0c0, heavy: 1, helm: 'diver' },
  wren: { metal: 0xb8b0c8, dark: 0x3a3048, trim: 0xd8c890, cloth: 0xe8e0f0, glow: 0xc090ff, heavy: 0, helm: 'mitre' },
};
export function dressArmor(rig, d) {
  const A = d.armor; if (!A || !A.tier) return; const S = A.style || ARMOR_STYLE.warden; const t = A.tier; const bulk = d.bulk || 1;
  const P = (j, w, h, dd, c, x, y, z, o) => rig._part(j, box(w, h, dd), c, x, y, z, o);
  const tw = 0.36 * bulk, td = 0.22 * bulk, aw = 0.1 * bulk, lw = 0.13 * bulk, hs = d.headSize || 0.24;
  const heavy = S.heavy, m = heavy ? S.metal : S.dark;
  // 1: shoulder guards (plates for the heavy, leather caps for the light) and bracers
  for (const sd of ['L', 'R']) {
    const sx = sd === 'L' ? 1 : -1;
    P('sh' + sd, aw * (heavy ? 1.9 : 1.5), heavy ? 0.1 : 0.06, aw * (heavy ? 1.9 : 1.6), m, sx * 0.02, 0.04, 0);
    if (heavy) P('sh' + sd, aw * 1.7, 0.05, aw * 1.7, S.trim, sx * 0.02, 0.1, 0);
    P('el' + sd, aw * 1.08, 0.14, aw * 1.08, t >= 2 ? S.metal : S.dark, 0, -0.16, 0);
  }
  if (t >= 2) { // a breastplate (or a studded jerkin) and greaves
    P('chest', tw * 1.06, 0.3, td * 1.12, heavy ? S.metal : S.dark, 0, 0.12, 0);
    if (heavy) { P('chest', tw * 0.5, 0.2, 0.03, S.metal, 0, 0.12, td * 0.58); P('chest', 0.04, 0.26, 0.03, S.trim, 0, 0.12, td * 0.6); }
    else for (const [x, y] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, 0.06], [0.08, 0.06]]) P('chest', 0.03, 0.03, 0.02, S.trim, x, y, td * 0.58);
    for (const sd of ['L', 'R']) P('kn' + sd, lw * 1.12, 0.22, lw * 1.12, heavy ? S.metal : S.dark, 0, -0.14, 0.01);
  }
  if (t >= 3) { // the helm, the gorget, a belt of plates
    P('chest', tw * 0.7, 0.07, td * 0.9, S.trim, 0, 0.3, 0);
    P('spine', tw * 1.02, 0.08, td * 1.1, S.dark, 0, 0.02, 0); for (const x of [-0.1, 0, 0.1]) P('spine', 0.08, 0.1, 0.03, heavy ? S.metal : S.trim, x, -0.04, td * 0.56);
    if (!d.noHead) {
      const H = S.helm;
      if (H === 'crest') { P('head', hs + 0.06, hs * 0.55, hs + 0.06, S.metal, 0, hs * 0.86, 0); P('head', 0.05, 0.12, hs + 0.1, S.cloth, 0, hs * 1.2, -0.02); P('head', hs * 0.8, 0.04, 0.03, S.dark, 0, hs * 0.66, hs / 2 + 0.04); }
      else if (H === 'pot') { P('head', hs + 0.1, hs * 0.5, hs + 0.1, S.metal, 0, hs * 0.92, 0); P('head', hs + 0.2, 0.04, hs + 0.2, S.metal, 0, hs * 0.68, 0); }
      else if (H === 'cowl') { P('head', hs + 0.08, hs * 0.7, hs + 0.08, S.cloth, 0, hs * 0.75, -0.03); P('head', hs * 0.9, hs * 0.3, 0.03, S.dark, 0, hs * 0.3, hs / 2 + 0.03); }
      else if (H === 'veil') { P('head', hs + 0.06, 0.05, hs + 0.06, S.trim, 0, hs * 1.02, 0); P('head', hs + 0.1, hs * 0.8, 0.03, S.cloth, 0, hs * 0.6, -hs / 2 - 0.04); }
      else if (H === 'mask') { P('head', hs * 0.92, hs * 0.42, 0.04, S.metal, 0, hs * 0.3, hs / 2 + 0.03); P('head', 0.06, 0.04, 0.02, S.glow, hs * 0.22, hs * 0.55, hs / 2 + 0.05, { glow: 2.4 }); }
      else if (H === 'diver') { P('head', hs + 0.1, hs + 0.08, hs + 0.1, S.metal, 0, hs / 2 + 0.02, 0); P('head', hs * 0.5, hs * 0.4, 0.03, 0x1a3a40, 0, hs * 0.55, hs / 2 + 0.07); P('head', hs * 0.56, 0.03, 0.03, S.trim, 0, hs * 0.78, hs / 2 + 0.07); }
      else if (H === 'mitre') { P('head', hs * 0.8, hs * 0.7, hs * 0.5, S.cloth, 0, hs * 1.25, 0); P('head', 0.04, hs * 0.6, 0.02, S.trim, 0, hs * 1.25, hs * 0.26); }
    }
  }
  if (t >= 4) { // the full harness: glowing trim along it, a tabard to the knee, gauntlets
    P('chest', tw * 1.1, 0.025, td * 1.16, S.glow, 0, 0.27, 0, { glow: 2.2 });
    P('hips', tw * 0.5, 0.42, 0.03, S.cloth, 0, -0.2, td * 0.55); P('hips', tw * 0.5, 0.42, 0.03, S.cloth, 0, -0.2, -td * 0.55); P('hips', tw * 0.12, 0.06, 0.035, S.trim, 0, -0.06, td * 0.56);
    for (const sd of ['L', 'R']) { P('ha' + sd, aw * 1.05, 0.1, aw * 1.05, S.metal, 0, -0.03, 0); P('sh' + sd, aw * 1.6, 0.02, aw * 1.6, S.glow, 0, 0.11 + (heavy ? 0.02 : 0), 0, { glow: 2.2 }); }
  }
}
