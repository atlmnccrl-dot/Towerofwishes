// The bosses of the new districts: stats and looks (BOSSES2) and their move sets (BOSS_AI2), in the
// same shape as BOSSES / BOSS_AI in defs.js and ai.js. Pure logic (the look.extra functions only run
// in the browser, when the view builds the rig).
//
// No parry exists: every blow is telegraphed (a red shape on the stones, or a hazard's warning circle)
// and can be dashed through or walked out of. Each boss also has reach (a hook, spike rows, pours and a
// thrown bell, lunges and a vanish) so a ranged hero cannot kite it forever.
import { strike, ringAt, circleAt, summon } from './ai.js';

const deg = (d) => (d * Math.PI) / 180;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const hpFrac = (e) => e.hp / e.maxHp;

// ------------------------------------------------------------------ helpers
// a point inside the arena and not inside anything solid
function free(w, x, z, r = 0.4) {
  const [x0, z0, x1, z1] = w.bounds;
  return x > x0 + 0.6 && x < x1 - 0.6 && z > z0 + 0.6 && z < z1 - 0.6 && !w._blocked(x, z, r);
}
// how many other foes are up (summons are capped so the arena never floods)
const adds = (w, e) => w.foes().filter((f) => f !== e).length;
const countOf = (w, type) => w.foes().filter((f) => f.type === type).length;
// a short roar while something is summoned or a guard is raised
function roarPause(e, t = 0.4) { e.ai.cd = 1; e.state = 'roar'; e.t = t; e.anim = 'roar'; e.animT = 0; e.tele = null; }

// A row of circle hazards from (x, z) along `ang`, erupting one after another, stopping at walls.
function row(w, e, x, z, ang, o) {
  const n = o.n, step = o.step || 1.25, start = o.start || 1.4; let px = x, pz = z;
  for (let i = 0; i < n; i++) {
    const s = start + i * step; const cx = x + Math.sin(ang) * s, cz = z + Math.cos(ang) * s;
    if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break;
    circleAt(w, e, cx, cz, o.r || 0.9, { warn: o.warn + i * (o.gap ?? 0.07), life: o.life ?? 0.3, dmg: o.dmg, kind: o.kind, kb: o.kb ?? 5 });
    px = cx; pz = cz;
  }
}
// A long line of fire through a point, both ways until a wall, burning for a while.
function moltenLine(w, e, x, z, ang, o) {
  const L = o.len || 11, step = 1.35;
  for (const dir of [1, -1]) {
    let px = x, pz = z;
    for (let s = dir > 0 ? 0 : step; s <= L; s += step) {
      const cx = x + Math.sin(ang) * s * dir, cz = z + Math.cos(ang) * s * dir;
      if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break;
      // it runs from one end of the line to the other
      const k = (s * dir + L) / (2 * L);
      circleAt(w, e, cx, cz, 0.85, { warn: o.warn + k * (o.sweep ?? 0.6), life: o.life ?? 4.5, dmg: o.dmg, kind: 'fire', kb: 3 });
      px = cx; pz = cz;
    }
  }
}
// A melee combo of three or more blows: the World chains one follow-up per attack, so each blow arms
// the next when it strikes. blows: [{ at, windup, active, lunge }] after the first.
function combo(base, blows) {
  const list = blows.map((b, i) => ({ ...b, k: i + 1 })); const user = base.onStrike;
  return { ...base, chain: list[0], onStrike(w, e) { const k = e.atk.chained ? e.atk.chained.k : 0; if (k >= 1 && list[k]) { e.atk.chain = list[k]; e.chainDone = false; } if (user) user(w, e, k); } };
}
// windups and recoveries shortened (relentless phases); keeps every telegraph at least 0.4 s
function quick(a, k) {
  if (k === 1) return a;
  const s = (v) => (v === undefined ? v : Math.max(0.4, v * k));
  const o = { ...a, windup: s(a.windup), active: s(a.windup) + (a.active - a.windup), dur: Math.max(s(a.windup) + (a.active - a.windup) + 0.3, a.dur * k) };
  if (a.lungeT) o.lungeT = [s(a.lungeT[0]), s(a.lungeT[0]) + (a.lungeT[1] - a.lungeT[0])];
  return o;
}

