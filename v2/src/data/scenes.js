// The filmed scenes (played by render/scene.js on render/stage.js). Every line here is written for the
// game: Proposal, for the author to rewrite or cut. Positions are metres along the stage; the camera
// is [x, zoom]: zoom 1 a wide shot, about 1.8 a close two-shot.
import { UNITS, ENEMIES } from './units.js';
import { REGIONS } from './campaign.js';
import { REGION_STAGE } from './stagesets.js';
import { SETS } from './anims.js';

const COLOR = { vanguard: '#8fb8ff', striker: '#ff9a72', ranger: '#a6e07e', mystic: '#c9a0ff', support: '#ffd97a' };
const cast = (key, x, o = {}) => ({ set: UNITS[key].set, name: UNITS[key].name.split(' ')[0], color: COLOR[UNITS[key].cls], x, big: (SETS[UNITS[key].set] || {}).scale || 1, ...o });

// ---- the opening, in two places: the night the Barrow woke, then the company's stand at the abbey wall
const BOLT = '200,210,255', FIRE = '255,150,70';
const lightning = (x, k = 2) => ({ all: [{ flash: [0.9, BOLT] }, { fx: ['bolt_strike', x, 0, k] }, { sfx: 'quake', gain: 0.9 }, { shake: 6 }] });
const risen = (set, x, o = {}) => ({ set, name: 'Risen', color: '#b9a6ff', x, f: -1, off: true, ...o });
// a dead thing claws out of its grave: dark smoke, then it stands and screams
const rise = (id, x) => ({ seq: [{ all: [{ fx: ['smoke_dark', x, 2, 1.3] }, { fx: ['dust_cloud', x, 0, 1] }, { sfx: 'thud', gain: 0.5 }] }, { wait: 0.18 },
  { all: [{ enter: [id, x] }, { clip: [id, 'Taunt', false], fps: 10 }] }, { wait: 0.32 }] });
// a hero's entrance: a low close-up, their name at the side
const intro = (key) => ({ title: [UNITS[key].name.toUpperCase(), UNITS[key].title], side: true, hold: 1.7 });
const LOCKED_SHADOWS = ['hesta', 'thistle', 'ysolde', 'kesh', 'moraine'];

