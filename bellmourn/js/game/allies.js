// The wardens as allies (docs/RUN_DESIGN.md §5): friends from the side quests who arrive when the Wheel
// enters its second stage (and, on later runs, beside an act boss), each with an entrance scene, and fight
// beside the player as modest helpers. Pure logic: no DOM; entrances touch effects only through their fx
// argument (null in Node).
//
// ALLY_AI[heroId](world, ally, dt) -> an input frame ({ mx, mz, attackPressed, attackDown, dashPressed,
// ultPressed }), the shape world.spawnAlly (sim.js) expects. Every mind is the skilled bot (bot.js, opts.self)
// for reading telegraphs and dashing out of them, held to the warden's own way of fighting and kept modest:
//  - it stays near the player (a leash) and fights the foe the player fights;
//  - it keeps its own range (the crossbow and the lantern from afar, Kestrel round the far side of the foe,
//    Mother Wren close to the player, the hammer and the anchor in close);
//  - it rests: every few seconds it holds back a moment, circling;
//  - its ultimate goes off rarely (a long cooldown of its own, and only against a great foe);
//  - it does nothing at all while its entrance plays (ally.entering).
// allyEntrance(heroId) -> { kind, dur, step(world, ally, t, fx) }: the arrival, as bosses4.js bossEntrance.
//
// The entrances and the lines below: PROPOSAL, for the author.
import { makeBot } from './bot.js';

const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// How each warden fights beside you. keep: the distance it holds from its target; leash: how far it strays
// from you; rest: [every, for] seconds; ult: its own cooldown; flank: works round the far side of the foe;
// near: stays this close to you (the singers); cadence: the shortest time between its attacks (slower than
// the player's hand: a helper, not a carry).
export const ALLY_STYLE = {
  warden: { keep: 1.7, leash: 7.5, rest: [5.5, 1.2], ult: 32, cadence: 0.3 },
  huntress: { keep: 6.0, ranged: true, leash: 9, rest: [5.0, 1.4], ult: 36, cadence: 0.34 },
  bellbreaker: { keep: 1.9, leash: 7, rest: [6.0, 1.4], ult: 36, cadence: 0.42 },
  lamplighter: { keep: 5.5, ranged: true, leash: 8.5, rest: [5.0, 1.3], ult: 38, cadence: 0.48, near: 5 },
  kestrel: { keep: 1.5, leash: 8.5, rest: [4.5, 1.1], ult: 30, cadence: 0.24, flank: true },
  hollis: { keep: 2.6, leash: 7, rest: [6.0, 1.4], ult: 36, cadence: 0.44 },
  wren: { keep: 5.0, ranged: true, leash: 6.5, rest: [5.0, 1.5], ult: 40, cadence: 0.42, near: 3.6 },
};
const NONE = () => ({ mx: 0, mz: 0 });

function nearest(list, p) { let best = null, bd = Infinity; for (const f of list) { const d = dist(f, p); if (d < bd) { bd = d; best = f; } } return best; }
function toward(inp, from, to, k = 1) { const d = dist(from, to) || 1; inp.mx = (to.x - from.x) / d * k; inp.mz = (to.z - from.z) / d * k; return inp; }

