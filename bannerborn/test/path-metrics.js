// Movement quality in real battles (Node, stubbed art): how often units run without getting anywhere,
// flip facing, flicker between run and attack, overlap, or stand stuck; how far the group spreads.
// usage: node test/path-metrics.js [stages=0,4,8,13,20,27] [runs=2]
global.window = globalThis;
const BB = require('../js/rules.js');
BB.A = { chars: {}, env: {}, fx: null };
BB.ENV_DRAW = 0.9; BB.TW = 128 * 0.45; BB.TH = 64 * 0.45;
BB.fxLen = () => 16; BB.clipLen = () => 15; BB.hasClip = () => true; BB.heroLayers = () => [];
BB.envRect = () => null; BB.drawFx = () => {}; BB.drawEnv = () => {}; BB.drawOther = () => {};
BB.ROSTER = []; BB.poolKeys = () => []; BB.npcKeys = () => [];
BB.dirFromVec = function (dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; if (Math.abs(sx) + Math.abs(sy) < 1e-6) return null; const a = Math.atan2(sy, sx) * 180 / Math.PI; return ((Math.round(a / 45) % 8) + 8) % 8; };
require('../js/world.js'); require('../js/battle.js'); require('../js/identity.js'); require('../js/tactics.js'); require('../js/signatures.js'); require('../js/epic.js');
const stages = (process.argv[2] || '0,4,8,13,20,27').split(',').map(Number), runs = +(process.argv[3] || 2);
const comp = ['vanguard', 'berserker', 'ranger', 'warpriest', 'arcanist'];
const tot = { frames: 0, runNoProg: 0, dirFlips: 0, stateFlips: 0, overlap: 0, stuck: 0, spread: 0, spreadN: 0, wins: 0, n: 0, inProp: 0 };
for (const idx of stages) for (let k = 0; k < runs; k++) {
  const M = BB.MISSIONS[idx];
  const save = BB.newSave(1); save.settings.auto = true;
  const heroes = comp.map((c, i) => { const h = i === 0 ? BB.newCaptain() : BB.newHero({ calling: c, rarity: 1 }); h.level = M.level + 1; h.stars = 1 + Math.floor(idx / 10); return h; });
  const formation = heroes.map((h, i) => ({ hero: h, row: i < 2 ? 'front' : 'back', slot: i < 2 ? i : i - 2 }));
  const map = BB.buildMap(M.layout, BB.CHAPTERS[M.chapter - 1].biome, 1000 + idx * 10 + k, {});
  const B = new BB.Battle({ map, mission: M, formation, level: M.level, save, seed: k + 1 });
  const prev = new Map();
  let t = 0;
  while (!B.result && t < 240) {
    B.update(1 / 30, null); t += 1 / 30;
    const live = B.ents.filter((e) => !e.dead && !e.prop && !e.gate && !e.turret && !e.ward && !e.hidden && !(e.spawnT > 0));
    for (const e of live) {
      const p = prev.get(e.id);
      if (p) {
        tot.frames++;
        const moved = Math.hypot(e.x - p.x, e.y - p.y);
        const running = e.clip === 'Run';
        if (running && moved < e.spd / 30 * 0.25 && !e.leap && !e.dash) tot.runNoProg++;
        if (p.dir !== e.dir) tot.dirFlips++;
        const st = running ? 'run' : e.state === 'attack' ? 'atk' : 'idle';
        if (p.st !== st && (p.st === 'run') !== (st === 'run')) tot.stateFlips++;
        e._stillT = (running && moved < e.spd / 30 * 0.25) ? (e._stillT || 0) + 1 / 30 : 0;
        if (e._stillT > 1) tot.stuck++;
        for (const pr of BB.mapPropsNear(map, e.x, e.y)) if (pr.solid && Math.hypot(pr.x - e.x, pr.y - e.y) < pr.r * 0.8) { tot.inProp++; break; }
      }
      prev.set(e.id, { x: e.x, y: e.y, dir: e.dir, st: e.clip === 'Run' ? 'run' : e.state === 'attack' ? 'atk' : 'idle' });
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j]; if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.6) tot.overlap++;
    }
    const hs = B.heroesAlive();
    if (hs.length > 1 && !B.foesAlive().some((f) => !f.gate && Math.hypot(f.x - B.warCenter.x, f.y - B.warCenter.y) < 6)) {
      let m = 0; for (const h of hs) m = Math.max(m, Math.hypot(h.x - B.warCenter.x, h.y - B.warCenter.y)); tot.spread += m; tot.spreadN++;
    }
  }
  tot.n++; if (B.result && B.result.win) tot.wins++;
}
const pct = (v) => (100 * v / tot.frames).toFixed(1) + '%';
console.log('unit-frames', tot.frames);
console.log('running without progress', pct(tot.runNoProg));
console.log('stuck > 1 s', pct(tot.stuck));
console.log('facing changes / unit / s', (tot.dirFlips / tot.frames * 30).toFixed(2));
console.log('run<->stop flips / unit / s', (tot.stateFlips / tot.frames * 30).toFixed(2));
console.log('overlapping pairs / frame', (tot.overlap / (tot.frames / 8)).toFixed(3));
console.log('inside a prop', pct(tot.inProp));
console.log('march spread (max from centre)', (tot.spread / Math.max(1, tot.spreadN)).toFixed(2));
console.log('wins', tot.wins + '/' + tot.n);
