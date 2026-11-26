// Balance and invariants for Act III (units3.js, bosses4.js) and every boss's Ascended form, as
// boss3-test.mjs does for Act II.
// node bellmourn/test/act3-test.mjs [seeds=6] [part=all|rules|units|bosses|ascended|entrances]
//   HERO=warden,huntress,...  (default: the four first wardens)
// Targets: the skilled bot (skill 1) wins 40-100 % of boss fights (80-100 % of single units, 50-100 % of
// packs), the masher (skill 0) rarely; no timeouts, no NaN, nobody outside the arena, nobody stuck in a
// windup, a rite or hidden; every phase is reached.
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HEROES, weaponsOfType, MAX_LEVEL } from '../js/game/heroes.js';
import { BOSSES } from '../js/game/defs.js';
import { BOSSES2, BOSS_AI2 } from '../js/game/bosses2.js';
import { BOSS_AI } from '../js/game/ai.js';
import { ASCENDED, bossEntrance, PHASES_OF } from '../js/game/bosses4.js';
import { UNITS } from '../js/game/units.js';
import { HOME, BESTIARY_TEXT } from '../js/game/units2.js';

const N = +(process.argv[2] || 6);
const PART = process.argv[3] || 'all';
const on = (p) => PART === 'all' || PART === p;
const ARENA = { bounds: [-10, -9, 10, 9], solids: [{ x: -5, z: -3, r: 0.7, h: 3 }, { x0: 4, z0: 2, x1: 5.4, z1: 3.4, h: 3 }] };
const OPEN = { bounds: [-14, -14, 14, 14], solids: [{ x: -6, z: -6, r: 0.8, h: 3 }, { x0: 5, z0: 4, x1: 7, z1: 6, h: 3 }] };
// what a hero has on reaching tier `tier` (the same curve as the other tests; levels stop at the cap)
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId);
  P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const ws = weaponsOfType(HEROES[heroId].weapon);
  if (ws.length) { P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) }; }
  return heroStats(save, heroId);
}
const HERO_LIST = process.env.HERO ? process.env.HERO.split(',') : ['warden', 'huntress', 'bellbreaker', 'lamplighter'];
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };
const note = (m) => console.log('  note: ' + m);

function invariants(w, label) {
  for (const e of w.ents) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) { bad(`${label}: NaN on ${e.type}`); return false; }
    const [x0, z0, x1, z1] = w.bounds; if (e.x < x0 - 0.01 || e.x > x1 + 0.01 || e.z < z0 - 0.01 || e.z > z1 + 0.01) { bad(`${label}: ${e.type} outside bounds`); return false; }
    if (!e.dead && e.state === 'windup' && e.t > 6) { bad(`${label}: ${e.type} stuck in windup (${e.atk && e.atk.name})`); return false; }
  }
  for (const z of w.hazards) if (!Number.isFinite(z.x) || !Number.isFinite(z.z) || !Number.isFinite(z.dmg) || (z.shape === 'line' && !Number.isFinite(z.face))) { bad(`${label}: a hazard with NaN (${z.kind})`); return false; }
  for (const p of w.projs) if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) { bad(`${label}: a projectile with NaN (${p.kind})`); return false; }
  return true;
}

