// The filmed scenes (played by render/scene.js). Every line here is written for the game: Proposal,
// for the author to rewrite or cut. Positions in metres on the arena (see data/arenas.js).
import { UNITS, ENEMIES } from './units.js';
import { REGIONS } from './campaign.js';
import { REGION_ARENA } from './arenas.js';

const COLOR = { vanguard: '#8fb3d9', striker: '#e08a6a', ranger: '#9fd07a', mystic: '#b99cf0', support: '#f0d27a' };
const cast = (key, at, o = {}) => ({ set: UNITS[key].set, name: UNITS[key].name.split(' ')[0], color: COLOR[UNITS[key].cls], at, ...o });
const N = -Math.PI / 2, W = Math.PI, E = 0;

// the company signs its charter in Thornwick
export const OPENING = {
  arena: 'square', cam: [-4, -2.4, 1.15],
  cast: { corvin: cast('corvin', [-12, 0.6]), wren: cast('wren', [1.4, -3.3], { f: W }), maren: cast('maren', [13, 1.2], { f: W }) },
  steps: [
    { title: ['Thornwick', 'A border town at the edge of what was Vael'] },
    { all: [{ walk: ['corvin', -1.9, -3.1] }, { cam: [-0.8, -3.0, 1.45], t: 4 }] },
    { face: ['corvin', N] }, { wait: 0.8 },
    { say: ['wren', 'Bandits on the toll bridge. The miller pays twenty silver to see them gone.'] },
    { face: ['corvin', 'wren'] },
    { say: ['corvin', 'Twenty silver for a bridge full of cutthroats? That is an insult.'] },
    { say: ['wren', 'It is a start. Nobody else in this town will take it.'] },
    { all: [{ walk: ['maren', 2.6, -1.4] }, { cam: [0.4, -2.7, 1.4], t: 2.4 }] },
    { face: ['maren', 'corvin'] }, { face: ['corvin', 'maren'] }, { face: ['wren', 'maren'] },
    { say: ['maren', 'Then you will want someone to stitch you up afterwards.'] },
    { say: ['corvin', 'Three swords and a charter. Then we are a company.'], tone: 'shout' },
    { all: [{ walk: ['corvin', 15, 0.2], speed: 2.2 }, { walk: ['wren', 14, -1.0], speed: 2.2 }, { walk: ['maren', 13.5, 1.0], speed: 2.2 }, { cam: [8, -1.6, 1.05], t: 4.5 }] },
    { title: ['VAEL', 'Sellsword Company'] },
  ],
};

// what each recruit says on joining (Proposal)
export const JOIN_LINES = {
  hesta: 'You held the far end of my bridge. My spear is yours, for as long as the river runs.',
  pell: 'Somebody has to feed you lot. And I hit harder than I bake.',
  ysolde: 'Garrow kept me in a cage for a month. I would like to set fire to a few more of his kind.',
  brann: 'Nobody has stood up to me in the pit for a year. I will follow anyone who can.',
  sable: 'The caller is dead and I am out of work. Hexes are cheaper by the dozen.',
  vesk: 'I steal from the living and the dead alike. With you, at least, it pays.',
  saela: 'The dawn order is one archer now. Let that archer ride with you.',
  cairn: 'BOUND. THEN UNBOUND. I REMEMBER THE OATH OF THE ROAD. I WALK WITH YOU.',
  osric: 'The north gate fell without me. I will not let another one fall.',
  thistle: 'The lanterns can burn without me for a while. The wolves come too.',
  grath: 'The fen is in my blood. So is the fight.',
  pip: 'I owe you my neck. I always pay my debts. Mostly.',
  tam: 'My fists are slow to anger and quick to end it.',
  nyssa: 'They burned my books. I will burn their banners. Fair trade.',
  garrick: 'Thirty years with the guild and they left me holding the hall. You came back for me.',
  ilse: 'Dawn breaks on the ones who stand. I will stand with you.',
  rhys: 'I climbed for something I never found. Maybe it was down here.',
  moraine: 'My oath is broken. Give me a better one.',
  kesh: 'My debt is paid in blood and snow. Now I choose who I serve.',
  aldren: 'I called the dead from their graves. Let me spend what is left of me sending them back.',
};

// a recruit walks up to the company's leader and joins
export function joinScene(key, leaderKey, region) {
  const d = UNITS[key];
  return {
    arena: REGION_ARENA[region] || 'meadow', cam: [0, -0.8, 1.55],
    cast: { lead: cast(leaderKey, [-2.4, 0], { f: E }), you: cast(key, [11, 0.4], { f: W }) },
    steps: [
      { all: [{ walk: ['you', 1.6, 0.1] }, { cam: [-0.4, -0.6, 1.8], t: 3 }] },
      { face: ['you', 'lead'] },
      { say: ['you', JOIN_LINES[key] || 'I will fight with you.'] },
      { say: ['lead', 'Then welcome to the company.'] },
      { clip: ['you', 'Taunt', false] },
      { title: [`${d.name} joins the company`, d.title] },
    ],
  };
}

// the company arrives in a new region
export function arrivalScene(rid, teamKeys) {
  const r = REGIONS.find((x) => x.id === rid), c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, [-13 - i * 1.4, -1.2 + (i % 3) * 1.1]); });
  return {
    arena: REGION_ARENA[rid], cam: [-6, -1.6, 1.15], cast: c,
    steps: [
      { all: [...Object.keys(c).map((id, i) => ({ walk: [id, -3 + i * 1.3, -1.4 + (i % 3) * 1.2], speed: 1.8 })), { cam: [1, -1.4, 1.05], t: 5 }] },
      { title: [r.name, r.blurb] },
    ],
  };
}

// a boss stands in the company's way: a face-off before the fight
export function bossScene(mission, teamKeys) {
  const [bossKey] = mission.foes.find(([k]) => ENEMIES[k].boss) || mission.foes[0], boss = ENEMIES[bossKey], c = {};
  teamKeys.slice(0, 5).forEach((k, i) => { c['m' + i] = cast(k, [-10 - i, -1 + (i % 3) * 1.0]); });
  c.boss = { set: boss.set, name: boss.name, color: '#ff8a7a', at: [4.5, 0], f: W, scale: boss.scale || 1 };
  return {
    arena: REGION_ARENA[mission.region], cam: [3.5, -0.8, 1.7], cast: c,
    steps: [
      { clip: ['boss', 'Taunt', false] }, { wait: 0.6 }, { shake: 1 },
      { title: [boss.name, mission.place] },
      { all: [...Object.keys(c).filter((id) => id !== 'boss').map((id, i) => ({ walk: [id, -5 - (i % 2) * 1.2, -1.2 + (i % 3) * 1.1], run: true })), { cam: [0, -0.6, 1.1], t: 2 }] },
    ],
  };
}
