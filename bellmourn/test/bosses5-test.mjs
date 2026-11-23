// Balance and invariants for the run's new bosses (bosses5.js), the reworked Gaoler and Mother Tallow (ai.js),
// the boss pools, the allies (allies.js) and the challenges (challenges.js), as act3-test.mjs does for Act III.
// node bellmourn/test/bosses5-test.mjs [seeds=6] [part=all|rules|bosses|reworked|ascended|allies|challenges]
//   HERO=warden,huntress,...  (default: all seven wardens)
// Targets: the skilled bot (skill 1) wins 40-100 % of boss fights, the masher (skill 0) rarely; no timeouts,
// no NaN, nobody outside the arena, nobody stuck in a windup, a rite or hidden; every phase is reached;
// allies help without carrying (the Wheel with three allies is won more often and faster, but not trivially).
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HEROES, HERO_ORDER, weaponsOfType, MAX_LEVEL } from '../js/game/heroes.js';
import { BOSSES } from '../js/game/defs.js';
import { BOSSES2, BOSS_AI2 } from '../js/game/bosses2.js';
import { BOSS_AI } from '../js/game/ai.js';
import { ASCENDED, bossEntrance, PHASES_OF } from '../js/game/bosses4.js';
import { BOSSES5, BOSS_AI5, BOSS_LINES5, ASCENDED5, ENTRANCES5, bossPool, bossOpts, BOSS_POOLS, watched } from '../js/game/bosses5.js';
import { UNITS } from '../js/game/units.js';
import { ALLY_AI, allyEntrance, ALLY_STYLE } from '../js/game/allies.js';
import { CHALLENGES, trackChallenges, challengeUnlocks } from '../js/game/challenges.js';

const N = +(process.argv[2] || 6);
const PART = process.argv[3] || 'all';
const on = (p) => PART === 'all' || PART === p;
const ARENA = { bounds: [-10, -9, 10, 9], solids: [{ x: -5, z: -3, r: 0.7, h: 3 }, { x0: 4, z0: 2, x1: 5.4, z1: 3.4, h: 3 }] };
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId);
  P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const ws = weaponsOfType(HEROES[heroId].weapon);
  if (ws.length) { P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) }; }
  return heroStats(save, heroId);
}
const HERO_LIST = process.env.HERO ? process.env.HERO.split(',') : HERO_ORDER;
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };
const note = (m) => console.log('  note: ' + m);
const NEW = [['kingcrab', 2], ['hollowmother', 4], ['ronin', 6], ['smiling', 2], ['pyresaint', 5]];
const ALL20 = ['gaoler', 'tallow', 'harbormaster', 'deacon', 'ossuary', 'founder', 'regent', 'silence', 'frostgiant', 'sandwyrm', 'lich', 'archon', 'bogmother', 'clockmaster', 'wheel', ...NEW.map(([t]) => t)];

function invariants(w, label) {
  for (const e of w.ents) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) { bad(`${label}: NaN on ${e.type}`); return false; }
    const [x0, z0, x1, z1] = w.bounds; if (e.x < x0 - 0.01 || e.x > x1 + 0.01 || e.z < z0 - 0.01 || e.z > z1 + 0.01) { bad(`${label}: ${e.type} outside bounds`); return false; }
    if (!e.dead && e.state === 'windup' && e.t > 6) { bad(`${label}: ${e.type} stuck in windup (${e.atk && e.atk.name})`); return false; }
  }
  for (const z of w.hazards) if (!Number.isFinite(z.x) || !Number.isFinite(z.z) || !Number.isFinite(z.dmg) || (z.shape === 'line' && (!Number.isFinite(z.face) || !Number.isFinite(z.len)))) { bad(`${label}: a hazard with NaN (${z.kind})`); return false; }
  for (const p of w.projs) if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) { bad(`${label}: a projectile with NaN (${p.kind})`); return false; }
  for (const s of w.solids) if (s.bm && !s.off && w.hero && !w.hero.dead && Math.hypot(w.hero.x - s.x, w.hero.z - s.z) < s.r - 0.05) { bad(`${label}: the hero inside a ${s.bm}`); return false; }
  return true;
}