// ------------------------------------------------------------------ the units' own rules
function rules() {
  const FLAT = { bounds: [-14, -14, 14, 14], solids: [] };
  const IDLE = { mx: 0, mz: 0 };
  const tick = (w, n, inp = IDLE) => { const ev = []; for (let i = 0; i < n; i++) { w.update(1 / 60, typeof inp === 'function' ? inp(i) : inp); ev.push(...w.drain()); } return ev; };
  const check = (ok, m) => { if (!ok) bad('rule: ' + m); };
  const setup = (type, x = 0, z = -3, o = {}) => { const w = new World({ ...FLAT, seed: 11 }); const h = w.spawnHero(0, 0, { heroId: 'warden', face: Math.PI }); const f = w.spawnFoe(type, x, z, { aggro: true, rise: false, tier: 12, ...o }); tick(w, 2); return [w, h, f]; };
  for (const k of ['leech', 'bogtroll', 'wisp', 'marshwitch', 'automaton', 'gearspider', 'chronoknight', 'hollowangel', 'choirmask', 'gildedknight']) {
    if (!UNITS[k]) { bad(`${k} is not registered`); continue; }
    if (HOME[k] !== { leech: 12, bogtroll: 12, wisp: 12, marshwitch: 12, automaton: 13, gearspider: 13, chronoknight: 13, hollowangel: 14, choirmask: 14, gildedknight: 14 }[k]) bad(`${k}: home tier ${HOME[k]}`);
    if (!BESTIARY_TEXT[k]) bad(`${k}: no bestiary line`);
  }
  { // a leech clings and drains; a dash shakes it off
    const [w, h, f] = setup('leech', 0, -2.5); h.hp = h.maxHp = 500; let lat = false;
    for (let i = 0; i < 600 && !lat; i++) { tick(w, 1); lat = !!f.ai.latched; }
    check(lat, 'leech: it latches on'); const hp0 = h.hp; tick(w, 70); check(h.hp < hp0 && f.ai.latched, 'leech: it drains while it clings');
    tick(w, 8, { mx: 1, mz: 0, dashPressed: true }); check(!f.ai.latched, 'leech: a dash shakes it off');
  }
  { // the troll regrows when left alone, and rises once unless burned
    const [w, h, f] = setup('bogtroll', 0, -8, { aggro: false }); h.iframes = 9999; f.hp = f.maxHp * 0.5; tick(w, 360); check(f.hp > f.maxHp * 0.6, `troll: it regrows (${(f.hp / f.maxHp).toFixed(2)})`);
    const [w2, h2, f2] = setup('bogtroll', 0, -8); w2._damage(h2, f2, 99999, {}); check(!f2.dead && f2.ai.rose, 'troll: the first fall is not death');
    tick(w2, 200); w2._damage(h2, f2, 99999, {}); check(f2.dead, 'troll: the second fall is');
    const [w3, h3, f3] = setup('bogtroll', 0, -8); w3.applyStatus(f3, 'burn', { dps: 1 }); w3._damage(h3, f3, 99999, {}); check(f3.dead, 'troll: burning, it stays down');
  }
  { // the wisp lures (the hero is drawn in), then bursts and is gone
    const [w, h, f] = setup('wisp', 0, -7); h.iframes = 9999; f.ai.lureAt = 0; f.ai.cd = 0; let drawn = false, gone = false; const z0 = h.z;
    for (let i = 0; i < 900 && !gone; i++) { tick(w, 1); if (h.z < z0 - 0.5) drawn = true; if (f.dead) gone = true; }
    check(drawn, 'wisp: the lure draws the hero in'); check(gone, 'wisp: it bursts and is gone');
  }
  { // the witch curses pools and raises the drowned from them
    const [w, h, f] = setup('marshwitch', 0, -8); h.iframes = 99999; tick(w, 60 * 20);
    check(w.foes().some((x) => x.type === 'drowned'), 'witch: the drowned rise');
  }
  { // the automaton vents after three blows and stands open
    const [w, h, f] = setup('automaton', 0, -2.5); h.iframes = 99999; let vent = false, open = false;
    for (let i = 0; i < 60 * 30 && !open; i++) { tick(w, 1); if (f.atk && f.atk.name === 'vent') vent = true; if (vent && f.state === 'stagger') open = true; }
    check(vent && open, 'automaton: it vents, then stands open');
  }
  { // the chrono knight's bubble slows the hero
    const [w, h, f] = setup('chronoknight', 0, -6); h.iframes = 99999; let bub = null;
    for (let i = 0; i < 60 * 12 && !bub; i++) { tick(w, 1); bub = w.hazards.find((z) => z.kind === 'bubble' && z.t > 0.2); }
    check(bub, 'chrono knight: a bubble of slow time'); if (bub) { h.x = bub.x; h.z = bub.z; const x0 = h.x; tick(w, 30, { mx: 1, mz: 0 }); check(h.inBubble && h.x - x0 < 6.2 * 0.5 * 0.62, 'chrono knight: the hero walks slowly inside it'); }
  }
  { // the gear spider's saw comes back
    const [w, h, f] = setup('gearspider', 0, -6); h.iframes = 99999; f.ai.rollAt = 99; let back = false;
    for (let i = 0; i < 60 * 15 && !back; i++) { tick(w, 1); back = w.projs.some((p) => p.kind === 'saw' && !p.pierce); }
    check(back, 'gear spider: its saw flies back');
  }
  { // the gilded knight wards itself
    const [w, h, f] = setup('gildedknight', 0, -6); h.iframes = 99999; tick(w, 120); check(f.shield > 0, 'gilded knight: the halo wards it');
  }
  { // choir masks join each other's chords
    const w = new World({ ...FLAT, seed: 5 }); const h = w.spawnHero(0, 0, { heroId: 'warden' }); h.iframes = 99999;
    const a = w.spawnFoe('choirmask', -3, -7, { tier: 14, aggro: true, rise: false }), b = w.spawnFoe('choirmask', 3, -7, { tier: 14, aggro: true, rise: false });
    a.ai.holdAt = b.ai.holdAt = 99; let both = false;
    for (let i = 0; i < 60 * 15 && !both; i++) { tick(w, 1); both = a.atk && b.atk && a.atk.name === 'chord' && b.atk.name === 'chord' && Math.abs(a.t - b.t) < 0.2; }
    check(both, 'choir masks: they sing a chord together');
  }
}