function mind(heroId) {
  const St = ALLY_STYLE[heroId] || ALLY_STYLE.warden; const minds = new WeakMap();
  return function think(w, a, dt = 1 / 60) {
    if (!a || a.dead) return NONE();
    if (a.entering) return NONE();
    let m = minds.get(a);
    if (!m) { m = { bot: makeBot(1, 977 + (a.id || 1) * 13, { self: a }), t: 0, restAt: 2.5 + ((a.id || 1) % 5) * 0.6, restTo: 0, ultAt: St.ult * 0.45, lastAtk: -9, side: (a.id || 1) % 2 ? 1 : -1 }; minds.set(a, m); }
    m.t += dt;
    const inp = m.bot(w, dt) || NONE(); delete inp.healPressed;
    if (inp.dashPressed) return inp; // reading a blow comes first
    const main = w.main || w.hero; const foes = w.foes().filter((f) => !f.hidden && f.state !== 'spawn');
    const dm = main && !main.dead && main !== a ? dist(a, main) : 0;
    // the leash: back to the player when it strays (unless something is on top of it)
    if (dm > St.leash && !foes.some((f) => dist(f, a) < 2.4)) return toward({ mx: 0, mz: 0 }, a, main);
    if (!foes.length) return inp;
    // its target: what the player is fighting (the nearest foe to the player), a great foe above all
    const boss = foes.find((f) => f.boss);
    const tg = main && !main.dead ? (boss && dist(boss, main) < 9 ? boss : nearest(foes, main)) : nearest(foes, a);
    // rests: every few seconds it holds back a moment
    if (m.t >= m.restAt) { m.restTo = m.t + St.rest[1]; m.restAt = m.t + St.rest[0] + ((m.t * 7.3) % 1.8); }
    const resting = m.t < m.restTo;
    // where it wants to stand
    const ka = angTo(tg, a); let want;
    if (St.flank && main && !main.dead) { const b = angTo(tg, main) + Math.PI + m.side * 0.5; want = { x: tg.x + S(b) * (St.keep + tg.r), z: tg.z + C(b) * (St.keep + tg.r) }; }
    else { const k = St.keep + tg.r + (resting ? 2.2 : 0); const b = ka + (resting ? m.side * 0.8 : 0); want = { x: tg.x + S(b) * k, z: tg.z + C(b) * k }; }
    if (St.near && main && !main.dead && dist(want, main) > St.near) { const b = angTo(main, want); want = { x: main.x + S(b) * St.near, z: main.z + C(b) * St.near }; }
    const out = { mx: 0, mz: 0 };
    const dw = dist(a, want); if (dw > 0.6) toward(out, a, want, dw > 2 ? 1 : 0.6);
    // attack: in reach, line clear, not resting, at its own pace
    const d = dist(a, tg) - tg.r; const reach = St.ranged ? 9 : ((a.kit && a.kit.attack && a.kit.attack.combo ? a.kit.attack.combo[0].range : 2) + 0.2);
    const clear = !w.clear || w.clear(a, tg);
    if (!resting && d < reach && clear && m.t - m.lastAtk >= St.cadence) {
      m.lastAtk = m.t; out.attackPressed = true; if (St.ranged) out.attackDown = true;
      if (!St.ranged && d > 0.6) toward(out, a, tg, 0.4); // a step into the blow
    } else if (St.ranged && !resting && d < reach && clear) out.attackDown = m.t - m.lastAtk < St.cadence * 0.6;
    // its ultimate: rarely, only against a great foe, when the bot would have used it
    if (inp.ultPressed && boss && m.t >= m.ultAt) { out.ultPressed = true; m.ultAt = m.t + St.ult; }
    return out;
  };
}
export const ALLY_AI = {};
for (const id of Object.keys(ALLY_STYLE)) ALLY_AI[id] = mind(id);