// ------------------------------------------------------------------ the rules: registered, distinct, complete
function rules() {
  for (const [type] of NEW) {
    const D = BOSSES2[type], B = BOSS_AI2[type];
    if (!D || !B || D !== BOSSES5[type] || B !== BOSS_AI5[type]) { bad(`${type} is not merged into BOSSES2 / BOSS_AI2`); continue; }
    if (!D.name || !D.title || !D.look || !D.boss || !D.look.rig) bad(`${type}: name, title, a body (look.rig) and the boss flag`);
    if (B.phases.length + 1 < 3) bad(`${type}: ${B.phases.length + 1} phases`);
    const ids = new Set([1, 2, 3].flatMap((p) => B.moves(p, { watched: true }).map((m) => m.id))); if (ids.size < 6) bad(`${type}: ${ids.size} moves`);
    if (!ASCENDED[type] || ASCENDED[type] !== ASCENDED5[type]) bad(`${type}: Ascended form not merged`);
    if (!BOSS_LINES5[type] || !BOSS_LINES5[type].intro || !BOSS_LINES5[type].fall) bad(`${type}: intro and fall lines`);
    for (const k of ['intro', 'fall']) if (BOSS_LINES5[type] && BOSS_LINES5[type][k].length > 80) bad(`${type}: ${k} line too long for two lines of the font`);
  }
  for (const type of ALL20) {
    const E = bossEntrance(type); if (!E || !(E.dur >= 2.5 && E.dur <= 4.5) || typeof E.step !== 'function' || !E.kind) bad(`${type}: an entrance (2.5-4.5 s, a step)`);
    const A = ASCENDED[type]; if (!A || !A.color || !A.moves || A.moves.length < 2) bad(`${type}: Ascended colour and two new moves`);
    const own = (BOSS_AI[type] || BOSS_AI2[type]).phases.length + 1; const ap = PHASES_OF(type, { ascended: true }); if (ap < Math.max(4, own + 1)) bad(`${type}: Ascended has ${ap} phases`);
  }
  const kinds = ALL20.map((t) => bossEntrance(t) && bossEntrance(t).kind); if (new Set(kinds).size !== kinds.length) bad('two bosses share an entrance kind: ' + kinds.join(','));
  // the reworked two: three phases, their own arena mechanics (cages, chains, wax walls, the dark)
  for (const [type, want] of [['gaoler', ['hook', 'cages', 'chains', 'lockdown', 'gibbet']], ['tallow', ['pour', 'snuff', 'glide', 'kindle']]]) {
    const B = BOSS_AI[type]; const ids = new Set([1, 2, 3].flatMap((p) => B.moves(p).map((m) => m.id)));
    if (B.phases.length + 1 < 3) bad(`${type}: three phases`);
    for (const id of want) if (!ids.has(id)) bad(`${type}: no ${id}`);
  }
  // pools: every area offers its pool, two bosses in each middle district, the finales fixed
  for (const a of ['market', 'docks', 'nave', 'undercroft', 'foundry', 'heights']) { const p = bossPool(a); if (p.length < 2) bad(`pool ${a}: ${p.join(',')}`); for (const t of p) if (!BOSSES[t] && !BOSSES2[t]) bad(`pool ${a}: unknown ${t}`); }
  for (const [a, t] of [['belfry', 'silence'], ['abyss', 'archon'], ['empyrean', 'wheel']]) { if (bossPool(a).join() !== t || bossPool(a, { bossPool: ['kingcrab'] }).join() !== t) bad(`pool ${a}: the finale must stay ${t}`); }
  if (bossPool('docks', { bossPool: ['kingcrab', 'harbormaster'] })[0] !== 'kingcrab') bad('pool: a variant\'s favourite comes first');
  for (const t of ['kingcrab', 'hollowmother', 'ronin', 'smiling', 'pyresaint']) if (!Object.values(BOSS_POOLS).some((p) => p.includes(t))) bad(`${t} is in no pool`);
  const o1 = bossOpts('smiling', 'market'), o3 = bossOpts('smiling', 'nave'); if (!(o1.hpMul < 1 && o3.hpMul > 1)) bad('bossOpts: the Guest scales to the market and the nave');
  if (Object.keys(bossOpts('kingcrab', 'docks')).length) bad('bossOpts: a boss at its own tier needs nothing');
  // the Smiling Guest: it moves only when not looked at
  { const w = new World({ bounds: [-14, -14, 14, 14], solids: [], seed: 3 }); const h = w.spawnHero(0, 6, { heroId: 'warden', face: Math.PI }); h.iframes = 9999;
    const g = w.spawnBoss('smiling', 0, -4, { face: 0 }); const IDLE = { mx: 0, mz: 0 };
    for (let i = 0; i < 120; i++) { h.face = Math.PI; w.update(1 / 60, IDLE); w.drain(); }
    const z1 = g.z; if (!watched(w, g)) bad('smiling: seen when the hero faces it');
    for (let i = 0; i < 90; i++) { h.face = Math.PI; w.update(1 / 60, IDLE); w.drain(); } if (Math.abs(g.z - z1) > 0.05) bad(`smiling: it moved while watched (${(g.z - z1).toFixed(2)})`);
    g.ai.cd = 99; let jumps = 0; for (let i = 0; i < 120; i++) { h.face = 0; w.update(1 / 60, IDLE); for (const ev of w.drain()) if (ev.type === 'stutter') jumps++; } if (g.z <= z1 + 0.5 || jumps < 2) bad(`smiling: it comes in stuttering frames when not watched (${(g.z - z1).toFixed(2)}, ${jumps})`); }
  // the King-Crab: the shell takes the blows until it breaks; broken, it reels
  { const w = new World({ bounds: [-14, -14, 14, 14], solids: [], seed: 3 }); const h = w.spawnHero(0, 6, { heroId: 'warden', face: Math.PI }); h.iframes = 9999;
    const c = w.spawnBoss('kingcrab', 0, -4, { face: 0 }); for (let i = 0; i < 10; i++) { w.update(1 / 60, { mx: 0, mz: 0 }); w.drain(); }
    const hp0 = c.hp; if (!(c.shield > 0)) bad('kingcrab: it starts in its shell'); w._damage(h, c, 100, {}); if (c.hp !== hp0) bad('kingcrab: the shell takes the blow');
    w._damage(h, c, c.shield + 5, {}); for (let i = 0; i < 10; i++) { w.update(1 / 60, { mx: 0, mz: 0 }); w.drain(); } if (c.state !== 'stagger' || c.shellOn) bad('kingcrab: broken, the shell is gone and it reels'); }
  // the Ronin: struck on guard, he answers at once
  { const w = new World({ bounds: [-14, -14, 14, 14], solids: [], seed: 3 }); const h = w.spawnHero(0, -1.5, { heroId: 'warden', face: Math.PI }); h.iframes = 9999;
    const r = w.spawnBoss('ronin', 0, -4, { face: 0 }); r.ai.cd = 0; r.ai.chan = { id: 'kamae', t0: null, next: 0 }; let answered = false;
    for (let i = 0; i < 30; i++) { w.update(1 / 60, { mx: 0, mz: 0 }); w.drain(); } w._damage(h, r, 20, {});
    for (let i = 0; i < 20 && !answered; i++) { w.update(1 / 60, { mx: 0, mz: 0 }); for (const ev of w.drain()) if (ev.type === 'counter') answered = true; }
    if (!answered || !(r.atk && r.atk.name === 'counter')) bad('ronin: struck on guard, he counters'); }
  // the Gaoler's cages and Tallow's wax: props that stand, block, end; never on the hero
  for (const [type, kind, tier] of [['gaoler', 'cagewall', 0], ['tallow', 'waxwall', 1]]) {
    const w = new World({ bounds: [-14, -14, 14, 14], solids: [], seed: 5 }); const h = w.spawnHero(0, 6, prog('warden', tier)); h.iframes = 9999;
    const b = w.spawnBoss(type, 0, -4, { face: 0 }); const bot = makeBot(1, 3); let most = 0, ok = true;
    for (let i = 0; i < 60 * 40; i++) { w.update(1 / 60, bot(w, 1 / 60)); w.drain(); most = Math.max(most, w.solids.filter((s) => s.bm === kind && !s.off).length); if (!invariants(w, type + ' props')) { ok = false; break; } }
    if (ok && most < 1) bad(`${type}: no ${kind} ever stood`);
    b.hp = 0; b.dead = true; if (w.solids.some((s) => s.bm && !s.off)) bad(`${type}: props outlive the boss`);
  }
}

