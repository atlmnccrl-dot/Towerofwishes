// The playable wardens, their abilities and ultimates, the weapons and relics, elite foe affixes and the
// growth curves. Pure data and pure functions (no DOM).

const deg = (d) => (d * Math.PI) / 180;

// ------------------------------------------------------------------ heroes
// attack.kind 'combo': melee chain (each step like a foe attack: windup/active/dur/range/arc...).
// attack.kind 'shoot': a projectile at the soft-locked target every `rate` seconds while attack is held.
export const HEROES = {
  warden: {
    id: 'warden', name: 'CARMINE', title: 'THE BELL-WARDEN', weapon: 'blade', hp: 110, speed: 6.2,
    blurb: 'A SWORD AND A RED CLOAK. FAST COMBOS, A WAVE OF STEEL, A RUSH THROUGH THE PACK.',
    rating: { power: 3, range: 2, speed: 3, guard: 3 },
    attack: {
      kind: 'combo',
      combo: [
        { name: 'L1', anim: 'slash1', dur: 0.4, windup: 0.09, active: 0.17, cancel: 0.2, range: 2.05, arc: deg(150), dmg: 12, poise: 12, kb: 2.5, lunge: 4.2 },
        { name: 'L2', anim: 'slash2', dur: 0.42, windup: 0.09, active: 0.17, cancel: 0.2, range: 2.05, arc: deg(150), dmg: 13, poise: 12, kb: 2.5, lunge: 4.2 },
        { name: 'L3', anim: 'slash3', dur: 0.62, windup: 0.16, active: 0.27, cancel: 0.34, range: 2.4, arc: deg(250), dmg: 22, poise: 30, kb: 7, lunge: 5.5, heavy: true },
      ],
      dashAttack: { name: 'DA', anim: 'thrust', dur: 0.42, windup: 0.06, active: 0.2, cancel: 0.28, range: 2.6, width: 1.0, shape: 'line', dmg: 16, poise: 18, kb: 4, lunge: 11 },
    },
    abilities: ['wave', 'rush', 'whirl'], ult: 'requiem',
    look: { weapon: 'sword', cloak: true, cloakGlow: 0x2a0404, blade: 0xd8e0ea, guard: 0x8a7a58, colors: { skin: 0xd8b8a0, hair: 0xe8e4dc, tunic: 0x2a2228, pants: 0x1c1a20, boots: 0x14100e, cloak: 0x9e2226, cloakDark: 0x7c181c, glove: 0x2a2020, belt: 0x3a2a20 } },
  },
  huntress: {
    id: 'huntress', name: 'VESPER', title: 'THE NIGHT HUNTRESS', weapon: 'bow', hp: 90, speed: 6.7,
    blurb: 'A CROSSBOW FROM THE ROOFTOPS. HOLD ATTACK TO SHOOT. VOLLEYS, SMOKE AND SNARES.',
    rating: { power: 2, range: 5, speed: 4, guard: 1 },
    attack: { kind: 'shoot', anim: 'aim', rate: 0.27, proj: { kind: 'hbolt', speed: 22, r: 0.22, life: 0.62, dmg: 9, poise: 6 } },
    abilities: ['volley', 'smoke', 'snare'], ult: 'rain',
    look: { weapon: 'crossbow', hood: true, cloak: true, cloakLen: [0.3, 0.3, 0.26], colors: { skin: 0xc89a80, hair: 0x1a1414, tunic: 0x2a4a44, pants: 0x1e2a26, boots: 0x141814, cloak: 0x2f6456, cloakDark: 0x224a40, hood: 0x2f6456, glove: 0x2a2420, belt: 0x4a3a24 } },
  },
  bellbreaker: {
    id: 'bellbreaker', name: 'BRAM', title: 'THE BELLBREAKER', weapon: 'hammer', hp: 135, speed: 5.5, armor: 0.1,
    blurb: 'A FOUNDRY HAMMER AND IRON SKIN. SLOW, HUGE BLOWS THAT SCATTER THE CROWD.',
    rating: { power: 5, range: 2, speed: 1, guard: 5 },
    attack: {
      kind: 'combo',
      combo: [
        { name: 'B1', anim: 'hsmash1', dur: 0.66, windup: 0.22, active: 0.32, cancel: 0.4, range: 2.5, arc: deg(170), dmg: 22, poise: 30, kb: 6, lunge: 3, heavy: true },
        { name: 'B2', anim: 'hsmash2', dur: 0.9, windup: 0.34, active: 0.46, cancel: 0.6, range: 2.7, arc: deg(220), dmg: 31, poise: 44, kb: 9, lunge: 3.5, heavy: true, quake: 2.2 },
      ],
      dashAttack: { name: 'BDA', anim: 'hsmash1', dur: 0.6, windup: 0.14, active: 0.26, cancel: 0.36, range: 2.4, arc: deg(200), dmg: 26, poise: 40, kb: 8, lunge: 9, heavy: true },
    },
    abilities: ['shockwave', 'charge', 'ward'], ult: 'toll',
    look: { weapon: 'hammer', bulk: 1.28, colors: { skin: 0xb88a70, hair: 0x6a4428, tunic: 0x6a4a30, pants: 0x342a22, boots: 0x1a1412, shoulder: 0x8a8a94, glove: 0x3a3028, belt: 0x5a4028 } },
  },
  lamplighter: {
    id: 'lamplighter', name: 'SISTER ASH', title: 'THE LAMPLIGHTER', weapon: 'focus', hp: 95, speed: 6.0, unlock: 'market',
    blurb: 'SHE KEEPS THE LAST LAMPS LIT. FIRE AT RANGE, PILLARS OF FLAME, A LANTERN THAT HEALS.',
    rating: { power: 4, range: 4, speed: 2, guard: 2 },
    attack: { kind: 'shoot', anim: 'cast', rate: 0.42, proj: { kind: 'hfire', speed: 13, r: 0.3, life: 0.9, dmg: 11, poise: 8, status: { burn: 0.25 } } },
    abilities: ['pillar', 'lantern', 'wisps'], ult: 'sunburst',
    look: { weapon: 'staff', orb: 0xffb040, offhand: 'lantern', hood: true, skirt: 0x3a3a40, colors: { skin: 0xd8b8a0, hair: 0xd8d4cc, tunic: 0x4a4a52, pants: 0x2a2a30, boots: 0x18181c, hood: 0xd8d4cc, glove: 0x3a3a40 } },
  },
  // ---- the three who join later (STORY_BIBLE.md). PROPOSAL: names, titles, blurbs, abilities and weapons.
  kestrel: {
    id: 'kestrel', name: 'KESTREL', title: "THE GAOLER'S DAUGHTER", weapon: 'knives', hp: 88, speed: 7.0, unlock: 'gate',
    blurb: "TWIN KNIVES FROM HER FATHER'S GAOL. THE FASTEST CUTS IN THE CITY, AND EVERY WOUND BLEEDS.", // PROPOSAL
    rating: { power: 2, range: 1, speed: 5, guard: 2 },
    attack: {
      kind: 'combo', trait: { bleed: 0.3 }, // her basic cuts may bleed, whatever knives she holds
      combo: [
        { name: 'K1', anim: 'kslash1', dur: 0.3, windup: 0.05, active: 0.13, cancel: 0.17, range: 1.85, arc: deg(140), dmg: 8, poise: 7, kb: 1.2, lunge: 4.6 },
        { name: 'K2', anim: 'kslash2', dur: 0.3, windup: 0.05, active: 0.13, cancel: 0.17, range: 1.85, arc: deg(140), dmg: 8, poise: 7, kb: 1.2, lunge: 4.6 },
        { name: 'K3', anim: 'kslash1', dur: 0.3, windup: 0.05, active: 0.13, cancel: 0.17, range: 1.85, arc: deg(140), dmg: 9, poise: 8, kb: 1.4, lunge: 4.6 },
        { name: 'K4', anim: 'kcross', dur: 0.5, windup: 0.1, active: 0.22, cancel: 0.28, range: 2.15, arc: deg(230), dmg: 16, poise: 24, kb: 4.5, lunge: 5.5, heavy: true },
      ],
      dashAttack: { name: 'KDA', anim: 'kstab', dur: 0.36, windup: 0.05, active: 0.18, cancel: 0.24, range: 2.5, width: 1.0, shape: 'line', dmg: 13, poise: 14, kb: 3, lunge: 12 },
    },
    abilities: ['knives', 'shadow', 'gallows'], ult: 'cutstorm',
    look: { weapon: 'knife', offhand: 'knife', bulk: 0.92, scarf: true, cloak: true, cloakLen: [0.2, 0.2, 0.16], cloakW: [0.13, 0.11, 0.09], blade: 0xd0d6dc,
      colors: { skin: 0xe0c4b0, hair: 0xcfc8bc, tunic: 0x2c2224, pants: 0x1c1618, boots: 0x120e0e, cloak: 0xb01c24, cloakDark: 0x8a141a, glove: 0x2a1e1a, belt: 0x4a3020, trim: 0x46302a, shoulder: 0x3a2a28 } },
  },
  hollis: {
    id: 'hollis', name: 'HOLLIS', title: 'THE DROWNED BELLMAN', weapon: 'chain', hp: 140, speed: 5.5, armor: 0.1, unlock: 'docks',
    blurb: 'AN ANCHOR ON A CHAIN. WIDE SWEEPS THAT DRAG THE PACK IN, AND A BELL THAT FLOODS THE STREET.', // PROPOSAL
    rating: { power: 4, range: 4, speed: 1, guard: 4 },
    attack: {
      kind: 'combo',
      combo: [
        { name: 'A1', anim: 'asweep1', dur: 0.6, windup: 0.18, active: 0.32, cancel: 0.38, range: 3.3, arc: deg(210), dmg: 20, poise: 20, kb: 2, lunge: 1.4, pull: 1.2 },
        { name: 'A2', anim: 'asweep2', dur: 0.6, windup: 0.18, active: 0.32, cancel: 0.38, range: 3.3, arc: deg(210), dmg: 20, poise: 20, kb: 2, lunge: 1.4, pull: 1.2 },
        { name: 'A3', anim: 'aslam', dur: 0.86, windup: 0.32, active: 0.44, cancel: 0.56, range: 3.8, shape: 'line', width: 1.6, dmg: 34, poise: 42, kb: 5, lunge: 1.8, heavy: true, quake: 1.9, quakeAt: 2.8, quakeKind: 'splash' },
      ],
      dashAttack: { name: 'ADA', anim: 'asweep1', dur: 0.62, windup: 0.18, active: 0.32, cancel: 0.42, range: 3.2, arc: deg(220), dmg: 22, poise: 30, kb: 5, lunge: 8, heavy: true },
    },
    abilities: ['undertow', 'tidetoll', 'barnacle'], ult: 'floodbell',
    look: { weapon: 'anchor', bulk: 1.18, longHair: true, eyes: 0x2a6ad0, backBell: true, barnacles: 0xc8c2a8, blade: 0x8a9a96,
      colors: { skin: 0x98aca6, hair: 0x22382f, tunic: 0x2e5a50, pants: 0x1e3a34, boots: 0x14201c, shoulder: 0x3a6a5c, sleeve: 0x2a4e46, glove: 0x23302c, belt: 0x4a3a24, trim: 0x6a8a70 } },
  },
  wren: {
    id: 'wren', name: 'MOTHER WREN', title: 'THE CHOIR-WITCH', weapon: 'hymn', hp: 90, speed: 5.9, unlock: 'nave',
    blurb: 'A STAFF THAT SINGS. HOLD ATTACK: STRUCK FOES RESONATE AND TAKE MORE HURT. HYMNS THAT SHATTER.', // PROPOSAL
    rating: { power: 3, range: 4, speed: 2, guard: 2 },
    attack: { kind: 'shoot', anim: 'chant', rate: 0.36, proj: { kind: 'note', speed: 15, r: 0.3, life: 0.8, dmg: 9, poise: 6, resonate: 1 } },
    abilities: ['shatter', 'lullaby', 'echo'], ult: 'lastchoir',
    look: { weapon: 'fork', orb: 0xb070ff, scale: 1.08, skirt: 0x4a3462, longHair: true, ruff: 0xb8b0a6,
      colors: { skin: 0xd8c0b0, hair: 0x8e8894, tunic: 0x5c5866, pants: 0x3a3442, boots: 0x18141c, sleeve: 0x4a3462, glove: 0x3a3442, belt: 0x6a4a8a, trim: 0x8a5ab8 } },
  },
};
export const HERO_ORDER = ['warden', 'huntress', 'bellbreaker', 'lamplighter', 'kestrel', 'hollis', 'wren'];
// who walks with you from the first night, and where the others join (the district whose boss frees them)
export const START_HEROES = ['warden', 'huntress', 'bellbreaker'];
export const JOINS = { lamplighter: 'LANTERN ROW', kestrel: 'GALLOWS GATE', hollis: 'MIREWATER DOCKS', wren: 'THE DROWNED NAVE' };