export const OPENING = {
  set: 'storm', cam: [-1, 1, 0.8], black: true,
  cast: {
    wyrm: { set: 'elder_dragon', name: 'Vaelor', color: '#ff6a4a', x: 13, f: -1, scale: 1.6, dark: true, lift: 60, off: true },
    s1: risen('goblin', -3.4), s2: risen('goblin_spear', 0.4), s3: risen('goblin', 3), s4: risen('goblin_hexer', 5.4), s5: risen('goblin_archer', 7.4), s6: risen('goblin_spear', -6.6),
    corvin: cast('corvin', -12, { off: true }), wren: cast('wren', -12, { off: true }), maren: cast('maren', -12, { off: true }),
    ...Object.fromEntries(LOCKED_SHADOWS.map((k) => ['x' + k, cast(k, -12, { off: true, dark: '#1a0a10', p: 0.85, lane: -3, scale: 0.8, f: 1 })])),
  },
  steps: [
    // black, rain, a line of the old story
    { music: 'storm' },
    { wait: 0.6 }, { title: ['Vael was a kingdom once.'], side: 'plain', hold: 2.4 },
    { all: [{ fade: [0, 2.4] }, { cam: [2, 1, 0.8], t: 6 }, { seq: [{ wait: 2 }, lightning(6.5), { wait: 1.6 }, { title: ['When its last king went into the ground, the ground did not keep him.'], side: 'plain', hold: 2.6 }] }] },
    // the tomb: something wakes under it
    { cam: [0.4, 1.9, 0.9], t: 0 }, { wait: 0.4 },
    { all: [{ fx: ['dark_curse', 0.4, 2, 1.3], life: 2.2 }, { sfx: 'magic', gain: 0.7 }, { shake: 2 }] }, { wait: 1 },
    { all: [{ fx: ['summon', 0.4, 2, 1.4] }, { shake: 4 }] }, { wait: 0.5 },
    rise('s2', 0.4), { wait: 0.8 },
    // and every grave in the Barrow with it
    { cam: [1.2, 1, 0.8], t: 0 },
    rise('s1', -3.4), rise('s3', 3), rise('s4', 5.4), rise('s6', -6.6), rise('s5', 7.4),
    { all: [{ cam: [2.4, 1.08, 0.8], t: 2 }, { seq: [{ wait: 0.4 }, lightning(-1.5, 1.6)] }] },
    // the wyrm comes over the hill, a shadow until the lightning shows it
    { all: [{ enter: ['wyrm', 14] }, { clip: ['wyrm', 'Run'], fps: 7 }, { cam: [6, 1, 0.84], t: 3 }, { walk: ['wyrm', 7.2], run: true, speed: 2.4 },
      { seq: [{ wait: 1.6 }, lightning(10, 2.2)] }] },
    { all: [{ clip: ['wyrm', 'Run'], fps: 6 }, { lift: ['wyrm', 0, 0.7] }, { cam: [6.8, 1.15, 0.86], t: 0.7 }] },
    { all: [{ fx: ['dust_land', 7.2, 0, 2.6] }, { fx: ['smoke_earth', 7.2, 0, 2] }, { sfx: 'blow_big', gain: 0.9 }, { shake: 9 }, { clip: ['wyrm', 'idle'] }] },
    { wait: 0.5 }, lightning(4, 1.6), { wait: 0.5 },
    { cam: [7, 1.35, 0.95], t: 0 }, { face: ['wyrm', 'W'] }, { dark: ['wyrm', false] },
    { all: [{ clip: ['wyrm', 'Taunt', false], fps: 8 }, { sfx: 'blow_big', gain: 1 }, { sfx: 'quake', gain: 1 }, { shake: 10 }, { mood: { col: 'rgba(255,40,20,0.5)' } }, { flash: [0.35, '255,80,40'] }] },
    { title: ['VAELOR', 'The Barrow Wyrm'], side: true, hold: 2 },
    // fire on the land
    { all: [{ clip: ['wyrm', 'Attack2', false], fps: 10 }, { seq: [{ wait: 0.35 }, { sfx: 'fire', gain: 1 },
      { fly: ['fireball_big', 6, 60, 2, 6, 0.6, 1.2], hit: 'explosion_fire', hitScale: 2 }, { all: [{ shake: 12 }, { flash: [0.7, FIRE] }, { sfx: 'blow_big' }, { fx: ['burning_ground', 2, 0, 2], life: 3 }] }] }] },
    { wait: 0.8 },
    { all: [{ fade: [1, 1.2] }, { cam: [4, 0.95, 0.8], t: 1.2 }] },
    { title: ['The dead marched on the living. Town after town went dark.'], side: 'plain', hold: 2.6 },
    { title: ['Until a handful of sellswords would not run.'], side: 'plain', hold: 2.4 },

    // the abbey wall at dusk: the horde comes on
    { set: 'warfield' }, { mood: null }, { music: 'battle' },
    { all: [{ dark: ['wyrm', true] }, { hide: 'wyrm' }, { enter: ['s1', 9] }, { enter: ['s2', 10.5] }, { enter: ['s3', 12] }, { enter: ['s4', 13.4] }, { enter: ['s5', 14.6] }, { enter: ['s6', 11.2] }] },
    { cam: [9, 1, 0.8], t: 0 }, { fade: [0, 0.8] },
    { all: [{ walk: ['s1', 4.2], run: true, speed: 3 }, { walk: ['s2', 5.6], run: true, speed: 3 }, { walk: ['s3', 7], run: true, speed: 3 }, { walk: ['s6', 6.2], run: true, speed: 2.6 },
      { walk: ['s4', 8.8], speed: 2 }, { walk: ['s5', 9.6], speed: 2 }, { cam: [5, 1, 0.8], t: 2.6 }, { seq: [{ wait: 0.8 }, { fx: ['dust_run', 6, 0, 1.2] }] }] },
    // Corvin: the shield
    { cam: [-4.8, 1.9, 0.93], t: 0 }, { enter: ['corvin', -8.5] },
    { all: [{ walk: ['corvin', -3.6], run: true, speed: 6 }, { cam: [-4.8, 1.9, 0.93], t: 0.8 }] },
    { all: [{ fx: ['dust_land', -3.6, 0, 1.3] }, { clip: ['corvin', 'Taunt', false], fps: 11 }, { sfx: 'unsheathe_01', gain: 0.9 }] },
    { all: [{ fx: ['shield_bubble', -3.6, 22, 1.1], life: 1.6 }, { sfx: 'magic', gain: 0.5 }, intro('corvin')] },
    // Wren: one arrow, one skull
    { cam: [-6.6, 1.9, 0.93], t: 0 }, { enter: ['wren', -5.4] }, { face: ['wren', 'E'] },
    { all: [{ clip: ['wren', 'Attack3', false], fps: 12 }, { seq: [{ wait: 0.35 }, { sfx: 'bolt', gain: 0.8 }, { fly: ['arrow', -5, 22, 4.2, 20, 0.22, 1] }] }, { seq: [{ wait: 0.45 }, { cam: [3.6, 1.6, 0.9], t: 0 }] }] },
    { all: [{ fx: ['hit_pierce', 4.2, 20, 1.4] }, { clip: ['s1', 'Die', false], fps: 10 }, { sfx: 'blow_0' }, { shake: 3 }] }, { wait: 0.6 },
    { cam: [-6.6, 1.9, 0.93], t: 0 }, intro('wren'),
    // Maren: the light
    { cam: [-8.2, 1.9, 0.93], t: 0 }, { enter: ['maren', -7] }, { face: ['maren', 'E'] },
    { all: [{ clip: ['maren', 'Attack3', false], fps: 9 }, { fx: ['circle_holy', -7, 1, 0.7], life: 2.4 }, { seq: [{ wait: 0.5 }, { fx: ['holy_light', -7, 30, 1] }, { flash: [0.4, '255,240,180'] }, { sfx: 'heal_02', gain: 0.8 }] }] },
    intro('maren'),
    // the three of them, and the horde
    { all: [{ enter: ['s2', 2.2] }, { enter: ['s6', 3] }, { enter: ['s3', 3.8] }, { enter: ['s4', 5.6] }, { enter: ['s5', 6.4] }] },
    { cam: [-1.8, 1, 0.82], t: 0 }, { face: ['corvin', 'E'] },
    { all: [{ walk: ['s2', 1.4], speed: 1.2 }, { walk: ['s6', 2.4], speed: 1.2 }, { walk: ['s3', 3.2], speed: 1.2 }] },
    { say: ['wren', 'That is the whole Barrow coming.'], tone: 'soft' },
    { cam: [-4.4, 2.05, 0.95], t: 0 },
    { say: ['corvin', 'Then we send it back.'], tone: 'shout' },
    // the charge
    { all: [{ cam: [-0.8, 1.05, 0.82], t: 1.6 }, { walk: ['corvin', 0.4], run: true, speed: 6 }, { seq: [{ wait: 0.15 }, { walk: ['wren', -3.4], run: true, speed: 5 }] }, { seq: [{ wait: 0.3 }, { walk: ['maren', -5.2], run: true, speed: 5 }] },
      { walk: ['s2', 1.2], run: true, speed: 3 }, { walk: ['s6', 1.9], run: true, speed: 3 }, { walk: ['s3', 2.8], run: true, speed: 3 }, { walk: ['s4', 4.8], speed: 1.5 }, { walk: ['s5', 5.6], speed: 1.5 }] },
    // the first blow, slowed down
    { cam: [0.2, 2, 0.94], t: 0 }, { slow: 0.3 },
    { all: [{ clip: ['corvin', 'Attack2', false], fps: 14 }, { seq: [{ wait: 0.12 }, { fx: ['cross_slash', 1.1, 20, 1.6] }, { flash: [0.5, '255,255,255'] }, { sfx: 'slash_1', gain: 1 }, { clip: ['s2', 'Die', false], fps: 10 }, { fx: ['hit_crit', 1.2, 20, 1.3] }] }] },
    { wait: 0.35 }, { slow: 1 }, { shake: 5 },
    // the line holds: arrows, light, steel
    { cam: [0.8, 1.1, 0.84], t: 0 },
    { all: [
      { seq: [{ clip: ['wren', 'Attack3', false], fps: 12 }, { wait: 0.3 }, { sfx: 'bolt', gain: 0.6 }, { fly: ['arrow', -3, 22, 2.8, 20, 0.25] }, { fx: ['hit_pierce', 2.8, 20, 1.2] }, { clip: ['s3', 'Die', false], fps: 10 },
        { clip: ['wren', 'Attack3', false], fps: 12 }, { wait: 0.3 }, { sfx: 'bolt', gain: 0.6 }, { fly: ['arrow', -3, 22, 5.6, 22, 0.3] }, { fx: ['hit_pierce', 5.6, 22, 1.2] }, { clip: ['s5', 'Die', false], fps: 10 }] },
      { seq: [{ wait: 0.3 }, { clip: ['corvin', 'Attack1', false], fps: 14 }, { fx: ['slash_r', 1.1, 18, 1.4] }, { sfx: 'slash_0' }, { fx: ['hit_slash', 1.9, 20, 1.2] }, { clip: ['s6', 'Die', false], fps: 10 }, { wait: 0.6 },
        { clip: ['corvin', 'Attack2', false], fps: 14 }, { fx: ['spin_slash', 0.6, 20, 1.6] }, { sfx: 'slash_2' }, { shake: 4 }] },
      { seq: [{ wait: 0.6 }, { clip: ['maren', 'Attack3', false], fps: 9 }, { fx: ['heal_loop', 0.4, 16, 1.2], life: 1.6 }, { sfx: 'heal_02', gain: 0.4 }] },
      { seq: [{ wait: 0.5 }, { clip: ['s4', 'Attack5', false], fps: 10 }, { wait: 0.3 }, { fly: ['magic_missile', 4.4, 22, 0.8, 20, 0.5] }, { fx: ['block', 0.8, 20, 1.3] }, { sfx: 'clang_0' }] },
    ] },
    { wait: 0.4 },
    // the wyrm answers: fire from the sky, and the shield holds
    { all: [{ shake: 6 }, { sfx: 'quake' }, { mood: { col: 'rgba(255,60,20,0.4)' } }] },
    { cam: [-1.6, 1, 0.8], t: 0 }, { face: ['wren', 'E'] }, { face: ['maren', 'E'] },
    { all: [{ sfx: 'fire', gain: 1 }, { fly: ['fireball_big', 8, 90, -1.2, 16, 0.9, 1.5] }, { seq: [{ wait: 0.3 }, { walk: ['corvin', -1.8], run: true, speed: 9 }] }] },
    { all: [{ face: ['corvin', 'E'] }, { fx: ['shield_bubble', -1.8, 22, 1.8], life: 1.4 }, { fx: ['explosion_fire', -0.8, 14, 2.4] }, { fx: ['shockwave', -1.2, 4, 2.2] }, { flash: [0.8, FIRE] }, { shake: 14 }, { sfx: 'blow_big', gain: 1 }, { clip: ['corvin', 'TakeDamage', false], fps: 10 }] },
    { wait: 0.9 }, { fx: ['smoke_burst', -1, 6, 2] }, { wait: 0.4 }, { mood: null },
    // through the smoke, the last of them
    { all: [{ walk: ['corvin', 3.6], run: true, speed: 9 }, { cam: [1.6, 1.3, 0.86], t: 0.6 }, { fx: ['dust_run', -1, 0, 1.2] }] },
    { all: [{ clip: ['corvin', 'Attack2', false], fps: 14 }, { seq: [{ wait: 0.1 }, { fx: ['arc_gold', 4.4, 20, 1.6] }, { flash: [0.45, '255,230,160'] }, { sfx: 'slash_1', gain: 1 }, { shake: 6 }, { clip: ['s4', 'Die', false], fps: 10 }, { fx: ['hit_big', 4.8, 20, 1.4] }] }] },
    { wait: 0.7 },
    // the company, and the five the wheel cannot reach yet, waiting out there in the smoke
    { all: [{ face: ['corvin', 'W'] }, { cam: [-0.4, 1.05, 0.82], t: 2.2 }, ...LOCKED_SHADOWS.map((k, i) => ({ enter: ['x' + k, [-6.2, -4.4, -1.8, 0.6, 2.2][i]] })),
      { seq: [{ wait: 1.2 }, { face: ['corvin', 'E'] }, { clip: ['corvin', 'Taunt', false], fps: 10 }] }] },
    { all: [{ title: ['VAEL', 'Sellsword Company'], slam: true, hold: 3.2 }, { seq: [{ wait: 0.08 }, { flash: [0.6, '255,236,200'] }, { fx: ['shockwave', -0.4, 6, 3] }, { shake: 9 }, { sfx: 'horn', gain: 1 }] }] },
    { fade: [1, 0.9] },
  ],
};

