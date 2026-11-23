// Who speaks in the cutscenes, in which colour, and how a character looks when the game has no body for
// them yet (a warden who has not been registered in heroes.js, the crow-masked warden at the gate, Tam,
// the Voice in the Bell). Pure data.

// speaker key -> name and colour of the name over the line (a registered warden takes the name from heroes.js)
export const SPEAKERS = {
  warden: { name: 'CARMINE', color: '#f0625e' },
  huntress: { name: 'VESPER', color: '#6cd8b8' },
  bellbreaker: { name: 'BRAM', color: '#eab070' },
  lamplighter: { name: 'SISTER ASH', color: '#f6e09a' },
  kestrel: { name: 'KESTREL', color: '#f080b0' },
  hollis: { name: 'HOLLIS', color: '#88bcf0' },
  wren: { name: 'MOTHER WREN', color: '#c8a8f8' },
  crow: { name: 'THE CROW-MASKED WARDEN', color: '#b4bac4' },
  tam: { name: 'TAM', color: '#d8d0c0' },
  voice: { name: 'THE VOICE IN THE BELL', color: '#ffe8a8' },
  // bosses (BOSS_LINES and the scenes): the key is the boss type
  gaoler: { name: 'THE GAOLER', color: '#e8a050' },
  tallow: { name: 'MOTHER TALLOW', color: '#f0d8a0' },
  harbormaster: { name: 'THE HARBORMASTER', color: '#70c8c0' },
  deacon: { name: 'THE DROWNED DEACON', color: '#60e0d0' },
  ossuary: { name: 'THE OSSUARY KNIGHT', color: '#d8d0b8' },
  founder: { name: 'THE BELLFOUNDER', color: '#ff9040' },
  regent: { name: 'THE PALE REGENT', color: '#e0d8f0' },
  silence: { name: 'SAINT SILENCE', color: '#f4f2ff' },
  frostgiant: { name: 'THE HOARFROST KING', color: '#a8e0ff' },
  sandwyrm: { name: 'ASHMAW', color: '#f0b060' },
  lich: { name: 'ABBOT MORROW', color: '#90f080' },
  archon: { name: 'THE HOLLOW ARCHON', color: '#ff6a48' },
  bogmother: { name: 'THE BOG MOTHER', color: '#a0c870' },
  clockmaster: { name: 'THE CLOCKMASTER', color: '#e8c870' },
  wheel: { name: 'THE WHEEL', color: '#ff5030' },
};

const dark = 0x14141a;
// Looks for characters with no body in the game yet. A warden registered in heroes.js uses their real look;
// until then (or for those who never fight) these stand in. Rig options: see js/actors/rig.js.
export const FALLBACK_LOOKS = {
  // twin knives, a gaol-grey shift, dark red hair
  kestrel: { weapon: 'saber', longHair: true, extra: (rig, part, box) => part('haL', box(0.04, 0.025, 0.42), 0xc8d0d8, 0, -0.06, 0.24), colors: { skin: 0xd0a890, hair: 0x7a1e1e, tunic: 0x5a5a60, pants: 0x34343a, boots: 0x1a1816, glove: 0x2a2220, belt: 0x4a3a2a } },
  // anchor and chain, a drowned bellman's oilskin, sea-grey skin
  hollis: { weapon: 'hammer', blade: 0x3a4048, hat: 'brim', bulk: 1.18, colors: { skin: 0x8a9aa0, hair: 0x2a3034, tunic: 0x2a4048, pants: 0x1e2a30, boots: 0x101418, hat: 0x1a2a30, glove: 0x34424a, belt: 0x3a3428 } },
  // the sung staff, a choir-witch's violet robe
  wren: { weapon: 'staff', orb: 0xc0a0ff, hood: true, skirt: 0x2e2040, colors: { skin: 0xd8c0b0, hair: 0xb8b0c0, tunic: 0x3a2850, pants: 0x241a30, boots: 0x14101a, hood: 0x3a2850, glove: 0x2a2034 } },
  // the warden at the gate: a Bell Warden's mail and shield under a crow's beaked mask
  crow: { weapon: 'sword', offhand: 'shield', eyes: 0xff4030, mask: dark, hood: true, cloak: true,
    extra: (rig, part, box) => { part('head', box(0.07, 0.07, 0.24), 0x22201e, 0, 0.1, 0.2); part('head', box(0.05, 0.04, 0.12), 0x34302a, 0, 0.06, 0.3); },
    colors: { skin: 0x3a3438, tunic: 0x30343c, pants: 0x1c1e24, boots: 0x101114, shoulder: 0x4a505a, glove: 0x2a2e36, cloak: 0x18181e, cloakDark: 0x111116, hood: 0x18181e }, bulk: 1.1 },
  // Vesper's brother, one of the Hushed: small, hooded, no blade
  tam: { weapon: 'none', hood: true, eyes: 0xff2a20, scale: 0.78, freed: { hood: false, colors: { skin: 0xe0c0a8, hair: 0x2a1c18, tunic: 0x4a6a60, pants: 0x34403c, boots: 0x201c18, glove: 0xd0b098 } }, colors: { skin: 0x5a5458, tunic: 0x343844, pants: 0x24262e, boots: 0x16161a, hood: 0x30343e, glove: 0x24262c } },
  // a Hushed after the toll: the red gone from the eyes
  freed: { weapon: 'none', hood: false, colors: { skin: 0xd8b8a0, hair: 0x6a5040, tunic: 0x7a6a58, pants: 0x4a4440, boots: 0x2a2420, glove: 0xb89880 } },
  // a Hushed in the city: hooded, red-eyed, no blade (the scenes never arm them)
  hushed: { weapon: 'none', hood: true, eyes: 0xff2a20, colors: { skin: 0x4a4448, tunic: 0x2a2e38, pants: 0x1e2028, boots: 0x121216, hood: 0x252933, glove: 0x181a20 } },
  // the Voice in the Bell: a tall figure of light
  voice: { weapon: 'none', hood: true, eyes: 0xfff0c0, scale: 1.5, skirt: 0xfff4d0, colors: { skin: 0xfff4d8, tunic: 0xfff0c8, pants: 0xf8e8c0, boots: 0xe8d8b0, hood: 0xfff4d8, glove: 0xfff4d8 } },
  // a boss whose body has not been built yet: a hooded giant in the boss's colour
  boss: { weapon: 'staff', orb: 0xff5030, hood: true, eyes: 0xff5030, scale: 1.7, cloak: true, colors: { skin: 0x3a3034, tunic: 0x2a1c20, pants: 0x1a1416, boots: 0x0e0c0c, hood: 0x2a1c20, cloak: 0x3a1418, cloakDark: 0x2a0e12, glove: 0x2a2020 } },
};

// the wardens in their usual order (the new ones may not be registered in heroes.js yet)
export const WARDENS = ['warden', 'huntress', 'bellbreaker', 'lamplighter', 'kestrel', 'hollis', 'wren'];
// who brings each warden in (the boss whose fall frees them) and where
export const JOINS = { kestrel: 'gate', lamplighter: 'market', hollis: 'docks', wren: 'nave' };
