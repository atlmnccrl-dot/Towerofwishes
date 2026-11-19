// Balance and invariants for Act II's bosses (bosses3.js), as sim-test.mjs does for the first eight.
// node bellmourn/test/boss3-test.mjs [seeds=12]      HERO=warden|huntress|bellbreaker|lamplighter
// Targets: the skilled bot (skill 1) wins 40-100 %, the masher (skill 0) rarely; no timeouts, no NaN,
// nobody outside the arena, nobody stuck in a windup or a rite.
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HERO_ORDER, WEAPONS, weaponsOfType, MAX_LEVEL } from '../js/game/heroes.js';
import { BOSSES2, BOSS_AI2 } from '../js/game/bosses2.js';
import { UNITS } from '../js/game/units.js';
import { FOES } from '../js/game/defs.js';

const N = +(process.argv[2] || 12);
// about the size of a district's boss arena (20 x 18 m), with two pillars
const ARENA = { bounds: [-10, -9, 10, 9], solids: [{ x: -5, z: -3, r: 0.7, h: 3 }, { x0: 4, z0: 2, x1: 5.4, z1: 3.4, h: 3 }] };
// what each hero has on reaching district `tier`: the same curve as sim-test.mjs (levels capped at the max)
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId);
  P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const ws = weaponsOfType({ warden: 'blade', huntress: 'bow', bellbreaker: 'hammer', lamplighter: 'focus' }[heroId]);
  P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) };
  return heroStats(save, heroId);
}
const HEROES = process.env.HERO ? process.env.HERO.split(',') : HERO_ORDER;
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };

function run(type, heroId, skill, seed, tier, maxT = 360) {
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 6, prog(heroId, tier));
  const boss = w.spawnBoss(type, 0, -4, { face: 0 }); const bot = makeBot(skill, seed * 7 + 1);
  let t = 0; const dt = 1 / 60; let maxAdds = 0, hidT = 0, chanT = 0; const moves = new Set(); const phases = new Set([1]);
  while (t < maxT && !hero.dead && w.foes().length) {
    w.update(dt, bot(w, dt)); t += dt;
    for (const ev of w.drain()) { if (ev.type === 'tele' && ev.e === boss) moves.add(ev.atk.name); if (ev.type === 'phase') phases.add(ev.phase); }
    if (boss.ai.chan && boss.state === 'idle') { chanT += dt; moves.add('rite:' + boss.ai.chan.id); } else chanT = 0;
    if (boss.hidden && !boss.dead) { hidT += dt; moves.add('hidden'); } else hidT = 0;
    if (chanT > 8) { bad(`${type} stuck in a rite`); return { win: false, t }; }
    if (hidT > 8) { bad(`${type} stuck hidden`); return { win: false, t }; }
    maxAdds = Math.max(maxAdds, w.foes().length - (boss.dead ? 0 : 1));
    for (const e of w.ents) {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) { bad(`NaN on ${e.type}`); return { win: false, t }; }
      const [x0, z0, x1, z1] = w.bounds; if (e.x < x0 - 0.01 || e.x > x1 + 0.01 || e.z < z0 - 0.01 || e.z > z1 + 0.01) { bad(`${e.type} outside bounds`); return { win: false, t }; }
      if (!e.dead && e.state === 'windup' && e.t > 6) { bad(`${e.type} stuck in windup`); return { win: false, t }; }
    }
    for (const z of w.hazards) if (!Number.isFinite(z.x) || !Number.isFinite(z.z) || !Number.isFinite(z.dmg)) { bad(`${type}: a hazard with NaN`); return { win: false, t }; }
  }
  return { win: !hero.dead && !w.foes().length, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT, maxAdds, moves, phases, bossLeft: boss.dead ? 0 : boss.hp / boss.maxHp };
}

const LIST = [['frostgiant', 8], ['sandwyrm', 9], ['lich', 10], ['archon', 11]];
for (const [type] of LIST) {
  const D = BOSSES2[type], B = BOSS_AI2[type];
  if (!D || !B) { bad(`${type} is not registered`); continue; }
  if (!D.name || !D.title || !D.look || !D.boss) bad(`${type}: name, title, look and boss flag`);
  if (D.hp < 7400 || D.hp > 9000) bad(`${type}: hp ${D.hp} off the curve (7400-9000)`);
  if (!B.phases || B.phases.length !== 2) bad(`${type}: three phases`);
  const ids = new Set([1, 2, 3].flatMap((p) => B.moves(p).map((m) => m.id))); if (ids.size < 5) bad(`${type}: ${ids.size} moves`);
}
const missing = ['frostwolf', 'icewraith', 'yeti', 'scorpion', 'sandworm', 'mummy', 'bonecaster', 'slime', 'cryptspider', 'imp', 'hellhound', 'cultist', 'demon', 'seraph'].filter((k) => !UNITS[k] && !FOES[k]);
console.log(`seeds: ${N}  heroes: ${HEROES.join(', ')}${missing.length ? '\nnot registered yet (their stand-ins summoned instead): ' + missing.join(', ') : ''}`);
for (const heroId of HEROES) for (const [type, tier] of LIST) for (const skill of [0, 1]) {
  let wins = 0, time = 0, hp = 0, to = 0, adds = 0, left = 0; const moves = new Set(), phases = new Set();
  for (let s = 1; s <= N; s++) {
    const r = run(type, heroId, skill, s * 37 + tier, tier); if (!r.moves) continue;
    if (r.win) { wins++; hp += r.hp; } else left += r.bossLeft; time += r.t; if (r.timeout) to++; adds = Math.max(adds, r.maxAdds);
    for (const m of r.moves) moves.add(m); for (const p of r.phases) phases.add(p);
  }
  const wr = wins / N;
  console.log(`${heroId.padEnd(11)} ${type.padEnd(10)} t${tier} skill ${skill}: win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  boss left ${N - wins ? (left / (N - wins) * 100).toFixed(0) : '-'}%  timeouts ${to}  most adds ${adds}  phases ${[...phases].sort().join('')}${skill ? '  moves ' + moves.size : ''}`);
  if (to) bad(`${heroId} vs ${type}: ${to} timeouts`);
  if (skill === 1 && (wr < 0.4)) console.log(`  note: ${heroId} vs ${type} skill 1 wins ${(wr * 100).toFixed(0)}% (target 40-100%)`);
  if (skill === 0 && wr > 0.25) console.log(`  note: ${heroId} vs ${type}: the masher wins ${(wr * 100).toFixed(0)}% (should be rare)`);
}
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