// what each hero says on joining: the freed ones go on the wheel, the recruits join the squad (Proposal)
export const JOIN_LINES = {
  hesta: 'The Warlord held my river for a year. You broke him. My spear is yours, for as long as the river runs.',
  thistle: 'The fen is quiet for the first time in years. The lanterns can burn without me. The wolves come too.',
  ysolde: 'The Roc kept me in its nest like a trinket. Thank you for burning it. I would like to burn a few more things.',
  moraine: 'My oath is broken, and so is my blade\'s master. Give me a better oath.',
  kesh: 'My debt is paid in blood and snow. Now I choose who I serve.',
  // the recruits met on the road
  pell: 'Somebody has to feed you lot. And I hit harder than I bake.',
  brann: 'Nobody has stood up to me in the pit for a year. I will follow anyone who can.',
  sable: 'The caller is dead and I am out of work. Hexes are cheaper by the dozen.',
  vesk: 'I steal from the living and the dead alike. With you, at least, it pays.',
  saela: 'The dawn order is one archer now. Let that archer ride with you.',
  cairn: 'BOUND. THEN UNBOUND. I REMEMBER THE OATH OF THE ROAD. I WALK WITH YOU.',
  osric: 'The north gate fell without me. I will not let another one fall.',
  grath: 'The fen is in my blood. So is the fight.',
  pip: 'I owe you my neck. I always pay my debts. Mostly.',
  tam: 'My fists are slow to anger and quick to end it.',
  nyssa: 'They burned my books. I will burn their banners. Fair trade.',
  garrick: 'Thirty years with the guild and they left me holding the hall. You came back for me.',
  ilse: 'Dawn breaks on the ones who stand. I will stand with you.',
  rhys: 'I climbed for something I never found. Maybe it was down here.',
  aldren: 'I called the dead from their graves. Let me spend what is left of me sending them back.',
};

