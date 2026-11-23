// Bodies that are not people, Act III: the bog leech, the will-o'-wisp, the gear spider, the choir mask
// and the Wheel (the final boss). Same building blocks and rules as beasts2.js (the Beast base, eased
// poses, every beast faces +Z, animate(e, t, dt) poses it from e.anim / e.animT / e.atk). At 16 px per metre
// the parts that say what a thing is (the sucker, the flame, the saws, the singing mouths, the eyes) are big
// and bright. Descriptions: PROPOSAL.
import * as THREE from '../../vendor/three.module.min.js';
import { Beast, clamp01, ease, lerp } from './beasts2.js';

const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;

// ------------------------------------------------------------------ the bog leech: a fat ringed slug with a round sucker of teeth
class Leech extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.14;
    this.joint('base', null, 0, this.baseY, 0);
    this.segs = [];
    let parent = 'base';
    for (let i = 0; i < 4; i++) {
      const n = 'g' + i; this.joint(n, parent, 0, 0, i ? -0.16 : 0.06); parent = n; this.segs.push(n);
      const wd = 0.26 - Math.abs(i - 1) * 0.04;
      this.part(n, wd, 0.2, 0.18, i % 2 ? Cc.dark : Cc.skin, 0, 0.02, -0.08);
      this.part(n, wd * 0.8, 0.04, 0.16, Cc.belly, 0, -0.08, -0.08);
      if (i === 1 || i === 2) this.part(n, 0.05, 0.05, 0.05, Cc.blood, (i === 1 ? 0.07 : -0.06), 0.13, -0.08, { glow: 1.6 }); // glowing blood showing through
    }
    // the head: a sucker ringed with teeth, two little eyes
    this.joint('head', 'base', 0, 0.02, 0.1);
    this.part('head', 0.24, 0.22, 0.12, Cc.skin, 0, 0.02, 0.04);
    this.part('head', 0.16, 0.14, 0.03, Cc.blood, 0, 0.02, 0.105, { glow: 1.3 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; this.part('head', 0.03, 0.03, 0.04, Cc.teeth, S(a) * 0.075, 0.02 + C(a) * 0.065, 0.11); }
    for (const sx of [-1, 1]) this.part('head', 0.035, 0.03, 0.02, look.eyes, sx * 0.08, 0.12, 0.08, { glow: 6 });
    this.j.head.add(this.hand); this.hand.position.set(0, 0.02, 0.1); this.j.head.add(this.tip); this.tip.position.set(0, 0.02, 0.2);
    this.swell = 1;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    const crawl = (amp, f) => { const o = {}; this.segs.forEach((n, i) => { o[n] = [S(tm * f - i * 1.1) * amp, S(tm * f * 0.5 - i) * 0.25, 0]; }); return o; };
    let pose, rate = 14;
    const idle = { ...crawl(0.12 + Math.min(0.35, sp * 0.08), 3 + sp * 2.5), head: [S(tm * 3) * 0.1, 0, 0], lift: 0 };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = idle;
    else if (anim === 'hop') {
      const ph = this.atkPhase(e, t, { windup: 0.55, active: 0.88, dur: 1.1 });
      if (ph.part === 'windup') pose = { ...crawl(0.05, 12), g0: [0.5 * ph.k, 0, 0], g1: [0.5 * ph.k, 0, 0], head: [-0.5 * ph.k, 0, 0], lift: -0.05 * ph.k };
      else if (ph.part === 'strike') { pose = { g0: [-0.3, 0, 0], g1: [-0.2, 0, 0], g2: [-0.2, 0, 0], head: [0.4, 0, 0], pitch: 0.4 }; rate = 30; }
      else pose = idle;
    } else if (anim === 'bite') {
      const ph = this.atkPhase(e, t, { windup: 0.38, active: 0.5, dur: 0.8 });
      pose = ph.part === 'windup' ? { ...idle, head: [-0.6 * ph.k, 0, 0], g0: [0.3, 0, 0] } : { ...idle, head: [0.5, 0, 0], pitch: 0.25 }; rate = 26;
    } else if (anim === 'latch') { pose = { g0: [-1.0, 0, 0], g1: [-0.4 + S(tm * 14) * 0.15, 0, 0], g2: [-0.2, S(tm * 9) * 0.3, 0], g3: [0, S(tm * 9 - 1) * 0.4, 0], head: [0.9, 0, 0], pitch: -0.9 }; rate = 18; }
    else if (anim === 'hurt') { pose = { ...idle, roll: S(t * 30) * 0.4 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...crawl(0.3, 2), roll: 2.6 }; rate = 10; }
    else if (anim === 'die' || anim === 'dieHard') { pose = { ...crawl(0, 1), roll: 3.0 * ease(clamp01(t / 0.4)) }; rate = 12; }
    else if (anim === 'rise') pose = { ...idle, lift: -0.3 * (1 - clamp01(t / 0.9)) };
    else pose = idle;
    this.pose(pose, dt, rate);
    const fed = (e.ai && e.ai.fed) || 0; this.swell += ((1 + fed * 0.7) - this.swell) * Math.min(1, dt * 4);
    for (const n of this.segs.slice(1, 3)) this.j[n].scale.set(this.swell, this.swell, 1);
  }
}

