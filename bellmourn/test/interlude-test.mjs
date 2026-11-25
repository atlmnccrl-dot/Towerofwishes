// Interludes (js/game/interlude.js) in Node: every kind starts, takes the boss away (untargetable, hidden, its
// health held above its next stage), shows its objective (world.interlude) and ends: early and hurt when the
// job is done, on time when it is not. A returning mini-boss never leaves. Then every Act I boss fought by the
// skilled bot on god mode: every stage is reached, every interlude starts and ends, the boss dies.
// node bellmourn/test/interlude-test.mjs [part=all|unit|bosses] [seeds=2]
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { interlude, stageOf, interludeOf } from '../js/game/interlude.js';
import '../js/game/content.js';

const PART = process.argv[2] || 'all'; const SEEDS = +(process.argv[3] || 2);
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); }; const ok = (c, m) => { if (!c) bad(m); };
const ARENA = { bounds: [-12, -11, 12, 11], solids: [{ x: -6, z: -3, r: 0.7, h: 3 }] };
const dt = 1 / 60;

function setup(seed = 3, type = 'gaoler') {
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 6, { heroId: 'warden', face: Math.PI }); hero.iframes = 1e9;
  const boss = w.spawnBoss(type, 0, -4, { face: 0 }); boss.state = 'idle';
  return { w, hero, boss };
}
function run(w, hero, H, o = {}) {
  const bot = o.idle ? () => ({ mx: 0, mz: 0 }) : makeBot(1, 11); let t = 0; const seen = { away: false, hud: null, floorOk: true, untouchable: true };
  while (!H.done && t < (o.max || 40)) {
    hero.iframes = 1e9; hero.hp = hero.maxHp;
    const hid = H.boss.hidden; w.update(dt, bot(w, dt)); t += dt;
    for (const ev of w.drain()) if (ev.type === 'hit' && ev.dst === H.boss && hid) seen.untouchable = false;
    if (H.boss.away) { seen.away = true; if (H.floor && H.boss.hp < H.floor - 0.5) seen.floorOk = false; }
    if (w.interlude && !seen.hud) seen.hud = { ...w.interlude };
    for (const e of w.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.hp)) { bad('NaN on ' + e.type); return { t, seen }; }
  }
  return { t, seen };
}

function unit() {
  // stages
  { const { boss } = setup(); ok(stageOf(boss) === 1, 'full health is stage 1'); boss.hp = boss.maxHp * 0.5; ok(stageOf(boss) === 2, 'half health is stage 2'); boss.hp = boss.maxHp * 0.2; ok(stageOf(boss) === 3, '20% is stage 3');
    boss.stageAt = [0.8, 0.5]; boss.hp = boss.maxHp * 0.7; ok(stageOf(boss) === 2, 'own thresholds'); boss.mini = true; ok(stageOf(boss) === 1, 'a mini is stage 1'); }
  { const { w, boss } = setup(); boss.mini = true; const H = interlude(w, boss, { kind: 'targets' }); ok(H.done && !boss.away && !w.interlude, 'a mini-boss never leaves'); }
  const kinds = [
    ['targets', { kind: 'targets', leave: 'burrow', banner: 'BREAK THE CHAINS', dur: 30, targets: { type: 'chain', n: 4, hp: 40 } }, { early: true }],
    ['waves', { kind: 'waves', leave: 'fade', banner: 'HOLD THE YARD', dur: 40, waves: [[['hushed', 2]], [['ghoul', 2]]] }, { early: true }],
    ['gauntlet', { kind: 'gauntlet', leave: 'fly', banner: 'SURVIVE', dur: 8, pattern: (w, t, h, H) => { if (H.every('rain', 0.5)) w.addHazard({ shape: 'circle', x: w.hero.x, z: w.hero.z, r: 1, warn: 0.8, life: 0.2, dmg: 10, src: H.boss, kind: 'slam' }); } }, { early: false, exact: 8 }],
    ['chase', { kind: 'chase', leave: 'sink', banner: 'STRIKE IT', dur: 40, chase: { hits: 3, surface: 2.2 } }, { early: true }],
    ['chase+decoys', { kind: 'chase', leave: 'fade', banner: 'FIND THE REAL ONE', dur: 40, chase: { hits: 2, surface: 2.4, decoys: 2 } }, { early: null }],
    ['targets timeout', { kind: 'targets', leave: 'climb', banner: 'BREAK THEM', dur: 6, targets: { type: 'bell', n: 3, hp: 200 } }, { early: false, idle: true }],
  ];
  for (const ent of ['slam', 'drop', 'rise', 'rush']) kinds.push(['return ' + ent, { kind: 'gauntlet', leave: 'fade', dur: 4, back: { entrance: ent } }, { early: false }]);
  for (const [label, spec, want] of kinds) {
    const { w, hero, boss } = setup(5); let returned = 0; const hp0 = boss.hp;
    const H = interlude(w, boss, { ...spec, onReturn: () => returned++ });
    ok(interludeOf(w, boss) === H, `${label}: the handle is listed`); ok(w.interlude && w.interlude.banner, `${label}: the HUD has a banner`);
    const r = run(w, hero, H, { idle: want.idle, max: 60 });
    ok(H.done, `${label}: ended (t ${r.t.toFixed(1)})`); ok(r.seen.away, `${label}: the boss went away`); ok(returned === 1, `${label}: onReturn ran once (${returned})`);
    ok(!boss.away && !boss.hidden && !boss.il && boss.iframes <= 0.01 && (boss.leapH || 0) === 0, `${label}: the boss is back and hittable`);
    ok(!w.interlude, `${label}: the HUD state is cleared`); ok(r.seen.floorOk, `${label}: its health stayed above its next stage`); ok(r.seen.untouchable, `${label}: it took no blows while hidden`);
    if (want.early !== null && want.early !== undefined) ok(H.early === want.early, `${label}: early ${H.early}, wanted ${want.early}`);
    if (want.early) ok(boss.hp < hp0, `${label}: it came back hurt`);
    if (want.exact) ok(Math.abs(H.t - want.exact) < 0.1, `${label}: a gauntlet lasts exactly its time (${H.t.toFixed(2)})`);
    ok(!w.ents.some((e) => (e.ilTarget || e.ilDecoy) && !e.dead), `${label}: no target or decoy left standing`);
    console.log(`  ${label.padEnd(16)} ${r.t.toFixed(1).padStart(5)}s  early ${H.early}  boss ${(boss.hp / boss.maxHp * 100).toFixed(0)}%`);
  }
}