// ------------------------------------------------------------------ boss fights
function bossRun(type, heroId, skill, seed, tier, o = {}) {
  const maxT = o.maxT || 420;
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 6, prog(heroId, tier));
  const boss = w.spawnBoss(type, 0, -4, { face: 0, hpMul: o.hpMul || 1, dmgMul: o.dmgMul || 1, ascended: !!o.ascended, trueForm: !!o.trueForm });
  boss.ascended = !!o.ascended; boss.trueForm = !!o.trueForm;
  const allies = []; if (o.allies && w.spawnAlly) for (let i = 0; i < o.allies.length; i++) allies.push(w.spawnAlly(o.allies[i], -2 + i * 2, 7, { face: Math.PI }));
  const bot = makeBot(skill, seed * 7 + 1);
  let t = 0; const dt = 1 / 60; let hidT = 0, chanT = 0; const moves = new Set(); const phases = new Set([1]); let allyDmg = 0, total = 0;
  while (t < maxT && !hero.dead && !boss.dead) {
    w.update(dt, bot(w, dt)); t += dt;
    for (const ev of w.drain()) { if (ev.type === 'tele' && ev.e === boss) moves.add(ev.atk.name); if (ev.type === 'phase' && ev.e === boss) phases.add(ev.phase); if (ev.type === 'hit' && ev.dst === boss) { total += ev.dmg; if (ev.src && ev.src.ally) allyDmg += ev.dmg; } if (ev.type === 'ally' && ev.what === 'hit' && ev.dst === boss) { total += ev.dmg; allyDmg += ev.dmg; } }
    if (boss.ai.chan && boss.state === 'idle') { chanT += dt; moves.add('rite:' + boss.ai.chan.id); } else chanT = 0;
    if (boss.hidden && !boss.dead) { hidT += dt; moves.add('hidden'); } else hidT = 0;
    if (chanT > 9) { bad(`${type} stuck in a rite (${boss.ai.chan && boss.ai.chan.id})`); return { win: false, t }; }
    if (hidT > 8) { bad(`${type} stuck hidden`); return { win: false, t }; }
    if (!invariants(w, type)) return { win: false, t };
  }
  return { win: !hero.dead && boss.dead, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT, moves, phases, bossLeft: boss.dead ? 0 : boss.hp / boss.maxHp, allyShare: total ? allyDmg / total : 0 };
}
function bossSeries(label, type, tier, o, heroes = HERO_LIST, skills = [0, 1], target = [0.4, 1]) {
  const want = o.ascended ? PHASES_OF(type, o) : (BOSS_AI[type] || BOSS_AI2[type]).phases.length + 1; const res = {};
  for (const heroId of heroes) for (const skill of skills) {
    let wins = 0, time = 0, hp = 0, to = 0, left = 0, share = 0; const moves = new Set(), phases = new Set();
    for (let s = 1; s <= N; s++) {
      const r = bossRun(type, heroId, skill, s * 37 + tier, tier, o); if (!r.moves) continue;
      if (r.win) { wins++; hp += r.hp; } else left += r.bossLeft; time += r.t; if (r.timeout) to++; share += r.allyShare;
      for (const m of r.moves) moves.add(m); for (const p of r.phases) phases.add(p);
    }
    const wr = wins / N; res[heroId + skill] = { wr, time: time / N };
    console.log(`${heroId.padEnd(11)} ${label.padEnd(24)} t${tier} skill ${skill}: win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  boss left ${N - wins ? (left / (N - wins) * 100).toFixed(0) : '-'}%  timeouts ${to}  phases ${[...phases].sort().join('')}${skill ? '  moves ' + moves.size : ''}${o.allies ? '  ally share ' + (share / N * 100).toFixed(0) + '%' : ''}`);
    if (to) bad(`${heroId} vs ${label}: ${to} timeouts`);
    if (skill === 1 && wins && phases.size < want) bad(`${heroId} vs ${label}: reached ${phases.size} of ${want} phases`);
    if (skill === 1 && (wr < target[0] || wr > target[1])) note(`${heroId} vs ${label} skill 1 wins ${(wr * 100).toFixed(0)}% (target ${target[0] * 100}-${target[1] * 100}%)`);
    if (skill === 0 && wr > 0.25) note(`${heroId} vs ${label}: the masher wins ${(wr * 100).toFixed(0)}% (should be rare)`);
  }
  return res;
}
// every entrance of the five: harmless and untouchable while it plays, ends on its spot, fights after
function entrances() {
  for (const [type, tier] of NEW) {
    const E = bossEntrance(type); if (!E || E !== bossEntrance(type) && !ENTRANCES5[type]) continue;
    const w = new World({ ...ARENA, seed: 3 }); const hero = w.spawnHero(0, 6, prog('warden', tier)); const boss = w.spawnBoss(type, 0, -4, { face: 0 });
    const hp0 = hero.hp; let t = 0; const dt = 1 / 60; let ok = true, hit = 0;
    while (t <= E.dur + 0.05) {
      E.step(w, boss, t, null); w.update(dt, { mx: 0, mz: 0, attackPressed: true }); w.drain(); t += dt;
      if (boss.entering && !(boss.iframes > 0)) ok = false;
      if (boss.entering && w._damage(hero, boss, 1, {}) === true) hit++;
      if (!invariants(w, type + ' entrance')) { ok = false; break; }
    }
    E.step(w, boss, E.dur + 0.1, null);
    if (!ok || hit) bad(`${type}: the boss could be struck during its entrance (${hit})`);
    if (hero.hp < hp0) bad(`${type}: the entrance hurt the hero`);
    if (boss.entering || boss.hidden || Math.hypot(boss.x, boss.z + 4) > 0.6 || Math.abs(boss.leapH || 0) > 0.01) bad(`${type}: the entrance does not end on the spot (${boss.x.toFixed(2)}, ${boss.z.toFixed(2)}, ${boss.leapH})`);
    let acted = false; for (let i = 0; i < 60 * 8 && !acted; i++) { w.update(dt, { mx: 0, mz: 0 }); w.drain(); if (boss.state === 'windup' || boss.ai.chan || boss.hidden) acted = true; }
    if (!acted) bad(`${type}: does not fight after its entrance`);
  }
}