// ------------------------------------------------------------------ looks (extra geometry on the rig)
// part(joint, geometry, colour, x, y, z, opts) adds a box to a joint; rig.weapon is the right-hand
// weapon group (its +Z runs along the weapon), so parts moved into it swing with the weapon.
function harborExtra(rig, part, box) {
  const iron = 0x56626a, wood = 0x3a2c1e, rust = 0x5a3a2a, kelp = 0x2a4a30, shell = 0xc8c0a8;
  const W = (p) => { rig.weapon.add(p); return p; };
  // the boat-hook: a long pole with an iron spike and a hook curling back
  W(part('haR', box(0.07, 0.07, 2.3), wood, 0, -0.04, 0.75));
  W(part('haR', box(0.1, 0.1, 0.16), iron, 0, -0.04, 1.86));
  W(part('haR', box(0.05, 0.05, 0.42), iron, 0, -0.04, 2.1));
  W(part('haR', box(0.05, 0.3, 0.05), iron, 0, -0.2, 1.92));
  W(part('haR', box(0.05, 0.05, 0.2), iron, 0, -0.34, 1.84));
  W(part('haR', box(0.05, 0.1, 0.05), iron, 0, -0.29, 1.74));
  rig.tip.position.set(0, -0.04, 2.3); rig.bladeLen = 2.2;
  // the anchor hanging from his left fist
  part('haL', box(0.14, 0.05, 0.14), rust, 0, -0.08, 0.04);
  part('haL', box(0.08, 0.86, 0.08), rust, 0, -0.5, 0.04);
  part('haL', box(0.5, 0.06, 0.06), iron, 0, -0.2, 0.04);
  for (const sx of [-1, 1]) {
    part('haL', box(0.07, 0.4, 0.07), rust, sx * 0.17, -0.86, 0.04, { rz: sx * 1.0 });
    part('haL', box(0.14, 0.12, 0.05), rust, sx * 0.33, -0.76, 0.04, { rz: sx * 0.4 });
  }
  // barnacles, kelp and a turned-up collar on the drowned oilskin
  for (const sx of [-1, 1]) {
    part('sh' + (sx > 0 ? 'L' : 'R'), box(0.07, 0.05, 0.07), shell, sx * 0.02, 0.05, 0.06);
    part('sh' + (sx > 0 ? 'L' : 'R'), box(0.05, 0.04, 0.05), shell, -sx * 0.04, 0.05, -0.05);
    part('chest', box(0.03, 0.46, 0.02), kelp, sx * 0.2, -0.08, 0.18, { rz: sx * 0.1 });
    part('spine', box(0.03, 0.5, 0.02), kelp, sx * 0.12, -0.24, -0.18);
  }
  part('chest', box(0.62, 0.12, 0.4), 0x1c2a30, 0, 0.3, -0.03);
  part('head', box(0.06, 0.04, 0.06), shell, 0.1, 0.27, 0.14);
}

function ossuaryExtra(rig, part, box) {
  const bone = 0xe4dcc8, old = 0xb8ae98, dark = 0x1a1612;
  // ribs over the breastplate
  for (let i = 0; i < 4; i++) part('chest', box(0.4, 0.028, 0.03), bone, 0, 0.02 + i * 0.075, 0.16);
  part('chest', box(0.05, 0.3, 0.04), bone, 0, 0.12, 0.17);
  // skull pauldrons with dark sockets
  for (const side of ['L', 'R']) {
    part('sh' + side, box(0.22, 0.18, 0.22), bone, 0, 0.06, 0);
    for (const sx of [-1, 1]) part('sh' + side, box(0.05, 0.04, 0.02), dark, sx * 0.05, 0.08, 0.115);
    part('sh' + side, box(0.04, 0.16, 0.04), old, side === 'L' ? 0.06 : -0.06, 0.2, -0.04, { rz: side === 'L' ? -0.4 : 0.4 });
  }
  // a ridge of vertebrae down the back
  for (let i = 0; i < 4; i++) part(i < 2 ? 'chest' : 'spine', box(0.05, 0.16, 0.05), old, 0, i < 2 ? 0.22 - i * 0.12 : 0.1 - (i - 2) * 0.1, -0.17, { rx: -0.6 });
  // a jaw of teeth under the skull mask
  for (let i = -2; i <= 2; i++) part('head', box(0.03, 0.04, 0.02), bone, i * 0.04, 0.05, 0.13);
  // a serrated bone edge on the greatsword
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) rig.weapon.add(part('haR', box(0.04, 0.03, 0.09), old, sx * 0.07, 0, 0.32 + i * 0.2, { ry: sx * 0.5 }));
  rig.weapon.add(part('haR', box(0.1, 0.06, 0.08), bone, 0, 0, 0.1));
}

