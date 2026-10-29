// The filmed scenes, played by render/scene.js on the battle maps: the same arenas, sprites and camera
// angle as the fights. Every line here is written for the game: Proposal, for the author to rewrite or
// cut. Places are metres on the field (x east, y toward the camera, the field runs x -8.5..8.5 and
// y -3.7..3.7); the camera is [x, y, zoom]: about 1.1 the fights' wide view, 2 a close shot.
import { UNITS, ENEMIES } from './units.js';
import { REGIONS } from './campaign.js';
import { REGION_ARENA } from './arenas.js';
import { SETS } from './anims.js';

const COLOR = { vanguard: '#8fb8ff', striker: '#ff9a72', ranger: '#a6e07e', mystic: '#c9a0ff', support: '#ffd97a' };
const cast = (key, x, y = 0, o = {}) => ({ set: UNITS[key].set, name: UNITS[key].name.split(' ')[0], color: COLOR[UNITS[key].cls], x, y, big: (SETS[UNITS[key].set] || {}).scale || 1, ...o });

// ---- the opening, in two places: the night the Barrow woke, then the company's stand at the abbey wall
const BOLT = '200,210,255', FIRE = '255,150,70';
const NIGHT = { col: 'rgba(20,26,70,0.38)', op: 'multiply' }, DUSK = { col: 'rgba(255,120,60,0.32)', op: 'soft-light' }, RAGE = { col: 'rgba(255,30,10,0.45)', op: 'soft-light' };
const lightning = (x, y, k = 1.6) => ({ all: [{ flash: [0.9, BOLT] }, { fx: ['bolt_strike', x, y, 0, k] }, { sfx: 'quake', gain: 0.9 }, { shake: 5 }] });
const risen = (set, x, y) => ({ set, name: 'Risen', color: '#b9a6ff', x, y, f: 'S', off: true });
// a dead thing claws out of its grave: dark smoke, then it stands and screams
const rise = (id, x, y) => ({ seq: [{ all: [{ fx: ['smoke_dark', x, y, 0.4, 1.1] }, { fx: ['dust_cloud', x, y, 0.1, 1] }, { sfx: 'thud', gain: 0.5 }] }, { wait: 0.18 },
  { all: [{ enter: [id, x, y] }, { clip: [id, 'Taunt', false], fps: 10 }] }, { wait: 0.32 }] });
// a hero's entrance: a close shot, their name at the side
const intro = (key) => ({ title: [UNITS[key].name.toUpperCase(), UNITS[key].title], side: true, hold: 1.7 });
const SHADOWS = ['wren', 'maren', 'hesta', 'thistle', 'ysolde', 'kesh', 'moraine'];
// where the dead stand up: in front of the graves on the storm arena (data/arenas.js)
const GRAVE = { s1: [-5.5, -1.3], s2: [0.5, -1.0], s3: [3.2, -1.7], s4: [5.8, -0.8], s5: [-2.5, -1.8], s6: [-1.2, 1.7] };