// a recruit walks up to the company's leader and joins
export function joinScene(key, leaderKey, region) {
  return {
    set: REGION_STAGE[region] || 'meadow', cam: [2, 1.15],
    cast: { lead: cast(leaderKey, -0.6, { f: 1 }), you: cast(key, 9, { f: -1 }) },
    steps: [
      { all: [{ walk: ['you', 2.4] }, { cam: [1, 1.15], t: 3.5 }] },
      { cam: [0.9, 1.85], t: 0 }, { wait: 0.3 },
      { say: ['you', JOIN_LINES[key] || 'I will fight with you.'] },
      { say: ['lead', 'Then welcome to the company.'] },
      { all: [{ clip: ['you', 'Taunt', false], fps: 11 }, { cam: [1.4, 2.1], t: 1.2 }] },
      { wait: 0.6 },
    ],
  };
}

// the company arrives in a new region: a slow look across the land, then they march in
export function arrivalScene(rid, teamKeys) {
  const r = REGIONS.find((x) => x.id === rid), c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, -22 - i * 1.6, { lane: (i % 3) - 1 }); });
  const ids = Object.keys(c);
  return {
    set: REGION_STAGE[rid], cam: [-10, 1], cast: c,
    steps: [
      { all: [{ cam: [8, 1], t: 7 }, { seq: [{ wait: 1.2 }, { title: [r.name, r.blurb] }] }] },
      { cam: [-6, 1], t: 0 },
      { all: [...ids.map((id, i) => ({ walk: [id, -1.5 - i * 1.5], speed: 2.1 })), { cam: [-3, 1], t: 4 }] },
      { wait: 0.6 },
    ],
  };
}

