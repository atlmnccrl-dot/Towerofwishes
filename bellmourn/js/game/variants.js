// Area variants for the roguelite run (RUN_DESIGN section 2). Pure data and functions: no DOM, no three.js,
// so it runs in Node. Every district and region has at least three variants; a variant combines
//  - a layout: blocks of rubble, fire, flood or ice across part of a street, gates left open (a fight that can be
//    walked past), another way in (start), and `short` (runs: one or two fights, then the boss, then the exit);
//  - a condition (FLOODED, BURNING, FOG, BLOOD MOON, PLAGUE, FROZEN OVER, ECLIPSE, ASHFALL, STORM, FALSE DAWN) with its
//    own weather and grade (an override of the place's ambience that keeps its palette) and props laid by kit_var.js;
//  - the condition's foes (a substitution pool) and their element mix (B's spawnFoe opts.element);
//  - a boss pool (D's bossPool(levelId, variant) reads variant.bossPool, the favourite first);
//  - in-level events: an ambush (the loose foes wait, then rise as a locked-in fight), a wandering elite, a trapped
//    survivor to free, a cursed lamp, and the side quests' hints (quests.js hintsIn).
// Shape (run-contract): { id, name, condition, layout: { start?, blocks?, gatesOpen?, short? }, ambience,
//   pool, elements: { fire: w, ... }, bossPool: [types], events: [ids] }.
// applyVariant(def, variant, { short, meta, run }) returns the def the level is built from: the same def with the
// variant's ambience, foes, encounters, start, gates, touches (glowing props the hero can walk into: game.js calls
// quests.onHint(game, id) on touch) and a build that lays the condition's props after the district's own.
// Every player-facing text in this file is PROPOSAL.
import { hintsIn } from './quests.js';

export const ELEMENTS = ['fire', 'frost', 'poison', 'storm', 'blood', 'holy', 'void'];
// foes that blink: never swapped INTO a locked encounter (their blinks land beyond the room's walls)
const BLINKERS = new Set(['acolyte', 'shade', 'imp', 'marshwitch']);
// places under the ground or the sky: no rain falls there whatever the condition
const NO_RAIN = new Set(['undercroft', 'catacombs', 'abyss', 'spire', 'empyrean']);

// ------------------------------------------------------------------ colour helpers (pure)
const ch = (c, s) => (c >> s) & 255;
export function mixHex(a, b, t) { if (a === undefined) return b; const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t); return (m(16) << 16) | (m(8) << 8) | m(0); }
const scaleHex = (a, k) => { const m = (s) => Math.max(0, Math.min(255, Math.round(ch(a, s) * k))); return (m(16) << 16) | (m(8) << 8) | m(0); };

