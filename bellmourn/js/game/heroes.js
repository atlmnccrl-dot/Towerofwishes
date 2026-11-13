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
};
export const HERO_ORDER = ['warden', 'huntress', 'bellbreaker', 'lamplighter'];

// ------------------------------------------------------------------ abilities (two slots, the third unlocks at level 4)
export const ABILITIES = {
  wave: { name: 'CRIMSON WAVE', kind: 'wave', cd: 5, dmg: 24, desc: 'A CRESCENT OF RED STEEL CUTS THROUGH EVERYTHING AHEAD.' },
  rush: { name: 'CUTTING RUSH', kind: 'rush', cd: 7, dmg: 26, dist: 6.5, desc: 'DASH THROUGH THE PACK, CUTTING ALL IN YOUR PATH.' },
  whirl: { name: 'WHIRL OF THORNS', kind: 'whirl', cd: 9, dmg: 14, hits: 3, radius: 2.9, status: { bleed: 1 }, level: 4, desc: 'SPIN THREE TIMES. FOES AROUND YOU BLEED.' },
  volley: { name: 'VOLLEY', kind: 'volley', cd: 5, dmg: 10, n: 7, spread: deg(9), desc: 'A FAN OF SEVEN BOLTS.' },
  smoke: { name: 'SMOKE STEP', kind: 'smoke', cd: 7, dmg: 22, dist: 5, radius: 2.5, stun: 1.3, desc: 'LEAP AWAY AND LEAVE A BOMB THAT STUNS.' },
  snare: { name: 'SNARE TRAP', kind: 'trap', cd: 10, dmg: 26, radius: 1.9, root: 2.4, life: 10, level: 4, desc: 'A TRAP THAT HOLDS AND CUTS WHAT STEPS IN IT.' },
  shockwave: { name: 'SHOCKWAVE', kind: 'shock', cd: 6, dmg: 28, r1: 6, desc: 'SLAM THE STONES: A RING OF FORCE ROLLS OUT.' },
  charge: { name: 'IRON CHARGE', kind: 'charge', cd: 8, dmg: 20, dist: 7, slam: 30, radius: 2.4, desc: 'CHARGE, BATTER ASIDE ALL IN THE WAY, SLAM.' },
  ward: { name: 'BELL WARD', kind: 'ward', cd: 14, dur: 4.5, reduce: 0.5, dmg: 11, radius: 2.7, level: 4, desc: 'HALF DAMAGE FOR A WHILE; THE BELL BURNS ALL AROUND.' },
  pillar: { name: 'FLAME PILLAR', kind: 'pillar', cd: 5, dmg: 36, radius: 1.9, delay: 0.5, status: { burn: 1 }, desc: 'FIRE ERUPTS UNDER THE NEAREST FOE.' },
  lantern: { name: 'LANTERN WARD', kind: 'lantern', cd: 13, heal: 0.12, dur: 3.5, dmg: 9, radius: 2.6, desc: 'HEAL, AND BURN WHAT COMES CLOSE.' },
  wisps: { name: "WILL-O'-WISPS", kind: 'wisps', cd: 12, dmg: 24, n: 3, level: 4, desc: 'THREE WISPS HUNT DOWN THE NEAREST FOES.' },
};

export const ULTS = {
  requiem: { name: 'REQUIEM', kind: 'requiem', dur: 1.6, radius: 6.5, hits: 7, dmg: 15 },
  rain: { name: 'RAIN OF BOLTS', kind: 'rain', dur: 2.6, radius: 6.5, rate: 0.06, dmg: 12, r: 1.1 },
  toll: { name: 'TOLL OF RUIN', kind: 'toll', dur: 1.9, rings: 3, dmg: 34, r1: 7.5 },
  sunburst: { name: 'SUNBURST', kind: 'sunburst', dur: 1.0, radius: 7.5, dmg: 80, heal: 0.3, status: { burn: 1 } },
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
  cathedralBell: { type: 'hammer', name: 'CATHEDRAL BELL', tier: 4, dmg: 1.58, trait: { shock: 0.25, quake: true }, desc: 'EVERY FINAL BLOW QUAKES.' },
  lampStaff: { type: 'focus', name: 'LAMP STAFF', tier: 0, dmg: 1.0, desc: 'A LAMPLIGHTER\'S POLE.' },
  wickRod: { type: 'focus', name: 'WICK ROD', tier: 1, dmg: 1.14, trait: { burn: 0.25 }, desc: 'FIRE THAT CLINGS LONGER.' },
  tideCenser: { type: 'focus', name: 'TIDE CENSER', tier: 2, dmg: 1.24, trait: { frost: 0.35 }, desc: 'COLD FLAMES THAT SLOW.' },
  boneScepter: { type: 'focus', name: 'BONE SCEPTER', tier: 3, dmg: 1.38, trait: { leech: 0.05 }, desc: 'EVERY HIT HEALS YOU A LITTLE.' },
  dawnLantern: { type: 'focus', name: 'DAWN LANTERN', tier: 4, dmg: 1.58, trait: { burn: 0.4, crit: 0.12 }, desc: 'THE FIRST LIGHT, IN A CAGE.' },
};
export const START_WEAPON = { blade: 'wardenBlade', bow: 'nightCrossbow', hammer: 'ironMaul', focus: 'lampStaff' };
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
  return {
    heroId, kit: H, level: P.level,
    maxHp: Math.round(H.hp * levelHp(P.level)),
    dmgMul: levelDmg(P.level) * W.dmg * upgradeMul(plus),
    weapon: P.weapon, weaponDef: W, trait: W.trait || {},
    abilities: P.equipped.map((id) => ({ id, def: ABILITIES[id], rank: (P.ranks || {})[id] || 1 })),
    ult: { id: H.ult, def: ULTS[H.ult], rank: (P.ranks || {})[H.ult] || 1 },
    maxTonics: 3 + tonicUp + (save.bossTonics || 0), tonicHeal: 0.45 * (has('pearl') ? 1.3 : 1),
    dashCharges: 1 + (has('moth') ? 1 : 0), crit: (W.trait?.crit || 0) + (has('tooth') ? 0.15 : 0),
    cdMul: has('clapper') ? 0.82 : 1, ultRate: has('glass') ? 1.35 : 1, speedMul: has('silk') ? 1.12 : 1,
    dmgTaken: (1 - (H.armor || 0)) * (has('psalter') ? 0.85 : 1), revives: has('bone') ? 1 : 0,
    relics: [...relics], armor: H.armor || 0,
  };
}

// A fresh per-hero record in the save.
export function newHeroSave(heroId) {
  const H = HEROES[heroId]; const w = START_WEAPON[H.weapon];
  return { level: 1, xp: 0, points: 0, weapon: w, owned: [w], plus: {}, ranks: { [H.abilities[0]]: 1, [H.abilities[1]]: 1, [H.ult]: 1 }, equipped: [H.abilities[0], H.abilities[1]] };
}
