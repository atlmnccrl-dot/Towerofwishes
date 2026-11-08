// Team roles in real battles (Node, stubbed art): do archers stay behind the shields, do assassins flank and backstab,
// do stalkers go for the back line, do enemy archers fall back behind their shields? usage: node test/teamwork.js [stages] [runs]
global.window = globalThis;
const BB = require('../js/rules.js');
BB.A = { chars: {}, env: {}, fx: null };
BB.ENV_DRAW = 0.9; BB.TW = 128 * 0.45; BB.TH = 64 * 0.45;
BB.fxLen = () => 16; BB.clipLen = () => 15; BB.hasClip = () => true; BB.heroLayers = () => [];
BB.envRect = () => null; BB.drawFx = () => {}; BB.drawEnv = () => {}; BB.drawOther = () => {};
BB.ROSTER = []; BB.poolKeys = () => []; BB.npcKeys = () => [];
BB.dirFromVec = function (dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; if (Math.abs(sx) + Math.abs(sy) < 1e-6) return null; const a = Math.atan2(sy, sx) * 180 / Math.PI; return ((Math.round(a / 45) % 8) + 8) % 8; };
require('../js/world.js'); require('../js/battle.js');
const stages = (process.argv[2] || '6,9,14,18,21,26').split(',').map(Number), runs = +(process.argv[3] || 2);
const T = { backFrames: 0, backBehind: 0, stabs: 0, asnHits: 0, asnBackHits: 0, stalkHits: 0, stalkBackHits: 0, foeFlee: 0, foeRangedFrames: 0, peel: 0, peelChances: 0, time: 0, wins: 0, n: 0 };
const comp = ['vanguard', 'shadowblade', 'ranger', 'warpriest', 'arcanist'];
for (const idx of stages) for (let k = 0; k < runs; k++) {
  const M = BB.MISSIONS[idx];
  const save = BB.newSave(1); save.settings.auto = true;
  const heroes = comp.map((c, i) => { const h = i === 0 ? BB.newCaptain() : BB.newHero({ calling: c, rarity: 1 }); h.level = M.level + 1; h.stars = 1 + Math.floor(idx / 10); return h; });
  const formation = heroes.map((h, i) => ({ hero: h, row: i < 2 ? 'front' : 'back', slot: i < 2 ? i : i - 2 }));
  const map = BB.buildMap(M.layout, BB.CHAPTERS[M.chapter - 1].biome, 2000 + idx * 10 + k, {});
  const B = new BB.Battle({ map, mission: M, formation, level: M.level, save, seed: k + 3 });
  const orig = B.hit.bind(B);
  B.hit = function (src, tgt, mult, o) {
    if (src && tgt && !(o && o.aoe)) {
      const sr = B.roleOf(src), tr = B.roleOf(tgt);
      if (src.stealth) T.stabs++;
      if (src.side === 'hero' && sr === 'assassin') { T.asnHits++; if (tr === 'ranged' || tr === 'healer') T.asnBackHits++; }
      if (src.side === 'foe' && sr === 'assassin') { T.stalkHits++; if (tr === 'ranged' || tr === 'healer') T.stalkBackHits++; }
    }
    return orig(src, tgt, mult, o);
  };
  let t = 0;
  while (!B.result && t < 400) {
    B.update(1 / 30, null); t += 1 / 30;
    if (!B.frontEngaged || !B.tankAnchor) continue;
    for (const e of B.heroesAlive()) {
      const r = B.roleOf(e); if (r !== 'ranged' && r !== 'healer') continue;
      T.backFrames++;
      if ((e.x - B.tankAnchor.x) * B.fdir.x + (e.y - B.tankAnchor.y) * B.fdir.y < 0.3) T.backBehind++;
    }
    for (const f of B.foesAlive()) if (B.roleOf(f) === 'ranged') { T.foeRangedFrames++; if (f.fleeT > 0 && f.state === 'run') T.foeFlee++; }
    const tank = B.heroTanks && B.heroTanks[0];
    if (tank && B.foesAlive().some((f) => f.tgt && (B.roleOf(f.tgt) === 'ranged' || B.roleOf(f.tgt) === 'healer') && Math.hypot(f.x - tank.x, f.y - tank.y) < 6)) { T.peelChances++; if (tank.tgt && tank.tgt.tgt && (B.roleOf(tank.tgt.tgt) === 'ranged' || B.roleOf(tank.tgt.tgt) === 'healer')) T.peel++; }
  }
  T.n++; T.time += t; if (B.result && B.result.win) T.wins++;
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) : '-') + '%';
console.log('battles', T.n, 'wins', T.wins, 'avg length', Math.round(T.time / T.n) + 's');
console.log('archers/healers behind the shield line while fighting', pct(T.backBehind, T.backFrames));
console.log('backstabs', T.stabs);
console.log('hero assassin hits on back-liners', pct(T.asnBackHits, T.asnHits), 'of', T.asnHits);
console.log('stalker hits on back-liners', pct(T.stalkBackHits, T.stalkHits), 'of', T.stalkHits);
console.log('enemy archers falling back (frames)', pct(T.foeFlee, T.foeRangedFrames));
console.log('tank peeling when a back-liner is attacked', pct(T.peel, T.peelChances));