export const OPENING = {
  arena: 'storm', cam: [-0.5, -1, 1.15], black: true, mood: NIGHT,
  cast: {
    wyrm: { set: 'elder_dragon', name: 'Vaelor', color: '#ff6a4a', x: 13, y: -2.2, z: 3.6, f: 'W', scale: 1.9, dark: true, off: true },
    s1: risen('goblin', ...GRAVE.s1), s2: risen('goblin_spear', ...GRAVE.s2), s3: risen('goblin', ...GRAVE.s3), s4: risen('goblin_hexer', ...GRAVE.s4), s5: risen('goblin_archer', ...GRAVE.s5), s6: risen('goblin_spear', ...GRAVE.s6),
    corvin: cast('corvin', -12, 0.2, { off: true }),
    ...Object.fromEntries(SHADOWS.map((k) => ['x' + k, cast(k, -12, -2.4, { off: true, dark: '#1a0a10', f: 'S' })])),
  },
  steps: [
    // black, rain, a line of the old story
    { music: 'storm' },
    { wait: 0.6 }, { title: ['Vael was a kingdom once.'], side: 'plain', hold: 2.4 },
    { all: [{ fade: [0, 2.4] }, { cam: [1.5, -1, 1.15], t: 6 }, { seq: [{ wait: 2 }, lightning(4.5, -3), { wait: 1.6 }, { title: ['When its last king went into the ground, the ground did not keep him.'], side: 'plain', hold: 2.6 }] }] },
    // the tomb: something wakes under it
    { cam: [0.5, -1.4, 1.8], t: 0 }, { wait: 0.4 },
    { all: [{ fx: ['dark_curse', 0.5, -1.2, 0.3, 1.2], life: 2.2 }, { sfx: 'magic', gain: 0.7 }, { shake: 2 }] }, { wait: 1 },
    { all: [{ fx: ['summon', 0.5, -1.0, 0.4, 1.3] }, { shake: 4 }] }, { wait: 0.5 },
    rise('s2', ...GRAVE.s2), { wait: 0.8 },
    // and every grave in the Barrow with it
    { cam: [0, -0.6, 1.25], t: 0 },
    rise('s1', ...GRAVE.s1), rise('s3', ...GRAVE.s3), rise('s6', ...GRAVE.s6), rise('s4', ...GRAVE.s4), rise('s5', ...GRAVE.s5),
    { all: [{ cam: [0.6, -0.8, 1.3], t: 2 }, { seq: [{ wait: 0.4 }, lightning(-3.6, 0.6, 1.4)] }] },
    // the wyrm comes over the Barrow, a shadow in the rain until the lightning shows it
    { all: [{ cam: [3.4, -2.0, 1.0], t: 2.6 }, { enter: ['wyrm'] }, { clip: ['wyrm', 'Run'], fps: 7 }, { walk: ['wyrm', 4.6, 0.2], run: true, speed: 3.6 },
      { seq: [{ wait: 1.4 }, lightning(8, -3.2, 2)] }] },
    { all: [{ clip: ['wyrm', 'Run'], fps: 6 }, { lift: ['wyrm', 0, 0.7] }, { cam: [4, -1, 1.25], t: 0.7 }] },
    { all: [{ fx: ['dust_land', 4.6, 0.2, 0.1, 2.4] }, { fx: ['smoke_earth', 4.6, 0.2, 0.2, 1.8] }, { sfx: 'blow_big', gain: 0.9 }, { shake: 8 }, { clip: ['wyrm', 'idle'] }, { dark: ['wyrm', false] }] },
    { wait: 0.5 },
    { cam: [4.3, -0.9, 1.7], t: 0 }, { face: ['wyrm', 'SW'] },
    { all: [{ clip: ['wyrm', 'Taunt', false], fps: 8 }, { sfx: 'blow_big', gain: 1 }, { sfx: 'quake', gain: 1 }, { shake: 10 }, { mood: RAGE }, { flash: [0.35, '255,80,40'] }] },
    { title: ['VAELOR', 'The Barrow Wyrm'], side: true, hold: 2 },
    // fire on the graves
    { all: [{ face: ['wyrm', 'W'] }, { cam: [2, -0.6, 1.25], t: 0.5 }, { clip: ['wyrm', 'Attack2', false], fps: 10 }, { seq: [{ wait: 0.35 }, { sfx: 'fire', gain: 1 },
      { fly: ['fireball_big', [3.4, 0.2, 2.2], [-0.6, 0.6, 0.3], 0.6, 1.1], hit: 'explosion_fire', hitScale: 1.8 },
      { all: [{ shake: 12 }, { flash: [0.7, FIRE] }, { sfx: 'blow_big' }, { fx: ['burning_ground', -0.6, 0.6, 0, 1.6], life: 3 }] }] }] },
    { wait: 0.8 },
    { all: [{ fade: [1, 1.2] }, { cam: [1.6, -0.6, 1.15], t: 1.2 }] },
    { title: ['The dead marched on the living. Town after town went dark.'], side: 'plain', hold: 2.6 },
    { title: ['Until one sellsword would not run.'], side: 'plain', hold: 2.4 },

    // the abbey wall at dusk: the horde comes on
    { arena: 'abbey' }, { mood: DUSK }, { music: 'battle' },
    { all: [{ hide: 'wyrm' }, ...['s1', 's2', 's3', 's4', 's5', 's6'].map((id, i) => ({ enter: [id, 10 + i * 0.9, [-0.8, 0.2, 1.0, -0.4, 0.8, -1.2][i]] })),
      ...['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => ({ face: [id, 'W'] }))] },
    { cam: [5, -0.3, 1.15], t: 0 }, { fade: [0, 0.8] },
    { all: [{ walk: ['s1', 3.5, -0.8], run: true, speed: 3 }, { walk: ['s2', 4.4, 0.2], run: true, speed: 3 }, { walk: ['s3', 5.2, 1.0], run: true, speed: 3 }, { walk: ['s6', 4.8, -1.4], run: true, speed: 2.6 },
      { walk: ['s4', 7, -0.4], speed: 2 }, { walk: ['s5', 7.6, 0.8], speed: 2 }, { cam: [2.4, -0.3, 1.15], t: 2.6 }, { seq: [{ wait: 0.8 }, { fx: ['dust_run', 4.4, 0.2, 0.1, 1.2] }] }] },
    // Corvin: the shield
    { cam: [-4.4, -0.3, 1.8], t: 0 }, { enter: ['corvin', -9, 0.2] },
    { all: [{ walk: ['corvin', -3, 0.2], run: true, speed: 6 }] },
    { all: [{ fx: ['dust_land', -3, 0.2, 0.1, 1.2] }, { face: ['corvin', 'E'] }, { clip: ['corvin', 'Taunt', false], fps: 11 }, { sfx: 'unsheathe_01', gain: 0.9 }] },
    { all: [{ fx: ['shield_bubble', -3, 0.2, 0.9, 1], life: 1.6 }, { sfx: 'magic', gain: 0.5 }, intro('corvin')] },
    // one sellsword, and the horde
    { cam: [-1.2, -0.2, 1.25], t: 0 }, { face: ['corvin', 'E'] }, { wait: 0.6 },
    { cam: [-3.6, -0.2, 1.9], t: 0 },
    { say: ['corvin', 'Come on, then.'], tone: 'shout' },
    // the charge
    { all: [{ cam: [0.4, -0.2, 1.25], t: 1.6 }, { walk: ['corvin', 0.6, 0.1], run: true, speed: 6 },
      { walk: ['s2', 1.4, 0.2], run: true, speed: 3 }, { walk: ['s6', 2.0, -0.9], run: true, speed: 3 }, { walk: ['s3', 2.0, 1.0], run: true, speed: 3 }, { walk: ['s1', 3.2, -0.6], run: true, speed: 2.4 },
      { walk: ['s4', 5, -0.4], speed: 1.5 }, { walk: ['s5', 5.6, 0.8], speed: 1.5 }] },
    // the first blow, slowed down
    { cam: [1, -0.2, 1.9], t: 0 }, { slow: 0.3 },
    { all: [{ face: ['corvin', 's2'] }, { clip: ['corvin', 'Attack2', false], fps: 14 }, { seq: [{ wait: 0.12 }, { fx: ['cross_slash', 1.2, 0.15, 1, 1.4] }, { flash: [0.5, '255,255,255'] }, { sfx: 'slash_1', gain: 1 }, { clip: ['s2', 'Die', false], fps: 10 }, { fx: ['hit_crit', 1.4, 0.2, 1, 1.2] }] }] },
    { wait: 0.35 }, { slow: 1 }, { shake: 5 },
    // alone in the press: steel, a spin, an arrow turned on the shield
    { cam: [1.6, -0.2, 1.4], t: 0 },
    { all: [
      { seq: [{ wait: 0.2 }, { face: ['corvin', 's6'] }, { clip: ['corvin', 'Attack1', false], fps: 14 }, { fx: ['slash_r', 1.3, -0.4, 1, 1.2] }, { sfx: 'slash_0' }, { fx: ['hit_slash', 2.0, -0.9, 1, 1.1] }, { clip: ['s6', 'Die', false], fps: 10 }, { wait: 0.5 },
        { clip: ['corvin', 'Attack2', false], fps: 14 }, { fx: ['spin_slash', 0.6, 0.1, 0.9, 1.5] }, { sfx: 'slash_2' }, { shake: 4 }, { clip: ['s3', 'Die', false], fps: 10 }, { fx: ['hit_slash', 2.0, 1.0, 1, 1.1] }, { wait: 0.3 },
        { walk: ['corvin', 2.6, -0.5], run: true, speed: 9 }, { face: ['corvin', 's1'] }, { clip: ['corvin', 'Attack1', false], fps: 14 }, { fx: ['slash_r', 2.9, -0.5, 1, 1.2] }, { sfx: 'slash_1' }, { clip: ['s1', 'Die', false], fps: 10 }, { fx: ['hit_slash', 3.2, -0.6, 1, 1.1] }] },
      { seq: [{ wait: 0.6 }, { clip: ['s5', 'Attack3', false], fps: 12 }, { wait: 0.3 }, { fly: ['arrow', [5.4, 0.8, 1.1], [0.9, 0.1, 1.0], 0.35] }, { fx: ['block', 0.9, 0.1, 1, 1.2] }, { sfx: 'clang_1' }] },
      { seq: [{ wait: 1.2 }, { clip: ['s4', 'Attack5', false], fps: 10 }, { wait: 0.3 }, { fly: ['magic_missile', [4.6, -0.4, 1.2], [2.7, -0.5, 1.0], 0.4] }, { fx: ['block', 2.7, -0.5, 1, 1.2] }, { sfx: 'clang_0' }] },
    ] },
    { wait: 0.4 },
    // the wyrm answers: fire from the sky, and the shield holds
    { all: [{ shake: 6 }, { sfx: 'quake' }, { mood: RAGE }] },
    { cam: [1.6, -0.5, 1.25], t: 0 },
    { all: [{ sfx: 'fire', gain: 1 }, { fly: ['fireball_big', [11, -3.5, 6], [2.6, -0.5, 0.6], 0.9, 1.4] }, { seq: [{ wait: 0.2 }, { face: ['corvin', 'NE'] }, { clip: ['corvin', 'Taunt', false], fps: 12 }] }] },
    { all: [{ fx: ['shield_bubble', 2.6, -0.5, 0.9, 1.6], life: 1.4 }, { fx: ['explosion_fire', 3.0, -0.4, 0.8, 2] }, { fx: ['shockwave', 2.8, -0.4, 0, 2.2] }, { flash: [0.8, FIRE] }, { shake: 14 }, { sfx: 'blow_big', gain: 1 }, { clip: ['corvin', 'TakeDamage', false], fps: 10 }] },
    { wait: 0.9 }, { fx: ['smoke_burst', 3, -0.4, 0.6, 1.8] }, { wait: 0.4 }, { mood: DUSK },
    // through the smoke, the last of them
    { all: [{ walk: ['corvin', 4.4, 0.1], run: true, speed: 9 }, { cam: [3.4, -0.3, 1.5], t: 0.6 }, { fx: ['dust_run', 2.6, -0.5, 0.1, 1.1] }] },
    { all: [{ face: ['corvin', 'E'] }, { clip: ['corvin', 'Attack2', false], fps: 14 }, { seq: [{ wait: 0.1 }, { fx: ['arc_gold', 5, 0.1, 1, 1.6] }, { flash: [0.45, '255,230,160'] }, { sfx: 'slash_1', gain: 1 }, { shake: 6 },
      { clip: ['s4', 'Die', false], fps: 10 }, { clip: ['s5', 'Die', false], fps: 10 }, { fx: ['hit_big', 5, -0.4, 1, 1.2] }, { fx: ['hit_big', 5.6, 0.8, 1, 1.2] }] }] },
    { wait: 0.7 },
    // he turns to the camera; behind him in the smoke, the seven the wheel cannot reach yet
    { all: [{ walk: ['corvin', 0.4, 0.4], speed: 3.2 }, { cam: [0.4, -0.9, 1.25], t: 2.4 },
      ...SHADOWS.map((k, i) => ({ enter: ['x' + k, [-6, -4.2, -2.4, -0.6, 1.4, 3.2, 5][i], -2.6] }))] },
    { all: [{ face: ['corvin', 'S'] }, { clip: ['corvin', 'Taunt', false], fps: 10 }] },
    { all: [{ title: ['VAEL', 'Sellsword Company'], slam: true, hold: 3.2 }, { seq: [{ wait: 0.08 }, { flash: [0.6, '255,236,200'] }, { fx: ['shockwave', 0.4, 0.4, 0, 3] }, { shake: 9 }, { sfx: 'horn', gain: 1 }] }] },
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

// a hero joins: they walk up to the run's leader, say their piece, and are welcomed
export function joinScene(key, leaderKey, region) {
  return {
    arena: REGION_ARENA[region] || 'meadow', cam: [3, -0.3, 1.25],
    cast: { lead: cast(leaderKey, -0.9, 0.3, { f: 'E' }), you: cast(key, 8, 0.6, { f: 'W' }) },
    steps: [
      { all: [{ walk: ['you', 1.3, 0.3] }, { cam: [0.4, -0.3, 1.4], t: 3.5 }] },
      { cam: [0.2, -0.2, 1.8], t: 0 }, { face: ['you', 'lead'] }, { face: ['lead', 'you'] }, { wait: 0.3 },
      { say: ['you', JOIN_LINES[key] || 'I will fight with you.'] },
      { say: ['lead', 'Then welcome to the company.'] },
      { all: [{ clip: ['you', 'Taunt', false], fps: 11 }, { cam: [0.6, -0.2, 1.9], t: 1.2 }] },
      { wait: 0.6 },
    ],
  };
}

// the company arrives in a new region: a slow look across the land, then they march in
export function arrivalScene(rid, teamKeys) {
  const r = REGIONS.find((x) => x.id === rid), c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, -12 - i * 1.3, [0, -1.2, 1.2, -0.6, 0.6][i], { f: 'E' }); });
  const ids = Object.keys(c);
  return {
    arena: REGION_ARENA[rid], cam: [5, -0.6, 1.15], cast: c,
    steps: [
      { all: [{ cam: [-1, -0.6, 1.15], t: 6 }, { seq: [{ wait: 1.2 }, { title: [r.name, r.blurb] }] }] },
      { all: [...ids.map((id, i) => ({ walk: [id, -2.2 - i * 1.2, c[id].y], speed: 2.1 })), { cam: [-3, -0.3, 1.3], t: 4 }] },
      { wait: 0.6 },
    ],
  };
}

// a boss stands in the company's way: a close look at it, then the company runs up to face it
export function bossScene(mission, teamKeys) {
  const [bossKey] = mission.foes.find(([k]) => ENEMIES[k].boss) || mission.foes[0], boss = ENEMIES[bossKey], c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, -11 - i * 1.2, [0, -1.2, 1.2, -0.6, 0.6][i], { f: 'E' }); });
  c.boss = { set: boss.set, name: boss.name, color: '#ff8a7a', x: 3.6, y: 0, f: 'W', scale: boss.scale || 1, big: (SETS[boss.set] || {}).scale || 1 };
  const big = (boss.scale || 1) * ((SETS[boss.set] || {}).scale || 1);
  return {
    arena: REGION_ARENA[mission.region], cam: [3.6, -0.6 - big * 0.3, Math.max(1.3, 2.2 / big)], cast: c,
    steps: [
      { wait: 0.5 }, { clip: ['boss', 'Taunt', false], fps: 11 }, { wait: 0.4 }, { shake: 5 },
      { title: [boss.name, mission.place], side: true },
      { cam: [0, -0.3, 1.2], t: 0 }, { clip: ['boss', 'idle'] },
      { all: [...Object.keys(c).filter((id) => id !== 'boss').map((id, i) => ({ walk: [id, -1.2 - (i % 3) * 1.1 - Math.floor(i / 3) * 0.6, c[id].y], run: true })), { cam: [0.6, -0.3, 1.3], t: 2.2 }] },
      { wait: 0.5 },
    ],
  };
}
