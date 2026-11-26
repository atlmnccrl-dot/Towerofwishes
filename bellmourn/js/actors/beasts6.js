// The bodies of Act V, the God's Dream (game/units5.js, game/bosses7.js): a thought of the god (a floating eye
// of light with a ring of rays and a lid of gold), the nightmare hound (a hound of shadow with too many eyes,
// smoke streaming off it), the unrisen dawn (a child-shaped knot of light with a crown of rays), and the First
// Founder (a rig, as the Pyre Saint is: a bronze giant of a man with a casting hammer and moulds on his back,
// who cracks open stage by stage). The same surface as every beast (root, flash, updateCloak, tip, handWorld,
// tipWorld, parts, animate(e, t, dt)); the same building blocks as beasts2.js and beasts4.js.
//
// PROPOSAL: every look described here.
import * as THREE from '../../vendor/three.module.min.js';
import { Beast, clamp01, ease, glowMat } from './beasts2.js';
import { Rig, mat } from './rig.js';
import { poseFor, mix } from './anims.js';

const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;
const atkPh = (e, t, d) => { const a = e.atk || d; const w = a.windup, ac = a.active, du = a.dur; if (t < w) return { part: 'windup', k: clamp01(t / w) }; if (t < ac) return { part: 'strike', k: clamp01((t - w) / Math.max(0.01, ac - w)) }; return { part: 'recover', k: clamp01((t - ac) / Math.max(0.01, du - ac)) }; };

// ------------------------------------------------------------------ a thought of the god: an eye of light
// A great white eye with an amber iris, a lid of gold above and below that blinks, a ring of rays turning round
// it, and motes of light trailing under it. It looks where it means to strike.
class Thought extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.6;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('eye', 'base', 0, 0, 0);
    this.part('eye', 0.42, 0.42, 0.34, Cc.white, 0, 0, 0, { glow: 1.25 });
    this.part('eye', 0.24, 0.24, 0.04, Cc.iris, 0, 0, 0.17, { glow: 2.2 });
    this.pupil = this.part('eye', 0.11, 0.13, 0.03, Cc.pupil, 0, 0, 0.195);
    this.lids = [this.part('eye', 0.48, 0.1, 0.4, Cc.lid, 0, 0.22, 0), this.part('eye', 0.48, 0.1, 0.4, Cc.lid, 0, -0.22, 0)];
    this.rays = this.joint('rays', 'base', 0, 0, -0.05);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; this.part('rays', 0.05, i % 2 ? 0.18 : 0.3, 0.03, Cc.ray, S(a) * (i % 2 ? 0.38 : 0.44), C(a) * (i % 2 ? 0.38 : 0.44), 0, { glow: 2.4, rz: -a }); }
    this.motes = this.joint('motes', 'base', 0, -0.35, 0);
    for (let i = 0; i < 4; i++) this.part('motes', 0.05, 0.05, 0.05, Cc.ray, (i - 1.5) * 0.07, -i * 0.15, 0, { glow: 2.2 });
    this.j.eye.add(this.hand); this.j.eye.add(this.tip); this.tip.position.set(0, 0, 0.3);
    this.blinkT = 2 + Math.random() * 3;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; let pose, rate = 8, open = 1, s = 1, spin = 0.6;
    const float = { lift: S(tm * 1.9) * 0.12, roll: S(tm * 1.3) * 0.06 };
    if (anim === 'gaze') { const ph = this.atkPhase(e, t, e.atk || { windup: 0.85, active: 0.87, dur: 1.35 }); pose = { ...float, pitch: -0.1 }; open = ph.part === 'windup' ? 0.6 + ph.k * 0.5 : 1.15; spin = ph.part === 'windup' ? 3 : 1.5; s = ph.part === 'windup' ? 1 + ph.k * 0.12 : 1.1; }
    else if (anim === 'pulse') { const ph = this.atkPhase(e, t, { windup: 0.6, active: 0.62, dur: 1.3 }); pose = { ...float, lift: ph.part === 'windup' ? 0.2 * ph.k : 0 }; spin = 4; s = ph.part === 'windup' ? 1 + ph.k * 0.2 : 0.95; }
    else if (anim === 'hurt') { pose = { ...float, roll: S(t * 30) * 0.4 }; open = 0.3; rate = 30; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.6, pitch: 0.6 }; open = 0.2; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.45); pose = { ...float, lift: -0.8 * k }; open = 1 - k; s = Math.max(0.01, 1 - k * 0.9); }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: -1 + k }; s = k; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.blinkT -= dt; if (this.blinkT < 0) { if (this.blinkT < -0.14) this.blinkT = 2 + Math.random() * 3; open *= 0.15; }
    this.lids[0].position.y = 0.06 + 0.16 * open; this.lids[1].position.y = -0.06 - 0.16 * open;
    this.j.eye.scale.setScalar(s); this.j.rays.rotation.z += dt * spin; this.motes.rotation.y = tm * 2;
    this.pupil.scale.y = anim === 'gaze' ? 0.5 : 1;
  }
}