// ------------------------------------------------------------------ abilities (two slots, the third unlocks at level 4)
// move: true marks an ability that carries the hero somewhere (a rush, a charge, a leap, a blink). Those never go
// off from the attack: the DASH button casts them (sim.js), aimed like the dash, while one is slotted and ready.
export const ABILITIES = {
  wave: { name: 'CRIMSON WAVE', kind: 'wave', cd: 5, dmg: 24, desc: 'A CRESCENT OF RED STEEL CUTS THROUGH EVERYTHING AHEAD.' },
  rush: { name: 'CUTTING RUSH', kind: 'rush', move: true, cd: 6, dmg: 32, dist: 6.5, desc: 'ON THE DASH: RUSH THROUGH THE PACK, CUTTING ALL IN YOUR PATH.' },
  whirl: { name: 'WHIRL OF THORNS', kind: 'whirl', cd: 9, dmg: 14, hits: 3, radius: 2.9, status: { bleed: 1 }, level: 4, desc: 'SPIN THREE TIMES. FOES AROUND YOU BLEED.' },
  volley: { name: 'VOLLEY', kind: 'volley', cd: 5, dmg: 10, n: 7, spread: deg(9), desc: 'A FAN OF SEVEN BOLTS.' },
  smoke: { name: 'SMOKE STEP', kind: 'smoke', move: true, cd: 7, dmg: 22, dist: 5, radius: 2.5, stun: 1.3, desc: 'ON THE DASH: LEAP AWAY AND LEAVE A BOMB THAT STUNS.' },
  snare: { name: 'SNARE TRAP', kind: 'trap', cd: 10, dmg: 26, radius: 1.9, root: 2.4, life: 10, level: 4, desc: 'A TRAP THAT HOLDS AND CUTS WHAT STEPS IN IT.' },
  shockwave: { name: 'SHOCKWAVE', kind: 'shock', cd: 6, dmg: 28, r1: 6, desc: 'SLAM THE STONES: A RING OF FORCE ROLLS OUT.' },
  charge: { name: 'IRON CHARGE', kind: 'charge', move: true, cd: 8, dmg: 20, dist: 7, slam: 30, radius: 2.4, desc: 'ON THE DASH: CHARGE, BATTER ASIDE ALL IN THE WAY, SLAM.' },
  ward: { name: 'BELL WARD', kind: 'ward', cd: 14, dur: 4.5, reduce: 0.5, dmg: 11, radius: 2.7, level: 4, desc: 'HALF DAMAGE FOR A WHILE; THE BELL BURNS ALL AROUND.' },
  pillar: { name: 'FLAME PILLAR', kind: 'pillar', cd: 5, dmg: 36, radius: 1.9, delay: 0.5, status: { burn: 1 }, desc: 'FIRE ERUPTS UNDER THE NEAREST FOE.' },
  lantern: { name: 'LANTERN WARD', kind: 'lantern', cd: 13, heal: 0.12, dur: 3.5, dmg: 9, radius: 2.6, desc: 'HEAL, AND BURN WHAT COMES CLOSE.' },
  wisps: { name: "WILL-O'-WISPS", kind: 'wisps', cd: 12, dmg: 24, n: 3, level: 4, desc: 'THREE WISPS HUNT DOWN THE NEAREST FOES.' },
  // Kestrel (PROPOSAL: names and lines)
  knives: { name: 'FAN OF KNIVES', short: 'FAN', kind: 'fan', cd: 5, dmg: 10, n: 5, spread: deg(12), status: { bleed: 0.6 }, desc: 'FIVE KNIVES IN A FAN. THEY CUT DEEP: FOES BLEED.' },
  shadow: { name: 'SHADOW STEP', short: 'SHD', kind: 'shadow', move: true, cd: 7, dmg: 30, range: 8, status: { bleed: 1 }, desc: 'ON THE DASH: VANISH, AND STRIKE FROM BEHIND THE FOE YOU DASH AT.' },
  gallows: { name: 'GALLOWS SNARE', short: 'NSE', kind: 'noose', cd: 10, dmg: 18, radius: 2.2, root: 2.2, range: 9, level: 4, desc: 'A NOOSE FLIES OUT AND HOLDS EVERY FOE IN THE KNOT.' },
  // Hollis
  undertow: { name: 'UNDERTOW', short: 'UND', kind: 'undertow', cd: 6, dmg: 20, range: 8, radius: 2.6, desc: 'HURL THE ANCHOR: IT DRAGS EVERY FOE AROUND IT BACK TO YOU.' },
  tidetoll: { name: 'TIDAL TOLL', short: 'TDE', kind: 'tide', cd: 7, dmg: 26, status: { frost: 1 }, desc: 'A WALL OF BLACK WATER ROLLS OUT AND CHILLS WHAT IT HITS.' },
  barnacle: { name: 'BARNACLE GUARD', short: 'BRN', kind: 'barnacle', cd: 14, dur: 5, reduce: 0.4, dmg: 14, level: 4, desc: 'SHELLS CLOSE OVER HIM: LESS HURT, AND WHAT STRIKES HIM IS CUT.' },
  // Mother Wren
  shatter: { name: 'HYMN OF SHATTERING', short: 'HYM', kind: 'shatter', cd: 5, dmg: 22, radius: 2.3, delay: 0.35, per: 10, desc: 'A HIGH NOTE BREAKS OVER THE NEAREST FOE. RESONATING FOES SHATTER FOR MORE.' },
  lullaby: { name: 'LULLABY', short: 'LUL', kind: 'lullaby', cd: 11, dmg: 8, radius: 3.3, stun: 1.6, desc: 'A SOFT SONG: THE FOES AROUND HER FALL STILL, AND RESONATE.' },
  echo: { name: 'ECHO CHOIR', short: 'ECH', kind: 'echo', cd: 13, dur: 5, dmg: 10, rate: 0.5, level: 4, desc: 'TWO ECHOES SING BESIDE HER, AND THEIR NOTES HUNT.' },
};

