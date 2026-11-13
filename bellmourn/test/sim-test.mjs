// Balance and invariants for the fight simulation (Node, no browser).
// node bellmourn/test/sim-test.mjs [seeds=12]
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HERO_ORDER, WEAPONS, weaponsOfType } from '../js/game/heroes.js';

const N = +(process.argv[2] || 12);
const ARENA = { bounds: [-14, -14, 14, 14], solids: [{ x: -6, z: -6, r: 0.8, h: 3 }, { x0: 5, z0: 4, x1: 7, z1: 6, h: 3 }] };
// what each hero has on reaching district `tier` (0-7): levels, a better weapon, upgrades, relics
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId);
  P.level = 1 + tier * 3; const H = HERO_ORDER; const ws = weaponsOfType(Object.values(WEAPONS).find(() => true) && { warden: 'blade', huntress: 'bow', bellbreaker: 'hammer', lamplighter: 'focus' }[heroId]);
  P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) };
  return heroStats(save, heroId);
}
const HERO_ID = process.env.HERO || 'warden';
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };

function run(setup, skill, seed, tier, maxT = 240) {
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 8, prog(HERO_ID, tier));
  const foes = setup(w, tier); const bot = makeBot(skill, seed * 7 + 1);
  let t = 0; const dt = 1 / 60;
  while (t < maxT && !hero.dead && w.foes().length) {
    w.update(dt, bot(w, dt)); w.drain(); t += dt;
    for (const e of w.ents) {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) { bad(`NaN on ${e.type}`); return { win: false, t, timeout: false, nan: true }; }
      const [x0, z0, x1, z1] = w.bounds; if (e.x < x0 - 0.01 || e.x > x1 + 0.01 || e.z < z0 - 0.01 || e.z > z1 + 0.01) { bad(`${e.type} outside bounds`); return { win: false, t }; }
      if (!e.dead && e.state === 'windup' && e.t > 6) { bad(`${e.type} stuck in windup`); return { win: false, t }; }
    }
  }
  return { win: !hero.dead && !w.foes().length, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT, stats: w.stats };
}

function scenario(name, setup, tier, opts = {}) {
  for (const skill of opts.skills || [0, 1]) {
    let wins = 0, time = 0, hp = 0, to = 0, crits = 0, perfects = 0;
    for (let s = 1; s <= N; s++) { const r = run(setup, skill, s * 31 + tier, tier, opts.maxT); if (r.win) { wins++; hp += r.hp; } time += r.t; if (r.timeout) to++; crits += r.stats?.crits || 0; perfects += r.stats?.perfects || 0; }
    const wr = wins / N;
    console.log(`${name.padEnd(28)} skill ${skill}: win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  timeouts ${to}  crits ${(crits / N).toFixed(1)} perfects ${(perfects / N).toFixed(1)}`);
    if (to) bad(`${name}: ${to} timeouts`);
    const target = opts.target && opts.target[skill]; if (target && (wr < target[0] || wr > target[1])) console.log(`  note: ${name} skill ${skill} win rate ${(wr * 100).toFixed(0)}% outside target ${target[0] * 100}-${target[1] * 100}%`);
  }
}

const one = (type) => (w, tier) => [w.spawnFoe(type, 0, -4, { tier, aggro: true, rise: false })];
const group = (list) => (w, tier) => list.map(([t, x, z]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false }));
// as the districts spawn them (belfry.js gives Saint Silence dmgMul 1.3)
const BOSS_OPTS = { silence: { dmgMul: 1.3 } };
const boss = (type) => (w, tier) => [w.spawnBoss(type, 0, -6, { face: 0, ...(BOSS_OPTS[type] || {}) })];

console.log(`seeds: ${N}  hero: ${HERO_ID}`);
for (const t of ['hushed', 'ghoul', 'acolyte', 'crossbow', 'warden', 'brute']) scenario(`1v1 ${t} (tier 0)`, one(t), 0, { skills: [0, 1] });
scenario('courtyard wave 1 (3 hushed)', group([['hushed', 1.4, -2.6], ['hushed', 3.6, -0.6], ['hushed', 4.9, -4.6]]), 0, { target: { 0: [0.4, 0.95], 1: [0.85, 1] } });
scenario('mixed pack tier 1', group([['hushed', -3, -4], ['ghoul', 3, -3], ['acolyte', 0, -10], ['crossbow', 8, -8]]), 1);
scenario('heavy pack tier 2', group([['warden', -3, -4], ['brute', 3, -5], ['acolyte', 0, -10], ['hushed', 6, -2]]), 2);
scenario('elite pack tier 3', group([['warden', -3, -4], ['warden', 3, -4], ['brute', 0, -7], ['crossbow', 9, -9], ['acolyte', -9, -9]]), 3);
for (const [type, tier] of [['gaoler', 0], ['tallow', 1], ['harbormaster', 2], ['deacon', 3], ['ossuary', 4], ['founder', 5], ['regent', 6], ['silence', 7]]) scenario('BOSS ' + type, boss(type), tier, { maxT: 360, target: { 0: [0, 0.5], 1: [0.4, 1] } });
for (const t of ['hound', 'bomber', 'gargoyle', 'shade', 'chanter', 'sentinel', 'rat', 'spitter', 'knight']) scenario(`1v1 ${t} (tier 3)`, one(t), 3, { skills: [1] });
scenario('elite pack tier 5', (w, tier) => [['knight', -3, -4, 'shielded'], ['shade', 3, -4, 'hasted'], ['bomber', 0, -9, 'burning'], ['hound', 5, -2, 'vampiric']].map(([t, x, z, el]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false, elite: el })), 5);
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
