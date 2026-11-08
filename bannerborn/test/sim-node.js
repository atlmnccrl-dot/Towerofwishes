// Runs the battle engine in Node with stubbed art. usage: node test/sim-node.js [missionIdx|all] [runs]
global.window = globalThis;
const BB = require('../js/rules.js');
// stubs for the art layer
BB.A = { chars: {}, env: {}, fx: null };
BB.ENV_DRAW = 0.9; BB.TW = 128 * 0.45; BB.TH = 64 * 0.45;
BB.fxLen = () => 16; BB.clipLen = () => 15; BB.hasClip = () => true; BB.heroLayers = () => [];
BB.envRect = () => null; BB.drawFx = () => {}; BB.drawEnv = () => {}; BB.drawOther = () => {};
BB.ROSTER = []; BB.poolKeys = () => []; BB.npcKeys = () => [];
BB.dirFromVec = function (dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; if (Math.abs(sx) + Math.abs(sy) < 1e-6) return null; const a = Math.atan2(sy, sx) * 180 / Math.PI; return ((Math.round(a / 45) % 8) + 8) % 8; };
require('../js/world.js'); require('../js/battle.js');
const which = process.argv[2] || 'all', runs = +(process.argv[3] || 2);
const list = which === 'all' ? BB.MISSIONS.map((_, i) => i) : [+which];
let bad = 0;
for (const idx of list) {
  const M = BB.MISSIONS[idx];
  const agg = { n: 0, w: 0, t: 0, alive: 0, to: 0, minF: 1 };
  for (let k = 0; k < runs; k++) {
    const save = BB.newSave(); save.settings.auto = true;
    const r = BB.rng(idx * 100 + k + 1);
    const comps = [['vanguard', 'ranger', 'warpriest'], ['vanguard', 'ranger', 'warpriest', 'arcanist'], ['berserker', 'arcanist', 'warpriest', 'ranger'], ['vanguard', 'berserker', 'ranger', 'arcanist'],
      ['lancer', 'monk', 'warpriest', 'shadowblade'], ['vanguard', 'shadowblade', 'arcanist', 'monk']];
    const comp = idx < 2 ? comps[0] : comps[1 + (k % 5)];
    const heroes = comp.map((c, i) => {
      const h = BB.newHero({ calling: c, level: M.level, seed: i + k * 7 });
      // what a player has by then: a few pieces of loot, a perk per level
      for (const slot of ['chest', 'weapon', 'head', 'legs']) if (r() < Math.min(0.9, 0.25 + idx * 0.08)) {
        const it = BB.makeItem(r, slot, Math.max(1, M.level - 1), BB.rollRarity(r, 0), slot === 'weapon' ? BB.weaponType(c) : undefined);
        if (BB.canEquip(h, it)) h.gear[slot] = it;
      }
      for (let L = 2; L <= M.level; L++) { const ch = BB.perkChoices(h, L * 31 + i); if (ch.length) h.perks.push(ch[0].id); }
      return h;
    });
    const map = BB.buildMap(M.layout, BB.REGIONS.find((x) => x.id === M.region).biome, 1000 + idx * 10 + k, {});
    const B = new BB.Battle({ map, mission: M, heroes, level: M.level, save, seed: k + 1 });
    let t = 0; const t0 = Date.now();
    while (!B.result && t < 400) {
      B.update(1 / 30, null); t += 1 / 30;
      if (B.rally >= 100) B.useRally();
      for (const e of B.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) { console.log('NaN', idx, e.kind || e.calling, e.x, e.y, e.hp); bad++; e.x = e.y = 10; e.hp = 0; }
      if (B.ents.length > 400 || B.projs.length > 2000 || B.timers.length > 500) { console.log('RUNAWAY', idx, B.ents.length, B.projs.length, B.timers.length); bad++; break; }
    }
    const res = B.result ? (B.result.win ? 'win' : 'loss') : 'timeout';
    agg.n++; if (res === 'win') { agg.w++; agg.t += t; agg.alive += B.heroesAlive().length; } if (res === 'timeout') { agg.to++; bad++; }
    agg.minF = Math.min(agg.minF, B.metrics.minFrac);
  }
  console.log((M.id + ' ' + M.name).padEnd(36), M.type.padEnd(7), 'L' + String(M.level).padEnd(3), 'win ' + agg.w + '/' + agg.n, 'avg ' + (agg.w ? Math.round(agg.t / agg.w) : '-') + 's', 'alive ' + (agg.w ? (agg.alive / agg.w).toFixed(1) : '-'), agg.to ? 'TIMEOUTS ' + agg.to : '');
}
process.exit(bad ? 1 : 0);
