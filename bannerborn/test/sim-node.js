// Runs every campaign stage in Node with stubbed art. usage: node test/sim-node.js [stageIdx|all] [runs]
//   PLACED=1  heroes stand at the game's default places (free placement) instead of the old fixed slots
//   LAG=n   heroes are n levels below the stage (default 1)      NOULT=1  nobody casts ultimates (Auto off, no taps)
//   GEAR=1  every hero has a weapon and armour                   REAL=1  heroes as a player really has them: a level or two over the
//                                                                stage, all four gear slots, every skill point (what the bot measured)
//   prints, per stage: wins, time, the lowest the team's health fell (wins only) and how many were left standing
global.window = globalThis;
const BB = require('../js/rules.js');
BB.A = { chars: {}, env: {}, fx: null };
BB.ENV_DRAW = 0.9; BB.TW = 128 * 0.45; BB.TH = 64 * 0.45;
BB.fxLen = () => 16; BB.clipLen = () => 15; BB.hasClip = () => true; BB.heroLayers = () => [];
BB.envRect = () => null; BB.drawFx = () => {}; BB.drawEnv = () => {}; BB.drawOther = () => {};
BB.ROSTER = []; BB.poolKeys = () => []; BB.npcKeys = () => [];
BB.dirFromVec = function (dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; if (Math.abs(sx) + Math.abs(sy) < 1e-6) return null; const a = Math.atan2(sy, sx) * 180 / Math.PI; return ((Math.round(a / 45) % 8) + 8) % 8; };
require('../js/world.js'); require('../js/battle.js'); require('../js/structures.js'); require('../js/modes.js'); require('../js/identity.js'); require('../js/tactics.js'); require('../js/signatures.js'); require('../js/epic.js'); require('../js/traits.js');
if (process.env.DIFF) BB.DIFF.flat = process.env.DIFF.split(',').map(Number); // DIFF=health,damage: one raise for every level, to find what a land needs
const which = process.argv[2] || 'all', runs = +(process.argv[3] || 4);
const REAL = !!process.env.REAL, LAG = process.env.LAG !== undefined ? +process.env.LAG : REAL ? -1.5 : 1;
const list = which === 'all' ? BB.MISSIONS.map((_, i) => i) : [+which];
const TREK = +process.env.TREK || 0; // TREK=n: instead of the stage, the expedition of land n at that stage's level (it picks the first choice at each gate, or CHOICE=1 the second)
let bad = 0;
const comps = [['vanguard', 'ranger', 'warpriest', 'berserker', 'arcanist'], ['vanguard', 'lancer', 'ranger', 'arcanist', 'warpriest'], ['monk', 'shadowblade', 'warpriest', 'ranger', 'arcanist']];
for (const idx of list) {
  const M0 = BB.MISSIONS[idx];
  let M = M0;
  const agg = { n: 0, w: 0, t: 0, alive: 0, to: 0, low: 0 };
  for (let k = 0; k < runs; k++) {
    const r = BB.rng(idx * 100 + k + 1);
    const save = BB.newSave(1); save.settings.auto = !process.env.NOULT;
    const n = +process.env.TEAM || BB.slotsAt(idx); // as many heroes as the campaign has opened places for by this stage
    const lvl = Math.max(1, Math.round(M.level - LAG + (REAL && idx < 12 ? 0.5 : 0))); // the bot ran two levels over in the first lands, one after
    const heroes = comps[k % 3].slice(0, n).map((c, i) => {
      const h = i === 0 ? BB.newCaptain() : BB.newHero({ calling: c, rarity: Math.min(3, Math.floor(idx / 8)), seed: i + k * 7 });
      h.level = lvl; h.stars = Math.min(5, 1 + Math.floor(idx / 10));
      for (const slot of (REAL ? BB.SLOTS : ['weapon', 'chest'])) if (REAL || process.env.GEAR || r() < Math.min(0.9, 0.3 + idx * 0.05)) h.gear[slot] = BB.makeItem(r, slot, Math.max(1, lvl - (REAL ? 0 : 1)), r() < (REAL ? 0.6 : 0.3) ? 1 : 0, slot === 'weapon' ? BB.weaponType(h.calling) : undefined);
      if (REAL) { let more = true, guard = 0; while (more && guard++ < 200) { more = false; for (const id in BB.TREE_BY_ID) if (BB.canLearn(h, id) && BB.learn(h, id)) more = true; } }
      return h;
    });
    const formation = heroes.map((h, i) => ({ hero: h, row: i < 2 ? 'front' : 'back', slot: i < 2 ? i : i - 2 }));
    if (process.env.PLACED) { const D = { front: [[0.74, 0.36], [0.78, 0.64]], back: [[0.24, 0.24], [0.28, 0.5], [0.32, 0.76]] }; formation.forEach((f) => { f.u = D[f.row][f.slot][0]; f.v = D[f.row][f.slot][1]; }); } // as the game places them
    if (TREK) M = BB.expedition(TREK, M0.level, 100 + k);
    const map = BB.buildMap(M.layout, BB.CHAPTERS[M.chapter - 1].biome, 1000 + idx * 10 + k, {});
    const B = new BB.Battle({ map, mission: M, formation, heroes, level: M.level, save, seed: k + 1 }); // heroes: the horde is sized to the team, as in the game
    let t = 0;
    while (!B.result && t < (TREK ? 900 : 400)) {
      if (B.choice) B.trekChoose(+process.env.CHOICE || 0);
      B.update(1 / 30, null); t += 1 / 30;
      for (const e of B.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) { console.log('NaN', idx, e.kind || e.calling); bad++; e.x = e.y = 10; e.hp = 0; }
      if (B.ents.length > 400 || B.projs.length > 2000 || B.timers.length > 500) { console.log('RUNAWAY', idx); bad++; break; }
    }
    const res = B.result ? (B.result.win ? 'win' : 'loss') : 'timeout';
    agg.n++; if (res === 'win') { agg.w++; agg.t += t; agg.alive += B.heroesAlive().length; agg.low += B.lowHp === undefined ? 1 : B.lowHp; } if (res === 'timeout') { agg.to++; bad++; }
  }
  console.log((M.code + ' ' + M.name).padEnd(36), M.type.padEnd(7), 'L' + String(M.level).padEnd(3), 'team ' + (+process.env.TEAM || BB.slotsAt(idx)), 'win ' + agg.w + '/' + agg.n, 'avg ' + (agg.w ? Math.round(agg.t / agg.w) : '-') + 's', 'low ' + (agg.w ? Math.round(agg.low / agg.w * 100) + '%' : '-'), 'left ' + (agg.w ? (agg.alive / agg.w).toFixed(1) : '-'), agg.to ? 'TIMEOUTS ' + agg.to : '');
}
process.exit(bad ? 1 : 0);
