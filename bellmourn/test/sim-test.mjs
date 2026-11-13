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
  let t = 0; const dt = 1 / 60; let abil = 0;
  while (t < maxT && !hero.dead && w.foes().length) {
    const inp = bot(w, dt);
    if ('skill1Pressed' in inp || 'skill2Pressed' in inp) { bad('the bot pressed a skill button'); return { win: false, t }; }
    w.update(dt, inp); t += dt;
    for (const ev of w.drain()) {
      if (ev.type === 'finisher' || (ev.type === 'hit' && 'finisher' in ev)) { bad('a finisher happened'); return { win: false, t }; }
      if (ev.type === 'ability') abil++;
    }
    for (const e of w.ents) {
      if (e.state === 'finisher' || e.state === 'finished') { bad(`${e.type} in state ${e.state}`); return { win: false, t }; }
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) { bad(`NaN on ${e.type}`); return { win: false, t, timeout: false, nan: true }; }
      const [x0, z0, x1, z1] = w.bounds; if (e.x < x0 - 0.01 || e.x > x1 + 0.01 || e.z < z0 - 0.01 || e.z > z1 + 0.01) { bad(`${e.type} outside bounds`); return { win: false, t }; }
      if (!e.dead && e.state === 'windup' && e.t > 6) { bad(`${e.type} stuck in windup`); return { win: false, t }; }
    }
  }
  return { win: !hero.dead && !w.foes().length, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT, stats: w.stats, abil };
}

function scenario(name, setup, tier, opts = {}) {
  for (const skill of opts.skills || [0, 1]) {
    let wins = 0, time = 0, hp = 0, to = 0, crits = 0, perfects = 0, abil = 0;
    for (let s = 1; s <= N; s++) { const r = run(setup, skill, s * 31 + tier, tier, opts.maxT); if (r.win) { wins++; hp += r.hp; } time += r.t; if (r.timeout) to++; crits += r.stats?.crits || 0; perfects += r.stats?.perfects || 0; abil += r.abil || 0; }
    const wr = wins / N;
    console.log(`${name.padEnd(28)} skill ${skill}: win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  timeouts ${to}  crits ${(crits / N).toFixed(1)} perfects ${(perfects / N).toFixed(1)} abilities ${(abil / N).toFixed(1)}`);
    if (to) bad(`${name}: ${to} timeouts`);
    const target = opts.target && opts.target[skill]; if (target && (wr < target[0] || wr > target[1])) console.log(`  note: ${name} skill ${skill} win rate ${(wr * 100).toFixed(0)}% outside target ${target[0] * 100}-${target[1] * 100}%`);
  }
}

const one = (type) => (w, tier) => [w.spawnFoe(type, 0, -4, { tier, aggro: true, rise: false })];
const group = (list) => (w, tier) => list.map(([t, x, z]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false }));
// as the districts spawn them (belfry.js gives Saint Silence dmgMul 1.3)
const BOSS_OPTS = { silence: { dmgMul: 1.3 } };
const boss = (type) => (w, tier) => [w.spawnBoss(type, 0, -6, { face: 0, ...(BOSS_OPTS[type] || {}) })];