// ------------------------------------------------------------------ the units at home: alone and in packs
function fight(setup, heroId, skill, seed, tier, maxT, arena = OPEN) {
  const w = new World({ ...arena, seed }); const hero = w.spawnHero(0, 8, prog(heroId, tier));
  setup(w, tier); const bot = makeBot(skill, seed * 7 + 1); let t = 0; const dt = 1 / 60;
  while (t < maxT && !hero.dead && w.foes().length) { w.update(dt, bot(w, dt)); w.drain(); t += dt; if (!invariants(w, 'fight')) return { win: false, t }; }
  return { win: !hero.dead && !w.foes().length, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT };
}
const at = (list) => (w, tier) => list.map(([t, x, z]) => w.spawnFoe(t, x, z, { tier, aggro: true, rise: false }));
function scenario(name, setup, tier, target, heroes = HERO_LIST) {
  for (const heroId of heroes) {
    let wins = 0, time = 0, hp = 0, to = 0;
    for (let s = 1; s <= N; s++) { const r = fight(setup, heroId, 1, s * 31 + tier, tier, 240); if (r.win) { wins++; hp += r.hp; } time += r.t; if (r.timeout) to++; }
    const wr = wins / N;
    console.log(`${heroId.padEnd(11)} ${name.padEnd(40)} win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  timeouts ${to}`);
    if (to) bad(`${heroId} ${name}: ${to} timeouts`);
    if (wr < target[0] || wr > target[1]) note(`${heroId} ${name}: win ${(wr * 100).toFixed(0)}% outside ${target[0] * 100}-${target[1] * 100}%`);
  }
}
function units() {
  const ALONE = ['leech', 'bogtroll', 'wisp', 'marshwitch', 'automaton', 'gearspider', 'chronoknight', 'hollowangel', 'choirmask', 'gildedknight'];
  for (const t of ALONE) {
    const tier = UNITS[t].home; const setup = t === 'leech' ? at([['leech', -2, -4], ['leech', 2, -4], ['leech', 0, -6]]) : at([[t, 0, -4]]);
    scenario(`1v1 ${t}${t === 'leech' ? ' x3' : ''} (t${tier})`, setup, tier, [0.8, 1]);
  }
  const PACKS = [
    ['5 leeches + witch', 12, [['leech', -3, -4], ['leech', 3, -4], ['leech', 0, -6], ['leech', -4, -7], ['leech', 4, -7], ['marshwitch', 0, -10]]],
    ['troll + 2 wisps', 12, [['bogtroll', 0, -6], ['wisp', -5, -8], ['wisp', 5, -8]]],
    ['automaton + 2 gear spiders', 13, [['automaton', 0, -6], ['gearspider', -4, -5], ['gearspider', 4, -5]]],
    ['2 chrono knights + gear spider', 13, [['chronoknight', -2, -5], ['chronoknight', 2, -5], ['gearspider', 0, -9]]],
    ['gilded knight + 2 choir masks', 14, [['gildedknight', 0, -5], ['choirmask', -5, -9], ['choirmask', 5, -9]]],
    ['2 hollow angels + gilded knight', 14, [['hollowangel', -4, -8], ['hollowangel', 4, -8], ['gildedknight', 0, -5]]],
  ];
  for (const [name, tier, list] of PACKS) scenario(`pack: ${name} (t${tier})`, at(list), tier, [0.5, 1]);
}