// ------------------------------------------------------------------ the nightmare hound: a hound of shadow
// Long and low, black as a hole, a ridge of smoke streaming back off its spine, a mouth that opens too far,
// and eyes all down its face (six, red). Sunk into its shadow it is gone; it comes up out of the dark mouth-first.
class Nightmare extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.62;
    this.joint('base', null, 0, this.baseY, 0);
    this.part('base', 0.3, 0.32, 0.36, Cc.fur, 0, 0.04, 0.22); this.part('base', 0.22, 0.2, 0.42, Cc.dark, 0, 0.06, -0.08); this.part('base', 0.26, 0.24, 0.24, Cc.fur, 0, 0.03, -0.32);
    this.smoke = [];
    for (let i = 0; i < 6; i++) this.smoke.push(this.part('base', 0.08, 0.14 + (i % 2) * 0.06, 0.08, Cc.smoke, 0, 0.24, 0.3 - i * 0.12, { glow: 0.7 }));
    this.joint('neck', 'base', 0, 0.12, 0.38); this.part('neck', 0.15, 0.15, 0.28, Cc.fur, 0, 0.07, 0.08, { rx: -0.7 });
    this.joint('head', 'neck', 0, 0.18, 0.17);
    this.part('head', 0.22, 0.17, 0.24, Cc.fur, 0, 0, 0.03); this.part('head', 0.13, 0.09, 0.22, Cc.fur, 0, -0.03, 0.24);
    this.part('head', 0.15, 0.03, 0.2, Cc.mouth, 0, -0.07, 0.22, { glow: 1.2 });
    for (const [x, y, z] of [[0.07, 0.05, 0.14], [-0.07, 0.05, 0.14], [0.09, 0.0, 0.2], [-0.09, 0.0, 0.2], [0.05, 0.08, 0.06], [-0.05, 0.08, 0.06]]) this.part('head', 0.04, 0.035, 0.03, look.eyes, x, y, z, { glow: 6 });
    for (const sx of [-1, 1]) this.part('head', 0.05, 0.16, 0.05, Cc.dark, sx * 0.07, 0.14, -0.05, { rz: -sx * 0.3, rx: -0.4 });
    this.joint('jaw', 'head', 0, -0.08, 0.1); this.part('jaw', 0.11, 0.04, 0.24, Cc.fur, 0, -0.02, 0.12);
    for (let i = 0; i < 4; i++) this.part('jaw', 0.02, 0.05, 0.02, Cc.teeth, (i % 2 ? 1 : -1) * 0.04, 0.02, 0.06 + i * 0.05);
    this.j.head.add(this.hand); this.hand.position.set(0, -0.03, 0.1); this.j.head.add(this.tip); this.tip.position.set(0, -0.04, 0.38);
    let parent = 'base';
    for (let i = 0; i < 4; i++) { this.joint('tail' + i, parent, 0, i ? 0 : 0.1, i ? -0.16 : -0.44); this.part('tail' + i, 0.07 * (1 - i * 0.18), 0.07 * (1 - i * 0.18), 0.16, i > 1 ? Cc.smoke : Cc.fur, 0, 0, -0.08, i > 1 ? { glow: 0.7 } : {}); parent = 'tail' + i; }
    const legH = 0.27;
    for (const [n, x, z] of [['lf', 1, 1], ['rf', -1, 1], ['lb', 1, -1], ['rb', -1, -1]]) {
      this.joint(n, 'base', x * 0.12, -0.06, z * 0.3); this.part(n, 0.08, legH + 0.04, 0.11, Cc.fur, 0, -legH / 2, 0);
      this.joint(n + 'k', n, 0, -legH, 0); this.part(n + 'k', 0.06, legH, 0.06, Cc.dark, 0, -legH / 2, 0); this.part(n + 'k', 0.09, 0.04, 0.14, Cc.dark, 0, -legH, 0.03);
    }
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim; let pose, rate = 14;
    const gait = (f, amp) => ({ lf: [S(tm * f) * amp, 0, 0], rb: [S(tm * f) * amp, 0, 0], rf: [-S(tm * f) * amp, 0, 0], lb: [-S(tm * f) * amp, 0, 0], lfk: [Math.max(0, -S(tm * f)) * amp, 0, 0], rbk: [Math.max(0, -S(tm * f)) * amp, 0, 0], rfk: [Math.max(0, S(tm * f)) * amp, 0, 0], lbk: [Math.max(0, S(tm * f)) * amp, 0, 0] });
    const tail = { tail0: [0.3, S(tm * 4) * 0.3, 0], tail1: [0.1, S(tm * 4 - 1) * 0.4, 0], tail2: [0, S(tm * 4 - 2) * 0.5, 0], tail3: [0, S(tm * 4 - 3) * 0.5, 0] };
    const walk = { ...gait(6 + sp * 2, Math.min(0.9, 0.2 + sp * 0.12)), ...tail, neck: [0.2, 0, 0], head: [-0.1, 0, 0], lift: Math.abs(S(tm * (6 + sp * 2))) * 0.03 };
    if (anim === 'idle' || anim === 'walk' || anim === 'run' || anim === 'stalk') pose = walk;
    else if (anim === 'bite') { const ph = this.atkPhase(e, t, { windup: 0.4, active: 0.52, dur: 0.85 }); pose = ph.part === 'windup' ? { ...walk, neck: [-0.3 * ph.k, 0, 0], jaw: [0.7 * ph.k, 0, 0], pitch: -0.15 * ph.k } : { ...walk, neck: [0.5, 0, 0], jaw: [0.05, 0, 0], pitch: 0.2 }; rate = 26; }
    else if (anim === 'pounce') { const ph = this.atkPhase(e, t, e.atk || { windup: 0.6, active: 1.0, dur: 1.3 }); pose = ph.part === 'windup' ? { ...tail, lf: [-0.6, 0, 0], rf: [-0.6, 0, 0], lb: [0.8, 0, 0], rb: [0.8, 0, 0], lift: -0.15 * ph.k, pitch: 0.2 * ph.k, jaw: [0.5, 0, 0] } : { ...tail, lf: [-1.2, 0, 0], rf: [-1.2, 0, 0], lb: [1.0, 0, 0], rb: [1.0, 0, 0], jaw: [0.9, 0, 0], lift: 0.25, pitch: -0.2 }; rate = 24; }
    else if (anim === 'hurt') { pose = { ...walk, roll: S(t * 30) * 0.35 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...walk, roll: 1.2, lift: -0.3 }; rate = 10; }
    else if (anim === 'die' || anim === 'dieHard') { const k = ease(clamp01(t / 0.5)); pose = { ...tail, roll: 1.6 * k, lift: -0.4 * k }; rate = 12; }
    else if (anim === 'rise') pose = { ...walk, lift: -0.6 * (1 - clamp01(t / 0.9)) };
    else pose = walk;
    this.pose(pose, dt, rate);
    this.smoke.forEach((m, i) => { m.scale.y = 0.7 + 0.6 * Math.abs(S(tm * 7 + i * 1.3)); m.position.y = 0.24 + Math.abs(S(tm * 5 + i)) * 0.06; });
  }
}