// ------------------------------------------------------------------ the allies
function allies() {
  for (const id of HERO_ORDER) {
    if (typeof ALLY_AI[id] !== 'function' || !ALLY_STYLE[id]) bad(`ally ${id}: no mind`);
    const E = allyEntrance(id); if (!E || !(E.dur >= 1.5 && E.dur <= 3.5) || !E.kind) { bad(`ally ${id}: an entrance (1.5-3.5 s)`); continue; }
    const w = new World({ ...ARENA, seed: 9 }); w.spawnHero(0, 6, prog('warden', 14)); const boss = w.spawnBoss('wheel', 0, -4, { face: 0 });
    if (!w.spawnAlly) { note('world.spawnAlly is not there yet: the ally fights are skipped'); return; }
    const a = w.spawnAlly(id, 2, 6, { face: Math.PI }); let t = 0; const dt = 1 / 60; let idle = true;
    while (t < E.dur) { E.step(w, a, t, null); w.update(dt, { mx: 0, mz: 0 }); w.drain(); if (a.entering && (Math.abs(a.vx) > 0.5 || a.state === 'attack' || a.state === 'shoot')) idle = false; t += dt; if (!invariants(w, 'ally entrance ' + id)) break; }
    E.step(w, a, E.dur + 0.1, null);
    if (!idle) bad(`ally ${id}: it acts during its entrance`);
    if (a.entering || a.hidden || Math.hypot(a.x - 2, a.z - 6) > 0.6 || Math.abs(a.leapH || 0) > 0.01) bad(`ally ${id}: the entrance does not end on its spot`);
    void boss;
  }
  // the Wheel with three allies against none: easier and quicker, never trivial; the allies never carry
  const team = ['warden', 'huntress', 'wren'];
  const solo = bossSeries('wheel (alone)', 'wheel', 14, {}, ['warden', 'huntress'], [1]);
  const withA = bossSeries('wheel (3 allies)', 'wheel', 14, { allies: team }, ['warden', 'huntress'], [1], [0.4, 1]);
  for (const h of ['warden', 'huntress']) {
    const a = solo[h + 1], b = withA[h + 1]; if (!a || !b) continue;
    if (b.wr + 0.001 < a.wr - 0.2) bad(`allies make the Wheel harder for ${h} (${(a.wr * 100).toFixed(0)}% -> ${(b.wr * 100).toFixed(0)}%)`);
    if (b.time < a.time * 0.45) note(`allies cut the Wheel to ${(b.time / a.time * 100).toFixed(0)}% of the time for ${h}: too strong?`);
  }
  // the share of the damage the allies deal (bossRun reports it); a carry would deal most of it
  let share = 0; for (let s = 1; s <= N; s++) share += bossRun('wheel', 'warden', 1, s * 37 + 14, 14, { allies: team }).allyShare;
  share /= N; console.log(`allies' share of the damage on the Wheel: ${(share * 100).toFixed(0)}%`);
  if (share > 0.55) bad(`allies deal ${(share * 100).toFixed(0)}% of the damage: they carry`);
}