// ------------------------------------------------------------------ conditions
// ambience(base, level) returns overrides on top of the place's own ambience (it keeps the district's identity:
// colours are mixed toward the condition's, never replaced outright). overlay: what kit_var.dress lays on the ground.
// pool: foe substitutions; elements: the element mix; elite: the affix of the wandering elite.
export const CONDITIONS = {
  flooded: {
    name: 'FLOODED', line: 'THE WATER HAS COME UP INTO THE STREETS.',
    ambience: (b) => ({ fog: mixHex(b.fog, 0x18323a, 0.5), hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x4a7c88, 0.45), rain: Math.max(b.rain ?? 1, 1.25), rainColor: 0x9ab8c8, lightning: true,
      grade: { ...(b.grade || {}), gain: [0.9, 1.0, 1.09], lift: [0.002, 0.01, 0.014], sat: Math.min(0.9, (b.grade?.sat ?? 0.85) * 0.92) } }),
    overlay: { water: 0x3a6a78, debris: true },
    pool: { hushed: 'drowned', ghoul: 'drowned', hound: 'crab', rat: 'leech', bat: 'leech', bomber: 'spitter', brute: 'bogtroll' },
    elements: { frost: 2, storm: 2, void: 1 }, elite: 'frozen', chance: 0.55,
  },
  burning: {
    name: 'BURNING', line: 'THE QUARTER IS ON FIRE. NO ONE PUTS IT OUT.',
    ambience: (b) => ({ fog: mixHex(b.fog, 0x40180c, 0.5), hemiGround: mixHex(b.hemiGround ?? 0x10141c, 0x4a1a08, 0.6), fillColor: mixHex(b.fillColor ?? 0x8292b4, 0xd07040, 0.5), weather: 'embers', drizzle: 0.15, rain: 0.15, lightning: false,
      ambient: mixHex(b.ambient ?? 0x1a2438, 0x3a1608, 0.6), hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x8a4a30, 0.5), moonColor: mixHex(b.moonColor ?? 0x9db4d8, 0xffa070, 0.5),
      grade: { ...(b.grade || {}), gain: [1.18, 0.95, 0.8], lift: [0.018, 0.006, 0.0], sat: 1.0, exposure: (b.grade?.exposure ?? 1.05) * 1.06 } }),
    overlay: { fires: 11, scorch: 14, smoke: 5 },
    pool: { hound: 'hellhound', ghoul: 'hellhound', bat: 'imp', rat: 'imp', acolyte: 'bomber', spitter: 'bomber', chanter: 'cultist' },
    elements: { fire: 5, void: 1 }, elite: 'burning', chance: 0.6,
  },
  fog: {
    name: 'FOG', line: 'A FOG SO THICK THE LAMPS ARE ONLY RUMOURS.',
    ambience: (b) => ({ fog: mixHex(b.fog, 0x4a565c, 0.45), fogNear: 68, fogFar: 104, hemi: (b.hemi ?? 1.1) * 1.05, rain: Math.min(b.rain ?? 1, 0.35), lightning: false,
      grade: { ...(b.grade || {}), lift: [0.018, 0.02, 0.022], sat: Math.min(0.66, (b.grade?.sat ?? 0.85) * 0.78) } }),
    overlay: { fog: 0x8a98a0, mist: 0xa4b0b8 },
    pool: { hushed: 'shade', ghoul: 'hound', crossbow: 'crossbow', bat: 'bat' },
    elements: { void: 2, frost: 1, storm: 1 }, elite: 'hasted', chance: 0.45,
  },
  bloodmoon: {
    name: 'BLOOD MOON', line: 'THE MOON CAME UP RED. EVERYTHING IS HUNGRY.',
    ambience: (b) => ({ moonColor: 0xff6a50, moon: Math.max(1.6, b.moon ?? 1.5) * 1.05, hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x7a2a30, 0.5), fog: mixHex(b.fog, 0x3c0c10, 0.45), rainColor: 0xc85050,
      fillColor: mixHex(b.fillColor ?? 0x8292b4, 0xb04848, 0.5), beams: (b.beams || []).map((x) => ({ ...x, color: 0xff6a50 })),
      grade: { ...(b.grade || {}), gain: [1.12, 0.93, 0.9], lift: [0.012, 0.0, 0.002], sat: 0.92 } }),
    overlay: { blood: 12, glow: 0xff3020 },
    pool: { ghoul: 'hound', hushed: 'ghoul', crossbow: 'crossbow', rat: 'bat' },
    elements: { blood: 5, void: 1 }, elite: 'vampiric', chance: 0.6, eliteChance: 0.2,
  },
  plague: {
    name: 'PLAGUE', line: 'A GREEN MIASMA HANGS AT KNEE HEIGHT.',
    ambience: (b) => ({ fog: mixHex(b.fog, 0x22301a, 0.6), hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x6a8a4a, 0.5), weather: 'spores', drizzle: Math.min(b.rain ?? 0, 0.3), rain: Math.min(b.rain ?? 0, 0.3), lightning: false,
      grade: { ...(b.grade || {}), gain: [0.96, 1.07, 0.84], lift: [0.006, 0.012, 0.0], sat: 0.82 } }),
    overlay: { miasma: 0x8ac060, bile: 12, fumes: 4 },
    pool: { hound: 'rat', ghoul: 'rat', crossbow: 'spitter', acolyte: 'spitter', bat: 'rat', bomber: 'spitter', brute: 'slime' },
    elements: { poison: 5, blood: 1 }, elite: 'hasted', chance: 0.6,
  },
  frozen: {
    name: 'FROZEN OVER', line: 'THE RAIN FROZE AS IT FELL. THE STONES ARE GLASS.',
    ambience: (b) => ({ weather: 'snow', rain: 0, drizzle: 0, lightning: false, fog: mixHex(b.fog, 0x2c3c52, 0.55), hemiGround: mixHex(b.hemiGround ?? 0x10141c, 0x3a4a5c, 0.6), hemi: (b.hemi ?? 1.1) * 1.08,
      moonColor: mixHex(b.moonColor ?? 0x9db4d8, 0xb8d4ff, 0.6), grade: { ...(b.grade || {}), gain: [0.92, 1.0, 1.12], lift: [0.006, 0.01, 0.02], sat: 0.72 } }),
    overlay: { frost: 0xdce8f4, icicles: 10 },
    pool: { hound: 'frostwolf', ghoul: 'frostwolf', acolyte: 'icewraith', brute: 'yeti', bat: 'icewraith', spitter: 'icewraith', crab: 'frostwolf' },
    elements: { frost: 5, storm: 1 }, elite: 'frozen', chance: 0.6,
  },
  eclipse: {
    name: 'ECLIPSE', line: 'SOMETHING ATE THE MOON. ONLY THE LAMPS ARE LEFT.',
    ambience: (b) => ({ moon: (b.moon ?? 1.5) * 0.45, moonColor: 0x8a78d0, hemi: (b.hemi ?? 1.1) * 0.78, hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x40306a, 0.6), fog: mixHex(b.fog, 0x0e0a1a, 0.6), beams: [], weather: 'voidmotes', drizzle: Math.min(b.rain ?? 0, 0.4),
      fill: (b.fill ?? 1.3) * 0.85, grade: { ...(b.grade || {}), gain: [0.94, 0.92, 1.1], lift: [0.004, 0.0, 0.016], sat: 0.6, vignette: 0.55, exposure: (b.grade?.exposure ?? 1.05) * 1.02 } }),
    overlay: { cracks: 8, glow: 0x9a60ff },
    pool: { hushed: 'shade', acolyte: 'chanter', crossbow: 'choirmask', hound: 'shade', bat: 'wisp' },
    elements: { void: 4, holy: 1 }, elite: 'shielded', chance: 0.55,
  },
  ashfall: {
    name: 'ASHFALL', line: 'GREY ASH FALLS LIKE SNOW THAT DOES NOT MELT.',
    ambience: (b) => ({ weather: 'ash', rain: 0, drizzle: 0, lightning: false, fog: mixHex(b.fog, 0x3c3836, 0.6), hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x6a6460, 0.55),
      grade: { ...(b.grade || {}), gain: [1.03, 0.98, 0.93], lift: [0.014, 0.012, 0.01], sat: 0.46 } }),
    overlay: { ash: 0x8a8480, cinders: 10 },
    pool: { hushed: 'skeleton', ghoul: 'skeleton', crossbow: 'bonecaster', hound: 'hellhound', acolyte: 'bonecaster', rat: 'skeleton' },
    elements: { fire: 2, void: 2 }, elite: 'burning', chance: 0.5,
  },
  storm: {
    name: 'STORM', line: 'THE SKY IS ALL THUNDER. THE BELLS HUM WITH IT.',
    ambience: (b) => ({ rain: Math.max(1.7, b.rain ?? 1), rainColor: 0xb4c4e0, lightning: true, boltEvery: 0.3, fog: mixHex(b.fog, 0x101828, 0.5), moon: (b.moon ?? 1.5) * 0.85, moonColor: mixHex(b.moonColor ?? 0x9db4d8, 0xa8c0ff, 0.6),
      hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0x48608a, 0.5), grade: { ...(b.grade || {}), gain: [0.9, 0.97, 1.14], lift: [0.0, 0.004, 0.014], sat: Math.min(0.72, (b.grade?.sat ?? 0.85) * 0.85), exposure: (b.grade?.exposure ?? 1.05) * 1.02 } }),
    overlay: { wet: true, puddles: 14, struck: 6, glow: 0x80b8ff },
    pool: { acolyte: 'chanter', crossbow: 'crossbow', hound: 'hound', bat: 'wisp', bomber: 'chanter' },
    elements: { storm: 5, frost: 1 }, elite: 'hasted', chance: 0.55,
  },
  hallowed: {
    name: 'FALSE DAWN', line: 'A GOLDEN LIGHT WITH NO SUN BEHIND IT.',
    ambience: (b) => ({ fog: mixHex(b.fog, 0x6a5a40, 0.45), moonColor: 0xffe2a8, moon: (b.moon ?? 1.5) * 1.1, hemiSky: mixHex(b.hemiSky ?? 0x5a6c8a, 0xd8c08a, 0.55), hemiGround: mixHex(b.hemiGround ?? 0x10141c, 0x3a2c18, 0.5),
      weather: 'feathers', drizzle: Math.min(b.rain ?? 0, 0.2), lightning: false, beams: (b.beams || []).map((x) => ({ ...x, color: 0xffe0a0 })),
      grade: { ...(b.grade || {}), gain: [1.08, 1.03, 0.92], lift: [0.02, 0.016, 0.008], sat: 0.8, bloom: Math.max(b.grade?.bloom ?? 0.2, 0.32) } }),
    overlay: { sigils: 8, glow: 0xffd070 },
    pool: { acolyte: 'choirmask', crossbow: 'choirmask', hound: 'hollowangel', ghoul: 'hound', chanter: 'choirmask' },
    elements: { holy: 5, storm: 1 }, elite: 'shielded', chance: 0.55,
  },
};
// the colder Act II-III places want a few of their own words for the same conditions
export const CONDITION_IDS = Object.keys(CONDITIONS);

