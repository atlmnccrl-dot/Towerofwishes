// Balance and invariants for the fight simulation (Node, no browser).
// node bellmourn/test/sim-test.mjs [seeds=12]
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HERO_ORDER, WEAPONS, weaponsOfType, MAX_LEVEL } from '../js/game/heroes.js';
import { UNITS } from '../js/game/units.js';

const N = +(process.argv[2] || 12);
const ARENA = { bounds: [-14, -14, 14, 14], solids: [{ x: -6, z: -6, r: 0.8, h: 3 }, { x0: 5, z0: 4, x1: 7, z1: 6, h: 3 }] };
// what each hero has on reaching district `tier` (0-11; the level stops at the cap): levels, a better weapon, upgrades, relics
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId);
  P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const H = HERO_ORDER; const ws = weaponsOfType(Object.values(WEAPONS).find(() => true) && { warden: 'blade', huntress: 'bow', bellbreaker: 'hammer', lamplighter: 'focus' }[heroId]);
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
const ONLY = process.env.ONLY || ''; // ONLY=creatures: just the new units (quicker)
if (!ONLY) rules();

console.log(`seeds: ${N}  hero: ${HERO_ID}`);
if (!ONLY) {
  for (const t of ['hushed', 'ghoul', 'acolyte', 'crossbow', 'warden', 'brute']) scenario(`1v1 ${t} (tier 0)`, one(t), 0, { skills: [0, 1] });
  scenario('courtyard wave 1 (3 hushed)', group([['hushed', 1.4, -2.6], ['hushed', 3.6, -0.6], ['hushed', 4.9, -4.6]]), 0, { target: { 0: [0.4, 0.95], 1: [0.85, 1] } });
  scenario('mixed pack tier 1', group([['hushed', -3, -4], ['ghoul', 3, -3], ['acolyte', 0, -10], ['crossbow', 8, -8]]), 1);
  scenario('heavy pack tier 2', group([['warden', -3, -4], ['brute', 3, -5], ['acolyte', 0, -10], ['hushed', 6, -2]]), 2);
  scenario('elite pack tier 3', group([['warden', -3, -4], ['warden', 3, -4], ['brute', 0, -7], ['crossbow', 9, -9], ['acolyte', -9, -9]]), 3);
  for (const [type, tier] of [['gaoler', 0], ['tallow', 1], ['harbormaster', 2], ['deacon', 3], ['ossuary', 4], ['founder', 5], ['regent', 6], ['silence', 7]]) scenario('BOSS ' + type, boss(type), tier, { maxT: 360, target: { 0: [0, 0.5], 1: [0.4, 1] } });
  for (const t of ['hound', 'bomber', 'gargoyle', 'shade', 'chanter', 'sentinel', 'rat', 'spitter', 'knight']) scenario(`1v1 ${t} (tier 3)`, one(t), 3, { skills: [1] });
  scenario('elite pack tier 5', (w, tier) => [['knight', -3, -4, 'shielded'], ['shade', 3, -4, 'hasted'], ['bomber', 0, -9, 'burning'], ['hound', 5, -2, 'vampiric']].map(([t, x, z, el]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false, elite: el })), 5);
}

