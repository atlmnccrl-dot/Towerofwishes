// Plays every stage with the bot at three skill levels and checks the invariants:
// no NaN, everyone inside the arena, every fight ends, arts fire. Prints win rates and lengths.
// Usage: node vesper/test/sim-test.js [runs]
require('../js/data.js'); require('../js/sim.js');
const VS = globalThis.VS, D = VS.DATA, S = VS.sim;
const runs = +process.argv[2] || 40, DT = 1 / 60;
let fail = 0;
const bad = (m) => { fail++; if (fail < 20) console.log('FAIL', m); };

function play(stage, skill, seed, boons) {
  const s = S.create(stage, { seed, boons });
  let t = 0;
  while (!s.result && t < 300) {
    const inp = S.bot(s, skill);
    if (s.cine) inp.skip = false;
    S.step(s, DT, inp); t += DT;
    for (const u of s.units) {
      if (!isFinite(u.x) || !isFinite(u.y) || !isFinite(u.hp)) { bad(`NaN stage ${stage} unit ${u.key}`); return { result: 'nan', t }; }
      if (Math.hypot(u.x, u.y) > D.ARENA.r + 0.5) { bad(`out of arena stage ${stage} ${u.key} ${u.x},${u.y}`); return { result: 'out', t }; }
    }
    if (!isFinite(s.moon) || s.moon < 0 || s.moon > 100) bad('moon ' + s.moon);
  }
  if (!s.result) bad(`timeout stage ${stage} skill ${skill} seed ${seed}`);
  return { result: s.result || 'timeout', t, st: s.stats, hp: s.hero.hp / s.hero.maxHp };
}

const boonSets = { none: [], three: ['edge', 'guard', 'moonblood'] };
console.log('stage                 skill  boons   win%   avg s  arts  ldx   parries');
for (let st = 0; st < D.STAGES.length; st++) {
  for (const skill of [0.3, 0.55, 0.8]) {
    for (const bk of skill === 0.55 ? ['none', 'three'] : ['none']) {
      let w = 0, T = 0, arts = 0, ldx = 0, par = 0;
      for (let i = 0; i < runs; i++) {
        const r = play(st, skill, 1000 + i * 7919, boonSets[bk].concat(st >= 3 && bk === 'three' ? ['vigor', 'fourth'] : []));
        if (r.result === 'win') w++; T += r.t; arts += r.st ? r.st.arts : 0; ldx += r.st ? r.st.ldx : 0; par += r.st ? r.st.parries : 0;
      }
      console.log(`${D.STAGES[st].name.padEnd(22)}${String(skill).padEnd(7)}${bk.padEnd(8)}${String(Math.round(w / runs * 100)).padStart(4)}  ${(T / runs).toFixed(1).padStart(6)}  ${(arts / runs).toFixed(1).padStart(4)}  ${(ldx / runs).toFixed(2).padStart(4)}  ${(par / runs).toFixed(1).padStart(6)}`);
    }
  }
}
// The Last Ditch Effort opens at low health and does more than the Red Moon.
{
  const s = S.create(5, { seed: 3 }); S.step(s, DT, {});
  for (let i = 0; i < 2000 && !(s.wave === s.waves.length - 1 && s.freeze <= 0); i++) { for (const u of S.foes(s)) if (!u.def.boss) u.hp = 0, u.alive = false, u.state = 'dead'; S.step(s, DT, {}); }
  const boss = S.foes(s).find((u) => u.def.boss);
  if (!boss) bad('no boss in the last stage');
  else {
    s.moon = 100; s.hero.hp = s.hero.maxHp * 0.25; const hp0 = boss.hp;
    if (!S.startArt(s) || s.cine.kind !== 'ldx') bad('ldx did not open at 25% health');
    let n = 0; while (s.cine && n++ < 1000) S.step(s, DT, {});
    const ldx = hp0 - boss.hp;
    if (s.hero.hp <= s.hero.maxHp * 0.25) bad('ldx did not heal');
    boss.hp = hp0; s.moon = 100; s.hero.hp = s.hero.maxHp; boss.state = 'idle';
    S.startArt(s); if (!s.cine || s.cine.kind !== 'moon') bad('red moon did not open at full health');
    S.step(s, DT, { skip: true }); n = 0; while (s.cine && n++ < 1000) S.step(s, DT, {});
    const moon = hp0 - boss.hp;
    console.log(`art damage on the First Cut: Last Ditch ${ldx}, Red Moon ${moon}`);
    if (!(ldx > moon && moon > 0)) bad('ldx should hit harder than the red moon');
  }
}
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