// ------------------------------------------------------------------ the will-o'-wisp: a ghost-flame round a white core, with a face
class Wisp extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.3;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('core', 'base', 0, 0, 0);
    this.part('core', 0.22, 0.22, 0.22, Cc.core, 0, 0, 0, { glow: 2.4 });
    this.flames = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const m = this.part('core', 0.14, 0.26, 0.14, Cc.flame, S(a) * 0.14, 0.06 + (i % 2) * 0.06, C(a) * 0.14, { glow: 1.6 }); this.flames.push(m); }
    this.tipF = this.part('core', 0.1, 0.3, 0.1, Cc.flame, 0, 0.28, 0, { glow: 1.8 });
    // a hollow face in the flame: two eyes and a mouth
    for (const sx of [-1, 1]) this.part('core', 0.05, 0.06, 0.02, look.eyes, sx * 0.05, 0.03, 0.12);
    this.part('core', 0.07, 0.03, 0.02, look.eyes, 0, -0.04, 0.12);
    // motes trailing below
    this.motes = this.joint('motes', 'base', 0, -0.25, 0);
    for (let i = 0; i < 4; i++) this.part('motes', 0.05, 0.05, 0.05, Cc.mote, (i - 1.5) * 0.06, -i * 0.14, 0, { glow: 2 });
    this.j.core.add(this.hand); this.j.core.add(this.tip); this.tip.position.set(0, 0, 0.2);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; let pose, rate = 8, s = 1, flick = 1;
    const float = { lift: S(tm * 2.3) * 0.12, roll: S(tm * 1.7) * 0.1, core: [0, tm * 0.5 % TAU - Math.PI, 0] };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = float;
    else if (anim === 'cast') { const ph = this.atkPhase(e, t, { windup: 0.55, active: 0.57, dur: 1.1 }); pose = { ...float, lift: ph.part === 'windup' ? 0.15 * ph.k : -0.05 }; s = ph.part === 'windup' ? 1 + ph.k * 0.25 : 0.9; flick = 2; }
    else if (anim === 'lure') { pose = { ...float, lift: 0.25 }; s = 1.1 + S(tm * 6) * 0.15; flick = 0.5; }
    else if (anim === 'flare') { pose = { ...float, pitch: 0.6, lift: -0.3 }; s = 1.3; flick = 3; rate = 20; }
    else if (anim === 'swell') { const k = clamp01(t / 0.95); pose = { ...float, lift: -0.4 * k }; s = 1 + k * 1.3 + S(tm * 40) * 0.1 * k; flick = 4; }
    else if (anim === 'hurt') { pose = { ...float, roll: S(t * 30) * 0.4 }; s = 0.8; rate = 30; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.6 }; s = 0.75; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.35); pose = { ...float }; s = Math.max(0.01, 1.6 * (1 - k)); }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: -1 + k }; s = k; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.j.core.scale.setScalar(s); this.motes.scale.setScalar(Math.min(1, s));
    this.flames.forEach((m, i) => { m.scale.y = 0.8 + 0.4 * Math.abs(S(tm * 9 * flick + i * 1.7)); });
    this.tipF.scale.y = 0.7 + 0.5 * Math.abs(S(tm * 7 * flick));
    this.motes.rotation.y = tm * 2;
  }
}