// ------------------------------------------------------------------ the areas
// short: the run cut (layout.short): where the hero starts, which encounters are dropped (their gates open) and the
// rectangles whose loose foes go with them. blocks: [x, z, w, d, kind] (kind: rubble, fire, flood, ice, bones,
// barricade, roots, glass, ash); every block is solid and was checked by test/level-check.js to leave the way open.
const PI = Math.PI;
const AREAS = {
  gate: {
    short: { start: { x: -5, z: 10.4, face: PI }, drop: [], cut: [] },
    variants: [
      { id: 'gate.bloodmoon', name: 'THE GALLOWS MOON', condition: 'bloodmoon', tagline: 'THE GIBBETS SWING THOUGH THERE IS NO WIND.',
        layout: { blocks: [[9.5, -36.5, 1.8, 1.6, 'bones'], [-4.6, -31.2, 2.2, 1.2, 'barricade']] },
        bossPool: ['gaoler'], events: ['ambush', 'cursedlamp'] },
      { id: 'gate.burning', name: 'THE GAOL ON FIRE', condition: 'burning', tagline: 'SOMEONE SET THE CELLS ALIGHT. FROM INSIDE.',
        layout: { blocks: [[-6.6, -4.6, 2.2, 1.4, 'fire'], [7, -22.6, 1.4, 1.6, 'fire']] },
        bossPool: ['gaoler'], events: ['elite', 'survivor'] },
      { id: 'gate.fog', name: 'FOG ON THE GALLOWS ROAD', condition: 'fog', tagline: 'YOU COME IN BY THE OLD EAST ROAD.',
        layout: { start: { x: 11, z: 12.6, face: PI }, blocks: [[-1.4, 13.2, 1.8, 1.4, 'barricade']] },
        bossPool: ['gaoler'], events: ['survivor', 'hint'] },
    ],
  },
  market: {
    short: { start: { x: -0.2, z: -18, face: PI }, drop: ['market'], cut: [[-12, -15.5, 14, 30]] },
    variants: [
      { id: 'market.burning', name: 'THE CANDLES CAUGHT', condition: 'burning', tagline: 'LANTERN ROW BURNS FROM ONE END TO THE OTHER.',
        layout: { blocks: [[2.6, 9.6, 1.8, 1.8, 'fire'], [-6, -27.4, 1.8, 1.2, 'fire']] },
        bossPool: ['tallow', 'smiling'], events: ['ambush', 'survivor'] },
      { id: 'market.frozen', name: 'THE CANALS FROZEN', condition: 'frozen', tagline: 'THE WAX AND THE WATER BOTH WENT HARD.',
        layout: { frozenCanals: true, blocks: [[-5.6, -10.6, 1.6, 1.6, 'ice'], [-21, -27.6, 1.6, 1.6, 'ice']] },
        bossPool: ['smiling', 'tallow'], events: ['elite', 'hint'] },
      { id: 'market.plague', name: 'THE WAX PLAGUE', condition: 'plague', tagline: 'THE CANDLE-SMOKE HAS TURNED GREEN.',
        layout: { start: { x: -5.2, z: 16.4, face: PI }, blocks: [[-6.4, 3.2, 1.4, 1.4, 'barricade']] },
        bossPool: ['tallow'], events: ['cursedlamp', 'hint'] },
    ],
  },
  docks: {
    short: { start: { x: 0.2, z: -9.6, face: PI }, drop: ['market'], cut: [[-26, -8, 14, 18]] },
    variants: [
      { id: 'docks.flooded', name: 'THE TIDE IN THE STREETS', condition: 'flooded', tagline: 'THE HARBOUR CAME UP TO MEET THE WAREHOUSES.',
        layout: { blocks: [[-4.6, -1.6, 1.6, 1.4, 'flood'], [7.2, -24.2, 1.6, 1.6, 'flood']] },
        bossPool: ['kingcrab', 'harbormaster'], events: ['ambush', 'hint'] },
      { id: 'docks.fog', name: 'THE GREY HARBOUR', condition: 'fog', tagline: 'THE FOGHORN SOUNDS. NO SHIP ANSWERS.',
        layout: { blocks: [[5.6, 8.4, 1.6, 1.4, 'barricade']] },
        bossPool: ['harbormaster', 'kingcrab'], events: ['survivor', 'hint'] },
      { id: 'docks.storm', name: 'THE STORM TIDE', condition: 'storm', tagline: 'LIGHTNING ON THE MASTS. THE NETS ARE BURNING BLUE.',
        layout: { gatesOpen: ['marketGate'], blocks: [[-3.8, -26.2, 1.6, 1.6, 'rubble']] },
        bossPool: ['harbormaster', 'kingcrab'], events: ['elite', 'cursedlamp'] },
    ],
  },
  nave: {
    short: { start: { x: 9.6, z: 0.8, face: -PI / 2 }, drop: ['yard'], cut: [[8.6, -8, 22, 17]] },
    variants: [
      { id: 'nave.hallowed', name: 'THE FALSE DAWN', condition: 'hallowed', tagline: 'LIGHT POURS THROUGH THE GLASS. IT IS NOT MORNING.',
        layout: { blocks: [[15.4, -2.6, 1.6, 1.2, 'rubble']] },
        bossPool: ['deacon', 'smiling'], events: ['survivor', 'hint'] },
      { id: 'nave.eclipse', name: 'THE DARK SERMON', condition: 'eclipse', tagline: 'THE CANDLES OF THE DROWNED ARE THE ONLY LIGHT.',
        layout: { start: { x: 18.6, z: 12.6, face: PI }, blocks: [[-2.6, -13.8, 1.6, 1.4, 'rubble']] },
        bossPool: ['smiling', 'deacon'], events: ['ambush', 'cursedlamp', 'hint'] },
      { id: 'nave.flooded', name: 'HIGH TIDE IN THE NAVE', condition: 'flooded', tagline: 'THE WATER REACHES THE ALTAR STEPS.',
        layout: { blocks: [[19.2, 1.6, 1.4, 1.6, 'flood']] },
        bossPool: ['deacon'], events: ['elite', 'survivor'] },
    ],
  },
  undercroft: {
    short: { start: { x: -12.5, z: -6.6, face: PI }, drop: ['gallery'], cut: [[0.4, -8.4, 11, 17], [-17.4, -8.4, 0.4, -1.6]], open: ['boneGate'] },
    variants: [
      { id: 'undercroft.plague', name: 'THE PLAGUE PITS', condition: 'plague', tagline: 'THE OLDER DEAD DIED OF SOMETHING. IT IS STILL HERE.',
        layout: { blocks: [[-6.4, -6.6, 1.4, 1.2, 'bones']] },
        bossPool: ['hollowmother', 'ossuary'], events: ['ambush', 'hint'] },
      { id: 'undercroft.flooded', name: 'THE DROWNED CRYPTS', condition: 'flooded', tagline: 'THE TIDE FOUND ITS WAY DOWN THE STAIR.',
        layout: { blocks: [[-15.8, -6.8, 1.4, 1.4, 'flood']] },
        bossPool: ['ossuary', 'hollowmother'], events: ['survivor', 'cursedlamp'] },
      { id: 'undercroft.eclipse', name: 'THE LIGHTLESS VAULT', condition: 'eclipse', tagline: 'THE GRATES ABOVE HAVE GONE DARK.',
        layout: { blocks: [[-4.4, -21.6, 1.4, 1.2, 'rubble']] },
        bossPool: ['hollowmother'], events: ['elite', 'hint'] },
    ],
  },
  foundry: {
    short: { start: { x: 2.4, z: -12.2, face: PI }, drop: ['hall'], cut: [[-17, -11, 12, 18]], open: ['yardGate'] },
    variants: [
      { id: 'foundry.burning', name: 'THE FURNACES BURST', condition: 'burning', tagline: 'MOLTEN BRONZE RUNS IN THE GUTTERS.',
        layout: { blocks: [[-4.2, -16.8, 1.6, 1.6, 'fire'], [6.6, -31, 1.4, 1.4, 'fire']] },
        bossPool: ['pyresaint', 'founder'], events: ['ambush', 'hint'] },
      { id: 'foundry.ashfall', name: 'THE ASH OF THE POURING', condition: 'ashfall', tagline: 'THE STACKS ARE COUGHING ASH OVER EVERYTHING.',
        layout: { blocks: [[7.6, 8.6, 1.6, 1.4, 'ash'], [3.6, -21.4, 1.6, 1.4, 'rubble']] },
        bossPool: ['founder', 'pyresaint'], events: ['survivor', 'cursedlamp'] },
      { id: 'foundry.storm', name: 'LIGHTNING ON THE GANTRY', condition: 'storm', tagline: 'THE CRANE DRAWS THE STORM DOWN LIKE A ROD.',
        layout: { start: { x: 9.6, z: 9.6, face: PI }, gatesOpen: ['yardGate'] },
        bossPool: ['founder'], events: ['elite', 'hint'] },
    ],
  },
  heights: {
    short: { start: { x: 0.6, z: -13, face: PI }, drop: ['garden'], cut: [[-14, -11.4, 10, 19]], open: ['gardenExit'] },
    variants: [
      { id: 'heights.fog', name: 'MIST OVER THE BALUSTRADE', condition: 'fog', tagline: 'THE LOWER CITY IS GONE UNDER THE CLOUD.',
        layout: { blocks: [[5.4, -20.4, 1.4, 1.4, 'rubble']] },
        bossPool: ['ronin', 'regent'], events: ['ambush', 'hint'] },
      { id: 'heights.bloodmoon', name: 'THE RED BALL', condition: 'bloodmoon', tagline: 'THE DANCERS HAVE NOT STOPPED. THEY CANNOT.',
        layout: { blocks: [[-4.6, -15.2, 1.6, 1.4, 'barricade']] },
        bossPool: ['regent', 'ronin'], events: ['elite', 'cursedlamp'] },
      { id: 'heights.frozen', name: 'THE GILDED FROST', condition: 'frozen', tagline: 'ICE ON EVERY GILT RAIL. THE FOUNTAINS STOPPED MID-AIR.',
        layout: { gatesOpen: ['gardenExit'], blocks: [[3.6, 9.6, 1.4, 1.4, 'ice']] },
        bossPool: ['ronin'], events: ['survivor', 'hint'] },
    ],
  },
  belfry: {
    short: { start: { x: 6, z: -13.2, face: PI }, drop: ['crossing'], cut: [[-16, -11.2, 22, 18]], open: ['bridgeGate'] },
    variants: [
      { id: 'belfry.storm', name: 'THE STORM ON THE LEADS', condition: 'storm', tagline: 'THE WIND WANTS YOU OFF THE ROOF.',
        layout: {}, bossPool: ['silence'], events: ['ambush', 'cursedlamp'] },
      { id: 'belfry.eclipse', name: 'THE BELL IN THE DARK', condition: 'eclipse', tagline: 'NO MOON. ONLY THE BELL, AND HIM.',
        layout: { blocks: [[7.6, -9.4, 1.2, 1.2, 'rubble']] }, bossPool: ['silence'], events: ['elite', 'hint'] },
      { id: 'belfry.frozen', name: 'THE FROZEN TOWER', condition: 'frozen', tagline: 'ICE ON THE LEADS. THE BELL ROPE IS A ROD OF GLASS.',
        layout: { blocks: [[11.2, -28.2, 1.2, 1.2, 'ice']] }, bossPool: ['silence'], events: ['survivor', 'hint'] },
    ],
  },
  frostmarch: {
    short: { start: { x: 3, z: -12, face: PI }, drop: ['river'], cut: [[-16, -16.8, 18, 18]], open: ['iceGate'] },
    variants: [
      { id: 'frostmarch.storm', name: 'THE WHITEOUT', condition: 'storm', tagline: 'SNOW AND THUNDER TOGETHER. THE FIRS SCREAM.',
        ambience: { weather: 'snow', rain: 0, drizzle: 0, rainColor: 0xdce8f8 },
        layout: { blocks: [[-3.2, -10.6, 4.6, 1.4, 'ice']] }, bossPool: ['frostgiant'], events: ['ambush', 'hint'] },
      { id: 'frostmarch.fog', name: 'THE FROZEN FOG', condition: 'fog', tagline: 'THE FOG FREEZES ON YOUR CLOAK.',
        ambience: { weather: 'snow', rain: 0 }, layout: { start: { x: 6.2, z: 15.6, face: PI }, blocks: [[6.4, -26.4, 1.6, 1.6, 'ice']] },
        bossPool: ['frostgiant'], events: ['survivor', 'cursedlamp'] },
      { id: 'frostmarch.bloodmoon', name: 'THE RED SNOW', condition: 'bloodmoon', tagline: 'THE WOLVES HAVE BEEN FEEDING.',
        ambience: { weather: 'snow', rain: 0 }, layout: { blocks: [[-2.6, -24.4, 1.6, 1.4, 'bones'], [8.2, -10, 1.4, 1.4, 'ice']] },
        bossPool: ['frostgiant'], events: ['elite', 'hint'] },
    ],
  },
  ashdunes: {
    short: { start: { x: 2.6, z: -12, face: PI }, drop: ['court'], cut: [[-16, -19, 20, 18]], open: ['templeGate'] },
    variants: [
      { id: 'ashdunes.ashfall', name: 'THE GREY STORM', condition: 'ashfall', tagline: 'THE WIND CARRIES THE ASH OF THE OLD CITY.',
        layout: { blocks: [[-2.8, -11.4, 2.4, 1.4, 'ash']] }, bossPool: ['sandwyrm'], events: ['ambush', 'hint'] },
      { id: 'ashdunes.eclipse', name: 'THE BLACK SUN', condition: 'eclipse', tagline: 'THE SUN OF THE OLD CITY ROSE BLACK.',
        layout: { start: { x: 6.6, z: 13.6, face: PI }, blocks: [[7.2, -26.6, 1.4, 1.4, 'rubble']] }, bossPool: ['sandwyrm'], events: ['cursedlamp', 'survivor'] },
      { id: 'ashdunes.plague', name: 'THE PLAGUE OF SCARABS', condition: 'plague', tagline: 'THE SAND IS CRAWLING.',
        layout: { blocks: [[6.4, -12.6, 1.4, 1.4, 'rubble']] }, bossPool: ['sandwyrm'], events: ['elite', 'hint'] },
    ],
  },
  catacombs: {
    short: { start: { x: -10.5, z: -12, face: PI }, drop: ['ossuary'], cut: [[-18, -5.2, 22, 18]], open: ['chasmGate'] },
    variants: [
      { id: 'catacombs.flooded', name: 'THE BLACK WATER', condition: 'flooded', tagline: 'AN UNDERGROUND RIVER BROKE INTO THE TOMBS.',
        layout: { blocks: [[-14.6, -14.6, 1.4, 1.6, 'flood']] }, bossPool: ['lich'], events: ['ambush', 'hint'] },
      { id: 'catacombs.plague', name: 'THE ROT', condition: 'plague', tagline: 'THE SLIMES HAVE BRED IN THE DARK.',
        layout: { blocks: [[-9.4, -30.6, 1.4, 1.4, 'bones']] }, bossPool: ['lich'], events: ['elite', 'cursedlamp'] },
      { id: 'catacombs.hallowed', name: 'THE SAINTS AWAKE', condition: 'hallowed', tagline: 'GOLD LIGHT IN THE LOCULI. THE DEAD ARE PRAYING.',
        layout: { blocks: [[7.6, -1.2, 1.2, 1.2, 'rubble']] }, bossPool: ['lich'], events: ['survivor', 'hint'] },
    ],
  },
  abyss: {
    short: { start: { x: -4.3, z: -10.5, face: PI }, drop: ['rite'], cut: [[-18, -12, 22, 18]], open: ['veilGate'] },
    variants: [
      { id: 'abyss.eclipse', name: 'THE LIGHTLESS DEEP', condition: 'eclipse', tagline: 'EVEN THE EMBERS HAVE GONE OUT.',
        layout: { blocks: [[-6.6, -24.6, 1.4, 1.4, 'glass']] }, bossPool: ['archon'], events: ['ambush', 'hint'] },
      { id: 'abyss.frozen', name: 'THE COLD AT THE BOTTOM', condition: 'frozen', tagline: 'THE DEEPEST PLACE IS NOT HOT. IT IS COLD.',
        layout: { blocks: [[6.6, -4.6, 1.4, 1.4, 'ice']] }, bossPool: ['archon'], events: ['elite', 'cursedlamp'] },
      { id: 'abyss.plague', name: 'THE FESTERING CIRCLE', condition: 'plague', tagline: 'THE CHAINS DRIP SOMETHING GREEN.',
        layout: { start: { x: 5.6, z: 13.6, face: PI }, blocks: [[1.6, -26.6, 1.4, 1.4, 'bones']] }, bossPool: ['archon'], events: ['survivor', 'hint'] },
    ],
  },
  marsh: {
    short: { start: { x: 3, z: -12, face: PI }, drop: ['bells'], cut: [[-16, -15, 20, 16]], open: ['graveGate'] },
    variants: [
      { id: 'marsh.frozen', name: 'THE MARSH FROZEN', condition: 'frozen', tagline: 'THE DROWNED BELLS ARE LOCKED IN ICE.',
        layout: { iceBridges: true, blocks: [[-4.4, -9.6, 1.6, 1.4, 'ice']] }, bossPool: ['bogmother'], events: ['ambush', 'hint'] },
      { id: 'marsh.bloodmoon', name: 'THE RED WATER', condition: 'bloodmoon', tagline: 'THE MARSH HAS TURNED THE COLOUR OF THE MOON.',
        layout: { blocks: [[7.6, -26.6, 1.4, 1.4, 'roots']] }, bossPool: ['bogmother'], events: ['elite', 'survivor'] },
      { id: 'marsh.fog', name: 'THE WEEPING FOG', condition: 'fog', tagline: 'YOU HEAR THE BELLS BEFORE YOU SEE THEM.',
        layout: { start: { x: 6.4, z: 12.6, face: PI }, blocks: [[-3.6, -26.4, 1.4, 1.4, 'roots']] }, bossPool: ['bogmother'], events: ['cursedlamp', 'hint'] },
    ],
  },
  spire: {
    short: { start: { x: 3, z: -12, face: PI }, drop: ['gears'], cut: [[-16, -15, 20, 16]], open: ['gearGate'] },
    variants: [
      { id: 'spire.burning', name: 'THE OVERHEATED WORKS', condition: 'burning', tagline: 'THE BEARINGS GLOW. THE OIL IS ALIGHT.',
        layout: { blocks: [[-4.4, -9.6, 1.6, 1.4, 'fire']] }, bossPool: ['clockmaster'], events: ['ambush', 'hint'] },
      { id: 'spire.storm', name: 'THE LIGHTNING ENGINE', condition: 'storm', tagline: 'THE WHEEL DRINKS THE STORM THROUGH ITS SPOKES.',
        ambience: { rain: 0, drizzle: 0 }, layout: { blocks: [[7.6, -26.6, 1.4, 1.4, 'rubble']] }, bossPool: ['clockmaster'], events: ['elite', 'cursedlamp'] },
      { id: 'spire.eclipse', name: 'THE STOPPED HOUR', condition: 'eclipse', tagline: 'EVERY CLOCK IN THE SPIRE STRUCK ZERO.',
        layout: { start: { x: 5.4, z: 12.6, face: PI }, blocks: [[-3.6, -26.4, 1.4, 1.4, 'rubble']] }, bossPool: ['clockmaster'], events: ['survivor', 'hint'] },
    ],
  },
  empyrean: {
    short: { start: { x: 3, z: -12, face: PI }, drop: ['choir'], cut: [[-16, -15, 20, 16]], open: ['choirGate'] },
    variants: [
      { id: 'empyrean.eclipse', name: 'THE UNLIT HEAVEN', condition: 'eclipse', tagline: 'THE HUB OF THE WHEEL, WITH THE LIGHT TAKEN OUT.',
        layout: { blocks: [[-4.4, -9.6, 1.6, 1.4, 'glass']] }, bossPool: ['wheel'], events: ['ambush', 'hint'] },
      { id: 'empyrean.ashfall', name: 'HEAVEN BURNING DOWN', condition: 'ashfall', tagline: 'THE FEATHERS FALL AS ASH.',
        layout: { blocks: [[7.6, -26.6, 1.4, 1.4, 'ash']] }, bossPool: ['wheel'], events: ['elite', 'survivor'] },
      { id: 'empyrean.bloodmoon', name: 'THE WOUNDED LIGHT', condition: 'bloodmoon', tagline: 'THE GOD IS BLEEDING INTO THE SKY.',
        layout: { start: { x: 5.4, z: 12.6, face: PI }, blocks: [[-3.6, -26.4, 1.4, 1.4, 'glass']] }, bossPool: ['wheel'], events: ['cursedlamp', 'hint'] },
    ],
  },
};