// ------------------------------------------------------------------ rules: no finishers, abilities ride on the attack, the tonic
function rules() {
  const FLAT = { bounds: [-14, -14, 14, 14], solids: [] };
  const IDLE = { mx: 0, mz: 0 };
  const tick = (w, n, inp) => { const ev = []; for (let i = 0; i < n; i++) { w.update(1 / 60, typeof inp === 'function' ? inp(i) : inp); ev.push(...w.drain()); } return ev; };
  const mash = (i) => (i % 12 === 0 ? { mx: 0, mz: 0, attackPressed: true } : IDLE);
  const types = (ev, t) => ev.filter((x) => x.type === t);
  const check = (ok, m) => { if (!ok) bad('rule: ' + m); };
  const at = (w, heroId, foes, o = {}) => {
    const h = w.spawnHero(0, 0, { heroId, face: Math.PI });
    const fs = foes.map(([t, x, z, aggro = true]) => w.spawnFoe(t, x, z, { aggro, rise: false, passive: true }));
    if (o.hp) h.hp = Math.round(h.maxHp * o.hp);
    return [h, fs];
  };
  { // an attack press with a fighting foe in reach casts slot 0 at it, then slot 1, then plain attacks
    const w = new World({ ...FLAT, seed: 3 }); const [h, [f]] = at(w, 'warden', [['hushed', 3, -3]]);
    const e1 = tick(w, 1, { mx: 0, mz: 0, attackPressed: true }); const a1 = types(e1, 'ability')[0];
    check(a1 && a1.slot === 0 && a1.id === 'wave' && a1.e === h, 'first attack press casts slot 0 (wave)');
    check(Math.abs(Math.atan2(f.x - h.x, f.z - h.z) - h.face) < 0.05, 'the cast is aimed at the foe that made it useful');
    const e2 = tick(w, 60, mash); const a2 = types(e2, 'ability');
    check(a2.length === 1 && a2[0].slot === 1 && a2[0].id === 'rush', 'the next press casts slot 1 (rush) while slot 0 recharges');
    check(types(e2, 'swing').length >= 1, 'with both on cooldown the attack is a basic swing');
    check(h.cdMax[0] > 0 && h.cds[0] > 0 && h.cdMax[1] > 0, 'cooldowns and their maxima are set');
  }
  { // nothing to fight: plain swings, no casts; a foe that is not fighting does not count either
    const w = new World({ ...FLAT, seed: 4 }); at(w, 'warden', [['hushed', 2, -2, false]]);
    const ev = tick(w, 90, mash);
    check(!types(ev, 'ability').length && types(ev, 'swing').length >= 3, 'no ability without a fighting foe in reach');
  }
  { // 'attack' mode never casts on its own; 'auto' does, during combat
    const w = new World({ ...FLAT, seed: 5 }); at(w, 'bellbreaker', [['hushed', 0, -3]]);
    check(!types(tick(w, 120, IDLE), 'ability').length, "'attack' mode: no cast without an attack press");
    w.abilityMode = 'auto'; const ev = tick(w, 30, IDLE);
    check(types(ev, 'ability').length === 1 && types(ev, 'ability')[0].slot === 0, "'auto' mode: a ready, useful ability goes off by itself");
  }
  { // Lantern Ward only when hurt or crowded
    const w = new World({ ...FLAT, seed: 6 }); const [h] = at(w, 'lamplighter', [['hushed', 0, -4]]); h.cds[0] = 99;
    check(!types(tick(w, 60, mash), 'ability').length, 'Lantern Ward: not at full health with one foe at arm\'s length');
    h.hp = Math.round(h.maxHp * 0.5); const ev = tick(w, 30, mash); const a = types(ev, 'ability')[0];
    check(a && a.id === 'lantern' && types(ev, 'heal').length === 1, 'Lantern Ward: cast when hurt, and it heals');
  }
  { // Smoke Step only with a foe close; Iron Charge and Cutting Rush never into a hazard
    const w = new World({ ...FLAT, seed: 7 }); const [h, [f]] = at(w, 'huntress', [['hushed', 0, -6]]); h.cds[0] = 99;
    check(!types(tick(w, 40, { mx: 0, mz: 0, attackDown: true, attackPressed: true }), 'ability').length, 'Smoke Step: not with the foe 6 m away');
    f.x = 0; f.z = -1.6; const ev = tick(w, 20, { mx: 0, mz: 0, attackDown: true, attackPressed: true });
    check(types(ev, 'ability')[0]?.id === 'smoke' && h.z > 2, 'Smoke Step: with a foe close, leaps away from it');
    for (const [hero, id] of [['warden', 'rush'], ['bellbreaker', 'charge']]) {
      const w2 = new World({ ...FLAT, seed: 8 }); const [h2] = at(w2, hero, [['hushed', 0, -4]]); h2.cds[0] = 99;
      const hz = w2.addHazard({ shape: 'circle', x: 0, z: -6.5, r: 1.6, warn: 9, life: 1, dmg: 0 });
      check(!types(tick(w2, 40, mash), 'ability').length, `${id}: not into a hazard`);
      hz.t = 99; tick(w2, 1, IDLE); // the hazard is gone
      check(types(tick(w2, 60, mash), 'ability')[0]?.id === id, `${id}: cast once the way is clear`);
    }
  }
  { // the tonic: 'drink' when it starts, 'heal' when the health comes back
    const w = new World({ ...FLAT, seed: 9 }); const [h] = at(w, 'warden', [], { hp: 0.4 });
    const ev = tick(w, 70, (i) => (i === 0 ? { mx: 0, mz: 0, healPressed: true } : IDLE));
    const d = ev.findIndex((x) => x.type === 'drink'), hl = ev.findIndex((x) => x.type === 'heal');
    check(d >= 0 && hl > d && ev[hl].amt > 0 && ev[d].e === h, "tonic: 'drink' first, then 'heal' with the amount");
  }
  { // a broken foe reels and takes more damage; nobody is ever finished
    const w = new World({ ...FLAT, seed: 10 }); const [h, [f]] = at(w, 'bellbreaker', [['hushed', 0, -2]]); h.cds = [99, 99];
    f.poise = 1; const ev = tick(w, 240, mash);
    check(types(ev, 'stagger').length >= 1, 'poise break: the foe staggers');
    check(!ev.some((x) => x.type === 'finisher' || (x.type === 'hit' && 'finisher' in x)), 'no finisher events');
  }
}
rules();

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