export const ULTS = {
  requiem: { name: 'REQUIEM', kind: 'requiem', dur: 1.6, radius: 6.5, hits: 7, dmg: 15 },
  rain: { name: 'RAIN OF BOLTS', kind: 'rain', dur: 2.6, radius: 6.5, rate: 0.06, dmg: 12, r: 1.1 },
  toll: { name: 'TOLL OF RUIN', kind: 'toll', dur: 1.9, rings: 3, dmg: 34, r1: 7.5 },
  sunburst: { name: 'SUNBURST', kind: 'sunburst', dur: 1.0, radius: 7.5, dmg: 80, heal: 0.3, status: { burn: 1 } },
  cutstorm: { name: 'STORM OF CUTS', kind: 'cutstorm', dur: 1.7, radius: 6.5, hits: 10, dmg: 13, status: { bleed: 1 } }, // PROPOSAL
  floodbell: { name: 'THE FLOOD BELL', kind: 'flood', dur: 2.1, radius: 8, rings: 3, dmg: 30, status: { frost: 1 } }, // PROPOSAL
  lastchoir: { name: 'THE LAST CHOIR', kind: 'choir', dur: 2.3, radius: 8, rate: 0.2, dmg: 14, r: 1.5, finale: 60 }, // PROPOSAL
};

