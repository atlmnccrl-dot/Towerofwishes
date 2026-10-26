// The filmed scenes (played by render/scene.js on render/stage.js). Every line here is written for the
// game: Proposal, for the author to rewrite or cut. Positions are metres along the stage; the camera
// is [x, zoom]: zoom 1 a wide shot, about 1.8 a close two-shot.
import { UNITS, ENEMIES } from './units.js';
import { REGIONS } from './campaign.js';
import { REGION_STAGE } from './stagesets.js';
import { SETS } from './anims.js';

const COLOR = { vanguard: '#8fb8ff', striker: '#ff9a72', ranger: '#a6e07e', mystic: '#c9a0ff', support: '#ffd97a' };
const cast = (key, x, o = {}) => ({ set: UNITS[key].set, name: UNITS[key].name.split(' ')[0], color: COLOR[UNITS[key].cls], x, big: (SETS[UNITS[key].set] || {}).scale || 1, ...o });

// the company signs its charter in Thornwick's square, at dawn
export const OPENING = {
  set: 'square', cam: [-9, 1],
  cast: { corvin: cast('corvin', -7.5), wren: cast('wren', 7.4, { f: -1, lane: -1 }), maren: cast('maren', 19, { f: -1 }) },
  steps: [
    { all: [{ cam: [0, 1], t: 6 }, { seq: [{ wait: 0.6 }, { title: ['Thornwick', 'A border town at the edge of what was Vael'] }] }] },
    { all: [{ follow: 'corvin' }, { walk: ['corvin', 4.4] }] },
    { cam: [5.9, 1.8], t: 0 },
    { face: ['wren', 'corvin'] }, { wait: 0.4 },
    { say: ['wren', 'Bandits on the toll bridge. The miller pays twenty silver to see them gone.'] },
    { say: ['corvin', 'Twenty silver for a bridge full of cutthroats? That is an insult.'] },
    { say: ['wren', 'It is a start. Nobody else in this town will take it.'] },
    { all: [{ cam: [7.6, 1.35], t: 1.6 }, { walk: ['maren', 10.2] }] },
    { face: ['corvin', 'maren'] }, { face: ['wren', 'maren'] },
    { say: ['maren', 'Then you will want someone to stitch you up afterwards.'] },
    { cam: [5.4, 1.9], t: 0 }, { face: ['corvin', 'E'] },
    { say: ['corvin', 'Three swords and a charter. Then we are a company.'], tone: 'shout' },
    { cam: [8, 1], t: 0 },
    { all: [{ walk: ['corvin', 30], speed: 2.1 }, { seq: [{ wait: 0.3 }, { walk: ['wren', 29], speed: 2.1 }] }, { seq: [{ wait: 0.6 }, { walk: ['maren', 28], speed: 2.1 }] },
      { cam: [17, 1], t: 6 }, { seq: [{ wait: 2.4 }, { title: ['VAEL', 'Sellsword Company'] }] }] },
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