// every Act I boss, god mode, the skilled bot: every stage, every interlude in and out, the boss falls
const ACT1 = ['gaoler', 'tallow', 'harbormaster', 'deacon', 'ossuary', 'founder', 'regent', 'silence'];
function bosses() {
  for (const type of (process.env.BOSS ? process.env.BOSS.split(',') : ACT1)) for (let s = 1; s <= SEEDS; s++) {
    const w = new World({ ...ARENA, seed: s * 13 }); const hero = w.spawnHero(0, 6, { heroId: 'warden', face: Math.PI });
    const boss = w.spawnBoss(type, 0, -4, { face: 0 }); boss.state = 'idle'; const bot = makeBot(1, s);
    let t = 0, ils = 0, ends = 0, awayT = 0; const phases = new Set([1]); const banners = [];
    while (t < 600 && !boss.dead) {
      hero.hp = hero.maxHp; hero.iframes = Math.max(hero.iframes, 0); w.update(dt, bot(w, dt)); t += dt;
      for (const ev of w.drain()) { if (ev.type === 'phase' && ev.e === boss) phases.add(ev.phase); if (ev.type === 'interlude' && ev.e === boss) { ils++; banners.push(ev.banner); } if (ev.type === 'interludeEnd' && ev.e === boss) ends++; }
      if (boss.away) { awayT += dt; if (awayT > 40) { bad(`${type}: away for over 40 s`); break; } } else awayT = 0;
      if (!boss.away && boss.hidden && !boss.dead && (boss._hidT = (boss._hidT || 0) + dt) > 8) { bad(`${type}: stuck hidden`); break; } else if (!boss.hidden) boss._hidT = 0;
      if (hero.dead) { hero.dead = false; hero.hp = hero.maxHp; hero.state = 'idle'; }
      const bad1 = w.ents.find((e) => !Number.isFinite(e.x) || !Number.isFinite(e.hp)); if (bad1) { bad(`${type}: NaN on ${bad1.type}`); break; }
    }
    ok(boss.dead, `${type} s${s}: the boss fell (t ${t.toFixed(0)}, ${(boss.hp / boss.maxHp * 100).toFixed(0)}% left)`);
    ok(phases.size >= 3, `${type} s${s}: reached ${phases.size} of 3 stages`);
    ok(ils >= 1 && ends === ils, `${type} s${s}: interludes ${ils} started, ${ends} ended`);
    console.log(`  ${type.padEnd(13)} s${s}: ${t.toFixed(0).padStart(4)}s  stages ${[...phases].join('')}  interludes ${ils}/${ends}  ${banners.join(' | ')}`);
  }
}

if (PART === 'all' || PART === 'unit') { console.log('interlude rules'); unit(); }
if (PART === 'all' || PART === 'bosses') { console.log('Act I bosses (god mode, skilled bot)'); bosses(); }
console.log(fail ? `${fail} FAILED` : 'interlude: all good');
process.exit(fail ? 1 : 0);