export const rankDmg = (r) => 1 + 0.22 * ((r || 1) - 1);
export const rankCd = (r) => 1 - 0.07 * ((r || 1) - 1);
export const MAX_RANK = 5;

// ------------------------------------------------------------------ weapons
// dmg: multiplier on the hero's damage; trait: on-hit chances (burn, frost, bleed, shock, crit) or flags.
export const WEAPONS = {
  wardenBlade: { type: 'blade', name: "WARDEN'S BLADE", tier: 0, dmg: 1.0, desc: 'THE BLADE OF THE BELL-WARDENS.' },
  gallowsSaber: { type: 'blade', name: 'GALLOWS SABER', tier: 1, dmg: 1.14, trait: { bleed: 0.25 }, look: { blade: 0xb8b0a8 }, desc: 'HITS MAY CAUSE BLEEDING.' },
  candleEdge: { type: 'blade', name: 'CANDLEFLAME EDGE', tier: 2, dmg: 1.26, trait: { burn: 0.3 }, look: { blade: 0xffb060, bladeGlow: 0x603010 }, desc: 'HITS MAY SET FOES ALIGHT.' },
  tidecutter: { type: 'blade', name: 'TIDECUTTER', tier: 3, dmg: 1.38, trait: { frost: 0.35 }, look: { blade: 0x90e0e8, bladeGlow: 0x104050 }, desc: 'HITS MAY CHILL AND SLOW.' },
  bellsteel: { type: 'blade', name: 'BELLSTEEL', tier: 4, dmg: 1.55, trait: { shock: 0.25, crit: 0.1 }, look: { blade: 0xf0e8c0, bladeGlow: 0x504020 }, desc: 'CRITS AND CHAIN LIGHTNING.' },
  nightCrossbow: { type: 'bow', name: 'NIGHT CROSSBOW', tier: 0, dmg: 1.0, desc: 'LIGHT AND QUIET.' },
  harpoonBow: { type: 'bow', name: 'HARPOON BOW', tier: 1, dmg: 1.12, trait: { pierce: true }, desc: 'BOLTS PASS THROUGH FOES.' },
  emberRepeater: { type: 'bow', name: 'EMBER REPEATER', tier: 2, dmg: 1.18, trait: { burn: 0.25, rate: 0.82 }, desc: 'FASTER, BURNING BOLTS.' },
  stormArbalest: { type: 'bow', name: 'STORM ARBALEST', tier: 3, dmg: 1.42, trait: { shock: 0.3 }, desc: 'BOLTS MAY CHAIN LIGHTNING.' },
  paleLongbow: { type: 'bow', name: 'PALE LONGBOW', tier: 4, dmg: 1.6, trait: { crit: 0.22, pierce: true }, desc: 'PIERCING BOLTS THAT OFTEN CRIT.' },
  ironMaul: { type: 'hammer', name: 'IRON MAUL', tier: 0, dmg: 1.0, desc: 'A FOUNDRY HAMMER.' },
  anchorHammer: { type: 'hammer', name: 'ANCHOR HAMMER', tier: 1, dmg: 1.14, trait: { frost: 0.3 }, desc: 'BLOWS MAY SLOW.' },
  knightBreaker: { type: 'hammer', name: 'KNIGHTBREAKER', tier: 2, dmg: 1.24, trait: { poise: 1.6 }, desc: 'SHATTERS GUARDS AND POISE.' },
  founderMaul: { type: 'hammer', name: "FOUNDER'S MAUL", tier: 3, dmg: 1.4, trait: { burn: 0.4 }, desc: 'MOLTEN BLOWS.' },
  cathedralBell: { type: 'hammer', name: 'CATHEDRAL BELL', tier: 4, dmg: 1.58, trait: { shock: 0.25, quake: true }, desc: 'THE LAST BLOW OF A COMBO QUAKES WIDER.' },
  lampStaff: { type: 'focus', name: 'LAMP STAFF', tier: 0, dmg: 1.0, desc: 'A LAMPLIGHTER\'S POLE.' },
  wickRod: { type: 'focus', name: 'WICK ROD', tier: 1, dmg: 1.14, trait: { burn: 0.25 }, desc: 'FIRE THAT CLINGS LONGER.' },
  tideCenser: { type: 'focus', name: 'TIDE CENSER', tier: 2, dmg: 1.24, trait: { frost: 0.35 }, desc: 'COLD FLAMES THAT SLOW.' },
  boneScepter: { type: 'focus', name: 'BONE SCEPTER', tier: 3, dmg: 1.38, trait: { leech: 0.05 }, desc: 'EVERY HIT HEALS YOU A LITTLE.' },
  dawnLantern: { type: 'focus', name: 'DAWN LANTERN', tier: 4, dmg: 1.58, trait: { burn: 0.4, crit: 0.12 }, desc: 'THE FIRST LIGHT, IN A CAGE.' },
  // PROPOSAL: the new wardens' weapons
  cellKnives: { type: 'knives', name: 'CELL KNIVES', tier: 0, dmg: 1.0, desc: 'TWO KNIVES FROM THE GAOL KITCHEN.' },
  rustShivs: { type: 'knives', name: 'RUSTED SHIVS', tier: 1, dmg: 1.14, trait: { bleed: 0.25 }, look: { blade: 0xa07858 }, desc: 'RAGGED EDGES: CUTS BLEED MORE OFTEN.' },
  nooseCutters: { type: 'knives', name: 'NOOSE-CUTTERS', tier: 2, dmg: 1.26, trait: { crit: 0.15 }, look: { blade: 0xe8e0c8 }, desc: 'HOOKED BLADES THAT FIND THE GAPS. MORE CRITS.' },
  moonFangs: { type: 'knives', name: 'MOONLIT FANGS', tier: 3, dmg: 1.4, trait: { frost: 0.3, crit: 0.08 }, look: { blade: 0x9ce0f0, bladeGlow: 0x104050 }, desc: 'COLD AS THE ROOFTOPS: HITS MAY SLOW.' },
  gallowsKeys: { type: 'knives', name: 'KEYS OF THE GALLOWS', tier: 4, dmg: 1.56, trait: { bleed: 0.3, crit: 0.12, shock: 0.15 }, look: { blade: 0xf0d890, bladeGlow: 0x504018 }, desc: 'GROUND FROM HER FATHER\'S KEYS. BLEEDING, CRITS AND LIGHTNING.' },
  harbourAnchor: { type: 'chain', name: 'HARBOUR ANCHOR', tier: 0, dmg: 1.0, desc: 'THE OLD ANCHOR BY THE HARBOUR BELL.' },
  kelpChain: { type: 'chain', name: 'KELP CHAIN', tier: 1, dmg: 1.14, trait: { frost: 0.3 }, look: { blade: 0x3a6a58 }, desc: 'COLD AS THE DEEP: BLOWS MAY SLOW.' },
  wreckAnchor: { type: 'chain', name: "WRECKER'S ANCHOR", tier: 2, dmg: 1.24, trait: { poise: 1.6 }, look: { blade: 0x6a5a4a }, desc: 'A WRECK\'S ANCHOR: BREAKS GUARDS AND POISE.' },
  leviathanHook: { type: 'chain', name: 'LEVIATHAN HOOK', tier: 3, dmg: 1.4, trait: { leech: 0.02 }, look: { blade: 0xb8c8c0 }, desc: 'IT DRINKS WHAT IT DRAGS IN: HITS HEAL YOU A LITTLE.' },
  stormAnchor: { type: 'chain', name: 'STORM ANCHOR', tier: 4, dmg: 1.58, trait: { shock: 0.3, frost: 0.2 }, look: { blade: 0x8ab0d0, bladeGlow: 0x203850 }, desc: 'CAST IN A STORM: LIGHTNING AND COLD.' },
  choirFork: { type: 'hymn', name: 'CHOIR FORK', tier: 0, dmg: 1.0, desc: 'A TUNING FORK AS TALL AS SHE IS.' },
  psalmStaff: { type: 'hymn', name: 'COLD PSALM', tier: 1, dmg: 1.14, trait: { frost: 0.25 }, look: { orb: 0x80c8ff }, desc: 'A WINTER HYMN: NOTES MAY SLOW.' },
  requiemFork: { type: 'hymn', name: 'REQUIEM FORK', tier: 2, dmg: 1.2, trait: { rate: 0.85 }, look: { orb: 0xff70c0 }, desc: 'IT SINGS FASTER.' },
  bellFork: { type: 'hymn', name: 'BELL-TONGUE FORK', tier: 3, dmg: 1.38, trait: { pierce: true }, look: { orb: 0xffd080 }, desc: 'NOTES RING ON THROUGH FOES.' },
  lastHymn: { type: 'hymn', name: 'THE LAST HYMN', tier: 4, dmg: 1.58, trait: { crit: 0.15, shock: 0.2 }, look: { orb: 0xffffff }, desc: 'THE CHOIR\'S LAST SONG: CRITS AND LIGHTNING.' },
};
export const START_WEAPON = { blade: 'wardenBlade', bow: 'nightCrossbow', hammer: 'ironMaul', focus: 'lampStaff', knives: 'cellKnives', chain: 'harbourAnchor', hymn: 'choirFork' };
export const weaponsOfType = (type) => Object.entries(WEAPONS).filter(([, w]) => w.type === type).map(([id]) => id);
export const upgradeMul = (plus) => 1 + 0.05 * (plus || 0);
export const upgradeCost = (id, plus) => Math.round(40 * Math.pow((plus || 0) + 1, 1.5) * (1 + (WEAPONS[id]?.tier || 0) * 0.4));
export const MAX_PLUS = 10;
export const weaponPrice = (id) => Math.round(160 * Math.pow(1.8, WEAPONS[id]?.tier || 0));