// ------------------------------------------------------------------ the new units' own rules (hooks in units2.js)
function creatureRules() {
  const FLAT = { bounds: [-14, -14, 14, 14], solids: [] };
  const IDLE = { mx: 0, mz: 0 };
  const tick = (w, n, inp = IDLE) => { const ev = []; for (let i = 0; i < n; i++) { w.update(1 / 60, typeof inp === 'function' ? inp(i) : inp); ev.push(...w.drain()); } return ev; };
  const check = (ok, m) => { if (!ok) bad('creature rule: ' + m); };
  const setup = (type, x = 0, z = -3, o = {}) => { const w = new World({ ...FLAT, seed: 11 }); const h = w.spawnHero(0, 0, { heroId: 'warden', face: Math.PI }); const f = w.spawnFoe(type, x, z, { aggro: true, rise: false, tier: 0, ...o }); tick(w, 2); return [w, h, f]; };
  const kills = (ev) => ev.filter((x) => x.type === 'kill');
  { // the mummy rises once; the second fall is for good; a burning mummy stays down
    const [w, h, f] = setup('mummy', 0, -6); h.iframes = 99;
    w._damage(h, f, 9999, {}); check(!f.dead && f.ai.rose, 'mummy: the first fall is not death');
    const ev = tick(w, 200); check(!f.dead && f.hp > 0 && f.state !== 'stagger', 'mummy: it gets up again');
    w._damage(h, f, 9999, {}); check(f.dead, 'mummy: the second fall is death');
    const [w2, h2, f2] = setup('mummy', 0, -6); w2.applyStatus(f2, 'burn', { dps: 1 }); w2._damage(h2, f2, 9999, {}); check(f2.dead, 'mummy: burning, it stays down');
    const [w3, h3, f3] = setup('mummy', 0, -6); w3._damage(h3, f3, 9999, { kind: 'pillar' }); check(f3.dead, 'mummy: a fire blow keeps it down');
    check(!kills(ev).length, 'mummy: no kill event while it is only down');
  }
  { // the slime splits into two slimelings, which do not split again
    const [w, h, f] = setup('slime', 0, -6); w._damage(h, f, 9999, {});
    const kids = w.foes().filter((x) => x.type === 'slimelet'); check(f.dead && kids.length === 2, 'slime: splits in two');
    for (const k of kids) { k.state = 'idle'; k.iframes = 0; w._damage(h, k, 9999, {}); }
    check(!w.foes().length, 'slimelings: dead for good, no further split');
  }
  { // a root holds the hero still; a dash tears free
    const [w, h, f] = setup('mummy', 0, -13, { aggro: false }); w.applyStatus(h, 'root', {});
    const z0 = h.z; tick(w, 20, { mx: 0, mz: 1 }); check(Math.abs(h.z - z0) < 0.05, 'root: the hero cannot walk');
    check(h.status.root && h.status.root.t <= 1.3, 'root: capped at 1.3 s');
    tick(w, 3, { mx: 0, mz: 1, dashPressed: true }); check(!h.status.root && h.z > z0 + 0.3, 'root: a dash tears free');
  }
  { // the seraph's gaze sweeps its beam from one side to the other
    const [w, h, f] = setup('seraph', 0, -6); f.ai.cd = 0; f.ai.pulseAt = 99; f.face = Math.atan2(h.x - f.x, h.z - f.z);
    let hz = null; for (let i = 0; i < 120 && !hz; i++) { tick(w, 1); hz = w.hazards.find((z) => z.sweep); }
    check(hz, 'seraph: a sweeping beam is laid'); if (hz) { const a = hz.face; tick(w, 110); check(Math.abs(hz.face - a) > 0.8, 'seraph: the beam turns'); }
  }
  { // the scorpion and the worm vanish under the sand and come up again
    for (const type of ['scorpion', 'sandworm']) {
      const [w, h, f] = setup(type, 0, -6); h.iframes = 999; let hid = false, back = false;
      for (let i = 0; i < 900; i++) { tick(w, 1); if (f.hidden) hid = true; else if (hid) { back = true; break; } }
      check(hid && back, `${type}: burrows and surfaces`);
    }
  }
  { // the bonecaster raises skeletons, two at most; the cultist's ritual is broken by blows
    const [w, h, f] = setup('bonecaster', 0, -8); h.iframes = 9999; tick(w, 60 * 25);
    const sk = w.foes().filter((x) => x.type === 'skeleton').length; check(sk >= 1 && sk <= 2, `bonecaster: raises 1-2 skeletons (${sk})`);
    const [w2, h2, c] = setup('cultist', 0, -8); h2.iframes = 9999; let sig = null;
    for (let i = 0; i < 400 && !sig; i++) { tick(w2, 1); sig = w2.hazards.find((z) => z.kind === 'sigil'); }
    check(sig, 'cultist: the ritual lays a sigil');
    for (let i = 0; i < 3; i++) { w2._damage(h2, c, 1, { poise: 1 }); c.flinch = 3; }
    tick(w2, 60); check(!w2.hazards.includes(sig) && !w2.foes().some((x) => x.type === 'imp'), 'cultist: struck, the ritual breaks off');
  }
}
creatureRules();

// ------------------------------------------------------------------ the new units (units2.js): each alone at its home tier, then packs
// A skilled bot should beat each one alone with no timeouts; packs of 3-5 should be dangerous but winnable.
const at = (list) => (w, tier) => list.map(([t, x, z, el]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false, elite: el }));
const NEW = ['bat', 'crab', 'frostwolf', 'icewraith', 'yeti', 'scorpion', 'sandworm', 'mummy', 'bonecaster', 'slime', 'cryptspider', 'imp', 'hellhound', 'cultist', 'demon', 'seraph'];
for (const t of NEW) {
  const tier = UNITS[t].home;
  // the swarmers come in numbers (one alone is nothing)
  const setup = t === 'bat' ? at([['bat', -2, -4], ['bat', 2, -4], ['bat', 0, -6]]) : one(t);
  scenario(`1v1 ${t}${t === 'bat' ? ' x3' : ''} (tier ${tier})`, setup, tier, { skills: [1], target: { 1: [0.8, 1] } });
}
const PACKS = [
  ['pack: 5 bats + 2 hushed', 1, [['bat', -3, -4], ['bat', 3, -4], ['bat', 0, -7], ['bat', -5, -7], ['bat', 5, -7], ['hushed', -1, -3], ['hushed', 1, -3]]],
  ['pack: 3 crabs + spitter', 2, [['crab', -3, -4], ['crab', 3, -4], ['crab', 0, -6], ['spitter', 0, -10]]],
  ['pack: 3 frost wolves + wraith', 8, [['frostwolf', -3, -4], ['frostwolf', 3, -4], ['frostwolf', 0, -7], ['icewraith', 0, -10]]],
  ['pack: yeti + 2 frost wolves', 8, [['yeti', 0, -6], ['frostwolf', -4, -4], ['frostwolf', 4, -4]]],
  ['pack: 2 scorpions + mummy + worm', 9, [['scorpion', -3, -4], ['scorpion', 3, -4], ['mummy', 0, -6], ['sandworm', 0, -10]]],
  ['pack: bonecaster + slime + 2 spiders', 10, [['bonecaster', 0, -10], ['slime', -3, -5], ['cryptspider', 3, -4], ['cryptspider', -5, -7]]],
  ['pack: cultist + hellhound + 2 imps', 11, [['cultist', 0, -10], ['hellhound', -3, -4], ['imp', 4, -8], ['imp', -4, -8]]],
  ['pack: demon + seraph + imp', 11, [['demon', 0, -6], ['seraph', 4, -9], ['imp', -4, -8]]],
];
for (const [name, tier, list] of PACKS) scenario(`${name} (tier ${tier})`, at(list), tier, { skills: [1], target: { 1: [0.5, 1] } });
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