// ================================================================== entrances
// allyEntrance(heroId) -> { kind, dur, step(world, ally, t, fx) }. Call step every frame (after the world's
// own update) with t from 0 to dur and once past it. While it runs the ally is untouchable and does nothing
// of its own (ally.entering, ally.untargetable); step places it (it ends on the spot where it was spawned),
// poses it (anim / animT) and asks fx for the effects. It returns true while it runs and false once ended.
// It may emit world events: 'allyArrive' { e, heroId, kind } once at the moment of arrival (a sound, a name
// card), 'choir' (Mother Wren), 'pin' { e, boss } (Vesper's bolts), plus 'shake'.
const once = (st, key, fn) => { if (!st.fired.has(key)) { st.fired.add(key); fn(); } };
const bossOf = (w) => w.foes().find((f) => f.boss && !f.dead) || null;
export const ALLY_LINES = { // PROPOSAL: what each one says arriving (two lines of the 5x7 font at most)
  warden: 'THE BELL STILL HAS A WARDEN.',
  huntress: 'HOLD STILL. I NEVER MISS TWICE.',
  bellbreaker: 'DOORS ARE FOR PEOPLE WHO KNOCK.',
  lamplighter: 'NO DARK IS DEEP ENOUGH TO PUT ME OUT.',
  kestrel: 'MY FATHER KEPT THE KEYS. I KEEP MY PROMISES.',
  hollis: 'THE TIDE BROUGHT ME BACK. IT BRINGS ME HERE.',
  wren: 'SING WITH ME, CHILD. LOUDER.',
};
const ENTR = {
  // Kestrel drops from the rafters, lands crouched on her knives, rises
  kestrel: { kind: 'rafters', dur: 2.2, script(w, a, t, F, st) {
    st.put(st.home.x, st.home.z); const k = clamp01((t - 0.35) / 0.55); a.hidden = t < 0.35; a.leapH = 9 * (1 - k * k);
    if (t < 0.9) { st.anim('dash', 0.1); return; }
    once(st, 'land', () => { w.emit('shake', { amt: 0.4 }); w.emit('allyArrive', { e: a, heroId: 'kestrel', kind: 'rafters' }); F((fx) => { fx.dust(st.home.x, st.home.z, 20); fx.shockRing(st.home.x, st.home.z, 2.4, [2.6, 0.6, 0.6], 0.35); fx.sparks(st.home.x, 0.3, st.home.z, 0, 14, [3, 3, 3]); }); });
    if (t < 1.5) st.anim('kneel', 0.6); else st.anim('rise', 0.4 + (t - 1.5));
  } },
  // Hollis: the anchor smashes down first, then he walks in hauling the chain
  hollis: { kind: 'anchor', dur: 2.8, script(w, a, t, F, st) {
    const from = st.at(-4.5);
    if (t >= 0.35) once(st, 'smash', () => { w.emit('shake', { amt: 0.7 }); F((fx) => { fx.debris(st.home.x, 0.4, st.home.z, 18, [0.4, 0.42, 0.42], { speed: 6, size: 0.18 }); fx.splash(st.home.x, st.home.z, 40); fx.shockRing(st.home.x, st.home.z, 3.6, [0.6, 1.8, 1.7], 0.5); fx.slashLine((st.home.x + from.x) / 2, 1.0, (st.home.z + from.z) / 2, 4.6, [1.4, 1.5, 1.6], 1.6); }); });
    if (t < 0.6) { a.hidden = true; st.put(from.x, from.z); return; }
    a.hidden = false; const k = ease(clamp01((t - 0.6) / 1.4)); st.put(lerp(from.x, st.home.x, k), lerp(from.z, st.home.z, k));
    if (t < 2.0) { st.anim('walk', t); return; }
    once(st, 'arrive', () => w.emit('allyArrive', { e: a, heroId: 'hollis', kind: 'anchor' }));
    st.anim('aslam', Math.min(0.7, (t - 2.0) * 1.2));
  } },
  // Mother Wren: the choir swells as she walks in, notes rising round her
  wren: { kind: 'choir', dur: 3.0, script(w, a, t, F, st) {
    const from = st.at(-4);
    once(st, 'choir', () => w.emit('choir', { e: a }));
    const k = ease(clamp01(t / 2.2)); st.put(lerp(from.x, st.home.x, k), lerp(from.z, st.home.z, k));
    if (st.every(0.07)) F((fx) => { const ang = Math.random() * TAU, r = 0.6 + Math.random() * 1.6; fx.emit(a.x + S(ang) * r, 0.3, a.z + C(ang) * r, { n: 1, speed: 0.1, vy: 1.6 + Math.random(), life: 1.2, grav: -0.5, color: [2.2, 1.1, 3.2], size: Math.random() < 0.3 ? 2 : 1 }); });
    if (t < 2.2) { st.anim('walk', t); return; }
    once(st, 'arrive', () => { w.emit('allyArrive', { e: a, heroId: 'wren', kind: 'choir' }); F((fx) => fx.shockRing(st.home.x, st.home.z, 4, [2.2, 1.0, 3.0], 0.6)); });
    st.anim('chant', t - 2.2);
  } },
  // Bram: his hammer comes through a wall, and he comes through after it
  bellbreaker: { kind: 'wall', dur: 2.8, script(w, a, t, F, st) {
    const wall = st.at(-2.6), from = st.at(-3.4);
    once(st, 'piece', () => F((fx) => fx.setPiece('wall', wall.x, wall.z, st.home.face, { life: 3.4, burst: 0.9 })));
    if (t < 0.9) { a.hidden = true; st.put(from.x, from.z); if (t > 0.35) once(st, 'k1', () => w.emit('shake', { amt: 0.3 })); return; }
    a.hidden = false;
    once(st, 'burst', () => { w.emit('shake', { amt: 0.8 }); F((fx) => { fx.debris(wall.x, 1.2, wall.z, 28, [0.42, 0.36, 0.32], { ang: st.home.face, speed: 7, size: 0.22 }); fx.mist(wall.x, 1, wall.z, 26, [0.5, 0.48, 0.44]); }); });
    const k = ease(clamp01((t - 0.9) / 0.7)); st.put(lerp(from.x, st.home.x, k), lerp(from.z, st.home.z, k));
    if (t < 1.6) { st.anim('charge', 0.9 + (t - 0.9)); return; }
    once(st, 'slam', () => { w.emit('shake', { amt: 0.6 }); w.emit('allyArrive', { e: a, heroId: 'bellbreaker', kind: 'wall' }); F((fx) => fx.shockRing(st.home.x, st.home.z, 3.4, [2.4, 1.8, 1.0], 0.5)); });
    st.anim('hsmash2', Math.min(0.85, 0.3 + (t - 1.6)));
  } },
  // Vesper leaps in from the roofs; her bolts pin the boss as she lands
  huntress: { kind: 'bolts', dur: 2.4, script(w, a, t, F, st) {
    const from = st.at(-5); const k = clamp01(t / 1.1); st.put(lerp(from.x, st.home.x, easeOut(k)), lerp(from.z, st.home.z, easeOut(k))); a.leapH = S(k * Math.PI) * 4.5 + (1 - k) * 2;
    const boss = bossOf(w);
    for (const [key, at] of [['b1', 0.4], ['b2', 0.62], ['b3', 0.84]]) if (t >= at) once(st, key, () => {
      if (!boss) return;
      F((fx) => { fx.slashLine((a.x + boss.x) / 2, 1.3 + a.leapH * 0.5, (a.z + boss.z) / 2, dist(a, boss), [2.4, 2.3, 2.0], 0.18); fx.sparks(boss.x, 1.2, boss.z, angTo(a, boss), 12, [3, 2.8, 2.2]); });
      if (key === 'b3') { if (w.applyStatus) w.applyStatus(boss, 'frost', { dur: 1.5 }); w.emit('pin', { e: a, boss }); }
    });
    if (t < 1.1) { st.anim('aim', 0.6); return; }
    once(st, 'land', () => { a.leapH = 0; w.emit('allyArrive', { e: a, heroId: 'huntress', kind: 'bolts' }); F((fx) => fx.dust(st.home.x, st.home.z, 14)); });
    a.leapH = 0; if (boss) a.face = angTo(a, boss); st.anim(t < 1.6 ? 'kneel' : 'aim', t < 1.6 ? 0.6 : 0.6);
  } },
  // Sister Ash steps out of a pillar of lamp-flame
  lamplighter: { kind: 'flame', dur: 2.6, script(w, a, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('beam', st.home.x, st.home.z, st.home.face, { life: 2.8, color: [3.4, 1.8, 0.5] })));
    st.put(st.home.x, st.home.z);
    if (st.every(0.04)) F((fx) => fx.emit(st.home.x + (Math.random() - 0.5) * 1.2, 0.2, st.home.z + (Math.random() - 0.5) * 1.2, { n: 2, speed: 0.3, up: 1, vy: 4 + Math.random() * 3, life: 0.8, grav: -2, color: [3.4, 1.7, 0.4], size: Math.random() < 0.3 ? 2 : 1 }));
    a.hidden = t < 1.0;
    if (t < 1.0) return;
    once(st, 'out', () => { w.emit('allyArrive', { e: a, heroId: 'lamplighter', kind: 'flame' }); F((fx) => { fx.shockRing(st.home.x, st.home.z, 3.2, [3.2, 1.6, 0.4], 0.5); fx.embers(st.home.x, 1, st.home.z, 40, [3.2, 1.6, 0.4]); }); });
    st.anim('cast', 0.6 + (t - 1.0) * 0.1);
  } },
  // Carmine comes in a gust of petals, her red cloak first, and cuts the air
  warden: { kind: 'petals', dur: 2.4, script(w, a, t, F, st) {
    st.put(st.home.x, st.home.z);
    if (t < 1.2 && st.every(0.03)) F((fx) => { const r = 2.6 * (1 - t / 1.3); for (let i = 0; i < 3; i++) { const ang = t * 7 + i * TAU / 3; fx.emit(st.home.x + S(ang) * r, 0.4 + t * 1.2, st.home.z + C(ang) * r, { n: 2, speed: 0.4, life: 0.8, grav: 0.4, color: [2.8, 0.4, 0.4], size: 1, drag: 1 }); } });
    a.hidden = t < 1.0;
    if (t < 1.0) return;
    once(st, 'out', () => { w.emit('allyArrive', { e: a, heroId: 'warden', kind: 'petals' }); F((fx) => { fx.emit(st.home.x, 1, st.home.z, { n: 50, speed: 3, up: 1, life: 1.2, grav: 0.5, color: [2.8, 0.35, 0.35], size: 1, drag: 1.2, jit: 0.6 }); fx.slashLine(st.home.x, 1.1, st.home.z, 3.2, [3, 0.4, 0.35], 0.3); }); });
    st.anim(t < 1.7 ? 'slash3' : 'idle', t < 1.7 ? (t - 1.0) * 0.9 : t);
  } },
};
export function allyEntrance(heroId) {
  const E = ENTR[heroId]; if (!E) return null;
  return {
    kind: E.kind, dur: E.dur, line: ALLY_LINES[heroId] || null,
    step(w, a, t, fx) {
      let st = a._entr;
      if (!st || t < st.last - 0.001) {
        st = a._entr = { home: { x: a.x, z: a.z, face: a.face }, fired: new Set(), last: 0, dt: 0, acc: {} };
        st.at = (d) => ({ x: st.home.x + S(st.home.face) * d, z: st.home.z + C(st.home.face) * d });
        st.put = (x, z) => { a.x = x; a.z = z; a.vx = 0; a.vz = 0; a.kbx = 0; a.kbz = 0; };
        st.anim = (name, at) => { a.anim = name; a.animT = Math.max(0, at); };
        st.every = (every, key = 'e' + every) => { st.acc[key] = (st.acc[key] || 0) + st.dt; if (st.acc[key] >= every) { st.acc[key] = 0; return true; } return false; };
      }
      if (st.done) return false;
      st.dt = Math.max(0, t - st.last); st.last = t;
      const F = (fn) => { if (fx) { try { fn(fx); } catch (err) { /* an effect never breaks the fight */ } } };
      if (t >= E.dur) {
        st.done = true; a.entering = false; a.untargetable = false; a.hidden = false; a.leapH = 0; a.iframes = 0.5;
        a.x = st.home.x; a.z = st.home.z; a.face = st.home.face; a.state = 'idle'; a.t = 0; a.anim = 'idle'; a.animT = 0;
        return false;
      }
      a.entering = true; a.untargetable = true; a.iframes = 99; a.inp = { mx: 0, mz: 0 }; a.face = st.home.face;
      E.script(w, a, t, F, st);
      return true;
    },
  };
}