function founderExtra(rig, part, box) {
  const bronze = 0xb07a34, dark = 0x2a1a0c, molten = 0xff8a20;
  // the bell: the rig's bell made bigger and bronze, with a yoke and a clapper
  const tint = part('haR', box(0.01, 0.01, 0.01), bronze, 0, 0, 0, { emissive: 0x2a1404 }); tint.visible = false;
  const bell = rig.weapon.children.find((m) => m.geometry && m.geometry.type === 'CylinderGeometry');
  if (bell) { bell.material = tint.material; bell.scale.set(1.75, 1.55, 1.75); bell.position.set(0, -0.52, 1.45); }
  rig.weapon.add(part('haR', box(0.56, 0.12, 0.16), dark, 0, -0.08, 1.45));
  rig.weapon.add(part('haR', box(0.14, 0.3, 0.14), dark, 0, -0.96, 1.45));
  rig.weapon.add(part('haR', box(0.1, 0.06, 0.1), molten, 0, -1.12, 1.45, { glow: 2 }));
  rig.tip.position.set(0, -1.0, 1.45); rig.bladeLen = 2;
  // a furnace grate in his chest and molten seams down the bronze
  part('chest', box(0.3, 0.16, 0.02), molten, 0, 0.1, 0.19, { glow: 3 });
  for (let i = -1; i <= 1; i++) part('chest', box(0.03, 0.18, 0.03), dark, i * 0.09, 0.1, 0.205);
  for (const side of ['L', 'R']) {
    part('el' + side, box(0.02, 0.2, 0.02), molten, 0, -0.13, 0.085, { glow: 2 });
    part('sh' + side, box(0.26, 0.1, 0.26), bronze, 0, 0.03, 0);
    part('kn' + side, box(0.02, 0.24, 0.02), molten, 0, -0.18, 0.1, { glow: 2 });
  }
  // a chimney on his back, glowing at the mouth
  part('chest', box(0.18, 0.5, 0.18), dark, 0.08, 0.3, -0.2);
  part('chest', box(0.12, 0.04, 0.12), molten, 0.08, 0.56, -0.2, { glow: 3 });
}