// ------------------------------------------------------------------ the gear spider: a brass gear for a body, steel legs, two saws
class GearSpider extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.5;
    this.joint('base', null, 0, this.baseY, 0);
    // the body: an upright gear (teeth round a hub) with a furnace eye
    this.joint('gear', 'base', 0, 0.06, 0);
    this.part('gear', 0.18, 0.4, 0.4, Cc.brass, 0, 0, 0);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; this.part('gear', 0.16, 0.08, 0.08, Cc.brass, 0, C(a) * 0.24, S(a) * 0.24, { rx: -a }); }
    this.part('gear', 0.2, 0.12, 0.12, Cc.dark, 0, 0, 0);
    this.part('base', 0.08, 0.08, 0.04, Cc.hot, 0, 0.1, 0.22, { glow: 3 });
    for (const sx of [-1, 1]) this.part('base', 0.04, 0.04, 0.03, look.eyes, sx * 0.08, 0.16, 0.2, { glow: 5 });
    // legs: four a side, a hip and a long shin
    this.legs = [];
    for (const sx of [1, -1]) for (let i = 0; i < 4; i++) {
      const z = 0.16 - i * 0.11; const hold = this.fixed('base', sx * 0.1, 0, z, 0, (i - 1.5) * 0.35 * sx, 0);
      const n = 'l' + (sx > 0 ? 'L' : 'R') + i; this.joint(n, hold, 0, 0, 0);
      this.part(n, 0.3, 0.04, 0.04, Cc.steel, sx * 0.15, 0.06, 0, { rz: sx * 0.5 });
      this.joint(n + 'k', n, sx * 0.28, 0.16, 0); this.part(n + 'k', 0.04, 0.5, 0.04, Cc.dark, sx * 0.06, -0.22, 0, { rz: sx * 0.25 });
      this.legs.push({ n, sx, i });
    }
    // two saws on arms in front
    this.saws = [];
    for (const sx of [1, -1]) {
      const n = 'arm' + (sx > 0 ? 'L' : 'R'); this.joint(n, 'base', sx * 0.16, 0.12, 0.18);
      this.part(n, 0.04, 0.04, 0.3, Cc.steel, 0, 0, 0.14);
      const s = this.joint(n + 's', n, 0, 0, 0.32); this.saws.push(s);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.part(n + 's', 0.03, 0.06, 0.1, Cc.blade, 0, C(a) * 0.12, S(a) * 0.12, { rx: -a }); }
      this.part(n + 's', 0.03, 0.16, 0.16, Cc.blade, 0, 0, 0);
    }
    this.j.armL.add(this.hand); this.j.armLs.add(this.tip);
    this.spin = 0;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    const legs = (amp, f, lift = 0) => { const o = {}; for (const L of this.legs) { const ph = tm * f + L.i * 1.6 + (L.sx > 0 ? 0 : Math.PI); o[L.n] = [0, 0, L.sx * (Math.max(0, S(ph)) * amp + lift)]; o[L.n + 'k'] = [0, 0, -L.sx * Math.max(0, S(ph)) * amp * 0.5]; } return o; };
    let pose, rate = 14, sawSpin = 8, gearSpin = sp * 3, curl = 0;
    const walk = { ...legs(Math.min(0.5, 0.15 + sp * 0.08), 8 + sp * 2), armL: [-0.2, 0, 0], armR: [-0.2, 0, 0] };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = walk;
    else if (anim === 'roll') {
      const ph = this.atkPhase(e, t, { windup: 0.75, active: 1.45, dur: 1.75 });
      curl = ph.part === 'recover' ? 1 - ph.k : Math.min(1, ph.part === 'windup' ? ph.k * 1.4 : 1);
      pose = { ...legs(0, 1, 1.2 * curl), armL: [0.8 * curl, 0, 0], armR: [0.8 * curl, 0, 0], lift: -0.2 * curl }; gearSpin = ph.part === 'strike' ? 30 : 6 * curl; rate = 18;
    } else if (anim === 'throw') {
      const ph = this.atkPhase(e, t, { windup: 0.62, active: 0.64, dur: 1.2 });
      pose = ph.part === 'windup' ? { ...walk, armL: [-1.2 * ph.k, 0.6 * ph.k, 0], pitch: -0.15 } : { ...walk, armL: [0.4, -0.4, 0], pitch: 0.1 }; sawSpin = 30; rate = 20;
    } else if (anim === 'slice') {
      const ph = this.atkPhase(e, t, { windup: 0.42, active: 0.56, dur: 0.9 });
      pose = ph.part === 'windup' ? { ...walk, armL: [-0.9, 0.5, 0], armR: [-0.9, -0.5, 0], pitch: -0.2 } : { ...walk, armL: [0.3, -0.5, 0], armR: [0.3, 0.5, 0], pitch: 0.2 }; sawSpin = 40; rate = 28;
    } else if (anim === 'hurt') { pose = { ...walk, roll: S(t * 30) * 0.2 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...legs(0.2, 2, 0.6), lift: -0.25, roll: 0.3 }; sawSpin = 1; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.6); pose = { ...legs(0, 1, 1.0 * k), lift: -0.35 * k, roll: 1.3 * ease(k) }; sawSpin = 0; rate = 8; }
    else if (anim === 'rise') pose = { ...walk, lift: -0.5 * (1 - clamp01(t / 0.9)) };
    else pose = walk;
    this.pose(pose, dt, rate);
    this.spin += dt * gearSpin; this.j.gear.rotation.x = -this.spin;
    this.sawA = (this.sawA || 0) + dt * sawSpin; for (const s of this.saws) s.rotation.x = -this.sawA;
    this.j.gear.scale.setScalar(1 + curl * 0.35);
  }
}