export const SHORT = Object.fromEntries(Object.entries(AREAS).map(([id, a]) => [id, a.short]));
export const VARIANTS = {};
for (const [level, a] of Object.entries(AREAS)) {
  VARIANTS[level] = a.variants.map((v) => {
    const C = CONDITIONS[v.condition];
    return { level, layout: {}, events: [], ...v, pool: { ...C.pool, ...(v.pool || {}) }, elements: v.elements || { ...C.elements } };
  });
}
export const variantsOf = (levelId) => VARIANTS[levelId] || [];
export const getVariant = (levelId, id) => variantsOf(levelId).find((v) => v.id === id || v.id === levelId + '.' + id) || null;

// ------------------------------------------------------------------ randomness (pure, seeded)
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asRng = (rng) => (typeof rng === 'function' ? rng : rng && typeof rng.next === 'function' ? () => rng.next() : rng && typeof rng.random === 'function' ? () => rng.random() : Math.random);
export function weighted(items, weights, rng) { const tot = weights.reduce((a, b) => a + b, 0); let r = asRng(rng)() * tot; for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }

// Picks a variant for an area. Prefers a condition this run has not met yet (every area should feel different from
// the last), and a variant holding the hint of a quest the run has active (so a started quest line can be followed).
export function pickVariant(levelId, rng, run) {
  const list = variantsOf(levelId); if (!list.length) return null;
  const R = asRng(rng); const seen = new Set((run && run.flags && run.flags.conditions) || []);
  const active = (run && run.quest && run.quest.active) || [];
  const w = list.map((v) => {
    let k = 1; if (seen.has(v.condition)) k *= 0.35;
    if (active.length && hintsIn(levelId, v, null, run).some((h) => active.includes(h.quest))) k *= 3;
    return k;
  });
  return weighted(list, w, R);
}