// ------------------------------------------------------------------ relics (passive; two slots, a third after district IV)
export const RELICS = {
  coin: { name: "GRAVEDIGGER'S COIN", desc: '+30% EMBERS.', price: 220 },
  thread: { name: 'RED THREAD', desc: 'HEAL 3 ON EVERY KILL.', price: 260 },
  clapper: { name: 'BELL CLAPPER', desc: 'ABILITIES RECHARGE 18% FASTER.', price: 320 },
  rosary: { name: 'ASH ROSARY', desc: 'DASHING LEAVES A BURNING TRAIL.', price: 280 },
  tooth: { name: "HOUND'S TOOTH", desc: '+15% CRITICAL CHANCE.', price: 300 },
  bone: { name: "SAINT'S BONE", desc: 'ONCE PER DISTRICT, RISE AGAIN AT 30% HEALTH.', price: 420 },
  wick: { name: 'WICK OF WRATH', desc: '+25% DAMAGE BELOW 40% HEALTH.', price: 260 },
  moth: { name: 'MOTH WING', desc: 'ONE MORE DASH IN A ROW.', price: 300 },
  glass: { name: 'LANTERN GLASS', desc: 'THE ULTIMATE CHARGES 35% FASTER.', price: 320 },
  psalter: { name: 'IRON PSALTER', desc: 'TAKE 15% LESS DAMAGE.', price: 340 },
  pearl: { name: 'DROWNED PEARL', desc: 'TONICS HEAL 30% MORE.', price: 240 },
  crown: { name: "RAT KING'S CROWN", desc: 'KILLS MAY DROP A HEALING EMBER.', price: 260 },
  storm: { name: 'STORMGLASS', desc: 'HITS MAY CHAIN LIGHTNING TO TWO FOES.', price: 360 },
  silk: { name: 'PALE SILK', desc: 'MOVE 12% FASTER.', price: 220 },
};