// ------------------------------------------------------------------ the unrisen dawn: a child of light
// A small figure of white light, no face but a darker hollow, a crown of rays, a rose-coloured glow at its
// heart and a tail of light where its legs should be. It swells before it flares.
class Dawnling extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.0;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('core', 'base', 0, 0, 0);
    this.part('core', 0.26, 0.34, 0.2, Cc.core, 0, 0, 0, { glow: 1.6 });
    this.part('core', 0.1, 0.1, 0.05, Cc.rose, 0, 0.02, 0.1, { glow: 2.6 });
    this.joint('head', 'core', 0, 0.28, 0); this.part('head', 0.2, 0.2, 0.18, Cc.core, 0, 0, 0, { glow: 1.6 }); this.part('head', 0.12, 0.1, 0.02, Cc.dark, 0, 0, 0.095);
    this.crown = this.joint('crown', 'head', 0, 0.06, -0.04);
    for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * Math.PI * 1.2; this.part('crown', 0.04, 0.16 + (i % 2) * 0.08, 0.02, Cc.ray, S(a) * 0.17, 0.08 + C(a) * 0.14, 0, { glow: 2.4, rz: -a }); }
    for (const sx of [-1, 1]) { this.joint('arm' + sx, 'core', sx * 0.16, 0.12, 0); this.part('arm' + sx, 0.07, 0.24, 0.07, Cc.core, 0, -0.12, 0, { glow: 1.4 }); }
    this.tail = [];
    for (let i = 0; i < 4; i++) this.tail.push(this.part('core', 0.18 - i * 0.035, 0.12, 0.14 - i * 0.025, Cc.glow, 0, -0.24 - i * 0.12, 0, { glow: 1.8 - i * 0.25 }));
    this.j.core.add(this.hand); this.j.core.add(this.tip); this.tip.position.set(0, 0.1, 0.2);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; let pose, rate = 9, s = 1;
    const float = { lift: S(tm * 2.1) * 0.1, roll: S(tm * 1.5) * 0.08, 'arm1': [0, 0, 0.3 + S(tm * 2) * 0.1], 'arm-1': [0, 0, -0.3 - S(tm * 2) * 0.1] };
    if (anim === 'cast') { const ph = this.atkPhase(e, t, e.atk || { windup: 0.6, active: 0.62, dur: 1.2 }); pose = ph.part === 'windup' ? { ...float, 'arm1': [-2.4 * ph.k, 0, 0.3], 'arm-1': [-2.4 * ph.k, 0, -0.3], lift: 0.15 * ph.k } : { ...float, 'arm1': [-1.4, 0, 0.6], 'arm-1': [-1.4, 0, -0.6] }; s = ph.part === 'windup' ? 1 + 0.15 * ph.k : 1; }
    else if (anim === 'swell') { const k = clamp01(t / 0.85); pose = { ...float, 'arm1': [0, 0, 1.4 * k], 'arm-1': [0, 0, -1.4 * k] }; s = 1 + 0.7 * k + S(tm * 40) * 0.06 * k; }
    else if (anim === 'hurt') { pose = { ...float, roll: S(t * 30) * 0.4 }; s = 0.85; rate = 30; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.5 }; s = 0.8; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.4); pose = float; s = Math.max(0.01, 1 + k * 0.8 - k * k * 1.7); }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: -1 + k }; s = k; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.j.core.scale.setScalar(s); this.crown.rotation.z = S(tm * 1.1) * 0.1;
    this.tail.forEach((m, i) => { m.position.x = S(tm * 3 - i * 0.9) * 0.04 * i; m.scale.x = 0.8 + 0.3 * Math.abs(S(tm * 5 + i)); });
  }
}