// a boss stands in the company's way: a close look at it, then the company runs up to face it
export function bossScene(mission, teamKeys) {
  const [bossKey] = mission.foes.find(([k]) => ENEMIES[k].boss) || mission.foes[0], boss = ENEMIES[bossKey], c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, -14 - i * 1.3, { lane: (i % 3) - 1 }); });
  const big = (boss.scale || 1) * ((SETS[boss.set] || {}).scale || 1);
  c.boss = { set: boss.set, name: boss.name, color: '#ff8a7a', x: 4.5, f: -1, scale: boss.scale || 1, big: (SETS[boss.set] || {}).scale || 1 };
  return {
    // a medium shot of the boss, whole, its feet low in the frame (the big monsters' art is rough up close)
    set: REGION_STAGE[mission.region], cam: [4.5, Math.max(0.8, Math.min(1.3, 1.5 / big)), 0.86], cast: c,
    steps: [
      { wait: 0.5 }, { clip: ['boss', 'Taunt', false], fps: 11 }, { wait: 0.4 }, { shake: 5 },
      { title: [boss.name, mission.place], side: true },
      { cam: [0.5, 1], t: 0 }, { clip: ['boss', 'idle'] },
      { all: [...Object.keys(c).filter((id) => id !== 'boss').map((id, i) => ({ walk: [id, -1 - (i % 3) * 1.1 - Math.floor(i / 3) * 0.6], run: true })), { cam: [1.2, 1.2], t: 2.2 }] },
      { wait: 0.5 },
    ],
  };
}