// ------------------------------------------------------------------ elite foes
export const AFFIXES = {
  burning: { name: 'BURNING', color: 0xff7a20, hit: { burn: 1 } },
  frozen: { name: 'FROZEN', color: 0x70d8ff, hit: { frost: 1 } },
  shielded: { name: 'SHIELDED', color: 0xe8e0c0, shield: 0.4 },
  hasted: { name: 'HASTED', color: 0xa0ff70, speed: 1.4, cd: 0.6 },
  vampiric: { name: 'VAMPIRIC', color: 0xff2040, leech: 0.5 },
};
export const AFFIX_LIST = Object.keys(AFFIXES);

// ------------------------------------------------------------------ echoes
// Each boss leaves an Echo, the voice it stole (STORY_BIBLE.md). Worn in Echo slots at the Haven (two, three in
// New Game+); an Ascended kill in New Game+ empowers it (level 2: the `up` line). heroStats hands the worn ones
// to the sim as stats.echo = { type: level }; sim.js reads them where they bite. Key = the boss type.
// PROPOSAL: every name and line below.
export const ECHOES = {
  gaoler: { name: "THE GAOLER'S KEYS", from: 'THE GAOLER', desc: 'HITS MAY CHAIN FOES IN PLACE FOR A MOMENT.', up: 'CHAINS BITE MORE OFTEN AND HOLD LONGER.' },
  tallow: { name: "TALLOW'S WICK", from: 'MOTHER TALLOW', desc: 'HITS MAY SET FOES ALIGHT. THE BURNING DEAD BURST INTO FLAME.', up: 'MORE FIRE, AND A WIDER BURST.' },
  harbormaster: { name: "THE HARBORMASTER'S HOOK", from: 'THE HARBORMASTER', desc: 'EVERY DASH ENDS WITH A HOOK THAT DRAGS THE NEAREST FOE TO YOU.', up: 'THE HOOK TAKES TWO, AND COMES BACK SOONER.' },
  deacon: { name: "THE DEACON'S TIDE", from: 'THE DROWNED DEACON', desc: 'EVERY SKILL LEAVES A POOL OF BLACK WATER THAT SLOWS AND DROWNS.', up: 'DEEPER, WIDER POOLS.' },
  ossuary: { name: 'TEN THOUSAND NAMES', from: 'THE OSSUARY KNIGHT', desc: 'A KILL RAISES A WARD OF BONE THAT TURNS ASIDE THE NEXT BLOW.', up: 'HOLD TWO WARDS AT ONCE.' },
  founder: { name: "THE FOUNDER'S HEAT", from: 'THE BELLFOUNDER', desc: 'HEAVY BLOWS, AND EVERY FOURTH SHOT, SPLASH MOLTEN BRONZE.', up: 'HOTTER, WIDER SPLASHES.' },
  regent: { name: "THE REGENT'S BARGAIN", from: 'THE PALE REGENT', desc: 'EVERY KILL GIVES BACK A LITTLE HEALTH.', up: 'EACH KILL GIVES BACK MORE.' },
  silence: { name: 'THE STILLED HAND', from: 'SAINT SILENCE', desc: 'A PERFECT DODGE HUSHES THE WORLD: YOUR NEXT BLOWS HIT FAR HARDER.', up: 'A LONGER, DEEPER HUSH.' },
  frostgiant: { name: 'HOARFROST BREATH', from: 'THE HOARFROST KING', desc: 'HITS MAY CHILL. CHILLED FOES TAKE MORE HURT.', up: 'COLDER STILL.' },
  sandwyrm: { name: "ASHMAW'S WAKE", from: 'ASHMAW', desc: 'YOUR DASH LEAVES A BURROWING TRAIL THAT BURSTS UNDER FOES.', up: 'THE SAND BITES HARDER AND SLOWS.' },
  lich: { name: "THE ABBOT'S PRAYER", from: 'ABBOT MORROW', desc: 'THE FALLEN RISE AS SPIRITS THAT HUNT THE NEAREST FOE.', up: 'STRONGER SPIRITS.' },
  archon: { name: 'THE HOLLOW CROWN', from: 'THE HOLLOW ARCHON', desc: 'THE ULTIMATE CHARGES FASTER AND ENDS IN A BURST OF VOID.', up: 'FASTER STILL, AND A GREATER VOID.' },
  bogmother: { name: "THE BOG MOTHER'S KISS", from: 'THE BOG MOTHER', desc: 'HITS MAY POISON.', up: 'A STRONGER POISON, MORE OFTEN.' },
  clockmaster: { name: "THE CLOCKMASTER'S KEY", from: 'THE CLOCKMASTER', desc: 'SKILLS RECHARGE FASTER. EVERY THIRD SKILL WINDS THE OTHER BACK.', up: 'FASTER STILL.' },
};
export const ECHO_ORDER = Object.keys(ECHOES);