function regentExtra(rig, part, box) {
  const gold = 0xd8c070, thorn = 0x2a1a24;
  // a high collar and a jewel in the crown, ringed by thorns
  part('neck', box(0.32, 0.18, 0.06), 0x4a2a5a, 0, 0.1, -0.12);
  for (const sx of [-1, 1]) part('neck', box(0.06, 0.16, 0.16), 0x4a2a5a, sx * 0.15, 0.1, -0.04);
  part('head', box(0.05, 0.05, 0.03), 0xc080ff, 0, 0.36, 0.1, { glow: 3 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part('head', box(0.03, 0.08, 0.03), thorn, Math.sin(a) * 0.14, 0.3, Math.cos(a) * 0.14, { rz: Math.sin(a) * 0.6, rx: Math.cos(a) * 0.6 }); }
  // gold epaulettes with fringes, a sash, and a parrying dagger in the left hand
  for (const side of ['L', 'R']) {
    part('sh' + side, box(0.16, 0.04, 0.16), gold, 0, 0.05, 0);
    for (let i = -1; i <= 1; i++) part('sh' + side, box(0.02, 0.07, 0.02), gold, i * 0.05, -0.0, 0.08);
  }
  part('chest', box(0.06, 0.42, 0.03), gold, 0, 0.1, 0.13, { rz: 0.6 });
  part('haL', box(0.12, 0.03, 0.03), gold, 0, -0.05, 0.02);
  part('haL', box(0.03, 0.02, 0.42), 0xe8e0f0, 0, -0.05, 0.24, { emissive: 0x302048, ei: 2 });
}

// ------------------------------------------------------------------ stats
export const BOSSES2 = {
  harbormaster: {
    name: 'The Harbormaster', title: 'Who Drags the Drowned Ashore', hp: 4300, poise: 999, speed: 2.7, r: 0.85, mass: 9, scale: 1.85, boss: true,
    look: { weapon: 'none', eyes: 0x60f0e0, hat: 'brim', bulk: 1.5, skirt: 0x1c2a2e, colors: { skin: 0x4e605c, tunic: 0x22323a, pants: 0x1a262a, boots: 0x0e1416, hat: 0x121a1e, glove: 0x34443e, shoulder: 0x2c3c40, belt: 0x3a2e1e }, extra: harborExtra },
  },
  ossuary: {
    name: 'The Ossuary Knight', title: 'Keeper of Ten Thousand Names', hp: 5600, poise: 999, speed: 3.0, r: 0.75, mass: 8, scale: 1.75, boss: true,
    look: { weapon: 'greatsword', blade: 0xe0d8c4, guard: 0x8a7a5a, eyes: 0xfff0a0, horns: 0xe8e0cc, mask: 0xd8d0bc, bulk: 1.3, cloak: true, cloakLen: [0.34, 0.34, 0.3], colors: { skin: 0xd8d0bc, tunic: 0x4a4038, pants: 0x3a322c, boots: 0xb8b0a0, shoulder: 0xe0d8c8, glove: 0xc8c0ac, belt: 0x5a4a3a, cloak: 0x3a342c, cloakDark: 0x2a2620 }, extra: ossuaryExtra },
  },
  founder: {
    name: 'The Bellfounder', title: 'Who Poured the Silent Bell', hp: 6600, poise: 999, speed: 2.3, r: 0.95, mass: 10, scale: 2.0, boss: true,
    look: { weapon: 'bell', eyes: 0xffa020, mask: 0x7a4a1c, bulk: 1.65, skirt: 0x3a2414, colors: { skin: 0x9a6a30, tunic: 0x6a4420, pants: 0x4a2e14, boots: 0x2a1a0c, belt: 0x3a2a14, glove: 0x5a3a1a, shoulder: 0xa87a3a }, extra: founderExtra },
  },
  regent: {
    name: 'The Pale Regent', title: 'Who Sold the Dawn', hp: 6800, poise: 999, speed: 3.8, r: 0.65, mass: 7, scale: 1.6, boss: true,
    look: { weapon: 'saber', blade: 0xf4ecff, bladeGlow: 0x403070, guard: 0xd8c070, eyes: 0xc8a8ff, crown: 0xe0c870, crownGlow: true, cloak: true, cloakLen: [0.42, 0.42, 0.4], longHair: true, colors: { skin: 0xe0d8e4, hair: 0xf0ecf4, tunic: 0x3a2a4a, pants: 0x2a1e36, boots: 0x140e1a, cloak: 0x5a2a6a, cloakDark: 0x341a40, glove: 0xe8e0ec, shoulder: 0x5a3a6a, belt: 0xd8c070, trim: 0xd8c070 }, extra: regentExtra },
  },
};

// ------------------------------------------------------------------ the Harbormaster (District III, the docks)
// A drowned giant with a boat-hook and an anchor. Throws the hook down a line and drags you in for an
// anchor blow; slams the anchor (a ring of water); harpoon volleys; grave hounds. Below half: the tide,
// rings of water rolling out one after another, and the hook comes faster.
const harborReel = (p) => strike({ name: 'reel', anim: 'slam', shape: 'circle', offset: 1.5, radius: 2.1, windup: 0.75, active: 0.85, dur: 1.5, dmg: 24, lunge: 0.6, tele: 'circle', onStrike: (w, e) => { ringAt(w, e, e.x + Math.sin(e.face) * 1.5, e.z + Math.cos(e.face) * 1.5, p >= 2 ? 8 : 6, { warn: 0, life: 0.9, dmg: 12, kind: 'water' }); } });
const HOOK = { range: 10.5, width: 1.1 };
const harpoons = (p) => ({ name: 'harpoons', anim: 'aim', dur: 1.3, windup: 0.8, active: 0.82, tele: 'ray', teleRange: 14, ranged: { kind: 'bolt', speed: 15, r: 0.22, dmg: 13, life: 1.3, fan: p >= 2 ? 5 : 3, spread: deg(13) } });
const harbormaster = {
  phases: [0.5], keep: 2.8, turn: 3.6,
  moves(p) {
    const m = [
      { id: 'sweep', w: 2.6, max: 3.9, a: strike({ name: 'sweep', anim: 'sweep', range: 3.9, arc: deg(200), windup: 0.72, active: 0.86, dur: 1.4, dmg: 22, lunge: 1.4 }) },
      { id: 'anchor', w: 2.2, max: 4.2, a: strike({ name: 'anchor', anim: 'slam', shape: 'circle', offset: 1.6, radius: 2.2, windup: 0.9, active: 1.0, dur: 1.7, dmg: 26, lunge: 0.8, tele: 'circle', onStrike: (w, e) => { const x = e.x + Math.sin(e.face) * 1.6, z = e.z + Math.cos(e.face) * 1.6; ringAt(w, e, x, z, 8, { warn: 0, life: 1.0, dmg: 14, kind: 'water' }); if (p >= 2) ringAt(w, e, x, z, 9, { warn: 0.55, life: 1.1, dmg: 14, kind: 'water' }); } }) },
      // the hook: a long line; caught, you are hauled in and the anchor comes down where you land
      { id: 'hook', w: p >= 2 ? 2.4 : 1.8, min: 3, max: HOOK.range - 0.5, cd: p >= 2 ? 3.5 : 5, a: { name: 'hook', anim: 'fthrust', shape: 'line', range: HOOK.range, width: HOOK.width, windup: p >= 2 ? 0.75 : 0.85, active: p >= 2 ? 0.8 : 0.9, dur: 1.25, dmg: 0, lunge: 0, tele: 'line', turn: 3, heavy: true, onStrike: (w, e) => {
        const hero = w.hero; const caught = hero && !hero.dead && w._inShape(e, { shape: 'line', ...HOOK }, hero) && w.clear(e, hero);
        const hit = caught && w._damage(e, hero, 12 * e.dmgMul, { kb: 0.01, heavy: true }) === true;
        // the view can draw the hook flying out (to the hero when it bites)
        w.emit('hook', { e, x: hit ? hero.x : e.x + Math.sin(e.face) * HOOK.range, z: hit ? hero.z : e.z + Math.cos(e.face) * HOOK.range, hit });
        if (!hit) return;
        // haul: a knockback toward him that stops about a stride in front (knockback decays ~5.5x per second)
        const a = angTo(hero, e); const d = Math.max(0, dist(hero, e) - e.r - hero.r - 1.1); const kb = d * 5.5;
        hero.kbx = Math.sin(a) * kb; hero.kbz = Math.cos(a) * kb;
        w.foeAttack(e, harborReel(p));
      } } },
      { id: 'harpoons', w: 1.6, min: 4, cd: 4, a: harpoons(p) },
      { id: 'hounds', w: 0.9, cd: 24, run: (w, e) => {
        // not in the opening seconds: the first pick only starts the clock and he throws harpoons instead
        if (!e.ai.houndClock) { e.ai.houndClock = true; e.ai.cd_hounds = w.t + 12; return w.foeAttack(e, harpoons(p)); }
        if (countOf(w, 'hound') < 2 && adds(w, e) < 4) summon(w, e, 'hound', 2, 2, 4); roarPause(e);
      } },
    ];
    if (p >= 2) m.push({ id: 'tide', w: 1.5, cd: 8, a: { name: 'tide', anim: 'slam', dur: 2.0, windup: 0.9, active: 0.92, tele: 'circle', shape: 'circle', radius: 2.0, offset: 0, dmg: 20, kb: 8, heavy: true, onStrike: (w, e) => { for (let i = 0; i < 3; i++) ringAt(w, e, e.x, e.z, 12, { warn: i * 0.75, life: 1.7, dmg: 15, kind: 'water' }); } } });
    return m;
  },
  onPhase(w, e) { if (adds(w, e) < 4) summon(w, e, 'hound', 2, 2, 5); e.speed *= 1.15; },
};

// ------------------------------------------------------------------ the Ossuary Knight (District V, the undercroft)
// Bone greatsword combos; rows of bone spikes erupting from him toward you; a leap. Below two thirds a
// bone shield (absorbs damage first; it regrows) and plague rats. Below a third: faster, three-blow
// combos, spikes in a fan of three rows, the hushed rise.
const ossuary = {
  phases: [0.66, 0.33], keep: 2.6, turn: 3.8,
  moves(p) {
    const fast = p >= 3 ? 0.85 : 1;
    const base = strike({ name: 'combo', anim: 'fslash', range: 3.4, arc: deg(150), windup: 0.62, active: 0.74, dur: p >= 3 ? 2.5 : 1.95, dmg: 21, lunge: 3, chain: { at: 0.98, windup: 1.38, active: 1.5, lunge: 4 } });
    const m = [
      { id: 'combo', w: 3, max: 3.4, a: p >= 3 ? combo(base, [{ at: 0.98, windup: 1.38, active: 1.5, lunge: 4 }, { at: 1.75, windup: 2.12, active: 2.24, lunge: 5 }]) : base },
      // overhead cleave: a line, and the bones keep breaking the floor beyond its end
      { id: 'cleave', w: 2, max: 3.8, a: quick(strike({ name: 'cleave', anim: 'slam', shape: 'line', range: 4.2, width: 1.5, windup: 0.85, active: 0.95, dur: 1.55, dmg: 28, lunge: 1, tele: 'line', onStrike: (w, e) => row(w, e, e.x, e.z, e.face, { start: 5.2, n: 4, step: 1.2, warn: 0.3, gap: 0.12, r: 0.85, dmg: 18, kind: 'bone' }) }), fast) },
      // the sword driven into the stones: a row of spikes runs at you (a fan of three rows later)
      { id: 'spikes', w: 2.2, min: 3.2, cd: p >= 3 ? 3.5 : 4.5, a: quick({ name: 'spikes', anim: 'slam', dur: 1.5, windup: 0.75, active: 0.8, shape: 'circle', radius: 1.0, offset: 1.4, dmg: 14, kb: 5, tele: 'circle', heavy: true, onStrike: (w, e) => {
        const a0 = angTo(e, w.hero); const rows = p >= 3 ? [-0.38, 0, 0.38] : (p >= 2 ? [-0.2, 0.2] : [0]);
        for (const off of rows) row(w, e, e.x, e.z, a0 + off, { start: 1.6, n: 10, step: 1.25, warn: 0.45, gap: 0.075, r: 0.9, dmg: 19, kind: 'bone' });
      } }, fast) },
      { id: 'leap', w: 1.5, min: 5, cd: 7, a: { name: 'leap', anim: 'leap', dur: 1.9, windup: 0.75, active: 1.3, leap: true, shape: 'circle', offset: 0, radius: 2.6, dmg: 28, kb: 9, tele: 'circleAt', heavy: true, onStrike: (w, e) => ringAt(w, e, e.x, e.z, 7, { warn: 0, life: 0.9, dmg: 14, kind: 'bone' }) } },
    ];
    if (p >= 2) {
      m.push({ id: 'ossify', w: 1.2, cd: 16, run: (w, e) => { if (!(e.shield > 0)) { e.shield = Math.round(e.maxHp * 0.07); w.emit('shield', { e }); } roarPause(e); } });
      m.push({ id: 'rats', w: 0.9, cd: 18, run: (w, e) => { if (countOf(w, 'rat') < 4 && adds(w, e) < 5) summon(w, e, 'rat', 3, 3, 3.5); roarPause(e); } });
    }
    return m;
  },
  onPhase(w, e, p) {
    if (p === 2) { e.shield = Math.round(e.maxHp * 0.1); w.emit('shield', { e }); if (adds(w, e) < 4) summon(w, e, 'rat', 4, 3, 4); }
    if (p === 3) { e.speed *= 1.25; if (adds(w, e) < 4) summon(w, e, 'hushed', 2, 3, 5); }
  },
};

// ------------------------------------------------------------------ the Bellfounder (District VI, the foundry)
// A bronze giant swinging a bell: huge slow sweeps, tolls that ring outward, molten pours that leave
// pools burning for seconds, the bell thrown in a high arc. Below two thirds he calls the foundry's
// sentinels and bombers; below a third molten lines run across the floor.
function throwBell(w, e, p) {
  const hero = w.hero; if (!hero) return;
  const T = 1.15; const a = angTo(e, hero); const d = Math.max(2, dist(e, hero));
  const tx = hero.x, tz = hero.z;
  w.projs.push({ id: w.nextId++, kind: 'flame', team: 'foe', x: e.x + Math.sin(a) * 1.2, z: e.z + Math.cos(a) * 1.2, y: 1.6, vx: Math.sin(a) * d / T, vz: Math.cos(a) * d / T, r: 0.6, dmg: 0, life: T, lob: T, lobT: 0, homing: 0, src: e, face: a, hitSet: new Set(), tx, tz });
  circleAt(w, e, tx, tz, 2.5, { warn: T, life: 0.25, dmg: 28, kind: 'toll', kb: 9 });
  ringAt(w, e, tx, tz, p >= 2 ? 8 : 6, { r0: 2.5, warn: T, life: 0.9, dmg: 13, kind: 'toll' });
  w.emit('fire', { e, kind: 'bell' });
}
const founder = {
  phases: [0.66, 0.33], keep: 3.2, turn: 2.8,
  moves(p) {
    const m = [
      { id: 'sweep', w: 3, max: 4.4, a: strike({ name: 'sweep', anim: 'sweep', range: 4.6, arc: deg(250), windup: 1.0, active: 1.18, dur: 1.9, dmg: 30, kb: 9, lunge: 1.0 }) },
      { id: 'toll', w: 2.2, max: 4.8, a: strike({ name: 'toll', anim: 'slam', shape: 'circle', offset: 1.9, radius: 2.5, windup: 1.0, active: 1.1, dur: 1.9, dmg: 32, kb: 9, lunge: 0.6, tele: 'circle', onStrike: (w, e) => { const x = e.x + Math.sin(e.face) * 1.9, z = e.z + Math.cos(e.face) * 1.9; ringAt(w, e, x, z, 10, { warn: 0, life: 1.3, dmg: 16, kind: 'toll' }); if (p >= 2) ringAt(w, e, x, z, 10, { warn: 0.65, life: 1.3, dmg: 16, kind: 'toll' }); } }) },
      // molten bronze tipped over you: pools that keep burning
      { id: 'pour', w: 2, cd: 5.5, a: { name: 'pour', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'circle', shape: 'circle', radius: 1.2, offset: 0, dmg: 0, heavy: true, onStrike: (w, e) => {
        const hero = w.hero; const n = p >= 2 ? 4 : 3;
        for (let i = 0; i < n; i++) { const a = w.rand() * Math.PI * 2, r = i ? 1.6 + w.rand() * 2.4 : 0; const x = hero.x + Math.sin(a) * r, z = hero.z + Math.cos(a) * r; if (free(w, x, z, 0)) circleAt(w, e, x, z, 1.6, { warn: 0.95 + i * 0.22, life: 6, dmg: 16, kind: 'fire', kb: 3 }); }
      } } },
      { id: 'bell', w: 1.7, min: 4.5, cd: 6, a: { name: 'bell', anim: 'sweep', dur: 1.6, windup: 0.85, active: 0.9, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => throwBell(w, e, p) } },
    ];
    if (p >= 2) m.push({ id: 'forge', w: 0.9, cd: 22, run: (w, e) => { if (adds(w, e) < 3) { if (countOf(w, 'sentinel') < 1) summon(w, e, 'sentinel', 1, 1, 5); else summon(w, e, 'bomber', 2, 4, 6); } roarPause(e); } });
    if (p >= 3) m.push({ id: 'molten', w: 1.6, cd: 7, a: { name: 'molten', anim: 'roar', dur: 1.9, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 1.6, offset: 0, dmg: 0, heavy: true, onStrike: (w, e) => {
      const hero = w.hero; const a = w.rand() * Math.PI;
      moltenLine(w, e, hero.x, hero.z, a, { warn: 0.8, sweep: 0.7, life: 4.5, dmg: 18 });
      moltenLine(w, e, hero.x + Math.sin(a) * 4, hero.z + Math.cos(a) * 4, a + Math.PI / 2, { warn: 1.1, sweep: 0.7, life: 4.5, dmg: 18 });
    } } });
    return m;
  },
  onPhase(w, e, p) {
    if (p === 2 && adds(w, e) < 3) summon(w, e, 'bomber', 2, 4, 6);
    if (p === 3) { e.speed *= 1.15; if (adds(w, e) < 3) summon(w, e, 'sentinel', 1, 1, 5); }
  },
};

// ------------------------------------------------------------------ the Pale Regent (District VII, the heights)
// A fast duellist. Dash-thrusts across the floor, quick three-step flurries, a crown of thorns that closes
// round you, and he vanishes to come back behind you. Below two thirds two shades join him; below a
// third he is relentless: shorter windups, more vanishing, four-step flurries.
const regent = {
  phases: [0.66, 0.33], keep: 2.4, turn: 5,
  moves(p) {
    const k = p >= 3 ? 0.82 : 1;
    const flurry = (n) => combo(strike({ name: 'flurry', anim: 'fslash', range: 2.9, arc: deg(130), windup: 0.5, active: 0.6, dur: n > 3 ? 2.7 : 2.2, dmg: 16, lunge: 3.5 }),
      [{ at: 0.8, windup: 1.12, active: 1.22, lunge: 4 }, { at: 1.42, windup: 1.74, active: 1.86, lunge: 5 }, ...(n > 3 ? [{ at: 2.02, windup: 2.32, active: 2.44, lunge: 6 }] : [])]);
    const m = [
      // dash-thrust: a long telegraphed lane; he stops when he reaches you
      { id: 'thrust', w: 2.6, min: 2.8, max: 11, cd: p >= 3 ? 1.6 : 2.6, a: quick({ name: 'thrust', anim: 'fthrust', shape: 'line', range: 1.9, width: 1.3, windup: 0.66, active: 1.04, dur: 1.45, dmg: 25, kb: 7, lunge: 17, lungeT: [0.66, 0.98], tele: 'line', teleRange: 7.6, turn: 6, heavy: true }, k) },
      { id: 'flurry', w: 3, max: 3.1, a: flurry(p >= 3 ? 4 : 3) },
      // a crown of thorns closes round you, then the ground inside it breaks
      { id: 'crown', w: 1.3, max: 12, cd: p >= 3 ? 6 : 8, a: { name: 'crown', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'circle', shape: 'circle', radius: 1.4, offset: 0, dmg: 0, heavy: true, onStrike: (w, e) => {
        const h = w.hero; const n = 10, R = 3.1;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = h.x + Math.sin(a) * R, z = h.z + Math.cos(a) * R; if (free(w, x, z, 0)) circleAt(w, e, x, z, 0.8, { warn: 0.7, life: 0.3, dmg: 16, kind: 'bone', kb: 4 }); }
        circleAt(w, e, h.x, h.z, 2.5, { warn: 1.25, life: 0.3, dmg: 24, kind: 'toll', kb: 8 });
      } } },
      { id: 'vanish', w: p >= 3 ? 1.8 : 1, min: 1.5, cd: p >= 3 ? 6 : 10, run: (w, e) => { e.hidden = true; e.iframes = 9; e.ai.hideT = p >= 3 ? 0.9 : 1.3; e.tele = null; e.mx = e.mz = 0; w.emit('vanish', { e }); } },
    ];
    if (p >= 2) m.push({ id: 'shades', w: 0.8, cd: 20, run: (w, e) => { if (countOf(w, 'shade') < 2 && adds(w, e) < 4) summon(w, e, 'shade', 2, 5, 4); roarPause(e); } });
    return m;
  },
  // he comes back behind you (or to your side), only where nothing stands between you
  hiddenThink(w, e, h) {
    e.ai.hideT -= h; e.anim = 'idle'; e.mx = 0; e.mz = 0;
    if (e.ai.hideT > 0) return;
    const hero = w.hero;
    for (const off of [Math.PI, Math.PI * 0.7, -Math.PI * 0.7, Math.PI / 2, -Math.PI / 2, 0]) {
      const a = hero.face + off; const x = hero.x + Math.sin(a) * 2.5, z = hero.z + Math.cos(a) * 2.5;
      if (free(w, x, z, e.r) && w.clear(hero, { x, z })) { e.x = x; e.z = z; break; }
    }
    e.hidden = false; e.iframes = 0; e.face = angTo(e, hero); w.emit('appear', { e });
    const fast = e.phase >= 3;
    w.foeAttack(e, strike({ name: 'ambush', anim: 'fslash', range: 3.1, arc: deg(150), windup: fast ? 0.52 : 0.6, active: fast ? 0.62 : 0.7, dur: fast ? 1.7 : 1.25, dmg: 24, lunge: 3, ...(fast ? { chain: { at: 0.95, windup: 1.3, active: 1.42, lunge: 5 } } : {}) }));
  },
  onPhase(w, e, p) {
    if (p === 2 && adds(w, e) < 4) summon(w, e, 'shade', 2, 5, 4);
    if (p === 3) { e.speed *= 1.2; e.ai.cd = 0.3; }
  },
};

export const BOSS_AI2 = { harbormaster, ossuary, founder, regent };
export const _helpers = { row, moltenLine, combo, quick, hpFrac };