// ------------------------------------------------------------------ the choir mask: three porcelain masks round a heart of song, ribbons below
class ChoirMask extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.45;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('heart', 'base', 0, 0, 0); this.heart = this.part('heart', 0.14, 0.14, 0.14, Cc.song, 0, 0, 0, { glow: 3 });
    this.ring = this.joint('ring', 'base', 0, 0, 0);
    this.mouths = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU; const hold = this.fixed('ring', S(a) * 0.36, (i === 0 ? 0.06 : -0.04), C(a) * 0.36, 0, a, 0);
      const n = 'm' + i; this.joint(n, hold, 0, 0, 0);
      this.part(n, 0.3, 0.38, 0.06, Cc.mask, 0, 0, 0);
      this.part(n, 0.32, 0.05, 0.07, Cc.gold, 0, 0.19, 0); // a gilt brow
      for (const sx of [-1, 1]) { this.part(n, 0.07, 0.04, 0.02, look.eyes, sx * 0.07, 0.07, 0.035); this.part(n, 0.02, 0.07, 0.02, Cc.ribbon, sx * 0.07, 0.0, 0.035); } // eyes and painted tears
      const mouth = this.part(n, 0.1, 0.1, 0.02, Cc.mouth, 0, -0.09, 0.035); this.mouths.push(mouth);
      this.part(n, 0.06, 0.06, 0.02, Cc.song, 0, -0.09, 0.04, { glow: 2.2 });
    }
    this.ribbons = [];
    for (let i = 0; i < 3; i++) { const n = 'r' + i; const a = (i + 0.5) / 3 * TAU; this.joint(n, 'base', S(a) * 0.12, -0.15, C(a) * 0.12); this.part(n, 0.05, 0.6, 0.02, Cc.ribbon, 0, -0.3, 0); this.ribbons.push(n); }
    this.j.heart.add(this.hand); this.j.heart.add(this.tip); this.tip.position.set(0, 0, 0.4);
    this.spinA = 0;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; let pose, rate = 8, spin = 0.8, open = 0.3, glow = 1;
    const sway = () => { const o = {}; this.ribbons.forEach((n, i) => { o[n] = [S(tm * 2 + i) * 0.3, 0, C(tm * 1.7 + i) * 0.3]; }); return o; };
    const float = { lift: S(tm * 1.6) * 0.1, ...sway() };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = float;
    else if (anim === 'sing') { const ph = this.atkPhase(e, t, { windup: 0.6, active: 0.62, dur: 1.7 }); pose = { ...float, lift: 0.1 }; open = ph.part === 'windup' ? 0.4 + ph.k * 0.9 : 1.3; spin = 3; glow = 1.6; }
    else if (anim === 'shriek') { const ph = this.atkPhase(e, t, { windup: 0.8, active: 0.82, dur: 1.4 }); pose = { ...float, lift: ph.part === 'windup' ? -0.15 * ph.k : 0.1 }; open = ph.part === 'windup' ? 0.3 + ph.k : 1.7; spin = ph.part === 'windup' ? 1 + ph.k * 8 : 2; glow = 2; }
    else if (anim === 'hurt') { pose = { ...float, roll: S(t * 30) * 0.3 }; rate = 30; open = 1; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.6, roll: 0.3 }; spin = 0.2; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.8); pose = { lift: -1.3 * ease(k), roll: 1.4 * k, pitch: 0.4 * k }; spin = 0; glow = 1 - k; rate = 6; }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: (1 - ease(k)) * 2 }; rate = 30; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.spinA += dt * spin; this.ring.rotation.y = this.spinA;
    for (const m of this.mouths) m.scale.set(1, Math.max(0.2, open), 1);
    this.heart.scale.setScalar(Math.max(0.05, glow * (1 + S(tm * 6) * 0.15)));
  }
}