// ------------------------------------------------------------------ growth
export const MAX_LEVEL = 30;
export const xpFor = (level) => Math.round(45 * Math.pow(level, 1.55)); // xp needed to go from level to level+1
export const levelHp = (level) => 1 + 0.05 * (level - 1);
export const levelDmg = (level) => 1 + 0.03 * (level - 1);

// The fight stats of a hero from the save (pure).
export function heroStats(save, heroId) {
  const H = HEROES[heroId]; const P = save.heroes[heroId];
  const W = WEAPONS[P.weapon] || WEAPONS[START_WEAPON[H.weapon]]; const plus = (P.plus || {})[P.weapon] || 0;
  const relics = new Set((save.relicsOn || []).filter(Boolean));
  const has = (r) => relics.has(r);
  const tonicUp = save.tonicUp || 0;
  // the hero's own touch (Kestrel's cuts bleed) adds to the weapon's
  const trait = { ...(W.trait || {}) }; for (const k in (H.attack.trait || {})) trait[k] = typeof H.attack.trait[k] === 'number' ? (trait[k] || 0) + H.attack.trait[k] : H.attack.trait[k];
  // the Echoes worn: { type: 1 | 2 (Ascended) }
  const echo = {}; const slots = save.ngPlus > 0 ? 3 : 2; const owned = save.echoes || [];
  for (const t of (save.echoesOn || []).slice(0, slots)) if (t && ECHOES[t] && owned.includes(t)) echo[t] = (save.echoesAsc || []).includes(t) ? 2 : 1;
  const cdEcho = echo.clockmaster ? (echo.clockmaster > 1 ? 0.78 : 0.85) : 1, ultEcho = echo.archon ? (echo.archon > 1 ? 1.4 : 1.25) : 1;
  return {
    heroId, kit: H, level: P.level,
    maxHp: Math.round(H.hp * levelHp(P.level)),
    dmgMul: levelDmg(P.level) * W.dmg * upgradeMul(plus),
    weapon: P.weapon, weaponDef: W, trait,
    abilities: P.equipped.map((id) => ({ id, def: ABILITIES[id], rank: (P.ranks || {})[id] || 1 })),
    ult: { id: H.ult, def: ULTS[H.ult], rank: (P.ranks || {})[H.ult] || 1 },
    maxTonics: 3 + tonicUp + (save.bossTonics || 0), tonicHeal: 0.45 * (has('pearl') ? 1.3 : 1),
    dashCharges: 1 + (has('moth') ? 1 : 0), crit: (trait.crit || 0) + (has('tooth') ? 0.15 : 0),
    cdMul: (has('clapper') ? 0.82 : 1) * cdEcho, ultRate: (has('glass') ? 1.35 : 1) * ultEcho, speedMul: has('silk') ? 1.12 : 1, echo,
    dmgTaken: (1 - (H.armor || 0)) * (has('psalter') ? 0.85 : 1), revives: has('bone') ? 1 : 0,
    relics: [...relics], armor: H.armor || 0,
  };
}

// A fresh per-hero record in the save.
export function newHeroSave(heroId) {
  const H = HEROES[heroId]; const w = START_WEAPON[H.weapon];
  return { level: 1, xp: 0, points: 0, weapon: w, owned: [w], plus: {}, ranks: { [H.abilities[0]]: 1, [H.abilities[1]]: 1, [H.ult]: 1 }, equipped: [H.abilities[0], H.abilities[1]] };
}