// ------------------------------------------------------------------ the First Founder (a rig with poses of its own)
// A Rig whose animate(e, t, dt) chooses the pose: its own clips first, anims.js for the rest (as beasts4.js).
class PosedRig extends Rig {
  constructor(look) { super(look); this.cur = null; this.from = null; this.blend = 1; this.anim = null; this.time = 0; }
  own() { return null; }
  animate(e, t, dt) {
    this.time += dt; const o = this.own(e, t, dt); let p = o ? o.p : poseFor(e, t); const snap = o && o.snap;
    const key = (o && o.key) || e.anim;
    if (key !== this.anim) { this.from = this.cur; this.blend = snap ? 1 : 0; this.anim = key; }
    if (this.blend < 1 && this.from) { this.blend = Math.min(1, this.blend + dt / 0.09); p = mix(this.from, p, this.blend); }
    this.cur = p; this.apply(p); this.after(e, t, dt);
  }
  after() {}
}
const STILL = { hipsY: -0.02, chest: [0, 0, 0], spine: [0, 0, 0], head: [0.1, 0, 0], shL: [0.05, 0, 0.08], elL: [-0.1, 0, 0], shR: [0.05, 0, -0.08], elR: [-0.1, 0, 0], hipL: [0, 0, 0.04], knL: [0, 0, 0], hipR: [0, 0, -0.04], knR: [0, 0, 0] };