// ------------------------------------------------------------------ the challenges
function challenges() {
  if (CHALLENGES.length < 40) bad(`${CHALLENGES.length} challenges (at least 40)`);
  const ids = new Set(CHALLENGES.map((c) => c.id)); if (ids.size !== CHALLENGES.length) bad('two challenges share an id');
  for (const c of CHALLENGES) { if (!c.title || !c.desc || !c.reward || !c.goal || typeof c.progress !== 'function') bad(`challenge ${c.id}: title, desc, reward, goal, progress`); const p = c.progress({}); if (p.n !== 0 || p.of !== c.goal) bad(`challenge ${c.id}: progress of an empty save`); }
  const meta = {}; const run = { hero: 'kestrel', act: 1, stats: { healed: 0, tonics: 0, kills: 0 }, boons: [], echoes: [], flags: {} };
  trackChallenges(meta, run, { type: 'bossStart', boss: 'gaoler' }); trackChallenges(meta, run, { type: 'drink' }); trackChallenges(meta, run, { type: 'bossDown', boss: 'gaoler' });
  if (meta.done.includes('kestrel_gaoler')) bad('challenges: a tonic in the Gaoler\'s fight does not count');
  trackChallenges(meta, run, { type: 'bossStart', boss: 'gaoler' }); trackChallenges(meta, run, { type: 'bossDown', boss: 'gaoler' });
  if (!meta.done.includes('kestrel_gaoler')) bad('challenges: the Gaoler without a tonic');
  for (let i = 0; i < 99; i++) trackChallenges(meta, run, { type: 'kill', e: { type: 'hushed', team: 'foe' } });
  if (challengeUnlocks(meta).heroes.includes('kestrel')) bad('challenges: Kestrel opens only with both');
  trackChallenges(meta, run, { type: 'kill', e: { type: 'hushed', team: 'foe' } });
  if (!challengeUnlocks(meta).heroes.includes('kestrel')) bad('challenges: Kestrel opens with both done');
  trackChallenges(meta, run, { type: 'bossDown', boss: 'kingcrab' }); if (!meta.done.includes('boss_crab_kestrel') || !meta.done.includes('hollis_crab')) bad('challenges: a boss with a warden');
  const r2 = { hero: 'huntress', act: 2, stats: { healed: 0, tonics: 0 }, boons: [], echoes: [], flags: {} }; trackChallenges(meta, r2, { type: 'actEnter', act: 2 });
  if (!meta.done.includes('hollis_vesper') || !meta.done.includes('wren_noheal')) bad('challenges: Act II with Vesper, without healing');
  const r3 = { hero: 'warden', act: 1, stats: {}, boons: [{ id: 'ember_edge' }, { id: 'ember_wake' }, { id: 'ember_rite' }], echoes: [], flags: {} }; trackChallenges(meta, r3, { type: 'boon', id: 'ember_rite', res: 'ember' });
  if (!meta.done.includes('wren_three')) note('challenges: three of one Resonance (needs boons.js for the Resonances)');
  for (let i = 0; i < 10; i++) trackChallenges(meta, r3, { type: 'shrine' }); if (!meta.done.includes('ash_shrines')) bad('challenges: ten shrines');
  const r4 = { hero: 'warden', act: 1, stats: {}, boons: [], echoes: [], flags: {} }; trackChallenges(meta, r4, { type: 'areaEnter', area: 'gate' }); trackChallenges(meta, r4, { type: 'hit', hero: true }); trackChallenges(meta, r4, { type: 'areaClear', area: 'gate' });
  if (meta.done.includes('area_flawless')) bad('challenges: a hit spoils a flawless area');
  trackChallenges(meta, r4, { type: 'areaEnter', area: 'market' }); trackChallenges(meta, r4, { type: 'areaClear', area: 'market' }); if (!meta.done.includes('area_flawless')) bad('challenges: a flawless area');
  console.log(`challenges: ${CHALLENGES.length}, done in the scripted save: ${meta.done.length}, unlocks: ${JSON.stringify(challengeUnlocks(meta).heroes)}`);
}

console.log(`seeds: ${N}  heroes: ${HERO_LIST.join(', ')}  part: ${PART}`);
if (on('rules')) { rules(); entrances(); }
if (on('challenges')) challenges();
if (on('bosses')) {
  for (const [type, tier] of NEW) bossSeries(type, type, tier, {});
  // the Guest is offered at the market (tier 1) and the nave (tier 3) too
  for (const [lvl, tier] of [['market', 1], ['nave', 3]]) bossSeries(`smiling (${lvl})`, 'smiling', tier, bossOpts('smiling', lvl), process.env.HERO ? HERO_LIST : ['warden', 'huntress', 'bellbreaker']);
}
if (on('reworked')) { bossSeries('gaoler (reworked)', 'gaoler', 0, {}); bossSeries('tallow (reworked)', 'tallow', 1, {}); }
if (on('ascended')) for (const [type] of NEW) bossSeries(type + ' ASC', type, 14, { ascended: true, hpMul: 1.5 }, process.env.HERO ? HERO_LIST : ['warden', 'huntress'], [1]);
if (on('allies')) allies();
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