// ------------------------------------------------------------------ apply
const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
const inRect = (p, r) => p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3];
const inBlock = (p, b, pad = 0.6) => Math.abs(p.x - b[0]) < b[2] / 2 + pad && Math.abs(p.z - b[1]) < b[3] / 2 + pad;

// a foe after the condition: its substitute (if any, and never a blinker into a locked room) and its element
function dressFoe(f, v, C, R, locked) {
  let t = f.t; const sub = v.pool && v.pool[t];
  if (sub && R() < (v.swap ?? 0.7) && !(locked && BLINKERS.has(sub) && !BLINKERS.has(t))) t = sub;
  const out = { ...f, t };
  if (R() < (C.chance ?? 0.5)) out.element = weighted(Object.keys(v.elements), Object.values(v.elements), R);
  if (!out.elite && C.eliteChance && R() < C.eliteChance) out.elite = C.elite;
  return out;
}

// the loose foes nearest one another become an ambush: they wait unseen, then rise as a locked-in fight in two waves
function makeAmbush(def, foes, v, R) {
  if (foes.length < 2) return null;
  let best = null;
  for (const a of foes) { const g = foes.filter((b) => near(a, b, 7)); if (!best || g.length > best.length) best = g; }
  if (!best || best.length < 2) return null;
  const xs = best.map((f) => f.x), zs = best.map((f) => f.z);
  const zone = [Math.min(...xs) - 2.5, Math.min(...zs) - 2.5, Math.max(...xs) + 2.5, Math.max(...zs) + 2.5];
  const second = best.map((f) => ({ ...f, t: (v.pool && v.pool[f.t]) || f.t, element: f.element || weighted(Object.keys(v.elements), Object.values(v.elements), R) })).filter((f) => !BLINKERS.has(f.t));
  return { enc: { id: 'ambush', zone, gates: [], msg: 'AMBUSH! THEY WERE WAITING FOR YOU', done: 'THE AMBUSH IS BROKEN', waves: [{ foes: best }, ...(second.length ? [{ foes: second }] : [])], ambush: true }, taken: best };
}

