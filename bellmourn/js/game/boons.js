// The in-run build: boons of the seven Resonances (RUN_DESIGN.md section 3). Pure data and pure functions
// (no DOM): runs in the browser and in Node tests.
//
// - BOONS: every boon def { id, name, res, slot, tier, kind, needs?, duo?, fits?, desc, stat, values }.
//   values: the boon's number at each rarity (what `stat` prints as {v}); sim_boons.js gives it meaning.
// - Chains: tier I is open; tier II needs 2 boons of its Resonance held; tier III needs 4 and a tier II;
//   the CROWN needs 6 and a tier III. A DUO needs one boon of each of its two Resonances.
// - offerBoons(run, rng, n, ctx): n weighted offers the warden can use, favouring a chain, still varied.
// - addBoon / upgradeBoon edit run.boons ([{ id, rarity }]); boonMods(run) -> the mods the sim reads.
//
// PROPOSAL: every name, line and number below (RES names, boon names, desc, stat texts, the numbers).
import { HEROES, ABILITIES } from './heroes.js';

// ------------------------------------------------------------------ the seven Resonances
// col: the UI colour; rgb: the renderer's bright-additive colour; el: the element the sim works with;
// status: what it leaves on a foe; pix: a 7x7 glyph for the screens (E draws it in its own style)
export const RES = {
  ember: { id: 'ember', name: 'EMBER', el: 'fire', status: 'burn', col: '#ff7a2a', dark: '#5a1a06', rgb: [3.0, 1.2, 0.25], fantasy: 'FIRE THAT SPREADS AND BURSTS.',
    pix: ['...#...', '..##...', '..###..', '.#####.', '.##.##.', '.#...#.', '..###..'] },
  rime: { id: 'rime', name: 'RIME', el: 'frost', status: 'chill', col: '#8fdcff', dark: '#103a50', rgb: [1.1, 2.1, 3.0], fantasy: 'CHILL, FREEZE, SHATTER.',
    pix: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'] },
  blight: { id: 'blight', name: 'BLIGHT', el: 'poison', status: 'poison', col: '#9ee04a', dark: '#22400a', rgb: [0.9, 2.4, 0.35], fantasy: 'ROT THAT STACKS AND SPREADS.',
    pix: ['..###..', '.#####.', '##.#.##', '#######', '.##.##.', '..#.#..', '.#.#.#.'] },
  thunder: { id: 'thunder', name: 'THUNDER', el: 'storm', status: 'shock', col: '#ffe066', dark: '#4a3a08', rgb: [2.6, 2.4, 1.0], fantasy: 'LIGHTNING THAT LEAPS FROM FOE TO FOE.',
    pix: ['....##.', '...##..', '..##...', '.#####.', '...##..', '..##...', '.##....'] },
  crimson: { id: 'crimson', name: 'CRIMSON', el: 'blood', status: 'bleed', col: '#ff3048', dark: '#4a0610', rgb: [2.8, 0.25, 0.35], fantasy: 'BLEED THEM, DRINK, ENDURE.',
    pix: ['...#...', '...#...', '..###..', '.#####.', '.#####.', '.##.##.', '..###..'] },
  dawn: { id: 'dawn', name: 'DAWN', el: 'holy', status: 'smite', col: '#ffe8a8', dark: '#4a3a18', rgb: [3.0, 2.6, 1.5], fantasy: 'SHIELDS OF LIGHT, SMITING FROM ABOVE.',
    pix: ['#..#..#', '.#.#.#.', '..###..', '###.###', '..###..', '.#.#.#.', '#..#..#'] },
  silence: { id: 'silence', name: 'SILENCE', el: 'void', status: 'mark', col: '#b070ff', dark: '#24083a', rgb: [1.5, 0.45, 2.6], fantasy: 'MARK THE WEAK, UNMAKE THEM.',
    pix: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'] },
};
export const RES_ORDER = ['ember', 'rime', 'blight', 'thunder', 'crimson', 'dawn', 'silence'];
// element (sim / foes) -> Resonance
export const EL_RES = { fire: 'ember', frost: 'rime', poison: 'blight', storm: 'thunder', blood: 'crimson', holy: 'dawn', void: 'silence' };
export const ELEMENTS = Object.keys(EL_RES);

export const RARITY = {
  common: { name: 'COMMON', w: 62, col: '#c8c4bc' },
  rare: { name: 'RARE', w: 27, col: '#5ab0ff' },
  epic: { name: 'EPIC', w: 9, col: '#c070ff' },
  legendary: { name: 'LEGENDARY', w: 2, col: '#ffb030' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
export const SLOTS = { attack: { name: 'ATTACK' }, dash: { name: 'DASH' }, skill: { name: 'SKILL' }, ult: { name: 'ULTIMATE' }, passive: { name: 'PASSIVE' } };
export const SLOT_ORDER = ['attack', 'dash', 'skill', 'ult', 'passive'];
// how many boons of a Resonance a tier asks for (and the tier below it it needs held)
export const CHAIN = { 2: { held: 2 }, 3: { held: 4, tier: 2 }, crown: { held: 6, tier: 3 } };

// ------------------------------------------------------------------ the boons
// [id, slot, tier (1-3, 'crown'), name, desc, stat ({v}: the value; {p}: as a percent), values [c, r, e, l], extra]
const V = (c, r, e, l) => ({ common: c, rare: r, epic: e, legendary: l });
const DEFS = {
  ember: [
    ['ember_edge', 'attack', 1, 'CINDER EDGE', 'YOUR ATTACKS SET FOES ALIGHT.', '{p} CHANCE TO BURN', V(0.3, 0.4, 0.5, 0.65)],
    ['ember_wake', 'dash', 1, 'ASH WAKE', 'YOUR DASH LEAVES A TRAIL OF FIRE.', '{v} FIRE DAMAGE A SECOND', V(7, 9, 12, 16)],
    ['ember_rite', 'skill', 1, 'KINDLED RITE', 'YOUR SKILLS BURST INTO FLAME WHERE THEY LAND.', '{v} FIRE DAMAGE', V(14, 19, 25, 34)],
    ['ember_pyre', 'passive', 1, 'PYRE-BORN', 'BURNING FOES TAKE MORE FROM YOU.', '+{p} DAMAGE TO THE BURNING', V(0.15, 0.2, 0.26, 0.34)],
    ['ember_fall', 'ult', 2, 'THE GREAT FIRE', 'YOUR ULTIMATE RAINS FIRE ON EVERY FOE AROUND YOU.', '{v} DAMAGE A FALLING STAR', V(22, 28, 36, 48)],
    ['ember_flash', 'attack', 2, 'FLASHPOINT', 'THE LAST BLOW OF A COMBO, OR EVERY FOURTH SHOT, ERUPTS IN FIRE.', '{v} FIRE DAMAGE', V(16, 21, 28, 38)],
    ['ember_funeral', 'passive', 2, 'FUNERAL PYRE', 'BURNING FOES BURST INTO FLAME WHEN THEY FALL.', '{v} FIRE DAMAGE', V(18, 24, 32, 44)],
    ['ember_wildfire', 'passive', 3, 'WILDFIRE', 'FIRE LEAPS FROM THE BURNING TO THE FOES BESIDE THEM. BURNS BITE HARDER.', '{p} CHANCE TO SPREAD', V(0.3, 0.4, 0.5, 0.6)],
    ['ember_comet', 'dash', 3, 'COMET', 'EVERY DASH ENDS IN AN EXPLOSION.', '{v} FIRE DAMAGE', V(26, 34, 44, 58)],
    ['ember_crown', 'passive', 'crown', 'CROWN OF CINDERS', 'YOU WALK WREATHED IN FIRE. EVERY BURN BITES HALF AGAIN.', '{v} FIRE DAMAGE A SECOND AROUND YOU', V(8, 10, 13, 17)],
  ],
  rime: [
    ['rime_edge', 'attack', 1, 'HOARFROST EDGE', 'YOUR ATTACKS CHILL. THE THIRD CHILL FREEZES.', '{p} CHANCE TO CHILL', V(0.5, 0.65, 0.8, 1)],
    ['rime_step', 'dash', 1, 'WHITE STEP', 'YOUR DASH LEAVES FROST CRYSTALS THAT BURST.', '{v} FROST DAMAGE', V(8, 11, 14, 19)],
    ['rime_rite', 'skill', 1, 'WINTER RITE', 'YOUR SKILLS CHILL ALL THEY STRIKE.', '{v} CHILL A HIT', V(1, 2, 2, 3)],
    ['rime_bite', 'passive', 1, 'COLD BITE', 'CHILLED FOES TAKE MORE FROM YOU. FROZEN FOES, TWICE THAT.', '+{p} DAMAGE TO THE CHILLED', V(0.12, 0.16, 0.21, 0.28)],
    ['rime_blizzard', 'ult', 2, 'BLIZZARD', 'YOUR ULTIMATE BECOMES A BLIZZARD THAT RAGES ON AFTER IT.', '{v} FROST DAMAGE A TICK', V(6, 8, 10, 14)],
    ['rime_shatter', 'attack', 2, 'SHATTER', 'STRIKE A FROZEN FOE TO SHATTER THE ICE OVER EVERYTHING NEAR.', '{v} FROST DAMAGE', V(24, 32, 42, 56)],
    ['rime_mail', 'passive', 2, 'RIME MAIL', 'YOU TAKE LESS HURT, AND WHAT STRIKES YOU IS CHILLED.', '-{p} DAMAGE TAKEN', V(0.08, 0.11, 0.14, 0.18)],
    ['rime_tomb', 'skill', 3, 'ICE TOMB', 'YOUR SKILLS FREEZE WHAT THEY STRIKE OUTRIGHT.', '{v}S FREEZE', V(1.4, 1.8, 2.2, 2.8)],
    ['rime_still', 'dash', 3, 'STILL WATER', 'A PERFECT DODGE FREEZES EVERYTHING AROUND YOU.', '{v} M OF ICE', V(3, 3.5, 4, 4.8)],
    ['rime_crown', 'passive', 'crown', 'CROWN OF WINTER', 'TWO CHILLS FREEZE. THE FROZEN DEAD SHATTER INTO SHARDS. THE COLD SLOWS ALL NEAR YOU.', '{v} SHARD DAMAGE', V(14, 18, 24, 32)],
  ],
  blight: [
    ['blight_edge', 'attack', 1, 'ROT-TOUCHED', 'YOUR ATTACKS POISON, AND POISON STACKS.', '{p} CHANCE TO POISON', V(0.4, 0.5, 0.62, 0.8)],
    ['blight_step', 'dash', 1, 'MIASMA STEP', 'YOUR DASH LEAVES A CLOUD OF ROT.', '{v} POISON A SECOND', V(5, 7, 9, 12)],
    ['blight_rite', 'skill', 1, 'PLAGUE RITE', 'YOUR SKILLS LEAVE A LINGERING CLOUD WHERE THEY LAND.', '{v} POISON A SECOND', V(6, 8, 11, 15)],
    ['blight_wither', 'passive', 1, 'WITHERING', 'POISONED FOES STRIKE YOU MORE WEAKLY.', '-{p} DAMAGE FROM THE POISONED', V(0.12, 0.16, 0.2, 0.26)],
    ['blight_pest', 'ult', 2, 'PESTILENCE', 'YOUR ULTIMATE RELEASES A PLAGUE THAT FOLLOWS YOU.', '{v} POISON A SECOND', V(7, 9, 12, 16)],
    ['blight_virul', 'attack', 2, 'VIRULENCE', 'POISON STACKS HIGHER AND BITES HARDER.', '+{v} STACKS', V(2, 2, 3, 4)],
    ['blight_contagion', 'passive', 2, 'CONTAGION', 'THE POISONED DEAD BREAK INTO A CLOUD OF ROT.', '{v} POISON A SECOND', V(6, 8, 11, 15)],
    ['blight_bloom', 'skill', 3, 'BLACK BLOOM', 'YOUR SKILLS RIPEN EVERY POISON THEY TOUCH: IT ALL LANDS AT ONCE.', '{p} OF THE POISON LEFT', V(0.6, 0.8, 1, 1.3)],
    ['blight_necro', 'passive', 3, 'NECROSIS', 'EACH STACK OF POISON MAKES A FOE TAKE MORE FROM EVERYTHING.', '+{p} DAMAGE A STACK', V(0.04, 0.05, 0.065, 0.085)],
    ['blight_crown', 'passive', 'crown', 'CROWN OF ROT', 'ROT POURS FROM YOU. EVERY TICK OF POISON FEEDS YOU.', '{v} HEALTH A TICK', V(0.4, 0.6, 0.8, 1.1)],
  ],
  thunder: [
    ['thunder_edge', 'attack', 1, 'STORMCALLER', 'YOUR ATTACKS CALL LIGHTNING THAT LEAPS TO TWO MORE FOES.', '{p} CHANCE TO CHAIN', V(0.22, 0.3, 0.38, 0.5)],
    ['thunder_step', 'dash', 1, 'LIGHTNING STEP', 'YOUR DASH LEAVES A CRACKLING LINE THAT STRIKES WHAT IT CROSSES.', '{v} LIGHTNING DAMAGE', V(10, 14, 18, 24)],
    ['thunder_rite', 'skill', 1, 'THUNDER RITE', 'YOUR SKILLS CALL A BOLT DOWN ON THE NEAREST FOES.', '{v} LIGHTNING DAMAGE', V(18, 24, 31, 42)],
    ['thunder_charge', 'passive', 1, 'CHARGED', 'SHOCKED FOES TAKE MORE FROM YOU.', '+{p} DAMAGE TO THE SHOCKED', V(0.12, 0.16, 0.21, 0.28)],
    ['thunder_tempest', 'ult', 2, 'TEMPEST', 'YOUR ULTIMATE CALLS A STORM: BOLTS FALL ON EVERY FOE NEAR YOU.', '{v} DAMAGE A BOLT', V(14, 18, 24, 32)],
    ['thunder_fork', 'attack', 2, 'FORKED', 'YOUR LIGHTNING LEAPS FURTHER, TO MORE FOES, MORE OFTEN.', '+{v} LEAPS', V(2, 2, 3, 4)],
    ['thunder_over', 'passive', 2, 'OVERCHARGE', 'EVERY KILL LETS LOOSE A NOVA OF LIGHTNING.', '{v} LIGHTNING DAMAGE', V(16, 22, 28, 38)],
    ['thunder_head', 'skill', 3, 'THUNDERHEAD', 'YOUR SKILLS LEAVE A STORM CLOUD THAT STRIKES THE FOES UNDER IT.', '{v} DAMAGE A STRIKE', V(14, 18, 24, 32)],
    ['thunder_bolt', 'skill', 3, 'LIVING BOLT', 'YOUR MOVEMENT SKILL BECOMES LIGHTNING: IT SCORCHES ALL ALONG ITS PATH.', '{v} LIGHTNING DAMAGE', V(24, 32, 42, 56), { fits: { move: true } }],
    ['thunder_crown', 'passive', 'crown', 'CROWN OF STORMS', 'A BOLT FALLS ON A FOE NEAR YOU EVERY MOMENT. EVERY HIT SHOCKS.', '{v} DAMAGE A BOLT', V(16, 21, 28, 38)],
  ],
  crimson: [
    ['crimson_edge', 'attack', 1, 'RED EDGE', 'YOUR ATTACKS OPEN BLEEDING WOUNDS.', '{p} CHANCE TO BLEED', V(0.35, 0.45, 0.55, 0.7)],
    ['crimson_rush', 'dash', 1, 'BLOOD RUSH', 'DASH THROUGH FOES TO CUT THEM OPEN.', '{v} DAMAGE', V(10, 14, 18, 24)],
    ['crimson_rite', 'skill', 1, 'BLOOD RITE', 'YOUR SKILLS DRINK: THEY HEAL YOU FOR PART OF WHAT THEY DEAL.', '{p} LIFE STOLEN', V(0.05, 0.065, 0.08, 0.11)],
    ['crimson_thirst', 'passive', 1, 'THIRST', 'EVERY BLOW YOU LAND HEALS YOU A LITTLE.', '{p} LIFE STOLEN', V(0.015, 0.022, 0.03, 0.04)],
    ['crimson_requiem', 'ult', 2, 'RED REQUIEM', 'EVERY BLOW OF YOUR ULTIMATE DRINKS, AND LEAVES THEM BLEEDING.', '{p} HEALTH A BLOW', V(0.008, 0.011, 0.014, 0.018)],
    ['crimson_hemo', 'attack', 2, 'HEMORRHAGE', 'THE LAST BLOW OF YOUR COMBO TEARS EVERY BLEED OPEN AT ONCE.', '{v} DAMAGE A BLEED', V(14, 19, 25, 34), { fits: { attack: 'combo' } }],
    ['crimson_motes', 'passive', 2, 'BLOOD MOTES', 'THE DEAD GIVE UP A MOTE OF BLOOD THAT FLIES TO YOU.', '{v} HEALTH A MOTE', V(2, 3, 4, 5)],
    ['crimson_price', 'passive', 3, 'BLOOD PRICE', 'BELOW HALF HEALTH YOU HIT HARDER, AND DRINK TWICE AS DEEP.', '+{p} DAMAGE', V(0.2, 0.26, 0.34, 0.45)],
    ['crimson_bound', 'passive', 3, 'BLOODBOUND', 'HEALING PAST FULL HEALTH HARDENS INTO A SHIELD OF BLOOD.', 'UP TO {p} OF YOUR HEALTH', V(0.15, 0.2, 0.25, 0.32)],
    ['crimson_crown', 'passive', 'crown', 'CROWN OF THORNS', 'BLEEDS STACK TO FIVE, AND EVERY DROP THEY SHED IS YOURS.', '{v} HEALTH A TICK', V(0.8, 1.1, 1.4, 1.9)],
  ],
  dawn: [
    ['dawn_edge', 'attack', 1, 'SUNLIT EDGE', 'YOUR ATTACKS MAY CALL A SMITE OF LIGHT FROM ABOVE.', '{p} CHANCE TO SMITE', V(0.12, 0.16, 0.2, 0.26)],
    ['dawn_step', 'dash', 1, 'DAYBREAK', 'EVERY DASH LAYS A SHIELD OF LIGHT OVER YOU.', '{v} SHIELD', V(5, 7, 9, 12)],
    ['dawn_rite', 'skill', 1, 'DAWN RITE', 'EVERY SKILL LAYS A SHIELD OF LIGHT OVER YOU.', '{v} SHIELD', V(6, 8, 11, 14)],
    ['dawn_halo', 'passive', 1, 'HALO', 'A SHIELD OF LIGHT REGROWS WHEN NOTHING HAS STRUCK YOU FOR A WHILE.', '{v} SHIELD', V(10, 13, 17, 22)],
    ['dawn_sunrise', 'ult', 2, 'SUNRISE', 'YOUR ULTIMATE ENDS IN A SMITE ON EVERY FOE NEAR, AND FILLS YOUR SHIELD.', '{v} HOLY DAMAGE', V(30, 40, 52, 70)],
    ['dawn_judge', 'attack', 2, 'JUDGEMENT', 'EVERY FIFTH BLOW SMITES, AND THE SMITTEN REEL.', '{v} HOLY DAMAGE', V(22, 29, 38, 50)],
    ['dawn_radiance', 'passive', 2, 'RADIANCE', 'WHEN YOUR SHIELD BREAKS, IT BURSTS IN SEARING LIGHT.', '{v} HOLY DAMAGE', V(20, 26, 34, 46)],
    ['dawn_sanct', 'skill', 3, 'SANCTUARY', 'YOUR SKILLS LEAVE A CIRCLE OF LIGHT. INSIDE IT YOU TAKE LESS, AND FOES ARE SMITTEN.', '-{p} DAMAGE TAKEN INSIDE', V(0.15, 0.2, 0.25, 0.3)],
    ['dawn_aegis', 'passive', 3, 'AEGIS', 'WHILE SHIELDED YOU HIT HARDER, AND YOUR SHIELD HOLDS MORE.', '+{p} DAMAGE WHILE SHIELDED', V(0.15, 0.2, 0.26, 0.34)],
    ['dawn_crown', 'passive', 'crown', 'CROWN OF DAWN', 'WHILE SHIELDED, EVERY BLOW SMITES. THE SHIELD REGROWS SOONER.', '{v} HOLY DAMAGE', V(14, 18, 24, 32)],
  ],
  silence: [
    ['silence_edge', 'attack', 1, 'HOLLOW EDGE', 'YOUR ATTACKS MARK FOES FOR THE VOID.', '{p} CHANCE TO MARK', V(0.45, 0.55, 0.68, 0.85)],
    ['silence_veil', 'dash', 1, 'VANISH', 'AFTER A DASH YOU ARE VEILED: YOUR NEXT BLOW IS CRITICAL AND MARKS DEEP.', '{v}S VEIL', V(1, 1.2, 1.5, 1.9)],
    ['silence_rite', 'skill', 1, 'NULL RITE', 'YOUR SKILLS MARK ALL THEY STRIKE.', '{v} MARK A HIT', V(1, 2, 2, 3)],
    ['silence_quiet', 'passive', 1, 'THE QUIET', 'MARKED FOES BELOW HALF HEALTH TAKE MORE FROM YOU.', '+{p} DAMAGE', V(0.2, 0.26, 0.33, 0.42)],
    ['silence_hush', 'ult', 2, 'THE GREAT HUSH', 'YOUR ULTIMATE ENDS IN A RIFT THAT DRAGS FOES IN AND UNMAKES THE WEAK.', 'UNMAKES BELOW {p} HEALTH', V(0.25, 0.3, 0.35, 0.42)],
    ['silence_exec', 'attack', 2, 'EXECUTION', 'YOUR BLOWS ON MARKED FOES BELOW A THIRD OF THEIR HEALTH LAND FAR HARDER.', '+{p} DAMAGE', V(0.8, 1.1, 1.4, 1.8)],
    ['silence_unmake', 'passive', 2, 'UNMAKING', 'A FOE MARKED THREE TIMES COLLAPSES INTO THE VOID.', '{v} VOID DAMAGE', V(26, 34, 44, 58)],
    ['silence_gate', 'skill', 3, 'VOID GATE', 'YOUR SKILLS TEAR A SMALL RIFT WHERE THEY LAND. IT DRAGS FOES IN, THEN CLOSES.', '{v} VOID DAMAGE', V(16, 22, 28, 38)],
    ['silence_shadow', 'dash', 3, 'SHADOWLESS', 'YOUR DASH PASSES THROUGH FOES AND CUTS THEM WITH THE VOID.', '{v} VOID DAMAGE', V(18, 24, 31, 42)],
    ['silence_crown', 'passive', 'crown', 'CROWN OF SILENCE', 'THE WEAKEST DIE AT YOUR TOUCH. GREAT FOES NEAR THEIR END TAKE FAR MORE.', 'BELOW {p} HEALTH', V(0.14, 0.17, 0.2, 0.24)],
  ],
};
// [id, resA, resB, name, desc, stat, values]
const DUOS = [
  ['duo_steam', 'ember', 'rime', 'STEAM BURST', 'FIRE ON THE CHILLED, OR FROST ON THE BURNING, BURSTS INTO BLINDING STEAM.', '{v} DAMAGE', V(18, 24, 31, 42)],
  ['duo_firedamp', 'ember', 'blight', 'FIREDAMP', 'SETTING A POISONED FOE ALIGHT DETONATES ITS POISON.', '{v} FIRE DAMAGE', V(20, 26, 34, 46)],
  ['duo_plasma', 'ember', 'thunder', 'PLASMA', 'YOUR LIGHTNING SETS FOES ALIGHT, AND LEAPS ONCE MORE FROM THE BURNING.', '{p} BURN POWER', V(0.3, 0.4, 0.5, 0.65)],
  ['duo_boil', 'ember', 'crimson', 'BOILING BLOOD', 'A FOE THAT BURNS AND BLEEDS SUFFERS MORE FROM BOTH.', '+{p} BURN AND BLEED', V(0.3, 0.4, 0.5, 0.65)],
  ['duo_solar', 'ember', 'dawn', 'SOLAR FLARE', 'YOUR SMITES ERUPT IN FIRE.', '{v} FIRE DAMAGE', V(16, 21, 28, 38)],
  ['duo_blackflame', 'ember', 'silence', 'BLACK FLAME', 'BURNS BITE HARDER FOR EVERY MARK ON THE FOE.', '+{p} BURN A MARK', V(0.1, 0.13, 0.17, 0.22)],
  ['duo_supercon', 'rime', 'thunder', 'SUPERCONDUCT', 'LIGHTNING THAT STRIKES A FROZEN FOE SHATTERS IT FOR FAR MORE.', '+{p} DAMAGE', V(1.5, 2, 2.5, 3.2)],
  ['duo_cryotox', 'rime', 'blight', 'CRYOTOXIN', 'EVERY TICK OF POISON MAY CHILL.', '{p} CHANCE A TICK', V(0.25, 0.33, 0.42, 0.55)],
  ['duo_frostbite', 'rime', 'crimson', 'FROSTBITE', 'WHAT YOU FREEZE BEGINS TO BLEED.', '{v} BLEED', V(2, 2, 3, 3)],
  ['duo_zero', 'rime', 'silence', 'ABSOLUTE ZERO', 'FROZEN FOES NEAR THEIR END SHATTER AT ONCE.', 'BELOW {p} HEALTH', V(0.25, 0.3, 0.35, 0.42)],
  ['duo_wrath', 'thunder', 'dawn', "HEAVEN'S WRATH", 'YOUR SMITES SPLIT INTO CHAIN LIGHTNING.', '{v} LEAPS', V(2, 3, 3, 4)],
  ['duo_acid', 'thunder', 'blight', 'ACID RAIN', 'YOUR LIGHTNING POISONS WHAT IT STRIKES.', '{v} POISON A STRIKE', V(1, 1, 2, 2)],
  ['duo_exsang', 'crimson', 'silence', 'EXSANGUINATE', 'KILLING A MARKED OR BLEEDING FOE HEALS YOU.', '{v} HEALTH', V(4, 6, 8, 11)],
  ['duo_eclipse', 'dawn', 'silence', 'ECLIPSE', 'YOUR SMITES MARK. WHEN YOUR SHIELD BREAKS, ALL NEAR ARE MARKED.', '{v} MARKS', V(2, 2, 3, 3)],
  ['duo_sepsis', 'blight', 'crimson', 'SEPSIS', 'YOU DRINK FROM EVERY TICK OF POISON.', '{p} OF THE POISON', V(0.2, 0.3, 0.4, 0.55)],
  ['duo_consecrate', 'dawn', 'crimson', 'CONSECRATED BLOOD', 'LIFE YOU STEAL PAST FULL HEALTH BECOMES LIGHT. SHIELDED, YOU DRINK DEEPER.', '{p} BECOMES SHIELD', V(0.5, 0.7, 0.9, 1.2)],
  ['duo_nullstorm', 'thunder', 'silence', 'NULL STORM', 'YOUR LIGHTNING MARKS, AND LEAPS TO MARKED FOES FIRST.', '{v} MARK A STRIKE', V(1, 1, 2, 2)],
];

export const BOONS = {};
for (const res of RES_ORDER) for (const [id, slot, tier, name, desc, stat, values, extra] of DEFS[res]) {
  const crown = tier === 'crown'; const t = crown ? 4 : tier; const C = CHAIN[crown ? 'crown' : tier];
  BOONS[id] = { id, name, res, slot, tier: t, kind: crown ? 'crown' : 'boon', desc, stat, values, ...(C ? { needs: { [res]: C.held }, needTier: C.tier || 0 } : {}), ...(extra || {}) };
}
for (const [id, a, b, name, desc, stat, values] of DUOS) BOONS[id] = { id, name, res: a, slot: 'passive', tier: 2, kind: 'duo', duo: [a, b], desc, stat, values, needs: { [a]: 1, [b]: 1 } };
export const BOON_LIST = Object.keys(BOONS);
export const boonsOf = (res) => BOON_LIST.filter((id) => BOONS[id].res === res && BOONS[id].kind !== 'duo');

// ------------------------------------------------------------------ helpers
const rarOf = (r) => (RARITY[r] ? r : 'common');
export function boonValue(id, rarity = 'common') { const d = BOONS[id]; return d ? d.values[rarOf(rarity)] : 0; }
// the boon's lines with its number filled in: { name, desc, stat }
export function boonText(id, rarity = 'common') {
  const d = BOONS[id]; if (!d) return null; const v = boonValue(id, rarity);
  const p = Math.round(v * 100) + '%'; const n = Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  return { name: d.name, desc: d.desc, stat: d.stat.replace('{v}', n).replace('{p}', p), res: d.res, slot: d.slot, tier: d.tier, kind: d.kind };
}
const held = (run) => (run && Array.isArray(run.boons) ? run.boons.filter((b) => b && BOONS[b.id]) : []);
// how many boons of each Resonance are held (a duo counts for both of its Resonances)
export function resCounts(run) {
  const c = {}; for (const r of RES_ORDER) c[r] = 0;
  for (const b of held(run)) { const d = BOONS[b.id]; if (d.duo) { c[d.duo[0]]++; c[d.duo[1]]++; } else c[d.res]++; }
  return c;
}
function topTier(run, res) { let t = 0; for (const b of held(run)) { const d = BOONS[b.id]; if (d.res === res && d.kind !== 'duo') t = Math.max(t, d.tier); } return t; }

// what the warden can use: their attack kind, their slotted skills (movement skills ride the dash)
export function useCtx(run, ctx = {}) {
  const heroId = ctx.heroId || (run && run.hero) || 'warden'; const H = HEROES[heroId] || HEROES.warden;
  const abilities = ctx.abilities || (run && run.abilities) || H.abilities.slice(0, 2);
  const defs = abilities.map((a) => (typeof a === 'string' ? ABILITIES[a] : a && a.def)).filter(Boolean);
  return { heroId, attack: H.attack.kind, abilities: defs, hasMove: defs.some((d) => d.move), hasCast: defs.some((d) => !d.move), ult: !!H.ult };
}
export function canUse(id, ctx) {
  const d = BOONS[id]; if (!d) return false; const F = d.fits || {};
  if (d.slot === 'skill' && !ctx.abilities.length) return false;
  if (d.slot === 'ult' && !ctx.ult) return false;
  if (F.move && !ctx.hasMove) return false;
  if (F.cast && !ctx.hasCast) return false;
  if (F.attack && F.attack !== ctx.attack) return false;
  return true;
}
// is a boon open to this run right now (its chain allows it, not held already)?
export function isOpen(run, id, counts = resCounts(run)) {
  const d = BOONS[id]; if (!d) return false;
  if (held(run).some((b) => b.id === id)) return false;
  for (const r in d.needs || {}) if ((counts[r] || 0) < d.needs[r]) return false;
  if (d.needTier && topTier(run, d.res) < d.needTier) return false;
  return true;
}
// where a boon sits in its chain: { res, tier, held, nextUnlocks: [names] }
export function chainOf(run, id, ctx) {
  const d = BOONS[id]; const counts = resCounts(run); const c = ctx || useCtx(run);
  const before = new Set(BOON_LIST.filter((x) => isOpen(run, x, counts) && canUse(x, c)));
  const after = { ...run, boons: [...held(run), { id, rarity: 'common' }] }; const ac = resCounts(after);
  const next = BOON_LIST.filter((x) => x !== id && !before.has(x) && isOpen(after, x, ac) && canUse(x, c)).map((x) => BOONS[x].name);
  return { res: d.res, duo: d.duo || null, tier: d.tier, held: d.duo ? Math.min(counts[d.duo[0]], counts[d.duo[1]]) : counts[d.res], nextUnlocks: next };
}

function rollRarity(rng, boost = 0, min = 'common') {
  const w = RARITY_ORDER.map((r, i) => RARITY[r].w * (i ? 1 + boost * i : Math.max(0.2, 1 - boost)));
  let x = rng() * w.reduce((a, b) => a + b, 0); let r = 'common';
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { r = RARITY_ORDER[i]; break; } }
  return RARITY_ORDER.indexOf(r) < RARITY_ORDER.indexOf(min) ? min : r;
}

// ------------------------------------------------------------------ the offer
// ctx: { heroId?, abilities?, exclude?: [ids], res?: resId (only this Resonance), rarityBoost?: 0..1, minRarity?, noDuo? }
// Weighting: deeper tiers of a Resonance you already hold are favoured (the chain), a boon that opens the next
// tier more so; Resonances you have none of keep a fair share (variety); at most one offer per Resonance when
// enough are open; when you hold any, at least one offer continues a chain, and one opens something new.
export function offerBoons(run, rng = Math.random, n = 3, ctx = {}) {
  const c = useCtx(run, ctx); const counts = resCounts(run); const excl = new Set([...(ctx.exclude || []), ...(ctx.locked || [])]); // ctx.locked: challenges.lockedBoons(meta) (boons and crowns no challenge has opened yet; game.js passes it)
  const heldAny = held(run).length > 0;
  const pool = BOON_LIST.filter((id) => !excl.has(id) && isOpen(run, id, counts) && canUse(id, c) && (!ctx.res || BOONS[id].res === ctx.res || (BOONS[id].duo || []).includes(ctx.res)) && !(ctx.noDuo && BOONS[id].kind === 'duo'));
  const weight = (id) => {
    const d = BOONS[id]; const have = d.duo ? Math.min(counts[d.duo[0]], counts[d.duo[1]]) : counts[d.res];
    let w = { 1: 10, 2: 8, 3: 7, 4: 9 }[d.tier] || 6;
    if (d.kind === 'duo') w = 6;
    if (have > 0) w *= 1 + Math.min(4, have) * 0.45; // the chain
    // the boon that would open the next tier of its chain
    if (d.kind !== 'duo' && d.tier === 1) { const need = CHAIN[2].held; if (counts[d.res] === need - 1) w *= 1.4; }
    if (d.kind === 'crown') w *= 1.6;
    return w;
  };
  const resKey = (id) => BOONS[id].res;
  const pickFrom = (list) => { const ws = list.map(weight); let x = rng() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; } return list[list.length - 1]; };
  const out = []; const used = new Set();
  while (out.length < n) {
    let list = pool.filter((id) => !out.includes(id) && !used.has(resKey(id)));
    if (!list.length) list = pool.filter((id) => !out.includes(id));
    if (!list.length) break;
    const id = pickFrom(list); out.push(id); used.add(resKey(id));
  }
  // at least one offer continues a chain you hold, and (with three or more) one is something you hold none of
  const inChain = (id) => { const d = BOONS[id]; return d.duo ? counts[d.duo[0]] > 0 && counts[d.duo[1]] > 0 : counts[d.res] > 0; };
  if (heldAny && out.length && !out.some(inChain)) { const alt = pool.filter((id) => inChain(id) && !out.includes(id)); if (alt.length) out[out.length - 1] = pickFrom(alt); }
  if (n >= 3 && out.length >= 3 && out.every(inChain)) { const alt = pool.filter((id) => !inChain(id) && !out.includes(id)); if (alt.length) out[0] = pickFrom(alt); }
  return out.map((id) => {
    const d = BOONS[id]; const min = ctx.minRarity || (d.kind === 'crown' ? 'rare' : 'common');
    return { id, rarity: rollRarity(rng, ctx.rarityBoost || 0, min), def: d, chain: chainOf(run, id, c) };
  });
}

// ------------------------------------------------------------------ changing the build
export function addBoon(run, id, rarity = 'common') {
  if (!BOONS[id]) return false; run.boons = run.boons || [];
  const cur = run.boons.find((b) => b.id === id);
  if (cur) { if (RARITY_ORDER.indexOf(rarOf(rarity)) > RARITY_ORDER.indexOf(rarOf(cur.rarity))) cur.rarity = rarOf(rarity); else upgradeBoon(run, id); return true; }
  run.boons.push({ id, rarity: rarOf(rarity) }); return true;
}
// one step up the rarities; false when it cannot go higher (or is not held)
export function upgradeBoon(run, id) {
  const b = (run.boons || []).find((x) => x.id === id); if (!b) return false;
  const i = RARITY_ORDER.indexOf(rarOf(b.rarity)); if (i >= RARITY_ORDER.length - 1) return false;
  b.rarity = RARITY_ORDER[i + 1]; return true;
}
export function removeBoon(run, id) { const n = (run.boons || []).length; run.boons = (run.boons || []).filter((b) => b.id !== id); return run.boons.length < n; }

// ------------------------------------------------------------------ what the sim reads
// boonMods(run | [{ id, rarity }]) -> { v: { id: value }, res: counts, list, ...stat changes }. Hand it to the
// sim: world.spawnHero(x, z, { ...heroStats(...), boons: boonMods(run) }). heroes.applyBoonStats folds the
// plain stat parts in (spawnHero does it once by itself).
export function boonMods(runOrList) {
  const list = Array.isArray(runOrList) ? runOrList : held(runOrList);
  const v = {}; const L = [];
  for (const b of list) { if (!b || !BOONS[b.id]) continue; v[b.id] = boonValue(b.id, b.rarity); L.push({ id: b.id, rarity: rarOf(b.rarity) }); }
  const res = resCounts({ boons: L });
  const m = { v, res, list: L, n: L.length };
  // the plain stat parts (applied once by heroes.applyBoonStats)
  m.dmgTaken = 1 - (v.rime_mail || 0);
  m.leech = (v.crimson_thirst || 0);
  m.burnMul = (1 + (v.ember_wildfire ? 0.3 : 0)) * (v.ember_crown ? 1.5 : 1);
  m.poisonMax = 5 + (v.blight_virul || 0); m.poisonMul = v.blight_virul ? 1.25 : 1;
  m.bleedMax = v.crimson_crown ? 5 : 3;
  m.freezeAt = v.rime_crown ? 2 : 3;
  m.chainJumps = 2 + (v.thunder_fork || 0); m.chainRange = v.thunder_fork ? 6.5 : 4.8; m.chainBonus = v.thunder_fork ? 0.1 : 0;
  m.shieldMax = (v.dawn_halo || 0) + ((v.dawn_step || v.dawn_rite || v.dawn_sunrise || v.dawn_crown || v.crimson_bound || v.duo_consecrate) ? 10 : 0);
  if (v.dawn_aegis) m.shieldMax = Math.round(Math.max(10, m.shieldMax) * 1.3);
  return m;
}