// PROPOSAL: the man who cast the bell, a thousand years old and turned to bronze by the god he holds: a giant
// of a bellfounder, bald, a beard of bronze wire, a leather apron scorched black, the casting hammer (a head the
// size of an anvil, its haft a bell's clapper) and two half-moulds of himself strapped to his back. Stage two:
// the bronze cracks and the molten metal shows in the seams; his moulds glow. Stage three: the bronze of his
// chest falls open and the god's light pours out of the cage of his ribs; his beard burns.
class Founder extends PosedRig {
  constructor(look) {
    super({ ...look, weapon: 'none' }); const Cc = look.colors; const hs = look.headSize || 0.25;
    const P = (j, w, h, d, c, x, y, z, o) => this._part(j, new THREE.BoxGeometry(w, h, d), c, x, y, z, o);
    // the beard of bronze wire, the brow, a smith's cap
    for (let i = -2; i <= 2; i++) P('head', 0.05, 0.22 + (2 - Math.abs(i)) * 0.06, 0.05, Cc.beard, i * 0.05, -0.02, hs / 2 + 0.02, { rx: 0.15 });
    P('head', hs + 0.02, 0.05, 0.06, Cc.dark, 0, hs * 0.72, hs / 2); P('head', hs + 0.06, 0.08, hs + 0.06, Cc.cap, 0, hs + 0.02, 0);
    // the apron and the straps
    P('chest', 0.42, 0.5, 0.03, Cc.apron, 0, 0.0, 0.14); P('hips', 0.4, 0.5, 0.03, Cc.apron, 0, -0.26, 0.13);
    for (const sx of [-1, 1]) P('chest', 0.05, 0.42, 0.26, Cc.strap, sx * 0.14, 0.14, 0, { rz: sx * 0.08 });
    // the moulds on his back: two half-shells of himself, banded with iron
    this.moulds = [];
    for (const sx of [-1, 1]) { const m = P('chest', 0.26, 0.62, 0.16, Cc.mould, sx * 0.15, 0.12, -0.22, { rz: sx * 0.12 }); this.moulds.push(m); P('chest', 0.28, 0.05, 0.18, Cc.iron, sx * 0.15, 0.3, -0.22, { rz: sx * 0.12 }); P('chest', 0.28, 0.05, 0.18, Cc.iron, sx * 0.15, -0.08, -0.22, { rz: sx * 0.12 }); }
    // the seams (stage two: molten), the cage of his ribs (stage three: the god's light)
    this.seams = [];
    for (const [j, w, h, x, y, z] of [['chest', 0.02, 0.3, 0.06, 0.12, 0.16], ['chest', 0.02, 0.24, -0.1, 0.1, 0.16], ['head', 0.02, 0.12, 0.05, hs * 0.5, hs / 2 + 0.02], ['elL', 0.02, 0.2, 0, -0.13, 0.08], ['elR', 0.02, 0.2, 0, -0.13, 0.08], ['knL', 0.02, 0.24, 0, -0.18, 0.1], ['knR', 0.02, 0.24, 0, -0.18, 0.1], ['shL', 0.02, 0.2, 0, -0.14, 0.08], ['shR', 0.02, 0.2, 0, -0.14, 0.08]]) {
      const m = P(j, w, h, 0.02, Cc.molten, x, y, z, { glow: 3 }); m.visible = false; this.seams.push(m);
    }
    this.core = new THREE.Group(); this.j.chest.add(this.core); this.core.visible = false;
    this.core.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.05), glowMat(Cc.god, 3.2))); this.core.children[0].position.set(0, 0.12, 0.15);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.04), mat(Cc.dark)); r.position.set(0, 0.0 + i * 0.08, 0.18); this.core.add(r); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.03), glowMat(Cc.god, 2.4)); r.position.set(S(a) * 0.28, 0.12 + C(a) * 0.28, 0.16); r.rotation.z = -a; this.core.add(r); }
    this.flames = [];
    for (let i = -2; i <= 2; i++) { const m = P('head', 0.04, 0.12, 0.04, Cc.molten, i * 0.05, -0.12, hs / 2 + 0.06, { glow: 3 }); m.visible = false; this.flames.push(m); }
    // the casting hammer: a haft like a bell's clapper, a head the size of an anvil, a molten face
    const H = this.weapon; const add = (w, h, d, c, x, y, z, o) => H.add(this._part('haR', new THREE.BoxGeometry(w, h, d), c, x, y, z, o));
    add(0.08, 0.08, 1.5, Cc.iron, 0, 0, 0.5); add(0.14, 0.14, 0.14, Cc.bronze, 0, 0, 0.0); add(0.12, 0.12, 0.1, Cc.bronze, 0, 0, 1.0);
    this.head = add(0.5, 0.42, 0.6, Cc.bronze, 0, 0, 1.4); add(0.54, 0.08, 0.64, Cc.iron, 0, 0.18, 1.4); add(0.54, 0.08, 0.64, Cc.iron, 0, -0.18, 1.4);
    this.face = add(0.44, 0.04, 0.5, Cc.molten, 0, -0.23, 1.4, { glow: 2.2 });
    this.tip.position.set(0, -0.2, 1.5); this.bladeLen = 1.7;
    this.stage = 1;
  }
  own(e, t) {
    const a = e.anim; const br = Math.sin(this.time * 1.2) * 0.03;
    // the casting hammer held overhead in both hands, then brought down
    const UP = { ...STILL, chest: [-0.3, 0, 0], spine: [-0.1, 0, 0], head: [-0.2, 0, 0], shR: [-2.9, 0, -0.2], elR: [-0.3, 0, 0], shL: [-2.7, 0, 0.5], elL: [-0.6, 0, 0], hipL: [-0.3, 0, 0.1], knL: [0.3, 0, 0], hipR: [0.2, 0, -0.1], weapon: [0.6, 0, 0] };
    const DOWN = { ...STILL, hipsY: -0.24, chest: [0.6, 0, 0], spine: [0.3, 0, 0], head: [0.2, 0, 0], shR: [-1.2, 0, -0.1], elR: [-0.1, 0, 0], shL: [-1.1, 0, 0.5], elL: [-0.4, 0, 0], hipL: [-0.8, 0, 0.1], knL: [1.0, 0, 0], hipR: [0.4, 0, -0.15], knR: [0.4, 0, 0], weapon: [0.9, 0, 0] };
    const POUR = { ...STILL, chest: [0.25, 0.3, 0], shL: [-1.6, 0, 0.4], elL: [-0.5, 0, 0], shR: [-1.2, 0, -0.5], elR: [-0.6, 0, 0], head: [0.3, 0.2, 0] };
    const KNEEL = { ...STILL, hipsY: -0.5, chest: [0.4, 0, 0], head: [0.5, 0, 0], hipL: [-1.5, 0, 0.1], knL: [2.4, 0, 0], hipR: [-0.2, 0, -0.1], knR: [1.6, 0, 0], shR: [-0.6, 0, -0.3], elR: [-0.4, 0, 0], shL: [0.2, 0, 0.3], weapon: [1.4, 0, 0] };
    if (a === 'forge' || a === 'smash') { const q = atkPh(e, t, { windup: 0.95, active: 1.05, dur: 2.0 }); return { p: q.part === 'windup' ? mix(STILL, UP, ease(q.k)) : DOWN, snap: q.part === 'strike', key: 'smash' + (q.part === 'windup' ? 0 : 1) }; }
    if (a === 'pour') return { p: { ...POUR, chest: [0.25 + br, 0.3, 0] }, key: 'pour' };
    if (a === 'kneelF') return { p: KNEEL, key: 'kneel' };
    if (a === 'hammerUp') return { p: UP, key: 'up' };
    if (a === 'hammerDown') return { p: DOWN, key: 'down', snap: true };
    if (a === 'idle') return { p: { ...STILL, chest: [0.05 + br, 0, 0], shR: [-0.3, 0, -0.2], elR: [-0.5, 0, 0], weapon: [1.5, 0, 0], hipsY: -0.04 }, key: 'idle' };
    return null;
  }
  after(e, t, dt) {
    const st = e.founderStage || e.phase || 1;
    if (st !== this.stage) { this.stage = st; for (const m of this.seams) m.visible = st >= 2; this.core.visible = st >= 3; for (const m of this.flames) m.visible = st >= 3; }
    const k = 0.75 + 0.25 * Math.sin(this.time * 6);
    for (const m of this.seams) if (m.visible) m.scale.set(1, k, 1);
    if (this.core.visible) this.core.children[0].scale.setScalar(0.9 + 0.2 * Math.sin(this.time * 9));
    for (let i = 0; i < this.flames.length; i++) if (this.flames[i].visible) this.flames[i].scale.y = 0.6 + 0.8 * Math.abs(Math.sin(this.time * 11 + i));
  }
}

// look.rig names one of these; null: not a body of this file
export function makeBeast6(look) {
  switch (look.rig) {
    case 'thought': return new Thought(look);
    case 'nightmare': return new Nightmare(look);
    case 'dawnling': return new Dawnling(look);
    case 'firstfounder': return new Founder(look);
  }
  return null;
}