// places a touch (a glowing prop) can stand: the loose and encounter foes' spots (all on reachable floor) and the
// spots beside the lamps, away from blocks, the start, lamps, chests and other touches
function touchSpots(def, blocks, taken) {
  const c = [];
  for (const f of def.foes || []) c.push({ x: f.x, z: f.z });
  for (const e of def.encounters || []) for (const w of e.waves) for (const f of w.foes) c.push({ x: f.x, z: f.z });
  const avoid = [def.start, ...(def.lamps || []), ...(def.items || []), ...taken];
  return c.filter((p) => !blocks.some((b) => inBlock(p, b, 1)) && !avoid.some((a) => near(a, p, 3.2)) && !(def.boss && inRect(p, def.boss.zone)));
}

export function applyVariant(def, variant, opts = {}) {
  if (!def) return def;
  const v = variant || null; const C = v ? CONDITIONS[v.condition] : null;
  const R = mulberry(hashStr((v ? v.id : def.id) + ':' + (opts.seed ?? 0)));
  const layout = { ...(v ? v.layout : {}), short: !!(opts.short ?? (v && v.layout && v.layout.short)) };
  const out = { ...def, base: def, variant: v, layout, condition: v ? v.condition : null, conditionName: C ? C.name : null };
  if (v) { out.tagline = v.tagline || def.tagline; out.variantName = v.name; out.bossPool = (v.bossPool || [def.boss && def.boss.type]).slice(); }
  // ambience: the place's own, the condition's override, the variant's own last
  if (C) {
    const base = def.ambience || {}; let amb = { ...base, ...C.ambience(base, def.id), ...(v.ambience || {}) };
    if (NO_RAIN.has(def.id)) { amb.rain = 0; amb.drizzle = 0; amb.lightning = false; if (!amb.weather) amb.weather = base.weather || 'dust'; }
    if (base.background !== undefined && amb.fog !== base.fog) amb.background = mixHex(base.background, amb.fog, 0.5);
    out.ambience = amb;
  }
  // the run cut
  const S = layout.short ? SHORT[def.id] : null;
  let encounters = (def.encounters || []).slice(); let foes = (def.foes || []).slice();
  const gatesOpen = new Set(def.gatesOpen || []);
  if (S) {
    for (const e of encounters) if (S.drop.includes(e.id)) for (const g of e.opens || []) gatesOpen.add(g);
    for (const g of S.open || []) gatesOpen.add(g);
    encounters = encounters.filter((e) => !S.drop.includes(e.id));
    foes = foes.filter((f) => !S.cut.some((r) => inRect(f, r)));
    out.start = { ...(layout.shortStart || S.start) };
    out.hints = (def.hints || []).filter((h) => !S.cut.some((r) => inRect({ x: (h.zone[0] + h.zone[2]) / 2, z: (h.zone[1] + h.zone[3]) / 2 }, r)));
  } else if (layout.start) out.start = { ...layout.start };
  for (const g of layout.gatesOpen || []) gatesOpen.add(g);
  out.gatesOpen = [...gatesOpen];
  const blocks = (layout.blocks || []).slice();
  // foes: blocks never stand on a foe (a foe under a block is dropped), then the condition dresses them
  foes = foes.filter((f) => !blocks.some((b) => inBlock(f, b, 0.5)));
  if (C) {
    foes = foes.map((f) => dressFoe(f, v, C, R, false));
    encounters = encounters.map((e) => ({ ...e, waves: e.waves.map((w) => ({ ...w, foes: w.foes.filter((f) => !blocks.some((b) => inBlock(f, b, 0.5))).map((f) => dressFoe(f, v, C, R, true)) })) }));
  }
  // in-level events
  const evs = v ? v.events : []; const touches = []; const hints = (out.hints || def.hints || []).slice();
  if (evs.includes('ambush')) { const a = makeAmbush(def, foes, v, R); if (a) { encounters.push(a.enc); foes = foes.filter((f) => !a.taken.includes(f)); } }
  if (evs.includes('elite') && foes.length) {
    const i = Math.floor(R() * foes.length); const f = foes[i];
    foes[i] = { ...f, elite: (C && C.elite) || 'hasted', wander: true, tier: (f.tier ?? def.tier ?? 0) + 1 };
    out.elite = { x: f.x, z: f.z, affix: foes[i].elite };
  }
  const spots = touchSpots({ ...def, foes, encounters }, blocks, []);
  const take = (kind, id, text, near2) => {
    const pool = spots.filter((p) => !touches.some((t) => near(t, p, 4)));
    if (!pool.length) return null; const p = pool[Math.floor(R() * pool.length)];
    const t = { id, kind, x: p.x, z: p.z, r: 1.1, text, near: near2 }; touches.push(t); return t;
  };
  if (evs.includes('survivor')) take('survivor', 'ev:survivor:' + def.id, 'A HUSHED, CHAINED TO THE STONES. FREE THEM?', 'SOMEONE IS RATTLING A CHAIN NEARBY.');
  if (evs.includes('cursedlamp')) take('cursedlamp', 'ev:cursedlamp:' + def.id, 'A LAMP BURNS WITH A VIOLET FLAME.', 'A LAMP NEARBY BURNS THE WRONG COLOUR.');
  // the side quests' hints placed in this variant (quests.js), filtered by the save when one is given
  if (v && evs.includes('hint')) {
    for (const h of hintsIn(def.id, v, opts.meta || null, opts.run || null)) {
      const p = (h.x !== undefined && !blocks.some((b) => inBlock(h, b, 1))) ? h : null;
      const t = p ? { id: h.id, kind: h.kind, x: p.x, z: p.z, r: 1.1, text: h.text, near: h.near, quest: h.quest } : take(h.kind, h.id, h.text, h.near);
      if (t && p) touches.push(t); if (t) t.quest = h.quest;
    }
  }
  // a soft line as the hero comes near a touch: how a player notices them
  for (const t of touches) if (t.near) hints.push({ zone: [t.x - 5.5, t.z - 5.5, t.x + 5.5, t.z + 5.5], text: t.near, life: 3.5 });
  if (C && !S) hints.unshift({ zone: [out.start.x - 3, out.start.z - 3, out.start.x + 3, out.start.z + 3], text: C.name + ': ' + C.line, life: 4.5 });
  out.foes = foes; out.encounters = encounters; out.touches = touches; out.hints = hints;
  // the build: the district's own, then kit_var lays the condition, the blocks and the touches (K.variantDress)
  const baseBuild = def.build;
  out.build = function (K, ctx) { ctx.variant = v; ctx.layout = layout; baseBuild.call(this, K, ctx); if (K.variantDress) K.variantDress(K, ctx, this); };
  return out;
}

// the run remembers which conditions it met (pickVariant prefers new ones): call after an area is entered
export function noteVariant(run, variant) { if (!run || !variant) return; run.flags = run.flags || {}; const c = run.flags.conditions = run.flags.conditions || []; if (!c.includes(variant.condition)) c.push(variant.condition); }