// ------------------------------------------------------------------ the Wheel: three rings of eyes round the bell of the Voice, spokes of light
// PROPOSAL: a great bronze bell hangs at the heart (the Voice inside glows through its mouth); round it
// three rings turn on different axes, each set with eyes; six spokes of light run from the bell to the
// inner ring. It opens in its entrance ('unfold': the rings grow out of the bell one after another). Its eyes
// close one by one when the Voice sings back (e.voice: the true form's last phase), and the bell glows gold.
class Wheel extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 2.0;
    this.joint('base', null, 0, this.baseY, 0);
    // everything hangs on a frame turned to the camera (iso, yaw 45°) and tipped back towards it, so the
    // rings always read as rings whichever way the Wheel faces
    this.facer = this.fixed('base', 0, 0, 0); this.facer.rotation.order = 'YXZ';
    // the bell of the Voice
    this.joint('bell', this.facer, 0, 0, 0);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.62, 8), this.part('bell', 0.01, 0.01, 0.01, Cc.gold, 0, 0, 0).material); bell.position.y = 0.0; bell.castShadow = true; this.j.bell.add(bell); this.parts.push(bell);
    this.part('bell', 0.18, 0.12, 0.18, Cc.dark, 0, 0.36, 0);
    this.voice = this.part('bell', 0.5, 0.05, 0.5, Cc.voice, 0, -0.31, 0, { glow: 2.4 });
    this.voiceCore = this.part('bell', 0.16, 0.2, 0.16, Cc.voice, 0, -0.18, 0, { glow: 3.5 });
    // spokes of light
    this.spokes = this.joint('spokes', this.facer, 0, 0, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; this.part('spokes', 0.07, 0.62, 0.07, Cc.spoke, S(a) * 0.68, C(a) * 0.68, 0, { glow: 2.2, rz: -a }); }
    // three rings of eyes
    this.rings = []; this.eyes = [];
    const mk = (name, R, n, tilt, col) => {
      const hold = this.fixed(this.facer, 0, 0, 0, tilt[0], tilt[1], tilt[2]); const g = this.joint(name, hold, 0, 0, 0);
      for (let i = 0; i < n; i++) { const a = i / n * TAU; this.part(name, 0.14, 0.24, 0.12, i % 3 ? col : Cc.dark, S(a) * R, C(a) * R, 0, { rz: -a, emissive: i % 3 ? 0x2a1c08 : 0 }); }
      for (let i = 0; i < Math.round(n / 3); i++) {
        const a = (i + 0.5) / Math.round(n / 3) * TAU; const eg = new THREE.Group(); eg.position.set(S(a) * R, C(a) * R, 0); g.add(eg);
        const w = this.part(eg, 0.2, 0.2, 0.18, Cc.eye, 0, 0, 0); const ir = this.part(eg, 0.1, 0.1, 0.2, Cc.iris, 0, 0, 0.01, { glow: 3 }); this.eyes.push({ eg, w, ir });
      }
      this.rings.push(g); return g;
    };
    // concentric, nearly face-on (the boss turns to face the hero), the outer one tilted a little
    mk('ringA', 1.05, 18, [0, 0, 0], Cc.gold); mk('ringB', 1.45, 24, [0.18, 0, 0], Cc.white); mk('ringC', 1.85, 30, [-0.3, 0.25, 0], Cc.gold);
    this.j.bell.add(this.hand); this.j.bell.add(this.tip); this.tip.position.set(0, -0.3, 0.6);
    this.spinA = 0; this.open = 1;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; let pose, rate = 6, spin = 1, unfold = 1, dil = 1, spokeK = 1;
    const float = { lift: S(tm * 0.9) * 0.12, bell: [S(tm * 1.3) * 0.08, 0, C(tm * 1.1) * 0.08] };
    if (anim === 'unfold') {
      pose = { ...float, lift: -0.6 * (1 - clamp01(t / 3)) }; unfold = clamp01(t / 3.4); spin = 0.3 + unfold * 2; spokeK = clamp01((t - 2.6) / 0.8); dil = t > 3.6 ? 1.5 : 0.2;
    } else if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = float;
    else if (anim === 'gaze' || anim === 'cast' || anim === 'aim') { const ph = this.atkPhase(e, t, { windup: 0.5, active: 0.52, dur: 1.5 }); pose = { ...float, lift: 0.1 }; spin = ph.part === 'windup' ? 1 + ph.k * 4 : 5; dil = ph.part === 'windup' ? 1 - ph.k * 0.5 : 0.5; }
    else if (anim === 'pulse') { const ph = this.atkPhase(e, t, { windup: 0.6, active: 0.62, dur: 1.5 }); pose = { ...float, lift: ph.part === 'windup' ? -0.2 * ph.k : 0.15 }; spin = ph.part === 'windup' ? 1 + ph.k * 6 : 3; spokeK = ph.part === 'windup' ? 1 + ph.k : 2; }
    else if (anim === 'slam') { const ph = this.atkPhase(e, t, { windup: 0.75, active: 0.8, dur: 1.5 }); pose = { ...float, lift: ph.part === 'windup' ? 0.5 * ph.k : -1.0 }; rate = ph.part === 'windup' ? 6 : 30; spin = 2; }
    else if (anim === 'roar') { pose = { ...float, lift: 0.2 }; spin = 6; dil = 1.6; }
    else if (anim === 'hurt') { pose = { ...float, roll: S(t * 30) * 0.06 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.8, roll: 0.25, pitch: 0.2 }; spin = 0.2; dil = 1.8; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 2.5); pose = { lift: -1.6 * ease(k), roll: 0.6 * k }; spin = 0.4 * (1 - k); dil = 0; unfold = 1 - 0.3 * k; rate = 3; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.facer.rotation.set(-0.42, Math.PI / 4 - (e.face || 0), 0);
    this.spinA += dt * spin;
    this.rings[0].rotation.z = this.spinA * 0.8; this.rings[1].rotation.z = -this.spinA * 0.55; this.rings[2].rotation.z = this.spinA * 0.4;
    this.rings.forEach((g, i) => g.scale.setScalar(Math.max(0.01, ease(clamp01(unfold * 3 - i)))));
    this.spokes.scale.setScalar(Math.max(0.01, Math.min(1.6, spokeK))); this.spokes.rotation.z = -this.spinA * 0.3;
    // the eyes look about; with the Voice singing back they close one by one (the bell glows gold)
    const voice = !!e.voice; const closed = voice ? clamp01((1 - e.hp / e.maxHp / 0.12)) : 0;
    this.eyes.forEach((ey, i) => { const shut = voice && i / this.eyes.length < closed; const k = shut ? 0.08 : dil; ey.eg.scale.set(1, Math.max(0.08, Math.min(1.3, 0.6 + 0.4 * k)) * (shut ? 0.15 : 1), 1); ey.ir.position.x = S(tm * 1.3 + i) * 0.03; });
    const vk = voice ? 1.8 + S(tm * 5) * 0.4 : 1; this.voice.scale.set(vk, 1, vk); this.voiceCore.scale.setScalar(voice ? 1.6 + S(tm * 7) * 0.3 : 1);
  }
}

// look.rig names one of these; null: not a beast of this file
export function makeBeast3(look) {
  switch (look.rig) {
    case 'leech': return new Leech(look);
    case 'wisp': return new Wisp(look);
    case 'gearspider': return new GearSpider(look);
    case 'choirmask': return new ChoirMask(look);
    case 'wheel': return new Wheel(look);
  }
  return null;
}