// ------------------------------------------------------------------ bosses (normal and Ascended)
function bossRun(type, heroId, skill, seed, tier, o = {}) {
  const maxT = o.maxT || 420;
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 6, prog(heroId, tier));
  const boss = w.spawnBoss(type, 0, -4, { face: 0, hpMul: o.hpMul || 1, ascended: !!o.ascended, trueForm: !!o.trueForm });
  boss.ascended = !!o.ascended; boss.trueForm = !!o.trueForm; // until sim.spawnBoss copies them
  const bot = makeBot(skill, seed * 7 + 1);
  let t = 0; const dt = 1 / 60; let maxAdds = 0, hidT = 0, chanT = 0; const moves = new Set(); const phases = new Set([1]);
  while (t < maxT && !hero.dead && w.foes().length) {
    w.update(dt, bot(w, dt)); t += dt;
    for (const ev of w.drain()) { if (ev.type === 'tele' && ev.e === boss) moves.add(ev.atk.name); if (ev.type === 'phase' && ev.e === boss) phases.add(ev.phase); }
    if (boss.ai.chan && boss.state === 'idle') { chanT += dt; moves.add('rite:' + boss.ai.chan.id); } else chanT = 0;
    if (boss.hidden && !boss.dead && !boss.away) { hidT += dt; moves.add('hidden'); } else hidT = 0; // away: an interlude (interlude.js), capped there
    if (chanT > 8) { bad(`${type} stuck in a rite`); return { win: false, t }; }
    if (hidT > 8) { bad(`${type} stuck hidden`); return { win: false, t }; }
    maxAdds = Math.max(maxAdds, w.foes().length - (boss.dead ? 0 : 1));
    if (!invariants(w, type)) return { win: false, t };
  }
  return { win: !hero.dead && !w.foes().length, t, hp: hero.hp / hero.maxHp, timeout: t >= maxT, maxAdds, moves, phases, bossLeft: boss.dead ? 0 : boss.hp / boss.maxHp };
}
function bossSeries(label, type, tier, o, heroes = HERO_LIST, skills = [0, 1]) {
  const want = PHASES_OF(type, o);
  for (const heroId of heroes) for (const skill of skills) {
    let wins = 0, time = 0, hp = 0, to = 0, adds = 0, left = 0; const moves = new Set(), phases = new Set();
    for (let s = 1; s <= N; s++) {
      const r = bossRun(type, heroId, skill, s * 37 + tier, tier, o); if (!r.moves) continue;
      if (r.win) { wins++; hp += r.hp; } else left += r.bossLeft; time += r.t; if (r.timeout) to++; adds = Math.max(adds, r.maxAdds);
      for (const m of r.moves) moves.add(m); for (const p of r.phases) phases.add(p);
    }
    const wr = wins / N;
    console.log(`${heroId.padEnd(11)} ${label.padEnd(22)} t${tier} skill ${skill}: win ${(wr * 100).toFixed(0).padStart(3)}%  avg ${(time / N).toFixed(1).padStart(5)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  boss left ${N - wins ? (left / (N - wins) * 100).toFixed(0) : '-'}%  timeouts ${to}  adds ${adds}  phases ${[...phases].sort().join('')}${skill ? '  moves ' + moves.size : ''}`);
    if (to) bad(`${heroId} vs ${label}: ${to} timeouts`);
    if (skill === 1 && wins && phases.size < want) bad(`${heroId} vs ${label}: reached ${phases.size} of ${want} phases`);
    if (skill === 1 && wr < 0.4) note(`${heroId} vs ${label} skill 1 wins ${(wr * 100).toFixed(0)}% (target 40-100%)`);
    if (skill === 0 && wr > 0.25) note(`${heroId} vs ${label}: the masher wins ${(wr * 100).toFixed(0)}% (should be rare)`);
  }
}
const ACT3 = [['bogmother', 12], ['clockmaster', 13], ['wheel', 14]];
// every boss and the tier its fight comes at; Ascended (New Game+) at a later tier: the hero at the cap
const ALL = [['gaoler', 0], ['tallow', 1], ['harbormaster', 2], ['deacon', 3], ['ossuary', 4], ['founder', 5], ['regent', 6], ['silence', 7], ['frostgiant', 8], ['sandwyrm', 9], ['lich', 10], ['archon', 11], ['bogmother', 12], ['clockmaster', 13], ['wheel', 14]];
function statics() {
  for (const [type] of ACT3) {
    const D = BOSSES2[type], B = BOSS_AI2[type];
    if (!D || !B) { bad(`${type} is not registered`); continue; }
    if (!D.name || !D.title || !D.look || !D.boss) bad(`${type}: name, title, look and boss flag`);
    if (D.hp < 9600 || D.hp > 12000) bad(`${type}: hp ${D.hp} off the curve (9600-12000)`);
    const np = B.phases.length + 1; if (np < 3) bad(`${type}: ${np} phases`);
    const ids = new Set([1, 2, 3, 4, 5].flatMap((p) => B.moves(p, { trueForm: true }).map((m) => m.id))); if (ids.size < 6) bad(`${type}: ${ids.size} moves`);
  }
  for (const [type] of ALL) {
    const A = ASCENDED[type]; if (!A) { bad(`${type}: no Ascended form`); continue; }
    const own = (BOSS_AI[type] || BOSS_AI2[type]).phases.length + 1;
    const ap = PHASES_OF(type, { ascended: true }); if (ap < Math.max(4, own + 1)) bad(`${type}: Ascended has ${ap} phases`);
    if (!A.color || !A.moves || A.moves.length < 2) bad(`${type}: Ascended colour and two new moves`);
    const E = bossEntrance(type); if (!E || !(E.dur >= 2.5 && E.dur <= 4.5) || typeof E.step !== 'function' || !E.kind) bad(`${type}: an entrance (2.5-4.5 s, a step)`);
  }
  const kinds = ALL.map(([t]) => bossEntrance(t) && bossEntrance(t).kind); if (new Set(kinds).size !== kinds.length) bad('two bosses share an entrance: ' + kinds.join(','));
}
// every entrance: the boss is harmless and untouchable while it plays, ends on its spot, and fights after
function entrances() {
  for (const [type, tier] of ALL) {
    const E = bossEntrance(type); if (!E) continue;
    const w = new World({ ...ARENA, seed: 3 }); const hero = w.spawnHero(0, 6, prog('warden', tier)); const boss = w.spawnBoss(type, 0, -4, { face: 0 });
    const hp0 = hero.hp; let t = 0; const dt = 1 / 60; let ok = true, hit = 0;
    while (t <= E.dur + 0.05) {
      E.step(w, boss, t, null); w.update(dt, { mx: 0, mz: 0, attackPressed: true }); w.drain(); t += dt;
      if (boss.entering && !(boss.iframes > 0)) { ok = false; }
      if (boss.entering && w._damage(hero, boss, 1, {}) === true) hit++;
      if (!invariants(w, type + ' entrance')) { ok = false; break; }
    }
    E.step(w, boss, E.dur + 0.1, null);
    if (!ok || hit) bad(`${type}: the boss could be struck during its entrance (${hit})`);
    if (hero.hp < hp0) bad(`${type}: the entrance hurt the hero`);
    if (boss.entering || boss.hidden || Math.hypot(boss.x, boss.z + 4) > 0.6 || Math.abs(boss.leapH || 0) > 0.01) bad(`${type}: the entrance does not end on the spot (${boss.x.toFixed(2)}, ${boss.z.toFixed(2)}, ${boss.leapH})`);
    let acted = false; for (let i = 0; i < 60 * 6 && !acted; i++) { w.update(dt, { mx: 0, mz: 0 }); w.drain(); if (boss.state === 'windup' || boss.ai.chan) acted = true; }
    if (!acted) bad(`${type}: does not fight after its entrance`);
  }
}

if (on('rules')) rules();
if (on('entrances') || on('bosses')) { statics(); entrances(); }
console.log(`seeds: ${N}  heroes: ${HERO_LIST.join(', ')}  part: ${PART}`);
if (on('units')) units();
if (on('bosses')) for (const [type, tier] of ACT3) bossSeries(type, type, tier, {}, HERO_LIST);
if (on('bosses')) bossSeries('wheel (true form)', 'wheel', 14, { trueForm: true }, HERO_LIST, [1]);
// Ascended: New Game+ keeps the hero's levels and gear, so they fight at the cap (tier 14), with 1.5x hp
if (on('ascended')) for (const [type] of ALL) bossSeries(type + ' ASC', type, 14, { ascended: true, hpMul: 1.5, trueForm: type === 'wheel' }, process.env.HERO ? HERO_LIST : ['warden', 'huntress'], [1]);
console.log(fail ? `${fail} failures` : 'all invariants hold');
process.exit(fail ? 1 : 0);
